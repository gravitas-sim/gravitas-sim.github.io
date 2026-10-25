# Deploy-model gate

Roadmap II, Prompt 109, Part 2: should the site publish the committed tree,
as it does, or the build in `dist/`?

The thresholds were committed before this gate's measurements
(`spike/deploy/THRESHOLDS.md`, 09a1f6e on the `spike/deploy-model`
branch). Some start-up numbers already existed: the route budgets measure
both models on every change, and the figures for T1 are theirs.

**Verdict: B.** Keep publishing the tree, and precompute its artifacts in CI.
The build loads the application in well under half the bytes (T1). But it
has no offline support at all (T2, T6), and the browser suite can judge less
than a fifth of it (T4). Switching now would trade a measured start-up gain
for an unmeasured site. Part 1 of this prompt (`tools/generate.mjs`) is the
first step of the hybrid. The switch itself would be a later prompt, and
Carl's decision.

## The measurements

Measured on `v2` (c4d0984 and 7299b2d, whose built output is identical), in
Chromium, fresh context, service worker blocked.

| | Threshold | Tree | Build | Met |
|---|---|---|---|---|
| T1 | The build cuts the front door by ≥ 50% of bytes and ≥ 30% of requests, and each lesson route by ≥ 40% of bytes | front door 2103.3 KB, 101 requests; lessons 3258.9–3389.9 KB | front door **628.3 KB (−70%)**, **54 requests (−47%)**; lessons 1313.3–1376.0 KB, **−59% to −60%** each | yes |
| T2 | The build's service worker installs from its own precache, and a reader who opened it once can open it offline | 601 files, 13.9 MB precached; offline covered by `e2e/offline.spec.js` | **no `sw.js` and no `sw-manifest.js` in `dist/`**: nothing is precached, and the build does not work offline | **no** |
| T3 | The build needs no more committed generated artifacts than the tree | 25 outputs of 15 nodes (`tools/generate-graph.mjs`) | the same set: the sources are still tested and still read them. It would be fewer only once CI generates the precache list | yes |
| T4 | The suite that can judge the published build covers ≥ 90% of the source suite | about 1474 tests | **267** (the `dist` target: `production.spec.js` and the 27 specs in `BOTH_TARGETS`), **18%** | **no** |
| T5 | The build publishes the instructor bundle without the passphrase reaching any job but the one that publishes | the committed bundle is published | the committed `instructors/materials.enc.json` is copied into `dist/instructors/`; no job needs the passphrase | yes |
| T6 | A deploy changes the precache version exactly when a published file changes | the version is a digest of the precached files (`tools/build-service-worker.mjs`) | not applicable: there is no precache (T2) | **no** |

Lesson routes: kepler 3280.8 → 1328.2 KB, transit 3292.2 → 1341.5, power-law
3258.9 → 1313.3, largest lesson 3389.9 → 1376.0 (`node tools/route-budget.mjs
--report`).

## What B is, and what it is not

- **It is:** the tree stays the published artifact. The generated files are
  produced by one command in a declared order (`npm run generate`), checked
  by CI through the same graph, and protected by the merge tripwire. A later
  step can have CI regenerate them on the integration branch rather than
  asking every author to.
- **It is not:** minified or bundled sources on the live site. The published
  bytes are unchanged. That matters beyond this prompt: the route budgets
  keep measuring raw sources, so the shared shell (Prompt 50, PLATFORM_MODEL.md)
  stays blocked on its budget.

## What would make A possible

Each item is its own work, and each is measurable against these thresholds:

1. **A precache for the build** (T2, T6): `tools/build-service-worker.mjs`
   run over `dist/`, with its hashed chunks, and the offline specs run
   against it.
2. **A suite that can judge the build** (T4): most source specs read modules
   through `import('/js/…')`, which a bundle does not have. They would need
   to be rewritten against the DOM or a test hook the build keeps. That is
   hundreds of specs.
3. **Then** a staged switch: publish both for one cycle, compare, and move.

## Rejected alternatives

- **Publish `dist/` now.** It would win T1 and lose offline support for
  every reader at once. The offline promise is on the site's own pages.
- **Minify the tree in place at deploy.** It would give the route budgets
  their room, but the tests would then judge a tree that is not the one
  published, which is T4 in another form.

## Second run (Roadmap III, Prompt 158, part A)

Written on 2026-10-21 against `v3` at 0cc96a74, **before any measurement of
this run**. The first run's verdict (B, above) stands as D-DEPLOY-01 until
this run is ratified. This run compares complete workflows, because the first
compared a build that could not be judged with a suite that could not judge
it; Prompt 159 builds what a switch needs, and only if the verdict below says
to. Nothing here changes the deploy job.

### The committed criteria, unchanged

Copied from `spike/deploy/THRESHOLDS.md` (09a1f6e4 on `spike/deploy-model`),
whose measurements this document records at 8150bb9c. No number is touched.

- **T1 start-up.** The build cuts the front door's JavaScript by at least 50%
  of its bytes and 30% of its requests, and each of the four measured lesson
  routes' bytes by at least 40%.
- **T2 offline.** The build's service worker installs from its own precache,
  and a reader who has opened it once can open it offline.
- **T3 committed artifacts.** The build needs no more committed generated
  artifacts than the tree does.
- **T4 tests.** The browser suite that can judge the published build covers
  at least 90% of the tests the source suite runs.
- **T5 instructor bundle.** The build can publish the encrypted instructor
  bundle without the passphrase reaching any job but the one that publishes.
- **T6 updates.** In the build, a deploy changes the precache version exactly
  when a published file changes, as it does in the tree.

First run's outcome rule, unchanged: **A** needs T1 to T6. **B** is the verdict
when T1 passes and the build cannot yet be judged by the suite (T4) or kept
offline (T2). **C** otherwise.

### The criteria as workflow criteria

The first run's T4 counted tests, and a count can be met by quantity (267 of
1474 was 18%; a suite of ten thousand trivial tests would have passed). What
T4 meant to prove is that a regression in the build would be seen. It is
restated as the workflows the product stands on, with its number unchanged.

- **The workflows.** The ten student workflows S1 to S10 and the instructor
  path I1 of `tools/conformance/product.json` (the specs each names are its
  list). That is 11 workflows; 90% of 11 is 9.9, so **T4 is met when at least
  10 of the 11 are judged on the build**. A workflow is judged on the build
  when every spec in its list runs against `dist/` and passes there, not in
  part: the part left to sources is exactly where a build-only regression
  would hide. A spec that fails against `dist/` because it imports `/js/...`
  modules counts as not judged; no spec is edited, skipped or loosened for
  this run. The test-count ratio of the first run is reported beside it for
  continuity and judges nothing.
- **T1 is judged as the first run judged it**: JavaScript bytes and requests
  on the front door and the four lesson routes (kepler, transit, power-law,
  largest-lesson), `tools/route-budget.mjs` on both configurations, cold
  cache, service worker blocked. The same tool also reports the other routes
  and the Observatory; those route numbers decide nothing except the B slice
  named below.
- **Time to usable is reported, never judged.** Front door, the kepler lesson
  and the Observatory with one observation open, on both configurations, on
  the throttled profile: Chromium, `Emulation.setCPUThrottlingRate` 4, and
  `Network.emulateNetworkConditions` at 150 ms round trip, 1.6 Mbit/s down,
  0.75 Mbit/s up (the published Lighthouse mobile preset, chosen here and not
  tuned). Three runs per cell, sources and build interleaved, median. Every
  timing is printed with `uptime` before and after, and nothing is measured
  while the one-minute load is above 24. A median that differs between the
  configurations by less than the spread of its own three runs is reported as
  "not distinguishable".
- **T2 and T6 are judged on the build as `node build.js` produces it**: it has
  a service worker and a precache, or it does not. The spike additionally
  generates a precache over a copy of `dist/` and runs the offline and
  update behaviour against it, so the verdict can say whether the missing
  piece is a bounded task. That evidence decides between A and B below; it
  never turns the shipped build's T2 or T6 into a pass.
- **T3 and T5** are counted as the first run counted them
  (`tools/generate-graph.mjs` outputs for the build and the tree; the
  published `dist/instructors/materials.enc.json` and the jobs that read the
  passphrase). The passphrase is never read in this run.
- **Marginal costs, reported.** One new lazy family and one new pack under
  each model: requests, bytes as served and committed files touched, taken
  from the families and packs the tree has (`route-budget.mjs --lessons` per
  family on both configurations; the smallest, the median and the largest
  pack the Observatory opens). The precache a build would need is the byte
  total and file count the spike's generated manifest reports, next to the
  tree's (`tools/data-budget.json`'s first-visit tier).

### Outcomes, fixed before measurement

- **A (159 runs, all of it).** T1, T3 and T5 are met on the shipped build; the
  spike's precache over `dist/` installs and serves the offline workflow with
  the spike's offline spec, and its version changes exactly when a published
  file changes (T2 and T6 shown to be a bounded task); and at least 10 of the
  11 workflows are judged on the build when the specs the workflows name are
  run against `dist/` by the spike's configuration unchanged (T4 shown to be
  a bounded task). A is the decision to invest in the production
  prerequisites, not a switch.
- **B (159 runs for the named slice only).** T1 met on the front door and the
  four lesson routes, and A's other conditions fail. The predefined slices,
  either or both:
  - **B-routes, the build for named routes.** A route is named when, on the
    build, it meets T1's bar for its kind (a lesson or document route: bytes
    cut by at least 40%; the front door and sandbox: 50% of bytes and 30% of
    requests), every spec of the workflows that open it passes against
    `dist/` unchanged, and the spike's precache serves it offline.
  - **B-hybrid, a bundled engine artifact in the tree.** The spike bundles
    `js/engine/` and what it imports into one file loaded by the sources
    routes that load the engine. It qualifies when, over those routes, the
    engine's own requests fall by at least 30% and its bytes by at least 40%
    (T1's bars applied to the part replaced), the tests that judge the tree
    still pass unchanged against the tree that loads it, and its artifact is
    produced by a generator node the existing `generate.mjs --check` graph
    holds, so a conflict in it is resolved by regeneration, never by hand.
    Its merge-conflict cost is reported (the share of the merged pull
    requests since `v3` was cut that touch the bundle's inputs, and how many
    of those were open at the same time), and judges nothing beyond that
    binary.
- **C (the tree stays; 159 does not run; 133's policy is the relief).** T1 not
  met on the front door or on any of the four lesson routes, or A and B both
  not reached. The consumers Appendix C of the roadmap names for a 158 C are
  removed and nothing else.

An unmeasurable threshold fails the gate on that threshold and Carl resets it;
no threshold above is changed after this section's commit.

### The second run's measurements

Measured on 2026-10-21 on `v3` at 0cc96a74 (Mac, Node 24.4, Chromium from
the repository's Playwright). The harness and every raw result are on the
spike branch `spike/deploy-model-ii` (never merged; its last commit is
0189cd15, `spike/deploy-ii/`). The criteria above were committed in b8f644a2,
before any of this was measured. The load average (one minute) is stated
where timing is involved. Bytes and requests do not depend on load.

**T1, the shipped build against the tree** (`node tools/route-budget.mjs
--report`, JavaScript as served, cold cache, service worker blocked; load
3.3 before, 3.0 after). **Met.**

| Route | Tree | Build | Cut (bytes, requests) | Bar |
|---|---|---|---|---|
| front door | 2116.8 KB, 107 | 596.1 KB, 54 | **71.8%**, **49.5%** | 50% and 30% |
| kepler | 3311.2 KB, 146 | 1254.6 KB, 71 | **62.1%** | 40% |
| transit | 3323.2 KB, 146 | 1266.1 KB, 71 | **61.9%** | 40% |
| power-law | 3288.5 KB, 146 | 1239.2 KB, 71 | **62.3%** | 40% |
| largest lesson | 3420.7 KB, 148 | 1300.1 KB, 73 | **62.0%** | 40% |

Reported beside them: experiments 1062.2 KB in 57 requests against 288.7 KB
in 4; the Observatory page 186.7 KB in 17 against 88.0 KB in 5.

**Time to usable, throttled profile** (reported, judges nothing; three runs
per cell, sources and build interleaved, median with the range; one-minute
load 2.6 to 4.8 across the runs, `uptime` before the run 3.07, after 4.54).

| Workflow | Tree | Build | Difference |
|---|---|---|---|
| front door (splash ended) | 19,760 ms (19,732 to 19,789) | 10,457 ms (10,447 to 10,502) | 47% less |
| kepler lesson (first step shown) | 23,028 ms (22,926 to 23,034) | 10,430 ms (10,405 to 10,433) | 55% less |
| Observatory, TESS light curve open | 4,653 ms (4,645 to 4,658) | 4,028 ms (4,020 to 4,115) | 13% less |

Every difference is far outside the spread of its own three runs. This
harness counts every JavaScript response while the network settles, so its
request figures run a little above route-budget's (kepler build 73 and
1257.8 KB against 71 and 1254.6); it is not the T1 instrument. A proxy for a
slow device, not a device.

**T2 and T6, the shipped build.** Not met. `dist/` has no `sw.js` and no
`sw-manifest.js`; its bundled registration (`register("./sw.js")`) asks for a
file that is not there. **The spike's precache** (`dist-precache.mjs`, a
manifest over a copy of `dist/` plus the tree's `sw.js`): 1,642 files and
33,695,355 bytes (1,533 core, 109 optional), untiered, because hashed chunks
cannot be assigned to the tree's first-visit and idle tiers without a map
from chunk to source that the build does not write (the tree's manifest is
1,069 files and 17,588 KB in all tiers, 5,177,596 B first-visit). It
installed (all 1,642 cached), a front door reload and a lesson opened in a
new tab and the Observatory opened with the network off, with no failed
request and no page error. The first attempt missed `js/fragments/*.html`
(the lesson panel's markup, 504 offline): a build's precache policy has to be
written for the build, not carried over. The version tracked the content:
unchanged files gave the same version, one changed precached file a new one,
restoring it the first again, and an unprecached file left it alone.

**T3.** Met: the generate graph holds 21 nodes and 36 outputs for the tree;
the build adds none (`dist/` is untracked, the spike's manifest is generated).

**T5.** Met: `dist/instructors/materials.enc.json` is byte-identical to the
committed file, `build.js` only copies it, and no workflow file references a
secret. The passphrase was not used.

**T4, workflows judged on the build.** Not met, by a long way.

- As shipped, the `dist` target runs 334 tests in 30 files (14.5% of the
  2,310 the source suite runs in Chromium; 18% in the first run). Of the 28
  specs the eleven workflows name, 4 are in the dist target
  (`accessibilityParity`, `measure`, `observatory`, `experimentRunner`; none
  of them completes a workflow by itself): **0 of 11 workflows have every
  spec in it.**
- Run against `dist/` unchanged (the spike's configuration, 28 specs, 319
  tests, two workers, load 3.7 to 7.5): **149 passed, 164 failed, 6
  skipped.** 10 of the 28 specs pass completely (`accessibilityParity`,
  `adoption`, `experimentRunner`, `instructorFlow`, `instructorPortal`,
  `measure`, `observatory`, `presetRecovery`, `progressSafety`,
  `submissionReview`). 161 of the 164 failures are
  `Failed to fetch dynamically imported module` of `/js/...` (the specs read
  modules a bundle does not have); 3 are assertions that differ in the build
  (`firstRun` keyboard close, `investigations` fetch-once, `stellarSpectra`
  fetch-once). **0 of 11 workflows pass in every spec**: S1 to S10 each have
  at least one spec that fails, and I1 fails on `assignment` (17 of 20).

| Workflow | Specs passing against `dist/` unchanged |
|---|---|
| S1 front door, open an investigation | onboarding 4 of 8, firstRun 6 of 7, investigations 9 of 23 |
| S2 sandbox | sandbox 2 of 15, bodyPlacement 0 of 26, accessibilityParity 9 of 9 (4 skipped) |
| S3 work an investigation | investigations, answerEntry 9 of 15, predictionLoops 0 of 19 |
| S4 measure and read a plot | measure 13 of 13, plotChart 0 of 10, chartParity 1 of 8 |
| S5 Observatory | observatory 8 of 8 (1 skipped), stellarSpectra 2 of 3 |
| S6 Sky Lab | sky 6 of 7, observing 0 of 10 |
| S7 experiment | experimentRunner 8 of 8 (1 skipped), experiments 0 of 8 |
| S8 report | investigations, htmlReport 0 of 3 |
| S9 save and resume | myWork 2 of 11, progressSafety 17 of 17, presetRecovery 3 of 3 |
| S10 share | sharing 0 of 5, shareObserving 0 of 10 |
| I1 instructor path | adoption 10, instructorFlow 8, assignment 3 of 20, submissionReview 9, instructorPortal 20 |

**Marginal costs** (reported). One new lazy instrument family, the 15
families a lesson step first reaches (`route-budget.mjs --lessons`): tree
median 69.2 KB and 3 requests (35.8 to 129.1 KB, 1 to 5), build 25.9 KB and
4 requests (13.8 to 67.1 KB, 3 to 7): fewer bytes, more requests. One new
pack, the 13 observations the Observatory opens (`packs.mjs`): 1 to 3
requests each under both models, the build 3.7 to 5.8 KB smaller each (the
pack decoder), and one request more for the two TESS observations. Committed
files a new family or pack touches: the same set under both (module or pack,
route ceilings, counts); the tree also regenerates the committed
`sw-manifest.js`, which a build would generate in CI.

**The hybrid** (`hybrid.mjs`: `js/engine/*.js`, 9 files and 264,106 bytes,
bundled into `js/engine/bundle.js` with everything outside the folder left
external; `js/physics.js` pointed at it; `physicsWorker.js` still loads
`barnesHut.js` itself).

- Size: 147,328 bytes plain (34.2 KB gzipped), 62,689 bytes minified (20.6
  KB). On every sources route that loads the engine the minified bundle
  removes 190.3 KB and 7 requests (front door 2116.8 KB and 107 to 1926.5 KB
  and 100; lessons 3311.2 and 146 to 3120.9 and 139; figure, experiments and
  Studio likewise). The engine's own requests fall from 9 to 2 (78%) and its
  bytes by 74% minified; computed from file sizes, 42% plain. **H1 is met**,
  by either form.
- Generator: one 7-line node in `tools/generate-graph.mjs` produced the file
  and its `--check` held, in the spike. **Met.**
- Tests unchanged: **not met.** The full Jest run with the minified bundle
  applied (408 suites) had 7 failed suites and 32 failed tests; the same 7
  suites pass on the base (449 tests). Five of them (`engineState`,
  `engineEvents`, `engineConservation`, `settingsWriters`,
  `physicsValidation`) fail because the engine now exists twice: the tests
  and the validation groups import `js/engine/*.js` directly and get a second
  instance of the engine's state, which is also a defect for the validation
  page. Two are mechanical (`buildIntegrity`: `sw-manifest.js` stale;
  `platformBaseline`: the feature-detection inventory has no row for the new
  file).
- Merge-conflict cost, reported: of the 61 pull requests merged into `v3`
  since it was cut (092a121d), 9 touched `js/engine/` (14.8%), and 4 pairs of
  them were open at the same time. The committed `sw-manifest.js`, which the
  tree already regenerates after conflicts, was touched by 43 (70.5%), in 72
  overlapping pairs.

### Verdict: C

| Condition | Result |
|---|---|
| T1 front door and four lessons | met |
| T3, T5 | met |
| T2, T6 on the shipped build | not met; shown to be a bounded task on the spike |
| T4, at least 10 of 11 workflows judged on the build | **0 of 11**, unchanged specs on `dist/`; not a bounded task (161 module-access failures in 28 specs) |
| **A** | not reached (T4) |
| B-routes | no route named: every route's workflows have a failing spec (the nearest, the Observatory, fails one `stellarSpectra` assertion; the instructor path fails `assignment`) |
| B-hybrid | H1 and the generator met; the tests that judge the tree do not pass unchanged (7 suites, 32 tests) |
| **Outcome** | **C: the tree stays; Prompt 159 does not run; the relief for the request and byte ceilings is Prompt 133's policy** |

What this does not say. The build is still much the smaller download (T1) and
the offline obstacle is bounded; the gate fails on the suite that would judge
it (T4), which is the first run's finding unchanged. One variant was not
tested because it is outside the slices fixed above and a gate may not widen
its scope: a bundle whose `js/engine/*.js` paths remain, as re-exports of the
bundle, so that tests and importers share one instance. It would need its own
gate. The verdict is evidence until Carl ratifies it; D-DEPLOY-01 (B, the tree
with its artifacts precomputed in CI) stands as written.

Not verified: Node 20 (the build's byte counts may differ by a few bytes);
Firefox and WebKit; mobile; a real device (the throttled profile is a proxy);
transfer (gzip) sizes; the full dist suite beyond the 28 specs named; the
plain hybrid bundle through route-budget (its size was taken from the file);
tests of the hybrid with the validation groups and tests repointed (not an
option the slices allow).
