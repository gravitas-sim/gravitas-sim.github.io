// SPIKE (Prompt 18): what the largest answer the workflow accepts costs a
// low-end device. Chromium, CPU throttled 4x (DevTools' "low-end mobile"),
// heap read by CDP after a forced collection.
//
//   VOTable: a synthetic epoch-photometry answer grown to the 2,000,000-byte
//            limit tapQuery enforces, parsed and converted
//   FITS:    the 1.9 MB SPOC light curve of SU Dra (TESS sector 15), read by
//            the bounded reader; needs GRAVITAS_PACKS_CACHE
//
// Run: GRAVITAS_PACKS_CACHE=... node spike/vo/measure/memory.mjs [--json out]
// Nothing else heavy may run meanwhile: a timing taken under load is not one.

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { loadavg } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const FITS = 'tess2019226182529-s0015-0000000142848794-0151-s_lc.fits';
const cache = process.env.GRAVITAS_PACKS_CACHE;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.vot': 'application/x-votable+xml', '.fits': 'application/fits' };

// The fixture's rows, repeated with shifted times until the limit.
function bigVotable(limit) {
  const text = readFileSync(join(ROOT, 'spike/vo/fixtures/gaia-epphot-su-dra.vot'), 'utf8');
  const head = text.slice(0, text.indexOf('<TR>'));
  const tail = text.slice(text.lastIndexOf('</TR>') + 5);
  const rows = text.slice(text.indexOf('<TR>'), text.lastIndexOf('</TR>') + 5).split('</TR>').filter(r => r.includes('<TR>')).map(r => `${r}</TR>`);
  let body = '';
  for (let k = 0; head.length + body.length + tail.length < limit - 400; k++) {
    const row = rows[k % rows.length].replace(/<TD>([\d.]+)<\/TD>/, (m, t) => `<TD>${(Number(t) + 0.001 * k).toFixed(6)}</TD>`);
    body += row;
  }
  return head + body + tail;
}

const big = bigVotable(2_000_000);
const mid = bigVotable(512_000);
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/big.vot' || path === '/mid.vot') {
    res.writeHead(200, { 'content-type': TYPES['.vot'] });
    return res.end(path === '/big.vot' ? big : mid);
  }
  if (path === `/${FITS}` && cache && existsSync(join(cache, FITS))) {
    res.writeHead(200, { 'content-type': TYPES['.fits'] });
    return res.end(readFileSync(join(cache, FITS)));
  }
  if (path === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<!doctype html><title>m</title>');
  }
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const renderers = () =>
  execFileSync('ps', ['-Ao', 'pid=,rss=,command='])
    .toString()
    .split('\n')
    .map(l => l.trim().split(/\s+/))
    .filter(([, , ...cmd]) => cmd.join(' ').includes('--type=renderer'));
const before = new Set(renderers().map(([pid]) => pid));
const browser = await chromium.launch();
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
await page.goto(`${origin}/`);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

async function heap() {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find(m => m.name === 'JSHeapUsedSize').value;
}

async function measure(name, fn, arg) {
  const before = await heap();
  const out = await page.evaluate(fn, arg);
  const { metrics } = await cdp.send('Performance.getMetrics');
  const during = metrics.find(m => m.name === 'JSHeapUsedSize').value;
  const after = await heap();
  return { name, ...out, heldMB: +((after - before) / 1e6).toFixed(2), beforeCollectMB: +((during - before) / 1e6).toFixed(2) };
}

const results = [];
for (const [label, path] of [['2 MB', '/big.vot'], ['512 KB', '/mid.vot']])
for (let run = 0; run < 3; run++) {
  results.push(
    await measure(`VOTable of ${label}: fetch, parse, convert`, async path => {
      const { fetchLimited } = await import('/spike/vo/net.js');
      const { parseVotable } = await import('/spike/vo/votable.js');
      const { toObservation, tableDigest } = await import('/spike/vo/archive.js');
      const t0 = performance.now();
      const got = await fetchLimited(path, { maxBytes: 2_000_000 });
      const t1 = performance.now();
      const table = parseVotable(new TextDecoder().decode(got.bytes));
      const t2 = performance.now();
      const q = { table, url: path, finalUrl: path, bytes: got.bytes.length, sha256: '0'.repeat(64), contentSha256: await tableDigest(table), retrieved: new Date().toISOString() };
      const o = toObservation(q, { source: '1', band: 'G' });
      const t3 = performance.now();
      window.__keep = o; // the observation is what a page keeps
      return { bytes: got.bytes.length, rows: table.rows.length, fetchMs: Math.round(t1 - t0), parseMs: Math.round(t2 - t1), convertMs: Math.round(t3 - t2) };
    }, path)
  );
}
if (cache && existsSync(join(cache, FITS))) {
  for (let run = 0; run < 3; run++) {
    results.push(
      await measure('TESS SPOC light curve (1.9 MB): fetch, bounded read', async fits => {
        const { fetchLimited } = await import('/spike/vo/net.js');
        const { readFitsBounded } = await import('/spike/vo/fitsBounded.js');
        const t0 = performance.now();
        const got = await fetchLimited(`/${fits}`, { maxBytes: 4_000_000 });
        const t1 = performance.now();
        const units = readFitsBounded(got.bytes);
        const t2 = performance.now();
        const lc = units[1].columns;
        window.__keep = { t: lc.TIME.values, f: lc.PDCSAP_FLUX.values };
        return { bytes: got.bytes.length, rows: lc.TIME.values.length, fetchMs: Math.round(t1 - t0), parseMs: Math.round(t2 - t1) };
      }, FITS)
    );
  }
}

// The parsed XML is a Document in Blink's heap, which JSHeapUsedSize does not
// count. Renderer RSS does: hold five parsed 2 MB answers and divide.
// This browser's renderers: the ones that did not exist before it launched.
const rendererRssMB = () =>
  renderers()
    .filter(([pid]) => !before.has(pid))
    .reduce((n, [, rss]) => n + Number(rss), 0) / 1024;
{
  await heap();
  const base = rendererRssMB();
  await page.evaluate(async () => {
    const text = await (await fetch('/big.vot')).text();
    window.__docs = Array.from({ length: 5 }, () => new DOMParser().parseFromString(text, 'application/xml'));
  });
  await heap();
  const held = rendererRssMB();
  await page.evaluate(() => {
    window.__docs = null;
  });
  await heap();
  results.push({ name: 'DOM Document of a 2 MB VOTable (renderer RSS, 5 held)', perDocumentMB: +((held - base) / 5).toFixed(1), rendererBaseMB: +base.toFixed(0) });
}
await browser.close();
server.close();

const report = { at: new Date().toISOString(), loadavg: loadavg().map(v => +v.toFixed(2)), cpuThrottle: 4, results };
console.table(results);
console.log('load average', report.loadavg);
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], `${JSON.stringify(report, null, 2)}\n`);
