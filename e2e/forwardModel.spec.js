// =============================================================================
// A synthetic observation in the Observatory (Roadmap II Prompt 84)
// -----------------------------------------------------------------------------
// A forward model's transit light curve is saved as the workspace saves any
// observation and opened as a reader's file: the title and the source say it is
// synthetic, a fit shows the "Compare with truth" table beside the manifest's
// input values, and the page has no axe violations.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { runForward } from '../js/forward/index.js';
import { observationJson } from '../js/observatory/export.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

const file = () => {
  const o = runForward(
    'transit',
    {
      star: {
        massSun: 1.148,
        radiusSun: 1.155,
        teffK: 6065,
        distancePc: 48.3,
        limb: { q1: 0.36, q2: 0.3 },
      },
      planets: [
        {
          id: 'b',
          massEarth: 220,
          radiusEarth: 15.1,
          periodDays: 3.5247,
          meanAnomalyDeg: 30,
        },
      ],
      geometry: { positionAngleDeg: 40, inclinationDeg: 89 },
    },
    {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'e2e-truth',
      epochs: { kind: 'regular', duration: 8, count: 400 },
      noise: { white: { sigma: 0.0008 } },
      instrument: { kind: 'photometer' },
    }
  );
  return observationJson(o, { source: o, changes: [] });
};

test('a synthetic transit says it is synthetic and a fit is compared with the truth', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFile').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(file()),
  });
  await expect(page.locator('#obsTitle')).toContainText('(synthetic)', {
    timeout: 30_000,
  });
  await expect(page.locator('#obsSource')).toContainText(
    'synthetic observation'
  );
  await page.locator('#obsFitPanel summary').click();
  await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
  await page.locator('#fitProfiles').uncheck();
  await page.locator('#fitRun').click();
  await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
    timeout: 180_000,
  });
  const table = page.locator('#fitTruth');
  await expect(table).toBeVisible();
  const rows = await table.locator('tbody tr').count();
  expect(rows).toBeGreaterThanOrEqual(3);
  // The input period is in the table, to the digits the manifest holds.
  await expect(table).toContainText('3.5247');
  const box = await page.locator('#fitTruth').boundingBox();
  expect(box.width).toBeGreaterThan(100);
  const violations = (
    await new AxeBuilder({ page }).withTags(TAGS).analyze()
  ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
  expect(violations).toEqual([]);
});
