'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/app/dashboard/page.module.css';

export type AdminBooking = {
  id: string;
  startsAt: string;
  includedMinutes: number;
  slotType: string | null;
  status: string;
  clientName: string | null;
  clientEmail: string;
};

export type AdminOpenSlot = {
  id: string;
  slotType: string;
  startsAt: string;
};

type Props = {
  bookings: AdminBooking[];
  slots: AdminOpenSlot[];
};

export default function AdminBookingsList({ bookings, slots }: Props) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState('');
  const [confirmingRescheduleId, setConfirmingRescheduleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function cancelBooking(bookingId: string) {
    setError(null);
    setNotice(null);
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not cancel this booking.');
        return;
      }
      setNotice(
        data.refundAmount > 0
          ? `Cancelled — ${data.refundAmount} credits refunded to the client (${data.refundPercent}%).`
          : 'Cancelled — no refund (past the slot window).'
      );
      router.refresh();
    } finally {
      setCancellingId(null);
    }
  }

  async function confirmReschedule(bookingId: string) {
    if (!rescheduleTarget) return;
    setError(null);
    setNotice(null);
    setConfirmingRescheduleId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAvailabilitySlotId: rescheduleTarget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reschedule this booking.');
        return;
      }
      setNotice('Booking rescheduled.');
      setReschedulingBookingId(null);
      setRescheduleTarget('');
      router.refresh();
    } finally {
      setConfirmingRescheduleId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.85rem' }}>{notice}</p>}

      {bookings.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No bookings yet.</p>
      ) : (
        <div className={styles['sessions-list']} style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {bookings.map((b) => {
            const sameTypeSlots = slots.filter((s) => s.slotType === b.slotType);

            return (
              <div key={b.id} className={styles['session-item']} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className={styles['session-info']}>
                    <h4>{b.clientName || b.clientEmail}</h4>
                    <p>
                      {b.includedMinutes}-minute session &middot;{' '}
                      {new Date(b.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      &middot; <span style={{ textTransform: 'capitalize' }}>{b.status}</span>
                    </p>
                  </div>
                  {b.status === 'scheduled' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          setReschedulingBookingId(reschedulingBookingId === b.id ? null : b.id)
                        }
                      >
                        Reschedule
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => cancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {b.status === 'active' ? 'In progress' : b.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                  )}
                </div>

                {reschedulingBookingId === b.id && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={rescheduleTarget}
                      onChange={(e) => setRescheduleTarget(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-pill)' }}
                    >
                      <option value="">Choose a new time…</option>
                      {sameTypeSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-primary"
                      onClick={() => confirmReschedule(b.id)}
                      disabled={!rescheduleTarget || confirmingRescheduleId === b.id}
                    >
                      {confirmingRescheduleId === b.id ? 'Saving…' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
