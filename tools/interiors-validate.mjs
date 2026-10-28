#!/usr/bin/env node
// =============================================================================
// The interiors kernel's Part A against its committed thresholds (Prompt 203)
// -----------------------------------------------------------------------------
//   npm run interiors:validate               print the table
//   npm run interiors:validate -- --json     print it as JSON
//
// tests/fixtures/interiors/thresholds.json fixed every bound before
// js/kernels/interiors/ had been run (INTERIORS.md, "The validation contract").
// This runs the checks against the production module and judges them against
// those bounds, read from the file. The oracle's rows read the results pinned
// in tests/fixtures/interiors/oracle-results.json (numpy and astropy constants;
// no Gravitas code).
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../js/rng.js';
import * as K from '../js/kernels/interiors/index.js';
import { compareWithMeasured } from '../js/kernels/atmospheres/index.js';
import { makeInputs } from './interiors-oracle/inputs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/interiors');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const ORACLE = read('oracle-results.json');
const INPUTS = makeInputs();
const C = Object.fromEntries(THRESHOLDS.checks.map(c => [c.id, c]));
const AN = THRESHOLDS.anchors;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const rel = (a, b) => (a === b ? 0 : Math.abs(a - b) / Math.abs(b));
const maxRel = pairs => pairs.reduce((m, [a, b]) => Math.max(m, rel(a, b)), 0);

function closedForms() {
  const l = C['a1.closed'].limits;
  const vals = [];
  const sigs = [];
  INPUTS.points.forEach((p, i) => {
    const o = ORACLE.points[i];
    const s = { gm: p.sgm, radius: p.sr };
    const d = K.bulkDensity({ gm: p.gm, radius: p.radius, sigma: s });
    const g = K.surfaceGravity({ gm: p.gm, radius: p.radius, sigma: s });
    const v = K.escapeSpeed({ gm: p.gm, radius: p.radius, sigma: s });
    vals.push([d.value, o.density], [g.value, o.gravity], [v.value, o.escape]);
    sigs.push(
      [d.sigma, o.densitySigma],
      [g.sigma, o.gravitySigma],
      [v.sigma, o.escapeSigma]
    );
  });
  const ve = maxRel(vals);
  const se = maxRel(sigs);
  row(
    'a1.values',
    ve,
    l.valueRelMax,
    ve <= l.valueRelMax,
    `${INPUTS.points.length} seeded points against numpy and astropy's G`
  );
  row(
    'a1.sigmas',
    se,
    l.sigmaRelMax,
    se <= l.sigmaRelMax,
    'first-order uncertainties against complex-step derivatives'
  );
  const mass = K.massFromGm({ gm: 398600.4418, sigma: { gm: 0.0008 } });
  row(
    'a1.mass',
    mass.value,
    null,
    Math.abs(mass.value / 5.9722e24 - 1) < 1e-3,
    'Earth 5.972e24 kg'
  );
}

function anchors() {
  const l = C['a2.anchors'].limits;
  const dens = [],
    grav = [],
    esc = [];
  for (const id of K.PLANET_IDS) {
    const b = K.bulkOf(id);
    dens.push([b.density.value, AN.densityKgM3[id]]);
    grav.push([b.gravity.value, AN.gravityMS2[id]]);
    esc.push([b.escapeSpeed.value / 1e3, AN.escapeKmS[id]]);
  }
  const d = maxRel(dens),
    g = maxRel(grav),
    e = maxRel(esc);
  row(
    'a2.density',
    d,
    l.densityRelMax,
    d <= l.densityRelMax,
    'nine bodies against the fact sheet (volumetric mean radius)'
  );
  row(
    'a2.gravity',
    g,
    l.gravityRelMax,
    g <= l.gravityRelMax,
    'GM / R^2 with the equatorial radius, as the fact sheet lists it'
  );
  row(
    'a2.escape',
    e,
    l.escapeRelMax,
    e <= l.escapeRelMax,
    'the fact sheet rounds to two figures'
  );
  const lm = C['a3.mean-radius'].limits;
  const worst = ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(
    id => {
      const r = K.PLANETS[id].radius;
      const v = Math.cbrt(r.equatorial[0] ** 2 * r.polar[0]);
      return rel(v, r.mean[0]);
    }
  );
  const w = Math.max(...worst);
  row(
    'a3.mean-radius',
    w,
    lm.relMax,
    w <= lm.relMax,
    '(a^2 b)^(1/3) from the equatorial and polar radii'
  );
}

function temperatures() {
  const l = C['a4.teq'].limits;
  const bb = AN.blackbodyK;
  const m = maxRel(
    Object.keys(bb).map(id => [K.equilibriumOf(id).temperature, bb[id]])
  );
  row(
    'a4.teq',
    m,
    l.relMax,
    m <= l.relMax,
    'Mercury, the Moon and Saturn against the fact sheet black-body temperatures'
  );
  const six = ['venus', 'earth', 'mars', 'jupiter', 'uranus', 'neptune'].map(
    id => [K.equilibriumOf(id).temperature, compareWithMeasured(id).emissionK]
  );
  const p = maxRel(six);
  row(
    'a4.pack',
    p,
    l.packRelMax,
    p <= l.packRelMax,
    'the six bodies of the Prompt 200 pack: one source of truth'
  );
}

function classes() {
  const l = C['a5.classes'].limits;
  const cls = id => K.bulkOf(id).class;
  const rocky = ['mercury', 'venus', 'earth', 'moon', 'mars'].every(
    id => cls(id).class === 'rocky'
  );
  const gas = ['jupiter', 'saturn', 'uranus', 'neptune'].every(
    id => cls(id).class === 'volatile-rich'
  );
  const jd = K.bulkOf('jupiter').density.value;
  const ud = K.bulkOf('uranus').density.value;
  const same = rel(jd, ud) <= l.indistinguishableRel;
  const amb =
    K.compositionClass({ density: 3010, sigma: 10 }).ambiguous &&
    !K.compositionClass({ density: 3500, sigma: 10 }).ambiguous;
  row(
    'a5.classes',
    Number(rocky && gas && same && amb),
    1,
    rocky && gas && same && amb,
    `Jupiter ${jd.toFixed(0)} and Uranus ${ud.toFixed(0)} kg/m3 differ by ${(100 * rel(jd, ud)).toFixed(1)} percent`
  );
}

function propagation() {
  const l = C['b1.propagation'].limits;
  const pairs = [];
  for (const id of K.PLANET_IDS) {
    const b = K.bulkOf(id);
    const m = ORACLE.monteCarlo[id];
    pairs.push(
      [b.density.sigma, m.density],
      [b.gravity.sigma, m.gravity],
      [b.escapeSpeed.sigma, m.escape]
    );
  }
  const e = maxRel(pairs);
  row(
    'b1.propagation',
    e,
    l.relMax,
    e <= l.relMax,
    `${ORACLE.monteCarlo.earth ? l.draws : 0} numpy draws per body`
  );
  const cl = C['b2.uncompressed'].limits;
  const diffs = Object.keys(K.UNCOMPRESSED).map(id => {
    const c = K.compressionCorrection(id);
    const bulk = K.bulkOf(id).density;
    return [
      [c.correction, bulk.value - K.UNCOMPRESSED[id]],
      [c.sigma, Math.hypot(bulk.sigma, cl.declaredSigmaKgM3)],
    ];
  });
  const e2 = maxRel(diffs.flat());
  const pos = Object.keys(K.UNCOMPRESSED).every(
    id => K.compressionCorrection(id).correction > 0
  );
  row(
    'b2.uncompressed',
    e2,
    cl.relMax,
    e2 <= cl.relMax && pos,
    'correction and its uncertainty; bulk exceeds uncompressed for all five'
  );
}

function coverage() {
  const l = C['c1.coverage'].limits;
  const rnd = mulberry32(2032);
  const N = () =>
    Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-300))) *
    Math.cos(2 * Math.PI * rnd());
  let worst1 = [1, 0],
    worst2 = [1, 0];
  let lo1 = 1,
    hi1 = 0,
    lo2 = 1,
    hi2 = 0;
  for (const id of K.PLANET_IDS) {
    const b = K.PLANETS[id];
    const rEq = b.radius.equatorial;
    const rMean = b.radius.mean;
    const trials = l.trials;
    const hit = { d: [0, 0], g: [0, 0], v: [0, 0] };
    for (let i = 0; i < trials; i++) {
      const gmT = b.gm[0],
        gT = K.G + K.G_SIGMA * N();
      const gmO = gmT + b.gm[1] * N();
      const rMO = rMean[0] + rMean[1] * N();
      const rEO = rEq[0] + rEq[1] * N();
      const dO = K.bulkDensity({
        gm: gmO,
        radius: rMO,
        sigma: { gm: b.gm[1], radius: rMean[1] },
      });
      const dT = (3 * gmT * 1e9) / (4 * Math.PI * gT * (rMean[0] * 1e3) ** 3);
      const gO = K.surfaceGravity({
        gm: gmO,
        radius: rEO,
        sigma: { gm: b.gm[1], radius: rEq[1] },
      });
      const gTv = (gmT * 1e9) / (rEq[0] * 1e3) ** 2;
      const vO = K.escapeSpeed({
        gm: gmO,
        radius: rEO,
        sigma: { gm: b.gm[1], radius: rEq[1] },
      });
      const vT = Math.sqrt((2 * gmT * 1e9) / (rEq[0] * 1e3));
      for (const [k, o, t] of [
        ['d', dO, dT],
        ['g', gO, gTv],
        ['v', vO, vT],
      ]) {
        const z = Math.abs(o.value - t) / o.sigma;
        if (z <= 1) hit[k][0]++;
        if (z <= 2) hit[k][1]++;
      }
    }
    for (const k of ['d', 'g', 'v']) {
      const r1 = hit[k][0] / trials,
        r2 = hit[k][1] / trials;
      lo1 = Math.min(lo1, r1);
      hi1 = Math.max(hi1, r1);
      lo2 = Math.min(lo2, r2);
      hi2 = Math.max(hi2, r2);
    }
  }
  void worst1;
  void worst2;
  const ok1 = lo1 >= l.oneSigma[0] && hi1 <= l.oneSigma[1];
  const ok2 = lo2 >= l.twoSigma[0] && hi2 <= l.twoSigma[1];
  row(
    'c1.oneSigma',
    `${lo1.toFixed(3)} to ${hi1.toFixed(3)}`,
    l.oneSigma,
    ok1,
    `${K.PLANET_IDS.length * 3} cells of ${l.trials} trials`
  );
  row(
    'c1.twoSigma',
    `${lo2.toFixed(3)} to ${hi2.toFixed(3)}`,
    l.twoSigma,
    ok2,
    'every cell'
  );
}

function refusals() {
  const l = C['d1.refusals'].limits;
  const good = { gm: 398600, radius: 6371 };
  const cases = [
    K.bulkDensity({ ...good, gm: 0 }),
    K.bulkDensity({ ...good, gm: -1 }),
    K.bulkDensity({ ...good, gm: NaN }),
    K.bulkDensity({ ...good, radius: 0 }),
    K.bulkDensity({ ...good, radius: -5 }),
    K.bulkDensity({ ...good, radius: Infinity }),
    K.bulkDensity({ gm: '398600', radius: 6371 }),
    K.bulkDensity({ gm: null, radius: 6371 }),
    K.bulkDensity({ ...good, sigma: { gm: -1 } }),
    K.bulkDensity({ ...good, sigma: { radius: NaN } }),
    K.bulkDensity({ ...good, sigma: { radius: 7000 } }),
    K.surfaceGravity({ ...good, radius: 0 }),
    K.surfaceGravity({ ...good, sigma: { gm: -2 } }),
    K.escapeSpeed({ ...good, gm: -3 }),
    K.escapeSpeed({ ...good, radius: NaN }),
    K.massFromGm({ gm: 0 }),
    K.massFromGm({ gm: 5, sigma: { gm: -1 } }),
    K.compositionClass({ density: 0 }),
    K.compositionClass({ density: NaN }),
    K.compositionClass({ density: 3000, sigma: -1 }),
    K.bulkOf('pluto'),
    K.bulkOf(undefined),
    K.bulkOf('earth', { gravityRadius: 'hexagonal' }),
    K.bulkOf('venus', { gravityRadius: 'polar' }),
    K.compareBodies([]),
    K.compareBodies(['earth', 'earth']),
    K.compareBodies(['earth', 'nowhere']),
    K.compareBodies('earth'),
    K.compressionCorrection('jupiter'),
    K.compressionCorrection('pluto'),
    K.equilibriumOf('pluto'),
  ];
  const ok = cases.filter(
    c =>
      c.refused === true && typeof c.code === 'string' && c.value === undefined
  );
  row(
    'd1.refusals',
    ok.length,
    l.count,
    ok.length >= l.count && ok.length === cases.length,
    `${cases.length} hostile inputs, each refused with a named code`
  );
}

function stated() {
  row(
    'c.provenance',
    Number(
      K.BULK_PROVENANCE.checked === false &&
        K.BULK_PROVENANCE.retrieved === null
    ),
    1,
    K.BULK_PROVENANCE.checked === false && K.BULK_PROVENANCE.retrieved === null,
    'typed, not retrieved, unchecked'
  );
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  closedForms();
  anchors();
  temperatures();
  classes();
  propagation();
  coverage();
  refusals();
  stated();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = runValidation();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v =
        typeof r.measured === 'number'
          ? Number(r.measured).toPrecision(4)
          : String(r.measured);
      const b =
        r.bound === null || r.bound === undefined
          ? ''
          : JSON.stringify(r.bound);
      process.stdout.write(
        `${(r.pass ? 'pass' : 'FAIL').padEnd(6)}${r.id.padEnd(20)}${v.padEnd(18)}${b.padEnd(14)} ${r.note}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing of ${out.length}, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
