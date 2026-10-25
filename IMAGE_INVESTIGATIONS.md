# Image investigations

Prompt 191 (Roadmap III, tranche T1B). Three investigations that put the Observatory's image
measuring tools into a lesson: marks and a scale on a real spacecraft picture, a parallax from
positions over time, and an orbit from positions over time. One instrument family, `js/imagingWidgets.js`
(ids `moon-marks`, `star-parallax`, `binary-orbit`), which calls the Observatory's own modules for
every number (`js/measure/marks.js`, `scale.js`, `astrometric-series.js`, `orbit-fit.js`) and
computes none of its own. The register row is D-R10-72 (`DECISION_REGISTER.md`).

| Investigation | Level | Steps (core, deeper) | Claim it teaches |
| --- | --- | --- | --- |
| Measuring the Moon (`measuring-the-moon`) | survey | 8 core, 4 deeper | A length in a picture is a pixel count times a scale, and the scale comes from a reference length the reader supplies; the pair, not the circle, sets it, and a pixel is 7 km. |
| How Far Is That Star? (`how-far-is-that-star`) | majors | 10, 6 | A shift is not a distance; a straight line fitted to a star with a parallax is rejected; the parallax fitted with the motion gives 60.3 plus or minus 1.5 mas and so 16.6 pc, a relative parallax, and too few epochs are refused. |
| A Binary Star's Orbit (`a-binary-stars-orbit`) | majors | 9, 5 | An ellipse on the sky is not an eccentric orbit; an elliptical fit gives P 14.13 yr, a 0.908 arcsec, e 0.443; a circular model is refused as inconsistent; the mass sum is a^3 over P^2 with a in au, so it goes as the cube of the distance. |

## The cohesion check (the roadmap's gate before authoring)

The set was checked against the shipped Observatory before any lesson was written, and the sequence
position was fixed by it: the three follow What Is a Measurement? and What Does ± Claim? in the
Observing-and-measuring sequence, after A Variable Star From Frames, and are prerequisites of one
another in that order (the sequence `needs` in `sequences.js` and the lesson `prerequisites` agree;
a test holds them to it). Each reuses an Observatory module whose behaviour is already tested and
adds no statistics of its own. Where the prompt named an investigation the repository cannot back,
it was not built (below).

## What is real and what is synthetic

- **Measuring the Moon**: the picture is real (the Galileo spacecraft, 7 December 1992; the pack
  `galileo-moon-19921207`, `IMAGE_PACKS.md`). It is display-only: a gray level in an enhanced picture
  is not light, and the lesson says so. The reference pair is the full width of the disc (row 245,
  columns 3 to 496), taken to span 3,474.8 km, the Moon's mean diameter: the one number from outside
  the picture, stated as such. The feature is an unnamed dark plain, not a named crater (a crater of
  20 km is three pixels).
- **How Far Is That Star?**: the star is synthetic. Fourteen epochs 53.8 days apart from JD
  2461045.5 were generated with the exact geometry of the project's own ephemeris
  (`sky/ephemeris.json`) at a true parallax of 60 mas, with errors of 4 mas; the fit uses the
  linear model, so a bias is possible and is the lesson's own caution. The zero-point correction of the
  advanced depth is "a value the lesson states", not a measurement of any frame.
- **A Binary Star's Orbit**: the table is the one the Observatory's orbit panel loads with its
  example button (12 epochs, 15 mas). The parallax is relative, 100 plus or minus 4 mas, which the tool
  says beside the mass.

`tests/imageInvestigations.test.js` recomputes every number a step states from the same functions
the instruments draw, checks every validator against the instrument's reading and a wrong value, and
checks the shared files, the re-exports and the two languages' instrument words.

## Acceptance sheet

| Investigation | Central experiment (`docs/lesson-acceptance.json`) | Control | Quantity read | Loop |
| --- | --- | --- | --- | --- |
| Measuring the Moon | `ce.measuring-the-moon`, `panel:moon-marks` | `moon-marks/r` | Diameter of the circle in kilometers: 282 at a radius of 20 px, 634 at 45 | predict-the-plain, measure-the-plain |
| How Far Is That Star? | `ce.how-far-is-that-star`, `panel:star-parallax` | `star-parallax/fit` | Chi-square of the fit: 1575.9 for a straight line, 13.2 with the parallax | predict-a-straight-line, a-straight-line-fails |
| A Binary Star's Orbit | `ce.a-binary-stars-orbit`, `panel:binary-orbit` | `binary-orbit/plx` | Mass sum: 3.76 at 100 mas, 7.33 at 80 | predict-the-shape, the-mass-sum |

Each is driven in `e2e/centralExperiments.spec.js` (prediction committed and held, control moved,
reading compared, verdict revealed afterwards). The binary lesson's prediction (what shape a tilted
circle makes on the sky) is settled two steps later by the circular-model refusal, not by the parallax
control that the central experiment moves; the control is the lesson's quantitative result, and the
mismatch is recorded here so no one reads the prediction and the experiment as one loop.

## Evidence status

Four facts are kept apart (the roadmap's rule, `docs/evidence-status.md`):

| Fact | Status | Basis |
| --- | --- | --- |
| Software works (S) | established for the instruments | The numbers test, the label golden, the lesson golden, the accessibility and central-experiment specs. |
| Science valid (V-internal) | established | Recomputed from the Observatory's tested modules on seeded or fixed inputs; the synthetic truth is recovered within stated intervals. |
| Science valid (V-external) | UNKNOWN | No external reviewer has read the lessons. |
| Adopted (A) | UNKNOWN | No named adopter. |
| Learning measured (L) | UNKNOWN | No study has been run; nothing here claims the lessons teach. |

## Data budget ledger

Nothing was added to the precached idle tier, and `tools/data-budget.json` is untouched. The shared
lesson files, the per-id re-exports, `js/imagingWidgets.js` and `js/i18n/{en,es}.imaging.js` are
`NEVER_PRECACHED` (`tools/build-service-worker.mjs`, D-R10-72): the three lessons and the instrument
work offline only after one online use, and the picture of the Moon (a 328 KB sidecar fetched on the
lesson) is online-first like every pack. The first-visit tier carries the three thumbnails and
the three catalogue entries.

## Not shipped

"What is in this field?" was in the prompt's list and is not built. The repository holds no
quantitative frame that a lesson could ask a reader to measure honestly: building one would mean a
synthetic-field generator, an instrument outside this prompt's scope. It is recorded as not built, not
as simulated. No authentic data was fetched for this prompt.

## Limits and deviations

- The Spanish is unread by a fluent reader. Computed strings (the measure steps' validate messages
  and the readout values) are English and are never translated by content.
- The closure of the instructor bundle stays at 273 files: the three lessons live in the four shared
  files of D-R10-67 (`measurement-sequence.js`, appended to), and twelve one-line re-exports give the
  per-id paths outside the closure. The queue rebuilds the instructor bundle; this prompt did not touch
  `instructors/materials.enc.json` or `materials.manifest.json`.
- Expectations keyed to deeper steps are not allowed by the instructor record (it keys core sids), so
  the deeper steps carry their expected values in the lesson's own `because` and `worked` fields.
- The binary lesson's circle and ellipse choice is limited by what `fitOrbit` refuses; the node
  note ("the node is ambiguous without a radial velocity") is a statement, not a measurement.
