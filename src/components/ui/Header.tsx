import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={`glass-panel ${styles['main-header']} animate-fade-in`}>
      <div className={styles.logo}>
        <span className="gradient-text-accent">AstroChat</span>
      </div>

      <nav className={styles['nav-links']}>
        <Link href="/">Home</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/app/dashboard">Dashboard</Link>
      </nav>

      <div className={styles['auth-actions']}>
        <button className="btn-secondary">Log In</button>
        <button className="btn-primary hover-lift">Sign Up</button>
      </div>
    </header>
  );
}
