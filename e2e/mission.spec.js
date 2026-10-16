// =============================================================================
// The mission-design diagnostics page (/mission/), in a browser
// -----------------------------------------------------------------------------
// tools/validate-mission.mjs holds the solvers to their reference cases in
// Node, and tests/mission.test.js their properties. This is the page and its
// Worker, against the sources and dist/ (where the Worker is a bundle of its
// own):
//   - each section asks the Worker and shows the answer, its budget and its
//     timeline;
//   - what a solver refuses is said, with the reason, and no numbers;
//   - a transfer window is drawn, described, canceled between slices and
//     saved as CSV;
//   - a plan saves as a file that says what it is not for;
//   - the reference cases pass in the Worker;
//   - it reads in Spanish, passes axe and fits a phone.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openPage(page, locale) {
  await page.addInitScript(l => {
    try {
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto('/mission/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}
const compute = async (page, sid) => {
  await page.locator(`#${sid}-go`).click();
  await expect(page.locator(`#${sid}-status`)).toHaveText(
    /^(Done|Hecho|Refused|Rechazado|Failed|Falló|Finished|Terminado|Canceled|Cancelado)/,
    { timeout: 60_000 }
  );
};
/** The value in a facts table's row, by the row's name. */
const row = (page, sid, name) =>
  page
    .locator(`#${sid}-out tr`, { has: page.locator('th', { hasText: name }) })
    .locator('td')
    .first();

test.describe('the mission diagnostics page', () => {
  test('each section solves in the Worker, with its budget and timeline @cross-browser', async ({
    page,
  }) => {
    await openPage(page);
    await compute(page, 'mn-transfer');
    await expect(page.locator('#mn-transfer-status')).toHaveText('Done.');
    await expect(page.locator('#mn-transfer-out')).toContainText('3.8926 km/s');
    await expect(
      row(page, 'mn-transfer', 'Changed at the first burn')
    ).toHaveText('2.2°');
    await expect(
      page.locator('#mn-transfer-out caption', { hasText: 'Delta-v budget' })
    ).toHaveCount(1);
    await expect(page.locator('#mn-transfer-out')).toContainText('Arrive');

    await compute(page, 'mn-lambert');
    await expect(row(page, 'mn-lambert', 'Velocity at the start')).toHaveText(
      '(2.05891; 2.91596; 0) km/s'
    );
    await expect(row(page, 'mn-lambert', 'Status')).toHaveText(
      'Converged and confirmed'
    );

    await compute(page, 'mn-planets');
    await expect(row(page, 'mn-planets', 'Departure burn')).toHaveText(
      '3.59 km/s'
    );
    await expect(row(page, 'mn-planets', 'Time of flight')).toHaveText(
      '258.9 days'
    );

    await compute(page, 'mn-meet');
    await expect(row(page, 'mn-meet', 'Method')).toHaveText(
      'A Hohmann transfer'
    );
    await expect(page.locator('#mn-meet-out')).toContainText('Meet the target');
    await page.locator('#mn-meet-h2').fill('300');
    await page.locator('#mn-meet-phase').fill('20');
    await compute(page, 'mn-meet');
    await expect(row(page, 'mn-meet', 'Method')).toHaveText('A phasing orbit');

    await compute(page, 'mn-flyby');
    await expect(row(page, 'mn-flyby', 'Turn angle')).toHaveText('129.4°');
  });

  test('what a solver refuses is said, with the reason and no numbers', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#mn-lambert-r2').fill('-15945.34, 0, 0');
    await compute(page, 'mn-lambert');
    await expect(page.locator('#mn-lambert-status')).toContainText(
      'Refused: the two positions are within 0.06 degrees of opposite'
    );
    await expect(page.locator('#mn-lambert-out table')).toHaveCount(0);
    await expect(page.locator('#mn-lambert-export')).toBeDisabled();

    await page.locator('#mn-lambert-r2').fill('1, 2');
    await compute(page, 'mn-lambert');
    await expect(page.locator('#mn-lambert-status')).toHaveText(
      'Refused: A position needs three numbers.'
    );

    await page.locator('#mn-flyby-alt').fill('-1000');
    await compute(page, 'mn-flyby');
    await expect(page.locator('#mn-flyby-status')).toHaveText(
      'Refused: the path would pass below the surface.'
    );

    await page.locator('#mn-transfer-hb').fill('1000');
    await compute(page, 'mn-transfer');
    await expect(page.locator('#mn-transfer-out')).toContainText(
      'the intermediate apoapsis must be at least as high as both orbits.'
    );

    await page.locator('#mn-window-steps').fill('401');
    await compute(page, 'mn-window');
    await expect(page.locator('#mn-window-status')).toHaveText(
      'Refused: Steps must be a whole number from 1 to 400. Steps must be a whole number from 1 to 400.'
    );
  });

  test('a transfer window is drawn, described, canceled and saved as CSV @cross-browser', async ({
    page,
  }) => {
    await openPage(page);
    await compute(page, 'mn-window');
    await expect(page.locator('#mn-window-status')).toHaveText(
      /^Finished: 3,721 cells in [\d.]+ s\.$/
    );
    await expect(row(page, 'mn-window', 'Departure')).toHaveText('2024-09-26');
    await expect(row(page, 'mn-window', 'Total of both burns')).toHaveText(
      '5.6811 km/s'
    );
    await expect(page.locator('#mn-window-canvas')).toHaveAttribute(
      'aria-label',
      /cheapest cell, 5\.6811 km\/s/
    );
    await expect(page.locator('#mn-window-out')).toContainText(
      'Refused: within 0.06 degrees of 180'
    );
    // The plot is drawn: more than a handful of colors on the canvas.
    const colors = await page.locator('#mn-window-canvas').evaluate(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4 * 61)
        seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return seen.size;
    });
    expect(colors).toBeGreaterThan(50);

    const csv = page.waitForEvent('download');
    await page.locator('#mn-window-csv').click();
    const lines = (await readFile(await (await csv).path(), 'utf8'))
      .trim()
      .split('\n');
    expect(lines).toHaveLength(3722);
    expect(lines[0]).toBe(
      'departure,tof_days,c3_km2_s2,vinf_arrival_km_s,total_dv_km_s,status'
    );
    expect(lines.filter(l => l.endsWith(',antipodal'))).toHaveLength(4);

    // A window of the largest size, canceled at once. Go and Cancel in one
    // task, so the cancel is waiting before the Worker starts: it stops after
    // its first slice however fast the machine is. Clicking Cancel once the
    // status said "Working" raced a runner that finished all 40,000 cells
    // first.
    await page.locator('#mn-window-steps').fill('200');
    await page.locator('#mn-window-span').fill('700');
    await page.evaluate(() => {
      document.getElementById('mn-window-go').click();
      document.getElementById('mn-window-cancel').click();
    });
    await expect(page.locator('#mn-window-status')).toHaveText(
      'Canceled: the cells computed so far are shown.',
      { timeout: 30_000 }
    );
    const done = await page.evaluate(() => window.__missionWindow);
    expect(done.status).toBe('canceled');
    // The rows computed before it stopped are kept and shown.
    expect(done.rows).toBeGreaterThan(0);
    expect(done.rows).toBeLessThan(200);
    await expect(page.locator('#mn-window-go')).toBeEnabled();
  });

  test('a plan saves as a file that keeps inputs, model and results apart', async ({
    page,
  }) => {
    await openPage(page);
    await compute(page, 'mn-transfer');
    const download = page.waitForEvent('download');
    await page.locator('#mn-transfer-export').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('gravitas-mission-planeChange.json');
    const plan = JSON.parse(await readFile(await file.path(), 'utf8'));
    expect(plan.format).toBe('gravitas.mission-plan');
    expect(plan.notFor).toBe('operational mission design or navigation');
    expect(plan.inputs).toMatchObject({
      body: 'earth',
      altitude1: 300,
      altitude2: 35786,
      planeChangeDeg: 28.5,
    });
    expect(plan.model.approximations).toEqual([
      'impulsive',
      'pointMass',
      'twoBody',
      'circularOrbits',
    ]);
    expect(plan.model.bodies.earth.GM).toBe(398600.4418);
    expect(plan.budget.rows).toHaveLength(2);
    expect(plan.derived.search.converged).toBe(true);
  });

  test('the reference cases pass in the Worker', async ({ page }) => {
    await openPage(page);
    await page.locator('#mn-check-go').click();
    await expect(page.locator('#mn-check-status')).toHaveText(
      /^Finished: \d+ measures, 0 failed, in [\d.]+ s\.$/,
      { timeout: 60_000 }
    );
    const r = await page.evaluate(() => window.__missionCheck);
    expect(r.cases.map(c => c.id)).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'K1',
      'H1',
      'H2',
      'H3',
      'P1',
      'R1',
      'R2',
      'C1',
      'C2',
      'F1',
      'W1',
      'M1',
    ]);
    expect(r.cases.flatMap(c => c.measures).every(m => m.ok)).toBe(true);
  });

  test('reads in Spanish, passes axe in both languages and fits a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openPage(page, locale);
      await compute(page, 'mn-transfer');
      await compute(page, 'mn-window');
      if (locale === 'es') {
        await expect(page.locator('h1')).toHaveText(
          'Diagnóstico de diseño de misiones'
        );
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
        await expect(page.locator('#mn-transfer-status')).toHaveText('Hecho.');
        await expect(page.locator('#mn-transfer-out')).toContainText(
          '3,8926 km/s'
        );
        await expect(page.locator('#mn-window-status')).toHaveText(
          /^Terminado: 3721 celdas en [\d,]+ s\.$/
        );
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
    // Switching language redraws what is on the page in the new one.
    await page.locator('#langSwitch button[lang="en"]').click();
    await expect(page.locator('#mn-transfer-out')).toContainText('3.8926 km/s');
    await expect(page.locator('#mn-window-status')).toHaveText(
      /^Finished: 3,721 cells/
    );
  });
});
