# Experiment runner II: reproducible random experiments

Roadmap III, Prompt 265 (tranche T5, authorized by Checkpoint V's recorded outcome
CONTINUE AS PLANNED). The experiment runner runs sweeps with its own seeds and record
shape. This adds the platform's instrument for random experiments that repeat to the
digit: ensembles of one world with different seeds, injection campaigns, and a
bootstrap over the trials of a finished result, each described by one record that names
its random streams, runs on the Worker pool, summarises through the statistics kernel
and re-runs from the record alone. The code is `js/experiments/ensemble/` (the lazy
tier, imported by no shipped module); the record is `gravitas.experiment/2`.

**What this is not.** It is not a measurement of nature. An ensemble of this engine's
runs reports what this engine does under its stated numerics; the three-body kind's
energy drift is a regression context (Prompt 137), not validation. Evidence class S
(software works); no V claim.

## What was built, and what was not

| Item of the prompt | State |
|---|---|
| 1. The record gains ensemble fields; the runner schedules on the pool with cancellation and progress; a trial's result is a 150 record; the summary through 154 | **Built** (`record.js`, `run.js`, `trial.js`, `worker.js`, `summary.js`). |
| 2. Kinds: sweeps re-seeded through 149's legacy adapter, ensembles, injection campaigns (184 and 229 as clients), bootstrap over trials; each reproducible from the record alone, in the page and headless | **Built** for sweep, ensemble (two worlds), injection with 229's matched filter as the client, and bootstrap. **Not built:** Prompt 184's frame injection as a client (it needs a frame from the Observatory and already carries its own (seed, trial) keys and replay; the client slot is the registry in `kinds.js`). |
| 3. The bench and the analysis lab read the new summaries; the report cites an experiment by its digest | **Built as pure adapters** (`legacySummary`, `legacyRows`, `citation`) that hand those readers the shape they already read, tested. **Not built:** a changed panel. Nothing in a page creates an ensemble yet, so nothing there can open one. |
| 4. Upper depths of "Extending an Experiment" and "Integrators in Practice"; the investigation "Luck or law?" | **Not built.** A lesson step changes the instructor answer keys, which only Carl's ciphertext rebuild can follow (the instructor materials are not editable here); the instructor closure is at its cap; the deferred bundle has 0.2 KB of room; and the consumers rule holds a kernel from a lesson until it passes (it has passed but for one failing leg, below). Held for Carl. |

## The record

```jsonc
{
  "format": "gravitas.experiment", "formatVersion": 2, "title": "...",
  "ensemble": {
    "kind": "ensemble",                    // ensemble | injection | bootstrap | sweep
    "seed": "p265-a5", "trials": 24,
    "fork": "trial-index",                 // trial i draws from stream(id, seed, "trial", i)
    "streams": [{ "id": "experiments", "algorithm": "mulberry32", "version": 1, "key": "p265-a5:trial" }],
    "kernels": { "random-streams": "mulberry32@1", "ensemble-runner": "1",
                 "statistics": "student-t+percentile+case-bootstrap@154", "engine-three-body": "1" },
    "config": { "world": "three-body" },   // the kind's own
    "summary": { "level": 0.95, "draws": 1000 },
    "limits": { "maxResultBytes": 4000000 },
    "result": {                            // written once it has run
      "status": "complete", "engine": { "fingerprint": "..." },
      "trials": [{ "index": 0, "status": "ok", "outcome": "bound", "artifact": { /* gravitas.artifact */ } }],
      "summary": { /* ... */ }, "digest": "<sha-256>"
    }
  }
}
```

- **Version.** A record is `gravitas.experiment/1` as before unless it uses the
  `ensemble` block, then `/2` (`withVersion`). A 2.0.0 reader accepts an unknown field
  and drops it silently (FORMATS.md), so the version, which it refuses in words
  ("newer than this Gravitas reads"), is the capability-required refusal the policy asks
  for. A /1 manifest is written byte for byte as before. The corpus row is
  `ensemble-fields` (`tests/compat/boundary.mjs`); the schema is `experiment-2.schema.json`.
- **Streams and the fork.** The record lists the stream each trial draws from. Trial i
  draws only from `stream(id, seed, 'trial', i)` of Prompt 149 (key `<seed>:trial:<i>`),
  so no trial's draws depend on the order trials ran in or on the realm that ran them.
  The pool hands the same fork to a job (`job.stream`, the index its last label).
  A **sweep** keeps the draws its recorded results were made with (amendment AM1): its
  fork is `legacy-sweep`, a trial's world is built with the manifest's own seed text
  (the engine stream) and a distribution's values are `stream('experiments', seed)`,
  which equals `valuesFor` (leg A6).
- **Kernel versions.** The streams' algorithm and version, the runner's version, the
  statistics methods and the kind's own kernel. A record whose versions differ from this
  build's is reported as not reproducible, with the reason, and is still replayed.
- **Trials are 150 records.** Each trial that measured something is a
  `gravitas.artifact` envelope (units are registry ids, origin `synthetic`, uncertainty
  `none`); the summary is one, with an interval or `not-constrained` per quantity.
- **The digest** is SHA-256 over the exact canonical JSON of the inputs and each
  trial's index, status, outcome and envelope. Wall times are outside it. A report cites
  an experiment by it (`citation(record)` is a `provenance` block the envelope accepts);
  an edit changes it.

## The kinds

| Kind | Stream | A trial | Checked against |
|---|---|---|---|
| `ensemble`, world `analytic-draw` | `experiments` | u uniform, z standard normal from the trial's stream; outcome class `high` when u >= 0.5. Synthetic and closed form. | the oracle (A1, B) and coverage (C1, C2) |
| `ensemble`, world `three-body` | `experiments` | the engine's Lagrange triangle (three 6-solar-mass stars, G = 2), every coordinate and velocity nudged by up to 1% of its scale, 1000 steps of 0.05 s: the relative energy drift, the closest pair separation, the largest distance from the centre of mass, and the outcome by that distance (bound, one escaper, dispersed). | replay (A5), Prompt 137's group (A8, A8b) |
| `injection`, client `matched-filter-229` | `injection` | a signal of known strength is injected and Prompt 229's `recover` draws the search's statistic S_true + e against the 7.1 threshold. | the analytic efficiency Phi(S - 7.1) (C3) |
| `bootstrap` | `experiments` | one resample of the values a finished result carries (in the record), its mean or median. | the summary's own bootstrap (B4) |
| `sweep` | `engine` | a trial of the existing runner (`trialRunner.runTrial`), as `gravitas.experiment/1` runs it. | `runTrial` itself (A7) |

The three-body outcome is by distance at the end of the run, not by energy: a pair that
is still bound while a third body has not yet reached the stated radius is `bound`. The
kind says so; it is an engine fact under a fixed step, not a statistic of the problem.

## The runner

`startEnsemble(record, { spawn, concurrency, ... })` puts the trials on Prompt 153's
pool: deterministic scheduling (the start order is the submission order), each job
carrying its stream fork, a time limit per trial and for the run, a result byte cap, a
memory declaration (`REALM_BYTES`), progress, cancellation that terminates every realm
and keeps what finished, and resume (`keptRows`) that runs only what was not kept.
`runSerial` does the same in one realm. Both end in the same record and the same digest
(A2 to A5). `replay(record, run)` runs it again from its inputs alone and compares;
`reproducibility(record, here)` says first whether this build can be expected to agree.
The pool's adoption by the sweep scheduler (`js/experiments/scheduler.js`) still waits
(`WORKER_POOL.md`); the ensemble runner is a client of the pool from its first line, and
nothing shipped imports it.

## The summary (Prompt 154)

Per quantity: the mean with Student's t interval (`studentInterval`), the median with a
case-bootstrap percentile interval on the named stream
`stream('experiments', seed, 'bootstrap', metric)` (`caseBootstrap`, `percentileInterval`;
draw d takes n uniforms in turn, index = floor(u * n)), quantiles by linear
interpolation, and the count and share of each outcome class. A trial without a number is
counted and left out. An interval the kernel refuses (fewer than two values, constant
values) is carried as `not-constrained`; a width is never invented.

## The validation contract (committed first)

`tests/fixtures/experiments-ensemble/thresholds.json` was committed alone and first
(`d07da618`), before any ensemble code, oracle output or run; the independent oracle
(`tools/experiment-ensemble-oracle/oracle.py`, `python3 -E`, numpy and scipy, no Gravitas
code) and its pinned output followed (`ec50fe41`), then four amendments, each recorded
before the run it concerns and none moving a bound (`amendments.json`). The validator is
`tools/experiment-ensemble-validate.mjs` (`npm run experiments:ensemble:validate`);
`results.json` and `failed-legs.json` are its second full run, `first-run-results.json`
its first.

| Leg | What | Result |
|---|---|---|
| A1 | 20 trial forks x 64 draws for five seeds against the independent Python implementation | **pass**, 0 of 6,400 differ |
| A2 | 200 trials replayed from the record: digest and every quantity | **pass** |
| A3 | the same record on the pool, realms finishing in a shuffled order, concurrency 1, 3, 8 | **pass**, one digest |
| A4 | cancelled after 60 trials, kept trials equal the serial run's, none dropped, resume runs only the rest | **pass** |
| A5 | the three-body kind, 24 trials: two fresh processes and a real worker_threads realm per trial | **pass**, one digest |
| A6 | 20 seeds x 5 counts: a distribution's values from the named stream equal `valuesFor` | **pass**, 0 of 100 differ |
| A7 | the sweep kind equals `runTrial` on 3 trials of the corpus manifest, every metric | **pass** |
| A8 | the three-body kind (the scenario's own settings) against Prompt 137's group, 1e-9 | **FAIL, left failing** |
| A8b | the same with the validation lab's settings (a new leg, amendment AM3) | pass, equal to the digit |
| B1 to B5 | mean, sd, Student interval, quantiles, bootstrap interval and class counts against numpy and scipy | **pass** (1e-12 or better) |
| C1 | 95% Student interval of the mean, 400 ensembles of 30 | **pass**, coverage within the band |
| C2 | 95% bootstrap interval of the median, 200 ensembles of 50 | **pass** |
| C3 | injection recovery at S = 6.0, 7.1, 8.0, 2000 trials each, against Phi(S - 7.1) | **pass**, within 0.04 and the interval holds the analytic value |
| D1, D2 | refusals and reports (fewer than 2 trials, over the cap, unknown kind, stream, client or kernel, a foreign stream, a wrong fork rule, constant values, an all-failed ensemble, an edited record, a kernel or engine that differs) | **pass** |
| E1 to E3 | the record's corpus row, every trial an accepted envelope, the digest as a citation | **pass** (the 2.0.0 reader's refusal is the Jest corpus) |
| F1 | authentic data | **not applicable**: no claim about real data |
| F2 | Node 20 and the browser engines | **NOT RUN here**: CI runs them; no stored number passed through libm |

**The failed leg.** A8 asks that the three-body kind, on the scenario as the engine builds
it, reproduce the regression group's median and 90th percentile to 1e-9. It does not:
median 0.00578 against 0.00615, 90th percentile 0.314 against 0.479. The cause is the
world, not the draws: the scenario carries `orbit_decay_rate` 0.005 and
`min_interaction_distance` 0, which the validation lab sets to 0 and 1e-6; the regular
seeds agree to the digit and the chaotic ones do not. Both numbers are inside the group's
committed regression bound (drift lower than recorded). It is left failing, as
committed, and AM3's new leg A8b, with the lab's settings, agrees to the digit. The
meaning for a student-facing use: the scenario's own world and the validation lab's give
different ensembles; a lesson must say which it ran.

**A property found on the way.** An engine realm remembers the world it built last: the
regression group's own `distribution()` returned a median of 4.5e-5 after binary-planet
worlds had been built in the same realm (amendment AM4). The engine legs therefore run in
fresh processes; the runner's engine kinds should be run in a realm of their own (the
worker does), and a serial run of several worlds in one realm is for the analytic kinds.

## Determinism across machines

Draws are exact on every engine (`Math.imul` and a division by 2^32). A number that
passes through `Math.log`, `exp`, `sin`, `cos` or `pow` can differ in the last bit between
Node versions (CI runs Node 20, this Mac Node 24), and a chaotic run amplifies it, so a
replay is compared in one environment and **no stored golden holds such a number**. What
is stored is exact: raw draws (in the oracle), counts, and the digest of a kind whose
arithmetic is `+ - * /` and `sqrt` only. Measured here: the three-body record of leg A5
has digest `d7156dc1...` on Node 24.4.0 and `c7be2a6b...` on Node 22.23.4, the same
record, which is why none is stored as a golden. The pinned results are the run on
Node 22.23.4; every leg's status was the same on both.

## Files

`js/experiments/ensemble/{kinds,record,trial,summary,run,worker}.js`;
`js/experiments/experimentManifest.js` (the shipped reader reads /2 and does not run it;
a /1 record with an ensemble block is refused); `js/validation/harness.js` (`applyLabSettings`, for the three-body kind's
`validation-lab` option); `sdk/schemas/experiment-2.schema.json`;
`tests/experimentEnsemble.test.js`, `tests/experimentEnsembleResults.test.js`,
`tests/compat/boundary.mjs` (`ensemble-fields`), `tests/fixtures/experiments-ensemble/`;
`tools/experiment-ensemble-{validate,child,regression-child,worker-shim}.mjs`,
`tools/experiment-ensemble-oracle/oracle.py`. The module is in `NEVER_PRECACHED`
(`tools/build-service-worker.mjs`): no page can fetch it, so an install has no use for it.

## Held for Carl

1. Item 4 (the two upper depths and "Luck or law?") and a panel that creates an ensemble:
   they need the instructor ciphertext rebuild, a closure-cap raise and about 3 to 6 KB of
   deferred room, none of which is mine to take. The lazy module is ready for them.
2. Whether A8 stays failing (it is the committed leg) or is read as replaced by A8b for the
   lesson's statement; this branch changes nothing in either direction.
3. Prompt 184's frame injection as a second client, when an Observatory frame source is
   wanted.
4. The sweep scheduler's adoption of the pool (`WORKER_POOL.md`), which costs a request
   and first-visit bytes and is a data-budget decision.

<!-- Listed in DOCUMENTS.md. -->
