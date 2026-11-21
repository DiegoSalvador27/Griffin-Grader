import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { resetDb } from '../db/testing';

// The shell registers a service worker through the update banner. jsdom has
// none, so the virtual module is stubbed.
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));

beforeEach(resetDb);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('app shell', () => {
  // App renders nothing until the first-run seed lands, so these await.
  it('shows the identity band and the four main sections', async () => {
    renderAt('/classes');

    expect(await screen.findByText('Griffin Grader')).toBeInTheDocument();
    for (const label of ['Classes', 'Rubrics', 'Export', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('keeps the watermark on the page', async () => {
    renderAt('/classes');
    expect(await screen.findByText('Griffin Grader by Diego D.')).toBeInTheDocument();
  });

  it('marks the current section for assistive tech', async () => {
    renderAt('/export');
    expect(await screen.findByRole('link', { name: 'Export' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('invites a first class when there are none', async () => {
    renderAt('/classes');
    expect(await screen.findByText('No classes yet')).toBeInTheDocument();
  });
});
