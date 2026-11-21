import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Sheet.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet. Closes on Escape or a tap outside, and traps focus while open
 * (SPEC section 5), so switch control and keyboard users cannot tab out into
 * the grid behind it.
 */
export default function Sheet({
  title,
  onClose,
  headerExtra,
  children,
}: {
  title: string;
  onClose: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  /**
   * Held in a ref so the effect below can run exactly once.
   *
   * It used to depend on `onClose`, and every caller passes an inline arrow,
   * so a new identity arrived on every parent render. Each live-query update
   * therefore tore the effect down (focusing whatever was behind the sheet)
   * and set it up again (focusing the sheet's first control), which dismissed
   * the iPad keyboard mid-comment. Worse, that blur fired the comment field's
   * onBlur, which saved, which re-rendered, which blurred again: a loop that
   * locked the app up. Regression tests in Sheet.test.tsx.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheet.current) return;

      const items = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Only on unmount, never on a re-render.
      restoreTo.current?.focus();
    };
  }, []);

  return (
    <div
      className={styles.backdrop}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheet}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.head}>
          {headerExtra}
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className={`${styles.body} scroll-region`}>{children}</div>
      </div>
    </div>
  );
}
