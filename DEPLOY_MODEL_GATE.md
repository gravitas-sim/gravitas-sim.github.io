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
