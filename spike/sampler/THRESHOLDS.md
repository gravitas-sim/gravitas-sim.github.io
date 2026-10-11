# Posterior-sampling gate: thresholds (Prompt 103)

**Fixed and committed before any prototype code exists.** Nothing in this file
moves after a measurement. A criterion the prototype fails stays failed, and a
verdict that cannot be reached by these rules is **C**. The measurements and
the verdict are in `SAMPLER_GATE.md`; the prototype is on the spike branch.

## The question

Should the inference core gain a bounded posterior sampler (an affine-invariant
ensemble sampler, Goodman and Weare 2010, over the core's model and likelihood
interface, at most six parameters), or does posterior sampling belong on the
compute page alone? The compute page (Prompts 101 and 102) has not landed: Carl has recorded the
compute-origin decision, so they will run, but this gate proceeds without them
and depends on neither. A C verdict means posterior sampling is not offered in
the core, and is left to the compute page once it exists.
(Corrected in a later commit: the first text of this paragraph said those prompts
were skipped. No threshold below changed.)

## The prototype under test

- The stretch move, a = 2, with M = 4 independent ensembles of W walkers
  each, W = 8 d (d is the number of fitted parameters), seeded with the
  repository's mulberry32. Each ensemble starts over-dispersed (a ball of
  radius 3 nominal scales around its own center, clipped to the prior).
- The first half of every ensemble's chain is discarded as burn-in; every
  statistic below uses the second half of all four ensembles.
- The likelihood is the core's own: `createProblem(model, data, parameters,
  settings).evaluate(theta).chi2`, with the linear parameters (the baseline
  f0) solved exactly at every step, so the target is the profile likelihood
  in those parameters. Priors are declared per parameter in the model
  manifest: uniform on the bounds by default, or normal.
- It runs in a Worker through the experiment scheduler, like the fit.

## Problems and truth

| Id | Problem | d | Truth |
|---|---|---|---|
| G | Correlated Gaussian: sds (1, 2, 0.5, 3, 1, 0.2), correlation 0.9^abs(i-j), means (0, 1, -2, 5, 0.3, 10) | 6 | analytic |
| B | Twisted Gaussian (Haario banana): density proportional to exp(-x1^2/200 - (x2 + 0.03 x1^2 - 3)^2/2) | 2 | x1 ~ N(0, 10^2); x2 = 0.03 (100 - x1^2) + N(0, 1); sd(x2) = sqrt(19) |
| P | The table model `poly-1` fitted to 12 seeded points with a normal prior on each coefficient | 2 | analytic (conjugate normal posterior) |
| T | Two-parameter transit: HD 209458 b as TESS sees it (`tools/inference-cases.mjs` case `hd209458`), k and b fitted, t0, P, a/R*, q1, q2 fixed at truth, f0 linear, uniform priors on the model's bounds | 2 | a 301 x 301 grid posterior over k and b on the same likelihood (box: best fit +- 8 sigma, clipped to the bounds; doubled until the posterior mass on the box edge is below 1e-4), checked against emcee |

T is also run, reported and never judged, on the `shallow` case (a Neptune)
and on a grazing case (b = 0.95), where the profile and the posterior are
expected to disagree.

**Replicates:** 10 per problem. G, B and P: sampler seeds 1 to 10. T: sampler
seed and noise seed both 1 to 10, each with its own grid reference. A problem
**passes** when at least 9 of the 10 replicates meet every one of its criteria
and the median replicate does. A replicate the sampler refuses (see
Diagnostics) fails its accuracy criteria.

## 1. Accuracy (per parameter, pooled post-burn-in draws of one replicate)

For G, P and T (truth sd is the posterior sd):
- the mean is within 0.10 sd of the truth;
- the sd is within 10% of the truth (ratio in 0.90 to 1.10);
- the 16th, 50th and 84th percentiles are each within 0.15 sd of the truth's;
- G only: every correlation coefficient is within 0.10 of the truth's.

For B:
- the means are within 0.10 sd of the truth;
- the sds are within 15% (ratio in 0.85 to 1.15);
- the 16th, 50th and 84th percentiles of x1 and x2 are each within 0.20 sd of
  the exact marginal's;
- the least-squares slope of x2 on x1^2 is in [-0.036, -0.024] (exact: -0.03).

For T, the same percentile criterion is also applied against the pinned emcee
chain (below). The emcee reference is itself checked against the grid at
0.10 sd; if it fails that, it is reported as an invalid reference and the
emcee comparison is not counted for or against the sampler.

**Reference chains.** emcee 3.1.6, 64 walkers, the stretch move, 20,000
steps, the first 5,000 discarded, fixed seeds, on the same problems (G, B
analytic in Python; T and P through the likelihood tabulated by the JavaScript
core on the grid above and interpolated bicubically). The chains are stored
thinned to 4,000 draws per problem, with the SHA-256 of each file in
`SAMPLER_GATE.md`. emcee's own integrated autocorrelation time must satisfy
steps > 50 tau for the reference to count.

## 2. Relation to the profile interval

On T (`hd209458`), with the core's `fitOnce` and `profileTask` on the same
data and the same fixed parameters: the posterior's central 68% interval for
k has a width in [0.75, 1.25] times the profile Delta chi-square = 1
interval's width, in at least 9 of 10 replicates. For b the ratio is
reported. On the `shallow` and grazing cases the ratios are reported, with the
difference explained; no threshold.

## 3. Diagnostics and refusal

Every result must carry, per parameter: split R-hat, effective sample size
(ESS), integrated autocorrelation time tau, the acceptance fraction, a trace
(at most 200 points per ensemble, thinned) and a table of those numbers that
reproduces the trace plot's data (a chart exposes its data).

- **R-hat** is the split Gelman-Rubin statistic over the 8 half-sequences of
  the 4 ensembles' walker-mean traces, and separately over the half-sequences
  of every walker. Both must be below 1.05 for every parameter.
- **tau** is the integrated autocorrelation time of the walker-mean trace
  (Sokal's automatic window, c = 5); **ESS** = (post-burn-in steps x W x M) / tau.
  Both ESS >= 400 and post-burn-in steps >= 50 tau are required.
- The acceptance fraction must be in [0.10, 0.90].
- If any of these fails, the result states which and **reports no interval,
  mean or quantile**; it still returns the diagnostics and the trace.

Refusal is itself tested:
- 10 deliberately short runs of B (100 steps per ensemble) must be refused in
  every one;
- 10 runs of a bimodal target (two unit Gaussians 12 apart in one of two
  parameters, two ensembles started in each mode) must be refused in every
  one;
- across the 30 passing-length runs of G, B and T above, at most 3 may be
  refused (a false refusal rate of at most 10%).

## 4. Time and memory

The low-end profile is Chromium with DevTools CPU throttling at 4x
(SCIENTIFIC_KERNEL_GATE.md). That throttling does not reach a dedicated
Worker, so the sampler's own time is measured in a throttled page's main
thread (the same module, `performance.now()`), and the Worker run is
measured too and reported. Each is the median of 3 runs after a warm-up, with
the load average recorded; a run taken at a load over 24 is repeated.

| Problem | Run length (steps per ensemble) | Time ceiling, low-end |
|---|---|---|
| G | 6,000 | 10 s |
| B | 8,000 | 10 s |
| P | 2,000 | 5 s |
| T | 2,000 | 120 s |

- **Responsiveness:** the Worker posts progress at least every 250 ms and
  stops within 100 ms of a cancel message, on the low-end profile.
- **Memory:** the retained chain, in typed arrays, at most 32 MiB; the
  Chromium JS heap's growth over the run at most 96 MiB.

## 5. Bytes

- The sampler (the move, the diagnostics, the Worker task, the manifest's
  priors), minified and gzipped as the build produces them, at most 5.0 KB;
  with its Spanish and English words and the trace panel, at most 9.0 KB.
- It is reachable only by a dynamic import from the fit panel's chunk, so the
  `observatory` route's rows in `tools/route-budgets.json` (sources and
  build, KB and requests) are measured unchanged by `npm run budget:routes`.
  A KB ceiling raised for it would be a measured, standing-approval raise and
  is reported; a request ceiling raised for it fails this criterion.

## 6. The explanation

The panel states, in one paragraph in English and the same in Spanish, of at
most 110 words and with a mean sentence length of at most 22 words, that:
(a) the profile interval is what the least-squares fit and the Delta
chi-square = 1 rule give, with no prior; (b) the sampler's interval is a
credible interval that depends on the prior stated in the manifest;
(c) they answer different questions, differ when the fit is degenerate,
bounded or not Gaussian, and the sampler does not replace the profile
interval; (d) the sampler's result is withheld when its checks fail. A
test holds each of (a) to (d) by keyword set and the length limits. No
outside reader is available (D-PLAN-02), so no reading-level claim is made
beyond these measurements.

## Verdict rules

- **A (ship in the core):** every criterion in sections 1 to 6 passes on G, B,
  P and T. Validation of the Keplerian orbit model would still be a task of
  Prompt 104 before the sampler is offered for it.
- **B (ship for one named model family only):** every criterion in sections 3
  to 6 passes, and G, P and T pass section 1, section 2 and section 4, but B
  fails. The family named is `transit-quadratic` and nothing else.
- **C (compute page only, which today means not offered):** anything else,
  including a failed refusal test, a failed byte criterion, or a criterion
  that could not be measured.

A B verdict never authorizes the A scope. C skips Prompt 104.
