# Binary masses and radii: the double-lined orbit and the joint eclipse solution

Roadmap III, Prompt 218, Part A (tranche T3, D-R10-207-01). Branch `feat/binary-masses`. The kernel is `js/inference/binaryMasses.js`; the
models of the inference core are `sb2-orbit` and `eclipsing-sb2` in `js/inference/binaryJoint.js` (registered in `js/inference/models.js`);
the instruments are the `masses-minimum`, `masses-solve` and `masses-diagram` panels (`js/massesWidgets.js` over `js/massesField.js`); the
investigation is "Weighing the Stars, for Real" (`js/data/investigations/binary-masses-sequence.js`). The validation contract below was
committed (with `tests/fixtures/binary-masses/thresholds.json`, the oracle script `tools/binary-masses-oracle/oracle.py` and its pinned
results) before the kernel, the models, the validator, the panels or any lesson existed. **Part B, the visual-binary gate, is a separate
part and is not started.**

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/inference/rv.js` (one star's radial-velocity curve, the Keplerian orbit and its mass function) and `js/inference/binaryModel.js` (the eclipse light curve of Prompt 217) | the second star's curve on the same orbit, the mass ratio, the minimum masses, the joint fit with the eclipse (absolute masses and radii with the covariance of the whole fit) | `sb2-orbit` and `eclipsing-sb2` in the inference core, the three panels, the lesson | the radial-velocity curve is `rv.js`'s (imported, not copied); the eclipse model is `binaryModel.js`'s |
| `js/inference/fit.js` (the multi-start fit, the rank analysis, the covariance), `infer.js` | a model whose data are of two kinds (flux rows and radial-velocity rows with a group each), derived quantities carried through the covariance, a model-specific statement of what is fixed | optional hooks `model.prepare`, a fourth `data` argument to `predict`, `solveLinear` by group, `model.derived` with delta-method uncertainties, `model.identify` for flags | none: they add to the result and leave single-group models unchanged |
| `js/stellar/tracks.js` (`mainSequenceAt`, MIST) | placing a measured mass and radius on a model | the diagram panel and the lesson | n/a |

## Equations, limits, assumptions

1. **Conventions.** Star 1 is the star eclipsed at the primary eclipse (BINARIES.md). `w` is the argument of periastron of the orbit of star 2
   relative to star 1 (Winn 2010); the primary star's own is `w + 180 degrees`. Velocities: `v1 = gamma + K1 [cos(f + w) + e cos w]`,
   `v2 = gamma - K2 [cos(f + w) + e cos w]`, so star 1 recedes before the primary eclipse and approaches after it.
2. **The chain.** `a sin i = (K1 + K2) P sqrt(1 - e^2)/(2 pi)`; `(M1 + M2) sin^3 i = 4 pi^2 (a sin i)^3/(GM_sun P^2)` with the **nominal
   solar GM** (IAU 2015 B3: 1.3271244e20 m^3 s^-2), so no value of G enters a mass; `M2/M1 = K1/K2`. The same sums with the inclination of the
   eclipse solution give `M1`, `M2`, `a = a sin i/sin i`, and with `rsum = (R1 + R2)/a` and `k = R2/R1` from the light curve, `R1 = a rsum/(1 + k)`
   and `R2 = k R1`. `log g = log10(GM_sun M/R^2)` in cgs (the Sun: 4.438).
3. **Minimum masses.** Radial velocities alone fix `M sin^3 i`, never `M`. The panel, the model and the lesson label every mass from
   velocities **minimum**, and the not-claimed list of the model says so. A mass is returned only by the joint model, whose inclination is
   from the eclipses; **a system that does not eclipse is refused by the joint model** (the message names the missing eclipse) and is given only
   minimum masses by `sb2-orbit`.
4. **Single-lined systems.** One curve gives the mass function `f = P K^3 (1 - e^2)^(3/2)/(2 pi G) = M2^3 sin^3 i/(M1 + M2)^2` and, for a stated
   primary mass, the companion's minimum mass from `M2^3 = f (M1 + M2)^2`. The primary's mass is an input (a model's), labelled so. **No
   absolute mass of either star is returned from one line.**
5. **Fitting.** One weighted least squares over the flux rows, the first star's velocities and the second's, with the core's multi-start
   Levenberg-Marquardt; the baseline `f0` is the flux rows' own linear parameter and `gamma` the velocity rows'. The period, phase and orbit are
   shared. The uncertainty of every derived quantity is the delta-method propagation through **the covariance of the whole fit** (scaled by
   `sqrt(chi2/dof)` when above 1), so the correlation of the inclination with the radius ratio is in the mass, not assumed away; the result
   gives the share of the variance of `M1` that the inclination carries. A parameter the data leave open is listed with the reason, and
   what is derived from it is marked the same (`identify`).
6. **The diagram.** The mass-radius and mass-luminosity panels place the measured stars on MIST (`mainSequenceAt`). The lesson's systems are
   synthetic: their radii and temperatures are read from MIST at stated fractions of the main-sequence age, the second star's temperature is
   from the surface-brightness ratio by a Planck ratio at 0.8 micrometres, and the first star's is an input (plus or minus 100 K). That
   the stars sit on the track is by construction for those systems; for a real star it would be a result.

Assumptions: a Keplerian orbit of two point masses; the same orbit in the light curve and the velocities; detached stars (the eclipse model
of BINARIES.md); the velocities are measurements taken as given (their zero point, `gamma`, is fitted and an optional offset between the
stars' lines is a parameter), no gravitational redshift, light-travel time, tidal distortion or third body. **Physical domain:** `K` above 0,
`P` above 0, `e` below 0.7, `inc` 45 to 90 degrees for the joint model, the eclipse domain of BINARIES.md. **Not claimed:** an absolute mass
from velocities alone or from one line, a temperature or luminosity as a fit result (inputs, labelled), any property of a star the model
does not have.

## Validation contract (committed first)

Seeds: oracle 218; ensemble prefix `binary-masses-218`. Bounds are in `tests/fixtures/binary-masses/thresholds.json`; this table is its
summary and the file wins. Systems X1 (circular), X2 (eccentric), X3 (star 2 the larger) and the grazing G1 and the ensembles are written
out there so that the oracle and the harness build identical inputs.

| Leg | What it checks | Measured | Bound |
|---|---|---|---|
| A1 | Closed case (two solar masses on a 1 au circular orbit) and the forward-map round trip, X1, X2, X3 | 0; 4e-16 | 1e-12 |
| A2 | Minimum masses equal `M sin^3 i` at 60, 75, 89.2 degrees | 5e-16 | 1e-12 |
| A3 | Mass function against `M2^3 sin^3 i/(M1 + M2)^2`; the companion minimum solves its equation | 8e-16; 4e-16 | 1e-12; 1e-10 |
| A4 | Extrema of the curves and `(v1 - gamma)/(v2 - gamma) = -K1/K2` | 1.2e-8; 2e-16 | 1e-6; 1e-12 |
| A5 | Curves cross gamma at the primary conjunction; star 1 recedes before it | 6e-15 km/s; 5.30 and -5.30 km/s | 1e-9 km/s; sign |
| A6 | log g of the Sun; the scaling with R | 4.43807; 1.1e-16 | 0.001; 1e-12 |
| B1 | Both stars' velocities against a direct two-body integration (scipy DOP853), 400 phases, X1, X2, X3 | 1.7e-9 km/s | 1e-5 km/s |
| B2 | Joint solution against the oracle's own (batman, integrated velocities, scipy least squares), X1, X2: M1, M2, R1, R2, a, K1, K2, inc | at most 0.13 of a sigma; sigma ratio 1.00 to 1.045 | 0.25 sigma; 15 percent |
| B3 | The oracle recovers its truth (a check on the oracle) | at most 1.29 sigma | 3 sigma |
| C1 | Coverage of the 1-sigma interval, velocities only, X2 (120 fits): K1 0.667, K2 0.725, e cos w 0.717, e sin w 0.783, **P 0.792**, q 0.692, a sin i 0.675, M1 sin^3 i 0.683, M2 sin^3 i 0.708 | P just above | 0.57 to 0.79 -- **FAILS** (P by 0.0017) |
| C2 | Coverage, joint model, X1 (100 fits): M1 0.71, M2 0.68, R1 0.73, R2 0.68, a 0.72, inc 0.59, K1 0.66, K2 0.75 | inside | 0.56 to 0.80 |
| C3 | Coverage, joint model, X2 (60 fits): 0.67 to 0.80 | inside | 0.52 to 0.84 |
| C4 | Median bias of M1, M2, R1, R2 over the ensemble in sigma | at most 0.14 of the bound | 3 sigma/sqrt(n) |
| D1 | One line only: no absolute mass, radius or mass of either star; every mass-like quantity labelled minimum or mass function (20 fits) | 20 of 20 | all |
| D2 | A non-eclipsing orbit: velocities-only masses labelled minimum; the joint model refused, naming the eclipse (20 fits) | 20 of 20; 20 of 20 | all |
| D3 | Circular orbit assumed for the eccentric system fails the residual test (20); the right model passes (60) | 1.00; 0.03 | at least 0.95; at most 0.05 |
| D4 | Grazing pair: radius ratio, and with it R1 and R2, flagged not constrained (30 fits); control (40 fits) | **0.80**; 0.00 | at least 0.90; at most 0.05 -- **FAILS** |
| D5 | The two stars' velocity columns exchanged: the joint fit fails (20 fits) | 1.00 | at least 0.95 |
| E1 | V505 Persei against the published masses and radii | M_A 0.001, M_B 0.004, R_A 0.77, a 0.02, **R_B 2.45** published sigma | 2 -- **FAILS** (R_B) |
| P1 | Speed of one joint fit of 750 rows with its profiles skipped | 1.3 CPU s | 20 s |

Three legs crossed their bounds and **stay failing and labelled** in `tests/fixtures/binary-masses/failed-legs.json` (nothing was moved
and nothing was tuned after the measurement; only Carl resets a bound; the figures above were measured on Node 24.4.0 and re-measured on
Node 22.23.4 before the pull request):

- **C1** held the true period in 95 of 120 seeds, 0.7917 against the band's upper edge 0.79: two seeds of 120, and all eight other quantities
  are inside the band.
- **D4** is the rule of Prompt 217, unchanged, and fails at the same rate as its D1 (0.80): a thin eclipse leaves `k` open without the panel
  saying so one time in five. The model page and the lesson say so.
- **E1**: see below.

`npm run binary-masses:validate -- --write-results --write-failed` regenerates the table (long: ensembles of fits) and
`tests/binaryMasses.test.js` holds it.

## The oracle, and what it does not check

`tools/binary-masses-oracle/oracle.py` integrates the two-body problem in three dimensions (scipy DOP853, relative tolerance 1e-12) and
rotates it by `w` and `inc`; it takes the primary conjunction as the root of the sky-plane X component with Z above 0, builds the eclipse
curves with batman 2.5.1 as in Prompt 217, makes its own noise realisation and solves the joint problem with scipy `least_squares`. It uses
**no Gravitas code**. What is independent is the radial-velocity curve (the Kepler solution and the centre-of-mass split), the conjunction
time, the eclipse integral and the least-squares solution; what is not is the chain `a sin i`, `M sin^3 i`, which any code written from
Kepler's third law shares, and the conventions: the closed case A1 and the Sun's gravity A6 are the check on those. **ellc, PHOEBE,
JKTEBOP and WD were not installed and were not downloaded.**

## The authentic leg (E1) and its rights

V505 Persei (TIC 348517784), a detached double-lined binary of two F5 V stars. The light-curve geometry is **our** fit of the TESS Sector 18
SPOC 2-minute file (the file of BINARIES.md E1, SHA-256 `4351efe790cf3a4c718c9fdb1a9cf1ecd21d078374e90e6440b437c034618f1d`, MAST public
data, not in the repository; the leg is NOT RUN without it). The velocity amplitudes `K_A = 89.12 +- 0.09` and `K_B = 90.31 +- 0.12` km/s and
the comparison masses and radii are **numbers read from** Southworth (2021), "Rediscussion of eclipsing binaries. Paper VI. The F-type
system V505 Persei", The Observatory 141, 122 (arXiv:2106.04323, CC BY-NC-ND 4.0; the paper is not reproduced, stored or fetched as a file,
only its numerical results are cited, from its HTML rendering read on 2026-10-29). **The radial-velocity data themselves (Marschall et al.
1997; Tomasella et al. 2008) were not fetched and are not in the repository**, so this leg tests the geometry-to-masses-and-radii half of
the chain on a real star, not the velocity fit. Result: M_A 1.2745 +- 0.0036 and M_B 1.2577 +- 0.0030 (the published values, the K values
being inputs), R_A 1.2929 +- 0.0015 (published 1.2941 +- 0.0016), **R_B 1.2679 +- 0.0015 against 1.2637 +- 0.0017, 2.45 published sigma
against a bound of 2**, a 14.984 +- 0.013. A probable cause, stated with a caveat: the published Table II (`rsum` 0.170906, `k` 0.9788) with the
published `a` gives R_B = 1.2667, and the published R_B needs `k` = 0.9765, so the published numbers are not mutually consistent at the
second star by 0.0030 solar radii *in the HTML rendering read here*; our `k` is 0.9807. Our model has no reflection effect and fits no
out-of-eclipse lines, as in Prompt 217. The leg stays failing.

## Limits to carry into every claim

The data of the lessons are synthetic and the velocities are given, not measured from spectra. A mass from a double-lined eclipsing pair
is the best a mass can be, and it is only as good as the two models behind it: the eclipse model (BINARIES.md limits), and the Keplerian
orbit with no third body, no tidal distortion and a single systemic velocity. The uncertainty returned is the statistical one of the fit
(its coverage is measured in C2 and C3), not a systematic one, and a real star adds both. The synthetic lesson system of the first
investigation step was re-drawn once (a draw suffix) because its first noise realisation was a 2.7 sigma draw; all six lesson systems are
now within 2 sigma of their truth, and the register says so.

**Not built:** the visual-binary branch (Part B: the photocentre contract, the parallax requirement, the gate), a real radial-velocity
data pack, an offering of the new models in the Observatory's fit panel, the frame branch (photometry from frames, Prompt 185's pipeline), an
absolute mass from a single-lined system, gravitational redshift and light-travel time.
