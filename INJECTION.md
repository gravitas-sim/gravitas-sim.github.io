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
  coverage summed over the binomial distribution (never below the level, at most 0.06
  above it on average).

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
magnitude. b2: the interval against `scipy.stats.beta.ppf` over 105 pinned cases to 1e-8.

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
