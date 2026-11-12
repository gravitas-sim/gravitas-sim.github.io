# Gaia parallax workflows and sample selection (Roadmap III, Prompt 233)

A Gaia parallax measures 1/r, not r. `js/kernels/galactic/astrometry.js` keeps it that way: a parallax becomes a distance as
a likelihood with its assumptions on the page, never as a bare 1/p and never with a blanket correction. Beside it,
`zeropoint.js` is the stated parallax zero point, `cuts.js` counts what a sample's cuts remove through the statistics
kernel's selection object (`js/kernels/statistics/selection.js`, Prompt 154), and the two Gaia packs gained the columns
the workflow needs (version 1.1.0, below). Pure modules: no DOM, no clock; distances in kpc, parallaxes in mas, proper
motions in mas/yr, velocities in km/s.

Validation: `npm run gaia:validate` (`tools/gaia-validate.mjs`) against the bounds in
`tests/fixtures/gaia-workflows/thresholds.json`, committed (e03d69ae) before the kernel or any new data existed;
`tests/gaiaWorkflows.test.js` holds the results (`results.json`) against `failed-legs.json` and re-runs the quick legs.

## Equations and limits

* **Corrected parallax** w = p - z, with z the zero-point offset (negative for Gaia) and error s^2 = s_p^2 + s_z^2 for one
  star. A cluster keeps s_z as a shared systematic, added once to the statistical error of the mean (`clusterParallax`):
  it is never divided by the number of stars.
* **Likelihood** L(r) = N(w | 1/r, s^2). With no prior the answer is the likelihood: the maximum is 1/w and the interval at
  level k sigma (delta ln L = k^2 / 2) is exactly [1/(w + k s), 1/(w - k s)], open at the far end when w <= k s. No
  posterior and no quantile exist without a prior: L does not fall at large r.
* **Priors** (named, cited, with their sample assumptions returned in the result): `edsd`, P(r) proportional to
  r^2 exp(-r/L) with the scale length L stated (Astraatmadja and Bailer-Jones 2016, ApJ 833, 119; Bailer-Jones 2015, PASP
  127, 994), which assumes the sample is complete in distance over the range used; `uniform-density`, P(r) proportional
  to r^2 to a stated radius (Lutz and Kelker 1973, PASP 85, 573), which assumes complete counts and one parallax error.
  The posterior is on a log grid joined to a fine grid over the likelihood; the interval is equal-tailed; the reported
  distance is the posterior median and the mode is given.
* **Status ladder.** A point distance needs w / s of at least 5 (`POE_THRESHOLD`, a stated choice, not tuned). From 0 to 5
  the status is `low-signal` (`prior-dominated` with a prior); at or below 0 it is `likelihood-only` and the distance is
  null: a negative parallax has a likelihood, not a distance, and so no velocity. A prior's posterior is returned
  separately and labelled `prior-dominated` there.
* **No blanket correction.** Nothing is applied to a sample beyond the stated zero point; `correction` in every result
  says so, and the module exports nothing named for a sample-wide bias correction (D5).
* **Tangential velocity** v = k mu r, k = 4.740470446 km/s per (mas/yr kpc). `velocityAtFixedMotion` scales a distance
  record exactly; `tangentialVelocity` draws the distance (posterior under a prior, or the normal in parallax that the
  likelihood is, only at w/s of 5 or more) and the proper motion from its normal conditional on the drawn parallax, so
  Gaia's parallax-proper-motion correlations are carried; the zero-point error widens the parallax only. A seeded named
  stream (`noise`) makes the draws repeat. The result is an interval and an envelope quantity (`distanceQuantity`:
  `interval`, or a lower `limit` where the far end is open) for the platform's asymmetric uncertainty (Prompt 150).
* **Domain.** Single stars with Gaussian parallax errors; no binarity, crowding or error underestimate; the zero point is
  valid for 6 < G < 21, 1.1 < nu_eff < 1.9, 1.24 < pseudocolour < 1.72 and flags a star outside them.

## The zero point

`zeropoint.js` implements Z(G, colour, sin b) = sum q_jk(G) c_j(colour) b_k(sin b) of Lindegren et al. (2021), A&A 649, A4, from
the tabulated coefficients (`zeropointTables.js`, generated from `z5_200720.txt` and `z6_200720.txt`, sha256 in the file) and
the basis functions the package's source states. Three honest limits:

1. It is an **independent reimplementation; none of the authors' code is in the tree.** Carl allowed the package
   (`gaiadr3_zeropoint` 0.0.5, LGPL-3.0, wheel sha256 `a11555ce...77f6`) to be run, and the coordinator ran it on the 993 NGC 2420
   stars (2026-11-03, numpy 1.26.4; 978 five- and 15 six-parameter solutions; median -0.033724 mas; no NaN). Its per-star output
   is pinned in `zero-point-package.json` (licence and provenance inside). Leg B2 compares the kernel, reading the pack's rounded
   columns, with that output at the committed bound of 1e-4 mas: **it passes, largest difference 2.9e-5 mas, mean difference
   -1.7e-7 mas** (the largest difference is what rounding G, the colour and the latitude to the pack's steps does; the second
   implementation on the unrounded inputs differs by the same amount). The neighbourhood pack has no package output: it is
   compared with a second implementation (`tools/gaia-oracle/zeropoint.py`, numpy, reading the text tables), largest difference
   2.1e-6 mas on the same rounded inputs, and its five out-of-range stars are flagged.
2. **The zero point's own uncertainty is not built in.** The paper's statement of the correction's residual systematic error
   was not in the material supplied, so `ZERO_POINT_SOURCE.sigma` is null and every caller states a floor with its source or
   says it has none. The mean zero point of NGC 2420's members is -0.037 mas, larger than the -0.017 mas "on average" the packs'
   text quotes: the offset depends on G, colour and latitude, and these stars are G 12 to 17.5.
3. The paper itself was not in the folder; its reference is the package's own, and its numbers are those of the tables. The package comparison covers G 12 to 17.5 near the ecliptic (NGC 2420's stars), not the whole range of the fit.

## What a sample's cuts remove

`cutSelections({magnitude, parallaxOverError, ruwe, radialVelocity})` returns 154 selection objects; `applyCuts` counts what each
removes from the whole sample (`alone`) and from what the earlier cuts left (`steps`, in order), and keeps the combined selection
(`all`). It is the cuts a Gaia table's rows carry (G, parallax over error, RUWE, a radial velocity), not a model of Gaia's real
selection function. S1 to S3 check the Euclidean count slope (0.6), the parallax-over-error cut against its closed form through
the selection object, and the removal bookkeeping.

## The packs (version 1.1.0, register D-R10-233-02)

The same rows (same WHERE and ORDER BY as 1.0.0; re-queried 2026-11-03), eight more columns: `plx_pmra_corr`, `plx_pmdec_corr`,
`pm_corr` (error correlations), `ruwe`, `params` (31 five-parameter, 95 six-parameter), `nu_eff` and `pseudocolour` (each empty
for the other solution type), `ecl_lat`. The uncertainty columns the prompt asked for (`parallax_err`, `pmra_err`, `pmdec_err`,
`rv_err`) were already there. Every earlier column is byte-identical to 1.0.0 (E2; `alignment.json` holds the checksums). The
neighbourhood pack's parallax is still rounded to 0.02 mas and no distance is taken from it: 80 percent of its stars round by more
than a tenth of their parallax error (E3). Source ids are not shipped (64-bit). NGC 2420's pack holds 978 five-parameter and 15
six-parameter solutions (the 1.0.0 manifest said five-parameter only). D-GAIA-01's mechanism is unchanged: CC BY-NC 3.0 IGO,
`nonCommercial` true, labelled wherever shown, removable as module, manifest and service-worker entry (and the sidecar).

## Validation table

Bounds fixed first; seeds in `thresholds.json`; synthetic data with truth manifests in `ensembles.json`.

| Leg | Kind | Measured | Verdict |
| --- | --- | --- | --- |
| **A1** the bias of d = 1/p_obs on a synthetic sample, against the analytic expectation. The sampl | analytic | MC against quadrature at p/s 5, 10, 20: 1.26, 0.384, 0.409 sigma; series at 20: rel 3.29e-05 | PASS |
| **A1b** the median of 1/p_obs over all draws at true p/s = 20 equals the true distance within 4 st | analytic | median 1.00007 (0.687 sigma) | PASS |
| **A2** the posterior mode under the EDSD prior against the closed form | analytic | largest relative difference 2.22e-16 | PASS |
| **A3** the no-prior likelihood interval against its closed form [1/(w+s), 1/(w-s)] for w > s, and | analytic | five cases exact to the committed 1e-6 | PASS |
| **A4** the correction as stated | analytic | w and s exact; cluster error sqrt(e^2/N + sz^2) at N 1, 10, 1000 | PASS |
| **A5** at fixed proper motion the velocity interval is the distance interval scaled by k mu | analytic | worst relative difference 0 | PASS |
| **A6** with the distance posterior | analytic | second moment 0.000426 and 0.000246, variance 0.00117 and 0.00201 (relative) | PASS |
| **A7** with a parallax-proper-motion correlation of -0.5 and 0.5 at p/s = 50 | analytic | relative 0.00405 (rho -0.5), 0.00209 (rho 0.5) | PASS |
| **B1** an independent implementation | oracle | ten cases agree: largest relative difference 8.5e-9 on a point, 8.3e-7 on a quantile | PASS |
| **B2** the per-star zero-point function | oracle | against the authors' package on 993 NGC 2420 stars: largest difference 2.9e-05 mas (bound 1e-4), mean -1.7e-7; against a second implementation 2.1e-06 mas on the neighbourhood pack | PASS |
| **C1** no-prior likelihood intervals | coverage | coverage 0.6797, 0.6805, 0.6765 at p/s 3, 10, 30 | PASS |
| **C2** the same at the 0.9545 level | coverage | coverage 0.9543, 0.9583, 0.9537 at p/s 3, 10, 30 | PASS |
| **C3** posterior equal-tailed intervals under the EDSD prior | coverage | 68%: 0.686, 0.6747, 0.6807; 95%: 0.95, 0.9535, 0.9515 at s 0.3, 0.1, 0.03 mas | PASS |
| **C4** REPORTED, no band | coverage | truth scale 3 kpc, prior 1 kpc: 68% coverage 0.2195, 0.2855, 0.421; truth 0.3 kpc: 0.587, 0.6575, 0.691 | REPORTED |
| **C5** REPORTED, no band | coverage | median bias 0.8402, 1.858, 2.181 percent; 68% coverage 0.6783, 0.6743, 0.5942 | REPORTED |
| **D1** a star with p_obs = -0.10 mas, s = 0.05 mas | refusal | likelihood-only, no distance, no velocity | PASS |
| **D2** the statuses at the stated threshold | refusal | ok, ok, low-signal, low-signal, likelihood-only, likelihood-only | PASS |
| **D3** under the EDSD prior, doubling the scale length L from 1 to 2 kpc moves the upper end of t | refusal | upper end moves by x1.56 and x1.571 at w/s 1 and 0.5; 0.000723 at 20 | PASS |
| **D4** a parallax error that is zero, negative or not finite; a parallax that is not finite; an u | refusal | seven inputs, seven refusals | PASS |
| **D5** no universal correction | refusal | distance exactly 1/(p - z); no exported correction | PASS |
| **E1** NGC 2420 from the precise cluster pack | authentic | NOT RUN against the committed contract (below) | NOT RUN |
| **E2** each re-queried product | authentic | 993 and 1570 rows; earlier columns byte-identical; 0 rows differ | PASS |
| **E3** REPORTED, no band | authentic | largest rounding 0.00999 mas; 0.802 of stars round by over a tenth of the error | REPORTED |
| **P1** 1000 stars through the distance kernel with a prior run in at most 5 s of CPU, recorded an | speed | 0.56 s CPU for 1000 stars (recorded) | PASS |
| **S1** a magnitude-limited sample of identical stars | analytic | slope 0.60035; slope past the edge 0.2314 | PASS |
| **S2** the parallax-over-error cut applied through 154's selection object | analytic | k 5: 0.010795 (exact 0.0109219); k 10: 0.001 (exact 0.00106497); within 1.03 sigma | PASS |
| **S3** what each cut removes | analytic | integers agree in both orders (2853 outside both) | PASS |

No leg fails. Failed legs are recorded in `failed-legs.json` (empty) and would stay failing; only Carl resets a bound.

## NGC 2420 (leg E1): NOT RUN against its committed contract

The contract (members from proper motion alone at probability 0.9, per-star zero point, 3-sigma clip, systematic floor unreduced,
pass if the distance lies inside the published range, which needs at least one DR3-based and one non-Gaia source) could not be run,
and the contract was not changed after seeing a result: no DR3-catalogue distance was obtained (Hunt and Reffert 2023 is a CDS-only
table; CDS was unreachable), and the zero point has no systematic floor. **Not judged.** Measured beside the sources that exist:

| Quantity | Distance (kpc) | Note |
| --- | --- | --- |
| Pack, 499 members, 3-sigma clip (493 kept), zero point per star | 2.324 (statistical interval 2.316 to 2.332) | mean parallax 0.4303 mas, mean zero point -0.0368 mas; **no systematic floor**, so the interval is only the statistics |
| Same, no zero point | 2.555 (2.545 to 2.565) | mean parallax 0.3914 mas |
| Same, no clip; membership 0.5; membership 0.99 | 2.325; 2.324; 2.323 | the choice of cut moves nothing |
| Richer et al. 2000 (apparent (m-M)V 12.10, E(B-V) 0.04, R_V 3.1) | 2.484 | true modulus 11.976; the conversion is arithmetic here, not a published value |
| Anthony-Twarog et al. 2006 (apparent 12.15) | 2.542 | E(B-V) 0.04 assumed from the line above: that paper's line did not restate it |
| Cantat-Gaudin et al. 2020 through arXiv 2404.12523 Table 1 (Gaia DR2) | 2.587 | |
| DR3 mean parallax 0.36 +- 0.06 mas as printed, no zero point stated, 1/p | 2.78 (2.38 to 3.33) | |
| "about 3 kpc" (arXiv 2101.07122) | 3 | rounded, no method read |

The corrected distance, 2.32 kpc, is below every distance from the literature in the table, including the lower end of the printed
DR3 parallax's range (2.38). That is what the data gave under a contract that was fixed before it was seen; it is not an agreement with the literature and the
lesson says so. The 2.6 kpc "about" statement of the earlier Cluster Membership lesson is not confirmed by it either. Carl chose to wait for the CDS table (Hunt and Reffert 2023, DR3) rather
to re-gate against another source: the leg stays NOT RUN against the committed contract until it can be fetched (register, D-R10-233-06).

## The panels and the two investigations (Part B)

Two lesson widgets, `gaia-distance` and `gaia-sample` (`js/gaiaWidgets.js`, over the pure functions of `js/gaiaField.js`, which read the
kernel through `js/kernels/galactic/gaia.js` and not through the galactic index), carry two bilingual investigations, "How far, and
how sure?" and "What Gaia does not see" (`js/data/investigations/gaia-sequence.js`, the one instructor closure file of the sequence,
with English and Spanish stubs beside it; both are in the galaxies sequence after "The rotating disk").

- `gaia-distance` takes numbers the student sets (a parallax, its error, a zero-point offset, an optional exponentially decreasing space
  density with a scale length, a proper motion) and draws the likelihood, the prior and the posterior through the plot component, with
  the status (ok, low-signal, prior-dominated, likelihood-only), the interval, what the prior assumes, the line that no blanket
  correction is applied, and the tangential velocity with its interval. It is not a Gaia star.
- `gaia-sample` loads the NGC 2420 sidecar and applies the magnitude, parallax-over-error and RUWE cuts through the selection objects
  of `cuts.js`, counting what each removes alone and in order. It draws the colour-magnitude diagram or the velocity plot of the stars
  left, and states the cluster distance by the leg-E1 contract (members from proper motion at probability 0.9, a zero point per star,
  a 3-sigma clip, systematic 0). The pack's own query had already dropped 55 stars with RUWE of 1.4 or more (1048 to 993). The
  neighbourhood pack is not used for a distance (E3).
- The lessons quote only numbers of `tests/fixtures/gaia-workflows/results.json` or of the pack, and `tests/gaiaLessons.test.js`
  recomputes each: the NGC 2420 distance (2.324 kpc, 2.316 to 2.332, no systematic floor, E1 NOT RUN, not validated against a published
  catalogue), the 2.299 kpc a parallax-over-error cut of 10 gives, the status ladder, the interval formulas and the answer positions.
- "Cluster Membership by Motion" no longer says the cluster is "about 2.6 kpc" away: that was the uncorrected 1 / parallax reading, and
  the lesson now says so and quotes the measured, labelled value.

## What is not built

A universal or sample-wide parallax correction; a distance from the rounded neighbourhood pack; a third Gaia sample (the
magnitude and parallax-over-error cuts show on NGC 2420's colour-magnitude diagram, and the neighbourhood pack's strata are in its
manifest); the zero point's uncertainty; a model of Gaia's real selection function.

## References

Lindegren et al. (2021), A&A 649, A4 (parallax bias; the coefficient tables were read from the package files named above);
Astraatmadja and Bailer-Jones (2016), ApJ 833, 119; Bailer-Jones (2015), PASP 127, 994; Lutz and Kelker (1973), PASP 85, 573;
Gaia Collaboration, Vallenari et al. (2023), A&A 674, A1; Richer et al. (2000, astro-ph/0006033); Anthony-Twarog et al. (2006,
astro-ph/0510047); arXiv 2404.12523; arXiv 2101.07122. Gaia data: ESA/Gaia/DPAC, CC BY-NC 3.0 IGO.

<!-- Listed in DOCUMENTS.md. -->
