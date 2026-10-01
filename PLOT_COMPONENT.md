# One plotting component: the parity table and its thresholds

Roadmap II, Prompt 64, first step. The prompt asks for this to be fixed
before anything is built:

- the **parity table**: every chart in the application and its pages;
- the **acceptance rule** a chart has to meet before it migrates;
- the **byte threshold** the component has to meet on every route it enters.

This file fixes all three, with the measurements a build-out decision
needs. The build-out it recommends is recorded at the end, step by step
("Build-out log").

Measured on `v2` at 4c4ea5a, the base of `feat/plot-component`. Prompt 60's
artifact envelope (#130) and Prompt 51's design-system pull requests (#152,
#153, #159, #163) are on `v2`, so the Run condition holds. No branch or pull
request already holds a plotting component.

## Summary

- **83 charts, 5 of them Chart.js.**
  - **Chart.js (5):** the energy chart, the light curve, the radial-velocity
    trace, and the experiment bench's comparison and sweep charts. All five
    are in the application's own graph.
  - **Hand-drawn (78):** 66 on canvas, 9 in SVG, 1 in HTML and CSS, and 2
    drawn into PDFs.
  - **Out of scope:** about 30 diagrams with no data axes. They are listed at
    the end.
- **The one shared plot that already exists** was js/observatory/plot.js
  (`createPlot`, now `js/plot/plot.js`). It is SVG, with brushing, keyboard
  selection, error bars and min-max decimation, and it is linked to
  `selection.js` and `table.js`.
  Five charts use it. The component should be built by promoting it, not
  beside it.
- **Chart.js costs 168.2 KB of deferred JavaScript.** Its chunk is 172,191
  bytes in the build, 4.0% of the 4170.7 KB deferred total. In the published
  tree it is 172,344 bytes, fetched in one request.
- **The deferred budget has no room for the component next to Chart.js.**
  - The ceiling is 4180 KB. Today's total is 4170.7 KB, and the two pull
    requests queued at the time of writing take it to about 4178.4 KB (as
    reported to this work; not measured here). That leaves about 1.6 KB.
  - The component is estimated at 17 KB minified, plus 4.5 KB for the units
    registry the application does not load yet.
  - So the component can enter the application's graph only in the same pull
    request that removes the vendored chunk. That means **all five Chart.js
    charts migrate together**, for a net change of about −140 KB.
- **The route rule rules out eager loading.** In the application the
  component has to arrive the way Chart.js does now, on first open.
  - The front door carries about 31 KB of chart-drawing code in the
    published tree. A full component is about 41 KB there.
  - The published site is the tree, so routes count source bytes, comments
    included ([DEPLOY_MODEL_GATE.md](DEPLOY_MODEL_GATE.md)).
- **Recommendation: B, staged.**
  1. Build the component from `observatory/plot.js`, as feature modules.
  2. Adopt it on the tool pages, outside the deferred graph.
  3. Then migrate the five Chart.js charts in one pull request and remove
     Chart.js.
  4. Then migrate the application's hand-drawn panels, and the lesson widgets
     one family at a time, each where its routes measure no larger.
  - Some charts are expected to stay as they are: the power-law family and
    the two transfer-window heatmaps (the reasons are under "Go or no-go").
    The two PDF figures stay too, because they are not drawn on screen.

## The acceptance rule

As the prompt states it:

> a chart migrates only if the component matches its behaviour in the parity
> table and its e2e tests pass unchanged or with a documented equivalent.

Made concrete, a chart in the table migrates only when all of the following
hold.

1. **Every cell of its row that is not "none" is reproduced:**
   - the same chart type, with the same series, in the same order, keeping
     every visual distinction the row names (dashed against solid, hollow
     masked points, color by family, and so on);
   - a live update rate at least today's, and a point capacity at least
     today's cap. Decimation is allowed if it keeps the lowest and highest
     point in every pixel column, as `observatory/plot.js` does;
   - every interaction the row names, with the same keys where it has keys;
   - error bars from the same sigma or interval;
   - the same log or reversed axes;
   - every annotation;
   - a legend that toggles series wherever today's does. Every visible
     Chart.js legend toggles, because none overrides the default;
   - the theme behavior, at least: a chart that repaints on a theme change
     still does.
2. **Its export is unchanged.**
   - CSV rows come from `js/dataExport.js` and the notebook builders, not
     from chart code, and must stay byte-identical.
   - The energy chart's PNG must still download as a PNG.
3. **Its accessible text is not reduced.** Today's role, label,
   `aria-describedby`, linked table and live region all stay. The data-table
   disclosure and live summary the component adds are additions; they do not
   replace a text alternative that already exists.
4. **Its tests pass:**
   - the e2e and Jest tests listed in its row pass unchanged; or
   - an equivalent is recorded in this file in the pull request that
     migrates it.
   - Three tests read Chart.js internals and need an equivalent written
     against the component's public series model: `e2e/inspector.spec.js:86`
     (`Chart.getChart(...).config.type`), `e2e/detectPlanet.spec.js:142`
     (dataset label, hidden, dashed) and `tests/vendoredChart.test.js`.
5. **A characterization test comes first where none exists.**
   - Where the "Tests" cell says the chart itself is not asserted, a test is
     written against today's chart before it migrates. The golden tick table
     and the series-to-table parity check the prompt asks for are the natural
     form.
   - Otherwise "pass unchanged" would be vacuous.
6. **It meets the byte threshold** below on every route it enters.

The verdict is recorded per chart, in the "Verdict" column of the build-out
log at the end of this file. It is filled in as charts are judged.

## The parity table

The columns, in table order:

- **Kind:** CJS = Chart.js, cv = hand-drawn canvas, SVG, HTML, PDF.
- **Live:** whether the chart redraws while the simulation runs, at what
  rate and with what cap. "Static" means it redraws only when the reader
  acts.
- **Sel:** selection, brushing, hover.
- **Err:** error bars.
- **Log:** log or reversed axes.
- **Ann.:** annotations.
- **Leg.:** legend.
- **Son.:** sonification hook.
- **Exp.:** export.
- **Keys:** keyboard access today.
- **Text:** accessible text today.
- **Parity means:** what "matches its behavior" means for that row, in
  addition to the general rule above.

Every rate below that says "at 60 fps" is computed from the code. The
measured rates come from a headless Chromium on a development Mac, whose animation
frame ran at only 17-31 per second, so they are lower bounds. How they were
measured is under "How these numbers were measured".

### A. The application's Chart.js charts

All five load `vendor/chartjs/chart.js` through `js/chartjs.js`
`ensureChartJs()`, on first open. The vendored build registers only
LineController, ScatterController, LineElement, PointElement, CategoryScale,
LinearScale, Filler, Legend and Tooltip (`tools/vendor-deps.mjs`). It has no
log scale and no decimation. `js/observationChart.js` holds their shared
colors and axis settings.

| # | Chart | Kind | Type · series | Live | Sel | Err | Log | Ann. | Leg. | Son. | Exp. | Keys | Text | Tests | Parity means |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Energy, object inspector: `js/energyChartNew.js`, wired in `js/ui.js` `updateEnergyChart`; `#energyChart` | CJS | line · 3: kinetic, potential, total | ≤ 8 Hz (`chart_update_hz` 8, in `chartWorker.js` and again in `updateChart`), 200 points per series. **Measured 3.7 Hz**, 143 points per series, at 30 frames/s | tooltip, index mode | none | none | none | top, toggles | none | PNG (`toBase64Image`) | refresh and export buttons | no role or label on the canvas; text readouts beside it | `e2e/inspector.spec.js:86` (Chart internals); `tests/objectInspector.test.js`; `tests/vendoredChart.test.js` | 3 toggling series; ≥ 8 Hz at 200 points; PNG export; a keyboard-reachable value readout in place of the hover tooltip. Today's colors are fixed dark-theme values: tokens are an improvement, not a parity cost |
| A2 | Light curve: `js/lightCurve.js` `buildChart`, `updateLightCurve`; `#lightCurveCanvas` | CJS | line with fill, category x of day strings · 1 | one sample per frame, a repaint every 6th (`CHART_REDRAW_EVERY`), cap 2000 (`MAX_DATA_POINTS`): 10 Hz at 60 fps. **Measured 3.8 Hz**, 215 points, at 23 frames/s | tooltip, nearest, 6 decimals | none | none | none on the chart (transits detected, not drawn); y auto-range with a 30% margin, at least 1e-4 | off | none | CSV of the light curve and of the transits, with a table, in the export dialog | none | container `role=region`; no label on the canvas; table through the export dialog | `e2e/observing.spec.js:35`, `production.spec.js:98`, `selfContained.spec.js:143-153`; `tests/dataExport.test.js`, `vendoredChart.test.js` | 10 Hz at 2000 points; the same y range rule; the theme repaint; the x axis becomes numeric days, an equivalent recorded here |
| A3 | Radial velocity: `js/radialVelocity.js` `buildChart`, `updateRadialVelocity`; `#rvCanvas` | CJS | line plus points · 2: curve, or a dashed "ideal" overlay during a survey; measurements | ≤ every 60 ms (`SAMPLE_INTERVAL_MS`), cap 900 (`MAX_SAMPLES`), thinned 2:1 in a survey: 15 Hz at 60 fps. **Measured 12.5 Hz**, 114 points, at 25 frames/s | tooltip | **custom `rvErrorBars` plugin**, ±σ per point, 3 px caps | none | dashed `[4,4]` ideal overlay | survey only, toggles | none | RV measurements CSV; "Analyze" opens B1 | none | container `role=region`; `#rvNotice` `role=status`; no label on the canvas | `e2e/observing.spec.js:88`, `detectPlanet.spec.js:32,141` (Chart internals), `rvLaunchPath`, `rvSchedule`, `shareObserving`; `tests/dataExport.test.js`. **No test of the error bars** | σ bars with caps; the overlay dashed and hideable; 15 Hz at 900 points. An error-bar characterization test comes first |
| A4 | Bench comparison: `js/experiments/panel.js` `renderChart`; `#benchChart` | CJS | line, category x of aligned times · 2: run A solid, run B dashed `[5,3]` | static (drawn once both runs exist) | tooltip | none | none | none | toggles | none | CSV and JSON; notebook `fromBenchComparison` | metric `<select>` | `aria-label`; results table; `#benchWarnings` `aria-live` | `e2e/centralExperiments.spec.js` (the panel); `vendoredChart.test.js`. **No test names the canvas** | A solid, B dashed; the metric switch. A characterization test comes first |
| A5 | Bench sweep: `panel.js` `renderSweepChart`; `#benchSweepChart` | CJS | scatter with line · 1 (failed trials left out) | static | tooltip | none | none | none | toggles | none | sweep CSV; notebook `fromSweep` | metric `<select>` | `aria-label`; table; `#benchSweepStatus` `aria-live` | `e2e/sweep.spec.js:365` (visible only) | Failed trials still left out; the metric switch |

### B. The application's hand-drawn panels

| # | Chart | Kind | Type · series | Live | Sel | Err | Log | Ann. | Leg. | Son. | Exp. | Keys | Text | Tests | Parity means |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | RV fit workspace: `js/rvWorkspace.js` `draw`; `#rvFitCanvas` | cv | 3 stacked panels: series, folded, residuals · data plus model (400 and 200 samples) | static | none | bar with 2.5 px caps | none | dashed zero on the residuals; warning color when `runsRatio` < 0.6; **no tick labels** | none | none | RV fit CSV; notebook `fromRvFit` | sliders, buttons | none on the canvas; `#rvFitStats`, `#rvFitTruth` `role=status` | `e2e/rvWorkspace.spec.js`, `rvUncertainty.spec.js` (text, CSV); `tests/rvWorkspace.test.js`. **Canvas not asserted** | 3 linked panels; the residual warning color |
| B2 | RV periodogram: `rvWorkspace.js` `drawPeriodogram`; `#rvFitPeriodogram` | cv | line, χ² against period · 1 | static | none | none | **log x** (by hand) | dashed lines at near-best minima; min and max labels | none | none | in the RV fit CSV | none | none on the canvas; `#rvFitRivals` | as B1. **Canvas not asserted** | log x; the rival-minimum markers |
| B3 | RV Monte Carlo histograms: `js/rvWorkspacePanel.js` `drawHistogram`; `#rvMcPeriodHist`, `#rvMcAmplitudeHist` | cv ×2 | histogram · bins colored by family, the rest muted | static | none | none | none | lo and hi labels, peak count | family table with the same swatches | none | in the RV fit CSV | none | family table; `#rvMcStatus` `aria-live` | `e2e/rvUncertainty.spec.js`; `tests/rvUncertainty.test.js` | color by family, with a pattern fallback |
| B4 | Astrometry sky path: `js/astrometry.js` `drawSkyPlot`; `#astrometryCanvas` | cv | equal-aspect path, **no axes** · path plus current star | ≤ every 60 ms, cap 1200: 15 Hz at 60 fps. **Measured 12.0 Hz** at 23 frames/s | none | none | none | barycenter crosshair; scale bar with an angular unit | none | none | none | none | container `role=region`; caption; readouts | `e2e/observing.spec.js:139`, `shareObserving`, `pauseAtEvent` | equal aspect; the scale bar. Needs an equal-aspect mode, or it stays |
| B5 | Rotation curve: `js/rotationCurve.js` `draw`; `#rotationCurveCanvas` | cv | scatter plus models · bodies (dot size by mass), visible-mass model dashed, halo **or** MOND | **every frame**, no throttle; 96 model samples. **Measured 16.6 Hz** = the frame rate | none | none | **log x** (decades, AU labels); 3 y ticks | shaded band left out of the fit (`rFitMin`) | static HTML legend, does not toggle | none | rotation-curve CSV and table | mode buttons | `role=img`, static `aria-label`; `#rotationCurveNotice` `role=status` | `tests/rotationCurve.test.js`, `accessibilityParity.test.js:376-381` (reads `Y(p.speed)` in the source); `e2e/accessibilityParity.spec.js:583-613`, `galaxyGravity.spec.js`. **Canvas not asserted** | frame-rate updates; dot size by mass; the shaded band. `accessibilityParity.test.js` reads this file's source and needs a documented equivalent |
| B6 | Binary sweep: `js/binaryRunPanel.js` `renderSweepPlot`; `#binarySweepPlot` | cv | strip plot, a lane per outcome · a dot per trial, hollow when untrustworthy | static | none | none | none | lane labels, x lo and hi | lanes labeled | none | notebook `fromBinarySweep` | none | `#binarySweepTable`; `#binarySweepStatus` `role=status` | `e2e/binarySweep.spec.js:142` (checks pixels) | hollow untrustworthy trials; the pixel check rewritten against the SVG |
| B7 | Gravity-assist sweep: `js/assistPanel.js` `renderSweepPlot`; `#assistSweepPlot` | cv | dual-axis scatter · deflection (open circles, left), speed change (squares, right) | static | none | none | none | axis names only, **no y ticks** | colored axis titles | none | notebook `fromAssistSweep` | none | `#assistSweepTable`; `role=status` | `e2e/assistExperiments.spec.js` (table only) | two y axes; marker shapes, not color alone |
| B8 | Lesson plot: `js/investigations.js` `drawPlot`; `#investigationPlotCanvas` | cv | scatter · points with labels, fitted line | static (each measurement keystroke, toggles, resize, theme) | none | none | **log-log toggle** `#investigationPlotLog`; a transform toggle | dashed fit line with a slope label; point labels | none | none | none | toggles with `aria-pressed` | `role=img`, `aria-describedby` to a full table with a caption | `e2e/accessibility.spec.js:153`, `viewportMatrix.spec.js:165`, `investigations.spec.js:351` | both toggles; the fit and its slope label |

### C. The lesson instruments

Every widget draws into one shared canvas, `#investigationToolCanvas`,
through `paintTool()` in `js/investigations.js`. These facts hold for every
row, so the table does not repeat them:

- **Cadence:**
  - Animated widgets repaint on every animation frame (`startToolLoop`;
    `dt` is capped at 0.1 s). There is no millisecond throttle, so a buffer
    of N samples covers N frames whatever the display rate.
  - Other widgets repaint on a control change, step entry, a resize
    (150 ms debounce), a theme change, a stage rebuild, or a change of the
    selected body (polled every 250 ms).
- **Keyboard:** sliders, presets and action buttons work from the keyboard.
  The canvas is focusable only for a widget with `pick` (C38).
- **Accessible text:**
  - `paintTool` sets `aria-label` to "<title>: N measured values, listed
    below". `aria-describedby` points at the readout `<dl>`, which is not a
    live region.
  - `wireToolPointer` removes the HTML's `role="img"` from every widget
    without `pick`, so those canvases have a label and no role. This is a
    known gap, not a parity requirement.
- **Interaction:** no hover, brush or tooltip on any widget except C38.
- **Export:** none to CSV or PNG. Notebook capture (`captureToNotebook`) for
  bh-scaling, stellar-lab, stellar-population, stellar-evolution and gw-lab.
- **Sonification:** only gw-lab, whose Listen action goes through
  `js/widgetRuntime.js` `playSignal` to `js/gwAudio.js` and
  `js/gw/audioRender.js`. `js/sonify/*` is wired to no chart at all.
- **Reduced motion:** only gw-lab and stellar-evolution check it.
- **Tests:** `e2e/canvasLegibility.spec.js` (text size, clipping and overlap)
  covers every widget except observing-planner, the power-law widgets, the
  spectra widgets and gw-events. Each family is also walked by its lesson's
  e2e specs.
- **Parity means**, for every row: the readout `<dl>` stays the text
  alternative and its rows are unchanged; legibility still passes; plus what
  the row adds.

| # | Widget · draw | Type · series | Live | Err | Log | Annotations · legend | Tests (besides the shared ones) | Parity means |
|---|---|---|---|---|---|---|---|---|
| C1 | bh-scaling · `blackHoleWidgets.js` `SCALING.draw` | scatter plus fit through the origin · trials, fit, slider ring | static | none | none | gridlines; "N trials recorded" | `tests/blackHoleWidgets.test.js` | the fit appears from 2 trials |
| C2 | bh-density · `DENSITY.draw` | 1-D number line · ladder of 4, marker | static | none | **log10** 0-20 | 10ⁿ ticks; halo labels | none by id | log ticks |
| C3 | bh-thermo · `THERMO.draw` | 1-D thermometer · fill, ladder | static | none | **log10 K** −20 to 4 | 10ⁿ ticks | none by id | log ticks |
| C4 | bh-lifetime · `LIFETIME.draw` | horizontal bars · 3 | static | none | **log10 years** | value text | `tests/authoring.test.js` | log bars |
| C5 | bh-blocks · `BLOCKS.draw` | horizontal bars · 4 | static | none | implicit (bar = exponent) | ×/÷10ⁿ labels | `blackHoleWidgets.test.js` | the exponent labels |
| C6 | bh-escape · `ESCAPE.draw` | gauge, v/c · 1 | static | none | none | quartile ticks; c end-stop | `blackHoleWidgets.test.js` | the end-stop |
| C7 | chaos-divergence · `chaosWidgets.js` `plot` | 2 stacked lines · d(t) linear; d(t) log; exponential fit dashed | live, repaints on events only | none | **log y** (lower) | shaded fit window; axis titles, no ticks | `tests/chaosDivergence.test.js` (maths); `e2e/chaos.spec.js` | both panels; the fit window |
| C8 | dm-shapes · `darkMatterWidgets.js` `SHAPES.draw` | line, v(r), 140 samples · 1 | static | none | none | dashed flat-speed reference | `tests/darkMatterWidgets.test.js` | the reference line |
| C9 | dm-enclosed · `ENCLOSED.draw` | 2 stacked lines, shared x · v visible (dashed), v total; M visible (dashed), M(<r) | static | none | none | shared cursor and markers · canvas key | `darkMatterWidgets.test.js` | the shared cursor; the key |
| C10 | dm-fit · `FIT.draw` | points plus models · 12 synthetic points, disc, halo, total | static | **capped bars** | none | "synthetic" label; FITTED badge · key row | `darkMatterWidgets.test.js` (calls draw) | the bars; the "synthetic" label |
| C11 | dm-mond · `MOND_FIT.draw` | points plus models · data, visible, halo or MOND, total | static | **uncapped bars** | none | "synthetic" label | `darkMatterWidgets.test.js` | as C10 |
| C12 | dm-virial · `VIRIAL.draw` (bars) | 2 bars, one stacked | static | none | none | values; "N× more" | `darkMatterWidgets.test.js` | the stacked bar |
| C13 | dm-budget · `BUDGET.draw` | stacked 100% bars · ≤ 3 rows | static | none | none | in-segment labels | `darkMatterWidgets.test.js` | the segment labels |
| C14 | launch (lower panel) · `energyWidgets.js` `drawEnergyBars` | signed bars · motion, position, total | animated, a replay over 4.5 s (`ANIMATION_SECONDS`) | none | none | zero line; MJ/kg values | `tests/energyWidgets.test.js` | signed bars at frame rate |
| C15 | live-energy · `LIVE_ENERGY.draw` | bars plus time series · KE, PE, total | **every frame**, `HISTORY` 260 samples | none | none | zero line · colored labels | `energyWidgets.test.js` | 260 samples at frame rate |
| C16 | escape-compare · `ESCAPE_COMPARE.draw` | horizontal bars · 4 bodies | static | none | none | values; off-scale arrow | `energyWidgets.test.js` | the off-scale arrow |
| C17 | rv-observer (right panel) · `exoplanetWidgets.js` `rvObserver.draw` | line plus moving dot · 120 samples | animated | none | none | zero line; toward and away text; no ticks | `tests/exoplanetWidgets.test.js` | the moving marker |
| C18 | rv-mass · `rvMass.draw` | curve plus point · 100 samples | static | none | none | dashed crosshair | `exoplanetWidgets.test.js` | the crosshair |
| C19 | rv-inclination (bars) · `rvInclination.draw` | 2 bars | static | none | none | labels | `exoplanetWidgets.test.js` | as drawn |
| C20 | method-comparison · `methodComparison.draw` | 3 progress bars | static | none | none | row text | `exoplanetWidgets.test.js` | as drawn |
| C21 | survey-schedule · `surveySchedule.draw` | 2-panel scatter, time and phase · observations, dashed model (400 samples) | static, seeded | **capped ±σ** | none | zero lines; 10 phase gridlines | `exoplanetWidgets.test.js`; `e2e/detectPlanet.spec.js` | both panels; the bars |
| C22 | transit-noise · `transitNoise.draw` | bars plus a light curve · 4 noise bars; 60 binned points, dashed box model | static, seeded | none | none | depth marker; depth and noise text | `exoplanetWidgets.test.js`; `detectPlanet.spec.js` | the box model; the depth marker |
| C23 | hz-orbit (lower panel) · `habitabilityWidgets.js` `ORBIT.draw` | line plus marker · insolation, 200 samples | animated (0.11 orbits per second) | none | none | habitable-zone band; cursor | `tests/habitabilityWidgets.test.js` | the band; the cursor |
| C24 | hz-star · `STAR_WIDGET.draw` | 1-D distance axis · zone band, planet | static | none | none | edge lines | `habitabilityWidgets.test.js` | as drawn |
| C25 | hz-boundaries · `BOUNDARIES_WIDGET.draw` | 1-D axis · 2 interval bands, Earth | static | none | none | `niceStep` ticks | `habitabilityWidgets.test.js` | as drawn |
| C26 | hz-trappist · `TRAPPIST.draw` | 1-D axis · 7 planets, band | static | none | **sqrt x** | labels | `habitabilityWidgets.test.js` | the square-root axis |
| C27 | hz-insolation · `INSOLATION.draw` | marker plus gauge | static | none | none | dashed Earth reference | `habitabilityWidgets.test.js` | the reference |
| C28 | visual-binary · `binaryWidgets.js` `VISUAL_BINARY.draw` | relative-astrometry scatter, **no axes** · positions every 5 years, orbit after one period | static | none | none | year labels every 20 years | `tests/binaryWidgets.test.js` | equal aspect; the year labels |
| C29 | observing-planner (upper) · `observingWidgets.js` `PLANNER.draw` | timeline bars · night, usable window, booked epochs (20 nights, 12 epochs) | static | none | none | night numbers | lesson specs only | as drawn |
| C30 | observing-planner (lower) · same | line, spectral window · 1 | static | none | none | dashed sidereal frequency with label | lesson specs only | the sidereal line |
| C31 | power-law-refinement · `powerLawWidgets.js` `REFINEMENT.draw` | dot plot · 4 timesteps | static | none | none | dashed zero; no y ticks | family tests only | as drawn |
| C32 | power-law-kepler · `KEPLER.draw` | scatter plus fit · 6 orbits, fitted line | static | none | **log-log** (titles, no ticks) | slope text | `tests/capabilityRuntime.test.js` | log-log; the slope |
| C33 | power-law-conservation · `CONSERVATION.draw` | horizontal bars · 3 | static | none | **log x** 1e-16 to 1 | round-off note; threshold color | family tests only | log bars; the 1e-10 threshold |
| C34 | resonance-periods · `resonanceWidgets.js` `PERIODS.draw` | horizontal bars · N bodies | **every frame**; recorder ≤ 2000 samples | none | **log** (no ticks) | ratio labels | `tests/resonanceWidgets.test.js`, `resonance.test.js`; `e2e/resonance.spec.js` | ratio labels at frame rate |
| C35 | resonance-angle (wrapped) · `wrappedPlot` | scatter, 0-360° against time · ≤ 900 points | every frame | none | none | gridlines at 0/90/180/270/360 | as C34 | 900 points at frame rate |
| C36 | resonance-angle (unwrapped) · `unwrappedPlot` | line · angle, libration band, turning points | every frame, ≤ 900 points | shaded ±amplitude band | none | dashed center; turning-point dots | as C34 | the band |
| C37 | resonance-conjunctions · `dial` | 2 polar dials · events, mean vector | every frame | none | none | mean arrow, colored by R · dial captions | as C34 | **polar**: needs a polar mode, or it stays |
| C38 | stellar-lab HR diagram · `stellarWidgets.js` `drawDiagram` | HR diagram · every track, active track, ≤ 4 pinned, selection, nearby models, picked star | static, live selection | **click and drag pick**, the only widget with one | none | **log x reversed, log y** | regions; constant-radius guides; crosshair | `tests/stellarLab.test.js`, `stellarLoops.test.js`; `e2e/stellarLesson.spec.js`, `livesOfStars`, `stellarSharedSelection`, `stellarLayout` | the pick, and its arrow keys stepping temperature and luminosity, focusable with `role=application`; reversed log axes |
| C39 | stellar-population (upper) · `STELLAR_POPULATION.draw` | HR scatter · 400 stars, bright subset, focus ring | static, live | none | **log, reversed** | decade ticks | `stellarLab.test.js`, `stellarPopulationSample.test.js` | 400 points; the focus ring |
| C40 | stellar-population (lower) · same | grouped bars by spectral type · all, bright | static | none | none | count labels | as C39 | as drawn |
| C41 | stellar-evolution HR · `stellarEvolutionWidgets.js` `drawDiagram` | evolving track · whole, ghost dashed, trace (≤ 160), current star | **every frame** while playing; reduced motion stops autoplay | none | **log, reversed** | regions; ticks | `tests/stellarEvolution.test.js`; `e2e/livesOfStars.spec.js`, `livesScene`, `predictionLoops` | the reduced-motion rule |
| C42 | stellar-evolution timeline · `drawTimeline` | 1-D strip · phase marks, playhead | every frame | none | none | phase ticks | as C41 | the playhead |
| C43 | spectra-compare · `stellarSpectraWidgets.js` `SPECTRA_COMPARE.draw` | spectra · 4 SDSS spectra | static | none | none | shaded feature bands with names · **canvas legend** | `tests/stellarSpectra.test.js`; `e2e/stellarSpectra.spec.js` (reads `aria-label`) | the bands; the legend |
| C44 | spectra-identify · `SPECTRA_IDENTIFY.draw` | spectrum · 1 | static | none | none | feature bands · legend | as C43 | as C43 |
| C45 | tide-strength · `tidalWidgets.js` `STRENGTH.draw` | curve plus marker · 240 samples | static | none | none | grid; drop lines; off-scale text | `tests/tidalWidgets.test.js`; `e2e/accessibility.spec.js` (tides) | as drawn |
| C46 | tide-compare · `COMPARE.draw` | horizontal bars · 7 | static | none | **log** (decade gridlines) | highlight | `tidalWidgets.test.js` | log bars |
| C47 | tide-balance · `BALANCE.draw` | 2 bars plus a 1-D ruler | static | none | none | verdict; "equal here" | `tidalWidgets.test.js` | as drawn |
| C48 | depth-size (right half) · `transitWidgets.js` `DEPTH_SIZE.draw` | light curve · 161 points | static | none | none | depth text; "fixed 3% scale" | `tests/transitWidgets.test.js`, `lazyWidgets.test.js` | the fixed scale |
| C49 | geometry (right half) · `GEOMETRY.draw` | light curve against phase · 201 points | static | none | none | "no transit" label | as C48 | as drawn |
| C50 | spectrum · `SPECTRUM.draw` | transmission spectrum · 721 points, flat level | static | none | none | slider cursor; λ label | as C48; `tests/observatory.test.js` | the cursor |
| C51 | dilution (right half) · `DILUTION.draw` | 2 light curves · true dashed, observed | static | none | none | measured-to-true text · text legend | as C48 | dashed against solid |
| C52 | gw-lab strain · `gwWidgets.js` `drawStrainFull` | min-max envelope · signal, noise, pinned, playhead | **every frame**; one bucket per pixel; 4096 Hz, ≤ 8 s | none | none | zero line; ±peak ticks; merger label | `tests/gwLab.test.js`, `gwAudio`, `gwTimeline`, `gwWaveform`, `gwTransport` tests; `e2e/gwAudio.spec.js`, `gwTransport`, `gwAdvancedSync`, `gwSources`, `gwLesson`, `gwBeginnerLesson` | **the Listen hook**: playhead and audio in sync to 0.07 s; envelope per pixel; the reduced-motion rule |
| C53 | gw-lab zoom · `drawStrainLocal` | line · signal, observed | every frame | none | none | playhead; span in ms | as C52 | as C52 |
| C54 | gw-lab frequency · `drawFrequency` | line · f(t) | every frame | none | **log y** | dashed ISCO line | as C52 | as C52, plus log y |
| C55 | gw-real · `GW_REAL.draw` | stacked strips · H1 and L1, or observed, reconstruction and residual | static | none | none | strip labels · labels | `gwLab.test.js` | the shared scale |
| C56 | gw-events · `gwEventWidgets.js` `drawMap` | **spectrogram** raster (Q-scan, 48 rows) · map, slices, model chirp | static | none (intervals in the readout) | **log y** | end line; slice rings | `tests/gwoscEvents.test.js`; `e2e/gwoscEvents.spec.js` (reads `aria-label`) | **raster**: needs the canvas layer |

### D. The tool pages

No tool page uses Chart.js. None has sonification, zoom, a legend toggle, or
image export.

| # | Chart | Kind | Type · series | Live | Sel | Err | Log | Ann. | Leg. | Exp. | Keys | Text | Tests | Parity means |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Observatory plot: `createPlot` (js/observatory/plot.js then, `js/plot/plot.js` now), from `observatoryPage.js`; `#obsPlot` | SVG | scatter (magnitude axis flipped) · kept, masked (hollow gray), selected, focus; model overlays (`measurePanel.js` `publishOverlays`) | static. Min-max decimation at 2 points per pixel column; error bars when ≤ 2000 points are drawn | **drag selects an x range, click picks**; shared with the table and the image | σ or interval | reversed y | overlays | none; overlay names in `#obsOverlayNote` | JSON and CSV (data) | **arrows, PgUp and PgDn ±50, Home, End, Space and Enter toggle, Shift extends, Esc clears** | `role=group`, `aria-roledescription=plot`, label "{y} against {x}, {n} points"; focused point announced (120 ms throttle); linked ARIA grid `#obsTable` | `e2e/observatory.spec.js:100-137, 346-369`, `archive.spec.js:209-220`, `populationsGuides.spec.js:161`; `tests/observatory.test.js` (selection). **No unit test of plot.js; the plot's keys are not tested here** | everything, since this is the base. Golden tick tables for `ticks`, `decimate` and `decimateGrid` come first |
| D2 | Fit residuals: `observatory/fitPanel.js` (createPlot) | SVG | residual scatter · 1 | once per fit | handlers on an unused selection | none passed | none | none | none | fit JSON (no residuals) | none | `role=img`, label with n | `e2e/inference.spec.js:76-95` (text). **SVG not asserted** | a static mode with no dead handlers |
| D3 | Periodogram: `measurePanel.js` `periodogram` (createPlot) | SVG | dots, power against period · 1 | on demand | as D2 | none | none | none (best period only in the label) | none | CSV; notebook figure | none | `role=img`, label with the best period | `e2e/measure.spec.js:376-382` | the label; optionally a line mode |
| D4 | Archive preview: `archivePanel.js` `convert` (createPlot) | SVG | magnitude against time · 1 | on a band change | as D2 | if the Gaia `mag-error` column is linked | reversed y | none | none | none (opens D1) | none | `role=img`, label | `e2e/archive.spec.js:195-220`. **SVG not asserted** | error bars when linked |
| D5 | Experiment runner: `experimentsPage.js` `drawPlot`; `#xpPlot` | SVG | scatter plus mean line · trials, means, failures as "×" | when a run finishes | none | none | **automatic log y** when the span is over 100× | means; × marks; min and max ticks only | none | JSON and CSV | none | `role=img`, label with counts; summary and trials tables | `e2e/experimentRunner.spec.js:98-100` | the automatic log rule and its label |
| D6 | Analysis trials: `experiments/analysisPanel.js` `trialsView` (createPlot); `#labPlot` | SVG | scatter · 1 | on render and an x change | **brush and keys as D1**, shared with `#labTrials` | none | none | none | none | JSON and CSV | as D1 | `role=application`, live announcements, keyboard help caption | `e2e/analysisLab.spec.js:110-138` (focus, Home, Shift+→, Esc, table sync) | as D1 |
| D7 | Analysis histogram: `analysisPanel.js` `distributionView`; `#labHist` | SVG | histogram · 1 | on render | none | none | none | edge ticks; peak count | none | as D6 | none | `role=img`; `#labHistTable`; quantiles | `e2e/analysisLab.spec.js:216` (table). **SVG not asserted** | bins equal to the table |
| D8 | Transfer window: `missionPage.js` `drawWindow`; `#mn-window-canvas` | cv | **heatmap** of total Δv · default 61 steps | once per run | none | none | none | best cell circled; refused cells gray; **no ticks** | HTML swatches | grid CSV; plan JSON | none | `role=img`, label with ranges and the best Δv; tables | `e2e/mission.spec.js:127-150` | **raster**: needs the canvas layer |
| D9 | Transfer window: `missionLabPage.js` `drawWindow`; `#ml-window-canvas` | cv | heatmap · 151×126 | once per compute | "Use" buttons in the table | none | none | refused gray | HTML legend | none | table buttons | `role=img`; candidates table | `e2e/missionLab.spec.js:153-165` | as D8 |
| D10 | 3-D diagnostics errors: `lab3dPage.js` `errorPlot` ×2 | SVG | line · energy error; angular-momentum error | once per run; ≤ 1500 samples (default 200) | none | none | **log10 y** (two labels) | none | none | none | none | `role=img`, label = caption | `e2e/lab3d.spec.js:56` (counts the SVGs) | log y |
| D11 | 3-D diagnostics paths: `lab3dPage.js` `pathPlot` ×2 | SVG | x-y and x-z projections · one path per body | once per run | none | none | none | none | **none, despite several colors** | none | none | `role=img` | as D10 | equal aspect; one color per body |
| D12 | Validation strip chart: `validationPage.js` `paintChart`; `#valChart` | HTML | dot strip, a lane per kind | on load and after a live run | none (filters change the tables, not the chart) | n/a | **log x**, decades −15 to 0 | `is-tight` at ≥ 0.5 | lane labels | none | none (dots deliberately not focusable) | `role=img`, computed label; `title` per dot; full tables | `e2e/accessibility.spec.js:243-250` (axe); `tests/physicsValidation.test.js` | log x; lane labels |
| D13 | Lab report: `labReport.js` → `pdf.js` `chart` | PDF | scatter plus dashed slope · 1 | static | n/a | none | none | slope line and label | none | the PDF | n/a | untagged PDF | **`pdf.chart()` untested** | not migrated: the component draws to the screen, not into a PDF |
| D14 | Notebook report: `notebook/report.js` → `pdf.js` `figure` | PDF | lines or points · ≤ 6 series × ≤ 400 | static | n/a | per series | `logX` | zero line; dash by kind | drawn | the PDF | n/a | untagged PDF | `tests/notebook.test.js` (model); `e2e/notebook.spec.js:549`. **Drawing untested** | not migrated, as D13. It can read the same series model |

**No charts of their own:** `/figure/` (its preview is the embedded
application, so it inherits A and B), `/teaching/` (iframes of the embedded
application, created on demand), the instructor portal, evaluation, Studio,
Composer, the course pages, the catalog, submission review, and `/3d/`. On
`/3d/` the conservation drift is text in `#l3-conserved`; everything else
there is the three.js scene.

## The byte threshold

As the prompt states it:

> the component must not add more than the bytes it removes from any route
> it enters.

Made concrete:

1. **Where it is judged:**
   - every route in `tools/route-budgets.json`;
   - in both configurations: `sources`, which is the published site, and
     `build`;
   - at both measured points: usable, and the instrument step where a route
     has one;
   - by `tools/route-budget.mjs`, before (the integration branch at the
     pull request's base) and after (its head).
2. **What it requires:** on every route where any *js/plot/* module, or a
   module it newly brings (such as `js/units/registry.js`), is fetched, the
   route's JavaScript bytes must not grow. Requests must stay under the
   route's request ceiling, which is a separate limit and is never raised
   here.
3. **Lessons outside the budget file:** the rule applies to them too,
   measured with `node tools/route-budget.mjs --lessons` before and after.
4. **The deferred budget:** the bundle budget's deferred ceiling (4180 KB) and
   initial ceiling (830 KB) hold, counting the pull requests queued ahead.
   None is raised.
5. **What is recorded but not gated:** a chart that loads later, such as a
   panel on first open, has an "open cost" the route budgets do not measure.
   It is recorded per migrated chart. For the Chart.js charts it has to fall:
   today it includes Chart.js.

### What each route loads today, and the most the component may add

"Chart code" is every chart-owning module the route fetches. Many of those
modules also hold physics, readouts and controls. The "drawing" figure is
the part a migration can remove, estimated from the drawing functions'
lines (the build figure scales each module's minified size by that share).
That drawing figure is the most the component may add to the route.

| Route | Sources (published): JS / ceiling (requests) | Build: JS / ceiling (requests) | Chart code fetched (sources KB raw / build KB min) | Drawing code: the most the component may add (sources / build) |
|---|---|---|---|---|
| front door, sandbox | 2075.6 / 2103.3 KB (99/102) | 588.8 / 628.4 KB (54/55) | radialVelocity 58.9/15.3, lightCurve 35.3/8.9, rotationCurve 29.0/9.8, astrometry 22.2/5.6, energyChartNew 8.9/3.7, canvasSummary 8.3/2.2, widgetCanvas 6.2/1.0, observationChart 3.8/0.6, chartjs 1.9/0.3: **174.5 / 47.4** | about **31.4 / 9.5**: RV chart and error-bar plugin 4.1, light-curve chart 4.3, rotation `draw` 6.1, astrometry `drawSkyPlot` 2.3, the energy chart module 8.9, observationChart 3.8, chartjs 1.9 |
| kepler | 3264.6 / 3292 KB (138/140) | 1284.5 / 1341 KB (69/69) | as the front door | as the front door |
| transit, usable | 3276.0 / 3303.4 KB (138/140) | 1297.7 / 1354.2 KB (69/69) | as the front door | as the front door |
| **transit, instrument step** | 3484.1 / 3512.6 KB (140/142) | 1490.3 / 1554.4 KB (73/73) | front door, plus **Chart.js 168.3/168.1** (1 request), transitWidgets 39.8/20.9 | **about 199.7 / 177.6** (the front door's and Chart.js), plus the transit widgets' drawing, at most 39.8 / 20.9 |
| power-law, usable | 3242.7 / 3269.9 KB (138/140) | 1269.9 / 1326 KB (69/69) | as the front door | as the front door |
| power-law, instrument step | 3295.9 / 3323.4 KB (141/143) | 1286.9 / 1344.1 KB (72/72) | front door, plus powerLawWidgets 13.1/5.4 | the front door's, plus at most 13.1 / 5.4 (the whole module) |
| largest lesson | 3373.7 / 3401.5 KB (140/142) | 1331.5 / 1389 KB (71/71) | front door, plus stellarWidgets 70.3/22.6 | the front door's, plus the HR drawing in stellarWidgets (to be measured; at most 70.3 / 22.6) |
| figure | 2322.3 / 2353 KB (115/117) | 720.7 / 761.6 KB (57/58) | as the front door (the preview is the application) | as the front door |
| observatory | 171.2 / 175.3 KB (16/17) | 84.2 / 86.3 KB (2/3) | plot.js 16.4/6.7, table.js 7.5/3.4, selection.js 3.1/0.8: **27.0 / 10.9**, 3 requests | **27.0 / 10.9** (all three modules), 3 requests |
| experiments | 1108.1 / 1109 KB (47/**47**) | 313.0 / 325.2 KB (3/3) | experimentsPage `drawPlot` (inside the page module; the analysis panel is lazy) | **3.3** raw; **no request to spare** |
| mission | 74.5 / 74.6 KB (7/8) | 49.3 / 49.4 KB (1/2) | missionPage `drawWindow` | 2.3 raw |
| mission lab | 430.6 / 431.6 KB (35/36) | 253.7 / 256.4 KB (2/3) | missionLabPage `drawWindow`, `drawViews` | 5.0 raw |
| lab3d | 85.0 / 85.1 KB (10/11) | 36.9 / 37.0 KB (1/2) | lab3dPage `errorPlot`, `pathPlot` | 2.8 raw |
| teaching, evaluation, instructors, catalog, studio, composer, course builder, course home, 3-D lab, 3-D guide | (each within its ceiling) | | none | **0**: the component may not enter |

The validation page (D12) has no route ceiling. On it the rule is judged
from the same before-and-after measurement.

**Consequences:**

- **On every route, eager loading fails.** On the front door it would add the
  whole component (about 41 KB raw) in place of about 31 KB of drawing code.
  - The component has to load on first draw, as `ensureChartJs()` does.
    Then it adds nothing at usable, and what the route sheds is the drawing
    code itself, less the per-chart descriptions that replace it.
  - The same holds on the tool pages: the experiment runner (no request to
    spare), the mission pages and `/lab3d/` (0.1 KB of room each). There the
    charts are drawn after a run, so a first-draw import leaves them clear.
- **The transit lesson's instrument step gains the most.** Chart.js arrives
  there, so migrating the light curve takes 168 KB off it.
- **The Observatory is the hard case.** Its plot is on the route at load, and
  the component has to fit in what it replaces: 27.0 KB raw and 10.9 KB
  minified, in at most 4 requests (3 freed plus 1 spare).
  - That is met only if the Observatory loads none of the features it does
    not use (log axes, legend, bars, annotations, the canvas layer, the
    sonification hook), and only if *js/plot/* is written no larger in raw
    bytes than `observatory/plot.js` is.
  - The published tree counts comments, and plot.js runs about 2.5 raw bytes
    to each minified one.
- **Power-law widgets cannot migrate alone.** The component's floor (below)
  is larger than the whole power-law family module (13.1 KB raw).

### The component's size, estimated from the feature list

Measured where the code exists (`observatory/*`), estimated elsewhere.
Minified sizes from the build. Raw sizes at the Observatory's own ratio of
about 2.4.

| Part | Basis | KB minified | KB raw |
|---|---|---|---|
| Scales, linear ticks, axes and frame; scatter and line marks with min-max decimation; σ and interval error bars | `observatory/plot.js`, measured | 6.8 | 16.8 |
| Brushing, click picking, keyboard selection, announcements | `observatory/selection.js`, measured, plus its part of plot.js | 0.8 + (in plot.js) | 3.2 + (in plot.js) |
| Data table (ARIA grid, paging), behind a disclosure | `observatory/table.js`, measured | 3.5 | 7.7 |
| **What exists** | | **11.2** | **27.0** |
| Log axes and log ticks | estimate | 0.6 | 1.5 |
| Bars, histogram and step marks; a line mode | estimate | 1.0 | 2.5 |
| Legend that is the series toggle | estimate | 0.8 | 2.0 |
| Annotations: reference lines, bands, labels | estimate | 0.8 | 2.0 |
| Color tokens, color-blind-safe palette, pattern fallback | estimate | 0.8 | 2.0 |
| Text summary for the live region; reduced motion | estimate | 0.6 | 1.5 |
| Envelope and unit-id adapter; sonification hook | estimate | 0.6 | 1.5 |
| PNG export (A1's parity) | estimate | 0.6 | 1.5 |
| **New** | | **5.8** | **14.5** |
| **Component** | | **about 17** | **about 41.5** |
| Canvas layer (series above the threshold; heatmap rasters) | estimate; loaded only by the charts that need it | 1.5-2.5 | 4-6 |
| `js/units/registry.js`, where a route does not load it yet | measured | 4.5-5.1 | 11.3 |
| Strings, English and Spanish | estimate, in a catalog of its own (as `js/seriesTable.js` does) | about 1.5 a locale | |

- **The floor:** what every migrated chart pays if the features are separate
  modules. That is scales, axes, marks, log ticks, legend, palette and
  summary, about 8 KB minified and 20 KB raw, in one or two requests. The
  data table can load when its disclosure opens.
- **The canvas threshold, measured:**
  - One series was redrawn every frame, as an SVG path and on a 2-D canvas,
    in headless Chromium at a 6× CPU slowdown. The SVG path held a 60 Hz
    frame (median 16.7 ms) up to 5000 points. It took 21.2 ms at 10,000 and
    39.3 ms at 20,000. The canvas held 16.7 ms throughout.
  - The largest live series today is the light curve's 2000 points, and
    decimation caps a 640-pixel plot at 1280.
  - So the canvas layer is set at more than 5000 drawn points per series.
    No current line chart crosses that. It is needed only for the rasters:
    the transfer windows (up to 19,026 cells) and the Q-scan.

### The deferred budget

| | KB |
|---|---|
| Deferred JavaScript on `v2` at 4c4ea5a | 4170.7 of 4180 |
| After the two queued pull requests (reported) | about 4178.4, leaving about 1.6 |
| Chart.js chunk (`vendor/chartjs/chart.js`, 172,191 bytes) | 168.2, 4.0% of the total |
| Chart.js charts' own code in the deferred graph (`experiments/panel.js` `renderChart` and `renderSweepChart`, 4.9 KB raw) | about 1.8 |
| Component, units registry and its strings, if they enter the application's graph | about +17 to +27 |

The light curve's, the radial velocity's and the energy chart's code is in
the start-up download, not the deferred one. Removing it lowers the initial
download, which is at 779.6 of 830 KB.

- **Any application adoption that keeps Chart.js** adds at least 17 KB
  against 1.6 KB of room. That is a no-go without a ceiling raise, which this
  prompt may not make.
- **Migrating all five Chart.js charts in one pull request** that deletes the
  vendored chunk comes to −168.2 − 1.8 + 17 to 27, which is **about −143 to
  −153 KB deferred**. That leaves room for every later family.
- **The tool pages are separate builds,** outside the deferred total. Adopting
  there costs nothing in this budget, only on their routes.

## Go or no-go

**Go, staged (B).** Each step is judged by the rule and the threshold above:

1. **The component, from `observatory/plot.js`, `selection.js` and
   `table.js`, moved to *js/plot/* and generalized.**
   - Feature modules so a route pays only for what its charts use.
   - Raw size held to plot.js's density.
   - Tested by golden tick and label tables (`ticks`, `decimate` and
     `decimateGrid` have no unit test today), keyboard selection, axe, and
     table parity.
   - **Adopt D1-D4 in the same pull request.** They already call
     `createPlot`, so the Observatory route stays byte-neutral, and nothing
     enters the application's deferred graph.
2. **The analysis lab and the experiment runner: D6, D7, then D5,** with
   log y and bars.
   - The analysis panel is already lazy.
   - D5 must load the component when a run finishes, since the route has no
     request to spare.
3. **The tool-page one-offs: D10-D12.**
   - `/lab3d/` imports at the end of a run.
   - D11 adds the legend it lacks.
   - D8 and D9 migrate only once the canvas layer exists. Otherwise they stay
     canvas, with that reason recorded.
4. **The application's five Chart.js charts, A1-A5, in one pull request,
   and the dependency removed.**
   - Vendored chunk, `ensureChartJs`, the vendor entry and package
     dependency, NOTICE and LICENSES.md, regenerated by their generators.
   - `tests/vendoredChart.test.js` is replaced by its documented equivalent:
     no module imports a chart library, and every chart names only types the
     component draws. It is not simply deleted.
   - This is the step the deferred budget forces to be indivisible.
   - Its package change is Carl's to approve.
5. **The application's hand-drawn panels: B1-B8.** Each one only removes
   code once the component is in the graph.
   - B4 needs an equal-aspect mode.
   - B5 must keep frame-rate updates.
   - `tests/accessibilityParity.test.js` reads B5's source, so it needs an
     equivalent.
6. **The lesson widgets, one family at a time,** each judged on its lessons
   with `--lessons`.
   - Families on a route that already loads the component go first. The
     transit family is the first case, once the light curve has migrated.
   - The others migrate only where the family's drawing code is larger than
     the floor.
   - **Expected to stay:** the power-law family (smaller than the floor),
     C37 (polar, unless a polar mode is added), and C56 (raster, unless the
     canvas layer is loaded there).

**What stays, and why:**

- **D13 and D14:** PDF output is not the screen component. Both can read its
  series model.
- **The heatmaps,** until the canvas layer.
- **The diagrams below.**

If the step-4 pull request cannot make every Chart.js chart pass its row,
the gate is **C** for the application. Chart.js stays for the existing
panels, the component ships for the pages and for new work, and no
application chart migrates. The prompt allows exactly this.

This verdict is Carl's to ratify. Prompt 64's internal gate is not in
[DECISION_REGISTER.md](DECISION_REGISTER.md) until he does.

## Diagrams and surfaces out of scope

Drawn from data, but with no data axes. The component is for plots:

- **Binary:** the orbit sketch (trail of 260 points), binary-compare, the
  balance see-saw.
- **Black hole:** bh-horizon, bh-lineup (to-scale pictures with scale bars).
- **Dark matter:** dm-flyby (an animated trajectory), the left insets of
  dm-shapes and dm-virial.
- **Energy:** the launch trajectory (upper panel), shapes (conic
  trajectories).
- **Exoplanet:** reflex-motion, astrometry-signature, the left halves of
  rv-observer and rv-inclination, planet-characterization (text on a
  canvas).
- **Gravitational waves:** gw-lab's source view with its wavefronts, and its
  ring of test masses.
- **Habitability:** hz-spreading, the hz-orbit upper panel, hz-candidates.
- **Power law and resonance:** power-law-precession, resonance-frame (a
  rotating-frame trace with L4 and L5 marks).
- **Stellar:** the stellar-lab star preview, stellar-compare, the
  stellar-evolution stage picture.
- **Tides:** tide-vectors, roche-model, tide-disrupt.
- **Transit:** the left halves of depth-size, geometry and dilution, and
  resolve (a speckle image).
- **Mission lab:** the trajectory views.
- **Scene and images:** the lesson ellipse canvas, the system builder's
  preview, the Observatory's image view (`observatory/image.js`), the
  sandbox instruments and the CR3BP overlay (on the simulation canvas), the
  observer indicator, and every scene renderer.

## How these numbers were measured

- **Bundle totals:**
  - `node build.js` reports the deferred total (4170.7 KB) and the initial
    download (779.6 KB). `node tools/bundle-budget.mjs --check` judges them.
  - Per-module bytes come from esbuild metafiles of the same builds, made
    with `build.js`'s own options and chunk names. Their outputs match
    `dist/` byte for byte: the same chunk names, and the same 580.5 KB
    start-up and 4170.7 KB deferred totals.
- **Routes:**
  - Measured with `tools/route-budget.mjs`'s own measurement: a fresh
    Chromium context, service worker blocked, every `.js` response counted.
  - It was replayed on ports 4600 and up so it could record each URL. The
    totals equal the tool's.
  - Chart code was attributed to routes by matching those URLs to the
    metafiles.
  - Drawing-code shares are byte counts of the drawing functions' lines.
- **Live rates:**
  - The sources were served locally and opened at 1440×900 with the quality
    tier pinned to full. Each scenario was opened with seed `e2e`, as the e2e
    fixture does: Transit Lab, Exoplanet Characterization Lab, Milky Way
    Rotation, Binary Pair.
  - Each panel's canvas `clearRect` calls were counted over 6 s after 3 s of
    warm-up. The light curve, radial velocity and energy chart were read
    through `Chart.getChart`.
  - Headless Chromium ran 17-31 animation frames a second on this machine.
    Rates that follow the frame are therefore below what a 60 Hz display
    gives, and the code ceilings are stated beside them.
- **Canvas threshold:** one N-point series in a 640×300 plot was redrawn 90
  times per case. The time from the update to the next animation frame was
  taken at a 6× CPU slowdown through the DevTools protocol, and the median
  is reported.

## Build-out log

The gate is D-PLOT-01 in [DECISION_REGISTER.md](DECISION_REGISTER.md): B,
staged. Steps 1-3 proceed; step 4 changes package files and waits for Carl.
Route deltas are against the step's base, measured as "How these numbers were
measured" says, in bytes and requests; the deferred figure is the bundle
budget's.

| Step | Charts | Commit | Route deltas (sources / build) | Deferred delta | Verdict per chart |
|---|---|---|---|---|---|
| 1 | D1-D4 | on `feat/plot-component` | Observatory −411 B, 16 → 16 requests / −764 B, 2 → 2. Every other route unchanged | 0 (4170.7 KB); the experiment runner's analysis chunk −754 B, outside that budget | D1-D4 migrated: see below |
| 2 | D5-D7 | on `feat/plot-component` | Experiment runner −2742 B, 47 → 47 requests / −1540 B, 3 → 3. Observatory +319 B / +144 B against step 1, still −92 B / −620 B against the base. Every other route unchanged | 0 (4170.7 KB) | D5-D7 migrated: see below |
| 3 | D8-D12 | | | | |
| 4 | A1-A5, Chart.js removed | | | | |
| 5 | B1-B8 | | | | |
| 6 | C1-C56, by family | | | | |

### Step 1: the component, and D1-D4

**What *js/plot/* is now.** Three feature modules, each loaded only by a
chart that uses it:

- **`js/plot/plot.js`, the core.** Scales, ticks, axes and their titles
  (from the column's unit id, through `js/observatory/units.js`). Points with
  min-max or grid decimation, masked points, σ and interval bars, overlays,
  and the selection and focus layers when a selection is given.
  - Without a selection the plot only shows its data: no layers, no
    listeners, nothing to focus. That is D2-D4's mode. Before this step they
    attached handlers to a selection nobody read.
- **`js/plot/select.js`.** The shared selection, and `interact()`: drag,
  click and keyboard selection on a plot. D1 and D6 use it.
- **`js/plot/table.js`.** The rows as an ARIA grid. Its page caption is now
  the caller's (`range`), rather than a hard-coded Observatory string id that
  the analysis lab had to rewrite.

**Why there is no other feature yet.** Legend, log axes, live summary, reduced
motion, palette and pattern fallback, and the sonification hook are added only
when a chart that needs one migrates, so that no route pays for unused code.
None of D1-D4 needs any of them:

- D1-D4 draw no legend: overlay names are text in `#obsOverlayNote`.
- They draw no log axis.
- Their accessible text is already a label, D1's focused-point announcement
  and the linked table.
- They animate nothing.
- Their colors are css/page.css's tokens.

**The data contract.**

- The input is the observation's table of columns with unit ids, read with
  `js/observatory/schema.js`'s three small readers. The analysis lab already
  builds that shape for its trials.
- Bringing the application's charts in (step 4) also brings those two
  observatory modules into the application's graph. Their cost is part of
  that step's estimate.

**Tests.**

- `tests/plot.test.js`:
  - the golden tables: ticks for eleven ranges and two counts; decimation and
    grid decimation; the tick labels and titles for five data sets;
  - the magnitude axis reversed;
  - the static mode;
  - keyboard and pointer selection;
  - table parity: every table row's numbers, read back, are where its point
    is drawn, to 0.06 px.
- The markup the plot and table draw for seven data sets was compared before
  and after the move, and is the same apart from one attribute's order on
  the focus ring.
- Characterization tests where the parity table found the chart itself
  untested:
  - D1's keys in `e2e/observatory.spec.js`;
  - D2's residuals in `e2e/inference.spec.js`;
  - D3's points in `e2e/measure.spec.js`;
  - D4's points and bars in `e2e/archive.spec.js`.
- axe already ran on every host (`#obsPlot`, the fit panel, the periodogram,
  the archive review). Those runs pass unchanged.

**Verdicts.**

| Chart | Verdict |
|---|---|
| D1 Observatory plot | **Migrated.** Same markup; its e2e tests pass unchanged, and its keyboard is now tested |
| D2 Fit residuals | **Migrated**, static: the dead handlers are gone |
| D3 Periodogram | **Migrated**, static |
| D4 Archive preview | **Migrated**, static; 47 points and 47 bars asserted |

The WebKit run of `e2e/observatory.spec.js`'s offline test fails on this
machine, and fails the same way at this step's base (e48d59a, run separately):
WebKit cannot navigate offline here. Chromium passes it, and so does every
other test of these four charts in all three engines.

### Step 2: the analysis lab and the experiment runner, D5-D7

**Two features, each where a chart needs it.**

- **`js/plot/log.js`, a log y axis.** `wantsLog()` is D5's rule: more than one
  value, all positive, across more than two orders of magnitude. The axis's
  ticks are powers of ten, or 1, 2 and 5 times them, at most six.
  - The core takes it as `draw(o, { yScale })`, and only D5 loads it.
- **`js/plot/bars.js`, a histogram.** It is drawn on the core's axes, now
  exported as `scales()` and `axes()`. The counts axis marks whole numbers
  and always the highest count. Only D7 loads it.
- **Two changes to the core:**
  - `xAlso`, so an axis spans rows a chart marks itself: D5's crosses for
    trials without a measurement.
  - The focus ring is now drawn inside the selection layer instead of after
    it. It looks the same, and the code is shorter.
  - These, with the y-scale hook, put 319 B on the Observatory route. Step 1
    had freed 411 B there.

**D5 loads when a run finishes.**

- `js/experiments/resultPlot.js` is imported by the page with its first
  result. It brings the component, the log axis and the column readers.
- The route at load loses the page's own 3.3 KB plot and gains a five-line
  import. Its request count does not move, and it had none to spare.
- What the first result fetches is recorded here, not gated: 47,061 B in 6
  requests from the sources, and 12,534 B in 2 from the build.
  - Most of the sources' figure is `js/observatory/schema.js` and the units
    registry, both of which the component reads.
- Everything the module needs from the page arrives as an argument, so the
  build splits no start-up chunk.

**Tests.**

- `tests/plot.test.js` adds:
  - the log rule and the log ticks;
  - a log plot's tick labels and point positions, with `xAlso`;
  - the histogram's ticks, titles and bar heights against its counts.
- `e2e/experimentRunner.spec.js` adds D5's 16 points, its mean line, no
  crosses, and ticks in powers of ten.
- `e2e/analysisLab.spec.js` checks that D7's bars are its table: one bar per
  row, each in proportion to its count. The parity table found that chart
  untested.
- The two specs' existing assertions pass unchanged, and so does
  `e2e/accessibility.spec.js`, which runs axe on the runner.

**Verdicts.**

| Chart | Verdict |
|---|---|
| D5 Experiment runner | **Migrated**, by the documented equivalents below. The log rule and its "(log scale)" label, the means as a line, a cross for each trial without a measurement, and the label with its counts are all unchanged |
| D6 Analysis trials | **Migrated** in step 1, by its imports; its keyboard test passes unchanged |
| D7 Analysis histogram | **Migrated**, by the documented equivalent below; the bars equal the table |

**Documented equivalents:**

- **D5's ticks.** The only ticks were the two ends of each axis. They are now
  round ticks on both axes, and on a log axis the powers of ten.
- **D5's value axis** now has a title: the metric and its unit.
- **D5's mean line** is the component's overlay color, not amber.
- **D7's ticks.** They were the first and last bin edges and the peak count.
  They are now round ticks across the edges, and whole counts up to the peak,
  which is always marked. Every edge and count is in `#labHistTable`, as
  before.
- **D7's height.** The histogram is drawn in the component's 720 × 380 frame
  instead of 640 × 220.

