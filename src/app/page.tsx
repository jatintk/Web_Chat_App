
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Connect & Chat instantly',
};


export default function HomePage() {
  
  return (
    <>
      <div className={styles['hero-section']}>
        <div className={`${styles['hero-content']} animate-fade-in`}>
          <div className={styles.badge}>🚀 The Next-Gen Chat Experience</div>
          <h1 className={`${styles['hero-title']} gradient-text`}>
            Connect seamlessly.<br />
            Pay only for what you use.
          </h1>
          <p className={styles['hero-subtitle']}>
            Purchase credits, book time slots, and experience crystal clear realtime chat without expensive subscriptions. The future of consulting and mentoring is here.
          </p>
          <div className={styles['hero-cta']}>
            <Link href="/pricing" className="btn-primary hover-lift">View Pricing</Link>
          </div>
        </div>

        <div className={`${styles['hero-visual']} glass-panel hover-lift animate-fade-in`} style={{ animationDelay: '0.2s' }}>
          <div className={styles['mock-chat']}>
            <div className={styles['chat-header']}>
              <div className={styles['status-dot']}></div>
              <span>Live Session • 45 Credits remaining</span>
            </div>
            <div className={styles['chat-body']}>
              <div className={`${styles.message} ${styles.incoming}`}>Hello! Ready to start our session?</div>
              <div className={`${styles.message} ${styles.outgoing}`}>Absolutely! Let&apos;s dive right in.</div>
              <div className={`${styles.message} ${styles.incoming}`}>I&apos;ve sent over the initial files.</div>
            </div>
            <div className={styles['chat-input']}>
              <span>Type your message...</span>
              <button className={styles['send-btn']}>Send</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['features-grid']}>
        <div className={`${styles['feature-card']} glass-panel hover-lift animate-fade-in`} style={{ animationDelay: '0.3s' }}>
          <div className={styles['feature-icon']}>💎</div>
          <h3>Credit-Based</h3>
          <p>No monthly subscriptions. Buy credits and use them when you need them.</p>
        </div>
        <div className={`${styles['feature-card']} glass-panel hover-lift animate-fade-in`} style={{ animationDelay: '0.4s' }}>
          <div className={styles['feature-icon']}>⏱️</div>
          <h3>Fair Overage</h3>
          <p>Only pay 2 credits per minute when you go over your included slot time.</p>
        </div>
        <div className={`${styles['feature-card']} glass-panel hover-lift animate-fade-in`} style={{ animationDelay: '0.5s' }}>
          <div className={styles['feature-icon']}>⚡</div>
          <h3>Realtime Sync</h3>
          <p>Powered by ultra-fast web sockets for zero-latency communication.</p>
        </div>
      </div>
    </>
  );
}
