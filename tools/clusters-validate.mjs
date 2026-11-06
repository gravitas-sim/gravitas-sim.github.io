#!/usr/bin/env node
// =============================================================================
// The galaxy-cluster kernel against its committed thresholds (Prompt 250)
// -----------------------------------------------------------------------------
//   npm run clusters:validate                    print the table
//   npm run clusters:validate -- --json          print it as JSON
//   npm run clusters:validate -- --write-results rewrite tests/fixtures/clusters/results.json
//   npm run clusters:validate -- --write-failed  rewrite tests/fixtures/clusters/failed-legs.json
//   --only=A1,B1                                 run the legs whose id starts with these
//
// tests/fixtures/clusters/thresholds.json fixed every bound before js/kernels/galaxy/clusters existed
// (GALAXY_CLUSTERS.md); this reads the bounds from that file, not from copies. The B rows read
// tests/fixtures/clusters/oracle-results.json, which tools/clusters-oracle/oracle.py wrote (numpy, scipy,
// astropy; no Gravitas code). The E rows wait for tables nobody has supplied and are NOT RUN. The kernel
// verdict is computed from the rows by the function committed in the thresholds, not read by eye.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { G_SI, PARSEC_M, SOLAR_MASS_KG } from '../js/constants.js';
import { createCosmology } from '../js/kernels/cosmology/flrw.js';
import { levelOfSigma, normalCdf } from '../js/kernels/statistics/index.js';
import { stream } from '../js/random/streams.js';
import * as K from '../js/kernels/galaxy/clusters/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/clusters';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const AUTH_DIR = path.join(ROOT, DIR, 'authentic');

const lim = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const MPC = PARSEC_M * 1e6;
const COSMO = INPUTS.cosmology;
const L1 = levelOfSigma(1);
const LEVELS = [L1, 0.95];
const C = 299792.458;
const DEG = Math.PI / 180;
const SEED = THRESHOLDS.seeds;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const factorPhys = (frac = 0) => ({
  value: K.kPhys(),
  sigma: frac * K.kPhys(),
  source: 'toy world: 2 / x_half (thresholds.json worlds.toyCluster)',
  radiusKind: 'half-number',
});
const ERR = 'tuning of the leg, not a citation';
const TUNING = { ...INPUTS.tuning, source: ERR };

/** Run one analysis on a world, forwarding every world field the kernel reads. */
const analyse = (w, extra = {}) =>
  K.analyseCluster({ ...w, cosmology: COSMO, factor: factorPhys(), ...extra });

/** Coverage bookkeeping: counts of answered worlds and of intervals holding the truth, per level. */
function tally(levels) {
  return { n: 0, refused: 0, cover: levels.map(() => 0), z: [] };
}

/**
 * Run the legs.
 * @param {{only?: string[], authDir?: string}} [opts]
 * @returns {Promise<object[]>} rows {id, status, measured, note}
 */
export async function runValidation({ only = [], authDir = AUTH_DIR } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();
  const cosmoLeg = createCosmology(COSMO);

  // ---- A1 ------------------------------------------------------------------------------
  if (wanted('A1')) {
    const L = lim('A1');
    let worstAbs = 0;
    let worstRatio = 0;
    for (const zc of [0.01, 0.0231, 0.1, 0.4])
      for (const v of [-5000, -800, 0, 800, 5000]) {
        const z = zc + ((1 + zc) * v) / C;
        worstAbs = Math.max(worstAbs, Math.abs(K.restVelocity(z, zc) - v));
        if (v !== 0 && Math.abs(v) <= L.vMaxKms) {
          const g = (1 + z) / (1 + zc);
          const vRel = (C * (g * g - 1)) / (g * g + 1);
          worstRatio = Math.max(
            worstRatio,
            Math.abs(K.restVelocity(z, zc) - vRel) /
              Math.abs(K.restVelocity(z, zc)) /
              (Math.abs(v) / C)
          );
        }
      }
    row(
      'A1.restVelocity',
      worstAbs <= L.maxAbsKms && worstRatio <= L.relativisticBound,
      { worstAbsKms: worstAbs, worstRelativisticRatio: sig(worstRatio) }
    );
  }

  // ---- A2 ------------------------------------------------------------------------------
  if (wanted('A2')) {
    const L = lim('A2');
    const phi = a => Math.exp(-0.5 * a * a) / Math.sqrt(2 * Math.PI);
    const V = a => 1 - (2 * a * phi(a)) / (2 * normalCdf(a) - 1);
    const xs = [2, 3, 4, 5].map(k => K.truncationFactor(k));
    const res = xs.map((x, i) => Math.abs(x * x - V([2, 3, 4, 5][i] * x)));
    const inc = xs[0] < xs[1] && xs[1] < xs[2] && xs[2] < xs[3] && xs[3] < 1;
    const refusals = [1.5, Math.sqrt(3)].map(k => K.truncationFactor(k));
    const refOk = refusals.every(
      r => r.status === 'refused' && r.code === 'bad-clip-level'
    );
    row(
      'A2.truncationFixedPoint',
      Math.max(...res) <= L.residual &&
        inBand(xs[1], L.xStar3Bracket) &&
        inc &&
        refOk,
      {
        xStar: xs.map(x => sig(x, 10)),
        worstResidual: Math.max(...res),
        increasing: inc,
        refused: refOk,
      }
    );
  }

  // ---- A3 and A4 -----------------------------------------------------------------------
  const V7 = [-450, -250, -100, 0, 120, 280, 400];
  const z7 = V7.map(v => 0.0231 + (1.0231 * v) / C);
  const zbar = mean(z7);
  const v7 = z7.map(z => K.restVelocity(z, zbar));
  if (wanted('A3')) {
    const L = lim('A3');
    const s0 = Math.sqrt(527800 / 6);
    const off = K.dispersion(v7, { kappa: 3, truncationCorrection: false });
    const on = K.dispersion(v7, { kappa: 3 });
    const x = K.truncationFactor(3);
    const shifted = K.dispersion(
      v7.map(v => v + 1234.5),
      { kappa: 3, truncationCorrection: false }
    );
    const reversed = K.dispersion([...v7].reverse(), {
      kappa: 3,
      truncationCorrection: false,
    });
    const scaled = K.dispersion(
      v7.map(v => 3 * v),
      { kappa: 3, truncationCorrection: false }
    );
    const m = {
      off: rel(off.kms, s0),
      on: rel(on.kms, s0 / x),
      shift: rel(shifted.kms, off.kms),
      perm: rel(reversed.kms, off.kms),
      scale: rel(scaled.kms, 3 * off.kms),
    };
    row(
      'A3.plainDispersion',
      Object.values(m).every(v => v <= L.maxRel),
      m
    );
  }
  if (wanted('A4')) {
    const L = lim('A4');
    const s = Math.sqrt(527800 / 6);
    const e100 = K.dispersion(v7, {
      kappa: 3,
      truncationCorrection: false,
      errorsKms: V7.map(() => 100),
    });
    const sInt = Math.sqrt(527800 / 6 - 100 ** 2);
    const errExpect = ((s / sInt) * s) / Math.sqrt(2 * 6);
    const e300 = K.dispersion(v7, { kappa: 3, errorsKms: V7.map(() => 300) });
    const bw = K.dispersion(v7, {
      method: 'biweight',
      kappa: 3,
      errorsKms: V7.map(() => 100),
      biweightTuning: TUNING,
    });
    const m = {
      sigmaInt: rel(e100.kms, sInt),
      error: rel(e100.sigmaKms, errExpect),
    };
    const ok =
      Object.values(m).every(v => v <= L.maxRel) &&
      e300.status === 'not-constrained' &&
      e300.code === 'errors-exceed-scatter' &&
      bw.status === 'refused' &&
      bw.code === 'errors-with-biweight';
    row('A4.errorSubtraction', ok, {
      ...m,
      e300: e300.code,
      biweight: bw.code,
    });
  }

  // ---- A5 ------------------------------------------------------------------------------
  const virial = (Kf, sKms, R, relK = 0, relS = 0, relR = 0) =>
    K.virialMass({
      sigmaKms: sKms,
      sigmaSigmaKms: relS * sKms,
      radiusMpc: R,
      sigmaRadiusMpc: relR * R,
      factor: {
        value: Kf,
        sigma: relK * Kf,
        source: 'leg',
        radiusKind: 'half-number',
      },
      levels: [L1],
    });
  if (wanted('A5')) {
    const L = lim('A5');
    let worst = 0;
    for (const [Kf, s, R] of [
      [6, 1000, 1],
      [5.5, 700, 1.5],
      [10, 400, 0.8],
    ]) {
      const closed = (Kf * (s * 1000) ** 2 * (R * MPC)) / G_SI;
      worst = Math.max(worst, rel(virial(Kf, s, R).kg, closed));
    }
    const a = virial(6, 1000, 1, 0.1, 0.05, 0.08);
    const sExpect = Math.sqrt(0.1 ** 2 + (2 * 0.05) ** 2 + 0.08 ** 2);
    const sNoFactor = Math.sqrt((2 * 0.05) ** 2 + 0.08 ** 2);
    const nf = virial(6, 1000, 1, 0, 0.05, 0.08);
    const m = {
      mass: worst,
      sLnM: rel(a.relSigma, sExpect),
      lo: rel(a.intervals[0].lo, a.kg * Math.exp(-sExpect)),
      hi: rel(a.intervals[0].hi, a.kg * Math.exp(sExpect)),
      noFactorLo: rel(nf.intervals[0].lo, nf.kg * Math.exp(-sNoFactor)),
      withoutFactorField: rel(
        a.intervalsWithoutFactor[0].lo,
        a.kg * Math.exp(-sNoFactor)
      ),
      quadruple: rel(virial(6, 2000, 1).kg, 4 * virial(6, 1000, 1).kg),
    };
    row(
      'A5.massClosed',
      Object.values(m).every(v => v <= L.maxRel),
      m
    );
  }

  // ---- A6 ------------------------------------------------------------------------------
  if (wanted('A6')) {
    const L = lim('A6');
    const dest = (ra0, dec0, bearing, delta) => {
      const p0 = dec0 * DEG;
      const dec = Math.asin(
        Math.sin(p0) * Math.cos(delta) +
          Math.cos(p0) * Math.sin(delta) * Math.cos(bearing)
      );
      const ra =
        ra0 * DEG +
        Math.atan2(
          Math.sin(bearing) * Math.sin(delta) * Math.cos(p0),
          Math.cos(delta) - Math.sin(p0) * Math.sin(dec)
        );
      return { ra: ra / DEG, dec: dec / DEG };
    };
    const centre = { ra: 150, dec: 20 };
    const nine = Array.from({ length: 9 }, (_, i) =>
      dest(centre.ra, centre.dec, i * 40 * DEG, (i + 1) * 1e-3)
    );
    const r1 = K.projectedRadius({
      sky: nine,
      centre,
      daMpc: 100,
      kind: 'half-number',
      draws: 20,
      seed: 'A6',
    });
    const half = rel(r1.mpc, 5e-3 * 100);
    const harm = [];
    for (const N of L.ringN) {
      const ring = Array.from({ length: N }, (_, k) =>
        dest(
          centre.ra,
          centre.dec,
          (2 * Math.PI * k) / N,
          L.ringAngularRadiusRad
        )
      );
      const r = K.projectedRadius({
        sky: ring,
        centre,
        daMpc: 100,
        kind: 'harmonic',
        draws: 20,
        seed: 'A6',
      });
      let sum = 0;
      for (let k = 1; k < N; k++) sum += 1 / (2 * Math.sin((Math.PI * k) / N));
      harm.push(rel(r.mpc, ((N - 1) / sum) * L.ringAngularRadiusRad * 100));
    }
    const s1 = K.separation(0, 0, 1e-3 / DEG, 0);
    const s2 = K.separation(1e-3 / DEG, 0, 0, 0);
    const sepRel = rel(s1, 1e-3);
    const m = {
      halfNumber: half,
      harmonic: Math.max(...harm),
      separation: sepRel,
      symmetricBitwise: s1 === s2,
    };
    row(
      'A6.regularGeometry',
      half <= L.halfNumberMaxRel &&
        Math.max(...harm) <= L.harmonicMaxRel &&
        sepRel <= L.separationMaxRel &&
        s1 === s2,
      m
    );
  }

  // ---- A7 ------------------------------------------------------------------------------
  if (wanted('A7')) {
    const L = lim('A7');
    const P = x => 1 - Math.sqrt(1 - x * x) + x * Math.acos(x);
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (P(mid) < 0.5) lo = mid;
      else hi = mid;
    }
    const xh = 0.5 * (lo + hi);
    const w = K.clusterWorld({
      seed: SEED.A14,
      index: 0,
      cosmology: COSMO,
      N: L.monteCarloN,
      rt: 1,
      interloperFraction: 0,
      errorKms: 0,
    });
    const d = Float64Array.from(
      w.galaxies,
      g =>
        K.separation(g.ra, g.dec, w.centre.ra, w.centre.dec) *
        w.truth.angularDiameterMpc
    ).sort();
    const med = 0.5 * (d[d.length / 2 - 1] + d[d.length / 2]);
    const r = rel(med, xh);
    row(
      'A7.truncatedSphereGeometry',
      inBand(xh, L.xHalfBracket) && r <= L.maxRel,
      {
        xHalf: sig(xh, 10),
        sampleMedian: sig(med, 6),
        rel: sig(r),
        kPhys: sig(2 / xh, 8),
      }
    );
  }

  // ---- A8 ------------------------------------------------------------------------------
  if (wanted('A8')) {
    const L = lim('A8');
    const lnChoose = (n, k) => {
      let s = 0;
      for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
      return s;
    };
    let worstShort = Infinity;
    let closedWorst = 0;
    let monotone = true;
    for (const level of LEVELS) {
      const alpha = 1 - level;
      for (const n of L.n) {
        const ci = Array.from({ length: n + 1 }, (_, k) =>
          K.clopperPearson(k, n, level)
        );
        for (let k = 1; k <= n; k++)
          if (!(ci[k].lo >= ci[k - 1].lo && ci[k].hi >= ci[k - 1].hi))
            monotone = false;
        closedWorst = Math.max(
          closedWorst,
          Math.abs(ci[0].lo),
          Math.abs(ci[0].hi - (1 - (alpha / 2) ** (1 / n))),
          Math.abs(ci[n].hi - 1),
          Math.abs(ci[n].lo - (alpha / 2) ** (1 / n))
        );
        for (const p of L.p) {
          let cover = 0;
          for (let k = 0; k <= n; k++)
            if (ci[k].lo <= p && p <= ci[k].hi)
              cover += Math.exp(
                lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)
              );
          worstShort = Math.min(worstShort, cover - level);
        }
      }
    }
    row(
      'A8.clopperPearsonExactCoverage',
      worstShort >= -L.coverageSlack &&
        closedWorst <= L.closedFormMaxAbs &&
        monotone,
      {
        worstCoverageMinusLevel: sig(worstShort, 6),
        closedFormWorstAbs: closedWorst,
        monotone,
      }
    );
  }

  // ---- A9 ------------------------------------------------------------------------------
  if (wanted('A9')) {
    const L = lim('A9');
    const x = [1, 2, 2, 3, 3, 3, 4, 4, 5, 9];
    const n = x.length;
    const m = mean(x);
    const m2 = mean(x.map(v => (v - m) ** 2));
    const m4 = mean(x.map(v => (v - m) ** 4));
    const g2 = m4 / (m2 * m2) - 3;
    const G2 = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
    const se = Math.sqrt(
      (24 * n * (n - 1) ** 2) / ((n - 3) * (n - 2) * (n + 3) * (n + 5))
    );
    const r = K.excessKurtosis(x);
    const two = K.excessKurtosis([1, 2]);
    row(
      'A9.kurtosisAndSe',
      Math.abs(r.g2 - G2) <= L.maxAbs &&
        Math.abs(r.se - se) <= L.maxAbs &&
        two.status === 'refused',
      {
        g2: sig(r.g2, 10),
        diff: Math.abs(r.g2 - G2),
        seDiff: Math.abs(r.se - se),
      }
    );
  }

  // ---- A10 and A11 ---------------------------------------------------------------------
  if (wanted('A10')) {
    const L = lim('A10');
    const mem = [15.2, 16.0, 17.1].map(m => ({
      mag: m,
      magErr: 0.05,
      k: 0.05,
      A: 0.1,
    }));
    const dlMpc = cosmoLeg.luminosityDistance(0.05);
    const dm = 5 * Math.log10(dlMpc * 1e5);
    const lum = m => 10 ** (-0.4 * (m - dm - 0.05 - 0.1 - 4.5));
    const solar = { value: 4.5, source: 'invented for the test' };
    let worst = 0;
    for (const g of mem)
      worst = Math.max(
        worst,
        rel(
          K.clusterLight({ members: [g], dm, solarAbsMag: solar, limitMag: 99 })
            .sumSolar,
          lum(g.mag)
        )
      );
    const r = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: solar,
      limitMag: 16.5,
    });
    const sum = lum(15.2) + lum(16.0);
    const err =
      (0.4 *
        Math.LN10 *
        Math.sqrt((lum(15.2) * 0.05) ** 2 + (lum(16.0) * 0.05) ** 2)) /
      sum;
    const mis = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: solar,
      limitMag: 16.5,
      missing: { fraction: 0.2, sigma: 0.05, source: 'invented' },
    });
    const noSrc = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: { value: 4.5, source: '' },
      limitMag: 16.5,
    });
    const m = {
      each: worst,
      sum: rel(r.sumSolar, sum),
      error: rel(r.relSigma, err),
      missing: rel(mis.solar, sum / 0.8),
      missingErr: rel(mis.relSigma, Math.hypot(err, 0.05 / 0.8)),
      distanceModulus: Math.abs(cosmoLeg.distanceModulus(0.05) - dm),
    };
    const ok =
      Object.values(m).every(v => v <= L.maxRel) &&
      r.used === 2 &&
      r.fainterThanLimit === 1 &&
      noSrc.status === 'refused' &&
      noSrc.code === 'missing-solar-source';
    row('A10.lightClosed', ok, { ...m, used: r.used, refused: noSrc.code });
  }
  if (wanted('A11')) {
    const L = lim('A11');
    const a = K.massToLight({
      massKg: 5e14 * SOLAR_MASS_KG,
      massRelSigma: 0.2,
      light: { solar: 1e12, relSigma: 0.1, lowerBound: true },
    });
    const b = K.massToLight({
      massKg: 5e14 * SOLAR_MASS_KG,
      massRelSigma: 0.2,
      light: { solar: 1e12, relSigma: 0.1, lowerBound: false },
    });
    const m = {
      value: rel(a.value, 500),
      relSigma: rel(a.relSigma, Math.hypot(0.2, 0.1)),
    };
    row(
      'A11.massToLightClosed',
      Object.values(m).every(v => v <= L.maxRel) &&
        a.upperBound === true &&
        b.upperBound === false,
      { ...m, upperBound: a.upperBound }
    );
  }

  // ---- A12 -----------------------------------------------------------------------------
  if (wanted('A12')) {
    const L = lim('A12');
    const mat = s =>
      Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 5 }, (_, j) => s * Math.abs(i - j))
      );
    const d1 = K.localDensities(mat(1), 2);
    const d5 = K.localDensities(mat(1), 5);
    const d05 = K.localDensities(mat(0.5), 2);
    const closed = [
      2 / (Math.PI * 4),
      2 / Math.PI,
      2 / Math.PI,
      2 / Math.PI,
      2 / (Math.PI * 4),
    ];
    let worst = Math.max(...closed.map((c, i) => Math.abs(d1[i] - c)));
    const closed05 = [
      2 / (Math.PI * 1),
      2 / (Math.PI * 0.25),
      2 / (Math.PI * 0.25),
      2 / (Math.PI * 0.25),
      2 / (Math.PI * 1),
    ];
    worst = Math.max(worst, ...closed05.map((c, i) => Math.abs(d05[i] - c)));
    const isClass = [true, false, true, false, true];
    const b1 = K.morphologyDensity({
      density: d1,
      isClass,
      edgesLog10: [-1, 0, 1],
    });
    const b2 = K.morphologyDensity({
      density: d05,
      isClass,
      edgesLog10: [-1, 0, 1],
    });
    const ok =
      worst <= L.maxAbs &&
      d5.every(Number.isNaN) &&
      b1.bins[0].n === 5 &&
      b1.bins[0].k === 3 &&
      b1.bins[1].n === 0 &&
      b1.bins[1].fraction === null &&
      b2.bins[0].n === 2 &&
      b2.bins[0].k === 2 &&
      b2.bins[1].n === 3 &&
      b2.bins[1].k === 1 &&
      Math.abs(b2.bins[1].fraction - 1 / 3) <= L.maxAbs;
    row('A12.localDensity', ok, {
      worstAbs: worst,
      bins1: b1.bins.map(b => [b.n, b.k]),
      bins2: b2.bins.map(b => [b.n, b.k]),
    });
  }

  // ---- A13 -----------------------------------------------------------------------------
  if (wanted('A13')) {
    const L = lim('A13');
    const gas = {
      value: 1.5e14,
      sigma: 1.5e13,
      source: 'invented',
      aperture: 'invented',
    };
    const stars = { value: 2e13, sigma: 2e12, source: 'invented' };
    const r = K.baryonBudget({
      mass: { value: 1e15, relSigma: 0.2 },
      gas,
      stars,
    });
    const fg = 0.15;
    const fgRel = Math.hypot(0.1, 0.2);
    const tot = 1.7e14;
    const fbRel = Math.hypot(Math.hypot(1.5e13, 2e12) / tot, 0.2);
    const m = {
      gas: rel(r.gasFraction.value, fg),
      gasRel: rel(r.gasFraction.relSigma, fgRel),
      baryon: rel(r.baryonFraction.value, 0.17),
      baryonRel: rel(r.baryonFraction.relSigma, fbRel),
    };
    const codes = [
      K.baryonBudget({
        mass: { value: 1e15, relSigma: 0.2 },
        gas: { ...gas, source: '' },
      }).code,
      K.baryonBudget({
        mass: { value: 1e15, relSigma: 0.2 },
        gas: { ...gas, sigma: 0 },
      }).code,
      K.baryonBudget({
        mass: { value: 1e15, relSigma: 0.2 },
        gas: { ...gas, aperture: '' },
      }).code,
    ];
    row(
      'A13.baryonBudget',
      Object.values(m).every(v => v <= L.maxRel) &&
        codes.join() === 'missing-gas-source,bad-gas,missing-gas-aperture',
      { ...m, codes }
    );
  }

  // ---- A14 -----------------------------------------------------------------------------
  if (wanted('A14')) {
    const L = lim('A14');
    const per = [];
    let ok = true;
    for (const index of L.indices) {
      const w = K.clusterWorld({ seed: SEED.A14, index, cosmology: COSMO });
      const r = analyse(w, { levels: [L1] });
      if (r.status !== 'ok') {
        ok = false;
        per.push({ index, status: r.status, code: r.code });
        continue;
      }
      const zS = (r.dispersion.kms - w.truth.sigma) / r.dispersion.sigmaKms;
      const zM = Math.log(r.mass.kg / w.truth.massKg) / r.mass.relSigma;
      const truthSet = new Set(w.truth.memberIds);
      const kept = r.members.ids;
      const comp = kept.filter(i => truthSet.has(i)).length / w.truth.members;
      const pur = kept.filter(i => truthSet.has(i)).length / kept.length;
      const good =
        Math.abs(zS) <= L.zMax &&
        Math.abs(zM) <= L.zMax &&
        comp >= L.completeness &&
        pur >= L.purity &&
        r.members.passes <= L.maxPasses &&
        r.members.converged;
      if (!good) ok = false;
      per.push({
        index,
        zSigma: sig(zS),
        zMass: sig(zM),
        completeness: sig(comp),
        purity: sig(pur),
        passes: r.members.passes,
        n: r.members.n,
      });
    }
    row('A14.syntheticClusterRecovery', ok, per);
  }

  // ---- B legs --------------------------------------------------------------------------
  const needB = ['B1', 'B2', 'B4'].some(wanted);
  const kernelWorlds = [];
  if (needB) {
    for (const w of INPUTS.worlds)
      kernelWorlds.push(
        K.analyseCluster({
          galaxies: w.galaxies,
          centre: w.centre,
          zGuess: w.zGuess,
          aperture: { radiusMpc: w.apertureMpc },
          velocityExtentKms: w.velocityExtentKms,
          cosmology: COSMO,
          factor: w.factor,
          levels: w.levels,
          morphology: {
            neighbours: 5,
            classes: ['early'],
            edgesLog10: [-1, 0, 1, 2],
          },
        })
      );
  }
  if (wanted('B1')) {
    const L = lim('B1');
    const worst = { z: 0, sigma: 0, x: 0, bwScale: 0, bwLoc: 0 };
    let setsEqual = 0;
    let statusOk = 0;
    ORACLE.worlds.forEach((o, i) => {
      const k = kernelWorlds[i];
      if (o.status !== k.status) return;
      statusOk++;
      if (o.status !== 'ok') return;
      if (JSON.stringify(o.members) === JSON.stringify(k.members.ids))
        setsEqual++;
      worst.z = Math.max(worst.z, rel(k.redshift.zc, o.zc));
      worst.sigma = Math.max(worst.sigma, rel(k.dispersion.raw, o.sRaw));
      worst.x = Math.max(worst.x, rel(k.dispersion.truncationFactor, o.xstar));
      const gal = INPUTS.worlds[i].galaxies;
      const zs = k.members.ids.map(j => gal[j].z);
      const v = zs.map(z => K.restVelocity(z, k.redshift.zc));
      const b = K.biweight(v, INPUTS.tuning);
      worst.bwScale = Math.max(worst.bwScale, rel(b.scale, o.biweightScale));
      worst.bwLoc = Math.max(
        worst.bwLoc,
        rel(K.biweight(zs, INPUTS.tuning).location, o.biweightLocation)
      );
    });
    const ok =
      statusOk === L.worlds &&
      setsEqual === L.worlds &&
      worst.z <= L.zMaxRel &&
      worst.sigma <= L.sigmaMaxRel &&
      worst.x <= L.xStarMaxRel &&
      worst.bwScale <= L.biweightMaxRel &&
      worst.bwLoc <= L.biweightMaxRel;
    row('B1.dispersionOracle', ok, {
      statusAgree: statusOk,
      keptSetsEqual: setsEqual,
      worstRel: Object.fromEntries(
        Object.entries(worst).map(([a, b]) => [a, b])
      ),
    });
  }
  if (wanted('B2')) {
    const L = lim('B2');
    const worst = { da: 0, half: 0, harmonic: 0, mass: 0, interval: 0 };
    ORACLE.worlds.forEach((o, i) => {
      const k = kernelWorlds[i];
      if (o.status !== 'ok' || k.status !== 'ok') return;
      const w = INPUTS.worlds[i];
      worst.da = Math.max(worst.da, rel(k.redshift.angularDiameterMpc, o.da));
      worst.half = Math.max(worst.half, rel(k.radius.mpc, o.rHalf));
      const sky = k.members.ids.map(j => ({
        ra: w.galaxies[j].ra,
        dec: w.galaxies[j].dec,
      }));
      const h = K.projectedRadius({
        sky,
        centre: w.centre,
        daMpc: k.redshift.angularDiameterMpc,
        kind: 'harmonic',
        draws: 10,
        seed: 'B2',
      });
      worst.harmonic = Math.max(worst.harmonic, rel(h.mpc, o.rHarmonic));
      worst.mass = Math.max(worst.mass, rel(k.mass.kg, o.massKg));
      if (o.intervals) {
        const m = K.virialMass({
          sigmaKms: k.dispersion.kms,
          sigmaSigmaKms: k.dispersion.sigmaKms,
          radiusMpc: k.radius.mpc,
          sigmaRadiusMpc: w.declaredSigmaRadiusMpc,
          factor: w.factor,
          levels: w.levels,
        });
        o.intervals.forEach((iv, j) => {
          worst.interval = Math.max(
            worst.interval,
            rel(m.intervals[j].lo, iv.lo),
            rel(m.intervals[j].hi, iv.hi)
          );
        });
        worst.interval = Math.max(worst.interval, rel(m.relSigma, o.sLnM));
      }
    });
    const xh = rel(K.xHalf(), ORACLE.xHalf);
    const kp = rel(K.kPhys(), ORACLE.kPhys);
    const ok =
      worst.da <= L.distanceMaxRel &&
      worst.half <= L.radiusMaxRel &&
      worst.harmonic <= L.radiusMaxRel &&
      worst.mass <= L.massMaxRel &&
      worst.interval <= L.intervalMaxRel &&
      xh <= L.xHalfMaxRel &&
      kp <= L.xHalfMaxRel;
    row('B2.geometryAndMassOracle', ok, { ...worst, xHalf: xh, kPhys: kp });
  }
  if (wanted('B3')) {
    const L = lim('B3');
    let worst = 0;
    for (const r of ORACLE.binom) {
      const c = K.clopperPearson(r.k, r.n, r.level);
      worst = Math.max(worst, Math.abs(c.lo - r.lo), Math.abs(c.hi - r.hi));
    }
    row('B3.binomialOracle', worst <= L.maxAbs, {
      rows: ORACLE.binom.length,
      worstAbs: worst,
    });
  }
  if (wanted('B4')) {
    const L = lim('B4');
    const worst = { g2: 0, se: 0, density: 0 };
    let binsEqual = 0;
    let answered = 0;
    ORACLE.worlds.forEach((o, i) => {
      const k = kernelWorlds[i];
      if (o.status !== 'ok' || k.status !== 'ok') return;
      answered++;
      worst.g2 = Math.max(worst.g2, rel(k.diagnostics.gaussianity.g2, o.g2));
      worst.se = Math.max(worst.se, rel(k.diagnostics.gaussianity.se, o.se));
      k.morphology.densities.forEach(
        (d, j) =>
          (worst.density = Math.max(worst.density, rel(d, o.density[j])))
      );
      if (
        k.morphology.bins.every(
          (b, j) => b.n === o.bins[j].n && b.k === o.bins[j].k
        )
      )
        binsEqual++;
    });
    row(
      'B4.kurtosisDensityOracle',
      answered > 0 &&
        binsEqual === answered &&
        worst.g2 <= L.kurtosisMaxRel &&
        worst.se <= L.kurtosisMaxRel &&
        worst.density <= L.densityMaxRel,
      { answered, binCountsEqual: binsEqual, ...worst }
    );
  }
  if (wanted('B5')) {
    const L = lim('B5');
    let worst = 0;
    ORACLE.lightWorlds.forEach((o, i) => {
      const w = INPUTS.lightWorlds[i];
      const dm = createCosmology(COSMO).distanceModulus(w.zc);
      const r = K.clusterLight({
        members: w.members,
        dm,
        solarAbsMag: { value: w.solarAbsMag, source: 'invented for the test' },
        limitMag: w.limitMag,
        missing: w.missing ? { ...w.missing, source: 'invented' } : null,
      });
      const ml = K.massToLight({
        massKg: w.massKg,
        massRelSigma: w.massRelSigma,
        light: r,
      });
      worst = Math.max(
        worst,
        rel(dm, o.dm),
        rel(r.sumSolar, o.sum),
        rel(r.solar, o.solar),
        rel(r.relSigma, o.relSigma),
        rel(ml.value, o.ml),
        rel(ml.relSigma, o.mlRel),
        r.used === o.used ? 0 : 1
      );
    });
    row('B5.lightOracle', worst <= L.maxRel, {
      worlds: ORACLE.lightWorlds.length,
      worstRel: worst,
    });
  }

  // ---- C1, C1b, D2 false flags, D3 false flags, D5 passes -------------------------------
  let clean = null;
  if (['C1', 'D2', 'D3', 'D5'].some(wanted)) {
    const worlds = lim('C1').worlds;
    const t = tally(LEVELS);
    const flags = { gaussian: 0, contaminated: 0 };
    let maxPasses = 0;
    let notConverged = 0;
    for (let i = 0; i < worlds; i++) {
      const w = K.clusterWorld({ seed: SEED.C1, index: i, cosmology: COSMO });
      const r = analyse(w, { levels: LEVELS, draws: 50 });
      if (r.status !== 'ok') {
        t.refused++;
        if (r.code === 'clip-not-converged') notConverged++;
        continue;
      }
      t.n++;
      maxPasses = Math.max(maxPasses, r.members.passes);
      if (r.flags.includes('non-gaussian')) flags.gaussian++;
      if (r.flags.includes('contaminated')) flags.contaminated++;
      r.dispersion.intervals.forEach((iv, j) => {
        if (iv.lo <= w.truth.sigma && w.truth.sigma <= iv.hi) t.cover[j]++;
      });
      t.z.push((r.dispersion.kms - w.truth.sigma) / r.dispersion.sigmaKms);
    }
    clean = { t, flags, maxPasses, notConverged, worlds };
  }
  if (wanted('C1') && clean) {
    const L = lim('C1');
    const { t } = clean;
    const c68 = t.cover[0] / t.n;
    const c95 = t.cover[1] / t.n;
    const mz = mean(t.z);
    const ok =
      inBand(c68, L.cover68) &&
      inBand(c95, L.cover95) &&
      inBand(mz, L.meanZ) &&
      t.n >= L.answeredMin;
    row('C1.dispersionCoverage', ok, {
      answered: t.n,
      cover68: sig(c68),
      cover95: sig(c95),
      meanZ: sig(mz),
    });
  }
  if (wanted('C1b')) {
    const L = lim('C1b');
    const t = tally(LEVELS);
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({ seed: SEED.C1, index: i, cosmology: COSMO });
      const r = analyse(w, {
        levels: LEVELS,
        uncertainty: 'bootstrap',
        draws: L.draws,
      });
      if (r.status !== 'ok') {
        t.refused++;
        continue;
      }
      t.n++;
      r.dispersion.intervals.forEach((iv, j) => {
        if (iv.lo <= w.truth.sigma && w.truth.sigma <= iv.hi) t.cover[j]++;
      });
    }
    const c68 = t.cover[0] / t.n;
    const c95 = t.cover[1] / t.n;
    row(
      'C1b.dispersionBootstrapCoverage',
      inBand(c68, L.cover68) && inBand(c95, L.cover95),
      { answered: t.n, cover68: sig(c68), cover95: sig(c95) }
    );
  }

  // ---- C2, C3, R7 ----------------------------------------------------------------------
  const massEnsemble = (seed, worlds, o) => {
    const t = tally(LEVELS);
    const noFactor = LEVELS.map(() => 0);
    for (let i = 0; i < worlds; i++) {
      const w = K.clusterWorld({
        seed,
        index: i,
        cosmology: COSMO,
        ...o.world,
      });
      const r = analyse(w, {
        levels: LEVELS,
        factor: factorPhys(o.factorFrac ?? 0),
      });
      if (r.status !== 'ok') {
        t.refused++;
        continue;
      }
      t.n++;
      r.mass.intervals.forEach((iv, j) => {
        if (iv.lo <= w.truth.massKg && w.truth.massKg <= iv.hi) t.cover[j]++;
      });
      r.mass.intervalsWithoutFactor.forEach((iv, j) => {
        if (iv.lo <= w.truth.massKg && w.truth.massKg <= iv.hi) noFactor[j]++;
      });
    }
    return { t, noFactor };
  };
  if (wanted('C2')) {
    const L = lim('C2');
    const { t } = massEnsemble(SEED.C2, L.worlds, {});
    const c68 = t.cover[0] / t.n;
    const c95 = t.cover[1] / t.n;
    row(
      'C2.massCoverageStatistical',
      inBand(c68, L.cover68) && inBand(c95, L.cover95),
      { answered: t.n, cover68: sig(c68), cover95: sig(c95) }
    );
  }
  let c3 = null;
  if (wanted('C3') || wanted('R7')) {
    const L = lim('C3');
    c3 = massEnsemble(SEED.C3, L.worlds, {
      world: { etaSigma: L.etaSigma },
      factorFrac: L.etaSigma,
    });
  }
  if (wanted('C3') && c3) {
    const L = lim('C3');
    const c68 = c3.t.cover[0] / c3.t.n;
    const c95 = c3.t.cover[1] / c3.t.n;
    row(
      'C3.massCoverageWithFactor',
      inBand(c68, L.cover68) && inBand(c95, L.cover95),
      { answered: c3.t.n, cover68: sig(c68), cover95: sig(c95) }
    );
  }

  // ---- C4 ------------------------------------------------------------------------------
  if (wanted('C4')) {
    const L = lim('C4');
    const t = tally(LEVELS);
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.C4,
        index: i,
        cosmology: COSMO,
        light: true,
      });
      const r = analyse(w, { levels: LEVELS, draws: 20, light: w.light });
      if (r.status !== 'ok' || r.light.status !== 'ok') {
        t.refused++;
        continue;
      }
      t.n++;
      r.light.intervals.forEach((iv, j) => {
        if (iv.lo <= w.truth.lightSolar && w.truth.lightSolar <= iv.hi)
          t.cover[j]++;
      });
    }
    const c68 = t.cover[0] / t.n;
    const c95 = t.cover[1] / t.n;
    row('C4.lightCoverage', inBand(c68, L.cover68) && inBand(c95, L.cover95), {
      answered: t.n,
      cover68: sig(c68),
      cover95: sig(c95),
    });
  }

  // ---- C5 ------------------------------------------------------------------------------
  if (wanted('C5')) {
    const L = lim('C5');
    const comp = [];
    const pur = [];
    let refused = 0;
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({ seed: SEED.C5, index: i, cosmology: COSMO });
      const r = analyse(w, { draws: 20 });
      if (r.status !== 'ok') {
        refused++;
        continue;
      }
      const truthSet = new Set(w.truth.memberIds);
      const hit = r.members.ids.filter(j => truthSet.has(j)).length;
      comp.push(hit / w.truth.members);
      pur.push(hit / r.members.ids.length);
    }
    row(
      'C5.membershipRecovery',
      mean(comp) >= L.completenessMean && mean(pur) >= L.purityMean,
      {
        answered: comp.length,
        notAnswered: refused,
        meanCompleteness: sig(mean(comp)),
        meanPurity: sig(mean(pur)),
      }
    );
  }

  // ---- D1 ------------------------------------------------------------------------------
  if (wanted('D1')) {
    const L = lim('D1');
    const per = [];
    let ok = true;
    for (const N of L.counts) {
      const w = K.clusterWorld({
        seed: 'clusters-D1',
        index: N,
        cosmology: COSMO,
        N,
        interloperFraction: 0,
      });
      const r = analyse(w, { draws: 20 });
      const good =
        r.status === 'not-constrained' &&
        r.code === 'too-few-members' &&
        !r.mass;
      if (!good) ok = false;
      per.push({ N, status: r.status, code: r.code });
    }
    const w20 = K.clusterWorld({
      seed: 'clusters-D1',
      index: 20,
      cosmology: COSMO,
      N: 20,
      interloperFraction: 0,
    });
    const r20 = analyse(w20, { draws: 20 });
    const fine =
      r20.status === 'ok'
        ? r20.members.n >= L.minimum
        : r20.status === 'not-constrained' && r20.code === 'too-few-members';
    if (!fine) ok = false;
    per.push({
      N: 20,
      status: r20.status,
      code: r20.code,
      members: r20.members?.n,
    });
    row('D1.fewMembers', ok, per);
  }

  // ---- D2 and D3 -----------------------------------------------------------------------
  if (wanted('D2')) {
    const L = lim('D2');
    let answered = 0;
    let flagged = 0;
    let handled = 0;
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.D2,
        index: i,
        cosmology: COSMO,
        kind: 'bimodal',
        N: 300,
        rt: 1.5,
      });
      const r = analyse(w, { draws: 20 });
      if (r.status !== 'ok') {
        handled++;
        continue;
      }
      answered++;
      if (r.flags.includes('non-gaussian')) flagged++;
    }
    const share = answered ? flagged / answered : 0;
    const falseRate = clean ? clean.flags.gaussian / clean.t.n : NaN;
    row(
      'D2.nonGaussianFlag',
      share >= L.flaggedMin && falseRate <= L.falseFlagMax,
      {
        answered,
        flagged,
        handledByStatus: handled,
        flaggedShare: sig(share),
        cleanFalseFlagRate: sig(falseRate),
      }
    );
  }
  if (wanted('D3')) {
    const L = lim('D3');
    let answered = 0;
    let flagged = 0;
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.D3,
        index: i,
        cosmology: COSMO,
        interloperFraction: 0.5,
      });
      const r = analyse(w, { draws: 20 });
      if (r.status !== 'ok') continue;
      answered++;
      if (r.flags.includes('contaminated')) flagged++;
    }
    const share = answered ? flagged / answered : 0;
    const falseRate = clean ? clean.flags.contaminated / clean.t.n : NaN;
    const w0 = K.clusterWorld({
      seed: SEED.D3,
      index: 0,
      cosmology: COSMO,
      interloperFraction: 0.5,
    });
    const noExt = analyse(
      { ...w0, velocityExtentKms: undefined },
      { draws: 20 }
    );
    const unknown =
      noExt.status === 'ok' &&
      noExt.diagnostics.contamination.status === 'unknown' &&
      !noExt.flags.includes('contaminated');
    row(
      'D3.contaminationFlag',
      share >= L.flaggedMin && falseRate <= L.falseFlagMax && unknown,
      {
        answered,
        flagged,
        flaggedShare: sig(share),
        cleanFalseFlagRate: sig(falseRate),
        unknownWithoutExtent: unknown,
      }
    );
  }

  // ---- D4 ------------------------------------------------------------------------------
  if (wanted('D4')) {
    const w = K.clusterWorld({
      seed: 'clusters-D4',
      index: 1,
      cosmology: COSMO,
      interloperFraction: 0.02,
    });
    const base = { ...w, cosmology: COSMO, factor: factorPhys(), draws: 20 };
    const expect = (name, r, status, code) => ({
      name,
      got: `${r.status}/${r.code ?? ''}`,
      ok:
        r.status === status &&
        (code === undefined || r.code === code) &&
        !r.mass,
    });
    const cases = [];
    cases.push(
      expect(
        'no factor',
        K.analyseCluster({ ...base, factor: undefined }),
        'refused',
        'missing-factor'
      )
    );
    const bad1 = K.analyseCluster({
      ...base,
      factor: { ...factorPhys(), value: 0 },
    });
    const bad2 = K.analyseCluster({
      ...base,
      factor: { ...factorPhys(), sigma: -1 },
    });
    cases.push({
      name: 'bad factor',
      got: `${bad1.code}+${bad2.code}`,
      ok: bad1.code === 'bad-factor' && bad2.code === 'bad-factor',
    });
    cases.push(
      expect(
        'empty factor source',
        K.analyseCluster({ ...base, factor: { ...factorPhys(), source: '' } }),
        'refused',
        'missing-factor-source'
      )
    );
    cases.push(
      expect(
        'radius mismatch',
        K.analyseCluster({ ...base, radiusKind: 'harmonic' }),
        'refused',
        'factor-radius-mismatch'
      )
    );
    const c1 = K.analyseCluster({
      ...base,
      cosmology: { H0: 70, Om: 0.3, OL: 0.8 },
    });
    const c2 = K.analyseCluster({
      ...base,
      cosmology: { H0: -70, Om: 0.3, OL: 0.7 },
    });
    cases.push({
      name: 'cosmology',
      got: `${c1.code}+${c2.code}`,
      ok:
        c1.status === 'refused' &&
        c1.code === 'bad-cosmology' &&
        c2.status === 'refused' &&
        c2.code === 'bad-cosmology',
    });
    const junk = [
      { ra: 1, dec: 1, z: NaN },
      { ra: 1, dec: 1, z: -1 },
      { ra: 1, dec: 1, z: Infinity },
    ];
    const withJunk = K.analyseCluster({
      ...base,
      galaxies: [...base.galaxies, ...junk],
    });
    const onlyJunk = K.analyseCluster({ ...base, galaxies: junk });
    cases.push({
      name: 'bad redshifts',
      got: `${withJunk.status} dropped ${withJunk.members?.dropped} / ${onlyJunk.code}`,
      ok:
        withJunk.status === 'ok' &&
        withJunk.members.dropped === 3 &&
        onlyJunk.code === 'too-few-members',
    });
    cases.push(
      expect(
        'aperture 0',
        K.analyseCluster({ ...base, aperture: { radiusMpc: 0 } }),
        'refused',
        'bad-aperture'
      )
    );
    cases.push(
      expect(
        'empty list',
        K.analyseCluster({ ...base, galaxies: [] }),
        'not-constrained',
        'too-few-members'
      )
    );
    cases.push(
      expect(
        'no solar source',
        K.analyseCluster({
          ...base,
          light: { solarAbsMag: { value: 4.5, source: '' }, limitMag: 20 },
        }),
        'refused',
        'missing-solar-source'
      )
    );
    cases.push(
      expect(
        'neighbours',
        K.analyseCluster({
          ...base,
          morphology: { neighbours: 0, classes: [], edgesLog10: [0, 1] },
        }),
        'refused',
        'bad-neighbours'
      )
    );
    const noTuning = K.analyseCluster({
      ...base,
      galaxies: base.galaxies.map(g => ({ ...g, zErr: undefined })),
      method: 'biweight',
    });
    cases.push(
      expect('biweight without tuning', noTuning, 'refused', 'missing-tuning')
    );
    cases.push(
      expect(
        'clip level 1.5',
        K.analyseCluster({ ...base, kappa: 1.5 }),
        'refused',
        'bad-clip-level'
      )
    );
    row(
      'D4.inputRefusals',
      cases.length === lim('D4').cases && cases.every(c => c.ok),
      cases
    );
  }

  // ---- D5 ------------------------------------------------------------------------------
  if (wanted('D5')) {
    const L = lim('D5');
    const w = K.clusterWorld({
      seed: SEED.D3,
      index: 1,
      cosmology: COSMO,
      interloperFraction: 0.5,
    });
    const r = analyse(w, { draws: 20, maxPasses: 1 });
    const ok =
      r.status === 'not-constrained' &&
      r.code === 'clip-not-converged' &&
      r.passes === 1 &&
      clean.maxPasses <= L.maxPasses &&
      clean.notConverged === 0;
    row('D5.clipIterationCap', ok, {
      forcedOne: `${r.status}/${r.code}`,
      passesReported: r.passes,
      ensembleMaxPasses: clean.maxPasses,
      ensembleNotConverged: clean.notConverged,
    });
  }

  // ---- E legs --------------------------------------------------------------------------
  const note = existsSync(authDir)
    ? 'a directory exists at tests/fixtures/clusters/authentic but this contract has no reader for it yet'
    : 'no table was supplied (tests/fixtures/clusters/authentic is absent) and nothing was fetched; the exact request is in GALAXY_CLUSTERS.md';
  for (const id of [
    'E1.comaPublished',
    'E2.independentAnalysis',
    'E3.morphologyDensityAuthentic',
    'E4.massToLightAuthentic',
  ])
    if (wanted(id)) notRun(id, note);

  // ---- R legs --------------------------------------------------------------------------
  const rWorlds = (seed, n, o, extra = {}) => {
    const zs = [];
    let flagged = 0;
    let answered = 0;
    for (let i = 0; i < n; i++) {
      const w = K.clusterWorld({ seed, index: i, cosmology: COSMO, ...o });
      const r = analyse(w, { draws: 20, ...extra });
      if (r.status !== 'ok') continue;
      answered++;
      zs.push((r.dispersion.kms - w.truth.sigma) / w.truth.sigma);
      if (r.flags.includes('contaminated')) flagged++;
    }
    return {
      answered,
      meanBias: mean(zs),
      flagged: flagged / Math.max(answered, 1),
    };
  };
  if (wanted('R2'))
    reported(
      'R2.solarMassConvention',
      {
        treeOverAstropy_minus1:
          SOLAR_MASS_KG / ORACLE.constants.astropySolarMassKg - 1,
      },
      'the tree rounds the solar mass; displayed figures keep the tree value'
    );
  if (wanted('R3'))
    reported(
      'R3.gravitationalConstantConvention',
      { treeOverAstropy_minus1: G_SI / ORACLE.constants.astropyG - 1 },
      'the oracle comparison of B2 is run with the tree G as an input'
    );
  if (wanted('R4')) {
    const out = {};
    for (const f of [0, 0.02, 0.05, 0.1, 0.2, 0.5]) {
      const r = rWorlds(`${SEED.R}-ladder-${f}`, 200, {
        interloperFraction: f,
      });
      out[f] = {
        answered: r.answered,
        meanFractionalBias: sig(r.meanBias),
        flaggedContaminated: sig(r.flagged),
      };
    }
    reported(
      'R4.contaminationLadder',
      out,
      "no background correction is applied; the flag is the kernel's only guard"
    );
  }
  if (wanted('R5')) {
    const raw = [];
    const corrected = [];
    const cover = [0, 0];
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const u = stream('noise', `${SEED.R}-R5`, 'n', String(i))();
      const w = K.clusterWorld({
        seed: `${SEED.R}-R5`,
        index: i,
        cosmology: COSMO,
        N: Math.round(Math.exp(Math.log(150) + u * Math.log(2))),
        interloperFraction: 0,
        errorKms: 0,
      });
      const a = analyse(w, { draws: 20, truncationCorrection: false });
      const b = analyse(w, { draws: 20 });
      if (a.status !== 'ok' || b.status !== 'ok') continue;
      n++;
      raw.push((a.dispersion.kms - w.truth.sigma) / w.truth.sigma);
      corrected.push((b.dispersion.kms - w.truth.sigma) / w.truth.sigma);
      if (Math.abs(a.dispersion.kms - w.truth.sigma) <= a.dispersion.sigmaKms)
        cover[0]++;
      if (Math.abs(b.dispersion.kms - w.truth.sigma) <= b.dispersion.sigmaKms)
        cover[1]++;
    }
    reported(
      'R5.truncationCorrectionEffect',
      {
        answered: n,
        rawMeanBias: sig(mean(raw)),
        correctedMeanBias: sig(mean(corrected)),
        rawCover68: sig(cover[0] / n),
        correctedCover68: sig(cover[1] / n),
      },
      'coverage here is at one analytic sigma (0.6827) without the stated errors'
    );
  }
  if (wanted('R6')) {
    const counts = {};
    const sig2 = [];
    let flagged = 0;
    for (let i = 0; i < 100; i++) {
      const w = K.clusterWorld({
        seed: `${SEED.R}-R6`,
        index: i,
        cosmology: COSMO,
        kind: 'field',
        N: 100,
        rt: 1.5,
      });
      const r = analyse(w, { draws: 20 });
      const key = r.status === 'ok' ? 'ok' : r.code;
      counts[key] = (counts[key] ?? 0) + 1;
      if (r.status === 'ok') {
        sig2.push(r.dispersion.kms);
        if (r.flags.length) flagged++;
      }
    }
    reported(
      'R6.fieldWithoutCluster',
      {
        statuses: counts,
        meanDispersionKmsWhenAnswered: sig2.length ? sig(mean(sig2)) : null,
        answeredWithAFlag: flagged,
      },
      'a field of uniform redshifts is a limit the kernel does not detect as such; reported, not judged'
    );
  }
  if (wanted('R7') && c3) {
    const L = lim('C3');
    const hi = massEnsemble(`${SEED.R}-R7`, 200, {
      world: { eta: 0.4 },
      factorFrac: L.etaSigma,
    });
    reported(
      'R7.mismodelledMass',
      {
        c3WithoutFactorCover68: sig(c3.noFactor[0] / c3.t.n),
        c3WithoutFactorCover95: sig(c3.noFactor[1] / c3.t.n),
        eta04FullCover68: sig(hi.t.cover[0] / hi.t.n),
        eta04FullCover95: sig(hi.t.cover[1] / hi.t.n),
      },
      "the factor's stated 0.15 does not cover a true departure of 0.4"
    );
  }
  if (wanted('R8')) {
    const plain = [];
    const bw = [];
    for (let i = 0; i < 200; i++) {
      const w = K.clusterWorld({
        seed: `${SEED.R}-R8`,
        index: i,
        cosmology: COSMO,
        interloperFraction: 0.1,
      });
      const galaxies = w.galaxies.map(g => ({ ra: g.ra, dec: g.dec, z: g.z }));
      const a = analyse({ ...w, galaxies }, { draws: 20 });
      const b = analyse(
        { ...w, galaxies },
        { draws: 20, method: 'biweight', biweight: TUNING }
      );
      if (a.status !== 'ok' || b.status !== 'ok') continue;
      plain.push((a.dispersion.kms - w.truth.sigma) / w.truth.sigma);
      bw.push((b.dispersion.kms - w.truth.sigma) / w.truth.sigma);
    }
    reported(
      'R8.biweightVersusPlain',
      {
        answered: plain.length,
        plainMean: sig(mean(plain)),
        plainSd: sig(sd(plain)),
        biweightMean: sig(mean(bw)),
        biweightSd: sig(sd(bw)),
      },
      "the biweight constants are the leg's tuning, not a citation"
    );
  }
  if (wanted('R1')) {
    const cpu = process.cpuUsage(cpu0);
    const w = K.clusterWorld({
      seed: SEED.R,
      index: 0,
      cosmology: COSMO,
      N: 300,
    });
    const t0 = process.cpuUsage();
    analyse(w);
    const one = process.cpuUsage(t0);
    reported(
      'R1.cpuSeconds',
      {
        legs: sig((cpu.user + cpu.system) / 1e6, 3),
        oneAnalysis300Members: sig((one.user + one.system) / 1e6, 3),
      },
      'CPU seconds, no bound'
    );
  }
  return rows;
}

/** The kernel verdict from the rows, by the committed function. */
export function verdictOf(rows) {
  const G = THRESHOLDS.gate.verdictFunction.kernelLegGroups;
  const st = p => rows.filter(r => r.id.startsWith(`${p}.`)).map(r => r.status);
  const ok = list =>
    list.every(p => st(p).length > 0 && st(p).every(s => s === 'pass'));
  const core = ok(G.closedLegs) && ok(G.oracleLegs) && ok(G.refusalCore);
  const kernelVerdict = !core
    ? 'C'
    : ok(G.flagLegs) && ok(G.coverageLegs)
      ? 'A'
      : 'B';
  const eRows = rows.filter(r => r.id.startsWith('E'));
  return {
    kernelVerdict,
    productVerdict: eRows.every(r => r.status === 'not-run')
      ? 'NOT ESTABLISHED (E1 to E4 NOT RUN: no cluster table was supplied)'
      : 'see the E rows',
    consumers:
      "unmet: no cluster panel, lesson, pack or Coma re-sourcing (Carl's consumers rule of 2026-11-05; no table supplied)",
  };
}

function table(rows) {
  const w = Math.max(...rows.map(r => r.id.length));
  return rows
    .map(
      r =>
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(w)}  ${r.measured === null ? r.note : JSON.stringify(r.measured).slice(0, 220)}`
    )
    .join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',') : [];
  const rows = await runValidation({ only });
  const verdict = verdictOf(rows);
  const counts = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  if (args.includes('--json'))
    console.log(JSON.stringify({ rows, verdict }, null, 1));
  else {
    console.log(table(rows));
    console.log(
      `\n${rows.length} rows: ${JSON.stringify(counts)}  kernel verdict ${verdict.kernelVerdict}`
    );
  }
  const out = path.join(ROOT, DIR);
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(out, 'results.json'),
      JSON.stringify(
        {
          format: 'gravitas.clusters-results/1',
          node: process.version,
          rows: rows.map(r =>
            r.id.startsWith('R1.')
              ? {
                  ...r,
                  measured: null,
                  note: 'CPU seconds vary by machine; not pinned',
                }
              : r
          ),
          gate: verdict,
        },
        null,
        1
      ) + '\n'
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(out, 'failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.clusters-failed-legs/1',
          note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound',
          legs: rows
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        1
      ) + '\n'
    );
}
