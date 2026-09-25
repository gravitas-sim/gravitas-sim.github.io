#!/usr/bin/env node
// =============================================================================
// npm run bench:observatory - what the observatory costs a reader
// -----------------------------------------------------------------------------
// Opens /observatory/ in Chromium as two readers and measures, for each
// observation it offers:
//
//   transfer     bytes fetched: the page, then each observation as it opens
//   memory       the page's JavaScript heap once it is open
//   interaction  milliseconds from an input to both views showing it: opening
//                it, moving the focused row by keyboard, a drag across the
//                plot, a change (a bin), and undoing it
//
//   desktop  1280 x 800, the machine's own speed
//   mobile   375 x 812, the CPU slowed four times (Chrome DevTools' mid-tier
//            phone). The observatory runs on the page's own thread, so the
//            throttle slows everything it does; nothing here is modelled.
//
// Served as GitHub Pages serves the site (the sources, max-age=600), on a
// fresh browser context each profile, so the transfer is a first visit.
// tools/observatory-budgets.json holds the ceilings; --check compares.
//
//   node tools/observatory-bench.mjs [--json] [--check] [--repeat 5]
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const REPEAT = Number(
  argv.includes('--repeat') ? argv[argv.indexOf('--repeat') + 1] : 5
);
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

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 800 }, cpu: 1 },
  mobile: { viewport: { width: 375, height: 812 }, cpu: 4, mobile: true },
};

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : null;
};
const round = (v, d = 1) => Number(v.toFixed(d));

/** Bytes the page fetched from the network, counted through the protocol. */
function counter(cdp) {
  let bytes = 0;
  cdp.on('Network.loadingFinished', e => {
    bytes += e.encodedDataLength;
  });
  return { take: () => bytes };
}

/**
 * Two times, in the page, for one action: how long its handlers ran (the
 * work, measured before any frame), and how long until the frame after the
 * one it is painted in (what a reader waits for, whose floor is the display's
 * frame interval - about 33 ms at 60 Hz - however little the work).
 */
const inPage = (page, fn, arg) =>
  page.evaluate(
    async ({ src, arg }) => {
      const action = new Function('arg', `return (${src})(arg);`);
      const t0 = performance.now();
      const pending = action(arg);
      const work = performance.now() - t0;
      await pending;
      await new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
      return { work, paint: performance.now() - t0 };
    },
    { src: fn.toString(), arg }
  );

async function measureFixture(page, cdp, net, id, repeat) {
  const before = net.take();
  const open = await inPage(
    page,
    async fixtureId => {
      const html = document.documentElement;
      const before = Number(html.dataset.opens || 0);
      document.getElementById('obsFixture').value = fixtureId;
      document.getElementById('obsOpen').click();
      const t0 = performance.now();
      while (Number(html.dataset.opens || 0) === before) {
        if (performance.now() - t0 > 30000) throw new Error('never opened');
        await new Promise(r => window.setTimeout(r, 2));
      }
    },
    id
  );
  // Settle, so the heap is the observation's and not the load's garbage.
  await page.waitForTimeout(300);
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  const transfer = net.take() - before;

  const keys = [];
  for (let k = 0; k < repeat; k++) {
    keys.push(
      await inPage(page, () => {
        const row = document.querySelector('#obsTable tbody tr[tabindex="0"]');
        row.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            key: 'ArrowDown',
            bubbles: true,
          })
        );
      })
    );
  }
  const drags = [];
  const kind = await page.evaluate(() =>
    document.getElementById('obsImageBox').hidden ? 'plot' : 'image'
  );
  for (let k = 0; k < repeat; k++) {
    drags.push(
      await inPage(
        page,
        target => {
          const el = document.getElementById(
            target === 'plot' ? 'obsPlot' : 'obsImage'
          );
          const r = el.getBoundingClientRect();
          const at = f => ({
            clientX: r.left + r.width * f,
            clientY: r.top + r.height * 0.5,
            pointerId: 1,
            button: 0,
            bubbles: true,
          });
          el.dispatchEvent(new window.PointerEvent('pointerdown', at(0.3)));
          el.dispatchEvent(new window.PointerEvent('pointermove', at(0.5)));
          el.dispatchEvent(new window.PointerEvent('pointerup', at(0.7)));
        },
        kind
      )
    );
  }
  // A change and its undo, where the observation has one to make.
  let change = null;
  let undo = null;
  const canBin = await page.evaluate(
    () => !document.getElementById('obsBinBox').hidden
  );
  if (canBin) {
    const width = await page.evaluate(() => {
      const lo = Number(document.getElementById('obsCropMin').value);
      const hi = Number(document.getElementById('obsCropMax').value);
      return (hi - lo) / 200;
    });
    change = await inPage(
      page,
      w => {
        document.getElementById('obsBinWidth').value = String(w);
        document.getElementById('obsBinGo').click();
      },
      width
    );
    undo = await inPage(page, () => document.getElementById('obsUndo').click());
  }
  return {
    fixture: id,
    rows: await page.evaluate(
      () =>
        document
          .querySelector('#obsTable caption')
          .textContent.match(/of (\d+)/)?.[1]
    ),
    openMs: round(open.paint),
    transferKB: round(transfer / 1024),
    heapMB: round(heap / 1e6),
    keyMs: round(median(keys.map(k => k.work))),
    keyPaintMs: round(median(keys.map(k => k.paint))),
    dragMs: round(median(drags.map(k => k.work))),
    dragPaintMs: round(median(drags.map(k => k.paint))),
    changeMs: change === null ? null : round(change.work),
    undoMs: undo === null ? null : round(undo.work),
  };
}

async function main() {
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const report = { load: Number(loadavg()[0].toFixed(1)), profiles: {} };
  try {
    for (const [name, p] of Object.entries(PROFILES)) {
      const context = await browser.newContext({
        viewport: p.viewport,
        isMobile: !!p.mobile,
        hasTouch: !!p.mobile,
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Performance.enable');
      if (p.cpu > 1)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
      const net = counter(cdp);
      const t0 = Date.now();
      await page.goto(`${origin}/observatory/`, { waitUntil: 'load' });
      await page.waitForFunction(
        () => document.documentElement.dataset.ready === 'true'
      );
      const loadMs = Date.now() - t0;
      await cdp.send('HeapProfiler.collectGarbage');
      const pageHeap = (await cdp.send('Runtime.getHeapUsage')).usedSize;
      const entry = {
        cpu: p.cpu,
        viewport: p.viewport,
        pageKB: round(net.take() / 1024),
        loadMs,
        pageHeapMB: round(pageHeap / 1e6),
        fixtures: [],
      };
      const ids = await page.evaluate(() =>
        [...document.querySelectorAll('#obsFixture option')].map(o => o.value)
      );
      for (const id of ids) {
        entry.fixtures.push(await measureFixture(page, cdp, net, id, REPEAT));
      }
      report.profiles[name] = entry;
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `\nChromium headless, sources as Pages serves them; load average ${report.load}\n`
    );
    for (const [name, e] of Object.entries(report.profiles)) {
      console.log(
        `${name}: page ${e.pageKB} KB, ready in ${e.loadMs} ms, heap ${e.pageHeapMB} MB (CPU x${e.cpu})`
      );
      console.log(
        '  observation         rows   open ms  +KB    heap MB  key ms (to paint)  drag ms (to paint)  bin ms  undo ms'
      );
      for (const f of e.fixtures) {
        console.log(
          `  ${f.fixture.padEnd(18)} ${String(f.rows).padStart(5)}  ${String(f.openMs).padStart(7)}  ${String(f.transferKB).padStart(5)}  ${String(f.heapMB).padStart(7)}  ${`${f.keyMs} (${f.keyPaintMs})`.padStart(17)}  ${`${f.dragMs} (${f.dragPaintMs})`.padStart(18)}  ${String(f.changeMs ?? '-').padStart(6)}  ${String(f.undoMs ?? '-').padStart(7)}`
        );
      }
    }
  }

  if (argv.includes('--check')) {
    const budgets = JSON.parse(
      readFileSync(path.join(REPO, 'tools/observatory-budgets.json'), 'utf8')
    );
    const problems = [];
    for (const [name, b] of Object.entries(budgets.profiles)) {
      const e = report.profiles[name];
      if (e.pageKB > b.pageKB)
        problems.push(`${name}: the page is ${e.pageKB} KB, over ${b.pageKB}`);
      for (const f of e.fixtures) {
        for (const k of [
          'openMs',
          'transferKB',
          'heapMB',
          'keyMs',
          'keyPaintMs',
          'dragMs',
          'dragPaintMs',
          'changeMs',
          'undoMs',
        ]) {
          if (f[k] !== null && b[k] !== undefined && f[k] > b[k]) {
            problems.push(`${name} ${f.fixture}: ${k} ${f[k]}, over ${b[k]}`);
          }
        }
      }
    }
    for (const p of problems) console.error(`  ${p}`);
    if (problems.length) process.exit(1);
    console.log('\nEvery measurement within its budget.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
