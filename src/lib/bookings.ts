import { withTransaction } from './db';
import { pool } from './db';
import {
  SLOT_TYPES,
  type SlotType,
  CANCELLATION_FULL_REFUND_WINDOW_MS,
  CANCELLATION_PARTIAL_REFUND_PERCENT,
} from './sessionRules';

export type Booking = {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  included_minutes: number;
  status: string;
  created_at: string;
};

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

export async function createBooking(userId: string, slotType: SlotType): Promise<Booking> {
  const config = SLOT_TYPES[slotType];

  return withTransaction(async (client) => {
    // Per-user advisory lock avoids two concurrent bookings both reading a stale
    // balance and overdrawing the wallet (an aggregate SUM query can't take FOR UPDATE).
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);

    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
      [userId]
    );
    const balance = Number(balanceResult.rows[0].balance);
    if (balance < config.cost) {
      throw new InsufficientCreditsError();
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + config.includedMinutes * 60000);

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, starts_at, ends_at, included_minutes, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
      [userId, startsAt, endsAt, config.includedMinutes]
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

export async function listUpcomingBookings(userId: string): Promise<Booking[]> {
  const result = await pool.query(
    `SELECT * FROM bookings WHERE user_id = $1 AND status IN ('scheduled', 'active') ORDER BY starts_at ASC`,
    [userId]
  );
  return result.rows;
}

export type CancelResult = {
  refundPercent: number;
  refundAmount: number;
};

export async function cancelBooking(userId: string, bookingId: string): Promise<CancelResult> {
  return withTransaction(async (client) => {
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) throw new BookingNotFoundError();
    if (booking.user_id !== userId) throw new ForbiddenError();

    if (booking.status === 'active') {
      throw new BookingNotCancellableError('This session is already in progress -- leave it instead of cancelling.');
    }
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BookingNotCancellableError('This booking is already finished and cannot be cancelled.');
    }

    const now = new Date();
    const startsAt = new Date(booking.starts_at);
    const endsAt = new Date(booking.ends_at);

    let refundPercent: number;
    if (now >= endsAt) {
      refundPercent = 0; // Never joined by the end of the slot window: no-show.
    } else if (startsAt.getTime() - now.getTime() > CANCELLATION_FULL_REFUND_WINDOW_MS) {
      refundPercent = 100;
    } else {
      refundPercent = CANCELLATION_PARTIAL_REFUND_PERCENT;
    }

    const chargeResult = await client.query(
      `SELECT COALESCE(SUM(-amount), 0) AS paid FROM ledger_entries WHERE reference_id = $1 AND entry_type = 'slot_booking'`,
      [bookingId]
    );
    const amountPaid = Number(chargeResult.rows[0].paid);
    const refundAmount = Math.round((amountPaid * refundPercent) / 100);

    if (refundAmount > 0) {
      await client.query(
        `INSERT INTO ledger_entries (user_id, amount, entry_type, reference_id, description)
         VALUES ($1, $2, 'refund', $3, $4)`,
        [userId, refundAmount, bookingId, `Cancellation refund (${refundPercent}%)`]
      );
    }

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [bookingId]);

    return { refundPercent, refundAmount };
  });
}
