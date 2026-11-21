# What pulls on what

The engine's rule for which bodies pull on which, the settings every lesson
scene runs with, and what each part of the rule is: a teaching simplification
or a defect. The rule is one function, `gravityRoles(settings)` in
`js/engine/state.js`; the step's source list, the conservation caveat, the
scene statement, the inspector row and the model page all read it.

## The rule, as the engine has it (read from the code at 2a33b0102)

| Rule | Where | What it is |
|---|---|---|
| Black holes, stars and galaxies always pull | `js/engine/state.js` `sourceLists` | teaching simplification (a cluster whose members did not attract each other would not be a cluster) |
| Gas giants, neutron stars and white dwarfs pull unless `star_only_gravity` is on | same | teaching simplification (star-only gravity is for planetary systems) |
| Planets and asteroids pull only with `mutual_gravity` on and `star_only_gravity` off | same | teaching simplification (test particles) |
| Comets and debris never pull | same | teaching simplification (test particles) |
| A black hole is pulled by other black holes only (and the halo or MOND), never by a star, planet or galaxy, even when Orbiting | `js/engine/blackHole.js` `orbit_acceleration` | teaching simplification: total momentum is not conserved where a star and a hole share a scene |
| A Static black hole does not move once its grace period has run out; a newly created one keeps moving for 10 s of play at 1x, so a merger product does not freeze in flight | `js/engine/blackHole.js` `can_move` | teaching simplification (a fixed potential well), the grace deliberate |
| A body a prescribed model owns (`model_owned`) is a source but never a target: it moves as its own code moves it | `js/engine/forces.js` `computeAccelerations` | by design (lesson stages) |
| `star_only_gravity` has no Settings row, and while it is on the Mutual Gravity box does nothing | `js/settingsSchema.js` | stated; exposing it is the maintainer's decision |
| The one-way caveat was raised from the two settings alone: it missed a hole beside a star with mutual gravity on, and it was raised for a scene of stars alone with mutual gravity off, where every pair pulls both ways | `js/engine/conservation.js` `conservationCaveats` | defect, corrected: the caveat now asks the relation about the kinds present |

## Lesson scenes (step 1 of the change, counted)

Every lesson step whose `setup` names a scenario, core and depth files, with
the settings the scene is built with (`DEFAULT_SETTINGS`, then the preset's
row, then the step's own `settings`). Counted by a
script over the lesson data at 2a33b0102 (lesson modules imported, each
step's `setup` read): 86 steps,
28 scenarios. Every one runs Static holes (`bh_behavior`), and only
`tidal-disruption-event` asks for a hole in its row (one hole and one star:
the star is pulled by the hole and the hole by nothing). Scenes whose bodies
come from a builder or declared geometry are covered by the statement test,
which reads the built world of all 61 presets.

| Where | Lesson | Step | Scenario | id | mutual_gravity | star_only_gravity | bh_behavior | G |
|---|---|---|---|---|---|---|---|---:|
| core | binary-star-planets | two-suns | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | run-the-default | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | run-it-at-030 | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | run-the-sweep | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | resolve-the-edge | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | energy-drift-as-a-screen | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | the-case-that-matters | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | around-both | Circumbinary Planet Lab | circumbinary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | run-the-circumbinary | Circumbinary Planet Lab | circumbinary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | sweep-the-circumbinary | Circumbinary Planet Lab | circumbinary-planet-lab | true | false | Static | 1 |
| core | binary-star-planets | where-the-fit-disagrees | Circumbinary Planet Lab | circumbinary-planet-lab | true | false | Static | 1 |
| core | butterfly-effect | a-word-that-has-been | Three-Body Sensitivity Lab | three-body-sensitivity-lab | true | false | Static | 2 |
| core | butterfly-effect | a-control-before-the-interesting | Binary Pair | binary-pair | false | true | Static | 1 |
| core | butterfly-effect | back-to-the-triangle | Three-Body Sensitivity Lab | three-body-sensitivity-lab | true | false | Static | 2 |
| core | comets-and-the-sun | a-dirty-snowball | Solar System | solar-system | false | true | Static | 1 |
| core | design-the-schedule | eight-nights | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | design-the-schedule | set-the-run-up | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | design-the-schedule | run-both-schedules | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | design-the-schedule | break-your-own-result | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | design-the-schedule | lose-a-fortnight | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | design-the-schedule | type-the-dates | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | detect-this-planet | twelve-nights | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | detect-this-planet | do-it-to-the-real | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | extending-an-experiment | twenty-planets | Binary Planet Lab | binary-planet-lab | true | false | Static | 1 |
| core | goldilocks-question | what-does-earth-get-from | Solar System | solar-system | false | true | Static | 1 |
| core | goldilocks-question | now-put-it-round-the | Habitable Zone Lab | habitable-zone-lab | false | true | Static | 1 |
| core | goldilocks-question | the-wider-definition-on-the | Habitable Zone Lab | habitable-zone-lab | false | true | Static | 1 |
| core | goldilocks-question | a-real-system-forty-light | TRAPPIST-1 System | trappist-1-system | false | true | Static | 1 |
| core | goldilocks-question | all-seven-planets | TRAPPIST-1 System | trappist-1-system | false | true | Static | 1 |
| core | goldilocks-question | watch-it-run | TRAPPIST-1 System | trappist-1-system | false | true | Static | 1 |
| core | gravity-assist | voyager-left-faster | Gravity Assist Lab | gravity-assist-lab | true | false | Static | 1 |
| core | gravity-assist | fly-the-gaining-pass | Gravity Assist Lab | gravity-assist-lab | true | false | Static | 1 |
| core | gravity-assist | the-other-side | Gravity Assist Lab | gravity-assist-lab | true | false | Static | 1 |
| core | gravity-assist | sweep-the-impact-parameter | Gravity Assist Lab | gravity-assist-lab | true | false | Static | 1 |
| core | gravity-assist | now-with-a-sun | Gravity Assist: Heliocentric | gravity-assist-heliocentric | true | false | Static | 1 |
| core | gravity-assist | fly-it-heliocentric | Gravity Assist: Heliocentric | gravity-assist-heliocentric | true | false | Static | 1 |
| core | hohmann-transfer | the-problem | Orbital Transfer Lab | orbital-transfer-lab | true | false | Static | 2 |
| core | integrators-in-practice | one-system-four-steps | Circumbinary Planet Lab | circumbinary-planet-lab | true | false | Static | 1 |
| core | ios-fire | a-moon-that-melts | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | keplers-laws | eight-minutes-of-arc | Kepler's 2nd Law | keplers-2nd-law | false | true | Static | 1 |
| core | keplers-laws | kepler-s-third-law | Solar System | solar-system | false | true | Static | 1 |
| core | keplers-laws | what-newton-added | TRAPPIST-1 System | trappist-1-system | false | true | Static | 1 |
| core | lagrange-points | two-stars-and-a-speck | Lagrange Point Lab | lagrange-point-lab | true | false | Static | 2 |
| core | lagrange-points | predict-same-region-same-path | Lagrange Point Lab | lagrange-point-lab | true | false | Static | 2 |
| core | lagrange-points | watch-it-not-cross | Lagrange Point Lab | lagrange-point-lab | true | false | Static | 2 |
| core | missing-mass | two-ways-to-weigh-a | Solar System | solar-system | false | true | Static | 1 |
| core | missing-mass | now-a-galaxy | Spiral Galaxy | spiral-galaxy | true | false | Static | 1 |
| core | missing-mass | what-rubin-and-ford-found | Milky Way Rotation | milky-way-rotation | true | false | Static | 1 |
| core | missing-mass | take-the-halo-away-from | Milky Way Rotation | milky-way-rotation | true | false | Static | 1 |
| core | missing-mass | forty-years-earlier | Coma Cluster | coma-cluster | true | false | Static | 1 |
| core | orbital-energy | how-hard-would-you-have | Kepler's 2nd Law | keplers-2nd-law | false | true | Static | 1 |
| core | orbital-energy | around-a-real-orbit | Kepler's 2nd Law | keplers-2nd-law | false | true | Static | 1 |
| core | orbital-energy | something-that-came-from-outside | Interstellar Visitor | interstellar-visitor | false | true | Static | 1 |
| core | comets-and-the-sun | a-dirty-snowball | Solar System | solar-system | false | true | Static | 1 |
| core | the-scale-of-the-solar-system | a-picture-you-have-seen | Solar System | solar-system | false | true | Static | 1 |
| core | power-law-gravity | the-exactly | Solar System | solar-system | false | true | Static | 1 |
| core | radial-velocity | the-planet-you-already-measured | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | radial-velocity | which-one-moves | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | radial-velocity | open-the-real-instrument | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | radial-velocity | read-k-off-the-panel | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | refitting-a-transit | same-model-another-route | Transit Lab | transit-lab | false | true | Static | 1 |
| core | retrograde-motion | the-wandering-stars | Retrograde Mars | retrograde-mars | false | true | Static | 1 |
| core | sampling-a-posterior | what-a-sampler-does | Transit Lab | transit-lab | false | true | Static | 1 |
| core | ios-fire | a-moon-that-melts | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | why-rings | a-pass-inside-the-limit | Roche Pass | roche-pass | true | false | Static | 3000 |
| core | why-rings | a-ring-with-a-resonance | Ring Gap | ring-gap | true | false | Static | 10000 |
| core | the-scale-of-the-solar-system | a-picture-you-have-seen | Solar System | solar-system | false | true | Static | 1 |
| core | tides | twice-a-day-everywhere | Earth-Moon System | earth-moon-system | true | false | Static | 9000 |
| core | tides | the-extreme-case-running-live | Tidal Disruption Event | tidal-disruption-event | false | false | Static | 2 |
| core | transit-photometry | a-firefly-beside-a-lighthouse | Transit Lab | transit-lab | false | true | Static | 1 |
| core | transit-photometry | compare-the-two-curves | Blended Binary | blended-binary | false | true | Static | 1 |
| core | twelve-nights | the-allocation | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | twelve-nights | look-at-the-windows | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | twelve-nights | commit-and-observe | Exoplanet Characterization Lab | exoplanet-characterization-lab | true | false | Static | 1 |
| core | two-periodograms | two-ways-to-look-for-a-period | Transit Lab | transit-lab | false | true | Static | 1 |
| core | when-orbits-lock | four-moons-and-a-suspicious | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | when-orbits-lock | measure-the-four-periods | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | when-orbits-lock | where-do-the-line-ups | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | when-orbits-lock | break-it | Broken Laplace Resonance | broken-laplace-resonance | true | false | Static | 2 |
| core | when-orbits-lock | the-awkward-case | Galilean Resonance | galilean-resonance | true | false | Static | 2 |
| core | when-orbits-lock | the-orbit-that-crosses-and | Pluto and Neptune | pluto-and-neptune | true | false | Static | 2 |
| core | when-orbits-lock | measure-pluto-s-resonance | Pluto and Neptune | pluto-and-neptune | true | false | Static | 2 |
| core | when-orbits-lock | sixty-degrees-ahead | Jupiter Trojans | jupiter-trojans | true | false | Static | 2 |
| core | when-orbits-lock | the-rotating-frame | Jupiter Trojans | jupiter-trojans | true | false | Static | 2 |
| core | why-rings | a-pass-inside-the-limit | Roche Pass | roche-pass | true | false | Static | 3000 |
| core | why-rings | a-ring-with-a-resonance | Ring Gap | ring-gap | true | false | Static | 10000 |
