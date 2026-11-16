# Budget policy II: ceilings follow savings, and a proposed allocation of the headroom

**Status.** Part 1 (the lowered ceilings) is a change to the tree. Part 2 (the
allocation, the appearance allocation and the rendering budget) is a
**proposal awaiting the maintainer**. Until it is adopted in writing, the policy
in force is the one in `tools/budget-policy.json` (mode `"exact"`), the route
note's rule (a ceiling is the value measured plus 0.5% of its bytes and one
request), and the standing size-budget approval of 2026-10-10. Nothing here
switches the mode, raises a ceiling or treats the proposal as adopted. The
register rows are D-R4-317-01 (Part 1) and D-R4-317-02 (Part 2).

Tooling read, not changed: `tools/bundle-budget.mjs`, `tools/route-budget.mjs`,
`tools/data-budget.mjs`, `tools/budget-policy.mjs`, `tools/perf-probe.mjs`,
`tools/perf-thresholds.json`. Earlier figures of the same policy, now stale,
are in [`BUDGET_POLICY.md`](BUDGET_POLICY.md).

## How it was measured

- Tree: `v4` at `fad3eee99` (the merge of the early module links), with the
  language, lesson-route, first-use and request-waterfall changes of the
  start-up work all merged. Baseline: `v4` at `7d8cfea05`, the commit before
  the language change merged, built and measured the same way on the same
  machine.
- Toolchain: Node 22.23.4 on macOS (`node build.js`, `node
  tools/route-budget.mjs`, `node tools/bundle-budget.mjs --check`, `node
  tools/data-budget.mjs --check`). CI pins Node 22 (`NODE_VERSION: '22'` in
  `.github/workflows/ci.yml`, with `.nvmrc` and `engines` agreeing); the figure
  a ceiling is judged on is the pinned one. `tools/budget-environment.json`
  still records no zlib, so the comparison uses the Node major alone. A figure
  from Node 24 reads a few KB larger on the deferred total and is advisory.
- Route figures are the JavaScript bytes read to the usable condition (the
  decoded body of each `.js` response, from a server that does not compress, so
  no zlib is involved; HTML and CSS are free to the route budgets), in a fresh
  browser context with the service worker blocked, in KB to 0.1 (`kb`) and
  requests; they are the same on every run.

## Part 1: the ceilings lowered

The rule in force: measured plus 0.5% (rounded up to 0.1 KB) and one request.
A ceiling that is above that is lowered to it; none is raised. A request
ceiling already at its measurement plus one stays. `tools/budget-policy.json`
holds a mirror of the six workflow routes, which a test keeps equal to the
route file, so those six values moved with it.

| Route | Configuration | What moved (old to new, then the measurement) |
|---|---|---|
| front-door | sources | KB 1926.9 to 1926.6 (measured 1917) |
| sandbox | sources | KB 1926.9 to 1926.6 (measured 1917) |
| kepler | sources | KB 2648 to 2647.6 (measured 2634.4) |
| transit | sources | KB 2659.9 to 2659.5 (measured 2646.2); instrument step KB 2740.4 to 2740 (measured 2726.3) |
| power-law | sources | KB 2625.2 to 2624.8 (measured 2611.7); instrument step KB 2678.7 to 2678.3 (measured 2664.9) |
| largest-lesson | sources | KB 2956.1 to 2955.8 (measured 2941) |
| evaluation | sources | KB 34 to 33.9 (measured 33.7) |
| figure | sources | KB 2203.7 to 2203 (measured 2192) |
| experiments | sources | KB 1109 to 1090.5 (measured 1085) |
| adoption | sources | KB 10.5 to 10.3 (measured 10.2) |
| teach-find | sources | KB 13.2 to 13.1 (measured 13) |
| studio | sources | KB 975.6 to 950.7 (measured 945.9) |
| mission | sources | KB 74.6 to 69.4 (measured 69) |
| mission-lab | sources | KB 431.6 to 425.5 (measured 423.3) |
| teaching | build | KB 140.2 to 110.8 (measured 110.2) |
| evaluation | build | KB 11.7 to 6.4 (measured 6.3) |
| experiments | build | KB 325.2 to 295.9 (measured 294.4) |
| catalog | build | KB 36.4 to 33 (measured 32.8) |
| teach-find | build | KB 3 to 2.9 (measured 2.8) |
| studio | build | KB 226.2 to 220.5 (measured 219.4); requests 4 to 3 (measured 2) |
| lab3d | build | KB 37 to 31.4 (measured 31.2) |
| lab3d-lab | build | KB 595.3 to 588.9 (measured 585.9) |
| mission | build | KB 49.4 to 35.6 (measured 35.4) |
| mission-lab | build | KB 256.4 to 227.9 (measured 226.7) |

What was measured and **not** lowered, because the margin in force is already
above the ceiling (the deferred and tier ceilings were set by exact
overruns, the initial ceiling by the earlier measurement):

| Ceiling | Measured | Ceiling | Measured plus margin |
|---|---|---|---|
| Initial download | 731.7 KB (749,289 B) | 735.0 KB | 735.4 KB |
| Deferred JavaScript, gzipped | 3,232,537 B (3156.77 KB) | 3156.8 KB (3,232,563 B) | 3,248,700 B |
| First-visit precache tier, gzip | 5,422,931 B | 5,423,572 B | 5,450,046 B |
| Idle precache tier, gzip | 1,696,989 B | 1,697,439 B | 1,705,474 B |
| Observation packs, raw / gzip | 355,180 B / 111,362 B | 355,282 B / 111,422 B | 356,956 B / 111,919 B |

The deferred ceiling has 26 B of room on this Mac build. No tier ceiling was
lowered, so none was re-checked in declared mode as a lowered ceiling (the
mechanism is shown under "What the checks showed").

## Part 2 (proposal): what the start-up work saved, and who may spend it

### The savings, measured

Baseline `7d8cfea05` to tip `fad3eee99`, Node 22.23.4, KB (routes: JavaScript
bytes to usable as above; the initial download: CSS plus eager JavaScript as
the bundle budget counts it):

| Budget | Baseline | Tip | Saved |
|---|---|---|---|
| Initial download (eager JavaScript and CSS) | 810.1 | 731.7 | 78.4 |
| Front door and sandbox, sources | 2136.2 | 1917.0 | 219.2 |
| Front door and sandbox, build | 605.8 | 527.2 | 78.6 |
| Kepler lesson, sources | 3427.6 | 2634.4 | 793.2 |
| Kepler lesson, build | 1342.2 | 891.7 | 450.5 |
| Transit lesson, sources | 3439.5 | 2646.2 | 793.3 |
| Transit lesson, build | 1353.7 | 903.0 | 450.7 |
| Power-law lesson, sources | 3404.9 | 2611.7 | 793.2 |
| Power-law lesson, build | 1326.8 | 876.3 | 450.5 |
| Largest lesson, sources | 3537.1 | 2941.0 | 596.1 |
| Largest lesson, build | 1387.7 | 1020.2 | 367.5 |
| Figure builder, sources | 2412.6 | 2192.0 | 220.6 |
| Figure builder, build | 740.0 | 661.4 | 78.6 |

Requests to usable (sources unless marked):

| Route | Baseline | Tip | Saved |
|---|---|---|---|
| Front door and sandbox, sources | 109 | 104 | 5 |
| Kepler, transit and power-law lessons, sources | 149 | 135 | 14 |
| Largest lesson, sources | 151 | 144 | 7 |
| Figure builder, sources | 129 | 124 | 5 |
| Front door and sandbox, build | 57 | 55 | 2 |
| Kepler, transit and power-law lessons, build | 75 | 72 | 3 |
| Figure builder, build | 59 | 57 | 2 |
| Largest lesson, build | 77 | 79 | -2 |

Budgets that did **not** save anything, stated so that no one allocates what is
not there:

| Budget | Baseline | Tip | Change |
|---|---|---|---|
| Deferred JavaScript, gzipped | 3,200,268 B | 3,232,537 B | +32,269 B |
| First-visit precache tier | 5,416,526 B | 5,422,931 B | +6,405 B |
| Idle precache tier | 1,696,903 B | 1,696,989 B | +86 B |

The deferred and tier totals grew because code that was in the start-up chunks
is now in lazy chunks (which count as deferred) and because each lazy chunk's
gzip boundary costs bytes; the student's route got lighter and these totals got
heavier. Both ceilings were raised by exactly the overrun under the standing
approval (D-R4-311-03). **Allocatable saving in the deferred total, the
first-visit tier and the idle tier is therefore 0 B**, and so is the
allocation. A later saving (a deferred catalogue trimmed, a start-up group
removed) enters the reserve through the ledger below, with its own measurement.

Memory has no measured saving to allocate: the heap thresholds in
`tools/perf-thresholds.json` (measured used heap times 1.5, rounded up to 1 MB)
and the enforced budgets in its `deviceProfiles` block (times 2) already carry
their own margin by form. NOT MEASURED here: any change in heap from the
start-up work.

### The proposed shares

Of each saving above, rounded down to 0.1 KB per cell, so a row sums to no more
than its saving (the rounding remainder is left unallocated):

| Share | Of each saving | Rule |
|---|---|---|
| Banked | 50% | Never allocated. The weight a student no longer downloads stays saved. |
| Appearance | 10% | Drawn only by a change that states its reason, its measured cost and where the room came from (below). |
| T1, rest of the tranche | 12% | The remaining T1 work that adds to a route: lesson interactions, the visual direction, the sandbox pilots, the page pilots. |
| T2 | 8% | |
| T3 | 6% | |
| T4 | 4% | |
| T5 | 4% | |
| T6 | 3% | |
| Reserve | 3% | Released only by the maintainer, in a named row. |

| Budget | Saved (KB) | Banked | Appearance | T1 rest | T2 | T3 | T4 | T5 | T6 | Reserve |
|---|---|---|---|---|---|---|---|---|---|---|
| Initial download (eager JavaScript and CSS) | 78.4 | 39.2 | 7.8 | 9.4 | 6.2 | 4.7 | 3.1 | 3.1 | 2.3 | 2.3 |
| Front door and sandbox, sources | 219.2 | 109.6 | 21.9 | 26.3 | 17.5 | 13.1 | 8.7 | 8.7 | 6.5 | 6.5 |
| Front door and sandbox, build | 78.6 | 39.3 | 7.8 | 9.4 | 6.2 | 4.7 | 3.1 | 3.1 | 2.3 | 2.3 |
| Kepler lesson, sources | 793.2 | 396.6 | 79.3 | 95.1 | 63.4 | 47.5 | 31.7 | 31.7 | 23.7 | 23.7 |
| Kepler lesson, build | 450.5 | 225.2 | 45.0 | 54.0 | 36.0 | 27.0 | 18.0 | 18.0 | 13.5 | 13.5 |
| Transit lesson, sources | 793.3 | 396.6 | 79.3 | 95.1 | 63.4 | 47.5 | 31.7 | 31.7 | 23.7 | 23.7 |
| Transit lesson, build | 450.7 | 225.3 | 45.0 | 54.0 | 36.0 | 27.0 | 18.0 | 18.0 | 13.5 | 13.5 |
| Power-law lesson, sources | 793.2 | 396.6 | 79.3 | 95.1 | 63.4 | 47.5 | 31.7 | 31.7 | 23.7 | 23.7 |
| Power-law lesson, build | 450.5 | 225.2 | 45.0 | 54.0 | 36.0 | 27.0 | 18.0 | 18.0 | 13.5 | 13.5 |
| Largest lesson, sources | 596.1 | 298.0 | 59.6 | 71.5 | 47.6 | 35.7 | 23.8 | 23.8 | 17.8 | 17.8 |
| Largest lesson, build | 367.5 | 183.7 | 36.7 | 44.1 | 29.4 | 22.0 | 14.7 | 14.7 | 11.0 | 11.0 |
| Figure builder, sources | 220.6 | 110.3 | 22.0 | 26.4 | 17.6 | 13.2 | 8.8 | 8.8 | 6.6 | 6.6 |
| Figure builder, build | 78.6 | 39.3 | 7.8 | 9.4 | 6.2 | 4.7 | 3.1 | 3.1 | 2.3 | 2.3 |

Requests are whole numbers, so they use the same shares rounded down; a route
that saved fewer than ten requests gets no request in most columns, and a
request is then spent only by a named row. Largest lesson, build, gained two
requests and has nothing to allocate.

| Route (requests) | Saved | Banked | Appearance | T1 rest | T2 | T3 | T4 | T5 | T6 | Reserve |
|---|---|---|---|---|---|---|---|---|---|---|
| Front door and sandbox, sources | 5 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kepler, transit and power-law lessons, sources | 14 | 7 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| Largest lesson, sources | 7 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Figure builder, sources | 5 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Front door and sandbox, build | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Kepler, transit and power-law lessons, build | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Figure builder, build | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

An allocation is not a ceiling. Every ceiling stays at the measurement plus the
margin in force; the allocation says how much a prompt may ask to raise one by,
in a named row, and from which share.

### The ledger a prompt writes when it spends (proposed, not created)

One row per spend in `tools/headroom-ledger.json` (created when the proposal is
adopted, with its check in `tools/budget-policy.mjs`, written by the prompt's
own PR and never by the re-baseline command): the prompt and tranche; the
budget and route; the kilobytes and requests; the share drawn (banked is never
drawn); the reason (`perception`, `orientation`, `appearance` or `feature`);
where the room came from (a saving in the same PR is named first); the
measurement before and after on the pinned toolchain; and the register row. A
check fails when a tranche's drawn total passes its share, and the ledger's
saving rows (a prompt that lowers a ceiling adds its saving here) are what the
shares are taken of.

### A raise beyond its allocation

It is a named register row for the maintainer, with the measurement and the
tradeoff stated (what the student gains, what it costs on which route, what
was tried first), and it is **not** a use of the standing approval of
2026-10-10. If the proposal is adopted, that approval no longer covers a raise
of a ceiling a share governs; it continues to cover nothing the shares do not
reach. No ceiling is raised silently, and none is raised to make a change fit.

### (a) The appearance allocation

A share of each budget (10% of the saving, bytes on the named routes above) is
set aside for appearance work. A change draws on it only when its register row
states:

1. its reason, one of perception (a student can read or see something they
   could not), orientation (a student knows where they are or what to do) or
   appearance (the product looks better, a reason that stands without a
   learning score);
2. its measured cost: bytes and requests on each route it touches under the
   pinned toolchain, frame time on the reference scenes (below), and heap on
   the same scenes;
3. where the room came from: recovered waste first (a duplicate, an unused
   rule, a font or image that need not load), the allocation second.

A change that needs more than the allocation goes to the maintainer as a
concrete tradeoff with matched before-and-after captures. CSS belongs to the
initial download, so the appearance share of that budget is the one a visual
change meets first.

### (b) The rendering budget

Frame time on the reference scenes, in the form `tools/perf-thresholds.json`
already uses and with the conditions of `npm run perf`:

- **Scenes.** The scene records in `tests/fixtures/scene-records` that the
  sandbox reference cases fixed (`solar-system`, `circumbinary-planet-lab`,
  `galilean-resonance` at its two zooms, `star-cluster`, `black-hole-lab`), at
  the 1366 width, and the same at 375 for the phone layout.
- **Profiles.** `sandbox-scenes-full` (`npm run perf -- --scene <record> ...
  --tier full --seconds 5`) and `sandbox-scenes-low-cpu4` (the same with
  `--tier low --cpu 4`), as the file records them.
- **Statistic.** The median of three runs of five seconds each, with the
  machine and its load stated; the quietest run is stored beside it.
- **Threshold.** The measured value times 1.5, rounded up to 0.5 ms; heap, the
  measured used heap after a forced collection times 1.5, rounded up to 1 MB.
- **The numbers** are the ones the reference-scene measurement recorded in
  `tools/perf-thresholds.json` under those two profiles. They are read from
  there when the budget is adopted and are **not** restated or invented here.
  A reader should know that those medians were taken beside another job and
  vary by up to a factor of two between runs on the same scene (the recorded
  runs for `solar-system` are 2.30, 2.32 and 4.67 ms), so adopting them as a
  gate needs a statement of which statistic the gate judges and a quiet
  machine; until then they stay advisory, as the file says.
- **Use.** A change that moves frame time on a reference scene beyond its
  threshold is a tradeoff for the maintainer with captures, not a failure to be
  quietly loosened; the budget is never moved to pass.

### The rule that appearance work must cost nothing is withdrawn

Earlier planning held that an appearance change is kept only if it costs
nothing, and that a new rendering technology or a wholesale redesign of an
existing surface is out of scope. **This proposal withdraws both.** A visual
change is not refused because it is not free or because its value is not a
learning score; it states its reason, its measured cost and where the room came
from, and draws on the appearance allocation and the rendering budget above.
A renderer change still needs the evidence of its own gate. (Maintainer
direction, 2026-11-12.)

### What switching `tools/budget-policy.json` to "declared" would change

As the file documents it: in `"declared"` mode no slice raises any ceiling (it
finds a saving or stops), the deferred ceiling is the workflow core plus the
allowance granted, growth is recorded in `tools/growth-ledger.json`, and only
the maintainer changes the mode line, in the same pull request that makes
`tools/bundle-budget.mjs` read its deferred limit from the policy. The standing
approval of 2026-10-10 would stop being the mechanism for the deferred
ceiling.

**Finding, for the decision.** The file's numbers have not followed the tree.
`deferredCoreKb` is 1985.8 and the per-release cap on a grant is 20.0 KB, so
the effective deferred ceiling on adoption would be 1985.8 KB with nothing
granted, against 3156.8 KB in the tree and 3156.77 KB measured: 1171.0 KB
below what the product weighs, which no single release's grant can close. The
file's own note says adopting "raises nothing" because the cumulative cap
(1171.0 KB) plus the core equals today's ceiling, but a grant is capped per
release, not cumulatively. Adopting the mode would first need the maintainer to
reset `deferredCoreKb` (a workflow ceiling, never moved by anything else) to a
measured core. This change does not do that.

### What the maintainer decides

1. Adopt the shares as written, adopt them with other percentages, or not
   adopt (then the policy in force stands and every raise is by the standing
   approval, as before).
2. Whether the appearance allocation and the rendering budget are adopted as
   forms now, with the numbers read from the reference-scene profiles when a
   quiet-machine measurement exists.
3. Whether to switch the mode, and if so what to set the core to.

### What the checks showed

Recorded in D-R4-317-01: each lowered route ceiling passes on the tip and fails
in a scratch copy of the tree where a module is added to the route (a 40 KB
module, which is over the 0.5% margin of every lowered route, and a second
module for the request ceilings); the tier ceilings, none lowered, were put
through a scratch copy whose policy mode was set to declared to show the
mechanism. A single extra request on its own does not fail a request ceiling
that sits at its measurement plus one request: the margin is one request by
definition.

### Not measured

A real device, any browser but headless Chromium, Node 24 figures on the pinned
ceilings, the memory effect of the start-up work, and a frame time at any
budget (the recorded reference-scene profiles are read, not re-run).
