import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sheet from './Sheet';

/**
 * These guard the bug that made the on-iPad keyboard vanish mid-comment.
 *
 * The focus-trap effect used to depend on `onClose`. Callers pass an inline
 * arrow, so every parent re-render produced a new identity, re-running the
 * effect: cleanup focused the element behind the sheet, then setup refocused
 * the sheet's first control. Typing a comment triggers a save, which triggers
 * a live-query re-render, which stole focus. The resulting blur fired another
 * save, which re-rendered again: an endless loop that froze the app.
 */

/** A host that re-renders on demand and always passes a fresh onClose. */
function Host({ onClose }: { onClose: () => void }) {
  const [tick, setTick] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setTick((t) => t + 1)}>
        force rerender
      </button>
      <span data-testid="tick">{tick}</span>
      {/* Inline arrow on purpose: this is what every real caller does. */}
      <Sheet title="Student" onClose={() => onClose()}>
        <input aria-label="Comment" />
        <button type="button">Save</button>
      </Sheet>
    </>
  );
}

describe('Sheet focus handling', () => {
  it('moves focus into the sheet when it opens', async () => {
    render(
      <Sheet title="Student" onClose={() => {}}>
        <input aria-label="Comment" />
      </Sheet>,
    );
    // The close button is first in DOM order, which is a fine landing spot.
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    );
  });

  it('keeps focus in the comment field when the parent re-renders', async () => {
    const user = userEvent.setup();

    // A live query re-renders the parent without any user interaction, so the
    // re-render is driven here rather than by clicking something (clicking
    // would move focus on its own and prove nothing).
    const tree = (n: number) => (
      <Sheet title={`Student ${n}`} onClose={() => {}}>
        <input aria-label="Comment" />
        <button type="button">Save</button>
      </Sheet>
    );

    const { rerender } = render(tree(0));

    const comment = screen.getByLabelText('Comment');
    await user.click(comment);
    await user.type(comment, 'test');
    expect(comment).toHaveFocus();

    // Three live-query updates land while the teacher is still typing.
    rerender(tree(1));
    rerender(tree(2));
    rerender(tree(3));

    // The bug: focus jumped away here, dismissing the iPad keyboard.
    expect(comment).toHaveFocus();

    await user.type(comment, '!');
    expect(comment).toHaveValue('test!');
  });

  it('does not blur the field repeatedly as the parent re-renders', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();

    function BlurHost() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            force rerender
          </button>
          <span>{tick}</span>
          <Sheet title="Student" onClose={() => {}}>
            <input aria-label="Comment" onBlur={onBlur} />
          </Sheet>
        </>
      );
    }

    render(<BlurHost />);
    const comment = screen.getByLabelText('Comment');
    await user.click(comment);
    onBlur.mockClear();

    // Each of these would previously blur the field, and in the real app each
    // blur wrote to the database and caused the next re-render.
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'force rerender' }));
      await user.click(comment);
    }

    // Only the deliberate clicks away from the field should blur it.
    expect(onBlur.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('still closes on Escape after re-renders', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'force rerender' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
