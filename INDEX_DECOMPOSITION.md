# index.html decomposition (Prompt 53)

`index.html` used to carry the static markup of every panel and dialog in the
application, including the ones whose code loads on demand. Since Roadmap II
Prompt 53, a panel's markup ships with its family. `index.html` keeps the
shell, the canvas and the scene description, the live regions, the readout,
the control rail and the transport bar. It also keeps the four observation
panels that start-up binds (light curve, radial velocity, astrometry, rotation
curve) and the Share and Settings dialogs. That is decision D-INDEX-01,
Option B, in [DECISION_REGISTER.md](DECISION_REGISTER.md).

## How it works

- **A host.** Each moved block left an empty `<template data-host="name">` at
  its place in `index.html`. A fragment is inserted right after it: the same
  parent, the same order and the same tab order the static markup had. CSS
  and `js/observationLayout.js` see the document they saw before.
- **Two kinds of fragment**, because two budgets decide where markup can
  live (`tools/index-fragments.mjs` lists every one):
  - _file_: `js/fragments/<host>.html`, fetched beside the family's modules
    by its loader. These are HTML files, not template strings, because the
    deferred JavaScript total had 9 KB of room and these panels are 56 KB of
    markup. Route and bundle budgets count JavaScript only.
  - _template_: an exported template string in the start-up module that binds
    the panel, mounted before it binds. A start-up fetch would delay the first
    interaction by a round trip. `js/ui.js` binds three of these panels at
    the top level, so it mounts them as it loads.
- **Mounting** is `mountFragment()` in `js/i18n/dom.js`. Modules import it
  through `js/i18n/deferredMessages.js` (the two are one bundle chunk; a
  direct import split them and cost every lesson a request). It translates
  the markup before inserting it. It never inserts twice, and it never
  inserts next to a copy the page already has. It returns an `AbortSignal`
  that each family passes to every listener it adds outside its own markup
  (rail buttons, `window`, `document`).
- **Unmounting** is each loader's `unmount…()`: the family's teardown, then
  `unmountFragment()`, which removes every inserted node and aborts the
  signal. `releaseDialog()` (`js/dialog.js`) lets go of the two document
  listeners a dialog carries. The page is left as start-up left it, and the
  family's button loads it afresh. The application itself never unmounts a
  family once it is fetched; unmounting is there so that "present only while
  mounted" and "no leaked listeners" can be checked.
- **Words.** Every `data-i18n` attribute moved with its element. A fragment is
  translated as it goes in, and the language-change sweep covers it like the
  rest of the document. `tools/i18n-audit.mjs` reads the page through
  `assembledIndexHtml()`, which is `index.html` with every fragment at its
  host. Its report is identical to the one it gave before the move.
- **Offline.** `js/fragments/*.html` are core precache entries
  (`tools/build-service-worker.mjs`), and `build.js` copies them to `dist/`.
- **The inspector's first state.** An inline script used to hide the object
  inspector as the parser reached it. `js/ui.js` now does this when it mounts
  the inspector, and the page's policy has one script hash fewer.

## The fragments

| Host                | Family              | Kind     | Mounted by                                        | Bytes | gzip  |
| ------------------- | ------------------- | -------- | ------------------------------------------------- | ----: | ----: |
| `view3d`            | 3-D view            | file     | `js/view3dBridge.js`                              | 1,549 |   667 |
| `pause-event`       | pause at event      | file     | `js/pauseAtEventBridge.js`                        | 4,784 | 1,316 |
| `rv-workspace`      | RV workspace        | file     | `js/rvWorkspaceBridge.js`                         | 5,810 | 1,811 |
| `assist`            | gravity assist      | file     | `js/scenarioPanelBridge.js`                       | 7,728 | 1,817 |
| `binary-run`        | binary run          | file     | `js/scenarioPanelBridge.js`                       | 6,330 | 1,621 |
| `precise-placement` | precise placement   | file     | `js/precisePlacement.js`                          | 1,731 |   743 |
| `lesson`            | lesson engine       | file     | `js/investigationsLoader.js`                      | 18,326 | 5,350 |
| `export`            | data export         | file     | `js/exportBridge.js`                              | 2,190 |   896 |
| `lesson-finish`     | lesson engine       | file     | `js/investigationsLoader.js`                      | 3,565 | 1,119 |
| `lecture`           | Lecture Mode        | file     | `js/lecture.js`                                   | 3,820 | 1,249 |
| `sound`             | start-up            | template | `js/ui.js`                                        | 2,708 | 1,142 |
| `scenario-list`     | start-up            | template | `js/scenarioBrowser.js`                           | 2,311 |   880 |
| `bh-masses`         | start-up            | template | `js/ui.js`                                        |   784 |   370 |
| `inspector`         | start-up            | template | `js/ui.js`                                        | 3,036 |   938 |
| `tutorial`          | start-up            | template | `js/tutorial.js`                                  | 1,043 |   394 |

The start-up templates are unindented to save bytes, because every route that
loads the application pays for them. The files keep their indentation and
comments, which cost no route anything.

## Thresholds and measurements

The thresholds were fixed before any implementation, and are recorded with
the decision. Before is 3805f47; after is this branch. The front door was
loaded as a returning visitor, at 1280 × 800, with the service worker blocked,
and each value is the median of five loads.

| Threshold                                                    | Before                  | After                   | Met?    |
| ------------------------------------------------------------ | ----------------------- | ----------------------- | ------- |
| `index.html` under 40 KB as served (raw: the site serves the tree) | 165,915 B (36,238 gzip) | 89,944 B (20,815 gzip)  | **No**  |
| Accessibility tree at front-door load under ⅓ of today's     | 96,684 chars, 203 nodes | 96,497 chars, 203 nodes | **No**  |
| Time to first interaction unchanged or better                | 3,838 ms                | 3,842 ms                | Yes     |
| No route ceiling exceeded; every lesson route within its own | all within              | all within              | Yes     |

- **`index.html`** fell 46% raw and 43% gzipped. `dist/index.html` went from
  165,118 to 89,147 bytes. Getting under 40 KB would also need the four
  observation panels and the Share and Settings dialogs to load on demand,
  and every comment and indent stripped from the file (Option C).
  `tests/indexDecomposition.test.js` holds the file under 92 KB.
- **The accessibility tree** is the serialized length of Chromium's full tree
  (CDP `Accessibility.getFullAXTree`) without the nodes it marks ignored. The
  prompt's figure was about 94,000 characters. A panel that is closed adds
  nothing to that tree, so the tree is the visible chrome: the shell header,
  the rail, the readout, the transport bar and the footer. Moving every
  movable panel left it where it was, as Phase 1 predicted. Counting ignored
  nodes as well, the tree went from 220,335 to 158,600 characters (678 to 442
  nodes), and the document from 1,278 to 808 elements. On a first visit, with
  Home open, the tree went from 134,584 to 134,364 characters.
- **First interaction** is when the first rail button can be clicked
  (`elementFromPoint` hits it). The splash sets that time, at 3,609 ms both
  before and after. DOMContentLoaded is about 340 ms both times.

### Routes

`node tools/route-budget.mjs`, the published sources and a build. Request
counts did not move on any route.

| Route                  | Sources before | Sources after | Ceiling | Build before | Build after | Ceiling |
| ---------------------- | -------------: | ------------: | ------: | -----------: | ----------: | ------: |
| front door, sandbox    | 2075.6 KB / 99 | 2094.8 KB / 99 | 2103.3 / 102 | 588.8 KB / 54 | 600.8 KB / 54 | 628.4 / 55 |
| Kepler                 | 3264.6 / 138   | 3285.0 / 138  | 3292 / 140 | 1284.5 / 69 | 1296.9 / 69 | 1341 / 69 |
| transit                | 3276.0 / 138   | 3296.5 / 138  | 3303.4 / 140 | 1297.7 / 69 | 1310.0 / 69 | 1354.2 / 69 |
| transit, instrument    | 3484.1 / 140   | 3504.5 / 140  | 3512.6 / 142 | 1490.3 / 73 | 1502.8 / 73 | 1554.4 / 73 |
| power law              | 3242.7 / 138   | 3263.1 / 138  | 3269.9 / 140 | 1269.9 / 69 | 1282.3 / 69 | 1326 / 69 |
| power law, instrument  | 3295.9 / 141   | 3316.3 / 141  | 3323.4 / 143 | 1286.9 / 72 | 1299.4 / 72 | 1344.1 / 72 |
| largest lesson         | 3373.7 / 140   | 3394.1 / 140  | 3401.5 / 142 | 1331.5 / 71 | 1343.9 / 71 | 1389 / 71 |
| figure                 | 2322.3 / 115   | 2341.5 / 115  | 2353 / 117 | 720.7 / 57 | 732.8 / 57 | 761.6 / 58 |

No other route moved. Every route that loads the application pays about 19 KB
of sources for the start-up templates and the mounting code. The fragment
files cost no route anything until their family opens. The bundle budget is
803.2 of 830 KB initial and 4173.8 of 4180 KB deferred. The growth of
`js/ui.js` and `js/scenarioBrowser.js` is recorded in
`docs/bundle-composition.json`: that markup was already downloaded at
start-up, as HTML.

## Tests

- `tests/indexDecomposition.test.js`: `<body>` holds only the allowed static
  set, the hosts and the scripts. No fragment's id is left in `index.html`.
  There is one host per fragment, and every fragment has the top-level
  elements its list names. Each fragment is mounted by its owner, precached
  and built. The assembled page has every id once and every aria reference
  resolved. `index.html` stays under its ceiling.
- `tests/fragmentMount.test.js`: mounting, translating, the refusals and
  unmounting, on a probe and on every real fragment.
- `e2e/fragments.spec.js`: each family in the application. Its markup is
  absent until it is asked for. Once its loader has mounted it, all of it is
  there, after its host, with no id twice. Unmounting removes it, along with
  every listener the family put outside it, round trip after round trip. The
  start-up panels sit at their hosts from the first frame.
- The tests that read `index.html` for its text or ids (dialog inventory,
  spelling, public counts, the tour, the scenario catalog, voice readout,
  accessibility claims) now read the assembled page, so nothing they checked
  has dropped out of their view.
