# Numerical-methods investigations in the application: the record

Roadmap III, Prompt 270 (tranche T6, authorized by Checkpoint VI's recorded outcome CONTINUE AS PLANNED, register row D-R10-267-01, merged as #568). Documentation only; labels `invisible` and `documentation`; nothing a student sees changes, no lesson, panel, kernel, ceiling or instructor file is touched.

**Outcome: a record, not the five investigations.** Five bilingual investigations with instructor content cannot be added under the terms this session works under: every investigation carries its instructor material in a source file the instructor bundle reads, so five of them need a new closure file (or five lessons pushed into an unrelated existing one), the closure has no file to spare and the session may add none, and the ciphertext that has to follow is the merge queue's. Four of the five also need an instrument that does not exist and, on this roadmap's rule 7.5.8, a kernel with its validation contract before a student reads a number from it. Section 4 gives each blocker with its measurement, section 5 what the build costs once the blocker is lifted, section 6 the design of the five (the 8.4 sheet), so that a later session starts from it and not from the roadmap's one paragraph. Spanish: none was written, and any Spanish a later build adds stays unreviewed by a fluent reader (Carl, 2026-11-07).

## 1. Authorization, prerequisites and the state of the base

| Check | Result |
| --- | --- |
| Base and target | `origin/v3` ce883b95 (Merge #570); `INTEGRATION.md` names `v3` as the staging branch for every Roadmap III change; the PR targets it |
| Aggregate CI on the base | the tip's own push run (42443995615) was queued when this was read; its parent 0bf4dfdf (run 42439176741) and the two before it are success, and ce883b95 adds #570, a documentation-only merge |
| Tranche | T6 authorized by D-R10-267-01 (CONTINUE AS PLANNED, #568); the operating terms (a) to (j) of that row bind, in particular (d) the closure, (h) the consumers rule and (j) Spanish |
| Hard prerequisites (Appendix C: 152, 265, 267) | all landed: 152 as #392 (c8e791e9, `NUMERICS.md`, D-R10-28), 265 as #565 (D-R10-265-01 to -05), 267 as #568 |
| Optional enrichment | 269 was not run: Prompt 268's verdict is C (D-R10-268-02, -04), so 270 ships without compute links; nothing here links the compute page |
| Existing result | none: no `feat/numerical-investigations` branch or pull request on `origin`, no investigation file for any of the five in `js/data/investigations/` (a test says so); the three nearest lessons are in section 3 |
| Gate verdicts read as binding | 265: A8 fails and stays failing, A8b (the validation lab's settings) passes (D-R10-265-02); 268: C; 262 B, 261 and 263 failed legs and 264 B bear on no deliverable here |

## 2. What the roadmap asks

Five investigations, bilingual, with materials and depths: "How wrong is Euler?", "Adaptive steps", "Chaos, measured", "A periodogram from scratch" and "Interpolating the models"; instructor materials in both languages, Library entries, adoption pages, cards, scene catalog and the regenerated artifacts; no typed count; no step that requires the compute page; lesson validators, headless grading, e2e walks in both locales, axe, budgets, `generate --check`, the link test and the full suite.

## 3. What the tree has (the delta table, 7.5.9)

| Investigation | Existing authority | Missing behaviour | Adopter |
| --- | --- | --- | --- |
| How wrong is Euler? | `integrators-in-practice` runs the four integrators in a reviewed Python notebook on the compute page (its subtitle says so) and has the step-halving and "against the application" steps; the sandbox engine's integrator table is `INTEGRATORS` in `js/engine/state.js` (Symplectic Euler, the default, Velocity Verlet and RK4) with the energy ledger; the 3-D lab kernel offers `leapfrog`, `yoshida4`, `yoshida4c` and `rk4` (`SCHEMES`) | no explicit (non-symplectic) Euler, the method whose orbit drifts outward, runs in the application anywhere; the order from halving the step is a notebook activity today; no in-app panel runs a scheme at two steps and reads the drift | the new investigation, on the engine's table plus, if the survey depth keeps its outward-drifting orbit, a labelled reference explicit Euler |
| Adaptive steps | `dopri5` in `js/lab3d/kernel.js` (Dormand-Prince 5(4), deterministic, `onStep` per step, accepted and rejected counts); `js/mission/verify.js` uses it as the check | the sandbox engine has no adaptive step, so "exported from the engine" can only mean this kernel; no page reads `onStep` into a step history, and no eccentric-orbit case with its error against a fixed-step run has been measured here | the new investigation, through a lab-kernel adapter |
| Chaos, measured | `butterfly-effect` (49 KB) and `js/chaos/divergence.js`, which fits only a bounded window, refuses a separation that is not exponential and reports a time only when it passes; 265's ensemble kind for the three-body system (lazy, in `NEVER_PRECACHED`, imported by no shipped module, a test says so) | no panel creates an ensemble; 265's A8 fails (the scenario's own settings do not reproduce the regression group's median and 90th percentile to 1e-9) and A8b passes, which is the stated replacement for any lesson statement (D-R10-267-01 (2)); a Lyapunov exponent as a bounded estimate has no consumer | the new investigation, on A8b's lab settings only |
| A periodogram from scratch | `two-periodograms` is the companion of a compute-page notebook; the application's `js/measure/periodogram.js` (`searchPeriod`, `searchBox`) and the variable-star kernel's generalised Lomb-Scargle | a discrete Fourier transform written for a small series in a page, with the existing family's result as its check; no panel; D-KERNEL-06 keeps period searches out of Workers | the new investigation, a small series only |
| Interpolating the models | 152's `js/numeric/interp.js` (`locate`, `linear`, `cubicSpline`, validated by 152's group), which no page imports yet (its three-file `NEVER_PRECACHED` entry stays until a first page adopter deletes it, a test says so); `js/stellar/tracks.js` interpolates the bundled MIST tracks | an isochrone's value between grid points and the error that interpolation makes against a held-out grid point, through `interp.js`, in a panel | the new investigation, which would be `interp.js`'s first page adopter |

Prompt 268 measured two of these as a CPython notebook proxy (not the application; not the pinned runtime), and both bear on the design: for the chaos pair exported from the engine the committed window rule gave R^2 = 0.5575 and both the notebook and the independent oracle refused a rate (N03), and for the isochrone table the cubic through four ages was slightly worse than the linear through two, 0.0084 against 0.0070 mag (N07.b, a failing leg that stays failing). Neither is a result about `interp.js` or the engine's divergence module; they say what an honest investigation must be ready to show.

## 4. Why it is not built

1. **Instructor closure.** `tests/instructorDigest.test.js` holds the closure under 307 files and it is at 306. Every earlier investigation sequence added exactly one file for its lessons, their Spanish, guides and deeper steps (`gaia-sequence.js` for the last two). Checkpoint VI's term (d) allows one new file per sequence with "the cap raise asked for"; this session's terms say no closure file may be added, so five investigations have nowhere to live. They cannot be folded into an existing file: `gaia-sequence.js` has a line ceiling in `tools/module-size-ceilings.json` (2,478), and a module line ceiling is not among the ceilings the standing approval of 2026-10-10 covers (route and bundle budgets).
2. **The ciphertext.** New investigations and their guides change what the instructor bundle reads; `instructors/materials.enc.json` and its manifest follow only from the queue's rebuild, and nothing under `instructors/` is edited here. The same reason held 265's lesson work (D-R10-265-03).
3. **Four instruments and one adopter.** Missing: an explicit Euler (the engine's default is the symplectic one) and a drift ledger over two steps; a step-history adapter for `dopri5`; an ensemble panel (and a decision on A8 versus A8b for the sentence a student reads); a discrete Fourier transform panel; an interpolation-error panel on `interp.js`. Each is a kernel or a model in 7.5.8's sense: analytic cases, an independent oracle with a committed tolerance, misspecified and refused cases, thresholds committed before any output is inspected. That is a gate's worth of work per instrument and is not folded into a content prompt.
4. **Size, stated so that it is not mistaken for the blocker.** Measured here on Node 22.23.4 after `node build.js`: deferred JavaScript 3,165,287 B against the ceiling of 3091.2 KB (3,165,388.8 B), room about 100 B; first-visit precache 5,324,306 of 5,365,197 B (40,891 B of room; new lessons are `NEVER_PRECACHED` and cost none of it); idle 1,610,715 of 1,610,724 B; packs 355,265 of 355,282 B raw and 111,422 of 111,422 B gzipped. A raise of the deferred ceiling for this work is inside the standing approval (exactly the measured overrun rounded up to 0.1 KB, a DELEGATED row citing it, listed in the report), so no raise is requested beyond it. For scale, Prompt 216's five instrument-free investigations measured 45.0 KB of deferred growth (D-R10-216-04), so five here with four new instruments would be at least that; the figure is a floor taken from a comparable prompt and is a forecast, not a measurement of this work.
5. **Nothing is lost by waiting.** `integrators-in-practice`, `butterfly-effect` and `two-periodograms` are unchanged and keep working; the consumers rule holds every kernel without a landed, passed gate from a lesson; 265 is not offered to a student.

## 5. What a build needs, and the order

1. Carl's grant of **one closure file** (cap below 307 to below 308, one file `numerics-sequence.js` holding five lessons, their Spanish, guides and deeper steps, with a line ceiling of its own under a register row), and the queue's ciphertext rebuild afterwards. Alternatively Carl may decide to ship fewer than five, or to extend an existing lesson's depths, which also edits a closure source.
2. **Two PRs, not one.** First an invisible kernel PR, one instrument at a time under 7.5.8 (an independent oracle run with `python3 -E` and no Gravitas code; thresholds committed first; amendments before runs; failing legs left failing and labelled): the reference explicit Euler and the two-step ledger, the `dopri5` step-history adapter, the divergence-rate estimate on A8b's settings with its window, the small-series DFT against the existing family, the interpolation error through `interp.js`. Then the content PR, instructional, on the train, after the closure grant.
3. Size by the standing approval: the exact overrun, the deferred raise moving `capCumulativeKb` in `tools/budget-policy.json` with it, a DELEGATED row, listed in the next report.
4. The compute page is not linked (268, C). A step never requires it.

## 6. The design (the 8.4 sheet, for the build; nothing here ships)

| Investigation | Levels | Objective and what the student writes first | Misconception | Measurement and its limit | Competing, withheld or misspecified case |
| --- | --- | --- | --- | --- | --- |
| How wrong is Euler? | survey, majors, upper | survey: say why an orbit under Euler spirals out; majors and upper: the order from the error at two steps; the prediction (does halving the step halve or quarter the drift?) is recorded before any curve | "a smaller step makes any method conserve energy" | the drift per orbit at two steps and the ratio, with the rounding floor stated; upper: symplectic against not on the engine's table (Velocity Verlet against RK4), the bounded oscillation of the symplectic ones | a symplectic method's end-of-run drift is a poor number to quote (the phase of the oscillation), shown by two end times |
| Adaptive steps | majors, upper | the step history of one eccentric orbit: where the steps are short and why; prediction of where before the history is drawn | "the step is small because the orbit is fast, so a fixed small step does the same" | accepted and rejected counts, the step against the separation, the cost against a fixed step of equal error | a close pair where the step collapses: the method refuses to continue and says so |
| Chaos, measured | survey, upper | survey: two near copies come apart; upper: the rate from a window with the window stated | "any growing separation is chaos" | a rate with the window and its R^2; the refusal when the separation is linear in time (a two-body phase offset) | the engine's own pair, which the window rule refused in the notebook proxy; A8b's settings only; no ensemble statement from A8 |
| A periodogram from scratch | survey, majors | the Fourier idea on a short series: a sum of a sine and a cosine at each trial frequency; prediction of where the peak will be | "the tallest peak is the period" | the frequency of the peak and the width the series length allows; the existing family's answer as the check | a series sampled so that an alias is as tall (the careful schedule is the one that fails) |
| Interpolating the models | majors, upper | an isochrone value between two grid points: the straight line and the spline, against a point left out; prediction of which is closer | "a higher-order curve is always more accurate" | the error at held-out points in magnitudes, both methods, with the table's own spacing | a table too coarse for either, and the proxy's N07.b (the cubic worse than the line on four ages) as the reason the prediction is a real one |

Every investigation would also carry the reflection, the generated key and rubric criteria (172) and, at the upper depth, the limits of the inference. None of it is written here, and no number in this table is a result.

## 7. Decisions and what was not done

1. The outcome is a record (D-R10-270-01), with the base and prerequisite checks and the blockers measured (D-R10-270-02), and the requests and questions below (D-R10-270-03).
2. No data was downloaded and no code from a download was run; no published number was typed from memory; no oracle was run, because there is no kernel.
3. No ceiling is raised; no `.github`, `instructors/`, bundle or lesson file is touched; no merge, release, deploy, tag or DOI.

## 8. Questions for Carl

1. Grant one new closure file (cap below 308) for a five-lesson numerics sequence, with the ciphertext rebuild after the PR, or choose a smaller set or a different home?
2. Take the build as two PRs, instruments under 7.5.8 first and the lessons second?
3. For the chaos investigation, is A8b's lab-settings leg the only ensemble statement a lesson may make, with A8 left failing and not cited?
4. Should the investigation "How wrong is Euler?" stay separate from the compute-page `integrators-in-practice`, which 268 left unchanged?

## 9. Reproducing the measurements

`node build.js`, then `node tools/bundle-budget.mjs` and `node tools/data-budget.mjs` on Node 22; the closure is `sourcePathsFor` in `tools/instructor-freshness.mjs`; `tests/numericalInvestigationsRecord.test.js` holds the structural facts of sections 1, 3 and 4 against the tree.

## 10. The follow-up (2026-11-10)

Carl's rulings on section 8 (`DECISIONS_2026-11-07.md`): the record is accepted; the build is two PRs, instruments first; A8b is the only ensemble statement; the Euler investigation stays separate. The first PR is `NUMERICS_INSTRUMENTS.md`: the five instruments of section 5 item 2 as kernels in `js/kernels/numerics/`, imported by nothing shipped, with their verdict. Sections 1 to 9 above are the record as written on 2026-11-07 and are not edited; the investigations are still not built.
