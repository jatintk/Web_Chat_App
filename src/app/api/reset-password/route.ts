import { NextResponse } from 'next/server';
import { resetPasswordWithToken, InvalidOrExpiredTokenError } from '@/lib/passwordReset';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(token, newPassword);
    return NextResponse.json({ message: 'Password reset successfully.' });
  } catch (err) {
    if (err instanceof InvalidOrExpiredTokenError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Password reset failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
