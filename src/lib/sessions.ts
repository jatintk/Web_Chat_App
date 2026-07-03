import type { PoolClient } from 'pg';
import { withTransaction, pool } from './db';
import { GRACE_PERIOD_MS, LOW_BALANCE_WARNING_CREDITS, OVERAGE_RATE_PER_MINUTE, JOIN_WINDOW_BEFORE_MS, type SessionState } from './sessionRules';
import { BookingNotFoundError, ForbiddenError } from './bookings';

export { BookingNotFoundError, ForbiddenError };

export class SessionNotFoundError extends Error {
  constructor() {
    super('Session not found.');
    this.name = 'SessionNotFoundError';
  }
}

export class BookingNotJoinableError extends Error {
  constructor() {
    super('This booking can no longer be joined.');
    this.name = 'BookingNotJoinableError';
  }
}

export class SessionNotStartedError extends Error {
  constructor() {
    super("The client hasn't started this session yet.");
    this.name = 'SessionNotStartedError';
  }
}

export class TooEarlyToJoinError extends Error {
  constructor() {
    super("This session isn't ready to join yet -- you can join starting 10 minutes before the scheduled time.");
    this.name = 'TooEarlyToJoinError';
  }
}

export async function joinSession(callerId: string, bookingId: string): Promise<{ sessionId: string }> {
  return withTransaction(async (client) => {
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) throw new BookingNotFoundError();

    const isClient = booking.user_id === callerId;
    const isAssignedExpert = booking.expert_id === callerId;
    if (!isClient && !isAssignedExpert) throw new ForbiddenError();

    const existingResult = await client.query(
      `SELECT * FROM chat_sessions WHERE booking_id = $1 AND status != 'ended' ORDER BY created_at DESC LIMIT 1`,
      [bookingId]
    );
    let session = existingResult.rows[0];

    if (isAssignedExpert) {
      // The expert can only view a session the client has already started --
      // never create one (that would make the expert the billed party).
      if (!session) throw new SessionNotStartedError();
      return { sessionId: session.id };
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BookingNotJoinableError();
    }

    if (!session) {
      if (new Date(booking.starts_at).getTime() - Date.now() > JOIN_WINDOW_BEFORE_MS) {
        throw new TooEarlyToJoinError();
      }

      const insertResult = await client.query(
        `INSERT INTO chat_sessions (booking_id, user_id, started_at, status)
         VALUES ($1, $2, NOW(), 'active')
         RETURNING *`,
        [bookingId, callerId]
      );
      session = insertResult.rows[0];
      await client.query(`UPDATE bookings SET status = 'active' WHERE id = $1`, [bookingId]);
    }

    return { sessionId: session.id };
  });
}

export type SessionAccess = { session: { id: string; user_id: string }; booking: { expert_id: string | null } };

// Read-only authorization check shared by chat (messages.ts) and the Pusher
// channel-auth endpoint -- same client-or-assigned-expert rule as tickSession,
// but without the row lock since nothing here is mutated.
export async function assertSessionAccess(callerId: string, sessionId: string): Promise<SessionAccess> {
  const sessionResult = await pool.query(`SELECT id, user_id, booking_id FROM chat_sessions WHERE id = $1`, [sessionId]);
  const session = sessionResult.rows[0];
  if (!session) throw new SessionNotFoundError();

  const bookingResult = await pool.query(`SELECT expert_id FROM bookings WHERE id = $1`, [session.booking_id]);
  const booking = bookingResult.rows[0];

  if (callerId !== session.user_id && callerId !== booking?.expert_id) throw new ForbiddenError();

  return { session, booking };
}

export type PastSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes_used: number;
  slot_type: string | null;
  expert_id: string | null;
  expert_name: string | null;
};

export type PastSessionForExpert = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes_used: number;
  slot_type: string | null;
  client_name: string | null;
  client_email: string;
};

// Client's own history -- mirrors listUpcomingBookings' "own only" scope.
export async function listPastSessionsForClient(userId: string): Promise<PastSession[]> {
  const result = await pool.query(
    `SELECT cs.id, cs.started_at, cs.ended_at, cs.total_minutes_used, b.slot_type, b.expert_id, e.name AS expert_name
     FROM chat_sessions cs
     JOIN bookings b ON b.id = cs.booking_id
     LEFT JOIN users e ON e.id = b.expert_id
     WHERE cs.user_id = $1 AND cs.status = 'ended'
     ORDER BY cs.started_at DESC`,
    [userId]
  );
  return result.rows;
}

// Expert sees ALL their past sessions across every client -- mirrors the
// listAssignedBookings (own upcoming) vs. listAllAssignedBookings (all
// statuses) asymmetry already established for bookings.
export async function listPastSessionsForExpert(expertId: string): Promise<PastSessionForExpert[]> {
  const result = await pool.query(
    `SELECT cs.id, cs.started_at, cs.ended_at, cs.total_minutes_used, b.slot_type, c.name AS client_name, c.email AS client_email
     FROM chat_sessions cs
     JOIN bookings b ON b.id = cs.booking_id
     JOIN users c ON c.id = cs.user_id
     WHERE b.expert_id = $1 AND cs.status = 'ended'
     ORDER BY cs.started_at DESC`,
    [expertId]
  );
  return result.rows;
}

async function getBalance(client: PoolClient, userId: string): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
    [userId]
  );
  return Number(result.rows[0].balance);
}

export async function tickSession(callerId: string, sessionId: string): Promise<SessionState> {
  return withTransaction(async (client) => {
    const sessionResult = await client.query(`SELECT * FROM chat_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new SessionNotFoundError();

    const bookingResult = await client.query(`SELECT included_minutes, expert_id FROM bookings WHERE id = $1`, [
      session.booking_id,
    ]);
    const booking = bookingResult.rows[0];
    const includedMinutes = booking.included_minutes as number;

    // The session's own user_id is always the paying client -- billing must
    // never be applied against whoever happens to be viewing (e.g. the expert).
    const payerId: string = session.user_id;
    if (callerId !== payerId && callerId !== booking.expert_id) throw new ForbiddenError();

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const elapsedMs = now.getTime() - startedAt.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (session.status === 'ended') {
      const balance = await getBalance(client, payerId);
      return buildState(session, includedMinutes, elapsedMinutes, balance, null);
    }

    const overageMs = elapsedMs - includedMinutes * 60000;
    const overageMinutesStarted = overageMs > 0 ? Math.ceil(overageMs / 60000) : 0;

    let status: 'active' | 'grace' | 'ended' = session.status;
    let graceStartedAt: Date | null = session.grace_started_at ? new Date(session.grace_started_at) : null;

    if (status === 'grace') {
      const balance = await getBalance(client, payerId);
      if (balance > 0) {
        status = 'active';
        graceStartedAt = null;
      } else if (graceStartedAt && now.getTime() - graceStartedAt.getTime() >= GRACE_PERIOD_MS) {
        status = 'ended';
      }
    }

    if (status === 'active') {
      const billedResult = await client.query(
        `SELECT COALESCE(SUM(-amount), 0) AS credits
         FROM ledger_entries WHERE reference_id = $1 AND entry_type = 'overage_charge'`,
        [session.id]
      );
      const minutesAlreadyBilled = Number(billedResult.rows[0].credits) / OVERAGE_RATE_PER_MINUTE;

      if (overageMinutesStarted > minutesAlreadyBilled) {
        const minutesToCharge = overageMinutesStarted - minutesAlreadyBilled;
        const creditsToCharge = minutesToCharge * OVERAGE_RATE_PER_MINUTE;

        await client.query(
          `INSERT INTO ledger_entries (user_id, amount, entry_type, reference_id, description)
           VALUES ($1, $2, 'overage_charge', $3, $4)`,
          [payerId, -creditsToCharge, session.id, `Overage: ${minutesToCharge} minute(s) over included time`]
        );

        const balanceAfterCharge = await getBalance(client, payerId);
        if (balanceAfterCharge <= 0) {
          status = 'grace';
          graceStartedAt = now;
        }
      }
    }

    if (status === 'ended' && session.status !== 'ended') {
      await client.query(
        `UPDATE chat_sessions SET status = 'ended', ended_at = $2, total_minutes_used = $3, grace_started_at = $4 WHERE id = $1`,
        [session.id, now, elapsedMinutes, graceStartedAt]
      );
      await client.query(`UPDATE bookings SET status = 'completed' WHERE id = $1`, [session.booking_id]);
    } else {
      await client.query(
        `UPDATE chat_sessions SET status = $2, total_minutes_used = $3, grace_started_at = $4 WHERE id = $1`,
        [session.id, status, elapsedMinutes, graceStartedAt]
      );
    }

    const balance = await getBalance(client, payerId);
    return buildState({ ...session, status }, includedMinutes, elapsedMinutes, balance, graceStartedAt, now, overageMinutesStarted);
  });
}

export async function endSession(callerId: string, sessionId: string): Promise<void> {
  await withTransaction(async (client) => {
    const sessionResult = await client.query(`SELECT * FROM chat_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new SessionNotFoundError();

    const bookingResult = await client.query(`SELECT expert_id FROM bookings WHERE id = $1`, [session.booking_id]);
    const booking = bookingResult.rows[0];
    if (callerId !== session.user_id && callerId !== booking?.expert_id) throw new ForbiddenError();

    if (session.status === 'ended') return;

    await client.query(`UPDATE chat_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1`, [sessionId]);
    await client.query(`UPDATE bookings SET status = 'completed' WHERE id = $1`, [session.booking_id]);
  });
}

function buildState(
  session: { id: string; status: string },
  includedMinutes: number,
  elapsedMinutes: number,
  balance: number,
  graceStartedAt: Date | null,
  now: Date = new Date(),
  overageMinutes = 0
): SessionState {
  const status = session.status as 'active' | 'grace' | 'ended';
  return {
    sessionId: session.id,
    status,
    balance,
    includedMinutes,
    elapsedMinutes,
    overageMinutes,
    isLowBalance: status === 'active' && balance > 0 && balance <= LOW_BALANCE_WARNING_CREDITS,
    graceSecondsRemaining:
      status === 'grace' && graceStartedAt
        ? Math.max(0, Math.ceil((GRACE_PERIOD_MS - (now.getTime() - graceStartedAt.getTime())) / 1000))
        : null,
  };
}
