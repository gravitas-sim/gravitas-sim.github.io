# The orbital layer

`js/orbital/layer.js` converts between orbital elements and state vectors, in
two dimensions and in three, with every quantity typed: its dimension, the unit
system it is in, the frame it is measured in and the clock it belongs to. It
refuses when two quantities do not mean the same thing. It is the one place
that says what a number is; it is not a second place that integrates, and it
does not replace the domain authorities (the mission core's transforms, the
sky kernel's, `js/units.js`).

It exists because elements, state vectors and anomalies were converted in the
3-D kernel, the mission core, the forward models, the Orbital System Builder
and the scenario geometry, each in its own units (simulation or physical), its
own epoch convention and its own sign and frame conventions, and nothing said
so. Prompt 148 builds the layer and moves the first consumers onto it where
that costs no route a request. This document is its contract; the decision is
D-R10-25 in `DECISION_REGISTER.md`.

## What it converts, and what it does not

| It converts | It does not |
| --- | --- |
| Elements to a state vector, and back (2-D ellipses of either sense; 3-D ellipses and hyperbolas) | A frame to another beyond the one rotation an orbit needs (perifocal to the primary's reference axes) |
| Mean, eccentric and true anomalies, through `solveKepler` (`js/orbital.js`, D-R10-18) for the ellipse | Simulation units to physical ones (that needs G and the engine's scales: `js/units.js`, `secondsPerTimeUnit`) |
| A mean anomaly forward in time by the mean motion | One time scale to another (TDB, TT, UTC: `js/mission/*`, `js/kernels/sky/`) |
| | A third body, a perturbation, or any relativistic term |

## Quantities

A quantity is `{ value, dim, units }`, frozen. `dim` is one of `length`,
`time`, `speed`, `gm` (G times a mass, length cubed over time squared), `rate`
(one over time), `angle` (radians, always) and `dimensionless`. A dimensional
quantity carries a unit system; an angle and a dimensionless number carry
`null`, and a unit system on either is refused. A vector (`vector`) is a
quantity whose value is an array of two or three components. `degrees(x)`
builds an angle from degrees: the edge of the layer is where degrees stop.

| Builder | Makes |
| --- | --- |
| `length`, `time`, `speed`, `gm`, `rate` (value, units) | the dimensional quantities |
| `angle`, `degrees`, `dimensionless` | angles in radians, and pure numbers |
| `vector(values, dim, units)` | a position or a velocity |
| `instant(value, units, scale)` | a time with its scale named (a duration has none) |
| `principalAngle(angle)` | the angle reduced to (-pi, pi] |

### Unit systems

| System | Names | Where it is used |
| --- | --- | --- |
| `simulationUnits(G, name)` | the engine's length and time; **G is part of the identity** (the time unit is a second only through G) | the 2-D engine and builder (G = 2), the 3-D kernel (`'code'`, G = 1) |
| `PHYSICAL_UNITS['AU-day']` | AU, day | the forward models |
| `PHYSICAL_UNITS['km-s']` | km, s | the mission core |

A quantity made at G = 2 and one made at G = 9000 (the Earth-Moon scenario)
are different unit systems and do not mix. A caller that does not know G passes
`null`: that is a system of its own, and mixes with no stated one. There is no
conversion between systems in the layer; a mismatch is a refusal (`units`).

### Frames

| Frame | Meaning |
| --- | --- |
| `primary-reference` | origin at the primary; axes those of the reference plane (the engine's x and y; the 3-D system's x, y and z). Elements are measured here: omega from the reference axis in 2-D, from the ascending node in 3-D, the inclination from +z |
| `perifocal` | origin at the primary; x toward periapsis, y a quarter turn along the motion, z along the angular momentum |

`perifocalState(elements, t)` is the state in the orbit's own frame;
`toReferenceFrame(state, elements)` is the one rotation the layer makes;
`elementsToState` is the two together. A state in a frame the elements are not
measured in is refused (`frame`): there are no reference axes to read elements
from in a perifocal state.

### Time scales

`simulation` (the 2-D engine's clock, zero at the start of a run), `code` (the
3-D kernel's), `elapsed` (days from a zero the system's author chose: the
forward models), and `TT`, `TDB`, `UTC` (named so that a later consumer cannot
pass one for another). An elements set holds at an epoch, an instant on one
scale; asking for the state at an instant on another scale is refused
(`timeScale`), as is a time in other units. A duration is not an instant.

## Elements, states, anomalies

`keplerElements({ dimension, a, e, omega, [i, Omega], anomaly, epoch, mu |
period, [sense] })` checks and freezes a set of elements:

- **2-D**: an ellipse (0 <= e < 1, a > 0), `omega` from the reference axis,
  `sense` 1 (counter-clockwise) or -1 (the mirror image across the periapsis
  line, the Orbital System Builder's retrograde). Either `mu` or a `period`
  gives the mean motion: sqrt(mu / a^3) or 2 pi / period (the forward models
  state a period). Given both, they must agree to 1e-9 (`domain`,
  "mu and the period disagree"); the cache of simulation unit systems is
  bounded at 64 entries (a rebuilt system has the same `id`, which is what
  compatibility compares).
- **3-D**: the conventions of the 3-D kernel (`js/lab3d/elements.js`): a
  negative for a hyperbola, e = 1 refused (a parabola has no a), Omega 0 and
  the node undefined for a flat orbit, omega 0 and the phase measured from the
  node for a circular one, `mu` required.
- **The anomaly** is one of `mean`, `true` or `eccentric` (the hyperbolic
  anomaly H when e > 1), a kind named and an angle.

`elementsToState(elements, t?)` gives the state at the epoch, or at an instant
on the epoch's scale: the mean anomaly advanced by the mean motion, Kepler's
equation by `solveKepler`, the perifocal state turned into the reference axes.
`stateToElements(state, mu)` reads elements back (2-D: ellipses only,
`unbound` otherwise, with a `period`; 3-D: ellipses and hyperbolas, with the
true anomaly beside the mean). `convertAnomaly(anomaly, to, e)` converts one
anomaly. `meanMotion`, `meanAnomalyAt`, `makeState` complete the set.

One bound check serves every 2-D bound orbit and the forward models: e must
satisfy `!(e >= 0 && e < 1)` to be refused, so NaN, a negative e, a parabola and
a hyperbola all raise the same `domain` error, and so does a period, an axis
or a mu that fails `> 0`. Every bound orbit, up to e = 1 - 2^-53, converts with
the earlier numbers; only `convertAnomaly` on a true anomaly refuses e = 1
itself (and e < 0, NaN). A NaN time is not an orbit's fault and still returns
NaN, as the forward models always did.

`solveKepler`'s contract carries over, and so does its limit: M any real, e in
[0, 1), E on M's own turn, accuracy limited by the equation's conditioning,
1 / (1 - e). A true anomaly is always the principal one. A hyperbola's true
anomaly beyond the asymptote is refused (`domain`).

### Refusals

An `OrbitalLayerError` has a `code`:

| Code | When |
| --- | --- |
| `quantity` | something that is not a typed quantity (a bare number for an angle) |
| `dimension` | a mu where a length is needed; a 2-D state with 3-D elements |
| `units` | a different unit system, or G, or a time in other units than the orbit; an angle given units |
| `frame` | a frame not in the enumeration; elements read from a perifocal state; rotating twice |
| `timeScale` | an unknown scale; an instant on another scale than the epoch; a duration for an instant |
| `domain` | an orbit the layer does not describe: a planar e outside [0, 1), a non-positive a or mu; a non-finite value; a true anomaly past the asymptote |
| `elements` | the 3-D kernel's own list, in its own words (`elements: parabolic`, `ellipseAxis`, `hyperbolaAxis`, `inclination`, `notFinite`, `mu`, `eccentricity`) |
| `unbound`, `degenerate` | a 2-D state that is not an ellipse; a state with no angular momentum |

## Two perifocal forms, and why

The planar branch is `keplerState` of `js/systemSpec.js` and the forward
models' `relativeState`, operation for operation: `v = -a n sin E / (1 - e cos E)`.
The spatial branch is `js/lab3d/elements.js`: `v = -a sin E (n / (1 - e cos E))`.
They write the same state with a different rounding. Each is pinned to the bit
where something depends on it: the builder's saved systems carry a hash of the
initial state, the forward models' goldens and observatory saves replay, the
3-D kernel's corpus is pinned bit for bit (a state rebuilt from elements in
two engines is already two states, `VALIDATED_3D_LAB_GATE.md`). Joining them
would change a bit in one of the two places and is a decision of its own; they
agree to rounding, which the validation group measures (E1, A4).

## Limits

- Newtonian two-body orbits only: **no perturbations, no relativistic terms**,
  no third body. An osculating element set is the orbit at one instant.
- 2-D: ellipses only (the engine's orbits are planar and bound). A hyperbola
  is a 3-D object here, as in the kernel.
- A parabola is refused in 3-D and has no a, and the 3-D kernel's own
  `elements: parabolic` refusal (|e - 1| < 1e-9) is kept for 3-D element
  sets. The planar, forward path has no such band: a bound orbit with e as
  close to 1 as a double allows is described with the earlier numbers (O6),
  because refusing it would turn a 3-D file the bridge reads into a throw.
- The mean anomaly is advanced with a constant mean motion: no drag, no mass
  change, no J2.
- The layer does no unit conversion between systems and no time-scale
  conversion. A caller that has to cross one asks its authority first.

## Consumers

Adopted means imports the layer and its outputs are identical to the baseline
on its fixtures (the proofs are the validation group's O cases). Waiting means
not yet, with the reason and the cost measured on this tree: the published
site is unbundled, so a new module is a request on every route that loads a
consumer and did not load it before, and the request ceilings
(`tools/route-budgets.json`) are not raised by this prompt. The measure is
`node tools/route-budget.mjs --config=sources --report`, with the adoption in
place, against the table before; the screen is `costs()` of
`tools/key-registry-free.mjs` with `js/orbital/layer.js` as its target.

<!-- orbital-consumers:begin -->

| Consumer | State | Reason and cost |
| --- | --- | --- |
| `js/forward/system.js` (the forward models' system: `relativeState`, `conjunctionTime`, `elementsFromBodies`) | **adopted** | Identical to its earlier arithmetic on 20,000 seeded planets, epochs and states (O5) and on every bound e up to 1 - 2^-53, inside 1e-9 of 1 included, and on states of almost no binding energy (O6). `relativeState` and `conjunctionTime` share one bound check and refuse e >= 1, e < 0 and NaN with the same `OrbitalLayerError` (N2); the transit model keeps its own "needs a circular orbit" words for e >= 1. The 3-D lab's evidence panel (`js/lab3d/view/evidencePanel.js`) shows its existing translated "could not be read" text for a layer error, not the error's English message. Cost in requests: none. The screen says five pages load it; the forward models are lazy on all of them, and every source route measured the same requests as before (observatory 17, composer 31, course packs 44, instructors 15) and no build route moved. The layer is 23 KB of source, 7.1 KB gzipped, and sits in the lazy forward-model chunk (deferred bundle 1998.2 KB of 2044.4 KB); it is also in the service worker's first-visit install like every module, which stands at 5,175,182 of its 5,175,296-byte ceiling (`tools/data-budget.json`) on a Mac, where Node 24 reads a few KB larger than CI's Node 22 |
| `js/lab3d/elements.js` (the 3-D kernel's element readout) | waiting | An instructor-bundle source: editing it makes `instructors:check` stale, and a rebuild needs the passphrase a session does not have. The layer reproduces its outputs bit for bit on the kernel's reference corpus and on 20,000 seeded orbits (O1, O2, O3), so the adoption is a swap that waits for an instructor rebuild. Cost when adopted, by the screen: it has no imports today, so `/3d/`, `/lab3d/` and the observatory gain the layer and `js/orbital.js` (two requests), and `/studio/` the layer (one); they are at their request ceilings. The roadmap's prompts that own `js/lab3d/*` (271 to 273) should make the swap the other way round, `elements.js` re-exporting the layer, in the same rebuild |
| `js/systemSpec.js` (the Orbital System Builder: `keplerState`) | waiting | The layer's planar branch is `keplerState` to the last bit (O4: 20,000 seeded orbits and every orbit of four builder systems, prograde and retrograde). Cost measured: `/studio/` 48 to 49 requests (ceiling 48) and 929.4 to 959.0 KB (ceiling 975.6); no other route loads it before first use. A request is not covered by the standing size approval, so it is not adopted until `/studio/` has a request to give or the layer is folded into a module the route already loads |
| `js/binaryOrbits.js` (the binary laboratory's layout in the scenario geometry, `js/world/build.js`) | waiting | `js/world/build.js` has no element conversions of its own (the circular orbits are `sqrt(mu / r)`); the one eccentric orbit it builds is `js/binaryOrbits.js`'s `relativeState`, a true-anomaly form with a different arithmetic, whose bits the world golden (`tests/scenarioGeometry.test.js`) compares. Cost measured with the layer imported: +1 request on nine routes (front door and sandbox 107 to 108, the three lessons 146 to 147, largest lesson 148 to 149, figure 126 to 127, experiments 57 to 58) |
| `js/forward/system3d.js` (a 3-D system read as a forward-model state) | available | Already loads the layer through the forward models, so the swap costs no request; not adopted because the contract does not name it; the forward path it reaches no longer refuses a bound orbit within 1e-9 of e = 1, so a near-parabolic bound 3-D file is observed with the earlier numbers (`tests/forwardSystem3d.test.js`) |
| `js/mission/references.js`, `js/mission/verify.js`, `js/mission/labReferences.js` | waiting | Import `fromElements` and `toElements` from `js/lab3d/elements.js`; they follow it. The mission core's own transforms (Lambert, universal variables, the ephemeris) stay the authority and import the element conversions only |
| `js/lab3d/state.js`, `js/lab3d/references.js`, `js/lab3d/experiment.js`, `js/lab3d/workerCore.js`, `js/lab3d/guides/curriculum.js`, `js/lab3d/view/instruments.js` | waiting | Callers of the kernel's element functions; they follow `js/lab3d/elements.js` |
| `js/inference/rv.js`, `js/habitability.js`, `js/binaryWidgets.js`, `js/captureMeasure.js` | waiting | Solve Kepler's equation through `solveKepler` (D-R10-18) and have no element conversion to move; `convertAnomaly` is the call when one of them needs a typed anomaly |
| `js/resonance/systems.js`, `js/kernels/sky/planets.js` | kept apart | Their own Kepler steps stay, with the reasons D-R10-18 recorded (a world golden; the Sky Lab's weight gate) |
| Prompts 197, 204, 227, 271 to 273 | later | The contract's own list; the roadmap also gates 187, 203 and 237 on this layer |

<!-- orbital-consumers:end -->

## Validation

`npm run validate:orbital` runs the validation group (`tools/orbital-cases.mjs`)
and prints the table below; `--write` rewrites it here;
`tests/orbitalLayerValidation.test.js` runs the same cases in the suite. The
cases are the five kinds the validation contract of the roadmap asks of a
kernel:

- **analytic** (A1 to A4): a circular orbit, the apsides, vis-viva and the
  angular momentum, Kepler's equation and the anomaly conversions, a closed
  orbit and the clock. No solver in the closed forms.
- **oracle** (O1 to O5): the 3-D kernel's conversions, bit for bit, on its
  reference corpus (R1, R2, R3, R6 and R7's element sets, and the bodies
  `references.js` builds from them) and on 20,000 seeded ellipses and
  hyperbolas; the mission core's universal-variable propagator on its Kepler
  fixture (K1) to 1e-9; the Orbital System Builder's live `keplerState` bit
  for bit; the forward models against their earlier arithmetic, kept in the
  cases file from v3 at `a97582ee`, bit for bit.
- **ensemble** (E1): 4,000 seeded orbits through a state vector and back,
  against a bound stated before the run (1e-11 a / (1 - e) on an ellipse,
  1e-10 a on a hyperbola); none may fall outside it.
- **negative** (N1): 32 ways to be wrong in exactly one respect, each refused
  with its code, and the element sets the kernel refuses refused in the kernel's
  words.
- **authentic** (T1): Curtis, *Orbital Mechanics for Engineering Students*,
  example 4.3, a state vector to its elements, to the digits the book prints.

Where the group lives: not in the physics suite (`js/validation/groups/`). A
new check there changes the check count printed in `js/i18n/en.js` and
`es.js`, which are sources of the instructor bundle; editing them makes
`instructors:check` stale. The group runs as the kernel and mission validators
do, a tool and a test, and moves into the suite with one registration line in
`js/validation/physicsChecks.js` at the next instructor rebuild.

The seeds are fixed. A value is a rounding error and can end in other digits
on another engine; the bound is what the table promises, and the test holds
the rows.

<!-- orbital-validation:begin -->

| Case | Kind | Measure | Value | Bound | |
| --- | --- | --- | --- | --- | --- |
| **A1** A circular orbit, planar and spatial | analytic | worst component error / scale | 2e-16 | 0 ± 1e-13 | pass |
| **A2** Apsides, vis-viva and the angular momentum | analytic | apsis distance / closed form - 1 | 3e-16 | 0 ± 1e-12 | pass |
|  |  | v^2 / vis-viva - 1 | 4e-15 | 0 ± 1e-12 | pass |
|  |  | angular momentum / sqrt(mu a (1 - e^2)) - 1 | 1e-15 | 0 ± 1e-12 | pass |
| **A3** Kepler's equation and the anomaly conversions | analytic | residual of E - e sin E = M | 9e-16 | 0 ± 1e-14 | pass |
|  |  | mean to true to mean, error x (1 - e) | 1e-15 | 0 ± 1e-13 | pass |
|  |  | hyperbola: residual of e sinh H - H = M | 4e-15 | 0 ± 1e-12 | pass |
| **A4** A closed orbit, and the clock | analytic | position error after one period, / a | 5e-15 | 0 ± 1e-12 | pass |
|  |  | mean motion x P / 2 pi - 1 | 2e-16 | 0 ± 1e-15 | pass |
| **O1** The 3-D kernel's corpus, bit for bit | oracle | corpus: elements to state, differing bits | 0 | = 0 | pass |
|  |  | corpus: state to elements, differing bits | 0 | = 0 | pass |
|  |  | 20,000 orbits: elements to state, differing bits | 0 | = 0 | pass |
|  |  | 20,000 orbits: state to elements, differing bits | 0 | = 0 | pass |
| **O2** The corpus's own initial bodies through the layer | oracle | differing bits over eight bodies | 0 | = 0 | pass |
| **O3** The mission core's Kepler fixture, against its propagator | oracle | ellipse: layer vs propagator, relative distance | 1e-14 | 0 ± 1e-9 | pass |
|  |  | hyperbola: layer vs propagator, relative distance | 5e-16 | 0 ± 1e-9 | pass |
|  |  | initial states vs the kernel, differing bits | 0 | = 0 | pass |
| **O4** The Orbital System Builder's keplerState, bit for bit | oracle | 20,000 orbits, differing bits | 0 | = 0 | pass |
|  |  | 8 orbits of four builder systems, differing bits | 0 | = 0 | pass |
| **O5** The forward models on the layer, against their earlier arithmetic | oracle | relativeState, differing bits | 0 | = 0 | pass |
|  |  | conjunctionTime, differing bits | 0 | = 0 | pass |
|  |  | elementsFromBodies, differing bits (null included) | 0 | = 0 | pass |
| **O6** The bound edge: e up to 1, a state of almost no binding energy | oracle | relativeState, differing bits | 0 | = 0 | pass |
|  |  | conjunctionTime, differing bits | 0 | = 0 | pass |
|  |  | elementsFromBodies, differing bits | 0 | = 0 | pass |
|  |  | near-parabolic states read back finite, of 6 | 6 | = 6 | pass |
|  |  | energy 0 and +1e-12 read back null, of 2 | 2 | = 2 | pass |
| **E1** A state through elements and back, on seeded ensembles | ensemble | orbits outside the stated bound, of 4,000 | 0 | = 0 | pass |
|  |  | planar: worst error x (1 - e) / a | 2e-15 | 0 ± 1e-11 | pass |
|  |  | spatial: worst error x (1 - e) / a (hyperbolas: / a) | 7e-14 | 0 ± 1e-11 | pass |
| **N1** What the layer must refuse | negative | refusals missed, of 32 | 0 | = 0 | pass |
|  |  | refusals with the wrong code | 0 | = 0 | pass |
|  |  | element sets refused in other words than the 3-D kernel's, of 7 | 0 | = 0 | pass |
| **N2** The bound check is one check | negative | e outside [0, 1) or NaN, refused with code domain, missed of 6 | 0 | = 0 | pass |
|  |  | the two functions answering differently, of 6 | 0 | = 0 | pass |
|  |  | a NaN or negative period or semi-major axis, missed of 4 | 0 | = 0 | pass |
|  |  | NaN time: bits differing from v3 | 0 | = 0 | pass |
| **T1** A textbook state vector to its elements | authentic | e | 0.1712 | 0.1712 ± 5e-5 | pass |
|  |  | i | 153.2 | 153.2 ± 0.05 deg | pass |
|  |  | Omega | 255.3 | 255.3 ± 0.05 deg | pass |
|  |  | omega | 20.07 | 20.07 ± 5e-3 deg | pass |
|  |  | true anomaly | 28.45 | 28.45 ± 5e-3 deg | pass |
|  |  | h | 58310 | 58310 ± 5 km^2/s | pass |

<!-- orbital-validation:end -->

## Routes

Measured with `node tools/route-budget.mjs`, both configurations, on the tree
that adds this layer and moves `js/forward/system.js` onto it: **no route
changed** in requests or kilobytes in the build, and none changed in the
sources; the layer is reached only by the forward models, which are lazy
everywhere they appear. The initial download (798.1 of 830.0 KB) and the
deferred bundle (1998.2 of 2044.4 KB) stay inside their budgets (`npm run
budget:check`). The one margin it used up is the service worker's first-visit
install (`tools/data-budget.json`, 114 bytes left on a Mac): a further module
in the install's core needs room made elsewhere, or a ceiling decision.

## References

- `js/lab3d/elements.js` and `VALIDATED_3D_LAB_GATE.md`: the 3-D conventions and
  the corpus the layer is held to.
- `js/orbital.js` `solveKepler`, `tests/keplerSolver.test.js`, D-R10-18.
- `js/systemSpec.js` `keplerState`, `ORBITAL_SYSTEM_BUILDER.md`: the planar
  construction.
- `js/forward/system.js`, `FORWARD_MODELS.md`: the forward models' orbits.
- H. D. Curtis, *Orbital Mechanics for Engineering Students*, example 4.3.
