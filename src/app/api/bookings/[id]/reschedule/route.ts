import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  rescheduleBooking,
  BookingNotFoundError,
  ForbiddenError,
  BookingNotCancellableError,
  RescheduleWindowExpiredError,
  SlotNotFoundError,
  SlotNotAvailableError,
} from '@/lib/bookings';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const newAvailabilitySlotId = typeof body?.newAvailabilitySlotId === 'string' ? body.newAvailabilitySlotId : '';
  if (!newAvailabilitySlotId) {
    return NextResponse.json({ error: 'newAvailabilitySlotId is required.' }, { status: 400 });
  }

  try {
    const booking = await rescheduleBooking(session.user.id, id, newAvailabilitySlotId);
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof BookingNotFoundError || err instanceof SlotNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (
      err instanceof BookingNotCancellableError ||
      err instanceof RescheduleWindowExpiredError ||
      err instanceof SlotNotAvailableError
    ) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('Booking reschedule failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
