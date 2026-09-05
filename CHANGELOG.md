# Changelog

Notable changes to Gravitas. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions will
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once there is
a first release to number.

**There has been no release yet.** No Git tag exists, no GitHub release exists,
and no DOI has been minted. Everything below is unreleased and lives on `main`,
which deploys straight to <https://gravitas-sim.online>. `CITATION.cff` and
`.zenodo.json` therefore carry no `version` and no release date; see
[RELEASING.md](RELEASING.md).

## [Unreleased]

### Added

- **A new investigation, "Can You Detect This Planet?"** A 15-to-20-minute
  lesson about observational design rather than about physics: students plan two
  radial-velocity runs of the same star, with the same instrument and the same
  twelve measurements, and find that one detects a hot Jupiter unambiguously
  while the other - eleven times the baseline, not one measurement fewer -
  cannot say anything, because its cadence matches the orbital period. It closes
  on what a marginal result licenses and on the limits of a nondetection.
- **A synthetic observing mode in the radial-velocity panel.** Opt-in. Given a
  cadence in simulated days, a baseline and a Gaussian uncertainty in m/s, it
  keeps only the measurements that schedule would have produced and records
  nothing between them. The noise comes from a generator of its own, seeded by
  name, so a run is reproducible without touching the world's own random stream
  or its dynamics; measurements are scheduled on the simulation clock, so they
  do not depend on the frame rate. The continuous curve stays available behind
  them as a labelled teaching overlay. Runs export through **Export data ->
  Radial velocity measurements**: one row per measurement, carrying the
  uncertainty, the target and the observing configuration.
- **Offline support.** A service worker precaches the application shell, the
  <!--fact:scenarios-->53<!--/fact--> scenario thumbnails and all
  <!--fact:investigations-->13<!--/fact--> English lessons, so a class keeps
  working when the room's wifi drops. The cache name is a content hash, so a
  build invalidates it. See [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md).
- **A measured low-end quality tier.** Chosen from the frame rate the machine
  is actually achieving rather than from a user-agent string: reduced body
  counts, a capped resolution and the expensive full-screen effects switched
  off.
- **An investigation authoring toolchain.** `npm run author:check` validates
  every lesson and every one of the
  <!--fact:investigationSteps-->385<!--/fact--> steps; `npm run author:new`
  scaffolds a lesson with its translation shadow and instructor stub;
  `?author=<lesson>&step=<n>` opens any step with diagnostics without touching
  a student's saved progress; and a browser walker exercises every step of
  every lesson.
- **An architecture check.** `npm run check:architecture` fails on an import
  cycle or on a low-level module importing a coordinator.
- **A bundle budget.** `npm run budget` holds the initial download to a written
  ceiling; raising it means saying why in the same commit.
- **Accessibility checks in CI.** axe-core over 13 surfaces in both languages
  and both themes, plus keyboard, focus-trap, reflow and reduced-motion tests.
  See [ACCESSIBILITY.md](ACCESSIBILITY.md).

### Changed

- **The build is self-contained.** three.js, Chart.js and the three font
  families were fetched from jsdelivr and Google Fonts at runtime; they are now
  pinned, bundled into `vendor/` and served from this origin. The application
  makes no third-party network request during normal use.
- **The module graph.** Shared state moved out of `js/ui.js` into
  `js/appState.js`, removing eleven import cycles.
- **Contrast, landmarks and focus management** across the interface, to meet
  WCAG 2.2 AA.

### Fixed

- A widget in the radial-velocity lesson that had never drawn: its `draw`
  shadowed the imported translation function with the colour palette, so the
  first row threw and the canvas stayed blank.
- Three computed fields in Why Mars Goes Backwards that could only ever be
  empty, because they read a value measured on an earlier step.
- Escape did not dismiss a dialog when focus was in a text field, which made
  the share dialog and the scenario gallery keyboard traps in practice.
- Three modal dialogs declared `aria-modal="true"` without trapping focus.
- Stale counts across the documentation: `/model/` claimed 135 physics checks
  against a suite of <!--fact:physicsChecks-->218<!--/fact-->, and 48 scenarios
  against a catalog of <!--fact:scenarios-->53<!--/fact-->.

### Removed

- The runtime import map and the injected Chart.js script tag.
- `aria-hidden="true"` from the 3-D viewport, which had been hiding two
  focusable buttons from assistive technology.

[Unreleased]: https://github.com/gravitas-sim/gravitas-sim.github.io/commits/main
