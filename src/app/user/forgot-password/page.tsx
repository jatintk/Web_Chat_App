'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const res = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                return;
            }

            setNotice(data.message);
            setSubmitted(true);
        } catch {
            setError('Could not reach the server, please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ display: 'flex', minHeight: '75vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Forgot Password</h1>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Enter your email and we'll send you a link to reset it.</p>
                </div>

                {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
                {notice && <p style={{ color: 'var(--primary-accent)', margin: 0, fontSize: '0.9rem' }}>{notice}</p>}

                {!submitted && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                            {submitting ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <Link href="/user/login" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    Back to login
                </Link>
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
