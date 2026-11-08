# Resonances and secular dynamics II (Prompt 273)

Verdict **C** by the committed function: the existing guide stands, and Prompt 274 lists the depth as a reading step.
What landed is the kernel and its validation record, with no panel, guide, lesson depth or model-page section
(section 6). Nothing student-facing changed; no Spanish was written; labels invisible and documentation.

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
