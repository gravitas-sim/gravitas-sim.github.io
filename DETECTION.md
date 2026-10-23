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
selection leaves out; the Gaussian fitted to a Moffat star is labelled
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
