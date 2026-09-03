# Fixing the scenarios the audit caught

> **Historical record.** This is the report of one fixing pass, made when the
> catalog held 43 scenarios, with the before-and-after measurements taken then.
> Its counts are the counts of that moment and are deliberately not updated;
> the catalog now holds <!--fact:scenarios-->49<!--/fact--> scenarios, and the
> current conservation audit is `npm run validate:scenarios`.

The thumbnail pass ran every scenario and wrote down five things that were
wrong with them. This is what each one turned out to be and what was done.

Four of the five shared one cause. Only two were really about the scenarios.

## How the numbers were taken

A probe drives the real application in headless Chromium, loads each of the 43
scenarios under a fixed seed, and records how many bodies survive four seconds
and what the system's mass-weighted mean velocity is. Before and after figures
come from running that probe against two checkouts minutes apart: the current
tree, and a copy with the placement changes reversed. Same machine, same seed,
same probe.

Two things the figures do not mean:

- **Survival is a health check, not a target.** Some scenarios are supposed to
  lose objects; Hungry Hungry Holes is four black holes eating things. A drop
  from 100% to 1% within seconds is a broken scenario. A drop to 60% may be the
  point of it.
- **Center-of-mass velocity is only meaningful while the mass is still there.**
  A black hole absorbing a body adds the body's mass to the hole and does not
  adjust its velocity, so every absorption changes the system's total momentum.
  In scenarios that absorb most of their mass, the number after a few seconds
  says nothing about how the scenario was initialized. Those are checked at
  t = 0 instead.

---

## The shared cause: stars were never placed

`apply_placement` in `js/ui.js` positions the objects a scenario asks for. Its
list of what to position read:

```js
const all_objects = [
  ...bh_list,
  ...planets,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
];
```

There are no stars in it. The comment above it said "excluding central stars",
which is right for the one scenario that has a central star and wrong for every
scenario with a stellar population.

Stars are created at the origin with zero velocity and positioned afterwards.
With no afterwards, they stayed there. Ten of the 43 scenarios were opening with
their entire stellar population stacked at a single point, usually on top of a
black hole: 14 stars in Black Hole Billiards, 30 in Star Frisbee, 50 in Quasar
Cannon and Hungry Hungry Holes, 100 in Stellar Nursery and Alien Dyson Swarm
Collapse, 200 in The Pinwheel Galaxy Core, 300 in Tidal Arm Tango. Star merging
is on in most of them, so the pile collapsed into one object and was swallowed
within a few seconds.

Three further faults were found in the same function while fixing it.

**The central body was placed like everything else, and then told to orbit
itself.** `Circular` and `Multi-Ring` pick the most massive gravitating body as
the thing everything else goes around, but that body was still in the list of
things to position. It got a ring slot, and then a velocity for a circular orbit
at a separation of zero, guarded only by `Math.max(1e-6, ...)`. The Pinwheel
Galaxy Core opened with a center-of-mass velocity of 811 units per time unit
from this alone. The central body is now chosen first, anchored at the origin
and held out of the placement loop.

**Nothing checked whether the placement volume was inside the central body.** A
black hole's drawn radius grows as the cube root of its mass and takes no notice
of `sim_size`. Black Hole Billiards put a radius-505 hole at the center of a
region 300 units across, so every object was created inside it. There is now a
keep-out radius of 2.5 times the central body's own radius, and the placement
volume grows to accommodate it.

**`Random` placement gave orbital-scale distances and random velocities.**
Nothing given a few tens of units per time unit a thousand units from a
supermassive black hole is doing anything except falling in. Where one mass
dominates, objects now get a circular orbit about it with the random component
as a perturbation.

That last change is the only one with a judgment call in it, because an
isotropic spread of random velocities is the _right_ starting condition for a
self-gravitating cluster, and a disk would be a fiction. The threshold is a mass
ratio of 3, taken from the catalog rather than picked out of the air: of the
scenarios that place randomly, the ones this helps sit at ratios of 12, 20, 110,
1900 and upwards, and the cluster-like ones sit at 0.35 and below. Nothing in
the library falls in between, so the boundary is not delicate.

### Systems that opened already coasting

Placement assigns each body a velocity for its own orbit and never checked what
they sum to. A system presented as self-contained should not drift across the
view, so `zeroNetMomentum` now moves the whole system into its own
center-of-mass frame. It is a change of reference frame, not of the dynamics.

Eight scenarios reposition their own objects after placement runs and unbalanced
it again, so the rebalance is applied once more at the end of `build_simulation`
under the same guard placement uses. Scenarios built entirely by hand keep the
`Empty` placement and are left alone, which is deliberate: Interstellar Visitor
and Rogue Encounter are about something arriving from outside and are supposed
to be moving.

### A duplicate central star

Kuiper Belt, Rogue Encounter and Solar System are each handed a central star,
and each also asks for `num_stars: 1` meaning that same star. They were getting
two: one anchored at the center and one randomly generated with a mass anywhere
up to about six solar masses. Once stars were being placed, the spare was
dropped into the belt it was supposed to be lighting. The loop now counts from
what already exists.

---

## The five findings

### 1. Black Hole Billiards opened inside its own horizon

**Was.** `bh_masses: [1e6, 10, 10, 10]`. A million solar masses gives a drawn
radius of 505 units; the camera's half-width at the scenario's own zoom is 480.
The thumbnail was a black rectangle, and the capture tool carried a `boost: 0.06`
override - a sixteen-fold pull-back - purely to find anything to photograph. The
comment in the scenario promised "3 small BHs orbiting a supermassive one
(handled in initialization)". No such initialization existed.

**Now.** Two thousand solar masses, giving a radius of 78: small enough to see
around, still four times the radius of the three that orbit it. The three light
holes are put on staggered circular orbits, which is what the comment claimed
all along. Trails lengthened so the orbits are visible in a still frame.

Survival over four seconds went from 9% to 47%, and no scenario in the library
now starts with the camera inside a horizon.

### 2. Binary Star System carried a net center-of-mass velocity

**Was.** Two stars of 1.2 and 0.8 solar masses given equal and opposite
_speeds_:

```js
new StarObject({ x: -60, y: 0 }, { x: 0, y: 12 }, 1.2);
new StarObject({ x: 60, y: 0 }, { x: 0, y: -12 }, 0.8);
```

Equal and opposite speed is not equal and opposite momentum. 1.2 × 12 against
0.8 × 12 leaves 2.4 units per time unit of net drift, which is exactly what the
audit measured. The pair walked out of frame.

**Now.** Positions and velocities are both split by the mass ratio about the
barycenter, so the net momentum is zero by construction. Measured
center-of-mass velocity is 0.00.

Two further faults showed up once it stopped drifting. Its planets, giants and
asteroids all circulate the same way and their momentum does not cancel on its
own, so the scenario rebalances after building them. And a 120-unit binary needs
a bounded integration step: at six times speed the separation fell from 120 to
85 in twenty seconds and the stars merged. Binary Pair already carried
`max_timestep` for this reason; Binary Star System now does too.

### 3. Tidal Disruption Event showed no disruption

**Was.** The scenario had `num_stars: 0`.

Tidal disruption is only ever applied to stars - `updatePhysics` iterates
`stars` and calls `tidal_mass_loss` - so there was nothing in the scene that
could be disrupted. Its three planets, one gas giant and fifty asteroids were
left at the origin by an `Empty` placement, inside a hole of radius 78, and
absorbed on the first frame. The title promised a star being pulled apart and
the scene delivered a merger.

**Now.** One star on a plunging orbit. Periapsis is set at 1.5 times the hole's
radius: inside the tidal radius, which is three times the radius, and outside
the absorption radius, which is the radius plus six. It is started partway down
the infall rather than at apoapsis so the first passage happens within seconds
of opening the scenario.

Measured over 35 seconds, the star is stripped on each passage - 1000, then 904,
803, 746, 644 mass units - shedding a debris stream that peaks around 28
particles at closest approach and is then accreted. It survives to be torn apart
again, which is the behavior the name describes.

### 4. Six black-hole scenarios were indistinguishable

**Was.** Supernova Remnant, Tidal Disruption Event, Quasar Cannon, The Pinwheel
Galaxy Core, Tidal Arm Tango and Black Hole Billiards all rendered as the same
featureless disc with a cosmetic jet. The audit's hypothesis was that their
`preset_zoom` values were too tight.

That was a reasonable read from the thumbnails and it was not the cause. Four of
the six are in the ten scenarios whose stars were never placed. They looked
alike because by the time anyone saw them there was nothing left in them to tell
apart.

**Now.** With placement fixed they keep their populations and each shows its own
structure:

| Scenario                 | Bodies surviving 4s, before → after |
| ------------------------ | ----------------------------------- |
| Quasar Cannon            | 1% → 99%                            |
| Supernova Remnant        | 0% → 69%                            |
| Tidal Arm Tango          | 2% → 67%                            |
| The Pinwheel Galaxy Core | 0% → 45%                            |
| Black Hole Billiards     | 9% → 47%                            |
| Tidal Disruption Event   | rebuilt, see above                  |

`Circular` was also changed. Every object went on one ring at exactly 0.7 of the
bounds, which put The Pinwheel Galaxy Core's 200 stars about nine units apart -
closer than the stars are wide - and merged the population into a couple of
black holes within seconds. A golden-angle spiral fills an annulus evenly at any
count, which is also what a galaxy core should look like.

The two capture overrides that existed only to work around broken scenarios have
been retired: Black Hole Billiards no longer needs its sixteen-fold pull-back,
and Tidal Disruption Event is now framed on a star being stripped at periapsis.

### 5. Binary Pair and Binary Star System drew no visible trail

This one is not a scenario fault. It is a renderer fault, and it could not have
been fixed by configuration - the audit tried a trail forty times longer and got
nothing, which is the clue.

**Was.** Trail brightness in `js/render.js` was scaled against a hard-coded
speed of 50 sim units per time unit:

```js
const velocity_factor = Math.min(1, obj.trail[i].velocity / 50);
const intensity = age_factor * velocity_factor;
if (intensity > 0.05) {
  /* draw */
}
```

Binary Pair is two solar masses at four AU. It orbits at 1.58 units per time
unit, giving every point in its trail an intensity of 0.032 against a draw
threshold of 0.05. The trail was computed, aged, stored and then skipped on
every single frame. Binary Star System sat just above the threshold and drew at
an alpha of 0.24, which is why it read as nothing rather than as absent.

Any object slower than 2.5 units per time unit was invisible. Scenarios whose
entire subject is an orbit drew two dots.

**Now.** Brightness is scaled against the fastest point in the object's own
trail, with a floor so a near-circular orbit - which has no speed variation to
show - does not sit at the bottom of the ramp. That keeps what the cue was for,
periapsis brighter than apoapsis, and makes it scale-free, so a slow binary and
a black-hole inspiral both read. The same constant appeared twice more in the
`Cloud` style and was fixed with it.

---

## Result across the library

15 scenarios measurably improved. No scenario opens inside a horizon. Every
scenario that places its own objects now starts with a center-of-mass velocity
of zero, verified at t = 0.

Three scenarios report a larger drift after four seconds than before: Star
Cluster, Stellar Graveyard and Black Hole Billiards. All three measure exactly
0.00 at t = 0. Their drift is accumulated afterwards, from black holes absorbing
bodies without taking on their momentum, and Stellar Graveyard has absorbed 98%
of its mass by then. That is engine behavior, it predates this work, and
nothing here changed it.

`npm test` passes 726 tests across 19 suites. All 43 thumbnails were regenerated
from the fixed scenarios.

## Resolved in a later pass

The three items below were left alone in the pass above and have since been
fixed. Details, with the numbers, are in `PHYSICS_VALIDATION.md`.

- **Absorption now conserves momentum.** `check_absorption` merged the mass into
  the hole and left its velocity untouched. It now applies the same perfectly
  inelastic update the black-hole/black-hole merger already used - the hole moves
  to the pair's centre of mass and takes the mass-weighted mean velocity - so
  mass, linear momentum and the centre of mass are all conserved exactly. The
  angular momentum of the pair about its own centre of mass cannot be: a hole is
  a point mass with no spin, so that term is banked in
  `spin_angular_momentum`, bounded by `mu (r_horizon + ABSORB_BUFFER) |v_rel|`,
  and checked. Static holes and one-way-gravity scenarios keep the old behaviour
  on purpose - the hole is not a dynamical participant in either - and the
  momentum that then goes nowhere is recorded in a discarded total rather than
  vanishing unnoticed. Ten checks in the `Absorption` group.
- **Tidal disruption reaches all four classes.** `updatePhysics` iterated `stars`
  alone, so the working `tidal_mass_loss` on `Planet`, `GasGiant` and `Comet` was
  dead code. All four are iterated now. `GasGiant`'s destruction threshold had to
  be repaired first: a bare `this.mass <= 0.5` from when `JUPITER_MASS_UNIT` was
  50, which the corrected constant silently turned from a hundredth of a Jupiter
  into half a Jupiter, so every gas giant would have been destroyed on arrival.
  Tidal stripping is a mass sink and is now reported as one by
  `conservationCaveats()`. Five checks in the `Tidal disruption` group.
- **`Kuiper Belt` keeps its named objects.** All eight - Pluto, Eris, Haumea,
  Makemake, Quaoar, Sedna, Orcus and Varuna - are built with published masses and
  survive startup. They are all `Planet`s: the four that were previously built as
  `GasGiant`s were only there because that array had spare entries, which put
  four gas giants in a Kuiper Belt. The scenario's `num_gas_giants` is 0 now, and
  the radial ladder is ordered by real semi-major axis rather than arbitrarily.
  The scenario went from 305 bodies to 309, and its energy drift over 20 s from
  8.4e-6 to 4.9e-7. Covered by `e2e/scenarioContract.spec.js`.

## Left alone, on purpose

- **Stellar Graveyard, Compact Object Zoo, Galactic Center and Hungry Hungry
  Holes still lose most of their bodies within seconds.** All are improved and
  none is fixed. They were not among the audit's findings and rebalancing them
  is scenario design rather than defect repair.
