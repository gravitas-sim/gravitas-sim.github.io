# The image-measurement gate

Roadmap III Prompt 178. One instrument (marks with a scale and a time on real images, feeding the ledger) unlocks the image phases of Roadmap III (R13 and the image parts of R14 to R20). Its byte cost, the precision it can reach and whether it has a path that needs no pointer are not known. This document commits the thresholds, the slices and the consumers each slice serves **before any prototype or measurement exists**, so that a B cannot be read as "most of A". The result is decision-register row D-R10-48 (DELEGATED: the verdict and the thresholds are the session's recommendation and stay open for Carl's ratification).

The thresholds, slices, consumers and decision function are code in `tools/image-measure-gate.mjs` and are held to this text and to the recorded results by `tests/imageMeasureGate.test.js`.

## What is committed first

The text of this section to "Results" and the code of `tools/image-measure-gate.mjs` were committed before the prototype (`tools/image-measure-gate/`) and the results file (`tools/image-measure-gate.json`) existed; the branch history shows the order. A threshold that a measurement then crosses is a failed check, not a reason to move it. Only Carl resets a threshold, with a register row. No slice is added after measuring.

## What is under test

One image-measurement instrument, the one Prompt 179 would build:

- the **mark model**: point, segment, circle, polygon, count with a tag, and a reference pair for the scale;
- the **scale** (from the sidecar, or from a reference pair and a known length, with its uncertainty) and the **frame time** (with its time scale named);
- the **marks table**: editable, keyboard-first, the semantic alternative to the picture, announced once per commit;
- **undo**, and **refinement** (click then refine a point to its centroid, a circle to its limb), deterministic;
- the **sequence navigator**: the next frame keeps marks by tag, a mark can be copied forward;
- the **record**: marks, scale, frame time and image identity written as one `gravitas.artifact/1` envelope (Prompt 150's uncertainty on every coordinate) with replay.

Not under test, and therefore not decided by this gate: photometry over the marks (180), world coordinates and registration (181 to 185), detection, local import and the FITS reader. The FITS reader, job, worker and pool serve local import (188) and the Observatory's existing FITS path; none of the seven thresholds needs them, so they are not in the instrument's bytes here. The checkpoint's table (`ARCHITECTURE_CHECKPOINT_R10.md`, section 10) added their 8.8 KiB to B2 and A; this gate reports the instrument without them and the FITS reader's own bytes beside it, and a consumer that needs local import pays for 188 under its own allowance.

The prototype is spike code. It stays under `tools/image-measure-gate/`, is imported by no page, module or build entry, is not under `js/` (so the build, the service worker's precache and every route budget are untouched by construction), and a test fails if anything under `js/` or the build ever imports it. It is not a product module and is not the production implementation.

## The seven thresholds

Each row names the check ids the verdict function reads. Bounds are committed numbers; a check is `pass`, `fail` or `not-measured`, and `not-measured` is never a pass.

### 1. Bytes and requests (Prompt 160's first-slice allocation, D-R10-35 item 3)

| Check | Bound | How it is measured |
| --- | --- | --- |
| `T1.route` | the Observatory route gains **0 requests** in the sources and in the build, and at most **0.2 KB** as `tools/route-budget.mjs` prints it, in both configurations | a scratch copy of the tree with the lazy call site the production wiring needs (one `import()` for the instrument on opening an image observation), the route tool run on the copy and on the base. A rise of 0.1 KB is an exact-overrun byte raise under the standing approval of 2026-10-10 and would be listed; the request count is a hard zero |
| `T1.deferred` | the instrument's lazy chunks total at most **25,600 B (25.0 KiB)** minified and gzipped | esbuild with the build's options on the instrument's modules, the modules the Observatory route already loads eagerly marked external, each output chunk gzipped on its own (the way `build.js` counts) |
| `T1.requests` | at most **3** lazy requests on opening an image observation in the build; none on any other route | the number of output chunks the three lazy entries (image kind, instrument, ledger bridge) produce. The tree serves each module as a request; its module count is reported and is what the idle tier absorbs |
| `T1.tier` | **0 B** added to the first-visit precache and at most **138,331 B** of gzipped source in the idle tier ("image measurement", D-R10-36) | the gzipped source of the instrument's closure outside the first-visit install, and the service worker's own install list |

The image kind here is `js/dataKinds/` `contract.js`, `limits.js`, `planes.js`, `grid.js` and `draft.js`. The instrument's own size was an estimate (14.1 KiB) in the checkpoint; the prototype replaces it, and a measured total above 25.0 KiB fails `T1.deferred`.

### 2. Precision (synthetic frames with known positions)

The click model: a click lands within a **capture radius of 3 pixels** of the truth, uniformly in the disk (a pointer's hotspot at 1,024 pixels in a 375-pixel viewport is within about 1.4 pixels, so 3 is the stricter case). A click farther than the capture radius is outside the claim. Refinement is only an algorithm of the pixels: deterministic, with no random start.

| Check | Bound | Ensemble (seed fixed in `tools/image-measure-gate/frames.mjs`) |
| --- | --- | --- |
| `T2.point` | the **95th percentile of the radial error is at most 0.5 pixel** and every source is refined | 300 Gaussian point sources in 1,024-pixel frames: FWHM uniform 2.5 to 6 pixels; peak signal to background noise log-uniform 20 to 200; sub-pixel truth uniform; a sloped background; Poisson plus read noise (gain 1.5 e-/ADU, read noise 8 e-, bias 200 ADU); sources at least 40 pixels apart; click offset uniform in the capture disk |
| `T2.circle` | the **95th percentile of \|r - r_true\| / r_true is at most 2%**, for radii of at least **15 pixels** | 150 discs, radius log-uniform 15 to 300 pixels, 100 bright on dark sky (the Moon) and 50 dark on a sloped, limb-darkened field (a sunspot), edge scale 0.6 to 1.5 pixels (the radius is the half-intensity edge by construction), contrast to noise log-uniform 30 to 200; the click is a centre click and a limb click, each within the capture radius |
| `T2.keyboard` | the same bounds, **every trial**, by the keyboard path alone | the real instrument in Chromium: 12 point trials and 6 circle trials; the mark starts at the focused pixel and is moved with the contract's nudge sizes (Alt a quarter pixel, no modifier one, Shift four, PageUp and PageDown fifty) until it is within 1.0 pixel of the target as read off the picture, then refined |
| `T2.pointer` | the same bounds, **every trial**, by single pointer alone | the same trials: a tap at the nearest whole CSS pixel (the 375-pixel profile, so about 1.4 image pixels of quantization), the on-screen nudge pad (`DESIGN_SYSTEM.md`, touch measurement) to within 1.0 pixel, then refine |

Negative cases (stated, and informational for the verdict, reported in the table): a source below peak signal to noise 10, a blended pair closer than one FWHM, a cosmic-ray spike, a source on the frame edge, and a click beyond the capture radius. The instrument must refuse or report an error inside the bound; the count of wrong answers given with confidence is reported. A refusal is not a failure of `T2.point`.

### 3. The complete non-pointer path (Chromium, the real instrument)

| Check | Bound |
| --- | --- |
| `T3.keyboard` | every one of **place, nudge, read, edit (tag, x, y) and delete** completes on every mark kind (point, segment, circle, polygon, count, reference pair) **from the keyboard alone**, with the scale set from a reference pair, and the walk uses **0 pointer events** |
| `T3.pointer` | the same set completes by **single pointer alone** (a tap places, the nudge pad and the table's steppers move and edit, no drag, no second finger) and the walk uses **0 key events** |
| `T3.announce` | the marks table is editable and every commit (place, a nudge once it settles, edit, delete, refine, frame change, undo) produces **exactly one** live-region announcement; focus never rests on `body` or on a removed element; `axe-core` finds no serious or critical violation on the instrument with marks present |
| `T3.sequence` | on a six-frame sequence the next frame (keyboard and single pointer) keeps marks by tag, a mark is copied forward, and the previous frame's marks are unchanged |

### 4. The record (one Prompt 150 envelope with replay)

| Check | Bound |
| --- | --- |
| `T4.record` | marks, scale (with its uncertainty), frame time (time scale named) and the image's identity (a digest of its pixels and its sidecar id) are one `gravitas.artifact/1` envelope; `validateArtifact` returns **0 problems**; every coordinate carries an uncertainty of Prompt 150's kinds |
| `T4.replay` | the envelope serialized to JSON and read back reopens the image with **the same marks** (deep equality), re-running refinement from the record gives **bit-identical** coordinates, and the record **refuses** to replay against a changed image (a different digest) |
| `T4.sequence` | a two-frame record carries each mark's frame index and each frame's time and replays |

### 5. Undo and deterministic refinement

| Check | Bound |
| --- | --- |
| `T5.undo` | for 200 seeded random sequences of operations (place, nudge, edit, delete, refine, copy forward), undoing every step returns **exactly** the earlier state (deep equality), and redo returns the later one |
| `T5.determinism` | the same input refines to the **same bits** ten times in a row, in a different order of marks, and in a freshly imported module instance (in-process: no stored digest, no claim across Node versions) |

### 6. A 1,024-pixel frame with 50 marks on the throttled profile

The profile of `tools/observatory-bench.mjs`: 375 x 812, the CPU slowed **four** times (Chrome DevTools' mid-tier phone). The budget is the Observatory's own (`tools/observatory-budgets.json`, mobile): handler milliseconds, measured as the synchronous time of the dispatched input, and paint, the time to the second frame after it. Each is the **95th percentile (nearest rank) of 20 repeats**.

| Check | Bound |
| --- | --- |
| `T6.interaction` | a key nudge of a mark at most **15 ms**; a tap that places a mark at most **28 ms**; a table edit or a delete at most **90 ms**; an undo at most **104 ms**; every one of them painted within **100 ms**; on a 1,024-pixel frame holding 50 marks (30 points, 10 circles, 5 segments, 3 polygons, 2 counts) |
| `T6.sequence` | opening the next frame of the six-frame sequence (1,024 pixels, 50 marks kept by tag) at most **500 ms** (the Observatory's mobile open budget) |

A timing taken while the machine's one-minute load is above 6 is not a measurement: it is repeated, and the load is recorded with every figure.

### 7. A 2,048-pixel frame

| Check | Bound |
| --- | --- |
| `T7.time` | decoding a 2,048 x 2,048 plane (`decodePlane`) plus drawing it at `displayPlan`'s factor, on the throttled profile, at most **2,000 ms**: the decode runs in a Worker, which the page's CPU throttle does not slow, so its unthrottled time is multiplied by the throttle's factor of 4 (a conservative stated assumption, not a model of a phone); the draw is measured on the throttled page |
| `T7.memory` | the decoded bytes the page holds (`decodedBytes` of every plane resident, and the drawn copy beside them) are at most **67,108,864 B** (157's bound), and the realm peak sampled the way `tools/decoded-memory-probe.mjs` samples it is at most 1.25 times the file plus the plane |

If either check fails the **display rule** applies and is stated: a frame whose longer side is over 1,024 pixels is drawn at `displayPlan`'s factor and, because the tier failed, block-averaged to that size before a mark is placed (marks are then in the averaged pixels and map to the full frame with `toFull`; precision claims are the 1,024-pixel frame's).

## The slices, committed before the prototype

The verdict function reads the checks by group: `core` (every `T1`, `T3.keyboard`, `T3.pointer`, `T3.announce`, `T4.record`, `T4.replay`, `T5.undo`, `T6.interaction`), `refine` (`T2.point`, `T2.circle`, `T2.keyboard`, `T2.pointer`, `T5.determinism`), `sequence` (`T3.sequence`, `T4.sequence`, `T6.sequence`) and `tier` (`T7.time`, `T7.memory`). In order:

1. a `core` check that is not a pass: **C**;
2. else a `refine` check that is not a pass: **B1**;
3. else a `sequence` check that is not a pass: **B2**;
4. else a `tier` check that is not a pass: **B3**;
5. else **A**.

A slice's acceptance criteria are the checks of the groups it needs, and a B authorizes only the slice it names; it never authorizes the A scope.

- **B1: marks and scale without refinement.** Needs `core`. Serves 191's "Measuring the Moon", 193's moon identification, 194's sunspot areas and 195's relative ages. Does not serve 180 to 185, 186's two-epoch shift, 187, 189, or 2,048-pixel frames at the full tier.
- **B2: marks, scale and refinement without the sequence navigator.** Needs `core` and `refine`. Adds 186's two-epoch shift (its marks part). Does not serve the sequence navigator or any consumer that needs one; carries the display rule when `tier` failed.
- **B3: everything but the 2,048-pixel tier.** Needs `core`, `refine` and `sequence`. Serves every consumer, on frames displayed under the display rule above.
- **A** serves all of them. **C** removes the consumers of Appendix C's list below and nothing else.

Consumers not named in a B take their Appendix C alternative until a later decision of Carl's says otherwise.

### The consumers a C removes, each with its alternative (Appendix C, entry 178)

| Prompt | Under a C |
| --- | --- |
| 179 to 187, 189 and 191 | their image items are removed; 191 keeps its non-image parts |
| 193 | keeps the ephemeris and identity tasks on the overlay-free tabular elongations from the pack |
| 194 | keeps the irradiance lesson and drops the spot tracking |
| 195 | keeps the reference-count lessons on published diameter lists and drops the student's own counts |
| 197 | keeps the published-observation orbit work and drops the frame-based mover identification |
| 212 | drops its frame-based parts and keeps the synthetic-standards table |
| 215 | drops its frame tasks and keeps the planning tasks |
| 217 and 220 | keep their archive light-curve branches |
| 228 | drops the centroid test |
| 230 | drops the subtraction demonstration |
| 249 | is not run |
| 250 | drops its image items |
| 283 | drops the touch precision test |
| 188 and 157's reader | stay (import without measurement) |

## The lunar frame

The prompt names one public-domain lunar frame beside the synthetic moon sequence. The repository holds none (the card images under `images/` are illustrations; the TESS aperture pack is a flag image with no intensities), and nothing is downloaded here without Carl's permission. The authentic-data leg is therefore reported on its own line as **not measured** and is not read by the verdict function: it would measure decode and draw time on a real image and repeatability of a circle mark with no truth to compare against, neither of which any of the seven thresholds needs. The text of the result says so, and Prompt 179 runs that leg before any claim is made about real images.

## Results

Measured on darwin x64, Node v24.4.0, Chromium 156.0.8078.4, the one-minute load 4.67 at the throttled timings (the rule was at most 6). The numbers are `tools/image-measure-gate.json`, written by `npm run image-gate:measure` from the prototype in `tools/image-measure-gate/` (content digest `dd6fd9db74d50613`; a test fails if a prototype file changes without a new measurement). `npm run image-gate:report` prints the table. Every number is measured; none is simulated. The thresholds were committed in `ede242a2`, before any prototype file or measurement existed.

### Verdict: **A**, on synthetic frames, as the session's recommendation

All 21 checks pass. The verdict is the recommendation of the session that ran the gate; it is a DELEGATED register row (D-R10-48) and stays open for Carl's ratification, and so do the thresholds it was judged against. It is a verdict on the instrument's tested scope on **synthetic** frames with known truth: the lunar-frame leg is **not measured** (see below) and is not read by the function.

| Check | Bound | Measured |
| --- | --- | --- |
| `T1.route` | +0 requests, +0.2 KB | sources 186.7 to 186.9 KB (+0.2), 17 requests; build 88.0 to 88.1 KB (+0.1), 5 requests. The wiring is one `import()` and one call site in `js/observatoryPage.js` |
| `T1.deferred` | 25,600 B | **24,080 B (23.52 KiB)**: image kind 9,526 B, instrument (panel, marks, ledger bridge, both languages) 13,419 B, one shared chunk 1,135 B. Headroom 1,520 B (5.9%) |
| `T1.requests` | 3 | 3 in the build (kind, instrument, shared). **In the published tree the same open is 8 module requests** (the five kind files and the three instrument files); the idle tier serves them from the cache after activation |
| `T1.tier` | 0 B first visit; 138,331 B idle | first visit +0 B; the closure's source is 34,976 B gzipped in the idle tier. Production needs one `IDLE_TIER` group, "image measurement", covering `js/dataKinds/{contract,limits,planes,grid,draft}.js` and the instrument's files |
| `T2.point` | p95 <= 0.5 px, all refined | p95 **0.07201 px**, median 0.02618, max 0.1481, 300 of 300 refined. By peak signal to noise: 20 to 40 p95 0.09121, 40 to 80 0.05479, 80 to 200 0.03206. The stated uncertainty covered the error at 0.7033 (1 sigma, a normal gives 0.683) and 0.97 (2 sigma, 0.954) |
| `T2.circle` | p95 <= 2% | p95 **0.29%**, median 0.030%, max 1.19%; 148 of 150 refined, 2 refused (one disc of radius 15.18 px whose refined radius fell under the 15 px minimum, one faint dark spot with no edge found), counted as infinite error; centre p95 0.2223 px |
| `T2.keyboard` | every trial in bound | worst point 0.05259 px, worst circle 0.28%, 12 and 6 trials; the hand placement alone was within 0.943 px |
| `T2.pointer` | every trial in bound | worst point 0.05271 px, worst circle 0.27%; the touch tap, then the pad, was within 0.9759 px |
| `T3.keyboard` | all operations, 0 pointer events | place, nudge, read, edit, delete on all 6 kinds, the scale set from a reference pair, refine and undo; 0 failures, 0 pointer events |
| `T3.pointer` | all operations, 0 key events | the same by touch taps and buttons; 0 failures, 0 key events |
| `T3.announce` | 1 per commit | 85 commits in 123 actions, none with the wrong number of messages, no lost focus; axe-core (its default rule set, WCAG and best practice) found no violation at all with marks present |
| `T3.sequence` | by both paths | tag kept, copy forward, previous frame unchanged, the missing-tag note; 0 failures both ways |
| `T4.record` | 0 problems | 31 quantities, `validateArtifact` 0 problems; uncertainty kinds `sigma` and `assumed`; the scale 7.897 +/- 0.007 km/px against 7.897 truth |
| `T4.replay` | bit-identical | same marks, refinement bit-identical, a changed pixel refused with `image-changed` |
| `T4.sequence` | frame index and time | 2 frames, UTC named, replays |
| `T5.undo` | 0 failures | 0 in 8,840 state comparisons over 200 random sequences (undo then redo) |
| `T5.determinism` | same bits | 0 mismatches over 10 repeats, reordered, and a fresh module instance (in-process: no stored digest, no claim across Node versions) |
| `T6.interaction` | p95 of 20 | key 1.1/15 ms, place 2.3/28, edit 1.8/90, delete 1.7/90, undo 2.4/104; paint p95 35.5/100 ms at its worst; 1,024 px, 50 marks, 375 x 812, CPU x4 |
| `T6.sequence` | 500 ms | frame change p95 152.3 ms (painted by 173.5 ms) |
| `T7.time` | 2,000 ms | decode 19.3 ms in a Worker x 4 + draw 252.7 ms throttled = 329.9 ms |
| `T7.memory` | 67,108,864 B | counted 37,748,736 B (plane 33,554,432 + the drawn copy); the page's heap and buffers peaked 49,415,427 B above their start; the unchanged `npm run probe:decoded` realm peaks stayed within 1.25 x file plus plane |

The negative cases (informational, as committed): 40 of 40 refused for a faint source, a one-pixel spike, a source on the frame edge and a click 4 to 12 pixels from any source; a blend closer than one FWHM is not refused but measured at its centre of light (40 of 40 inside 0.5 px of it). Nothing was answered confidently wrong.

### What the first run said (disclosed, not hidden)

The prototype as first written failed `T6.interaction` on its first run: it rebuilt all 50 table rows on every change. The placement handler's p95 was 29.7 ms against 28, the placement paint 249.4 ms, the delete paint 113.9 ms, the undo paint 108.6 ms (load 4.7 to 5.3). The prototype was changed, not a threshold: rows are kept between renders (a placement adds one row, a deletion removes one) and the table is fixed-layout; then everything was measured again, and the numbers above are that run. One more correction: the first draft of the driver also required the frame change to be painted within 100 ms, which the committed text asks only of key, tap, edit, delete and undo; the frame change is judged at 500 ms as committed (its paint, 173 ms, is reported). Two frames generators were also corrected when they, not the instrument, were wrong (the crater features were too faint on the disc's own photon noise and could sit within 40 pixels of each other); no bound moved.

### What A does not say

- **The lunar frame is not measured.** No public-domain lunar frame is in the repository and nothing is downloaded without Carl's permission. Everything above is on frames the generator made from a seed, with their truth manifests. To run that leg, Prompt 179 (or this gate again) needs one specific public-domain lunar image, named by Carl with its source and licence, committed as a fixture: it would measure decode and draw on a real frame and the repeatability of a circle mark, with no truth to compare against.
- **The margin on bytes is thin.** 24,080 of 25,600 B is a prototype: it has no sidecar reader, no calibration notes, no polygon area, no pack plumbing, and its Spanish is unread by a fluent reader. A production instrument that grows by 1,520 B (6%) fails `T1.deferred` on Node 24 here; CI's Node 20 gzips differently (the checkpoint says about 1.3 KB smaller). Everything past the first slice needs a granted allowance (D-R10-35).
- **The instrument cannot import `js/interaction.js` or `js/notify.js` on the Observatory route.** Both pull `js/i18n/index.js` and every interface catalog: the first measurement of the instrument was 81 KiB, not 23.5, for that reason alone. The prototype takes the page's own `announce` as a hook (as `createImageView` does) and writes the settle rule and the nudge sizes out; a test holds the sizes equal to `js/shortcuts.js`. Prompt 179 must do the same or move the helpers.
- **The tree is not the build.** The published site is the unbundled tree: opening an image observation there is 8 module requests, the "at most 3" being a build figure. The idle tier makes them cache hits after activation; the first open before that is not.
- **The FITS reader is outside the instrument** (6,378 B gzipped beside it, measured, not counted); a consumer that imports its own file pays for 188.
- **Not run:** Node 20, Firefox, WebKit, a real phone, Windows, a screen reader (axe and the live-region counts are not a listening test), the throttled profile on any machine but this Mac under a load of 4.4 to 5.3, and the Worker pool (the decode was timed in a Worker of its own, the CPU throttle does not slow a Worker, and the factor 4 is a stated assumption).

### The consumers, with the verdict applied

Verdict A: every consumer is served by the tested scope.

| Consumer | Under A |
| --- | --- |
| 179 marks, scale, time, ledger | builds the whole instrument, including the sequence navigator, refinement and the 2,048-pixel frame under `displayPlan` |
| 180 to 187, 189 | **not removed**; each is still under its own run condition and its own gate where it has one (187). This gate tested the marks instrument, not photometry, registration, detection or orbit fitting, and does not authorize their science |
| 191 image items, 193, 194, 195, 197, 212, 215, 217, 220, 228, 230, 249, 250, 283 | their image branches stay in; none takes its C alternative |
| 188 and 157's reader | unchanged (import without measurement) |

A C would have removed Appendix C's list above and a B only the slice it names. Neither applies.

### Decisions for Carl

1. Ratify the thresholds and the verdict (D-R10-48, DELEGATED), or amend. A reset threshold is his alone.
2. Name a public-domain lunar frame (source and licence) if the authentic-data leg is wanted before 179 claims anything about real images.
3. The idle group "image measurement" (D-R10-36 recommended it): Prompt 179 adds the one `IDLE_TIER` entry; the first-visit tier stays at 18 B of room.
4. Whether the 25.0 KiB first slice, which A uses to 94%, is to be raised for 179 now or when it overruns (a ceiling increase is Carl's).
