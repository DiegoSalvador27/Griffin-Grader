import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../app/App';
import { ToastProvider } from '../../components/Toast';
import Footer from '../../app/layout/Footer';
import { resetDb } from '../../db/testing';

vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

beforeEach(resetDb);

const renderFooter = () =>
  render(
    <ToastProvider>
      <Footer />
    </ToastProvider>,
  );

describe('the hidden debug gesture', () => {
  it('stays shut for a normal number of taps', async () => {
    const user = userEvent.setup();
    renderFooter();

    const mark = screen.getByText('Griffin Grader by Diego D.');
    for (let i = 0; i < 4; i++) await user.click(mark);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the fifth tap', async () => {
    const user = userEvent.setup();
    renderFooter();

    const mark = screen.getByText('Griffin Grader by Diego D.');
    for (let i = 0; i < 5; i++) await user.click(mark);

    expect(await screen.findByRole('dialog', { name: 'Debug' })).toBeInTheDocument();
  });

  it('forgets taps that are too far apart', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderFooter();
      const mark = screen.getByText('Griffin Grader by Diego D.');

      for (let i = 0; i < 4; i++) await user.click(mark);
      // Long enough that the earlier taps fall out of the window.
      vi.setSystemTime(Date.now() + 5000);
      await user.click(mark);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports the build, install state and safe-area insets', async () => {
    const user = userEvent.setup();
    renderFooter();

    const mark = screen.getByText('Griffin Grader by Diego D.');
    for (let i = 0; i < 5; i++) await user.click(mark);

    await screen.findByRole('dialog', { name: 'Debug' });
    // Diagnostics are gathered asynchronously, so wait for a resolved field.
    expect(await screen.findByText('Safe area')).toBeInTheDocument();

    const panel = screen.getByRole('dialog', { name: 'Debug' });
    expect(panel).toHaveTextContent('Build');
    expect(panel).toHaveTextContent('Database');
    // Counts come from the real tables.
    expect(panel).toHaveTextContent('assessments');
  });

  /**
   * iOS Safari only dispatches `click` to elements it treats as clickable:
   * natively interactive ones, ones with an inline onclick attribute, or ones
   * with `cursor: pointer`. The watermark is a plain <p> with `cursor: default`
   * and React attaches listeners at the root, so a click-based handler never
   * fired on a real iPad. This fires pointer events ONLY, with no click, which
   * is what the iPad actually delivers.
   */
  it('opens from pointer events alone, with no click event', async () => {
    renderFooter();
    const mark = screen.getByText('Griffin Grader by Diego D.');

    for (let i = 0; i < 5; i++) {
      fireEvent.pointerUp(mark);
    }

    expect(await screen.findByRole('dialog', { name: 'Debug' })).toBeInTheDocument();
  });

  it('is not announced as something to press', () => {
    renderFooter();
    expect(
      screen.queryByRole('button', { name: /Griffin Grader by Diego D/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Griffin Grader by Diego D.')).toBeInTheDocument();
  });
});

describe('class cards', () => {
  it('opens the class from anywhere on the card, not just the name', async () => {
    const user = userEvent.setup();
    const { seedIfEmpty } = await import('../../db/seed');
    const { db } = await import('../../db/db');
    const { createClass } = await import('../../db/repos/classes');
    const { addStudents } = await import('../../db/repos/students');

    await seedIfEmpty();
    const rubric = (await db.rubrics.toArray())[0]!;
    const cls = await createClass({ name: 'PE 10, Block 2', rubricId: rubric.id });
    await addStudents(cls.id, [{ firstName: 'Bea', lastName: 'Ruiz' }]);

    render(
      <MemoryRouter initialEntries={['/classes']}>
        <App />
      </MemoryRouter>,
    );

    // The whole white area is one control.
    const card = await screen.findByRole('button', { name: 'Open PE 10, Block 2' });
    await user.click(card);

    // Landed on the class page, which has the roster heading.
    expect(await screen.findByRole('heading', { name: 'PE 10, Block 2' })).toBeInTheDocument();
    expect(await screen.findByText('Students')).toBeInTheDocument();
  });
});
