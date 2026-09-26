// =============================================================================
// SPIKE (Prompt 21): two kernels, each in three forms
// -----------------------------------------------------------------------------
//   compute-heavy  the generalized Lomb-Scargle power over a frequency grid
//                  (js/measure/periodogram.js): N x M trigonometric sums
//   data-heavy     box least squares for one trial period: fold N points into
//                  bins, a scatter into memory, then scan every box
//
// For each:
//   baseline   the production JavaScript as it is
//   js         optimized JavaScript: the same arithmetic the WASM does (for
//              the GLS, cos and sin by rotation recurrence instead of
//              Math.cos and Math.sin at every point and frequency)
//   wasm       the purpose-built kernel, from ./wasm.mjs
//
// The recurrence: cos((w + dw) t) = cos(w t) cos(dw t) - sin(w t) sin(dw t),
// and likewise for sin. Each frequency costs four multiplications a point
// instead of two calls to the engine's trigonometry. Its rounding drift grows
// with the number of steps, so the caller re-seeds the exact values every
// RESEED frequencies, which also bounds how long one call runs: that is the
// kernel's cancellation granularity.
// =============================================================================

import { T, op, module } from './wasm.mjs';

export const RESEED = 512;

// --- GLS, the WASM form ------------------------------------------------------------

/**
 * gls(n, m, Y, YY): for m frequencies, the GLS power into `power`, rotating
 * c and s in place. Memory, f64 at byte 8 i: w[n], wy[n], c[n], s[n], cd[n],
 * sd[n], power[m], in that order.
 */
function glsFunction() {
  // params: 0 n, 1 m, 2 Y, 3 YY
  // locals (i32): 4 i, 5 k, 6 n8, 7 a, 8 a2, 9 a3
  // locals (f64): 10 C, 11 S, 12 YCh, 13 YSh, 14 CCh, 15 CSh, 16 w, 17 wy,
  //               18 c, 19 s, 20 cd, 21 sd, 22 YC, 23 YS, 24 CC, 25 SS,
  //               26 CS, 27 D
  const I = { n: 0, m: 1, Y: 2, YY: 3, i: 4, k: 5, n8: 6, a: 7, a2: 8, a3: 9 };
  const F = { C: 10, S: 11, YCh: 12, YSh: 13, CCh: 14, CSh: 15, w: 16, wy: 17, c: 18, s: 19, cd: 20, sd: 21, YC: 22, YS: 23, CC: 24, SS: 25, CS: 26, D: 27 };
  const g = op.get;
  const set = op.set;
  const acc = (dst, ...terms) => [g(dst), ...terms, op.fadd, set(dst)];
  const zero = id => [op.f64(0), set(id)];
  return {
    name: 'gls',
    params: [T.i32, T.i32, T.f64, T.f64],
    results: [],
    locals: [T.i32, T.i32, T.i32, T.i32, T.i32, T.i32, ...Array(18).fill(T.f64)],
    body: [
      g(I.n), op.i32(3), op.ishl, set(I.n8),
      op.i32(0), set(I.k),
      op.block, op.loop,
      g(I.k), g(I.m), op.ilts, op.ieqz, op.brIf(1),
      zero(F.C), zero(F.S), zero(F.YCh), zero(F.YSh), zero(F.CCh), zero(F.CSh),
      op.i32(0), set(I.i),
      op.block, op.loop,
      g(I.i), g(I.n), op.ilts, op.ieqz, op.brIf(1),
      // a = 8 i; a2 = a + 2 n8 (c); a3 = a + 3 n8 (s)
      g(I.i), op.i32(3), op.ishl, set(I.a),
      g(I.a), g(I.n8), op.i32(1), op.ishl, op.iadd, set(I.a2),
      g(I.a2), g(I.n8), op.iadd, set(I.a3),
      g(I.a), op.load(), set(F.w),
      g(I.a), g(I.n8), op.iadd, op.load(), set(F.wy),
      g(I.a2), op.load(), set(F.c),
      g(I.a3), op.load(), set(F.s),
      acc(F.C, g(F.w), g(F.c), op.fmul),
      acc(F.S, g(F.w), g(F.s), op.fmul),
      acc(F.YCh, g(F.wy), g(F.c), op.fmul),
      acc(F.YSh, g(F.wy), g(F.s), op.fmul),
      acc(F.CCh, g(F.w), g(F.c), op.fmul, g(F.c), op.fmul),
      acc(F.CSh, g(F.w), g(F.c), op.fmul, g(F.s), op.fmul),
      // cd at a3 + n8, sd at a3 + 2 n8
      g(I.a3), g(I.n8), op.iadd, op.load(), set(F.cd),
      g(I.a3), g(I.n8), op.i32(1), op.ishl, op.iadd, op.load(), set(F.sd),
      // c' = c cd - s sd ; s' = s cd + c sd
      g(I.a2), g(F.c), g(F.cd), op.fmul, g(F.s), g(F.sd), op.fmul, op.fsub, op.store(),
      g(I.a3), g(F.s), g(F.cd), op.fmul, g(F.c), g(F.sd), op.fmul, op.fadd, op.store(),
      g(I.i), op.i32(1), op.iadd, set(I.i),
      op.br(0),
      op.end, op.end,
      // The frequency's power.
      g(F.YCh), g(I.Y), g(F.C), op.fmul, op.fsub, set(F.YC),
      g(F.YSh), g(I.Y), g(F.S), op.fmul, op.fsub, set(F.YS),
      g(F.CCh), g(F.C), g(F.C), op.fmul, op.fsub, set(F.CC),
      op.f64(1), g(F.CCh), op.fsub, g(F.S), g(F.S), op.fmul, op.fsub, set(F.SS),
      g(F.CSh), g(F.C), g(F.S), op.fmul, op.fsub, set(F.CS),
      g(F.CC), g(F.SS), op.fmul, g(F.CS), g(F.CS), op.fmul, op.fsub, set(F.D),
      // power[k] at 6 n8 + 8 k
      g(I.n8), op.i32(6), op.imul, g(I.k), op.i32(3), op.ishl, op.iadd,
      g(F.SS), g(F.YC), op.fmul, g(F.YC), op.fmul,
      g(F.CC), g(F.YS), op.fmul, g(F.YS), op.fmul, op.fadd,
      op.f64(2), g(F.CS), op.fmul, g(F.YC), op.fmul, g(F.YS), op.fmul, op.fsub,
      g(I.YY), g(F.D), op.fmul, op.fdiv,
      op.store(),
      g(I.k), op.i32(1), op.iadd, set(I.k),
      op.br(0),
      op.end, op.end,
    ],
  };
}

// --- BLS for one period, the WASM form ---------------------------------------------------

/**
 * bls(n, P, t0, nb, W, qn) -> best signal residue; its bin at `best`.
 * Memory: t[n], w[n], wd[n] (w (y - mean)), q[qn] (box lengths in bins, as
 * f64), sw[nb], swy[nb], then two f64 out: the best sr and its start bin.
 */
function blsFunction() {
  // params: 0 n (i32), 1 P (f64), 2 t0 (f64), 3 nb (i32), 4 W (f64), 5 qn (i32)
  // locals i32: 6 i, 7 n8, 8 bins (byte address of sw), 9 b, 10 j, 11 q, 12 qi, 13 bestB
  // locals f64: 14 ph, 15 a, 16 c, 17 sr, 18 best, 19 x
  const L = { n: 0, P: 1, t0: 2, nb: 3, W: 4, qn: 5, i: 6, n8: 7, bins: 8, b: 9, j: 10, q: 11, qi: 12, bestB: 13, ph: 14, a: 15, c: 16, sr: 17, best: 18, x: 19 };
  const g = op.get;
  const set = op.set;
  // address of sw[b] and swy[b]
  const swAt = bIdx => [g(L.bins), g(bIdx), op.i32(3), op.ishl, op.iadd];
  const swyAt = bIdx => [g(L.bins), g(L.nb), op.i32(3), op.ishl, op.iadd, g(bIdx), op.i32(3), op.ishl, op.iadd];
  return {
    name: 'bls',
    params: [T.i32, T.f64, T.f64, T.i32, T.f64, T.i32],
    results: [T.f64],
    locals: [T.i32, T.i32, T.i32, T.i32, T.i32, T.i32, T.i32, T.i32, T.f64, T.f64, T.f64, T.f64, T.f64, T.f64],
    body: [
      g(L.n), op.i32(3), op.ishl, set(L.n8),
      // bins start after t, w, wd (3 n8) and q (8 qn)
      g(L.n8), op.i32(3), op.imul, g(L.qn), op.i32(3), op.ishl, op.iadd, set(L.bins),
      // zero the bins
      op.i32(0), set(L.b),
      op.block, op.loop,
      g(L.b), g(L.nb), op.ilts, op.ieqz, op.brIf(1),
      ...swAt(L.b), op.f64(0), op.store(),
      ...swyAt(L.b), op.f64(0), op.store(),
      g(L.b), op.i32(1), op.iadd, set(L.b),
      op.br(0), op.end, op.end,
      // fold and bin
      op.i32(0), set(L.i),
      op.block, op.loop,
      g(L.i), g(L.n), op.ilts, op.ieqz, op.brIf(1),
      // ph = frac((t - t0) / P)
      g(L.i), op.i32(3), op.ishl, op.load(), g(L.t0), op.fsub, g(L.P), op.fdiv, set(L.x),
      g(L.x), g(L.x), op.ffloor, op.fsub, set(L.ph),
      // b = min(nb - 1, floor(ph nb))
      g(L.ph), g(L.nb), op.convert, op.fmul, op.trunc, set(L.b),
      g(L.b), g(L.nb), op.i32(1), op.isub, g(L.b), g(L.nb), op.i32(1), op.isub, op.ilts, op.select, set(L.b),
      // sw[b] += w[i]; swy[b] += wd[i]
      ...swAt(L.b), ...swAt(L.b), op.load(), g(L.i), op.i32(3), op.ishl, g(L.n8), op.iadd, op.load(), op.fadd, op.store(),
      ...swyAt(L.b), ...swyAt(L.b), op.load(), g(L.i), op.i32(3), op.ishl, g(L.n8), op.i32(1), op.ishl, op.iadd, op.load(), op.fadd, op.store(),
      g(L.i), op.i32(1), op.iadd, set(L.i),
      op.br(0), op.end, op.end,
      // every box length, every start
      op.f64(0), set(L.best),
      op.i32(0), set(L.qi),
      op.block, op.loop,
      g(L.qi), g(L.qn), op.ilts, op.ieqz, op.brIf(1),
      g(L.n8), op.i32(3), op.imul, g(L.qi), op.i32(3), op.ishl, op.iadd, op.load(), op.trunc, set(L.q),
      // a, c over bins 0..q-1
      op.f64(0), set(L.a), op.f64(0), set(L.c),
      op.i32(0), set(L.j),
      op.block, op.loop,
      g(L.j), g(L.q), op.ilts, op.ieqz, op.brIf(1),
      g(L.a), ...swAt(L.j), op.load(), op.fadd, set(L.a),
      g(L.c), ...swyAt(L.j), op.load(), op.fadd, set(L.c),
      g(L.j), op.i32(1), op.iadd, set(L.j),
      op.br(0), op.end, op.end,
      op.i32(0), set(L.b),
      op.block, op.loop,
      g(L.b), g(L.nb), op.ilts, op.ieqz, op.brIf(1),
      // if a > 0 and a < W and c < 0: sr = c^2 / (a (1 - a / W))
      g(L.a), op.f64(0), op.fgt, g(L.a), g(L.W), op.flt, [0x71], g(L.c), op.f64(0), op.flt, [0x71],
      op.if,
      g(L.c), g(L.c), op.fmul, g(L.a), op.f64(1), g(L.a), g(L.W), op.fdiv, op.fsub, op.fmul, op.fdiv, set(L.sr),
      g(L.sr), g(L.best), op.fgt,
      op.if, g(L.sr), set(L.best), g(L.b), set(L.bestB), op.end,
      op.end,
      // slide: add bin (b + q) mod nb, drop bin b
      g(L.b), g(L.q), op.iadd, g(L.nb), [0x70], set(L.j),
      g(L.a), ...swAt(L.j), op.load(), op.fadd, ...swAt(L.b), op.load(), op.fsub, set(L.a),
      g(L.c), ...swyAt(L.j), op.load(), op.fadd, ...swyAt(L.b), op.load(), op.fsub, set(L.c),
      g(L.b), op.i32(1), op.iadd, set(L.b),
      op.br(0), op.end, op.end,
      g(L.qi), op.i32(1), op.iadd, set(L.qi),
      op.br(0), op.end, op.end,
      // out: best and its bin, after the bins
      g(L.bins), g(L.nb), op.i32(4), op.ishl, op.iadd, g(L.best), op.store(),
      g(L.bins), g(L.nb), op.i32(4), op.ishl, op.iadd, g(L.bestB), op.convert, op.store(8),
      g(L.best),
    ],
  };
}

/** The kernel module's bytes. */
export function kernelBytes() {
  return module({ pages: 1, functions: [glsFunction(), blsFunction()] });
}

// --- The JavaScript forms --------------------------------------------------------------

/** Optimized JavaScript GLS: the same recurrence, the same re-seeding. */
export function glsJs(t, y, dy, f0, df, m) {
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
  const wy = Float64Array.from(w, (wi, i) => wi * y[i]);
  const tc = Float64Array.from(t, v => v - tm);
  const c = new Float64Array(n);
  const s = new Float64Array(n);
  const cd = Float64Array.from(tc, v => Math.cos(2 * Math.PI * df * v));
  const sd = Float64Array.from(tc, v => Math.sin(2 * Math.PI * df * v));
  const power = new Float64Array(m);
  for (let k0 = 0; k0 < m; k0 += RESEED) {
    const om = 2 * Math.PI * (f0 + k0 * df);
    for (let i = 0; i < n; i++) {
      c[i] = Math.cos(om * tc[i]);
      s[i] = Math.sin(om * tc[i]);
    }
    const k1 = Math.min(m, k0 + RESEED);
    for (let k = k0; k < k1; k++) {
      let C = 0;
      let S = 0;
      let YCh = 0;
      let YSh = 0;
      let CCh = 0;
      let CSh = 0;
      for (let i = 0; i < n; i++) {
        const ci = c[i];
        const si = s[i];
        const wi = w[i];
        C += wi * ci;
        S += wi * si;
        YCh += wy[i] * ci;
        YSh += wy[i] * si;
        CCh += wi * ci * ci;
        CSh += wi * ci * si;
        c[i] = ci * cd[i] - si * sd[i];
        s[i] = si * cd[i] + ci * sd[i];
      }
      const YC = YCh - Y * C;
      const YS = YSh - Y * S;
      const CC = CCh - C * C;
      const SS = 1 - CCh - S * S;
      const CS = CSh - C * S;
      const D = CC * SS - CS * CS;
      power[k] = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * D);
    }
  }
  return power;
}

/** The WASM GLS, driven from JavaScript: seeds, chunks, reads the power. */
export function glsWasm(instance, t, y, dy, f0, df, m) {
  const { gls, memory } = instance.exports;
  const n = t.length;
  const need = 8 * (6 * n + Math.min(m, RESEED));
  if (need > memory.buffer.byteLength) memory.grow(Math.ceil((need - memory.buffer.byteLength) / 65536));
  const mem = new Float64Array(memory.buffer);
  const w = mem.subarray(0, n);
  const wy = mem.subarray(n, 2 * n);
  const c = mem.subarray(2 * n, 3 * n);
  const s = mem.subarray(3 * n, 4 * n);
  const cd = mem.subarray(4 * n, 5 * n);
  const sd = mem.subarray(5 * n, 6 * n);
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
  const tc = Float64Array.from(t, v => v - tm);
  for (let i = 0; i < n; i++) {
    wy[i] = w[i] * y[i];
    cd[i] = Math.cos(2 * Math.PI * df * tc[i]);
    sd[i] = Math.sin(2 * Math.PI * df * tc[i]);
  }
  const power = new Float64Array(m);
  for (let k0 = 0; k0 < m; k0 += RESEED) {
    const om = 2 * Math.PI * (f0 + k0 * df);
    for (let i = 0; i < n; i++) {
      c[i] = Math.cos(om * tc[i]);
      s[i] = Math.sin(om * tc[i]);
    }
    const k1 = Math.min(m, k0 + RESEED);
    gls(n, k1 - k0, Y, YY);
    power.set(mem.subarray(6 * n, 6 * n + (k1 - k0)), k0);
  }
  return power;
}

/** The WASM BLS over a grid of periods, driven from JavaScript. */
export function blsWasm(instance, t, y, dy, periods, dmin, durations) {
  const { bls, memory } = instance.exports;
  const n = t.length;
  let W = 0;
  let Wy = 0;
  const w = Float64Array.from({ length: n }, (_, i) => (dy ? 1 / (dy[i] * dy[i]) : 1));
  for (let i = 0; i < n; i++) {
    W += w[i];
    Wy += w[i] * y[i];
  }
  const mean = Wy / W;
  const nbMax = Math.max(8, Math.ceil(Math.max(...periods) / (dmin / 4)));
  const qn = durations.length;
  const need = 8 * (3 * n + qn + 2 * nbMax + 2);
  if (need > memory.buffer.byteLength) memory.grow(Math.ceil((need - memory.buffer.byteLength) / 65536));
  const mem = new Float64Array(memory.buffer);
  const t0 = t[0];
  mem.set(t, 0);
  mem.set(w, n);
  for (let i = 0; i < n; i++) mem[2 * n + i] = w[i] * (y[i] - mean);
  const power = new Float64Array(periods.length);
  for (let k = 0; k < periods.length; k++) {
    const P = periods[k];
    const nb = Math.max(8, Math.ceil(P / (dmin / 4)));
    for (let d = 0; d < qn; d++) mem[3 * n + d] = Math.max(1, Math.round((durations[d] / P) * nb));
    power[k] = bls(n, P, t0, nb, W, qn);
  }
  return power;
}

/** Optimized-JavaScript BLS: the same fold, bin and scan, flat. */
export function blsJs(t, y, dy, periods, dmin, durations) {
  const n = t.length;
  let W = 0;
  let Wy = 0;
  const w = Float64Array.from({ length: n }, (_, i) => (dy ? 1 / (dy[i] * dy[i]) : 1));
  for (let i = 0; i < n; i++) {
    W += w[i];
    Wy += w[i] * y[i];
  }
  const mean = Wy / W;
  const wd = Float64Array.from(w, (wi, i) => wi * (y[i] - mean));
  const nbMax = Math.max(8, Math.ceil(Math.max(...periods) / (dmin / 4)));
  const sw = new Float64Array(nbMax);
  const swy = new Float64Array(nbMax);
  const t0 = t[0];
  const power = new Float64Array(periods.length);
  for (let k = 0; k < periods.length; k++) {
    const P = periods[k];
    const nb = Math.max(8, Math.ceil(P / (dmin / 4)));
    sw.fill(0, 0, nb);
    swy.fill(0, 0, nb);
    for (let i = 0; i < n; i++) {
      const x = (t[i] - t0) / P;
      const b = Math.min(nb - 1, Math.trunc((x - Math.floor(x)) * nb));
      sw[b] += w[i];
      swy[b] += wd[i];
    }
    let best = 0;
    for (const D of durations) {
      const q = Math.max(1, Math.round((D / P) * nb));
      let a = 0;
      let c = 0;
      for (let j = 0; j < q; j++) {
        a += sw[j];
        c += swy[j];
      }
      for (let b = 0; b < nb; b++) {
        if (a > 0 && a < W && c < 0) {
          const sr = (c * c) / (a * (1 - a / W));
          if (sr > best) best = sr;
        }
        const j = (b + q) % nb;
        a += sw[j] - sw[b];
        c += swy[j] - swy[b];
      }
    }
    power[k] = best;
  }
  return power;
}
