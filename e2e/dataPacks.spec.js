// =============================================================================
// An observation data pack, seen from the page
// -----------------------------------------------------------------------------
// The TESS HD 209458 light curve arrives through its capability package - the
// resolver's builtin registry, as the SDSS spectra do - and decodes with the
// one decoder every pack shares (js/observation.js). Once the service worker
// has the precache it loads with no network: the pack is an `optional` asset,
// so it is in the precache, and a lesson that needs it offline has it.
//
// No lesson uses the pack yet, so nothing on screen shows it; these read it
// the way an instrument will. Sources only: they import modules by path, and
// the precache lists the published sources rather than the bundle.
// DATA_PACKS.md has the format.
// =============================================================================

import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';

/** Load the pack as an instrument would, and summarise what arrived. */
const readPack = page =>
  page.evaluate(async () => {
    const { loadBuiltin, providerOf } =
      await import('/js/platform/resolver.js');
    const { observationOf, checkObservation } =
      await import('/js/observation.js');
    const o = observationOf(
      await loadBuiltin('builtin:data/tess-hd209458-s56')
    );
    return {
      owner: providerOf('dataPacks', 'tess-hd209458-s56-lc'),
      bins: o.x.values.length,
      problems: checkObservation(o),
      first: o.x.values[0],
      scale: o.x.scale,
      credit: o.source.credit,
    };
  });

async function openApp(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* the app still opens */
    }
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test.describe('the TESS light-curve pack', () => {
  test.skip(DIST, 'reads modules by path, which the bundle does not serve');

  test('arrives through its package and decodes to a clean series', async ({
    page,
  }) => {
    await openApp(page);
    const got = await readPack(page);
    expect(got.owner).toBe('gravitas.tess-hd209458-s56');
    expect(got.problems).toEqual([]);
    expect(got.bins).toBeGreaterThan(1000);
    expect(got.first).toBeGreaterThan(2825);
    expect(got.scale).toBe('TDB');
    expect(got.credit).toMatch(/TESS/);
  });

  test.describe('offline', () => {
    test.use({ serviceWorkers: 'allow' });

    test('loads with no network once the precache is in', async ({
      page,
      context,
    }, testInfo) => {
      testInfo.setTimeout(180_000);
      await openApp(page);
      const online = await readPack(page);
      const deadline = Date.now() + 120_000;
      let status = null;
      while (Date.now() < deadline) {
        status = await page.evaluate(async () => {
          const m = await import('/js/offline.js');
          return m.cacheStatus(2000);
        });
        if (status && status.cachedCount >= status.precacheCount) break;
        await page.waitForTimeout(500);
      }
      expect(status?.cachedCount).toBeGreaterThanOrEqual(status?.precacheCount);
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      expect(await readPack(page)).toEqual(online);
    });
  });
});
