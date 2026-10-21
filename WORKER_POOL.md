# The Worker pool

Background work that can be canceled, reports progress and stays inside a
memory and concurrency budget, for jobs that are new and heavy: the inference
core's profile likelihoods first, and later image processing and precomputed
grids (Prompt 153, D-R10-30). `js/workers/pool.js` is the contract; it imports
nothing, so a page and a realm can both hold it.

**State of this pull request.** The contract is built, proven and measured. Its
two first adopters, the experiment scheduler and the inference core's run, are
written as clients of the pool and held to the files they replace; **the
adoption itself waits** because it costs the first-visit install 3,517 bytes
over its ceiling and, as written, a request on `/experiments/` (see "The
adoption and its cost"). Until a shipped module imports the pool, the build
leaves it out of the install (`NEVER_PRECACHED`), and a test says so.

## The contract

| Part | What it is |
|---|---|
| Typed job | `{ index, kind?, payload?, memoryBytes?, timeoutMs?, deterministic?, transfer?, stream? }`. `index` is the job's position and its place in the results. Anything else the caller's `message` builder wants rides along. |
| Outcome | The realm's own result when it is `ok`; otherwise a record built by the caller's `outcome(job, status, extra)` with a `status` from `JOB`: `canceled`, `stale`, `timeout`, `corrupt`, `workerFailed`, `resourceLimit` (the first four of those words are the experiment scheduler's, unchanged). |
| Run | `createPool({ spawn, concurrency, memoryBytes, jobBytes, defaultJobBytes }).batch(jobs, options)` returns `{ run(), cancel(reason), state() }`; `run()` resolves with `{ status: 'complete' \| 'partial' \| 'canceled', stopReason, trials, resumed, elapsedMs, bytes }`, `trials` in job order whatever order the realms finish in. |
| Time | A limit per job (`jobTimeoutMs`, or the job's own `timeoutMs`) and one for the run (`totalTimeoutMs`). A limit that is not a number sets no timer (`setTimeout(Infinity)` would fire at once). |
| Cancellation | `cancel()` terminates every running realm, reports every queued job as `canceled`, and keeps what finished. |
| Generations | Every run gets a generation. Runs that name the same `channel` supersede each other: the older run's unfinished jobs end `stale`, its realms are terminated, and anything one of them says afterwards is dropped and counted (`pool.stats().suppressed`). A realm that echoes its `jobId` and `generation` must echo the right ones, or its answer is `corrupt`. A run with no channel supersedes nothing. |
| Memory | A job declares `memoryBytes` (or gets `defaultJobBytes`). Over `jobBytes`, not a number, or more than the caps could ever admit: refused at once as `resourceLimit`, never spawned. Otherwise the run waits while the page's **ledger** (below) or the pool's own share (`memoryBytes`) would go over. Results are sized by their bytes (`sizeOf`: JSON plus the `byteLength` of every typed array and buffer) against `maxResultBytes`; a result that would take the run past it keeps its status and loses its numbers. |
| The ledger | One per page (`ledger`): what the page holds in Workers, whoever started them. `configure({ memoryBytes, realms })` sets the aggregate caps; every pool asks `fits` before it starts a realm, so the cap holds across pools and across Workers that are not the pool's. `adoptRealm(worker, owner, bytes)` puts an existing Worker (physics, chart, 3-D, mission) on the ledger without rewriting it: its declared bytes count until it is terminated. A release wakes every waiting pool. Unconfigured, the ledger has no caps and the pool is the scheduler. |
| Transfer | A job's `transfer` buffers are posted with the message and move into the realm; the caller no longer owns them (`byteLength` 0 afterwards, tested through a real `MessageChannel`). |
| Deterministic scheduling | A job that declares `deterministic` (or a run that does, as the default) starts only when everything submitted before it has started, and nothing submitted after it overtakes it, so the start order is the submission order. A job that does not may be backfilled past one that does not fit. Results are by index either way. |
| Streams | `stream: { id, seed, labels }` reaches the realm with the job's index as the last label, which is `stream(id, seed, ...labels).fork(index)` of 149's seeding API (`js/random/streams.js`): the key and the draws match, and do not depend on which job a realm ran first. |
| Words a student may read | `noun` and `owner` name the job and the run in the two sentences a failed answer produces; the scheduler's are "trial" and "scheduler". |

Realms are disposable: one per job, terminated when it answers. A persistent
realm (one Worker, many jobs) is not part of this contract; nothing asks for
it yet.

## The caps are the data budget's

`tools/data-budget.json` holds the ceilings; the pool's caps come from them
and `tests/workerPool.test.js` ties the three together:

| Key | Ceiling | Where the pool's number comes from |
|---|---|---|
| `workerConcurrencyLowEnd` | 2 | `PROFILES['low-end'].maxConcurrency` in `js/experiments/experimentManifest.js` |
| `workerMemoryBytesLowEnd` | 256,000,000 | `PROFILES['low-end'].maxMemoryBytes` |
| desktop (not a data-budget key) | 8 realms, 1,000,000,000 | `PROFILES.desktop` |

A page configures the ledger from its profile (`ledger.configure({ memoryBytes,
realms })`) and passes its own share and per-job cap to `createPool`. The pool
holds no number of its own.

## What the Workers hold (`npm run probe:workers`)

`tools/worker-probe.mjs` drives Chromium on the two profiles of
`tools/observatory-bench.mjs` and records `tools/worker-probe-results.json`
(commit and date inside; one machine, headless; a record, not a gate).
Every Worker the run starts is attached to over the protocol and sampled while
it works (`Runtime.getHeapUsage`), so the figures are the realms' own. CPU
throttling slows the page's thread and not its Workers, so the low-end row is
the low-end's concurrency and cap, not its clock.

<!-- probe:begin -->
Recorded at `ad56dc2d` on 2026-10-21, Node 24.4.0, Chromium 156.0.8078.4, darwin x64.

| Measure | Low-end | Desktop |
|---|---|---|
| Observatory at rest, page JavaScript heap | 1.5 MB | 1.47 MB |
| Largest pack open (`tess-aperture`), page JavaScript heap | 2.26 MB | 2.24 MB |
| Workers held with it open | 0 | 0 |
| Profile run (`tess-light-curve`, 1,882 rows): realms at once | 2 of 2 | 5 of 5 |
| Realms the run started (the fit, then one per profile) | 8 | 8 |
| Fit realm, peak heap and buffers | 49.68 MB | 53.95 MB |
| Profile realm, median peak | 4.42 MB | 4.29 MB |
| **Aggregate Worker peak** | **49.68 MB** of 256 MB | **53.95 MB** of 1,000 MB |
| Page JavaScript heap at its peak during the run | 5.68 MB | 5.74 MB |
| Wall time of the run | 13.1 s | 8.0 s |

A first visit leaves 18.5 MB in Cache Storage and IndexedDB (1069 cached files, both precache tiers installed) against the 200 MiB ceiling `indexedDbAndCacheBytes`.
<!-- probe:end -->

What the numbers say. With the largest pack open the Observatory holds **no
Worker**: the page alone, about 2.3 MB of JavaScript heap. A profile run holds at
most `concurrency` realms; the fit realm is the heavy one (its period search
fills buffers it then frees: 48 to 55 MB over four runs), each profile realm
about 4 to 5 MB. The aggregate peak is the fit's, about 50 MB against the
256 MB low-end cap and about 54 MB on the desktop against 1 GB. A first visit
leaves 18.5 MB in Cache Storage and IndexedDB against the 200 MiB ceiling.

The declarations a pool client makes are these measurements with room: an
inference profile realm declares 8 MB and the fit realm 64 MB, each plus the
observation's columns and the fit's work arrays at 8 bytes a value
(`tests/fixtures/poolAdopters/run.js` `realmBytes`). Nothing here changes a
ceiling: the probe reports the storage figure beside its ceiling in
`node tools/data-budget.mjs`, and the worker figures sit well inside the caps
that already stand.

## The adoption and its cost

| | Written | Held to the shipped file by |
|---|---|---|
| `js/experiments/scheduler.js` as a client | `tests/fixtures/poolAdopters/scheduler.js` (about 85 lines of what only an experiment has: the shape of a trial that did not run, `RESUMABLE`, `isTrialResult`) | ten staged scenarios run on both, comparing every outcome, callback, message, termination and progress snapshot (the pool's two additive fields, `generation` and `heldBytes`, removed); the whole of `tests/experimentScheduler.test.js` and `tests/lab3d.test.js` (56 tests) run against it unchanged |
| `js/inference/run.js` on the pool | `tests/fixtures/poolAdopters/run.js` | a real fit and every profile of a 48-row radial-velocity set through the real `inferenceWorker.js` in this thread: every number equal by `Object.is`, the same progress, the same failures, the same cancel |

In a browser: with the two files swapped into a scratch copy of this tree,
`e2e/experimentRunner.spec.js` and `e2e/inference.spec.js` (13 tests, Chromium,
the published sources, real Workers) pass unchanged.

What it costs if the two files are swapped in (measured on a scratch copy of
this tree, the Mac with Node 24; CI's Node 22 reads a few KB smaller):

| Measure | v3 | With the pool | Ceiling |
|---|---|---|---|
| First-visit precache (`precacheFirstVisitGzipBytes`) | 5,177,547 | 5,181,113 (+3,566) | 5,177,596: **over by 3,517** |
| `/experiments/` requests, published sources | 57 | 58 | 57: **over by one** |
| `/experiments/` KB, published sources | 1062.2 | 1070.9 | within |
| `/experiments/` KB, build | 288.7 | 291.6 | within |
| Every other route, both configurations | | unchanged | within |
| Deferred and initial bundle | | unchanged | within |

The pool is 5.6 KB gzipped (3.7 KB without its comments), the scheduler gives
back 2.4 KB, the inference run adds 0.4 KB. Folding the scheduler client into
`js/experiments/status.js` (which `/experiments/` already loads) keeps the
page at 57 requests and the first visit at 5,180,664, 3,068 bytes over. A
request ceiling is exact and the first-visit ceiling is in
`tools/data-budget.json`; neither is covered by the standing size approval, so
the adoption waits for Carl. The alternative that fits without a raise, putting
the pool, the scheduler and the run in the idle tier, would let a reader who is
offline on a first visit reach `/experiments/` and the fit panel before the
install has the pool; it is not taken.

The swap, when it is decided: copy the two fixtures over their files (fix the
import specifiers), delete the `NEVER_PRECACHED` entry and the waiting half of
`tests/workerPoolAdoption.test.js`, configure the ledger from the device's
profile in `js/observatory/fitPanel.js` and `js/experimentsPage.js`, change
`tests/formatSchemas.test.js` to read the run's `end()` calls from the pool,
raise the two ceilings by the measured overrun, regenerate the manifest and
the counts.

## D-KERNEL-06 stands

The period searches (the Observatory's GLS and BLS, the RV workspace's) stay
where they are. The pool is for new heavy jobs; moving an existing search onto
it needs measured latency evidence (the same bar D-KERNEL-06 set for moving it
to a Worker at all), and nothing in this prompt supplies any. D-PERF-03's RV
schedule comparison already runs in the inference Worker, through the
scheduler, and moves with it.

## Validation

`tests/workerPool.test.js`: the ledger, a run of jobs (concurrency, ordering,
failures, timeouts, cancellation, progress, checkpoints), the memory and
concurrency caps (including a Worker the pool did not start), deterministic
scheduling, generations and stale results, transfer, per-job streams, and the
recorded probe. `tests/workerPoolAdoption.test.js`: the two adopters against
the shipped files, and the install guard.

Not verified: Node 20 (CI), Firefox and WebKit (the probe uses a Chromium
protocol; the pool is plain JavaScript), a persistent realm, a real Worker
receiving a transferred buffer in a browser (the unit test uses Node's
`MessageChannel`, which has the same structured-clone transfer semantics).
