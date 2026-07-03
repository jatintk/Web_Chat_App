'use client';

import { useState } from 'react';

type Props = {
  hasPassword: boolean;
};

export default function ChangePasswordForm({ hasPassword }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not update your password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(hasPassword ? 'Password updated.' : 'Password set. You can now also log in with your email and password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{hasPassword ? 'Change Password' : 'Set a Password'}</h3>
        {!hasPassword && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Your account currently only signs in with Google. Setting a password also lets you log in with your email.
          </p>
        )}
      </div>

      {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
      {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.85rem' }}>{notice}</p>}

      {hasPassword && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
          />
        </label>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        New password
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
        Confirm new password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--surface-border)' }}
        />
      </label>

      <button className="btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : hasPassword ? 'Update Password' : 'Set Password'}
      </button>
    </form>
  );
}
