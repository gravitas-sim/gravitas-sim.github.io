// =============================================================================
// The committed scenes of the X-ray counts kernel's validation (Prompt 243)
// -----------------------------------------------------------------------------
// tests/fixtures/xray/thresholds.json fixed the parameters of every scene before the
// kernel existed; this turns them into generator specs. Shared by the validator and by
// the oracle's input writer, so the two always judge the same series.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSyntheticSeries } from '../js/kernels/xray/synthetic.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = 'tests/fixtures/xray';
export const THRESHOLDS = JSON.parse(
  readFileSync(path.join(ROOT, DIR, 'thresholds.json'), 'utf8')
);
export const SCENES = THRESHOLDS.synthetic.scenes;
export const limits = id => THRESHOLDS.checks.find(c => c.id === id).limits;

const range = n => [...Array(n).keys()];

/** The orbit scene: options set the modulation, the background and the area ratio. */
export function orbit(
  seed,
  label,
  {
    amplitude = 0,
    background = true,
    areaRatio,
    backgroundModulation,
    backgroundRates,
    netScale = 1,
    barycentric = true,
    synthetic = true,
  } = {}
) {
  const o = SCENES.orbit;
  const gtis = range(o.segments).map(k => [
    k * o.spacingSeconds,
    k * o.spacingSeconds + o.segmentSeconds,
  ]);
  return makeSyntheticSeries({
    seed,
    label,
    layout: { kind: 'segments', gtis, binSeconds: o.binSeconds },
    deadFraction: o.deadFraction,
    netRates: { S: o.netRates.S * netScale, H: o.netRates.H * netScale },
    modulation: amplitude
      ? { period: o.truePeriodSeconds, fractionalSemiAmplitude: amplitude }
      : null,
    background: background
      ? {
          rates: backgroundRates ?? o.backgroundRates,
          areaRatio: areaRatio ?? o.areaRatio,
          modulation: backgroundModulation ?? null,
        }
      : null,
    barycentric,
    synthetic,
  });
}

export const orbitSearch = () => ({
  minPeriod: SCENES.orbit.searchPeriods[0],
  maxPeriod: SCENES.orbit.searchPeriods[1],
  oversample: SCENES.orbit.oversample,
});

/** The dwell scene at frequency `freq` (c/s), optionally jittered. */
export function dwell(seed, label, freq, { jitter = false } = {}) {
  const d = SCENES.dwell;
  return makeSyntheticSeries({
    seed,
    label,
    layout: {
      kind: 'dwells',
      count: d.dwells,
      dwellSeconds: d.dwellSeconds,
      spacingSeconds: d.spacingSeconds,
      jitterHalfWidth: jitter ? d.jitterHalfWidthSeconds : 0,
    },
    deadFraction: d.deadFraction,
    netRates: d.netRates,
    modulation: {
      period: 1 / freq,
      fractionalSemiAmplitude: d.fractionalSemiAmplitude,
    },
    background: null,
  });
}

export const dwellSearch = () => ({
  minPeriod: SCENES.dwell.searchPeriods[0],
  maxPeriod: SCENES.dwell.searchPeriods[1],
  oversample: SCENES.dwell.oversample,
});

/** The outburst scene; `step` replaces the outburst for the 'high' case; `quiet` has neither. */
export function outburst(seed, label, { quiet = false, step = null } = {}) {
  const o = SCENES.outburst;
  return makeSyntheticSeries({
    seed,
    label,
    layout: { kind: 'segments', gtis: o.gtis, binSeconds: o.binSeconds },
    netRates: {
      S: o.quietRate * o.softFraction,
      H: o.quietRate * (1 - o.softFraction),
    },
    outburst:
      quiet || step
        ? null
        : {
            start: o.startSeconds,
            peakExcess: o.peakExcess,
            efold: o.efoldSeconds,
          },
    step,
    background: null,
  });
}

/** The hardness scene with `seconds` of exposure in one bin (or the committed 100 s bins). */
export function hardnessScene(seed, label, { seconds, oneBin = false } = {}) {
  const h = SCENES.hardness;
  const L = seconds ?? h.gtis[0][1];
  return makeSyntheticSeries({
    seed,
    label,
    layout: {
      kind: 'segments',
      gtis: [[0, L]],
      binSeconds: oneBin ? L : h.binSeconds,
    },
    netRates: h.netRates,
    background: null,
  });
}

/** The uneven constant-rate scene of leg C4. */
export function unevenNull(seed, label) {
  const u = SCENES.unevenNull;
  const gtis = range(u.segments).map(k => [
    k * u.spacingSeconds,
    k * u.spacingSeconds + u.binsPerSegment * u.binSeconds,
  ]);
  return makeSyntheticSeries({
    seed,
    label,
    layout: { kind: 'segments', gtis, binSeconds: u.binSeconds },
    netRates: { S: 0.6 * u.rate, H: 0.4 * u.rate },
    background: null,
  });
}

export const unevenSearch = () => ({
  minPeriod: SCENES.unevenNull.searchPeriods[0],
  maxPeriod: SCENES.unevenNull.searchPeriods[1],
  oversample: SCENES.unevenNull.oversample,
});
