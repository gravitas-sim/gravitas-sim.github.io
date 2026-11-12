# The galaxy-spectra kernel: redshift by lines and by correlation, and the 4000-angstrom break (Prompt 248)

How far is that galaxy, and what does the break at 400 nm say about its stars? This is the kernel part of Prompt 248 (an
invisible pull request: no viewer mode, no investigation, no instructor material, nothing a student sees). It adds
`js/kernels/galaxy/` (five modules), its validator `tools/galaxy-validate.mjs`, an independent oracle
`tools/galaxy-oracle/`, a validation group of six checks, and the fixtures under `tests/fixtures/galaxy/`. The spectra
viewer's galaxy mode, the two investigations ("How far is that galaxy?" and "Old or young?") and the model-page section are a
separate instructional pull request that waits for Carl's go-ahead. It builds on the line tools of Prompt 247
([ISM.md](ISM.md)) and the statistics kernel's intervals (Prompt 154); nothing here adds an FFT to `js/numeric/` (the gate of
Prompt 221 was C), so the correlation is direct.

The validation contract was committed first, in `tests/fixtures/galaxy/thresholds.json` (commit 4b0258c6), before any kernel,
oracle output, spectrum or result existed. This document was written after it. A crossed bound is a failed leg and stays
failing; only Carl resets one. **The recorded run has three failing legs** (C2, D2, D3; below), 17 pass, 4 are reported and 3
are not run. Six amendments are in `thresholds.json` with their reasons; none moves a bound. No consumers rule was committed
beforehand, so the viewer mode, investigations and model section wait for Carl whatever the table says.

## What is built and what is not

Built: (1) **a redshift from line identification**: the ISM kernel's detection and identification against the radiation
line pack over a redshift grid the caller gives, each identified line refitted with a free-width Gaussian, an inverse-variance
mean with a scatter inflation; fewer than two identified lines is "not constrained" and a tie is refused; (2) **a redshift from
direct lagged cross-correlation** with a template the caller supplies (a source string and no default), on a logarithmic
wavelength grid, with the peak refined to a fraction of a sample, its uncertainty from the curvature of the profile
chi-square, its significance, a second-peak ambiguity test and a refusal below a committed significance; (3) **the
4000-angstrom break** as a ratio of mean F_nu in two caller-supplied rest-frame bands (a definition object with a source
string, no default), with its uncertainty from the pixel errors and optionally from the redshift's, and its stated limits;
(4) **a labelled synthetic generator** of star-forming, passive and flat galaxy worlds, their templates and a comb, with a truth
manifest, and the helpers that resample a spectrum onto a logarithmic grid and degrade a template.

Not built, on purpose: the viewer's galaxy mode (template overlay, correlation peak, bands drawn), the two investigations, the
model section and instructor materials; **any pack** (packs have 0 B of room and no galaxy spectrum is in the tree); **any
cited template** (none is in the tree); an **age or a metallicity** from the break (that needs a cited population-synthesis
calibration); a velocity dispersion; the BPT classification and star-formation rates (Prompt 252 and the closeout, by the
prompt's own text); an FFT in `js/numeric/`.

## The redshift by cross-correlation (X1 to X6)

A redshift multiplies every wavelength by 1 + z, a shift of log10(lambda), so the correlation runs on a grid uniform in
log10(lambda) (a spectrum that is not on one is refused `not-log-uniform`; `toLogGrid` resamples by linear interpolation and
says the errors are then correlated). Both series have their centred 101-sample moving average subtracted (a linear,
shift-invariant high-pass: about 7,000 km/s at a step of 1e-4 dex). For a real lag k, with `t_i(k)` the filtered template at
sample `i - k` (natural cubic-spline interpolation, zero outside the template) and weights `w_i = 1 / sigma_i^2`:

```text
S(k) = sum w_i f_i t_i      T(k) = sum w_i t_i^2      q(k) = S / sqrt(T)
```

`q(k)` is the signal to noise of the best-fit non-negative template amplitude `a = S / T` (error `1 / sqrt(T)`) at that shift.
The peak is the largest `q` over the integer lags in the redshift range the caller gives, refined by a golden-section search.
Profiling the amplitude out leaves `chi2(k) = F - q(k)^2`, so at the peak `chi2'' = 2 q |q''|` and

```text
var(k) = 2 / chi2'' = 1 / (q |q''|)      sigma_z = (1 + z) ln(10) step sigma_k
```

with `q''` the central second difference at the refined peak (step 0.1 sample). For one Gaussian line this is the
Cramer-Rao bound (leg A3: 0.4 percent). The interval is the statistics kernel's `covarianceInterval`. **Status ladder**: `q` below
6 is `not-constrained` (the interval withheld); 6 to 10 is `low-significance` (answered, flagged); 10 or more is `ok`; a second
local maximum of the integer profile, more than 20 samples from the best, at 0.8 of the best or more is refused
`ambiguous-peak` with both candidates, whatever the best `q`. A flat spectrum or template is refused `no-structure`. Without a
sigma the white-noise level comes from the spectrum's successive differences and the result says "errors from scatter".

The direct profile is the shipped one; the oracle computes the same integer-lag profile by `scipy.signal.fftconvolve` and they
agree to 4e-15 of the largest `q` (leg B2). **Assumes**: the template is the object, the noise is independent between samples,
one redshift, a non-negative amplitude. The first is the one a real galaxy breaks: see D3 and R1.

## The redshift by lines (L1, L2)

`detectFeatures` (matched filter, signal to noise 5), `identifyFeatures` and `solveRedshift` over a grid `{min, max, step}` the
caller gives, against the line pack in the spectrum's medium. Each identified feature is refitted with the ISM kernel's
`fitGaussianLine` in two passes (the window half-width the larger of 8 samples and 4 line-spread FWHM, then the larger of that and
3 fitted FWHM, each at the local sample width); `z_i = centre_i / rest_i - 1`; the redshift is the inverse-variance mean, and
with three or more lines and `chi2 / (n - 1)` above 1 its error is multiplied by `sqrt(chi2 / (n - 1))`. One identified line
cannot fix a redshift (its identity and the redshift are degenerate) so fewer than two is `not-constrained`. Two near-degenerate
lines can be confused: in one oracle world the weak Ca II H absorption line was identified as H-epsilon (rest wavelengths 0.16
nm apart), which the scatter inflation absorbed.

## The 4000-angstrom break (B1, B2)

`D = <F_nu>_red / <F_nu>_blue`, `F_nu = lambda^2 F_lambda` (an F_nu spectrum is used as it is; the flux kind is required), the means
taken over the samples whose centres lie in each band, weighted by the pixel widths. **The band edges are the caller's**: a
definition object `{name, blueNm, redNm, source}` in the rest frame, observed at `(1 + z)` times its edges. The published
definitions' band edges are published numbers, so the kernel holds none and there is no default; the synthetic worlds use
`INVENTED_BREAK_BANDS`, 16 nm wide with the inner edges 12 nm either side of 400 nm, which equal neither published definition.
The uncertainty is `sigma_D^2 = D^2 (var_red / mean_red^2 + var_blue / mean_blue^2)`, plus `(dD/dz sigma_z)^2` when a redshift
error is given. The break is "present" when `D - 1` exceeds 3 sigma and "not constrained" when the relative error exceeds 0.25.
The ratio is invariant under a redshift of the whole spectrum when the bands move with it (leg A5, 3.7e-5).

**What D can say**: a break is present, and how two galaxies order under one definition. **What it cannot**: an age (that needs a cited
population-synthesis calibration this kernel does not hold), a metallicity (age and metallicity move it together), or anything
about a galaxy whose bands carry dust or emission the analysis did not remove. Priced on the synthetic worlds (R2, mean relative
bias of D): dust of E(B-V) = 0.1 and 0.3 mag (CCM89, R_V 3.1) raises it by 3.6 and 11.2 percent for both kinds; an invented
emission line of half the H-beta flux inside the blue band lowers it by 2.8 percent (star-forming) and 11.8 percent (passive, whose
H-beta reference is the star-forming scale); a redshift error of 1e-3 moves it by 7e-6 (star-forming) and 2e-5 (passive), of 5e-3 by 3.5e-5 and 2.5e-4. The aperture decides which
light the spectrum holds, and a fibre spectrum is not the whole galaxy.

## The synthetic worlds

`generateGalaxy` builds a rest-frame model, `F_lambda = (lambda / 550)^alpha B(lambda)` with `B = 1 - d / (1 + exp((lambda - 400) / w))`
(a hard step for `w = 0`), Gaussian absorption (multiplicative) and emission lines at a velocity width that includes the line-spread
function, and observes it at `F_rest(lambda / (1 + z))` on a logarithmic grid of step 1e-4 dex at R = 1800, so the shifted spectrum
is the template shifted in log wavelength. Kinds: `star-forming` (alpha -2.5, break depth 0.12, Balmer emission with invented flux
ratios, weak Ca and Na absorption), `passive` (alpha -1.2, depth 0.45, 250 km/s absorption in Ca, Balmer, Mg, Na and Fe) and `flat`.
Every spectrum carries the label that begins `SYNTHETIC GALAXY SPECTRUM` and a truth manifest, including the break by quadrature
of the noise-free model. The line wavelengths are the pack's; every other number is invented by a rule and labelled so. The worlds
are drawn from the analysis's own model family (the template is the world's own shape), so the coverage legs test the arithmetic
and the propagation; D3, R1 and R3 are where the template stops being the object.

## Validation contract and measured table

Run: `npm run galaxy:validate` (about 70 seconds), Node 22.23.4, oracle numpy 1.26.4, scipy 1.13.1.
27 rows: 17 pass, 3 fail, 4 reported, 3 not run.

| Leg | What | Result |
| --- | --- | --- |
| A1 | integer-sample shifts, both kinds | worst 6.1e-8 in z (bound 1e-6) |
| A2 | sub-sample shifts, correlation and lines | 9.0e-8 (bound 2e-5); 1.4e-7 (bound 5e-5) |
| A3 | curvature uncertainty against the Cramer-Rao value, one line | 0.41 percent (bound 3 percent) |
| A4, A5, A6 | the break of a hard step; against the quadrature of the model; F_lambda against F_nu | 1.1e-15 (bound 1e-6); 3.7e-5 (bound 2e-3); 0 |
| B1 | correlation against the numpy and scipy implementation, 8 spectra | 7e-10 in z, 6e-8 in sigma, 3e-13 in q |
| B2 | direct profile against the FFT profile | 4e-15 |
| B3 | break and its error against numpy | 3e-15 |
| B4 | line redshifts against scipy curve_fit, 6 spectra | worst line 0.086 of its sigma, combined 0.003 (bound 0.1); one misidentified line (H-epsilon) |
| B5 | a cited independent spectral tool | NOT RUN |
| C1 | correlation coverage, 300 worlds | 0.667 (band 0.602 to 0.763); sd of the normalised error 1.042; all ok, none wrong |
| **C2** | **line-method coverage, 300 star-forming worlds** | **0.777 (band 0.602 to 0.763): FAIL, above the band; sd 0.864; all answered, none wrong** |
| C3 | break coverage, 291 worlds (9 below z of about 0.02 refused: band outside) | 0.694 with the true redshift (sd 0.929); 0.691 carrying the correlation's redshift error (sd 0.926) |
| D1 | 200 noise-only spectra against each template | none ok, none low-significance; the line method answered none |
| **D2** | **flat spectrum** | **FAIL, an error in the contract: correlation refused `no-structure`, lines `too-few-features`, but the break of a spectrum flat in F_lambda is 1.2217 (analytic 1.2216) and 1.0 only for one flat in F_nu (0.99999999999999)** |
| **D3** | **template mismatch, 200 worlds** | **FAIL: 21 of 200 (10.5 percent; bound 5) are `ok` and wrong by more than 5 sigma, all star-forming worlds against the passive template, median error 0.128 in z** |
| D4 | 12-tooth comb, 20 worlds | all 20 refused `ambiguous-peak`, the truth among the two candidates |
| D5, D6, D7 | refusals of the correlation (9) and the break (9); label and manifest | all as committed |
| E1, E2 | SDSS galaxy spectra against the pipeline's redshift and a catalogue break | NOT RUN |
| E3 | in-tree stars as mutual templates | reported: the K, M and G stars against the G or K star recover the pipeline's relative redshift to 16, 17 and 8 km/s at pipeline errors of about 3 km/s |
| R1 | 200 worlds whose lines are drawn away from the template | reported: coverage 0.660, sd 1.119, all `ok`, none confidently wrong |
| R2 | the break's systematics | reported (above) |
| R3 | the line method on passive and on broad-line worlds | reported: passive, answered 0.59, coverage 0.39; broad Balmer lines, answered 0.73, 4 percent wrong, and the correlation's coverage falls to 0.14 |

## The three failing legs, and what they mean

**D3 is the one that matters.** The committed contract said a template mismatch is flagged by the peak's significance. It is not:
`q` is the signal to noise of the template's amplitude, and a strong-lined spectrum (peaks of 30 sigma and more) correlates
significantly with a template that is not it, at a lag that is not its redshift. 21 of 100 star-forming worlds analysed with the
passive template returned `ok` at `q` of 10 or more and a redshift wrong by a median 0.128. The passive worlds against the
star-forming template did not. The stated error assumes the template is the object, so it is no protection. **A caller
must not read `ok` as "the template fits"**; the instructional pull request should not offer a template choice without a
goodness-of-fit check. What would catch it is a statistic the contract did not commit, the chi-square of the residual after the
best-fit template is subtracted (where it exceeds what the noise allows, the template does not describe the spectrum); that is a
change to the analysis rule after seeing a failure, so it is left for Carl's decision (below), not added silently.

**D2** failed on an expectation written wrongly when the contract was committed: a break of exactly 1 holds for a spectrum flat in
F_nu, and the flat world is flat in F_lambda. The kernel is right (the numbers above), the leg stays failing as committed, and
the next committed contract should say flat F_nu.

**C2**: the line method's one-sigma interval covers 77.7 percent of the 300 worlds where 68.3 would be right: the interval is safe
to quote and not tight. The cause was not isolated (the per-line fit errors and the scatter inflation are the candidates).

## Rights and the authentic legs (7.5 rule 4)

Nothing was fetched, no template, band edge, spectrum, catalogue value or licence term was typed, and no tool was installed. The
radiation line pack (NIST ASD, public domain as the pack records) supplied every wavelength; the in-tree SDSS stellar pack
(public domain on the basis the pack records; four stars binned to under one sample per resolution element) supplied E3 only.
What is needed to run the remaining legs and what the instructional pull request would need, each a request for Carl to fetch
(the names marked "from memory" are unverified and Carl may choose others):

1. **Four galaxy spectra (E1, E2, and the packs the prompt asks for).** One SDSS DR18 spectrum each of a star-forming spiral,
   an elliptical, a Seyfert and a LINER, in the pack's own form (CSV from
   `https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=P&mjd=M&fiberid=F`), with the pipeline's
   `z` and `zErr` for each from the SkyServer `SpecObj` or `SpecPhoto` table (the in-tree pack's own query used `z`, `zErr`,
   `class`, `zWarning` and `sciencePrimary` on `SpecPhoto`), the object's class and subclass, and the SDSS data-use page the
   existing packs cite (read, saved with its retrieval date). Carl picks the four plate-mjd-fiber triples; this session cannot
   name real ones from memory. A Seyfert and a LINER need an emission-line classification the SDSS pipeline does not give
   directly (a published diagram classification of the same objects, from memory the MPA-JHU catalogue's BPT class; unverified).
2. **A break definition with a source (E2, and the viewer's drawn bands).** The paper or catalogue documentation that defines
   the band edges the catalogue's break index uses, saved as text (the two definitions in the literature are commonly attributed
   to Bruzual 1983 and Balogh et al. 1999; from memory, unverified), and the catalogue's own value and error for the same four
   galaxies with its aperture and redshift treatment. The kernel takes the definition as `{name, blueNm, redNm, source}`.
3. **Cited templates (E1's correlation leg, and every "cross-correlation with cited templates" step).** A small set of galaxy
   templates (a star-forming and a passive one at least) with a licence that allows redistribution, the file, its source page
   and its terms page saved. The SDSS pipeline's own galaxy eigen-spectra (from memory the `spEigenGal` files of the SDSS
   spectroscopic pipeline) are public by SDSS's policy but are not independent of the pipeline's redshift, so E1 would record
   that. Whatever is chosen must be given at the spectrum's resolving power or lower (`degradeToResolution` lowers it).
4. **B5.** A cited independent spectral-fitting tool in a pinned environment, run on the exported spectra
   (`node tools/galaxy-oracle/make-inputs.mjs`), its redshifts and breaks pinned in `tests/fixtures/galaxy/toolkit/result.json`.
5. **Packs.** Packs have 0 B of room, raw and gzip. Four spectra as sidecar files that no precache tier reads, counting only
   the manifest, is the pattern of Prompt 220; a manifest that does not fit is a pack decision for Carl.

## Follow-up: the goodness-of-fit refusal

Carl ruled on 2026-11-05 ("go with your recommendations", `DECISIONS_2026-11-05.md`): the failed legs stay failing and labelled
and nothing moves. The follow-up therefore adds legs and leaves the old ones alone. `tests/fixtures/galaxy/followup-thresholds.json`
was committed (21af2aec) before any code of the follow-up existed and before the statistic was computed on any spectrum; it
holds GALAXY-RULE-2, the legs D2b, D3b and R1b and no amendment.

**The rule (M1 to M4).** At the refined best lag, over the n samples the template covers, chi2_min = sum w f^2 - S^2/T (the
weighted sum of squares of the high-passed spectrum less what the best-fit amplitude explains) with n - 2 degrees of freedom.
The cut is the 1 - 1e-4 quantile of chi-square with those degrees of freedom (`chi2Quantile`), a false-refusal rate of 1e-4 per
spectrum under the model's own assumptions. The level is a design choice of this kernel, not a value read off the 21 failures, and
nothing was run to choose it. The refusal is opt-in (`crossCorrelate(..., { refuseMisfit: true })`, off by default) so the
committed 27 legs are byte-identical; with it off the statistic is still reported on the result as `fit`, with the flag `misfit`
when the cut is crossed. It is tested only when sigma was supplied (a sigma from the spectrum's own scatter carries the line
power, so the test would measure the scatter against itself): then `fit.note` reads `misfit-untested: errors from scatter`. A peak
refused for significance or ambiguity is refused before the test.

**Measured (`results.json`, 30 rows: 18 pass, 4 fail, 5 reported, 3 not run).**

| Leg | Verdict | Measured |
| --- | --- | --- |
| D3b | **pass** | the D3 worlds: 0 of 200 confidently wrong (bound 5 percent); 22 refused `template-misfit`, none ok; exact-template worlds: 0 of 300 falsely refused (bound 1 percent), coverage 0.667, sd 1.042 |
| D2b | **fail** | the break is 1 to 1e-15 with no break flagged and the line method is not constrained, as committed; the correlation is `low-significance`, not refused `no-structure` |
| R1b | reported | 75 of 200 approximately-right templates refused as misfit, 0 confidently wrong; the 125 let through have coverage 0.648, sd 1.089 |

**What D3b means.** Most mismatched pairs were already refused as ambiguous or not significant; of the 200, D3's 21 confident errors
are now refused for misfit and none is returned ok. The price is on the page: R1b shows the strict test refuses 75 of 200 worlds
whose lines are drawn away from the template (strengths by up to 30 percent, widths by 20 to 25 percent, one extra line) at these signal to noise, since
any structure the template lacks is a misfit by this test (the stated sigma must also be right). That is a truthful statement that the
template is not the object, not a defect of the test; a caller who wants an answer from an approximate template leaves the option off
and reads the `fit` report and the flag. D3 itself still fails as measured: the default correlation is as unsafe as before.

**What D2b means.** A spectrum flat in F_nu is a power law in F_lambda, which the 101-sample high-pass does not remove exactly, so a
smooth residual correlates weakly with the template and the correlation returns a weak answer flagged low-significance (q below 10,
never `ok`). The committed D2b expectation (refusal `no-structure`) presumed a constant spectrum and is wrong in the same way D2 was.
It is left failing and labelled; a later contract should expect "not ok" here. D2 stays failing as a wrong expectation.

## Open questions for Carl

1. **The consumers rule.** May the instructional pull request (viewer galaxy mode, the two investigations, the model section)
   proceed on this kernel, and which of the requests above must land first? The synthetic path stays labelled synthetic until
   they arrive; the investigations would teach on synthetic galaxies and the line identification and the correlation, and "Old or
   young?" would teach the break's order, its limits and the dust and emission biases above, with no age number.
2. **D3 (answered 2026-11-05, see the follow-up).** Add a goodness-of-fit test (the residual chi-square after the best template) to the correlation's refusal rule, with its
   thresholds committed before the next run, or leave the correlation as a tool that is only safe with the right template? Until
   one of them is decided no investigation should let a student choose a mismatched template and read `ok`.
3. **D2 (answered; D2b also fails, see the follow-up).** Reword the flat-spectrum leg to flat F_nu in a follow-up contract; the failing row stays as it is until then.

## Inherited limits to state in claims built on this kernel

Every spectrum and every template here is synthetic; the one authentic leg that ran (E3) uses stars as templates and is
reported, not judged. The worlds share the analysis's model family, so a coverage here is not a statement about real galaxies;
R1 and R3 show what a template that is not the object costs (a line-width mismatch takes the correlation's coverage to 0.14),
and D3 shows it can be confidently wrong. The break is a ratio of F_nu band means under a definition the caller states: it
carries no age. The synthetic galaxies are not cosmological: no dimming, no evolution, no aperture.

## References

The cross-correlation technique for redshifts is the Fourier-era standard (Tonry and Davis 1979; from memory, not checked here), here done
directly in log wavelength with the uncertainty derived from the profile chi-square rather than a published coefficient. The CCM89
law is Cardelli, Clayton and Mathis 1989 as `js/kernels/radiation/extinction.js` cites it; the rest wavelengths are the NIST Atomic
Spectra Database as the line pack records; the SDSS spectra are DR18 (Almeida et al. 2023) as the pack records. The break
definitions are not cited here because their edges are the caller's. `DECISION_REGISTER.md` D-R10-248-01 to -05 and, for the follow-up, -06 to -09.

<!-- Listed in DOCUMENTS.md. -->
