// =============================================================================
// The curated catalog, in a browser
// -----------------------------------------------------------------------------
// tests/catalog.test.js holds the archive reader and the installer without a
// page, and `npm run catalog:check` holds the catalog to the repository. This
// is the page, against the sources and dist/:
//   - every entry is listed with its size, compatibility, license, citation
//     and review, and search and the type filter narrow the list;
//   - a data pack installs, opens in the observatory, and is removed;
//   - an installed course opens here, with a link into each of its lessons;
//   - a tampered archive is refused with its reason, a failed download is
//     retryable, and a retry that succeeds installs it; nothing half-installs;
//   - an entry for another Gravitas cannot be installed, and says why;
//   - a catalog that does not load says so, with a retry;
//   - no accessibility violations, in English and in Spanish;
//   - with the service worker installed, an installed pack opens offline.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
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
const CATALOG = JSON.parse(readFileSync('catalog/catalog.json', 'utf8'));
const SU_DRA = 'community.su-dra-tess-s15';
const COURSE = 'community.pulsating-stars';

async function openCatalog(page) {
  await page.goto('/catalog/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const entry = (page, id) => page.locator(`article[data-entry="${id}"]`);

/**
 * A test that fails a download on purpose makes the browser log the failed
 * load, and nothing else may be logged: then the fixture's own check passes.
 */
function expectOnlyFailedLoads(errors) {
  const other = errors.consoleErrors.filter(
    e => !/Failed to load resource|net::ERR_FAILED/.test(e)
  );
  expect(other).toEqual([]);
  errors.consoleErrors.length = 0;
}
const status = async (page, id, value) =>
  expect(entry(page, id)).toHaveAttribute('data-status', value, {
    timeout: 30_000,
  });

test.describe('the catalog', () => {
  test('lists every entry with what a teacher needs to know, and narrows by search and type', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await openCatalog(page);
    await expect(page.locator('html')).toHaveAttribute(
      'data-catalog',
      'loaded'
    );
    await expect(page.locator('article[data-entry]')).toHaveCount(
      CATALOG.entries.length
    );
    const su = entry(page, SU_DRA);
    await expect(su).toContainText('Data pack');
    await expect(su).toContainText('to download');
    await expect(su).toContainText('Gravitas ^1.0.0 (this is 1.0.0)');
    await expect(su).toContainText('public domain (NASA mission data)');
    await expect(su).toContainText('Monson et al. 2017');
    await expect(su).toContainText('SU Dra');
    await status(page, SU_DRA, 'available');
    // Built in: listed, nothing to install.
    await status(page, 'gravitas.tess-hd209458-s56', 'built-in');
    await expect(
      entry(page, 'gravitas.tess-hd209458-s56').getByRole('button')
    ).toHaveCount(0);

    // The data pack cites Monson et al.; nothing else does.
    await page.locator('#catSearch').fill('monson');
    await expect(page.locator('article[data-entry]')).toHaveCount(1);
    // SU Draconis is the data pack's object and the course's last note.
    await page.locator('#catSearch').fill('draconis');
    await expect(page.locator('article[data-entry]')).toHaveCount(2);
    await page.locator('#catSearch').fill('');
    await page.locator('#catType').selectOption('course-pack');
    await expect(page.locator('article[data-entry]')).toHaveCount(1);
    await page.locator('#catType').selectOption('built-in');
    await expect(page.locator('article[data-entry]')).toHaveCount(
      CATALOG.entries.filter(e => e.delivery === 'built-in').length
    );
    expect(errors).toEqual([]);
  });

  test('installs a data pack, opens it in the observatory, and removes it', async ({
    page,
  }) => {
    await openCatalog(page);
    await entry(page, SU_DRA).locator('[data-action="install"]').click();
    await status(page, SU_DRA, 'installed');
    await expect(page.locator('#catStatus')).toContainText('works offline');
    await entry(page, SU_DRA).locator('[data-action="open"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await expect(page.locator('#obsTitle')).toHaveText(
      'SU Draconis: an RR Lyrae star, TESS sector 15',
      { timeout: 30_000 }
    );
    await expect(page.locator('#obsTable caption')).toContainText('of 3585.');
    // Back in the catalog, still installed across the navigation, and then not.
    await openCatalog(page);
    await status(page, SU_DRA, 'installed');
    await entry(page, SU_DRA).locator('[data-action="remove"]').click();
    await status(page, SU_DRA, 'available');
  });

  test('an installed course opens here, with a link into each lesson', async ({
    page,
  }) => {
    await openCatalog(page);
    await entry(page, COURSE).locator('[data-action="install"]').click();
    await status(page, COURSE, 'installed');
    await entry(page, COURSE)
      .getByRole('button', { name: 'Show the course' })
      .click();
    const course = page.locator('#catCourse');
    await expect(course).toBeVisible();
    await expect(course).toContainText('Pulsating stars');
    const links = course.locator('a');
    await expect(links).toHaveCount(3);
    await expect(links.first()).toHaveAttribute(
      'href',
      '../#investigation=transit-photometry'
    );
    await expect(course).toContainText('horizontal branch');
  });

  test('a tampered archive is refused with its reason, a failed download can be retried, and neither half-installs', async ({
    page,
    errors,
  }) => {
    await openCatalog(page);
    // Tampered in transit: one byte changed.
    await page.route('**/catalog/packages/*.gxp', async route => {
      const res = await route.fetch();
      const body = Buffer.from(await res.body());
      body[body.length - 40] ^= 1;
      await route.fulfill({ response: res, body });
    });
    await entry(page, SU_DRA).locator('[data-action="install"]').click();
    const alert = entry(page, SU_DRA).getByRole('alert');
    await expect(alert).toContainText(
      'its checksum is not the one the catalog names'
    );
    await status(page, SU_DRA, 'available');
    // The network fails outright.
    await page.unroute('**/catalog/packages/*.gxp');
    await page.route('**/catalog/packages/*.gxp', route => route.abort());
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(entry(page, SU_DRA).getByRole('alert')).toContainText(
      'did not download'
    );
    await status(page, SU_DRA, 'available');
    // And recovers.
    await page.unroute('**/catalog/packages/*.gxp');
    await entry(page, SU_DRA)
      .getByRole('alert')
      .getByRole('button', { name: 'Try again' })
      .click();
    await status(page, SU_DRA, 'installed');
    await expect(entry(page, SU_DRA).getByRole('alert')).toHaveCount(0);
    expectOnlyFailedLoads(errors);
  });

  test('an entry for another Gravitas says so and cannot be installed; a catalog that does not load says so', async ({
    page,
    errors,
  }) => {
    await page.route('**/catalog/catalog.json', async route => {
      const res = await route.fetch();
      const c = await res.json();
      c.entries.find(e => e.id === SU_DRA).gravitas = '^2.0.0';
      await route.fulfill({ response: res, json: c });
    });
    await openCatalog(page);
    await status(page, SU_DRA, 'incompatible');
    await expect(entry(page, SU_DRA)).toContainText(
      'Needs Gravitas ^2.0.0; this is 1.0.0'
    );
    await expect(entry(page, SU_DRA).getByRole('button')).toHaveCount(0);

    await page.unroute('**/catalog/catalog.json');
    await page.route('**/catalog/catalog.json', route =>
      route.fulfill({ status: 500, body: 'no' })
    );
    await openCatalog(page);
    await expect(page.locator('html')).toHaveAttribute(
      'data-catalog',
      'failed'
    );
    await expect(page.getByRole('alert')).toContainText(
      'The catalog did not load'
    );
    await page.unroute('**/catalog/catalog.json');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('article[data-entry]')).toHaveCount(
      CATALOG.entries.length
    );
    expectOnlyFailedLoads(errors);
  });

  test('speaks Spanish, and has no accessibility violations in either language', async ({
    page,
  }) => {
    await openCatalog(page);
    await entry(page, COURSE).locator('[data-action="install"]').click();
    await status(page, COURSE, 'installed');
    await entry(page, COURSE)
      .getByRole('button', { name: 'Show the course' })
      .click();
    const axe = async () =>
      (await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map(
        v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
      );
    expect(await axe()).toEqual([]);
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.locator('h1')).toHaveText('Catálogo');
    await expect(entry(page, SU_DRA)).toContainText('Paquete de datos');
    await expect(page.locator('#catCourse')).toContainText(
      'Estrellas pulsantes'
    );
    expect(await axe()).toEqual([]);
  });
});

test.describe('the catalog offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(DIST, 'the service worker is the sources’; dist/ has its own');

  test('an installed pack opens with no network once Gravitas has been opened', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();
    const deadline = Date.now() + 120_000;
    let cached = null;
    while (Date.now() < deadline) {
      cached = await page.evaluate(async () => {
        const m = await import('/js/offline.js');
        return m.cacheStatus(2000);
      });
      if (cached && cached.cachedCount >= cached.precacheCount) break;
      await page.waitForTimeout(500);
    }
    expect(cached?.cachedCount).toBeGreaterThanOrEqual(cached?.precacheCount);
    await openCatalog(page);
    await entry(page, SU_DRA).locator('[data-action="install"]').click();
    await status(page, SU_DRA, 'installed');
    await context.setOffline(true);
    // The catalog itself, from the precache, still knows what is installed.
    await openCatalog(page);
    await status(page, SU_DRA, 'installed');
    await page.goto(`/observatory/?installed=${encodeURIComponent(SU_DRA)}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#obsTitle')).toHaveText(
      'SU Draconis: an RR Lyrae star, TESS sector 15',
      { timeout: 30_000 }
    );
  });
});
