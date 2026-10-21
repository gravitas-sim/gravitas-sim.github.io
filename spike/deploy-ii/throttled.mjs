// Spike (Prompt 158): time to usable, requests and bytes on the throttled profile,
// sources and build interleaved, three runs per cell. Disposable; never merged.
// node spike/deploy-ii/throttled.mjs [--runs=3] [--json=out.json]
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const RUNS = Number(argv.find(a => a.startsWith('--runs='))?.slice(7) || 3);
const JSON_OUT = argv.find(a => a.startsWith('--json='))?.slice(7);
const MAX_LOAD = 24;

const taken = port => new Promise(r => {
  const s = net.connect({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); r(true); });
  s.once('error', () => r(false));
});
async function serve(root, port) {
  while (await taken(port)) port++;
  const child = spawn(process.execPath, [path.join(REPO, 'tools/static-server.mjs'), '--root', root, '--port', String(port)], { stdio: 'ignore' });
  const end = Date.now() + 15000;
  while (!(await taken(port))) { if (Date.now() > end) throw new Error('server'); await sleep(50); }
  child.port = port; return child;
}
const waitLoad = async () => { while (os.loadavg()[0] > MAX_LOAD) await sleep(5000); };
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const ROUTES = [
  { id: 'front-door', url: '/', usable: async page => page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 120000 }) },
  { id: 'kepler', url: '/#investigation=keplers-laws', usable: async page => page.waitForFunction(() => { const p = document.getElementById('investigationPanel'); const t = document.getElementById('investigationTitle'); return p && !p.hidden && t?.textContent.trim(); }, null, { timeout: 120000 }) },
  { id: 'observatory+1', url: '/observatory/', usable: async page => {
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 120000 });
      await page.locator('#obsFixture').selectOption('tess-light-curve');
      await page.locator('#obsOpen').click();
      await page.locator('#obsTable tbody tr').first().waitFor({ state: 'visible', timeout: 120000 });
  } },
];

async function once(browser, base, route) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => { try { localStorage.setItem('gravitas_welcome_seen_v1', '1'); } catch {} });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1e6) / 8, uploadThroughput: (0.75 * 1e6) / 8 });
  let requests = 0, js = 0, jsRequests = 0;
  const reading = new Set();
  page.on('request', () => requests++);
  page.on('response', res => {
    if (!/\.m?js(\?|$)/.test(res.url())) return;
    jsRequests++;
    const p = res.body().then(b => { js += b.length; }).catch(() => {}).finally(() => reading.delete(p));
    reading.add(p);
  });
  const t0 = Date.now();
  await page.goto(base + route.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await route.usable(page);
  const ms = Date.now() - t0;
  await page.waitForLoadState('networkidle').catch(() => {});
  while (reading.size) await Promise.allSettled([...reading]);
  await context.close();
  return { ms, requests, jsRequests, jsKB: Math.round(js / 102.4) / 10 };
}

const servers = { sources: await serve(REPO, 4470), build: await serve(path.join(REPO, 'dist'), 4471) };
const browser = await chromium.launch();
const out = { profile: 'Chromium, CPU x4, 150 ms RTT, 1.6 Mbit/s down, 0.75 Mbit/s up; service worker blocked; cold cache', runs: [], node: process.version, cpus: os.cpus().length };
try {
  for (const route of ROUTES) {
    for (let i = 0; i < RUNS; i++) {
      for (const cfg of ['sources', 'build']) {
        await waitLoad();
        const load0 = os.loadavg()[0].toFixed(2);
        const r = await once(browser, `http://127.0.0.1:${servers[cfg].port}`, route);
        const load1 = os.loadavg()[0].toFixed(2);
        out.runs.push({ route: route.id, config: cfg, run: i, ...r, load0, load1 });
        console.log(route.id, cfg, i, JSON.stringify(r), 'load', load0, load1);
      }
    }
  }
} finally {
  await browser.close();
  for (const s of Object.values(servers)) s.kill();
}
out.summary = {};
for (const route of ROUTES) for (const cfg of ['sources', 'build']) {
  const rs = out.runs.filter(r => r.route === route.id && r.config === cfg);
  out.summary[`${route.id}/${cfg}`] = { medianMs: median(rs.map(r => r.ms)), minMs: Math.min(...rs.map(r => r.ms)), maxMs: Math.max(...rs.map(r => r.ms)), requests: median(rs.map(r => r.requests)), jsRequests: median(rs.map(r => r.jsRequests)), jsKB: median(rs.map(r => r.jsKB)) };
}
console.log(JSON.stringify(out.summary, null, 1));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
