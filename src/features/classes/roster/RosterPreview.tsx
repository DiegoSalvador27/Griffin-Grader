import Button from '../../../components/Button';
import Banner from '../../../components/Banner';
import { findDuplicates, swapNames } from '../../../lib/roster/parsePaste';
import type { NewStudent } from '../../../db/repos/students';
import styles from './RosterPreview.module.css';

/**
 * Editable preview of a parsed roster (SPEC 4.3). Both the paste tab and the
 * CSV tab end here, so a teacher always sees exactly what is about to be saved
 * and can fix it in place.
 */
export default function RosterPreview({
  students,
  onChange,
}: {
  students: NewStudent[];
  onChange: (next: NewStudent[]) => void;
}) {
  const duplicates = new Set(findDuplicates(students));

  const isDuplicate = (s: NewStudent): boolean =>
    duplicates.has(`${s.firstName} ${s.lastName}`.trim().toLowerCase());

  const edit = (index: number, patch: Partial<NewStudent>): void => {
    onChange(students.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const remove = (index: number): void => {
    onChange(students.filter((_, i) => i !== index));
  };

  if (students.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.scroller}>
          <p className={styles.empty}>No students yet. Paste a list or pick a CSV file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.count}>
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </span>
        <Button onClick={() => onChange(swapNames(students))}>Swap first and last</Button>
      </div>

      {duplicates.size > 0 ? (
        <Banner tone="warn">
          <span>
            {duplicates.size === 1
              ? 'One name appears twice.'
              : `${duplicates.size} names appear twice.`}{' '}
            That is fine if you really have two students with the same name.
          </span>
        </Banner>
      ) : null}

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">First name</th>
              <th scope="col">Last name</th>
              <th scope="col">Number</th>
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={i} className={isDuplicate(s) ? styles.dupe : undefined}>
                <td>
                  <input
                    className={styles.cell}
                    value={s.firstName}
                    aria-label={`First name, row ${i + 1}`}
                    onChange={(e) => edit(i, { firstName: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={styles.cell}
                    value={s.lastName}
                    aria-label={`Last name, row ${i + 1}`}
                    onChange={(e) => edit(i, { lastName: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={styles.cell}
                    value={s.studentNumber ?? ''}
                    aria-label={`Student number, row ${i + 1}`}
                    onChange={(e) => edit(i, { studentNumber: e.target.value })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => remove(i)}
                    aria-label={`Remove ${s.firstName} ${s.lastName}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
