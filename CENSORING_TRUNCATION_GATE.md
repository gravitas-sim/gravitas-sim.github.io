# The censoring and truncation gate

Roadmap III, Prompt 262, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, register row D-R10-254-01 and `DECISIONS_2026-11-06.md`; the hard prerequisites 154, 233 and 254 are merged or recorded on `v3`).
Censoring (an object is in the sample with only an upper limit) and truncation (an object is absent and nothing records how many) are different problems with different estimators: a product-limit estimator for left-censored
values with a log-rank check of independence, the Lynden-Bell product-limit estimator for a lower-truncated sample, and V/Vmax with an effective volume. Their definitions, domains, the independent oracle, the coverage ensembles and
the verdict function were committed before any code, then measured on a spike. **Verdict by the committed function: B, slice B-KM** (the censoring estimator and its independence check). The truncation estimator fails one leg and
stays failing (section 4): **C2o**, the oracle's own implementation on its own ensemble, covers 0.919 against a committed lower bound of 0.92; every other leg of the truncation estimator passes, including the prototype's own
coverage legs (0.951 and 0.949). V/Vmax with an effective volume is admitted. Nothing is built, the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, and **Part B is not begun**. The record is decision-register rows
D-R10-262-01 to D-R10-262-05.

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
