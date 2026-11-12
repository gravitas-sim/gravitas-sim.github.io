# Spectral energy distributions: kernel and validation (Prompt 245)

Status: the kernel half of Prompt 245, invisible. `js/kernels/sed/` is imported by no shipped module and is
`NEVER_PRECACHED`; the SED view on the spectra workspace, the investigation "Why we need every telescope", the
model-page section, instructor materials, Spanish strings and any star pack are NOT built. They wait for Carl's
confirmation and for the consumers rule committed in `tests/fixtures/sed/thresholds.json` (see `SED_GATE.md`).
The validation contract was committed before the kernel (`38d074ed`), with two amendments before the first validator
run and a third after a partial one, all recorded in the file with their reasons. Nothing was fetched; no catalogue
flux, zero point, filter curve, effective wavelength or licence term was typed from memory.

One object, every wavelength, every convention stated: the kernel carries, on every point, its band, its
convention, whether it is band-integrated or monochromatic and its epoch, and it refuses a point that does not say.

## What is built and what is not

Built (`js/kernels/sed/`, 6 modules, pure, no DOM, no state):

- `conventions.js`: AB and Vega magnitudes per band (the radiation kernel's AB zero point, the bandpass pack's AB-Vega
  offsets), the registry flux units, f_lambda, f_nu, nu f_nu and lambda f_lambda.
- `points.js`: the point contract (`gravitas.sed-point/1`), every refusal by code, and the nonsimultaneity rule.
- `model.js`: the blackbody model per unit solid angle, band-integrated or monochromatic, and its tabulated basis.
- `fit.js`: the blackbody fit: temperature and angular radius, the profile interval, the covariance, the adequacy test,
  the stated range, and `not-constrained`.
- `bolometric.js`: the integrated SED between its first and last point, the model's tails as labelled extrapolation,
  and the luminosity with a distance and a seeded bootstrap interval.
- `synthetic.js`: a labelled generator with a truth manifest.

Not built: a multiwavelength pack for a star (rights basis C, nothing retrieved), the SED view, the investigation, the
second object (a galaxy, for 252 and 253), the model section, instructor materials, Spanish strings. The unit registry
is not extended: a magnitude is a logarithm that needs a band, so it cannot be a factor of a dimension (the registry's
`mag` stays unconvertible by design), and the radiation kernel already holds Jy, mJy, f_lambda and the crossing between
them (`convertFlux`).

## Delta table (7.5, rule 9)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/kernels/radiation/` (Planck, `meanFluxJy`, `abMag`, `vegaMag` with the pack's offsets, `pivotWavelength`, `convertFlux`) | a point that carries band, convention, kind and epoch and is refused when it does not; a fit of temperature and angular radius to such points; nonsimultaneity; the integrated SED and its labelled tails | the SED view (not built), 252 | none: the kernel reuses `meanFluxJy`, `pivotWavelength` and `convertFlux` and adds no second band integral |
| `js/kernels/statistics/` (154: `chi2Quantile`, `chi2Sf`, `profileInterval`, `sigmaOfLevel`) | nothing | this kernel | none: the intervals are the statistics kernel's |
| `js/inference/fit.js` (Levenberg-Marquardt, profiles, covariance) | not used: the scale is exact in log flux, so the only nonlinear parameter is ln T and a one-dimensional profile is the fit | none | none (the reduced chi-square scaling follows its convention) |
| `js/data/sky` bright-star colour temperature from B-V | a colour temperature from many bands with an interval and an adequacy test | none | none: that number is a different, single-colour quantity |

## Conventions and the point contract

- AB: f_nu = 3631 Jy x 10^(-0.4 m), the radiation kernel's constant (Oke and Gunn 1983). **astropy's `ABmag` is the
  48.60 mag definition, 3630.78 Jy, which differs by 6.0e-5 of the flux (6.5e-5 mag); the tree and astropy use two
  conventions of "AB" and leg B1 reports the difference as a failing comparison (below).**
- Vega: m_AB = m_Vega + (AB - Vega)_band with the offset of the bandpass pack (computed there from CALSPEC Vega with
  Vega = 0.03 mag in every band, the pack's own statement); a band without an offset has no Vega magnitude here.
- A flux density in Jy, mJy, W/m2/nm or erg/s/cm2/Angstrom is converted through the registry; a **band-integrated** value
  in a per-wavelength unit is refused because the band mean of f_lambda and the band mean of f_nu are different numbers.
- A band-integrated point is the photon-weighted mean f_nu through a band of the pack and is compared with the model
  **through its band**, never as f_nu at the pivot. Its wavelength is the pivot computed from the response (never typed).
  A monochromatic point states its own wavelength.
- Refusal codes: `kind`, `convention-unknown`, `no-bandpass`, `vega-offset-missing`, `band-flux-per-wavelength`,
  `wavelength`, `flux`, `sigma`, `error-too-large` (a flux error of half the flux or more), `duplicate-id`,
  `reference-epoch`; the fit refuses the whole SED at the first refused point and names its id.

## The fit

ln f_i = u + g_i(ln T), u = ln theta^2, g_i the log model per unit theta^2. The log-flux error of a magnitude is
0.4 ln 10 sigma; of a flux, sigma / f; a nonsimultaneous point's is widened in quadrature. The scale u is the weighted
mean of ln f_i - g_i, profiled out exactly, so chi-square is a function of ln T alone, searched on a 1200-node grid
(800 K to 50000 K) with 4-point Lagrange interpolation and refined by golden section. The temperature interval is the
set where the profile is within `chi2Quantile(level, 1)` of its minimum (the statistics kernel's `profileInterval`,
polished by bisection on the interpolated profile); the covariance of (u, ln T) is (J^T W J)^-1. Intervals are given
at 0.6827 and 0.95, and also scaled by the reduced chi-square when it exceeds 1.

What the result is: the **colour temperature** of the points through a blackbody, not an effective temperature, and not
corrected for interstellar reddening. It is **not constrained** (status `not-constrained`, no temperature returned,
only an `unconstrained` best fit) when there are fewer than three points (`too-few-points`) or when the profile does not
close inside the domain at the primary level (`temperature-open`). The result states the shortest and longest
wavelength of the points; `evaluateModel` labels `extrapolated: true` outside it. The fit is adequate when the
chi-square p-value is at least 0.01; a misspecified SED (an infrared excess) is flagged, not hidden.

## Nonsimultaneity

A point is nonsimultaneous when it has no epoch or its epoch differs from a stated reference by more than a stated
window; with an allowance v (a fractional flux amplitude; there is no default) its log-flux sigma becomes
sqrt(sigma^2 + v^2). Without an allowance nothing is widened and the result says it assumes simultaneity. The rule
assumes independent zero-mean variability equal to v; it is not a model of any star's variability.

## The integrated SED and the luminosity

F_data is the integral of f_lambda between the shortest and the longest point wavelength with a power law between
neighbours (a chord in log-log, exact for a power law, low across a curved peak, and a band-integrated point enters at
its pivot, an approximation of the same order). The model's tails below and above are returned only when asked, from the
fitted blackbody in closed form (the Planck integral of x^3 / (e^x - 1) by a Bernoulli series for x up to 1 and an
exponential series beyond), separately, labelled EXTRAPOLATED, with the fraction of the total they make. The
luminosity is 4 pi d^2 F with a distance the caller supplies (no default); its interval is lognormal from the standard
deviation of ln F over seeded parametric-bootstrap draws, in quadrature with 2 sigma_d / d. **The interval does not
contain the approximation error of the chords (about 2 percent for the committed stars), which is larger than the
statistical error of the committed points (0.7 to 0.9 percent); C2 fails for that reason (below).**

## Synthetic data

`makeSyntheticSed` returns the kernel's blackbody model through the bandpass pack plus seeded noise, with the truth
manifest (temperature, radius, distance, angular radius, luminosity, total flux, the excess, the seed and label). Scenes:
simultaneous, nonsimultaneous (listed points at an epoch offset, truth moved by independent factors), excess (a second
blackbody added in f_nu). The label begins `SYNTHETIC SED`. The four mid-infrared wavelengths of the point sets are
invented reference wavelengths of no instrument.

## Validation contract and measured table

Thresholds: `tests/fixtures/sed/thresholds.json`. Validator: `npm run sed:validate` (Node 22.23.4, about 12 s).
Oracle: `tools/sed-oracle/oracle.py` (Python 3.9.22, numpy 1.26.4, scipy 1.13.1, astropy 6.0.1; no Gravitas code).
Results: `tests/fixtures/sed/results.json`; failing legs: `tests/fixtures/sed/failed-legs.json`. 24 legs: 14 pass,
4 FAIL (left failing), 2 reported, 4 NOT RUN.

| Leg | What | Result |
|---|---|---|
| A1 | conversions against closed forms and the tree's zero points | pass (worst 0.7 percent of its bound) |
| A2 | band mean of a power law over a box band; band mean is not the pivot value | pass (7.3e-6 of 1e-5) |
| A3 | model plus tails equals sigma T^4 theta^2 | pass (0) |
| A4 | noise-free recovery of T, theta, L, 27 cases | pass (4e-12, 1e-12, 1.4e-11) |
| A5 | integrated luminosity against exact quadrature | pass (data only 3.7 percent of 8, with tails 3.1 percent of 5) |
| B1 | conversions against astropy.units | **FAIL**: 6.04e-5, the AB zero point (48.60 mag against 3631 Jy); the f_lambda to f_nu routes agree to 2e-16 |
| B2 | band means and pivots against numpy, scipy and astropy | **FAIL**: mean 1.76e-5 (bound 5e-6), pivot 4.46e-5 (bound 2e-6): the radiation kernel's 1 nm trapezoid and its pivot on unrefined band nodes |
| B3 | the fit against scipy least_squares and brentq | pass (T 8.5e-7, theta 1.2e-6, chi-square 6.1e-6, interval ends 8.5e-7) |
| B4 | chord integral and tails against scipy | pass (7e-16, 5e-15) |
| B5 | a cited independent tool on authentic points | NOT RUN (no file) |
| C1 | temperature coverage, 300 realisations | pass (0.670, 0.970) |
| C2 | integrated-luminosity coverage, 150 x 200 draws | **FAIL**: 0.033, 0.220 (bands 0.55 to 0.80, 0.88 to 0.995) |
| C3 | coverage with nonsimultaneous points and the widening rule | pass (0.680, 0.950) |
| C4 | REPORTED: the same without widening | coverage 0.280, 0.563; 80 percent flagged inadequate (with the rule: 1 percent) |
| D1 | two points are not constrained | pass |
| D2 | every refusal by its code | pass (13 of 13) |
| D3 | Rayleigh-Jeans-only points do not fix a temperature | **FAIL**: refused in 72 percent (bound 98); the control is constrained in 100 |
| D4 | an infrared excess is flagged | pass (100 percent flagged, 0.5 percent false alarms) |
| D5 | no silent extrapolation | pass |
| D6 | the widening rule in closed form | pass |
| E0, E1, E3 | rights per source, an authentic star, catalogue colours against the spectrum | NOT RUN (nothing supplied) |
| E2 | REPORTED: the four SDSS spectra of the pack through the pack's bands | see below |

**E2 (reported, not judged).** Synthetic photometry of the pack's four SDSS spectra through V, R, r and i (the bands
wholly inside the spectrum), blackbody fit, with the pipeline temperature the pack records beside it: A0, colour
temperature 7609 K (68 percent 7378 to 7858) against 7852 K; G2, 7144 K against 5625 K; K3, 4176 K against 4775 K; M1,
2944 K against 3980 K, the last with a chi-square p of 4e-4 (inadequate). The points come from one spectrum and are not
independent measurements, the angular radius is not reported because the spectra are not flux calibrated absolutely,
and the differences are the lesson about a colour temperature being a different quantity from an effective one. The
band-integrated and pivot-monochromatic AB magnitudes differ by up to 0.2 mag for the M dwarf (r).

## Findings the validation made

1. **Two ABs.** The radiation kernel's 3631 Jy and astropy's 48.60 mag zero point differ by 6.0e-5 of the flux. The
   kernel keeps the cited 3631 Jy (Oke and Gunn 1983) and the comparison fails as committed; it is a convention to
   state, not a physics error.
2. **The radiation kernel's own quadratures.** `meanFluxJy` refines a band to 1 nm and integrates by trapezoid (1.8e-5
   worst against the oracle, which agrees with an exact segment-by-segment Gauss-Legendre quadrature to 4e-16 on the
   five bands checked at 5772 K); `pivotWavelength` integrates a band
   on its own nodes and is 4.5e-5 off on the pack's bands (0.9 percent on a two-node box). Neither matters against a 2
   percent photometric error; both fail the committed oracle bounds.
3. **The luminosity interval omits its method's bias.** The integrated SED is low by about 2 percent for the committed
   stars (the chords and the band points placed at their pivots), and the bootstrap interval is 0.7 to 0.9 percent.
4. **Rayleigh-Jeans points sometimes fix a temperature.** In 28 percent of realisations four points from 12 to 100 micron
   at 5 percent still closed the interval (the committed star is 20000 K).
5. **Widening matters.** With three nonsimultaneous points and no allowance the 68 percent interval covered 28 percent
   of the time; with the allowance equal to the true variability it covered 68 percent.

## Follow-up legs (2026-11-05, Carl's ruling: failed legs stay failing, no bound moves)

New legs for the four open questions, committed first (`tests/fixtures/sed/followup/thresholds.json`, 0af41d8f, before any
code or run), validator `npm run sed:followup` (Node 22, about 20 s), independent oracle
`tools/sed-oracle/oracle-followup.py` (no Gravitas code), results `tests/fixtures/sed/followup/results.json`,
`failed-legs.json`. B1, B2, C2, D3 and E1 above stay on record unchanged; D3 stays failing with no new leg.

| Leg | What | Result |
|---|---|---|
| B1b | f_lambda routes against astropy (1e-12); AB magnitude scaling against astropy times z = 3631 Jy / 3630.78 Jy (1e-12); the zero-point difference REPORTED | **FAIL** on one sub-check, see below; routes 5.6e-16, scaling 1.9e-16 (34 comparisons) |
| B2b | band means and pivots against exact 40-point Gauss-Legendre, tolerance from the trapezoid's own Richardson estimate | pass: 56 comparisons, worst 0.44 of its own tolerance (tolerances 6.4e-8 to 1e-4) |
| C2b | luminosity interval by model-residual integration, C2's ensemble | pass: coverage 0.587 and 0.947 (bands 0.55 to 0.80, 0.88 to 0.995); noise-free total 1.4e-11 of truth (1e-8) |
| E1b | colour temperature against a published temperature, REPORTED with the adequacy flag | reported; the authentic row is NOT RUN (no `star.json`) |

**B1b.** The AB zero point is a definition difference and is reported, not judged: the tree's 3631 Jy is 1.00006044 times
astropy's 48.60 mag flux density (3630.7805 Jy), 6.562e-5 mag. With that constant factored out the conversions agree to
5.6e-16 (f_lambda routes) and 1.9e-16 (magnitude scaling). The leg fails as committed because its third sub-check, that the
kernel's value of the difference from its constants agrees with the reported value to 1e-12 relative, measures 1.2e-12:
the quantity is 6.6e-5, two algebraically equal routes (`2.5 log10(3631/z0)` and `-2.5 log10(z0/3631)`) differ by about
1e-16 absolute, which is 1.2e-12 of it. That is the conditioning of a small number, not a conversion error, and the bound
is mine; it stays failing. A bound on the absolute difference (1e-15 mag) would pass, and is Carl's to set.

**B2b.** The rule is stated in the thresholds: a trapezoid's error is O(h^2), estimated as 3 |T_h - T_(h/2)| / |T_h|
(every interval split at its midpoint), floor 1e-9, per band and temperature, computed before the oracle was read. The
radiation kernel's 1 nm trapezoid and its pivot on the band's own nodes are inside that rule on every band: B2's failure is
the oracle's tolerance, not a defect of the radiation kernel beyond its stated order.

**C2b.** `bolometricLuminosity(points, { integration: 'model-residual' })` integrates the exact fitted blackbody between the
first and last wavelength and adds the trapezoid integral of each point's residual from the model (the point's monochromatic
equivalent, so band points need no pivot guess); the tails are added as before and labelled extrapolated, and the result
carries `modelAdequate` and says when the data-range flux is model-dependent. The default 'chords' is unchanged. On the same
150 realisations the chords cover 0.033 and 0.220 (mean ratio to truth 0.9786) and the residual method 0.587 and 0.947
(mean ratio 0.9999). It removes the chords' bias for a source the blackbody fits; for a source it does not fit, the flag is
the warning and the residual is only as good as its trapezoid.

**E1b (reported).** The four SDSS spectra of the pack through V, R, r, i at 0.02 mag, the pipeline temperature as the
published value: A0 7609 K (68 percent 7378 to 7858) against 7852 K (-1.0 sigma, adequate, p 0.47); G2 7144 K against 5625
K (+7.3 sigma, adequate, p 0.84); K3 4176 K against 4775 K (-9.0 sigma, adequate, p 0.98); M1 2944 K against 3980 K
(-31 sigma, inadequate, p 3.6e-4). Four bands and two parameters leave two degrees of freedom, so the adequacy flag
does not detect that a colour temperature is not an effective temperature: only the M dwarf is flagged. Every result
carries the label that the temperature is a colour temperature, not an effective one, not corrected for reddening, and that
is the only statement the leg commits. Nothing is claimed about any real star until `authentic/star.json` arrives.

**Follow-up verdict (committed function, recorded statuses).** Kernel C: B1b fails as committed and D3 still fails. The
conversion group would pass with B1b's third sub-check reset (verdict B); the fit group still fails on D3. The first gate's
verdict is not recomputed.

## Open questions for Carl

See `SED_GATE.md`, "Questions for Carl".

## Inherited limits to state in claims built on this kernel

- The temperature is a blackbody colour temperature of the points, not an effective temperature; a real star's differs
  (E2). The angular radius and luminosity of the fit are those of a blackbody with that colour.
- No correction for interstellar reddening is made.
- The integrated luminosity is low by the chords' bias and its interval does not include it (C2).
- Every SED the kernel has been run on is synthetic or derived from one spectrum; no authentic multiwavelength star
  has been run (E1 NOT RUN).
- The pack's bands end at 2.2 micron; a longer-wavelength point is monochromatic at the wavelength its source states.

## References (all as cited in the bandpass pack in the tree)

Oke and Gunn 1983, ApJ 266, 713 (AB); Bessell and Murphy 2012, PASP 124, 140 (photon-counting bands, the
photon-weighted mean); Bohlin 2014, AJ 147, 127 (CALSPEC Vega, the pack's offsets); Fukugita et al. 1996, AJ 111, 1748
(SDSS).

<!-- Listed in DOCUMENTS.md. -->
