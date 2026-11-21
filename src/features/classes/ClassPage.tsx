import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import LevelChip from '../../components/LevelChip';
import { SelectField, TextField } from '../../components/Field';
import RosterInput from './roster/RosterInput';
import { useClassDetail } from './useClassDetail';
import { listRubrics, visibleCategories } from '../../db/repos/rubrics';
import { deleteClassForever, setArchived, updateClass } from '../../db/repos/classes';
// Editing a student's name and number lives on the student page, reached by
// tapping their name, so the roster table stays scannable.
import {
  addStudents,
  deactivateStudent,
  restoreStudent,
  type NewStudent,
} from '../../db/repos/students';
import type { GridOrder } from '../../db/types';
import styles from './ClassPage.module.css';

export default function ClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const detail = useClassDetail(classId);
  const rubrics = useLiveQuery(() => listRubrics(), []);

  const [adding, setAdding] = useState<NewStudent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteAck, setDeleteAck] = useState(false);

  if (detail === undefined) return null;
  if (detail === null) {
    return (
      <Banner tone="danger">
        That class no longer exists. <Link to="/classes">Back to classes</Link>
      </Banner>
    );
  }

  const { cls, rubric, rows, inactive, sessionCount } = detail;
  const categories = rubric ? visibleCategories(rubric) : [];

  const saveAdded = async (): Promise<void> => {
    const usable = adding.filter(
      (s) => s.firstName.trim() !== '' || s.lastName.trim() !== '',
    );
    await addStudents(cls.id, usable);
    setAdding([]);
    setShowAdd(false);
  };

  return (
    <div>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <h1 className="t-title">{cls.name}</h1>
          <p className={styles.meta}>
            {rows.length} students, {sessionCount}{' '}
            {sessionCount === 1 ? 'class' : 'classes'} so far, rubric:{' '}
            {rubric?.name ?? 'none'}
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/classes')}>Back</Button>
          <Button
            variant="gold"
            disabled={rows.length === 0}
            onClick={() => navigate(`/live/${cls.id}`)}
          >
            Start class
          </Button>
        </div>
      </div>

      {/* Roster */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">Students</h2>
          <Button onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Cancel' : 'Add students'}
          </Button>
        </div>

        {showAdd ? (
          <div className={styles.cardBody}>
            <RosterInput students={adding} onChange={setAdding} />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button
                variant="gold"
                disabled={adding.length === 0}
                onClick={() => void saveAdded()}
              >
                Add {adding.length} {adding.length === 1 ? 'student' : 'students'}
              </Button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className={styles.cardBody}>
            <p className={styles.muted}>No students yet. Use Add students above.</p>
          </div>
        ) : (
          <div className={styles.scroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Number</th>
                  <th scope="col">P / L / A</th>
                  <th scope="col">Entries</th>
                  {categories.map((c) => (
                    <th key={c.id} scope="col">
                      {c.name}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student.id}>
                    <td className={styles.nameCell}>
                      <Link
                        className={styles.nameLink}
                        to={`/classes/${cls.id}/students/${row.student.id}`}
                      >
                        {row.student.lastName}, {row.student.firstName}
                      </Link>
                    </td>
                    <td className={styles.num}>{row.student.studentNumber ?? '—'}</td>
                    <td className={styles.num}>
                      {row.present} / {row.late} / {row.absent}
                    </td>
                    <td className={styles.num}>{row.entries}</td>
                    {categories.map((c) => {
                      const code = row.latestByCategory.get(c.name);
                      return (
                        <td key={c.id}>
                          {code ? <LevelChip code={code} /> : <span className={styles.muted}>—</span>}
                        </td>
                      );
                    })}
                    <td>
                      <Button
                        variant="quiet"
                        onClick={() => void deactivateStudent(row.student.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Removed students */}
      {inactive.length > 0 ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className="t-subtitle">Removed students</h2>
            <span className={styles.muted}>Their entries are kept.</span>
          </div>
          <div className={styles.scroller}>
            <table className={styles.table}>
              <tbody>
                {inactive.map((s) => (
                  <tr key={s.id} className={styles.inactiveRow}>
                    <td className={styles.nameCell}>
                      {s.lastName}, {s.firstName}
                    </td>
                    <td>
                      <Button variant="quiet" onClick={() => void restoreStudent(s.id)}>
                        Put back
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Class settings */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">Class settings</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.row}>
            <div className={styles.grow}>
              <TextField
                label="Class name"
                defaultValue={cls.name}
                onBlur={(e) => void updateClass(cls.id, { name: e.target.value })}
              />
            </div>
            <div className={styles.grow}>
              <SelectField
                label="Tile order"
                hint="how students are arranged on the live screen"
                value={cls.gridOrder}
                onChange={(e) =>
                  void updateClass(cls.id, { gridOrder: e.target.value as GridOrder })
                }
              >
                <option value="first">First name A to Z</option>
                <option value="last">Last name A to Z</option>
                <option value="custom">Custom</option>
              </SelectField>
            </div>
            <div className={styles.grow}>
              <SelectField
                label="Rubric"
                hint="old entries keep the names they were saved with"
                value={cls.rubricId}
                onChange={(e) => void updateClass(cls.id, { rubricId: e.target.value })}
              >
                {(rubrics ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button onClick={() => void setArchived(cls.id, !cls.archived)}>
              {cls.archived ? 'Unarchive this class' : 'Archive this class'}
            </Button>
          </div>
        </div>
      </section>

      {/* Delete */}
      <section className={`${styles.card} ${styles.danger}`}>
        <div className={styles.dangerBody}>
          <h2 className="t-subtitle">Delete this class</h2>
          <p>
            This removes {cls.name}, its {rows.length + inactive.length} students and
            every entry and attendance record for them. It cannot be undone. Download a
            backup first.
          </p>

          {!confirmDelete ? (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Delete this class
            </Button>
          ) : (
            <>
              <label style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <input
                  type="checkbox"
                  checked={deleteAck}
                  onChange={(e) => setDeleteAck(e.target.checked)}
                />
                <span>I understand this cannot be undone.</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button onClick={() => { setConfirmDelete(false); setDeleteAck(false); }}>
                  Keep this class
                </Button>
                <Button
                  variant="danger"
                  disabled={!deleteAck}
                  onClick={async () => {
                    await deleteClassForever(cls.id);
                    navigate('/classes');
                  }}
                >
                  Delete {cls.name} forever
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
