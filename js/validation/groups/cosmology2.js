// ===========================================================================
// 45. Cosmology II: late-time FLRW depth, closed forms and refusals (Prompt 255)
// ===========================================================================

import * as K from '../../kernels/cosmology/late/index.js';
import {
  C_KMS,
  GYR_PER_INV_H0,
  createCosmology,
} from '../../kernels/cosmology/flrw.js';

/**
 * Run this group's checks (COSMOLOGY_II.md; the full table, with the independent oracle, the seeded
 * ensemble, the degeneracy contours and the legs that wait for an authentic file, is
 * `npm run cosmology2:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Cosmology II: late-time FLRW depth';
  const H0 = 70;
  const dh = C_KMS / H0;
  const g = GYR_PER_INV_H0 / H0;
  const eds = K.createFriedmann({ H0, Om: 1, Ode: 0 });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Einstein-de Sitter at z = 1: the comoving distance is (2c/H0)(1 - 1/sqrt(1 + z))',
    measured: eds.comovingDistance(1),
    expected: 2 * dh * (1 - 1 / Math.sqrt(2)),
    unit: 'Mpc',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'With Om = 1 the integral of dz/E is elementary (the contract leg A1).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Einstein-de Sitter: the age is 2/(3 H0)',
    measured: eds.age(),
    expected: (2 * g) / 3,
    unit: 'Gyr',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'The age integral in the scale factor is 2/3 for a matter-only flat universe (the contract leg A1).',
  });
  const milne = K.createFriedmann({ H0, Om: 0, Or: 0, Ode: 0 });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The empty universe at z = 2: the transverse distance is (c/H0) sinh(ln(1 + z)), curvature radius c/H0',
    measured: milne.transverseComovingDistance(2),
    expected: dh * Math.sinh(Math.log(3)),
    unit: 'Mpc',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'Ok = 1 gives E = 1 + z and the open geometry (the contract leg A2).',
  });
  const OL = 0.7;
  const Om = 0.3;
  const flat = K.createFriedmann({ H0, Om });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Flat Lambda-CDM (0.3, 0.7): the transition redshift is (2 OL/Om)^(1/3) - 1',
    measured: flat.transitionRedshift().z,
    expected: Math.pow((2 * OL) / Om, 1 / 3) - 1,
    unit: '',
    tolerance: 1e-11,
    toleranceKind: 'relative',
    why: 'q = 0 where Om x^3 = 2 OL (the contract leg A6, rule R7).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Flat Lambda-CDM (0.3, 0.7): the age is (2/(3 H0 sqrt(OL))) asinh(sqrt(OL/Om))',
    measured: flat.age(),
    expected: ((2 * g) / (3 * Math.sqrt(OL))) * Math.asinh(Math.sqrt(OL / Om)),
    unit: 'Gyr',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'The closed form of the flat Lambda-CDM age (the contract leg A6).',
  });
  const old = createCosmology({ H0, Om, OL });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The late kernel and the existing flat Lambda-CDM kernel give the same luminosity distance at z = 1',
    measured: flat.luminosityDistance(1),
    expected: old.luminosityDistance(1),
    unit: 'Mpc',
    tolerance: 1e-9,
    toleranceKind: 'relative',
    why: 'The extension adds to flrw.js and does not replace it (the contract leg A9, the delta table).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Lookback time plus the age at redshift z is the age today (two different integrals), z = 3',
    measured: flat.lookbackTime(3) + flat.ageAtRedshift(3),
    expected: flat.age(),
    unit: 'Gyr',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'An identity between the integral in redshift and the integral in the scale factor (the contract leg A8, rule R6).',
  });
  const refusals = [
    () => K.createFriedmann({ H0, Om: 0.05, Ode: 1.6 }),
    () => K.createFriedmann({ H0, Om: -0.1, Ode: 0.7 }),
    () => K.createFriedmann({ H0, Om, w: -3.5 }),
    () => K.createFriedmann({ H0, Om: 0, Or: 0, Ode: 1 }).age(),
  ];
  const codes = [
    'bounce',
    'negative-density',
    'w-out-of-domain',
    'age-unbounded',
  ];
  const got = refusals.map(f => {
    try {
      f();
      return 'accepted';
    } catch (e) {
      return e instanceof K.FriedmannDomainError ? e.code : 'other';
    }
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A bounce, a negative density, w out of range and a de Sitter age are each refused with their own code',
    measured: got.every((c, i) => c === codes[i]) ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The kernel never returns a number for a set outside the validated domain (the contract legs D1, D2, D3, D6, rules R3, R4, R6).',
  });
}
