'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotType } from '@/lib/sessionRules';

export type AdminSlot = {
  id: string;
  slotType: string;
  startsAt: string;
  status: string;
};

type Props = {
  slots: AdminSlot[];
};

export default function AvailabilityManager({ slots }: Props) {
  const router = useRouter();
  const [slotType, setSlotType] = useState<SlotType>('standard');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSlot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startsAtLocal) return;
    setCreating(true);
    try {
      const startsAt = new Date(startsAtLocal).toISOString();
      const res = await fetch('/api/admin/availability-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotType, startsAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create this slot.');
        return;
      }
      setStartsAtLocal('');
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function cancelSlot(slotId: string) {
    setError(null);
    setCancellingId(slotId);
    try {
      const res = await fetch(`/api/admin/availability-slots/${slotId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not cancel this slot.');
        return;
      }
      router.refresh();
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}

      {slots.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No slots yet. Create one below.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
          {slots.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.6rem 0.9rem',
                background: 'rgba(255, 251, 245, 0.7)',
                borderRadius: '10px',
                border: '1px solid var(--surface-border)',
                opacity: s.status === 'open' ? 1 : 0.5,
              }}
            >
              <div>
                <strong style={{ textTransform: 'capitalize' }}>{s.slotType}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                  {new Date(s.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}
                  {s.status}
                </p>
              </div>
              {s.status === 'open' && (
                <button className="btn-ghost" onClick={() => cancelSlot(s.id)} disabled={cancellingId === s.id}>
                  {cancellingId === s.id ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={createSlot} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <select
          value={slotType}
          onChange={(e) => setSlotType(e.target.value as SlotType)}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)' }}
        >
          <option value="standard">Standard — 50 credits (30 min)</option>
          <option value="extended">Extended — 90 credits (60 min)</option>
        </select>
        <input
          type="datetime-local"
          value={startsAtLocal}
          onChange={(e) => setStartsAtLocal(e.target.value)}
          required
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)' }}
        />
        <button className="btn-primary" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Add Availability Slot'}
        </button>
      </form>
    </div>
  );
}
