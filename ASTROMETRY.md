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
reference stars (b5, e1): Prompt 189 ran the header leg on its frame and one
star's consistency, and b5 stays not run (one catalogued star in its frame; see
`IMAGE_PACKS.md`, contract part 2).

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
| b5 oracle on an authentic fit | 189 (authentic data): 17 Gaia stars measured at their predicted pixels in a TESS full-frame cutout, grid 1.8e-4 px from astropy | 0.01 px | pass for the variant that places the stars; the committed rule (detector centroids) matched 1 star and fails, recorded |
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
| e1 authentic frame under a fixed contract | 189: header 1.1e-13 deg over 143 px, reference star 0.17 px from its centroid (no fit) | 1e-9 deg, 0.5 px | pass; the fit is not run (R2) |

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
Update: Prompt 189 landed one authentic frame (11 by 13 pixels, one dominant star)
and ran the header leg and a one-star consistency on it, both passing; b5 and e1
as written stay not run for want of three catalogued stars (`IMAGE_PACKS.md`,
request R2).
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

## What was built for the time series

- `js/measure/astrometric-series.js`: `twoEpochShift`, `fitMotion`, `fitJoint`,
  the Earth provider `createEarth`, the epoch converter `epochJd`, the parallax
  factors, the distance interval, the Prompt 150 quantities and fit-result record,
  a replayable reduction and CSV rows. Its only imports are Prompt 152's linear
  algebra, `chi2Survival` of the calibration kernel above and Prompt 154's
  `profileInterval`; the Earth's position is a provider handed in, so the module
  imports no ephemeris. A refusal is `{ ok: false, status: 'not-constrained',
  code, message, data }`.
- `js/observatory/imageSeries.js` (with `js/i18n/{en,es}.imageSeries.js`): a lazy
  disclosure inside the sky-coordinates panel (`#obsSeriesPanel`). A table of
  epochs the reader types, pastes, or fills from the point mark of the open image
  (its tag, the frame's time with its scale, and the sky position and uncertainty
  from the calibration above: `ctx.marks.cal.sky`); a choice of two-epoch shift,
  proper motion, or parallax with proper motion; an optional reference-frame name
  and correction to absolute parallax (with its uncertainty and its required
  source); the parameters, the verdict, the distance with both intervals and the
  frame statement, the path and the residuals through the plot component with their
  tables, the residuals as CSV, and Keep in the ledger (notebook source
  `image-series`, a Prompt 150 fit-result record, the reduction that runs again).
  The ephemeris the joint fit needs is the repository's own sidecar
  (`/sky/ephemeris.json`), fetched when a joint fit is first asked for.
- `tools/astrometric-series-synth.mjs` (the synthetic series with a truth
  manifest), `tools/astrometric-series-validate.mjs` (`npm run
  astrometric-series:validate`), `tools/astrometric-series-oracle/` (the offline
  oracle) and the pinned fixtures in `tests/fixtures/astrometric-series/`.

## The equations

With `p` the parallax in arcseconds, `(a, d)` the reference direction and
`(X, Y, Z)` the Earth's barycentric position in au (equatorial, ICRS-aligned), the
apparent displacement in standard coordinates is `xi = x0 + mux t + p fx(t)` and
`eta = y0 + muy t + p fy(t)`, with

    fx = X sin a - Y cos a
    fy = X cos a sin d + Y sin a sin d - Z cos d

(the minus sign of a source seen from a moving Earth is in the factors: an Earth
on the +X axis shifts a source at a = 0 towards -Y, so `fx` is `-Y`). `t` is the
epoch less the weighted mean epoch in Julian years. The five parameters are fitted
by the normal equations on columns scaled to unit rms (`invertSpd`), with weights
`1/sigma^2` per axis; the covariance is the inverse of the normal matrix. The
profile of `p` is therefore exactly a parabola, `chi2(p) = chi2min + ((p - phat) /
sigma_p)^2`, and the interval is Prompt 154's `profileInterval` of that profile at
0.6827 and 0.95; the distance interval is `[1 / p_hi, 1 / p_lo]` in parsecs, open
above when `p_lo <= 0` and empty when `p_hi <= 0`. The reference direction is the
normalised mean of the positions' unit vectors, the factors are taken there, and the
linear model differs from the exact spherical geometry by a term of order `p` times
the offset (below a micro-arcsecond for the cases here: a5 recovers the truth to
5e-8 arcsec).

**The Earth.** The repository's ephemeris pack (Earth, Venus, Mars and the Jupiter
system, heliocentric, DE441 derived, 2025 to 2045 TDB) gives the Earth's
heliocentric position; the Sun's offset from the solar-system barycentre is the
mass-weighted mean of the planets' heliocentric positions (the DE440 mass ratios;
Saturn, Uranus and Neptune from the sky kernel's Standish elements; Mercury left
out, 1.7e-7 of the Sun's mass), subtracted. Against ERFA's barycentric Earth at
365 dates the largest difference is 7.1e-6 au. A joint fit outside 2025 to 2045 is
refused (`epoch-range`); a proper motion needs no ephemeris and has no range.

**Time.** An epoch is a number with a format (JD or MJD) and a scale (UTC, TT or
TDB). TT = UTC + 69.184 s (TAI - UTC = 37 s, so UTC before 2017-01-01 is refused
for a joint fit and kept as given for a proper motion, where a leap second moves
nothing measurable) and TDB = TT + 0.001657 sin g + 0.000014 sin 2g seconds. No
leap second after 2016 is assumed; a later one moves an epoch by one second, 3e-8 of
a year.

## The reference-frame statement

A parallax fitted to positions measured against the reference stars of a
calibration is **relative**: the reference stars' own parallaxes are in the frame.
It is smaller than the absolute parallax by their mean parallax, so the distance it
gives is never smaller than the true distance if that mean parallax is positive. The
result says so beside every distance. A correction to absolute is applied only when
the reader gives its size, its uncertainty and its **source**; there is no default
and no universal value (the mean parallax of faint reference stars depends on the
field and the magnitude range, and the tool does not model it). With a correction,
the page shows the relative parallax, the correction, its source and the absolute
parallax, whose uncertainty is the two in quadrature.

## Limits, said on the page

- **Two epochs teach a shift.** A two-epoch result carries the label "shift under a
  fixed-motion assumption; not a parallax" and has no parallax or distance field. It
  also says how much of a parallax the shift could hide (the difference of the
  parallax factors of the two epochs).
- **A parallax needs the ellipse sampled.** At least 8 epochs, 0.9 year, and 3 of the
  4 quarters of the Earth's orbit (by ecliptic longitude): fewer is `not-constrained`
  with the code and the numbers. The rules say nothing of the noise: a series that
  meets them can still give a parallax of no significance, and the interval says so
  (open above, a low-significance note under 5 sigma).
- **Independent uncertainties and a straight line.** No orbital motion (a binary's
  orbit looks like a parallax), no perspective acceleration, no relativistic terms,
  no aberration or light deflection (common to the reference stars and removed by the
  relative measurement), and the calibration's common error is not modelled.
- **A wrong epoch scale or origin shows as a failed residual test, with one
  exception.** A shift of the epochs by a quarter year or by a few weeks fails the
  test (d3); a shift of half a year turns the parallax into its negative and the
  residuals cannot tell (see below), so a parallax negative by more than 3 sigma is
  flagged, no distance is presented, and the epoch time scale is named. The panel states this limit in both languages
  (the `obs.ser.limits` words).
- **Interval, not value.** A distance is 1/p of an estimate: biased, and unbounded
  above where the parallax interval reaches zero. It is always shown with its
  intervals, its method and its frame statement; with an inconsistent test or a
  parallax negative by more than 3 sigma no distance is presented.

## The independent oracle

`astropy.coordinates.get_body_barycentric` and `astropy.time` (ERFA: epv00, the
leap-second table), `scipy.optimize.least_squares` (method trf, three-point
differences) on the exact spherical model and `scipy.optimize.curve_fit` with
absolute sigmas: astropy 6.1.7, scipy 1.15.3, numpy 2.2.6, pyerfa 2.0.1.5, Python
3.10.12, retrieved 2026-10-23 in a throwaway virtual environment (the one Prompt 180
made, reused, nothing added) and run with `-I` from an empty directory. No Gravitas
code ran in it. The cases are in `tools/astrometric-series-oracle/oracle-inputs.json`,
the series and the fits in `tests/fixtures/astrometric-series/oracle-results.json`,
and `oracle-provenance.json` carries the versions, the parameters, the command and
the digests. It is an independent implementation of the standard five-parameter
astrometric model (Lindegren et al. 2012) with an independent Earth, not a fit by
a published astrometric pipeline such as Gaia's: the claim is "agrees with a
second implementation on the same series", not "agrees with a published solution".

## Validation results

`npm run astrometric-series:validate` runs every row below (Node 22.23.4 and
24.4.0 give the same rows); the bound is the one committed before the module
existed (`thresholds.json`). 69 judged rows, 68 pass, 1 FAILS as committed, 1 not
run (b6); 6 evidence rows.

| Check | Measured | Bound | Verdict |
| --- | --- | --- | --- |
| a1 proper motion, noise-free, in a named plane | 1.4e-11 arcsec, 4.2e-11 arcsec/yr; sigma 1e-16 | 1e-9 | pass |
| a2 three epochs, unequal weights, by hand | 2.0e-11 relative | 1e-10 | pass |
| a3 two-epoch displacement and sigma; label, no parallax field, joint refused | 2.2e-11 arcsec; exact | 1e-9; 1e-12 | pass |
| a4 parallax factors on a circular orbit (pole, ecliptic, latitude 30) | 3.3e-16 | 1e-12 | pass |
| a5 one-year noise-free joint fit, two sky positions | p 4.5e-8, mu 5.6e-7, rms 2.8e-8 | 1e-5 | pass |
| a6 time scales (TT - UTC, TDB - TT, MJD, UTC before 2017) | 0, 1.657 ms, 0; refused | 1e-6 s, 1.7 ms, 1e-9 d | pass |
| a7 profile by refitting equals the quadratic; interval equals p +- sigma | 6.5e-15; 2.2e-5 sigma | 1e-9; 1e-3 | pass |
| b1 Earth against ERFA | max 7.1e-6 au; line-removed 2.4e-7 au | 1.5e-4; 5e-5 | pass |
| b2 noise-free series with ERFA's Earth, fitted with the pack's | p 2.4e-8 relative; mu 5.6e-7 | 5e-4; 5e-5 | pass |
| b3 joint fit against scipy's nonlinear fit (3 series) | 0.0048 sigma; sigma_p 7.8e-6; chi2 7.1e-7 | 0.1; 2e-3; 5e-3 | pass |
| b4 proper motion against `curve_fit` (4 series) | 8.8e-11, 9.5e-12, covariance 2.4e-16 | 1e-8 | pass |
| b5 UTC to TT and TDB against astropy (40 dates) | 2.6e-12 s; 2.8e-5 s | 1e-6; 1e-4 | pass |
| b6 an authentic series under a fixed contract | 189: one epoch refused, `too-few-epochs`; two authentic epochs (Hipparcos 1991.25, Gaia 2016.0) give the proper motion of HD 209458 within 0.040 mas/yr of Gaia's and the separation within 1.1e-10 arcsec of astropy's | 0.1 mas/yr, 1e-9 arcsec | pass; the eight-epoch parallax is not run (no authentic 2-D positions) |
| c1 joint coverage, p, mux, muy (3,000) | 1 sigma 0.687, 0.695, 0.689; 1.96 sigma 0.951, 0.944, 0.951 | 0.64-0.72; 0.935-0.975 | pass |
| c2 distance interval, symmetric regime, never open | 0.671, 0.955; open 0 | same; 0 | pass |
| c3 distance interval, p = 2.5 sigma, open ones counted | 0.675, 0.942; arm ratio 7.5; open above 7.2% (68.27%) | same; at least 1.5 | pass |
| c4 proper-motion coverage, mux, muy (3,000) | 0.670, 0.693; 0.946, 0.952 | same | pass |
| c5 false alarm of the consistency test (joint, proper motion) | 0.0013 | 0.004 | pass |
| c6 two-epoch displacement coverage (3,000) | 0.677, 0.677; 0.948, 0.946 | same | pass |
| d1 five refusals with codes and numbers; a series that meets the rules solves | all right | all | pass |
| d2 the label on 200 of 200 two-epoch results | 200 of 200 | 1 | pass |
| d3 wrong epoch scale by 45, 91.3, 273.9 days (200 each): fails the test and says time scale | 1.000 each; 200 of 200 name it | 0.99 | pass |
| **d3 wrong epoch scale by 182.6 days** | **0.005** | **0.99** | **FAIL** |
| d4 JD declared MJD and the reverse: `epoch-range`; proper motion not refused | right | all | pass |
| d5 2010 series: `epoch-range` with the pack's range; proper motion works | right | all | pass |
| d6 nine malformed inputs, each its code | right | all | pass |
| d7 a 12-sigma outlier fails the test and is found (200) | 1.000, 1.000 | 0.99; 0.95 | pass |
| d8 frame statement on 200 of 200; a correction needs its source; absolute = relative + correction | 200 of 200; right | 1 | pass |
| d9 true parallax 0: 0.6827 distance interval open above, no distance for a non-positive estimate | 0.832; 0 shown | 0.80-0.88 | pass |

### The failed leg, d3 at 182.6 days

The contract said that shifting a well-sampled year's epochs by 45, 91.3, 182.6 and
273.9 days fails the consistency test in at least 99 percent of 200 series each. It
does for three of the four and does not for half a year: 1 of 200. The cause is the
physics, not the arithmetic: the parallax factors are annual sinusoids, so an epoch
shift of half a year is a sign change, `f(t + 182.6 d) = -f(t)` to the Earth's
eccentricity (1.7 percent), and a fit with the negative parallax matches the data.
The module gives `p = -0.150` arcsec at a high significance with a consistent
verdict. **The leg is left failing as committed and is not restated.** The contract
could not have been met by any residual test; it needs either a different
detection (below) or a different statement, which was Carl's to rule.

**Ruling.** Carl, chat 2026-10-24, asked "Prompt 186 (PR #434, draft) passes 68 of 69 judged legs against the astropy/ERFA/scipy oracle, but d3 fails as committed: a half-year (182.6 day) epoch shift flips the parallax sign, because the parallax factors are annual sinusoids, so the residual test cannot see it (1 of 200 caught vs 0.99). A negative-parallax warning was added afterwards as evidence only. How should #434 proceed?", chose "Leave failing, labelled (Recommended)": "As for 180/182/183: keep the committed bound, record d3 as a known failed leg with its cause (tests pin it; the sign-flip limit stated in the doc and the panel), take #434 out of draft and merge; no threshold moved." No threshold moved; the tests pin d3 at 182.6 days as the known failed leg, and the sign-flip limit is stated here and in the panel (English and Spanish).

What was added after the measurement, labelled as such: a parallax negative by more
than 3 sigma (no source can have one) now sets `warnings: ['negative-parallax']`,
the hints and message that name the epoch time scale and origin, and withholds the
distance. The evidence rows `d3.wrongTimeScale.shift*.flaggedWithNegativeParallaxWarning`
show 1.000 of 200 flagged for each of the four shifts. That is not a pass of the
committed leg. It covers the half-year case only where the true parallax is
significant: a series whose true parallax is within 3 sigma of zero shifted by half
a year gives a parallax within 3 sigma of zero, which nothing here can flag.

### Corrections made on the way, none to a bound

1. **The oracle's first nonlinear fit was wrong.** It used `least_squares` method
   `lm`, whose two-point difference step (1.5e-8) is below what a double holds of an
   angle of order one radian, and stopped short of the minimum (chi-squared 48.324
   against the minimum 48.2985). It was found because the module's first fit
   disagreed with it by 0.11 sigma in one proper-motion component, against the
   bound 0.1; the oracle was wrong and the module was right (method trf with
   three-point differences reaches 48.29854, the module's 48.29853). The oracle was
   re-run with method trf and the first results were never committed; the bound, the
   cases and the inputs did not change (`thresholds.json` `corrections`).
2. **A harness case was wrong.** d6's "too wide" case first displaced one of five
   positions by 1.2 degrees, which is 0.96 degree from the mean direction, and the
   module measures from the reference direction; the case now displaces it by 3
   degrees. No bound moved. The contract's phrase "more than 3600 arcseconds from
   the others" is, in the module, "from the reference direction".
3. **The "exactly meets the rules" case** (d1) has a span of 0.9 year plus 15
   minutes, because a span of exactly 0.9 year is a floating-point coin toss.

## Not run until Prompt 189

b6 and the roadmap's tier (e): an authentic series under a fixed analysis contract.
No series was fetched, none was simulated, and the numbers above do not stand in for
it. Update: Prompt 189's one authentic epoch is refused by `fitMotion` with
`too-few-epochs`, as it should be; an authentic series stays not run
(`IMAGE_PACKS.md`, request R3). The arrangement for the ellipse drawn **over the frame** is not built: the path
and the residuals are drawn through the plot component, beside the frame, and the
frame itself is not annotated. The panel's Spanish was written without a fluent
reader and is unread by one.

# Orbit fitting and moving-object tracks (Prompt 187)

Roadmap III, Prompt 187. Part A (`ORBIT_FIT_GATE.md`) committed the
identifiability criterion and its synthetic test set before any fit and gave
**verdict A**: the criterion holds, short arcs refuse, and both depths ship. This
part is written in the order the work was done: the validation contract first
(below), and the rest after the measurements.

## The validation contract for orbit fitting (committed)

The bounds are in `tests/fixtures/orbit-fit/thresholds.json` (the gate's are in
`gate-thresholds.json`) and were committed, with this section, after the gate's
verdict and before the production module's added rules, the track module, the
oracle's inputs, script and results, the validation tool, the tests and the panel
existed (the branch history shows the order). A check a measurement crosses is a
failed check, not a reason to move its bound; only Carl resets one. The checks
follow the roadmap's section 7.5.8.

**The model and the criterion** are those of `ORBIT_FIT_GATE.md`: a circular
apparent orbit (5 parameters) and the Thiele-Innes model through the
eccentricity vector `(h, k)` (7 parameters), weighted least squares with each
epoch's stated covariance (separation and position angle are converted with their
covariance), a refusal below the committed criterion, the node in `[0, 180)`.
Part B adds two things to the criterion, both stricter and neither part of the
gate's measurement: **`period-ambiguous`** (another polished local minimum whose
period differs by more than `max(0.02, 6 sigma)` in the logarithm and whose
chi-squared is within 4 of the best: the data cannot choose the period, as an
exactly regular cadence cannot) and the mass sum's own refusals (a parallax of
less than 3 times its uncertainty, no frame statement, an absolute parallax with
no source).

**The mass sum** `M = K (a / parallax)^3 / P^2` solar masses (`K` from the IAU
nominal `GM_sun`, the au and the Julian year: 1.0000378), `a` and the parallax
in one unit, `P` in Julian years. The orbit's `ln(a^3 / P^2)` is a log-normal from
the fit's covariance and the parallax a normal truncated above zero (the
parallax profile of Prompt 186 is exactly a parabola), 20,000 seeded draws, and
the 0.6827 and 0.95 percentile intervals; the frame statement of the parallax
(relative to the reference stars, or absolute with its source) is always printed
with the mass sum.

**The moving-object track.** Sources at several frames, each a sky position with
its uncertainty and the frame's time; the mover is the source whose positions
make a straight line in the tangent plane at a rate more than 5 sigma from zero
while the static sources stay within 3 sigma of none: candidate tracks are built
from every pair of detections in two frames, a middle detection joins within 4
sigma of the line, a track needs 3 detections (at least 3 frames), a straight
line is fitted by weighted least squares with its chi-squared and covariance, and
a track that shares a detection with a better one is dropped. The result is the
rate in arcseconds per hour and the position angle (north through east) with
their uncertainties; two movers are reported as `several-movers` and one is
never chosen; no mover is `no-mover`; fewer than 3 frames is `too-few-frames`. A
track is a rate and an angle and nothing more: three positions on a short arc do
not give an orbit (Prompt 197's gate is where that is decided).

**(a) Analytic and synthetic recovery.** The Thiele-Innes closed form against the
3-D kernel's elements-to-state conversion (`js/lab3d/elements.js`, its own Kepler
solver and rotation) over 300 element sets (`e` up to 0.95, every inclination)
to 1e-9 arcseconds at `a = 1`; the same against Prompt 148's layer (3-D, sky
units) over 100 sets to 1e-9; the constants to elements and back to 1e-10;
noise-free 120 percent arcs of 50 seeded eccentric orbits recovered (period and
`a` 1e-5 relative, `e` 1e-5, angles 1e-3 degree, periastron epoch 1e-4 year) and
of 50 circular orbits (1e-6 relative, 1e-4 degree); Kepler's third law for
1 au and 1 Julian year against astropy's `G`, `M_sun` and au to 1e-9.

**(b) The independent oracles.** The 3-D kernel's reference corpus: problem R1 (a
two-body orbit, `e` 0.6, inclination 40, node 30, argument of periapsis 60
degrees) integrated by the kernel itself for 1.2 periods, projected on the sky at
16 epochs, and its elements recovered (1e-6 relative, 1e-4 degree). `scipy`
(`optimize.least_squares`, trf, an independent Kepler solver) on five noisy
elliptical and three circular series made in Python: `P`, `a` and `e` each within
0.1 formal sigma of this fit and chi-squared within 1e-4, the formal sigmas of `P`
and `a` within 1 percent of the oracle's `(J^T J)^-1`; five pinned mover tracks
against scipy's weighted line and astropy's position angle (rate 1e-6 relative,
angle 1e-3 degree); Kepler's constant against astropy's. The oracle is Prompt
180's virtual environment (numpy, scipy, astropy, photutils; nothing added), run
offline under `python -I`, with no Gravitas code.

**(c) Coverage on seeded ensembles.** Elliptical fits of 250 gate-style orbits at
110 percent: the 0.6827 and 0.95 intervals cover the truth of `P` (profile), `a` and
`a^3/P^2` at 0.60 to 0.76 and 0.90 to 0.99; the same for the circular model on 250
circular truths; the mass sum's intervals at parallax S/N 10 and 4 (250 trials
each, the S/N 4 interval asymmetric by at least 1.3); the track's rate and angle
over 300 fields.

**(d) Refusals.** 10 and 30 percent arcs refuse (0.99 and 0.95, both depths, a
fresh stream); five epochs (elliptical) and four (circular) and malformed rows are
refused with their codes; an exactly regular cadence is refused `period-ambiguous`
in at least 0.95 of 100 series and the jittered cell false-alarms at most 0.02;
the circular model refuses eccentric orbits (0.95); uncertainties 0.3 of the true
noise are refused `inconsistent` (0.99); separation and angle agree with offsets
to 1e-8; the mass sum's refusals; the node always in `[0, 180)` with the ambiguity
stated; a static field returns `no-mover` (at most 0.01 false alarms in 300), the
mover is identified among 30 static sources in at least 0.99 of 500 fields, and
two frames, a slow mover and two movers get their codes.

**(e) Authentic data.** Not run: no authentic visual-binary arc or asteroid track
exists in the repository and nothing was fetched.

## What was built for orbit fitting

- **`js/measure/orbit-fit.js`** (kernel, no DOM): `fitOrbit(series, {depth})` for
  the circular apparent orbit and the Thiele-Innes orbit through variable
  projection (the nonlinear parameters are `ln P` and the eccentricity vector;
  the four matrix entries are linear); the global search is a frequency scan, the
  circular scan with a golden-section refinement and, for the elliptical model,
  an envelope scan over 13 eccentricity-vector seeds with the best 8 minima
  polished by Levenberg-Marquardt, and a finer retry (25 seeds, 20 starts) if
  the first result is rejected; the committed criterion as a refusal
  `{ok: false, status: 'not-constrained', code, message, data}` with the
  codes `epochs`, `coverage`, `conditioning`, `period-unbounded`,
  `inconsistent` and Part B's `period-ambiguous`; the profile intervals of the
  period; an eccentricity that is "detected" only above a chi-squared gain of
  11.83 and otherwise the circular elements with an upper 95 percent limit; the
  node folded into `[0, 180)`; `massSum` (a seeded Monte Carlo of 20,000 draws);
  the Prompt 150 quantities and fit record (the elements with a derived
  covariance), a replayable reduction (step `image-orbit`), CSV rows, and
  `predict`, `orbitCurve` and the Thiele-Innes helpers.
- **`js/measure/mover-track.js`** (kernel): `findMover(frames)`, a tangent-plane
  weighted straight line per candidate track, the static sources identified by
  being seen at every frame within 4 sigma, quantities in mas/yr (the panel
  shows arcsec per hour), position angle as the local great-circle bearing for
  sky input and the plane angle for offsets, a replayable reduction (step
  `image-track`).
- **`js/observatory/imageOrbit.js`** and `js/i18n/{en,es}.imageOrbit.js`: a lazy
  disclosure beside the series tool in the sky-coordinates panel (`#obsOrbitPanel`),
  fetched when first opened and not installed offline (the files are
  `NEVER_PRECACHED` in `tools/build-service-worker.mjs`; the page says it needs
  the network the first time). It takes a table (offsets north and east, or
  separation and angle; or, for a track, one detection per line), draws the
  orbit and the residuals through the plot component, prints the elements, the
  period interval, the criterion's numbers, the eccentricity decision, the node
  statement, the mass sum with its reference-frame statement, saves a CSV and
  keeps the result in the ledger (source `image-series`, source kind
  `analysis`). A refusal is in words with its numbers.
- **`tools/orbit-fit-synth.mjs`**, **`tools/orbit-fit-validate.mjs`**
  (`npm run orbit-fit:validate`), **`tools/orbit-fit-oracle/`** (script, inputs,
  provenance), **`tests/fixtures/orbit-fit/`**, **`tests/orbitFit.test.js`**
  (32 tests, run as a child process in plain Node because Jest's VM makes `Math`
  reads about ten times slower), **`e2e/imageOrbit.spec.js`** (8 tests).

## Validation results for orbit fitting

`npm run orbit-fit:validate` (Node v24.4.0, 52 s): **68 judged rows pass, 1
FAILS**, 4 evidence rows, 1 not run. Every threshold is in
`tests/fixtures/orbit-fit/thresholds.json`, committed before the production
rules, the track module, the oracle and the tool existed. The oracle is
`oracle.py` under `python -I` in Prompt 180's virtual environment (numpy 2.2.6,
scipy 1.15.3, astropy 6.1.7, photutils 2.0.2, Python 3.10.12; nothing added),
with its own Kepler solver and no Gravitas code; its provenance and the hashes of
its files are in `oracle-provenance.json`. The kernel side of leg (a) and (b)
uses `js/lab3d/elements.js` (its own solver) and Prompt 148's layer.

| Leg | Measured | Bound |
| --- | --- | --- |
| a1 Thiele-Innes against the 3-D kernel, 300 sets | 0 | 1e-9 |
| a2 Prompt 148's layer, 100 sets | 5.9e-13 | 1e-9 |
| a3 constants to elements and back | 1.4e-15 | 1e-10 |
| a4 noise-free recovery, 50 orbits (worst of P, a, e, angles, T) | 4e-16 to 1e-13 | 1e-5 to 1e-3 |
| a5 noise-free circular recovery | 5.7e-14 worst | 1e-6 to 1e-4 |
| a6 Kepler's constant against astropy | 2.2e-16 | 1e-9 |
| b1 R1 integrated by the kernel (worst of P, a, e; angles) | 5.2e-11; 3.5e-9 degree | 1e-6; 1e-4 |
| b2 against scipy: 8 series, worst of P, a, e in sigmas; chi-squared | 4.2e-6; 6.1e-12 | 0.1; 1e-4 |
| b3 sigma of P and a against `(J^T J)^-1` | 5.2e-7 | 0.01 |
| b4 five tracks against scipy and astropy: rate; angle; local angle | 4.6e-9; 3.6e-7; 3.8e-7 | 1e-6; 1e-3; 1e-3 |
| c1 elliptical coverage, 250 orbits: P, a, a^3/P^2 at 0.6827 | 0.728, 0.668, 0.688 | 0.60 to 0.76 |
| c1 the same at 0.95 | 0.984, 0.956, 0.952 | 0.90 to 0.99 |
| c2 circular coverage at 0.6827 (0.95) | 0.696, 0.692, 0.684 (0.96, 0.956, 0.948) | 0.60 to 0.76 (0.90 to 0.99) |
| c3 mass sum, parallax S/N 10: 0.6827 and 0.95 | 0.644, 0.964 | 0.60 to 0.76; 0.90 to 0.99 |
| c3 mass sum, S/N 4: 0.95; asymmetry | 0.976; 2.79 | 0.90 to 0.99; at least 1.3 |
| **c3 mass sum, S/N 4: 0.6827** | **0.824 (FAILS)** | 0.60 to 0.76 |
| c4 track coverage of rate and angle, 300 fields (0.6827; 0.95) | 0.70, 0.69; 0.94, 0.96 | 0.60 to 0.76; 0.90 to 0.99 |
| d1 10 and 30 percent arcs refuse (both depths, 80 trials each) | 1.000 | 0.99 and 0.95 |
| d3 regular cadence refused `period-ambiguous`; jittered false alarm | 1.000; 0 | 0.95; 0.02 |
| d4 circular model on eccentric truths refused | 1.000 | 0.95 |
| d5 stated uncertainties 0.3 of the noise refused | 1.000 | 0.99 |
| d6 separation and angle against offsets | 2.9e-11 | 1e-8 |
| d8 the node in `[0, 180)` with its ambiguity stated, 500 fits | 0 violations | 0 |
| d9 a static field returns `no-mover`, 300 fields | 0 | 0.01 |
| d10 the mover identified among 30 static sources, 500 fields | 1.000 | 0.99 |

**The failed leg: c3 at parallax S/N 4, the 0.6827 interval (0.824 against
0.60 to 0.76).** The committed contract said the mass-sum interval covers the true
mass sum at 0.60 to 0.76 at S/N 4. The sum refuses an observed S/N below 3, which
at a true S/N of 4 removes 40 of 250 trials (210 accepted), and the refusal
selects against the trials whose parallax happened to read low, which are the
ones where the interval's lower arm would have to carry the truth; among the
accepted trials the expected coverage of a 0.6827 interval is therefore not
0.6827 (about 0.81), and the measured 0.824 agrees with that. The 0.95 interval
at S/N 4 is inside its bound (0.976). **The leg is left failing as committed and
is not restated; the bound is not moved.** `npm run orbit-fit:validate` exits 1
on it and `tests/orbitFit.test.js` names it as the one known failure. A reader
of the mass sum at a weak parallax should read the 0.95 interval and its
asymmetry, not the 0.6827 one; the panel states the refusal rule in its limits.

**Not run.** E1, an authentic visual-binary arc or asteroid track, is **NOT RUN:
no authentic arc pack exists**; nothing was downloaded, fetched or simulated.
Prompt 189's packs are images, not an astrometric series of a binary.

**Evidence, not judged.** The corpus orbit R1 at 16 exactly regular epochs is
refused `period-ambiguous` (an aliasing of an exactly regular cadence the
criterion could not have known); the harness's R1 leg therefore uses 16 jittered
epochs, which is disclosed in the leg's note and is the same jittering the gate's
amendment A1 introduced. The 110 percent cell's refusals were none in 250.

**Corrections made before any Gravitas number of the gate was read** (none to a
bound; recorded here and in the register row): the gate's regular cadence aliased the
period of an orbit of ten years sampled yearly (found on a development stream
before any gate run) and the test set was amended to jittered epochs (A1,
`ORBIT_FIT_GATE.md`); the first global search missed edge-on and highly
eccentric orbits and was replaced by the envelope scan above; the oracle's
position angle first differed from the tangent-plane angle by the convergence of
the meridians (up to 7e-3 degree), so the track reports the local great-circle
angle and the oracle computes astropy's from the mean epoch to one hour later;
`GM_sun` was set to the IAU nominal value to match astropy.

## Limits of the orbit fit, said on the page

Relative astrometry only: the ascending node is ambiguous by 180 degrees (stated
with every result); no radial velocities, perturbations, light-travel time or
relative proper motion; the criterion's numbers were tested on 12 jittered
epochs and about 2 percent noise, other designs are not covered; a relative
parallax makes the mass sum read high by the reference stars' mean parallax (the
statement is always printed); a track is a rate and an angle and not an orbit.
The Spanish words are unread by a fluent reader.
