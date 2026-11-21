import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import { formatDateShort, localDateString, today } from '../../lib/dates';
import { setArchived } from '../../db/repos/classes';
import { backupIsStale, getSettings } from '../../db/repos/settings';
import { useClassSummaries, type ClassSummary } from './useClassSummaries';
import styles from './ClassesPage.module.css';

export default function ClassesPage() {
  const navigate = useNavigate();
  const summaries = useClassSummaries();
  const archived = useClassSummaries(true);
  const settings = useLiveQuery(() => getSettings(), []);

  if (!summaries) return null;

  const anyToday = summaries.some((s) => s.liveToday !== null);
  // Only nag once there is something worth losing (SPEC 4.8).
  const nagAboutBackup =
    settings !== undefined && summaries.length > 0 && backupIsStale(settings);

  return (
    <div>
      <div className={styles.head}>
        <h1 className="t-title">Classes</h1>
        {anyToday ? (
          <Button onClick={() => navigate('/export')}>Export today</Button>
        ) : null}
        <Button variant="gold" onClick={() => navigate('/classes/new')}>
          New class
        </Button>
      </div>

      {nagAboutBackup ? (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Banner tone="warn">
            <span>
              {settings.lastBackupAt === undefined
                ? 'You have never made a backup.'
                : `Last backup: ${formatDateShort(localDateString(new Date(settings.lastBackupAt)))}.`}{' '}
              A backup is the only copy of this term that is not on this iPad.
            </span>
            <Button onClick={() => navigate('/settings')}>Download backup</Button>
          </Banner>
        </div>
      ) : null}

      {summaries.length === 0 ? (
        <section className={styles.empty}>
          <h2 className="t-subtitle">No classes yet</h2>
          <p>Add your first class, then you can take attendance and start grading.</p>
          <Button variant="gold" size="lg" onClick={() => navigate('/classes/new')}>
            Create my first class
          </Button>
        </section>
      ) : (
        <div className={styles.list}>
          {summaries.map((s) => (
            <ClassCard key={s.cls.id} summary={s} />
          ))}
        </div>
      )}

      {archived && archived.length > 0 ? (
        <details className={styles.archived}>
          <summary>{archived.length} archived</summary>
          <div className={`${styles.list} ${styles.archivedList}`}>
            {archived.map((s) => (
              <article key={s.cls.id} className={styles.card}>
                <div className={styles.body}>
                  <h3 className={styles.name}>{s.cls.name}</h3>
                  <p className={`t-stencil ${styles.status}`}>Archived</p>
                  <dl className={styles.meta}>
                    <dt>Students</dt>
                    <dd>{s.studentCount}</dd>
                  </dl>
                </div>
                <Button
                  wide
                  className={styles.start}
                  onClick={() => void setArchived(s.cls.id, false)}
                >
                  Unarchive
                </Button>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ClassCard({ summary }: { summary: ClassSummary }) {
  const navigate = useNavigate();
  const { cls, liveToday } = summary;

  const inProgress = liveToday !== null && !liveToday.ended;

  const status = (): string => {
    if (inProgress && liveToday) {
      return `In progress, ${liveToday.graded} of ${liveToday.eligible} graded`;
    }
    if (liveToday?.ended) return 'Finished today';
    return 'Not started today';
  };

  return (
    <article className={`${styles.card} ${inProgress ? styles.live : ''}`}>
      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link className={styles.nameLink} to={`/classes/${cls.id}`}>
            {cls.name}
          </Link>
        </h3>
        <p
          className={`t-stencil ${styles.status} ${inProgress ? styles.statusLive : ''}`}
        >
          {status()}
        </p>
        <dl className={styles.meta}>
          <dt>Students</dt>
          <dd>{summary.studentCount}</dd>
          <dt>Rubric</dt>
          <dd>{summary.rubricName}</dd>
          <dt>Last class</dt>
          <dd>
            {summary.lastSessionDate === null
              ? 'Never'
              : summary.lastSessionDate === today()
                ? 'Today'
                : formatDateShort(summary.lastSessionDate)}
          </dd>
        </dl>
      </div>

      <Button
        variant="gold"
        wide
        className={styles.start}
        disabled={summary.studentCount === 0}
        onClick={() => navigate(`/live/${cls.id}`)}
      >
        {summary.studentCount === 0
          ? 'Add students first'
          : inProgress
            ? 'Resume class'
            : 'Start class'}
      </Button>
    </article>
  );
}
