import { initials } from '../../lib/names';
import { moveStudent } from '../../db/repos/teams';
import type { AttendanceStatus, ID, Student, TeamSet } from '../../db/types';
import styles from './TeamsView.module.css';

interface Props {
  teamSet: TeamSet;
  students: Student[];
  labels: Map<ID, string>;
  statuses: Map<ID, AttendanceStatus>;
  counts: Map<ID, number>;
  flagUnassessed: boolean;
  /** Set when the teacher is moving someone rather than grading. */
  moving: boolean;
  picked: ID | null;
  onPick: (studentId: ID | null) => void;
  onOpenStudent: (student: Student) => void;
}

export default function TeamsView({
  teamSet,
  students,
  labels,
  statuses,
  counts,
  flagUnassessed,
  moving,
  picked,
  onPick,
  onOpenStudent,
}: Props) {
  const byId = new Map(students.map((s) => [s.id, s]));

  const place = (teamIndex: number): void => {
    if (picked === null) return;
    void moveStudent(teamSet.id, picked, teamIndex);
    onPick(null);
  };

  if (teamSet.teams.length === 0) {
    return <p className={styles.empty}>No teams yet. Use the Teams button to make some.</p>;
  }

  return (
    <div className={styles.columns}>
      {teamSet.teams.map((team, index) => {
        const droppable = moving && picked !== null;
        const HeadTag = droppable ? 'button' : 'div';

        return (
          <section key={team.name} className={styles.column}>
            <HeadTag
              {...(droppable
                ? { type: 'button' as const, onClick: () => place(index) }
                : {})}
              className={`${styles.head} ${droppable ? styles.headDroppable : ''}`}
              style={{
                background: `var(${team.colorToken})`,
                color: `var(${team.colorToken}-on)`,
              }}
            >
              <span className="t-stencil">
                {team.name}
                {droppable ? ' — tap to move here' : ''}
              </span>
              <span className="t-stencil">{team.studentIds.length}</span>
            </HeadTag>

            <div className={styles.body}>
              {team.studentIds.map((id) => {
                const student = byId.get(id);
                if (!student) return null;

                const status = statuses.get(id) ?? 'absent';
                const count = counts.get(id) ?? 0;
                const unassessed = flagUnassessed && status !== 'absent' && count === 0;

                const classes = [
                  styles.member,
                  'touch-target',
                  status === 'late' ? styles.late : '',
                  status === 'absent' ? styles.absent : '',
                  unassessed ? styles.unassessed : '',
                  picked === id ? styles.picked : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={id}
                    type="button"
                    className={classes}
                    onClick={() =>
                      moving ? onPick(picked === id ? null : id) : onOpenStudent(student)
                    }
                  >
                    <span className={styles.initials} aria-hidden="true">
                      {initials(student)}
                    </span>
                    <span className={styles.name}>{labels.get(id) ?? student.firstName}</span>
                    {count > 0 ? (
                      <span className={styles.badge} aria-hidden="true">
                        {count}
                      </span>
                    ) : null}
                    <span className="sr-only">
                      {student.firstName} {student.lastName}, {team.name}, {status},{' '}
                      {count === 0 ? 'not graded yet' : `${count} entries today`}
                      {moving ? ', tap to pick up' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
