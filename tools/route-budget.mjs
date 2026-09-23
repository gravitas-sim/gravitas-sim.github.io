#!/usr/bin/env node
// =============================================================================
// What a fresh visitor downloads, route by route
// -----------------------------------------------------------------------------
// The bundle budget (tools/bundle-budget.mjs) holds two totals: what start-up
// downloads and what everything deferred adds up to. Neither answers the
// question a lesson author changes: what does opening *this* lesson cost? A
// family moved behind a dynamic import leaves both totals where they were and
// takes a quarter of a megabyte off every lesson that does not use it; an
// import added in the wrong place does the reverse. This measures it.
//
// Two configurations, because the site is published unbundled - the deploy job
// uploads the committed sources and GitHub Pages serves them - while the budgets
// above measure a bundle:
//
//   sources   the repository root, served as Pages serves it
//   build     dist/, from `node build.js`
//
// Each route is loaded in a new browser context, with an empty HTTP cache and
// the service worker blocked, so what is counted is what the page itself asks
// for on the way to usable - not a background precache. For a lesson, "usable"
// is its first step on screen; for a lesson with a lazily loaded instrument,
// the instrument step is measured too. Bytes and request counts only: they are
// the same on every run, and a check has to be.
//
// The ceilings are in tools/route-budgets.json, pinned to the commit they were
// measured at. This tool never raises one. A ceiling that is too tight is
// changed by hand, in a reviewed commit that says why, like every other budget.
//
//   npm run budget:routes               check both configurations
//   node tools/route-budget.mjs --report                print, do not judge
//   node tools/route-budget.mjs --config=sources        one configuration
// =============================================================================

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGETS_FILE = path.join(REPO, 'tools', 'route-budgets.json');

/** The routes the lazy-capabilities gate measured, and what each waits for. */
export const ROUTES = [
  { id: 'front-door', url: '/' },
  { id: 'sandbox', url: '/?scenario=Solar%20System' },
  { id: 'kepler', url: '/#investigation=keplers-laws', lesson: true },
  {
    id: 'transit',
    url: '/#investigation=transit-photometry',
    lesson: true,
    toolStep: 5,
  },
  {
    id: 'power-law',
    url: '/#investigation=power-law-gravity',
    lesson: true,
    toolStep: 3,
  },
  {
    id: 'largest-lesson',
    url: '/#investigation=a-universe-of-stars',
    lesson: true,
  },
  // The document pages: nothing here moves them, which is what makes them
  // worth holding - a change that pulls the application into one shows up.
  { id: 'teaching', url: '/teaching/', page: true },
  { id: 'evaluation', url: '/evaluation/', page: true },
  { id: 'instructors', url: '/instructors/', page: true },
];

const CONFIGS = {
  sources: { root: REPO },
  build: { root: path.join(REPO, 'dist') },
};

/** Serve a directory with the repository's own static server. */
async function serve(root, port) {
  const child = spawn(
    process.execPath,
    [
      path.join(REPO, 'tools', 'static-server.mjs'),
      '--root',
      root,
      '--port',
      String(port),
    ],
    { stdio: 'ignore' }
  );
  await sleep(800);
  return child;
}

/**
 * Load one route fresh and count its JavaScript.
 * @returns {Promise<{kb: number, requests: number, toolKb: ?number,
 *   toolRequests: ?number}>} What the page fetched
 */
async function measure(browser, base, route) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* a first-visit dialog would only add to the count */
    }
  });
  const page = await context.newPage();
  const js = [];
  page.on('response', async res => {
    const url = res.url();
    if (!url.startsWith(base) || !/\.m?js(\?|$)/.test(url)) return;
    try {
      js.push((await res.body()).length);
    } catch {
      /* navigated away mid-body; not counted */
    }
  });
  await page.goto(base + route.url, { waitUntil: 'domcontentloaded' });
  if (route.lesson) {
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('investigationPanel');
        const title = document.getElementById('investigationTitle');
        return panel && !panel.hidden && title?.textContent.trim();
      },
      null,
      { timeout: 60_000 }
    );
  } else if (route.page) {
    await page.waitForLoadState('load');
  } else {
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  const sum = xs => xs.reduce((a, b) => a + b, 0);
  const atUsable = [...js];
  let tool = null;
  if (route.toolStep !== undefined) {
    for (let s = 0; s < route.toolStep; s++) {
      await page.locator('#investigationNext').click();
    }
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('investigationTool');
        const note = document.getElementById('investigationToolNote');
        return (
          panel && !panel.hidden && note?.getAttribute('role') !== 'status'
        );
      },
      null,
      { timeout: 60_000 }
    );
    await page.waitForLoadState('networkidle').catch(() => {});
    tool = [...js];
  }
  await context.close();
  const kb = n => Math.round(n / 102.4) / 10;
  return {
    kb: kb(sum(atUsable)),
    requests: atUsable.length,
    toolKb: tool ? kb(sum(tool)) : null,
    toolRequests: tool ? tool.length : null,
  };
}

async function main() {
  const { chromium } = await import('@playwright/test');
  const argv = process.argv.slice(2);
  const report = argv.includes('--report');
  const only = argv.find(a => a.startsWith('--config='))?.slice(9);
  const budgets = JSON.parse(readFileSync(BUDGETS_FILE, 'utf8'));
  const configs = Object.keys(CONFIGS).filter(c => !only || c === only);
  const problems = [];
  const browser = await chromium.launch();
  try {
    let port = 4460;
    for (const name of configs) {
      const { root } = CONFIGS[name];
      if (!existsSync(path.join(root, 'index.html'))) {
        problems.push(
          `${name}: ${root} has no index.html - run \`node build.js\` first`
        );
        continue;
      }
      const server = await serve(root, ++port);
      try {
        for (const route of ROUTES) {
          const got = await measure(browser, `http://127.0.0.1:${port}`, route);
          const limit = budgets.routes?.[name]?.[route.id];
          const line = `${name.padEnd(8)} ${route.id.padEnd(15)} ${String(got.kb).padStart(8)} KB ${String(got.requests).padStart(4)} requests${
            got.toolKb !== null
              ? `   instrument ${got.toolKb} KB ${got.toolRequests} requests`
              : ''
          }`;
          console.log(line);
          if (report) continue;
          if (!limit) {
            problems.push(
              `${name} ${route.id}: no ceiling in tools/route-budgets.json`
            );
            continue;
          }
          for (const [key, value] of [
            ['kb', got.kb],
            ['requests', got.requests],
            ['toolKb', got.toolKb],
            ['toolRequests', got.toolRequests],
          ]) {
            if (value === null || limit[key] === undefined) continue;
            if (value > limit[key]) {
              problems.push(
                `${name} ${route.id}: ${key} ${value} over its ceiling of ${limit[key]}`
              );
            }
          }
        }
      } finally {
        server.kill();
      }
    }
  } finally {
    await browser.close();
  }
  if (report) return 0;
  if (problems.length) {
    console.error(`\n${problems.length} route budget problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '\nA ceiling is raised by hand in tools/route-budgets.json, in a commit that says why.'
    );
    return 1;
  }
  console.log(
    `\nEvery route within its ceiling (measured at ${budgets.measuredAt}).`
  );
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().then(code => process.exit(code));
}
