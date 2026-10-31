# Variables II: light-curve features, the metallicity term, and when not to say a class (Prompt 223)

What a variable star's light curve says beyond its period, and how sure each number
is; how the Cepheid period-luminosity relation changes with the metal content of the
galaxy, what that does to a distance and to its error; and a classification exercise
that may decline to name a star. The classifier of Part B is gated separately and is
not here (see "Part B" below).

## What is built

| Piece | Where | What it is |
|---|---|---|
| Features | `js/kernels/variables/features.js` | period, number of cycles, peak-to-peak amplitude, skewness and rise fraction of the fitted curve, R21, R31, phi21, phi31 with first-order errors from the fit's covariance; refused as `not-constrained` below 3 cycles, with a phase gap over 0.35, or with too few points |
| The term | `js/kernels/variables/plz.js` | `M_W(P, Z) = M0 + b (log10 P - 1) + gamma (Z - Zref)`; the ladder with the term, `mu_host = dm - b dx + mu_anchor - gamma (Z_host - Z_anchor)`, with three more error terms (gamma, host and anchor metallicity) |
| Cited numbers | `js/kernels/variables/plzCited.js` | gamma = -0.217 +- 0.046 mag/dex (Riess et al. 2022); gamma = -0.280 +- 0.078 (Breuval et al. 2022, second value); mean [O/H] of the LMC (-0.29), NGC 4258 (-0.10), M101 (+0.10); the calibrated span -0.72 to +0.17. The place in each paper is in `tests/fixtures/variables-ii/citations.json`; a test holds the two equal |
| Refusal in the exercise | `js/kernels/variables/classify.js` | `classifyWithAmbiguity`: a star is given a class only if at least 4 of its 5 nearest neighbours agree |
| Panels | `js/variablesIIWidgets.js`, `js/variablesIIField.js`, `js/i18n/{en,es}.variablesII.js` | `plz-metallicity`, `variable-features`, `variable-ambiguity` |
| Investigation | `js/data/investigations/variables-ii-sequence.js` | The Metallicity Term (three depths, English and Spanish, instructor content); one closure file |
| Depth | `js/data/investigations/depth/which-kind-of-variable.js` | three quantitative steps added to Which Kind of Variable (features with their errors, a run too short, when not to say); its core steps and grading are unchanged |

The Hertzsprung progression is a described feature: the bump on a classical Cepheid's
light curve moves from the descending to the rising branch as the period passes about
ten days (Hertzsprung 1926), and R21 and phi21 change character there. It is prose in
the model page, not a template and not a number in code.

## Validation contract

`tests/fixtures/variables-ii/thresholds.json` was committed (66276ec8) before the
features and the term existed, before the oracle and the validator existed, and before
any output of either was inspected. Twenty legs, run by `node
tools/variables-ii-validate.mjs` (it writes `results.json` and `failed-legs.json`):

- **(a) Analytic (A1-A6):** a noise-free three-harmonic curve gives its amplitude,
  R21, R31, phi21 and phi31 back (1e-9); skewness and rise fraction of a sinusoid and a
  time-reversed curve; the relation at the cited points; the ladder with the term
  equals its closed form, and with no term equals the existing ladder to the last
  digit; the distance factor is 10^(gamma dZ / 5); the linear error budget equals a
  Monte Carlo propagation (the statistics kernel's `propagate`, 4,000 draws) within 5
  percent (measured 0.3).
- **(b) Independent oracle (B1-B3):** `tools/variables-ii-oracle/oracle.py` decodes the
  SU Dra sector 15 sidecar itself and uses astropy 6.0.1's `LombScargle(nterms=3)`.
  The coefficients at the oracle's period agree to 1e-14 mag, the period to 1.2e-7
  relative, and the amplitude, R21, R31, phi21, phi31 at the kernel's period to better
  than 1e-4. Trap met: astropy's default method (`fastchi2`) approximates the
  multi-term periodogram and put the peak 1e-3 off; the oracle uses `method='chi2'`.
- **(c) Coverage (C1-C3):** 400 simulated hosts (anchor of 60 stars, host of 8 to 30,
  scatter 0.08 mag, the cited gamma with its error, a metallicity difference drawn from
  -0.5 to +0.2 dex with stated errors): the true modulus lies within 1 sigma 0.668 and
  within 2 sigma 0.953 of the time; leaving the term out biases the estimate by the
  mean of gamma dZ; the corrected estimate has no bias beyond 0.01 mag; the true R21
  and phi21 lie within 2 sigma 0.945 and 0.95 of the time.
- **(d) Refusals (D1-D5):** 1.5 cycles and a half-cycle gap return `not-constrained`
  with a reason; on noise alone a second or third harmonic is declared detected at
  0.0175 and 0.0125 (bound 0.03); a host with no metallicity is not corrected and a
  host outside the span is flagged; the ambiguity rule leaves 11 of 120 stars open at
  period and amplitude, 4 of 5, and the 109 it calls are right 94.5 percent of the
  time (an everyone-must-be-called classifier: 90.8).
- **(e) Authentic (E1-E3):** the TESS SU Dra period 0.66041029 d against the published
  0.66042001 (1.5e-5); the NGC 4258 modulus from the LMC with the cited term, 29.444
  +- 0.053, against the maser 29.397 +- 0.032 (0.76 combined errors; without the term
  29.403, 0.09); the two cited coefficients agree within 0.70 combined errors.

All 20 legs pass, no bound was moved, and no leg is recorded as failing
(`failed-legs.json` is empty). That is a result of these legs, not a claim about the
method outside them.

## Limits stated

- The term is one linear function of [O/H], the same at every period. The coefficient
  and the galaxies' abundances are cited; nothing here measures a metallicity. The
  0.05 dex given to each host is the systematic Riess et al. 2022 propagate for the
  strong-line scale; their Table 3 prints no per-galaxy error.
- One galaxy cannot show that the term is needed. For NGC 4258 the estimate agrees with
  the masers with and without it; the case for the term is the joint fit of many hosts
  and three anchors in Riess et al. 2022, which this panel does not repeat.
- The Fourier errors are first-order and treat the points as independent; they are
  statistical only. The TESS Eta Aquilae curve (3.7 cycles, a saturated star) gives
  R21 = 0.80 +- 0.06, far from a typical Cepheid's, and the formal error does not
  include that systematics.
- The classification exercise is synthetic and balanced; its accuracy is not a
  survey's. Frame-derived light curves (the optional branch after Prompt 185) are not
  used.

## Rights

Riess et al. 2022 (ApJ 934, L7) and Breuval et al. 2022 (ApJ 939, 89) are quoted for a
few published numbers with credit; nothing from either is bundled. The Riess et al.
Cepheid table already shipped (D-LADDER-01) and the TESS light curves (public domain)
are unchanged. No new survey data ships with Part A.

## Part B: the classifier gate

Not built here. Its own gate (`docs/variable-classifier-gate`) commits its thresholds
on an independently labelled example set before any classifier is measured; see
`DECISION_REGISTER.md` (D-R10-223-*) for where it stands.
