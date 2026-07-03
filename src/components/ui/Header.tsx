"use client";
import Link from 'next/link';
import styles from './Header.module.css';
import { SessionProvider, signOut, useSession } from 'next-auth/react';

export default function HeaderBar(){
  return <SessionProvider>
    <Header />
  </SessionProvider>
}

function Header() {
  const session = useSession();
  return (
    <header className={`${styles['main-header']} animate-fade-in`}>
      <div className={styles.logo}>
        <Link href="/">
          <span className="gradient-text">AstroChat</span>
        </Link>
      </div>

      <nav className={styles['nav-links']}>
        <Link href="/">Home</Link>
        <Link href="/pricing">Pricing</Link>
        {session.data && <Link href="/app/dashboard">Dashboard</Link>}
        {session.data?.user?.role === 'expert' && <Link href="/app/admin">Admin</Link>}
      </nav>

      <div className={styles['auth-actions']}>
        {session.status === "unauthenticated" && (
          <>
            <Link href="/user/login">
              <button type="button" className="btn-ghost">Log In</button>
            </Link>
            <Link href="/user/signup">
              <button type="button" className="btn-gradient hover-lift">Sign Up</button>
            </Link>
          </>
        ) }
        {session.status === "authenticated" && (
          <button type="button" className="btn-ghost" onClick={() => signOut()}>Log Out</button>
        )}
      </div>
    </header>
  );
}
