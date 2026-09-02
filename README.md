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

**43 built-in scenarios**, from the Solar System and TRAPPIST-1 to the GW150914
black-hole merger, a star torn apart by tides, and a dense cluster relaxing over
time. Each is tagged by curriculum concept, so the scenario gallery doubles as an
index an instructor can scan for the week they are teaching.

**Ten guided investigations**, 305 steps between them:

| Investigation | What a student does |
| --- | --- |
| Kepler's Laws | Measures the shape, pacing and timing of real orbits, ending in a slope of 3/2 |
| Why Mars Goes Backwards | Puts the Solar System into Earth's frame and watches a retrograde loop appear |
| Finding Planets by Their Shadows | Measures a transit, corrects for limb darkening, recovers a planet radius |
| Bound, Unbound and Escape | Works out what decides whether something comes back |
| Weighing the Stars | Uses an orbit to measure something that cannot be put on a scale |
| Black Holes by the Numbers | Builds the Schwarzschild radius from scratch and tests what it does and does not mean |
| Finding Planets by Their Tug | Recovers a planet mass from a stellar wobble, and meets the sin i degeneracy |
| The Goldilocks Question | Moves a planet, changes its star, and decides what "habitable" really means |
| The Missing Mass | Fits a real galaxy's rotation curve, fails to do it with stars alone, and finds the dark matter |
| Tides | Subtracts one gravitational pull from another and finds what is left over |

Each one asks for a prediction before it shows anything, hands the student an
instrument to measure with, plots their own readings back to them, saves progress
locally, and exports a lab report as a PDF that they submit through whatever LMS
the course already uses.

**Instructor materials.** Guides, stated learning objectives, expected
observations and generated answer keys for every investigation, plus an adopter's
guide and a curriculum map. See [Instructor resources](#instructor-resources).

**A public account of the model** at
[/model/](https://gravitas-sim.online/model/): what the simulation calculates,
what it approximates, and what is only drawn. Worth reading before assigning
anything: the engine is Newtonian and two-dimensional, mergers are perfectly
inelastic, the gravitational-wave inspiral is phenomenological, and the jets are
cosmetic.

**A validation suite.** `npm run validate:physics` prints a PASS/FAIL table of
147 checks with measured error against a stated tolerance: orbital periods and
Kepler's laws, conservation of momentum, angular momentum and energy, the
convergence order of each selectable integrator, escape velocity, transit depth,
radial-velocity semi-amplitude, astrometric signature, habitable-zone edges,
rotation curves, Schwarzschild-radius relations, and the stored parameters for
real systems against their published sources. Every
tolerance carries a written reason. See
[`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md).

**Instruments in the sandbox.** A draggable ruler that reads distances in AU and
kilometres, a protractor, and a stopwatch that runs on simulated time and can be
latched to a body's periapsis passages so a period is timed from closest approach
rather than by reaction time. A scale bar and an elapsed-time readout are always
on the canvas. All of it is painted onto the simulation canvas rather than into
the page, so a screenshot documents its own spatial and temporal scale.

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
npm test                  # 1513 tests across 35 suites
npm run validate:physics  # the physics validation table
npm run e2e               # browser smoke tests, against the sources
npm run lint              # eslint
npm run format:check      # prettier
npm run build             # bundle + minify into dist/
npm run preview           # build, then serve dist/ at :8004
```

`npm run build` writes a self-contained `dist/` that can be published as-is. It
reports what the browser downloads at start-up separately from what is deferred:

```
CSS                 152.9 KB
JS at start-up      328.2 KB   11 file(s)
JS on demand        380.0 KB   12 chunk(s)
```

### Development tools

```bash
npm run perf                # frame-time profile across representative scenarios
npm run validate:scenarios  # conservation-law audit of the shipped scenarios
node tools/small-body-sweep.mjs   # asteroid/comet behaviour across every
                            #   scenario that has them, before-and-after diffable
npm run validate:links      # every internal link and anchor resolves
npm run thumbnails          # regenerate every scenario thumbnail
npm run thumbnails:check    # verify the committed set without capturing
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
  *Widgets.js       the instruments lessons measure with
model/              the public physics-model page
instructors/        the instructor area
tools/              build and development tooling
tests/              jest
```

Two conventions worth knowing before changing anything:

- **CSS is layered.** The order is `tokens, base, legacy, components,
  overrides`. Component rules win on layer order alone, which is why they need
  no `!important`. Color belongs in `tokens.css`; nothing else should carry a
  hex value.
- **One source of truth per fact.** Scenario titles, summaries, concept tags and
  thumbnails all live in `js/data/scenarioInfo.js` and every surface reads from
  it. The same goes for lesson content and the habitable-zone model. Tests
  enforce this in several places.

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
a shared link, and a phone layout — and fails on any uncaught exception or
`console.error` along the way.

```bash
npx playwright install chromium   # once
npm run e2e                       # the suite, against the sources
npm run e2e:headed                # watch it happen
npm run e2e:ui                    # the Playwright inspector
npm run e2e:report                # open the last HTML report
```

Roughly two and a half minutes for seventy tests. Some notes on how it is put
together, because two of the choices are not obvious:

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
[`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md) says what has been *checked*,
and against what.

```bash
npm run validate:physics
```

135 deterministic checks, about fifteen seconds, printed as a table of measured
value, expected value, error and tolerance. Four kinds, and the table labels
each: closed-form arithmetic, quantities measured by running the N-body engine,
literature values with their sources named, and educational approximations
validated against the equation they claim to use rather than against reality.

Every tolerance has a written justification, because a tolerance without one is a
number chosen to make a test pass. The integrated tolerances are derived from the
integrator's convergence order, which the suite measures rather than assumes; the
published ones from the precision the reference is quoted to.

The same checks run in `npm test`, so a physics regression fails a pull request.
`npm run validate:scenarios` extends the conservation audit to all 48 shipped
scenarios in a real browser, and names, per scenario, which documented departures
it has switched on — static black holes, one-way gravity and the dark-matter halo
all conserve less than the full model does, on purpose.

The write-up also records what is *not* validated, and the two physics bugs this
pass found and fixed: an integrator that advanced bodies one at a time and so
broke Newton's third law, and a scenario that turned out to have no gravity in it.

---

## Instructor resources

Instructor guides and answer keys live at
[gravitas-sim.online/instructors/](https://gravitas-sim.online/instructors/).

They are behind a passphrase, and the honest description of what that means is on
the page itself: the site is static, with no server to check a credential
against, so the materials are AES-GCM encrypted at build time and decrypted in
the browser. That is real protection against casual discovery and against a
student who finds the URL. It is not protection against a determined attacker
with the ciphertext, and the page says so.

Instructors can request the passphrase through the contact link on that page.

---

## Contributing

Issues and pull requests are welcome, particularly:

- **Scenario fixes.** Some scenarios do not yet demonstrate what their titles
  claim; `SCENARIO_GALLERY.md` lists the specific ones found during a capture
  pass.
- **New investigations.** The lesson format is declarative and reasonably
  pleasant to write against, though not yet documented. Ask if you want to try
  one.
- **Translations.** Interface strings are not yet extracted into a catalog.
  That scaffolding is the main obstacle to any language beyond English.

Before opening a PR: `npm test`, `npm run lint`, `npm run format:check` and
`npm run build` should all pass, and CI runs all of them plus the browser suite.
If the change touches physics, run `npm run validate:physics` and say what moved.
If it touches the interface, run `npm run e2e`.

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
