'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/app/dashboard/page.module.css';

const JOIN_WINDOW_BEFORE_MS = 10 * 60 * 1000;
const RESCHEDULE_MIN_LEAD_TIME_MS = 3 * 24 * 60 * 60 * 1000;

export type UpcomingBooking = {
  id: string;
  startsAt: string;
  includedMinutes: number;
  slotType: string | null;
  status: string;
  expertName: string | null;
};

export type OpenSlot = {
  id: string;
  slotType: string;
  startsAt: string;
  cost: number;
  includedMinutes: number;
};

type Props = {
  bookings: UpcomingBooking[];
  slots: OpenSlot[];
};

export default function BookingActions({ bookings, slots }: Props) {
  const router = useRouter();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<string>('');
  const [confirmingRescheduleId, setConfirmingRescheduleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Re-check every 30s so the Join button flips live as a slot's window opens,
  // without needing a manual refresh -- pure client-side display gating, the
  // server enforces the real check regardless.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

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

  async function bookSlot(slotId: string) {
    setError(null);
    setNotice(null);
    setBookingSlotId(slotId);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilitySlotId: slotId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book this slot.');
        return;
      }
      // Don't auto-join -- the slot may be scheduled well in the future, in
      // which case Join stays disabled until within the join window. Just
      // refresh so the new booking shows up in the list above.
      setNotice('Booked! You can join once the session is about to start.');
      router.refresh();
    } finally {
      setBookingSlotId(null);
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
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No upcoming sessions. Book a slot to get started.</p>
      ) : (
        <div className={styles['sessions-list']}>
          {bookings.map((b) => {
            const startsAtMs = new Date(b.startsAt).getTime();
            const canJoin = startsAtMs - now <= JOIN_WINDOW_BEFORE_MS;
            const canReschedule = b.status === 'scheduled' && startsAtMs - now > RESCHEDULE_MIN_LEAD_TIME_MS;
            const sameTypeSlots = slots.filter((s) => s.slotType === b.slotType);

            return (
              <div key={b.id} className={styles['session-item']} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className={styles['session-info']}>
                    <h4>{b.includedMinutes}-minute session{b.expertName ? ` with ${b.expertName}` : ''}</h4>
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
                    {canReschedule && (
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          setReschedulingBookingId(reschedulingBookingId === b.id ? null : b.id)
                        }
                      >
                        Reschedule
                      </button>
                    )}
                    <button
                      className={`btn-secondary ${styles['join-btn']}`}
                      onClick={() => joinBooking(b.id)}
                      disabled={joiningId === b.id || !canJoin}
                      title={canJoin ? undefined : 'You can join starting 10 minutes before the scheduled time.'}
                    >
                      {joiningId === b.id ? 'Joining…' : canJoin ? 'Join' : 'Not yet'}
                    </button>
                  </div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {slots.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No slots are open to book right now.
          </p>
        ) : (
          slots.map((s) => (
            <button
              key={s.id}
              className="btn-primary"
              onClick={() => bookSlot(s.id)}
              disabled={bookingSlotId !== null}
            >
              {bookingSlotId === s.id
                ? 'Booking…'
                : `Book ${new Date(s.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} — ${s.slotType} (${s.cost} credits, ${s.includedMinutes} min)`}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
