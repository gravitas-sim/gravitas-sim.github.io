# The censoring and truncation gate

Roadmap III, Prompt 262, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, register row D-R10-254-01 and `DECISIONS_2026-11-06.md`; the hard prerequisites 154, 233 and 254 are merged or recorded on `v3`).
Censoring (an object is in the sample with only an upper limit) and truncation (an object is absent and nothing records how many) are different problems with different estimators: a product-limit estimator for left-censored
values with a log-rank check of independence, the Lynden-Bell product-limit estimator for a lower-truncated sample, and V/Vmax with an effective volume. Their definitions, domains, the independent oracle, the coverage ensembles and
the verdict function were committed before any code, then measured on a spike. **Verdict by the committed function: B, slice B-KM** (the censoring estimator and its independence check). The truncation estimator fails one leg and
stays failing (section 4): **C2o**, the oracle's own implementation on its own ensemble, covers 0.919 against a committed lower bound of 0.92; every other leg of the truncation estimator passes, including the prototype's own
coverage legs (0.951 and 0.949). V/Vmax with an effective volume is admitted. Nothing is built, the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, and **Part B is not begun**. The record is decision-register rows
D-R10-262-01 to D-R10-262-05.

**Follow-up, 2026-11-10 (section 10).** The two legs that section 4 names, C2c and the cross-feed, were approved as a follow-up (`DECISIONS_2026-11-07.md`, 262 rulings, item 2) and have run, bounds committed first. All seven bounded legs pass:
both implementations cover 0.939 to 0.944 at 5000 replicates on new seeds, and they are the same function bit for bit on 24,000 cross-fed samples. **Outcome by the follow-up's committed function: A through C2c**, a DELEGATED row that Carl has
not ratified; Part A's verdict by Part A's function stays B-KM, **C2o stays failing and its bound is not moved**, nothing is built and the consumers condition is not met. Sections 1 to 9 are Part A's text, kept as written.

The numbers are in `tests/fixtures/censoring/` (`thresholds.json` the contract; `oracle-results.json` the pinned independent calculation, its samples and its own ensembles; `results.json` the gate stream;
`failed-legs.json`). The prototype (`js/kernels/statistics/censoring.js`, `truncation.js`, `vmax.js` on the spike), the validator (`tools/censoring-validate.mjs`) and the oracle (`tools/censoring-oracle/oracle.py`) are on
`spike/censoring-truncation-gate` (validator and prototype at 4735488a), never merged (rule 7.5.4): this PR is documentation, fixtures and one test. The gate stream ran on Node 22.23.4 (6 s); the oracle on Python 3.9.6 with numpy
1.26.4 and scipy 1.13.1 under `python -E` (26 s). Two complete runs of the gate stream agree row for row except the CPU time.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `40323037` | `thresholds.json`: the problems, the estimators and their domains, the constants, the scenarios and seeds, the reference-sample designs, the hand examples (derived on paper), the 41 legs and bounds, the verdict function, the requests, six decisions | any prototype, oracle, sample, random draw or computation |
| spike `526bd13b` | the oracle, syntax checked only | its first run |
| `0cb2c0ca` | the oracle's pinned output (first run; its summary agrees with the hand examples, scipy and its own second algorithm) | the prototype existed |
| `1552814a` | amendments AM1 to AM3 (hand examples A6 and A7 run with `minObjects: 1`; the measurement definitions of the accuracy and ensemble legs; the oracle run again), recorded | any validator run |
| `25186c2e` | the oracle's output pinned again against the amended file (every number identical; only the thresholds sha256 differs, checked by script) | the validator existed |
| spike `71b48fd3`, `4735488a` | the prototype and the validator, syntax checked only | any validator run |
| `54fd3973` | `results.json` and `failed-legs.json` (the stream, twice, identical) | |
| `7044571a`, `5aa549fe` | amendment AM4 (wording only: a request named its fetch directory by an absolute home path, which no fixture may hold), then the oracle and the stream run again against the file that carries AM1 to AM4: every number identical, only the sha256 fields of I1 differ | |

What had been seen before the contract was committed, and only that (`seenBeforeCommitting`): the roadmap sections, Checkpoint V, the register rows and `STATISTICS.md` of 154, the export lists of the statistics kernel, `js/numeric/`
and the random streams, the form of the previous gates, and the installed Python packages. No paper, table, catalogue or data file on survival analysis, truncation or V/Vmax was read or fetched, and no published number, citation
detail, sample or licence term was typed from memory. The estimators are therefore stated from their definitions (DEC1), and their agreement with the printed forms is request R4 (leg X4, NOT RUN).

## 2. The decision

**Censoring.** Rows `{value, censored, limit?}`; a limit means the value is below it. With `M` the largest value and `y = M - value`, a limit is a right-censored observation, so the product-limit estimator of the flipped data estimates
the distribution; at ties events are processed before censorings. If the smallest raw observation is a detection the mass is complete and the mean is the area under the survival curve; if it is a limit, the mass below it cannot be
placed by the data: the result is `bounded`, the mean is `null`, and `meanLow` (that mass at a declared floor) and `meanHigh` (at the smallest observation) are returned, with a refusal (`unbounded-tail`) when no floor is declared
(DEC2). The variance is the Greenwood-type sum `A_i^2 d_i / (n_i (n_i - d_i))` of the area (`A_i` the integral of the curve beyond `y_i`), and the interval is `[meanLow - z se, meanHigh + z se]`. **Independence check**: rows with a
`limit` on every row are split at the median limit and the two halves compared by the two-sample log-rank test on the flipped data; `p < 0.01` flags, and a flagged result carries status `dependent` and no interval (DEC3). It cannot
prove independence and says so. Domain: independent censoring, one mechanism, exact detections, at least 5 detections.

**Truncation.** Rows `{x, u}` with `u <= x`, the lower limit of observability of each object. For a declared `from`, the associated set of each `x_i >= from` is the rows with `u_j <= x_i <= x_j`; the product-limit curve built from
those sets estimates the distribution of `x` given `x >= from` (Lynden-Bell's C-minus, the left-truncated product-limit estimator); mean, variance and interval as above. Identifiability needs the truncation to reach below the part
recovered, so the estimator is defined above `from` and refuses (`thin-risk-set`) when the associated set at `from` is under 10 (DEC4).

**V/Vmax.** `Vmax_i = V(min(dmax_i, D))`; for a complete flux-limited sample of a uniform population `V/Vmax` is uniform, so `z = (<V/Vmax> - 1/2) sqrt(12 N)` is standard normal; with a completeness `p(d)` the effective volume
`Veff_i = integral of p dV` gives the space density `sum 1/Veff_i` with the Poisson-process variance `sum 1/Veff_i^2` (DEC5: tested here as a third group so Part B does not extend tested scope; it does not enter the letter).

**Delta table (rule 9).** Existing authority: `js/kernels/statistics/` (`selection.js` the selection object and `completenessCorrect`, `check.js`, `intervals.js`, `special.js`) and `js/numeric/quadrature.js`. Missing behaviour: the two
estimators, the independence check, V/Vmax and the effective volume. Adopter: this gate's spike. Duplication removed: none; a second selection-function object is not built (DEC6).

**Do not apply a censoring estimator to a truncated sample.** The two have different input shapes and each refuses the other's (`truncated-input`, `censored-input`, leg D3 and D4); the naive mean of a truncated sample is the
reported illustration (leg D5, section 3).

## 3. Results

41 rows: **33 pass, 1 fail, 3 reported, 4 not run.**

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 the oracle read the same thresholds file | sha256 equal | pass |
| (b) oracle's own | O0 product-limit against `scipy.stats.ecdf`; O1 closed form against a fixed-point maximisation of the conditional likelihood; O2 hand examples; O3 log-rank against `scipy.stats.logrank` | 1.7e-16; 3.2e-16 (at most 32 iterations); agree; 9.5e-15 | pass |
| (a) analytic | A1 no limits (mean 3.7, variance 1.632); A2 hand sample (3.8, 0.938667); A3 smallest observation a limit (bounds 4.75 and 5.25, tail 0.25, no floor refused); A4 hand truncated sample (sets 2, 3, 3, 2, 1; mean 19/6; variance 505/648); A5 no truncation; A6 V/Vmax (0.41667, z -0.5); A7 effective volume 4.5 | all to 1e-12 | pass |
| (b) reference | R1 prototype against the oracle on 12 censored samples; R2 on 8 truncated samples; R3 the log-rank check; R4 the ramp effective volume on 20 pairs | R1 and R2 identical bit for bit (the same arithmetic); R3 z 9.5e-15, p 3.2e-14 (8 samples checked, 4 refused as too small); R4 3.8e-16 | pass |
| accuracy | L1 n = 20000 censored, against the Gamma(2, 1) CDF; L2 N = 20000 truncated, from = -0.5 | L1 sup 0.0054, mean 2.0010; L2 sup 0.0172, mean 0.4974 against 0.5092 | pass |
| (c) coverage, prototype | C1a K1 n 100; C1b K2 n 100; C1c K3 n 200 (1000 replicates, 95 percent); C2a T1 N 1000; C2b T2 N 300 | 0.944; 0.938; 0.945; 0.951; 0.949 | pass |
| (c) coverage, oracle | C1o the oracle's K1, K2, K3 | 0.932, 0.937, 0.948 | pass |
| (c) coverage, oracle | C2o the oracle's T1 and T2 | **T1 0.919**, T2 0.952 | **fail** (T1) |
| (d) misspecified | D1 value-dependent censoring (rho 0.8, n 200) flagged; D2 false alarm under independence (n 200) | 500 of 500 (1.00); 19 of 1000 (0.019 against a bound of 0.02) | pass |
| (d) refusals | D3 six censoring codes; D4 six truncation codes and both cross-type refusals; D6 four V/Vmax codes and an empty bin | every code as committed | pass |
| V/Vmax | V1 the null rejection rate (2000 replicates, mean N 139); V1n an outward-denser population (500); C4 the bin's space density, hard cut; C4b with the ramp completeness | 0.049, mean z 0.002, variance 0.993; 1.00; 0.945; 0.963 | pass |
| reported | T3 from = -1.5 (500 replicates); D1b rho 0.5; D5 the naive mean | T3: 199 of 500 refused (thin risk set, median 18), coverage of the rest 0.62; D1b flagged 0.954; D5 below | reported |
| (e) authentic | X1 a censored astronomical sample; X2 a truncated one; X3 a V/Vmax sample; X4 the printed forms | requests R1 to R4 | NOT RUN |

D5 (T1, 1000 replicates): the naive mean of the observed values above `from` is **0.401 too high on average** and is more than two standard errors from the truth in all 1000 replicates; the estimator's bias is 0.0003 and it is
beyond two standard errors in 4.4 percent. This is the difference between the two problems, measured: a truncated sample read as if it were the population is wrong beyond two standard errors in every replicate.

Two numbers to read with care. **The censored fraction that is `bounded`** is 33 to 40 percent of replicates in K1 to K3 (the smallest observation is a limit): a point mean is often not available and the bounds carry the answer, the
intervals still cover. **The independence check flags 1.9 percent of independent samples at a nominal 1 percent** (19 of 1000, inside the committed 2 percent); a 1 percent label is therefore not exact, and the doc and any future
panel must say "flagged at about 2 percent of independent samples in this ensemble".

## 4. The failing leg, left failing

**C2o.cmCoverageOracle.** The oracle's own implementation (the closed-form truncation product, in Python) on its own numpy ensemble of T1 (N = 1000, from = -0.5, 1000 replicates, seeds 262600 to 263599 as numpy seeds) covers the
true conditional mean in 0.919 of replicates; the committed lower bound is 0.92. The prototype on the Gravitas-stream ensemble of the same population covers 0.951 (C2a, passing), and T2 covers 0.952 in the oracle and 0.949 in
the prototype. The two ensembles are different realizations by design; their difference (0.032) is 2.9 standard errors of a difference of two proportions at 0.935, so either the true coverage is a little below 0.95 and the
oracle's draw is the unlucky one, or the two generators differ in some way this gate cannot see; the gate does not decide which. The bound was committed before either number existed and is not moved. By the committed function
the truncation estimator does not pass, and the verdict is B-KM.

What would resolve it is a new leg, committed with its bound before its first run, in a follow-up: the same two implementations at 5000 replicates and a different base seed (C2c, bound [0.92, 0.98]), and the same sample generated by one implementation and fed to the other (a cross-feed, an exact comparison). Neither is run here.

## 5. What the evidence supports, and what B-KM means

By the committed function the verdict is **B**: KM PASSES (every leg of the censoring estimator, the independence check and the groups they share), CM does not (C2o). Appendix C's B for this prompt names one estimator: Part B,
if it follows, builds the censoring estimator and its independence check on 154's object for the upper-limit demonstration of "The ones you could not see", with the truncation demonstration staying 154's Malmquist form; the
truncation estimator is not built, and "Who Gets Counted" and "Why the Bright Ones Win" gain no estimator-based upper depth beyond what 154 gives. V/Vmax with an effective volume is admitted by its own legs and does not change
the letter. Under the consumers rule nothing student-facing follows from any of this until Carl lifts the rule, and 233's parallaxes without a universal correction stay a Part B item that needs a verdict he accepts.

The verdict is a verdict on tiers (a) to (d) and the oracle, V-internal and synthetic. It is not a statement about real data: the authentic tier (e) is NOT RUN (section 7), and no sentence in the product may rest on this gate for a
real sample until it has run. What the numbers do support:

- The censoring estimator, with its bounds and the Greenwood-type interval, covers the true mean at 0.94 to 0.95 on three censoring levels (7, 35 and 61 percent censored, analytically) in both implementations, and equals the independent implementation bit for bit on 12 reference samples that include ties and a bounded result.
- A value-dependent censoring (a threshold correlated with the value) is flagged in 500 of 500 replicates at rho 0.8 and in 95 percent at rho 0.5; the price is a 1.9 percent false-alarm rate. The check sees one kind of dependence.
- The truncation estimator reproduces its independent fixed-point maximisation to 3e-16 and its large-sample distribution to 0.017; its own coverage is 0.95 in the prototype and 0.92 to 0.95 in the oracle. It needs the associated set at `from` to be at least 10 (T3 shows what happens below that: 40 percent refused and 0.62 coverage of the rest).
- V/Vmax's z has mean 0.002 and variance 0.993 on a uniform population, rejects 4.9 percent at 5 percent, and rejects an outward-denser population in every replicate; the 1/Vmax space density covers 0.945 (hard cut) and 0.963 (ramp).

## 6. The validation table (7.5 rule 8)

| Tier | Content | State |
| --- | --- | --- |
| (a) analytic | A1 to A7 | pass |
| (b) reference | O0 to O3, R1 to R4 (scipy.stats.ecdf, logrank, quad, a second algorithm) | pass |
| (c) ensemble | C1a to C1c, C1o, C2a, C2b, V1, C4, C4b pass; **C2o fails** | one failing |
| (d) misspecified and refusals | D1, D2, D3, D4, D6, V1n pass; T3, D1b, D5 reported | pass |
| (e) authentic | X1 to X4 | NOT RUN |

## 7. Requests (all NOT RUN legs name theirs)

Carl's session fetches public data into `scratch-data/censoring262/` outside any repository; this session fetched nothing and ran no downloaded code.

- **R1 (X1).** The full text of Feigelson and Nelson 1985 (the paper that brought survival analysis with upper limits to astronomy; the exact reference is resolved through ADS, not typed here) and the sample with upper limits it tabulates, as value and limit flag with units, with its printed product-limit mean and standard error; or the ASURV package's example data and the printed output of its example run if its terms allow. Running ASURV is a downloaded program and needs Carl's permission; only files and printed output are asked.
- **R2 (X2).** Lynden-Bell's 1971 paper introducing C-minus and the quasar sample it tabulates with each object's limit, and Efron and Petrosian 1992 (the independence test under truncation) with any tabulated sample; the printed recovered distribution or statistic for each.
- **R3 (X3).** Schmidt's 1968 V/Vmax paper with its tabulated sample's fluxes or distances and printed `<V/Vmax>`.
- **R4 (X4).** The printed equations of the product-limit estimator, its variance, the C-minus associated set and the V/Vmax mean and variance, as text with the equation numbers, to compare with section 2. A comparison, never a replacement of a bound.
- **R5.** If a recent public survey with a documented per-object detection limit is preferred to the historical samples, name it.

## 8. Rights, data and size

No data, paper, table or code was fetched or run beyond the prototype and the oracle written for this gate; no published value is in any fixture and no home path is in any fixture. **No size ceiling is raised**: the PR adds a
document, about 0.35 MB of JSON fixtures (none shipped), one test and register rows; nothing under `js/` changes and no precache tier, bundle, route, data plane or generated artifact other than the documentation counts changes.
Labels: `invisible` and `documentation`.

## 9. Questions for Carl

1. The verdict is B-KM by the committed function because one oracle-ensemble leg missed its bound by 0.001. Do you want the follow-up legs of section 4 (C2c and the cross-feed, bounds committed first) before Part B, or Part B for the censoring estimator alone now?
2. The check's false-alarm rate is 1.9 percent at a nominal 1 percent. Keep alpha at 0.01 and state the measured rate, or commit a new leg at alpha 0.005?
3. A bounded censored result (about a third of replicates) has no point mean. Is a labelled convention that places the tail mass at the smallest observation (the usual astronomical practice) wanted as a new leg, or does the bounds-only result stand?
4. Requests R1 to R4: should your session fetch them, and may ASURV's example output be read (running it is not asked)?

## 10. The follow-up: C2c and the cross-feed (2026-11-10)

**What this is, stated before any run** (`tests/fixtures/censoring/followup-thresholds.json`, `whatThisIs`, committed alone and first at `ff33d49b`).

- **What C2c is.** Section 4 above: the same two implementations at 5000 replicates and a different base seed, bound [0.92, 0.98], and the same sample generated by one implementation and fed to the other, an exact comparison. Register row D-R10-262-02 names the same two legs as what would let A stand on the same measurements.
- **What was approved.** `DECISIONS_2026-11-07.md`, 262 rulings, item 2: the follow-up, bounds committed first, as a later follow-up; Part B only for the censoring estimator and only once a consumer is released. Item 1: C2o stays failing, no bound moved. The ruling to go with the recorded recommendation was relayed by the launching session, not heard directly here.
- **The consumers condition.** The censoring estimator is released to a consumer only when (1) its slice passes its committed legs and (2) Carl lifts the consumers rule for it, which in the recorded release order comes after 247's line tools and after 251 Part A. The truncation estimator has no place in that order. No outcome of this follow-up releases anything.
- **Not in it.** Part B; any panel, lesson, viewer or shipped byte; the authentic legs X1 to X4; any edit to a Part A fixture.

### 10.1 What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `ff33d49b` | `followup-thresholds.json`, alone: the nine legs and bounds, the two implementations, the ensembles and seeds, the measurement definitions, the order, the outcome function | any follow-up program, sample or number |
| `fc72aa14` | amendment AM-F1 (how the per-sample output is pinned by sha256 and bitmaps; a refused sample compares its refusal only; how the sameness of the sources is measured); no bound moved | the oracle's first run |
| spike `2519f074` | the follow-up's oracle, syntax checked only | its first run |
| `5834f50b` | the oracle's first stage pinned (its own numpy ensembles) | any Gravitas-side code of the follow-up existed |
| spike `1113402b` | the sample writer for the Gravitas-stream ensembles: draws only, it imports no estimator | its run |
| `ba779e4a` | the oracle's second stage pinned (the oracle fed the stream samples); the first stage's block unchanged | the prototype had run on any sample of the follow-up |
| spike `48702bc7` | the validator, syntax checked only | its first run |
| `b0e79038` | `followup-results.json` and `followup-failed-legs.json` (the stream twice, identical but the CPU time) | |

The bound of C2c is inherited: it is the interval this document named for it on 2026-11-07, the committed interval of C2a, C2b and C2o. The cross-feed's tolerances are R2's (associated set exact, mean and variance relative 1e-10). The base seeds
(2620000 for T1, 2630000 for T2) were fixed by a rule that looks at no draw and overlap no seed of Part A. C2c runs on T1 and on T2 in both implementations because C2o's bound covers both (F-DEC1). The prototype is `truncation.js` at
`4735488a`, unchanged (git blob `0414726d`); the oracle's generator and estimator are copied from Part A's `oracle.py` and checked against its text at run time. Oracle: Python 3.9.6, numpy 1.26.4, scipy 1.13.1 under `python -E` (98 s and
91 s); stream: Node 22.23.4 (29 s). The samples (about 250 MB) and the per-sample tables stay outside the repository, pinned by sha256 and regenerable by seed; every sample's covering flag is in the fixtures as a bitmap.

### 10.2 Results

9 rows: **7 pass, 0 fail, 2 reported.** Carried, unchanged: C2o fails; X1 to X4 NOT RUN.

| Leg | Measured | Bound | Status |
| --- | --- | --- | --- |
| F1 inputs (sha256 of the thresholds, the eight sample files and the eight tables; the stream samples the validator regenerates are byte for byte the files the oracle read; the prototype's blob; the oracle's functions verbatim) | all equal | exact | pass |
| F2 the follow-up's oracle reproduces Part A on Part A's numpy ensembles | 919 and 952 of 1000, refused 0 and 0, median associated set 58 and 37 | exact | pass |
| F3 the follow-up's validator reproduces Part A on Part A's stream ensembles | 951 and 949 of 1000, refused 0 and 0, median 58 and 37 | exact | pass |
| XF1 the prototype fed the oracle's 12,000 numpy samples, against the oracle | every sample agrees; mean and variance identical bit for bit in all 12,000; hits 919, 952, 4714, 4714 in both | exact | pass |
| XF2 the oracle fed the 12,000 Gravitas-stream samples, against the prototype | every sample agrees; identical bit for bit in all 12,000; hits 951, 949, 4721, 4694 in both | exact | pass |
| **C2c** the prototype, stream ensembles, 5000 replicates | T1 **0.9442** (4721), T2 **0.9388** (4694), none refused | each in [0.92, 0.98] | pass |
| **C2c** the oracle, numpy ensembles, 5000 replicates | T1 **0.9428** (4714), T2 **0.9428** (4714), none refused | each in [0.92, 0.98] | pass |
| G1 the difference between the two ensembles | at 5000: T1 +0.0014 (z 0.30), T2 -0.0040 (z -0.85); Part A's 1000: T1 +0.032 (z 2.90), T2 -0.003 (z -0.31) | none | reported |
| G2 all four ensembles of a scenario pooled (12,000 replicates) | T1 0.9421, Wilson 95 percent interval 0.9378 to 0.9461; T2 0.9424, 0.9381 to 0.9464 | none | reported |

No sample fell within 1e-9 of an interval edge, so no covering flag was exempted from the comparison.

### 10.3 What the follow-up supports

- **The two implementations are one function.** Fed the same 24,000 samples they return the same associated sets, the same mean and variance to the last bit and the same covering decision. Part A's 0.919 and 0.951 are therefore a property of the two sets of draws and not of the code: the prototype fed the oracle's Part A ensemble covers 919 of 1000, and the oracle fed the prototype's covers 951.
- **No lasting difference between the generators is seen.** At 5000 replicates the two ensembles differ by 0.0014 on T1 (z 0.30); a difference of Part A's size (0.032) would stand 6.9 standard errors out. The oracle's Part A ensemble of T1 is 3.1 standard errors below the pooled coverage; among eight ensembles that is unusual and this record does not explain it beyond chance.
- **The interval covers a little under its label.** Pooled, the coverage is 0.942 on both designs and the Wilson intervals stop at 0.946: the "95 percent" interval of the truncation estimator covers about 94 percent in these ensembles (N = 1000 with a median associated set of 58 at `from`; N = 300 with 37). That is inside the committed bound and it is not 95. Any later use must say "about 94 percent in the gate's ensembles", as section 3 requires for the independence check's 1.9 percent.
- **It is still synthetic.** Tiers (a) to (d) and the oracle only. X1 to X4 are NOT RUN on requests R1 to R4 of section 7, unchanged; nothing here is a statement about a real sample.

### 10.4 The outcome, and what it does not change

By the function committed in `followup-thresholds.json` (`verdict`): CM FOLLOW-UP PASSES (F1, F2, F3, XF1, XF2 and both C2c legs), Part A's record still shows KM PASSES and every other truncation leg passing, so the outcome is **A through C2c**: both
estimators pass their committed legs, the truncation estimator's coverage on the oracle's ensemble being carried by C2c in place of C2o. It is register row D-R10-262-07, DELEGATED: evidence and not permission until Carl ratifies it.

What does not change: `results.json` still records B, slice B-KM, by Part A's function; `failed-legs.json` still holds **C2o.cmCoverageOracle, failing, 0.919 against 0.92, the bound not moved**; no Part A fixture was edited (the record's test checks their
sha256). Part B is not begun. The 2026-11-07 ruling limits Part B to the censoring estimator; whether a ratified A widens it to both is question 1 below.

**Consumers condition: not met.** Clause (1) holds as it has since Part A (the censoring slice passes every leg). Clause (2) does not: the consumers rule is held, and 247's line tools and 251 Part A, which come first in the release order, have not been released
(`DECISIONS_2026-11-10.md` records none). No panel, lesson or viewer is built here.

### 10.5 Rights, data and size

Nothing was fetched, no downloaded code was run and no published number was typed from memory. **No size ceiling is raised**: the PR adds this section, four JSON fixtures under `tests/fixtures/censoring/` (about 60 KB, none shipped), tests in the record's suite
and register rows; nothing under `js/` changes. The follow-up's programs (`tools/censoring-oracle/oracle_c2c.py`, `tools/censoring-c2c-stream.mjs`, `tools/censoring-c2c-samples.mjs`, `tools/censoring-c2c-validate.mjs`) are on `spike/censoring-c2c`, never merged.
Labels: `invisible` and `documentation`.

### 10.6 Questions for Carl

1. Ratify the outcome A through C2c (D-R10-262-07)? If so, does Part B, when a consumer is released, build both estimators as the roadmap's A names, or stay with the censoring estimator as ruled on 2026-11-07? Recommendation: ratify, and both in one Part B after the release, the truncation interval stated as about 94 percent.
2. The authentic legs X1 to X4 are still NOT RUN. Agents may fetch public data since 2026-11-07; a data-legs follow-up on requests R1 to R4 (their bounds are already committed in `thresholds.json`) would be the next step before any sentence about a real sample. Recommendation: yes, as its own session; running ASURV stays unasked.
3. The consumers rule: unchanged here. The censoring estimator is third in the release order and has passed since Part A.

<!-- Listed in DOCUMENTS.md. -->
