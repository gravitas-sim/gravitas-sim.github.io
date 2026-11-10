# Resonances and secular dynamics II (Prompt 273)

Verdict **C** by the committed function: the existing guide stands, and Prompt 274 lists the depth as a reading step.
What landed is the kernel and its validation record, with no panel, guide, lesson depth or model-page section
(section 6). Nothing student-facing changed; no Spanish was written; labels invisible and documentation.

**Addendum (2026-11-10, sections 9 to 13): verdict B by its own committed function.** The first verdict is not
re-judged and stays C. All 21 gated addendum legs pass on their first run (a ripple-free estimator resolves the authentic
argument: 2070.5 d against the cited 2071 d; steps derived from an error budget meet every original bound), but the
check of the cited values against downloaded sources fails twice, which keeps A out of reach. B's named slice is the
argument displayed over the window without a fitted period or rate. No consumer is built in the addendum's PR.

## 1. What this document is

Part A of Prompt 273 is a gate: the test systems, the cited libration periods, the window (a committed multiple of the
period), the integrator's accumulated error over it, the resonant argument from elements, secular rates from a cited
first-order theory, and an independent reference, all committed before any kernel, oracle or run existed
(`tests/fixtures/resonances-ii/thresholds.json`, commit 7692a344). The kernel is `js/lab3d/libration.js`; the
validator is `tools/resonances-ii-validate.mjs`; the independent oracle is `tests/fixtures/resonances-ii/oracle.py`
(`python -E`, scipy DOP853, no Gravitas code); the pinned record is `results.json` and `oracle-results.json`;
`tests/resonancesII.test.js` recomputes the verdict from them.

## 2. The kernel (what is built)

`js/lab3d/libration.js` adds to `js/resonance/elements.js`: the equatorial frame of a primary from its pole
(`equatorialRotation`), mean longitude and longitude of periapsis from 3-D elements (`orbitalAngles`), the argument of a
p:q resonance as a series with the coefficients-sum-to-zero refusal (`resonantArgumentSeries`), `measureLibration`
(state, period, amplitude, centre, a period uncertainty, and `not-constrained` with no number when the window holds fewer
than three libration periods), `secularRate` (a least-squares apsidal rate with a half-window uncertainty,
`not-constrained` below three turns) and the first-order Laplace-Lagrange rate with its Laplace coefficient
(`secularRateFirstOrder`). No shipped page imports it, so it is excluded from the service-worker install
(`tools/build-service-worker.mjs`, as 272's kernel is); its first adopter deletes that entry. It lives in `js/lab3d/` because it takes element code from the 3-D kernel and the architecture check forbids a domain module (`js/resonance/`) from importing the feature layer.

## 3. The data (public, cite-only)

JPL Horizons JUP365 (Jacobson) vectors of Io, Europa and Ganymede about Jupiter, ecliptic J2000, 1 d from 2025-11-20,
10,314 rows each, retrieved 2026-11-08 by the request form the satellite pack of Prompt 193 records (and under the terms
that pack recorded on 2026-10-25). The raw files stay in `scratch-data/resonance273/raw/` with their sha256 (in the
thresholds); what is committed is the derived Laplace argument (`jup365-laplace-argument.json`, 8,285 daily values to
1e-5 deg). No published number was typed in this session: the cited periods and amplitudes (Laplace argument 2071 d,
0.064 deg; Pluto-Neptune 19,670 yr, 82 deg) are the ones already committed in `js/resonance/systems.js`, whose sources it
names (Murray and Dermott 1999; Malhotra and Williams 1997 and others); they were **not re-read from those sources
here**. No downloaded code was run.

## 4. The legs as committed (19; 9 pass, 8 fail, 1 reported, 1 not run)

| Leg | Result | What was measured |
|---|---|---|
| R1 argument arithmetic, 2,000 seeded sets | PASS | kernel equals oracle to 1e-9 deg; an unbalanced coefficient set is refused |
| R2 longitudes and argument from the 8,285 JUP365 states | PASS | kernel equals oracle to 1e-6 deg |
| R3 against the pinned series | PASS | within 2e-5 deg |
| L1 libration estimator on the JUP365 argument (authentic) | **FAIL** | `not-constrained`, reason drifting-center (see 5.1) |
| L2 point-mass N-body from JUP365 osculating states | PASS | libration, period 2049 d against 2071 d (-1.1%), amplitude 27.9 deg, no oblateness in the model |
| L3 Gravitas Laplace model, kernel against oracle | **FAIL** | kernel 2058 d against the oracle's 1940 d (see 5.2) |
| L3c same, against the cited 2071 d | PASS | 2058 d (-0.6%) |
| L4 integrator error over the 8,284 d window | **FAIL** | energy drift 2.0e-7 (bound 1e-8); argument 3.2 deg from the oracle's |
| P1 Pluto model, kernel against oracle | PASS | 21,293 yr against 21,229 yr (0.3%), amplitude 80.0 against 79.9 deg |
| P2 Pluto model against the cited values | PASS | +8.3% on the period, -2.5% on the amplitude, centre 179.2 deg |
| P3 integrator error over 78,680 yr | **FAIL** | energy drift 3.7e-8 (bound 1e-8); argument within 0.053 deg |
| S1 secular rate against first-order theory | **FAIL** | 0.0162 rad/yr against 5.75e-4 (see 5.3) |
| S2 secular rate against the oracle | **FAIL** | same cause |
| C1 coverage of the fitted period (10 members) | **FAIL** | 0 of 10 (see 5.2) |
| D1 windows of 0.5, 1, 2 periods | PASS | `not-constrained`, no period, no amplitude on all three |
| D2 detuned Europa | PASS | not a libration |
| D3 secular window of two turns | **FAIL** | the committed step advanced the apse by 57 spurious turns, so the window "measured" (see 5.3) |
| N1 authentic-data applicability | REPORTED | L1 is the only authentic leg |
| K1 Kozai-Lidov | NOT RUN | no independent reference of the exchange over a window this session; request in section 7 |

Verdict function (committed): A needs every leg of R, L, P, S, C and D; B needs R1-R3, L4, P3 and D1-D3 (the argument
over a window, the integrator's error bounded, a refusal on a short window); C otherwise. L4, P3 and D3 fail, so C.

## 5. What the failures were

**5.1 L1, the authentic leg.** The osculating Laplace argument of JUP365 carries short-period terms larger than the
0.064 deg libration it hides (the oracle's estimate with the committed 3.525 d smoothing: 318 d, 0.21 deg); the
kernel refuses it. This is the same kind of defect 271 recorded for E2 and E7. AM3 added L1s (1,000 d smoothing, the
amplitude corrected for the boxcar's gain): the oracle's estimator (corrected as in 5.2) gives 1976 d (-4.6%), 0.058 deg
(-9%), centre 180.005, a pass, but the kernel's classifier (`classifyAngle`'s repeatable-extrema rule) returns
`drifting-center`, so L1s fails in the kernel and stays failing. The real 0.064 deg libration is therefore not measured by
this kernel; tier (e) rests on L1 alone and does not pass.

**5.2 L3 and C1, an oracle defect.** The two integrations agree to 0.013 deg over the window (L4f), yet the periods
differ by 7%: the oracle's turning-point search had counted the series' first sample as a turning point. A diagnostic
run after the fact on the oracle's own series: the true turning points give 2076 d, a Fourier peak of the smoothed
argument 2071 d, a least-squares sinusoid 2068 d. The kernel was right. L3 and C1 stay failing against the original oracle
numbers (kept); AM5 corrected the oracle beside them (`*_c`), and against it L3g passes (2076.29 d on both sides) and
C1g covers 10 of 10 members at +-2 sigma.

**5.3 L4, P3, S1, S2, D3, the committed steps.** At the committed fixed steps (AM1: 1/45 d, 1 yr, 0.1 yr) yoshida4's
energy error is above the committed 1e-8 and, for the secular test, the step advances the apse by about 1 deg a year against
the theory's 0.033 (the error scales as h^4: 0.1 yr gives 22 deg in 25 yr, 0.025 yr gives 0.02 deg). Those legs stay
failing. AM4 and AM5 follow-ups with finer steps (180 steps a day; 80 per 20 yr; 250 and then 1,000 per 5 yr), each with
the original bound: L4f, P3f, D3f pass; S1f and S2f at 0.02 yr still fail (kernel 6.13e-4 rad/yr against the oracle's
5.87e-4); at h = 0.005 yr S1g passes (kernel 5.874e-4 rad/yr, theory 5.746e-4, +2.2%, the first-order theory's own limit
with e = 0.05 and a perturber of 0.005) and S2g passes (kernel against oracle 0.017%); D3g passes.

## 6. What was not built, and why

The panel (argument over time and a phase portrait) in the sandbox inspector and the 3-D lab, "When Orbits Lock"'s upper
depth, "The slow dance", "Kozai-Lidov, measured" and the model-page section are held. Verdict C removes the inference;
the consumers rule holds for every kernel gate; and the guides and the lesson depth would also change instructor
sources whose ciphertext is the queue's. The Kozai-Lidov timescale and exchange were not built (no leg could be
committed). The kernel's first-run follow-ups show it is usable at fine steps, which is the first thing a later part
would adopt; the verdict by the committed function is still C.

## 7. Requests and questions for Carl

1. Accept verdict C, or authorize a Part A addendum whose estimator removes the osculating ripple (mean elements, or a
   long-span smoother with a repeatability rule tuned on a synthetic truth) and re-tests L1 before any consumer.
2. Fix the integration step by a stated error budget (the kernel needs h about 1/180 d for the Laplace system) rather than
   a step the gate chose.
3. K1: an independent double-averaged secular integration, or a cited table of the Kozai-Lidov exchange, to commit a leg.
4. The cited libration values were not re-read from their sources; a person with the references should confirm them.

## 8. Reproduce

`node tools/resonances-ii-validate.mjs inputs`, then `python3 -E tests/fixtures/resonances-ii/oracle.py
tests/fixtures/resonances-ii <data dir> r1 jup laplace pluto secular ensemble` and the same with `c:` before each of
`jup laplace pluto ensemble`, then `node tools/resonances-ii-validate.mjs run --data <data dir>` (about 40 s; the oracle
about 25 min). The Horizons files are not in the repository.

## 9. The Part A addendum: what it is and what it may not do

Carl approved the recommendation of section 7 (questions 1, 2 and 4) as an addendum, not a new verdict on the old legs.
Its contract is `tests/fixtures/resonances-ii/addendum-thresholds.json`, committed alone and first (d1313eb9) before any
of its code existed. The rule: the 19 legs above and their follow-ups stay exactly as recorded (the 8 failed legs fail,
L1s, L3f, S1f and S2f fail, no bound moves, `results.json` and its history are not rewritten, the first verdict stays
C); every improvement is a new leg whose bound is fixed by a stated rule before any run (a leg that re-tests an original
carries that leg's bound unchanged; a budget is the original bound of the quantity it protects; coverage is 90% at
+-2 sigma; a false-positive rate is 1%). Three amendments were recorded before the runs they affect: AM6 (the oracle's
estimators), AM7 (after the oracle's first parts and the downloaded sources were read, before any kernel run: where
sources disagree the stricter reading holds), AM8 (after a smoke run showed the pilot read the energy at one orbital
phase only: it now reads every step). `tests/resonancesIIAddendum.test.js` recomputes the addendum verdict from the
pinned record and fails if the first record moves.

## 10. What was built

**A ripple-free estimator**, `measureLibrationHarmonic` in `js/lab3d/libration.js`. The model is
phi(t) = c0 + c1 (t - tm) + a cos w (t - tm) + b sin w (t - tm) on the unwrapped argument, fitted by weighted least
squares with Hann weights over the window; w minimises the weighted residual, scanned from half a cycle to 8 cycles per
window and refined by a golden-section search. Under the taper a term a few cycles per window away barely reaches the
line, so the ripple need not be removed first. It returns circulation on a net drift of 355 deg, and `not-constrained`
with no number when the minimising period is longer than a third of the window, when the amplitude is below 5 formal
sigma, when the centre drifts by more than twice the amplitude, or when the first and the last two thirds of the window
disagree (periods apart by more than 25%, or an amplitude outside half to twice the whole window's). The uncertainty is
a sandwich covariance scaled by a noise floor read from the residual's periodogram above the line (the median of 24
ordinates), in quadrature with half the difference of the two sub-window fits and the sampling floor. Limits: one line;
a libration completing more than 8 turns in the window is not looked for (the turning-point estimator is for that); a
term within two cycles per window of the line is not separated from it; the floor does not see slower terms.

**A step from an error budget**, `stepForBudget` in `js/lab3d/stepBudget.js` (new; excluded from the service-worker
install like the kernel, imported by no page). A pilot of 50 inner periods at 64, 128 and 256 steps a period measures
the energy error and, for each budgeted angle, the difference between the runs; a fourth-power scaling in the step and
a linear growth of an angle's error over the window give the prediction; the step is the largest one dividing the
sampling interval whose predictions are a tenth of each budget. A budget needing more than 4,096 steps a period is
refused. The budgets are the original bounds: energy 1e-8, the Laplace and Pluto arguments within 1 deg (below 5% of
their amplitudes), the particle's apse within 0.5% of four turns.

**An amended oracle**, `tests/fixtures/resonances-ii/oracle_addendum.py` (`python3 -E`, numpy and scipy, no Gravitas
code; `oracle.py` and its output are untouched). Its turning-point estimator drops a turning point at the first or last
sample (the defect of section 5.2); its harmonic estimator implements the same definition independently (a zero-padded
FFT peak, then `scipy.optimize.least_squares`), checked on 200 planted series of its own (leg O1).

## 11. The addendum legs (25: 21 pass, 2 fail, 1 reported, 1 not run)

| Leg | Result | What was measured |
|---|---|---|
| O1 oracle estimator on its own planted truth | PASS | worst period error 0.6%, worst amplitude error 0.033 deg of 1 |
| T1h kernel estimator, 400 planted series under ripple three times the line | PASS | none refused; worst period error 0.55%, amplitude 0.041 deg, centre 0.028 deg; the planted period inside +-2 sigma for 396 of 400 |
| T2h ripple and noise, no line, 100 series | PASS | 1 false libration (the bound is at most 1) |
| L1h the authentic JUP365 argument (inherits L1) | PASS | libration, 2070.5 +- 22.6 d against the cited 2071 d (0.02%), centre 180.00 deg, amplitude 0.0328 deg against the cited 0.064 (48.8% low, inside the inherited 50% by 1.2 points: see section 12) |
| L1o the same against the oracle | PASS | 2070.505 d and 0.032751 deg on both sides |
| L3h Laplace model against the oracle (inherits L3) | PASS | 2067.8 +- 1.1 d and 28.10 deg against 2067.9 d and 28.09 deg |
| L3ch against the cited 2071 d (inherits L3c) | PASS | -0.15% |
| C1h coverage, 10 members (inherits C1) | PASS | 10 of 10 |
| P1h Pluto model against the oracle (inherits P1) | PASS | 21,291 +- 21 yr and 79.32 deg on both sides |
| P2h against the cited values (inherits P2) | PASS | +8.2% on the period, -3.3% on the amplitude, centre 179.3 deg |
| D1h windows of 0.5, 1, 2 periods (inherits D1) | PASS | `not-constrained` (window-too-short), no number, on all three |
| D2h detuned Europa (inherits D2) | PASS | circulation |
| L3a turning-point estimator against the amended oracle (inherits L3) | PASS | 2076.3 d and 28.23 deg on both sides |
| C1a its coverage (inherits C1) | PASS | 10 of 10 |
| B0b the budget rule on a Kepler orbit | PASS | 1,383 steps a period; energy error 1.0e-10 (budget 1e-9), angle error 2.7e-4 deg (budget 0.01) over 500 periods |
| B2b an energy budget of 1e-20 | PASS | refused, no step |
| L4b Laplace model at the budget step (inherits L4) | PASS | h = 1/231 d (409 steps per Io period); energy drift 2.9e-10 (bound 1e-8); argument within 0.005 deg of the oracle's (bound 1.41 deg) |
| P3b Pluto model at the budget step (inherits P3) | PASS | h = 0.4 yr; energy drift 9.6e-10; argument within 0.0014 deg |
| S1b secular rate against first-order theory (inherits S1) | PASS | h = 5/777 yr; 5.876e-4 against 5.746e-4 rad/yr (+2.3%, the theory's own limit) |
| S2b against the oracle (inherits S2) | PASS | 0.047% (bound 0.5%) |
| D3b two turns (inherits D3) | PASS | refused, no rate |
| X1L the cited 2071 d and 0.064 deg against downloaded sources | **FAIL** | no source states the pair; one reports about 0.02 deg from an ephemeris (section 12) |
| X1P the cited 19,670 yr and 82 deg | **FAIL** | 82 deg and 180 deg confirmed; the period is stated as 19,900 yr and as about 20,000 yr, not 19,670 |
| N1h authentic-data applicability | REPORTED | L1h is the authentic leg, and it passes |
| K1 Kozai-Lidov | NOT RUN | no reference of the exchange was fetched; the request is in `addendum-sources.json` |

What the passes do not show. C1h's truth is the oracle's estimate by the same definition on its own integration, so it
tests the integration and the code, not the definition: on the Laplace model the three definitions differ by up to 9 d
(turning points 2076.3 d, FFT peak 2068.7 d, tapered line 2067.9 d), which the tapered line's 1.1 d sigma does not
cover. T2h sits at its bound. L1h's amplitude is inside its inherited bound by 1.2 points only.

Addendum verdict function (committed): A needs the standing legs R1 to R3, all 21 gated legs, and neither X leg failing;
B needs R1 to R3 with B0b, B2b, L4b, P3b, D1h, D2h and D3b; C otherwise. X1L and X1P fail, so **B**: the resonant
argument displayed over the window without a fitted period or rate.

## 12. What the source check found

Four e-prints were downloaded from arXiv on 2026-11-10 into `scratch-data/resonance273/sources/` (digests, references
and what each states are in `tests/fixtures/resonances-ii/addendum-sources.json`; arXiv's API terms and licence page
were read as served that day; the files are cite-only, read as text, never run, and not committed).

- **Laplace.** Paita, Celletti and Pucacco (arXiv:1807.02516) filter an ephemeris history of the argument and report a
  libration a little beyond 2,000 d with an amplitude of about 0.02 deg, which they say is lower than Lieske (1977) and
  Musotto et al. (2002) report. Peale and Lee (arXiv:astro-ph/0210589) give no number. This session's own measurement
  on JUP365 is 2070.5 d and 0.0328 deg by the kernel and by the oracle. So the cited period is supported, and the cited
  amplitude 0.064 deg is about twice what the current ephemeris shows. The cited value was not changed.
- **Pluto.** Yu and Tremaine (arXiv:astro-ph/9904424) state 82 deg about 180 deg with a period of 19,900 yr; Malhotra
  and Ito (arXiv:2204.04121) state 80 to 86 deg and about 20,000 yr. The cited 19,670 yr is 1.2% below the first and is
  stated by neither. The Gravitas model's 21,291 yr is a three-body model's, 8% above the cited value (P2h).

The primary sources (Lieske 1998; Musotto et al. 2002; Cohen and Hubbard 1965; Williams and Benson 1971; Murray and
Dermott 1999) were not obtained; the exact requests are in `addendum-sources.json`.

## 13. Consumers, and questions for Carl

The consumers condition is the prompt's own (Part B runs after A or B). Addendum B makes one consumer eligible: the
resonance panel's argument-over-time plot with no fitted period or rate. It is **not built here**: a panel in two
surfaces and two languages with its tests and budgets is not small (the deferred budget has about 100 B of room), so it
is the next session's. The fitted libration and secular readouts, the upper depth of "When Orbits Lock", "The slow
dance" and "Kozai-Lidov, measured" stay held: the first three until the addendum reaches A, the last until K1 runs.
The estimator and the step rule are imported by nothing shipped.

1. The cited Laplace amplitude: keep 0.064 deg with its named source, or cite the ephemeris value (0.033 deg, JUP365)
   beside it? Recommendation: keep the citation, add the measured value with its source, after a person reads Lieske
   (1998) for whether 0.064 is a half-range. Until then X1L fails and A is out of reach.
2. The cited Pluto period: 19,670 yr (Cohen and Hubbard, as `js/resonance/systems.js` names) or 19,900 yr (Yu and
   Tremaine)? Recommendation: confirm the first from its source; if it cannot be, cite the second.
3. Build the B slice (the argument plot, no fitted number) as the next session? Recommendation: yes.
4. K1: fetch the Horizons histories the request lists and commit a leg, or leave Kozai-Lidov at the existing guide?
   Recommendation: leave it until a consumer needs it.

Reproduce the addendum: `python3 -E tests/fixtures/resonances-ii/oracle_addendum.py tests/fixtures/resonances-ii
<data dir> selfcheck jup laplace pluto ensemble` (about 10 min), then `node tools/resonances-ii-addendum.mjs run --data
<data dir>` (about 45 s).
