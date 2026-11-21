import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import { useToast } from '../../components/toastContext';
import { db } from '../../db/db';
import { newId } from '../../lib/ids';
import { buildDefaultRubric } from '../../db/seed';
import {
  categoryInUse,
  duplicateRubric,
  levelInUse,
  listQuickComments,
  listRubrics,
  saveQuickComments,
  saveRubric,
} from '../../db/repos/rubrics';
import type { ID, Level, Rubric, RubricCategory, Tier } from '../../db/types';
import styles from './RubricsPage.module.css';

const TIERS: ReadonlyArray<{ value: Tier; label: string }> = [
  { value: 'DV', label: 'Developing' },
  { value: 'PR', label: 'Proficient' },
  { value: 'EX', label: 'Extending' },
  { value: 'other', label: 'Other' },
];

export default function RubricsPage() {
  const rubrics = useLiveQuery(() => listRubrics(), []);
  const classes = useLiveQuery(() => db.classes.toArray(), []);
  const quickComments = useLiveQuery(() => listQuickComments(), []);
  const toast = useToast();

  if (!rubrics || !classes || !quickComments) return null;

  const usedBy = (rubricId: ID): string[] =>
    classes.filter((c) => c.rubricId === rubricId).map((c) => c.name);

  /** Starts from the standard PE rubric rather than a blank one: a rubric
      with no categories or levels cannot grade anything. */
  const addRubric = async (): Promise<void> => {
    const fresh = buildDefaultRubric();
    await saveRubric({ ...fresh, name: 'New rubric' });
    toast.show('New rubric added');
  };

  return (
    <div>
      <div className={styles.head}>
        <h1 className="t-title">Rubrics</h1>
        <Button variant="gold" onClick={() => void addRubric()}>
          New rubric
        </Button>
      </div>

      {rubrics.length === 0 ? (
        <section className={styles.card}>
          <div className={styles.cardBody}>
            <Banner tone="info">
              There are no rubrics yet. Add one and you can start a class with it.
            </Banner>
          </div>
        </section>
      ) : null}

      {rubrics.map((rubric) => (
        <RubricEditor
          key={rubric.id}
          rubric={rubric}
          usedBy={usedBy(rubric.id)}
          onDuplicate={async () => {
            await duplicateRubric(rubric.id);
            toast.show(`${rubric.name} copied`);
          }}
        />
      ))}

      <QuickCommentsEditor comments={quickComments} />
    </div>
  );
}

function RubricEditor({
  rubric,
  usedBy,
  onDuplicate,
}: {
  rubric: Rubric;
  usedBy: string[];
  onDuplicate: () => void | Promise<void>;
}) {
  const toast = useToast();

  const update = (patch: Partial<Rubric>): void => {
    void saveRubric({ ...rubric, ...patch });
  };

  const categories = [...rubric.categories].sort((a, b) => a.order - b.order);
  const levels = [...rubric.levels].sort((a, b) => a.order - b.order);

  const patchCategory = (id: ID, patch: Partial<RubricCategory>): void => {
    update({ categories: rubric.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };

  const patchLevel = (id: ID, patch: Partial<Level>): void => {
    update({ levels: rubric.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  };

  /** Swaps a row with its neighbour, then renumbers so order stays 0..n. */
  const move = <T extends { id: ID; order: number }>(
    rows: T[],
    id: ID,
    delta: number,
  ): T[] => {
    const sorted = [...rows].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((r) => r.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= sorted.length) return rows;

    const a = sorted[i];
    const b = sorted[j];
    if (!a || !b) return rows;
    sorted[i] = b;
    sorted[j] = a;

    return sorted.map((r, k) => ({ ...r, order: k }));
  };

  /**
   * A category with entries is hidden, never deleted (SPEC 4.6), so the
   * history that references it keeps rendering. Only an unused one goes.
   */
  const removeCategory = async (category: RubricCategory): Promise<void> => {
    if (await categoryInUse(category.id)) {
      patchCategory(category.id, { hidden: true });
      toast.show(`${category.name} hidden. Entries that used it are kept.`);
      return;
    }
    update({ categories: rubric.categories.filter((c) => c.id !== category.id) });
  };

  const removeLevel = async (level: Level): Promise<void> => {
    if (await levelInUse(level.id)) {
      toast.showError(
        `${level.code} is used by entries already recorded, so it cannot be removed.`,
      );
      return;
    }
    update({ levels: rubric.levels.filter((l) => l.id !== level.id) });
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.grow}>
          <input
            className={styles.input}
            defaultValue={rubric.name}
            aria-label="Rubric name"
            onBlur={(e) => update({ name: e.target.value })}
          />
          <p className={styles.usedBy}>
            {usedBy.length === 0 ? 'Not used by any class yet' : `Used by ${usedBy.join(', ')}`}
          </p>
        </div>
        <Button onClick={() => void onDuplicate()}>Duplicate</Button>
      </div>

      <div className={styles.cardBody}>
        <h3 className="t-stencil" style={{ color: 'var(--text-secondary)' }}>
          Categories
        </h3>
      </div>

      <ul className={styles.rows}>
        {categories.map((category, i) => (
          <li
            key={category.id}
            className={`${styles.row} ${category.hidden ? styles.hidden : ''}`}
          >
            <div className={styles.grow}>
              <input
                className={styles.input}
                defaultValue={category.name}
                aria-label={`Category ${i + 1} name`}
                onBlur={(e) => patchCategory(category.id, { name: e.target.value })}
              />
            </div>
            <div className={styles.grow}>
              <input
                className={styles.input}
                defaultValue={category.description ?? ''}
                placeholder="What you are looking for"
                aria-label={`Category ${i + 1} description`}
                onBlur={(e) => patchCategory(category.id, { description: e.target.value })}
              />
            </div>
            {category.hidden ? <span className={styles.muted}>Hidden</span> : null}
            <span className={styles.actions}>
              <Button
                variant="quiet"
                aria-label={`Move ${category.name} up`}
                disabled={i === 0}
                onClick={() => update({ categories: move(rubric.categories, category.id, -1) })}
              >
                Up
              </Button>
              <Button
                variant="quiet"
                aria-label={`Move ${category.name} down`}
                disabled={i === categories.length - 1}
                onClick={() => update({ categories: move(rubric.categories, category.id, 1) })}
              >
                Down
              </Button>
              {category.hidden ? (
                <Button variant="quiet" onClick={() => patchCategory(category.id, { hidden: false })}>
                  Show
                </Button>
              ) : (
                <Button variant="quiet" onClick={() => void removeCategory(category)}>
                  Remove
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.footerActions}>
        <Button
          onClick={() =>
            update({
              categories: [
                ...rubric.categories,
                { id: newId(), name: 'New category', order: rubric.categories.length },
              ],
            })
          }
        >
          Add category
        </Button>
      </div>

      <div className={styles.cardBody}>
        <h3 className="t-stencil" style={{ color: 'var(--text-secondary)' }}>
          Levels, lowest first
        </h3>
      </div>

      <ul className={styles.rows}>
        {levels.map((level, i) => (
          <li key={level.id} className={styles.row}>
            <div className={styles.narrow}>
              <input
                className={styles.input}
                defaultValue={level.code}
                aria-label={`Level ${i + 1} code`}
                onBlur={(e) => patchLevel(level.id, { code: e.target.value })}
              />
            </div>
            <div className={styles.grow}>
              <input
                className={styles.input}
                defaultValue={level.label}
                aria-label={`Level ${i + 1} label`}
                onBlur={(e) => patchLevel(level.id, { label: e.target.value })}
              />
            </div>
            <select
              className={styles.select}
              value={level.tier}
              aria-label={`Level ${i + 1} colour group`}
              onChange={(e) => patchLevel(level.id, { tier: e.target.value as Tier })}
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className={styles.actions}>
              <Button
                variant="quiet"
                aria-label={`Move ${level.code} up`}
                disabled={i === 0}
                onClick={() => update({ levels: move(rubric.levels, level.id, -1) })}
              >
                Up
              </Button>
              <Button
                variant="quiet"
                aria-label={`Move ${level.code} down`}
                disabled={i === levels.length - 1}
                onClick={() => update({ levels: move(rubric.levels, level.id, 1) })}
              >
                Down
              </Button>
              <Button variant="quiet" onClick={() => void removeLevel(level)}>
                Remove
              </Button>
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.footerActions}>
        <Button
          onClick={() =>
            update({
              levels: [
                ...rubric.levels,
                {
                  id: newId(),
                  code: 'NEW',
                  label: 'New level',
                  tier: 'other',
                  order: rubric.levels.length,
                },
              ],
            })
          }
        >
          Add level
        </Button>
      </div>
    </section>
  );
}

function QuickCommentsEditor({ comments }: { comments: { id: ID; text: string; order: number }[] }) {
  const [draft, setDraft] = useState('');

  const save = (rows: { id: ID; text: string; order: number }[]): void => {
    void saveQuickComments(rows);
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className="t-subtitle">Quick comments</h2>
        <span className={styles.muted}>Taps that fill the comment box while grading.</span>
      </div>

      {comments.length === 0 ? (
        <div className={styles.cardBody}>
          <Banner tone="info">No quick comments yet. Add one below.</Banner>
        </div>
      ) : (
        <ul className={styles.rows}>
          {comments.map((comment, i) => (
            <li key={comment.id} className={styles.row}>
              <div className={styles.grow}>
                <input
                  className={styles.input}
                  defaultValue={comment.text}
                  aria-label={`Quick comment ${i + 1}`}
                  onBlur={(e) =>
                    save(
                      comments.map((c) =>
                        c.id === comment.id ? { ...c, text: e.target.value } : c,
                      ),
                    )
                  }
                />
              </div>
              <span className={styles.actions}>
                <Button
                  variant="quiet"
                  aria-label={`Move "${comment.text}" up`}
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...comments];
                    const a = next[i];
                    const b = next[i - 1];
                    if (!a || !b) return;
                    next[i] = b;
                    next[i - 1] = a;
                    save(next);
                  }}
                >
                  Up
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => save(comments.filter((c) => c.id !== comment.id))}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.footerActions}>
        <div className={styles.grow}>
          <input
            className={styles.input}
            value={draft}
            placeholder="Add a quick comment"
            aria-label="New quick comment"
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button
          variant="gold"
          disabled={draft.trim() === ''}
          onClick={() => {
            save([...comments, { id: newId(), text: draft.trim(), order: comments.length }]);
            setDraft('');
          }}
        >
          Add
        </Button>
      </div>
    </section>
  );
}
