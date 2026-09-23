# Instrument families loaded on demand

The design of the first slice of the staged migration decided in
[LAZY_CAPABILITIES_GATE.md](LAZY_CAPABILITIES_GATE.md) (verdict B, judged on
the configuration the site is published in), what it measured, and what is
left to move.

## What changed

Every lesson opens through the lesson engine (`js/investigations.js`), which
imports the instrument registry (`js/widgets.js`) statically. The registry used
to import all sixteen instrument families, so every lesson loaded every
instrument, though no lesson uses more than two families and six use none.

The transit and power-law families are now fetched only when a step names one
of their instruments:

- **A synchronous manifest.** `LAZY_FAMILIES` in `js/widgets.js` lists, for each
  lazily loaded family, the widget ids it owns, a literal `import()` a bundler
  can see and chunk, and the module path a retry needs. It holds no labels:
  every label is in the family module or the deferred message catalog, and
  whatever reads labels already awaits `whenWidgetsReady()`.
  `tests/lazyWidgets.test.js` holds the id lists to the modules' exports.
- **One resolver.** `ensureWidget(id)` fetches the owning family once;
  concurrent callers share the same import; `getWidget(id)` stays synchronous
  and returns `null` for a family not yet fetched; `needsLoading(id)` tells
  that apart from an unknown id. No public API names a file or a chunk.
- **Whole-catalog readers.** `whenWidgetsReady()` fetches the lazy families.
  `author:check`'s inputs, the authoring preview and the scene audit await it;
  so do the test suites that look instruments up by id.
- **The reader's view.** While a family is on its way, the tool panel's note
  says so and is a `status` region for as long as it does. A failed fetch is a
  named `WidgetLoadError` and says so in the same region. If asking again can
  help, the panel offers **Try again**, which takes focus; if it cannot, it
  offers **Reload the page**, and the reader's answers survive because they are
  already saved.

## Failure and retry

A browser caches a failed module fetch for the life of the page: importing the
same URL again rejects at once without a request (measured in Chromium; it is
what the HTML module map specifies). So:

| Configuration | First failure | Retry |
|---|---|---|
| Published sources | **Try again** | re-imports the family module under a new URL; recovers in place if the family module itself was what failed |
| Published sources, a dependency failed | **Try again** | fails again (the dependency's URL is cached as failed), and the panel offers **Reload the page** |
| Bundled build | **Try again** | fails (a chunk name cannot be re-derived), and the panel offers **Reload the page** |

`e2e/lazyInstruments.spec.js` holds both paths.

## Offline

The service worker precaches every `js/` module of the published sources, lazy
families included, so a lazily loaded instrument draws offline after a first
visit (`e2e/lazyInstruments.spec.js`). Lazy loading therefore does not reduce
what a first visit eventually downloads - the precache still fetches every
family in the background. It reduces what is fetched, parsed and run before a
lesson is usable. Whether the precache should stop fetching every family on a
first visit is a separate decision, recorded below.

## The bundled start-up request

The gate's prototype added one start-up request to the bundled build:
`js/units.js` was split into a chunk of its own once the power-law family
shared it with start-up. `SIM_UNITS_PER_AU` and its two conversions now live
in `js/constants.js`, which is already a chunk of its own, and `js/units.js`
re-exports them. The rule for the next families: **a lazily loaded family must
not reach a module that start-up shares with other start-up modules**, or the
bundler splits that module out; `node tools/route-budget.mjs --report` and the
bundle budget show it immediately.

## Measurements

_Filled in from `npm run budget:routes` and `npm run budget:check` at this
branch's commit, against the same numbers at its base._

## What is left to move

Thirteen of the sixteen families are used by exactly one lesson and three by
two. After the two moved here:

| Slice | Families | Lessons whose tests move with them |
|---|---|---|
| next | binary, black holes, chaos, dark matter, energy, habitability, observing, resonance, stellar evolution, spectra, tidal | one each |
| then | exoplanet, gravitational waves, stellar | two each |
| decision | whether the service-worker precache stops fetching every family on a first visit | - |

Each slice is its own pull request with the first slice's acceptance: no
lesson loads a family it does not name; start-up bytes and requests do not grow
in either configuration; the loading, failure and retry states hold in both;
offline holds for a precached lesson; `author:check`, the scene audit, the
deferred catalogs and every existing test pass, with the catalog awaited where
it is read whole.
