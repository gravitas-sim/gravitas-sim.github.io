#!/usr/bin/env node
// =============================================================================
// The eclipsing-binary model against its committed thresholds (Prompt 217)
// -----------------------------------------------------------------------------
//   npm run binaries:validate                    print the table
//   npm run binaries:validate -- --json          print it as JSON
//   npm run binaries:validate -- --write-failed  rewrite tests/fixtures/binaries/failed-legs.json
//   npm run binaries:validate -- --write-results rewrite tests/fixtures/binaries/results.json (the table as measured)
//   npm run binaries:validate -- --only=A1,B1    run the rows whose id starts with one of these
//   npm run binaries:validate -- --fits=<path>   the V505 Per light curve for E1 (else NOT RUN)
//
// tests/fixtures/binaries/thresholds.json fixed every bound before js/inference/binaries.js
// existed; this runs the checks against the kernel and the inference model and judges
// them against the bounds read from that file. The oracle rows read the results pinned
// in tests/fixtures/binaries/oracle-results.json (tools/binaries-oracle/oracle.py: batman
// and a brute-force quadrature, no Gravitas code). A crossed bound is a failed row, left
// failing in tests/fixtures/binaries/failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  eclipseFlux,
  contacts,
  secondaryTime,
  secondaryPhase,
  ecoswFromPhase,
  derivedQuantities,
  lightRatio,
  residualsFail,
} from '../js/inference/binaries.js';
import { fitOnce, profileTask } from '../js/inference/infer.js';
import { syntheticEclipse } from '../js/inference/synthetic.js';
import { readFits } from './data-packs/fits.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/binaries/thresholds.json');
const ORA = read('tests/fixtures/binaries/oracle-results.json');
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const RAD = Math.PI / 180;
const maxAbs = (a, b) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
const grid = (s, n) =>
  Float64Array.from({ length: n }, (_, j) => s.tc + (s.P * j) / n);
const sys = name => THR.systems[name];

// ---- an independent orbit, for the contacts: Kepler by bisection, position vectors ------

function indepSeparation(s, t) {
  const e = Math.hypot(s.ecosw, s.esinw);
  const w = e > 0 ? Math.atan2(s.esinw, s.ecosw) : Math.PI / 2;
  const r1 = s.rsum / (1 + s.k);
  const r2 = s.k * r1;
  const tanHalf = f => Math.tan(f / 2);
  const toE = f => 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * tanHalf(f));
  const Mc = (() => {
    const E = toE(Math.PI / 2 - w);
    return E - e * Math.sin(E);
  })();
  let M = Mc + (2 * Math.PI * (t - s.tc)) / s.P;
  M -= 2 * Math.PI * Math.floor(M / (2 * Math.PI));
  let lo = 0;
  let hi = 2 * Math.PI;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (mid - e * Math.sin(mid) < M) lo = mid;
    else hi = mid;
  }
  const E = (lo + hi) / 2;
  const f =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  const r = (1 - e * e) / (1 + e * Math.cos(f));
  const X = -r * Math.cos(w + f);
  const Y = -r * Math.sin(w + f) * Math.cos(s.inc * RAD);
  return { d: Math.hypot(X, Y), reach: r1 + r2 };
}

// ---- (a) analytic ---------------------------------------------------------------------

const simpson = (f, a, b, n) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** The fraction of a limb-darkened disk's light inside radius R, by Simpson quadrature. */
const lightInside = (R, [u1, u2], n) => {
  const I = r => {
    const m = 1 - Math.sqrt(Math.max(0, 1 - r * r));
    return (1 - u1 * m - u2 * m * m) * r;
  };
  return simpson(I, 0, Math.min(1, R), n) / simpson(I, 0, 1, n);
};
const diskLight = ([u1, u2]) => 1 - u1 / 3 - u2 / 6;

function a1() {
  const l = lim('A1.depthCentral');
  let wu = 0;
  let wl = 0;
  for (const c of l.cases) {
    for (const ld of [false, true]) {
      const s = {
        tc: 0,
        P: 2,
        rsum: c.rsum,
        k: c.k,
        inc: 90,
        J: c.J,
        ecosw: 0,
        esinw: 0,
        ldA: ld ? l.limbDarkened.ldA : [0, 0],
        ldB: ld ? l.limbDarkened.ldB : [0, 0],
        thirdLight: 0,
      };
      const fP = eclipseFlux([0], s)[0];
      const fS = eclipseFlux([1], s)[0];
      const L1 = diskLight(s.ldA);
      const L2 = c.J * c.k * c.k * diskLight(s.ldB);
      const n = l.limbDarkened.simpsonIntervals;
      let eP;
      let eS;
      if (c.k < 1) {
        eP = (L1 * lightInside(c.k, s.ldA, n)) / (L1 + L2);
        eS = L2 / (L1 + L2);
      } else {
        eP = L1 / (L1 + L2);
        eS = (L2 * lightInside(1 / c.k, s.ldB, n)) / (L1 + L2);
      }
      const d = Math.max(Math.abs(1 - fP - eP), Math.abs(1 - fS - eS));
      if (ld) wl = Math.max(wl, d);
      else wu = Math.max(wu, d);
    }
  }
  row('A1.depthCentral', wu <= l.maxAbsUniform && wl <= l.limbDarkened.maxAbs, {
    uniform: wu,
    limbDarkened: wl,
  });
}

function a2() {
  const l = lim('A2.contacts');
  let wt = 0;
  let outside = true;
  let inside = true;
  let wd = 0;
  for (const name of ['S1', 'S2', 'S3']) {
    const s = { ...sys(name), annuli: 64 };
    for (const which of ['primary', 'secondary']) {
      const c = contacts(s, which);
      if (!c) {
        outside = false;
        continue;
      }
      // Independent bisection of the separation about the least-separation time.
      const near = (c.first + c.last) / 2;
      const bis = (a, b) => {
        // a is inside (d < reach), b outside
        for (let i = 0; i < 200; i++) {
          const m = (a + b) / 2;
          const { d, reach } = indepSeparation(s, m);
          if (d < reach) a = m;
          else b = m;
        }
        return (a + b) / 2;
      };
      const first = bis(near, near - 0.2 * s.P);
      const last = bis(near, near + 0.2 * s.P);
      wt = Math.max(wt, Math.abs(first - c.first), Math.abs(last - c.last));
      const f = t => eclipseFlux([t], s)[0];
      if (!(f(c.first - l.step) === 1 && f(c.last + l.step) === 1))
        outside = false;
      if (!(f(c.first + l.step) < 1 - 1e-14 && f(c.last - l.step) < 1 - 1e-14))
        inside = false;
      if (which === 'primary' && Math.hypot(s.ecosw, s.esinw) === 0) {
        const r = s.rsum;
        const T =
          (s.P / Math.PI) *
          Math.asin(
            Math.sqrt(r * r - Math.cos(s.inc * RAD) ** 2) /
              Math.sin(s.inc * RAD)
          );
        wd = Math.max(wd, Math.abs(c.duration - T) / T);
      }
    }
  }
  row(
    'A2.contacts',
    wt <= l.contactTimeMaxAbs &&
      outside &&
      inside &&
      wd <= l.circularDurationMaxRel,
    {
      contactTimeMaxAbs: wt,
      fluxIsOneOutside: outside,
      fluxBelowOneInside: inside,
      circularDurationRel: wd,
    }
  );
}

/** Sterne (1939): the phase of the secondary conjunction at inc = 90, written independently. */
const sterne = (e, wDeg) => {
  const x = e * Math.cos(wDeg * RAD);
  const q = Math.sqrt(1 - e * e);
  return (
    0.5 +
    (Math.atan(x / q) + (x * q) / (1 - e * e * Math.sin(wDeg * RAD) ** 2)) /
      Math.PI
  );
};
function a3() {
  const l = lim('A3.secondaryPhase');
  let worst = 0;
  for (const [e, w] of l.cases) {
    const s = {
      tc: 0,
      P: 5,
      rsum: 0.1,
      k: 1,
      inc: 90,
      J: 1,
      ecosw: e * Math.cos(w * RAD),
      esinw: e * Math.sin(w * RAD),
      ldA: [0, 0],
      ldB: [0, 0],
    };
    worst = Math.max(worst, Math.abs(secondaryPhase(s) - sterne(e, w)));
  }
  row('A3.secondaryPhase', worst <= l.maxAbs, { maxAbs: worst });
}

function swapped(s) {
  const t = secondaryTime(s);
  return {
    ...s,
    tc: t,
    k: 1 / s.k,
    J: 1 / s.J,
    ldA: s.ldB,
    ldB: s.ldA,
    ecosw: -s.ecosw,
    esinw: -s.esinw,
  };
}
function a4() {
  const l = lim('A4.swapSymmetry');
  let worst = 0;
  for (const name of ['S1', 'S2', 'S3']) {
    const s = sys(name);
    const t = grid(s, 2000);
    worst = Math.max(
      worst,
      maxAbs(eclipseFlux(t, s), eclipseFlux(t, swapped(s)))
    );
  }
  row('A4.swapSymmetry', worst <= l.maxAbs, { maxAbs: worst });
}

function a5() {
  const l = lim('A5.outOfEclipse');
  let out = 0;
  let high = 0;
  let l3 = 0;
  for (const name of ['S1', 'S2', 'S3']) {
    const s = sys(name);
    const t = grid(s, 4000);
    const f = eclipseFlux(t, s);
    const win = ['primary', 'secondary'].map(w => contacts(s, w));
    for (let i = 0; i < t.length; i++) {
      high = Math.max(high, f[i] - 1);
      const inEclipse = win.some(c => {
        for (const sh of [-s.P, 0, s.P])
          if (t[i] >= c.first - 1e-7 + sh && t[i] <= c.last + 1e-7 + sh)
            return true;
        return false;
      });
      if (!inEclipse) out = Math.max(out, Math.abs(f[i] - 1));
    }
    const g = eclipseFlux(t, { ...s, thirdLight: l.thirdLight });
    for (let i = 0; i < t.length; i++)
      l3 = Math.max(
        l3,
        Math.abs(g[i] - ((1 - l.thirdLight) * f[i] + l.thirdLight))
      );
  }
  row(
    'A5.outOfEclipse',
    out <= l.outsideMaxAbs && high <= 1e-15 && l3 <= l.thirdLightMaxAbs,
    { outside: out, aboveOne: high, thirdLight: l3 }
  );
}

function a6() {
  const l = lim('A6.derived');
  let worst = 0;
  for (const name of ['S1', 'S2', 'S3']) {
    const s = sys(name);
    const q = derivedQuantities(s);
    const e = Math.hypot(s.ecosw, s.esinw);
    const r1 = s.rsum / (1 + s.k);
    const L = (s.J * s.k * s.k * diskLight(s.ldB)) / diskLight(s.ldA);
    const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
    worst = Math.max(
      worst,
      rel(q.r1, r1),
      rel(q.r2, s.k * r1),
      rel(q.lightRatio, L),
      e > 0 ? rel(q.e, e) : q.e
    );
    if (e > 0)
      worst = Math.max(
        worst,
        Math.abs(q.w * RAD - Math.atan2(s.esinw, s.ecosw))
      );
    if (e === 0)
      worst = Math.max(worst, rel(q.impact, Math.cos(s.inc * RAD) / r1));
    if (lightRatio(s) !== q.lightRatio) worst = Math.max(worst, 1);
  }
  row('A6.derived', worst <= l.maxRel, { maxRel: worst });
}

function a7() {
  const l = lim('A7.ecoswFromPhase');
  let worst = 0;
  for (const e of [0.05, 0.1, 0.2, 0.3])
    for (let wd = 0; wd < 360; wd += 15) {
      const s = {
        tc: 0,
        P: 5,
        rsum: 0.1,
        k: 1,
        inc: 90,
        J: 1,
        ecosw: e * Math.cos(wd * RAD),
        esinw: e * Math.sin(wd * RAD),
        ldA: [0, 0],
        ldB: [0, 0],
      };
      const err = Math.abs(ecoswFromPhase(secondaryPhase(s)) - s.ecosw);
      worst = Math.max(worst, err / (l.maxAbsOverE3 * e ** 3 + l.floor));
    }
  row('A7.ecoswFromPhase', worst <= 1, { worstOverBound: worst });
}

function a8() {
  const l = lim('A8.durationRatio');
  let worst = 0;
  for (const [e, wd] of l.cases) {
    const s = {
      tc: 0,
      P: 5,
      rsum: 0.12,
      k: 0.8,
      inc: 89,
      J: 0.7,
      ecosw: e * Math.cos(wd * RAD),
      esinw: e * Math.sin(wd * RAD),
      ldA: [0.4, 0.2],
      ldB: [0.4, 0.2],
    };
    const p = contacts(s, 'primary');
    const q = contacts(s, 'secondary');
    const ratio = q.duration / p.duration;
    const approx = (1 + e * Math.sin(wd * RAD)) / (1 - e * Math.sin(wd * RAD));
    worst = Math.max(
      worst,
      Math.abs(ratio / approx - 1) / (l.maxRelOverE2 * e * e)
    );
  }
  row('A8.durationRatio', worst <= 1, { worstOverBound: worst });
}

// ---- (b) the oracle -------------------------------------------------------------------

function bGroup() {
  const l1 = lim('B1.batman');
  const l2 = lim('B2.bruteForce');
  const l3 = lim('B3.batmanTiming');
  let w1 = 0;
  let w2 = 0;
  let wt = 0;
  let wd = 0;
  const per = {};
  for (const name of ['S1', 'S2', 'S3']) {
    const s = sys(name);
    const o = ORA.systems[name];
    const f = eclipseFlux(grid(s, o.phase), s);
    const d1 = maxAbs(f, o.batman);
    w1 = Math.max(w1, d1);
    per[name] = d1;
    if (o.brute) w2 = Math.max(w2, maxAbs(f, o.brute));
    const ts = secondaryTime(s);
    let dt = Math.abs(ts - o.tSecondary) % s.P;
    dt = Math.min(dt, s.P - dt);
    wt = Math.max(wt, dt);
    const ph = (ts - s.tc) / s.P;
    let mp = 9;
    let ms = 9;
    for (let j = 0; j < o.phase; j++) {
      const x = j / o.phase;
      const dp = Math.abs(((x + 0.5) % 1) - 0.5);
      const dsx = Math.abs(((x - ph + 1.5) % 1) - 0.5);
      if (dp < 0.1) mp = Math.min(mp, f[j]);
      if (dsx < 0.1) ms = Math.min(ms, f[j]);
    }
    wd = Math.max(
      wd,
      Math.abs(mp - o.minPrimary),
      Math.abs(ms - o.minSecondary)
    );
  }
  row('B1.batman', w1 <= l1.maxAbs, { maxAbs: w1, perSystem: per });
  row('B2.bruteForce', w2 <= l2.maxAbs, {
    maxAbs: w2,
    bruteVsBatman: Math.max(
      ORA.systems.S1.bruteVsBatmanMaxAbs,
      ORA.systems.S3.bruteVsBatmanMaxAbs
    ),
  });
  row('B3.batmanTiming', wt <= l3.timeMaxAbs && wd <= l3.depthMaxAbs, {
    timeMaxAbs: wt,
    depthMaxAbs: wd,
  });
}

// ---- (c), (d) ensembles ---------------------------------------------------------------

const ENS = THR.ensembles;
const TRUTH = ens => ens.system;
const PARAM_NAMES = ['tc', 'P', 'rsum', 'k', 'inc', 'J', 'ecosw', 'esinw'];

function timesOf(ens) {
  const n = Math.floor(ens.span / ens.cadence) + 1;
  return Float64Array.from({ length: n }, (_, j) => j * ens.cadence);
}

function requestFor(ens, free, truth) {
  const parameters = {};
  for (const n of PARAM_NAMES) {
    if (free.includes(n)) {
      const b = ens.bounds?.[n];
      parameters[n] = b
        ? { mode: 'fitted', lo: b[0], hi: b[1] }
        : { mode: 'fitted' };
    } else
      parameters[n] = {
        mode: 'fixed',
        value: n === 'ecosw' || n === 'esinw' ? 0 : truth[n],
      };
  }
  return {
    model: { id: 'eclipsing-binary', version: '1.0.0' },
    parameters,
    settings: { ldA: truth.ldA, ldB: truth.ldB, thirdLight: 0 },
    algorithm: {},
  };
}

function dataOf(
  ens,
  tag,
  i,
  { sigma = ens.sigma, modulation = null, system = ens.system } = {}
) {
  return syntheticEclipse({
    seed: `${THR.seeds.ensemble}-${tag}-${i}`,
    times: timesOf(ens),
    sigma,
    truth: { ...system, annuli: 64 },
    modulation,
  });
}

const sig = q => q.sigmaScaled ?? q.sigma;
const memo = new Map();
function ensembleFits(tag, ens, n, free, opts = {}) {
  const key = `${tag}:${n}:${free.join()}`;
  if (memo.has(key)) return memo.get(key);
  const out = [];
  for (let i = 0; i < n; i++) {
    const data = dataOf(ens, tag, i, opts);
    const request = requestFor(ens, free, TRUTH(ens));
    let fit = null;
    let error = null;
    try {
      fit = fitOnce(request, data);
    } catch (e) {
      error = e.message;
    }
    out.push({ fit, error, request, data });
  }
  memo.set(key, out);
  return out;
}

function coverage(fits, names, truth) {
  const out = {};
  for (const n of names) {
    let hit = 0;
    let used = 0;
    for (const { fit } of fits) {
      if (!fit) continue;
      const q = fit.parameters.find(p => p.name === n);
      used++;
      if (Math.abs(q.value - truth[n]) <= sig(q)) hit++;
    }
    out[n] = used ? hit / used : NaN;
  }
  return out;
}

function c12() {
  for (const [id, tag, key] of [
    ['C1.coverageCircular', 'circular', 'circular'],
    ['C2.coverageEccentric', 'eccentric', 'eccentric'],
  ]) {
    const l = lim(id);
    const ens = ENS[key];
    const fits = ensembleFits(tag, ens, l.n, ens.free);
    const cov = coverage(fits, l.parameters, ens.system);
    const failures = fits.filter(f => !f.fit).length;
    const bad = Object.entries(cov).filter(
      ([, v]) => !(v >= l.lo && v <= l.hi)
    );
    row(id, !bad.length && failures === 0, {
      coverage: cov,
      failures,
      bounds: [l.lo, l.hi],
    });
  }
}

function c3() {
  const l = lim('C3.coverageProfile');
  const ens = ENS.circular;
  const fits = ensembleFits('circular', ens, 120, ens.free).slice(0, l.n);
  const hit = Object.fromEntries(l.parameters.map(n => [n, 0]));
  let used = 0;
  for (const { fit, request, data } of fits) {
    if (!fit) continue;
    used++;
    for (const n of l.parameters) {
      const pr = profileTask(request, data, fit, n);
      const [a, b] = pr.interval;
      const truth = ens.system[n];
      if ((a === null || truth >= a) && (b === null || truth <= b)) hit[n]++;
    }
  }
  const cov = Object.fromEntries(l.parameters.map(n => [n, hit[n] / used]));
  const bad = Object.entries(cov).filter(([, v]) => !(v >= l.lo && v <= l.hi));
  row('C3.coverageProfile', !bad.length, {
    coverage: cov,
    n: used,
    bounds: [l.lo, l.hi],
  });
}

function c4() {
  const l = lim('C4.recovery');
  const ens = ENS.circular;
  const fits = ensembleFits('circular', ens, 120, ens.free).filter(f => f.fit);
  const med = v => {
    const s = Array.from(v).sort((a, b) => a - b);
    return s[s.length >> 1];
  };
  const out = {};
  let ok = true;
  for (const n of ens.free) {
    const vals = fits.map(f => f.fit.parameters.find(p => p.name === n).value);
    const sg = med(
      fits.map(f => sig(f.fit.parameters.find(p => p.name === n)))
    );
    const bias = med(vals) - ens.system[n];
    out[n] = { bias, sigma: sg, biasOverSigma: bias / sg };
    // A median of n values scatters by about 1.25 sigma / sqrt(n).
    if (Math.abs(bias) > (l.nSigma * sg) / Math.sqrt(fits.length)) ok = false;
  }
  row('C4.recovery', ok, out);
}

function flaggedK(fit) {
  return fit.identifiability.parameters.k?.status === 'not constrained';
}

function d1() {
  const l = lim('D1.grazing');
  const ens = ENS.grazing;
  const fits = ensembleFits('grazing', ens, l.n, ens.free);
  const flagged =
    fits.filter(f => f.fit && flaggedK(f.fit)).length / fits.length;
  const cens = ENS.circular;
  const control = ensembleFits('circular', cens, 120, cens.free).slice(
    0,
    l.controlN
  );
  const cf =
    control.filter(f => f.fit && flaggedK(f.fit)).length / control.length;
  row('D1.grazing', flagged >= l.minFlagged && cf <= l.maxControlFlagged, {
    grazingFlagged: flagged,
    controlFlagged: cf,
    errors: fits.filter(f => !f.fit).length,
  });
}

function d2() {
  const l = lim('D2.spots');
  const cens = ENS.circular;
  const fits = ensembleFits('spotted', cens, l.n, cens.free, {
    modulation: ENS.spotted.modulation,
  });
  const fail =
    fits.filter(f => f.fit && residualsFail(f.fit, l)).length / fits.length;
  const control = ensembleFits('circular', cens, 120, cens.free).slice(
    0,
    l.controlN
  );
  const cf =
    control.filter(f => f.fit && residualsFail(f.fit, l)).length /
    control.length;
  row('D2.spots', fail >= l.minFail && cf <= l.maxControlFail, {
    spottedFail: fail,
    controlFail: cf,
  });
}

function d3() {
  const l = lim('D3.noEclipse');
  const cens = ENS.circular;
  let refused = 0;
  let named = 0;
  for (let i = 0; i < l.n; i++) {
    const clean = { ...cens.system, rsum: 0.19, k: 0.75, inc: 60, J: 0.55 }; // inc 60: no eclipse at all
    const data = dataOf(cens, 'flat', i, {
      sigma: ENS.flat.sigma,
      system: clean,
    });
    try {
      fitOnce(requestFor(cens, cens.free, cens.system), data);
    } catch (e) {
      refused++;
      if (/eclipse/.test(e.message)) named++;
    }
  }
  row('D3.noEclipse', refused / l.n >= l.minRefused && named === refused, {
    refused,
    namedTheEclipse: named,
    n: l.n,
  });
}

function d4() {
  const l = lim('D4.circularAssumed');
  const ens = ENS.eccentric;
  const free = ['tc', 'P', 'rsum', 'k', 'inc', 'J']; // e fixed at 0
  const fits = ensembleFits('eccentric-circular', ens, l.n, free);
  const fail =
    fits.filter(f => f.fit && residualsFail(f.fit)).length / fits.length;
  row('D4.circularAssumed', fail >= l.minFail, {
    fail,
    errors: fits.filter(f => !f.fit).length,
  });
}

function d5() {
  const l = lim('D5.esinwWeak');
  const ens = ENS.eccentric;
  const fits = ensembleFits('eccentric', ens, 120, ens.free).filter(f => f.fit);
  const med = v => {
    const s = Array.from(v).sort((a, b) => a - b);
    return s[s.length >> 1];
  };
  const sc = med(
    fits.map(f => sig(f.fit.parameters.find(p => p.name === 'ecosw')))
  );
  const ss = med(
    fits.map(f => sig(f.fit.parameters.find(p => p.name === 'esinw')))
  );
  row('D5.esinwWeak', ss / sc >= l.minRatio, {
    sigmaEcosw: sc,
    sigmaEsinw: ss,
    ratio: ss / sc,
  });
}

// ---- (e) the authentic eclipsing binary --------------------------------------------------

function e1() {
  const l = lim('E1.authentic');
  const arg = process.argv.find(a => a.startsWith('--fits='))?.slice(7);
  const prov = read('tests/fixtures/binaries/oracle-provenance.json').authentic;
  const file =
    arg ||
    process.env.BINARIES_FITS ||
    (prov?.relativePath && path.resolve(ROOT, prov.relativePath));
  if (!file || !existsSync(file))
    return notRun(
      'E1.authentic',
      'the TESS Sector 18 light curve of V505 Per is not in the repository and no --fits path was given'
    );
  const bytes = readFileSync(file);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (prov?.sha256 && sha !== prov.sha256)
    return notRun(
      'E1.authentic',
      `the file's SHA-256 ${sha} is not the pinned ${prov.sha256}`
    );
  const units = readFits(new Uint8Array(bytes));
  const lc = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE');
  const col = n => lc.columns[n].values;
  const TIME = col('TIME');
  const SAP_FLUX = col('SAP_FLUX');
  const QUALITY = col('QUALITY');
  const pp = l.paper;
  const T0 = 2458798;
  const paper = {
    tc: pp.tc_BJD - T0,
    P: pp.P,
    rsum: pp.rsum,
    k: pp.k,
    inc: pp.inc,
    J: pp.J,
    ecosw: 0,
    esinw: 0,
    ldA: [0.261, 0.23],
    ldB: [0.261, 0.23],
    thirdLight: 0,
  };
  const c = contacts(paper, 'primary');
  const T14 = c.duration;
  const xs = [];
  const ys = [];
  const base = [];
  for (let n = -4; n <= 6; n++) {
    for (const mid of [
      paper.tc + n * paper.P,
      paper.tc + (n + 0.5) * paper.P,
    ]) {
      const w = [];
      for (let i = 0; i < TIME.length; i++) {
        const t = TIME[i] + 2457000 - T0;
        if (
          QUALITY[i] !== 0 ||
          !Number.isFinite(t) ||
          !Number.isFinite(SAP_FLUX[i])
        )
          continue;
        if (Math.abs(t - mid) <= T14) w.push([t, SAP_FLUX[i]]);
      }
      const oob = w.filter(([t]) => Math.abs(t - mid) >= 0.55 * T14);
      if (oob.length < 20 || w.length < 100) continue;
      // Straight line through the out-of-eclipse points.
      const m = oob.length;
      const sx = oob.reduce((a, [t]) => a + (t - mid), 0);
      const sy = oob.reduce((a, [, y]) => a + y, 0);
      const sxx = oob.reduce((a, [t]) => a + (t - mid) ** 2, 0);
      const sxy = oob.reduce((a, [t, y]) => a + (t - mid) * y, 0);
      const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
      const icpt = (sy - slope * sx) / m;
      for (const [t, y] of w) {
        xs.push(t);
        ys.push(y / (icpt + slope * (t - mid)));
      }
      for (const [t, y] of oob) base.push(y / (icpt + slope * (t - mid)) - 1);
    }
  }
  const rms = Math.sqrt(base.reduce((a, v) => a + v * v, 0) / base.length);
  const data = {
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    sigma: new Float64Array(xs.length).fill(rms),
    groups: null,
    rows: xs.map((_, i) => i),
    counts: {
      total: xs.length,
      used: xs.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'flux', sigma: 'flux-error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
  const request = {
    model: { id: 'eclipsing-binary', version: '1.0.0' },
    parameters: {
      tc: { mode: 'fitted', lo: paper.tc - 0.1, hi: paper.tc + 0.1 },
      P: { mode: 'fitted', lo: paper.P - 0.01, hi: paper.P + 0.01 },
      rsum: { mode: 'fitted' },
      k: { mode: 'fitted' },
      inc: { mode: 'fitted' },
      J: { mode: 'fitted' },
      ecosw: { mode: 'fixed', value: 0 },
      esinw: { mode: 'fixed', value: 0 },
    },
    settings: {
      ldA: paper.ldA,
      ldB: paper.ldB,
      thirdLight: 0,
      exposure: 120 / 86400,
      supersample: 3,
    },
    algorithm: {},
  };
  const fit = fitOnce(request, data);
  const got = {};
  let ok = true;
  for (const n of l.parameters) {
    const q = fit.parameters.find(p => p.name === n);
    const d = Math.abs(q.value - pp[n]);
    got[n] = {
      ours: q.value,
      ourSigma: sig(q),
      paper: pp[n],
      paperSigma: pp[`${n}_sigma`],
      deltaOverPaperSigma: d / pp[`${n}_sigma`],
    };
    if (d > l.nPaperSigma * pp[`${n}_sigma`]) ok = false;
  }
  row('E1.authentic', ok, {
    ...got,
    rows: xs.length,
    rms,
    reducedChi2: fit.reducedChi2,
    identifiability: fit.identifiability.status,
  });
}

function p1() {
  const l = lim('P1.speed');
  const ens = ENS.circular;
  const d = dataOf(ens, 'circular', 0);
  const t0 = process.cpuUsage();
  fitOnce(requestFor(ens, ens.free, ens.system), d);
  const u = process.cpuUsage(t0);
  const s = (u.user + u.system) / 1e6;
  row('P1.speed', s <= l.maxSeconds, { cpuSeconds: s, rows: d.x.length });
}

const ALL = [
  a1,
  a2,
  a3,
  a4,
  a5,
  a6,
  a7,
  a8,
  bGroup,
  c12,
  c3,
  c4,
  d1,
  d2,
  d3,
  d4,
  d5,
  e1,
  p1,
];

/**
 * Legs take minutes each: with --progress=<file> every finished group is kept in a JSON
 * file and --resume skips the groups already in it, so a crash in a late leg loses nothing.
 */
const PROGRESS = process.argv.find(a => a.startsWith('--progress='))?.slice(11);
const progress = (() => {
  try {
    return PROGRESS && process.argv.includes('--resume')
      ? JSON.parse(readFileSync(PROGRESS, 'utf8'))
      : {};
  } catch {
    return {};
  }
})();

export function runAll(only = null) {
  rows.length = 0;
  for (const f of ALL) {
    const key = f.name.toUpperCase();
    const wanted =
      !only ||
      only.some(
        p =>
          p.startsWith(key) ||
          key.startsWith(p) ||
          (f === bGroup && p[0] === 'B') ||
          (f === c12 && /^C[12]/.test(p))
      );
    if (!wanted) continue;
    if (progress[f.name]) {
      rows.push(...progress[f.name]);
      continue;
    }
    const before = rows.length;
    f();
    if (PROGRESS) {
      progress[f.name] = rows.slice(before);
      writeFileSync(PROGRESS, JSON.stringify(progress));
    }
  }
  return only
    ? rows.filter(r => only.some(p => r.id.startsWith(p)))
    : rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.slice(7);
  const out = runAll(onlyArg ? onlyArg.split(',') : null);
  const previousWhy = id => {
    try {
      return read('tests/fixtures/binaries/failed-legs.json').failed.find(
        f => f.id === id
      )?.why;
    } catch {
      return undefined;
    }
  };
  if (process.argv.includes('--write-failed')) {
    const failed = out
      .filter(r => r.status === 'fail')
      .map(r => ({
        id: r.id,
        measured: r.measured,
        why: previousWhy(r.id),
      }));
    const notMeasured = out
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, reason: r.note }));
    writeFileSync(
      path.join(ROOT, 'tests/fixtures/binaries/failed-legs.json'),
      `${JSON.stringify({ note: 'Legs of tests/fixtures/binaries/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).', failed, notMeasured }, null, 2)}\n`
    );
  }
  if (process.argv.includes('--write-results'))
    writeFileSync(
      path.join(ROOT, 'tests/fixtures/binaries/results.json'),
      `${JSON.stringify({ note: 'The validation table of tools/binaries-validate.mjs as last measured (Node 22.23.4, 2026-10-29); the Jest group reruns the quick legs and holds these against failed-legs.json.', rows: out }, null, 2)}\n`
    );
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 2));
  else
    for (const r of out)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
  let recorded = [];
  try {
    recorded = read('tests/fixtures/binaries/failed-legs.json').failed.map(
      f => f.id
    );
  } catch {
    // no record yet: every failure is new
  }
  process.exitCode = out.some(
    r => r.status === 'fail' && !recorded.includes(r.id)
  )
    ? 1
    : 0;
}
