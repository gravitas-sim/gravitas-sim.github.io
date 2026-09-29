# The mission lab: to Mars in 2026

A mission to Mars at `/mission/lab/`, on JPL's DE441 ephemeris, in three
guided parts:

1. **In Earth orbit:** a rendezvous with a propellant depot.
2. **Leaving for Mars:** the 2026 launch window and its trade-offs.
3. **On the way:** the patched-conic design against the same spacecraft
   flown directly, why it misses, and what a correction costs.

It builds on the mission-design core (MISSION.md) and the validated 3-D
kernel (LAB3D.md).

**It is educational software, not operational mission design or
navigation.** The planets' positions are JPL's, to a few kilometers.
Everything else is a teaching model, and
[the model's limits](#the-models-limits) say what it leaves out. Every
page, plan file and report says so, and the plan file and the report
carry `"notFor": "operational mission design or navigation"`.

## What the lab has

- **A maneuver editor** (the plan):
  - the parking and depot orbits, and the depot's lead;
  - the departure date and time of flight;
  - the capture orbit at Mars;
  - an optional correction burn;
  - the spacecraft's dry mass and specific impulse;
  - which bodies pull on the direct flight, and where it starts.
- **An interactive mission timeline.** Every event is listed in order, with
  its date and delta-v, and a slider moves through the cruise.
- **Three geometry views:** from above the ecliptic, edge-on with heights
  stretched 20 times (the caption says so), and the departure from Earth.
  Every number is also in tables.
- **The mission in numbers:**
  - Earth orbit: the lead, the wait, the rendezvous, and what a 5° plane
    change would cost;
  - the patched-conic design;
  - the direct flight;
  - the correction;
  - delta-v and propellant, burn by burn, by the rocket equation;
  - where the propellant comes from;
  - the Lambert solver's report.
- **The 2026 launch window:** 19,026 Lambert transfers on the ephemeris, in
  three dimensions, with four candidates, each with "Use this":
  - cheapest in delta-v;
  - lowest C3;
  - slowest arrival;
  - shortest trip within 10% of the cheapest.
- **The reference cases,** run in the page's Worker.
- **Three guides** on introductory and advanced paths, checked against the
  reader's own lab, and a report file.
- **Plan export:** `gravitas.mission-plan` 1 (MISSION.md), kind
  `missionLab`.
- **English and Spanish;** keyboard, screen-reader and phone-width use.
  Once the lab has been opened it works offline.

The page never computes an orbit. `js/mission/labWorker.js` carries the
ephemeris pack and does every computation. Its protocol is the core's, so
the core's client (`js/mission/api.js`) speaks to it.

## The ephemeris pack

`gravitas.ephemeris-pack` 1, pack `solar-system-2025-2045` 1.0.0. It is
generated reproducibly by a developer pipeline, and the live lab does not
depend on any remote API: it reads a compact, same-origin derivative.

| | |
|---|---|
| Source | NASA/JPL Horizons API 1.2, ephemeris DE441 (Park et al. 2021, AJ 161, 105) |
| Bodies | Venus (299), Earth (399), Mars (499; Horizons source mar099), the Jupiter system barycenter (5) |
| Center | The Sun's center (Horizons `500@10`) |
| Frame | Ecliptic of J2000.0, ICRF |
| Time standard | TDB; a Julian date. Calendar dates are read at 00:00, and the 69 s between TDB and UTC is left out |
| Units | km and km/s |
| States | Geometric (no light-time or aberration: `VEC_CORR=NONE`) |
| Retrieved | 2026-09-29 |
| Manifest | `ephemeris-packs/solar-system-2025-2045.json`: every request, the SHA-256 of every answer's data rows, the fit, the measured errors |
| Checksums | Each body's coefficients (SHA-256) in the manifest and the module; the module's and the check set's SHA-256 in the manifest |

**Why the Jupiter barycenter and not the planet.** Its moons swing Jupiter's
center by hundreds of km with periods of 1.8 to 17 days. Daily samples
alias that motion: fitted to the body center, the held-out error was
235 km. The barycenter moves smoothly and is what a heliocentric transfer
needs. The Earth's center does swing about the Earth-Moon barycenter, by
4,670 km a month; its fit resolves that, and is the largest of the four.

### Date range

| | |
|---|---|
| Start | 2025-01-01 00:00 TDB (JD 2460676.5) |
| End | 2045-01-01 00:00 TDB (JD 2467981.5) |
| Fitted | A state every day at 00:00 TDB: 7,306 per body |
| Held out | A state every day at 12:00 TDB, never fitted: 7,305 per body |
| Outside the range | Refused (`outOfRange`), never extrapolated. The lab refuses a plan whose arrival is after the end, and a window that reaches past it |

### Accuracy

The pack fits Chebyshev polynomials to each body's orbit over fixed
segments. They are fitted by least squares on the daily positions and
velocities together, as JPL's own ephemerides are stored. The stated
bound is the worse of the two measurements, rounded up to three figures.
The offline check and the tests hold the pack to it.

| Body | Segment | Degree | Fitted: position, velocity | Held out: position, velocity | Stated bound |
|---|---|---|---|---|---|
| Venus | 64 d | 12 | 1.04 km, 1.7e-6 km/s | 1.00 km, 1.6e-6 km/s | 1.05 km, 1.7e-6 km/s |
| Earth | 32 d | 12 | 4.17 km, 5.3e-5 km/s | 4.08 km, 7.3e-5 km/s | 4.18 km, 7.3e-5 km/s |
| Mars | 128 d | 14 | 1.03 km, 1.8e-6 km/s | 1.03 km, 1.1e-6 km/s | 1.04 km, 1.8e-6 km/s |
| Jupiter (barycenter) | 256 d | 10 | 3.86 km, 2.5e-5 km/s | 2.85 km, 2.2e-5 km/s | 3.86 km, 2.5e-5 km/s |

**How the bounds compare with the rest of the lab:**
- The worst bound is 4.18 km at 1 AU, 3e-8 of the distance.
- The patched conic's own error in this mission is about 2 million km.
- The lab reports delta-v to the m/s; the velocity bounds are under 0.1 m/s.

**Where the segments meet,** each side is its own fit. The jump there is
inside twice the stated bound (reference case E2).

### Storage

| | Bytes |
|---|---|
| Venus coefficients | 20,700 (27,600 as base64) |
| Earth coefficients | 41,220 (54,960) |
| Mars coefficients | 11,832 (15,776) |
| Jupiter coefficients | 4,524 (6,032) |
| The pack module, `js/data/ephemeris/solarSystem2025.js` | 107,127 |
| The held-out check set, `js/data/ephemeris/solarSystem2025Check.js` (every 73rd noon state, 100 or 101 per body) | 30,595 |
| The raw Horizons answers in `.ephemeris-cache/`, not committed | 11,498,642 |

**The layout,** for each segment and each of x, y and z:
- the first two coefficients are float64, because they carry the orbit's
  1e8 km and float32 would round them to kilometers;
- the rest are float32.

In float64 throughout, the same fits would take 135,864 bytes of
coefficients instead of 78,276, and their held-out error would be 0.01 km
instead of about 1 km. Neither error is visible to anything the lab
computes, so the pack takes the smaller.

Both modules are loaded only by the lab's Worker (and the tests). They are
outside the application's budgets and are precached as optional.

### The pipeline

```bash
npm run ephemeris:data         # fetch what is missing into .ephemeris-cache/, check the pins, rebuild
npm run ephemeris:check        # offline: the module against its manifest and the check set (a CI step)
npm run ephemeris:provenance   # the cache against its pins, and the pack rebuilt byte for byte
```

`tools/build-ephemeris.mjs`:
- **Pinning.** A Horizons answer carries the time it was made, so it is
  pinned over its data rows (the lines between `$$SOE` and `$$EOE`).
- **Header checks.** The header facts are read and compared with the
  manifest: the target, its source, the ephemeris, the frame, the units and
  the output type.
- **Reproducibility.** The rebuild is deterministic. The provenance check
  rebuilds the module and the check set from the cache and requires the
  same bytes.

## The guides

| # | Part (`id`) | Question | Intro | Advanced |
|---|---|---|---|---|
| 1 | In Earth orbit (`ml-orbit`) | What does meeting a depot cost, and why is a plane change dear? | 6 steps, ~15 min | 8 steps, ~25 min |
| 2 | Leaving for Mars (`ml-window`) | When is the cheapest day to leave in 2026, and what does a faster trip cost? | 7 steps, ~20 min | 9 steps, ~30 min |
| 3 | On the way (`ml-cruise`) | Why does the patched-conic spacecraft miss Mars, and what does a correction cost? | 11 steps, ~25 min | 14 steps, ~40 min |

The durations are estimates. None has been timed with a class.

**The step kinds:**
- read;
- choose: a prediction is recorded and never marked; otherwise the right
  option is computed;
- answer: a number read from the lab, within a tolerance;
- do: something done in the lab and checked there;
- explain: written, recorded for the instructor, and never marked.

After a wrong answer, or for a "do" step, "Show me" gives the answer or does
the step.

**The rendezvous or gravity-assist case** is the rendezvous: a Hohmann
transfer from the parking orbit to the depot. It is the core's validated
case (MISSION.md, R1), and the lab flies it again in its own case S2.
Gravity assists are left out. The core supports them only planar and
unpowered, and a mission-scale assist would need B-plane targeting, which
it does not have.

**The discrepancy students must explain.** Flown directly with no
correction, the designed spacecraft misses Mars by about 2 million km.
Students measure why, by switching the planets and the starting point
(reference case D1):
- from the Earth's center under the Sun alone, it arrives within meters;
- the other planets move the arrival by under 100,000 km;
- leaving from a real orbit, the Earth pulls outside its sphere of
  influence and the Sun inside it, and that moves the arrival by millions.

Students choose the diagnosis, which is checked. They then write an
explanation of at least 25 words, which is recorded.

**The correction** aims again until the spacecraft arrives within 100 km of
Mars's center, with Mars's own pull left out of the aiming leg. It costs
more the later it is made (reference case D2).

| Correction on day | Delta-v |
|---|---|
| 10 | 49 m/s |
| 30 | 70 m/s |
| 100 | 92 m/s |
| 200 | 217 m/s |

**The answer key** is a reference run (`tools/mission-lab-key.mjs`,
`npm run mission:key`; `js/data/missionLabKey.js`). tests/missionLab.test.js
holds the committed key to a fresh run.

**Instructor materials:** an instructor guide (the curriculum map, the data,
teaching notes and an assignment sheet per part) and an answer key
(`js/missionLabDocs.js`). They are in the encrypted instructor bundle once
it is rebuilt with the passphrase; this change does not have it.

**The report** is `gravitas.mission-lab-report` 1:
- every step's input, pass and shown flag, for all three parts on the
  chosen path;
- the plan and its key results;
- an optional name.

It has no clock in it.

## Reference cases

`npm run validate:mission` runs these after the core's. The core's table is
in MISSION.md.
- **E:** the pack, against held-out JPL states and published mean elements.
- **S:** each step of the mission, flown by the 3-D kernel.
- **D:** what the direct flight measures, and that the integration is not
  what misses.

<!-- missionlab:validation -->
| # | Case | Kind | Measured | Value | Expected | |
|---|---|---|---|---|---|---|
| E1 | The pack against held-out Horizons states | independent | venus: position | 0.95872 | 0 ± 1.05 km | pass |
| E1 | The pack against held-out Horizons states | independent | venus: velocity | 1.3e-6 | 0 ± 1.7e-6 km/s | pass |
| E1 | The pack against held-out Horizons states | independent | earth: position | 3.6173 | 0 ± 4.18 km | pass |
| E1 | The pack against held-out Horizons states | independent | earth: velocity | 5.8e-5 | 0 ± 7.3e-5 km/s | pass |
| E1 | The pack against held-out Horizons states | independent | mars: position | 0.85611 | 0 ± 1.04 km | pass |
| E1 | The pack against held-out Horizons states | independent | mars: velocity | 6.7e-7 | 0 ± 1.8e-6 km/s | pass |
| E1 | The pack against held-out Horizons states | independent | jupiter: position | 2.4897 | 0 ± 3.86 km | pass |
| E1 | The pack against held-out Horizons states | independent | jupiter: velocity | 2.1e-5 | 0 ± 2.5e-5 km/s | pass |
| E2 | The pack is continuous where its segments meet | independent | venus: position jump | 1.6675 | 0 ± 2.1 km | pass |
| E2 | The pack is continuous where its segments meet | independent | venus: velocity jump | 2.2e-6 | 0 ± 3.4e-6 km/s | pass |
| E2 | The pack is continuous where its segments meet | independent | earth: position jump | 3.3177 | 0 ± 8.36 km | pass |
| E2 | The pack is continuous where its segments meet | independent | earth: velocity jump | 4.6e-5 | 0 ± 1.5e-4 km/s | pass |
| E2 | The pack is continuous where its segments meet | independent | mars: position jump | 1.4963 | 0 ± 2.08 km | pass |
| E2 | The pack is continuous where its segments meet | independent | mars: velocity jump | 2.1e-6 | 0 ± 3.6e-6 km/s | pass |
| E2 | The pack is continuous where its segments meet | independent | jupiter: position jump | 4.6545 | 0 ± 7.72 km | pass |
| E2 | The pack is continuous where its segments meet | independent | jupiter: velocity jump | 4.0e-5 | 0 ± 5.0e-5 km/s | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | venus: inclination | 3.3944 | 3.3947 ± 0.02 deg | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | venus: semi-major axis / published - 1 | -7.9e-6 | 0 ± 2.0e-3 | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | mars: inclination | 1.8476 | 1.8497 ± 0.02 deg | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | mars: semi-major axis / published - 1 | 1.8e-5 | 0 ± 2.0e-3 | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | jupiter: inclination | 1.3036 | 1.3044 ± 0.02 deg | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | jupiter: semi-major axis / published - 1 | 9.1e-4 | 0 ± 0.01 | pass |
| E3 | The planets’ orbits against their published mean elements | textbook | earth: inclination | 3.0e-3 | 0 ± 0.02 deg | pass |
| S1 | Lambert between the pack’s positions, flown by the kernel | independent | miss at Mars | 7.5e-4 | 0 ± 0.01 km | pass |
| S2 | The rendezvous with the depot, flown by the kernel | independent | separation / depot radius | 1.2e-12 | 0 ± 1.0e-8 | pass |
| S3 | The departure hyperbola leaves along its asymptote | independent | angle to the asymptote | 8.2e-6 | 0 ± 1.0e-3 rad | pass |
| S3 | The departure hyperbola leaves along its asymptote | independent | speed / vis-viva - 1 | 2.7e-14 | 0 ± 1.0e-4 | pass |
| S4 | The capture burn, flown by the kernel | independent | circular: periapsis / asked - 1 | -1.9e-13 | 0 ± 1.0e-9 | pass |
| S4 | The capture burn, flown by the kernel | independent | circular: apoapsis / asked - 1 | 4.8e-13 | 0 ± 1.0e-9 | pass |
| S4 | The capture burn, flown by the kernel | independent | elliptical: periapsis / asked - 1 | 6.6e-14 | 0 ± 1.0e-9 | pass |
| S4 | The capture burn, flown by the kernel | independent | elliptical: apoapsis / asked - 1 | 5.2e-13 | 0 ± 1.0e-9 | pass |
| S5 | The rocket equation, burn by burn | analytic | split - whole | 9.1e-13 | 0 ± 1.0e-9 kg | pass |
| D1 | What makes the direct flight miss | independent | Earth’s center, the Sun alone | 4.7e-4 | 0 ± 0.01 km | pass |
| D1 | What makes the direct flight miss | independent | Earth’s center, the other planets: under 2e5 km | true | = true | pass |
| D1 | What makes the direct flight miss | independent | periapsis, the Earth: over 1e6 km | true | = true | pass |
| D1 | What makes the direct flight miss | independent | periapsis, everything: over 1e6 km | true | = true | pass |
| D1 | What makes the direct flight miss | independent | corrected on day 30: the miss | 9.0042 | 0 ± 100 km | pass |
| D1 | What makes the direct flight miss | independent | corrected on day 30: aims | true | = true | pass |
| D2 | Correcting early costs less | independent | day 10 < day 30 < day 100 < day 200 | true | = true | pass |
| D2 | Correcting early costs less | independent | day 200 / day 10 | true | = true | pass |
<!-- /missionlab:validation -->

## The model's limits

This is the complete statement. It is also on the page, and in each part's
last step.

- **Positions.** The planets' positions are JPL's DE441, to within the
  stated bounds (a few km) from 2025 to 2045. A time outside the pack is
  refused.
- **Burns.** Every burn is instantaneous: no finite burns, no gravity losses,
  no engine start-up or throttling.
- **The design.** The design is a patched conic: inside a planet's sphere of
  influence only the planet pulls, and outside it only the Sun. The
  heliocentric leg runs between the planets' centers. The direct flight
  shows what that costs.
- **The direct flight's bodies.** It is pulled only by the Sun and the
  planets ticked. Mercury, Saturn, Uranus, Neptune, the Moon and the
  asteroids are left out.
- **The Moon.** It is left out entirely, though it pulls hardest on a
  spacecraft leaving the Earth.
- **Shape.** Every body is a point mass: no oblateness (the Earth's J2
  turns a low orbit's plane by several degrees a day), no atmosphere, no
  drag.
- **Other forces.** No radiation pressure, no outgassing, no relativity.
- **The planets in the direct flight.** They start at their ephemeris
  states and then move under the model's own pulls. By arrival they have
  drifted from JPL's by up to a few thousand km (1,310 km for Mars in the
  default mission).
- **Aiming.** The correction aims at Mars's center with Mars not pulling,
  as the heliocentric leg does. A real mission aims at a point beside the
  planet (the B-plane), which is not supported.
- **Transfers.** Lambert transfers have zero revolutions. Near-antipodal and
  unconfirmable transfers are refused (MISSION.md).
- **Launch.** There is no launch: the spacecraft starts in its parking
  orbit, and the depot is a given. The propellant it arrives with is only
  what the rendezvous needs.
- **Operations.** There is no navigation, no tracking and no uncertainty:
  every state is known exactly.
- **Time.** TDB is read as the calendar date, and the 69 s from UTC is left
  out.
- **What it is.** This is educational software, not operational mission
  design. It keeps the ideas a mission rests on and shows how large what it
  leaves out can be. Operational tools exist to remove exactly those limits.

## Files

| Path | What it is |
|---|---|
| `ephemeris-packs/solar-system-2025-2045.json` | The pack's manifest: source, requests, pins, fit, measured errors |
| `js/data/ephemeris/solarSystem2025.js`, `solarSystem2025Check.js` | The pack and its held-out check set (generated) |
| `tools/build-ephemeris.mjs` | The pipeline: fetch, pin, fit, check, rebuild |
| `js/mission/ephemeris.js` | Reading the pack |
| `js/mission/solar.js` | The mission model: the design, the direct flight, the correction, the budget |
| `js/mission/labReferences.js` | The lab's reference cases |
| `js/mission/labCore.js`, `labWorker.js` | The lab's Worker |
| `js/mission/lab/defaults.js`, `curriculum.js`, `guidePanel.js`, `i18n.js` | The default plan, the guides, the guide panel, the translator |
| `js/i18n/{en,es}.missionLab.js`, `js/i18n/{en,es}.missionLabGuides.js` | The words |
| `mission/lab/index.html`, `js/missionLabPage.js` | The page |
| `js/missionLabDocs.js`, `tools/mission-lab-key.mjs`, `js/data/missionLabKey.js` | The instructor documents and the key |
| `tests/missionLab.test.js`, `e2e/missionLab.spec.js` | The pack, the model, the guides; the lab in a browser |
