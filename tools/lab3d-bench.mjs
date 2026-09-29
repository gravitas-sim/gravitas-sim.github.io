#!/usr/bin/env node
// =============================================================================
// The 3-D kernel's throughput, desktop measured and low-end modelled
// -----------------------------------------------------------------------------
// Steps a second for each fixed scheme and body count, in a Worker, in
// Chromium, Firefox and WebKit (through /lab3d/'s benchmark), and in Node.
// The low-end profile is modelled as a quarter of the slowest desktop engine,
// the convention js/experiments/experimentManifest.js PROFILES states:
// Chromium cannot slow a Worker down to measure one (its CPU throttling
// reaches the page's thread, and the kernel runs in a Worker).
//
//   node tools/lab3d-bench.mjs [--dist]    the tables, as Markdown
//   node tools/lab3d-bench.mjs --write     and write them into LAB3D.md
//
// It serves the repository (or dist/) itself, on a free port.
// =============================================================================

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from '@playwright/test';
import { bench } from '../js/lab3d/workerCore.js';

const ROOT = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
const BODIES = [3, 10, 25, 50];
const MS = 600;

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res
      .writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

const columns = { node: bench(BODIES, MS) };
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${base}/lab3d/`);
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  columns[name] = await page.evaluate(
    async ([bodies, ms]) => {
      const { createLab3d } = await import('/js/lab3d/api.js');
      const lab = createLab3d({
        spawn: () =>
          new globalThis.Worker('/js/lab3d/worker.js', { type: 'module' }),
      });
      return lab.bench({ bodies, ms }).done;
    },
    [BODIES, MS]
  );
  await browser.close();
}
server.close();

const keys = Object.keys(columns.node);
const engines = ['node', 'chromium', 'firefox', 'webkit'];
const slowest = k =>
  Math.min(...['chromium', 'firefox', 'webkit'].map(e => columns[e][k]));
const fmt = n => n.toLocaleString('en-US');
const table = [
  `| Scheme / bodies | ${engines.map(e => (e === 'node' ? 'Node' : e[0].toUpperCase() + e.slice(1))).join(' | ')} | Low-end, modelled |`,
  `|---|${engines.map(() => '---:').join('|')}|---:|`,
  ...keys.map(
    k =>
      `| ${k} | ${engines.map(e => fmt(columns[e][k])).join(' | ')} | ${fmt(Math.round(slowest(k) / 4))} |`
  ),
].join('\n');
// At 1,000 steps an orbit, how long 100 and 10,000 orbits take.
const secs = (rate, orbits) => (orbits * 1000) / rate;
const human = s =>
  s < 1
    ? `${(s * 1000).toFixed(0)} ms`
    : s < 120
      ? `${s.toFixed(1)} s`
      : `${(s / 60).toFixed(0)} min`;
const envelope = [
  '| Bodies | Compensated Yoshida, slowest desktop engine | 100 orbits, desktop / low-end | 10,000 orbits, desktop / low-end |',
  '|---:|---:|---|---|',
  ...BODIES.map(n => {
    const r = slowest(`yoshida4c/${n}`);
    return `| ${n} | ${fmt(r)} steps a second | ${human(secs(r, 100))} / ${human(secs(r / 4, 100))} | ${human(secs(r, 1e4))} / ${human(secs(r / 4, 1e4))} |`;
  }),
].join('\n');
console.log(table);
console.log();
console.log(envelope);
if (process.argv.includes('--write')) {
  let doc = readFileSync('LAB3D.md', 'utf8');
  for (const [name, text] of [
    ['throughput', table],
    ['envelope', envelope],
  ]) {
    const open = `<!-- lab3d:${name} -->`;
    const close = `<!-- /lab3d:${name} -->`;
    const i = doc.indexOf(open);
    const j = doc.indexOf(close);
    if (i < 0 || j < i) throw new Error(`LAB3D.md has no ${name} block`);
    doc = `${doc.slice(0, i + open.length)}\n${text}\n${doc.slice(j)}`;
  }
  writeFileSync('LAB3D.md', doc);
}
