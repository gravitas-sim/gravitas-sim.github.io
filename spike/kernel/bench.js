// SPIKE (Prompt 21): the benchmark, in the page. window.bench(opts) runs every
// form of both kernels on the same data and returns the numbers; bench.mjs
// drives it in Chromium (with and without a 4x CPU throttle), Firefox and
// WebKit. Timings are medians of `repeats` runs after one warm-up.

import { kernelBytes, glsJs, glsWasm, blsJs, blsWasm, RESEED } from './kernels.mjs';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const median = xs => [...xs].sort((a, b) => a - b)[xs.length >> 1];

/** The production GLS inner loop, as js/measure/periodogram.js runs it. */
function glsBaseline(t, y, dy, f0, df, m) {
  const n = t.length;
  const w = new Float64Array(n);
  let W = 0;
  for (let i = 0; i < n; i++) W += w[i] = dy ? 1 / (dy[i] * dy[i]) : 1;
  let Y = 0;
  let tm = 0;
  for (let i = 0; i < n; i++) {
    w[i] /= W;
    Y += w[i] * y[i];
    tm += w[i] * t[i];
  }
  let YY = 0;
  for (let i = 0; i < n; i++) YY += w[i] * (y[i] - Y) * (y[i] - Y);
  const power = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const om = 2 * Math.PI * (f0 + k * df);
    let C = 0, S = 0, YCh = 0, YSh = 0, CCh = 0, CSh = 0, SSh = 0;
    for (let i = 0; i < n; i++) {
      const x = om * (t[i] - tm);
      const c = Math.cos(x);
      const s = Math.sin(x);
      const wi = w[i];
      C += wi * c;
      S += wi * s;
      YCh += wi * y[i] * c;
      YSh += wi * y[i] * s;
      CCh += wi * c * c;
      CSh += wi * c * s;
      SSh += wi * s * s;
    }
    const YC = YCh - Y * C, YS = YSh - Y * S, CC = CCh - C * C, SS = SSh - S * S, CS = CSh - C * S;
    power[k] = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * (CC * SS - CS * CS));
  }
  return power;
}

/** The production BLS inner loop (js/measure/periodogram.js atPeriod), for a grid. */
function blsBaseline(t, y, dy, periods, dmin, durations) {
  const n = t.length;
  const w = Float64Array.from({ length: n }, (_, i) => (dy ? 1 / (dy[i] * dy[i]) : 1));
  let W = 0;
  let Wy = 0;
  for (let i = 0; i < n; i++) {
    W += w[i];
    Wy += w[i] * y[i];
  }
  const mean = Wy / W;
  let t0 = Infinity;
  for (let i = 0; i < n; i++) t0 = Math.min(t0, t[i]);
  const binsAt = P => Math.max(8, Math.ceil(P / (dmin / 4)));
  const atPeriod = P => {
    const nb = binsAt(P);
    const sw = new Float64Array(nb);
    const swy = new Float64Array(nb);
    for (let i = 0; i < n; i++) {
      const ph = ((((t[i] - t0) / P) % 1) + 1) % 1;
      const b = Math.min(nb - 1, Math.floor(ph * nb));
      sw[b] += w[i];
      swy[b] += w[i] * (y[i] - mean);
    }
    let top = null;
    for (const D of durations) {
      const q = Math.max(1, Math.round((D / P) * nb));
      let a = 0;
      let c = 0;
      for (let b = 0; b < q; b++) {
        a += sw[b];
        c += swy[b];
      }
      for (let b = 0; b < nb; b++) {
        if (a > 0 && a < W && c < 0) {
          const sr = (c * c) / (a * (1 - a / W));
          if (!top || sr > top.sr) top = { sr, P, D, epoch: t0 + ((b + q / 2) / nb) * P, depth: -c / a / (1 - a / W) };
        }
        a += sw[(b + q) % nb] - sw[b];
        c += swy[(b + q) % nb] - swy[b];
      }
    }
    return top;
  };
  const power = new Float64Array(periods.length);
  for (let k = 0; k < periods.length; k++) power[k] = atPeriod(periods[k])?.sr ?? 0;
  return power;
}

async function sha(arr) {
  const d = await crypto.subtle.digest('SHA-256', new Uint8Array(arr.buffer.slice(0)));
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
const maxRel = (a, b) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]) / Math.max(1e-300, Math.abs(b[i])));
  return m;
};

const argmax = a => {
  let k = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i;
  return k;
};

function time(fn, repeats) {
  fn();
  const ms = [];
  let out;
  for (let r = 0; r < repeats; r++) {
    const t0 = performance.now();
    out = fn();
    ms.push(performance.now() - t0);
  }
  return { ms: median(ms), out };
}

/** The same optimized JavaScript in a Worker: its compute, and its transfer. */
function workerRun(kind, data) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./bench.worker.js', import.meta.url), { type: 'module' });
    const t0 = performance.now();
    w.onmessage = e => {
      const total = performance.now() - t0;
      w.terminate();
      resolve({ total, compute: e.data.compute, bytes: e.data.power.byteLength });
    };
    w.onerror = e => reject(e);
    w.postMessage({ kind, ...data });
  });
}

window.bench = async ({ repeats = 5, gls = { n: 1882, m: 20000 }, bls = { n: 1882, periods: 12000 } } = {}) => {
  const out = { ua: navigator.userAgent, repeats };
  // Cold load: compile and instantiate the kernel module.
  const bytes = kernelBytes();
  const c0 = performance.now();
  const mod = await WebAssembly.compile(bytes);
  const c1 = performance.now();
  const instance = await WebAssembly.instantiate(mod);
  const c2 = performance.now();
  out.wasm = { bytes: bytes.length, compileMs: c1 - c0, instantiateMs: c2 - c1, memoryPages: instance.exports.memory.buffer.byteLength / 65536 };

  // --- The compute-heavy kernel -----------------------------------------------------
  const r = rng(11);
  const t = Array.from({ length: gls.n }, () => r() * 27.9).sort((a, b) => a - b);
  const y = t.map(x => 1 - 0.01 * Math.sin((2 * Math.PI * x) / 3.52) + 0.002 * (r() - 0.5));
  const dy = t.map(() => 0.002);
  const f0 = 1 / 13.9;
  const df = 1 / (5 * 27.9);
  const m = gls.m;
  const base = time(() => glsBaseline(t, y, dy, f0, df, m), repeats);
  const js = time(() => glsJs(t, y, dy, f0, df, m), repeats);
  const wasm = time(() => glsWasm(instance, t, y, dy, f0, df, m), repeats);
  const chunk = time(() => glsWasm(instance, t, y, dy, f0, df, RESEED), repeats);
  const wk = await workerRun('gls', { t, y, dy, f0, df, m });
  out.gls = {
    n: gls.n,
    m,
    baselineMs: base.ms,
    jsMs: js.ms,
    wasmMs: wasm.ms,
    wasmChunkMs: chunk.ms,
    worker: wk,
    jsVsBaseline: maxRel(js.out, base.out),
    wasmVsJs: maxRel(wasm.out, js.out),
    sha: { baseline: await sha(base.out), js: await sha(js.out), wasm: await sha(wasm.out) },
  };

  // --- The data-heavy kernel -----------------------------------------------------------
  const tt = [];
  const yy = [];
  for (let x = 0; x < 27.9; x += 27.9 / bls.n) {
    tt.push(x);
    const ph = (((((x - 0.9) / 3.52 + 0.5) % 1) + 1) % 1) - 0.5;
    yy.push(1 - (Math.abs(ph * 3.52) < 0.06 ? 0.014 : 0) + 0.002 * (r() - 0.5));
  }
  const periods = Array.from({ length: bls.periods }, (_, k) => 1 + (k * 9) / bls.periods);
  const durations = [0.08, 0.12, 0.16];
  const bb = time(() => blsBaseline(tt, yy, null, periods, 0.08, durations), repeats);
  const bj = time(() => blsJs(tt, yy, null, periods, 0.08, durations), repeats);
  const bw = time(() => blsWasm(instance, tt, yy, null, periods, 0.08, durations), repeats);
  const last = periods.slice(-16);
  const blsChunk = time(() => blsWasm(instance, tt, yy, null, last, 0.08, durations), repeats);
  const blsChunkJs = time(() => blsJs(tt, yy, null, last, 0.08, durations), repeats);
  const bwk = await workerRun('bls', { t: tt, y: yy, periods, dmin: 0.08, durations });
  out.bls = {
    n: tt.length,
    periods: bls.periods,
    baselineMs: bb.ms,
    wasmChunkMs: blsChunk.ms,
    jsChunkMs: blsChunkJs.ms,
    jsMs: bj.ms,
    wasmMs: bw.ms,
    worker: bwk,
    wasmVsJs: maxRel(bw.out, bj.out),
    jsVsBaseline: maxRel(bj.out, bb.out),
    argmax: { baseline: argmax(bb.out), js: argmax(bj.out), wasm: argmax(bw.out) },
    sha: { baseline: await sha(bb.out), js: await sha(bj.out), wasm: await sha(bw.out) },
  };
  out.wasm.memoryBytesAfter = instance.exports.memory.buffer.byteLength;
  return out;
};
document.documentElement.dataset.ready = 'true';

// Run without an automation protocol: bench.html?auto posts its result to the
// server that launched the browser (direct.mjs).
if (new URLSearchParams(location.search).has('auto'))
  window
    .bench({ repeats: Number(new URLSearchParams(location.search).get('repeats') || 5) })
    .then(
      r => fetch('./result', { method: 'POST', body: JSON.stringify(r) }),
      e => fetch('./result', { method: 'POST', body: JSON.stringify({ error: String(e) }) })
    );
