import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listMessages } from '@/lib/messages';
import { SessionNotFoundError, ForbiddenError } from '@/lib/sessions';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Not authenticated.', { status: 401 });
  }

  const { id } = await params;

  try {
    const messages = await listMessages(session.user.id, id);

    const lines = messages.map((m) => {
      const timestamp = new Date(m.createdAt).toLocaleString();
      const sender = m.senderName || (m.senderRole === 'expert' ? 'Expert' : 'Client');
      return `[${timestamp}] ${sender}: ${m.body}`;
    });
    const text = lines.length > 0 ? lines.join('\n') + '\n' : 'No messages in this session.\n';

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-${id}.txt"`,
      },
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return new Response(err.message, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return new Response(err.message, { status: 403 });
    }
    console.error('Export failed:', err);
    return new Response('Something went wrong. Please try again.', { status: 500 });
  }
}
