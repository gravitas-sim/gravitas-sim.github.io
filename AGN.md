# Active galactic nuclei: broad-line redshift, luminosity, the Eddington bound, variability and the BPT classes (Prompt 252)

How bright is that quasar, what is the least mass that can power it, how big can the region that varies be, and what lit
that galaxy's emission lines? This is the kernel, contract and validation part of Prompt 252, Part A (an invisible pull
request: no viewer mode, no investigation, no model-page section, no instructor material, no pack, nothing a student sees).
It adds `js/kernels/agn/` (seven modules), the validator `tools/agn-validate.mjs`, an independent oracle
`tools/agn-oracle/`, a validation group of five checks, and the fixtures under `tests/fixtures/agn/`. Part B (the luminosity
function) is a gate with committed thresholds and no verdict: [AGN_LUMINOSITY_FUNCTION_GATE.md](AGN_LUMINOSITY_FUNCTION_GATE.md).
The viewer modes, the two investigations ("A quasar's spectrum" and "What powers it?") and the model-page section are a
separate instructional pull request that **waits for Carl's go-ahead: the consumers rule is unmet** (no rule was committed
beforehand naming what may be built on a kernel whose redshift, line-flux and coverage legs fail, and the pipeline-oracle and
authentic legs are not run), so none of it is built whatever the table below says. The kernel builds on the galaxy kernel's
correlation (Prompt 248, [GALAXY_SPECTRA.md](GALAXY_SPECTRA.md)), the ISM kernel's line fit (Prompt 247, [ISM.md](ISM.md)),
the cosmology kernel's distances and the statistics kernel's intervals.

The validation contract was committed first, in `tests/fixtures/agn/thresholds.json` (commit 440e4e72), with the gate's
`gate-thresholds.json`, before any kernel, oracle output, spectrum or result existed. This document was written after it.
A crossed bound is a failed leg and stays failing; only Carl resets one. **The recorded run has five failing legs** (A7,
B3, B6, C1, D2; below), 20 pass, 4 are reported and 12 are not run (B7, E1 to E4 and the seven gate legs). Six amendments
are in `thresholds.json` with their reasons, five before any validator run and one (AM6, a validator expression) after the
first; none moves a bound.

## What is built and what is not

Built: (1) **the redshift of a quasar from its broad lines**: the galaxy kernel's direct lagged cross-correlation with a
broad-line template the caller supplies (a source string, no default), the high-pass window widened to 401 samples through
a new opt-in parameter of `crossCorrelate` whose default (101) is unchanged; (2) **the luminosity at the observed band** from
a flux and a redshift through the cosmology kernel, in the rest wavelength lambda_obs / (1 + z), with the band and the
absence of a K-correction on every result; (3) **the bolometric luminosity** as a caller-supplied factor with its rest band,
tolerance, scatter in dex and source (no default), the scatter a separate **model-limited** term beside the statistical one;
(4) **the Eddington luminosity** and the **mass it bounds from below**, always labelled a bound with its assumptions;
(5) **a variability time scale** (the fastest significant e-folding time over pairs of epochs, with a conservative form) and
the **light-crossing size bound** R <= c tau delta / (1 + z); (6) **the BPT classification** with caller-supplied dividing
curves, seeded class probabilities, refusals and the stated limits of two ratios, and the four line fluxes measured with the
ISM kernel's Gaussian fit; (7) **a labelled synthetic generator** of quasar spectra, narrow-line spectra and sinusoidal light
curves with truth manifests.

Not built, on purpose: any viewer mode, lesson, model section or instructor material; **any pack** (packs have 0 B of room
and no quasar spectrum is in the tree); **any SDSS spectrum, pipeline value or catalogue row**; **any template**, dividing
curve, forbidden-line wavelength or bolometric correction from the literature (none is in the tree; the kernel holds none and
the synthetic worlds use values invented by a rule and labelled so); a **K-correction**; a **black-hole mass from a line
width** (single-epoch virial masses are not in this prompt); the **luminosity function** and every Part B leg.

## Equations, assumptions and limits (AGN-RULE-1, in `thresholds.json`)

**R1, the redshift.** Prompt 248's rule: log10 grid, 401-sample linear high-pass (about 55,000 km/s at the quasar grid's step
of 2e-4 dex), weighted correlation `q(k) = S / sqrt(T)`, curvature uncertainty `var(k) = 1 / (q |q''|)`, status ladder 6 and
10, a second peak at 0.8 of the best refused as ambiguous. The interval carries the noise only: broad lines of different
ionisation can disagree on the redshift, a template that is not the object biases it (R1, R2 below), and the caller may add a
velocity systematic as a separate model-limited term.

**L1, luminosity.** `nu L_nu(lambda_obs / (1 + z)) = 4 pi d_L^2 (lambda F_lambda)(lambda_obs)` in the assumed cosmology. **No
K-correction is applied**: the result is the luminosity at a rest wavelength that changes with redshift, so two sources at
different redshifts are compared at different rest wavelengths; for a power-law continuum the luminosity at a fixed rest
wavelength differs from it by (1 + z)^(alpha + 1) (R3 below). No distance uncertainty, no extinction correction, isotropic
emission.

**L2, bolometric.** `L_bol = BC L_band`, refused `band-mismatch` when the observed band's rest wavelength is further from the
factor's band than its tolerance (there is no K-correction to move it). The interval is formed in log10: the statistical
sigma from the flux, the model sigma the factor's scatter, a normal interval on their quadrature sum. The model-limited term
does not shrink with more data; leg C2 shows that leaving it out covers 0.107 of truths at one sigma against 0.685 with it.

**E1, Eddington.** `L_Edd = 4 pi G M m_p c / sigma_T` with GM_sun, m_p and sigma_T read from
`tests/fixtures/agn/constants-source.json` (an offline reading of the installed astropy, not typed). The mass bound
`M >= L_bol / L_Edd(1 solar mass)` is a **lower bound**, valid for a steadily radiating, spherically symmetric,
ionised-hydrogen source whose luminosity does not exceed the Eddington value; it says nothing about how far above the bound
the true mass lies. Returned as a one-sided 95 percent limit from the lower limit of the luminosity.

**V1 and V2, variability and size.** For every pair of epochs with a flux change of at least 5 sigma of the difference (AM3: a 3 sigma cut would be
expected to find about 4.8 chance pairs in a flat 60-epoch curve; 5 sigma is a trial correction), the e-folding time
`tau_ij = (t_j - t_i) / |ln(F_j / F_i)|`; the point estimate is the minimum and is **biased low by that selection**; the
conservative form lowers the log ratio by 3 sigma of the ratio and is what `R <= c tau_up delta / (1 + z)` uses. The bound
assumes one coherent region varying as a whole, a stated Doppler factor (1 means no beaming) and no lensing. It is an upper
limit on the size, not a measurement: a region can be smaller than the light-crossing bound.

**B1 and B2, BPT.** `x = log10(F_N / F_Halpha)`, `y = log10(F_O / F_Hbeta)` against two curves `y = a / (x - b) + c` the
caller supplies with a source string: star-forming when `x < b_sf` and `y < f_sf(x)`; AGN when `x >= b_agn` or `y > f_agn(x)`;
composite otherwise. Every line needs a signal to noise of 3; a class is assigned when its seeded Monte Carlo probability (2,000
draws) is at least 0.9, else the result is "not constrained" with the three probabilities. **Limits, returned with every
result:** two line ratios only (an object near a boundary is not classified by a sharper measurement of the same two ratios);
the boundary is a definition, not a law (R4: moving a curve by 0.05 dex changes the class of 0.9 to 1.5 percent of random
points and a 20 percent change of its slope 2.7 to 3.2 percent); no Seyfert-LINER split; the hydrogen ratio is not corrected for
stellar absorption of H-beta; one aperture; narrow lines only; a detection of all four lines. A line outside the spectrum is
`line-outside-coverage` and two lines closer than 1.5 line-spread widths are `unresolved-blend`.

**Physical domain.** Broad-line redshifts of objects whose template is in hand and unaliased; luminosities of sources whose
band maps within the factor's tolerance of its rest band; mass bounds for sources that radiate isotropically and steadily;
size bounds for variability of one coherent region; BPT for narrow-line spectra with resolved lines. Outside these the kernel
refuses or says "not constrained".

## Delta table (7.5 rule 9)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
| --- | --- | --- | --- |
| `js/kernels/galaxy/` correlation | a window wide enough for broad lines | `quasarRedshift` | none (one opt-in parameter, default unchanged) |
| `js/kernels/cosmology/` distances | a luminosity with the band and the K-correction's absence stated | `bandLuminosity` | none |
| `js/kernels/ism/` Gaussian line fit | four-line flux set with blend and coverage refusals | `measureBptLines` | none |
| `js/kernels/statistics/` intervals | a bolometric interval with a separate model term | `bolometricLuminosity` | none |

## Validation table (`npm run agn:validate`; recorded in `tests/fixtures/agn/results.json`, Node 22.23.4)

41 rows: **20 pass, 5 fail, 4 reported, 12 not run.** Oracle: numpy 1.26.4, scipy 1.13.1, astropy 6.0.1 (constants only),
no Gravitas code, `tools/agn-oracle/oracle.py` reading `oracle-inputs.json` (forward-model data, no kernel output).

| Leg | Result |
| --- | --- |
| A1 Eddington closed form, linearity, inverse | pass (0 to 1e-16) |
| A2 luminosity scaling (nu F_nu identity, low-z limit 1.6e-5, distance ratio, rest wavelength, doubling) | pass (after AM6) |
| A3 bolometric terms (central, half-width 5.7e-14, quadrature, model-limited flag) | pass |
| A4 size bound | pass (0) |
| A5 sinusoid's fastest time scale | pass (ratio to the closed form 1.000013 to 1.000056) |
| A6 BPT known points | pass (12 of 12) |
| A7 quasar shift, noise-free | **FAIL** |
| B1 Eddington against the oracle (arithmetic and units, not the constants) | pass (0) |
| B2 luminosity distance against the oracle (scipy quad) | pass (2.9e-16; luminosity 7.9e-16) |
| B3 redshift against the independent correlation | **FAIL** (3 of 8 recovered, agreeing to 8.6e-9 in z) |
| B4 BPT against the oracle (3,000 flux sets, 3,000 points) | pass (3.4e-16; 3,000 of 3,000 classes) |
| B5 time scale against the oracle (10 curves) | pass (2.2e-16, same pairs) |
| B6 line fluxes against scipy's curve_fit | **FAIL** (up to 1.08 sigma, sigmas up to 48 percent) |
| B7 SDSS pipeline oracle | NOT RUN |
| C1 redshift coverage | **FAIL** (ok share 0.553; coverage 0.446; sd 16.5) |
| C2 luminosity interval coverage, with the correction's scatter | pass (0.685 at 1 sigma, 0.957 at 2 sigma; statistical-only 0.107) |
| C3 Eddington bound coverage | pass (0.998 against 0.94) |
| C4 size bound holds | pass (0.964; median tau_up / tau_min 1.09; all 500 answered) |
| C5 BPT ensemble | pass (x coverage 0.63, y 0.72; 99.2 percent of 256 classed worlds correct; 44 ambiguous) |
| D1 lines outside coverage | pass (120 of 120) |
| D2 undetected and blended lines | **FAIL** (blend 50 of 50; weak line 48 of 50) |
| D3 band mismatch; D4 bound label and inputs; D5 light-curve refusals; D7 ambiguous BPT points | pass |
| D6 featureless spectrum | pass at the bound (2 of 200 return ok, 0.01; the largest q is 12.4) |
| E1 to E4 authentic legs | NOT RUN |
| R1 to R4 | reported (below) |
| G1 to G7 (Part B gate) | NOT RUN |

## The five failing legs, and what they mean

All five have their reason in `failed-legs.json`. Three share a cause. **The quasar world's invented ultraviolet lines sit at 0.2,
0.3 and 0.4 of H-alpha, a 2:3:4 spacing** (my choice when the contract was written: a poor one, because a shifted copy of the
template lines up with itself), so the galaxy kernel's committed ambiguity rule (a second peak at 0.8 of the best) refuses 134
of 300 matched-template worlds (C1), 3 of 9 noise-free shifts (A7) and 5 of 8 oracle worlds (B3). The refusal is correct
behaviour; the world is the defect. Where a world is answered the redshift has a **systematic floor of 1e-6 to 4e-4 in z** that
the noise-only interval does not contain (C1's median absolute error 6.1e-5 against a median sigma of 5.3e-5, but a tail with
errors of 1e-3 and sigmas of 1e-5; the standard deviation of the normalised error is 16.5). We attribute the floor, without an
isolating experiment, to the high-pass filter's edge effects at the spectrum's cut and the template's different extent. **B6**:
the kernel's fit and scipy's curve_fit differ by up to 1.08 of a sigma in a line flux on the same window, a five-parameter fit in
15 to 23 pixels of a line 2 pixels wide, with the kernel's errors larger in 23 of 24 lines; C5 shows the kernel's own intervals
cover. **D2**: 2 of 50 undetectable lines return `line-fit-failed`, which the committed rule does not call a non-detection.

**What a student-facing build may say, today:** a broad-line redshift is good only where the template is unaliased and its
interval is a noise floor, not an accuracy; the luminosity is at the observed band's rest wavelength with no K-correction; the
bolometric interval is dominated by the correction's scatter when it is a typical one; the Eddington mass is a lower bound;
the size is an upper limit; the BPT class is a definition-dependent label that the kernel withholds near a curve.

## Follow-up (252b): the three rulings, as new legs

Carl ruled on 2026-11-05 (`DECISIONS_2026-11-05.md`, the 252 questions) that a non-harmonic world, a failed fit read as a
non-detection and a stated redshift floor are each built as a NEW leg with its thresholds committed first, that A7, B3, C1 and
D2 stay failing, and that the 5 sigma pair cut stands. The thresholds are `tests/fixtures/agn/followup-thresholds.json`
(commit ee333267, before any follow-up code, with no amendment); the verdicts are `followup-results.json` and
`followup-failed-legs.json`; the validator is `tools/agn-followup-validate.mjs` (`npm run agn:followup`, about ten seconds).
The old legs, their thresholds, results and failed-legs file are byte for byte unchanged, and the old validator still
reproduces them. **The five new legs all fail and stay failing**, and the reasons are below.

**The rules (AGN-RULE-2, in the thresholds file).**

- **W1, the world.** `generateQuasar` and `quasarTemplate` take `lineSet`: `'harmonic'` (default, the factors 0.2, 0.3, 0.4
  of H-alpha) or `'non-harmonic'` (0.175, 0.285, 0.35). The factors come from a rule written before they were computed: among
  triples on a 0.005 grid in [0.17, 0.45] that leave two of the six lines in the observed window with a 3 percent edge margin
  at every z from 0.10 to 2.40, take the one that maximises the separation of the fifteen pairwise log wavelength differences
  (the smallest of those differences and of the gaps between them). The separation is 0.0246 dex against 0.0035 for the
  harmonic world; the broad line's FWHM is 0.0085 dex. The factors are invented and compared with no catalogue.
- **F1, the fit.** `measureBptLines` returns, for a line whose fit fails at its expected position (not converged, or a flux or
  error not finite and positive), `not-constrained` with the code `line-not-detected`, `fitFailed: true`, the line named, the
  reason kept in `failedFits`, and the sentence that this is not a statement that the line is absent. This is now the default;
  `fitFailureCode: 'line-fit-failed'` keeps the committed rule of #536 so the old D2 replays as it was. A line outside the
  coverage or inside a blend keeps its own code, which comes first.
- **R2, the floor.** `quasarRedshift` returns, with no `systematicKmS` given, `modelSigmaZ = (1 + z) v / c` and
  `sigmaZTotal = hypot(sigmaZ, modelSigmaZ)` with `v = c ln(10) step / sqrt(12)`: the standard deviation of a uniform error over
  one sample of the spectrum's own grid (40 km/s at the contract grid). A `systematicKmS` replaces it. `sigmaZ` is still the
  correlation's noise-only interval, so the old legs read the same number; the result's `modelTerm` states the rule and that
  this is a floor and not an estimate of template mismatch or line-family disagreement.

**The legs** (bounds are the old legs' own, because each leg asks the old question of a different world or rule; none is looser).

| Leg | Verdict | What it measured |
| --- | --- | --- |
| A7b noise-free shifts, non-harmonic world | **fail** | 7 of 9 answered, 2 refused ambiguous-peak (z = 0.5555, 2.3456); errors 1.1e-7 and 1.7e-7 inside the bounds, 1.4e-6 to 1.2e-3 elsewhere |
| B3b oracle, non-harmonic world | **fail** | 6 of 8 answered; where answered the kernel and the oracle agree to 4.9e-9 in z, 1.6e-9 in sigma, 2.3e-14 in q |
| C1b coverage, noise-only interval | **fail** | 41 of 300 refused (C1: 134); coverage 0.375, sd 445, catastrophic share 0.03 |
| C1c coverage, with the floor | **fail** | coverage 0.772 (band to 0.763), sd 299; the floor is 0.97 of the interval variance; 0.822 at twice the interval (reported) |
| D2b failed fit is a non-detection | **fail** | 199 of 200 weak lines refused as line-not-detected (13 of them through a fit failure), 200 of 200 blends, guard 100 of 100 measured and none turned into a non-detection |

**What they say.**

1. *The harmonic spacing was a cause of the refusals but not the only one.* The share refused fell from 0.447 to 0.137, and
   the separation rule did its job, but two failures remain, and a one-off diagnostic (not a leg, not an isolating
   experiment) shows where they sit. For z = 0.54 to 0.73, where H-alpha has just left the spectrum's cut at 1000 nm
   (z = 0.523), the correlation statistic S / sqrt(T) (T the overlapped template energy) can be higher at a lag where
   the template's strongest line lands on the world's H-beta than at the true lag, because the true lag overlaps less of the
   template. At z = 0.5555 the highest peak is the wrong one (z = 0.152, the true lag 0.90 of it, refused); 7 of 300 worlds at
   z = 0.58 to 0.61 are answered ok at the wrong redshift (an error of about -0.41, the rival just under 0.8): these dominate
   C1b's and C1c's standard deviations and the catastrophic share, and no floor can cover them. This is a property of
   GALAXY-RULE-1's statistic, not of the quasar world, and is not changed here.
2. *The floor closes the undercoverage and slightly overshoots.* Without it the noise-only interval covers 0.385 of the 252
   answered worlds that are not gross misses; with it 0.794 (0.772 over all 259). The rule (one sample over the square root
   of twelve) was written without looking at any measurement, and it was not tuned.
3. *The mapping works, and its leg's bound was ill-conditioned.* D2b fails on one world of 200: the 0.5 percent O line passed
   the signal-to-noise cut of 3 by a noise fluctuation and was classified. A bound of "all 200" fails by chance, for a perfect
   implementation, with a probability of order a quarter if each world had a 1.35e-3 chance of a 3-sigma upward fluctuation,
   and this line has some flux; the committed bound is left as it is and the alternative is a question.
4. *The user-visible limits do not change:* a broad-line redshift is good only where the template is unaliased; the interval is
   now noise plus a one-sample floor, and still not the template-mismatch or line-family systematic (R2 above: hundreds of
   km/s, not contained in either interval).

## Reported legs

R1 (200 worlds whose lines are drawn away from the template: strengths x 0.5 to 1.5, widths x 0.7 to 1.4, each line shifted by
300 km/s): of 200 worlds 96 answer and 104 are refused ambiguous; among the answered the one-sigma coverage is 0.031. A template
that is not the object makes the interval meaningless; use the status. R2: shifting the three ultraviolet lines by -500,
-1000 and -2000 km/s moves the redshift by -366, -679 and -1150 km/s (a large share of the offset, not contained in the
interval). R3: for a power-law continuum the luminosity at a fixed rest wavelength over the observed-band luminosity is
(1 + z)^(alpha + 1), 0.82, 0.71 and 0.58 for alpha = -1.5 at z = 0.5, 1 and 2, and 0.54, 0.35 and 0.19 for alpha = -2.5.
R4: see the BPT limits above.

## Rights and the authentic legs (7.5 rule 4)

Nothing was fetched. No SDSS spectrum, pipeline value, template, dividing curve, line wavelength, bolometric correction,
catalogue row or licence term is in the tree or typed from memory. The synthetic worlds' hydrogen lines are the radiation line
pack's; every other number is invented by a rule in `thresholds.json` and labelled. The names of papers and catalogues below
are from memory and are **marked unverified** until Carl reads them (his 2026-11-05 ruling: references are verified from the
papers before any lesson cites them).

### Files requested from Carl (exact; each turns a NOT RUN leg into a measurement)

1. **E1 and B7, SDSS quasar spectra and the pipeline's values.** Source: an SDSS data release's spectra (the release Carl
   chooses) for three quasars near redshifts 0.3, 1 and 2 (his choice, each named by its specObjID); fields: the spectrum
   (wavelength, flux, inverse variance, mask), the pipeline's redshift, its error and its warning flag, and the pipeline's
   emission-line fluxes and errors where the product lists them; terms to save: the data release's terms-of-use page text with
   the retrieval date, and the SHA-256 of each file; the rights decision (7.5 rule 4) is per source and per redistribution form
   and is Carl's. A broad-line template from a cited paper (with its terms page) is also needed for the correlation.
2. **E2, the dividing lines.** The BPT dividing-curve parameters `a`, `b`, `c` (of `y = a / (x - b) + c`) of the star-forming
   and AGN boundaries as printed in the papers Carl chooses (unverified, from memory: Kauffmann et al. 2003 and Kewley et al.
   2001), with the published line ratios of two or three named objects of each class; a source string for each.
3. **E3, a measured light curve.** One AGN light curve (time, flux, error) from a public time-domain archive, with the
   published fastest variability time scale or size estimate of that object and its paper; terms page and retrieval date.
4. **E4, a bolometric correction.** One cited correction for a stated rest band, with its stated scatter, and the published
   Eddington ratio of a named object with the method of its mass; the source strings to enter.
5. **Gate files:** see [AGN_LUMINOSITY_FUNCTION_GATE.md](AGN_LUMINOSITY_FUNCTION_GATE.md).

## Open questions for Carl

1. **The consumers rule.** What must hold before "A quasar's spectrum" and "What powers it?" are built: the failed legs
   reset or replaced, the files above, or both? Until a rule is committed nothing visible is built.
2. **A non-harmonic world.** *Ruled 2026-11-05: yes, as new legs; built in 252b (A7b, B3b, C1b), all failing; see the follow-up
   section above.*
3. **A fit that fails at the expected position.** *Ruled: yes, as a new leg; built in 252b (D2b, failing on one world of 200).*
4. **The systematic floor.** *Ruled: a default model-limited term, as a new leg; built in 252b (R2 and C1c, failing).*
5. **The chance-pair cut (AM3).** *Ruled: stands.*
6. **The overlap bias (252b).** Where the strongest template line leaves the spectrum (z = 0.54 to 0.73 here), the correlation's
   statistic prefers a lag that overlaps more of the template, and a wrong redshift can be answered. Options, none built: a
   minimum overlapped template-energy fraction at a lag (a GALAXY-RULE-1 change, opt-in, new leg), a quasar redshift range
   that keeps the strongest line in the window (new leg), or accepting the refusals and wrong answers there and saying so.
7. **The floor's size (252b).** One sample over the square root of twelve covers slightly too much (0.772 against 0.763) and is
   97 percent of the interval; a smaller or redshift-dependent floor is a new leg, committed first, if wanted.
8. **A count bound for D2b (252b).** Replace the all-of-n bound by a binomial upper band for the false-detection share, as a
   new leg committed first.

## Inherited limits to state in claims built on this kernel

Every spectrum and light curve here is synthetic with a truth manifest; the authentic tier is NOT RUN. The redshift's interval
is a noise floor, not an accuracy. The cosmology is assumed and carries no uncertainty. Everything in the galaxy kernel's own
list ([GALAXY_SPECTRA.md](GALAXY_SPECTRA.md)) applies to the correlation.

## References

All unverified (from memory, for Carl to read before any lesson cites them): Baldwin, Phillips and Terlevich (1981) for the
two-ratio diagram; Kauffmann et al. (2003) and Kewley et al. (2001) for dividing curves of the form used here; Eddington (1926)
for the limit. The kernel's equations are standard and derived above; no number is taken from any of them.

<!-- Listed in DOCUMENTS.md. -->
