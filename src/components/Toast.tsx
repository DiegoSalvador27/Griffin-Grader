import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { newId } from '../lib/ids';
import { ToastContext, ToastListContext, type Toast, type ToastApi } from './toastContext';
import styles from './Toast.module.css';

/**
 * Toasts with Undo.
 *
 * The undo window is what makes fast tapping safe: a teacher recording twenty
 * entries in a period will mis-tap, and the fix has to be one tap away. The
 * stack renders wherever the host puts <ToastStack/>, which on the live screen
 * is inside the bottom toolbar so it never covers the tiles it describes.
 */

const UNDO_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((all) => all.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = newId();
      // One at a time: a stack of five toasts during fast tapping is noise.
      setToasts([{ ...toast, id }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), UNDO_MS));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, options) =>
        push({
          message,
          tone: 'default',
          ...(options?.onUndo ? { onUndo: options.onUndo } : {}),
        }),
      showError: (message) => push({ message, tone: 'error' }),
    }),
    [push],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) window.clearTimeout(timer);
      map.clear();
    };
  }, []);

  const list = useMemo(() => ({ toasts, dismiss }), [toasts, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <ToastListContext.Provider value={list}>{children}</ToastListContext.Provider>
    </ToastContext.Provider>
  );
}

/** Renders the current toast. Place it where it should appear. */
export function ToastStack() {
  const { toasts, dismiss } = useContext(ToastListContext);

  return (
    <div className={styles.stack} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.tone === 'error' ? styles.error : ''}`}
        >
          <span>{toast.message}</span>
          {toast.onUndo ? (
            <button
              type="button"
              className={styles.undo}
              onClick={() => {
                void toast.onUndo?.();
                dismiss(toast.id);
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
