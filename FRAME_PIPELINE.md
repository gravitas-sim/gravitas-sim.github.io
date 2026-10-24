# Frame pipeline: from a stack of frames to a light curve

Roadmap III, Prompt 185. The calibration lab reduces one frame at a time
(`js/kernels/detector/reduce.js`); with Prompts 180 to 183 a sequence of frames
becomes a light curve by differential photometry, every step a node that can be
looked at on its own and replayed. This file is written in the order the work
was done: the validation contract first, and the rest after the measurements.

## The validation contract (committed first)

The algorithm, the synthetic scene and every bound are in
`tests/fixtures/framepipeline/thresholds.json` and were committed, with this
section, before `js/measure/frameSeries.js`, the sequence generator, the
validation tool or the oracle's results existed (the branch history shows the
order; only the milliseconds a frame of the existing kernel functions take had
been timed, which fixed the ensemble sizes). A check that a measurement crosses
is a failed check, not a reason to move its bound. The checks follow the
roadmap's section 7.5.8. The frames are the detector kernel's, 96 by 96 pixels,
with the full detector (bias with a column pattern, dark with hot pixels, a flat
with vignetting, dust and pixel scatter, no cosmic rays: a ray that lands on a
star's core can escape the single-frame mask, the lab's documented limit),
eight stars (a variable of 900 electrons a second, four comparison stars, a
check star and two faint ones), 48 frames of 60 seconds 0.01 day apart, a common
transparency that wanders, and a pointing that jitters by 1.5 pixels and turns
by 0.2 degree from frame to frame. The truth manifest is the generator's.

**Corrections made before any validation number existed.** One: the scene's frame
size and star positions. The first layout (64 by 64 pixels, stars 12 to 25 pixels
apart) was found, on the first run of Prompt 183's detector on frame 0 of a smoke
sequence and before any light curve, pull, ratio, coverage or oracle number, to be
crowded under Prompt 180's rule (another source nearer than the outer annulus plus the
aperture radius, 19.5 pixels at FWHM 3), so the committed marks rule would have
dropped every star. The frame is 96 by 96 and the eight stars are at least 24 pixels
apart (`thresholds.json`, `corrections`). No bound, rule or constant changed.

**The pipeline** (the nodes, in order): calibrate (the lab's own `calibrate`
with the masters of `buildMasters`, then electrons and the cosmic-ray mask),
marks (Prompt 183's detector on a reference frame, the width measured, the
aperture Prompt 180's), register (each frame's own sources matched to the
reference by a translation vote and fitted with Prompt 181's `register`),
photometry (every mark in every frame through Prompt 180's exact-edge aperture
and the kernel's CCD equation, with the dark's and the masters' noise),
comparison (the stability test and the choice of comparison stars, with an
override) and the light curve (the ensemble, the kernel's `differentialMagnitude`,
the lab's `scanPeriod`, stated uncertainties). The full text of every rule and
constant is the `algorithm` block of the thresholds file.

**(a) Truth cases.**

- a1: the amplitude and the period recovered end to end on 100 seeded
  sequences; pulls with their mean and spread, no gross outlier.
- a2: the stated uncertainties agree with the scatter of constant stars (pooled
  ratio 0.9 to 1.1 for the check star); the star alone is at least five times
  noisier than the check star.
- a3: nothing is reimplemented: configured as the lab is, the light curve is
  `reduceSeries`'s to 1e-9 and the masters' variance is `mastersVariance` exactly.
- a4: the calibrated frame is `calibrate`'s, pixel for pixel.
- a5: the registration recovers the pointing the generator drew (rms 0.15 pixel).

**(b) An independent oracle.** numpy, scipy, astropy 6.1.7 and photutils 2.0.2
(the throwaway environment of Prompt 180, nothing added), run offline on the raw
frames and the calibration set of one sequence (the same whole-count pixels) and
pinned as fixtures with their versions and parameters; Gravitas never recomputes
them and no Gravitas code ran in them. The oracle makes its own masters with
numpy, calibrates, finds each frame's shift by an FFT cross-correlation (a
different method from the translation vote), measures the stars with photutils'
exact circular apertures and sigma-clipped annulus, and forms the differential
light curve; its sinusoid is astropy's `LombScargle`. b1: the light curves agree
frame by frame in units of Gravitas's sigma; b2: the calibrated frames agree to
1e-9; b3: the fitted period and amplitude agree within half a sigma; b4: the
shifts agree.

**(c) Coverage.** The stated amplitude and period uncertainties cover the truth
at 68.27 and 95.45 percent on the 100-sequence ensemble, within 4.5 standard
errors of a binomial.

**(d) Negative and refusal cases.** d1: a sequence whose frames fail
registration (two quarter-turned fields, one clouded frame) refuses the light
curve and names exactly those frames; excluding them by name completes it. d2:
a comparison star that varies is flagged and left out, and constant comparison
stars are not flagged beyond a stated rate. d3: the structural refusals, each
with its code. d4: a constant target is not called variable. d5: frames are
read one at a time and the working set is six planes within Prompt 157's bound.

**(e) Reproducibility.** The same seed gives the same light curve bit for bit in
one process; a saved record replays identically; the generator with no pointing
change gives `simulateSeries`'s frames.

**(f) The lesson.** The full pipeline on the lesson's own series gives the
lesson's period and amplitude within its own tolerances; every step that existed
before this prompt is unchanged.

**(g) Authentic data.** **NOT RUN until Prompt 189.** Nothing was downloaded and
nothing was fabricated for this leg.
