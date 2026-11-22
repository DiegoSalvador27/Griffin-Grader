import { useState } from 'react';
import { useSecretGesture } from '../../features/debug/useSecretGesture';
import DebugPanel from '../../features/debug/DebugPanel';
import styles from './Footer.module.css';

export const WATERMARK = 'Griffin Grader by Diego D.';

/**
 * The watermark, plus the way into the debug panel.
 *
 * Five taps inside 2.5 seconds. It is a plain line of text with no hover or
 * pressed state, so a teacher will never find it by accident, and five
 * deliberate taps in a row do not happen on their own.
 */
export function WatermarkButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { onClick } = useSecretGesture(() => setOpen(true));

  return (
    <>
      {/* A paragraph, not a button. It is attribution text first, so screen
          readers should read it as text, and it must not announce itself as
          something to press. The tap handler is the hidden part. */}
      <p className={`${styles.mark} ${className ?? ''}`} onClick={onClick}>
        {WATERMARK}
      </p>
      {open ? <DebugPanel onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <WatermarkButton />
    </footer>
  );
}
