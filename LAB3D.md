# The 3-D small-N kernel

A 3-D Newtonian engine for small numbers of bodies. It runs only in
disposable Worker realms, with explicit state and nothing from the 2-D
engine. It is the production form of the design VALIDATED_3D_LAB_GATE.md
accepted (verdict B, staged), and is `gravitas.lab3d` 1.0.0.

There is no student renderer here. The diagnostic page, `/lab3d/`, runs the
reference problems or any system file and shows numbers and plain plots.

## What it is for, and what it is not

**Supported:**
- **Bodies:** 2 to 50 point masses, and massless test particles that feel the
  massive bodies and pull on nothing.
- **Mergers:** perfect mergers on contact.
- **Orbital elements and frames:** elliptic and hyperbolic elements, and
  barycentric, body-centered and corotating frames as views.
- **Units:** code units (G = 1) or AU, days and solar masses.

**Excluded, and not claimed:**
- large N and cluster dynamics;
- softening as a model of anything;
- relativity;
- spin, tides and non-spherical bodies;
- drag, radiation and gas;
- ephemeris time scales.

## State: `gravitas.system3d/1`

```text
{
  format: 'gravitas.system3d', formatVersion: 1,
  units: 'code' | 'solar',
  integrator: { scheme, h } | { scheme: 'dopri5', tol },
  t: 0,
  bodies: [{ id, name?, m, radius, x: [3], v: [3] }],
  provenance?: { from, note? }
}
```

**Units** are a system, not a label per number, so G follows from them:
- **code:** G = 1.
- **solar:** AU, days and solar masses, with G = k². k = 0.01720209895 is the
  Gaussian gravitational constant, so G = 2.959122082855911e-4 AU³ M☉⁻¹ d⁻².

`convertUnits()` scales length, time and mass together. It refuses any set
of scales that does not carry G to the target's G to a part in 10¹²: that is
the dimensional check.

**Numbers, never a recipe.** A body is its position and velocity. Different
engines round `sin` and `cos` differently, so a system rebuilt from its
elements in two engines is already two systems. Elements are converted once,
by `placeByElements()`, and the numbers are what is saved and run.

**Refused, with a code** (`validateSystem()`):
- **Shape and fields:** an unknown field, format or unit system; a scheme
  outside the five; a step of zero or less; a tolerance outside 1e-14 to
  1e-6.
- **Ambiguity:** a step on the adaptive scheme, a tolerance on a fixed-step
  one, or elements on a body (a body is its numbers).
- **Bodies:** a negative mass; a vector that is not three finite numbers; two
  bodies in one place, or already touching; a duplicate id; no body with mass;
  fewer than 2 bodies or more than 50.
- **Hostile files:** anything the investigation pack's structural guard
  refuses (prototype keys, non-data values, non-finite numbers, oversized or
  over-deep files), for that one reason.

**Migration** (`migrateSystem()`):
- a `gravitas.system3d/1` passes through as it is;
- a `gravitas.orbital-system/1` (the 2-D Orbital System Builder's file)
  becomes a 3-D system from its recorded initial numbers, not rebuilt from
  its elements. It lies in the plane z = 0, the file's G is folded into the
  masses, and the bodies are points because the file records no radii;
- a newer version, or anything else, is refused and said so.

## Integrators

| Scheme | Order | Symplectic | Force evaluations a step | Use |
|---|---|---|---|---|
| `yoshida4c` (the default) | 4 | yes | 6 | Yoshida (1990), three leapfrogs, with Kahan-compensated kicks and drifts: long runs, conservation to rounding |
| `yoshida4` | 4 | yes | 6 | the same without compensation |
| `leapfrog` | 2 | yes | 2 | the simplest to teach |
| `rk4` | 4 | no | 4 | for showing why symplectic matters |
| `dopri5` | 5(4), adaptive | no | 6 a step tried | Dormand and Prince (1980): close approaches and secular runs of a few cycles |

**The same numbers give the same bytes in every engine.** The force loop,
the integrators, DOPRI5's step control and the merger's cube root use only
`+ - * /` and `Math.sqrt`, which IEEE 754 fixes to the last bit:
- Yoshida's weights are literals;
- the step factor 0.9 err^(-1/5) is found by Newton's method on y⁵ = 1/err;
- the cube root is Newton's method too.

`tests/lab3d.test.js` fails if `Math.pow`, `Math.cbrt`, `Math.exp`,
`Math.log`, `Math.sin`, `Math.cos` or `**` appears in the kernel. The gate's
R9 showed identical bytes in Node, Chromium, Firefox and WebKit.

**Choosing:**
- The default suits every long run of well-separated bodies.
- A scenario with a close approach, or a secular evolution (Kozai-Lidov),
  declares `dopri5`.
- A fixed step that moves a pair by more than a tenth of their separation in
  one step raises the `unresolvedEncounter` warning.
- `rk4` and `dopri5` raise `nonSymplectic`.

## A run

`createRun(system, options)` in `js/lab3d/engine.js`, and in a Worker through
`js/lab3d/api.js`.

- **Options:**
  - `span` and `samples`;
  - `positions` and `velocities`, to record them in samples;
  - `closeWithin`: report a pair's separation minimum below this distance;
  - `escapeBeyond`: report a body unbound from the rest and farther than
    this;
  - `crossings`: the bodies whose passage through z = 0, in the barycentric
    frame, to report;
  - `limits`.
- **Result:**
  - `samples`: at each sample, t, the relative energy error, the relative
    change of the angular momentum vector, and the change of the total
    momentum relative to the largest body momentum at the start;
  - `events`: mergers with the kinetic energy lost and what the merger did to
    mass and momentum; close approaches with their distance; escapes;
    crossings with their direction;
  - `residuals`: the largest of each error;
  - `warnings`;
  - `stats`: force evaluations, steps, rejected steps and wall time;
  - `status`.
- **Statuses:**
  - `ok`;
  - `canceled`;
  - `evalLimit`: 4e8 force evaluations by default;
  - `timeLimit`: 10 minutes by default;
  - `notFinite`;
  - `empty`: every massive body has merged into one.
- **Limits.** `limits` may raise the defaults only up to fixed ceilings: 2e9
  evaluations, an hour, 100,000 samples and 20,000 events.
- **Refusals** happen before a run, never during it: an invalid system, a
  span or sample count out of bounds, or a crossing asked of a body that does
  not exist.

**Cancellation.** A run advances in slices of about 30 ms and yields between
them, so `cancel()` is read within a slice. Terminating the Worker ends it
at once, and that is what the scheduler does to a trial past its limit.

## The capability API: `gravitas.lab3d` 1.0.0

`js/lab3d/api.js`. `createLab3d({spawn})` returns a client with three
methods:
- `run(system, options)`;
- `reference(problem)`: a reference problem, made, run and checked, the
  checks' extra runs included;
- `bench()`: steps a second for each fixed scheme and body count.

Each request gets a fresh Worker, which answers a `hello` with its API
version. The client refuses a Worker of another major version. The protocol
is in `js/lab3d/workerCore.js`.

`capabilities/lab3d.json` declares the model (`lab3d-small-n`) and the route
(`/lab3d/`). It has no entry in the application's lazy registry: the kernel
is not code the application can load, only the Worker and its page. The
kernel's modules are precached as optional.

## Experiments

A `gravitas.experiment/1` can name a 3-D model instead of a 2-D scenario:

```text
model: { kind: 'lab3d', api: '^1.0.0', system: <gravitas.system3d/1> }
```

It runs through the experiment scheduler (`js/experiments/scheduler.js`),
each trial in a fresh Worker, with the scheduler's concurrency, timeouts,
result caps and checkpoints. `js/lab3d/experiment.js` has the details:

- **Seeds** nudge every body by `perturb`. The direction is found by
  rejection in the unit cube, with only `+ - * /`, so a seed gives the same
  numbers in every engine.
- **`vary`** takes one parameter over explicit values: `integrator.h`,
  `body:<id>.m` or `body:<id>.speed`.
- **Metrics:** `energyDrift`, `angularMomentumDrift`, `momentumDrift`;
  `minSeparation` and `maxEccentricity` of a pair; `escaped` of a body.

The 2-D manifest validator refuses a 3-D manifest (it has no scenario),
which is right, since the two are run by different realms.

## Validation

`npm run validate:lab3d` runs the reference problems of
VALIDATED_3D_LAB_GATE.md through the production engine. Each uses the
tolerance the gate fixed before any code existed, and the run is in the
check registry (`tools/checks.mjs`, id `lab3d`), so the gate and CI both run
it.

Two measures differ from the gate's first SPEC, both on the gate's own
recommendation:
- energy is sampled 25 times an orbit;
- R4's instability check is the largest distance from L1 reached, not the
  distance at the end.

R7's deflection is measured as `atan2(|u × w|, u · w)`: `acos` of a cosine
so close to 1 cannot tell 1e-9 rad from 0, and the gate's first figure for
it, 2.1e-8 rad, was that floor. The deflection error is 1.4e-10 rad.

The table below is written by `node tools/validate-lab3d.mjs --write`:

<!-- lab3d:validation -->
<!-- /lab3d:validation -->

## Throughput

`node tools/lab3d-bench.mjs` measures steps a second in a Worker in each
engine, and in Node. The low-end profile is modelled as a quarter of the
slowest desktop engine: Chromium cannot slow a Worker down to measure one,
which is the experiment manifest's convention (`PROFILES`). No phone was
measured.

<!-- lab3d:throughput -->
<!-- /lab3d:throughput -->

## Supported body counts and time spans

What a run can promise at the default scheme and a step of 1/1000 of the
shortest orbit, from the throughput table:

<!-- lab3d:envelope -->
<!-- /lab3d:envelope -->

## Where the engine refuses or warns

| Regime | What happens |
|---|---|
| More than 50 bodies, or fewer than 2 | Refused (`bodyCount`) |
| A parabolic orbit (e = 1) from elements | Refused (`parabolic`): it has no finite a |
| Bodies placed in contact | Refused (`overlap`, `coincident`): which merger was meant is not to be guessed |
| A close approach under a fixed step | Warned (`unresolvedEncounter`); declare `dopri5` |
| RK4 or DOPRI5 | Warned (`nonSymplectic`): energy and angular momentum drift over long runs |
| A long run at a fine step | Stopped at the evaluation or time limit, and said so |
| A run that stops being finite | Stopped (`notFinite`) |
| Every massive body merged into one | Stopped (`empty`) |

## Where it lives

| Path | What it is |
|---|---|
| `js/lab3d/kernel.js` | State, forces, integrators, mergers, conserved quantities, the state hash |
| `js/lab3d/elements.js` | Orbital elements, Kepler's equation, frames |
| `js/lab3d/state.js` | `gravitas.system3d/1`, units, migration, seeded nudges |
| `js/lab3d/engine.js` | A run: slices, limits, samples, events, residuals, warnings |
| `js/lab3d/workerCore.js`, `js/lab3d/worker.js` | The Worker and its protocol |
| `js/lab3d/api.js` | The capability API and client |
| `js/lab3d/experiment.js` | 3-D experiments through the scheduler |
| `js/lab3d/references.js` | The reference problems and their tolerances |
| `lab3d/index.html`, `js/lab3dPage.js` | The diagnostics page |
| `tools/validate-lab3d.mjs`, `tools/lab3d-bench.mjs` | Validation and throughput |

Tests:
- `tests/lab3d.test.js`: properties, round trips, refusals, determinism,
  events, the protocol and experiments;
- `e2e/lab3d.spec.js`: the page in both targets.

References:
- Yoshida, H. 1990, Phys. Lett. A 150, 262;
- Dormand, J. R. and Prince, P. J. 1980, J. Comput. Appl. Math. 6, 19;
- Chenciner, A. and Montgomery, R. 2000, Ann. Math. 152, 881;
- Danby, J. M. A. 1988, *Fundamentals of Celestial Mechanics* (the Kepler
  solver's starting value).
