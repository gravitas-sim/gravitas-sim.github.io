# Sky coordinates for an image: WCS-lite and registration

Roadmap III, Prompt 181. A frame's pixels become sky coordinates only with a
calibration. This file is written in the order the work was done: the
validation contract first, and the rest after the measurements.

## The validation contract (committed first)

The thresholds are in `tests/fixtures/astrometry/thresholds.json` and were
committed, with this section, before `js/measure/astrometry.js`, the oracle's
fixtures or any measurement existed (the branch history shows the order). A
check that a measurement crosses is a failed check, not a reason to move its
bound; only Carl resets one. The checks follow the roadmap's section 7.5.8.

**The model.** Standard coordinates `(xi, eta)` (east and north, on the plane
tangent to the sky at a reference position, the TAN or gnomonic projection)
and a linear map to pixels, `pixel = p0 + P (xi, eta)`: six parameters (the
affine model, which allows two scales and a skew) or four (the similarity
model: one scale, one rotation, a stated parity). `p0` is the reference pixel
(CRPIX), the inverse of `P` is the CD matrix. The fit is ordinary linear least
squares on the stars' pixels, weighted by their stated uncertainty, through
`js/numeric/linalg.js` (Prompt 152). There are no distortion terms.

**Rules fixed in advance.** At least 3 matched stars; the smallest-to-largest
principal spread of the stars' tangent-plane positions at least 0.02, else the
configuration is collinear and the fit refuses; every star within 60 degrees of
the reference position; a solution is called consistent when the chi-squared
survival probability of its residuals is at least 0.001 (and says that no check
is possible when it has no degree of freedom). Registration needs 3 sources
spread at least 1 pixel (rms) about their centroid.

**(a) Analytic cases.** A synthetic frame of a known WCS (five real stars of the
bright-star pack, J2000.0, projected through a truth WCS at 90 arcsec a pixel)
recovered from the five stars without noise to 1e-5 arcsec over a 21 by 21 grid
(scale 1e-9 relative, position angle 1e-8 degree, reference pixel 1e-7 pixel),
and with noise of 0.1 pixel to within 3.5 of its own stated sigma over the grid;
the default choice of tangent point (the stars' mean direction) on a 1.4 degree
field within 0.1 pixel; registration of two frames with a known shift and
rotation to 1e-9 pixel without noise and, with 0.05 pixel of noise on twelve
sources, to within 0.1 pixel; the projection against the sky kernel's
unit-vector transforms and against the page's own reader (`js/observatory/wcs.js`)
to 1e-9 degree, and the round trip to 1e-7 pixel.

**(b) An independent oracle.** `astropy.wcs` (wcslib), `astropy.wcs.utils.fit_wcs_from_points`
and `scipy.linalg.orthogonal_procrustes`, run offline in a throwaway virtual
environment (no Gravitas code), pinned as fixtures with versions, parameters,
retrieval and digests: pixel to sky of the synthetic truth to 1e-9 degree; the
noisy five-star fit against astropy's on the same stars and tangent point to
0.01 pixel at 25 sky points; the registration to 1e-9 radian and 1e-8 pixel;
the authentic TESS header of the repository (a TAN header of CDELT and PC) read
by `fromHeader` against astropy on every pixel to 1e-9 degree. **Not run until
Prompt 189:** a pinned astropy solution on an authentic frame with matched
reference stars (b5, e1): nothing was downloaded and nothing fabricated.

**(c) Coverage.** On a fixed seeded ensemble (3,000 trials, 5 to 8 stars, random
truth), the stated sigma covers the truth at 64 to 72 percent for one sigma and
93.5 to 97.5 percent for 1.96 sigma, for the sky offset at five test pixels, the
reference pixel, the mean scale and the position angle: for the affine model,
the similarity model, and with the catalogue's own noise; for registration, the
shift at five pixels and the rotation. The false-alarm rate of the consistency
test on matched trials is at most 0.4 percent.

**(d) Refusals.** Three collinear stars refuse (`collinear`), as do a spread
ratio of 0.01 and fewer than three stars (`too-few`); stars beyond 60 degrees
(`too-wide`); malformed input; an unsupported projection (SIN, ARC, ZPN, AIT,
CAR, SIP, TPV, galactic axes, a third axis, a missing or singular matrix) is
refused by name by the header reader; a mismatched catalogue (two entries
swapped) produces residuals that fail the consistency test in at least 99
percent of 500 trials and the verdict says so; so does a mismatched pairing in
registration. Every solution carries its residuals.

**(e) Authentic data.** One authentic frame with reference stars under a fixed
analysis contract. **Not run until Prompt 189.**

## What was built

- `js/measure/astrometry.js`: the model, the fit, the registration and the
  header reader, with no import but `js/numeric/linalg.js`. A solution carries
  its parameters, their covariance, the residuals (pixels and arcseconds), the
  chi-squared, the degrees of freedom and a verdict (`consistent`,
  `inconsistent` or `exact`); a refusal is `{ ok: false, status:
  'not-constrained', code, message, data }`.
- `js/measure/calibrationRecord.js`: the `gravitas.image-calibration/1` block
  (workspace field `calibration`, written only when a calibration exists), its
  validator, the replay that re-runs the fit from the stored stars and checks it
  against the stored numbers, and the ledger entry (notebook source
  `image-calibration`).
- `js/observatory/imageCalibration.js`: the lazy panel on the Observatory
  route: a reference-star table (typed, from the marks panel's points, or looked
  up by name in the bright-star pack with its proper motion carried to the
  image's epoch), the model and parity, the residual table and verdict, the
  pixel-to-sky and sky-to-pixel readouts with their uncertainty, the reader for
  the image's own header, and Keep in the ledger.
- `tools/astrometry-validate.mjs` (the checks below), `tools/astrometry-oracle/`
  (the offline oracle) and the pinned fixtures in `tests/fixtures/astrometry/`.

Registration (two frames, rotation plus shift) is complete as a kernel, with
tests and an oracle, and has no page of its own yet: its first consumer is the
blink and the stacking of the next prompts, which hold two frames.

## The equations

The reference position `T = (alpha0, delta0)`. For a star at `(alpha, delta)`,
with `cos c = sin delta0 sin delta + cos delta0 cos delta cos(alpha - alpha0)`,

    xi  = cos delta sin(alpha - alpha0) / cos c
    eta = (cos delta0 sin delta - sin delta0 cos delta cos(alpha - alpha0)) / cos c

and the pixel is `p = p0 + P (xi, eta)` (radians). With `n` stars, the fit
solves `min sum_i |p_i - p0 - P t_i|^2 / sigma_i^2` over the six numbers of
`(p0, P)` by the normal equations on centred and scaled `t_i`, by Cholesky
(`invertSpd`). The similarity model restricts `P` to one scale and one rotation with the
stated parity, which is linear in two numbers (`a`, `b`) and is solved the same
way. A second pass adds
the catalogue's sigma, projected through the first pass's scale, to each star's
pixel sigma. The derived numbers (scale `sqrt|det P|`, per-axis scales, the
position angle of the +y axis east of north, skew, axis ratio, parity) get their
sigmas by the delta method; `uncertaintyAt` has the analytic Jacobian for the
sky position at a pixel.

Registration is the weighted Procrustes problem for rotation `R(theta)` and
translation `t` with `b_i ~ R a_i + t`: the closed form on the weighted
centroids, `theta = atan2(sum (a x b), sum (a . b))`, with the residual
distribution and `sigma_theta`, `sigma_centre` from the stated source sigmas.

## Limits, said on the page

- **No distortion terms.** A TAN projection with a linear map is right for a
  field of a few degrees or less. A tangent point far from the stars' mean
  direction is a second-order systematic the fit does not model. The page says
  so beside the result.
- **Three stars fix an affine solution exactly.** With zero degrees of freedom
  nothing checks the match; the verdict says `exact` and the page says that no
  check is possible. Five stars give four degrees of freedom.
- **The header is read, not solved.** A header WCS is shown as read, with no
  residuals, and a header in a projection this page does not do (SIN, ARC, ZPN,
  AIT, CAR), a distortion convention (SIP, TPV) or non-equatorial axes is
  refused by name.
- **The fit does not identify the stars.** The pairing of pixels with catalogue
  entries is the user's; a wrong pairing shows as inconsistent residuals (500 of
  500 swapped-pair trials), and a consistent verdict is not a proof of a right
  pairing.
- **A saved calibration is bound to its pixels.** The block carries the frame's
  digest; another frame's pixels refuse it.
- **Older readers.** The WCS matrix nests deeper than the 2.0.0 file reader
  allows, so that reader refuses a file with a calibration as nested too deep
  (the compatibility row `workspace-calibration`, expected refused); the
  current reader reads it.

## The independent oracle

`astropy.wcs` (wcslib) and `fit_wcs_from_points`, with
`scipy.linalg.orthogonal_procrustes`: astropy 6.1.7, scipy 1.15.3, numpy 2.2.6,
Python 3.10.12, retrieved 2026-10-23 in a throwaway virtual environment (the one
Prompt 180 made, reused, nothing added) and run with `-I` from an empty
directory. No Gravitas code ran in it. The inputs are built by
`tools/astrometry-oracle/make-inputs.mjs`, the results are in
`tests/fixtures/astrometry/oracle-results.json`, and
`oracle-provenance.json` carries the versions, the parameters, the command and
the digests. To re-run it: the command in the provenance file, then Prettier.

## Validation results

`npm run astrometry:validate` runs every row below; the bound is the one
committed before the module existed (`thresholds.json`). 27 rows, 25 pass, 2
not run, 0 failed.

| Check | Measured | Bound | Verdict |
| --- | --- | --- | --- |
| a1 recover, noiseless | 3.7e-11 arcsec | 1e-5 | pass |
| a1 recover, five stars | worst 1.92 sigma | 3.5 | pass |
| a2 default tangent | 0.0028 px | 0.1 | pass |
| a3 registration, noiseless | 1.6e-13 px | 1e-9 | pass |
| a3 registration, 0.05 px noise | 0.055 px | 0.1 | pass |
| a4 projection vs the sky kernel, and vs the page | 4.8e-14, 5.7e-14 deg | 1e-9 | pass |
| b1 oracle projection | 5.6e-14 deg | 1e-9 | pass |
| b2 oracle fit | 0.0018 px | 0.01 | pass |
| b3 oracle registration | 3.3e-17 rad, 3.4e-13 px | 1e-9, 1e-8 | pass |
| b4 oracle on the authentic TESS header | 1.1e-13 deg over 1,023 px | 1e-9 | pass |
| b5 oracle on an authentic fit | | | NOT RUN until 189 |
| c1 coverage, affine (1 sigma, 1.96 sigma) | 0.693, 0.953 | 0.64-0.72, 0.935-0.975 | pass |
| c2 coverage, similarity | 0.693, 0.953 | same | pass |
| c3 coverage, with catalogue noise | 0.684, 0.952 | same | pass |
| c4 false alarm of the consistency test | 0.0013 | 0.004 | pass |
| c5 coverage, registration | 0.685, 0.951 | same | pass |
| d1 collinear refused | 200 of 200 | all | pass |
| d2 too few, d3 near-collinear edge | refused / refused at 0.01, solved at 0.05 | as stated | pass |
| d4 mismatched catalogue detected | 500 of 500 | 0.99 | pass |
| d5 unsupported projections refused by name | all | all | pass |
| d6 too wide | refused | refused | pass |
| d7 malformed input | 5 of 5 refused with the right code | all | pass |
| d8 registration refusals | 500 of 500 flagged | 0.99 | pass |
| d9 residuals always present | yes | yes | pass |
| e1 authentic frame under a fixed contract | | | NOT RUN until 189 |

**A defect in the harness, found on the first run.** The first run of d7 failed:
the duplicate-pixel case replaced the wrong star, so the case under test was
not duplicated. The module was right and the harness was wrong. The harness was
fixed (the duplicate case is appended after the four others); no threshold was
moved. Every other row passed on its first run.

## Not run until Prompt 189

b5 (a pinned astropy solution on an authentic frame with matched reference
stars) and e1 (one authentic frame under a fixed analysis contract) need an
authentic frame with a catalogue match, which Prompt 189 lands. No frame was
fetched, none was simulated, and the numbers above do not stand in for them.
The Spanish text of the panel was written without a fluent reader and is
unread by one.

# Astrometric time series: motion and well-sampled parallax

Roadmap III, Prompt 186. Positions of one source at several epochs, fitted over
time. This part of the file is written in the order the work was done: the
validation contract first (below), and the rest after the measurements.

## The validation contract for the time series (committed first)

The thresholds are in `tests/fixtures/astrometric-series/thresholds.json` and
were committed, with this section, before `js/measure/astrometric-series.js`,
the oracle's inputs, script and results, the validation tool or any measurement
existed (the branch history shows the order). A check that a measurement
crosses is a failed check, not a reason to move its bound; only Carl resets
one. The checks follow the roadmap's section 7.5.8.

**The model.** Standard coordinates `(xi, eta)` (east and north on the plane
tangent to the sky at a reference direction, the normalised mean of the
positions' unit vectors unless the caller names one), in arcseconds. Every fit
is weighted linear least squares on the two coordinates of each epoch with the
stated, independent per-axis uncertainties. The proper-motion model is
`xi = x0 + mux (t - tRef)`, `eta = y0 + muy (t - tRef)`, `tRef` the
inverse-variance-weighted mean epoch, `mu` in arcseconds per Julian year. The
joint model adds `p fx(t)` and `p fy(t)` with the Earth's barycentric position
`(X, Y, Z)` in au in the equatorial frame,
`fx = X sin a - Y cos a`, `fy = X cos a sin d + Y sin a sin d - Z cos d` at the
reference direction `(a, d)`; `p` is in arcseconds and the distance is `1/p`
parsecs. The Earth's position comes from the repository's own ephemeris pack
(2025 to 2045, TDB) plus the Sun's offset from the barycentre, with Saturn,
Uranus and Neptune from the sky kernel's elements; nothing is fetched.

**Rules fixed in advance.** A proper-motion fit needs 2 epochs at least one day
apart (3 for any check of the residuals; with 2 the verdict is `exact`). A
joint fit needs at least 8 epochs, a span of at least 0.9 year, and epochs in
at least 3 of the 4 sectors of the Earth's heliocentric ecliptic longitude;
otherwise it says `not-constrained`, with the code and the numbers. A fit is
consistent when the chi-squared survival probability of its residuals is at
least 0.001. A distance is never shown without its interval (the image of the
chi-square profile interval of the parallax at 0.6827 and 0.95, open above when
the parallax interval reaches zero) and its reference-frame statement: the
parallax is **relative to the reference frame of the positions**, not absolute,
and a correction to absolute is applied only when the caller gives its size and
its source. A two-epoch shift always carries the label "shift under a
fixed-motion assumption; not a parallax" and has no parallax field.

**(a) Analytic cases.** Noise-free linear motion in a named tangent plane
recovered to 1e-9 arcsec (and arcsec a year); a three-epoch case with unequal
weights solved by hand to 1e-10 relative; the two-epoch displacement and its
uncertainty exactly; the parallax factors against closed forms on a circular
Earth orbit (pole: a circle of radius 1; ecliptic: a line of length 1; latitude
b: semi-minor axis |sin b|) to 1e-12; a one-year, well-sampled noise-free
spherical series (24 epochs, `p` = 0.12 arcsec, two sky positions) recovered to
1e-5 arcsec and arcsec a year; the time-scale conversions (TT - UTC = 69.184 s,
TDB - TT below 1.7 ms, MJD = JD - 2400000.5); the chi-square profile of `p` by
refitting equal to the analytic quadratic to 1e-9.

**(b) An independent oracle.** `astropy.coordinates.get_body_barycentric` and
`astropy.time` (ERFA: epv00, the leap-second table), `scipy.optimize.least_squares`
(method lm, on the exact spherical model, with the Earth's position from
ERFA) and `scipy.optimize.curve_fit`, run offline in a throwaway virtual
environment, no Gravitas code, pinned as fixtures with versions, parameters,
retrieval and digests. The pack's barycentric Earth against ERFA's at 365 dates
to 1.5e-4 au (and 5e-5 au after removing a straight line from each two-year
window, which is what a parallax series sees); noise-free series made in Python
with ERFA's Earth and fitted here with the pack's: parallax to 0.05 percent
and proper motion to 5e-5 arcsec a year; three noisy series fitted by scipy's
nonlinear least squares on the exact spherical model against this fit: each of
`p`, `mux` and `muy` within 0.1 formal sigma, the formal sigma of `p` within
0.2 percent, chi-squared within 0.5 percent; the proper-motion fit against
`curve_fit` to 1e-8; UTC to TT and TDB of 40 dates against astropy to 1 microsecond
and 0.1 millisecond. **Not run until Prompt 189:** an authentic series under a
fixed analysis contract (b6, and the roadmap's tier (e)): no authentic series is
held, none was fetched, none was simulated.

**(c) Coverage.** On fixed seeded ensembles (3,000 trials each) the stated sigma
covers the truth at 64 to 72 percent for one sigma and 93.5 to 97.5 percent for
1.96 sigma, for `p`, `mux` and `muy` of the joint fit, for `mux` and `muy` of
the proper-motion fit, and for the two-epoch displacement; the distance
interval covers the true distance at the same rates in the symmetric regime (`p`
about 100 sigma, never open) and in the asymmetric one (`p` = 2.5 sigma, open
ones counted, the interval's mean upper-to-lower arm ratio at least 1.5); the
false-alarm rate of the consistency test is at most 0.4 percent.

**(d) Refusals and negative cases.** The joint fit refuses two epochs, seven
epochs, a span of 0.5 year, epochs in two sectors and identical epochs, each
with its code, and solves a series that meets the rules exactly; the two-epoch
label appears on every one of 200 results; shifting a well-sampled year's epochs
by 45, 91.3, 182.6 or 273.9 days (a wrong time scale or origin) fails the
consistency test in at least 99 percent of 200 series each, and the hints and
the message name the epoch time scale; Julian dates declared as modified Julian
dates (and the reverse) and a series outside the ephemeris are refused with
`epoch-range`; malformed input is refused with the right code; one 12-sigma
outlier fails the test in at least 99 percent of 200 series and the residual
table finds it in at least 95 percent; a distance always carries its frame
statement and a correction without a source is refused; a true parallax of zero
leaves the 0.6827 distance interval open above in 80 to 88 percent of series
(0.841 expected).

**(e) Authentic data.** Not run until Prompt 189.
