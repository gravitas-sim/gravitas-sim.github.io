// =============================================================================
// The transit model delta, in the Observatory's fit panel (Prompt 225)
// -----------------------------------------------------------------------------
// tests/transitDelta.test.js holds the kernel and the validation table. This is
// where a reader meets the delta:
//   - the quadratic fit now also gives the star's mean density (a labelled
//     circular-orbit value), says whether the radius ratio and the impact
//     parameter are fixed by the data, tests the residuals in transit, and draws
//     the likelihood profiles and the covariance ellipses with their tables;
//   - the four-coefficient model is offered beside it, is refused until its
//     coefficients are given, takes them from a disclosure whose summary line
//     keeps what is assumed visible, and fits without q1 and q2;
//   - the same in Spanish, no accessibility violations, and no sideways scroll
//     of the page on a phone.
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

async function openPanel(page, lang = 'en') {
  if (lang !== 'en')
    await page.addInitScript(l => {
      try {
        localStorage.setItem('gravitas_locale', l);
      } catch {
        // the page then stays in English and the test says so
      }
    }, lang);
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption('tess-light-curve');
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('#obsFitPanel summary').click();
  await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#fitEstimate')).toContainText(/\d+/);
}

const AXE = async page =>
  (
    await new AxeBuilder({ page })
      .include('#obsFitPanel')
      .withTags(TAGS)
      .analyze()
  ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

test.describe('the transit delta in the fit panel', () => {
  test('the quadratic fit gives the density, the checks, the profiles and the ellipses with tables', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await openPanel(page);
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 180_000,
    });
    const results = page.locator('#fitResults');
    await expect(results).toContainText('Star’s mean density, circular orbit');
    // The derived density's row is in g/cm³ and near 1.2 for HD 209458's fit.
    const row = results
      .locator('#fitTable tbody tr', {
        hasText: 'Star’s mean density, circular orbit',
      })
      .first();
    await expect(row).toContainText('g/cm');
    const value = Number(
      (await row.locator('td').nth(1).innerText()).replace(',', '.')
    );
    expect(value).toBeGreaterThan(0.9);
    expect(value).toBeLessThan(1.5);
    await expect(page.locator('#fitKb')).toContainText(
      /fixed by the data|not constrained/
    );
    await expect(page.locator('#fitResidualTest')).toContainText('chi-square');
    for (const id of ['#fitEllipse-k-b', '#fitEllipse-k-q1']) {
      await expect(results.locator(`figure${id} svg.ow-plot`)).toHaveAttribute(
        'aria-label',
        /ellipse/
      );
    }
    const table = results.locator('#fitEllipseTable-k-b');
    await expect(table).toContainText('Semi-major axis');
    await expect(table).toContainText('Correlation');
    await expect(results.locator('#fitProfilePlot-k svg.ow-plot')).toHaveCount(
      1
    );
    // The declared line stays visible without opening the disclosure.
    await expect(page.locator('#fitDeclared')).toContainText('quadratic law');
    await expect(page.locator('#fitDeclared')).toContainText('circular');
    expect(await AXE(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the four-coefficient model is refused until its coefficients are given, then fits without q1 and q2', async ({
    page,
  }) => {
    await openPanel(page);
    await page.locator('#fitModel').selectOption('transit-claret4');
    // No coefficients: refused, with the reason, and Run stays off.
    await expect(page.locator('#fitRefusals')).toContainText('claret');
    await expect(page.locator('#fitRun')).toBeDisabled();
    await expect(page.locator('#fitMode-q1')).toHaveCount(0);
    await page.locator('#fitMore summary').click();
    const c = ['0.6', '-0.1', '0.55', '-0.25'];
    for (let i = 0; i < 4; i++) {
      await page.locator(`#fitClaret${i + 1}`).fill(c[i]);
    }
    await page.locator('#fitClaretSource').fill('a test law, not a table row');
    await page.locator('#fitEccentricity').fill('0.1');
    await page.locator('#fitOmega').fill('90');
    await page.locator('#fitOmega').dispatchEvent('change');
    await expect(page.locator('#fitRun')).toBeEnabled();
    await expect(page.locator('#fitDeclared')).toContainText(
      'four-coefficient'
    );
    await expect(page.locator('#fitDeclared')).toContainText('e = 0.1');
    await page.locator('#fitProfiles').uncheck();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
      timeout: 180_000,
    });
    const results = page.locator('#fitResults');
    await expect(results).toContainText('Star’s mean density, circular orbit');
    await expect(results).toContainText('for the assumed e and ω');
    await expect(results.locator('#fitTable')).not.toContainText(
      'Limb darkening q1'
    );
    await expect(results.locator('#fitEllipseTable-k-b')).toBeVisible();
    await expect(results.locator('#fitEllipseTable-k-q1')).toHaveCount(0);
    expect(await AXE(page)).toEqual([]);
  });

  test('in Spanish, and the page does not scroll sideways on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openPanel(page, 'es');
    await page.locator('#fitProfiles').uncheck();
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus')).toContainText(/Ajustado|ajust/i, {
      timeout: 180_000,
    });
    const results = page.locator('#fitResults');
    await expect(results).toContainText('Densidad media de la estrella');
    await expect(page.locator('#fitKb')).toContainText(/datos|restringen/);
    await expect(results.locator('#fitEllipseTable-k-b')).toContainText(
      'Semieje mayor'
    );
    await expect(page.locator('#fitMore summary')).toContainText(
      'Coeficientes de oscurecimiento al limbo'
    );
    const wide = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1
    );
    expect(wide).toBe(false);
    expect(await AXE(page)).toEqual([]);
  });
});
