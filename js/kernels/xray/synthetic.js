// =============================================================================
// Labelled synthetic count series (Prompt 243)
// -----------------------------------------------------------------------------
// Everything this module returns is SYNTHETIC: Poisson draws of stated rates from a seeded
// stream, with invented good-time intervals, exposures, dead time, energy bands and
// background, and the truth beside it (the manifest). No source, archive or instrument is
// represented, and a lesson built on these series says so. The counts are exact Poisson
// draws (poisson.js), never a Gaussian approximation.
//
// The rate of band b at a bin's midpoint t is
//
//   net_b (1 + A sin(2 pi t / P + phi)) (outburst) (step)
//
// with a fast-rise exponential-decay outburst (1 + peakExcess exp(-(t - start) / efold)
// for t >= start), a step factor over a time range, and a modulation with a seeded phase.
// The expected count in the source region is (net_b(t) + r B_b(t)) exposure, in the
// background region B_b(t) exposure, with r the area ratio. The rate is evaluated at the
// midpoint, which is the truth the manifest states (the bin average differs from it by
// the bin's own smearing).
// =============================================================================

import { stream } from '../../random/streams.js';
import { poissonDraw } from './poisson.js';

const { Math } = globalThis;
const TWO_PI = 2 * Math.PI;

export const SYNTHETIC_PREFIX = 'SYNTHETIC COUNT SERIES';

/** Invented bands: the label is the only thing they claim. */
// The band unit is a label of the contract, never a quantity the registry formats.
const BAND_UNIT = 'keV';
export const SYNTHETIC_BANDS = Object.freeze([
  Object.freeze({ id: 'S', lo: 1, hi: 3, unit: BAND_UNIT }),
  Object.freeze({ id: 'H', lo: 3, hi: 10, unit: BAND_UNIT }),
]);

/** A structural copy of plain data (the truth manifest keeps no reference to the caller's spec). */
const copy = v =>
  Array.isArray(v)
    ? v.map(copy)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)]))
      : v;

function layoutBins(layout, draw) {
  const start = [];
  const stop = [];
  const gti = [];
  if (layout.kind === 'segments') {
    const w = layout.binSeconds;
    for (const [a, b] of layout.gtis) {
      gti.push([a, b]);
      for (let s = a; s + w <= b + 1e-9; s += w) {
        start.push(s);
        stop.push(s + w);
      }
    }
  } else if (layout.kind === 'dwells') {
    const jit = layout.jitterHalfWidth ?? 0;
    for (let k = 0; k < layout.count; k++) {
      const s0 =
        (layout.start ?? 0) +
        k * layout.spacingSeconds +
        (jit ? (2 * draw() - 1) * jit : 0);
      start.push(s0);
      stop.push(s0 + layout.dwellSeconds);
      gti.push([s0, s0 + layout.dwellSeconds]);
    }
  } else throw new Error(`unknown layout kind ${layout.kind}`);
  return { start, stop, gti };
}

/**
 * @param {object} spec
 * @param {number|string} spec.seed
 * @param {string} [spec.label] - the stream label (part of the identity of a draw)
 * @param {object} spec.layout - {kind: 'segments', gtis, binSeconds} or {kind: 'dwells', count, dwellSeconds, spacingSeconds, jitterHalfWidth?}
 * @param {number} [spec.deadFraction]
 * @param {Object<string, number>} spec.netRates - c/s per band id ('S', 'H')
 * @param {{period: number, fractionalSemiAmplitude: number, phase?: number}} [spec.modulation]
 * @param {{start: number, peakExcess: number, efold: number}} [spec.outburst]
 * @param {{from: number, to: number, factor: number}} [spec.step]
 * @param {{rates: Object<string, number>, areaRatio: number, modulation?: {period: number, fractionalSemiAmplitude: number}}} [spec.background]
 * @param {boolean} [spec.barycentric]
 * @param {boolean} [spec.synthetic] - false returns the same counts without the label (a leg's control)
 * @returns {{series: object, truth: object}}
 */
export function makeSyntheticSeries(spec) {
  const {
    seed,
    label = 'syn',
    layout,
    deadFraction = 0,
    netRates,
    modulation = null,
    outburst = null,
    step = null,
    background = null,
    barycentric = true,
    synthetic = true,
  } = spec;
  const draw = stream('noise', seed, label);
  const phaseDraw = stream('noise', seed, label, 'phase');
  const { start, stop, gti } = layoutBins(
    layout,
    stream('noise', seed, label, 'layout')
  );
  const n = start.length;
  const bands = SYNTHETIC_BANDS.map(b => ({ ...b }));
  const phase = modulation ? (modulation.phase ?? TWO_PI * phaseDraw()) : null;
  const bphase = background?.modulation ? TWO_PI * phaseDraw() : null;
  const exposure = [];
  const counts = { S: [], H: [] };
  const bcounts = { S: [], H: [] };
  const mean = { S: [], H: [] };
  for (let i = 0; i < n; i++) {
    const w = stop[i] - start[i];
    const e = w * (1 - deadFraction);
    exposure.push(e);
    const t = 0.5 * (start[i] + stop[i]);
    let f = 1;
    if (modulation)
      f *=
        1 +
        modulation.fractionalSemiAmplitude *
          Math.sin((TWO_PI * t) / modulation.period + phase);
    if (outburst && t >= outburst.start)
      f *=
        1 +
        outburst.peakExcess * Math.exp(-(t - outburst.start) / outburst.efold);
    if (step && t >= step.from && t <= step.to) f *= step.factor;
    for (const b of ['S', 'H']) {
      const net = netRates[b] * f;
      let B = 0;
      if (background) {
        B = background.rates[b];
        if (background.modulation)
          B *=
            1 +
            background.modulation.fractionalSemiAmplitude *
              Math.sin((TWO_PI * t) / background.modulation.period + bphase);
      }
      const r = background ? background.areaRatio : 0;
      const mu = (net + r * B) * e;
      mean[b].push(mu);
      counts[b].push(poissonDraw(draw, mu));
      if (background) bcounts[b].push(poissonDraw(draw, B * e));
    }
  }
  const text = `${SYNTHETIC_PREFIX} (seed ${seed}, label ${label}): Poisson draws of stated rates with invented good-time intervals, exposure, bands and background; no X-ray source, product or archive is represented`;
  const series = {
    format: 'gravitas.counts-series/1',
    time: { system: 'TDB', barycentric, epoch: 'synthetic zero' },
    start,
    stop,
    exposure,
    bands,
    counts,
    background: background
      ? { kind: 'region', areaRatio: background.areaRatio, counts: bcounts }
      : { kind: 'none', negligible: true },
    deadTime: { kind: 'fraction', fraction: start.map(() => deadFraction) },
    gti,
  };
  if (synthetic) {
    series.synthetic = true;
    series.label = text;
  }
  const truth = {
    synthetic: true,
    label: text,
    seed,
    streamLabel: label,
    rateEvaluatedAt: 'the bin midpoint',
    spec: copy({
      layout,
      deadFraction,
      netRates,
      modulation,
      outburst,
      step,
      background,
      barycentric,
    }),
    modulationPhase: phase,
    expectedSourceCounts: mean,
    bins: n,
  };
  return { series, truth };
}
