#!/usr/bin/env node
// =============================================================================
// The galaxy-cluster follow-up legs against their committed thresholds (Prompt 250, 250b)
// -----------------------------------------------------------------------------
//   npm run clusters:followup                    print the table
//   npm run clusters:followup -- --json          print it as JSON
//   npm run clusters:followup -- --write-results rewrite tests/fixtures/clusters/followup-results.json
//   npm run clusters:followup -- --write-failed  rewrite tests/fixtures/clusters/followup-failed-legs.json
//   --only=A15,C4b                               run the legs whose id starts with these
//
// tests/fixtures/clusters/followup-thresholds.json fixed every bound before the follow-up code existed;
// this reads the bounds from that file. B6 reads followup-oracle-results.json (tools/clusters-oracle/
// oracle-followup.py). X1 re-runs the first gate's validator and holds its rows to its pinned results.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SOLAR_MASS_KG } from '../js/constants.js';
import { createCosmology } from '../js/kernels/cosmology/flrw.js';
import { levelOfSigma } from '../js/kernels/statistics/index.js';
import * as K from '../js/kernels/galaxy/clusters/index.js';
import { runValidation as runFirstGate } from './clusters-validate.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/clusters';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/followup-thresholds.json`);
const ORACLE = read(`${DIR}/followup-oracle-results.json`);
const OLD_ORACLE = read(`${DIR}/oracle-results.json`);
const OLD_RESULTS = read(`${DIR}/results.json`);
const COSMO = { H0: 70, Om: 0.3, OL: 0.7 };
const L1 = levelOfSigma(1);
const LEVELS = [L1, 0.95];
const C = 299792.458;
const SEED = THRESHOLDS.seeds;

const lim = id => THRESHOLDS.checks.find(c => c.id.startsWith(`${id}.`)).limits;
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const factorPhys = () => ({
  value: K.kPhys(),
  sigma: 0,
  source: 'toy world: 2 / x_half (thresholds.json worlds.toyCluster)',
  radiusKind: 'half-number',
});
const analyse = (w, extra = {}) =>
  K.analyseCluster({ ...w, cosmology: COSMO, factor: factorPhys(), ...extra });

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {Promise<object[]>} rows {id, status, measured, note}
 */
export async function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cosmo = createCosmology(COSMO);

  // ---- A15 -----------------------------------------------------------------------------
  if (wanted('A15')) {
    const L = lim('A15');
    let closed = 0;
    let diff = 0;
    for (const z of [0.02, 0.05, 0.1, 0.3]) {
      const dc = cosmo.comovingDistance(z);
      const form = 1 / (1 + z) + C / COSMO.H0 / (cosmo.E(z) * dc);
      closed = Math.max(closed, rel(K.dlnLuminosityDistanceDz(cosmo, z), form));
      const h = 1e-5 * z;
      const fd =
        (Math.log(cosmo.luminosityDistance(z + h)) -
          Math.log(cosmo.luminosityDistance(z - h))) /
        (2 * h);
      diff = Math.max(diff, rel(form, fd));
    }
    const mem = [15.2, 16.0, 17.1].map(m => ({
      mag: m,
      magErr: 0.05,
      k: 0.05,
      A: 0.1,
    }));
    const dm = cosmo.distanceModulus(0.05);
    const solar = { value: 4.5, source: 'invented for the test' };
    const lum = m => 10 ** (-0.4 * (m - dm - 0.15 - 4.5));
    const phot =
      (0.4 *
        Math.LN10 *
        Math.sqrt(mem.reduce((s, g) => s + (lum(g.mag) * 0.05) ** 2, 0))) /
      mem.reduce((s, g) => s + lum(g.mag), 0);
    const sz = 2e-4;
    const dist =
      2 *
      (1 / 1.05 +
        C / COSMO.H0 / (cosmo.E(0.05) * cosmo.comovingDistance(0.05))) *
      sz;
    const withD = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: solar,
      limitMag: 99,
      distanceRelSigma: K.distanceRelSigma(cosmo, 0.05, sz),
    });
    const off = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: solar,
      limitMag: 99,
    });
    const off0 = K.clusterLight({
      members: mem,
      dm,
      solarAbsMag: solar,
      limitMag: 99,
      distanceRelSigma: 0,
    });
    const zs = [0.0231, 0.0233, 0.0229, 0.0236, 0.0227];
    const zm = mean(zs);
    const szc =
      Math.sqrt(zs.reduce((s, v) => s + (v - zm) ** 2, 0) / 4) / Math.sqrt(5);
    const w = K.clusterWorld({
      seed: SEED.C4b,
      index: 0,
      cosmology: COSMO,
      light: true,
    });
    const a = analyse(w, {
      draws: 20,
      light: { ...w.light, distanceTerm: true },
    });
    const b = analyse(w, { draws: 20, light: w.light });
    const pipelineOk =
      a.light.terms.distance > 0 &&
      b.light.terms.distance === 0 &&
      b.light.relSigma === b.light.terms.photometric &&
      rel(
        a.light.relSigma,
        Math.hypot(a.light.terms.photometric, a.light.terms.distance)
      ) <= L.closedMaxRel;
    const m = {
      dlnClosed: closed,
      dlnVsDifference: diff,
      distanceRelSigma: rel(withD.relSigma, Math.hypot(phot, dist)),
      optionOffExact: off.relSigma === off0.relSigma,
      optionOffPhotometric: rel(off.relSigma, phot),
      sigmaZc: rel(K.clusterRedshiftSigma(zs), szc),
      pipelineOk,
    };
    row(
      'A15.distanceTermClosed',
      closed <= L.closedMaxRel &&
        diff <= L.differenceMaxRel &&
        m.distanceRelSigma <= L.closedMaxRel &&
        m.optionOffExact &&
        m.optionOffPhotometric <= L.closedMaxRel &&
        m.sigmaZc <= L.closedMaxRel &&
        pipelineOk,
      m
    );
  }

  // ---- A16 -----------------------------------------------------------------------------
  if (wanted('A16')) {
    const L = lim('A16');
    let worst = 0;
    for (const [nb, n, k] of [
      [0, 50, 3],
      [5, 100, 3],
      [20, 100, 3],
      [10, 80, 4],
    ])
      worst = Math.max(
        worst,
        Math.abs(K.expectedBias(nb, n, k) - 0.5 * (nb / n) * ((k * k) / 3 - 1))
      );
    const atThree = Math.abs(K.expectedBias(7, 40, 3) - 7 / 40);
    let thr = 0;
    for (const n of [20, 50, 400])
      thr = Math.max(
        thr,
        rel(K.biasFlagThreshold(n), 1 / (2 * Math.sqrt(2 * (n - 1))))
      );
    const t = K.biasFlagThreshold(100);
    const above = K.expectedBias(100 * (t * 1.001), 100, 3) > t;
    const below = !(K.expectedBias(100 * (t * 0.999), 100, 3) > t);
    const share = outside =>
      K.contamination({
        uKms: Array.from({ length: outside }, () => 500),
        centre: 0,
        halfWidth: 100,
        extentKms: 1000,
        members: 100,
      });
    const s12 = share(108);
    const s08 = share(72);
    const shareOk =
      s12.flag === true &&
      s08.flag === false &&
      Math.abs(s12.share - 0.12) < 1e-12;
    row(
      'A16.expectedBiasClosed',
      worst <= L.maxRel &&
        atThree <= L.maxRel &&
        thr <= L.maxRel &&
        above &&
        below &&
        shareOk,
      {
        worst,
        atKappa3: atThree,
        threshold: thr,
        above,
        below,
        shareRule: shareOk,
      }
    );
  }

  // ---- A17 -----------------------------------------------------------------------------
  if (wanted('A17')) {
    const L = lim('A17');
    let worst = 0;
    for (const [n, mu] of [
      [3, 1],
      [5, 2],
      [10, 4],
      [30, 20],
      [1, 0.5],
    ]) {
      let s = 0;
      let term = Math.exp(-mu);
      for (let k = 0; k < n; k++) {
        s += term;
        term *= mu / (k + 1);
      }
      worst = Math.max(worst, Math.abs(K.poissonUpperTail(n, mu) - (1 - s)));
    }
    let boundary = true;
    for (const [n, mu] of [
      [8, 2],
      [9, 2],
      [10, 2],
      [12, 4],
      [14, 4],
      [20, 10],
      [24, 10],
    ]) {
      let s = 0;
      let term = Math.exp(-mu);
      for (let k = 0; k < n; k++) {
        s += term;
        term *= mu / (k + 1);
      }
      const tail = 1 - s;
      const r = K.overdensityTest({
        nIn: n,
        nPre: mu,
        halfWidthKms: 1000,
        extentKms: 1000,
      });
      if (r.refuse !== tail > L.pMax) boundary = false;
    }
    const cases = [
      K.overdensityTest({
        nIn: 40,
        nPre: 41,
        halfWidthKms: 2400,
        extentKms: 8000,
      }),
      K.overdensityTest({
        nIn: 100,
        nPre: 100,
        halfWidthKms: 9000,
        extentKms: 8000,
      }),
    ];
    const muOk =
      Math.abs(cases[0].mu - 41 * 0.3) < 1e-12 &&
      Math.abs(cases[1].mu - 100) < 1e-12;
    const unknown =
      K.overdensityTest({
        nIn: 10,
        nPre: 20,
        halfWidthKms: 100,
        extentKms: null,
      }).status === 'unknown';
    const field = K.clusterWorld({
      seed: SEED.R6bField,
      index: 0,
      cosmology: COSMO,
      kind: 'field',
      N: 100,
      rt: 1.5,
    });
    const off = analyse(field, { draws: 20 });
    const on = analyse(field, { draws: 20, requireOverdensity: true });
    const fieldOk =
      off.status === 'ok' &&
      on.status === 'not-constrained' &&
      on.code === 'no-overdensity';
    row(
      'A17.overdensityClosed',
      worst <= L.maxAbs &&
        boundary &&
        cases[0].refuse === false &&
        cases[1].refuse === true &&
        muOk &&
        unknown &&
        fieldOk,
      {
        worstTail: worst,
        boundary,
        mu: cases.map(c => sig(c.mu)),
        tails: cases.map(c => c.tail),
        unknown,
        fieldOk,
      }
    );
  }

  // ---- B6 ------------------------------------------------------------------------------
  if (wanted('B6')) {
    const L = lim('B6');
    let dln = 0;
    for (const { z, value } of ORACLE.dlnDL)
      dln = Math.max(dln, rel(K.dlnLuminosityDistanceDz(cosmo, z), value));
    let pois = 0;
    for (const { n, mu, tail } of ORACLE.poisson)
      pois = Math.max(pois, Math.abs(K.poissonUpperTail(n, mu) - tail));
    row('B6.followupOracle', dln <= L.dlnMaxRel && pois <= L.poissonMaxAbs, {
      redshifts: ORACLE.dlnDL.length,
      worstDlnRel: dln,
      pairs: ORACLE.poisson.length,
      worstPoissonAbs: pois,
    });
  }

  // ---- C4b -----------------------------------------------------------------------------
  if (wanted('C4b')) {
    const L = lim('C4b');
    const cover = [0, 0];
    let n = 0;
    let refused = 0;
    let dist = 0;
    let phot = 0;
    for (let i = 0; i < L.worlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.C4b,
        index: i,
        cosmology: COSMO,
        light: true,
      });
      const r = analyse(w, {
        levels: LEVELS,
        draws: 20,
        light: { ...w.light, distanceTerm: true },
      });
      if (r.status !== 'ok' || r.light.status !== 'ok') {
        refused++;
        continue;
      }
      n++;
      dist += r.light.terms.distance;
      phot += r.light.terms.photometric;
      r.light.intervals.forEach((iv, j) => {
        if (iv.lo <= w.truth.lightSolar && w.truth.lightSolar <= iv.hi)
          cover[j]++;
      });
    }
    const c68 = cover[0] / n;
    const c95 = cover[1] / n;
    row(
      'C4b.lightCoverageWithDistance',
      inBand(c68, L.cover68) && inBand(c95, L.cover95),
      {
        answered: n,
        notAnswered: refused,
        cover68: sig(c68),
        cover95: sig(c95),
        meanPhotometricTerm: sig(phot / n),
        meanDistanceTerm: sig(dist / n),
      }
    );
  }

  // ---- D3b and R10 ---------------------------------------------------------------------
  let ladder = null;
  if (wanted('D3b') || wanted('R10')) {
    const L = lim('D3b');
    const byF = Object.fromEntries(
      L.ladder.map(f => [
        f,
        { n: 0, est: [], real: [], biasFlag: 0, shareFlag: 0 },
      ])
    );
    const biased = { n: 0, flagged: 0 };
    const fine = { n: 0, flagged: 0 };
    let middle = 0;
    for (let i = 0; i < L.worlds; i++) {
      const f = L.ladder[i % L.ladder.length];
      const w = K.clusterWorld({
        seed: SEED.D3b,
        index: i,
        cosmology: COSMO,
        interloperFraction: f,
      });
      const r = analyse(w, { draws: 20, contaminationRule: 'bias' });
      if (r.status !== 'ok') continue;
      const g = byF[f];
      g.n++;
      const est = r.diagnostics.contaminationBias?.expectedBias;
      if (Number.isFinite(est)) g.est.push(est);
      g.real.push((r.dispersion.kms - w.truth.sigma) / w.truth.sigma);
      const flagged = r.flags.includes('contaminated-bias');
      if (flagged) g.biasFlag++;
      if (r.diagnostics.contamination.flag) g.shareFlag++;
      const nIn = w.truth.interlopersInsideWindow3Sigma;
      const nTrue = w.truth.members + nIn;
      const bTrue = 0.5 * (nIn / nTrue) * (9 / 3 - 1);
      const sRel = 1 / Math.sqrt(2 * (nTrue - 1));
      if (bTrue >= L.biasedMultiple * sRel) {
        biased.n++;
        if (flagged) biased.flagged++;
      } else if (bTrue <= L.fineMultiple * sRel) {
        fine.n++;
        if (flagged) fine.flagged++;
      } else middle++;
    }
    ladder = { byF, biased, fine, middle };
    if (wanted('D3b')) {
      const cal = {};
      let calOk = true;
      for (const f of L.calibrationFractions) {
        const g = byF[f];
        const ratio = mean(g.est) / mean(g.real);
        cal[f] = {
          answered: g.n,
          meanEstimated: sig(mean(g.est)),
          meanRealized: sig(mean(g.real)),
          ratio: sig(ratio),
        };
        if (g.n < L.calibrationAnsweredMin || !inBand(ratio, L.ratioBand))
          calOk = false;
      }
      const power = biased.n ? biased.flagged / biased.n : 0;
      const falseRate = fine.n ? fine.flagged / fine.n : 1;
      const measurable = biased.n >= L.classMin && fine.n >= L.classMin;
      row(
        'D3b.contaminationBiasFlag',
        calOk &&
          measurable &&
          power >= L.flaggedMin &&
          falseRate <= L.falseFlagMax,
        {
          calibration: cal,
          biasedWorlds: biased.n,
          flaggedShare: sig(power),
          fineWorlds: fine.n,
          falseFlagShare: sig(falseRate),
          unjudgedMiddle: middle,
        }
      );
    }
  }

  // ---- R6b and R11 ---------------------------------------------------------------------
  if (wanted('R6b') || wanted('R11')) {
    const L = lim('R6b');
    let refusedField = 0;
    let answeredOff = 0;
    for (let i = 0; i < L.fieldWorlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.R6bField,
        index: i,
        cosmology: COSMO,
        kind: 'field',
        N: 100,
        rt: 1.5,
      });
      const on = analyse(w, { draws: 20, requireOverdensity: true });
      if (on.status === 'not-constrained' && on.code === 'no-overdensity')
        refusedField++;
      if (analyse(w, { draws: 20 }).status === 'ok') answeredOff++;
    }
    const groups = { '40-80': [0, 0], '80-160': [0, 0], '160-300': [0, 0] };
    let answered = 0;
    let tailMax = 0;
    let tailMin = 1;
    for (let i = 0; i < L.cleanWorlds; i++) {
      const w = K.clusterWorld({
        seed: SEED.R6bClean,
        index: i,
        cosmology: COSMO,
      });
      const r = analyse(w, { draws: 20, requireOverdensity: true });
      const key =
        w.truth.members < 80
          ? '40-80'
          : w.truth.members < 160
            ? '80-160'
            : '160-300';
      groups[key][0]++;
      const od = r.diagnostics?.overdensity ?? r.overdensity;
      if (od?.tail !== undefined) {
        tailMax = Math.max(tailMax, od.tail);
        tailMin = Math.min(tailMin, od.tail);
      }
      if (r.status === 'ok') answered++;
      else groups[key][1]++;
    }
    if (wanted('R6b'))
      row(
        'R6b.fieldRefusal',
        refusedField >= L.refusedMin &&
          answered / L.cleanWorlds >= L.answeredMin &&
          answeredOff === L.optionOffAnswered,
        {
          fieldRefused: refusedField,
          cleanAnswered: answered,
          cleanWorlds: L.cleanWorlds,
          optionOffFieldAnswered: answeredOff,
        }
      );
    if (wanted('R11'))
      reported(
        'R11.overdensityOnWeakClusters',
        {
          refusedByMemberCount: Object.fromEntries(
            Object.entries(groups).map(([k, [n, r]]) => [k, `${r} of ${n}`])
          ),
          largestTail: sig(tailMax),
          smallestTail: tailMin,
        },
        'what a weak cluster costs under the test'
      );
  }

  // ---- X1 ------------------------------------------------------------------------------
  if (wanted('X1')) {
    const L = lim('X1');
    const live = await runFirstGate();
    const bad = [];
    live.forEach((r, i) => {
      const p = OLD_RESULTS.rows[i];
      if (
        r.id !== p.id ||
        r.status !== p.status ||
        (!r.id.startsWith('R1.') &&
          JSON.stringify(r.measured) !== JSON.stringify(p.measured))
      )
        bad.push(r.id);
    });
    const failing = live.filter(r => r.status === 'fail').map(r => r.id);
    row(
      'X1.oldLegsUnchanged',
      bad.length === 0 &&
        live.length === OLD_RESULTS.rows.length &&
        JSON.stringify(failing) === JSON.stringify(L.failing),
      { rows: live.length, differences: bad, failing }
    );
  }

  // ---- reported ------------------------------------------------------------------------
  if (wanted('R9'))
    reported(
      'R9.solarMassDisplayed',
      {
        treeOverAstropy_minus1:
          SOLAR_MASS_KG / OLD_ORACLE.constants.astropySolarMassKg - 1,
      },
      'displayed solar-mass figures keep the tree value; the difference is stated'
    );
  if (wanted('R10') && ladder) {
    const out = {};
    for (const [f, g] of Object.entries(ladder.byF))
      out[f] = {
        answered: g.n,
        meanRealizedBias: sig(mean(g.real)),
        meanEstimatedBias: sig(mean(g.est)),
        flaggedByBiasRule: sig(g.biasFlag / g.n),
        flaggedByShareRule: sig(g.shareFlag / g.n),
      };
    reported(
      'R10.interlopersBiasLadder',
      out,
      'the realized bias, the estimate and the two flags per interloper fraction'
    );
  }
  return rows;
}

/** The follow-up verdict from the rows, by the committed function. */
export function verdictOf(rows) {
  const G = THRESHOLDS.gate.verdictFunction.kernelLegGroups;
  const st = p => rows.filter(r => r.id.startsWith(`${p}.`)).map(r => r.status);
  const ok = list =>
    list.every(p => st(p).length > 0 && st(p).every(s => s === 'pass'));
  const core = ok(G.closedLegs) && ok(G.oracleLegs);
  return {
    followupVerdict: !core ? 'C' : ok(G.newLegs) ? 'A' : 'B',
    consumers: 'unmet whatever the verdict (Carl, 2026-11-06, question 1)',
  };
}

const table = rows => {
  const w = Math.max(...rows.map(r => r.id.length));
  return rows
    .map(
      r =>
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(w)}  ${JSON.stringify(r.measured).slice(0, 230)}`
    )
    .join('\n');
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',') : [];
  const rows = await runValidation({ only });
  const verdict = verdictOf(rows);
  const counts = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  if (args.includes('--json'))
    process.stdout.write(JSON.stringify({ rows, verdict }, null, 1) + '\n');
  else
    process.stdout.write(
      `${table(rows)}\n\n${rows.length} rows: ${JSON.stringify(counts)}  follow-up verdict ${verdict.followupVerdict}\n`
    );
  const out = path.join(ROOT, DIR);
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(out, 'followup-results.json'),
      JSON.stringify(
        {
          format: 'gravitas.clusters-followup-results/1',
          node: process.version,
          rows,
          gate: verdict,
        },
        null,
        1
      ) + '\n'
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(out, 'followup-failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.clusters-followup-failed-legs/1',
          note: 'the follow-up legs that crossed a committed bound; they stay failing, only Carl resets a bound',
          legs: rows
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        1
      ) + '\n'
    );
}
