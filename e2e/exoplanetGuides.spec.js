// =============================================================================
// The Exoplanet Observatory's guided investigations, in a browser
// -----------------------------------------------------------------------------
// tests/exoplanetGuides.test.js holds the guides as data, science.js on
// synthetic light curves, and every answer on the real packs. This is the
// page, against the sources and dist/:
//   - ?guide= opens the panel and the guide, a step's button opens its
//     observation, and the guide sees it open;
//   - a typed answer is checked against the data: a wrong one says so and can
//     show the answer, the right one passes;
//   - a box search run in the measurement panel passes the step waiting for
//     it, and so does the fold its result offers;
//   - Kepler-13 installs from the catalog when a step opens it;
//   - the answers go to the notebook as an Observatory entry;
//   - Spanish, and no accessibility violations in either language.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openGuide(page, query) {
  await page.goto(`/observatory/?${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await expect(page.locator('#gdStepTitle')).toBeVisible({ timeout: 30_000 });
}
const title = page => page.locator('#gdStepTitle');
const feedback = page => page.locator('#gdFeedback');
const next = page => page.locator('#gdNext').click();
const opens = (page, n) =>
  expect(page.locator('html')).toHaveAttribute('data-opens', String(n), {
    timeout: 30_000,
  });
/** Jump to a step by its place in the progress list, 1-based. */
const jump = (page, n) =>
  page.locator(`#gdProgress li:nth-child(${n}) button`).click();

test.describe('the Exoplanet Observatory guides', () => {
  test('open from a link, see an observation opened, and check an answer', async ({
    page,
  }) => {
    await openGuide(page, 'guide=exo-star');
    await expect(title(page)).toHaveText(
      'Step 1 of 9: Before the planet, the light'
    );
    await next(page);
    await expect(title(page)).toContainText('Step 2 of 9');
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await expect(page.locator('#obsTitle')).toContainText('HD 209458');
    await expect(feedback(page)).toContainText('Open.');
    await expect(
      page.locator('#gdProgress li:nth-child(2) button')
    ).toHaveAttribute('data-state', 'done');

    await next(page);
    await page.locator('#gdAnswer').fill('12');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'false');
    await expect(page.locator('#gdReveal')).toBeVisible();
    await page.locator('#gdAnswer').fill('1288');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
    await expect(feedback(page)).toContainText('1288 cadences');

    // Progress outlives a reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(title(page)).toContainText('Step 3 of 9', { timeout: 30_000 });
    await expect(
      page.locator('#gdProgress li:nth-child(3) button')
    ).toHaveAttribute('data-state', 'done');
  });

  test('a box search and its fold pass the steps waiting for them', async ({
    page,
  }) => {
    await openGuide(page, 'guide=exo-find');
    await jump(page, 3);
    await expect(title(page)).toContainText('Search for it');
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await expect(page.locator('#msRun')).toBeVisible({ timeout: 30_000 });
    await page.locator('#msTool').selectOption('box');
    await page.locator('#msRun').click();
    const node = page.locator('#msNodes li[data-node="m1"]');
    await expect(node.locator('table')).toBeVisible({ timeout: 60_000 });
    await expect(feedback(page)).toContainText(
      /Found: a period of 3\.52\d* days/,
      { timeout: 30_000 }
    );

    await next(page);
    await page.locator('#gdAnswer').fill('3.524');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');

    await next(page);
    await expect(title(page)).toContainText('Fold it');
    await node.locator('button[data-action="fold"]').click();
    await expect(feedback(page)).toContainText(/Folded at 3\.52\d* days/, {
      timeout: 30_000,
    });
  });

  test('Kepler-13 installs from the catalog when a step opens it', async ({
    page,
  }) => {
    await openGuide(page, 'guide=exo-dilution');
    await next(page);
    await expect(page.locator('#gdGo')).toContainText('from the catalog');
    await page.locator('#gdGo').click();
    await opens(page, 1);
    await expect(page.locator('#obsTitle')).toContainText(
      'Kepler-13A: TESS sector 14 light curve, as collected (SAP)'
    );
    await expect(feedback(page)).toContainText('Open.');
    // The pack's record carries the pipeline's crowding estimate.
    await expect(page.locator('#obsWork')).toContainText('CROWDSAP 0.5492385');

    await next(page);
    await page.locator('#gdGo').click();
    await opens(page, 2);
    await expect(page.locator('#obsTitle')).toContainText('(PDCSAP)');

    await next(page);
    await next(page);
    await expect(title(page)).toContainText('Both depths, measured alike');
    await expect(page.locator('#gdShow dd')).toHaveCount(3, {
      timeout: 30_000,
    });
    await expect(page.locator('#gdShow')).toContainText('parts per million');
    await page.locator('#gdAnswer').fill('0.568');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
  });

  test('the answers go to the notebook as an Observatory entry', async ({
    page,
  }) => {
    await openGuide(page, 'guide=exo-planet');
    await jump(page, 6);
    await expect(title(page)).toContainText('The simulation’s HD 209458');
    await page.locator('#gdAnswer').fill('0.1228');
    await page.locator('#gdCheck').click();
    await expect(feedback(page)).toHaveAttribute('data-ok', 'true');
    await jump(page, 8);
    await page.locator('#gdNotebook').click();
    await expect(feedback(page)).toContainText('Added to the notebook.');
    const entry = await page.evaluate(() => {
      const all = JSON.parse(
        localStorage.getItem('gravitas_evidence_notebook')
      );
      return (all.entries ?? all).at(-1);
    });
    expect(entry.source).toBe('observatory');
    expect(entry.snapshot.observed.tool.id).toBe('guide:exo-planet');
    expect(entry.snapshot.quantities).toEqual([
      expect.objectContaining({ value: 0.1228, kind: 'measured' }),
    ]);
  });

  test('in Spanish, and with no accessibility violations in either language', async ({
    page,
  }) => {
    await openGuide(page, 'guide=exo-fit&path=advanced');
    await expect(title(page)).toContainText('Step 1 of 9');
    const axe = async () =>
      (
        await new AxeBuilder({ page })
          .include('#obsGuidePanel')
          .withTags(TAGS)
          .analyze()
      ).violations.map(v => `${v.id}: ${v.nodes.length}`);
    expect(await axe()).toEqual([]);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(title(page)).toHaveText(
      'Paso 1 de 9: Un modelo de un tránsito'
    );
    await expect(page.locator('#obsGuidePanel > summary')).toHaveText(
      /Investigaciones guiadas/
    );
    await next(page);
    await expect(page.locator('#gdGo')).toHaveText(
      'Abrir la curva de luz de HD 209458'
    );
    expect(await axe()).toEqual([]);
  });
});
