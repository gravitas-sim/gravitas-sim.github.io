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
//   node tools/route-budget.mjs --lessons               every lesson, reported
//   node tools/route-budget.mjs --lessons --json=out.json --repeat=3
//
// --lessons measures every lesson in the registry, not the sample above, and
// says which instrument families each one fetched before its first step was
// usable and what each later step that first needs a family adds. It judges
// nothing; it is how the lesson ceilings are measured and how a change that
// moves them is described (LAZY_CAPABILITIES.md). --repeat takes the median
// time to usable over that many fresh loads; bytes and requests are the same
// on every load.
// =============================================================================

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { familiesInScript } from './instrument-families.mjs';

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
  { id: 'figure', url: '/figure/', page: true },
  // The experiment runner prices an experiment as it opens, by building one
  // trial in a Worker, so its route carries the engine the Worker loads.
  { id: 'experiments', url: '/experiments/', page: true },
  { id: 'observatory', url: '/observatory/', page: true },
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
  // Every body read still in flight. The response event fires before the body
  // has arrived, so a total taken the moment the network goes quiet would
  // leave out whatever was still being read - which is how a first version of
  // this reported the same page 40 KB apart on two runs.
  const reading = new Set();
  page.on('response', res => {
    const url = res.url();
    if (!url.startsWith(base) || !/\.m?js(\?|$)/.test(url)) return;
    const read = res
      .body()
      .then(body => js.push(body.length))
      .catch(() => {
        /* navigated away mid-body; not counted */
      })
      .finally(() => reading.delete(read));
    reading.add(read);
  });
  const settled = async () => {
    await page.waitForLoadState('networkidle').catch(() => {});
    while (reading.size) await Promise.allSettled([...reading]);
  };
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
  await settled();
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
    await settled();
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

/**
 * Every lesson, and the step at which each instrument family is first named.
 *
 * Worked out in a page served from the sources, where every module has its
 * own path: the lesson registry for the steps, and each family module's own
 * exported instruments for which family owns an id. Read from the modules
 * rather than from LAZY_FAMILIES, so that a family still loaded eagerly is
 * attributed as well - which is what a before-and-after needs.
 *
 * @returns {Promise<Array<{id: string, families: Object<string, number>}>>}
 *   Lesson id, and family module name -> zero-based step it is first used at
 */
async function lessonPlan(browser, base) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  // Any page of the site will do: the plan only needs its module paths.
  await page.goto(`${base}/robots.txt`);
  const familyFiles = readdirSync(path.join(REPO, 'js')).filter(f =>
    /^[A-Za-z]+Widgets\.js$/.test(f)
  );
  const plan = await page.evaluate(async files => {
    const owner = {};
    for (const file of files) {
      const mod = await import(`/js/${file}`);
      for (const value of Object.values(mod)) {
        if (!Array.isArray(value)) continue;
        for (const w of value) {
          if (w && typeof w.id === 'string' && typeof w.draw === 'function') {
            owner[w.id] = file.replace(/\.js$/, '');
          }
        }
      }
    }
    const reg = await import('/js/data/investigations/registry.js');
    const out = [];
    for (const id of reg.investigationIds()) {
      const inv = await reg.loadInvestigation(id);
      const families = {};
      inv.steps.forEach((step, i) => {
        const family = step.tool ? owner[step.tool.id] : null;
        if (family && families[family] === undefined) families[family] = i;
      });
      out.push({ id, families });
    }
    return out;
  }, familyFiles);
  await context.close();
  return plan;
}

/**
 * Open one lesson fresh, then walk to each step that first names a family.
 * @returns {Promise<Object>} usable {kb, requests, ms, families} and one
 *   arrival per family step {step, family, kb, requests, families}
 */
async function measureLesson(browser, base, lesson, config, root) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* a first-visit dialog would only add to the count */
    }
  });
  const page = await context.newPage();
  const scripts = [];
  const reading = new Set();
  page.on('response', res => {
    const url = res.url();
    if (!url.startsWith(base) || !/\.m?js(\?|$)/.test(url)) return;
    const read = res
      .body()
      .then(body => scripts.push({ url, bytes: body.length }))
      .catch(() => {})
      .finally(() => reading.delete(read));
    reading.add(read);
  });
  const settled = async () => {
    await page.waitForLoadState('networkidle').catch(() => {});
    while (reading.size) await Promise.allSettled([...reading]);
  };
  const snapshot = () => {
    const families = new Set();
    for (const s of scripts) {
      for (const f of familiesInScript(s.url, { config, root })) {
        families.add(f);
      }
    }
    const bytes = scripts.reduce((a, s) => a + s.bytes, 0);
    return {
      kb: Math.round(bytes / 102.4) / 10,
      requests: scripts.length,
      families: [...families].sort(),
    };
  };
  const started = Date.now();
  await page.goto(`${base}/#investigation=${lesson.id}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () => {
      const panel = document.getElementById('investigationPanel');
      const title = document.getElementById('investigationTitle');
      return panel && !panel.hidden && title?.textContent.trim();
    },
    null,
    { timeout: 60_000 }
  );
  const ms = Date.now() - started;
  await settled();
  const usable = { ...snapshot(), ms };

  const count = async () =>
    Number(
      ((
        await page
          .locator('#investigationBody .inv-step-count')
          .innerText()
          .catch(() => '')
      ).match(/\d+/) || [0])[0]
    );
  const arrivals = [];
  const order = Object.entries(lesson.families).sort((a, b) => a[1] - b[1]);
  for (const [family, step] of order) {
    // Next until the one-based counter shows this step.
    for (let guard = 0; guard < 80 && (await count()) < step + 1; guard++) {
      const before = await count();
      await page.locator('#investigationNext').click();
      await page
        .waitForFunction(
          n =>
            Number(
              (document
                .querySelector('#investigationBody .inv-step-count')
                ?.textContent.match(/\d+/) || [0])[0]
            ) > n,
          before,
          { timeout: 20_000 }
        )
        .catch(() => {});
    }
    if ((await count()) !== step + 1) {
      arrivals.push({ step, family, error: `stuck at ${await count()}` });
      continue;
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
    await settled();
    arrivals.push({ step, family, ...snapshot() });
  }
  await context.close();
  return { usable, arrivals };
}

/** Every lesson route in each configuration, printed and optionally saved. */
async function reportLessons(browser, configs, { json, repeat }) {
  const out = { measuredAt: null, lessons: {} };
  try {
    const { execFileSync } = await import('node:child_process');
    out.measuredAt = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8',
    }).trim();
  } catch {
    /* not a checkout; the report still stands */
  }
  let port = 4480;
  const planServer = await serve(REPO, ++port);
  let plan;
  try {
    plan = await lessonPlan(browser, `http://127.0.0.1:${port}`);
  } finally {
    planServer.kill();
  }
  for (const name of configs) {
    const { root } = CONFIGS[name];
    if (!existsSync(path.join(root, 'index.html'))) {
      console.error(`${name}: ${root} has no index.html - run node build.js`);
      continue;
    }
    const server = await serve(root, ++port);
    try {
      for (const lesson of plan) {
        const runs = [];
        for (let r = 0; r < repeat; r++) {
          runs.push(
            await measureLesson(
              browser,
              `http://127.0.0.1:${port}`,
              lesson,
              name,
              root
            )
          );
        }
        const times = runs.map(r => r.usable.ms).sort((a, b) => a - b);
        const got = {
          ...runs[0],
          msMedian: times[Math.floor(times.length / 2)],
        };
        (out.lessons[lesson.id] ||= {})[name] = got;
        const u = got.usable;
        console.log(
          `${name.padEnd(8)} ${lesson.id.padEnd(34)} ${String(u.kb).padStart(8)} KB ${String(u.requests).padStart(4)} req ${String(got.msMedian).padStart(5)} ms  [${u.families.join(' ') || '-'}]`
        );
        for (const a of got.arrivals) {
          console.log(
            a.error
              ? `${''.padEnd(44)}step ${a.step + 1} ${a.family}: ${a.error}`
              : `${''.padEnd(44)}step ${String(a.step + 1).padStart(2)} ${a.family.padEnd(24)} ${String(a.kb).padStart(8)} KB ${String(a.requests).padStart(4)} req  [${a.families.join(' ')}]`
          );
        }
      }
    } finally {
      server.kill();
    }
  }
  if (json) writeFileSync(json, `${JSON.stringify(out, null, 1)}\n`);
  return 0;
}

async function main() {
  const { chromium } = await import('@playwright/test');
  const argv = process.argv.slice(2);
  if (argv.includes('--lessons')) {
    const only = argv.find(a => a.startsWith('--config='))?.slice(9);
    const browser = await chromium.launch();
    try {
      return await reportLessons(
        browser,
        Object.keys(CONFIGS).filter(c => !only || c === only),
        {
          json: argv.find(a => a.startsWith('--json='))?.slice(7),
          repeat: Number(
            argv.find(a => a.startsWith('--repeat='))?.slice(9) || 1
          ),
        }
      );
    } finally {
      await browser.close();
    }
  }
  const report = argv.includes('--report');
  const only = argv.find(a => a.startsWith('--config='))?.slice(9);
  // A report needs no ceilings - it is how the first ones are measured.
  const budgets = existsSync(BUDGETS_FILE)
    ? JSON.parse(readFileSync(BUDGETS_FILE, 'utf8'))
    : { routes: {} };
  if (!report && !existsSync(BUDGETS_FILE)) {
    console.error(
      `No ${path.relative(REPO, BUDGETS_FILE)}; nothing to check against.`
    );
    return 1;
  }
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
