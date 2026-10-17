# Duplicate-coverage inventory (Prompt 145)

Nothing is deleted here. Prompt 292 acts on it.

The browser suite runs 29 spec files against both the sources and `dist/`
(`BOTH_TARGETS` in `playwright.config.js`), plus `production.spec.js` against
`dist/` alone. A test in a both-targets file therefore asserts the same
published behavior twice, in two jobs. The pairs were added because the bundle
can differ from the sources in a way a reader sees: a lazy chunk, a Worker that
must be found, a page with its own bundle. The config comment beside each names
that reason. The recommendation below is judged by whether the **assertions**
(not the file) depend on that difference.

Test counts are `test(` calls per file at the time of writing; a file's tests do
not all run in both targets (module-comparing tests skip in `dist/` by their
`GRAVITAS_E2E_TARGET` condition).

| Spec | Tests | Why it runs in both (config comment) | Recommendation |
| --- | --- | --- | --- |
| selfContained | 4 | no origin but its own, in both builds | keep: the two resolve assets by different paths |
| accessibilityParity | 12 | claims in ACCESSIBILITY.md hold in both | keep the DOM-only tests; the claim is made of the published build |
| sonifyTextEquivalent | 7 | printed voices in both | keep |
| lazyInstruments | 12 | retry behavior differs (re-import vs bundle) | keep: asserts the difference itself |
| capabilityPackages | 4 | package load through the registry | keep; revisit if the sources run adds no signal |
| embedContract | 11 | a course page frames whichever is published | keep |
| figureBuilder | 6 | the page that writes the contract | keep |
| experimentRunner | 9 | the Worker is a bundle of its own | keep: starting the bundle is the assertion |
| observatory | 9 | each observation is a chunk | keep: opening every chunk is the assertion |
| inference | 4 | fit panel is a lazy chunk, Worker a bundle | keep |
| catalog | 7 | archives copied, pack opens through a lazy chunk | keep |
| catalogGovernance | 4 | listed with catalog | candidate: check whether any assertion differs between builds |
| archive | 8 | CSP must hold in the page that is served | keep |
| measure | 13 | measurement panel is a lazy chunk | keep a smoke subset in `dist/`; judge the rest per test |
| historyOriginal | 3 | page comes from ARCHIVAL_PAGES in `dist/` | keep: asserts the build path |
| analysisLab | 9 | lab is a lazy chunk of the runner's bundle | keep one load test; candidate for the rest |
| modelCompare | 1 | comparison lives in a lazy chunk | keep |
| exoplanetGuides | 5 | guides in the Observatory, lazy | candidate: guide text is the same in both |
| populationsGuides | 4 | same | candidate: same |
| systemBuilder | 12 | builder is a lazy chunk with its own dialog and styles | keep a load/save round trip; candidate for the rest |
| studio | 18 | Studio is a page with its own bundle | keep link-opens-same-world; candidate for editing detail |
| composer | 16 | composer page with own bundle, served lesson engine | keep preview; candidate for authoring detail |
| course | 19 | builder and home are bundled pages | keep link round trips; candidate for form detail |
| lab3d | 7 | Worker is a bundle of its own | keep |
| lab3dView | 9 | page with its own bundle, three.js inside | keep |
| lab3dGuides | 9 | guide panel is a lazy chunk | keep one walk; candidate for the rest |
| mission | 6 | Worker bundle | keep |
| missionLab | 9 | Worker carries the ephemeris pack | keep |
| shell | 15 | shell is inside the teaching bundle | keep a load test; candidate for per-control detail |
| production (dist only) | 11 | DOM-only, has no source twin | not a duplicate |

## How to read "candidate"

A candidate is a file whose tests mostly assert behavior that comes from the
page's logic (text, controls, saved-state shape), which the sources run already
covers, and only a few of whose tests exercise the build difference. The
saving is a `GRAVITAS_E2E_TARGET` skip on those tests in `dist/`, which the
test policy (`npm run test:policy`) would need to allow as a build-target
category, or moving the build-difference tests into a small both-targets spec.
Prompt 292 decides per test, with the dist job's duration in hand; this document
does not judge anything it has not read test by test.

## Measured basis

On run 39055774449 (the `v3` push for #344) the dist job is one of 21 jobs
and does not set the wall time: the sources shards do (see
`tools/e2e-timings.json`). Removing dist duplicates therefore saves
runner-minutes, not wall minutes. `tools/ci-cost.mjs` records both.
