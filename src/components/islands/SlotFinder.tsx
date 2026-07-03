'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/app/dashboard/page.module.css';

export type FinderSlot = {
  id: string;
  slotType: string;
  startsAt: string;
  cost: number;
  includedMinutes: number;
  expertName: string | null;
};

type Props = {
  slots: FinderSlot[];
  profileMissingFields: { dob: boolean; time: boolean; place: boolean };
};

function groupByDate(slots: FinderSlot[]): Array<[string, FinderSlot[]]> {
  const groups = new Map<string, FinderSlot[]>();
  for (const slot of slots) {
    const label = new Date(slot.startsAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const existing = groups.get(label);
    if (existing) existing.push(slot);
    else groups.set(label, [slot]);
  }
  return Array.from(groups.entries());
}

export default function SlotFinder({ slots, profileMissingFields }: Props) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasMissingProfileField =
    profileMissingFields.dob || profileMissingFields.time || profileMissingFields.place;

  async function bookSlot(slotId: string) {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilitySlotId: slotId, note: noteText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not book this slot.');
        return;
      }
      setNotice('Booked! You can join once the session is about to start.');
      setSelectedSlotId(null);
      setNoteText('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const groups = groupByDate(slots);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.85rem' }}>{notice}</p>}

      {slots.length === 0 ? (
        <p style={{ margin: 0 }}>No slots are open to book right now. Check back soon.</p>
      ) : (
        groups.map(([dateLabel, daySlots]) => (
          <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{dateLabel}</h4>
            <div className={styles['sessions-list']}>
              {daySlots.map((s) => (
                <div
                  key={s.id}
                  className={styles['session-item']}
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles['session-info']}>
                      <h4>
                        {new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot;{' '}
                        {s.slotType} ({s.includedMinutes} min)
                        {s.expertName ? ` with ${s.expertName}` : ''}
                      </h4>
                      <p>{s.cost} credits</p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setSelectedSlotId(selectedSlotId === s.id ? null : s.id);
                        setError(null);
                        setNotice(null);
                      }}
                    >
                      {selectedSlotId === s.id ? 'Cancel' : 'Book'}
                    </button>
                  </div>

                  {selectedSlotId === s.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {hasMissingProfileField && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Your profile is missing some birth details. You can{' '}
                          <a href="/app/profile" style={{ color: 'var(--primary-accent)' }}>
                            fill in your profile
                          </a>{' '}
                          first, or just include them in your note below.
                        </p>
                      )}
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Optional note for the expert -- your questions or the areas of life you'd like to discuss."
                        rows={3}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid var(--surface-border)',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                      <button
                        className="btn-secondary"
                        onClick={() => bookSlot(s.id)}
                        disabled={submitting}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {submitting ? 'Booking…' : 'Confirm Booking'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
