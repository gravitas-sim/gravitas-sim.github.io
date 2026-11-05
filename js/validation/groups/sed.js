// ===========================================================================
// 43. The SED kernel: conventions, the band-integrated point, the blackbody fit and its refusals (Prompt 245)
// ===========================================================================

/**
 * Run this group's checks (SED.md; the full table, with the independent oracle, the ensembles and
 * the legs that wait for authentic files, is `npm run sed:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const [K, R, packs] = await Promise.all([
    import('../../kernels/sed/index.js'),
    import('../../kernels/radiation/index.js'),
    import('../../kernels/radiation/packs.js').then(P => P.loadBandpasses()),
  ]);
  const GROUP = 'Spectral energy distributions';
  const bands = new Map(packs.BANDS.map(b => [b.id, R.decodeBand(b)]));
  const sun = { T: 5772, radiusSolar: 1, distancePc: 10 };
  const points = [
    { id: 'B', band: 'B', convention: 'vega-mag', sigma: 0.02 },
    { id: 'V', band: 'V', convention: 'vega-mag', sigma: 0.02 },
    { id: 'R', band: 'R', convention: 'vega-mag', sigma: 0.02 },
    { id: 'I', band: 'I', convention: 'vega-mag', sigma: 0.02 },
    { id: 'J', band: 'J', convention: 'vega-mag', sigma: 0.03 },
    { id: 'H', band: 'H', convention: 'vega-mag', sigma: 0.03 },
    { id: 'Ks', band: 'Ks', convention: 'vega-mag', sigma: 0.03 },
  ];
  const synthetic = K.makeSyntheticSed(
    { star: sun, points, noise: false },
    { bands, seed: 245, label: 'group' }
  );
  const fit = K.fitBlackbody(synthetic.points, {
    bands,
    distance: { pc: sun.distancePc },
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'An AB magnitude of 5 is 36.31 Jy: the zero point is the 3631 Jy of the radiation kernel, 100 times fainter at five magnitudes',
    measured: K.abMagToJy(5),
    expected: 36.31,
    unit: 'Jy',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'm_AB = -2.5 log10(f_nu / 3631 Jy), so five magnitudes is a factor 10^-2 (Oke and Gunn 1983).',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A source flat in f_nu has AB magnitude 0 in the V band of the bandpass pack, whatever the band shape',
    measured: R.abMag(bands.get('V'), R.flatFnuSed()),
    expected: 0,
    unit: 'mag',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'The photon-weighted mean of a constant f_nu is that constant, which is 3631 Jy by construction here.',
  });

  const box = (() => {
    const nodes = Array.from({ length: 201 }, (_, i) => 500 + i);
    return R.decodeBand({
      id: 'box',
      lambdaNm: nodes,
      response: nodes.map(() => 1),
      scale: 1,
    });
  })();
  const nuSquared = lam => (600 / lam) ** 2;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The band-integrated mean f_nu of f_nu proportional to lambda^-2 through a box band from 500 to 700 nm is 1.048090 of the value at 600 nm, which is not the monochromatic value at the band centre (1) nor at the pivot wavelength',
    measured: R.meanFluxJy(
      box,
      lam => (nuSquared(lam) * 1e-26 * R.C_LIGHT * 1e9) / (lam * lam)
    ),
    expected: (600 ** 2 * (500 ** -2 - 700 ** -2)) / 2 / Math.log(700 / 500),
    unit: 'Jy',
    tolerance: 1e-5,
    toleranceKind: 'relative',
    why: 'The photon-weighted mean of K nu^p over a box is K c^p (l1^-p - l2^-p) / (p ln(l2 / l1)); a band-integrated point and a monochromatic point at its pivot are different numbers.',
  });

  add({
    group: GROUP,
    kind: 'recovery',
    name: 'A noise-free synthetic Sun seen through B V R I J H Ks returns its temperature of 5772 K from band-integrated points',
    measured: fit.T.value,
    expected: 5772,
    unit: 'K',
    tolerance: 1e-6,
    toleranceKind: 'relative',
    why: 'The fit is the same blackbody that made the points, through the same bands; any difference is the profile search or the interpolated table, not the data.',
  });

  add({
    group: GROUP,
    kind: 'recovery',
    name: 'The blackbody luminosity of the same noise-free fit at 10 pc is 4 pi R^2 sigma T^4 of the synthetic star',
    measured: fit.luminosity.watts,
    expected: synthetic.truth.luminosityW,
    unit: 'W',
    tolerance: 1e-6,
    toleranceKind: 'relative',
    why: 'The angular radius times the distance is the radius, and a blackbody of that radius and temperature has L = 4 pi R^2 sigma T^4.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'An SED of two points is not constrained: the kernel returns no temperature for a blackbody with two free parameters',
    measured:
      K.fitBlackbody(synthetic.points.slice(0, 2), { bands }).code ===
      'too-few-points'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'Two points fix two parameters exactly and leave no degree of freedom to say whether a blackbody is the right model.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A magnitude with no stated convention is refused with code convention-unknown, not read as AB or Vega',
    measured:
      K.normalizePoint(
        { id: 'x', kind: 'band-integrated', band: 'V', value: 12, sigma: 0.02 },
        bands
      ).code === 'convention-unknown'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'AB and Vega magnitudes of the same star differ by a band-dependent offset up to 1.8 mag in this pack; guessing one would be wrong by that much.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A nonsimultaneous point with allowance 0.1 has its log-flux error widened to sqrt(sigma^2 + 0.1^2): 0.1 for a 10 percent error becomes 0.1414',
    measured: K.applyNonsimultaneity([{ id: 'a', epoch: null, sigmaLn: 0.1 }], {
      allowance: 0.1,
      referenceEpoch: 0,
      windowDays: 30,
    }).points[0].sigmaLnEff,
    expected: Math.sqrt(0.02),
    unit: '',
    tolerance: 1e-14,
    toleranceKind: 'relative',
    why: 'The rule adds the allowance in quadrature to the stated error, and a point with no epoch counts as nonsimultaneous.',
  });
}
