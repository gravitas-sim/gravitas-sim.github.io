#!/usr/bin/env node
// =============================================================================
// The orbit-fit gate (Prompt 187, Part A; ORBIT_FIT_GATE.md)
// -----------------------------------------------------------------------------
//   node tools/orbit-fit-gate.mjs            run the committed test set, print the table
//   node tools/orbit-fit-gate.mjs --json     print it as JSON
//   node tools/orbit-fit-gate.mjs --dev      the development stream, 60 trials a cell (no verdict is a result)
//
// tests/fixtures/orbit-fit/gate-thresholds.json fixed the criterion, the test set,
// every leg's bound and the verdict function before the fitter was run. This runs
// the committed test set through js/measure/orbit-fit.js and judges each leg
// against those bounds, read from the file and not copied.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CRITERION, fitOrbit } from '../js/measure/orbit-fit.js';
import { stream } from '../js/random/streams.js';
import {
  canonical,
  jitteredYears,
  makeOrbitSeries,
  randomOrbit,
} from './orbit-fit-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/orbit-fit');
export const GATE = JSON.parse(
  readFileSync(path.join(FIX, 'gate-thresholds.json'), 'utf8')
);
const T = GATE.testSet;
const L = GATE.legs;
const Z68 = 1;
const Z95 = 1.959963984540054;

const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
/** Does [lo, hi] (a null end is open) hold v? */
const holds = (iv, v) =>
  iv !== null &&
  (iv[0] === null || v >= iv[0]) &&
  (iv[1] === null || v <= iv[1]);

/** One cell: `trials` orbits of `e` range observed over `arc` periods and fitted at `depth`. */
function cell({ depth, e, arc, trials, label }) {
  const u = stream('noise', T.stream, label);
  const out = {
    depth,
    arc,
    trials,
    accepted: 0,
    refused: {},
    detected: 0,
    cover: { P: [0, 0], a: [0, 0], a3overP2: [0, 0] },
    relP: [],
    relA: [],
  };
  for (let k = 0; k < trials; k++) {
    const truth = randomOrbit(u, {
      e,
      cosI: T.cosI,
      a: T.semiMajorAxisArcsec,
      P: T.periodYears,
    });
    const years = jitteredYears(
      2000,
      arc * truth.P,
      T.epochs,
      u,
      T.jitterFractionOfSpacing
    );
    const series = makeOrbitSeries(truth, years, {
      sigma: T.noiseFractionOfA * truth.a,
      seed: `${label}:${k}`,
      label: T.stream,
    });
    const r = fitOrbit(series, { depth });
    if (!r.ok) {
      out.refused[r.code] = (out.refused[r.code] ?? 0) + 1;
      continue;
    }
    out.accepted++;
    if (r.eccentricity?.detected) out.detected++;
    const el = r.elements;
    const c68 = (iv, v) => holds(iv, v);
    const lnK3 = Math.log(el.a.value ** 3 / el.P.value ** 2);
    const trueLnK3 = Math.log(truth.a ** 3 / truth.P ** 2);
    const sK = r.gradients.sigmaLnK3;
    const tally = (key, in68, in95) => {
      out.cover[key][0] += in68 ? 1 : 0;
      out.cover[key][1] += in95 ? 1 : 0;
    };
    tally('P', c68(el.P.interval68, truth.P), c68(el.P.interval95, truth.P));
    tally(
      'a',
      Math.abs(el.a.value - truth.a) <= Z68 * el.a.sigma,
      Math.abs(el.a.value - truth.a) <= Z95 * el.a.sigma
    );
    tally(
      'a3overP2',
      Math.abs(lnK3 - trueLnK3) <= Z68 * sK,
      Math.abs(lnK3 - trueLnK3) <= Z95 * sK
    );
    out.relP.push(Math.abs(el.P.value - truth.P) / truth.P);
    out.relA.push(Math.abs(el.a.value - truth.a) / truth.a);
    void canonical;
  }
  out.refusalRate = (trials - out.accepted) / trials;
  out.acceptRate = out.accepted / trials;
  out.coverage = Object.fromEntries(
    Object.entries(out.cover).map(([k, [c1, c2]]) => [
      k,
      out.accepted ? { s1: c1 / out.accepted, s95: c2 / out.accepted } : null,
    ])
  );
  out.medianRelP = median(out.relP);
  out.medianRelA = median(out.relA);
  delete out.relP;
  delete out.relA;
  return out;
}

export function runGate({ dev = false } = {}) {
  const trials = dev ? 60 : T.trialsPerCell;
  const tag = dev ? 'dev' : 'gate';
  const cells = { circular: {}, elliptical: {} };
  for (const depth of ['circular', 'elliptical'])
    for (const arc of T.arcs)
      cells[depth][arc] = cell({
        depth,
        e: depth === 'circular' ? [0, 0] : T.eccentric,
        arc,
        trials,
        label: `${tag}:${depth}:${arc}`,
      });
  const g5 = cell({
    depth: 'circular',
    e: T.misspecified,
    arc: L.G5.arc,
    trials,
    label: `${tag}:misspec:${L.G5.arc}`,
  });
  const g6 = cell({
    depth: 'elliptical',
    e: [0, 0],
    arc: L.G6.arc,
    trials,
    label: `${tag}:nested:${L.G6.arc}`,
  });
  const legs = {};
  for (const depth of ['circular', 'elliptical']) {
    const C = cells[depth];
    const lg = (legs[depth] = {});
    lg.G1 = {
      measured: Object.fromEntries(
        Object.keys(L.G1.refuseAt).map(f => [f, C[f].refusalRate])
      ),
      pass: Object.entries(L.G1.refuseAt).every(
        ([f, b]) => C[f].refusalRate >= b
      ),
    };
    lg.G2 = {
      measured: Object.fromEntries(
        Object.keys(L.G2.acceptAt).map(f => [f, C[f].acceptRate])
      ),
      pass: Object.entries(L.G2.acceptAt).every(
        ([f, b]) => C[f].acceptRate >= b
      ),
    };
    const g3 = {};
    let g3pass = true;
    for (const f of L.G3.arcs) {
      const c = C[f];
      if (c.accepted < L.G3.minAccepted) {
        g3[f] = { accepted: c.accepted, note: 'arc refused; recorded and passes' };
        continue;
      }
      g3[f] = { accepted: c.accepted };
      for (const q of L.G3.quantities) {
        const cv = c.coverage[q];
        const ok1 = inBand(cv.s1, L.G3.coverage1sigma);
        const ok2 = inBand(cv.s95, L.G3.coverage95);
        g3[f][q] = { s1: cv.s1, s95: cv.s95, pass: ok1 && ok2 };
        g3pass = g3pass && ok1 && ok2;
      }
    }
    lg.G3 = { measured: g3, pass: g3pass };
    const c4 = C[L.G4.arc];
    lg.G4 = {
      measured: { medianRelP: c4.medianRelP, medianRelA: c4.medianRelA },
      pass:
        c4.medianRelP !== null &&
        c4.medianRelP <= L.G4.medianRelP &&
        c4.medianRelA <= L.G4.medianRelA,
    };
  }
  legs.circular.G5 = {
    measured: g5.refusalRate,
    pass: g5.refusalRate >= L.G5.refuseAtLeast,
  };
  legs.elliptical.G6 = {
    measured: g6.detected / trials,
    pass: g6.detected / trials <= L.G6.detectedAtMost,
  };
  const ell = legs.elliptical;
  const circ = legs.circular;
  const ellPass = ['G1', 'G2', 'G3', 'G4', 'G6'].every(k => ell[k].pass);
  const circPass = ['G1', 'G2', 'G3', 'G4', 'G5'].every(k => circ[k].pass);
  const at110 = ['G2', 'G3', 'G4'].every(k => ell[k].pass);
  let verdict;
  let detail;
  if (ellPass) {
    verdict = 'A';
    detail = circPass
      ? 'elliptical and circular both ship'
      : 'elliptical ships; circular does not pass its legs and is absent';
  } else if (circPass) {
    verdict = 'B';
    detail = at110
      ? 'circular ships; elliptical only at a full period or more (110 percent)'
      : 'circular ships; elliptical does not';
  } else {
    verdict = 'C';
    detail = 'neither model passes: no orbit fitting';
  }
  return { cells, g5, g6, legs, verdict, detail, trials, tag, criterion: CRITERION };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dev = process.argv.includes('--dev');
  const t0 = Date.now();
  const res = runGate({ dev });
  res.seconds = (Date.now() - t0) / 1000;
  if (process.argv.includes('--write'))
    writeFileSync(
      path.join(FIX, 'gate-results.json'),
      JSON.stringify(res, null, 2) + '\n'
    );
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    const f = v => (typeof v === 'number' ? v.toFixed(3) : v);
    for (const depth of ['circular', 'elliptical'])
      for (const arc of T.arcs) {
        const c = res.cells[depth][arc];
        console.log(
          `${depth.padEnd(10)} arc ${String(arc).padEnd(4)} accepted ${f(c.acceptRate)} refused ${JSON.stringify(c.refused)} cover(P,a,K3 1s) ${['P', 'a', 'a3overP2'].map(q => (c.coverage[q] ? f(c.coverage[q].s1) : '-')).join('/')}  medRel(P,a) ${f(c.medianRelP)}/${f(c.medianRelA)}`
        );
      }
    console.log('G5 circular on eccentric: refusal', f(res.g5.refusalRate), JSON.stringify(res.g5.refused));
    console.log('G6 elliptical on circular: detected', res.g6.detected, 'of', res.trials, 'accepted', res.g6.accepted);
    for (const depth of ['circular', 'elliptical'])
      console.log(depth, Object.entries(res.legs[depth]).map(([k, v]) => `${k}:${v.pass ? 'pass' : 'FAIL'}`).join(' '));
    console.log(`verdict ${res.verdict}: ${res.detail} (${res.seconds.toFixed(0)} s, ${res.tag})`);
  }
}
