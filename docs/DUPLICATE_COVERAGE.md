# Duplicate-coverage inventory (Prompt 145)

Nothing was deleted by Prompt 145, which wrote this. Prompt 292 acted on it: the
decisions are in the last section. No test is the only test of its fact after
them (each dropped dist copy has its sources twin, which still runs).

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

## Decisions (Prompt 292, D-R10-292-02)

One row per spec of the table above. A dropped dist copy is a `test.skip(DIST, ...)` of the build-target category that `npm run test:policy` allows; the sources run still executes the test, so the fact keeps one test. 15 tests are dropped in dist (about 160 s of sources time; measured in dist, the four specs run in 68 s at two workers with 18 skipped, 28 passed).

| Spec | Decision | Which tests, and why |
| --- | --- | --- |
| selfContained | KEPT BOTH | Each target resolves assets by its own paths. |
| accessibilityParity | KEPT BOTH | The claims in ACCESSIBILITY.md are made of the published build. |
| sonifyTextEquivalent | KEPT BOTH |  |
| lazyInstruments | KEPT BOTH | It asserts the difference between the builds itself. |
| capabilityPackages | KEPT BOTH | Revisit once the sources run adds no signal. |
| embedContract | KEPT BOTH |  |
| figureBuilder | KEPT BOTH |  |
| experimentRunner | KEPT BOTH | Starting the Worker bundle is the assertion; it also stands behind the analysis lab walks dropped in dist. |
| observatory | KEPT BOTH | Opening every chunk is the assertion. |
| inference | KEPT BOTH |  |
| catalog | KEPT BOTH |  |
| catalogGovernance | KEPT BOTH | Read: 4 tests, 11 s, the install runs through the lazy chunk in both; no saving worth a skip. |
| archive | KEPT BOTH | The CSP must hold in the page that is served. |
| measure | DIST COPY DROPPED, 2 tests | An undo behind a result makes it stale; the measurements have their own undo and redo. History logic, not a chunk; the sources twins assert both. The load, transit search, notebook, save and axe tests stay in dist. |
| historyOriginal | KEPT BOTH | It asserts the build path. |
| analysisLab | DIST COPY DROPPED, 6 tests | Seeds change nothing; plot and table are one selection; a second run is the numerical uncertainty; a grid; a random sample; a cancel. Analysis logic over the runner, whose Worker bundle experimentRunner starts in dist. The load test, the save and read-back round trip and axe stay in dist. |
| modelCompare | KEPT BOTH |  |
| exoplanetGuides | KEPT BOTH | Read: 5 tests, 12 s, each opens a chunk in the page; no saving worth a skip. |
| populationsGuides | KEPT BOTH | Read: 4 tests, 17 s; same. |
| systemBuilder | DIST COPY DROPPED, 4 tests | A bad value is explained; a black hole among stars is refused; a newer version is refused; in Spanish. Validation and text. The open and build, the file round trip, the share link, axe and the phone tests stay in dist. |
| studio | KEPT BOTH | Read: 19 tests, 57 s, most 1 to 3 s; the link round trips are the build difference and the rest costs too little to be worth a skip. |
| composer | KEPT BOTH | Same reading as studio (16 tests, 39 s). |
| course | KEPT BOTH | Same reading (19 tests, 48 s, 21 s of it the offline walk that already skips in dist). |
| lab3d | KEPT BOTH | The Worker is a bundle of its own. |
| lab3dView | KEPT BOTH |  |
| lab3dGuides | DIST COPY DROPPED, 3 tests | An eclipse lost to half a degree; equal inclinations that are not one plane; a Kozai-Lidov peak kept by the reader. Guide logic read in the page, about 83 s of the file's 120 s. The chooser, the orbit plane walk, the Kepler-only refusal and the N-body libration (the Worker run), the report, no-WebGL, Spanish and axe stay in dist. |
| mission | KEPT BOTH | The Worker is a bundle. |
| missionLab | KEPT BOTH | The Worker carries the ephemeris pack. |
| shell | KEPT BOTH | Read: the viewport tests ("nothing the application draws starts under the bar") look at CSS the bundle may order differently; no skip taken. |
| production (dist only) | NOT A DUPLICATE |  |

## Moved to Jest (Prompt 292, D-R10-292-03)

A browser test moves when the fact is not about a browser: it reads what `initialize_simulation` leaves in `js/physics.js` for a fixed seed, which is the same function in Node. Two tests of `e2e/robustness.spec.js` moved to `tests/scenarioWorldFacts.test.js` (the same sweep over every scenario in the catalog and the same predicates, plus a test of the predicate itself): no scenario places two bodies at exactly the same point (22.8 s of a shard), and a scenario that promises a population builds one (4.9 s). In Jest the sweep takes 1.5 s. The scan that looked for more (tests with an `import('/js/...')` evaluate and no interaction with the page, 199 of them) found the rest to be driven walks (`centralExperiments`, `lessonPairs`, `stellarSharedSelection`, `gwLesson`, `sweep`, `reliability`), whose steps read the running page; they stay, and the next candidate to read is `rvSchedule.spec.js`'s "what it could not read is reported", whose parse half `tests/rvSchedule.test.js` may already hold.
