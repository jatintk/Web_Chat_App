import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAvailabilitySlot, SlotOverlapError, SlotNotAvailableError } from '@/lib/availability';
import { isSlotType } from '@/lib/sessionRules';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (session.user.role !== 'expert') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!isSlotType(body?.slotType)) {
    return NextResponse.json({ error: 'slotType must be "standard" or "extended".' }, { status: 400 });
  }
  const startsAt = typeof body?.startsAt === 'string' ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'startsAt must be a valid date/time.' }, { status: 400 });
  }

  try {
    const slot = await createAvailabilitySlot(session.user.id, { slotType: body.slotType, startsAt });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotOverlapError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof SlotNotAvailableError) {
      return NextResponse.json({ error: 'Start time must be in the future.' }, { status: 400 });
    }
    console.error('Availability slot creation failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
