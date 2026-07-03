import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserProfile } from '@/lib/users';
import ProfileForm from '@/components/islands/ProfileForm';
import styles from '../ledger/page.module.css';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  const profile = await getUserProfile(session.user.id);

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
          <h1 className="gradient-text">Profile</h1>
          <p>Saved once, used to give experts context for your sessions.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <ProfileForm
          initialProfile={{
            name: profile?.name ?? null,
            dateOfBirth: profile?.dateOfBirth ?? null,
            timeOfBirth: profile?.timeOfBirth ?? null,
            placeOfBirth: profile?.placeOfBirth ?? null,
          }}
        />
      </div>
    </div>
  );
}
