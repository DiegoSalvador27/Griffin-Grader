import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import { ToastStack } from '../../components/Toast';
import { useToast } from '../../components/toastContext';
import { WATERMARK } from '../../app/layout/Footer';
import { holdUpdates } from '../../app/pwa';
import { keepAwake } from '../../lib/wakeLock';
import { startOrResumeSession, endSession } from '../../db/repos/sessions';
import { cycleStatus, setAllStatuses } from '../../db/repos/attendance';
import { useLiveSession } from './useLiveSession';
import Scoreboard from './Scoreboard';
import Tile from './Tile';
import StudentSheet from './StudentSheet';
import TeamsPanel from './TeamsPanel';
import TeamsView from './TeamsView';
import SegmentedControl from '../../components/SegmentedControl';
import { latestTeamSet } from '../../db/repos/teams';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ID, Student } from '../../db/types';
import styles from './LiveClassPage.module.css';

export default function LiveClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [sessionId, setSessionId] = useState<ID | null>(null);
  const [startError, setStartError] = useState(false);
  // Attendance mode is on when a class starts (SPEC 4.5): the first thing a
  // teacher does is find out who is actually in the gym.
  const [attendanceMode, setAttendanceMode] = useState(true);
  const [openStudent, setOpenStudent] = useState<Student | null>(null);
  const [ended, setEnded] = useState(false);
  const [view, setView] = useState<'grid' | 'teams'>('grid');
  const [teamsPanelOpen, setTeamsPanelOpen] = useState(false);
  // Moving is its own mode. In Teams view a tap still grades, same as the
  // grid, so "tap a student then tap a team" needs an explicit switch rather
  // than quietly changing what a tap means.
  const [moving, setMoving] = useState(false);
  const [picked, setPicked] = useState<ID | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;

    void (async () => {
      try {
        const session = await startOrResumeSession(classId);
        if (!cancelled) setSessionId(session.id);
      } catch {
        if (!cancelled) setStartError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  // Hold back service worker updates: a reload mid-period loses the teacher's
  // place. A waiting update is offered as soon as the class ends.
  useEffect(() => {
    holdUpdates(true);
    return () => holdUpdates(false);
  }, []);

  useEffect(() => keepAwake(), []);

  const data = useLiveSession(classId, sessionId ?? undefined);
  const teamSet = useLiveQuery(
    () => (sessionId ? latestTeamSet(sessionId) : Promise.resolve(undefined)),
    [sessionId],
  );

  const onTileTap = useCallback(
    (student: Student) => {
      if (attendanceMode) {
        if (sessionId) void cycleStatus(sessionId, student.id);
        return;
      }
      setOpenStudent(student);
    },
    [attendanceMode, sessionId],
  );

  const onTileHold = useCallback(
    (student: Student) => {
      // Hold always cycles attendance, in either mode, so a late arrival can
      // be fixed without opening the sheet.
      if (sessionId) void cycleStatus(sessionId, student.id);
    },
    [sessionId],
  );

  if (startError) {
    return (
      <div className={styles.loading}>
        <Banner tone="danger">
          This class could not be started. Nothing was saved, so it is safe to try
          again.
        </Banner>
        <Button onClick={() => navigate('/classes')}>Back to classes</Button>
      </div>
    );
  }

  if (data === undefined || data === null || !sessionId) {
    return <p className={styles.loading}>Starting class…</p>;
  }

  const missed = data.students.filter(
    (s) =>
      (data.statuses.get(s.id) ?? 'absent') !== 'absent' && (data.counts.get(s.id) ?? 0) === 0,
  );

  if (ended) {
    return (
      <div className={styles.screen}>
        <section className={styles.summary}>
          <div className={styles.summaryHead}>
            <h1 className="t-title">{data.cls.name} finished</h1>
            <p className="t-label">Here is how the period went.</p>
          </div>

          <div className={styles.summaryStats}>
            <Stat value={data.present} label="Present" />
            <Stat value={data.late} label="Late" />
            <Stat value={data.absent} label="Absent" />
            <Stat value={[...data.counts.values()].reduce((a, b) => a + b, 0)} label="Entries" />
          </div>

          <div className={styles.missed}>
            <h2 className="t-stencil" style={{ color: 'var(--text-secondary)' }}>
              Here but not graded
            </h2>
            {missed.length === 0 ? (
              <p className="t-label" style={{ marginTop: 'var(--space-2)' }}>
                Everyone who was here got at least one entry.
              </p>
            ) : (
              <div className={styles.missedList}>
                {missed.map((s) => (
                  <span key={s.id} className={styles.missedName}>
                    {s.firstName} {s.lastName}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.summaryActions}>
            <Button onClick={() => navigate('/classes')}>Back to classes</Button>
            <Button variant="gold" onClick={() => navigate('/export')}>
              Export today
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <Scoreboard
        className={data.cls.name}
        date={data.session.date}
        present={data.present}
        late={data.late}
        absent={data.absent}
        graded={data.graded}
        eligible={data.eligible}
        attendanceMode={attendanceMode}
        onToggleAttendance={() => setAttendanceMode((v) => !v)}
        onMarkAll={(status) => {
          void setAllStatuses(
            sessionId,
            data.students.map((s) => s.id),
            status,
          );
        }}
        onTeams={() => setTeamsPanelOpen(true)}
        onEndClass={() => {
          void endSession(sessionId);
          setEnded(true);
        }}
      />

      <div className={styles.gridArea}>
        {view === 'grid' || !teamSet ? (
          <div className={styles.grid}>
            {data.students.map((student) => (
              <Tile
                key={student.id}
                student={student}
                label={data.labels.get(student.id) ?? student.firstName}
                status={data.statuses.get(student.id) ?? 'absent'}
                count={data.counts.get(student.id) ?? 0}
                flagUnassessed={data.flagUnassessed}
                onTap={() => onTileTap(student)}
                onLongPress={() => onTileHold(student)}
              />
            ))}
          </div>
        ) : (
          <TeamsView
            teamSet={teamSet}
            students={data.students}
            labels={data.labels}
            statuses={data.statuses}
            counts={data.counts}
            flagUnassessed={data.flagUnassessed}
            moving={moving}
            picked={picked}
            onPick={setPicked}
            onOpenStudent={setOpenStudent}
          />
        )}
      </div>

      <div className={styles.toolbar}>
        <Button onClick={() => navigate('/classes')}>Leave</Button>

        {teamSet ? (
          <SegmentedControl
            label="View"
            value={view}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'teams', label: 'Teams' },
            ]}
            onChange={(next) => {
              setView(next);
              if (next === 'grid') {
                setMoving(false);
                setPicked(null);
              }
            }}
          />
        ) : null}

        {view === 'teams' && teamSet ? (
          <Button
            variant={moving ? 'gold' : 'ghost'}
            onClick={() => {
              setMoving((v) => !v);
              setPicked(null);
            }}
          >
            {moving ? 'Done moving' : 'Move students'}
          </Button>
        ) : null}

        <ToastStack />
        <p className={styles.watermark}>{WATERMARK}</p>
      </div>

      {teamsPanelOpen ? (
        <TeamsPanel
          sessionId={sessionId}
          classId={data.cls.id}
          students={data.students}
          statuses={data.statuses}
          onClose={() => setTeamsPanelOpen(false)}
          onMade={() => {
            setTeamsPanelOpen(false);
            setView('teams');
            toast.show('Teams made');
          }}
        />
      ) : null}

      {openStudent ? (
        <StudentSheet
          student={openStudent}
          sessionId={sessionId}
          classId={data.cls.id}
          status={data.statuses.get(openStudent.id) ?? 'absent'}
          categories={data.categories}
          levels={data.levels}
          quickComments={data.quickComments}
          onClose={() => setOpenStudent(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={`t-stencil ${styles.statLabel}`}>{label}</span>
    </div>
  );
}
