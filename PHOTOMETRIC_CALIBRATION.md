# Photometric calibration

Roadmap III, Prompt 212 (tranche T3, D-R10-207-01). Branch `feat/photometric-calibration`. The kernel is
`js/kernels/detector/photcal.js` (beside `reduce.js`); the instrument is the `photometric-calibration` panel in its own lazy
family; the investigation is "Counts to Magnitudes". The validation contract below was committed (with
`tests/fixtures/photometric-calibration/thresholds.json`) before any kernel, oracle, panel or lesson existed.

**Two extinctions, never one.** This page, the panel and the lesson are about **atmospheric (site) extinction**: the dimming of
starlight by the air above the telescope, `k` in magnitudes per airmass, which depends on the site, the night and the band.
**Interstellar extinction** (the radiation kernel's Cardelli, Clayton and Mathis law, `A_V` and `R_V`, corrected and explained in
Prompt 125) is the dimming by dust between the star and the solar system, which depends on the star's direction and distance. They
are different quantities with different units, different causes and different corrections; no number crosses between them.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/kernels/detector/snr.js` `extinctionMag` and `planExposure` take a zero point at the zenith and a coefficient `k` as inputs | where a zero point and a coefficient come from: a fit to standard stars, with its uncertainty | the panel, the lesson, `js/instruments/exposure.js` (a measured zero point replaces a supplied one) | none: the planner keeps its own `k (X - 1)`; this kernel uses the same convention, so the two agree by construction (checked in A5) |
| `js/kernels/detector/reduce.js` `aperturePhotometry` and `differentialMagnitude`; `js/measure/photometry.js` (Prompt 180) turn pixels into net counts, and counts into a magnitude relative to a comparison star | the step from counts to a catalogue magnitude: the zero point, the colour term, the extinction | F1 (frames), the panel | none |
| `js/kernels/sky/moon.js` `airmass` (Kasten and Young) | nothing: the calibration reads it (leg A6) and defines no airmass of its own | the calibration, the panel's "sky" control | none |
| `js/data/instruments.js` (Prompt 209): Rubin's adopted extinction coefficients per band, with sources; the Las Cumbres sites state none | a reader that returns the cited coefficient or nothing | `js/instruments/photcal.js`, D3 | none |
| `js/platform/artifact.js` (Prompt 150): `not-constrained`, `failed`, `fit` records and `correlatedWith` | a producer for a calibration | R1 | none |

## Equations, limits, assumptions

* **Instrumental magnitude.** `m = -2.5 log10(N / t)` for `N` net counts (or electrons) in `t` seconds; `sigma_m = (2.5 / ln 10) sigma_N / N`.
  The zero of this scale is one count per second.
* **The calibration equation, one band.** With `M` the catalogue (standard-system) magnitude of a standard star, `X` its airmass
  and `C` its catalogue colour index (for example B - V):

  `M - m = Z1 - k (X - 1) + c C`   (optionally `- k2 C (X - 1)`)

  `Z1` is the zero point **at unit airmass**, the exposure kernel's convention (`extinctionMag = k (X - 1)`), so a zero point
  found here is the planner's `zeroPoint` in magnitudes; the zero point outside the atmosphere is `Z0 = Z1 - k`. `k` is the
  first-order extinction coefficient, `c` the colour term, the dependence of the instrument's magnitude on the star's colour
  through the mismatch of the instrument's response and the standard system's; `k2` is the extinction's own dependence on
  colour (a blue star is dimmed more than a red one in a band, so a star's extinction depends on its colour, the "second-order"
  extinction of the textbooks), fitted only when the night constrains it.
* **The fit.** Weighted linear least squares with weights `1 / (sigma_m^2 + sigma_M^2)`. The covariance is `(A' W A)^-1`; where the
  chi-square rejects the fit (p < 0.01) the covariance is multiplied by `chi2 / dof`, the interval then uses Student's t with the
  fit's degrees of freedom, and the flag `lack-of-fit` says so. The errors of the standards' colours are neglected in the
  weights (their effect on `c` is `c sigma_C`, 0.001 mag for `c = 0.1`; measured in A9).
* **The colour equation.** A target's colour is not given by a catalogue; it comes from its two instrumental magnitudes through a
  second equation, `C = mu c_inst + Zc - kc (X - 1)` with `c_inst = m_b - m_v`, fitted on the same standards. The slope `mu` is
  usually near 1. The regression of the catalogue colour on the noisy instrumental one is attenuated slightly by the noise in the
  regressor; for the stated noise it is below the precision of `mu` (stated, not corrected).
* **The calibrated magnitude.** `M_t = m_t + Z1 - k (X_t - 1) + c C_t` with the variance `sigma_t^2 + a' S a + (c sigma_C,t)^2`,
  where `a = (1, -(X_t - 1), C_t)` and `S` is the fit's covariance. The interval is the normal one at the stated level while the
  errors are taken at face value, Student's t when the fit rescaled them.
* **Limits that refuse.** A standard at airmass above 2.5 is excluded with a flag (the linear law, the plane of the atmosphere
  and the Kasten and Young formula are not trusted there, and a band's extinction is not constant over a long path: the Forbes
  effect); a target above it is refused. Fewer than three standards, or colours spanning less than 0.3 mag, leave the colour term
  `not-constrained`: it is dropped, the zero point is refit, a stated systematic `0.1 |C_t - mean C|` (a colour term of 0.1 is
  the largest a good V-like filter has) is added to the target and `colour-term-not-constrained` is raised. An airmass span
  below 0.3 leaves `k` not constrained: with the site's cited coefficient as a prior the fit is full rank and says so
  (`extinction-from-prior`); without one the zero point at unit airmass is not constrained and a target far from the
  standards' airmass is refused.
* **Assumptions stated where a student can look for them:** the extinction is constant through the night; the standards'
  catalogue magnitudes are right; the instrumental magnitudes are free of aperture, flat-field and linearity errors; the
  linear equations hold over the colour range of the standards; the colour term is the same for every star type and
  luminosity class.

## Validation contract (committed first)

Seeds: oracle 212; harness 2120001; ensemble prefix `photometric-calibration-212`. Bounds are in
`tests/fixtures/photometric-calibration/thresholds.json`; this table is its summary and the file wins.

| Id | Leg | What is held |
|---|---|---|
| A1 | (a) analytic | a noise-free night recovers Z1, k, c (and k2) to 1e-6 |
| A2, A3 | (a) closed form | the constant-only and the straight-line (Z1, k) fits equal their closed forms to 1e-12 and 1e-10, parameters and covariance |
| A4 | (a) Bouguer | two airmasses give k = dm / dX exactly |
| A5, A6 | (a) conventions | magnitudes and sigma; Z0 = Z1 - k; the zenith convention of the exposure kernel; the sky kernel's airmass against an independent evaluation of the published formula |
| A7, A8, A9 | (a) colour and propagation | the colour equation; the calibrated variance against an independent evaluation and a Monte Carlo of the parameters; what neglecting the standards' colour error costs |
| B1 to B4 | (b) oracle | the same nights solved by numpy `lstsq`, Astropy's `LinearLSQFitter` and SciPy's `least_squares` (three solvers that agree to 1e-8), generated by numpy's own generator: parameters 1e-7, covariance 1e-6, calibrated magnitudes 1e-7; the second-order night |
| P1 to P3 | (b) physical | blackbody standards through the pack's Johnson V, B and SDSS g under a stated Rayleigh plus aerosol atmosphere: the colour term and the extinction coefficients against an independent integration; the limit of a linear calibration |
| C1 to C3 | (c) coverage | 2000 seeded nights: the 68 and 95 percent intervals cover in their binomial windows, the pulls are unit; errors told 2 times too small are caught and the rescaled interval still covers; the false-alarm rate is at most 2 percent |
| D1 to D7 | (d) refusals | two standards, the airmass limit, an unconstrained extinction, a narrow colour span, a misspecified night, bad inputs, an unknown colour |
| F1 | frames | three synthetic frames through the detector kernel and Prompt 180's photometry recover the zero point and the extinction |
| R1, R2 | records | the artifact envelope validates and carries the not-constrained states; the adapter returns the library's cited coefficient or nothing |
| E1 | (e) authentic | NGC 2420, SDSS DR18 g against Gaia DR3 G with BP - RP as the colour, from the repo's own packs |

A crossed bound is a failed leg, left failing in `tests/fixtures/photometric-calibration/failed-legs.json` and labelled; only
Carl resets one.

## Results

`npm run photcal:validate` runs every leg live; `tests/photometricCalibration.test.js` runs it in a child process and holds the
four failed legs to their recorded findings. Thirty rows pass, four fail, and one is a report.

| Leg | Measured |
|---|---|
| A1 to A9 | exact to 1e-13 (parameters, covariance, conventions); the calibrated variance equals an independent evaluation and a Monte Carlo of the parameters to 0.2 percent |
| B1 to B3, B5 | kernel against the oracle's numpy, Astropy and SciPy solvers: parameters 1.7e-13, covariance 5.3e-13, calibrated magnitudes 1.8e-13; the shared-catalog-error model against an explicit block covariance 1e-13 |
| B4a | the second-order night recovers k2 = -0.0297 (truth -0.03, sigma 0.0048) |
| P1, P2 | the physical blackbody night: colour term -0.6511 (oracle -0.6511), extinction 0.2741 (oracle 0.2741), k2 -0.0252 |
| C1, C3 | 2000 nights: 68 percent interval covers 0.6775, 95 percent 0.9515; pull standard deviations 0.97 to 0.99; false alarms 0.012 |
| D1 to D7 | two standards, the airmass limit, a narrow night, a narrow color span, a misspecified night (first order flagged 0.99, second order 0), bad inputs and an unknown color all refuse or flag as committed |
| F1 | frames through the detector kernel and the Observatory's aperture photometry recover Z1 and k within their errors |
| R1, R2 | the record validates (artifact/2, rank deficient with the colour term named); the Rubin coefficients are read as cited, the Las Cumbres sites return nothing |

## Failed legs (kept failing, labelled; only Carl resets a bound)

1. **B4b.firstOrder.lackOfFit.** On the second-order night the first-order fit's chi-square (p 0.133) does not see the
   colour-dependent extinction: it is absorbed into c and k. The nested test (D5b) does (delta chi-square 38.1, p 7e-10).
2. **P3.physical.limit.** The errors pass (first order -0.0107 mag, second order +0.0002 mag, as the oracle), but the clause
   that the first-order interval covers the truth "not less often" is the wrong way round: it covers 0.685 of draws against 0.970.
3. **C2.coverage.underestimated.** Errors told 2 times too small are flagged in 0.977 of nights against a bound of 0.99;
   every flagged interval is wider and the rescaled interval covers 0.942.
4. **E1.authentic.** NGC 2420, SDSS g against Gaia G with BP-RP (547 matched, 531 kept): the colour term is +0.901 (the bound's
   sign was wrong) and the held-out star's interval covers 0.743 against 0.90, because its catalog error is not scaled by the lack
   of fit; scaled as the standards' are, it covers 0.962 (report E1.holdout.scaled). The independent oracle reproduces the
   cross-match exactly (E1.oracle).

## The panel, the lesson and the notebook

* `js/photcalWidgets.js` (lazy family `photcal`, panel `photometric-calibration`): a synthetic night (clear, one narrow airmass
  range, colour-dependent extinction), the fit with its uncertainties, the Bouguer line and the residuals through the plot
  component, a target calibrated with its 95 percent interval, a switch for the cited-coefficient prior and the second-order
  model, a "show the truth" row, and a keep button.
* `js/photcalKeep.js` keeps a calibration as an `artifact/2` envelope in the notebook (source `photometric-calibration`, digest of
  the night's observations).
* The investigation "Counts to Magnitudes" (`js/data/investigations/photometric-calibration-sequence.js`, one closure file)
  has 6 core, 8 quantitative and 5 advanced steps in English and Spanish; `tests/photometricLessons.test.js` recomputes every
  number a step states.
* The extinction everywhere here is the atmosphere's, in magnitudes per airmass. The interstellar extinction of the radiation
  model is never read, added or confused with it.

## Limits

One straight line in airmass and in colour; constant extinction through the night; the catalog magnitudes taken as right (their
errors are shared among a star's measurements); no aperture or flat-field error; synthetic nights with a stated truth. The
authentic leg is one cluster in two catalogs, not a calibration of a real night of an instrument; no authentic night of
standard-star frames was measured, and one is requested, not claimed.
