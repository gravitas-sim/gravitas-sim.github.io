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
