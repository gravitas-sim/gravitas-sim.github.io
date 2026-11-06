#!/usr/bin/env node
// =============================================================================
// The enclosed-mass lensing extension against its committed thresholds (Prompt 251)
// -----------------------------------------------------------------------------
//   npm run lensing2:validate                    print the table
//   npm run lensing2:validate -- --json          print it as JSON
//   npm run lensing2:validate -- --write-results rewrite tests/fixtures/lensing2/results.json
//   npm run lensing2:validate -- --write-failed  rewrite tests/fixtures/lensing2/failed-legs.json
//   --only=A1,B1                                 run the legs whose id starts with these
//
// tests/fixtures/lensing2/thresholds.json and gate-thresholds.json fixed every bound before
// js/kernels/lensing/enclosed existed (LENSING_II.md, LENSING_DELAYS_GATE.md); this reads the bounds from
// those files, not from copies. The B and P rows read tests/fixtures/lensing2/oracle-results.json, which
// tools/lensing2-oracle/oracle.py wrote (numpy, scipy, astropy; no Gravitas code). A leg whose authentic
// file was never supplied, or whose prototype does not exist, is NOT RUN and says why. The kernel
// verdict is computed from the rows by the function committed in the thresholds, not read by eye.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gaussian, stream } from '../js/random/streams.js';
import { C_SI, G_SI, PARSEC_M, SOLAR_MASS_KG } from '../js/constants.js';
import {
  ARCSEC,
  finiteSourceMagnification,
  massFromEinstein,
  microlensingFlux,
  pointSourceMagnification,
  pointTimeDelay,
} from '../js/kernels/lensing/index.js';
import * as K from '../js/kernels/lensing/enclosed/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/lensing2';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
export const GATE = read(`${DIR}/gate-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const AUTH_DIR = path.join(ROOT, DIR, 'authentic');

const lim = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const glim = id => GATE.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const MPC = PARSEC_M * 1e6;
const COSMO = {
  H0: INPUTS.cosmology.H0,
  Om: INPUTS.cosmology.Om,
  OL: INPUTS.cosmology.OL,
};
const TRIPLES = THRESHOLDS.worlds.distanceTriplesMpc.map(t =>
  t.map(d => d * MPC)
);
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;

/** The closed form c^2 theta^2 Dl Ds / (4 G Dls) written here, not taken from the kernel. */
const mClosed = (th, dl, ds, dls) =>
  (C_SI * C_SI * th * th * dl * ds) / (4 * G_SI * dls);

/** One ensemble: fit each world's points and push the radius through the mass. */
function runEnsemble(kind, seed, worlds, o = {}) {
  let answered = 0;
  let refused = 0;
  const cover = { 0.68: 0, 0.95: 0 };
  const narrowCover = { 0.68: 0, 0.95: 0 };
  let bracketCover = 0;
  let bracketOk = 0;
  for (let i = 0; i < worlds; i++) {
    const w = K.ensembleWorld({
      seed,
      index: i,
      kind,
      cosmology: COSMO,
      ...o.world,
    });
    const t = w.truth;
    const trueMass = K.enclosedMass(
      t.thetaE,
      t.distancesM.dl,
      t.distancesM.ds,
      t.distancesM.dls
    );
    const fit = K.fitArc(
      w.points,
      o.fixedCentre
        ? { sigma: 1, centre: { x: t.centre.x, y: t.centre.y, sigma: 0 } }
        : { sigma: 1 }
    );
    if (fit.status !== 'ok') {
      refused++;
      continue;
    }
    answered++;
    const px = ARCSEC * t.pixelArcsec;
    for (const level of [0.68, 0.95]) {
      const r = K.massFromArc({
        radius: fit.radius * px,
        sigmaRadius: fit.sigmaRadius * px,
        zl: t.zl,
        zs: t.zs,
        cosmology: COSMO,
        level,
        kind: kind === 'offset' ? 'arc' : 'ring',
        sourceOffsetMax: kind === 'offset' ? o.yMax : undefined,
      });
      if (kind === 'offset') {
        const n = r.statisticalIfOnAxis;
        if (n.lo <= trueMass && trueMass <= n.hi) narrowCover[level]++;
        if (level === 0.68) {
          if (r.bracket.lo <= trueMass && trueMass <= r.bracket.hi)
            bracketCover++;
          if (r.bracket.lo > 0.25 * r.bracket.hi) bracketOk++;
        }
      } else if (r.interval.lo <= trueMass && trueMass <= r.interval.hi)
        cover[level]++;
    }
  }
  return { answered, refused, cover, narrowCover, bracketCover, bracketOk };
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

  // ---- A: closed forms ---------------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1');
    const e = [];
    for (const [dl, ds, dls] of TRIPLES)
      e.push(
        rel(
          K.sigmaCritical(dl, ds, dls),
          (C_SI * C_SI * ds) / (4 * Math.PI * G_SI * dl * dls)
        )
      );
    row('A1.criticalDensity', maxOf(e) <= L.maxRel, {
      worstRel: sig(maxOf(e), 3),
      cases: e.length,
    });
  }

  if (wanted('A2.')) {
    const L = lim('A2');
    const e = { closed: [], pi: [], viaPoint: [], scaling: [] };
    for (const [dl, ds, dls] of TRIPLES)
      for (const ta of L.thetaEArcsec) {
        const th = ta * ARCSEC;
        const m = K.enclosedMass(th, dl, ds, dls);
        e.closed.push(rel(m, mClosed(th, dl, ds, dls)));
        e.pi.push(
          rel(m, Math.PI * K.sigmaCritical(dl, ds, dls) * (th * dl) ** 2)
        );
        e.viaPoint.push(rel(m, massFromEinstein(th, dl, ds, dls)));
        e.scaling.push(rel(K.enclosedMass(2 * th, dl, ds, dls) / m, 4));
      }
    const worst = maxOf(Object.values(e).map(maxOf));
    row('A2.enclosedMassClosed', worst <= L.maxRel, {
      worstRel: sig(worst, 3),
      perPart: Object.fromEntries(
        Object.entries(e).map(([k, v]) => [k, sig(maxOf(v), 3)])
      ),
    });
  }

  if (wanted('A3.')) {
    const L = lim('A3');
    const e = { theta: [], roundTrip: [], mass: [], massClosed: [] };
    for (const [dl, ds, dls] of TRIPLES)
      for (const kms of L.sigmaKms) {
        const s = kms * 1000;
        const th = 4 * Math.PI * (s / C_SI) ** 2 * (dls / ds);
        e.theta.push(rel(K.sisEinsteinAngle(s, ds, dls), th));
        e.roundTrip.push(rel(K.dispersionFromEinstein(th, ds, dls), s));
        const md = K.massFromDispersion({ sigmaMs: s, dl, ds, dls });
        e.mass.push(rel(md.mass, K.enclosedMass(th, dl, ds, dls)));
        e.massClosed.push(rel(md.mass, (Math.PI * s * s * th * dl) / G_SI));
      }
    const worst = maxOf(Object.values(e).map(maxOf));
    row('A3.sisDispersionInput', worst <= L.maxRel, {
      worstRel: sig(worst, 3),
      perPart: Object.fromEntries(
        Object.entries(e).map(([k, v]) => [k, sig(maxOf(v), 3)])
      ),
    });
  }

  if (wanted('A4.')) {
    const L = lim('A4');
    const res = [];
    const sc = [];
    const mag = [];
    for (const y of L.y) {
      const s = K.sisImagePositions(1, y);
      for (const x of s.theta) res.push(Math.abs(x - Math.sign(x) - y));
      mag.push(rel(s.total, y < 1 ? 2 / y : 1 + 1 / y));
      const p = K.pointImagePositions(1, y);
      for (const x of p.theta) res.push(Math.abs(x - 1 / x - y));
      res.push(Math.abs(p.theta[0] * p.theta[1] + 1));
      const a = K.sisImagePositions(2 * ARCSEC, y * 2 * ARCSEC).theta;
      const b = K.sisImagePositions(20 * ARCSEC, y * 20 * ARCSEC).theta;
      a.forEach((v, i) => sc.push(rel(b[i], 10 * v)));
      const pa = K.pointImagePositions(2 * ARCSEC, y * 2 * ARCSEC).theta;
      const pb = K.pointImagePositions(20 * ARCSEC, y * 20 * ARCSEC).theta;
      pa.forEach((v, i) => sc.push(rel(pb[i], 10 * v)));
    }
    row(
      'A4.imagePositions',
      maxOf(res) <= L.maxAbs && maxOf(sc) <= L.maxRel && maxOf(mag) <= L.maxRel,
      {
        worstResidual: sig(maxOf(res), 3),
        worstScaleRel: sig(maxOf(sc), 3),
        worstMagnificationRel: sig(maxOf(mag), 3),
      }
    );
  }

  if (wanted('A5.')) {
    const L = lim('A5');
    const e = [];
    let minRatio = Infinity;
    const ratioErr = [];
    for (const [te, be] of L.cases) {
      const s = K.sisImagePositions(te, be).theta;
      const si = K.invertImages(s[0], s[1], 'sis');
      e.push(rel(si.thetaE, te), rel(si.beta, be));
      const p = K.pointImagePositions(te, be).theta;
      const pi = K.invertImages(p[0], p[1], 'point');
      e.push(rel(pi.thetaE, te), rel(pi.beta, be));
      const plus = Math.abs(p[0]);
      const minus = Math.abs(p[1]);
      const closed = (plus + minus) / (2 * Math.sqrt(plus * minus));
      ratioErr.push(
        rel(pi.disagreement, closed),
        rel(pi.other.thetaE / pi.thetaE, closed)
      );
      minRatio = Math.min(minRatio, pi.disagreement);
    }
    row(
      'A5.imageInversion',
      maxOf(e) <= L.maxRel && maxOf(ratioErr) <= L.maxRel && minRatio >= 1,
      {
        worstRoundTripRel: sig(maxOf(e), 3),
        worstDisagreementRel: sig(maxOf(ratioErr), 3),
        minDisagreement: sig(minRatio, 6),
      }
    );
  }

  if (wanted('A6.')) {
    const L = lim('A6');
    const worst = { fixed: 0, rms: 0, free: 0, centre: 0 };
    let statusOk = true;
    for (const ext of L.extentsDeg) {
      const a = K.syntheticArc({
        centre: { x: L.centrePx[0], y: L.centrePx[1] },
        radius: L.radiusPx,
        extentDeg: ext,
        startDeg: 17,
        n: L.n,
        sigma: 0,
      });
      const fx = K.fitArc(a.points, {
        sigma: 1,
        centre: { x: L.centrePx[0], y: L.centrePx[1] },
      });
      worst.fixed = Math.max(worst.fixed, rel(fx.radius, L.radiusPx));
      worst.rms = Math.max(worst.rms, fx.rms);
      const fr = K.fitArc(a.points, { sigma: 1 });
      statusOk = statusOk && fr.status === 'ok';
      worst.free = Math.max(worst.free, rel(fr.radius, L.radiusPx));
      worst.centre = Math.max(
        worst.centre,
        Math.hypot(fr.centre.x - L.centrePx[0], fr.centre.y - L.centrePx[1])
      );
    }
    row(
      'A6.arcCircleNoiseFree',
      statusOk &&
        worst.fixed <= L.maxRelFixed &&
        worst.rms <= 1e-12 &&
        worst.free <= L.maxRelFree &&
        worst.centre <= L.maxAbsCentrePx,
      {
        fixedRel: sig(worst.fixed, 3),
        fixedRmsPx: sig(worst.rms, 3),
        freeRel: sig(worst.free, 3),
        centrePx: sig(worst.centre, 3),
        freeStatusOk: statusOk,
      }
    );
  }

  if (wanted('A7.')) {
    const L = lim('A7');
    const d = K.lensDistances({ zl: L.zl, zs: L.zs, cosmology: COSMO });
    const M = t => mClosed(t, d.dl, d.ds, d.dls);
    const th = L.thetaEArcsec * ARCSEC;
    const sg = L.sigmaArcsec * ARCSEC;
    const e = [];
    const w = [];
    let structure = true;
    const per = [];
    for (const level of L.levels) {
      const r = K.massFromArc({
        radius: th,
        sigmaRadius: sg,
        zl: L.zl,
        zs: L.zs,
        cosmology: COSMO,
        level,
      });
      e.push(
        rel(r.interval.lo, M(th - r.z * sg)),
        rel(r.interval.hi, M(th + r.z * sg)),
        rel(r.mass, M(th))
      );
      w.push(
        rel((r.interval.hi - r.interval.lo) / r.mass, (4 * r.z * sg) / th)
      );
      structure =
        structure &&
        r.interval.lo < r.mass &&
        r.mass < r.interval.hi &&
        r.interval.hi - r.mass > r.mass - r.interval.lo &&
        r.angular.sigma === sg &&
        r.angular.thetaE === th;
      per.push({
        level,
        z: sig(r.z, 8),
        lo: sig(r.interval.lo, 8),
        hi: sig(r.interval.hi, 8),
      });
    }
    row(
      'A7.intervalStructure',
      structure && maxOf(e) <= L.maxRel && maxOf(w) <= L.maxRelWidth,
      {
        worstRel: sig(maxOf(e), 3),
        worstWidthRel: sig(maxOf(w), 3),
        structure,
        per,
      }
    );
  }

  // ---- B: against the independent oracle ---------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1');
    const e = ORACLE.distances.map(o => {
      const d = K.lensDistances({ zl: o.zl, zs: o.zs, cosmology: COSMO });
      return maxOf([
        rel(d.dl / MPC, o.dlMpc),
        rel(d.ds / MPC, o.dsMpc),
        rel(d.dls / MPC, o.dlsMpc),
      ]);
    });
    row('B1.distances', maxOf(e) <= L.maxRel, {
      worstRel: sig(maxOf(e), 3),
      pairs: e.length,
    });
  }

  if (wanted('B2.')) {
    const L = lim('B2');
    const e = { sigmaCrit: [], mass: [] };
    for (const o of ORACLE.mass) {
      const d = K.lensDistances({ zl: o.zl, zs: o.zs, cosmology: COSMO });
      e.sigmaCrit.push(rel(K.sigmaCritical(d.dl, d.ds, d.dls), o.sigmaCrit));
      e.mass.push(
        rel(
          K.enclosedMass(o.thetaEArcsec * ARCSEC, d.dl, d.ds, d.dls),
          o.massKg
        )
      );
    }
    const worst = maxOf([maxOf(e.sigmaCrit), maxOf(e.mass)]);
    row('B2.sigmaCritAndMass', worst <= L.maxRel, {
      worstRelSigmaCrit: sig(maxOf(e.sigmaCrit), 3),
      worstRelMass: sig(maxOf(e.mass), 3),
      cases: e.mass.length,
    });
  }

  if (wanted('B3.')) {
    const L = lim('B3');
    const pos = [];
    const mu = [];
    for (const o of ORACLE.images) {
      const p = K.pointImagePositions(1, o.y);
      o.point.x.forEach((x, i) => {
        pos.push(Math.abs(p.theta[i] - x));
        mu.push(rel(p.mu[i], o.point.mu[i]));
      });
      const s = K.sisImagePositions(1, o.y);
      if (s.theta.length !== o.sis.x.length) pos.push(1);
      o.sis.x.forEach((x, i) => {
        pos.push(Math.abs(s.theta[i] - x));
        mu.push(rel(s.mu[i], o.sis.mu[i]));
      });
    }
    row(
      'B3.imagesRootFind',
      maxOf(pos) <= L.maxAbs && maxOf(mu) <= L.maxRelMu,
      {
        worstAbsPosition: sig(maxOf(pos), 3),
        worstRelMagnification: sig(maxOf(mu), 3),
        n: ORACLE.images.length,
      }
    );
  }

  if (wanted('B4.')) {
    const L = lim('B4');
    const e = { radius: [], centre: [], sigma: [], fixed: [], fixedSigma: [] };
    const statuses = {};
    INPUTS.arcs.forEach((arc, i) => {
      const o = ORACLE.circles[i];
      const fr = K.fitArc(arc.points, { sigma: arc.sigma });
      statuses[fr.status] = (statuses[fr.status] ?? 0) + 1;
      e.radius.push(rel(fr.radius, o.free.radius));
      e.centre.push(
        Math.hypot(fr.centre.x - o.free.cx, fr.centre.y - o.free.cy)
      );
      e.sigma.push(rel(fr.sigmaRadius, o.free.sigmaRadius));
      const fx = K.fitArc(arc.points, {
        sigma: arc.sigma,
        centre: { x: arc.centre.x, y: arc.centre.y, sigma: 0 },
      });
      e.fixed.push(rel(fx.radius, o.fixed.radius));
      e.fixedSigma.push(rel(fx.sigmaRadius, o.fixed.sigmaRadius));
    });
    const ok =
      maxOf(e.radius) <= L.maxRelRadius &&
      maxOf(e.centre) <= L.maxAbsCentrePx &&
      maxOf(e.sigma) <= L.maxRelSigma &&
      maxOf(e.fixed) <= L.maxRelFixed &&
      maxOf(e.fixedSigma) <= L.maxRelFixed;
    row('B4.circleFitOracle', ok, {
      worstRelRadius: sig(maxOf(e.radius), 3),
      worstCentrePx: sig(maxOf(e.centre), 3),
      worstRelSigma: sig(maxOf(e.sigma), 3),
      worstRelFixed: sig(maxOf(e.fixed), 3),
      worstRelFixedSigma: sig(maxOf(e.fixedSigma), 3),
      freeStatuses: statuses,
    });
  }

  if (wanted('B5.')) {
    const L = lim('B5');
    const iv = INPUTS.interval;
    const e = [];
    const z = [];
    ORACLE.interval.intervals.forEach(o => {
      const r = K.massFromArc({
        radius: iv.thetaEArcsec * ARCSEC,
        sigmaRadius: iv.sigmaArcsec * ARCSEC,
        zl: iv.zl,
        zs: iv.zs,
        cosmology: COSMO,
        level: o.level,
      });
      const bound = o.level === 0.68 ? L.maxRel68 : L.maxRel95;
      e.push({
        level: o.level,
        rel: maxOf([rel(r.interval.lo, o.mcLo), rel(r.interval.hi, o.mcHi)]),
        bound,
      });
      z.push(Math.abs(r.z - o.z));
    });
    row(
      'B5.intervalMonteCarlo',
      e.every(x => x.rel <= x.bound) && maxOf(z) <= L.maxAbsZ,
      {
        perLevel: e.map(x => ({ level: x.level, rel: sig(x.rel, 3) })),
        worstAbsZ: sig(maxOf(z), 3),
      }
    );
  }

  if (wanted('B6.')) {
    if (!existsSync(path.join(authDir, 'tool-pin.json')))
      notRun(
        'B6.citedTool',
        'tests/fixtures/lensing2/authentic/tool-pin.json was not supplied (LENSING_II.md, Files requested from Carl); the cited lens-modelling tool is not installed and nothing was fetched'
      );
    else
      reported(
        'B6.citedTool',
        { file: 'arrived' },
        'the comparison is computed by the analysis the file names'
      );
  }

  // ---- C: coverage on seeded ensembles -----------------------------------------------------

  if (wanted('C1.')) {
    const L = lim('C1');
    const r = runEnsemble('ring', THRESHOLDS.seeds.C1, L.worlds);
    const c68 = r.cover[0.68] / r.answered;
    const c95 = r.cover[0.95] / r.answered;
    row(
      'C1.ringCoverage',
      inBand(c68, L.band68) &&
        inBand(c95, L.band95) &&
        r.refused <= L.maxRefused,
      {
        worlds: L.worlds,
        answered: r.answered,
        refused: r.refused,
        coverage68: sig(c68, 4),
        coverage95: sig(c95, 4),
      }
    );
  }

  if (wanted('C2.')) {
    const L = lim('C2');
    const r = runEnsemble('partial', THRESHOLDS.seeds.C2, L.worlds, {
      world: { extentRangeDeg: [100, 200] },
    });
    const c68 = r.cover[0.68] / r.answered;
    const c95 = r.cover[0.95] / r.answered;
    row(
      'C2.partialArcCoverage',
      inBand(c68, L.band68) &&
        inBand(c95, L.band95) &&
        r.refused / L.worlds <= L.maxRefusedFraction,
      {
        worlds: L.worlds,
        answered: r.answered,
        refused: r.refused,
        coverage68: sig(c68, 4),
        coverage95: sig(c95, 4),
      }
    );
  }

  let offset = null;
  if (wanted('C3.') || wanted('C4.')) {
    const L = lim('C3');
    offset = runEnsemble('offset', THRESHOLDS.seeds.C3, L.worlds, {
      world: { extentRangeDeg: [60, 120], yMax: L.yMax },
      fixedCentre: true,
      yMax: L.yMax,
    });
    if (wanted('C3.')) {
      const cov = offset.bracketCover / offset.answered;
      row(
        'C3.offsetBracket',
        cov >= L.minCoverage && offset.bracketOk === offset.answered,
        {
          worlds: L.worlds,
          answered: offset.answered,
          refused: offset.refused,
          bracketCoverage: sig(cov, 4),
          bracketsWithLowAboveQuarterOfHigh: offset.bracketOk,
        }
      );
    }
    if (wanted('C4.'))
      reported(
        'C4.unwidenedCoverageOffset',
        {
          answered: offset.answered,
          narrow68: sig(offset.narrowCover[0.68] / offset.answered, 4),
          narrow95: sig(offset.narrowCover[0.95] / offset.answered, 4),
        },
        'the narrow statistical interval of an off-axis single arc, no bound committed; the offered answer for such arcs is the bracket'
      );
  }

  // ---- D: refusals -------------------------------------------------------------------------

  if (wanted('D1.')) {
    const base = {
      radius: 3 * ARCSEC,
      sigmaRadius: 0.1 * ARCSEC,
      cosmology: COSMO,
    };
    const cases = [
      ...[undefined, NaN, 0, -1].map(zl => ({
        ...base,
        zl,
        zs: 1,
        want: 'no-lens-redshift',
      })),
      ...[undefined, NaN, 0, -2].map(zs => ({
        ...base,
        zl: 0.3,
        zs,
        want: 'no-source-redshift',
      })),
      { ...base, zl: undefined, zs: undefined, want: 'no-lens-redshift' },
    ];
    let ok = true;
    const got = [];
    for (const c of cases) {
      const r = K.massFromArc(c);
      const good =
        r.status === 'not-constrained' &&
        r.code === c.want &&
        r.mass === null &&
        r.interval === null &&
        r.bracket === null &&
        r.angular.thetaE === base.radius &&
        r.angular.sigma === base.sigmaRadius;
      ok = ok && good;
      got.push(`${r.status}:${r.code}`);
    }
    row('D1.noLensRedshift', ok, {
      cases: cases.length,
      results: [...new Set(got)],
    });
  }

  if (wanted('D2.')) {
    const base = {
      radius: 3 * ARCSEC,
      sigmaRadius: 0.1 * ARCSEC,
      cosmology: COSMO,
    };
    const cases = [
      { ...base, zl: 0.5, zs: 0.5, want: 'source-not-behind-lens' },
      { ...base, zl: 0.5, zs: 0.4, want: 'source-not-behind-lens' },
      {
        ...base,
        zl: 0.3,
        zs: 1,
        cosmology: { H0: 70, Om: 0.3, OL: 0.6 },
        want: 'non-flat-cosmology',
      },
      {
        ...base,
        zl: 0.3,
        zs: 1,
        cosmology: { H0: 0, Om: 0.3, OL: 0.7 },
        want: 'bad-cosmology',
      },
      {
        ...base,
        zl: 0.3,
        zs: 1,
        cosmology: { H0: -70, Om: 0.3, OL: 0.7 },
        want: 'bad-cosmology',
      },
      {
        ...base,
        zl: 0.3,
        zs: 1,
        cosmology: { H0: 70, Om: -0.1, OL: 1.1 },
        want: 'bad-cosmology',
      },
    ];
    let ok = true;
    const got = [];
    for (const c of cases) {
      const r = K.massFromArc(c);
      ok = ok && r.status === 'refused' && r.code === c.want && r.mass === null;
      got.push(`${r.status}:${r.code}`);
    }
    row('D2.geometryRefusals', ok, { cases: cases.length, results: got });
  }

  if (wanted('D3.')) {
    const L = lim('D3');
    let shortRefused = 0;
    let ringRefused = 0;
    for (let i = 0; i < L.arcs; i++) {
      const mk = extentDeg => {
        const u = stream(
          'noise',
          THRESHOLDS.seeds.D3,
          extentDeg === 360 ? 'ring' : 'short',
          String(i)
        );
        const a = K.syntheticArc({
          centre: { x: 256, y: 256 },
          radius: 100,
          extentDeg,
          startDeg: u() * 360,
          n: 12,
          sigma: 1.5,
          normal: gaussian(
            stream(
              'noise',
              THRESHOLDS.seeds.D3,
              extentDeg === 360 ? 'ring' : 'short',
              String(i),
              'position'
            )
          ),
        });
        return K.fitArc(a.points, { sigma: 1.5 });
      };
      const s = mk(L.extentDeg);
      if (s.status === 'not-constrained' && s.code === 'radius-unconstrained')
        shortRefused++;
      const r = mk(360);
      if (r.status !== 'ok') ringRefused++;
    }
    row(
      'D3.shortArcRefusal',
      shortRefused / L.arcs >= L.minRefused &&
        ringRefused / L.arcs <= L.ringsMaxRefused,
      {
        shortArcsRefusedFraction: shortRefused / L.arcs,
        ringsRefusedFraction: ringRefused / L.arcs,
      }
    );
  }

  if (wanted('D4.')) {
    const a = K.invertImages(3, 2);
    const b = K.invertImages(-3, -1);
    const c = K.invertImages(3);
    const d = K.invertImages(0, -1);
    const e = K.invertImages(-2, NaN);
    const f = K.invertImages(-2, 1);
    const ok =
      a.status === 'refused' &&
      a.code === 'images-same-side' &&
      b.status === 'refused' &&
      b.code === 'images-same-side' &&
      c.status === 'not-constrained' &&
      c.code === 'single-image' &&
      c.bound.thetaEAtMost === 3 &&
      c.thetaE === undefined &&
      d.status === 'refused' &&
      d.code === 'bad-position' &&
      e.status === 'refused' &&
      e.code === 'bad-position' &&
      f.status === 'ok' &&
      f.thetaE === 1.5;
    row('D4.imageInversionRefusals', ok, {
      sameSide: a.code,
      negativeSameSide: b.code,
      single: c.code,
      zero: d.code,
      nan: e.code,
      negativeIsInner: f.status,
    });
  }

  if (wanted('D5.')) {
    const L = lim('D5');
    const d = K.lensDistances({ zl: 0.3, zs: 1, cosmology: COSMO });
    const M = t => mClosed(Math.max(t, 0), d.dl, d.ds, d.dls);
    const r0 = 3 * ARCSEC;
    const s0 = 0.1 * ARCSEC;
    const un = K.massFromArc({
      radius: r0,
      sigmaRadius: s0,
      zl: 0.3,
      zs: 1,
      cosmology: COSMO,
      kind: 'arc',
    });
    const bd = K.massFromArc({
      radius: r0,
      sigmaRadius: s0,
      zl: 0.3,
      zs: 1,
      cosmology: COSMO,
      kind: 'arc',
      sourceOffsetMax: 0.1,
    });
    const e = [
      rel(un.bracket.lo, M(r0 / 2 - 2 * s0)),
      rel(un.bracket.hi, M(r0 + 2 * s0)),
      rel(bd.bracket.lo, M(r0 / 1.1 - 2 * s0)),
      rel(bd.bracket.hi, M(r0 + 2 * s0)),
    ];
    const ok =
      maxOf(e) <= L.maxRel &&
      un.interval === null &&
      bd.interval === null &&
      un.mass === null &&
      un.modelLimited === 'offset-unbounded' &&
      bd.modelLimited === 'offset-bounded';
    row('D5.singleArcWithoutOffset', ok, {
      worstRel: sig(maxOf(e), 3),
      flags: [un.modelLimited, bd.modelLimited],
    });
  }

  // ---- E: authentic data (never fetched) ---------------------------------------------------

  const needFile = (id, file, why) => {
    if (!wanted(`${id}.`)) return;
    const name = THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).id;
    if (!existsSync(path.join(authDir, file)))
      notRun(
        name,
        `tests/fixtures/lensing2/authentic/${file} was not supplied (LENSING_II.md, Files requested from Carl); ${why}; nothing was fetched`
      );
    else
      reported(
        name,
        { file: 'arrived' },
        'the comparison is computed by the analysis the file names'
      );
  };
  needFile(
    'E1',
    'cluster.json',
    'no published cluster Einstein radius or mass is typed from memory'
  );
  needFile(
    'E2',
    'arc-marks.json',
    'no image panel, lensing image or confirmed image terms exist on v3 (D-R10-249-01, D-R10-249-02)'
  );
  needFile('E3', 'dispersion.json', 'no lens dispersion is typed from memory');

  // ---- R: reported -------------------------------------------------------------------------

  if (wanted('R2.'))
    reported(
      'R2.solarMassConvention',
      {
        treeSolarMassKg: SOLAR_MASS_KG,
        oracleSolarMassKg: ORACLE.constants.Msun,
        relDifference: sig(rel(SOLAR_MASS_KG, ORACLE.constants.Msun), 3),
      },
      'every mass leg is in kilograms; a displayed solar-mass figure carries this difference'
    );

  // ---- Part B: legs on merged code, then the legs that wait ---------------------------------

  if (wanted('P0.')) {
    const L = glim('P0');
    const e = ORACLE.delay.point.map(o =>
      rel(pointTimeDelay(o.massKg, o.y, o.zl), o.delayS)
    );
    row('P0.pointDelayVsFermat', maxOf(e) <= L.maxRel, {
      worstRel: sig(maxOf(e), 3),
      cases: e.length,
    });
  }
  if (wanted('P1.')) {
    const L = glim('P1');
    const e = ORACLE.finite.map(o =>
      rel(finiteSourceMagnification(o.u, o.rho), o.magnification)
    );
    const centre = L.rho.map(r =>
      rel(finiteSourceMagnification(0, r), Math.sqrt(r * r + 4) / r)
    );
    const worst = ORACLE.finite[e.indexOf(maxOf(e))];
    row(
      'P1.finiteSourceVsDiscIntegral',
      maxOf(e) <= L.maxRel && maxOf(centre) <= L.maxRelCentre,
      {
        worstRel: sig(maxOf(e), 3),
        worstAt: { rho: worst.rho, uOverRho: worst.uOverRho },
        worstRelCentre: sig(maxOf(centre), 3),
        cases: e.length,
      }
    );
  }
  if (wanted('P2.')) {
    const L = glim('P2');
    const A = u => (u * u + 2) / (u * Math.sqrt(u * u + 4));
    const lim1 = L.u.map(u =>
      rel(finiteSourceMagnification(u, L.rho), pointSourceMagnification(u))
    );
    const bl = [];
    for (const fs of [1, 0.6, 0.2])
      for (const u of L.u)
        bl.push(
          rel(
            microlensingFlux([0], { t0: 0, u0: u, tE: 1, fs })[0],
            fs * A(u) + (1 - fs)
          )
        );
    row(
      'P2.finiteSourcePointLimit',
      maxOf(lim1) <= L.maxRel && maxOf(bl) <= L.maxRelBlend,
      {
        worstRelLimit: sig(maxOf(lim1), 3),
        worstAtU: L.u[lim1.indexOf(maxOf(lim1))],
        perU: lim1.map(v => sig(v, 3)),
        worstRelBlend: sig(maxOf(bl), 3),
      }
    );
  }
  for (const c of GATE.checks.filter(c => c.leg === 'prototype'))
    if (wanted(c.id.split('.')[0] + '.'))
      notRun(
        c.id,
        'not run by this validator: the prototype lives on spike/lensing-delays-gate, which is never merged; the recorded result is tests/fixtures/lensing2/gate-spike-results.json (LENSING_DELAYS_GATE.md)'
      );
  for (const [id, file] of [
    ['G6', 'delay.json'],
    ['G9', 'event.json'],
  ])
    if (wanted(`${id}.`)) {
      const name = GATE.checks.find(c => c.id.startsWith(`${id}.`)).id;
      if (!existsSync(path.join(authDir, file)))
        notRun(
          name,
          `tests/fixtures/lensing2/authentic/${file} was not supplied (LENSING_DELAYS_GATE.md, Files requested from Carl); nothing was fetched`
        );
      else
        reported(
          name,
          { file: 'arrived' },
          'the comparison is computed by the analysis the file names'
        );
    }

  const cpu = process.cpuUsage(cpu0);
  const cpuSeconds = sig((cpu.user + cpu.system) / 1e6, 3);
  if (wanted('R1.'))
    reported(
      'R1.cpuSeconds',
      { cpuSeconds },
      'CPU time of this run, recorded and never compared'
    );
  rows.cpuSeconds = cpuSeconds;
  return rows;
}

/** The Part B state: the spike's recorded verdict when its results file is present, plus the merged-code legs. */
function spikeSummary(st) {
  const file = path.join(ROOT, DIR, 'gate-spike-results.json');
  const merged = { P0: st('P0'), P1: st('P1'), P2: st('P2') };
  if (!existsSync(file))
    return {
      verdict: 'none',
      why: 'no spike result is recorded',
      mergedCodeLegs: merged,
    };
  const spike = JSON.parse(readFileSync(file, 'utf8'));
  return {
    verdict: spike.verdict.verdict,
    source: `tests/fixtures/lensing2/gate-spike-results.json (spike/lensing-delays-gate, ${spike.spike.commit})`,
    legs: Object.fromEntries(
      spike.rows.map(r => [r.id.split('.')[0], r.status])
    ),
    mergedCodeLegs: merged,
    note: 'the verdict is the committed function of the spike rows; G6 and G9 have no data, so A is unreachable',
  };
}

/** The kernel verdict and the Part B state, computed from the rows by the functions committed in the thresholds. */
export function gateFrom(rows) {
  const G = THRESHOLDS.gate.verdictFunction.kernelLegGroups;
  const st = p => rows.find(r => r.id.startsWith(`${p}.`))?.status;
  const ok = list => list.every(p => st(p) === 'pass');
  const core = ok(G.closedLegs) && ok(G.oracleLegs) && ok(G.refusalCore);
  const cov = ok(G.coverageLegs) && ok(G.refusalCoverage);
  return {
    kernelVerdict: core ? (cov ? 'A' : 'B') : 'C',
    enclosedMassClosedForms: core ? 'claimable' : 'not claimable',
    intervalCoverage: ok(G.coverageLegs) ? 'claimable' : 'not claimable',
    productVerdict:
      'NOT ESTABLISHED (B6, E1, E2 and E3 NOT RUN: no authentic file and no cited tool output was supplied)',
    consumers: 'unmet (no consumers rule; nothing visible is built)',
    partB: spikeSummary(st),
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const rows = await runValidation({ only });
  const gate = gateFrom(rows);
  const result = {
    format: 'gravitas.lensing2-results/1',
    rows: [...rows],
    gate,
    meta: {
      cpuSeconds: rows.cpuSeconds,
      node: process.version,
      oracle: ORACLE.versions,
    },
  };
  if (args.includes('--json'))
    process.stdout.write(`${JSON.stringify(result)}\n`);
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(32)} ${JSON.stringify(r.measured)}${r.note ? `  (${r.note})` : ''}`
      );
    console.log(JSON.stringify(gate, null, 2));
    console.log(`cpu ${rows.cpuSeconds} s`);
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify(result, null, 1)}\n`
    );
  if (args.includes('--write-failed') && !only.length) {
    const failed = rows.filter(r => r.status === 'fail');
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify({ format: 'gravitas.lensing2-failed-legs/1', note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound', legs: failed.map(r => ({ id: r.id, measured: r.measured, note: r.note })) }, null, 1)}\n`
    );
  }
}
