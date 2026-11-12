# The galaxy-cluster kernel: dispersion, virial mass, light and morphology (Prompt 250)

Kernel, contract and validation-gate document. `js/kernels/galaxy/clusters/` weighs a cluster of galaxies from a table of redshifts, positions and magnitudes: membership by an iterated sigma clip, the velocity dispersion with its uncertainty, the virial mass with its projection factor and its three uncertainty terms, the cluster's light and mass-to-light ratio, the morphology-density relation as a measured fraction with exact binomial intervals, and the baryon budget from a cited gas mass. It is **invisible and documentation** work: no panel, no lesson, no model section, no pack. **Nothing was fetched and no published value was typed**; every authentic-data leg is NOT RUN and the exact request for the files is below.

- The thresholds and the verdict function: `tests/fixtures/clusters/thresholds.json`, committed (87324361) before the kernel, the oracle, the validator or any table existed. Two amendments (AM1, AM2) were recorded before the first oracle or validator run; no bound moved.
- The validator: `npm run clusters:validate` (`tools/clusters-validate.mjs`), reading its bounds from that file. The independent oracle: `tools/clusters-oracle/oracle.py` (Python 3.9.22, numpy 1.26.4, scipy 1.13.1, astropy 6.0.1; no Gravitas code).
- Pinned: `oracle-inputs.json`, `oracle-results.json`, `results.json`, `failed-legs.json` and the kept first run `run1-results.json`, all in `tests/fixtures/clusters/`.
- Tests: `tests/clustersKernel.test.js` (unit), `tests/clustersResults.test.js` (holds the pinned table and re-runs the validator). Validation group: `js/validation/groups/galaxyclusters.js` (six checks, in `npm run validate:physics`).

## What is built and what is not

Built, in `js/kernels/galaxy/clusters/` (not re-exported by the galaxy index; imported by no shipped module and listed in `NEVER_PRECACHED`):

| File | Holds |
|---|---|
| `velocity.js` | the linear rest-frame velocity, the MAD scale, the iterated sigma clip, the truncation factor of the clip |
| `dispersion.js` | the plain and the biweight dispersion, analytic and bootstrap uncertainty, per-galaxy error subtraction, the kurtosis and contamination diagnostics |
| `geometry.js` | great-circle separations, the flat-cosmology angular-diameter distance, the half-number and harmonic radii |
| `mass.js` | the virial mass `M = K sigma^2 R / G`, its three-term interval, the baryon budget |
| `light.js` | the cluster's light from member photometry, the mass-to-light ratio |
| `morphology.js` | local projected density, the binned class fraction, the exact Clopper-Pearson interval |
| `analyse.js` | the whole analysis of one table |
| `synthetic.js` | labelled synthetic clusters with a truth manifest |

**Not built, and why** (the consumers rule of Carl's 2026-11-05 rulings holds them until a gate passes, and no cluster table was supplied): the cluster panel (the redshift histogram, membership, the dispersion, the mass with both uncertainty terms, the morphology-density plot); the investigations "Zwicky's problem" and the upper depth of "Where galaxies live"; the model page section; instructor materials and Spanish strings; every pack, the **Coma pack's re-sourcing and the retirement of the "illustrative" label of Prompt 123 included** (the label stays: the values it labels are still round and unsourced); the second cluster; any X-ray model; a background-subtracted dispersion; any luminosity-function correction for light below the limit; any substructure or non-Gaussian model. The Run condition asks for a rights decision on the cluster table; none was made (below).

## The rules the kernel follows (`thresholds.json`, `analysisRule` R1 to R15)

- **Velocity** `v = c (z - z_c) / (1 + z_c)`; the exact relativistic relative velocity differs by `z_rel / 2`, priced in leg A1 (a relative 0.50 of `v/c`, inside the committed 0.51).
- **Pre-selection** by a physical aperture (Mpc, converted with `D_A` at the caller's redshift guess and again at the first pass's cluster redshift), an optional redshift window and an optional velocity extent.
- **Membership**: an iterated clip of `u = c (z - z_0)/(1 + z_0)`, first about the median with `MAD / Phi^-1(3/4)` (computed, not typed), then about the mean and standard deviation of the kept set, at `kappa = 3`, at most 10 passes, until the kept set repeats. A set that does not repeat, or that returns to an earlier non-predecessor set, is `not-constrained` (`clip-not-converged`). Below `sqrt(3)` the clip has no truncated-Gaussian fixed point: `bad-clip-level`.
- **Dispersion**, plain by default: `s = sqrt(sum (v - mean)^2 / (n - 1))`; the reported value divides by `x*(kappa)`, the root of `x^2 = V(kappa x)` with `V(a) = 1 - 2 a phi(a) / (2 Phi(a) - 1)`, because a clip at kappa leaves a Gaussian parent cut at `kappa s` (for kappa 3, `x* = 0.984846`; the raw dispersion is reported beside it). The correction is exact for a Gaussian parent and says nothing for any other. Per-galaxy velocity errors come out in quadrature before the correction; the error is `(s / sigma_int) * s / sqrt(2 (n - 1)) / x*`. The biweight scale is the robust alternative, with **no default tuning**: `cLocation`, `cScale` and a source are the caller's, and its error is a seeded bootstrap.
- **Members needed**: 20. Fewer is `not-constrained`, never a number.
- **Flags** (they block the claim, they change no number): `non-gaussian` when the unbiased excess kurtosis exceeds 3 of its Gaussian standard errors; `contaminated` when the expected count of field galaxies inside the clip window (from the density outside it, needing `velocityExtentKms`) exceeds 0.10 of the members. No background correction is applied.
- **Radius**: the half-number radius (median projected distance from the caller's centre) or the harmonic radius, with a seeded bootstrap uncertainty. A radius belongs to the aperture the members were chosen in; the mass is the mass within that aperture under the stated factor.
- **Virial mass** `M = K sigma^2 R / G` with the projection factor **supplied, never defaulted**: `{value, sigma, source, radiusKind}`. `ln M` gives the interval `M exp(+- z s)` with `s = sqrt((sigma_K/K)^2 + (2 sigma_s/sigma)^2 + (sigma_R/R)^2)`; the statistical part (dispersion and radius), the factor's part and the interval with and without the factor's term are all reported. The interval stands for the sampling error and `K`'s stated uncertainty only.
- **Light** `L/L_sun = 10^(-0.4 (M_abs - M_sun))` with the caller's solar absolute magnitude and source; the sum is over members brighter than the caller's limit and is a **lower bound** unless the caller supplies the missing share; the mass-to-light ratio is then an **upper bound**.
- **Morphology-density**: `Sigma_N = N / (pi d_N^2)` from the caller's neighbour count, bins in `log10 Sigma`, the fraction of the caller's class set per bin with the exact Clopper-Pearson interval. Neighbours beyond the aperture are not in the table, so the density near the edge is underestimated. The class labels are data; the kernel holds no classification rule.
- **Baryon budget**: gas and baryon fractions from a cited gas mass and stellar mass, relative errors in quadrature, refused without a source, a sigma and the aperture of the gas figure. No X-ray modelling.

## The synthetic worlds (labelled SYNTHETIC, with a truth manifest)

The **toy cluster** is a truncated `r^-2` sphere (`r = r_t U`, `cos(theta)` uniform) with isotropic Gaussian velocities of dispersion `sigma` at every radius. It is **not a self-consistent system and no equilibrium is asserted**; its declared truth is the mass of the singular isothermal halo that would bind such tracers, `M(<r_t) = 2 sigma^2 r_t / G`. The projected half-number radius is `x_half r_t` with `P(x) = 1 - sqrt(1 - x^2) + x arccos(x) = 1/2` (`x_half = 0.360035`), so the projection factor that makes `K sigma^2 R_half / G` equal that mass is `K_phys = 2 / x_half = 5.5550` (a property of this toy, not of any cluster). The ensemble draws the member count log-uniform in 40 to 300, `sigma` in 400 to 1200 km/s, `z_c` in 0.02 to 0.15, `r_t` in 1 to 2 Mpc, 2 percent interlopers uniform over +-8000 km/s, a 50 km/s velocity error declared to the kernel, and a redshift guess within +-1500 km/s. Redshifts are the exact inverse of the kernel's linear velocity. `bimodal`, `field` and light worlds are in `synthetic.js`; every number is round and a claim about nothing.

## Validation contract and measured table (Node 22.23.4)

Run 1 (kernel 6fd19769, kept as `run1-results.json`): 26 pass, 4 fail. **A4 failed because the kernel took the sampling error of the dispersion from the corrected dispersion instead of the observed one, against rules R7 and R8 as committed; the oracle had the same misreading, so B2 passed in run 1 with the shared defect and the closed form written in leg A4 is what caught it.** Both were repaired to the committed formula; no bound moved. The final table: **42 rows: 27 pass, 3 fail, 4 not run, 8 reported**, kernel verdict **B**, product NOT ESTABLISHED.

| Leg | Status | Measured |
|---|---|---|
| A1.restVelocity | PASS | worst error 2.7e-12 km/s; linear against relativistic differs by 0.50 of v/c |
| A2.truncationFixedPoint | PASS | x*(3) = 0.984846; residual 1.1e-16 |
| A3.plainDispersion | PASS | all five invariances to 1e-15 |
| A4.errorSubtraction | PASS | intrinsic dispersion and its error agree to 1e-15 |
| A5.massClosed | PASS | closed form, quadrature terms and intervals to 1e-16 |
| A6.regularGeometry | PASS | half-number 3e-14, harmonic 1.0e-07, separation exact |
| A7.truncatedSphereGeometry | PASS | x_half 0.360035; sample of 200000 within 0.09 percent; K_phys 5.5550 |
| A8.clopperPearsonExactCoverage | PASS | worst exact coverage minus level 0.0057 (never below); closed forms 2e-15 |
| A9.kurtosisAndSe | PASS | closed forms to 0 |
| A10.lightClosed | PASS | luminosities, sums, errors, share to 1e-14 |
| A11.massToLightClosed | PASS | 500 and its error exactly |
| A12.localDensity | PASS | densities and bins exact |
| A13.baryonBudget | PASS | fractions, errors and three refusal codes |
| A14.syntheticClusterRecovery | PASS | five worlds: |z| at most 1.5 (dispersion) and 1.3 (mass); completeness at least 0.995, purity at least 0.987 |
| B1.dispersionOracle | PASS | 30 of 30 kept sets identical; worst relative 2e-15 |
| B2.geometryAndMassOracle | PASS | distance, radii, mass, interval ends within 2e-11 |
| B3.binomialOracle | PASS | 60 intervals, worst 4e-15 |
| B4.kurtosisDensityOracle | PASS | 30 of 30 bin counts equal; kurtosis 1e-13, density 2e-11 |
| B5.lightOracle | PASS | 10 worlds, worst 7e-14 |
| C1.dispersionCoverage | PASS | coverage 0.65 and 0.93 (bands 0.613 to 0.753, 0.917 to 0.983); mean z -0.06969 |
| C1b.dispersionBootstrapCoverage | FAIL | bootstrap coverage 0.6025 and 0.885: both below their bands |
| C2.massCoverageStatistical | PASS | coverage 0.685 and 0.9575 |
| C3.massCoverageWithFactor | PASS | coverage 0.6375 and 0.9225 (lower band edges 0.613, 0.917) |
| C4.lightCoverage | FAIL | light coverage 0.46 and 0.74 against bands from 0.563 and 0.89 |
| C5.membershipRecovery | PASS | completeness 0.9962, purity 0.9953 |
| D1.fewMembers | PASS | counts 0, 1, 2, 5, 19 not constrained; 20 answered or stated |
| D2.nonGaussianFlag | PASS | 100 of 100 bimodal worlds flagged; clean false flags 0 |
| D3.contaminationFlag | FAIL | 74 of 100 flagged (0.74) against 0.9; clean false flags 0 |
| D4.inputRefusals | PASS | 12 of 12 refusals with the stated codes |
| D5.clipIterationCap | PASS | forced single pass not-converged; ensemble maximum 5 passes, none unconverged |
| E1.comaPublished | NOT-RUN | NOT RUN: no table supplied, nothing fetched |
| E2.independentAnalysis | NOT-RUN | NOT RUN: no table supplied, nothing fetched |
| E3.morphologyDensityAuthentic | NOT-RUN | NOT RUN: no table supplied, nothing fetched |
| E4.massToLightAuthentic | NOT-RUN | NOT RUN: no table supplied, nothing fetched |

The reported rows (no bound): the tree's solar mass is 3.0e-4 above astropy's (R2; the tree's G equals astropy's, R3); the contamination ladder (R4: the fractional bias of the dispersion is 0.0006, 0.007, 0.020, 0.035, 0.084 and 0.35 at interloper fractions 0, 0.02, 0.05, 0.1, 0.2 and 0.5, and the `contaminated` flag fires in 0, 0, 0, 0, 3 and 66 percent of them); the truncation correction (R5: raw mean bias -1.2 percent, corrected +0.3 percent, one-sigma coverage 0.64 and 0.6375); a field with no cluster (R6: all 100 are answered with a dispersion near 4400 km/s and no flag); a mismodelled mass (R7: without the factor's term the C3 worlds are covered at 0.51 and 0.81, and a true departure of 0.4 against the stated 0.15 is covered at 0.25 and 0.72); biweight against plain with 10 percent interlopers (R8: mean bias +1.9 and +2.6 percent, spread 9.1 and 9.4 percent).

The oracle checks the analysis, not the bootstrap (amendment AM1): the kernel's radius uncertainty is a declared input to the oracle's interval, and the bootstrap is judged by the coverage legs only.

## The failing legs, and what they mean

All three are left failing and labelled in `failed-legs.json`; no bound moved.

- **C1b, the bootstrap interval of the dispersion undercovers**: 0.6025 at one sigma (band from 0.613) and 0.885 at 95 percent (band from 0.917). The percentile bootstrap of a standard deviation is known to be narrow at small `n`; the analytic interval (C1, 0.65 and 0.93, mean z -0.07) is the default and the bootstrap is the option the biweight must use.
- **C4, the light interval undercovers**: 0.46 and 0.74 against bands from 0.563 and 0.89. The interval carries photometric errors only (a claimed relative sigma near 0.8 percent against an actual root-mean-square error of 1.6 percent in a diagnostic run). The diagnostic, not a leg and not run against the committed bounds: when the truth is evaluated at the kernel's own cluster distance the coverage rises to 0.61 and 0.88, so the main missing term is the distance modulus's dependence on the cluster redshift's own statistical error (`L` goes as `D_L^2`, which at low redshift moves by about 1 percent per `sigma_z`); the roughly 0.4 percent of true members the clip removes (C5) is a smaller one. The kernel was not changed.
- **D3, the contaminated flag is raised in 74 of 100 heavily contaminated worlds** against the committed 90 percent. A world with a small dispersion has a narrow window and so few interlopers inside it that its share of the members stays under 0.10 and the rule does not flag it, which is the rule working as written; the committed bound did not take the dispersion into account. The ladder in R4 is the more useful finding: the flag fires only after the bias is already large (at 20 percent interlopers the bias is 8 percent and the flag fires 3 percent of the time).

The kernel verdict is **B**: the closed forms, the dispersion's and the mass's arithmetic, the geometry, the oracle agreement, the refusals and the non-Gaussian flag are claimable; the bootstrap interval, the light interval and the contamination flag as committed are not.

## Rights and the authentic legs (7.5 rule 4)

**No rights decision was made and nothing was fetched.** The Run condition names a public-domain NASA extragalactic database extract, a CC BY paper's table, or the existing Coma pack re-sourced to a cited paper. None was read in this session, so there is no recorded basis, no table, no retrieval date and no terms as read. E1 to E4 are NOT RUN. Carl fetches the files himself (DECISIONS_2026-11-05.md); the exact request:

1. **The member table of one cluster** (the Run condition names Coma; a second is optional). One source per intended redistribution form, chosen by Carl from: an extragalactic database's redshift table for a cone, a survey's spectroscopic redshift table for a cone, or a machine-readable table of a CC BY paper. Save the **raw response file** unmodified, and next to it a text copy of the **terms page as read**, the **retrieval date**, the **data release or version**, and the **query** (centre, radius, redshift range). Fields wanted: an identifier, ra and dec (degrees, equinox named), redshift, its uncertainty (or a velocity error) and whether it is heliocentric, the redshift's origin per galaxy where given, one or more magnitudes with band, system and aperture type, the source of the K-correction and the extinction, a morphological or spectral class with the named classifier and its reference, and flags. Place under `tests/fixtures/clusters/authentic/` with a `SOURCES.json`.
2. **One cited independent analysis of the same cluster** (for E1 and E2): the paper, and the page and table that give the dispersion, the virial mass, the radius and its definition, the projection factor and its definition, the aperture, the member selection and the software with its version, with the numbers **as printed** and their uncertainties. Save the page text under its terms.
3. **A solar absolute magnitude in the band, with its source** (for E4), and optionally a cited gas mass with its aperture (for the baryon budget) and the source of conventional biweight constants.
4. **The rights basis for each file**, chosen from the 7.5 rule 4 list (public domain; CC BY; CC BY-SA or NC under the existing labelled mechanisms; "no licence stated, credited" only as its own recorded decision).

When the files land, a later session writes the reader and runs E1 to E4 under the contract already committed (agreement within `2 sqrt(s_kernel^2 + s_published^2)`, the member-sample difference reported). The published values were not used to tune any rule here.

## Open questions for Carl (alternatives, none applied)

1. **Consumers rule.** Hold the panel, the two investigations, the model section and the pack until a gate passes (the recommendation) or release them on kernel verdict B.
2. **C1b.** Keep the analytic interval as the default and the bootstrap as a labelled option, or commit a new leg for a better interval (studentised or a corrected percentile) with thresholds committed first.
3. **C4.** A new leg that carries the distance-modulus term from the cluster redshift's uncertainty (and prices the clipped members), thresholds committed first, as the failed C4 stays on record.
4. **D3.** A new flag leg defined on the dispersion's expected bias rather than on a share of the members, and a lower share threshold, thresholds committed first; and a background-corrected dispersion as a separate option.
5. **A field with no cluster** (R6): the kernel answers a uniform field with a confident dispersion and no flag. A new refusal leg built on a stated overdensity test, thresholds committed first.
6. **The projection factor.** Which published factor and which radius definition the lessons use is Carl's to verify; the kernel takes it with a source and a radius kind.
7. **The truncation correction is on by default** (rule R6, the raw value is reported beside it). R5 prices it at 1.5 percent.
8. **The tree's solar mass** is 3.0e-4 above astropy's (R2); displayed solar-mass figures would keep the tree's rounded value, as in the lensing document.

## Inherited limits to state in claims built on this kernel

- Every number here is on an invented, labelled world; a virial mass from a real table is an estimate under equilibrium, isotropy and an unbiased member sample, which no leg here validates, and the toy cluster is not in equilibrium.
- The coverage legs prove the propagation of the stated errors on a Gaussian toy; the factor `K` stands for the model error, and R7 prices what it does not cover.
- The clip's correction is exact for a Gaussian parent; interlopers inside the window bias the dispersion up and nothing is subtracted for them (R4).
- The radius and the mass belong to the aperture; the centre is the caller's and carries no uncertainty.
- The light is a lower bound and the mass-to-light ratio an upper bound unless the caller gives the missing share; the cluster-distance error is not in the light interval (C4).
- The linear rest-frame velocity differs from the relativistic one by `v / 2c`, 0.3 percent at 2000 km/s.
- Local densities near the aperture's edge are underestimated.


## The follow-up legs (250b)

Carl's rulings of 2026-11-06 (`DECISIONS_2026-11-06.md`): hold the consumers rule; C1b stays failing, the analytic interval stays the default and the bootstrap is a labelled option (no new leg); **new legs, thresholds committed first, for C4 (the distance term), D3 (a flag on the expected bias) and the field with no cluster (R6)**; the truncation correction stays on by default with the raw dispersion beside it; the tree's rounded solar mass is kept for displayed figures (3.0e-4 above astropy's, R2 and R9). Nothing here is a background-corrected dispersion, a panel, a lesson or a pack.

- **Contract.** `tests/fixtures/clusters/followup-thresholds.json` was committed (c35c2278) before any follow-up code, oracle or run; every bound has its rule written beside it and none was set from the numbers of C4, D3 or R6. No amendment. The first gate's `thresholds.json`, `results.json`, `failed-legs.json` and `run1-results.json` are not edited, every new option is opt-in with the old behaviour as its default, and leg X1 (and `tests/clustersResults.test.js`) re-run the first validator and find all 42 rows, measured numbers included, identical, the failing three still C1b, C4 and D3.
- **Code**: `js/kernels/galaxy/clusters/followup.js` and three opt-in options of `analyseCluster`: `light.distanceTerm`, `contaminationRule: 'bias'` and `requireOverdensity`. The truth manifest of a synthetic world gained one field (`interlopersInsideWindow3Sigma`); no draw changed.
- **R16, the distance term of the light.** `L` goes as `D_L(z_c)^2`, so the cluster redshift's error `sigma_zc = sd(z)/sqrt(n)` gives a relative error `2 (d ln D_L/dz) sigma_zc`, with `d ln D_L/dz = 1/(1+z) + (c/H0)/(E(z) D_C(z))` in closed form, added in quadrature to the photometric term. It carries the cluster redshift's statistical error only (not the cluster's peculiar velocity, the clipped members or the selection scatter at the limit).
- **R17, the flag on the expected bias.** Field galaxies inside the window raise the variance by `(N_b/n)(w^2/3 - s^2)`, so the dispersion's bias is `b = (1/2)(N_b/n)(kappa^2/3 - 1)` to first order (`N_b/n` at kappa 3); `contaminated-bias` is raised when `b` exceeds half the dispersion's analytic relative error (a half-standard-error bias lowers the one-sigma coverage from 0.683 to 0.625). It is an estimate that flags and is never subtracted.
- **R18, the overdensity test.** A field uniform in velocity over the extent puts `mu = n_pre min(1, w/E)` galaxies in the window; the cluster is refused (`no-overdensity`) when the exact Poisson upper tail `P(X >= n_in | mu)` exceeds 0.001. It needs `velocityExtentKms`, is lenient because the window is fitted to the galaxies, and is off by default.

Run (Node 22.23.4, `npm run clusters:followup`; oracle `tools/clusters-oracle/oracle-followup.py`, scipy and astropy, no Gravitas code): **11 rows, 6 pass, 2 fail, 3 reported; follow-up kernel verdict B** (the first gate's verdict B stands).

| Leg | Status | Measured |
|---|---|---|
| A15.distanceTermClosed | PASS | closed form of d ln D_L/dz to 0 (against a central difference 3.5e-11); the light's error, the option-off identity, sigma_zc and the pipeline |
| A16.expectedBiasClosed | PASS | closed forms to 0; threshold at 1/(2 sqrt(2(n-1))); the share rule still flags 0.12 and not 0.08 |
| A17.overdensityClosed | PASS | Poisson tails to 5e-16; refusal exactly where the tail exceeds 0.001; a field answered by default and refused with the option |
| B6.followupOracle | PASS | 12 redshifts to 4.2e-9 relative, 20 Poisson tails to 4.1e-14 |
| C4b.lightCoverageWithDistance | FAIL | coverage 0.58 and 0.88 against bands 0.563 to 0.803 and 0.89 to 0.99: the one-sigma band passes, the 95 percent band is missed by 0.01 |
| D3b.contaminationBiasFlag | FAIL | power 0.956 and false flags 0.039 pass (114 clearly biased, 282 clearly fine worlds); the calibration fails at 50 percent interlopers: estimated 0.139 against realized 0.357, ratio 0.39 against the band 0.5 to 2 (0.75 at 10 percent and 0.65 at 20 percent pass) |
| R6b.fieldRefusal | PASS | 100 of 100 fields refused, 400 of 400 clean clusters answered, the fields answered without the option |
| X1.oldLegsUnchanged | PASS | 42 rows, no difference, C1b, C4 and D3 still failing |
| R9, R10, R11 | reported | solar mass 3.0e-4 above astropy's; the bias ladder; the weak-cluster price |

What the failures say, without moving a bound:

- **C4b**: the distance term roughly doubles the claimed light error (a mean photometric term of 0.8 percent and a mean distance term of 0.85 percent) and the one-sigma coverage rises from 0.46 to 0.58, so the term was real and is not the whole story: the 95 percent coverage of 0.88 is 0.01 under its band. What remains is among the terms the rule names as not carried (the clipped members, the selection scatter at the limit) and was not measured separately.
- **D3b**: the flag does its job (it is raised in 96 percent of the clearly biased worlds and 4 percent of the clearly fine ones, where the first gate's share flag fired in 72 percent of the 50 percent worlds and in 0 of the 10 percent worlds, which are biased by 3.4 percent); the failure is the first-order estimate of the size of the bias, which falls short by a factor 2.6 when half of the galaxies are interlopers, because the window widens as the contamination grows and takes more of them in, a feedback the formula ignores. The estimate is right in order up to 20 percent interlopers.
- **R6b** passes with room, and R11 shows why: the faintest clean cluster of 400 has a tail of 1.4e-6, so the test refused none of them; a cluster that is only weakly over a field (not in this ensemble) is where the 0.001 would bite, and that was not probed.

Questions for Carl (none applied): C4b and D3b as new failed legs (a later contract could add the clipped-member and selection terms to the light, and a feedback-aware bias estimate such as the clip's own fixed point, thresholds committed first); whether the three options become defaults for a lesson (they are opt-in so the first gate stays bit-identical); and a weak-cluster leg for the overdensity test.

## References

Each is cited by author and year only and is **unverified**: Carl verifies the papers before any lesson cites them (DECISIONS_2026-11-05.md).

- Zwicky (1933), the first virial mass of Coma (the problem the instrument is named for).
- Beers, Flynn and Gebhardt (1990), the biweight location and scale.
- Danese, De Zotti and di Tullio (1980), the rest-frame velocity convention.
- Clopper and Pearson (1934), the exact binomial interval.
- Dressler (1980), the morphology-density relation.

<!-- Listed in DOCUMENTS.md. -->
