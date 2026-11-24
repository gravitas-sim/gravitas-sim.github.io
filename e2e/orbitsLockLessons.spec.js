// =============================================================================
// When Orbits Lock: the four resonance instruments open held under Reduced
// motion and Step by step, run on Run and hold on Pause, in two languages
// -----------------------------------------------------------------------------
// The instruments draw the running world, so Run and Pause are the world's
// clock. Checked in the page: with the reader's Motion choice at Reduced or
// Step by step the world is held when the instrument opens and does not
// advance until Run is pressed; with the choice left alone it runs as the
// step's scene set it and the button reads Pause. The libration capture
// refuses a reading taken before the angle has turned back. The rest of the
// lesson is tests/orbitsLockLesson.test.js and e2e/centralExperiments.spec.js.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  walkToSid,
} from './centralExperiment.js';

const ID = 'when-orbits-lock';
const STEPS = [
  ['measure-the-four-periods', 'resonance-periods'],
  ['watch-the-line-ups', 'resonance-conjunctions'],
  ['watch-the-laplace-argument', 'resonance-angle'],
  ['the-rotating-frame', 'resonance-frame'],
];

/** The lesson open, in the language asked for (the stored choice, then a reload, as a reader would). */
async function open(page, app, locale) {
  await openInvestigation(page, app, ID);
  if (locale === 'en') return;
  await page.evaluate(async l => {
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale(l, { persist: true });
  }, locale);
  await page.reload();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  await page.waitForFunction(() => window.splashScreenEnded === true);
}

const world = page =>
  page.evaluate(async () => {
    const st = await import('/js/appState.js');
    const p = await import('/js/physics.js');
    return { paused: st.state.paused, clock: p.getSimulationTime() };
  });

const run = page =>
  page.locator('#investigationToolActions [data-tool-action="run"]');

for (const [locale, runWord, pauseWord] of [
  ['en', /^Run$/, /^Pause$/],
  ['es', /^Ejecutar$/, /^Pausar$/],
]) {
  for (const choice of ['reduce', 'step']) {
    test(`${locale}: under ${choice} each instrument opens held and Run starts it`, async ({
      page,
      app,
    }) => {
      test.setTimeout(180_000);
      await page.addInitScript(
        ([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            /* storage unavailable: the page opens with its defaults */
          }
        },
        ['gravitas_motion', choice]
      );
      await open(page, app, locale);
      const plan = await lessonPlan(page, ID);
      for (const [sid, tool] of STEPS) {
        await walkToSid(page, plan, sid);
        await expect(page.locator('#investigationTool')).toBeVisible();
        const button = run(page);
        await expect(button, `${tool}: Run is a button with a name`).toHaveText(
          runWord
        );
        const held = await world(page);
        expect(held.paused, `${tool}: held when it opens`).toBe(true);
        // Two dozen painted frames: time a running world would have moved.
        await page.evaluate(async () => {
          for (let i = 0; i < 24; i++)
            await new Promise(r => window.requestAnimationFrame(r));
        });
        expect(
          (await world(page)).clock,
          `${tool}: no time passes unpressed`
        ).toBe(held.clock);
        await button.click();
        await expect(button).toHaveText(pauseWord);
        await expect
          .poll(async () => (await world(page)).clock, { timeout: 15_000 })
          .toBeGreaterThan(held.clock);
        await button.click();
        await expect(button).toHaveText(runWord);
        expect((await world(page)).paused).toBe(true);
      }
    });
  }

  test(`${locale}: with Motion left alone the world runs as the step set it and the button offers Pause`, async ({
    page,
    app,
  }) => {
    test.setTimeout(120_000);
    await open(page, app, locale);
    const plan = await lessonPlan(page, ID);
    await walkToSid(page, plan, 'measure-the-four-periods');
    const button = run(page);
    await expect(button).toHaveText(pauseWord);
    const a = await world(page);
    expect(a.paused).toBe(false);
    await expect
      .poll(async () => (await world(page)).clock, { timeout: 15_000 })
      .toBeGreaterThan(a.clock);
    await button.click();
    await expect(button).toHaveText(runWord);
    expect((await world(page)).paused).toBe(true);
  });
}
