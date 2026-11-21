import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import { TextField } from '../../components/Field';
import RosterInput from './roster/RosterInput';
import { listRubrics } from '../../db/repos/rubrics';
import { createClass } from '../../db/repos/classes';
import { addStudents, type NewStudent } from '../../db/repos/students';
import type { ID } from '../../db/types';
import styles from './NewClassWizard.module.css';

const STEPS = ['Name and students', 'Rubric', 'Done'] as const;

export default function NewClassWizard() {
  const navigate = useNavigate();
  const rubrics = useLiveQuery(() => listRubrics(), []);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [students, setStudents] = useState<NewStudent[]>([]);
  const [rubricId, setRubricId] = useState<ID | null>(null);
  const [createdId, setCreatedId] = useState<ID | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nameOk = name.trim() !== '';
  const chosenRubric = rubricId ?? rubrics?.[0]?.id ?? null;

  const save = async (): Promise<void> => {
    if (!nameOk || chosenRubric === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const cls = await createClass({ name, rubricId: chosenRubric });
      const usable = students.filter(
        (s) => s.firstName.trim() !== '' || s.lastName.trim() !== '',
      );
      await addStudents(cls.id, usable);
      setCreatedId(cls.id);
      setStep(2);
    } catch {
      setSaveError('That class could not be saved. Nothing was changed, so try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h1 className="t-title">New class</h1>

      <ol className={styles.steps}>
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`${styles.step} ${i === step ? styles.current : ''} ${i < step ? styles.done : ''}`}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className={styles.stepNum}>{i + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className={styles.card}>
        {step === 0 ? (
          <>
            <TextField
              label="Class name"
              hint="what you call it on your timetable"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PE 10, Block 2"
              autoFocus
            />
            <div style={{ marginTop: 'var(--space-5)' }}>
              <RosterInput students={students} onChange={setStudents} />
            </div>
            <div className={styles.actions}>
              <Button onClick={() => navigate('/classes')}>Cancel</Button>
              <Button variant="gold" disabled={!nameOk} onClick={() => setStep(1)}>
                Next: rubric
              </Button>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="t-subtitle">Which rubric does this class use?</h2>
            <div className={styles.rubricList}>
              {(rubrics ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.rubricOption}
                  aria-pressed={chosenRubric === r.id}
                  onClick={() => setRubricId(r.id)}
                >
                  <span>
                    <span style={{ fontWeight: 'var(--fw-bold)' }}>{r.name}</span>
                    <span className={styles.rubricMeta}>
                      <br />
                      {r.categories.filter((c) => !c.hidden).length} categories,{' '}
                      {r.levels.length} levels
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {saveError ? <Banner tone="danger">{saveError}</Banner> : null}

            <div className={styles.actions}>
              <Button onClick={() => setStep(0)}>Back</Button>
              <Button
                variant="gold"
                disabled={chosenRubric === null || saving}
                onClick={() => void save()}
              >
                {saving ? 'Saving' : 'Create class'}
              </Button>
            </div>
          </>
        ) : null}

        {step === 2 && createdId ? (
          <div className={styles.doneBox}>
            <h2 className="t-subtitle">{name.trim()} is ready</h2>
            <p>
              {students.length} {students.length === 1 ? 'student' : 'students'} added.
            </p>
            <div className={styles.doneActions}>
              <Button onClick={() => navigate('/classes')}>Back to classes</Button>
              <Button
                variant="gold"
                size="lg"
                disabled={students.length === 0}
                onClick={() => navigate(`/live/${createdId}`)}
              >
                Start class now
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
