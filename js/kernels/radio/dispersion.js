// =============================================================================
// Pulsar kernel: the dispersion delay, the sweep across a band and the smearing
// -----------------------------------------------------------------------------
//   delay      DERIVED: t(f, DM) = K DM / f^2, relative to infinite frequency
//   sweep      DERIVED: t(f1) - t(f2), positive for f1 < f2 (low frequencies late)
//   dmFromSweep DERIVED: the DM that makes a measured sweep, DM = sweep / (K (1/f1^2 - 1/f2^2))
//   smearing   DERIVED: the delay across one channel of width df at f,
//              K DM (1/(f - df/2)^2 - 1/(f + df/2)^2) = 2 K DM df / f^3 / (1 - x^2)^2
//              with x = df / (2 f); the leading term is the usual 2 K DM df / f^3
//
// Frequencies are in MHz unless `unit` says 'Hz' or 'GHz'. DM is in pc/cm^3. All
// times are seconds. Assumes cold, unmagnetised plasma, a pulse much narrower
// than the delay's variation within one channel is NOT assumed (that is the
// smearing). Pure: no DOM, no clock.
// =============================================================================

import { refuse, finite } from './constants.js';
import { DISPERSION_CONSTANT } from './pulsarConstants.js';

const TO_MHZ = Object.freeze({ MHz: 1, Hz: 1e-6, GHz: 1e3 });

/** A frequency in MHz, or a refusal naming the problem. */
export function toMHz(f, unit = 'MHz') {
  const scale = TO_MHZ[unit];
  if (scale === undefined)
    refuse('bad-argument', `unknown frequency unit "${unit}"`, {
      allowed: Object.keys(TO_MHZ),
    });
  finite(f, 'frequency');
  const mhz = f * scale;
  if (!(mhz > 0)) refuse('bad-argument', 'a frequency must be positive', { f });
  return mhz;
}

function checkDm(dm) {
  finite(dm, 'the dispersion measure');
  if (dm < 0)
    refuse('bad-argument', 'a dispersion measure cannot be negative', { dm });
  return dm;
}

/**
 * The arrival delay of a pulse at frequency f relative to infinite frequency.
 * @param {number} f
 * @param {number} dm - pc/cm^3
 * @param {{unit?: 'MHz'|'Hz'|'GHz', constant?: number}} [o]
 * @returns {number} seconds
 */
export function dispersionDelay(f, dm, o = {}) {
  const fm = toMHz(f, o.unit);
  checkDm(dm);
  return ((o.constant ?? DISPERSION_CONSTANT) * dm) / (fm * fm);
}

/** The delay of the lower frequency f1 behind the higher f2 (seconds, positive if f1 < f2). */
export function dispersionSweep(f1, f2, dm, o = {}) {
  const a = toMHz(f1, o.unit);
  const b = toMHz(f2, o.unit);
  checkDm(dm);
  return (o.constant ?? DISPERSION_CONSTANT) * dm * (1 / (a * a) - 1 / (b * b));
}

/** The dispersion measure that produces a measured sweep between two frequencies. */
export function dmFromSweep(f1, f2, sweepS, o = {}) {
  const a = toMHz(f1, o.unit);
  const b = toMHz(f2, o.unit);
  finite(sweepS, 'the sweep');
  if (a === b)
    refuse(
      'not-constrained',
      'two equal frequencies cannot give a dispersion measure: the delay between them is zero for any DM'
    );
  return (
    sweepS / ((o.constant ?? DISPERSION_CONSTANT) * (1 / (a * a) - 1 / (b * b)))
  );
}

/**
 * The smearing across one channel: the spread of arrival times within a channel of
 * width df centred on f. `exact` is the difference of the delays at its edges;
 * `leading` is 2 K DM df / f^3.
 */
export function smearing(f, df, dm, o = {}) {
  const fm = toMHz(f, o.unit);
  const w = toMHz(df, o.unit);
  checkDm(dm);
  if (!(w < 2 * fm))
    refuse('bad-argument', 'a channel must be narrower than twice its centre');
  const K = o.constant ?? DISPERSION_CONSTANT;
  const lo = fm - w / 2;
  const hi = fm + w / 2;
  const exact = K * dm * (1 / (lo * lo) - 1 / (hi * hi));
  const leading = (2 * K * dm * w) / (fm * fm * fm);
  return { exact, leading, ratio: leading / exact };
}
