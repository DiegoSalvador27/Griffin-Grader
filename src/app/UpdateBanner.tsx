import { useEffect, useState } from 'react';
import { applyUpdate, onUpdateReady } from './pwa';
import styles from './UpdateBanner.module.css';

/** Non-blocking "a new version is ready" prompt. Reloading is always the
    teacher's choice, never automatic (SPEC 4.8). */
export default function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => onUpdateReady(setReady), []);

  if (!ready) return null;

  return (
    <div className={styles.banner} role="status">
      <span>A new version of Griffin Grader is ready.</span>
      <button type="button" className={styles.action} onClick={applyUpdate}>
        Reload now
      </button>
    </div>
  );
}
