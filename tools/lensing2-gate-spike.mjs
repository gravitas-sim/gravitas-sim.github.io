#!/usr/bin/env node
// =============================================================================
// SPIKE (Prompt 251 Part B, never merged): the gate legs G1 to G5, G7 and G8 against the committed thresholds
// -----------------------------------------------------------------------------
//   node tools/lensing2-gate-spike.mjs --json > gate-spike-results.json
// Reads every bound from tests/fixtures/lensing2/gate-thresholds.json (with its amendments AM1 to AM3, recorded
// before this ran) and the pinned oracle numbers (oracle-results.json, group 'delay'; oracle-finite.json). The
// verdict is the committed function of the rows. G6 and G9 are NOT RUN (no file; nothing fetched).
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gaussian, stream } from '../js/random/streams.js';
import { ARCSEC, pointTimeDelay } from '../js/kernels/lensing/index.js';
import { syntheticEvent } from '../js/kernels/lensing/fit.js';
import * as D from '../js/kernels/lensing/enclosed/delays.js';
import * as F from '../js/kernels/lensing/enclosed/finiteFit.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/lensing2';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const GATE = read(`${DIR}/gate-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const FINITE_IN = read(`${DIR}/oracle-finite-inputs.json`);
const FINITE_OR = read(`${DIR}/oracle-finite.json`);
const glim = id => GATE.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const cid = id => GATE.checks.find(c => c.id.startsWith(`${id}.`)).id;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const COSMO = {
  H0: INPUTS.cosmology.H0,
  Om: INPUTS.cosmology.Om,
  OL: INPUTS.cosmology.OL,
};

export function runSpike() {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id: cid(id), status: pass ? 'pass' : 'fail', measured, note });
  const notRun = (id, note) =>
    rows.push({ id: cid(id), status: 'not-run', measured: null, note });
  const cpu0 = process.cpuUsage();
  const dd = (c, exact) =>
    D.delayDistances({ zl: c.zl, zs: c.zs, cosmology: COSMO, exact });

  // G1: SIS delay from the differenced Fermat potential against the pinned oracle delays
  {
    const L = glim('G1');
    const e = { exact: [], rounded: [], closed: [] };
    for (const c of ORACLE.delay.sis) {
      const thE = c.thetaEArcsec * ARCSEC;
      const beta = c.y * thE;
      for (const exact of [true, false]) {
        const d = dd(c, exact);
        const m = D.sisSheetDelay({ thetaE: thE, beta, kappaS: 0, ddt: d.ddt });
        e[exact ? 'exact' : 'rounded'].push(rel(m.delayS, c.delayS));
        if (exact)
          e.closed.push(rel(m.delayS, (2 * d.ddt * thE * beta) / 299792458));
      }
    }
    row('G1', maxOf(e.exact) <= L.maxRel, {
      worstRel: sig(maxOf(e.exact), 3),
      roundedParsecWorstRel: sig(maxOf(e.rounded), 3),
      worstRelVsClosedForm: sig(maxOf(e.closed), 3),
      cases: e.exact.length,
    });
  }

  // G2: the point lens
  {
    const L = glim('G2');
    const o = ORACLE.delay.point.map(c => rel(D.pointDelayFermat(c), c.delayS));
    const m = ORACLE.delay.point.map(c =>
      rel(D.pointDelayFermat(c), pointTimeDelay(c.massKg, c.y, c.zl))
    );
    row('G2', maxOf(o) <= L.maxRel && maxOf(m) <= L.maxRel, {
      worstRelVsOracle: sig(maxOf(o), 3),
      worstRelVsPointTimeDelay: sig(maxOf(m), 3),
      cases: o.length,
    });
  }

  // G3 and G4: the mass sheet
  {
    const L3 = glim('G3');
    const L4 = glim('G4');
    const pos = [];
    const ratio = [];
    const ratioOracle = [];
    const muOracleVsClosed = [];
    const dr = [];
    const dOracle = [];
    const dRounded = [];
    const h0o = [];
    const h0t = [];
    for (const c of ORACLE.delay.sheet) {
      const thE = c.thetaEArcsec * ARCSEC;
      const beta = c.y * thE;
      const t = D.massSheetTransform({ thetaE: thE, beta, lambda: c.lambda });
      const im = D.sheetImages(t);
      pos.push(
        Math.abs(im.theta[0] - c.thetaPlus) / thE,
        Math.abs(im.theta[1] - c.thetaMinus) / thE
      );
      const unsheeted = D.sheetImages({ thetaE: thE, beta });
      ratioOracle.push(rel(im.mu[0] / im.mu[1], c.muPlus / c.muMinus));
      muOracleVsClosed.push(rel(im.mu[0], c.muPlus), rel(im.mu[1], c.muMinus));
      ratio.push(rel(im.mu[0] / im.mu[1], unsheeted.mu[0] / unsheeted.mu[1]));
      ratio.push(rel(im.mu[0] / im.mu[1], (1 + c.y) / (c.y - 1)));
      for (const exact of [true, false]) {
        const d = dd(c, exact);
        const s = D.sisSheetDelay({ ...t, ddt: d.ddt }).delayS;
        const u = D.sisSheetDelay({
          thetaE: thE,
          beta,
          kappaS: 0,
          ddt: d.ddt,
        }).delayS;
        if (exact) {
          dr.push(rel(s / u, c.lambda));
          dOracle.push(rel(s, c.delayS));
        } else dRounded.push(rel(s, c.delayS));
      }
      const h = D.hubbleConditional({
        delayS: c.delayS,
        thetaE: thE,
        beta,
        zl: c.zl,
        zs: c.zs,
        cosmology: COSMO,
      });
      h0o.push(rel(h.h0Model, c.h0Lambda1));
      h0t.push(rel(h.h0Model, c.h0True / c.lambda));
    }
    row(
      'G3',
      maxOf(pos) <= L3.maxAbs &&
        maxOf(ratio) <= L3.maxRel &&
        maxOf(ratioOracle) <= L3.maxRel,
      {
        worstAbsPositionInThetaE: sig(maxOf(pos), 3),
        worstRelFluxRatioVsClosedForms: sig(maxOf(ratio), 3),
        worstRelFluxRatioVsOraclesNumericalJacobian: sig(maxOf(ratioOracle), 3),
        worstRelIndividualMagnificationVsOracle: sig(
          maxOf(muOracleVsClosed),
          3
        ),
        cases: pos.length / 2,
      }
    );
    row(
      'G4',
      maxOf(dr) <= L4.maxRel &&
        maxOf(dOracle) <= L4.maxRel &&
        maxOf(h0o) <= L4.maxRelH0 &&
        maxOf(h0t) <= L4.maxRelH0,
      {
        worstRelDelayRatioVsLambda: sig(maxOf(dr), 3),
        worstRelDelayVsOracle: sig(maxOf(dOracle), 3),
        roundedParsecWorstRelDelayVsOracle: sig(maxOf(dRounded), 3),
        worstRelH0VsOracle: sig(maxOf(h0o), 3),
        worstRelH0VsTrueOverLambda: sig(maxOf(h0t), 3),
        cases: dr.length,
      }
    );
  }

  // G5: the refusal and the coverage (AM1)
  {
    const L = glim('G5');
    const seed = 'lensing2-G5';
    let refused = 0;
    const cover = { 0.68: 0, 0.95: 0 };
    let wide = 0;
    for (let i = 0; i < L.worlds; i++) {
      const u = stream('noise', seed, String(i));
      const zl = 0.2 + 0.4 * u();
      const zs = zl + 0.5 + u();
      const thE = Math.exp(Math.log(0.8) + u() * Math.log(3 / 0.8)) * ARCSEC;
      const y = 0.1 + 0.7 * u();
      const g = gaussian(stream('noise', seed, String(i), 'g'));
      const kTrue = 0.05 + 0.03 * g();
      const eps = 0.03 * g();
      const d = D.delayDistances({ zl, zs, cosmology: COSMO });
      const beta = y * thE;
      const model = D.sisSheetDelay({
        thetaE: thE,
        beta,
        kappaS: 0,
        ddt: d.ddt,
      }).delayS;
      const observed = (1 - kTrue) * model * (1 + eps);
      const base = {
        delayS: observed,
        sigmaDelayRel: 0.03,
        thetaE: thE,
        beta,
        zl,
        zs,
        cosmology: COSMO,
      };
      const r0 = D.hubbleFromDelay(base);
      if (
        r0.status === 'degenerate' &&
        r0.code === 'mass-sheet-degenerate' &&
        r0.value === null &&
        /kappa_ext/.test(r0.law)
      )
        refused++;
      for (const level of [0.68, 0.95]) {
        const r = D.hubbleFromDelay({
          ...base,
          level,
          kappaExt: {
            value: 0.05,
            sigma: 0.03,
            source: 'synthetic ensemble, calibrated by construction',
          },
        });
        if (r.interval.lo <= 70 && 70 <= r.interval.hi) cover[level]++;
        if (
          level === 0.95 &&
          (r.interval.hi - r.interval.lo) / 2 > r.interval.z * 0.03 * r.value
        )
          wide++;
      }
    }
    const c68 = cover[0.68] / L.worlds;
    const c95 = cover[0.95] / L.worlds;
    row(
      'G5',
      refused === L.worlds &&
        inBand(c68, L.band68) &&
        inBand(c95, L.band95) &&
        wide === L.worlds,
      {
        worlds: L.worlds,
        refusedWithoutKappa: refused,
        coverage68: sig(c68, 4),
        coverage95: sig(c95, 4),
        widerThanDelayAlone: wide,
      }
    );
  }

  // G7: the rho search (AM2)
  {
    const L = glim('G7');
    let returned = 0;
    const cov = { 0.68: 0, 0.95: 0 };
    let limits = 0;
    let limitsCover = 0;
    let structuralOk = true;
    let chiWorse = 0;
    let agree = 0;
    let agreeOf = 0;
    const byClass = { near: { n: 0, value: 0 }, far: { n: 0, value: 0 } };
    FINITE_IN.events.forEach((ev, i) => {
      const r = F.fitFiniteSource({ x: ev.x, y: ev.y, sigma: ev.sigma });
      const cls = ev.near ? byClass.near : byClass.far;
      if (r.chi2Min > FINITE_OR.fits[i].chi2 + 1) chiWorse++;
      cls.n++;
      if (r.status === 'ok') {
        returned++;
        cls.value++;
        for (const lv of [0.68, 0.95])
          if (
            r.intervals[lv].lo <= ev.truth.rho &&
            ev.truth.rho <= r.intervals[lv].hi
          )
            cov[lv]++;
        const o = FINITE_OR.fits[i];
        agreeOf++;
        if (rel(r.rho, o.rho) <= 0.1) agree++;
      } else {
        limits++;
        if (r.rho !== null) structuralOk = false;
        if (ev.truth.rho <= r.upperLimit95) limitsCover++;
      }
    });
    const c68 = returned ? cov[0.68] / returned : NaN;
    const c95 = returned ? cov[0.95] / returned : NaN;
    row('G7', structuralOk && inBand(c68, L.band68) && inBand(c95, L.band95), {
      events: L.events,
      returnedValue: returned,
      coverage68: sig(c68, 4),
      coverage95: sig(c95, 4),
      upperLimitOnly: limits,
      eventsWhereTheProfileMinimumIsAboveTheOraclesFitByMoreThan1: chiWorse,
      upperLimitCoverageReported: limits ? sig(limitsCover / limits, 4) : null,
      agreementWithOracleWithin10PercentReported: agreeOf
        ? `${agree} of ${agreeOf}`
        : null,
      byClass,
    });
  }

  // G8: the blended-baseline degeneracy (AM3)
  {
    const L = glim('G8');
    let flagged = 0;
    let tEok = 0;
    let truthIn = 0;
    for (let i = 0; i < L.events; i++) {
      const u = stream('noise', 'lensing2-G8', String(i));
      const u0 = 0.85 + 1.15 * u();
      const fs = 0.3 + 0.7 * u();
      const times = Array.from({ length: 61 }, (_, k) => -50 + (100 * k) / 60);
      const ev = syntheticEvent({
        seed: `lensing2-G8:${i}`,
        times,
        truth: { t0: 0, u0, tE: 20, fs, rho: 0.02 },
        noise: 0.01,
      });
      const r = F.assessBlend(
        { x: ev.x, y: ev.y, sigma: ev.sigma },
        { rho: 0.02 }
      );
      if (r.status === 'not-constrained' && r.code === 'blend-degenerate') {
        flagged++;
        if (r.tERange && Number.isFinite(r.tE)) tEok++;
      }
      if (fs >= r.interval.lo && fs <= r.interval.hi) truthIn++;
    }
    row('G8', flagged / L.events >= L.minFlagged && tEok === flagged, {
      events: L.events,
      flaggedBlendDegenerate: flagged,
      withTERange: tEok,
      truthInIntervalReported: truthIn / L.events,
    });
  }

  for (const id of ['G6', 'G9'])
    notRun(
      id,
      `tests/fixtures/lensing2/authentic/${id === 'G6' ? 'delay' : 'event'}.json was not supplied; nothing was fetched`
    );
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const cpu = process.cpuUsage(cpu0);
  return { rows, cpuSeconds: sig((cpu.user + cpu.system) / 1e6, 3) };
}

/** The verdict by the function committed in gate-thresholds.json (verdicts). */
export function verdictFrom(rows) {
  const st = id => rows.find(r => r.id.startsWith(`${id}.`))?.status;
  const ok = ids => ids.every(i => st(i) === 'pass');
  const bDelay = ok(['G1', 'G2', 'G3', 'G4', 'G5']);
  const bFinite = ok(['G7', 'G8']);
  const a = bDelay && bFinite && ok(['G6', 'G9']);
  return {
    verdict: a ? 'A' : bDelay || bFinite ? 'B' : 'C',
    bDelay,
    bFinite,
    aNeedsG6AndG9: st('G6') !== 'pass' || st('G9') !== 'pass',
  };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  const r = runSpike();
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  const out = {
    format: 'gravitas.lensing2-gate-spike-results/1',
    spike: {
      branch: 'spike/lensing-delays-gate',
      commit: sha,
      node: process.version,
      existsInTree: existsSync(
        path.join(ROOT, 'js/kernels/lensing/enclosed/delays.js')
      ),
    },
    rows: r.rows,
    verdict: verdictFrom(r.rows),
    cpuSeconds: r.cpuSeconds,
  };
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else
    for (const x of r.rows)
      console.log(
        `${x.status.toUpperCase().padEnd(8)} ${x.id.padEnd(34)} ${JSON.stringify(x.measured)}`
      );
}
