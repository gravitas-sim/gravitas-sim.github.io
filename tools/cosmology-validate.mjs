#!/usr/bin/env node
// Prints the cosmology validation tables COSMOLOGY.md quotes: the kernel against
// the 900-point references, the Mattig family against a 60-digit evaluation's
// bar, the DES fit, the H0 degeneracy, and the 200-seed recovery of Omega_m
// from synthetic Hubble diagrams. The bars are COSMOLOGY_GATE.md's; the same
// checks run in tests/cosmologyKernel.test.js and tests/cosmologyFit.test.js.
//   node tools/cosmology-validate.mjs [seeds]
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createCosmology,
  fitSupernovae,
  h0Degeneracy,
} from '../js/kernels/cosmology/index.js';
import { runForward } from '../js/forward/index.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = JSON.parse(
  readFileSync(path.join(REPO, 'tests/fixtures/cosmology-refs.json'), 'utf8')
);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const KEYS = [
  ['dc', 'comovingDistance'],
  ['dm', 'transverseComovingDistance'],
  ['dl', 'luminosityDistance'],
  ['da', 'angularDiameterDistance'],
  ['lb', 'lookbackTime'],
];
let a = 0;
let q = 0;
for (const r of refs.rows) {
  const c = createCosmology({ H0: r.H0, Om: r.Om, OL: r.OL });
  for (const [k, fn] of KEYS) {
    const v = c[fn](r.z);
    a = Math.max(a, rel(v, r.astropy[k]));
    q = Math.max(q, rel(v, r.quad[k]));
  }
}
console.log(
  `kernel, ${refs.rows.length} points x 5 quantities: worst ${a.toExponential(2)} from astropy (bar 1e-6), ${q.toExponential(2)} from quadrature (bar 1e-9)`
);
const zs = Array.from({ length: 1000 }, (_, i) => 0.001 + (i * 2) / 1000);
const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
const t = [];
for (let k = 0; k < 31; k++) {
  const t0 = performance.now();
  for (const z of zs) c.luminosityDistance(z);
  t.push(performance.now() - t0);
}
t.sort((x, y) => x - y);
console.log(`1,000 luminosity distances: median ${t[15].toFixed(2)} ms of 31`);

const { loadCosmologyData } = await import('../js/cosmologyData.js');
const data = await loadCosmologyData(async u => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(path.join(REPO, u), 'utf8')),
}));
const s = data.supernovae;
const t0 = performance.now();
const fit = fitSupernovae({ x: s.z, y: s.mu, sigma: s.err });
console.log(
  `DES-SN5YR flat fit: Omega_m ${fit.Om.toFixed(4)}, 68% ${fit.omInterval.map(v => v.toFixed(3)).join(' to ')}, chi2 ${fit.chi2.toFixed(1)} / ${fit.dof}, ${(performance.now() - t0).toFixed(0)} ms (published 0.352 +- 0.017, full covariance)`
);
const deg = h0Degeneracy(
  { x: s.z, y: s.mu, sigma: s.err },
  [50, 60, 70, 80, 90]
);
console.log(
  `chi-square over H0 50 to 90 with the offset free: range ${deg.range.toExponential(2)}`
);

const seeds = Number(process.argv[2] ?? 200);
const state = { cosmology: { H0: 70, Om: 0.3, OL: 0.7 }, offset: 0.1 };
let covered = 0;
const bias = [];
for (let k = 0; k < seeds; k++) {
  const o = runForward('hubble-diagram', state, {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: `rec-${k}`,
    instrument: {
      kind: 'catalogue',
      survey: { count: 200, zMin: 0.02, zMax: 1.0, sigmaMag: 0.15 },
    },
  });
  const col = id => o.columns.find(x => x.id === id).values;
  const f = fitSupernovae(
    { x: col('z'), y: col('mu'), sigma: col('mu-sigma') },
    { grid: 12 }
  );
  bias.push(f.Om - 0.3);
  const [lo, hi] = f.omInterval;
  if (lo !== null && hi !== null && lo <= 0.3 && 0.3 <= hi) covered++;
}
const mean = bias.reduce((x, y) => x + y, 0) / seeds;
console.log(
  `recovery, ${seeds} seeds of 200 supernovae: Omega_m bias ${mean.toFixed(4)}, 68% interval covers ${covered} of ${seeds} (${((100 * covered) / seeds).toFixed(1)}%; bar 60 to 76%)`
);
