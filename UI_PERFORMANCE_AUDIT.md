# Gravitas: UI, performance and quality audit

> **Historical record.** This is the report of one audit, with the measurements
> taken at that time on that machine. The numbers are the record and are not
> updated as the application changes; for what the build produces today, run
> `npm run build`, and for frame times, `npm run perf`. Recommendations that
> have since been carried out are marked below.

A finishing pass over the whole application: what was measured, what changed,
and what was deliberately left alone.

## How the numbers were taken

`npm run perf` (`tools/perf-probe.mjs`) loads the real application in headless
Chromium with GPU rasterisation enabled, runs a scenario for a few seconds and
reports where the frame budget goes. The renderer keeps its own per-phase
counters (`perf` in `js/render.js`), off unless the probe turns them on.

Two caveats, so the figures are not read as more than they are:

- **Absolute frame rates are not a real machine.** Headless Chromium on a busy
  build box is not a student's laptop. Only comparisons taken minutes apart in
  the same session are meaningful, and every before/after pair below was.
- **Paint percentages matter more than milliseconds.** Work that is skipped
  shows up as a lower share of frames repainted, not as a smaller average. On a
  machine slow enough that every frame exceeds a throttle interval, nothing is
  ever skipped and a real saving reads as zero.

Bundle figures come from the esbuild metafile, walking the static import graph
from the entry to separate what loads at start-up from what is deferred.

---

## Findings and what was done

### HIGH — Half the bundle was guided-lesson content, loaded for everyone

**Evidence.** Bundle analysis: `js/data/investigations.js` alone was 225 KB,
32% of the production bundle. With the lesson engine and its instruments the
system came to 351 KB, 50% of all JavaScript, shipped to every visitor whether
or not they opened a lesson.

Two things pulled it in: a static `initInvestigations()` import in `main.js`,
and the front door importing the whole registry to print three lesson titles.

**Change.** `js/investigationsLoader.js` holds the entry points — the rail
button, the `I` shortcut, a `#investigation=` link, the front door's browse
action — and loads the system the first time one of them fires. The front door's
lesson previews now arrive after the panel has rendered rather than blocking it.
`splitting: true` in the build turns the dynamic imports into real chunks.

**Risk.** Medium: `initInvestigations()` attaches its own listener to the same
button, so the loader hands over and stands down after the first activation.
Verified by toggling both the Investigations browser and the 3-D view repeatedly
in the production build — they alternate cleanly, with no double-toggle.

**Status.** Done.

### HIGH — 326 KB of third-party JavaScript for two closed panels

**Evidence.** Network trace of the production build on a cold load: three.js
249 KB plus OrbitControls 7 KB, fetched because `main.js` called `init3DView()`
at start-up; Chart.js 70 KB, fetched by a `<script>` tag in `index.html`. The
3-D view and both chart panels start closed.

**Change.** `js/view3dBridge.js` holds the toggle and the per-frame hook; three
arrives on first activation, with a loading state on the button because 249 KB
is not instant. `js/chartjs.js` fetches Chart.js when the light curve or the
energy chart is first opened. Both consumers already read the global `Chart`, so
nothing about their use changed.

**Status.** Done. Cold load now fetches neither.

### HIGH — The starfield repainted every frame

**Evidence.** Per-phase profiling put `drawStarfield` at 2.3–14.2 ms per frame,
consistently more than drawing the simulation itself. For each of ~300 stars it
applies parallax, tests against every active ripple, and tests against every
black hole, neutron star and white dwarf for lensing.

A stale comment in `resizeCanvas`'s neighbourhood said the starfield "is only
redrawn on demand" — an intent that had regressed.

**Change.** It repaints when the view moves, at 30 Hz while something on it is
genuinely moving (ripples, lensing objects), and at 20 Hz otherwise for the
twinkle, which is an amplitude-0.1 sine nobody can see stepping.

**Risk.** Low. Nothing else writes to that canvas, so a skipped frame leaves the
correct image on screen.

**Status.** Done. Repaints fell from 100% of frames to 6–55% depending on
scenario.

### HIGH — Bloom composited and cleared every frame, empty or not

**Evidence.** Two full-screen operations per frame — a `lighter` `drawImage` and
a `clearRect` — whether or not a single glow had been drawn. Most scenarios draw
none.

**Change.** A dirty flag set by the `window.bloomCtx` getter, which is the one
place all eighteen call sites in `physics.js` pass through. Clean frames skip
both operations.

**Status.** Done. Two of six probe scenarios now composite on 0% of frames.

### HIGH — A paused simulation still rendered at full rate

**Evidence.** Paused, the loop drew 8.94 ms per frame on every frame — a tab
left paused kept a core warm for a still image.

**Change.** While paused and untouched, the scene redraws at 10 Hz. Any pointer,
wheel, key or touch event opens a 700 ms window of full-rate rendering, so
panning, dragging, selecting and scrubbing stay immediate. `tickTimeline` still
runs every frame, so a scrub is never missed.

**Risk.** Medium — input lag is the failure mode. Mitigated by driving the grace
window from raw input events rather than trying to enumerate every source of
change.

**Status.** Done. Paused drawing fell from 8.94 ms to 0.14 ms per frame.

### MEDIUM — A no-op full-page filter

**Evidence.** `html, body { filter: hue-rotate(var(--theme-hue-shift))
contrast(var(--theme-contrast)) brightness(var(--theme-brightness)); }`. All
three tokens were declared once in `:root` as `0deg`, `1`, `1` and **never
overridden by any theme or any JavaScript** — the filter was the identity.

It was not free: a filter on `html`/`body` promotes the whole document,
including both full-screen canvases, into a filtered composited layer, and makes
`html` a containing block for fixed-position elements, which is not what any of
the floating panels expect.

**Change.** Removed, along with the three dead tokens. Theme colour already
lives in `tokens.css`, where each theme redefines the palette directly.

**Honest result:** no measurable frame-time change in this harness. The
compositor cost it avoided is not what the probe measures, and I will not claim
a speed-up I cannot show. The justification is dead code and a fixed-positioning
hazard removed, and the change is visually identical because the filter was the
identity. Fixed-element geometry re-verified at 1920, 1440, 1280, 768 and 390.

**Status.** Done.

### MEDIUM — The build reported a bundle size that included the source map

**Evidence.** `node build.js` printed `dist/js/app.js 2861.0 KB` for a 703 KB
bundle: it summed every metafile output, and the source map is 2.1 MB.

**Change.** The build now walks the static import graph from the entry and
reports what is downloaded at start-up separately from what is deferred, which
is also the number worth watching now that the app is split.

**Status.** Done.

### MEDIUM — Resize regenerated the starfield on every event

**Evidence.** Dragging a window edge fires `resize` continuously; each one
reallocated three full-screen canvases and generated 300 new stars.

**Change.** Coalesced into the next animation frame, with an early return when
the dimensions have not actually changed.

**Status.** Done.

### MEDIUM — Sonification kept running in a hidden tab

**Evidence.** `js/audio.js` listened for `visibilitychange` but only ever called
`audioCtx.resume()`. A tab switched away from kept its oscillators running and
its Web Audio graph awake — audible from another tab.

**Change.** Suspend when hidden, resume when visible and unmuted.

**Status.** Done.

### MEDIUM — The running application had no `h1`

**Evidence.** The splash carries a visible GRAVITAS wordmark but is removed from
the DOM once it has played, leaving a document whose only heading was whichever
panel happened to be open. The scenario card was an `h3` under no `h2`.

**Change.** A visually-hidden `h1` naming the application, and the scenario card
promoted to `h2`. Heading order is now `h1` → `h2`.

**Status.** Done.

### LOW — A 14 px touch target

**Evidence.** Collapsed to its swatch below 1600 px, the theme picker in the
footer was a 14 × 34 control.

**Change.** Padding with a compensating negative margin: 30 × 34 without
widening the footer row.

**Status.** Done.

---

## Examined and deliberately left alone

**Per-frame optional features.** `updateLightCurve`, `drawObserverIndicator`,
`update3DScene` and `updateSonification` are called unconditionally every frame.
All four already return on a cheap guard when their feature is closed
(`!enabled`, `!viewEnabled`, `!audioCtx || !voices.length`). No change needed.
`update3DScene` did become cheaper by accident: before the 3-D view is ever
opened it is now a null check in the bridge rather than a module call.

**Inspector and energy-chart refresh intervals.** The inspector rebuilds at
10 Hz and the energy chart auto-refreshes on its own timer, but both are cleared
on close at every exit path, and 10 Hz is inside the range this kind of numeric
readout wants. No leak, no duplication found.

**The physics integrator.** Untouched. No scientific calculation, scenario
outcome or educational result was changed anywhere in this pass.

**Legacy `styles.css`.** Still 4,300 lines with historical hard-coded colours.
The scenario browser's dead `.scenario-list-item` rules are inert (nothing
renders that class, and `components` wins on layer order), and unpicking them by
hand across five media queries is more risk than the bytes are worth. Worth a
deliberate pass of its own.

**`ui.js`.** Still 8,000 lines. The scenario browser and the front door have
already been extracted; the object inspector is the obvious next boundary, but
it is entangled with the energy chart and the drag behaviour, and this was not
the pass to attempt it.

---

## Before and after

Controlled A/B: both runs taken minutes apart in the same session on the same
machine, 5 s per scenario, headless Chromium with GPU rasterisation.

| Metric                               | Before   | After    |
| ------------------------------------ | -------- | -------- |
| Mean frame time (3 scenarios)        | 19.82 ms | 9.40 ms  |
| Starfield, mean per frame            | 8.19 ms  | 3.20 ms  |
| Starfield, share of frames repainted | 100%     | 22%      |
| Star Cluster frame time              | 26.55 ms | 22.08 ms |
| GW150914 frame time                  | 25.39 ms | 3.86 ms  |
| Bloom, share of frames composited    | 100%     | 67%      |
| Paused: drawing per frame            | 8.94 ms  | 0.14 ms  |
| Paused: starfield repaints           | 100%     | 1%       |

Initial download, production build:

| Metric                              | Before            | After             |
| ----------------------------------- | ----------------- | ----------------- |
| JavaScript at start-up              | 703.1 KB          | 328.2 KB          |
| JavaScript deferred                 | 0 KB              | 380.0 KB          |
| CSS                                 | 153.0 KB          | 153.0 KB          |
| Third-party JS at start-up          | 326 KB            | 0 KB              |
| Measured cold load (JS, in browser) | 665 KB / 14 files | 328 KB / 11 files |

Reported build size, for the record: the build previously claimed 2861.0 KB for
what was a 703.1 KB bundle.

---

## Recommended future work

_As recorded at the time of the audit. Three of the four have since been done;
they are struck through rather than deleted, because what was recommended and
whether it happened are both part of the record._

- ~~**Split the lesson data per lesson.** `js/data/investigations.js` is a single
  225 KB module holding all six lessons; opening one loads all six.~~
  **Done.** Lessons are one module each under `js/data/investigations/`, loaded
  on demand, with a generated `manifest.js` carrying the card-level fields so
  the browser can draw the grid without loading any lesson text. There are now
  <!--fact:investigations-->12<!--/fact--> of them.
- ~~**Retire the dead scenario-browser CSS** in `styles.css`.~~ **Done.** No
  `scenario-browser` rules remain in the stylesheets.
- ~~**Extract the object inspector from `ui.js`**, once the energy-chart and drag
  couplings are understood.~~ **Done.** It is `js/objectInspector.js`; see
  [`OBJECT_INSPECTOR.md`](OBJECT_INSPECTOR.md).
- **Measure the compositor**, not just the main thread. Still open. Nothing here
  can distinguish a saving in rasterisation from one in JavaScript, which is why
  the page-filter removal is reported as dead-code removal rather than a
  speed-up.
