import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import LevelChip from '../../components/LevelChip';
import { TextField } from '../../components/Field';
import { db } from '../../db/db';
import { updateStudent } from '../../db/repos/students';
import { changeLevel, deleteAssessment, setComment } from '../../db/repos/assessments';
import { orderedLevels } from '../../db/repos/rubrics';
import { formatDateShort, formatTime, localDateString } from '../../lib/dates';
import type { Assessment, ID, Level, Session, Student } from '../../db/types';
import styles from './StudentPage.module.css';

interface Detail {
  student: Student;
  className: string;
  entries: Assessment[];
  sessionsById: Map<ID, Session>;
  levels: Level[];
  present: number;
  late: number;
  absent: number;
}

function useStudentDetail(studentId: ID | undefined) {
  return useLiveQuery(async (): Promise<Detail | null> => {
    if (!studentId) return null;

    const student = await db.students.get(studentId);
    if (!student) return null;

    const [cls, entries, sessions] = await Promise.all([
      db.classes.get(student.classId),
      db.assessments.where('studentId').equals(studentId).toArray(),
      db.sessions.where('classId').equals(student.classId).toArray(),
    ]);

    const rubric = cls ? await db.rubrics.get(cls.rubricId) : undefined;
    const attendance = await db.attendance.where('studentId').equals(studentId).toArray();

    const present = attendance.filter((a) => a.status === 'present').length;
    const late = attendance.filter((a) => a.status === 'late').length;

    return {
      student,
      className: cls?.name ?? 'Unknown class',
      entries: entries.sort((a, b) => b.createdAt - a.createdAt),
      sessionsById: new Map(sessions.map((s) => [s.id, s])),
      levels: rubric ? orderedLevels(rubric) : [],
      present,
      late,
      absent: sessions.length - present - late,
    };
  }, [studentId]);
}

export default function StudentPage() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const navigate = useNavigate();
  const detail = useStudentDetail(studentId);

  if (detail === undefined) return null;
  if (detail === null) {
    return (
      <Banner tone="danger">
        That student no longer exists. <Link to="/classes">Back to classes</Link>
      </Banner>
    );
  }

  const { student, className, entries, sessionsById, levels } = detail;

  return (
    <div>
      <div className={styles.head}>
        <div>
          <h1 className="t-title">
            {student.firstName} {student.lastName}
          </h1>
          <p className="t-label">{className}</p>
        </div>
        <Button onClick={() => navigate(`/classes/${classId}`)}>Back to class</Button>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">Details</h2>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.row}>
            <div className={styles.grow}>
              <TextField
                label="First name"
                defaultValue={student.firstName}
                onBlur={(e) => void updateStudent(student.id, { firstName: e.target.value })}
              />
            </div>
            <div className={styles.grow}>
              <TextField
                label="Last name"
                defaultValue={student.lastName}
                onBlur={(e) => void updateStudent(student.id, { lastName: e.target.value })}
              />
            </div>
            <div className={styles.grow}>
              <TextField
                label="Student number"
                defaultValue={student.studentNumber ?? ''}
                onBlur={(e) =>
                  void updateStudent(student.id, { studentNumber: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">Attendance</h2>
        </div>
        <div className={styles.attendance}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{detail.present}</span>
            <span className={`t-stencil ${styles.statLabel}`}>Present</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{detail.late}</span>
            <span className={`t-stencil ${styles.statLabel}`}>Late</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{detail.absent}</span>
            <span className={`t-stencil ${styles.statLabel}`}>Absent</span>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-subtitle">Entries</h2>
          <span className="t-label">{entries.length} total, newest first</span>
        </div>

        {entries.length === 0 ? (
          <p className={styles.empty}>Nothing recorded for this student yet.</p>
        ) : (
          <ul className={styles.entries}>
            {entries.map((entry) => {
              const session = sessionsById.get(entry.sessionId);
              const date = session?.date ?? localDateString(new Date(entry.createdAt));
              return (
                <li key={entry.id} className={styles.entry}>
                  <span className={styles.when}>
                    {formatDateShort(date)} {formatTime(entry.createdAt)}
                  </span>
                  <span className={styles.category}>{entry.categoryName}</span>
                  <LevelChip code={entry.levelCode} />

                  {levels.length > 0 ? (
                    <select
                      className={styles.levelPicker}
                      aria-label={`Level for ${entry.categoryName} on ${formatDateShort(date)}`}
                      value={entry.levelId}
                      onChange={(e) => {
                        const level = levels.find((l) => l.id === e.target.value);
                        if (level) void changeLevel(entry.id, level);
                      }}
                    >
                      {/* A level deleted from the rubric still has to show. */}
                      {levels.some((l) => l.id === entry.levelId) ? null : (
                        <option value={entry.levelId}>{entry.levelCode} (removed)</option>
                      )}
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <input
                    className={styles.commentInput}
                    defaultValue={entry.comment}
                    placeholder="Add a comment"
                    aria-label={`Comment for ${entry.categoryName} on ${formatDateShort(date)}`}
                    onBlur={(e) => void setComment(entry.id, e.target.value)}
                  />

                  <span className={styles.entryActions}>
                    <Button
                      variant="quiet"
                      onClick={() => void deleteAssessment(entry.id)}
                      aria-label={`Delete ${entry.categoryName} entry from ${formatDateShort(date)}`}
                    >
                      Delete
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
