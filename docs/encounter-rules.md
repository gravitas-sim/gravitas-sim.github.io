# Close encounters, collisions and mergers: the rules and their classes

What the engine does when two bodies meet or pass close, which kind of rule
each one is, the number that judges it and the bound, written before any
engine change. The bounds are those of the sandbox reference cases
(`tests/fixtures/reference-cases/thresholds.json`, judged by
`tools/reference-cases.mjs` at 120, 60 and 30 frames a second and at the
slow-frame clamp of 0.05 s); none is moved here.

Three classes:

- **numerical defect**: the result depends on the frame rate or the step and
  should not. Fixed against its bound, or its limit written.
- **physical approximation**: a real process replaced by a simpler model that
  keeps the conserved quantities it claims.
- **teaching simplification**: a rule chosen for the picture, which conserves
  less than the real process would, stated where it bites.

## The rules

| Rule | Where | Class | Quantity and bound | Reason |
|---|---|---|---|---|
| Tidal debris count: a body inside the tidal radius of a hole (3, 4, 5 and 2 hole radii for planet, gas giant, star and comet) sheds `fraction * c * dt` fragments per step, c = 20, 35, 50 and 25 | `js/engine/bodies.js` `tidal_mass_loss` (four sites), called from `js/engine/step.js` | numerical defect | R5 fragments created by the time the star leaves 5 hole radii: (max - min) / mean over the four rates <= 0.2 | The count was `floor` of each step's share, so a short step rounds every share to zero: 0, 53, 75 and 92 fragments at 120, 60, 30 frames a second and the clamp (spread 1.67). The fix carries the remainder per body (`carry += fraction*c*dt; n = floor(carry); carry -= n`), the same at all four sites, starting at 0 and not stored in saves. |
| Tidal mass loss `m * fraction * k * dt`, k = 0.05, 0.08, 0.1 and 0.1 | the same four sites | kept | R5 star mass fraction on leaving: (max - min) / mean over the four rates <= 0.05 | Already a rate: 0.7977 to 0.7987, spread 0.00125. Tidal disruption is a mass sink, reported by the conservation caveats. |
| Rocky contact (planet, asteroid, comet pairs) above a relative speed of 15 sheds `floor(speed / 8) + 2` fragments and multiplies each body's mass by 0.9 | `js/engine/collisions.js` `handle_rocky_collisions` | teaching simplification (D-R10-23) | each body loses exactly 10 percent; the fragments carry a fixed fragment mass unrelated to it | Kept as decided in D-R10-23. 15 speed units is 141 km/s at G = 1 and 100 km/s at G = 2 (one unit is 9.42 and 6.66 km/s). |
| Restitution: rocky pairs bounce with e = 0.3; gas giants that may not merge (a pair with a `model_owned` body) bounce with e = 0.8 | `handle_rocky_collisions`, `handle_collisions` | teaching simplification | momentum along the contact normal conserved; kinetic energy lost by `1 - e^2` of the normal part | A bounce stands in for deformation, heating and break-up. |
| Contact distance: the sum of the two model radii | every handler in `collisions.js` | physical approximation | none | The model radius is not the real radius (the size statement on the model page, `#sizes`); contact happens where those circles touch. |
| Star and star, star and hole, hole and remnant merge; gas giants merge; a star absorbs a planet, gas giant, asteroid or comet; a gas giant accretes a smaller body | `handle_star_merging`, `handle_gas_giant_merging`, `handle_star_object_collisions`, `handle_gas_giant_accretion` | physical approximation | mass and momentum of the pair conserved to 1e-12 (relative) | One body with the summed mass at the momentum-weighted state. Two holes are not merged on contact; they decay by the rule of D-R10-13. |
| Debris directions, speeds and offsets come from unseeded `Math.random` | `step.js` (tidal debris), `collisions.js` (rocky debris) | recorded, not changed | none | Seeding them moves every collision-heavy golden; a seeded stream is a maintainer decision. |
| A hard three-body pass at a fixed step | the integrator, at the frame's step | numerical defect, **limit written** | R4x: max \|dE/E\| <= 0.02 over every step before any pair is closer than 0.3 of the side, at every rate | See below. |

## The encounter case (R4x)

Three 6,000-unit stars at G = 2 on a triangle of side 86.6, one moved by one
length unit. Before this work, with the scenario's own Symplectic Euler and no
extra substeps:

| Rate | 120 | 60 | 30 | clamp |
|---|---:|---:|---:|---:|
| max \|dE/E\| before the pass | 0.0467 | 0.0773 | 0.1675 | 0.2572 |

The candidate fix is a pair-timescale substep trigger: split the frame into
`n = ceil(dt / (eta * t_pair))` pieces (at most 64) for the closest pair that
pulls both ways, `t_pair = max(r, rmin)^1.5 / sqrt(G (mi + mj))`. eta was to be
the largest of 0.1, 0.05, 0.025 and 0.0125 at which R4x meets its bound at all
four rates, chosen in the runner before any engine edit. Measured with the
trigger wired into the runner's driver only:

| eta | 120 | 60 | 30 | clamp | all four <= 0.02 |
|---|---:|---:|---:|---:|---|
| 0.1 | 0.0467 | 0.0773 | 0.1106 | 0.1319 | no |
| 0.05 | 0.0467 | 0.0563 | 0.0712 | 0.0763 | no |
| 0.025 | 0.0314 | 0.0365 | 0.0399 | 0.0444 | no |
| 0.0125 | 0.0188 | 0.0205 | 0.0224 | 0.0233 | no |

No candidate meets the bound at all four rates, so the trigger is not kept
and no engine code changes for this rule. The limit: a fixed-step
first-order scheme loses 2 to 26 percent of a hard three-body pass's energy
before the bodies are within 0.3 of their starting separation, depending on
the frame rate; even a step of one eightieth of the pair's own timescale
leaves 2.05 to 2.33 percent at 60, 30 frames a second and the clamp. This
is written on the model page and in 445's `limit` field for the four R4x
rows.
