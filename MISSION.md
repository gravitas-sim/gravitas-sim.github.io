# The mission-design core

An educational astrodynamics capability built on the explicit 3-D engine
(LAB3D.md). It covers:
- impulsive transfers between circular orbits;
- plane changes;
- rendezvous and phasing;
- Lambert's problem;
- patched-conic departures and captures;
- transfer windows;
- unpowered flybys.

Each solver says what it assumed, and how it converged or why it refused.
The 3-D kernel checks each one independently.

**It is not operational mission design or navigation.** In this model:
- the planets move on circles in one plane;
- burns are instantaneous;
- only the bodies named pull.

Every page, table and plan file says so. The plan file carries
`"notFor": "operational mission design or navigation"`.

- **The page:** `/mission/`, a diagnostic page, not a curriculum.
- **The code:** `js/mission/`, the capability `gravitas.mission` 1.0.0
  (`capabilities/mission.json`).
- **The validation:** `npm run validate:mission`, which is also a CI step.

## How it is arranged

- **Where it runs:** every solve runs in a Worker (`js/mission/worker.js`),
  never on the page.
- **The client:** `js/mission/api.js`, `createMission({spawn})`, sends each
  request to a fresh Worker and ends it afterwards.
- **The protocol** (`js/mission/workerCore.js`):
  - `solve` answers one problem;
  - `window` computes a transfer window in slices of about 30 ms;
  - `validate` runs the reference cases;
  - `cancel` stops a window or the validation between slices.
- **Resource bounds, checked before any work starts:**
  - a window has at most 40,000 cells and 400 steps along either axis;
  - it stops at a wall-clock limit (two minutes by default, ten at most)
    with status `timeLimit`;
  - `terminate()` ends the Worker at once.
- **Iteration bounds:** Kepler's problem and Lambert's problem each have an
  iteration limit of 200, and the plane-change search 100.

## Model inputs, approximations and derived outputs

These are kept apart in the code, on the page and in the plan file.

**Inputs (exact):** what the reader chose, in one unit set:
- km, s and km/s;
- km³/s² for GM;
- radians inside the code, degrees on the page;
- dates as days from J2000.0 (TT).

**The model's constants** (`js/mission/bodies.js`) are inputs of the model,
stated once:
- **GM and equatorial radii:** the rounded IAU/JPL standard values;
- **planets' mean semi-major axes and J2000 mean longitudes:** Standish,
  "Keplerian Elements for Approximate Positions of the Major Planets"
  (JPL), for 1800 to 2050;
- **the AU:** exact by IAU 2012 Resolution B2.

**Approximations,** by id (`js/mission/plan.js` APPROXIMATIONS). A plan
lists the ones its result rests on.

| id | What it means |
|---|---|
| `impulsive` | Burns are instantaneous velocity changes: no finite-burn or gravity losses |
| `pointMass` | Every body is a point mass: no oblateness (J2), no atmosphere |
| `twoBody` | Only the central body pulls |
| `circularOrbits` | Start and end orbits are circles |
| `coplanarPlanets` | The planets move on circles in one plane at the Kepler rate: no eccentricity, inclination or perturbations. A real window needs an ephemeris (Prompt 39) |
| `patchedConic` | Inside a sphere of influence only the planet pulls, outside only the Sun; the sphere is a point in the heliocentric leg |
| `zeroRevolution` | Lambert transfers go less than one revolution |
| `planarFlyby` | A flyby is unpowered and in one plane |

**Derived outputs:**
- speeds, times and angles;
- a delta-v budget (every burn, its time and size, and the total);
- an event timeline;
- the solver's own report: its status, iterations and residuals.

## The solvers

| Module | What it solves | Method |
|---|---|---|
| `twobody.js` | Kepler's problem: a state carried by a time, on any conic | Universal variables with Stumpff functions (Bate, Mueller and White 1971, ch. 4; Curtis, algorithm 3.4). Newton's method inside a bracket that always holds the root; the equation is monotonic, since its derivative is the radius |
| `lambert.js` | The conic from r1 to r2 in a given time, zero revolutions | Universal variables (Bate, Mueller and White, section 5.3; Curtis, algorithm 5.2). The time of flight rises monotonically with z, so the root is unique and bracketed. Solved by Illinois false position, with a bisection whenever a step fails to halve the bracket |
| `transfers.js` | Hohmann, bi-elliptic and its limit, plane changes, a combined burn, the best split of a plane change, rendezvous, phasing | Closed forms; golden-section search for the split (the total is convex in it) |
| `patched.js` | Spheres of influence, departure and capture burns, an interplanetary Hohmann transfer, flybys | Laplace's sphere, r = a (m / M)^(2/5); the hyperbolic excess relations; δ = 2 asin(1 / e) |
| `window.js` | A transfer window: a Lambert solve per departure date and flight time | `lambert.js` on the model planets, with the burns from and into circular parking orbits |
| `verify.js` | The independent check | The 3-D kernel's Dormand-Prince integrator, in canonical units (G = 1, the central mass 1 at rest, the spacecraft a massless test particle), tolerance 1e-13 |

### How Lambert's problem refuses

Every refusal has a code, and the page and the plan file carry it; no
velocities go with a refusal.

| Code | When |
|---|---|
| `input` | A number that is not finite, μ ≤ 0, a zero radius, a time ≤ 0 or an unknown direction |
| `revolutions` | More than zero revolutions: not supported |
| `collinear` | r1 and r2 point the same way within 1e-3 rad: every plane holds them |
| `antipodal` | r1 and r2 point opposite ways within 1e-3 rad (0.057°) |
| `branchAmbiguous` | The transfer plane contains the reference pole, so prograde and retrograde are the same |
| `tooFast` | The time is shorter than the branch can reach before its terms lose all their digits |
| `noConvergence` | The iteration limit came first |
| `checkFailed` | The answer, propagated independently by `twobody.js`, misses r2 by more than 1e-8 of the radius |

The thresholds are measurements, not guesses:

- **Near 180°, the velocities lose digits as 1 / sin² Δθ, not 1 / sin Δθ.**
  Measured against the 3-D kernel on the Earth-Mars geometry:

  | Offset from 180° | Miss at r2 |
  |---|---|
  | 1° | 1e-12 |
  | 0.1° | 3.7e-10 |
  | 0.05° | 1.5e-9 |
  | 0.01° | 2.1e-8 (about 3 km at Mars) |

  With the first threshold, 1e-4 rad, the 0.01° case was solved and then
  refused by its own check. The threshold is now 1e-3 rad, where rounding
  costs about 1e-10.
- **On the long way, t(z) is the difference of two terms that grow without
  bound as z falls.** At z = -1e5 both are 1e60, and the difference is
  rounding. The bracket steps down only while those terms are within 1e5 of
  the time asked for, which keeps F to about 1e-11 of it. A root further
  down is `tooFast`.
- **Long ways within about 5° of a full turn put the root near z = 4π².**
  There t(z) is so steep that doubles resolve it poorly. At 355-359° over
  days, the answers miss r2 by 1e-8 to 1e-4 of the radius, so the
  independent check refuses them as `checkFailed`. The rate:
  - 0.015% of random problems from low orbit to lunar distance with flight
    times of 10 minutes to 12 days (tests/mission.test.js holds it under
    0.1%);
  - 3% when flight times go down to 100 seconds, where 300° long-way
    hyperbolas at hundreds of km/s appear.

## Supported transfer classes

- Hohmann transfers between coplanar circular orbits, up or down, about any
  of the model's bodies.
- Bi-elliptic transfers through an intermediate apoapsis at least as high
  as both orbits, and their limit as it goes to infinity.
- Plane changes:
  - alone;
  - combined with a speed change in one burn;
  - split between a Hohmann transfer's two burns, at any split or the one
    that costs least.
- Rendezvous with a target on another coplanar circular orbit by a Hohmann
  transfer: the lead angle, the wait, the synodic period.
- Phasing on one circular orbit in 1 to 20 laps, refused when the phasing
  orbit would pass below the surface.
- Lambert's problem with zero revolutions:
  - prograde or retrograde about any pole;
  - elliptic or hyperbolic;
  - with the refusals above.
- Patched-conic departures from, and captures into, circular parking orbits
  between the model planets (Venus, Earth, Mars, Jupiter), and the
  interplanetary Hohmann transfer.
- Transfer windows on the model planets' circular orbits:
  - departure C3, arrival excess speed and the total from 300 km parking
    orbits;
  - refused cells shown as holes;
  - up to 40,000 cells.
- Unpowered flybys in one plane: the turn angle, the velocity change and
  the outgoing excess velocity. A periapsis below the surface is refused.

## Not supported

- **Multi-revolution Lambert transfers.** `revolutions` must be 0.
- **Finite or low-thrust burns.** Every burn is impulsive.
- **Real planetary positions.** The planets move on circles in one plane,
  so a window's dates are the model's, not the sky's. Prompt 39's
  ephemeris packs are where real positions come from.
- **Trajectories flown under every body at once.** The 3-D kernel checks
  the solvers, and M1 measures the patched conic against three bodies, but
  no trajectory is designed that way.
- **Oblateness, drag, radiation pressure or relativity.**
- **Powered flybys, sequences of flybys, and flyby targeting in three
  dimensions (the B-plane).**
- **Orbit determination, navigation, or operations of any kind.**
  This is not operational mission design or navigation.

## Reference residuals

`npm run validate:mission` runs every case in `js/mission/references.js`.
There are three kinds, so that no solver is checked only against itself:
- **textbook:** a worked example as printed, in the book's own constants, to
  half a unit in its last place;
- **analytic:** a closed-form constant derived independently of the code,
  such as the root of a cubic;
- **independent:** the 3-D kernel flying the solver's answer.

Every tolerance is fixed in the case and argued in its `why`.

<!-- mission:validation -->
| # | Case | Kind | Measured | Value | Expected | |
|---|---|---|---|---|---|---|
| L1 | Lambert: Curtis, example 5.2 | textbook | solver status | ok | = ok | pass |
| L1 | Lambert: Curtis, example 5.2 | textbook | \|v1 - printed\| | 5.2e-5 | 0 ± 8.7e-5 km/s | pass |
| L1 | Lambert: Curtis, example 5.2 | textbook | \|v2 - printed\| | 4.3e-5 | 0 ± 8.7e-5 km/s | pass |
| L1 | Lambert: Curtis, example 5.2 | textbook | kernel miss at r2 | 1.3e-13 | 0 ± 1.0e-9 | pass |
| L2 | Lambert: Vallado, example 7-5 | textbook | solver status | ok | = ok | pass |
| L2 | Lambert: Vallado, example 7-5 | textbook | \|v1 - printed\| | 7.4e-7 | 0 ± 2.8e-6 km/s | pass |
| L2 | Lambert: Vallado, example 7-5 | textbook | \|v2 - printed\| | 7.7e-7 | 0 ± 2.8e-6 km/s | pass |
| L2 | Lambert: Vallado, example 7-5 | textbook | kernel miss at r2 | 1.5e-13 | 0 ± 1.0e-9 | pass |
| L3 | Lambert: both branches, an ellipse and a hyperbola | independent | retrograde status | ok | = ok | pass |
| L3 | Lambert: both branches, an ellipse and a hyperbola | independent | retrograde h_z sign | -1 | -1 ± 0 | pass |
| L3 | Lambert: both branches, an ellipse and a hyperbola | independent | retrograde kernel miss | 2.2e-13 | 0 ± 1.0e-9 | pass |
| L3 | Lambert: both branches, an ellipse and a hyperbola | independent | fast conic | hyperbola | = hyperbola | pass |
| L3 | Lambert: both branches, an ellipse and a hyperbola | independent | fast kernel miss | 7.7e-15 | 0 ± 1.0e-9 | pass |
| L4 | Lambert approaches the Hohmann ellipse near 180 degrees | analytic | 0.1 degrees: status | ok | = ok | pass |
| L4 | Lambert approaches the Hohmann ellipse near 180 degrees | analytic | \|v1\| / Hohmann perihelion speed - 1 | 6.0e-8 | 0 ± 1.0e-3 | pass |
| L4 | Lambert approaches the Hohmann ellipse near 180 degrees | analytic | kernel miss at r2 | 3.7e-10 | 0 ± 1.0e-9 | pass |
| L4 | Lambert approaches the Hohmann ellipse near 180 degrees | analytic | 0.01 degrees: status | antipodal | = antipodal | pass |
| L4 | Lambert approaches the Hohmann ellipse near 180 degrees | analytic | 180 degrees: status | antipodal | = antipodal | pass |
| K1 | Kepler's problem against the kernel | independent | ellipse: propagator vs kernel | 4.6e-12 | 0 ± 1.0e-9 | pass |
| K1 | Kepler's problem against the kernel | independent | hyperbola: propagator vs kernel | 4.6e-14 | 0 ± 1.0e-9 | pass |
| H1 | Hohmann, low Earth orbit to geostationary | independent | total | 3.8926 | 3.8926 ± 5.0e-5 km/s | pass |
| H1 | Hohmann, low Earth orbit to geostationary | independent | arrival radius / r2 - 1 | 3.7e-13 | 0 ± 1.0e-9 | pass |
| H1 | Hohmann, low Earth orbit to geostationary | independent | radial speed / speed | 1.1e-12 | 0 ± 1.0e-9 | pass |
| H1 | Hohmann, low Earth orbit to geostationary | independent | arrival speed / closed form - 1 | 3.0e-13 | 0 ± 1.0e-9 | pass |
| H2 | Hohmann's cost peak and the bi-elliptic crossover | analytic | peak ratio | 15.582 | 15.582 ± 1.0e-5 | pass |
| H2 | Hohmann's cost peak and the bi-elliptic crossover | analytic | crossover ratio | 11.939 | 11.939 ± 1.0e-5 | pass |
| H2 | Hohmann's cost peak and the bi-elliptic crossover | analytic | bi-elliptic with rb = r2 minus Hohmann | 0 | 0 ± 1.0e-14 | pass |
| H3 | Bi-elliptic transfer, flown by the kernel | independent | arrival radius / r2 - 1 | 3.0e-13 | 0 ± 1.0e-9 | pass |
| H3 | Bi-elliptic transfer, flown by the kernel | independent | arrival speed / closed form - 1 | 4.0e-13 | 0 ± 1.0e-9 | pass |
| P1 | Plane changes: the combined burn and its best split | analytic | law of cosines - vectors | 0 | 0 ± 1.0e-12 km/s | pass |
| P1 | Plane changes: the combined burn and its best split | analytic | slope at the split | 7.1e-9 | 0 ± 1.0e-6 km/s | pass |
| P1 | Plane changes: the combined burn and its best split | analytic | best below all at apoapsis | true | = true | pass |
| P1 | Plane changes: the combined burn and its best split | analytic | split, degrees at the first burn | 2.2002 | 2.2 ± 0.05 deg | pass |
| R1 | Rendezvous by a Hohmann transfer, flown by the kernel | independent | separation / r2 | 5.8e-13 | 0 ± 1.0e-8 | pass |
| R2 | Phasing on one orbit, flown by the kernel | independent | solver status | ok | = ok | pass |
| R2 | Phasing on one orbit, flown by the kernel | independent | separation / r | 8.1e-13 | 0 ± 1.0e-8 | pass |
| C1 | Patched conic: Earth to Mars, Curtis, example 8.3 | textbook | departure excess speed | 2.9433 | 2.943 ± 5.0e-4 km/s | pass |
| C1 | Patched conic: Earth to Mars, Curtis, example 8.3 | textbook | departure burn | 3.5897 | 3.59 ± 5.0e-4 km/s | pass |
| C2 | A departure hyperbola, flown by the kernel to the sphere of influence | independent | radius at the time / sphere - 1 | 1.1e-13 | 0 ± 1.0e-9 | pass |
| C2 | A departure hyperbola, flown by the kernel to the sphere of influence | independent | speed / vis-viva - 1 | 1.4e-13 | 0 ± 1.0e-9 | pass |
| C2 | A departure hyperbola, flown by the kernel to the sphere of influence | independent | periapsis / asked - 1 | 5.8e-14 | 0 ± 1.0e-9 | pass |
| F1 | A Jupiter flyby, flown by the kernel | independent | turn from the kernel / closed form - 1 | 1.3e-13 | 0 ± 1.0e-9 | pass |
| F1 | A Jupiter flyby, flown by the kernel | independent | periapsis from the kernel / asked - 1 | 1.4e-14 | 0 ± 1.0e-9 | pass |
| F1 | A Jupiter flyby, flown by the kernel | independent | closest sampled approach / asked - 1 | 1.4e-14 | 0 ± 1.0e-3 | pass |
| F1 | A Jupiter flyby, flown by the kernel | independent | v_inf after / before - 1 | 3.5e-13 | 0 ± 1.0e-9 | pass |
| W1 | The transfer window finds the Hohmann transfer | analytic | best total / Hohmann - 1 | 2.8e-5 | 0 ± 1.0e-4 | pass |
| W1 | The transfer window finds the Hohmann transfer | analytic | best is not below Hohmann | true | = true | pass |
| W1 | The transfer window finds the Hohmann transfer | analytic | best departure - Hohmann date | 0 | 0 ± 1 d | pass |
| W1 | The transfer window finds the Hohmann transfer | analytic | best time of flight - Hohmann | 1 | 0 ± 1 d | pass |
| W1 | The transfer window finds the Hohmann transfer | analytic | Hohmann cell status | antipodal | = antipodal | pass |
| M1 | The patched conic against three bodies (a measured approximation) | independent | greatest distance / Mars orbit - 1 | 2.2e-3 | 0 ± 0.01 | pass |
<!-- /mission:validation -->

Two of the cases are measurements more than checks:
- **M1, the patched conic against three bodies.** A Hohmann departure from
  300 km, flown by the kernel in the Sun, the Earth and the spacecraft
  together, reaches 0.22% farther than the conic's aphelion at Mars's
  orbit. That is the size of the neglect (m / M)^(2/5) ≈ 0.6% suggests.
- **W1, the window.** The Hohmann cell itself sits on the antipodal line and
  is refused. The cheapest cell is its neighbour, one day off, 2.8e-5
  dearer.

## Speed

Measured in Node 24 on the development machine, CPU time:

| Work | Cost |
|---|---|
| One Lambert solve, low orbit to lunar distance | 13 µs, 10.7 iterations on average; 16 at most in a window |
| A 200 by 200 Earth-Mars window (40,000 cells) | 0.39 s |
| The reference cases, all 16 | about 0.2 s in Node, 0.3 s in the page's Worker |

tests/mission.test.js holds a solve under 2 ms and a 40 by 40 window under
8 s of CPU in Jest, whose module realm is an order of magnitude slower.

## The plan file

A plan is `gravitas.mission-plan` 1 (`js/mission/plan.js`):
- `format`, `formatVersion`, `generator` and `notFor`;
- `kind`;
- `units`;
- `inputs` (exactly what was asked);
- `model`: the bodies' constants used, and the approximations by id;
- `derived`: the solver's answer and report;
- `budget` and `timeline`.

Non-finite numbers are written as `null`. There is no clock in it, so the
same plan makes the same bytes.

## The API

`gravitas.mission` 1.0.0: `createMission({spawn})` returns
`{api, solve(problem), window(options, {limits, onProgress}),
validate(cases, {onProgress})}`. Each returns `{done, cancel(), terminate()}`.

A problem is `{kind, ...}`, one of:

| kind | Its fields |
|---|---|
| `hohmann` | `body, r1, r2` |
| `biElliptic` | `body, r1, r2, rb` |
| `planeChange` | `body, r1, r2, di, split` (a number in [0, 1] or `'optimal'`) |
| `rendezvous` | `body, r1, r2, phase` |
| `phasing` | `body, r, ahead, laps` |
| `lambert` | `body, r1, r2, tof, direction` |
| `interplanetary` | `from, to, fromAltitude, toAltitude` |
| `flyby` | `body, vinf, rp, side` |

Radii are from the body's center, in km.

## Files

| Path | What it is |
|---|---|
| `js/mission/bodies.js` | Units, the bodies' constants, the model planets, dates |
| `js/mission/twobody.js` | Vectors, speeds, Stumpff functions, Kepler's problem |
| `js/mission/lambert.js` | Lambert's problem, bounded, with its refusals |
| `js/mission/transfers.js` | Transfers between circular orbits, plane changes, rendezvous, phasing |
| `js/mission/patched.js` | Spheres of influence, hyperbolic burns, flybys |
| `js/mission/window.js` | Transfer windows, in slices |
| `js/mission/plan.js` | Budgets, timelines, the plan file |
| `js/mission/verify.js` | The independent check by the 3-D kernel |
| `js/mission/references.js` | The reference cases and their tolerances |
| `js/mission/workerCore.js`, `worker.js`, `api.js` | The Worker, its protocol and the client |
| `js/mission/i18n.js`, `js/i18n/{en,es}.mission.js` | The page's words |
| `mission/index.html`, `js/missionPage.js` | The diagnostic page |
| `tools/validate-mission.mjs` | `npm run validate:mission` |
| `tests/mission.test.js`, `e2e/mission.spec.js` | Units, convergence, branches, refusals, determinism, speed; the page in a browser |

## Sources

- R. R. Bate, D. D. Mueller and J. E. White, *Fundamentals of Astrodynamics*
  (Dover, 1971).
- H. D. Curtis, *Orbital Mechanics for Engineering Students* (Elsevier),
  examples 5.2 and 8.3.
- D. A. Vallado, *Fundamentals of Astrodynamics and Applications*, 4th ed.
  (Microcosm, 2013), example 7-5 and algorithm 8.
- E. M. Standish, "Keplerian Elements for Approximate Positions of the Major
  Planets" (JPL Solar System Dynamics).
- IAU 2012 Resolution B2, on the astronomical unit.
