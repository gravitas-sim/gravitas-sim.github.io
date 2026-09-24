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

### Added

- **A new investigation, _Twelve Nights_.** A 40-to-50-minute lesson in which
  students write a radial-velocity schedule themselves, under the constraint a
  real time allocation imposes: twelve nights on HD 209458 from La Silla, one
  measurement a night, for a target that culminates at 41.9° and is above
  airmass 2 for only part of each night. The window is tied to the target's
  hour angle, so it opens about four minutes earlier every night and the epochs
  fall on a comb spaced by one sidereal day whatever the student does; of the
  two plans they commit to the spectrograph, one returns the planet at an alias
  period. The observing planner shows the windows and the spectral window and
  never a period or a velocity. The first screen says that the sky is real and
  the star is simulated, and that only the list of times crosses between them;
  the last works out why a second site at another longitude removes the alias
  and more nights from the same site do not. In English and Spanish.
- **Observing windows computed from the sky, and checked against published
  values.** `js/observingWindow.js` gives altitude and airmass, astronomical
  twilight, lunar phase and separation, and the intervals in which all three
  allow a measurement. Time is always an argument and never read from a clock,
  so the same night computed on two machines on two different days is the same
  window. A new _Observing windows_ group on `/validation/` checks it against
  published sidereal time, solar positions, equinox and solstice, airmass fits,
  new and full moons and two total lunar eclipses; the largest residual, from
  using UT where TT is meant, is written into the check rather than absorbed
  into its tolerance.
- **A new investigation, _What If Gravity Were Not Inverse Square?_** A
  45-to-60-minute lesson in which students move the exponent of gravity between
  1.5 and 2.9 and measure what depended on it: whether an orbit closes, how the
  period scales with distance, and which conservation laws survive. The law is
  anchored at a reference radius of 1 AU, where the pull is Newtonian for every
  exponent, so moving the exponent changes the shape of the field rather than
  its strength — which a change to G alone cannot imitate. Every number is
  measured by running the model when the step opens: an ellipse that turns
  backwards below 2 and forwards above it, a precession that holds still when
  the timestep is refined, the slope of period against radius, and energy
  conserved only with the potential that belongs to the force. The instruments
  integrate their own orbits in `js/powerLawGravity.js` and never touch the
  engine, so the scenario on screen stays Newtonian; `/model/` says so, and says
  this is a controlled experiment rather than a theory of gravity. In Spanish
  the lesson text is translated but the instruments' own labels are still
  English.
- **Four real stellar spectra in _A Universe of Stars_.** New screens near the
  end of the lesson, before its closing question, put four spectra observed by
  SDSS (DR18) — one star each of type A, G, K and M — behind two instruments: a
  comparison of all four, and one unlabeled spectrum to identify from its
  absorption features. The curves are deliberately not drawn in the colors of
  their stars, every readout opens by saying these are observations and not
  models, and each measured feature depth is given as text with the windows it
  was measured in and the archive record it came from. The lesson says that
  four stars are four examples and not a sample; the selection rule, and why
  the archive's highest-signal M dwarf is not among them, are recorded with the
  data. The flux is not part of the initial download. `npm run spectra:check`
  verifies the committed data offline, and `npm run spectra:provenance`
  regenerates it byte for byte from the archive CSVs once they are cached. No
  class has used these screens yet. In English and Spanish.
- **Five real mergers in _Listening to Spacetime_.** Seven new screens, after
  the published GW150914 traces, put thirty-two seconds of GWOSC strain from
  one LIGO detector each for GW150914, GW170817, GW190412, GW190521 and
  GW190814 behind one instrument: a constant-Q map whitened by each detector's
  own noise, the last instant anything clears a threshold set by the number of
  pixels searched, and the loudest frequency at fixed times before it. The
  readout keeps what the detector recorded, what Gravitas measured from it,
  GWOSC's catalog values and the model under four separate headings; catalog
  values are held back until asked for, so a student ranks the events by chirp
  mass from a measured frequency before any mass is on screen. No chirp mass is
  measured - one was built and rejected as unstable - and nothing is a
  template, fit or detection statistic. The strain is fetched only when the
  lesson reaches it, and `npm run gwosc:provenance` regenerates it byte for byte
  from the archive once it is cached. In English and Spanish.
- **A body can be placed by typing it.** _Precise placement_, beside Add
  object, takes a type, a position, a velocity and a mass as numbers, with the
  unit named on every field, each error attached to the field it is about and
  focus moved to the first one. It calls the same `placeBody()` a click does, so
  a typed body lands in the same list, is undone by the same button and
  serializes into the same share link. Leave the mass blank and one is chosen as
  a click would choose it; a white dwarf above 1.44 solar masses is refused.
  Building an arbitrary system no longer needs a pointer or aiming at the
  canvas; dragging to feel how fast a throw is still has no keyboard
  equivalent.
- **Every exported series can be read as a table.** Each series in the export
  dialog offers **View as table** before **Download CSV**. The table is rendered
  from the bytes the CSV exporter writes, so the table, the file and the plot
  cannot be three derivations that disagree, and a long series is evenly
  sampled with the sampling stated in the caption. The rotation curve, which had
  no export at all, now has one. The shape of a curve is still not narrated.
- **The sound panel prints what the tones stand for.** It lists each voiced
  body with its orbital period, and its ratio and interval in cents to the
  highest voice. This is not a description of the sound, which is compressed
  and quantized onto a five-note scale and cannot be inverted, but of the
  quantity the sound is computed from, read from the same array the oscillators
  follow so the two cannot drift apart. It is plain content rather than a live
  region, so a screen reader is not interrupted as the voices change. A separate
  period-to-cents law, `js/sonify/law.js`, is checked on `/validation/` against
  the cent values of the octave, the just fifth and the just major sixth, and
  for exact invertibility; it is not what the speakers play. None of the
  sonification, and none of the accessibility work above, has been tested with
  a screen reader or a blind user, and [ACCESSIBILITY.md](ACCESSIBILITY.md)
  says so.
- **A lab report an instructor can read back.** The PDF lab report now carries
  a submission token — the student's answers, attempt counts, step fingerprints
  and whatever name they typed, with the assignment and an optional roster id
  taken from `?roster=` on the assignment link — printed on its last page and
  embedded in the PDF's metadata, because the two survive different mishandling.
  `/instructors/submissions/` takes a pile of those PDFs, JSON progress backups
  or pasted tokens and returns one table of per-question failure rates, hardest
  first. Each answer is graded under the language it was typed in, and written
  answers are counted as unmarkable rather than wrong. What it reads can be
  downloaded (below); there is no roster or gradebook, nothing survives a
  reload, and nothing leaves the browser. It verifies answers, not identity: a
  token computed in a browser can be forged. The page needs no passphrase, is in
  English and Spanish, and is reached by its address; nothing links to it yet.
- **The submission page's reading can be downloaded.** A summary CSV with one
  row per report - roster and assignment ids when the link supplied them, the
  name exactly as the student typed it, the lesson and its version, completion,
  and counts of correct, incorrect, unmarked, incomplete and stale answers - a
  question-level CSV with one row per graded step, and a versioned JSON document
  with everything, including what was refused and why. All three and the
  on-screen table come from one graded record per report. Nothing is merged or
  chosen: an exact duplicate is kept and marked, repeated attempts are grouped
  only by roster id and numbered by when they were saved, and without a roster
  id nothing is grouped at all. Students' written answers are left out of both
  exports unless the instructor ticks a labeled box.
- **A classroom evidence kit at `/evaluation/`.** Printable instruments for an
  instructor who wants to evaluate a section: an implementation and fidelity
  checklist, a pilot pre/post concept assessment written against _Kepler's
  Laws_, _Bound, Unbound and Escape_ and _Weighing the Stars_, a usability
  questionnaire, participant codes drawn from a word list so sheets can be
  paired without names, and de-identified CSV and JSON templates with a
  versioned schema. Every item is in the static HTML, so the forms print with
  scripts blocked. `npm run evaluation:summary` reads the exports back and
  prints counts, missing data, per-item before and after, and paired change,
  with a bootstrap interval labeled as describing this sample only — and no
  p-value, no verdict and no "gain". The page asks for no name, email address
  or institution and transmits nothing, and a test searches the built bundle for
  network calls. The assessment is project-developed and unvalidated, and no
  evaluation of Gravitas has been run. The teaching page and the instructor
  portal link to it; it is in English only.
- **A public account of what the simulation cannot undo.** A new section of
  `/model/`, _What cannot be undone_, separates two reasons a run does not come
  back. The default integrator, symplectic Euler, is not time-symmetric, while
  velocity Verlet returns to the floating-point floor. And some operations
  delete information whatever the integrator: mergers, collapse to a black
  hole, bodies culled after leaving the view, damping, and collision fragments
  scattered by an unseeded random draw. That table is generated by scanning
  `js/physics.js` (`npm run audit:irreversible`) and the release gate refuses it
  when it falls behind the engine. A third reason, chaos using up double
  precision, is stated with them. `npm run probe:reversibility` is the
  measurement, and taking it meant fixing two latent engine bugs that no
  control could reach: a negative step is now substepped like a positive one,
  and a non-finite step is refused instead of being added to every position in
  the scene. No control in the application runs the simulation backwards.
- **The engine and the world builder load in a Web Worker.** Two unguarded DOM
  accesses stopped `js/physics.js` and `js/world/build.js` from evaluating
  without a document; both are guarded, and a browser test builds and
  integrates a scenario inside a real module Worker.
  [MULTI_WORLD_DECISION.md](MULTI_WORLD_DECISION.md) records the decision this
  enables: a second, isolated world is a Worker realm, not a refactor of the
  engine into instances, and the synchronous world-swapping prototype built to
  test the idea was removed rather than kept without a consumer. Nothing in the
  application uses a Worker world yet, and the probe pages under
  `spike/lyapunov/` are not part of the build.

### Changed

- **The simulation canvas draws at the display's pixel density.** It had never
  consulted `devicePixelRatio`, so on HiDPI laptops and projectors the
  most-viewed surface rendered at about half linear resolution while smaller
  panels were sharp. The backing store now follows the display, under a pixel
  budget per quality tier so that a large HiDPI window cannot multiply its fill
  cost without limit. The low tier, which is chosen because a machine is already
  struggling, takes none of the extra pixels and renders exactly as before, and
  so does any display at a ratio of 1. `npm run perf -- --dpr 2` emulates a
  HiDPI display for measuring it.
- **Adding a language can no longer break offline install for every reader.**
  Translated lesson bodies are kept out of the offline precache by the shape of
  their directory rather than by a pattern naming Spanish, and the build refuses
  a locale directory that is not registered or a registered locale that has
  none. Before, a third language's lessons would have been precached as core
  files, and one of them failing to download would have stopped the new service
  worker installing for everyone. `npm run i18n:check`, which checks the message
  catalogs against the source that asks for them, now passes and runs in CI.
- **The deferred-download ceiling is raised; the initial-download ceiling is
  not.** The new investigations, the spectra, precise placement and the data
  tables are all loaded on demand, and the deferred ceiling in
  `tools/bundle-budget.mjs` rises from 3880 KB to 4080 KB, with every raise
  itemized in its `reason`. What a first visit downloads is still held to
  830 KB. The lesson-manifest size test is now a bound per entry rather than a
  flat total, which no further lesson could have fitted under.
- **Only a release asks whether the instructor bundle is current.** Every
  branch and fork runs `npm run instructors:validate`, which renders every
  document and re-checks every answer key against the grading function under a
  throwaway key and writes nothing, and `npm run instructors:audit`, which
  confirms the freshness digest covers every module the build actually loads.
  `npm run instructors:check`, which asks whether the committed ciphertext was
  built from these sources, runs on pushes to `main` and pull requests into it,
  so a branch that edits lesson content no longer goes red elsewhere until the
  passphrase holder rebuilds; `tools/verify-release.mjs` now asks it again, with
  no condition, on the tree about to be published. `npm run instructors:restamp`
  re-states the record without the passphrase when the covered files changed
  but the documents did not, and refuses when they did.
- **CI measures what it used to report as unmeasured.** The documentation check
  compares the documented test counts with the suites the `checks` job has just
  run (`npm run docs:check:tests`) and the build facts with the build it has
  just made (`npm run docs:check:build`); before, it passed while listing those
  counts as not measured. The physics suite writes one report that both the
  table and the documentation check read, instead of running twice. The
  browser-suite skip policy, `npm run test:policy`, runs on every push and pull
  request and tells a skip conditioned on the build target from one conditioned
  on what the page happened to render, and the registry drift test now also
  fails when a check marked gate-only is in fact run by CI.
- **The accessibility and sonification claims are checked against the
  production build.** The keyboard-placement, data-table and printed-voices
  tests now work only through what a reader can see and press, and run against
  `dist/` as well as the sources. The tests that compare against internal
  state, such as exact typed coordinates, the plotted arrays and the live voice
  list, stay on the sources, and their headers say why.
- **A lesson no longer downloads instruments it does not use.** Every lesson
  loaded all sixteen instrument families before its first screen. The transit,
  power-law and both gravitational-wave families are now fetched when a step
  reaches them, which takes 242 KB and fourteen requests off every lesson's
  first screen as the site is published, and 85 KB and two requests in the
  build. While a family is on its way the tool panel says so to a screen
  reader; if it cannot be fetched the panel says that too and offers **Try
  again**, or **Reload the page** when a retry cannot work, and the reader's
  answers are kept. Offline, a lesson opened once still draws them. Start-up
  requests do not change in either configuration. `npm run budget:routes`
  measures what a fresh visitor downloads for nine routes, sources and build,
  against ceilings every lesson route's old download exceeds. Thirteen families
  are still loaded with every lesson; `LAZY_CAPABILITIES.md` lists them and the
  order they move in.

### Fixed

- A CSV cell that starts like a spreadsheet formula was wrapped in quotes and
  treated as safe, but a spreadsheet strips the quotes and runs what is inside.
  Every export now prefixes such a cell with an apostrophe, so it opens as text,
  and looks for the formula behind leading spaces, control characters and
  full-width look-alikes; plain numbers are unchanged. The classroom evidence
  kit, which had its own writer with no protection at all, uses the shared one.
- At 900 px wide and below, a lesson with an instrument docked showed no
  question, no answer boxes and no Next button: the bottom sheet was capped in
  height with `overflow: hidden`, and the step body was the only part allowed to
  shrink. The whole sheet now scrolls, Back and Next stay pinned to its bottom
  edge, and each step opens at its heading. The two layout specs that should
  have caught it scrolled boxes no reader can scroll; they now scroll only what
  a finger or a wheel could, and name the box that clips a control. The
  phone-width lesson walk runs in Firefox and WebKit as well.
- The MOND fit in _The Missing Mass_ labeled its horizontal axis with its own
  translation id, `dmW.radiusKpc`, in both languages, because the string was in
  neither catalog.
- Keyboard placement began its aim off the center of the view at the low
  quality tier, because it used a CSS-pixel half-width as a canvas coordinate.
- The Pluto–Neptune 3:2 check on `/validation/` was labeled a published value
  while measuring periods the integrator produced. It is an integration check
  now, renamed to say what it measures, with its value and tolerance unchanged.
  A run that produced no conjunctions would have made the whole suite report
  that it could not run; that case now costs one failed row.
- `npm run instructors:check` could report a stale instructor bundle as current.
  Its digest named a fixed list of files and missed several the build reads,
  including the prose of every instructor guide, the activity teaching notes and
  the instructor schema, so rewriting any of them left the recorded digest
  unchanged. The covered set is now derived from the builder's import graph,
  and the manifest records each input's own hash, so a failure names the file.
- `npm run author:new` appended the new lesson's import to the end of the
  previous line of `js/data/investigations.js`, so a freshly scaffolded lesson
  failed `format:check` and `lint` in a file its author never opened.
- Four statements in the public documentation that the code contradicted.
  `paper.md` named velocity Verlet as the integrator where symplectic Euler is
  the default, and said the whole browser suite runs in Firefox and WebKit where
  only a tagged subset does; `PERFORMANCE_OPTIMIZATIONS_SUMMARY.md` said physics
  is handed to the Barnes–Hut worker when the body count justifies it, where
  only an opt-in setting turns it on; and `/model/` said seven stellar tracks
  above a list of eight. The track count is now generated, and
  `tests/truthSurface.test.js` holds the prose claims to the code.
- The published size of the message catalog counted two of its five
  fragments per language. `README.md` and the manual said the interface ships
  from a catalog of 3691 strings when it held 4017: the activities, teaching and
  placement strings split off for download size were invisible to the count,
  and two tests that sweep the catalogs had each missed a different file. Every
  reader of the catalog now finds its fragments by one rule, and a fragment
  added for one language only, an id defined in two fragments, or a translation
  filed in a different fragment from its original fails `npm run i18n:check`.
- The browser test of the signed-in instructor portal reused the first fixture
  a checkout ever built, so after a lesson was added it went on testing an
  inventory the sources no longer described. The fixture now carries a stamp of
  every input that decides what it says and is rebuilt when any of them moves;
  the real instructor bundle and its release check are unchanged.
- Counts the documentation had stopped keeping true. `README.md` and
  `LICENSES.md` said "the 22 investigations" over a catalog of 24, and the
  summary of `paper.md` said 22 investigations, 636 steps and 243 physics
  checks. The license lines now cover every investigation without a count; the
  paper's counts are generated and held to the source by `npm run docs:check`;
  and a test sweeps the documents that describe the current software for any
  investigation count that disagrees with the catalog.
- `EXOPLANET_OBSERVING.md` still warned that the Jupiter mass unit was wrong by
  a factor of 52.4 across the application. It had already been fixed, derived
  from the solar mass and checked on `/validation/`; the note now says so.
- The contributor instructions told a contributor to run `npm run build`, which
  needs the instructor passphrase and stops without it. They now name
  `npm run build:ci`, the same build with a throwaway key and the one CI runs.
- The gravity-assist comparison could refuse to start, saying only
  "duration", if the world was paused in the moment after _Run_ was pressed.
  The runner first watches ten frames to see how fast the world really
  advances, and it averaged over all ten, so a world paused after one of them
  read as running at a tenth of its speed; the comparison was then sized ten
  times too long and refused for exceeding the sweep's limit. The rate is now
  taken over the frames that actually advanced, which is also what the
  runner's budget counts. The binary laboratories' sweeps share the
  measurement and were exposed the same way. The browser test that freezes the
  world under the comparison hit this intermittently, and then waited eight
  minutes for a report that could not come; a refused run now fails it at
  once, with the reason and the duration it was sized at.

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
  <!--fact:investigations-->24<!--/fact--> English lessons, so a class keeps
  working when the room's wifi drops. The cache name is a content hash, so a
  build invalidates it. See [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md).
- **A measured low-end quality tier.** Chosen from the frame rate the machine
  is actually achieving rather than from a user-agent string: reduced body
  counts, a capped resolution and the expensive full-screen effects switched
  off.
- **An investigation authoring toolchain.** `npm run author:check` validates
  every lesson and every one of the
  <!--fact:investigationSteps-->683<!--/fact--> steps; `npm run author:new`
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
  against a suite of <!--fact:physicsChecks-->286<!--/fact-->, and 48 scenarios
  against a catalog of <!--fact:scenarios-->59<!--/fact-->.

### Removed

- The runtime import map and the injected Chart.js script tag.
- `aria-hidden="true"` from the 3-D viewport, which had been hiding two
  focusable buttons from assistive technology.

[Unreleased]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/releases/tag/v1.0.0
