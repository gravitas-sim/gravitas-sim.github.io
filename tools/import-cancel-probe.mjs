#!/usr/bin/env node
// =============================================================================
// npm run probe:import-cancel - what a cancelled decode leaves behind
// -----------------------------------------------------------------------------
// Prompt 188 (IMAGE_IMPORT.md): a reader may choose a large frame and change
// their mind. The import reads it in a disposable Worker under the page's
// memory ledger, and cancelling terminates the realm. The bounds below were
// written before this ran (tools/image-import-cases.mjs BOUNDS):
//
//   - the ledger is empty at once after Cancel (cancelledLedgerBytes, 0);
//   - the Worker the read started has been terminated within 2 s;
//   - the page's JS heap and ArrayBuffer backing stores (Runtime.getHeapUsage:
//     usedSize + backingStorageSize, after a collection) are within 8 MiB of
//     where they were before the file was chosen (cancelledHeapBytes).
//
// The file is the largest frame, 2,048 x 2,048 at BITPIX -64 (33.5 MB). Every
// Worker hears its first message 1.5 s late, so the job is in flight, the file
// and the plane declared in the ledger, when Cancel is pressed. A second row
// does the same for a read that finished and was then closed. Run on the two
// profiles of tools/decoded-memory-probe.mjs (CPU slowing reaches the page and
// not its Workers). One machine, headless Chromium, not a gate beyond its bounds.
//
//   node tools/import-cancel-probe.mjs [--write]   --write records
//   tools/import-cancel-results.json
// =============================================================================

/* global Worker, setTimeout */

import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { loadavg } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { BOUNDS } from './image-import-cases.mjs';
import { image } from './data-kinds-cases.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_FILE = path.join(REPO, 'tools', 'import-cancel-results.json');
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
        'cache-control': 'no-store',
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

const PROFILES = {
  'low-end': {
    viewport: { width: 375, height: 812 },
    cpu: 4,
    mobile: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, cpu: 1 },
};
const held = h => h.usedSize + (h.backingStorageSize || 0);
const MiB = 1048576;
const FRAME = 2048;

async function settle(cdp, page) {
  for (let i = 0; i < 3; i++) {
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(150);
  }
  return held(await cdp.send('Runtime.getHeapUsage'));
}

async function run(browser, origin, p, big, mode) {
  const context = await browser.newContext({
    viewport: p.viewport,
    isMobile: !!p.mobile,
    hasTouch: !!p.mobile,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__made = 0;
    window.__ended = 0;
    const Real = Worker;
    window.Worker = class extends Real {
      constructor(...a) {
        super(...a);
        window.__made++;
        const post = this.postMessage.bind(this);
        if (window.__slow)
          this.postMessage = (...m) => setTimeout(() => post(...m), 1500);
        const end = this.terminate.bind(this);
        this.terminate = () => {
          window.__ended++;
          end();
        };
      }
    };
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  if (p.cpu > 1)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  await page.goto(`${origin}/observatory/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  const ledger = () =>
    page.evaluate(async () => {
      const m = await import('/js/observatory/imageImport.js');
      return m.ledgerSnapshot().bytes;
    });
  await page.evaluate(m => (window.__slow = m === 'cancel'), mode);
  const before = await settle(cdp, page);
  const t0 = Date.now();
  await page.locator('#obsFile').setInputFiles({
    name: 'big.fits',
    mimeType: 'application/octet-stream',
    buffer: big,
  });
  const out = { profile: null, mode, baselineBytes: before };
  if (mode === 'cancel') {
    await page.locator('#obsImpCancel').waitFor({ timeout: 30000 });
    for (let i = 0; i < 100 && (await ledger()) < 30e6; i++)
      await page.waitForTimeout(50);
    out.heldInFlight = await ledger();
    await page.locator('#obsImpCancel').click();
    out.ledgerAfterCancel = await ledger();
    const until = Date.now() + BOUNDS.cancelledWorkersAfterMs;
    let w;
    do {
      w = await page.evaluate(() => [window.__made, window.__ended]);
      if (w[0] === w[1]) break;
      await page.waitForTimeout(50);
    } while (Date.now() < until);
    out.workers = { started: w[0], ended: w[1] };
  } else {
    await page.locator('#obsImpFields').waitFor({ timeout: 60000 });
    out.readMs = Date.now() - t0;
    await page.locator('#obsImpClose').click();
    out.ledgerAfterCancel = await ledger();
    out.workers = await page
      .evaluate(() => [window.__made, window.__ended])
      .then(([started, ended]) => ({ started, ended }));
  }
  // The test double's own timer holds the message (and the file) for 1.5 s;
  // measuring before it has fired would measure the double.
  await page.waitForTimeout(2000);
  const after = await settle(cdp, page);
  out.afterBytes = after;
  out.growthBytes = after - before;
  const ok =
    out.ledgerAfterCancel === BOUNDS.cancelledLedgerBytes &&
    out.workers.started === out.workers.ended &&
    out.growthBytes <= BOUNDS.cancelledHeapBytes;
  out.verdict = ok ? 'pass' : 'FAIL';
  await context.close();
  return out;
}

async function main() {
  const write = process.argv.includes('--write');
  const load = loadavg()[0];
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const big = image({
    bitpix: -64,
    width: FRAME,
    height: FRAME,
    values: new Float64Array(FRAME * FRAME).fill(1),
  });
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const [name, p] of Object.entries(PROFILES))
      for (const mode of ['cancel', 'close']) {
        const r = await run(browser, origin, p, big, mode);
        r.profile = name;
        rows.push(r);
        console.log(
          `${name.padEnd(8)} ${mode.padEnd(6)} ledger ${r.ledgerAfterCancel} B, workers ${r.workers.started}/${r.workers.ended} ended, heap ${(r.growthBytes / MiB).toFixed(2)} MiB over baseline: ${r.verdict}`
        );
      }
  } finally {
    await browser.close();
    server.close();
  }
  const results = {
    note: 'Prompt 188: what a cancelled (and a closed) 2,048 x 2,048 BITPIX -64 FITS read leaves behind, in Chromium, measured by tools/import-cancel-probe.mjs. Bounds from tools/image-import-cases.mjs BOUNDS, written before the run.',
    bounds: {
      ledgerBytes: BOUNDS.cancelledLedgerBytes,
      workersEndedWithinMs: BOUNDS.cancelledWorkersAfterMs,
      heapGrowthBytes: BOUNDS.cancelledHeapBytes,
    },
    machine: { loadAverageAtStart: Number(load.toFixed(2)) },
    rows,
  };
  if (write) {
    await writeFile(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`);
    console.log(`wrote ${path.relative(REPO, RESULTS_FILE)}`);
  }
  if (rows.some(r => r.verdict !== 'pass')) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
