# Source detection and PSF measurement

Roadmap III, Prompt 183. A list of the sources in a frame, each with a position,
a peak, a flux (through the photometry of Prompt 180), shape moments and a set of
flags; and the point-spread function measured from the stars among them, as a
FWHM with its uncertainty and a stacked radial profile. This file is written in
the order the work was done: the validation contract first, and the rest after
the measurements.

## The validation contract (committed first)

The algorithm's parameters and every threshold are in
`tests/fixtures/detection/thresholds.json` and were committed, with this section,
before `js/measure/detect.js`, the validation tool or the oracle's fixtures
existed (the branch history shows the order). A check that a measurement crosses
is a failed check, not a reason to move its bound. The checks follow the
roadmap's section 7.5.8. Synthetic frames are the detector kernel's
(`js/kernels/detector/frame.js`; a clean detector, 128 by 128 pixels, a sky of 90
electrons a pixel, 8 electrons of read noise, gain 1.5) with a truth manifest;
the stars of the elliptical and Moffat cases are added to a kernel frame's sky
and noise, with their own shot noise, from analytic profiles integrated over each
pixel (the manifest says which).

**(a) Analytic and truth cases.**

- a1: detection at three depths against the injected truth. Twelve stars a frame
  of 6000, 1200 and 600 electrons (matched-filter signal to noise about 107, 21
  and 11) on a jittered grid, 150 frames a depth; false positives per frame,
  recovery, position error and the flux the list reports against the analytic
  encircled energy. Completeness near the limit is Prompt 184's, not this one's.
- a2: the shape moments of a synthetic ellipse (sigma 2.2 and 1.2 pixels at five
  orientations) and of circular stars.
- a3: the PSF FWHM against the detector kernel's own input PSF at 2.0, 3.0 and 4.5
  pixels (Gaussian fit) and against Moffat stars of known FWHM and beta.
- a4: the stacked radial profile against the noiseless truth image, bin by bin,
  and the half-maximum width read from it.

**(b) An independent oracle.** photutils 2.0.2 with astropy 6.1.7, numpy 2.2.6
and scipy 1.15.3 (Python 3.10.12, installed from PyPI on 2026-10-23 into a
throwaway virtual environment), run offline on the same frames and pinned as
fixtures with the versions, parameters and retrieval recorded; Gravitas never
recomputes them. b1: the background and noise meshes (photutils `Background2D`)
and the interpolated maps; b2: the smoothed image (astropy `convolve`), the
number of sources and each segment's pixel count (photutils `detect_sources`), and
every source's moments (photutils `SourceCatalog`); b3: the Gaussian FWHM
(photutils `psf.fit_fwhm`); b4: the Moffat FWHM and beta (scipy `least_squares`
over photutils `MoffatPSF`). Bounds are in the thresholds file: 1e-9 relative
where the two compute the same definition, 1e-4 for the FWHM of two fitters.

**(c) Coverage.** The stated sigma of the Gaussian FWHM covers the truth at 62 to
74.5 percent for one sigma and 92.5 to 98.5 percent for 1.96 sigma at each of
three signal levels (800 stars each); the sigma of the FWHM combined over a
frame's stars at 58 to 78 and 90 to 99.5 percent (250 frames).

**(d) Negative and refusal cases.** A frame with a strong gradient and no stars
gives at most 0.02 false detections a frame (as does a frame of noise); a
saturated star is flagged and left out of the selection, and a fit asked for at it
is refused with no FWHM; a cosmic ray is flagged `sharp` and a star is not;
masked pixels never belong to a segment; a display-only image, one with no
contract, light in unknown units, an incomplete contract, a raw frame and a lossy
history are refused with their own codes; a star at the border is flagged; two
stars 5 pixels apart come out as one source (there is no deblending) that the
selection leaves out; the Gaussian fitted to a Moffat star is labeled
model-limited and a correct fit is not.

**(e) Authentic data.** One frame from Prompt 189, the source list and FWHM
against photutils on the same pixels. **NOT RUN until Prompt 189** has landed an
authentic image pack: nothing was downloaded and nothing fabricated for this leg.

## Corrections made before the kernel existed

The oracle's first run (before `js/measure/detect.js` was written) showed a
flaw in the committed algorithm, not in a bound: the background map continued
the outer boxes as a constant, so on a frame with a strong gradient the strip
within 8 pixels of the border had a sky wrong by the slope times the distance,
and eight false sources appeared along it. The interpolation was changed to
continue the first and last interval linearly to the border (and the noise map
floored at half of the smallest box noise). No threshold was touched and no
Gravitas implementation output had been seen; `thresholds.json` carries the
revised wording and the git history the order.

A second correction of the same kind, from the same run: two of eight frames
had a false source on the border, 5 and 6 pixels in area. Repeating the edge
pixel in the smoothing makes the smoothed noise at the border about 1.3 times
the interior's, while the threshold used one global sum of squares. The
threshold is now the noise computed exactly from the kernel's weights as they
land (repeated edge pixels, masked pixels removed and the weights renormalised),
so it means the same number of sigma at the border and beside a mask as in the
open field. The oracle's matrices of weights agree with astropy's `convolve`
to 1e-12 on all eight frames (recorded in its results), and with the change no
frame of the eight has a false source.

## What was built

`js/measure/detect.js` is a pure module (no DOM) over the adapter of Prompt 180
(`js/measure/photometry.js`, whose `adapt` supplies the electrons, the mask and the
saturation limit from the pixel contract, and whose `measure` is the flux). The
Observatory panel is `js/observatory/imageDetect.js`, loaded only when it is first
opened. Pixel (0, 0) is the center of the first pixel in the kernel; the table and the
marks use the FITS convention (1-based, y up), so a source at kernel (30.4, 32.2) is
listed at 31.4, 33.2.

### Detection

1. **Background.** The image is cut into boxes of 16 pixels (a setting). In each box
   the finite, unmasked pixels below the linearity limit are clipped at 3 sigma about
   their median (up to 10 passes, standard deviation with no degrees-of-freedom
   correction, as astropy's `sigma_clip`), and the median and standard deviation of
   what remains are the box's sky and noise. A box with fewer than 10 pixels takes its
   neighbors' mean. The maps are bilinear between box centers; the first and last
   interval are continued linearly to the border (see "Corrections"); the noise map
   is floored at half the smallest box noise.
2. **Smoothing.** The background-subtracted image is convolved with a Gaussian of the
   expected FWHM (default 3 pixels), truncated at `ceil(3 sigma)`, the edge pixel
   repeated. Masked and non-finite pixels are removed and the weights renormalized.
   The noise of the smoothed value is `sqrt(sum w^2 s^2) / sum w` over the weights as
   they land on that pixel, so the threshold means the same number of sigma at the
   border and beside a mask as in the open field.
3. **Threshold and segments.** A pixel counts when its smoothed value exceeds
   `sigma` (default 4, allowed 2 to 100) times its smoothed noise. Counted pixels are
   joined by 8-connectivity; a run of fewer than `minArea` (default 5) pixels is
   dropped. There is no deblending: two stars that touch are one source.
4. **Properties** are photutils' `SourceCatalog` definitions on the unsmoothed,
   background-subtracted values of the segment: the centroid from the first moments
   (negative values counted as zero), the second central moments with the 1/12 pixel
   term added while the determinant is below 1/144, the semi-axes `a` and `b`, the
   ellipticity `1 - b/a`, the orientation (degrees counterclockwise from +x), the
   peak, and the segment's sum.
5. **Flux** is Prompt 180's aperture photometry at the source's centroid: radius 1.5
   FWHM, sky annulus 3 to 5 FWHM, exact edge weights, its stated error and signal to
   noise. A source another source's aperture or ring reaches is `crowded` and gets no
   flux (the `crowded` refusal of Prompt 180), not a wrong one.
6. **Flags.** `saturated` (a segment pixel at or above the contract's limit), `edge`
   (a segment pixel on the border), `masked` (a masked pixel within one pixel of the
   segment), `crowded`, and `sharp` (the brightest pixel holds more than half of the
   segment's light: a cosmic ray or hot pixel as often as a star). A flag is a
   statement about trust, never a removal.

### The point-spread function

`selectStars` takes the sources with no flag, signal to noise at least 30,
ellipticity at most 0.3, brightest 25. `fitStar` fits each with a **pixel-integrated**
model (the Gaussian by the difference of two `erf`s over the pixel, with its own
accurate `erfc`; the Moffat on a 5 by 5 grid of sub-pixel midpoints with analytic
derivatives), parameters center, flux, sky and width (and Moffat beta), by
Levenberg-Marquardt on a square of half-width `ceil(2.5 max(FWHM, 2.5))` pixels. The
weights are `1 / (local noise^2 + model)` (Poisson, a setting) or equal; the
covariance is the inverse of the weighted normal equations (`js/numeric/linalg.js`),
not rescaled: a star's excess scatter is dealt with by the combination below. A
star's fit is `modelLimited` when its reduced chi-square exceeds 1.5. The fit is refused, with a
code and no number, when the square reaches the border (`edge`), a pixel in it is at
the nonlinear level (`saturated`) or masked (`masked`), the fit does not settle, or the
pixels do not fix every parameter.

`combine` is the inverse-variance mean of the stars' FWHMs; its sigma is the formal
one, multiplied by the square root of the stars' chi-square about the mean when that
exceeds 1 (the stars disagree by more than they say, and the page says so). The
**stacked radial profile** bins every star's pixels by distance from its fitted center
(0.5 pixel bins), each pixel as a share of its star's fitted flux, the bin value the
mean and its error the standard error of the mean; the width read from the profile is
its half-maximum. **Model-limited:** when more than half of the stars' fits are
`modelLimited`, the combination is, and the 150 record's uncertainty is of kind
`model-limited` with a floor of its sigma times the root of the mean reduced
chi-square: the number is conditional on the model and the error is only the part
the noise explains.

### The record

`psfRecord` writes the 150 quantities (`psf.fwhm`, and `psf.beta` for a Moffat) and a
`fit` record (model, weights, stars used and refused, chi-square, degrees of freedom,
the covariance's meaning); `reductionOf` writes one reduction step (`image-psf`) with
the settings, the frame's digest and the source list's digest, so the ledger entry
replays. The ledger source is `image-detection`.

### The panel

On an image observation: the width of a star, a Settings disclosure (threshold,
smallest source, sky box), Find sources, Add as marks (the sources as point marks in
the marks table), Save as CSV, the image with every source circled and the stars used
for the width circled again in a second color, the source table (position, area, peak,
net light and its error, signal to noise, ellipticity, angle, width, flags, used for the
width), a model and weights choice, Measure the width, the stacked profile drawn
through the plot component with its table and the fitted model through it, and Keep in
the ledger. Every control works from the keyboard alone and by a single pointer alone;
every result is also said in a status region; a refusal says why in words and every
action is disabled. The panel's strings are in `js/i18n/en.imageDetect.js` and
`es.imageDetect.js`; the Spanish has not been read by a fluent reader.

## Limits

- **No deblending, no crowded fields.** Touching stars are one source; a source whose
  aperture or ring another source reaches has no flux. The crowded-field case is out of
  scope (the roadmap puts it later).
- The flux is an aperture, not a PSF fit; its aperture correction is the encircled
  energy of a Gaussian (0.998 at 1.5 FWHM), so a star far from Gaussian is measured low
  by what falls outside it.
- The shape is moments of the segment: biased by the threshold (a fainter source
  has fewer pixels and a rounder, smaller footprint), and `fwhm` in the table is the
  moment width, not the fit's.
- The PSF model is a circular Gaussian or Moffat: no ellipticity, no variation across the
  frame, no undersampling correction beyond pixel integration. **A low reduced chi-square
  does not show the model is right** (leg d8: a Gaussian fitted to Moffat stars is
  30 percent too wide at a median reduced chi-square of 1.25); the practical check is
  to fit both models and compare the widths.
- A frame with a gradient steeper than the box can follow, or structure on the box's
  scale (nebulosity), is not a case this background handles; the sky estimate is a
  step function of box statistics, not a fit.
- Completeness near the detection limit is Prompt 184's validation, not this one's;
  no leg here claims a limiting magnitude.
- The detector is the pixel contract's: a frame without the contract is refused.

## The oracle

`tools/detection-oracle/` holds `make-inputs.mjs` (writes `oracle-inputs.json`: eight
frames, whole ADU), `oracle.py` (run with `python -I` from a directory without data),
and `provenance.py`; their products are `tests/fixtures/detection/oracle-{inputs,results,provenance}.json`,
with the script's SHA-256. photutils 2.0.2, astropy 6.1.7, numpy 2.2.6, scipy 1.15.3,
Python 3.10.12, from PyPI on 2026-10-23, in the virtual environment of Prompt 180; no
other package was installed and the environment is not committed. The tests never
recompute these; they read the pinned values.

## Validation results

Run by `npm run detection:validate` (Node 24.4.0; `tests/detection.test.js` runs the
same rows in plain Node and asserts each). Every bound is the one committed in
`thresholds.json` before the module existed. The three **FAIL** rows are failures of
the committed bound and are left failing; none was relaxed, rescaled or restated.

| Leg | Measured | Committed bound | Verdict |
| --- | --- | --- | --- |
| a1 false positives a frame: blank, gradient, deep, moderate, shallow | 0.010, 0, 0.020, 0.020, 0.0067 | at most 0.02 | pass |
| a1 recovery at every depth (1800 stars each) | 1.000 | at least 0.99 | pass |
| a1 position rms, deep, moderate, shallow (pixels) | 0.058, 0.176, 0.304 | 0.1, 0.3, 0.6 | pass |
| a1 flux z, mean and rms, the three depths | mean -0.059 to 0.021; rms 0.94 to 0.99 | 0.25; 0.88 to 1.12 | pass |
| a2 ellipticity bias, orientation error, round stars | -0.021; 0.55 degrees; 1.000 | 0.03; 3; 0.95 | pass |
| a3 Gaussian FWHM bias at 2, 3, 4.5 pixels; frame error | 0.0002, -0.0011, -0.0029; to 0.0077 | 0.005; 0.015 | pass |
| a3 Moffat FWHM bias | 0.0205 | 0.025 | pass |
| a4 stacked profile, largest z of the first 10 bins | **4.256** | 4 | **FAIL** |
| a4 width read from the profile | 0.0169 | 0.02 | pass |
| b1 background and noise meshes, interpolated maps | 1.9e-15, 2.2e-15 | 1e-9 | pass |
| b2 smoothed image, properties, orientation | 5.7e-13, 2.3e-13, 4.9e-12 degrees | 1e-9, 1e-9, 1e-7 | pass |
| b2 number of sources, segmented pixel sets, areas (8 frames) | all equal | equal | pass |
| b3 Gaussian FWHM against `fit_fwhm` (60 fits) | **1.32e-4** | 1e-4 | **FAIL** |
| b4 Moffat FWHM, beta against scipy | 2.5e-9, 1.3e-8 | 1e-4, 1e-3 | pass |
| c1 coverage 68 and 95 percent, faint, mid, bright | 0.686/0.944, 0.674/0.945, 0.671/0.954 | 0.62 to 0.745; 0.925 to 0.985 | pass |
| c2 combined coverage, 68 and 95 percent | 0.604, 0.932 | 0.58 to 0.78; 0.90 to 0.995 | pass |
| d2 saturated: flagged, left out of the selection, fit refused | 1.0; 50 of 50; 50 of 50 | 0.99; 50; 50 | pass |
| d3 sharp: cosmic rays flagged, stars flagged | 200 of 200; 0 of 600 | 0.95; 0.02 | pass |
| d4 masks: segments, flag, hot pixel | all | all | pass |
| d5 contract refusals, each its own code | 6 of 6 | 6 | pass |
| d6 border: flag, fit refused | pass | pass | pass |
| d7 no deblending: merged, excluded, crowded | pass | pass | pass |
| d8 a Gaussian fitted to Moffat stars labeled model-limited | **0.01** | at least 0.95 | **FAIL** |
| d8 a Gaussian fitted to Gaussian stars wrongly labeled | 0 | at most 0.02 | pass |
| e authentic data | not run | | **NOT RUN until Prompt 189** |

(Rows marked FAIL are the three recorded in `tests/fixtures/detection/failed-legs.json`
with their causes; the test holds each to its record, so a change that repairs or
worsens one cannot pass unnoticed.)

**Why the three fail.** a4: the innermost bin holds one to six pixels from only some
of a frame's twelve stars, so its standard error comes from two to five values and its z
is Student's t with 1 to 4 degrees of freedom, not a normal; the signed z over all 250
values has mean -0.096 and rms 0.77 (row `x.a4.profile.zRms`) and the width agrees.
b3: `fit_fwhm` runs scipy's TRF at default tolerances and exposes none; the same
objective at tolerances of 1e-15 agrees with this kernel to 9.7e-9 (row
`x.b3.fwhmGaussianTight`), so the bound was tighter than the oracle's own
convergence. d8: the Moffat's wings sit under the sky noise, so a chi-square over the
cutout does not see a profile error that widens the FWHM by 30 percent (median reduced
chi-square 1.25); the label is a weak detector of the wrong family, which the page
states beside the number. The options for Carl are in the decision register row
D-R10-60.

## Corrections made after the kernel existed

The first comparison of the kernel with the oracle found that the clipped standard
deviation was taken about the median, not the mean (astropy's), so the noise of some
frames differed from `Background2D` by 1.5 to 3 percent; fixed, and the meshes now agree
to 1e-15. Three harness geometries were wrong and were fixed after the kernel was shown
to be right on them (a hot pixel placed beside a grid star, a crowded-pair count that
included an unrelated false source, a masked case); the kernel's behavior was not
changed to meet a case.

## References

- Bertin, E. & Arnouts, S. 1996, A&AS 117, 393 (SExtractor: thresholding, 8-connected
  segmentation, the moments of an isophote).
- Stetson, P. B. 1987, PASP 99, 191 (DAOPHOT: profile fitting of stars in a field).
- Moffat, A. F. J. 1969, A&A 3, 455 (the profile that carries his name).
- Levenberg, K. 1944, Q. Appl. Math. 2, 164; Marquardt, D. W. 1963, J. SIAM 11, 431.
- Astropy Collaboration 2022, ApJ 935, 167; photutils (Bradley et al.), version 2.0.2,
  whose `Background2D`, `detect_sources`, `SourceCatalog` and `psf.fit_fwhm` are the
  oracle.
- `PHOTOMETRY.md` (Prompt 180): the aperture, the contract, the crowding rule.
