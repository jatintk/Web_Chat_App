import { withTransaction } from './db';
import { pool } from './db';
import {
  SLOT_TYPES,
  type SlotType,
  CANCELLATION_FULL_REFUND_WINDOW_MS,
  CANCELLATION_PARTIAL_REFUND_PERCENT,
  RESCHEDULE_MIN_LEAD_TIME_MS,
} from './sessionRules';

export type Booking = {
  id: string;
  user_id: string;
  expert_id: string | null;
  availability_slot_id: string | null;
  slot_type: string | null;
  starts_at: string;
  ends_at: string;
  included_minutes: number;
  status: string;
  note: string | null;
  created_at: string;
};

export type BookingWithExpertName = Booking & { expert_name: string | null };

export type AssignedBooking = Booking & { client_name: string | null; client_email: string };

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Not enough credits to book this slot.');
    this.name = 'InsufficientCreditsError';
  }
}

export class BookingNotFoundError extends Error {
  constructor() {
    super('Booking not found.');
    this.name = 'BookingNotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('You do not have access to this resource.');
    this.name = 'ForbiddenError';
  }
}

export class BookingNotCancellableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingNotCancellableError';
  }
}

export class RescheduleWindowExpiredError extends Error {
  constructor() {
    super('Bookings can only be rescheduled by the client more than 3 days in advance -- contact your expert to reschedule sooner.');
    this.name = 'RescheduleWindowExpiredError';
  }
}

// Shared with src/lib/availability.ts (single source for these domain
// errors, same pattern already used for BookingNotFoundError/ForbiddenError
// with sessions.ts) -- avoids a circular import between the two modules.
export class SlotNotFoundError extends Error {
  constructor() {
    super('Slot not found.');
    this.name = 'SlotNotFoundError';
  }
}

export class SlotNotAvailableError extends Error {
  constructor() {
    super('This slot is no longer available.');
    this.name = 'SlotNotAvailableError';
  }
}

export class SlotOverlapError extends Error {
  constructor() {
    super('This overlaps with an existing slot on your calendar.');
    this.name = 'SlotOverlapError';
  }
}

export async function createBooking(
  userId: string,
  availabilitySlotId: string,
  note?: string | null
): Promise<Booking> {
  return withTransaction(async (client) => {
    // Per-user advisory lock avoids two concurrent bookings both reading a stale
    // balance and overdrawing the wallet (an aggregate SUM query can't take FOR UPDATE).
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);

    const slotResult = await client.query(`SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`, [
      availabilitySlotId,
    ]);
    const slot = slotResult.rows[0];
    if (!slot) throw new SlotNotFoundError();
    if (slot.status !== 'open' || new Date(slot.starts_at).getTime() <= Date.now()) {
      throw new SlotNotAvailableError();
    }

    const slotType = slot.slot_type as SlotType;
    const config = SLOT_TYPES[slotType];

    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
      [userId]
    );
    const balance = Number(balanceResult.rows[0].balance);
    if (balance < config.cost) {
      throw new InsufficientCreditsError();
    }

    await client.query(`UPDATE availability_slots SET status = 'booked' WHERE id = $1`, [availabilitySlotId]);

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, expert_id, availability_slot_id, slot_type, starts_at, ends_at, included_minutes, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
       RETURNING *`,
      [userId, slot.expert_id, slot.id, slotType, slot.starts_at, slot.ends_at, config.includedMinutes, note?.trim() || null]
    );
    const booking = bookingResult.rows[0];

    await client.query(
      `INSERT INTO ledger_entries (user_id, amount, entry_type, reference_id, description)
       VALUES ($1, $2, 'slot_booking', $3, $4)`,
      [userId, -config.cost, booking.id, `${slotType} slot booking`]
    );

    return booking;
  });
}

export async function listUpcomingBookings(userId: string): Promise<BookingWithExpertName[]> {
  const result = await pool.query(
    `SELECT b.*, e.name AS expert_name
     FROM bookings b
     LEFT JOIN users e ON e.id = b.expert_id
     WHERE b.user_id = $1 AND b.status IN ('scheduled', 'active')
     ORDER BY b.starts_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function listAssignedBookings(expertId: string): Promise<AssignedBooking[]> {
  const result = await pool.query(
    `SELECT b.*, c.name AS client_name, c.email AS client_email
     FROM bookings b
     JOIN users c ON c.id = b.user_id
     WHERE b.expert_id = $1 AND b.status IN ('scheduled', 'active')
     ORDER BY b.starts_at ASC`,
    [expertId]
  );
  return result.rows;
}

export async function listAllAssignedBookings(expertId: string): Promise<AssignedBooking[]> {
  const result = await pool.query(
    `SELECT b.*, c.name AS client_name, c.email AS client_email
     FROM bookings b
     JOIN users c ON c.id = b.user_id
     WHERE b.expert_id = $1
     ORDER BY b.starts_at DESC`,
    [expertId]
  );
  return result.rows;
}

export type CancelResult = {
  refundPercent: number;
  refundAmount: number;
};

// Releases the availability_slots row tied to a booking back to 'open' if its
// window hasn't already passed (a no-op if it has -- nothing can book a past
// slot anyway). Shared by cancelBooking and rescheduleBooking (for the old slot).
async function releaseSlotIfFuture(client: { query: typeof pool.query }, availabilitySlotId: string | null) {
  if (!availabilitySlotId) return;
  await client.query(
    `UPDATE availability_slots SET status = 'open' WHERE id = $1 AND status != 'cancelled' AND starts_at > NOW()`,
    [availabilitySlotId]
  );
}

export async function cancelBooking(callerId: string, bookingId: string): Promise<CancelResult> {
  return withTransaction(async (client) => {
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) throw new BookingNotFoundError();

    const isOwner = booking.user_id === callerId;
    const isAssignedExpert = booking.expert_id === callerId;
    if (!isOwner && !isAssignedExpert) throw new ForbiddenError();

    if (booking.status === 'active') {
      throw new BookingNotCancellableError('This session is already in progress -- leave it instead of cancelling.');
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BookingNotCancellableError('This booking is already finished and cannot be cancelled.');
    }

    let refundPercent: number;
    if (isAssignedExpert) {
      // Business-initiated cancellation is always a full refund, regardless
      // of timing -- not the client's fault, unlike a client changing their mind.
      refundPercent = 100;
    } else {
      const now = new Date();
      const startsAt = new Date(booking.starts_at);
      const endsAt = new Date(booking.ends_at);

      if (now >= endsAt) {
        refundPercent = 0; // Never joined by the end of the slot window: no-show.
      } else if (startsAt.getTime() - now.getTime() > CANCELLATION_FULL_REFUND_WINDOW_MS) {
        refundPercent = 100;
      } else {
        refundPercent = CANCELLATION_PARTIAL_REFUND_PERCENT;
      }
    }

    const chargeResult = await client.query(
      `SELECT COALESCE(SUM(-amount), 0) AS paid FROM ledger_entries WHERE reference_id = $1 AND entry_type = 'slot_booking'`,
      [bookingId]
    );
    const amountPaid = Number(chargeResult.rows[0].paid);
    const refundAmount = Math.round((amountPaid * refundPercent) / 100);

    if (refundAmount > 0) {
      // Refund always credits the client's wallet (booking.user_id), never
      // whichever of the two parties actually called this -- critical once
      // the expert can also initiate a cancellation.
      await client.query(
        `INSERT INTO ledger_entries (user_id, amount, entry_type, reference_id, description)
         VALUES ($1, $2, 'refund', $3, $4)`,
        [booking.user_id, refundAmount, bookingId, `Cancellation refund (${refundPercent}%)`]
      );
    }

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [bookingId]);
    await releaseSlotIfFuture(client, booking.availability_slot_id);

    return { refundPercent, refundAmount };
  });
}

export async function rescheduleBooking(
  callerId: string,
  bookingId: string,
  newAvailabilitySlotId: string
): Promise<Booking> {
  return withTransaction(async (client) => {
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) throw new BookingNotFoundError();

    const isOwner = booking.user_id === callerId;
    const isAssignedExpert = booking.expert_id === callerId;
    if (!isOwner && !isAssignedExpert) throw new ForbiddenError();

    if (booking.status !== 'scheduled') {
      throw new BookingNotCancellableError('Only a scheduled (not yet started) booking can be rescheduled.');
    }

    // Lead-time restriction applies to client-initiated reschedules only --
    // the expert can reschedule at any time, however soon the session is.
    if (!isAssignedExpert) {
      const leadTimeMs = new Date(booking.starts_at).getTime() - Date.now();
      if (leadTimeMs <= RESCHEDULE_MIN_LEAD_TIME_MS) {
        throw new RescheduleWindowExpiredError();
      }
    }

    const newSlotResult = await client.query(`SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`, [
      newAvailabilitySlotId,
    ]);
    const newSlot = newSlotResult.rows[0];
    if (!newSlot) throw new SlotNotFoundError();
    if (
      newSlot.status !== 'open' ||
      new Date(newSlot.starts_at).getTime() <= Date.now() ||
      newSlot.slot_type !== booking.slot_type ||
      newSlot.expert_id !== booking.expert_id
    ) {
      throw new SlotNotAvailableError();
    }

    await releaseSlotIfFuture(client, booking.availability_slot_id);
    await client.query(`UPDATE availability_slots SET status = 'booked' WHERE id = $1`, [newSlot.id]);

    const updatedResult = await client.query(
      `UPDATE bookings SET availability_slot_id = $2, starts_at = $3, ends_at = $4 WHERE id = $1 RETURNING *`,
      [bookingId, newSlot.id, newSlot.starts_at, newSlot.ends_at]
    );

    return updatedResult.rows[0];
  });
}
