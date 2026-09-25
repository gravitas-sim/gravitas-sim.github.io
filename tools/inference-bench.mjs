#!/usr/bin/env node
// =============================================================================
// npm run bench:inference - how long a fit takes in its Workers, and what the
// inference core's device profiles are set from
// -----------------------------------------------------------------------------
// Runs each case of ./inference-cases.mjs (one seed), and the TESS HD 209458 b
// light curve, in Chromium through the realm the page uses
// (js/inference/inferenceWorker.js), the way js/inference/run.js does: one
// disposable Worker for the fit, then one per fitted parameter's profile,
// at most so many at once. For each it measures
//
//   set-up     from starting a realm to its answer, less the fit's own time:
//              the Worker starts and imports the core cold
//   fit        the fit's own time in its realm
//   lone       one profile, alone in its realm
//   profiles   every profile, at the profile's realms, from the first start
//              to the last answer
//   share      the lone profile's time over the same parameter's beside the
//              others: how much of its speed a realm keeps (parallelShare)
//   frame gap  the longest the page went without a frame while all of it ran:
//              the page stays responsive because none of the work is on it
//
// and sets beside each the time js/inference/manifest.js estimate() predicts
// from the PROFILES this build ships. Then it prints the PROFILES the
// measurement supports: the set-up of the slowest case, the rate (row-passes
// a millisecond) of the slowest case, and the median share.
//
// The two profiles:
//   desktop   this machine, with the realms the page would give it. Measured.
//   low-end   two realms on this machine, measured for their share, with the
//             rate and set-up of a low-end device modeled as this machine's
//             divided by --slowdown (4: the CPU slowdown Chrome's DevTools
//             applies for a mid-tier mobile device). Chromium does not throttle
//             a Worker, and all of a fit is in Workers, so a throttled page
//             would measure nothing (EXPERIMENTS.md says the same).
//
// Refuses to record on a loaded machine: a rate taken beside other work is
// that work's, not this machine's.
//
//   node tools/inference-bench.mjs [--root dist] [--slowdown 4] [--json out]
//   node tools/inference-bench.mjs --cpu [--json out]   the rates, in CPU time
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { cpus, loadavg } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { dataFrom, fitOnce, profileTask } from '../js/inference/infer.js';
import {
  PROFILES,
  deviceProfile,
  estimate,
  inferenceManifest,
} from '../js/inference/manifest.js';
import { MODELS } from '../js/inference/models.js';
import { openFixture } from '../js/observatory/fixtures.js';
import { CASES, EXPOSURE } from './inference-cases.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, fallback) =>
  argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const ROOT = path.resolve(REPO, opt('--root', '.'));
const SLOWDOWN = Number(opt('--slowdown', 4));
const JSON_OUT = opt('--json', null);
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** A static server with GitHub Pages' caching, as tools/experiment-bench.mjs. */
function serve() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory())
        return res.writeHead(301, { location: `${p}/` }).end();
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'max-age=600',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve =>
    server.listen(0, '127.0.0.1', () => resolve(server))
  );
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : null;
};

/** Typed arrays as plain ones, for page.evaluate(). */
const plain = d => ({
  ...d,
  x: [...d.x],
  y: [...d.y],
  sigma: d.sigma ? [...d.sigma] : null,
  groups: d.groups ? [...d.groups] : null,
  rows: null,
});

async function cases() {
  const out = CASES.map(c => ({
    name: c.name,
    what: c.what,
    request: c.request,
    data: c.data(0),
  }));
  const o = await openFixture('tess-light-curve');
  const data = dataFrom(o);
  out.push({
    name: 'tess-hd209458',
    what: 'the TESS sector 56 light curve of HD 209458, as shipped',
    request: {
      model: { id: 'transit-quadratic' },
      parameters: {
        t0: { lo: data.x[0], hi: data.x[0] + 3.65 },
        P: { lo: 3.4, hi: 3.65 },
      },
      settings: { exposure: EXPOSURE, supersample: 5, annuli: 32 },
    },
    data,
    observation: o,
  });
  return out;
}

/**
 * One case in the page: the fit in a fresh realm, one profile alone, then
 * every profile at `concurrency` realms, with the page's frames watched.
 */
function runCase(page, { worker, request, data, concurrency }) {
  return page.evaluate(
    async ({ worker, request, data, concurrency }) => {
      const typed = {
        ...data,
        x: Float64Array.from(data.x),
        y: Float64Array.from(data.y),
        sigma: data.sigma ? Float64Array.from(data.sigma) : null,
        groups: data.groups ? Int32Array.from(data.groups) : null,
        rows: [],
      };
      const call = message =>
        new Promise((resolve, reject) => {
          const started = performance.now();
          const w = new window.Worker(worker, { type: 'module' });
          w.onmessage = e => {
            if (e.data.type === 'result') {
              w.terminate();
              resolve({
                ...e.data.result,
                coldMs: performance.now() - started,
              });
            } else if (e.data.type === 'error') {
              w.terminate();
              reject(new Error(e.data.message));
            }
          };
          w.onerror = e => {
            w.terminate();
            reject(new Error(e.message || 'worker error'));
          };
          w.postMessage(message);
        });
      let gap = 0;
      let last = performance.now();
      let watching = true;
      const frame = () => {
        const t = performance.now();
        gap = Math.max(gap, t - last);
        last = t;
        if (watching) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);

      const fit = await call({
        type: 'run',
        task: 'fit',
        index: 0,
        request,
        data: typed,
      });
      const slim = {
        parameters: fit.parameters,
        chi2: fit.chi2,
        reducedChi2: fit.reducedChi2,
        scaled: fit.scaled,
        weighted: fit.weighted,
        nuisance: fit.nuisance,
      };
      const profileOf = (parameter, index) =>
        call({
          type: 'run',
          task: 'profile',
          index,
          parameter,
          request,
          data: typed,
          fit: slim,
        });
      const lone = await profileOf(fit.free[0], 0);
      const started = performance.now();
      const queue = fit.free.map((p, i) => [p, i]);
      const done = [];
      await Promise.all(
        Array.from(
          { length: Math.min(concurrency, queue.length) },
          async () => {
            while (queue.length) {
              const [p, i] = queue.shift();
              done.push(await profileOf(p, i));
            }
          }
        )
      );
      const profilesMs = performance.now() - started;
      watching = false;
      const same = done.find(d => d.parameter === fit.free[0]);
      return {
        coldMs: fit.coldMs,
        fitMs: fit.wallMs,
        evaluations: fit.evaluations,
        gridTrials: fit.search?.grid?.trials ?? null,
        free: fit.free,
        loneMs: lone.wallMs,
        besideMs: same.wallMs,
        profilesMs,
        profileEvaluations: done.reduce((a, d) => a + (d.evaluations || 0), 0),
        frameGapMs: gap,
      };
    },
    { worker, request, data, concurrency }
  );
}

async function main() {
  const cores = cpus().length;
  const load = loadavg()[0];
  if (load > cores && !argv.includes('--force')) {
    console.error(
      `Load average ${load.toFixed(1)} on ${cores} cores: the rates would be ` +
        'the other work, not this machine. Run it on a quiet machine, or pass ' +
        '--force to see the numbers anyway (not to record them).'
    );
    process.exit(2);
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}/observatory/`);
  const nav = await page.evaluate(() => ({
    hardwareConcurrency: window.navigator.hardwareConcurrency,
    deviceMemory: window.navigator.deviceMemory,
    userAgent: window.navigator.userAgent,
  }));
  const device = deviceProfile(nav);
  const worker = `${base}/js/inference/inferenceWorker.js`;
  const results = [];
  for (const c of await cases()) {
    const observation = c.observation || {
      id: c.name,
      title: c.what,
      source: { kind: 'synthetic', id: c.name, version: '1' },
    };
    const m = inferenceManifest(observation, c.data, c.request, {});
    const rows = c.data.x.length;
    for (const [profile, concurrency] of [
      ['desktop', device.concurrency],
      ['low-end', 2],
    ]) {
      const got = await runCase(page, {
        worker,
        request: c.request,
        data: plain(c.data),
        concurrency,
      });
      const est = estimate(m, rows, profile, { concurrency });
      const free = got.free.length;
      results.push({
        name: c.name,
        what: c.what,
        model: MODELS[c.request.model.id].id,
        profile,
        concurrency,
        rows,
        ...got,
        setupMs: got.coldMs - got.fitMs,
        share: got.loneMs / got.besideMs,
        estimate: {
          evaluations: est.evaluations,
          gridTrials: est.gridTrials,
          fitWork: est.fitWork,
          profileWork: est.profileWork,
          ms: est.ms,
        },
        // Row-passes a millisecond in one realm, by this measurement.
        fitRate: est.fitWork / got.fitMs,
        profileRate: est.profileWork / free / got.loneMs,
      });
      console.error(
        `${c.name.padEnd(15)} ${profile.padEnd(8)} fit ${got.fitMs.toFixed(0)} ms, ` +
          `profiles ${got.profilesMs.toFixed(0)} ms at ${concurrency}`
      );
    }
  }
  await browser.close();
  server.close();

  const desk = results.filter(r => r.profile === 'desktop');
  const low = results.filter(r => r.profile === 'low-end');
  const setup = Math.max(...desk.map(r => r.setupMs));
  const supported = supportedRates(desk, SLOWDOWN, {
    desktop: {
      setupMs: Math.ceil(setup / 10) * 10,
      parallelShare: Number(median(desk.map(r => r.share)).toFixed(2)),
    },
    'low-end': {
      setupMs: Math.ceil((setup * SLOWDOWN) / 10) * 10,
      parallelShare: Number(median(low.map(r => r.share)).toFixed(2)),
    },
  });

  const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  console.log(
    `\nInference in Workers: ${nav.userAgent.match(/Chrome\/[\d.]+/)?.[0]}, ` +
      `${cores} cores (page sees ${nav.hardwareConcurrency}), load ${load.toFixed(1)}; ` +
      `desktop at ${device.concurrency} realms, low-end at 2 (its rates modeled as this machine's / ${SLOWDOWN}).\n`
  );
  console.log(
    '| case | profile | rows | set-up | fit | predicted fit | lone profile | all profiles | predicted profiles | share | frame gap |'
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const scale = r.profile === 'low-end' ? SLOWDOWN : 1;
    console.log(
      `| ${r.name} | ${r.profile}${scale > 1 ? ' (modeled)' : ''} | ${r.rows} | ` +
        `${f(r.setupMs * scale)} ms | ${f(r.fitMs * scale)} ms | ${f(r.estimate.ms.fit)} ms | ` +
        `${f(r.loneMs * scale)} ms | ${f(r.profilesMs * scale)} ms | ${f(r.estimate.ms.profiles)} ms | ` +
        `${f(r.share, 2)} | ${f(r.frameGapMs)} ms |`
    );
  }
  console.log(
    `\nPROFILES shipped:   desktop ${JSON.stringify(pick(PROFILES.desktop))}, low-end ${JSON.stringify(pick(PROFILES['low-end']))}`
  );
  console.log(
    `PROFILES supported: desktop ${JSON.stringify(supported.desktop)}, low-end ${JSON.stringify(supported['low-end'])}`
  );
  if (JSON_OUT) {
    await writeFile(
      path.resolve(JSON_OUT),
      `${JSON.stringify({ nav, cores, load, slowdown: SLOWDOWN, results, supported }, null, 2)}\n`
    );
  }
}

function pick(p) {
  return {
    setupMs: p.setupMs,
    rate: p.rate,
    slowFitRate: p.slowFitRate,
    slowProfileRate: p.slowProfileRate,
    parallelShare: p.parallelShare,
  };
}

/**
 * The rates PROFILES is set from: the median case's, and the slowest fit's
 * and profile's, rounded down; the low-end's a quarter of them.
 */
function supportedRates(rows, slowdown, rest) {
  const fits = rows.map(r => r.fitRate).filter(Number.isFinite);
  const profiles = rows.map(r => r.profileRate).filter(Number.isFinite);
  const down = v => Math.floor(v / 5) * 5;
  const rates = k => ({
    rate: down(median([...fits, ...profiles]) / k),
    slowFitRate: down(Math.min(...fits) / k),
    slowProfileRate: down(Math.min(...profiles) / k),
  });
  return {
    desktop: { ...rest.desktop, ...rates(1) },
    'low-end': { ...rest['low-end'], ...rates(slowdown) },
  };
}

/**
 * --cpu: each case's fit and one profile in this process, timed in this
 * thread's CPU time rather than on the clock. V8 is the engine the browser's
 * Workers run, and CPU time holds on a machine other work is loading, where
 * the clock does not: the loaded machine this was written on gave wall times
 * three times the CPU time. It measures the rates only; set-up and the share
 * realms keep beside each other need the browser run.
 */
async function cpuMode() {
  const { threadCpuUsage } = await import('node:process');
  const cpu = () => {
    const u = threadCpuUsage();
    return (u.user + u.system) / 1000;
  };
  const rows = [];
  for (const c of await cases()) {
    const observation = c.observation || {
      id: c.name,
      title: c.what,
      source: { kind: 'synthetic', id: c.name, version: '1' },
    };
    const m = inferenceManifest(observation, c.data, c.request, {});
    const e = estimate(m, c.data.x.length, 'desktop');
    const t0 = cpu();
    const fit = fitOnce(c.request, c.data);
    const fitMs = cpu() - t0;
    const t1 = cpu();
    profileTask(c.request, c.data, fit, fit.free[0]);
    const profileMs = cpu() - t1;
    rows.push({
      name: c.name,
      rows: c.data.x.length,
      fitMs,
      profileMs,
      fitRate: e.fitWork / fitMs,
      profileRate: e.profileWork / fit.free.length / profileMs,
    });
    console.error(`${c.name.padEnd(15)} fit ${fitMs.toFixed(0)} ms CPU`);
  }
  const supported = supportedRates(rows, SLOWDOWN, {
    desktop: {},
    'low-end': {},
  });
  console.log(
    `\nInference in CPU time: Node ${process.version}, load ${loadavg()[0].toFixed(1)}; ` +
      `low-end modeled as this machine's / ${SLOWDOWN}.\n`
  );
  console.log(
    '| case | rows | fit (CPU) | one profile (CPU) | fit rate | profile rate |'
  );
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.rows} | ${r.fitMs.toFixed(0)} ms | ${r.profileMs.toFixed(0)} ms | ` +
        `${r.fitRate.toFixed(0)} | ${r.profileRate.toFixed(0)} |`
    );
  }
  console.log(
    `\nPROFILES shipped:   desktop ${JSON.stringify(pick(PROFILES.desktop))}, low-end ${JSON.stringify(pick(PROFILES['low-end']))}`
  );
  console.log(
    `PROFILES supported: desktop ${JSON.stringify(supported.desktop)}, low-end ${JSON.stringify(supported['low-end'])}`
  );
  if (JSON_OUT) {
    await writeFile(
      path.resolve(JSON_OUT),
      `${JSON.stringify({ mode: 'cpu', node: process.version, load: loadavg(), slowdown: SLOWDOWN, rows, supported }, null, 2)}\n`
    );
  }
}

await (argv.includes('--cpu') ? cpuMode() : main());
