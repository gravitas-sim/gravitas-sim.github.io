// =============================================================================
// gravitas-embed/1 in a browser: a figure inside somebody else's page
// -----------------------------------------------------------------------------
// tests/embedContract.test.js holds the contract's rules without a browser.
// What needs one is the part the rules exist for: a real parent page at
// another origin, a page that is not the parent, a sandboxed page whose origin
// is opaque, a frame that is resized, and a figure that still opens offline.
//
// The parent is a harness page served by a small server the test starts on
// localhost - a different origin from the application at 127.0.0.1 - which
// frames the figure, records every message the figure sends it, and can send
// any message it likes. It never reads the figure's DOM; the test does,
// through Playwright, to see what a message did. A real server rather than a
// routed response: Chromium's local-network checks refuse to let a page it
// cannot place on this machine frame 127.0.0.1, which is itself the right
// behaviour for a figure on a public course page to meet, but not a harness.
//
// Runs against the sources and dist/ (playwright.config.js, BOTH_TARGETS):
// the figure reads nothing from modules the test would have to import.
// =============================================================================

import { createServer } from 'node:http';

import { test, expect } from './fixtures.js';
import { encodePayload } from '../js/shareState.js';
import { PROTOCOL } from '../js/embedMessages.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
/** The parent page's origin, and another page's; set once the servers listen. */
let PARENT = '';
let OTHER = '';
const pages = new Map();
const servers = [];

/** A server for parent pages, on a free port of this machine. */
function listen() {
  const server = createServer((req, res) => {
    const found = pages.get(req.url);
    if (!found) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      ...(found.sandboxed
        ? { 'content-security-policy': 'sandbox allow-scripts' }
        : {}),
    });
    res.end(found.html);
  });
  servers.push(server);
  return new Promise(resolve =>
    server.listen(0, 'localhost', () =>
      resolve(`http://localhost:${server.address().port}`)
    )
  );
}

test.beforeAll(async () => {
  PARENT = await listen();
  OTHER = await listen();
});
test.afterAll(() =>
  Promise.all(servers.map(s => new Promise(r => s.close(r))))
);

const msg = (type, extra = {}) => ({
  protocol: PROTOCOL,
  version: 1,
  type,
  ...extra,
});

/**
 * Serve a parent page at `origin` that frames the figure at `src`.
 * @returns {Promise<string>} The page's URL
 */
let pageCount = 0;
async function parentPage(
  page,
  { origin = PARENT, src, sandboxed = false, width = 720 }
) {
  const path = `/parent-${++pageCount}.html`;
  const url = `${origin}${path}`;
  const html = `<!doctype html><meta charset="utf-8"><title>parent</title>
<body style="margin:0">
<iframe id="figure" src="${src}" title="figure" style="border:0;width:${width}px;height:450px"></iframe>
<script>
  window.received = [];
  addEventListener('message', e => window.received.push({ data: e.data, origin: e.origin }));
  window.send = m => document.getElementById('figure').contentWindow.postMessage(m, '*');
</script>`;
  pages.set(path, { html, sandboxed });
  return url;
}

/** The figure's frame, once its interface exists. */
async function figureFrame(page) {
  const handle = await page.waitForSelector('#figure');
  const frame = await handle.contentFrame();
  await frame.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 60_000,
  });
  return frame;
}

const received = page => page.evaluate(() => window.received.map(r => r.data));
const running = frame =>
  frame.evaluate(
    () => document.getElementById('timelinePlay')?.textContent.trim() === '❚❚'
  );

let fragment;
let other;
test.beforeAll(async () => {
  fragment = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'e2e' });
  other = await encodePayload({ v: 1, s: 'Solar System', seed: 'e2e', p: 1 });
});

const figureUrl = (base, query) => `${base}/?${query}#${fragment}`;

test.describe('a figure and the page it is in', () => {
  test('with no parent origin it tells its page it is ready, and obeys nothing', async ({
    page,
    baseURL,
  }) => {
    await page.goto(
      await parentPage(page, { src: figureUrl(baseURL, 'embed=1&ev=1') })
    );
    const frame = await figureFrame(page);
    await expect
      .poll(() => received(page))
      .toEqual([msg('ready', { requests: [] })]);
    expect(await running(frame)).toBe(true);
    await page.evaluate(m => window.send(m), msg('pause', { id: 'p' }));
    await page.waitForTimeout(800);
    expect(await running(frame)).toBe(true);
    expect(await received(page)).toHaveLength(1);
  });

  test('the parent it was told to trust can pause, play, load and reset it', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(
      baseURL,
      `embed=1&ev=1&reset=authored&parent=${encodeURIComponent(PARENT)}`
    );
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    await expect
      .poll(() => received(page))
      .toContainEqual(
        msg('ready', {
          requests: ['ping', 'play', 'pause', 'reset', 'load'],
          running: true,
        })
      );

    await page.evaluate(m => window.send(m), msg('pause', { id: 'p1' }));
    await expect.poll(() => running(frame)).toBe(false);
    await expect
      .poll(() => received(page))
      .toContainEqual(msg('ack', { id: 'p1' }));
    await expect
      .poll(() => received(page))
      .toContainEqual(msg('status', { running: false }));

    await page.evaluate(m => window.send(m), msg('play', { id: 'p2' }));
    await expect.poll(() => running(frame)).toBe(true);

    // Load another state: it opens paused, as that state says.
    await page.evaluate(
      m => window.send(m),
      msg('load', { id: 'l1', state: other })
    );
    await expect
      .poll(() => received(page))
      .toContainEqual(msg('ack', { id: 'l1' }));
    await expect.poll(() => running(frame)).toBe(false);

    // Reset returns to the authored state, which runs.
    await page.evaluate(m => window.send(m), msg('reset', { id: 'r1' }));
    await expect
      .poll(() => received(page))
      .toContainEqual(msg('ack', { id: 'r1' }));
    await expect.poll(() => running(frame)).toBe(true);

    // Every answer went to the trusted origin; the page saw it from the figure.
    const origins = await page.evaluate(() => [
      ...new Set(window.received.map(r => r.origin)),
    ]);
    expect(origins).toEqual([new URL(baseURL).origin]);
    // And the frame's own address still names the authored figure.
    expect(frame.url()).toContain(`#${fragment}`);
  });

  test('a page at another origin is ignored, and hears nothing back', async ({
    page,
    baseURL,
  }) => {
    // Framed by OTHER, but told to trust PARENT.
    const src = figureUrl(
      baseURL,
      `embed=1&ev=1&parent=${encodeURIComponent(PARENT)}`
    );
    await page.goto(await parentPage(page, { origin: OTHER, src }));
    const frame = await figureFrame(page);
    await page.evaluate(m => window.send(m), msg('pause', { id: 'x' }));
    await page.waitForTimeout(800);
    expect(await running(frame)).toBe(true);
    expect(await received(page)).toEqual([]);
  });

  test('an opaque parent gets readiness only, and is not obeyed', async ({
    page,
    baseURL,
  }) => {
    // A data: document has an opaque origin - messages from it say "null" -
    // but is not sandboxed, so the figure inside keeps its own origin and
    // loads. (A parent sandboxed without allow-same-origin cannot hold a
    // figure at all: sandboxing is inherited, and EMBEDDING.md says so.)
    const figure = query => figureUrl(baseURL, query);
    const inner = src =>
      `<iframe id="figure" src="${src}" style="width:640px;height:400px"></iframe>` +
      "<script>window.received=[];addEventListener('message',e=>window.received.push({data:e.data,origin:e.origin}));" +
      "window.send=m=>document.getElementById('figure').contentWindow.postMessage(m,'*');</script>";
    for (const [query, expected] of [
      ['embed=1&ev=1', [msg('ready', { requests: [] })]],
      // Told to trust a real origin, it sends its opaque parent nothing.
      [`embed=1&ev=1&parent=${encodeURIComponent(PARENT)}`, []],
    ]) {
      const path = `/opaque-${++pageCount}.html`;
      pages.set(path, {
        html: `<iframe id="opaque" src="data:text/html,${encodeURIComponent(inner(figure(query)))}" style="width:700px;height:460px"></iframe>`,
      });
      await page.goto(`${PARENT}${path}`);
      const opaque = await (
        await page.waitForSelector('#opaque')
      ).contentFrame();
      const frame = await (
        await opaque.waitForSelector('#figure')
      ).contentFrame();
      await frame.waitForFunction(
        () => window.splashScreenEnded === true,
        null,
        {
          timeout: 60_000,
        }
      );
      const got = () => opaque.evaluate(() => window.received.map(r => r.data));
      if (expected.length) await expect.poll(got).toEqual(expected);
      await opaque.evaluate(m => window.send(m), msg('pause', { id: 'o' }));
      await page.waitForTimeout(800);
      expect(await running(frame)).toBe(true);
      expect(await got()).toEqual(expected);
    }
  });

  test('messages that are not the contract are refused with a reason, and change nothing', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(
      baseURL,
      `embed=1&ev=1&parent=${encodeURIComponent(PARENT)}`
    );
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    await expect.poll(() => received(page)).toHaveLength(1);
    const cases = [
      [{ ...msg('pause', { id: 'v2' }), version: 2 }, 'unsupported-version'],
      [msg('navigate', { id: 'nav' }), 'unknown-type'],
      [msg('pause', { id: 'extra', script: 'alert(1)' }), 'bad-message'],
      [
        msg('load', { id: 'url', state: 'https://evil.example/#1zAAA' }),
        'bad-state',
      ],
      [msg('load', { id: 'junk', state: '1zNotAShareState' }), 'bad-state'],
      [msg('pause', { id: 'big', pad: 'x'.repeat(20_000) }), 'bad-message'],
    ];
    for (const [m, code] of cases) {
      await page.evaluate(x => window.send(x), m);
      await expect
        .poll(() => received(page))
        .toContainEqual(msg('error', { id: m.id, code }));
    }
    expect(await running(frame)).toBe(true);
  });

  test('follows its frame when the page resizes it', async ({
    page,
    baseURL,
  }) => {
    await page.goto(
      await parentPage(page, {
        src: figureUrl(baseURL, 'embed=1&ev=1'),
        width: 480,
      })
    );
    const frame = await figureFrame(page);
    const size = () =>
      frame.evaluate(() => ({
        canvas: document.getElementById('simulationCanvas').clientWidth,
        overflow:
          document.scrollingElement.scrollWidth -
          document.scrollingElement.clientWidth,
      }));
    await expect.poll(async () => (await size()).canvas).toBe(480);
    await page.evaluate(
      () => (document.getElementById('figure').style.width = '960px')
    );
    await expect.poll(async () => (await size()).canvas).toBe(960);
    expect((await size()).overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('what an embed URL asks for', () => {
  test('its language, a theme and no transport, none of it remembered', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(
      baseURL,
      'embed=1&ev=1&lang=es&theme=daylight&controls=none'
    );
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    await expect
      .poll(() => frame.evaluate(() => document.documentElement.lang))
      .toBe('es');
    expect(
      await frame.evaluate(() => document.documentElement.dataset.theme)
    ).toBe('daylight');
    await expect(frame.locator('.timeline-bar')).toBeHidden();
    expect(
      await frame.evaluate(() => ({
        theme: localStorage.getItem('gravitas_theme'),
        locale: localStorage.getItem('gravitas_locale'),
      }))
    ).toEqual({ theme: null, locale: null });
  });

  test('with its transport, Reset is a button a keyboard reaches, and it resets', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(baseURL, 'embed=1&ev=1&reset=authored');
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    const reset = frame.locator('#embedReset');
    await expect(reset).toBeVisible();
    await expect(reset).toHaveAccessibleName('Reset the figure');
    await frame.locator('#timelinePlay').focus();
    await page.keyboard.press('Enter'); // pause from the keyboard
    await expect.poll(() => running(frame)).toBe(false);
    await expect(frame.locator('#timelinePlay')).toHaveAccessibleName(
      'Play simulation'
    );
    await reset.focus();
    await page.keyboard.press('Enter');
    // The authored state runs, so Reset puts it back running.
    await expect.poll(() => running(frame)).toBe(true);
  });

  test('a paused figure in Spanish says so in Spanish', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(baseURL, 'embed=1&ev=1&lang=es');
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    await expect
      .poll(() => frame.evaluate(() => document.documentElement.lang))
      .toBe('es');
    await frame.locator('#timelinePlay').click();
    await expect(frame.locator('#timelinePlay')).toHaveAccessibleName(
      'Reanudar la simulación'
    );
  });

  test('a plain ?embed=1 figure is the embed it always was', async ({
    page,
    baseURL,
  }) => {
    const src = figureUrl(
      baseURL,
      `embed=1&parent=${encodeURIComponent(PARENT)}`
    );
    await page.goto(await parentPage(page, { src }));
    const frame = await figureFrame(page);
    await expect(frame.locator('.timeline-bar')).toBeVisible();
    await expect(frame.locator('#embedReset')).toBeHidden();
    await page.evaluate(m => window.send(m), msg('pause'));
    await page.waitForTimeout(800);
    expect(await received(page)).toEqual([]);
    expect(await running(frame)).toBe(true);
  });
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('a figure whose page was visited opens with no network', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.skip(DIST, 'the precache lists the published sources, not the bundle');
    testInfo.setTimeout(180_000);
    const src = figureUrl(baseURL, 'embed=1&ev=1&theme=observatory');
    await page.goto(src);
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });
    // Wait for the worker to report the whole precache, as offline.spec.js does.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const m = await import('/js/offline.js');
            const s = await m.cacheStatus(2000);
            return Boolean(s && s.cachedCount >= s.precacheCount);
          }),
        { timeout: 120_000 }
      )
      .toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });
    await expect(page.locator('#simulationCanvas')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.dataset.theme)
    ).toBe('observatory');
  });
});
