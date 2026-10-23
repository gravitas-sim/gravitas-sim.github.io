# Photometry over the existing reduction

Roadmap III, Prompt 180. Aperture photometry on any frame whose pixels are a
measure of light, through `js/kernels/detector/reduce.js` (the reduction that
already holds the background estimate, the CCD equation and the differential
magnitude), with adapters, a weighted centroid, sub-pixel aperture edges, a
local plane background, a batch over the marks table and an independent oracle.
This file is written in the order the work was done: the validation contract
first, and the rest after the measurements.

## The validation contract (committed first)

The thresholds are in `tests/fixtures/photometry/thresholds.json` and were
committed, with this section, before `js/measure/photometry.js` or the oracle's
fixtures existed (the branch history shows the order). A check that a
measurement crosses is a failed check, not a reason to move its bound. The
checks follow the roadmap's section 7.5.8.

**(a) Analytic cases.** Synthetic stars of known flux and position on the
detector kernel's frames (`js/kernels/detector/frame.js`; a clean detector, a
sky of 90 electrons a pixel, 8 electrons of read noise, a Gaussian point-spread
function of 3 pixels FWHM, positions uniform over a 8 by 8 pixel square so every
sub-pixel phase occurs), at three signal levels (1,500, 15,000 and 150,000
electrons), 800 seeded frames a level. The flux is recovered within the Poisson
expectation (the mean of z = (net minus F times the Gaussian's encircled energy)
over the stated sigma is within 0.2 of zero and its root mean square within
0.87 to 1.13); the sky estimate is unbiased on a linear gradient and, for the
local plane, with half the annulus masked; the curve of growth agrees with the
analytic encircled energy to 0.004; the iterated Gaussian-weighted centroid is
unbiased to 0.02 pixel (0.05 at the faint level).

**(b) An independent oracle.** Aperture sums, backgrounds and centroids computed
offline by photutils (with astropy, numpy and scipy) on the same frames, pinned
as fixtures with the versions, parameters and retrieval recorded, and never
recomputed by Gravitas. Agreement within 1e-9 relative for exact apertures,
1e-12 for centre-in-pixel, 1e-9 for the clipped annulus mean, 1e-7 for the
plane, 1e-6 pixel for the flux-weighted centroid, 1e-5 pixel for the
Gaussian-weighted fixed point.

**(c) Coverage.** On the seeded ensemble of (a), the stated sigma of the net
flux covers the truth at 62 to 74.5 percent for one sigma and 92.5 to 98.5
percent for 1.96 sigma at every level; the stated centroid sigma at 60 to 76 and
91 to 99 percent.

**(d) Refusals.** A saturated star, a masked pixel in the aperture, a crowded
pair, a display-only image, a frame with no contract, light in unknown units, an
incomplete contract, a raw frame and a lossy history are each refused with their
own code and no number; 98 percent of blank positions report a nondetection with
an upper limit.

**(e) Authentic data.** One frame from Prompt 189 under a fixed analysis
contract. **Not run until Prompt 189** has landed an authentic image pack:
nothing was downloaded and nothing fabricated for this leg. The batch of ten
synthetic stars is the leg that stands in the acceptance until then.

**(k) The kernel's numbers do not change.** `aperturePhotometry`,
`estimateBackground` and `measureFlux` give the numbers they gave on v3
80668d38 (`tests/fixtures/photometry/kernel-golden.json`, captured before any
change, 1e-12 relative).

## What was built

`js/measure/photometry.js` (adapters, no DOM), `js/observatory/imagePhotometry.js`
(the panel, a lazy chunk of the Observatory beside the marks panel) and the
kernel's two optional inputs. The kernel is extended, not duplicated:
`aperturePhotometry` in `js/kernels/detector/reduce.js` takes optional `weights`
(a list of pixel and weight pairs, for sub-pixel edges) and `background` (a
level and its pixel count, for a local plane); without them it runs the code it
ran before, and `kernel-golden.json` holds its numbers to 1e-12 (they are
bit-identical). The Observatory's panel measures a mark or a typed position,
the curve of growth, every point and count mark as a batch (chunked, with a
Stop button), and keeps the result in the evidence ledger (a
`gravitas.artifact/1`, notebook source `image-photometry`) or as a CSV.

## Equations

Pixel `(0, 0)` is the centre of the first pixel (the kernel's and photutils's
convention; the panel converts to and from FITS, which counts from 1).

- **Aperture.** `S = sum w_i v_i`, with `w_i` the exact area of pixel `i` inside
  the circle (analytic integration of the circle over the pixel, by `asin`) or,
  as the kernel always did, 1 for a pixel whose centre is inside. `n_pix = sum w_i`.
- **Sky.** The clipped annulus mean `B` (median centre, `mad_std`, 3 sigma, four
  iterations, the clipped pixels kept out), or a plane `B(x, y)` fitted by least
  squares to the annulus with the same clipping, summed under the aperture with
  the same weights. The sky's own error is the annulus scatter over `sqrt(n_B)`
  (for the plane, `n_B` is replaced by `n_eff = A^2 / (a^T (X^T X)^-1 a)`, where
  `a` holds the aperture's sums of the plane's terms).
- **Net light.** `N = S - sum w_i B(x_i, y_i)`, in electrons.
- **The CCD equation** (`js/kernels/detector/snr.js`, Merline and Howell 1995):
  `sigma^2 = N + n_pix (B + D + RN^2) (1 + n_pix / n_B)`, `N` the net electrons,
  `B` the sky per pixel, `D` the dark per pixel (the contract's dark, 0 here),
  `RN` the read noise, `n_B` the annulus pixels used. With a variance plane in
  the contract (`planes.variance`) the route is `sigma^2 = sum w_i var_i + n_pix^2
  mean(var_ring) / n_B`, in the data's own unit, area weighted as photutils does.
- **Magnitude.** `m = -2.5 log10(N / t)` and `sigma_m = (2.5 / ln 10) sigma / N`,
  instrumental (no zero point: the tool does not calibrate).
- **A nondetection.** `N < 3 sigma` is reported as an upper limit, `3 sigma`
  electrons and the magnitude it implies, and carries no flux.
- **Centroid** (optional, "Centre on the star first"). Flux weighted in a window
  of half width `4 sigma_PSF` moved to the rounded position until it stops, or
  the Gaussian weighted fixed point (weights `exp(-d^2 / 2 s^2)` about the
  current position). The stated error is `J^-1 S J^-T` with the weights moving
  with the centre, which is what calibrates the coverage (c2); a first version
  that held the weights fixed covered 37 percent of the truth at one sigma and
  was corrected before the leg was run again (recorded in the commit history).

## What the contract must say

`js/dataKinds/contract.js` `permits(sidecar, 'photometry')` decides, and the
refusal names the field missing: the pixel unit, a calibration state that is not
`raw` (a raw frame still holds the bias), gain and read noise (or a variance
plane), a saturation level, a linearity limit, an exposure time, and a history
without a lossy step. The linear limit used is the smaller of the contract's
linearity limit and its saturation level, in working units. A display-only image
or one with no contract is never measured; it can still be marked.

## Limits (stated, not hidden)

- **No PSF fit, no deblending.** A neighbour inside `rOut_i + r_j` is refused
  (`crowded`), not subtracted.
- **The sampling floor.** Exact area weights assume the light is uniform across
  a pixel at the aperture's edge. A star of 3 pixels FWHM sampled on a grid is
  not, so the sum is biased by a fraction of a percent at 1.5 FWHM and by
  several percent at apertures near the pixel size. This is the method's floor,
  not an arithmetic error (photutils's exact apertures give the same sums to
  1e-15) and it is what three committed legs measure (below).
- **Area weighted noise.** Noise from a variance plane is weighted by the same
  area fractions; pixel-to-pixel correlation (resampled frames) is not modelled.
- **Centroid windows.** A centroid sitting exactly on the edge between two
  windows has no unique flux weighted answer; the result says it did not settle.
- **No calibration.** Magnitudes are instrumental. A zero point is for the
  differential-photometry and calibration instruments that already exist.
- **The authentic leg is not run** (e2): see the validation table.

## The independent oracle

`tools/photometry-oracle/oracle.py` computes, offline and never by Gravitas, the
aperture sums, annulus means, plane fits and centroids on the same pixels with
**photutils 2.0.2** (`CircularAperture`, `CircularAnnulus`, `aperture_photometry`,
`centroid_com`) and **astropy 6.1.7** (`sigma_clip`, `FittingWithOutlierRemoval`
with `LinearLSQFitter` on `Planar2D`), with numpy 2.2.6 and scipy 1.15.3, Python
3.10.12, installed from the default PyPI index into a throwaway virtual
environment on 2026-10-23. `tests/fixtures/photometry/oracle-provenance.json`
records the versions, the parameters, the index, the revisions of the script and
the SHA-256 of the inputs, results and scripts. The committed results are the
fixtures; no test imports Python.

## Validation

Thresholds are in `thresholds.json` and were committed before the first
measurement; none was changed afterwards. `npm run photometry:validate` (about
8 seconds, Node, not Jest) prints every row; `tests/photometry.test.js` runs it
and also holds each recorded failure to its record, so a fix cannot pass
unnoticed. Node v24.4.0.

| Leg | Threshold | Measured | Verdict |
| --- | --- | --- | --- |
| a1 flux bias z, faint / mid / bright | mean within 0.2 | 0.023 / -0.121 / **-0.579** | pass / pass / **FAIL (bright)** |
| a1 flux rms z, faint / mid / bright | 0.87 to 1.13 | 0.980 / 1.034 / 1.122 | pass |
| c1 coverage of 1 sigma, faint / mid / bright | 0.62 to 0.745 | 0.683 / 0.665 / **0.593** | pass / pass / **FAIL (bright)** |
| c1 coverage of 1.96 sigma | 0.925 to 0.985 | 0.963 / 0.945 / 0.933 | pass |
| a2 sky bias (gradient: annulus, plane; half masked: plane) | within 0.2 | 0.040, 0.023; 0.037 | pass |
| a3 curve of growth, 0.5 to 6 sigma | within 0.004 of the encircled energy | **0.0370** (0.0722 with centre in pixel weights) | **FAIL** |
| a4 centroid bias, faint / mid / bright | 0.05 / 0.02 / 0.02 px | 0.0045 / 0.0007 / 0.0001 | pass |
| b1 aperture sum, exact / centre | 1e-9 / 1e-12 relative | 6e-16 / 0 | pass |
| b2 annulus mean, scatter, pixel count | 1e-9, 1e-9, exact | 0, 2e-15, 0 | pass |
| b3 local plane, coefficients / sum under the aperture | 1e-7 | 9e-16 / 1e-15 | pass |
| b4 centroids, flux weighted / Gaussian weighted | 1e-6 / 1e-5 px | 5e-13 / 1e-7 | pass |
| b5 variance-plane noise, exact / centre | 1e-9 | 7e-16 / 2e-16 | pass |
| c2 centroid coverage, 1 sigma / 1.96 sigma, every level | 0.60 to 0.76 / 0.91 to 0.99 | 0.68 to 0.70 / 0.947 to 0.949 | pass |
| d1 to d4 refusals (saturated, masked, crowded, six contract codes) | each refused, with its own code, no number | 50 of 50, 50 of 50, 1 of 1, 6 of 6 | pass |
| d5 nondetection | at least 0.98 of blank positions | 1.000 | pass |
| e1 batch of ten | z within 3.5, position within 4 sigma | 2.20, 2.13 | pass |
| e2 one authentic frame | fixed analysis contract | **NOT RUN until Prompt 189** | not run |
| k1 kernel numbers | 1e-12 relative against the golden | bit-identical | pass |

### The three failed legs

a1 (bright), c1 (bright) and a3 fail as committed and are left failing. Nothing
was moved. The record, with each cause, is `tests/fixtures/photometry/failed-legs.json`.
They are one cause. The Gaussian star is sampled on pixels; the exact area
weights treat the light in an edge pixel as uniform, which it is not, and the
oracle agrees with Gravitas to 1e-15 on the same sums (b1), so the arithmetic is
the standard definition and the bias is the sampling floor of the definition
itself. At the committed aperture (1.5 FWHM, 3.5 sigma) the noiseless frame is
short by 0.16 percent of the flux, which is 0.6 of the statistical error only at
150,000 electrons (400 electrons); it is invisible at 1,500 and 15,000. The
curve of growth is held to 0.004 from 0.5 sigma, where the aperture is smaller
than the pixel, and the measured error is 1.4 percent at 0.5 sigma, 3.4 percent
at 1.5 sigma, 0.65 percent at 3, 0.16 at 3.5 and under 1e-5 from 5 sigma.
Of the two weightings measured, the kernel's centre in pixel weights does worse
(0.072). Options for Carl, each a register decision,
none taken here: (1) accept the floor, restating a1 and c1 at the bright level
(an aperture of at least 5 sigma, about 2.1 FWHM, where the measured error is under 1e-5) and a3 from 3.5 sigma, with the figures above
as the new committed bounds; (2) keep the bounds and fund a pixel-integrated
model (an aperture correction from a fitted PSF, a different tool, out of scope
here); (3) leave them failing, labelled, as the honest statement of the method.

## Two things the roadmap named and this does not do

**`js/measure/aperture.js` is not rewired onto the kernel.** The roadmap asks for
its aperture path to become a call into `reduce.js` "where the outputs are
identical". They are not: it takes the median and 1.4826 MAD of the annulus
without clipping (the kernel clips and averages), counts edge pixels by 8 by 8
sub-samples (the kernel's weights are 1 or, now, exact), reports a
background-limited noise model with the median's error (the kernel is the CCD
equation) and a first-moment centroid inside the circle. Rewiring would change
every number the Observatory's measure panel shows, and the roadmap forbids
changing numbers it cannot show to be identical. `tests/photometry.test.js`
holds both modules to the numbers they gave on v3 80668d38 (the golden), so a
later rewire is a measured change, not a silent one.

**The batch does not run on the Worker pool.** `js/workers/pool.js` is not
adopted by any shipped module, so adopting it costs the first-visit tier bytes
that tier does not have (3.5 KB of room on Node 24), and a batch does not need
it: 81 positions with a plane background and a centroid each take 62 ms in Node
on the Mac, and `measureBatch` yields to the page between chunks of 20 and stops
on request. If a later consumer needs thousands of sources, the pool is the
place; the adapters are pure and move to a Worker without change.

## Where the numbers are held

`tests/photometry.test.js` (31 tests), `tools/photometry-validate.mjs`,
`e2e/imagePhotometry.spec.js`, the oracle fixtures and `kernel-golden.json` under
`tests/fixtures/photometry/`. The kernel golden is regenerated only by
`node tools/photometry-fixtures.mjs golden`, and only on purpose.

## References

Merline, W. J. and Howell, S. B. 1995, Experimental Astronomy 6, 163 (the CCD
equation); Howell, S. B. 2006, Handbook of CCD Astronomy, 2nd ed. (aperture
photometry and sky annulus); Bradley, L. et al., photutils (Zenodo);
Astropy Collaboration 2022, ApJ 935, 167; Harris, C. R. et al. 2020, Nature 585,
357; Virtanen, P. et al. 2020, Nature Methods 17, 261.
