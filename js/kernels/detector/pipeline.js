// =============================================================================
// A whole night: the calibration set, the frames and the light curve
// -----------------------------------------------------------------------------
// The kernel's pieces put end to end the way the lessons use them: build the
// masters from a calibration set, reduce every frame of a series, photometer
// the stars, form the differential light curve and fit it. Each step is a
// record, so the reduction can be read back.
//
// The gain and the read noise are the ones the reduction is told; a student
// measures them from the bias and flat pairs (gainFromPairs) first.
//
// Pure: no DOM.
// =============================================================================

import {
  masterBias,
  masterDark,
  masterFlat,
  reduceFrame,
  differentialMagnitude,
} from './reduce.js';
import { scanPeriod, scatter } from './lightcurve.js';

export const VERSION = '1.0.0';

/** The three masters, with the records that made them. */
export function buildMasters(cs, { gain }) {
  const b = masterBias(cs.bias, { gain });
  const d = masterDark(cs.dark, b.image, { gain });
  const f = masterFlat(cs.flat, b.image, d.image);
  return {
    bias: b.image,
    dark: d.image,
    flat: f.image,
    nodes: [b.node, d.node, f.node],
    counts: {
      bias: cs.bias.length,
      dark: cs.dark.length,
      flat: cs.flat.length,
    },
  };
}

/**
 * The per-pixel variance the masters add to a frame, in electrons squared: the
 * bias master's read noise over its frame count, and the scaled dark's read
 * noise and shot noise over its. (A median is 1.57 times noisier than a mean:
 * the figure is for a mean, a floor.)
 */
export function mastersVariance(masters, { readNoise, darkRate, exposure }) {
  const dk = masters.counts.dark;
  const s = exposure / masters.dark.exposure;
  const darkShot = darkRate * masters.dark.exposure;
  return (
    (readNoise * readNoise) / masters.counts.bias +
    (s * s * (readNoise * readNoise + darkShot)) / dk
  );
}

/**
 * Reduce a series and form the differential light curve.
 *
 * @param {{frames, times, truth}} series - From simulateSeries
 * @param {object} masters - From buildMasters
 * @param {object} opts
 * @param {number} opts.gain
 * @param {number} opts.readNoise
 * @param {number} opts.darkRate - electrons per second per pixel (for the dark's shot noise)
 * @param {Array<{id, x, y}>} opts.stars - the variable first
 * @param {string} opts.comparison - id of the comparison star
 * @param {string} [opts.check] - id of a check star, constant like the comparison
 * @param {object} [opts.skip] - steps to leave out (bias, dark, flat, cosmic)
 * @param {number} [opts.r]
 * @returns {object} per-star flux arrays, the differential magnitudes with their errors, and the fit
 */
export function reduceSeries(series, masters, opts) {
  const skip = opts.skip ?? {};
  const exposure = series.frames[0].exposure;
  const extraVariance =
    skip.bias && skip.dark
      ? 0
      : mastersVariance(masters, {
          readNoise: opts.readNoise,
          darkRate: opts.darkRate,
          exposure,
        });
  const ids = opts.stars.map(s => s.id);
  const flux = Object.fromEntries(ids.map(id => [id, []]));
  const err = Object.fromEntries(ids.map(id => [id, []]));
  let nodes = null;
  for (const frame of series.frames) {
    const red = reduceFrame(frame, masters, {
      gain: opts.gain,
      readNoise: opts.readNoise,
      darkRate: opts.darkRate,
      stars: opts.stars,
      r: opts.r,
      rIn: opts.rIn,
      rOut: opts.rOut,
      extraVariance,
      skip,
    });
    for (const id of ids) {
      flux[id].push(red.photometry[id].net);
      err[id].push(red.photometry[id].sigma);
    }
    nodes ??= red.nodes;
  }
  const target = ids[0];
  const diff = (a, b) =>
    series.frames.map((_, k) =>
      differentialMagnitude(
        { net: flux[a][k], sigma: err[a][k] },
        { net: flux[b][k], sigma: err[b][k] }
      )
    );
  const dm = diff(target, opts.comparison);
  const out = {
    flux,
    err,
    times: series.times,
    dm: Float64Array.from(dm, d => d.dm),
    dmSigma: Float64Array.from(dm, d => d.sigma),
    nodes,
    extraVariance,
  };
  if (opts.check) {
    const ck = diff(opts.check, opts.comparison);
    out.check = Float64Array.from(ck, d => d.dm);
    out.checkSigma = Float64Array.from(ck, d => d.sigma);
    out.checkScatter = scatter(out.check);
  }
  out.targetScatterRaw = scatter(
    Float64Array.from(flux[target], f => -2.5 * Math.log10(f))
  );
  return out;
}

/** Fit the differential light curve of a reduction. */
export function fitLightCurve(red, { minPeriod, maxPeriod }) {
  return scanPeriod(red.times, red.dm, red.dmSigma, { minPeriod, maxPeriod });
}
