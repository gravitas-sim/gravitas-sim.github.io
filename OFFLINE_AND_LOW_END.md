# Offline, and slow machines

Two features for the same room: a classroom whose wifi drops in the middle of a
lesson, on hardware the school bought in 2019.

---

## The service worker

`sw.js` at the repository root, with its precache list and cache name generated
into `sw-manifest.js` by `tools/build-service-worker.mjs`.

### Why the source tree and not `dist/`

Gravitas publishes the committed repository tree, not `dist/`. The deploy job
(RELEASE.md) exports the commit, stamps its pages, regenerates this manifest
over the stamped bytes, and drops what the site does not serve (`spike/`,
`tests/`, `e2e/` and `tools/`; `tools/prepare-pages.mjs`). `dist/` is
gitignored and never published. GitHub Pages serves the unbundled sources,
which is why the live site answers for `/js/physics.js`. So the precache list
is the source tree, and the paths in it are the paths the browser actually
requests.

`sw.js` and `sw-manifest.js` are deliberately **not** copied into `dist/`. The
precache list is source paths, and in a bundle those paths do not exist — a
worker installed there would 404 on almost every entry. `dist/` is a bundle
preview rather than what is published, and a page served from it fails
registration, logs a warning and carries on without offline support.

### The version

A SHA-256 over the contents of every precached file, truncated to twelve hex
digits, producing a cache named `gravitas-<hash>`. Two properties follow, and
both are wanted:

- A rebuild that changed nothing produces the same name, so a returning browser
  keeps a cache that is still correct.
- Changing one byte of one module produces a new name, so `activate` deletes
  the old cache and nothing stale can survive.

`npm run sw:check` fails if the checked-in manifest is not what the generator
would write today, and CI runs it. A stale manifest is the worst kind of stale:
the cache name never changes, a returning browser keeps serving last week's
JavaScript out of its own cache, and no error appears anywhere.

### What is precached

Measured from the committed `sw-manifest.js` and the files it lists, by
`tools/precache-inventory.mjs`; gzip at level 6, as a typical server sends it.

<!--fact-block:precache-->
| | Files | Raw |
| --- | ---: | ---: |
| JavaScript | 892 | 14.7 MB |
| Images | 62 | 680 KB |
| Stylesheets | 10 | 490 KB |
| Fonts | 9 | 140 KB |
| Panel markup | 10 | 60 KB |
| Pages | 9 | 280 KB |
| Other | 16 | 640 KB |
| **Total** | **1008** | **16.9 MB** |

Of those, 830 are core (the install fails without them) and 178 optional (a missing one is reported and costs nothing).

Gzipped, as Pages serves it, the whole is about 6 MB.

| Link | Precache transfer |
| --- | --- |
| 10 Mbps | ~5 s |
| 3 Mbps | ~17 s |
| 1.5 Mbps | ~34 s |
<!--/fact-block-->
Pages serves gzip, so the real transfer is more than <!--fact:precacheGzipMB-->6<!--/fact--> MB. The images barely
compress, being WebP already.

The transfer times are computed from that payload rather than measured: CDP
network emulation applies to page requests and not to a service worker's own
fetches, so a measured figure here would have been throttling nothing.

It runs in the background after the first frame, so this is time before the
class is *protected*, not time before the application is usable.

**Out**: the user manual PDF and the notebooks (downloads, not the shell); the
document pages other than the application itself, the Observatory, the
catalog, the course home and the two labs (`model/`, `instructors/`,
`validation/` and the rest are runtime-cached); the physics validation suite
the `/validation/` page runs on demand; and `social-card.png` (only ever
fetched by a link unfurler).

### Which of the <!--fact:investigations-->60<!--/fact--> lessons

Each lesson is one dynamically imported file, so this is a real decision.

**All <!--fact:investigations-->60<!--/fact--> English bodies are precached**, about a tenth of the
payload. The reasoning: the lesson a class is already in when the wifi dies is
by definition already fetched, so precaching buys nothing there. What it buys is
the teacher who *switches lesson after the drop*, which is exactly the moment a
runtime cache has nothing. A tenth of the payload to remove that cliff is worth
it, and picking a favorite subset would be guessing which lesson a class is
about to want.

**The <!--fact:spanishShadows-->60<!--/fact--> Spanish shadows are not**: they are only ever fetched
when the interface is in Spanish. They are runtime-cached on first use, and
`js/offline.js` asks the worker to warm all of them the moment the language is
switched. A Spanish classroom is therefore covered from when it chooses
Spanish, not from when it opens a lesson.

### Strategies

| Request | Strategy | Why |
| --- | --- | --- |
| Navigation | Network first, cached shell as fallback | A reload on a working network must get the current build; on a dead one it must still get the application |
| Precached asset | Cache first | Versioned by the cache name, so a hit is known-current |
| Anything else | Stale-while-revalidate | Spanish shadows, document pages, anything added later |

Only same-origin GETs. No opaque responses, no range requests.

The worker does **not** call `skipWaiting()`. Replacing the running code while a
class is mid-lesson is the kind of surprise this feature exists to prevent, so a
new build waits and takes over on the next load.

### One bug worth recording

The first version precached `css/styles.css` while `index.html` asks for
`css/styles.css?v=3`. `cache.match()` is exact, query string included, so every
stylesheet missed — and the application booted offline, ran, opened a lesson and
served thumbnails, entirely **unstyled**. Every assertion an offline test would
naively make still passed. The lookup now falls back to `ignoreSearch`, and
`e2e/offline.spec.js` checks `document.styleSheets.length` for that reason.

---

## The low-end quality tier

`js/quality.js`. Two tiers, `full` and `low`, chosen from the measured frame
rate. The setting `quality_tier` (`auto` / `full` / `low`) overrules it.

### Measured, not sniffed

Nothing reads `navigator.userAgent`, `deviceMemory`, `hardwareConcurrency` or
`userAgentData`, and a test asserts that. The reason is that they do not answer
the question: the same Chromebook runs at 55 fps on an empty Solar System and
under 10 on Galactic Collision, and a fast laptop with a thermal problem and
forty tabs is slower than either.

What is measured is the **interval between animation frames** — what the reader
experiences — rather than the time spent inside the frame callback. On a machine
compositing slowly the work can finish in 8 ms and still be presented at 20 fps;
the interval catches that and the work time does not.

Filtering: the first 1.5 seconds are discarded (start-up is not
representative); intervals over 500 ms are discarded as interruptions rather
than slow frames, since `requestAnimationFrame` stops entirely in a hidden tab
and counting the resumption would demote a machine for being minimized; and the
**median** is used, so one 300 ms hitch cannot outvote a hundred good frames.

Thresholds are far apart — below 32 fps to demote, above 48 fps for eight
sustained seconds to promote — because dropping to the low tier raises the frame
rate, which under a single threshold would immediately qualify the machine to go
back up. The asymmetry is deliberate: slow promotion costs some fidelity, quick
demotion costs a stutter.

Two bugs found while testing this, both silent:

- The warm-up and the window were counted in **frames**. 45 frames is 0.75 s at
  60 fps and 4.5 s at 10 fps, so the slowest machines — the ones the tier exists
  for — waited longest for help. Both are now measured in time.
- Requiring both a full 120-sample window *and* two seconds of it meant a fast
  machine could never satisfy the gate (120 samples at 150 fps span 0.8 s), so
  above about 60 fps **the classifier never ran at all** and the tier simply
  never changed.

### What the low tier does

**Resolution cap, 0.7×** — 49% of the pixels. The simulation canvas has never
applied `devicePixelRatio`, so on the machines this is for it is already at 1:1
and native resolution is the only pixel budget left to give back.

This is the change that required care: the canvas is laid out by CSS at 100%
and its backing store is now smaller, so a pointer event — which arrives in CSS
pixels — is no longer a canvas coordinate. `js/ui.js` converts at that single
boundary (`canvasPoint`, `canvasMovement`), which covers clicks, drags, the
zoom anchor, tool handles and touch. `e2e/offline.spec.js` clicks a body at a
known position at the low tier and asserts the right body is selected; without
the conversion every click lands short and to the left, and nothing throws.

**Population caps** — `num_asteroids` 40, `num_comets` 8, `num_planets` 12,
`num_gas_giants` 4, `num_stars` 40, `num_micro_stars` 60, read when a world is
built.

Read, not written. The first version of this assigned the caps into the live
`SETTINGS` — the same mistake the effects section below was careful to avoid —
on the reasoning that the generator reads those keys in too many places to
thread an override through. It reads them in nineteen. `SETTINGS` is the
reader's document: it is what a share link serializes, what a saved state
restores and what the A/B bench hashes to decide whether two runs differ, so a
teacher on a slow laptop would have exported a capped world to a class on
faster machines. `star_density` and `trail_length` were in this list too and
are not population at all; they are read at draw time. `trail_length` moved to
the effects override below, which is the only place an override actually
reaches it, and the sky moved further still — see **The sky** below.

Only for scenarios that use the generic generator. A scenario with
`placement: 'Empty'` places every body by hand — the resonance systems,
TRAPPIST-1, the galaxy discs, the Solar System — and there the body count *is*
the physics. A Laplace resonance missing one of its three moons is not a cheaper
version of the lesson, it is a wrong one. Measured:

| Scenario | Placement | Full | Low |
| --- | --- | ---: | ---: |
| Solar System | Empty | 35 | 35 |
| TRAPPIST-1 System | Empty | 8 | 8 |
| Galilean Resonance | Empty | 5 | 5 |
| Milky Way Rotation | Empty | 91 | 91 |
| Three-Body Sensitivity Lab | Empty | 3 | 3 |
| Galactic Collision | Multi-Ring | 972 | 98 |
| Kuiper Belt | Multi-Ring | 309 | 49 |
| Kessler Cascade | Random | 301 | 61 |

**Effects off** — object lensing, lensing quality, gravitational-wave overlay,
the accretion disc, plus `trail_length` 8. Each is a full-screen or per-body pass an integrated GPU
pays for in fill rate. Applied as a read-time override, never written into
`SETTINGS`: writing them would destroy the reader's own choice the first time a
machine dipped below the threshold.

**The sky** — the background starfield is generated per square pixel rather
than as a fixed count, at 2600 stars per megapixel at the full tier and 1000 at
the low one (`STARS_PER_MEGAPIXEL` in `js/bodyDrawSky.js`). Because the low tier
also renders into a backing store at 0.7 scale, the two compound: a 1440x900
window gets 3370 stars at the full tier and 635 at the low one. The field is
pre-rendered onto three parallax layers and blitted, so its per-frame cost is
three `drawImage` calls plus at most 48 animated stars — none of which are
animated when the reader has asked for reduced motion.

`star_density` is the reader's own control over that, read as a proportion of
the density above rather than as a literal count: the default 10000 means "what
this window would choose", 5000 halves it, 0 empties the sky. It is deliberately
*not* in the effects override, because the tier already reaches the sky through
`STARS_PER_MEGAPIXEL` and overriding both would multiply the two reductions
together.

### The tier is the reader's, not the scenario's

`quality_tier` lives in `DEFAULT_SETTINGS` so that it round-trips through save
and share with everything else, and `applyPreset` resets `SETTINGS` to those
defaults on every scenario load. That combination silently threw the choice
away: somebody who picked the low tier lost it the moment they opened the next
scenario, and the tier then re-derived itself from a frame rate measured while
a world was being built. `js/scenarios.js` now carries it across the reset
alongside `preset_scenario`.

The same property is why `e2e/fixtures.js` pins the tier to `full` when it
boots the application. On `auto` the tier is a measurement of the machine
running the test: a CI box with six workers demotes, the backing store drops to
0.7 of native, and five embed-mode tests that assert the canvas fills its frame
start reporting on how loaded the runner was — 320 became 224, 960 became 672,
and one run passed at 750×469 while failing at 700×438. The tests that are
about the tier ask for `auto` and take the measurement back.

### What it buys

Measured with CPU throttling on the machine described below, 1366×768, median
of a 12-second window.

| Scenario | Throttle | Full tier | Low tier | Gain |
| --- | --- | --- | --- | --- |
| Solar System | 4× | 15.1 fps | 25.0 fps | 1.7× |
| Solar System | 6× | 10.0 fps | 12.5 fps | 1.3× |
| Galactic Collision | 1× | 7.4 fps | 41.5 fps | 5.6× |
| Galactic Collision | 4× | under 2 fps | 10.7 fps | — |
| Kessler Cascade | 4× | under 2 fps | 20.2 fps | — |
| **Milky Way Rotation** | 4× | 3.9 fps | 4.2 fps | **1.08×** |

The last row is the honest one. Milky Way Rotation is hand-built, so it keeps
all 91 bodies and only the resolution cap and the effects apply — and the tier
barely helps. That is the cost of refusing to cut bodies from a scenario whose
body count is its argument, and it is the right trade, but it means the
dark-matter lesson is the one that will still struggle on a weak machine.

Where the body caps *do* apply the effect is large, because body count rather
than fill rate is what those scenarios are bound by.

---

## What a 2019 Chromebook actually gets

**I did not test one.** There is no Chromebook attached to this machine, and
everything below is either extrapolation or explicitly labeled as measured on
a proxy. Saying so is more useful than a confident number I made up.

Measurements were taken on an **Intel Core i5-10500 @ 3.10 GHz** (6 cores, 12
threads, 24 GB, macOS 26.6.2), in headless Chromium at 1366×768 with the
frame-rate cap lifted, using CDP CPU throttling as the proxy.

A typical 2019 school Chromebook is a Celeron N4000/N4020 (Gemini Lake, two
cores, no SMT) with 4 GB of RAM and Intel UHD 600 graphics — 12 execution units
at roughly 650 MHz — at 1366×768.

### What the proxy does and does not capture

CPU throttling scales **CPU only**. It does not slow the GPU, memory bandwidth,
or storage. The gaps matter in opposite directions:

- The i5-10500's single-thread performance is roughly 3–4× an N4020's, so a 4×
  throttle is a fair proxy for the **CPU** side.
- Its UHD 630 has 24 EUs at 1.15 GHz against the UHD 600's 12 at 650 MHz —
  roughly 3–4× the fill rate, and throttling does not touch that. So a real
  Chromebook is **slower than the proxy on anything fill-rate-bound**, which is
  exactly what the resolution cap addresses. The 0.7× cap should therefore help
  *more* on real hardware than the table above suggests.
- 4 GB of RAM with several tabs open invites swapping and GC pauses the proxy
  never produces.

### The honest estimate

Taking 4× throttling as the CPU proxy and expecting the GPU to be worse:

| | Expectation |
| --- | --- |
| Solar System, low tier | **usable** — 25 fps measured on the proxy; likely high teens to low twenties on real hardware |
| Solar System, full tier | marginal, 15 fps on the proxy |
| Galactic Collision, low tier | **marginal** — 10.7 fps on the proxy; plausibly single digits in the room |
| Galactic Collision, full tier | unusable, under 2 fps |
| Milky Way Rotation | **poor either way**, about 4 fps on the proxy; the tier cannot help a hand-built scenario much |
| A guided lesson on a small scenario | fine — most lessons use a handful of bodies |

So: **the tier turns the heavy scenarios from unusable into marginal, and the
light ones from marginal into comfortable.** It does not turn a 2019 Chromebook
into a fast machine, and Galactic Collision on one is still not a good
experience.

### What would need real hardware to settle

Whether the 32 fps demotion threshold is in the right place for a machine whose
*ceiling* may be near it; whether the 0.7× cap is too soft on a UHD 600, where
0.5× may be the honest setting; and whether 4 GB of RAM makes the precache
itself (about 6 MB gzipped) a problem under memory pressure. All three are answerable in
twenty minutes with the actual device, and none of them are answerable here.

---

## Real hardware: not measured, and how to measure it

**No device measurement exists.** Part 1 of Prompt 112 (one period-appropriate
Chromebook and one mid-range phone, run through the probe, a full
investigation walk, an Observatory session and an experiment) needs a physical
device, so it is skipped under D-PLAN-02 and recorded as D-PERF-01 in
DECISION_REGISTER.md. Every number in this document is a throttled desktop
proxy or a count of bytes. The tables below are for the device and are empty on
purpose.

### What the proxy cannot show

- CPU throttling slows the page's main thread and nothing else. It does not
  reach Workers (the kernel gate measured this: a Worker's compute under a 4x
  throttle was its unthrottled speed, SCIENTIFIC_KERNEL_GATE.md), the
  compositor, the GPU process, memory bandwidth or storage. The compositor
  measurement below shows the same thing from the inside: under a 4x throttle
  the main thread's script time per frame rose 4.6x on the Solar System while
  the GPU process's time per frame rose 1.6x, and only because the low tier
  draws into a smaller backing store.
- The i5-10500's UHD 630 has about three to four times the fill rate of a
  Celeron's UHD 600 (see above), so a fill-rate-bound scene is slower on the
  device than any row here.
- The probe lifts the frame-rate cap and vsync, so it reports throughput, not
  what a display presents. Headless Chromium has no window compositor, no
  thermal limit, no battery governor and no other tabs.
- Memory pressure (a 4 GB device with several tabs open) cannot be produced
  by the proxy.
- One machine, one Chromium version. A figure is the median of nothing: each
  was measured once, on a machine with another heavy job running.

### Protocol (for whoever has the device)

1. Close every other application and tab. Plug in. Record the device, the
   browser and version, the screen size and device pixel ratio, and the
   RAM.
2. Serve the repository (`npm run serve`) or open the published site. For the
   probe on a device that cannot run Node, use remote debugging from a laptop
   and run the probe's page function through the console; the quality tier's
   own decision is `quality.getTier()` after 30 seconds of the first scenario.
3. Frame times: for each probe scenario (binary-pair, solar-system,
   trappist-1-system, star-cluster, gw150914, tidal-disruption-event) record
   the mean interval between animation frames over 12 seconds at the tier the
   device chooses by itself (`auto`) and at `low`.
4. Time to first interaction: from a cold load (cache cleared) to the first
   scenario button responding; then the same with the service worker's cache
   warm and the network off.
5. An investigation walk (Kepler's Laws, every step), an Observatory session
   (open a fixture, run the measure and fit panels) and one experiment
   (Experiments, default trials): record the longest single freeze you can see
   or feel, and the long animation frames the console reports.
6. Memory: the used JavaScript heap (DevTools Memory, after a collection) at
   the start and after the walk.
7. Fill the two tables, put the raw notes beside them, and compare with the
   chromebook-proxy and phone-proxy profiles in tools/perf-thresholds.json.
   Correct the "honest estimate" above wherever a row disagrees.

| Chromebook (to be filled from real hardware) | Mean frame, auto tier | Mean frame, low tier | Tier chosen | Time to first interaction (cold / warm offline) | Used heap (start / after walk) |
|---|---|---|---|---|---|
| binary-pair | | | | | |
| solar-system | | | | | |
| trappist-1-system | | | | | |
| star-cluster | | | | | |
| gw150914 | | | | | |
| tidal-disruption-event | | | | | |
| Kepler's Laws walk, longest freeze | | | | | |
| Observatory session, longest freeze | | | | | |
| Experiment, longest freeze | | | | | |

| Phone (to be filled from real hardware) | Mean frame, auto tier | Mean frame, low tier | Tier chosen | Time to first interaction (cold / warm offline) | Used heap (start / after walk) |
|---|---|---|---|---|---|
| binary-pair | | | | | |
| solar-system | | | | | |
| trappist-1-system | | | | | |
| star-cluster | | | | | |
| gw150914 | | | | | |
| tidal-disruption-event | | | | | |
| Kepler's Laws walk, longest freeze | | | | | |
| Observatory session, longest freeze | | | | | |
| Experiment, longest freeze | | | | | |

---

## Where a frame goes: raster and composite apart from script

`npm run perf -- --trace` (Prompt 112, part 3) records a Chromium trace with
Playwright and the browser's long-animation-frame entries over each sample.
`tools/perf-trace.mjs` reads them: milliseconds per animation frame in the main
thread's script, layout, paint and commit, and in the compositor and Viz
threads, the raster tasks and the GPU process; and how busy each thread was.
The trace bucket rules are unit-tested on synthetic traces
(`tests/perfTrace.test.js`).

Measured on the i5-10500 with GPU rasterisation through ANGLE, 1440x900,
5-second samples (milliseconds per animation frame; busy is the share of the
window):

| Profile and scenario | Frame | Script | Layout + paint + commit | Compositor + Viz | Raster tasks | GPU process | Main busy | GPU busy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop, full: Solar System | 1.58 | 0.83 | 0.34 | 0.82 | 0.00 | 1.53 | 95% | 97% |
| desktop, full: Star Cluster | 19.55 | 11.46 | 2.42 | 1.98 | 0.01 | 8.39 | 99% | 43% |
| desktop, full: GW150914 | 0.64 | 0.32 | 0.20 | 0.63 | 0.00 | 0.61 | 89% | 95% |
| 4x CPU, low: Solar System | 7.56 | 3.83 | 2.44 | 1.59 | 0.01 | 2.44 | 95% | 32% |
| 4x CPU, low: Star Cluster | 15.25 | 9.55 | 3.45 | 1.75 | 0.01 | 2.80 | 97% | 18% |
| phone proxy (375x812, dpr 2, 4x, low): Solar System | 5.29 | 3.30 | 0.81 | 1.22 | 0.00 | 1.94 | 94% | 37% |
| phone proxy: Star Cluster | 10.41 | 8.23 | 1.31 | 1.28 | 0.00 | 1.93 | 97% | 19% |

What it shows:

- **Light scenes are not script-bound on the desktop profile.** On the Solar
  System and GW150914 the main thread and the GPU process are both about 90 to
  97% busy: the loop's rate is the pipeline's, and the 0.6 to 1.6 ms frame
  times in the probe are a presentation throughput number. A saving in the
  scene's JavaScript there would move the figure much less than its share of
  the frame suggests. Star Cluster is script-bound (11.5 of 19.6 ms; the GPU
  is 43% busy).
- **Raster tasks are zero.** Canvas drawing is executed in the GPU process, not
  as compositor tile raster, so the "GPU process" column is where canvas cost
  sits and the raster column measures only DOM and CSS surfaces, which are
  negligible.
- **A throttle that scales only the main thread.** The 4x profile multiplies
  script by 4.6 and layout and paint by about 9 on the Solar System (the low
  tier's smaller canvas is in those rows too), and leaves the compositor and GPU
  nearly where they were. On a real device the second group slows too.
- **Style, layout and paint** are a third of the script cost under the throttle
  (2.4 ms of 7.6 on the Solar System, 1440x900): the readout and panels
  restyle in the animation loop. Not acted on here; it is where the next
  measured saving on this profile would come from.

What it can and cannot show. It can say which thread a frame is waiting for,
whether a change moved script, layout or GPU time, and whether a long
animation frame was script or render (the long-animation-frame entries carry
each script's duration and the frame's render start). It cannot say what a
display presents (vsync is disabled), what another GPU's fill rate does (there
is one, integrated, and it is not the device's), anything about thermal or
power limits, or compositor cost for content the page does not have: DOM
surfaces are almost absent from the measured scenes. In headless Chromium
without a GPU the GPU process is software rasterisation, so the GPU column
becomes a CPU number. The long-animation-frame entries need a frame of 50 ms or
more, which an uncapped loop on this machine rarely produces; they are for the
throttled profiles and for the census below. A trace of an uncapped light
scene is hundreds of megabytes a minute, so the probe refuses to parse one
over 400 MB (use a shorter `--seconds`). Chromium's trace event names are not
a stable interface: the thread totals are the figure to trust, the buckets by
event name are a reading of today's vocabulary.

---

## Memory

The probe samples the used JavaScript heap after a forced collection before and
after every scenario (`heap` in each row). On this machine the heap sits at 4.4
to 9.3 MB across the six scenarios and the three profiles with no growth from
scenario to scenario (a scenario's first visit loads its code: the first Solar
System visit on the desktop profile went from 4.9 to 9.3 MB and the next
scenario's collection brought it back to 6.0).

Panels are checked for leaks by the census in `e2e/lessonPerformance.spec.js`:
each of fifteen application panels is opened and closed twenty times; the
listeners on anything still in the document may not grow, and after a forced
collection (a DevTools command, so Chromium only) no removed panel may be held
in memory beyond the first cycles' count. A control in the same file proves the
memory check sees a removed element that something still holds and lets go of
one nothing does. Result: no growth on the fifteen panels. The census did find
one leak outside them: selecting a body in the object inspector registers four
listeners that are never removed (the two inspector tabs, the overlay and the
document, in `setupEnergyTab` and `setupOverlayMinimize` in `js/ui.js`), 80 over
twenty selections, so each click on the Energy tab runs every handler stacked
so far. It is not fixed in this change because `js/ui.js` was off limits to it
(other pull requests edit that file); the repair and its regression test are
specified in the follow-up task, and the object inspector is deliberately not in
the passing list.

---

## Main-thread work above a budget

Two budgets, on the 4x proxy: work that recurs every frame gets 8 ms of script
(half of a 60 fps frame), and one task started by the reader gets 50 ms, the
browser's own long-task threshold. Anything over has to yield to the page or run
in a Worker. `node tools/longtask-census.mjs --cpu 4` drives the application,
the Observatory and the Studio through a short session and lists the long
animation frames with the scripts that ran in them.

On the 4x proxy it finds start-up (the document-ready handler, 595 ms: the
start-up budget's concern, not a computation), first mounts of lazily loaded
panels (the Observatory's measure and compare panels, 155 and 256 ms, module
evaluation and the first draw of a panel, with nothing to hand to a Worker), and
the simulation's own frames in the heaviest scenarios (110 to 150 ms in
Star Cluster, which the quality tier exists for). It found one computation that
belongs in a Worker and was not in one: the schedule comparison in the radial
velocity panel searched both arms' periods on the page.

- The sandbox RV workspace (period search, fit and Monte Carlo) was moved by
  Prompt 66 and already runs in the inference Worker (`js/inference/rvClient.js`).
- The schedule comparison (`js/rvCompare.js`) now runs its two period searches
  in that Worker, side by side (`js/rvCompareSearch.js`, through
  `buildComparison`), and falls back to searching on the page if a Worker cannot
  start. The numbers are the page's own: the unit test compares the two
  comparisons as JSON, digit for digit. Longest gap between animation frames
  while the comparison was computed, in the page:

| Schedule | 1x, on the page | 1x, in the Worker | 4x, on the page | 4x, in the Worker |
|---|---:|---:|---:|---:|
| 12 epochs over 60 days | 50 ms | 50 ms | 100 ms | 67 ms |
| 100 epochs over a year | 83 ms | 50 ms | 300 ms | 133 ms |
| 400 epochs over ten years | 650 ms | 83 ms | 2600 ms | 383 ms |

The time to the answer rises for the small schedules (a Worker costs about a
hundred milliseconds to start and fetch its module: 19 to 116 ms at 12 epochs
unthrottled) and falls at the largest, from 2.6 s to 1.0 s on the 4x proxy and
from 0.63 s to 0.56 s unthrottled (the proxy slows the page, not the Worker).
What falls most is the freeze. The remainder at the largest size is the arms'
window calculation and the copy of the 20,000-point result, both still on the
page.

The GLS and BLS period searches in the Observatory's measure panel stay where
they are: D-KERNEL-06 decided that neither moves to a Worker, because both
already yield to the page every 12 ms. The race the move could open (a result
arriving after the reader changed a setting) is guarded by the same generation
counter, which is checked again after the await; the radial velocity and
schedule specs pass unchanged. The clock-dilation method was not needed: the
order is by counter, not by time.

---

## The precache, in tiers

Today (`tools/build-service-worker.mjs`): the install fetches the core list and
then the optional list in the same install, 1,004 files and 17.7 MB raw, about
6.0 MB gzipped, of which 4.6 MB is core and 1.4 MB optional. Core is fatal (one
missing file and the version does not activate); optional is tolerated; the
Spanish lesson bodies are not precached and are warmed when the interface
language is switched; some paths are never precached.

What a visit touches, from `node tools/precache-tour.mjs` (service workers
blocked, six short tours; gzipped):

| Tour | Requests | Of them in core | In optional | Not precached |
|---|---:|---:|---:|---|
| Application: four scenarios, three investigations, Spanish | 174 | 174 | 0 | none |
| Observatory, fixture and six panels | 147 | 145 | 1 | the directory URL (the page is an optional entry) |
| Studio | 46 | 45 | 0 | the directory URL: the page is not precached |
| Composer | 35 | 34 | 0 | the directory URL: the page is not precached |
| Course page | 23 | 22 | 0 | the directory URL (the page is an optional entry) |
| 3-D lab | 31 | 10 | 20 | the directory URL (the page is an optional entry) |

The application tour touched 1.5 MB of the 4.6 MB of core and all six tours
together 2.1 MB. Never touched by any tour: the lesson bodies not opened
(0.6 MB: every English body is precached on purpose, see above), the
instructor content, expectations and flow modules (0.22 MB, imported by the
answer-key and activity-document paths and by the instructor page, which is
not precached), three.js (0.12 MB, the 3-D view) and Chart.js (0.06 MB, the
inspector's energy chart, which this tour never opened), the sky and
gravitational-wave data modules, and the course, experiments-bench and
dark-matter modules.

What a first offline visit needs is therefore the shell, the stylesheets, the
fonts, the module graph of the page being used and the data that page opens;
nothing the tours fetched fell outside the precache. The document pages other
than the application (the Studio, the Composer, the course page, and the rest)
not in the list (the Studio, the Composer, the course builder, the model page and
others) are runtime-cached, so a first offline visit to the Studio or the
Composer that was never opened online fails even though its modules are core.

**Decision: no change to the precache in this pass.** The tiers stay as they
are (core, optional, locale-warmed, never) and are the ones documented above.
Moving entries is a change to the service worker's lists, which every reader's
install depends on; the evidence supports two candidates and neither is
settled enough to ship without a decision:

1. Make the Studio, Composer and course builder pages optional entries, as the
   Observatory, the catalog and the course home already are. They are 4.6, 5.1
   and 5.0 KB gzipped and their modules are already core, so a class that
   installed the application could open them offline.
2. A third tier, installed after activation when the browser is idle, for what
   the tours never touch and a student rarely needs in the first minute: the
   instructor modules (0.22 MB), three.js (0.12 MB) and the optional 3-D lab,
   mission, sky, Library and data-table entries (about 0.55 MB). About 0.9 MB of
   the 6.0 MB (15%) would leave the install, at the cost that the 3-D view and
   the instructor documents are not offline until the tier has finished. The
   scenario thumbnails (0.64 MB) stay in the install: the offline spec depends
   on them.

Both are proposed as D-PERF-02 for Carl rather than implemented.

## Running the tests

```bash
npm test -- tests/quality.test.js          # the classifier, 24 tests
npm test -- tests/buildIntegrity.test.js   # the precache manifest is current
npx playwright test offline --project=chromium   # offline and throttled, 7 tests
npm test -- tests/perfTrace.test.js        # the trace buckets and the recorded thresholds
npm run perf -- --trace --tier low --cpu 4 # frame times with raster and composite apart from script
node tools/longtask-census.mjs --cpu 4     # main-thread work above the budgets
node tools/precache-tour.mjs               # what a visit fetches against the precache
```

The offline spec opts back in to service workers; the rest of the suite blocks
them, because a cache is a variable and only these tests want one.
