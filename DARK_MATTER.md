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

| scenario           | fitted exponent | shape     | visible mass |
| ------------------ | --------------- | --------- | ------------ |
| Solar System       | **−0.500**      | Keplerian | 1.0 M☉       |
| Spiral Galaxy      | −0.447          | Keplerian | 14.7 M☉      |
| Milky Way Rotation | **+0.018**      | Flat      | 14.7 M☉      |

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

| measurement      | value                           |
| ---------------- | ------------------------------- |
| members          | 24                              |
| speed spread σ   | 20.46 simulation units per time |
| cluster radius R | 2516 simulation units           |
| visible mass     | 96 M☉                           |

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

## The other explanation: MOND

A flat rotation curve is evidence of a discrepancy between the mass that shines
and the mass that pulls. It is not, on its own, evidence that the missing mass
exists. The other reading is that gravity is what is missing, and Gravitas
offers it as a selectable alternative rather than a footnote.

**The law.** Milgrom (1983) observed that rotation curves stop falling at a
characteristic *acceleration* rather than at a characteristic radius or
brightness, and proposed that below a₀ ≈ 1.2 × 10⁻¹⁰ m/s² the relation between
gravity and motion departs from Newton's. Gravitas applies it algebraically to
the summed Newtonian field of the visible matter,

    g = ν(g_N / a₀) g_N

using the "simple" interpolating function μ(x) = x/(1+x) of Famaey & Binney
(2005), whose inverse is closed form. The limits are g → g_N where the field is
strong and g → √(g_N a₀) where it is weak, and the second gives v⁴ = G M a₀ far
from a galaxy: a flat curve, and a fixed relation between baryonic mass and
asymptotic speed with nothing fitted per galaxy.

**One constant, converted once.** a₀ is written in SI in `js/mond.js` and
converted from there — to (km/s)²/kpc for the rotation-curve work, and into
simulation units through each scenario's declared scale. There is one number in
the codebase to check against a paper.

**Three modes, and they exclude each other.** The force law carries one setting,
`galaxy_gravity`, with the values `newtonian`, `halo` and `mond`. It is an enum
rather than two switches because the halo and MOND are competing explanations
for the same observation, and a world running both would be physics nobody
holds. The older `dark_matter_halo` boolean is kept as a mirror so that saved
games and shared links from before this existed still load.

**MOND is confined to galaxies.** It is offered only in the three galaxy
scenarios, which declare what one simulation unit represents in kiloparsecs and
solar masses; everywhere else the control is disabled and says why. There is no
defensible way to apply a galactic acceleration scale to a planetary system, and
applying one silently would be worse than refusing.

**On the scale mapping.** The galaxy scenarios are scale models, so a₀ has to be
carried in through a declared mapping: one length unit is 1/30 kpc, so the
900-unit disc is 30 kpc, and one mass unit is 9.6 × 10⁵ M☉, so the visible mass
is 1.4 × 10¹⁰ M☉. The mass scale was chosen so that the model galaxy is a real
one — that mass with a flat curve near 122 km/s sits on the observed baryonic
Tully-Fisher relation, and the validation suite checks it does. Under that
mapping MOND reproduces the scenario's flat curve from the visible mass alone.
**That agreement is a consequence of having built a realistic galaxy, not
evidence gathered by this simulation**, and the scenario source says so where the
mapping is declared.

**What the lesson does with it.** Four steps near the end of *The Missing Mass*,
not a second investigation. Students put both explanations on the same twelve
measurements and find that the halo matches exactly with three fitted numbers
and MOND matches inside the error bars with one — and that the two disagree
about how heavy the stellar disc is, MOND preferring about two thirds. That
disagreement is the disc-halo degeneracy and it is real: a rotation curve does
not measure a stellar mass-to-light ratio, so the disc mass is free in both
pictures. The instrument does not declare a winner. The point of the sequence is
that this measurement underdetermines the explanation.

**Where MOND does badly.** It fits galaxy rotation curves well and this is not
in dispute. Outside them:

- **Clusters.** It reduces the missing mass but leaves a residual factor of
  about two, so clusters still need unseen matter of some kind.
- **The Bullet Cluster.** After a collision the lensing mass is displaced from
  the visible gas, which is what a collisionless dark component looks like.
- **The cosmic microwave background.** The relative heights of the acoustic
  peaks are fitted by cold dark matter and are not reproduced by MOND without
  adding a dark component anyway.
- **Relativity.** There is no settled relativistic form. TeVeS and its
  successors exist, are more complicated than general relativity, and several
  were ruled out by the measured speed of gravitational waves.
- **The interpolating function.** It is chosen, not derived. The theory fixes
  only the two limits.
- **The external field effect.** A system is affected by the uniform field it
  sits in, which breaks the strong equivalence principle.

The symmetric point, which the lesson also makes: dark matter owes an
explanation of why halo properties track the visible mass as tightly as the
Tully-Fisher relation says they do. Neither picture is finished, and **nothing
in Gravitas establishes either one**.

**A note on conservation.** Because the modification is applied to the total
field rather than pair by pair, the force between two bodies is no longer
derived from a potential in the usual way and momentum is not conserved for an
isolated pair. The conservation readout reports this as a caveat whenever MOND
is running.

---

## The lesson

**The Missing Mass**, <!--fact:steps:missing-mass-->33<!--/fact-->
steps, <!--fact:duration:missing-mass-->45-60 min<!--/fact-->. It makes one
argument, and every step in it is either a measurement of that argument or a
check that the student has not been handed the conclusion.

The order is historical and pedagogical at once. The Solar System first, because
it is the case where the two ways of weighing agree and so it establishes the
method. Then a galaxy as it would be if light traced mass. Then a galaxy as
telescopes actually find it. Then Zwicky's cluster, which came first in time and
lands harder once a student has already watched one system misbehave.

Nothing in it asks a student to believe in dark matter. It asks them to make two
measurements and notice that they disagree, which is all the evidence itself
does. Near the end, "What have you actually shown?" is a short-answer question
that asks explicitly what the measurements establish and what they do not, and
its rubric gives credit for naming faint ordinary matter or modified gravity as
alternatives.

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
