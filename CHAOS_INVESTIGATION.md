# The Butterfly Effect in Space

An investigation that measures sensitive dependence on initial conditions
instead of asserting it, and spends most of its length distinguishing chaos
from three things it is routinely confused with.

---

## The four confusions the lesson exists to break

| Confusion                    | How the lesson breaks it                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chaos is randomness          | Step 4 runs the same start twice and the separation is **exactly zero**. Determinism is established before anything diverges, so nothing later can be blamed on the machine.                                    |
| Any divergence is chaos      | Step 8 gives a two-body orbit the same 1,500 km nudge. It comes apart — linearly, because the perturbed star has a slightly different period. The instrument **refuses** to quote a Lyapunov time and says why. |
| It is just integration error | Steps 18–21 repeat the comparison at a quarter timestep and under two other integrators. The conclusion depends on the answer not moving.                                                                       |
| Three bodies means chaos     | Step 22: Jupiter's Trojans and the Chenciner–Montgomery figure eight are stable three-body configurations. Chaos is a property of a configuration, not a body count.                                            |

---

## Choosing the configuration

The brief named the figure eight and the Pythagorean problem as candidates.
Both were built and measured against this engine before either was rejected.

| Candidate                                                             | Measured behaviour here                                                                                                                     | Verdict                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Pythagorean (Burrau)** — masses 3, 4, 5 at rest on a right triangle | Merges. Its close approaches pass inside the collision radius under every integrator, and the engine removes a body.                        | **Rejected.** The divergence measure matches bodies by identity; a merger mid-run changes what is being compared.       |
| **Chenciner–Montgomery figure eight**                                 | Separation grows ×230 over 13.6 orbits and no more, identically under all three integrators.                                                | **Rejected as the subject** — it is not chaotic. Kept as the _counterexample_ in step 22, which is what it is good for. |
| **Near-figure-eight triple** (4% off the periodic data)               | Energy drift of 3,170% under Symplectic Euler at dt = 0.1; e-folding time moved by orders of magnitude between integrators.                 | **Rejected.** Numerically unresolved — the divergence was the integrator's, not the system's.                           |
| **Hierarchical triple**, outer/inner ratios 2.5–3.5                   | τ ranged 4.6 to 15.8 with r² of 0.69–0.94; energy drift up to 10².                                                                          | **Rejected**, same reason.                                                                                              |
| **Lagrange equilateral, three equal masses**                          | τ = 6.8–7.6 s across three integrators × three timesteps, r² ≥ 0.98, no merger, closest approach 80 units against a collision radius of 16. | **Selected.**                                                                                                           |

### Why the equilateral solution is right for this

It is an **exact** solution of the three-body problem (Lagrange 1772): three
bodies at the corners of an equilateral triangle rotating rigidly keep that
shape forever. And it is **linearly unstable for comparable masses**, by
Gascheau's 1843 criterion:

> 27(m₁m₂ + m₂m₃ + m₃m₁) < (m₁ + m₂ + m₃)²

For three equal masses that is 81m² < 9m², which fails by a factor of nine.

So the system starts in a state that can be specified exactly — no seed
randomness, no "roughly" — and departs from it exponentially for a reason that
is a theorem rather than an accident of the setup. It also gives the lesson its
counterexample for free: make one mass dominant and the same inequality is
satisfied, which is why Jupiter's Trojans are stable.

### The configuration as built

|                                    |                                                 |
| ---------------------------------- | ----------------------------------------------- |
| Bodies                             | 3 stars, 6 M☉ each (6000 simulation mass units) |
| Circumradius                       | 50 units = 0.5 AU                               |
| Side                               | 50√3 = 86.6 units = 0.866 AU                    |
| G                                  | 2.0 (the application default)                   |
| ω                                  | √(G·3m/L³) = 0.23543 rad per simulated second   |
| Rotation period                    | 26.7 simulated seconds ≈ 5 s of wall clock      |
| Closest approach over a lesson run | ~80 units, against a collision radius of 16     |

Theory predicts an e-folding time of √2/ω = **6.0 s** for the unstable mode.
Measured: **6.9 s**, 15% longer — expected for a finite perturbation fitted
over a finite window with an oscillatory component riding on the growth. The
lesson asks about that gap rather than hiding it.

---

## The perturbation

**+1,500 km on Alpha's x coordinate.** In simulation units that is 1.0 × 10⁻³,
against a system 86.6 units across: **one part in 1.16 × 10⁵**.

It is applied to the _captured state_, not to the live simulation
(`js/experiments/perturbation.js`). That matters for three reasons: the change
is exactly one number and `differencesBetween()` proves it; the perturbed start
is a canonical share payload, so it hashes, stores, exports and travels in a
link like any other; and the description survives into the report, so a student
can say what they changed rather than remembering it.

---

## The divergence definition

With bodies matched by **stable object id** and samples aligned by **simulated
time**:

> d(t) = √( Σᵢ | rᵢ^A(t) − rᵢ^B(t) |² )

in simulation length units — configuration space, positions only.

A normalised phase-space version including velocities is implemented
(`phaseDistance`) and gives τ = 6.93 against the configuration metric's 6.91, a
0.3% difference. Positions alone are the default because adding velocities
requires weighing a length against a speed, and any such weight is a choice of
units dressed as physics. The growth _rate_ — the quantity actually reported —
is the same either way, and that agreement is itself worth showing.

Alignment is delegated to the Experiment Bench's own aligner, so the lesson and
the bench cannot disagree about what "the same simulated time" means. Bodies are
never matched by array position: two runs can list their bodies in different
orders, and index-matching would subtract one star's position from another's and
call the result divergence.

---

## Why the result is not a timestep artefact

The evidence, from `tools/physics-checks.mjs`, run on every `npm test`:

| Integrator       | dt    | τ (simulated seconds) |
| ---------------- | ----- | --------------------- |
| Symplectic Euler | 0.100 | 6.91                  |
| Symplectic Euler | 0.050 | 6.86                  |
| Symplectic Euler | 0.025 | 6.95                  |
| Velocity Verlet  | 0.100 | 7.19                  |
| Velocity Verlet  | 0.050 | 7.62                  |
| Velocity Verlet  | 0.025 | 6.97                  |
| RK4              | 0.100 | 6.81                  |
| RK4              | 0.050 | 7.23                  |
| RK4              | 0.025 | 7.03                  |

Fractional spread **11%**, against a 20% threshold — the same threshold the
widget uses to tell a student their result is resolved, so the validation suite
and the classroom verdict cannot disagree. Energy drift over the lesson run is
5.2 × 10⁻⁴ (Symplectic Euler, dt = 0.1) down to 8.9 × 10⁻¹² (RK4), which is
three to ten orders of magnitude below the divergence signal. Angular momentum
drift is 2 × 10⁻¹⁵.

For contrast, the rejected near-figure-eight configuration gave 6.2 × 10⁷,
4.0 × 10⁶ and 2.3 × 10² for the same measurement under three integrators. That
is what an unresolved result looks like, and the widget reports it as
**NOT RESOLVED** rather than averaging it.

---

## What the analysis refuses to do

`js/chaos/divergence.js` will not produce an e-folding time unless all of:

| Criterion                     | Value  | Why                                                                                                                           |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| e-folds of range              | ≥ 3    | Two is a factor of seven, which a linear trend can imitate over a short window. Three is a factor of twenty, which it cannot. |
| points in the fit             | ≥ 10   | So the fit is not carried by two samples.                                                                                     |
| r² of the log-linear fit      | ≥ 0.98 | Rejects two-body phase drift, which fits at 0.89; accepts real exponential growth, which fits above 0.99.                     |
| e-folds spanned by the window | ≥ 2    | Otherwise the "exponential" is one bend in a curve.                                                                           |

The window is chosen to exclude both ends: the start, where the separation is
still the perturbation itself, and the saturated tail, where the runs have
completely rearranged and there is no more system to grow into. Including the
tail would report a slower rate than the real one. The fitted interval is shaded
on the plot, so an estimate is never shown without the data it came from.

A straight-line fit to the raw separation is **always** reported alongside, in
both directions. That comparison is what distinguishes drift from chaos, and
hiding it when the answer is "exponential" would leave a student unable to see
that the comparison was made.

The lesson states explicitly (step 26) that what a student measures is a local
growth rate over a finite window from one perturbation in one direction, and not
the infinite-time, attractor-averaged quantity that the name "Lyapunov exponent"
denotes.

---

## Three defects this work exposed

All pre-existing, all silent, all found by the tests rather than by reading.

**Restored bodies lost their names.** `PhysicsObject.get_state()` carried the
id, position, velocity and mass but not the name, so restoring a full share link
reopened the world with a different cast of characters and an experiment that
measured "Alpha" could not say which star that had been. Only `BlackHole`
carried it; everything else now inherits it.

**Browser runs were not reproducible.** The render loop derives its step from
how long the last frame took, which is right for a sandbox and fatal for a
paired experiment: two runs get different sequences of steps, so they are not
the same calculation, and in a chaotic system that difference grows like any
other. The reproducibility control failed in the browser while passing in the
headless harness. `setFixedStep()` in `js/render.js` now pins the step for the
duration of a bench recording.

**A perturbation applied after a restore did nothing.** `startRun()` only
restores when the clock has moved off the captured value, so perturbing
immediately after "Return to start" left the world unperturbed and Run B
repeated Run A exactly — reported, correctly and uselessly, as "identical".
Applying a perturbation now restores into it.

---

## Files

| File                                            | What it is                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `js/chaos/divergence.js`                        | The analysis: distances, alignment, window selection, fitting, refusal, refinement verdict |
| `js/experiments/perturbation.js`                | Perturbing one coordinate of a captured state, and proving only one changed                |
| `js/chaosWidgets.js`                            | The divergence instrument: two plots, the classification, the textual readout              |
| `js/data/investigations/butterfly-effect.js`    | The lesson, 28 steps                                                                       |
| `js/data/investigations/es/butterfly-effect.js` | The Spanish translation                                                                    |
| `js/ui.js`                                      | The scenario's exact initial conditions, and the reasoning for them                        |
| `js/scenarios.js`                               | The scenario's settings                                                                    |
| `js/render.js`                                  | `setFixedStep()`, for reproducible recordings                                              |
| `js/physics.js`                                 | `name` carried through a state round trip                                                  |
| `tools/physics-checks.mjs`                      | Ten validation checks, in the group "Three-body sensitivity"                               |
| `e2e/chaos.spec.js`                             | The paired experiment, performed in a browser                                              |
| `e2e/scenarioContract.spec.js`                  | That the scenario builds the configuration the lesson describes                            |

---

## Sources

- Lagrange, J.-L. (1772). _Essai sur le problème des trois corps._
- Gascheau, G. (1843). _Comptes Rendus_ **16**, 393.
- Poincaré, H. (1890). _Acta Mathematica_ **13**, 1.
- Lorenz, E. N. (1963). _J. Atmos. Sci._ **20**, 130.
- Chenciner, A. & Montgomery, R. (2000). _Annals of Mathematics_ **152**, 881.
- Boekholt, T. C. N., Portegies Zwart, S. F. & Valtonen, M. (2020). _MNRAS_ **493**, 3932.
- Laskar, J. & Gastineau, M. (2009). _Nature_ **459**, 817.
