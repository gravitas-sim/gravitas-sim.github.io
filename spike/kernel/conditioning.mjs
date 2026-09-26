// SPIKE (Prompt 21): how exactly can the GLS power be computed at all?
//   node spike/kernel/conditioning.mjs
// THRESHOLDS.md asks every output to be within 1e-12 relative of the direct
// formula. This computes the direct formula three ways that are the same
// algebra and differ only in the order of one product (2 pi f t), and compares
// each with the baseline's order, and the recurrence with it too. Where the
// power is nearly zero it is a difference of nearly equal sums, and its
// relative error is the rounding of those sums divided by almost nothing.
// Deterministic: the same numbers on any machine with the same Math.cos.
import { glsJs } from './kernels.mjs';
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(11);
const n = 1882, m = 20000;
const t = Array.from({ length: n }, () => r() * 27.9).sort((a, b) => a - b);
const y = t.map(x => 1 - 0.01 * Math.sin((2 * Math.PI * x) / 3.52) + 0.002 * (r() - 0.5));
const dy = t.map(() => 0.002);
const f0 = 1 / 13.9, df = 1 / (5 * 27.9);
// Direct formula, parameterized by how the phase is formed.
function direct(phase) {
  const w = dy.map(d => 1 / d / d); const W = w.reduce((a, b) => a + b); const wn = w.map(x => x / W);
  let Y = 0, tm = 0; for (let i = 0; i < n; i++) { Y += wn[i] * y[i]; tm += wn[i] * t[i]; }
  let YY = 0; for (let i = 0; i < n; i++) YY += wn[i] * (y[i] - Y) ** 2;
  const tc = t.map(v => v - tm);
  const p = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const f = f0 + k * df;
    let C = 0, S = 0, YCh = 0, YSh = 0, CCh = 0, CSh = 0, SSh = 0;
    for (let i = 0; i < n; i++) { const x = phase(f, tc[i]); const c = Math.cos(x), s = Math.sin(x); C += wn[i] * c; S += wn[i] * s; YCh += wn[i] * y[i] * c; YSh += wn[i] * y[i] * s; CCh += wn[i] * c * c; CSh += wn[i] * c * s; SSh += wn[i] * s * s; }
    const YC = YCh - Y * C, YS = YSh - Y * S, CC = CCh - C * C, SS = SSh - S * S, CS = CSh - C * S;
    p[k] = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * (CC * SS - CS * CS));
  }
  return p;
}
const A = direct((f, tc) => 2 * Math.PI * f * tc);          // the baseline's form
const B = direct((f, tc) => 2 * Math.PI * (f * tc));        // same formula, another rounding
const B2 = direct((f, tc) => (2 * Math.PI * tc) * f);
const J = glsJs(t, y, dy, f0, df, m);
const peak = Math.max(...A);
const stats = (u, v, label) => {
  let rel = 0, abs = 0, at = 0;
  for (let k = 0; k < m; k++) { const e = Math.abs(u[k] - v[k]); const rr = e / Math.abs(v[k]); if (rr > rel) { rel = rr; at = k; } abs = Math.max(abs, e); }
  const sorted = Array.from(u, (x, k) => Math.abs(x - v[k]) / Math.abs(v[k])).sort((a, b) => a - b);
  console.log(label.padEnd(34), 'max rel', rel.toExponential(2), 'at power', v[at].toExponential(2), '| 99th pct rel', sorted[Math.floor(0.99 * m)].toExponential(2), '| median', sorted[m >> 1].toExponential(2), '| max abs / peak', (abs / peak).toExponential(2));
};
console.log('peak power', peak.toFixed(4), 'min power', Math.min(...A).toExponential(2));
stats(B, A, 'direct, 2pi(f t) vs 2pi f t');
stats(B2, A, 'direct, (2pi t) f vs 2pi f t');
stats(J, A, 'recurrence (RESEED 512) vs direct');
