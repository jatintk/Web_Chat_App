import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
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
        <Link href="/app/dashboard">Dashboard</Link>
      </nav>

      <div className={styles['auth-actions']}>
        <button type="button" className="btn-ghost">Log In</button>
        <button type="button" className="btn-gradient hover-lift">Sign Up</button>
      </div>
    </header>
  );
}
