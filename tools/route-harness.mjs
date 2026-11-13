#!/usr/bin/env node
// =============================================================================
// Student-route harness
// -----------------------------------------------------------------------------
// Development only. Measures the pages a student actually opens, in headless
// Chromium, over the repository's static server in its compressed mode, under
// one of the committed device profiles of tools/perf-thresholds.json
// ("deviceProfiles": a CPU throttle, a network shape, a heap ceiling, a
// quality tier). It is the route-level companion of tools/perf-probe.mjs (the
// frame-time probe) and of e2e/deviceProfiles.spec.js (which holds the budgets):
// the profile numbers, the "usable" definition and the throttling are the ones
// the spec uses, read from the one file, not copied.
//
//   node tools/route-harness.mjs                           the baseline matrix
//   node tools/route-harness.mjs --routes home,ios-fire    some routes
//   node tools/route-harness.mjs --profile throttled-desktop --runs 3
//   node tools/route-harness.mjs --server plain            uncompressed transport
//   node tools/route-harness.mjs --locale es               the Spanish interface
//   node tools/route-harness.mjs --json out.json --markdown out.md
//   node tools/route-harness.mjs --walks                   the pilot lesson walks
//
// What a run is. Each route is loaded in five ways, in this order, each in a
// fresh browser context so that nothing leaks from one to the next:
//
//   cold      service worker blocked, empty cache: the planning measurement's
//             conditions, and the one the speed work is judged on;
//   coldSw    service worker allowed, empty cache: the first visit of a real
//             browser, with the worker installing beside the page;
//   warm      the same context after the worker has finished installing: the
//             second visit;
//   offlineFresh, offline
//             the same context with the network cut: does the route open at
//             all, and how soon. `offlineFresh` leaves the browser's HTTP cache
//             as it is (the host's responses are fresh for ten minutes);
//             `offline` switches that cache off, which is the case after ten
//             minutes and says whether the worker alone carries the route.
//
// (coldSw, warm and offline share one context; cold has its own.) A route that
// does not register the worker (the Observatory and the 3-D lab are separate
// pages that never load js/offline.js) is visited the same way and the record
// says so (swActive false).
//
// What is recorded per load, and the definitions (the baseline document,
// STUDENT_ROUTE_BASELINE.md, repeats them):
//
//   usableMs        from the start of the navigation to the route's "usable"
//                   condition (below), read from performance.now() in the page
//                   the moment the condition first holds;
//   firstActionMs   from the same origin to the response of the route's first
//                   useful action: the first control the opening screen
//                   offers is operated and its effect is on screen (the
//                   table in ROUTES says which control);
//   input           a responsiveness sample taken once the network has been
//                   quiet for a second: a drag of 40 pointer moves, 25 ms
//                   apart, on the route's drag target. Input delay is the
//                   time from the event's own timestamp to the moment the
//                   page's listener ran (queuing behind main-thread work);
//                   p50, p95 and the worst are reported;
//   requests, bytes, modules
//                   the browser's own count of requests, of bytes on the wire
//                   (encodedDataLength: headers and compressed body, as the
//                   browser's network panel counts them) and of script
//                   requests, up to the moment the route is usable ("atUsable")
//                   and after the sample ("total"); `served` is the server's
//                   own count of requests that reached it, a cross-check.
//
// What this is not: a phone, a radio, HTTP/2 (the test server speaks HTTP/1.1;
// GitHub Pages speaks HTTP/2, which changes how a few hundred requests behave),
// a measurement of the live site, or a result on any machine but this one. The
// numbers are PROXIES and say so wherever they are printed.
// =============================================================================

/* global PerformanceObserver, navigator, MessageChannel, setTimeout */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const THRESHOLDS = JSON.parse(
  readFileSync(resolve(ROOT, 'tools/perf-thresholds.json'), 'utf8')
);
export const PROFILES = THRESHOLDS.deviceProfiles.profiles;

// --- small statistics --------------------------------------------------------

/** Median of the finite numbers; null when there are none. */
export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** The q-quantile (0..1) of the finite numbers by the nearest rank. */
export function quantile(values, q) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil(q * v.length) - 1))];
}

/** {median, min, max, n} of one metric over the runs. */
export function spread(values) {
  const v = values.filter(Number.isFinite);
  return {
    median: median(v),
    min: v.length ? Math.min(...v) : null,
    max: v.length ? Math.max(...v) : null,
    n: v.length,
  };
}

// --- profiles ----------------------------------------------------------------

/** Slow a page as a profile says (CPU on its main thread, the network shape). */
export async function throttle(page, profile, { offline = false } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.network || offline) {
    await cdp.send('Network.enable');
    const n = profile.network;
    await cdp.send('Network.emulateNetworkConditions', {
      offline,
      latency: n ? n.latencyMs : 0,
      downloadThroughput: n ? (n.downKbps * 1000) / 8 : -1,
      uploadThroughput: n ? (n.upKbps * 1000) / 8 : -1,
    });
  }
  return cdp;
}

/** The profile's quality tier as a query string, put before any hash. */
export function withQuality(path, profile) {
  if (profile.quality === 'auto') return path;
  const [before, hash] = path.split('#');
  const q = `quality=${profile.quality}`;
  const joined = before.includes('?') ? `${before}&${q}` : `${before}?${q}`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}

/** A browser of this profile's own (the heap ceiling is a launch flag). */
export async function launchFor(chromium, profile) {
  return chromium.launch({
    args: [`--js-flags=--max-old-space-size=${profile.heapLimitMB}`],
  });
}

/** A context of this profile: viewport, density, touch, the welcome flag, the language. */
export async function contextFor(
  browser,
  profile,
  baseURL,
  { serviceWorkers = 'block', locale = 'en' } = {}
) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr,
    ...(profile.touch ? { hasTouch: true, isMobile: true } : {}),
    serviceWorkers,
  });
  await context.addInitScript(
    ([k, v, loc]) => {
      try {
        window.localStorage.setItem(k, v);
        window.localStorage.setItem('gravitas_locale', loc);
      } catch {
        /* storage unavailable */
      }
    },
    ['gravitas_welcome_seen_v1', '1', locale]
  );
  await context.addInitScript(INPUT_PROBE);
  return context;
}

/**
 * Runs in every page before its own scripts: records the input delay of each
 * pointer and input event (the listener's time minus the event's own time
 * stamp, both on the page's clock) and the Event Timing entries of 16 ms or more.
 */
function INPUT_PROBE() {
  // The page's Content-Security-Policy forbids evaluating a string, so a wait
  // cannot be written as one: the conditions live here, by name, and a wait
  // passes the name and its argument.
  const visible = sel => {
    const e = document.querySelector(sel);
    return (
      !!e &&
      e.getClientRects().length > 0 &&
      getComputedStyle(e).visibility !== 'hidden'
    );
  };
  window.__holds = (kind, arg) => {
    switch (kind) {
      case 'app':
        return (
          window.splashScreenEnded === true &&
          document
            .querySelector('.ui-container')
            ?.classList.contains('showUI') === true
        );
      case 'visible':
        return visible(arg);
      case 'ready+visible':
        return (
          document.documentElement.getAttribute('data-ready') === 'true' &&
          visible(arg)
        );
      case 'step-count':
        return new RegExp(`Step ${arg}\\b`).test(
          document.querySelector('.inv-step-count')?.textContent || ''
        );
      case 'guide-step':
        return new RegExp(`Step ${arg} of`).test(
          document.querySelector('#gdStepTitle')?.textContent || ''
        );
      case 'text-differs':
        return document.querySelector(arg.sel)?.innerText !== arg.before;
      default:
        return false;
    }
  };
  const delays = [];
  const slow = [];
  window.__inputProbe = { delays, slow };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'input']) {
    window.addEventListener(
      type,
      e => {
        delays.push(performance.now() - e.timeStamp);
      },
      { capture: true, passive: true }
    );
  }
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries())
        slow.push({
          name: e.name,
          delay: e.processingStart - e.startTime,
          d: e.duration,
        });
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch {
    /* Event Timing unavailable */
  }
}

// --- the routes --------------------------------------------------------------

/**
 * The routes. `usable` is the condition; `act` operates the route's first
 * useful control and returns the in-page predicate that says its effect is on
 * screen; `drag` is the target of the responsiveness sample.
 */
export const ROUTES = {
  home: {
    label: 'Home',
    path: '/',
    usable: { kind: 'app' },
    drag: { selector: '#simulationCanvas' },
    async act(page) {
      if (page.viewportSize().width < 600)
        await page.locator('#mobileMenuToggle').click();
      await page.locator('#loadScenarioBtn').click();
      return { kind: 'visible', arg: '#scenarioListModal' };
    },
    action: 'Load Scenario opens its list',
  },
  'keplers-laws': {
    label: 'Lesson, live scene (keplers-laws)',
    path: '/#investigation=keplers-laws',
    usable: { kind: 'visible', arg: '#investigationNext' },
    drag: { selector: '#simulationCanvas' },
    async act(page) {
      // Not "step 2": a returning visitor opens where they stopped.
      const sel = '.inv-step-count';
      const before = await page.locator(sel).innerText();
      await page.locator('#investigationNext').click();
      return { kind: 'text-differs', arg: { sel, before } };
    },
    action: 'Next moves to step 2',
  },
  'ios-fire': {
    label: 'Lesson, instrument (ios-fire)',
    path: '/#investigation=ios-fire',
    usable: { kind: 'visible', arg: '#investigationNext' },
    drag: { selector: '#invTool-k2' },
    async act(page) {
      const sel = '#investigationToolReadout';
      const before = await page.locator(sel).innerText();
      await page.locator('#invTool-k2').fill('1.2');
      return { kind: 'text-differs', arg: { sel, before } };
    },
    action: 'the k2 slider changes the heating readout',
  },
  'observatory-guide': {
    label: 'Observatory guide (exo-star)',
    path: '/observatory/?guide=exo-star',
    usable: { kind: 'ready+visible', arg: '#gdStep' },
    drag: { selector: '#gdStep' },
    async act(page) {
      const sel = '#gdStepTitle';
      const before = await page.locator(sel).innerText();
      await page.locator('#gdNext').click();
      return { kind: 'text-differs', arg: { sel, before } };
    },
    action: 'Next moves the guide to step 2',
  },
  '3d-lab': {
    label: '3-D lab',
    path: '/3d/',
    usable: { kind: 'ready+visible', arg: '#l3-canvas' },
    drag: { selector: '#l3-canvas' },
    async act(page) {
      const sel = '#l3-clock';
      const before = await page.locator(sel).innerText();
      await page.locator('#l3-step').click();
      return { kind: 'text-differs', arg: { sel, before } };
    },
    action: 'Step advances the clock',
  },
  // The route the budgets of e2e/deviceProfiles.spec.js have always judged:
  // the author's preview, not a student's link. Kept to reproduce 82 s.
  'author-lesson': {
    label: 'Author preview (tides, step 1)',
    path: '/?author=tides&step=1',
    usable: { kind: 'visible', arg: '#investigationNext' },
    drag: { selector: '#simulationCanvas' },
    async act(page) {
      const sel = '#investigationPanel';
      const before = await page.locator(sel).innerText();
      await page.locator('#investigationNext').click();
      return { kind: 'text-differs', arg: { sel, before } };
    },
    action: 'Next changes the panel',
  },
};

export const BASELINE_ROUTES = [
  'home',
  'keplers-laws',
  'ios-fire',
  'observatory-guide',
  '3d-lab',
];

// --- one load ----------------------------------------------------------------

/** Count requests, wire bytes and script requests from the browser's own events. */
function watchNetwork(cdp) {
  const net = {
    requests: 0,
    bytes: 0,
    modules: 0,
    inflight: 0,
    lastActivity: Date.now(),
  };
  const ids = new Map();
  cdp.on('Network.requestWillBeSent', e => {
    if (!/^https?:/.test(e.request.url)) return;
    ids.set(e.requestId, e.type);
    net.requests += 1;
    if (e.type === 'Script') net.modules += 1;
    net.inflight += 1;
    net.lastActivity = Date.now();
  });
  const done = e => {
    if (!ids.has(e.requestId)) return;
    net.inflight -= 1;
    net.lastActivity = Date.now();
  };
  cdp.on('Network.loadingFinished', e => {
    if (!ids.has(e.requestId)) return;
    net.bytes += e.encodedDataLength || 0;
    done(e);
  });
  cdp.on('Network.loadingFailed', done);
  return {
    net,
    snapshot: () => ({
      requests: net.requests,
      bytes: net.bytes,
      modules: net.modules,
    }),
  };
}

/** Wait until nothing has been in flight for `quietMs`, at most `capMs`. */
async function quiet(page, net, quietMs = 1000, capMs = 30_000) {
  const until = Date.now() + capMs;
  while (Date.now() < until) {
    if (net.inflight <= 0 && Date.now() - net.lastActivity >= quietMs)
      return true;
    await page.waitForTimeout(100);
  }
  return false;
}

/** The input-delay sample: a drag on the route's target. */
async function dragSample(page, route) {
  const box = await page.locator(route.drag.selector).first().boundingBox();
  if (!box) return null;
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * 0.2;
  const x1 = box.x + box.width * 0.8;
  await page.evaluate(() => {
    window.__inputProbe.delays.length = 0;
    window.__inputProbe.slow.length = 0;
  });
  await page.mouse.move(x0, y);
  await page.mouse.down();
  const moves = 40;
  for (let i = 1; i <= moves; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / moves, y);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
  const { delays, slow } = await page.evaluate(() => ({
    delays: [...window.__inputProbe.delays],
    slow: [...window.__inputProbe.slow],
  }));
  return {
    events: delays.length,
    delayP50: quantile(delays, 0.5),
    delayP95: quantile(delays, 0.95),
    delayMax: delays.length ? Math.max(...delays) : null,
    slowEvents: slow.length,
    slowestMs: slow.length ? Math.max(...slow.map(s => s.d)) : 0,
  };
}

/**
 * One page load in a context, measured.
 *
 * @param {object} context - From contextFor
 * @param {{url: string, stats: object}} server - The static server
 * @param {object} route - One of ROUTES
 * @param {object} profile - A device profile
 * @param {object} [opts]
 * @param {boolean} [opts.offline] - Cut the network for this load
 * @param {number} [opts.limitMs] - Give up on "usable" after this long
 * @param {boolean} [opts.sample] - Also run the first action and the drag sample
 * @returns {Promise<object>} The load's record; `usableMs` is null if it never was
 */
export async function loadOnce(
  context,
  server,
  route,
  profile,
  {
    offline = false,
    noHttpCache = false,
    limitMs = 150_000,
    sample = true,
  } = {}
) {
  // The worker's own requests are not the page's: cutting the page's network
  // leaves the worker's fetches (the revalidation of what it serves) free to
  // reach the server, and an offline load would not be offline. The context's
  // switch reaches the worker as well.
  if (offline) await context.setOffline(true);
  const page = await context.newPage();
  const cdp = await throttle(page, profile, { offline });
  await cdp.send('Network.enable');
  if (noHttpCache)
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const watch = watchNetwork(cdp);
  server.stats.requests = 0;
  server.stats.bodyBytes = 0;
  const rec = {
    usableMs: null,
    firstActionMs: null,
    actionMs: null,
    atUsable: null,
    total: null,
    served: null,
    input: null,
    swActive: null,
    error: null,
  };
  try {
    const url = withQuality(route.path, profile);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: limitMs });
    } catch (e) {
      rec.error = String(e.message).split('\n')[0].slice(0, 120);
      return rec;
    }
    try {
      const handle = await page.waitForFunction(
        ({ kind, arg }) =>
          window.__holds(kind, arg) ? performance.now() : false,
        route.usable,
        { polling: 'raf', timeout: limitMs }
      );
      rec.usableMs = await handle.jsonValue();
    } catch (e) {
      rec.error = `not usable within ${limitMs / 1000} s: ${String(e.message).split('\n')[0].slice(0, 100)}`;
      rec.atUsable = watch.snapshot();
      return rec;
    }
    rec.atUsable = watch.snapshot();
    rec.servedAtUsable = server.stats.requests;
    if (!sample) return rec;

    const clickAt = await page.evaluate(() => performance.now());
    const done = await route.act(page);
    const handle = await page.waitForFunction(
      ({ kind, arg }) =>
        window.__holds(kind, arg) ? performance.now() : false,
      done,
      { polling: 'raf', timeout: 60_000 }
    );
    rec.firstActionMs = await handle.jsonValue();
    rec.actionMs = rec.firstActionMs - clickAt;
    await quiet(page, watch.net);
    rec.input = await dragSample(page, route);
    rec.total = watch.snapshot();
    rec.served = server.stats.requests;
    rec.swActive = await page.evaluate(
      async () => !!(await navigator.serviceWorker?.getRegistration?.())?.active
    );
    return rec;
  } catch (e) {
    rec.error ??= String(e.message).split('\n')[0].slice(0, 160);
    return rec;
  } finally {
    await page.close();
    if (offline) await context.setOffline(false);
  }
}

/** Ask the worker, from a page, what it holds; resolves null with no worker. */
export async function workerStatus(page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (!reg?.active) return null;
    return new Promise(resolveStatus => {
      const ch = new MessageChannel();
      ch.port1.onmessage = e => resolveStatus(e.data);
      reg.active.postMessage({ type: 'status' }, [ch.port2]);
      setTimeout(() => resolveStatus(null), 5000);
    });
  });
}

/**
 * Visit one route as a student would across three visits: cold with no worker,
 * then (in a context that allows the worker) first visit, second visit and
 * offline.
 */
export async function measureRoute(
  browser,
  server,
  routeId,
  profile,
  opts = {}
) {
  const route = ROUTES[routeId];
  const { locale = 'en', limitMs = 150_000, settleCapMs = 180_000 } = opts;
  const out = {};

  // cold: worker blocked
  {
    const ctx = await contextFor(browser, profile, server.url, {
      serviceWorkers: 'block',
      locale,
    });
    out.cold = await loadOnce(ctx, server, route, profile, { limitMs });
    await ctx.close();
  }
  if (opts.coldOnly) return out;

  // coldSw, warm, offline: one context, worker allowed
  const ctx = await contextFor(browser, profile, server.url, {
    serviceWorkers: 'allow',
    locale,
  });
  try {
    out.coldSw = await loadOnce(ctx, server, route, profile, { limitMs });
    // Let the worker finish: a returning visitor's cache is the whole version.
    out.worker = await settleBy(ctx, server, route, profile, settleCapMs);
    out.warm = await loadOnce(ctx, server, route, profile, { limitMs });
    // Offline twice: as the browser's HTTP cache leaves it (a response is
    // fresh for ten minutes, so a page the worker does not serve can still
    // open), and with that cache off, which is the case after ten minutes and
    // the one that says whether the worker alone carries the route.
    out.offlineFresh = await loadOnce(ctx, server, route, profile, {
      limitMs: Math.min(limitMs, 45_000),
      offline: true,
    });
    out.offline = await loadOnce(ctx, server, route, profile, {
      limitMs: Math.min(limitMs, 45_000),
      offline: true,
      noHttpCache: true,
    });
  } finally {
    await ctx.close();
  }
  return out;
}

/**
 * Poll the worker's status from a page of the route until its core and idle
 * tiers are in the cache, or the cap passes. The page is left idle (nothing is
 * measured on it); a context with no worker answers null at once.
 */
async function settleBy(ctx, server, route, profile, capMs) {
  const page = await ctx.newPage();
  try {
    await throttle(page, profile);
    await page.goto(server.url + withQuality(route.path, profile), {
      waitUntil: 'domcontentloaded',
    });
    const until = Date.now() + capMs;
    let status = null;
    while (Date.now() < until) {
      status = await workerStatus(page).catch(() => null);
      if (!status) {
        // No registration yet: give the page a few seconds to make one.
        if (Date.now() - (until - capMs) > 20_000) return null;
      } else if (status.coreComplete && status.idleCached >= status.idleCount)
        break;
      await page.waitForTimeout(1000);
    }
    return status
      ? {
          coreComplete: status.coreComplete,
          cachedCount: status.cachedCount,
          precacheBytes: status.precacheBytes,
          idleComplete: status.idleCached >= status.idleCount,
        }
      : null;
  } finally {
    await page.close();
  }
}

// --- summaries and the table -------------------------------------------------

const MODES = ['cold', 'coldSw', 'warm', 'offlineFresh', 'offline'];

/** Summarize the runs of one route: per mode, per metric, {median, min, max, n}. */
export function summarize(runs) {
  const summary = {};
  for (const mode of MODES) {
    const loads = runs.map(r => r[mode]).filter(Boolean);
    if (!loads.length) continue;
    const pick = f => loads.map(f);
    summary[mode] = {
      usableMs: spread(pick(l => l.usableMs)),
      firstActionMs: spread(pick(l => l.firstActionMs)),
      actionMs: spread(pick(l => l.actionMs)),
      delayP50: spread(pick(l => l.input?.delayP50)),
      delayP95: spread(pick(l => l.input?.delayP95)),
      delayMax: spread(pick(l => l.input?.delayMax)),
      slowestMs: spread(pick(l => l.input?.slowestMs)),
      requests: spread(pick(l => l.atUsable?.requests)),
      bytes: spread(pick(l => l.atUsable?.bytes)),
      modules: spread(pick(l => l.atUsable?.modules)),
      totalRequests: spread(pick(l => l.total?.requests)),
      totalBytes: spread(pick(l => l.total?.bytes)),
      served: spread(pick(l => l.served)),
      opened: loads.filter(l => l.usableMs != null).length,
      runs: loads.length,
      errors: [...new Set(loads.map(l => l.error).filter(Boolean))],
      swActive: loads.map(l => l.swActive),
    };
  }
  return summary;
}

const s1 = v => (v == null ? 'n/a' : (v / 1000).toFixed(1));
const kb = v => (v == null ? 'n/a' : Math.round(v / 1000).toLocaleString('en'));
const ms1 = v => (v == null ? 'n/a' : v.toFixed(1));
const range = (m, f) => (m.min == null ? '' : ` (${f(m.min)} to ${f(m.max)})`);

/** The markdown table of one profile's matrix. */
export function markdownTable(results) {
  const rows = [
    '| Route | Load | Usable (s) | First action (s) | Input delay p50 / p95 / worst (ms) | Requests | Reached the server | Transferred (kB) | Modules |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const [routeId, summary] of Object.entries(results)) {
    for (const mode of MODES) {
      const m = summary[mode];
      if (!m) continue;
      const opened = m.opened === m.runs;
      rows.push(
        `| ${ROUTES[routeId]?.label ?? routeId} | ${mode} | ` +
          (m.opened
            ? `${s1(m.usableMs.median)}${range(m.usableMs, s1)}${opened ? '' : ` [${m.opened}/${m.runs} opened]`}`
            : `does not open (${m.errors[0] ?? 'no error'})`) +
          ` | ${m.opened ? s1(m.firstActionMs.median) : 'n/a'} | ` +
          (m.opened
            ? `${ms1(m.delayP50.median)} / ${ms1(m.delayP95.median)} / ${ms1(m.delayMax.median)}`
            : 'n/a') +
          ` | ${m.requests.median ?? 'n/a'} | ${m.served.median ?? 'n/a'} | ${kb(m.bytes.median)} | ${m.modules.median ?? 'n/a'} |`
      );
    }
  }
  return rows.join('\n');
}

// --- the CLI -----------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const profileId = valueOf('--profile', 'mid-range-phone');
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`no profile ${profileId}`);
  const runs = Number(valueOf('--runs', '3'));
  const routeIds = valueOf('--routes', BASELINE_ROUTES.join(',')).split(',');
  const transport = valueOf('--server', 'gzip');
  const locale = valueOf('--locale', 'en');
  const coldOnly = argv.includes('--cold-only');
  const jsonPath = valueOf('--json', null);
  const mdPath = valueOf('--markdown', null);
  for (const id of routeIds) if (!ROUTES[id]) throw new Error(`no route ${id}`);

  const { chromium } = await import('playwright');
  const server = await serveStatic({
    root: ROOT,
    gzip: transport === 'gzip',
    cacheHeaders: transport === 'gzip',
  });
  const browser = await launchFor(chromium, profile);
  const record = {
    when: new Date().toISOString(),
    profile: profileId,
    transport,
    locale,
    runs,
    node: process.version,
    chromium: browser.version(),
    results: {},
    raw: {},
  };
  try {
    for (const routeId of routeIds) {
      record.raw[routeId] = [];
      for (let i = 0; i < runs; i++) {
        const t0 = Date.now();
        const r = await measureRoute(browser, server, routeId, profile, {
          locale,
          coldOnly,
          limitMs: routeId === 'author-lesson' ? 400_000 : 150_000,
        });
        record.raw[routeId].push(r);
        console.error(
          `${routeId} run ${i + 1}/${runs}: cold ${s1(r.cold?.usableMs)} s` +
            (r.warm ? `, warm ${s1(r.warm.usableMs)} s` : '') +
            (r.offline
              ? `, offline ${r.offline.usableMs ? s1(r.offline.usableMs) + ' s' : 'no: ' + r.offline.error}`
              : '') +
            ` (${Math.round((Date.now() - t0) / 1000)} s of wall time)`
        );
      }
      record.results[routeId] = summarize(record.raw[routeId]);
    }
  } finally {
    await browser.close();
    server.close();
  }
  const table = markdownTable(record.results);
  if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(record, null, 2)}\n`);
  if (mdPath) writeFileSync(mdPath, `${table}\n`);
  console.log(table);
}

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();
