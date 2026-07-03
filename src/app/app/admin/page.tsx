import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listAllSlotsForExpert } from '@/lib/availability';
import { listAllAssignedBookings } from '@/lib/bookings';
import AvailabilityManager from '@/components/islands/AvailabilityManager';
import AdminBookingsList from '@/components/islands/AdminBookingsList';
import styles from '@/app/app/dashboard/page.module.css';

export const metadata: Metadata = {
  title: 'Admin',
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/user/login');
  }
  if (session.user.role !== 'expert') {
    redirect('/app/dashboard');
  }

  const [slots, bookings] = await Promise.all([
    listAllSlotsForExpert(session.user.id),
    listAllAssignedBookings(session.user.id),
  ]);

  return (
    <div className={`${styles['dashboard-container']} animate-fade-in`}>
      <div className={styles['dashboard-header']}>
        <h1 className="gradient-text">Admin</h1>
        <p>Manage your availability calendar and review all client bookings.</p>
      </div>

      <div className={styles['dashboard-grid']}>
        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>Availability</h3>
            <span className={styles['session-icon']}>📅</span>
          </div>
          <AvailabilityManager
            slots={slots.map((s) => ({
              id: s.id,
              slotType: s.slot_type,
              startsAt: s.starts_at,
              status: s.status,
            }))}
          />
        </div>

        <div className={`${styles['dashboard-panel']} glass-panel hover-lift`}>
          <div className={styles['panel-header']}>
            <h3>All Bookings</h3>
            <span className={styles['session-icon']}>📜</span>
          </div>
          <AdminBookingsList
            bookings={bookings.map((b) => ({
              id: b.id,
              startsAt: b.starts_at,
              includedMinutes: b.included_minutes,
              slotType: b.slot_type,
              status: b.status,
              clientName: b.client_name,
              clientEmail: b.client_email,
            }))}
            slots={slots
              .filter((s) => s.status === 'open')
              .map((s) => ({
                id: s.id,
                slotType: s.slot_type,
                startsAt: s.starts_at,
              }))}
          />
        </div>
      </div>
    </div>
  );
}
