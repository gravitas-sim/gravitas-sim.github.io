#!/usr/bin/env node
// =============================================================================
// The follow-up validation legs of Prompt 252 (252b): A7b, B3b, C1b, C1c, D2b (AGN.md "Follow-up (252b)")
// -----------------------------------------------------------------------------
//   node tools/agn-followup-validate.mjs [--only=A7b,C1c] [--json] [--write-results] [--write-failed]
//
// Thresholds are tests/fixtures/agn/followup-thresholds.json, committed before this file or any code it runs
// existed. The old legs (A7, B3, C1, D2, B6) are tools/agn-validate.mjs's and are unchanged. The oracle for B3b is
// tools/agn-oracle/oracle.py on oracle-inputs-followup.json (numpy and scipy, no Gravitas code).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as A from '../js/kernels/agn/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/agn';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const FOLLOWUP = read(`${DIR}/followup-thresholds.json`);
const BASE = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results-followup.json`);
const INPUTS = read(`${DIR}/oracle-inputs-followup.json`);
const SEEDS = FOLLOWUP.seeds;
const OVERRIDES = FOLLOWUP.amendments.flatMap(a => a.overrides ?? []);
const lim = id => {
  const base = FOLLOWUP.checks.find(c => c.id === id).limits;
  const out = { ...base };
  for (const o of OVERRIDES) if (o.check === id) out[o.limit] = o.value;
  return out;
};
const ZRQ = BASE.worlds.quasar.zRange;
const CURVES = A.INVENTED_BPT_CURVES;
const STEP = A.QUASAR_WORLD.log10Step;
const SET = 'non-harmonic';

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : 0.5 * (s[h - 1] + s[h]);
};
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const zOfLag = k => 10 ** (k * STEP) - 1;

const TPL = A.quasarTemplate({ lines: LINES, lineSet: SET });
const qworld = (z, extra = {}) =>
  A.generateQuasar({ lines: LINES, z, lineSet: SET, ...extra });
const xcq = (w, extra = {}) =>
  A.quasarRedshift(w, TPL, { zRange: ZRQ, ...extra });
const nworld = (extra = {}) =>
  A.generateNarrowLines({ lines: LINES, ...extra });
// the follow-up rule (AGN-RULE-2 F1): the kernel's default, a failed fit at the expected position is a non-detection
const measure = (w, z = w.truth.z) =>
  A.measureBptLines(w, { z, rest: w.truth.restNm, sources: w.truth.sources });

/** Why each failing leg fails, written after the first run (nothing here moves a bound). */
const WHY = {
  'A7b.quasarShiftNonHarmonic':
    "Seven of the nine noise-free cases are recovered with status ok and two are refused ambiguous-peak (z = 0.5555 and z = 2.3456). Of the seven, k = 500 (1.7e-7) and z = 0.1234 (1.1e-7) are inside their bounds; k = 2000 reads 1.4e-6 (bound 1e-6), k = 1500 reads 1.7e-4, k = 2500 reads 1.2e-3, z = 1.0777 reads 1.8e-4 and z = 1.9999 reads 2.2e-4 (bound 5e-5). A one-off diagnostic (not a leg, and not an isolating experiment) on the two refusals: at z = 0.5555 the highest correlation peak is the WRONG one (z = 0.152) and the true lag reads 0.90 of it, because H-alpha, observed at 1020 nm, is outside the 1000 nm cut, so at the true lag the template overlaps less than at a lag where its strongest line lands on the world's H-beta (the statistic is S / sqrt(T) with T the overlapped template energy); at z = 2.3456 the highest peak is the right one (2.3457) and a rival at z = 0.67 reaches 0.87 of it. So the harmonic spacing was a cause of the refusals but not the only one. The growing error with z is the systematic floor named under A7, not isolated. Left failing as committed.",
  'B3b.redshiftOracleNonHarmonic':
    'Six of the eight noisy worlds are answered and two are refused ambiguous-peak (the oracle has no ambiguity rule and answers all eight), so the leg, which requires status ok on all eight as B3 did, fails on that clause alone. On the six answered worlds the kernel and the independent implementation agree to 4.9e-9 in z, 1.6e-9 relative in sigma, 2.3e-14 relative in q and 1.2e-14 of the profile maximum, far inside the bounds. The refusals are the second cause named under A7b. Left failing as committed.',
  'C1b.redshiftCoverageNonHarmonic':
    '41 of 300 worlds are refused ambiguous-peak (0.137; the harmonic world of C1 had 134), so the ok share is 0.863 against 0.95; the catastrophic share is 0.03 against 0.01; the coverage of the noise-only interval over the 259 answered worlds is 0.375 (band 0.602 to 0.763) and the standard deviation of the normalised error is 445 (band 0.85 to 1.15). One-off diagnostic (not a leg): the refused worlds begin at z = 0.54, just past z = 0.523 where H-alpha leaves the 1000 nm cut; 7 of the answered worlds, all at z = 0.58 to 0.61, are WRONG by about -0.41 (the same wrong peak as at z = 0.5555 in A7b, with a rival under 0.8 of it, so not refused), and they dominate the standard deviation. Without them (252 worlds) the noise-only coverage is 0.385 and the standard deviation 20.1: the interval is a noise interval over a systematic floor (median absolute error 7.6e-5 against a median sigma of 5.6e-5, 90th percentile of the error 1.2e-3). Left failing as committed.',
  'C1c.redshiftCoverageWithFloor':
    'The floor closes most of the undercoverage and slightly overshoots: the coverage of the total interval over the 259 answered worlds is 0.772 (band 0.602 to 0.763), at twice the interval 0.822 (reported), and the median floor share of the interval variance is 0.97, so the interval is almost all floor (median total sigma 3.2e-4). The standard deviation of the normalised error is 299 (band 0.85 to 1.15), dominated by the 7 gross misses described under C1b (z = 0.58 to 0.61, wrong by about -0.41, which no floor can cover); without them (252 worlds) the coverage of the total interval is 0.794 and the standard deviation 4.0, still outside the band. The ok share (0.863) and the catastrophic share (0.03) are C1b\u2019s. The floor rule and the bounds are as committed. Left failing as committed.',
  'D2b.failedFitIsNondetection':
    'The mapping works where it was meant to: 13 of the 200 weak-line worlds reached line-not-detected through a fit failure (flag fitFailed; under the old code these were line-fit-failed), the blend half passes (200 of 200), and the guard shows no measurable line was turned into a non-detection (100 of 100 measured, 0 line-not-detected; 93 classified, 7 class-ambiguous). The leg fails on its all-of-200 clause: 199 of 200 weak-line worlds return line-not-detected for the invented O line and 1 was classified, so its 0.5 percent O line passed the signal-to-noise cut of 3 by a noise fluctuation (a 3-sigma upward fluctuation has a probability of about 1e-3 per line per world). Left failing as committed; a count bound in place of all-of-n is a question for Carl.',
};

const coverage = list => {
  const z = list.map(r => (r.value - r.truth) / r.sigma);
  return {
    n: list.length,
    coverage:
      list.filter(r => Math.abs(r.value - r.truth) <= r.sigma).length /
      list.length,
    meanZ: mean(z),
    sdZ: sd(z),
  };
};

const specOf = (flux, sigmaPixel) => {
  const g = INPUTS.grid;
  const lambda = new Float64Array(g.samples);
  for (let i = 0; i < g.samples; i++)
    lambda[i] = 10 ** (g.log10Start + i * g.log10Step);
  return {
    lambdaNm: lambda,
    flux: Float64Array.from(flux),
    sigma: new Float64Array(g.samples).fill(sigmaPixel),
    medium: 'vacuum',
    resolvingPower: g.resolvingPower,
    fluxKind: 'f-lambda',
  };
};

/**
 * Run the follow-up legs.
 * @param {{only?: string[]}} [opts]
 */
export function runFollowup({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({
      id,
      status: pass ? 'pass' : 'fail',
      measured,
      note: pass ? '' : (WHY[id] ?? note),
    });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));

  // ---- A7b: the shifted templates of the non-harmonic world -----------------------------------------

  if (wanted('A7b.')) {
    const L = lim('A7b.quasarShiftNonHarmonic');
    let worstLag = 0;
    let worstSub = 0;
    let allOk = true;
    const per = [];
    for (const k of L.lags) {
      const z = zOfLag(k);
      const r = xcq(qworld(z, { noise: false, snr: 20 }));
      const e = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
      if (r.status !== 'ok') allOk = false;
      worstLag = Math.max(worstLag, e);
      per.push({
        k,
        z: sig(z, 6),
        error: sig(e),
        status: r.status,
        code: r.code ?? null,
      });
    }
    for (const z of L.zs) {
      const r = xcq(qworld(z, { noise: false, snr: 20 }));
      const e = r.status === 'ok' ? Math.abs(r.z - z) : Infinity;
      if (r.status !== 'ok') allOk = false;
      worstSub = Math.max(worstSub, e);
      per.push({ z, error: sig(e), status: r.status, code: r.code ?? null });
    }
    row(
      'A7b.quasarShiftNonHarmonic',
      allOk && worstLag <= L.maxAbsoluteZLag && worstSub <= L.maxAbsoluteZSub,
      { worstLag, worstSub, per }
    );
  }

  // ---- B3b: the redshift against the independent implementation --------------------------------------

  if (wanted('B3b.')) {
    const L = lim('B3b.redshiftOracleNonHarmonic');
    let worstZ = 0;
    let worstS = 0;
    let worstQ = 0;
    let worstP = 0;
    let allOk = true;
    const codes = [];
    const tpl = { ...TPL, flux: Float64Array.from(INPUTS.template.flux) };
    INPUTS.quasars.forEach((c, i) => {
      const spec = specOf(c.flux, c.sigmaPixel);
      const r = A.quasarRedshift(spec, tpl, {
        zRange: INPUTS.zRange,
        keepProfile: true,
      });
      const o = ORACLE.b3[i];
      codes.push(r.status === 'ok' ? 'ok' : (r.code ?? r.status));
      if (r.status !== 'ok') {
        allOk = false;
        return;
      }
      worstZ = Math.max(worstZ, Math.abs(r.z - o.z));
      worstS = Math.max(worstS, rel(r.sigmaZ, o.sigmaZ));
      worstQ = Math.max(worstQ, rel(r.q, o.q));
      if (i < L.profileCases) {
        const of = ORACLE.b3fft[i];
        const qmax = Math.max(...of.q.map(Math.abs));
        let w = 0;
        r.profile.q.forEach((v, j) => {
          w = Math.max(w, Math.abs(v - of.q[j]) / qmax);
        });
        if (r.profile.lag0 !== of.lag0 || r.profile.q.length !== of.q.length)
          allOk = false;
        worstP = Math.max(worstP, w);
      }
    });
    row(
      'B3b.redshiftOracleNonHarmonic',
      allOk &&
        INPUTS.quasars.length === L.n &&
        worstZ <= L.maxAbsoluteZ &&
        worstS <= L.maxRelativeSigma &&
        worstQ <= L.maxRelativeQ &&
        worstP <= L.maxRelativeProfile,
      { worstZ, worstSigma: worstS, worstQ, worstProfile: worstP, codes }
    );
  }

  // ---- C1b and C1c: the redshift's coverage, without and with the floor -----------------------------

  if (wanted('C1b.') || wanted('C1c.')) {
    const Lb = lim('C1b.redshiftCoverageNonHarmonic');
    const Lc = lim('C1c.redshiftCoverageWithFloor');
    const d = stream('forward', SEEDS.ensembleRedshift, 'params');
    const u = (a, b) => a + (b - a) * d();
    const noiseOnly = [];
    const withFloor = [];
    const status = {};
    const errs = [];
    let ok = 0;
    let catastrophic = 0;
    const floorShare = [];
    for (let i = 0; i < Lb.n; i++) {
      const z = u(Lb.zRange[0], Lb.zRange[1]);
      const snr = u(Lb.snrRange[0], Lb.snrRange[1]);
      const r = xcq(qworld(z, { seed: `fc1-${i}`, snr }));
      const key = r.status === 'ok' ? 'ok' : (r.code ?? r.status);
      status[key] = (status[key] ?? 0) + 1;
      if (r.status === 'ok') {
        ok++;
        errs.push(Math.abs(r.z - z));
        noiseOnly.push({ value: r.z, sigma: r.sigmaZ, truth: z });
        withFloor.push({ value: r.z, sigma: r.sigmaZTotal, truth: z });
        floorShare.push(r.modelSigmaZ ** 2 / r.sigmaZTotal ** 2);
      }
      if (r.z !== undefined && Math.abs(r.z - z) > 0.01) catastrophic++;
    }
    if (wanted('C1b.')) {
      const c = coverage(noiseOnly);
      row(
        'C1b.redshiftCoverageNonHarmonic',
        inRange(c.coverage, Lb.coverageBand) &&
          inRange(c.sdZ, Lb.sdBand) &&
          ok / Lb.n >= Lb.minOkFraction &&
          catastrophic / Lb.n <= Lb.maxCatastrophic,
        {
          ...c,
          okFraction: ok / Lb.n,
          catastrophic: catastrophic / Lb.n,
          status,
          medianAbsErrorZ: sig(median(errs), 3),
          medianSigmaZ: sig(median(noiseOnly.map(r => r.sigma)), 3),
        }
      );
    }
    if (wanted('C1c.')) {
      const c = coverage(withFloor);
      const two = withFloor.filter(
        r => Math.abs(r.value - r.truth) <= 2 * r.sigma
      ).length;
      row(
        'C1c.redshiftCoverageWithFloor',
        inRange(c.coverage, Lc.coverageBand) &&
          inRange(c.sdZ, Lc.sdBand) &&
          ok / Lc.n >= Lc.minOkFraction &&
          catastrophic / Lc.n <= Lc.maxCatastrophic,
        {
          ...c,
          okFraction: ok / Lc.n,
          catastrophic: catastrophic / Lc.n,
          status,
          medianSigmaZTotal: sig(median(withFloor.map(r => r.sigma)), 3),
        }
      );
      reported('C1c.coverageAtTwoSigma', {
        coverage: two / withFloor.length,
        medianFloorVarianceShare: sig(median(floorShare), 3),
      });
    }
  }

  // ---- D2b: a failed fit at the expected position is a non-detection ----------------------------------

  if (wanted('D2b.')) {
    const L = lim('D2b.failedFitIsNondetection');
    let weakOk = 0;
    let viaFit = 0;
    let blendOk = 0;
    let guardMeasured = 0;
    let guardNondetected = 0;
    const codes = {};
    const bump = (k, o = codes) => {
      o[k] = (o[k] ?? 0) + 1;
    };
    for (let i = 0; i < L.nWeak; i++) {
      const w = nworld({
        z: 0.1,
        x: -0.5,
        y: Math.log10(L.oFraction),
        hAlphaFlux: 3,
        snr: 10,
        seed: `fd2a-${i}`,
      });
      const m = measure(w);
      const c =
        m.status === 'ok'
          ? A.classifyBpt({ lines: m.lines, definition: CURVES })
          : m;
      bump(c.code ?? c.status);
      if (
        c.status === 'not-constrained' &&
        c.code === 'line-not-detected' &&
        c.lines.includes('o')
      ) {
        weakOk++;
        if (c.fitFailed) viaFit++;
      }
    }
    for (let i = 0; i < L.nBlend; i++) {
      const w2 = nworld({
        z: 0.1,
        x: -0.5,
        y: 0.2,
        hAlphaFlux: 3,
        snr: 10,
        restSeparationNm: L.blendSeparationNm,
        seed: `fd2b-${i}`,
      });
      const m2 = measure(w2);
      bump(`blend:${m2.code ?? m2.status}`);
      if (m2.status === 'not-constrained' && m2.code === 'unresolved-blend')
        blendOk++;
    }
    for (let i = 0; i < L.nGuard; i++) {
      const w3 = nworld({
        z: 0.1,
        x: -0.5,
        y: Math.log10(L.guardOFraction),
        hAlphaFlux: 3,
        snr: 10,
        seed: `fd2c-${i}`,
      });
      const m3 = measure(w3);
      const c3 =
        m3.status === 'ok'
          ? A.classifyBpt({ lines: m3.lines, definition: CURVES })
          : m3;
      bump(`guard:${c3.code ?? c3.status}`);
      if (m3.status === 'ok') guardMeasured++;
      if (c3.code === 'line-not-detected') guardNondetected++;
    }
    row(
      'D2b.failedFitIsNondetection',
      weakOk / L.nWeak >= L.minRefused &&
        blendOk / L.nBlend >= L.minRefused &&
        guardMeasured === L.nGuard &&
        guardNondetected <= L.maxGuardNondetected,
      {
        weakRefused: weakOk,
        ofWeak: L.nWeak,
        blendRefused: blendOk,
        ofBlend: L.nBlend,
        guardMeasured,
        guardNondetected,
        ofGuard: L.nGuard,
        codes,
      }
    );
    reported('D2b.reachedThroughFitFailure', {
      worlds: viaFit,
      of: L.nWeak,
    });
  }

  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const rows = runFollowup({ only });
  const sorted = [...rows].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(sorted)}\n`);
  } else {
    for (const r of sorted)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(40)} ${JSON.stringify(r.measured).slice(0, 600)}`
      );
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'followup-results.json'),
      `${JSON.stringify({ format: 'gravitas.agn-followup-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'followup-failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.agn-followup-failed-legs/1',
          label:
            'These follow-up legs crossed a committed bound and stay failing; only Carl resets one. The old legs of failed-legs.json are separate and unchanged.',
          legs: sorted
            .filter(r => r.status === 'fail')
            .map(r => ({ id: r.id, measured: r.measured, note: r.note })),
        },
        null,
        2
      )}\n`
    );
  process.exitCode = rows.some(r => r.status === 'fail') ? 1 : 0;
}
