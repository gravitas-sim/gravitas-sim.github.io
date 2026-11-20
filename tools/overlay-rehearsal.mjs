// =============================================================================
// Publish A, then B, then A again: the reader's cache must end coherent
// -----------------------------------------------------------------------------
//   node tools/overlay-rehearsal.mjs <tree A> <tree B> [--json out.json]
//
// Development only, outside the gate (a browser run). A and B are two staged
// trees from tools/prepare-pages.mjs: the tree as published today, and the same
// commit with the routes of tools/route-overlay.mjs laid over it. One origin,
// one browser profile, three publications in turn, as a returning reader would
// meet them. After each:
//   - the reader's worker takes the new publication once every tab has closed
//     (the worker never swaps a running page's code, sw.js), and then exactly
//     one cache is left, named as that publication's manifest names it;
//   - the Observatory page is the one that publication serves (the built page
//     loads /observatory/js/, the tree's /js/observatoryPage.js), its
//     revision stamp is the publication's, and a publication without the
//     built page has none of its files in the cache;
//   - with the network off, the front door, Kepler's Laws and the Observatory
//     open in English and in Spanish with no failed request and no page error.
// =============================================================================

/* global caches, navigator, setTimeout */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const [treeA, treeB] = argv
  .filter(a => !a.startsWith('--'))
  .map(p => path.resolve(p));
const jsonAt = argv.includes('--json')
  ? argv[argv.indexOf('--json') + 1]
  : null;
if (!treeA || !treeB)
  throw new Error('usage: overlay-rehearsal.mjs <tree A> <tree B>');

const taken = port =>
  new Promise(r => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.once('connect', () => (s.destroy(), r(true)));
    s.once('error', () => r(false));
  });
let port = 4490;
while (await taken(port)) port++;
const base = `http://127.0.0.1:${port}`;
let server = null;
async function publish(dir) {
  if (server) {
    server.kill();
    while (await taken(port)) await sleep(50);
  }
  server = spawn(
    process.execPath,
    [
      path.join(REPO, 'tools/static-server.mjs'),
      '--root',
      dir,
      '--port',
      String(port),
    ],
    { stdio: 'ignore' }
  );
  while (!(await taken(port))) await sleep(50);
}
const manifestOf = dir => {
  const sandbox = { self: {} };
  vm.runInNewContext(
    readFileSync(path.join(dir, 'sw-manifest.js'), 'utf8'),
    sandbox
  );
  const rev = JSON.parse(
    readFileSync(path.join(dir, 'deployed-revision.json'), 'utf8')
  );
  return {
    version: sandbox.self.__GRAVITAS_CACHE_VERSION,
    count: sandbox.self.__GRAVITAS_PRECACHE.length,
    install:
      sandbox.self.__GRAVITAS_PRECACHE_CORE.length +
      sandbox.self.__GRAVITAS_PRECACHE_OPTIONAL.length,
    commit: rev.commit,
    overlay: rev.overlay ?? [],
  };
};

const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: 'allow' });
await context.addInitScript(() => {
  try {
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
  } catch {
    /* storage refused: the welcome shows, which nothing here reads */
  }
});

/** Open a tab, let the publication's worker install fully, report it. */
async function settle(dir) {
  for (const p of context.pages()) await p.close();
  const want = manifestOf(dir);
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 90000,
  });
  // A page-side poll; the predicate below is synchronous on purpose.
  await page.evaluate(() => {
    (async function loop() {
      const keys = await caches.keys();
      const reg = await navigator.serviceWorker.getRegistration();
      const counts = {};
      for (const k of keys)
        counts[k] = (await (await caches.open(k)).keys()).length;
      window.__sw = {
        keys,
        counts,
        waiting: !!reg?.waiting,
        installing: !!reg?.installing,
        active: reg?.active?.state ?? null,
      };
      setTimeout(loop, 400);
    })();
  });
  await page.waitForFunction(
    ([v, n]) =>
      window.__sw && window.__sw.counts[v] >= n && !window.__sw.installing,
    [want.version, want.install],
    { timeout: 300000 }
  );
  // A waiting worker takes over once every tab has closed.
  const waited = await page.evaluate(() => window.__sw.waiting);
  await page.close();
  const tab = await context.newPage();
  await tab.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await tab.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 90000,
  });
  const deadline = Date.now() + 60000;
  let keys = [];
  while (Date.now() < deadline) {
    keys = await tab.evaluate(() => caches.keys());
    if (keys.length === 1 && keys[0] === want.version) break;
    await sleep(500);
  }
  // The idle tier installs once the worker is active and the page is quiet.
  const idleBy = Date.now() + 300000;
  let installed = 0;
  while (Date.now() < idleBy) {
    installed = await tab.evaluate(
      async v => (await (await caches.open(v)).keys()).length,
      want.version
    );
    if (installed >= want.count) break;
    await sleep(1000);
  }
  // What the cache holds that this publication does not serve: the built
  // Observatory's files, left behind by a publication that had them.
  const builtFiles = await tab.evaluate(
    async v =>
      (await (await caches.open(v)).keys()).filter(r =>
        new URL(r.url).pathname.startsWith('/observatory/js/')
      ).length,
    want.version
  );
  // A reader who opened each route once, in the language they read: the
  // Spanish lesson text is cached on that first use (it is not installed).
  for (const locale of ['en', 'es'])
    for (const [, url, kind] of ROUTES) {
      const visit = await context.newPage();
      await visit.addInitScript(
        l => localStorage.setItem('gravitas_locale', l),
        locale
      );
      await visit.goto(base + url, { waitUntil: 'load' });
      if (kind !== 'page')
        await visit.waitForFunction(
          () => window.splashScreenEnded === true,
          null,
          { timeout: 90000 }
        );
      await sleep(kind === 'lesson' ? 4000 : 2000);
      await visit.close();
    }
  const observatory = await context.newPage();
  await observatory.goto(`${base}/observatory/`, { waitUntil: 'load' });
  const served = await observatory.evaluate(() => ({
    scripts: [...document.scripts]
      .map(s => s.getAttribute('src'))
      .filter(Boolean),
    stamp:
      document.querySelector('meta[name="gravitas-revision"]')?.content ?? null,
  }));
  await observatory.close();
  await tab.close();
  return {
    version: want.version,
    overlay: want.overlay,
    tookOverAfterTabsClosed: waited,
    caches: keys,
    coherent: keys.length === 1 && keys[0] === want.version,
    observatoryBuilt: served.scripts.includes(
      '/observatory/js/observatoryPage.js'
    ),
    installed,
    builtFilesCached: builtFiles,
    // Only the built page is stamped; the tree's Observatory never was.
    observatoryStamp: want.overlay.includes('observatory')
      ? served.stamp === want.commit
      : served.stamp === null,
  };
}

const ROUTES = [
  ['front door', '/', 'app'],
  ['kepler', '/#investigation=keplers-laws', 'lesson'],
  ['observatory', '/observatory/', 'page'],
];

/** Every route opened with the network off, in both languages. */
async function offline() {
  const out = {};
  await context.setOffline(true);
  for (const locale of ['en', 'es']) {
    for (const [name, url, kind] of ROUTES) {
      const tab = await context.newPage();
      await tab.addInitScript(
        l => localStorage.setItem('gravitas_locale', l),
        locale
      );
      const bad = [];
      tab.on(
        'response',
        r =>
          r.status() >= 400 && bad.push(`${r.status()} ${r.url().slice(-60)}`)
      );
      tab.on('requestfailed', r => bad.push(`failed ${r.url().slice(-60)}`));
      tab.on('pageerror', e => bad.push(`error ${e.message.slice(0, 90)}`));
      let state = 'opened';
      try {
        await tab.goto(base + url, { waitUntil: 'load', timeout: 60000 });
        if (new URL(tab.url()).pathname !== new URL(base + url).pathname)
          state = `redirected to ${new URL(tab.url()).pathname}`;
        else if (kind !== 'page')
          await tab.waitForFunction(
            () => window.splashScreenEnded === true,
            null,
            { timeout: 60000 }
          );
        if (kind === 'lesson')
          await tab.waitForFunction(
            () => {
              const t = document.getElementById('investigationTitle');
              return (
                !document.getElementById('investigationPanel')?.hidden &&
                !!t?.textContent.trim()
              );
            },
            null,
            { timeout: 60000 }
          );
        if (kind === 'page') await sleep(3000);
        const lang = await tab.evaluate(() => document.documentElement.lang);
        if (lang !== locale) state = `opened in ${lang}`;
      } catch (e) {
        state = `not opened: ${String(e.message).split('\n')[0].slice(0, 100)}`;
      }
      await tab.close();
      out[`${name} (${locale})`] = {
        ok: state === 'opened' && bad.length === 0,
        state,
        problems: bad.slice(0, 5),
      };
    }
  }
  await context.setOffline(false);
  return out;
}

const record = { when: new Date().toISOString(), steps: [] };
try {
  for (const [label, dir] of [
    ['A', treeA],
    ['B', treeB],
    ['A again', treeA],
  ]) {
    await publish(dir);
    const state = await settle(dir);
    state.offline = await offline();
    record.steps.push({ label, ...state });
  }
} catch (e) {
  record.error = String(e).slice(0, 400);
} finally {
  await browser.close();
  server?.kill();
}
record.coherent =
  !record.error &&
  record.steps.every(
    s =>
      s.coherent &&
      s.observatoryStamp &&
      s.observatoryBuilt === s.overlay.includes('observatory') &&
      (s.overlay.includes('observatory') || s.builtFilesCached === 0) &&
      Object.values(s.offline).every(o => o.ok)
  );
const text = `${JSON.stringify(record, null, 1)}\n`;
if (jsonAt) writeFileSync(jsonAt, text);
console.log(text);
process.exitCode = record.coherent ? 0 : 1;
