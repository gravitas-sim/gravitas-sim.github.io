// =============================================================================
// A student's answers keep their question
// -----------------------------------------------------------------------------
// The unit tests own the mapping; this owns the parts of it that only exist in
// a browser: that a save written by the previous build is still readable, that
// the reader is told it was matched by position, and that a payload from a
// newer build is left alone rather than overwritten.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'detect-this-planet';
const KEY = `gravitas_investigation_${LESSON}`;

/** Open the lesson through the interface. */
async function openLesson(page, app, { url = '/' } = {}) {
  await app.boot({ url });
  await page.locator('#investigationsBtn').click();
  await page.locator(`[data-investigation="${LESSON}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** Answer whatever the current step asks and move on. Step 0 is a read. */
async function answerAndAdvance(page) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();
  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }
  const next = page.locator('#investigationNext');
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

/** The lesson's stable ids, in order, as the running app sees them. */
const sidsOf = page =>
  page.evaluate(async id => {
    const { loadInvestigation } =
      await import('/js/data/investigations/registry.js');
    const lesson = await loadInvestigation(id);
    return lesson.steps.map(s => s.sid);
  }, LESSON);

/** What is actually in storage for this lesson. */
const stored = page =>
  page.evaluate(k => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, KEY);

test.describe('saved progress is keyed by stable id', () => {
  test('a new save names its schema and keys by sid', async ({ page, app }) => {
    await openLesson(page, app);
    const sids = await sidsOf(page);

    // Past the opening read, then answer the first predict.
    await answerAndAdvance(page);
    await answerAndAdvance(page);

    await expect.poll(async () => (await stored(page))?.schema).toBe(2);
    const data = await stored(page);
    expect(data.stepSid).toBeTruthy();
    // Every key names a step this lesson has, by id and not by number.
    for (const key of Object.keys(data.responses)) {
      const head = key.slice(`${LESSON}:`.length).split(':')[0];
      expect(sids).toContain(head);
      expect(head).not.toMatch(/^\d+$/);
    }
    expect(data.visited.every(v => sids.includes(v))).toBe(true);
  });

  test('a save from the previous build is migrated, kept, and reported', async ({
    page,
    app,
  }) => {
    // Exactly what the old code wrote: index keys, index visited, no schema.
    await app.boot();
    await page.evaluate(
      ([k, id]) => {
        localStorage.setItem(
          k,
          JSON.stringify({
            stepIndex: 5,
            responses: { [`${id}:1`]: 0, [`${id}:5`]: 2 },
            attempts: {},
            visited: [0, 1, 5],
            startedAt: '2026-09-01T10:00:00.000Z',
          })
        );
      },
      [KEY, LESSON]
    );

    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    const sids = await sidsOf(page);
    // Answers landed on the steps that were at those positions.
    await expect
      .poll(async () => {
        const d = await stored(page);
        return d?.responses?.[`${LESSON}:${sids[1]}`];
      })
      .toBe(0);
    const data = await stored(page);
    expect(data.schema).toBe(2);
    expect(data.responses[`${LESSON}:${sids[5]}`]).toBe(2);

    // The original is kept, because a positional match cannot be checked.
    const legacy = await page.evaluate(
      k => localStorage.getItem(`${k}:v1`),
      KEY
    );
    expect(JSON.parse(legacy).responses[`${LESSON}:1`]).toBe(0);

    // And the reader is told, on screen, rather than left to assume.
    const notice = page.locator('#investigationProgressNotice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/matched by position/i);
  });

  test('progress written by a newer build is never overwritten', async ({
    page,
    app,
  }) => {
    await app.boot();
    const future = { schema: 99, responses: { 'something:new': 1 } };
    await page.evaluate(
      ([k, v]) => localStorage.setItem(k, JSON.stringify(v)),
      [KEY, future]
    );

    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    await expect(page.locator('#investigationProgressNotice')).toContainText(
      /newer version/i
    );

    // Answer something: the lesson keeps working and the store is untouched.
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    await page.waitForTimeout(300);

    expect(await stored(page)).toEqual(future);
    await expect(page.locator('#investigationSaveStatus')).toContainText(
      /not being saved/i
    );
  });

  test('answers survive a language switch', async ({ page, app }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    await expect.poll(async () => (await stored(page))?.schema).toBe(2);
    const before = (await stored(page)).responses;

    await page.evaluate(async () => {
      const i = await import('/js/i18n/index.js');
      await i.setLocale('es');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    // Same keys, because a sid is not a word.
    expect((await stored(page)).responses).toEqual(before);
  });
});
