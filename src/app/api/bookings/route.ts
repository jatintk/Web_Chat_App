import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createBooking, InsufficientCreditsError, SlotNotFoundError, SlotNotAvailableError } from '@/lib/bookings';
import { notifyExpertOfBooking } from '@/lib/email';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const availabilitySlotId = typeof body?.availabilitySlotId === 'string' ? body.availabilitySlotId : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : undefined;
  if (!availabilitySlotId) {
    return NextResponse.json({ error: 'availabilitySlotId is required.' }, { status: 400 });
  }

  try {
    const booking = await createBooking(session.user.id, availabilitySlotId, note);
    notifyExpertOfBooking(session.user.id, booking).catch((err) =>
      console.error('Booking notification email failed:', err)
    );
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    if (err instanceof SlotNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof SlotNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('Booking creation failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
