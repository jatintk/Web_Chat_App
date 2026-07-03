import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { changePassword, InvalidCurrentPasswordError } from '@/lib/users';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : undefined;
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!newPassword) {
    return NextResponse.json({ error: 'New password is required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    await changePassword(session.user.id, { currentPassword, newPassword });
    return NextResponse.json({ message: 'Password updated.' });
  } catch (err) {
    if (err instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('Password change failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
