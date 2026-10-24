# Completeness by injection

Roadmap III, Prompt 184. A detector misses faint sources, and how many it misses
depends on the frame it looked at. This measures it: sources of chosen magnitudes
are added to a copy of a frame, the detector of Prompt 183 looks again, and the
share it finds, by magnitude, is the completeness of that frame. This file is
written in the order the work was done: the validation contract first, and the
rest after the measurements.

## The validation contract (committed first)

The definitions and every bound are in `tests/fixtures/injection/thresholds.json`
and were committed, with this section, before `js/measure/inject.js`, the
validation tool, the oracle's results or any test existed (the branch history
shows the order). A check that a measurement crosses is a failed check, not a
reason to move its bound. The checks follow the roadmap's section 7.5.8.
Synthetic frames are the detector kernel's, as in Prompt 183 (a clean detector,
128 by 128 pixels, a sky of 90 electrons a pixel, 8 electrons of read noise,
gain 1.5, noise 12.416 electrons a pixel), with the truth manifest the injection
itself writes.

**What is injected.** Point sources of a stated instrumental magnitude (the
convention of Prompt 180: `-2.5 log10` of the rate in electrons a second, so a
source injected at a magnitude measures as that magnitude), spread through the
pixel-integrated Gaussian or Moffat of Prompt 183, each pixel's added electrons a
Poisson draw of the source's mean there. Positions and magnitudes come from the
`injection` stream of Prompt 149, the shot noise from the `noise` stream, each
keyed by the seed and the trial, so a run is reproducible and a longer run
contains the shorter one. Sources keep 3 FWHM from the border and 4 FWHM from one
another and from every source the frame already holds, so that what is counted is
the detection of an isolated source; crowded fields are out of scope. A source
is recovered when the detector lists one within 2 pixels of it.

**(a) Analytic and truth cases.**

- a1: the completeness of a synthetic field against the closed form for a known PSF
  and noise. A Gaussian source of matched-filter signal to noise `s`
  (`F / (sqrt(4 pi) sigma noise)`) smoothed by the matched kernel is a Gaussian of
  variance `2 sigma^2` whose area above the 4 sigma threshold is
  `4 pi sigma^2 ln(s / 4)` pixels, so the five-pixel segment rule is met at
  `s_c = 4 exp(5 / (4 pi sigma^2))`, which is 5.11 at FWHM 3, and the completeness is
  `Phi(s - s_c)`. Six depths, `s` of 3, 4, 5, 6, 7.5 and 10, 1800 sources each. The
  closed form ignores pixel sampling, the correlation of the smoothed noise between
  neighbours and the source's own shot noise, each of which moves the half point by a
  fraction of a sigma; the bounds (0.25 pointwise, the half point within 0.8, at
  least 0.99 at 10, at most 0.10 at 3) are that width, fixed before any number existed.
- a2: the counting, against a detector whose answer is exactly known (a stand-in with
  a logistic recovery probability and its own false sources): what the tool counts as
  recovered and as extra equals what the stand-in did, exactly, and the binned curve
  follows the logistic.
- a3: the injected source against the detector kernel's own rendering of the same
  sources (2e-6 of the flux), the conservation of light (1e-6), and the shot noise
  (mean 0 and rms 1 in units of the square root of the flux).
- a4: the half point moves with the PSF width as the closed form says: a shift of
  -0.292 magnitude from FWHM 3 to FWHM 4.5, within 0.15.
- a5: the binomial interval, exactly: closed ends, a published case, and its exact
  coverage summed over the binomial distribution (never below the level; on average
  at most 0.25 above it at 68.27 percent and 0.10 above at 95 percent: see "Corrections made
  before the module existed").

**(b) An independent oracle.** photutils 2.0.2 with astropy 6.1.7, numpy 2.2.6 and
scipy 1.15.3 (the throwaway environment of Prompt 180, nothing added), run offline
and pinned as fixtures with the versions and parameters recorded; Gravitas never
recomputes them and no Gravitas code ran in them. b0: the oracle renders sources with
`scipy.special.erf` and the pixels agree to 1e-9 of the flux. b1: an independent
injection run on the same frame: the oracle takes the blank frame and the plan Gravitas's
stream drew (4000 sources, positions and fluxes), draws its own Poisson noise, detects
with photutils (`Background2D`, astropy `convolve`, `detect_sources`, `SourceCatalog`)
under the same settings and writes its curve; Gravitas runs the same plan with its own
noise; per bin of at least 50 sources `|z|` is at most 4 (the two as independent
binomials, which is conservative because the shared plan correlates them), the summed
`z^2` is under its 0.999 chi-square quantile and the half points agree within 0.05
magnitude. b2: the interval against `scipy.stats.beta.ppf` over 111 pinned cases to 1e-8.

**(c) Coverage.** The binomial interval's coverage on a seeded ensemble of 300 whole
injection runs (truth for a bin is the completeness pooled over the other 299): 0.65
to 0.84 at 68.27 percent and 0.935 to 0.995 at 95 percent, over bins of at least 15
sources whose truth is between 0.05 and 0.95. A bin's completeness is an average
across the bin, which makes the exact interval slightly conservative; the bounds say so.

**(d) Negative and refusal cases.** A display-only image, no contract, a raw frame, an
incomplete contract and pixels not in electrons are refused with their own codes; an
injection whose copy would pass Prompt 157's memory bound (2,048 by 2,048 with data
and mask planes, which 157's own check admits alone) is refused before any array is
made and before the detector runs; a parameter outside its limit, a source brighter
than the linearity limit allows and a frame with no room for one source each have
their own codes; a refusal calls the detector 0 times and leaves the frame's pixels
unchanged. A completeness curve is not a detection probability for another PSF or
background: `appliesTo` refuses a frame whose FWHM (or noise, or detection threshold)
differs and names what differs, and the selection function built from a curve refuses
a magnitude outside the injected range instead of extrapolating.

**(e) Reproducibility.** The same seed gives the same plan, pixels, recovered list and
curve, bit for bit in one process; another seed differs; the first ten trials of a
twenty-trial run are the ten trials of a ten-trial run. Nothing through `exp`, `log`,
`pow` or trigonometry is pinned (Node 20, 22 and 24 differ in the last bits).

**(f) The selection-effects suite.** The curve read as Prompt 154's selection
function applies to a population within 4 sigma of its expectation, corrects counts
within 4 sigma, and agrees with a logistic completeness of the survey suite to 3
percent.

**(g) Authentic data.** One frame from Prompt 189, injected and recovered against
photutils on the same pixels. **NOT RUN until Prompt 189** has landed an authentic image
pack: nothing was downloaded and nothing was fabricated for this leg.

## Corrections made before the validation ran

Three statements in the committed contract were wrong in themselves and were
corrected, in `thresholds.json` (`corrections`) and here, before the validation tool
or any test existed and before any Gravitas coverage or validation count was
computed; none moved a bound after a result. (Candidly: the first correction came
before the module, the other two after a first draft of it and one smoke run of six
completeness levels had been seen; neither concerns the completeness curve's bounds,
and the smoke numbers were not used to choose anything.)

1. The pinned interval cases number 111, not 105 (arithmetic of the committed
   enumeration).
2. a5 (iii) said the exact interval's mean coverage exceeds the level by at most
   0.06. It does not for small counts, because the interval's edges are discrete:
   an independent computation (scipy `beta.ppf` and `binom`) gives a mean over p of
   0.894, 0.851, 0.805, 0.761 and 0.740 at 68.27 percent for n = 5, 10, 20, 50 and 100
   (0.991 to 0.964 at 95 percent). The floor (never below the level) is the exactness
   claim and is unchanged; the bound on the mean is 0.25 and 0.10.
3. a2 names 60 trials of 100 sources, which a 128 by 128 frame cannot hold at 4 FWHM
   spacing (about 58 fit); the a2 frame is a blank 512 by 512 frame, whose pixels the
   stand-in detector ignores.

**Correction 2 was a bound widened after the oracle was computed, and Carl ruled on it.**
The 0.06 of a5 (iii) was committed in `b2dc6737`. The independent computation quoted
above is the oracle work of commit `17fcc8d2` (scipy `beta.ppf` and `binom`), and the
bound was widened to 0.25 and 0.10 in `24376f10`, which comes after that commit and
before `js/measure/inject.js` existed. So the widening was made after an oracle
number had been seen, though before any number of this module's own was computed.
The original 0.06 and its reason stay on record in `thresholds.json` (`corrections`,
entry 2: "first said the mean coverage of the exact interval exceeds the level by at
most 0.06") and in the history of that file, and in item 2 above. Carl, chat
2026-10-23, asked "Prompt 184's committed bound on the mean over-coverage of the exact
Clopper-Pearson interval (a5(iii), 0.06) is mathematically unreachable at small n
(scipy itself gives 0.894 at n=5, 68%). It was widened to 0.25 (68%) / 0.10 (95%) after
the oracle was computed but before the module existed. Accept the correction?", chose
"Accept the correction (Recommended)": "Keep 0.25/0.10, recorded in D-R10-62 and
INJECTION.md as widened after seeing the oracle, quoting your answer; the original 0.06
and the reason stay visible."

## What was built

`js/measure/inject.js` is a pure module (no DOM) over the adapter of Prompt 180
(`adapt`), the detector of Prompt 183 (`detectIn`, whose pixel-integrated
`modelPixels` is the source's profile) and Prompt 154's statistics kernel (the
incomplete beta function and the selection object). The panel is
`js/observatory/imageInject.js`, loaded only when it is first opened; the kernel,
the panel and its words are `NEVER_PRECACHED`, so nothing was added to the idle tier.
Pixel (0, 0) is the center of the first pixel in the kernel; the table and the CSV use
the FITS convention (1-based).

1. **The plan.** `planTrial` draws, for each source, a uniform position (3 FWHM from
   the border, 4 FWHM from every other source of the trial and from every source the
   frame already holds, 200 attempts) and then a magnitude (uniform, or a power law
   `10^(slope m)`), all from `stream('injection', seed, 'plan', trial)`. A source that
   cannot be placed is counted as unplaced, not silently dropped. A trial's draws do
   not depend on the number of trials, so a longer run contains the shorter one.
2. **The injection.** `expectedMap` adds each source through `modelPixels` (a Gaussian
   by the difference of two accurate `erf`, or a Moffat on a 5 by 5 grid of sub-pixel
   midpoints; a window of 6 sigma, or 5 FWHM for a Moffat) and `shotAdded` draws each
   touched pixel's electrons from a Poisson distribution of its mean (exact below 30,
   a Gaussian of equal mean and variance above, the detector kernel's rule) from
   `stream('noise', seed, 'shot', trial)`. `inject` adds that to a **copy** of the
   adapted frame; the frame is never written (a test holds the digest).
3. **Recovery.** `match` pairs injected sources with detections, nearest pair first,
   each detection answering at most one source, within 2 pixels. A detection that
   answers none and is not within 2 pixels of a source the frame already held is
   *extra*; the curve reports them per trial.
4. **The curve.** `curveOf` bins by magnitude (a stated width), gives each bin
   `k` of `n` with the exact Clopper-Pearson interval (`binomialInterval`, bisection on
   `betaI`), and the magnitudes where the series first falls below 0.5 and 0.9 by linear
   interpolation between bin centers, with the magnitudes where the interval's edges
   cross (a statement about the curve, not a coverage claim for the crossing). A series
   that starts below the target or never crosses it has no crossing and says so.
5. **What it was measured under.** `conditionsOf`: the PSF (model, FWHM, whether
   measured or entered), the frame's median noise and sky from the detector's own mesh,
   the exposure, the route and the detection settings. `appliesTo` refuses another
   frame whose FWHM is not within 10 percent, whose noise is not within 10 percent or
   whose detection settings differ, and names what differs. `selectionOf` builds
   Prompt 154's selection object on the observable `m` (the curve interpolated between
   bin centers, flat within the outer half bins) and **refuses** a magnitude outside the
   injected range (`out-of-range`) instead of extrapolating; `logisticOf` fits the
   survey suite's logistic (`1 / (1 + exp((m - m50) / w))`) by weighted least squares of
   the logit over the bins strictly between 0 and 1.
6. **The record.** `quantitiesOf` writes the 150 quantities (the magnitudes at 50 and
   90 percent with interval uncertainties, each bin's completeness with its exact
   interval, the extra detections a trial); `reductionOf` writes one reduction step
   (`image-injection`) with the spec, the conditions, the names of the two streams
   (`draw.stream`), the counts and, up to 2,000 injected sources, the injected and
   recovered lists; `replay` redoes the run from the spec on the frame now open,
   refuses if its pixels changed (`image-changed`) and says whether the counts are
   identical. The ledger source is `image-injection`.
7. **Refusals before work.** The contract's refusals (Prompt 180's codes), pixels not in
   electrons on the variance route (`unit`), a copy that would pass Prompt 157's
   decoded-memory bound (`too-large`, the frame's planes plus one Float64 plane), a
   parameter out of bounds (`bad-parameter` with its name), a margin that leaves no
   interior (`no-room`) and a magnitude too bright for the linearity limit
   (`beyond-linearity`, with the brightest allowed) are all refused before the detector
   runs. A frame whose own sources leave no room refuses `no-room` after one baseline
   detection.

### The panel

On an image observation: the width of a star (typed, or measured from the image with
the detection tool's own fit), the brightest and faintest magnitude (both empty means
signal to noise 12 down to 2.5 at the frame's own noise), sources in a trial, trials,
seed, a bin width, Inject and look again, Stop, the curve through the plot component
(the share found, the interval's two edges as lines) with its table, a statement of what
the curve was measured under and that it is not the chance of detection for another width
or sky, Save the lists as CSV and Keep in the ledger. A run goes one trial at a time so
Stop works and the page stays alive. Every control works from the keyboard alone and by
a single pointer alone; every result is also said in a status region; a refusal says why
in words and every action is disabled. The panel's strings are in
`js/i18n/en.imageInject.js` and `es.imageInject.js`; the Spanish has not been read by a
fluent reader.

## Limits

- **Isolated sources only.** Sources keep 4 FWHM from each other and from every source
  the frame holds; a crowded field is not tested, and the completeness is the one for
  an isolated point source. Blending is not injected.
- **One PSF for the whole image**: a circular Gaussian or Moffat of the stated width;
  no ellipticity, no variation across the frame, no color term.
- **The detector is Prompt 183's**, with its settings recorded; completeness for another
  detector, threshold or minimum area is a different curve.
- **The bin's completeness is an average across the bin**; the interval is binomial in the
  number injected, which is slightly conservative for that reason (leg c1: 0.826 coverage
  at 68.27 percent against the 0.683 nominal) and, for counts of a few, conservative by
  the discreteness of the exact interval (leg a5).
- **Magnitudes are instrumental** (electrons a second); there is no zero point and no
  transformation to a catalog band.
- **Masked pixels stay masked**: a source that falls on one is counted by what the
  detector can see.
- **The lists in the record stop at 2,000 injected sources**; beyond that the record keeps
  the spec, the streams and the counts, from which the run replays.
- **Reproducible by seed in one engine, not bit for bit across engines**: the draws are
  exact (`mulberry32`), but the Poisson draw and the magnitudes pass through `exp`, `log`
  and `pow`, which differ in the last bits between Node versions; counts and bands are
  what is judged across versions (the validation gave the same numbers to four digits on
  Node 22 and 24).
- Depth is the frame's, not the instrument's: a curve from one frame says nothing about
  another unless `appliesTo` allows it.

## The oracle

`tools/injection-oracle/` holds `make-inputs.mjs` (writes `oracle-inputs.json`: a blank
frame in whole ADU and a plan of 4,000 sources, both base64), `oracle.py` (run with
`python -I` from a directory without data) and `provenance.py`; their products are
`tests/fixtures/injection/oracle-{inputs,results,provenance}.json`, with the scripts'
SHA-256. photutils 2.0.2, astropy 6.1.7, numpy 2.2.6, scipy 1.15.3, Python 3.10.12, from
PyPI on 2026-10-23, in the virtual environment of Prompt 180; no other package was
installed and the environment is not committed. It renders with `scipy.special.erf`,
draws its own Poisson noise with numpy, detects with photutils and writes which sources
were recovered; the tests read the pinned values and never recompute them. The oracle ran
on the same frame and the same plan as the tool, but made no use of any Gravitas
decision, so the agreement of the two curves is not a self-comparison.

## Validation results

Run by `npm run injection:validate` (Node 24.4.0 and, on a scratchpad copy, Node 22.23.4,
which gave the same numbers to four digits; `tests/injection.test.js` runs the same rows
in plain Node and asserts each). Every bound is the one committed in `thresholds.json`
before the module had been run (b2dc6737, with the three corrections above made before
any validation number existed). **No leg failed; no bound was moved after a result.** A
first run of the tool stopped on two defects of the tool itself (the committed 400-trial
oracle plan against a 200-trial limit of the reader's tool, now stepped as the panel
steps; a refusal order that called the detector before refusing a too-bright magnitude,
now before) and the pinned positions were taken from the first output.

| Leg | Measured | Committed bound | Verdict |
| --- | --- | --- | --- |
| a1 completeness at s = 3, 4, 5, 6, 7.5, 10 (1,800 each) against Phi(s - 5.11) | 0.042, 0.160, 0.425, 0.717, 0.966, 1.000 against 0.017, 0.133, 0.456, 0.813, 0.992, 1.000 | within 0.25 | pass |
| a1 half point; at 10; at 3; monotone | s = 5.26 (closed form 5.11); 1.000; 0.042; yes | within 0.8; at least 0.99; at most 0.10; slack 0.03 | pass |
| a2 recovered and extra equal the stand-in's decisions (6,000 sources) | all equal | exact | pass |
| a2 binned curve against the logistic, largest bin z; half point | 3.14 (16 bins); 0.016 mag | 4; 0.05 | pass |
| a3 against the detector kernel's rendering; conservation | 7.5e-8 of a source; 5.5e-13 | 2e-6; 1e-6 | pass |
| a3 shot noise (1,000 sources): mean, rms in sqrt(F) | 0.023, 0.981 | 0.1; 0.9 to 1.1 | pass |
| a4 half-point shift FWHM 3 to 4.5 | -0.346 mag (closed form -0.292) | within 0.15 | pass |
| a5 closed ends; Clopper-Pearson 3 of 10 | 8.9e-16; 4.7e-5 | 1e-9; 5e-5 | pass |
| a5 exact coverage floor over n and p; mean excess at 68.27 and 95 percent | 0.0013 and 0.0057 above the level at worst; 0.211 and 0.040 | not below the level; 0.25 and 0.10 | pass |
| b0 oracle rendering (scipy erf) against the module's | 1.6e-16 of a source | 1e-9 | pass |
| b1 independent injection run (4,000 sources): largest bin z; summed z squared; half points | 1.28 (17 bins); 5.9 of 40.8; -2.484 against -2.477 mag | 4; the 0.999 quantile; 0.05 | pass |
| b1 extra detections a trial | 0.0025 (module), 0.005 (oracle) | at most 0.05 | pass |
| b2 interval against `scipy.stats.beta.ppf` (111 cases) | 2.3e-15 | 1e-8 | pass |
| c1 coverage of the interval on 300 runs (1,209 bins): 68.27 and 95 percent | 0.826 and 0.979 | 0.65 to 0.84; 0.935 to 0.995 | pass |
| d1 nine refusals with their own codes, 12 parameter cases, the detector called 0 times, the frame unchanged | all | exact | pass |
| d2 another PSF, noise or threshold refused with names; the same frame accepted | 3 and 1 | 3 and 1 | pass |
| d3 a magnitude outside the range refused; interpolation inside | 3 of 3; 0 | 3 of 3; 1e-12 | pass |
| e1 same seed twice, same injected pixels, longer run holds the shorter, another seed differs, 5 pinned positions | all | all | pass |
| f1 selection function on 4,000 magnitudes: included count, corrected total (z) | 0.38 sigma (2,123 of an expected 2,115); -0.10 sigma | 4 | pass |
| f1 logistic: half point; summed probability | 0.017 mag; 0.18 percent | 0.05; 3 percent | pass |
| g1 authentic frame against photutils | not run | | **NOT RUN until Prompt 189** |

Two numbers are close to their bounds and are named here, not hidden: the 68.27 percent
coverage (0.826 against an upper bound of 0.84, the conservatism of exact intervals on
bin averages) and the Clopper-Pearson table value (4.7e-5 against 5e-5, the table's own
four-digit rounding). The half-point shift of leg a4 is 0.054 mag larger than the closed
form: the closed form ignores the correlated noise of neighboring pixels, which matters
more for the broader star.

## References

- Clopper, C. J. & Pearson, E. S. 1934, Biometrika 26, 404 (the exact binomial interval).
- Brown, L. D., Cai, T. T. & DasGupta, A. 2001, Statistical Science 16, 101 (interval
  estimation for a binomial proportion: the exact interval over-covers where counts are
  small).
- Bertin, E. & Arnouts, S. 1996, A&AS 117, 393 (SExtractor: thresholding and segments,
  the detector's definitions).
- Astropy Collaboration 2022, ApJ 935, 167; photutils (Bradley et al.), version 2.0.2,
  whose `Background2D`, `detect_sources` and `SourceCatalog` are the oracle's detector.
- `DETECTION.md` (Prompt 183): the detector, the PSF and its pixel-integrated models.
- `PHOTOMETRY.md` (Prompt 180): the instrumental magnitude and the pixel contract.
- `STATISTICS.md` (Prompt 154): the selection function and the completeness correction.
