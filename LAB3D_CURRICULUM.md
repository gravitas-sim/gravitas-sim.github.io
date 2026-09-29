# Orbits in three dimensions: the 3-D lab's curriculum

Four guided investigations in the 3-D lab (`/3d/`, LAB3D.md) of what a flat
model cannot hold:
- an orbit's plane;
- how an orbit looks from outside;
- two orbits' planes;
- a distant third body.

Each one:
- asks for a prediction;
- has the reader change something (a system, a look, a frame, a body size);
- measures with the lab's instruments;
- ends with what a 2-D model keeps and loses, and where the model stops.

Every answer is checked against the lab's own numbers, the ones the tables
under the view show. Nothing is taken from the lesson's words, and nothing is
adopted from the literature.

Open one with `/3d/?guide=<id>`, with `&path=advanced` for the advanced
path, or with "Guided investigations" on the lab's page.

## The concept and prerequisite map

| # | Investigation (`id`) | Question | Needs | System | Intro | Advanced |
|---|---|---|---|---|---|---|
| 1 | An orbit's plane (`l3-planes`) | What does a tilted orbit look like from above and from its edge, and which numbers place its plane? | Ellipses, angles | R1: an inclined Kepler orbit, e = 0.6, i = 40°, Ω = 30°, ω = 60° | 12 steps, ~20 min | 15 steps, ~30 min |
| 2 | Seen from outside (`l3-eclipse`) | Does this orbit eclipse its star, seen from here? | 1 (inclination, line of nodes) | A star of radius 0.005 and a planet of radius 0.0005 at a = 1, tilted 0°, 0.2° and 0.5° | 13 steps, ~25 min | 14 steps, ~35 min |
| 3 | Two orbits' planes (`l3-mutual`) | Are two orbits with equal inclinations in the same plane? When is a flat model good enough? | 1 (inclination and node) | Two light planets both at i = 10°, nodes 90° apart; R3: a star, a Jupiter and a Saturn | 13 steps, ~20 min | 15 steps, ~30 min |
| 4 | A distant third body (`l3-kozai`) | What does a distant, heavy companion do to an inclined orbit over thousands of orbits? | 1 and 3 (mutual inclination) | R6: a test particle at i = 65°, a perturber of the same mass as the star at 20 times the distance | 15 steps, ~25 min | 17 steps, ~35 min |

The durations are estimates reasoned from what each step asks. None has yet
been timed with a class.

## What each investigation measures, and the physics that checks it

**1. An orbit's plane.**
- **Seen from above,** the orbit is squeezed across its line of nodes by cos i.
- **Seen edge-on,** along its line of nodes, it is a line.
- **Measured:** the Orbit instrument reads i and Ω, and on the advanced path ω. A frame change leaves all three alone, because they are about the primary.
- **Checked:** against R1's construction: 40°, 30°, 60°.

**2. Seen from outside.**
- **The observer** looks along the reference plane from −y. At conjunction the planet passes a·sin i from the star on the sky, the impact parameter in star radii.
- **An eclipse** needs that below the two radii's sum: 1.1 star radii here.
- **Half a degree** is enough to lose the eclipse (1.75 star radii), and 0.2° keeps it (0.70).
- **Drawn at ten times their radii,** the discs overlap where the true ones do not. The legend says the size is enlarged, and the step asks the reader to notice that the picture lied.
- **Advanced:** the largest inclination that eclipses, asin(0.0055) = 0.315°, which leads to the geometric transit probability.
- **Checked:** sin i / R* and asin, by hand.

**3. Two orbits' planes.**
- **The instrument "Between two orbits"** reads the angle between the two orbits' angular momentum vectors.
- **Two orbits at i = 10°** with nodes 90° apart are 14.106° apart, the spherical-trigonometry value on the advanced path.
- **R3's Jupiter and Saturn** are 1.267° apart, not their inclinations' difference of 1.2°. A flat model shortens distances by 1 − cos I = 0.00024 there, which is why the 2-D sandbox models the Solar System's planets well.
- **Checked:** acos(cos i₁ cos i₂ + sin i₁ sin i₂ cos ΔΩ).

**4. A distant third body.**
- **The reader keeps two moments,** the start and near the first eccentricity peak, and reads e and i at each from the orbits table.
- **The eccentricity** rises from 0.01 to 0.840 while the inclination falls to 39.4°, next to the critical angle 39.2°.
- **√(1 − e²)·cos i,** the particle's angular momentum along the outer orbit's axis, changes by under 1% (0.4226, then 0.4191).
- **Advanced:** the quadrupole prediction √(1 − (5/3)cos² i₀) = 0.838, and why there are no large cycles below 39.2°.
- **Checked:** the kernel's full three-body integration peaks within 0.01 of the formula, near the critical angle, with the invariant held to a percent. This is the same phenomenon and system as reference problem R6, which the kernel's validation already holds (VALIDATED_3D_LAB_GATE.md).

The answer key (`js/data/lab3dAnswerKey.js`, `npm run lab3d:key`) is a
reference run: tools/lab3d-guides-key.mjs plays every guide as a reader would,
through the page's systems, tick, live sessions and answer functions.
tests/lab3dGuides.test.js holds the committed key to that run, and the key
to the hand-worked physics above.

## What a 2-D model cannot represent, and when it is still right

| Investigation | A flat model loses | A flat model keeps, and when it is enough |
|---|---|---|
| An orbit's plane | Inclination, the line of nodes: where the orbit is | Size, shape and period, exactly; enough for one orbit on its own |
| Seen from outside | Whether an orbit eclipses: tenths of a degree out of the plane decide it | The period, the orbit's size, the times of conjunction |
| Two orbits' planes | Every mutual inclination is zero | Distances and periods of a nearly flat system: two parts in ten thousand for Jupiter and Saturn |
| A distant third body | Kozai-Lidov cycles: a flat triple has none | A triple whose orbits are within about 39° of each other, for this effect |

## Model limits, stated in each investigation's last step

- **All four:** point masses under Newtonian gravity, integrated by the validated 3-D kernel; no general relativity, tides, spin or radiation. The elements are osculating (the two-body orbit of the moment), read to the table's four significant figures.
- **An orbit's plane:** the elements stay fixed here, and with a third body they would drift.
- **Seen from outside:** radii serve contacts and drawing, not light: no light curve, limb darkening or transit duration. An eclipse is geometry.
- **Two orbits' planes:** the planets are light and far apart. Over many orbits their planes precess about the total angular momentum, and the instrument reads the moment.
- **A distant third body:**
  - a massless particle and point stars;
  - the full three-body problem, so the higher orders the formula omits are in;
  - no general relativity, whose precession would damp the cycle for a tight inner orbit;
  - played at 40 ticks per inner orbit. The tick samples the picture; DOPRI5 chooses its own steps, and the answers agree to four figures with the lab's usual 400.

## How it runs

- **Where the guides live:** `js/lab3d/guides/curriculum.js`, as data: systems, steps, checks, answers and correct options, all computed from the lab's state.
- **The runner:** `js/lab3d/view/guidePanel.js`, loaded only when a guide is opened. It drives the lab through the page's `labApi` (`js/lab3dLab.js`): opening a system, setting a control, reading the choices and the numbers the tables show. It never reaches the kernel or the scene.
- **Two new instruments** (`js/lab3d/view/instruments.js`):
  - **on the sky:** the separation across and along the line of sight, and which body is nearer;
  - **between two orbits:** mutual inclination.
- **A kept moment** is the snapshot the tables show when the reader presses "Keep this moment". Answers that read it are checked against it, not against the key.
- **Progress** is kept in this browser, per guide and path.
- **The report** is a file (`gravitas.lab3d-guide-report` 1): the guide, the path, the language, an optional name, and every step's answer, choice, pass and whether its answer was shown. It has no clock in it, so the same answers make the same bytes.
- **The words** are `js/i18n/{en,es}.lab3dGuides.js`: every step in English and Spanish.
- **Every step can be done from the tables,** with no WebGL, from the keyboard, or with a screen reader.
- **Offline:** once a class has opened the lab, the page, its modules, three.js and the kernel are precached as optional, and a guide opens offline.
- **Instructor materials:** an instructor guide (the curriculum map, the systems, teaching notes and an assignment sheet per investigation, with the approximations that remain) and an answer key, rendered by `js/lab3dGuideDocs.js` into the encrypted instructor bundle. The committed bundle is rebuilt with the passphrase, which this change does not have, so `instructors:check` reports it stale until then.
- **Assignments:** an assignment is the guide's link (the instructor guide gives one per investigation and path) and the report the student saves at the end.

## Files

| Path | What it is |
|---|---|
| `js/lab3d/guides/curriculum.js` | The four investigations: systems, steps, checks, answers |
| `js/lab3d/view/guidePanel.js` | The runner and the report |
| `js/lab3d/view/tick.js` | The lab's tick, shared with the reference run |
| `js/i18n/en.lab3dGuides.js`, `js/i18n/es.lab3dGuides.js` | The words |
| `js/data/lab3dAnswerKey.js`, `tools/lab3d-guides-key.mjs` | The key and the reference run that writes it |
| `js/lab3dGuideDocs.js` | The instructor guide and answer key |
| `tests/lab3dGuides.test.js`, `e2e/lab3dGuides.spec.js` | Rules, words, key, physics; the walks in a browser |
