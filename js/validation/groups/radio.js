// ===========================================================================
// 39. The HI spectroscopy kernel: the Doppler scale, the LSR transform, the tangent point and the column density (Prompt 241)
// ===========================================================================

import * as K from '../../kernels/radio/index.js';

/**
 * Run this group's checks (RADIO.md; the full table, with the independent oracle, the coverage ensembles and the
 * legs that wait for authentic files, is `npm run radio:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'HI spectroscopy';

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A frequency 100 km/s of radio velocity below the 21-cm rest frequency reads back as +100 km/s (receding)',
    measured: K.velocityFromFrequency(K.frequencyFromVelocity(100)),
    expected: 100,
    unit: 'km/s',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'The radio convention v = c (1 - f / f0) and its inverse; a double at 1.4e9 Hz resolves 2.4e-7 Hz, which is 5e-11 km/s, so 1e-9 km/s is the finest bound the pair can meet (the contract leg A1 states the relative 1e-12 that it cannot).',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: "The LSR shift toward l = 90 degrees in the plane is the Sun's V, 12.24 km/s in the Schonrich, Binney and Dehnen option",
    measured: K.lsrShift(90, 0, 'schonrich'),
    expected: 12.24,
    unit: 'km/s',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'v_LSR = v_helio + (U cos l + V sin l) cos b + W sin b; at l = 90, b = 0 only V remains. The option is the one of D-GAIA-03.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The terminal velocity of a flat rotation curve at l = 30 degrees is Theta0 (1 - sin 30) = 110 km/s for Theta0 = 220 km/s',
    measured: K.terminalVelocity({
      l: 30,
      curve: () => 220,
      r0: 8,
      theta0: 220,
    }),
    expected: 110,
    unit: 'km/s',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'At the tangent point R = R0 sin l, Theta(R) = Theta0, and v = Theta0 (R0 / R - 1) sin l = Theta0 (1 - sin l).',
  });

  const narrow = K.generateSpectrum({
    l: 40,
    curveName: 'rising',
    sigmaV: 0.5,
    channels: 5001,
    widthKmS: 0.1,
  });
  const found = K.tangentPoint({
    l: 40,
    frequencyHz: narrow.frequencyHz,
    temperature: narrow.temperature,
    r0: 8,
    theta0: 220,
    sigmaV: 0.5,
    sigmaNoise: 0,
    lsr: 'schonrich',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The circular speed at the tangent radius is recovered from a noise-free narrow-line synthetic spectrum (l = 40, a rising curve, gas dispersion 0.5 km/s) within 0.3 km/s',
    measured: found.status === 'ok' ? found.theta : NaN,
    expected: narrow.truth.circularSpeedAtTangent,
    unit: 'km/s',
    tolerance: 0.3,
    toleranceKind: 'absolute',
    why: 'The edge rule (half the peak, less the computed offset of a Gaussian-smoothed tangent edge) on a spectrum whose truth the generator states; the bound is the committed A7 bound.',
  });

  const thin = K.generateSpectrum({ l: 30, curveName: 'flat', sigmaV: 5 });
  const column = K.columnDensityThin({
    velocity: thin.velocityHelio,
    temperature: thin.temperature,
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The thin column density from the integrated line equals the column of gas the generator put on the sightline',
    measured: column.columnCm2 / thin.truth.columnCm2,
    expected: 1,
    unit: '',
    tolerance: 2e-4,
    toleranceKind: 'absolute',
    why: 'N = 32 pi k nu0^2 / (3 h c^3 A10) times the integral of T dv inverts the thin forward model to the quadrature of the sightline; the bound is the committed A5 bound.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A sightline at l = 100 degrees has no tangent point and is refused by code, with no circular speed',
    measured:
      K.maskRefusal(100, 0)?.code === 'no-tangent-point' &&
      K.tangentPoint({
        l: 100,
        frequencyHz: thin.frequencyHz,
        temperature: thin.temperature,
        r0: 8,
        theta0: 220,
        sigmaV: 5,
      }).theta === undefined
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'Outside the solar circle the galactocentric radius only grows along the line, so no velocity is the extreme of a circular rotation; the method refuses rather than return a number.',
  });
}
