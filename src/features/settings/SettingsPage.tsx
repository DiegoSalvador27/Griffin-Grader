import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import { TextField } from '../../components/Field';
import { useToast } from '../../components/toastContext';
import {
  backupIsStale,
  getSettings,
  isInstalled,
  storageIsPersisted,
  updateSettings,
} from '../../db/repos/settings';
import {
  backupFilename,
  countsOf,
  eraseEverything,
  exportBackup,
  markBackedUp,
  parseBackup,
  restoreBackup,
  type BackupCounts,
  type BackupFile,
} from '../../db/repos/backup';
import { makeFile, shareOrDownload } from '../../lib/share';
import { formatDateShort, localDateString } from '../../lib/dates';
import styles from './SettingsPage.module.css';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const toast = useToast();
  const settings = useLiveQuery(() => getSettings(), []);
  const [installed] = useState(isInstalled);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  const [pending, setPending] = useState<{ file: BackupFile; counts: BackupCounts } | null>(
    null,
  );
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [eraseText, setEraseText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storageIsPersisted().then(setPersisted);
  }, []);

  if (!settings) return null;

  const downloadBackup = async (): Promise<void> => {
    try {
      const backup = await exportBackup();
      const file = makeFile(
        backupFilename(settings.teacherName, localDateString()),
        JSON.stringify(backup),
        'application/json',
      );
      const result = await shareOrDownload(file);
      if (result !== 'cancelled') {
        await markBackedUp();
        toast.show('Backup saved');
      }
    } catch {
      toast.showError('That backup could not be made. Nothing was changed.');
    }
  };

  const pickRestore = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setRestoreError(null);
    try {
      const parsed = parseBackup(JSON.parse(await file.text()));
      setPending({ file: parsed, counts: countsOf(parsed.data) });
    } catch (error) {
      setPending(null);
      setRestoreError(
        error instanceof Error ? error.message : 'That file could not be read.',
      );
    }
  };

  const confirmRestore = async (): Promise<void> => {
    if (!pending) return;
    try {
      await restoreBackup(pending.file);
      setPending(null);
      toast.show('Backup restored');
    } catch {
      toast.showError('That restore did not finish. Your data was left alone.');
    }
  };

  const stale = backupIsStale(settings);

  return (
    <div>
      <h1 className="t-title" style={{ marginBottom: 'var(--space-5)' }}>
        Settings
      </h1>

      <section className={styles.card}>
        <div className={styles.head}>
          <h2 className="t-subtitle">You</h2>
        </div>
        <div className={styles.body}>
          <TextField
            label="Your name"
            hint="optional, used in backup filenames"
            defaultValue={settings.teacherName ?? ''}
            onBlur={(e) => void updateSettings({ teacherName: e.target.value })}
          />
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.flagUnassessed}
              onChange={(e) => void updateSettings({ flagUnassessed: e.target.checked })}
            />
            <span>
              Ring students I have not graded yet
              <br />
              <span className={styles.note}>
                A blue outline on anyone who is here but has no entry this class.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <h2 className="t-subtitle">Backup</h2>
        </div>
        <div className={styles.body}>
          {stale ? (
            <Banner tone="warn">
              <span>
                {settings.lastBackupAt === undefined
                  ? 'You have never made a backup.'
                  : `Last backup: ${formatDateShort(localDateString(new Date(settings.lastBackupAt)))}.`}{' '}
                A backup is the only copy of this data that is not on this iPad.
              </span>
            </Banner>
          ) : (
            // Not stale implies lastBackupAt exists, so there is no clock read
            // here: calling Date.now() during render is impure.
            <p className={styles.note}>
              Last backup:{' '}
              {formatDateShort(localDateString(new Date(settings.lastBackupAt ?? 0)))}.
            </p>
          )}

          <div className={styles.actions}>
            <Button variant="gold" onClick={() => void downloadBackup()}>
              Download backup
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => void pickRestore(e.target.files?.[0])}
            />
            <Button onClick={() => fileInput.current?.click()}>Restore a backup</Button>
          </div>

          {restoreError ? <Banner tone="danger">{restoreError}</Banner> : null}

          {pending ? (
            <Banner tone="warn">
              <span>
                That backup holds {pending.counts.classes} classes,{' '}
                {pending.counts.students} students and {pending.counts.assessments} entries.
                Restoring replaces everything currently on this iPad.
              </span>
              <span className={styles.actions}>
                <Button onClick={() => setPending(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => void confirmRestore()}>
                  Replace everything
                </Button>
              </span>
            </Banner>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <h2 className="t-subtitle">This iPad</h2>
        </div>
        <div className={styles.body}>
          <dl className={styles.status}>
            <dt>Installed to Home Screen</dt>
            <dd className={installed ? styles.ok : styles.warn}>
              {installed ? 'Yes' : 'No'}
            </dd>
            <dt>Storage marked as keep</dt>
            <dd>{persisted === null ? 'Checking' : persisted ? 'Yes' : 'Not granted'}</dd>
          </dl>

          {!installed ? (
            <>
              <p className={styles.note}>
                Open Griffin Grader from the Home Screen, not a Safari tab. iPadOS can
                clear what a plain tab stores if the site goes unused, and a Home Screen
                app keeps it.
              </p>
              <ol className={styles.steps}>
                <li>Tap the Share button in Safari.</li>
                <li>Tap Add to Home Screen.</li>
                <li>Open Griffin Grader from the Home Screen from now on.</li>
              </ol>
            </>
          ) : null}

          <p className={styles.note}>
            Either way, download a backup every week. Deleting the app from the Home
            Screen deletes its data with it.
          </p>
        </div>
      </section>

      <section className={`${styles.card} ${styles.danger}`}>
        <div className={styles.head}>
          <h2 className="t-subtitle">Erase everything</h2>
        </div>
        <div className={styles.body}>
          <p className={styles.note}>
            Removes every class, student, entry and rubric from this iPad. It cannot be
            undone. Download a backup first.
          </p>
          <TextField
            label="Type ERASE to confirm"
            value={eraseText}
            onChange={(e) => setEraseText(e.target.value)}
            className={styles.eraseInput}
          />
          <Button
            variant="danger"
            disabled={eraseText.trim().toUpperCase() !== 'ERASE'}
            onClick={async () => {
              await eraseEverything();
              setEraseText('');
              toast.show('Everything erased');
            }}
          >
            Erase everything
          </Button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.head}>
          <h2 className="t-subtitle">About</h2>
        </div>
        <div className={styles.body}>
          <p className={styles.about}>
            Griffin Grader {APP_VERSION} by Diego D.
            <br />
            Everything you record stays on this iPad. Nothing is ever sent anywhere.
          </p>
        </div>
      </section>
    </div>
  );
}
