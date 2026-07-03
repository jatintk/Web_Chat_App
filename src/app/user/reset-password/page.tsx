'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                return;
            }

            router.push('/user/login');
        } catch {
            setError('Could not reach the server, please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!token) {
        return (
            <>
                <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>Invalid reset link.</p>
                <Link href="/user/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    Request a new one
                </Link>
            </>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} style={inputStyle} />
            <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div style={{ display: 'flex', minHeight: '75vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Reset Password</h1>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Choose a new password for your account.</p>
                </div>

                <Suspense fallback={<p style={{ margin: 0, fontSize: '0.9rem' }}>Loading…</p>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: 'var(--surface-color)',
    border: '1px solid var(--surface-border)',
    borderRadius: 'var(--radius-pill)',
    padding: '0.85rem 1.25rem',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
};
