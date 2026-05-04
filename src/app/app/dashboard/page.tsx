import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className={`${styles['dashboard-container']} animate-fade-in`}>
      <div className={styles['dashboard-header']}>
        <h1 className="gradient-text">Welcome back, User</h1>
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
            <span className={styles['balance-amount']}>350</span>
            <span className={styles['balance-currency']}>Credits</span>
          </div>
          <div className={styles['wallet-actions']}>
            <Link href="/pricing" className="btn-primary" style={{ textAlign: 'center' }}>Top Up Balance</Link>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Upcoming Sessions</h3>
            <span className={styles['session-icon']}>📅</span>
          </div>
          <div className={styles['sessions-list']}>
            <div className={styles['session-item']}>
              <div className={styles['session-info']}>
                <h4>Consultation with Expert</h4>
                <p>Today, 3:00 PM - 3:30 PM</p>
              </div>
              <Link href="/app/chat/1" className={`btn-secondary ${styles['join-btn']}`}>Join</Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Quick Actions</h3>
            <span className={styles['action-icon']}>⚡</span>
          </div>
          <div className={styles['action-grid']}>
            <button className={styles['action-card']}>
              <span className={styles.icon}>🔍</span>
              <span>Find Expert</span>
            </button>
            <button className={styles['action-card']}>
              <span className={styles.icon}>📜</span>
              <span>Ledger History</span>
            </button>
            <button className={styles['action-card']}>
              <span className={styles.icon}>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
