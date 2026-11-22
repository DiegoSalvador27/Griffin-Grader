import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet';
import Button from '../../components/Button';
import { useToast } from '../../components/toastContext';
import { clearErrors } from '../../lib/errorLog';
import { seedIfEmpty } from '../../db/seed';
import { collectDiagnostics, formatDiagnostics, type Diagnostics } from './diagnostics';
import styles from './DebugPanel.module.css';

/**
 * Hidden diagnostics, reached by tapping the footer watermark five times.
 *
 * Exists because an iPad has no console attached: when something looks wrong
 * in a gym, this is the only way to see which build is running, whether the
 * app is really installed, what the safe-area insets are, and what errors have
 * been thrown. Everything shown is read from this device and nothing leaves it.
 */
export default function DebugPanel({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<Diagnostics | null>(null);
  const [showDump, setShowDump] = useState(false);

  const refresh = (): void => {
    void collectDiagnostics().then(setData);
  };

  useEffect(refresh, []);

  const yn = (v: boolean) => (
    <span className={v ? styles.good : styles.bad}>{v ? 'yes' : 'no'}</span>
  );

  return (
    <Sheet
      title="Debug"
      onClose={onClose}
      headerExtra={
        <div>
          <p className="t-subtitle">Debug</p>
          <p className="t-label">Read from this iPad. Nothing is sent anywhere.</p>
        </div>
      }
    >
      <div className={styles.body}>
        {!data ? (
          <p className="t-label">Collecting…</p>
        ) : (
          <>
            <section className={styles.section}>
              <h3 className={`t-stencil ${styles.sectionTitle}`}>Build</h3>
              <dl className={styles.rows}>
                <dt>Version</dt>
                <dd>{data.app.version}</dd>
                <dt>Built</dt>
                <dd>{data.app.builtAt}</dd>
                <dt>Base</dt>
                <dd>{data.app.baseUrl}</dd>
                <dt>URL</dt>
                <dd>{data.app.href}</dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h3 className={`t-stencil ${styles.sectionTitle}`}>This device</h3>
              <dl className={styles.rows}>
                <dt>Installed</dt>
                <dd>{yn(data.device.installed)}</dd>
                <dt>Display mode</dt>
                <dd>{data.device.displayMode}</dd>
                <dt>Online</dt>
                <dd>{yn(data.device.online)}</dd>
                <dt>Viewport</dt>
                <dd>{data.viewport.inner}</dd>
                <dt>Screen</dt>
                <dd>
                  {data.viewport.screen} at {data.viewport.dpr}x
                </dd>
                <dt>Visual viewport</dt>
                <dd>{data.viewport.visualViewport}</dd>
                <dt>Safe area</dt>
                <dd>
                  top {data.viewport.safeArea.top}, right {data.viewport.safeArea.right},
                  bottom {data.viewport.safeArea.bottom}, left {data.viewport.safeArea.left}
                </dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h3 className={`t-stencil ${styles.sectionTitle}`}>Storage and updates</h3>
              <dl className={styles.rows}>
                <dt>Marked keep</dt>
                <dd>{yn(data.storage.persisted)}</dd>
                <dt>Using</dt>
                <dd>
                  {data.storage.usageMb} MB of {data.storage.quotaMb} MB
                </dd>
                <dt>Service worker</dt>
                <dd>{data.serviceWorker.registrations} registration(s)</dd>
                <dt>Update waiting</dt>
                <dd>{yn(data.serviceWorker.waiting)}</dd>
                <dt>Scope</dt>
                <dd>{data.serviceWorker.scope}</dd>
              </dl>
            </section>

            <section className={styles.section}>
              <h3 className={`t-stencil ${styles.sectionTitle}`}>Database</h3>
              <div className={styles.counts}>
                {Object.entries(data.counts).map(([table, n]) => (
                  <div key={table} className={styles.count}>
                    <b>{n}</b>
                    {table}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={`t-stencil ${styles.sectionTitle}`}>
                Recent errors ({data.errors.length})
              </h3>
              {data.errors.length === 0 ? (
                <p className="t-label">Nothing has gone wrong since this app opened.</p>
              ) : (
                <ul className={styles.errors}>
                  {data.errors.map((e, i) => (
                    <li key={i} className={styles.error}>
                      [{new Date(e.at).toLocaleTimeString()}] {e.kind}: {e.message}
                      {e.source ? ` (${e.source})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {showDump ? (
              <section className={styles.section}>
                <h3 className={`t-stencil ${styles.sectionTitle}`}>
                  Copy this into a message
                </h3>
                <textarea
                  className={styles.dump}
                  readOnly
                  value={formatDiagnostics(data)}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Diagnostics text"
                />
              </section>
            ) : null}

            <div className={styles.actions}>
              <Button onClick={refresh}>Refresh</Button>
              <Button onClick={() => setShowDump((v) => !v)}>
                {showDump ? 'Hide text' : 'Show as text'}
              </Button>
              <Button
                onClick={() => {
                  clearErrors();
                  refresh();
                  toast.show('Error list cleared');
                }}
              >
                Clear errors
              </Button>
              <Button
                onClick={async () => {
                  await seedIfEmpty();
                  refresh();
                  toast.show('Missing defaults restored');
                }}
              >
                Restore missing defaults
              </Button>
              <Button
                variant="gold"
                onClick={() => {
                  // Bypasses the service worker so the newest build is fetched.
                  window.location.reload();
                }}
              >
                Reload app
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
