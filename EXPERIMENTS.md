# Experiments in Worker realms

`/experiments/` runs the bench's parameter sweep in the background. It varies
one or two laboratory settings over a range, runs every value with several
seeds, and reports what changed. Each trial runs in its own disposable Worker,
and the result is precise enough to run again.

This supersedes nothing in the Experiments bench inside the simulation: that
bench still compares runs on the live world. What is new is the manifest, the
scheduler and the runner, and they follow MULTI_WORLD_DECISION.md exactly.
Parallel worlds are Worker realms; the engine itself is not refactored into
instances.

## The manifest: `gravitas.experiment/1`

`js/experiments/experimentManifest.js` holds the rules. Every field is
required unless marked optional.

| Field | What it holds |
|---|---|
| `model` | the `scenario` (one of the laboratory scenarios the bench can sweep: `SWEEPABLE` in `js/experiments/sweep.js`) and the `platform` API range, `^1.0.0` |
| `initial.settings` | laboratory settings held fixed across trials. Only settings the scenario carries across a rebuild, inside their validated bounds |
| `seeds` | 1 to 20 seeds, as text. Every combination of values runs once per seed |
| `vary` | 1 or 2 parameters, each exactly one of: `values`, an explicit list; `from` / `to` / `count`, an even division, both ends included; or `distribution`, a seeded `uniform` draw of `samples` values between `min` and `max`. Bounds and excluded ranges are the bench's own; a value inside an excluded range (a gravity assist through the planet) is refused |
| `observables` | `metrics`, the bench's own (mean distance to the primary, orbital period, closest approach, mean speed, mean separation, total energy, angular momentum, energy drift, angular-momentum drift), and the `roles`: the bodies they are about |
| `stop` | `duration` in simulated time (1 to 200,000 units, the bench's range). Optional `events` that end a trial early: `separation-below` or `separation-above` a distance in AU |
| `numerics` | `frameSeconds` (1/120, 1/60 or 1/30), the fixed frame a trial integrates at, and `sampleEvery`, in frames. Each frame is split into the scenario's own substeps (`js/timestep.js`), as the live bench does |
| `limits` | `concurrency`, `trialTimeoutMs`, `totalTimeoutMs`, `maxSamplesPerTrial`, `maxResultBytes`, each bounded by the device profiles below |
| `summaries` | optional: what the result reports per value (`mean`, `min`, `max`, `spread`, `status-counts`) |

**Trial order.** Trials run, and are reported, in a fixed order: each
combination of values in turn, the first parameter slowest, with every seed
within a combination. The same manifest gives the same list, index for index,
on every machine.

**Identity.** `experimentHash()` is the manifest's identity: the bench's
canonical JSON, hashed with FNV-1a. Any edit changes it, and a saved result
knows whether its manifest was edited after it ran.

**Seeds.** In the laboratory scenarios the bench can sweep, the seed changes
nothing about the setup. Extra seeds therefore confirm that an answer repeats;
they do not add scatter, and the page says so. A `distribution` is how an
experiment samples a range at random, and its own seed fixes the draw.

**Sampling rate.** An orbit sampled too coarsely aliases. A binary-lab planet
at 0.1 separations orbits in about eight frames, and sampled every other
frame its period comes out close to double. The default, and the page's
setting, is to sample every frame.

**Migration.**
- A bench sweep specification (the Experiments panel's own) converts to a
  manifest with `fromSweepSpec()`.
- `migrateExperiment()` reads any manifest this build knows. A newer
  `formatVersion` is refused with a reason, never read in part.

## One trial, in a realm of its own

`js/experiments/trialRunner.js` is what each Worker does. It is kept apart
from `js/experiments/experimentWorker.js`, which only handles messages, so a
test can run the same calculation in a clean Node realm. For each trial it:

1. **Builds the scenario the way the page does.** It builds once to stamp the
   scenario's own settings, sets the trial's values, and builds again, which
   carries the laboratory's variables. After each build it does what
   `initialize_simulation` does: bumps the world generation, and resets the
   clock, the absorption ledger and the conservation baseline.
2. **Checks that every value survived the rebuild,** or reports
   `buildFailed`, rather than running the wrong world and reporting a flat
   line.
3. **Finds the bodies by role,** as the bench does.
4. **Integrates** at the fixed frame, splitting it into substeps.
5. **Samples** the metrics every `sampleEvery` frames.
6. **Stops** at the duration, at a stop event, when a body is lost
   (`lostBody`), or at the sample limit (`capped`).
7. **Reduces** with the bench's `reduceRun()`, and keeps a thinned series of
   at most 120 points per metric for the plot.

Two hazards this guards against were found while building it. Each produced
trials that ran, reported `ok` and measured nothing:

- **The scenario forgot its own numerics.** `js/scenarios.js` remembers the
  last preset it set up. A second build of the same laboratory in the same
  realm carries the laboratory variables from the new settings object,
  including a step cap still at its default. The trial then ran at one 62.5-unit
  step per frame instead of 63 substeps.
- **The engine stepped the discarded bodies.** Its list of every body is
  refreshed only when the world generation is bumped. Without the bump, the
  integrator kept stepping the previous world while the lists held new
  bodies that never moved.

`tests/experimentTrial.test.js` holds both hazards, in a fresh Node process.

**The engine fingerprint.** `engineFingerprint()` builds a reference world,
integrates it for 60 frames, and hashes the bodies' positions to 10⁻⁹ of a
simulation unit. It goes into every result. A later build whose integration
differs in any way gives a different fingerprint, so a saved result can say
it no longer reproduces, and why.

## The scheduler

`js/experiments/scheduler.js` runs the trials. It starts **a new Worker for
every trial** and terminates it the moment the trial answers. That is the
whole isolation story: no two trials share a realm, so none can inherit
another's id counter, baseline or caches.

| What | How |
|---|---|
| Concurrency | at most `limits.concurrency` realms at once |
| Ordering | results are reported by trial index, whatever order they finish in |
| Progress | each running trial's fraction, and the whole run's. A realm reports a few times per trial, not once a frame |
| Cancellation | every running realm is terminated; every queued trial is reported `canceled`, not dropped |
| Trial timeout | a realm past `trialTimeoutMs` is terminated, and the trial reported `timeout` |
| Total timeout | at `totalTimeoutMs` the run stops. Finished trials are kept, the rest reported, and the run says why it is `partial` |
| Result cap | a trial whose answer would take the run past `maxResultBytes` keeps its status and loses its numbers (`resourceLimit`) |
| Corrupt answers | an answer that is not this trial's result is `corrupt`; a realm that fails to start, throws or dies is `workerFailed`. Neither is an exception |
| Checkpoints | results from an earlier run of the same manifest are not run again |

**Checkpoints** are per trial, and nothing finer. Trials are independent, and
each is a pure function of the manifest, its values and its seed, so a
finished trial is a finished fact. The state inside a running realm is a
physics world with no serialization, so an interrupted trial runs again from
the start. Only real outcomes are kept, such as `ok`, `lostBody` or `capped`.
A trial that was canceled or timed out, or whose realm died, is a scheduling
event, and Resume runs it again.

Results carry what is needed to reproduce them, or to say why they cannot be
reproduced:

- the manifest and its hash;
- the engine fingerprint, the app build and the platform API;
- the device profile and concurrency;
- start and finish times;
- every trial's numerics: integrator, frame advance, step, substeps.

`reproducibility()` compares a saved result with this build:

- **A changed engine fingerprint** is a reason it will not reproduce, and it
  says so.
- **An edited manifest** is a reason.
- **A different app build** is only a note: if the engine integrates the same
  way, the numbers will be the same.

## The page

`/experiments/` is its own bundle, like `/figure/`. The simulation never
imports it, and the page never loads the engine itself; only its Workers do.

- **Pricing.** Before anything runs, one trial is built in a realm, and
  that realm times itself: its start-up, the build, and a short burst of the
  world it built. The whole experiment is priced from that, on this device,
  and checked against the device's profile. An experiment is refused if it
  would outlast the budget, hold too much, wait on one trial too close to its
  timeout, or run trials that would all stop at the sample cap. The page lists
  the reasons, and Run stays off. The plan is cached per manifest, so an
  unchanged form is not priced twice.
- **Running.** Run, Cancel, and Resume, which appears when a checkpoint
  exists.
- **Reporting.** A progress bar and a status line, which a screen reader
  hears once a second or when a trial finishes, not continuously. Then:
  - a summary table per value (mean, lowest, highest, spread across seeds,
    trials used, trials left out);
  - every trial in planned order;
  - an SVG plot of each trial and the mean line, with a log axis when the
    values span more than two orders of magnitude (the plot's label says so,
    and the table beside it holds the same numbers);
  - the manifest.
- **Saving and checking.** The result downloads as JSON, and the trials as
  CSV. "Check a saved result" reports whether a pasted result reproduces
  here, or reads a pasted manifest or bench sweep.
- **Language.** English and Spanish, with its own catalogue pair
  (`js/i18n/{en,es}.experiments.js`).

## Device profiles, and what each may run

Measured with `npm run bench:experiments` (`tools/experiment-bench.mjs`) on
the sources, as GitHub Pages serves them (with its `max-age=600` caching), in
Chromium 151 headless on an Intel Core i5-10500: 6 cores, 12 threads, 24 GB.
Chromium reports 6 cores there, so the page gives it 5 realms. 25 September
2026.

### How an experiment is priced

The first bench runs priced a trial as integration work divided by one rate
per device. The measurements ruled that out three ways:

| What varies | By how much |
|---|---|
| The laboratory | Binary Planet integrates at about 800 body-steps a millisecond in a lone realm, Gravity Assist at about 200. With two or three bodies, a step's bookkeeping costs more than its forces, so the rate per body is not a property of the device |
| The trial's length | A fresh realm starts in the interpreter. A 4,000-unit Binary Planet trial integrates at half the rate of a 40,000-unit one |
| Realms at once | On the bench machine, each of 5 realms keeps about half of a lone realm's speed, with a core apiece: the clock falls as cores wake |

So the price is timed on the device that will run it. The page's planning
realm, which builds trial 0 anyway, also records:

- its own start-up (a Worker's clock starts when it is made, and the page's
  message waits until the engine has loaded);
- the build;
- a short burst of the planned world, up to 160 ms (`calibrate()` in
  `js/experiments/trialRunner.js`). The rate is taken from the burst's
  second half, once the engine is compiled; the first half's excess is the
  warm-up a trial pays once. A trial short enough to finish in the burst is
  simply timed.

A trial then costs start-up, build and warm-up, plus its steps at the timed
rate, divided by the profile's `parallelShare` when realms run together. A
plan without timing (a clock too coarse to time the burst) falls back to the
profile's `setupMs` and `rate`, measured on the slowest laboratory, so that a
guess errs towards refusing.

### Profiles

| | low-end | desktop |
|---|---|---|
| Which devices | 4 cores or fewer, or 4 GB or less where the browser says | the rest |
| Realms at once | 2 | one per spare core, at most 8 |
| Trials per experiment | 120 | 400 |
| Time budget | 5 min | 20 min |
| Trial timeout (refused past 80% of it) | 60 s | 120 s |
| Samples per trial (default cap) | 4,000 | 20,000 (5,000) |
| Results | 4 MB | 16 MB |
| Memory held at once | 256 MB | 1 GB |
| `parallelShare` (measured) | 0.85 | 0.5 |
| Fallback `setupMs`, `rate` | 220 ms, 50 body-steps/ms (modelled) | 60 ms, 200 body-steps/ms |

**The low-end figures are modelled.** Chromium will not slow a Worker down
(`Emulation.setCPUThrottlingRate` answers "Operation is only supported for
pages, not workers"), and all of an experiment's work is in its Workers. So
the low-end rows run the low-end profile's two realms on the bench machine,
measured, and model a low-end device's speed as a quarter of it: the CPU
slowdown Chrome's DevTools applies for a mid-tier phone. On a real low-end
device none of this is needed: the price is timed there.

### Throughput

Twelve trials a case, one seed, sampled every frame; the load average was 3
to 5.5 over 12 threads. The low-end wall time, set-up and rate are modelled
(a quarter of the measured speed); the rest is measured.

| Profile | Case | Realms | Wall | Median trial | Set-up | Rate (body-steps/ms per realm) | Price ÷ actual | Share | CPU |
|---|---|---|---|---|---|---|---|---|---|
| desktop | Binary Planet, 4,000 units | 5 | 0.37 s | 144 ms | 95 ms | 266 | 0.95 | 0.47 | 0.91 |
| desktop | Binary Planet, 40,000 units | 5 | 0.84 s | 316 ms | 59 ms | 511 | 1.12 | 0.56 | 1.09 |
| desktop | Gravity Assist, 4,000 units | 5 | 0.51 s | 191 ms | 86 ms | 149 | 1.06 | 0.53 | 0.95 |
| low-end | Binary Planet, 4,000 units | 2 | 1.7 s | 70 ms | 164 ms | 104 | 1.11 | 0.94 | 1.63 |
| low-end | Binary Planet, 40,000 units | 2 | 4.6 s | 194 ms | 160 ms | 199 | 1.03 | 0.88 | 1.58 |
| low-end | Gravity Assist, 4,000 units | 2 | 2.8 s | 115 ms | 156 ms | 51 | 1.04 | 0.89 | 1.42 |

- **Set-up** is from starting a realm to its first step. The build is 4 to
  5 ms of it; the rest is the Worker starting and importing the engine.
- **Price ÷ actual** is the page's price for one trial, made from the plan
  before anything ran, over the trials' median. Within 0.95 to 1.12 on the
  desktop, and 1.03 to 1.11 on the low-end profile, where the planning realm's
  own start-up, the first of the page, is the slowest (1.3 in one later run,
  for the shortest trials).
- **Share** is a lone realm's price over the median trial, the figure
  `parallelShare` is set just below.
- **CPU** is the renderer's CPU time over the realms' lifetimes: near 1 or
  above, every realm had a core. Above 1 is the page and the compiler.
- Three consecutive runs agreed within 5% on every rate. An earlier run
  under a load average of 30 to 50 measured a quarter to a half of these
  rates, with a CPU share of 0.25 to 0.6: a bench run is only worth quoting
  when its CPU column is near 1.

### Memory

| Profile | Case | Realms | Peak heap, page and realms | Of which in realms | Resident increase | Results |
|---|---|---|---|---|---|---|
| desktop | Binary Planet, 4,000 units | 5 | 1.8 MB | not caught | 78.5 MB | 36 KB |
| desktop | Binary Planet, 40,000 units | 5 | 14.2 MB | 12.2 MB | 27.8 MB | 62 KB |
| desktop | Gravity Assist, 4,000 units | 5 | 15.4 MB | 13.5 MB | 7.0 MB | 62 KB |
| low-end | Binary Planet, 4,000 units | 2 | 5.6 MB | 4.0 MB | 39.7 MB | 36 KB |
| low-end | Binary Planet, 40,000 units | 2 | 6.2 MB | 4.3 MB | 16.8 MB | 62 KB |
| low-end | Gravity Assist, 4,000 units | 2 | 8.3 MB | 6.4 MB | 3.5 MB | 62 KB |

- The heap is each realm's own, read through its debugging session
  (`Runtime.getHeapUsage`) every 200 ms and summed; the first case's
  140 ms realms mostly came and went between two readings. Headless Chromium
  offers no `measureUserAgentSpecificMemory()`.
- The resident increase is the renderer process's, over its size before the
  case. The first case of each profile includes the page's own first use of
  the engine's modules.
- A realm holds 2 to 4 MB of heap. The price allows 8 MB a realm
  (`REALM_BYTES`) plus 48 bytes a sample per metric, which at the caps keeps
  the largest accepted experiment under 70 MB (below).
- Results are 3 to 5 KB a trial: each metric's value and a series of at most
  120 points. The samples themselves die with their realm.

### The largest experiments each profile accepts

Priced by this build's own `estimate()` and `refusals()`, from plans timed on
the bench machine (a quarter of it for the low-end profile), as the page would
make them: one at 10,000 units, timed whole, and one at 200,000, timed warm,
for the longer trials. One metric, sampled every frame. The page's default
length is 10,000 units. The load average was 4.4 to 5. The
laboratories are the four the bench can sweep (`SWEEPABLE` in
`js/experiments/sweep.js`).

| Laboratory | Bodies | Units a frame | Profile, realms | Longest trial (stopped by) | Trials at 10,000 units | Largest: trials at the longest |
|---|---|---|---|---|---|---|
| Binary Planet | 3 | 62.5 | low-end, 2 | 200,000 (the bench's bound) | 120 in 22 s | 120 in 172 s |
| | | | desktop, 4 | 200,000 (the bench's bound) | 400 in 16 s | 400 in 122 s |
| | | | desktop, 8 | 200,000 (the bench's bound) | 400 in 8 s | 400 in 61 s |
| Circumbinary Planet | 3 | 125 | low-end, 2 | 200,000 (the bench's bound) | 120 in 20 s | 120 in 185 s |
| | | | desktop, 4 | 200,000 (the bench's bound) | 400 in 14 s | 400 in 131 s |
| | | | desktop, 8 | 200,000 (the bench's bound) | 400 in 7 s | 400 in 65 s |
| Gravity Assist | 2 | 33.3 | low-end, 2 | 133,300 (sample cap) | 120 in 57 s | 54 in 291 s (time budget) |
| | | | desktop, 4 | 166,633 (sample cap) | 400 in 40 s | 400 in 570 s |
| | | | desktop, 8 | 166,633 (sample cap) | 400 in 20 s | 400 in 285 s |
| Gravity Assist: Heliocentric | 3 | 0.25 | low-end, 2 | 999 (sample cap) | refused: capped | 120 in 22 s |
| | | | desktop, 4 | 1,249 (sample cap) | refused: capped | 400 in 17 s |
| | | | desktop, 8 | 1,249 (sample cap) | refused: capped | 400 in 9 s |

The classes these amount to:

- **Every laboratory runs its full sweep on every profile**: the profile's
  full number of trials, in under a minute on the low-end profile and under
  45 s on a desktop. At the page's default length for all but Heliocentric,
  and at 1,249 or 999 units there.
- **The time budget binds only at the extreme**: 120 trials of the longest
  Gravity Assist on the low-end profile would take past 5 minutes, so it takes
  54. Nothing else reaches it, and no trial comes near its timeout: the
  slowest, a 133,300-unit Gravity Assist trial on the low-end profile, is
  priced at about 11 s, against a refusal at 48.
- **The sample cap binds the assist laboratories.** Sampled every frame, a
  trial stops at the cap; a capped trial is left out of every average, so an
  experiment of them would run to the end and report nothing. The page refuses
  it and names the length that fits (`wouldBeCapped`). Heliocentric advances a
  quarter of a unit a frame, so the page's default of 10,000 units is refused
  there, with 1,249 (desktop) or 999 (low-end) offered instead.
- **Memory never binds**: the largest accepted experiment is priced at about
  70 MB, against ceilings of 256 MB and 1 GB. The ceiling is there for a
  laboratory with many more bodies than these.

## Tests

- `tests/experimentManifest.test.js` (21 tests):
  - the rules, bounds and excluded ranges;
  - trial order for one and two parameters;
  - seeded distributions and manifest identity;
  - profiles; pricing from a timed plan and from the fallback; refusal,
    including trials that would all be capped and memory;
  - result shape, summaries and reproducibility;
  - the CSV, whose seeds are disarmed the way every other export's text is;
  - migration from a bench sweep, and refusal of a newer format.
- `tests/experimentScheduler.test.js` (12 tests), with fake Workers and a
  fake clock:
  - one disposable realm per trial, and the concurrency bound;
  - the same results whatever order realms finish in;
  - progress;
  - corrupt answers, unknown messages, errors, crashes and spawn failures;
  - the trial and total timeouts, and the result cap;
  - cancellation, and resuming from a checkpoint that keeps outcomes and
    re-runs scheduling failures.
- `tests/experimentTrial.test.js` (11 tests), in a clean Node realm:
  - a real orbit at the scenario's own numerics, checked against absolute
    values;
  - the same result in a realm that built other worlds first, and in two
    realms;
  - the stability boundary;
  - refusal of a value that does not survive the rebuild;
  - stop events and the sample cap;
  - the fingerprint, stable and sensitive to a change of one part in a
    million in the step;
  - the calibration: its warm rate and warm-up on a clock that is slow at
    first, a short trial timed whole, a clock too coarse to time anything,
    and, in a realm, the real engine's own clock accounting for every step
    it counts, in the planned world, over the time the real clock gives it.
    No rate is asserted, because a loaded machine's true rate can be a
    fiftieth of a quiet one's.
- `e2e/experimentRunner.spec.js` (9 tests), against the sources and `dist/`:
  - every trial in its own Worker, all closed, in order;
  - the same numbers twice;
  - cancel and resume;
  - a small device refused, with the reason;
  - a price timed on this device, and Heliocentric's default length refused
    as capped, then run at the length the page names;
  - a saved result reproducible and an edited one not;
  - Spanish;
  - no axe violations before or after a run;
  - under the sources only, a hung realm timed out and a garbled answer
    reported, with real Workers.
