import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { sendPasswordResetEmail } from '@/lib/email';

const GENERIC_RESPONSE = { message: "If an account exists for that email, we've sent a reset link." };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  // Never let a lookup/send failure change the response -- a differing status
  // or body here would itself be a user-enumeration oracle.
  try {
    const result = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.NEXTAUTH_URL}/user/reset-password?token=${token}`;
      sendPasswordResetEmail({ toEmail: email, resetUrl }).catch((err) =>
        console.error('Password reset email failed:', err)
      );
    }
  } catch (err) {
    console.error('Forgot-password request failed:', err);
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
