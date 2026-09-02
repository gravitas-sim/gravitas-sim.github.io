# The mass scale

Gravitas has one mass anchor: **1000 simulation units is a solar mass.** Every
other mass unit is a claim about how that anchor divides up, and a wrong one is
close to invisible, because the code that displays a mass usually divides by the
same constant the code that created it multiplied by. The readout agrees with
itself and disagrees with physics.

Two of the three unit constants were wrong that way. `JUPITER_MASS_UNIT` was
fixed earlier; this pass fixed the Earth one and the paths around it.

---

## What was wrong

**`EARTH_MASS_UNIT` was a literal 3, which is 1000x too heavy.** One Earth mass
is 1000/332946 = 0.0030035 units, not 3. A body built as "1 Earth mass" weighed a
thousandth of the Sun, roughly a Jupiter, and `formatMass` divided by the same 3
to print "1 M⊕" back.

**Two scenarios had noticed and patched around it locally.** The Solar System
carried `SOLAR_SYSTEM_MASS_SCALE = 0.001` and TRAPPIST-1 a `MASS_SCALE = 0.001`,
each applied at the point of use. Those constants are exactly the error. Both are
gone; the constant is right instead.

**The `Planet` constructor never applied the unit at all.** `const mass =
finalMassInEarths` stored the number of Earth masses straight into the simulation
mass, so a planet asked for as one Earth arrived weighing 333 of them. `GasGiant`
has always multiplied by `JUPITER_MASS_UNIT`; this was the same line, missing.
Every randomly generated planet in the app was affected.

**Five places set `.mass` and left `massInEarths` behind**, so the mass a body
gravitated with and the mass the inspector printed described two different
objects: the Kuiper Belt dwarf planets, the Black Hole Lab orbiters, 'Oumuamua,
HD 209458 b (a `Planet` object carrying a gas giant's mass), and the rocky
collision handler, which scaled `mass` by 0.9 and left the reported masses alone.

---

## Measured, before and after

Read off the running app. `stored` is `massInEarths`, `derived` is
`mass / EARTH_MASS_UNIT`, `true` is `mass / SOLAR_MASS_UNIT x 332946`:

| scenario | body | | stored | derived | true |
| --- | --- | --- | --- | --- | --- |
| Solar System | Earth | before | 1 | 0.001 | 0.999 |
| | | after | 1 | 1 | 1 |
| Habitable Zone Lab | Earth | before | 1 | 1 | **998.8** |
| | | after | 1 | 1 | 1 |
| Kuiper Belt | a dwarf planet | before | 0.204 | 0.068 | 67.9 |
| | | after | 0.2045 | 0.2045 | 0.2045 |

The Solar System was already right, because its local patch cancelled the error.
Everything that did not carry a patch was wrong by 1000x, and the Kuiper Belt was
wrong three different ways at once.

An independent check: the Solar System's barycenter now sits 0.0067 AU from the
center of the Sun, against a true value of about 0.005 AU and a solar radius of
0.00465 AU. It is just outside the surface, which is where it belongs.

---

## Verified

- **Every scenario in the catalog** loaded and run for six seconds, comparing
  each planet's two masses. Four disagreements found, all fixed, none remaining.
- **Orbits are unchanged** where planet mass is negligible, which is nearly
  everywhere: planets orbit stars a thousand times heavier and the scenarios
  overwhelmingly run with `star_only_gravity`.
- **New tests** in `tests/mass-scale.test.js` pin the Earth unit against the
  anchor, check that `Planet` and `GasGiant` land on one scale (one Jupiter =
  317.8 Earths in simulation units), and assert that 200 randomly generated
  planets all stay planet-sized. The suite already did this for Jupiter; the
  Earth half was missing, which is why the bug survived.

---

## The one scenario that had to be retuned

**Earth-Moon System.** Earth is the primary there, so making it 1000x lighter
made the Moon 32x slower: seven hours of wall clock per orbit.

The scenario is a schematic, and what it exaggerates is distance. The Moon is
drawn 35 units out where the truth at 100 units per AU is 0.26. Every mass,
radius and density in it is real, so the inspector tells the truth about both
bodies; what cannot also be true at that separation is the period. Earth's real
mass over 35 units gives an orbit of about 145 years.

So the exaggeration now sits in the scenario's `gravitational_constant`, raised
to 9000, rather than in its masses. A wrong G is visible in Settings and spoils
no readout, where the previous arrangement put the lie inside a number the
inspector then reported as fact. The Moon now takes about 100 seconds a lap in a
headless browser, which is ten times more watchable than it was before this
change, with correct masses.

---

## The small bodies

**`Asteroid`, `Comet` and `Debris` carried hardcoded masses** of 0.1, 0.1 and
0.01 units, set without reference to any unit constant. 0.1 units is 33 Earth
masses, which is not an asteroid; Ceres is 1.5e-4 Earth masses. These bodies did
not use `EARTH_MASS_UNIT` and so were outside the pass above, but `formatMass`
would happily print one of them in Earth masses and be wrong by five orders of
magnitude. That is now fixed, on the same architectural line `GasGiant` has
always had: a mass in the body's own natural unit, multiplied once by that
unit's size in simulation units.

Three new anchors in `js/constants.js`, all quoted in kilograms because that is
how a small body's mass is measured and published - there is no GM ratio against
the Sun known to ten digits for a comet:

| constant | value | what it is |
| --- | --- | --- |
| `CERES_MASS_KG` | 9.3835e20 | Ceres, from Dawn's gravity science |
| `HALLEY_MASS_KG` | 2.2e14 | comet 1P/Halley |
| `DEBRIS_FRAGMENT_MASS_KG` | 1.5708e12 | a 1 km sphere of rock at 3000 kg/m^3 |

and three units derived from them in `js/physics.js`, each through the single
`MASS_UNIT_KG` conversion the solar-mass anchor fixes:

| unit | simulation units | in Earth masses | was |
| --- | --- | --- | --- |
| `CERES_MASS_UNIT` | 4.7177e-7 | 1.571e-4 | 0.1 (33 M⊕) |
| `HALLEY_MASS_UNIT` | 1.1061e-13 | 3.68e-11 | 0.1 (33 M⊕) |
| `DEBRIS_MASS_UNIT` | 7.8974e-16 | 2.63e-13 | 0.01 (3.3 M⊕) |

`Asteroid` now takes a mass in Ceres masses and defaults to one Ceres. `Comet`
already counted in Halley masses and said so in a comment; only its multiplier
was wrong. `Debris` takes a count of kilometre-scale fragments.

Ceres is the largest asteroid rather than a typical one. It is the right end of
the distribution to anchor to here, because the simulation's asteroids are the
ones a student is meant to be able to see and click on, and it is the comparison
this document already used when it named the bug.

### Two thresholds that had to move with them

`Asteroid.tidal_mass_loss` disrupted a body once `this.mass <= 0.1`, and
`Comet.tidal_mass_loss` once `this.mass <= 0.01`. Both numbers were the class's
own construction mass written out again as a literal, so both conditions were
already true on the frame a body entered the tidal radius - which is the
behaviour the scenarios were built around. Left alone they would have stayed
true for a reason nobody could read off the line. They are now
`CERES_MASS_UNIT` and `0.1 * HALLEY_MASS_UNIT`: the same outcome, derived.

Two conversions in `js/ui.js` moved for the same reason. The inspector's mass
slider multiplied a comet's mass by a second hardcoded `0.1`, and
`transformCometToAsteroid` assigned `.mass` and left `massInCeres` behind -
the same "gravitates as one thing, labelled as another" failure this document
opens with.

### The scenario sweep

Thirty-one of the forty-eight shipped scenarios contain asteroids or comets.
`tools/small-body-sweep.mjs` runs all of them for thirty seconds of simulated
time from a fixed seed and records surviving body counts, collision events and
their timing, peak debris, ejections, and the median fractional change in the
small bodies' semi-major axes. It was run before and after the change and the
two runs diffed.

Nothing had to be retuned. Every difference was in the direction the correction
predicts, and several are outright improvements:

| scenario | before | after | reading |
| --- | --- | --- | --- |
| Kuiper Belt | median da 0.0018 | 0.0000 | the belt was 2.9% of the system mass and was perturbing itself; the orbits are now exactly stable, which is what the scenario is for |
| Pulsar System | median da 0.0003 | 0.0000 | the same, smaller |
| Stellar Graveyard | 5 asteroids left, 145 debris | 9 left, 112 debris | asteroids no longer fling each other apart |
| Slingshot | 28 left, 12 impacts | 32 left, 6 impacts | the same |
| Intermediate Mass BH | 54 peak debris | 16 | far less fragmentation from asteroid-asteroid hits |
| Supernova Remnant | 155 left, 76 impacts | 165 left, 62 impacts | the same |
| Supermassive BH | 82 left, 29 impacts | 74 left, 36 impacts | slightly more reach the hole, having stopped scattering each other |

No scenario lost its belt, gained a runaway, or changed its instructional
outcome. The asteroid and comet counts a scenario opens with are unchanged,
because those are settings rather than consequences.

The reason the change is this contained is that in most scenarios the small
bodies were never gravitational sources: they enter `cachedMajorSources` only
under `mutual_gravity` with `star_only_gravity` off. Where they were sources,
their combined share of the system mass was under a percent everywhere except
the Kuiper Belt, and that is the scenario the correction most improves.

### Verified

- **`tests/mass-scale.test.js`** grew the small-body half it was missing: the
  three units against the anchor, each class's gravitational mass against the
  mass it reports, linearity, the Ceres-to-Earth ratio this document quotes, and
  a check that all three masses stay finite and positive rather than underflowing
  to zero and dropping out of every barycenter.
- **The sweep above**, before and after, on all thirty-one scenarios.
- **The full physics validation suite**, unchanged.
