# Dynamics reference gate (Prompt 237, Part B)

Phase 1 of this file is the contract. It was committed with `tests/fixtures/dynamics/thresholds.json` before any
module under `js/kernels/dynamics/` existed, before the independent reference code was written or run and before the
engine was run on any cluster of this prompt. The thresholds file is the authority; this page says why they are what
they are. Phase 2 (the measured table and the verdict) is appended after the runs and changes nothing above it.

## What is being decided

The roadmap's review says quantitative cluster evolution (mass segregation, evaporation, a satellite sinking by
dynamical friction) is shown only against independently validated reference runs, and that the engine's regression
distributions (Prompt 137) are regression bounds, not relaxation evidence. The question is whether the engine's own
precomputed runs, for a cluster of 128 bodies, track an independent code's runs of the same starting points within a
tolerance fixed in advance. A: they do, and the runs ship with the comparison. B: the reference is sound and the
engine does not track it, so the reference runs alone are shown. C: the reference itself is not validated, so no
quantitative claim is made.

## The problem statement both codes solve

A planar N-body problem (two coordinates; the 1/r^2 force law of the engine's plane). The force on body i from body j
is `G m_j (x_j - x_i) / max(r, e)^3` with the softening length e = 0.02 in Heggie units (G = 1, total mass 1, virial
radius 1, crossing time 2 sqrt(2)). This is the engine's inner force law (a floor on the separation; inside it the force
falls linearly), so the reference integrates the same equation and any difference is the integrator, the step or the
engine's housekeeping, not a different physics. The potential of a pair is `-G m_j / r` outside e and
`-G m_j (3 e^2 - r^2) / (2 e^3)` inside; it is what the energy of both sides is written in.

A planar reference is a decision, not a convenience: the engine is planar, a three-dimensional reference could not
be compared with it, and the roadmap's word "3-D" in section 8.3 is met by saying here that nothing about a 3-D
cluster is claimed.

## The two families

**S (segregation and evaporation).** 128 bodies with masses from a power law (dN/dm proportional to m^-2.35 on
[0.3, 10] in relative masses, total mass 1), a planar Plummer-like surface density, Gaussian velocities, scaled to
virial equilibrium (2K / |W| = 1, virial radius 1, with the softened potential). 16 seeds, run to 30 crossing times,
sampled every 3.

**D (a satellite falls in).** 128 equal-mass stars of the same kind plus one body of mass 0.1 at distance 2 on the
circular speed of the stars inside that radius. 16 seeds, run to 15 crossing times, sampled every 0.1.

Both sides integrate the same pinned starting points. The system is chaotic, so single runs diverge after a few
crossing times and the comparison is of ensemble means with their standard errors.

## What is measured, and the tolerance

The measurement is written once in `thresholds.json` ("definitions.measurement"), implemented in the oracle in Python
and in the validator in JavaScript, and checked to agree on pinned snapshots (R4). Lagrangian radii r10, r50, r90 and
the segregation index are those of the bound members about the centre of the bound set; the escaped mass fraction is
the mass not bound; family D's observable is the satellite's radius from the cluster's centre of mass, averaged over
two windows.

Tolerance, per sample time: the engine's ensemble mean and the reference's differ by at most a stated fraction of the
reference plus twice the combined standard error (the fraction: 0.10 for r50, 0.15 for r90 and the segregation index,
0.20 for r10, 0.03 absolute for the escaped fraction, 0.25 for the satellite's radius). A leg passes when it holds at
9 of the 10 sample times including the last. The fractions are not tuned; they say how far the engine may be from a
reference before a student is shown it as evidence.

## The reference's own validation (R1 to R6)

Energy conserved to 1e-5, linear momentum to 1e-9 and angular momentum to 1e-6 over every run; a softened two-body
orbit that closes to 1e-6; the measurement specification implemented twice and agreeing to 1e-9; the run reproducible;
the starting points having the properties stated. A reference that fails one of these is not a reference, and the
verdict is C whatever the engine did.

## The kernel's validation contract

A (closed forms): the time conversions, Spitzer's relaxation time, the Plummer virial factor 32/pi by numerical
integration, Chandrasekhar's friction function, the sinking time against an integrated orbit, the Coulomb logarithm and
the local relaxation time. O (an independent implementation of the kernel's relations: `tools/dynamics-oracle/oracle.py`).
B (a published table of relaxation times for named clusters, at 0.30 dex): needs a table only Carl can fetch, and is
NOT RUN until it is supplied. C (coverage of the virial mass interval on a seeded synthetic Plummer ensemble at 0.6827
and 0.95, and the median bias). D (refusals: fewer than 20 members, an unresolved dispersion, bad arrays, bad
arguments).

## What to fetch (for Carl)

1. For leg B1: the Milky Way globular cluster catalogue of Harris (1996, 2010 edition): for at least 10 named clusters
   the luminosity or mass, the half-light radius, the distance, and the catalogue's own log t_rc and log t_rh, with the
   mass-to-light ratio the catalogue states. Terms recorded. The validator's loader reads
   `tests/fixtures/dynamics/published-relaxation-times.json` (shape in DYNAMICS.md).
2. Optional: a run of the same cluster by a third-party code (REBOUND with IAS15, or NBODY6), to strengthen R1 to R6.
3. Verification of the coefficients of the cited relations (0.138; gamma 0.11 and 0.02; 300 for evaporation; the
   Plummer virial factor is derived here, not cited) against the sources named in `js/kernels/dynamics/constants.js`.
   They are written from the cited texts by the author; no agent fetched them.

## Verdict rule

C if any of R1 to R6 fails or is NOT RUN, or a gate observable cannot be measured. A if R1 to R6 pass and G1 to G7 all
pass. B if the reference is validated and any of G1 to G7 fails. A failed leg stays failing and labelled in
`failed-legs.json`; the alternative a result suggests is a question for Carl.

---

# Phase 2: the measured table and the verdict

Everything above was committed first (`f62bfca1`, with `thresholds.json`). The amendments AM1 to AM5 in that file
record every departure: AM1 (a Coulomb logarithm below 1 is refused), AM2 to AM4 (the reference's integrator, from DOP853,
which took about 110 s for one sampling interval, to a Hermite scheme with individual block steps in C, eta chosen from
the energy alone), AM5 (the oracle's rounded inputs). No bound of any leg changed.

## What was run

The reference: 16 runs of family S (128 bodies, 30 crossing times) and 16 of family D (129 bodies, 15 crossing times)
of `tools/dynamics-oracle/hermite.c`, from the pinned starting points, in `tests/fixtures/dynamics/reference-runs.json`.
The engine: the same starting points through `js/physics.js` with the default scheme (symplectic Euler), step 0.25,
softening floor 2 in engine units, in `tests/fixtures/dynamics/engine-runs.json` (a `gravitas.grid` document each, the
generate-graph node `dynamics-runs`; its check is the staleness of its inputs). The table is
`tests/fixtures/dynamics/results.json`; `npm run dynamics:validate` re-judges it.

## The table

See `DYNAMICS.md`, "Validation contract", for every leg. The gate's legs:

| Leg | Result |
|---|---|
| R1 energy | pass: worst 5.3e-7 of 1e-5 over 32 runs |
| R2 momentum | **FAIL**: linear momentum 8.2e-8 against 1e-9 (angular momentum 2.3e-7 against 1e-6 passes) |
| R3 two-body orbit, R4 measurement twice, R5 reproducibility, R6 starting points | pass |
| R7 against DOP853 (added by AM2, not in the verdict rule) | **FAIL**: 5.7e-4 against 1e-5 at half a crossing time |
| G1 r50, G2 r10, G3 r90, G4 segregation, G5 escaped fraction | each passes at 10 of 10 sample times |
| G6, G7 the satellite's radius, windows 5 to 10 and 10 to 15 crossing times | pass (engine 0.662 against 0.715, bound 0.456; engine 1.264 against 1.256, bound 0.712) |

## Verdict: C, by the committed rule

The rule says C when any of R1 to R6 fails, and R2 fails. The engine legs all pass, so the rule's A would have been the
verdict had R2 passed; the rule is not changed after the result. Consequences, as committed: the quantitative evolution
claim is omitted (no lesson shows an engine run as evidence of segregation, evaporation or dynamical friction, and none
shows these reference runs either, since a reference that is not validated is not shown); the analytic lesson stands
(crossing and relaxation times from a cluster's numbers, the virial mass with its refusals); Prompt 238's "A satellite
falls in" becomes a reading step. The engine's precomputed runs and the reference runs stay in the repository as
fixtures with their generators, labelled, shipped nowhere.

## What the numbers say that the verdict does not

1. **The gate has little power, and the engine runs hot in the radii.** Each leg's bound is a fraction of the reference
   plus twice the combined standard error, and with 16 runs of a chaotic system the standard error is large: the r50
   bound is 0.33 of the reference at the first sample and 0.38 at the last. Within it the engine's radii are above the
   reference at late times (r50 7.70 against 6.73, r10 4.51 against 3.32, r90 21.6 against 20.7 at 30 crossing times:
   14, 36 and 4 percent). That is not a failure of any committed leg; it is a bias nobody should call "tracks".
2. **Family S is a dissolving cluster, not an evaporating one.** The starting velocities are not a distribution-function
   equilibrium; by 30 crossing times both codes have lost 45 percent of the mass and the half-mass radius has grown
   sevenfold. The escaped fraction is the starting transient, as DYNAMICS.md says, and is not two-body evaporation. A
   gate on relaxation proper needs an equilibrium start.
3. **R2 is a property of the reference's scheme.** The block-step Hermite code pairs no force with its equal and
   opposite; its momentum drift (8e-8 in units where a typical body's momentum is about 1e-2) is far below anything the
   ensemble statistics see, and below the 1e-6 a reviewer might have chosen, but 1e-9 was written first.
4. **R7 does not measure the code's error.** DOP853 at rtol 1e-10 differs from DOP853 at 1e-13 by 5.0e-5 in position at
   half a crossing time, and the Hermite code at eta 1e-4 agrees with DOP853 at 1e-13 to 3.2e-6: both integrators are
   under-converged in position in a chaotic system at the settings first chosen. These diagnostics were run after the
   result and change no bound.
5. **The kernel's virial interval over-covers on an exact-Plummer ensemble** (C1 0.853, C2 0.997): the structure term
   of 0.15 is an assumption for other profiles. Without it the bootstrap covers 0.727 and 0.963, inside the committed
   ranges. C1 and C2 stay failing.
6. **B1 is NOT RUN**; the coefficients of the cited relations are unverified (DYNAMICS.md).

## Questions for Carl (nothing applied)

1. Keep R2 at 1e-9 (a verdict C) or restate it, for a new pinned reference, at a bound a non-symmetric scheme can meet
   (1e-6 would pass this run and give A)? A new reference run with a momentum-symmetric scheme would be a new gate under
   a new register row, judged on a bound written before it runs.
2. Should R7 enter the verdict rule? Written into the amendment but not into the rule; had it, the verdict is C anyway.
3. Judge the virial interval's structure term on a misspecified family (a King or Hernquist ensemble) instead of an
   exact-Plummer one, where it can only over-cover?
4. Replace family S's starting point with an equilibrium (a distribution function sampled in the plane) so that a
   later run measures relaxation, not violent relaxation?
5. Fetch the Harris table (leg B1) and verify the cited coefficients.

<!-- Listed in DOCUMENTS.md. -->
