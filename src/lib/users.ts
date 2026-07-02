import bcrypt from 'bcryptjs';
import { pool } from './db';

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
};

export class EmailInUseError extends Error {
  constructor() {
    super('Email is already registered');
    this.name = 'EmailInUseError';
  }
}

export async function createUser(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<PublicUser> {
  const email = params.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(params.password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email, params.name ?? null, passwordHash]
    );
    return result.rows[0];
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23505') {
      throw new EmailInUseError();
    }
    throw err;
  }
}

export async function verifyUser(params: {
  email: string;
  password: string;
}): Promise<PublicUser | null> {
  const email = params.email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row || !row.password_hash) return null; // no password_hash => Google-only account, credentials login not possible

  const passwordMatches = await bcrypt.compare(params.password, row.password_hash);
  if (!passwordMatches) return null;

  return { id: row.id, email: row.email, name: row.name };
}

export async function findOrCreateOAuthUser(params: {
  email: string;
  name?: string | null;
}): Promise<PublicUser> {
  const email = params.email.trim().toLowerCase();

  // Atomic upsert: links a Google sign-in to an existing account with the same
  // email (e.g. one originally created via the password form), or creates a new
  // one with no password_hash. ON CONFLICT keeps this race-safe for concurrent
  // first-time sign-ins.
  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, NULL)
     ON CONFLICT (email) DO UPDATE SET name = COALESCE(users.name, EXCLUDED.name)
     RETURNING id, email, name`,
    [email, params.name ?? null]
  );
  return result.rows[0];
}
