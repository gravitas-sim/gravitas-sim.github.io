# Rotation curves and the missing mass

Gravitas can now weigh a system two ways: by adding up the mass of the objects
in it, and by watching how those objects move. For a planetary system the two
answers agree. For anything larger they do not, and the gap between them is how
dark matter was found.

This document covers what was built, the decisions worth knowing about, and what
was deliberately left undone.

---

## One plot, two predictions, and no assertion

[`js/rotationCurve.js`](js/rotationCurve.js) plots orbital speed against
distance from the center of mass, one point per body, live.

The points are **measured**: each one is a body's actual radius and actual speed
this frame, taken from the simulation. Nothing is fitted, smoothed or averaged.

The dashed line is **calculated**: √(G·M(<r)/r) using only the mass of the
objects on screen. It is the prediction you would make if the light told you
where all the mass was.

The solid line is calculated too, and appears only when the halo is switched on.

The panel reports a least-squares power-law fit to the outer curve and names its
shape in words, and stops there. It never says which line is right. The bodies
do that.

Measured on the running app:

| scenario | fitted exponent | shape | visible mass |
| --- | --- | --- | --- |
| Solar System | **−0.500** | Keplerian | 1.0 M☉ |
| Spiral Galaxy | −0.447 | Keplerian | 14.7 M☉ |
| Milky Way Rotation | **+0.018** | Flat | 14.7 M☉ |

The first row is the check that the instrument works. The Sun holds 99.8% of the
Solar System's mass, so the enclosed total stops growing outside Mercury and the
exponent has to be exactly −1/2. It comes out at −0.500. Mercury lands at
48.5 km/s and 0.389 AU and Neptune at 5.43 km/s and 30.1 AU, both within a
percent of the real values.

The second and third rows are the argument. Same disc, same ninety stars, same
visible mass to three figures. Only the motion is different.

---

## The halo is a force law, not an object

The toggle in the panel adds a term to gravity. It does not change the display,
which is why switching it off makes the flat-curve disc physically come apart
rather than merely redrawing a line.

The profile is **pseudo-isothermal**:

```
v_c(r) = v_flat · √( 1 − (r_c/r)·arctan(r/r_c) )
```

Density falls as ρ ∝ 1/(1 + (r/r_c)²), the enclosed mass grows without limit
roughly in proportion to r far out, and the circular speed approaches a constant.
That asymptote is the entire point: a mass distribution that stops somewhere
gives v ∝ r^−1/2 outside itself, and only one whose enclosed mass keeps growing
gives a flat curve.

This is the family used to fit real rotation curves rather than a shape invented
to look right. **NFW was considered and rejected**: it is the better match to
structure-formation simulations and the worse fit to this job, because it is
cuspy at the center and would put a singularity in the middle of a scenario
students are asked to fly a star through.

Three implementation notes worth knowing:

**It is applied as a velocity kick before whichever solver runs**, rather than
inside `gravitational_acceleration`. There are two solvers, and the Barnes-Hut
worker is handed a list of point masses, which a smooth background field is not.
Putting it in the integrator covers both paths with one piece of code. That
makes it an operator split, so there is a test that a circular orbit in the halo
stays circular: better than 1% radial spread over three orbits, and the error
shrinks when the timestep does.

**Black holes take their own path through the integrator**, so the halo is
applied to them separately, inside their existing `canMove` guard. A static black
hole quietly accumulating halo velocity would leap the moment anything set it
moving.

**Near r = 0 the closed form loses every significant digit** it has, being a
difference of two nearly equal numbers. Below r/r_c = 10⁻³ the series
1 − arctan(x)/x = x²/3 − x⁴/5 + … is used instead, and there is a test that the
two branches agree where they meet.

---

## Zwicky's measurement, repeated

The Coma Cluster scenario is twenty-four galaxies on randomly oriented orbits,
named after real members of Coma. It is **paused and seeded**, so every student
in a class measures the same cluster: a swarm changes its dispersion and its
extent as it moves, and asking thirty people to compute a number from a moving
target produces thirty numbers and no way to tell a mistake from a moment.

The panel reports three things and refuses to report a fourth:

| measurement | value |
| --- | --- |
| members | 24 |
| speed spread σ | 20.46 simulation units per time |
| cluster radius R | 2516 simulation units |
| visible mass | 96 M☉ |

It does not report the virial mass, because working that out is the exercise:

```
2K + U = 0,  K = ½M⟨v²⟩,  U = −(3/5)GM²/R   →   M = (5/3)·R·⟨v²⟩/G
```

In simulation units G is exactly 1, which is why the lesson asks students to
switch units before measuring. The arithmetic is then two multiplications:
(5/3) × 2516 × 20.46² = 1.76 × 10⁶ simulation mass units, or **1756 M☉**, against
**96 M☉** of visible galaxies. A factor of **18**.

The estimator is only good to a factor of order one, and the lesson says so. It
does not need to be better: the discrepancy is far larger than the error in the
method, which is exactly why the result survived being made in 1933.

There is a test that pins the estimator against a case with a known answer:
twelve bodies on circular orbits about a central mass return (5/3)·M, which is
the uniform-sphere approximation showing its working rather than hiding it.

---

## The projection factor, in the open

Converting a line-of-sight dispersion into ⟨v²⟩ needs a factor of 3 for isotropic
orbits in space and 2 for motion confined to a plane. Getting it wrong is the
classic error in this calculation, so `losToMeanSquare` takes the number of
dimensions as an argument rather than burying a constant, and `virialMass` takes
the full mean square speed rather than a dispersion. The simulation is planar and
the code says which factor it is using.

---

## Galaxies as objects

`Galaxy` is a new object type and deliberately the simplest in the codebase: a
mass, a position and a drawing. It does not merge, accrete, collapse or transform.
Those are all real things that happen to galaxies and none of them are what a
student is being asked to look at here, and a cluster that lost members would
lose the dispersion being measured.

It is drawn at a little over twice its true proportion to the cluster, for the
same reason `drawRadius` enforces a minimum pixel size on everything else: at the
true ratio a member is thirteen pixels across at the zoom the whole cluster fits
in, and an object nobody can see the shape of might as well not have one.

Adding the type turned up a duplicate worth removing. `js/physics.js` carried its
own copy of the 355 object-name strings in `js/data/objectNames.js`, byte for
byte identical. Adding a ninth pool would have meant adding it twice, so the copy
is gone and physics.js imports the shared table.

---

## The scale models, and why the scaling is harmless

The three new scenarios are scale models and their cards say so. A real galactic
bulge is around 10¹⁰ M☉ and a real cluster is megaparsecs across, while Gravitas's
units are calibrated so that G = 1 works for planetary systems.

Rebuilding the unit system around galactic scales would change nothing a student
measures here, because **every quantity these scenarios are used to measure is
dimensionless**: the exponent of a power law, and the ratio of two masses. That
is a real property of the argument, not an excuse. It is also why Zwicky's
conclusion survived his distance scale being wrong.

---

## The lesson

**The Missing Mass**, 15 steps, 25 to 35 minutes. It is the shortest lesson in
Gravitas by a factor of two, because it makes one argument and the argument is
short.

The order is historical and pedagogical at once. The Solar System first, because
it is the case where the two ways of weighing agree and so it establishes the
method. Then a galaxy as it would be if light traced mass. Then a galaxy as
telescopes actually find it. Then Zwicky's cluster, which came first in time and
lands harder once a student has already watched one system misbehave.

Nothing in it asks a student to believe in dark matter. It asks them to make two
measurements and notice that they disagree, which is all the evidence itself
does. Step 14 is a short-answer question that asks explicitly what the
measurements establish and what they do not, and the rubric gives credit for
naming faint ordinary matter or modified gravity as alternatives.

---

## What was deliberately not done

**The halo does not respond to anything.** It is static, fixed at the origin
rather than following the system's center of mass, and it does not form, evolve
or feel the bodies moving in it. A live halo would be a different and much larger
piece of work, and none of the lesson's measurements would change.

**No hot gas.** Most of a real cluster's ordinary matter is in X-ray-emitting gas
between the galaxies, which is why Zwicky's factor of several hundred is nearer a
factor of ten today. The lesson's closing note says this; the simulation does not
model it.

**No noise, and no detection thresholds.** The rotation curve shows exact
velocities. Real rotation curves are built from Doppler shifts with real error
bars, and the outer points of a real curve are the hard-won ones.

**No lensing, no CMB, no nucleosynthesis.** The modern case for dark matter does
not rest on rotation curves, and the final step of the lesson says so in words
rather than trying to simulate any of it.

**MOND is named but not implemented.** Modified gravity is a live alternative
that fits rotation curves well and clusters poorly, and the lesson's rubric gives
credit for raising it. Building a second force law to compare against would be a
genuinely interesting addition and is not this change.
