'use client';

import { useState } from 'react';

export type InitialProfile = {
  name: string | null;
  dateOfBirth: string | null;
  timeOfBirth: string | null;
  placeOfBirth: string | null;
};

type Props = {
  initialProfile: InitialProfile;
};

// Postgres DATE/TIME come back as full ISO-ish strings (e.g. a DATE row is
// serialized as "1990-05-12T00:00:00.000Z" by the pg driver) -- <input
// type="date"/"time"> need just the YYYY-MM-DD / HH:MM portion.
function toDateInputValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function toTimeInputValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export default function ProfileForm({ initialProfile }: Props) {
  const [name, setName] = useState(initialProfile.name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(initialProfile.dateOfBirth));
  const [timeOfBirth, setTimeOfBirth] = useState(toTimeInputValue(initialProfile.timeOfBirth));
  const [placeOfBirth, setPlaceOfBirth] = useState(initialProfile.placeOfBirth ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dateOfBirth, timeOfBirth, placeOfBirth }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save your profile.');
        return;
      }
      setNotice('Profile saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px' }}>
      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.85rem' }}>{notice}</p>}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        Date of birth
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        Time of birth
        <input
          type="time"
          value={timeOfBirth}
          onChange={(e) => setTimeOfBirth(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        Place of birth
        <input
          type="text"
          value={placeOfBirth}
          onChange={(e) => setPlaceOfBirth(e.target.value)}
          placeholder="City, Country"
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  );
}
