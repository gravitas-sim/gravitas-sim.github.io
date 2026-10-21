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
