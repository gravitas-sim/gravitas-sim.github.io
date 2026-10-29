# Eclipsing binaries: a detached model with identifiability stated

Roadmap III, Prompt 217 (tranche T3, D-R10-207-01). Branch `feat/eclipsing-binaries`. The kernel is `js/inference/binaries.js` (first written in `js/stellar/`, moved beside the occultation it imports so that the architecture check keeps its domain layer free of feature imports); the model of
the inference core is `js/inference/binaryModel.js` (registered in `js/inference/models.js` as `eclipsing-binary`); the instruments are the
`eclipse-curve` and `eclipse-fit` panels (`js/eclipseWidgets.js` over `js/eclipseField.js`) and the model in the Observatory's fit panel
(`js/observatory/fitPanel.js`); the investigation is "Two Stars Eclipsing" (`js/data/investigations/binaries-sequence.js`). The validation
contract below was committed (with `tests/fixtures/binaries/thresholds.json`, the oracle script and its pinned results) before the kernel,
the model, the validator, the panels or any lesson existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/inference/transit.js` (a dark disk across one limb-darkened star, circular orbit) and `js/inference/models.js`'s `transit-quadratic` | a second luminous star (the occulted star's light is lost in both eclipses), an eccentric orbit, the secondary eclipse, a surface brightness ratio, the identifiability of the radius ratio | the Observatory's fit panel (`eclipsing-binary` beside `transit-quadratic`), the two panels, the lesson | the occultation quadrature is `transit.js`'s `occultation`, imported, not copied; the Kepler solver is `js/orbital.js`'s `solveKepler` (D-R10-18) |
| `js/inference/fit.js`: the rank analysis (`rankAt`), the covariance, the profile | a model-specific statement of what the data fix, and the residual test of this prompt | `identifiability()` and `residualsFail()` in `js/inference/binaries.js`, called from `js/inference/infer.js` through an optional `model.identify` hook | none: it adds to the result, it does not replace `rank` |
| `js/stellar/*` (structure, tracks, population) | binaries | this model | n/a |

## Equations, limits, assumptions

1. **Geometry.** Star 1 is the star eclipsed at the primary eclipse (star 2 in front, at time `tc`). The orbit of star 2 about star 1 has
   semi-major axis `a`, eccentricity `e` and argument of periastron `w` as in Winn (2010, "Transits and Occultations"): the primary eclipse
   is at true anomaly `pi/2 - w`, the secondary at `3 pi/2 - w`. The sky separation in units of `a` is
   `d = r sqrt(1 - sin^2(f + w) sin^2 i)` with `r = (1 - e^2)/(1 + e cos f)`, and star 2 is in front when `sin(f + w) > 0`. **The convention to
   read a paper with:** `w` here is the argument of periastron of the orbit of *star 2 relative to star 1*; the argument of periastron of the
   primary star's own orbit, which a radial-velocity paper quotes, is `w + 180 degrees`. `e cos w > 0` puts the secondary after phase 0.5.
2. **Radii.** `rsum = (R1 + R2)/a`, `k = R2/R1`, so `r1 = rsum/(1 + k)` and `r2 = k r1`. A light curve measures durations over a period, a
   length over a circumference, so radii come as fractions of `a`; the orbit's size in kilometres and the masses need the stars' velocities
   (Prompt 218).
3. **Light.** Each star is a sphere with quadratic limb darkening `I(mu) = 1 - u1 (1 - mu) - u2 (1 - mu)^2`; the light of star `i` is
   `S_i pi R_i^2 (1 - u1/3 - u2/6)` with `S_i` its central surface brightness, so the light ratio is
   `L2/L1 = J k^2 (1 - uB1/3 - uB2/6)/(1 - uA1/3 - uA2/6)` with `J = S2/S1`. The flux is `(1 - l3) (L1 f1 + L2 f2)/(L1 + L2) + l3`, `f_i` the
   fraction of star `i`'s light that remains and `l3` a fixed third light (default 0). The light lost is the occultation of the eclipsed
   star's disk by the other's, the quadrature of `js/inference/transit.js` (64 nodes, error at most 5e-5 of a depth), valid for any radius
   ratio. Out of eclipse the flux is exactly 1.
4. **What eclipses fix (the review's corrections).** The secondary's phase is `0.5 + (1/pi)[arctan(x/sqrt(1-e^2)) + x sqrt(1-e^2)/(1 -
   e^2 sin^2 w)]`, `x = e cos w`, exactly at `i = 90` (Sterne 1939), and `0.5 + (2/pi) e cos w` to first order: **e cos w is timing, the best
   measured quantity in a light curve.** The ratio of the secondary's duration to the primary's is `(1 + e sin w)/(1 - e sin w)` to first order
   (Winn 2010, eq. 16): **e sin w is a difference of two widths, each known to a fraction of a percent at best, with limb darkening, `k` and `i`
   all moving them, so it is weak, and a third body or a wrong limb darkening moves it as much as the data do.** The fit shows the ratio of
   the two uncertainties (D5).
5. **Grazing eclipses.** When the minimum separation is a large fraction of `r1 + r2` only a thin lens of the smaller star crosses the
   larger, and `k`, `rsum` and `inc` lie on one curved valley of chi-square: a wide range of `k` fits within one unit. The result says
   so: `identifiability()` marks a parameter **not constrained** when the rank analysis of `fit.js` lists it, or its uncertainty is above 25 percent of its
   value (for `k`, `rsum` and `J`), or it sits on a bound, and the panel shows it with the reason; the profile of `k` shows the open side.
   A radius ratio, or a radius, derived from a not-constrained `k` is marked the same. The rule is fixed in the thresholds (D1) and
   measured on a control ensemble that it must leave alone.
6. **Fitting.** Weighted least squares with the core's multi-start Levenberg-Marquardt (six starts over `k` and `inc`), the baseline solved
   exactly, `J` held at or below 1 so the two stars are never exchanged, `e` held below 0.7, bounds on every parameter; the period is read
   from the reader's bound (within 5 percent) or searched by phase-dispersion minimisation, and its double is tried as well, since two
   eclipses of equal depth fold onto each other at half the period. A fit with no eclipse in it is **refused**, naming the eclipse, not
   fitted.
7. **The residual test** (D2, D4): the reduced chi-square above 1.5, or the red-noise factor beta (Winn et al. 2008) above 1.5. A system
   with spots, a third body, reflection or ellipsoidal light, which the model does not have, is expected to fail it; a fit that passes
   is not thereby right.

Assumptions: spherical stars, detached, one band, limb-darkening coefficients from a table (the Observatory panel takes one pair for both
stars, as the published solution used here did), third light fixed, no light-travel time, no apsidal motion. **Physical domain:** `rsum`
0.02 to 0.9, `k` 0.05 to 20, `inc` 45 to 90 degrees, `J` 0.01 to 1, `e` below 0.7. **Not claimed:** masses, absolute radii, temperatures (a
surface brightness ratio in one band is not a temperature ratio without a calibration), the radius ratio of a grazing or shallow partial
eclipse, a well-determined `e sin w`, anything the model leaves out.

## Validation contract (committed first)

Seeds: oracle 217; ensemble prefix `binaries-217`. Bounds are in `tests/fixtures/binaries/thresholds.json`; this table is its summary and
the file wins. The three synthetic systems S1 (circular, partial), S2 (eccentric) and S3 (star 2 the larger) and the ensembles are written out
there so that the oracle and the harness build identical inputs.

| Leg | What it checks | Measured (Node 22.23.4) | Bound |
|---|---|---|---|
| A1 | Central eclipse depths, uniform stars and the quadrature of the limb-darkened law | 1e-14 (uniform), 4e-8 (limb darkened) | 2e-6, 1e-6 |
| A2 | Contact times and durations against an independent orbit | 2e-15 d | 1e-8 d |
| A3 | Secondary phase at i = 90, circular and eccentric | 2e-16 | 1e-9 |
| A4 | Swapping the stars gives the same curve | 2e-14 | 1e-9 |
| A5 | Out of eclipse the flux is exactly 1; third light is exact | 0 violations | 0 |
| A6 | Derived quantities (r1, r2, e, w, light ratio) | 6e-14 relative | 1e-12 |
| A7 | e cos w from the secondary phase | 0.29 of the bound | 1 |
| A8 | Duration ratio against (1+e sin w)/(1-e sin w) | 0.20 of the bound | 1 |
| B1 | batman 2.5.1, both eclipses, three systems | 2.6e-5 | 5e-5 |
| B2 | Brute-force polar quadrature | 3.4e-5 (against batman 1.6e-5) | 1e-4 |
| B3 | Conjunction times and depths against batman | 0 d; 2.6e-5 | 1e-6 d; 5e-5 |
| C1 | Coverage of the 1-sigma interval, circular ensemble (120 seeded fits) | tc 0.71, P 0.71, rsum 0.67, k 0.63, inc 0.67, J 0.65 | 0.57 to 0.79 (all) |
| C2 | Coverage, eccentric ensemble (120 fits) | tc 0.62, P 0.66, rsum 0.69, k 0.70, inc 0.68, J 0.68, ecosw 0.67, esinw 0.68 | 0.57 to 0.79 (all) |
| C3 | Coverage of the profile interval (40 fits) | rsum 0.57, k 0.62, inc 0.68 | 0.50 to 0.86 |
| C4 | Recovery: the median bias of each parameter, in sigma | every parameter within 3 sigma/sqrt(n) | 3 sigma/sqrt(n) |
| D1 | Grazing pair: radius ratio flagged not constrained (40 fits); control (60 circular fits) | **0.80**; 0.00 | at least 0.90; at most 0.05 -- FAILS |
| D2 | Spotted pair fails the residual test (20); control (60) | 1.00; 0.00 | at least 0.95; at most 0.05 |
| D3 | A light curve with no eclipse is refused, naming the eclipse (20) | 20 of 20 | all |
| D4 | Circular orbit assumed for an eccentric pair fails the residual test (20) | 1.00 | at least 0.95 |
| D5 | Uncertainty of e sin w over that of e cos w | 44 | at least 5 |
| E1 | V505 Per, TESS Sector 18, against the published solution (rsum, k, J, inc within 2 paper sigma) | rsum 0.14, k 0.98, J 0.04, **inc 4.4** paper sigma | 2 -- FAILS (inc) |
| P1 | Speed of one 1383-row model evaluation | 0.53 CPU s for the whole leg | 10 s |

Two legs crossed their bounds and **stay failing and labelled** in `tests/fixtures/binaries/failed-legs.json` (nothing was moved, and the identifiability rule was not tuned after the measurement; only Carl resets a bound): **D1**, the rule flags the grazing radius ratio in 32 of 40 fits, not the 36 the bound needs, because in the other eight the fit places `k` within the stated 25 percent; **E1**, the inclination differs from the published 87.917 degrees by 0.013 degrees (4.4 paper sigma), while `rsum`, `k` and `J` agree within one paper sigma. JKTEBOP includes a reflection effect and fits out-of-eclipse straight lines; this model has neither, and its stated uncertainty (0.0007 degrees against 0.003) is too small for a real star. The table is regenerated by `npm run binaries:validate -- --write-results --write-failed` (about twenty CPU minutes) and `tests/binaries.test.js` holds it.

## The oracle, and what it does not check

`tools/binaries-oracle/oracle.py` uses **batman 2.5.1** (Kreidberg 2015, PASP 127, 1161; Mandel and Agol 2002 for the quadratic law) for each
star's eclipse as a transit of that star by the other (the second in the swapped frame: radius `1/k`, `a/R2`, `w + 180`, `t0` at the secondary
conjunction), weighted by the light ratio, and a brute-force polar quadrature of the occulted disk (1200 by 2400 cells) as a second
implementation. batman is a transit code, not an eclipsing-binary code, and **ellc, PHOEBE and JKTEBOP are not installed and were not
downloaded**: what is independent is the occultation integral, the Kepler solution, the conjunction times and the weighting; what is not is the
idea that two spheres add their light by the luminosity ratio, and the convention for `w` (batman's, Winn 2010: the same). The authentic leg
E1 is the only comparison with a code written for eclipsing binaries (JKTEBOP, through the published solution).

## The authentic leg (E1) and its rights

V505 Persei (TIC 348517784), TESS Sector 18, SPOC 2-minute light curve `tess2019306063752-s0018-0000000348517784-0162-s_lc.fits`
(1,785,600 bytes, SHA-256 `4351efe790cf3a4c718c9fdb1a9cf1ecd21d078374e90e6440b437c034618f1d`, retrieved 2026-10-29 from
`archive.stsci.edu/missions/tess/tid/s0018/0000/0003/4851/7784/` by the coordinator). Rights basis: MAST/TESS public data, no use
restriction, the acknowledgement of MAST and the TESS mission requested. The comparison values are Southworth (2021), "Rediscussion of
eclipsing binaries. Paper VI. The F-type system V505 Persei", The Observatory 141, 122 (arXiv:2106.04323, CC BY-NC-ND 4.0: **the paper is
not reproduced or stored; only its numerical results are cited**), Table II. The file is **not in the repository**; the validator reads it from
`--fits=<path>`, `BINARIES_FITS` or the relative path in `oracle-provenance.json`, checks its SHA-256 and otherwise reports the leg NOT RUN. The
contract was fixed before the file was opened.

## Limits to carry into every claim

The data of the lessons are synthetic. The model has no reflection, no ellipsoidal variation, no spots: the spotted pair is the stated
misspecification and fails the residual test, and a real star may have several effects at once. The grazing pair's valley is a
property of its geometry, not of this fitter; another code would report the same degeneracy. The frame branch of the prompt (photometry
from frames) needs Prompt 185's pipeline and is **not built**: the archive light-curve branch is what ships. No visual-orbit or mass
branch (Prompt 218).
