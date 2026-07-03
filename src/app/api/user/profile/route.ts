import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/lib/users';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : null;
  const dateOfBirth = typeof body?.dateOfBirth === 'string' && body.dateOfBirth ? body.dateOfBirth : null;
  const timeOfBirth = typeof body?.timeOfBirth === 'string' && body.timeOfBirth ? body.timeOfBirth : null;
  const placeOfBirth = typeof body?.placeOfBirth === 'string' && body.placeOfBirth ? body.placeOfBirth.trim() : null;

  try {
    const profile = await updateUserProfile(session.user.id, { name, dateOfBirth, timeOfBirth, placeOfBirth });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('Profile update failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
