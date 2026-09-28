# Scenario Studio

A page at `/studio/` for making a Gravitas scenario as data: the settings it
runs under, the bodies it starts with, the seed that makes it the same world
every time, the instruments it opens with, and its title and summary in
English and Spanish. It writes a `gravitas.scenario-pack/1` file, which the
SDK validates, tests and archives ([sdk/README.md](sdk/README.md)), and a link
the application opens.

It edits a document, never the repository and never code. No part of a
scenario file is ever run: the application opens one through the share link
it already reads, so a pack needs no loader of its own. The Studio round-trip
gate ([STUDIO_ROUNDTRIP_GATE.md](STUDIO_ROUNDTRIP_GATE.md)) is why it works
this way. Built-in scenarios are code in a registry, and a Studio that wrote
them would be writing code.

## What a scenario holds

| Field | What it is |
|---|---|
| `format`, `formatVersion` | `gravitas.scenario-pack` and `1` |
| `id`, `version` | Lower-case words joined by hyphens, and a version such as `1.0.0` |
| `locales`, `title`, `summary`, `tags` | English always, Spanish as well; a title and a summary in each; up to four of the gallery's concept tags |
| `seed` | A whole number from 0 to 4294967295. The same seed builds the same world |
| `settings` | Any of the 47 settings a scenario can carry, grouped as physics, generated population, and time and display. A setting left out is the Gravitas default |
| `system` | An orbital system, entered as the [Orbital System Builder](ORBITAL_SYSTEM_BUILDER.md) takes it: a center and companions given by their elements |
| `bodies` | Typed bodies, entered as precise placement takes them: a class, a mass, a position and a velocity |
| `open`, `tools` | Panels and tools out at the start: the light curve, radial velocity, rotation curve, astrometry, pause at event and the 3-D view; the ruler, protractor and stopwatch |
| `camera`, `observer`, `paused` | Zoom, observer inclination and position angle, and whether it starts paused |

`sdk/schemas/scenario-pack-1.schema.json` is the same format as a JSON Schema,
generated from the validator's own rules (`js/platform/scenario.js`), and a
test holds the two to each other.

A scenario either generates its population from its settings under its seed,
as most built-ins do, or brings its own bodies. It cannot do both. Adding a
system or a typed body sets the generated counts to zero, and the validator
refuses a pack with bodies and a non-zero count. It says so on the count's own
field.

## Units, and nothing converted

Every field says its unit, and what is typed is what the file holds:

- **Mass** is in the class's own unit: solar masses for stars, white dwarfs,
  neutron stars and black holes; Jupiter masses for gas giants; Earth masses
  for rocky planets.
- **Position** is in simulation units, 100 to the AU, and **velocity** in
  simulation units per time unit.
- **Orbital elements** are in AU and degrees, as the builder takes them.
- **Settings** are in the units the Settings panel uses, and each number's
  bounds are written under it.

The Studio converts nothing behind the author's back. A number is stored as it
was entered, and a unit changes only when the author changes the class.

## Checks

The validator's complaints appear on the field each one is about, with
`aria-invalid` and a described-by error. They are also listed under Checks,
each named by its field's label; choosing one takes you to the field. A
scenario with a problem cannot be saved, copied or previewed.

Cautions are heuristics, and they never block anything:

- **The system:** the Orbital System Builder's own checks, namely overlap,
  contact at periapsis, Hill spheres, crossing orbits, and the Holman–Wiegert,
  Mardling–Aarseth and Gladman criteria.
- **The step:** an integration step longer than the system's shortest orbit
  wants.
- **Overlap:** two bodies that start inside each other, by the builder's rule,
  whenever a typed body is one of the pair.
- **Escape:** a typed body moving faster than the escape speed from everything
  else, taken as one mass at its barycenter. This is a two-body estimate. A
  body it names may still be captured, and one it passes may still be thrown
  out by a close encounter, which is why it is only a caution. It names only a
  body no heavier than the rest together, so a planet leaves its star and not
  the other way round.
- **A hand-built copy:** a scenario started from a built-in that places its
  bodies by code is told that only the settings came across.

Unbound orbits in a system are not a caution. The builder refuses an
eccentricity of 1 or more.

`npm run sdk -- validate` reports every caution as a warning (`packCautions`
in `js/scenarioPack.js`).

## Editing, and getting back from a mistake

- **Undo and redo:** every committed edit is one step, up to 200.
  - The buttons work anywhere.
  - Ctrl+Z (⌘Z) undoes; Ctrl+Shift+Z or Ctrl+Y redoes.
  - The keys do this anywhere outside a text field. A text field keeps its own
    undo for the typing it holds.
  - An undone state is the earlier document byte for byte.
- **Drafts:** the document is saved to this browser after every edit, keyed by
  its `id`, and the last one comes back when the page is opened again.
  - Drafts in this browser lists them, with open and delete.
  - A browser that refuses storage, such as a private window, is named on the
    page, so the author knows to save a file.
- **Raw data:** the whole document as JSON.
  - Apply refuses what does not parse, says why, and changes nothing.
  - What parses is applied as one undo step, and anything wrong in it is shown
    on its field, where it is put right.
  - Revert puts back the document as it is.
- **Open:** a scenario file, or an Orbital System Builder file, whose system
  becomes the scenario's bodies.
  - A file whose `id` belongs to a draft with different contents opens a dialog
    listing the fields that differ, with three choices: replace the draft, keep
    both (the file opens as `id-2`), or cancel.
  - A file from a newer Gravitas is refused, with its format version.
- **Changes:** every field that differs from the document as it was opened or
  last saved, by the validator's own paths (`settings.num_planets`,
  `bodies[1].mass`).

The page reads in English and Spanish, is operable by keyboard alone, passes
axe in both languages, and fits a phone.

## What comes out

- **A file:** Save writes `<id>.scenario.json`, two-space JSON. Opening it
  again changes nothing.
- **A link:** Copy link and Open in Gravitas give `/#…`. Preview puts
  `/?embed=1#…`, the same link as an embedded figure, in the page.
- **What opening does:** the link rebuilds the world from the default settings
  plus the scenario's settings, under its seed. That is how a built-in's preset
  changes the same defaults. Then:
  - a scenario with bodies has them restored, each made by its own class;
  - the panels and tools it names are pressed on the rail, as a reader's click
    would press them, so each brings its own module and strings;
  - Refresh Scenario builds the same world again, bodies included.
- **An extension:** `npm run sdk -- init scenario-pack <id> --from <file>` wraps
  the file as a scenario-pack extension (SDK 1.5.0).
  - `validate` checks it and `test` builds its world under its seed.
  - `test` then steps the world 300 times and builds it again, to check that it
    is the same world.
  - `pack` archives it.

## A scenario behaves like a built-in

The evidence is in `tests/scenarioPack.test.js`:

- **Every built-in is built twice**, as the application builds it by name and
  as a pack made from its preset, and every body is compared.
  - The 22 scenarios whose world is generated from their settings match
    exactly (`GENERATED_SCENARIOS`).
  - The other 37 place bodies by code. The test holds the list to the result in
    both directions.
- **The SDK round trip:** a pack goes through `init --from`, `validate`, `test`
  and `pack`, and the file read back from the archive is byte for byte the one
  exported.
- **Deterministic state:** the same pack builds the same world, compared
  through the experiment bench's canonical state hash. A different seed builds
  a different world.

`e2e/studio.spec.js` opens a pack's link in the application, against the
sources and against the build. A pack made from Star Cluster shows the
readout's census of the built-in. On the sources, that census is compared with
the built-in loaded by name under the same seed.

## Examples

**The figure-eight** (`sdk/examples/figure-eight/`) has three equal stars on
the orbit Chenciner and Montgomery (2000) proved exists. Its initial conditions
are the published ones, scaled to one solar mass per star and one AU per unit
of length at the sandbox's G = 2. It was made in the Studio as typed bodies
and wrapped with `init --from`.

**A copy of Star Cluster** is what Start from a built-in makes, once its
Spanish is written:

```json
{
  "format": "gravitas.scenario-pack",
  "formatVersion": 1,
  "id": "star-cluster",
  "version": "1.0.0",
  "locales": ["en", "es"],
  "title": { "en": "Dense Star Cluster (a copy)", "es": "Cúmulo estelar denso (una copia)" },
  "summary": { "en": "…", "es": "…" },
  "tags": ["galaxies-clusters", "chaos", "binary-systems"],
  "seed": 424242,
  "settings": {
    "gravitational_constant": 1.2,
    "num_planets": 80,
    "num_gas_giants": 15,
    "num_neutron_stars": 2,
    "num_white_dwarfs": 8,
    "init_velocity": 12,
    "velocity_stddev": 6,
    "num_black_holes": 0,
    "mutual_gravity": true,
    "sim_speed": 0.8,
    "trail_length": 25,
    "num_asteroids": 150
  },
  "open": ["lightCurve"],
  "tools": ["ruler"]
}
```

It opens as Star Cluster's world under seed 424242, with the light curve and
the ruler already out.

## What still needs the source

These are the scenario features that still require manual source editing. A
pack cannot do any of them:

- **A place in the gallery.** A pack travels as a file or a link.
  - It is not listed in the scenario gallery or the picker.
  - It has no thumbnail, no scenario-information card and no search entry.
  - A built-in is a preset in `js/scenarios.js`, an entry in
    `js/data/scenarioInfo.js`, its strings in `js/i18n/en.js` and
    `js/i18n/es.js`, and a thumbnail in `images/scenarios/`.
- **Geometry by rule.** 37 of the 59 built-ins place their bodies with code in
  `js/world/build.js`: spiral arms, resonant chains, Lagrange points, the
  gravitational-wave binaries and the rest.
  - A pack can place up to 40 bodies one by one, or an orbital system of up to
    12, but it cannot generate a geometry.
  - A pack started from one of those scenarios carries only its settings, and
    the Studio says so.
- **Some kinds of body.** Explicit bodies come in the builder's six classes:
  star, white dwarf, neutron star, black hole, gas giant and rocky planet.
  - Asteroids, comets and micro stars come only from the generated
    population's counts.
  - A galaxy, a comet on a chosen orbit, or debris needs code.
- **Settings outside the 47.** Some settings are read only by hand-built code:
  - the dark-matter halo and galaxy gravity, with their units;
  - the gravity-assist and circumbinary labs' variables;
  - per-neutron-star masses;
  - GW150914's input type.

  A copy leaves these out and names which. Interface preferences (quality,
  theme, units) are the reader's, not a scenario's.
- **Placement inside an instrument.** A pack opens the instruments but does not
  set them up: no ruler handles and no observed star. It sets only the
  observer's angles.
- **A place in a lesson.** A scenario's stage, probes, held predictions and
  grading in an investigation are code (`js/data/investigations/`).
- **Distribution in the application.** The catalog (`/catalog/`) does not list
  scenario packs yet. A maintainer vendors an accepted archive as for any
  other extension (sdk/README.md, "Vendoring").
- **The built-ins as packs.** The 22 generated built-ins could be pack files
  that the gallery reads, instead of presets. That would change the scenario
  registry, which the round-trip gate did not license, so it is left for a
  later step.
- **The engine itself.** New forces, body classes, integrators or collision
  rules belong in `js/physics.js`.

## Where it lives

- `studio/index.html` is the page. It is a document page of its own with its
  own bundle (`build.js`), and it is not precached. Its modules are under
  `js/` with the rest, but the page is not meant to work offline.
- `js/studioPage.js` is the page controller.
- `js/studio/model.js` holds the history, the drafts and the differences.
- `js/platform/scenario.js` is the format and its validator.
- `js/scenarioPack.js` has the compiler, the cautions, and the two starting
  points: a built-in's settings and a builder file.
- `js/scenarioPackWorld.js` builds a pack's world without a page, for the SDK
  and the tests.
- `js/startingPanels.js` is what a link loads to press the rail's controls.
- `js/i18n/en.studio.js` and `js/i18n/es.studio.js` hold the Studio's own
  words. Everything else on the page is from catalogs the application already
  has.
- Tests: `tests/studio.test.js` covers the history, the drafts, the
  differences and every key the page names in both languages;
  `tests/scenarioPack.test.js` covers the format, the compiler, the cautions,
  the built-ins and the SDK round trip; `e2e/studio.spec.js` covers the page.
