#!/usr/bin/env node
// =============================================================================
// npm run bench:experiments - how fast experiments run, and what they cost
// -----------------------------------------------------------------------------
// Runs the experiment scheduler in Chromium with real Workers and prints what
// PROFILES in js/experiments/experimentManifest.js is set from, for its two
// device profiles:
//
//   desktop   this machine, with the realms the page would give it. Measured.
//   low-end   the low-end profile's two realms on this machine, measured, and
//             its speed on a low-end device modelled as this machine's divided
//             by --slowdown (4 by default: the CPU slowdown Chrome's DevTools
//             applies for a mid-tier mobile device).
//
// Why modelled: the experiment's work is all in its Workers, and Chromium
// will not throttle a Worker - Emulation.setCPUThrottlingRate answers
// "Operation is only supported for pages, not workers". A throttle on the
// page slows nothing an experiment does, and a figure measured that way would
// be a desktop figure with a low-end label on it. The low-end rows say so.
//
// A trial's time is two costs, measured apart:
//   set-up     from starting the realm to its first step: the Worker starts,
//              imports the engine cold and builds the world twice
//   integrate  the steps themselves, as body-steps per millisecond per realm
// The page prices an experiment from its planning realm, which times both on
// the reader's device (trialRunner.js calibrate()). Each case here is priced
// the same way before it runs, and the price is set beside the trials:
//   share      a lone realm's price over the trials' median time, which is how
//              much of its speed a realm keeps beside the others:
//              PROFILES.parallelShare
// PROFILES.setupMs and PROFILES.rate, the fallbacks for a plan without timing,
// are the set-up and the rate of the slowest case.
//
// Memory, two ways, peak over each case:
//   heap       each realm's JavaScript heap, through its own debugging session
//              (Runtime.getHeapUsage), summed over the page and its Workers.
//              Headless Chromium offers no measureUserAgentSpecificMemory().
//   resident   the renderer process's resident set, over its value before the
//              case: what the realms cost the machine, heap or not.
// And CPU: the renderer's CPU time over the realms' wall time. Near 1 means
// every realm had a core; well under 1 means they queued for one, and the
// rates are this machine's load, not its speed.
//
// Then, from the PROFILES this build ships, the largest experiment each
// profile accepts in each laboratory.
//
//   node tools/experiment-bench.mjs [--root dist] [--slowdown 4] [--json]
// =============================================================================

import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { loadavg } from 'node:os';
import path from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, fallback) =>
  argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const ROOT = path.resolve(REPO, opt('--root', '.'));
const SLOWDOWN = Number(opt('--slowdown', 4));
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

/**
 * A plain static server over the chosen root, on a free port, with the
 * caching GitHub Pages gives the published site (`max-age=600`). Each trial's
 * realm imports the engine afresh, and with `no-store` every one of them
 * fetched every module again: a start-up cost, and a contention between
 * realms starting together, that no reader of the site pays.
 */
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

/**
 * The experiments each profile is timed on: one laboratory at two lengths,
 * so a fixed cost and a running one can be told apart, and a second
 * laboratory with a different integrator load.
 */
const CASES = [
  {
    name: 'binary planet, short',
    scenario: 'Binary Planet Lab',
    parameter: 'binary_lab_planet_a',
    from: 0.05,
    to: 0.4,
    count: 12,
    duration: 4000,
  },
  {
    name: 'binary planet, long',
    scenario: 'Binary Planet Lab',
    parameter: 'binary_lab_planet_a',
    from: 0.05,
    to: 0.4,
    count: 12,
    duration: 40000,
  },
  {
    name: 'gravity assist',
    scenario: 'Gravity Assist Lab',
    parameter: 'assist_impact_parameter',
    from: 20,
    to: 400,
    count: 12,
    duration: 4000,
  },
];

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : null;
};

async function runCase(page, c, { concurrency, profile }) {
  return page.evaluate(
    async ({ c, concurrency, profile }) => {
      const M = await import('/js/experiments/experimentManifest.js');
      const { createScheduler } = await import('/js/experiments/scheduler.js');
      const manifest = {
        format: M.FORMAT,
        formatVersion: 1,
        title: c.name,
        model: { scenario: c.scenario, platform: '^1.0.0' },
        initial: { settings: {} },
        seeds: ['bench'],
        vary: [
          { parameter: c.parameter, from: c.from, to: c.to, count: c.count },
        ],
        observables: {
          metrics: ['distance_to_primary'],
          roles: M.SWEEPABLE[c.scenario].roles,
        },
        stop: { duration: c.duration, events: [] },
        numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
        limits: {
          ...M.defaultLimits(profile, { hardwareConcurrency: 64 }),
          concurrency,
        },
        summaries: [],
      };
      const spawn = () =>
        new window.Worker(
          new URL('/js/experiments/experimentWorker.js', window.location.href),
          { type: 'module' }
        );
      const trials = M.planTrials(manifest);
      // The body count the pricing uses, from the realm's own plan.
      const plan = await new Promise((resolve, reject) => {
        const w = spawn();
        w.onmessage = e => {
          w.terminate();
          if (e.data?.type === 'plan') resolve(e.data.plan);
          else reject(new Error(e.data?.message || 'no plan'));
        };
        w.postMessage({ type: 'plan', manifest, trial: trials[0] });
      });
      // What the page would have said: the trial priced from this plan, alone
      // and with the case's realms, before anything ran.
      const predictedSoloMs = M.estimate(manifest, plan, profile, 1).trialMs;
      const predictedMs = M.estimate(
        manifest,
        plan,
        profile,
        concurrency
      ).trialMs;
      const t0 = performance.now();
      const out = await createScheduler({
        manifest,
        trials,
        spawn,
        concurrency,
        now: () => performance.now(),
      }).run();
      const wall = performance.now() - t0;
      const ok = out.trials.filter(t => t.status === 'ok');
      return {
        trials: out.trials.length,
        ok: ok.length,
        bodies: plan.bodies,
        stepsPerTrial: plan.steps,
        calibration: {
          startMs: plan.startMs,
          buildMs: plan.buildMs,
          ...plan.calibration,
        },
        predictedSoloMs,
        predictedMs,
        wallMs: wall,
        realmWallMs: ok.reduce((s, t) => s + t.realmMs, 0),
        perTrial: ok.map(t => ({
          steps: t.steps,
          realmMs: t.realmMs,
          wallMs: t.wallMs,
          buildMs: t.timing.buildMs,
          integrateMs: t.timing.integrateMs,
        })),
        resultBytes: out.bytes,
      };
    },
    { c, concurrency, profile }
  );
}

/**
 * Read the JavaScript heap of the page and of every Worker it starts,
 * through each one's own debugging session. A Worker that has been
 * terminated never answers, so every request gives up after half a second.
 */
async function attachHeap(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: false,
  });
  let id = 1;
  const pending = new Map();
  const sessions = new Set();
  const state = { workers: 0 };
  const send = (sessionId, method, params = {}) =>
    new Promise(resolve => {
      const n = id++;
      const timer = setTimeout(() => {
        pending.delete(n);
        resolve({ error: { message: 'no answer' } });
      }, 500);
      pending.set(n, m => {
        clearTimeout(timer);
        resolve(m);
      });
      cdp
        .send('Target.sendMessageToTarget', {
          sessionId,
          message: JSON.stringify({ id: n, method, params }),
        })
        .catch(() => resolve({ error: { message: 'session gone' } }));
    });
  cdp.on('Target.receivedMessageFromTarget', ({ message }) => {
    const m = JSON.parse(message);
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  });
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => {
    if (targetInfo.type === 'worker') {
      state.workers++;
      sessions.add(sessionId);
    }
    send(sessionId, 'Runtime.runIfWaitingForDebugger');
  });
  cdp.on('Target.detachedFromTarget', ({ sessionId }) =>
    sessions.delete(sessionId)
  );
  const sample = async () => {
    const own = await cdp
      .send('Runtime.getHeapUsage')
      .catch(() => ({ usedSize: 0 }));
    const workers = await Promise.all(
      [...sessions].map(s => send(s, 'Runtime.getHeapUsage'))
    );
    const inWorkers = workers.reduce(
      (sum, w) => sum + (w.result?.usedSize || 0),
      0
    );
    return { heap: own.usedSize + inWorkers, workerHeap: inWorkers };
  };
  return { state, sample };
}

/** The renderer processes: their CPU seconds, and their resident set. */
async function renderers(browserCdp) {
  const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
  const list = processInfo.filter(p => p.type === 'renderer');
  let rss = 0;
  try {
    const out = execFileSync('ps', [
      '-o',
      'rss=',
      '-p',
      list.map(p => p.id).join(','),
    ]);
    rss = String(out)
      .split('\n')
      .reduce((s, line) => s + (Number(line.trim()) || 0) * 1024, 0);
  } catch {
    // ps is not everywhere; the heap figures stand on their own.
  }
  return { cpu: list.reduce((s, p) => s + p.cpuTime, 0), rss };
}

/** One case, sampled while it runs. */
async function measure(page, browserCdp, heap, c, run) {
  const before = await renderers(browserCdp);
  const workersBefore = heap.state.workers;
  const peak = { heap: 0, workerHeap: 0, rss: before.rss };
  let sampling = true;
  const loop = (async () => {
    while (sampling) {
      const [h, r] = await Promise.all([heap.sample(), renderers(browserCdp)]);
      peak.heap = Math.max(peak.heap, h.heap);
      peak.workerHeap = Math.max(peak.workerHeap, h.workerHeap);
      peak.rss = Math.max(peak.rss, r.rss);
      await sleep(200);
    }
  })();
  const load = loadavg()[0];
  const r = await run();
  sampling = false;
  await loop;
  const after = await renderers(browserCdp);
  const t = r.perTrial;
  const bodySteps = t.reduce((s, x) => s + x.steps, 0) * r.bodies;
  const integrateMs = t.reduce((s, x) => s + x.integrateMs, 0);
  return {
    ...r,
    perTrial: undefined,
    load: Number(load.toFixed(1)),
    // One for the plan and one for every trial: a realm is never reused.
    workersStarted: heap.state.workers - workersBefore,
    // Body-steps per millisecond per realm, integrating: PROFILES.rate.
    rate: Math.round(bodySteps / integrateMs),
    // Realm start to first step: PROFILES.setupMs.
    setupMs: median(t.map(x => x.realmMs - x.integrateMs)),
    startMs: median(t.map(x => x.realmMs - x.wallMs)),
    buildMs: median(t.map(x => x.buildMs)),
    integrateMs: median(t.map(x => x.integrateMs)),
    trialMs: median(t.map(x => x.realmMs)),
    // How far the price was from the trials, and how much of a lone realm's
    // speed each realm kept: PROFILES.parallelShare.
    predictedOverActual: Number(
      (r.predictedMs / median(t.map(x => x.realmMs))).toFixed(2)
    ),
    share: Number(
      (r.predictedSoloMs / median(t.map(x => x.realmMs))).toFixed(2)
    ),
    // CPU the renderer used over the time the realms were alive.
    cpuShare: Number(
      ((after.cpu - before.cpu) / (r.realmWallMs / 1000)).toFixed(2)
    ),
    peakHeapMB: Number((peak.heap / 1e6).toFixed(1)),
    peakWorkerHeapMB: Number((peak.workerHeap / 1e6).toFixed(1)),
    residentMB: Number(((peak.rss - before.rss) / 1e6).toFixed(1)),
  };
}

/**
 * The largest experiment each profile accepts, in each laboratory, priced by
 * this build's own estimate() and refusals() from a plan timed on this
 * machine: the longest single trial, and the most trials at the page's
 * default length (or at the longest, where the default does not fit). The
 * low-end rows scale the timing by the slowdown, as the modelled profile does.
 */
async function classes(page, slowdown) {
  return page.evaluate(
    async ({ slowdown }) => {
      const M = await import('/js/experiments/experimentManifest.js');
      const DEFAULT = 10000;
      const planned = (scenario, duration) =>
        new Promise((resolve, reject) => {
          const w = new window.Worker(
            new URL(
              '/js/experiments/experimentWorker.js',
              window.location.href
            ),
            { type: 'module' }
          );
          const lab = M.SWEEPABLE[scenario];
          w.onmessage = e => {
            w.terminate();
            if (e.data?.type === 'plan')
              resolve({ parameter: lab.parameters[0].key, ...e.data.plan });
            else reject(new Error(e.data?.message || 'no plan'));
          };
          w.postMessage({
            type: 'plan',
            manifest: {
              model: { scenario },
              initial: { settings: {} },
              observables: {
                metrics: ['distance_to_primary'],
                roles: lab.roles,
              },
              stop: { duration, events: [] },
              numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
            },
            trial: { index: 0, params: {}, seed: 'bench' },
          });
        });
      const rows = [];
      for (const scenario of Object.keys(M.SWEEPABLE)) {
        // Two plans, as the page would make them: a trial the length of the
        // default is short enough to be timed whole, cold; a long one is timed
        // warm, with its warm-up counted once. Pricing a long trial from the
        // short plan's rate would charge its warm-up on every step.
        const p = await planned(scenario, DEFAULT);
        const pLong = await planned(scenario, 200000);
        const stepsPerUnit = p.steps / DEFAULT;
        for (const [profile, realms] of [
          ['low-end', 2],
          ['desktop', 4],
          ['desktop', 8],
        ]) {
          const P = M.PROFILES[profile];
          const slow = profile === 'low-end' ? slowdown : 1;
          const timingOf = q => ({
            startMs: q.startMs * slow,
            buildMs: q.buildMs * slow,
            calibration: {
              ...q.calibration,
              stepsPerMs: q.calibration.stepsPerMs / slow,
              warmupMs: q.calibration.warmupMs * slow,
            },
          });
          const short = timingOf(p);
          const long = timingOf(pLong);
          const limits = M.defaultLimits(profile, {
            hardwareConcurrency: realms + 1,
          });
          const priced = (duration, trials) => {
            const frames = Math.ceil(duration / p.frameAdvance);
            const m = {
              observables: { metrics: ['distance_to_primary'] },
              vary: [{ parameter: p.parameter, values: [0] }],
              seeds: Array.from({ length: trials }, (_, i) => `s${i}`),
              limits: { ...limits, concurrency: realms },
              stop: { duration, events: [] },
              numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
            };
            const est = M.estimate(
              m,
              {
                ...p,
                ...(duration > DEFAULT ? long : short),
                frames,
                steps: Math.ceil(stepsPerUnit * duration),
                samples: frames + 1,
              },
              profile,
              realms
            );
            return { est, refused: M.refusals(est, m, profile) };
          };
          // The longest one trial may be, to the bench's 200,000-unit bound,
          // and what stops it going further.
          let lo = 0;
          let hi = 200001;
          while (hi - lo > 1) {
            const mid = Math.floor((lo + hi) / 2);
            if (priced(mid, 1).refused.length) hi = mid;
            else lo = mid;
          }
          const limit =
            hi > 200000
              ? 'the 200,000-unit bound'
              : priced(hi, 1)
                  .refused.map(r => r.reason)
                  .join(', ');
          const length = Math.min(DEFAULT, lo);
          let most = 0;
          for (let n = 1; n <= P.maxTrials; n++) {
            if (priced(length, n).refused.length) break;
            most = n;
          }
          // The largest experiment of all: as many trials as fit, each as
          // long as one may be.
          let mostLong = 0;
          for (let n = 1; n <= P.maxTrials; n++) {
            if (priced(lo, n).refused.length) break;
            mostLong = n;
          }
          rows.push({
            scenario,
            bodies: p.bodies,
            substeps: p.substeps,
            frameAdvance: p.frameAdvance,
            stepsPer1000: Math.round(stepsPerUnit * 1000),
            profile,
            realms,
            longestTrial: lo,
            limit,
            length,
            trials: most,
            trialsLimit:
              most === P.maxTrials
                ? 'maxTrials'
                : priced(length, most + 1)
                    .refused.map(r => r.reason)
                    .join(', '),
            wallS: Math.round(priced(length, most).est.wallMs / 1000),
            memoryMB: Number(
              (priced(length, most).est.memoryBytes / 1e6).toFixed(1)
            ),
            longestTrials: mostLong,
            longestTrialsLimit:
              mostLong === P.maxTrials
                ? 'maxTrials'
                : priced(lo, mostLong + 1)
                    .refused.map(r => r.reason)
                    .join(', '),
            longestWallS: Math.round(priced(lo, mostLong).est.wallMs / 1000),
          });
        }
      }
      return rows;
    },
    { slowdown }
  );
}

async function main() {
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const browserCdp = await browser.newBrowserCDPSession();
  const report = { cases: [], classes: [] };
  try {
    for (const profile of ['desktop', 'low-end']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${origin}/experiments/`, {
        waitUntil: 'domcontentloaded',
      });
      const cores = await page.evaluate(
        () => window.navigator.hardwareConcurrency
      );
      const concurrency =
        profile === 'desktop' ? Math.min(8, Math.max(1, cores - 1)) : 2;
      const heap = await attachHeap(page);
      for (const c of CASES) {
        const r = await measure(page, browserCdp, heap, c, () =>
          runCase(page, c, { concurrency, profile })
        );
        const slow = profile === 'low-end' ? SLOWDOWN : 1;
        report.cases.push({
          profile,
          case: c.name,
          duration: c.duration,
          concurrency,
          cores,
          // The low-end speed is modelled; see the header.
          slowdown: slow,
          ...r,
          modelled: {
            wallMs: Math.round(r.wallMs * slow),
            rate: Math.round(r.rate / slow),
            setupMs: Math.round(r.setupMs * slow),
          },
        });
      }
      if (profile === 'desktop') report.classes = await classes(page, SLOWDOWN);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const first = report.cases[0];
  console.log(
    `\n${ROOT === REPO ? 'sources' : path.relative(REPO, ROOT)}, Chromium headless, ${first?.cores} cores reported; low-end speed modelled at 1/${SLOWDOWN}\n`
  );
  console.log(
    'profile  case                   realms  trials  wall s  set-up ms  rate  predicted/actual  share  cpu  heap MB  resident MB  load'
  );
  for (const r of report.cases) {
    const m = r.slowdown > 1 ? r.modelled : r;
    console.log(
      `${r.profile.padEnd(8)} ${r.case.padEnd(22)} ${String(r.concurrency).padStart(6)}  ${`${r.ok}/${r.trials}`.padStart(6)}  ${(m.wallMs / 1000).toFixed(1).padStart(6)}  ${String(m.setupMs).padStart(9)}  ${String(m.rate).padStart(4)}  ${r.predictedOverActual.toFixed(2).padStart(16)}  ${r.share.toFixed(2).padStart(5)}  ${r.cpuShare.toFixed(2)}  ${String(r.peakHeapMB).padStart(7)}  ${String(r.residentMB).padStart(11)}  ${r.load}`
    );
  }
  console.log(
    '\nlargest accepted, from this build’s PROFILES\nscenario                      bodies  profile   realms  longest trial (stopped by)            trials at length (stopped by)'
  );
  for (const r of report.classes) {
    console.log(
      `${r.scenario.padEnd(29)} ${String(r.bodies).padStart(6)}  ${r.profile.padEnd(8)}  ${String(r.realms).padStart(6)}  ${`${r.longestTrial} (${r.limit})`.padEnd(36)}  ${r.trials} at ${r.length} (${r.trialsLimit}), ${r.wallS} s, ${r.memoryMB} MB; ${r.longestTrials} at the longest (${r.longestTrialsLimit}), ${r.longestWallS} s`
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
