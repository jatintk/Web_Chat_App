import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { joinSession, BookingNotFoundError, ForbiddenError, BookingNotJoinableError, SessionNotStartedError, TooEarlyToJoinError } from '@/lib/sessions';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : '';
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 });
  }

  try {
    const result = await joinSession(session.user.id, bookingId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof BookingNotJoinableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof SessionNotStartedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof TooEarlyToJoinError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('Session join failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
