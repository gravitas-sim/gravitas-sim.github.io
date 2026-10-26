// ===========================================================================
// 34. Atmospheres: energy balance, two greenhouse models and the scale height
// ===========================================================================

import * as K from '../../kernels/atmospheres/index.js';

/**
 * Run this group's checks (ATMOSPHERES.md; the full table, with the
 * independent oracle, is `npm run atmospheres:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const earth = K.compareWithMeasured('earth');
  const venus = K.compareWithMeasured('venus');

  add({
    group: 'Atmospheres',
    kind: 'data',
    name: 'Earth’s equilibrium temperature against the textbook value',
    measured: earth.emissionK,
    expected: 255,
    unit: 'K',
    tolerance: 0.02,
    source:
      'Bond albedo 0.306 and the solar constant at 1 AU (NASA Planetary Fact Sheet, typed)',
    why: 'The temperature of a black body that radiates what the planet absorbs, not a surface temperature; textbooks round it to 255 K.',
  });

  add({
    group: 'Atmospheres',
    kind: 'analytic',
    name: 'No heat carried to the night side is hotter than uniform redistribution by (8/3)^(1/4)',
    measured:
      K.equilibriumTemperature({
        flux: 1361,
        bondAlbedo: 0.3,
        redistribution: 0,
      }).temperature /
      K.equilibriumTemperature({
        flux: 1361,
        bondAlbedo: 0.3,
        redistribution: 1,
      }).temperature,
    expected: (8 / 3) ** 0.25,
    unit: '',
    tolerance: 1e-12,
    why: 'The redistribution factor is 2/3 with none and 1/4 with all (Cowan and Agol 2011); a closed form.',
  });

  add({
    group: 'Atmospheres',
    kind: 'analytic',
    name: 'One layer of emissivity 1 warms the ground to 2^(1/4) times the emission temperature',
    measured:
      K.oneLayer({ emissionTemperature: 255, emissivity: 1 }).surface / 255,
    expected: 2 ** 0.25,
    unit: '',
    tolerance: 1e-12,
    why: 'The ceiling of the one-layer model; no emissivity reaches more.',
  });

  add({
    group: 'Atmospheres',
    kind: 'analytic',
    name: 'The one-layer model refuses Venus: the ratio of its surface to emission temperature is above 2^(1/4)',
    measured: Number(
      K.oneLayerEmissivityFor(venus.ratio).refused === true &&
        venus.ratio > K.ONE_LAYER_MAX_RATIO
    ),
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'A model that returns no number when the planet is outside its domain, with the reason; the grey model needs an optical depth near 142.',
  });

  add({
    group: 'Atmospheres',
    kind: 'analytic',
    name: 'The grey optical depth fitted to Venus reproduces its surface temperature',
    measured: K.greyGround({
      emissionTemperature: venus.emissionK,
      tauSurface: K.greyDepthFor(venus.ratio).tauSurface,
    }).ground,
    expected: K.BODIES.venus.measuredK,
    unit: 'K',
    tolerance: 1e-9,
    why: 'The fit inverts the closed form T_g^4 = T_e^4 (1 + 3 tau / 4); one number fitted to one measurement.',
  });

  add({
    group: 'Atmospheres',
    kind: 'approximation',
    name: 'The Eddington profile is warm at the top of the atmosphere by the exact grey solution’s margin',
    measured:
      K.greyTemperature({ emissionTemperature: 1, tau: 0 }).temperature /
        K.greyTemperatureExact({ emissionTemperature: 1, tau: 0 }).temperature -
      1,
    expected: ((2 / 3) * Math.sqrt(3)) ** 0.25 - 1,
    unit: '',
    tolerance: 0.01,
    why: 'The model’s stated error against the Milne solution (q(0) = 1/sqrt(3)): 3.66 percent, shown to students, not minimised.',
  });

  add({
    group: 'Atmospheres',
    kind: 'data',
    name: 'Earth’s scale height at its surface temperature against the fact sheet',
    measured:
      K.scaleHeight({
        temperature: K.BODIES.earth.measuredK,
        meanMolecularWeight: K.BODIES.earth.mu,
        gravity: K.BODIES.earth.g,
      }).height / 1000,
    expected: 8.5,
    unit: 'km',
    tolerance: 0.05,
    source: 'NASA Planetary Fact Sheet (typed)',
    why: 'An isothermal, hydrostatic atmosphere; real atmospheres change temperature with height, so the agreement is to a few percent.',
  });
}
