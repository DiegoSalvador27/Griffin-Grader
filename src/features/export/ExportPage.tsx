import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import SegmentedControl from '../../components/SegmentedControl';
import { useToast } from '../../components/toastContext';
import { db } from '../../db/db';
import { gatherExportBundle } from '../../db/repos/exportData';
import { buildPowerSchoolSheet } from '../../lib/export/powerschool';
import { buildFullLogSheet } from '../../lib/export/fullLog';
import { exportFilename, toCsv } from '../../lib/export/csv';
import { makeFile, shareOrDownload } from '../../lib/share';
import { addDays, startOfWeek, today } from '../../lib/dates';
import type { ID } from '../../db/types';
import styles from './ExportPage.module.css';

type RangePreset = 'today' | 'yesterday' | 'week' | 'custom';

const PRESETS: ReadonlyArray<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'custom', label: 'Custom' },
];

function rangeFor(preset: RangePreset, custom: { from: string; to: string }) {
  switch (preset) {
    case 'today':
      return { from: today(), to: today() };
    case 'yesterday':
      return { from: addDays(-1), to: addDays(-1) };
    case 'week':
      return { from: startOfWeek(), to: today() };
    case 'custom':
      return custom;
  }
}

export default function ExportPage() {
  const toast = useToast();
  const [preset, setPreset] = useState<RangePreset>('today');
  const [custom, setCustom] = useState({ from: addDays(-6), to: today() });
  const [excluded, setExcluded] = useState<Set<ID>>(new Set());

  const { from, to } = rangeFor(preset, custom);

  const allClasses = useLiveQuery(() => db.classes.toArray(), []);

  // Default is every class with data in range (SPEC 4.7); `excluded` holds the
  // ones the teacher has switched off.
  const withData = useLiveQuery(async () => {
    const sessions = await db.sessions.toArray();
    return new Set(
      sessions.filter((s) => s.date >= from && s.date <= to).map((s) => s.classId),
    );
  }, [from, to]);

  const selectedIds = useMemo(
    () => [...(withData ?? [])].filter((id) => !excluded.has(id)),
    [withData, excluded],
  );

  const bundle = useLiveQuery(
    () => gatherExportBundle(selectedIds, from, to),
    [selectedIds.join(','), from, to],
  );

  const sheet = useMemo(() => (bundle ? buildPowerSchoolSheet(bundle) : null), [bundle]);
  const log = useMemo(() => (bundle ? buildFullLogSheet(bundle) : null), [bundle]);

  /**
   * Files are built here, during render, not inside the tap handler.
   * `navigator.share()` only works while the browser is still inside the
   * user's gesture, and awaiting a build first spends that activation, after
   * which iOS Safari throws NotAllowedError.
   */
  const files = useMemo(() => {
    if (!sheet || !log) return null;
    return {
      powerschool: makeFile(
        exportFilename('powerschool', from, to),
        toCsv(sheet.headers, sheet.rows),
        'text/csv',
      ),
      log: makeFile(
        exportFilename('log', from, to),
        toCsv(log.headers, log.rows),
        'text/csv',
      ),
    };
  }, [sheet, log, from, to]);

  const send = (file: File | undefined): void => {
    if (!file) return;
    void shareOrDownload(file).then((result) => {
      if (result === 'downloaded') toast.show(`${file.name} saved`);
    });
  };

  const classNames = new Map((allClasses ?? []).map((c) => [c.id, c.name]));
  const hasRows = sheet !== null && sheet.rows.length > 0;

  return (
    <div>
      <div className={styles.head}>
        <h1 className="t-title">Export</h1>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">What to export</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.controls}>
            <SegmentedControl
              label="Date range"
              options={PRESETS}
              value={preset}
              onChange={setPreset}
            />

            {preset === 'custom' ? (
              <div className={styles.dates}>
                <label>
                  <span className="t-label">From</span>
                  <br />
                  <input
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  />
                </label>
                <label>
                  <span className="t-label">To</span>
                  <br />
                  <input
                    type="date"
                    value={custom.to}
                    min={custom.from}
                    onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  />
                </label>
              </div>
            ) : null}
          </div>

          {withData && withData.size > 0 ? (
            <div className={styles.classList}>
              {[...withData].map((id) => (
                <label key={id} className={styles.classToggle}>
                  <input
                    type="checkbox"
                    checked={!excluded.has(id)}
                    onChange={(e) =>
                      setExcluded((set) => {
                        const next = new Set(set);
                        if (e.target.checked) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                  />
                  {classNames.get(id) ?? 'Class'}
                </label>
              ))}
            </div>
          ) : null}

          <div className={styles.downloads}>
            <Button
              variant="gold"
              disabled={!hasRows || !files}
              onClick={() => send(files?.powerschool)}
            >
              Download PowerSchool sheet
            </Button>
            <Button disabled={!hasRows || !files} onClick={() => send(files?.log)}>
              Download full log
            </Button>
          </div>

          <p className={styles.hint}>
            The sheet below is the same thing the file contains, so you can type
            straight into PowerSchool from here without opening the file.
          </p>
        </div>
      </section>

      {!hasRows ? (
        <Banner tone="info">
          Nothing was recorded in that range. Try a different date.
        </Banner>
      ) : (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className="t-subtitle">PowerSchool sheet</h2>
            <span className="t-label">
              {sheet.rows.length} {sheet.rows.length === 1 ? 'student' : 'students'}
            </span>
          </div>
          <div className={styles.scroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {sheet.headers.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className={j === 4 ? styles.num : undefined}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
