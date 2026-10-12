# Scenario geometry as data

Fifty-nine scenarios ship with Gravitas. Twenty-two are generated from their settings alone, and the Scenario Studio can start from any of those and build the same world. Thirty-seven placed their bodies by code in `js/world/build.js`: the Studio could import their settings and nothing else, and the catalog could not say what the bodies were. This is the staged move of that geometry into data (Roadmap II Prompt 108): one slice per pull request, each judged by the world golden.

Slice 1 is built. Six scenarios are declared; thirty-one are still code.

## The rules of the move

- A slice converts at most ten scenarios.
- The world golden (`e2e/golden/world-construction.json`) must not change for a converted scenario. A change needs a physics reason written in the pull request and Carl's approval; a slice that cannot hold the golden stops.
- Beyond the golden's one seed, each converted scenario is held to the world the code built at seven seeds (`tests/scenarioGeometry.test.js` against `tests/fixtures/scenarioGeometryGolden.json`, made from the hand-built blocks before they were deleted). The comparison covers every body's class, id, name, mass, drawn radius, position, velocity and color, the settings the build leaves behind, the camera, and the next number the seeded generator returns, so a body made one step earlier or later fails it.
- The pack format gains only the constructs a slice needs. Each has a schema (`sdk/schemas/scenario-pack-1.schema.json`), a validator (`validateGeometry` in `js/scenarioPack.js`) and a test.
- World construction is unchanged in speed within measurement noise. The declaration is read once per build, as the code it replaced ran once per build.
- A scenario whose geometry cannot be written without code stays code, and is listed below with its reason.

## What a declaration is

`SCENARIO_GEOMETRY` in `js/scenarios.js` maps a scenario's public id to `{steps: [...]}`. A geometry replaces the generated population: the application builds that population first, as it always did (the seeded generator is consumed in the same order), then empties every body list but the galaxies and makes the declared bodies. Each step holds exactly one construct.

| Construct | What it says | Validated by |
|---|---|---|
| `body` | A star, planet or gas giant: a type, a name, a mass in the type's own unit (`suns`, `earths`, `jupiters`), and a place (`at`, `velocity`) or an `orbit`. | `validateGeometry` |
| `orbit` (inside `body`) | Round a body named earlier: a `distance` (`au` or `units`), an `eccentricity` (0 to under 1; 0 is a circle), an `angle` (`deg`, `rad` or `pi`, a multiple of pi). The body starts at periapsis with the speed the two-body problem gives for the central body's mass: the circular speed when the eccentricity is 0. | `validateGeometry` |
| `set` (inside `body`) | The look of a body: `radius` (the drawn and contact size), `baseColor`, `persistent` (kept out of the cull and the merging). Nothing else may be set. | `validateGeometry` |
| `rule` | A named rule with parameters, for geometry a published table already holds. `published-system` builds the Galilean moons (optionally `detuned`), Pluto and Neptune, or Jupiter's Trojans from `js/resonance/systems.js`, which carries the measured elements and where each came from. | `validateGeometry` |

The arithmetic is `expandGeometry` in `js/scenarios.js`. It is written the way the hand-built blocks wrote it, so the numbers agree to the last bit, and `tests/scenarioGeometry.test.js` also checks the orbit against the closed forms (circular speed, vis-viva at periapsis) so the code it replaced is not the only witness.

Making a body draws from the seeded generator (a constructor picks its name), so bodies are made one at a time in the order of the steps. `initialize_simulation` stays synchronous.

## What a pack may carry

A scenario pack (`gravitas.scenario-pack/1`) may carry an optional `geometry`: the same steps, `body` only. A pack may not use `rule`, because the rule's code belongs to the engine; a pack that wants a built-in's rule names the built-in in `scenario`. The field is new inside version 1 (FORMATS.md, "Fields added inside a version"): a build from before it reports `unknownField`.

A pack with geometry has no `system`, no `bodies` and no `scenario`, and its population counts are 0, as for any pack that brings bodies. It compiles to the same share link a typed body does, so the application needs no new loader: the compiled bodies keep the class, the mass, the contact radius, the name and the state, and not the cosmetic `baseColor`.

In the Scenario Studio, "Start from" now offers the scenarios with declared geometry as a group of their own. Choosing one fills in the settings (with the population counts at 0) and the geometry, and the page says so. The geometry is shown as a block that can be removed, as the 3-D system is; it is not yet editable step by step.

## Slice 1

| Scenario | Constructs | World golden | Seven seeds | In a pack |
|---|---|---|---|---|
| `retrograde-mars` | `body`, circular `orbit`, `set` | unchanged | identical | yes |
| `keplers-2nd-law` | `body`, eccentric `orbit` from periapsis, `set` | unchanged | identical | yes |
| `galilean-resonance` | `rule` published-system (galilean) | unchanged | identical | names the built-in |
| `broken-laplace-resonance` | `rule` published-system (galilean, detuned) | unchanged | identical | names the built-in |
| `pluto-and-neptune` | `rule` published-system (pluto-neptune) | unchanged | identical | names the built-in |
| `jupiter-trojans` | `rule` published-system (jupiter-trojans) | unchanged | identical | names the built-in |

What stayed code, and why: Kepler's 2nd Law also turns on an area-sweep overlay 200 ms after the world is built. That is behavior, not geometry, and it stays in `js/world/build.js`, finding the eccentric orbiter by its declared name.

Why only six, when ten were allowed: the other candidates reuse the generated bodies (they rename, recolor and move what the generator made, so their ids and the generator's sequence depend on how many were drawn), draw a random phase from the seeded generator, or read lab variables from the settings. Each of those needs a construct this slice did not build. Building one construct for each of two scenarios would have been the wrong size for a pull request that has to hold the golden.

## Still code

Thirty-one scenarios. The grouping is from a first reading of `js/world/build.js` and is the plan for the later slices; the slice that takes a scenario reads it again and moves it if the reading was wrong.

| Slice | Constructs it needs | Scenarios |
|---|---|---|
| 2: bodies that are elements, with a few drawn from the seeded generator | the generated bodies reused by index (`from: generated`), a random phase drawn in order, settings read as values | `earth-moon-system`, `interstellar-visitor`, `binary-pair`, `black-hole-lab`, `habitable-zone-lab`, `trappist-1-system`, `lagrange-point-lab`, `orbital-transfer-lab`, `binary-planet-lab`, `circumbinary-planet-lab`, `exoplanet-characterization-lab`, `transit-lab`, `blended-binary`, `three-body-sensitivity-lab`, `gravity-assist-lab`, `gravity-assist-heliocentric` |
| 3: disks, belts and hand-placed holes | rings and belts as seeded radial and angular distributions; black holes and compact objects placed by name | `kuiper-belt`, `solar-system`, `rogue-encounter`, `binary-star-system`, `binary-bh`, `gw150914`, `black-hole-billiards`, `triple-bh-system`, `slingshot`, `tidal-disruption-event`, `neutron-star-collision`, `white-dwarf-binary` |
| 4: clusters and galaxies | distributions with seeds (a disk with a rotation curve, a cluster with a density profile) | `spiral-galaxy`, `milky-way-rotation`, `coma-cluster` |

Documented exceptions: none yet. A scenario that cannot be expressed without code will be listed here with the reason when a slice finds one.

## For the next slice

Branch `refactor/declarative-geometry-<slice>` from the integration branch. Read this file, `SCENARIO_GEOMETRY` and `expandGeometry` first; add a construct only with its schema entry, its validator branch and its test; capture the fixture from the code before deleting it (a script that builds each scenario at the seven seeds with the generator's next draw is all it takes); and regenerate the golden never. If the golden moves, the slice stops.
