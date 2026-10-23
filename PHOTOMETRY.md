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
