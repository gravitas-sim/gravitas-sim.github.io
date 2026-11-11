// =============================================================================
// Offline II: the promise of every page, restoration after an offline reload,
// eviction at scale, and My work on a phone (Prompt 284)
// -----------------------------------------------------------------------------
// With the service worker installed (the rest of the suite blocks it):
//   - every page that tools/offline-pages.json says promises offline opens with
//     the network gone, and fails no request the record does not name;
//   - a reload with no network returns the open lesson, the Library's
//     "Continue" link and the Observatory's open archive observation;
//   - the archive's IndexedDB store, offered the committed footprint ceiling's
//     worth of answers, holds to its cap and never touches durable work;
//   - on a phone (emulated: a proxy, UNKNOWN for a real share sheet) the backup
//     goes to the share sheet, a closed sheet makes no file, the file picker
//     reads a backup, and the storage estimate is shown before an import.
// Sources only: dist/ has no service worker (DEPLOY_MODEL_GATE.md).
// =============================================================================

import { readFileSync } from 'node:fs';
import { devices } from '@playwright/test';
import { test, expect } from './fixtures.js';

/* global navigator, history */

test.skip(
  process.env.GRAVITAS_E2E_TARGET === 'dist',
  'dist/ has no service worker'
);
test.use({ serviceWorkers: 'allow' });

const RECORD = JSON.parse(readFileSync('tools/offline-pages.json', 'utf8'));
const BUDGET = JSON.parse(readFileSync('tools/data-budget.json', 'utf8'));
const CEILING = BUDGET.ceilings.find(
  c => c.key === 'indexedDbAndCacheBytes'
).ceiling;
const LESSON = 'keplers-laws';

/** Wait until the worker holds the whole precache, idle tier included. */
async function settled(page, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(async () => {
      const m = await import('/js/offline.js');
      return m.cacheStatus(2000);
    });
    if (
      last &&
      last.cachedCount >= last.precacheCount &&
      last.idleCount > 0 &&
      last.idleCached === last.idleCount
    )
      return last;
    await page.waitForTimeout(500);
  }
  throw new Error(`the install never settled: ${JSON.stringify(last)}`);
}

test.describe('every page says what is true offline, and it is', () => {
  const promising = RECORD.pages.filter(p =>
    ['first visit', 'after it settles'].includes(p.promise)
  );

  test('the record names every page promising offline, with the tier it needs', () => {
    expect(promising.length).toBeGreaterThanOrEqual(10);
    for (const p of promising) {
      expect([p.page, ['core', 'optional', 'idle'].includes(p.html)]).toEqual([
        p.page,
        true,
      ]);
    }
  });

  test('each opens with no network, and fails no request', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(420_000);
    await app.boot();
    await settled(page);
    await context.setOffline(true);
    for (const row of promising) {
      const failed = [];
      const errors = [];
      const onFail = r => failed.push(new URL(r.url()).pathname);
      const onError = e => errors.push(e.message);
      page.on('requestfailed', onFail);
      page.on('pageerror', onError);
      const res = await page.goto(row.page, { waitUntil: 'load' });
      page.off('requestfailed', onFail);
      page.off('pageerror', onError);
      expect([row.page, res?.ok()]).toEqual([row.page, true]);
      expect(
        [row.page, (await page.locator('body').innerText()).length > 40],
        `${row.page} rendered nothing`
      ).toEqual([row.page, true]);
      expect([row.page, failed]).toEqual([row.page, []]);
      expect([row.page, errors]).toEqual([row.page, []]);
    }
  });

  test('a page the worker does not hold, even once visited, sends the reader to the application offline', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(420_000);
    // The pages that need a connection: one that fetches something no tier
    // holds, the model page, a teaching page and the compute page, whose
    // relative paths used to leave the shell unstyled at its address.
    const need = RECORD.pages.filter(p => p.promise === 'needs a connection');
    const pick = ['/compute/', '/model/', '/instructors/', '/validation/'];
    for (const p of pick)
      expect(
        need.map(n => n.page),
        p
      ).toContain(p);
    expect(need.some(n => n.page.startsWith('/teaching/'))).toBe(true);
    await app.boot();
    await settled(page);
    for (const url of [...pick, '/teaching/adopt/']) {
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(800);
    }
    await context.setOffline(true);
    for (const url of [...pick, '/teaching/adopt/']) {
      const failed = [];
      const onFail = r => failed.push(new URL(r.url()).pathname);
      page.on('requestfailed', onFail);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(
        () => window.splashScreenEnded === true,
        null,
        {
          timeout: 60_000,
        }
      );
      page.off('requestfailed', onFail);
      // The application, at its own address, whole: not its shell at another
      // page's address with nothing loading.
      expect([url, new URL(page.url()).pathname]).toEqual([url, '/']);
      expect([url, failed]).toEqual([url, []]);
      expect(
        await page.evaluate(() => document.styleSheets.length)
      ).toBeGreaterThanOrEqual(6);
    }
  });
});

test.describe('a page in the install that reads an idle file does without it', () => {
  // The service worker would answer the request, so it is blocked here and the
  // Library index is refused at the network: what the page does before the
  // idle tier has come, or on a save-data connection.
  test.use({ serviceWorkers: 'block' });

  test('My work lists a saved lesson under its id when the Library index is missing', async ({
    page,
    errors,
  }) => {
    // The refused request is logged by the browser, as it should be.
    const gone = /Failed to load resource|net::ERR_FAILED/i;
    await page.route('**/library/library.json', route => route.abort());
    await page.goto('/model/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(lesson => {
      localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify({
          schema: 2,
          lesson,
          stepSid: 'x',
          visited: ['x'],
          responses: {},
          attempts: {},
          startedAt: '2026-10-01T10:00:00.000Z',
        })
      );
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    }, LESSON);
    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await expect(page.locator('#mwLessons .mw-item')).toHaveCount(1);
    for (let i = errors.consoleErrors.length - 1; i >= 0; i--)
      if (gone.test(errors.consoleErrors[i])) errors.consoleErrors.splice(i, 1);
  });
});

test.describe('an offline reload restores the open work', () => {
  async function seed(page) {
    await page.goto('/model/', { waitUntil: 'domcontentloaded' });
    return page.evaluate(async lesson => {
      const reg = await import('/js/data/investigations/registry.js');
      const inv = await reg.loadInvestigation(lesson);
      const at = Math.min(3, inv.steps.length - 1);
      const sid = inv.steps[at].sid;
      localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify({
          schema: 2,
          lesson,
          stepSid: sid,
          visited: inv.steps.slice(0, at + 1).map(s => s.sid),
          responses: {},
          attempts: {},
          startedAt: '2026-10-01T10:00:00.000Z',
        })
      );
      localStorage.setItem(
        'gravitas_resume',
        JSON.stringify({
          v: 1,
          items: [
            {
              id: `investigation:${lesson}`,
              route: `/#investigation=${lesson}`,
              at: 1,
              step: sid,
            },
          ],
        })
      );
      return { sid, title: inv.steps[at].title };
    }, LESSON);
  }

  test('the resume record, offline: the Library offers Continue and the lesson opens at its step', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await settled(page);
    const at = await seed(page);
    await context.setOffline(true);
    await page.goto('/library/', { waitUntil: 'load' });
    const link = page.locator('#libContinueList a').first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });
    await expect(page.locator('.inv-step-title')).toHaveText(at.title, {
      timeout: 30_000,
    });
    // The same after a plain reload: nothing was in memory.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.inv-step-title')).toHaveText(at.title, {
      timeout: 30_000,
    });
  });

  test('the open archive observation returns from this device’s copy, and the archive is not asked', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    const SU_DRA = '1058066262817534336';
    const vot = readFileSync('tests/fixtures/archive/gaia-epphot-su-dra.vot');
    const sesame = readFileSync('tests/fixtures/archive/sesame-su-dra.xml');
    const cone = `<?xml version="1.0" encoding="utf-8"?>
<VOTABLE version="1.3" xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE type="results"><INFO name="QUERY_STATUS" value="OK"/><TABLE>
<FIELD name="Source" datatype="long" ucd="meta.id;meta.main"/><FIELD name="RA_ICRS" datatype="double" unit="deg"/><FIELD name="DE_ICRS" datatype="double" unit="deg"/><FIELD name="Gmag" datatype="double" unit="mag"/><FIELD name="VarFlag" datatype="char" arraysize="*"/>
<DATA><TABLEDATA><TR><TD>${SU_DRA}</TD><TD>174.4855</TD><TD>67.3299</TD><TD>9.54</TD><TD>VARIABLE</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
    const CORS = { 'access-control-allow-origin': '*' };
    const asked = [];
    await page.route(
      /^https:\/\/(cds|tapvizier\.cds)\.unistra\.fr\//,
      route => {
        const url = new URL(route.request().url());
        asked.push(url.hostname);
        const body =
          url.hostname === 'cds.unistra.fr'
            ? sesame
            : /I\/355\/gaiadr3/.test(url.searchParams.get('QUERY') || '')
              ? cone
              : vot;
        return route.fulfill({
          status: 200,
          headers: {
            ...CORS,
            'content-type':
              url.hostname === 'cds.unistra.fr'
                ? 'text/plain'
                : 'application/x-votable+xml',
          },
          body,
        });
      }
    );
    await app.boot();
    await settled(page);
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsArchivePanel > summary').click();
    await page.locator('#arcName').fill('SU Dra');
    await page.locator('#arcFind').click();
    await expect(page.locator('#arcSources input[type="radio"]')).toHaveCount(
      1
    );
    await page.locator('#arcLook').click();
    await expect(page.locator('#arcReview')).toBeVisible();
    await page.locator('#arcOpen').click();
    await expect(page.locator('html')).toHaveAttribute('data-opens', '1');
    const title = await page.locator('#obsTitle').innerText();
    expect(title).toMatch(/SU Dra/);

    await page.unroute(/^https:\/\/(cds|tapvizier\.cds)\.unistra\.fr\//);
    asked.length = 0;
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-opens', '1', {
      timeout: 30_000,
    });
    await expect(page.locator('#obsTitle')).toHaveText(title);
    await expect(page.locator('#obsStatus')).toContainText(
      /Reopened after the reload/
    );
    expect(asked).toEqual([]);
  });

  test('a fixture opened after an archive observation is what a reload returns', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.evaluate(() =>
      history.replaceState(
        { obsOpen: { v: 1, source: '1', band: 'G', object: null } },
        ''
      )
    );
    await page.locator('#obsOpen').click();
    await expect(page.locator('html')).toHaveAttribute('data-opens', '1');
    expect(await page.evaluate(() => history.state?.obsOpen)).toBeUndefined();
  });
});

test.describe('the archive store at the footprint ceiling', () => {
  test('offered the ceiling’s worth of answers it holds to its cap, keeps the newest and leaves durable work alone', async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await page.goto('/model/', { waitUntil: 'domcontentloaded' });
    const out = await page.evaluate(async ceiling => {
      const { idbStore, LIMITS } = await import('/js/archive/cache.js');
      localStorage.setItem(
        'gravitas_investigation_keplers-laws',
        JSON.stringify({ schema: 2, lesson: 'keplers-laws', responses: {} })
      );
      localStorage.setItem('gravitas_student_name', 'Test Student');
      const durable = {
        progress: localStorage.getItem('gravitas_investigation_keplers-laws'),
        name: localStorage.getItem('gravitas_student_name'),
      };
      const store = idbStore();
      await store.clear();
      // The largest answer the page accepts is 512 kB: offer the ceiling's
      // worth of them.
      const each = 512 * 1024;
      const n = Math.ceil(ceiling / each);
      const t0 = performance.now();
      for (let i = 0; i < n; i++)
        await store.set(`q${i}`, { bytes: new Uint8Array(each), url: `q${i}` });
      const elapsed = performance.now() - t0;
      const usage = await store.usage();
      const oldest = await store.get('q0');
      const newest = await store.get(`q${n - 1}`);
      const durableAfter = {
        progress: localStorage.getItem('gravitas_investigation_keplers-laws'),
        name: localStorage.getItem('gravitas_student_name'),
      };
      await store.clear();
      return {
        n,
        usage,
        limits: LIMITS,
        oldest: Boolean(oldest),
        newest: Boolean(newest),
        elapsedMs: elapsed,
        durable: JSON.stringify(durable) === JSON.stringify(durableAfter),
      };
    }, CEILING);
    expect(out.usage.bytes).toBeLessThanOrEqual(out.limits.maxBytes);
    expect(out.usage.entries).toBeLessThanOrEqual(out.limits.maxEntries);
    expect(out.usage.entries).toBe(out.limits.maxBytes / (512 * 1024));
    expect(out.oldest).toBe(false);
    expect(out.newest).toBe(true);
    expect(out.durable).toBe(true);
    // Eviction reads every row on each write; at the cap that is the cost to
    // watch. Measured, and bounded so it cannot grow unseen.
    testInfo.annotations.push({
      type: 'eviction',
      description: `${out.n} answers offered in ${Math.round(out.elapsedMs)} ms`,
    });
    expect(out.elapsedMs / out.n).toBeLessThan(500);
  });
});

// --- My work on a phone ---------------------------------------------------------
// The device profiles are Playwright's (viewport, touch, user agent); the
// engine is the run's own. Whether the real share sheet takes the file, or the
// real file picker offers it, is a thing only a device can say: UNKNOWN in the
// evidence record (tools/evidence-status.json, offline-phone-paths).

const PHONES = {
  'Android (Pixel 7)': devices['Pixel 7'],
  'iOS (iPhone 14)': devices['iPhone 14'],
};

for (const [name, device] of Object.entries(PHONES)) {
  test.describe(`My work on ${name}`, () => {
    const { defaultBrowserType: _drop, ...profile } = device;
    void _drop;
    test.use({ ...profile, serviceWorkers: 'allow' });
    test.beforeEach(({ browserName }) => {
      test.skip(browserName !== 'chromium', 'the emulation runs in Chromium');
    });

    async function seed(page) {
      await page.goto('/model/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(async lesson => {
        const reg = await import('/js/data/investigations/registry.js');
        const inv = await reg.loadInvestigation(lesson);
        const sid = inv.steps[Math.min(3, inv.steps.length - 1)].sid;
        localStorage.setItem(
          `gravitas_investigation_${lesson}`,
          JSON.stringify({
            schema: 2,
            lesson,
            stepSid: sid,
            visited: [sid],
            responses: {},
            attempts: {},
            startedAt: '2026-10-01T10:00:00.000Z',
          })
        );
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
      }, LESSON);
    }
    async function open(page) {
      await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
        timeout: 30_000,
      });
    }
    const stubShare = (page, behaviour) =>
      page.addInitScript(b => {
        window.__shared = [];
        Object.defineProperty(navigator, 'canShare', {
          value: d => Boolean(d?.files?.length),
          configurable: true,
        });
        Object.defineProperty(navigator, 'share', {
          value: async d => {
            if (b === 'close') {
              const e = new Error('closed');
              e.name = 'AbortError';
              throw e;
            }
            window.__shared.push({
              names: d.files.map(f => f.name),
              text: null,
              file: d.files[0],
            });
          },
          configurable: true,
        });
      }, behaviour);

    test('the backup goes to the share sheet, as a JSON file the app can read back', async ({
      page,
    }) => {
      await stubShare(page, 'accept');
      await seed(page);
      await open(page);
      await page.locator('#mwExport').tap();
      await expect(page.locator('#mwSummary')).toContainText(
        /backup file was made/i,
        { timeout: 15_000 }
      );
      const shared = await page.evaluate(async () => {
        const f = window.__shared[0]?.file;
        return f ? { name: f.name, type: f.type, text: await f.text() } : null;
      });
      expect(shared?.name).toMatch(/\.json$/);
      expect(shared?.type).toBe('application/json');
      expect(JSON.parse(shared.text).format).toBe('gravitas.student-data');
    });

    test('a closed share sheet makes no file, and is not counted as a backup', async ({
      page,
    }) => {
      await stubShare(page, 'close');
      await seed(page);
      await open(page);
      await page.locator('#mwExport').tap();
      await expect(page.locator('body')).toContainText(/No file was made/, {
        timeout: 15_000,
      });
      expect(
        await page.evaluate(() => localStorage.getItem('gravitas_last_export'))
      ).toBeNull();
    });

    test('the file picker takes a backup, and the estimate is shown before the import', async ({
      page,
    }, testInfo) => {
      // Make a backup file from a seeded page, then import it into an empty one.
      await seed(page);
      await open(page);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#mwExport').tap(),
      ]);
      const file = testInfo.outputPath('backup.json');
      await download.saveAs(file);
      await page.evaluate(() => localStorage.clear());
      await page.addInitScript(() => {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
      });
      await open(page);
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('label[for="mwFile"]').tap(),
      ]);
      expect(chooser.isMultiple()).toBe(false);
      await chooser.setFiles(file);
      await expect(page.locator('#mwPreview')).toBeVisible();
      const room = page.locator('#mwRoom');
      await expect(room).toBeVisible();
      await expect(room).toContainText(/would store about \d/);
      await expect(room).toHaveAttribute('data-fits', 'true');
      await expect(page.locator('#mwApply')).toBeEnabled();
    });

    test('a browser with too little room is told so before the import, and Import stays off', async ({
      page,
    }, testInfo) => {
      await seed(page);
      await open(page);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#mwExport').tap(),
      ]);
      const file = testInfo.outputPath('backup.json');
      await download.saveAs(file);
      await page.evaluate(() => localStorage.clear());
      await page.addInitScript(() => {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
        Object.defineProperty(navigator.storage, 'estimate', {
          value: async () => ({ quota: 5_000_000, usage: 4_900_000 }),
          configurable: true,
        });
      });
      await open(page);
      await page.locator('#mwFile').setInputFiles(file);
      const room = page.locator('#mwRoom');
      await expect(room).toContainText(/too little/);
      await expect(room).toHaveAttribute('data-fits', 'false');
      await expect(page.locator('#mwApply')).toBeDisabled();
    });
  });
}
