# Rotation-curve decomposition (Roadmap III Prompt 236, Part A: the kernel)

A circular-speed curve as a bulge, an exponential disk and one halo, fitted with the covariance and the disk-halo
degeneracy shown. **Status: the kernel is built and validated, the panel, the lesson depth and the model-page
section are not built, and four legs of the validation contract fail, so the consumers rule committed with the
legs holds them for Carl.** Part B (the escape speed and the local density) is deferred, as Appendix C lists it.
The record is decision-register rows D-R10-236-01 to D-R10-236-03 and D-R10-236-90.

What the pull request holds: `js/kernels/galactic/decomposition.js` (the model and the fit),
`js/kernels/galactic/decompositionSynthetic.js` (seeded curves with their truth manifests), a validation group in
the suite (`js/validation/groups/rotation-decomposition.js`), `tools/rotation-decomposition-validate.mjs` and the
independent oracle `tools/rotation-decomposition-oracle/oracle.py`, `tests/rotationDecomposition.test.js`, and
`tests/fixtures/rotation-decomposition/` (the committed thresholds, the oracle's inputs and pinned output, the one
recorded run, the failed legs and the ensembles' truth manifests). Nothing student-facing changes and nothing is
imported by a shipped module, so no size ceiling moves. The decomposition is not exported from
`js/kernels/galactic/index.js` on purpose: it reaches the inference core and the statistics kernel, which the
lessons that import the index must not carry (the same reason `gaia.js` stands apart); import it by its path.

## The model

Distances in kpc, speeds in km/s, masses in solar masses. G is never typed: it is `GM_sun / (kpc 1e6)` from the IAU
2015 nominal GM of the Sun and the parsec as 648000/pi astronomical units (4.3009...e-6 kpc (km/s)^2 per solar mass,
a consequence of the definitions), as in `js/kernels/dynamics/constants.js`.

| Component | Circular speed | Parameters |
|---|---|---|
| Hernquist bulge | v^2 = G M r / (r + a)^2; M(<r) = M r^2 / (r + a)^2 | M fixed (a stated input, or fitted on request); the scale a is a stated input and never fitted; a -> 0 is the point mass |
| Razor-thin exponential disk | v^2 = (2 G M / R_d) g(y), g(y) = y^2 [I0(y) K0(y) - I1(y) K1(y)], y = r / 2 R_d; M = 2 pi Sigma_0 R_d^2 | disk mass M (inside a stated range) and scale length R_d |
| NFW halo | v^2 = v_s^2 m(x) / x, m(x) = ln(1 + x) - x / (1 + x), x = r / r_s; v_s^2 = G M_s / r_s = 4 pi G rho_s r_s^2 | v_s (km/s) and r_s (kpc), not a cosmological concentration and virial mass |
| Pseudo-isothermal halo | v^2 = v_inf^2 [1 - (r_c / r) arctan(r / r_c)], v_inf^2 = 4 pi G rho_0 r_c^2 | v_inf and r_c; the form of `js/darkMatter.js haloCircularSpeed`, the one The Missing Mass uses |

The total is v_c^2 = v_bulge^2 + v_disk^2 + v_halo^2: the accelerations of the components add, the bulge and halo are
spherical and the disk is thin, all evaluated in the disk's plane.

**The disk's shape function.** g(y) is computed from the modified Bessel functions by the trapezoid sum of their
integral forms (K_nu(y) = integral of exp(-y cosh t) cosh(nu t) dt, I_nu(y) = (1/pi) integral over [0, pi] of
exp(y cos t) cos(nu t) dt, both scaled so that nothing overflows; the trapezoid rule on these analytic integrands
converges exponentially), tabulated once (4,000 nodes in ln y from 1e-6 to 1e3, 20 ms) and interpolated by a cubic
spline in ln g. Below y = 1e-6 the leading form is used and above 1e3 the two-term asymptotic series
g = (1 / 4y)(1 + 9 / 8y^2) (the large-argument series of I_nu K_nu, A&S 9.7.1 and 9.7.2; the next term is of order
y^-4, 1e-12 at the table's edge). Against scipy's exponentially scaled `ive` and `kve` it agrees to 7e-11 (leg B2).
`js/darkMatter.js` keeps its polynomial Bessel functions (Abramowitz and Stegun 9.8, good to 1e-7 each) and is not
changed here: measured against the kernel, its disk speed is within 3e-7 up to 20 kpc and up to 2.3e-4 at 120 kpc,
where the cancellation in I0 K0 - I1 K1 amplifies the 1e-7. That matters for nothing a lesson shows today and would
matter for the Milky Way's curve to 200 kpc.

## The fit

`decomposeCurve(points, { disk, bulge, halo, bounds, profile, radius })` takes `[{ r, v, err }]` and fits, by the
inference core (`js/inference/fit.js`: bounded Levenberg-Marquardt from eleven deterministic starts, `covarianceAt`,
`rankAt`, `profile`), the free parameters log10 disk mass, disk scale length, halo speed and log10 halo scale
(log10 bulge mass joins when the caller frees it).

- **The disk mass range is a stated input and there is no default.** `disk` is a `massRange` `[lo, hi]`, or a
  `luminosity` with a `massToLight` `{ lo, hi }` (the mass range is the luminosity times the ratio's range:
  `diskMassRange`). Without one the call is refused (`disk-mass-range`). Nothing in the kernel says what stars
  weigh; the other bounds (`DEFAULT_BOUNDS`: disk scale 1 to 6 kpc, halo speed 1 to 1000 km/s, halo scale 1 to 500
  kpc) are wide search bounds, not priors from the literature.
- **Intervals, labelled by the statistics kernel's methods.** Each fitted parameter carries its covariance sigma and
  covariance intervals (68.27 and 95 percent) and, for the halo's parameters and any named in `profile`, a profile
  interval (Delta chi-square = 1, the others re-fitted at every value, 25 values across the bounds plus the best
  value). When the reduced chi-square is above 1 the sigma scaled by its square root is given beside it.
- **"Not constrained".** A halo parameter is constrained iff its profile interval is closed on both sides strictly
  inside its bounds; the halo is constrained iff both parameters are. Otherwise the result says `not constrained`
  and why, reports no interval for a parameter that is not constrained, and reports no halo-dependent derived
  quantity. A curve without its outer points gets this answer (leg D1); a curve with them does not (leg D2).
- **Adequacy.** A fit is adequate iff the chi-square survival probability is at least 0.001. Otherwise the model
  does not describe the points, which is said (`adequate: false`, `scaledForMisfit`).
- **Derived quantities** with the delta method (central differences): the halo mass within 20 and 50 kpc
  (v^2 r / G, spherical symmetry assumed, which a disk is not) and the component speeds at a stated radius.
- **The degeneracy shown.** `correlation` and its weakest eigen-direction (`weakestMode`), `diskHaloCorrelation`, and
  `diskHaloProfile(points, opts)`: chi-square against the disk mass across its stated range, the halo each disk mass
  needs, and the minimum-disk and maximum-disk decompositions at the two ends of the range. On the E2 ensemble below
  the median correlation of disk mass with halo speed is 0.88.
- **Assumes and does not claim.** Circular orbits in an axisymmetric disk at the speed the model gives; independent
  Gaussian errors as stated; no gas disk, stellar halo, bar, thick disk, flaring or non-circular motion, any of which
  a published Galactic mass model includes; no halo response to the baryons; no virial mass (it needs the critical
  density, hence H0). The thin-disk form overstates the speed near the disk's peak by a few percent for a real, thick
  disk; that is stated, not corrected. No local dark-matter density and no escape speed is computed (Part B).

## The validation contract

`tests/fixtures/rotation-decomposition/thresholds.json` (commit `ef14bc41`) fixed every bound before the kernel, the
oracle or any fit existed. What had been seen before: the pack's manifest, the existing kernel and its bounds,
KINEMATICS_GATE.md, GALACTIC_DYNAMICS.md, and the forward (unfitted) curves of four candidate truth models, looked at
only to choose a synthetic galaxy whose total curve is roughly flat beyond 4 kpc. The synthetic galaxy is a choice,
not the Milky Way and not a published model: a bulge of 1e10 solar masses (a = 0.7 kpc, fixed), a disk of 4e10 solar
masses with R_d = 2.6 kpc (luminosity 5e10 with a mass-to-light ratio of 0.8 inside a stated range of 0.3 to 1.5, so
the truth is inside the range the fit is told) and an NFW halo with v_s = 420 km/s and r_s = 20 kpc. The ensembles:
E1 (24 radii from 1.5 to 40 kpc, 4 km/s, 200 realizations), E2 (the degenerate direction, 12 radii to 12 kpc, 5 km/s,
200), D1 (no outer points, 10 radii to 6 kpc, 100), D5 (E1 plus a 15 km/s bump of width 1.2 kpc at 9 kpc, 100).

**The consumers rule (committed with the legs):** the panel, the lesson depth and the model-page section are built
only if every leg of the groups analytic, oracle, coverage and refusal passes. Group E (the pack) never stops the
panel; it decides what the lesson may say about the pack.

### The recorded run (Node 22.23.4; two runs give byte-identical `results.json`)

28 rows: 21 pass, 4 fail, 2 REPORTED and 1 NOT RUN.

| Leg | What | Result |
|---|---|---|
| A1 | Hernquist closed form (12 cases) | pass, 1.8e-16 |
| A2 | Hernquist a -> 0 is the point mass | pass, 2.0e-10 |
| **A3** | **NFW closed form and mass round trip** | **FAIL, 1.14e-12 against 1e-12; see AM1** |
| A4 | NFW peak at the root of its condition (2.16258 r_s) | pass, 2.2e-8 in x, 0 in v_max |
| **A5** | **NFW inner limit at x = 1e-3** | **FAIL, 1.33e-3 against 1e-3: the bound was miscalibrated** |
| A6, A7 | pseudo-isothermal form and its far-field series | pass, 0 and 1.1e-16 |
| A8 | v^2 r / G equals the integral of 4 pi r^2 rho for the three density forms at four radii | pass, 2.4e-14 |
| A9 | the disk's far field at 100 R_d | pass, 4.51e-4 (the first correction, 4.5e-4, as derived) |
| A10 | quadrature sum and the mass scalings | pass, 5.0e-16 |
| B1 | components against the oracle, 5 sets at 20 radii from 0.1 to 200 kpc | pass: closed forms 6.5e-12, disk 5.0e-12 |
| B2 | g(y) against scipy at 40 values of y | pass, 7.4e-11 |
| B3 | minimum chi-square, kernel and scipy `least_squares` | pass: 17.3364, 1.8e-11 apart |
| B4 | the two fitted curves | pass, 5.7e-7 km/s |
| B5 | one-sigma of the speed at 8 and 20 kpc | pass, 3.3e-11 and 1.1e-8 |
| C1 | E1, 68.27 percent covariance interval: log10 M_d, R_d, halo speed at 20 kpc | pass: 0.605, 0.660, 0.615 (band 0.60 to 0.76) |
| C2 | E1, 95 percent | pass: 0.950, 0.950, 0.945 |
| **C3** | **E1, 68.27 percent profile interval of log10 M_d** | **FAIL, 0.585 (117 of 200; band 0.60 to 0.76)** |
| C4 | E1 bias of log10 M_d over its median sigma | pass, 0.18 |
| C5 | E2 profile interval covers log10 M_d | pass, 0.795 |
| C6 | E2 reported: covariance coverage 0.945, profile open on a side in 0.47, median closed width 0.31 dex, median correlation 0.88 | REPORTED |
| D1 | no outer points: halo "not constrained", no halo interval leaked | pass, 0.92 (bound 0.90) |
| D2 | E1: halo constrained (the positive control) | pass, 1.00 |
| D3 | the five refusals (`points`, `error`, `radius`, `disk-mass-range`, `halo-form`) | pass |
| **D4** | **D5: a 15 km/s bump flagged "not adequate"** | **FAIL, 0.08 (bound 0.90)** |
| D5 | E1 false alarm | pass, 0.00 (bound 0.02) |
| E1 | the Milky Way pack decomposed (below) | REPORTED |
| E2 | the pack within published ranges | NOT RUN: the ranges were not supplied |

### The four failures, left failing

- **A3.** The committed reference writes m(x) as `ln(1 + x) - x / (1 + x)`. Evaluated as written it loses digits at
  small x (its two terms agree to x^2/2; the smallest x among the cases is 8e-4) and the mass round trip crosses 1e-12
  by 14 percent. The kernel uses `log1p`; against the same function evaluated with `log1p` the worst relative is 0
  in speed and 3.5e-16 in mass. Amendment AM1 records both forms (the committed one binds). Whether to judge on the
  `log1p` form is a question for Carl.
- **A5.** The bound 1e-3 was miscalibrated: m(x)/x = x/2 - 2x^2/3 + 3x^3/4 - ..., so v^2 / (v_s^2 x / 2) = 1 - 4x/3 +
  ..., whose first correction is 1.33e-3 at x = 1e-3, above the bound. The kernel agrees with the three-term series
  to 1.6e-9. The alternative (a bound of 2e-3, or the point x = 1e-4) is a question for Carl, not a change made here.
- **C3.** The profile interval of the disk mass covered 117 of 200 realizations, 3 short of the band (the binomial
  sigma at 0.68 is 0.035); its covariance interval covered 0.605. A band of 0.55 to 0.80 is the question for Carl; it is
  not applied.
- **D4.** The adequacy test (chi-square survival below 0.001) has little power against a localized feature: the four
  free parameters absorb part of a 15 km/s bump of 1.2 kpc and 24 points dilute the rest, so 8 percent were flagged.
  The bound is left; a residual diagnostic with power against a localized feature (the runs test of the statistics
  kernel on the normalised residuals) is a question for Carl.

Amendments, neither moving a bound: **AM0**, the parenthetical of leg A9 gave the first correction as 7e-5 and it is
(9/8)/y^2 = 4.5e-4; **AM1**, above. The consumers rule is not met (blocking: A3, A5, C3, D4).

## The Milky Way pack (leg E1, REPORTED; E2 NOT RUN)

Contract: each of the pack's three (R0, V0) sets, separately; contract C1 uses the points with 3 <= r < 25 kpc (14 per
set), contract C2 every point with r >= 3 kpc (45 or 46 per set); an NFW halo; the bulge fixed at 1e10 solar masses
with a = 0.7 kpc (a stated convention of this exercise, not a measurement and not a published value); the disk mass
searched from 1e9 to 2e11 solar masses and the scale length from 1 to 6 kpc, wide on purpose so that no literature
prior leans on the result; the errors as the pack gives them (0.6 to 100 km/s, the authors' weighted-average errors,
not independent measurements). Results, none of which is a claim:

- No decomposition is adequate: reduced chi-square is 4.8 to 5.2 under C1 and 2.6 to 4.1 under C2.
- Under C1 the halo is `not constrained` for all three sets (the curve stops at 25 kpc, and in every set one or both
  of the halo's parameters sit on a bound), and the disk mass runs to 7.8e10, 1.2e11 and 1.4e11 solar masses with a
  0.93 to 0.99 correlation with the halo speed: the disk takes the curve, which is the degeneracy the contract is
  there to show.
- Under C2 the halo is constrained in all three sets (v_s 304, 390 and 316 km/s; r_s 73, 53 and 42 kpc) and the disk
  mass is 1.6e11, 5.4e10 and 1.1e11 solar masses for the three sets: it moves by a factor of three with the adopted
  R0 and V0, which a student should see before any number is quoted.

Leg E2 compares the fit with published mass-model ranges; the repository holds none, so it is NOT RUN (below). The
pack's own limits stand: one set per adopted (R0, V0), errors that are not independent, and a curve that mixes
tracers.

## Part B (the escape speed and the local density): deferred, nothing built

Appendix C lists Part B as deferred by default until a suitable sample exists, and none does: the neighbourhood pack
is stratified in two random strata, selected on a radial velocity (a bright-star criterion), rounded to 14 to 22
arcseconds and limited to about 1 kpc, so it has neither the high-velocity tail nor the vertical coverage the
estimators need, and Prompt 236 forbids reporting either quantity from it. The estimators and their assumptions,
for the record of what a gate would commit:

- **The escape speed from the fastest stars:** a fit of the high-velocity tail of the speed distribution to a
  power law that vanishes at the escape speed, f(v) proportional to (v_esc - v)^k above a cut speed (the form of
  Leonard and Tremaine 1990, ApJ 353, 495, written from memory of the paper and unread here). It assumes the tail is
  populated up to v_esc, that every star above the cut is bound, that the sample's selection does not remove fast
  stars (a radial-velocity magnitude limit does), and that k is known or marginalised: v_esc and k are strongly
  correlated, so the interval is wide and its coverage must be measured.
- **A one-dimensional Jeans estimate of the local density:** d(nu sigma_z^2)/dz = -nu K_z for the tracer density
  nu(z) and vertical dispersion sigma_z, and rho = (1 / 4 pi G) |dK_z/dz| neglecting the radial and tilt terms. It
  assumes a steady, separable, plane-parallel disk, a known tracer density (so a known selection function), vertical
  velocities for stars to at least 1 kpc on both sides of the plane, and enough stars in vertical bins for a second
  derivative. It is sensitive to the tilt term, the disk's surface density and the choice of tracer.
- **The gate it would run:** the estimators on a synthetic sample with the same selection and a known truth, the
  coverage of the stated interval over a seeded ensemble, and the refusal cases (a tail with too few stars, a
  non-steady disk), with the verdict function committed first: **A** both with intervals; **B** the escape speed only;
  **C** reading steps "How fast to leave the Galaxy?" and "Dark matter next door" with the methods described and no
  number. With no suitable sample the verdict is C by default and nothing about a number is built. No threshold is
  committed here, because a count or a completeness bound chosen without the sample would be a guess.

## What is needed from Carl

1. **For leg E2:** `tests/fixtures/rotation-decomposition/published-ranges.json`, one file, transcribed from the papers
   and not from memory: `{ "quantities": [{ "id": "diskMass" | "diskScale" | "haloMass20" | "haloMass50" | "vTotal",
   "range": [lo, hi], "r0": <the Sun's radius the paper adopts, kpc>, "source": "<paper, identifier, table or equation,
   retrieval date>" }] }`, masses in solar masses, radii in kpc, speeds in km/s (`vTotal` is the circular speed at
   r0). Review articles and mass-model papers of the Milky Way are the usual places and the author of the file chooses
   them; this session read none. With the file, E2 runs against the bound already committed (the published range
   widened by the fit's own one-sigma); no bound is touched. Without it E2 stays NOT RUN and the lesson says that the
   pack's decomposition was not compared with a published model.
2. **For Part B** (only if wanted): a labelled Gaia DR3 sample with radial velocities selected by a documented query,
   as one file with the query text, the row count of the whole selection before any cut and the columns `source_id`,
   `parallax`, `parallax_error`, `pmra`, `pmdec`, `radial_velocity`, `radial_velocity_error`, `phot_g_mean_mag`,
   `grvs_mag` and `ruwe`; the gate's thresholds would then be committed before the file is read.

## Questions for Carl

1. **The four failures** (A3, A5, C3, D4). Ruled by the coordinator under Carl's delegation: they stay failing and
   labelled, no bound moves, the consumers rule stays unmet and nothing is built on it. The alternatives, one per leg,
   each a question for Carl and none applied: A3 judged on the `log1p` evaluation of m(x); A5 at a bound of 2e-3 or at
   x = 1e-4; C3 with a band of 0.55 to 0.80; D4 replaced by a residual diagnostic with power against a localized
   feature (the runs test of the statistics kernel).
2. **The cited forms** are written from the papers by this kernel's author and flagged for verification; the closed
   forms are checked against their own densities (A8) and the oracle, so a wrong speed law would have to be wrong in
   the density too. The comment in `js/kernels/galactic/rotation.js` that cites Bland-Hawthorn and Gerhard 2016 for a
   disk of 8e10 and scale lengths of 1.5 to 4.5 kpc as "physical bounds" was written the same way and is unverified;
   it is not changed here.
3. **Follow-up for Carl: `js/darkMatter.js`'s Bessel functions** are good to 2.3e-4 in speed at 120 kpc. Ruled: left
   alone here. Replacing them with the kernel's exact ones would be a separate PR; nothing visible would change below 40 kpc.

## Reproduction

`node tools/rotation-decomposition-validate.mjs --write-oracle-inputs` then
`/usr/local/bin/python3.9 tools/rotation-decomposition-oracle/oracle.py tests/fixtures/rotation-decomposition/oracle-inputs.json
tests/fixtures/rotation-decomposition/oracle-results.json` (numpy 1.26.4, scipy 1.13.1), then
`npm run decomposition:validate` (about a minute on Node 22; `-- --write-results` rewrites `results.json`,
`failed-legs.json` and `ensembles.json`; `-- --only=A,B` runs the rows whose id starts with them). The run is
reproducible: two runs give byte-identical `results.json`.

## References

The forms are written from the cited texts by the kernel's author; no agent fetched any of them, and every one is
flagged for Carl's verification. Hernquist (1990), ApJ 356, 359 (the bulge); Freeman (1970), ApJ 160, 811 (the thin
exponential disk); Navarro, Frenk and White (1996), ApJ 462, 563, and (1997), ApJ 490, 493 (the halo); Begeman (1989),
A&A 223, 47 (cored halos in rotation-curve fits, as `js/darkMatter.js` cites it); Abramowitz and Stegun (1964),
sections 9.7 and 9.8 (the Bessel functions' asymptotic series and polynomial approximations); IAU 2015 Resolution B3
and IAU 2012 Resolution B2 (GM of the Sun, the astronomical unit); Bhattacharjee, Chaudhury and Kundu (2014), ApJ
785, 63, through the pack `milky-way-rotation-curve` (D-GAIA-02); Leonard and Tremaine (1990), ApJ 353, 495 (Part B's
tail estimator, named for the fetcher). Nothing was fetched for this prompt.

<!-- Listed in DOCUMENTS.md. -->
