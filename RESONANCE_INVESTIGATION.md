# When Orbits Lock: the resonance investigation

The lesson, the four scenarios it uses, the instrument that measures them, and
the reason each number is the number it is.

Everything here is checked. The physical parameters live in one module that the
scenarios, the validation suite and the unit tests all read; the measurements
below are the output of `npm run validate:physics`, group **Orbital resonance**,
which is thirty-six checks against published values and refinement tests.

## Why the lesson exists

The usual definition of orbital resonance is circular. It says two bodies are in
resonance because their periods are in a small whole-number ratio, and then
explains the ratio by the resonance. A student who accepts that has been handed
a rule they cannot test, and it gives wrong answers immediately — inside the
first system the lesson looks at:

| pair | period ratio | nearest small ratio | off by | vs chance | resonant? |
| --- | --- | --- | --- | --- | --- |
| Europa / Io | 2.00747 | 2:1 | 0.372% | 2.2× closer | **yes** |
| Ganymede / Europa | 2.01444 | 2:1 | 0.717% | 1.1× closer | **yes** |
| Ganymede / Io | 4.04393 | 4:1 | 1.086% | 0.4× closer | **yes** |
| Callisto / Ganymede | 2.33266 | 7:3 | 0.029% | 24.4× closer | **no** |
| Pluto / Neptune (real) | 1.50458 | 3:2 | 0.304% | 3.6× closer | **yes** |
| Wide probe / Jupiter | 1.40355 | 7:5 | 0.253% | 4.6× closer | **no** |

Sort that table by how good the ratio is and you get Callisto, the probe, Pluto,
the moons. Sort it by whether the pair is resonant and you get a different order.

The reason is that fractions with small denominators are dense: there are about
`3Q²/π²` of them per unit interval with denominator at most `Q`, so the mean gap
is `π²/3Q²` and an arbitrary ratio sits within about 1.6% of one for `Q = 10`.
`ratioSurprise()` in `js/resonance/elements.js` returns exactly that comparison,
and it is the number the instrument puts on screen beside every ratio.

What does settle it is a **resonant angle**.

## The angles

A resonant argument is an integer combination of mean longitudes `λ` and
longitudes of periapsis `ϖ` whose coefficients sum to zero. The sum-to-zero rule
is not a convention: a combination that violates it changes value when the
coordinate frame is rotated, so it measures the frame rather than the orbits.
`resonantArgument()` enforces it and returns `null` rather than a
frame-dependent number.

The three the lesson uses:

**The Laplace argument** of the inner Galilean moons, from Laplace (1805):

```
φ_L = λ_Io − 3 λ_Europa + 2 λ_Ganymede
```

Coefficients 1 − 3 + 2 = 0, so no `ϖ` appears at all. That matters here beyond
tidiness: the two-body arguments of the same system each involve a longitude of
periapsis, and their libration depends on precession rates that Jupiter's
oblateness dominates. Gravitas has no J2 term, so those arguments would not
librate in this model. The Laplace argument does, because it is built only from
mean longitudes.

It librates about 180°, which is the statement that Io, Europa and Ganymede are
never all three in conjunction: substitute `λ_Io = λ_Europa` and the argument
collapses to `2(λ_Ganymede − λ_Europa) = 180°`, so at every Io–Europa
conjunction Ganymede is a quarter turn away.

**Pluto's 3:2 argument**, from Cohen & Hubbard (1965):

```
φ = 3 λ_Pluto − 2 λ_Neptune − ϖ_Pluto
```

Coefficients 3 − 2 − 1 = 0. It librates about 180°, and one line of algebra
turns that into the protection mechanism. At a conjunction the two mean
longitudes are equal, so `φ = λ_conjunction − ϖ_Pluto`, and `φ = 180°` says
every Pluto–Neptune conjunction happens half a revolution from Pluto's
perihelion — at its aphelion, 49.3 AU out, nineteen AU beyond anywhere Neptune
reaches.

**The co-orbital angle**, for a 1:1:

```
φ = λ_trojan − λ_Jupiter
```

A 1:1 has `p − q = 0`, so the periapsis term vanishes and what is left is the
difference of the two mean longitudes. The instrument measures it from positions
rather than mean longitudes, because a Trojan's eccentricity is small enough
that its periapsis direction is noise.

## The three states, and why there are three

A resonant angle either **librates** — swings about a fixed value and never
completes a circuit — or **circulates**. Libration is the lock.

But a record can fail to distinguish them, and `classifyAngle()` says so rather
than guessing. Over a short interval a slowly circulating angle and a
long-period libration are the same picture: bounded, drifting a little, no
reversal. Nothing in the data separates them, and a classifier that picked one
anyway would be producing a number rather than a measurement.

So the verdicts, in descending order of what the evidence supports:

| evidence | verdict |
| --- | --- |
| a completed circuit | **circulation**, with its period |
| three or more reversals, at consistent levels | **libration**, with centre, amplitude and period |
| two reversals, and the angle ended near where it began | **libration**, period provisional |
| no motion at all | **libration**, reason `stationary`: a Lagrange point |
| two reversals, but each swing ends further on than the last | **inconclusive**, reason `drifting-centre` |
| one reversal | **inconclusive**, reason `one-reversal` |
| no reversal, tightly confined | **inconclusive**, reason `confined`, with the circulation period it rules out |
| anything else | **inconclusive**, reason `ambiguous-drift` |

Three refusals in that table exist because a specific thing went wrong in an
earlier version, and each is worth naming.

**Confinement is not libration.** An earlier version reported a tightly bounded
angle as a libration on the strength of the bound alone. That is wrong, and
Callisto is why rather than a technicality: over 150 Io orbits its 7:3 argument
bounds any circulation at a few hundred conjunction cycles, and the Laplace
argument over the same run bounds its own at over a thousand. Both look locked.
One is, and the only thing that says so is watching until it turns back.

**Short-period ripple is not libration.** Every resonant argument carries a
ripple at the conjunction frequency, and every ripple cycle has two extrema. A
turning-point search on the raw series counted them and reported, for Callisto,
a tidy libration of amplitude 7° whose period was exactly the Ganymede–Callisto
synodic period. `smoothOverTime()` averages over one conjunction cycle before
the search — the same averaging the analytic treatment does when it drops the
short-period terms from the disturbing function.

**A moving centre is not libration.** After the averaging, Callisto still shows
two clean reversals over 300 Io orbits and would be reported as a 26° libration.
It is not librating; it is circulating once every three thousand Io orbits with
a 26° wobble along the way. The tell is that it drifted 35° while doing it, so
each swing ends further on than the last. With three or more reversals the test
is direct — a libration returns to the same extremes — and with two it falls
back to comparing the net drift with the amplitude.

Every threshold is a named constant in `ANGLE_CRITERIA` with the reason written
beside it.

## The scenarios

Four, three of them at true scale.

### Galilean Resonance, and Broken Laplace Resonance

Io, Europa, Ganymede and Callisto about Jupiter, with elements from JPL Solar
System Dynamics.

**A scale model, and the only one.** At true scale Io orbits 0.28 length units
from Jupiter — smaller than the default softening floor, a twentieth of the
radius Jupiter would be drawn at, and about a thousandth of the smallest scene
the renderer is built for. So every distance is multiplied by 100, which under
Newtonian gravity with the masses unchanged is exactly equivalent to multiplying
every duration by 100^1.5 = 1000. Nothing dimensionless changes. The instrument
converts back; the application's own distance and time readouts do not, and the
scenario summary says so.

**Semi-major axes are derived from the published periods**, not from the
published distances. The two disagree at the 0.1% level in a point-mass model,
because Jupiter's oblateness contributes to the real mean motions and Gravitas
has no J2 term. The resonance is a statement about mean motions — `n_Io −
3 n_Europa + 2 n_Ganymede = 0` holds in reality to about one part in ten
million — so those are the quantities preserved. Deriving the axes from the
published kilometres instead leaves a residual fifty times the real one, which
is a third of the libration frequency and would put the model near the edge of
the resonance rather than in it.

**Measured** (1,400 Io orbits, Velocity Verlet, substep 1.0):

| quantity | model | published |
| --- | --- | --- |
| Laplace libration centre | 179.48° | 180° |
| Laplace libration period | 2,165 days | 2,071 days |
| Laplace libration amplitude | 26.4° | 0.064° |
| energy drift | 1.6 × 10⁻⁸ | — |
| angular momentum drift | 3.4 × 10⁻¹⁴ | — |

The amplitude is the one that does not match, and it is a property of where the
model was started rather than of the resonance: the real moons sit far closer to
the exact centre than Keplerian starting conditions put them. A 26° libration is
also what makes the phenomenon visible in a lesson. The period — the physically
meaningful quantity — comes out within 5%.

**Broken Laplace Resonance** is the same system with Europa's semi-major axis
multiplied by 1.01. The Laplace argument then circulates, once every 47 Io
orbits. The resonance's half-width in Europa's axis is between one and two parts
in a thousand, measured: at ×1.001 the argument is still ambiguous after 300 Io
orbits, at ×1.002 it completes a circuit every 234, and at ×1.01 every 46.

### Pluto and Neptune

True scale. Neptune at 3,007 length units is 30.07 AU, and every distance and
period the interface reports is real.

Two departures, both stated in the lesson. **Planar**: Pluto's 17.16°
inclination is projected away, which brings the closest Pluto–Neptune approach
down from the observed 17.2 AU to 16.6 and removes the Kozai libration of the
argument of perihelion, a separate and much slower phenomenon. **Pluto's axis**
is set to the exact resonant value `a_N (3/2)^(2/3)` = 39.403 AU rather than the
observed 39.482; the 0.2% difference is taken up in the real system by the
precession of Pluto's perihelion, which enters the argument and which this model
does not reproduce at the right rate.

The starting argument is 100°, which is 80° short of the libration centre. With
the axis at the exact commensurability that is a turning point, so the libration
amplitude comes out at the observed 80°.

**Measured** (three libration cycles, substep 60):

| quantity | model | published |
| --- | --- | --- |
| period ratio | 1.50030 | 1.5046 (observed), 1.5 (resonant) |
| libration centre | 179.97° | 180° |
| libration amplitude | 80.19° | ~82° |
| libration period | 19,560 years | ~19,670 years |
| Pluto's true anomaly at conjunction | 175.7° ± 38° | 180° = aphelion |
| minimum Pluto–Neptune separation | 16.55 AU | 17.2 AU |
| energy drift | 1.6 × 10⁻⁹ | — |

A third body, the **Unbound Wanderer**, runs the same orbit 4% wider — same
eccentricity, same perihelion direction, outside the resonance. Its argument
circulates, it passes within 5.4 AU of Neptune, and its orbit is already
changing by the end of the run. Without it, "Pluto stays 17 AU away" could be a
fact about crossing orbits rather than about the resonance.

### Jupiter Trojans

True scale, in the circular restricted three-body frame: the Sun and Jupiter
both turn about a barycentre at the origin, because the triangular points are
exact equilibria only in that setting. Jupiter's orbit is circularised — its
real eccentricity is 0.0489 — which is the same idealisation every textbook
treatment makes and which the lesson states.

Four test bodies of 10⁻⁹ mass units:

| body | placement | behaviour |
| --- | --- | --- |
| L4 probe | exactly at L4 | equilibrium: span 1.3 × 10⁻⁶ degrees over 40 Jupiter years |
| Patroclus | L5 − 28° | tadpole libration, centre 295.7°, amplitude 23.7°, period 12.8 Jupiter years |
| L3 probe | L3 − 1° | departs: more than 150° within 30 Jupiter years, then a horseshoe |
| Wide orbit probe | 1.25 × a_Jupiter, circular | circulates, period 3.5 Jupiter years |

The tadpole period against the linearised prediction
`P / √(27μ/4)` = 12.47 Jupiter years is a 2.7% agreement, and the finite 24°
amplitude accounts for the sign of the discrepancy: a wide libration is slower
than the linear one. The L4 probe confirms the linear limit separately.

Gascheau (1843) proved the triangular points stable when the primary exceeds
24.96 times the secondary. The Sun is 1,047 times Jupiter. L3 is an equilibrium
too and is unstable, with a linearised growth time of about 3.2 Jupiter years —
which is why there are ten thousand asteroids at L4 and L5 and none at L3.

**One body per Lagrange point, and that is a constraint rather than a choice.**
A tadpole orbit is a very flat loop: the longitude swings by tens of degrees
while the semi-major axis moves by one or two percent, so the loop passes within
about five length units of the point it encircles. A second body sitting exactly
there would be inside the contact test in `handle_rocky_collisions`, which
separates the pair, exchanges momentum, and above 15 units per second of
relative speed makes debris with `Math.random()` — destroying both the orbit and
the reproducibility.

## Drawn radii, and why they are what they are

Gravitas draws bodies schematically everywhere; Earth in the Retrograde Mars
scenario is ten thousand times life size. That is fine until an enlarged radius
reaches the contact test, and these three scenarios were sized against it:

| scenario | closest approach | largest pair of radii | margin |
| --- | --- | --- | --- |
| Galilean | 16.1 units (Io aphelion to Europa perihelion) | 4.5 | 3.6× |
| Pluto | 1,656 units (Pluto to Neptune) | 100 | 16× |
| Trojans | 19.8 units (Patroclus to the L3 horseshoe) | 8 | 2.5× |

The Trojan figure is the binding one and it is a measured floor, not a tuned
number: the L3 probe's horseshoe carries it past both triangular points at
nearly the same distance from the Sun, and rearranging the starting angles does
not open the gap. It is why the probes are drawn at four units and not larger.
`tests/resonance.test.js` checks the margins and the validation suite counts
contacts, which must be zero.

## Why Velocity Verlet

All four scenarios set `integrator: 'Velocity Verlet'` and a capped
`max_timestep`, which no other scenario does. A resonant angle is a secular
quantity accumulated over hundreds of orbits, and first-order phase error
accumulates straight into it. Measured over 1,400 Io orbits:

| integrator | substep | reported amplitude | reported period |
| --- | --- | --- | --- |
| Symplectic Euler | 4 | 53.7° | 458 Io orbits |
| Symplectic Euler | 2 | 9.2° | 273 Io orbits |
| Symplectic Euler | 1 | 27.2° | 1,360 Io orbits |
| Symplectic Euler | 0.25 | 27.9° | 1,265 Io orbits |
| Velocity Verlet | 2 | 23.3° | 1,249 Io orbits |
| Velocity Verlet | 0.5 | 27.3° | 1,225 Io orbits |
| RK4 | 2 | 27.6° | 1,209 Io orbits |

The first two rows are artefacts, and they are convincing ones — a clean
libration with a plausible period, and wrong. The scenario runs Velocity Verlet
at a substep of 1.0, and the validation suite checks that halving and doubling
it changes neither the verdict nor the period by more than the published
comparison allows.

These are the only four scenarios in the catalogue that choose their own
integrator, and the rule they are an exception to is worth keeping: everything
else was laid out and timed against symplectic Euler's error, and a scenario
that quietly switched scheme would change what every other check measures. So
they are named in an allowlist in `e2e/instruments.spec.js` rather than
inferred, and a second test confirms that loading one and then loading
something else puts the default back.

## Running the checks

```bash
npm run validate:physics        # 36 checks in the "Orbital resonance" group
npm test -- resonance           # 115 unit tests over the analysis and the widgets
npm run validate:scenarios      # conservation over 20 s of each scenario
GRAVITAS_E2E_PORT=4199 npx playwright test e2e/resonance.spec.js
```

## Sources

- Laplace, *Mécanique Céleste* (1805), on the Galilean resonance.
- Lagrange (1772), on the triangular equilibrium points.
- Gascheau (1843); Routh (1875), on their stability criterion.
- Cohen & Hubbard (1965), *AJ* **70**, 10 — the discovery of the Pluto–Neptune
  resonance.
- Williams & Benson (1971), *AJ* **76**, 167 — the libration amplitude and
  period.
- Lieske (1998), *A&AS* **129**, 205; Musotto et al. (2002), *Icarus* **159**,
  500 — the Laplace libration.
- Malhotra & Williams (1997), in *Pluto and Charon*.
- Murray & Dermott, *Solar System Dynamics* (1999), chapters 3, 8 and 9.
- JPL Solar System Dynamics, planetary satellite mean elements and physical
  parameters; NASA planetary fact sheets.
