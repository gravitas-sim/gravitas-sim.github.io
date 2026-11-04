// =============================================================================
// Multi-messenger kernel: constants, vocabulary and the refusal type
// -----------------------------------------------------------------------------
// The speed of light and the parsec are the radiation kernel's (SI exact and the
// IAU 2015 definition); nothing here is a measurement. The vocabulary is the
// point of the module's naming rule: a MESSENGER is a kind of carrier of
// information from the source (gravitational waves, photons, and, not observed
// here, neutrinos and cosmic rays); a BAND is a range of photon energies. Gamma
// rays, optical light and the rest are bands of ONE messenger.
// =============================================================================

import { C_LIGHT, PC_M } from '../radiation/constants.js';

export { C_LIGHT };

/** Metres in a megaparsec (IAU 2015 B2). */
export const MPC_M = 1e6 * PC_M;

/** Seconds in a day of the continuous scale (a UTC day is this long except the day of a leap second). */
export const DAY_S = 86400;

/** The messengers this kernel has events for. Neutrinos and cosmic rays are named so the refusal can say why not. */
export const MESSENGERS = Object.freeze(['gravitational-wave', 'photon']);

/** The bands a photon event may state, from low energy to high. */
export const PHOTON_BANDS = Object.freeze([
  'radio',
  'infrared',
  'optical',
  'ultraviolet',
  'x-ray',
  'gamma',
]);

/** What an event's time is the time OF. A delay between two times is only as meaningful as these definitions. */
export const TIME_DEFINITIONS = Object.freeze([
  'merger-catalogue', // a catalogue's merger (coalescence) time estimate
  'instrument-trigger', // the instant an instrument's trigger algorithm fired
  'onset', // the start of the signal, as an analysis defines it
  'first-detection', // the epoch of the first detection of a source
  'peak', // the epoch of maximum
  'other', // stated in the event's note
]);

/** A refusal with a stable code a caller (or a lesson) can branch on. */
export class MultimessengerError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {object} [detail]
   */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'MultimessengerError';
    this.code = code;
    Object.assign(this, detail);
  }
}

/** Throw a coded refusal. */
export function refuse(code, message, detail) {
  throw new MultimessengerError(code, message, detail);
}

/** A finite number or a refusal. */
export function finite(x, name) {
  if (typeof x !== 'number' || !Number.isFinite(x))
    refuse('not-finite', `${name} must be a finite number`, { name });
  return x;
}
