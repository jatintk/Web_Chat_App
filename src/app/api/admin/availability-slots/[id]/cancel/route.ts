import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cancelAvailabilitySlot, SlotNotFoundError, SlotNotAvailableError, ForbiddenError } from '@/lib/availability';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (session.user.role !== 'expert') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await cancelAvailabilitySlot(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof SlotNotAvailableError) {
      return NextResponse.json({ error: 'Only an open (unbooked) slot can be cancelled this way.' }, { status: 409 });
    }
    console.error('Availability slot cancellation failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
