# Physics validation

This document answers one question: **what has this model actually been checked
against?**

Not "we are confident the physics is right". A list of quantities, the values
Gravitas produces for them, the values they should have, where those values came
from, and the numerical tolerance each comparison is held to — with a written
reason for every tolerance.

```bash
npm run validate:physics
```

That is <!--fact:physicsChecks-->218<!--/fact--> checks, about 15 seconds, and a
PASS/FAIL table with measured error against stated tolerance. Add `--verbose` to print the rationale for each tolerance,
`--json` for machine-readable output, or `--group "Conservation"` to run one
section. Exit status is 0 only if everything passes, so it works in CI unchanged.

The same checks run as part of `npm test`
([`tests/physicsValidation.test.js`](tests/physicsValidation.test.js)), so a
physics regression fails a pull request rather than waiting for someone to
remember to print the table.

Everything lives in [`tools/physics-checks.mjs`](tools/physics-checks.mjs). There
is one copy of every expected value; the command-line table and the jest suite
are two front ends onto it.

---

## Coverage

| Area | Checks | Kinds |
| --- | --- | --- |
| Unit system | 6 | 6 analytic |
| Circular two-body orbit | 6 | 6 integrated |
| Eccentric Kepler orbit | 5 | 5 integrated |
| Conservation laws | 6 | 6 integrated |
| Numerical integrators | 12 | 1 analytic, 11 integrated |
| Reference frames | 6 | 5 analytic, 1 integrated |
| Binary stars | 5 | 2 analytic, 2 integrated, 1 published |
| Escape and binding | 11 | 5 analytic, 2 integrated, 4 published |
| Observer geometry | 5 | 5 analytic |
| Transit geometry | 6 | 6 analytic |
| Radial velocity | 7 | 5 analytic, 2 published |
| Astrometry | 5 | 3 analytic, 1 integrated, 1 published |
| Habitable zone | 19 | 12 analytic, 6 published, 1 approximation |
| Dark matter and rotation curves | 18 | 17 analytic, 1 integrated |
| Compact objects | 12 | 8 analytic, 4 published |
| Mergers | 3 | 2 integrated, 1 approximation |
| Absorption by a black hole | 10 | 4 integrated, 6 approximation |
| Tidal disruption | 5 | 5 integrated |
| Gravitational-wave inspiral | 4 | 4 approximation |
| Stored parameters for real systems | 11 | 11 published |
| **Total** | **162** | 75 analytic, 46 integrated, 29 published, 12 approximation |

Nothing here reads a pixel. Every check is a deterministic number-in,
number-out computation, so a failure names a quantity rather than a screenshot.

---

## How to read a tolerance

A tolerance without a justification is a number chosen to make a test pass. Each
check therefore carries a written reason, which `--verbose` prints and which a
failure message includes. There are four kinds of check and they are not
interchangeable.

**analytic** — closed-form arithmetic against the equation the code claims to
implement. Tolerances sit at or near machine epsilon, typically `1e-12` to
`1e-15`, because there is nothing for a tolerance to absorb. If one of these
needs loosening, the equation changed.

**integrated** — a quantity measured by actually running the N-body integrator,
through the same `updatePhysics` the application calls sixty times a second.
Tolerances come from the discretization error of the scheme at the stated
timestep, and every one of them says which.

**published** — a stored parameter or derived observable compared against a
literature value, with the source named. The tolerance is set by the precision
the reference is *quoted* to, not by what would be convenient. Where a paper
gives two significant figures, the tolerance says so.

**approximation** — an educational model that is not the full physics. Validated
against the equation it says it uses, never against reality, and labelled
`APPROX` in the table so the two cannot be confused. See
[Educational approximations](#educational-approximations).

---

## The integrator

Gravitas advances bodies with **symplectic Euler** (semi-implicit Euler, the
kick-drift form): velocity is kicked with the acceleration at the current
position, then position drifts with the new velocity. The application's default
timestep is `DT = 0.1` in simulation time units; scenarios that need a finer step
declare `max_timestep` and are substepped.

Every acceleration in a step is computed from the same snapshot of positions
before any body moves. That is not an implementation detail — it is what makes
the conservation laws below hold, and it was not always true. See
[Bugs this pass found](#bugs-this-pass-found).

Two other schemes are **selectable** from Settings and neither is ever the
default: see [Selectable integrators](#selectable-integrators) below.

Three properties are measured rather than asserted:

| Property | Measured | Expected | Tolerance |
| --- | --- | --- | --- |
| Convergence order in the timestep | ratio 2.0014 per halving | 2 (first order) | 0.2 rel |
| Radial excursion of a circular orbit at `dt = 0.1` | 3.16229e-3 | 2π·dt/P = 3.16228e-3 | 1e-2 rel |
| Energy error growth, 6 orbits vs 60 | ratio 1.0000 | 1 (bounded) | 5e-2 rel |

The middle row is the one worth pausing on. It does not assert that the radius is
roughly constant; it asserts that the radius wobbles by *exactly the amount the
scheme predicts* — one drift step, `v·dt/r = 2π·dt/P`. Measuring against the
prediction rather than against zero is what makes it a statement about the
integrator, and it is why the check would fail if the scheme were quietly
changed.

The third row is the most important check in the suite. The property that matters
for a symplectic integrator is not that the energy error is small but that it
does not accumulate: ten times the run length must give the same worst error.

---

## Results

Representative numbers from a passing run. The full table, with every tolerance
rationale, comes from `npm run validate:physics --verbose`.

### Unit system

The simulation fixes two anchors — 1000 mass units is a solar mass, 100 length
units is an astronomical unit — and the time unit follows from requiring the
simulation's `G` to be the real `G`. Nothing in the code asserts that the result
is self-consistent, which is exactly why it is checked first, and against the
outside world rather than against itself.

| Quantity | Measured | Reference | Error |
| --- | --- | --- | --- |
| Period of a circular orbit at 1 AU about 1 M☉ | 365.211 d | 365.256 d | 1.2e-4 |
| Circular speed at 1 AU | 29.7889 km/s | 29.78 km/s | 3.0e-4 |
| `EARTH_MASS_UNIT × 332946.0487` | 1000 | 1000 (the solar-mass anchor) | 0 |
| `JUPITER_MASS_UNIT × 1047.348644` | 1000 | 1000 | 0 |

The mass-unit rows look trivial and are not: a derived constant reproducing its
own definition is the only check that catches a wrong one, because the inspector
divides by the same constant to print the mass back. Both of these constants have
been wrong in this repository — Jupiter by a factor of 52, Earth by a factor of
1000 — and in both cases the display agreed with itself while disagreeing with
gravity.

### Orbits and Kepler's laws

| Quantity | Measured | Expected | Error | Tolerance |
| --- | --- | --- | --- | --- |
| Measured period vs `2π√(a³/μ)`, circular | 198.695 | 198.691 | 1.7e-5 | 2e-3 rel |
| Barycenter of an isolated pair, displacement | 2.2e-18 | 0 | — | 1e-12 abs |
| Recovered eccentricity of a circular orbit | 2.4e-6 | 0 | — | 3e-3 abs |
| Apoapsis, `e = 0.6` | 240.000 | `a(1+e)` = 240 | 3.8e-8 | 2e-3 rel |
| Periapsis, `e = 0.6` | 60.0001 | `a(1−e)` = 60 | 1.8e-6 | 6e-3 rel |
| Kepler II: variation in areal sweep rate | 7.4e-11 | 0 | — | 2e-2 abs |
| Kepler III: slope of log P against log a | 1.49987 | 1.5 | 8.6e-5 | 2e-3 rel |

Kepler's third law is *measured*, not evaluated: four orbits at different radii
are integrated, their periods timed by watching for periapsis passages with the
same `createPeriodTimer` the Kepler's Laws investigation hands to students, and a
least-squares slope fitted to the logarithms. The recovered exponent is 1.49987.

The periapsis tolerance is looser than the apoapsis tolerance on purpose:
periapsis is where the body moves fastest and where a fixed timestep resolves the
turn worst, and the sampled minimum can fall either side of the true one by up to
half a step.

### Conservation laws

| Law | Measured worst error | Configuration | Tolerance |
| --- | --- | --- | --- |
| Linear momentum | 1.4e-14 | 3 unequal masses, net drift, close encounters, 40 000 steps | 1e-12 abs |
| Angular momentum | 4.2e-14 | two-body `e = 0.3`, 60 orbits at `dt = 0.1` | 1e-11 abs |
| Total energy | 5.8e-4 | same run | 5e-3 abs |
| Energy error growth 6 → 60 orbits | ratio 1.0000 | same | 5e-2 rel |
| Galilean invariance of the relative motion | 1.4e-16 | boosted vs unboosted binary, 6000 steps | 1e-10 rel |

Linear and angular momentum are conserved *exactly*, to floating-point round-off,
and it is worth being explicit about why, because it is easy to assume otherwise
of a first-order scheme:

- **Momentum.** Accelerations are computed pairwise from one snapshot of the
  positions, so the internal forces sum to zero identically. This holds however
  inaccurate the trajectories are, which is why the momentum check runs on a
  *chaotic* three-body system with genuine close encounters — the orbits there
  are wrong in detail and the momentum is still exact. A separate check confirms
  that configuration really does have close encounters, so the result cannot be
  had cheaply.
- **Angular momentum.** Over one step the total changes by
  `dt · Σᵢ mᵢ xᵢ × aᵢ`. Pair that sum up and each pair contributes
  `(xᵢ − xⱼ) × Fᵢⱼ`, which vanishes because gravity acts along the line joining
  the bodies. So the scheme conserves total angular momentum exactly rather than
  to first order.

Energy is the one that genuinely oscillates. The claim is that the oscillation is
*bounded*, and the 6-versus-60-orbit ratio of 1.0000 is the measurement of that
claim.

Energy and angular momentum are checked on a resolved two-body orbit, not on the
chaotic three-body run. A first-order integrator cannot resolve a near-miss, and
reporting the resulting error as an energy-conservation failure would be blaming
the scheme for the scenario.

### Selectable integrators

Three schemes can be chosen from Settings. Symplectic Euler is the default, is
what every shipped scenario was laid out and timed against, and is what an
unrecognized value in a saved link or scenario file resolves to. The other two
exist so that a student can watch the choice of scheme change the answer, which
is a lesson the sandbox could not previously teach.

| | order | symplectic | force evaluations per step |
| --- | --- | --- | --- |
| Symplectic Euler | 1 | yes | 1 |
| Velocity Verlet | 2 | yes | 2 |
| RK4 | 4 | no | 4 |

Measured on a bound Kepler orbit with `a = 120`, `e = 0.4`, about a 1000-unit
primary — the problem the application is actually integrating, not a case fitted
to the implementations:

| Check | Measured | Expected | Tolerance |
| --- | --- | --- | --- |
| Symplectic Euler is the default scheme | `Symplectic Euler` | `Symplectic Euler` | exact |
| An unrecognized scheme falls back to the default | `Symplectic Euler` | `Symplectic Euler` | exact |
| Symplectic Euler converges at first order | 0.9958 | 1 | 0.15 abs |
| Velocity Verlet converges at second order | 2.0000 | 2 | 0.15 abs |
| RK4 converges at fourth order | 4.288 | 4 | 0.6 abs |
| Velocity Verlet beats symplectic Euler at one timestep | 2.37 decades | 2.4 | 0.5 abs |
| RK4 beats Velocity Verlet at one timestep | 5.65 decades | 4.8 | 1.2 abs |
| Symplectic Euler: energy error bounded, 60 orbits vs 6 | ratio 1.0000 | 1 | 5e-2 rel |
| Velocity Verlet: energy error bounded, 60 orbits vs 6 | ratio 1.0000 | 1 | 5e-2 rel |
| RK4: energy error accumulates, 60 orbits vs 6 | ratio 10.00 | 10 | 0.25 rel |
| Velocity Verlet conserves angular momentum | 7.2e-15 | 0 | 1e-11 abs |
| RK4 conserves angular momentum only approximately | 1.0e-13 | 0 | 1e-8 abs |

Four of these want a word of explanation.

**The order is measured at 1.37 periods, not at a whole number of them.** Sampled
at the same orbital phase, symplectic Euler is conjugate to leapfrog through a
half-step shift and reports second order — a true statement about that particular
sample and not the order of the scheme. Measured off-phase it reports 1.00.

**RK4 is measured at coarser steps than the other two.** At the step counts they
need, RK4's error is already down at double-precision round-off and the measured
order becomes a measurement of the floating-point noise. Its order is approached
from above — 4.29 here — because on an eccentric orbit the higher terms of the
local error still contribute at the coarse steps it has to be measured at.

**The bounded-versus-secular pair is the point of the whole group.** A symplectic
scheme's energy error oscillates about a fixed value: ten times the run length
gives the same worst error, which is why a first-order method is the default and
not an embarrassment. RK4 is not symplectic, so its energy error grows linearly
with the number of steps — ten times the run, ten times the error. Over a few
orbits it is by far the most accurate of the three; over a few thousand it is the
only one still getting worse.

**Angular momentum separates the two symplectic schemes from RK4 in kind, not in
size.** Verlet's kicks are each along the line joining the bodies, so the torque
cancels exactly at any step. RK4 mixes four stages evaluated at four different
positions, so its cancellation is a truncation error that shrinks with the step
rather than an identity. The error is tiny either way; the claims are different.

Two things are deliberately outside the selectable schemes. Black holes keep
their own symplectic-Euler path, because their step carries the phenomenological
orbit-decay term and running a fourth-order scheme over a first-order damping law
would report an order it does not have. And the Barnes-Hut worker's cached
acceleration is a snapshot from a previous frame: correct to reuse once per step
and wrong to reuse four times inside one, so the multi-stage schemes evaluate the
direct sum instead.

### Escape velocity and the bound/unbound boundary

| Quantity | Measured | Reference | Source |
| --- | --- | --- | --- |
| Earth surface escape speed | 11.1857 km/s | 11.186 | NASA Earth fact sheet |
| Sun surface escape speed | 617.752 km/s | 617.7 | NASA Sun fact sheet |
| Moon surface escape speed | 2.37566 km/s | 2.38 | NASA Moon fact sheet |
| Jupiter surface escape speed | 59.5288 km/s | 59.5 | NASA Jupiter fact sheet |
| Specific energy at `v = v_esc` | 1.8e-15 | exactly 0 | — |
| Eccentricity at `v = v_esc` | 1.0000 | exactly 1 | — |
| Apoapsis at `0.98 v_esc`, integrated | 2425.41 | 2425.25 | analytic |

The boundary is checked twice by two independent routes — the vis-viva relation
for the energy, the eccentricity vector for the shape — so a mistake in either
would break their agreement. At `0.999 v_esc` the orbit reports bound, at
`1.001 v_esc` unbound, and the integrated `1.02 v_esc` path never turns around.

The integrated apoapsis at `0.98 v_esc` — an `e = 0.92` orbit whose turning point
is 24 times the launch radius — comes out right to 6.4e-5 at the application's own
`dt = 0.1`, and the error falls by a factor of four when the timestep halves.

### Reference frames

Every check here is exact to round-off, because a frame change is a translation.

- The barycenter is the mass-weighted mean position, and the mass-weighted
  offsets from it sum to zero.
- The barycenter frame's velocity is total momentum over total mass. Without
  this, the inspector reports Earth moving at 29.8 km/s while the view has Earth
  sitting still.
- Pairwise separations are unchanged by a frame change, and the body a frame is
  tied to sits at the origin in it.
- **Galilean invariance of the integrator**: boosting every body by a constant
  velocity leaves the relative motion identical to 1.4e-16 over 6000 steps.

### Transit geometry and depth

| Quantity | Measured | Expected | Source |
| --- | --- | --- | --- |
| Central depth, `k = 0.08` | 0.00777048 | `k²/⟨I⟩` = 0.00777328 | quadratic limb darkening, Claret (2000) |
| Half-duration, `a/R★ = 12`, `b = 0.3` | 0.0865933 rad | analytic | Seager & Mallén-Ornelas (2003) |
| Blocked fraction beyond `1 + k` | exactly 0 | exactly 0 | — |
| Sky separation at mid-transit | 0.4 | `b` = 0.4 | — |

The central depth is not `k²`. With the solar quadratic limb-darkening
coefficients the code uses (`u₁ = 0.4`, `u₂ = 0.26`), the disk-average intensity
is `1 − u₁/3 − u₂/6 = 0.8233`, so a central transit is 21% deeper than the naive
geometric value. That 21% is the correction the transit investigation asks
students to apply, and the instrument they measure with reproduces it to 3.6e-4 —
which is the truncation error of its numerical quadrature, not physics.

Also checked: a grazing transit is shallower than a central one (limb darkening
plus partial overlap), and the geometry admits no transit at all once the impact
parameter exceeds `1 + k`.

### Observer geometry, radial velocity and astrometry

| Quantity | Measured | Reference | Source |
| --- | --- | --- | --- |
| HD 209458 b semi-amplitude, from stored parameters | 83.85 m/s | 84 m/s | Naef et al. (2004); Mazeh et al. (2000) |
| The Sun's reflex semi-amplitude from Jupiter | 12.47 m/s | 12.5 m/s | Lovis & Fischer (2010) |
| The Sun's astrometric signature at 10 pc | 496.0 µas | 497 µas | Perryman (2011) |
| Sun–Jupiter barycenter from the solar center | 742 021 km | 742 000 km | Murray & Dermott |
| 1 AU at 1 pc | 1.000000 arcsec | 1 by definition | — |

`K ∝ sin i` exactly, a face-on orbit gives exactly zero radial velocity, and
`K ∝ 1/√(1−e²)`. The inverse relation — minimum mass from a measured `K` —
recovers the input planet mass to 2e-14. The radial velocity of an approaching
body is negative, which is the sign convention every spectrograph uses and the one
the RV panel has to match.

The integrated stellar reflex amplitude matches `a·m/(M+m)` to 2.8e-4: the
astrometry panel's measurement of the star's largest excursion from the
barycenter is the amplitude the mass ratio demands.

### Habitable zone and insolation

The habitable-zone model is Kopparapu et al. (2013), ApJ 765, 131, with the
coefficients from the 2014 erratum (ApJ 787, L29), for a 1 Earth-mass planet.

| Quantity | Measured | Reference | Source |
| --- | --- | --- | --- |
| `S_eff` at runaway greenhouse, `T_eff` = 5780 K | 1.0385 | 1.0385 | Kopparapu erratum |
| `S_eff` at maximum greenhouse, `T_eff` = 5780 K | 0.3507 | 0.3507 | Kopparapu erratum |
| Solar conservative HZ, inner edge | 0.9813 AU | 0.99 AU | Kopparapu (2013, 2014) |
| Solar conservative HZ, outer edge | 1.6886 AU | 1.70 AU | Kopparapu (2013, 2014) |
| TRAPPIST-1 conservative HZ, inner edge | 0.02541 AU | 0.024 AU | Gillon et al. (2017) |
| TRAPPIST-1 conservative HZ, outer edge | 0.04994 AU | 0.049 AU | Gillon et al. (2017) |
| Planets inside TRAPPIST-1's conservative HZ | e, f, g | e, f, g | Gillon et al. (2017) |
| Solar constant at 1 AU | 1361 W/m² | 1361 | TSIS-1 / IPCC AR6 |

The two `S_eff` rows are exact: at the solar effective temperature every term of
the quartic vanishes and only the constant survives, so those compare the stored
coefficients directly against the published ones.

Two results worth calling out because they are the ones a plausible-sounding
intuition gets wrong, and the suite pins them:

- **Mars's orbit is inside the conservative habitable zone.** The
  maximum-greenhouse edge is at 1.69 AU, beyond Mars at 1.524 AU. By insolation
  alone Mars is in the habitable zone. It is not habitable, and the reason has
  nothing to do with how much sunlight it gets. Venus, at 0.723 AU, *is* inside
  the inner edge.
- **TRAPPIST-1 is outside the range the published fit covers.** The star is at
  2566 K and the fit is calibrated over 2600–7200 K. The model clamps to the
  nearest calibrated temperature rather than extrapolating a quartic, and reports
  that it did so (`extrapolated: true`). The 8% tolerance on those two rows is
  what the clamp costs — still an order of magnitude tighter than the
  mass-luminosity fallback this model replaced, which put the zone out by a
  factor of four.

An eccentric orbit's periapsis-to-apoapsis insolation ratio is `((1+e)/(1−e))²`
exactly, and 62.75% of a year at `e = 0.4` is spent beyond the semi-major axis —
sampled evenly in mean anomaly, which is the step that makes it a statement about
the year rather than about the path.

### Dark matter and rotation curves

The halo is a pseudo-isothermal profile, the one used to fit real rotation curves
(Begeman 1989 on NGC 3198), rather than a curve invented to look right.

| Quantity | Measured | Expected | Tolerance |
| --- | --- | --- | --- |
| `v_c` at 100 core radii, vs asymptotic `√(1 − π/2x)` | 0.9921653 | 0.9921149 | 2e-4 rel |
| `v_c` near the center, vs `v_flat·x/√3` | ratio 0.9999997 | 1 | 1e-6 rel |
| `\|a_halo\|` vs `v_c²/r` | 0 difference | 0 | 1e-14 abs |
| Enclosed mass round-trip to `√(GM/r)` | ratio 1.0000 | 1 | 1e-14 |
| Fitted slope, point mass only | −0.5000000 | −0.5 | 1e-12 rel |
| Fitted slope, halo-dominated | 0.0537 | ≈ 0 (flat) | 8e-2 abs |
| Component speeds add in quadrature | ratio 1.0000 | 1 | 1e-14 |
| Virial mass of a uniform sphere | `(5/3)R⟨v²⟩/G` | same | 1e-12 rel |
| Halo circular orbit in the integrator, radial range | 4.0e-4 | 0 | 5e-3 abs |
| Modified Bessel functions vs tabulated values | 6.4e-8 worst | 0 | 2e-7 abs |
| Exponential disc peak location | 2.150 scale lengths | 2.15 (Freeman 1970) | 5e-3 rel |
| Disc curve at 150 scale lengths vs a point mass | 0.9961 | 1 | 1e-2 rel |
| Disc speed at its peak vs the equivalent sphere | 1.146 | ≈1.17 | 5e-2 rel |
| Best halo-free residual ÷ fitted residual | 7.06 | ≈7 | 0.3 rel |

The asymptote check compares against `√(1 − π/2x)` rather than against 1. At 100
core radii the speed is still 0.79% short of `v_flat`, because `arctan(x)/x` falls
off as `π/2x`. Checking against 1 with a loose tolerance would hide a wrong
profile; checking against the asymptotic form pins the profile itself.

The halo-dominated slope is 0.054, not 0. That residual is the profile's own slow
approach to its asymptote, `≈ π/4x`, and it is quoted rather than tuned away. The
lesson's claim is "flat, not −0.5", and the distance from the Keplerian value is a
factor of ten.

The halo-orbit row matters because the halo enters the force law as an
operator-split velocity kick rather than through the point-mass sum: a body
launched on the circular speed the panel plots stays on it.

The last five rows cover the component curves the "Missing Mass" lesson's fitting
exercise is built on. The stellar disc is a thin exponential disc with the
Freeman (1970) solution, which needs modified Bessel functions; those are the
Abramowitz & Stegun polynomial approximations and they are checked on both
branches of each function, because a subtly wrong Bessel function produces a disc
curve that looks entirely plausible with its peak in the wrong place — and in a
fitting exercise that error is absorbed into the halo, which is the quantity being
measured. Two independent shape checks pin it: the peak sits at 2.15 scale lengths,
a pure number independent of the disc's mass and size, and at 150 scale lengths the
curve reduces to a point mass to four parts in a thousand.

The disc-versus-sphere row records something that is easy to mistake for a bug. In
its own plane a disc spins about 17% faster than a sphere holding the same mass
inside the same radius, because material at larger radius than the orbit still
pulls inward when it is coplanar. Treating a disc as a sphere therefore understates
it, and the shortfall lands on the halo.

The final row is the lesson's central claim, measured rather than asserted: swept
over the entire range of both disc sliders a student can reach, the best possible
halo-free fit leaves a residual seven times larger than the decomposition with a
halo — 14.5 km/s against 2.1, with measurement errors of 4.7.

### Compact objects

All Schwarzschild: non-rotating, uncharged. Real black holes spin, which changes
the horizon geometry, and the lesson says so.

| Quantity | Measured | Reference | Source |
| --- | --- | --- | --- |
| `R_s` of 1 M☉ | 2.954127 km | 2.95 km | Schwarzschild (1916), as standardly quoted |
| `R_s` of Sagittarius A* (4.297e6 M☉) | 1.2694e10 m | 1.269e10 m | GRAVITY Collaboration (2019) |
| Hawking temperature of 1 M☉ | 6.1684e-8 K | 6.17e-8 K | Hawking (1974) |
| Evaporation lifetime of 1 M☉ | 2.0974e67 yr | 2.1e67 yr | Page (1976) |
| ISCO radius, recovered from the stored orbital period | 3.000000 `R_s` | 3 `R_s` = 6GM/c² | — |
| Newtonian escape speed at the horizon | 1.0000 c | exactly c | — |

Scalings are checked as scalings: `R_s ∝ M`, `T ∝ 1/M`, lifetime `∝ M³`, average
density `∝ 1/M²`. Those are the four trends the "Black Holes by the Numbers"
investigation asks a student to discover, so they are checked in the code the
lesson and the inspector both read.

Two of these are pedagogically load-bearing. The ISCO radius is recovered by
*inverting* the stored orbital period rather than read back from the expression
that produced it, so the two have to agree — and Kepler's third law happens to
hold exactly in Schwarzschild coordinates for circular orbits, which is why a
Newtonian period is the right thing to quote. And the Newtonian escape speed at
the horizon is exactly `c`: the squeeze-the-Sun panel gets the right radius for
the wrong reason, which the lesson states outright rather than letting a student
conclude that Newtonian gravity predicts event horizons.

### Stored parameters for real systems

| Check | Measured | Reference | Source |
| --- | --- | --- | --- |
| TRAPPIST-1 stellar mass | 0.0898 M☉ | 0.0898 | Agol et al. (2021) |
| TRAPPIST-1 stellar radius | 0.1192 R☉ | 0.1192 | Agol et al. (2021) |
| TRAPPIST-1 luminosity | 5.53e-4 L☉ | 5.53e-4 | Ducrot et al. (2020) |
| TRAPPIST-1 `T_eff` | 2566 K | 2566 | Agol et al. (2021) |
| All seven TRAPPIST-1 planets: worst deviation of `a³/P²` from `M★` | 1.02% | 0 | Agol et al. (2021) |
| HD 209458: `a³/P²` | 1.14867 M☉ | 1.148 stored | Torres et al. (2008) |
| HD 209458 b transit depth from stored radii | 1.5075% | 1.5% measured | Charbonneau et al. (2000) |
| HD 209458 b bulk density | 0.3256 g/cm³ | 0.33 | Southworth (2010) |
| Jupiter: `a³/P²` | 1.000914 M☉ | 1 | JPL Horizons |
| Earth bulk density from stored constants | 5.5133 g/cm³ | 5.51 | NASA Earth fact sheet |

The strongest single test on a stored system is Kepler's third law applied to
every planet independently: seven `(a, P)` pairs that must all imply the same
central mass. The worst deviation across TRAPPIST-1 is 1.02%, which is the
rounding the stored three-figure semi-major axes carry. A transposed digit or a
wrong unit anywhere in that table would show up immediately.

The HD 209458 depth row is the one the transit lesson rests on: the geometric
depth computed from the stored planet and stellar radii agrees with the measured
depth to 0.5%, so a student who measures 1.5% and solves for a radius gets the
stored radius back.

---

## Educational approximations

These are labelled `APPROX` in the table. They are validated against the equation
they claim to use, never against reality, and they are documented on the
[public model page](model/) as approximations.

### Gravitational-wave inspiral

Gravitas does not solve Einstein's field equations. The inspiral is an
orbital-decay term: each black hole's velocity is multiplied by
`1 − λ·dt` every step.

| Check | Measured | Expected | What it establishes |
| --- | --- | --- | --- |
| Velocity damping, gravity isolated | exact to 3e-15 | `v₀(1 − λ dt)ⁿ` | the code implements the stated equation |
| Separation decay rate | `ȧ/a = −2λ` to 5% | −2λ | the consequence for a near-circular orbit |
| Late-window rate ÷ early-window rate | 1.00 | 1 | the decay is exponential in time |
| What GR would give for that ratio | 4.95 | `exp(1.6)` | the size of the departure |

The last two rows are the point. Damping the speed at rate `λ` removes orbital
energy at `λ G M m / a`; with `E = −GMm/2a` that gives `ȧ = −2λa`, so the
separation decays exponentially and the fractional decay rate is *constant*. Real
gravitational-wave emission gives `ȧ ∝ a⁻³` (Peters 1964), so the fractional rate
goes as `a⁻⁴` and accelerates violently as the binary tightens. Across the window
integrated here, general relativity would show the rate rising by a factor of
4.95; Gravitas holds it at 1.00.

That is a PASS, and it is a PASS because the code matches its documentation — the
model page states that "the characteristic runaway at the end is not reproduced".
It would FAIL if someone swapped in a different decay law without updating that
page.

The derivation `ȧ = −2λa` assumes the damping is slow compared with the orbit, so
the check uses `λ·P ≈ 0.02`. The shipped default `orbit_decay_rate` of 0.005 is
*not* in that regime for a typical scenario separation: those inspirals are rapid
captures rather than adiabatic decays. That is a property of the scenarios, not of
the term, and it is recorded here rather than checked.

### Mergers

Perfectly inelastic. The product carries the mass-weighted mean velocity, so
momentum is conserved exactly (measured: 0, to round-off) and kinetic energy is
not. Mass is conserved exactly, which is itself the approximation: a real
compact-object merger radiates several percent of the total mass away as
gravitational waves, and Gravitas radiates none.

### Absorption by a black hole

A body that crosses `bh.radius + ABSORB_BUFFER` is merged into the hole. The
model is the same perfectly inelastic collision the merger above uses, applied to
both position and velocity:

```
M     = m_bh + m_body
r_new = (m_bh r_bh + m_body r_body) / M
v_new = (m_bh v_bh + m_body v_body) / M
```

Mass, total linear momentum and the pair's centre of mass are conserved exactly
(all three measured at 0 to round-off). Kinetic energy is not, and is not meant
to be.

Until this pass the engine did `bh.mass += body.mass` and nothing else, so a body
falling into a moving hole deposited its mass and threw its momentum away. That
was the dominant term in the momentum drift the scenario probe reported for Star
Cluster, Stellar Graveyard and Black Hole Billiards, and it was inconsistent with
the engine's own two other paths: `handle_star_merging` already gave a hole that
swallowed a star the mass-weighted mean velocity, and the black-hole/black-hole
merger already built its product at the mass-weighted mean of both position and
velocity.

**What cannot be conserved.** Total angular momentum splits into the motion of
the centre of mass and the pair's motion about it:

```
L_total = L_com + L_spin,   L_spin = mu (r_rel x v_rel),   mu = m_bh m_body / M
```

Collapsing the pair to one point mass keeps `L_com` exactly and discards
`L_spin`. Physically `L_spin` is not lost — it is the spin the hole acquires, and
spin-up by accretion is how real holes are spun. Gravitas models a hole as a
point mass with no spin degree of freedom, so there is nowhere to put it.

It is therefore banked rather than dropped. Each hole accumulates it in
`spin_angular_momentum`, the module keeps the running total, and two checks pin
the accounting: that the angular momentum which went missing equals the spin term
computed independently from the pre-event state, and that the engine's own ledger
agrees with it. A third bounds it:

```
|L_spin| <= mu (r_horizon + ABSORB_BUFFER) |v_rel|
```

The body is inside that radius when the event fires, so the discarded term is
bounded rather than merely believed small, and it shrinks as the hole grows —
`mu` tends to the body's own mass while the horizon grows only as `M^0.3`.

**Where the transfer is suppressed.** Two configurations are documented
departures in which the hole is not a dynamical participant at all: a static hole
(`bh_behavior` other than `'Orbiting'`), and one-way gravity (`mutual_gravity`
off, or `star_only_gravity` on). In both, absorption adds the mass and leaves the
hole's position and velocity alone, exactly as before. Momentum a test particle
never exerted through gravity should not appear at the moment it is eaten, and a
static hole given a recoil would be visibly nudged off the mark its scenario
placed it on. The momentum that consequently goes nowhere is added to a discarded
total, checked against the absorbed body's own momentum, so the approximation is
allowed to break conservation but not to break it silently.

### Tidal disruption

Four classes implement `tidal_mass_loss` — `StarObject`, `Planet`, `GasGiant` and
`Comet` — each with its own tidal radius as a multiple of the hole's (5, 3, 4 and
2 respectively) and its own stripping rate. `updatePhysics` iterated `stars`
alone, so three of the four were unreachable: a comet could fall through a black
hole's tidal radius intact, which is the one thing a comet is famous for not
doing. It read as a deliberate restriction and was not.

All four are now iterated, and five checks establish that each is reached. One
repair was needed first. `GasGiant`'s destruction threshold was a bare
`this.mass <= 0.5`, written when `JUPITER_MASS_UNIT` was a literal 50 and 0.5
simulation units therefore meant a hundredth of a Jupiter. Correcting that
constant to the real 0.955 silently turned the same literal into half a Jupiter —
heavier than most gas giants the generator makes, so every one of them would have
been destroyed on the frame it entered the tidal radius the moment the loop
started calling it. Both that threshold and `StarObject`'s are now written against
the unit they mean rather than the number the unit used to be, which is the same
repair the asteroid and comet thresholds already carried.

Tidal disruption is **not** conservative and never was: the body loses mass
continuously while the `Debris` it sheds carry a fixed fragment mass unrelated to
the amount stripped. It is a mass sink, and therefore an energy and momentum sink.
`conservationCaveats()` now reports it whenever there is a hole in the scene for
it to happen near, so a drift readout says so rather than leaving it to be blamed
on the integrator.

### Mass–luminosity fallback

A star a user invented carries no measured luminosity, so one is estimated from a
broken-power-law main-sequence relation. It is checked only against its own anchor
(1 M☉ → 1 L☉) because it is good to a factor of order two at the bottom of the
main sequence and says nothing about a star that has left the main sequence. Any
star carrying a measured luminosity uses it instead — the fix that moved
TRAPPIST-1's habitable zone by a factor of four.

---

## Documented departures: what is *not* conserved, and why

Several Gravitas scenarios deliberately break conservation laws. These are
pedagogical choices, not bugs, and the validation suite excludes them explicitly
rather than passing them quietly.

**Static black holes.** With `bh_behavior: 'Static'` a hole pulls on everything
and is pulled by nothing. It is a fixed potential well a student flies things
past, which is the teaching object. Linear momentum cannot be conserved.

**One-way gravity.** `star_only_gravity: true`, and `mutual_gravity: false`
generally, make planets feel the star while the star feels nothing. Momentum is
not conserved. This is deliberate for planetary systems: TRAPPIST-1's seven
planets pull each other into crossing orbits at this scale and timestep, and the
transit and radial-velocity instruments want a star that stays where it is put.
The RV panel refuses to report a reflex velocity while this is on, and says why,
rather than presenting an artifact as a measurement.

**The dark-matter halo.** A static background field centered on the origin. It
accelerates every body and receives no reaction, so it conserves neither momentum
nor energy — the same kind of object as a static hole, and equally deliberate: the
halo represents a mass distribution too diffuse to render as bodies.

**Tidal stripping.** A body inside a black hole's tidal radius loses mass
continuously and sheds fixed-mass `Debris` fragments that do not account for it.
It is a mass sink, reported by `conservationCaveats()` whenever a hole is present.

**Black-hole spin.** A hole is a point mass with no spin degree of freedom, so the
angular momentum a body carries about the hole as it is absorbed has nowhere to
go. It is banked and reported rather than silently dropped; see *Absorption by a
black hole* above for the bound on its size.

**Two dimensions.** The dynamics are planar. Observer inclination is applied as a
3-D viewing geometry over a 2-D dynamical model, which is exact for a planar orbit
projected onto a line of sight and a plane of sky, and is not a 3-D N-body model.

**The Earth–Moon scenario is a schematic.** The Moon is drawn 35 units out where
the truth at 100 units per AU is 0.26 — otherwise it would be inside the Earth's
drawn radius. Every mass, radius and density is real; what cannot also be real at
that separation is the period, so the scenario carries the exaggeration in its
gravitational constant, where it is visible in Settings. The orbit, the mass
ratio and the barycenter are right; the 27.3-day period is not reproduced.

**Newtonian, non-relativistic.** Black-hole quantities are computed from
analytic Schwarzschild relations; the orbits around them are Newtonian. No
post-Newtonian terms, no frame dragging, no light bending in the dynamics.

---

## Scenario-level validation

The deterministic suite validates the engine on configurations it builds itself.
A second, browser-based probe validates the shipped scenarios as the application
actually assembles them — real presets, real settings, real substepping:

```bash
npm run validate:scenarios              # a representative set
node tools/scenario-stability.mjs --all # every scenario in the catalog
```

It needs Playwright and a browser, so it is a development tool rather than part
of `npm test`. For each scenario it reports the drift in linear momentum, total
energy and angular momentum over a simulated run at the scenario's own
`sim_speed`, and flags every documented departure that scenario has switched on.

Across all <!--fact:scenarios-->53<!--/fact--> scenarios: every scenario
whose settings claim momentum
conservation conserves it to round-off (`≤ 2.0e-15`), and every resolved few-body
scenario holds its energy and angular momentum within 5%. Representative rows:

```
scenario                           dP         dE         dL      bodies
Earth-Moon System            1.28e-15    3.95e-06   1.73e-15      2 -> 2
Binary Star System           1.79e-15    6.64e-06   7.02e-16    29 -> 29
Kuiper Belt                  4.15e-16    4.87e-07    4.71e-08  309 -> 309
Pulsar System                1.03e-15    1.91e-07   8.86e-16    19 -> 19
Spiral Galaxy                1.99e-15    4.38e-02   1.36e-15    91 -> 91
TRAPPIST-1 System             1.05e+00    8.25e-05    1.90e-04     8 -> 8   one-way gravity
```

Only 6 of the 48 are judged on momentum, and that number is itself a finding:
most scenarios deliberately use one-way gravity, a static hole, or a halo. The
probe names which, per scenario, rather than averaging over the difference.

Energy and angular momentum are judged on resolved few-body scenarios only. A
self-gravitating cluster of hundreds is chaotic and full of close encounters a
first-order integrator cannot resolve; its energy error is a property of the
timestep rather than of the force law.

---

## Bugs this pass found

Two, both fixed, both with regression coverage in the suite.

### The integrator broke Newton's third law

`updatePhysics` advanced bodies one at a time: each body's velocity and position
were updated in place before the next body computed its acceleration. The second
member of a pair therefore felt the first at its *already-updated* position, so
the two forces were no longer equal and opposite.

Measured cost, on an equal-mass binary at separation 200 and `dt = 0.1`:

| | Before | After |
| --- | --- | --- |
| Linear momentum drift, 10 orbits | 7.9e-4 of typical `\|p\|` | 0 |
| Energy error, 1 orbit | 5.0e-3 | 3e-6 |
| Energy error, 50 orbits | 5.8e-1 | 3e-6 |
| Separation after 50 orbits | 200 → 126.8 | 200 ± 0.16 |

The energy loss was **secular**, about 1% of binding energy per orbit — not the
bounded oscillation a symplectic integrator gives. On screen it looked like
binaries spiralling together and merging on their own, and several scenarios had
worked around it by capping their timestep rather than by anyone finding the
cause.

The fix computes every acceleration from one snapshot of the positions and only
then moves anything, in both the body loop and the black-hole loop. It restores
both conservation laws exactly: momentum and angular momentum to round-off, energy
bounded rather than accumulating.

Regression coverage: the momentum, angular-momentum and
energy-does-not-grow-with-run-length checks under **Conservation laws**, plus
"Barycenter of an isolated pair stays put".

### The Earth–Moon scenario had no gravity in it

Planets are only gravitational sources when `mutual_gravity` is on — with it off,
the solver builds its source list from stars, black holes and galaxies. The
Earth–Moon System preset never set it, and it is the one scenario in the
application whose entire subject is two planets and no star.

The Moon travelled in a straight line. Over a run its separation from the Earth
drifted from 35 units to 36 while its trail drew something close enough to the
start of an arc to survive a glance.

Fixed by enabling `mutual_gravity` in the preset, and by setting the pair up
barycentrically: the relative circular speed now uses both masses (the Moon's
1.2% share started the orbit at `e = 0.012` otherwise), and the momentum is split
between the two bodies so the barycenter stays put and the Earth visibly wobbles
about it. That last part is the point of the scenario — the Earth–Moon barycenter
is the standard example of a barycenter inside the larger body.

After: `dP = 1.3e-15`, `dE = 2.8e-6`, `dL = 1.7e-15`.

Found by `npm run validate:scenarios`, which is why that tool exists.

### Also corrected during this pass

Two mass-scale constants were wrong and were fixed alongside this work:
`JUPITER_MASS_UNIT` sat at 50 rather than 0.955 (a factor of 52) and
`EARTH_MASS_UNIT` at a literal 3 rather than 0.003 (a factor of 1000). Both are
now derived from the solar-mass anchor and both are checked against it under
**Unit system** — the only check that can catch this class of error, since the
inspector divided by the same wrong constant to print the mass back and so agreed
with itself while disagreeing with gravity.

---

## What is not validated

Stated plainly, because a coverage claim is only useful with an edge.

- **Rendering.** Nothing here reads a pixel. Trails, glows, accretion disks,
  jets, the spacetime view and the merger ripple are visual and are described on
  the [model page](model/) as illustrative.
- **The Barnes–Hut solver.** The suite runs the direct N² path. Tree gravity is
  approximate by construction and lives in a Web Worker the deterministic suite
  cannot start; its accuracy was calibrated separately against the direct solver
  (0.46% mean, 3.4% worst error at `theta = 0.4`) and that calibration is
  recorded in `js/physics.js` rather than re-measured here.
- **Tidal disruption, debris generation and particle effects.** Momentum
  bookkeeping across debris creation is not audited.
- **Collision outcome classification.** Which object type results from a merger
  is a modelling choice, not a conservation law; only momentum and mass are
  checked.
- **Long-term N-body statistics.** Cluster relaxation, mass segregation and
  ejection rates are not compared against any reference. A dense cluster in
  Gravitas is a demonstration, not a simulation anyone should measure.
- **Numerical relativity, post-Newtonian dynamics, and gravitational
  waveforms.** Absent entirely; see
  [Educational approximations](#educational-approximations).

---

## Adding or changing a check

Checks live in [`tools/physics-checks.mjs`](tools/physics-checks.mjs) as records:

```js
add({
  group: 'Conservation laws',
  kind: 'integration',          // analytic | integration | approximation | data
  name: 'Linear momentum, three unequal masses, 40000 steps',
  measured: worstMomentumError,
  expected: 0,
  unit: 'fraction of total |p|',
  tolerance: 1e-12,
  toleranceKind: 'absolute',    // or 'relative', the default
  why: 'Not an approximation: the accelerations are computed pairwise ...',
  source: 'Agol et al. (2021) PSJ 2, 1',   // required for kind: 'data'
});
```

Two meta-tests are enforced by the jest suite and will fail a build:

- every check must state a written reason for its tolerance, unless it is an
  exact comparison;
- every `kind: 'data'` check must name its source.

**If a check fails, read its `why` before touching its tolerance.** The
tolerances here are derived from the integrator's measured convergence order and
from the precision the published values are quoted to. A failure means one of
those assumptions broke, and the honest responses are to fix the physics or to
change the documented claim — not to widen the window. Where the model uses an
educational approximation, validate it against the equation it claims to use and
label it `approximation`, so the table keeps saying which is which.
