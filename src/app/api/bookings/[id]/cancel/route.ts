import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  cancelBooking,
  BookingNotFoundError,
  ForbiddenError,
  BookingNotCancellableError,
} from '@/lib/bookings';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await cancelBooking(session.user.id, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof BookingNotCancellableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('Booking cancellation failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
