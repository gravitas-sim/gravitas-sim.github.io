# Posterior-sampling gate

**Status: decided under delegation, not reviewed.** Carl asked for each gate to be
decided on its recommendation. This verdict is evidence, not a signed decision;
the register rows are DELEGATED, "pending Carl's ratification", until he reviews
them.

**Verdict: C.** The inference core does not gain a posterior sampler. Posterior
sampling is not offered anywhere in Gravitas today; it is left to the compute
page (Prompts 101 and 102), which has not landed and which this gate neither
depends on nor decides. Prompt 104 (the accepted sampler) is skipped.

**Base:** `v2` at `2029cf72`. **Thresholds:**
[`spike/sampler/THRESHOLDS.md`][thr], committed at `0a592aac` before any
prototype existed (a later commit, `fd96807d`, corrected one sentence about
Prompts 101 and 102 and changed no threshold). **Prototype and evidence:**
branch `spike/sampler`, in [`spike/sampler/`][spike]; it is disposable and will
not merge. This PR is the decision record and the register rows only.

[thr]: https://github.com/gravitas-sim/gravitas-sim.github.io/blob/0a592aac/spike/sampler/THRESHOLDS.md
[spike]: https://github.com/gravitas-sim/gravitas-sim.github.io/tree/bbd91041fe2bca57da929539f8eff96d048d31de/spike/sampler

## Why C, in one paragraph

The prototype is accurate. In 39 of the 40 replicates (10 on each of the four
problems) the draws met every accuracy tolerance. What fails the fixed thresholds is the run, not the answer:
at the stated run lengths the sampler's own diagnostics (its 50-autocorrelation-
time rule) refuse most runs, so the sampler reports an interval in only 3 of 10
Gaussian replicates, 0 of 10 banana, 0 of 10 prior-conjugate and 1 of 10
transit; and the transit problem costs 0.62 ms per likelihood evaluation, which
puts the stated 2,000-step run at 589 s on the low-end profile against a 120 s
ceiling. Running three times longer would fix the diagnostics for two problems,
break the memory ceiling for one, and make the transit problem take about 17
minutes on the low-end profile. No threshold was moved. Section "What would
change this" says what would.

## The thresholds, and what was measured

All replicates are seeded and reproducible (`spike/sampler/run-gate.mjs`).
"Pass" is the threshold's own definition: 9 of 10 replicates, and the median.

| Criterion (THRESHOLDS.md section) | Threshold | Measured | Result |
|---|---|---|---|
| 1. Accuracy, G (6-D correlated Gaussian) | 9 of 10 replicates | 3 of 10 (7 refused; the 10 sets of draws all within tolerance) | **fail** |
| 1. Accuracy, B (banana) | 9 of 10 | 0 of 10 (10 refused; draws within tolerance in 9) | **fail** |
| 1. Accuracy, P (normal priors, conjugate truth) | 9 of 10 | 0 of 10 (10 refused; draws within tolerance in 10) | **fail** |
| 1. Accuracy, T (two-parameter transit vs grid) | 9 of 10 | 1 of 10 (9 refused; draws within tolerance in 10) | **fail** |
| 1. Pinned emcee reference | valid reference; sampler within tolerance | emcee within 0.065 sd of the truth on all four, 84 to 475 tau; the sampler's first replicate within 0.15 sd (0.20 for B) of it on all four | pass |
| 2. Posterior vs profile width, k, hd209458 | ratio in 0.75 to 1.25 in 9 of 10 | 1 of 10 reported (refused); from the draws regardless, where measured (replicate 10 and two longer runs): 0.96 to 1.00 | **fail** (by refusal) |
| 3. Diagnostics carried (R-hat two ways, ESS, tau, acceptance, traces, tables) | present | present (`diagnostics.js`, `panel.js`) | pass |
| 3. Refusal, 100-step runs of B | 10 of 10 refused | 10 of 10 | pass |
| 3. Refusal, bimodal target | 10 of 10 refused | 10 of 10 | pass |
| 3. False refusals in 30 passing-length runs (G, B, T) | at most 3 | 26 of 30 | **fail** |
| 4. Time, low-end (4x throttled main thread), median of 3 | G 10 s, B 10 s, P 5 s, T 120 s | G 0.83 s, B 0.26 s, P 1.09 s, **T 589 s** | G, B, P pass; **T fail** |
| 4. Responsiveness | progress at most 250 ms, cancel at most 100 ms | G, B, P: progress gap 32 to 132 ms, cancel 6 ms. T: 92 ms in the Worker, 302 ms as the page saw it once | pass for G, B, P; T moot (fails on time) |
| 4. Memory | retained chain at most 32 MiB, heap growth at most 96 MiB | G 27.5 MiB retained, 27.5 MiB heap growth; B, P, T smaller | pass |
| 5. Bytes | core at most 5.0 KB gzip; with words and panel at most 9.0 KB | 2.9 KB; 4.7 KB; reachable only by a dynamic import from the fit panel's chunk | pass |
| 6. The explanation | at most 110 words, mean sentence at most 22 words, four claims, both languages | 106 words, 21.2 per sentence, four claims, both languages | pass |

Verdict rules: A needs every criterion; B needs the universal criteria
(sections 3 to 6) and G, P and T to pass; C is everything else. Sections 1 and
3 fail, so the verdict is C.

## What was built

An affine-invariant ensemble sampler (the Goodman and Weare stretch move, a = 2,
in the parallel half-update form), four independent ensembles of 8 d walkers,
over the core's own likelihood: `createProblem(...).evaluate(theta).chi2`, with
the baseline f0 solved exactly at every step, plus priors declared per
parameter (uniform on the bounds, or normal). It runs in a Worker task with
progress and cancel. Diagnostics are split R-hat (over the ensemble means and
over the walkers), the integrated autocorrelation time (Sokal's window), the
effective sample size and the acceptance fraction; a run that fails any of them
returns the diagnostics and the trace and no mean, interval or quantile. A trace
panel draws each parameter's traces as SVG and gives the same numbers in a table.

The two-parameter transit is HD 209458 b as TESS sees it (the core's validation
case), k and b free, the other parameters fixed at truth, uniform priors on the
model's bounds. Its reference is a 301 x 301 grid posterior over the same
likelihood (the box doubled until the edge mass is below 1e-4; measured 2e-15),
and an emcee 3.1.6 chain on the grid interpolated by a bicubic spline. The
reference chains are pinned in `spike/sampler/reference/` with these SHA-256
values:

| File | SHA-256 |
|---|---|
| `G.emcee.json` | `465e0ad10247c20a4a32e4f1eac320f1c2c7aa3e5aa90d5417239320fd68ebfb` |
| `B.emcee.json` | `68dcd3672850c02a313103b0c943237318b49857846777a0d2eb0249e945a14d` |
| `P.emcee.json` | `cb01af1ba7b2123f23e78a9dfba06a50b0aee5dfb967b759d52ef8d8350bbf93` |
| `T-hd209458-1.emcee.json` | `bda9a71481ef2ec5a160354bff4e44ad9da1aded8be687ec5db4000c1dbba4f0` |

## Findings beyond the verdict

- **The fixed run lengths are shorter than the sampler needs.** The tau of the
  ensemble-mean trace is 47 to 104 steps for G, 114 to 276 for B, 20 to 34 for P
  and 20 to 33 for T. emcee's own tau on the same problems (64 walkers) is 67,
  178, 32 and 32, so the prototype is not worse than the reference. The 50-tau
  rule applied to the second half of a 6,000-step run (3,000 steps) needs
  tau under 60; that is the rule that refuses.
- **A run three times as long** (informational, not a gate result): G 10 of 10,
  P 10 of 10, B 6 of 10, T 2 of 2 replicates run. That G run keeps 82.4 MiB, over
  the 32 MiB ceiling, and a transit run takes 249 s on this machine
  unthrottled, about 17 minutes on the low-end profile.
- **The cost is the likelihood.** The transit model costs 0.62 ms per
  evaluation here (a 32-node quadrature at 5 sub-exposures for every in-transit
  point); a run is 128,000 evaluations. The sampler cannot reduce that; only a
  cheaper model or fewer walkers can, and fewer walkers lengthen tau.
- **In two parameters the profile and the posterior agree.** With a/R* held fixed
  the ratio of the posterior's central 68% width to the profile interval is 0.93
  to 1.01 for k and b on the Neptune and the grazing transit as well as on
  HD 209458. The disagreement the explanation text promises (degenerate, bounded,
  not Gaussian) was not exercised by this gate's two-parameter scope; it would
  show with a/R* free, which this gate did not run.
- **Diagnostics did their job.** Every short run and every bimodal run was
  refused; no refused run reported an interval.
- **Timing was taken on an Intel Core i5-10500 (3.1 GHz) with Chromium 151**,
  at a load average of 2.6 to 4.7 (the transit runs shared the machine with one
  other measurement). CDP throttling does not reach a Worker, so the throttled
  figures are the same module on the page's main thread. One processor is not a
  distribution (SCIENTIFIC_KERNEL_GATE.md found 2x between processors); the
  transit figure is 4.9x over its ceiling, well beyond that spread.

## The pedagogical case for each audience

- **Introductory students.** None. They meet one fitted value with an error bar
  and the idea of a range of acceptable values; the profile interval already
  teaches that, and a sampler's diagnostics (R-hat, effective sample size) would
  be new vocabulary with no matching concept.
- **Majors in a statistics or data-analysis course.** Real. A posterior, a prior
  the student can change, a corner plot and the difference between a credible
  and a confidence interval are what such a course teaches. The explanation
  paragraph was written for this reader and meets its length and claim limits.
- **Upper-level and graduate students.** The strongest case, and the compute
  page's: they can run emcee on the manifest's likelihood themselves. A
  documented hand-off (the manifest declares the model, the data and the
  priors) is cheaper than shipping a sampler.

## What would change this

- C to B for the transit family: a likelihood about five to ten times cheaper
  per evaluation (the validated 32-node quadrature is already coarse), or
  Carl accepting a time ceiling of about 10 minutes on the low-end profile, and
  a run length chosen so the 50-tau rule passes (about three times the stated
  length for G and P; B needs more).
- C to A needs, in addition, the banana and Gaussian problems to pass at a run
  length that also keeps the memory ceiling, which the prototype does not do at
  3x for G (82 MiB): a thinned or float32 chain.
- A first-class case for the compute page (Prompt 101) to carry sampling instead:
  the same prototype, run outside the application's budgets.

## Not done

- No Keplerian orbit problem was run (not in the thresholds).
- a/R* free (the degenerate case for the profile and posterior comparison) was not
  run.
- No outside reader checked the explanation (D-PLAN-02).
- The transit comparison used one processor and one browser.

## Reproducing

`node spike/sampler/run-gate.mjs G|B|P|refusal|T [n] [case]`,
`node spike/sampler/compare-reference.mjs`, `node spike/sampler/bench.mjs G,B,P,T 3`,
`node spike/sampler/check-words.mjs`, and `python3 spike/sampler/reference.py`
(emcee 3.1.6, numpy 1.26.4), on the spike branch. Set `STEPS_FACTOR=3` for the longer
informational runs. The outputs are in `spike/sampler/results/`.
