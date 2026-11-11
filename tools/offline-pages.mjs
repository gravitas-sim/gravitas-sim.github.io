#!/usr/bin/env node
// =============================================================================
// What every page of the site needs, against what the worker saves (Prompt 284)
// -----------------------------------------------------------------------------
// Development only. Opens every HTML page of the tree (tools/csp.mjs lists
// them) in headless Chromium with service workers blocked, scrolls once so the
// lazy pictures load, waits for the page to go quiet, records every same-origin
// request, and sets that against sw-manifest.js:
//
//   - the page itself: core, optional, idle, or runtime (not in any tier, so
//     the worker keeps it only after one online visit);
//   - its requests: how many fall in each tier, and every one that is not in
//     the first-visit install, by name.
//
// From that it states a promise per page (what is true offline, and when):
//   first visit     the page and everything it fetched is in the install
//   after it settles  the page or something it fetches is in the idle tier
//   one online visit  the page, or a file it fetches, is in no tier: the worker
//                   keeps it once it has been fetched (stale-while-revalidate),
//                   so the page opens offline after a visit that loaded it,
//                   and a part it opens later only if that part was opened
//
// The result is tools/offline-pages.json, committed; OFFLINE_AND_LOW_END.md's
// per-page table is rendered from it (tools/precache-inventory.mjs), and
// tests/offlinePages.test.js holds the record to the manifest: a page whose
// tier moved, a request that now sits in a different tier, or a page the tour
// never saw fails until the tour is run again. e2e/offlinePages.spec.js opens
// the pages that promise offline, with the network gone.
//
//   node tools/offline-pages.mjs            run the tour, write the record
//   node tools/offline-pages.mjs --print    run it and print, write nothing
// =============================================================================

/* global setTimeout */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import { tierReader, promiseOf, tourPages } from './offline-tiers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = path.join(ROOT, 'tools/offline-pages.json');

async function tour() {
  const tierOf = tierReader();
  const server = await serveStatic({ root: ROOT, port: 8146 });
  const browser = await chromium.launch();
  const rows = [];
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    for (const url of await tourPages()) {
      const page = await context.newPage();
      const seen = new Set();
      page.on('request', r => {
        const u = new URL(r.url());
        if (u.origin === server.url.replace(/\/$/, '')) seen.add(u.pathname);
      });
      await page.goto(`${server.url.replace(/\/$/, '')}${url}`, {
        waitUntil: 'load',
      });
      await page
        .evaluate(async () => {
          // The lazy pictures load as they scroll into view.
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise(r => setTimeout(r, 40));
          }
        })
        .catch(() => {});
      await page.waitForTimeout(900);
      await page.close();
      const html = tierOf(url);
      const counts = { core: 0, optional: 0, idle: 0, never: 0, runtime: 0 };
      const outside = [];
      for (const p of [...seen].sort()) {
        if (p === url || p === url + 'index.html') continue;
        const tier = tierOf(p);
        counts[tier]++;
        if (tier !== 'core' && tier !== 'optional')
          outside.push({ path: p, tier });
      }
      rows.push({
        page: url,
        html,
        requests: Object.values(counts).reduce((a, b) => a + b, 0),
        ...counts,
        outside,
      });
      process.stdout.write('.');
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.stdout.write('\n');
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = await tour();
  const record = {
    format: 'gravitas.offline-pages/1',
    note: 'Written by tools/offline-pages.mjs from a headless Chromium tour with service workers blocked: every same-origin request each page made after it loaded and was scrolled, set against sw-manifest.js. Not edited by hand; tests/offlinePages.test.js holds it to the manifest.',
    pages: rows.map(r => ({ ...r, promise: promiseOf(r) })),
  };
  const summary = {};
  for (const r of record.pages)
    summary[r.promise] = (summary[r.promise] ?? 0) + 1;
  console.log(JSON.stringify(summary));
  if (!process.argv.includes('--print'))
    fs.writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
}
