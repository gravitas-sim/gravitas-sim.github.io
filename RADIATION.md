# The radiation and photometry kernel

Roadmap II, Prompt 82. One validated place for the physics of light that the
Stellar Lab, the spectra screens, the Observatory's flux and magnitude
arithmetic and the model page each carried a fragment of. Pure modules in
`js/kernels/radiation/` (no DOM, no module state, one import from the
application: the unit registry), importable in Node and in a Worker, with their
data in four lazy data packs. Checked in
[`tests/radiationKernel.test.js`](tests/radiationKernel.test.js) and in the
"Radiation and photometry" group of the [validation page](validation/).

## What is in it

| Module | What it does |
|---|---|
| `constants.js` | exact SI h, c, k_B; sigma derived from them; both Wien constants found by solving the transcendental equations; IAU 2012/2015 AU, pc, nominal solar values; the IAU 2015 B2 bolometric zero point; the AB zero point |
| `planck.js` | `B_lambda`, `B_nu`; Wien peaks (the frequency peak is not c over the wavelength peak); Stefan-Boltzmann; luminosity and effective temperature; band radiance |
| `photometry.js` | photon-counting synthetic photometry: pivot and mean photon wavelengths, mean `f_nu`, AB and Vega magnitudes, blackbody colours; samplers for a spectrum, a blackbody and a flat-`f_nu` source |
| `magnitudes.js` | flux and magnitude, distance modulus, absolute and apparent magnitude with extinction, bolometric magnitude and luminosity, bolometric correction `BC_V(Teff)` and `M_V` from `L` and `Teff` anchored on the Sun |
| `extinction.js` | the CCM89 law, `A(lambda)/A(V) = a(x) + b(x)/R_V`, coefficients as data, no extrapolation |
| `doppler.js` | non-relativistic and relativistic Doppler shift and their conversions, transverse shift, the size of the difference, air to vacuum and back (Morton 2000) |
| `lines.js` | identify a line from an observed wavelength, a redshift and a medium |
| `units.js` | flux density conversions through the unit registry, including the one the registry will not do alone (per wavelength to per frequency, which needs the wavelength) |
| `packs.js` | the only module that names a data pack; each loader is one dynamic import |

The kernel never imports its data. A caller loads a pack and hands it in, so a
page that needs `planck.js` does not download bandpasses.

## Applicability, stated

- **Doppler.** Non-relativistic `z = v/c` differs from the relativistic form by
  about `beta^2/2` in `z` (relative `beta/2`): 5e-9 in `z` at a star's 30 km/s,
  1e-4 at 4,200 km/s, 5 percent of `z` at 0.1 c. Neither is the cosmological
  redshift. The functions do the arithmetic and do not decide which applies.
- **Air and vacuum.** Morton 2000 holds from 200 nm to 2 um. Every line carries
  both wavelengths and callers say which medium their spectrum is in.
- **Extinction.** CCM89 for `0.3 <= 1/lambda <= 8 um^-1` (3.3 um to 125 nm); NaN
  outside it.
- **Bolometric corrections.** `BC_V` for 3,500 K to 40,000 K, NaN outside. Torres
  2010 says the relations "break down completely for the M dwarfs"; the pack sets
  `reliableAboveK: 4000`.
- **Magnitudes.** Photon-counting weights throughout. A band published as an
  energy response must be divided by wavelength before it is added.
- **Zero points.** AB is `3631 Jy` (Oke & Gunn 1983). Vega is 0.03 mag in every
  band (the convention of Bessell & Murphy 2012 and Willmer 2018), with the
  CALSPEC `alpha_lyr_stis_008` spectrum (Bohlin 2014); each band's AB - Vega
  offset is a number in the bandpass pack, computed from that spectrum through
  the shipped band.

## The data packs

All four are `gravitas.observation-data-pack/1` packs (`origin: compilation`),
built, checked and rebuilt by `tools/build-data-packs.mjs`; the builder is
`tools/data-packs/radiation.mjs`, the pinned raw products are listed in
`tools/data-packs/radiation/pins.json` and fetched by
`node tools/data-packs/radiation/pin.mjs`. Offline class `optional`: precached
at install, loaded only on request.

| Pack | Holds | Sources | Rights |
|---|---|---|---|
| `radiation-bandpasses` | Johnson-Cousins UBVRI, SDSS ugriz, TESS T, 2MASS JHKs; AB - Vega per band | Bessell & Murphy 2012 Table 1; SDSS 2001 filter curves (J. Gunn, column `respt`); TESS Instrument Response Function v2.0; Cohen et al. 2003 via SVO; CALSPEC Vega | attribution-requested, with a stated basis (below) |
| `radiation-lines` | 22 lines: H-alpha to H9, Ca II H and K, Ca I 4227, Na D, Mg b, Fe I, He I, He II; air and vacuum | NIST Atomic Spectra Database, one query per line, pinned | public domain (NIST SRD 78) |
| `radiation-extinction` | the CCM89 coefficients | Cardelli, Clayton & Mathis 1989, ApJ 345, 245 | attribution-requested: the coefficients of a published law |
| `radiation-bolometric` | `BC_V(log Teff)`, three polynomials | Torres 2010, Table 1 (Flower 1996, corrected) | attribution-requested: thirteen coefficients |

`dataType` is `model-grid` for the bandpasses, the law and the polynomials and
`catalog` for the lines: the format has no type for a tabulated response
function, and adding one is a format change this prompt did not make (decision
below).

How the bands were made: UBVRI are the paper's own grids (50 and 100 A), held to
its Table 5 (the pivot wavelength of every band reproduces to under 1 A, which is
also the check on the transcription); SDSS, TESS and 2MASS are resampled to a
uniform grid (2.5 nm for SDSS, 5 nm for the others), refused unless the AB
magnitude of Vega and of blackbodies from 3,000 K to 30,000 K moves by under
0.003 mag (the measured worst is in the manifest, per band). The first version
of this step used 5 nm for SDSS and moved the Vega u-band magnitude by 0.04 mag
over the Balmer jump; blackbodies alone had not shown it.

## The validation table

Tolerances and reasons are in the test and the builder, beside the number they
judge. A tolerance that was set after a first comparison is marked.

| Check | Reference | Tolerance | Reason |
|---|---|---|---|
| sigma, Wien b (`B_lambda`) and b' (`B_nu`) | CODATA 2018 | 2e-10 relative | half-unit of CODATA's last printed digit; constants are derived, not typed |
| `B_lambda` at six (lambda, T) | independent numpy implementation | 1e-12 relative | same closed form, rounding only |
| `Int B_lambda dlambda` | `sigma T^4 / pi`, and adaptive quadrature | 1e-9 relative | Simpson on 4,000 log intervals; tail outside is 1e-12 |
| Wien peaks | golden-section search | 1e-6 relative | B is flat at its maximum |
| IAU nominal Sun | `L = 4 pi R^2 sigma T^4` | 1e-4 | four-digit nominal values |
| Sun's modulus at 1 AU | -31.5721 (Willmer 2018) | 5e-5 | printed to 4 decimals |
| `M_bol` of nominal `L` | 4.74 (IAU 2015 B2) | 5e-4 | five-digit zero point |
| AB of a flat-`f_nu` source | 0 in all 14 bands (definition) | 1e-12 | exact up to rounding |
| UBVRI pivot wavelengths | Bessell & Murphy 2012 Table 5 | 2 A | printed to 1 A |
| blackbody AB magnitudes, 14 bands x 4 T | independent trapezoid | 1e-6 mag | same arithmetic, rounding only |
| the same against exact quadrature of the response | scipy quad | 2e-3 mag | discretisation error of the BM12 / Willmer convention |
| Vega has 0.03 mag in every band | CALSPEC spectrum | 0.003 | fixture holds 290 nm to 2.5 um at 6 digits |
| AB - Vega, SDSS and 2MASS | Willmer 2018 Table 3 | 0.01 | three decimals; his curves are the same |
| AB - Vega, 2MASS | Cohen et al. 2003 zero-magnitude fluxes | 0.02 | fluxes quoted to 2 percent |
| AB - Vega, UBVRI | Willmer 2018 Table 3 | 0.05 | the published offsets disagree with each other by 0.04 (below) |
| Sun's absolute AB magnitudes, 12 bands | Willmer 2018 Table 3 (HST reference spectrum against his composite) | 0.07 | solar SEDs differ by up to 5 percent in the infrared |
| CCM89 `A/A_V`, eight filters | CCM89 Table 3 | 0.015 (**set after the first comparison**) | the table is the fit's input; the fit's residual is 0.012 at B |
| `BC_V` of the Sun | -0.080 (Torres 2010) | 0.001 | printed to 3 decimals |
| continuity of the three `BC_V` fits | none published | 0.03 | the fits are not constrained to meet; the steps are 0.022 and 0.003 |
| relativistic Doppler | `v = 0.6 c` is `z = 1` (exact) | 1e-12 | identity |
| air to vacuum | NIST level energies, Na D2 | 0.002 A | energies good to 1e-5 A; the pack holds all 15 non-hydrogen lines to 0.02 A (measured worst 0.0033) |
| flux unit round trips | registry factors | 1e-12 | exact up to rounding |
| purity | source scan, imports, a real Worker | exact | no DOM, storage, timers or network; imports only the kernel and the registry |

## Deviations found

1. **UBVRI zero points disagree with themselves.** Willmer 2018 (BM12 passbands,
   Vega 008, Vega = 0.03) and the BM12 paper's Tables 3 and 5 give different
   AB - Vega offsets for the same system: U 0.768 and 0.784, B -0.134 and -0.107.
   This pack computes U 0.806 and B -0.096. V, R and I agree to 0.007. The
   kernel's UBVRI Vega magnitudes are therefore good to about 0.04 mag in U and
   B and 0.01 in V, R, I; the AB magnitudes (which do not use the offset) are
   unaffected. The bands are Bessell & Murphy's; the cause is not found.
2. **CCM89's Table 3 and eq. 3 differ at B**: the table prints A_B/A_V = 1.337 at
   R_V 3.1, the paper's polynomial gives 1.325. The other seven filters agree to
   0.003. The kernel follows the equations.
3. **Hydrogen from NIST.** The row for a whole level has level-averaged energies:
   its Ritz wavelength for H-alpha is 6562.819 A, against the 6562.79 every table
   uses (0.03 A, 1.3 km/s). Hydrogen keeps NIST's observed air wavelength and takes
   its vacuum wavelength from Morton 2000.
4. **The line-measuring tool's Balmer table is inconsistent.** `js/measure/spectrumLine.js`
   pairs H-beta air 4861.35 with vacuum 4862.68; Morton 2000 gives 4862.71 for
   4861.35 (or 4862.68 for 4861.33). 0.028 A, 1.7 km/s. H-alpha differs by 0.01 A
   (0.5 km/s) and H-gamma by 0.002.
5. **Flower's bolometric scale is not the IAU's.** `BC_V,sun` is -0.080 there. With
   `M_bol,sun = 4.74` and `V_sun = -26.76` it should be -0.072, so `M_bol = M_V + BC_V`
   with Flower's table makes luminosities 0.7 percent too high. `absoluteVFromLuminosity`
   anchors on the Sun, as Torres recommends.
6. **Flower's three polynomials do not meet**: steps of 0.022 mag at 5,000 K and
   0.003 mag at 7,900 K.
7. **The SDSS `respt` curves are the 2001 preliminary ones**, including the
   atmosphere at 1.3 airmasses. They are the curves the survey's photometry
   rests on, not Doi et al. 2010's.

## What Prompt 83 inherits: consumers measured, not changed

Importing the kernel into a lesson route adds a request to routes that have none
to spare (`tools/route-budgets.json`), and Prompt 82 forbids changing any
lesson's expected value. So no consumer was rewired. Each was measured against
the kernel (`tests/radiationConsumers.test.js`), and the old path stays as it is
(no flag was needed: nothing was replaced).

| Consumer | Agrees? | Difference to record |
|---|---|---|
| `js/stellar/geometry.js` solar constants, Stefan-Boltzmann relation | yes | `TEFF_SUN_K` and `R_SUN_M` are the kernel's; `L = R^2 T^4` in solar units is the kernel's law to 1e-4 (the nominal values agree to 5e-5) |
| `js/stellar/spectrumIndex.js` `airToVacuum` | yes | the same formula, to rounding |
| `spectrumIndex` feature labels (Ca II K, H-beta, Na D) | yes | within 0.05 A of the kernel's lines |
| `js/measure/spectrumLine.js` Balmer rest wavelengths | **no, up to 1.7 km/s** | H-alpha air +0.010 A, vacuum +0.007; H-beta air 0.000, vacuum -0.028 (the old table is internally inconsistent); H-gamma -0.002 and -0.002 A. A lesson tolerance finer than 2 km/s needs the table revised |
| `js/observatory/measurePanel.js` extinction `R = A_g/E(g-r)` = 3.245 (Schlafly & Finkbeiner 2011) | **no, 11 percent** | CCM89 through the kernel gives 3.60. At E(g-r) = 0.1 that is 0.035 mag in g, above the curve tool's 0.02 mag tolerance. Different laws (F99 against CCM89); the tool keeps its adopted number |
| its distance modulus | yes | 5 log10(d / 10 pc) |
| `js/bodyVisuals.js` `starColor` | not comparable | an sRGB display fit (Tanner Helland), not a colour index. The kernel's blackbody colours (B-V of 5,772 K is 0.60 on the Vega scale) have no sRGB rendering: that needs the CIE matching functions, which are not in this kernel |
| `js/stellar/mainSequence.js` | out of scope | mass to luminosity and temperature broken power laws are not radiation physics |
| model page, stellar section | text added | one paragraph in both languages naming the kernel and saying that the displayed colors and older approximations have not yet been moved onto it |

## Blockers and decisions for Carl

1. **Gaia G, G_BP, G_RP are not shipped.** The ESA/DPAC EDR3 passband table is
   Gaia data, licensed CC BY-NC 3.0 IGO (cosmos.esa.int/web/gaia-users/license,
   read 2026-10-09), and the project does not redistribute NC terms (the same
   position as `VO_ARCHIVE_GATE.md`: an NC answer never becomes a pack). The
   smallest honest alternative would be an analytic approximation of a band whose
   shape is not analytic, which would be inventing numbers, so Gaia is absent. The
   Gaia zero points (Riello et al. 2021, Table 3: Vega 25.6874, 25.3385, 24.7479;
   AB 25.8010, 25.3540, 25.1040) are numbers in a paper and could be added
   if the bands become shippable. **Decision for Carl:** accept the NC terms for
   one data pack (it would be the first), or leave Gaia out.
2. **TiO band heads are not in the line list.** No retrievable, citable table of
   band-head wavelengths was found (a search turned up 7053, 7589, 8432 A in
   passing, without a table). A band head is not a line: it needs a source that
   says where each band starts. Absent, and the Stellar Lab's TiO5 index
   (Reid, Hawley & Gizis 1995) is unchanged.
3. **Rights of the UBVRI table.** The Bessell & Murphy Table 1 is about 130
   numbers from a journal article, kept on its own grids. It is measured
   instrument data, but no licence text accompanies it. The pack states the basis.
   If Carl would rather not reproduce it, the UBVRI bands can be rebuilt from
   Bessell 1990 on the SVO Filter Profile Service, with the energy to photon
   conversion, at a cost of up to 0.03 mag in the colours.
4. **`dataType`.** The pack format's `dataType` list has no value for a response
   function or a law; `model-grid` and `catalog` are used and DATA_PACKS.md says
   so. A new value is a format change (schema, SDK types, FORMATS.md) and was not
   made here. Recommended if more tabulated functions arrive.
5. **TESS has no published AB - Vega offset**; the pack's 0.328 mag is computed
   here against Vega at 0.03 and labelled as such. TESS magnitudes are defined by
   an electron rate at T = 10 (TESS Instrument Handbook), which this kernel does
   not model.
