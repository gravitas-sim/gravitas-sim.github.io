# A validated 3-D lab: specification and feasibility gate

**Status: decided under delegation, not reviewed.** Carl asked for the roadmap
to run in order while he was away, with each gate decided on its
recommendation. This verdict is evidence, not a signed decision. It names the
evidence it rests on and the condition that would reverse it.

**Verdict: B, staged.** Every reference tolerance is met by an integrator
this spike built, but no single integrator meets them all:

- **Yoshida's fourth-order symplectic scheme, with compensated sums**, meets
  R1 to R5, R8 and R9.
- **Adaptive Dormand-Prince 5(4)** meets R5, R6 and R7: the close approach
  and the hierarchical secular case.

A production 3-D lab can start with the passing subset:
- a Worker-only kernel, compensated Yoshida as the default, and DOPRI5 for
  scenarios that declare it;
- initial conditions carried as numbers;
- its own page and route.

A single integrator that switches between the two needs its own validation
and is not licensed here.

**Base:** `v2` at `22a3f3e` (#92 merged, CI green).

**Prototype:** branch `spike/validated-3d-lab-gate`. The domain and every
tolerance were committed alone, as
[`spike/threed/SPEC.md`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/8fd5ce4/spike/threed/SPEC.md)
at `8fd5ce4`, before any kernel code existed. The kernel, corpus and results
are at `c9e0b4d`. The prototype is disposable and will not merge. This PR is
the decision record only.

---

## The domain

As SPEC.md fixes it.

**Included:**
- **Bodies:** small-N Newtonian point masses (2 to 50) and massless test
  particles, unsoftened.
- **Collisions:** perfect merger on contact, conserving mass and momentum,
  with the kinetic energy lost reported.
- **Frames:** an inertial integration frame, with barycentric,
  body-centered and corotating frames as views.
- **Orbital elements:** converted to and from state vectors for elliptic and
  hyperbolic orbits.
- **Time:** code units with G = 1 (production: see Architecture).

**Excluded, and neither claimed nor benchmarked:**
- large N and cluster dynamics;
- softening as a model of anything;
- relativity, including 1PN precession;
- spin, tides, non-spherical bodies, drag, radiation and gas;
- ephemeris time scales (Prompt 39's question).

## The kernel

[`spike/threed/kernel.js`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/c9e0b4d/spike/threed/kernel.js)
is 6.1 KB minified, 2.7 KB gzipped.

- It is pure: typed arrays for mass, position (3n, interleaved), velocity and
  radius. It has no DOM and no module state, so it runs unchanged in Node, a
  page or a Worker realm.
- The force loop is pairwise and symmetric, and uses only `+ - * /` and
  `Math.sqrt`, which IEEE 754 fixes to the last bit.

**Five integrators:**

| Scheme | Order | Symplectic | Force evaluations per step |
|---|---|---|---|
| Leapfrog (kick-drift-kick) | 2 | yes | 2 |
| Yoshida (1990), three leapfrogs of weights w1, w0, w1 | 4 | yes | 6 |
| Yoshida, with Kahan-compensated kicks and drifts (`yoshida4c`) | 4 | yes | 6 |
| Classical RK4 | 4 | no | 4 |
| Dormand-Prince 5(4), adaptive, first-same-as-last | 5 | no | 6 per step tried |

- **Yoshida's weights are literals, not computed.** They are
  w1 = 1.3512071919596578 and w0 = -1.7024143839193155. `Math.cbrt` is only
  approximated by the standard, and an engine that rounded it differently
  would change every run.
- **The compensated variant was added after the first results.** R3 showed a
  rounding floor, and it is reported as an addition, not as one of SPEC.md's
  four. The scheme is Yoshida's unchanged; only its additions carry their
  lost low-order bits forward, as production N-body codes do.

## The reference corpus

Tolerances are SPEC.md's, unchanged. For each scheme, the corpus tries
coarse to fine:
- 125 to 32,000 steps per reference orbit, doubling;
- for DOPRI5, local tolerances from 1e-8 to 1e-13.

The first setting that meets every tolerance of a problem wins. A run is
capped at 6e7 force evaluations (4e8 for R1). A capped run is reported as not
passing, never as passing.

| # | Problem | Met by (steps per orbit, or tolerance) | Not met by |
|---|---|---|---|
| R1 | Two-body Kepler orbit in 3-D, e = 0.6, inclined | **Yoshida 8,000**, compensated Yoshida 8,000 | leapfrog (position 5.3e-4 at 32,000), RK4 and DOPRI5 (energy error grows 3 to 10 times from 100 to 1000 orbits; DOPRI5's angular momentum drifts to 1.2e-10) |
| R2 | Inclined binary, boosted | **leapfrog, Yoshida, RK4, compensated Yoshida, all at 125** | DOPRI5 (relative orbit differs by 2.0e-8: its step control scales by absolute positions, so a boosted system takes other steps) |
| R3 | Barycentric three-body, near-circular, inclined | **compensated Yoshida 1,000** | every other scheme. Plain Yoshida meets the energy at 1,000 (1.4e-10), but its momentum, 3.8e-13 of Jupiter's, is above the 1e-13 tolerance, and stays above it at every finer step: rounding |
| R4 | Restricted three-body: L4 bounded, L1 leaves | **Yoshida 500, RK4 500, compensated Yoshida 500** | leapfrog and DOPRI5 fail only the L1 check as SPEC.md words it (below) |
| R5 | Figure-eight, rotated into 3-D | **all five**: RK4 500, Yoshida 1,000, leapfrog 16,000, DOPRI5 1e-8 | none |
| R6 | Kozai-Lidov, i = 65°, test particle | **DOPRI5 1e-10**: e_max 0.840 against 0.838 predicted; √(1 - e²) cos i varies by 0.012; five secular cycles; energy 1.1e-12; closest approach to the perturber 18.6 | fixed steps were not run to completion within the cap |
| R7 | Hyperbolic close approach, q = 0.01 | **DOPRI5 1e-10**: deflection error 2.1e-8 rad for 3,852 force evaluations | every fixed-step scheme at 3.2 million steps: deflection errors of 1.3e-3 to 1.3e-2 rad |
| R8 | Merger, head-on and grazing | **exact**: mass and momentum unchanged to the bit through both mergers | none |
| R9 | Determinism | **all five**: the same bytes in Node 24, Chromium, Firefox and WebKit Workers, from the same initial numbers | a system built from orbital elements inside each engine differs (below) |

Full numbers, and every attempt, are in
[`spike/threed/results/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/c9e0b4d/spike/threed/results).

### What the corpus caught in itself

- **A bounded error sampled at one phase reads as growth.** The first run
  sampled energy once per orbit, always at pericenter. At 16,000 steps an orbit, leapfrog's energy
  error is a bounded oscillation of about 1e-6 in each orbit, but seen at one
  phase that drifts it looked like a 100-fold growth. Sampled 25 times an
  orbit, every symplectic scheme's growth ratio is 1.0. This is the trap
  PHYSICS_VALIDATION.md already records for the 2-D integrator ("the order is
  measured at 1.37 periods, not at a whole number of them"). The production
  tests must sample within orbits.
- **R3's floor is rounding, not the integrator.** Over the millions of steps
  1000 Jupiter orbits take, the rounding in `x += h v` and `v += h a` builds
  up past 1e-13 of the total momentum. Compensated sums lower it to 1.9e-15,
  and the angular momentum to 4e-16. They cost 1% of a step's time at 50
  bodies, 7% at 10 and 16% at 3.
- **One of SPEC.md's criteria is ill-posed.** R4's instability test, "the
  distance from L1 after 20 orbits ≥ 0.1", measures a chaotic particle at one
  instant. Leapfrog's and DOPRI5's particles did leave: both reached 0.126 from
  L1 within the 20 orbits. They had come back to 0.06 when the run ended. The
  gate reports them as failing R4 as written. Production's test should be the
  largest distance reached.
- **A runner bug.** R3 first ran a hundredth of the steps intended; the fix
  and rerun are in the history.

## Integrators compared

| | Long-term energy | Angular momentum | Close approach | Deterministic | Teachability |
|---|---|---|---|---|---|
| Leapfrog | bounded, 2nd order | to rounding | no | yes | the simplest to explain |
| Yoshida 4 | bounded, 4th order | to rounding | no | yes | three leapfrogs |
| Compensated Yoshida 4 | bounded | to 1e-15 over 1000 orbits | no | yes | the same scheme, added carefully |
| RK4 | grows linearly | drifts | no | yes | familiar, and a good lesson in why symplectic matters |
| DOPRI5, adaptive | grows linearly | drifts | **yes** | yes, in the four engines tested | step control needs explaining |

**Speed, in steps per second in a Worker**, with Node for reference. The
load average was 5 to 6.

| Scheme / bodies | Node 24 | Chromium | Firefox | WebKit |
|---|---|---|---|---|
| leapfrog / 10 | 894,311 | 934,579 | 769,231 | 1,250,000 |
| Yoshida / 10 | 301,484 | 294,985 | 250,000 | 425,532 |
| compensated Yoshida / 10 | 280,730 | 284,900 | 232,558 | 408,163 |
| compensated Yoshida / 50 | 13,073 | 14,311 | 11,940 | 18,605 |
| RK4 / 10 | 90,149 | 141,945 | 208,333 | 434,783 |

- **What that means for a lab.** At 10 bodies, compensated Yoshida takes
  about 3.5 ms of a Worker's time for 1,000 steps: enough for a smooth view
  at 60 frames a second with steps to spare. At 50 bodies it is 12,000 to
  19,000 steps a second, still interactive.
- **RK4's low figures at small N in Node and Chromium** are the spike's: it
  allocates new arrays at every stage, which production would not.

## Determinism, and the rule it sets

**From the same initial numbers, all five schemes end in identical bytes** in
Node, Chromium, Firefox and WebKit: 20,000 steps of each fixed scheme, and 200
time units of DOPRI5. SHA-256 is taken over positions, velocities, masses and
time.

**Built inside each engine from orbital elements, the same ten-body system
already differs** before the first step. Node and WebKit round `sin` and `cos`
differently from Chromium and Firefox.

So production carries initial conditions as numbers. Elements are an
authoring convenience, converted once and saved as the state they make. A
shared or archived 3-D state is its numbers, never its recipe.

**DOPRI5's step control uses `x ** -0.2`,** which the standard also leaves to
the implementation. It agreed in all four engines here. Production should
either replace it with an exactly specified control, or record the engine
with the result.

## Architecture

**No refactor of the visible engine.** MULTI_WORLD_DECISION.md stands: the 3-D
lab is not a second world inside `js/physics.js`. It is its own kernel in its
own Worker realm, on its own page, as the experiment runner's trials are. The
2-D application is untouched.

- **Kernel and realm.** `js/lab3d/kernel.js` (this spike's, hardened) is
  imported only by a Worker. The page never integrates: it receives snapshots
  and draws, interpolating between them.
- **State: a `gravitas.system3d/1` file.** Units, G, time, the integrator and
  its step or tolerance, and bodies as `{id, name, m, radius, x, v}` numbers.
  It is checked with the investigation pack's structural guard
  (`js/platform/investigation.js makeChecker`), as every Studio format is.
- **Units.** The Observatory's registry (`js/observatory/units.js`) already
  has `AU`, `d`, `Msun` and `km/s`. Production uses AU, days and solar
  masses, with G = k² (the Gaussian gravitational constant squared,
  2.9591220828559e-4 AU³ M☉⁻¹ d⁻²). Adding a Julian year to the registry is
  the alternative, a one-line change.
- **Share and export.** A share link is a tagged fragment through
  `js/shareState.js encodeTagged`, with a tag of its own, so the application's
  world links and assignment links are never mistaken for it. A long system
  is a file.
- **Experiments.** A 3-D model id beside the 2-D scenarios in
  `gravitas.experiment/1`. Trials run in Worker realms already
  (`js/experiments/`), and this kernel is a realm-friendly module, so the
  scheduler's pricing, determinism and result format carry over.
- **Events.** Close approaches (from DOPRI5's steps or a distance watch),
  mergers (with the energy lost) and plane crossings, as event records
  `{t, kind, bodies, values}` in the result.
- **Observation projections.** A 3-D state seen from an observer direction
  gives the quantities the Observatory already reads, as
  `gravitas.observation/1` time series:
  - radial velocity, v·n̂;
  - astrometric offsets;
  - an eclipse or transit timing.

  The Observatory's fits, folds and guides then work on simulated data as
  they do on real data.

### Estimated route and bundle cost

A separate page, outside the application's start-up and deferred budgets, as
the Observatory and the Studio pages are:

| Part | Minified | Gzipped |
|---|---|---|
| Kernel (in the Worker) | 6.1 KB | 2.7 KB |
| The existing three.js view (`js/view3d.js` and what it imports), as a stand-in for the lab's renderer | 591 KB | 159 KB |
| Page, controls, words (estimate, from the Studio pages) | 100–250 KB | 30–70 KB |

That makes the route about 0.7 to 0.85 MB minified, dominated by three.js.
The application's own 830 KB initial and 4,180 KB deferred budgets do not
move.

## Model limits a lab must state

- **Point masses without softening.** A collision is a merger. Nothing
  bounces, fragments or raises tides.
- **No relativity.** Mercury's perihelion advance and binary pulsar decay are
  not in it.
- **A fixed-step run cannot resolve a close approach.** R7 shows this at every
  fixed step. A scenario with one declares DOPRI5, or it is not offered.
- **DOPRI5 does not conserve energy or angular momentum over long runs.** It
  is right for an encounter or a secular run of a few cycles, and wrong for
  1000 orbits of a planetary system.
- **Up to 50 bodies.** The O(N²) force loop gives about 12,000 steps a second
  at 50, and nothing larger is claimed.

## The verdict, and what would reverse it

Verdict rules, as the earlier gates have them:
- **A** proceeds: one integrator meets every tolerance.
- **B** stages: every tolerance is met by some integrator, and the rest is
  named bounded work.
- **C** stops: some tolerance is met by none.

**B.** Every tolerance is met; none by a single scheme. The bounded work:

1. **Per-scenario integrator choice.** Compensated Yoshida by default, and
   DOPRI5 for scenarios declaring close approaches or secular evolution, both
   shown to the student.
2. **The production tests.** This corpus, with energy sampled within orbits
   and R4's L1 check as the largest distance reached.
3. **A fixed DOPRI5 step control,** or the engine recorded with each result.

**What would reverse it:**
- **To C:** a production engine, or a later browser, giving different bytes
  for the same numbers; or compensated Yoshida failing R1 to R5 in production
  code.
- **To A:** a validated switching integrator (for example a hybrid that
  hands close encounters to an adaptive step, as REBOUND's IAS15 and
  hybrid schemes do) meeting R1 to R9 alone.

## Proposed prompts, if the verdict is accepted

None runs until the verdict is reviewed.

1. **Production 3-D kernel and state (Prompt 35's scope):**
   - `js/lab3d/kernel.js`: compensated Yoshida and DOPRI5 with a fixed step
     control;
   - `gravitas.system3d/1` and its checks;
   - the Worker protocol;
   - this corpus as Jest tests, sampled within orbits;
   - R9 across engines in e2e;
   - the unit choice.
2. **Renderer and navigation (Prompt 36's):** its own page. three.js narrowed
   as #81 did, frames as views, and snapshot interpolation.
3. **Curriculum (Prompt 37's):**
   - inclined orbits and nodes;
   - why a symplectic scheme matters (RK4 against Yoshida on R1);
   - L4 and L1 in 3-D;
   - Kozai-Lidov on DOPRI5;
   - and an observed radial-velocity curve from a simulated system, into
     the Observatory.

## How to reproduce

On the spike branch, run `npm ci`, then:

```text
node spike/threed/corpus.mjs R2 R4 R5 R7 R8        # minutes
MAX_EVALS=4e8 node spike/threed/corpus.mjs R1      # about 30 minutes of CPU
node spike/threed/corpus.mjs R3 R6
SCHEMES=yoshida4c node spike/threed/corpus.mjs R1 R3
node spike/threed/bench-node.mjs --speed           # R9 and speed, Node
python3 -m http.server 4635 --bind 127.0.0.1 &
node spike/threed/bench-browsers.mjs --speed       # R9 and speed, three engines
```

Nothing was downloaded for this gate.
