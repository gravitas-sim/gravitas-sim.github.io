// =============================================================================
// The orbit of an imaged planet from positions the subtraction pipeline measured
// (Prompt 230 Part B, IMAGING_SUBTRACTION_GATE.md)
// -----------------------------------------------------------------------------
// Each epoch is a frame of the committed scene (the star, the planet at its true
// place, sky and detector noise) and a reference frame with an independent mismatch,
// reduced by subtract.js. An epoch enters the series when the planet is detected
// outside the working radius, with the fit's position and formal sigma. Prompt 187's
// fitter (js/measure/orbit-fit.js) is used unchanged: it returns elements only above
// its committed criterion, and says "not constrained" otherwise.
//
// degeneracyMap() is an independent grid of the best chi-squared over (period,
// eccentricity): at every node the four Thiele-Innes entries are a linear least-squares
// problem on each axis, and the periastron phase is scanned. It is the picture of
// why a short arc cannot choose a period, and a second check of the fitter.
// =============================================================================

import { solveKepler } from '../../orbital.js';
import { stream } from '../../random/streams.js';
import {
  DESIGN,
  findPlanet,
  referenceMismatch,
  sceneFrame,
} from './subtract.js';

const { Math, Float64Array } = globalThis;

export const PLATE_SCALE_ARCSEC = 0.05;
export const ORBIT_CONTRAST = 3e-3;

/**
 * Measure one epoch. `truth` is the planet's offset (x north, y east, arcseconds).
 * @returns {{ok: boolean, lost?: string, x?: number, y?: number, sx?: number, sy?: number, snr?: number}}
 */
export function measureEpoch({
  seed,
  label,
  truth,
  contrast = ORBIT_CONTRAST,
  size = DESIGN.orbitFrame,
  scale = PLATE_SCALE_ARCSEC,
  matched = false,
}) {
  const c = size / 2;
  const px = c + truth.y / scale;
  const py = c - truth.x / scale;
  const flux = contrast * DESIGN.starRate * DESIGN.exposure;
  const draw = stream('injection', seed, ...label, 'mismatch');
  const mm = referenceMismatch(draw, { matched });
  const target = sceneFrame({
    seed: `${seed}:${label.join(':')}`,
    label: 'target',
    size,
    planets: [{ x: px, y: py, flux }],
  });
  const reference = sceneFrame({
    seed: `${seed}:${label.join(':')}`,
    label: 'reference',
    size,
    fwhm: DESIGN.fwhm * (1 + mm.eps),
    starRate: DESIGN.starRate * mm.rateFactor,
    star: { x: c + mm.dx, y: c + mm.dy },
  });
  const r = findPlanet(target, reference, {});
  if (!r.ok) return { ok: false, lost: r.code };
  if (!r.detected) return { ok: false, lost: 'not-detected', snr: r.snr };
  return {
    ok: true,
    px: r.x,
    py: r.y,
    x: -(r.y - c) * scale,
    y: (r.x - c) * scale,
    sx: r.sigmaY * scale,
    sy: r.sigmaX * scale,
    snr: r.snr,
    truthPx: { x: px, y: py },
    reduction: r.reduction,
  };
}

/** A series for the fitter from measured epochs (decimal years), lost epochs left out. */
export function seriesOf(epochs) {
  return {
    epochs: epochs
      .filter(e => e.ok)
      .map(e => ({
        time: { value: e.year, format: 'year' },
        x: e.x,
        y: e.y,
        sx: e.sx,
        sy: e.sy,
      })),
  };
}

// ---- the degeneracy map ------------------------------------------------------------

const TAU = 2 * Math.PI;

/**
 * The best chi-squared on a grid of period and eccentricity.
 * @param {{years: number[], x: number[], y: number[], sx: number[], sy: number[]}} s - offsets in arcseconds
 * @param {{perDecade?: number, eMax?: number, eStep?: number, phases?: number}} [o]
 */
export function degeneracyMap(s, o = {}) {
  const perDecade = o.perDecade ?? 20;
  const eStep = o.eStep ?? 0.05;
  const eMax = o.eMax ?? 0.9;
  const phases = o.phases ?? 36;
  const n = s.years.length;
  const t0 = s.years[0];
  const span = Math.max(...s.years) - Math.min(...s.years);
  const lo = Math.log10(span / 20);
  const hi = Math.log10(span * 100);
  const nP = Math.round((hi - lo) * perDecade) + 1;
  const periods = [];
  for (let i = 0; i < nP; i++)
    periods.push(10 ** (lo + (i * (hi - lo)) / (nP - 1)));
  const nE = Math.round(eMax / eStep) + 1;
  const es = [];
  for (let i = 0; i < nE; i++) es.push(i * eStep);
  const wx = s.sx.map(v => 1 / (v * v));
  const wy = s.sy.map(v => 1 / (v * v));
  const chi2 = [];
  const X = new Float64Array(n);
  const Y = new Float64Array(n);
  for (let ip = 0; ip < nP; ip++) {
    const row = [];
    for (let ie = 0; ie < nE; ie++) {
      const e = es[ie];
      const q = Math.sqrt(1 - e * e);
      let best = Infinity;
      for (let ph = 0; ph < phases; ph++) {
        const phase = (TAU * ph) / phases;
        for (let i = 0; i < n; i++) {
          const E = solveKepler(
            (TAU * (s.years[i] - t0)) / periods[ip] - phase,
            e
          );
          X[i] = Math.cos(E) - e;
          Y[i] = q * Math.sin(E);
        }
        const c = axisChi2(X, Y, s.x, wx) + axisChi2(X, Y, s.y, wy);
        if (c < best) best = c;
      }
      row.push(best);
    }
    chi2.push(row);
  }
  let min = Infinity;
  let at = [0, 0];
  for (let ip = 0; ip < nP; ip++)
    for (let ie = 0; ie < nE; ie++)
      if (chi2[ip][ie] < min) {
        min = chi2[ip][ie];
        at = [ip, ie];
      }
  const map = {
    periods,
    eccentricities: es,
    chi2,
    min,
    best: { period: periods[at[0]], e: es[at[1]] },
    span,
    perDecade,
    /** the period range (profiled over e) of the region within `delta` of the minimum */
    periodRange(delta) {
      let a = Infinity;
      let b = -Infinity;
      for (let ip = 0; ip < nP; ip++)
        if (Math.min(...chi2[ip]) - min <= delta) {
          a = Math.min(a, periods[ip]);
          b = Math.max(b, periods[ip]);
        }
      return [a, b];
    },
    eccentricityRange(delta) {
      let a = Infinity;
      let b = -Infinity;
      for (let ie = 0; ie < nE; ie++) {
        let m = Infinity;
        for (let ip = 0; ip < nP; ip++) m = Math.min(m, chi2[ip][ie]);
        if (m - min <= delta) {
          a = Math.min(a, es[ie]);
          b = Math.max(b, es[ie]);
        }
      }
      return [a, b];
    },
  };
  return map;
}

/** Weighted linear least squares of v on (X, Y); returns the minimum chi-squared. */
function axisChi2(X, Y, v, w) {
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let sxv = 0;
  let syv = 0;
  let svv = 0;
  for (let i = 0; i < X.length; i++) {
    sxx += w[i] * X[i] * X[i];
    sxy += w[i] * X[i] * Y[i];
    syy += w[i] * Y[i] * Y[i];
    sxv += w[i] * X[i] * v[i];
    syv += w[i] * Y[i] * v[i];
    svv += w[i] * v[i] * v[i];
  }
  const det = sxx * syy - sxy * sxy;
  if (!(Math.abs(det) > 1e-300)) return svv;
  const a = (sxv * syy - syv * sxy) / det;
  const b = (syv * sxx - sxv * sxy) / det;
  return svv - a * sxv - b * syv;
}
