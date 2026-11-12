// =============================================================================
// Radio kernel: the 21-cm line, the Doppler scale and the refusal type
// -----------------------------------------------------------------------------
// h, c and k are the radiation kernel's (exact SI definitions). The two atomic
// constants of the hydrogen hyperfine line are the only numbers in this kernel
// that are physical measurements, and they are held here and nowhere else:
// HI_LINE.status says what is known about them (RADIO.md, "Open questions").
// Every other number the kernel uses is a definition, a choice stated where it
// is made, or computed.
//
// Pure: no DOM, no clock.
// =============================================================================

import {
  C_LIGHT,
  H_PLANCK,
  K_BOLTZMANN,
  PC_M,
} from '../radiation/constants.js';

export { C_LIGHT, H_PLANCK, K_BOLTZMANN };

/** The speed of light in km/s (exact). */
export const C_KMS = C_LIGHT / 1000;

/** Centimetres in a kiloparsec (IAU 2015 parsec). */
export const KPC_CM = PC_M * 1e3 * 100;

/**
 * The hydrogen hyperfine ("21-cm") line. restFrequencyHz is the frequency of the
 * transition in vacuum; spinFlipRateS is the Einstein A coefficient of the
 * upper level. status is the provenance: these two values are constants of
 * physics supplied without a source file in this tree, and they were not
 * verified by a fetch. A question for Carl: supply the source (RADIO.md).
 */
export const HI_LINE = Object.freeze({
  restFrequencyHz: 1420405751.768,
  spinFlipRateS: 2.8843e-15,
  status:
    'no source file in the tree; not verified by a fetch; the source is still to be supplied (RADIO.md)',
});

/** A refusal: a code the callers and tests switch on, and a reason in words. */
export class RadioError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'RadioError';
    this.code = code;
    this.detail = detail;
  }
}

/** Throw a RadioError. */
export function refuse(code, message, detail) {
  throw new RadioError(code, message, detail);
}

/** A finite number, or a refusal naming it. */
export function finite(x, name) {
  if (typeof x !== 'number' || !Number.isFinite(x))
    refuse('bad-argument', `${name} must be a finite number`, { name, x });
  return x;
}

/** A refusal record, for the functions that return one instead of throwing. */
export const refusal = (code, reason, extra = {}) => ({
  status: 'refused',
  code,
  reason,
  ...extra,
});

/** The Doppler conventions of radio astronomy and optics. */
export const CONVENTIONS = Object.freeze(['radio', 'optical', 'relativistic']);

/**
 * A velocity (km/s, positive receding) from an observed frequency, in a
 * convention. radio: v = c (1 - f / f0); optical: v = c (f0 / f - 1);
 * relativistic: v = c (f0^2 - f^2) / (f0^2 + f^2). The radio convention is the
 * one HI surveys use; the three agree to first order in v / c.
 * @param {number} frequencyHz
 * @param {{convention?: string, restHz?: number}} [o]
 */
export function velocityFromFrequency(frequencyHz, o = {}) {
  const f0 = o.restHz ?? HI_LINE.restFrequencyHz;
  const conv = o.convention ?? 'radio';
  const f = frequencyHz;
  if (!(f > 0)) refuse('bad-argument', 'a frequency must be positive');
  if (conv === 'radio') return C_KMS * (1 - f / f0);
  if (conv === 'optical') return C_KMS * (f0 / f - 1);
  if (conv === 'relativistic')
    return (C_KMS * (f0 * f0 - f * f)) / (f0 * f0 + f * f);
  return refuse('convention', `unknown Doppler convention "${conv}"`, {
    allowed: CONVENTIONS,
  });
}

/**
 * The frequency (Hz) that a velocity (km/s) has in a convention; the inverse of
 * velocityFromFrequency.
 */
export function frequencyFromVelocity(velocityKmS, o = {}) {
  const f0 = o.restHz ?? HI_LINE.restFrequencyHz;
  const conv = o.convention ?? 'radio';
  const b = velocityKmS / C_KMS;
  if (conv === 'radio') return f0 * (1 - b);
  if (conv === 'optical') return f0 / (1 + b);
  if (conv === 'relativistic') return f0 * Math.sqrt((1 - b) / (1 + b));
  return refuse('convention', `unknown Doppler convention "${conv}"`, {
    allowed: CONVENTIONS,
  });
}
