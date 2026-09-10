// =============================================================================
// Leading-order gravitational waveforms from a quasi-circular inspiral
// -----------------------------------------------------------------------------
// Pure functions over numbers. No DOM, no state, no clock. Everything here is
// closed form, which is the whole design: the display arrays, the audio buffer
// and the schematic source view are all *evaluations of the same functions at
// their own sample rates* rather than three loops that have to be kept in step.
// That is what makes "one canonical timeline" a structural property instead of
// a promise, and it is why there is no code path in which an audio buffer can
// be filled from an animation frame.
//
// What this is
// -----------------------------------------------------------------------------
// The quadrupole ("Newtonian", 0PN) inspiral of two point masses on circular
// orbits: no spin, no eccentricity, no tides, no higher post-Newtonian terms,
// no merger, no ringdown. It is terminated at the Schwarzschild innermost
// stable circular orbit of the total mass and never extrapolated past it.
//
// Peters (1964), Phys. Rev. 136, B1224 for the decay; Maggiore, Gravitational
// Waves Vol. 1 (2008) sections 4.1.2-4.1.3 for the closed forms below;
// Sathyaprakash and Schutz, Living Rev. Rel. 12, 2 (2009) for the detector
// conventions. GRAVITATIONAL_WAVES.md records the scope in full, including
// what the interface is required to say about it.
//
// What this is not
// -----------------------------------------------------------------------------
// It is not the sandbox. js/physics.js spirals a binary in with
// `orbit_decay_rate`, a damping constant chosen so that a merger happens while
// somebody is watching, and js/audio.js quantizes orbital frequency onto a
// pentatonic scale. Both are illustrative and both stay that way. Nothing in
// this file reads either of them, and nothing in either of them reads this.
// =============================================================================

/** Speed of light, m/s. Exact by definition. */
export const C = 299792458;

/** Newtonian constant of gravitation, m^3 kg^-1 s^-2. CODATA 2018. */
export const G = 6.6743e-11;

/**
 * One solar mass in seconds: G Msun / c^3.
 *
 * The natural unit for everything below. Frequencies, times and separations
 * all come out of products of this with dimensionless numbers, which keeps a
 * 30-solar-mass black hole and a 1.4-solar-mass neutron star on the same
 * arithmetic instead of on two sets of magic constants.
 */
export const T_SUN = 4.925490947e-6;

/** One solar mass in metres: G Msun / c^2. */
export const L_SUN = T_SUN * C;

/** One megaparsec in metres. IAU 2015 definition of the parsec. */
export const MPC = 3.085677581491367e22;

/**
 * The chirp mass, in the same units as its arguments.
 *
 * The one combination the leading-order waveform actually depends on: two
 * binaries with the same chirp mass and different mass ratios produce the same
 * inspiral to this order, which is a fact the lesson makes a student measure
 * rather than a limitation to apologise for.
 *
 * @param {number} m1 - One component mass
 * @param {number} m2 - The other
 * @returns {number} (m1 m2)^(3/5) / (m1 + m2)^(1/5), or NaN if either is not positive
 */
export function chirpMass(m1, m2) {
  if (!(m1 > 0) || !(m2 > 0)) return NaN;
  return Math.pow(m1 * m2, 0.6) / Math.pow(m1 + m2, 0.2);
}

/**
 * The symmetric mass ratio, 0 < eta <= 0.25.
 *
 * Not used by the leading-order waveform. Reported because it is what says how
 * far from equal the masses are, and because 0.25 exactly is the equal-mass
 * case a student should be able to recognise.
 *
 * @param {number} m1 - One component mass
 * @param {number} m2 - The other
 * @returns {number} m1 m2 / (m1 + m2)^2
 */
export function symmetricMassRatio(m1, m2) {
  if (!(m1 > 0) || !(m2 > 0)) return NaN;
  const m = m1 + m2;
  return (m1 * m2) / (m * m);
}

/**
 * The gravitational-wave frequency at the Schwarzschild innermost stable
 * circular orbit of a body with the binary's total mass.
 *
 * 4397.05 Hz for one solar mass, and inversely proportional to the total mass
 * after that. This is where the model stops. For a 65-solar-mass binary it is
 * 67.7 Hz, which is *not* a bug: an inspiral-only model covers almost none of
 * what a detector sees from a heavy binary black hole, and the lesson is
 * partly about discovering that.
 *
 * @param {number} totalMassSun - m1 + m2, solar masses
 * @returns {number} Hz
 */
export function iscoFrequency(totalMassSun) {
  if (!(totalMassSun > 0)) return NaN;
  return 1 / (Math.pow(6, 1.5) * Math.PI * totalMassSun * T_SUN);
}

/**
 * The orbital velocity parameter, v/c = (pi G M f / c^3)^(1/3).
 *
 * The honest measure of how much trouble the approximation is in: the
 * post-Newtonian corrections that have been dropped enter at relative order
 * (v/c)^2, so this number squared is roughly the fractional error. It is
 * 1/sqrt(6) = 0.408 at the innermost stable circular orbit.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} totalMassSun - m1 + m2, solar masses
 * @returns {number} Dimensionless, v/c
 */
export function velocityParameter(freqHz, totalMassSun) {
  if (!(freqHz > 0) || !(totalMassSun > 0)) return NaN;
  return Math.cbrt(Math.PI * freqHz * totalMassSun * T_SUN);
}

/**
 * How much time is left before coalescence when the wave is at a frequency.
 *
 * Inverts f(tau). Diverges as f -> 0, which is correct: a binary far enough
 * out radiates for longer than the age of the Universe.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} chirpMassSun - Chirp mass, solar masses
 * @returns {number} Seconds until coalescence
 */
export function timeToCoalescence(freqHz, chirpMassSun) {
  if (!(freqHz > 0) || !(chirpMassSun > 0)) return NaN;
  const theta = chirpMassSun * T_SUN;
  return (
    (5 / 256) * Math.pow(theta, -5 / 3) * Math.pow(Math.PI * freqHz, -8 / 3)
  );
}

/**
 * The gravitational-wave frequency a given time before coalescence.
 *
 *   f(tau) = (1/pi) (5 / 256 tau)^(3/8) (G Mc / c^3)^(-5/8)
 *
 * @param {number} tauSeconds - Time remaining until coalescence
 * @param {number} chirpMassSun - Chirp mass, solar masses
 * @returns {number} Hz
 */
export function frequencyAt(tauSeconds, chirpMassSun) {
  if (!(tauSeconds > 0) || !(chirpMassSun > 0)) return NaN;
  const theta = chirpMassSun * T_SUN;
  return (
    (1 / Math.PI) *
    Math.pow(5 / (256 * tauSeconds), 3 / 8) *
    Math.pow(theta, -5 / 8)
  );
}

/**
 * The accumulated gravitational-wave phase, measured back from coalescence.
 *
 *   Phi(tau) = -2 (tau / 5 (G Mc / c^3))^(5/8)
 *
 * Zero at coalescence and increasingly negative before it, so the phase
 * *increases* as the binary approaches merger, which is the direction a reader
 * expects a phase to run.
 *
 * @param {number} tauSeconds - Time remaining until coalescence
 * @param {number} chirpMassSun - Chirp mass, solar masses
 * @returns {number} Radians
 */
export function phaseAt(tauSeconds, chirpMassSun) {
  if (!(tauSeconds >= 0) || !(chirpMassSun > 0)) return NaN;
  const theta = chirpMassSun * T_SUN;
  return -2 * Math.pow(tauSeconds / (5 * theta), 5 / 8);
}

/**
 * How many wave cycles remain when the wave is at a frequency.
 *
 * Exactly (8/5) f tau at this order, which is worth knowing as a check: 24
 * cycles for a heavy binary black hole from 20 Hz, about five thousand for a
 * pair of neutron stars.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} chirpMassSun - Chirp mass, solar masses
 * @returns {number} Cycles
 */
export function cyclesRemaining(freqHz, chirpMassSun) {
  const tau = timeToCoalescence(freqHz, chirpMassSun);
  if (!Number.isFinite(tau)) return NaN;
  return 1.6 * freqHz * tau;
}

/**
 * The strain amplitude prefactor, before the inclination factors.
 *
 *   A(f) = (4/D) (G Mc / c^2)^(5/3) (pi f / c)^(2/3)
 *
 * Dimensionless, and exactly inversely proportional to distance at fixed
 * detector-frame masses. The masses are detector-frame throughout; no
 * cosmology is assumed anywhere in this module.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} chirpMassSun - Chirp mass, solar masses
 * @param {number} distanceMpc - Luminosity distance, megaparsecs
 * @returns {number} Dimensionless strain amplitude
 */
export function strainAmplitude(freqHz, chirpMassSun, distanceMpc) {
  if (!(freqHz > 0) || !(chirpMassSun > 0) || !(distanceMpc > 0)) return NaN;
  const mMetres = chirpMassSun * L_SUN;
  return (
    (4 / (distanceMpc * MPC)) *
    Math.pow(mMetres, 5 / 3) *
    Math.pow((Math.PI * freqHz) / C, 2 / 3)
  );
}

/**
 * The two inclination factors.
 *
 * (1 + cos^2 i)/2 for the plus polarization, cos i for the cross. Face-on
 * (i = 0) gives 1 and 1; edge-on (i = 90 degrees) gives 0.5 and 0, which is
 * why an edge-on binary is quieter *and* linearly polarized.
 *
 * @param {number} inclinationRad - Angle between the orbital angular momentum
 *   and the line of sight, radians
 * @returns {{plus: number, cross: number}} The two factors
 */
export function inclinationFactors(inclinationRad) {
  const c = Math.cos(inclinationRad);
  return { plus: (1 + c * c) / 2, cross: c };
}

/**
 * The distance a single optimally-oriented detector would infer from the
 * amplitude alone.
 *
 *   D_eff = D / ((1 + cos^2 i) / 2)
 *
 * The reason amplitude does not determine distance: a face-on binary at
 * 2D produces the same detector strain as an edge-on one at D. With the source
 * overhead and the polarization angle zero, F_plus = 1 and F_cross = 0, so the
 * detector sees h_plus and this is the whole degeneracy.
 *
 * @param {number} distanceMpc - True luminosity distance, megaparsecs
 * @param {number} inclinationRad - Inclination, radians
 * @returns {number} Effective distance, megaparsecs
 */
export function effectiveDistance(distanceMpc, inclinationRad) {
  const { plus } = inclinationFactors(inclinationRad);
  if (!(plus > 0)) return Infinity;
  return distanceMpc / plus;
}

/**
 * Orbital separation from the wave frequency, by Kepler's third law.
 *
 *   a = c (G M / c^3)^(1/3) / (pi f)^(2/3)
 *
 * The wave frequency is twice the orbital frequency for the dominant mode, so
 * the orbital angular frequency is pi f. Used only to drive the schematic
 * source view, which is labelled schematic wherever it is drawn.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} totalMassSun - m1 + m2, solar masses
 * @returns {number} Separation, metres
 */
export function separationMetres(freqHz, totalMassSun) {
  if (!(freqHz > 0) || !(totalMassSun > 0)) return NaN;
  const tm = totalMassSun * T_SUN;
  return (C * Math.cbrt(tm)) / Math.pow(Math.PI * freqHz, 2 / 3);
}

/**
 * The same separation in Schwarzschild radii of the total mass.
 *
 *   a / Rs = 1 / (2 (v/c)^2)
 *
 * Exactly 3 at the innermost stable circular orbit, which is the check worth
 * remembering, and the quantity the published GW150914 figure-2 data is in.
 *
 * @param {number} freqHz - Gravitational-wave frequency, Hz
 * @param {number} totalMassSun - m1 + m2, solar masses
 * @returns {number} Separation in Schwarzschild radii
 */
export function separationInSchwarzschildRadii(freqHz, totalMassSun) {
  const v = velocityParameter(freqHz, totalMassSun);
  if (!(v > 0)) return NaN;
  return 1 / (2 * v * v);
}

/**
 * How far the approximation can be trusted at a given velocity parameter.
 *
 * A band rather than a number, because there is no frequency at which the
 * dropped terms switch from harmless to fatal. The thresholds are stated in
 * GRAVITATIONAL_WAVES.md and shown in the lab beside the number itself, so a
 * student sees the approximation degrading rather than being told it is fine
 * right up to the point where it stops.
 *
 * @param {number} vOverC - From velocityParameter()
 * @returns {'good'|'fair'|'poor'|'unknown'} Which band it falls in
 */
export function fidelityBand(vOverC) {
  if (!Number.isFinite(vOverC) || vOverC <= 0) return 'unknown';
  if (vOverC < 0.2) return 'good';
  if (vOverC < 0.3) return 'fair';
  return 'poor';
}
