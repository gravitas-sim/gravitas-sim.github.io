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
- **Air and vacuum.** Morton 2000 for standard air (15 C, 101325 Pa, dry), valid
  from 200 nm to 2 um; `airToVacuumNm` and `vacuumToAirNm` return NaN outside it.
  `airToVacuumNm` evaluates the wavenumber term at the air wavelength, as the
  formula is written; evaluating it at the vacuum wavelength would move the result
  by at most 1e-5 nm. Every line carries both wavelengths and callers say which
  medium their spectrum is in.
- **Extinction.** CCM89 for `0.3 <= 1/lambda <= 8 um^-1` (3.3 um to 125 nm); NaN
  outside it.
- **Bolometric corrections.** The polynomial spans 3,500 K to 40,000 K and is NaN
  outside. Torres 2010 says the relations "break down completely for the M
  dwarfs"; the pack sets `reliableAboveK: 4000`, and `bolometricCorrectionV` and
  `absoluteVFromLuminosity` return NaN below it unless `{ allowUnreliable: true }`
  is passed. `M_bol = M_V + BC_V` holds on Flower's scale only; use
  `absoluteVFromLuminosity`, which anchors on the Sun (deviation 5).
- **Magnitudes.** Photon-counting weights throughout. A band published as an
  energy response must be divided by wavelength before it is added.
- **Zero points.** AB is `3631 Jy` (Oke & Gunn 1983). Vega is 0.03 mag in every
  band (the convention of Bessell & Murphy 2012 and Willmer 2018), with the
  CALSPEC `alpha_lyr_stis_008` spectrum (Bohlin 2014); each band's AB - Vega
  offset is a number in the bandpass pack, computed from that spectrum through
  the shipped band. Real 2MASS catalogue magnitudes put Vega near 0 in J, H and
  Ks, so they differ from this kernel's Vega magnitudes by 0.024 to 0.03 mag.
- **Integration.** The spectrum is integrated at steps of at most 1 nm: the band's
  response is linearly interpolated to that grid before the trapezoid rule is
  applied (`refineBand`). The BM12 UBVRI are tabulated every 50 or 100 A, and
  sampling a spectrum with a Balmer jump and lines at those nodes only aliases it
  (deviation 1).
- **SDSS.** The kernel's `u g r i z` magnitudes are true AB magnitudes (it
  integrates `f_nu` against the curve). Native SDSS u and z magnitudes differ from
  AB by about -0.04 and +0.02 mag, and the kernel does not apply those. The
  curves are the 2001 preliminary ones including the atmosphere (deviation 7).

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
| `radiation-gaia-bandpasses` | Gaia (E)DR3 G, G_BP, G_RP and their zero points (AB - Vega, Vega = 0 mag) | Riello et al. 2021, CDS J/A+A/649/A3 | **non-commercial**, `cc-by-nc-3.0-igo` (CC BY-NC 3.0 IGO), by Carl's exception; see Blockers 1 |

`dataType` is `model-grid` for the bandpasses, the law and the polynomials and
`catalog` for the lines: the format has no type for a tabulated response
function, and adding one is a format change this prompt did not make (decision
below).

Provenance notes. The pinned Bessell & Murphy PDF is the arXiv v1 preprint
(1112.2698v1), not the PASP version; the table was held to the published Table 5
pivot wavelengths, which is the check on the transcription. The CALSPEC
`sun_reference_stis_002` spectrum is a test fixture only (it feeds
`tests/fixtures/radiation/sed.json` for the Sun checks and is an input to no pack);
its sha256 is a50b70a5c6515322cee14a3fe8060d9e4d7260912ae8d3e85b7fa88302130ab3,
recorded in `tests/fixtures/radiation/make_reference.py`.

How the bands were made: UBVRI are the paper's own grids (50 and 100 A), held to
its Table 5 (the pivot wavelength of every band reproduces to under 1 A, which is
also the check on the transcription); SDSS, TESS and 2MASS are resampled to a
uniform grid (2.5 nm for SDSS, 5 nm for the others), refused unless the AB
magnitude of Vega and of blackbodies from 3,000 K to 30,000 K moves by under
0.003 mag (the measured worst is in the manifest, per band). The first version
of this step used 5 nm for SDSS and moved the Vega u-band magnitude by 0.04 mag
over the Balmer jump; blackbodies alone had not shown it.

That resampling guard compares two grids of the same response, so it is empty for
UBVRI, which ship on their native grid; it did not catch the sampling bug of
deviation 1. A second guard now runs for every band: the kernel's 1 nm
integration against a 0.1 nm one, refused above 0.003 mag (the measured worst is
in the manifest as `integrationStepWorstMagnitudeChange`).

## The validation table

Tolerances and reasons are in the test and the builder, beside the number they
judge. A tolerance that was set after a first comparison is marked.

| Check | Reference | Tolerance | Reason |
|---|---|---|---|
| sigma, Wien b (`B_lambda`) and b' (`B_nu`) | CODATA 2018 | 2e-10 relative | half-unit of CODATA's last printed digit; constants are derived, not typed |
| `B_lambda` at six (lambda, T) | independent numpy implementation | 1e-12 relative | same closed form, rounding only |
| `Int B_lambda dlambda` | `sigma T^4 / pi`, and adaptive quadrature | 1e-9 relative | Simpson on 4,000 log intervals (the default is 2,000; measured converged to better than 1e-10 over 30 nm to 10 um at 5772 K); tail outside is 1e-12 |
| Wien peaks | golden-section search | 1e-6 relative | B is flat at its maximum |
| IAU nominal Sun | `L = 4 pi R^2 sigma T^4` | 1e-4 | four-digit nominal values |
| Sun's modulus at 1 AU | -31.5721 (Willmer 2018) | 5e-5 | printed to 4 decimals |
| `M_bol` of nominal `L` | 4.74 (IAU 2015 B2) | 5e-4 | five-digit zero point |
| AB of a flat-`f_nu` source | 0 in all 14 bands (definition) | 1e-12 | exact up to rounding |
| UBVRI pivot wavelengths | Bessell & Murphy 2012 Table 5 | 2 A | printed to 1 A |
| blackbody AB magnitudes, 14 bands x 4 T | independent numpy trapezoid on the response refined to 1 nm | 1e-6 mag | same arithmetic, rounding only |
| the same against exact quadrature of the response | scipy quad | 1e-4 mag (was 2e-3 before the 1 nm integration; measured worst 5e-6) | trapezoid error on a smooth Planck curve at 1 nm |
| Vega has 0.03 mag in every band | CALSPEC spectrum | 0.003 | fixture holds 290 nm to 2.5 um at 6 digits |
| Vega through UBVRI: band-node grid against a 0.1 nm grid built in the test | aliasing guard | 0.003 mag (and the unrefined grid must differ in U by over 0.02, so the guard is not vacuous) | fixed beforehand: the smallest offset difference reported; also a build-time refusal for every band |
| AB - Vega, all 13 bands with a published offset (UBVRI, SDSS, 2MASS) | Willmer 2018 Table 3 | 0.01 | three decimals and a 0.02 calibration; UBVRI were 0.05 until the sampling bug was fixed (deviation 1); pack-minus-Willmer is at most 0.002 |
| AB - Vega, 2MASS | Cohen et al. 2003 zero-magnitude fluxes | 0.02 | fluxes quoted to 2 percent |
| Sun's absolute AB magnitudes, 12 bands | Willmer 2018 Table 3 (HST reference spectrum against his composite) | 0.07 | solar SEDs differ by up to 5 percent in the infrared |
| CCM89 `A/A_V`, seven filters (U V R I J H K) | CCM89 Table 3 | 0.003 each (measured worst 0.002, at H) | three units of the last printed digit; the polynomial was fitted to these values |
| CCM89 `A/A_V` at B | CCM89 Table 3 | 0.015 (**the flat 0.015 of the first version was set after the first comparison**; this per-filter split was fixed with its reasons, then measured: 0.0144) | Table 3 is the passband fit the polynomial was fitted to, with a +0.05 hump between B and U that the fit does not follow; the printed 1.337 against 1.323 from eq. 3 at x = 2.27 |
| CCM89 eqs. 2 to 4 | independent transcription | 1e-12 | the same closed form, rounding only; every 0.1 um^-1 and three R_V |
| CCM89 `A_B/A_V = 1 + 1/R_V` at x = 2.27 | the definition of E(B-V) | 0.002 (measured 2e-6) | the polynomial was fitted to data that obey it |
| `BC_V` of the Sun | -0.080 (Torres 2010) | 0.001 | printed to 3 decimals |
| `BC_V` below 4,000 K | `reliableAboveK` | NaN by default | Torres 2010: breaks down for M dwarfs |
| continuity of the three `BC_V` fits | none published | 0.03 | the fits are not constrained to meet; the steps are 0.022 and 0.003 |
| relativistic Doppler | `v = 0.6 c` is `z = 1` (exact) | 1e-12 | identity |
| air to vacuum outside 200 nm to 2 um | Morton 2000's range | NaN | not an index of refraction beyond it |
| air to vacuum | NIST level energies, Na D2 | 0.002 A | energies good to 1e-5 A; the pack holds all 15 non-hydrogen lines to 0.02 A (measured worst 0.0033) |
| flux unit round trips | registry factors | 1e-12 | exact up to rounding |
| purity | source scan, imports, a real Worker | exact | no DOM, storage, timers or network; imports only the kernel and the registry |

## Deviations found

1. **UBVRI zero points were a sampling-aliasing bug, now fixed.** The first
   version integrated the spectrum only at the band's own nodes (the BM12 UBVRI
   are on 50 and 100 A grids), so Vega's Balmer jump and lines in U and B were
   undersampled. It gave AB - Vega of U 0.806 and B -0.096 against Willmer 2018's
   0.768 and -0.134, and the first draft of this file put that down to
   disagreement among published zero points and said AB magnitudes were
   unaffected by it; both were wrong. Integrating at steps of at most 1 nm gives
   (before, after, Willmer): U 0.8057, 0.7676, 0.768; B -0.0957, -0.1327, -0.134;
   V -0.0197, -0.0172, -0.017; R 0.1614, 0.1662, 0.168; I 0.4063, 0.4073, 0.408.
   An independent 1 A recomputation (the review's) gave 0.768, -0.133, -0.017,
   0.166, 0.407. AB magnitudes of line-rich spectra were affected too: the sampling
   error is in the AB magnitude, not in the offset. The check against Willmer is
   now 0.01 for every band, a test compares the kernel with an independent fine
   grid, and the build refuses a band whose magnitudes move by more than 0.003
   between 1 nm and 0.1 nm integration. BM12's own Table 3 values for U and B
   (0.784, -0.107) still differ from Willmer's by 0.02 to 0.03 and are not
   reproduced here.
2. **CCM89's Table 3 and eq. 3 differ at B**: the table prints A_B/A_V = 1.337 at
   R_V 3.1, the paper's polynomial gives 1.323 (a residual of 0.014 at x = 2.27;
   1 + 1/R_V = 1.3226). The other seven filters agree to 0.003. The kernel follows
   the equations; coefficients were checked against an independent transcription to
   1e-12.
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
   rests on, not Doi et al. 2010's. Magnitudes through them are true AB; native
   SDSS u and z differ from AB by about -0.04 and +0.02 mag, not applied here.

## What Prompt 83 inherits: consumers measured, not changed

Importing the kernel into a lesson route adds a request to routes that have none
to spare (`tools/route-budgets.json`), and Prompt 82 forbids changing any
lesson's expected value. So no consumer was rewired. Each was measured against
the kernel (`tests/radiationConsumers.test.js`), and the old path stays as it is
(no flag was needed: nothing was replaced).

| Consumer | Agrees? | Difference to record |
|---|---|---|
| `js/stellar/geometry.js` solar constants, Stefan-Boltzmann relation | yes | `TEFF_SUN_K` and `R_SUN_M` are the kernel's; `L = R^2 T^4` in solar units is the kernel's law to 1e-4 (the nominal values agree to 5e-5) |
| `js/stellar/spectrumIndex.js` `airToVacuum`, used also by `js/measure/bandIndex.js` and `js/stellarSpectraWidgets.js` | yes | the same formula, to rounding (the application's has no range guard; the kernel's returns NaN outside 200 nm to 2 um) |
| `js/exoplanetObservables.js` `dopplerShiftNm` | yes | `dLambda = lambda v / c`, the kernel's non-relativistic form (relative error `beta/2`, 5e-9 at 30 km/s) |
| black-hole Doppler beaming (`js/physics.js` `getDopplerFactor`, `js/blackHole/geometry.js` `dopplerWeight`) | qualitative only | the particle disk uses `D^3` (a continuum source) with beta a stand-in, speed over a display reference speed capped at 0.55, and the result clamped to 0.25 to 3.2; the black-hole page uses a bounded display weight (0.35 to 2.2). The shape is the physics, the size is a display constant, so there is no number to compare |
| `spectrumIndex` feature labels (Ca II K, H-beta, Na D) | yes | within 0.05 A of the kernel's lines |
| `js/measure/spectrumLine.js` Balmer rest wavelengths | **no, up to 1.7 km/s** | H-alpha air +0.010 A, vacuum +0.007; H-beta air 0.000, vacuum -0.028 (the old table is internally inconsistent); H-gamma -0.002 and -0.002 A. A lesson tolerance finer than 2 km/s needs the table revised |
| `js/observatory/measurePanel.js` extinction `R = A_g/E(g-r)` = 3.245 (Schlafly & Finkbeiner 2011) | **no, 11 percent** | CCM89 through the kernel gives 3.60 at the pivot wavelengths, and the number depends on the source's temperature: 3.57 at 10,000 K, 3.70 at 5,772 K, 3.83 at 4,000 K (band-integrated, reproduced from the review's recomputation). At E(g-r) = 0.1 the 3.60 is 0.035 mag in g, above the curve tool's 0.02 mag tolerance. Different laws (F99 against CCM89) and CCM89 is not the recommended law for SDSS bands; the tool keeps its adopted number |
| its distance modulus | yes | 5 log10(d / 10 pc) |
| `js/bodyVisuals.js` `starColor` | not comparable | an sRGB display fit (Tanner Helland), not a colour index. The kernel's blackbody colours (B-V of 5,772 K is 0.60 on the Vega scale) have no sRGB rendering: that needs the CIE matching functions, which are not in this kernel |
| `js/stellar/mainSequence.js` | out of scope | mass to luminosity and temperature broken power laws are not radiation physics |
| model page, stellar section | text added | one paragraph in both languages naming the kernel and saying that the displayed colors and older approximations have not yet been moved onto it |

## Follow-up: budget-neutral rewiring

No consumer is rewired here (the table above says why). The follow-up is a later
step that adopts the kernel lazily, one consumer at a time, each behind a dynamic
import so that no lesson route gains a request, and only after route and deferred
budget has been recovered. Each consumer's measured difference above is the
acceptance test for its step; none changes a lesson's expected value without its
own prompt.

## Blockers and decisions for Carl

1. **Gaia G, G_BP, G_RP ship as a separate, non-commercial pack** (decided by
   Carl 2026-10-09: "ship the gaia passbands but note their license"; the
   schema status was approved in the same words as "add the NC license to the
   data pack schema"; recorded as D-RAD-01 in `DECISION_REGISTER.md`). The
   ESA/DPAC EDR3 table is Gaia data, licensed CC BY-NC 3.0 IGO
   (cosmos.esa.int/web/gaia-users/license, read 2026-10-09: "Gaia data are
   distributed under the CC BY-NC 3.0 IGO license."), and `VO_ARCHIVE_GATE.md`
   says NC data is not redistributed; this pack is the owner's explicit
   exception to that, for this one pack. It is `radiation-gaia-bandpasses`, apart
   from `radiation-bandpasses`, so no other band is under NC terms, and its
   licence status is the new `cc-by-nc-3.0-igo` (a statement, a basis and
   `license.nonCommercial: true` are required; `DATA_PACKS.md`). It is optional
   and lazy (`loadGaiaBandpasses` in `js/kernels/radiation/packs.js`), in no
   route, with no budget effect. The catalog and `sdk review` still refuse every
   non-commercial licence (`ACCEPTED_LICENSES` is unchanged), and the validator
   refuses the status in a contributed pack.
   What is in it (Riello et al. 2021, A&A 649, A3, CDS J/A+A/649/A3; ESA's zip
   holds the same files byte for byte): the one EDR3 set of G, G_BP and G_RP
   (also the DR3 set; the DR2 nominal, revised and Weiler sets and the pre-launch
   curves are different and absent, and the source has no second EDR3 G), each
   normalised to a peak of 1 and rounded to 1/100000, on the CDS 1 nm grid.
   Photon-counting, as the paper's Eqs. 13-15 weight by wavelength (the CDS
   column header says "transmissivity" in "mag", which is a labelling slip). The
   AB - Vega offsets are Gaia's own, from `zeropt.dat` (Vega 0 mag in each band;
   0.1137, 0.0154, 0.3561 mag for G, G_BP, G_RP; from 25.6874/25.3385/24.7479 and
   25.8010/25.3540/25.1040), which is not the Vega = 0.03 convention of
   `radiation-bandpasses`. G and G_RP are cut off where the source stops defining
   them (1050 and 1080 nm, 0.3 and 0.04 percent of the peak) and no ramp is
   invented. Measured against the tolerances written first (in
   `tools/data-packs/radiation.mjs`): pivot wavelengths 621.76, 510.97, 776.90 nm
   against Table 3's 621.79, 510.97, 776.91 (tolerance 0.1); mean photon
   wavelengths 639.02, 518.26, 782.51 against 639.07, 518.26, 782.51 (0.1); FWHM
   454.82, 265.90, 292.83 against 454.82, 265.90, 292.75 (1 nm); offsets within
   0.0001 of Table 3 (0.00015); CALSPEC Vega is 0.021, 0.020, 0.023 mag in the Gaia
   system (within 0.04; Casagrande & VandenBerg 2018 find 0.033 in G); a 5772 K
   blackbody has G_BP - G_RP = 0.868 against the real Sun's 0.82 (0.06, for line
   blanketing; this one is a loose check: it catches a wrong band or zero point,
   not a fourth decimal). The licence is an inference to be aware of: ESA states
   it for "Gaia data", and neither ESA's passband page nor the CDS record repeats
   it for this table (CDS's own page says J/A+A tables are free for scientific
   use), so the pack's statement says so. If ESA says otherwise, remove the pack.
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
