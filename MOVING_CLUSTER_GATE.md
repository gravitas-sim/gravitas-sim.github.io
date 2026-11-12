# The moving-cluster gate

Roadmap III, Prompt 234, Part A (tranche T4, D-R10-232-01). One bounded moving-cluster comparison: the Hyades as the candidate, a
Gaia DR3 sample under D-GAIA-01's labelling, a membership rule, the convergent-point method, a tolerance against 233's parallax
distance and a coverage test on synthetic clusters, all committed before any code. **Verdict by the committed function: C.
The amended form, a proposal for Carl to ratify, gives B** (the convergent point and the method's geometry, with no distance).
No kernel, pack, panel, lesson or viewer is built or authorized (consumers rule, Carl 2026-11-05), and no distance is reported:
the moving-cluster distance is shown only as a ratio to the parallax distance, below verdict A. The record is decision-register
rows D-R10-234-01 to D-R10-234-04 and D-R10-234-90. A follow-up section near the end adds a bias-corrected
convergent-point estimator as new legs (follow-up verdict C) and the published-value comparisons; it changes none of the above.

The numbers are in `tests/fixtures/moving-cluster/` (`thresholds.json` the contract, its design findings and three amendments;
`results.json` the gate stream for both forms; `failed-legs.json` every failing leg, labelled; `ensembles.json` the truth manifests of
the synthetic ensembles; `oracle-results.json` the pinned output of the independent oracle). The prototype
(`js/kernels/galactic/movingCluster.js`, `movingClusterSynthetic.js`), the validator (`tools/moving-cluster-validate.mjs`) and the
oracle (`tools/moving-cluster-oracle/oracle.py`) are on `spike/moving-cluster-gate` (bbef546a), never merged (Prompt 234's rule 7.5.4):
this PR is documentation and fixtures only. The gate stream ran on Node 22.23.4 (about 9 minutes for the amended form, 4 for the
committed); the oracle on Python 3.9.22 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1. Two full runs agree row for row (only the
CPU timing and the report fields of R1 differ). After the stream, one wording change was made to `thresholds.json` (the `data.file` text no
longer names a home directory, which the repository text test forbids; no bound, estimator or number changed, and the sha256 recorded in
the result files was updated to the new file's).

## What was committed first

`thresholds.json` (`6d1fbd0e`) fixed before any code, run or statistic of the file: the cluster, the sample and its cuts, the membership
rule, the convergent-point estimator, the speed estimator, the per-star and cluster moving-cluster parallax, the bootstrap, the
refusals, the tolerance, the synthetic truth (a cluster of 300 stars at the query's cone centre, a field of 4,500 passing stars,
errors of the order of the file's first rows, a stated internal scatter), 35 legs each with a set (S synthetic, R real) and a group
(geo: membership and convergent point; dist: speed and distance), and the verdict function:

| Verdict | Condition (committed) |
| --- | --- |
| A | every S and R leg passes: the moving-cluster distance with its interval, beside 233's parallax distance on the same stars |
| B | every geo leg passes and some dist leg fails or is NOT RUN: the convergent point and the method's geometry, no distance |
| C | a geo leg fails or is NOT RUN: a reading step |

What had been seen before committing, and only that: the data folder's README, query and checksum; that the file has 4,873 rows,
2,821 with a radial velocity; the column names and the first three rows; and the register rows, documents and code of 219, 233 and
235. Nothing of the file's distributions, no membership, convergent point, speed or distance. **No published Hyades value was fetched or
typed:** every number in the synthetic truth is a labelled design choice (the position is the query's cone centre).

**The cluster and sample.** Gaia DR3 `gaia_source`, retrieved 2026-11-06T11:13:30Z by Carl (sha256 `5e3c8ab9...90f6`, ESA TAP, a 25 degree
cone at (66.75, 15.87), parallax 12 to 40 mas, parallax over error above 10, a proper-motion box). Licence CC BY-NC 3.0 IGO,
D-GAIA-01 labelling; the file is not committed, and neither is any per-star value (membership is a count and a sha256 of the sorted
source ids). Sample cuts: solution type 31 or 95, RUWE below 1.4 (3,856 of 4,873 rows), and the per-star zero point of 233 (3 rows without
one dropped; 521 stars outside the zero point's stated range are flagged, not removed, as 233 does).

**The method.** Each star's proper motion defines a great circle; the convergent point c is the smallest eigenvector of the sum of
b b^T over members (b the circle's normal), signed so the stars move towards it. With theta the angle of a star from c, the radial
velocity is V cos theta, so V is a one-parameter weighted fit, and the star's parallax is K mu_par / (V sin theta). The cluster's
moving-cluster parallax is the mean of those over the used members with 233's weights (1 / parallax_error^2), so it estimates the same
quantity as 233's `clusterParallax` on the same stars. Membership is an iteration from a seed with four rules (proper motion toward
c, the great-circle offset, a 30 percent parallax window, the radial velocity against V cos theta) and a magnitude rule centred on
the sample's own median, so it truncates scatter and does not select for agreement with the parallax scale. The interval is a
bootstrap of the members with c and V refitted in every replicate. Tolerance: |pi_MC - pi_plx| at most 3 sigma combined and at most 3
percent (stated choices). Everything else is in `thresholds.json` "contracts".

## Design findings and amendments (before the gate stream)

A design stream on a design seed, on synthetic data only and never on the real file, found four things (`thresholds.json` "design"):

* **F1.** The committed seed (mean shift of the density in parallax and proper motion) found a clump of the field, not the cluster.
  **AM1** replaces it with a count in convergent-point space on a Fibonacci lattice (no parallax enters the seed).
* **F2.** With no radial velocities the iteration, which applied the magnitude rule only with a speed, drifted onto the field.
  **AM3** applies the rule without one (it is median-centred, so the speed cancels).
* **F3.** The contract's own parallax window excludes members on the near tail of a cluster 10 percent deep, so the analytic recall
  of 1.0 could not be met. **AM2** restates it over the members inside the window.
* **F4.** The plain eigenvector convergent point is biased: on 40 field-free design clusters pi_MC is +1.29 percent (se 0.14) from the
  weights depending on c, against -0.05 and -0.07 percent when c is the truth. **Not amended** (below).

Each amendment was recorded in `thresholds.json` (`235d11f0`) before any gate-stream seed was run; the committed form is measured
beside the amended one, **the committed form's verdict binds**, and the amended form's is a proposal for Carl to ratify (the pattern of 235).

## Results

| Leg | Set, group | What | Committed form | Amended form | Measured (amended form) |
| --- | --- | --- | --- | --- | --- |
| **A1.cp.exact** | S, geo | noise-free, zero-dispersion cluster: convergent point to 1e-6 deg; every member inside the window found | FAIL | PASS | max error 6.4e-14 deg; recall 1.0 over window members (0.980 to 0.997 over all members, which the committed form requires) |
| **A2.dist.exact** | S, dist | same cluster: speed, per-star and cluster parallax exact to 1e-9 | PASS | PASS | 1.3e-15, 5.1e-15, 3.2e-15 |
| **A3.hand** | S, dist | closed form K mu / (V sin theta) by hand (23.70235223 mas) | PASS | PASS | relative difference 2.2e-16 |
| **A4.approaching** | S, dist | convergent point 130 deg away (negative radial velocities): exact, V positive | PASS | PASS | 1e-14 relative; 2e-13 deg |
| **A5.perpendicular** | S, dist | convergent point 90 deg away: distance refused, convergent point exact | PASS | PASS | 3 of 3 refused as perpendicular; 4e-13 deg |
| **A6.greatCircle** | S, geo | great-circle offset and the sign of t.u, 200 random stars | PASS | PASS | offset 3.6e-16 rad; 200 and 200 signs right |
| **B1.oracle.members.synthetic** | S, geo | independent Python oracle: identical member sets on six pinned realizations | PASS | PASS | Jaccard 1 on all six, statuses agree |
| **B2.oracle.cp.synthetic** | S, geo | oracle convergent point to 1e-6 deg | PASS | PASS | at most 1.1e-13 deg |
| **B3.oracle.dist.synthetic** | S, dist | oracle speed, per-star and cluster parallax to 1e-8; bootstrap sigma within 10 percent | NOT RUN | PASS | at most 7e-15 relative; sigma within 3.8 percent |
| **C1.membership** | S, geo | median recall >= 0.85 and median purity >= 0.90 (E1, 200 realizations) | FAIL | PASS | recall 0.983, purity 0.977 |
| **C2.cp** | S, geo | convergent point: median error <= 1 deg, p95 <= 3 deg, refused <= 5 percent | FAIL | PASS | median 0.39 deg, p95 0.82 deg, refused 0.04 |
| **C3.coverage68** | S, dist | 68.27 percent bootstrap interval covers the truth at a rate in 0.58 to 0.78 | FAIL | FAIL | 0.495 (192 distances, 8 refused) |
| **C4.coverage95** | S, dist | 95.45 percent interval covers at 0.90 to 0.99 | FAIL | FAIL | 0.885 |
| **C5.recovery** | S, dist | median (pi_MC - truth) / sigma within 0.27; median relative bias within 0.005 | FAIL | FAIL | median z +0.89; median relative bias +0.0117 |
| **C6.agree** | S, dist | tolerance rule (3 sigma combined and 3 percent) passes in >= 90 percent when the two agree | FAIL | PASS | 0.91 |
| **C7.useful** | S, dist | median sigma / pi <= 0.02 | FAIL | PASS | 0.0125 |
| **D1.field** | S, geo | a field with no cluster is refused in >= 90 percent (E2, 100) | PASS | PASS | 100 of 100 refused (the committed form refuses everything, E1 included) |
| **D2a.noRv.cp** | S, geo | no radial velocities: convergent point returned in >= 90 percent, median error <= 2 deg, median recall >= 0.80 | FAIL | PASS | 0.98 returned; 0.32 deg; recall 0.983 |
| **D2b.noRv.refusal** | S, dist | no radial velocities: speed and distance null | PASS | PASS | 49 of 49 null |
| **D3.dispersion** | S, dist | internal sigma 5 km/s: refused or covered at 95.45 percent in >= 90 percent (E5, 100) | PASS | PASS | 100 of 100 refused |
| **D4.few** | S, geo | 15 members: refused in >= 95 percent (E4, 100) | PASS | PASS | 100 of 100 refused |
| **D5.expansion** | -, dist | REPORTED: expansion 0.05 km/s per pc, which the model lacks (E6) | REPORTED | REPORTED | median z -4.57; relative bias -0.057; coverage 0 and 0.01 |
| **P1.speed** | -, dist | RECORDED: CPU time of one run, not a physics bound | REPORTED | REPORTED | 0.82 s pipeline; 0.17 s for 4000 replicates |
| **R1.members** | R, geo | Hyades file converges, is not refused, and has >= 30 members with a radial velocity | FAIL | PASS | 497 members, 218 with a radial velocity, 3 iterations |
| **R2.agree** | R, dist | pi_MC against 233 pi_plx on the same stars: <= 3 sigma combined and <= 3 percent | FAIL | PASS | ratio 1.0146 (+1.46 percent), 1.83 sigma combined |
| **R3.useful** | R, dist | sigma / pi <= 0.02 | FAIL | PASS | 0.0079 |
| **R4.split** | R, dist | two seeded random halves agree within 3 sigma (distance) | FAIL | PASS | halves 248 and 249; 1.15 sigma |
| **R5.cpSplit** | R, geo | two halves agree within 3 sigma (convergent point) | FAIL | PASS | separation 0.054 deg; radii 0.125 and 0.107 deg |
| **R6.rvcut** | -, dist | REPORTED: radial-velocity error cut 1 km/s instead of 3 | REPORTED | REPORTED | 498 members; convergent point moves 0.004 deg; pi changes -0.075 percent |
| **B4.oracle.members.real** | R, geo | oracle on the real file: identical members | PASS | PASS | Jaccard 1 |
| **B5.oracle.cp.real** | R, geo | oracle convergent point to 1e-6 deg | FAIL | PASS | 8.5e-14 deg |
| **B6.oracle.dist.real** | R, dist | oracle speed, per-star and cluster parallax to 1e-8; sigma within 10 percent | PASS | PASS | 4e-15 relative; sigma within 1.9 percent |
| **R7.published.cp** | -, geo | NOT RUN: a published convergent point with its uncertainty | NOT RUN | NOT RUN | fetch request 1 |
| **R8.published.distance** | -, dist | NOT RUN: a published parallax or moving-cluster distance | NOT RUN | NOT RUN | fetch request 2 |
| **R9.isochrone** | -, dist | NOT RUN: the isochrone distance of 219 | NOT RUN | NOT RUN | fetch request 3 |

Totals: committed form 35 rows, 13 pass, 15 fail, 3 REPORTED, 4 NOT RUN; amended form 35 rows, 26 pass, 3 fail, 3 REPORTED,
3 NOT RUN. The 18 failures are in `failed-legs.json` and stay failing.

**Committed form: C.** The seed finds the field's clump, never the cluster, so every ensemble run on it refuses or fails: 7 geo legs fail
(A1, C1, C2, D2a, and on the real file R1, R5 and B5, which has nothing to compare) and 9 dist legs fail or are NOT RUN. D1, D3, D4 pass
because that form refuses everything, E1 included; they carry no information about it. The real file does not converge (30 iterations).
**Amended form: B.** Every geo leg passes: membership (recall 0.983, purity 0.977), the convergent point (median error 0.39 degrees), the
refusals (no cluster, no radial velocities, 15 members, internal scatter of 5 km/s), the exact analytic cases, and the independent oracle
(identical member sets, convergent points to 1e-13 degrees, speeds and parallaxes to 1e-14). The three failures are coverage and
recovery of the distance (C3, C4, C5): the bootstrap interval covers 0.495 and 0.885 against 0.58 to 0.78 and 0.90 to 0.99, and the
median bias is +1.17 percent (0.89 of an interval), the F4 bias the fit itself carries. C6 passes at 0.91 against 0.90, a thin margin.

**The Hyades sample, amended form** (R legs; the committed form never converges on it). 497 members, 218 with a usable radial velocity
(radial-velocity error at most 3 km/s), found in 3 iterations; the robust scatter of the members' offsets from their great circles is
0.43 degrees and of the radial-velocity residuals 0.65 km/s. The convergent point is at (97.11, 7.08) degrees (right ascension,
declination) and V is 46.3 km/s: **nothing is compared with a published value, because none is in the repository** (fetch request 1).
The ratio of the moving-cluster parallax to 233's parallax on the same stars (mean zero point -0.045 mas, 233's method, no systematic
floor) is 1.0146, 1.83 sigma combined, with a moving-cluster relative error of 0.79 percent; so both tolerances hold (3 sigma and 3
percent), the two random halves agree (1.15 sigma on the parallax; the convergent points differ by 0.054 degrees against radii of
0.12 and 0.11), and the oracle agrees with the production code on the members, the convergent point and every per-star value. The
+1.5 percent ratio has the sign and size of the synthetic bias of F4 (+1.2 percent); that is noted, not a leg, and agreement of the
two methods is **not** asserted: R2 passes a tolerance of 3 sigma and 3 percent, and C3 to C5 say the interval it uses is too narrow
and its centre biased in the synthetic world. Dropping the radial-velocity cut to 1 km/s changes the parallax by 0.075 percent (R6).

Reported without a band: an isotropic expansion of 0.05 km/s per pc (a systematic of the common-velocity assumption the model lacks)
biases pi_MC by -5.7 percent with coverage near zero (D5); the method does not detect it.

## What this means for Part B

Under the binding (committed) verdict C Part B is a reading step. Were AM1 to AM3 ratified, verdict B would authorize only the named
slice: the convergent point and the method's geometry without a distance (membership by proper motion, parallax window and radial
velocity; the convergent point; the offset from each star's great circle). Part B's validation tiers (b) a pinned convergent point from a
cited independent implementation and (e) the Hyades within a published value's uncertainty need the fetch requests below. A
B never authorizes the A scope: no moving-cluster distance, no "three distances compared". The consumers rule holds: no lesson,
panel or viewer, and "Cluster Membership by Motion" is unchanged (its 233 reading of the parallax stands). No closure file, ceiling or
budget changes, so there is no size figure to approve.

## What to fetch (exact requests; nothing was fetched)

1. **A published convergent point of the Hyades with its uncertainty from an independent implementation** (leg R7; Part B tier b): the
   paper's identifier, the table or equation, the method (a maximum-likelihood convergent-point fit is the usual one; de Bruijne 1999
   is named so the fetcher can check it, not read here), the data (a Hipparcos or Gaia sample), and the retrieval date, transcribed
   from the paper to `tests/fixtures/moving-cluster/published-cp.json`. With a cited code's output on the same stars, pinned as a fixture,
   the oracle tier would be met by an implementation that is not ours.
2. **A published Hyades distance or parallax with its uncertainty and stated method** (leg R8; Part B tier e), from one Gaia DR3-based
   and one non-Gaia source (a moving-cluster or Hipparcos result), with the identifiers and the retrieval date, as
   `published-distance.json`. The gate has stated none: a literature value is not typed from memory.
3. **A Gaia-band isochrone set for the Hyades' age and metallicity range, or a G, BP-RP to SDSS g, r transformation** (leg R9): 219's grid
   is SDSS g and r over log age 9.0 to 9.6; the sample has Gaia G and BP-RP, and an age is a published quantity. Without it any figure
   shows two distances, not three.
4. **The parallax zero point's systematic floor** (233's open item, `ZERO_POINT_SOURCE.sigma`): the gate stated none and carries the 3
   percent cap instead; it is 0.05 percent of this parallax and moves nothing here.

## Questions for Carl

1. **AM1 to AM3.** Ratify the amended form, so that verdict B binds instead of C? The committed form's seed cannot find the cluster
   (found on synthetic data before any gate seed); the amendments change no bound except the denominator of the analytic recall.
2. **The bias (F4).** Add a bias-corrected convergent-point estimator (an errors-in-variables correction, or a maximum-likelihood
   fit with the sin^2 theta weights' normalisation) as NEW legs with thresholds committed first, so C3 to C5 are judged on a method
   that does not carry the bias? The failing legs stay on record either way. Recommendation: yes, in a follow-up, before any Part B.
3. **The next step.** Under B only the geometry slice is authorized and it has no consumer; recommended: do not run Part B yet, and wait
   for the fetch requests (1 and 2) so that tiers (b) and (e) can be run in one Part B.
4. **The tolerance.** C6 passes at 0.91 against 0.90 and the real sample passes both tolerances at 1.83 sigma and 1.46 percent. Both
   were committed first and are unchanged; say if you want them reviewed for a later contract.
5. **The fetch requests above**, and whether to supply the isochrones for the three-distance comparison.

## Follow-up (docs/moving-cluster-followup): the corrected convergent point and the published-value legs

Carl's rulings of 2026-11-06 ("go with your recommendations"): a bias-corrected convergent-point estimator enters as NEW legs with their
thresholds committed first; the published Hyades values he fetched (outside every repository, untrusted data, read and transcribed as
printed) make legs R7 and R8 runnable; the committed form's verdict C binds, AM1 to AM3 stay an unratified proposal, the consumers rule is
held, and no moving-cluster distance is written as a result. **Follow-up verdict by the committed function, applied to the follow-up legs
alone: C** (one geo leg fails). It changes neither the committed verdict C nor the amended form's B, authorizes no Part B and no consumer, and
the 18 failing legs above stay failing and bit-identical (their files are not edited and not re-run). Register rows D-R10-234-05 to
D-R10-234-07 and D-R10-234-91.

### What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `1d71cd33` | `followup-thresholds.json` (the estimator, 30 legs, the rule for every bound, the R7 and R8 rules, the verdict function), `published-cp.json`, `published-distance.json` | any code, any run, any CE number |
| `5729b051` | design findings F5, F6 and amendment AM4 (membership-stage refusals stay at the plain point) | any gate seed |
| `06ec0b58` | finding F7 and amendment AM5 (leg K2 part d uses three stars: tau^2 is undefined for two) | any gate seed |
| spike `c39f5752` | `js/kernels/galactic/movingClusterCorrected.js`, `tools/moving-cluster-followup.mjs`, `tools/moving-cluster-oracle/oracle_ce.py` on `spike/moving-cluster-followup`, never merged | the gate stream |
| `f8e785fb` | the results, on Node 22.23.4 (one stream, 850 s; the oracle on Python 3.9.22, numpy 1.26.4, scipy 1.13.1, astropy 6.0.1) | |

A first launch of the stream crashed in its validator (a result refused by the membership stage carries no CE fit and the code read one) before
it wrote any row; the fault was fixed in the spike and the stream rerun from the start. No leg result had been seen. The design stream used a
design seed on synthetic data only; it found F5 (the estimator works as specified), F6 and F7 and was never a leg.

### The estimator (CE)

The plain convergent point is the smallest eigenvector of S = sum b b^T. A proper-motion direction rotated by a small angle delta in the sky
turns b into b0 cos(delta) - t sin(delta), so E[S] carries sum E[delta^2] t t^T, whose component along c is sin theta: the fit is pulled
towards the cluster along the one direction the stars constrain weakly (F4). CE subtracts the noise matrix: S* = sum b b^T - sum delta_i^2
t_i t_i^T with delta_i^2 = tau^2 / sin^2 theta_i + (proper-motion error across the track / mu_i)^2, where tau, the intrinsic scatter of the
offsets b.c (an isotropic internal velocity scatter divided by V), is estimated **from the offsets alone**: tau^2 = max(0, (lambda n /
(n - 2) - sum M) / n), lambda = sum (b.c)^2. The smallest eigenvector of S* is iterated to a fixed point (1e-12 rad). No radial velocity, no
tuning constant. Members are those of the amended iteration (used without ratifying it, as the committed seed cannot find the cluster); CE is
a refit on them; the speed, the per-star and cluster parallax and every other refusal are Part A's.

### The rule that set every bound, and what the author had seen

Each bound is the bound of the committed leg it re-tests, on an ensemble of the same size (the 68.27 percent band is the nominal rate plus or
minus three binomial standard errors at n = 200, committed 0.58 to 0.78; 0.90 to 0.99; |median z| 0.27 = three standard errors of a median
of 200 unit normals; |median relative bias| 0.005); the two further worlds E7 (internal scatter 1.0 km/s) and E8 (convergent point 60 degrees
away) take the same four bounds. No value came from the failing legs' numbers. The R7 and R8 rules use only committed constants (below).
Stated for the record: before committing, the author had read all of Part A (including the amended form's real-sample convergent point and
ratio) and the published-value file (including the printed values); the R7 and R8 rules were not set from the gap between those.

### Results (30 legs: 19 pass, 3 fail, 7 reported, 1 not run)

| Leg | Set, group | What | Result | Measured |
| --- | --- | --- | --- | --- |
| K1.exact | S, geo | noise-free cluster, stated errors 0: tau^2 zero, CE = plain = truth, exact parallaxes | PASS | 6.6e-14 deg; tau^2 5e-32; 4e-15 relative |
| K2.hand | S, dist | delta^2, tau^2, CE = plain at tau^2 = 0, and S* of three stars, by hand | PASS | all within 1e-15 |
| K3a, K3b | S, geo and dist | independent oracle: members, CE point, tau^2, speed, parallaxes, bootstrap sigma | PASS | Jaccard 1; 2e-13 deg; 1e-14; sigma within 1.5 percent |
| **K4.cp** | S, geo | E1 (seed 234101, 200): CE point median error <= 1.0, p95 <= 3.0 deg, refused <= 5 percent | **FAIL** | median 0.169, p95 0.504 deg; **refused 0.06** (12 of 200) |
| K5.coverage68 | S, dist | 68.27 percent interval covers in 0.58 to 0.78 | PASS | 0.72 |
| K6.coverage95 | S, dist | 95.45 percent interval covers in 0.90 to 0.99 | PASS | 0.925 |
| K7.recovery | S, dist | median z within 0.27, median relative bias within 0.005 | PASS | z -0.158; bias -0.20 percent |
| K8.agree | S, dist | tolerance rule with 233 on at least 90 percent | PASS | 0.94 |
| K9.useful | S, dist | median sigma / pi <= 0.02 | PASS | 0.0124 |
| K10.noRv.cp | S, geo | E3, no radial velocities: CE point returned, speed and distance null | PASS | 0.96 returned; 0.22 deg; null 1.0 |
| **K11.dispersion1** | S, dist | E7, internal scatter 1.0 km/s: both coverages, z and bias in the C3 to C5 bands | **FAIL** | coverage 0.245 and 0.395; z +0.95; bias +2.1 percent; 117 of 200 return a distance |
| **K12.separation60** | S, dist | E8, convergent point 60 degrees away: the same four conditions | **FAIL** | coverage95 0.85 (below 0.90); coverage68 0.635, z -0.02 and bias -0.04 percent pass; 178 of 200 return a distance |
| RK1.members | R, geo | the Hyades file converges, is not refused, at least 30 members with a radial velocity | PASS | 497 members, 218 with one; CE in 5 iterations |
| RK2.agree | R, dist | tolerance rule with 233's parallax | PASS | ratio 1.0103, 1.27 sigma combined |
| RK3.useful | R, dist | sigma / pi <= 0.02 | PASS | 0.0080 |
| RK4.split, RK5.cpSplit | R | two seeded halves agree (distance, convergent point) | PASS | 0.79 sigma; 0.199 deg against radii 0.145 and 0.088 |
| K16a, K16b | R | oracle on the real file | PASS | Jaccard 1; 2e-13 deg; 8e-15; sigma within 2.6 percent |
| RK7.published.cp | R, geo | CE point against the published point, tolerance sqrt((3 r)^2 + f^2) | PASS | 0.79 deg against 1.26 |
| RK8.published.distance | R, dist | CE parallax against the published distance's parallax, floor and 3 percent cap | PASS | -2.63 percent, 2.70 sigma combined, against 3.15 percent |
| K13, K14, K15, KP1, RK6, RK7r, RK8r | reported | see below | REPORTED | |
| RK9.isochrone | - | the isochrone distance | NOT RUN | fetch request 3 |

**What the correction did.** On the same realizations and members, the plain estimator has median z +0.72, median relative bias +0.91 percent
and coverages 0.57 and 0.845 (K13); CE has -0.16, -0.20 percent, 0.72 and 0.925. The estimated tau was 0.640 degrees (median) for a true 0.637;
the median convergent-point error fell from 0.37 to 0.17 degrees; the fixed point converged in at most 5 iterations; one fit costs 0.3 ms and a
4000-replicate bootstrap 1.4 s of CPU. The three legs that carry the correction's purpose (K5, K6, K7) pass, and so do usefulness and agreement.

**The three failures stay failing, and what they are.** (1) K4 fails on the refused fraction, 0.06 against 0.05: the 12 refusals are all the
membership iteration's no-convergence (Part A's amended iteration, the same code that refused 0.04 on its own seed); CE converged in every
realization that reached it. The bound was not moved. (2) K11: in a cluster with an internal scatter of 1.0 km/s in the field only 117 of 200
return a distance (29 no-convergence, 25 no-cluster, 20 unstable, 9 CE no-convergence), and those are biased by +2.1 percent. A diagnostic on the
design seed, which is not a leg, on 60 such clusters in the field: 25 refused, tau overestimated at 1.48 degrees for a true 1.27 (field stars
inside the member set), mean bias 12.6 percent against the plain 17.5 percent. So CE is not shown to be robust to a larger scatter in the field;
the limit is the membership iteration, which CE does not touch. In the same world without a field (design stream, F5) the bias is +0.06 percent.
(3) K12: bias and z are right (-0.04 percent, -0.02) and 170 of the 178 returned 95.45 percent intervals cover, but 22 realizations are refused by
the membership iteration (12 no-convergence, 10 no-cluster) and a refusal counts as not covering, so the leg reads 0.85. E5 (internal scatter
5 km/s) is refused in every realization, as Part A's D3 had it (K14). E6 (expansion 0.05 km/s per pc), which nothing here models: z -5.7,
bias -7.2 percent, coverage 0 (K15), as for the plain estimator in D5: the method does not detect it.

### The real sample, and the published values

CE on the 497 members (218 with a radial velocity): convergent point (97.21, 7.04) degrees, V 46.34 km/s, tau 0.42 degrees (an internal
velocity scatter of 0.34 km/s per axis, implied); it moves the plain point by 0.105 degrees and the ratio of the moving-cluster parallax to 233's
from 1.0146 to 1.0103; the relative error is 0.80 percent. Not a distance: the moving-cluster parallax and distance are written nowhere.

* **RK7.** The published point (Perryman et al. 1998, the 134 Hipparcos stars within 10 pc, arXiv:astro-ph/9707253, equatorial (97.91, 6.66)
  degrees) **has no printed uncertainty**, so the rule has no published part: the tolerance is sqrt((3 r)^2 + f^2) with r the 68.27th percentile
  of the 4000 bootstrap convergent points about the estimate (0.080 degrees) and f = sigma0 / V = 1.0 km/s over the fitted speed (1.24
  degrees), the stated allowance for two different member selections (committed constants only). The separation is 0.79 degrees: the leg
  passes. **That pass rests on the floor:** the separation is 9.9 bootstrap radii, so the statistical term alone would fail; the plain (amended)
  estimate is 0.90 degrees away and the 180-star published point 0.86 degrees. The fitted speed exceeds the printed 45.93 +- 0.23 km/s by 0.41
  km/s (1.8 printed sigma; reported).
* **RK8.** Perryman's reference distance, 46.34 +- 0.27 pc, is to the centre of mass of the Hipparcos members within 10 pc (a concept the paper
  calls meaningful only in that context); the rule is the quadrature of 3 sigma combined and a stated floor (g = (5 pc / d)^2 = 1.16 percent
  of the parallax, the second-order difference between a mean parallax and the inverse distance of the centre) with the committed 3 percent cap.
  The CE parallax is 2.63 percent below the published parallax (2.70 sigma combined, the tolerance 3.15 percent): **a narrow pass**, which
  would fail without the floor. Reported beside it: the plain estimate is 2.22 percent below (2.31 sigma), 233's parallax 3.63 percent below
  (6.2 sigma), the 180-star published distance 1.77 percent. Against the two **second-hand** Gaia quotations (Roser et al. 2019, not primary
  sources, not the same estimand) CE is 0.20 percent (DR2, 0.23 sigma) and 1.77 percent (DR1) below. The direction is that of the difference
  between the Hipparcos-era and Gaia-era values the cluster has, not a claim about either; the sign is opposite to the concept floor's (a mean
  parallax is expected above the centre's), which the floor does not explain.

## What the follow-up does not do

No Part B, lesson, panel, viewer or pack; no ratification of AM1 to AM3 (every follow-up leg runs on that membership and says so); no change
to any Part A file, bound or result; no distance above the verdict line; R9 (the isochrone distance) still NOT RUN. The membership iteration is
the part that limits the follow-up (K4, K11, K12) and was not modified: a membership that survives a larger scatter in the field would be a new
contract.

## Still to fetch

3. A Gaia-band isochrone set, or a G, BP-RP to SDSS g, r transformation, with a published age (R9; unchanged).
4. The parallax zero point's systematic floor (233's open item; unchanged).
5. A Gaia DR3-based Hyades distance from a primary source (the Gaia values above are second-hand quotations of earlier releases).
Requests 1 and 2 of the original list are answered (`published-cp.json`, `published-distance.json`).

## Questions for Carl (follow-up)

1. **Verdict.** The follow-up verdict is C by the function (K4's refusal rate 0.06 against 0.05). Leave it at that, or review the K4 bound for
   a later contract? It was committed as C2's bound and not moved; the 0.06 is within binomial noise of 0.05 (standard deviation 0.015).
2. **A membership iteration for a larger scatter.** K11 and K12 fail in the field for a reason CE does not touch. Open a new contract for a
   robust membership (committed first), or accept that the method is shown only for a scatter of about 0.5 km/s?
3. **R7 and R8 passed on a floor.** RK7 passes on the allowance f (statistically the points differ by 9.9 radii) and RK8 narrowly on the
   concept floor. Say if the floors should be reviewed for a later contract; they were committed from constants before the run.
4. **AM1 to AM3** (unchanged question): ratify the amended form? The follow-up uses its membership either way.
5. **A DR3-based published distance and the isochrones** (still to fetch above), and whether Part B should wait for them.

## Reproduction (follow-up)

On `spike/moving-cluster-followup` (c39f5752, Node 22): `node tools/moving-cluster-followup.mjs --write-oracle-inputs DIR`, then
`/usr/local/bin/python3.9 tools/moving-cluster-oracle/oracle_ce.py --synthetic DIR/synthetic.json --csv hyades.csv --mask DIR/real-zeropoints.json --out FILE`,
then `node tools/moving-cluster-followup.mjs --out PART --oracle FILE` and `node tools/moving-cluster-followup-fixtures.mjs --part PART --oracle FILE --out-dir DIR`
(the stream reads the fixtures directory with `--fixtures DIR` and records the sha256 of each file it read). The real file is Carl's
`scratch-data/gaia234/hyades.csv`, checked against its committed sha256.

## Reproduction

On `spike/moving-cluster-gate` (Node 22): `node tools/moving-cluster-validate.mjs --write-oracle-inputs DIR`, then
`/usr/local/bin/python3.9 tools/moving-cluster-oracle/oracle.py --synthetic DIR/synthetic.json --csv hyades.csv --mask DIR/real-zeropoints.json --out FILE`,
then `node tools/moving-cluster-validate.mjs --form=committed|amended --oracle FILE --out PART` for each form and
`--merge PART PART --out-dir DIR`. The real file is read from Carl's `scratch-data/gaia234/hyades.csv` (checked against the committed sha256).

## References

The convergent-point and moving-cluster methods (Jones 1971; de Bruijne 1999) are named from memory for the fetcher and have not been
read for this prompt. Gaia DR3 (CC BY-NC 3.0 IGO, D-GAIA-01) through the file Carl fetched; the zero point of Lindegren et al. (2021) through
233's `zeropoint.js`; 233's `clusterParallax`; 219's `CLUSTER_FITTING.md` for the isochrone grid. No published Hyades value is used.

<!-- Listed in DOCUMENTS.md. -->
