/**
 * A tiny in-memory ring of recent errors, for the debug panel.
 *
 * Nothing is sent anywhere and nothing is persisted: this exists so Diego can
 * read back what went wrong on an iPad that has no console attached.
 */
export interface LoggedError {
  at: number;
  kind: 'error' | 'unhandledrejection';
  message: string;
  source?: string;
}

const MAX = 25;
const entries: LoggedError[] = [];

export function recentErrors(): readonly LoggedError[] {
  return [...entries].reverse();
}

export function clearErrors(): void {
  entries.length = 0;
}

function push(entry: LoggedError): void {
  entries.push(entry);
  if (entries.length > MAX) entries.shift();
}

export function startErrorLog(): void {
  window.addEventListener('error', (e) => {
    push({
      at: Date.now(),
      kind: 'error',
      message: e.message || String(e.error ?? 'Unknown error'),
      ...(e.filename ? { source: `${e.filename}:${e.lineno}` } : {}),
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason: unknown = e.reason;
    push({
      at: Date.now(),
      kind: 'unhandledrejection',
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
}
