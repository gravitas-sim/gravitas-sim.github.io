#!/usr/bin/env node
// =============================================================================
// npm run probe:decoded - what decoding an image holds, in a real browser
// -----------------------------------------------------------------------------
// The data kinds (Prompt 157, DATA_PACKS.md) bound a frame before it is decoded:
// 2,048 x 2,048 pixels at 8 bytes is 33,554,432 bytes, and the page may hold
// 67,108,864 of decoded images (`decodedImageBytesPerPage` in
// tools/data-budget.json). This measures what that costs in Chromium, on the two
// profiles of tools/observatory-bench.mjs and tools/worker-probe.mjs (low-end:
// 375 x 812, the page's CPU slowed four times, two cores reported; desktop):
//
//   1. each of three files is read by the shipped Worker (js/dataKinds/
//      fitsWorker.js) on the real pool, and the realm's heap and buffers are
//      sampled over the protocol while it works (Runtime.getHeapUsage, which
//      answers even while the realm is busy): the file the realm was handed, the
//      Float64 plane it makes, and the most it held. The acceptance, written
//      before the probe was run (tools/data-kinds-cases.mjs TOL.memoryPeak): the
//      realm's peak is at most 1.25 times the file plus the plane.
//   2. the page holds two 2,048-square planes at once, which is all the bound
//      lets it (residentFrames). `residentDecodedBytes` is their summed
//      byteLength, 2 x 33,554,432 = 67,108,864: the bound READ BACK, equal to the
//      ceiling by construction and unable to exceed it. It shows the cap is
//      reachable (two planes really coexist), and it is NOT an observed peak of a
//      real page, so nothing reads it as a measurement of
//      `decodedImageBytesPerPage`, which stays "not measured" in
//      tools/data-budget.mjs until a shipped route decodes images. The
//      measurements here are the realms' peaks in 1 (about 1.01 to 1.10 times
//      file plus plane; the largest file's realm peak is about 67.7 MB).
//
// CPU throttling slows the page's thread and not its Workers, so the memory is
// honest and the times are not the low-end's. A measurement on one machine in
// headless Chromium, not a gate; tools/data-budget.mjs does not read it.
//
//   node tools/decoded-memory-probe.mjs [--write]   --write records
//   tools/decoded-memory-results.json
// =============================================================================

/* global navigator, Worker, TextEncoder, WebSocket, setTimeout */

import { createServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { loadavg } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { TOL } from './data-kinds-cases.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_FILE = path.join(REPO, 'tools', 'decoded-memory-results.json');
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
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'max-age=600',
      });
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

const PROFILES = {
  'low-end': {
    viewport: { width: 375, height: 812 },
    cpu: 4,
    mobile: true,
    cores: 2,
  },
  desktop: { viewport: { width: 1280, height: 800 }, cpu: 1 },
};
const held = h => h.usedSize + (h.backingStorageSize || 0);

/** What the page is asked to read: [label, bitpix, width, height, a value for pixel i]. */
const FILES = [
  ['2048 x 2048, BITPIX -64 (the largest file)', -64, 2048, 2048],
  ['2048 x 2048, BITPIX 16', 16, 2048, 2048],
  ['1024 x 1024, BITPIX -32', -32, 1024, 1024],
];

async function profile(browser, origin, p, cdpPort) {
  const context = await browser.newContext({
    viewport: p.viewport,
    isMobile: !!p.mobile,
    hasTouch: !!p.mobile,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  if (p.cores)
    await page.addInitScript(cores => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => cores,
      });
    }, p.cores);
  const cdp = await context.newCDPSession(page);
  if (p.cpu > 1)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await page.goto(`${origin}/observatory/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  await page.evaluate(async () => {
    const BLOCK = 2880;
    const card = (k, v) =>
      `${k.padEnd(8)}= ${typeof v === 'string' ? `'${v.padEnd(8)}'` : String(v).padStart(20)}`.padEnd(
        80
      );
    window.__file = (bitpix, w, h) => {
      const size = Math.abs(bitpix) / 8;
      const cards = [
        'SIMPLE  =                    T',
        card('BITPIX', bitpix),
        card('NAXIS', 2),
        card('NAXIS1', w),
        card('NAXIS2', h),
        'END',
      ];
      const head = new Uint8Array(
        Math.ceil((cards.length * 80) / BLOCK) * BLOCK
      ).fill(32);
      cards.forEach((c, i) =>
        head.set(new TextEncoder().encode(c.padEnd(80)), i * 80)
      );
      const out = new Uint8Array(
        head.length + Math.ceil((w * h * size) / BLOCK) * BLOCK
      );
      out.set(head);
      const view = new DataView(out.buffer, head.length);
      for (let i = 0; i < w * h; i++) {
        const v = (i * 7919) % 1000;
        if (bitpix === 16) view.setInt16(i * 2, v, false);
        else if (bitpix === -32) view.setFloat32(i * 4, v, false);
        else view.setFloat64(i * 8, v, false);
      }
      return out.buffer;
    };
    const { createLedger, createPool } = await import('/js/workers/pool.js');
    window.__job = await import('/js/dataKinds/fitsJob.js');
    window.__book = createLedger({ memoryBytes: 256000000, realms: 2 });
    window.__pool = createPool({
      book: window.__book,
      concurrency: 1,
      spawn: () =>
        new Worker('/js/dataKinds/fitsWorker.js', { type: 'module' }),
    });
    window.__kept = [];
  });

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
      realms.set(m.params.sessionId, { peak: 0, samples: 0, alive: true });
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

  const cases = [];
  for (const [label, bitpix, w, h] of FILES) {
    realms.clear();
    let stop = false;
    const sampler = (async () => {
      while (!stop) {
        await Promise.all(
          [...realms].map(async ([sessionId, r]) => {
            if (!r.alive) return;
            try {
              const u = await proto.send('Runtime.getHeapUsage', {}, sessionId);
              r.samples++;
              r.peak = Math.max(r.peak, held(u));
            } catch {
              r.alive = false;
            }
          })
        );
        await new Promise(r => setTimeout(r, 10));
      }
    })();
    const read = await page.evaluate(
      async ([b, wd, ht]) => {
        const file = window.__file(b, wd, ht);
        const fileBytes = file.byteLength;
        const t0 = performance.now();
        const out = await window.__job.readFitsOnPool(window.__pool, file);
        return {
          ok: out.ok,
          fileBytes,
          planeBytes: out.ok ? out.image.values.byteLength : 0,
          ms: Math.round(performance.now() - t0),
          ledgerAfter: window.__book.snapshot().bytes,
          declared: out.ok
            ? out.geometry.fileBytes + out.geometry.decodedBytes
            : 0,
        };
      },
      [bitpix, w, h]
    );
    stop = true;
    await sampler;
    const peak = Math.max(0, ...[...realms.values()].map(r => r.peak));
    const samples = [...realms.values()].reduce((s, r) => s + r.samples, 0);
    cases.push({
      file: label,
      ...read,
      realmPeakHeldBytes: peak,
      realmSamples: samples,
      peakOverFileAndPlane: Number(
        (peak / (read.fileBytes + read.planeBytes)).toFixed(3)
      ),
    });
  }

  // What a page may hold: two full planes resident at once.
  const resident = await page.evaluate(async () => {
    for (let i = 0; i < 2; i++) {
      const out = await window.__job.readFitsOnPool(
        window.__pool,
        window.__file(16, 2048, 2048)
      );
      window.__kept.push(out.image.values);
    }
    return window.__kept.reduce((s, a) => s + a.byteLength, 0);
  });
  proto.close();
  await context.close();
  return {
    cases,
    residentDecodedBytes: resident,
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
    sampling:
      'The realm answers Runtime.getHeapUsage every 10 ms while it works; a read lasts tens of milliseconds, so each peak is the largest of a few samples and a lower bound on the true peak (realmSamples says how few). The 1.25 acceptance is judged on the samples.',
    note: 'Recorded by tools/decoded-memory-probe.mjs (npm run probe:decoded). A measurement on one machine in headless Chromium, not a gate. The realm peaks are the measurements; residentDecodedBytes is the bound read back (two planes at the ceiling by construction), and tools/data-budget.mjs does not read this file, so decodedImageBytesPerPage stays not measured until a shipped route decodes images.',
    measuredAt: commit,
    date: new Date().toISOString().slice(0, 10),
    environment: {
      chromium: browser.version(),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      load1: Number(loadavg()[0].toFixed(1)),
    },
    acceptance: { realmPeakOverFileAndPlane: TOL.memoryPeak.value },
    profiles: {},
  };
  try {
    for (const [name, p] of Object.entries(PROFILES))
      report.profiles[name] = await profile(browser, origin, p, cdpPort);
  } finally {
    await browser.close();
    server.close();
  }
  report.within = Object.values(report.profiles).every(
    p =>
      p.residentDecodedBytes === 2 * 2048 * 2048 * 8 &&
      p.cases.every(
        c =>
          c.ok &&
          c.peakOverFileAndPlane <= TOL.memoryPeak.value &&
          c.ledgerAfter === 0
      )
  );
  if (process.argv.includes('--write'))
    await writeFile(RESULTS_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.within) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`)
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
