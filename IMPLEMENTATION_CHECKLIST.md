# Implementation checklist

A live record for one multi-stage work package. Each stage lists what it must
deliver, what has actually been done, the checks that were run with their real
results, and what is still missing. It is written so that work can be picked up
from this file alone: current stage, files touched, commands, blockers, next
action.

Two packages, in order:

- **A. Listening to spacetime** - a gravitational-wave learning experience.
  Stages 1-6.
- **B. Stars** - a shared stellar-model foundation, a Stellar Lab, and two
  investigations. Prompts 1-5. Not started; **A** must be integrated first.

Conventions used below:

- **done** - implemented, wired, and covered by a check that was run.
- **partial** - implemented but not yet reachable by a student, or not covered.
- **blocked** - waiting on something named, with the blocker written down.
- Deferred checks are listed as deferred. They are never described as passed.

---

## Package A - Listening to spacetime

### Dependencies

```
Stage 1 (contract)  ->  Stage 2 (lab + signal)  ->  Stage 3 (wave overlay)
                                |                        |
                                +--> Stage 4 (audio) <---+
                                            |
                    Stage 5 (real data) ----+--> Stage 6 (24-step lesson)
```

Stage 6 cannot be authored before Stages 2-5 exist, because every step names a
real control, a real measurement, or a real dataset.

### Acceptance criteria

| # | Criterion | Where it is checked |
|---|-----------|---------------------|
| A1 | Waveform model reproduces published closed-form limits (chirp mass, `f(tau)`, ISCO, amplitude scaling) against independently computed reference values | `tests/gwWaveform.test.js` |
| A2 | Sandbox physics, sandbox audio and merger ripples are unchanged and still labelled illustrative | `tools/physics-checks.mjs`, `tests/` |
| A3 | One canonical timeline drives plots, audio, source phase and captures | `tests/gwTimeline.test.js` |
| A4 | Audio is generated from the signal at a signal sample rate, never from the animation loop | `tests/gwAudio.test.js` |
| A5 | No audio without an explicit user gesture; no duplicate merger audio | `e2e/gwAudio.spec.js` |
| A6 | Wave overlay is transverse, phase-tied to the timeline, and bounded in cost | `tests/gwOverlay.test.js` |
| A7 | Real GW150914 data is bundled with full provenance and verified checksums | `tools/build-gw-data.mjs --check` |
| A8 | The 24-step lesson completes in EN and ES, by keyboard, with audio off | `e2e/gwLesson.spec.js` |
| A9 | Budgets hold without being raised for anything that should have been deferred | `npm run budget:check` |

### Stage 1 - Audit and scientific contract

- [x] Audit `js/audio.js`, merger events, ripple rendering, compact-object
      scenarios, observing panels, charts, event pause, A/B bench, notebook,
      share/save, investigation authoring, classroom activities
- [x] Confirm the two things that must not be relabelled: sandbox audio is
      designed sonification (`quantizeMidi`, a minor pentatonic scale), and the
      sandbox inspiral is `orbit_decay_rate` damping
- [x] Confirm the duplicate-merger-audio defect exists
- [x] Write the model specification: `GRAVITATIONAL_WAVES.md`
- [x] Confirm real data is obtainable and small enough

### Stage 2 - The lab and the synchronized signal

**Model layer: done.** Pure, tested, and in the domain layer.

- [x] `js/gw/waveform.js` - closed-form leading-order inspiral, ISCO
      termination, velocity parameter, fidelity band, effective distance
- [x] `js/gw/timeline.js` - the canonical timeline. Two implementations
      (`modelTimeline`, `sampledTimeline`), one shape. `envelope()` is O(buckets)
      and resolves a bucket analytically when it holds a whole cycle, so a
      158-second neutron-star inspiral draws into 900 buckets in 1.3 ms
- [x] `js/gw/fft.js`, `js/gw/noise.js` - radix-2 transform; seeded coloured
      noise from the published Advanced LIGO design curve
- [x] `js/gw/audioRender.js` - buffers filled by evaluating the timeline at the
      device rate. Two speed modes, both described in the returned `mapping`;
      pitch-preserving stretch is exact for an analytic phase
- [x] `js/gw/match.js` - normalised overlap ("similarity", never SNR), plus
      whitening and a Tukey taper
- [ ] The lab panel itself: presets, controls, plots, source view, transport
- [ ] Notebook capture and the comparison contract
- [ ] Share/save of the GW configuration

**Findings recorded during Stage 2**

- A 65 solar-mass binary is at `v/c = 0.27` when it enters band at 20 Hz. The
  leading-order model is never in its own "reliable" band for a heavy binary
  black hole inside LIGO's band. Documented, tested, and made into the subject
  of lesson step 18 rather than hidden.
- Its ISCO is 67.7 Hz, so an inspiral-only model covers ~24 cycles and 0.81 s.
  This is why the merger comes from the published reconstruction.

### Stage 3 - Continuous wave visualization
### Stage 4 - Audio that explains itself

### Stage 5 - Authentic observational evidence

**Data: done, ahead of order.** Fetched while the network was reachable.

- [x] `tools/build-gw-data.mjs` + `npm run gw:data` / `npm run gw:check`
- [x] `js/data/gw/gw150914.js` (23.0 KB) - eight published traces: observed
      strain H1/L1, numerical-relativity reconstruction H1/L1, residual H1/L1,
      Keplerian separation, post-Newtonian velocity
- [x] `js/data/gw/README.md` - full provenance, per-file SHA-256, licence,
      attribution, every processing step and every step deliberately not taken
- [x] The build **measures** the H1/L1 lag and sign and records them as
      findings rather than applying them: as published the observations
      correlate at -0.757 with a 7.3 ms lag. The lesson asks a student to find
      that; applying it silently would delete the thing being taught
- [x] The build refuses to decimate a trace that would alias, and re-measures
      it every run
- [ ] Wiring the data into the lab
- [x] **GW170817: blocked, recorded.** No small published figure-data product;
      only 72-77 MB strain files needing a Welch PSD, a whitening filter and a
      Q-transform in the build. Written up in `js/data/gw/README.md`. Not
      approximated, not faked.

### Stage 6 - The 24-step investigation

---

## Package B - Stars

Not started. Recorded here so the dependency order is not lost.

| Prompt | Deliverable | Depends on |
|--------|-------------|------------|
| B1 | Shared stellar-state representation and curated MIST subset | - |
| B2 | Stellar Lab: H-R diagram, appearance, comparison, population | B1 |
| B3 | 28-step "A universe of stars" | B2 |
| B4 | Evolutionary playback and endpoint visuals | B2 |
| B5 | 34-step "Lives of stars" | B4 |

After B3, the first stellar investigation must be walked from launch through
evidence export before B4 begins.

---

## Deferred checks

Run only at the final integration checkpoint, after all stages are wired:

- `npm run e2e` (full source browser suite)
- `npm run e2e:dist` (full production-build browser suite)
- `npm run release:check`

Nothing in this package is to be pushed or deployed.

## Current position

**Stage 1 complete. Stage 2 model layer complete. Stage 5 data complete.**

Checks run at this point, with results:

| Check | Result |
|-------|--------|
| `jest tests/gw*` | 161 passed, 5 suites |
| `eslint` on the new files | clean |
| `prettier --write` | applied |
| `node tools/check-architecture.mjs` | OK, 238 modules, no cycles |
| `node tools/build-gw-data.mjs --check` | GW150914 data is current |

Next action: the lab panel - presets, bounded controls, strain and frequency
views, the schematic source, and the transport, as a deferred widget family.
