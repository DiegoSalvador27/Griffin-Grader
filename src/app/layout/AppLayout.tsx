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
      <TopBar />
      <UpdateBanner />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
