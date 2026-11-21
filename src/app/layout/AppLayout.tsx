import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Footer from './Footer';
import UpdateBanner from '../UpdateBanner';
import styles from './AppLayout.module.css';

/** Chrome shared by every screen except the live class screen, which owns its
    whole viewport and provides its own header and bottom toolbar. */
export default function AppLayout() {
  return (
    <div className={styles.shell}>
      {/* The bar stays put; everything below it scrolls as one column, so the
          footer watermark sits at the end of the content rather than being
          pinned over it. */}
      <TopBar />
      <div className={`${styles.scroller} scroll-region`}>
        <UpdateBanner />
        <main className={styles.main}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
