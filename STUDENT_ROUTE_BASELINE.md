<!-- Listed in DOCUMENTS.md. -->
# Student-route baseline

**PROXY.** Every number here is one headless Chromium on one Mac, throttled as a
committed profile says, reading the working tree over a local server. It is not a
phone, not a radio network, not HTTP/2 and not the live site. The real-device rows
are empty and the claim about real devices stays **UNKNOWN** (`tools/evidence-status.json`).

This is the baseline that speed work is judged against. Before it, the project
timed the author's preview of a lesson (`/?author=tides&step=1`, 666 requests, 607
modules, over a server with no compression); a student opens a lesson from a link
(`/#investigation=<id>`), which is a different page weight and a different
route. One harness now measures the student's routes, and the two lesson routes are
two workflows in `tools/perf-thresholds.json`.

## How to reproduce it

```bash
npm run perf:routes                                   # the phone profile, five routes, three runs each, cold, first visit, warm and offline
npm run perf:routes -- --profile throttled-desktop --cold-only
npm run perf:routes -- --server plain --cold-only     # the uncompressed server, as before
npm run perf:routes -- --locale es --routes keplers-laws,ios-fire
npm run perf:walks                                    # link to first accepted reading, six lessons, both profiles
npx playwright test routeHarness --project=chromium   # the harness's own spec
```

`tools/route-harness.mjs` reads the profiles (CPU throttle, network shape, heap
ceiling, quality tier, viewport) from the `deviceProfiles` block of
`tools/perf-thresholds.json`, the same block `e2e/deviceProfiles.spec.js` enforces,
and shares its throttling function with that spec. `tools/route-walks.mjs` is the
walk. Both serve the tree with `tools/static-server.mjs`.

## Conditions of this baseline

| | |
|---|---|
| Date | 2026-11-13 |
| Tree | `v4` at 33617144 with this change; served from the working tree, never the live site |
| Machine | Apple Mac, Intel Core i5-10500 (12 threads), 24 GB, macOS 26.6.2; no other timing run was started while one ran, but the machine was shared with other work (1-minute load average from 2.4 to 16, median 5, sampled every 30 s from the second walk run on; between 4 and 6 at the start of the first matrix). Cells run twice under different load differ by up to 5 percent cold and 14 percent warm (below) |
| Browser | headless Chromium 156.0.8078.4 (Playwright 1.64.0's headless shell), Node v22.23.4 |
| Profiles | `mid-range-phone` and `throttled-desktop` of `tools/perf-thresholds.json` (`deviceProfiles`); the spec's budgets also use `low-end-laptop` |
| Transport | `tools/static-server.mjs --gzip --cache-headers`, HTTP/1.1 on 127.0.0.1; the "plain" rows without `--gzip --cache-headers` |
| Runs | three per cell, median shown; the usable time also shows min and max |
| Language | English; Spanish for the two lessons where stated |
| Raw numbers | `tools/student-route-baseline.json` (every summary, no raw per-run records) |

## Definitions

- **Cold.** A new browser context, service worker blocked, empty cache. This is the
  planning measurement's condition and the one speed work is judged on.
- **First visit.** A new context with the worker allowed: the worker installs
  beside the page. Its fetches are not shaped by the page's network emulation
  (DevTools shapes a page, not its worker), so this row understates the
  contention a real first visit has; read it as the cost of the worker's work on
  the main thread, not of its bandwidth.
- **Warm.** The same context after the worker has finished installing (core and idle
  tiers, read from the worker's own status message): the second visit.
- **Offline.** The same context with the context's network cut (it reaches the worker's
  own fetches as well). Two rows: *HTTP cache as left* (the host's responses are
  fresh for ten minutes, so a page the worker does not serve can still open from the
  browser's cache) and *HTTP cache off* (the case after ten minutes, and the one that
  says whether the worker alone carries a route). The second is the claim to read.
- **Usable.** The route's own condition, as `e2e/deviceProfiles.spec.js` defines it
  for the lessons: the Next button visible (a lesson); the splash ended and the interface
  shown (Home); the page's `data-ready` set and the guide's step visible (the
  Observatory guide); the page ready and its canvas visible (the 3-D lab). Read from
  `performance.now()` in the page when the condition first holds, so it is measured
  from the start of the navigation.
- **First useful action.** The time, from the same origin, at which the effect of
  the first control the opening screen offers is on screen: Load Scenario opens its
  list (Home); Next moves the lesson to the next step (`keplers-laws`); the k2
  slider changes the heating readout (`ios-fire`, whose first step carries the
  instrument); Next moves the guide on (the Observatory guide); Step advances the
  clock (the 3-D lab). A lesson that was visited before opens where its student stopped, so
  "moves on" means the step counter changes, not that it reads step 2.
- **Input delay.** After the network has been quiet for a second, a drag of 40 pointer
  moves 25 ms apart on the route's target (the canvas; the k2 slider; the guide panel
  where there is no canvas). The delay of an event is the page's clock when its
  listener ran minus the event's own timestamp: how long it waited behind main-thread
  work. The table gives p50, p95 and the worst, in ms, as medians of three runs.
  Chromium's CPU throttle slows the main thread only, which is where this delay lives.
- **Requests, transferred, modules.** The browser's own counts up to the moment the
  route is usable: requests to the origin, bytes on the wire (headers and compressed
  body, as a network panel adds them; kB = 1000 bytes) and script requests. *Reached
  the server* is the server's count over the whole load, including the action and the
  sample, and is a cross-check: a warm load is answered by the worker and reaches the
  server about once.
- **Run spread.** Three runs per cell; the table gives the median and, for the
  usable time, the range. A single cell varied by a few percent between runs when
  the machine was quiet.

### What the compressed server reproduces, and what it does not

`tools/static-server.mjs --gzip --cache-headers` (used for every row except the
"plain" ones) reproduces compression (gzip, level 6, text types above 150 bytes,
`Content-Encoding` and `Vary` as a compressing host sends them), the byte count of what
a browser downloads, and the cache headers GitHub Pages sends for static files
(`Cache-Control: public, max-age=600`, a strong ETag, 304 for a match). It does not
reproduce the host's HTTP/2 (the test server speaks HTTP/1.1, six connections per
origin, so a few hundred requests queue where HTTP/2 would multiplex them), its
Brotli for a browser that offers it, its edge cache, a real round trip or a radio.
The network shape is the profile's own (1.6 Mbps down, 150 ms) and is applied by
DevTools, not carried by a link.

## The student's routes on the mid-range phone profile

Profile `mid-range-phone`: 412 x 915 at density 2.625, touch, CPU throttle 6x, 1.6 Mbps
down and 150 ms, a 384 MB heap ceiling, the low quality tier pinned. English,
compressed transport, three runs, median.

| Route | Load | Usable, s | First useful action, s | Input delay p50 / p95 / worst, ms | Requests | Reached the server | Transferred, kB | Modules |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Home | cold (worker blocked) | 12.1 (12.0 to 12.3) | 13.7 | 53.4 / 56.4 / 56.4 | 125 | 137 | 999 | 109 |
| Home | first visit (worker allowed) | 12.2 (12.2 to 12.4) | 14.2 | 56.6 / 62.6 / 62.6 | 125 | 1085 | 999 | 109 |
| Home | second visit (warm) | 5.0 (5.0 to 5.2) | 8.9 | 53.5 / 55.9 / 55.9 | 125 | 1 | 0 | 109 |
| Home | offline, HTTP cache as left | 5.0 (4.9 to 5.1) | 8.9 | 51.8 / 56.8 / 56.8 | 125 | 1 | 0 | 109 |
| Home | offline, HTTP cache off | 5.2 (5.2 to 5.3) | 8.8 | 52.3 / 63.2 / 63.2 | 125 | 1 | 0 | 109 |
| Lesson, live scene (`keplers-laws`) | cold (worker blocked) | 15.0 (14.8 to 15.1) | 15.7 | 2.0 / 23.4 / 24.9 | 167 | 167 | 1,439 | 149 |
| Lesson, live scene (`keplers-laws`) | first visit (worker allowed) | 14.7 (14.2 to 14.9) | 15.4 | 15.8 / 25.5 / 30.2 | 167 | 1126 | 1,396 | 149 |
| Lesson, live scene (`keplers-laws`) | second visit (warm) | 7.9 (7.7 to 8.0) | 8.8 | 15.4 / 30.6 / 33.3 | 167 | 1 | 0 | 149 |
| Lesson, live scene (`keplers-laws`) | offline, HTTP cache as left | 7.7 (7.7 to 7.7) | 8.5 | 6.4 / 26.9 / 31.2 | 167 | 1 | 0 | 149 |
| Lesson, live scene (`keplers-laws`) | offline, HTTP cache off | 7.7 (7.7 to 8.0) | 8.6 | 19.8 / 30.8 / 49.7 | 167 | 1 | 0 | 149 |
| Lesson, instrument (`ios-fire`) | cold (worker blocked) | 15.0 (15.0 to 15.1) | 16.3 | 2.4 / 25.9 / 30.8 | 169 | 188 | 1,438 | 151 |
| Lesson, instrument (`ios-fire`) | first visit (worker allowed) | 15.0 (15.0 to 15.1) | 15.8 | 2.0 / 15.8 / 31.0 | 169 | 1346 | 1,423 | 151 |
| Lesson, instrument (`ios-fire`) | second visit (warm) | 7.8 (7.8 to 7.9) | 8.6 | 1.8 / 28.7 / 30.6 | 169 | 1 | 0 | 151 |
| Lesson, instrument (`ios-fire`) | offline, HTTP cache as left | 7.8 (7.7 to 7.9) | 8.6 | 2.8 / 28.3 / 31.8 | 169 | 1 | 0 | 151 |
| Lesson, instrument (`ios-fire`) | offline, HTTP cache off | 7.9 (7.7 to 7.9) | 8.6 | 1.7 / 28.1 / 134.0 | 169 | 1 | 0 | 151 |
| Observatory guide (`exo-star`) | cold (worker blocked) | 4.0 (4.0 to 4.0) | 4.3 | 1.8 / 10.8 / 18.1 | 56 | 56 | 294 | 50 |
| Observatory guide (`exo-star`) | first visit (worker allowed) | 4.0 (4.0 to 4.0) | 4.3 | 1.9 / 10.2 / 18.3 | 56 | 56 | 294 | 50 |
| Observatory guide (`exo-star`) | second visit (warm) | 0.6 (0.6 to 0.6) | 0.9 | 3.6 / 17.0 / 17.6 | 56 | 0 | 0 | 50 |
| Observatory guide (`exo-star`) | offline, HTTP cache as left | 0.6 (0.6 to 0.6) | 0.9 | 13.9 / 16.9 / 17.4 | 56 | 0 | 0 | 50 |
| Observatory guide (`exo-star`) | offline, HTTP cache off | does not open: `page.goto: net::ERR_INTERNET_DISCONNECTED` | n/a | n/a | n/a | n/a | n/a | n/a |
| 3-D lab (`/3d/`) | cold (worker blocked) | 3.5 (3.5 to 3.5) | 4.2 | 21.4 / 24.9 / 27.0 | 27 | 33 | 291 | 21 |
| 3-D lab (`/3d/`) | first visit (worker allowed) | 3.5 (3.5 to 3.5) | 4.2 | 22.6 / 28.5 / 36.7 | 27 | 33 | 291 | 21 |
| 3-D lab (`/3d/`) | second visit (warm) | 0.9 (0.8 to 0.9) | 1.6 | 20.4 / 30.2 / 38.1 | 27 | 0 | 0 | 21 |
| 3-D lab (`/3d/`) | offline, HTTP cache as left | 0.9 (0.9 to 0.9) | 1.7 | 20.7 / 25.4 / 26.7 | 27 | 0 | 0 | 21 |
| 3-D lab (`/3d/`) | offline, HTTP cache off | does not open: `page.goto: net::ERR_INTERNET_DISCONNECTED` | n/a | n/a | n/a | n/a | n/a | n/a |

What this says, plainly:

- **The lesson route costs 15.0 s to usable cold on the phone profile**, 167 requests
  and 1.44 MB over the wire for `keplers-laws` and 169 requests and 1.44 MB for `ios-fire`
  (149 and 151 script requests). Home is 12.1 s, 125 requests and 1.0 MB. The Observatory
  guide is 4.0 s and 0.29 MB, the 3-D lab 3.5 s and 0.29 MB.
- **The first useful action follows usable by 0.7 to 1.3 s** on the two lessons (the click is
  answered within a second at CPU 6x), by 1.6 s on Home (the scenario list), 0.3 s in the
  Observatory guide and 0.7 s in the 3-D lab.
- **A second visit with the worker is about half as long (7.8 s for a lesson, 5.0 s for Home),
  with no bytes on the wire and one request reaching the server.** What is left is the main thread:
  parsing and running 150 modules at CPU 6x, so the warm time is the cost of the code and not of
  the network.
- **Offline, with the HTTP cache off, Home and both lessons open in 5.2 s and 7.7 to 7.9 s from the
  worker alone. The Observatory guide and the 3-D lab do not open** (the browser reports the network
  down): they are separate pages that never register the worker (`swActive` false in every load), so
  their offline copy is the browser's HTTP cache, which the host's ten-minute freshness keeps for ten
  minutes (the "HTTP cache as left" rows: 0.6 s and 0.9 s). This is a measured fact about this
  tree, not a defect claimed here.
- **The first visit (worker allowed) costs the same as cold** (12.2, 14.7 and 15.0 s). The worker
  fetched 1,085 to 1,346 files beside the page (the precache is 19.9 MB, `precacheBytes` in the
  worker's status). Those fetches are not shaped by the page's network emulation, so this row
  cannot show contention for the link; on the profile's own 1.6 Mbps (200 kB/s) 19.9 MB is about
  100 s of link time, an arithmetic inference that this harness did not measure.
- **Input delay while dragging.** The p50 is 53 ms on Home's canvas and 20 to 23 ms in the 3-D lab,
  above a 16.7 ms frame, and 2 to 16 ms on a lesson's scene (it varies with whether the scene had
  gone quiet) with p95 25 to 31 ms. These are proxies for a phone's main thread, whose speed
  Chromium's throttle sets and whose compositor it leaves alone.
- **Counts.** The two lessons differ by two requests and two modules.

### The same two lessons in Spanish

| Route | Load | Usable, s | First useful action, s | Input delay p50 / p95 / worst, ms | Requests | Reached the server | Transferred, kB | Modules |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Lesson, live scene (`keplers-laws`) | cold (worker blocked) | 15.1 (15.1 to 15.1) | 15.8 | 13.9 / 24.1 / 26.5 | 172 | 172 | 1,534 | 154 |
| Lesson, live scene (`keplers-laws`) | first visit (worker allowed) | 14.7 (14.7 to 15.2) | 15.4 | 8.3 / 23.9 / 27.2 | 172 | 1254 | 1,440 | 154 |
| Lesson, live scene (`keplers-laws`) | second visit (warm) | 7.6 (7.5 to 7.9) | 8.7 | 1.7 / 28.9 / 33.5 | 172 | 128 | 0 | 154 |
| Lesson, live scene (`keplers-laws`) | offline, HTTP cache as left | 7.7 (7.6 to 7.7) | 8.6 | 17.2 / 26.4 / 38.3 | 172 | 1 | 0 | 154 |
| Lesson, live scene (`keplers-laws`) | offline, HTTP cache off | 7.8 (7.7 to 7.8) | 8.5 | 20.3 / 33.6 / 48.6 | 172 | 1 | 0 | 154 |
| Lesson, instrument (`ios-fire`) | cold (worker blocked) | 15.1 (15.1 to 15.2) | 16.4 | 2.5 / 26.0 / 43.1 | 175 | 194 | 1,533 | 157 |
| Lesson, instrument (`ios-fire`) | first visit (worker allowed) | 15.0 (15.0 to 15.3) | 15.9 | 4.1 / 25.4 / 32.1 | 175 | 1475 | 1,456 | 157 |
| Lesson, instrument (`ios-fire`) | second visit (warm) | 7.8 (7.6 to 7.9) | 8.8 | 2.1 / 27.8 / 113.4 | 175 | 128 | 0 | 157 |
| Lesson, instrument (`ios-fire`) | offline, HTTP cache as left | 7.8 (7.5 to 8.0) | 8.6 | 3.0 / 26.9 / 38.6 | 175 | 1 | 0 | 157 |
| Lesson, instrument (`ios-fire`) | offline, HTTP cache off | 7.8 (7.6 to 8.0) | 8.7 | 3.0 / 25.0 / 33.0 | 175 | 1 | 0 | 157 |

Spanish costs 0.1 s more cold (15.1 s), 5 requests and 95 kB more (more files load for the Spanish interface). It opens offline like English. One difference matters for the warm
visit: **128 requests reach the server on a warm Spanish visit, against 1 on a warm English
one**, because the Spanish lesson files are not in the precache and the worker serves them
stale-while-revalidate (the worker's own comment says so). They are served from the cache first, so
the time to usable is the same (7.6 to 7.8 s), but the traffic is not zero.

## Reproducing the planning figures

| Figure | Planning measurement | This harness | Conditions |
|---|---|---|---|
| Author preview, `/?author=tides&step=1`, plain server | 82.3 s, 666 requests, 607 modules | 80.9 s (80.4 to 81.3), 652 requests, 608 modules, 10,686 kB | phone profile, worker blocked, three runs |
| Student lesson, plain server | 27.9 s | 27.7 s (27.5 to 27.7), 167 requests, 4,230 kB | `keplers-laws`; `ios-fire` 28.2 s |
| Student lesson, gzip | 15.8 s, 181 requests, 1,401 KB, 149 modules | 15.0 s (14.8 to 15.1), 167 requests, 1,439 kB, 149 modules | `keplers-laws`; `ios-fire` 15.0 s, 169 requests, 151 modules |
| Home, gzip | 12.5 s, 139 requests, 972 KB | 12.1 s (12.0 to 12.3), 125 requests to usable and 137 over the whole load, 999 kB | |

**They reproduce.** The author route took 80.9 s here against 82.3 s planned, and the student route
27.7 s uncompressed and 15.0 s compressed against 27.9 s and 15.8 s, each within 5 percent, and the
module count (149) is the same. Home is 12.1 s against 12.5 s. Differences: this harness's request count is the
browser's count of requests to the origin until the route is usable (167 for `keplers-laws`, 169 for
`ios-fire`, 188 over the whole `ios-fire` load) and the planning figure (181) is between them; the planning
script's own counting rule is not recorded, so the gap is not explained. The bytes are 1,439 kB against
1,401 KB (headers are included here, and the planning unit is not stated). The author route's 652 requests
and 608 modules against 666 and 607 are within the same kind of gap. The planning measurement was one run
per cell, so the planning figures carry no spread, and a later comparison should use this harness's own
figure for the lesson route (15.0 s cold, 167 requests, 1,439 kB), not the planning figure.

The run spread of this harness: the usable time of a cell varied by at most 5 percent between its
three runs (usually under 3). The whole phone matrix was also run twice (a first set before the offline loads were made
strictly offline, a second after): cold times agreed within 5 percent (Home 12.6 against 12.1 s,
`keplers-laws` 15.4 against 15.0 s, `ios-fire` 15.4 against 15.0 s, the Observatory guide 4.0 against
4.0 s, the 3-D lab 3.6 against 3.5 s) and warm times within 14 percent (the two sets ran under different
background load). The second set is the table above.

## The throttled desktop, cold

Profile `throttled-desktop`: 1440 x 900, density 1, CPU 4x, no network shape, the
quality tier left on auto. Compressed transport, three runs, cold only.

| Route | Load | Usable, s | First useful action, s | Input delay p50 / p95 / worst, ms | Requests | Reached the server | Transferred, kB | Modules |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Home | cold (worker blocked) | 4.4 (4.2 to 4.5) | 5.7 | 23.7 / 57.1 / 57.1 | 125 | 187 | 999 | 109 |
| Lesson, live scene (`keplers-laws`) | cold (worker blocked) | 2.6 (2.5 to 2.8) | 4.4 | 2.1 / 36.3 / 50.8 | 167 | 167 | 1,439 | 149 |
| Lesson, instrument (`ios-fire`) | cold (worker blocked) | 2.7 (2.7 to 2.7) | 4.5 | 44.1 / 63.2 / 205.8 | 169 | 188 | 1,438 | 151 |
| Observatory guide (`exo-star`) | cold (worker blocked) | 0.5 (0.4 to 0.5) | 0.7 | 3.4 / 12.3 / 17.0 | 56 | 56 | 294 | 50 |
| 3-D lab (`/3d/`) | cold (worker blocked) | 0.7 (0.7 to 0.9) | 1.5 | 28.4 / 36.6 / 67.5 | 27 | 33 | 291 | 21 |

## From a lesson link to the first accepted reading, at 3.0

`npm run perf:walks`. Each walk opens the student's link, passes the steps on the way
by answering what holds Next up (the first option of a choice, `1` in a box,
a ticked checkbox: the walk measures the route, not the reasoning), reaches the first
step of type `measure`, takes the reading from where a student takes it, types it
into the step's boxes and stops when the step's own check (`.inv-check.is-ok`)
accepts it. The time is from the start of the navigation, on the page's clock.

| Lesson | First measure step | Where the reading comes from |
|---|---|---|
| `keplers-laws` | `measure-the-two-orbits` (step 7) | the two orbiters' eccentricities and distances, from the scene's orbital elements |
| `transit-photometry` | `measure-the-dip` (step 8) | the step's own "Copy the last transit" button, pressed again after each transit until the step accepts the copy; the time includes the wait for a transit |
| `measuring-the-moon` | `scale-from-the-disc` (step 3) | the instrument's end positions set to those the step names, then its length and scale rows |
| `ios-fire` | `heating-at-the-maximum` (step 2) | the instrument's heating and energy rows |
| `tides-that-move-the-moon` | `the-moons-recession` (step 2) | the instrument's recession and day-length rows |
| `weighing-stars` | `a-practice-run` (step 20) | none: the 3.0 step is a practice run and tells the two numbers (2 and 2) |

The 3.0 lessons are those on this tree (`v4` at the commit named above: none of the six
lesson files differs from the `v3.0` tag). A pilot that moves its first measure step
must change its entry in `PILOTS` in `tools/route-walks.mjs` and say so. The pilot
criterion is a walk of at most 1.25 times the 3.0 walk on desktop and a walk that
completes on the phone profile.

| Profile | Lesson | Steps passed | Link to usable, s | Link to first accepted reading, s: median (min to max) | Completed |
|---|---|---:|---:|---:|---:|
| throttled-desktop | `keplers-laws` | 6 | 4.0 | 14.5 (11.8 to 16.1) | 3/3 |
| throttled-desktop | `transit-photometry` | 7 | 3.0 | 23.7 (21.9 to 23.9) | 3/3 |
| throttled-desktop | `measuring-the-moon` | 2 | 3.2 | 9.9 (9.7 to 10.3) | 3/3 |
| throttled-desktop | `ios-fire` | 1 | 2.8 | 6.9 (6.7 to 7.7) | 3/3 |
| throttled-desktop | `tides-that-move-the-moon` | 1 | 2.8 | 7.1 (6.5 to 7.6) | 3/3 |
| throttled-desktop | `weighing-stars` | 19 | 2.4 | 42.1 (40.8 to 42.5) | 3/3 |
| mid-range-phone | `keplers-laws` | 6 | 15.1 | 20.2 (20.1 to 20.7) | 3/3 |
| mid-range-phone | `transit-photometry` | 7 | 14.9 | 39.7 (39.7 to 39.7) | 2/3 |
| mid-range-phone | `measuring-the-moon` | 2 | 15.5 | 20.8 (20.6 to 20.9) | 3/3 |
| mid-range-phone | `ios-fire` | 1 | 15.3 | 17.7 (17.4 to 17.8) | 3/3 |
| mid-range-phone | `tides-that-move-the-moon` | 1 | 15.1 | 17.4 (17.1 to 17.5) | 3/3 |
| mid-range-phone | `weighing-stars` | 19 | 15.2 | 36.0 (34.3 to 38.9) | 3/3 |

What this says: on the phone profile most of a walk is the page opening (15 s of 17 to 20 s for a lesson
whose first measure step is one or two steps in). Beyond usable the walk takes 2 to 5 s for the short lessons,
21 to 25 s for the transit lesson, and 21 s (phone) to 39 s (desktop) for the 19-step `weighing-stars`, whose
walk is mostly the lesson's pacing (each Next waits for the next step to draw). The `transit-photometry` walk
includes waiting for a transit to complete in the light curve, so its time varies with how fast the scene runs.
**On the phone profile that walk completed in 2 of 3 runs, and in a further diagnostic it failed in the same
way:** "Copy the last transit" returned a bottom equal to the baseline, so the step called the dip too shallow, for
the whole 150 s the walk kept pressing it (5 of 8 phone-profile attempts, across two sets and a diagnostic).
The same walk completed in 5 of 5 diagnostic variants whose heap ceiling was 1,024 MB instead of 384 MB (the phone
profile with the ceiling raised, and four variants of the desktop profile taking on the phone's CPU, quality tier,
touch and network), and in all six desktop-profile walks, so the 384 MB ceiling is the suspect; the cause is not
isolated. This is a finding about the 3.0 lesson under the proxy, not
about a device, and it means the pilot criterion "completes on the phone profile" is not guaranteed by the 3.0 lesson
for this walk. Walk times vary with the machine's load (a first set of walks under a load of 8 to 16 read 27.4 s for
`keplers-laws` on the phone profile, against 20.2 s in the set shown, taken at a load of 5 to 8): a pilot's walk must be
compared with a 3.0 walk taken at the same load, and the 1.25 factor is not meant to absorb that.

## Budgets

`tools/perf-thresholds.json` now holds two lesson workflows in its enforced
`deviceProfiles` block: `authorLesson` (the author's preview over the plain server,
with its budgets exactly as they were) and `studentLesson` (`/#investigation=keplers-laws`
over the compressed server). Each is budgeted by the existing rule, three times the
measured value rounded up to 100 ms and never under 4000 ms. No budget was loosened.

| Profile | Measured median of three, usable / interaction | Budget (3x, at least 4 s), usable / interaction |
|---|---|---|
| `throttled-desktop` | 3.4 s / 1.6 s | 10.3 s / 5.0 s |
| `low-end-laptop` | 6.4 s / 1.7 s | 19.3 s / 5.2 s |
| `mid-range-phone` | 15.2 s / 0.8 s | 45.8 s / 4.0 s |

The author route's budgets (23.1 s measured, 69.4 s budget on the desktop; 81.8 s measured, 245.4 s budget on
the phone) are unchanged, and the spec still judges them. `npm run budget:routes` and `npm run budget:check`
are untouched: this change loads nothing differently.

## Not run, and unknown

- **Any real device, any radio, the host's HTTP/2, the live site.** NOT RUN. Real-device rows stay empty
  and the claim stays UNKNOWN.
- **The `low-end-laptop` profile** has only the `studentLesson` budget run (three runs); no route matrix. NOT RUN.
- **Warm and offline on the throttled desktop**, and the walks on `low-end-laptop`. NOT RUN.
- **Spanish walks.** The walk recipes read English instrument labels. NOT RUN; the Spanish lesson route is measured.
- **The second measure step of `weighing-stars`** (`weigh-the-pair`, read from the scene). NOT RUN: the 3.0 walk
  ends at the practice step, which tells its numbers. A pilot that makes a reading its first measure step needs its
  own recipe.
- **The other 118 lessons, the Observatory guides but one, the mission lab.** NOT RUN.
- **Offline after the worker has been updated** (a new build replacing an installed one). NOT RUN.
- **A cold first visit with the worker's fetches shaped like the page's.** NOT RUN; the harness cannot shape them.
- **Memory.** Not measured here (the memory budget stays in `e2e/deviceProfiles.spec.js`).
- **The `transit-photometry` phone walk's cause** (the heap ceiling is a suspect only). NOT RUN beyond the
  observations above.
