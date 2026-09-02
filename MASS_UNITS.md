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

## Not done

**`Asteroid`, `Comet` and `Debris` carry hardcoded masses** of 0.1, 0.1 and 0.01
units, set without reference to any unit constant. 0.1 units is 33 Earth masses,
which is not an asteroid; Ceres is 1.5e-4 Earth masses. These bodies do not use
`EARTH_MASS_UNIT` and so were outside this pass, but `formatMass` will happily
print one of them in Earth masses and be wrong by five orders of magnitude.
Fixing it changes collision and merger behavior across many scenarios, so it
wants its own change with a scenario sweep behind it.
