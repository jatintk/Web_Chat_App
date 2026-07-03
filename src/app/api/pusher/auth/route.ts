import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusherServer';
import { assertSessionAccess, SessionNotFoundError, ForbiddenError } from '@/lib/sessions';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const formData = await req.formData();
  const socketId = formData.get('socket_id');
  const channelName = formData.get('channel_name');

  if (typeof socketId !== 'string' || typeof channelName !== 'string' || !channelName.startsWith('private-session-')) {
    return NextResponse.json({ error: 'Invalid channel auth request.' }, { status: 400 });
  }

  const sessionId = channelName.slice('private-session-'.length);

  try {
    await assertSessionAccess(session.user.id, sessionId);
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
