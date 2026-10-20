// ===========================================================================
// 9. Radial velocity
// ===========================================================================

import { REF } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ observables, exoSystems, add }) {
  const params = exoSystems.observableParams(exoSystems.HD209458);
  const K = observables.radialVelocitySemiAmplitude(params);

  add({
    group: 'Radial velocity',
    kind: 'data',
    name: 'HD 209458 b semi-amplitude from stored parameters',
    measured: K,
    expected: REF.hd209458SemiAmplitudeMs,
    unit: 'm/s',
    tolerance: 3e-2,
    why: 'Computed from the stored mass, period and inclination, compared against the measured semi-amplitude in the discovery-era literature. Published values span 82.7 to 84.7 m/s depending on the dataset, a 2% spread; 3% is that spread plus a little, and it is far tighter than the factor of two a semi-amplitude/full-amplitude confusion would produce.',
    source: 'Naef et al. (2004) A&A 414, 351; Mazeh et al. (2000) ApJ 532, L55',
  });

  const sunJupiter = exoSystems.observableParams(exoSystems.SUN_JUPITER);
  add({
    group: 'Radial velocity',
    kind: 'data',
    name: "The Sun's reflex semi-amplitude from Jupiter",
    measured: observables.radialVelocitySemiAmplitude(sunJupiter),
    expected: REF.sunJupiterSemiAmplitudeMs,
    unit: 'm/s',
    tolerance: 3e-2,
    why: 'The canonical contrast case: 12.5 m/s, usually quoted to two or three figures. 3% covers the range of quoted values.',
    source: 'Lovis & Fischer (2010), Exoplanets, ed. Seager',
  });

  add({
    group: 'Radial velocity',
    kind: 'analytic',
    name: 'K scales as sin i',
    measured:
      observables.radialVelocitySemiAmplitude({
        ...params,
        inclinationDeg: 30,
      }) /
      observables.radialVelocitySemiAmplitude({
        ...params,
        inclinationDeg: 90,
      }),
    expected: 0.5,
    unit: '',
    tolerance: 1e-12,
    why: 'sin 30 = 1/2 exactly. The point of the check is that the inclination enters the amplitude and nothing else.',
  });

  add({
    group: 'Radial velocity',
    kind: 'analytic',
    name: 'A face-on orbit produces no radial-velocity signal',
    measured: observables.radialVelocitySemiAmplitude({
      ...params,
      inclinationDeg: 0,
    }),
    expected: 0,
    unit: 'm/s',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'The blind spot of the method, and the reason a transit is worth so much: it pins sin i near 1.',
  });

  add({
    group: 'Radial velocity',
    kind: 'analytic',
    name: 'K rises as the eccentricity does, by 1/sqrt(1-e^2)',
    measured:
      observables.radialVelocitySemiAmplitude({
        ...params,
        eccentricity: 0.5,
      }) /
      observables.radialVelocitySemiAmplitude({ ...params, eccentricity: 0 }),
    expected: 1 / Math.sqrt(1 - 0.25),
    unit: '',
    tolerance: 1e-12,
    why: 'The eccentricity factor in the standard relation, isolated.',
  });

  // Inverting the relation must return what went into it.
  const minMass = observables.minimumPlanetMass({
    semiAmplitudeMs: observables.radialVelocitySemiAmplitude({
      ...params,
      inclinationDeg: 90,
    }),
    starMassSolar: params.starMassSolar,
    periodDays: params.periodDays,
    eccentricity: params.eccentricity,
  });
  add({
    group: 'Radial velocity',
    kind: 'analytic',
    name: 'Minimum mass inverts the semi-amplitude relation',
    measured: minMass,
    expected: params.planetMassJupiter,
    unit: 'Jupiter masses',
    tolerance: 1e-6,
    why: "The planet mass appears on both sides of the relation, so the inverse is solved by fixed-point iteration. Four passes is far more than a planetary-mass companion needs; the residual is the iteration's own convergence, not physics.",
  });

  add({
    group: 'Radial velocity',
    kind: 'analytic',
    name: 'Doppler shift is v/c times the rest wavelength',
    measured: observables.dopplerShiftNm(K, 656.281),
    expected: (656.281 * K) / REF.c,
    unit: 'nm',
    tolerance: 1e-12,
    why: 'Non-relativistic, which at 84 m/s is exact to more digits than any spectrograph delivers: the first relativistic correction is (v/c)^2 = 8e-14.',
  });
}
