# Offline, and slow machines

Two features for the same room: a classroom whose wifi drops in the middle of a
lesson, on hardware the school bought in 2019.

---

## The service worker

`sw.js` at the repository root, with its precache list and cache name generated
into `sw-manifest.js` by `tools/build-service-worker.mjs`.

### Why the source tree and not `dist/`

Gravitas is published as the repository root. There is no deploy step, `dist/`
is gitignored, and GitHub Pages serves the unbundled sources — which is why the
live site answers for `/js/physics.js`. So the precache list is the source tree,
and the paths in it are the paths the browser actually requests.

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

| | Files | Raw | Gzipped |
| --- | ---: | ---: | ---: |
| JavaScript | 127 | 3,358 KB | 1,034 KB |
| Scenario thumbnails and figures | 56 | 1,754 KB | 1,730 KB |
| Stylesheets | 6 | 350 KB | 75 KB |
| `index.html` | 1 | 93 KB | 21 KB |
| **Total** | **190** | **5,554 KB** | **2,860 KB** |

Pages serves gzip, so the real transfer is about 2.9 MB. The images dominate it
and barely compress, being WebP already.

Transfer time, computed from that payload rather than measured — CDP network
emulation applies to page requests and not to a service worker's own fetches,
so a measured figure here would have been throttling nothing:

| Link | Precache transfer |
| --- | --- |
| 10 Mbps | ~2 s |
| 3 Mbps | ~7 s |
| 1.5 Mbps | ~15 s |

It runs in the background after the first frame, so this is time before the
class is *protected*, not time before the application is usable.

**Out**: the user manual PDF and the notebooks (downloads, not the shell), the
`model/`, `instructors/` and `validation/` pages (runtime-cached), and
`social-card.png` (only ever fetched by a link unfurler).

### Which of the twelve lessons

Each lesson is one dynamically imported file, so this is a real decision.

**All twelve English bodies are precached** — 553 KB, about a tenth of the
payload. The reasoning: the lesson a class is already in when the wifi dies is
by definition already fetched, so precaching buys nothing there. What it buys is
the teacher who *switches lesson after the drop*, which is exactly the moment a
runtime cache has nothing. A tenth of the payload to remove that cliff is worth
it, and picking a favourite subset would be guessing which lesson a class is
about to want.

**The twelve Spanish shadows are not** — a further 439 KB that is only ever
fetched when the interface is in Spanish. They are runtime-cached on first use,
and `js/offline.js` asks the worker to warm all twelve the moment the language
is switched. A Spanish classroom is therefore covered from when it chooses
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
and counting the resumption would demote a machine for being minimised; and the
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
reader's document: it is what a share link serialises, what a saved state
restores and what the A/B bench hashes to decide whether two runs differ, so a
teacher on a slow laptop would have exported a capped world to a class on
faster machines. `star_density` and `trail_length` were in this list too and
are not population at all; they are read at draw time and have moved to the
effects override below, which is the only place an override actually reaches
them.

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
the accretion disc, plus `star_density` 2500 and `trail_length` 8. Each is a full-screen or per-body pass an integrated GPU
pays for in fill rate. Applied as a read-time override, never written into
`SETTINGS`: writing them would destroy the reader's own choice the first time a
machine dipped below the threshold.

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
everything below is either extrapolation or explicitly labelled as measured on
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
0.5× may be the honest setting; and whether 4 GB of RAM makes the 5.5 MB
precache itself a problem under memory pressure. All three are answerable in
twenty minutes with the actual device, and none of them are answerable here.

---

## Running the tests

```bash
npm test -- tests/quality.test.js          # the classifier, 24 tests
npm test -- tests/buildIntegrity.test.js   # the precache manifest is current
npx playwright test offline --project=chromium   # offline and throttled, 7 tests
```

The offline spec opts back in to service workers; the rest of the suite blocks
them, because a cache is a variable and only these tests want one.
