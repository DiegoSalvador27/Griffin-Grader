import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../components/Toast';
import LiveClassPage from './LiveClassPage';
import { resetDb } from '../../db/testing';
import { seedIfEmpty } from '../../db/seed';
import { db } from '../../db/db';
import { createClass } from '../../db/repos/classes';
import { addStudents } from '../../db/repos/students';
import type { ID } from '../../db/types';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

beforeEach(resetDb);

async function setup(): Promise<ID> {
  await seedIfEmpty();
  const rubric = (await db.rubrics.toArray())[0]!;
  const cls = await createClass({ name: 'PE 10, Block 2', rubricId: rubric.id });
  await addStudents(cls.id, [
    { firstName: 'Bea', lastName: 'Ruiz' },
    { firstName: 'José', lastName: 'Torres' },
    { firstName: 'Cam', lastName: "O'Neil" },
  ]);
  return cls.id;
}

function renderLive(classId: ID) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/live/${classId}`]}>
        <Routes>
          <Route path="/live/:classId" element={<LiveClassPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

/** Tiles carry an sr-only summary; this finds one by student name. */
const tile = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('live class screen', () => {
  it('starts everyone absent and opens in attendance mode', async () => {
    renderLive(await setup());

    expect(await screen.findByText('Taking attendance')).toBeInTheDocument();
    // Three absent, nobody present.
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(tile('Bea Ruiz')).toHaveAccessibleName(/absent/);
  });

  it('cycles attendance when a tile is tapped in attendance mode', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');

    await user.click(tile('Bea Ruiz'));
    expect(await screen.findByRole('button', { name: /Bea Ruiz, present/ })).toBeTruthy();

    await user.click(tile('Bea Ruiz'));
    expect(await screen.findByRole('button', { name: /Bea Ruiz, late/ })).toBeTruthy();

    await user.click(tile('Bea Ruiz'));
    expect(await screen.findByRole('button', { name: /Bea Ruiz, absent/ })).toBeTruthy();
  });

  it('marks everyone present in one go', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');

    await user.click(screen.getByRole('button', { name: 'Mark all present' }));

    expect(await screen.findByRole('button', { name: /Bea Ruiz, present/ })).toBeTruthy();
    expect(await screen.findByRole('button', { name: /José Torres, present/ })).toBeTruthy();
  });

  /* SPEC 10: tapping a level in the Student sheet creates an assessment and
     the tile badge shows 1. */
  it('records an entry from the sheet and shows it on the tile badge', async () => {
    const user = userEvent.setup();
    const classId = await setup();
    renderLive(classId);
    await screen.findByText('Taking attendance');

    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(tile('Bea Ruiz'));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Skills: Proficient 2' }));

    // The write landed.
    await vi.waitFor(async () => {
      expect(await db.assessments.count()).toBe(1);
    });
    const saved = (await db.assessments.toArray())[0]!;
    expect(saved.categoryName).toBe('Skills');
    expect(saved.levelCode).toBe('PR2');

    // And the tile says so.
    expect(
      await screen.findByRole('button', { name: /Bea Ruiz, present, 1 entry today/ }),
    ).toBeTruthy();
  });

  it('counts a second entry for the same student', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');
    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(tile('Bea Ruiz'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Skills: Proficient 2' }));
    await user.click(within(dialog).getByRole('button', { name: 'Teamwork: Extending 1' }));

    expect(
      await screen.findByRole('button', { name: /Bea Ruiz, present, 2 entries today/ }),
    ).toBeTruthy();
  });

  /* SPEC 4.5 and assumption 2. */
  it('marks an absent student present when they are graded, and says so', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(tile('Bea Ruiz'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Skills: Proficient 2' }));

    expect(await screen.findByText(/Bea marked present/)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Bea Ruiz, present/ }),
    ).toBeTruthy();
  });

  it('undoes an entry', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');
    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(tile('Bea Ruiz'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Skills: Proficient 2' }));

    await vi.waitFor(async () => expect(await db.assessments.count()).toBe(1));

    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    await vi.waitFor(async () => expect(await db.assessments.count()).toBe(0));
  });

  it('lists students who were here but never graded when the class ends', async () => {
    const user = userEvent.setup();
    renderLive(await setup());
    await screen.findByText('Taking attendance');
    await user.click(screen.getByRole('button', { name: 'Mark all present' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(tile('Bea Ruiz'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Skills: Proficient 2' }));
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'End class' }));

    expect(await screen.findByText(/finished/)).toBeInTheDocument();
    expect(screen.getByText('José Torres')).toBeInTheDocument();
    expect(screen.getByText("Cam O'Neil")).toBeInTheDocument();
    expect(screen.queryByText('Bea Ruiz')).not.toBeInTheDocument();
  });
});
