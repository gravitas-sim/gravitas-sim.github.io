#!/usr/bin/env node
// =============================================================================
// Astrometric time series against its committed thresholds (Prompt 186)
// -----------------------------------------------------------------------------
//   npm run astrometric-series:validate               print the table
//   npm run astrometric-series:validate -- --json     print it as JSON
//
// tests/fixtures/astrometric-series/thresholds.json fixed every bound before
// js/measure/astrometric-series.js had been run (ASTROMETRY.md, "The validation
// contract for the time series"). This runs the checks against the production
// module and judges them against those bounds, read from the file and not copied.
// tests/astrometricSeries.test.js runs it in plain Node (Jest's VM makes Math
// reads about ten times slower, so an ensemble there would time the harness) and
// asserts every row.
//
// The series are made by tools/astrometric-series-synth.mjs (the exact spherical
// geometry) or, where the truth is a straight line in the tangent plane, by the
// linear generator below; the oracle's rows read the series and fits pinned in
// tests/fixtures/astrometric-series/ (astropy, scipy, numpy: no Gravitas code).
// Nothing here stores a value that passes through a trigonometric function:
// bands, counts and tolerances are judged. Check b6 is reported as not run: it
// needs an authentic series from Prompt 189.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { heliocentric } from '../js/kernels/sky/planets.js';
import { stream, gaussian } from '../js/random/streams.js';
import { solveSpd } from '../js/numeric/linalg.js';
import {
  RULES,
  SHIFT_LABEL,
  TT_MINUS_UTC,
  createEarth,
  epochJd,
  fitJoint,
  fitMotion,
  offsetToTdb,
  parallaxFactors,
  prepare,
  tdbMinusTt,
  twoEpochShift,
  unstandard,
} from '../js/measure/astrometric-series.js';
import { makeSeries, evenEpochs } from './astrometric-series-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/astrometric-series');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const SEED = 'astrometric-series-186';
const RAD = Math.PI / 180;
const YEAR = 365.25;
const DAYS = 86400000;
const jdOf = iso => Date.parse(`${iso}T00:00:00Z`) / DAYS + 2440587.5;

const earth = createEarth({
  ephemeris: createEphemeris(PACK, DATA),
  heliocentric,
});
const ORACLE = read('oracle-results.json');

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const evidence = (id, measured, note) =>
  rows.push({ id, measured, evidence: true, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const inBand = (id, measured, [lo, hi], note) =>
  row(id, measured, [lo, hi], measured >= lo && measured <= hi, note);

/** A draw from the check's own stream. */
const rng = (...labels) => stream('noise', SEED, ...labels);
const jdRange = [jdOf('2025-02-01'), jdOf('2040-01-01')];

/** The tangent-plane series of a straight-line truth (exact), with Gaussian error. */
function linearSeries(truth, jds, label, { noise = true } = {}) {
  const g = gaussian(rng(label, 'noise'));
  const t0 = jds[0];
  return {
    epochs: jds.map(jd => {
      const t = (jd - t0) / YEAR;
      const x = truth.x0 + truth.mu[0] * t + (noise ? g() * truth.sigma : 0);
      const y = truth.y0 + truth.mu[1] * t + (noise ? g() * truth.sigma : 0);
      const p = unstandard([truth.ra, truth.dec], x, y);
      return {
        time: { value: jd, format: 'jd', scale: 'tdb' },
        ra: p.ra,
        dec: p.dec,
        sigma: truth.sigma,
      };
    }),
  };
}

const seriesOf = (c, noise) => ({
  epochs: c.epochsJd.map((jd, i) => ({
    time: { value: jd, format: 'jd', scale: 'tdb' },
    ra: noise ? c.ra[i] : c.noiseFree.ra[i],
    dec: noise ? c.dec[i] : c.noiseFree.dec[i],
    sigma: c.truth.sigma,
  })),
});

/** A random sky position, uniform on the sphere away from the poles. */
const skyOf = u => ({
  ra: 360 * u(),
  dec: Math.asin(-0.99 + 1.98 * u()) / RAD,
});

// ---- (a) analytic cases ------------------------------------------------------------

function analytic() {
  const b = C['a1.pmExact'].bounds;
  {
    const jds = [0, 100, 250, 400, 700].map(d => 2460700 + d);
    const truth = {
      ra: 100,
      dec: 30,
      x0: 0.3,
      y0: -0.2,
      mu: [0.7, -0.4],
      sigma: 0.01,
    };
    const s = linearSeries(truth, jds, 'a1', { noise: false });
    const f = fitMotion(s, { tangent: [100, 30] });
    const t0 = jds[0];
    const tRef = f.tRefJd;
    const want = {
      x0: truth.x0 + (truth.mu[0] * (tRef - t0)) / YEAR,
      y0: truth.y0 + (truth.mu[1] * (tRef - t0)) / YEAR,
    };
    const dPos = Math.max(
      Math.abs(f.params.x0.value - want.x0),
      Math.abs(f.params.y0.value - want.y0)
    );
    const dMu = Math.max(
      Math.abs(f.params.mux.value - truth.mu[0]),
      Math.abs(f.params.muy.value - truth.mu[1])
    );
    const sw = jds.length / truth.sigma ** 2;
    let sxx = 0;
    for (const jd of jds) sxx += ((jd - tRef) / YEAR) ** 2 / truth.sigma ** 2;
    const dSig = Math.max(
      Math.abs(f.params.x0.sigma * Math.sqrt(sw) - 1),
      Math.abs(f.params.mux.sigma * Math.sqrt(sxx) - 1)
    );
    within('a1.pmExact.positionArcsec', dPos, b.paramsArcsec);
    within('a1.pmExact.muArcsecPerYr', dMu, b.paramsArcsecPerYr);
    within('a1.pmExact.sigmaRelative', dSig, b.sigmaRelative);
  }
  {
    // three epochs at 0, 1, 3 years, xi = 0, 1, 2, sigmas 1, 2, 1: slope 27/41, value 1 at the
    // weighted mean epoch, sigmas 3/sqrt(41) and 2/3 (the normal equations by hand)
    const jds = [0, 1, 3].map(y => 2460800 + y * YEAR);
    const sig = [1, 2, 1];
    const xs = [0, 1, 2];
    const g = [100, 30];
    const s = {
      epochs: jds.map((jd, i) => {
        const p = unstandard(g, xs[i], -xs[i]);
        return {
          time: { value: jd, format: 'jd', scale: 'tdb' },
          ra: p.ra,
          dec: p.dec,
          sigma: sig[i],
        };
      }),
    };
    const f = fitMotion(s, { tangent: g });
    const rel = (a, e) => Math.abs(a - e) / Math.abs(e);
    const worst = Math.max(
      rel(f.params.mux.value, 27 / 41),
      rel(f.params.muy.value, -27 / 41),
      rel(f.params.x0.value, 1),
      rel(f.params.y0.value, -1),
      rel(f.params.mux.sigma, 3 / Math.sqrt(41)),
      rel(f.params.x0.sigma, 2 / 3)
    );
    within(
      'a2.pmClosedForm.relative',
      worst,
      C['a2.pmClosedForm'].bounds.relative
    );
  }
  {
    const g = [200, -20];
    const a = {
      time: { value: 2460800, format: 'jd', scale: 'tdb' },
      ...unstandard(g, 1.5, -2),
      sigma: [0.03, 0.04],
    };
    const bb = {
      time: { value: 2461165.25, format: 'jd', scale: 'tdb' },
      ...unstandard(g, 4.0, -0.5),
      sigma: [0.04, 0.03],
    };
    const r = twoEpochShift(a, bb, { tangent: g });
    const bounds = C['a3.twoEpoch'].bounds;
    within(
      'a3.twoEpoch.displacementArcsec',
      Math.max(
        Math.abs(r.displacement.x.value - 2.5),
        Math.abs(r.displacement.y.value - 1.5)
      ),
      bounds.displacementArcsec,
      'the tangent point is the mean of the two positions, so the plane differs by second order only'
    );
    within(
      'a3.twoEpoch.sigmaRelative',
      Math.max(
        Math.abs(r.displacement.x.sigma - 0.05) / 0.05,
        Math.abs(r.displacement.y.sigma - 0.05) / 0.05
      ),
      bounds.sigmaRelative
    );
    const j = fitJoint({ epochs: [a, bb] }, earth);
    row(
      'a3.twoEpoch.labelAndRefusal',
      0,
      'label text, no parallax or distance field, joint refusal too-few-epochs',
      r.label === SHIFT_LABEL &&
        !('parallax' in r) &&
        !('distance' in r) &&
        j.ok === false &&
        j.code === 'too-few-epochs'
    );
  }
  {
    // a circular Earth orbit in the ecliptic, not the ephemeris
    const eps = 23.439291111 * RAD;
    const orbit = lam => [
      Math.cos(lam),
      Math.sin(lam) * Math.cos(eps),
      Math.sin(lam) * Math.sin(eps),
    ];
    const axes = (ra, dec) => {
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      const n = 360;
      let circle = 0;
      for (let k = 0; k < n; k++) {
        const f = parallaxFactors(orbit((2 * Math.PI * k) / n), ra, dec);
        sxx += f.x * f.x;
        syy += f.y * f.y;
        sxy += f.x * f.y;
        circle = Math.max(circle, Math.abs(Math.hypot(f.x, f.y) - 1));
      }
      sxx /= n;
      syy /= n;
      sxy /= n;
      const mean = (sxx + syy) / 2;
      const d = Math.hypot((sxx - syy) / 2, sxy);
      return {
        major: Math.sqrt(2 * (mean + d)),
        minor: Math.sqrt(2 * Math.max(0, mean - d)),
        circle,
      };
    };
    const pole = axes(270, 90 - 23.439291111);
    const ecl = axes(0, 0);
    const b30 = 30 * RAD;
    const lat = axes(
      Math.atan2(-Math.sin(b30) * Math.sin(eps), Math.cos(b30)) / RAD,
      Math.asin(Math.sin(b30) * Math.cos(eps)) / RAD
    );
    const worst = Math.max(
      pole.circle,
      Math.abs(pole.major - 1),
      Math.abs(pole.minor - 1),
      Math.abs(ecl.major - 1),
      Math.abs(ecl.minor),
      Math.abs(lat.major - 1),
      Math.abs(lat.minor - Math.sin(b30))
    );
    within(
      'a4.parallaxFactors.absolute',
      worst,
      C['a4.parallaxFactors'].bounds.absolute
    );
  }
  {
    const bounds = C['a5.jointNoiseless'].bounds;
    let dp = 0;
    let dm = 0;
    let rms = 0;
    for (const [ra, dec] of [
      [265, 62],
      [75, 22],
    ]) {
      const truth = {
        ra,
        dec,
        parallax: 0.12,
        mu: [0.35, -0.18],
        sigma: 0.004,
      };
      const s = makeSeries(truth, evenEpochs(2461045.5, 365, 24), earth, {
        noise: false,
        seed: 'a5',
      });
      const f = fitJoint(s, earth);
      dp = Math.max(dp, Math.abs(f.params.parallax.value - truth.parallax));
      dm = Math.max(
        dm,
        Math.abs(f.params.mux.value - truth.mu[0]),
        Math.abs(f.params.muy.value - truth.mu[1])
      );
      rms = Math.max(rms, f.rms);
    }
    within('a5.jointNoiseless.parallaxArcsec', dp, bounds.parallaxArcsec);
    within('a5.jointNoiseless.muArcsecPerYr', dm, bounds.muArcsecPerYr);
    within(
      'a5.jointNoiseless.residualRmsArcsec',
      rms,
      bounds.residualRmsArcsec
    );
  }
  {
    const bounds = C['a6.timeScales'].bounds;
    let tt = 0;
    let tdb = 0;
    let mjd = 0;
    for (const iso of ['2026-01-01', '2030-07-01']) {
      const jd = jdOf(iso);
      tt = Math.max(
        tt,
        Math.abs(
          offsetToTdb(jd, 'utc') -
            tdbMinusTt(jd + TT_MINUS_UTC / 86400) -
            69.184
        )
      );
      mjd = Math.max(
        mjd,
        Math.abs(
          epochJd({ value: jd - 2400000.5, format: 'mjd', scale: 'tdb' }).jd -
            jd
        )
      );
    }
    for (let k = 0; k < 400; k++)
      tdb = Math.max(tdb, Math.abs(tdbMinusTt(2461041.5 + k)));
    within('a6.timeScales.ttMinusUtcSeconds', tt, bounds.ttMinusUtcSeconds);
    within(
      'a6.timeScales.tdbMinusTtSecondsMax',
      tdb,
      bounds.tdbMinusTtSecondsMax
    );
    within('a6.timeScales.mjdOffsetDays', mjd, bounds.mjdOffsetDays);
    const old = epochJd({
      value: jdOf('2010-01-01'),
      format: 'jd',
      scale: 'utc',
    });
    row(
      'a6.timeScales.utcBefore2017',
      0,
      'refused utc-before-2017',
      old.ok === false && old.code === 'utc-before-2017'
    );
  }
  {
    const bounds = C['a7.profile'].bounds;
    const truth = {
      ra: 120,
      dec: 25,
      parallax: 0.08,
      mu: [0.2, 0.1],
      sigma: 0.005,
    };
    const s = makeSeries(truth, evenEpochs(2461045.5, 380, 22), earth, {
      seed: 'a7',
    });
    const f = fitJoint(s, earth);
    const p = prepare(s);
    const [a0, d0] = p.tangent;
    const tRef = f.tRefJd;
    const sigma = f.params.parallax.sigma;
    let worst = 0;
    for (const k of [-2, -1, 0.5, 1, 3]) {
      const pk = f.params.parallax.value + k * sigma;
      // refit the four motion parameters at fixed parallax (a second, small least-squares solve)
      const N = Array.from({ length: 4 }, () => new Array(4).fill(0));
      const bvec = new Array(4).fill(0);
      const add = (row4, y, w) => {
        for (let i = 0; i < 4; i++) {
          bvec[i] += w * row4[i] * y;
          for (let j = 0; j < 4; j++) N[i][j] += w * row4[i] * row4[j];
        }
      };
      const obs = [];
      p.rows.forEach(r => {
        const t = (r.jd - tRef) / YEAR;
        const fac = parallaxFactors(earth.at(r.jd), a0, d0);
        const rx = r.x - pk * fac.x;
        const ry = r.y - pk * fac.y;
        add([1, 0, t, 0], rx, 1 / r.sx ** 2);
        add([0, 1, 0, t], ry, 1 / r.sy ** 2);
        obs.push({ t, rx, ry, sx: r.sx, sy: r.sy });
      });
      const th = solveSpd(N, bvec);
      let chi2 = 0;
      for (const o of obs) {
        chi2 += ((o.rx - th[0] - th[2] * o.t) / o.sx) ** 2;
        chi2 += ((o.ry - th[1] - th[3] * o.t) / o.sy) ** 2;
      }
      const analytic = f.chi2 + k * k;
      worst = Math.max(worst, Math.abs(chi2 - analytic) / analytic);
    }
    within(
      'a7.profile.chi2',
      worst,
      bounds.chi2,
      'refit at fixed parallax against chi2 min + k^2'
    );
    const i68 = f.distance.intervals[0];
    const rel =
      Math.max(
        Math.abs(i68.parallax.lo - (f.params.parallax.value - sigma)),
        Math.abs(i68.parallax.hi - (f.params.parallax.value + sigma))
      ) / sigma;
    within('a7.profile.intervalRelative', rel, bounds.intervalRelative);
  }
}

// ---- (b) the oracle -------------------------------------------------------------------

function oracle() {
  const b1 = C['b1.earth'].bounds;
  const g = ORACLE.earthGrid;
  const diff = g.jd.map((jd, i) => {
    const e = earth.at(jd);
    return [0, 1, 2].map(k => e[k] - g.xyzAu[i][k]);
  });
  const maxDiff = Math.max(...diff.map(d => Math.hypot(...d)));
  within('b1.earth.maxDifferenceAu', maxDiff, b1.maxDifferenceAu);
  let win = 0;
  for (let s = 0; s + 36 <= diff.length; s += 36) {
    for (let k = 0; k < 3; k++) {
      const t = g.jd.slice(s, s + 36);
      const y = diff.slice(s, s + 36).map(d => d[k]);
      const n = t.length;
      const mt = t.reduce((a, v) => a + v, 0) / n;
      const my = y.reduce((a, v) => a + v, 0) / n;
      let sxy = 0;
      let sxx = 0;
      for (let i = 0; i < n; i++) {
        sxy += (t[i] - mt) * (y[i] - my);
        sxx += (t[i] - mt) ** 2;
      }
      const slope = sxy / sxx;
      for (let i = 0; i < n; i++)
        win = Math.max(win, Math.abs(y[i] - my - slope * (t[i] - mt)));
    }
  }
  within('b1.earth.windowResidualAu', win, b1.windowResidualAu);

  const b2 = C['b2.jointCrossEphemeris'].bounds;
  let dpr = 0;
  let dmu = 0;
  for (const id of ['A', 'B']) {
    const c = ORACLE.cases.find(x => x.id === id);
    const f = fitJoint(seriesOf(c, false), earth);
    dpr = Math.max(
      dpr,
      Math.abs(f.params.parallax.value - c.truth.parallax) / c.truth.parallax
    );
    dmu = Math.max(
      dmu,
      Math.abs(f.params.mux.value - c.truth.mu[0]),
      Math.abs(f.params.muy.value - c.truth.mu[1])
    );
  }
  within('b2.jointCrossEphemeris.parallaxRelative', dpr, b2.parallaxRelative);
  within('b2.jointCrossEphemeris.muArcsecPerYr', dmu, b2.muArcsecPerYr);

  const b3 = C['b3.jointVsScipy'].bounds;
  let share = 0;
  let sig = 0;
  let chi = 0;
  for (const id of ['A', 'B', 'C']) {
    const c = ORACLE.cases.find(x => x.id === id);
    const f = fitJoint(seriesOf(c, true), earth);
    const o = c.spherical;
    share = Math.max(
      share,
      Math.abs(f.params.parallax.value - o.parallax) / o.sigmaParallax,
      Math.abs(f.params.mux.value - o.mua) / o.sigmaMua,
      Math.abs(f.params.muy.value - o.mud) / o.sigmaMud
    );
    sig = Math.max(
      sig,
      Math.abs(f.params.parallax.sigma - o.sigmaParallax) / o.sigmaParallax
    );
    chi = Math.max(chi, Math.abs(f.chi2 - o.chi2) / o.chi2);
  }
  within('b3.jointVsScipy.shareOfSigma', share, b3.shareOfSigma);
  within('b3.jointVsScipy.sigmaRelative', sig, b3.sigmaRelative);
  within('b3.jointVsScipy.chi2Relative', chi, b3.chi2Relative);

  const b4 = C['b4.pmVsCurveFit'].bounds;
  let pos = 0;
  let mu = 0;
  let cov = 0;
  for (const c of ORACLE.cases) {
    const f = fitMotion(seriesOf(c, true));
    const l = c.line;
    for (const [axis, x0n, mun] of [
      ['x', 'x0', 'mux'],
      ['y', 'y0', 'muy'],
    ]) {
      pos = Math.max(pos, Math.abs(f.params[x0n].value - l[axis].x0));
      mu = Math.max(mu, Math.abs(f.params[mun].value - l[axis].mu));
      const i = axis === 'x' ? [0, 2] : [1, 3];
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 2; k++) {
          const o = l[axis].covariance[r][k];
          cov = Math.max(
            cov,
            Math.abs(f.covariance[i[r]][i[k]] - o) /
              Math.sqrt(
                Math.abs(l[axis].covariance[r][r] * l[axis].covariance[k][k])
              )
          );
        }
    }
  }
  within('b4.pmVsCurveFit.positionArcsec', pos, b4.positionArcsec);
  within('b4.pmVsCurveFit.muArcsecPerYr', mu, b4.muArcsecPerYr);
  within('b4.pmVsCurveFit.covarianceRelative', cov, b4.covarianceRelative);

  const b5 = C['b5.timeVsErfa'].bounds;
  const t = ORACLE.times;
  let dtt = 0;
  let dtdb = 0;
  t.jdUtc.forEach((jd, i) => {
    dtt = Math.max(dtt, Math.abs(TT_MINUS_UTC - t.ttMinusUtcSeconds[i]));
    dtdb = Math.max(
      dtdb,
      Math.abs(offsetToTdb(jd, 'utc') - t.tdbMinusUtcSeconds[i])
    );
  });
  within('b5.timeVsErfa.ttSeconds', dtt, b5.ttSeconds);
  within('b5.timeVsErfa.tdbSeconds', dtdb, b5.tdbSeconds);
  rows.push({
    id: 'b6.authentic',
    measured: null,
    pass: null,
    note: 'NOT RUN until Prompt 189 supplies an authentic series',
  });
}

// ---- (c) coverage ---------------------------------------------------------------------

/** Epochs for a joint ensemble: n uniform in a window of `years`, redrawn until the rules hold. */
function jointEpochs(u, n, years) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const start = jdRange[0] + u() * (jdRange[1] - jdRange[0] - 400);
    const span = years * YEAR;
    const jds = Array.from({ length: n }, () => start + span * u()).sort(
      (a, b) => a - b
    );
    const sectors = new Set(
      jds.map(jd => {
        const [X, Y, Z] = earth.at(jd);
        const e = 23.439291111 * RAD;
        return (
          Math.floor(
            ((((Math.atan2(Y * Math.cos(e) + Z * Math.sin(e), X) / RAD) % 360) +
              360) %
              360) /
              90
          ) % 4
        );
      })
    );
    if (
      (jds[n - 1] - jds[0]) / YEAR >= RULES.jointMinSpanYears &&
      sectors.size >= RULES.jointMinQuadrants
    )
      return { jds, attempts: attempt };
  }
  throw new Error('no epochs');
}

function jointEnsemble(id, trials, mk) {
  const out = [];
  let redrawn = 0;
  for (let k = 0; k < trials; k++) {
    const u = rng(id, k, 'truth');
    const sky = skyOf(u);
    const { jds, attempts } = jointEpochs(u, 20, 1.2);
    redrawn += attempts;
    const truth = { ...sky, ...mk(u, jds, sky) };
    const s = makeSeries(truth, jds, earth, { seed: `${id}:${k}` });
    const fit = fitJoint(s, earth);
    if (!fit.ok) throw new Error(`${id} trial ${k}: ${fit.code}`);
    out.push({ truth, fit });
  }
  return { out, redrawn };
}

const share = (list, pred) => list.filter(pred).length / list.length;

function coverage() {
  const c1 = C['c1.jointCoverage'];
  const { out: joint, redrawn } = jointEnsemble('c1', c1.trials, u => ({
    parallax: 0.02 + 0.18 * u(),
    mu: [2 * u() - 1, 2 * u() - 1],
    sigma: 0.01,
  }));
  for (const [name, get, truthOf] of [
    ['parallax', f => f.params.parallax, t => t.parallax],
    ['mux', f => f.params.mux, t => t.mu[0]],
    ['muy', f => f.params.muy, t => t.mu[1]],
  ]) {
    const z = joint.map(
      ({ fit, truth }) =>
        Math.abs(get(fit).value - truthOf(truth)) / get(fit).sigma
    );
    inBand(
      `c1.jointCoverage.${name}.oneSigma`,
      share(z, v => v <= 1),
      c1.bounds.oneSigma
    );
    inBand(
      `c1.jointCoverage.${name}.oneNinetySix`,
      share(z, v => v <= 1.96),
      c1.bounds.oneNinetySix
    );
  }
  evidence(
    'c1.jointCoverage.redrawn',
    redrawn,
    'epoch draws that failed the rules and were drawn again'
  );

  const c2 = C['c2.distanceSymmetric'];
  const sym = jointEnsemble('c2', c2.trials, () => ({
    parallax: 0.1,
    mu: [0.3, -0.2],
    sigma: 0.005,
  })).out;
  const covers = (f, d, i) => {
    const iv = f.distance.intervals[i].distance;
    return (
      !iv.empty &&
      (iv.lo === null || d >= iv.lo) &&
      (iv.hi === null || d <= iv.hi)
    );
  };
  inBand(
    'c2.distanceSymmetric.level68',
    share(sym, s => covers(s.fit, 1 / s.truth.parallax, 0)),
    c2.bounds.level68
  );
  inBand(
    'c2.distanceSymmetric.level95',
    share(sym, s => covers(s.fit, 1 / s.truth.parallax, 1)),
    c2.bounds.level95
  );
  within(
    'c2.distanceSymmetric.openShare',
    share(sym, s => s.fit.distance.intervals.some(i => i.distance.hi === null)),
    c2.bounds.openShareAtMost
  );

  const c3 = C['c3.distanceAsymmetric'];
  const asym = [];
  for (let k = 0; k < c3.trials; k++) {
    const u = rng('c3', k, 'truth');
    const sky = skyOf(u);
    const { jds } = jointEpochs(u, 20, 1.2);
    const design = fitJoint(
      makeSeries(
        { ...sky, parallax: 0.05, mu: [0.1, 0.1], sigma: 0.01 },
        jds,
        earth,
        { noise: false, seed: 'c3d' }
      ),
      earth
    );
    const truth = {
      ...sky,
      parallax: 2.5 * design.params.parallax.sigma,
      mu: [2 * u() - 1, 2 * u() - 1],
      sigma: 0.01,
    };
    asym.push({
      truth,
      fit: fitJoint(makeSeries(truth, jds, earth, { seed: `c3:${k}` }), earth),
    });
  }
  inBand(
    'c3.distanceAsymmetric.level68',
    share(asym, s => covers(s.fit, 1 / s.truth.parallax, 0)),
    c3.bounds.level68
  );
  inBand(
    'c3.distanceAsymmetric.level95',
    share(asym, s => covers(s.fit, 1 / s.truth.parallax, 1)),
    c3.bounds.level95
  );
  const closed = asym.filter(s => {
    const iv = s.fit.distance.intervals[0].distance;
    return !iv.empty && iv.hi !== null && s.fit.distance.value !== null;
  });
  const arm =
    closed.reduce((a, s) => {
      const iv = s.fit.distance.intervals[0].distance;
      const d = s.fit.distance.value;
      return a + (iv.hi - d) / (d - iv.lo);
    }, 0) / closed.length;
  row(
    'c3.distanceAsymmetric.asymmetry',
    arm,
    `at least ${c3.bounds.asymmetryAtLeast}`,
    arm >= c3.bounds.asymmetryAtLeast
  );
  evidence(
    'c3.distanceAsymmetric.openShare68',
    share(asym, s => s.fit.distance.intervals[0].distance.hi === null),
    'share of 0.6827 intervals open above'
  );

  const c4 = C['c4.pmCoverage'];
  const pm = [];
  for (let k = 0; k < c4.trials; k++) {
    const u = rng('c4', k, 'truth');
    const sky = skyOf(u);
    const span = (2 + 3 * u()) * YEAR;
    const start = jdRange[0] + u() * 3000;
    const jds = [
      start,
      ...Array.from({ length: 4 }, () => start + span * u()).sort(
        (a, b) => a - b
      ),
      start + span,
    ];
    const truth = {
      ...sky,
      x0: 0,
      y0: 0,
      mu: [2 * u() - 1, 2 * u() - 1],
      sigma: 0.02,
    };
    pm.push({
      truth,
      fit: fitMotion(linearSeries(truth, jds, `c4:${k}`), {
        tangent: [sky.ra, sky.dec],
      }),
      jds,
    });
  }
  for (const [name, get, truthOf] of [
    ['mux', f => f.params.mux, t => t.mu[0]],
    ['muy', f => f.params.muy, t => t.mu[1]],
  ]) {
    const z = pm.map(
      ({ fit, truth }) =>
        Math.abs(get(fit).value - truthOf(truth)) / get(fit).sigma
    );
    inBand(
      `c4.pmCoverage.${name}.oneSigma`,
      share(z, v => v <= 1),
      c4.bounds.oneSigma
    );
    inBand(
      `c4.pmCoverage.${name}.oneNinetySix`,
      share(z, v => v <= 1.96),
      c4.bounds.oneNinetySix
    );
  }
  const fa = Math.max(
    share(joint, s => s.fit.verdict === 'inconsistent'),
    share(pm, s => s.fit.verdict === 'inconsistent')
  );
  within('c5.falseAlarm.worstOfTwo', fa, C['c5.falseAlarm'].bounds.atMost);

  const c6 = C['c6.shiftCoverage'];
  const sh = [];
  for (let k = 0; k < c6.trials; k++) {
    const u = rng('c6', k, 'truth');
    const sky = skyOf(u);
    const t0 = jdRange[0] + u() * 3000;
    const dt = 0.5 + 2.5 * u();
    const truth = {
      ...sky,
      x0: 0,
      y0: 0,
      mu: [2 * u() - 1, 2 * u() - 1],
      sigma: 0.02,
    };
    const s = linearSeries(truth, [t0, t0 + dt * YEAR], `c6:${k}`);
    // the tangent point is the mean of the two positions, so make the plane the truth's
    const r = twoEpochShift({ ...s.epochs[0] }, { ...s.epochs[1] }, {});
    sh.push({ truth, dt, r });
  }
  for (const [name, axis, mi] of [
    ['x', 'x', 0],
    ['y', 'y', 1],
  ]) {
    const z = sh.map(
      ({ truth, dt, r }) =>
        Math.abs(r.displacement[axis].value - truth.mu[mi] * dt) /
        r.displacement[axis].sigma
    );
    inBand(
      `c6.shiftCoverage.${name}.oneSigma`,
      share(z, v => v <= 1),
      c6.bounds.oneSigma
    );
    inBand(
      `c6.shiftCoverage.${name}.oneNinetySix`,
      share(z, v => v <= 1.96),
      c6.bounds.oneNinetySix
    );
  }
}

// ---- (d) refusals and negative cases ---------------------------------------------------

function refusals() {
  const mk = (
    jds,
    truth = { ra: 150, dec: 20, parallax: 0.1, mu: [0.2, 0.1], sigma: 0.01 },
    seed = 'd'
  ) => makeSeries(truth, jds, earth, { seed });
  const start = jdOf('2026-01-01');
  const codes = [];
  const expect = (name, r, code) => {
    const ok =
      code === null ? r.ok === true : r.ok === false && r.code === code;
    codes.push([name, ok, r.code ?? (r.ok ? 'ok' : '?')]);
  };
  expect(
    'two epochs',
    fitJoint(mk([start, start + 200]), earth),
    'too-few-epochs'
  );
  expect(
    'seven epochs',
    fitJoint(mk(evenEpochs(start, 365, 7)), earth),
    'too-few-epochs'
  );
  expect('half a year', fitJoint(mk(evenEpochs(start, 182, 8)), earth), 'span');
  const two = [
    ...[0, 8, 16, 24].map(d => jdOf('2026-02-01') + d),
    ...[0, 8, 16, 24].map(d => jdOf('2027-05-01') + d),
  ];
  const tw = fitJoint(mk(two), earth);
  expect('two sectors', tw, 'phase-coverage');
  expect(
    'identical epochs',
    fitJoint(mk(Array(8).fill(start)), earth),
    'no-baseline'
  );
  const edge = [
    0,
    20,
    40,
    120,
    140,
    160,
    300,
    RULES.jointMinSpanYears * YEAR + 0.01,
  ].map(d => start + d);
  const ok = fitJoint(mk(edge), earth);
  expect('exactly the rules', ok, null);
  row(
    'd1.jointRefusals',
    codes.filter(c => !c[1]).length,
    'all refusal codes right',
    codes.every(c => c[1]) && tw.data?.sectors === 2 && ok.sectors === 3,
    codes.map(c => `${c[0]}: ${c[2]}`).join('; ')
  );

  let labelled = 0;
  for (let k = 0; k < 200; k++) {
    const u = rng('d2', k);
    const sky = skyOf(u);
    const dt = 1 + 4000 * u();
    const s = linearSeries(
      { ...sky, x0: 0, y0: 0, mu: [0.1, 0.1], sigma: 0.02 },
      [start, start + dt],
      `d2:${k}`
    );
    const r = twoEpochShift(s.epochs[0], s.epochs[1], { earth });
    if (
      r.ok &&
      r.label === SHIFT_LABEL &&
      !('parallax' in r) &&
      !('distance' in r)
    )
      labelled++;
  }
  within(
    'd2.twoEpochLabel.labelShare',
    labelled / 200 - 1,
    0,
    `${labelled} of 200`
  );

  const d3 = C['d3.wrongTimeScale'];
  for (const shift of [45, 91.3, 182.6, 273.9]) {
    let fail = 0;
    let names = 0;
    let flagged = 0;
    for (let k = 0; k < d3.trialsEach; k++) {
      const u = rng('d3', shift, k);
      const sky = skyOf(u);
      const s = mk(
        evenEpochs(start + 400 * u(), 365, 24),
        { ...sky, parallax: 0.15, mu: [0.2, -0.1], sigma: 0.004 },
        `d3:${shift}:${k}`
      );
      const bad = {
        epochs: s.epochs.map(e => ({
          ...e,
          time: { ...e.time, value: e.time.value + shift },
        })),
      };
      const r = fitJoint(bad, earth);
      if (r.ok && r.verdict === 'inconsistent') {
        fail++;
        if (
          r.hints.includes('epoch-time-scale') &&
          /time scale/.test(r.message)
        )
          names++;
      }
      if (
        r.ok &&
        (r.verdict === 'inconsistent' ||
          r.warnings.includes('negative-parallax')) &&
        r.hints.includes('epoch-time-scale') &&
        /time scale/.test(r.message)
      )
        flagged++;
    }
    evidence(
      `d3.wrongTimeScale.shift${shift}.flaggedWithNegativeParallaxWarning`,
      flagged / d3.trialsEach,
      'added after the first measurement: share flagged by the failed test or by a parallax negative by more than 3 sigma, naming the time scale (not part of the committed leg)'
    );
    inBand(`d3.wrongTimeScale.shift${shift}.failShare`, fail / d3.trialsEach, [
      d3.bounds.failShare,
      1,
    ]);
    within(
      `d3.wrongTimeScale.shift${shift}.namesTimeScale`,
      names / Math.max(1, fail) - 1,
      0,
      `${names} of ${fail}`
    );
  }

  {
    const s = mk(evenEpochs(start, 365, 24));
    const asMjd = {
      epochs: s.epochs.map(e => ({ ...e, time: { ...e.time, format: 'mjd' } })),
    };
    const mjdAsJd = {
      epochs: s.epochs.map(e => ({
        ...e,
        time: { ...e.time, value: e.time.value - 2400000.5, format: 'jd' },
      })),
    };
    const r1 = fitJoint(asMjd, earth);
    const r2 = fitJoint(mjdAsJd, earth);
    row(
      'd4.unitConfusion',
      0,
      'epoch-range naming the format; proper motion not refused',
      r1.code === 'epoch-range' &&
        /MJD/.test(r1.message) &&
        r2.code === 'epoch-range' &&
        /JD/.test(r2.message) &&
        fitMotion(asMjd).ok &&
        fitMotion(mjdAsJd).ok
    );
    const old = jdOf('2010-03-01');
    const s10 = linearSeries(
      { ra: 10, dec: 10, x0: 0, y0: 0, mu: [0.1, 0.1], sigma: 0.01 },
      evenEpochs(old, 400, 12),
      'd5'
    );
    const r = fitJoint(s10, earth);
    row(
      'd5.outsideEphemeris',
      0,
      'epoch-range with the pack range; proper motion works',
      r.code === 'epoch-range' &&
        r.data.startJd === earth.range.startJd &&
        fitMotion(s10).ok
    );
  }
  {
    const base = linearSeries(
      { ra: 30, dec: 40, x0: 0, y0: 0, mu: [0.1, 0.1], sigma: 0.01 },
      evenEpochs(start, 800, 5),
      'd6',
      { noise: false }
    );
    const cases = [
      ['nan', e => (e.epochs[2].ra = NaN), 'bad-position'],
      ['negative sigma', e => (e.epochs[1].sigma = -1), 'bad-sigma'],
      ['zero sigma', e => (e.epochs[1].sigma = 0), 'bad-sigma'],
      ['unknown scale', e => (e.epochs[0].time.scale = 'tai'), 'bad-epoch'],
      ['unknown format', e => (e.epochs[0].time.format = 'iso'), 'bad-epoch'],
      ['declination 91', e => (e.epochs[3].dec = 91), 'bad-position'],
      ['empty', e => (e.epochs = []), 'no-series'],
      ['too wide', e => (e.epochs[4].dec += 3), 'too-wide'],
      [
        'too many',
        e =>
          (e.epochs = Array.from({ length: 2001 }, (_, i) => ({
            ...base.epochs[i % 5],
          }))),
        'too-many',
      ],
    ];
    const bad = [];
    for (const [name, mutate, code] of cases) {
      const s = JSON.parse(JSON.stringify(base));
      mutate(s);
      const r = fitMotion(s);
      if (!(r.ok === false && r.code === code))
        bad.push(`${name}: ${r.code ?? 'ok'}`);
    }
    row(
      'd6.malformed',
      bad.length,
      'every refusal code right',
      bad.length === 0,
      bad.join('; ')
    );
  }
  {
    const d7 = C['d7.outlier'];
    let fail = 0;
    let found = 0;
    for (let k = 0; k < d7.trials; k++) {
      const u = rng('d7', k);
      const sky = skyOf(u);
      const s = mk(
        evenEpochs(start + 300 * u(), 365, 24),
        { ...sky, parallax: 0.1, mu: [0.2, 0.1], sigma: 0.01 },
        `d7:${k}`
      );
      s.epochs[11].dec += (12 * 0.01) / 3600;
      const r = fitJoint(s, earth);
      if (r.verdict === 'inconsistent') fail++;
      if (r.worst === 11) found++;
    }
    inBand('d7.outlier.failShare', fail / d7.trials, [d7.bounds.failShare, 1]);
    inBand('d7.outlier.locatedShare', found / d7.trials, [
      d7.bounds.locatedShare,
      1,
    ]);
  }
  {
    let ok = 0;
    for (let k = 0; k < 200; k++) {
      const u = rng('d8', k);
      const sky = skyOf(u);
      const s = mk(
        evenEpochs(start + 300 * u(), 365, 16),
        { ...sky, parallax: 0.05, mu: [0.2, 0.1], sigma: 0.01 },
        `d8:${k}`
      );
      const r = fitJoint(s, earth);
      const d = r.distance;
      if (
        r.zeroPoint?.kind === 'relative' &&
        d?.intervals.length === 2 &&
        d.intervals.every(i => i.method === 'profile' && i.assumes.length) &&
        d.assumptions.length &&
        d.parallax.used === 'relative'
      )
        ok++;
    }
    within('d8.frameStatement.statementShare', ok / 200 - 1, 0, `${ok} of 200`);
    const s = mk(evenEpochs(start, 365, 16));
    const noSource = fitJoint(
      {
        ...s,
        reference: {
          correction: { value: 0.001, sigma: 0.0005, source: '  ' },
        },
      },
      earth
    );
    const withIt = fitJoint(
      {
        ...s,
        reference: {
          name: 'stars',
          correction: { value: 0.001, sigma: 0.0005, source: 'a typed value' },
        },
      },
      earth
    );
    row(
      'd8.frameStatement.correction',
      0,
      'refused without a source; absolute = relative + correction with both shown',
      noSource.code === 'correction-source' &&
        withIt.ok &&
        Math.abs(
          withIt.distance.parallax.absolute.value -
            (withIt.params.parallax.value + 0.001)
        ) < 1e-15 &&
        withIt.zeroPoint.correction.source === 'a typed value' &&
        withIt.distance.parallax.used === 'absolute'
    );
  }
  {
    const d9 = C['d9.zeroParallax'];
    const sigma = 0.01;
    const open = [];
    let shown = 0;
    for (let k = 0; k < d9.trials; k++) {
      const u = rng('d9', k, 'truth');
      const sky = skyOf(u);
      const { jds } = jointEpochs(u, 20, 1.2);
      // a star with no parallax and no motion: the position and the noise only
      const g = gaussian(rng('d9', k, 'noise'));
      const s = {
        epochs: jds.map(jd => {
          const p = unstandard([sky.ra, sky.dec], g() * sigma, g() * sigma);
          return {
            time: { value: jd, format: 'jd', scale: 'tdb' },
            ra: p.ra,
            dec: p.dec,
            sigma,
          };
        }),
      };
      const f = fitJoint(s, earth);
      open.push(f.distance.intervals[0].distance.hi === null);
      if (f.params.parallax.value <= 0 && f.distance.value !== null) shown++;
    }
    inBand(
      'd9.zeroParallax.openShare',
      share(open, v => v),
      d9.bounds.openShare
    );
    within(
      'd9.zeroParallax.pointForNonPositive',
      shown,
      0,
      'point distances shown for a non-positive parallax'
    );
  }
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  analytic();
  oracle();
  coverage();
  refusals();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = runValidation();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag = r.evidence
        ? 'evidence'
        : r.pass === null
          ? 'NOT RUN'
          : r.pass
            ? 'pass'
            : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(9)}${r.id.padEnd(46)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
