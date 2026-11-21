import { createContext, useContext } from 'react';

/** Contexts and the hook live apart from the components so Fast Refresh can
    still hot-swap Toast.tsx during development. */

export interface Toast {
  id: string;
  message: string;
  tone: 'default' | 'error';
  onUndo?: () => void | Promise<void>;
}

export interface ToastApi {
  show: (message: string, options?: { onUndo?: () => void | Promise<void> }) => void;
  showError: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export const ToastListContext = createContext<{
  toasts: Toast[];
  dismiss: (id: string) => void;
}>({ toasts: [], dismiss: () => {} });

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside a ToastProvider');
  return api;
}
