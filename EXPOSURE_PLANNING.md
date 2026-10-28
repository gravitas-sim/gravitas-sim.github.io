# Exposure planning: the CCD-equation kernel, the planner and the lesson

Roadmap III, Prompt 210 (tranche T3, D-R10-207-01). Branch `feat/exposure-planning`. The kernel is
`js/kernels/detector/snr.js` (extended, not replaced); the facility adapter is `js/instruments/exposure.js`; the instrument is the
`exposure-planner` panel in the detector family; the lesson is the existing "Signal, Noise and Exposure" with a new set of
advanced steps, and a new majors investigation "Plan an exposure". The validation contract below was committed (with
`tests/fixtures/exposure/thresholds.json`) before any extension, adapter, oracle, panel or lesson change existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `snr.js`: `noiseTerms`, `exposureForSnr`, `snrAt`, `dominantTerm`, `collectingArea`, `snrByRadius`; `bands.js`: the photon rate from a band; the three-depth lesson and its `ccd-snr` instrument | several exposures (the read noise paid per exposure); point-spread-function photometry; extended sources; the limiting magnitude of an exposure; a refusal when the limit or the full well forbids; extinction by airmass; a facility adapter over Prompt 209's table; the planner panel; a rendered frame of the plan | the planner panel, the new investigation, Prompt 215 (survey design) | the `ccd-snr` instrument's 60-step bisection for the faintest star is replaced by the kernel's closed form (check A10); no second calculator |

## The quantities, kept apart

* **A plan is a prediction under stated assumptions**, never a guarantee: the CCD equation has no flat-field error, no
  sky-subtraction systematics, no crowding and no scintillation. A plan whose SNR is above 100 carries the warning
  `beyond-flat-field-accuracy`; 100 is a stated teaching value (flat fielding to about one percent), not a measured one.
* **A limiting magnitude belongs to an exposure**, a band, a sky and a seeing, never to a telescope.
* **The zero point is a supplied number.** The instrument library states no throughput or zero point for any facility, and
  states a dark current for only some. The adapter takes them from the caller (a zero point, or a throughput with a
  radiation-kernel passband) and records each as *supplied*; it never fills one in (D5).
* **Aperture photometry and optimal photometry are two modes**: a circular aperture of radius r holds the fraction
  `1 - exp(-r^2 / 2 sigma^2)` of a Gaussian's light in `pi r^2` pixels; optimal (point-spread-function) photometry holds all
  of it with a noise-equivalent area `4 pi sigma^2`. The published LSST depths are for the second; the rendered frames are
  measured with the first.

## Validation contract (committed first)

Seeds: oracle 210; harness 2100001; ensemble prefix `exposure-210`. Bounds are in `tests/fixtures/exposure/thresholds.json`;
this table is its summary and the file wins.

| Id | Leg | What is held |
|---|---|---|
| A1 to A10 | (a) analytic | the three limits; a hand-worked example; the exposure and limiting-magnitude inverses over 200 random sets; several exposures; scaling with time; extended sources; extinction and airmass; the noise-equivalent area; the lesson's arithmetic unchanged |
| B1 | (b) implementation oracle | a second implementation (Python, scipy) of the fitted zero points and the predictions, to 1e-6 |
| B2 to B5 | (b) published oracle | Ivezic et al. 2019 (arXiv:0805.2366v5) Table 2 and equations 6 and 7: with each band's zero point fitted to the published m5, the kernel's predicted read-noise loss (0.03 mag), exposure doubling, off-fiducial depths (0.05 mag) and loss at airmass 1.2 (0.03 mag) |
| B6 | (b) plausibility | the fitted zero points imply a system throughput between 0.15 and 0.95 |
| B7 | (b) adapter | the adapter returns exactly the library's stated values, and marks what the caller supplied |
| C1 | (c) coverage | four scenarios of 400 clean rendered frames: coverage of the 1.96 sigma interval in [0.92, 0.98], standard deviation in [0.88, 1.12], mean at most 0.2 |
| C2 | (c) detection | the limiting magnitude against Prompt 183's detection on 200 frames: the detected fraction within 0.12 of the predicted probability |
| D1 to D6 | (d) negative and misspecified | not reachable in the exposure limit; no signal; below the horizon; saturation; adapter refusals; the flat-field floor |
| E1 | (e) authentic data | NOT MEASURED (below) |
| P1 | speed | 1000 plans in at most 400 ms |

A crossed bound is a failed leg, left failing in `tests/fixtures/exposure/failed-legs.json` and labelled; only Carl resets one.

The roadmap asks for a pinned result from "a cited public exposure-time calculator for one facility". The oracle used is the
facility's own published depth model and its table of parameters (Ivezic et al. 2019, which is also the library's source for
the Rubin site values); no interactive calculator's output is pinned, and none was downloaded. That leg is a request, not a
result.

### Authentic-data request (not measured)

The applicability leg needs one real calibrated exposure of a star of known magnitude with its exposure time, filter, airmass,
sky level and read noise recorded. Nothing was downloaded and nothing is typed from memory. The decision is Carl's (the
product, its version, its terms and the rights basis).
