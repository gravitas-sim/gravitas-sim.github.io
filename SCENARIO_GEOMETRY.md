# Scenario geometry as data

Fifty-nine scenarios ship with Gravitas. Twenty-two are generated from their settings alone, and the Scenario Studio can start from any of those and build the same world. Thirty-seven placed their bodies by code in `js/world/build.js`: the Studio could import their settings and nothing else, and the catalog could not say what the bodies were. This is the staged move of that geometry into data (Roadmap II Prompt 108): one slice per pull request, each judged by the world golden.

Slices 1 and 2 are built. Twelve scenarios are declared; twenty-five are still code.

## The rules of the move

- A slice converts at most ten scenarios.
- The world golden (`e2e/golden/world-construction.json`) must not change for a converted scenario. A change needs a physics reason written in the pull request and Carl's approval; a slice that cannot hold the golden stops.
- Beyond the golden's one seed, each converted scenario is held to the world the code built at seven seeds (`tests/scenarioGeometry.test.js` against `tests/fixtures/scenarioGeometryGolden.json`, made from the hand-built blocks before they were deleted, by `tests/scenarioDigest.js`). The comparison covers every own property of every body (a field added to a body later is compared without anyone listing it), the settings the build leaves behind, the camera, and the next number the seeded generator returns, so a body made one step earlier or later fails it. Slice 2 widened the fixture from a list of named fields to every field and re-captured slice 1's scenarios from the code that preceded them: all forty-two worlds were equal.
- The pack format gains only the constructs a slice needs. Each construct has a validator (`validateGeometry` in `js/scenarioPack.js`) and a test; a construct a pack may carry also has its entry in the pack schema (`sdk/schemas/scenario-pack-1.schema.json`), and a built-ins-only construct is left out of that schema on purpose, with a test that the validator refuses it for a pack.
- World construction is unchanged in speed within measurement noise. The declaration is read once per build, as the code it replaced ran once per build.
- A scenario whose geometry cannot be written without code stays code, and is listed below with its reason.

## What a declaration is

The six declarations only the engine can build (slice 2) are `ENGINE_GEOMETRY` in `js/world/build.js`, beside the builder that reads them, so the start-up download of the routes that load `js/scenarios.js` does not pay for them; the builder looks a scenario up in `SCENARIO_GEOMETRY` first and `ENGINE_GEOMETRY` second, and the rest of this section applies to both. `SCENARIO_GEOMETRY` in `js/scenarios.js` maps a scenario's public id to `{steps: [...]}`. A geometry replaces the generated population: the application builds that population first, as it always did (the seeded generator is consumed in the same order), then empties every body list but the galaxies and makes the declared bodies. Each step holds exactly one construct.

| Construct | What it says | Validated by |
|---|---|---|
| `body` | A star, planet or gas giant: a type, a name, a mass in the type's own unit (`suns`, `earths`, `jupiters`), and a place (`at`, `velocity`) or an `orbit`. | `validateGeometry` |
| `from` (inside `body`; built-ins only) | Take the body from the generated population instead of making one: `{generated: index}` is the index-th star, planet, gas giant or black hole the seeded generator drew for the scenario's own counts, and `ifMissing` says whether to `skip` (the default) or `make` the body when the generator drew fewer. The body keeps its id and every field the generator gave it; the step sets the name, the mass (in simulation units and in the type's own unit, as the hand-built blocks did), the place if it gives one, and `set`. A black hole is only ever reused, and keeps its mass. | `validateGeometry` |
| `keep` (beside `steps`; built-ins only) | Population types (`Star`, `Planet`, `GasGiant`, `BlackHole`, `Asteroid`, `Comet`, `NeutronStar`, `WhiteDwarf`, `Debris`) whose generated bodies that no step reuses stay in the world as drawn; a type not named is emptied. TRAPPIST-1 keeps every type but `Planet`, as its block emptied only the planets. A pack that asks Binary Pair for a third star gets the stray the code always left. | `validateGeometry` |
| `orbit` (inside `body`) | Round a body named earlier: a `distance` (`au` or `units`; built-ins may also give `radii`, a multiple of the central body's drawn radius), an `eccentricity` (0 to under 1; 0 is a circle), an `angle` (`deg`, `rad` or `pi`, a multiple of pi; built-ins may give `{random: true}`, a phase drawn from the seeded generator at that step). The body starts at periapsis with the speed the two-body problem gives for the central body's mass: the circular speed when the eccentricity is 0. A quarter turn is exact (0 and 1, not 6e-17), as a place written by hand is. A built-in's circular orbit may be `barycentric`: the pair circles the central body's own place at the two-body speed for their total mass, and the central body takes its share of the motion, so the pair does not drift. | `validateGeometry` |
| `set` (inside `body`) | The look of a body: `radius` (the drawn and contact size), `baseColor`, `persistent` (kept out of the cull and the merging). A built-in may also set the properties the engine's bodies carry and the readouts read (`GEOMETRY_ENGINE_SET` in `js/scenarioPack.js`: a star's true radius, luminosity, temperature and spectral type, whether the habitable zone is drawn, a world's diameter, gravity, atmosphere and the like). Nothing else may be set. | `validateGeometry` |
| `rule` | A named rule with parameters, for geometry a published table already holds. `published-system` builds the Galilean moons (optionally `detuned`), Pluto and Neptune, or Jupiter's Trojans from `js/resonance/systems.js`, which carries the measured elements and where each came from, or TRAPPIST-1 from `js/data/trappist1.js` (the star the generator drew, kept, and seven planets). | `validateGeometry` |

The arithmetic is `expandGeometry` in `js/scenarios.js`. It is written the way the hand-built blocks wrote it, so the numbers agree to within a unit in the last place (a barycentric pair groups a product one way where Binary Pair's block grouped it another); what the tests pin is the world golden's twelve significant figures, and `tests/scenarioGeometry.test.js` also checks the orbit against the closed forms (circular speed, vis-viva at periapsis) so the code it replaced is not the only witness.

Making a body draws from the seeded generator (a constructor picks its name), so bodies are made one at a time in the order of the steps, and a `random` angle is drawn at its step, after the bodies before it and before the one it places. A body taken from the generator (`from`) draws nothing. `initialize_simulation` stays synchronous.

## What a pack may carry

A scenario pack (`gravitas.scenario-pack/1`) may carry an optional `geometry`: the same steps, `body` only, with `orbit` and the look in `set`. The field is new inside version 1 (FORMATS.md, "Fields added inside a version"): a build from before it reports `unknownField`.

The constructs marked built-ins only are the ones a pack may not use: a rule, a body taken from the generator, `keep`, a distance in drawn radii, a random or barycentric orbit, an engine property. Each is engine code, reads engine state (the drawn radius, the generator), or sets something the pack's share link does not carry (the link keeps a body's class, mass, contact radius, name, state, color and persistence, and nothing else), and `validateGeometry(g, {rules: false})` refuses each by name. A pack that wants a built-in's geometry names the built-in in `scenario`. A pack with geometry has no `system`, no `bodies` and no `scenario`, and its population counts are 0, as for any pack that brings bodies. It compiles to the same share link a typed body does, so the application needs no new loader: the compiled bodies keep the class, the mass, the contact radius, the name, the state, the `baseColor` and the `persistent` flag exactly as the declaration sets them (a body that does not set `persistent` is not persistent, as in the built-in).

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

What stayed code, and why: Kepler's 2nd Law also turns on an area-sweep overlay 200 ms after the world is built. That is behavior, not geometry, and it stays in `js/world/build.js`, finding the eccentric orbiter by its declared name. A pack made from it does not carry the overlay, and the Studio says so as a caution.

Why only six, when ten were allowed: the other candidates reuse the generated bodies (they rename, recolor and move what the generator made, so their ids and the generator's sequence depend on how many were drawn), draw a random phase from the seeded generator, or read lab variables from the settings. Each of those needs a construct this slice did not build. Building one construct for each of two scenarios would have been the wrong size for a pull request that has to hold the golden.

## Slice 2

Six scenarios whose numbers are fixed, whatever the settings say, and whose geometry was code that renamed, recolored and moved the bodies the generator had drawn, or made a few of its own. The slice builds the constructs those blocks needed (`from`, `keep`, `radii`, a `random` angle, a `barycentric` orbit, the engine's own properties in `set`, and TRAPPIST-1 as a published system) and nothing the other ten candidates would need (they read the lab variables from the settings; see below).

| Scenario | Constructs | World golden | Seven seeds | In a pack |
|---|---|---|---|---|
| `earth-moon-system` | `body`, `orbit` barycentric with a `random` angle, engine `set` (diameter, gravity, atmosphere and the rest) | unchanged | identical | names the built-in |
| `interstellar-visitor` | `from` (`ifMissing: make`), circular `orbit` at a quarter turn, engine `set` | unchanged | identical | names the built-in |
| `binary-pair` | `from`, `keep`, barycentric `orbit`, engine `set` | unchanged | identical | names the built-in |
| `black-hole-lab` | `from` (a black hole and four planets), `keep`, `orbit` in `radii`, engine `set` | unchanged | identical | names the built-in |
| `habitable-zone-lab` | `from`, `keep`, circular `orbit`, engine `set` | unchanged | identical | names the built-in |
| `trappist-1-system` | `rule` published-system (trappist-1), `keep` | unchanged | identical | names the built-in |

What stayed code, and why: Earth-Moon System sets the size of the simulated space (`sim_size`, 'Small') once the world exists. That is a setting, not geometry, and it stays in `js/world/build.js` beside the declaration.

This is the one place a converted scenario is not behavior-identical to the code it replaced (D-GEOM-05): a planet that orbits a body that is not there is not made. Only a share link or a pack that names the scenario and sets a population count to 0 reaches it. The code left Black Hole Lab's generated planets where the generator put them when there was no black hole, and put Habitable Zone Lab's four planets on orbits about nothing when there was no star. Everything else a changed count did, the declarations still do (`tests/fixtures/scenarioGeometryEdgeGolden.json`, 62 cases, and a fuzz of every population count against the code, 2,112 worlds, which found no other difference: extra generated bodies stay or go as the code left them, a missing Sun is made, a missing star leaves Binary Pair with one, a count the scenario does not use changes nothing).

Why these six, when ten were allowed: the ten that remain from the first reading of slice 2 are the laboratory scenarios, whose bodies are placed from the settings a student changes (a mass ratio, a separation, an impact parameter). They need a construct that reads a setting as a value, and arithmetic over it, which is a language of its own (and, for a pack, a different thing: a pack's settings are in the pack). Six scenarios with six constructs, each judged against the golden, is the size this slice can hold; the laboratory scenarios are slice 3.

Why none of the six is a pack's to carry: a pack's share link keeps a body's class, mass, contact radius, name, state, color and persistence. These scenarios depend on fields the link does not keep (a star's true radius and luminosity for the habitable zone ring, the Earth and Moon's own properties, a black hole's disk) and on engine state (the black hole's drawn radius), so a pack that wants one names the built-in, as it does for the resonance systems. Carrying them would need the pack's body to carry a property set, which is a change to the link's format and its own decision.

## Still code

Twenty-five scenarios. The grouping is from a first reading of `js/world/build.js` and is the plan for the later slices; the slice that takes a scenario reads it again and moves it if the reading was wrong.

| Slice | Constructs it needs | Scenarios |
|---|---|---|
| 3: laboratory scenarios that read settings | a setting read as a value, with the arithmetic over it (a mass, a separation, a ratio, an angle in degrees), as a built-in's own construct | `lagrange-point-lab`, `orbital-transfer-lab`, `binary-planet-lab`, `circumbinary-planet-lab`, `exoplanet-characterization-lab`, `transit-lab`, `blended-binary`, `three-body-sensitivity-lab`, `gravity-assist-lab`, `gravity-assist-heliocentric` |
| 4: disks, belts and hand-placed holes | rings and belts as seeded radial and angular distributions; black holes and compact objects placed by name | `kuiper-belt`, `solar-system`, `rogue-encounter`, `binary-star-system`, `binary-bh`, `gw150914`, `black-hole-billiards`, `triple-bh-system`, `slingshot`, `tidal-disruption-event`, `neutron-star-collision`, `white-dwarf-binary` |
| 5: clusters and galaxies | distributions with seeds (a disk with a rotation curve, a cluster with a density profile) | `spiral-galaxy`, `milky-way-rotation`, `coma-cluster` |

Documented exceptions: none yet. A scenario that cannot be expressed without code will be listed here with the reason when a slice finds one.

## For the next slice

Branch `refactor/declarative-geometry-<slice>` from the integration branch. Read this file, `SCENARIO_GEOMETRY` and `expandGeometry` first; add a construct only with its schema entry, its validator branch and its test; capture the fixture from the code before deleting it (`tests/scenarioDigest.js` run over the scenarios at the seven seeds, in a worktree at the commit before the change, is all it takes; also capture the share-link edge cases for any scenario that reuses generated bodies); and regenerate the golden never. If the golden moves, the slice stops.
