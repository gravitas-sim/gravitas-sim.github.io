# Occurrence rates on a searched population (Prompt 229)

An occurrence rate answers "how many planets of this size and period does a star have?" from the planets a survey
found. It is defined on a **searched population**: the targets the survey looked at, each with its own noise and its
own span, and the share of planets of each kind the search would have found. A count of what was found is not a rate.
The code is `js/kernels/occurrence/` (survey, injection and recovery, completeness and rates, a population whose rates
are known); it is built on the statistics kernel of Prompt 154 (`js/kernels/statistics/`: the selection function as an
object and the Poisson interval) and the transit model of the inference core (`js/inference/transit.js`). The panels
are `js/occurrenceWidgets.js` over `js/occurrenceField.js`; the lessons are in `js/data/investigations/occurrence-sequence.js`.

The survey, the planets and the detections here are **synthetic and labelled so**. Nothing in this document is a
statement about a real survey, and no published rate is used or shipped.

## Definitions

| Quantity | Definition |
| --- | --- |
| Target | a star with radius and mass in solar units, noise (the relative scatter of one 30-minute cadence), and the span of its continuous series |
| Bin | a period octave from 1 to 256 d (8 bins) and a radius octave from 0.5 to 16 Earth radii (5 bins) |
| Geometric probability | `R*/a` for a circular orbit, `a` from Kepler's third law (a transit is an impact parameter `b = a cos i / R*` below one) |
| Epochs | the transits whose mid-time falls in the span: `ceil((span - t0)/P)` for `t0` uniform on `[0, P)` |
| Injected transit | the exposure-integrated, quadratic-limb-darkened deficit of the transit model, at the cadence's own times, at every epoch |
| Recovery | the matched filter at the injected ephemeris: `S = S_true + noise`, `S_true = sqrt(sum s_t^2) / sigma`; recovered when `S` reaches the threshold (7.1) and the target holds at least 3 epochs |
| Analytic form | for white noise the efficiency is `Phi(S_true - threshold)` |
| Completeness `c` | the mean over the bin's draws of `p_geo(P) * recovered`: the expected number of planets of unit rate that the survey lists from one target |
| `E` | the sum of `c` over the targets: how many planets the survey lists for every planet per star in the bin |
| Rate `Gamma` | the expected number of planets per star in the bin (it may exceed one) |
| Reliability `r` | the probability that a listing is a planet: a stated input per bin, never computed |
| Likelihood | the listings `n` of a bin are Poisson with mean `Gamma E / r`, so `Gamma_hat = n r / E` |
| Interval | Prompt 154's `poissonInterval` (Garwood below 100 listings, the deviance interval from there) on `n` with exposure `E / r` |
| No listing | `n = 0` gives no rate, only the one-sided limit `-ln(1 - 0.95) / E` at 95 percent |
| Floor | a bin with `E < 5` is **not constrained**: no rate, no limit |

The selection function of the population (`js/kernels/occurrence/population.js`) is composed from the objects of Prompt
154: the transit as a probability on `R*/a`, then a cut on the epochs, then the recovery as `Phi(S - threshold)`.

## Stated simplifications (all make completeness optimistic or the interval narrow)

- The ephemeris is known: there is no period search, so no look-elsewhere effect and no false-alarm calibration.
- The baseline is perfect; the noise is white unless a correlation is stated (an AR(1) series, whose statistic widens by a closed form, `redFactor`).
- At most 24 epochs are integrated and their sum scaled by `N / used`; white noise sums to `N(0, 1)` exactly, so one draw replaces the points (validated against a draw at every point, leg A5).
- Orbits are circular and the radius and period are log-uniform inside a bin; the planet's radius is not added to `R*` in the geometry.
- The interval carries the counting error of the listings only. The reliability is taken as exact; the completeness has a Monte Carlo error of its own (a few percent here).
- No smoothing of the grid is offered. Any smoothing would be a regularisation, and a regularised grid is not a posterior.

## Validation contract

`tests/fixtures/occurrence/thresholds.json` fixed every bound before any occurrence code existed (legs A1 to A8, B1 to
B4, C1 to C4, D1 to D4, R1, E1) and the verdict rule: **A** rates with intervals in every bin that is not under the floor;
**B** rates only in bins with at least 10 listings, the rest as limits; **C** completeness maps only. The independent
oracle is `tools/occurrence-oracle/oracle.py` (numpy, scipy and batman 2.5.1, no Gravitas code): its own stars, its
own batman light curves, its own quadrature of the completeness, its own planets and detections, its own Garwood and
deviance intervals; its results are pinned in `oracle-results.json` before any row was judged. The harness is
`npm run occurrence:validate`; the pinned table is `tests/fixtures/occurrence/results.json`, the legs that crossed a
bound are in `failed-legs.json` and stay failing. Leg E1 (an authentic survey) is NOT RUN: none was supplied.
