# Gravitas

[![CI](https://github.com/gravitas-sim/gravitas-sim.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/gravitas-sim/gravitas-sim.github.io/actions/workflows/ci.yml)

**An interactive astrophysics sandbox and astronomy teaching tool that runs entirely in the browser.**

[gravitas-sim.online](https://gravitas-sim.online)

Build planetary systems, orbit binary stars, collide compact objects and reproduce
systems astronomers have actually observed, then measure what happens. Gravitas
pairs a free-form gravity simulation with guided undergraduate astronomy
investigations that use it.

No account, no install, no server. It is a static site.

---

## What is in it

**<!--fact:scenarios-->53<!--/fact--> built-in scenarios**, from the Solar
System and TRAPPIST-1 to the GW150914 black-hole merger, a star torn apart by
tides, and a dense cluster relaxing over time. Each is tagged by curriculum
concept, so the scenario gallery doubles as an index an instructor can scan for
the week they are teaching.

**<!--fact:investigations-->12<!--/fact--> guided
investigations**, <!--fact:investigationSteps-->366<!--/fact--> steps between
them:

| Investigation                    | What a student does                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Kepler's Laws                    | Measures the shape, pacing and timing of real orbits, ending in a slope of 3/2                  |
| Why Mars Goes Backwards          | Puts the Solar System into Earth's frame and watches a retrograde loop appear                   |
| Finding Planets by Their Shadows | Measures a transit, corrects for limb darkening, recovers a planet radius                       |
| Bound, Unbound and Escape        | Works out what decides whether something comes back                                             |
| Weighing the Stars               | Uses an orbit to measure something that cannot be put on a scale                                |
| Black Holes by the Numbers       | Builds the Schwarzschild radius from scratch and tests what it does and does not mean           |
| Finding Planets by Their Tug     | Recovers a planet mass from a stellar wobble, and meets the sin i degeneracy                    |
| The Goldilocks Question          | Moves a planet, changes its star, and decides what "habitable" really means                     |
| The Missing Mass                 | Fits a real galaxy's rotation curve, fails to do it with stars alone, and finds the dark matter |
| Tides                            | Subtracts one gravitational pull from another and finds what is left over                       |

Each one asks for a prediction before it shows anything, hands the student an
instrument to measure with, plots their own readings back to them, saves progress
locally, and exports a lab report as a PDF that they submit through whatever LMS
the course already uses.

**Instructor materials.** A guide and a generated answer key for each of
the <!--fact:investigations-->12<!--/fact--> investigations — learning
objectives, expected observations, the numbers a student should get and the
common wrong turns — plus an adopter's guide and a curriculum map, all rebuilt
from the lessons themselves on every release so a key cannot disagree with the
lesson it answers. See [Instructor resources](#instructor-resources).

**A public account of the model** at
[/model/](https://gravitas-sim.online/model/): what the simulation calculates,
what it approximates, and what is only drawn. Worth reading before assigning
anything: the engine is Newtonian and two-dimensional, mergers are perfectly
inelastic, the gravitational-wave inspiral is phenomenological, and the jets are
cosmetic.

**A validation suite.** `npm run validate:physics` prints a PASS/FAIL table
of <!--fact:physicsChecks-->207<!--/fact--> checks with measured error against a
stated tolerance: orbital periods and Kepler's laws, conservation of momentum,
angular momentum and energy, the convergence order of each selectable
integrator, escape velocity, transit depth, radial-velocity semi-amplitude,
astrometric signature, habitable-zone edges, rotation curves,
Schwarzschild-radius relations, and the stored parameters for real systems
against their published sources. Every tolerance carries a written reason. See
[`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md).

**Instruments in the sandbox.** A draggable ruler that reads distances in AU and
kilometres, a protractor, and a stopwatch that runs on simulated time and can be
latched to a body's periapsis passages so a period is timed from closest approach
rather than by reaction time. A scale bar and an elapsed-time readout are always
on the canvas. All of it is painted onto the simulation canvas rather than into
the page, so a screenshot documents its own spatial and temporal scale: an
exported frame carries the scenario's name, the scale bar and the simulated
clock burned into it. The same Capture group records a clip of a stretch of the
run — H.264 where the browser can encode it, WebM where it cannot — with the
same three facts in every frame, a visible recording indicator, and a hard stop
at three minutes or 80 MB so a long take cannot exhaust the tab.

**Force and acceleration arrows.** For the selected body, its velocity, its total
acceleration, and one arrow per gravitational source acting on it, in colours
that cannot be mistaken for each other — plus an optional gravitational
potential-well underlay for the whole scene. The arrows come from the
acceleration the integrator actually used, not from a second calculation of it.
Aimed at one misconception in particular: on an eccentric orbit the velocity and
the force are perpendicular at periapsis and apoapsis and never within forty
degrees of parallel anywhere.

**A choice of integrator.** Symplectic Euler (the default, and what every
scenario is tuned against), Velocity Verlet, or RK4, switchable while the
simulation runs, with live energy and angular-momentum drift readouts beside
them. Each scheme's convergence order and its bounded-versus-secular energy
behaviour are measured in the validation suite rather than asserted.

**Three observing panels, one observer.** A transit light curve, a radial-velocity
curve and an astrometric track, each plotted from the simulation as it runs, and
all three driven by the same viewing geometry: drag the observer handle on the
canvas and every open panel re-measures from the new direction. They are how the
transit, radial-velocity and astrometry investigations are done, and they are the
place a student meets the inclination degeneracy as an observation rather than as
a caveat in a textbook.

**Deterministic chaos, measured.** The Butterfly Effect in Space runs the same
three-star system twice from starts differing by 1,500 km, and measures how fast
the two runs come apart. It distinguishes chaos from randomness, from ordinary
orbital phase drift and from integration error, and it refuses to quote a
Lyapunov time unless the log-linear fit earns one. See
[`CHAOS_INVESTIGATION.md`](CHAOS_INVESTIGATION.md).

**Orbital resonance, tested rather than asserted.** When Orbits Lock takes away
the usual definition — that the periods are in a small whole-number ratio — and
makes a student find a replacement, using a counter-example from the same
system: Callisto's period ratio with Ganymede is 0.03% from 7:3, ten times
closer to a small ratio than Pluto's is to 3:2, and Callisto is in no resonance
at all. The instrument measures the quantity that does settle it — a resonant
angle that either librates or circulates — across the Galilean 4:2:1 chain,
Pluto's 3:2 with Neptune and Jupiter's Trojans, each paired with a control that
fails the test. It reports libration, circulation, or *inconclusive*, and it
will stay inconclusive rather than guess. See
[`RESONANCE_INVESTIGATION.md`](RESONANCE_INVESTIGATION.md).

**An A/B experiment bench.** Capture a starting state, record a baseline run,
return to exactly that start — same seed, same clock, same object identities,
same integrator and frame — change one variable, record a second run, and
compare the two on a shared simulated-time axis. It names the parameter that
differed, warns when more than one did, exports a combined CSV and a JSON
provenance manifest, and puts the setup (never the recorded results) in a share
link. See [`AB_EXPERIMENT_BENCH.md`](AB_EXPERIMENT_BENCH.md).

**Reference frames.** Re-express every position and every trail as a chosen body
would see them. Unlike following the camera, this redraws the recorded paths, so
putting the Solar System into Earth's frame makes Mars trace the retrograde loop
that the geocentric model was invented to explain. See
[`REFERENCE_FRAMES.md`](REFERENCE_FRAMES.md).

**Dark matter.** An optional halo that changes the force law rather than the
picture, with a rotation-curve panel plotting orbital speed against radius for
every body beside the curve the visible mass alone would produce. Switch the halo
on and a falling curve flattens. See [`DARK_MATTER.md`](DARK_MATTER.md).

**Tides.** Tidal stress computed as the difference between the pull on a body's
near side and the pull on its centre, with the Roche limit drawn where that
difference overcomes the body's own gravity — which is what tears a star apart in
the Tidal Disruption Event scenario.

**An object inspector.** Select any body for its mass, radius, speed, orbital
elements about whatever it is actually orbiting, and its energy budget. See
[`OBJECT_INSPECTOR.md`](OBJECT_INSPECTOR.md).

**A spacetime view.** An optional 3-D panel showing the scene as a rubber sheet
dipping around each mass, framed to whatever scenario is loaded.

**Embed mode and lecture mode.** `?embed=1` on any share link gives a chrome-free
figure that drops into a course page or an LMS in an iframe, sized to its frame
and carrying its own scale bar. Lecture mode fills the screen for projection:
larger type, the Daylight theme, a spotlight pointer, and arrow keys that step
through a prepared sequence of links.

**Spanish.** The interface ships in <!--fact:locales-->2<!--/fact--> languages
— <!--fact:localeNames-->English, Español<!--/fact--> — from a catalog
of <!--fact:uiStrings-->1609<!--/fact--> strings, and
all <!--fact:investigations-->12<!--/fact--> investigations are translated. A
translation carries only words: no scenario name, no seed, no widget id and no
numeric answer can be reached from a locale file, so a mistranslation cannot
change what a lesson measures.

**Data export.** The recorded timeline as CSV, plus the light curve, with a
companion Colab notebook in [`notebooks/`](notebooks/) that reads it. Every
column names its own unit (`t_days`, `x_au`, `vx_kms`, `r_au`, `E_kin_J`), and
each row records what the body is orbiting, so a student can fit a period, plot
the Kepler relation and measure the slope without first having to ask what the
numbers mean.

**Shareable links.** Any configuration encodes into the URL. Hand out
`gravitas-sim.online/#<state>` as an assignment and every student opens the same
system; a student can send one back as their answer. Nothing touches a server.

---

## Running it locally

Requires Node 18+ (developed on 24).

```bash
npm install
npm run dev
```

That serves the repository root at `http://localhost:8003`. The unbundled sources
run directly, so debugging never requires a build step.

### Everything else

```bash
npm test                  # <!--fact:jestTests-->2126<!--/fact--> tests across <!--fact:jestSuites-->52<!--/fact--> suites
npm run validate:physics  # the physics validation table
npm run e2e               # browser smoke tests, against the sources
npm run lint              # eslint
npm run format:check      # prettier
npm run build             # bundle + minify into dist/
npm run preview           # build, then serve dist/ at :8004
npm run docs:check        # the counts in the docs still match the source
npm run manual            # rebuild the user manual PDF from manual/*.tex
```

`npm run build` writes a self-contained `dist/` that can be published as-is. It
reports what the browser downloads at start-up separately from what is deferred:

| What                   | Size                                                   | Files / chunks                                |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------- |
| CSS                    | <!--fact:buildCss-->189<!--/fact--> KB                 | 1                                             |
| JavaScript at start-up | <!--fact:buildStartupJs-->554<!--/fact--> KB           | <!--fact:buildStartupFiles-->18<!--/fact-->   |
| JavaScript on demand   | <!--fact:buildDeferredJs-->1317<!--/fact--> KB         | <!--fact:buildDeferredChunks-->48<!--/fact--> |
| **Initial download**   | **<!--fact:buildInitialDownload-->743<!--/fact--> KB** |                                               |

Those figures are the last build's, to the nearest kilobyte, and are written
into the page by `npm run docs:sync` from `dist/build-summary.json` rather than
typed.

### Development tools

```bash
npm run perf                # frame-time profile across representative scenarios
npm run validate:scenarios  # conservation-law audit of the shipped scenarios
node tools/small-body-sweep.mjs   # asteroid/comet behaviour across every
                            #   scenario that has them, before-and-after diffable
npm run validate:links      # every internal link and anchor resolves
npm run thumbnails          # regenerate every scenario thumbnail
npm run thumbnails:check    # verify the committed set without capturing
npm run docs:facts          # print every count the documentation cites
npm run docs:sync           # write those counts into the docs and the manual
```

`npm run perf` and `npm run thumbnails` drive the real application in headless
Chromium via Playwright, which is a dev dependency and ships in nothing. See
[`tools/README-thumbnails.md`](tools/README-thumbnails.md).

---

## How it is put together

Vanilla ES modules. No framework, no build step required for development,
esbuild for production.

```
index.html          the application shell
css/
  tokens.css        design tokens: four themes, one palette each
  styles.css        the historical layer
  components.css    the shared component language
  page.css          the document pages
js/
  main.js           start-up coordination, and nothing else
  physics.js        the N-body engine
  render.js         the draw loop
  ui.js             panels, inspector, settings
  investigations.js the guided-lesson engine
  data/             scenario catalog, lesson content, concept tags
  i18n/             the message catalogs and the locale machinery
  *Widgets.js       the instruments lessons measure with
model/              the public physics-model page
instructors/        the instructor area
manual/             LaTeX source for the user manual PDF
notebooks/          the Colab notebook that reads an exported CSV
tools/              build and development tooling
tests/              jest
e2e/                the Playwright browser suite
validation/         the physics validation page and its data
```

Two conventions worth knowing before changing anything:

- **CSS is layered.** The order is `tokens, base, legacy, components,
overrides`. Component rules win on layer order alone, which is why they need
  no `!important`. Color belongs in `tokens.css`; nothing else should carry a
  hex value.
- **One source of truth per fact.** Scenario titles, summaries, concept tags and
  thumbnails all live in `js/data/scenarioInfo.js` and every surface reads from
  it. The same goes for lesson content and the habitable-zone model. Tests
  enforce this in several places, and the counts in this file are written by
  `npm run docs:sync` from the catalog rather than typed.
- **User-visible text is a message id.** Interface strings live in
  `js/i18n/en.js` and are reached through `t('some.id')` or a `data-i18n`
  attribute; `js/i18n/es.js` carries the Spanish. A string added to one catalog
  and not the other fails `npm test`.

The guided-lesson system is roughly half the application by weight and loads only
when someone asks for it; so do Three.js and Chart.js, which back the spacetime
view and the chart panels.

---

## Browser tests

`npm test` covers the physics and the data; it cannot tell you whether the
application still works. That is what the Playwright suite in [`e2e/`](e2e/) is
for. It drives a real browser through the workflows that matter — loading a
scenario, inspecting an object, opening the three observing panels and moving the
shared observer, walking a guided lesson and generating its PDF report, restoring
a shared link, taking a screenshot and recording a clip, opening the spacetime
view, embed and lecture modes, and a phone layout — and fails on any uncaught
exception or `console.error` along the way.

```bash
npx playwright install chromium   # once
npm run e2e                       # the suite, against the sources
npm run e2e:headed                # watch it happen
npm run e2e:ui                    # the Playwright inspector
npm run e2e:report                # open the last HTML report
```

The suite is <!--fact:e2eTests-->185<!--/fact--> tests
in <!--fact:e2eFiles-->17<!--/fact--> files and takes several minutes in
Chromium.

Some notes on how it is put together, because two of the choices are not
obvious:

- **It runs against the unbundled sources by default.** The tests reach into the
  running application with `import('/js/physics.js')` so they can read the body
  list, check for NaNs and load a scenario on a fixed seed. That cannot work
  against `dist/`, where those modules are bundled into hashed chunks.
- **So the built site gets its own spec.** `e2e/production.spec.js` touches
  nothing but the DOM and runs against `dist/`, defending what the source suite
  structurally cannot reach: chunk splitting, deferred imports, and assets the
  build forgot to copy.

  ```bash
  npm run build && npm run e2e:dist   # the production spec against dist/
  npm run e2e:all                     # both targets
  ```

Chromium runs on every change. Firefox and WebKit are run by CI on pushes to
`main` and weekly, and can be run locally:

```bash
npx playwright install firefox webkit
GRAVITAS_E2E_BROWSERS=firefox,webkit npm run e2e
```

There are no whole-application screenshot comparisons, deliberately: the output
is a moving simulation and such a test would fail on every commit for reasons
nobody could act on.

---

## Continuous integration

Every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
formatting, lint, the jest suite, the physics validation table, the link checker
and the thumbnail manifest; a production build; and the browser suite against
both the sources and the built artifact. Firefox and WebKit are added on pushes
to `main` and on a weekly schedule.

Two things worth knowing if you are working on CI itself:

- The build job runs `npm run build:ci` rather than `npm run build`. The only
  difference is the instructor materials, which are normally encrypted with a
  passphrase that is not in the repository — and a pull request from a fork
  cannot read repository secrets, so every external contribution would fail.
  `build:ci` renders every guide and answer key for real, which is where
  breakage actually happens, and encrypts them with a random throwaway secret.
  The result is deliberately undecryptable and is never published.
- Branch protection should require the single `CI` job rather than the
  individual ones. It aggregates the rest, so the rule does not need editing
  every time a job or a matrix entry is added.

---

## Validation

The model page says what Gravitas calculates and what it approximates.
[`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md) says what has been _checked_,
and against what.

```bash
npm run validate:physics
```

That is <!--fact:physicsChecks-->207<!--/fact--> deterministic checks, about
fifteen seconds, printed as a table of measured value, expected value, error and
tolerance. Four kinds, and the table labels each: closed-form arithmetic,
quantities measured by running the N-body engine, literature values with their
sources named, and educational approximations validated against the equation
they claim to use rather than against reality.

Every tolerance has a written justification, because a tolerance without one is a
number chosen to make a test pass. The integrated tolerances are derived from the
integrator's convergence order, which the suite measures rather than assumes; the
published ones from the precision the reference is quoted to.

The same checks run in `npm test`, so a physics regression fails a pull request.
`npm run validate:scenarios` extends the conservation audit to
all <!--fact:scenarios-->53<!--/fact--> shipped scenarios in a real browser, and
names, per scenario, which documented departures it has switched on — static
black holes, one-way gravity and the dark-matter halo all conserve less than the
full model does, on purpose.

The write-up also records what is _not_ validated, and the two physics bugs this
pass found and fixed: an integrator that advanced bodies one at a time and so
broke Newton's third law, and a scenario that turned out to have no gravity in it.

---

## Instructor resources

There are <!--fact:investigations-->12<!--/fact--> instructor
guides, <!--fact:investigations-->12<!--/fact--> answer keys, an adopter's guide
and a curriculum map — 22 PDFs, generated from the lessons at build time — live
at [gravitas-sim.online/instructors/](https://gravitas-sim.online/instructors/).

They are behind a passphrase, and the honest description of what that means is on
the page itself: the site is static, with no server to check a credential
against, so the materials are AES-GCM encrypted at build time and decrypted in
the browser. That is real protection against casual discovery and against a
student who finds the URL. It is not protection against a determined attacker
with the ciphertext, and the page says so.

Instructors can request the passphrase through the contact link on that page.

---

## Documentation

[**Gravitas User Manual**](Gravitas_User_Manual.pdf) — the manual for people
using the simulation rather than building it: the interface, the instruments, the
investigations, the scenario catalog and what the model does and does not claim.
It is written in LaTeX in [`manual/`](manual/) and rebuilt with `npm run manual`;
its counts come from the same source as this page's.

Topic documents, each about one part of the application and written when that
part was built:

| Document                                                           | What it covers                                                                                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md)                   | Every validated claim, its tolerance, and the reason for that tolerance                                                                        |
| [`SANDBOX_INSTRUMENTS.md`](SANDBOX_INSTRUMENTS.md)                 | Ruler, protractor, stopwatch, the always-on scale bar, screenshots and clip recording                                                          |
| [`AB_EXPERIMENT_BENCH.md`](AB_EXPERIMENT_BENCH.md)                 | Controlled A/B experiments: the canonical captured state, why runs are sequential, alignment, storage and export                               |
| [`CHAOS_INVESTIGATION.md`](CHAOS_INVESTIGATION.md)                 | The chaos investigation: why the Lagrange equilateral configuration, the divergence definition, and the evidence it is not a timestep artefact |
| [`RESONANCE_INVESTIGATION.md`](RESONANCE_INVESTIGATION.md)         | The resonance investigation: the resonant angles, the three verdicts and why one of them is a refusal, the four scenarios and their measured values |
| [`EXOPLANET_OBSERVING.md`](EXOPLANET_OBSERVING.md)                 | The transit, radial-velocity and astrometry panels and the shared observer                                                                     |
| [`REFERENCE_FRAMES.md`](REFERENCE_FRAMES.md)                       | Re-expressing the scene in another body's frame                                                                                                |
| [`DARK_MATTER.md`](DARK_MATTER.md)                                 | The halo, the rotation-curve panel and the lesson built on them                                                                                |
| [`OBJECT_INSPECTOR.md`](OBJECT_INSPECTOR.md)                       | The per-body readout and its orbital elements                                                                                                  |
| [`MASS_UNITS.md`](MASS_UNITS.md)                                   | How masses are stored, displayed and converted                                                                                                 |
| [`NUMBER_TYPOGRAPHY.md`](NUMBER_TYPOGRAPHY.md)                     | How numbers are formatted, and why                                                                                                             |
| [`SCENARIO_GALLERY.md`](SCENARIO_GALLERY.md)                       | The gallery, its concept tags and its thumbnails                                                                                               |
| [`PERFORMANCE_PROFILING_GUIDE.md`](PERFORMANCE_PROFILING_GUIDE.md) | How to profile a change                                                                                                                        |

Three documents are records of finished work rather than descriptions of the
application, and are labelled as such at the top:
[`UI_PERFORMANCE_AUDIT.md`](UI_PERFORMANCE_AUDIT.md),
[`PERFORMANCE_OPTIMIZATIONS_SUMMARY.md`](PERFORMANCE_OPTIMIZATIONS_SUMMARY.md)
and [`SCENARIO_FIXES.md`](SCENARIO_FIXES.md).

---

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) has the setup, the conventions and the
checks a pull request has to pass. Issues and pull requests are welcome,
particularly:

- **New investigations.** The lesson format is declarative and reasonably
  pleasant to write against; `CONTRIBUTING.md` describes its shape.
- **Translations.** The interface is fully extracted into message catalogs and
  Spanish is shipped, so a new language is now a copy of `js/i18n/en.js` with
  its values translated, plus a row in `LOCALES`. Lesson translations are
  separate, per-lesson, and optional.
- **Scenarios.** New ones, or better initial conditions for an existing one:
  every scenario is a data entry in `js/data/scenarioInfo.js` plus its settings.

Before opening a PR: `npm test`, `npm run lint`, `npm run format:check`,
`npm run docs:check` and `npm run build` should all pass, and CI runs all of them
plus the browser suite. If the change touches physics, run
`npm run validate:physics` and say what moved. If it touches the interface, run
`npm run e2e`.

---

## Citing Gravitas

If you use Gravitas in teaching or research, please cite it. See
[`CITATION.cff`](CITATION.cff), or use the "Cite this repository" button in the
GitHub sidebar.

---

## License

MIT. See [`LICENSE`](LICENSE).

Scenario data uses published values for real systems; sources are noted at
[/model/](https://gravitas-sim.online/model/).

---

Built by [Carl Ziegler](https://carlziegler.space/).
