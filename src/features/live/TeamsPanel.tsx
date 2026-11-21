import { useState } from 'react';
import Sheet from '../../components/Sheet';
import Button from '../../components/Button';
import SegmentedControl from '../../components/SegmentedControl';
import { colorTokenFor, splitIntoTeams } from '../../lib/teams/randomize';
import { saveTeamSet } from '../../db/repos/teams';
import type { AttendanceStatus, ID, Student, TeamMode } from '../../db/types';
import styles from './TeamsPanel.module.css';

interface Props {
  sessionId: ID;
  classId: ID;
  students: Student[];
  statuses: Map<ID, AttendanceStatus>;
  onClose: () => void;
  onMade: () => void;
}

export default function TeamsPanel({
  sessionId,
  classId,
  students,
  statuses,
  onClose,
  onMade,
}: Props) {
  const [mode, setMode] = useState<TeamMode>('size');
  const [n, setN] = useState(4);
  const [presentOnly, setPresentOnly] = useState(true);
  const [working, setWorking] = useState(false);

  const eligible = presentOnly
    ? students.filter((s) => (statuses.get(s.id) ?? 'absent') !== 'absent')
    : students;

  const make = async (): Promise<void> => {
    setWorking(true);
    try {
      const split = splitIntoTeams(
        eligible.map((s) => s.id),
        { mode, n },
      );
      await saveTeamSet({
        sessionId,
        classId,
        mode,
        n,
        presentOnly,
        teams: split.map((studentIds, i) => ({
          name: `Team ${i + 1}`,
          colorToken: colorTokenFor(i),
          studentIds,
        })),
      });
      onMade();
    } finally {
      setWorking(false);
    }
  };

  const preview = splitIntoTeams(
    eligible.map((s) => s.id),
    { mode, n },
  );

  return (
    <Sheet
      title="Teams"
      onClose={onClose}
      headerExtra={
        <div>
          <p className={styles.title}>Teams</p>
          <p className={styles.sub}>
            {eligible.length} {eligible.length === 1 ? 'student' : 'students'} to split
          </p>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.row}>
          <SegmentedControl
            label="How to split"
            value={mode}
            options={[
              { value: 'size', label: 'Groups of' },
              { value: 'count', label: 'Number of teams' },
            ]}
            onChange={setMode}
          />

          <div className={styles.stepper}>
            <Button
              aria-label="Fewer"
              onClick={() => setN((v) => Math.max(1, v - 1))}
              disabled={n <= 1}
            >
              &minus;
            </Button>
            <span className={styles.stepperValue} aria-live="polite">
              {n}
            </span>
            <Button aria-label="More" onClick={() => setN((v) => Math.min(20, v + 1))}>
              +
            </Button>
          </div>
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={presentOnly}
            onChange={(e) => setPresentOnly(e.target.checked)}
          />
          <span>Only students who are here (present or late)</span>
        </label>

        <p className={styles.preview}>
          {preview.length === 0
            ? 'Nobody to split yet. Take attendance first, or turn the filter off.'
            : `That makes ${preview.length} ${preview.length === 1 ? 'team' : 'teams'} of ${preview.map((t) => t.length).join(', ')}.`}
        </p>

        <div className={styles.actions}>
          <Button
            variant="gold"
            size="lg"
            disabled={preview.length === 0 || working}
            onClick={() => void make()}
          >
            Make teams
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
