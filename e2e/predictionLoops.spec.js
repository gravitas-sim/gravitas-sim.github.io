// =============================================================================
// Predict, do it, measure, find out
// -----------------------------------------------------------------------------
// Every investigation is built round the same loop, and until recently the
// loop had a hole in the middle of it: a prediction was marked the instant it
// was committed. The reader picked an option, the panel said "correct" and
// printed the explanation, and the experiment that followed had nothing left
// to settle. An answer key is not an experiment.
//
// A prediction now names the step where the result arrives - `reveal: '<sid>'`
// in the lesson data - and js/investigations.js holds the marking until the
// reader gets there. This file drives that end to end, in a browser, on one
// lesson from every widget family plus the three that have no widget at all:
//
//   1. reach the prediction and commit to the WRONG answer on purpose
//   2. assert nothing on that screen says whether it was right
//   3. walk to the step the prediction named
//   4. assert the verdict is there, marked wrong, with the explanation
//   5. go back, and assert the prediction is now marked too
//
// Committing the wrong answer is the point. A test that picks the right one
// cannot tell a working verdict from a panel that congratulates everybody, and
// "the checkbox was ticked" is not evidence that an experiment ran.
//
// What this does not claim
// -----------------------------------------------------------------------------
// That the loops teach anybody anything. No study has been run and none is
// implied. What is checked here is mechanical: the prediction is collected,
// held, and answered by the step the lesson says answers it.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * One loop per family, chosen so that every widget family and every
 * widget-less lesson shape is driven at least once.
 *
 * `predict` and `reveal` are sids; the titles are read from the lesson at run
 * time, so a retitled step does not silently stop being tested. Kept in step
 * order within each lesson.
 */
const LOOPS = [
  {
    id: 'keplers-laws',
    predict: 'where-is-the-star',
    family: 'no widget: the canvas and the inspector',
  },
  {
    id: 'orbital-energy',
    predict: 'load-it-heavily',
    family: 'energy widgets',
  },
  {
    id: 'transit-photometry',
    predict: 'what-will-the-brightness-do',
    family: 'transit widgets',
  },
  {
    id: 'weighing-stars',
    predict: 'which-pair-is-quicker',
    family: 'binary widgets',
  },
  {
    id: 'black-holes',
    predict: 'now-make-it-heavier',
    family: 'black-hole widgets',
  },
  {
    id: 'radial-velocity',
    predict: 'now-tilt-the-whole-system',
    family: 'exoplanet widgets',
  },
  {
    id: 'goldilocks-question',
    predict: 'move-it-twice-as-far',
    family: 'habitability widgets',
  },
  {
    id: 'missing-mass',
    predict: 'now-a-galaxy',
    family: 'dark-matter widgets',
  },
  {
    id: 'tides',
    predict: 'bring-the-companion-closer',
    family: 'tidal widgets',
  },
  {
    id: 'butterfly-effect',
    predict: 'the-same-nudge-three-bodies',
    family: 'chaos widgets',
  },
  {
    id: 'when-orbits-lock',
    predict: 'the-laplace-argument',
    family: 'resonance widgets',
  },
  {
    id: 'hohmann-transfer',
    predict: 'predict-do-nothing',
    family: 'no widget: the manoeuvre planner',
  },
  {
    id: 'lagrange-points',
    predict: 'predict-forbidden',
    family: 'no widget: the rotating frame',
  },
  {
    id: 'what-is-a-gravitational-wave',
    predict: 'a-sphere-that-breathes',
    family: 'gravitational-wave widgets',
  },
  {
    id: 'a-universe-of-stars',
    predict: 'predict-which-is-bigger',
    family: 'stellar widgets',
  },
  {
    id: 'lives-of-stars',
    predict: 'predict-direction',
    family: 'stellar-evolution widgets',
  },
];

/** Open a lesson the way a student arrives at one. */
async function open(page, app, id) {
  await app.boot({ url: `/#investigation=${id}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  await page.waitForFunction(() => window.splashScreenEnded === true);
}

/** What the lesson itself says about this loop, read at run time. */
async function loopFacts(page, id, predictSid) {
  return page.evaluate(
    async ([lessonId, sid]) => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation(lessonId);
      const at = lesson.steps.findIndex(s => s.sid === sid);
      const step = lesson.steps[at];
      const revealAt = lesson.steps.findIndex(s => s.sid === step.reveal);
      return {
        predictIndex: at,
        predictTitle: step.title,
        answer: step.answer,
        options: step.options?.length ?? 0,
        reveal: step.reveal ?? null,
        revealIndex: revealAt,
        revealTitle: lesson.steps[revealAt]?.title ?? null,
      };
    },
    [id, predictSid]
  );
}

const title = page => page.locator('.inv-step-title').innerText();

const visited = async page =>
  Number(
    (await page.locator('#investigationProgressText').innerText()).match(
      /\d+/
    )?.[0] ?? 0
  );

/**
 * Answer whatever would hold Next up on the current screen.
 *
 * Some steps gate on a recorded value or a choice, and four of these loops sit
 * deep enough in their lesson that walking to them means passing through
 * several. Nothing here is asserted; it is the cost of arriving at the screen
 * that is. The values are deliberately arbitrary, which is safe because the
 * step under test is reached before any of this runs on it.
 */
async function nudge(page) {
  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check().catch(() => {});
  }
  const fields = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < (await fields.count()); i++) {
    const field = fields.nth(i);
    if (!(await field.inputValue())) await field.fill('1').catch(() => {});
  }
  const open = page.locator('#investigationBody .inv-option:not([disabled])');
  if (await open.count())
    await open
      .first()
      .click()
      .catch(() => {});
}

/**
 * Press Next until the panel is showing `wanted`.
 *
 * The guard covers the deepest of these loops, which starts eighteen steps in.
 */
async function walkTo(page, wanted) {
  for (let guard = 0; guard < 40; guard++) {
    if ((await title(page)).trim() === wanted.trim()) return;
    const before = await visited(page);
    await nudge(page);
    await page
      .locator('#investigationNext')
      .click({ timeout: 15_000 })
      .catch(() => {});
    await expect
      .poll(() => visited(page), { timeout: 20_000 })
      .toBeGreaterThan(before);
  }
  throw new Error(`never reached the step titled "${wanted}"`);
}

/** Back up until the panel is showing `wanted`. */
async function walkBackTo(page, wanted) {
  for (let guard = 0; guard < 40; guard++) {
    if ((await title(page)).trim() === wanted.trim()) return;
    await page.locator('#investigationPrev').click({ timeout: 15_000 });
    await page.waitForTimeout(120);
  }
  throw new Error(`never got back to the step titled "${wanted}"`);
}

test.describe('a prediction is settled by the experiment, not by the answer key', () => {
  for (const loop of LOOPS) {
    test(`${loop.id}: ${loop.family} @accepts:ce.${loop.id}`, async ({
      page,
      app,
    }) => {
      test.slow();
      await open(page, app, loop.id);
      const facts = await loopFacts(page, loop.id, loop.predict);

      // The lesson must actually declare the loop. A prediction that lost its
      // `reveal` would otherwise make this test pass by testing nothing.
      expect(facts.reveal, `${loop.predict} declares a reveal`).toBeTruthy();
      expect(facts.options).toBeGreaterThan(1);
      expect(facts.revealIndex).toBeGreaterThan(facts.predictIndex);

      await walkTo(page, facts.predictTitle);

      // Deliberately wrong: the first option that is not the answer.
      const wrong = facts.answer === 0 ? 1 : 0;
      const options = page.locator('#investigationBody .inv-option');
      await expect(options.first()).toBeVisible();
      await options.nth(wrong).click();

      // Committed and locked, and told nothing.
      await expect(options.nth(wrong)).toHaveClass(/is-chosen/);
      await expect(options.first()).toBeDisabled();
      await expect(
        page.locator('#investigationBody .inv-option.is-correct')
      ).toHaveCount(0);
      await expect(
        page.locator('#investigationBody .inv-option.is-wrong')
      ).toHaveCount(0);
      await expect(page.locator('#investigationBody .inv-because')).toHaveCount(
        0
      );
      // And it says where the answer will come from, by name.
      const held = page.locator('#investigationBody .inv-held');
      await expect(held).toBeVisible();
      await expect(held).toContainText(facts.revealTitle);

      // Do the experiment.
      await walkTo(page, facts.revealTitle);

      // The result arrives, and with it the verdict on what was predicted.
      const verdict = page.locator('#investigationBody .inv-verdict');
      await expect(verdict).toBeVisible();
      await expect(verdict).toHaveClass(/is-wrong/);
      await expect(verdict.locator('.inv-verdict-mark')).not.toBeEmpty();
      await expect(verdict.locator('.inv-because')).toBeVisible();

      // Going back, the prediction is marked now - both the pick and the
      // answer, which is what a reader who got it wrong needs to see.
      await walkBackTo(page, facts.predictTitle);
      await expect(
        page.locator('#investigationBody .inv-option.is-wrong')
      ).toHaveCount(1);
      await expect(
        page.locator('#investigationBody .inv-option.is-correct')
      ).toHaveCount(1);
      await expect(
        page.locator('#investigationBody .inv-because')
      ).toBeVisible();
      await expect(page.locator('#investigationBody .inv-held')).toHaveCount(0);
    });
  }
});
