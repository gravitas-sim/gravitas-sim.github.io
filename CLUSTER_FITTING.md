# Cluster fitting: an age and a distance at a stated metallicity

Roadmap III, Prompt 219 Part A (tranche T3, D-R10-207-01). Branch `feat/cluster-fitting-i`. The kernel is `js/kernels/clusters/`
(`constants.js`, `imf.js`, `isochrones.js`, `hess.js`, `deviance.js`, `fit.js`, `synthetic.js`, `record.js`); the instrument is the
Observatory's cluster panel (`js/observatory/clusterPanel.js`, opened from the colour-magnitude diagram of a table with `g` and `r`);
the checks are `tools/cluster-fit-validate.mjs` (with the independent oracle `tools/cluster-fit-oracle/oracle.py`) and the validation
group `js/validation/groups/clusters.js`; the guide is "Ages from models" (`js/observatory/guides/populations.js`, advanced path). The
validation contract below was committed (`tests/fixtures/cluster-fit/thresholds.json`, commit 823da5c0) before the kernel, the
validator, the oracle, the panel or any guide step existed. Part B, the four-parameter gate, is `CLUSTER_FOUR_PARAMETER_GATE.md`.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/data/observations/mistSdssIsochrones.js` (MIST v1.2, three metallicities, seven ages) and the Observatory's curve comparison (`js/measure/`) | a fit over age and distance that interpolates between the grid, with intervals and the valley, instead of the nearest grid curve | the cluster panel | none; the curve tool stays for the survey path |
| `js/kernels/statistics/intervals.js` (Prompt 154's profile intervals) | a use on a two-parameter surface of this kind | `fit.js` | none (it is called, not copied) |
| `js/platform/artifact.js` (Prompt 150's record) | a record of a fit that says what was assumed | `record.js` | none |
| the extinction ratio of the populations guides (`A_g / E(g - r) = 3.245`, Schlafly and Finkbeiner 2011, D-R9-05) | one named constant | `constants.js` | none; the survey path's curve tool is unchanged |

## Equations, limits, assumptions

1. **Isochrone between grid points.** An isochrone at `(feh, log age)` is a morph of the grid curves around it: each evolutionary
   phase of each neighbour is resampled at equal arc length in scaled units (0.03 in colour, 0.15 in magnitude), the points are blended
   linearly in `log age` (then in `[Fe/H]` when the metallicity is between grid values), and the masses are blended with them. A
   bridging piece between two phases longer than 0.5 mag is dropped. A leave-one-out check (A7) measures the error of this morph.
2. **Weights.** A short piece of the curve between masses `m1` and `m2` carries the weight of the Kroupa (2001) initial mass function,
   `xi(m) ~ m^-1.3` below 0.5 solar masses and `m^-2.3` above, integrated over `[m1, m2]` in closed form (`imf.js`).
3. **The forward model.** Each piece is moved to the cluster (distance modulus `dm`; reddening `E(g - r)` moves it by `E` in colour and
   `3.245 E` in `g`), given independent Gaussian errors in `g` and `r` from the stated error model (`constants.js`: a floor of 0.015 mag
   rising to 0.1 mag at `g = 21.45`), and its weight is spread over a `0.1` mag by `0.04` colour grid: the `g` error by five
   Gauss-Hermite nodes, the colour error exactly (a star's colour is `g' - r'`, so the two errors are correlated as independent band
   errors make them).
4. **The statistic.** In each magnitude row `j` the model's colour probability is `p_jk = (1 - eps) m_jk / M_j + eps u_k` with
   `u_k = 1 / 45` and `eps` the stated contamination (default 0.15), and the deviance is `D = -2 sum n_jk ln p_jk + 2 sum n_jk ln(n_jk / n_j)`.
   The row totals are conditioned on, so the selection in magnitude of the sample (SEGUE's targeting, say) and the luminosity function
   do not enter; a star's penalty is bounded at `-2 ln(eps u)`. It is a Poisson likelihood with a free scale per row, profiled out.
5. **The fit.** The deviance is scanned over `log age` in `[9.0, 9.6]` (step 0.02) and `dm` over a 3 mag range, then a finer lattice
   around the minimum; each parameter's 68.27 percent profile interval is the crossing of `Delta D = 1` (Prompt 154,
   `js/kernels/statistics/intervals.js`). The correlation of age and distance in the `Delta D <= 2.30` region and the valley (the best
   distance at each age) are returned: the degeneracy is shown, not hidden.
6. **Not constrained.** Fewer than 60 members in the window, or a cluster model that does not beat the all-field model by 25 in deviance
   (5 sigma), returns "not constrained" and names the count; an interval that runs into a bound is open on that side and the result
   says "older than the models reach" or "younger than the models reach"; no age is shown for a result that is not constrained.
7. **Assumed, not fitted** (listed with every result and in its record): the metallicity (a grid value or an interpolation), the
   reddening, the extinction ratio, the contamination, single stars (no binaries), the error model, and MIST's non-rotating
   scaled-solar physics. **Metallicity is not fitted in Part A.**

## What was checked

@@VALIDATION@@

## Limits that a reader needs

* The intervals are conditional on every assumption in item 7. The authentic NGC 2420 leg (E1) fails its committed range at the stated
  metallicity of -0.25: the intervals there are about twenty times narrower than the shift a 0.25 dex change of metallicity makes, so an
  interval of this kind is a statement about the noise in these stars given the model, not about the cluster's age.
* A binary fraction the model lacks biases the distance and the age and does not widen the interval (C3 reports how much).
* A fit whose coverage leg failed is never presented: `PRESENTED` in `constants.js` is held to `results.json` by `tests/clusterFit.test.js`.

## References

Choi et al. (2016), ApJ 823, 102 (MIST); Dotter (2016), ApJS 222, 8; Kroupa (2001), MNRAS 322, 231; Schlafly and Finkbeiner (2011),
ApJ 737, 103; Foreman-Mackey et al. (2013), PASP 125, 306 (emcee, used by the oracle); Lee et al. (2008) and Souto et al. (2016) for the
published values of NGC 2420's metallicity and Cantat-Gaudin et al. (2018) for its age and distance.
