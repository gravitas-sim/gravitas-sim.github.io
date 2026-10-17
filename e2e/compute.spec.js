// =============================================================================
// The compute page (/compute/), in a browser, with no network
// -----------------------------------------------------------------------------
// tests/computeSession.test.js holds the state machine and tests/computeFrame
// .test.js the published frame. This is the page and the frame together, with
// the compute origin and the runtime CDN answered by Playwright:
//   - nothing heavy loads, and nothing is fetched from either origin, until
//     "Start the runtime" is pressed; the page says what it will download;
//   - the REAL frame (compute-frame/, the bytes that are published) starts
//     sandboxed, is refused by every storage and by the parent's DOM, and
//     reports why a runtime that cannot be had cannot be had: download failed,
//     another release's lock file, a hang, a frame whose bytes are not the pin;
//   - a frame that tries to reach the page's storage and DOM cannot;
//   - a run against a stand-in frame that returns what the vendored notebooks
//     really returned: the numbers, the table, the plot with its text
//     alternative, the capsule, My work, a capsule opened, a tampered one
//     refused, the notebook for a local Jupyter;
//   - Spanish, axe on every state, and a phone width.
// The run against the real runtime is e2e/computeOnline.spec.js, online only.
// Source target only: the page's pin is swapped by serving another
// js/compute/framePin.js, which a bundle has no file for.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
test.skip(DIST, 'the pin is swapped by serving a source module');

const ORIGIN = 'https://gravitas-compute.github.io';
const CDN = 'https://cdn.jsdelivr.net';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const sha = t => createHash('sha256').update(t).digest('hex');
const REAL = await readFile('compute-frame/index.html', 'utf8');
const answers = {
  'transit-times': JSON.parse(
    await readFile('tests/fixtures/compute/transit-times.answer.json', 'utf8')
  ),
  'line-centroid': JSON.parse(
    await readFile('tests/fixtures/compute/line-centroid.answer.json', 'utf8')
  ),
};
const RUNTIME = {
  name: 'pyodide',
  version: '314.0.7',
  python: '3.14.2',
  lockSha256:
    '5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010',
};

/** A frame that speaks the protocol and returns canned answers, or misbehaves. */
const standIn = (mode = 'good') => `<!doctype html><html><body><script>
const ANSWERS = ${JSON.stringify(answers)};
const RUNTIME = ${JSON.stringify(RUNTIME)};
const H = (type, f) => ({ protocol: 'gravitas-compute', version: 1, type, ...f });
const MODE = ${JSON.stringify(mode)};
window.addEventListener('message', async e => {
  const port = e.ports[0];
  if (!port) return;
  const tries = {};
  for (const [k, f] of Object.entries({
    storage: () => window.localStorage.length,
    session: () => window.sessionStorage.length,
    cookie: () => document.cookie,
    parentDoc: () => window.parent.document.title,
    topHref: () => window.top.location.href,
  })) try { f(); tries[k] = 'allowed'; } catch (err) { tries[k] = 'refused'; }
  port.onmessage = ({ data }) => {
    if (data.type === 'load') port.postMessage(H('loaded', { id: data.id, runtime: { ...RUNTIME, packages: { numpy: '2.4.6' } }, marks: { runtime: 900, packages: 2100 }, heapBytes: 78000000 }));
    if (data.type === 'run') {
      port.postMessage(H('progress', { id: data.id, phase: 'cells' }));
      if (MODE === 'raise') return port.postMessage(H('error', { id: data.id, code: 'notebook-error', message: 'ValueError: fewer than three transits were found: lower sigma' }));
      if (MODE === 'memory') return port.postMessage(H('error', { id: data.id, code: 'memory', message: 'out of memory' }));
      const a = JSON.parse(JSON.stringify(ANSWERS[JSON.parse(data.params).sigma !== undefined ? 'transit-times' : 'line-centroid']));
      if (MODE === 'extra') a.extra = '1';
      port.postMessage(H('result', { id: data.id, output: JSON.stringify(a), stdout: 'ran ' + data.cells.length + ' cells', heapBytes: 80000000, marks: { runtime: 900, packages: 2100, cells: 3000 }, runtime: { ...RUNTIME, packages: { numpy: '2.4.6', matplotlib: '3.10.8' } } }));
    }
  };
  port.postMessage(H('ready', { build: 'f'.repeat(64), probes: tries }));
});
</script></body></html>`;

/** Serve a frame at the compute origin and make the page pin it. */
async function serve(page, html = REAL, { pin = html } = {}) {
  await page.route(`${ORIGIN}/**`, r =>
    r.fulfill({ status: 200, contentType: 'text/html', body: html })
  );
  const real = html === REAL;
  const build = real ? REAL.match(/__x__/)?.[0] : null;
  void build;
  await page.route('**/js/compute/framePin.js', async r => {
    // The real frame keeps the real pin; a stand-in is pinned by its own hash.
    if (pin === REAL && html === REAL) return r.fallback();
    const text = pin === REAL ? REAL : pin;
    const realPin = await readFile('js/compute/framePin.js', 'utf8');
    const buildId =
      /build:\s*'([0-9a-f]{64})'/.exec(realPin.replace(/\s+/g, ' '))?.[1] ??
      'f'.repeat(64);
    return r.fulfill({
      contentType: 'text/javascript',
      body: `export const FRAME_PIN = { indexSha256: '${sha(text)}', build: '${pin === REAL ? buildId : 'f'.repeat(64)}' };`,
    });
  });
}

async function open(page, { locale, viewport } = {}) {
  await page.addInitScript(l => {
    try {
      // Once per tab: a test that goes to another page keeps what it kept.
      if (!window.sessionStorage.getItem('computeSpecCleared')) {
        window.sessionStorage.setItem('computeSpecCleared', '1');
        window.localStorage.clear();
        if (l) window.localStorage.setItem('gravitas_locale', l);
      }
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  if (viewport) await page.setViewportSize(viewport);
  await page.goto('/compute/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.computeReady === true);
}
const download = async (page, button) => {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(button).click(),
  ]);
  return {
    name: dl.suggestedFilename(),
    text: await readFile(await dl.path(), 'utf8'),
  };
};
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    r.violations.map(v => `${label}: ${v.id} ${v.nodes[0]?.target}`)
  ).toEqual([]);
};
/** Start on a stand-in frame and wait until the runtime is ready. */
async function ready(page, mode, notebook = 'line-centroid') {
  await serve(page, standIn(mode));
  await page.context().route(`${CDN}/**`, r => r.abort());
  await open(page);
  await page.locator('#cpNotebook').selectOption(notebook);
  await page.locator('#cpStart').click();
  await expect(page.locator('#cpRun')).toBeEnabled({ timeout: 20_000 });
}

test.describe('before anything is started', () => {
  test('nothing is fetched from the frame, the runtime or the notebooks, and the page says what it will cost', async ({
    page,
  }) => {
    const seen = [];
    page.on('request', r => seen.push(r.url()));
    await page.route(`${ORIGIN}/**`, r => r.abort());
    await open(page);
    expect(
      seen.filter(
        u =>
          u.startsWith(ORIGIN) ||
          u.startsWith(CDN) ||
          /\/compute\/(notebooks|inputs)\//.test(u)
      )
    ).toEqual([]);
    await expect(page.locator('#cpOnline')).toContainText('Online and opt-in');
    await expect(page.locator('#cpStart')).toContainText(/about \d+\.\d MB/);
    await expect(page.locator('#cpCost')).toContainText('80 MB');
    await expect(page.locator('#cpRun')).toBeDisabled();
    // The catalogue: seven reviewed notebooks and no way to bring one's own.
    await expect(page.locator('#cpNotebook option')).toHaveCount(7);
    await expect(page.locator('input[type=file][accept*=ipynb]')).toHaveCount(
      0
    );
    await axe(page, 'initial');
  });

  test('is not in the precache and not in the menu', async () => {
    const sw = await readFile('sw-manifest.js', 'utf8');
    expect(sw).not.toMatch(/compute/);
  });

  test('says it is offline, in words, without starting anything', async ({
    page,
    context,
  }) => {
    const seen = [];
    page.on('request', r => seen.push(r.url()));
    await open(page);
    await context.setOffline(true);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpState')).toContainText('You are offline');
    await expect(page.locator('#cpState')).toHaveAttribute('role', 'alert');
    expect(seen.filter(u => u.startsWith(ORIGIN))).toEqual([]);
    await axe(page, 'offline');
    await context.setOffline(false);
  });
});

test.describe('the published frame, really', () => {
  test('starts sandboxed: every storage refuses it and so does the page’s DOM', async ({
    page,
  }) => {
    await serve(page);
    const probes = await open(page).then(() =>
      page.evaluate(async () => {
        const { connect } = await import('/js/compute/transport.js');
        const link = await connect(document, document.body, 'probe');
        const ready = await new Promise(ok => {
          link.port.onmessage = ({ data }) => data.type === 'ready' && ok(data);
        });
        const frame = document.querySelector('iframe');
        const reach = {
          sandbox: frame.getAttribute('sandbox'),
          allow: frame.getAttribute('allow'),
        };
        try {
          void frame.contentWindow.document.title;
          reach.parentReadsFrame = 'allowed';
        } catch {
          reach.parentReadsFrame = 'refused';
        }
        reach.hidden = frame.hidden;
        link.close();
        return { ready, reach };
      })
    );
    expect(probes.ready.probes).toEqual({
      origin: 'null',
      localStorage: 'refused (SecurityError)',
      sessionStorage: 'refused (SecurityError)',
      cookie: 'refused (SecurityError)',
      parentDocument: 'refused (SecurityError)',
      topLocation: 'refused (SecurityError)',
      indexedDB: expect.stringMatching(/^refused/),
      caches: expect.stringMatching(/^refused/),
    });
    expect(probes.reach).toEqual({
      sandbox: 'allow-scripts',
      allow: '',
      parentReadsFrame: 'refused',
      hidden: true,
    });
  });

  test('takes one port and ignores a second hello, and answers a malformed request by name', async ({
    page,
  }) => {
    await serve(page);
    await open(page);
    const out = await page.evaluate(async () => {
      const { connect } = await import('/js/compute/transport.js');
      const link = await connect(document, document.body, 'probe');
      const got = [];
      link.port.onmessage = ({ data }) => got.push(data);
      await new Promise(r => setTimeout(r, 500));
      // A second hello with its own port: ignored, so nothing answers on it.
      const c = new window.MessageChannel();
      const second = new Promise(r => {
        c.port1.onmessage = ({ data }) => r(data);
        setTimeout(() => r('silence'), 600);
      });
      document
        .querySelector('iframe')
        .contentWindow.postMessage(
          { protocol: 'gravitas-compute', version: 1, type: 'hello' },
          '*',
          [c.port2]
        );
      link.port.postMessage({
        protocol: 'gravitas-compute',
        version: 1,
        type: 'run',
        id: 'x',
        input: 1,
      });
      link.port.postMessage({ not: 'a message' });
      link.port.postMessage({
        protocol: 'gravitas-compute',
        version: 1,
        type: 'eval',
        id: 'y',
        code: '1',
      });
      await new Promise(r => setTimeout(r, 600));
      link.close();
      return {
        got: got.map(d => d.type + (d.code ? `:${d.code}` : '')),
        second: await second,
      };
    });
    expect(out.second).toBe('silence');
    expect(out.got).toEqual([
      'ready',
      'error:invalid-request',
      'error:invalid-request',
      'error:invalid-request',
    ]);
  });

  test('a runtime that cannot be downloaded is said to be, and the frame is removed', async ({
    page,
  }) => {
    await serve(page);
    await page.context().route(`${CDN}/**`, r => r.abort());
    await open(page);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpState')).toContainText(
      'could not be downloaded',
      { timeout: 20_000 }
    );
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('#cpRun')).toBeDisabled();
    await axe(page, 'download failed');
    // Chromium logs each blocked request as a console error; they are the test's own doing.
  });

  test('a lock file that is another release’s is refused by its hash', async ({
    page,
  }) => {
    await serve(page);
    await page.context().route(`${CDN}/**`, r =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"packages":{}}',
      })
    );
    await open(page);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpState')).toContainText(
      'not the release this page pins',
      { timeout: 20_000 }
    );
  });

  test('a download that never ends is stopped at the timeout, and the runtime must be started again', async ({
    page,
  }) => {
    await page.clock.install();
    await serve(page);
    await page.context().route(`${CDN}/**`, () => {
      /* never answered */
    });
    await open(page);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpStatus')).toContainText('Downloading', {
      timeout: 20_000,
    });
    await page.clock.fastForward(310_000);
    await expect(page.locator('#cpState')).toContainText(
      'did not finish in time'
    );
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('#cpStart')).toBeEnabled();
  });

  test('a frame whose bytes are not the pinned build is never framed', async ({
    page,
  }) => {
    const seen = [];
    await serve(page, `${REAL} `, { pin: REAL });
    page.on('framenavigated', f => seen.push(f.url()));
    await open(page);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpState')).toContainText(
      'not the build this page expects'
    );
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  test('an unreachable compute origin is said to be, not a hang', async ({
    page,
  }) => {
    await serve(page, REAL);
    await page.route(`${ORIGIN}/**`, r => r.abort());
    await open(page);
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpState')).toContainText(
      'could not be reached'
    );
  });
});

test.describe('a frame that tries to get out', () => {
  test('cannot read the page’s storage or DOM, and the page keeps what it had', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.evaluate(() => localStorage.setItem('gravitas_secret', 'mine'));
    // The stand-in tried every reach before it said it was ready.
    const probes = await page.evaluate(
      () => window.gravitasCompute.session.probes
    );
    expect(probes).toEqual({
      storage: 'refused',
      session: 'refused',
      cookie: 'refused',
      parentDoc: 'refused',
      topHref: 'refused',
    });
    expect(
      await page.evaluate(() => localStorage.getItem('gravitas_secret'))
    ).toBe('mine');
    await expect(page.locator('iframe')).toHaveAttribute(
      'sandbox',
      'allow-scripts'
    );
  });
});

test.describe('a run', () => {
  test('returns the numbers with units and uncertainties, the table, and a capsule that can be saved', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpResult')).toBeVisible();
    const rows = await page.locator('#cpQuantRows tr').allInnerTexts();
    expect(rows).toHaveLength(5);
    expect(rows.join('\n')).toMatch(
      /Velocity of the centroid\s+-174[.,]\d+\s+± 19[.,]\d+\s+km\/s\s+derived/
    );
    await expect(page.locator('#cpFigure')).toBeHidden();
    await expect(page.locator('#cpTableSummary')).toContainText('26 rows');
    await expect(page.locator('#cpStdout')).toContainText('ran 4 cells');
    await expect(page.locator('#cpCapsuleFacts')).toContainText(
      'pyodide 314.0.7'
    );
    await expect(page.locator('#cpCapsuleFacts')).toContainText(
      'line-centroid v1'
    );
    await axe(page, 'result');
    const { name, text } = await download(page, '#cpSaveCapsule');
    expect(name).toMatch(/^capsule-[0-9a-f]{12}\.json$/);
    const capsule = JSON.parse(text);
    expect(capsule).toMatchObject({
      format: 'gravitas.compute-capsule',
      formatVersion: 1,
      params: { rest: 6564.6, halfwidth: 60 },
    });
    expect(capsule.outputs.map(o => o.name)).toEqual(['envelope', 'table']);
    // The capsule is checkable by anyone: its outputs hash to what it says.
    for (const o of capsule.outputs) expect(sha(o.text)).toBe(o.sha256);
  });

  test('a plot comes with its text alternative: an alt, a caption and its table, open', async ({
    page,
  }) => {
    await ready(page, 'good', 'transit-times');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpFigure')).toBeVisible();
    const alt = await page.locator('#cpFigureImg').getAttribute('alt');
    expect(alt).toMatch(/Its numbers are in the table below.*period 3\.5238/);
    await expect(page.locator('#cpFigureCap')).toHaveText(alt);
    await expect(page.locator('#cpTableBox')).toHaveJSProperty('open', true);
    await expect(page.locator('#cpTableRows tr')).toHaveCount(8);
    await expect(page.locator('#cpFigureImg')).toHaveJSProperty(
      'naturalWidth',
      600
    );
    await axe(page, 'plot result');
  });

  test('keeps the run in My work, where the report can cite it', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpRun').click();
    await page.locator('#cpKeep').click();
    await expect(page.locator('#cpKeepNote')).toContainText('Kept in My work');
    const entry = await page.evaluate(() => {
      const nb = JSON.parse(localStorage.getItem('gravitas_evidence_notebook'));
      const e = (nb.entries ?? nb)[0];
      return {
        source: e.source,
        title: e.title,
        env: e.snapshot.artifact.format,
        digest: e.snapshot.artifact.source.digest,
        engine: e.snapshot.artifact.made.engineFingerprint,
        ctx: e.context ?? e.snapshot.context,
      };
    });
    expect(entry.source).toBe('compute-capsule');
    expect(entry.env).toBe('gravitas.artifact');
    expect(entry.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.engine).toMatch(/^pyodide-314\.0\.7\/[0-9a-f]{12}$/);
    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toContainText('A spectral line');
    await expect(page.locator('main')).toContainText('Compute page');
  });

  test('gives a notebook for a local Jupyter that holds the input, the cells and the check', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpRun').click();
    const { name, text } = await download(page, '#cpLocal');
    expect(name).toMatch(/^line-centroid-[0-9a-f]{8}\.ipynb$/);
    const nb = JSON.parse(text);
    expect(nb.nbformat).toBe(4);
    expect(nb.cells.at(-1).source.join('')).toContain('MATCH');
    expect(nb.cells[0].source.join('')).toContain('Capsule digest');
  });

  test('opens a capsule it made, and refuses one that was changed by a character', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpRun').click();
    const { text } = await download(page, '#cpSaveCapsule');
    await open(page);
    await page.locator('#cpOpenFile').setInputFiles({
      name: 'c.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(page.locator('#cpStatus')).toContainText(
      'Capsule opened and checked'
    );
    await expect(page.locator('#cpQuantRows tr')).toHaveCount(5);
    await expect(page.locator('#cpLocal')).toBeEnabled();
    // One digit of an output changed: refused by name, nothing shown.
    await open(page);
    const tampered = text.replace('\\"value\\":6560.', '\\"value\\":6561.');
    expect(tampered).not.toBe(text);
    await page.locator('#cpOpenFile').setInputFiles({
      name: 'c.json',
      mimeType: 'application/json',
      buffer: Buffer.from(tampered),
    });
    await expect(page.locator('#cpState')).toContainText(
      'does not match its hash'
    );
    await expect(page.locator('#cpResult')).toBeHidden();
    await axe(page, 'capsule refused');
    // Not a capsule at all.
    await page.locator('#cpOpenFile').setInputFiles({
      name: 'x.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"gravitas.pipeline"}'),
    });
    await expect(page.locator('#cpState')).toContainText(
      'That capsule was not opened'
    );
  });

  test('says what went wrong when the notebook raises, or runs out of memory, or answers off its declaration', async ({
    page,
  }) => {
    await ready(page, 'raise', 'transit-times');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpState')).toContainText(
      'stopped with an error'
    );
    await expect(page.locator('#cpState')).toContainText(
      'fewer than three transits'
    );
    await expect(page.locator('#cpResult')).toBeHidden();
    await axe(page, 'notebook error');
  });
  test('out of memory', async ({ page }) => {
    await ready(page, 'memory');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpState')).toContainText('ran out of memory');
  });
  test('an answer that adds a key is refused and not shown', async ({
    page,
  }) => {
    await ready(page, 'extra');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpState')).toContainText(
      'not what its catalogue entry declares'
    );
    await expect(page.locator('#cpResult')).toBeHidden();
  });

  test('refuses a setting outside its bounds and an input that is not the schema, before any request is sent', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpParams input').nth(1).fill('9999');
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpState')).toContainText(
      'outside its allowed range'
    );
    await page.locator('#cpParams input').nth(1).fill('60');
    await page.locator('#cpInputKind').selectOption('file');
    await page.locator('#cpFile').setInputFiles({
      name: 'x.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"gravitas.pipeline","formatVersion":1}'),
    });
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpState')).toContainText(
      'not an input this notebook reads'
    );
  });

  test('runs on a file of the reader’s own, and records that it was theirs', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.locator('#cpInputKind').selectOption('file');
    const own = await readFile('compute/inputs/sdss-a-star.observation.json');
    await page.locator('#cpFile').setInputFiles({
      name: 'mine.json',
      mimeType: 'application/json',
      buffer: own,
    });
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpResult')).toBeVisible();
    await expect(page.locator('#cpCapsuleFacts')).toContainText('your file');
  });
});

test.describe('in Spanish and on a phone', () => {
  test('speaks Spanish on every state and passes axe', async ({ page }) => {
    await serve(page, standIn('good'));
    await page.context().route(`${CDN}/**`, r => r.abort());
    await open(page, { locale: 'es' });
    await expect(page.locator('#cpStart')).toContainText('Iniciar el entorno');
    await expect(page.locator('#cpCost')).toContainText('Pulsar');
    await axe(page, 'es initial');
    await page.locator('#cpNotebook').selectOption('line-centroid');
    await page.locator('#cpStart').click();
    await expect(page.locator('#cpRun')).toBeEnabled({ timeout: 20_000 });
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpQuantRows tr').first()).toContainText(
      'Centroide'
    );
    await expect(page.locator('#cpCapsuleFacts')).toContainText('Marco');
    await axe(page, 'es result');
  });

  test('fits a phone: no horizontal scroll at 375 px, results included', async ({
    page,
  }) => {
    await ready(page, 'good');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('#cpRun').click();
    await expect(page.locator('#cpResult')).toBeVisible();
    const wide = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    );
    expect(wide).toBe(false);
  });
});

test.afterEach(async ({ errors }, info) => {
  // The failure tests abort requests on purpose; Chromium reports each as a console error.
  if (
    /download|hang|never|lock|unreachable|offline|sandboxed|port/.test(
      info.title
    )
  )
    errors.consoleErrors.length = 0;
  // Playwright's own service-worker blocking reads navigator.serviceWorker in every
  // frame, and a sandboxed frame is refused it: the harness's error, not the page's.
  errors.pageErrors = errors.pageErrors.filter(
    m => !/serviceWorker.*sandboxed/.test(m)
  );
});
