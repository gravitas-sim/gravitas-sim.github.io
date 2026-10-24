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

**(g) Authentic data.** Not run here. Prompt 189 landed one authentic frame and ran
what that frame can (`IMAGE_PACKS.md`, contract part 2): the sequence refusal and
the one-frame cosmic-ray stage pass; the sequence leg itself stays NOT RUN, because
it needs at least five frames of a field with comparison stars (request R1 there).

## What was built

- `js/measure/frameSeries.js` (lazy): the kernel. `runSequence` reads the frames
  one at a time through a provider (`frameAt(k)`, `release(k)`), calibrates each
  (the lab's `calibrate`, masters from `buildMasters`, electrons, the cosmic-ray
  mask), detects the marks once on a reference frame (Prompt 183) and carries them,
  registers every frame (a translation vote, then Prompt 181's `register`),
  photometers every mark in every frame (Prompt 180's `measure`, with the dark's
  and the masters' variance added through three additive options), tests the
  comparison candidates for steadiness (sequential elimination, alpha 0.001, at
  least three candidates, brightest first, with an override by name), forms the
  ensemble, the differential magnitude (the kernel's `differentialMagnitude`) and
  the sinusoid (the lab's `scanPeriod`), and states each uncertainty scaled by the
  square root of max(1, reduced chi-square). `observationOf` writes the light curve
  as an ordinary `gravitas.observation/1` time series (model `ccd-sequence`) that
  the Observatory's period tool reads; `quantitiesOf` and `reductionOf` write the
  ledger's quantities (measured, derived and assumed kinds, and `none` for a value
  with no stated error) and a replayable reduction; `replay` runs it again.
- `js/measure/pipeline.js`: the six nodes are registered `TOOLS` of kind
  `image-sequence` (`frames-calibrate` to `frames-lightcurve`), lazy, each a record
  of its own numbers, with the sequence's digest as the node's input identity.
- `js/measure/frameSource.js` (lazy): the synthetic sequence, the lab's detector
  frames with a chosen variable, a common transparency, a pointing that jitters and
  turns, and frames that go wrong; with no pointing change it is `simulateSeries`'s
  data frame for frame. Its truth manifest is not read by the pipeline.
- `js/observatory/imageSequence.js` (lazy, `#obsSeqPanel` in the Observatory):
  one node at a time (a stepper of six), the comparison-star chooser (a table of
  the candidates with brightness, signal to noise and steadiness, a checkbox each
  and a button that runs again with the ticked stars), the light curve as a plot
  with its table, the fitted sinusoid, a CSV, Keep in the ledger (source
  `image-sequence`) and Open in the Observatory, a refusal that names the frames and
  a button that leaves them out. The frame limit is stated in the panel.
- The lesson "A Variable Star From Frames" gained one advanced step, `the-whole-pipeline`
  (answer 2.88 hours, tolerance 0.1), after the existing ones; every step that
  existed before is unchanged, and `tests/framePipeline.test.js` pins their graded
  fields as they were at v3 27e4db69.
- `tools/frame-pipeline-validate.mjs` (`npm run frame-pipeline:validate`) runs every
  leg against the committed thresholds; `tools/frame-pipeline-oracle/` is the oracle.

## Limits

At most 256 frames, read one at a time; at most 1,398,101 pixels a frame
(Prompt 157's bound: 64 MiB over 48 bytes for the six planes held at once, the
raw frame, the calibrated frame, the working copy and three masters). A frame
the pointing of which cannot be found is refused by number, never silently
dropped: the whole run refuses and names the frames, and the reader leaves them
out by name. One target, one aperture for every frame, a translation vote that
searches 10 pixels, no differential refraction, no colour term, no time-varying
point-spread function. The stated period error is the asymptotic one for a sinusoid
and is a fair guide only when the amplitude is several times its own error (the
panel says so). The frames in the panel are synthetic.

## The oracle

numpy 2.2.6, scipy 1.15.3, astropy 6.1.7 and photutils 2.0.2 in Prompt 180's
throwaway environment (nothing was added), run with `python -I` offline on
`tests/fixtures/framepipeline/oracle-inputs.json` (48 raw frames, seed `fp-b-1`,
and the calibration set, as deflated uint16). `oracle.py` recalibrates with numpy,
finds each frame's shift by an FFT cross-correlation, measures with photutils'
exact circular apertures and a sigma-clipped annulus (`ApertureStats`), and fits
astropy's `LombScargle`. The results and the packages' versions and the scripts'
SHA-256 are committed (`oracle-results.json`, `oracle-provenance.json`); no
Gravitas code ran in them and tests never run Python.

## Validation results

`npm run frame-pipeline:validate` (Node 24.4.0, 301 s; `tests/framePipeline.test.js`
runs the same rows and asserts each against the bounds read from
`thresholds.json`). **57 of 58 rows pass; one committed leg fails and one is not
run.** The bounds are those committed first (`725efc56`; the one correction, the
scene's size, `858bd3c0`, before any validation number).

| Leg | Measured | Committed bound | Verdict |
| --- | --- | --- | --- |
| a1 amplitude pull mean / sd | -0.016 / 0.899 | 0.45 / 0.682 to 1.318 | pass |
| a1 period pull mean / sd | -0.064 / 1.009 | same | pass |
| a1 worst amplitude (sigma) / worst period (relative) | 2.40 / 0.0094 | 5 / 0.02 | pass |
| a2 pooled ratio, check star | 0.970 | 0.9 to 1.1 | pass |
| a2 star alone over check | 17.9 | at least 5 | pass |
| a3 against `reduceSeries` (dm, sigma) | 0, 0 | 1e-9 | pass |
| a4 calibrated pixels against `calibrate` | 0 | 0 | pass |
| a5 shift rms / p99 / refused | 0.019 / 0.041 px / 0 of 4800 | 0.15 / 0.4 / 0.001 | pass |
| b1 oracle light curve, rms / p95 / max over sigma | 0.039 / 0.086 / 0.113 | 0.5 / 1 / 2 | pass |
| b2 calibrated frames against numpy | 1.4e-14 | 1e-9 | pass |
| b3 oracle period / amplitude, in stated sigma | 0.0008 / 0.135 | 0.5 | pass |
| b4 shifts against the FFT, rms / max | 0.066 / 0.16 px | 0.25 / 0.6 | pass |
| c1 amplitude coverage 1 and 2 sigma | 0.74 / 0.96 | 0.474 to 0.892 / 0.86 to 1 | pass |
| c1 period coverage 1 and 2 sigma | 0.68 / 0.93 | same | pass |
| **d1 refuses frames 10, 11 and 20** | **0 of 10** | 10 | **FAIL** |
| d1 excluding them by name completes (45 points) | 10 of 10 | 10 | pass |
| d2 varying comparison flagged / never used / false flags | 0.975 / 40 of 40 / 0 of 239 | 0.95 / all / 2 | pass |
| d3 structural refusals, each with its code | 10 of 10 | 10 of 10 | pass |
| d4 constant target called variable / amplitude under 5 sigma | 0 of 60 / 1.0 | 2 / 0.98 | pass |
| d5 peak frames in flight / planes / pixel bound / frame limit | 1 / 6 / ok / ok | 1 / 6 / ok / ok | pass |
| e1 identity, replay, sequence-changed, other seed, `simulateSeries` | all | all | pass |
| f1 lab draws 1 to 3: period error (d) / amplitude (sigma) | 0.0015, 0.0006, 0.0010 / 0.44, 0.48, 1.47 | 0.004 / 4.5 | pass |
| f1 the lesson's new step answer (h) | 2.884 | 2.88 within 0.1 | pass |
| g1 authentic frame sequence | NOT RUN (189 ran its refusal and one-frame stage, both pass; the sequence needs a larger field, R1) | | not run |

**d1 fails as committed, and no bound was moved.** The leg's premise was that a
frame at 3 percent of the light leaves nothing to detect. It leaves the four
brightest stars (1,600 to 2,500 electrons in the frame), more than half the
marks, and the frame registers: a dim frame is what differential photometry
handles. The pipeline refuses frames 10 and 11 (a quarter-turned field, no stars
match) in 10 of 10 sequences and names them, and excluding 10, 11 and 20 completes a
45-point curve in 10 of 10. With frame 20 at 0.3 percent of the light (row
`x.d1.blindFrame`, evidence and not a committed leg) the pipeline refuses exactly
10, 11 and 20 in 10 of 10. The failure is recorded in
`tests/fixtures/framepipeline/failed-legs.json` and the test holds it: it must keep
failing until Carl reopens it (D-R10-63). Ruling: Carl, chat 2026-10-24, asked "Prompt 185 (PR #433, draft) passes 57 of 58 rows, but d1 fails as committed: frames 10, 11 and 20 should all be refused, but frame 20 (3% of the light) still detects the four brightest stars, so only 10 and 11 are refused in 10 of 10 sequences (bound: all three). With frame 20 at 0.3% of the light the pipeline refuses exactly 10, 11 and 20 in 10 of 10 (recorded as evidence only). How should #433 proceed?", chose "Leave failing, labelled (Recommended)": "Keep the committed d1 stimulus and bound, record the failure with its cause (tests pin it) and the 0.3% case as evidence, take #433 out of draft and merge; no threshold moved." It stays a known failed leg.

## Corrections made after the kernel existed

None to any bound. The e1 row pins the first run's frames (10 and 11, the d1
finding); the d3 saturated-target case saturates a 3 by 3 core, because a lone
hot pixel is repaired as a cosmic ray (the lab's own mask); the lesson step's
answer is the pipeline's period for the panel's default seed in hours (row
`f1.stepAnswer`).

## References

Kernel and lab: `CALIBRATION_LAB.md`; registration and sky coordinates
`ASTROMETRY.md`; photometry `PHOTOMETRY.md`; detection `DETECTION.md`; the oracle's packages are cited in
`oracle-provenance.json`.
