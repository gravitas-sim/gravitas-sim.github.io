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

| #   | Criterion                                                                                                                                              | Where it is checked                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| A1  | Waveform model reproduces published closed-form limits (chirp mass, `f(tau)`, ISCO, amplitude scaling) against independently computed reference values | `tests/gwWaveform.test.js`           |
| A2  | Sandbox physics, sandbox audio and merger ripples are unchanged and still labelled illustrative                                                        | `tools/physics-checks.mjs`, `tests/` |
| A3  | One canonical timeline drives plots, audio, source phase and captures                                                                                  | `tests/gwTimeline.test.js`           |
| A4  | Audio is generated from the signal at a signal sample rate, never from the animation loop                                                              | `tests/gwAudio.test.js`              |
| A5  | No audio without an explicit user gesture; no duplicate merger audio                                                                                   | `e2e/gwAudio.spec.js`                |
| A6  | Wave overlay is transverse, phase-tied to the timeline, and bounded in cost                                                                            | `tests/gwOverlay.test.js`            |
| A7  | Real GW150914 data is bundled with full provenance and verified checksums                                                                              | `tools/build-gw-data.mjs --check`    |
| A8  | The 24-step lesson completes in EN and ES, by keyboard, with audio off                                                                                 | `e2e/gwLesson.spec.js`               |
| A9  | Budgets hold without being raised for anything that should have been deferred                                                                          | `npm run budget:check`               |

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
      legend says the propagation is slowed _and rescaled_. The within-frame
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

| Prompt | Deliverable                                                  | Depends on |
| ------ | ------------------------------------------------------------ | ---------- |
| B1     | Shared stellar-state representation and curated MIST subset  | **done**   |
| B2     | Stellar Lab: H-R diagram, appearance, comparison, population | **done**   |
| B3     | 28-step "A universe of stars"                                | B2         |
| B4     | Evolutionary playback and endpoint visuals                   | B2         |
| B5     | 34-step "Lives of stars"                                     | B4         |

After B3, the first stellar investigation must be walked from launch through
evidence export before B4 begins.

### B1 - the shared stellar foundation: done

**The data.** `tools/build-stellar-tracks.mjs` reduces seven MIST v1.2 tracks -
0.2, 0.5, 1, 2, 5, 10 and 20 solar masses at solar composition with no rotation

- from ~7,700 rows of 77 columns to 2,316 rows of four, into
  `js/data/stellar/mistTracks.js` (49 KB, deferred). Every mass is a grid point,
  so nothing is interpolated at build time. The source URL, its SHA-256, the
  composition, the rotation prescription, the citation MIST asks for and the
  redistribution position are all recorded. `npm run stellar:check` verifies the
  committed module and, where the 100 MB source is cached, regenerates it byte
  for byte.

- The ten primary equivalent evolutionary points are pinned, so the named phase
  boundaries are exactly MIST's. Thinning is bounded at 0.004 dex and the worst
  error it introduced is recorded per track.
- The build **measures** the Stefan-Boltzmann closure across all 7,654 source
  rows before licensing itself to derive the radius rather than store it: the
  implied solar temperature is 5772.16 K with a spread of 4e-11 K.
- It refuses to write if the reduction loses too much, if a primary EEP is
  thinned away, if the cached download's checksum is wrong, or if the
  Stefan-Boltzmann closure moves.

**The API.** `js/stellar/geometry.js` (the exact relation, three ways),
`js/stellar/mainSequence.js` (the estimates, labelled as estimates),
`js/stellar/tracks.js` (`stateAtAge`, `stateAtEep`, `mainSequenceAt`,
`trackBounds`, `trackSamples`, `nearestTrack`) and `js/stellar/state.js` (the
shared description, `supportsHabitableZone`, `supportsTransitPhotometry`,
`spectralType`). All domain-layer and pure.

**The integration.**

- `js/habitability.js` `stellarPropertiesFor` is now an adapter over the shared
  description and reports the radius too.
- `js/lightCurve.js` no longer has its own mass-radius power law.
- The inspector's star card is rebuilt on the shared description: measured
  values are used where they exist and guessed ones are marked _(estimated)_.
- The star constructor no longer invents a `baseColor`, so an authored colour
  is distinguishable from a generated one - and a generated star is coloured by
  its temperature, in the 2D renderer, the trails and the 3D view.
- The colour memo is keyed on the temperature, so a temperature change at
  fixed mass repaints.
- Six modelled fields are persisted and carried in a share link, additively:
  an older link restores with nulls, which is the right description of a star
  nobody modelled.
- No stellar aging in the sandbox. Nothing advances a star's age on the
  simulation clock.

**Defects found and fixed on the way**

- `js/ui.js` declared `STAR_OBJ_RADIUS = 20` against `js/physics.js`'s 10, so
  every star's radius row was half its real value and the surface gravity and
  escape velocity derived from it were wrong by four and by root two. The Sun's
  card now reads 1.00 R☉, 274 m/s² and 617 km/s, all of which are right.
- The inspector ignored every measured value a star carried. TRAPPIST-1's card
  said 3350 K while the habitable-zone ring drawn around it in the same frame
  used its measured 2566 K. Both now say 2570 K.
- Spectral type came from mass thresholds, so a 3000 K solar-mass red giant was
  a G star. It comes from temperature now.
- **Debt paid:** `e2e/golden/world-construction.json` had been stale since
  `6b19b22`, which flipped the default of `show_conservation_diagnostics` and
  changed the settings digest of 52 of 59 scenarios. It went unnoticed because
  that commit's gate was deferred. Regenerated; the only field that moved is
  the settings hash, and every body count, mass, momentum and camera is
  identical.

**Checks run**

| Check                                                                                             | Result                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `jest`                                                                                            | 4323 passed, 122 suites (94 of them new here)            |
| `tools/validate-physics.mjs`                                                                      | 243 checks, 243 passed                                   |
| `e2e` inspector, displayedSizes, observing, sandbox, sharing, scenarioContract, worldConstruction | 70 passed                                                |
| `stellar:check`, `gw:check`                                                                       | both regenerate byte for byte                            |
| `lint`, `format:check`, `check-architecture` (248 modules), `check-links`, `docs:check`           | green                                                    |
| `budget:check`                                                                                    | initial **830.0 of 830.0 KB**, deferred 3286.2 of 3350.0 |

**Warning for B2: the initial download has zero headroom.** It was paid for by
moving 63 strings out of the eager catalogue - the front door, the export
dialog, the activity bridge, the tidal model and the stellar phase names - and
there is nothing cheap left. The next eager byte needs a deferral first. The
identified candidate is `js/scenarioBrowser.js` (4.9 KB eager, opened from a
button, already imported by two deferred modules); deferring it means main.js
wiring a lazy handler for the gallery button.

**Honest limitations of B1**

- The 1 solar-mass track is a grid model, not a solar-calibrated one: at
  4.57 Gyr it gives 1.108 L☉ and 5849 K rather than exactly 1 and 5772.
- The helium flash and the thermal pulses are traversed faster than a stored
  age can resolve. 212, 201 and 105 samples on the 1, 2 and 5 solar-mass tracks
  cannot be addressed by age; `trackBounds().unreachableByAge` reports the
  count and `stateAtEep` reaches them.
- MIST states a citation requirement and no explicit redistribution licence.
  The bundle is a heavily reduced derived subset, fully attributed, and the
  build reproduces it from their download in one command.
- Nothing yet _uses_ the tracks in the interface. That is B2.

### B2 - the Stellar Lab: done

**The instrument.** Three widgets, all deferred, all reachable only through
`js/widgets.js`:

- [x] `stellar-lab` - the H-R diagram with the seven tracks on it, and a
      preview of the selected star beside it. Temperature increases to the
      left; both axes logarithmic; the reversal is explained in the widget's
      own note rather than in a tour that has to be dismissed.
- [x] `stellar-compare` - up to four pinned stars, ordered by radius,
      temperature, luminosity or mass, with the numerical ratio against the
      smallest and the Sun as an optional reference.
- [x] `stellar-population` - a reproducible synthetic population and the same
      population above a flux cut, over one histogram.

**The two modes are two different kinds of claim.**

- [x] _Explore modelled stars_: mass, phase, age, total main-sequence lifetime
      and time remaining, all from the track.
- [x] _Explore temperature and luminosity_: a point the student chose, its
      radius from Stefan-Boltzmann, and **no mass, no age, no lifetime**.
      Where several models pass close, all of them are named - at 4500 K and
      100 L(sun) six do, from 10.6 kyr to 1.32 Gyr - and the lab says it cannot
      choose between them. Adopting one is a separate deliberate action;
      asking to see them does not move the point.
- [x] `js/stellar/hr.js` - axis geometry, constant-radius guides (straight
      lines on these axes, and tested to be straight), regions traced from the
      tracks' own ZAMS and TAMS points, and `hypotheticalAt` which returns
      `massSun: null` by construction.
- [x] `js/stellar/population.js` - Kroupa (2001) IMF, constant SFR over 10 Gyr,
      seeded and reproducible. 351 of 400 placed; 49 had left the main sequence
      and are dropped rather than guessed at, and the count is reported.
      All: 64.7% M, 26.5% K. Above 1e-4 relative flux at 100 pc: 16 stars,
      12.5% A, 50% F, 37.5% G, **no K and no M**. That gap is the lesson.

**Two defects found and fixed while wiring it, both worth naming:**

- [x] The lab was rebuilt whenever a step's spec differed, which threw away the
      pinned stars. A lesson that pins on one step and compares three steps
      later would have lost them. There is now one lab per page.
- [x] The step's declared mode was re-stamped on every `reset()`, so a student
      who switched to the free cursor was switched back the moment they moved
      a slider. The step now says where to start, not where to stay. Same shape
      as the scenario-preset re-stamping bug.

**Dragging, and its keyboard equal.** The widget contract was canvas + sliders

- readout, with no pointer input at all. Rather than substitute sliders for the
  dragging B2 asks for, `js/investigations.js` gained an opt-in `pick` hook:

* [x] A widget that declares `pick` gets pointer-down/move on its canvas,
      routed through the same `applied()` path a slider uses - so the sliders
      move to match, the value is remembered with the step, and the redraw is
      the same one. Every other widget in the catalogue is untouched.
* [x] The canvas becomes focusable and the arrow keys step the two controls the
      widget names in `pickAxes` (shift for the coarse move), so the diagram is
      drivable without a mouse. The sliders remain the numeric entry.
* [x] A click in _modelled_ mode is refused rather than dragging the star off
      its track.

**Checks at this stage**

| Check                                                      | Result                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `tests/stellarLab.test.js`                                 | 66 passed                                                          |
| `jest` (whole suite)                                       | 4388 of 4389; the one failure is below                             |
| `budget:check`                                             | initial **825.7** of an untouched 830.0; deferred 3386.7 of 3420.0 |
| `lint`, `format:check`, `check-architecture` (252 modules) | green                                                              |
| `tools/stellar-shots.mjs`                                  | 10 captures, no page errors                                        |

**The one failing test, and why it is left failing.**
`tests/investigationIntegrity.test.js` requires every registered widget to be
used by some lesson. The three stellar widgets are not, until B3 writes the
lesson that uses them. Weakening that check to get a green run is exactly what
this package's instructions forbid, so it stays red for this one commit and B3
turns it green.

**Fixed while verifying, from the captures rather than from a test**

- [x] The preview caption and the comparison note were single unwrapped lines
      drawn wider than their panels, printing over the axis labels. Both wrap
      now, and the comparison stage budgets its height from the note's measured
      size instead of a constant.
- [x] The Solar System orbit labels were all drawn on one horizontal line and
      collided. Each now sits on its own arc, and one that would still overlap
      is dropped rather than printed illegibly.
- [x] The "N models pass close" readout listed four of them without saying so,
      and the four were often the same mass four times. It now prefers one per
      distinct mass and says how many more there are.

**Spanish, corrected across package A as well as B.** 266 catalogue strings I
wrote for `gwW`, `sound`, `stelW` and `nb.stellar` had no diacritics at all,
while 652 lines of the same file have them. 116 values were corrected - the
unambiguous words from a table, and every `esta`/`esta`, `cual`/`cual`,
`si`/`si`, `aun`/`aun`, `publico`/`publico`, `orbita`/`orbita`, `este`/`este`
and `dibujo`/`dibujo` decided one at a time from its own sentence.

- **Pre-existing, not fixed, reported:** other families in
  `js/i18n/es.deferred.js` have the same gap - lines 2001-2400 are almost
  entirely unaccented. Those are not this package's strings and rewriting them
  silently would be scope this package was not given. There is no check that
  would catch it; adding one would fail on that existing text.

**Honest remaining limitations of B2**

- Pinned comparisons persist across steps and across a lesson session, but not
  across a page reload: the widget contract persists numeric control values
  only, and a pinned list is not one.
- The population histogram is linear, so two A stars beside 227 M dwarfs are a
  hairline. The counts are printed above each bar. That is the shape of the
  fact, but it is a chart that has to be read as much as looked at.
- The population's scatter panel has no axis titles of its own; it borrows the
  reading of the diagram directly above it.
- Nothing in the lab ages a star yet. Evolutionary playback is B4.

### B3 - "A universe of stars": done

`js/data/investigations/a-universe-of-stars.js`, 28 steps, and its Spanish
shadow. Five predictions, thirteen measurements, four written answers, an open
challenge and a summative argument that puts the step 1 prediction back on
screen.

- [x] Every number the lesson asserts was read out of the models first, not
      recalled. Several were wrong on the first draft and were corrected
      against the tracks: the giant is 52x the main-sequence luminosity at its
      mass, not 300x; at 1 L(sun) the diagram runs 3.70 to 0.037 solar radii
      between 3,000 and 30,000 K, not 1.2 to 0.012.
- [x] The opening trio was **redesigned** after checking it. The obvious choice - 0.2, 1 and 20 solar masses - has the largest star also the hottest and
      the most luminous, so every "they go together" answer would have been
      right about those three. It is now a red dwarf, a 5 solar-mass B star and
      a red giant: the largest is neither the hottest nor the brightest, and
      has a fifth of the middle star's mass.
- [x] Steps 7-11 are all free-cursor and none of them asks for a mass, an age
      or a lifetime. No step grades a cursor position as an identified star.
- [x] EN/ES: 100% of translatable strings differ from the English, with units
      and bare numerals deliberately left untranslated rather than counted as
      translated.
- [x] Instructor guide: 6 key concepts, 7 flow blocks covering all 28 steps
      exactly once, 5 features, 7 misconceptions, 9 teaching notes, 5
      discussion questions, 4 extensions, expectations for all 15 measurement
      steps, and model notes naming where the tracks stop.
- [x] Registered in the loader, the barrel, both manifests and the browse
      metadata; linked from `/model/#stars` and from the teaching page's
      instrument list.

**What the lesson needed that the lab did not have**

- [x] **Two pacings for the age slider.** Paced logarithmically in time, the
      whole red-giant branch of a solar-mass track is 1 sample in 200 of the
      slider's travel and the lesson's giant steps were unreachable. There is
      now a second pacing, uniform along the track's own stored samples, under
      which all eight phases are reachable (RGB 22 samples, He-ignition 9,
      core-He 9, TP-AGB 90, post-AGB 40). The readout says which is in force
      and that the phase pacing is not a clock. `stateAtSample` and
      `sampleAtAge` in `js/stellar/tracks.js`; `PACE` and `setPace` in the lab.
- [x] Steps can seed the comparison stage (`pins`) and withhold its numbers
      (`anonymous`), which is what makes step 1 a prediction rather than a
      reading.
- [x] The comparison stage and the population view can now capture to the
      notebook; only the lab could before, so four steps had a capture button
      that did not exist.

**Defects found by the browser walk, not by a unit test**

- [x] Seeded pins pinned the _free cursor_ rather than the modelled star
      whenever an earlier step had left the lab in free mode - so step 6's two
      stars were both the Sun. `seedPins` now pins as a modelled star and
      restores the mode.
- [x] The step's pacing was applied _after_ its pins, so a pin given as a
      fraction was resolved against the wrong mapping.
- [x] Arrow keys moved the cursor the opposite way to the picture: left made
      the star cooler on a diagram whose left-hand side is the hot one. The
      runner's `pickAxes` now takes `flipX`.
- [x] A notebook entry from the comparison stage was titled "a point on the
      H-R diagram" and named no model at all. It is titled by what was
      captured and always names the grid.
- [x] The per-star "smaller than a pixel here" caption is wider than a slot on
      a narrow canvas and collided with its neighbours; it is a two-word mark
      now, with the sentence in the readout. An HTML entity in it was being
      drawn literally on the canvas.

**Checks at this stage**

| Check                                                                    | Result                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `e2e/stellarLesson.spec.js`                                              | 9 passed - full 28-step walk, keyboard, pointer, Spanish, phone width, save/resume, evidence export   |
| `e2e/gwLesson.spec.js`, `investigations`, `instruments`, `accessibility` | 104 passed, no regression from the runner change                                                      |
| `jest` (whole suite)                                                     | 4418 passed, 0 failed                                                                                 |
| `budget:check`                                                           | initial **825.8** of an untouched 830.0; deferred 3466.3 of 3500.0 (raised from 3420 with accounting) |
| `build-investigation-manifest`, `sw:manifest`                            | regenerated, current                                                                                  |

**Honest remaining limitations of B3**

- Step validators are functions, so their feedback messages are not reachable
  by the translation shadow and a Spanish student sees English validation
  text. This is a property of the lesson framework and is true of every
  existing lesson, not something this one introduced.
- The phase pacing gives the thermally-pulsing AGB 45% of the slider, because
  that is where the reduction kept the most rows. It is reachable, which it
  was not, but it is over-represented relative to the eye's interest in it.
- Step 15's "bounded mass comparison using the existing experimental
  framework" is run on the models directly. The A/B bench varies initial
  conditions of an N-body run and measures orbital outcomes; a stellar track
  is not one of its runs. Forcing it in was the alternative and the package
  explicitly rules that out. The instructor notes say so in as many words.

### B4 - evolutionary playback and endpoints: done

`js/stellar/evolution.js` owns the playhead, `js/stellar/endpoints.js` owns
what happens after a track stops, and `js/stellarEvolutionWidgets.js` draws
them. One age drives every linked view.

- [x] Mass selection, physical age and phase, play/pause, scrubber, previous
      and next phase, restart, an H-R trace, a linked appearance and readout,
      an optional interior schematic, and a second track pinned as a ghost.
- [x] Two pacings, both labelled, with a **duration summary**: for the current
      phase the readout prints the real length beside the share of the
      playback it gets. On a solar-mass star the thermally-pulsing AGB is
      0.01% of the life and 45% of the phase-paced playhead, and it says so.
- [x] The stellar clock never touches the N-body clock. A test reads the
      imports of all three modules and fails on `physics.js`, `timeline.js` or
      anything matching `collision`.
- [x] Deterministic: the trace is recomputed between the start and the
      playhead rather than accumulated, and the shells are seeded on the track
      id. Seeking backwards shortens the trace and removes the shells. A test
      plays to a position and seeks to the same one and compares.
- [x] Reduced motion: nothing autoplays, and the cloud and the transient draw
      at a fixed moment. Every stage stays reachable by the playhead and the
      phase buttons.
- [x] True-size and fitted preview modes, with the magnification stated in the
      second and the fraction of the star's own peak radius in the first.

**An eighth track, and why**

- [x] 40 M☉ added to the bundle. Explodability is not monotonic in mass:
      Sukhbold et al. (2016) find interleaved islands of explosion and
      collapse, so a black hole asserted from a mass cut would teach the
      opposite of the literature. 10 M☉ is where the models agree it explodes,
      40 is where they agree it does not, and **20 is left explicitly
      uncertain** because it is.
- [x] The mass column had to change encoding: it was an int16 at scale 1000
      and 40 M☉ overflows it. It is stored as a fraction of the initial mass
      now, bounded 0-1 for any star however heavy, and multiplied back at
      decode. A test walks every track asserting the first sample equals the
      initial mass and that mass never increases.

**Endpoints, kept separate from the tracks**

- [x] Three tracks reach a white dwarf and their remnant masses are their own
      last samples (0.54, 0.59, 0.89 M☉). Every other endpoint is a published
      result quoted for the nearest modelled progenitor, and `fromTrack` is the
      flag that separates the two. Both are asserted for every entry.
- [x] No formula from initial mass to remnant mass anywhere. Progenitor mass is
      never quoted as remnant mass - a test checks it on every entry.
- [x] A black hole is not required to have a bright supernova: the 40 M☉ entry
      says a failed explosion is the likelier route, and a test asserts its
      `supernova` is not `expected`.
- [x] Nothing without a photosphere is plotted. A neutron star and a black hole
      end the line where the model ends and get a card; no log(0), no invented
      temperature, and the illustrative explosion is kept off the diagram
      because a supernova's brightness is a transient and not a photospheric
      track.
- [x] The 0.2 and 0.5 M☉ tracks claim no endpoint at all, and the 0.2 entry
      says no star of that mass has finished its main sequence anywhere.

**Four things the phase readout now says that it did not**

- [x] Pre-main-sequence light comes from contraction, and fusion starting is
      not the same event as arriving on the main sequence.
- [x] The main sequence is not one immutable point - the readout prints how far
      this star has already moved along it.
- [x] What ran out at the end of the main sequence was hydrogen in the _core_,
      not hydrogen in the star.
- [x] A planetary nebula is expelled gas, has nothing to do with planets, and
      its visibility does not coincide with the first instant of envelope loss.

**Checks at this stage**

| Check                                                      | Result                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tests/stellarEvolution.test.js`                           | 54 passed                                                                                             |
| `jest` (whole suite)                                       | 4471 of 4472; the one failure is the widget-lesson coupling, which B5 closes                          |
| `budget:check`                                             | initial **825.8** of an untouched 830.0; deferred 3513.5 of 3560.0 (raised from 3500 with accounting) |
| `tools/stellar-shots.mjs`                                  | 20 captures including all four endpoint kinds, no page errors                                         |
| `lint`, `format:check`, `check-architecture` (257 modules) | green                                                                                                 |

**Fixed from the captures rather than from a test**

- [x] The timeline strip was drawn over the diagram's axis labels; it has its
      own band now.
- [x] At true scale a main-sequence star is a speck for most of its life, which
      is honest and made the panel useless. There is a fitted mode now, and the
      true-scale caption says what fraction of the star's own peak it is at.
- [x] Three captions were clipped at three lines. The stage measures its
      caption first and lays the picture out in what is left.

**Honest remaining limitations of B4**

- The interior schematic knows which process is burning and nothing else. Its
  shell radii are chosen for legibility and are labelled as meaningless.
- The 40 M☉ track stops during helium ignition, earlier than the 10 and 20 M☉
  tracks stop, so the gap between where the model ends and where the star ends
  is widest exactly where the endpoint is least directly supported. The
  readout states the phase and the remaining mass at the stop.
- The size mode and the interior toggle live on the step's tool spec, so they
  persist for the session but are not written into saved progress the way the
  slider values are.
- No lesson uses this instrument yet. That is B5.

### B5 - "Lives of stars": done

`js/data/investigations/lives-of-stars.js`, 34 steps, and its Spanish shadow.
Seven predictions, fifteen measurements, six written or chosen answers, four
guided explorations, an open challenge and a summative argument that requires
naming a limitation of the models.

- [x] Four masses followed end to end: a solar-mass star to a white dwarf, 10
      to a neutron star, 40 to a black hole, and a red dwarf that does none of
      it. The H-R diagram is the organising view throughout, with exactly three
      exceptions named as exceptions each time - the cloud, the explosion and
      the black hole.
- [x] Every number checked against the models before it was written. Two first
      drafts were wrong: the pre-main-sequence star is 56x the Sun's output at
      the model's first sample, not half, and the giant's mass at the tip is
      0.95 rather than 0.97.
- [x] **Step 32 was rewritten after checking it.** The draft had D as the
      ambiguous case; the models say A is - five of them pass close to
      3,300 K / 1,100 L(sun), at four stages and two masses - while D has
      exactly one. C is the interesting middle: the mass is pinned and the
      stage is not.
- [x] All ten named misconceptions are addressed by a specific step, and the
      instructor guide carries nine of them with responses.
- [x] Nothing depends on waiting: every phase is one button away, the age is a
      typed number as well as a slider, and reduced motion turns autoplay off
      entirely. An e2e test completes eight steps under reduced motion and
      asserts the playhead does not move on its own.
- [x] EN/ES: 100% of translatable strings differ from the English.
- [x] Instructor guide: 6 key concepts, 6 flow blocks covering all 34 steps
      exactly once, 5 features, 9 misconceptions, 9 teaching notes, 5
      discussion questions, 4 extensions, expectations for all 15 measurement
      steps, and model notes naming both the tracks and the endpoint sources.
- [x] Reciprocal links between the two stellar lessons, plus links from
      `/model/#stars` and the teaching page's instrument card.

**Two defects the walkthrough found, both real**

- [x] **The last phase step never reached the remnant.** "Next phase" seeks to
      cloud-plus-track, which in floating point is one ulp below the boundary,
      so pressing the button to the end stopped one step short of the thing it
      was stepping towards. `stageAt` now gives the boundary to the remnant.
- [x] **A step's declared star lost to the remembered slider.** `spec.track`
      was applied by `ensurePlay` and then immediately overwritten by
      `syncFromValues` reading the control's persisted value - so step 22,
      which asks for a red dwarf, showed a solar-mass cloud. The step's choice
      now sets the control.
- [x] Also fixed: an unfinished track could report a remnant stage at the very
      end of the playhead, which would have given the 0.2 M(sun) model an
      endpoint it does not have.

**And one wrong assumption in the test harness itself**

- [x] `#investigationProgressText` counts steps _visited_, not the step
      showing, so it never decreases when a student walks backwards. Both
      stellar e2e specs read the step heading now. The B3 spec had the same
      bug and never exercised backward navigation, so it had passed.

**Checks at this stage**

| Check                                                      | Result                                                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/livesOfStars.spec.js`                                 | 13 passed - full 34-step walk, phase buttons, track switching, replay, Spanish, reduced motion, phone width, save/resume/backwards, evidence export, and the first stellar lesson still running |
| `e2e/stellarLesson.spec.js`                                | 9 passed, unchanged by any of this                                                                                                                                                              |
| `jest` (whole suite)                                       | **4494 passed, 0 failed** - the widget-lesson coupling check is green again now that the playback is used by a lesson                                                                           |
| `budget:check`                                             | initial **825.8** of an untouched 830.0; deferred 3602.1 of 3650.0 (raised from 3560 with accounting)                                                                                           |
| `lint`, `format:check`, `check-architecture` (259 modules) | green                                                                                                                                                                                           |

**Honest remaining limitations of B5**

- Step validators are functions, so their feedback is not reachable by the
  translation shadow and a Spanish student sees English validation text. True
  of every lesson in the catalogue, not introduced here.
- The lesson asserts a number of facts that are not in the models and are
  stated in prose instead: what happens between carbon ignition and core
  collapse, why iron ends the sequence, what a pulsar needs. Each is flagged
  in the step that makes it, but none is checkable from inside the lab.
- The classroom-activity infrastructure was reused only through the existing
  instructor-guide generation. Neither stellar lesson was cut into an activity
  format, which the prompt explicitly said not to do as part of this task.

## Package C - Black holes: rendering, and the physics it was touching

### Done

**The audit found every reported problem still present**, plus two more:

- [x] Jets used `Math.random()` (ninety lines per jet per frame) and
      `Date.now()`, so the picture never repeated and kept moving while paused.
- [x] The disk was a radial gradient with no orientation at all, the jets had
      their own stored angle, and the Doppler shading assumed a third viewing
      direction. Nothing agreed with anything.
- [x] Decorative tracers were created **in the constructor** whenever the
      `show_accretion_disk` display setting was on - thirty to sixty per hole,
      each drawing several values from `Math.random()`, which `withSeed()`
      patches to the seeded stream while a world is built. A rendering toggle
      changed the bodies a seed produced.
- [x] Those tracers added their mass to the hole when absorbed, so the quality
      tier set how fast a black hole grew.
- [x] They were drawn twice: once by the parent and once by the global loop.
- [x] **Also found:** a merger spawned up to 220 more of them, so two black
      holes merging in vacuum produced both a flare and a mass gain that came
      from the renderer.
- [x] **Also found:** the emissivity normalisation took a square root of a
      quantity that was already one, so the profile was about twice what it
      should be and clamped flat across the whole inner disk.

**The correction, treated as a scientific one and not hidden**

- [x] Decorative tracers are gone. Nothing creates them; the flow is drawn.
      Real accretion is untouched and still runs through
      `check_absorption` into `absorb_into_black_hole`, which is the only path
      that ever should have moved mass.
- [x] `js/blackHole/appearance.js` holds one configuration per object, and the
      projected disk, the bright side and the jet axis are all derived from it.
- [x] Motion comes from the simulated clock. Pausing freezes it; reduced motion
      holds it at zero.
- [x] No physics baseline was regenerated to hide the change: all 243 physics
      checks and all 12 stability scenarios pass unmodified, and the golden
      world file was not touched. The scenarios it could have moved contain no
      black holes, which is why.

**Radii kept distinct**

- [x] The physical Schwarzschild radius comes from the existing
      `schwarzschildRadiusM` in `js/blackHolePhysics.js` - no second formula
      was added - and a test asserts it is linear in mass.
- [x] The interaction/capture radius (`obj.radius`) is unchanged, so no
      scenario's collisions moved.
- [x] The drawn size is compressed and the inspector says so.
- [x] The outline is at the drawn edge and is described as a boundary and a
      selection aid. There is no bright ring at a multiple of it labelled a
      photon sphere.

**What is drawn**

- [x] Two elliptical half-annuli either side of the horizon, so the far side
      passes behind it and the near side in front. Smooth radial gradient in a
      scaled context, because flat strips read as concentric rings.
- [x] A thin-disk-inspired profile that is zero at the inner edge and peaks at
      (7/6)^2 times it, tied to the non-rotating ISCO at 6 gravitational radii.
- [x] Doppler brightening as a gradient along the major axis, which is exactly
      what `cos(phi)` is in projection. It does not rotate with the material -
      an earlier version did, which is wrong.
- [x] Narrow jets with a soft sheath and deterministic knots at close zoom,
      launched from outside the horizon, unequal in brightness by inclination.
- [x] Environments per scenario: 3 jet-producing, 9 accreting, the rest
      quiescent. GW150914 is explicitly quiescent.

**Checks**

| Check                               | Result                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/blackHoleAppearance.test.js` | 39 passed                                                                                                                              |
| `tests/blackHoleSeparation.test.js` | 12 passed                                                                                                                              |
| `e2e/blackHole.spec.js`             | 10 passed                                                                                                                              |
| `jest` (whole suite)                | **4545 passed, 0 failed**                                                                                                              |
| `validate:physics`                  | 243 of 243, unchanged                                                                                                                  |
| `scenario-stability`                | 12 scenarios, unchanged                                                                                                                |
| `budget:check`                      | initial **829.8** of an untouched 830.0; deferred 3608.4 of an untouched 3650.0                                                        |
| `tools/blackhole-profile.mjs`       | Quasar Cannon 0.240 to **0.050** ms, Triple BH 0.735 to **0.102** ms, Black Hole Lab 0.198 to **0.107** ms, GW150914 0.080 to 0.073 ms |

**How the budget was met without raising it.** The two new modules are 6 KB
minified and the initial download went 2.6 KB over. Rather than raise the
limit, the renderer is now fetched on the first frame that draws a black hole:
a scenario with none never asks for it, and until it arrives the object is the
same simple mark the far level of detail uses. 829.8 of 830.0.

**Honest remaining limitations**

- **No lensing.** The far side passes behind the dark region rather than being
  bent above and below it. A defensible approximation did not fit this pass and
  no decorative arc pretends otherwise; the model page says so.
- The Doppler contrast and the jet beaming are **bounded illustrations**, not
  computed factors. The engine has no velocity in units of c, and both say so
  where they are defined and in the documentation.
- The colours are illustrative. No temperature and no observing band is
  modelled anywhere.
- The interior of the disk has no vertical structure: at high inclination it is
  a flat annulus, not a torus with thickness.
- `AccretionDiskParticle` still exists and is still drawn if a restored save
  carries one. Nothing creates it.

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

| Check                                                                                                                                                           | Result                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `jest` (whole suite)                                                                                                                                            | 4229 passed, 120 suites                                                |
| `tools/validate-physics.mjs`                                                                                                                                    | 243 checks, 243 passed                                                 |
| `tools/scenario-stability.mjs`                                                                                                                                  | 12 scenarios, all conserved                                            |
| `e2e/gwLesson.spec.js`                                                                                                                                          | 13 passed                                                              |
| `e2e/gwAudio.spec.js`                                                                                                                                           | 15 passed                                                              |
| `e2e/teaching.spec.js`                                                                                                                                          | 21 passed                                                              |
| `budget:check`                                                                                                                                                  | initial 829.0 of 830.0 KB (untouched limit); deferred 3280.2 of 3350.0 |
| `lint`, `format:check`, `check-architecture` (243 modules), `check-links`, `docs:check`, `gw:check`, `teaching:check`, `activities:check`, `manifest`, `manual` | all green                                                              |

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

Next action: package B, prompt 2 - the Stellar Lab. Its first task is finding
room in the initial download; see the warning under B1.
