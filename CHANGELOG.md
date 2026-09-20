# Changelog

Notable changes to Gravitas. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`main` deploys straight to <https://gravitas-sim.online>, so the live site can
be ahead of the newest tag; `deployed-revision.json` there names the commit it
was built from. `CITATION.cff` and `.zenodo.json` carry the version and the
release date and are generated from `tools/project-metadata.mjs` — see
[RELEASING.md](RELEASING.md), which also explains why the DOI is recorded after
the release rather than in the tag.

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-09-16

The first tagged release. Everything below was developed before v1.0.0 and is
listed here because this is the release that first carries it.

### Added

- **An instructor portal that explains itself.** `/instructors/` states what is
  behind the passphrase before asking for it, says plainly what client-side
  encryption on a static host can and cannot promise, and presents the
  <!--fact:instructorDocuments-->54<!--/fact--> documents grouped by investigation
  with their kind and size. A wrong passphrase and a missing bundle now report
  as the different problems they are.
- **Dual licensing.** The code is MIT; the original educational material is
  CC BY 4.0 ([LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)); third-party
  material keeps its own terms ([NOTICE](NOTICE)). [LICENSES.md](LICENSES.md)
  says which covers which files.
- **A paper.** `paper.md` and `paper.bib`, for submission to JOSE.
- **A schema for instructor content.** `js/authoring/instructorSchema.js`
  declares what every field has to be, including the minimum length of a
  record's label and of its body separately, and the bundle will not build
  without it.
- **Community and security files.** `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `SUPPORT.md`, and `.nvmrc` pinning Node 20.

- **Controlled A/B activities in two more investigations.** _The Butterfly
  Effect in Space_ replaces nine manual bench steps with one action that
  captures the start, selects the bodies and metrics, records Run A, returns,
  applies the 1,500 km nudge and records Run B — both arms over the same
  simulated interval, with the perturbation named as the only difference. Its
  numerical controls now halve the step the engine was **measured** taking
  rather than the playback speed, which in this laboratory changed nothing at
  all, and a repeat that did not change the arithmetic is refused as evidence.
  _Where Can It Get To?_ gains a short controlled pair: one tracer, one place,
  one rotating-frame speed, two directions — so the Jacobi constant and the
  whole accessible region are identical by construction and the trajectory is
  the only thing that can differ. One direction crosses the L1 neck a tenth of
  a period in; the other never comes near it in two binary periods, and the
  panel says that "did not cross during this run" is not "can never cross".
  Both activities keep the student's prediction whether or not it was right,
  refuse to overwrite an experiment somebody else recorded, and restore the
  world and every setting after a cancellation.
- **Parameter sweeps in two investigations, replacing what was repetitive
  rather than what was instructive.** In _Planets in Binary Stars_, five
  starting radii over the same twenty-period window, each watched by the
  binary watcher and reported as a physical outcome - still there, ejected,
  hit a star, window not finished - with periods done against periods asked
  on every row, and one trial re-runnable at half the step. In _Where Does a
  Gravity Assist Get Its Speed?_, both sides of the planet run as one retained
  A/B comparison so the two results sit on screen together, and an optional
  five-value sweep of the impact parameter on the gaining side. Both are built
  on the A/B bench: the world is captured before the first trial and restored
  after the last, cancellation keeps what it measured, and each trial is read
  by the same recorder that reads a hand-flown pass, so a mean speed is never
  offered as evidence about an encounter. In each lesson the hand-run examples
  stay and come first, the prediction is a prerequisite of the run, the plots
  are points with no curve through them, and results go into the notebook with
  the seed and the settings they actually ran at.
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
  them as a labeled teaching overlay. Runs export through **Export data ->
  Radial velocity measurements**: one row per measurement, carrying the
  uncertainty, the target and the observing configuration.
- **Offline support.** A service worker precaches the application shell, the
  <!--fact:scenarios-->59<!--/fact--> scenario thumbnails and all
  <!--fact:investigations-->23<!--/fact--> English lessons, so a class keeps
  working when the room's wifi drops. The cache name is a content hash, so a
  build invalidates it. See [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md).
- **A measured low-end quality tier.** Chosen from the frame rate the machine
  is actually achieving rather than from a user-agent string: reduced body
  counts, a capped resolution and the expensive full-screen effects switched
  off.
- **An investigation authoring toolchain.** `npm run author:check` validates
  every lesson and every one of the
  <!--fact:investigationSteps-->649<!--/fact--> steps; `npm run author:new`
  scaffolds a lesson with its translation shadow and instructor stub;
  `?author=<lesson>&step=<n>` opens any step with diagnostics without touching
  a student's saved progress; and a browser walker exercises every step of
  every lesson.
- **An architecture check.** `npm run check:architecture` fails on an import
  cycle or on a low-level module importing a coordinator.
- **A bundle budget.** `npm run budget` holds the initial download to a written
  ceiling; raising it means saying why in the same commit.
- **Accessibility checks in CI.** axe-core over <!--fact:axeSurfaces-->15<!--/fact--> surfaces in both
  languages and both themes, plus keyboard, focus-trap, reflow and reduced-motion tests.
  See [ACCESSIBILITY.md](ACCESSIBILITY.md).

### Changed

- **The instructor guides carry teaching content**, not a restatement of the
  lesson a student already has.
- **`css/page.css` is no longer part of `app.css`.** Four documentation pages
  load it and the sandbox never does, so it was download the first visit did
  not need: the initial download falls from 832.3 KB to 811.0 KB.

- **The build is self-contained.** three.js, Chart.js and the three font
  families were fetched from jsdelivr and Google Fonts at runtime; they are now
  pinned, bundled into `vendor/` and served from this origin. The application
  makes no third-party network request during normal use.
- **The module graph.** Shared state moved out of `js/ui.js` into
  `js/appState.js`, removing eleven import cycles.
- **Contrast, landmarks and focus management** across the interface, to meet
  WCAG 2.2 AA.

### Fixed

- Five instructor guides shipped with a table that rendered blank, because the
  renderer was handed rows it could not lay out and said nothing rather than
  refusing. One shipped with 590 bullets from a list built at the wrong level
  of nesting.
- Five investigations ended on a step that dropped its instrument, leaving a
  wall of text as the last thing a student saw. They close on the instrument
  they were built around, in both languages.
- A family of spelling corruptions from an old find-and-replace - `realiztic`,
  `characteriztic`, `optimiztic`, `centerd` - across the interface strings, the
  scenario descriptions and the code comments. Two translation keys were
  corrupted with them and are renamed at every use.
- `npm run author:check` warned about every staged value that did not land on a
  slider tick. It now accepts an off-grid value when a preset of the same
  widget sets that control to exactly it, which is what a student presses to
  get back.

- A widget in the radial-velocity lesson that had never drawn: its `draw`
  shadowed the imported translation function with the color palette, so the
  first row threw and the canvas stayed blank.
- Three computed fields in Why Mars Goes Backwards that could only ever be
  empty, because they read a value measured on an earlier step.
- Escape did not dismiss a dialog when focus was in a text field, which made
  the share dialog and the scenario gallery keyboard traps in practice.
- Three modal dialogs declared `aria-modal="true"` without trapping focus.
- Stale counts across the documentation: `/model/` claimed 135 physics checks
  against a suite of <!--fact:physicsChecks-->281<!--/fact-->, and 48 scenarios
  against a catalog of <!--fact:scenarios-->59<!--/fact-->.

### Removed

- The runtime import map and the injected Chart.js script tag.
- `aria-hidden="true"` from the 3-D viewport, which had been hiding two
  focusable buttons from assistive technology.

[Unreleased]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/releases/tag/v1.0.0
