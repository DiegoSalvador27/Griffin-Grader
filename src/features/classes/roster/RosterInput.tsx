import { useRef, useState } from 'react';
import Banner from '../../../components/Banner';
import Button from '../../../components/Button';
import { SelectField, TextArea } from '../../../components/Field';
import { parsePaste } from '../../../lib/roster/parsePaste';
import { applyMapping, parseCsv, type ColumnMapping, type CsvParseResult } from '../../../lib/roster/parseCsv';
import type { NewStudent } from '../../../db/repos/students';
import RosterPreview from './RosterPreview';
import styles from './RosterInput.module.css';

type Tab = 'paste' | 'csv';

/** Paste or CSV, both ending in the same editable preview (SPEC 4.3). */
export default function RosterInput({
  students,
  onChange,
}: {
  students: NewStudent[];
  onChange: (next: NewStudent[]) => void;
}) {
  const [tab, setTab] = useState<Tab>('paste');
  const [pasteText, setPasteText] = useState('');
  const [csv, setCsv] = useState<CsvParseResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handlePaste = (text: string): void => {
    setPasteText(text);
    onChange(parsePaste(text).students);
  };

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setCsvError(null);
    try {
      const result = parseCsv(await file.text());
      setCsv(result);
      onChange(applyMapping(result.rows, result.mapping));
    } catch {
      setCsvError('That file could not be read. Try exporting it as CSV again.');
    }
  };

  const remap = (patch: Partial<ColumnMapping>): void => {
    if (!csv) return;
    const mapping = { ...csv.mapping, ...patch };
    setCsv({ ...csv, mapping });
    onChange(applyMapping(csv.rows, mapping));
  };

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="How to add students">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'paste'}
          className={styles.tab}
          onClick={() => setTab('paste')}
        >
          Paste names
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'csv'}
          className={styles.tab}
          onClick={() => setTab('csv')}
        >
          Import CSV
        </button>
      </div>

      {tab === 'paste' ? (
        <>
          <TextArea
            label="One student per line"
            hint="Bea Ruiz, or Ruiz, Bea, or paste straight from a spreadsheet"
            value={pasteText}
            onChange={(e) => handlePaste(e.target.value)}
            placeholder={'Bea Ruiz\nJosé Torres\nO’Neil, Cam'}
          />
          <p className={styles.note}>
            If the names come out backwards, use Swap first and last below.
          </p>
        </>
      ) : (
        <>
          <div className={styles.file}>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button onClick={() => fileInput.current?.click()}>Choose a CSV file</Button>
            <span className={styles.note}>
              A roster exported from PowerSchool, or any spreadsheet saved as CSV.
            </span>
          </div>

          {csvError ? <Banner tone="danger">{csvError}</Banner> : null}

          {csv && csv.problems.length > 0 ? (
            <Banner tone="warn">{csv.problems.join(' ')}</Banner>
          ) : null}

          {csv && csv.headers.length > 0 ? (
            <>
              <p className={styles.note}>
                Check these columns are right. Change any that are not.
              </p>
              <div className={styles.mapping}>
                <ColumnSelect
                  label="First name"
                  headers={csv.headers}
                  value={csv.mapping.firstName}
                  onChange={(firstName) => remap({ firstName, fullName: null })}
                />
                <ColumnSelect
                  label="Last name"
                  headers={csv.headers}
                  value={csv.mapping.lastName}
                  onChange={(lastName) => remap({ lastName, fullName: null })}
                />
                <ColumnSelect
                  label="Full name"
                  hint="if not split"
                  headers={csv.headers}
                  value={csv.mapping.fullName}
                  onChange={(fullName) =>
                    remap(
                      fullName === null
                        ? { fullName }
                        : { fullName, firstName: null, lastName: null },
                    )
                  }
                />
                <ColumnSelect
                  label="Student number"
                  headers={csv.headers}
                  value={csv.mapping.studentNumber}
                  onChange={(studentNumber) => remap({ studentNumber })}
                />
              </div>
            </>
          ) : null}
        </>
      )}

      <RosterPreview students={students} onChange={onChange} />
    </div>
  );
}

function ColumnSelect({
  label,
  hint,
  headers,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  headers: string[];
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <SelectField
      label={label}
      hint={hint}
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">Not used</option>
      {headers.map((h, i) => (
        <option key={i} value={i}>
          {h || `Column ${i + 1}`}
        </option>
      ))}
    </SelectField>
  );
}
