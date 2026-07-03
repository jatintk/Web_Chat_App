import bcrypt from 'bcryptjs';
import { pool } from './db';

export type UserRole = 'user' | 'expert';

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type UserProfile = {
  id: string;
  name: string | null;
  dateOfBirth: string | null;
  timeOfBirth: string | null;
  placeOfBirth: string | null;
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
       RETURNING id, email, name, role`,
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
    `SELECT id, email, name, password_hash, role FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row || !row.password_hash) return null; // no password_hash => Google-only account, credentials login not possible

  const passwordMatches = await bcrypt.compare(params.password, row.password_hash);
  if (!passwordMatches) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
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
     RETURNING id, email, name, role`,
    [email, params.name ?? null]
  );
  return result.rows[0];
}

function rowToProfile(row: {
  id: string;
  name: string | null;
  date_of_birth: string | Date | null;
  time_of_birth: string | null;
  place_of_birth: string | null;
}): UserProfile {
  // node-postgres parses a DATE column into a JS Date at LOCAL midnight (not
  // a string) by default -- normalize to YYYY-MM-DD using local getters, not
  // toISOString() (which converts to UTC and shifts the calendar date back
  // by a day in any timezone ahead of UTC).
  const dateOfBirth =
    row.date_of_birth instanceof Date
      ? `${row.date_of_birth.getFullYear()}-${String(row.date_of_birth.getMonth() + 1).padStart(2, '0')}-${String(row.date_of_birth.getDate()).padStart(2, '0')}`
      : row.date_of_birth;

  return {
    id: row.id,
    name: row.name,
    dateOfBirth,
    timeOfBirth: row.time_of_birth,
    placeOfBirth: row.place_of_birth,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await pool.query(
    `SELECT id, name, date_of_birth, time_of_birth, place_of_birth FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ? rowToProfile(result.rows[0]) : null;
}

// Takes the full profile shape rather than partial fields -- the profile form
// is always a controlled form re-submitting its complete current state, so
// there's no ambiguity between "field omitted" and "field cleared" to resolve.
export async function updateUserProfile(
  userId: string,
  params: { name: string | null; dateOfBirth: string | null; timeOfBirth: string | null; placeOfBirth: string | null }
): Promise<UserProfile | null> {
  const result = await pool.query(
    `UPDATE users
     SET name = $2, date_of_birth = $3, time_of_birth = $4, place_of_birth = $5
     WHERE id = $1
     RETURNING id, name, date_of_birth, time_of_birth, place_of_birth`,
    [userId, params.name, params.dateOfBirth, params.timeOfBirth, params.placeOfBirth]
  );
  return result.rows[0] ? rowToProfile(result.rows[0]) : null;
}

// Used by the booking-notification email -- keeps raw SQL out of the API route.
export async function getUserContact(userId: string): Promise<{ email: string; name: string | null } | null> {
  const result = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
  return result.rows[0] ?? null;
}
