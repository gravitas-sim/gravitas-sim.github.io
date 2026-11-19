// =============================================================================
// Kepler's Laws, walked as a student does
// -----------------------------------------------------------------------------
// The lesson was reworked so that each law is predicted, then found from the
// student's own readings, before it is named. This walk does it in a browser:
// the star's second focus with the orbit geometry panel and two distances taken
// with the reading buttons (a wrong pair of points is refused with the author's
// words), the speed readings and the prediction set beside them, the wedges
// arriving only at their step, five planets taken into the table, an estimate
// held and checked, and a controlled run of one planet around two stars.
// Keyboard throughout where the control has a key; the object chips are the
// route to every planet, so no step needs a click on empty canvas.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  commitPredictionHeld,
  lessonPlan,
  openInvestigation,
  walkToSid,
} from './centralExperiment.js';

const ID = 'keplers-laws';

/** Select a planet from the lesson's object list, as the keyboard does. */
async function choose(page, name) {
  const chip = page.locator('.inv-object', { hasText: name }).first();
  await chip.focus();
  await page.keyboard.press('Enter');
}

const fieldInput = (page, label) =>
  page.locator('.inv-field', { hasText: label }).locator('input').first();

test.describe("Kepler's Laws, reworked", () => {
  test('the second focus is found with the panel and two taken distances', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);

    // Nothing is drawn but the star's own ring before the prediction, and the
    // wedges are off.
    await walkToSid(page, plan, 'where-is-the-star');
    expect(
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return {
          wedges: ui.state.areaSweepOverlay.active,
          paused: ui.state.paused,
        };
      })
    ).toEqual({ wedges: false, paused: true });
    const predict = plan.find(s => s.sid === 'where-is-the-star');
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, 'find-the-foci');
    await choose(page, 'Eccentric Orbiter');
    const takes = page.locator('[data-take]');
    await expect(takes).toHaveCount(2);
    await takes.nth(0).click();
    await takes.nth(1).click();
    await expect(fieldInput(page, 'closest approach')).toHaveValue('0.500');
    await expect(fieldInput(page, 'furthest distance')).toHaveValue('2.36');

    // The reading is saved with how it was taken.
    const src = await page.evaluate(async () => {
      const prog = Object.entries(localStorage).find(([k]) =>
        /keplers-laws/.test(k)
      );
      return prog?.[1] ?? '';
    });
    expect(src).toMatch(/f_peri:src/);

    // The panel, by keyboard: switch it on, then choose two points.
    await page.locator('#orbitGeometryToggleBtn').click();
    const list = page.locator('.og-list');
    await expect(list).toBeVisible();
    await list.focus();
    await page.keyboard.press('Enter'); // the star's point
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter'); // the empty focus
    await expect(page.locator('.orbit-geometry-panel')).toContainText(
      /Distance between Focus at Kepler Star and Empty focus: 1\.8\d/
    );

    // The wrong pair of points is refused in the author's words.
    const sep = fieldInput(page, 'empty focus');
    await sep.fill('0.93');
    await sep.blur();
    await expect(page.locator('.inv-feedback.is-wrong')).toContainText(
      'center of the ellipse'
    );
    await sep.fill('1.86');
    await sep.blur();
    await expect(page.locator('body')).toContainText(
      'agrees with what your two distances say'
    );

    // Leaving the step puts the panel away, and the verdict shows the
    // prediction beside the two readings.
    await walkToSid(page, plan, 'the-first-law-and-the');
    await expect(page.locator('.orbit-geometry-panel')).toBeHidden();
    const verdict = page.locator('[data-verdict]');
    await expect(verdict).toContainText('You predicted');
    await expect(verdict).toContainText('1.86');
  });

  test('the speed readings are taken, the prediction is set beside them, and the wedges come last', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);
    const predict = await walkToSid(page, plan, 'where-does-it-move-fastest');
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, 'fast-and-slow-in-numbers');
    // The periapsis watch arms itself once the prediction is committed.
    await expect(page.locator('body')).toContainText(/Watching|Armed/i);
    await choose(page, 'Eccentric Orbiter');
    const takes = page.locator('[data-take]');
    await expect(takes).toHaveCount(4);
    for (let i = 0; i < 4; i++) await takes.nth(i).click();
    const saved = await page.evaluate(() =>
      Object.entries(localStorage)
        .filter(([k]) => /keplers-laws/.test(k))
        .map(([, v]) => v)
        .join('\n')
    );
    expect(saved).toMatch(/v_peri:src/);

    await walkToSid(page, plan, 'why-the-speed-changes');
    await expect(page.locator('[data-verdict]')).toContainText('You predicted');
    // No wedge has been drawn yet.
    expect(
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return ui.state.areaSweepOverlay.active;
      })
    ).toBe(false);

    await walkToSid(page, plan, 'equal-areas-however-you-slice');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const ui = await import('/js/ui.js');
          return ui.state.areaSweepOverlay.active;
        })
      )
      .toBe(true);
  });

  test('five planets, an estimate held and checked, and a controlled run', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);
    await walkToSid(page, plan, 'measure-four-planets');
    for (const name of ['Mercury', 'Earth', 'Mars', 'Jupiter', 'Saturn']) {
      await choose(page, name);
      await page.locator('[data-import]').click();
    }
    await expect(page.locator('.inv-check')).toContainText(/agree to within/);
    // A point on the plot is the planet: choosing a row rings it.
    await expect(
      page.locator('.plot-table, .inv-plot, canvas').first()
    ).toBeVisible();

    await walkToSid(page, plan, 'pick-a-distance');
    await fieldInput(page, 'ninth planet').fill('2.5');
    await fieldInput(page, 'ninth planet').blur();
    await expect(page.locator('body')).toContainText('gap');

    const est = await walkToSid(page, plan, 'estimate-the-year');
    expect(est.sid).toBe('estimate-the-year');
    await page.locator('[data-est]').fill('4');
    await page.locator('[data-est-commit]').click();

    await walkToSid(page, plan, 'check-the-estimate');
    await choose(page, 'Mars');
    const takes = page.locator('[data-take]');
    await takes.nth(0).click();
    await takes.nth(1).click();
    // A period without the square root is refused with a sentence, not a value.
    const calc = fieldInput(page, 'from the law');
    await calc.fill('15.6');
    await calc.blur();
    await expect(page.locator('body')).toContainText('distance cubed');
    await calc.fill('3.95');
    await calc.blur();
    await expect(page.locator('body')).toContainText('agrees with scaling');

    await walkToSid(page, plan, 'compare-the-estimate');
    await expect(page.locator('[data-verdict]')).toContainText('You estimated');

    await walkToSid(page, plan, 'what-the-constant-depends-on');
    await page.getByRole('button', { name: 'Run A' }).click();
    await expect(page.locator('body')).toContainText('1.000 yr', {
      timeout: 120_000,
    });
    await page.getByRole('button', { name: /Change star mass/ }).click();
    await page.getByRole('button', { name: 'Run B' }).click();
    await expect(page.locator('body')).toContainText('0.707 yr', {
      timeout: 120_000,
    });
  });
  test('a planet clicked in TRAPPIST-1 draws its equal-area wedges', async ({
    page,
    app,
  }) => {
    test.slow();
    await openInvestigation(page, app, ID);
    const plan = await lessonPlan(page, ID);
    await walkToSid(page, plan, 'the-same-laws-forty-light');
    await choose(page, 'TRAPPIST-1e');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const ui = await import('/js/ui.js');
          const o = ui.state.areaSweepOverlay;
          return o.active && o.wedges.length;
        })
      )
      .toBeGreaterThan(0);
  });
});
