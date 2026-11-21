import Button from '../../components/Button';
import { formatDateLong } from '../../lib/dates';
import styles from './Scoreboard.module.css';

interface Props {
  className: string;
  date: string;
  present: number;
  late: number;
  absent: number;
  graded: number;
  eligible: number;
  attendanceMode: boolean;
  onToggleAttendance: () => void;
  onMarkAll: (status: 'present' | 'absent') => void;
  onTeams: () => void;
  onEndClass: () => void;
}

export default function Scoreboard({
  className,
  date,
  present,
  late,
  absent,
  graded,
  eligible,
  attendanceMode,
  onToggleAttendance,
  onMarkAll,
  onTeams,
  onEndClass,
}: Props) {
  return (
    <header className={styles.board}>
      <div className={styles.id}>
        <img
          className={styles.crest}
          src={`${import.meta.env.BASE_URL}crest.png`}
          alt=""
          width={134}
          height={140}
        />
        <div style={{ minWidth: 0 }}>
          <h1 className={styles.className}>{className}</h1>
          <p className={`t-stencil ${styles.date}`}>{formatDateLong(date)}</p>
        </div>
      </div>

      <div className={styles.counts}>
        <Count value={present} label="Present" />
        <Count value={late} label="Late" />
        <Count value={absent} label="Absent" />
        <div className={`${styles.cell} ${styles.coverage}`}>
          <span className={styles.value}>
            {graded}/{eligible}
          </span>
          <span className={`t-stencil ${styles.label}`}>Graded</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="onNavy" onClick={onToggleAttendance}>
          {attendanceMode ? 'Done' : 'Attendance'}
        </Button>
        <Button variant="onNavy" onClick={onTeams}>
          Teams
        </Button>
        <Button variant="gold" onClick={onEndClass}>
          End class
        </Button>
      </div>

      {/* Roster-wide actions appear only in attendance mode. One always-visible
          "Mark all absent" is a way to lose a period of attendance by mistake. */}
      {attendanceMode ? (
        <div className={styles.mode}>
          <span className={`t-stencil ${styles.modeLabel}`}>Taking attendance</span>
          <span className={`t-label ${styles.modeHint}`}>
            Tap a student to cycle absent, present, late.
          </span>
          <Button variant="onNavy" onClick={() => onMarkAll('present')}>
            Mark all present
          </Button>
          <Button variant="onNavy" onClick={() => onMarkAll('absent')}>
            Mark all absent
          </Button>
        </div>
      ) : null}
    </header>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.cell}>
      <span className={styles.value}>{value}</span>
      <span className={`t-stencil ${styles.label}`}>{label}</span>
    </div>
  );
}
