// Prototype (spike): THRESHOLDS.md section 4 in Chromium. The low-end profile
// is CDP CPU throttling at 4x, which reaches the page and not a dedicated
// Worker, so the sampler's own time is the same module in the throttled
// page's main thread; the Worker is measured unthrottled for its progress
// gaps, its cancel latency and its heap growth.
//   node spike/sampler/bench.mjs [problems, e.g. G,B,P,T] [runs]
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const PORT = 4893;
const types = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html',
  '.json': 'application/json',
};
const server = http.createServer((req, res) => {
  const p = path.join(
    ROOT,
    decodeURIComponent(new URL(req.url, 'http://x').pathname)
  );
  if (!p.startsWith(ROOT) || !existsSync(p) || !statSync(p).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'content-type': types[path.extname(p)] || 'application/octet-stream',
  });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const problems = (process.argv[2] || 'G,B,P,T').split(',');
const runs = Number(process.argv[3] || 3);
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const browser = await chromium.launch({
  args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
});
const out = {
  chromium: browser.version(),
  cpus: os.cpus()[0].model,
  loadBefore: os.loadavg(),
  problems: {},
};
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/spike/sampler/bench.html`);
await page.waitForFunction(() => window.ready === true);
const client = await page.context().newCDPSession(page);
const ceilings = { G: 10, B: 10, P: 5, T: 120 };
for (const id of problems) {
  const row = { throttledMs: [], unthrottledMs: [], loads: [] };
  // warm-up at a small length
  await page.evaluate(i => window.mainThreadRun(i, 100), id);
  for (let r = 0; r < runs; r++) {
    row.loads.push(os.loadavg()[0]);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t = await page.evaluate(i => window.mainThreadRun(i), id);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    row.throttledMs.push(t.ms);
    row.status = t.status;
    row.retainedBytes = t.retainedBytes;
    row.heapGrowthBytes = Math.max(row.heapGrowthBytes ?? 0, t.heapGrowth);
    console.log(
      id,
      'throttled run',
      r + 1,
      (t.ms / 1000).toFixed(1),
      's',
      t.status,
      'load',
      os.loadavg()[0].toFixed(1)
    );
  }
  row.medianThrottledS = median(row.throttledMs) / 1000;
  row.ceilingS = ceilings[id];
  row.timePass = row.medianThrottledS <= ceilings[id];
  // one unthrottled main-thread run, and the Worker run
  const u = await page.evaluate(i => window.mainThreadRun(i), id);
  row.unthrottledMs = [u.ms];
  const w = await page.evaluate(i => window.workerRun(i), id);
  row.worker = {
    wallMs: w.wallMs,
    maxProgressGapMs: w.maxProgressGapMs,
    pageProgressGapMs: w.pageProgressGapMs,

    retainedMB: w.retainedBytes / 2 ** 20,
    status: w.status,
  };
  row.memoryPass =
    row.retainedBytes <= 32 * 2 ** 20 && row.heapGrowthBytes <= 96 * 2 ** 20;
  if (id !== 'T') {
    // cancel latency: a long run cancelled 300 ms in, on the Worker (unthrottled,
    // the profile cannot reach it) - the batch is sized to 25 ms
    const c = await page.evaluate(i => window.workerRun(i, 400000, 300), id);
    row.cancel = { type: c.type, latencyMs: c.cancelLatencyMs };
  }
  out.problems[id] = row;
  console.log(
    id,
    JSON.stringify({
      median: row.medianThrottledS,
      pass: row.timePass,
      worker: row.worker,
      cancel: row.cancel,
    })
  );
}
out.loadAfter = os.loadavg();
writeFileSync(
  path.join(ROOT, 'spike/sampler/results', `bench-${problems.join('')}.json`),
  JSON.stringify(out, null, 1)
);
await browser.close();
server.close();
