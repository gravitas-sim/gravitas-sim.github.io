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
