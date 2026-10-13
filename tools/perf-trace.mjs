// =============================================================================
// Compositor measurement: what a Chromium trace says about where a frame went
// -----------------------------------------------------------------------------
// Development only. The frame-time probe (tools/perf-probe.mjs) times the
// renderer's own entry points, which is main-thread script. It cannot tell a
// saving in rasterisation from a saving in JavaScript. This reads a Chromium
// trace (Playwright's browser.startTracing) and separates, over a window:
//
//   script    the main thread running JavaScript, timers, rAF, GC
//   layout    style recalculation and layout on the main thread
//   paint     the main thread recording paint (display lists), layer updates
//   commit    the main thread handing a frame to the compositor
//   raster    the compositor's tile workers and GPU-process raster/GPU tasks
//   composite the compositor and Viz threads assembling and drawing the frame
//
// plus the busy time of each thread, because buckets by event name are a
// reading of Chromium's trace vocabulary, which is not a stable API, and the
// thread totals are the part that does not depend on it.
//
// What it can and cannot show is written up in OFFLINE_AND_LOW_END.md. In
// short: it is the busy time of each thread of one browser on one machine. It
// is not display scanout, not vsync, not another GPU's fill rate, and in
// headless Chromium without a GPU the "GPU" is software (SwiftShader), so the
// raster number is a CPU number.
//
// Pure functions: nothing here touches a browser, so the bucket rules are
// tested on small synthetic traces (tests/perfTrace.test.js).
// =============================================================================

/** Trace categories that carry the events read here. */
export const TRACE_CATEGORIES = ['devtools.timeline', 'cc', 'gpu', 'viz'];

/** Larger than this and a trace cannot be held as one string; see the probe. */
export const MAX_TRACE_BYTES = 400 * 1024 * 1024;

const MAIN = 'main';

/** Bucket for an event name on the main thread (self time). */
const MAIN_BUCKETS = [
  [
    'layout',
    /^(UpdateLayoutTree|Layout|RecalculateStyles|UpdateLayout|IntersectionObserverController::computeIntersections)/,
  ],
  [
    'paint',
    /^(PrePaint|Paint|Layerize|UpdateLayer|UpdateLayerTree|PaintImage|Decode|ImageDecodeTask)/,
  ],
  [
    'commit',
    /^(Commit|CompositeLayers|ProxyMain::|ScopedCommit|LayerTreeHost::|ThreadProxy::)/,
  ],
  [
    'script',
    /^(FunctionCall|EvaluateScript|v8\.|V8\.|RunMicrotasks|TimerFire|FireAnimationFrame|EventDispatch|RequestAnimationFrame|MajorGC|MinorGC|BlinkGC|ThreadState::|HitTest|ParseHTML)/,
  ],
];

/** Bucket for a thread, from its name. */
export function threadKind(name) {
  if (/^CrRendererMain$/.test(name)) return MAIN;
  if (/^Compositor$/.test(name)) return 'compositor';
  if (/^VizCompositorThread$/.test(name)) return 'viz';
  if (/^CompositorTileWorker/.test(name)) return 'raster';
  if (/^(CrGpuMain|GpuMemoryThread|GPU)/.test(name)) return 'gpu';
  if (/^ThreadPool/.test(name)) return 'pool';
  return 'other';
}

/**
 * Read a trace's events.
 *
 * @param {Buffer|string|object} trace - What stopTracing returned, or its JSON
 * @returns {object[]} The events
 */
export function traceEvents(trace) {
  const parsed =
    typeof trace === 'string' || trace?.byteLength !== undefined
      ? JSON.parse(String(trace))
      : trace;
  return Array.isArray(parsed) ? parsed : parsed?.traceEvents || [];
}

/**
 * Self time of complete ('X') events: the duration of an event less the
 * durations of the events nested inside it on the same thread. Returns the
 * events with a `self` field in microseconds.
 */
function withSelfTime(slices) {
  const out = [];
  const sorted = [...slices].sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = [];
  for (const ev of sorted) {
    while (stack.length && stack[stack.length - 1].end <= ev.ts) {
      stack.pop();
    }
    const node = { ev, end: ev.ts + ev.dur, self: ev.dur };
    if (stack.length) stack[stack.length - 1].self -= ev.dur;
    stack.push(node);
    out.push(node);
  }
  return out.map(n => ({ ...n.ev, self: Math.max(0, n.self) }));
}

/**
 * Summarize a trace over the window it covers (or a given one).
 *
 * @param {object[]} events - From traceEvents
 * @param {{from?: number, to?: number, pid?: number}} [window] - Trace
 *   timestamps in microseconds; the renderer's pid is found when not given
 * @returns {object} Milliseconds by bucket, per thread kind, and the window
 */
export function summarizeTrace(events, window = {}) {
  const threadNames = new Map();
  const processNames = new Map();
  for (const e of events) {
    if (e.ph !== 'M') continue;
    if (e.name === 'thread_name')
      threadNames.set(`${e.pid}:${e.tid}`, e.args?.name || '');
    if (e.name === 'process_name') processNames.set(e.pid, e.args?.name || '');
  }
  const slices = events.filter(
    e => e.ph === 'X' && Number.isFinite(e.dur) && e.dur >= 0
  );
  if (!slices.length) return null;
  // The sample's own span: first to last animation frame the page ran, which
  // leaves out the tracing start-up and the flush either side of it.
  let lo = Infinity;
  let hi = -Infinity;
  let frameLo = Infinity;
  let frameHi = -Infinity;
  for (const e of slices) {
    lo = Math.min(lo, e.ts);
    hi = Math.max(hi, e.ts + e.dur);
    if (e.name === 'FireAnimationFrame') {
      frameLo = Math.min(frameLo, e.ts);
      frameHi = Math.max(frameHi, e.ts + e.dur);
    }
  }
  const framed = frameHi > frameLo;
  const from = window.from ?? (framed ? frameLo : lo);
  const to = window.to ?? (framed ? frameHi : hi);
  const inWindow = slices.filter(e => e.ts >= from && e.ts + e.dur <= to);

  const byThread = new Map();
  for (const e of inWindow) {
    const key = `${e.pid}:${e.tid}`;
    if (!byThread.has(key)) byThread.set(key, []);
    byThread.get(key).push(e);
  }

  const buckets = {
    script: 0,
    layout: 0,
    paint: 0,
    commit: 0,
    otherMain: 0,
    raster: 0,
    composite: 0,
    gpu: 0,
  };
  const busy = {};
  for (const [key, list] of byThread) {
    const kind = threadKind(threadNames.get(key) || '');
    const selfed = withSelfTime(list);
    const total = selfed.reduce((a, e) => a + e.self, 0);
    busy[kind] = (busy[kind] || 0) + total;
    if (kind === MAIN) {
      for (const e of selfed) {
        const hit = MAIN_BUCKETS.find(([, re]) => re.test(e.name));
        buckets[hit ? hit[0] : 'otherMain'] += e.self;
      }
    } else if (kind === 'pool') {
      // GPU rasterisation plays its tiles back on the thread pool.
      for (const e of selfed) {
        if (/^(RasterTask|ImageDecodeTask|GpuRasterBuffer)/.test(e.name))
          buckets.raster += e.self;
      }
    } else if (kind === 'raster') buckets.raster += total;
    else if (kind === 'compositor' || kind === 'viz')
      buckets.composite += total;
    else if (kind === 'gpu') buckets.gpu += total;
  }
  const toMs = us => us / 1000;
  return {
    windowMs: toMs(to - from),
    buckets: Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, toMs(v)])
    ),
    threadBusyMs: Object.fromEntries(
      Object.entries(busy).map(([k, v]) => [k, toMs(v)])
    ),
    slices: inWindow.length,
  };
}

/**
 * Totals from Long Animation Frame entries (the Performance API path).
 *
 * LoAF is main-thread only: a frame's script, then its style, layout and
 * paint recording, to the point the main thread hands off. It does not include
 * raster or composite on other threads, which is why both paths exist.
 *
 * @param {Array<object>} entries - PerformanceLongAnimationFrameTiming as plain objects
 * @returns {object} Counts and milliseconds
 */
export function summarizeLoaf(entries) {
  let scriptMs = 0;
  let renderMs = 0;
  let styleLayoutMs = 0;
  let blockingMs = 0;
  let worstMs = 0;
  for (const e of entries) {
    const end = e.startTime + e.duration;
    for (const s of e.scripts || []) scriptMs += s.duration || 0;
    renderMs += Math.max(0, end - (e.renderStart || end));
    styleLayoutMs += Math.max(0, end - (e.styleAndLayoutStart || end));
    blockingMs += e.blockingDuration || 0;
    worstMs = Math.max(worstMs, e.duration);
  }
  return {
    frames: entries.length,
    scriptMs,
    renderMs,
    styleLayoutMs,
    blockingMs,
    worstMs,
  };
}
