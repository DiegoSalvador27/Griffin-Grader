import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// The shell imports the service worker registration through AppLayout's update
// banner. jsdom has no service worker, so the virtual module is stubbed.
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

describe('app shell', () => {
  it('shows the identity band and the four main sections', () => {
    render(
      <MemoryRouter initialEntries={['/classes']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Griffin Grader')).toBeInTheDocument();
    for (const label of ['Classes', 'Rubrics', 'Export', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('keeps the watermark on the page', () => {
    render(
      <MemoryRouter initialEntries={['/classes']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Griffin Grader by Diego D.')).toBeInTheDocument();
  });

  it('marks the current section for assistive tech', () => {
    render(
      <MemoryRouter initialEntries={['/export']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Export' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
