# The A/B experiment bench

A controlled experiment is: fix everything, change one thing, measure the
difference. The sandbox could always do the "change one thing" half. It could
never do the "fix everything" half, because returning to a start you have
already run past is not something a person can do by hand — and an A/B
comparison whose two arms began from subtly different worlds measures the
worlds, not the variable, and does it silently.

This is that missing half.

---

## What a student does

1. **Capture start.** The world as it stands becomes the experiment's origin.
2. **Name it, and pick what to measure.** Bodies as chips, quantities as
   checkboxes. A quantity that needs two bodies stays greyed out until two are
   chosen, so "separation" is never a column of blanks discovered afterwards.
3. **Record Run A.** The simulation runs and is sampled on its own clock.
4. **Return to start.** Exactly — see below.
5. **Change one variable.**
6. **Record Run B.**
7. **Compare.** Overlaid series on a shared simulated-time axis, and a table of
   absolute and fractional differences.

---

## The architecture, and the choice worth arguing about

### Sequential paired runs, not two engines

The obvious alternative is to instantiate the physics engine twice and run both
arms simultaneously. That is not available here, and the reason is structural
rather than a matter of effort.

`js/physics.js` keeps the world in **module-level arrays** — `bh_list`,
`stars`, `planets` and the rest are exported bindings that every other module
mutates in place — and its tuning lives in a module-level `physicsSettings`
object written by `updatePhysicsSettings()`. There is one world per loaded
module and no constructor that makes another.

Isolated instances would mean turning those arrays and that settings object
into instance state and threading a handle through `physics.js`, `render.js`,
`timeline.js`, `ui.js` and every widget that reads a body list: a refactor of
the engine's public surface, touching thousands of lines, to support one
feature. It would also double the per-frame cost of the thing the application
exists for, on scenarios that already run at 22 ms a frame.

**The tradeoff.** Sequential runs cost the student the wall-clock time of two
runs. They cost nothing in fidelity: because the restore is exact and the
comparison is on simulated time, the result is identical to what two engines
would have produced. What is genuinely lost is the ability to watch both arms
diverge side by side, which is a nice demonstration and not a measurement.

If `physics.js` ever grows a real instance API, the change is confined to
`startRun()`/`stopRun()` in `js/experiments/bench.js`.

### The force law is not duplicated

Total energy and angular momentum come from `physics.js:conservedQuantities()`;
drift comes from `conservationDrift()`. Nothing in `js/experiments/` re-derives
them. A bench that recomputed the physics could report a system as conserving
beautifully while the engine that actually moved the bodies did something else.

### One canonical state, not a second serializer

The captured start **is** a share payload: the same object
`captureShareState()` produces for a link, carrying the scenario, the
deterministic seed, the settings that differ from the scenario's defaults, the
settings changed after generation, and every body's position, velocity and
mass. It is already versioned and already exercised by the share-link tests.

Four things a link never needed ride in an `x` block on the same payload:

|                   | Why the experiment needs it                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Simulated clock   | Two runs share a time axis, so Run B resumes the clock rather than restarting it                        |
| Stable object ids | `packBody` drops `id` for a link; a measurement naming "body 7" must mean the same body after a restore |
| Reference frame   | View state for a link; for a measurement it decides what a position or separation _is_                  |
| Observer geometry | The same, for anything measured along the line of sight                                                 |

Old links have no `x` block and read as _t = 0, world frame, edge-on observer_
— which is exactly what they mean.

---

## Two bugs this feature exposed

Both were pre-existing, both silent, and both would have made the bench lie.

**An id of zero lost its identity.** `set_state` did
`this.id = s.id || PhysicsObject_id_counter++`. The first body built in every
world has id 0, which is falsy, so it was handed a fresh id on every restore.
Nothing noticed while ids were only used for energy bookkeeping. The bench
compares "body 0" across a restore and would have measured a different object.
Now `??`.

**Restoring aliased the payload into the live world.** `set_state` assigns
`this.pos = s.pos`, so a restored body and the payload it came from shared one
vector, and the integrator then mutated it in place. Harmless for a share link,
which is discarded the moment it is applied. Fatal here: the experiment's
captured start quietly followed the simulation around, so restoring twice
returned to wherever the first run had finished. `restoreInitialState()` now
applies a deep copy.

There is a third, smaller one: **both runs now start from the capture.** A
student who captured a start, spent twenty seconds choosing bodies and then
pressed Record got a Run A beginning wherever the simulation had wandered to,
while Run B — which follows an explicit restore — began at the capture. The two
arms were offset on the shared axis by however long the student took to click,
and if that offset exceeded the length of the runs they did not overlap at all.
`startRun()` restores first whenever the clock has moved.

---

## Measurement and honesty about sampling

Sampling is driven by `requestAnimationFrame`, keyed on the **simulated** clock
rather than on frames, and the bench is a panel: the coupling runs from the
panel to the render loop and never the other way, because the render loop is
the hottest code in the application.

That has one consequence worth stating plainly. A scenario that substeps
advances the simulated clock several times inside one animation frame, so the
bench takes at most one sample per frame however much simulated time passed.
Twenty samples can be twenty simulated seconds or two. This is why:

- the recording status shows **both** the sample count and the simulated span;
- alignment never zips two runs index by index. `js/experiments/align.js`
  resamples onto a grid taken from the _sparser_ run inside the overlap,
  interpolates the other linearly, and refuses to extrapolate past either end;
- a run whose longest sample gap exceeds five times its shortest is flagged to
  the student rather than smoothed over.

Where the runs do not overlap in simulated time, the answer is "no comparison",
not an extrapolated number that looks like one.

### What is measured

Position and trajectory, separation, speed and velocity components, distance
from a chosen primary, orbital period (mean interval between periapsis
passages, found from three consecutive radius samples), closest approach
(minimum over the run), total energy, angular momentum, and the numerical drift
in both.

Each metric declares its arity and its unit once, in `js/experiments/metrics.js`,
and the panel, the chart, the results table and the CSV all read that
declaration.

---

## What counts as an independent variable

The rule: a settings key is a variable **unless** changing it cannot change a
number the bench measures. Visual toggles (`show_*`), trail styling, colours and
the starfield density are not variables. Elapsed time, the timeline's buffers,
the camera, panel layout, theme, locale and units are not variables — a bench
that counted those would warn on every comparison, and a warning that always
fires is a warning nobody reads.

Two entries are deliberately _not_ on the cosmetic list:

- **`sim_speed`**, because the render loop computes its step as
  `dt × sim_speed × 50 × DT`. Halving the speed halves the integration step and
  changes the drift a run reports. It is a numerical variable.
- **the seed and the scenario**, because a different seed is a different world,
  and changing one by accident between runs invalidates the comparison in the
  way hardest to notice by eye.

The reference frame and the observer are reported as _context_ rather than
counted as variables: measuring one run from two viewpoints is not an
experiment on the physics.

When more than one variable changed, the bench says which ones and refuses to
present the comparison as controlled — but it offers a confirm button, because
a deliberate multivariable comparison is a legitimate thing to run and the tool
should not be the judge of that.

---

## Storage, export and links

**Storage** is `localStorage`, one key per experiment plus an index, with a
schema version on every record and forward migration on read. Bounded at 512 KB
per experiment, 2 MB in total and 40 experiments, against a browser budget the
lessons and the saved simulation also draw on. Every write returns _why_ it
failed — too large, store full, too many, quota refused, no storage at all — so
the panel can offer the thing that actually helps, which is exporting to a file.

**Export** is two documents:

- a **combined CSV**, long format, one row per sample per run, with a `run`
  column and a unit in every column name (`separation_au`, `speed_kms`,
  `energy_drift_pct`);
- a **JSON manifest** carrying the experiment definition and its provenance —
  scenario, seed, integrator, timestep, sim speed, units, initial-state hash,
  selected objects and metrics, the parameter change, and the build version —
  and deliberately _not_ the samples. A manifest small enough to paste into a
  lab report is worth more than one carrying a megabyte the CSV already has.
  Reopening a manifest restores the definition and the setup, not the results:
  enough to re-run the experiment, not enough to hand in someone else's
  measurements.

**Share links** carry the setup in an `xp` block beside the `x` extras: the
name, the measured objects and quantities, and the A/B parameter difference.
Never the recorded runs. Backward compatibility runs both ways — a payload
without `xp` is an ordinary link, and a build that predates the feature ignores
the key rather than failing — and the existing 8,000-character comfort
threshold is enforced, with `trimBlock()` dropping the name, then the object
list, then the parameter change rather than emitting a link a mail client will
wrap.

---

## Where the code is

| File                                | What it owns                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `js/experiments/canonicalState.js`  | Extras on the share payload, canonical JSON, the state hash, the parameter diff |
| `js/experiments/align.js`           | Resampling two runs onto one simulated-time axis                                |
| `js/experiments/metrics.js`         | Metric declarations, per-frame sampling, run reduction, comparison              |
| `js/experiments/store.js`           | Versioned bounded localStorage, migration, quota failures                       |
| `js/experiments/exports.js`         | Combined CSV and JSON manifest, and reading a manifest back                     |
| `js/experiments/shareExperiment.js` | The `xp` link block and the URL size guard                                      |
| `js/experiments/bench.js`           | Orchestration: capture, restore, record, compare                                |
| `js/experiments/panel.js`           | The panel's DOM and chart                                                       |
| `js/experimentsBridge.js`           | The rail button, and loading all of the above on demand                         |

Everything except the bridge and `canonicalState.js` is lazy: the bridge is a
button, and `canonicalState.js` is in the start-up path only because
`applyShareState()` needs it to restore an experiment's extras from a link.
