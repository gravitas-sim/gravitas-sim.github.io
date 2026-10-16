# Scenario geometry as data

Fifty-nine scenarios ship with Gravitas. Twenty-two are generated from their settings alone, and the Scenario Studio can start from any of those and build the same world. Thirty-seven placed their bodies by code in `js/world/build.js`: the Studio could import their settings and nothing else, and the catalog could not say what the bodies were. This is the staged move of that geometry into data (Roadmap II Prompt 108): one slice per pull request, each judged by the world golden.

Slices 1 to 6 are built, and a cleanup (slice 7) followed. All thirty-seven are declared, and the Solar System, the last, closed the move. What is still code in `js/world/build.js` is a short residue of behavior and generic population code, listed with a recommendation for each under "What stays code" at the end.

## The rules of the move

- A slice converts at most ten scenarios.
- The world golden (`e2e/golden/world-construction.json`) must not change for a converted scenario. A change needs a physics reason written in the pull request and Carl's approval; a slice that cannot hold the golden stops.
- Beyond the golden's one seed, each converted scenario is held to the world the code built at seven seeds (`tests/scenarioGeometry.test.js` against `tests/fixtures/scenarioGeometryGolden.json`, made from the hand-built blocks before they were deleted, by `tests/scenarioDigest.js`). The comparison covers every own property of every body (a field added to a body later is compared without anyone listing it), the settings the build leaves behind, the camera, and the next number the seeded generator returns, so a body made one step earlier or later fails it. Slice 2 widened the fixture from a list of named fields to every field and re-captured slice 1's scenarios from the code that preceded them: all forty-two worlds were equal.
- The pack format gains only the constructs a slice needs. Each construct has a validator (`validateGeometry` in `js/scenarioGeometry.js`) and a test; a construct a pack may carry also has its entry in the pack schema (`sdk/schemas/scenario-pack-1.schema.json`), and a built-ins-only construct is left out of that schema on purpose, with a test that the validator refuses it for a pack.
- World construction is unchanged in speed within measurement noise. The declaration is read once per build, as the code it replaced ran once per build.
- A scenario whose geometry cannot be written without code stays code, and is listed below with its reason.

## What a declaration is

The thirty-one declarations only the engine can build (slices 2 to 6) are `ENGINE_GEOMETRY` in `js/world/build.js`, beside the builder that reads them, so the start-up download of the routes that load `js/scenarios.js` does not pay for them; the builder looks a scenario up in `SCENARIO_GEOMETRY` first and `ENGINE_GEOMETRY` second, and the rest of this section applies to both. `SCENARIO_GEOMETRY` in `js/scenarios.js` maps a scenario's public id to `{steps: [...]}`. A geometry replaces the generated population: the application builds that population first, as it always did (the seeded generator is consumed in the same order), then empties every body list but the galaxies and makes the declared bodies. Each step holds exactly one construct.

| Construct | What it says | Validated by |
|---|---|---|
| `body` | A star, planet or gas giant: a type, a name, a mass in the type's own unit (`suns`, `earths`, `jupiters`), and a place (`at`, `velocity`) or an `orbit`. | `validateGeometry` |
| `from` (inside `body`; built-ins only) | Take the body from the generated population instead of making one: `{generated: index}` is the index-th star, planet, gas giant or black hole the seeded generator drew for the scenario's own counts, and `ifMissing` says whether to `skip` (the default) or `make` the body when the generator drew fewer. The body keeps its id and every field the generator gave it; the step sets the name, the mass (in simulation units and in the type's own unit, as the hand-built blocks did), the place if it gives one, and `set`. A black hole is only ever reused, and keeps its mass. `keepName: true` leaves the body the name it was drawn with (the step's name is then only what a later step refers to it by), for a scenario that never renamed it. | `validateGeometry` |
| `born` (inside `body`; built-ins only) | The mass the constructor is handed, when it is not the body's own: `{earths: 1}` for a planet whose `mass` is `{jupiters: 0.69}`. A constructor derives a radius, a density and (for a planet above three Earth masses) a draw from the generator out of the mass it is given, so a body the code built from a round number and then massed by hand needs both. With `born` the body's `mass` may be in any of the three units; it is stored in simulation units and in the unit given (a planet massed in Jupiters has `massInJupiters`; its `massInEarths`, the figure the inspector reads, is set by the step's `set`). | `validateGeometry` |
| `recenter` (beside `steps`; built-ins only) | Move the whole system into its center-of-mass frame once it is built (`zeroNetMomentum`), as the binary laboratories and the exoplanet laboratory did. | `validateGeometry` |
| `keep` (beside `steps`; built-ins only) | Population types (`Star`, `Planet`, `GasGiant`, `BlackHole`, `Asteroid`, `Comet`, `NeutronStar`, `WhiteDwarf`, `Debris`) whose generated bodies that no step reuses stay in the world as drawn; a type not named is emptied. TRAPPIST-1 keeps every type but `Planet`, as its block emptied only the planets. A pack that asks Binary Pair for a third star gets the stray the code always left. | `validateGeometry` |
| `orbit` (inside `body`) | Round a body named earlier: a `distance` (`au` or `units`; built-ins may also give `radii`, a multiple of the central body's drawn radius), an `eccentricity` (0 to under 1; 0 is a circle), an `angle` (`deg`, `rad` or `pi`, a multiple of pi; built-ins may give `{random: true}`, a phase drawn from the seeded generator at that step). The body starts at periapsis with the speed the two-body problem gives for the central body's mass: the circular speed when the eccentricity is 0. A quarter turn is exact (0 and 1, not 6e-17), as a place written by hand is. A built-in's circular orbit may be `barycentric`: the pair circles the central body's own place at the two-body speed for their total mass, and the central body takes its share of the motion, so the pair does not drift. A built-in's orbit may instead be `mutual` (the speed is the two-body speed for the pair's mass, about the central body's own place, which does not move: the primary's rest frame) and `retrograde` (the other way round). | `validateGeometry` |
| `set` (inside `body`) | The look of a body: `radius` (the drawn and contact size), `baseColor`, `persistent` (kept out of the cull and the merging). A built-in may also set the properties the engine's bodies carry and the readouts read (`GEOMETRY_ENGINE_SET` in `js/scenarioGeometry.js`: a star's true radius, luminosity, temperature and spectral type, whether the habitable zone is drawn, a world's diameter, gravity, atmosphere and the like). Nothing else may be set. | `validateGeometry` |
| `rule` | A named rule with parameters, for geometry a published table already holds. `published-system` builds the Galilean moons (optionally `detuned`), Pluto and Neptune, or Jupiter's Trojans from `js/resonance/systems.js`, which carries the measured elements and where each came from, TRAPPIST-1 from `js/data/trappist1.js` (the star the generator drew, kept, and seven planets), HD 209458 and its planet about their barycenter from `js/data/exoplanetSystems.js`, or the Solar System from the three tables in `js/world/build.js` (`solarSystemData`, `realAsteroids`, `famousComets`, which the model page lists with their sources). The laboratory rules (slice 3, below) and slice 4's (below) are built-ins' too: their parameters are the names, colors, drawn sizes and radii a scenario says about itself, and their formula reads the settings a student changes. A rule that makes bodies is a generator (`function*`), which `expandGeometry` consumes lazily, so each body is made before the next one's draws from the seeded generator, as the hand-built loops drew them. A parameter may be optional (`optional(kind)` in `js/scenarioGeometry.js`). | `validateGeometry` |

The arithmetic is `expandGeometry` in `js/scenarios.js`. It is written the way the hand-built blocks wrote it, so the numbers agree to within a unit in the last place (a barycentric pair groups a product one way where Binary Pair's block grouped it another); what the tests pin is the world golden's twelve significant figures, and `tests/scenarioGeometry.test.js` also checks the orbit against the closed forms (circular speed, vis-viva at periapsis) so the code it replaced is not the only witness.

Making a body draws from the seeded generator (a constructor picks its name), so bodies are made one at a time in the order of the steps, and a `random` angle is drawn at its step, after the bodies before it and before the one it places. A body taken from the generator (`from`) draws nothing. `initialize_simulation` stays synchronous.

## What a pack may carry

A scenario pack (`gravitas.scenario-pack/1`) may carry an optional `geometry`: the same steps, `body` only, with `orbit` and the look in `set`. The field is new inside version 1 (FORMATS.md, "Fields added inside a version"): a build from before it reports `unknownField`.

The constructs marked built-ins only are the ones a pack may not use: a rule, a body taken from the generator, `keep`, `recenter`, a body built from another mass (`born`), a distance in drawn radii, a random, barycentric, mutual or retrograde orbit, an engine property. Each is engine code, reads engine state (the drawn radius, the generator), or sets something the pack's share link does not carry (the link keeps a body's class, mass, contact radius, name, state, color and persistence, and nothing else), and `validateGeometry(g, {rules: false})` refuses each by name. A pack that wants a built-in's geometry names the built-in in `scenario`. A pack with geometry has no `system`, no `bodies` and no `scenario`, and its population counts are 0, as for any pack that brings bodies. It compiles to the same share link a typed body does, so the application needs no new loader: the compiled bodies keep the class, the mass, the contact radius, the name, the state, the `baseColor` and the `persistent` flag exactly as the declaration sets them (a body that does not set `persistent` is not persistent, as in the built-in).

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

## Slice 3

The ten laboratory scenarios. Their bodies are placed from settings a student (or a share link) changes: a mass, a separation, an impact parameter, a phase. A table row cannot hold those as numbers, and a language for reading a setting and doing arithmetic over it would be code in another syntax, with its own validator and its own bugs. The slice does it in two ways, each the smallest that holds the world.

**Plain bodies, three small constructs.** Transit Lab and Blended Binary are HD 209458 at true relative scale; every number is a constant of the published system (the one setting they read is G, through `orbit`). They are `body` steps with the star taken from the generator (`from`, made if it drew none), the planet in an orbit round it, and, for the companion, a `mutual` and `retrograde` orbit. The planet is massed in Jupiter masses, as the literature gives it, and built from one Earth mass, as the code built it (`born`).

**Named rules whose rows keep what the scenario says.** Each of the other eight is one `rule` step. The formula is a published construction (the CR3BP's rotating-frame convention in `js/cr3bp.js`, the closed-form binary layout in `js/binaryOrbits.js`, the encounter hyperbola in `js/gravityAssist.js`, the two-body circular speed, Lagrange's equilateral solution) and stays code in `js/world/build.js`, because what it computes is a function of the settings; the row keeps the names, the colors, the drawn sizes and which formula. Gravity Assist and Gravity Assist: Heliocentric share one rule and differ only in their settings; so do the two binary laboratories (`mode`). `GEOMETRY_RULES` in `js/scenarioGeometry.js` is the schema of each rule's parameters, and the validator names a missing, misspelled or out-of-range one.

| Rule | Reads these settings | Makes |
|---|---|---|
| `restricted-three-body` | `lagrange_primary_mass`, `lagrange_secondary_mass` (suns), `lagrange_separation` (AU), `lagrange_tracer_x`, `_y`, `_vx`, `_vy` (separations, rotating frame), `lagrange_tracer_fraction`, `gravitational_constant` | Two stars about the barycenter at the Kepler angular speed, and a tracer launched in the rotating frame |
| `circular-transfer` | `transfer_star_mass`, `transfer_inner_au`, `transfer_outer_au`, `transfer_probe_mass_ratio`, `transfer_target_phase_deg`, `gravitational_constant` | A star, a spacecraft and a target station on circular orbits, each at the speed for its own mass and the star's |
| `binary-lab` | `binary_lab_m1`, `_m2` (suns), `_separation` (AU), `_eccentricity`, `_binary_phase` (degrees), `_planet_a` (separations), `_planet_phase` (degrees), `gravitational_constant` | Two stars and one Earth-mass planet round one star or both (`mode`), with the stars drawn `drawExaggeration` times life size |
| `published-system` (`hd209458`) | `gravitational_constant` | HD 209458 and its planet about their barycenter |
| `equilateral-stars` | `gravitational_constant` | Three equal stars at the corners of a rigidly rotating equilateral triangle |
| `gravity-assist` | `assist_planet_mass` (Jupiters), `assist_planet_speed`, `assist_orbit_radius` (0: no star), `assist_impact_parameter`, `assist_v_infinity`, `assist_approach_deg`, `assist_gate`, `assist_probe_mass_ratio`, `gravitational_constant` | A star when there is an orbit, the planet, and a spacecraft on the exact encounter hyperbola (none when the gate is closer than periapsis) |

| Scenario | Constructs | World golden | Seven seeds | Share-link cases | In a pack |
|---|---|---|---|---|---|
| `lagrange-point-lab` | `rule` restricted-three-body | unchanged | identical | identical | names the built-in |
| `orbital-transfer-lab` | `rule` circular-transfer | unchanged | identical | identical | names the built-in |
| `binary-planet-lab` | `rule` binary-lab (circumstellar), `recenter` | unchanged | identical | identical | names the built-in |
| `circumbinary-planet-lab` | `rule` binary-lab (circumbinary), `recenter` | unchanged | identical | identical | names the built-in |
| `exoplanet-characterization-lab` | `rule` published-system (hd209458), `recenter` | unchanged | identical | identical | names the built-in |
| `transit-lab` | `body`, `from` (`ifMissing: make`), `born`, circular `orbit`, engine `set` | unchanged | identical | identical | names the built-in |
| `blended-binary` | as Transit Lab, and a `mutual` `retrograde` `orbit` | unchanged | identical | identical | names the built-in |
| `three-body-sensitivity-lab` | `rule` equilateral-stars | unchanged | identical | identical | names the built-in |
| `gravity-assist-lab` | `rule` gravity-assist | unchanged | identical | identical | names the built-in |
| `gravity-assist-heliocentric` | `rule` gravity-assist | unchanged | identical | identical | names the built-in |

No behavior differs from the code. The seven-seed fixture now holds seventy more worlds (every own field of every body, the settings, the camera and the generator's next draw); `tests/fixtures/scenarioGeometryLabGolden.json` holds the world the code made under 186 share-link cases (`tests/scenarioLabCases.js`: every lab's settings changed, and each population count at 0 and 3), one row per body hashed; and a base-versus-head fuzz over all twenty-two declared scenarios (every population count at 0 and 3 singly, 25 random combinations of counts, and 15 random combinations of lab settings with counts for each, 1,229 distinct worlds) found no difference. `tests/scenarioGeometry.test.js` also checks each laboratory against its closed form (the Kepler angular speed, the circular speed, the encounter's energy and angular momentum, the barycenter and the momentum), so the code it replaced is not the only witness.

Two things the declarations keep that look like faults, and are left alone because changing either would change the world. Transit Lab's planet carries 219.30 Earth masses (0.69 Jupiter masses times 317.828), while its gravitating mass is 219.35 Earth masses by `js/physics.js`'s own conversion: the code set the figure the first way and the mass the second, 0.02% apart, and the inspector reads the figure (D-GEOM-06). And when a share link asks for no stars, Transit Lab and Blended Binary make their star from one solar mass and then mass it 1.148 (`born`), as the code did,, so its initial mass is 1 and not 1.148.

What stayed code, and why: nothing of a laboratory's geometry. Each formula is in `js/world/build.js` as a rule, because it is arithmetic over settings, and each is in the table by name. The Studio lists these ten with the other hand-built scenarios (not as geometry a pack can carry): a pack that wants one names the built-in.

## Slice 4

Nine scenarios: the two galaxy discs and the cluster (disks and clusters), three systems of generated bodies on circular orbits (belts), the Kuiper belt, a tidal disruption and two black hole scenarios. Each placed its bodies in a block of `buildWorld` that ran after the generic placement, so each is a declaration run at the end of `buildWorld`, where the code it replaces ran for it. All built-ins only, as slice 3's: the formulas are arithmetic over the generated population and the settings, and each row keeps what the scenario says about itself (the names, the radii, the masses, which curve).

**Rules.** The arithmetic of each is in `populationRules` in `js/world/build.js`, written the way the blocks wrote it; `GEOMETRY_RULES` in `js/scenarioGeometry.js` is the schema of its parameters.

| Rule | What it makes | Reads |
|---|---|---|
| `tracer-disc` | A bulge and `count` equal tracer stars, even in log radius from `innerRadius` to `outerRadius`, each at the circular speed of the visible mass inside it (`keplerian`) or at one speed (`flat`), at a random phase | `gravitational_constant` |
| `bound-cluster` | `members` galaxies drawn from a centrally concentrated distribution on random orbits at a share of the speed the members and the halo together set; the first `ellipticals` are elliptical | `gravitational_constant`, `halo_v_flat`, `halo_core_radius` |
| `orbital-population` | The generated planets and gas giants on a ladder of radii (`inner`, then `step`) and the asteroids in a band (`inner`, then `span`; the first twelve named, for the Kuiper belt), each on the circular orbit about the origin at the speed for the first `centralStars` stars, at a random phase | `gravitational_constant`, the stars' masses |
| `circular-binary-stars` | Two stars of unequal mass on a circular orbit about a stationary center | `gravitational_constant` |
| `published-system` (`kuiper-belt`) | The eight named trans-Neptunian objects from the table in `js/world/build.js` (`kuiperBeltObjects`, which the model page lists with its sources) on the schematic ladder | `gravitational_constant`, the star's mass |
| `tidal-infall` | One star on a plunging ellipse about the first black hole (periapsis 1.5 of its drawn radii), begun part way down the infall | `gravitational_constant`, the hole's mass and drawn radius |
| `staggered-orbits` | The first black hole at rest at the origin and the others on circular orbits about it at 3.2, 5.1, ... of its drawn radii, even in phase | `gravitational_constant`, the hole's mass and drawn radius |
| `inspiral-pair` | The first two black holes about their center of mass at 0.92 of the circular speed for the pair | `gravitational_constant`, the holes' masses |

Where a rule places the generator's own bodies it hands back a record with `from`, so a body keeps its id and every field it was drawn with; Black Hole Billiards, GW150914, the rogue black hole and the tidal hole are placed that way.

| Scenario | Constructs | World golden | Seven seeds | Share-link cases | In a pack |
|---|---|---|---|---|---|
| `spiral-galaxy` | `rule` tracer-disc (keplerian) | unchanged | identical | identical | names the built-in |
| `milky-way-rotation` | `rule` tracer-disc (flat) | unchanged | identical | identical | names the built-in |
| `coma-cluster` | `rule` bound-cluster | unchanged | identical | identical | names the built-in |
| `binary-star-system` | `rule` circular-binary-stars, `rule` orbital-population, `keep`, `recenter` | unchanged | identical | identical | names the built-in |
| `rogue-encounter` | `rule` orbital-population, `body` `from` with `keepName`, `keep` | unchanged | identical | identical | names the built-in |
| `kuiper-belt` | `body` `from`, `rule` published-system (kuiper-belt), `rule` orbital-population, `keep` | unchanged | identical | identical | names the built-in |
| `tidal-disruption-event` | `body` `from` with `keepName`, `rule` tidal-infall, `keep`; since slice 7 also `place` `hole-and-planet` | unchanged | identical | identical | names the built-in |
| `black-hole-billiards` | `rule` staggered-orbits, `keep` | unchanged | identical | identical | names the built-in |
| `gw150914` | `rule` inspiral-pair, `keep` | unchanged | identical | identical | names the built-in |

No behavior differs from the code. The draws are the code's: each scenario draws the same number of numbers from the seeded generator, in the same order (a rule that makes bodies is a generator, so a body is made before the next body's draws), and the generator's next number after the build is part of every row of the fixture (`tail`); `tests/scenarioGeometrySlice4.test.js` pins the counts (182 for the two discs, 121 for the cluster, 88, 291 and 358 for the three belts, 5, 297 and 3 for the rest) and checks each world against its closed form. `tests/fixtures/scenarioGeometrySlice4Golden.json` holds the nine at seven seeds (every own field of every body, the settings, the camera and the generator's next draw, hashed per body list); `tests/fixtures/scenarioGeometrySlice4EdgeGolden.json` holds 227 share-link cases (`tests/scenarioSlice4Cases.js`: every population count at 0 and 3, the settings each formula reads, a count far above the scenario's own, and every layout the Settings panel offers, because a rebuild after Apply carries `placement` too). A base-versus-head fuzz over all thirty-one declared scenarios (every population count at 0 and 3 singly, every layout, 40 random combinations of counts, layout and settings each, and the cases above; 2,185 worlds, 1,955 distinct, 713 of them these nine) found no difference.

What stayed code, and why: slice 4 left the tidal disruption's old placement code (about a dozen lines in `applyPlacement`, which moved a hole and a planet before the generic placement's momentum balance) because deleting it moved two of 2,185 worlds; slice 7 converted it, unchanged in effect, into one `place` step (`hole-and-planet`, below). Everything else each block did is in its declaration.

## Slice 5

Five scenarios the earlier slices could not take: Binary Black Hole, Slingshot, Triple Black Hole System, Neutron Star Collision and White Dwarf Binary. They did not place their bodies after the generic placement; they placed them inside `applyPlacement`, between the layout and the momentum balance, so a declaration run at the end of `buildWorld` would have balanced a different state and moved every body that was not placed absolutely. The slice's one construct answers that.

**`place`.** A declaration may carry `place: [rule steps]` beside `steps`. The engine runs those rules at the point the code ran: inside `applyPlacement`, after the layout and before the balance (so at layout `Empty`, which returns before it, they do not run, as the code did not). A rule gives generated bodies a place and a velocity and draws nothing from the seeded generator; each is applied in place to the body the generator drew (`from`). A `place` step may name only a rule that places (`inspiral-pair`, `pin-pair`, `triangle-holes`, `hole-and-planet`); a geometry of `place` steps alone has no `steps`, and its end-of-build block does not run. A pack may not carry `place` (the schema has none; `validateGeometry(g, {rules: false})` refuses it).

| Rule | What it makes | Reads |
|---|---|---|
| `inspiral-pair` (slice 4) | Also used here as a `place` step: the first two black holes about their center of mass, 100 apart at 0.9 of the circular speed (Slingshot) or 120 apart at 0.95 (Binary Black Hole) | `gravitational_constant`, the holes' masses |
| `pin-pair` | The first two neutron stars or white dwarfs at (-x, 0) and (x, 0), moving at `speed` in opposite directions along y, when there are two | none |
| `triangle-holes` | The first three black holes on a circle of `radius`, a third of a turn apart, each at `speed` along the circle, when there are three | none |
| `hole-and-planet` (slice 7) | The first black hole at rest at the origin and the first planet at (`planetX`, 0) moving at `planetSpeed` along y, when there is one of each (Tidal Disruption Event: 150 and 80; live only when Settings changes the layout from `Empty`) | none |
| `name-pair` | Names for the first two neutron stars or white dwarfs, when there are two | none |
| `orbital-population` (slice 4) | Takes `centralHoles` (the first n generated black holes set the speed) instead of `centralStars`; exactly one of them | `gravitational_constant` |

| Scenario | Stage | Constructs | World golden | Seven seeds | Share-link cases | In a pack |
|---|---|---|---|---|---|---|
| `binary-bh` | `place`, then end of build | `inspiral-pair` (120, 0.95) twice, `orbital-population` (`centralHoles: 2`), every type kept | unchanged | identical | identical | names the built-in |
| `slingshot` | `place` | `inspiral-pair` (100, 0.9) | unchanged | identical | identical | names the built-in |
| `triple-bh-system` | `place` | `triangle-holes` (150, 15) | unchanged | identical | identical | names the built-in |
| `neutron-star-collision` | `place`, then end of build | `pin-pair` (50, 15), `name-pair`, every type kept | unchanged | identical | identical | names the built-in |
| `white-dwarf-binary` | `place` | `pin-pair` (80, 20) | unchanged | identical | identical | names the built-in |

Binary Black Hole is placed twice, as the code placed it: its pair in `applyPlacement` (which feeds the balance for every other body), and again at the end of the build after everything else, followed by the planets, gas giants and asteroids on circular orbits about the pair, each at a phase drawn there. Neutron Star Collision is named at the end of the build whatever the layout, which `place` (skipped at `Empty`) could not do, so it has both stages.

No behavior differs from the code. `tests/scenarioGeometrySlice5.test.js` holds the five at seven seeds (`tests/fixtures/scenarioGeometrySlice5Golden.json`) and 174 share-link cases (`tests/fixtures/scenarioGeometrySlice5EdgeGolden.json`, from `tests/scenarioSlice5Cases.js`: every population count at 0 and 3, the settings the placement reads, every layout), both captured from the code before it was changed, and pins the draw counts (129, 458, 88, 43 and 89 numbers at the default settings) and the generator's next number. A base-versus-head fuzz over all 59 scenarios (every population kind at 0 and 3 including the micro-star cloud, every layout, three seeds, 160 random combinations of counts, layout, masses and settings for each of the nine scenarios that place by hand and 24 for each other; 4,171 worlds, 3,750 distinct) found no difference, and a deliberate one-digit change to Slingshot's perturbation moved 149 of them, so the fuzz can see these placements.

What stayed code, and why: the tidal disruption's stub in `applyPlacement` (D-GEOM-07; deleting it moved two worlds), converted in slice 7 to a `place` step at the same point, and the Solar System (slice 6).

## Slice 6

The Solar System, the last hand-built scenario: the Sun, eight planets and giants from a published table, up to sixteen named asteroids and twelve named comets. It is `published-system` (`solar-system`) in `ENGINE_GEOMETRY`, with every type but the compact objects replaced (`keep`: the black holes, neutron stars, white dwarfs and debris the generator drew stay, as the code left them). No new construct: the rule is a generator like the Kuiper belt's, and the tables moved out of `buildWorld` to module level under the names the model page and `author:check` already read. The engine's record gained one optional field, `finish`, a function run once the body exists, for the two things a row cannot name: Saturn's rings, sized from the radius the constructor derived (1.3 and 2.2 of it), and an asteroid's reported Ceres count, re-synchronized with the mass it was given (`syncReportedMass`). `create` also learned the `Comet` type.

| Scenario | Constructs | World golden | Seven seeds | Share-link cases | In a pack |
|---|---|---|---|---|---|
| `solar-system` | `rule` published-system (solar-system), `keep`, `finish` | unchanged | identical | identical | names the built-in |

No behavior differs from the code. The draws are the code's: an asteroid's distance and phase and a comet's phase are drawn before the body is made, as the loops drew them (195 numbers at the default settings, 60 with three asteroids and three comets, 27 with none), and the generator's next number is part of every row of the fixture. `tests/scenarioGeometrySlice6.test.js` holds the world at seven seeds (`tests/fixtures/scenarioGeometrySlice6Golden.json`) and under 51 share-link cases (`tests/fixtures/scenarioGeometrySlice6EdgeGolden.json`, from `tests/scenarioSlice6Cases.js`: every population count at 0 and 3, counts either side of the tables' lengths, the asteroid switch, the gravitational constant, every layout and the low quality tier's caps), both captured from the code before it was changed, and checks the world against its closed forms (circular speeds at the table's distances, Saturn's rings, the comets' semi-major axes). A base-versus-head fuzz over all 59 scenarios found no difference (`tools/geometry-fuzz.mjs`, below).

## The base-versus-head fuzz

`node tools/geometry-fuzz.mjs out.json` builds every built-in scenario under 4,231 settings (three seeds, every population count at 0 and 3, every layout, the low tier, and seeded random combinations of counts, layout, masses and settings, 160 each for the nine scenarios that place by hand and 24 for the others) and writes one hash per world; run it in a checkout of the base and of the head and compare with `node tools/geometry-fuzz.mjs --compare base.json head.json`. It takes about five seconds. The hash covers every own property of every body, the settings the build leaves behind, the camera and the seeded generator's next number, so a body made one draw earlier or later changes it. Slices 2 and 4 each found a behavior difference with it that no hand-picked case showed. A deliberate one-digit change to Saturn's ring opacity moves 186 of the worlds, and dropping the asteroid re-synchronization moves 149, so it can see this slice's details.

## What stays code

No scenario's geometry needed code the constructs could not express, so there are no documented exceptions. What remains in `js/world/build.js` (and `js/scenarios.js`) is behavior and generic population code, with a recommendation for each:

| What | Where | Why it is code | Recommendation |
|---|---|---|---|
| Names for generated bodies in `sagittarius-a`, `galactic-center`, `pulsar-system` | `buildWorld`, before the declared block | They place nothing; they are already generated scenarios the Studio builds from settings | Leave. Declaring them would add a rename rule and a schema for three names lists and change no world and no catalog entry. |
| The central star added before generation for `kuiper-belt`, `rogue-encounter` and `solar-system` (a named anchor, `isCentralBody`) | `buildWorld` | It is part of the generated population: it takes the first star's place and draws from the seeded generator, so removing it, even for the Solar System, which replaces it, changes the draws and the worlds | Leave. |
| The micro-star cloud (`num_micro_stars`) and the slingshot test star (`test_star_slingshot`) | `buildWorld` | Settings a student turns on in any scenario, not a scenario's geometry | Leave. |
| The Pinwheel flyby | `applyPresetLayout` in `js/scenarios.js` | Reads a setting the preset records, not a scenario id | Leave. |
| Earth-Moon's `sim_size` and Kepler's 2nd Law's area-sweep overlay | `buildWorld` | A setting and a behavior, not geometry (slices 1 and 2) | Leave. |

The Scenario Studio's group of thirty-five scenarios (the thirty-one engine-only ones and the four resonance systems, whose rule a pack may not carry; D-GEOM-05) was labeled "Settings only (bodies placed by code)", which stopped being true of how they are built; slice 7 rewords the label and its caution (`studio.caution.handBuilt`) in both languages ("the engine builds the bodies"; the Spanish wording has not had a native review, D-PLAN-02). The catalog has no field that describes a built-in's declared bodies: nothing in Prompt 108 specifies one beyond the Studio and the validators, so it is listed here and not built.

## If the move continues

The move is complete; a later pass would take the first row of the table above. Branch `refactor/declarative-geometry-<n>` from the integration branch. Read this file, `SCENARIO_GEOMETRY`, `ENGINE_GEOMETRY` and `expandGeometry` first; add a construct or a rule only with its schema entry, its validator branch and its test; capture the fixture from the code before changing it (`tests/scenarioDigest.js` run over the scenarios at the seven seeds, in a worktree at the commit before the change, is all it takes; also capture the share-link cases, including every layout, and run `tools/geometry-fuzz.mjs` in the base and the head); and regenerate the golden never. If the golden moves, the stop rule applies. Every module over 1,500 lines has a line ceiling (`tools/module-size-ceilings.json`); the rule schemas are written compactly for that reason.
