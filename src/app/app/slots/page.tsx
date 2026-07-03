import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listOpenSlotsWithExpertNames } from '@/lib/availability';
import { getUserProfile } from '@/lib/users';
import { SLOT_TYPES, type SlotType } from '@/lib/sessionRules';
import SlotFinder from '@/components/islands/SlotFinder';
import styles from '../ledger/page.module.css';

export const metadata: Metadata = {
  title: 'Find a Slot',
};

export default async function SlotsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }

  const [slots, profile] = await Promise.all([
    listOpenSlotsWithExpertNames(),
    getUserProfile(session.user.id),
  ]);

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
          <h1 className="gradient-text">Find a Slot</h1>
          <p>Every open consultation slot, across all experts.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <SlotFinder
          slots={slots.map((s) => ({
            id: s.id,
            slotType: s.slot_type,
            startsAt: s.starts_at,
            cost: SLOT_TYPES[s.slot_type as SlotType].cost,
            includedMinutes: SLOT_TYPES[s.slot_type as SlotType].includedMinutes,
            expertName: s.expert_name,
          }))}
          profileMissingFields={{
            dob: !profile?.dateOfBirth,
            time: !profile?.timeOfBirth,
            place: !profile?.placeOfBirth,
          }}
        />
      </div>
    </div>
  );
}
