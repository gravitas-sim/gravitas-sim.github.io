// ===========================================================================
// 38. Rotation-curve decomposition: the bulge, disk and halo components and the fit (Prompt 236)
// ===========================================================================

import * as K from '../../kernels/galactic/decomposition.js';
import * as S from '../../kernels/galactic/decompositionSynthetic.js';
import { REF } from '../harness.js';

/**
 * Run this group's checks (ROTATION_DECOMPOSITION.md; the full table, with the independent oracle and the
 * ensembles, is `npm run decomposition:validate`). The committed legs that cross their bound there are not
 * repeated here.
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Rotation-curve decomposition';
  const KPC = 3.085677581491367e19; // m
  const gSI = (REF.G * REF.solarMassKg) / (KPC * 1e6); // kpc (km/s)^2 per solar mass, CODATA

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The Hernquist bulge of 1e10 solar masses and scale 0.7 kpc turns at sqrt(G M / 4a) at r = a',
    measured: K.bulgeSpeed(0.7, 1e10, 0.7),
    expected: Math.sqrt((gSI * 1e10) / (4 * 0.7)),
    unit: 'km/s',
    tolerance: 5e-4,
    why: 'v^2 = G M r / (r + a)^2 is G M / 4a at r = a. The kernel works in the IAU nominal GM of the Sun; the suite works in CODATA G and the solar mass, which differ by 2 parts in 10,000; 5e-4 bounds that.',
    source: 'Hernquist 1990, ApJ 356, 359',
  });

  // The speed of an NFW halo peaks where x^2 / (1 + x)^2 = ln(1 + x) - x / (1 + x): found here by bisection.
  const f = x =>
    (x * x) / ((1 + x) * (1 + x)) - (Math.log(1 + x) - x / (1 + x));
  let lo = 0.5;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'An NFW halo’s circular speed peaks at 2.16 scale radii',
    measured: K.nfwPeakRatio(),
    expected: 0.5 * (lo + hi),
    unit: '',
    tolerance: 1e-9,
    why: 'The condition d(m(x)/x)/dx = 0 for the enclosed-mass function m(x) = ln(1 + x) - x / (1 + x), solved by bisection in the suite and by the kernel independently of each other.',
    source: 'Navarro, Frenk and White 1996, ApJ 462, 563',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A thin exponential disk of mass M turns like a point mass of M far out: v^2 r / (G M) at 100 scale lengths is 1 within 1e-3',
    measured: (K.diskSpeed(260, 4e10, 2.6) ** 2 * 260) / (K.G_KPC * 4e10),
    expected: 1,
    unit: '',
    tolerance: 1e-3,
    why: 'The first correction of the Freeman disk’s far field is (9 / 8) / y^2 with y = r / 2 R_d, 4.5e-4 at 100 scale lengths, so the bound sits above it.',
    source: 'Freeman 1970, ApJ 160, 811',
  });

  // A noise-free curve of the synthetic galaxy: the fit reproduces it, and a curve that stops at 6 kpc
  // does not fix the halo.
  const disk = { luminosity: 5e10, massToLight: { lo: 0.3, hi: 1.5 } };
  const bulge = { mass: 1e10, scale: 0.7 };
  const truth = { ...S.SYNTHETIC_TRUTH };
  const clean = radii =>
    radii.map(r => ({ r, v: K.componentSpeeds(r, truth).total, err: 4 }));
  const full = K.decomposeCurve(clean(S.geometricRadii(1.5, 40, 24)), {
    disk,
    bulge,
    halo: 'nfw',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The fit of a noise-free synthetic curve (24 radii, 1.5 to 40 kpc) leaves chi-square below 1e-6',
    measured: full.chi2,
    expected: 0,
    unit: '',
    tolerance: 1e-6,
    why: 'The curve is the model’s own, so the minimum is exactly zero and the fit must find it from its starts; a larger chi-square is a fit that stopped on a valley floor.',
  });
  const inner = K.decomposeCurve(clean(S.geometricRadii(1.5, 6, 10)), {
    disk,
    bulge,
    halo: 'nfw',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A noise-free curve that stops at 6 kpc leaves the halo "not constrained" and reports no halo interval',
    measured:
      inner.halo.constrained === false &&
      inner.parameters.every(
        p =>
          (p.name !== 'haloSpeed' && p.name !== 'logHaloScale') ||
          p.constrained ||
          (p.profileInterval === null && p.covarianceInterval === null)
      )
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'Inside 6 kpc the disk and the halo trade against each other; the profile of the halo’s speed or scale is open on a side, which the kernel reports as not constrained (the rule of ROTATION_DECOMPOSITION.md).',
  });
}
