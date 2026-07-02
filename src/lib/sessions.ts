import type { PoolClient } from 'pg';
import { withTransaction } from './db';
import { GRACE_PERIOD_MS, LOW_BALANCE_WARNING_CREDITS, OVERAGE_RATE_PER_MINUTE, type SessionState } from './sessionRules';
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

export async function joinSession(userId: string, bookingId: string): Promise<{ sessionId: string }> {
  return withTransaction(async (client) => {
    const bookingResult = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const booking = bookingResult.rows[0];
    if (!booking) throw new BookingNotFoundError();
    if (booking.user_id !== userId) throw new ForbiddenError();
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BookingNotJoinableError();
    }

    const existingResult = await client.query(
      `SELECT * FROM chat_sessions WHERE booking_id = $1 AND status != 'ended' ORDER BY created_at DESC LIMIT 1`,
      [bookingId]
    );
    let session = existingResult.rows[0];

    if (!session) {
      const insertResult = await client.query(
        `INSERT INTO chat_sessions (booking_id, user_id, started_at, status)
         VALUES ($1, $2, NOW(), 'active')
         RETURNING *`,
        [bookingId, userId]
      );
      session = insertResult.rows[0];
      await client.query(`UPDATE bookings SET status = 'active' WHERE id = $1`, [bookingId]);
    }

    return { sessionId: session.id };
  });
}

async function getBalance(client: PoolClient, userId: string): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
    [userId]
  );
  return Number(result.rows[0].balance);
}

export async function tickSession(userId: string, sessionId: string): Promise<SessionState> {
  return withTransaction(async (client) => {
    const sessionResult = await client.query(`SELECT * FROM chat_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new SessionNotFoundError();
    if (session.user_id !== userId) throw new ForbiddenError();

    const bookingResult = await client.query(`SELECT included_minutes FROM bookings WHERE id = $1`, [
      session.booking_id,
    ]);
    const includedMinutes = bookingResult.rows[0].included_minutes as number;

    const now = new Date();
    const startedAt = new Date(session.started_at);
    const elapsedMs = now.getTime() - startedAt.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (session.status === 'ended') {
      const balance = await getBalance(client, userId);
      return buildState(session, includedMinutes, elapsedMinutes, balance, null);
    }

    const overageMs = elapsedMs - includedMinutes * 60000;
    const overageMinutesStarted = overageMs > 0 ? Math.ceil(overageMs / 60000) : 0;

    let status: 'active' | 'grace' | 'ended' = session.status;
    let graceStartedAt: Date | null = session.grace_started_at ? new Date(session.grace_started_at) : null;

    if (status === 'grace') {
      const balance = await getBalance(client, userId);
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
          [userId, -creditsToCharge, session.id, `Overage: ${minutesToCharge} minute(s) over included time`]
        );

        const balanceAfterCharge = await getBalance(client, userId);
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

    const balance = await getBalance(client, userId);
    return buildState({ ...session, status }, includedMinutes, elapsedMinutes, balance, graceStartedAt, now, overageMinutesStarted);
  });
}

export async function endSession(userId: string, sessionId: string): Promise<void> {
  await withTransaction(async (client) => {
    const sessionResult = await client.query(`SELECT * FROM chat_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new SessionNotFoundError();
    if (session.user_id !== userId) throw new ForbiddenError();
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
