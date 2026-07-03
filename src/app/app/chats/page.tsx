import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listPastSessionsForClient, listPastSessionsForExpert } from '@/lib/sessions';
import styles from '../ledger/page.module.css';

export const metadata: Metadata = {
  title: 'Past Chats',
};

export default async function ChatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  const isExpert = session.user.role === 'expert';

  const rows = isExpert
    ? (await listPastSessionsForExpert(session.user.id)).map((s) => ({
        id: s.id,
        startedAt: s.started_at,
        totalMinutesUsed: s.total_minutes_used,
        slotType: s.slot_type,
        otherPartyName: s.client_name || s.client_email,
      }))
    : (await listPastSessionsForClient(session.user.id)).map((s) => ({
        id: s.id,
        startedAt: s.started_at,
        totalMinutesUsed: s.total_minutes_used,
        slotType: s.slot_type,
        otherPartyName: s.expert_name || 'Expert',
      }));

  return (
    <div className={`${styles['ledger-container']} animate-fade-in`}>
      <Link href="/app/dashboard" className={styles['back-link']}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </Link>

      <div className={styles['ledger-header']}>
        <div>
          <h1 className="gradient-text">Past Chats</h1>
          <p>{isExpert ? 'Every past session with any client.' : 'Your past sessions.'}</p>
        </div>
      </div>

      <div className={`glass-panel ${styles['entry-list']}`} style={{ padding: '1.5rem' }}>
        {rows.length === 0 ? (
          <p className={styles['empty-state']}>No past chats yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className={styles['entry-row']}>
              <div className={styles['entry-info']}>
                <h4>{row.otherPartyName}</h4>
                <p>
                  {new Date(row.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} &middot;{' '}
                  {row.totalMinutesUsed} min &middot; {row.slotType || 'session'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href={`/app/chat/${row.id}`} className="btn-ghost">
                  View
                </Link>
                <a href={`/api/sessions/${row.id}/export`} className="btn-ghost">
                  Export
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
