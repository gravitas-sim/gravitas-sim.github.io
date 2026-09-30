// =============================================================================
// The mission lab (/mission/lab/), in a browser
// -----------------------------------------------------------------------------
// tests/missionLab.test.js holds the pack, the model and the guides; this is
// the page and its Worker, against the sources and dist/ (where the Worker is
// a bundle carrying the ephemeris pack):
//   - the default mission is computed in the Worker, with its timeline, the
//     three views, the tables, and a slider that moves them;
//   - the orbit guide is walked, with a wrong answer, "Show me" and a "do"
//     step checked against the lab;
//   - the 2026 window is drawn, its candidates listed, and one becomes the plan;
//   - the cruise guide flies the design directly, diagnoses the miss, takes
//     an explanation and corrects the course, and the report is a file;
//   - a bad or out-of-range plan is refused on its field;
//   - the plan saves as a file that says what it is not for;
//   - the reference cases pass in the Worker;
//   - Spanish, axe in both languages, a phone width, and offline (sources).
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openLab(page, { locale, query = '' } = {}) {
  await page.addInitScript(l => {
    try {
      window.localStorage.clear();
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto(`/mission/lab/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 60_000,
  });
}
const compute = async page => {
  await page.locator('#ml-go').click();
  await expect(page.locator('#ml-status')).toHaveText(
    /^(Done|Hecho|Refused|Rechazado|Failed|Falló)/,
    { timeout: 60_000 }
  );
};
/** The value in a facts table's row, by its name. */
const row = (page, name) =>
  page
    .locator('#ml-results tr', { has: page.locator('th', { hasText: name }) })
    .locator('td')
    .first();
const step = page => page.locator('#ml-step');
const next = page =>
  page.locator('#ml-step').getByRole('button', { name: 'Next' }).click();
const feedback = page => page.locator('#ml-step .ml-feedback');
const lab = page => page.evaluate(() => window.__missionLab);

test.describe('the mission lab', () => {
  test('the default mission is computed in the Worker, with its timeline, views and tables @cross-browser', async ({
    page,
  }) => {
    await openLab(page);
    await expect(page.locator('#ml-status')).toHaveText('Done.');
    await expect(row(page, 'Departure C3')).toHaveText('9.2596 km²/s²');
    await expect(row(page, 'Departure burn')).toHaveText('3,595.2 m/s');
    await expect(
      row(page, 'Distance from Mars at the planned arrival')
    ).toHaveText('2,059,500 km');
    await expect(row(page, 'Wait before the first burn')).toHaveText(
      '171.2 min'
    );
    await expect(page.locator('#ml-views svg')).toHaveCount(3);
    await expect(page.locator('#ml-timeline tbody tr')).toHaveCount(8);
    await expect(page.locator('#ml-timeline')).toContainText('Departure burn');
    // The slider moves the markers and says where both spacecraft are.
    const before = await page.locator('#ml-views svg').first().innerHTML();
    await page
      .locator('#ml-timeline tr', { hasText: 'Closest to Mars' })
      .getByRole('button')
      .click();
    await expect(page.locator('#ml-slider')).toHaveValue('300');
    await expect(page.locator('#ml-slider-out')).toContainText(
      'Day 300 (2027-08-28)'
    );
    expect(await page.locator('#ml-views svg').first().innerHTML()).not.toBe(
      before
    );
    await expect(page.locator('#ml-positions')).toContainText(
      'Spacecraft, flown directly'
    );
  });

  test('the orbit guide: a wrong answer, "Show me", and a step done in the lab', async ({
    page,
  }) => {
    await openLab(page, { query: '?guide=ml-orbit&path=advanced' });
    await expect(step(page)).toContainText('Step 1 of 8');
    // A read step has words and buttons, and nothing else.
    await expect(step(page)).not.toContainText('null');
    await expect(step(page).locator('input, textarea')).toHaveCount(0);
    await next(page);
    await page.getByLabel('Climbing 100 km').check();
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toHaveText(
      'Recorded. The next steps measure it.'
    );
    await next(page);
    const total = (await lab(page)).mission.rendezvous.total * 1000;
    await page
      .getByLabel('Your answer (m/s)')
      .fill(String(Math.round(total + 10)));
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toHaveText(
      'Not quite. Look again at the tables, or ask to be shown.'
    );
    await step(page).getByRole('button', { name: 'Show me' }).click();
    await expect(feedback(page)).toContainText('The answer: 57.2013 m/s.');
    await page.getByLabel('Your answer (m/s)').fill('57,2');
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toContainText('Right: 57.2013 m/s');
    await next(page);
    await next(page);
    await page.getByLabel('Turning the plane by 5 degrees').check();
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toContainText('Right. A plane change swings');
    await next(page);
    // The "do" step: not done yet, then done by hand in the editor.
    await step(page)
      .getByRole('button', { name: 'Check that it is done' })
      .click();
    await expect(feedback(page)).toHaveText(
      'Not yet: the lab does not show it done.'
    );
    await page.locator('#ml-phase').fill('2.3');
    await compute(page);
    await step(page)
      .getByRole('button', { name: 'Check that it is done' })
      .click();
    await expect(feedback(page)).toContainText('Done: the depot now starts');
    await page
      .locator('#ml-step-list')
      .evaluate(d => (d.parentElement.open = true));
    await expect(page.locator('#ml-step-list')).toContainText(
      'The rendezvous’s cost (passed)'
    );
  });

  test('the 2026 window: drawn, four candidates, and one becomes the plan @cross-browser', async ({
    page,
  }) => {
    await openLab(page, { query: '?guide=ml-window' });
    await page.locator('#ml-window-go').click();
    await expect(page.locator('#ml-window-status')).toHaveText(
      'Finished: 19,026 cells.',
      { timeout: 60_000 }
    );
    await expect(page.locator('#ml-window-canvas')).toHaveAttribute(
      'aria-label',
      /cheapest cell is 5\.6369 km\/s, leaving 2026-11-01 for 310 days/
    );
    await expect(page.locator('#ml-window-out tbody tr')).toHaveCount(4);
    await page
      .locator('#ml-window-out tr', { hasText: 'Cheapest in delta-v' })
      .getByRole('button', { name: 'Use this' })
      .click();
    await expect(page.locator('#ml-tof')).toHaveValue('310');
    await expect(page.locator('#ml-status')).toHaveText('Done.');
    await expect(row(page, 'Departure C3')).toHaveText('9.2663 km²/s²');
    // The guide sees it done.
    for (let k = 0; k < 3; k++) await next(page);
    await step(page)
      .getByRole('button', { name: 'Check that it is done' })
      .click();
    await expect(feedback(page)).toContainText(
      'Done: the plan now leaves on the window’s cheapest day.'
    );
  });

  test('the cruise guide: the miss, its diagnosis, an explanation, a correction and the report', async ({
    page,
  }) => {
    await openLab(page, { query: '?guide=ml-cruise' });
    for (let k = 0; k < 2; k++) await next(page);
    await step(page)
      .getByRole('button', { name: 'Check that it is done' })
      .click();
    await expect(feedback(page)).toHaveText('Done.');
    await next(page);
    const miss = (await lab(page)).mission.direct.missKm / 1e6;
    await page.getByLabel('Your answer (million km)').fill(miss.toFixed(2));
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toContainText('Right: 2.0595 million km');
    await next(page);
    // Test the design: the Sun alone, from the Earth's center.
    for (const b of ['Venus', 'Earth', 'Mars', 'Jupiter'])
      await page.locator('#ml-bodies').getByLabel(b, { exact: true }).uncheck();
    await page
      .getByLabel('the Earth’s center, as the patched conic assumes')
      .check();
    await compute(page);
    expect((await lab(page)).mission.direct.missKm).toBeLessThan(0.01);
    await step(page)
      .getByRole('button', { name: 'Check that it is done' })
      .click();
    await expect(feedback(page)).toContainText('arrives within meters');
    await next(page);
    await page
      .getByLabel(/The Earth’s pull on a spacecraft leaving from a real orbit/)
      .check();
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toContainText(
      'Right. From the Earth’s center'
    );
    await next(page);
    await page
      .getByLabel('Your explanation (at least 25 words)')
      .fill('Too short.');
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toHaveText(
      'Write at least 25 words; that is 2.'
    );
    const words =
      'The patched conic ends the Earth pull at the sphere of influence and starts the ellipse at the center of the Earth, so a real departure is pulled differently and the error grows over many months of flight.';
    await page.getByLabel('Your explanation (at least 25 words)').fill(words);
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toHaveText('Recorded for your instructor.');
    await next(page);
    await step(page).getByRole('button', { name: 'Show me' }).click();
    await expect(feedback(page)).toHaveText('Done.', { timeout: 60_000 });
    await expect(page.locator('#ml-correct-on')).toBeChecked();
    await expect(row(page, 'Then misses Mars by')).toHaveText(/ km$/);
    await next(page);
    const dv = (await lab(page)).mission.correction.dv * 1000;
    await page.getByLabel('Your answer (m/s)').fill(dv.toFixed(1));
    await step(page).getByRole('button', { name: 'Check' }).click();
    await expect(feedback(page)).toContainText('Right:');
    await page
      .getByLabel('Your name, for the report (optional)')
      .fill('A. Student');
    const download = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Save the report as a file' })
      .click();
    const file = await download;
    const report = JSON.parse(await readFile(await file.path(), 'utf8'));
    expect(report.format).toBe('gravitas.mission-lab-report');
    expect(report.notFor).toBe('operational mission design or navigation');
    expect(report.name).toBe('A. Student');
    const cruise = report.guides.find(g => g.guide === 'ml-cruise');
    expect(cruise.steps.find(s => s.step === 'explain').input).toBe(words);
    expect(cruise.steps.find(s => s.step === 'correct')).toMatchObject({
      passed: true,
      shown: true,
    });
    expect(report.results.correctionDvKmS).toBeCloseTo(dv / 1000, 9);
    expect(JSON.stringify(report)).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  test('a bad or out-of-range plan is refused on its field', async ({
    page,
  }) => {
    await openLab(page);
    await page.locator('#ml-date').fill('2026-02-30');
    await compute(page);
    await expect(page.locator('#ml-status')).toHaveText(
      'Refused: Departure date: it must be a date, YYYY-MM-DD.'
    );
    await expect(page.locator('#ml-date')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(page.locator('#ml-results table')).toHaveCount(0);
    await page.locator('#ml-date').fill('2044-12-01');
    await compute(page);
    await expect(page.locator('#ml-status')).toContainText(
      'the ephemeris covers 2025-01-01 to 2045-01-01'
    );
    await page.locator('#ml-date').fill('2026-11-01');
    await page.locator('#ml-depot').fill('300');
    await compute(page);
    await expect(page.locator('#ml-depot')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await page.locator('#ml-depot').fill('400');
    await compute(page);
    await expect(page.locator('#ml-status')).toHaveText('Done.');
    await expect(page.locator('#ml-depot')).not.toHaveAttribute('aria-invalid');
  });

  test('the plan saves as a file that keeps inputs, model and results apart', async ({
    page,
  }) => {
    await openLab(page);
    const download = page.waitForEvent('download');
    await page.locator('#ml-save-plan').click();
    const plan = JSON.parse(
      await readFile(await (await download).path(), 'utf8')
    );
    expect(plan.format).toBe('gravitas.mission-plan');
    expect(plan.kind).toBe('missionLab');
    expect(plan.notFor).toBe('operational mission design or navigation');
    expect(plan.inputs.depart).toEqual({ date: '2026-11-01', tofDays: 309 });
    expect(plan.model.approximations).toContain('ephemerisPack');
    expect(plan.derived.patched.c3).toBeCloseTo(9.2596, 3);
    expect(plan.budget.rows).toHaveLength(4);
  });

  test('the reference cases pass in the Worker', async ({ page }) => {
    await openLab(page);
    await page.locator('#ml-check-go').click();
    await expect(page.locator('#ml-check-status')).toHaveText(
      /^Finished: \d+ measures, 0 failed\.$/,
      { timeout: 60_000 }
    );
    const r = await page.evaluate(() => window.__missionLabCheck);
    expect(r.cases.map(c => c.id)).toEqual([
      'E1',
      'E2',
      'E3',
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'D1',
      'D2',
    ]);
  });

  test('reads in Spanish, passes axe in both languages and fits a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openLab(page, { locale });
      await page.locator('#ml-window-go').click();
      await expect(page.locator('#ml-window-status')).toHaveText(
        /^(Finished|Terminado)/,
        { timeout: 60_000 }
      );
      if (locale === 'es') {
        await expect(page.locator('h1')).toHaveText(
          'Laboratorio de misiones: a Marte en 2026'
        );
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
        await expect(row(page, 'C3 de salida')).toHaveText('9,2596 km²/s²');
        await expect(step(page)).toContainText('Un depósito que alcanzar');
      }
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual(
        []
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
    // The shell's language switch waits for js/shell.js, which this route
    // cannot pay for yet (STATIC_ONLY in tests/shell.test.js): no control is
    // offered that does nothing, and a language chosen elsewhere in Gravitas
    // is the one the lab opens in, its numbers with it.
    await expect(page.locator('[data-gs-lang]')).toBeHidden();
    await openLab(page, { locale: 'en' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(row(page, 'Departure C3')).toHaveText('9.2596 km²/s²');
  });
});

test.describe('the mission lab offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('with the service worker installed, the lab opens offline', async ({
    page,
    context,
    app,
  }) => {
    test.skip(DIST, 'the service worker is the sources’; dist/ has its own');
    test.setTimeout(180_000);
    await app.boot();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const m = await import('/js/offline.js');
            const s = await m.cacheStatus(2000);
            return s && s.cachedCount >= s.precacheCount;
          }),
        { timeout: 120_000, intervals: [500] }
      )
      .toBe(true);
    await context.setOffline(true);
    await openLab(page);
    await expect(row(page, 'Departure C3')).toHaveText('9.2596 km²/s²');
  });
});
