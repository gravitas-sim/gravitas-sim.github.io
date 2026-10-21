#!/usr/bin/env node
// =============================================================================
// npm run probe:workers - what the page's Workers hold, and what it keeps
// -----------------------------------------------------------------------------
// The Worker pool contract (Prompt 153, WORKER_POOL.md) caps the memory and the
// number of Workers a page holds, and the data budget (tools/data-budget.json)
// has the ceilings. Neither can be set from the tree alone; this measures them
// in Chromium, on the same two profiles as tools/observatory-bench.mjs:
//
//   low-end  375 x 812, the page's CPU slowed four times, two cores reported
//   desktop  1280 x 800, the machine's own speed
//
// 1. The Observatory with each of its built-in observations open: the page's
//    JavaScript heap, and how many Workers it holds (none until a fit runs).
//    The largest by heap is the "largest pack".
// 2. A profile run: the observatory's fit panel on the TESS light curve with
//    profiles on. Every Worker the run starts is attached to over the protocol
//    and its heap sampled while it works (Runtime.getHeapUsage, which a Worker
//    answers even while a fit is running), so the figures are the realms' own:
//    the most each held, and the most all of them held at once.
// 3. The storage a first visit leaves: the service worker installs both tiers
//    and navigator.storage.estimate() is read (Cache Storage plus IndexedDB).
//
// Served as Pages serves the site (the sources), on a fresh browser context
// each. CPU throttling slows the page's thread and not its Workers (Chromium
// cannot slow a Worker down), so the memory is honest and the times are not
// the low-end's: the low-end figure is the concurrency and the cap, not a clock.
//
//   node tools/worker-probe.mjs [--json] [--write]    --write records
//   tools/worker-probe-results.json (read by tools/data-budget.mjs)
// =============================================================================

/* global navigator, MessageChannel, WebSocket, setTimeout */

import { createServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { loadavg } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_FILE = path.join(REPO, 'tools', 'worker-probe-results.json');
const argv = process.argv.slice(2);
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serve() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(REPO, p);
    if (!file.startsWith(REPO)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory())
        return res.writeHead(301, { location: `${p}/` }).end();
      const headers = {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'max-age=600',
      };
      if (file.endsWith('sw.js')) headers['service-worker-allowed'] = '/';
      res.writeHead(200, headers);
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => resolve(server))
  );
}

const freePort = () =>
  new Promise(resolve => {
    const s = netServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

/** A raw DevTools protocol connection: the sessions Playwright does not expose. */
async function connect(port) {
  const info = await (
    await fetch(`http://127.0.0.1:${port}/json/version`)
  ).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) {
      const { res, rej } = waiting.get(m.id);
      waiting.delete(m.id);
      if (m.error) rej(new Error(`${m.error.message}`));
      else res(m.result);
    } else listeners.forEach(f => f(m));
  };
  return {
    send(method, params = {}, sessionId) {
      const n = ++id;
      ws.send(JSON.stringify({ id: n, method, params, sessionId }));
      // A Worker that ended between the request and its answer never answers.
      const gone = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`${method}: no answer`)), 2000).unref()
      );
      return Promise.race([
        new Promise((res, rej) => waiting.set(n, { res, rej })),
        gone,
      ]);
    },
    on: f => listeners.push(f),
    close: () => ws.close(),
  };
}

const MB = v => Number((v / 1e6).toFixed(2));
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : null;
};

/** What one Worker held, by the protocol: the heap and the buffers outside it. */
const held = h => h.usedSize + (h.backingStorageSize || 0);

const PROFILES = {
  'low-end': {
    viewport: { width: 375, height: 812 },
    cpu: 4,
    mobile: true,
    cores: 2,
  },
  desktop: { viewport: { width: 1280, height: 800 }, cpu: 1 },
};

async function newPage(browser, origin, p, { serviceWorkers = 'block' } = {}) {
  const context = await browser.newContext({
    viewport: p.viewport,
    isMobile: !!p.mobile,
    hasTouch: !!p.mobile,
    serviceWorkers,
  });
  const page = await context.newPage();
  if (p.cores)
    await page.addInitScript(cores => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => cores,
      });
    }, p.cores);
  return { context, page };
}

async function openFixture(page, id) {
  await page.evaluate(async fixtureId => {
    const html = document.documentElement;
    const before = Number(html.dataset.opens || 0);
    document.getElementById('obsFixture').value = fixtureId;
    document.getElementById('obsOpen').click();
    const t0 = performance.now();
    while (Number(html.dataset.opens || 0) === before) {
      if (performance.now() - t0 > 30000) throw new Error('never opened');
      await new Promise(r => window.setTimeout(r, 2));
    }
  }, id);
}

async function observatory(browser, origin, p) {
  const { context, page } = await newPage(browser, origin, p);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (p.cpu > 1)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await page.goto(`${origin}/observatory/`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return (await cdp.send('Runtime.getHeapUsage')).usedSize;
  };
  const atRest = await heap();
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('#obsFixture option')].map(o => o.value)
  );
  const fixtures = [];
  for (const id of ids) {
    await openFixture(page, id);
    const rows = await page.evaluate(
      () =>
        document
          .querySelector('#obsTable caption')
          ?.textContent.match(/of (\d+)/)?.[1] ?? null
    );
    fixtures.push({
      id,
      rows: rows === null ? null : Number(rows),
      heapMB: MB(await heap()),
    });
  }
  const largest = fixtures.reduce((a, b) => (b.heapMB > a.heapMB ? b : a));
  // The largest open, and no Worker: the page alone.
  await openFixture(page, largest.id);
  const workersAtRest = page.workers().length;
  await context.close();
  return {
    pageAtRestMB: MB(atRest),
    fixtures,
    largest: largest.id,
    largestHeapMB: largest.heapMB,
    workersWithLargestOpen: workersAtRest,
  };
}

async function profileRun(browser, origin, p, cdpPort) {
  const { context, page } = await newPage(browser, origin, p);
  const cdp = await context.newCDPSession(page);
  if (p.cpu > 1)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await page.goto(`${origin}/observatory/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  await openFixture(page, 'tess-light-curve');
  const rows = await page.evaluate(() =>
    Number(
      document
        .querySelector('#obsTable caption')
        ?.textContent.match(/of (\d+)/)?.[1]
    )
  );
  await page.locator('#obsFitPanel summary').click();
  await page.waitForSelector('#fitRun', { state: 'visible' });
  await page.waitForFunction(() =>
    /About \d+ s/.test(
      document.getElementById('fitEstimate')?.textContent || ''
    )
  );
  await page.locator('#fitProfiles').check();

  // The raw connection: attach to the page target, then to every Worker it starts.
  const proto = await connect(cdpPort);
  const targets = (await proto.send('Target.getTargets')).targetInfos;
  const pageTarget = targets.find(
    t => t.type === 'page' && t.url.includes('/observatory/')
  );
  const { sessionId: pageSession } = await proto.send('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  const realms = new Map();
  proto.on(m => {
    if (
      m.method === 'Target.attachedToTarget' &&
      m.params.targetInfo.type === 'worker'
    )
      realms.set(m.params.sessionId, {
        url: m.params.targetInfo.url,
        peakUsed: 0,
        peakTotal: 0,
        peakHeld: 0,
        samples: 0,
        alive: true,
      });
    else if (m.method === 'Target.detachedFromTarget') {
      const r = realms.get(m.params.sessionId);
      if (r) r.alive = false;
    }
  });
  await proto.send(
    'Target.setAutoAttach',
    { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
    pageSession
  );

  const aggregate = { peakHeld: 0, peakRealms: 0, peakUsed: 0 };
  let pagePeak = 0;
  let stop = false;
  const sampler = (async () => {
    while (!stop) {
      let sumHeld = 0;
      let sumUsed = 0;
      let alive = 0;
      await Promise.all(
        [...realms].map(async ([sessionId, r]) => {
          if (!r.alive) return;
          try {
            const h = await proto.send('Runtime.getHeapUsage', {}, sessionId);
            r.samples++;
            r.peakUsed = Math.max(r.peakUsed, h.usedSize);
            r.peakTotal = Math.max(r.peakTotal, h.totalSize);
            r.peakHeld = Math.max(r.peakHeld, held(h));
            sumHeld += held(h);
            sumUsed += h.usedSize;
            alive++;
          } catch {
            r.alive = false;
          }
        })
      );
      aggregate.peakHeld = Math.max(aggregate.peakHeld, sumHeld);
      aggregate.peakUsed = Math.max(aggregate.peakUsed, sumUsed);
      aggregate.peakRealms = Math.max(aggregate.peakRealms, alive);
      try {
        pagePeak = Math.max(
          pagePeak,
          (await cdp.send('Runtime.getHeapUsage')).usedSize
        );
      } catch {
        /* the page is busy */
      }
      await new Promise(r => setTimeout(r, 15));
    }
  })();

  const t0 = Date.now();
  await page.locator('#fitRun').click();
  await page.waitForFunction(
    () =>
      /Fitted in|failed/i.test(
        document.getElementById('fitStatus')?.textContent || ''
      ),
    null,
    { timeout: 600_000 }
  );
  const wallMs = Date.now() - t0;
  const status = await page.locator('#fitStatus').innerText();
  stop = true;
  await sampler;
  proto.close();
  const list = [...realms.values()].filter(r => r.samples > 0);
  const concurrency = await page.evaluate(() =>
    navigator.hardwareConcurrency <= 4
      ? 2
      : Math.min(8, navigator.hardwareConcurrency - 1)
  );
  await context.close();
  return {
    fixture: 'tess-light-curve',
    rows,
    status,
    wallMs,
    concurrency,
    realmsSampled: list.length,
    realmsSeen: realms.size,
    perRealmPeakHeldMB: list.map(r => MB(r.peakHeld)),
    perRealmPeakUsedMB: list.map(r => MB(r.peakUsed)),
    maxRealmHeldMB: MB(Math.max(0, ...list.map(r => r.peakHeld))),
    medianRealmHeldMB: MB(median(list.map(r => r.peakHeld)) ?? 0),
    aggregatePeakHeldMB: MB(aggregate.peakHeld),
    aggregatePeakUsedMB: MB(aggregate.peakUsed),
    peakRealmsAtOnce: aggregate.peakRealms,
    pageHeapPeakMB: MB(pagePeak),
  };
}

/** The storage a first visit leaves, with both tiers installed. */
async function storage(browser, origin) {
  const { context, page } = await newPage(
    browser,
    origin,
    { viewport: { width: 1280, height: 800 } },
    { serviceWorkers: 'allow' }
  );
  await page.goto(`${origin}/`, { waitUntil: 'load' });
  const status = () =>
    page.evaluate(
      () =>
        new Promise(resolve => {
          const c = navigator.serviceWorker.controller;
          if (!c) return resolve(null);
          const ch = new MessageChannel();
          ch.port1.onmessage = e => resolve(e.data);
          c.postMessage({ type: 'status' }, [ch.port2]);
        })
    );
  // The worker claims the page when its install finishes; then the idle tier.
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, {
    timeout: 300_000,
  });
  await page.evaluate(() =>
    navigator.serviceWorker.controller.postMessage({ type: 'install-idle' })
  );
  const t0 = Date.now();
  let s = await status();
  while (!s || s.idleCached < s.idleCount) {
    if (Date.now() - t0 > 300_000)
      throw new Error('the idle tier never finished');
    await new Promise(r => setTimeout(r, 500));
    s = await status();
  }
  const est = await page.evaluate(async () => {
    const e = await navigator.storage.estimate();
    return { usage: e.usage, quota: e.quota, details: e.usageDetails || null };
  });
  await context.close();
  return {
    usageBytes: est.usage,
    usageDetails: est.details,
    quotaBytes: est.quota,
    cacheEntries: s.cachedCount,
    precacheCount: s.precacheCount,
    idleCount: s.idleCount,
    version: s.version,
  };
}

async function main() {
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const cdpPort = await freePort();
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${cdpPort}`],
  });
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: REPO,
    encoding: 'utf8',
  }).trim();
  const report = {
    note: 'Recorded by tools/worker-probe.mjs (npm run probe:workers). A measurement on one machine in headless Chromium, not a gate: nothing in CI reads it as a pass or a fail, and tools/data-budget.mjs only reports it beside the ceilings.',
    measuredAt: commit,
    date: new Date().toISOString().slice(0, 10),
    environment: {
      chromium: browser.version(),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      load1: Number(loadavg()[0].toFixed(1)),
    },
    observatory: {},
    profileRun: {},
    storage: null,
  };
  try {
    for (const [name, p] of Object.entries(PROFILES)) {
      report.observatory[name] = await observatory(browser, origin, p);
      report.profileRun[name] = await profileRun(browser, origin, p, cdpPort);
    }
    report.storage = await storage(browser, origin);
  } finally {
    await browser.close();
    server.close();
  }
  if (argv.includes('--write'))
    await writeFile(RESULTS_FILE, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`)
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
