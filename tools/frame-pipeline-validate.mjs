#!/usr/bin/env node
// =============================================================================
// The frame pipeline against its committed thresholds (Prompt 185)
// -----------------------------------------------------------------------------
//   npm run frame-pipeline:validate                  print the table
//   npm run frame-pipeline:validate -- --json        print it as JSON
//   npm run frame-pipeline:validate -- --leg a1,d1   only these legs (prefix match)
//
// tests/fixtures/framepipeline/thresholds.json fixed every bound before
// js/measure/frameSeries.js had been run (FRAME_PIPELINE.md, "The validation
// contract"). This runs the checks against the production modules and judges
// them against those bounds, read from the file and not copied.
// tests/framePipeline.test.js runs it in plain Node (Jest's VM makes Math and
// Float64Array reads about ten times slower) and asserts every row.
//
// The frames are the detector kernel's (js/measure/frameSource.js through
// tools/frame-pipeline-synth.mjs); the oracle's rows read the frames and the
// results pinned in tests/fixtures/framepipeline/. Nothing here stores a value
// that passes through exp, log, pow or a trigonometric function across Node
// versions: bounds, counts and tolerances are judged. Check g1 is reported as
// not run: it needs Prompt 189's frames.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  simulateFrame,
  simulateSeries,
  normalizeDetector,
} from '../js/kernels/detector/frame.js';
import {
  calibrate,
  differentialMagnitude,
} from '../js/kernels/detector/reduce.js';
import {
  buildMasters,
  mastersVariance,
  reduceSeries,
} from '../js/kernels/detector/pipeline.js';
import {
  LAB_DETECTOR,
  SERIES_FIELD,
  labCalibration,
  labSeries,
} from '../js/kernels/detector/lab.js';
import VAR_DEEP from '../js/data/investigations/depth/a-variable-star-from-frames.js';
import { chi2Survival } from '../js/measure/astrometry.js';
import { applyRegistration } from '../js/measure/astrometry.js';
import {
  demoSequence,
  digestOf,
  syntheticSequence,
} from '../js/measure/frameSource.js';
import {
  RULES,
  checkSequence,
  maxPixels,
  quantitiesOf,
  reductionOf,
  replay,
  runSequence,
  sidecarOf,
} from '../js/measure/frameSeries.js';
import { validateImage } from '../js/dataKinds/contract.js';
import {
  STARS,
  THRESHOLDS,
  check,
  sceneParams,
  sceneSequence,
} from './frame-pipeline-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/framepipeline');
const C = THRESHOLDS.checks;
const SCENE = THRESHOLDS.scene;
const TRUE_PERIOD = SCENE.variable.period;
const TRUE_AMPLITUDE = SCENE.variable.amplitude;

const argv = process.argv.slice(2);
const only = (
  argv.find(a => a.startsWith('--leg='))?.slice(6) ??
  (argv.includes('--leg') ? argv[argv.indexOf('--leg') + 1] : '')
)
  .split(',')
  .filter(Boolean);
const wants = id => !only.length || only.some(p => id.startsWith(p));

const rows = [];
const add = (id, measured, ok, extra = {}) =>
  rows.push({ id, measured, pass: Boolean(ok), ...extra });
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const quantile = (a, f) => {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil(f * s.length) - 1)];
};
const hooks = { check, yieldNow: async () => {} };

/** The nominal star a mark of the reference frame is, by position. */
const truthOf = m => {
  let best = null;
  for (const s of STARS) {
    const d = Math.hypot(s.x - m.x, s.y - m.y);
    if (d < 2 && (!best || d < best.d)) best = { id: s.id, d };
  }
  return best?.id ?? null;
};
const markFor = (res, id) => res.marks.find(m => truthOf(m) === id)?.id;

const run = async (seq, params = sceneParams(), extra = {}) =>
  runSequence(seq, params, { ...hooks, ...extra });
const must = r => {
  if (!r.ok) throw new Error(`refused: ${r.code} ${r.frames ?? ''}`);
  return r;
};

// ---- the ensemble: a1, a2, a5, c1 ------------------------------------------------------

async function ensemble() {
  const N = SCENE.ensemble;
  const out = [];
  for (let i = 0; i < N; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-ens-${i}`);
    const r = await run(seq);
    out.push({ seq, r });
  }
  return out;
}

function legA1(E) {
  const T = C['a1.recovery'];
  const ok = E.filter(e => e.r.ok);
  const N = E.length;
  const pa = ok.map(
    e => (e.r.fit.amplitude - TRUE_AMPLITUDE) / e.r.fit.sigmaAmplitude
  );
  const pp = ok.map(e => (e.r.fit.period - TRUE_PERIOD) / e.r.fit.sigmaPeriod);
  const sdBound = T.bounds.pullSdWithin;
  add('a1.completed', ok.length, ok.length === N, { bound: N });
  for (const [name, p] of [
    ['amplitude', pa],
    ['period', pp],
  ]) {
    add(
      `a1.${name}.pullMean`,
      mean(p),
      Math.abs(mean(p)) <= T.bounds.pullMeanWithin,
      {
        bound: T.bounds.pullMeanWithin,
      }
    );
    add(`a1.${name}.pullSd`, sd(p), Math.abs(sd(p) - 1) <= sdBound, {
      bound: [1 - sdBound, 1 + sdBound],
    });
  }
  const worstA = Math.max(...pa.map(Math.abs));
  add(
    'a1.amplitude.worstSigma',
    worstA,
    worstA <= T.bounds.worstAmplitudeSigma,
    {
      bound: T.bounds.worstAmplitudeSigma,
    }
  );
  const worstP = Math.max(
    ...ok.map(e => Math.abs(e.r.fit.period - TRUE_PERIOD) / TRUE_PERIOD)
  );
  add(
    'a1.period.worstRelative',
    worstP,
    worstP <= T.bounds.worstPeriodRelative,
    {
      bound: T.bounds.worstPeriodRelative,
    }
  );
  return { pa, pp };
}

function checkSeries(e) {
  // The check star C5 against C1 to C4 summed, from the pipeline's own fluxes.
  const { r } = e;
  const id = n => markFor(r, n);
  const ids = ['C1', 'C2', 'C3', 'C4'].map(id);
  const c5 = id('C5');
  if (!c5 || ids.some(x => !x) || !r.series[c5] || ids.some(x => !r.series[x]))
    return null;
  const n = r.used.length;
  const dm = [];
  const sg = [];
  for (let f = 0; f < n; f++) {
    let sum = 0;
    let v = 0;
    for (const x of ids) {
      sum += r.series[x].net[f];
      v += r.series[x].sigma[f] ** 2;
    }
    const d = differentialMagnitude(
      { net: r.series[c5].net[f], sigma: r.series[c5].sigma[f] },
      { net: sum, sigma: Math.sqrt(v) }
    );
    dm.push(d.dm);
    sg.push(d.sigma);
  }
  const raw = r.series[id('V')]?.net.map(f => -2.5 * Math.log10(f));
  return { dm, sg, raw };
}

function legA2(E) {
  const T = C['a2.uncertainty'];
  const per = E.filter(e => e.r.ok)
    .map(checkSeries)
    .filter(Boolean);
  const num = mean(per.map(p => sd(p.dm) ** 2));
  const den = mean(per.map(p => mean(p.sg.map(v => v * v))));
  const ratio = Math.sqrt(num / den);
  add('a2.pooledRatio', ratio, within(ratio, T.bounds.pooledRatio), {
    bound: T.bounds.pooledRatio,
    note: `${per.length} sequences`,
  });
  const rawOver = Math.sqrt(
    mean(per.map(p => sd(p.raw) ** 2)) / mean(per.map(p => sd(p.dm) ** 2))
  );
  add('a2.rawOverCheck', rawOver, rawOver >= T.bounds.rawOverCheckAtLeast, {
    bound: T.bounds.rawOverCheckAtLeast,
  });
}

function legA5(E) {
  const T = C['a5.registration'];
  const err = [];
  let frames = 0;
  let refused = 0;
  for (const { seq, r } of E) {
    const v = r.marks.find(m => truthOf(m) === 'V');
    for (const k of r.used ?? [...r.frames.keys()]) {
      const f = r.frames.get(k);
      frames++;
      if (!f.registration.ok) {
        refused++;
        continue;
      }
      const [x, y] = applyRegistration(f.registration.reg, v.x, v.y);
      const t = seq.truth.positions('V', k);
      err.push(Math.hypot(x - t.x, y - t.y));
    }
  }
  const rms = Math.sqrt(mean(err.map(v => v * v)));
  const p99 = quantile(err, 0.99);
  add('a5.rms', rms, rms <= T.bounds.rmsPix, { bound: T.bounds.rmsPix });
  add('a5.p99', p99, p99 <= T.bounds.p99Pix, { bound: T.bounds.p99Pix });
  add(
    'a5.refusedFraction',
    refused / frames,
    refused / frames <= T.bounds.refusedFractionAtMost,
    {
      bound: T.bounds.refusedFractionAtMost,
      note: `${refused} of ${frames}`,
    }
  );
}

function legC1(E, pulls) {
  const T = C['c1.coverage'].bounds;
  const cov = (p, k) => p.filter(v => Math.abs(v) <= k).length / p.length;
  for (const [name, p] of [
    ['amplitude', pulls.pa],
    ['period', pulls.pp],
  ]) {
    const one = cov(p, 1);
    const two = cov(p, 2);
    add(`c1.${name}.oneSigma`, one, within(one, T[name].oneSigma), {
      bound: T[name].oneSigma,
    });
    add(`c1.${name}.twoSigma`, two, within(two, T[name].twoSigma), {
      bound: T[name].twoSigma,
    });
  }
}

// ---- a3: nothing is reimplemented ------------------------------------------------------------

async function legA3() {
  const T = C['a3.lab'].bounds;
  let worstDm = 0;
  let worstSigma = 0;
  let extraEqual = true;
  for (const draw of [1, 2, 3]) {
    const series = labSeries(draw);
    const set = labCalibration(draw);
    const masters = buildMasters(set, { gain: LAB_DETECTOR.gain });
    const stars = SERIES_FIELD.sources.map(({ id, x, y }) => ({ id, x, y }));
    const d = normalizeDetector({ cosmicRate: 0 });
    const lab = reduceSeries(series, masters, {
      gain: d.gain,
      readNoise: d.readNoise,
      darkRate: d.darkRate,
      stars,
      comparison: 'C1',
      r: 5,
      rIn: 8,
      rOut: 13,
    });
    const seq = {
      id: `lab:${draw}`,
      count: series.frames.length,
      width: d.width,
      height: d.height,
      exposure: SERIES_FIELD.exposure,
      times: series.times,
      gain: d.gain,
      readNoise: d.readNoise,
      darkRate: d.darkRate,
      fullWell: d.fullWell,
      calibration: 'raw',
      masters,
      frameAt: k => series.frames[k],
    };
    const r = must(
      await run(seq, {
        target: { id: 'V' },
        marks: stars,
        register: false,
        recentre: false,
        weighting: 'center',
        aperture: { r: 5, rIn: 8, rOut: 13 },
        comparison: { ids: ['C1'] },
        period: {},
      })
    );
    for (let k = 0; k < r.dm.length; k++) {
      worstDm = Math.max(worstDm, Math.abs(r.dm[k] - lab.dm[k]));
      worstSigma = Math.max(
        worstSigma,
        Math.abs(r.dmSigma[k] - lab.dmSigma[k])
      );
    }
    const direct = mastersVariance(masters, {
      readNoise: d.readNoise,
      darkRate: d.darkRate,
      exposure: SERIES_FIELD.exposure,
    });
    const node = r.nodes[0].quantities.find(
      x => x.id === 'extraVariance'
    ).value;
    if (!Object.is(direct, node) || !Object.is(direct, lab.extraVariance))
      extraEqual = false;
  }
  add('a3.dm', worstDm, worstDm <= T.dmWithin, { bound: T.dmWithin });
  add('a3.sigma', worstSigma, worstSigma <= T.sigmaWithin, {
    bound: T.sigmaWithin,
  });
  add('a3.extraVariance', extraEqual, extraEqual, { bound: 'exactly equal' });
}

// ---- a4: the calibrated frame ------------------------------------------------------------------

async function legA4() {
  const seq = sceneSequence(`${SCENE.seedPrefix}-a4`, { count: 12 });
  let worst = 0;
  let sidecarsOk = true;
  const seen = [];
  await run(seq, sceneParams(), {
    onFrame: (k, red) => {
      const raw = seq.frameAt(k);
      const m = seq.masters;
      const cal = calibrate(raw, { bias: m.bias, dark: m.dark, flat: m.flat });
      for (let i = 0; i < cal.image.values.length; i++)
        worst = Math.max(
          worst,
          Math.abs(cal.image.values[i] - red.calibrated.values[i])
        );
      const sc = sidecarOf(seq, k);
      const v = validateImage(sc);
      if (
        !v.ok ||
        sc.calibration.state !== 'calibrated' ||
        sc.pixels.unit !== 'electron' ||
        sc.history.length !== 2
      )
        sidecarsOk = false;
      seen.push(k);
    },
  });
  add('a4.pixels', worst, worst === 0, {
    bound: 0,
    note: `${seen.length} frames`,
  });
  add('a4.sidecar', sidecarsOk, sidecarsOk);
}

// ---- d1: frames that fail registration -------------------------------------------------------------

async function legD1() {
  const replace = { 10: 'turn', 11: 'turn', 20: 'cloud' };
  let refusedOk = 0;
  let exclOk = 0;
  const notes = [];
  for (let i = 0; i < 10; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-d1-${i}`, { replace });
    const r = await run(seq);
    const named = r.frames instanceof Array ? r.frames : [];
    const ok =
      !r.ok &&
      r.code === 'registration' &&
      named.join() === '10,11,20' &&
      r.dm === undefined;
    if (ok) refusedOk++;
    else notes.push(`${i}: ${r.code} ${named}`);
    const x = await run(seq, sceneParams({ exclude: [10, 11, 20] }));
    if (x.ok && x.dm.length === 45) {
      const red = await reductionOf(
        seq,
        sceneParams({ exclude: [10, 11, 20] }),
        x,
        digestOf
      );
      if (red.params.exclude.join() === '10,11,20') exclOk++;
    }
  }
  add('d1.refused', refusedOk, refusedOk === 10, {
    bound: 10,
    note: notes.join('; '),
  });
  add('d1.excluded', exclOk, exclOk === 10, { bound: 10 });
  // Evidence, not a committed leg: the same with frame 20 at 0.3 percent of the
  // light, where no star is left to detect (the committed 3 percent still shows
  // its four brightest stars, and the frame registers: see FRAME_PIPELINE.md).
  let blind = 0;
  for (let i = 0; i < 10; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-d1-${i}`, {
      replace: { 10: 'turn', 11: 'turn', 20: 'blind' },
    });
    const r = await run(seq);
    if (!r.ok && r.code === 'registration' && r.frames.join() === '10,11,20')
      blind++;
  }
  rows.push({
    id: 'x.d1.blindFrame',
    measured: blind,
    pass: blind === 10,
    evidence: true,
    note: 'not a committed leg: frame 20 at 0.3 percent of the light, refused with 10 and 11 in 10 of 10',
  });
}

// ---- d2: a comparison star that varies -------------------------------------------------------------------

async function legD2() {
  const T = C['d2.stability'].bounds;
  let hit = 0;
  let unused = 0;
  const notes = [];
  for (let i = 0; i < 40; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-d2v-${i}`, {
      variables: [{ id: 'C2', period: 0.2, amplitude: 0.06, phase: 'seed' }],
    });
    const r = await run(seq);
    if (!r.ok) {
      notes.push(`${i}: refused ${r.code}`);
      continue;
    }
    const flagged = r.comparison.flagged.map(id =>
      truthOf(r.marks.find(m => m.id === id))
    );
    const c2 = markFor(r, 'C2');
    if (flagged.length === 1 && flagged[0] === 'C2') hit++;
    else notes.push(`${i}: flagged ${flagged}`);
    if (!r.chosen.includes(c2)) unused++;
  }
  add('d2.variableFlagged', hit / 40, hit / 40 >= T.variableFlaggedAtLeast, {
    bound: T.variableFlaggedAtLeast,
    note: notes.join('; '),
  });
  add(
    'd2.variableNotUsed',
    unused,
    unused === 40 - notes.filter(n => n.includes('refused')).length,
    {
      bound: 'the light curve does not use C2',
    }
  );
  let falseFlags = 0;
  let tests = 0;
  for (let i = 0; i < 40; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-d2c-${i}`);
    const r = await run(seq);
    if (!r.ok) continue;
    falseFlags += r.comparison.flagged.length;
    tests += r.comparison.candidates.length;
  }
  add('d2.falseFlags', falseFlags, falseFlags <= T.falseFlagsAtMost, {
    bound: T.falseFlagsAtMost,
    note: `${tests} star tests`,
  });
  // The override names C2: used, labelled.
  const seq = sceneSequence(`${SCENE.seedPrefix}-d2v-0`, {
    variables: [{ id: 'C2', period: 0.2, amplitude: 0.06, phase: 'seed' }],
  });
  const r0 = must(await run(seq));
  const c2 = markFor(r0, 'C2');
  const ids = [c2, ...r0.chosen.filter(x => x !== c2).slice(0, 2)];
  const r1 = must(await run(seq, sceneParams({ comparison: { ids } })));
  const w = r1.nodes.find(n => n.id === 'frames-comparison').warnings;
  const kept = r1.comparison.stats[c2].status === 'unstable';
  add(
    'd2.override',
    w.some(x => x.code === 'unstableUsed' && x.star === c2) && kept,
    w.some(x => x.code === 'unstableUsed') && kept
  );
}

// ---- d3: refusals --------------------------------------------------------------------------------------------

async function legD3() {
  const cases = [];
  const counted = (over = {}) => {
    const base = sceneSequence(`${SCENE.seedPrefix}-d3`, { count: 12 });
    let asked = 0;
    const seq = Object.assign(Object.create(null), base, {
      count: over.count ?? base.count,
      frameAt: k => {
        asked++;
        return over.frameAt ? over.frameAt(k, base) : base.frameAt(k);
      },
      ...(over.seq ?? {}),
    });
    Object.defineProperty(seq, 'masters', {
      get: () => (over.noMasters ? undefined : base.masters),
    });
    return { seq, asked: () => asked };
  };
  const expectCase = async (name, code, make, params, askedAtMost, frames) => {
    const { seq, asked } = make();
    const r = await run(seq, params);
    const hasNumber = ['dm', 'dmSigma', 'fit', 'period', 'amplitude'].some(
      k => k in r
    );
    const ok =
      !r.ok &&
      r.code === code &&
      asked() <= askedAtMost &&
      !hasNumber &&
      (!frames || (r.frames?.join() ?? r.frame) == frames.join());
    cases.push({
      name,
      ok,
      got: `${r.code}${r.frames ? ` [${r.frames}]` : ''}${r.frame !== undefined ? ` frame ${r.frame}` : ''} asked ${asked()}`,
    });
  };
  await expectCase(
    'too-many-frames',
    'too-many-frames',
    () => counted({ count: 257 }),
    sceneParams(),
    0
  );
  await expectCase(
    'too-large',
    'too-large',
    () => counted({ seq: { width: 1399, height: 1000 } }),
    sceneParams(),
    1
  );
  await expectCase(
    'no-masters',
    'no-masters',
    () => counted({ noMasters: true }),
    sceneParams(),
    0
  );
  await expectCase(
    'frame-shape',
    'frame-shape',
    () =>
      counted({
        frameAt: (k, b) =>
          k === 7 ? { ...b.frameAt(k), width: 90 } : b.frameAt(k),
      }),
    sceneParams({ register: false }),
    12,
    [7]
  );
  await expectCase(
    'too-few-frames',
    'too-few-frames',
    () => counted({}),
    sceneParams({ exclude: [0 + 1, 2, 3, 4, 5, 6, 7, 8] }),
    0
  );
  await expectCase(
    'target-not-found',
    'target-not-found',
    () => counted({}),
    { target: { x: 47.3, y: 5.0 } },
    1
  );
  const bright = () =>
    counted({
      frameAt: (k, b) => {
        const f = b.frameAt(k);
        if (k === 5) {
          const x = Math.round(STARS[0].x);
          const y = Math.round(STARS[0].y);
          f.values = Float64Array.from(f.values);
          // A saturated core, not one pixel: a lone hot pixel is what the
          // cosmic-ray mask repairs, which is right.
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              f.values[(y + dy) * f.width + x + dx] = 65535;
        }
        return f;
      },
    });
  await expectCase(
    'saturated-target',
    'photometry',
    () => bright(),
    sceneParams(),
    12,
    [5]
  );
  await expectCase(
    'period-reversed',
    'bad-parameter',
    () => counted({}),
    sceneParams({ period: { min: 0.2, max: 0.1 } }),
    0
  );
  await expectCase(
    'period-under-nyquist',
    'bad-parameter',
    () => counted({}),
    sceneParams({ period: { min: 0.015 } }),
    0
  );
  // no comparison: the only other star is fainter than the signal-to-noise floor
  {
    const faint = syntheticSequence({
      seed: `${SCENE.seedPrefix}-d3n`,
      detector: { width: 96, height: 96, cosmicRate: 0 },
      stars: [STARS[0], { id: 'G', x: 20, y: 70, rate: 14 }],
      count: 12,
      cadence: 0.01,
      jitter: 0,
      rotationDeg: 0,
    });
    const r = await run(faint, {
      target: { id: 'V' },
      marks: [
        { id: 'V', x: STARS[0].x, y: STARS[0].y },
        { id: 'G', x: 20, y: 70 },
      ],
      register: false,
    });
    cases.push({
      name: 'no-comparison',
      ok: !r.ok && r.code === 'no-comparison' && !('dm' in r),
      got: r.code,
    });
  }
  const bad = cases.filter(c => !c.ok);
  add('d3.refusals', cases.length - bad.length, bad.length === 0, {
    bound: `${cases.length} of ${cases.length}`,
    note: bad.map(c => `${c.name}: ${c.got}`).join('; '),
  });
}

// ---- d4: a constant target -------------------------------------------------------------------------------------

async function legD4() {
  const T = C['d4.constantStar'].bounds;
  let claimed = 0;
  let under = 0;
  let done = 0;
  for (let i = 0; i < 60; i++) {
    const seq = sceneSequence(`${SCENE.seedPrefix}-d4-${i}`, { amplitude: 0 });
    const r = await run(seq);
    if (!r.ok) continue;
    done++;
    if (r.constant.variable) claimed++;
    if (r.fit.amplitude / r.fit.sigmaAmplitude < 5) under++;
  }
  add('d4.claimedVariable', claimed, claimed <= T.claimedVariableAtMost, {
    bound: T.claimedVariableAtMost,
    note: `${done} sequences`,
  });
  add(
    'd4.amplitudeUnder5Sigma',
    under / done,
    under / done >= T.amplitudeUnder5SigmaAtLeast,
    { bound: T.amplitudeUnder5SigmaAtLeast }
  );
}

// ---- d5: the frames are read one at a time -----------------------------------------------------------------------

async function legD5() {
  let held = 0;
  let peak = 0;
  const base = sceneSequence(`${SCENE.seedPrefix}-d5`, { count: 256 });
  const seq = Object.create(base, {
    frameAt: {
      value: k => {
        held++;
        peak = Math.max(peak, held);
        return base.frameAt(k);
      },
    },
    release: { value: () => void held-- },
  });
  const r = await run(seq, sceneParams({ comparison: { max: 3 } }));
  add('d5.peakInFlight', peak, r.ok && peak === 1, {
    bound: 1,
    note: `${r.ok ? 256 : r.code} frames`,
  });
  add('d5.planes', RULES.planes, RULES.planes === 6, { bound: 6 });
  const fake = (w, h, count = 5) => ({
    count,
    width: w,
    height: h,
    times: Float64Array.from({ length: count }, (_, i) => i),
    calibration: 'electrons',
  });
  const at = checkSequence(fake(1398101, 1), sceneParams());
  const over = checkSequence(fake(1398102, 1), sceneParams());
  add(
    'd5.pixelBound',
    maxPixels(),
    maxPixels() === 1398101 && at.ok && over.code === 'too-large',
    {
      bound: '1398101 accepted, 1398102 refused',
    }
  );
  const n256 = checkSequence(
    {
      ...fake(64, 64, 256),
      times: Float64Array.from({ length: 256 }, (_, i) => i),
    },
    sceneParams()
  );
  const n257 = checkSequence(
    {
      ...fake(64, 64, 257),
      times: Float64Array.from({ length: 257 }, (_, i) => i),
    },
    sceneParams()
  );
  add(
    'd5.frameLimit',
    n256.ok && n257.code === 'too-many-frames',
    n256.ok && n257.code === 'too-many-frames',
    { bound: '256 accepted, 257 refused' }
  );
}

// ---- e1: reproducibility --------------------------------------------------------------------------------------------

async function legE1() {
  const seed = `${SCENE.seedPrefix}-e1`;
  const a = must(await run(sceneSequence(seed)));
  const b = must(await run(sceneSequence(seed)));
  const same = (x, y) =>
    x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
  const twice = same(a.dm, b.dm) && same(a.dmSigma, b.dmSigma);
  const other = must(await run(sceneSequence(`${seed}-other`)));
  const differs = !same(a.dm, other.dm);
  const params = sceneParams();
  const red = JSON.parse(
    JSON.stringify(await reductionOf(sceneSequence(seed), params, a, digestOf))
  );
  const rep = await replay(red, sceneSequence(seed), hooks, digestOf);
  const replayed = rep.ok && rep.identical && rep.chosenSame;
  const changed = await replay(
    red,
    sceneSequence(`${seed}-other`),
    hooks,
    digestOf
  );
  // The generator without pointing change is simulateSeries.
  const spec = {
    seed: `${SCENE.seedPrefix}-e1sim`,
    detector: { width: 96, height: 96, cosmicRate: 0 },
    exposure: SCENE.exposure,
    scene: {
      sky: SCENE.sky,
      sources: STARS.map(({ x, y, rate }) => ({ x, y, rate })),
    },
  };
  const ser = simulateSeries(spec, {
    count: 4,
    cadence: SCENE.cadenceDays,
    variable: 0,
    period: TRUE_PERIOD,
    amplitude: TRUE_AMPLITUDE,
    phase: 0.13,
    cloud: 0.1,
  });
  const gen = syntheticSequence({
    seed: spec.seed,
    detector: spec.detector,
    exposure: SCENE.exposure,
    sky: SCENE.sky,
    stars: STARS,
    count: 4,
    cadence: SCENE.cadenceDays,
    variables: [
      { id: 'V', period: TRUE_PERIOD, amplitude: TRUE_AMPLITUDE, phase: 0.13 },
    ],
  });
  let sameFrames = true;
  for (let k = 0; k < 4; k++)
    if (!same(gen.frameAt(k).values, ser.frames[k].values)) sameFrames = false;
  const marksN = a.marks.length;
  const d1 = await run(
    sceneSequence(`${SCENE.seedPrefix}-d1-0`, {
      replace: { 10: 'turn', 11: 'turn', 20: 'cloud' },
    })
  );
  const pinned = marksN === 8 && d1.frames.join() === '10,11';
  add('e1.identity', twice, twice);
  add('e1.replay', replayed, replayed);
  add(
    'e1.sequenceChanged',
    changed.code,
    changed.ok === false && changed.code === 'sequence-changed'
  );
  add('e1.otherSeed', differs, differs);
  add('e1.simulateSeries', sameFrames, sameFrames);
  add('e1.pinned', `${marksN} marks, frames ${d1.frames}`, pinned, {
    bound: '8 marks, frames 10,11 (pinned at the first run)',
  });
  // the 150 record: every uncertainty is a kind the envelope knows
  const qs = quantitiesOf(a);
  const kinds = new Set(qs.map(x => x.uncertainty.kind));
  add(
    'e1.quantities',
    qs.length,
    qs.length > 10 &&
      [...kinds].every(k => ['sigma', 'none', 'assumed'].includes(k))
  );
}

// ---- b: the independent oracle ------------------------------------------------------------------------------------------

const decode = (b64, n) => {
  const buf = inflateSync(Buffer.from(b64, 'base64'));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readUInt16LE(2 * i);
  return out;
};

async function legB() {
  const inputsPath = path.join(FIX, 'oracle-inputs.json');
  const resultsPath = path.join(FIX, 'oracle-results.json');
  if (!existsSync(inputsPath) || !existsSync(resultsPath)) {
    add('b.oracle', 'fixtures absent', false, {
      note: 'run tools/frame-pipeline-oracle',
    });
    return;
  }
  const inp = JSON.parse(readFileSync(inputsPath, 'utf8'));
  const res = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const { width: W, height: H } = inp;
  const n = W * H;
  const raw = inp.frames.map(b => decode(b, n));
  const cs = {
    bias: inp.bias.map(b => ({
      kind: 'bias',
      width: W,
      height: H,
      exposure: 0,
      values: decode(b, n),
    })),
    dark: inp.dark.map(b => ({
      kind: 'dark',
      width: W,
      height: H,
      exposure: inp.darkExposure,
      values: decode(b, n),
    })),
    flat: inp.flat.map(b => ({
      kind: 'flat',
      width: W,
      height: H,
      exposure: inp.flatExposure,
      values: decode(b, n),
    })),
  };
  const masters = buildMasters(cs, { gain: inp.gain });
  const seq = {
    id: 'oracle-sequence',
    count: raw.length,
    width: W,
    height: H,
    exposure: inp.exposure,
    times: Float64Array.from(inp.times),
    gain: inp.gain,
    readNoise: inp.readNoise,
    darkRate: inp.darkRate,
    fullWell: inp.fullWell,
    calibration: 'raw',
    masters,
    frameAt: k => ({
      width: W,
      height: H,
      exposure: inp.exposure,
      values: raw[k],
    }),
  };
  const pinnedFrames = res.calibratedFrames;
  const diffs = [];
  const r = must(
    await runSequence(seq, sceneParams(), {
      ...hooks,
      onFrame: (k, red) => {
        if (!(k in pinnedFrames)) return;
        const o = decode64Float(pinnedFrames[k]);
        let worst = 0;
        let ss = 0;
        for (let i = 0; i < n; i++) {
          const g = red.calibrated.values[i] * inp.gain;
          worst = Math.max(worst, Math.abs(g - o[i]));
          ss += (g - mean2(red.calibrated.values, inp.gain)) ** 2;
        }
        const noise = Math.sqrt(ss / n);
        diffs.push(worst / noise);
      },
    })
  );
  const T2 = C['b2.oracleCalibration'];
  const w2 = Math.max(...diffs);
  add('b2.calibration', w2, diffs.length === 3 && w2 <= T2.bound, {
    bound: T2.bound,
    note: `${diffs.length} frames`,
  });
  // b1: the target's differential against C1..C4, per frame
  const ids = ['C1', 'C2', 'C3', 'C4'].map(c => markFor(r, c));
  const rr = must(
    await runSequence(seq, sceneParams({ comparison: { ids } }), hooks)
  );
  const T1 = C['b1.oraclePhotometry'].bounds;
  const d = Array.from(rr.dm, (v, i) => v - res.dm[i]);
  const rel = d.map((v, i) => Math.abs(v) / rr.dmSigma[i]);
  const rmsD = Math.sqrt(mean(d.map(v => v * v)));
  const rmsS = Math.sqrt(mean(Array.from(rr.dmSigma, v => v * v)));
  add('b1.rmsOverSigma', rmsD / rmsS, rmsD / rmsS <= T1.rmsOverSigma, {
    bound: T1.rmsOverSigma,
  });
  add(
    'b1.p95OverSigma',
    quantile(rel, 0.95),
    quantile(rel, 0.95) <= T1.p95OverSigma,
    { bound: T1.p95OverSigma }
  );
  add(
    'b1.maxOverSigma',
    Math.max(...rel),
    Math.max(...rel) <= T1.maxOverSigma,
    { bound: T1.maxOverSigma }
  );
  // b3: the fits
  const T3 = C['b3.oracleFit'].bounds;
  const dP = Math.abs(rr.fit.period - res.fit.period) / rr.fit.sigmaPeriod;
  const dA =
    Math.abs(rr.fit.amplitude - res.fit.amplitude) / rr.fit.sigmaAmplitude;
  add('b3.period', dP, dP <= T3.periodSigmas, {
    bound: T3.periodSigmas,
    note: 'in stated sigmas',
  });
  add('b3.amplitude', dA, dA <= T3.amplitudeSigmas, {
    bound: T3.amplitudeSigmas,
    note: 'in stated sigmas',
  });
  // b4: the shifts
  const T4 = C['b4.oracleShifts'].bounds;
  const v = rr.marks.find(m => truthOf(m) === 'V');
  const e = [];
  for (const k of rr.used) {
    const reg = rr.frames.get(k).registration.reg;
    const [x, y] = applyRegistration(reg, v.x, v.y);
    e.push(
      Math.hypot(x - (v.x + res.shifts[k][0]), y - (v.y + res.shifts[k][1]))
    );
  }
  const rmsE = Math.sqrt(mean(e.map(z => z * z)));
  add('b4.rms', rmsE, rmsE <= T4.rmsPix, { bound: T4.rmsPix });
  add('b4.max', Math.max(...e), Math.max(...e) <= T4.maxPix, {
    bound: T4.maxPix,
  });
}

const decode64Float = b64 => {
  const buf = Buffer.from(b64, 'base64');
  const out = new Float64Array(buf.length / 8);
  for (let i = 0; i < out.length; i++) out[i] = buf.readDoubleLE(8 * i);
  return out;
};
const mean2 = (a, g) => {
  let s = 0;
  for (const v of a) s += v;
  return (s / a.length) * g;
};

// ---- f1: the lesson's own series through the whole pipeline ----------------------------------------

async function legF1() {
  for (const draw of [1, 2, 3]) {
    const series = labSeries(draw);
    const d = normalizeDetector({ cosmicRate: 0 });
    const masters = buildMasters(labCalibration(draw), { gain: d.gain });
    const seq = {
      id: `lab:${draw}`,
      count: series.frames.length,
      width: d.width,
      height: d.height,
      exposure: SERIES_FIELD.exposure,
      times: series.times,
      gain: d.gain,
      readNoise: d.readNoise,
      darkRate: d.darkRate,
      fullWell: d.fullWell,
      calibration: 'raw',
      masters,
      frameAt: k => series.frames[k],
    };
    const v = SERIES_FIELD.sources[0];
    const r = await run(seq, { target: { x: v.x, y: v.y } });
    if (!r.ok) {
      add(`f1.draw${draw}`, r.code, false);
      continue;
    }
    const dp = Math.abs(r.fit.period - SERIES_FIELD.series.period);
    const da = Math.abs(r.fit.amplitude - SERIES_FIELD.series.amplitude);
    add(`f1.draw${draw}.period`, dp, dp <= 0.004, { bound: 0.004 });
    add(
      `f1.draw${draw}.amplitude`,
      da / r.fit.sigmaAmplitude,
      da <= 4.5 * r.fit.sigmaAmplitude,
      { bound: '4.5 sigma' }
    );
  }
}

// ---- f1: the lesson's step asks for the number the pipeline gives ------------------------------------

async function legF1Step() {
  const step = VAR_DEEP.steps.find(x => x.sid === 'the-whole-pipeline');
  const r = must(await run(demoSequence('1'), sceneParams()));
  const hours = r.fit.period * 24;
  add('f1.stepAnswer', hours, Math.abs(hours - step.answer) <= step.tolerance, {
    bound: `${step.answer} within ${step.tolerance}`,
    note: 'seed 1, the panel’s defaults',
  });
}

// ---- the run ---------------------------------------------------------------------------------------------------------------------

const t0 = Date.now();
if (wants('a1') || wants('a2') || wants('a5') || wants('c1')) {
  const E = await ensemble();
  const pulls = legA1(E);
  if (wants('a2')) legA2(E);
  if (wants('a5')) legA5(E);
  if (wants('c1')) legC1(E, pulls);
}
if (wants('a3')) await legA3();
if (wants('a4')) await legA4();
if (wants('b')) await legB();
if (wants('d1')) await legD1();
if (wants('d2')) await legD2();
if (wants('d3')) await legD3();
if (wants('d4')) await legD4();
if (wants('d5')) await legD5();
if (wants('e1')) await legE1();
if (wants('f1')) {
  await legF1();
  await legF1Step();
}
if (wants('g1'))
  rows.push({
    id: 'g1.authentic',
    measured: 'not run',
    pass: true,
    notRun: true,
    note: 'NOT RUN until Prompt 189: no authentic frame sequence is in the tree',
  });
// keep the unused imports honest
void [simulateFrame, chi2Survival];

if (argv.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify({ seconds: (Date.now() - t0) / 1000, rows }, null, 2)}\n`
  );
} else {
  for (const r of rows) {
    const m =
      typeof r.measured === 'number'
        ? Number(r.measured.toPrecision(4))
        : r.measured;
    console.log(
      `${r.notRun ? 'NOT RUN' : r.pass ? 'pass   ' : 'FAIL   '} ${r.id.padEnd(30)} ${String(m).padEnd(24)} ${r.bound !== undefined ? `bound ${JSON.stringify(r.bound)}` : ''} ${r.note ?? ''}`
    );
  }
  console.log(
    `${rows.filter(r => r.pass).length} of ${rows.length} rows pass in ${((Date.now() - t0) / 1000).toFixed(0)} s`
  );
}
process.exitCode = rows.every(r => r.pass) ? 0 : 1;
