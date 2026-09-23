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

| Configuration                          | First failure | Retry                                                                                                       |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Published sources                      | **Try again** | re-imports the family module under a new URL; recovers in place if the family module itself was what failed |
| Published sources, a dependency failed | **Try again** | fails again (the dependency's URL is cached as failed), and the panel offers **Reload the page**            |
| Bundled build                          | **Try again** | fails (a chunk name cannot be re-derived), and the panel offers **Reload the page**                         |

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

When the family needs that module's live state, moving it is not an option.
The gravitational-wave family reads the rendering tier and the reduced-motion
preference from `js/quality.js`, which start-up shares; importing it from a
lazy chunk split `quality.js` out of start-up, one more request on every page.
So the registry hands it those two functions when it loads the family: a family
module may export `bindServices(services)`, and `loadFamily()` calls it before
registering the family's widgets. Start-up stayed at 52 files.

A shared module between two families is the same problem one level down. The
GWOSC event family, added lazily, shares `js/gw/fft.js` and `js/gw/waveform.js`
with the older gravitational-wave family; while that one was still eager, the
bundler split both helpers out of the registry, and every lesson in the build
fetched two more files. Moving the older family too put them in a chunk only
the gravitational-wave lessons fetch.

## Measurements

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

## What is left to move

Thirteen of the sixteen families are used by exactly one lesson and three by
two. After the two moved here, the GWOSC lab moved the gravitational-wave
family as well, and its own event family was lazy from the start (seventeen
families, four lazy):

| Slice    | Families                                                                                                               | Lessons whose tests move with them |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| next     | binary, black holes, chaos, dark matter, energy, habitability, observing, resonance, stellar evolution, spectra, tidal | one each                           |
| then     | exoplanet, stellar                                                                                                     | two each                           |
| decision | whether the service-worker precache stops fetching every family on a first visit                                       | -                                  |

Each slice is its own pull request with the first slice's acceptance: no
lesson loads a family it does not name; start-up bytes and requests do not grow
in either configuration; the loading, failure and retry states hold in both;
offline holds for a precached lesson; `author:check`, the scene audit, the
deferred catalogs and every existing test pass, with the catalog awaited where
it is read whole.
