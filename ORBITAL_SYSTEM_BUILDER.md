# Orbital System Builder

A form that builds a physically coherent two-dimensional hierarchical system
from orbital elements, so a student or an instructor never has to turn
elements into positions and velocities by hand. It opens from the Scenario
section of the rail, beside Blank Simulation: like a scenario, it replaces the
world.

## What you enter

The first body is the center of the system. Every other body is a companion,
and for each one you enter:

| Field | Meaning |
|---|---|
| Orbits | Any body listed above it |
| Type | Star, white dwarf, neutron star, black hole, gas giant or rocky planet |
| Mass | In the type's own unit: solar, Jupiter or Earth masses |
| Contact radius | Optional. The model radius collisions test against, in simulation units. Blank uses the class's own rule for that mass |
| Semi-major axis | In AU |
| Eccentricity | 0 to 0.99. An entry of 1 or more is refused as unbound |
| Argument of periapsis | The direction of periapsis, in degrees from +x |
| Starting mean anomaly | 0 starts at periapsis, 180 at apoapsis |
| Direction | Prograde (counter-clockwise on the canvas) or retrograde |

There is no inclination and no node, because the dynamics are planar.

Six templates start from real systems:

- a star and a planet;
- the Sun, Earth and Moon;
- the Sun, Jupiter and Saturn;
- Kepler-16 (Doyle et al. 2011);
- Alpha Centauri A and B, with a hypothetical planet around A;
- a hierarchical triple star.

## How the system is built

The list is a tree: every companion names a primary that comes before it, so
there is exactly one construction order.

- **Innermost first.** A primary's companions are added in order of
  semi-major axis.
- **Each orbits everything inside it.** A companion orbits the barycenter of
  everything already inside its orbit: the primary, the primary's inner
  companions, and their own companions. This is the Jacobi construction. It
  is why Jupiter's elements are about the Sun and the Earth–Moon pair
  together, and not about a Sun the Earth has already pulled off center.
- **Each step is an exact two-body split.**
  - The companion's subtree (mass m) and the inner system (mass M) move on
    the entered relative orbit, with μ = G(M + m).
  - The inner system moves by −m/(M + m) of the relative vector, and the
    companion's subtree by M/(M + m) of it.
  - So the finished system has its barycenter at the origin and zero net
    momentum by construction, not by a correction afterwards.
- **What the table shows** for each orbit, in construction order:
  - the Keplerian period;
  - periapsis and apoapsis;
  - the barycenter offset: how far the inner system sits from the pair's
    barycenter. This is the reflex orbit a radial-velocity survey measures.

The system is built with the sandbox's default gravitational constant (G = 2).
The periods are physical, because the time unit follows G (`js/units.js`).

## What the elements are once it runs

**They are osculating.** Each describes the two-body orbit a companion would
follow if only the bodies inside its orbit pulled on it. In the full N-body
evolution every other body perturbs it, and its a, e and periapsis wander.

**A worked example.** In the Sun, Earth and Moon template, the Moon starts
with e = 0.0549 and its osculating eccentricity ranges over **0.054–0.12**
across one year:

- The range is the same at steps of 1/500, 1/2000 and 1/8000 of the Moon's
  period. That is the Sun's tide, not integration error.
- The real Moon's 0.0549 is a mean element. Entered as an osculating one,
  with this orientation to the Sun, it gives a different mean orbit.

## The checks

**Errors stop the build.** The engine could not integrate the system as
entered.

- **Initial overlap:** two bodies closer than their contact radii (plus the
  absorption buffer for a black hole).
- **A black hole among other bodies:** in Gravitas a black hole is pulled
  only by other black holes (`BlackHole.orbit_acceleration`). One in a system
  of stars would go straight on while they orbited it. Systems of black
  holes alone are allowed.
- **Invalid fields**, each explained on its own field, and an eccentricity of
  1 or more, named as unbound.

**Cautions build anyway.** Each names its source, and none is a stability
verdict.

| Caution | When | Source |
|---|---|---|
| Contact at periapsis | Periapsis within the two contact radii | |
| Hill sphere | A companion of a companion reaching more than half its primary's Hill radius, at the primary's periapsis, or beyond the whole of it | Hamilton & Burns 1991 |
| Crossing orbits | Neighbours whose orbits cross | |
| Circumbinary (P-type) | A light body inside the critical distance around an inner binary | Holman & Wiegert 1999 |
| Circumstellar (S-type) | A light body outside the widest stable orbit around one star of a pair | Holman & Wiegert 1999 |
| Triple | A stellar triple more compact than the coplanar stability limit | Mardling & Aarseth 2001 |
| Spacing | Two light companions closer than 2√3 mutual Hill radii | Gladman 1993 |
| Fast orbit | An orbit too short for the smallest step the integrator takes at 1× | |

The builder says the following beside every result: no check proves a system
stable, only running it shows what it does, and a long run says nothing about
a longer one.

The Holman–Wiegert polynomials are copied into `js/systemSpec.js`, not
imported from `js/binaryStability.js`. That module shares a chunk with the
binary-watch instrument, and a second importer would cost every lesson one
more request. `tests/systemSpec.test.js` holds the two copies equal across
the whole range of the fits.

## The settings a built system runs under

These are set for the physics, not for appearance:

- mutual gravity on and star-only gravity off, so planets pull;
- black holes free to move, with no orbital decay;
- no generated population;
- an integration step of at most a five-hundredth of the shortest period;
- a softening length of a tenth of the closest periapsis, capped at the usual
  5 units.

Every body is marked `persistent`, so the distance cull cannot delete the
outer bodies of a wide system.

## Behaving like any other world

- **Built through the scenario path.** A built system is installed as a
  scenario build is: the clock, the conservation baseline, the absorption
  ledger and the world generation all reset. Each body is made by its own
  class from its physical mass, so a star has the temperature and color that
  mass gives it.
- **Reproducible.** The world seed is derived from the system, so the same
  system, typed again or opened from its file, is the same world down to the
  starfield.
- **Selectable, editable and exportable.** These are ordinary bodies in the
  ordinary lists.
- **Rebuildable.** Refresh Scenario builds the system again. Any other world
  build forgets it.
- **Shareable.** A built world is hand-made, so Share offers a full link. The
  link rebuilds from the default settings, against which its settings delta
  was taken, and carries `persistent` and the gas-giant fields the codec used
  to drop.
- **Usable by the experiment bench.** Its initial-state hash is identical
  across a capture, a restore and a second capture.

### Saving a system

**Save as a file** writes `<name>.gravitas-system.json`:

```json
{
  "format": "gravitas.orbital-system",
  "version": 1,
  "bodies": [
    { "name": "Sun", "type": "Star", "mass": 1 },
    { "name": "Earth", "type": "Planet", "mass": 1, "primary": 0,
      "a": 1, "e": 0.0167, "omega": 102.9, "phase": 0, "retrograde": false }
  ],
  "initial": { "G": 2, "bodies": [ { "x": ..., "y": ..., "vx": ..., "vy": ..., "mass": ... } ] }
}
```

- **The elements are the system.** The recorded initial state sits beside
  them so a reader can see the numbers the world starts from.
- **Opening a file** rebuilds the system from its elements. If the recorded
  state differs from what this version computes, by more than a part in 10⁹,
  the builder says so.
- **Versioning.** A file from a newer format version, or of another kind, is
  refused rather than guessed at. This is the same rule the experiment
  records follow.

## Validation

`tests/systemSpec.test.js` (44 tests) covers:

- **The analytic orbit:** circular speed, periapsis and apoapsis at every
  eccentricity to 0.99, vis-viva, and retrograde as the mirror image.
- **Its own inverse**, over 200 random hierarchical systems.
- **The shipped binaries:**
  - the Binary Star System scenario's hand-built pair, which the builder
    reproduces exactly as 1.2 and 0.8 M☉, 1.2 AU, retrograde, at the
    scenario's G of 1.2;
  - `js/binaryOrbits.js`'s eccentric layout at three anomalies.
- **Periods** against a sidereal year at three values of G.
- **Every class's radius and mass** against the real constructors.
- **Every refusal and every caution.**
- **The file round trip.**
- **The real engine:** an eccentric orbit keeps its period and both turning
  points to 1% over three orbits, and a hierarchical system keeps its
  barycenter.

`e2e/systemBuilder.spec.js` runs against the sources and dist/. It covers
building Kepler-16, which shows its published 41.1-day and 229-day periods,
and Refresh Scenario. It also covers the field errors, the black-hole
refusal, the file round trip, a newer file refused, and a share link opened
in another tab. It runs in Spanish, with axe and Escape, and at 375 pixels.
On the sources only, it checks that the initial state is exactly the
module's, and that the bench hash is stable across a restore.

### Initial-condition residuals

Measured over 2000 random hierarchical systems of up to eight bodies:

- stars, gas giants and planets;
- e up to 0.99;
- retrograde orbits among them;
- every orbit read back from the finished state with `js/orbital.js`.

| Quantity | Worst |
|---|---|
| Semi-major axis, relative | 9.7 × 10⁻¹³ |
| Eccentricity, absolute | 6.1 × 10⁻¹³ |
| Periapsis direction | 1.8 × 10⁻⁹ degrees |
| Net momentum, as a fraction of Σ m\|v\| | 2.3 × 10⁻¹⁶ |
| Barycenter, as a fraction of Σ m\|r\| | 2.6 × 10⁻¹⁶ |

### What the templates do in the engine

Each template ran at the builder's own step for three periods of its outermost
orbit (Alpha Centauri for 1.3, at a 40 000-step cap). All bodies survived in
every case. Energy drift is the conservation readout's, in percent.

| Template | Energy drift | Outer orbit a / a₀, e after the run |
|---|---|---|
| Sun, Earth, Moon | 2.0 × 10⁻⁶ % | 1.000, 0.0167 (entered 0.0167) |
| Sun, Jupiter, Saturn | 2.8 × 10⁻² % | 1.000, 0.0539 (0.0539) |
| Kepler-16 | 1.3 × 10⁻¹ % | 0.995, 0.012 (0.0069) |
| Alpha Centauri | 4.5 × 10⁻³ % | 1.000, 0.518 (0.518) |
| Hierarchical triple | 1.0 × 10⁻¹ % | 1.000, 0.201 (0.20) |

Angular momentum held to a few parts in 10¹³ in all five.

## Known limits

- **Two dimensions only:** no inclination, no nodes, no Kozai–Lidov cycles.
- **No asteroids or comets.**
  - An asteroid is culled five canvas widths out, whether or not it is
    marked persistent.
  - A comet pulls on nothing, so it can be no one's primary.
- **Black holes only in systems of black holes.**
- **Contact radii are model radii**, inflated to be visible. A realistic moon
  needs a typed radius, as the Earth–Moon template shows.
- **Stability is not predicted.**
  - The criteria above are fits and heuristics for particular
    configurations: coplanar, near-circular, a massless planet.
  - A system that passes every check can still come apart, and one flagged
    can survive.
- **Symplectic Euler at a five-hundredth of the shortest period.**
  - It keeps orbits bounded, but moves eccentricity at the level the table
    shows.
  - Above about 64 substeps a frame, which an orbit shorter than about 0.65
    time units needs at 1×, the step is capped. The fast-orbit caution says
    so.
- **A link does not reopen the builder.** A link opens the built world, not
  the builder's form; use the file for that.

## Budget

**It is deferred.** The panel, its arithmetic and its strings are loaded the
first time the button is pressed. Its styles arrive with it.

**Measured from fresh builds against v2 at c626aa3. No ceiling was raised.**

- **Deferred JavaScript, 4179.6 of 4180 KB** (4178.8 before). The builder
  costs 48.5 KB, itemized by esbuild metafile:
  - `js/systemBuilder.js` 18.5 KB, including its stylesheet;
  - `js/systemSpec.js` 10.2 KB;
  - its strings, 8.7 KB of English and 9.7 KB of Spanish;
  - the button's two strings in the Spanish base catalog, 0.2 KB;
  - chunk overhead, 1.3 KB.

  It is paid for by vendoring only the three.js the 3-D view uses (−47.7 KB),
  so the total moved 0.8 KB. That leaves 0.4 KB: the next deferred feature
  has to find its own room first.
- **The initial download, 820.1 of 830 KB** (819.4 before, so +0.7 KB):
  - the button;
  - the coordinator's three-function kit;
  - the share-link fixes.

  The route budgets and the start-up composition are within their limits.
