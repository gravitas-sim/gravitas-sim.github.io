// =============================================================================
// The comparison instrument with a 3-D system as its model (Prompt 105)
// -----------------------------------------------------------------------------
// tests/forwardSystem3d.test.js holds the numbers (the model over the data it
// made leaves nothing; another orientation is a measured misfit). This is the
// panel: a 3-D system file laid over the TESS light curve, the observer's
// inclination and direction as its sliders, and a file that cannot be observed
// refused in words.
// =============================================================================

import { test, expect } from './fixtures.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { fromElements } from '../js/lab3d/elements.js';
import { FORMAT, FORMAT_VERSION, GAUSSIAN_K } from '../js/lab3d/state.js';

/** A star and a planet on a circular orbit, in solar units, with sizes. */
const circular = (eccentricity = 0) => {
  const mStar = 1;
  const mPlanet = 1e-3;
  const mu = GAUSSIAN_K ** 2 * (mStar + mPlanet);
  const r = fromElements(
    { a: 0.05, e: eccentricity, i: 1.5, Omega: 0.5, omega: 0, M: 1 },
    mu
  );
  const fs = -mPlanet / (mStar + mPlanet);
  const fp = mStar / (mStar + mPlanet);
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    units: 'solar',
    integrator: { scheme: 'yoshida4c', h: 0.01 },
    t: 0,
    bodies: [
      {
        id: 'star',
        m: mStar,
        radius: 0.00465,
        x: r.x.map(c => fs * c),
        v: r.v.map(c => fs * c),
      },
      {
        id: 'planet',
        m: mPlanet,
        radius: 0.0005,
        x: r.x.map(c => fp * c),
        v: r.v.map(c => fp * c),
      },
    ],
  };
};

async function openPanel(page) {
  await page.goto('/observatory/?open=tess-light-curve', {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('#obsComparePanel > summary').click();
  await expect(page.locator('#cmpSource')).toBeVisible({ timeout: 30_000 });
}

test.describe('the comparison with a 3-D system', () => {
  test('a 3-D file becomes the model, with the observer as its sliders', async ({
    page,
  }) => {
    await openPanel(page);
    await page.setInputFiles('#cmpFile3d', {
      name: 'r1-solar.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(circular())),
    });
    await expect(page.locator('#cmpSystem')).toHaveValue('3d');
    await expect(page.locator('#cmp3d-inc')).toBeVisible();
    await expect(page.locator('#cmp3d-pa')).toBeVisible();
    // The planet's own elements are the file's: no slider for them.
    await expect(page.locator('#cmpEl-periodDays')).toHaveCount(0);
    await expect(page.locator('#cmpParams table')).toBeVisible();
    const before = await page.locator('#cmpSummary').innerText();
    await page.locator('#cmp3d-inc').fill('30');
    await expect(page.locator('#cmpSummary')).not.toHaveText(before);
  });

  test('a file that is not a 3-D system, or cannot be observed, is refused in words', async ({
    page,
  }) => {
    await openPanel(page);
    await page.setInputFiles('#cmpFile3d', {
      name: 'x.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"nothing"}'),
    });
    await expect(page.locator('#cmpStatus')).toContainText('not a 3-D system');
    // An eccentric orbit has no transit model: said in the model's words.
    await page.setInputFiles('#cmpFile3d', {
      name: 'eccentric.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(circular(0.4))),
    });
    await expect(page.locator('#cmpStatus')).toContainText('circular');
    // Code units name no length, time or mass.
    await page.setInputFiles('#cmpFile3d', {
      name: 'r1.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify(REFERENCES.find(r => r.id === 'R1').make().system)
      ),
    });
    await expect(page.locator('#cmpStatus')).toContainText(
      'cannot be observed'
    );
  });
});
