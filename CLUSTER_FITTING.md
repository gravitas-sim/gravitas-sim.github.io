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

| Leg | What | Status | Measured |
|---|---|---|---|
| A1.imf | the IMF's integrated weight of a mass interval against the closed form of each power-law piece and across the break, and the weights of adjacent intervals summing to ... | pass | max relative error 0 (additivity 2.2e-16) |
| A2.colourRow | a vertical isochrone (colour 0.50 from g 16.0 to 19.0, equal weight per unit magnitude, constant errors 0.05 in g and in r): each interior row's colour distribution ... | pass | max probability error 7.9e-4 (bound 0.01) |
| A3.normalisation | the model's row probabilities p_jk sum to 1 in every row, are at least eps u_k, and the largest per-star penalty is -2 ln(eps / 45) | pass | row sums 1 to 1.1e-15; penalty exact |
| A4.deviance | the deviance of counts against their own row fractions is 0, against any other probabilities is at least 0, and equals a hand evaluation on a 2-row, 3-column example | pass | 0 to 9e-16; hand evaluation to 3.6e-15 |
| A5.shiftLaws | with constant errors, shifting the distance modulus by whole rows moves every row's colour distribution by the same number of rows, and the reddening shifts the ... | pass | 0 and 1.6e-17 |
| A6.interpolationExact | the interpolated isochrone at a grid age equals the grid isochrone | pass | grid ages exact (0); morph within its resampling chord, reported |
| A7.interpolationLOO | leave one out: the isochrone at each interior grid age (9.1 to 9.5, three metallicities) interpolated from its neighbours 0.1 dex each side, against the grid ... | pass | median 0.041, p95 0.69 scaled units (bounds 0.5, 2); worst case [Fe/H] -0.25, log age 9.1, p95 3.19 |
| A8.syntheticTruth | a synthetic dataset drawn at fb = 0 and no errors lies on the isochrone it was drawn from (maximum distance from the polyline 1e-9 mag), its members' mass weights ... | pass | distance 2e-14 mag; KS 0.0075 (bound 0.03) |
| B1.binnedAgreement | the independent implementation (numpy/scipy, written from the document: its own morph, its own forward model by dense Monte Carlo of 4e5 draws per isochrone, its own ... | pass | deviances within 3 or 3 percent at the test points; best fits within 0.003 dex, 0.003 mag (S1) |
| B2.unbinned | the oracle's unbinned conditional likelihood (each star's colour density at its own magnitude, summed over isochrone points with exact normal kernels) places the best ... | pass | best fits within 0.003 dex and 0.020 mag of the unbinned oracle (bounds 0.06, 0.12) |
| B3.posteriorWidth | emcee (Foreman-Mackey et al. 2013) on the oracle's unbinned likelihood, flat in the grid's box: the standard deviation of each marginal against half the kernel's ... | pass | emcee width over half the profile interval: 0.80 to 1.23 (band 0.5 to 2) |
| C1.coverageAge | the 1-sigma profile interval of log age holds the truth at the stated rate on 100 seeds of the well-specified ensemble (an interval that fails to close counts as not ... | pass | 0.67 of 100 (band 0.56 to 0.80) |
| C2.coverageDm | the same for the distance modulus | pass | 0.60 of 100 (band 0.56 to 0.80) |
| C3.coverageBinaries | REPORTED, no band: the same two coverages and the median biases of log age and dm on the ensemble with a binary fraction of 0.30, which the model does not have; the ... | reported | REPORTED: fb 0.30 unmodelled: age 0.29, distance 0.08; median bias +0.011 dex, -0.039 mag |
| C4.recovery | the median fitted log age and dm over the well-specified ensemble are within 3 median half-widths / sqrt(n) of the truth | pass | median bias +0.0007 dex, +0.0008 mag, inside 3 sigma/sqrt(n) |
| C5.valley | the age-distance degeneracy: on the well-specified ensemble the correlation of log age and dm in the 2.30 region of the deviance surface is negative on at least 90 ... | pass | correlation negative on 96 percent; median -0.40 (band -0.98 to -0.20) |
| D1.tooFew | N = 30 stars: at least 95 percent of 20 seeds return 'not constrained' with the member count named; the well-specified ensemble's first 60 seeds return it on at most ... | pass | 20 of 20 not constrained; control 0 of 60 |
| D2.fieldOnly | a field with no cluster: at least 95 percent of 20 seeds return 'not constrained' and never an age | pass | 20 of 20 not constrained, no age given |
| D3.wrongMetallicity | the truth at [Fe/H] -0.50 fitted at -0.25: in at least 90 percent of 20 seeds the 1-sigma interval of log age or of dm excludes the truth, so the stated assumption ... | pass | 20 of 20 exclude the truth; median bias -0.127 dex, +0.27 mag |
| D4.wrongReddening | REPORTED, no band: the median bias of log age and dm with the reddening wrong by 0.058, and the share of seeds whose intervals exclude the truth | reported | REPORTED: bias +0.13 dex, -0.15 mag; intervals excluded the truth in 20 of 20 (1 seed excluded from the fit) |
| D5.wrongContamination | REPORTED, no band: the same coverages with the true contamination 0.30 and 0.02 against the model's 0.15 | reported | REPORTED: contamination 0.30: coverage 0.50 and 0.65; 0.02: 0.70 and 0.65 |
| D6.edge | a cluster at the oldest age of the grid (log age 9.6, 20 seeds): an interval that runs into the grid's edge is reported open on that side and the result says 'older ... | FAIL | FAILED: 15 of 20 flagged at the edge, 0 closed across it, 5 closed intervals within 0.02 dex of the edge (the committed predicate asks for best age below 9.58) |
| E1.ngc2420 | NGC 2420's SEGUE members (velocity 65 to 85 km/s, g 14.5 to 20.5, both colours present) at [Fe/H] -0.25, E(g - r) 0.042, contamination 0.20 (the neighbouring velocity ... | FAIL | FAILED: 2.34 Gyr (2.30 to 2.42), distance modulus 11.82 (11.81 to 11.84), 2312 pc; the committed ranges are 1.74 to 2.2 Gyr and 12.06 to 12.54 |
| E2.errorModel | the error model against the SDSS photometry pack's own per-star errors: in each of the magnitude bins 15 to 17, 17 to 19, 19 to 20, 20 to 21 the median catalogued g ... | pass | median catalogued/model error ratio 0.73, 0.77, 0.75, 0.61 (band 0.5 to 2) |
| P1.speed | one fit of S2 (31 ages by 151 distance moduli) runs in at most 20 s of CPU, recorded and not a physics bound | pass | 1.4 s CPU for one fit (recorded, not a physics bound) |

Failed legs stay failing (`tests/fixtures/cluster-fit/failed-legs.json`; only Carl resets a bound; no amendment was made to
`thresholds.json`). **E1** fails because the metallicity is stated, not fitted: at -0.25 the same members give 2.34 Gyr and a modulus of 11.82,
and Part B (`CLUSTER_FOUR_PARAMETER_GATE.md`) asks whether the data can fit it. **D6** fails against the strict predicate only: no
interval was ever closed across the grid's edge, but a closed interval ending just inside it with a best age within 0.02 dex of the edge is
counted a violation; the kernel now also says "older than the models reach" whenever the upper age interval is open. The oracle's
provenance (numpy 1.26.4, scipy 1.13.1, emcee 3.1.6; MATCH, BASE-9 and ASteCA were not installed and not downloaded) is
`tests/fixtures/cluster-fit/oracle-provenance.json`. Numbers are from Node 24.4.0; the kernel is deterministic and the ensembles seeded.

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
