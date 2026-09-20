# Two worlds: what it costs, and whether it is worth it

Two artifacts, built to answer one question: should the engine be refactored to
support more than one world at a time?

**The answer is no, and the Worker is why.** Read the second half first.

---

## Artifact 1 — `withWorld()` in `js/physics.js`

`js/experiments/bench.js:23-51` refuses to instantiate the engine twice and
names the cost correctly: the world lives in module-level arrays that every
other module imports and mutates in place, and making them instance state would
mean threading a handle through `render.js`, `ui.js`, `timeline.js` and every
widget that reads a body list.

That refusal is about *instances*. It is not about *swapping*, and swapping is
much cheaper, because the arrays are exported **live bindings**: reassigning the
module-level variable is immediately visible to every importer. So a second
world needs no handle threaded anywhere. It needs the variables saved and
restored around a call — exactly what `withSeed()` does for `Math.random`, for
exactly the same reason.

`withWorld(world, fn)` is modelled on `withSeed()` line for line: install, run,
restore in a `finally`, warn if a thenable escapes. `createWorld()` makes an
empty one; `captureWorld()` snapshots the live one.

### What a World actually holds

The brief said "the nine arrays plus physicsSettings". Both numbers are wrong,
and the second one is the dangerous one.

- **Fourteen lists, not nine.** The nine are what
  `e2e/worldConstruction.spec.js` *digests*, because those are the nine that
  hold bodies. The other five — `debris`, `particles`, `gwaves`,
  `gravity_ripples`, `accretion_disk_particles` — are effects, and a world that
  left them behind would leak them into the next one.
- **`PhysicsObject_id_counter`.** Ids come from one counter and the golden pins
  them. Two worlds sharing it produce a world numbered from wherever the other
  one stopped: the digest changes, every lesson that matches bodies by id across
  a rebuild breaks, and nothing says why. This is the field that would have been
  missed.
- **`simulationTime`**, the conservation bookkeeping
  (`absorbedSpinAngularMomentum`, `discardedAbsorptionMomentum`,
  `conservationBaseline`) and the totals cache.

### What it does not isolate

`js/ui.js` state — the camera, `current_scenario_name`, the `SETTINGS` object.
Those are the view's, not the world's. `e2e/worldIsolation.spec.js` splits its
digest along exactly that line and says so.

### The proof

`e2e/worldIsolation.spec.js` builds all 59 catalog scenarios in **interleaved
pairs** — build A, build B, then go back and digest A — and compares every one
against the golden that `worldConstruction.spec.js` wrote. All 59 match. Each
world is also digested twice and must agree with itself, so a digest that
mutated what it measured could not pass.

Sequence is not isolation. `worldConstruction.spec.js` already built every
scenario back to back and would not have noticed if building B corrupted A,
because A was gone by then.

---

## Artifact 2 — the Lyapunov cloud, in a Worker

Fifty members of the Pythagorean three-body problem (masses 3/4/5 at the
vertices of a 3-4-5 triangle, released from rest — classically chaotic),
restored from a canonical payload, perturbed at one part in a million,
integrated at a **pinned** step, returned as trajectories.

Open `spike/lyapunov/index.html`. Query parameters `?steps=&sample=`.

### Result

```
pool 6 workers · 50 members · 12000 steps @ dt=0.002 · sample every 40
wall 5824ms · worker cpu 5391/5566/5143/5379/5280/5028ms
id counters after: 27, 27, 24, 24, 24, 24
median separation  early 3.105e-4  mid 6.550e+0  late 2.671e+1
growth factor early→late: 8.602e+4
```

A 10⁻⁶ perturbation grows by four to five orders of magnitude. The plot is the
separation on a log axis: straight while the divergence is exponential, bending
over as it saturates. That is the Lyapunov signature, and it is the artifact.

### What it took

**Two lines, in two files.**

1. `js/physics.js:254` read `document.getElementById(...)` with no `typeof`
   guard, so the module threw `ReferenceError: document is not defined` on
   evaluation in a Worker realm. Every `window.` access in that file was already
   guarded; `document` was not. The file's own comment three lines above says it
   is meant to survive "a test running the physics without a DOM", so the guard
   is what the module already claimed to do.
2. `js/world/build.js:660` announced a reset with an unguarded
   `window.dispatchEvent`. It is the **only** DOM touch in the entire world
   builder, and `js/physics.js` already carries a guarded helper for exactly
   this operation. Guarded in the same style.

`spike/lyapunov/import-probe.html` is the measurement: it imports each module in
a Worker, one per worker. All fifteen of `physics.js`'s direct dependencies load
unmodified, and so do `world/build.js`, `scenarios.js`, `shareState.js` and
`rng.js`. The only module that cannot load in a Worker is `js/ui.js`, which is
the interface and should not.

### The builder works there too

The first version of this spike hand-instantiated three stars, which proves the
integrator runs in a Worker but dodges the question of whether the **builder**
does - and the builder is where most of the refactor estimate lived.

It does. `buildWorld()` already takes its dependencies as an injected `ctx` -
settings, state, `applyPreset`, and a handful of callbacks that exist to poke the
interface - and imports `js/ui.js` not at all. A Worker supplies a plain settings
object, a plain state object and no-op callbacks, and the same builder that runs
on the page runs there.

`spike/lyapunov/scenario-probe.html` builds four different catalog scenarios in
four concurrent Workers:

```
ok   Solar System          35 bodies, ids used 104, stepped 200 to t=0.400 in 29ms
ok   TRAPPIST-1 System      8 bodies, ids used  15, stepped 200 to t=0.400 in 19ms
ok   Interstellar Visitor   3 bodies, ids used   5, stepped 200 to t=0.400 in  9ms
ok   Orbital Transfer Lab   3 bodies, ids used   4, stepped 200 to t=0.400 in 11ms
```

Four worlds, genuinely simultaneous, each with its own id counter starting from
zero. That is what the refactor was for.

### Why this settles the programme

A Worker has its own realm, so `import('/js/physics.js')` there evaluates a
**fresh module instance** - its own `bh_list`, its own `physicsSettings`, its own
id counter. Nothing is shared with the page or with any other worker. The id
counters above are the proof.

That is the property `createWorld()` was going to be built to provide. In a
Worker it is free, it is real isolation rather than alternation, and it is
genuinely parallel.

So what would the nine-to-fifteen-month refactor still buy? Only **simultaneous
A/B on the main thread**, which `bench.js:41-44` already argued is a *worse*
experiment: it doubles the per-frame cost of the thing the application is for,
on scenarios that already run at 22ms a frame.

**Recommendation: do not do the refactor.** Put multi-world work in Workers.
`withWorld()` is in the engine and costs about 190 lines; keep it for the cases
that must stay on the main thread - a lesson that builds a comparison world
without disturbing the one on screen - and stop there.

### Honest limits of the prototype

- `js/ui.js` cannot load in a Worker, so `initialize_simulation()` - which is
  ui.js's wrapper - is unavailable there. `buildWorld()` is not, and it is the
  part that builds the world; the wrapper's other job is telling the interface
  what happened, which a Worker has no use for. The cloud worker still
  hand-instantiates its three stars, because a canonical payload restore is a
  different path again and was not the question.
- Nothing here has been run against the **render** side. A Worker cannot draw,
  so anything that wants a picture must ship state back to the page. For a
  Lyapunov cloud that is trajectories, which is cheap; for a live second view it
  would not be.
- Cost is dominated by close encounters, not by step count: 10× the steps cost
  far more than 10× the time, because the integrator substeps through the
  Pythagorean problem's near-collisions. That is the physics, not the harness.
- Nothing here is validated against a published Lyapunov exponent. It shows
  exponential divergence; it does not claim a rate.

---

## Rejected: "keep the module-level exports as a `defaultWorld`"

Recorded so it is not rediscovered.

The plan was to migrate the engine to `world.bh_list` everywhere while keeping
`export { bh_list }` working, by pointing the export at a property of a
`defaultWorld` object.

**It cannot work.** An ES export binding tracks a *variable*, not an expression.
There is no syntax that makes `export { bh_list }` alias `defaultWorld.bh_list`
such that mutating the property is visible to importers: `export` takes an
identifier, and a getter would need `export { get bh_list }`, which is not a
thing. The nearest approximations all fail:

- re-exporting a getter changes the import from an array to a function, so every
  one of the hundreds of call sites changes anyway — which was the cost the plan
  existed to avoid;
- a `Proxy` around the module namespace is not observable by static `import`
  bindings;
- `Object.defineProperty` on the namespace object is rejected: module namespace
  exotic objects are non-configurable.

The thing that *does* work — reassigning the module-level `let`, which is what
`withWorld()` does — works precisely because the export tracks the variable.
Same mechanism, opposite conclusion: it is what makes the cheap version possible
and the expensive version pointless.
