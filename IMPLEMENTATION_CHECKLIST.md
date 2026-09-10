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

- [x] The lab panel: three presets, five bounded controls, transport, strain
      (full span and close-up), frequency, schematic source, pinned comparison,
      similarity, notebook capture
- [x] Notebook capture through the shared contract - `SOURCE.GW_OBSERVATION`
      and `fromGwObservation()` in `js/notebook/capture.js`, using the same
      `quantity`/`figure`/`provenance` schema every other instrument uses. No
      second bench: the A/B comparison is the notebook's evidence contract,
      which is what the existing bench also writes into
- [x] `js/investigations.js`: an animated widget can now move its own controls,
      so a playhead the student can also drag stays in step with the thumb

### Stage 3 - Continuous wave visualization

- [x] Wavefronts placed by **emission history** - the exact phase inverse
      `timeAtPhase()` - so outer rings are further apart because they left when
      the binary was turning more slowly
- [x] Near field masked; the far-field formula does not describe it
- [x] Transverse test-mass ring in its own inset, wave arriving out of the
      page. The detector is never drawn beside the binary
- [x] Bounded: at most 26 rings, halved on the low quality tier. Reduced motion
      suppresses autoplay and the legend says the pattern is held still
- [x] Legends in the readout as well as on the canvas, so a screen reader gets
      them
- [x] **Finding, recorded rather than hidden:** a fixed propagation speed
      cannot draw both ends of a 26-fold frequency sweep - either the early
      wavelengths are wider than the picture or the late ones are finer than a
      pixel. The speed is recomputed from the frequency at the playhead and the
      legend says the propagation is slowed *and rescaled*. The within-frame
      physics is untouched

### Stage 4 - Audio that explains itself

- [x] The speaker opens a panel: mode, what is playing, volume, stop, a
      labelled example, a link to the lesson, and the sentence that permission
      is not playback
- [x] Six states distinguished - unsupported, muted, blocked, ready, playing,
      and which of the two modes. An AudioContext existing is never treated as
      playback
- [x] Mute stays one keystroke away on `M`
- [x] `js/audio.js` restructured: one output gain for mute and volume, two
      buses under it. Signal audio ducks the sandbox voices and suppresses the
      collision and merger sounds
- [x] **The duplicate merger audio is fixed.** A black-hole merger reached
      `triggerBassDrop` twice - once as a ripple, once as a `gravitasMerge`
      event - and played two overlapping drops. Deduplicated on position and
      time rather than by deleting one path, because the two paths do not cover
      the same set of events
- [x] Audio never quantized to a scale, never started without a gesture, and
      every mapping printed: speed, mode, shift, and by how much a shift
      flattened the chirp relative to the real signal

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
- [x] Wired into the lab as the `gw-real` instrument: observed H1/L1 with a
      shift and sign the student finds, and observation / reconstruction /
      residual
- [x] **GW170817: blocked, recorded.** No small published figure-data product;
      only 72-77 MB strain files needing a Welch PSD, a whitening filter and a
      Q-transform in the build. Written up in `js/data/gw/README.md`. Not
      approximated, not faked.

### Stage 6 - The 24-step investigation

- [x] `js/data/investigations/listening-to-spacetime.js` - 24 steps: 4
      predictions, 8 measurements with validators, 8 explorations, 3 written
      answers, 1 reading screen
- [x] Full Spanish shadow, 100% of strings translated
- [x] Instructor guide: 6 key concepts, 8 flow blocks, 5 features, 6
      misconceptions, 6 teaching notes, 5 discussion questions, 4 extensions,
      and an expected observation for all 8 measurement steps plus 6 more
- [x] Registered in the loader, the barrel, both manifests, the browse metadata
      and the manual. Linked from the speaker panel
- [x] Walked end to end in a browser: 24 steps with the sound off and **no
      audio context ever created**, Spanish, keyboard-only, phone width,
      evidence capture reaching the notebook with the model's limits attached

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

**Package A stages 1-6 complete and integrated.**

Checks run at this point, with results:

| Check | Result |
|-------|--------|
| `jest` (whole suite) | 4229 passed, 120 suites |
| `tools/validate-physics.mjs` | 243 checks, 243 passed |
| `tools/scenario-stability.mjs` | 12 scenarios, all conserved |
| `e2e/gwLesson.spec.js` | 13 passed |
| `e2e/gwAudio.spec.js` | 15 passed |
| `e2e/teaching.spec.js` | 21 passed |
| `budget:check` | initial 829.0 of 830.0 KB (untouched limit); deferred 3280.2 of 3350.0 |
| `lint`, `format:check`, `check-architecture` (243 modules), `check-links`, `docs:check`, `gw:check`, `teaching:check`, `activities:check`, `manifest`, `manual` | all green |

**Honest remaining limitations of package A**

- GW170817 is not bundled. No small published figure-data product exists;
  the alternative is 149 MB of strain files and a whitening pipeline in the
  build. Written up in `js/data/gw/README.md`. The neutron-star preset is a
  model and says so.
- The lab's model is never in its own "reliable" band for a heavy
  black-hole binary inside LIGO's frequency range. This is a property of the
  approximation, it is displayed, and lesson step 18 is about it.
- A share link made before this work by somebody who had deliberately turned
  the old sound toggle on is indistinguishable from one made by somebody who
  left it alone. Those links open muted.
- The overlay's propagation speed is rescaled with frequency to stay legible.
  Declared in the legend; the within-frame crest placement is exact.

**Deferred, not run:** `npm run e2e` (full source suite), `npm run e2e:dist`,
`npm run release:check`. To be run at the final integration checkpoint after
package B.

Next action: package B, prompt 1 - the shared stellar-model foundation.
