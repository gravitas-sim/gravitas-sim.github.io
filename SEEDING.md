# Seeding: named streams that keep every old sequence

Prompt 149. A student can reproduce today a world from a seed, a noisy light
curve from a seed, an experiment's trials from a seed. A single new generator
would change every one of them, so this is not one: it is one API in
`js/random/streams.js` that names the streams and reproduces each existing
sequence bit for bit. Nothing about any sequence changed.

## The API

```js
import { stream, state, gaussian, engine } from './random/streams.js';

stream('noise', seed)                // uniforms in [0, 1), seed as given
stream('forward', seed, 'epoch', 3)  // the seed forked: "seed:epoch:3"
stream('experiments', 'sweep').fork('trial', 2) // a sibling stream of its own
state('noise', mixed32)              // a site that salts or mixes its own state
gaussian(stream('noise', String(seed))) // Box-Muller, the spare kept
engine(seed, () => buildWorld())     // Math.random is the engine's stream inside
```

- **Algorithm and version.** `ALGORITHM` is `mulberry32` and `VERSION` is 1: the
  generator in `js/rng.js` seeded by `normalizeSeed` (the text FNV-1a hashed, a
  non-negative integer as itself). A stream says what it is in `draw.stream`:
  `{ id, algorithm, version, key }`, so a record that names its streams has
  something to copy. A different algorithm is a different `algorithm` value, never a
  change of this one.
- **Identities** (`STREAMS`): `engine`, `effects`, `forward`, `noise`,
  `experiments`, `injection`. An unknown identity throws. `forward` is what
  decides when and where an instrument looks (epochs, schedules, per-epoch
  draws); `noise` is measurement noise; `injection` is the synthetic universe,
  population or signal a model puts in; `experiments` is what varies or
  resamples a run (a distribution of parameter values, a bootstrap, the variant
  an item is given); `effects` is what is drawn for how it looks.
- **The engine's stream** is `js/rng.js`'s `withSeed`, wrapped and not changed:
  `engine` is that function, and the world build, the collisions and the
  thirteen particle bursts draw from the `Math.random` it installs (`effects`
  draws that way too). The adapter holds only because `initialize_simulation`
  stays synchronous.
- **A fork** is the seed with labels appended (`seed:label:label`, each as
  its text, the way every site wrote it). `draw.fork(...)` is a sibling stream of
  its own, so a sub-experiment's draws never wait on another's order. A job that
  runs in a Worker is given its fork (`stream('experiments', run, 'job', i)`) and
  draws the same numbers whenever and wherever it runs.
- **Deterministic across page, Worker and headless**: the module imports only
  `js/rng.js`, reads no clock and no global but `Math`. The same module draws the
  same numbers in a Node main thread, a Node Worker and a browser page.

## The stream table

| Stream | Algorithm, version | Owner | Moved to the API | Waiting, and why |
| --- | --- | --- | --- | --- |
| `engine` | mulberry32 v1 (`withSeed`) | `js/rng.js`, wrapped as `engine` | `tools/seeded-step.mjs` | `js/world/build.js`, `js/scenarios.js`, `js/placement.js` and `js/engine/*` (the thirteen bursts and the collisions) stay on the `Math.random` that `withSeed` installs, by design (lint-allowed). `js/world.js` is on the front door's start-up path (107 of 107 requests); `js/systemBuilder.js` and `js/scenarioPackWorld.js` would only rename `withSeed`; `js/experiments/trialRunner.js` receives `rng` as an argument |
| `effects` | the engine's, and mulberry32 v1 for scenery | the engine; `js/bodyDrawSky.js` | the bursts (through `engine`, unchanged) | `js/bodyDrawSky.js` starfield and `js/lesson/evolutionScene.js` are static on the front door, sandbox and lessons (+1 request on 107 of 107); `js/stellarEvolutionWidgets.js` is the widgets family (another session's); `js/blackHole/geometry.js` +1 request on the front door by the screen |
| `forward` | mulberry32 v1 | `js/forward/`, `js/kernels/variables/` | `forward/setup.js` `uniformAt`; `variables/classify.js` `nightlyEpochs` | `js/rvSchedule.js` (salted state): +19 B gzipped (see the note below) |
| `noise` | mulberry32 v1, Box-Muller | `js/inference/`, `js/kernels/`, `js/gw/` | `inference/synthetic.js`; `kernels/lensing/microlensing.js` (its own `noise.js` is gone); `kernels/cosmology/fit.js`; `kernels/detector/frame.js`; `gw/noise.js`; `light/model.js` (its own copy of the generator is gone) | `js/rvSurvey.js` `gaussianAt` (mixed state, +19 B); `js/inference/rvMonteCarlo.js` (its normal clamps instead of redrawing, a different variant, +15 B; its uniform could move) |
| `experiments` | mulberry32 v1 | `js/experiments/`, `js/kernels/variables/` | `variables/period.js` `bootstrapPeriod` | `experiments/experimentManifest.js` `valuesFor`: +1 request on `/experiments/` (57 to 58 of 57); `composer/compile.js` `variantStream`: +1 request and 1.8 KB on `/studio/lesson/` and on `/studio/course/packs/` (31 to 32 of 31; 44 to 45 of 44); `analysis/stats.js` `stream`: its header's rule (it imports nothing, so no lazy chunk gains a shared one) |
| `injection` | mulberry32 v1 | `js/survey/`, `js/stellar/`, `js/kernels/` | `cosmology/fit.js` redshifts; `variables/classify.js` `makeSample`; `survey/model.js` placement and detection | `stellar/population.js`: +1 request on the four lesson routes (146 to 147, 148 to 149, the transit and power-law tool steps 151 to 152 and 149 to 150), through `js/lessonStage.js`; `js/lab3d/state.js`: a source of the instructor bundle |

The three byte-only waits (`rvSchedule`, `rvSurvey`, `rvMonteCarlo`: +19, +19, +15 B
gzipped, no request on any route) fit the 95 bytes together and would leave 42; they
are held back so that the open widgets PR (#390), which wants that margin, and the
queue keep it, and move with the same proof (v3's copy of the file in
`tests/fixtures/seedingLegacy/` and a probe in `tools/seeding-probes.mjs`) when it
is settled.

Not on the API and not seeded, kept as `Math.random` with the file listed in
`eslint.config.js` (`MATH_RANDOM_ALLOWED`): `main.js` (a colour), `audio.js` (a
noise burst), `captureMeasure.js` (a demo pick), `evaluationKit.js` (an
anonymous code name), and the random suffix of a record id in `myWork/made.js`,
`experiments/store.js` and `notebook/entry.js`. Other seeded copies that remain, with a
reason: `darkMatterWidgets.js` (a linear congruential generator, a different
algorithm, in the widgets family), `validation/groups/` (not published to a visitor).

## Equivalence

`tests/seedingEquivalence.test.js` (18 tests):

1. **Every moved site, 145 cases, against v3 in the same process**
   (`tools/seeding-probes.mjs`, `tests/fixtures/seedingLegacy/`). The ten modules
   as v3 had them at 9847b6e5 are kept verbatim (only their import specifiers are
   rewritten to reach the modules that did not change), and 14 public functions
   are called through them and through the current modules with thirteen kinds of
   seed (text, an accented word, the empty text, digits as text and as a number, a
   number that is not an integer, a negative one, zero, NaN, null, undefined). Each
   number is compared with `Object.is`. Nothing is a stored hash, on purpose: nearly
   every site passes through `Math.log`, `cos`, `exp` or `pow` after the draw, and
   those are not bit-identical between Node versions (CI runs Node 20, a Mac Node
   24), so a digest recorded on one machine fails on the other with nothing
   changed. A deliberate change of one stream key makes the comparison fail.
   What is stored is raw draws only (`tests/fixtures/seedingRawGolden.json`, 25
   SHA-256 of 64 uniforms each): mulberry32 is `Math.imul` and a division by 2^32,
   exact everywhere.
2. **An independent reference** written in the test from the algorithm alone
   (FNV-1a, mulberry32, the documented rule for a seed) agrees with `stream`, a
   fork, `state` and `gaussian` bit for bit, including the keys `undefined:x` and
   `null:x` that a template literal writes.
3. **The engine's stream**: `engine` is `withSeed` itself (object identity),
   `Math.random` inside it is the stream's and is restored after a return and a
   throw. `tools/seeded-step.mjs` runs on `engine`, so the paired seeded steps of
   `tests/effectsRealm.test.js` (three worlds, with and without the effects module),
   the effects trace (`tests/effects.test.js`, nineteen events) and the events,
   conservation and world goldens exercise it and pass unchanged. No hash of an
   integrated world is stored by this prompt.
4. **A Worker draws what the page draws**; jobs draw the same whatever order they
   run in; a fork is a sibling.
5. **The lint rule**: `Math.random` is refused in any module of `js/` outside
   `js/random/` and the fifteen listed files, and each listed file still calls it.

## The experiment record

Whether the record names its streams is held for Prompt 176. The corpus (Prompt
134, `tests/compat`, 123 tests, green) says 2.0.0's experiment reader accepts an
unknown field and drops it silently. That would make a field that says "this ran
on these streams" present on some copies of a record and gone on others after one
round trip through an older build. And the experiment's own sites (`valuesFor`,
the engine build in `trialRunner.js`) are waits above, so a record could only name
streams the sites do not yet draw through the API. When they move, `draw.stream`
is the value to write.

## Adding a stream or moving a site

A new algorithm is a new `ALGORITHM` value and a new row here, never a change to
this one. Before a site moves: copy v3's version of its file into
`tests/fixtures/seedingLegacy/` (import specifiers rewritten, nothing else) and add
its call to `tools/seeding-probes.mjs`; compare in one process, never against a
stored digest of anything that reaches `Math.log` or `cos`. After: `node tools/route-budget.mjs`
(both configurations) and `node tools/data-budget.mjs`. The module costs 850 bytes
gzipped in the first-visit precache; the sites it replaced gave
back 831 (a copy of the generator in `light/model.js`, three copies of the normal
generator, the module `kernels/lensing/noise.js`), which leaves 95 bytes of the
ceiling on a Mac with Node 24 (see `D-R10-27`).
