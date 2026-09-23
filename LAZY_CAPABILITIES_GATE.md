# Lazy instrument capabilities: architecture gate

**Status: UNRESOLVED - needs Carl's decision.** The pre-registered verdict rule,
applied literally to the measurement method fixed with it, gives **C**; the same
prototype, measured the way the site is actually published, meets every
criterion, which would make it at least **B**. The gap is explained below and is
not something this gate should settle for itself. Recommendation: **B**, with
the first slice defined under *If B*. Thresholds were fixed and committed
(`6f3c89a`) before the prototype was measured against them, and are unchanged.

**Question.** Can Gravitas scale to many more investigations without every
lesson loading the entire instrument catalog? `js/widgets.js` statically imports
all sixteen instrument families, and `js/investigations.js` - the lesson engine,
which every lesson opens through - statically imports `js/widgets.js`.

**Base:** `v2` at `5fec8c7` (green). Routes whose code a later merge changes
are re-measured at the SHA the decision is submitted against, and say so.

---

## Static baseline (esbuild metafile, production configuration)

Measured with `spike/lazy-capabilities/route-bytes.mjs`, which builds the
application exactly as `build.js` does, in memory, and walks the metafile's
static and dynamic import edges. Minified bytes as emitted, before compression.

| What | JavaScript |
|---|---:|
| Start-up (entry + static imports) | 614.1 KB in 52 files |
| Opening any lesson adds (the lesson engine's static closure) | 596.0 KB in 14 files |
| of which: all 16 instrument families, in one chunk | 279.8 KB |
| Each lesson's own data module, on top of that | 19.5 - 64.7 KB |

Every one of the 16 families lands in a single chunk (`chunk-ABLVHKDM.js` at
this base) that the engine imports statically, so every lesson downloads and
parses all of them. `spike/lazy-capabilities/lesson-families.mjs` pairs each
step's `tool.id` with the family that defines it:

| Families a lesson uses | Lessons | Instrument code it loads and never runs |
|---|---:|---:|
| none (probes only) | 6 | 279.8 KB |
| one | 16 | 237.0 - 274.9 KB |
| two | 2 | 237.0 - 248.7 KB |

No current lesson uses more than two families or more than 42.8 KB of them.

## Thresholds (fixed before the prototype was judged)

Browser measurements: production build (`node build.js`) served locally, one
fresh browser context per load with the HTTP cache disabled, the same machine,
nothing else running, seven loads per route, medians reported. "Lesson-open
JavaScript" is every `.js` response between opening a lesson and its first step
being usable.

The prototype migrates exactly two families, `transitWidgets` and
`powerLawWidgets`. It is judged on:

| # | Criterion | Pass if |
|---|---|---|
| M1 | Mechanism | Fresh *Kepler's Laws* loads neither migrated family; *Transit Photometry* loads transit and not power-law; *Power-Law Gravity* loads power-law and not transit. |
| M2 | Measured saving | Fresh *Kepler's Laws* lesson-open JavaScript falls by at least 25 KB (the two families' 26.7 KB, less at most 2 KB of manifest and loader). |
| M3 | Projected saving | With all 16 families migrated the same way (from the metafile, not guessed), every current lesson's lesson-open JavaScript falls by at least 150 KB and the median by at least 200 KB. |
| M4 | Start-up | Start-up JavaScript grows by at most 1.0 KB and its request count does not grow. |
| M5 | Latency | Median time to a usable first step for *Transit Photometry* - which now fetches its family after the lesson opens - is no more than max(50 ms, 10%) worse than baseline; *Kepler's Laws* is not worse. |
| M6 | Source mode | The three lessons open and draw their instruments from the unbundled sources with no build step. |
| M7 | Offline | A lesson whose family was fetched lazily while online still draws its instrument offline after a reload, or the design states exactly what the service worker must precache and proves it for one lesson. |
| M8 | Consumers | `getWidget` / `allWidgets`, authoring preview, `author:check`, lesson validation workers, the scene audit and the English/Spanish deferred messages behave as before; no existing test is weakened or skipped. |
| M9 | Failure | A failed family import shows a named, keyboard- and screen-reader-visible error, and a retry succeeds without a reload. |

**Verdict rule.** **A** (implement now) if M1-M9 all pass and migrating the
other fourteen families is mechanical. **B** (staged migration) if M1, M2, M3,
M4, M6, M8 and M9 pass but M5 or M7 needs design work, or some families cannot
be separated from the engine without refactoring. **C** (reject) if M3 fails,
M4 fails, or M5 fails by more than a factor of two. The total-deferred budget is
not replaced by anything in this gate.

## What a visitor actually downloads

The thresholds above name a production build served locally. Measuring it
showed that is not how the site is published: the deploy job uploads `git
archive HEAD` - the committed sources, unbundled - and GitHub Pages serves
them (`tools/prepare-pages.mjs`, `tools/build-service-worker.mjs`: "GitHub
Pages serves the unbundled sources"). `dist/` and the bundle budgets measure a
bundled deployment that does not exist. So every route below was measured twice:
on `node build.js` output (the pre-registered method) and on a `git archive`
of the same commit with the service worker blocked (what a visitor's page asks
for on the way to usable).

Fresh browser context per load, HTTP cache empty, seven loads per route,
medians, the same machine with nothing else running.

| Route | Build: JS / requests | Build: usable | Published sources: JS / requests | Sources: usable |
|---|---:|---:|---:|---:|
| front door | 625.3 KB / 54 | 352 ms | 2092.3 KB / 101 | 440 ms |
| sandbox scenario | 625.3 KB / 54 | 349 ms | 2092.3 KB / 101 | 432 ms |
| Kepler's Laws | 1708.5 KB / 73 | 517 ms | 4309.6 KB / 173 | 776 ms |
| Transit Photometry | 1932.3 KB / 76 | 489 ms | 4521.3 KB / 174 | 726 ms |
| Power-Law Gravity | 1697.1 KB / 75 | 515 ms | 4287.7 KB / 173 | 775 ms |
| A Universe of Stars (largest) | 1732.0 KB / 73 | 479 ms | 4346.3 KB / 173 | 722 ms |
| teaching page | 139.5 KB / 1 | 105 ms | 245.1 KB / 16 | 126 ms |
| evaluation page | 11.1 KB / 1 | 98 ms | 23.2 KB / 2 | 84 ms |
| instructor portal | 641.5 KB / 1 | 73 ms | 762.2 KB / 15 | 113 ms |

On the published site, opening any lesson fetches 4.2-4.5 MB of unminified
JavaScript in about 170 requests, the sixteen family modules - 690.3 KB of source
between them - among them. That, not the bundled 280 KB, is the scaling problem.

The service worker then precaches every `js/` module on the first visit
regardless, so lazy loading does not reduce what a first visit eventually
downloads. It reduces what is fetched, parsed and run before a lesson is usable,
and what a lesson holds in memory - which is what a low-end device feels.
Reducing total first-visit transfer would need the precache policy to change as
well; that is a separate decision.

## Prototype (`spike/lazy-capabilities-gate`)

Two families, `transitWidgets` (21.2 KB minified, 5 widgets) and
`powerLawWidgets` (5.5 KB, 4 widgets), no longer imported by `js/widgets.js`:

- **Synchronous manifest.** `LAZY_FAMILIES` lists each family's widget ids, a
  literal `import()` a bundler can chunk, and the module path.
  `tests/lazyWidgets.test.js` holds the id lists to the modules' exports.
- **One async resolver.** `ensureWidget(id)` loads the owning family once;
  concurrent callers share the import; a failure throws a named
  `WidgetLoadError(family)` and is forgotten so the next call retries.
  `getWidget` stays synchronous and returns `null` for a family not yet fetched;
  `needsLoading(id)` tells that apart from an unknown id.
- **The engine.** When a step's instrument needs loading, the tool panel shows
  "Loading this instrument..." in its note, made a `status` region for the
  duration, and redraws only if the reader is still on that step. A failure says
  so in the same region and puts focus on **Try again**. Three new strings in
  both deferred catalogs.
- **Whole-catalog readers.** `whenWidgetsReady()`, which every reader of labels
  already awaited, now also fetches the lazy families. `author:check`'s inputs,
  the authoring preview and the scene audit await it; the scene audit also
  learned to find a family by `import('./x.js')` as well as `from './x.js'`.
- **Retry.** A browser caches a failed module fetch for the life of the page:
  Chromium's retry of the same URL rejected at once with no request. A retry now
  imports the family's source path with a query string.

## Results

| # | Criterion | Result | Evidence |
|---|---|---|---|
| M1 | Mechanism | **pass** | Build and sources alike: Kepler's Laws loads neither family module; Transit loads `transitWidgets` and not `powerLawWidgets`; Power-Law the reverse (identified by module in the sources, by chunk contents in the build). |
| M2 | Measured saving | **pass** | Kepler's Laws lesson-open JavaScript: build 1708.5 -> 1675.4 KB (-33.1 KB, threshold 25); sources 4309.6 -> 4221.4 KB (-88.2 KB), 173 -> 169 requests. |
| M3 | Projected saving | **pass** | All 16 families lazy (metafile): every lesson sheds 237.0-279.8 KB of minified instrument code it never runs, median 262.6 (thresholds 150 / 200). Sources: 564.9-690.3 KB of family modules per lesson, median 652.6, before their own dependencies. |
| M4 | Start-up | **fails as measured; passes as published** | Build: 52 -> 53 files, 614.1 -> 614.3 KB - `js/units.js` (1.9 KB) is split out of a shared chunk into its own once two lazy families share it with start-up; bytes pass, request count does not. Published sources: 2092.3 KB / 101 requests before and after, identical. |
| M5 | Latency | **pass** (interleaved) | The pre-registered 7-load run was noise-dominated: the front door, whose code is identical in both, measured 160 ms apart. Interleaved base/prototype blocks (5 x 3 loads, sources): front door 479 vs 434 ms (identical code - the noise floor), Kepler's Laws 741 vs 709 ms. Transit's first step is not its instrument, so its usable time does not include the fetch: 726 vs 720 ms. Additional, not pre-registered: Next onto the first instrument, build 87 -> 103 ms (Transit) and 139 -> 146 ms (Power-Law); sources 95 -> 113 and 119 -> 142 ms. |
| M6 | Source mode | **pass** | The sources measurement is the unbundled tree with no build step; both instruments were drawn in every load. |
| M7 | Offline | **pass** | Sources: a first visit to Transit online, the service worker in control, then offline and reload - the instrument step drew. Every `js/` module is precached, lazy ones included, so this holds for any family. |
| M8 | Consumers | **pass, with changes** | `author:check`, `author:strict`, `audit:scene:check`, `i18n:check`, `check:architecture` pass; full jest 5767/5767. Three tools and three test suites needed `await whenWidgetsReady()` before reading the catalog (assertions unchanged); the scene audit needed its family scan widened; `sw-manifest.js` regenerated. Seventeen test files read the registry synchronously today; each migrated family's tests need the same line. |
| M9 | Failure | **pass in the published configuration, with a limit** | The import of `transitWidgets.js` aborted: the note became a status region saying the instrument could not be loaded, **Try again** had focus, and Enter after the request was allowed drew the instrument with no reload. Only because a retry uses a new URL; it cannot rescue a family whose own dependency failed (that URL is cached too), and it cannot work in a bundled build, whose chunk names are fixed. |

Budgets at the prototype (build): start-up 616.5 KB in 53 files (was 616.3 in
52), deferred 4076.3 KB in 151 chunks (was 4073.1 in 149) against the 4080 KB
ceiling - under it, by 3.7 KB.

## Verdict

**Unresolved; recommended B.**

Read literally, the rule fixed before measuring says C, because M4 was to be
measured on the production build and fails there by one 1.9 KB request. That
reading should not be quietly set aside: pre-registration exists so that a
result is not reinterpreted after it is seen.

But the method it names turned out to measure a deployment the project does not
use. On the published configuration every criterion passes, M9 with a real
limit, and the saving is large where it matters - two thirds of a megabyte of
unminified source per lesson that no step runs. The decision this needs is
Carl's: whether the gate is judged on the bundled proxy the budgets use, or on
what Pages serves. Nothing downstream (Prompt 06) should start until it is made.

### If B: the staged migration

**First slice** - the two families prototyped here, made production quality:

1. The manifest, resolver, loading and error states, and `whenWidgetsReady()`
   change as prototyped; the scene audit's family scan; `author:check` and
   preview awaiting the catalog.
2. The start-up request the bundle gained, removed rather than accepted: the
   lazy families take `units.js` through a module already in the engine chunk,
   or the build check below is amended by an explicit decision.
3. Retry: the query-string retry for the family module, and for any other
   failure a stated "reload to try again" with the reader's progress kept - no
   retry control that cannot work.
4. A route check (`fresh-route` bytes and requests for the nine routes above, in
   both configurations) added beside, not instead of, the total-deferred budget.

Acceptance for the slice: M1, M2, M4 (both configurations), M6, M7, M8 and M9 as
above, re-measured at the slice's own base; the tool-step latency reported;
source and dist Playwright coverage of loading, failure and retry; an offline
test for a lesson whose family was fetched lazily.

**Follow-up slices**, each its own PR with the same acceptance. Thirteen of
the sixteen families are used by exactly one lesson; after the two above, the
other eleven (binary, black holes, chaos, dark matter, energy, habitability,
observing, resonance, stellar evolution, spectra, tidal) move with their one
lesson's tests. Then the three each shared by two lessons (exoplanet,
gravitational waves, stellar), with both lessons' tests. Then a decision on
whether the service-worker precache should stop fetching every family on a
first visit.

### If C: the alternative

No measured alternative restores comparable headroom without loading families
lazily; the instrument code is statically reachable from every lesson, and the
deferred budget has 6.9 KB left at the base. Under C, the next step would be a
budget and deployment decision - whether the bundled budgets or the published
sources are what is governed - before any platform work adds code.

## Re-measurement

Base `5fec8c7`. The pending `v2` merges (#34 documentation, the submission-export
work) do not touch `js/widgets.js`, the lesson engine or any instrument family;
the evaluation and instructor routes would move by the size of the CSV helper
change and are re-measured when that lands.

## How to reproduce

```
node spike/lazy-capabilities/route-bytes.mjs         # metafile: start-up, engine, families, lessons
node spike/lazy-capabilities/lesson-families.mjs     # which families each lesson uses
node build.js && node spike/lazy-capabilities/route-probe.mjs dist 4401 7
git archive HEAD | tar -x -C /tmp/pages && node spike/lazy-capabilities/route-probe.mjs /tmp/pages 4403 7 --no-sw
node spike/lazy-capabilities/prototype-checks.mjs /tmp/pages 4405   # M9, M7
```
