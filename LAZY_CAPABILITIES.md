# Instrument families loaded on demand

How Gravitas fetches its instruments: the staged migration decided in
[LAZY_CAPABILITIES_GATE.md](LAZY_CAPABILITIES_GATE.md) (verdict B, judged on
the configuration the site is published in), finished. Every instrument family
is now fetched when a lesson step first names one of its instruments, and no
lesson loads a family before then.

## What changed

Every lesson opens through the lesson engine (`js/investigations.js`), which
imports the instrument registry (`js/widgets.js`) statically. The registry used
to import every instrument family, so every lesson loaded every instrument,
though no lesson uses more than two families and seven use none. The first
slice moved the transit and power-law families; the GWOSC lab moved the
gravitational-wave family and added its event family lazily; the last thirteen
moved together. None is part of the engine now:

- **A synchronous manifest.** `LAZY_FAMILIES` in `js/widgets.js` lists, for each
  of the seventeen families, the widget ids it owns, a literal `import()` a
  bundler can see and chunk, and the module path a retry needs - and, for a
  family whose instruments need more than their module, what to wait for: the
  tidal and dark-matter prose, the spectra's flux, the GWOSC strain. It holds no
  labels: every label is in the family module or the deferred message catalog.
  `tests/lazyWidgets.test.js` holds the id lists to the modules' exports and
  every `js/*Widgets.js` module to having an entry.
- **One resolver.** `ensureWidget(id)` fetches the owning family once;
  concurrent callers share the same import; `getWidget(id)` stays synchronous
  and returns `null` for a family not yet fetched; `needsLoading(id)` tells
  that apart from an unknown id. `allWidgets()` lists what has been fetched in
  the manifest's order, whatever order the fetches finished in. No public API
  names a file or a chunk. The power-law family is reached through its
  capability package and the runtime of [CAPABILITY_RUNTIME.md](CAPABILITY_RUNTIME.md)
  (`fromPackage()`); the others are the core, found through the same manifest,
  and packaging one later changes its entry, not the loader.
- **Whole-catalog readers.** `whenWidgetsReady()` fetches every family and
  waits for each one's own readiness. `author:check`'s inputs, the authoring
  preview, the scene audit and the test suites that read the catalog await it;
  the two screenshot tools fetch the family they draw with `ensureWidget()`.
- **The reader's view.** While a family is on its way, the tool panel's note
  says so and is a `status` region for as long as it does - also when the
  instrument is the lesson's first screen, where the lesson's text and its Next
  button are usable meanwhile. A failed fetch is a named `WidgetLoadError` and
  says so in the same region. If asking again can help, the panel offers
  **Try again**, which takes focus; if it cannot, it offers **Reload the
  page**, and the reader's answers survive because they are already saved. The
  strings are the first slice's, in English and Spanish.

## Families, and the lessons that reach them

Twenty-four lessons, measured from the lesson registry and each family's own
exports (`node tools/route-budget.mjs --lessons`). The step is the first one
that names the family; a lesson fetches nothing for the steps before it.

| Family              | Instruments | Lessons, at the step that first names it                          |
| ------------------- | ----------: | ----------------------------------------------------------------- |
| energy              |           4 | Bound, Unbound and Escape (3)                                     |
| binary              |           4 | Weighing the Stars (9)                                            |
| black holes         |           8 | Black Holes by the Numbers (3)                                    |
| habitability        |           7 | The Goldilocks Question (2)                                       |
| exoplanet           |           9 | Finding Planets by Their Tug (4), Can You Detect This Planet? (3) |
| tidal               |           6 | Tides (3)                                                         |
| dark matter         |           7 | The Missing Mass (2)                                              |
| chaos               |           1 | The Butterfly Effect in Space (4)                                 |
| resonance           |           4 | When Orbits Lock (3)                                              |
| stellar             |           3 | A Universe of Stars (1), Lives of Stars (1)                       |
| stellar evolution   |           1 | Lives of Stars (2)                                                |
| observing           |           1 | Twelve Nights (2)                                                 |
| stellar spectra     |           2 | A Universe of Stars (30)                                          |
| transit             |           5 | Finding Planets by Their Shadows (6)                              |
| power-law           |           4 | What If Gravity Were Not Inverse Square? (4)                      |
| gravitational waves |           2 | What Is a Gravitational Wave? (1), Listening to Spacetime (1)     |
| GWOSC events        |           1 | Listening to Spacetime (23)                                       |

Seven lessons name no instrument: Kepler's Laws, Why Mars Goes Backwards,
Design the Schedule, Planets in Binary Stars, Where Does a Gravity Assist Get
Its Speed?, Getting There From Here and Where Can It Get To?. Besides the lessons, the authoring preview (`?author=`) and the tools
that read the whole catalog fetch every family, as they should.

Nothing but the registry imports a family, and no family reaches another
(`tests/onDemandFamilies.test.js` holds both, from the import graph). Two pairs
of families share modules outside start-up and the engine - the exoplanet and
observing families the RV schedule (`js/rvSchedule.js`), the two
gravitational-wave families the FFT and the waveform (`js/gw/`) - and each
shared module arrives with whichever of the two a lesson reaches first, never
the other family's own code. The stellar families' MIST tracks and H-R diagram
are the engine's already.

## Failure and retry

A browser caches a failed module fetch for the life of the page: importing the
same URL again rejects at once without a request (measured in Chromium; it is
what the HTML module map specifies). So:

| Configuration                          | First failure | Retry                                                                                                       |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Published sources                      | **Try again** | re-imports the family module under a new URL; recovers in place if the family module itself was what failed |
| Published sources, a dependency failed | **Try again** | fails again (the dependency's URL is cached as failed), and the panel offers **Reload the page**            |
| Bundled build                          | **Try again** | fails (a chunk name cannot be re-derived), and the panel offers **Reload the page**                         |

`e2e/lazyInstruments.spec.js` holds both paths, for a family reached at a later
step (transit) and for one the first step needs (stellar).

## Offline

A lesson whose files the service worker has cached draws its instruments
offline, including a family first fetched on the way through the lesson:
`e2e/lazyInstruments.spec.js` goes offline in Finding Planets by Their
Shadows, and in Lives of Stars reaches the evolution family's step with no network. Both wait for the
worker to report the whole precache first, as `e2e/offline.spec.js` does.

## What the service worker downloads in the background

On-demand loading changes what a lesson fetches before it is usable. It does
not change what a first visit eventually downloads when the service worker is
installed, and the figures above should not be read as that.

The worker precaches the published sources on its first visit
(`tools/build-service-worker.mjs`): every `js/` module, the stylesheets, fonts,
vendored libraries and the scenario pictures - every instrument family among
them, fetched in the background whether or not a lesson ever names one.

| Precache, published sources    |     Before (`v2` `c34d9f5`) |                       After |
| ------------------------------ | --------------------------: | --------------------------: |
| Files                          | 383 (321 core, 62 optional) | 384 (322 core, 62 optional) |
| Bytes                          |                  11,347,140 |                  11,320,842 |
| of which the 17 family modules |                    706.3 KB |                    707.0 KB |

The total fell by 25.7 KB, and none of that is on-demand loading: it is the
smaller Chart.js below, less the new `js/instrumentStartup.js`. A first visit
with the worker installed downloads every family, as it did. Changing that
means changing the precache policy - leaving the families out of the core
precache and caching each when it is first fetched - which trades a lesson's
offline readiness for a smaller first visit, and is a decision of its own
(below).

## Start-up: the bundle's chunks

esbuild puts a module in the chunk shared by exactly the entry points that reach
it, and every family fetched on demand is an entry point. A lazily loaded
family that reaches some of a start-up chunk's modules and not the others makes
the bundler split that chunk, and every page - the front door too - downloads
one more file.

The first slice hit this once: `js/units.js` was split out of a shared chunk
when the power-law family shared it with start-up, and the fix was to move the
conversions into `js/constants.js`, already a chunk of its own. The
gravitational-wave family reads the rendering tier and the reduced-motion
preference from `js/quality.js`, and the registry hands it those two functions
through `bindServices()` rather than letting it import them.

Moving the last thirteen families naively took start-up from 52 files to 59.
Seven families reach thirteen start-up modules that live in three start-up
chunks - the stellar models, the dark-matter and MOND models, the TRAPPIST-1 and
exoplanet data, the resonant systems, the body visuals, the quality tier - and
each reached a different subset. Moving each module, or handing each family its
functions, would have rewritten those seven families. Instead
`js/instrumentStartup.js` imports all thirteen and the seven families import it,
and the registry imports the same thirteen itself: whatever reaches one reaches
all of them, as it did when the families were the registry's, and the three
chunks stay whole. The modules are loaded at start-up already, so this costs a
family one small request. The registry does not import the list module: a
module with no code of its own is still a file of its own - an empty chunk in a
build - and every lesson would have fetched it, which the first version did.
Start-up stayed at 52 files and 616.2 KB.

`tests/onDemandFamilies.test.js` holds it two ways: from the import graph, any
family that reaches one of those modules imports `js/instrumentStartup.js`
(which names the family to fix), and the registry imports the same list; and by
bundling the application twice in
memory (`startupFileCounts()` in `tools/instrument-families.mjs`), once as
written and once with every family made a static import again - the lazy build
may not download more start-up files than the eager one. Removing the import
from one family makes it 53 against 52.

## The deferred total, and Chart.js

Each family fetched on demand is a chunk of its own, and a chunk costs its
import and export statements and its source-map comment. Moving the last
thirteen added seventeen chunks and 7.3 KB to the deferred total - 4177.9 to
4185.2 KB against the 4180 KB ceiling, which is not raised.

The room came from Chart.js. `vendor/chartjs/chart.auto.js` was
`chart.js/auto`: every controller, axis, element and plugin, with the rest of
the library exported beside it. Gravitas makes five charts, all line or scatter
charts on category and linear axes, one of them filled, with legends and
tooltips. `vendor/chartjs/chart.js` registers exactly that
(`tools/vendor-deps.mjs`): 200.2 to 168.3 KB as the sources serve it, and 32.8
KB less in the build, for every reader who opens a chart.
`tests/vendoredChart.test.js` reads every module that makes a chart for the
chart and axis types it names and holds each to the registry, because an
unregistered type throws only in a reader's browser, and holds the registry to
the plugins those charts use, because an unregistered plugin is ignored without
a word.

Deferred is 4152.6 KB after both, 27.4 KB under the ceiling, in 173 chunks:
the seventeen the families added, and one for the start-up module list, which
the readers of the whole catalog import on its own.

## Measurements

Before: `v2` at `c34d9f5`. After: this branch, at `fe2c4ec`. Every lesson in
the registry, with `node tools/route-budget.mjs --lessons` - a fresh browser
context per lesson, the service worker blocked, JavaScript bytes as served and
requests, up to its first usable step and then at each step that first names a
family. Bytes and requests are the same run to run.

**Published sources (what Pages serves), to the first usable step**

| Lesson                                     |          Before |           After |         Change | Families before its first step, after |
| ------------------------------------------ | --------------: | --------------: | -------------: | ------------------------------------- |
| Kepler's Laws                              | 4083.2 KB / 164 | 3272.5 KB / 139 | −810.7 KB, −25 | none                                  |
| Why Mars Goes Backwards                    | 4075.0 KB / 164 | 3264.3 KB / 139 | −810.7 KB, −25 | none                                  |
| Finding Planets by Their Shadows           | 4094.6 KB / 164 | 3283.9 KB / 139 | −810.7 KB, −25 | none                                  |
| Bound, Unbound and Escape                  | 4062.7 KB / 164 | 3252.0 KB / 139 | −810.7 KB, −25 | none                                  |
| Weighing the Stars                         | 4079.2 KB / 164 | 3268.5 KB / 139 | −810.7 KB, −25 | none                                  |
| Black Holes by the Numbers                 | 4081.1 KB / 164 | 3270.4 KB / 139 | −810.7 KB, −25 | none                                  |
| Finding Planets by Their Tug               | 4069.1 KB / 164 | 3258.4 KB / 139 | −810.7 KB, −25 | none                                  |
| The Goldilocks Question                    | 4088.5 KB / 164 | 3277.8 KB / 139 | −810.7 KB, −25 | none                                  |
| The Missing Mass                           | 4082.5 KB / 164 | 3271.8 KB / 139 | −810.7 KB, −25 | none                                  |
| Tides                                      | 4087.6 KB / 164 | 3276.9 KB / 139 | −810.7 KB, −25 | none                                  |
| The Butterfly Effect in Space              | 4075.3 KB / 164 | 3264.6 KB / 139 | −810.7 KB, −25 | none                                  |
| When Orbits Lock                           | 4094.3 KB / 164 | 3283.6 KB / 139 | −810.7 KB, −25 | none                                  |
| Can You Detect This Planet?                | 4075.3 KB / 164 | 3264.6 KB / 139 | −810.7 KB, −25 | none                                  |
| Design the Schedule                        | 4054.3 KB / 164 | 3243.6 KB / 139 | −810.7 KB, −25 | none                                  |
| Planets in Binary Stars                    | 4146.2 KB / 167 | 3335.5 KB / 142 | −810.7 KB, −25 | none                                  |
| Where Does a Gravity Assist Get Its Speed? | 4124.6 KB / 166 | 3313.9 KB / 141 | −810.7 KB, −25 | none                                  |
| Getting There From Here                    | 4057.5 KB / 164 | 3246.8 KB / 139 | −810.7 KB, −25 | none                                  |
| Where Can It Get To?                       | 4130.9 KB / 167 | 3343.6 KB / 144 | −787.3 KB, −23 | none                                  |
| What Is a Gravitational Wave?              | 4252.9 KB / 174 | 3442.2 KB / 149 | −810.7 KB, −25 | gravitational waves                   |
| Listening to Spacetime                     | 4275.3 KB / 174 | 3464.6 KB / 149 | −810.7 KB, −25 | gravitational waves                   |
| A Universe of Stars                        | 4119.8 KB / 164 | 3381.5 KB / 141 | −738.3 KB, −23 | stellar                               |
| Lives of Stars                             | 4099.5 KB / 164 | 3361.2 KB / 141 | −738.3 KB, −23 | stellar                               |
| Twelve Nights                              | 4056.8 KB / 164 | 3246.1 KB / 139 | −810.7 KB, −25 | none                                  |
| What If Gravity Were Not Inverse Square?   | 4061.2 KB / 164 | 3250.5 KB / 139 | −810.7 KB, −25 | none                                  |

**Build (`node build.js`), to the first usable step**

| Lesson                                     |         Before |          After |        Change | Families before its first step, after |
| ------------------------------------------ | -------------: | -------------: | ------------: | ------------------------------------- |
| Kepler's Laws                              | 1626.6 KB / 70 | 1333.5 KB / 68 | −293.1 KB, −2 | none                                  |
| Why Mars Goes Backwards                    | 1623.2 KB / 70 | 1330.2 KB / 68 | −293.0 KB, −2 | none                                  |
| Finding Planets by Their Shadows           | 1639.8 KB / 70 | 1346.7 KB / 68 | −293.1 KB, −2 | none                                  |
| Bound, Unbound and Escape                  | 1612.5 KB / 70 | 1319.4 KB / 68 | −293.1 KB, −2 | none                                  |
| Weighing the Stars                         | 1625.5 KB / 70 | 1332.5 KB / 68 | −293.0 KB, −2 | none                                  |
| Black Holes by the Numbers                 | 1627.8 KB / 70 | 1334.8 KB / 68 | −293.0 KB, −2 | none                                  |
| Finding Planets by Their Tug               | 1616.9 KB / 70 | 1323.9 KB / 68 | −293.0 KB, −2 | none                                  |
| The Goldilocks Question                    | 1633.2 KB / 70 | 1340.1 KB / 68 | −293.1 KB, −2 | none                                  |
| The Missing Mass                           | 1629.1 KB / 70 | 1336.0 KB / 68 | −293.1 KB, −2 | none                                  |
| Tides                                      | 1634.7 KB / 70 | 1341.7 KB / 68 | −293.0 KB, −2 | none                                  |
| The Butterfly Effect in Space              | 1624.4 KB / 70 | 1331.3 KB / 68 | −293.1 KB, −2 | none                                  |
| When Orbits Lock                           | 1639.1 KB / 70 | 1346.0 KB / 68 | −293.1 KB, −2 | none                                  |
| Can You Detect This Planet?                | 1623.5 KB / 70 | 1330.5 KB / 68 | −293.0 KB, −2 | none                                  |
| Design the Schedule                        | 1604.7 KB / 70 | 1311.7 KB / 68 | −293.0 KB, −2 | none                                  |
| Planets in Binary Stars                    | 1652.5 KB / 72 | 1359.4 KB / 70 | −293.1 KB, −2 | none                                  |
| Where Does a Gravity Assist Get Its Speed? | 1638.6 KB / 72 | 1345.6 KB / 70 | −293.0 KB, −2 | none                                  |
| Getting There From Here                    | 1607.1 KB / 70 | 1314.1 KB / 68 | −293.0 KB, −2 | none                                  |
| Where Can It Get To?                       | 1628.9 KB / 73 | 1341.9 KB / 73 |  −287.0 KB, 0 | none                                  |
| What Is a Gravitational Wave?              | 1691.5 KB / 75 | 1398.4 KB / 73 | −293.1 KB, −2 | gravitational waves                   |
| Listening to Spacetime                     | 1708.0 KB / 75 | 1414.9 KB / 73 | −293.1 KB, −2 | gravitational waves                   |
| A Universe of Stars                        | 1650.0 KB / 70 | 1381.3 KB / 70 |  −268.7 KB, 0 | stellar                               |
| Lives of Stars                             | 1639.4 KB / 70 | 1370.7 KB / 70 |  −268.7 KB, 0 | stellar                               |
| Twelve Nights                              | 1606.6 KB / 70 | 1313.6 KB / 68 | −293.0 KB, −2 | none                                  |
| What If Gravity Were Not Inverse Square?   | 1611.6 KB / 70 | 1318.6 KB / 68 | −293.0 KB, −2 | none                                  |

Before, every lesson fetched all thirteen eager families before its first step
in both configurations; after, only a family its first step names. Every lesson
loads less: 738.3 to 810.7 KB less from the sources (median 810.7) in 23 to 25
fewer requests, and 268.7 to 293.1 KB less in the build (median 293.0) in up to
two fewer. No lesson makes more requests than it did.

In the build, the engine's own modules that a family also uses - the stellar
lab, the MIST tracks, the capability runtime - now sit in three small chunks
beside the engine chunk, because a family reaching them gives them a different
set of entry points from the rest of it. Every lesson fetches them; they
replace the RV, SDSS-spectra and chaos chunks that the eager families used to
bring to every lesson, which is why the build's request counts fall by less
than the sources' do. Where Can It Get To? fetches the chaos modules for its own
panels either way, so it breaks even.

**At each step that first names a family - published sources**

| Lesson                                   | Step | Family              |          Before |           After |         Change |
| ---------------------------------------- | ---: | ------------------- | --------------: | --------------: | -------------: |
| Finding Planets by Their Shadows         |    6 | transit             | 4334.6 KB / 166 | 3492.0 KB / 141 | −842.6 KB, −25 |
| Bound, Unbound and Escape                |    3 | energy              | 4062.7 KB / 164 | 3289.1 KB / 140 | −773.6 KB, −24 |
| Weighing the Stars                       |    9 | binary              | 4079.2 KB / 164 | 3306.1 KB / 140 | −773.1 KB, −24 |
| Black Holes by the Numbers               |    3 | black holes         | 4081.1 KB / 164 | 3319.4 KB / 141 | −761.7 KB, −23 |
| Finding Planets by Their Tug             |    4 | exoplanet           | 4069.1 KB / 164 | 3384.1 KB / 143 | −685.0 KB, −21 |
| The Goldilocks Question                  |    2 | habitability        | 4088.5 KB / 164 | 3328.8 KB / 141 | −759.7 KB, −23 |
| The Missing Mass                         |    2 | dark matter         | 4082.5 KB / 164 | 3343.9 KB / 141 | −738.6 KB, −23 |
| Tides                                    |    3 | tidal               | 4087.6 KB / 164 | 3346.0 KB / 141 | −741.6 KB, −23 |
| The Butterfly Effect in Space            |    4 | chaos               | 4075.3 KB / 164 | 3300.4 KB / 142 | −774.9 KB, −22 |
| When Orbits Lock                         |    3 | resonance           | 4094.3 KB / 164 | 3371.7 KB / 143 | −722.6 KB, −21 |
| Can You Detect This Planet?              |    3 | exoplanet           | 4075.3 KB / 164 | 3390.2 KB / 143 | −685.1 KB, −21 |
| What Is a Gravitational Wave?            |    1 | gravitational waves | 4252.9 KB / 174 | 3442.2 KB / 149 | −810.7 KB, −25 |
| Listening to Spacetime                   |    1 | gravitational waves | 4275.3 KB / 174 | 3464.6 KB / 149 | −810.7 KB, −25 |
| Listening to Spacetime                   |   23 | GWOSC events        | 4360.1 KB / 177 | 3549.4 KB / 152 | −810.7 KB, −25 |
| A Universe of Stars                      |    1 | stellar             | 4119.8 KB / 164 | 3381.5 KB / 141 | −738.3 KB, −23 |
| A Universe of Stars                      |   30 | stellar spectra     | 4119.8 KB / 164 | 3429.0 KB / 144 | −690.8 KB, −20 |
| Lives of Stars                           |    1 | stellar             | 4099.5 KB / 164 | 3361.2 KB / 141 | −738.3 KB, −23 |
| Lives of Stars                           |    2 | stellar evolution   | 4099.5 KB / 164 | 3444.7 KB / 144 | −654.8 KB, −20 |
| Twelve Nights                            |    2 | observing           | 4056.8 KB / 164 | 3334.8 KB / 142 | −722.0 KB, −22 |
| What If Gravity Were Not Inverse Square? |    4 | power-law           | 4114.5 KB / 167 | 3303.8 KB / 142 | −810.7 KB, −25 |

**At each step that first names a family - build**

| Lesson                                   | Step | Family              |         Before |          After |        Change |
| ---------------------------------------- | ---: | ------------------- | -------------: | -------------: | ------------: |
| Finding Planets by Their Shadows         |    6 | transit             | 1871.7 KB / 74 | 1545.9 KB / 72 | −325.8 KB, −2 |
| Bound, Unbound and Escape                |    3 | energy              | 1615.9 KB / 72 | 1339.7 KB / 71 | −276.2 KB, −1 |
| Weighing the Stars                       |    9 | binary              | 1629.0 KB / 72 | 1353.4 KB / 71 | −275.6 KB, −1 |
| Black Holes by the Numbers               |    3 | black holes         | 1631.3 KB / 72 | 1360.8 KB / 72 |  −270.5 KB, 0 |
| Finding Planets by Their Tug             |    4 | exoplanet           | 1620.4 KB / 72 | 1366.3 KB / 74 | −254.1 KB, +2 |
| The Goldilocks Question                  |    2 | habitability        | 1636.6 KB / 72 | 1367.7 KB / 72 |  −268.9 KB, 0 |
| The Missing Mass                         |    2 | dark matter         | 1632.6 KB / 72 | 1368.7 KB / 72 |  −263.9 KB, 0 |
| Tides                                    |    3 | tidal               | 1638.2 KB / 72 | 1368.7 KB / 71 | −269.5 KB, −1 |
| The Butterfly Effect in Space            |    4 | chaos               | 1627.8 KB / 72 | 1346.0 KB / 73 | −281.8 KB, +1 |
| When Orbits Lock                         |    3 | resonance           | 1642.6 KB / 72 | 1373.2 KB / 72 |  −269.4 KB, 0 |
| Can You Detect This Planet?              |    3 | exoplanet           | 1627.0 KB / 72 | 1372.9 KB / 74 | −254.1 KB, +2 |
| What Is a Gravitational Wave?            |    1 | gravitational waves | 1691.5 KB / 75 | 1398.4 KB / 73 | −293.1 KB, −2 |
| Listening to Spacetime                   |    1 | gravitational waves | 1708.0 KB / 75 | 1414.9 KB / 73 | −293.1 KB, −2 |
| Listening to Spacetime                   |   23 | GWOSC events        | 1773.7 KB / 79 | 1480.6 KB / 77 | −293.1 KB, −2 |
| A Universe of Stars                      |    1 | stellar             | 1650.0 KB / 70 | 1381.3 KB / 70 |  −268.7 KB, 0 |
| A Universe of Stars                      |   30 | stellar spectra     | 1653.5 KB / 72 | 1409.4 KB / 74 | −244.1 KB, +2 |
| Lives of Stars                           |    1 | stellar             | 1639.4 KB / 70 | 1370.7 KB / 70 |  −268.7 KB, 0 |
| Lives of Stars                           |    2 | stellar evolution   | 1642.9 KB / 72 | 1403.1 KB / 72 |  −239.8 KB, 0 |
| Twelve Nights                            |    2 | observing           | 1610.1 KB / 72 | 1338.5 KB / 72 |  −271.6 KB, 0 |
| What If Gravity Were Not Inverse Square? |    4 | power-law           | 1629.7 KB / 73 | 1336.6 KB / 71 | −293.1 KB, −2 |

A lesson that reaches its instruments has still loaded less than before: 654.8
to 842.6 KB less from the sources, 239.8 to 325.8 KB less in the build. In the
build a family's step can take up to two requests more than before, because the
family, and a module it shares with another family, arrive as chunks of their
own; the seven families that reach the shared start-up modules also fetch
`js/instrumentStartup.js`, which is one small file from the sources and an empty
chunk in a build.

**The routes `tools/route-budgets.json` holds**

| Route                                    | Sources, before |  Sources, after |  Build, before |   Build, after |
| ---------------------------------------- | --------------: | --------------: | -------------: | -------------: |
| front door                               | 2092.8 KB / 101 | 2092.8 KB / 101 |  625.2 KB / 54 |  625.2 KB / 54 |
| sandbox scenario                         | 2092.8 KB / 101 | 2092.8 KB / 101 |  625.2 KB / 54 |  625.2 KB / 54 |
| Kepler's Laws                            | 4083.2 KB / 164 | 3272.5 KB / 139 | 1626.6 KB / 70 | 1333.5 KB / 68 |
| Finding Planets by Their Shadows         | 4094.6 KB / 164 | 3283.9 KB / 139 | 1639.8 KB / 70 | 1346.7 KB / 68 |
| the same, at its instrument              | 4334.6 KB / 166 | 3492.0 KB / 141 | 1871.7 KB / 74 | 1545.9 KB / 72 |
| What If Gravity Were Not Inverse Square? | 4061.2 KB / 164 | 3250.5 KB / 139 | 1611.6 KB / 70 | 1318.6 KB / 68 |
| the same, at its instrument              | 4114.5 KB / 167 | 3303.8 KB / 142 | 1629.7 KB / 73 | 1336.6 KB / 71 |
| A Universe of Stars                      | 4119.8 KB / 164 | 3381.5 KB / 141 | 1650.0 KB / 70 | 1381.3 KB / 70 |
| teaching page                            |   245.1 KB / 16 |   245.1 KB / 16 |   139.4 KB / 1 |   139.4 KB / 1 |
| evaluation page                          |     30.5 KB / 3 |     30.5 KB / 3 |    11.6 KB / 1 |    11.6 KB / 1 |
| instructor portal                        |   768.1 KB / 15 |   768.1 KB / 15 |   646.6 KB / 1 |   646.6 KB / 1 |

The four lesson routes' ceilings were lowered to what they measure here, plus
0.5% of their bytes and one request; the other routes did not move and keep
theirs. In the published sources, where each family is its own module, a family
imported eagerly again puts every lesson over its ceiling. A bundle can absorb
a small family inside the slack, which is why `e2e/lazyInstruments.spec.js` -
every lesson, both targets, in CI - is what holds each lesson to the families
its steps name.

**Bundle budgets** (`node build.js`): start-up 616.2 KB in 52 files and the
initial download 816.6 KB, both unchanged; deferred 4177.9 -> 4152.6 KB in 155
-> 173 chunks, against the untouched 4180 KB ceiling.

**Time.** Measured separately from the bytes, because time is noisy and
bytes are not: `v2` (`c34d9f5`) and this branch at `b6f412f` served side by
side in both configurations, five rounds, each route loaded fresh in each tree
in turn - the order alternating between rounds so that drift falls on both -
the service worker blocked, medians reported. `b6f412f` differs from the final
commit by the one request per lesson that `054941a` removed and by the order
`fe2c4ec` links the start-up module list in for readers of the whole catalog;
neither was timed again. Usable is navigation to the lesson's first step on screen; an
instrument is navigation to its drawing for a lesson that opens on one, and
pressing Next to its drawing for one reached later. The harness is not
committed; it is this document's method, not a check.

| Lesson                                                       | Usable, sources: v2 → branch | Usable, build: v2 → branch | Instrument, sources: v2 → branch | Instrument, build: v2 → branch |
| ------------------------------------------------------------ | ---------------------------: | -------------------------: | -------------------------------: | -----------------------------: |
| Kepler's Laws                                                |                 518 → 478 ms |               430 → 417 ms |                                - |                              - |
| Why Mars Goes Backwards                                      |                 518 → 474 ms |               426 → 417 ms |                                - |                              - |
| Finding Planets by Their Shadows (step 6, from Next)         |                 509 → 470 ms |               429 → 416 ms |                       95 → 94 ms |                   103 → 104 ms |
| Bound, Unbound and Escape (step 3, from Next)                |                 506 → 479 ms |               424 → 409 ms |                     145 → 151 ms |                   149 → 153 ms |
| Weighing the Stars (step 9, from Next)                       |                 506 → 459 ms |               416 → 401 ms |                       73 → 85 ms |                     76 → 87 ms |
| Black Holes by the Numbers (step 3, from Next)               |                 498 → 460 ms |               417 → 401 ms |                     232 → 193 ms |                   184 → 183 ms |
| Finding Planets by Their Tug (step 4, from Next)             |                 505 → 475 ms |               428 → 419 ms |                       64 → 79 ms |                   284 → 313 ms |
| The Goldilocks Question (step 2, from Next)                  |                 509 → 474 ms |               428 → 414 ms |                   3190 → 3227 ms |                 3192 → 3215 ms |
| The Missing Mass (step 2, from Next)                         |                 516 → 466 ms |               432 → 413 ms |                   3213 → 3219 ms |                 3218 → 3220 ms |
| Tides (step 3, from Next)                                    |                 514 → 466 ms |               425 → 417 ms |                     141 → 138 ms |                   129 → 139 ms |
| The Butterfly Effect in Space (step 4, from Next)            |                 506 → 465 ms |               421 → 407 ms |                       53 → 92 ms |                     49 → 88 ms |
| When Orbits Lock (step 3, from Next)                         |                 518 → 464 ms |               432 → 413 ms |                     153 → 176 ms |                   161 → 168 ms |
| Can You Detect This Planet? (step 3, from Next)              |                 512 → 473 ms |               433 → 412 ms |                     285 → 313 ms |                   181 → 180 ms |
| Design the Schedule                                          |                 518 → 479 ms |               428 → 412 ms |                                - |                              - |
| Planets in Binary Stars                                      |                 518 → 477 ms |               439 → 420 ms |                                - |                              - |
| Where Does a Gravity Assist Get Its Speed?                   |                 516 → 474 ms |               430 → 416 ms |                                - |                              - |
| Getting There From Here                                      |                 517 → 478 ms |               426 → 420 ms |                                - |                              - |
| Where Can It Get To?                                         |                 511 → 474 ms |               432 → 420 ms |                                - |                              - |
| What Is a Gravitational Wave? (step 1, from opening)         |                 506 → 463 ms |               418 → 405 ms |                     561 → 511 ms |                   467 → 460 ms |
| Listening to Spacetime (step 1, from opening)                |                 499 → 461 ms |               422 → 405 ms |                     554 → 505 ms |                   469 → 450 ms |
| A Universe of Stars (step 1, from opening)                   |                 512 → 463 ms |               423 → 413 ms |                     536 → 499 ms |                   448 → 453 ms |
| Lives of Stars (step 1, from opening)                        |                 514 → 469 ms |               426 → 410 ms |                     538 → 519 ms |                   450 → 450 ms |
| Twelve Nights (step 2, from Next)                            |                 511 → 468 ms |               431 → 416 ms |                   3274 → 3274 ms |                 3246 → 3273 ms |
| What If Gravity Were Not Inverse Square? (step 4, from Next) |                 501 → 468 ms |               421 → 406 ms |                     344 → 347 ms |                   130 → 126 ms |

Every lesson is usable sooner: 27 to 54 ms from the sources (median 40) and 6
to 21 ms in the build (median 14), against a median spread of 23 ms between
the five loads of any one route. From the sources that is about twice the
noise; in the build no single lesson's difference is outside it, but all
twenty-four move the same way. This is less to parse and run, not less to
wait for on the wire: the server is local.

The cost is on the steps that now fetch a family. Pressing Next onto the first
instrument of a family that used to be part of the engine takes up to 39 ms
longer - the chaos family, whose module fetches two more before it can draw,
most - and most of those differences are inside the noise. Lessons that open on
an instrument draw it sooner from the sources, because the lesson reaches its
first step sooner and fetches one family instead of thirteen. Three steps
(The Goldilocks Question, The Missing Mass, Twelve Nights) take about three
seconds to draw in both trees; that is the scene the step builds, and it did
not move. The front door, whose code did not change, is 3617 against 3620 ms
from the sources and 3604 against 3602 in the build: most of it is the splash
screen's own length, so it shows that the two trees are served alike, not how
large the noise is.

## What is left

Every family is fetched on demand; none is left to move. What remains:

- **The precache.** Whether the service worker should stop fetching every
  family on a first visit - see above. It is a trade between a smaller first
  visit and a lesson that works offline without having been opened online, and
  it is the owner's to make.
- **Packaging.** Sixteen of the seventeen families are the core, not capability
  packages; [CAPABILITY_RUNTIME.md](CAPABILITY_RUNTIME.md) lists the order.
  Being fetched on demand already, a family is packaged by its manifest, a
  builtin entry and its manifest line read from the catalog.

## Earlier slices

### The first slice: transit and power-law

Before: `v2` at `c3dcc4d`. After: this branch. Both with
`node tools/route-budget.mjs --report` - a fresh browser context per route, the
service worker blocked, JavaScript bytes as served and requests, up to a lesson's
first usable step (and for Transit and Power-Law, up to their first instrument
drawn). Bytes and requests only; they are identical run to run.

**Published sources (what Pages serves)**

| Route                                 |          Before |           After |       Change |
| ------------------------------------- | --------------: | --------------: | -----------: |
| front door                            | 2092.3 KB / 101 | 2092.8 KB / 101 |  +0.5 KB, +0 |
| sandbox scenario                      | 2092.3 KB / 101 | 2092.8 KB / 101 |  +0.5 KB, +0 |
| Kepler's Laws                         | 4309.6 KB / 173 | 4224.5 KB / 169 | -85.1 KB, -4 |
| Transit Photometry                    |   4321 KB / 173 | 4235.9 KB / 169 | -85.1 KB, -4 |
| Transit Photometry, at its instrument | 4521.3 KB / 174 | 4475.9 KB / 171 | -45.4 KB, -3 |
| Power-Law Gravity                     | 4287.7 KB / 173 | 4202.6 KB / 169 | -85.1 KB, -4 |
| Power-Law Gravity, at its instrument  | 4287.7 KB / 173 | 4255.8 KB / 172 | -31.9 KB, -1 |
| A Universe of Stars (largest)         | 4346.3 KB / 173 | 4261.2 KB / 169 | -85.1 KB, -4 |
| teaching page                         |   245.1 KB / 16 |   245.1 KB / 16 |  +0.0 KB, +0 |
| evaluation page                       |     23.2 KB / 2 |     23.2 KB / 2 |  +0.0 KB, +0 |
| instructor portal                     |   762.2 KB / 15 |   762.2 KB / 15 |  +0.0 KB, +0 |

**Build (`node build.js`, what the bundle budgets measure)**

| Route                                 |         Before |          After |       Change |
| ------------------------------------- | -------------: | -------------: | -----------: |
| front door                            |  625.3 KB / 54 |  625.2 KB / 54 |  -0.1 KB, +0 |
| sandbox scenario                      |  625.3 KB / 54 |  625.2 KB / 54 |  -0.1 KB, +0 |
| Kepler's Laws                         | 1708.5 KB / 73 | 1675.8 KB / 73 | -32.7 KB, +0 |
| Transit Photometry                    | 1721.7 KB / 73 |   1689 KB / 73 | -32.7 KB, +0 |
| Transit Photometry, at its instrument | 1932.3 KB / 76 |   1921 KB / 77 | -11.3 KB, +1 |
| Power-Law Gravity                     | 1693.6 KB / 73 | 1660.9 KB / 73 | -32.7 KB, +0 |
| Power-Law Gravity, at its instrument  | 1697.1 KB / 75 | 1678.9 KB / 76 | -18.2 KB, +1 |
| A Universe of Stars (largest)         |   1732 KB / 73 | 1699.2 KB / 73 | -32.8 KB, +0 |
| teaching page                         |   139.5 KB / 1 |   139.5 KB / 1 |  +0.0 KB, +0 |
| evaluation page                       |    11.1 KB / 1 |    11.1 KB / 1 |  +0.0 KB, +0 |
| instructor portal                     |   641.5 KB / 1 |   641.5 KB / 1 |  +0.0 KB, +0 |

Every lesson route loads less. The document pages do not move, and neither do
start-up's requests in either configuration: the front door is half a kilobyte
larger under the sources (the unit conversions that moved into
`js/constants.js`, and the comment that says why - comments are bytes when the
sources are what is served) and a tenth smaller in the build, which stays at 54
requests.
The instrument steps fetch their family on arrival: under the sources, Transit
at its instrument loads 4475.9 KB where it used to load 4521.3; in the build it
is one request more than before (the family's own chunk) and 11.3 KB less.

Bundle budgets (`node build.js`): start-up 616.3 -> 616.2 KB, 52 files both;
deferred 4073.1 -> 4076.4 KB in 149 -> 151 chunks, against the untouched
4080 KB ceiling; initial download 816.7 -> 816.6 KB. The deferred total grows
because two families became chunks of their own; it is not the number this
slice was meant to move, and is reported, not replaced.

`tools/route-budgets.json` holds each route to what was measured here plus 0.5%
of its bytes and one request. Every lesson route's ceiling is below what it
loaded before, so loading the two families eagerly again fails the check. The
evaluation page's ceiling is the one exception to "measured here": it was
measured again after merging v2 at `489e4d2`, where #36 made the page write
its CSV through the shared `js/csv.js` and its spreadsheet-formula guard (30.5
KB in 3 requests from the sources, 11.6 KB from the build).
