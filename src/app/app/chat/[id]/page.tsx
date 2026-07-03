import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { tickSession, SessionNotFoundError, ForbiddenError } from '@/lib/sessions';
import { listMessages } from '@/lib/messages';
import ChatWindow from '@/components/islands/ChatWindow';
import styles from './page.module.css';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Session ${id} | Active Chat`,
  };
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  let initialState;
  let initialMessages;
  try {
    initialState = await tickSession(session.user.id, id);
    initialMessages = await listMessages(session.user.id, id);
  } catch (err) {
    if (err instanceof SessionNotFoundError || err instanceof ForbiddenError) {
      notFound();
    }
    throw err;
  }

  return (
    <div className={`${styles['chat-page-container']} animate-fade-in`}>
      <div className={styles['page-header']}>
        <Link href="/app/dashboard" className={styles['back-link']}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </Link>
        <h2>Consultation Room</h2>
        <p className={styles.subtitle}>Your secure, realtime session is active. Messages are strictly confidential.</p>
      </div>

      <ChatWindow
        sessionId={id}
        initialState={initialState}
        initialMessages={initialMessages}
        viewerId={session.user.id}
      />
    </div>
  );
}
