// Spike (Prompt 315, third run): T2, T6 and a rollback on a precache generated
// over a copy of dist/, and an offline open of every route the B table maps.
// DOM-only, as a build-judging check has to be. Disposable; never merged.
// node spike/deploy-iii/offline.mjs <dist-with-precache>
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { readFileSync, appendFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(process.argv[2]);
const taken = port => new Promise(r => { const s = net.connect({ port, host: '127.0.0.1' }); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); });
let port = 4472; while (await taken(port)) port++;
const serve = dir => spawn(process.execPath, [path.join(REPO, 'tools/static-server.mjs'), '--root', dir, '--port', String(port)], { stdio: 'ignore' });
const up = async () => { const end = Date.now() + 15000; while (!(await taken(port))) { if (Date.now() > end) throw new Error('server'); await sleep(50); } };
const down = async () => { const end = Date.now() + 15000; while (await taken(port)) { if (Date.now() > end) throw new Error('server stop'); await sleep(50); } };
let server = serve(root); await up();
const base = `http://127.0.0.1:${port}`;
const versionOf = dir => readFileSync(path.join(dir, 'sw-manifest.js'), 'utf8').match(/gravitas-[0-9a-f]{12}/)[0];
const manifest = readFileSync(path.join(root, 'sw-manifest.js'), 'utf8');
const expected = JSON.parse(manifest.match(/__GRAVITAS_PRECACHE_CORE = (\[.*\]);/)[1]).length;
const results = { expectedCore: expected, buildVersion: versionOf(root), routes: {} };

// The routes of the B table (DEPLOY_MODEL_GATE.md, third run, part B), by the
// URLs tools/route-budget.mjs measures.
const APP = [
  ['front-door', '/'],
  ['sandbox', '/?scenario=Solar%20System'],
  ['kepler', '/#investigation=keplers-laws'],
  ['transit', '/#investigation=transit-photometry'],
  ['power-law', '/#investigation=power-law-gravity'],
  ['largest-lesson', '/#investigation=a-universe-of-stars'],
];
const PAGES = [
  ['observatory', '/observatory/'],
  ['sky', '/sky/'],
  ['experiments', '/experiments/'],
  ['my-work', '/my-work/'],
  ['instructors', '/instructors/'],
  ['teaching', '/teaching/'],
  ['adoption', '/teaching/investigation/keplers-laws/'],
  ['teach-find', '/teaching/find/'],
  ['teach-kit', '/teaching/kit/'],
];

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  await context.addInitScript(() => { try { localStorage.setItem('gravitas_welcome_seen_v1', '1'); } catch {} });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  const watchCache = () => page.evaluate(() => {
    window.__cached = null;
    (async function loop() {
      const keys = await caches.keys();
      window.__keys = keys;
      const reg = await navigator.serviceWorker.getRegistration();
      window.__reg = reg ? { active: reg.active?.state ?? null, installing: !!reg.installing, waiting: !!reg.waiting } : null;
      const name = keys.find(k => /^gravitas-[0-9a-f]{12}$/.test(k));
      if (name) window.__cached = { name, count: (await (await caches.open(name)).keys()).length };
      setTimeout(loop, 500);
    })();
  });
  await watchCache();
  const all = JSON.parse(manifest.match(/__GRAVITAS_PRECACHE = (\[.*\]);/)[1]).length;
  results.expectedAll = all;
  await page.waitForFunction(n => window.__cached && window.__cached.count >= n, expected, { timeout: 240000 });
  results.installed = await page.evaluate(() => window.__cached);
  await page.waitForFunction(() => window.__reg?.active === 'activated', null, { timeout: 120000 });
  try {
    await page.waitForFunction(n => window.__cached && window.__cached.count >= n, all, { timeout: 240000 });
    results.installedAll = await page.evaluate(() => window.__cached);
  } catch { results.installedAll = { incomplete: await page.evaluate(() => window.__cached) }; }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  results.controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);

  const openOffline = async ([id, url], app) => {
    const tab = await context.newPage();
    const bad = [];
    tab.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(-70)}`); });
    tab.on('requestfailed', r => bad.push(`failed ${r.url().slice(-70)}`));
    tab.on('pageerror', e => bad.push(`error ${e.message.slice(0, 100)}`));
    let state = 'opened';
    try {
      const res = await tab.goto(base + url, { waitUntil: 'load', timeout: 60000 });
      const want = new URL(base + url).pathname;
      const got = new URL(tab.url()).pathname;
      if (!res || res.status() >= 400) state = `document ${res ? res.status() : 'none'}`;
      else if (got !== want) state = `redirected to ${got}`;
      else if (app) {
        await tab.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
        if (url.includes('investigation=')) await tab.waitForFunction(() => { const p = document.getElementById('investigationPanel'); const t = document.getElementById('investigationTitle'); return p && !p.hidden && t?.textContent.trim(); }, null, { timeout: 60000 });
      } else await sleep(3000);
    } catch (e) { state = `not opened: ${String(e.message).split('\n')[0].slice(0, 120)}`; }
    await tab.close();
    results.routes[id] = { state, ok: state === 'opened' && bad.length === 0, problems: bad.slice(0, 6), problemCount: bad.length };
  };
  for (const r of APP) await openOffline(r, true);
  for (const r of PAGES) await openOffline(r, false);
  results.pageErrors = errors.slice(0, 3);

  // Rollback: the tree replaces the build at the same origin; the tree's own
  // worker must take over a context the build's worker served.
  await context.setOffline(false);
  server.kill(); await down();
  server = serve(REPO); await up();
  const treeVersion = versionOf(REPO);
  results.rollback = { treeVersion };
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  await watchCache();
  try {
    await page.waitForFunction(v => (window.__keys || []).includes(v), treeVersion, { timeout: 240000 });
    results.rollback.treeCacheCreated = true;
    await page.waitForFunction(() => window.__reg && !window.__reg.installing && window.__reg.waiting, null, { timeout: 240000 });
    results.rollback.treeWorkerWaiting = true;
  } catch { results.rollback.treeCacheCreated = false; }
  // A waiting worker takes over when the reader accepts or every tab closes.
  results.rollback.beforeTabsClosed = await page.evaluate(async () => ({ caches: await caches.keys(), waiting: !!(await navigator.serviceWorker.getRegistration())?.waiting }));
  for (const p of context.pages()) await p.close();
  const fresh = await context.newPage();
  fresh.on('pageerror', e => errors.push(`rollback ${e.message}`));
  await fresh.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await fresh.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && (await fresh.evaluate(v => caches.keys().then(k => k.includes(v)), results.buildVersion))) await sleep(500);
  const scripts = file => [...readFileSync(file, 'utf8').matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1].replace(/^\.\//, ''));
  const treeScripts = scripts(path.join(REPO, 'index.html'));
  const buildScripts = scripts(path.join(root, 'index.html'));
  const onPage = await fresh.evaluate(() => [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean).map(s => s.replace(/^\.\//, '')));
  results.rollback.afterTabsClosed = {
    caches: await fresh.evaluate(() => caches.keys()),
    servedTreeDocument: treeScripts.every(s => onPage.includes(s)) && !buildScripts.filter(s => !treeScripts.includes(s)).some(s => onPage.includes(s)),
    onPage: onPage.slice(0, 6),
  };
  results.rollback.buildCacheGone = !results.rollback.afterTabsClosed.caches.includes(results.buildVersion);
  results.pageErrors = errors.slice(0, 5);
  await context.close();
} catch (e) { results.error = String(e).slice(0, 300); }
finally { await browser.close(); server.kill(); }

const ver = () => versionOf(root);
const regen = () => execFileSync(process.execPath, [path.join(REPO, 'spike/deploy-iii/dist-precache.mjs'), root, root, '--manifest-only'], { encoding: 'utf8' });
const v0 = ver(); regen(); const v1 = ver();
const orig = readFileSync(path.join(root, 'index.html'), 'utf8');
appendFileSync(path.join(root, 'index.html'), '\n<!-- spike touch -->');
regen(); const v2 = ver();
writeFileSync(path.join(root, 'index.html'), orig); regen(); const v3 = ver();
writeFileSync(path.join(root, 'unprecached.spike'), 'x'); regen(); const v4 = ver();
rmSync(path.join(root, 'unprecached.spike')); regen();
results.t6 = { unchanged_tree_same_version: v0 === v1, one_precached_file_changed_new_version: v1 !== v2, restored_same_version: v1 === v3, unprecached_file_added_same_version: v3 === v4 };
console.log(JSON.stringify(results, null, 1));
