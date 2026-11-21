import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Sheet from '../../components/Sheet';
import SegmentedControl from '../../components/SegmentedControl';
import Button from '../../components/Button';
import LevelChip from '../../components/LevelChip';
import { useToast } from '../../components/toastContext';
import { setStatus } from '../../db/repos/attendance';
import {
  assessmentsForStudentInSession,
  deleteAssessment,
  recordAssessment,
  restoreAssessment,
  setComment,
} from '../../db/repos/assessments';
import { formatTime } from '../../lib/dates';
import type {
  Assessment,
  AttendanceStatus,
  ID,
  Level,
  QuickComment,
  RubricCategory,
  Student,
} from '../../db/types';
import styles from './StudentSheet.module.css';

const COMMENT_DEBOUNCE_MS = 600;

interface Props {
  student: Student;
  sessionId: ID;
  classId: ID;
  status: AttendanceStatus;
  categories: RubricCategory[];
  levels: Level[];
  quickComments: QuickComment[];
  onClose: () => void;
}

export default function StudentSheet({
  student,
  sessionId,
  classId,
  status,
  categories,
  levels,
  quickComments,
  onClose,
}: Props) {
  const toast = useToast();
  const entries = useLiveQuery(
    () => assessmentsForStudentInSession(sessionId, student.id),
    [sessionId, student.id],
  );

  /** The entry whose comment field is open, set by the tap that created it. */
  const [commentingOn, setCommentingOn] = useState<Assessment | null>(null);

  const latestByCategory = new Map<ID, Assessment>();
  const countByCategory = new Map<ID, number>();
  for (const entry of [...(entries ?? [])].reverse()) {
    latestByCategory.set(entry.categoryId, entry);
    countByCategory.set(entry.categoryId, (countByCategory.get(entry.categoryId) ?? 0) + 1);
  }

  const grade = async (category: RubricCategory, level: Level): Promise<void> => {
    try {
      const { assessment, markedPresent } = await recordAssessment({
        sessionId,
        classId,
        studentId: student.id,
        category,
        level,
      });

      setCommentingOn(assessment);

      const undo = async (): Promise<void> => {
        await deleteAssessment(assessment.id);
        setCommentingOn((c) => (c?.id === assessment.id ? null : c));
      };

      toast.show(
        markedPresent
          ? `${level.code} saved. ${student.firstName} marked present.`
          : `${category.name} ${level.code} saved`,
        { onUndo: undo },
      );
    } catch {
      // SPEC section 7: never pretend a write landed.
      toast.showError('That did not save. Try again.');
    }
  };

  const removeEntry = async (entry: Assessment): Promise<void> => {
    try {
      await deleteAssessment(entry.id);
      setCommentingOn((c) => (c?.id === entry.id ? null : c));
      toast.show(`${entry.categoryName} ${entry.levelCode} deleted`, {
        // Restored with its original id so Undo is exact, not a lookalike.
        onUndo: () => restoreAssessment(entry),
      });
    } catch {
      toast.showError('That could not be deleted. Try again.');
    }
  };

  return (
    <Sheet
      title={`${student.firstName} ${student.lastName}`}
      onClose={onClose}
      headerExtra={
        <>
          <div>
            <p className={styles.title}>
              {student.firstName} {student.lastName}
            </p>
            <p className={styles.sub}>
              {entries?.length ?? 0} {entries?.length === 1 ? 'entry' : 'entries'} today
            </p>
          </div>
          <SegmentedControl
            label="Attendance"
            value={status}
            options={[
              { value: 'absent', label: 'Absent' },
              { value: 'present', label: 'Present' },
              { value: 'late', label: 'Late' },
            ]}
            onChange={(next) => void setStatus(sessionId, student.id, next)}
          />
        </>
      }
    >
      {categories.map((category) => {
        const latest = latestByCategory.get(category.id);
        const count = countByCategory.get(category.id) ?? 0;

        return (
          <section key={category.id} className={styles.category}>
            <div className={styles.categoryHead}>
              <h3 className={styles.categoryName}>{category.name}</h3>
              {category.description ? (
                <p className={styles.categoryDesc}>{category.description}</p>
              ) : null}
            </div>

            <div className={styles.levels}>
              {levels.map((level) => {
                const selected = latest?.levelId === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    className={`${styles.level} ${styles[level.code] ?? styles.other}`}
                    aria-pressed={selected}
                    aria-label={`${category.name}: ${level.label}`}
                    onClick={() => void grade(category, level)}
                  >
                    {level.code}
                    {selected && count > 1 ? (
                      <span className={styles.repeat}>x{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {commentingOn?.categoryId === category.id ? (
              <CommentBox
                key={commentingOn.id}
                assessment={commentingOn}
                quickComments={quickComments}
              />
            ) : null}
          </section>
        );
      })}

      <section className={styles.today}>
        <h3 className={`t-stencil ${styles.todayTitle}`}>Today</h3>
        {entries && entries.length > 0 ? (
          <ul className={styles.entries}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.entry}>
                <span className={styles.time}>{formatTime(entry.createdAt)}</span>
                <span className={styles.entryCat}>{entry.categoryName}</span>
                <LevelChip code={entry.levelCode} />
                <span className={styles.entryComment}>
                  {entry.comment === '' ? 'No comment' : entry.comment}
                </span>
                <Button variant="quiet" onClick={() => setCommentingOn(entry)}>
                  Comment
                </Button>
                <Button variant="quiet" onClick={() => void removeEntry(entry)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing recorded for {student.firstName} yet.</p>
        )}
      </section>
    </Sheet>
  );
}

/** Autosaves on a debounce and on blur (SPEC 4.5). */
function CommentBox({
  assessment,
  quickComments,
}: {
  assessment: Assessment;
  quickComments: QuickComment[];
}) {
  const [value, setValue] = useState(assessment.comment);
  const timer = useRef<number | null>(null);

  const save = (next: string): void => {
    void setComment(assessment.id, next);
  };

  const queueSave = (next: string): void => {
    setValue(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(next), COMMENT_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={styles.commentBox}>
      <input
        className={styles.commentInput}
        value={value}
        placeholder="Add a comment"
        aria-label={`Comment on ${assessment.categoryName} ${assessment.levelCode}`}
        onChange={(e) => queueSave(e.target.value)}
        onBlur={(e) => {
          if (timer.current !== null) window.clearTimeout(timer.current);
          save(e.target.value);
        }}
      />
      <div className={styles.chips}>
        {quickComments.map((qc) => (
          <button
            key={qc.id}
            type="button"
            className={styles.chip}
            onClick={() => {
              const next = value.trim() === '' ? qc.text : `${value.trim()} ${qc.text}`;
              setValue(next);
              save(next);
            }}
          >
            {qc.text}
          </button>
        ))}
      </div>
    </div>
  );
}
