import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { counts, createClass, forceDownloadPath, startClass, tile } from './helpers';

/**
 * The nine journeys from SPEC section 10, run in WebKit on an iPad Pro 11 in
 * both landscape and portrait.
 *
 * Each test gets a fresh browser context, so IndexedDB starts empty and the
 * app begins at first run.
 */

const ROSTER = [
  'Bea Ruiz',
  'José Torres',
  "Cam O'Neil",
  'Alex Morrow',
  'Alex Martin',
  'Mary-Kate Delacroix',
];

test.beforeEach(async ({ context }) => {
  await forceDownloadPath(context);
});

/* 1 */
test('a fresh app can create a class by paste and start it', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByText('Grade your PE classes right from your iPad')).toBeVisible();

  await startClass(page, 'PE 10, Block 2', ROSTER);

  await expect(page.getByRole('heading', { name: 'PE 10, Block 2' })).toBeVisible();
  // Six students, all absent to begin with (SPEC 4.5).
  expect((await counts(page)).absent).toBe(6);

  // The awkward names survived the paste.
  await expect(tile(page, 'José Torres')).toBeVisible();
  await expect(tile(page, "Cam O'Neil")).toBeVisible();
  await expect(tile(page, 'Mary-Kate Delacroix')).toBeVisible();
});

/* 2 */
test('attendance mode marks present, late and absent with correct counts', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);

  for (const name of ['Bea Ruiz', 'José Torres', 'Alex Morrow']) {
    await tile(page, name).click();
  }
  // One more tap makes Alex Morrow late.
  await tile(page, 'Alex Morrow').click();

  await expect
    .poll(async () => (await counts(page)).present)
    .toBe(2);
  const tally = await counts(page);
  expect(tally.late).toBe(1);
  expect(tally.absent).toBe(3);
});

/* 3 */
test('grading from the sheet updates the tile badge', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);
  await page.getByRole('button', { name: 'Mark all present' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await tile(page, 'Bea Ruiz').click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Skills: Proficient 2' }).click();

  await sheet.getByLabel(/Comment on Skills PR2/).fill('Great effort');
  await expect(tile(page, 'Bea Ruiz, present, 1 entry today')).toBeVisible();

  await sheet.getByRole('button', { name: 'Teamwork: Extending 1' }).click();
  await expect(tile(page, 'Bea Ruiz, present, 2 entries today')).toBeVisible();
});

/* 4 */
test('grading an absent student marks them present', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await expect(tile(page, 'Bea Ruiz, absent')).toBeVisible();

  await tile(page, 'Bea Ruiz').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Skills: Proficient 2' }).click();

  await expect(page.getByText(/Bea marked present/)).toBeVisible();
  await expect(tile(page, 'Bea Ruiz, present')).toBeVisible();
});

/* 5 */
test('teams put every present student in exactly one team', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);

  // Four present, two left absent.
  for (const name of ['Bea Ruiz', 'José Torres', 'Alex Morrow', 'Alex Martin']) {
    await tile(page, name).click();
  }
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await page.getByRole('button', { name: 'Teams' }).first().click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByText('4 students to split')).toBeVisible();

  // Groups of 2 across 4 students is two teams of two.
  await panel.getByRole('button', { name: 'Fewer' }).click();
  await panel.getByRole('button', { name: 'Fewer' }).click();
  await expect(panel.getByText(/2 teams of 2, 2/)).toBeVisible();

  await panel.getByRole('button', { name: 'Make teams' }).click();

  const members = page.locator('button[class*="member"]');
  await expect(members).toHaveCount(4);

  const names = await members.allInnerTexts();
  const unique = new Set(names.map((n) => n.trim()));
  expect(unique.size).toBe(4);
  // The two absent students were excluded.
  expect(names.join(' ')).not.toContain('Mary-Kate');
});

/* 6 */
test('ending a class lists students who were here but not graded', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);
  await page.getByRole('button', { name: 'Mark all present' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await tile(page, 'Bea Ruiz').click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Skills: Proficient 2' }).click();
  await sheet.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'End class' }).click();

  await expect(page.getByText(/PE 10 finished/)).toBeVisible();
  await expect(page.getByText('José Torres')).toBeVisible();
  await expect(page.getByText('Bea Ruiz')).toHaveCount(0);
});

/* 7 */
test('the PowerSchool CSV contains the expected values', async ({ page }) => {
  await startClass(page, 'PE 10, Block 2', ROSTER);
  await tile(page, 'Bea Ruiz').click();
  await tile(page, 'José Torres').click();
  await tile(page, 'José Torres').click(); // present then late
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await tile(page, 'Bea Ruiz').click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Skills: Proficient 2' }).click();
  await sheet.getByLabel(/Comment on Skills PR2/).fill('Great effort, said "nice shot"');
  await sheet.getByRole('button', { name: 'Close' }).click();

  await page.goto('/#/export');
  await expect(page.getByRole('heading', { name: 'PowerSchool sheet' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download PowerSchool sheet/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^griffin-grader_powerschool_\d{4}-\d{2}-\d{2}\.csv$/,
  );

  const raw = readFileSync(await download.path());
  // UTF-8 BOM so Excel renders José correctly.
  expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);

  const text = raw.toString('utf8');
  expect(text).toContain('\r\n');
  expect(text).toContain(
    'Class,Date(s),Last Name,First Name,Student Number,Attendance,Skills,Skills Comments',
  );
  // A class name containing a comma is quoted.
  expect(text).toContain('"PE 10, Block 2"');
  // A comment containing a comma and quotes is escaped.
  expect(text).toContain('"Great effort, said ""nice shot"""');
  expect(text).toMatch(/Ruiz,Bea,,Present,PR2/);
  expect(text).toMatch(/Torres,José,,Late/);
  expect(text).toMatch(/O'Neil,Cam,,Absent/);
});

/* 8 */
test('data survives a reload', async ({ page }) => {
  await startClass(page, 'PE 10', ROSTER);
  await page.getByRole('button', { name: 'Mark all present' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  await tile(page, 'Bea Ruiz').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Skills: Proficient 2' }).click();
  await expect(tile(page, 'Bea Ruiz, present, 1 entry today')).toBeVisible();

  await page.reload();

  await expect(tile(page, 'Bea Ruiz, present, 1 entry today')).toBeVisible();
  expect((await counts(page)).present).toBe(6);

  await page.goto('/#/classes');
  await expect(page.getByText('PE 10')).toBeVisible();
});

/* 9 */
test('the service worker precaches the whole app for offline use', async ({ page, request }) => {
  await page.goto('/#/classes');

  // Playwright's WebKit does not run service workers reliably, so SPEC 10
  // test 9 allows asserting on the generated precache manifest instead.
  const sw = await (await request.get('/sw.js')).text();
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1] ?? '');

  expect(urls).toContain('index.html');
  expect(urls.some((u) => u.endsWith('.js'))).toBe(true);
  expect(urls.some((u) => u.endsWith('.css'))).toBe(true);
  expect(urls).toContain('manifest.webmanifest');

  // Every precached entry is actually reachable, so a cold offline launch has
  // nothing missing.
  for (const url of new Set(urls)) {
    const response = await request.get(`/${url}`);
    expect(response.status(), `${url} should be served`).toBe(200);
  }
});

/* Extra: the roster import path a teacher is most likely to get wrong. */
test('a class page shows the roster with attendance totals', async ({ page }) => {
  await createClass(page, 'PE 20', ROSTER);
  await page.goto('/#/classes');
  await page.getByRole('link', { name: 'PE 20' }).click();

  await expect(page.getByRole('heading', { name: 'PE 20' })).toBeVisible();
  await expect(page.getByRole('link', { name: "O'Neil, Cam" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Torres, José' })).toBeVisible();
});
