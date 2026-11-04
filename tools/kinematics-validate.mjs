#!/usr/bin/env node
// =============================================================================
// The galactic kinematics kernel against its committed thresholds (Prompt 235)
// -----------------------------------------------------------------------------
//   npm run kinematics:validate                     print the table
//   npm run kinematics:validate -- --json           print it as JSON
//   npm run kinematics:validate -- --write-results  rewrite tests/fixtures/kinematics/results.json
//   npm run kinematics:validate -- --write-failed   rewrite tests/fixtures/kinematics/failed-legs.json
//   npm run kinematics:validate -- --write-ensembles rewrite the truth manifests
//   npm run kinematics:validate -- --write-oracle-inputs rewrite oracle-inputs.json (then run the oracle)
//   --only=O.S,D.S                                   run the legs whose id starts with these
//   KIN_DESIGN=1                                     use the design seed (build and debug only; writes nothing)
//
// tests/fixtures/kinematics/thresholds.json fixed every bound, contract and synthetic truth before
// js/kernels/galactic/kinematics.js existed (GALACTIC_KINEMATICS.md, "Part A: the gate"), and its
// amendment AM1 before any gate-stream result. This reads the bounds from that file, not from copies,
// and judges the kernel against them. The oracle rows read the results of tools/kinematics-oracle/oracle.py
// pinned in oracle-results.json (numpy, scipy and astropy, run offline, never by a test). The synthetic
// samples carry their truth manifests (ensembles.json). A leg whose file was never supplied is NOT RUN and
// says why. The verdict function is the committed one: nothing here moves a bound.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as Base from '../js/kernels/galactic/index.js';
import * as K from '../js/kernels/galactic/kinematics.js';
import * as S from '../js/kernels/galactic/kinematicsSynthetic.js';
import * as T from '../js/kernels/galactic/toomre.js';
import { spaceVelocity } from '../js/kernels/galactic/coords.js';
import {
  poissonInterval,
  levelOfSigma,
} from '../js/kernels/statistics/intervals.js';
import { stream, gaussian } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK as SOLAR_PACK } from '../js/data/observations/gaiaSolarNeighbourhood.js';
import * as SEGUE from '../js/data/observations/sdssNgc2420Segue.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/kinematics';
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = readJson(`${DIR}/thresholds.json`);
const CHECKS = THRESHOLDS.checks;
const lim = id => CHECKS.find(c => c.id === id).limits;
const setOf = id => CHECKS.find(c => c.id === id).set;
const SEED = THRESHOLDS.seeds.synthetic;
const DESIGN = process.env.KIN_DESIGN === '1';
const seedFor = i => (DESIGN ? THRESHOLDS.seeds.design : SEED[i]);
const TRUTH = {
  disk: THRESHOLDS.syntheticTruth.disk,
  sunPeculiar: THRESHOLDS.syntheticTruth.sunPeculiar,
  driftK: THRESHOLDS.syntheticTruth.driftK.value,
  young: THRESHOLDS.syntheticTruth.neighbourhoodPopulations.young.sigma,
  old: THRESHOLDS.syntheticTruth.neighbourhoodPopulations.old.sigma,
  segue: {
    bin1: {
      sigma: THRESHOLDS.syntheticTruth.segueBins.bin1.sigma,
      meanAzimuthal:
        THRESHOLDS.syntheticTruth.segueBins.bin1.meanAzimuthalVelocity,
    },
    bin2: THRESHOLDS.syntheticTruth.segueBins.bin2,
    bin3: THRESHOLDS.syntheticTruth.segueBins.bin3,
  },
};
const OORT_TRUTH = S.oortTruth(TRUTH.disk);

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const reported = (id, measured, note = '') =>
  rows.push({ id, status: 'reported', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (args.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id =>
  !only.length || only.some(p => id.startsWith(p) || p.startsWith(id));
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const median = a => {
  const s = Float64Array.from(a).sort();
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
};
const manifests = {};

// ---- the packs ----------------------------------------------------------------------

const neighbourhood = tableOf({
  PACK: SOLAR_PACK,
  SERIES: readJson('gaia/solar-neighbourhood.json'),
});
const COL = {};
for (const c of neighbourhood.columns) COL[c.id] = c.values;
const NEAR = Array.from({ length: neighbourhood.n }, (_, i) => ({
  ra: COL.ra[i],
  dec: COL.dec[i],
  parallax: COL.parallax[i],
  parallax_err: COL.parallax_err[i],
  ruwe: COL.ruwe[i],
  rv: COL.rv[i],
  pmRa: COL.pmra[i],
  pmDec: COL.pmdec[i],
  bpRp: COL.bp_rp[i],
}));
const REAL_STARS = NEAR.map(r => ({
  ra: r.ra,
  dec: r.dec,
  parallax: r.parallax,
  pmRa: r.pmRa,
  pmDec: r.pmDec,
  rv: r.rv,
  bpRp: r.bpRp,
}));
const segueTable = tableOf(SEGUE);
const SC = {};
for (const c of segueTable.columns) SC[c.id] = c.values;
const SEGUE_ROWS = Array.from({ length: segueTable.n }, (_, i) => ({
  ra: SC.ra[i],
  dec: SC.dec[i],
  feh: SC.feh[i],
  rv: SC.rv[i],
  rvErr: SC.rv_err[i],
  snr: SC.snr[i],
}));
const FIELD = K.segueField(SEGUE_ROWS);
const SURVIVORS = FIELD.survivors;

// ---- ensemble helpers --------------------------------------------------------------

const cover = (est, err, truth) => {
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < est.length; i++) {
    const d = Math.abs(est[i] - truth);
    if (d <= err[i]) c1++;
    if (d <= 1.96 * err[i]) c2++;
  }
  return { c1: c1 / est.length, c2: c2 / est.length };
};
const recovery = (est, err, truth) => {
  const bias = mean(est) - truth;
  const medErr = median(err);
  return { bias, medErr, biasInErrors: Math.abs(bias) / medErr };
};

// ---- the Oort method ---------------------------------------------------------------

const FORMS = [
  { id: 'committed', suffix: '', opts: { planar: true } },
  { id: 'am1', suffix: '.am1', opts: {} },
];
const LADDER = THRESHOLDS.contracts.oort.ladder;
const oortEnsemble = {};

if (wanted('O.')) {
  // A1: noise-free exactness.
  {
    const L = lim('O.A1.exact');
    const design = {};
    for (const k of Object.keys(COL)) design[k] = COL[k].slice(0, L.stars);
    const ex = S.syntheticNeighbourhood(design, {
      seed: seedFor(0),
      label: 'O.A1',
      truth: TRUTH,
      noise: false,
      dispersion: false,
      distance: L.distance,
    });
    for (const f of FORMS) {
      const fit = K.oortFit(ex.stars, f.opts);
      const relA = Math.abs(fit.A - OORT_TRUTH.A) / Math.abs(OORT_TRUTH.A);
      const relB = Math.abs(fit.B - OORT_TRUTH.B) / Math.abs(OORT_TRUTH.B);
      row(
        `O.A1.exact${f.suffix}`,
        relA <= L.maxRelA && relB <= L.maxRelB,
        {
          form: f.id,
          A: sig(fit.A, 6),
          B: sig(fit.B, 6),
          truthA: OORT_TRUTH.A,
          truthB: OORT_TRUTH.B,
          relA: sig(relA, 3),
          relB: sig(relB, 3),
        },
        f.id === 'committed'
          ? 'the committed (planar) form omits cos b: see AM1'
          : 'the latitude-corrected form (AM1)'
      );
    }
  }
  // A2: the planar form is motion.js's fit.
  {
    const L = lim('O.A2.sameAsMotion');
    const syn = S.syntheticNeighbourhood(COL, {
      seed: seedFor(0),
      label: 'O.A2',
      truth: TRUTH,
    });
    const a = K.oortFit(syn.stars, { planar: true });
    const b = Base.fitOortConstants(syn.stars);
    const rel = (x, y) => Math.abs(x - y) / Math.abs(y);
    const worst = Math.max(
      rel(a.A, b.A),
      rel(a.B, b.B),
      rel(a.errA, b.errA),
      rel(a.errB, b.errB)
    );
    row(
      'O.A2.sameAsMotion',
      worst <= L.maxRel,
      {
        worstRelativeDifference: sig(worst, 3),
        A: sig(a.A, 6),
        B: sig(a.B, 6),
      },
      'the planar form is motion.js’s fitOortConstants'
    );
  }
  // B1: the oracle.
  {
    const L = lim('O.B1.oracle');
    const file = path.join(ROOT, DIR, 'oracle-results.json');
    if (!existsSync(file)) {
      for (const f of FORMS)
        notRun(`O.B1.oracle${f.suffix}`, 'oracle-results.json not generated');
    } else {
      const orc = readJson(`${DIR}/oracle-results.json`);
      const inp = readJson(`${DIR}/oracle-inputs.json`);
      for (const f of FORMS) {
        const mine = K.oortFit(inp.oort.rows, {
          ...f.opts,
          maxDistance: inp.oort.maxDistance,
        });
        const theirs = orc.oort[f.id === 'committed' ? 'planar' : 'cosb'];
        const dAB = Math.max(
          Math.abs(mine.A - theirs.A),
          Math.abs(mine.B - theirs.B)
        );
        const dErr = Math.max(
          Math.abs(mine.errA - theirs.errA) / theirs.errA,
          Math.abs(mine.errB - theirs.errB) / theirs.errB
        );
        row(
          `O.B1.oracle${f.suffix}`,
          dAB <= L.maxAbsAB && dErr <= L.maxRelErr && mine.n === theirs.n,
          {
            stars: mine.n,
            largestDifferenceAB: sig(dAB, 3),
            largestRelativeErrorDifference: sig(dErr, 3),
            kernel: { A: sig(mine.A, 8), B: sig(mine.B, 8) },
            oracle: { A: sig(theirs.A, 8), B: sig(theirs.B, 8) },
            versions: orc.versions,
          }
        );
      }
    }
  }
  // The ensemble: one synthetic realization feeds every contract and both forms.
  {
    const R = lim('O.S1.recovery').realizations;
    const cuts = [
      ...LADDER.map(c => c.maxDistance),
      lim('O.D1.noGradient').maxDistance,
    ];
    for (const f of FORMS)
      oortEnsemble[f.id] = Object.fromEntries(
        cuts.map(d => [
          d,
          { A: [], B: [], eA: [], eB: [], constrained: 0, n: [] },
        ])
      );
    for (let r = 0; r < R; r++) {
      const syn = S.syntheticNeighbourhood(COL, {
        seed: seedFor(1),
        label: `O:${r}`,
        truth: TRUTH,
      });
      if (r < 3) manifests[`O:${r}`] = syn.manifest;
      for (const f of FORMS)
        for (const d of cuts) {
          const fit = K.oortFit(syn.stars, { ...f.opts, maxDistance: d });
          const e = oortEnsemble[f.id][d];
          e.A.push(fit.A);
          e.B.push(fit.B);
          e.eA.push(fit.errA);
          e.eB.push(fit.errB);
          e.n.push(fit.n);
          if (fit.status === 'constrained') e.constrained++;
        }
    }
    for (const f of FORMS) {
      for (const c of LADDER) {
        const e = oortEnsemble[f.id][c.maxDistance];
        const S1 = lim('O.S1.recovery');
        const S2 = lim('O.S2.coverage');
        const rA = recovery(e.A, e.eA, OORT_TRUTH.A);
        const rB = recovery(e.B, e.eB, OORT_TRUTH.B);
        row(
          `O.S1.recovery${f.suffix}:${c.id}`,
          rA.biasInErrors <= S1.maxBiasInMedianErrors &&
            rB.biasInErrors <= S1.maxBiasInMedianErrors,
          {
            form: f.id,
            contract: c.id,
            maxDistance: c.maxDistance,
            stars: Math.round(mean(e.n)),
            A: {
              bias: sig(rA.bias),
              medianError: sig(rA.medErr),
              biasInErrors: sig(rA.biasInErrors, 3),
            },
            B: {
              bias: sig(rB.bias),
              medianError: sig(rB.medErr),
              biasInErrors: sig(rB.biasInErrors, 3),
            },
          }
        );
        const cA = cover(e.A, e.eA, OORT_TRUTH.A);
        const cB = cover(e.B, e.eB, OORT_TRUTH.B);
        const ok = x =>
          x.c1 >= S2.level1[0] && x.c1 <= S2.level1[1] && x.c2 >= S2.level2Min;
        row(`O.S2.coverage${f.suffix}:${c.id}`, ok(cA) && ok(cB), {
          form: f.id,
          contract: c.id,
          A: { c1: sig(cA.c1, 3), c2: sig(cA.c2, 3) },
          B: { c1: sig(cB.c1, 3), c2: sig(cB.c2, 3) },
        });
        const fr = e.constrained / R;
        row(
          `O.D2.constrained${f.suffix}:${c.id}`,
          fr >= lim('O.D2.constrained').minFractionConstrained,
          { form: f.id, contract: c.id, fractionConstrained: sig(fr, 3) }
        );
      }
      const d1 = lim('O.D1.noGradient');
      const e = oortEnsemble[f.id][d1.maxDistance];
      const fr = 1 - e.constrained / R;
      row(`O.D1.noGradient${f.suffix}`, fr >= d1.minFractionNotConstrained, {
        form: f.id,
        maxDistance: d1.maxDistance,
        stars: Math.round(mean(e.n)),
        fractionNotConstrained: sig(fr, 3),
        medianErrA: sig(median(e.eA)),
      });
    }
  }
  // R: the real sample under each contract of the ladder.
  {
    const near = neighbourhoodSelectionFor(NEAR);
    manifests.neighbourhoodSelection = near;
    for (const f of FORMS)
      for (const c of LADDER) {
        const fit = K.oortFit(REAL_STARS, {
          ...f.opts,
          maxDistance: c.maxDistance,
        });
        row(
          `O.R1.real${f.suffix}:${c.id}`,
          fit.status === 'constrained' && fit.n >= lim('O.R1.real').minStars,
          {
            form: f.id,
            contract: c.id,
            n: fit.n,
            A: sig(fit.A),
            errA: sig(fit.errA),
            B: sig(fit.B),
            errB: sig(fit.errB),
            solarU: sig(fit.solarU, 3),
            solarV: sig(fit.solarV, 3),
            status: fit.status,
          }
        );
        // two seeded random halves
        const u = stream('noise', seedFor(3), `O.R2:${c.id}`);
        const idx = REAL_STARS.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(u() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        const h = Math.floor(idx.length / 2);
        const f1 = K.oortFit(
          idx.slice(0, h).map(i => REAL_STARS[i]),
          { ...f.opts, maxDistance: c.maxDistance }
        );
        const f2 = K.oortFit(
          idx.slice(h).map(i => REAL_STARS[i]),
          { ...f.opts, maxDistance: c.maxDistance }
        );
        const sA = Math.abs(f1.A - f2.A) / Math.hypot(f1.errA, f2.errA);
        const sB = Math.abs(f1.B - f2.B) / Math.hypot(f1.errB, f2.errB);
        row(
          `O.R2.halves${f.suffix}:${c.id}`,
          sA <= lim('O.R2.halves').maxSigmas &&
            sB <= lim('O.R2.halves').maxSigmas,
          {
            form: f.id,
            contract: c.id,
            sigmasA: sig(sA, 3),
            sigmasB: sig(sB, 3),
          }
        );
      }
    const lit = { A: 15.3, B: -11.9 };
    const fit = K.oortFit(REAL_STARS, { maxDistance: 1.0 });
    reported('O.R3.literature', {
      measuredAM1: {
        A: sig(fit.A),
        errA: sig(fit.errA),
        B: sig(fit.B),
        errB: sig(fit.errB),
      },
      measuredPlanar: (() => {
        const p = K.oortFit(REAL_STARS, { maxDistance: 1.0, planar: true });
        return {
          A: sig(p.A),
          errA: sig(p.errA),
          B: sig(p.B),
          errB: sig(p.errB),
        };
      })(),
      literature: lit,
      source:
        'GALACTIC_DYNAMICS.md records these from Bovy (2017); a discussion only, no band',
      sigmasFromLiteratureAM1: {
        A: sig((fit.A - lit.A) / fit.errA, 3),
        B: sig((fit.B - lit.B) / fit.errB, 3),
      },
    });
  }
}

function neighbourhoodSelectionFor(rowsIn) {
  const s = K.neighbourhoodSelection(rowsIn, { maxDistance: 1.0 });
  return {
    statement: s.statement,
    alone: s.cuts.alone,
    steps: s.cuts.steps,
    strata: s.strata,
  };
}

// ---- the dispersion method ---------------------------------------------------------

const segueDesign = SURVIVORS.map(s => ({
  ra: s.ra,
  dec: s.dec,
  feh: s.feh,
  e: s.e,
  windowed: s.windowed,
}));
const window = FIELD.window;

if (wanted('D.')) {
  // A1: the closed form of a bin's pooled sigma against the generator.
  {
    const L = lim('D.A1.pooled');
    const out = [];
    let ok = true;
    for (let bin = 0; bin < 3; bin++) {
      const own = segueDesign.filter(r =>
        bin === 0
          ? r.feh < -1
          : bin === 1
            ? r.feh >= -1 && r.feh < -0.5
            : r.feh >= -0.5
      );
      const reps = Math.ceil(L.draws / own.length);
      const big = [];
      for (let k = 0; k < reps; k++)
        for (const r of own) big.push({ ...r, e: 0, windowed: false });
      const syn = S.syntheticSegue(big, {
        seed: seedFor(0),
        label: `D.A1:${bin}`,
        window,
        truth: TRUTH,
      });
      const vs = syn.stars.map(s => s.v);
      const m = mean(vs);
      const sd = Math.sqrt(
        vs.reduce((a, v) => a + (v - m) ** 2, 0) / (vs.length - 1)
      );
      const closed = S.pooledLosSigma(own, bin, { truth: TRUTH });
      const se = closed.sigma / Math.sqrt(2 * vs.length);
      const sigmas = Math.abs(sd - closed.sigma) / se;
      if (!(sigmas <= L.maxSigmasFromClosedForm)) ok = false;
      out.push({
        bin,
        mc: sig(sd, 6),
        closedForm: sig(closed.sigma, 6),
        sigmas: sig(sigmas, 3),
        n: vs.length,
      });
    }
    row('D.A1.pooled', ok, out);
  }
  // A2 and A3: own generator, recovery with errors and with a hole.
  {
    const La = lim('D.A2.errors');
    const Lb = lim('D.A3.hole');
    const make = (n, label, hole) => {
      const u = stream('noise', seedFor(2), label);
      const z = gaussian(u);
      const out = [];
      while (out.length < n) {
        const e = 1 + 5 * u();
        const v = 5 + 30 * z() + e * z();
        if (hole && Math.abs(v - 5) <= 10) continue;
        out.push({ v, e, windowed: true });
      }
      return out;
    };
    const a = K.mleDispersion(make(La.stars, 'D.A2', false), { window: null });
    const relA = Math.abs(a.sigma - 30) / 30;
    row('D.A2.errors', relA <= La.maxRel, {
      sigma: sig(a.sigma, 5),
      truth: 30,
      rel: sig(relA, 3),
      errorStated: sig(a.sigmaErr, 3),
    });
    const hole = make(Lb.stars, 'D.A3', true);
    const c = K.mleDispersion(hole, { window: [-5, 15] });
    const u = K.mleDispersion(hole, { window: null });
    const relC = Math.abs(c.sigma - 30) / 30;
    row('D.A3.hole', relC <= Lb.maxRel, {
      corrected: sig(c.sigma, 5),
      uncorrected: sig(u.sigma, 5),
      truth: 30,
      relCorrected: sig(relC, 3),
      relUncorrected: sig(Math.abs(u.sigma - 30) / 30, 3),
    });
  }
  // B1: oracle.
  {
    const L = lim('D.B1.oracle');
    const file = path.join(ROOT, DIR, 'oracle-results.json');
    if (!existsSync(file))
      notRun('D.B1.oracle', 'oracle-results.json not generated');
    else {
      const orc = readJson(`${DIR}/oracle-results.json`);
      const inp = readJson(`${DIR}/oracle-inputs.json`);
      const out = [];
      let ok = true;
      inp.dispersion.bins.forEach((b, i) => {
        const mine = K.mleDispersion(b.stars, {
          window: inp.dispersion.window,
        });
        const th = orc.dispersion[i];
        const rs = Math.abs(mine.sigma - th.sigma) / th.sigma;
        const dm = Math.abs(mine.mean - th.mean);
        const re = Math.abs(mine.sigmaErr - th.sigmaErr) / th.sigmaErr;
        if (!(rs <= L.maxRelSigma && dm <= L.maxAbsMean && re <= L.maxRelErr))
          ok = false;
        out.push({
          bin: i,
          n: mine.n,
          relSigma: sig(rs, 3),
          absMean: sig(dm, 3),
          relErr: sig(re, 3),
          kernel: { sigma: sig(mine.sigma, 7), err: sig(mine.sigmaErr, 5) },
          oracle: { sigma: sig(th.sigma, 7), err: sig(th.sigmaErr, 5) },
        });
      });
      row('D.B1.oracle', ok, out);
    }
  }
  // S1, S2, D1: the ensembles on the real survivors.
  {
    const R = lim('D.S1.recovery').realizations;
    const est = [[], [], []];
    const err = [[], [], []];
    const tr = [[], [], []];
    const zeroNot = [0, 0, 0];
    for (let r = 0; r < R; r++) {
      const syn = S.syntheticSegue(segueDesign, {
        seed: seedFor(1),
        label: `D:${r}`,
        window,
        truth: TRUTH,
      });
      if (r < 3) manifests[`D:${r}`] = syn.manifest;
      const bins = K.dispersionByBin(syn.stars, { window, uncorrected: false });
      bins.forEach((b, i) => {
        if (b.sigma === undefined) return;
        est[i].push(b.sigma);
        err[i].push(b.sigmaErr);
        tr[i].push(syn.truthByBin[i].sigma);
      });
      const z = S.syntheticSegue(segueDesign, {
        seed: seedFor(2),
        label: `D0:${r}`,
        window,
        truth: TRUTH,
        sigmaZero: true,
      });
      K.dispersionByBin(z.stars, { window, uncorrected: false }).forEach(
        (b, i) => {
          if (b.status === 'not-constrained') zeroNot[i]++;
        }
      );
    }
    const S1 = lim('D.S1.recovery');
    const S2 = lim('D.S2.coverage');
    const recs = [];
    const covs = [];
    let ok1 = true;
    let ok2 = true;
    for (let i = 0; i < 3; i++) {
      if (!est[i].length) continue;
      const truth = mean(tr[i]);
      const rec = recovery(est[i], err[i], truth);
      const cv = [0, 0];
      let c1 = 0;
      let c2 = 0;
      for (let k = 0; k < est[i].length; k++) {
        const d = Math.abs(est[i][k] - tr[i][k]);
        if (d <= err[i][k]) c1++;
        if (d <= 1.96 * err[i][k]) c2++;
      }
      cv[0] = c1 / est[i].length;
      cv[1] = c2 / est[i].length;
      if (!(rec.biasInErrors <= S1.maxBiasInMedianErrors)) ok1 = false;
      if (!(
        cv[0] >= S2.level1[0] &&
        cv[0] <= S2.level1[1] &&
        cv[1] >= S2.level2Min
      ))
        ok2 = false;
      recs.push({
        bin: i,
        truthSigma: sig(truth, 5),
        meanEstimate: sig(mean(est[i]), 5),
        bias: sig(rec.bias),
        medianError: sig(rec.medErr),
        biasInErrors: sig(rec.biasInErrors, 3),
        stars: segueDesign.filter(r =>
          i === 0
            ? r.feh < -1
            : i === 1
              ? r.feh >= -1 && r.feh < -0.5
              : r.feh >= -0.5
        ).length,
      });
      covs.push({ bin: i, c1: sig(cv[0], 3), c2: sig(cv[1], 3) });
    }
    row('D.S1.recovery', ok1, recs);
    row('D.S2.coverage', ok2, covs);
    // D1
    const D1 = lim('D.D1.refusals');
    const syn = S.syntheticSegue(segueDesign, {
      seed: seedFor(3),
      label: 'D.D1',
      window,
      truth: TRUTH,
    });
    const small = K.dispersionByBin(
      syn.stars.filter(s => s.bin === 2).slice(0, D1.smallBin),
      { window, uncorrected: false }
    );
    const smallOk =
      small[2].status === 'not-constrained' && /fewer/.test(small[2].reason);
    const fracs = zeroNot.map(c => c / R);
    row(
      'D.D1.refusals',
      smallOk && fracs.every(f => f >= D1.minFractionNotConstrained),
      {
        smallBinStatus: small[2].status,
        fractionNotConstrainedWhenSigmaZero: fracs.map(f => sig(f, 3)),
      }
    );
    // D2: reported mixture.
    const mixed = [];
    for (let r = 0; r < 100; r++) {
      const m = S.syntheticSegue(segueDesign, {
        seed: seedFor(3),
        label: `D.D2:${r}`,
        window,
        truth: TRUTH,
        mixture: { from: 1, to: 0, fraction: 0.3 },
      });
      const b = K.dispersionByBin(m.stars, { window, uncorrected: false })[0];
      mixed.push({
        est: b.sigma,
        truth: m.truthByBin[0].sigma,
        err: b.sigmaErr,
      });
    }
    reported('D.D2.mixture', {
      binOnePopulations: '70 percent bin-1, 30 percent bin-2 population',
      meanEstimate: sig(mean(mixed.map(m => m.est)), 5),
      pooledTruthOfBin1WithMixture: sig(mean(mixed.map(m => m.truth)), 5),
      meanStatedError: sig(mean(mixed.map(m => m.err)), 4),
      note: 'a bin of a real sample is whatever mixture lands in it; the Gaussian estimate and the pooled truth differ by the amount shown',
    });
  }
  // R: the real sample.
  {
    const bins = K.dispersionByBin(SURVIVORS, { window });
    const nOk = bins.filter(b => b.status === 'constrained').length;
    row('D.R1.real', nOk >= lim('D.R1.real').minBinsConstrained, {
      bins: bins.map(b => ({
        label: b.label,
        n: b.n,
        status: b.status,
        sigma: sig(b.sigma, 4),
        sigmaErr: sig(b.sigmaErr, 3),
        mean: sig(b.mean, 4),
        uncorrectedSigma: sig(b.uncorrected?.sigma, 4),
      })),
      constrained: nOk,
    });
    reported('D.R2.order', {
      bins: bins.map(b => ({
        label: b.label,
        n: b.n,
        sigma: sig(b.sigma, 4),
        sigmaErr: sig(b.sigmaErr, 3),
        uncorrectedSigma: sig(b.uncorrected?.sigma, 4),
      })),
      fieldStatement: FIELD.statement,
      removed: { alone: FIELD.cuts.alone, steps: FIELD.cuts.steps },
      cluster: FIELD.cluster,
      window: FIELD.window,
    });
  }
}

// ---- the Toomre diagram and the disk-halo separation ------------------------------

if (wanted('T.')) {
  const srcPath = path.join(ROOT, DIR, 'disk-halo-source.json');
  if (!existsSync(srcPath)) {
    for (const id of ['T.T1.coordinates', 'T.T2.classification', 'T.T3.real'])
      notRun(
        id,
        'tests/fixtures/kinematics/disk-halo-source.json (the cited thresholds) was not supplied: no threshold is typed from memory'
      );
  } else {
    // The procedure is the one KINEMATICS_GATE.md's 2026-11-04 addendum states, committed before this ran.
    const FILE = readJson(`${DIR}/disk-halo-source.json`);
    const popsT = THRESHOLDS.syntheticTruth.toomrePopulations;
    const venn = T.vennRule(FILE);
    const bensby = T.bensbyRule(FILE);
    const RULES = [
      {
        id: 'venn2004',
        rule: venn,
        frame: 'rest',
        classes: ['thin disk', 'thick disk', 'halo'],
        classify: uvw => T.vennClass(uvw, venn),
      },
      {
        id: 'bensby2014',
        rule: bensby,
        frame: 'lsr',
        classes: ['thin disk', 'thick disk', 'halo', 'between'],
        classify: uvw => T.bensbyClass(uvw, bensby),
      },
    ];
    const KIND = { thin: 'thin disk', thick: 'thick disk', halo: 'halo' };
    const heliocentric = s => spaceVelocity(s);
    // T1: exactness of the Toomre coordinates of constructed stars.
    {
      const L = lim('T.T1.coordinates');
      const ex = S.syntheticToomre(COL, {
        seed: seedFor(0),
        label: 'T.T1',
        truth: TRUTH,
        populations: popsT,
        noise: false,
      });
      const sunRest = {
        U: TRUTH.sunPeculiar.U,
        V: TRUTH.disk.V0 + TRUTH.sunPeculiar.V,
        W: TRUTH.sunPeculiar.W,
      };
      let worst = 0;
      let worstFrame = null;
      for (const st of ex.stars) {
        const hv = heliocentric(st);
        const rest = T.referTo(hv, sunRest);
        const want = T.toomreCoordinates(st.truthVelocity);
        const got = T.toomreCoordinates(rest);
        const lsrWant = T.toomreCoordinates({
          U: st.truthVelocity.U,
          V: st.truthVelocity.V - TRUTH.disk.V0,
          W: st.truthVelocity.W,
        });
        const lsrGot = T.toomreCoordinates({
          U: rest.U,
          V: rest.V - TRUTH.disk.V0,
          W: rest.W,
        });
        for (const [f, dv] of [
          ['rest V', Math.abs(got.V - want.V)],
          ['rest T', Math.abs(got.T - want.T)],
          ['lsr V', Math.abs(lsrGot.V - lsrWant.V)],
          ['lsr T', Math.abs(lsrGot.T - lsrWant.T)],
        ])
          if (dv > worst) {
            worst = dv;
            worstFrame = f;
          }
      }
      row('T.T1.coordinates', worst <= L.maxAbs, {
        stars: ex.stars.length,
        maxAbs: worst,
        bound: L.maxAbs,
        worst: worstFrame,
      });
      manifests['T:T1'] = ex.manifest;
    }
    // T2: halo recall and purity of each rule over the realizations.
    {
      const L = lim('T.T2.classification');
      const R = L.realizations;
      const per = {};
      for (const r of RULES)
        per[r.id] = {
          confusion: Object.fromEntries(
            ['thin disk', 'thick disk', 'halo'].map(k => [
              k,
              Object.fromEntries(r.classes.map(c => [c, 0])),
            ])
          ),
          recalls: [],
          purities: [],
          nested: 0,
        };
      for (let i = 0; i < R; i++) {
        const sm = S.syntheticToomre(COL, {
          seed: seedFor(0),
          label: `T.T2:${i}`,
          truth: TRUTH,
          populations: popsT,
        });
        if (i < 3) manifests[`T:T2:${i}`] = sm.manifest;
        const hv = sm.stars.map(st => heliocentric(st));
        for (const r of RULES) {
          const sun = r.rule.sun;
          let tp = 0;
          let fp = 0;
          let fn = 0;
          sm.stars.forEach((st, j) => {
            const c = r.classify(T.referTo(hv[j], sun));
            const truthC = KIND[st.truePopulation];
            per[r.id].confusion[truthC][c]++;
            if (r.id === 'bensby2014') {
              const strict = T.bensbyClass(T.referTo(hv[j], sun), bensby, {
                strictHalo: true,
              });
              if ((strict === 'halo') !== (c === 'halo')) per[r.id].nested++;
            }
            if (c === 'halo' && truthC === 'halo') tp++;
            else if (c === 'halo') fp++;
            else if (truthC === 'halo') fn++;
          });
          if (tp + fn) per[r.id].recalls.push(tp / (tp + fn));
          if (tp + fp) per[r.id].purities.push(tp / (tp + fp));
        }
      }
      const out = {};
      let all = true;
      for (const r of RULES) {
        const cm = per[r.id].confusion;
        const tp = cm.halo.halo;
        const fn = Object.entries(cm.halo)
          .filter(([c]) => c !== 'halo')
          .reduce((a, [, v]) => a + v, 0);
        const fp = ['thin disk', 'thick disk'].reduce(
          (a, k) => a + cm[k].halo,
          0
        );
        const recall = tp / (tp + fn);
        const purity = tp + fp ? tp / (tp + fp) : 0;
        const ok = recall >= L.minHaloRecall && purity >= L.minHaloPurity;
        all = all && ok;
        out[r.id] = {
          frame: r.frame,
          sun: [r.rule.sun.U, r.rule.sun.V, r.rule.sun.W],
          haloRecall: sig(recall, 4),
          haloPurity: sig(purity, 4),
          meetsBounds: ok,
          pooled: { truePositive: tp, falseNegative: fn, falsePositive: fp },
          medianRealizationRecall: sig(median(per[r.id].recalls), 3),
          medianRealizationPurity: sig(median(per[r.id].purities), 3),
          confusion: cm,
          ...(r.id === 'bensby2014'
            ? { starsWhereNestedHaloDiffers: per[r.id].nested }
            : {}),
        };
      }
      out.bounds = {
        minHaloRecall: L.minHaloRecall,
        minHaloPurity: L.minHaloPurity,
      };
      out.realizations = R;
      row(
        'T.T2.classification',
        all,
        out,
        'every cited rule must meet both bounds (KINEMATICS_GATE.md addendum); per-rule numbers are in measured'
      );
    }
    // T3: the real pack, each rule in its own frame; the counts with their Poisson intervals.
    {
      const real = REAL_STARS.map(st => ({ st, v: heliocentric(st) }));
      const o = K.lsrOptions(K_VELOCITIES(REAL_STARS));
      const stromberg = o.options.find(x => x.id === 'stromberg').vSunLsr;
      const interval = (n, level) => {
        const iv = poissonInterval([n], { level, method: 'garwood' });
        return [sig(iv.lo, 4), sig(iv.hi, 4)];
      };
      const countsFor = (classify, sun) => {
        const c = {};
        for (const { v } of real) {
          const k = classify(T.referTo(v, sun));
          c[k] = (c[k] ?? 0) + 1;
        }
        return Object.fromEntries(
          Object.entries(c).map(([k, n]) => [
            k,
            {
              count: n,
              oneSigma: interval(n, levelOfSigma(1)),
              ci95: interval(n, 0.95),
            },
          ])
        );
      };
      const res = {
        stars: real.length,
        venn2004: {
          frame: 'rest',
          sun: [venn.sun.U, venn.sun.V, venn.sun.W],
          classes: countsFor(uvw => T.vennClass(uvw, venn), venn.sun),
        },
        bensby2014: {
          frame: 'lsr',
          sunPaper: [bensby.sun.U, bensby.sun.V, bensby.sun.W],
          classesWithPaperSun: countsFor(
            uvw => T.bensbyClass(uvw, bensby),
            bensby.sun
          ),
          classesWithSampleStrombergV: {
            vSun: sig(stromberg, 5),
            classes: countsFor(uvw => T.bensbyClass(uvw, bensby), {
              ...bensby.sun,
              V: stromberg,
            }),
          },
          note: 'both candidates for the Sun V are shown and neither is chosen (D-GAIA-03)',
        },
      };
      const sum = o2 => Object.values(o2).reduce((a, x) => a + x.count, 0);
      const ok =
        sum(res.venn2004.classes) === real.length &&
        sum(res.bensby2014.classesWithPaperSun) === real.length &&
        sum(res.bensby2014.classesWithSampleStrombergV.classes) === real.length;
      row(
        'T.T3.real',
        ok,
        res,
        'no bound is committed for this leg: it passes when it runs and the counts account for every star'
      );
    }
  }
}

// ---- asymmetric drift --------------------------------------------------------------

const FORMS_S = [
  { id: 'committed', suffix: '', opts: {} },
  { id: 'am2', suffix: '.am2', opts: { xErrors: true } },
];

if (wanted('S.')) {
  // A1, A2: constructed groups on the relation.
  {
    const L = lim('S.A1.exactLine');
    const std = (n, shift) => {
      const t = Array.from({ length: n }, (_, j) => {
        const p = (((j * 7 + shift) % n) + 0.5) / n;
        // a fixed symmetric pattern, standardised to mean 0 and sample standard deviation 1
        return Math.tan(Math.PI * (p - 0.5) * 0.6);
      });
      const m = mean(t);
      const sd = Math.sqrt(t.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1));
      return t.map(v => (v - m) / sd);
    };
    const vSun = 13;
    const k = 80;
    const sigmas = [18, 24, 30, 37, 44, 52];
    const groups = sigmas.map((s, g) => {
      const tu = std(60, g);
      const tv = std(60, g + 3);
      const mv = -vSun - (s * s) / k;
      return tu.map((x, j) => ({ U: s * x, V: mv + 5 * tv[j], W: 0 }));
    });
    for (const f of FORMS_S) {
      const fit = K.driftFit(groups, f.opts);
      const relV = Math.abs(fit.vSun - vSun) / vSun;
      const relK = Math.abs(fit.k - k) / k;
      row(`S.A1.exactLine${f.suffix}`, relV <= L.maxRel && relK <= L.maxRel, {
        form: f.id,
        vSun: sig(fit.vSun, 12),
        k: sig(fit.k, 12),
        relV: sig(relV, 3),
        relK: sig(relK, 3),
      });
    }
    const L2 = lim('S.A2.lsrCorrection');
    const c = Base.lsrCorrection(40);
    const relC = Math.abs(c - 1600 / 80) / (1600 / 80);
    row('S.A2.lsrCorrection', relC <= L2.maxRel && K.KINEMATICS.lagK === 80, {
      correction: c,
      stated: 20,
      lagK: K.KINEMATICS.lagK,
    });
  }
  // B1: oracle.
  {
    const L = lim('S.B1.oracle');
    const file = path.join(ROOT, DIR, 'oracle-results.json');
    if (!existsSync(file))
      for (const f of FORMS_S)
        notRun(`S.B1.oracle${f.suffix}`, 'oracle-results.json not generated');
    else {
      const orc = readJson(`${DIR}/oracle-results.json`);
      const inp = readJson(`${DIR}/oracle-inputs.json`);
      const groups = inp.drift.groups.map(g =>
        g.map(s =>
          Base.spaceVelocity({
            ra: s.ra,
            dec: s.dec,
            parallax: s.parallax,
            pmRa: s.pmRa,
            pmDec: s.pmDec,
            rv: s.rv,
          })
        )
      );
      for (const f of FORMS_S) {
        const mine = K.driftFit(groups, f.opts);
        const th = orc.drift[f.id];
        const dI = Math.abs(-mine.vSun - th.intercept);
        const dS = Math.abs(mine.slope - th.slope);
        const eI = Math.abs(mine.vSunErr - th.interceptErr) / th.interceptErr;
        const eS = Math.abs(mine.slopeErr - th.slopeErr) / th.slopeErr;
        row(
          `S.B1.oracle${f.suffix}`,
          Math.max(dI, dS) <= L.maxAbs && Math.max(eI, eS) <= L.maxRelErr,
          {
            form: f.id,
            intercept: {
              kernel: sig(-mine.vSun, 8),
              oracle: sig(th.intercept, 8),
            },
            slope: { kernel: sig(mine.slope, 8), oracle: sig(th.slope, 8) },
            largestAbs: sig(Math.max(dI, dS), 3),
            largestRelErr: sig(Math.max(eI, eS), 3),
            versions: orc.versions,
          }
        );
      }
    }
  }
  // S1, S2, D1: ensembles.
  {
    const R = lim('S.S1.recovery').realizations;
    const acc = Object.fromEntries(
      FORMS_S.map(f => [f.id, { vs: [], ev: [], ks: [], ek: [], youngNot: 0 }])
    );
    for (let r = 0; r < R; r++) {
      const syn = S.syntheticNeighbourhood(COL, {
        seed: seedFor(2),
        label: `S:${r}`,
        truth: TRUTH,
      });
      if (r < 3) manifests[`S:${r}`] = syn.manifest;
      const groups = K.colourGroups(syn.stars, 6);
      const yg = S.syntheticNeighbourhood(COL, {
        seed: seedFor(3),
        label: `S0:${r}`,
        truth: TRUTH,
        populations: 'young',
      });
      const youngGroups = K.colourGroups(yg.stars, 6);
      for (const f of FORMS_S) {
        const a = acc[f.id];
        const fit = K.driftFit(groups, f.opts);
        a.vs.push(fit.vSun);
        a.ev.push(fit.vSunErr);
        if (fit.status === 'constrained') {
          a.ks.push(fit.k);
          a.ek.push(fit.kErr);
        }
        if (K.driftFit(youngGroups, f.opts).status !== 'constrained')
          a.youngNot++;
      }
    }
    const S1 = lim('S.S1.recovery');
    const S2 = lim('S.S2.coverage');
    for (const f of FORMS_S) {
      const { vs, ev, ks, ek, youngNot } = acc[f.id];
      const rec = recovery(vs, ev, TRUTH.sunPeculiar.V);
      row(
        `S.S1.recovery${f.suffix}`,
        rec.biasInErrors <= S1.maxBiasInMedianErrors,
        {
          form: f.id,
          truthVSun: TRUTH.sunPeculiar.V,
          meanEstimate: sig(mean(vs), 5),
          bias: sig(rec.bias),
          medianError: sig(rec.medErr),
          biasInErrors: sig(rec.biasInErrors, 3),
        }
      );
      const cv = cover(vs, ev, TRUTH.sunPeculiar.V);
      const ck = ks.length ? cover(ks, ek, TRUTH.driftK) : { c1: NaN, c2: NaN };
      const ok = x =>
        x.c1 >= S2.level1[0] && x.c1 <= S2.level1[1] && x.c2 >= S2.level2Min;
      row(`S.S2.coverage${f.suffix}`, ok(cv) && ok(ck), {
        form: f.id,
        vSun: { c1: sig(cv.c1, 3), c2: sig(cv.c2, 3) },
        k: {
          c1: sig(ck.c1, 3),
          c2: sig(ck.c2, 3),
          realizationsConstrained: ks.length,
          meanK: sig(mean(ks), 5),
        },
      });
      const fr = youngNot / R;
      row(
        `S.D1.noLever${f.suffix}`,
        fr >= lim('S.D1.noLever').minFractionNotConstrained,
        { form: f.id, fractionNotConstrained: sig(fr, 3) }
      );
    }
  }
  // L1.
  {
    const velocities = K_VELOCITIES(REAL_STARS);
    const o = K.lsrOptions(velocities);
    row(
      'S.L1.lsrOptions',
      o.chosen === null &&
        o.options.length === 2 &&
        o.options.some(x => x.id === 'schonrich2010' && x.vSunLsr === 12.24) &&
        o.options.some(x => x.id === 'stromberg' && Number.isFinite(x.vSunLsr)),
      {
        chosen: o.chosen,
        options: o.options.map(x => ({ id: x.id, vSunLsr: sig(x.vSunLsr, 5) })),
        sampleV: sig(o.sampleV, 5),
      }
    );
  }
  // R.
  {
    const L = lim('S.R1.useful');
    const reports = {};
    for (const f of FORMS_S) {
      const fit = K.driftFit(K.colourGroups(REAL_STARS, 6), f.opts);
      row(
        `S.R1.useful${f.suffix}`,
        fit.status === 'constrained' && fit.vSunErr <= L.maxHalfWidth,
        {
          form: f.id,
          vSun: sig(fit.vSun, 4),
          vSunErr: sig(fit.vSunErr, 3),
          slope: sig(fit.slope, 4),
          slopeErr: sig(fit.slopeErr, 3),
          slopeSigmas: sig(Math.abs(fit.slope) / fit.slopeErr, 3),
          k: fit.k === null ? null : sig(fit.k, 4),
          status: fit.status,
        }
      );
      reports[f.id] = {
        vSun: sig(fit.vSun, 4),
        vSunErr: sig(fit.vSunErr, 3),
        slope: sig(fit.slope, 4),
        slopeErr: sig(fit.slopeErr, 3),
        chi2: sig(fit.chi2, 3),
        dof: fit.dof,
        groups: fit.groups.map(g => ({
          n: g.n,
          sigmaU2: sig(g.sigmaU2, 5),
          meanV: sig(g.meanV, 4),
          err: sig(g.err, 3),
        })),
      };
    }
    reported('S.R2.report', {
      fits: reports,
      candidates: K.lsrOptions(K_VELOCITIES(REAL_STARS)).options.map(o => ({
        id: o.id,
        vSunLsr: sig(o.vSunLsr, 5),
      })),
    });
  }
}
function K_VELOCITIES(stars) {
  const out = [];
  for (const s of stars) {
    const v = Base.spaceVelocity(s);
    if (v && Number.isFinite(v.U + v.V + v.W)) out.push(v);
  }
  return out;
}

// ---- the committed verdict function -------------------------------------------------

const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const passes = id => byId[id]?.status === 'pass';
const sset = id => setOf(id.replace(/(\.am1)?(:O\d)?$/, '')) ?? null;
function verdictOf(method, ids, rIds) {
  const failedS = ids.filter(id => !passes(id));
  const failedR = rIds.filter(id => !passes(id));
  const nr = ids.filter(id => byId[id]?.status === 'not-run' || !byId[id]);
  let verdict;
  if (failedS.length) verdict = 'C';
  else if (failedR.length) verdict = 'B';
  else verdict = 'A';
  return { method, verdict, failedS, failedR, notRun: nr };
}
export function verdicts() {
  const out = {};
  if (rows.some(r => r.id.startsWith('O.'))) {
    const per = {};
    for (const f of FORMS) {
      const common = [
        `O.A1.exact${f.suffix}`,
        'O.A2.sameAsMotion',
        `O.B1.oracle${f.suffix}`,
        `O.D1.noGradient${f.suffix}`,
      ];
      let chosen = null;
      const tried = [];
      for (const c of LADDER) {
        const ids = [
          ...common,
          `O.S1.recovery${f.suffix}:${c.id}`,
          `O.S2.coverage${f.suffix}:${c.id}`,
          `O.D2.constrained${f.suffix}:${c.id}`,
        ];
        const v = verdictOf('O', ids, [
          `O.R1.real${f.suffix}:${c.id}`,
          `O.R2.halves${f.suffix}:${c.id}`,
        ]);
        tried.push({ contract: c.id, ...v });
        if (!v.failedS.length && chosen === null)
          chosen = { contract: c.id, ...v };
      }
      per[f.id] = chosen ?? { contract: null, verdict: 'C', tried };
      per[f.id].tried = tried;
    }
    out.O = {
      binding: per.committed,
      am1: per.am1,
      note: 'the verdict that binds is the committed (planar) form’s; the latitude-corrected form (AM1) is a proposal for Carl to ratify',
    };
  }
  if (rows.some(r => r.id.startsWith('D.')))
    out.D = verdictOf(
      'D',
      CHECKS.filter(c => c.id.startsWith('D.') && c.set === 'S').map(c => c.id),
      CHECKS.filter(c => c.id.startsWith('D.') && c.set === 'R').map(c => c.id)
    );
  if (rows.some(r => r.id.startsWith('T.')))
    out.T = verdictOf(
      'T',
      CHECKS.filter(c => c.id.startsWith('T.') && c.set === 'S').map(c => c.id),
      CHECKS.filter(c => c.id.startsWith('T.') && c.set === 'R').map(c => c.id)
    );
  if (rows.some(r => r.id.startsWith('S.'))) {
    const per = {};
    for (const f of FORMS_S) {
      const S_IDS = [
        `S.A1.exactLine${f.suffix}`,
        'S.A2.lsrCorrection',
        `S.B1.oracle${f.suffix}`,
        `S.S1.recovery${f.suffix}`,
        `S.S2.coverage${f.suffix}`,
        `S.D1.noLever${f.suffix}`,
        'S.L1.lsrOptions',
      ];
      per[f.id] = verdictOf('S', S_IDS, [`S.R1.useful${f.suffix}`]);
    }
    out.S = {
      binding: per.committed,
      am2: per.am2,
      note: 'the verdict that binds is the committed form’s; the effective-variance form (AM2) is a proposal for Carl to ratify',
    };
  }
  return out;
}

// ---- output ------------------------------------------------------------------------

const V = verdicts();
const sha = file =>
  createHash('sha256')
    .update(readFileSync(path.join(ROOT, file)))
    .digest('hex');
const result = {
  format: 'gravitas.kinematics-results/1',
  thresholdsSha256: sha(`${DIR}/thresholds.json`),
  design: DESIGN,
  counts: {
    pass: rows.filter(r => r.status === 'pass').length,
    fail: rows.filter(r => r.status === 'fail').length,
    reported: rows.filter(r => r.status === 'reported').length,
    notRun: rows.filter(r => r.status === 'not-run').length,
  },
  verdicts: V,
  rows,
};
const failed = rows
  .filter(r => r.status === 'fail')
  .map(r => ({ id: r.id, measured: r.measured, note: r.note }));

if (flag('--write-oracle-inputs')) {
  const inp = {
    format: 'gravitas.kinematics-oracle-inputs/1',
    note: 'pinned synthetic samples (no real data); written by tools/kinematics-validate.mjs --write-oracle-inputs',
    oort: { maxDistance: 1.0, rows: [] },
    dispersion: { window, bins: [] },
    drift: { groups: [] },
  };
  const o = S.syntheticNeighbourhood(COL, {
    seed: SEED[1],
    label: 'oracle:O',
    truth: TRUTH,
  });
  inp.oort.rows = o.stars.map(s => ({
    ra: s.ra,
    dec: s.dec,
    parallax: s.parallax,
    pmRa: s.pmRa,
    pmDec: s.pmDec,
  }));
  const d = S.syntheticSegue(segueDesign, {
    seed: SEED[1],
    label: 'oracle:D',
    window,
    truth: TRUTH,
  });
  for (let b = 0; b < 3; b++)
    inp.dispersion.bins.push({
      stars: d.stars
        .filter(s => s.bin === b)
        .map(s => ({ v: s.v, e: s.e, windowed: s.windowed })),
    });
  const g = S.syntheticNeighbourhood(COL, {
    seed: SEED[2],
    label: 'oracle:S',
    truth: TRUTH,
  });
  const ranked = g.stars
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.bpRp - b.s.bpRp);
  for (let k = 0; k < 6; k++) {
    const lo = Math.floor((k * ranked.length) / 6);
    const hi = Math.floor(((k + 1) * ranked.length) / 6);
    inp.drift.groups.push(
      ranked.slice(lo, hi).map(({ s }) => ({
        ra: s.ra,
        dec: s.dec,
        parallax: s.parallax,
        pmRa: s.pmRa,
        pmDec: s.pmDec,
        rv: s.rv,
      }))
    );
  }
  inp.manifests = { O: o.manifest, D: d.manifest, S: g.manifest };
  writeFileSync(
    path.join(ROOT, DIR, 'oracle-inputs.json'),
    JSON.stringify(inp) + '\n'
  );
  console.log('wrote oracle-inputs.json');
  process.exit(0);
}

if (flag('--json')) console.log(JSON.stringify(result, null, 1));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${JSON.stringify(r.measured).slice(0, 220)}`
    );
  console.log('\ncounts', JSON.stringify(result.counts));
  console.log(
    'verdicts',
    JSON.stringify(
      Object.fromEntries(
        Object.entries(V).map(([k, v]) => [
          k,
          v.binding
            ? {
                binding: v.binding.verdict,
                contract: v.binding.contract ?? null,
                proposed: (v.am1 ?? v.am2).verdict,
                proposedContract: (v.am1 ?? v.am2).contract ?? null,
              }
            : v.verdict,
        ])
      )
    )
  );
}
if (!DESIGN) {
  if (flag('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      JSON.stringify(result, null, 1) + '\n'
    );
  if (flag('--write-failed'))
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.kinematics-failed-legs/1',
          note: 'legs that crossed a committed bound; they stay failing and labelled, and only Carl resets a bound',
          legs: failed,
        },
        null,
        1
      ) + '\n'
    );
  if (flag('--write-ensembles'))
    writeFileSync(
      path.join(ROOT, DIR, 'ensembles.json'),
      JSON.stringify(
        {
          format: 'gravitas.kinematics-ensembles/1',
          note: 'truth manifests of the first three realizations of each ensemble',
          truth: THRESHOLDS.syntheticTruth,
          manifests,
        },
        null,
        1
      ) + '\n'
    );
}
void sset;
