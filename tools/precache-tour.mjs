#!/usr/bin/env node
// =============================================================================
// What a visit actually fetches, against what the precache holds (Prompt 112)
// -----------------------------------------------------------------------------
// Development only. Drives six short tours (the application with scenarios and
// lessons, the Observatory, the Studio, the Composer, the course page, the 3-D
// lab) through headless Chromium with service workers blocked, records every
// same-origin request, and sets that against sw-manifest.js: how much of the
// core precache a visit touches, which requests fall outside the precache, and
// which core files no tour touched. It is evidence for the precache tiers in
// OFFLINE_AND_LOW_END.md, not a gate: a tour is a sample of what a reader
// does, and a file it did not touch is a candidate to examine, not a proof.
//
//   node tools/precache-tour.mjs
// =============================================================================

import { chromium } from 'playwright';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { serveStatic } from './static-server.mjs';
const manifest = globalThis;
manifest.self = manifest;
await import(process.cwd() + '/sw-manifest.js');
const core = new Set(
  manifest.__GRAVITAS_PRECACHE_CORE.map(p => p.replace('./', ''))
);
const opt = new Set(
  manifest.__GRAVITAS_PRECACHE_OPTIONAL.map(p => p.replace('./', ''))
);
const server = await serveStatic({ root: process.cwd(), port: 8145 });
const browser = await chromium.launch();
const tours = {
  'main app': async page => {
    await page.goto('http://localhost:8145/');
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      for (const k of [
        'solar-system',
        'star-cluster',
        'trappist-1-system',
        'gw150914',
      ]) {
        ui.SETTINGS.preset_scenario = k;
        ui.initialize_simulation({ seed: 't' });
        await new Promise(r => window.setTimeout(r, 800));
      }
    });
    for (const id of [
      'keplers-laws',
      'lives-of-stars',
      'listening-to-spacetime',
    ]) {
      await page.evaluate(h => {
        window.location.hash = '';
        window.location.hash = 'investigation=' + h;
      }, id);
      await page.waitForTimeout(2500);
      await page.evaluate(() =>
        document.getElementById('investigationClose')?.click()
      );
    }
    await page
      .evaluate(async () => {
        const m = await import('/js/i18n/index.js');
        await m.setLocale?.('es');
      })
      .catch(() => {});
    await page.waitForTimeout(1500);
  },
  observatory: async page => {
    await page.goto('http://localhost:8145/observatory/');
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === 'true'
    );
    await page.evaluate(() => {
      document.getElementById('obsOpen').click();
    });
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
      for (const id of [
        'obsMeasurePanel',
        'obsFitPanel',
        'obsComparePanel',
        'obsSkyPanel',
        'obsArchivePanel',
        'obsGuidePanel',
      ]) {
        document.getElementById(id)?.querySelector('summary')?.click();
        await new Promise(r => window.setTimeout(r, 800));
      }
    });
  },
  studio: async page => {
    await page.goto('http://localhost:8145/studio/');
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    await page.waitForTimeout(1500);
  },
  composer: async page => {
    await page.goto('http://localhost:8145/studio/lesson/');
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
    await page.waitForTimeout(1500);
  },
  course: async page => {
    await page.goto('http://localhost:8145/course/');
    await page.waitForTimeout(2500);
  },
  '3d lab': async page => {
    await page.goto('http://localhost:8145/3d/');
    await page.waitForTimeout(4000);
  },
};
const seen = {};
for (const [name, run] of Object.entries(tours)) {
  const ctx = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() =>
    localStorage.setItem('gravitas_welcome_seen_v1', '1')
  );
  const urls = new Set();
  page.on('request', r => {
    const u = new URL(r.url());
    if (u.origin === 'http://localhost:8145')
      urls.add(u.pathname.replace(/^\//, '') || 'index.html');
  });
  try {
    await run(page);
  } catch (e) {
    console.log(name, 'tour error', String(e).slice(0, 100));
  }
  seen[name] = urls;
  await ctx.close();
}
const size = p => {
  try {
    return zlib.gzipSync(fs.readFileSync(p), { level: 6 }).length;
  } catch {
    return 0;
  }
};
const kb = n => (n / 1024).toFixed(0) + 'K';
const all = new Set([...core, ...opt]);
console.log(
  'tour'.padEnd(12),
  'requested',
  'in core',
  'in opt',
  'not precached'
);
for (const [name, urls] of Object.entries(seen)) {
  const u = [...urls];
  const inCore = u.filter(p => core.has(p));
  const inOpt = u.filter(p => opt.has(p));
  const miss = u.filter(p => !all.has(p));
  console.log(
    name.padEnd(12),
    String(u.length).padStart(5),
    String(inCore.length).padStart(7),
    String(inOpt.length).padStart(6),
    miss.slice(0, 8).join(' '),
    miss.length > 8 ? '+' + (miss.length - 8) : ''
  );
}
const main = seen['main app'];
const touched = new Set(Object.values(seen).flatMap(s => [...s]));
let coreGz = 0,
  coreGzTouchedMain = 0,
  coreGzTouchedAny = 0;
const untouched = {};
for (const p of core) {
  const g = size(p);
  coreGz += g;
  if (main.has(p)) coreGzTouchedMain += g;
  if (touched.has(p)) coreGzTouchedAny += g;
  else {
    const d = p.split('/').slice(0, 3).join('/');
    untouched[d] = (untouched[d] || 0) + g;
  }
}
console.log(
  'core gz',
  kb(coreGz),
  'touched by main-app tour',
  kb(coreGzTouchedMain),
  'touched by any tour',
  kb(coreGzTouchedAny)
);
console.log(
  'core never touched, by dir:',
  Object.entries(untouched)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([d, g]) => d + ' ' + kb(g))
    .join(' | ')
);
await browser.close();
server.close();
