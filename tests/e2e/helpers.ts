import type { Page, BrowserContext } from '@playwright/test';

/**
 * Playwright's WebKit implements navigator.share and canShare({files}), so an
 * export would open a share sheet and never produce a download. Stubbing both
 * away forces the Blob fallback, which is the branch whose bytes a test can
 * actually read. (Real Safari does share, which is why that path stays on the
 * manual iPad checklist in README.md.)
 */
export async function forceDownloadPath(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
}

/** Creates a class through the real UI, stopping on the wizard's last step. */
export async function createClass(
  page: Page,
  name: string,
  students: readonly string[],
): Promise<void> {
  await page.goto('/#/classes/new');
  await page.getByLabel(/Class name/).waitFor();
  await page.getByLabel(/Class name/).fill(name);
  await page.getByLabel(/One student per line/).fill(students.join('\n'));
  await page.getByRole('button', { name: /Next: rubric/ }).click();
  await page.getByRole('button', { name: /Create class/ }).click();
  await page.getByRole('button', { name: /Start class now/ }).waitFor();
}

/** Creates a class and goes straight into the live screen. */
export async function startClass(
  page: Page,
  name: string,
  students: readonly string[],
): Promise<void> {
  await createClass(page, name, students);
  await page.getByRole('button', { name: /Start class now/ }).click();
  await page.getByText('Taking attendance').waitFor();
}

/** A student tile, found by the accessible summary it carries. */
export function tile(page: Page, studentName: string) {
  return page.getByRole('button', { name: new RegExp(studentName) }).first();
}

/** Scoreboard counts, read back as numbers. */
export async function counts(page: Page) {
  const text = (await page.locator('header').first().innerText()).replace(/\s+/g, ' ');
  const read = (label: string): number =>
    Number(new RegExp(`(\\d+)\\s*${label}`, 'i').exec(text)?.[1] ?? -1);
  return {
    present: read('Present'),
    late: read('Late'),
    absent: read('Absent'),
    raw: text,
  };
}
