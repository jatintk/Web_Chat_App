import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Pricing & Credit Packs',
};

export default function PricingPage() {
  return (
    <div className={`${styles['pricing-container']} animate-fade-in`}>
      <div className={styles['pricing-header']}>
        <h1 className="gradient-text">Simple, Transparent Pricing</h1>
        <p>Top up your wallet and pay exactly for what you use. No hidden fees.</p>
      </div>

      <div className={styles['pricing-grid']}>
        {/* Starter Pack */}
        <div className={`${styles['pricing-card']} glass-panel hover-lift`}>
          <div className={styles['pack-name']}>Starter Pack</div>
          <div className={styles['pack-price']}>
            <span className={styles.currency}>₹</span><span className={styles.amount}>500</span>
          </div>
          <div className={styles['pack-credits']}>100 Credits</div>
          <ul className={styles['pack-features']}>
            <li>✔ 1 Standard Slot (30 mins)</li>
            <li>✔ 50 Credits for overage</li>
            <li>✔ Best for quick syncs</li>
          </ul>
          <button className={`btn-secondary ${styles['buy-btn']}`}>Buy Now</button>
        </div>

        {/* Pro Pack */}
        <div className={`${styles['pricing-card']} ${styles.featured} glass-panel hover-lift`}>
          <div className={styles['featured-badge']}>Most Popular</div>
          <div className={styles['pack-name']}>Pro Pack</div>
          <div className={styles['pack-price']}>
            <span className={styles.currency}>₹</span><span className={styles.amount}>1000</span>
          </div>
          <div className={styles['pack-credits']}>250 Credits</div>
          <ul className={styles['pack-features']}>
            <li>✔ Includes 50 Bonus Credits</li>
            <li>✔ ~5 Standard Slots</li>
            <li>✔ Priority Support</li>
          </ul>
          <button className={`btn-primary ${styles['buy-btn']}`}>Buy Now</button>
        </div>

        {/* Expert Pack */}
        <div className={`${styles['pricing-card']} glass-panel hover-lift`}>
          <div className={styles['pack-name']}>Expert Pack</div>
          <div className={styles['pack-price']}>
            <span className={styles.currency}>₹</span><span className={styles.amount}>2500</span>
          </div>
          <div className={styles['pack-credits']}>700 Credits</div>
          <ul className={styles['pack-features']}>
            <li>✔ Includes 200 Bonus Credits</li>
            <li>✔ ~7 Extended Slots (60 mins)</li>
            <li>✔ 24/7 Priority Support</li>
          </ul>
          <button className={`btn-secondary ${styles['buy-btn']}`}>Buy Now</button>
        </div>
      </div>
    </div>
  );
}
