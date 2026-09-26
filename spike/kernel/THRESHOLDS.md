# Scientific kernel gate: thresholds, fixed before the measurements

Committed to `spike/scientific-kernel-wasm-gate` before `bench.mjs` is run for
the record, as Prompt 21 requires. The verdicts in SCIENTIFIC_KERNEL_GATE.md
are these rules applied to what the bench measured. A threshold is not moved
after a measurement is seen.

## The two workloads

- **Compute-heavy:** the generalized Lomb-Scargle power over a frequency grid
  (`js/measure/periodogram.js`), N × M sums. The case is N = 1,882 (the TESS
  light curve) and M = 20,000, which is the largest the production limits
  allow for that N.
- **Data-heavy:** box least squares for a grid of trial periods: fold, bin
  (a scatter into memory), then scan every box. The case is N = 1,882,
  12,000 periods and 3 durations.

## The three approaches

1. **baseline:** the production JavaScript as it is.
2. **optimized JavaScript:** the best JavaScript form of the same algorithm,
   run on the main thread or in a Worker.
3. **WASM:** a purpose-built kernel of the same algorithm, or a vetted WASM
   scientific component.

## The profiles

- Chromium, Firefox and WebKit, each unthrottled.
- Chromium with the CPU throttled 4× (DevTools' low-end mobile): this is the
  low-end profile.

## A WASM kernel is A for a workload only if all of these hold

1. **Speed:** its steady-state median is at least **2.0×** faster than the
   optimized JavaScript form of the same algorithm, in each of the four
   profiles.
2. **Cold cost:** the module is at most **16 KiB**, and compile plus
   instantiate takes at most **16 ms** on the low-end profile.
3. **Correctness:** every output is within **1e-12 relative** of the direct
   reference formula. It is either bitwise identical to the optimized
   JavaScript in every engine, or the difference is measured and stated.
4. **Cancellation:** one call, the unit of work between the page's yields,
   takes at most **16 ms** on the low-end profile at the teaching size.
5. **Engines:** it runs in all three without flags, and without
   SharedArrayBuffer or threads.
6. **Toolchain:** it can be built and reviewed in the repository without a
   dependency Carl has not approved. **If this alone fails, the verdict is B
   at most, never A.**

**B:** criteria 2 to 5 hold and either the speedup is between 1.3× and 2.0×,
or only criterion 6 fails. **C:** anything else, and the workload stays
JavaScript.

## Optimized JavaScript replaces the baseline in production if

- it is at least **1.5×** faster on the low-end profile;
- every output is within **1e-12 relative** of the direct formula.

## A workload moves to a Worker if

- a teaching-size run would block the main thread for more than **100 ms** on
  the low-end profile;
- and the transfer, measured as total time minus the Worker's own compute,
  is at most **10%** of the compute.

## A vetted WASM scientific component is A only if

- what the workload needs of it downloads in at most **256 KiB**;
- its license is compatible with MIT and CC BY 4.0;
- it passes criteria 3 to 5 above.
