import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { withTransaction } from './db';

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super('This reset link is invalid or has expired.');
    this.name = 'InvalidOrExpiredTokenError';
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Returns the plaintext token -- only ever held here and in the email link;
// the DB only ever stores its SHA-256 hash. A 256-bit random token has no
// low-entropy-secret brute-force concern the way a password does, so a fast
// hash is correct here (unlike bcrypt for passwords).
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  await withTransaction(async (client) => {
    // Keeps "at most one live token per user" true even without the DB-level
    // partial unique index doing the enforcing under normal (non-racing) use.
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`, [userId]);
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, tokenHash]
    );
  });

  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);

  await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) throw new InvalidOrExpiredTokenError();

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, row.user_id]);
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);
  });
}
