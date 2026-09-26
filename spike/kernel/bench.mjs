// SPIKE (Prompt 21): run the kernel bench in every engine, and on a low-end
// profile (Chromium with the CPU throttled 4x, DevTools' "low-end mobile").
//   node spike/kernel/bench.mjs [--json out] [--repeats 5] [--rounds 3]
// Nothing else heavy may run meanwhile: a timing under load is not one. The
// one-minute load average is recorded before and after every profile, and a
// round is marked `loaded` when it began above --quiet (default 2), or ended
// above it by more than the bench's own two busy threads.

import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadavg, cpus } from 'node:os';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
const arg = (name, d) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : d;
};
const repeats = Number(arg('--repeats', 5));
const rounds = Number(arg('--rounds', 3));
const quiet = Number(arg('--quiet', 2));

const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/bench.html`;

const runs = [];
for (let round = 1; round <= rounds; round++)
  for (const [name, engine, throttle] of [
    ['chromium', chromium, 1],
    ['chromium-4x', chromium, 4],
    ['firefox', firefox, 1],
    ['webkit', webkit, 1],
  ]) {
    const browser = await engine.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    if (throttle > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    }
    const loadBefore = loadavg()[0];
    const result = await page.evaluate(r => window.bench({ repeats: r }), repeats);
    const loadAfter = loadavg()[0];
    const loaded = loadBefore > quiet || loadAfter > quiet + 2;
    runs.push({ round, profile: name, throttle, loadBefore: +loadBefore.toFixed(2), loadAfter: +loadAfter.toFixed(2), loaded, ...result });
    await browser.close();
    console.log(round, name, loaded ? 'LOADED' : 'quiet', loadBefore.toFixed(2), loadAfter.toFixed(2), JSON.stringify({ gls: result.gls, bls: result.bls, wasm: result.wasm }));
  }
server.close();
const report = { at: new Date().toISOString(), cpus: cpus().length, cpu: cpus()[0]?.model, runs };
const out = arg('--json', null);
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
