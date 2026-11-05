// =============================================================================
// Galaxy kernel: the redshift from a direct lagged cross-correlation (X1 to X6)
// -----------------------------------------------------------------------------
// crossCorrelate   DERIVED   the redshift that best matches a template, from the profile
//                            q(k) = S(k) / sqrt(T(k)), the signal to noise of the best-fit
//                            template amplitude at each shift k of log10(wavelength);
//                            the uncertainty is 1 / sqrt(q |q''|), from the curvature of the
//                            profile chi-square chi2(k) = F - q(k)^2 once the amplitude is
//                            profiled out; the significance is q at the peak
//
// The correlation is DIRECT (a sum over the samples at every lag): the FFT of Prompt 221 is not
// in js/numeric (that gate was C), and the validation holds the direct profile equal to numpy's
// FFT one (GALAXY_SPECTRA.md, leg B2). The template is a caller input with a source string and no
// default: the repository holds no template, and a typed one would be a published spectrum from
// memory. Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { cubicSpline } from '../../numeric/interp.js';
import { checkSpectrum, robustSigma } from '../ism/spectrum.js';
import { checkLogGrid, highPass } from './grid.js';

const { Math, Number, Float64Array } = globalThis;

/** Below this peak significance the redshift is not constrained. */
export const Q_MIN = 6;
/** From Q_MIN to this the answer is returned with status 'low-significance'. */
export const Q_OK = 10;
/** A second peak at least this fraction of the best makes the answer ambiguous. */
export const AMBIGUITY_RATIO = 0.8;
/** Samples around the best lag where a local maximum is the same peak, not a second one. */
export const EXCLUSION_SAMPLES = 20;
/** The smallest overlap, in samples, a lag needs. */
export const MIN_OVERLAP_SAMPLES = 50;
/** The smallest overlap as a fraction of the shorter series. */
export const MIN_OVERLAP_FRACTION = 0.5;
/** The step, in samples, of the second difference. */
export const CURVATURE_STEP = 0.1;

const notConstrained = (code, why, extra = {}) => ({
  status: 'not-constrained',
  code,
  why,
  ...extra,
});

/** Check the template: null when usable, else a refusal. */
function checkTemplate(template, spec) {
  if (!template || !template.lambdaNm || !template.flux)
    return refused('no-template', 'a template needs lambdaNm and flux');
  if (typeof template.source !== 'string' || !template.source.trim())
    return refused(
      'missing-source',
      'a template needs a source string; there is no default template'
    );
  if (template.medium !== 'air' && template.medium !== 'vacuum')
    return refused(
      'medium-missing',
      "the template's medium ('air' or 'vacuum') is required"
    );
  if (template.medium !== spec.medium)
    return refused(
      'medium-mismatch',
      `the spectrum is in ${spec.medium} and the template in ${template.medium}: the two differ by tens of km/s and are never converted`
    );
  if (template.lambdaNm.length !== template.flux.length)
    return refused(
      'length-mismatch',
      'template lambdaNm and flux differ in length'
    );
  if (template.lambdaNm.length < 100)
    return refused(
      'too-few-samples',
      'a template of under 100 samples is too short'
    );
  for (let i = 0; i < template.flux.length; i++)
    if (
      !Number.isFinite(template.flux[i]) ||
      !Number.isFinite(template.lambdaNm[i])
    )
      return refused(
        'not-finite',
        'a template wavelength or flux is not finite'
      );
  for (let i = 1; i < template.lambdaNm.length; i++)
    if (!(template.lambdaNm[i] > template.lambdaNm[i - 1]))
      return refused('not-increasing', 'the template axis does not increase');
  if (!(template.resolvingPower > 0))
    return refused(
      'resolution-missing',
      "the template's resolving power is required"
    );
  const R =
    spec.resolvingPower > 0
      ? spec.resolvingPower
      : spec.lambdaNm[spec.lambdaNm.length >> 1] / spec.lsfFwhmNm;
  if (template.resolvingPower > 1.1 * R)
    return refused(
      'template-resolution',
      `the template resolves ${Math.round(template.resolvingPower)} against the spectrum's ${Math.round(R)}: its lines are narrower than the data's and the correlation is biased; degradeToResolution lowers it`
    );
  return null;
}

/**
 * The redshift from the direct lagged cross-correlation with a template (GALAXY-RULE-1, X1 to X6).
 * @param {{lambdaNm: ArrayLike<number>, flux: ArrayLike<number>, sigma?: ArrayLike<number>|null, medium: string, resolvingPower?: number, lsfFwhmNm?: number}} spec
 * @param {{lambdaNm: ArrayLike<number>, flux: ArrayLike<number>, medium: string, resolvingPower: number, source: string, label?: string}} template
 * @param {{zRange: {min: number, max: number}, keepProfile?: boolean}} o
 */
export function crossCorrelate(
  spec,
  template,
  { zRange, keepProfile = false } = {}
) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  const badT = checkTemplate(template, spec);
  if (badT) return badT;
  if (
    !zRange ||
    !Number.isFinite(zRange.min) ||
    !Number.isFinite(zRange.max) ||
    !(zRange.min < zRange.max) ||
    !(zRange.min > -1)
  )
    return refused(
      'bad-z-range',
      'a redshift range {min < max, min > -1} is required; there is no default'
    );
  const gs = checkLogGrid(spec.lambdaNm, 'spectrum');
  if (gs.status) return gs;
  const gt = checkLogGrid(template.lambdaNm, 'template');
  if (gt.status) return gt;
  const step = gs.step;
  if (Math.abs(gt.step - step) / step > 1e-3)
    return refused(
      'step-mismatch',
      'the template and the spectrum must share one logarithmic step (resample the template)'
    );
  const N = spec.lambdaNm.length;
  const M = template.lambdaNm.length;
  const L0 = Math.log10(spec.lambdaNm[0]);
  const T0 = Math.log10(template.lambdaNm[0]);
  const lagOf = z => (Math.log10(1 + z) - (L0 - T0)) / step;
  const zOf = k => 10 ** (L0 - T0 + k * step) - 1;
  const kLo = Math.ceil(lagOf(zRange.min));
  const kHi = Math.floor(lagOf(zRange.max));
  const minOverlap = Math.max(
    MIN_OVERLAP_SAMPLES,
    Math.ceil(MIN_OVERLAP_FRACTION * Math.min(N, M))
  );
  // the lags whose overlap is enough
  const lags = [];
  for (let k = kLo; k <= kHi; k++) {
    const lo = Math.max(0, k);
    const hi = Math.min(N - 1, M - 1 + k);
    if (hi - lo + 1 >= minOverlap) lags.push(k);
  }
  if (!lags.length)
    return refused(
      'z-range-outside-overlap',
      'no redshift in the range leaves the spectrum and the template enough overlap'
    );

  const errorsFromScatter = !spec.sigma;
  const sig0 = errorsFromScatter ? robustSigma(spec.flux) : null;
  if (errorsFromScatter && !(sig0 > 0))
    return refused(
      'no-structure',
      'the flux has no measurable scatter and no sigma was given'
    );
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const s = errorsFromScatter ? sig0 : spec.sigma[i];
    w[i] = 1 / (s * s);
  }
  const f = highPass(spec.flux);
  const t = highPass(template.flux);
  let vf = 0;
  let vt = 0;
  for (let i = 0; i < N; i++) vf += f[i] * f[i];
  for (let j = 0; j < M; j++) vt += t[j] * t[j];
  if (
    !(vf > 0) ||
    !(vt > 0) ||
    !(
      Math.max(...f.map(Math.abs)) >
      1e-12 * (1 + Math.max(...spec.flux.map(Math.abs)))
    )
  )
    return refused(
      'no-structure',
      'the high-passed spectrum or template has no structure to correlate'
    );
  const wf = new Float64Array(N);
  for (let i = 0; i < N; i++) wf[i] = w[i] * f[i];

  // the integer-lag profile
  const q = new Float64Array(lags.length);
  for (let a = 0; a < lags.length; a++) {
    const k = lags[a];
    const lo = Math.max(0, k);
    const hi = Math.min(N - 1, M - 1 + k);
    let S = 0;
    let T = 0;
    for (let i = lo; i <= hi; i++) {
      const tv = t[i - k];
      S += wf[i] * tv;
      T += w[i] * tv * tv;
    }
    q[a] = T > 0 ? S / Math.sqrt(T) : 0;
  }
  let best = 0;
  for (let a = 1; a < lags.length; a++) if (q[a] > q[best]) best = a;
  const k0 = lags[best];
  if (!(q[best] > 0))
    return refused('no-structure', 'the correlation is nowhere positive');

  // the fractional profile by natural cubic-spline interpolation of the template
  const xs = new Float64Array(M);
  for (let j = 0; j < M; j++) xs[j] = j;
  const spline = cubicSpline(xs, t);
  const qAt = k => {
    const lo = Math.max(0, Math.ceil(k));
    const hi = Math.min(N - 1, Math.floor(M - 1 + k));
    if (hi - lo + 1 < minOverlap) return -Infinity;
    let S = 0;
    let T = 0;
    for (let i = lo; i <= hi; i++) {
      const tv = spline.at(i - k);
      S += wf[i] * tv;
      T += w[i] * tv * tv;
    }
    return T > 0 ? S / Math.sqrt(T) : 0;
  };
  // golden-section search for the maximum of q on [k0 - 1, k0 + 1]
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = k0 - 1;
  let b = k0 + 1;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let qc = qAt(c);
  let qd = qAt(d);
  for (let it = 0; it < 40 && b - a > 1e-5; it++) {
    if (qc > qd) {
      b = d;
      d = c;
      qd = qc;
      c = b - phi * (b - a);
      qc = qAt(c);
    } else {
      a = c;
      c = d;
      qc = qd;
      d = a + phi * (b - a);
      qd = qAt(d);
    }
  }
  const kBest = 0.5 * (a + b);
  const qPeak = qAt(kBest);
  const h = CURVATURE_STEP;
  const qpp = (qAt(kBest + h) - 2 * qPeak + qAt(kBest - h)) / (h * h);
  const z = zOf(kBest);

  // the second peak: the largest local maximum of the integer profile away from the best lag
  let second = null;
  const idx = new Map(lags.map((k, i) => [k, i]));
  for (let m = 0; m < lags.length; m++) {
    const k = lags[m];
    if (Math.abs(k - k0) <= EXCLUSION_SAMPLES) continue;
    const left = idx.has(k - 1) ? q[idx.get(k - 1)] : -Infinity;
    const right = idx.has(k + 1) ? q[idx.get(k + 1)] : -Infinity;
    if (q[m] >= left && q[m] > right && (!second || q[m] > second.q))
      second = { lag: k, q: q[m], z: zOf(k) };
  }

  const base = {
    z,
    q: qPeak,
    lag: kBest,
    step,
    amplitude: null,
    errorsFromScatter,
    overlapSamples: Math.min(N - Math.max(0, Math.ceil(kBest)), M),
    secondPeak: second,
    template: { label: template.label ?? null, source: template.source },
    method:
      'direct lagged correlation of high-passed series on a logarithmic grid; sigma from the curvature of the profile chi-square',
    assumes:
      'the template is the object; the noise is independent between samples; one redshift; a non-negative amplitude',
  };
  if (keepProfile) base.profile = { lag0: lags[0], q: Float64Array.from(q) };
  if (second && second.q >= AMBIGUITY_RATIO * qPeak)
    return {
      ...refused(
        'ambiguous-peak',
        'a second peak of the correlation is within 20 percent of the best: the redshift is not unique'
      ),
      ...base,
      candidates: [
        { z, q: qPeak },
        { z: second.z, q: second.q },
      ],
    };
  if (qPeak < Q_MIN)
    return notConstrained(
      'low-significance',
      `the correlation peak's significance ${Math.round(qPeak * 10) / 10} is under ${Q_MIN}: the template does not stand out of the noise`,
      { ...base, interval: null }
    );
  if (!(qpp < 0))
    return refused(
      'no-curvature',
      'the correlation profile has no maximum at the refined lag'
    );
  const sigmaLag = 1 / Math.sqrt(qPeak * -qpp);
  const sigmaZ = (1 + z) * Math.LN10 * step * sigmaLag;
  const interval = covarianceInterval(z, sigmaZ);
  // the best-fit amplitude of the filtered template: S / T at the refined lag
  let S = 0;
  let T = 0;
  {
    const lo = Math.max(0, Math.ceil(kBest));
    const hi = Math.min(N - 1, Math.floor(M - 1 + kBest));
    for (let i = lo; i <= hi; i++) {
      const tv = spline.at(i - kBest);
      S += wf[i] * tv;
      T += w[i] * tv * tv;
    }
  }
  return {
    ...base,
    status: qPeak >= Q_OK ? 'ok' : 'low-significance',
    sigmaZ,
    sigmaLag,
    interval,
    amplitude: S / T,
    sigmaAmplitude: 1 / Math.sqrt(T),
    curvature: qpp,
    flags: qPeak >= Q_OK ? [] : ['low-significance'],
  };
}
