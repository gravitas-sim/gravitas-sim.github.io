# TTV mass gate (Prompt 226, Part B)

Whether a transit-timing amplitude may be turned into a planet mass, and with what honesty about
the eccentricity. The thresholds are in `tests/fixtures/ttv-mass-gate/thresholds.json`, committed
before any prototype or ensemble system existed; the prototype is on `spike/ttv-mass-gate` and is
never merged; the measured table is `tests/fixtures/ttv-mass-gate/results.json`.

## The problem, stated before the measurement

To first order in the masses (Lithwick, Xie and Wu 2012) the inner planet's TTV amplitude is
proportional to the **outer** planet's mass over the star's, to the period, to 1 over the distance
from resonance Delta, and to `| -f - (3/2) conj(Z) / Delta |`, where `Z = f z + g z'` combines the two
planets' **free** eccentricity vectors. The amplitude alone therefore fixes the mass only together
with `|Z|`: a pair with a free eccentricity of 0.006 can give the same amplitude as a circular pair
of a different mass. Two things follow, both committed first: for a declared bound `Zmax` on `|Z|`
the mass lies in an interval whose upper edge is infinite once `1.5 Zmax / |Delta| >= |f|` (and `|g|`
for the inner planet's mass, which is small, so that interval is usually unbounded); and a mass
read off with `Z = 0` is right only for a pair whose free eccentricity is small against Delta.

## What was committed, and what it tests

- **Ensemble.** Engine-made (Velocity Verlet, the Part A forward model), P1 = 10, 2:1, Delta
  uniform 0.02 to 0.06, both mass ratios log-uniform 1e-5 to 1e-4, 3.2 super-periods, transit times
  with 0.0008 d noise. `E_prior` (60): free eccentricities inside the declared prior (e 0 to 0.006,
  so `|Z| < Zmax = 0.01`); `E_circular` (60): circular start; `E_beyond` (30): e 0.02 to 0.04, outside
  the prior, reported and never gating.
- **The interval.** The amplitude's 2-sigma from the fit's covariance, widened by the formula's own
  Part A accuracy (15 percent inner, 25 percent outer), through the degeneracy for `Zmax`.
- **Legs.** G1 and G2: coverage at least 0.9 for the outer and inner planet's mass among the systems
  whose interval is bounded. G3: the median upper-to-lower ratio at most 4. G4: every system whose
  `1.5 Zmax / |Delta|` reaches `|f|` (`|g|`) is reported "not constrained above" and none is bounded.
  G5: the circular bound (`Z = 0`, same widening) covers on `E_circular`. G6 and G7 are reported.
- **Verdict.** A if G1 to G4 pass; B if A fails and G5 passes; C otherwise.

## Results

| Leg | Result | Bound |
| --- | --- | --- |
| G1 outer mass, interval coverage, E_prior | 1.000 (60 of 60 bounded) | 0.9, pass |
| G2 inner mass, E_prior | 1.000 (36 bounded of 60) | 0.9, pass |
| G3 median upper/lower, outer mass, E_prior | **4.186** | 4, **fail** |
| G4 refusal | 70 of 150 systems have an unbounded interval for at least one planet, none wrongly bounded | all, pass |
| G5 circular bound on E_circular | 1.000 (60) | 0.9, pass |
| G6 circular bound on E_prior (reported) | 0.917 | 0.9 line, not gating |
| G7 interval on E_beyond (reported) | 0.700 (30 systems, outside the prior) | not gating |

**Verdict B.** The degeneracy interval is honest (it covers) but a median factor of 4.2 between its
edges is wider than the committed informativeness bound, so A fails on G3 alone and the A scope is
not authorized. The circular bound passes. G6 says the circular assumption survives the eccentricity
the prior allows (0.917), and G7 says an interval is only as honest as its prior: with the true
eccentricity above the declared one, 30 percent of the intervals miss.

## What B permits, and what it does not

- Built: a mass from a TTV amplitude **only under the stated assumption that the pair is circular**
  (`Z = 0`), labeled as an assumption in the result and on the screen, with the measurement and the
  formula's accuracy in its edges, and the domain in which the assumption was tested (free
  eccentricity small against Delta; two planets; outside the resonance width).
- Not built: the degeneracy interval as a bound for a student, a mass without the label, an
  eccentricity from an amplitude.
- The upper depth teaches the degeneracy by showing how far the amplitude moves for the same masses
  when the eccentricity changes, which is a forward statement, not a bound.

## Not claimed

Three or more planets, a third body, light-travel time, TTVs inside the resonance width, a mass from
a real system (Part A's leg E1 was not run: no published times were supplied).
