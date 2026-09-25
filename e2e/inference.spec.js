// =============================================================================
// The inference core's diagnostic panel, in a browser
// -----------------------------------------------------------------------------
// tests/inference.test.js holds the core's numerics without a page. This is
// the core where a reader meets it, the observatory's fit panel, against the
// sources and against dist/, where the panel is a chunk and the realm a
// bundle of its own:
//   - the panel is not loaded until it is opened, and the page carries none
//     of the core before then;
//   - a fit runs in disposable Workers, each closed when it answers, and
//     leaves the observation on the page as it was;
//   - its manifest exports, naming the data pack, the model and its version,
//     the bounds and the algorithm;
//   - a cancel stops every realm it started;
//   - an oversized request is refused, with its reason, before it runs;
//   - a change to the data clears a result that no longer describes it;
//   - no accessibility violations with a result on the page.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openLightCurve(page) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption('tess-light-curve');
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
    timeout: 30_000,
  });
}

async function openPanel(page) {
  await page.locator('#obsFitPanel summary').click();
  await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#fitEstimate')).toContainText(/About \d+ s/);
}

/** Every realm the page starts, and whether it has closed. */
function watchRealms(page) {
  const realms = [];
  page.on('worker', w => {
    if (!w.url().includes('inferenceWorker')) return;
    const r = { url: w.url(), closed: false };
    realms.push(r);
    w.on('close', () => (r.closed = true));
  });
  return realms;
}

test.describe('the inference core', () => {
  test('fits in Workers, leaves the page as it was, and exports its manifest', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const realms = watchRealms(page);
    await openLightCurve(page);
    const before = await page.locator('#obsTable tbody').innerText();
    const caption = await page.locator('#obsTable caption').innerText();
    // Nothing of the core before the panel is opened.
    expect(realms).toEqual([]);
    await openPanel(page);
    await page.locator('#fitProfiles').uncheck();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 120_000,
    });
    // One realm for the fit, closed when it answered.
    expect(realms.length).toBe(1);
    await expect.poll(() => realms.every(r => r.closed)).toBe(true);
    // Fitted, derived, and what it does not claim.
    const results = page.locator('#fitResults');
    await expect(results).toContainText('Rp/R*');
    await expect(results).toContainText('Total duration');
    await expect(results).toContainText('mass and density');
    // The observation on the page is untouched.
    expect(await page.locator('#obsTable tbody').innerText()).toBe(before);
    expect(await page.locator('#obsTable caption').innerText()).toBe(caption);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#fitExport').click(),
    ]);
    const doc = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(doc.format).toBe('gravitas.inference');
    expect(doc.formatVersion).toBe(1);
    expect(doc.model).toEqual({ id: 'transit-quadratic', version: '1.0.0' });
    expect(doc.data.source.id).toMatch(/tess-hd209458-s56/);
    expect(doc.data.used).toBe(1882);
    expect(doc.parameters.P).toMatchObject({ mode: 'fitted', lo: 1 });
    expect(doc.algorithm).toMatchObject({ id: 'grid-lm', version: '1.0.0' });
    expect(doc.engine.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    const k = doc.results.fit.parameters.find(p => p.name === 'k');
    expect(Math.abs(k.value - 0.1209)).toBeLessThan(0.005);
    expect(doc.results.fit.residualCount).toBe(1882);
    expect(doc.results.fit.residuals).toBeUndefined();
    expect(errors).toEqual([]);
  });

  test('a cancel stops every realm it started', async ({ page }) => {
    const realms = watchRealms(page);
    await openLightCurve(page);
    await openPanel(page);
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitCancel')).toBeVisible();
    await expect.poll(() => realms.length).toBeGreaterThan(0);
    await page.locator('#fitCancel').click();
    await expect(page.locator('#fitStatus')).toContainText(
      'did not finish (canceled)'
    );
    await expect.poll(() => realms.every(r => r.closed)).toBe(true);
    await expect(page.locator('#fitRun')).toBeEnabled();
    await expect(page.locator('#fitExport')).toBeHidden();
  });

  test('refuses an oversized request before it runs, and says why', async ({
    page,
  }) => {
    const realms = watchRealms(page);
    await openLightCurve(page);
    await openPanel(page);
    await page.locator('#fitLo-P').fill('0.3');
    await page.locator('#fitHi-P').fill('100');
    await page.locator('#fitHi-P').dispatchEvent('change');
    await expect(page.locator('#fitRefusals')).toContainText(
      'trial periods to search'
    );
    await expect(page.locator('#fitRun')).toBeDisabled();
    expect(realms).toEqual([]);
  });

  test('a change to the data clears a result that no longer describes it, and none has axe violations', async ({
    page,
  }) => {
    await openLightCurve(page);
    await openPanel(page);
    await page.locator('#fitProfiles').uncheck();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 120_000,
    });
    const violations = (
      await new AxeBuilder({ page })
        .include('#obsFitPanel')
        .withTags(TAGS)
        .analyze()
    ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
    expect(violations).toEqual([]);
    // Fold it: the result was for the unfolded series.
    await page.locator('.ow-panel summary', { hasText: 'Change' }).click();
    await page.locator('#obsFoldPeriod').fill('3.52474859');
    await page.locator('#obsFoldGo').click();
    await expect(page.locator('#obsSeeing')).toContainText(
      'Folded on a period'
    );
    await expect(page.locator('#fitResults')).toBeEmpty();
    await expect(page.locator('#fitExport')).toBeHidden();
  });
});
