import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createBooking, InsufficientCreditsError } from '@/lib/bookings';
import { isSlotType } from '@/lib/sessionRules';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isSlotType(body?.slotType)) {
    return NextResponse.json({ error: 'slotType must be "standard" or "extended".' }, { status: 400 });
  }

  try {
    const booking = await createBooking(session.user.id, body.slotType);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    console.error('Booking creation failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
