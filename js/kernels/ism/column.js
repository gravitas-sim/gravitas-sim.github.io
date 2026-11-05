// =============================================================================
// ISM kernel: the column density, linear regime only (S7)
// -----------------------------------------------------------------------------
// N = W / (pi r_e f lambda^2) holds for an optically thin line. A column density
// from a saturated line is wrong by a factor that grows without bound, so the
// regime is TESTED before a number is returned:
//
//   T1 (a doublet)   the ratio of the two equivalent widths against the ratio the
//                    atomic data give, f2 lambda2^2 / (f1 lambda1^2): they agree in
//                    the linear regime and the observed ratio falls toward 1 as the
//                    stronger line saturates
//   T2 (one line)    the line must be RESOLVED (an unresolved line's depth is the
//                    instrument's, not the gas's) and its peak optical depth
//                    tau0 = -ln(1 - depth) must not exceed 0.3, where a Gaussian
//                    line's equivalent width is about 10 percent below its linear value
//
// When neither test can be applied the number is refused, 'linear-regime-untested'.
// The oscillator strength and its source are required inputs with no default (a
// typed one would be a published value from memory); its own uncertainty is not
// propagated, and the result says so.
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { FWHM_PER_SIGMA } from '../spectrograph/lsf.js';
import { columnFromWidth, COLUMN_CONSTANT } from './constants.js';

const { Math, Number } = globalThis;

/** T2's cut on the peak optical depth, and T1's width in sigma of the observed ratio. */
export const TAU0_MAX = 0.3;
export const RATIO_SIGMAS = 2;
/** T2 calls a line resolved when its sigma exceeds the line-spread sigma by this many sigma and this fraction. */
export const RESOLVED_SIGMAS = 3;
export const RESOLVED_FRACTION = 0.25;
/** A line needs this signal-to-noise in its equivalent width to give a column density. */
export const MIN_WIDTH_SNR = 3;

/**
 * W / W_linear of a Gaussian optical-depth line of peak depth tau0, by Simpson's rule over +-9 sigma:
 * (1 / (tau0 sqrt(2 pi))) integral (1 - exp(-tau0 exp(-u^2 / 2))) du. The series is sum (-tau0)^(n-1) / (n! sqrt(n)).
 */
export function linearRegimeRatio(tau0) {
  if (!(tau0 > 0)) return 1;
  const n = 4000;
  const a = -9;
  const h = -2 * a / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const u = a + i * h;
    const g = 1 - Math.exp(-tau0 * Math.exp(-0.5 * u * u));
    s += g * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  }
  return (s * h) / 3 / (tau0 * Math.sqrt(2 * Math.PI));
}

const strength = l => l.f * l.lambdaNm * l.lambdaNm;

/**
 * T2 on one fitted line: resolved, then its peak depth.
 * @returns {{tested: false, why: string}|{tested: true, tau0: number, passed: boolean}}
 */
function peakDepthTest(fit) {
  if (!fit || fit.status !== 'ok' || !(fit.lsfFwhmNm > 0))
    return { tested: false, why: 'no fit of the line was supplied' };
  const sigmaLsf = fit.lsfFwhmNm / FWHM_PER_SIGMA;
  const excess = fit.sigmaNm - sigmaLsf;
  const resolved =
    excess > RESOLVED_SIGMAS * fit.sigmaSigmaNm &&
    excess > RESOLVED_FRACTION * sigmaLsf;
  if (!resolved)
    return {
      tested: false,
      why: "the line is not resolved: its width is the instrument's, so its depth says nothing about the gas",
    };
  if (!(fit.peakDepth > 0)) return { tested: false, why: 'not an absorption line' };
  const tau0 = fit.peakDepth >= 1 ? Infinity : -Math.log(1 - fit.peakDepth);
  return { tested: true, tau0, passed: tau0 <= TAU0_MAX };
}

/**
 * The column density, cm^-2, of one line or a doublet, in the linear regime or refused.
 * @param {{lines: Array<{id?: string, lambdaNm: number, f: number, fSource: string,
 *   width: {widthNm: number, sigmaNm: number}, fit?: object}>}} o - one line, or two
 */
export function columnDensity({ lines } = {}) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 2)
    return refused('bad-lines', 'one line or a doublet is needed');
  for (const l of lines) {
    if (!(Number.isFinite(l.f) && l.f > 0))
      return refused(
        'bad-oscillator-strength',
        'the oscillator strength must be a positive number the caller supplies'
      );
    if (typeof l.fSource !== 'string' || !l.fSource.trim())
      return refused(
        'missing-source',
        'the oscillator strength needs a source string; there is no default'
      );
    if (!(Number.isFinite(l.lambdaNm) && l.lambdaNm > 0))
      return refused('bad-wavelength', 'the rest wavelength must be positive');
    if (!l.width || !Number.isFinite(l.width.widthNm) || !(l.width.sigmaNm > 0))
      return refused('bad-width', 'an equivalent width with its error is needed');
    if (!(l.width.widthNm / l.width.sigmaNm >= MIN_WIDTH_SNR))
      return refused(
        'no-detection',
        `the equivalent width is under ${MIN_WIDTH_SNR} sigma (or negative: an emission line): no column density`
      );
  }
  const per = lines.map(l => {
    const N = columnFromWidth(l.width.widthNm, l.lambdaNm, l.f);
    return {
      id: l.id,
      columnCm2: N,
      sigmaCm2: (N * l.width.sigmaNm) / l.width.widthNm,
    };
  });
  let regime;
  if (lines.length === 2) {
    const [strong, weak] = strength(lines[0]) >= strength(lines[1]) ? [0, 1] : [1, 0];
    const ratioLinear = strength(lines[strong]) / strength(lines[weak]);
    const ratio = lines[strong].width.widthNm / lines[weak].width.widthNm;
    const sigmaRatio =
      ratio *
      Math.hypot(
        lines[strong].width.sigmaNm / lines[strong].width.widthNm,
        lines[weak].width.sigmaNm / lines[weak].width.widthNm
      );
    regime = {
      test: 'T1 doublet ratio',
      ratio,
      sigmaRatio,
      ratioLinear,
      detectableDeficit: (RATIO_SIGMAS * sigmaRatio) / ratioLinear,
    };
    if (ratio < ratioLinear - RATIO_SIGMAS * sigmaRatio)
      return {
        ...refused(
          'saturated',
          'the doublet ratio is below the atomic ratio by more than 2 sigma: the stronger line is saturated and the linear column density would be too small'
        ),
        regime: { ...regime, passed: false },
      };
    if (ratio > ratioLinear + RATIO_SIGMAS * sigmaRatio)
      return {
        ...refused(
          'ratio-above-atomic',
          'the doublet ratio is above the atomic ratio by more than 2 sigma: noise, a blend or a wrong oscillator strength'
        ),
        regime: { ...regime, passed: false },
      };
    regime.passed = true;
  } else {
    const t = peakDepthTest(lines[0].fit);
    regime = { test: 'T2 peak depth', ...t };
    if (!t.tested)
      return {
        ...refused(
          'linear-regime-untested',
          `a single line cannot be shown to be in the linear regime: ${t.why}`
        ),
        regime,
      };
    if (!t.passed)
      return {
        ...refused(
          'saturated',
          `the peak optical depth ${Number(t.tau0.toPrecision(3))} exceeds ${TAU0_MAX}: outside the linear regime`
        ),
        regime,
      };
  }
  let sw = 0;
  let sN = 0;
  for (const p of per) {
    const w = 1 / p.sigmaCm2 ** 2;
    sw += w;
    sN += w * p.columnCm2;
  }
  const columnCm2 = sN / sw;
  const sigmaCm2 = Math.sqrt(1 / sw);
  return {
    status: 'ok',
    columnCm2,
    sigmaCm2,
    interval: covarianceInterval(columnCm2, sigmaCm2),
    perLine: per,
    regime,
    constant: COLUMN_CONSTANT,
    assumes:
      "linear regime as tested above; the oscillator strength's own uncertainty is not propagated; a single velocity component; a Gaussian optical-depth profile",
  };
}
