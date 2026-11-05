// =============================================================================
// Radio kernel: the tangent-point circular speed, with its interval
// -----------------------------------------------------------------------------
// The pathway in one call: an HI spectrum on a frequency axis, at one mask
// sightline, becomes the circular speed at the tangent radius. The steps, each
// stated: frequency to heliocentric velocity (a Doppler convention), to the LSR
// (an option of lsr.js, shown in the result), the terminal-velocity edge (edge.js,
// rule E), then Theta(R_t) = |v_t| + Theta0 |sin l| at R_t = R0 |sin l|.
//
// The result depends on assumptions the student must see, so the record carries
// them: R0, Theta0, the LSR option and the two other options' answers, the
// gas dispersion, the Doppler convention, and the list of what the method
// assumes. Theta0 and the LSR's V enter only as their sum at a given longitude
// (RADIO.md), so a change of either moves the whole curve by the same amount
// times |sin l|, and U moves the two quadrants in opposite directions.
//
// The interval is the statistics kernel's covarianceInterval on
//
//   sigma_Theta^2 = sigma_x^2 + (w / sqrt(12))^2 + (c_f sigma_sigmaV)^2
//                   + (tau sigma_v)^2 + (sin l sigma_Theta0)^2,
//
// sigma_x the noise-driven position of the crossing, w the channel width, the
// third term the uncertainty of the assumed gas dispersion carried through c_f,
// tau the shape term (the departure of a real edge from the universal one) and
// the last the uncertainty of Theta0. R0's uncertainty moves the point along the
// curve (R_t = R0 |sin l|), not its height, and is returned as its own number.
// =============================================================================

import { covarianceInterval } from '../statistics/intervals.js';
import {
  CONVENTIONS,
  HI_LINE,
  RadioError,
  refusal,
  velocityFromFrequency,
} from './constants.js';
import { resolveLsr, lsrShift, LSR_OPTIONS } from './lsr.js';
import {
  MASK_LONGITUDES,
  circularSpeedFromTerminal,
  maskRefusal,
  sideOf,
  tangentGeometry,
  wrapLongitude,
} from './geometry.js';
import { EDGE_RULE, terminalEdge } from './edge.js';

const DEG = Math.PI / 180;

/** The shape term tau (in units of the gas dispersion): see thresholds.json, "uncertainty". */
export const SHAPE_TERM = 0.05;

/** The statements that go with every result: what the method assumes. */
export const ASSUMPTIONS = Object.freeze([
  'gas on circular orbits about the Galactic centre at one speed per radius',
  'R0 and Theta0 as given: the method measures Theta(R) + (Theta0 + V) sin l, not Theta alone',
  'the LSR option shown: the choice of the Sun\'s V changes every circular speed by the same amount times |sin l|',
  'the gas dispersion given: the terminal velocity is the half-peak crossing less a distance computed from it',
  'an optically thin line: a saturated line moves the edge (RADIO.md)',
  'the fixed longitude mask only: no sightline outside it is fitted',
]);

const refuseMissing = what =>
  refusal('missing-assumption', `${what} is required and has no default`);

/**
 * The circular speed at a sightline's tangent radius from its HI spectrum.
 *
 * @param {object} o
 * @param {number} o.l - Galactic longitude, degrees (on the mask)
 * @param {number} [o.b] - latitude, degrees (0 only)
 * @param {number[]} o.frequencyHz - channel frequencies, strictly monotone
 * @param {number[]} o.temperature - brightness temperature per channel, K
 * @param {number} o.r0 - the Sun's galactocentric distance, kpc (required)
 * @param {number} o.theta0 - the LSR's circular speed, km/s (required)
 * @param {number} [o.sigmaTheta0] - its uncertainty, km/s (0)
 * @param {number} o.sigmaV - the assumed gas dispersion, km/s (required)
 * @param {number} [o.sigmaSigmaV] - its uncertainty, km/s (0)
 * @param {string|object} [o.lsr] - an option of lsr.js (default 'schonrich')
 * @param {string} [o.convention] - 'radio' (default), 'optical' or 'relativistic'
 * @param {number} [o.sigmaNoise] - K; estimated when absent
 * @param {number} [o.shapeTerm] - tau, default SHAPE_TERM
 * @param {number} [o.restHz] - the rest frequency, default HI_LINE's
 * @returns {object} a record with status 'ok' or 'refused' (code, reason)
 */
export function tangentPoint(o) {
  const {
    l,
    b = 0,
    frequencyHz,
    temperature,
    r0,
    theta0,
    sigmaTheta0 = 0,
    sigmaV,
    sigmaSigmaV = 0,
    lsr: lsrOption = 'schonrich',
    convention = 'radio',
    sigmaNoise,
    shapeTerm = SHAPE_TERM,
    restHz = HI_LINE.restFrequencyHz,
  } = o;
  if (!(r0 > 0)) return refuseMissing('R0');
  if (!(theta0 > 0)) return refuseMissing('Theta0');
  if (!(sigmaV > 0)) return refuseMissing('the gas dispersion');
  const geometryRefusal = maskRefusal(l, b);
  if (geometryRefusal) return geometryRefusal;
  if (!CONVENTIONS.includes(convention))
    return refusal('convention', `unknown Doppler convention "${convention}"`);

  const n = frequencyHz?.length;
  if (
    !Array.isArray(frequencyHz) ||
    !Array.isArray(temperature) ||
    temperature.length !== n ||
    n < 20 ||
    !frequencyHz.every(Number.isFinite) ||
    !temperature.every(Number.isFinite)
  )
    return refusal(
      'bad-spectrum',
      'the spectrum needs matching finite frequency and temperature arrays of at least 20 channels'
    );
  const inc = frequencyHz[1] > frequencyHz[0];
  for (let i = 1; i < n; i++)
    if (inc ? !(frequencyHz[i] > frequencyHz[i - 1]) : !(frequencyHz[i] < frequencyHz[i - 1]))
      return refusal('bad-spectrum', 'the channels are not in order: frequencies must be strictly monotone');
  if (!frequencyHz.every(f => f > 0))
    return refusal('bad-spectrum', 'frequencies must be positive');

  let lsr;
  try {
    lsr = resolveLsr(lsrOption);
  } catch (e) {
    if (e instanceof RadioError) return refusal(e.code, e.message);
    throw e;
  }
  const lw = wrapLongitude(l);
  const side = sideOf(lw);
  const shift = lsrShift(lw, b, lsr);
  const vHelio = frequencyHz.map(f => velocityFromFrequency(f, { convention, restHz }));
  if (!vHelio.some(v => Math.abs(v) <= 1000))
    return refusal(
      'axis',
      'the frequency axis does not come within 1000 km/s of the rest frequency: it is not an HI spectrum of this line'
    );
  const vLsr = vHelio.map(v => v + shift);

  const edge = terminalEdge({
    velocity: vLsr,
    temperature,
    side,
    sigmaV,
    sigmaNoise,
  });
  if (edge.status !== 'ok') return { ...edge, l: lw, lsr: { ...lsr, shift } };

  const g = tangentGeometry(lw, r0);
  const sinL = Math.abs(Math.sin(lw * DEG));
  const vTerminal = side * edge.xTerminal; // LSR km/s
  const theta = circularSpeedFromTerminal(vTerminal, lw, theta0);
  const terms = {
    noise: edge.sigmaX,
    channel: edge.width / Math.sqrt(12),
    dispersion: edge.cf * sigmaSigmaV,
    shape: shapeTerm * sigmaV,
    theta0: sinL * sigmaTheta0,
  };
  const sigma = Math.sqrt(
    Object.values(terms).reduce((s, t) => s + t * t, 0)
  );
  const alternatives = ['schonrich', 'stromberg', 'none'].map(name => {
    const s2 = lsrShift(lw, b, name);
    return {
      option: name,
      shiftKmS: s2,
      theta: theta + side * (s2 - shift),
    };
  });

  return {
    status: 'ok',
    l: lw,
    b,
    side,
    radiusKpc: g.radius,
    distanceKpc: g.distance,
    radiusSigmaKpc: sinL * (o.sigmaR0 ?? 0),
    theta,
    sigma,
    terms,
    interval68: covarianceInterval(theta, sigma),
    interval95: covarianceInterval(theta, sigma, { level: 0.95 }),
    terminalVelocity: { lsr: vTerminal, frame: 'LSR', convention },
    edge,
    assumed: { r0, theta0, sigmaTheta0, sigmaV, sigmaSigmaV, shapeTerm, restHz },
    lsr: { ...lsr, shift },
    lsrAlternatives: alternatives,
    assumptions: ASSUMPTIONS,
  };
}

/**
 * The tangent-point curve over a set of mask sightlines: {points, refused}.
 * `spectra` is an array of {l, frequencyHz, temperature}; the other options are
 * tangentPoint's. A sightline off the mask or one the rule refuses is listed in
 * `refused` with its code, and does not appear in `points`.
 */
export function tangentCurve(spectra, options) {
  const points = [];
  const refused = [];
  for (const s of spectra) {
    const r = tangentPoint({ ...options, ...s });
    if (r.status === 'ok') points.push(r);
    else refused.push({ l: s.l, code: r.code, reason: r.reason });
  }
  points.sort((p, q) => p.radiusKpc - q.radiusKpc);
  return {
    points,
    refused,
    mask: MASK_LONGITUDES,
    options: { lsrOptions: Object.keys(LSR_OPTIONS), edgeRule: EDGE_RULE },
  };
}
