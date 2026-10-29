# Detector effects II

Roadmap III, Prompt 211 (tranche T3, D-R10-207-01). Branch `feat/detector-effects-ii`. The kernel is `js/kernels/detector/effects.js`
with the frame model's new optional `effects` field (`js/kernels/detector/frame.js`); the investigation is "The Saturated Star"; the
instrument is the `detector-effects` panel in its own lazy family. The validation contract below was committed (with
`tests/fixtures/detector-effects/thresholds.json`) before any kernel, oracle, panel or lesson existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/kernels/detector/frame.js` clips the electrons at the full well, draws cosmic rays as a core pixel and sometimes a neighbour, and says in a comment that there is no blooming and no nonlinearity | a stated nonlinearity near the full well; cosmic rays as tracks; charge bleeding along columns; the sampling of the profile against the pixel; a flag for each in the frame's truth and in the image sidecar | the panel, 180's refusals, 212's calibration | none: the legacy path stays the default, bit for bit |
| `js/measure/photometry.js` and `detect.js` (Prompts 180, 183) refuse a pixel at or above the contract's limit (`saturated`) and a masked pixel (`masked`) | nothing: they are the measuring instruments, unchanged; this prompt gives them frames and sidecars with something to refuse | the panel and D1 | none |
| `js/kernels/detector/reduce.js` `maskCosmicRays` | nothing: it is the internal reference of check B1 | B1 | none |

`frame.js` gains one optional field, `spec.effects`. With it absent the frame is the version before this prompt, bit for bit (check
F1); with an empty object it is too.

## Equations, limits, assumptions

Order in a frame with effects: electrons = Poisson(flat x light + dark x t) plus cosmic-ray deposits; collected charge = the
electrons at the full well, or, with bleeding, the electrons with the excess of every saturated run spilled along its column;
recorded charge = the nonlinearity's response of the collected charge; plus read noise; counts = bias + recorded / gain, rounded
and clipped to the converter's range.

* **Saturation (present before, now flagged).** A pixel holds at most `fullWell` electrons. The flag bit 1 is set where the
  charge before the clip is at or above the full well. The converter clips at `adcMax` counts independently.
* **Nonlinearity (stated curve).** With `k = kneeFraction x fullWell` and `w = fullWell - k`: `f(e) = e` for `e <= k` and
  `f(e) = k + w tanh((e - k)/w)` above. It is continuous with a continuous slope at the knee, monotonic, and reaches
  `k + w tanh(1)` at the full well (0.952 of it for a knee of 0.8). It is a model choice: a real detector's curve is
  measured, not this one. The **linear limit** is the charge at which `1 - f(e)/e` reaches a stated fraction (1 percent is the
  safe limit the sidecar carries). Flag bit 8 is set where the collected charge exceeds it.
* **Cosmic rays (track model).** A Poisson number of events per frame (rate x exposure). Each is a straight track: an entry
  point uniform on the frame, a uniform azimuth, and a zenith angle with `cos(theta) = sqrt(1 - u)` (a cosine-weighted
  incidence on a flat detector). The path through a layer of `thicknessPx` pixels is `thicknessPx / cos(theta)` long and its
  projection on the frame `L = thicknessPx tan(theta)` (capped). The deposit is `dedx x thickness / cos(theta)` electrons in
  total, spread over the pixels in proportion to the projected length in each. Assumed values (a minimum-ionising particle in
  silicon gives about 80 pairs per micron, 1200 per 15 micron pixel of path; a layer one pixel thick) are labelled assumed.
  No energy-loss spread. Flag bit 4.
* **Charge bleeding (bounded).** Per column and per run of pixels above the full well, the run's excess is split between the
  pixel above and the pixel below; each side fills consecutive pixels up to the full well (a full pixel passes the charge on and
  counts toward the length) and the rest is lost at the length cap or the frame edge. Charge is conserved to rounding, with the
  lost electrons recorded. Only along columns (the direction of the parallel transfer). Flag bit 2.
* **Sampling.** The profile is already integrated over each square pixel, so nothing is added to the pixels; the effect is a
  regime flag (`under` below 2 pixels of FWHM, `over` from 4) and two measures of what the phase of the star in its pixel does:
  the largest over the smallest peak-pixel fraction, and the relative scatter of a proportional whole-pixel aperture's flux. An
  undersampled star's peak pixel can vary by more than a factor of 1.5 with where the star sits in it, so whether it saturates
  depends on the phase as well as the brightness.

Assumptions stated where a student can look for them: a Gaussian profile; a box pixel response; no charge diffusion; no
charge-transfer loss; the same full well for every pixel; bleeding only along columns; cosmic rays that do not saturate their
own pixels more than the full well clips them.

## Validation contract (committed first)

Seeds: oracle 211; harness 2110001; ensemble prefix `detector-effects-211`. Bounds are in
`tests/fixtures/detector-effects/thresholds.json`; this table is its summary and the file wins.

| Id | Leg | What is held |
|---|---|---|
| A1, A2 | (a) analytic | the response curve against the oracle to 1e-12, its continuity and slope at the knee, monotonicity, the inverse; the 0.1, 1 and 5 percent linear limits against scipy's brentq |
| A3, A4 | (a) frame | uniform frames at 0.5 to 1.3 of the full well against the exact Poisson expectation (scipy.stats), with and without the nonlinearity; the converter's clip |
| A5 to A7 | (a) cosmic rays | twelve pinned tracks against an independent slab-clipping deposit to 1e-9; the event count and its dispersion; the median deposit and length and the uniform azimuth |
| A8 to A10 | (a) bleeding | charge conservation; the trail length ceil(E / 2 / headroom) exactly and the cap with its lost charge; the rendered trail |
| A11, A12 | (a) sampling | peak-pixel fractions and proportional-aperture scatter against scipy to 2e-6; the stated trend; the regime cutoffs |
| A13 | (a) flags | the flag plane against the stated rules, pixel by pixel |
| B1 to B3 | (b) cosmic-ray masks | reduce.js's mask pinned as the internal reference; an own implementation of van Dokkum's L.A.Cosmic as the independent detector; their agreement |
| C1 | (c) coverage | not applicable, stated |
| D1, D2 | (d) refusals | 180 refuses a saturated star and a bleeding one, measures a clean one, and does not refuse a trail it was not told about (the unflagged control); the sidecar validates |
| F1 | frame | no effects, or an empty object, is the frame before this prompt; effects draw from their own streams |
| P1 | speed | a 128 by 128 frame with every effect on renders in 500 ms |
| E1.authentic | (e) authentic data | NOT MEASURED (below) |

A crossed bound is a failed leg, left failing in `tests/fixtures/detector-effects/failed-legs.json` and labelled; only Carl resets
one.

### Authentic-data request (not measured)

The applicability leg needs one real frame of a saturated star (the plateau, the bleed trail and the cosmic-ray pixels), or a
published photon-transfer curve showing a full well and a nonlinearity, under a fixed analysis contract whose published values
were not used to tune the model. Nothing was downloaded and nothing is typed from memory. The decision is Carl's (the product, its
version, its terms and the rights basis). The cosmic-ray oracle is an own implementation of L.A.Cosmic; running the astroscrappy
package on the pinned frame would be a stronger one, and installing it is a download Carl would approve.

## Reproduce

`npm run detector-effects:validate` prints the table (`-- --json` for JSON). The oracle is
`tools/detector-effects-oracle/oracle.py` (numpy 1.26, scipy 1.13; no Gravitas code except the pinned frame it reads);
its results are pinned in `tests/fixtures/detector-effects/oracle-results.json`.
