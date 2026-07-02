'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import GoogleIcon from '@/components/ui/GoogleIcon';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong.');
                return;
            }

            const signInResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                router.push('/user/login');
                return;
            }

            router.push('/app/dashboard');
        } catch {
            setError('Something went wrong. Please try again.');
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
                    <h1 className="gradient-text" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Create an Account</h1>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Join us today — it's free.</p>
                </div>

                {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{error}</p>}

                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
                <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
                    {submitting ? 'Creating account…' : 'Sign Up'}
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
