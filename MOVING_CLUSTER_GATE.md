# The moving-cluster gate

Roadmap III, Prompt 234, Part A (tranche T4, D-R10-232-01). One bounded moving-cluster comparison: the Hyades as the candidate, a
Gaia DR3 sample under D-GAIA-01's labelling, a membership rule, the convergent-point method, a tolerance against 233's parallax
distance and a coverage test on synthetic clusters, all committed before any code. **Verdict by the committed function: C.
The amended form, a proposal for Carl to ratify, gives B** (the convergent point and the method's geometry, with no distance).
No kernel, pack, panel, lesson or viewer is built or authorized (consumers rule, Carl 2026-11-05), and no distance is reported:
the moving-cluster distance is shown only as a ratio to the parallax distance, below verdict A. The record is decision-register
rows D-R10-234-01 to D-R10-234-04 and D-R10-234-90.

The numbers are in `tests/fixtures/moving-cluster/` (`thresholds.json` the contract, its design findings and three amendments;
`results.json` the gate stream for both forms; `failed-legs.json` every failing leg, labelled; `ensembles.json` the truth manifests of
the synthetic ensembles; `oracle-results.json` the pinned output of the independent oracle). The prototype
(`js/kernels/galactic/movingCluster.js`, `movingClusterSynthetic.js`), the validator (`tools/moving-cluster-validate.mjs`) and the
oracle (`tools/moving-cluster-oracle/oracle.py`) are on `spike/moving-cluster-gate` (bbef546a), never merged (Prompt 234's rule 7.5.4):
this PR is documentation and fixtures only. The gate stream ran on Node 22.23.4 (about 9 minutes for the amended form, 4 for the
committed); the oracle on Python 3.9.22 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1. Two full runs agree row for row (only the
CPU timing and the report fields of R1 differ).

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

## Reproduction

On `spike/moving-cluster-gate` (Node 22): `node tools/moving-cluster-validate.mjs --write-oracle-inputs DIR`, then
`/usr/local/bin/python3.9 tools/moving-cluster-oracle/oracle.py --synthetic DIR/synthetic.json --csv hyades.csv --mask DIR/real-zeropoints.json --out FILE`,
then `node tools/moving-cluster-validate.mjs --form=committed|amended --oracle FILE --out PART` for each form and
`--merge PART PART --out-dir DIR`. The real file is read from `/Users/carl/Desktop/Gravitas/scratch-data/gaia234/hyades.csv` (checked against the committed sha256).

## References

The convergent-point and moving-cluster methods (Jones 1971; de Bruijne 1999) are named from memory for the fetcher and have not been
read for this prompt. Gaia DR3 (CC BY-NC 3.0 IGO, D-GAIA-01) through the file Carl fetched; the zero point of Lindegren et al. (2021) through
233's `zeropoint.js`; 233's `clusterParallax`; 219's `CLUSTER_FITTING.md` for the isochrone grid. No published Hyades value is used.
