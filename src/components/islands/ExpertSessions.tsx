'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/app/dashboard/page.module.css';

export type AssignedSession = {
  id: string;
  startsAt: string;
  includedMinutes: number;
  status: string;
  clientName: string | null;
  clientEmail: string;
};

type Props = {
  sessions: AssignedSession[];
};

export default function ExpertSessions({ sessions }: Props) {
  const router = useRouter();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function joinSession(bookingId: string) {
    setError(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}

      {sessions.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No client sessions assigned yet.</p>
      ) : (
        <div className={styles['sessions-list']}>
          {sessions.map((s) => (
            <div key={s.id} className={styles['session-item']}>
              <div className={styles['session-info']}>
                <h4>{s.clientName || s.clientEmail}</h4>
                <p>
                  {s.includedMinutes}-minute session &middot;{' '}
                  {new Date(s.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              {s.status === 'active' ? (
                <button
                  className={`btn-secondary ${styles['join-btn']}`}
                  onClick={() => joinSession(s.id)}
                  disabled={joiningId === s.id}
                >
                  {joiningId === s.id ? 'Joining…' : 'Join Session'}
                </button>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Waiting for client</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
