// ===========================================================================
// 9. Radiation and photometry (js/kernels/radiation/)
// ---------------------------------------------------------------------------
// The kernel the Stellar Lab, the spectra screens and the Observatory's flux
// conversions share (RADIATION.md). Each reference is a published number, an
// identity, or an independent integration; the fuller set, with the
// synthetic-photometry fixtures, is tests/radiationKernel.test.js.
// ===========================================================================

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ add }) {
  const [R, extLaw, bcLaw, bandPack] = await Promise.all([
    import('../../kernels/radiation/index.js'),
    import('../../kernels/radiation/packs.js').then(P => P.loadExtinction()),
    import('../../kernels/radiation/packs.js').then(P => P.loadBolometric()),
    import('../../kernels/radiation/packs.js').then(P => P.loadBandpasses()),
  ]);
  const G = 'Radiation and photometry';
  const band = id => R.decodeBand(bandPack.BANDS.find(b => b.id === id));
  const T = 5772;

  add({
    group: G,
    kind: 'data',
    source: 'CODATA 2018 (Tiesinga et al. 2021, Rev. Mod. Phys. 93, 025010)',
    name: 'Stefan-Boltzmann constant from h, c and k_B',
    measured: R.SIGMA_SB / 5.670374419e-8,
    expected: 1,
    unit: 'ratio',
    tolerance: 2e-10,
    why: 'sigma = 2 pi^5 k^4 / (15 h^3 c^2) with the exact 2019 SI values of h, c and k_B. CODATA 2018 prints 5.670374419e-8; the tolerance is the half-unit of its last digit.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'CODATA 2018 (Tiesinga et al. 2021, Rev. Mod. Phys. 93, 025010)',
    name: 'Wien displacement constant, found by solving x = 5(1 - e^-x)',
    measured: R.WIEN_B_LAMBDA / 2.897771955e-3,
    expected: 1,
    unit: 'ratio',
    tolerance: 2e-10,
    why: 'The root of the transcendental equation, then hc/(kx). CODATA 2018 prints 2.897771955e-3 m K; nothing here was typed in from it.',
  });
  add({
    group: G,
    kind: 'analytic',
    name: 'The frequency peak is not c over the wavelength peak',
    measured: R.wienPeakNu(T) / (R.C_LIGHT / R.wienPeakLambda(T)),
    expected: 0.5683,
    unit: 'ratio',
    tolerance: 1e-3,
    why: 'B_nu and B_lambda peak at different places because one is per unit frequency and the other per unit wavelength. For the same temperature nu_peak is 0.568 of c/lambda_peak; assuming they are the same is the commonest error in a blackbody calculation.',
  });
  add({
    group: G,
    kind: 'integration',
    name: 'B_lambda integrated over wavelength is sigma T^4 / pi',
    measured:
      R.bandRadiance(1e-8, 1e-2, T, 4000) / ((R.SIGMA_SB * T ** 4) / Math.PI),
    expected: 1,
    unit: 'ratio',
    tolerance: 1e-9,
    why: 'Planck and Stefan-Boltzmann are the same law: the exitance is pi times the integrated radiance. Simpson on 4000 log-spaced intervals from 10 nm to 1 cm; the part outside is about 1e-12 of the total.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'IAU 2015 Resolution B3 (Prsa et al. 2016, AJ 152, 41)',
    name: 'IAU 2015 nominal Sun: L = 4 pi R^2 sigma T^4',
    measured: R.luminosity(R.R_SUN_M, R.TEFF_SUN_K),
    expected: 3.828e26,
    unit: 'W',
    tolerance: 1e-4,
    why: 'Resolution B3 gives the nominal radius, temperature and luminosity to four digits, chosen to agree; the tolerance is that precision.',
  });
  add({
    group: G,
    kind: 'data',
    source:
      'IAU 2012 Resolution B2 (astronomical unit) and the definition of the magnitude',
    name: 'Distance modulus of the Sun at 1 AU',
    measured: R.AU_DISTANCE_MODULUS,
    expected: -31.5721,
    unit: 'mag',
    tolerance: 5e-5,
    toleranceKind: 'absolute',
    why: 'IAU 2012 AU over the IAU 2015 parsec: Willmer 2018 prints -31.5721 and Torres 2010 -31.572.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'IAU 2015 Resolution B2 (Mamajek et al. 2015)',
    name: 'Nominal solar luminosity is M_bol = 4.74',
    measured: R.bolometricMag(R.L_SUN_W),
    expected: 4.74,
    unit: 'mag',
    tolerance: 5e-4,
    toleranceKind: 'absolute',
    why: 'IAU 2015 Resolution B2 defines the zero point L0 = 3.0128e28 W so that the nominal solar luminosity is M_bol = 4.74; the tolerance covers its five digits.',
  });
  add({
    group: G,
    kind: 'analytic',
    name: 'A flux ratio of 100 is exactly 5 magnitudes',
    measured: R.fluxToMag(100),
    expected: -5,
    unit: 'mag',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: "Pogson's definition of the scale. Every magnitude difference in the kernel is built on it.",
  });
  add({
    group: G,
    kind: 'analytic',
    name: 'Distance modulus at 1 kpc is 10',
    measured: R.distanceModulus(1000),
    expected: 10,
    unit: 'mag',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: '5 log10(1000 / 10) = 10, and zero at 10 pc by definition of the absolute magnitude.',
  });
  add({
    group: G,
    kind: 'analytic',
    name: 'A source flat in f_nu has AB magnitude 0 in a band',
    measured: R.abMag(band('V'), R.flatFnuSed()),
    expected: 0,
    unit: 'mag',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'The AB system is defined by 3631 Jy at every wavelength (Oke & Gunn 1983). It tests the photon-counting weights and the c, Jy and nm conversions together, in a band of the pack.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'Bessell & Murphy 2012, PASP 124, 140, Table 5',
    name: 'Pivot wavelength of Johnson V, from the pinned passband',
    measured: R.pivotWavelength(band('V')) * 10,
    expected: 5488,
    unit: 'Angstrom',
    tolerance: 2,
    toleranceKind: 'absolute',
    why: 'Bessell & Murphy 2012 Table 5 prints 5488 A for the passband in Table 1; reproducing it checks the transcription of the table and the formula together. 2 A: the paper prints whole Angstroms and the trapezoid on a 100 A grid adds under 1.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'Willmer 2018, ApJS 236, 47, Table 3',
    name: 'AB - Vega offset of SDSS g, against Willmer 2018',
    measured: bandPack.BANDS.find(b => b.id === 'g').abMinusVega,
    expected: -0.125,
    unit: 'mag',
    tolerance: 0.01,
    toleranceKind: 'absolute',
    why: 'Willmer 2018 Table 3 prints -0.125 for the SDSS g curve with Vega at 0.03 mag; the pack computes it from the CALSPEC Vega spectrum. 0.01: his table has three decimals and his calibration uncertainty is 0.02. UBVRI are held to the same 0.01 (an earlier 0.05 hid a sampling bug, RADIATION.md deviation 1).',
  });
  add({
    group: G,
    kind: 'data',
    source: 'Willmer 2018, ApJS 236, 47, Table 3',
    name: "AB - Vega offset of Johnson U (through Vega's Balmer jump), against Willmer 2018",
    measured: bandPack.BANDS.find(b => b.id === 'U').abMinusVega,
    expected: 0.768,
    unit: 'mag',
    tolerance: 0.01,
    toleranceKind: 'absolute',
    why: "Willmer 2018 Table 3 prints 0.768 for the Bessell & Murphy U passband with Vega at 0.03 mag. U sits on the Balmer jump: integrating the spectrum only at the passband's own 50 A nodes gave 0.806; at steps of at most 1 nm the pack agrees to 0.01 (three printed decimals, 0.02 calibration uncertainty).",
  });
  add({
    group: G,
    kind: 'data',
    source: 'Cardelli, Clayton & Mathis 1989, ApJ 345, 245, Table 3',
    name: 'Cardelli, Clayton & Mathis extinction: A_I / A_V at R_V = 3.1',
    measured: R.extinctionRatio(1000 / 1.11, 3.1, extLaw.LAW),
    expected: 0.479,
    unit: 'ratio',
    tolerance: 0.003,
    toleranceKind: 'absolute',
    why: 'CCM89 Table 3 prints 0.479 from coefficients printed to four digits; 0.003 is three units of its last digit. B alone departs more (0.014 at x = 2.27: the table is the data the polynomial was fitted to, not its output) and has its own tolerance in tests/radiationKernel.test.js, which compares all eight filters and the exact eq. 3.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'Torres 2010, AJ 140, 1158 (Flower 1996 polynomial)',
    name: 'Bolometric correction of the Sun, Flower 1996 as Torres 2010 corrected it',
    measured: R.bolometricCorrectionV(5777, bcLaw.LAW),
    expected: -0.08,
    unit: 'mag',
    tolerance: 0.001,
    toleranceKind: 'absolute',
    why: 'Torres 2010 states BC_V,sun = -0.080 on the Flower scale; the polynomial with his 15-digit coefficients must give it. The polynomial is not extrapolated: outside 3500 K to 40000 K it returns no number.',
  });
  add({
    group: G,
    kind: 'analytic',
    name: 'Relativistic Doppler: v = 0.6 c is exactly z = 1',
    measured: R.zFromVelocity(0.6 * (R.C_LIGHT / 1000)),
    expected: 1,
    unit: 'ratio',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'sqrt((1 + 0.6)/(1 - 0.6)) = 2. The relativistic form is exact for motion along the line of sight; the non-relativistic form is v/c, 0.6, there.',
  });
  add({
    group: G,
    kind: 'approximation',
    name: "Non-relativistic Doppler at a star's 30 km/s",
    measured: R.zFromVelocityClassical(30),
    expected: R.zFromVelocity(30),
    unit: 'ratio',
    tolerance: 1e-7,
    toleranceKind: 'absolute',
    why: 'z_rel - z_classical is about beta^2 / 2, 5e-9 at 30 km/s; the classical form is the right one for a stellar radial velocity and the wrong one beyond a few thousand km/s. The kernel keeps both and says which applies.',
  });
  add({
    group: G,
    kind: 'data',
    source: 'NIST Atomic Spectra Database, Na I level energies',
    name: 'Air to vacuum at the sodium D2 line, against NIST level energies',
    measured: R.airToVacuumNm(588.995095) * 10,
    expected: 1e8 / 16973.36619,
    unit: 'Angstrom',
    tolerance: 2e-3,
    toleranceKind: 'absolute',
    why: 'NIST ASD gives Na I D2 (3s 2S1/2 to 3p 2P3/2) an upper level of 16973.36619 cm^-1 over a ground level of 0, so its vacuum wavelength is 1e8 over that, 5891.583 A, and an observed air wavelength of 5889.95095 A. Morton 2000, the formula the SDSS uses, must connect them. 0.002 A: the energies are good to 1e-5 A. The pack holds fifteen non-hydrogen lines to 0.02 A and they agree to under 0.004.',
  });
}
