import { kernelBytes, glsJs, glsWasm, blsJs, blsWasm } from './kernels.mjs';
const bytes = kernelBytes();
console.log('bytes', bytes.length, 'valid', WebAssembly.validate(bytes));
const { instance } = await WebAssembly.instantiate(bytes);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(1);
const n = 300, t = Array.from({ length: n }, () => r() * 100).sort((a, b) => a - b);
const y = t.map(x => Math.sin(2 * Math.PI * x / 3.1) + 0.3 * (r() - 0.5)), dy = t.map(() => 0.1);
// Reference: the direct formula at each frequency, Math.cos/sin.
const f0 = 0.02, df = 0.0005, m = 1500;
const ref = new Float64Array(m);
{ const w = dy.map(d => 1 / d / d); const W = w.reduce((a, b) => a + b); const wn = w.map(x => x / W);
  const Y = wn.reduce((a, wi, i) => a + wi * y[i], 0), tm = wn.reduce((a, wi, i) => a + wi * t[i], 0);
  const YY = wn.reduce((a, wi, i) => a + wi * (y[i] - Y) ** 2, 0);
  for (let k = 0; k < m; k++) { const om = 2 * Math.PI * (f0 + k * df); let C = 0, S = 0, YCh = 0, YSh = 0, CCh = 0, CSh = 0, SSh = 0;
    for (let i = 0; i < n; i++) { const c = Math.cos(om * (t[i] - tm)), s = Math.sin(om * (t[i] - tm)); C += wn[i] * c; S += wn[i] * s; YCh += wn[i] * y[i] * c; YSh += wn[i] * y[i] * s; CCh += wn[i] * c * c; CSh += wn[i] * c * s; SSh += wn[i] * s * s; }
    const YC = YCh - Y * C, YS = YSh - Y * S, CC = CCh - C * C, SS = SSh - S * S, CS = CSh - C * S, D = CC * SS - CS * CS;
    ref[k] = (SS * YC * YC + CC * YS * YS - 2 * CS * YC * YS) / (YY * D); } }
const a = glsJs(t, y, dy, f0, df, m), b = glsWasm(instance, t, y, dy, f0, df, m);
const maxdiff = (u, v) => u.reduce((mx, x, i) => Math.max(mx, Math.abs(x - v[i])), 0);
console.log('GLS js vs ref', maxdiff(a, ref).toExponential(2), 'wasm vs ref', maxdiff(b, ref).toExponential(2), 'wasm vs js', maxdiff(a, b));
// BLS: synthetic transit
const tt = [], yy = [];
for (let x = 0; x < 27; x += 0.0139) { tt.push(x); const ph = ((((x - 0.9) / 2.7 + 0.5) % 1) + 1) % 1 - 0.5; yy.push(1 - (Math.abs(ph * 2.7) < 0.06 ? 0.01 : 0) + 0.002 * (r() - 0.5)); }
const periods = Array.from({ length: 2000 }, (_, k) => 2 + k * 0.001);
const pj = blsJs(tt, yy, null, periods, 0.08, [0.08, 0.12]), pw = blsWasm(instance, tt, yy, null, periods, 0.08, [0.08, 0.12]);
const bj = pj.indexOf(Math.max(...pj)), bw = pw.indexOf(Math.max(...pw));
console.log('BLS js best P', periods[bj].toFixed(3), 'wasm best P', periods[bw].toFixed(3), 'max diff', maxdiff(pj, pw));
