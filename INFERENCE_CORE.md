# The inference core

A deterministic fitting core for transit light curves and radial-velocity
orbits. It runs in the browser, in disposable Workers, and takes the
observatory's canonical observation shape (`gravitas.observation/1`,
OBSERVATORY_WORKSPACE_DESIGN.md).

It is transparent weighted least squares: a bounded grid, then bounded
Levenberg–Marquardt refinement. There is no MCMC and no black-box optimizer.
Every step is one a reader could do by hand, and every number it returns says
which of three kinds it is.

This is the scientific engine, with a minimal diagnostic panel on
`/observatory/`. It is not the student investigation; that is later work.

## Where it runs

```
observatory page ── fit panel (lazy chunk) ── js/inference/run.js
                                                   │
                           js/experiments/scheduler.js (the experiments' own)
                                                   │
                 ┌─────────────────────────────────┼──────────────┐
          realm: the fit                  realm: profile k   realm: profile b …
          js/inference/inferenceWorker.js, one per task, closed when it answers
```

- **Workers only.** The page never evaluates a model. Each task (the fit,
  then one profile per fitted parameter) gets a fresh Worker from the
  experiment runner's scheduler, with its concurrency, timeouts,
  cancellation and progress (`createScheduler({ accept, message })`, which
  now takes other task kinds than a trial).
- **No world.** The realm imports the core and nothing else: no engine, no
  scene, no page. A fit cannot touch the simulation, and the engine was not
  refactored into instances (MULTI_WORLD_DECISION.md).
- **No network.** The data comes in the message. The Worker fetches nothing,
  and the core has no dependency.
- **Deterministic.** There is no randomness and no clock in the numerics, and
  the summation order is fixed. The same inputs give the same answer on every
  machine; a test runs a fit twice and compares every digit. Synthetic data
  is seeded (`js/inference/synthetic.js`).

## The models

Each model is a small named parameter set with physical bounds
(`js/inference/models.js`). It answers three questions: its prediction, the
exact solution of its linear parameters, and its derived quantities. Every
parameter is **fitted** (searched within bounds), **fixed** (held at a value),
or **derived** (computed, never searched). A result never mixes them up.

### `transit-quadratic` 1.0.0

A circular orbit, quadratic limb darkening, and a baseline flux
(`js/inference/transit.js`).

| Parameter | Kind | Unit | Bounds | Notes |
|---|---|---|---|---|
| `t0` | fitted | the time column's | the reader's | mid-transit time, in the column's own format (BTJD for TESS) |
| `P` | fitted | the time column's | the reader's | period |
| `k` | fitted | — | 0.005 – 0.5 | Rp/R* |
| `aRs` | fitted | — | 1.5 – 200 | a/R* |
| `b` | fitted | — | 0 – 1.5, and below 1 + k | impact parameter |
| `q1`, `q2` | fitted | — | 0 – 1 | Kipping (2013), which keeps the star brightest at its center |
| `f0` | linear | — | — | the baseline, solved exactly at every step |
| depth, T14, inclination, u1, u2 | derived | —, the time column's, deg | — | T14 in the column's unit, like t0 and P |
| Rp | derived | R_Jup | — | only when the reader gives the star's radius (below) |

- **The light blocked** is the light of the stellar rings the planet covers.
  The fully covered inner disk is computed in closed form, and the partly
  covered annulus by the midpoint rule, on nodes clustered at both ends.
  This is Mandel & Agol's (2002) quantity by direct quadrature. A test holds
  it to the exact area of two overlapping circles for a uniform star.
  Against 4,096 nodes, for HD 209458 b at every separation, the error is:
  - at 64 nodes, at most 5×10⁻⁵ of the depth (0.9 ppm);
  - at 32 nodes, the default, 2×10⁻⁴ (3.5 ppm).
  The noise is hundreds of ppm.
- **Exposure:** each point is the mean of `supersample` instants across its
  exposure (Kipping 2010). The TESS light curve is 20-minute bins of
  2-minute cadences, and is modeled by its bin width.

### `rv-keplerian` 1.0.0

One planet on a Keplerian orbit (`js/inference/rv.js`).

| Parameter | Kind | Unit | Bounds | Notes |
|---|---|---|---|---|
| `P` | fitted | the time column's | the reader's | |
| `tc` | fitted | the time column's | the reader's | the time of inferior conjunction, when a transit would happen, so a joint fit later shares it |
| `K` | fitted | the velocity column's | 0 – 2000 | semi-amplitude |
| `sqrtEcosw`, `sqrtEsinw` | fitted | — | ±0.95, and e ≤ 0.90 | Eastman et al. (2013): these parameters do not push a fit away from e = 0 |
| `gamma` | linear | the velocity column's | — | one zero point per instrument, solved exactly |
| `jitter` | nuisance | the velocity column's | 0 – 200 | added in quadrature to every error bar; found by a golden-section search on −2 ln L outside the least squares |
| e, ω | derived | —, deg | — | |

## The algorithm, `grid-lm` 1.0.0

`js/inference/fit.js` and `js/inference/infer.js`.

1. **The data.** The observation's time, value and uncertainty columns, less
   masked rows, missing values and rows whose error bar is not positive.
   Each of these is counted in the result.
2. **A bounded grid** over period and epoch, when the reader leaves them free.
   - For a transit this is box least squares (Kovács, Zucker & Mazeh 2002).
     The period step is a quarter of the shortest trial duration over the
     number of cycles in the window, so no transit falls between two trials.
     The trial durations are 1 to 6 hours, in the time column's unit.
   - For an orbit it is a weighted sinusoid periodogram, stepped a tenth of a
     cycle of phase drift across the baseline.
3. **Starts.** The grid's best, and for a transit three impact parameters
   (0.1, 0.45, 0.75) with a/R* from the box's duration. The lowest chi-square
   is kept.
4. **Bounded Levenberg–Marquardt, with an active set.** Every trial point is
   kept inside its bounds, and b is kept below 1 + k. A parameter on its
   bound, with the descent pointing past it, is held there for that step
   while the others are solved for without it. Clamping it afterwards
   instead bent the other parameters' step: two HD 209458 b-like seeds in a
   hundred, whose limb darkening sat at q1 = 1 or q2 = 1, zigzagged to the
   200-iteration limit at the right χ². With the active set they converge
   in 16 and 18. Linear parameters are solved exactly at every step.
   Convergence is three consecutive relative gains below the tolerance; a
   fit that stops for any other reason says so.
5. **Jitter,** for an orbit, by a golden-section search around steps 2–4.

## Uncertainty, kept apart

A profile's grid is spaced by the covariance's sigma, and a degeneracy can
make that several times wider than the interval itself. The first
validation run found it at 2000 ppm: the profile interval for Rp/R* held the
truth in 9 seeds of 20. On one seed the sigma was 0.025 and the first grid
point past the best fit was at Δχ² = 9.9. Linear interpolation between the
two put the crossing a third of the way out, and gave an interval 0.0027
wide. The profile now interpolates in √Δχ² and adds points inside any
bracket whose far end is past Δχ² = 4, each between a fifth and four fifths
of the way across. That seed's interval is 0.0114 wide and holds the truth.
The tables below are from after the fix.

The result gives each fitted parameter several numbers, and says which is
which. **None of them is a calibrated confidence region.** Whether an interval
holds 68% of the truth is measured below, not asserted.

| Column | What it is | When it is right |
|---|---|---|
| `sigma` | √ of the diagonal of (JᵀWJ)⁻¹ at the best fit | the model is linear there, and the error bars are right |
| `sigmaScaled` | `sigma` × √χ²ν, given when χ²ν > 1 | the error bars were too small by a constant factor |
| `sigmaRed` | the above × β, given when β is more than white noise gives by chance, 1 + 2/√(2(M − 1)) for M bins | the residuals are correlated in time (Winn et al. 2008's time-averaging β) |
| profile | the Δχ² = 1 interval, re-fitting every other parameter at 11 values across ±4 `sigma`, then at up to 3 more a side inside each crossing's bracket; the crossing is interpolated in √Δχ², exact for a parabola | the same conditions as `sigma`; honest about asymmetry and bounds |
| slice | χ² with the others held at the best fit | never an interval: a picture of the objective's shape |

- **Derived quantities** carry uncertainties propagated through the
  covariance (linearized), on the same sigma / sigmaScaled convention. An
  external input's own uncertainty adds in quadrature.
- **Warnings** name what a reader must know before quoting a number:
  - `notConverged`, `atBound` and `singular`;
  - `degenerate`, for a correlation above 0.95, naming the pair;
  - `unweighted`, `scaled` and `correlatedNoise`;
  - `droppedNoUncertainty` and `notDetected` (depth under 5× the in-transit
    noise);
  - `noExposure` and `timeUnitAssumed`.

## What the core tracks

| Concern | How |
|---|---|
| Time reference and scale | The manifest records the time column's format and scale (BTJD/TDB for TESS). Epochs are in that format, and the model works in the column's own unit; the period search's durations are converted into it. A column with no time unit is assumed to be days, and the result says so. |
| Exposure integration | `settings.exposure`, in the time column's unit, and `settings.supersample`. The panel offers the median spacing. `noExposure` warns when it is 0. |
| Flux normalization | `f0` is fitted, as a linear parameter. The data need not be normalized, and a normalized curve gives f0 ≈ 1. |
| RV zero points and jitter | One `gamma` per instrument (the group column), solved exactly; one jitter for all instruments. |
| Missing uncertainties | A row with a missing or non-positive error bar is left out and counted. A dataset with no error-bar column is fit unweighted, and its uncertainty comes from the scatter. |
| Dilution | `settings.dilution`: other stars' fraction of the aperture's light, **fixed, never fitted**. A light curve alone cannot tell it from a smaller planet. The default, 0, is right for TESS PDCSAP, which is corrected for crowding. A test injects a third of the light from another star and recovers Rp/R* only when told; untold, it comes out √(2/3) as large. |
| Stellar-parameter uncertainty | `settings.stellarRadius: { value, sigma }` in R☉ gives a derived Rp. Its sigma is the fit's and the star's, in quadrature. No stellar parameter is otherwise assumed. |

### What is not claimed

- **Mass and density from a transit.** A transit alone does not measure them.
  No radial-velocity dataset for HD 209458 ships with Gravitas. The one
  series the data-pack gate graded, HARPS on HD 75289, is of another star and
  cannot pair with this one (DATA_PACKS.md). So the real-data inference is
  **transit-only**. The joint fit, and any mass or density claim, is deferred
  until a defensible paired dataset is curated. The RV model is validated on
  synthetic orbits only.
- **Stellar density from a/R\* and P.** This needs a circular orbit and waits
  for the joint fit.
- **Eccentricity from a transit.** The transit model's orbit is circular.

Every result carries its model's `notClaimed` and `assumptions`, and the panel
shows both.

## The manifest, `gravitas.inference/1`

`js/inference/manifest.js`. A fit, stated completely enough to repeat:

- `data`: the observation's id, its source's id and version (a data pack's
  `tess-hd209458-s56-lc@1.0.0`), the columns and units, the rows used,
  masked, missing and without uncertainty, the time format and scale, the
  span, and the unit conversion to days;
- `model`: id and version;
- `parameters`: mode, bounds and value for each;
- `settings`: exposure, supersample, annuli, dilution and stellar radius;
- `algorithm`: `grid-lm` 1.0.0, with any LM, start and profile settings;
- `limits`: concurrency and timeouts;
- `engine.fingerprint`: a reference transit and orbit, evaluated and hashed.
  A build whose curves differ in a digit that matters gives a different one;
- `results`: the fit (its parameters, derived quantities, statistics,
  warnings, `notClaimed`, `assumptions` and residual count) and every
  profile.

`validateInference()` names every problem by path, and the panel will not run
a manifest that has one.

## Validation: injected signals

`npm run validate:inference` injects each case into seeded white noise
(`tools/inference-cases.mjs`), fits each seed, and profiles two parameters on
the first 20 seeds. The same seeds give the same table on every machine.

A **pull** is (fitted − true) / stated sigma. When the stated sigma is right,
the pulls average 0 with a spread of 1, ±1σ holds 68% of the truth, and
±1.96σ holds 95%. The σ used is the most honest one the fit gives: `sigmaRed`
where there is one, then `sigmaScaled`, then `sigma`. **Failed** means not
converged, or no transit detected.

### Where it works, and where it does not

- **A strong transit is recovered honestly.** For HD 209458 b as TESS sees
  it, and for the same planet on a 17-day orbit:
  - the pull means are within ±0.23, so no bias beyond a quarter sigma;
  - the pull spreads are 0.77–1.08;
  - ±1σ holds 63–80% of the truth, and ±1.96σ holds 95–100%.
- **A shallow transit's a/R\* and b are not what their sigmas say.** For a
  Neptune (Rp/R\* 0.05), their pull spreads are 2.4 and 1.9, and ±1.96σ holds
  only 77% and 81%. The b–a/R\* degeneracy is curved, and a linearized sigma
  cannot follow it. **Use the profile:** it holds b 95% of the time. Rp/R\* is
  fine, and conservative.
- **A grazing transit is not identifiable.** At b = 0.95 the fits are biased:
  Rp/R\* by −9%, a/R\* by +18% and b by −0.14. Eight in a hundred do not
  converge. The stated sigmas are 2.6 to 12 times the scatter, so the fit knows
  it does not know: every seed carries `degenerate`, and 98 carry `atBound`.
  A result like this should not be quoted.
- **At 2000 ppm** Rp/R\* is recovered without bias, with a conservative sigma
  (pull spread 0.45). a/R\* is again under-covered at ±1.96σ (81%).
- **Profile intervals are conservative for a transit's Rp/R\*.** They hold it
  85–95% of the time against the 68% they would under the linear conditions
  (grazing: 67%). With 20 seeds, each figure is good to about ±10%.
- **Radial velocity:** P, tc and K are recovered with pull spreads of
  0.91–1.12, including from 12 velocities. Near e = 0, √e cos ω and √e sin ω
  are non-Gaussian (pull spreads 1.4–1.6; ±1.96σ holds 81–86%). That is the
  known behavior of an eccentricity near zero, and it is why the model does
  not claim one there.

### The tables

**`hd209458`**: HD 209458 b as TESS sees it: depth 1.6%, 213 ppm per 20-minute point, eight transits. 100 seeds; 0 failed; a degeneracy flagged in 100.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| t0 | 2826.7820 | 1.62e-05 | 1.25e-04 | 0.15 | 0.97 | 68% | 96% | — |
| P | 3.5247 | -2.78e-06 | 2.77e-05 | -0.09 | 0.90 | 71% | 97% | — |
| k | 0.1209 | 1.17e-04 | 0.00194 | 0.09 | 0.87 | 71% | 99% | 85% of 20 |
| aRs | 8.7600 | -0.02601 | 0.20906 | -0.23 | 0.91 | 70% | 95% | — |
| b | 0.5030 | 0.00538 | 0.05769 | 0.23 | 0.91 | 77% | 95% | 80% of 20 |

**`shallow`**: a Neptune: Rp/R* 0.05, depth 0.3%. 100 seeds; 1 failed; a degeneracy flagged in 94.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| t0 | 2826.7820 | 6.10e-05 | 6.51e-04 | -0.07 | 0.96 | 69% | 99% | — |
| P | 3.5247 | -2.63e-06 | 1.61e-04 | 0.11 | 0.98 | 69% | 96% | — |
| k | 0.0500 | -2.90e-04 | 0.00247 | -0.06 | 0.65 | 90% | 99% | 95% of 19 |
| aRs | 8.7600 | 0.32478 | 1.45098 | -0.03 | 2.37 | 65% | 77% | — |
| b | 0.5030 | -0.04645 | 0.33329 | 0.90 | 1.85 | 77% | 81% | 95% of 19 |

**`grazing`**: a grazing transit, b = 0.95: V-shaped. 100 seeds; 8 failed; a degeneracy flagged in 92.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| t0 | 2826.7820 | -2.29e-06 | 2.41e-04 | -0.00 | 0.96 | 70% | 96% | — |
| P | 3.5247 | 4.71e-06 | 5.82e-05 | 0.09 | 0.96 | 72% | 92% | — |
| k | 0.1209 | -0.01058 | 0.01294 | -0.05 | 0.08 | 100% | 100% | 67% of 18 |
| aRs | 8.7600 | 1.58722 | 1.71810 | 0.26 | 0.38 | 95% | 99% | — |
| b | 0.9500 | -0.14472 | 0.14800 | -0.26 | 0.33 | 96% | 100% | 94% of 18 |

**`noisy`**: the same planet at 2000 ppm a point. 100 seeds; 0 failed; a degeneracy flagged in 90.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| t0 | 2826.7820 | 2.90e-04 | 0.00114 | 0.15 | 0.95 | 74% | 95% | — |
| P | 3.5247 | -4.69e-05 | 2.82e-04 | -0.11 | 1.00 | 69% | 94% | — |
| k | 0.1209 | 3.50e-04 | 0.00501 | -0.09 | 0.45 | 95% | 100% | 90% of 20 |
| aRs | 8.7600 | 0.20312 | 1.10408 | -0.06 | 1.24 | 63% | 81% | — |
| b | 0.5030 | -0.02108 | 0.30163 | 0.45 | 0.89 | 84% | 93% | 85% of 20 |

**`long`**: P = 17.3 d: two transits in the window, one in the gap-free half. 100 seeds; 0 failed; a degeneracy flagged in 100.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| t0 | 2830.2000 | -6.19e-05 | 2.09e-04 | -0.12 | 0.89 | 74% | 97% | — |
| P | 17.3000 | 1.41e-05 | 3.59e-04 | 0.01 | 1.08 | 63% | 95% | — |
| k | 0.1209 | 1.04e-05 | 0.00174 | 0.04 | 0.77 | 78% | 100% | 95% of 20 |
| aRs | 26.0000 | -0.03688 | 0.62882 | -0.04 | 0.86 | 77% | 97% | — |
| b | 0.5030 | 0.00108 | 0.05854 | 0.10 | 0.78 | 80% | 97% | 85% of 20 |

**`rv-circular`**: a circular hot Jupiter, 40 velocities over 30 days, 3 m/s errors, 4 m/s jitter. 100 seeds; 0 failed; a degeneracy flagged in 0.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| P | 4.2308 | -4.80e-04 | 0.00606 | -0.02 | 0.96 | 76% | 95% | — |
| tc | 100.3000 | 0.00439 | 0.03848 | 0.02 | 1.02 | 72% | 93% | — |
| K | 55.9000 | -0.07820 | 1.12840 | -0.02 | 1.03 | 64% | 95% | 60% of 20 |
| sqrtEcosw | 0.0000 | 0.00307 | 0.10870 | -0.08 | 1.56 | 64% | 81% | — |
| sqrtEsinw | 0.0000 | 0.01213 | 0.10245 | -0.01 | 1.43 | 58% | 86% | — |

**`rv-eccentric`**: the same with e = 0.10. 100 seeds; 0 failed; a degeneracy flagged in 0.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| P | 4.2308 | 0.00131 | 0.00604 | 0.28 | 0.93 | 64% | 97% | — |
| tc | 100.3000 | 5.98e-05 | 0.03839 | 0.03 | 0.96 | 72% | 97% | — |
| K | 55.9000 | 0.06238 | 1.09144 | 0.10 | 0.91 | 74% | 97% | 75% of 20 |
| sqrtEcosw | 0.2500 | -0.00474 | 0.05418 | -0.09 | 1.03 | 62% | 94% | — |
| sqrtEsinw | -0.2000 | 2.62e-05 | 0.05220 | -0.14 | 1.05 | 65% | 92% | — |

**`rv-sparse`**: e = 0.10 from 12 velocities. 100 seeds; 0 failed; a degeneracy flagged in 0.

| Parameter | Truth | Bias | RMS | Pull mean | Pull SD | Within ±1σ | Within ±1.96σ | In the profile |
|---|---|---|---|---|---|---|---|---|
| P | 4.2308 | 7.44e-04 | 0.01207 | 0.03 | 1.12 | 70% | 92% | — |
| tc | 100.3000 | -0.00453 | 0.07261 | 0.02 | 0.99 | 72% | 94% | — |
| K | 55.9000 | -0.00208 | 1.98124 | 0.06 | 0.98 | 64% | 96% | 65% of 20 |
| sqrtEcosw | 0.2500 | -0.02261 | 0.10444 | -0.09 | 1.17 | 71% | 91% | — |
| sqrtEsinw | -0.2000 | -0.00839 | 0.10979 | -0.11 | 1.18 | 64% | 90% | — |

## Validation: real data

The shipped TESS light curve of HD 209458 (sector 56, 1,882 points of 20
minutes), fitted with every transit parameter free and set against published
values: Stassun et al. 2017, through the NASA Exoplanet Archive, and Knutson
et al. 2007.

- **The error bars are too small for the scatter.** The reduced χ² is
  7.98, with a residual rms of 213 ppm,
  and the residuals are correlated in time (β = 1.66). So the
  honest σ is the stated one × √χ²ν × β, about 4.7 times as large. The fit
  says both, in its `scaled` and `correlatedNoise` warnings.
- **Against that σ:**
  - Rp/R\*, the inclination and b agree within 0.7σ, and a/R\* is 1.0σ off;
  - T14 is 1.7σ short, 2.5 minutes;
  - **the period is 4.2σ short**, 18 seconds. One sector's eight transits
    cannot compete with a long-baseline ephemeris, and whatever the correlated
    noise does to the ends of the window, β does not fully capture. A
    period from one sector should not be quoted against a long baseline;
    the core's P is for folding and for the epoch.
- The profile intervals here use the χ²ν scaling but not β, so they are
  narrower than the honest σ. The published Rp/R\* lies just outside its
  profile, and within its honest σ.

| Quantity | Fitted | Honest σ | Stated σ | Profile | Published | Apart |
|---|---|---|---|---|---|---|
| Rp/R* | 0.119262 | 0.0027 | 5.82e-04 | 0.1180 – 0.1205 | 0.120860 ± 1.00e-04 (Stassun et al. 2017 (NASA Exoplanet Archive)) | -0.59σ |
| a/R* | 9.209666 | 0.4443 | 0.0950 | 9.0156 – 9.4344 | 8.760000 ± 0.0400 (Stassun et al. 2017) | +1.01σ |
| inclination (deg) | 87.323172 | 0.8590 | 0.1836 | — | 86.710000 ± 0.0500 (Stassun et al. 2017) | +0.71σ |
| b | 0.430114 | 0.1174 | 0.0251 | 0.3669 – 0.4789 | 0.502734 (a/R* cos i from the same set) | -0.62σ |
| P (d) | 3.524541 | 4.95e-05 | 1.06e-05 | — | 3.524749 ± 3.80e-07 (Knutson et al. 2007) | -4.20σ |
| T14 (d) | 0.126280 | 0.0010 | 2.19e-04 | — | 0.128000 ± 1.25e-04 (Knutson et al. 2007 (3.072 h)) | -1.68σ |

## Timing, and what a device is asked to do

A fit is priced before it starts (`estimate()` in `js/inference/manifest.js`)
and refused, with its reason, when it would take too long. The limits:

| | Low-end | Desktop |
|---|---|---|
| Which devices | 4 cores or fewer, or 4 GB or less | the rest |
| Realms at once | 2 | one per spare core, at most 8 |
| Rows | 50,000 | 200,000 |
| Model evaluations | 400,000 | 4,000,000 |
| A request, typically | 3 min | 10 min |
| One task (the fit, or one profile) | 2 min | 5 min |
| Period-search trials | 200,000 | 200,000 |

The price is work over a rate. Work is counted in row-passes: one model
evaluation is a pass over the rows, plus the points in transit times the
exposure samples times the rings, and one period-search trial is two passes.
It gives a typical time, at the median case's rate, and the most a request
may take, at the slowest fit's and profile's. A request is refused on the
typical time; the panel shows both. The scheduler's per-task timeout is
there for a fit that runs past even the slower figure. The page never
freezes, because none of the work is on it.

### The rates, in CPU time

`npm run bench:inference -- --cpu`: each case, one seed, its fit and one
profile, timed in the thread's own CPU time. This was on an Intel Core
i5-10500 (6 cores, 12 threads) under Node v24.4.0, whose V8 is the
engine the browser's Workers run.

The machine was loaded by other work throughout (load average
112), and the clock would have measured that work. Here, wall
times ran about three times the CPU times. Two runs of the CPU times agreed
within 3% for every light curve, and within 7% for the velocity fits, which
take a tenth of a second.

| Case | Rows | Fit | One profile | Fit rate | Profile rate |
|---|---|---|---|---|---|
| hd209458 | 1,916 | 594 ms | 2437 ms | 8,552 | 8,407 |
| shallow | 1,916 | 884 ms | 3278 ms | 5,744 | 6,249 |
| grazing | 1,916 | 6931 ms | 1526 ms | 733 | 13,430 |
| noisy | 1,916 | 1123 ms | 3037 ms | 4,521 | 6,746 |
| long | 1,916 | 995 ms | 822 ms | 14,654 | 24,922 |
| rv-circular | 40 | 260 ms | 34 ms | 3,005 | 5,049 |
| rv-eccentric | 40 | 134 ms | 31 ms | 5,829 | 5,565 |
| rv-sparse | 12 | 70 ms | 18 ms | 3,341 | 2,818 |
| tess-hd209458 | 1,882 | 928 ms | 2002 ms | 5,376 | 10,053 |

Rates are row-passes per millisecond, by the price's own count. The spread
is the price's error. A grazing transit's fit takes ten times its count's
share, because its refinement converges slowly from every start: that is the
slowest fit rate, and it sets the "most" figure. The low-end device is
modeled as a quarter of this machine, as the experiments are, because
Chromium will not slow a Worker down.

### What each request costs

| Request | Desktop, typical / most | Low-end, typical / most | Refused |
|---|---|---|---|
| TESS light curve, all 7 fitted, profiles | 15 / 36 s | 69 / 164 s | — |
| the same, no profiles | 1.0 / 6.9 s | 3.8 / 28 s | — |
| the same, b fixed, no profiles | 0.4 / 2.8 s | 1.8 / 11 s | — |
| 40 velocities, profiles | 0.4 / 1.4 s | 1.8 / 6.0 s | — |
| a 45,000-row light curve, profiles | 351 / 847 s | 1639 / 3898 s | low-end: tooSlow |
| the TESS curve, P from 0.5 to 20 d | 68 / 544 s | 273 / 2206 s | low-end: tooSlow |

- The typical figures include a realm's set-up for each stage.
- Profiles run at the device's realms, at the parallel share the experiment
  benchmark measured for CPU-bound Workers on this machine: 0.5 at five
  realms and 0.85 at two (EXPERIMENTS.md).
- **Not yet measured:** the browser benchmark (`npm run bench:inference`,
  real Workers, wall time and the page's frame gaps) refuses to record on a
  loaded machine, and this one never became quiet enough while this work was
  done. It is the check to run next on a quiet machine. The CPU-time rates
  stand in until then.

## Tests

- `tests/inference.test.js`, the numerics without a page:
  - the transit against the exact overlap for a uniform star, its
    closed-form center depth, symmetry, duration and exposure smearing;
  - Kepler's equation to 10⁻¹², and the orbit's conjunction and mean;
  - the linear algebra;
  - recovery of an HD 209458 b-like transit and of an eccentric orbit, in
    absolute values, within their stated uncertainty;
  - the same answer twice; fixed parameters held, and fitted ones kept
    inside their bounds;
  - cancellation;
  - unweighted fits, non-detection, dilution, time units, and instrument
    numbering;
  - the manifest's validation, provenance and fingerprint, and the price
    and its refusals.
- `e2e/inference.spec.js`, the panel in a browser, against the sources and
  `dist/`:
  - nothing of the core loads before the panel is opened;
  - the fit runs in a Worker that closes and leaves the page's data
    untouched;
  - the manifest exports;
  - a cancel closes every realm;
  - an oversized request is refused before any realm starts;
  - a change to the data clears a stale result;
  - no axe violations.
- `npm run validate:inference` and `npm run bench:inference`, the manual
  instruments behind the tables above.

## Decisions

Made under Carl's standing instruction, for review.

1. **Least squares with a grid, not a sampler.** The prompt asked for
   transparent weighted least squares first. A posterior sampler is later
   work, and the validation below is the baseline a sampler must beat.
2. **Five uncertainty numbers, and none of them called a confidence
   region.** A reader sees the covariance, scaled, correlated-noise, profile
   and slice numbers side by side. The validation says how often each holds
   the truth, and where they disagree, that is the finding.
3. **Transit-only on real data.** There is no radial-velocity pack for the
   TESS star, so nothing here states a mass or a density. The orbit model
   is validated on injections and waits for a curated dataset.
4. **Dilution is a fixed setting, never fitted.** A light curve alone cannot
   separate it from a smaller planet. Fitting it would return whatever the
   bounds allowed, with an uncertainty that looks like a measurement.
5. **The transit by direct quadrature, not elliptic integrals.** It is slower
   and every step is visible. Its error is measured: 3.5 ppm at the default
   32 nodes, sixty times below the 213 ppm a point of the TESS light curve
   carries.
6. **The experiment runner's scheduler, not a Worker path of its own.** It
   now takes a task's `accept` and `message`. The inference core gets the
   same concurrency, timeouts, cancellation and progress an experiment has,
   and no second implementation of them.
7. **Models in the time column's own unit.** An epoch in BTJD stays in
   BTJD, and a duration comes back in the unit the data is counted in. Only
   the period search's hour-long trial durations are converted.
8. **Priced in row-passes, from a measured rate.** `estimate()` counts the
   work the way the core does it. The benchmark measures this machine's rate,
   and a low-end device is modeled at a quarter of it, as the experiments
   are, because Chromium does not throttle a Worker.
9. **A diagnostic panel on `/observatory/`, not a new page.** The data is
   already there in its canonical shape, and the panel loads only when it is
   opened. Its strings are a catalog fragment of their own
   (`js/i18n/en.inference.js`), registered when it loads. It imports nothing
   from the page, whose modules arrive in its context. Otherwise esbuild
   would split them into a chunk every visitor fetches.
10. **The observatory stops loading its packs through the resolver.**
    Importing `js/platform/resolver.js` installs every packaged lesson's
    loaders, and brought the investigations manifest to a page that never
    uses it. Loading from `js/platform/builtins.js` directly saves 22 KB of
    the build's start-up and 60 KB in 9 requests of the sources. The route's
    ceilings were lowered to keep the saving.
11. **`STATUS` and `isTrialResult` move to `js/experiments/status.js`**,
    re-exported by the manifest. The scheduler no longer brings the
    experiment manifest and its CSV writer to every page that runs tasks
    through it.
12. **No new dependency.** The linear algebra is Cholesky on matrices of at
    most seven rows, and a package for it would cost more than it saves.
