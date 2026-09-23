# Lazy instrument capabilities: architecture gate

**Status:** in progress on `spike/lazy-capabilities-gate`. Thresholds below were
fixed and committed before the prototype was measured against them.

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

## Browser baseline

_To be measured on a quiet machine before the prototype is judged._

## Prototype

_Not yet built._

## Verdict

_Not yet reached._
