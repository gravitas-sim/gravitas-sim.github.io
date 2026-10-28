// Band-integrated transmission (Prompt 201 spike). One absorber, a pinned cross-section table reduced to a k-distribution
// per named band, an isothermal constant-gravity atmosphere over an opaque disc. ATMOSPHERES_GATE_II.md.
import { K_BOLTZMANN, ATOMIC_MASS, refuse, isPos } from './constants.js';
import { composite } from './quadrature.js';

const MODEL = 'band-integrated transmission';
const ASSUMES = [
  'isothermal',
  'hydrostatic, constant gravity',
  'one absorber of constant mixing ratio, cross-section from one pinned table at one temperature and pressure',
  'no scattering, no clouds, no refraction',
  'band-integrated depth, not a resolved spectrum',
  'uniform stellar disc, central transit',
];
export const REGIME = {
  hOverRp: 0.01,
  zEffOverRp: 0.1,
  temperature: [300, 3500],
  meanMolecularWeight: [2, 45],
  gravity: [2, 40],
  sigmaRule: 3,
};

/** The limb integral of an optical-depth profile in scale heights: integral_0^xmax f(x) dx. */
const limb = (f, xmax) => composite(f, 0, xmax, 2, 8);

/** H [E1(tau0) + ln tau0 + gamma] with H = 1, by the same quadrature the depth uses (the analytic check). */
export const frozenLimb = tau0 =>
  limb(
    x => -Math.expm1(-tau0 * Math.exp(-x)),
    Math.max(8, Math.log(tau0 * 1e13))
  );

const inDomain = (v, [lo, hi]) => v >= lo && v <= hi;

/**
 * The transit depth of one band. band = { sigma: [m^2], weight: [..., sum 1] }.
 * Returns the depth, the atmospheric excess over (R_p/R_s)^2, the effective height and the stated model error.
 */
export function bandDepth({
  radius,
  starRadius,
  temperature,
  meanMolecularWeight,
  gravity,
  pressure,
  abundance,
  band,
}) {
  for (const [k, v] of Object.entries({
    radius,
    starRadius,
    temperature,
    meanMolecularWeight,
    gravity,
    pressure,
    abundance,
  }))
    if (!isPos(v)) return refuse(MODEL, `${k} must be positive`);
  if (
    !band ||
    !band.sigma?.length ||
    band.sigma.length !== band.weight?.length ||
    !band.sigma.every(isPos)
  )
    return refuse(
      MODEL,
      'the band needs positive cross-sections and as many weights'
    );
  if (Math.abs(band.weight.reduce((a, b) => a + b, 0) - 1) > 1e-9)
    return refuse(MODEL, 'the band weights must sum to one');
  if (!inDomain(temperature, REGIME.temperature))
    return refuse(
      MODEL,
      'the temperature is outside 300 to 3500 K, where this model was tested'
    );
  if (!inDomain(meanMolecularWeight, REGIME.meanMolecularWeight))
    return refuse(MODEL, 'the mean molecular weight is outside 2 to 45');
  if (!inDomain(gravity, REGIME.gravity))
    return refuse(MODEL, 'the gravity is outside 2 to 40 m/s^2');
  const H =
    (K_BOLTZMANN * temperature) / (meanMolecularWeight * ATOMIC_MASS * gravity);
  if (H / radius > REGIME.hOverRp)
    return refuse(
      MODEL,
      'the scale height is above 1 percent of the radius: the constant-gravity, plane-parallel treatment was tested only to here'
    );
  const n0 = pressure / (K_BOLTZMANN * temperature);
  const sMax = Math.max(...band.sigma);
  // slant optical depth at b = R_p + x H, n = n0 exp(-x): sigma X n sqrt(2 pi b H) (1 + 3H/8b - 15H^2/128b^2)
  const tau = (s, x) => {
    const b = radius + x * H;
    const q = H / b;
    return (
      s *
      abundance *
      n0 *
      Math.exp(-x) *
      Math.sqrt(2 * Math.PI * b * H) *
      (1 + 0.375 * q - 0.1171875 * q * q)
    );
  };
  const xmax = Math.max(8, Math.log(Math.max(tau(sMax, 0), 1) * 1e13));
  const area = limb(x => {
    let a = 0;
    for (let i = 0; i < band.sigma.length; i++)
      a -= band.weight[i] * Math.expm1(-tau(band.sigma[i], x));
    return (radius / H + x) * a;
  }, xmax);
  const floor = (radius / starRadius) ** 2;
  const excess = (2 * H * H * area) / starRadius ** 2;
  const depth = floor + excess;
  const zEff = starRadius * Math.sqrt(depth) - radius;
  if (zEff / radius > REGIME.zEffOverRp)
    return refuse(
      MODEL,
      'the effective height is above a tenth of the radius: the atmosphere is too thick for this model'
    );
  return {
    model: MODEL,
    assumes: ASSUMES,
    depth,
    excess,
    zEff,
    scaleHeight: H,
    hOverRp: H / radius,
    modelError: 1.5 * (zEff / radius),
  };
}

/**
 * The temperature (so the scale height) from the depth difference of a strong and a weak band. Refuses outside the domain;
 * says "not constrained" for a difference under three noise standard deviations (one-sided, strong deeper than weak).
 */
export function inferTemperature({ difference, sigma, bands, ...inputs }) {
  if (!isPos(sigma)) return refuse(MODEL, 'the noise must be positive');
  const sd = Math.SQRT2 * sigma;
  if (!(difference >= REGIME.sigmaRule * sd))
    return {
      model: MODEL,
      assumes: ASSUMES,
      notConstrained: true,
      reason:
        'the difference is under three standard deviations: the scale height is not constrained (a cloud deck or no absorber looks the same)',
    };
  const f = T => {
    const s = bandDepth({ ...inputs, temperature: T, band: bands.strong });
    const w = bandDepth({ ...inputs, temperature: T, band: bands.weak });
    return s.refused ? s : w.refused ? w : { d: s.depth - w.depth, s, w };
  };
  let lo = REGIME.temperature[0];
  let hi = REGIME.temperature[1];
  // the difference grows with T; take the accepted bracket (the domain refuses at the hot end when H/R_p is large)
  let flo = f(lo);
  for (let i = 0; flo.refused && i < 60; i++) flo = f((lo += 0.02 * (hi - lo)));
  let fhi = f(hi);
  for (let i = 0; fhi.refused && i < 60; i++) fhi = f((hi -= 0.02 * (hi - lo)));
  if (flo.refused || fhi.refused)
    return refuse(MODEL, flo.refused ? flo.reason : fhi.reason);
  if (!(flo.d <= difference && difference <= fhi.d))
    return {
      model: MODEL,
      assumes: ASSUMES,
      notConstrained: true,
      reason:
        'the difference lies outside what the model can give within its domain',
    };
  for (let i = 0; i < 80 && hi - lo > 1e-10 * hi; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid).d < difference) lo = mid;
    else hi = mid;
  }
  const T = 0.5 * (lo + hi);
  const e = 1e-4 * T;
  const a = f(T - e);
  const b = f(T + e);
  const mid = f(T);
  const slope =
    !a.refused && !b.refused ? (b.d - a.d) / (2 * e) : (f(T + e).d - mid.d) / e;
  const model =
    1.5 *
    ((mid.s.zEff / inputs.radius) * mid.s.excess +
      (mid.w.zEff / inputs.radius) * mid.w.excess);
  const sT = Math.sqrt(sd * sd + (model * model) / 3) / Math.abs(slope);
  const H = mid.s.scaleHeight;
  return {
    model: MODEL,
    assumes: ASSUMES,
    temperature: T,
    scaleHeight: H,
    sigma: sT,
    lo: T - 1.96 * sT,
    hi: T + 1.96 * sT,
  };
}
