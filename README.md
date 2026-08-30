# Gravitas

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

**Six guided investigations**, 176 steps between them:

| Investigation | What a student does |
| --- | --- |
| Kepler's Laws | Measures the shape, pacing and timing of real orbits, ending in a slope of 3/2 |
| Finding Planets by Their Shadows | Measures a transit, corrects for limb darkening, recovers a planet radius |
| Bound, Unbound and Escape | Works out what decides whether something comes back |
| Weighing the Stars | Uses an orbit to measure something that cannot be put on a scale |
| Black Holes by the Numbers | Builds the Schwarzschild radius from scratch and tests what it does and does not mean |
| The Goldilocks Question | Moves a planet, changes its star, and decides what "habitable" really means |

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
npm test              # 726 tests across 19 suites
npm run lint          # eslint
npm run format:check  # prettier
npm run build         # bundle + minify into dist/
npm run preview       # build, then serve dist/ at :8004
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
npm run perf              # frame-time profile across representative scenarios
npm run thumbnails        # regenerate every scenario thumbnail
npm run thumbnails:check  # verify the committed set without capturing
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
`npm run build` should all pass.

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
