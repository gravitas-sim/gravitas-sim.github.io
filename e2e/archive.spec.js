// =============================================================================
// The observatory's archive import, in a browser, with CDS played by fixtures
// -----------------------------------------------------------------------------
// tests/archive.test.js holds the modules' contracts without a page. This is
// the page, in the published sources and in dist/, where the panel is a lazy
// chunk of the observatory's bundle. No test here reaches the network: every
// request to CDS is answered from tests/fixtures/archive/, with the CORS
// header CDS sends, and a request to anywhere else is recorded and refused.
//   - nothing loads and nothing is sent before the reader asks;
//   - a star, by name, becomes an observation in the workspace, reviewed
//     first, drawn brighter-up;
//   - every failure is named in words;
//   - a redirect off the list is stopped by the page's CSP;
//   - an answer kept on this device says how old it is, and works offline;
//   - Cancel cancels;
//   - no accessibility violations, in English and in Spanish.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const SU_DRA = '1058066262817534336';
const EPPHOT = readFileSync('tests/fixtures/archive/gaia-epphot-su-dra.vot');
const SESAME = readFileSync('tests/fixtures/archive/sesame-su-dra.xml');
const CONE = `<?xml version="1.0" encoding="utf-8"?>
<VOTABLE version="1.3" xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE type="results"><INFO name="QUERY_STATUS" value="OK"/><TABLE>
<FIELD name="Source" datatype="long" ucd="meta.id;meta.main"/><FIELD name="RA_ICRS" datatype="double" unit="deg"/><FIELD name="DE_ICRS" datatype="double" unit="deg"/><FIELD name="Gmag" datatype="double" unit="mag"/><FIELD name="VarFlag" datatype="char" arraysize="*"/>
<DATA><TABLEDATA><TR><TD>${SU_DRA}</TD><TD>174.4855</TD><TD>67.3299</TD><TD>9.54</TD><TD>VARIABLE</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const CDS = /^https:\/\/(cds|tapvizier\.cds)\.unistra\.fr\//;
const CORS = { 'access-control-allow-origin': '*' };

/**
 * CDS, played by the fixtures. `answer` may replace any of the three
 * answers: a function of the route, given the route and which step it is.
 * @returns {{requests: import('@playwright/test').Request[], elsewhere: string[]}}
 */
async function mockCds(page, answer = {}) {
  const seen = { requests: [], elsewhere: [] };
  await page.route(CDS, async route => {
    const req = route.request();
    seen.requests.push(req);
    const url = new URL(req.url());
    const step =
      url.hostname === 'cds.unistra.fr'
        ? 'sesame'
        : /I\/355\/gaiadr3/.test(url.searchParams.get('QUERY') || '')
          ? 'cone'
          : 'epochs';
    if (answer[step]) return answer[step](route);
    if (step === 'sesame')
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'text/plain' },
        body: SESAME,
      });
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/x-votable+xml' },
      body: step === 'cone' ? CONE : EPPHOT,
    });
  });
  await page.route(/^https:\/\/elsewhere\.example\//, route => {
    seen.elsewhere.push(route.request().url());
    return route.fulfill({ status: 200, headers: CORS, body: '<VOTABLE/>' });
  });
  return seen;
}

async function openPage(page) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}
async function openPanel(page) {
  await page.locator('#obsArchivePanel > summary').click();
  await expect(page.locator('#arcFind')).toBeVisible({ timeout: 30_000 });
}
async function find(page, name = 'SU Dra') {
  await page.locator('#arcName').fill(name);
  await page.locator('#arcFind').click();
}
async function toReview(page) {
  await find(page);
  await expect(page.locator('#arcSources input[type="radio"]')).toHaveCount(1);
  await page.locator('#arcLook').click();
  await expect(page.locator('#arcReview')).toBeVisible();
}
const axe = async page =>
  (
    await new AxeBuilder({ page })
      .include('#obsArchivePanel')
      .withTags(TAGS)
      .analyze()
  ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

/**
 * A test that fails a request on purpose makes the browser log it, each
 * engine in its own words, and some engines only after the page has shown its
 * message. So a test says up front that a failed load is expected: those
 * messages are dropped as they arrive, now or later, and anything else still
 * fails the test (the fixture's own check, at the end).
 */
const FAILED_LOAD =
  /Failed to load resource|net::ERR_FAILED|Cross-Origin Request Blocked|Content[- ]Security[- ]Policy|Refused to connect|access control checks/i;
function allowFailedLoads(errors, also = null) {
  const expected = e => FAILED_LOAD.test(e) || (also && also.test(e));
  const list = errors.consoleErrors;
  for (let i = list.length - 1; i >= 0; i--)
    if (expected(list[i])) list.splice(i, 1);
  const push = list.push.bind(list);
  // Not enumerable: the fixture's toEqual([]) would count it as content.
  Object.defineProperty(list, 'push', {
    value: (...items) => push(...items.filter(e => !expected(e))),
    enumerable: false,
  });
}

test.describe('the archive import', () => {
  test('nothing loads and nothing is sent before the reader asks', async ({
    page,
  }) => {
    const seen = await mockCds(page);
    const loaded = [];
    page.on('request', r => loaded.push(r.url()));
    await openPage(page);
    expect(seen.requests).toHaveLength(0);
    if (!DIST) {
      // In the sources each module is its own file, so what loaded can be named.
      expect(
        loaded.filter(u => /\/js\/archive\/|archivePanel|\.archive\.js/.test(u))
      ).toEqual([]);
    }
    await expect(page.locator('#arcBody')).toHaveCount(0);
    const before = loaded.length;
    await openPanel(page);
    // Opening the panel fetches its code, and still sends nothing to CDS.
    expect(
      loaded.slice(before).filter(u => u.endsWith('.js')).length
    ).toBeGreaterThan(0);
    expect(seen.requests).toHaveLength(0);
    await expect(page.locator('#arcPrivacy')).toContainText(
      'Nothing is sent until you press Find'
    );
    await find(page);
    await expect(page.locator('#arcSources')).toBeVisible();
    // Sesame, then the cone: two requests, neither with a cookie or a referrer.
    expect(seen.requests.map(r => new URL(r.url()).hostname)).toEqual([
      'cds.unistra.fr',
      'tapvizier.cds.unistra.fr',
    ]);
    for (const r of seen.requests) {
      const h = await r.allHeaders();
      expect(h.cookie).toBeUndefined();
      expect(h.referer).toBeUndefined();
    }
  });

  test('a star, by name, becomes an observation in the workspace, reviewed first', async ({
    page,
  }) => {
    await mockCds(page);
    await openPage(page);
    await openPanel(page);
    await toReview(page);
    await expect(page.locator('#arcPosition')).toContainText('174.48586');
    await expect(page.locator('#arcPosition')).toContainText('RR*');
    // Every field, and "not stated" where the service states no unit.
    const rows = page.locator('#arcFields tbody tr');
    await expect(rows).toHaveCount(8);
    await expect(rows.filter({ hasText: 'FG' }).first()).toContainText(
      'not stated'
    );
    await expect(page.locator('#arcSummary')).toContainText('47 rows');
    await expect(page.locator('#arcChecksums')).toContainText(
      'eaaa345eb58c12a3'
    );
    await expect(page.locator('#arcLicense')).toContainText('CC BY-NC 3.0 IGO');
    await expect(page.locator('#arcReductions')).toContainText(
      'converted to TDB'
    );
    await page.locator('#arcBand').selectOption('BP');
    await expect(page.locator('#arcReductions')).toContainText('43 of 47 rows');
    await page.locator('#arcBand').selectOption('G');
    await expect(page.locator('#arcReductions')).toContainText('47 of 47 rows');

    const opens = Number(
      (await page.locator('html').getAttribute('data-opens')) || 0
    );
    await page.locator('#arcOpen').click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-opens',
      String(opens + 1)
    );
    await expect(page.locator('#obsWork')).toBeVisible();
    await expect(page.locator('#obsTitle')).toContainText('SU Dra');
    await expect(page.locator('#obsTitle')).toContainText('G magnitude');
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
    // A magnitude axis is drawn brighter-up: the smaller tick is the higher.
    const ticks = await page.$$eval(
      '#obsPlot text.ow-tick[text-anchor="end"]',
      ts =>
        ts.map(t => ({
          v: Number(t.textContent.replace('−', '-').replace(',', '.')),
          y: Number(t.getAttribute('y')),
        }))
    );
    expect(ticks.length).toBeGreaterThan(1);
    const sorted = [...ticks].sort((a, b) => a.v - b.v);
    expect(sorted[0].y).toBeLessThan(sorted.at(-1).y);
  });

  const FAILURES = [
    ['blocked', { sesame: r => r.abort('failed') }, /could not reach CDS/],
    // A page on another origin sees only the CORS-safelisted headers of an
    // answer, and Retry-After is not one: unless the service exposes it, the
    // page cannot read it, and says "a minute".
    [
      'rateLimited',
      {
        sesame: r =>
          r.fulfill({
            status: 429,
            headers: { ...CORS, 'retry-after': '30' },
            body: '',
          }),
      },
      /Try again in a minute/,
    ],
    [
      'rateLimitedExposed',
      {
        sesame: r =>
          r.fulfill({
            status: 429,
            headers: {
              ...CORS,
              'access-control-expose-headers': 'Retry-After',
              'retry-after': '30',
            },
            body: '',
          }),
      },
      /after 30 seconds/,
    ],
    [
      'unavailable',
      { cone: r => r.fulfill({ status: 503, headers: CORS, body: 'down' }) },
      /unavailable \(HTTP 503\)/,
    ],
    [
      'tooLarge',
      {
        epochs: r =>
          r.fulfill({
            status: 200,
            headers: { ...CORS, 'content-type': 'application/x-votable+xml' },
            body: `<VOTABLE>${'x'.repeat(600_000)}</VOTABLE>`,
          }),
      },
      /larger than 512 kB/,
    ],
    [
      'votable',
      {
        epochs: r =>
          r.fulfill({
            status: 200,
            headers: { ...CORS, 'content-type': 'application/x-votable+xml' },
            body: '<VOTABLE><RESOURCE>',
          }),
      },
      /not a table this page can read/,
    ],
    [
      'serviceError',
      {
        epochs: r =>
          r.fulfill({
            status: 200,
            headers: { ...CORS, 'content-type': 'application/x-votable+xml' },
            body: '<?xml version="1.0"?><VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="ERROR">unknown table</INFO></RESOURCE></VOTABLE>',
          }),
      },
      /VizieR reported an error: unknown table/,
    ],
  ];
  for (const [name, answer, words] of FAILURES) {
    test(`a failure is named in words: ${name}`, async ({ page, errors }) => {
      // Firefox's DOMParser also logs the XML it could not parse.
      allowFailedLoads(errors, name === 'votable' ? /XML Parsing Error/ : null);
      await mockCds(page, answer);
      await openPage(page);
      await openPanel(page);
      await find(page);
      if (answer.epochs) {
        await expect(page.locator('#arcLook')).toBeVisible();
        await page.locator('#arcLook').click();
      }
      await expect(page.locator('#arcError')).toBeVisible();
      await expect(page.locator('#arcError')).toHaveText(words);
      await expect(page.locator('#arcFind')).toBeEnabled();
    });
  }

  test('a name Sesame does not know says so', async ({ page }) => {
    await mockCds(page, {
      sesame: r =>
        r.fulfill({
          status: 200,
          headers: { ...CORS, 'content-type': 'text/plain' },
          body: '<?xml version="1.0"?><Sesame><Target><name>zzz</name><INFO>*** Nothing found ***</INFO></Target></Sesame>',
        }),
    });
    await openPage(page);
    await openPanel(page);
    await find(page, 'zzz');
    await expect(page.locator('#arcNotFound')).toContainText('“zzz”');
  });

  test('a service off the list is refused by the page, redirect or not, and nothing reaches it', async ({
    page,
    errors,
    browserName,
  }) => {
    allowFailedLoads(errors);
    const seen = await mockCds(page, {
      sesame: r =>
        r.fulfill({
          status: 302,
          headers: { ...CORS, location: 'https://elsewhere.example/answer' },
          body: '',
        }),
    });
    await openPage(page);
    // The page's CSP, whatever its code does: a request to an origin not on
    // the list never leaves, in every engine.
    const direct = await page.evaluate(() =>
      window.fetch('https://elsewhere.example/direct').then(
        () => 'answered',
        e => e.name
      )
    );
    expect(direct).toBe('TypeError');
    // And a redirect there from a listed service. Playwright's WebKit cannot
    // answer a request with a redirect status, so this half is Chromium's and
    // Firefox's; the direct request above is the same CSP rule in WebKit.
    if (browserName !== 'webkit') {
      await openPanel(page);
      await find(page);
      await expect(page.locator('#arcError')).toBeVisible();
      // The browser reports the refused redirect as a failed request, which a
      // page cannot tell from a CORS refusal.
      await expect(page.locator('#arcError')).toHaveAttribute(
        'data-code',
        /^(blocked|offList)$/
      );
    }
    expect(seen.elsewhere).toEqual([]);
  });

  test('an answer kept on this device says how old it is, and opens offline', async ({
    page,
    errors,
  }) => {
    allowFailedLoads(errors);
    let offline = false;
    await mockCds(page);
    // Routes run newest first, so this one decides; fallback() hands the
    // request on to the fixtures above.
    await page.route(CDS, r => (offline ? r.abort('failed') : r.fallback()));
    await openPage(page);
    await openPanel(page);
    await toReview(page);
    await expect(page.locator('#arcReview [data-arc-note]')).toHaveCount(0);

    // Moments later, and the network gone: every step from this device, fresh.
    offline = true;
    await toReview(page);
    await expect(
      page.locator('#arcReview [data-arc-note]').first()
    ).toContainText('From this device');

    // A month later: the same answers, marked stale, with why.
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = window.indexedDB.open('gravitas-archive', 1);
          req.onsuccess = () => {
            const tx = req.result.transaction('answers', 'readwrite');
            const store = tx.objectStore('answers');
            store.openCursor().onsuccess = e => {
              const c = e.target.result;
              if (!c) return;
              c.update({
                ...c.value,
                retrievedMs: c.value.retrievedMs - 30 * 86_400_000,
              });
              c.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
          req.onerror = () => reject(req.error);
        })
    );
    await toReview(page);
    const note = page.locator('#arcReview [data-arc-note]').first();
    await expect(note).toContainText('30 days old');
    await expect(note).toContainText('could not reach CDS');
    await page.locator('#arcOpen').click();
    await expect(page.locator('#obsTitle')).toContainText('SU Dra');
  });

  test('Cancel cancels a request that is taking too long', async ({ page }) => {
    await mockCds(page, { sesame: () => new Promise(() => {}) });
    await openPage(page);
    await openPanel(page);
    await find(page);
    await expect(page.locator('#arcCancel')).toBeVisible();
    await page.locator('#arcCancel').click();
    await expect(page.locator('#arcError')).toHaveText('Canceled.');
    await expect(page.locator('#arcCancel')).toBeHidden();
  });

  test('no accessibility violations, in English and in Spanish, and the name survives the switch', async ({
    page,
  }) => {
    await mockCds(page);
    await openPage(page);
    await openPanel(page);
    await toReview(page);
    expect(await axe(page)).toEqual([]);
    await page.locator('#langSwitch button[lang="es"]').click();
    await expect(page.locator('#arcPrivacy')).toContainText(
      'No se envía nada hasta que pulses Buscar'
    );
    await expect(page.locator('#arcName')).toHaveValue('SU Dra');
    await page.locator('#arcFind').click();
    await expect(page.locator('#arcSources legend')).toContainText(
      'Fuentes de Gaia DR3'
    );
    await page.locator('#arcLook').click();
    await expect(page.locator('#arcReview h3')).toHaveText('Antes de abrirla');
    expect(await axe(page)).toEqual([]);
  });
});
