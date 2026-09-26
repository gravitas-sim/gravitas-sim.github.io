# The scientific numerical kernel and WebAssembly: gate

**Status: decided under delegation, not reviewed.** Carl asked for the roadmap
to run in order while he was away, with each gate decided on its
recommendation. These verdicts are the committed thresholds applied to the
measurements; nobody has reviewed them. Each names the evidence it rests on
and the condition that would reverse it.

| Workload | A WebAssembly kernel | Optimized JavaScript in place of the production loop | A Worker |
|---|---|---|---|
| **GLS period search** (compute-heavy) | **C**. 1.0× to 2.0× the speed of the same algorithm in JavaScript, where 2.0× in every profile was the bar; 11× slower in Playwright's Firefox | **Not as written.** It is 11× to 13× faster on the low-end profile, but 1.5 × 10⁻¹⁰ from the direct formula where the bar was 10⁻¹², and the direct formula itself, reordered, differs from itself by 3.5 × 10⁻¹⁰. **Carl's call:** a tolerance that the formula can meet | **No** |
| **BLS transit search** (data-heavy) | **C**. From 0.58× (slower) to 1.9× the JavaScript, depending on the engine and the processor | **Yes.** 3.1× to 3.6× faster on the low-end profile, bit for bit the same in every engine | **No** |
| **A vetted WASM component** (Pyodide with astropy) | **C**. 16.8 MiB for the two algorithms, where the bar was 256 KiB | n/a | n/a |

**No workload merits production WebAssembly.** Prompt 22 does not run. Prompt
23 continues in JavaScript, as the roadmap allows when every workload is C.
The one change this gate recommends is in JavaScript: the BLS loop's
reorganized form, which gives the same bits faster.

**Base:** `v2` at `e5a26d4` (#69, Prompt 20, merged; green).
**Prototype:** branch `spike/scientific-kernel-wasm-gate`, in
[`spike/kernel/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/ffa3fa2/spike/kernel).
It is disposable and will not merge. This PR is the decision record only.
**Thresholds:** [`spike/kernel/THRESHOLDS.md`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/a7d9af1/spike/kernel/THRESHOLDS.md),
committed and pushed as `a7d9af1` at 06:35 CDT. That was before any timing
was taken: first a smoke run on a loaded machine, which is not quoted, then
the recorded runs eight hours later. No threshold has moved since.

---

## The question

Gravitas's numerical tools all run in JavaScript. Would any of them be better
as a WebAssembly kernel, a small one written for the purpose or a vetted
scientific library compiled to WebAssembly? The roadmap asks this before any
kernel is built, and asks for the answer per algorithm, measured, with the
bar fixed first.

The comparison has three sides, not two. A WebAssembly kernel is usually a
new algorithm as well as a new language: it avoids allocation, uses flat
typed arrays and hoists work out of the inner loop. The same reorganization
in JavaScript can take most of the gain. So each workload is measured three
ways:

- **baseline:** the production JavaScript loop, as it runs today.
- **optimized JavaScript:** the best JavaScript form of the same algorithm.
- **WASM:** the same arithmetic, in the same order, as the optimized JavaScript, so any difference is the language and not the algorithm.

## Where the numbers are spent

Every numerical loop in the tree that can run for longer than a frame, taken
at `e5a26d4`:

| Workload | Where | Cost | Runs on | Cancel |
|---|---|---|---|---|
| **Period search, GLS** (Prompt 20) | `js/measure/periodogram.js` `searchPeriod` | N × M, two trigonometric calls a point a frequency; up to 20,000 points, 50,000 frequencies, 4 × 10⁷ point-frequencies | main thread, yielding every 12 ms | AbortSignal between yields |
| **Transit search, BLS** (Prompt 20) | `periodogram.js` `searchBox` | trials × (N fold + bins × durations), two arrays allocated a trial | main thread, yielding | AbortSignal |
| **Transit fit** (Prompt 16) | `js/inference/fit.js` | Levenberg-Marquardt with a forward-difference Jacobian; each evaluation is N rows × supersamples × 64 limb-darkening annuli, in transit only | a Worker a task (`inferenceWorker.js`) | `terminate()` |
| **Profile likelihoods** (Prompt 16) | `js/inference/run.js` | 17 re-fits a free parameter | up to 5 Workers | `terminate()` |
| **Grid seeds** (Prompt 16) | `js/inference/infer.js` `boxSearch`, `sinusoidSearch` | BLS again; 3 × 3 normal equations a frequency | the fit's Worker | `terminate()` |
| **Experiment ensembles** (Prompt 14) | `js/experiments/trialRunner.js` | frames × substeps of the whole engine, up to 400 trials | a Worker a trial | `terminate()` |
| **The simulation** | `js/physics.js` | direct forces, O(N × sources), every substep; about 930 bodies in Galactic Collision; Barnes-Hut optional | main thread (the tree in `physicsWorker.js`) | n/a |
| **Q-scan, PSD, match** | `js/gw/qscan.js`, `psd.js`, `match.js` | one FFT and 48 inverse FFTs of 4,096 to 8,192 points | main thread, memoized | none |
| **RV period search and Monte Carlo** | `js/rvFit.js`, `js/rvUncertainty.js` | 20,000 frequencies × N; up to 2,000 trials × 2,000 grid points × N | main thread; the Monte Carlo yields | the Monte Carlo only |

And what is coming:

| Prompt | Need | Shape |
|---|---|---|
| 23 | sensitivity sweeps, bootstrap, model comparison | many re-runs of the fit and the searches: embarrassingly parallel, and one Worker a run already serves it |
| 34 to 36 | 3-D small-N dynamics, in a Worker | an integrator's force loop: compute-heavy, short arrays |
| 38 | Lambert solver, patched conics | scalar root-finding in microseconds: no kernel question |
| 39 | ephemeris packs | Chebyshev evaluation: cheap; heavy only in download |

Two workloads stand for these:

- **GLS**, the compute-heavy one: dense arithmetic over short arrays. So are the fit's model evaluation, the RV search and a 3-D force loop.
- **BLS**, the data-heavy one: a scatter into memory, then a scan. So are the grid seeds and an ensemble's histogram.

## The corpus and the bar

Both workloads are taken at the largest size production allows for the TESS
light curve of HD 209458 (N = 1,882):

- **GLS:** 20,000 frequencies;
- **BLS:** 12,000 trial periods and 3 durations.

The data are synthetic, from a seeded generator, so every engine and machine
gets the same bits. What each form computes:

| Form | GLS | BLS |
|---|---|---|
| baseline | `power1` of `periodogram.js`: `Math.cos` and `Math.sin` at every point and frequency (without its per-frequency result object and its clamp to [0, 1]) | `atPeriod` of `periodogram.js`: two arrays allocated a trial, the phase by `((x % 1) + 1) % 1` |
| optimized JavaScript | cos and sin by rotation, `c' = c cd − s sd`, re-seeded with the exact values every 512 frequencies; `sin²` from `1 − cos²` | the bins allocated once and reused, the phase by `x − floor(x)`, the weighted residuals computed once |
| WASM | the optimized JavaScript's arithmetic, in its order | the same |

The bar, from `THRESHOLDS.md`. A WebAssembly kernel is **A** only if **all six**
hold:

1. **Speed:** at least 2.0× faster than the optimized JavaScript, in every profile.
2. **Cold cost:** at most 16 KiB, and at most 16 ms to compile and instantiate on the low-end profile.
3. **Correctness:** within 10⁻¹² relative of the direct formula, and bit for bit the same as the JavaScript or with the difference stated.
4. **Cancellation:** one call at most 16 ms on the low-end profile.
5. **Engines:** all three, with no flags and no shared memory.
6. **Toolchain:** buildable and reviewable with no dependency Carl has not approved.

**B** needs criteria 2 to 5, and either a speedup between 1.3× and 2.0× or
criterion 6 alone failing. **C** is anything else.

Optimized JavaScript replaces the baseline if both hold:

- it is at least 1.5× faster on the low-end profile;
- it is within 10⁻¹² relative of the direct formula.

A workload moves to a Worker if both hold:

- a run would block the main thread for more than 100 ms on the low-end profile;
- the overhead is at most 10% of the compute.

## The machine and the profiles

GitHub-hosted runners, 4 vCPUs and 16 GB, Ubuntu. The machine the prototype
was written on was running other work, and a timing under load is not one. A
runner is quiet, the same for anyone who re-runs it, and citable by its run
id. The workflow lives only on the spike branch
([`kernel-bench.yml`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ffa3fa2/.github/workflows/kernel-bench.yml)).

It ran twice, and the two runs drew different processors:

- **run 1** ([36266053198](https://github.com/gravitas-sim/gravitas-sim.github.io/actions/runs/36266053198)):
  an AMD EPYC 9V45 (Zen 5);
- **run 2** ([36266614923](https://github.com/gravitas-sim/gravitas-sim.github.io/actions/runs/36266614923)):
  an AMD EPYC 7763 (Zen 3), about half as fast. This run also launched
  Playwright's Firefox directly.

Both are reported, because they do not agree, and how they disagree is a
finding. The artifacts are committed under
[`evidence/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/ffa3fa2/spike/kernel/evidence),
one directory per run.

The profiles:

| Profile | Engine |
|---|---|
| chromium | Chromium 151.0.7922.34, as Playwright ships it |
| chromium-4x | the same, with DevTools' CPU throttling at 4× (low-end mobile). **This is the low-end profile** |
| firefox | Firefox 153.0, Playwright's build, a Nightly |
| webkit | WebKit 26.5, Playwright's build |
| *release Firefox* | *Firefox 156.0, the runner's own, launched with no automation protocol (`direct.mjs`); reported beside the four, not in place of one* |

How the numbers were taken:

- **Timings:** each is the median of 5 runs after a warm-up, taken in each
  of 3 rounds. The tables give the median of those three medians. A Worker
  run is one cold run in each round.
- **Load:** the one-minute load average was recorded before and after every
  profile. It never exceeded 1.6 on 4 vCPUs, so no round was set aside.
- **Clocks:** without cross-origin isolation, Firefox and WebKit report
  `performance.now()` in whole milliseconds, and Chromium in tenths. A 0 in
  their columns means less than a millisecond.

## The measurements

**The speedups.** WASM ÷ JS is how much faster the WebAssembly is than the
same algorithm in optimized JavaScript: above 1 is faster. JS ÷ baseline is
how much faster the optimized JavaScript is than the production loop.

| Profile | GLS WASM ÷ JS, run 1 | run 2 | BLS WASM ÷ JS, run 1 | run 2 | GLS JS ÷ baseline, run 1 | run 2 | BLS JS ÷ baseline, run 1 | run 2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| chromium | **1.46×** | **1.75×** | **0.58×** | **1.08×** | 13.1× | 12.8× | 3.64× | 3.06× |
| chromium-4x | **1.47×** | **1.84×** | **0.58×** | **1.15×** | 13.2× | 11.4× | 3.55× | 3.08× |
| firefox (Playwright's Nightly) | **0.08×** | **0.09×** | **0.21×** | **0.17×** | 8.6× | 9.2× | 1.23× | 1.39× |
| webkit | **1.00×** | **1.16×** | **1.29×** | **1.49×** | 20.8× | 15.7× | 2.65× | 2.87× |
| *release Firefox 156* | *1.64×* | *1.98×* | *1.92×* | *1.86×* | *10.5×* | *9.9×* | *1.31×* | *1.44×* |

(The release Firefox figures are the medians of three direct launches.)

Within a run the ratios hold steady from round to round; the GLS ratio in
WebKit was 1.02, 1.00 and 1.00 in run 1. Between the runs they move, by up to
2× for BLS in Chromium: it is 0.58× on Zen 5 and 1.08× on Zen 3. So how much a
kernel gains depends on the reader's processor as well as the reader's
engine.

**The times on the low-end profile:**

| | GLS, run 1 | GLS, run 2 | BLS, run 1 | BLS, run 2 |
|---|---:|---:|---:|---:|
| baseline | 4,225 ms | 8,241 ms | 1,276 ms | 3,187 ms |
| optimized JavaScript | 321 ms | 726 ms | 359 ms | 1,033 ms |
| WASM | 218 ms | 394 ms | 617 ms | 902 ms |
| one call (512 frequencies; 16 periods) | 6.1 ms | 10.6 ms | 1.0 ms | 1.1 ms |

Every other profile's times are in each run's `kernel-verdict.txt` and
`kernel-bench.json`.

**Cold cost, on the low-end profile:**
- the module, both kernels, is **1,120 bytes**;
- it compiles in 1.2 ms (run 1) or 1.8 ms (run 2);
- it instantiates in 0.1 ms;
- its memory is two 64 KiB pages.

## The verdicts, criterion by criterion

| | GLS kernel | BLS kernel |
|---|---|---|
| 1. Speed, 2.0× everywhere | **fails**: at best 1.98× (release Firefox, run 2); 1.00× and 1.16× in WebKit; 0.08× and 0.09× in Playwright's Firefox | **fails**: at best 1.92× (release Firefox); 0.58× in Chromium in run 1 |
| 2. Cold cost | passes: 1,120 bytes, 1.3 to 1.9 ms | passes |
| 3. Correctness | **fails as written**: bit for bit the optimized JavaScript in every engine, but that is 1.5 × 10⁻¹⁰ from the direct formula (below) | passes: bit for bit, all forms, all engines |
| 4. One call | passes: 6.1 and 10.6 ms | passes: 1.0 and 1.1 ms |
| 5. Engines | passes: all three, no flags, no shared memory | passes |
| 6. Toolchain | passes, narrowly: hand-encoded, no dependency (below) | passes, narrowly |
| **Verdict** | **C** | **C** |

The B band needs a speedup of at least 1.3× in every profile. Neither kernel
has one:

- **GLS:** WebKit gives 1.00× and 1.16×.
- **BLS:** Chromium gives 0.58× and 1.08×.

So neither verdict depends on which Firefox is counted, on which runner is
believed, or on the correctness question. Take release Firefox instead of
Playwright's, the faster runner's ratios, and correctness waived, and both are
still C.

What the speedups say:

- **The language is not where the time goes.** In WebKit the WebAssembly is
  no faster than the same JavaScript, or 16% faster.
- **The algorithm is.** Computing cos and sin by rotation, instead of two
  trigonometric calls a point, makes GLS 11× to 21× faster. The WebAssembly
  adds 1.0× to 2.0× on top of that, and the 2.0× is release Firefox's.
- **BLS in WebAssembly can be slower.** It is 0.58× in Chromium on the Zen 5
  runner. The kernel is hand-scheduled stack code; a compiler might schedule
  it better. This gate measures what exists.

## Optimized JavaScript, and a tolerance no reformulation can meet

**BLS: yes.** The reorganized loop gives the production loop's bits exactly,
at every one of the 12,000 periods, in every engine and on both machines
(digest `530fe7a650f06eb0` throughout). It is 3.55× and 3.08× faster on the
low-end profile. It replaces the baseline.

One caution for whoever does it. The two phase expressions, `((x % 1) + 1) %
1` and `x − floor(x)`, are not quite the same function. For x below 1, the
points in the series' first cycle, the first one rounds the phase to a
multiple of 2⁻⁵². So a point there that falls within nb × 2⁻⁵³ of a bin edge
can land in the next bin: about one such point in 10¹³. That never happened
in this corpus. The production change should keep the production expression,
so the two are the same by construction, and should measure what that
costs.

**GLS: not as written.**
- **Speed:** the rotation is 11× to 13× faster on the low-end profile, where
  1.5× was the bar.
- **Accuracy:** its largest difference from the direct formula is
  1.54 × 10⁻¹⁰ relative, where 10⁻¹² was the bar.
- **The verdict:** the threshold is not moved after a measurement, so the
  baseline stays.

But the direct formula cannot meet that tolerance against itself.
[`conditioning.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ffa3fa2/spike/kernel/conditioning.mjs)
computes it two more ways that are the same algebra, differing only in the
order of one product, 2πft:

| Against the baseline's order, `2π·f·t` | Largest relative difference | at a power of | 99th percentile | median | largest difference ÷ peak power |
|---|---:|---:|---:|---:|---:|
| the direct formula, `2π·(f·t)` | 2.60 × 10⁻¹⁰ | 3.3 × 10⁻⁸ | 6.6 × 10⁻¹² | 4.6 × 10⁻¹³ | 1.8 × 10⁻¹⁴ |
| the direct formula, `(2π·t)·f` | 3.45 × 10⁻¹⁰ | 3.3 × 10⁻⁸ | 6.6 × 10⁻¹² | 4.7 × 10⁻¹³ | 3.5 × 10⁻¹⁴ |
| the rotation, re-seeded every 512 | 1.41 × 10⁻¹⁰ | 2.5 × 10⁻⁷ | 8.8 × 10⁻¹² | 5.9 × 10⁻¹³ | 2.7 × 10⁻¹⁴ |

(Node 24, the bench's data; the peak power is 0.97. The bench's own baseline
sums in a slightly different order again, and against it the rotation's
largest difference is the 1.54 × 10⁻¹⁰ above: the same effect.)

The rotation is inside the formula's own spread. The largest relative
differences all fall where the power is nearly zero. There the power is a
difference of nearly equal sums, and the relative error is their rounding
divided by almost nothing. **A relative tolerance of 10⁻¹² on every output
could be met only by a bit-for-bit copy of the baseline.** That was a
mis-specified threshold, fixed before the measurements that showed it.

**The reversal condition, for Carl.** State GLS correctness against the
formula's own conditioning, for example either of:

- every output within 10⁻¹² of the peak power, the same peak frequency, and
  the same false-alarm probability to 10⁻¹²;
- a difference no larger than the spread of equivalent direct evaluations.

Then the rotation passes, at 2.7 × 10⁻¹⁴ of the peak, and a GLS eleven times
faster becomes available to Prompt 23. It would also need the ordinary tests:

- the same peak and the same false-alarm probability on every Prompt 20
  fixture;
- a digest per engine, so that a change is visible.

## Workers

Neither search moves to a Worker.

**Blocking, the first condition, is not met.** Both searches already yield to
the page every 12 ms, so no run blocks the main thread for more than a frame.
What a Worker would buy is the main thread's time back, not
responsiveness. On the low-end profile, the optimized forms hold the main
thread for 0.3 to 1.0 s of busy time, and the GLS baseline for 4 to 8 s.

**The overhead, the second condition, straddles the bar.** The bar is 10%. The
overhead is the total time minus the Worker's own compute; for a one-shot
Worker most of it is start-up and fetching the module, not the copy. Each
figure is the median of the three rounds' ratios (`verdict.mjs` divides the
medians instead, and gets 10.3% and 11.2% on the low-end profile in run 1, 8.6%
and 5.0% in run 2):

| Profile | GLS, run 1 | GLS, run 2 | BLS, run 1 | BLS, run 2 |
|---|---:|---:|---:|---:|
| chromium-4x (the bar's profile) | 12.2% | 9.0% | 11.1% | 5.7% |
| chromium | 10.5% | 7.2% | 9.0% | 3.8% |
| firefox | 13.7% | 9.1% | 10.4% | 6.9% |
| webkit | 7.3% | 6.1% | 6.5% | 4.5% |

`verdict.mjs` tests "blocks" as the total busy time. It says no for run 1 and
yes for run 2: the verdict turns on which runner is believed. On the reading
of "block" that matches how the searches are built, that they never block,
the answer is no for both runs.

**A caveat about the low-end row.** DevTools' CPU throttle did not reach the
Worker. Its compute on the 4× profile (92 and 170 ms) is its unthrottled
speed (87 and 160 ms). So the low-end overheads are unthrottled figures. On
a real low-end device the start-up and the compute both slow, and the ratio
should be about the same.

Prompt 23's ensembles are a different shape: many runs, each long. For them
the overhead is paid once a realm and is negligible, and the existing one
Worker a run is right.

## Firefox: Playwright's build and a reader's

Playwright's Firefox runs both WebAssembly kernels far slower than its own
JavaScript: GLS 11× to 12× slower, BLS 5× to 6× slower. Release Firefox 156
on the same runners runs them faster than its JavaScript (1.64× to 1.98×).
The difference is the build, not the automation:

- **Playwright's binary, bare:** launched with nothing attached (a fresh
  profile, no Juggler, `direct.mjs`), it is just as slow. Over three
  launches, GLS took 171 ms in JavaScript and 1,815 ms in WebAssembly (0.09×),
  and BLS 275 ms and 1,576 ms (0.17×).
- **Release Firefox, bare:** the same kind of launch is fast.

It behaves like a build whose WebAssembly stays in its baseline tier for a
function that is called few times and loops long. This gate did not diagnose
it further. Two consequences:

- **For the verdicts:** none. Both kernels are C with either Firefox.
- **For a production kernel:** its speed would depend on each engine's tiering
  policy, which changes between releases without notice. The JavaScript
  fallback exists for correctness; it would also be the protection against
  this. A kernel's calls should be many and short rather than few and long,
  which also suits cancellation.

## Determinism across engines and machines

SHA-256 of each output, first 16 hex digits, on the runner (Linux) and on the
machine the prototype was written on (macOS, Intel):

| Engine | GLS baseline | GLS optimized JS and WASM | BLS, all three forms |
|---|---|---|---|
| Chromium 151, Linux and macOS | `d23693d559727cf8` | `66212a4df3e50a9f` | `530fe7a650f06eb0` |
| Firefox 153 (Playwright's), Linux and macOS | `2eacd72e7ba75a0c` | `5619e4faf4a49fcf` | `530fe7a650f06eb0` |
| Firefox 156 (release), Linux | `2eacd72e7ba75a0c` | `5619e4faf4a49fcf` | `530fe7a650f06eb0` |
| WebKit 26.5, Linux | `5e70116192193834` | `5f60b93aacc3fee0` | `530fe7a650f06eb0` |
| WebKit 26.5, macOS | `55015a0d6d32c966` | `41196b5da8aaaadb` | `530fe7a650f06eb0` |

What this shows:

- **Within an engine, WebAssembly and JavaScript agree bit for bit.** The
  kernels' floating point is only `+ − × ÷`, `floor`, `trunc` and
  comparisons, beside integer index arithmetic.
  WebAssembly 1.0 defines each of these as IEEE 754 correctly rounded, with
  no fused multiply-add. The JavaScript does the same operations in the
  same order.
- **BLS is the same everywhere:** no transcendental function, so no
  engine's approximation enters.
- **GLS differs by engine, and in WebKit by operating system.** It calls
  `Math.cos` and `Math.sin`, which ECMAScript lets an engine approximate.
  V8 and SpiderMonkey carry their own portable implementation (fdlibm), so
  Linux and macOS agree. The same WebKit version gives different digests on
  Linux and macOS, as it would if JavaScriptCore called each system's math
  library. Release and Nightly Firefox agree.

For a saved pipeline that recomputes on another machine (Prompt 20), this is
the expected case. The read-back compares to a tolerance, and it should say
which engine made each number. Bit-for-bit GLS across engines would need a
portable sine and cosine of Gravitas's own, in JavaScript or in a kernel.
That is independent of WebAssembly.

## Cold load, memory, cancellation, offline, debugging

- **Cold load:** 1,120 bytes, and under 2 ms on the low-end profile.
  Negligible next to fetching the chunk that would carry it.
- **Memory:** the kernel's memory is 128 KiB after both workloads. The
  JavaScript forms allocate the same arrays: seven of N for GLS, and for BLS
  two of N and two of the largest bin count. At 20,000 points that is about
  1 MB, for either form.
- **Cancellation:** one call on the low-end profile is 6.1 to 10.6 ms (GLS)
  or 1.0 to 1.1 ms (BLS). A caller that checks its AbortSignal between calls
  stops within a frame, as the searches do now.
- **Offline:** a kernel's `.wasm` would be precached with its chunk, so it
  works offline exactly when the JavaScript does. The spike builds its bytes
  at run time, which needs nothing.
- **Debugging:** DevTools shows a kernel as disassembly, with numbered
  locals, and has no source map for it. The JavaScript forms step and
  inspect like any other code.

## The toolchain

The machine the prototype was written on has no way to compile to
WebAssembly:

- Apple's clang has no `wasm32` target.
- There is no Rust, Emscripten, AssemblyScript or wabt.
- The contract forbids installing any.

So the kernels were written the only way left: byte by byte, from a
120-line encoder of the binary format
([`wasm.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ffa3fa2/spike/kernel/wasm.mjs))
and an instruction list for each kernel
([`kernels.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ffa3fa2/spike/kernel/kernels.mjs)).

That passes criterion 6 as written: the kernels build with Node and nothing
else. It is also the least maintainable code this repository could hold:

- **What the code is:** stack code, with locals numbered by hand.
- **What goes wrong:** the first draft validated and trapped at once. One
  array nested a level too deep became a zero byte, and zero is
  `unreachable`. The encoder now refuses any value that is not a byte.
- **What catches a mistake:** that check, `WebAssembly.validate`, and the
  tests are the only things between a typo and a wrong number.

A kernel in C, Rust or AssemblyScript would be readable, and would need a
toolchain Carl has not approved. Either way, a speedup under 2× at best,
and none in WebKit, does not pay for it.

## A vetted component

The canonical one is Pyodide: CPython, NumPy, SciPy and astropy compiled to
WebAssembly. astropy has both algorithms, as
`astropy.timeseries.LombScargle` and `BoxLeastSquares`. These are the
published sizes of Pyodide 314.0.7 (Python 3.14.2), read from jsDelivr's
metadata and response headers. Nothing was downloaded or run.

| Piece | Bytes on the wire |
|---|---:|
| `pyodide.asm.wasm` (brotli) | 3,438,516 |
| `pyodide.asm.mjs` (brotli) | 262,041 |
| `python_stdlib.zip` | 2,505,313 |
| NumPy 2.4.6 | 2,960,568 |
| astropy 7.2.0, `astropy_iers_data`, `pyerfa`, `packaging`, `pyyaml` | 8,432,027 |
| **For `LombScargle` and `BoxLeastSquares`** | **17,598,465 (16.8 MiB)** |

The bar was 256 KiB. The component is 67 times over it before it computes a
number, and four times the app's whole deferred budget. It is **C** without
a benchmark.

No smaller vetted WebAssembly package does either algorithm. The nearest are
FFT libraries, and an FFT is a different algorithm (Press and Rybicki's
extirpolation), with its own approximation. It would not be a like-for-like
component, and `js/gw/fft.js` already exists.

## Shared memory and threads

None. A page gets `SharedArrayBuffer` only when it is cross-origin isolated.
That needs two response headers, COOP and COEP, which GitHub Pages does not
send and cannot be told to send. A service worker can forge them on its own
responses, but only once it controls the page, so a first visit loads twice.
Even then:

- **An embedded figure (Prompt 10) is never isolated,** because a frame is
  isolated only if the page around it is. So every embed would need the
  unshared path anyway.
- **COEP `require-corp` refuses cross-origin resources:** any fetched without
  CORS that carries no CORP header.

None of that is proven compatible, and the roadmap forbids shared memory until
it is. Parallelism stays what it is: one Worker a task, its data copied or
transferred.

## ABI, versioning and fallback

No kernel is accepted, so this is not frozen. It is the design the spike's
kernels already follow, and what Prompt 22 would have to prove if a later
gate reverses a verdict.

**The module.**
- One `.wasm` a kernel family, committed with the generator that wrote it,
  and a test that regenerates it and compares the bytes.
- It exports `memory` and its functions. It imports nothing: no JavaScript
  calls, no clock, no randomness.
- It allocates nothing. The caller lays out memory, grows it within the
  tool's limits, and passes lengths.

**The ABI.**
- **Arguments:** i32 lengths and f64 scalars.
- **Arrays:** f64 arrays at byte offsets fixed by the lengths, documented
  beside each function. For example, `gls(n, m, Y, YY)` reads `w, wy, c, s,
  cd, sd` (n each) and writes `power` (m).
- **Byte order:** little-endian, which WebAssembly memory is on every engine.
- **Results:** at most one f64 returned; anything else is written to memory
  after the inputs.
- **Versioning:** the ABI version is an exported constant. Any change to a
  signature or a layout bumps it, and the loader refuses a version it does
  not know. A change to a result, however small, bumps the tool's own
  version (Prompt 20's pipeline already records it).

**Identity.**
- A pipeline node would record `implementation: {kind: 'wasm' | 'js',
  kernel, abi, sha256}` beside the tool's version.
- A read-back that recomputes with another implementation says so, node by
  node, as it now does for another tool version. Nothing switches
  implementation silently.

**Fallback.**
- **The reference:** the JavaScript form of the same arithmetic is always
  shipped. Tests hold the kernel to it bit for bit, in each engine.
- **When the kernel runs:** only if all of these hold:
  - `WebAssembly` exists;
  - `WebAssembly.validate` accepts the bytes;
  - the module compiles;
  - a 64-point self-test at load matches the JavaScript exactly.

  Otherwise the JavaScript runs, and the node says so.
- **CSP:** a page whose CSP names `script-src` must allow
  `'wasm-unsafe-eval'`, or compiling throws. The Observatory's CSP names only
  `connect-src`, so compiling is allowed, and so is fetching a same-origin
  `.wasm`. A page that later tightens `script-src` gets the JavaScript, as
  designed, rather than a failure.
- **Where it runs:** in the tool's Worker if the tool has one, or between the
  page's yields. One call is the unit of work, bounded to a frame on the
  low-end profile.

## What would reverse each verdict

- **The GLS kernel (C → B):** a speedup of at least 1.3× over the rotation
  in every profile, on more than one processor. The obstacles are WebKit's
  1.00× to 1.16×, and the tiers each engine chooses. It would also need the
  tolerance question settled.
- **The BLS kernel (C → B):** a kernel at least 1.3× faster than the
  JavaScript in Chromium on both processors. It is 0.58× to 1.15× now. A
  compiled kernel might do better, but it would need a toolchain.
- **The vetted component (C):** a component under 256 KiB that does either
  algorithm. None is known.
- **Optimized GLS (not as written → yes):** Carl accepting a tolerance
  stated against the formula's conditioning, as above.
- **Workers (no → yes):** either of these:
  - Carl reading "block" as busy time, which makes run 2's overheads decide
    (yes) and run 1's (no): it is at the bar;
  - a workload that cannot yield.

  Prompt 23's long ensembles already run in Workers.

## What this means for the next prompts

- **Prompt 22 (production kernel):** skipped. Its run condition is a
  workload this gate accepts, and there is none.
- **Prompt 23:** continues in JavaScript. It may take up:
  - the reorganized BLS loop, which is the same bits faster, keeping the
    production phase expression;
  - the rotation GLS, only if Carl accepts the revised tolerance.
- **Prompts 34 to 36 (3-D):** the integrator's force loop has the shape of
  GLS's. This gate's evidence says to write it as tight JavaScript in a
  Worker first, and to measure any kernel against that, not against today's
  code, on more than one processor.
