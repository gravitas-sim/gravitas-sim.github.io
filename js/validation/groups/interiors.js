// ===========================================================================
// 35. Interiors: bulk properties of the planets from mass and radius
// ===========================================================================

import * as K from '../../kernels/interiors/index.js';

/**
 * Run this group's checks (INTERIORS.md; the full table, with the independent
 * oracle, is `npm run interiors:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const earth = K.bulkOf('earth');
  const jupiter = K.bulkOf('jupiter');
  const uranus = K.bulkOf('uranus');

  add({
    group: 'Interiors',
    kind: 'data',
    name: 'Earth’s bulk density from its GM and volumetric mean radius against the fact sheet',
    measured: earth.density.value,
    expected: 5514,
    unit: 'kg m-3',
    tolerance: 0.01,
    source:
      'IAU radii and JPL GM against the NASA Planetary Fact Sheet (all typed)',
    why: 'Density is mass over volume; the mass comes from GM and the Newtonian constant, so its error is carried in the stated uncertainty.',
  });

  add({
    group: 'Interiors',
    kind: 'analytic',
    name: 'Surface gravity GM / R^2 and escape speed sqrt(2 GM / R) are tied by v^2 = 2 g R',
    measured:
      earth.escapeSpeed.value ** 2 /
      (2 * earth.gravity.value * (6378.137 * 1e3)),
    expected: 1,
    unit: '',
    tolerance: 1e-12,
    why: 'Both are closed forms of GM and R; they need no gravitational constant.',
  });

  add({
    group: 'Interiors',
    kind: 'analytic',
    name: 'Density alone cannot separate Jupiter from Uranus: they differ by under 5 percent',
    measured: Math.abs(jupiter.density.value / uranus.density.value - 1),
    expected: 0,
    unit: '',
    tolerance: 0.05,
    why: 'Hydrogen and helium and water ice give the same bulk density here, so the density classes do not split the volatile-rich bodies.',
  });

  add({
    group: 'Interiors',
    kind: 'analytic',
    name: 'The first-order density uncertainty equals the quadrature of GM, G and 3 R errors',
    measured: K.bulkDensity({
      gm: 398600.4418,
      radius: 6371.008,
      sigma: { gm: 0.0008, radius: 0.01 },
    }).sigma,
    expected:
      earth.density.value *
      Math.hypot(0.0008 / 398600.4418, K.G_SIGMA / K.G, (3 * 0.01) / 6371.008),
    unit: 'kg m-3',
    tolerance: 1e-12,
    why: 'Uncorrelated first-order propagation of a product of powers; the constant’s error is the larger term for Earth.',
  });
}
