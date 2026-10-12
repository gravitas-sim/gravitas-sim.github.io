// =============================================================================
// The compute page against the real, pinned runtime: ONLINE ONLY
// -----------------------------------------------------------------------------
// Needs the network: it downloads Pyodide 314.0.7 and the packages from the
// jsDelivr CDN (about 9 MB for the NumPy notebook, about 19 MB for the plotting
// one). It therefore runs only when COMPUTE_ONLINE=1, by hand or in a job of
// its own that a maintainer adds (the CI workflow is not changed here), and no
// normal gate depends on it. The frame is the REAL built one, served at the compute origin
// by Playwright, so this works before that origin is published and checks the
// bytes that will be.
//
//   - every reviewed notebook runs to their expected values, and the capsule
//     they make verifies;
//   - what a hostile cell can reach from inside the real Worker: nothing of the
//     page's (storage, DOM, cookies), no fetch of this site's files or of
//     another site, and a loop that never ends leaves the page responsive and
//     is ended by cancelling.
// Run it:  COMPUTE_ONLINE=1 npx playwright test e2e/computeOnline.spec.js --project=chromium
// =============================================================================

import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const ONLINE = process.env.COMPUTE_ONLINE === '1';
test.skip(!ONLINE, 'online only: needs the runtime CDN (COMPUTE_ONLINE=1)');
test.setTimeout(600_000);

const ORIGIN = 'https://gravitas-compute.github.io';

async function open(page) {
  const frame = await readFile('compute-frame/index.html', 'utf8');
  await page.route(`${ORIGIN}/**`, r =>
    r.fulfill({ status: 200, contentType: 'text/html', body: frame })
  );
  await page.goto('/compute/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.computeReady === true);
}

for (const id of [
  'line-centroid',
  'transit-times',
  'integrators-compared',
  'population-at-scale',
]) {
  test(`${id} runs on the pinned runtime and matches its expected values`, async ({
    page,
  }) => {
    await open(page);
    await page.locator('#cpNotebook').selectOption(id);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpRun')).toBeEnabled({ timeout: 300_000 });
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpResult')).toBeVisible({ timeout: 300_000 });
    const out = await page.evaluate(async () => {
      const { entryOf } = await import('/js/compute/catalogue.js');
      const { verifyCapsule } = await import('/js/compute/capsule.js');
      const { capsule, parts, entry } = window.gravitasCompute.last;
      const v = await verifyCapsule(capsule, entryOf);
      return {
        ok: v.ok,
        problems: v.problems,
        warnings: v.warnings,
        quantities: parts.envelope.quantities,
        expected: entry.expected,
        runtime: capsule.runtime,
        timing: capsule.timing,
      };
    });
    expect(out.problems).toEqual([]);
    expect(out.warnings).toEqual([]);
    expect(out.runtime.version).toBe('314.0.7');
    for (const x of out.expected) {
      const q = out.quantities.find(y => y.id === x.id);
      expect(Math.abs(q.value - x.value)).toBeLessThanOrEqual(x.tolerance);
    }
    console.log(`TIMING ${id} ${JSON.stringify(out.timing)}`);
  });
}

test('a hostile cell reaches nothing of the page’s, and a loop is ended by cancelling', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => localStorage.setItem('gravitas_secret', 'mine'));
  const out = await page.evaluate(async () => {
    const { connect } = await import('/js/compute/transport.js');
    const link = await connect(document, document.body, 'hostile');
    const inbox = [];
    const waiting = [];
    link.port.onmessage = ({ data }) => {
      inbox.push(data);
      for (const w of waiting.splice(0)) w();
    };
    const next = async type => {
      for (;;) {
        const at = inbox.findIndex(m => m.type === type || m.type === 'error');
        if (at >= 0) return inbox.splice(at, 1)[0];
        await new Promise(r => waiting.push(r));
      }
    };
    const send = (type, f) =>
      link.port.postMessage({
        protocol: 'gravitas-compute',
        version: 1,
        type,
        ...f,
      });
    await next('ready');
    send('load', { id: 'l1', packages: ['numpy'] });
    const loaded = await next('loaded');
    const hostile = `
import js, json
out = {}
def attempt(name, f):
    try:
        out[name] = 'REACHED ' + str(f())[:60]
    except BaseException as e:
        out[name] = 'refused: ' + type(e).__name__
attempt('parent', lambda: js.parent.document.title)
attempt('top', lambda: js.top.location.href)
attempt('localStorage', lambda: js.localStorage.getItem('gravitas_secret'))
attempt('sessionStorage', lambda: js.sessionStorage.length)
attempt('document', lambda: js.document.cookie)
attempt('indexedDB', lambda: js.indexedDB.open('x'))
import pyodide.http
async def grab(url):
    r = await pyodide.http.pyfetch(url)
    return await r.string()
for name, url in [('thisSite', '${location.origin}/instructors/materials.enc.json'), ('otherSite', 'https://example.com/')]:
    try:
        out[name] = 'REACHED ' + (await grab(url))[:40]
    except BaseException as e:
        out[name] = 'refused: ' + type(e).__name__
gravitas_output = {'envelope': out}
`;
    send('run', {
      id: 'r1',
      input: '{}',
      params: '{}',
      cells: [hostile],
      packages: ['numpy'],
    });
    const result = await next('result');
    const answers =
      result.type === 'result'
        ? JSON.parse(JSON.parse(result.output).envelope)
        : result;
    // A loop that never ends: the page keeps ticking, and cancelling ends it.
    let ticks = 0;
    const timer = window.setInterval(() => ticks++, 100);
    send('run', {
      id: 'r2',
      input: '{}',
      params: '{}',
      cells: ['while True:\n    pass'],
      packages: ['numpy'],
    });
    await new Promise(r => setTimeout(r, 3000));
    window.clearInterval(timer);
    send('cancel', { id: 'r2' });
    const cancelled = await next('result');
    link.close();
    return {
      runtime: loaded.runtime.version,
      answers,
      ticks,
      cancelled: cancelled.code,
    };
  });
  expect(out.runtime).toBe('314.0.7');
  expect(Object.keys(out.answers).sort()).toEqual([
    'document',
    'indexedDB',
    'localStorage',
    'otherSite',
    'parent',
    'sessionStorage',
    'thisSite',
    'top',
  ]);
  for (const [k, v] of Object.entries(out.answers))
    expect({ k, v }).toEqual({ k, v: expect.stringMatching(/^refused/) });
  // The page kept running while the frame's Worker spun: about 30 ticks in 3 s.
  expect(out.ticks).toBeGreaterThan(15);
  expect(out.cancelled).toBe('cancelled');
  expect(
    await page.evaluate(() => localStorage.getItem('gravitas_secret'))
  ).toBe('mine');
});

test.afterEach(async ({ errors }) => {
  // Playwright's service-worker blocking reads navigator.serviceWorker in every
  // frame, and a sandboxed frame is refused it: the harness's error, not the page's.
  errors.pageErrors = errors.pageErrors.filter(
    m => !/serviceWorker.*sandboxed/.test(m)
  );
});
