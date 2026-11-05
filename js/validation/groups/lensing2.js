// ===========================================================================
// 44. Lensing II: the mass inside an Einstein radius, image inversions, the arc radius and the refusals (Prompt 251)
// ===========================================================================

import * as K from '../../kernels/lensing/enclosed/index.js';
import { ARCSEC, massFromEinstein } from '../../kernels/lensing/index.js';
import { C_SI, G_SI } from '../../constants.js';

/**
 * Run this group's checks (LENSING_II.md; the full table, with the independent oracle, the coverage
 * ensembles and the legs that wait for authentic files, is `npm run lensing2:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Lensing II: enclosed mass, images and arcs';
  const cosmology = { H0: 70, Om: 0.3, OL: 0.7 };
  const d = K.lensDistances({ zl: 0.3, zs: 1, cosmology });
  const thetaE = 3.2 * ARCSEC;
  const closed =
    (C_SI * C_SI * thetaE * thetaE * d.dl * d.ds) / (4 * G_SI * d.dls);

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The mass inside a 3.2 arcsec Einstein radius at z_l = 0.3, z_s = 1 equals c^2 theta_E^2 D_l D_s / (4 G D_ls)',
    measured: K.enclosedMass(thetaE, d.dl, d.ds, d.dls),
    expected: closed,
    unit: 'kg',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'The mean convergence inside the Einstein radius is one, so the mass is pi Sigma_cr (theta_E D_l)^2 whatever the profile (the contract legs A1, A2, rule R2).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The same mass through the existing point-mass form (massFromEinstein) agrees: one algebra, two code paths',
    measured: K.enclosedMass(thetaE, d.dl, d.ds, d.dls),
    expected: massFromEinstein(thetaE, d.dl, d.ds, d.dls),
    unit: 'kg',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'pi Sigma_cr (theta_E D_l)^2 and c^2 theta_E^2 D_l D_s / (4 G D_ls) are the same expression (the contract leg A2).',
  });
  const sigma = 700e3;
  const th = K.sisEinsteinAngle(sigma, d.ds, d.dls);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The mass inside the Einstein radius of a 700 km/s singular isothermal sphere is the same from its dispersion (pi sigma^2 R / G) and from its radius',
    measured: K.massFromDispersion({
      sigmaMs: sigma,
      dl: d.dl,
      ds: d.ds,
      dls: d.dls,
    }).mass,
    expected: K.enclosedMass(th, d.dl, d.ds, d.dls),
    unit: 'kg',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'At R = theta_E D_l the SIS projected mass pi sigma^2 R / G equals pi Sigma_cr R^2 once theta_E = 4 pi (sigma/c)^2 D_ls/D_s (the contract leg A3, rule R3).',
  });
  const s = K.sisImagePositions(4, 1.2).theta;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The two images of a singular isothermal sphere (theta_E 4, source offset 1.2) invert to theta_E = (theta_+ + |theta_-|) / 2',
    measured: K.invertImages(s[0], s[1], 'sis').thetaE,
    expected: 4,
    unit: '',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'The images sit at theta_E +- beta, so their mean separation is theta_E; a point lens gives the geometric mean instead and the pair cannot tell them apart (the contract legs A5, rule R9).',
  });
  const arc = K.syntheticArc({
    centre: { x: 37.3, y: -12.1 },
    radius: 80,
    extentDeg: 90,
    startDeg: 17,
    n: 24,
    sigma: 0,
  });
  const fit = K.fitArc(arc.points, { sigma: 1 });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A 90 degree arc of 24 noise-free points on a circle of radius 80 pixels returns its radius with the centre free',
    measured: fit.radius,
    expected: 80,
    unit: 'px',
    tolerance: 1e-8,
    toleranceKind: 'relative',
    why: 'The geometric least-squares circle through points on a circle is that circle (the contract leg A6, rule R4).',
  });
  const noZ = K.massFromArc({
    radius: thetaE,
    sigmaRadius: 0.1 * ARCSEC,
    zs: 1,
    cosmology,
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'An arc without a lens redshift is "not constrained": no mass, only the angular radius',
    measured:
      noZ.status === 'not-constrained' &&
      noZ.code === 'no-lens-redshift' &&
      noZ.mass === null
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'A mass needs the angular-diameter distances, which need the lens redshift; the kernel assumes none (the contract leg D1, rule R7).',
  });
  const arcOnly = K.massFromArc({
    radius: thetaE,
    sigmaRadius: 0.1 * ARCSEC,
    zl: 0.3,
    zs: 1,
    cosmology,
    kind: 'arc',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A single arc with no source-offset bound gets a mass bracket (a quarter to the full mass of its radius) and no narrow interval',
    measured:
      arcOnly.interval === null &&
      arcOnly.modelLimited === 'offset-unbounded' &&
      arcOnly.bracket.thetaELo === thetaE / 2
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The outer image of a source off the axis sits at theta_E (1 + y), so the radius is only an upper bound of theta_E; the on-axis interval would miss the truth (the contract legs C3, C4, D5, rule R6).',
  });
}
