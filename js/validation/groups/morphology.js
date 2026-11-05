// ===========================================================================
// 43. Galaxy morphology: isophotes, the curve of growth, the Petrosian magnitude and the refusals (Prompt 249)
// ===========================================================================

import * as M from '../../kernels/galaxy/morphology/index.js';

/**
 * Run this group's checks (GALAXY_MORPHOLOGY.md; the full table, with the independent oracle, the coverage
 * ensemble, the refusals and the legs that wait for authentic images, is `npm run morphology:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Galaxy morphology: size, shape and magnitude on an image';
  const sigma = 9;
  const gal = {
    kind: 'gaussian',
    sigma,
    q: 0.5,
    paDeg: 25,
    flux: 200000,
    x0: 79.87,
    y0: 78.89,
    psfFwhm: 0,
    noise: false,
  };
  const r = M.measureGalaxy(M.generateGalaxyImage(gal).image, {
    psfFwhm: 3,
    zeroPoint: { mag: 25, source: 'invented synthetic zero point' },
    draws: 0,
  });
  const truth = M.analyticTruth({ kind: 'gaussian', sigma });
  const ok = r.status === 'ok';

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The axis ratio of a noise-free elliptical Gaussian galaxy (q 0.5) is recovered from the fixed point of the second moments to 0.002',
    measured: ok ? r.geometry.q : NaN,
    expected: 0.5,
    unit: '',
    tolerance: 0.002,
    toleranceKind: 'absolute',
    why: 'Concentric similar ellipses have second moments inside a similar elliptical aperture of the same shape as their isophotes, so the fixed point of the moments is the isophotal shape (the contract leg A1, rule S5).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The half-light radius of that Gaussian galaxy equals the closed form for the flux inside twice the Petrosian radius to a relative 0.5 percent',
    measured: ok ? r.size.r50 : NaN,
    expected: truth.r50,
    unit: 'px',
    tolerance: 0.005,
    toleranceKind: 'relative',
    why: 'For a Gaussian the flux inside an elliptical radius a is 1 - exp(-a^2 / 2 s^2) and the Petrosian ratio over the annulus 0.8 a to 1.25 a falls to 0.2 at a fixed multiple of s; the kernel measures the same quantity from pixels (the contract leg A1).',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The total magnitude of that galaxy is the zero point minus 2.5 log10 of the flux inside twice the Petrosian radius, to 0.005 mag',
    measured: ok ? r.total.magnitude : NaN,
    expected: 25 - 2.5 * Math.log10(gal.flux * truth.totalFraction),
    unit: 'mag',
    tolerance: 0.005,
    toleranceKind: 'absolute',
    why: 'The total is the Petrosian flux, a stated fraction of the profile’s total; the zero point is the caller’s (invented here), and a frame given none returns an instrumental magnitude with a flag (the contract legs A1, A4).',
  });

  const point = M.measureGalaxy(
    M.generateGalaxyImage({
      kind: 'point',
      flux: 100000,
      seed: 1,
      label: 'group-point',
    }).image,
    { psfFwhm: 3, draws: 0 }
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A point source (the PSF itself) is returned unresolved, with no size claim',
    measured:
      point.status === 'unresolved' && point.size.status === 'unresolved'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'A half-light radius at or below about 1.25 times the PSF’s own is not a size; the kernel says unresolved and gives an upper limit (the contract legs D1a to D1c, rule S11).',
  });

  const faint = M.measureGalaxy(
    M.generateGalaxyImage({
      kind: 'sersic',
      n: 1,
      re: 9,
      q: 0.7,
      paDeg: 50,
      flux: 1000,
      seed: 1,
      label: 'group-faint',
    }).image,
    { psfFwhm: 3, draws: 0 }
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A galaxy whose Petrosian flux is not ten times its error is refused, never given a size',
    measured: faint.status === 'refused' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'Below a signal to noise of 10 inside the aperture the curve of growth is noise; the kernel refuses with a code (the contract leg D2, rule S6).',
  });

  const noRule = M.classifyMorphology(
    { concentration: { value: 4, sigma: 0.1 } },
    { name: 'x', source: '' }
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A classification without a rule and its source is refused: the kernel holds no published boundary',
    measured:
      noRule.status === 'refused' && noRule.code === 'missing-rule' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'A published classification’s thresholds are published numbers; the caller states a rule with its source and there is no default (the contract leg D5).',
  });
}
