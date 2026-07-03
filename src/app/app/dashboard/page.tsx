import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getBalance } from '@/lib/ledger';
import { listUpcomingBookings, listAssignedBookings } from '@/lib/bookings';
import { listOpenSlots } from '@/lib/availability';
import { SLOT_TYPES, type SlotType } from '@/lib/sessionRules';
import BookingActions from '@/components/islands/BookingActions';
import ExpertSessions from '@/components/islands/ExpertSessions';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  if (session.user.role === 'expert') {
    const assigned = await listAssignedBookings(session.user.id);

    return (
      <div className={`${styles['dashboard-container']} animate-fade-in`}>
        <div className={styles['dashboard-header']}>
          <h1 className="gradient-text">Welcome back, {session.user.name || session.user.email}</h1>
          <p>Your assigned client sessions.</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Link href="/app/admin" className="btn-secondary">
              Manage Availability & Bookings
            </Link>
            <Link href="/app/chats" className="btn-secondary">
              Past Chats
            </Link>
          </div>
        </div>

        <div className={styles['dashboard-grid']}>
          <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
            <div className={styles['panel-header']}>
              <h3>Client Sessions</h3>
              <span className={styles['session-icon']}>📅</span>
            </div>
            <ExpertSessions
              sessions={assigned.map((b) => ({
                id: b.id,
                startsAt: b.starts_at,
                includedMinutes: b.included_minutes,
                status: b.status,
                clientName: b.client_name,
                clientEmail: b.client_email,
              }))}
            />
          </div>
        </div>
      </div>
    );
  }

  const [balance, bookings, openSlots] = await Promise.all([
    getBalance(session.user.id),
    listUpcomingBookings(session.user.id),
    listOpenSlots(),
  ]);

  return (
    <div className={`${styles['dashboard-container']} animate-fade-in`}>
      <div className={styles['dashboard-header']}>
        <h1 className="gradient-text">Welcome back, {session.user.name || session.user.email}</h1>
        <p>Manage your sessions and credits here.</p>
      </div>

      <div className={styles['dashboard-grid']}>
        {/* Wallet Panel */}
        <div className={`${styles['dashboard-panel']} ${styles['wallet-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Credit Balance</h3>
            <span className={styles['wallet-icon']}>💳</span>
          </div>
          <div className={styles['balance-display']}>
            <span className={styles['balance-amount']}>{balance}</span>
            <span className={styles['balance-currency']}>Credits</span>
          </div>
          <div className={styles['wallet-actions']}>
            <Link href="/pricing" className="btn-primary" style={{ textAlign: 'center' }}>Top Up Balance</Link>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Sessions</h3>
            <span className={styles['session-icon']}>📅</span>
          </div>
          <BookingActions
            bookings={bookings.map((b) => ({
              id: b.id,
              startsAt: b.starts_at,
              includedMinutes: b.included_minutes,
              slotType: b.slot_type,
              status: b.status,
              expertName: b.expert_name,
            }))}
            slots={openSlots.map((s) => ({
              id: s.id,
              slotType: s.slot_type,
              startsAt: s.starts_at,
              cost: SLOT_TYPES[s.slot_type as SlotType].cost,
              includedMinutes: SLOT_TYPES[s.slot_type as SlotType].includedMinutes,
            }))}
          />
        </div>

        {/* Quick Actions */}
        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Quick Actions</h3>
            <span className={styles['action-icon']}>⚡</span>
          </div>
          <div className={styles['action-grid']}>
            <Link href="/app/slots" className={styles['action-card']}>
              <span className={styles.icon}>🔍</span>
              <span>Find a Slot</span>
            </Link>
            <Link href="/app/ledger" className={styles['action-card']}>
              <span className={styles.icon}>📜</span>
              <span>Ledger History</span>
            </Link>
            <Link href="/app/profile" className={styles['action-card']}>
              <span className={styles.icon}>🧑</span>
              <span>Profile</span>
            </Link>
            <Link href="/app/chats" className={styles['action-card']}>
              <span className={styles.icon}>💬</span>
              <span>Past Chats</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
