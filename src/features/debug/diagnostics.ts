import { db, TABLE_NAMES } from '../../db/db';
import { isInstalled, storageIsPersisted } from '../../db/repos/settings';
import { recentErrors, type LoggedError } from '../../lib/errorLog';

/**
 * Everything the debug panel reports.
 *
 * All of it is read from this device, nothing is sent anywhere, and no student
 * names appear: only counts. A screenshot of this panel is safe to share.
 */
export interface Diagnostics {
  app: { version: string; builtAt: string; baseUrl: string; href: string };
  device: {
    installed: boolean;
    displayMode: string;
    standalone: boolean;
    userAgent: string;
    online: boolean;
  };
  viewport: {
    inner: string;
    screen: string;
    dpr: number;
    /** The numbers behind the bottom bevel question. */
    safeArea: { top: number; right: number; bottom: number; left: number };
    visualViewport: string;
  };
  storage: { persisted: boolean; usageMb: string; quotaMb: string };
  serviceWorker: {
    supported: boolean;
    registrations: number;
    scope: string;
    waiting: boolean;
  };
  counts: Record<string, number>;
  errors: readonly LoggedError[];
}

export const APP_VERSION = '1.0.0';

/** Reads env(safe-area-inset-*) by letting the browser resolve it on a probe. */
function readSafeArea(): Diagnostics['viewport']['safeArea'] {
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'top:0',
    'left:0',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';');
  document.body.appendChild(probe);
  const s = getComputedStyle(probe);
  const n = (v: string): number => Math.round(parseFloat(v) || 0);
  const out = {
    top: n(s.paddingTop),
    right: n(s.paddingRight),
    bottom: n(s.paddingBottom),
    left: n(s.paddingLeft),
  };
  probe.remove();
  return out;
}

export async function collectDiagnostics(): Promise<Diagnostics> {
  const counts: Record<string, number> = {};
  for (const table of TABLE_NAMES) {
    counts[table] = await db.table(table).count();
  }

  let usage = 0;
  let quota = 0;
  try {
    const estimate = await navigator.storage?.estimate?.();
    usage = estimate?.usage ?? 0;
    quota = estimate?.quota ?? 0;
  } catch {
    // Not available everywhere; zeros are a fine answer.
  }

  const regs =
    'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistrations().catch(() => [])
      : [];

  const mb = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

  const displayMode =
    (() => {
      try {
        return (
          ['standalone', 'fullscreen', 'minimal-ui', 'browser'].find(
            (m) => window.matchMedia?.(`(display-mode: ${m})`).matches,
          ) ?? 'unknown'
        );
      } catch {
        return 'unknown';
      }
    })();

  return {
    app: {
      version: APP_VERSION,
      builtAt: __BUILD_TIME__,
      baseUrl: import.meta.env.BASE_URL,
      href: window.location.href,
    },
    device: {
      installed: isInstalled(),
      displayMode,
      standalone: (navigator as { standalone?: boolean }).standalone === true,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
    },
    viewport: {
      inner: `${window.innerWidth} x ${window.innerHeight}`,
      screen: `${window.screen.width} x ${window.screen.height}`,
      dpr: window.devicePixelRatio,
      safeArea: readSafeArea(),
      visualViewport: window.visualViewport
        ? `${Math.round(window.visualViewport.width)} x ${Math.round(
            window.visualViewport.height,
          )} at scale ${window.visualViewport.scale.toFixed(2)}`
        : 'not available',
    },
    storage: {
      persisted: await storageIsPersisted(),
      usageMb: mb(usage),
      quotaMb: mb(quota),
    },
    serviceWorker: {
      supported: 'serviceWorker' in navigator,
      registrations: regs.length,
      scope: regs[0]?.scope ?? 'none',
      waiting: regs.some((r) => r.waiting !== null),
    },
    counts,
    errors: recentErrors(),
  };
}

/** A plain-text dump, for pasting into a message. */
export function formatDiagnostics(d: Diagnostics): string {
  return [
    `Griffin Grader ${d.app.version} (built ${d.app.builtAt})`,
    `url            ${d.app.href}`,
    `base           ${d.app.baseUrl}`,
    '',
    `installed      ${d.device.installed} (display-mode ${d.device.displayMode}, navigator.standalone ${d.device.standalone})`,
    `online         ${d.device.online}`,
    `viewport       ${d.viewport.inner}, screen ${d.viewport.screen}, dpr ${d.viewport.dpr}`,
    `visual vp      ${d.viewport.visualViewport}`,
    `safe area      top ${d.viewport.safeArea.top} right ${d.viewport.safeArea.right} bottom ${d.viewport.safeArea.bottom} left ${d.viewport.safeArea.left}`,
    '',
    `storage        persisted ${d.storage.persisted}, using ${d.storage.usageMb} MB of ${d.storage.quotaMb} MB`,
    `service worker ${d.serviceWorker.registrations} registration(s), waiting update ${d.serviceWorker.waiting}`,
    `               scope ${d.serviceWorker.scope}`,
    '',
    'database',
    ...Object.entries(d.counts).map(([k, v]) => `  ${k.padEnd(14)} ${v}`),
    '',
    `recent errors  ${d.errors.length}`,
    ...d.errors.map(
      (e) =>
        `  [${new Date(e.at).toLocaleTimeString()}] ${e.kind}: ${e.message}${
          e.source ? ` (${e.source})` : ''
        }`,
    ),
    '',
    `user agent     ${d.device.userAgent}`,
  ].join('\n');
}
