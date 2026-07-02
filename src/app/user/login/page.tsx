'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import GoogleIcon from '@/components/ui/GoogleIcon';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password.');
                return;
            }

            router.push('/app/dashboard');
        } finally {
            setSubmitting(false);
        }
    }

    function handleGoogleSignIn() {
        signIn('google', { callbackUrl: '/app/dashboard' });
    }

    return (
        <div style={{ display: 'flex', minHeight: '75vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Log In</h1>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Welcome back! Please enter your details.</p>
                </div>

                {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{error}</p>}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
                    {submitting ? 'Logging in…' : 'Log In'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
                    <span style={{ fontSize: '0.8rem' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
                </div>

                <button type="button" className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }} onClick={handleGoogleSignIn}>
                    <GoogleIcon />
                    Continue with Google
                </button>
            </form>
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
