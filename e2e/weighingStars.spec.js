// =============================================================================
// Weighing the Stars: readings taken from the screen, wrong turns named, a deeper
// step that keeps its scene
// -----------------------------------------------------------------------------
// The arm lengths and the stopwatch are taken by a button press with how they were
// taken beside them; a reading taken a lap later is the same reading (the pair is
// circular, so nothing depends on phase); a wrong turn in the weighing step gets
// feedback that names it and states no value; and the quantitative step opens on the
// anchor's scene with its own timings setting the error bar.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  progressOf,
  toolAction,
  walkToSid,
} from './centralExperiment.js';

import {
  installCanvasTextRecorder,
  openLessonStep,
} from '../tools/visual-criteria.mjs';

const ID = 'weighing-stars';
const body = page => page.locator('#investigationBody');
const take = (page, field) =>
  body(page).locator(`[data-take="${field}"]`).click();
const box = (page, sid, field) =>
  body(page).locator(`[data-field="${ID}:${sid}:${field}"]`);

/** Type a value and leave the box, as a reader does. */
async function typeIn(page, sid, field, value) {
  const el = box(page, sid, field);
  await el.fill(String(value));
  await el.dispatchEvent('input');
  await el.dispatchEvent('change');
  await el.blur();
}

test('the arm lengths are taken, not typed, and a later lap gives the same reading', async ({
  page,
  app,
}) => {
  test.slow();
  await openInvestigation(page, app, ID);
  const plan = await lessonPlan(page, ID);
  await walkToSid(page, plan, 'take-the-orbit-readings');

  for (const f of ['ra', 'rb', 'sep']) await take(page, f);
  await expect(page.locator('.inv-check')).toContainText(/add up/i);
  const first = (await progressOf(page, ID)).responses;
  const sid = 'take-the-orbit-readings';
  const at = f => Number(first[`${ID}:${sid}:${f}`]);
  expect(at('ra') + at('rb')).toBeCloseTo(at('sep'), 1);
  expect(at('sep')).toBeCloseTo(4, 1);
  expect(JSON.parse(first[`${ID}:${sid}:ra:src`])).toMatchObject({ k: 'c' });
  // The pair is circular: after a lap of watching, the same reading is the same
  // number, so it is refused as already recorded rather than found different.
  await app.waitForFrames(180);
  await take(page, 'sep');
  const again = (await progressOf(page, ID)).responses;
  expect(again[`${ID}:${sid}:sep`]).toBe(first[`${ID}:${sid}:sep`]);
});

test('a wrong star, a period of half a lap and a unit slip are named; the right readings weigh the pair', async ({
  page,
  app,
}) => {
  test.slow();
  await openInvestigation(page, app, ID);
  const plan = await lessonPlan(page, ID);

  // The stopwatch is taken, and the page divides by the laps the student timed.
  await walkToSid(page, plan, 'time-the-laps');
  await toolAction(page, 'mark');
  await app.waitForFrames(240);
  await toolAction(page, 'stop');
  await typeIn(page, 'time-the-laps', 'laps', 1);
  await take(page, 't');
  const t = Number(
    (await progressOf(page, ID)).responses[`${ID}:time-the-laps:t`]
  );
  expect(t).toBeGreaterThan(0.5);
  const p = box(page, 'time-the-laps', 'p');
  await expect.poll(async () => Number(await p.inputValue())).toBeCloseTo(t, 1);

  await walkToSid(page, plan, 'weigh-the-pair');
  const slip = body(page).locator('[data-slip]');
  const w = 'weigh-the-pair';
  await typeIn(page, w, 'a', '1.00');
  await typeIn(page, w, 'p', '4.00');
  await expect(slip).toBeVisible();
  await expect(slip).toContainText(/one star/i);
  expect(await slip.innerText()).not.toMatch(/\b4(\.0+)?\b/);
  await typeIn(page, w, 'a', '4.00');
  await typeIn(page, w, 'p', '2.00');
  await expect(slip).toContainText(/half a lap/i);
  await typeIn(page, w, 'p', '48');
  await expect(slip).toContainText(/months/i);
  await typeIn(page, w, 'p', '4.00');
  await expect(slip).toBeHidden();
  await expect(page.locator('.inv-check')).toContainText(/4\.0\s+solar masses/);
  await expect(box(page, w, 'total')).toHaveValue('4.00');
});

test('a deeper step opens on its anchor scene and the error bar follows the scatter of the timings', async ({
  page,
  app,
}) => {
  test.slow();
  await app.boot({ url: `/#investigation=${ID}/quantitative` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await page.waitForFunction(() => window.splashScreenEnded === true);
  const plan = await page.evaluate(async id => {
    const reg = await import('/js/data/investigations/registry.js');
    const depth = await import('/js/investigations/depth.js');
    const laid = await depth.withDepth(await reg.loadInvestigation(id), 'en');
    return depth
      .lessonAt(laid, 'quantitative')
      .steps.map((s, index) => ({ index, sid: s.sid, title: s.title }));
  }, ID);
  const stagedBodies = () =>
    page.evaluate(async () => {
      const stage = await import('/js/lessonStage.js');
      return stage.stagedStars().length;
    });

  await walkToSid(page, plan, 'weigh-the-pair');
  await typeIn(page, 'weigh-the-pair', 'a', '4.00');
  await typeIn(page, 'weigh-the-pair', 'p', '4.00');
  const anchor = await stagedBodies();
  expect(anchor).toBe(2);
  await walkToSid(page, plan, 'how-sure-is-the-total');
  // The scene is the anchor's: two stars, not an empty canvas.
  expect(await stagedBodies()).toBe(2);

  const s = 'how-sure-is-the-total';
  await toolAction(page, 'mark');
  await app.waitForFrames(120);
  await toolAction(page, 'stop');
  await take(page, 't1');
  await toolAction(page, 'mark');
  await app.waitForFrames(150);
  await toolAction(page, 'stop');
  await take(page, 't2');
  await expect(box(page, s, 'n')).toHaveValue('2');
  // The timer counts simulated time, so how long two waits of a few frames read
  // depends on the frame rate. The error bar is therefore set from the scatter the
  // panel itself shows, not from a number that suits one machine.
  const sd = Number(await box(page, s, 'sd').inputValue());
  expect(sd).toBeGreaterThan(0);
  expect(sd).toBeLessThan(0.5);
  await typeIn(page, s, 'sa', '0.01');
  await typeIn(page, s, 'sp', (sd / 2).toFixed(4));
  await expect(page.locator('.inv-check')).toContainText(
    /smaller than the scatter/i
  );
  await typeIn(page, s, 'sp', (sd * 1.5 + 0.05).toFixed(3));
  await expect(page.locator('.inv-check')).toContainText(/solar masses/i);
});

// A mass drawn under a star is the answer to the steps that ask for it. The
// canvas draws the number and the solar symbol as separate texts.
const massTexts = page =>
  page.evaluate(() => {
    const last = window.__canvasText?.simulationCanvas?.last ?? [];
    return last
      .map(b => b.text.trim())
      .filter(x => x.includes('\u2609') || /^\d+[.,]\d+\s*M$/.test(x));
  });

/** Wait until the canvas has drawn `n` more whole frames. */
async function framesDrawn(page, n) {
  const count = () =>
    page.evaluate(() => window.__canvasText?.simulationCanvas?.frames ?? 0);
  const from = await count();
  await expect.poll(count).toBeGreaterThanOrEqual(from + n);
}

const HIDDEN_STEPS = [
  'a-practice-run',
  'the-mystery-pair',
  'take-the-orbit-readings',
  'time-the-laps',
  'weigh-the-pair',
  'compare-the-two-arms',
  'share-the-total-out',
  'weigh-a-new-pair',
];

for (const language of ['en', 'es']) {
  test(`no star mass is drawn where the student works one out (${language})`, async ({
    page,
  }) => {
    test.slow();
    await page.addInitScript(installCanvasTextRecorder);
    await page.setViewportSize({ width: 1366, height: 800 });
    // The step that tells the answer draws them: the check can see a mass.
    await openLessonStep(page, { lesson: ID, sid: 'the-answer', language });
    await expect
      .poll(() => massTexts(page).then(m => m.length))
      .toBeGreaterThan(1);
    for (const sid of HIDDEN_STEPS) {
      await openLessonStep(page, { lesson: ID, sid, language });
      expect(await massTexts(page), sid).toEqual([]);
    }
  });
}

test('the masses go off the canvas and come back as the student steps through', async ({
  page,
}) => {
  test.slow();
  await page.addInitScript(installCanvasTextRecorder);
  await page.setViewportSize({ width: 1366, height: 800 });
  await openLessonStep(page, { lesson: ID, sid: 'the-answer' });
  await expect
    .poll(() => massTexts(page).then(m => m.length))
    .toBeGreaterThan(1);
  await page.locator('#investigationPrev').click();
  await expect(page.locator('.inv-step-title')).toHaveText(/weigh each one/i);
  await framesDrawn(page, 12);
  expect(await massTexts(page)).toEqual([]);
  await page.locator('#investigationNext').click();
  await expect(page.locator('.inv-step-title')).toHaveText(/The answer/i);
  await expect
    .poll(() => massTexts(page).then(m => m.length))
    .toBeGreaterThan(1);
});
