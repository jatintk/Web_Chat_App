import { pool, withTransaction } from './db';
import { SLOT_TYPES, type SlotType } from './sessionRules';
import { ForbiddenError, SlotNotFoundError, SlotNotAvailableError, SlotOverlapError } from './bookings';

// bookings.ts is the single source for these shared domain errors (same
// pattern sessions.ts already uses for BookingNotFoundError/ForbiddenError) --
// re-exported here so callers of this module don't need to reach into
// bookings.ts directly.
export { ForbiddenError, SlotNotFoundError, SlotNotAvailableError, SlotOverlapError };

export type AvailabilitySlot = {
  id: string;
  expert_id: string;
  slot_type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function createAvailabilitySlot(
  expertId: string,
  params: { slotType: SlotType; startsAt: Date }
): Promise<AvailabilitySlot> {
  const config = SLOT_TYPES[params.slotType];
  const startsAt = params.startsAt;
  if (startsAt.getTime() <= Date.now()) {
    throw new SlotNotAvailableError();
  }
  const endsAt = new Date(startsAt.getTime() + config.includedMinutes * 60000);

  return withTransaction(async (client) => {
    const overlapResult = await client.query(
      `SELECT id FROM availability_slots
       WHERE expert_id = $1 AND status != 'cancelled'
         AND starts_at < $3 AND ends_at > $2`,
      [expertId, startsAt, endsAt]
    );
    if (overlapResult.rows.length > 0) {
      throw new SlotOverlapError();
    }

    const result = await client.query(
      `INSERT INTO availability_slots (expert_id, slot_type, starts_at, ends_at, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING *`,
      [expertId, params.slotType, startsAt, endsAt]
    );
    return result.rows[0];
  });
}

export async function listOpenSlots(): Promise<AvailabilitySlot[]> {
  const result = await pool.query(
    `SELECT * FROM availability_slots WHERE status = 'open' AND starts_at > NOW() ORDER BY starts_at ASC`
  );
  return result.rows;
}

export async function listAllSlotsForExpert(expertId: string): Promise<AvailabilitySlot[]> {
  const result = await pool.query(
    `SELECT * FROM availability_slots WHERE expert_id = $1 ORDER BY starts_at DESC`,
    [expertId]
  );
  return result.rows;
}

export async function cancelAvailabilitySlot(expertId: string, slotId: string): Promise<void> {
  await withTransaction(async (client) => {
    const result = await client.query(`SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`, [slotId]);
    const slot = result.rows[0];
    if (!slot) throw new SlotNotFoundError();
    if (slot.expert_id !== expertId) throw new ForbiddenError();
    if (slot.status !== 'open') throw new SlotNotAvailableError();

    await client.query(`UPDATE availability_slots SET status = 'cancelled' WHERE id = $1`, [slotId]);
  });
}
