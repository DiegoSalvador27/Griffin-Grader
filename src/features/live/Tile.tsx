import { memo, useState } from 'react';
import { useLongPress } from '../../lib/useLongPress';
import { initials } from '../../lib/names';
import type { AttendanceStatus, Student } from '../../db/types';
import styles from './Tile.module.css';

const STATUS_WORD: Record<AttendanceStatus, string> = {
  absent: 'Absent',
  present: 'Present',
  late: 'Late',
};

interface Props {
  student: Student;
  label: string;
  status: AttendanceStatus;
  count: number;
  flagUnassessed: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

/**
 * One student in the grid.
 *
 * Memoised on purpose: a 40-tile grid re-renders on every tap, and an
 * unmemoised tile makes the badge update miss the 100ms target in SPEC 8.
 */
function Tile({
  student,
  label,
  status,
  count,
  flagUnassessed,
  onTap,
  onLongPress,
}: Props) {
  const [holding, setHolding] = useState(false);

  const handlers = useLongPress(
    () => {
      setHolding(false);
      onLongPress();
    },
    onTap,
  );

  const unassessed = flagUnassessed && status !== 'absent' && count === 0;

  const classes = [
    styles.tile,
    'touch-target',
    status === 'absent' ? styles.absent : '',
    status === 'late' ? styles.late : '',
    unassessed ? styles.unassessed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onPointerDown={(e) => {
        setHolding(true);
        handlers.onPointerDown(e);
      }}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={(e) => {
        setHolding(false);
        handlers.onPointerUp(e);
      }}
      onPointerCancel={() => {
        setHolding(false);
        handlers.onPointerCancel();
      }}
      onPointerLeave={() => setHolding(false)}
      onClick={handlers.onClick}
      onContextMenu={handlers.onContextMenu}
    >
      {holding ? <span className={styles.holdRing} /> : null}

      <span className={styles.initials} aria-hidden="true">
        {initials(student)}
      </span>
      <span className={styles.name}>{label}</span>

      {status === 'absent' || status === 'late' ? (
        <span className={`t-stencil ${styles.status}`}>{STATUS_WORD[status]}</span>
      ) : null}

      {count > 0 ? (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      ) : null}

      {/* The visible tile is initials plus an abbreviated name; assistive tech
          gets the whole picture in one string. */}
      <span className="sr-only">
        {student.firstName} {student.lastName}, {STATUS_WORD[status].toLowerCase()},{' '}
        {count === 0 ? 'not graded yet' : `${count} ${count === 1 ? 'entry' : 'entries'} today`}
      </span>
    </button>
  );
}

export default memo(Tile);
