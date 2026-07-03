import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listLedgerEntries } from '@/lib/ledger';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Ledger History',
};

const ENTRY_TYPE_LABELS: Record<string, string> = {
  purchase: 'Credit purchase',
  slot_booking: 'Slot booking',
  overage_charge: 'Overage charge',
  refund: 'Refund',
};

export default async function LedgerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  const entries = await listLedgerEntries(session.user.id);

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
          <h1 className="gradient-text">Ledger History</h1>
          <p>Every credit added to or spent from your wallet.</p>
        </div>
      </div>

      <div className={`glass-panel ${styles['entry-list']}`} style={{ padding: '1.5rem' }}>
        {entries.length === 0 ? (
          <p className={styles['empty-state']}>No ledger activity yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={styles['entry-row']}>
              <div className={styles['entry-info']}>
                <h4>{ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}</h4>
                <p>
                  {entry.description || 'No description'} &middot;{' '}
                  {new Date(entry.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <span className={`${styles['entry-amount']} ${entry.amount >= 0 ? styles.positive : styles.negative}`}>
                {entry.amount >= 0 ? '+' : ''}
                {entry.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
