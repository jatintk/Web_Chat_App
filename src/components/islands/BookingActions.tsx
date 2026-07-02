'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/app/dashboard/page.module.css';
import type { SlotType } from '@/lib/sessionRules';

export type UpcomingBooking = {
  id: string;
  startsAt: string;
  includedMinutes: number;
  status: string;
};

type Props = {
  bookings: UpcomingBooking[];
};

export default function BookingActions({ bookings }: Props) {
  const router = useRouter();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<SlotType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function joinBooking(bookingId: string) {
    setError(null);
    setNotice(null);
    setJoiningId(bookingId);
    try {
      const res = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not join session.');
        return;
      }
      router.push(`/app/chat/${data.sessionId}`);
    } finally {
      setJoiningId(null);
    }
  }

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
          ? `Cancelled — ${data.refundAmount} credits refunded (${data.refundPercent}%).`
          : 'Cancelled — no refund (past the slot window).'
      );
      router.refresh();
    } finally {
      setCancellingId(null);
    }
  }

  async function bookSlot(slotType: SlotType) {
    setError(null);
    setBooking(slotType);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book this slot.');
        return;
      }
      await joinBooking(data.booking.id);
    } finally {
      setBooking(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.85rem' }}>{notice}</p>}

      {bookings.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No upcoming sessions. Book a slot to get started.</p>
      ) : (
        <div className={styles['sessions-list']}>
          {bookings.map((b) => (
            <div key={b.id} className={styles['session-item']}>
              <div className={styles['session-info']}>
                <h4>{b.includedMinutes}-minute session</h4>
                <p>{new Date(b.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {b.status === 'scheduled' && (
                  <button
                    className="btn-ghost"
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancellingId === b.id}
                  >
                    {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
                <button
                  className={`btn-secondary ${styles['join-btn']}`}
                  onClick={() => joinBooking(b.id)}
                  disabled={joiningId === b.id}
                >
                  {joiningId === b.id ? 'Joining…' : 'Join'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="btn-primary" onClick={() => bookSlot('standard')} disabled={booking !== null}>
          {booking === 'standard' ? 'Booking…' : 'Book Standard — 50 credits (30 min)'}
        </button>
        <button className="btn-secondary" onClick={() => bookSlot('extended')} disabled={booking !== null}>
          {booking === 'extended' ? 'Booking…' : 'Book Extended — 90 credits (60 min)'}
        </button>
      </div>
    </div>
  );
}
