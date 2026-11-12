# The population inference gate

**Follow-up, 2026-11-10 (section 10).** The follow-up Carl approved on 2026-11-07 has run: the new leg D8b, the penalty-convergence study with its new legs, and the fetch for requests R1 to R4. Everything below this note down to section 9 is Part A as it was written and is not edited. By the follow-up's committed function the outcome is **A through D8b** and **penalty convergence passes** (22 rows: 12 pass, 0 fail, 7 reported, 3 not run); Part A's verdict by Part A's function stays **B**, D8 stays failing and labelled, X1 to X3 are still NOT RUN, and the consumers condition is **not met**. Nothing is built.

Roadmap III, Prompt 264, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, register row D-R10-254-01 and `DECISIONS_2026-11-06.md`; the hard prerequisites 154 (D-R10-31), 229 (verdict A, D-R10-229-90) and 262 (verdict B, slice B-KM, #561) are merged on `v3`).
Prompt 229 built a likelihood for planet occurrence on one grid; the general problem is a population's distribution inferred from a sample with a selection function and per-object uncertainties. This gate commits one
likelihood for both: binned rates, an exposure built from Prompt 154's selection object, per-object Gaussian uncertainties as a convolution over bins, the maximum with profile-likelihood intervals, a floor below which a bin is
"not constrained", and a smoothing penalty named as a penalty and never a prior. Its definitions, domain, hand examples, independent oracle, scenarios and verdict function were committed before any code, then measured on a
spike. **Verdict by the committed function: B** (the engine without per-object uncertainties; the counts case of Prompt 229 is reproduced to the digit). One leg fails and stays failing (section 4): **D8**, the coverage of the
upper limit among the statements whose estimate is zero, at 0.62 against a committed bound of 0.94; every other leg of the per-object-uncertainty set passes, including the three coverage ensembles (0.947, 0.947 and 0.951 at a
nominal 0.95). The penalty passes all of its legs and is admitted as a toggle. Nothing is built, the consumers rule (Carl, 2026-11-05, 2026-11-06 and 2026-11-07) holds, and **Part B is not begun**. The record is decision-register
rows D-R10-264-01 to D-R10-264-05.

The numbers are in `tests/fixtures/population/` (`thresholds.json` the contract; `oracle-results.json` the pinned independent calculation, its samples and its own ensemble; `results.json` the gate stream;
`failed-legs.json`; `first-run-results.json` the first stream, see section 4; `diagnostic-d8.json` a labelled post-hoc diagnostic). The prototype (`js/kernels/statistics/population.js` on the spike), the validator
(`tools/population-validate.mjs`), the diagnostic (`tools/population-diagnostic-d8.mjs`) and the oracle (`tools/population-oracle/oracle.py`) are on `spike/population-inference-gate` (head 48d21711), never merged (rule 7.5.4): this PR is
documentation, fixtures and one test. The gate stream ran on Node 22.23.4 (445 s of CPU, 297 s of it the intervals of the outside-domain scenario); the oracle on Python 3.9.6 with numpy 1.26.4 and scipy 1.13.1 under `python -E`
(30 s). Two complete runs of the gate stream agree row for row except the CPU time.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `ad625d20` | `thresholds.json`: the problem and its definitions, the constants, the scenarios and seeds, the reference-sample designs, four hand examples derived on paper, the refusal codes, the 52 legs and bounds, the verdict function, the requests, eight decisions | any prototype, oracle, sample, random draw or computation |
| `7f399cc8` | amendment AM1 (definitions the contract left open: the resolution width, what a covered statement is, the measurement of D1, C5, C6 and P3, the zero rule) | the oracle's first run |
| spike `13754a53` | the oracle, syntax checked only | its first run |
| `f0c0e4bd` | the oracle's pinned output (first run; its two algorithms agree to 2.3e-13 in log-likelihood, hand example A2 equals the closed form, its own ensemble covers 0.953) | the prototype existed |
| `defa3b7e` | amendment AM2 (A2 run with the floor option 0; P1 on the five samples that have a log rate; scenario M's truth from the oracle's pinned gamma) | any validator run |
| `958793ef` | the oracle's output pinned again against the file with AM1 and AM2 (every number identical, only the sha256 differs, checked by script) | the validator existed |
| spike `28cb4efa`, `a5f7b13f` | the prototype and the validator, syntax and lint only (one smoke call of the prototype on two hand examples) | any validator run |
| `aea0f0de` | the first stream pinned (`first-run-results.json`) and amendment AM3 (section 4: the validator's status for P2 carried a condition the committed bound does not hold) | |
| spike `07aa0f3f`, `d2e9dd26` | the validator corrected to the committed bounds; the oracle pinned a third time (identical) | |
| `995b0e2f` | `results.json` and `failed-legs.json` (the stream, twice, identical but for the CPU time) and the post-hoc diagnostic of D8 (spike `48d21711`) | |

What had been seen before the contract was committed, and only that (`seenBeforeCommitting`): the roadmap sections, the register rows of 154, 229 and 262, `OCCURRENCE_RATES.md`, `CENSORING_TRUNCATION_GATE.md`, the code of the occurrence and statistics kernels and the
stored planet survey, the form of the earlier gates, the installed Python packages, and one throwaway shell sum of scenario M's exposures (five orders of magnitude from the lowest to the highest mass bin, which is why M is declared by its expected
listings). No paper, table, catalogue or data file on population inference, deconvolution, occurrence rates or mass functions was read or fetched, and no published number, citation detail, sample or licence term was typed from memory. The likelihood is
stated from its definition (DEC1); its agreement with the printed forms of any source is request R4 (leg X3, NOT RUN).

## 2. The decision

**The model.** A true value `u` is binned into `J` bins (at most 64), uniform inside a bin. Bin `j` has an exposure `E_j` (the expected number of listings per unit rate: the summed completeness of the searched targets for planets, an effective
volume for stars), built from Prompt 154's selection object as `E_j = sum over targets of weight times the mean of the target's inclusion probability over 64 midpoints of the bin` (for a volume, shells of exact volume whose selection also reads the
shell's distance), or given directly; a stated reliability `r_j`; and a rate `Gamma_j`, the expected objects per unit of exposure, which may exceed one. The expected listings of true bin `j` are `mu_j = E_j Gamma_j / r_j`.

**The likelihood.** The listings are a Poisson process over the measured value. With `K_ij` the density of the measured `x_i` from a true value uniform in bin `j` (a Gaussian CDF difference over the bin's width: the convolution over bins, stated; for
`sigma_i = 0` it is `1 / w_j` in the object's bin and 0 elsewhere), `l(mu) = sum_i ln(sum_j mu_j K_ij) - sum_j mu_j`, concave in `mu`. Exact bins give `mu_j = n_j` and `Gamma_j = n_j r_j / E_j`, which is Prompt 229's rate. The maximum is found by EM with
SQUAREM acceleration; a fit that does not converge in 20,000 iterations is reported, not accepted.

**The intervals.** On the object path the interval of a rate is the profile-likelihood interval at the level (0.6827 or 0.95): `D_j(Gamma) = 2 [l(mu_hat) - max over the other mu of l with mu_j fixed]` below the chi-square quantile on one degree of
freedom; `D_j` is convex (a partial maximum of a concave function), so the set is an interval, and a replicate covers the truth exactly when `D_j(Gamma_true)` is below the threshold, which is how coverage is measured. An upper end that has not been
reached at 1e6 times the estimate is null (`unbounded`). On the counts path the interval is Prompt 154's Poisson interval (Garwood below 100 listings) at exposure `E_j / r_j`, so that Prompt 229's intervals are reproduced exactly; the `method` string says
which path produced a bin. A bin whose estimate is below 1e-6 listings gets the one-sided 95 percent limit at which `D_j` equals `-2 ln(0.05)`, which for a count of zero is exactly Prompt 229's `-ln(0.05) / E_j`.

**The floor and the resolution.** A bin with `E_j` below 5 is "not constrained" (no rate, no limit), and if every bin is below the floor so is the result; the bin stays in the fit so that its listings are not forced into its neighbours. The result states
the median of `sigma_i / w` (the width of the bin that holds `x_i`) and `resolutionOk` (at most 0.5): a bin narrower than twice the typical uncertainty is not resolved.

**The penalty.** A toggle with one weight `kappa`: the estimate maximises `l(mu) - (kappa / 2) sum (theta_(j-1) - 2 theta_j + theta_(j+1))^2` over all bins, `theta_j = ln Gamma_j`. It is a roughness penalty on the log rate, a regularisation chosen by the user; it
is not a prior and its result is not a posterior; the record names itself a penalised maximum likelihood, carries its `kappa`, returns no interval (the unpenalised fit is beside it) and contains none of the words prior, posterior, credible or Bayes (leg P4).

**Limits, stated.** No continuous model of the distribution, no sampler (D-SAMPLER-01), no marginal likelihood, no hierarchical model, no fitting of `sigma`, no dependence of the selection on `sigma` (the exposure is not the one of this likelihood when the
survey cuts on the measured value), at most 64 bins, a stated reliability and false listings distributed like the real ones of their bin (as in Prompt 229).

**Delta table (rule 9).** Existing authority: `js/kernels/occurrence/rates.js` (`rateOf`, `occurrenceGrid`), which stays Prompt 229's engine; `js/kernels/statistics/` (`selection.js`, the object; `intervals.js`, the Poisson interval; `special.js`; `check.js`), reused,
not copied. Missing behaviour: bins of any observable and any exposure, per-object uncertainties, an exposure built from selection objects (including a volume), the penalty, the resolution record. Adopter: Part B's planet and mass-function panels, which the consumers
rule holds. Duplication removed: none yet; if Part B follows, the counts path would let `rateOf` become a call of it (a Part B decision), and Prompt 262's effective-volume module is on a spike and is not imported (the exposure here is the same definition, leg A5).
The truncation estimator of Prompt 262, which failed a leg, is not relied on in any way.

## 3. Results

52 rows: **42 pass, 1 fail, 6 reported, 3 not run.**

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 the oracle read the same thresholds file | sha256 equal | pass |
| (b) oracle's own | O1 L-BFGS-B against its own EM; O2 hand A2; O3 the counts path by `scipy.stats.chi2` against the Poisson tail; O4 the deviance at the ends it found | 2.3e-13; exact; 1.3e-15; 1.4e-11 | pass |
| (a) analytic | A1 hand counts (rates 0.3 and 0.4, limit `-ln(0.05)/8`); A2 the non-identified split (total 1, `l_hat = ln(Phi(2) - 1/2) - 1`, interval `[0, g*]`, `g* = 4.403`); A3 constant selection; A4 the exposure of 500 logistic selections against `scipy.integrate.quad`; A5 the effective volume 4.5 | all to 1e-12 or exact; A4 1.5e-5 | pass |
| equivalence with 229 | Q1 the planet case, 200 populations by 40 cells (8,000: 5,535 ok, 2,065 upper limits, 400 not constrained), counts path against `occurrenceGrid`; Q2 the same cells given as objects with sigma 0; Q3 the profile path at sigma 1e-4 against the counts path and against 154's `poissonInterval` with method `profile` (553 cells) | statuses and methods identical, max relative difference 2.2e-16 (one unit in the last place; bound 1e-14); Q3 rate 4.9e-16, ends 1.1e-11 | pass |
| (b) reference | R1 counts sample S8 against the oracle; R2 to R6 seven object samples S1 to S7 (unequal widths, reliability by bin, empty and below-floor bins, about 7,000 objects): log-likelihood, mu, interval ends at two levels, zero limits and floor statuses, resolution record | R1 exact, ends 8e-15; R2 1.6e-12 (bound 1e-8); R3 5.0e-8 (1e-3, the five-fold step sample S3); R4 1.0e-11 (1e-3); R5 9.5e-14; R6 exact | pass |
| (a) recovery | V1 U1 at 100 times the exposure (70,128 objects): largest relative error of the rate; V2 M at 100 times (151,375 objects) | 0.039 (bound 0.05, bin 6); 0.014 (0.08) | pass |
| (c) coverage, prototype | C1 U1 (1,000 replicates, per-object sigma 0.1 to 0.4 of a bin, eight bins, 95 percent); C1b its lowest bin; C2 the 68.27 percent level; C3 U3 (sparse, 5 to 30 listings a bin); C4 M (a mass function through a flux limit, 500 replicates); C4b its lowest bin; C5 the bias; C6 the share of fits that did not converge | 0.947 (0.939 to 0.954); 0.939; 0.679; 0.947; 0.951 (0.936 to 0.970); 0.936; largest bias 0.006; 0 of 2,500 | pass |
| (c) coverage, oracle | C7 the oracle's own implementation on its own numpy ensemble of U1 (300 replicates) | 0.953 | pass |
| (d) misspecified | D1 a doubled declared sigma must widen the interval (3,200 pairs); D2 the resolution flag (true in all of U1, false in all 500 replicates of U2); D8 the limit of a zero estimate | D1 1.256 (bound 1.05); D2 1.000 and 1.000; **D8 0.623 (bound 0.94)** | pass, pass, **fail** |
| (d) refusals | D3 the eight base codes (edges, exposure, reliability, count, counts, sample, level, penalty); D4 the five object codes (sigma, object, outside, unplaceable, penalty-gap); D5 and D6 the floor on both paths; D7 an empty sample | every code as committed, the valid neighbour of each case is not refused; D7 3.7e-16 | pass |
| penalty | P1 kappa 0 equals the maximum; P2 against `scipy.optimize.minimize` (kappa 1, 4, 16 on S1 and S3); P3 the penalty on a smooth truth with sparse counts (400 replicates); P4 the naming; P5 the refusals | P1 2e-16; P2 9.1e-9 (bound 1e-4); P3 the sum of squared relative errors falls to 0.258 of the unpenalised (bound 0.9; 374 of 400 replicates, see below); P4, P5 as stated | pass |
| reported | N1 the naive method (a listing counted in its measured bin and Prompt 229's rate and interval); N2 a wrong exposure; N3 half the true sigma declared; N4 U2, outside the domain; N5 a sharp feature under the penalty; N6 CPU time | below | reported |
| (e) authentic | X1 a real survey's candidates, completeness and published table; X2 a cluster's members as a present-day mass function; X3 a cited implementation | requests R1 to R4 | NOT RUN |

The reported legs, as measured:

- **N1.** Counting each listing in its measured bin, with the same exposure and Prompt 229's interval, covers 0.886 on average and **0.579 in bin 5**, the bin just beyond the five-fold fall in the rate, where objects of bin 4 spill into it (0.86 to 0.96 in the other bins). The convolution is what repairs it: 0.947.
- **N2.** Declaring the exposure of bins 4 to 7 as 0.7 of the truth biases the rate by 1.42 to 1.45 (the reciprocal, 1.43) and covers 0.07 to 0.70. The intervals are conditional on the exposure; nothing in the likelihood can see a wrong selection function.
- **N3.** Declaring half the true sigma covers 0.932 over the rich bins (0.875 in bin 5), a mild loss; declaring double widens the intervals by 26 percent (D1).
- **N4.** At sigma 0.6 to 1.2 of a bin width (outside the committed domain, flagged in all 500 replicates) no upper end was unbounded in 3,840 bins, the median interval is 3.0 times as wide as U1's and the coverage is 0.9625: the interval widens with the uncertainty, and the flag is what tells a reader the bins are not resolved.
- **N5.** A feature six times its neighbours, recovered at kappa 1, 4 and 16, comes back at 0.79, 0.61 and 0.47 of its true rate while its neighbours are raised to 1.70, 2.05 and 2.15 times theirs: the penalty smooths structure away, and the more the larger kappa.

Two numbers to read with care. **The penalised fit did not meet its own gradient criterion (1e-10, absolute, in 1,000 Newton iterations) in 2 of the 6 fits compared with the oracle and in 26 of 400 replicates of P3**; the estimates agree with the oracle's to 9.1e-9
(P2), and P3's ratio is over the 374 replicates in which both fits converged (dropped replicates counted and reported, as committed). The cause was not diagnosed here; a criterion relative to the count is the likely repair for a Part B. **The U1 and M coverage is
measured by the deviance at the truth**, which is the profile interval's own test (section 2), not by assembling endpoints; the endpoints themselves are compared with the oracle's root-finding in R4.

## 4. The failing leg, left failing, and one correction

**D8.noZeroRule.** Among the replicates and bins of U3 whose estimate is zero (114 statements; truth: 5 expected listings a bin), the share whose upper limit lies at or above the true rate is 0.623 against a committed lower bound of 0.94. The bound was committed before any number
existed and is not moved. The leg, as I wrote it, conditions on the outcome: a frequentist limit is built to cover the truth over all outcomes, not among those that came out zero. The post-hoc diagnostic (`diagnostic-d8.json`, labelled as such and changing no leg) shows it on
the case where the rule is Prompt 229's and exact: with a truth of 5 listings and an exposure of 500, 1,383 of 200,000 draws are zero, **none** of their limits (`-ln(0.05) / E`, which is 3 listings) reaches the truth, while the statements of all draws cover 0.979. On the object path
the statements of the same bins as a whole cover 0.947 (C3 passes at 0.947) and those conditioned on a zero estimate cover 0.623. So the failure is of the measurement, not a sign that the limit is wrong, but by the committed function it is a failed leg of the per-object-uncertainty
set, and it makes the letter B. What would resolve it is a new leg, committed with its bound before its first run, in a follow-up: the coverage of the reported statement over all outcomes, in the bins of U3 where zero estimates occur (the unconditional measurement), which C3 already approximates at 0.947 for all bins.

**One correction, recorded as AM3.** The first stream (`first-run-results.json`) read 41 pass, 2 fail (D8 and P2), 6 reported, 3 not run. P2's failure was my validator's: it computed the status with a condition (that every penalised fit meets the Newton criterion) that the committed bound
(the largest absolute difference of ln Gamma, 1e-4) does not contain; R2, Q3, V1 and V2 carried the same kind of extra condition (convergence), all of which held. The validator was corrected to apply the committed bounds alone and the convergence counts became measured fields; the stream was then
run twice; P2 reads pass (9.1e-9) and no other row's measured numbers changed (the test compares the two files). This is a correction of the validator to the contract made after a result, not a moved bound, and it is Carl's to reverse: with P2 failing the penalty would not be admitted and the
counts would read 41 pass and 2 fail.

## 5. What the evidence supports, and what the verdict B means

By the committed function the verdict is **B**: BASE passes (every leg of the counts case, the equivalence with Prompt 229, the exposure, the floor and the refusals), UNC does not (D8). Appendix C's B for this prompt is "without per-object uncertainties": Part B, if it follows,
builds the counts path (the maximum-likelihood rates with Prompt 154's intervals, on any bins and any exposure, the floor and the refusals) as a general engine that reproduces Prompt 229's to the digit, and builds nothing that takes a `sigma`. A B verdict never authorizes the A scope.
The penalty's toggle is admitted by its own legs (PENALTY ADMITTED) and would be built with the counts path; it does not change the letter. Under the consumers rule nothing student-facing follows until Carl lifts the rule.

The verdict is a verdict on tiers (a) to (d) and the oracle, V-internal and synthetic. The authentic tier (e) is NOT RUN (section 7): no sentence in the product may rest on this gate for a real survey or a real cluster until it has run, and nothing here is a present-day mass function or an
initial mass function. What the numbers do support:

- The counts path equals Prompt 229's `occurrenceGrid` on 8,000 cells of 200 populations to one unit in the last place, with the same statuses and method strings, whether the sample is given as counts or as objects with no uncertainty.
- With per-object uncertainties of 0.1 to 0.4 of a bin, the profile intervals cover 0.947 at a nominal 0.95 (U1, eight bins, 1,000 replicates), 0.947 on sparse counts (U3) and 0.951 on a mass function through a flux limit with exposures spanning five orders of magnitude (M); the oracle's own implementation covers 0.953.
  They equal an independent L-BFGS-B and root-finding implementation to 1e-12 in log-likelihood and 1e-11 in the interval ends on seven samples, and recover the truth to 4 percent at 70,000 objects.
- The intervals widen when the declared uncertainty grows, and the resolution flag fires in every case where the bins are not resolved (U2), where the interval is three times as wide and still covers.
- The kernel cannot see a wrong selection function (N2) and says nothing about one; the result is conditional on the exposure it is given, on the stated reliability and on the declared sigma.
- The penalty lowers the error of a smooth, sparse population by four-fold and removes a real feature by up to a half; it is a smoothing, offered with its effect shown and never with an interval.

## 6. The validation table (7.5 rule 8)

| Tier | Content | State |
| --- | --- | --- |
| (a) analytic | A1 to A5, V1, V2 | pass |
| (b) reference | O1 to O4, Q1 to Q3, R1 to R6, P2 (scipy.optimize, scipy.integrate, scipy.stats; Prompt 229's engine) | pass |
| (c) ensemble | C1 to C7, P3 | pass |
| (d) misspecified and refusals | D1, D2, D3 to D7, P4, P5 pass; **D8 fails**; N1 to N5 reported | one failing |
| (e) authentic | X1 to X3 | NOT RUN |

## 7. Requests (all NOT RUN legs name theirs)

Carl's session fetches public data into `scratch-data/population264/` outside any repository; this session fetched nothing and ran no downloaded code. No title, release, catalogue identifier or number is typed here: the person fetching names them from the sources' own documentation.

- **R1 (X1).** The data of one published exoplanet occurrence calculation that publishes its search completeness: (a) the survey's planet candidate list with each candidate's period, radius and their uncertainties and the candidate reliability its catalogue states; (b) the survey's published injection-and-recovery completeness (a table or a per-target product) with its version and date; (c) the calculation's published occurrence table (rates with intervals, in period and radius bins), the bins' definitions and the paper's text. Record each file's terms and the retrieval date.
- **R2 (X2).** A cluster's member list with each member's mass (or the luminosity from which the kernel's declared relation gives one) and its stated uncertainty, the survey's completeness as a function of magnitude, and the cluster's published present-day mass function with the paper's text and the terms. A cluster already in the repository's cluster pack may be used if its photometry and uncertainties are enough; say which.
- **R3 (X2).** The printed form of the initial mass function that a later lesson would compare a synthetic population with (the equation and its stated range), as text with the equation number and the source's terms. Part A uses none.
- **R4 (X3).** A cited published implementation of an occurrence or binned-rate likelihood with a selection function (named from the documentation of R1's calculation), its licence, and the printed output of its example run on the example data it ships, as files. Running it is a downloaded program and needs Carl's permission; only files and printed output are asked.

## 8. Rights, data and size

No data, paper, table or code was fetched or run beyond the prototype, the oracle and the validator written for this gate; no published value is in any fixture and no home path is in any fixture. The only data not generated here is the stored synthetic planet survey of Prompt 229 (`js/data/occurrenceSurvey.js`),
which is already in the tree and labelled synthetic. **No size ceiling is raised**: the PR adds a document, about 0.55 MB of JSON fixtures (none shipped), one test and register rows; nothing under `js/` changes and no precache tier, bundle, route, data plane or generated artifact other than the documentation counts changes.
Labels: `invisible` and `documentation`.

## 9. Questions for Carl

1. The verdict is B because one committed leg (D8) measures a conditional coverage that no limit of this kind can meet, as the exact counts-path case shows. Do you want the follow-up leg of section 4 (the unconditional coverage of the reported statement in the bins where zero estimates occur, bound committed first) before Part B, or Part B for the counts path alone, when the consumers rule is lifted?
2. AM3 corrected my validator's P2 status to the committed bound after the first run (section 4). Confirm, or reverse it (the penalty would then not be admitted).
3. The penalised fit missed its gradient criterion in 26 of 400 replicates; should a Part B fix the criterion (relative to the count) and state that, or is the penalty to wait for the follow-up?
4. Requests R1 to R4: should your session fetch them, and may R4's printed output be read (running it is not asked)?

## 10. The follow-up: D8b, the penalty's convergence, and the fetch (2026-11-10)

Documentation and fixtures only. The contract is `tests/fixtures/population/followup-thresholds.json`; the pinned numbers are `followup-oracle-results.json`, `followup-first-stage-results.json`, `followup-results.json`, `followup-failed-legs.json` (empty), `followup-sources.json` and a labelled post-hoc diagnostic, `followup-diagnostic-crossfeed.json`. The follow-up's oracle (`tools/population-oracle/oracle_followup.py`), its sample writer, its validator and one added option of the prototype are on `spike/population-inference-followup` (cut from `spike/population-inference-gate` at 48d21711, head 1245c18b), never merged. No file of Part A was edited and no bound of Part A moved; the record's test holds Part A's six fixtures by their sha256. Node 22.23.4 (34 s of CPU); Python 3.9.6 with numpy 1.26.4 and scipy 1.13.1 under `python3 -E` (101 s). Two complete runs of the stream agree row for row except the CPU time.

### 10.1 What each item is, where it was approved, and the consumers condition

Stated in the contract before any run (`whatThisIs`):

- **D8b** is the leg section 4 names: the coverage of the reported statement over all outcomes, in the bins of U3 where zero estimates occur. Approved in `DECISIONS_2026-11-07.md`, 264 rulings, item 1, "before any Part B".
- **The penalty-convergence study** is the diagnosis of the penalised fits that missed their gradient criterion (2 of 6 reference fits, 26 of 400 replicates of P3; section 3) and a new leg with its bound committed first. Approved in item 3 of the same rulings: "no Part B until then".
- **The data legs** are requests R1 to R4 of section 7 and the authentic legs X1 to X3 that depend on them. Item 4 of the same rulings: fetched by the follow-up under Carl's own words of 2026-11-07, and X3 stays NOT RUN because it needs a cited implementation to be run.
- **The consumers condition.** A consumer of this kernel may be built only when all of these hold: (1) the letter authorizes the scope the consumer uses (B, the counts path, since Part A; anything that takes a per-object sigma needs "A through D8b" and Carl's ratification of it); (2) for the smoothing toggle, the convergence legs pass; (3) Part B has been built; (4) Carl lifts the consumers rule for this kernel, which has no place in the recorded release order yet; (5) a sentence about a real survey or a real cluster also needs its authentic leg to have run and passed.

The launching session relayed Carl's ruling to go with the recorded recommendation; it was not heard directly here, so every row this follow-up adds to the register is DELEGATED.

### 10.2 The order

| Commit | What | Before |
| --- | --- | --- |
| `87bc8002` | `followup-thresholds.json`, alone: the three items and the consumers condition, 22 legs with their bounds, the rule every bound follows, the seeds, the measurement definitions, the limits of a repaired stopping rule, the outcome function, eight decisions | any follow-up code, sample, fetch or number |
| `9af8656a` | amendment AM-F1 (which optimum a penalised comparison uses, how per-sample output is pinned, how sameness of the copied functions is measured) | the oracle's first run |
| spike `84054ef5`; `cb287f88` | the oracle, then its first stage pinned (Part A's reference fits and its own numpy ensemble of U3c) | any Gravitas-side code of the follow-up |
| spike `747451f9`; `94c7f8cf` | the estimator-free sample writer, then the oracle's second stage pinned (the stream samples of P3, P3c and P4c) | the prototype ran on any sample of the follow-up |
| `a41016cd`, spike `037302bc`, `120f3f93`, `c72a25e3` | amendment AM-F2 (Part A's P4 samples for the diagnostic's classes; the oracle left as it ran), stage 2b pinned, the oracle pinned again (identical) | any validator run |
| spike `7517f4b5`, `04611924`; `29ed11b9` | the validator's first stage (D8b and the diagnostic, default stopping rule only), run twice and pinned | the repaired rule existed |
| `a8155526`, `df2071c3` | amendment AM-F3: the diagnosis and the repaired stopping rule with its constants; the oracle pinned again (identical) | any fit under the repaired rule |
| spike `eab15e80`; `b8afded5` | the option and the validator's second stage, run twice; the synthetic rows pinned | the fetch |
| `2a24ed98`, `454c8f41` | the fetch recorded (`followup-sources.json`) and amendment AM-F4: no contract fixed, nothing computed from a fetched file; the oracle pinned again (identical) | the validator's final run |
| spike `1245c18b`; `93a3f197` | the three authentic rows; the final stream, twice | |

What had been seen before the contract was committed is listed in it (`seenBeforeCommitting`): Part A's record in full, the spike's code read and not run, and one hand calculation about a nominal 0.95 on a count of 5. Because Part A's record already gives the unconditional coverage of the same bins on Part A's draws (0.94975), **D8b is judged on new seeds only**.

### 10.3 The rule every bound follows

No bound was chosen here. A new leg that measures the quantity of a Part A leg, on other statements or other draws, carries that leg's committed bound: D8b carries C3's interval [0.90, 0.99] (it is C3's quantity on four of C3's bins) and a lowest bin of at least 0.90; the share of penalised fits that miss the stopping rule carries C6's 0.005; agreement of a penalised estimate with the oracle carries P2's 1e-4; the penalty's benefit carries P3's 0.9; two routes of the prototype that must agree carry the continuity tolerance 1e-5. D8's own 0.94 belonged to a conditional quantity and is not inherited; whether it is reached is reported.

### 10.4 Results

22 rows: **12 pass, 0 fail, 7 reported, 3 not run.**

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | F1 every sha256 and the stream samples byte for byte; F2 the follow-up's oracle on Part A's pinned reference fits; F3 the validator with the default rule on Part A's C3, P2 and P3 | equal; 0 in every comparison; C3's eight bins and 114 zero statements with 71 covered, P2's six differences with 2 not converged, P3's 374 used, 26 dropped and its ratio, all exactly | pass |
| D8b | premise (zero estimates occur among the statements judged); the prototype on U3c, 5,000 replicates on new seeds, bins 0, 5, 6 and 7; its lowest bin; the oracle's own implementation on its own numpy ensemble, 1,000 replicates | 534 and 105 zero statements; **18,990 of 20,000 covered, 0.9495** (bins: 0.9452, 0.9614, 0.9498, 0.9416); 0.9416; **3,814 of 4,000, 0.9535** (bins: 0.950, 0.963, 0.960, 0.941); bound [0.90, 0.99] and at least 0.90 | pass |
| penalty, oracle | PO1 the oracle's BFGS against its Newton iteration from a flat start, on 4,006 fits | 1.6e-7 in theta (bound 1e-6) | pass |
| penalty, repaired rule | PC1 the share of fits that miss the rule over the six reference fits, P3c and P4c at kappa 1, 4 and 16; PC2 against the oracle on 2,806 fits, every fit counted; PC3 P3's measurement on new seeds; PC4 against the default rule where that converged (378 fits) | 0 of 2,406 (at most 6 iterations); 9.5e-7 (bound 1e-4); 0.264 over all 400 replicates, none dropped (bound 0.9); 3.0e-7 (bound 1e-5) | pass |
| reported | D8b.r1 the conditional share; D8b.r2 the cross-feed; D8b.r3 the exact counts path; PD1 to PD3 the diagnostic; PD4 uniqueness | below | reported |
| authentic | X1, X2, X3 | requests in `followup-sources.json` | NOT RUN |

**D8b, read with its reported rows.** Over all outcomes the statement of the bins where zero estimates occur covers 0.9495 in the prototype and 0.9535 in the oracle, at a nominal 0.95. The conditional share that D8 measured is again low, 0.556 (297 of 534) and 0.600 (63 of 105): a limit is built to cover over all outcomes, not among those that came out zero. No zero estimate occurred outside the four bins. Both pooled coverages and the lowest bin also reach D8's 0.94, which was not the bound. On the counts path, where the rule is Prompt 229's, the exact coverage by summing the Poisson distribution is 0.9796 at a true count of 5 and 0.9792 at 7.08, the same in the prototype and in `scipy.stats` to 7e-16. The oracle's L-BFGS-B reported an unsuccessful stop in 160 of its 1,000 unpenalised fits; its statements are compared with the prototype's one by one in the next paragraph.

**A finding from the cross-feed (reported, not a leg).** Fed the oracle's 1,000 samples, the prototype gives the same status and the same covering flag in all 4,000 statements, and limits equal to 1.2e-11. In 4 statements its deviance at the truth differs from the oracle's by more than 1e-6 (3 by more than 1e-3, the largest 0.027). A third calculation (EM to a fixed point, and `scipy.optimize` trust-constr from three starts; `followup-diagnostic-crossfeed.json`) shows the oracle is right: where a bin that is zero at the maximum must rise under the constraint, the prototype starts it at 1e-9, stops on the change of the log-likelihood before it has grown, and reports a deviance that is too large. No flag changed here and the effect on a coverage of 20,000 statements is below what the ensemble resolves, but it is a defect of the prototype's profile deviance and it makes an interval slightly too narrow where it applies. It is not repaired here (it is outside the approved scope); section 10.7 recommends a leg for it before a Part B takes the per-object scope.

**The diagnosis of the penalised fit.** Every penalised fit of Part A that missed its criterion is at the optimum: the 28 of PD1 (reference fits S1 at kappa 1 and S3 at kappa 16, and 26 replicates of P3) lie within 3.4e-8 of the oracle's optimum in theta, and the 114 of P4's 1,200 fits (43, 43 and 28 at kappa 1, 4 and 16; N5 had recorded no count) within 1.1e-7. Each ended at the cap of 1,000 iterations with a positive definite Hessian, a damping grown by many decades and a Newton decrement below the rounding of the objective (at most 0.77 of the committed floor, at most 0.12 in all but one fit). The fits that met the criterion did so in at most 6 iterations. The fit reaches the optimum in a few steps and then cannot stop: the criterion is an absolute 1e-10 on a gradient that the step's own acceptance test (the objective must not rise) cannot drive lower, because one more step changes the objective by less than its rounding. The oracle shows the same thing from the other side: its BFGS flags an unsuccessful stop in most fits and its Newton iteration, which also compares objectives, ran to its cap of 400 in some, while the two agree to 1.6e-7. The Hessian of the unpenalised term has a negative eigenvalue at the optimum in 24 of the 4,006 fits (the objective is not convex in the log rate in general); the full Hessian is positive definite in all of them and two algorithms from two starts reach the same point.

**The repaired stopping rule (amendment AM-F3, before its first run).** Requested by `penalty.stop = 'rounding-floor'` on the spike and off by default: the fit ends as converged when the default criterion holds, or when the Newton decrement is at most 64 x 2^-52 x max(1, |objective|) and the largest gradient component is at most 1e-6 per listing. Nothing else changes (the objective, the start, the step, its acceptance, the damping, the cap). Judged on seeds the prototype had not used: no fit of 2,406 misses it, 1,809 end by the new clause and 597 by the default, the estimates are within 9.5e-7 of the oracle, and where the default rule converged the two estimates agree to 3.0e-7. P3's ratio is 0.264 over all 400 replicates with none dropped (Part A: 0.258 over the 374 that converged).

### 10.5 The outcome, by the committed function

- **A through D8b**: D8b passes with F1 to F3, and Part A's record still shows BASE passing and every leg of the per-object-uncertainty set other than D8 passing. It reads: the per-object-uncertainty set passes its committed legs, the limit of a zero estimate being carried by D8b in place of D8, which stays failing and labelled. It is evidence in a DELEGATED row, not permission.
- **Penalty convergence passes** (F1 to F3, PO1, PC1 to PC4). Part A's admission of the toggle, with its AM3 note, is not recomputed.
- **Part A's verdict by Part A's function stays B** and `results.json` and `failed-legs.json` are untouched: D8.noZeroRule fails at 0.623 against 0.94.
- **Tier (e) is NOT RUN** on all three legs. No sentence in the product about a real survey or a real cluster may rest on this gate.

**The consumers condition is not met.** Of its five parts: (1) holds for the counts path since Part A and, for the per-object scope, as unratified evidence only; (2) holds as evidence; (3) does not hold, Part B is not built and is not begun here; (4) does not hold, the consumers rule is not lifted and this kernel has no place in the release order; (5) does not hold, X1 and X2 are NOT RUN. No panel, lesson or viewer was built.

### 10.6 The fetch (requests R1 to R4)

Public files went to `scratch-data/population264/` outside every repository, one directory per source, each with its sha256, size, the licence page as read and the retrieval date of 2026-11-10 (`followup-sources.json`). All are arXiv e-prints under arXiv's non-exclusive licence to distribute, which grants a reader no reuse right: cite-only, read as text, nothing redistributed, nothing run. No published number is in a fixture except the descriptions of what each file holds, read from the file named.

- **R1, in part.** The e-print of one occurrence calculation (arXiv 1501.01623) holds its candidates table (period and radius with errors) and its occurrence table: seven radius bins by five period bins, each cell with its errors and with the fraction of injected planets recovered in the cell. The e-print of the paper whose Table 1 that calculation names for its false-positive probability (arXiv 1301.0842) was fetched for the stated reliability. A third e-print (arXiv 1304.0460) was examined first and set aside: its completeness and occurrence are printed only inside figures.
- **X1 is NOT RUN.** An exposure is the recovered fraction times the number of stars times the transit probability of the sample's stars. The last needs the stars' radii and masses, which the paper takes from a stellar catalogue it does not print; the archive that serves that catalogue answered HTTP 503 ("Under Maintenance") twice. A transit probability made up from the one median radius the paper states and a guessed mass would be this session's number, so no contract was written and nothing was computed from the files. The exact requests are in `followup-sources.json`: the stellar rows from the archive, the paper's electronic-edition tables, then an amendment fixing the contract before any estimate. The paper's radius bins are 0.5 Earth radii wide against radius errors of a few tenths, so the kernel's own resolution record is part of what that run must report.
- **R2 not filled; X2 is NOT RUN.** The catalogue service did not connect. Nothing was kept and nothing read.
- **R3 filled.** The printed multiple-part power-law form of an initial mass function with its mass ranges (arXiv astro-ph/0009005, the first two numbered equations of the e-print's source). No leg reads it; it is for a later lesson.
- **R4 not filled; X3 is NOT RUN.** The calculation of R1 names no implementation of a binned-rate likelihood (it divides a smoothed map of the candidates by a smoothed map of the search completeness), so there was nothing to name from its documentation; and running one is not permitted in any case.

### 10.7 Decisions taken, and questions for Carl with the recorded recommendation

Decisions (all in the contract before the run they affect): D8b judged on new seeds; C3's interval inherited and not D8's 0.94; the repaired rule fixed after the diagnosis, inside committed limits, and judged on other seeds; the cross-feed and the exact counts coverage as reported rows; the authentic contracts by amendment after a fetch and before any estimate; four amendments, none moving a bound. Two corrections of this session's own wording are on record: a commit message gave P4's count as 129 where the pinned file says 114 (AM-F3), and AM-F3 gave the decrement as 0.054 of the floor in all but one fit where the file says at most 0.12 (AM-F4).

1. **Ratify "A through D8b"?** Recommended: yes, as the standing of the per-object-uncertainty set, with question 2 attached.
2. **The prototype's constrained fit** stops early where a zero bin must rise (4 of 4,000 statements, up to 0.027 in the deviance, no flag changed). Recommended: before a Part B takes the per-object scope, a new leg committed first: the cross-feed as a judged leg (the deviance at the truth against the oracle's on new seeds), with the constrained fit's start repaired on the spike.
3. **D8b's bound.** It carries C3's interval by the stated rule; D8's 0.94 is also reached (0.9495, 0.9535, lowest bin 0.9416). If 0.94 should have been the bound, that is a reset for Carl to record; the leg would still pass.
4. **The stopping rule in a Part B.** Recommended: the repaired rule as the penalised fit's only rule, stated in the kernel document.
5. **The data legs.** Recommended: a short session when the archive and the catalogue service answer, with the requests of `followup-sources.json`; X3 stays NOT RUN unless running a cited implementation is permitted.
6. **Part B and the consumers rule** remain Carl's. Nothing here begins either.

<!-- Listed in DOCUMENTS.md. -->
