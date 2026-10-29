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

## Equations, limits, assumptions

1. **The CCD equation** (Merline and Howell 1995; Howell, Handbook of CCD Astronomy, Sec. 4.4), for `n` pixels in the aperture,
   `n_b` pixels in the sky estimate, `N` exposures: `noise^2 = S + n (1 + n / n_b) (B + D + N R^2)`, `SNR = S / noise`; `S` the
   star's electrons in the aperture, `B` and `D` the sky and dark electrons per pixel over the whole exposure, `R` the read noise.
   The read variance is paid once per exposure; the other terms grow with the total time.
2. **The exposure for a target**: with `S = r t`, `B = b t`, `D = d t`, a quadratic in `t`:
   `t = (q + sqrt(q^2 + 4 a c)) / (2 a)`, `a = r^2 / SNR^2`, `q = r + n k (b + d)`, `c = n k N R^2`, `k = 1 + n / n_b`.
3. **The limiting magnitude of an exposure** (`limitingRate`, `limitingMagnitude`): the positive root of
   `S^2 - SNR^2 S - SNR^2 V0 = 0`, `V0` the variance without the star, divided by `t` and the enclosed fraction, then
   `m = -2.5 log10(rate / zero point) - k_ext (X - 1)`.
4. **The star's pixels**: a Gaussian of FWHM `f` pixels (`sigma = f / 2.3548`): a circular aperture of radius `r` holds
   `1 - exp(-r^2 / 2 sigma^2)` of the light in `pi r^2` pixels; optimal photometry holds all of it with a noise-equivalent
   area `4 pi sigma^2`. The brightest pixel holds the pixel-integrated Gaussian at the centre. An extended source is a surface
   brightness `mu` over an area `A`: its total magnitude is `mu - 2.5 log10 A`.
5. **The zero point** is electrons per second from a magnitude-0 object at the **zenith** (X = 1), as the Rubin depth model
   defines its constants; the sky is a stated surface brightness read through the same zero point, the extinction is
   `k (X - 1)` magnitudes and the seeing scales as `X^0.6` (Kolmogorov, a stated model).
6. **The plan** (`planExposure`): solves 2, then checks the exposure limit (`not-reachable`, reason `exposure-limit`, with the
   SNR the limit reaches), the brightest pixel against the full well and the per-exposure limit (`saturated`, `frame-limit`,
   with the largest exposure and the plan with enough exposures), and returns the noise budget, the dominant term, the limiting
   magnitude, the warnings and the assumptions. A refusal has a reason code and no time.

Assumptions: no flat-field or sky-subtraction error, no crowding or confusion noise, no scintillation, a Gaussian
point-spread function, the sky and seeing as given (no moon model), no binning or nonlinearity. **Physical domain**: a
signal-to-noise above 100 warns (a stated teaching floor for flat fielding of about one percent); an airmass above 5 warns;
an airmass at or below the horizon is refused.

## The facility adapter, and what the library does not state

`js/instruments/exposure.js` (`exposureSetupOf`, `planFor`, `areaOf`) reads a facility's imager from the cited table
(`js/data/instruments.js`): the pixel scale (converted from arcmin where the table states it so), the read noise (the middle of
a stated range unless the caller asks for the low or high end), the dark current, the full well, the site seeing, the sky
brightness and the extinction per stated band. The library states **no throughput or zero point for any facility**, a dark
current for only some, and an extinction only for Rubin: each is the caller's, recorded as `supplied` in the result, and
asking for a plan without one raises an `InstrumentTableError` naming the facility and the field (D5). The panel supplies a
peak throughput of 0.5 through the radiation kernel's passband for the zero point (V for Las Cumbres in the Vega system, SDSS
g, r and i for Rubin in AB: the stand-in passbands differ from the real filters'), a dark current of 0.01 electron a second a
pixel where the library has none (0.002 for the Sinistro, which states it) and an extinction of 0.2 mag per airmass in V for
the Las Cumbres telescopes; all are teaching values and the panel lists them apart from the library's. `js/instruments/
exposureSky.js` makes a zero point from a throughput and a passband and the airmass from an altitude (Kasten and Young, the
sky kernel); the adapter itself reaches neither kernel.

## The panel, the frame and the record

`js/exposureWidgets.js` is a lazy widget family (`exposure-planner`): facility and band, a star or an extended patch, the
brightness, the aperture or the patch radius, the number of exposures, the target SNR, the airmass and a brighter sky. Its
readout is the table alternative to the picture: the result, the total exposure and its split, the SNR reached, the dominant
term, the four noise terms with their shares, the faintest object reached, the brightest pixel against the full well, the
pixels and enclosed light, the prediction for the frame's own aperture beside the measurement on the frame, the values the
library supplied, the values Gravitas supplied, the warnings and what the calculation leaves out. The picture is the frame
(`js/exposureField.js`: the detector kernel's forward model of exactly the plan, several exposures as one stacked frame with the
read noise of `N` reads and the full well `N` times larger) and a stacked bar of the noise budget. Every frame is synthetic.

## What the first run found

The validator's first run against the committed bounds (the oracle and the kernel existed; the bounds did not move):

* Four rows failed on the harness, not the kernel, and were fixed without moving a bound: the detection probability used a
  wrong normal CDF (C2); the magnitude steps of the same leg were signed the wrong way round; D1's reachable control kept a
  full well that the sky alone fills in an hour (the planner refused it as `saturated`, correctly: the leg now holds the
  exposure limit apart from the well); D4's bright star needed a target SNR of 1000 to saturate a 50,000 electron well (the
  peak pixel of a Gaussian holds about 11 percent of its light, and the SNR fixes the electrons); the adapter threw on TESS's
  pixel scale in arcmin (it now converts by the registry's factors).
* **Three legs crossed their committed bounds and stay failing** (`tests/fixtures/exposure/failed-legs.json`), all against the
  published Rubin model, not against the independent implementation (B1 passes to 1e-13):
  B2, the read-noise loss: the CCD equation with the table's inputs loses 0.83 mag in u and 0.23 in g where the paper states
  0.62 and 0.18 (r, i, z and y agree to 0.017 or better); B3, the longer exposure: the same cause (u and g, and u at every
  tau); B4, equation 6 away from the fiducial sky and exposure: the equation holds `C_m` fixed while the read-noise share
  changes, so a sky one magnitude brighter or fainter disagrees by up to 0.44 mag in u and 0.07 to 0.24 in g, r and i. What the
  paper's detailed throughput and noise model carries that the stated inputs do not is not known; the roadmap's literal
  "cited public exposure-time calculator" leg was not run.

## Validation results (measured, `npm run exposure:validate`)

| Id | Result | Measured |
|---|---|---|
| A1 to A10 | pass | the three limits to 5e-7; the hand-worked example exactly; the inverses to 8e-15 over 200 sets; extended sources, extinction and noise-equivalent area to 1e-12 or better; the lesson's arithmetic to 7e-15 over 60 points |
| B1 | pass | the independent Python implementation agrees on every zero point to 4.5e-14 (relative) and every depth to 3.6e-14 mag |
| B2 | **fail** | read-noise loss in u, g, r, i, z, y: kernel 0.825, 0.230, 0.117, 0.082, 0.054, 0.048 mag against the paper's 0.62, 0.18, 0.10, 0.07, 0.05, 0.04 (bound 0.03: u and g fail) |
| B3 | **fail** | exposure doubling: u differs by 0.047, 0.109 and 0.177 mag at 2, 4 and 10 times; g by 0.029, 0.045 and 0.059; the other bands by 0.026 or less |
| B4 | **fail** | off-fiducial depths: 14 of the band and condition cases cross 0.05 mag (u, g, r, i and the brighter sky in z and y) |
| B5 | pass | the loss at airmass 1.2 within 0.012 mag in every band (bound 0.03) |
| B6 | pass | implied system throughput 0.19 (u), 0.45 (g), 0.51 (r), 0.50 (i), 0.39 (z) on 33.2 m^2 |
| B7 | pass | the adapter returns exactly the library's stated values |
| C1 | pass | coverage of the 1.96 sigma interval 0.95 in each of four scenarios (standard deviation 0.98 to 1.01, mean at most 0.07) on 1600 rendered frames |
| C2 | pass | the limiting magnitude detects 0.60 of 200 frames against a predicted 0.55; one magnitude brighter 1.00; one fainter about 0.01 |
| D1 to D6 | pass | refusals for an unreachable target (reached signal-to-noise 0.51 of 5.6 million needed), no signal, below the horizon, saturation (three exposures of 21 s suggested), the adapter's gaps, and the flat-field floor |
| E1 | NOT RUN | needs one real calibrated exposure; a request, not a result |
| P1 | pass | 1000 plans in 6.3 ms (bound 400 ms) |

## Reproduce

`npm run exposure:validate` prints the table (exit 0 when only the recorded failed legs fail); with `--write-failed` it rewrites
`tests/fixtures/exposure/failed-legs.json`. `tools/exposure-oracle/oracle.py` (Python, numpy and scipy, no Gravitas code)
produces `tests/fixtures/exposure/oracle-results.json`. `tests/exposurePlanning.test.js` and `tests/exposureLessons.test.js`
hold the contract, the failed legs and every number the lessons state.

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
