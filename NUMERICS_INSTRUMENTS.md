# The numerics instruments

The approved follow-up to Roadmap III, Prompt 270: the measuring tools the five numerical-methods investigations need, each a kernel under rule 7.5.8, landed before any investigation. Labels `invisible` and `documentation`. Nothing a student sees changes: no lesson, guide, panel, page, Library entry, card or instructor file is added, no shipped module imports the kernel, and the directory is never precached.

**Outcome.** Five instruments in `js/kernels/numerics/`, validated against an independent Python oracle with the bounds committed first. By the committed verdict function the gate is **B: two instruments pass (I3, the ensemble divergence rate; I5, the held-out interpolation error)**. Three legs failed in the first run (I1.i, I2.b, I4.a) and stay failing. Amendment AM2 then committed successor legs before they ran: with them I2 (step history) and I4 (Fourier periodogram) pass every leg, and I1 (the energy ledger) still fails one (I1.ds). Which reading a lesson may rely on is Carl's ruling (section 7); the investigations themselves are the second PR and are not started.

## 1. The approved sequence, and where each item was approved

| Item | Where approved |
| --- | --- |
| Two PRs: the instruments first, one at a time under 7.5.8 (thresholds, oracle, refusals), the lessons second; lessons wait for passed instruments (consumers rule) | `DECISIONS_2026-11-07.md`, 270 rulings, item 2; proposed in `NUMERICAL_INVESTIGATIONS.md` section 5 item 2 and register row D-R10-270-03 |
| The order of the instruments: (1) the reference explicit Euler and the two-step ledger, (2) the `dopri5` step-history adapter, (3) the divergence-rate estimate on A8b's settings with its window, (4) the small-series DFT against the existing family, (5) the interpolation error through `interp.js` | `NUMERICAL_INVESTIGATIONS.md` section 5 item 2 (the record's own order) |
| A8b is the only ensemble statement a chaos lesson may make; A8 stays failing and uncited; the Euler investigation stays separate from the compute-page `integrators-in-practice` | 270 rulings, item 3 |
| For the lessons PR only: one closure file with a cap below 308 and a line ceiling of its own, as delegated ceilings | 270 rulings, item 2; the coordinator's handoff of 2026-11-08, "Next, in order", item 3 |
| No compute links (Prompt 268 verdict C, Prompt 269 not run) | `DECISIONS_2026-11-07.md`, 268 rulings, item 1 |

This PR is the first of the two. It uses no closure file and asks for no ceiling.

## 2. The five instruments

Units: I1 and I2 use the 3-D kernel's units with G = 1 (total mass 1 and semi-major axis 1 in the validated cases, so the period is 2 pi). I3's engine pairs use the engine's units with the application's G = 2 and the step pinned at 0.05 s, never the frame rate. I4 and I5 work in the units of the data handed in.

| | Module | What it reports | What it refuses |
| --- | --- | --- | --- |
| I1 | `ledger.js` | For a fixed-step scheme (`explicit-euler` and `symplectic-euler`, labelled references in no engine table; `velocity-verlet` and `rk4`, the 3-D kernel's): the relative energy error (E_k - E_0) / abs(E_0) at the end and at its largest, the separation at start and end, and for a step h against h / 2 the two ratios and the orders log2 of them | fewer than 8 steps; an orbit the scheme has unbound; a finer run at the rounding floor (1e-13); a non-finite energy; the end-of-run order of an error that oscillates (withheld, reason `end-phase`) |
| I2 | `stepHistory.js` | The 3-D kernel's Dormand-Prince 5(4), unchanged, read through its `onStep`: accepted and rejected steps, force evaluations, each step's time, size and separation, the shortest and longest step the controller chose, the slope of ln h on ln r, and the cost of the kernel's fixed-step RK4 at the same final error (N a power of two, so the cost is good to a factor of two) | a step shorter than 1e-12 of the span (`step-collapse`, with where it stopped); 200,000 steps (`step-budget`) |
| I3 | `divergenceRate.js`, `threeBodyPair.js` | Many pairs of runs through `js/chaos/divergence.js` (unchanged: its window, fit and refusals): the count of each behaviour, the median rate, bounds that are the 5th and 95th percentile of the pairs' rates, the median window and R^2. The pair builder runs A8b's trial twice, the second with one star moved by 1e-8 of the triangle's radius | fewer than 10 pairs; fewer than 10 or fewer than half of the pairs exponential (`not-exponential`, naming what the others did) |
| I4 | `dft.js` | The classical periodogram P(f) = 2 (C^2 + S^2) / (N sum (y - mean)^2) with C and S the cosine and sine sums; the peak (parabola through three grid points), its amplitude, the resolution 1 / T, the full width at half power, the second peak | fewer than 8 points; a constant series; a second peak at least 0.9 of the first (`alias`: both frequencies, no period) |
| I5 | `interpError.js` | Each interior point removed in turn; the straight line and the natural cubic spline of `js/numeric/interp.js` evaluated there; both errors per point, their RMS and maximum, and which is closer | fewer than 5 points; with a `limit`, a table on which neither method meets it (`too-coarse`, no recommendation) |

Assumptions and limits a consumer must carry. I1: Newtonian point masses, no softening; the kind of an error (accumulating or oscillating) is read from the first half of the span against the whole, so the span must hold two periods or more, and that rule is the instrument's failing part (section 4). I2: the first step (the caller's guess) and the last (cut to the span) are flagged and left out of the extremes and the slope. I3: the bounds are the spread of finite-window rates over the pairs, not a confidence interval and not the error of a Lyapunov exponent. I4: no weights, no floating mean, no false-alarm probability; the resolution is a property of the sampling, not an uncertainty. I5: the error is that of a table one point coarser at the held-out place, so it overstates the full table's error between its points. I1, I2, I4 and I5 report no uncertainty.

No outside text is cited from memory. The authorities are in the tree: `js/lab3d/kernel.js` and `VALIDATED_3D_LAB_GATE.md` (forces, schemes, Dormand-Prince), `js/chaos/divergence.js` (the window rule), `NUMERICS.md` (interpolation), `js/measure/periodogram.js` (the family's search and its references), `EXPERIMENT_ENSEMBLES.md` (A8b).

## 3. How it was judged

`tests/fixtures/numerics-instruments/thresholds.json` was committed alone (a50d24d8) before any instrument, oracle or validator existed. AM1 (definitions the contract left open, no bound moved) was committed with the instruments and the oracle before anything ran (43801485); that commit re-serialised the file, keys and values unchanged. The first run is pinned in `first-run-results.json` (7d5ec0fa). AM2 (5047b56e) was committed after the first run and before any change or new run: it moves no bound, leaves the three failed legs failing, and commits the successor legs (suffix `s`) with their bounds. The oracle is `tools/numerics-instruments-oracle/oracle.py` under `/usr/bin/python3 -E` (Python 3.9.6, numpy 1.26.4, scipy 1.13.1): its own integrators, Dormand-Prince tableau and control, window rule, sums and interpolation, and no Gravitas code. Data both sides read (the engine's separations, the seeded series, the decimated TESS series, the MIST slice) is in `inputs.json`.

An interim run between AM2 and the pinned AM2 run used a validator that did not yet judge the new legs; nothing from it was pinned. It showed the same thing the pinned run shows, that RK4 is classed `oscillating` under the new rule.

Contract 7.5.8: (a) analytic cases and (b) the oracle are in the table below; (c) ensemble coverage applies to I3 alone, the one instrument that states bounds (I3.c); (d) refusals are per instrument; (e) authentic data is I4.f (TESS eta Aquilae, sector 81, the bundled pack) and I5.c (the bundled MIST v1.2 SDSS isochrones). I1 and I2 integrate a model problem and I3 measures the application's own simulation, so no real dataset applies to them and none is claimed.

## 4. Results

38 committed bounded legs: 35 pass, 3 fail. 11 successor legs (AM2): 10 pass, 1 fail. 3 reported legs.

| Leg | What | Measured | Bound | Result |
| --- | --- | --- | --- | --- |
| I1.a | one explicit Euler step against the closed form 2 + h^2 - 2 / sqrt(1 + h^2) | difference 7.4e-17 | 1e-12 | pass |
| I1.b / bs | explicit Euler, order from halving the step | 0.99937 | within 0.02 of 1 | pass / pass |
| I1.c / cs | velocity Verlet, e = 0.5, order of the largest error | 2.0029; largest error 2.69e-3 and 6.71e-4 | within 0.1 of 2 | pass / pass |
| I1.d | RK4, e = 0.5, end-of-run order (first rule) | 4.9978, `secular` | 3.5 to 5.5, `secular` | pass |
| **I1.ds** | the same under AM2's rule | classed `oscillating` (whole over first half: 1.58 at h, 1.34 at h / 2), order withheld | as I1.d | **FAIL, left failing** |
| I1.e / es | symplectic Euler, order of the largest error | 1.064 | within 0.1 of 1 | pass / pass |
| I1.f / fs | explicit Euler, 1000 steps per orbit, 3 orbits | energy error +0.164 and +0.096; separation grows by 1.205 and 1.112 | both positive, both above 1 | pass / pass |
| I1.g / gs | every number of b to f against the oracle | equal to the last bit (independent code, the same IEEE operations) | 1e-9 absolute, 1e-6 relative | pass / pass |
| I1.h1 to h3 | rounding floor; unbound (at step 1); too few steps and four bad arguments | refused as stated | | pass |
| **I1.i** | velocity Verlet stopped at 2 P and at 2.25 P: the end-of-run order withheld at both | at 2.25 P classed `secular`, order 2.003 given | `oscillating` at both | **FAIL, left failing** |
| I1.is | the same under AM2's rule | `oscillating` at both, order withheld | as I1.i | pass |
| I2.a | e = 0.9, one period, tol 1e-9: back at the start | 5.0e-7 | 1e-4 | pass |
| **I2.b** | the longest step within 0.1 P of apoapsis | 0.164 P; the shortest step was the last, cut to the span | 0.1 P | **FAIL, left failing** |
| I2.bs | the longest step where the separation is at least 0.9 of its largest, the shortest within twice its smallest (written after the first run, weaker evidence, labelled so) | 0.929 and 1.002; longest over shortest 113 | 0.9, 2, 10 | pass |
| I2.c / cs | slope of ln h on ln r | 1.558 / 1.550 | 1.2 to 1.9 | pass / pass |
| I2.d / ds | the oracle's own Dormand-Prince | 189 accepted and 0 rejected on both sides; steps to 5e-8, slope to 2e-10, positions to 6e-13 | 2 steps, 1e-3, 0.01, 1e-7 | pass / pass |
| I2.e | scipy DOP853 at 1e-13 | positions to 3.8e-07 | 1e-5 | pass |
| I2.f | cost at equal error | 1135 evaluations against 65,536 (16,384 RK4 steps); error 3.75e-7, the oracle's 3.75e-7 | equal N, 1 percent | pass |
| I2.g | two bodies released at rest | refused `step-collapse` at t = 1.11072073430, 2.4e-10 before the collision | 1e-3 | pass |
| I3.a | 12 exact exponentials, rate 0.7 | median, lo, hi within 1e-15 | 1e-9 | pass |
| I3.b | 24 noisy pairs against the oracle | every behaviour and window equal; rates to 3e-15 | 1e-9 | pass |
| I3.c | coverage: 200 seeded ensembles of 20 pairs, true rate 1 | the bounds hold 1 in 200 of 200 | at least 0.90 | pass |
| I3.d1, d2 | linear, constant, identical, nine pairs, six of twenty | refused as stated | | pass |
| I3.e0 | run A is A8b's trial (seeds 1000 to 1002) | energy drift equal to the last bit | 1e-12 | pass |
| I3.e, e1 | the engine's 50 pairs against the oracle; the separation from positions | equal in kind, behaviours and windows; rates to 3e-15; separation exact | 1e-9; 1e-12 | pass |
| **I4.a** | on-bin sinusoid: power 1, amplitude 2, other bins 0, refined peak at 0.125 | power and amplitude to 9e-16, other bins 2e-30, peak 0.125205 | peak 1e-9 | **FAIL, left failing** |
| I4.as | the same with the peak judged at 0.1 of the resolution and the grid maximum exact | grid maximum 0.125; 0.013 of the resolution | 0.1 | pass |
| I4.b | numpy `rfft` at the 31 Fourier frequencies | to 1.1e-15 | 1e-12 | pass |
| I4.c | full width at half power, N = 256 | 0.88594 / (N dt) | 0.8859 within 2 percent | pass |
| I4.d | uneven seeded series against the oracle's sums | power to 2e-15, peak to 4e-16 | 1e-9 | pass |
| I4.e | the family (generalized Lomb-Scargle) on the same series | 0.0037 of 1 / T apart | 0.1 | pass |
| I4.f | TESS eta Aquilae, 78 points over 26.6 d | 7.503 d against the family's 7.464 d (0.018 of 1 / T) | 0.1 | pass |
| I4.g, h | alias (0.3 and 0.7 equally tall); too few, constant, three bad arguments | refused as stated | | pass |
| I5.a | a line (both exact); x^2 (the linear error is the spacing squared) | 1.8e-15; exact | 1e-12 | pass |
| I5.b | numpy and scipy on sin, Runge and exp tables | every error to 2e-15 | 1e-10 | pass |
| I5.c | the MIST slice against the oracle | every error to 2e-15 mag | 1e-10 mag | pass |
| I5.d | too coarse, too few, three bad arguments | refused as stated | | pass |

The three first-run failures, by cause. **I1.i** is a defect of the instrument: it read the kind of an error from where the run stopped, the phase it exists to withhold. AM2's rule (the largest error over the whole span against the first half, threshold 1.5) repairs that case and breaks another: RK4's error on this orbit grows in jumps at each periapsis and the finer run's ratio is 1.34, so it is called oscillating and its order withheld (**I1.ds**). The ledger's numbers are right (I1.a, I1.g); its classification is not validated. **I2.b** was a bound drawn too tight, and it exposed that the reported shortest step was the cut final step; version 2 leaves the first and last step out. **I4.a** was a wrong bound: between Fourier frequencies the mirror term at -f displaces the parabola's vertex, which the oracle's own refinement reproduces.

## 5. What the reported legs say (no bound; what a lesson would have to say)

- **Chaos on A8b's settings (I3.r).** Seeds 1000 to 1049, 1000 steps of 0.05 s, the validation lab's settings: 26 of 50 pairs separate exponentially and 24 are `insufficient` under the window rule. Over the 26 the median rate is 0.126 per simulated second (an e-folding time of 7.9 s), bounds 0.121 to 0.148, median window 4.5 to 33.75 s; the largest growth of a pair over the 50 s is 1.6e8. Two cautions belong beside it: the bounds are the spread of the pairs, and run A's relative energy drift is of order one for some seeds (0.95 and 2.5 for seeds 1000 and 1001, 0.0038 for 1002), so the rate describes these integrations as A8b validated them and is not shown to be a property of the continuous system.
- **Adaptive steps (I2.r).** 189 accepted steps, none rejected, 1135 force evaluations; scipy's RK45 at the same tolerances takes 154 steps with its own controller.
- **Interpolating the models (I5.r).** Along mass on the log age 9.3 isochrone (21 phase-0 points) the line is closer: RMS 0.050 mag against the spline's 0.364 mag. Along log age at 0.6, 0.8 and 1.0 solar masses (7 ages each) the spline is closer: 0.00045, 0.0012 and 0.0045 mag against 0.0015, 0.0029 and 0.0071 mag. The prediction "which is closer" is a real one and goes both ways on one table. (Prompt 268's N07.b measured a Lagrange cubic on four ages, a different method.)
- **Euler (I1.f).** At 1000 steps per orbit the order read from three orbits is 0.77, not 1: the drift (16 percent) is past the range where halving the step halves it. A lesson's step-halving activity needs a short span or a small step, as I1.b has.

## 6. Held and remaining

Held under the consumers rule: every lesson, guide, panel, Library entry, card, adoption page and course change; the "Computational astrophysics" sequence (`ADVANCED_CLOSEOUT.md`: it waits for the investigations); any import of `js/kernels/numerics/` by a shipped module. Nothing here links, lists or builds on the compute page.

Remaining, in order:

1. Carl's ruling on section 7.
2. I1: a new version in which the kind is not inferred (item 2 of section 7), its legs committed first; the Euler investigation waits for it.
3. An engine-table leg, if the upper depth of "How wrong is Euler?" is to read the sandbox engine's own integrators through a realm and not the kernel's: bounds first.
4. The lessons PR: the five investigations, bilingual (Spanish unreviewed by a fluent reader), instructor content in one new closure file (cap below 308, pre-approved), the queue's ciphertext rebuild, Library entries and the sequence. Only instruments that pass are used.

## 7. Recommendations for Carl (register rows D-R10-270-04 to -06)

1. Accept AM2's successor legs for I2 and I4, as the 271 ruling accepted E2s, E4s and E7s: the original legs stay failing and labelled, and the lessons PR may use I2, I3, I4 and I5.
2. I1: do not repair the classifier a third time. Whether a scheme's energy error is bounded is a property of the scheme (symplectic or not), known before a run; declare it per scheme, withhold the end-of-run order for the symplectic ones by declaration, and commit the new legs first. A small follow-up before the lessons PR.
3. The chaos investigation states the A8b result in the form of section 5 with both cautions, and no statement outside A8b's settings.

## 8. Reproducing

`npm run numerics:instruments:validate` (Node 22; needs `/usr/bin/python3` with numpy and scipy) runs the instruments, the engine child, the oracle and the judgement and rewrites `inputs.json`, `oracle-results.json`, `results.json` and `failed-legs.json`; `first-run-results.json` is never rewritten. `node tools/numerics-instruments-validate.mjs --pinned` judges against the pinned files without Python or the engine, which is what `tests/numericsInstruments.test.js` does.

<!-- Listed in DOCUMENTS.md. -->
