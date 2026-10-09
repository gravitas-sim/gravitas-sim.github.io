// Part 3 of THRESHOLDS.md: the Hubble-diagram fit through the inference core.
//   node hubble-fit.mjs fit        everything except the coverage run
//   node hubble-fit.mjs coverage   the 200-seed coverage run (minutes)
// Imports js/inference/* read-only. Output: results/hubble-fit.json, results/coverage.json
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { here, undelta, mean, rel, writeResult } from './lib.mjs';
import { createCosmology, C_KMS } from './flrw.mjs';
import { createProblem, refine, covarianceAt, profile, crossing } from '../../js/inference/fit.js';
import { POLY_1 } from '../../js/inference/models.js';

const d = JSON.parse(readFileSync(`${here}derived/des-sn5yr-hd.json`, 'utf8'));
const z = Float64Array.from(undelta(d.z).map(v => v * 1e-5));
const mu = Float64Array.from(d.mu.map(v => v * 1e-4));
const err = Float64Array.from(d.err.map(v => v * 1e-4));
const N = z.length;

// y = mu(z; Om, H0) [+ offset solved exactly when `offset`], flat.
const sn = offset => ({
  id: 'flat-lcdm-sn',
  version: 'spike',
  parameters: [{ name: 'Om' }, { name: 'H0' }],
  predict(v, x) {
    const c = createCosmology({ H0: v.H0, Om: v.Om, OL: 1 - v.Om });
    const out = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = c.distanceModulus(x[i]);
    return out;
  },
  solveLinear: offset
    ? (data, w, shape) => {
        let sw = 0, s = 0;
        for (let i = 0; i < shape.length; i++) { sw += w[i]; s += w[i] * (data.y[i] - shape[i]); }
        const off = s / sw;
        return { fit: shape.map(v => v + off), linear: { offset: off } };
      }
    : (data, w, shape) => ({ fit: shape, linear: {} }),
});
const P = (name, value, lo, hi, mode = 'fitted') => ({ name, mode, value, lo, hi });
const data = { x: z, y: mu, sigma: err };
const out = { N, thresholds: 'spike/cosmo/THRESHOLDS.md Part 3' };

if (process.argv[2] === 'fit') {
  // 1. Linear, low z.
  const lz = [...z.keys()].filter(i => z[i] < 0.1);
  const lx = Float64Array.from(lz.map(i => Math.log10(C_KMS * z[i])));
  const ly = Float64Array.from(lz.map(i => mu[i] - 5 * Math.log10(C_KMS * z[i])));
  const ls = Float64Array.from(lz.map(i => err[i]));
  const lin = createProblem(POLY_1, { x: lx, y: ly, sigma: ls }, [P('c0', 15, 0, 30), P('c1', 0, -1, 1, 'fixed')], { x0: 0 });
  const lr = refine(lin, [15]);
  const c0 = lr.theta[0];
  const H0lin = 10 ** ((25 - c0) / 5);
  const ref = JSON.parse(readFileSync(`${here}results/lowz-ref.json`, 'utf8'));
  const free = createProblem(POLY_1, { x: lx, y: Float64Array.from(lz.map(i => mu[i])), sigma: ls }, [P('c0', 15, 0, 30), P('c1', 5, 0, 10)], { x0: 0 });
  const fr = refine(free, [15, 5]);
  out.linearLowZ = { n: lz.length, c0, H0: H0lin, refH0: ref.H0, relDiffH0: rel(H0lin, ref.H0), freeSlope: fr.theta[1], refFreeSlope: ref.freeSlope.slope };

  // 2. Full fit, M fixed: Om and H0 free; three starts.
  const A = createProblem(sn(false), data, [P('Om', 0.3, 0, 1), P('H0', 70, 50, 90)]);
  const starts = [[0.1, 60], [0.3, 70], [0.7, 80]];
  const runs = starts.map(s => { const t0 = performance.now(); const r = refine(A, s); return { start: s, theta: r.theta, chi2: r.best.chi2, converged: r.converged, iterations: r.iterations, ms: performance.now() - t0 }; });
  const best = runs.reduce((a, b) => (b.chi2 < a.chi2 ? b : a));
  const cov = covarianceAt(A, best.theta);
  out.fullFitMFixed = { runs, chi2Spread: Math.max(...runs.map(r => r.chi2)) - Math.min(...runs.map(r => r.chi2)), best: best.theta, chi2: best.chi2, dof: N - 2, sigma: cov.sigma, correlation: cov.correlation, covariancePositiveDefinite: Boolean(cov.covariance) };

  // 3. Om with the offset solved (H0 held at 70): the published-comparison fit and the profile.
  const B = createProblem(sn(true), data, [P('Om', 0.3, 0, 1), P('H0', 70, 50, 90, 'fixed')]);
  const t0 = performance.now();
  const rb = refine(B, [0.3]);
  const fitMs = performance.now() - t0;
  const grid = Array.from({ length: 39 }, (_, i) => 0.025 * (i + 1));
  const prof = profile(B, rb.theta, 0, [...grid, rb.theta[0]]);
  const [lo, hi] = crossing(prof, rb.best.chi2, 1);
  const covB = covarianceAt(B, rb.theta);
  out.omFlatOffsetSolved = { Om: rb.theta[0], offset: rb.best.linear.offset, chi2: rb.best.chi2, dof: N - 2, sigmaLinear: covB.sigma[0], profile68: [lo, hi], published: { Om: 0.352, err: 0.017, ref: 'DES Collaboration 2024, ApJL 973, L14 (flat LCDM, SN only, stat+sys)' }, diffFromPublished: rb.theta[0] - 0.352, fitMs };

  // 4. The degeneracy: H0 free beside a solved offset.
  const D = createProblem(sn(true), data, [P('Om', 0.3, 0, 1), P('H0', 70, 50, 90)]);
  const rd = refine(D, [0.3, 70]);
  const covD = covarianceAt(D, rd.theta);
  const hgrid = [50, 55, 60, 65, 70, 75, 80, 85, 90];
  const DH = createProblem(sn(true), data, [P('Om', 0.3, 0, 1), P('H0', 70, 50, 90)]);
  const ph = profile(DH, rd.theta, 1, hgrid);
  const chis = ph.map(p => p.chi2);
  out.degeneracy = { covarianceNull: covD.covariance === null, theta: rd.theta, profileOverH0: ph.map(p => [p.value, p.chi2]), profileRangeChi2: Math.max(...chis) - Math.min(...chis) };

  // 5. Cost of a complete fit (best of the three starts above).
  out.fullFitMs = runs.map(r => r.ms);
  writeResult('hubble-fit', out);
  console.log(JSON.stringify({ linear: out.linearLowZ, full: { best: out.fullFitMFixed.best, chi2: out.fullFitMFixed.chi2, spread: out.fullFitMFixed.chi2Spread, corr: out.fullFitMFixed.correlation, pd: out.fullFitMFixed.covariancePositiveDefinite, ms: out.fullFitMs }, om: out.omFlatOffsetSolved, deg: { null: out.degeneracy.covarianceNull, range: out.degeneracy.profileRangeChi2 } }, null, 1));
}

if (process.argv[2] === 'coverage') {
  const seeds = +(process.argv[3] ?? 200);
  const mulberry = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const truth = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
  const mu0 = Float64Array.from(z, v => truth.distanceModulus(v));
  const grid = Array.from({ length: 19 }, (_, i) => 0.05 * (i + 1));
  let covered = 0, finite = 0, done = 0;
  const bias = [];
  const t0 = performance.now();
  for (let s = 0; s < seeds; s++) {
    const rnd = mulberry(1000 + s);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const y = Float64Array.from(mu0, (v, i) => v + 0.1 + err[i] * gauss()); // 0.1 mag offset, unknown to the fit
    const prob = createProblem(sn(true), { x: z, y, sigma: err }, [P('Om', 0.3, 0, 1), P('H0', 70, 50, 90, 'fixed')]);
    const r = refine(prob, [0.3]);
    const prof = profile(prob, r.theta, 0, [...grid, r.theta[0]]);
    const [lo, hi] = crossing(prof, r.best.chi2, 1);
    done++;
    bias.push(r.theta[0] - 0.3);
    if (lo !== null && hi !== null) { finite++; if (lo <= 0.3 && 0.3 <= hi) covered++; }
    if (s % 10 === 9) console.log(s + 1, covered, finite, ((performance.now() - t0) / 1000).toFixed(0) + 's');
  }
  writeResult('coverage', { seeds: done, finiteIntervals: finite, covered, coverage: covered / done, coverageAmongFinite: covered / Math.max(1, finite), meanBias: mean(bias), threshold: [0.6, 0.76], pass: covered / done >= 0.6 && covered / done <= 0.76, seconds: (performance.now() - t0) / 1000 });
  console.log('coverage', covered, done, covered / done);
}
