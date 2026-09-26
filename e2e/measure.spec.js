// =============================================================================
// The observatory's measurement pipeline, in a browser
// -----------------------------------------------------------------------------
// tests/measure.test.js holds the tools and the pipeline without a page:
// synthetic truth, cited reference cases, the document and its migrations.
// This is the panel, against the published sources and dist/, where it is a
// lazy chunk of the observatory's bundle:
//   - nothing of it loads until it is opened;
//   - each kind of observation gets its tool, and the result says what each
//     number is: a transit period, a Balmer-line velocity, the aperture's
//     pixels, a filter on the GWTC masses;
//   - a result becomes a change (fold at the period, mask what a filter
//     failed), and the pipeline shows it in place;
//   - an undo behind a result makes it stale, and recomputing makes it
//     current;
//   - undo and redo of the measurements themselves;
//   - saved, and read back to the same numbers;
//   - a long search can be canceled;
//   - a result goes into the notebook with where its data came from;
//   - no accessibility violations, in English and in Spanish, and a language
//     switch keeps the measurements.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openFixture(page, id) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption(id);
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
}
async function openPanel(page) {
  await page.locator('#obsMeasurePanel > summary').click();
  await expect(page.locator('#msRun')).toBeVisible({ timeout: 30_000 });
}
async function measure(page, tool, id = 'm1') {
  await page.locator('#msTool').selectOption(tool);
  await page.locator('#msRun').click();
  const node = page.locator(`#msNodes li[data-node="${id}"]`);
  await expect(node.locator('table')).toBeVisible({ timeout: 60_000 });
  return node;
}
const value = async (node, id) =>
  node.locator(`tr[data-quantity="${id}"] td`).first().innerText();
const kind = async (node, id) =>
  node.locator(`tr[data-quantity="${id}"] td`).nth(1).innerText();
// The first number in a cell, whatever unit or digit grouping follows it.
const num = text =>
  Number(
    /[-−]?[\d.]+(?:e[-+]?\d+)?/i
      .exec(text.replace(/[\u2009\u202f\u00a0]/g, ''))?.[0]
      .replace('−', '-')
  );
const axe = async page =>
  (
    await new AxeBuilder({ page })
      .include('#obsMeasurePanel')
      .withTags(TAGS)
      .analyze()
  ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

test.describe('the measurement pipeline', () => {
  test('nothing of it loads until it is opened', async ({ page }) => {
    const loaded = [];
    page.on('request', r => loaded.push(r.url()));
    await openFixture(page, 'tess-light-curve');
    if (!DIST)
      expect(
        loaded.filter(u => /\/js\/measure\/|measurePanel|\.measure\.js/.test(u))
      ).toEqual([]);
    await expect(page.locator('#msBody')).toHaveCount(0);
    const before = loaded.length;
    await openPanel(page);
    expect(
      loaded.slice(before).filter(u => u.endsWith('.js')).length
    ).toBeGreaterThan(0);
  });

  test('a transit search finds HD 209458 b, folds at its period, and the pipeline shows both', async ({
    page,
  }) => {
    await openFixture(page, 'tess-light-curve');
    await openPanel(page);
    const node = await measure(page, 'box');
    // Knutson et al. 2007: 3.52474859 d. One sector, seven transits.
    expect(
      Math.abs(num(await value(node, 'period')) - 3.52474859)
    ).toBeLessThan(0.002);
    expect(await kind(node, 'period')).toBe('measured');
    expect(await kind(node, 'sde')).toBe('derived');
    await expect(node).toContainText('gives no uncertainty on the period');
    await node.locator('button[data-action="fold"]').click();
    const pipeline = page.locator('#msPipeline');
    await expect(
      pipeline.locator('li[data-stage="transformation"]')
    ).toHaveCount(1);
    // The measurement came before the fold, and still sees what it measured.
    await expect(pipeline.locator('li').nth(1)).toHaveAttribute(
      'data-stage',
      'measurement'
    );
    await expect(node.locator('[data-status]')).toHaveAttribute(
      'data-status',
      'current'
    );
    await expect(page.locator('#msMethods')).toContainText(
      'Kovacs, Zucker & Mazeh 2002'
    );
  });

  test('an undo behind a result makes it stale, and recomputing makes it current', async ({
    page,
  }) => {
    await openFixture(page, 'tess-light-curve');
    await page.locator('details:has(#obsNormGo) > summary').click();
    await page.locator('#obsNormGo').click();
    await openPanel(page);
    const node = await measure(page, 'box');
    await expect(node.locator('[data-status]')).toHaveAttribute(
      'data-status',
      'current'
    );
    await page.locator('#obsUndo').click();
    await expect(node.locator('[data-status]')).toHaveAttribute(
      'data-status',
      'stale'
    );
    await node.locator('button[data-action="recompute"]').click();
    await expect(
      page.locator('#msNodes li[data-node="m1"] [data-status]')
    ).toHaveAttribute('data-status', 'current', { timeout: 60_000 });
  });

  test("a Balmer line: the A star's velocity is SDSS's own redshift, and the rest wavelength is assumed", async ({
    page,
  }) => {
    await openFixture(page, 'sdss-a');
    await openPanel(page);
    const node = await measure(page, 'line');
    const [v, err] = (await value(node, 'velocity')).split('±').map(num);
    // SDSS DR18: z = -0.0008099225, cz = -242.8 km/s.
    expect(Math.abs(v - -242.8) / err).toBeLessThan(2);
    expect(await kind(node, 'rest')).toBe('assumed');
    expect(await kind(node, 'velocity')).toContain('derived');
    expect(await kind(node, 'ew')).toContain('error assumed');
  });

  test("the TESS aperture: NPIXSAP's 23 pixels, and where on the sky they center", async ({
    page,
  }) => {
    await openFixture(page, 'tess-aperture');
    await openPanel(page);
    const node = await measure(page, 'aperture');
    expect(num(await value(node, 'count'))).toBe(23);
    // HD 209458: RA 330.7949, Dec +18.8843, within a TESS pixel.
    expect(Math.abs(num(await value(node, 'ra')) - 330.7949)).toBeLessThan(
      0.006
    );
    expect(Math.abs(num(await value(node, 'dec')) - 18.8843)).toBeLessThan(
      0.006
    );
  });

  test('a filter on the GWTC masses keeps the three black-hole pairs, and masks the rest', async ({
    page,
  }) => {
    await openFixture(page, 'gwosc-events');
    await openPanel(page);
    await page.locator('#msTool').selectOption('filter');
    await page.locator('#msCol0').selectOption('mass_2_source');
    await page.locator('#msOp0').selectOption('>');
    await page.locator('#msVal0').fill('3');
    await expect(page.locator('#msUnit0')).toHaveText('in Msun');
    await page.locator('#msRun').click();
    const node = page.locator('#msNodes li[data-node="m1"]');
    await expect(node.locator('table')).toBeVisible();
    expect(num(await value(node, 'kept'))).toBe(3);
    await node.locator('button[data-action="mask"]').click();
    await expect(
      page.locator('#msPipeline li[data-stage="selection"]')
    ).toHaveCount(1);
  });

  test('a cross-match pairs the GWTC events with a second table, one to one', async ({
    page,
  }) => {
    await openFixture(page, 'gwosc-events');
    await openPanel(page);
    await page.locator('#msTool').selectOption('match');
    // Two distances that are GW150914's and GW170817's, and one that is none.
    await page.locator('#msSecond').setInputFiles({
      name: 'distances.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('source,d (Mpc)\nA,471\nB,41\nC,9999\n'),
    });
    await expect(page.locator('#msSecondNote')).toHaveText(
      'Second table: 3 rows, 2 columns.'
    );
    await page.locator('#msA').selectOption('luminosity_distance');
    await page.locator('#msB').selectOption({ label: 'd (Mpc)' });
    await page.locator('#msTol').fill('5');
    await page.locator('#msRun').click();
    const node = page.locator('#msNodes li[data-node="m1"]');
    await expect(node.locator('table')).toBeVisible();
    expect(num(await value(node, 'pairs'))).toBe(2);
    expect(num(await value(node, 'unmatched'))).toBe(3);
  });

  test('the measurements have their own undo and redo', async ({ page }) => {
    await openFixture(page, 'gwosc-events');
    await openPanel(page);
    await page.locator('#msTool').selectOption('filter');
    await page.locator('#msCol0').selectOption('mass_1_source');
    await page.locator('#msVal0').fill('30');
    await page.locator('#msRun').click();
    await expect(page.locator('#msNodes li[data-node="m1"]')).toBeVisible();
    await page
      .locator('#msNodes li[data-node="m1"] button[data-action="remove"]')
      .click();
    await expect(page.locator('#msNodes li[data-node]')).toHaveCount(0);
    await page.locator('#msUndo').click();
    await expect(page.locator('#msNodes li[data-node="m1"]')).toBeVisible();
    await page.locator('#msRedo').click();
    await expect(page.locator('#msNodes li[data-node]')).toHaveCount(0);
  });

  test('saved, and read back to the same numbers', async ({ page }) => {
    await openFixture(page, 'tess-light-curve');
    await openPanel(page);
    await measure(page, 'box');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#msSave').click(),
    ]);
    const text = await (await download.createReadStream()).toArray();
    const saved = Buffer.concat(text).toString('utf8');
    const doc = JSON.parse(saved);
    expect(doc.format).toBe('gravitas.pipeline');
    expect(doc.nodes[0]).toMatchObject({
      tool: 'box',
      at: 0,
      version: '1.0.0',
    });
    expect(doc.observation.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.methods.join(' ')).toContain('Kovacs');
    // Another observation on screen, then the file opened: the workspace
    // replays, and the node recomputes to the number it saved.
    await page.locator('#obsFixture').selectOption('sdss-a');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsTitle')).toContainText('SDSS');
    await expect(page.locator('#msNodes li[data-node]')).toHaveCount(0);
    await page.locator('#msOpen').setInputFiles({
      name: 'p.json',
      mimeType: 'application/json',
      buffer: Buffer.from(saved),
    });
    await expect(page.locator('#msBusy')).toHaveText(
      'Read back: every measurement gives the number it saved.',
      { timeout: 60_000 }
    );
    await expect(page.locator('#obsTitle')).toContainText('HD 209458');
    await expect(
      page.locator('#msNodes li[data-node="m1"] [data-readback]')
    ).toHaveAttribute('data-readback', 'same');
  });

  test('a period search can be canceled, and leaves nothing behind', async ({
    page,
  }) => {
    await openFixture(page, 'tess-light-curve');
    await openPanel(page);
    await page.locator('#msTool').selectOption('period');
    // Measure, then Cancel, in one task: the abort is set before the search
    // does any work, so this is the search's own abort check being tested
    // rather than a race against a search that takes a third of a second.
    await page.evaluate(() => {
      document.getElementById('msRun').click();
      document.getElementById('msCancel').click();
    });
    await expect(page.locator('#obsStatus')).toHaveText('Canceled.');
    await expect(page.locator('#msCancel')).toBeHidden();
    await expect(page.locator('#msNodes li[data-node]')).toHaveCount(0);
    await expect(page.locator('#msRun')).toBeEnabled();
  });

  test('a result goes into the notebook, with where its data came from', async ({
    page,
  }) => {
    await openFixture(page, 'tess-light-curve');
    await openPanel(page);
    const node = await measure(page, 'box');
    await node.locator('button[data-action="notebook"]').click();
    await expect(page.locator('#obsStatus')).toContainText(
      'Added to your notebook'
    );
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_evidence_notebook'))
    );
    const entry = saved.entries.at(-1);
    expect(entry.source).toBe('observatory');
    expect(entry.snapshot.observed).toMatchObject({
      format: 'gravitas.observed',
      observation: { id: 'pack:tess-hd209458-s56-lc@1.0.0' },
      tool: { id: 'box', version: '1.0.0', at: 0 },
    });
    expect(entry.snapshot.quantities.map(q => q.kind)).toEqual(
      entry.snapshot.quantities.map(() => 'measured')
    );
    expect(entry.snapshot.observed.rows.length).toBeGreaterThan(4);
    // The periodogram goes in as its figure, within the notebook's limit.
    expect(entry.snapshot.figure.series[0].points.length).toBeLessThanOrEqual(
      400
    );
    expect(entry.snapshot.figure.series[0].points.length).toBeGreaterThan(100);
  });

  test('no accessibility violations, in English and Spanish, and a language switch keeps the measurements', async ({
    page,
    errors,
  }) => {
    // axe-core's icon-ligature check draws a character on a small canvas and
    // reads it back (axe.js, getImageData); WebKit sometimes refuses the read
    // and logs this. It is the test tool's, not the page's: nothing in js/
    // reads canvas pixels.
    const axeCanvas = /^Unable to get image data from canvas/;
    const push = errors.consoleErrors.push.bind(errors.consoleErrors);
    Object.defineProperty(errors.consoleErrors, 'push', {
      value: (...items) => push(...items.filter(e => !axeCanvas.test(e))),
      enumerable: false,
    });
    await openFixture(page, 'tess-light-curve');
    await openPanel(page);
    await measure(page, 'box');
    await page
      .locator('#msNodes li[data-node="m1"] button[data-action="periodogram"]')
      .click();
    await expect(
      page.locator('#msNodes li[data-node="m1"] svg.ow-plot')
    ).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(page.locator('#msNodes li[data-node="m1"]')).toContainText(
      'Búsqueda de tránsitos'
    );
    await expect(
      page.locator('#msNodes li[data-node="m1"] tr[data-quantity="period"] th')
    ).toHaveText('Periodo');
    expect(await axe(page)).toEqual([]);
  });
});
