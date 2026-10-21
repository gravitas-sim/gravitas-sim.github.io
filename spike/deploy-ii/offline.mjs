// Spike (Prompt 158): T2 and T6 on a precache generated over a copy of dist/.
// DOM-only, as a build-judging spec has to be. Disposable; never merged.
// node spike/deploy-ii/offline.mjs <dist-with-precache>
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
const server = spawn(process.execPath, [path.join(REPO, 'tools/static-server.mjs'), '--root', root, '--port', String(port)], { stdio: 'ignore' });
const end = Date.now() + 15000; while (!(await taken(port))) { if (Date.now() > end) throw new Error('server'); await sleep(50); }
const base = `http://127.0.0.1:${port}`;
const manifest = readFileSync(path.join(root, 'sw-manifest.js'), 'utf8');
const expected = JSON.parse(manifest.match(/__GRAVITAS_PRECACHE_CORE = (\[.*\]);/)[1]).length;
const results = { expectedCore: expected };
const failed = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  await context.addInitScript(() => { try { localStorage.setItem('gravitas_welcome_seen_v1', '1'); } catch {} });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  await page.evaluate(() => {
    window.__cached = null;
    (async function loop() {
      const keys = await caches.keys();
      const name = keys.find(k => /^gravitas-[0-9a-f]{12}$/.test(k));
      if (name) window.__cached = { name, count: (await (await caches.open(name)).keys()).length };
      setTimeout(loop, 500);
    })();
  });
  await page.waitForFunction(n => window.__cached && window.__cached.count >= n, expected, { timeout: 180000 });
  results.installed = await page.evaluate(() => window.__cached);
  await context.setOffline(true);
  page.on('requestfailed', r => failed.push(r.url().slice(0, 80)));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  results.offlineFrontDoor = 'booted';
  const tab = await context.newPage();
  tab.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(-70)); });
  tab.on('console', m => { if (m.type() === 'error') failed.push('console ' + m.text().slice(0, 120)); });
  tab.on('requestfailed', r => failed.push(r.url().slice(0, 80)));
  await tab.goto(base + '/#investigation=keplers-laws', { waitUntil: 'domcontentloaded' });
  await tab.waitForFunction(() => { const p = document.getElementById('investigationPanel'); const t = document.getElementById('investigationTitle'); return p && !p.hidden && t?.textContent.trim(); }, null, { timeout: 60000 });
  results.offlineLesson = 'opened';
  await tab.goto(base + '/observatory/', { waitUntil: 'domcontentloaded' });
  try { await tab.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 30000 }); results.offlineObservatory = 'ready'; } catch { results.offlineObservatory = 'NOT ready'; }
  results.failedRequestsOffline = failed.length; results.pageErrors = errors.slice(0, 3);
  await context.close();
} catch (e) { results.error = String(e).slice(0, 300); results.failedRequests = failed.slice(0, 12); }
finally { await browser.close(); server.kill(); }
const ver = () => readFileSync(path.join(root, 'sw-manifest.js'), 'utf8').match(/gravitas-[0-9a-f]{12}/)[0];
const regen = () => execFileSync(process.execPath, [path.join(REPO, 'spike/deploy-ii/dist-precache.mjs'), root, root, '--manifest-only'], { encoding: 'utf8' });
const v0 = ver(); regen(); const v1 = ver();
const orig = readFileSync(path.join(root, 'index.html'), 'utf8');
appendFileSync(path.join(root, 'index.html'), '\n<!-- spike touch -->');
regen(); const v2 = ver();
writeFileSync(path.join(root, 'index.html'), orig); regen(); const v3 = ver();
writeFileSync(path.join(root, 'unprecached.spike'), 'x'); regen(); const v4 = ver();
rmSync(path.join(root, 'unprecached.spike')); regen();
results.t6 = { unchanged_tree_same_version: v0 === v1, one_precached_file_changed_new_version: v1 !== v2, restored_same_version: v1 === v3, unprecached_file_added_same_version: v3 === v4 };
console.log(JSON.stringify(results, null, 1));
