import { pool } from './db';

export async function getBalance(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
    [userId]
  );
  return Number(result.rows[0].balance);
}
