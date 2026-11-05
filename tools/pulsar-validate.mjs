#!/usr/bin/env node
// =============================================================================
// The pulsar kernel against its committed thresholds (Prompt 242, Part A)
// -----------------------------------------------------------------------------
//   npm run pulsar:validate                     print the table (several minutes: the ensembles)
//   npm run pulsar:validate -- --json           print it as JSON
//   npm run pulsar:validate -- --write-results  rewrite tests/fixtures/pulsars/results.json
//   npm run pulsar:validate -- --write-failed   rewrite tests/fixtures/pulsars/failed-legs.json
//   --only=A1,B1                                run the legs whose id starts with these
//
// tests/fixtures/pulsars/thresholds.json fixed every bound before the kernel existed
// (PULSARS.md, "Validation contract"); this reads the bounds from that file, not from
// copies. The B rows read tests/fixtures/pulsars/oracle-results.json, which
// tools/pulsar-oracle/oracle.py wrote (numpy, scipy, astropy; no Gravitas code). A leg
// whose authentic file or tool was never supplied is NOT RUN and says why.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/radio/index.js';
import { periodogram } from '../js/kernels/variables/period.js';
import { chi2Sf } from '../js/kernels/statistics/special.js';
import { PC_M } from '../js/kernels/radiation/constants.js';
import { H_PLANCK } from '../js/kernels/radio/constants.js';
import { gaussian, stream } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/pulsars';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const CONSTANTS = read(`${DIR}/constants-source.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const INST = THRESHOLDS.instrument;
const SEEDS = THRESHOLDS.seeds;
const RULE = THRESHOLDS.analysisRule;

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const wrapTurn = x => x - Math.round(x);

/** The instrument of the thresholds, with overrides. */
const world = (o = {}) =>
  K.generateDynamicSpectrum({
    bandMHz: INST.bandMHz,
    channels: INST.channels,
    dt: INST.dtS,
    samples: INST.samples,
    noiseSigma: INST.noiseSigma,
    sigmaTurns: INST.profile.sigmaTurns,
    ...o,
  });

const RANGES = {
  dmRange: [10, 140],
  periodRange: [0.15, 0.35],
};
const analyze = (dyn, extra = {}) =>
  K.analyzePulsar(dyn, { ...RANGES, ...extra });

const throwsCode = fn => {
  try {
    const r = fn();
    return r?.status === 'refused' ? r.code : null;
  } catch (e) {
    return e?.code ?? 'threw-without-code';
  }
};

/** A circular centroid of a folded profile about its maximum, in turns. */
function centroid(profile) {
  const n = profile.length;
  const lo = Math.min(...profile);
  let b0 = 0;
  for (let b = 1; b < n; b++) if (profile[b] > profile[b0]) b0 = b;
  let sw = 0;
  let sx = 0;
  for (let d = -n / 4; d <= n / 4; d++) {
    const b = (((b0 + d) % n) + n) % n;
    const w = profile[b] - lo;
    sw += w;
    sx += w * d;
  }
  return (b0 + 0.5 + sx / sw) / n;
}

/**
 * Run the legs.
 * @param {{only?: string[]}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [] } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();
  const analytic = INST.periodTruthS.analytic.map((period, i) => ({
    period,
    dm: INST.dmTruth.analytic[i],
    phase0: [0.3, 0.7, 0.1, 0.55, 0.9, 0.42][i],
  }));

  // ---- A1: the dispersion law -------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.dispersionLaw');
    let ratio = 0;
    let linear = 0;
    let sweepErr = 0;
    let inverse = 0;
    let units = 0;
    for (const f of L.frequenciesMHz)
      for (const dm of L.dms) {
        ratio = Math.max(
          ratio,
          rel(K.dispersionDelay(f, dm) / K.dispersionDelay(2 * f, dm), 4)
        );
        linear = Math.max(
          linear,
          rel(K.dispersionDelay(f, 3 * dm) / K.dispersionDelay(f, dm), 3)
        );
        const g = f * 1.07;
        const sw = K.dispersionSweep(f, g, dm);
        sweepErr = Math.max(
          sweepErr,
          rel(sw, K.dispersionDelay(f, dm) - K.dispersionDelay(g, dm))
        );
        inverse = Math.max(inverse, rel(K.dmFromSweep(f, g, sw), dm));
        units = Math.max(
          units,
          rel(
            K.dispersionDelay(f * 1e6, dm, { unit: 'Hz' }),
            K.dispersionDelay(f, dm)
          ),
          rel(
            K.dispersionDelay(f / 1e3, dm, { unit: 'GHz' }),
            K.dispersionDelay(f, dm)
          )
        );
      }
    const later =
      K.dispersionDelay(1200, 50) > K.dispersionDelay(1500, 50) &&
      K.dispersionSweep(1200, 1500, 50) > 0;
    const refused =
      throwsCode(() => K.dispersionDelay(0, 10)) === 'bad-argument' &&
      throwsCode(() => K.dispersionDelay(1400, -1)) === 'bad-argument' &&
      throwsCode(() => K.dispersionDelay(1400, 10, { unit: 'THz' })) ===
        'bad-argument';
    row(
      'A1.dispersionLaw',
      ratio <= L.maxRelative &&
        linear <= L.maxRelative &&
        sweepErr <= L.maxRelative &&
        inverse <= L.maxInverseRelative &&
        units <= L.maxRelative &&
        later &&
        refused,
      {
        ratio: sig(ratio),
        linear: sig(linear),
        sweep: sig(sweepErr),
        inverse: sig(inverse),
        units: sig(units),
        lowerLater: later,
        refusals: refused,
      }
    );
  }

  // ---- A2: the constant -----------------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.dispersionConstant');
    const k =
      (((CONSTANTS.alpha.value * H_PLANCK) /
        (4 * Math.PI * Math.PI * CONSTANTS.m_e.value)) *
        PC_M *
        1e6) /
      1e12;
    const err = rel(K.DISPERSION_CONSTANT, k);
    const same =
      K.ALPHA_FS === CONSTANTS.alpha.value &&
      K.M_ELECTRON_KG === CONSTANTS.m_e.value;
    const status =
      /constants-source\.json/.test(K.DISPERSION.status) &&
      /not verified by a fetch/.test(K.DISPERSION.status);
    row('A2.dispersionConstant', err <= L.maxRelative && same && status, {
      relative: sig(err),
      inputsEqualFixture: same,
      statusNamesSource: status,
      astropy: CONSTANTS.astropy,
      reference: CONSTANTS.alpha.reference,
    });
  }

  // ---- A3: the smearing ----------------------------------------------------------------

  if (wanted('A3.')) {
    const L = lim('A3.smearing');
    const df = (INST.bandMHz[1] - INST.bandMHz[0]) / INST.channels;
    const fc = K.channelCentres(INST.bandMHz, INST.channels)[INST.channels / 2];
    let err = 0;
    let depart = 0;
    for (const dm of L.dms) {
      const s = K.smearing(fc, df, dm);
      const exact =
        K.DISPERSION_CONSTANT *
        dm *
        (1 / (fc - df / 2) ** 2 - 1 / (fc + df / 2) ** 2);
      const x = df / (2 * fc);
      err = Math.max(
        err,
        rel(s.exact, exact),
        rel(s.leading, exact * (1 - x * x) ** 2)
      );
      depart = Math.max(depart, Math.abs(s.ratio - 1));
    }
    row(
      'A3.smearing',
      err <= L.maxRelative && depart <= L.maxFormulaDeparture,
      { identityRelative: sig(err), formulaDeparture: sig(depart) }
    );
  }

  // ---- A4: de-dispersion and folding, noise-free ------------------------------------------

  if (wanted('A4.')) {
    const L = lim('A4.deDispersionNoiseFree');
    const nbin = RULE.nbin;
    let cLin = 0;
    let cNear = 0;
    let cons = 0;
    let ratioMin = Infinity;
    for (const [i, w] of analytic.entries()) {
      const dyn = world({
        ...w,
        amplitude: 1,
        subchannels: 1,
        noiseSigma: 0,
        seed: `a4-${i}`,
      });
      const top = dyn.frequencyMHz[dyn.nchan - 1];
      const truthPhase =
        (w.phase0 + (K.DISPERSION_CONSTANT * w.dm) / (top * top) / w.period) %
        1;
      for (const [method, tag] of [
        ['linear', 'lin'],
        ['nearest', 'near'],
      ]) {
        const dd = K.dedisperse(dyn, w.dm, { method });
        const f = K.foldSeries(dd.series, dyn.dt, w.period, nbin);
        const err = Math.abs(wrapTurn(centroid(f.profile) - truthPhase));
        if (tag === 'lin') {
          cLin = Math.max(cLin, err);
          let s = 0;
          for (let b = 0; b < nbin; b++) s += f.counts[b] * f.profile[b];
          cons = Math.max(cons, Math.abs(s - f.total) / Math.abs(f.total));
        } else cNear = Math.max(cNear, err);
      }
      const span =
        K.DISPERSION_CONSTANT * (1 / dyn.frequencyMHz[0] ** 2 - 1 / top ** 2);
      const dOff = (L.sweepSigmas * INST.profile.sigmaTurns * w.period) / span;
      const stat = dm => {
        const dd = K.dedisperse(dyn, dm, { method: 'linear' });
        return K.foldStatistic(
          K.foldSeries(dd.series, dyn.dt, w.period, nbin),
          1
        ).chi2;
      };
      ratioMin = Math.min(ratioMin, stat(w.dm) / stat(w.dm + dOff));
    }
    row(
      'A4.deDispersionNoiseFree',
      cLin <= L.centroidLinearTurn &&
        cNear <= L.centroidNearestTurn &&
        cons <= L.conservation &&
        ratioMin >= L.minStatisticRatio,
      {
        centroidLinearTurn: sig(cLin),
        centroidNearestTurn: sig(cNear),
        conservation: sig(cons),
        minStatisticRatio: sig(ratioMin),
      }
    );
  }

  // ---- A5: the period, noise-free ------------------------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.periodNoiseFree');
    let worst = 0;
    let lsWorst = 0;
    const per = [];
    for (const [i, w] of analytic.entries()) {
      const dyn = world({
        ...w,
        amplitude: 1,
        subchannels: 1,
        noiseSigma: 0,
        seed: `a5-${i}`,
      });
      const given = 1e-3;
      const dd = K.dedisperse(dyn, w.dm, { method: 'nearest' });
      const s = K.searchPeriod(dd.series, dyn.dt, {
        pMin: RANGES.periodRange[0],
        pMax: RANGES.periodRange[1],
        nbin: RULE.nbin,
        sigma: given,
      });
      const r = K.refinePeriod(dyn, {
        period: s.period,
        dm: w.dm,
        sigma: given,
      });
      const e = r.status === 'ok' ? rel(r.period, w.period) : Infinity;
      worst = Math.max(worst, e);
      const ls = K.periodFromPeriodogram(dd.series, dyn.dt, {
        pMin: RANGES.periodRange[0],
        pMax: RANGES.periodRange[1],
      });
      const lsErr = Math.abs(ls.period - w.period) / ls.resolution;
      lsWorst = Math.max(lsWorst, lsErr);
      per.push(sig(e));
    }
    row(
      'A5.periodNoiseFree',
      worst <= L.relativePeriod && lsWorst <= L.periodogramWithinWidthFactor,
      {
        relativeError: sig(worst),
        relativeErrorBySeries: per,
        periodogramErrorOverWidth: sig(lsWorst),
      },
      worst <= L.relativePeriod
        ? ''
        : "Left failing and labelled, not tuned: the worst of the six noise-free periods is off by a relative amount above the committed 2e-6 (the grid-and-sub-integration period of a noise-free series is limited by how the 8 whole-pulse sub-integrations quantise the samples); the bound is Carl's to reset (AM9, AM10 record the two earlier fixes to the worlds)."
    );
  }

  // ---- A6: the DM, noise-free --------------------------------------------------------------------

  if (wanted('A6.')) {
    const L = lim('A6.dmNoiseFree');
    let worst = 0;
    const per = [];
    let refused = 0;
    for (const [i, w] of analytic.entries()) {
      const dyn = world({
        ...w,
        amplitude: 1,
        subchannels: 1,
        noiseSigma: 0,
        seed: `a6-${i}`,
      });
      const r = K.analyzePulsar(dyn, {
        dmRange: [0, 200],
        periodRange: RANGES.periodRange,
        sigma: L.givenSigmaFractionOfAmplitude,
      });
      if (r.status !== 'ok') {
        refused++;
        per.push(r.code);
        worst = Infinity;
        continue;
      }
      const e = Math.abs(r.dm.dm - w.dm);
      worst = Math.max(worst, e);
      per.push(sig(e));
    }
    row('A6.dmNoiseFree', worst <= L.maxErrorPcCm3, {
      maxErrorPcCm3: sig(worst),
      errorBySeries: per,
      refused,
    });
  }

  // ---- A7: the fold statistic's calibration -----------------------------------------------

  if (wanted('A7.')) {
    const L = lim('A7.foldStatisticCalibration');
    const stats = [];
    const ps = [];
    for (let i = 0; i < L.series; i++) {
      const draw = gaussian(stream('noise', SEEDS.noiseOnly, 'a7', i));
      const y = new Float64Array(INST.samples);
      for (let j = 0; j < y.length; j++) y[j] = INST.noiseSigma * draw();
      const f = K.foldSeries(y, INST.dtS, 0.2373, RULE.nbin);
      const s = K.foldStatistic(f, K.noiseSigma(y));
      stats.push(s.chi2);
      ps.push(s.p);
    }
    const dof = RULE.nbin - 1;
    const meanErr = Math.abs(mean(stats) / dof - 1);
    const frac = ps.filter(p => p < 0.05).length / ps.length;
    const monotone =
      K.trialCorrected(0.01, 10) >= 0.01 &&
      K.trialCorrected(0.01, 100) >= K.trialCorrected(0.01, 10) &&
      K.trialCorrected(0.5, 1e6) === 1 &&
      K.trialCorrected(0.01, 1) === 0.01;
    row(
      'A7.foldStatisticCalibration',
      meanErr <= L.meanTolerance &&
        frac >= L.fractionBand[0] &&
        frac <= L.fractionBand[1] &&
        monotone,
      {
        meanOverDof: sig(mean(stats) / dof),
        fractionBelow0p05: sig(frac),
        trialCorrectionMonotone: monotone,
        chi2Check: sig(chi2Sf(dof, dof)),
      }
    );
  }

  // ---- A8: the DM distance ---------------------------------------------------------------------

  if (wanted('A8.')) {
    const L = lim('A8.dmDistance');
    const src = 'a density the caller cites';
    let err = 0;
    let labelled = true;
    for (const [dm, n] of [
      [10, 0.02],
      [57.3, 0.05],
      [150, 0.1],
    ]) {
      const r = K.dmDistance({ dm, density: { value: n, source: src } });
      err = Math.max(err, rel(r.distancePc, dm / n));
      labelled &&=
        r.label === 'crude; assumes this electron density' &&
        r.densityCm3 === n &&
        r.densitySource === src &&
        r.statement.includes(K.DM_DISTANCE_LABEL);
    }
    const range = K.dmDistance({
      dm: 50,
      density: { value: 0.05, source: src, range: [0.02, 0.08] },
    });
    const rangeOk =
      rel(range.range.distancePc[0], 50 / 0.08) <= L.maxRelative &&
      rel(range.range.distancePc[1], 50 / 0.02) <= L.maxRelative &&
      range.label === K.DM_DISTANCE_LABEL;
    const refusals = [
      K.dmDistance({ dm: 50 }),
      K.dmDistance({ dm: 50, density: { value: 0, source: src } }),
      K.dmDistance({ dm: 50, density: { value: -1, source: src } }),
      K.dmDistance({ dm: 50, density: { value: NaN, source: src } }),
      K.dmDistance({ dm: 50, density: { value: 0.05 } }),
      K.dmDistance({ dm: -5, density: { value: 0.05, source: src } }),
      K.dmDistance({ dm: 50, density: { value: 0.05, source: ' ' } }),
    ];
    const refused = refusals.every(
      r =>
        r.status === 'refused' &&
        ['missing-density', 'bad-argument'].includes(r.code) &&
        r.distancePc === undefined
    );
    row(
      'A8.dmDistance',
      err <= L.maxRelative && labelled && rangeOk && refused,
      {
        relative: sig(err),
        everyResultLabelled: labelled,
        rangeOk,
        refusalCodes: refusals.map(r => r.code),
      }
    );
  }

  // ---- B1: the constant against astropy -----------------------------------------------------

  if (wanted('B1.')) {
    const L = lim('B1.constantVsAstropy');
    const c = rel(K.DISPERSION_CONSTANT, ORACLE.b1.constant);
    let dErr = 0;
    INPUTS.b1.dms.forEach((dm, i) =>
      INPUTS.b1.frequenciesMHz.forEach((f, j) => {
        dErr = Math.max(
          dErr,
          rel(K.dispersionDelay(f, dm), ORACLE.b1.delays[i][j])
        );
      })
    );
    row('B1.constantVsAstropy', c <= L.maxRelative && dErr <= L.maxRelative, {
      constantRelative: sig(c),
      delayRelative: sig(dErr),
      astropy: ORACLE.versions.astropy,
    });
  }

  // ---- B2 and B3: the periodogram, de-dispersion and folding against numpy -------------------

  if (wanted('B2.') || wanted('B3.')) {
    const b3 = INPUTS.b3;
    const dyn = K.generateDynamicSpectrum({
      bandMHz: INST.bandMHz,
      channels: INST.channels,
      dt: INST.dtS,
      samples: INST.samples,
      ...b3.world,
    });
    const dn = K.dedisperse(dyn, b3.dm, { method: 'nearest' });
    const dl = K.dedisperse(dyn, b3.dm, { method: 'linear' });
    if (wanted('B3.')) {
      const L = lim('B3.deDisperseFoldVsNumpy');
      const O = ORACLE.b3;
      const fn = K.foldSeries(dn.series, dyn.dt, b3.period, b3.nbin);
      const fl = K.foldSeries(dl.series, dyn.dt, b3.period, b3.nbin);
      const peak = a => Math.max(...a);
      const pdiff = (a, b) => maxOf(a.map((v, i) => Math.abs(v - b[i])));
      const dNear = pdiff(fn.profile, O.nearest.profile) / peak(fn.profile);
      const dLin = pdiff(fl.profile, O.linear.profile) / peak(fl.profile);
      const sN = K.foldStatistic(fn, K.noiseSigma(dn.series)).chi2;
      const sL = K.foldStatistic(fl, K.noiseSigma(dl.series)).chi2;
      const sErr = Math.max(
        rel(sN, O.nearest.statistic),
        rel(sL, O.linear.statistic)
      );
      let gen = 0;
      for (let c = 0; c < dyn.nchan; c++)
        for (let j = 0; j < 40; j++)
          gen = Math.max(
            gen,
            Math.abs(dyn.data[c * dyn.nsamp + j] - O.generator.first[c][j])
          );
      const sameLength =
        dn.length === O.nearest.length && dl.length === O.linear.length;
      row(
        'B3.deDisperseFoldVsNumpy',
        dNear <= L.profileOfPeak &&
          dLin <= L.profileOfPeak &&
          sErr <= L.statisticRelative &&
          sameLength,
        {
          nearestProfileOfPeak: sig(dNear),
          linearProfileOfPeak: sig(dLin),
          statisticRelative: sig(sErr),
          sameLength,
          generatorFirst40MaxDifference: sig(gen),
        },
        "the generator is compared too (its first 40 samples of every channel against the oracle's forward model and port of the named stream); its difference is a measured fact, not a committed bound"
      );
    }
    if (wanted('B2.')) {
      const L = lim('B2.periodogramVsAstropy');
      const block = INPUTS.b2.block;
      const nn = Math.floor(dn.length / block);
      const y = new Float64Array(nn);
      const t = new Float64Array(nn);
      for (let i = 0; i < nn; i++) {
        let s = 0;
        for (let j = 0; j < block; j++) s += dn.series[i * block + j];
        y[i] = s / block;
        t[i] = (i * block + (block - 1) / 2) * dyn.dt;
      }
      const pw = periodogram(t, y, INPUTS.b2.periods);
      const d = maxOf(
        Array.from(pw, (v, i) => Math.abs(v - ORACLE.b2.power[i]))
      );
      row('B2.periodogramVsAstropy', d <= L.maxAbsolute, {
        maxAbsolute: sig(d),
        periods: INPUTS.b2.periods.length,
        astropy: ORACLE.versions.astropy,
      });
    }
  }

  // ---- B4 and B5: the DM and the period against numpy -----------------------------------------

  if (wanted('B4.') || wanted('B5.')) {
    const L4 = lim('B4.dmMeasureVsNumpy');
    const L5 = lim('B5.periodVsNumpy');
    let dmD = 0;
    let sigD = 0;
    let phD = 0;
    let usedEq = true;
    let perD = 0;
    let psD = 0;
    let refusedBoth = 0;
    let mismatch = 0;
    INPUTS.b45.worlds.forEach((w, i) => {
      const dyn = K.generateDynamicSpectrum({
        bandMHz: INST.bandMHz,
        channels: INST.channels,
        dt: INST.dtS,
        samples: INST.samples,
        ...w,
      });
      const r = K.analyzePulsar(dyn, {
        dmRange: INPUTS.b45.ranges.dm,
        periodRange: INPUTS.b45.ranges.period,
      });
      const o = ORACLE.b45[i];
      if (r.status !== 'ok' || o.refused) {
        if (r.status !== 'ok' && o.refused) refusedBoth++;
        else mismatch++;
        return;
      }
      dmD = Math.max(dmD, Math.abs(r.dm.dm - o.dm));
      sigD = Math.max(sigD, rel(r.dm.sigma, o.dmSigma));
      r.dm.channels.forEach((c, k) => {
        if (o.phases[k] !== null && c.phase !== undefined)
          phD = Math.max(phD, Math.abs(c.phase - o.phases[k]));
      });
      if (r.dm.usedChannels !== o.used) usedEq = false;
      perD = Math.max(perD, rel(r.period.period, o.period));
      psD = Math.max(psD, rel(r.period.sigma, o.periodSigma));
    });
    if (wanted('B4.'))
      row(
        'B4.dmMeasureVsNumpy',
        mismatch === 0 &&
          dmD <= L4.dmPcCm3 &&
          sigD <= L4.sigmaRelative &&
          phD <= L4.phaseTurn &&
          usedEq,
        {
          series: INPUTS.b45.worlds.length,
          dmPcCm3: sig(dmD),
          sigmaRelative: sig(sigD),
          phaseTurn: sig(phD),
          usedChannelsEqual: usedEq,
          refusedByBoth: refusedBoth,
          disagreementOnRefusal: mismatch,
          numpy: ORACLE.versions.numpy,
          scipy: ORACLE.versions.scipy,
        }
      );
    if (wanted('B5.'))
      row(
        'B5.periodVsNumpy',
        mismatch === 0 && perD <= L5.periodRelative && psD <= L5.sigmaRelative,
        {
          periodRelative: sig(perD),
          sigmaRelative: sig(psD),
        }
      );
  }

  if (wanted('B6.'))
    notRun(
      'B6.toolkit',
      "no independent pulsar toolkit is installed here and installing one is a download that was not made; the oracle of record is the independent implementation of B1 to B5. To run it: tools/pulsar-oracle/export-series.mjs writes the series, a toolkit of Carl's choice is run on it, and its output goes to tests/fixtures/pulsars/toolkit/result.json (schema in PULSARS.md)"
    );

  // ---- C1 and C2: coverage ---------------------------------------------------------------------

  if (wanted('C1.') || wanted('C2.')) {
    const L1 = lim('C1.dmCoverage');
    const L2 = lim('C2.periodCoverage');
    const draw = stream('forward', SEEDS.ensembleC, 'c');
    let n = 0;
    let dm68 = 0;
    let dm95 = 0;
    let p68 = 0;
    let p95 = 0;
    let refused = 0;
    const codes = {};
    for (let i = 0; i < L1.n; i++) {
      const period = 0.2 + 0.1 * draw();
      const dm = 20 + 100 * draw();
      const phase0 = draw();
      const dyn = world({
        period,
        dm,
        phase0,
        amplitude: INST.profile.peakAmplitude.faint,
        subchannels: INST.subchannels.ensemble,
        seed: `c-${i}`,
      });
      const r = analyze(dyn);
      if (r.status !== 'ok') {
        refused++;
        codes[r.code] = (codes[r.code] ?? 0) + 1;
        continue;
      }
      n++;
      const inside = (iv, v) => v >= iv.lo && v <= iv.hi;
      dm68 += inside(r.dm.interval68, dm);
      dm95 += inside(r.dm.interval95, dm);
      p68 += inside(r.period.interval68, period);
      p95 += inside(r.period.interval95, period);
    }
    const c = {
      dm68: dm68 / n,
      dm95: dm95 / n,
      p68: p68 / n,
      p95: p95 / n,
    };
    const inBand = (v, b) => v >= b[0] && v <= b[1];
    if (wanted('C1.'))
      row(
        'C1.dmCoverage',
        refused <= L1.refusalsAllowed &&
          inBand(c.dm68, L1.band68) &&
          inBand(c.dm95, L1.band95),
        {
          realisations: L1.n,
          returned: n,
          refused,
          refusalCodes: codes,
          coverage68: sig(c.dm68),
          coverage95: sig(c.dm95),
        }
      );
    if (wanted('C2.'))
      row(
        'C2.periodCoverage',
        inBand(c.p68, L2.band68) && inBand(c.p95, L2.band95),
        {
          returned: n,
          coverage68: sig(c.p68),
          coverage95: sig(c.p95),
        }
      );
  }

  // ---- C3: false alarms ------------------------------------------------------------------------------------

  if (wanted('C3.')) {
    const L = lim('C3.falseAlarm');
    let refused = 0;
    let numbers = 0;
    const codes = {};
    for (let i = 0; i < L.n; i++) {
      const dyn = world({ amplitude: 0, period: 0.25, dm: 50, seed: `n-${i}` });
      const r = analyze(dyn);
      if (r.status === 'refused') {
        refused++;
        codes[r.code] = (codes[r.code] ?? 0) + 1;
      }
      if (r.dm?.dm !== undefined || r.period?.period !== undefined) numbers++;
    }
    row('C3.falseAlarm', refused / L.n >= L.minRefusalRate && numbers === 0, {
      series: L.n,
      refusalRate: sig(refused / L.n),
      refusalCodes: codes,
      returnedANumber: numbers,
    });
  }

  // ---- C4: blind recovery -----------------------------------------------------------------------------------

  if (wanted('C4.')) {
    const L = lim('C4.blindRecovery');
    const draw = stream('forward', SEEDS.blind, 'c4');
    let pIn = 0;
    let dIn = 0;
    let refused = 0;
    const detail = [];
    for (let i = 0; i < L.n; i++) {
      const period = 0.1 + 0.5 * draw();
      const dm = 10 + 140 * draw();
      const dyn = world({
        period,
        dm,
        phase0: draw(),
        amplitude: INST.profile.peakAmplitude.bright,
        subchannels: INST.subchannels.ensemble,
        seed: `c4-${i}`,
      });
      const r = K.analyzePulsar(dyn, {
        dmRange: [0, 200],
        periodRange: [0.05, 1.0],
      });
      if (r.status !== 'ok') {
        refused++;
        detail.push({ code: r.code });
        continue;
      }
      const pOk =
        period >= r.period.interval95.lo && period <= r.period.interval95.hi;
      const dOk = dm >= r.dm.interval95.lo && dm <= r.dm.interval95.hi;
      pIn += pOk;
      dIn += dOk;
      detail.push({
        periodZ: sig((r.period.period - period) / r.period.sigma, 3),
        dmZ: sig((r.dm.dm - dm) / r.dm.sigma, 3),
      });
    }
    row(
      'C4.blindRecovery',
      refused === 0 && pIn >= L.minInside && dIn >= L.minInside,
      {
        realisations: L.n,
        refused,
        periodInside95: pIn,
        dmInside95: dIn,
        detail,
      }
    );
  }

  // ---- C5: detection power (reported) -------------------------------------------------------------------

  if (wanted('C5.')) {
    const L = lim('C5.detectionPower');
    const draw = stream('forward', SEEDS.report, 'c5');
    const out = {};
    for (const amp of L.amplitudes) {
      let detected = 0;
      let ok = 0;
      for (let i = 0; i < L.n; i++) {
        const dyn = world({
          period: 0.2 + 0.1 * draw(),
          dm: 20 + 100 * draw(),
          phase0: draw(),
          amplitude: amp,
          subchannels: INST.subchannels.ensemble,
          seed: `c5-${amp}-${i}`,
        });
        const r = analyze(dyn);
        if (r.code !== 'no-pulsar') detected++;
        if (r.status === 'ok') ok++;
      }
      out[amp] = {
        notRefusedNoPulsar: sig(detected / L.n),
        fullResult: sig(ok / L.n),
      };
    }
    reported('C5.detectionPower', {
      realisationsPerAmplitude: L.n,
      byAmplitude: out,
    });
  }

  // ---- D1: one frequency ---------------------------------------------------------------------------------------

  if (wanted('D1.')) {
    const w = { period: 0.2373, dm: 60, phase0: 0.4 };
    const one = world({
      ...w,
      channels: 1,
      bandMHz: [1350, 1351],
      amplitude: 3,
      seed: 'd1-one',
    });
    const r1 = analyze(one, { dmRange: [0, 200] });
    const periodOk =
      r1.period?.status === 'ok' &&
      w.period >= r1.period.interval95.lo &&
      w.period <= r1.period.interval95.hi;
    const dmRefused =
      r1.dm?.status === 'refused' &&
      r1.dm.code === 'not-constrained' &&
      r1.dm.dm === undefined;
    const narrow = world({
      ...w,
      channels: 4,
      bandMHz: [1350, 1351],
      amplitude: 1,
      seed: 'd1-narrow',
    });
    const r2 = analyze(narrow, { dmRange: [0, 200] });
    const noNumber = r2.status === 'refused' && r2.dm?.dm === undefined;
    row('D1.singleFrequency', periodOk && dmRefused && noNumber, {
      singleChannel: {
        status: r1.status,
        periodInside95: periodOk,
        dmCode: r1.dm?.code,
      },
      narrowBand: { status: r2.status, code: r2.code },
    });
  }

  // ---- D2: noise only ------------------------------------------------------------------------------------------------

  if (wanted('D2.')) {
    const r = analyze(
      world({ amplitude: 0, period: 0.25, dm: 50, seed: 'd2' })
    );
    row(
      'D2.noiseOnly',
      r.status === 'refused' &&
        r.code === 'no-pulsar' &&
        r.period === undefined &&
        r.dm === undefined &&
        Number.isFinite(r.search?.pCorrected),
      {
        status: r.status,
        code: r.code,
        trialCorrectedP: sig(r.search?.pCorrected),
        trials: r.search?.trials,
      }
    );
  }

  // ---- D3: a DM outside the range ------------------------------------------------------------------------------------

  if (wanted('D3.')) {
    const L = lim('D3.dmOutsideRange');
    const dyn = world({
      period: 0.2373,
      dm: L.dm,
      phase0: 0.3,
      amplitude: 1,
      subchannels: 4,
      seed: 'd3',
    });
    const r = K.analyzePulsar(dyn, {
      dmRange: L.range,
      periodRange: RANGES.periodRange,
    });
    row(
      'D3.dmOutsideRange',
      r.status === 'refused' && !!r.code && r.dm?.dm === undefined,
      {
        status: r.status,
        code: r.code,
      }
    );
  }

  // ---- D4: a wrong period ----------------------------------------------------------------------------------------------

  if (wanted('D4.')) {
    const L = lim('D4.wrongPeriod');
    const w = { period: 0.2373, dm: 60, phase0: 0.3 };
    const dyn = world({ ...w, amplitude: 1, subchannels: 4, seed: 'd4' });
    const r = K.refineDm(dyn, {
      period: w.period * (1 + L.periodOffsetFraction),
      dm0: w.dm,
    });
    row(
      'D4.wrongPeriod',
      r.status === 'refused' &&
        ['no-pulsar', 'too-few-channels'].includes(r.code),
      { status: r.status, code: r.code }
    );
  }

  // ---- D5: too few channels ----------------------------------------------------------------------------------------------

  if (wanted('D5.')) {
    const w = { period: 0.2373, dm: 60, phase0: 0.3 };
    const bright = world({ ...w, amplitude: 2, seed: 'd5-bright' });
    const noise = world({ ...w, amplitude: 0, seed: 'd5-noise' });
    const dyn = { ...bright, data: Float64Array.from(noise.data) };
    for (const c of [3, 12])
      dyn.data.set(
        bright.data.subarray(c * bright.nsamp, (c + 1) * bright.nsamp),
        c * bright.nsamp
      );
    const r = K.refineDm(dyn, { period: w.period, dm0: w.dm });
    row(
      'D5.fewChannels',
      r.status === 'refused' && r.code === 'too-few-channels',
      {
        status: r.status,
        code: r.code,
        used: r.used,
      }
    );
  }

  // ---- D6: bad inputs -----------------------------------------------------------------------------------------------------

  if (wanted('D6.')) {
    const L = lim('D6.badInputs');
    const good = world({ period: 0.2373, dm: 60, amplitude: 1, seed: 'd6' });
    const withData = o => ({ ...good, ...o });
    const nan = Float64Array.from(good.data);
    nan[100] = NaN;
    const cases = {
      nonPositiveDt: () => analyze(withData({ dt: 0 })),
      nanInData: () => analyze(withData({ data: nan })),
      nbinTooSmall: () =>
        K.refineDm(good, { period: 0.2373, dm0: 60, nbin: L.minBins - 4 }),
      periodTooLong: () =>
        K.refineDm(good, {
          period: good.nsamp * good.dt * (L.maxPeriodFractionOfSeries + 0.05),
          dm0: 60,
        }),
      descendingFrequencies: () =>
        analyze(withData({ frequencyMHz: [...good.frequencyMHz].reverse() })),
      invertedDmRange: () => analyze(good, { dmRange: [140, 10] }),
      negativeDmStart: () => analyze(good, { dmRange: [-5, 140] }),
      lengthMismatch: () => analyze(withData({ data: good.data.subarray(10) })),
    };
    const codes = {};
    let allCoded = true;
    for (const [k, f] of Object.entries(cases)) {
      codes[k] = throwsCode(f);
      allCoded &&=
        typeof codes[k] === 'string' && codes[k] !== 'threw-without-code';
    }
    row('D6.badInputs', allCoded, { codes });
  }

  // ---- D7: the label and the manifest ------------------------------------------------------------------------------------------

  if (wanted('D7.')) {
    const s = world({
      period: 0.25,
      dm: 40,
      phase0: 0.2,
      amplitude: 1,
      seed: 'd7',
    });
    const need = [
      'period',
      'dm',
      'constant',
      'phase0',
      'components',
      'subchannels',
      'noiseSigma',
      'seed',
      'delaysS',
      'sweepS',
      'sweepTurns',
      'smearingS',
    ];
    const manifest = need.every(k => s.truth[k] !== undefined);
    const labelled =
      s.label === K.PULSAR_SYNTHETIC_LABEL &&
      s.truth.label === K.PULSAR_SYNTHETIC_LABEL &&
      /SYNTHETIC/.test(s.label);
    const refuses = [
      () => K.generateDynamicSpectrum({ period: 0.25, dm: -1 }),
      () => K.generateDynamicSpectrum({ period: 0.25, dm: NaN }),
      () => K.generateDynamicSpectrum({ period: 0, dm: 10 }),
      () => K.generateDynamicSpectrum({ period: 0.25, dm: 10, noiseSigma: -1 }),
      () =>
        K.generateDynamicSpectrum({
          period: 0.25,
          dm: 10,
          bandMHz: [1500, 1200],
        }),
    ].map(f => throwsCode(f));
    row(
      'D7.labelAndManifest',
      manifest && labelled && refuses.every(c => c === 'bad-argument'),
      { manifestComplete: manifest, labelled, refusalCodes: refuses }
    );
  }

  // ---- E1 and E2: the pack ----------------------------------------------------------------------------------------------------

  if (wanted('E1.'))
    notRun(
      'E1.authenticSeries',
      'no authentic dynamic spectrum or folded profile is in the tree: RADIO_DATA_GATE.md rows P1 to P3 and K1a to K1c are C, and the one row that passes (16, the NANOGrav 15-year table) has no series; the authentic leg waits for Carl (what to supply is in PULSARS.md)'
    );

  if (wanted('E2.')) {
    const L = lim('E2.catalogueRows');
    const manifest = read('data-packs/nanograv-15yr-pulsars.json');
    const table = tableOf({
      PACK: manifest,
      SERIES: read('radio/nanograv-15yr-pulsars.json'),
    });
    const col = id => table.columns.find(c => c.id === id).values;
    const f0 = col('f0');
    const dmCol = col('dm');
    const names = manifest.object.identifiers;
    let eligible = 0;
    let ok = 0;
    let covered = 0;
    let threw = 0;
    let refused = 0;
    const codes = {};
    const miss = [];
    for (let i = 0; i < names.length; i++) {
      const row0 = { name: names[i], f0Hz: f0[i], dmPcCm3: dmCol[i] };
      const p = K.pulsarFromRow(row0);
      if (
        p.period * 1e3 < L.periodMs[0] ||
        p.period * 1e3 > L.periodMs[1] ||
        p.dm < L.dmPcCm3[0] ||
        p.dm > L.dmPcCm3[1]
      )
        continue;
      eligible++;
      const dt = p.period / L.samplesPerPeriod;
      const dyn = K.generateDynamicSpectrum({
        period: p.period,
        dm: p.dm,
        phase0: 0.3,
        bandMHz: INST.bandMHz,
        channels: L.channels,
        dt,
        samples: Math.round((L.pulses * p.period) / dt),
        amplitude: 1,
        subchannels: INST.subchannels.ensemble,
        seed: `e2-${names[i]}`,
      });
      let r;
      try {
        r = K.analyzePulsar(dyn, {
          dmRange: [Math.max(0, p.dm - 10), p.dm + 10],
          periodRange: [0.8 * p.period, 1.25 * p.period],
        });
      } catch (e) {
        threw++;
        codes[`threw:${e?.code ?? e?.message}`] =
          (codes[`threw:${e?.code ?? e?.message}`] ?? 0) + 1;
        continue;
      }
      if (r.status !== 'ok') {
        refused++;
        codes[r.code] = (codes[r.code] ?? 0) + 1;
        continue;
      }
      ok++;
      if (p.dm >= r.dm.interval95.lo && p.dm <= r.dm.interval95.hi) covered++;
      else miss.push(names[i]);
    }
    row(
      'E2.catalogueRows',
      threw === 0 && ok > 0 && covered / ok >= L.minCoverage95,
      {
        eligibleRows: eligible,
        analysed: ok,
        refused,
        refusalCodes: codes,
        threw,
        dmCoverage95: sig(covered / Math.max(1, ok)),
        notCovered: miss,
        authentic: false,
      },
      "synthetic series built from the pack's own periods and DMs: the generator's truth is the row, so this is not an authentic leg"
    );
  }

  // ---- R1 and R2: reported --------------------------------------------------------------------------------------------------------

  if (wanted('R1.')) {
    const L = lim('R1.smearingBias');
    const draw = stream('forward', SEEDS.report, 'r1');
    const out = {};
    for (const nchan of [16, 64])
      for (const sub of [1, 4]) {
        const z = [];
        const s = [];
        const chi = [];
        for (let i = 0; i < L.n; i++) {
          const period = 0.2 + 0.1 * draw();
          const dyn = world({
            period,
            dm: 120,
            phase0: draw(),
            channels: nchan,
            amplitude: INST.profile.peakAmplitude.faint,
            subchannels: sub,
            seed: `r1-${nchan}-${sub}-${i}`,
          });
          const r = K.refineDm(dyn, { period, dm0: 120.8 });
          if (r.status !== 'ok') continue;
          z.push((r.dm - 120) / r.sigma);
          s.push(r.sigma);
          chi.push(r.chi2Reduced);
        }
        out[`${nchan} channels, ${sub} sub-bands`] = {
          returned: z.length,
          meanZ: sig(mean(z)),
          sdZ: sig(sd(z)),
          meanSigmaPcCm3: sig(mean(s)),
          meanReducedChi2: sig(mean(chi)),
        };
      }
    reported('R1.smearingBias', { realisations: L.n, byConfiguration: out });
  }

  if (wanted('R2.')) {
    const L = lim('R2.profileEvolution');
    const draw = stream('forward', SEEDS.report, 'r2');
    const [fLo] = INST.bandMHz;
    const fTop = K.channelCentres(INST.bandMHz, INST.channels).at(-1);
    const components = f => [
      {
        amp: 1,
        center: 0,
        sigma:
          INST.profile.sigmaTurns *
          (1 + (L.widthGrowth * (fTop - f)) / (fTop - fLo)),
      },
      {
        amp: (0.5 * (1 / f - 1 / fTop)) / (1 / fLo - 1 / fTop),
        center: L.secondComponentTurn,
        sigma: INST.profile.sigmaTurns,
      },
    ];
    const z = [];
    const chi = [];
    let flagged = 0;
    for (let i = 0; i < L.n; i++) {
      const period = 0.2 + 0.1 * draw();
      const dyn = world({
        period,
        dm: 60,
        phase0: draw(),
        components,
        amplitude: INST.profile.peakAmplitude.bright,
        subchannels: INST.subchannels.ensemble,
        seed: `r2-${i}`,
      });
      const r = K.refineDm(dyn, { period, dm0: 60.8 });
      if (r.status !== 'ok') continue;
      z.push((r.dm - 60) / r.sigma);
      chi.push(r.chi2Reduced);
      if (r.structuredResiduals) flagged++;
    }
    reported('R2.profileEvolution', {
      realisations: L.n,
      returned: z.length,
      meanZ: sig(mean(z)),
      sdZ: sig(sd(z)),
      meanReducedChi2: sig(mean(chi)),
      flaggedStructuredResiduals: sig(flagged / Math.max(1, z.length)),
    });
  }

  const cpu = process.cpuUsage(cpu0);
  rows.push({
    id: '_cpu',
    status: 'info',
    measured: { cpuSeconds: sig((cpu.user + cpu.system) / 1e6, 3) },
    note: 'recorded, not compared',
  });
  return rows;
}

// ---- command line -----------------------------------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : [];
  const all = runValidation({ only });
  const rows = all.filter(r => r.id !== '_cpu');
  const sorted = [...rows].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(all)}\n`);
  } else {
    for (const r of sorted)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(28)} ${JSON.stringify(r.measured)}`
      );
    const count = s => rows.filter(r => r.status === s).length;
    console.log(
      `\n${rows.length} rows: ${count('pass')} pass, ${count('fail')} fail, ${count('reported')} reported, ${count('not-run')} not run`
    );
  }
  if (args.includes('--write-results') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.pulsar-results/1', rows: sorted }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only.length)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(
        {
          format: 'gravitas.pulsar-failed-legs/1',
          label:
            'These legs crossed a committed bound and stay failing; only Carl resets one.',
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
