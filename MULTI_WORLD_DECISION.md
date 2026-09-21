# More than one world: what was tried, and what was decided

**Decision: do not refactor the engine into explicit multiple instances.**
Use Worker realms instead.

Decided 2026-09-20 on `feat/with-world`. This supersedes nothing — it answers a
question `js/experiments/bench.js` posed and deliberately left open.

## The question

`js/experiments/bench.js` runs its two experiment arms sequentially, and its
header says why: the world lives in module-level arrays that every other module
imports and mutates in place, there is one world per loaded module, and no
constructor makes another. Getting isolated instances would mean turning those
arrays into instance state and threading a handle through `js/physics.js`,
`js/render.js`, `js/timeline.js`, `js/ui.js` and every widget that reads a body
list — estimated at nine to fifteen months — and it would double the per-frame
cost of the thing the application is for.

That reasoning is correct. It is also answering the wrong question.

## What was measured

`bench.js` asks whether we can have two engine **instances**. A Worker answers a
different question: whether we can have two engine **realms**. A Worker has its
own realm, so `import('/js/physics.js')` there evaluates a _fresh module
instance_ — its own body arrays, its own `physicsSettings`, its own
`PhysicsObject_id_counter`. Nothing is shared with the page or with any other
worker.

That is exactly the property the refactor was for, and the platform gives it
away.

### Only two DOM guards were required

| File                | What was wrong                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/physics.js`     | a bare `document.getElementById` at module scope, with no `typeof` guard, threw `ReferenceError: document is not defined` on evaluation in a Worker. Every `window.` access in the file was already guarded; `document` was not — and the comment three lines above says the module is meant to survive "a test running the physics without a DOM" |
| `js/world/build.js` | one unguarded `window.dispatchEvent` announcing a world reset. It is the **only** DOM touch in the entire world builder, and `js/physics.js` already carried a guarded helper for the identical operation                                                                                                                                          |

Both are correctness fixes in their own right and are the only production
changes this decision required.

### Everything else already worked

An import probe ran each module in its own Worker. All fifteen of
`js/physics.js`'s direct dependencies load unmodified, and so do
`js/world/build.js`, `js/scenarios.js`, `js/shareState.js` and `js/rng.js`.
**The only module that cannot load in a Worker is `js/ui.js`**, which is the
interface and should not.

`buildWorld()` already takes its dependencies as an injected `ctx` — settings,
state, `applyPreset`, and callbacks that exist to poke the interface — and
imports `js/ui.js` not at all. A Worker supplies a plain settings object, a
plain state object and no-op callbacks, and the same builder that runs on the
page runs there.

### buildWorld() in concurrent Worker realms

Four different catalog scenarios, four workers at once:

```
ok   Solar System          35 bodies, ids used 104, stepped 200 to t=0.400 in 29ms
ok   TRAPPIST-1 System      8 bodies, ids used  15, stepped 200 to t=0.400 in 19ms
ok   Interstellar Visitor   3 bodies, ids used   5, stepped 200 to t=0.400 in  9ms
ok   Orbital Transfer Lab   3 bodies, ids used   4, stepped 200 to t=0.400 in 11ms
```

Each id counter starts from zero in its own realm, which is the proof that the
module state is per-worker.

### A fifty-member Lyapunov ensemble

Fifty members of the Pythagorean three-body problem (masses 3/4/5 at the
vertices of a 3-4-5 triangle, released from rest — classically chaotic),
perturbed at one part in a million, integrated at a pinned step:

```
pool 6 workers · 50 members · 12000 steps @ dt=0.002 · sample every 40
wall 5824ms
median separation  early 3.105e-4  mid 6.550e+0  late 2.671e+1
growth factor early→late: 8.602e+4
```

A 10⁻⁶ perturbation grows by between four and five orders of magnitude, with the
straight-then-bending shape on a log axis that exponential divergence produces.
The ensemble is a real workload, not a smoke test.

## What follows from this

- **The multi-instance engine refactor is rejected.** With Workers available it
  would buy only _simultaneous main-thread A/B_, which `bench.js` already argued
  is the worse experiment: it doubles per-frame cost on scenarios that already
  run at 22ms a frame.
- **Future ensemble, Lyapunov and parallel-world work should be built on
  Workers.** That route is validated and needs no engine API.
- **`bench.js`'s sequential design stands.** Its conclusion is unchanged and now
  better supported.

## Two things that were tried and dropped

### `withWorld(world, fn)` — built, proven, then removed

A synchronous save-and-restore of the module-level variables, modelled on
`withSeed()`. It worked: it built all 59 catalog scenarios in interleaved pairs
against the world-construction golden, and every one matched. It is cheap
because the body arrays are exported **live bindings**, so reassigning the
module-level variable is visible to every importer without threading a handle
anywhere.

It was removed from this branch anyway, because nothing needs it. Its only
consumer was the test that proved it, the Lyapunov use case does not want it —
Workers give real isolation rather than alternation, and genuine parallelism —
and roughly 190 lines of engine API with no production consumer is a liability.
If a feature ever needs synchronous main-thread world swapping, this is the
shape that works, and it is about a day's work to restore from the branch
history.

Two details worth keeping if it is ever rebuilt:

- A world is **fourteen** lists, not the nine the golden digests. The other five
  — `debris`, `particles`, `gwaves`, `gravity_ripples`,
  `accretion_disk_particles` — are effects, and a world that left them behind
  would leak them into the next one.
- `PhysicsObject_id_counter` is world state and is the field that would be
  missed. Ids come from one counter and the golden pins them, so two worlds
  sharing it produce a world numbered from wherever the other stopped. Also
  `simulationTime` and the conservation caches.

### "Keep the module-level exports as a `defaultWorld`" — impossible, not merely expensive

The plan was to migrate the engine to `world.bh_list` everywhere while keeping
`export { bh_list }` working, by pointing the export at a property of a
`defaultWorld` object.

**It cannot work.** An ES export binding tracks a _variable_, not an expression.
`export` takes an identifier; there is no syntax that makes `export { bh_list }`
alias `defaultWorld.bh_list` such that mutating the property is visible to
importers. The near approximations all fail:

- re-exporting a getter changes the import from an array to a function, so every
  one of the hundreds of call sites changes anyway — which was the cost the plan
  existed to avoid;
- a `Proxy` around the module namespace is not observable by static `import`
  bindings;
- `Object.defineProperty` on the namespace object is rejected: module namespace
  exotic objects are non-configurable.

Recorded here so it is not rediscovered.

## The evidence

`spike/lyapunov/` holds the runnable prototype and instructions to reproduce
every number above. It is **not production code** and is not deployed: `build.js`
copies only the directories in its `STATIC_DIRS` list, which does not include
it, and `tests/spikeNotShipped.test.js` asserts that.

Worker compatibility is regression-tested by `tests/workerCompatibility.test.js`
(the modules load with no DOM, and the reset event still fires when there is
one) and `e2e/workerRealm.spec.js` (a real Worker builds a real scenario).
