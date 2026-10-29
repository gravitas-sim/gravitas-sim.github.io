# Survey design and "design an observation"

Roadmap III, Prompt 215 (tranche T3, D-R10-207-01). Branch `feat/survey-design`. The kernel is `js/kernels/survey/`; the facility
adapter is `js/instruments/survey.js` (over the instrument library of Prompt 209 and the exposure calculator of Prompt 210, both read
unchanged); the instruments are panels in `js/surveyWidgets.js`; the new step kind is `plan` on the investigation format; the
investigations are "Deep or Wide?", "Two Telescopes, One Question" and "Propose an Observation". This file is written in the order the
work was done: the validation contract first (committed with `tests/fixtures/survey/thresholds.json` before any kernel, adapter, panel,
oracle script, result or lesson existed), and the rest after the measurements.

## The validation contract (committed first)

Every setup, class, plan and bound is in `tests/fixtures/survey/thresholds.json`. A check that a measurement crosses is a failed check,
recorded in `tests/fixtures/survey/failed-legs.json` and left failing, not a reason to move its bound. The checks follow the roadmap's
section 7.5.8.

**The model, in the order the kernel computes it.**

1. *Depth.* For a setup (zero point `Z` in electrons per second at magnitude 0, pixel scale, seeing FWHM, sky surface brightness, read
   noise, dark rate) and a total integration `T = v t` (`v` frames of `t` seconds, stacked), the 5 sigma point-source depth is the
   magnitude at which the matched-filter signal to noise `s` reaches 5, from the CCD equation of `js/kernels/detector/snr.js`
   (`limitingMagnitude`, optimal aperture of `4 pi sigma^2` pixels, `sigma = FWHM / 2.3548`). With the sky dominating, the variance is
   proportional to `T`, `s` is proportional to `F sqrt(T)`, and the depth gains `1.25` magnitude per decade of `T` (A3).
2. *Area.* One pointing costs `v (t + overhead)`. In `N` nights of `h` hours with a clear fraction `c` the time is `T_tot = N h 3600 c` and the
   pointings are `floor(T_tot / (v (t + overhead)))`; the area is the pointings times the field `Omega` (no overlap or gaps: stated).
3. *Counts.* A class is a cumulative count per square degree `N(<m) = n0 10^(alpha (m - m0))` up to `mMax`. For sources uniform in a
   Euclidean volume the flux limit is a distance limit `d ~ 10^(0.2 m)`, so `N ~ d^3 ~ 10^(0.6 m)`: `alpha = 0.6`. With a Schechter
   luminosity function `phi(L) dL = phi* (L/L*)^alphaS exp(-L/L*) d(L/L*)` the count to the flux limit is
   `N(<m) = (Omega_sr / 3) phi* d*^3 Gamma(alphaS + 5/2)`, `d* = 10^((m - M* + 5)/5)` pc, the distance at which an `L*` source reaches the
   limit (A1; `Omega_sr` the area in steradians). The other classes are stated slopes and normalisations, *teaching models with no claim
   about a real population*; they exist to show the decision that the slope makes (below).
4. *Completeness.* A source of matched-filter signal to noise `s` is detected when `s` plus unit Gaussian noise exceeds the threshold
   `theta`: `C = Phi(s - theta)`. This is the form of INJECTION.md a1 (`s_c = 4 exp(5 / (4 pi sigma_pix^2))` is the half point of that
   document's detector rule); here `theta` is the plan's own threshold. Detections: `D = Omega_plan [ N(<m_a) + integral C(m) n'(m) dm ]`,
   by composite Gauss-Legendre quadrature between the magnitude where `C` is 0.99997 and where it is below 1e-6. For a completeness that is
   a probit in magnitude, `C = Phi((mc - m)/w)`, the integral is exactly `N(<mc) exp((alpha ln 10 w)^2 / 2)` (A2): detections exceed the
   sharp-cut count by that factor.
5. *False positives.* One-sided Gaussian tail per independent element, `Q(theta) = Phi(-theta)`; the elements are the noise-equivalent area of
   the matched filter, `4 pi sigma^2` square arcsec, so `3600^2 / (4 pi sigma^2)` per square degree. *Reliability* `R = D / (D + F)`; a plan is
   *unreliable* when `R < 0.5`. The independence of neighbouring elements and the Gaussianity of the noise are assumptions; a real detector
   adds artefacts (cosmic rays, bad columns, blends) and is worse.
6. *Uncertainty.* The count a survey returns is Poisson about `D`; the prediction interval is the central Poisson quantile interval at the stated
   level. Clustering, cosmic variance and the uncertainty of the class itself are not in it, so the interval is a lower bound on the spread of a
   real survey (stated wherever it is shown).
7. *The trade-off at fixed time.* With one visit, sky-limited, a sharp cut and `beta = 1.25 alpha`, the number of sources found is
   `N ~ t^beta / (t + overhead)`; `d ln N / d ln t = beta - t/(t + overhead)`, zero at `t* = beta overhead / (1 - beta)` for `beta < 1`
   (a maximum: `alpha = 0.6` gives `t* = 3 overhead`) and positive everywhere for `beta >= 1` (`alpha >= 0.8`): *deep wins only where the counts
   are steeper than 0.8 dex per magnitude*, and wide wins where they are shallower. Read noise, saturation and the completeness curve move the
   numbers; A4 holds the analytic limit.
8. *Two setups, one goal.* In the sky-limited regime the time to reach a depth is `t = s^2 4 pi sigma^2 10^(0.8 m - 0.4 mu) / Z`: it scales as
   `FWHM^2 / Z`, the seeing squared over the collecting power (the pixel scale cancels). The rate at which a setup surveys area to that depth is
   `Omega / (t + overhead)` (A5).
9. *Feasibility.* A goal is a depth, an area, and optionally a reliability. A plan is *feasible* when it reaches the depth (not short of it), the
   area, and the exposure does not fill the pixel well with sky (`t (sky + dark) < full well`: reason `saturates`); otherwise it is *not feasible*
   with every reason that applies (`depth`, `area`, `saturates`, `reliability`). Counts beyond the class's range are refused
   (`outside-count-model`), never extrapolated.

**Scope.** Built: the above. Not built: clustering, K-corrections, evolution, crowding, extended-source detection, dust, weather
forecasts (the clear fraction is an input), the scheduling of fields. The Euclidean model is checked against Astropy's cosmology (B2) and
bounded at `mMax = 16.5` for the one cited class.

**(a) Analytic cases.** A1 the Schechter-Euclid closed form and the slope 0.6; A2 the probit-completeness detections against the closed form
(9 cases); A3 the 1.25 mag per decade; A4 the optimum exposure `beta overhead / (1 - beta)` and the absence of one for `alpha = 1`; A5 the time ratio
of two sky-limited setups and the survey rate; A6 the false-positive tail and the element count; A7 the Poisson interval's exact coverage; A8 the
plan's arithmetic and the stack.

**(b) Independent oracle.** `tools/survey-oracle/oracle.py` (NumPy, SciPy, Astropy: its own CCD equation, `brentq`, `quad`, `norm`) computes B1
the 12 plans of grid `b1`; B2 the Euclidean count against `FlatLambdaCDM`; B4 an order-of-magnitude density; B3 compares the kernel's
half-completeness magnitude with Prompt 184's injection run (an independent measurement on a rendered frame). The results are pinned in
`tests/fixtures/survey/oracle-results.json` with the versions in `oracle-provenance.json`.

**(c) Ensemble coverage.** C1: 4000 seeded surveys of four plans; the count's 95.45 percent interval holds the realised count in at least
0.94, the 68.27 percent in 0.64 to 0.82, and the mean of the draws agrees with the kernel's expectation to 3.5 standard errors.

**(d) Misspecified and negative cases.** D1 ten plans against goals set from the oracle's own numbers (feasible, short of depth, short of area,
saturating); D2 four requests beyond a class's range, refused; D3 eight malformed inputs, each a refusal with a code; D4 six cases where false
positives outnumber detections, called unreliable.

**(e) Authentic data.** E1 is NOT RUN: the repository holds no real catalogue with a stated completeness and none is downloaded here. B4 is an
order-of-magnitude check of the cited class against a recalled surface density, not an authentic-data validation.

**Synthetic data** (every frame and survey this model renders) is labelled synthetic, with the class and the plan as its truth manifest.
