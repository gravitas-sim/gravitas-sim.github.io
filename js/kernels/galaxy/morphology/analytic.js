// =============================================================================
// Galaxy morphology kernel: the analytic profiles (Prompt 249, GALAXY_MORPHOLOGY.md)
// -----------------------------------------------------------------------------
// The closed forms the synthetic worlds and the validation legs use as truth. A profile is described by
// its cumulative flux fraction inside an elliptical radius a (a semi-major axis in pixels), from which
// the Petrosian radius under the kernel's own definition (the annulus 0.8 a to 1.25 a, not the surface
// brightness at a), the totals inside 2 r_P and the radii at stated flux fractions follow by bisection.
//
//   Sersic     F(<a) / F_tot = P(2n, b_n (a / R_e)^(1/n)),  b_n defined by P(2n, b_n) = 0.5
//   Gaussian   F(<a) / F_tot = 1 - exp(-a^2 / (2 s^2))
//
// P is the regularised lower incomplete gamma function of the statistics kernel. b_n is found by
// bisection on that definition, so no tabulated or fitted constant is held. Pure: no DOM, no clock.
// =============================================================================

import { gammaP, lnGamma } from '../../statistics/special.js';

const { Math } = globalThis;

/** The Sersic b_n: P(2n, b) = 0.5, by bisection (monotone in b). */
export function sersicB(n) {
  if (!(n > 0)) return NaN;
  let lo = 1e-9;
  let hi = 2 * n + 20;
  for (let k = 0; k < 200; k++) {
    const mid = 0.5 * (lo + hi);
    if (gammaP(2 * n, mid) < 0.5) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-15 * hi) break;
  }
  return 0.5 * (lo + hi);
}

/**
 * The flux of a Sersic profile with unit axis ratio factored out: F_tot = 2 pi n e^b Gamma(2n) b^(-2n)
 * R_e^2 q I_e. Returns the factor multiplying R_e^2 q I_e.
 */
export function sersicFluxFactor(n) {
  const b = sersicB(n);
  return 2 * Math.PI * n * Math.exp(b + lnGamma(2 * n) - 2 * n * Math.log(b));
}

/**
 * An analytic description of a PSF-free profile.
 * @param {{kind: 'sersic'|'gaussian', n?: number, re?: number, sigma?: number}} p
 *   re is the semi-major half-light radius of the whole profile; sigma is the semi-major sigma of a Gaussian
 * @returns {{fraction: (a: number) => number, scale: number}}
 */
export function analyticProfile(p) {
  if (p.kind === 'gaussian') {
    const s = p.sigma;
    return {
      kind: 'gaussian',
      scale: s,
      fraction: a => -Math.expm1(-(a * a) / (2 * s * s)),
    };
  }
  const n = p.n;
  const b = sersicB(n);
  const re = p.re;
  return {
    kind: 'sersic',
    scale: re,
    b,
    fraction: a => (a <= 0 ? 0 : gammaP(2 * n, b * (a / re) ** (1 / n))),
  };
}

/** Solve f(a) = target for a increasing f on [lo, hi] by bisection. */
function bisect(f, target, lo, hi) {
  for (let k = 0; k < 200; k++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) < target) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14 * hi) break;
  }
  return 0.5 * (lo + hi);
}

/**
 * The Petrosian ratio under the kernel's definition: the mean surface brightness in the elliptical annulus
 * [f0 a, f1 a] over the mean inside a. For concentric similar ellipses the axis ratio cancels.
 */
export function petrosianRatio(profile, a, factors = [0.8, 1.25]) {
  const [f0, f1] = factors;
  const F = profile.fraction;
  const ann = (F(f1 * a) - F(f0 * a)) / (f1 * f1 - f0 * f0);
  const inside = F(a);
  return ann / inside;
}

/**
 * The analytic truth a validation leg compares with: the Petrosian radius (first crossing of eta = 0.2),
 * the flux inside 2 r_P as a fraction of the profile's total, the radii enclosing the stated fractions of
 * that flux, and the concentration.
 */
export function analyticTruth(
  p,
  { eta = 0.2, factors = [0.8, 1.25], totalFactor = 2 } = {}
) {
  const prof = analyticProfile(p);
  const s = prof.scale;
  // eta falls from 1 at the centre: bisect on its decreasing branch
  let lo = 1e-3 * s;
  let hi = 60 * s;
  for (let k = 0; k < 200; k++) {
    const mid = 0.5 * (lo + hi);
    if (petrosianRatio(prof, mid, factors) > eta) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14 * hi) break;
  }
  const rP = 0.5 * (lo + hi);
  const fT = prof.fraction(totalFactor * rP);
  const at = f => bisect(prof.fraction, f * fT, 1e-6 * s, 60 * s);
  const r20 = at(0.2);
  const r50 = at(0.5);
  const r80 = at(0.8);
  return {
    rPetrosian: rP,
    totalFraction: fT,
    r20,
    r50,
    r80,
    concentration: 5 * Math.log10(r80 / r20),
    magnitudeOffset: -2.5 * Math.log10(fT),
    fraction: prof.fraction,
  };
}
