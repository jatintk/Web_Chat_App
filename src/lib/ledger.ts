import { pool } from './db';

export async function getBalance(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM ledger_entries WHERE user_id = $1`,
    [userId]
  );
  return Number(result.rows[0].balance);
}

export type LedgerEntry = {
  id: string;
  amount: number;
  entry_type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

export async function listLedgerEntries(userId: string): Promise<LedgerEntry[]> {
  const result = await pool.query(
    `SELECT id, amount, entry_type, reference_id, description, created_at
     FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}
