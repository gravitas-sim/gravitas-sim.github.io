# The baryon acoustic oscillation gate

Roadmap III, Prompt 257, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, `DECISIONS_2026-11-06.md`; prerequisites 255 and 256 are merged on `v3`). A
named BAO observable, a sound horizon, the standard-ruler relation, the combination rule, an independent oracle and the tolerances, all committed before any code, then measured on a spike.
**Verdict by the committed function: C** (the kernel part fails on one leg, E5, and the cited fitting formulas and the release's table are NOT RUN, so the verdict could not have been better
than NOT ESTABLISHED in any case, section 5). What C means here is narrow and stated in section 5: every numerical leg of the ruler passes to 1e-9 or better against an independent calculation
and against the one published full calculation this session could read; the goodness-of-fit flag of the likelihood has too little power at the design precision; the demonstration's peak is
not detectable at the pack's size. Nothing is built, the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, and **Part B is not begun** (the execution contract forbids starting the next
part). The record is decision-register rows D-R10-257-01 to D-R10-257-05.

The numbers are in `tests/fixtures/bao/` (`thresholds.json` the contract and its two amendments; `oracle-results.json` the pinned independent calculation; `authentic/planck-table1.json`
the printed numbers AM2 names; `results.json` the gate stream; `failed-legs.json`). The prototype (`js/kernels/cosmology/bao/bao.js`), the validator (`tools/bao-validate.mjs`), the
extraction script (`tools/bao-extract-planck.mjs`) and the oracle (`tools/bao-oracle/oracle.py`) are on `spike/bao-gate` (87655baf), never merged (rule 7.5.4): this PR is documentation and
fixtures only. The gate stream ran on Node 22.23.4 (37 s); the oracle on Python 3.9.6 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1 (23 s). Two complete runs agree row for row.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `c9f15eac` | `thresholds.json`: the observable as a form and a request, the ruler, the combination, the demonstration, the oracle, 38 legs, the verdict function | any prototype, validator, oracle script or output, and any computation |
| spike `aa38abb6`; `bd4d79a1` | the oracle script, and its first pinned output (it wrote the pair counts on the committed randoms) | the prototype existed |
| spike `7bb9045f` | the prototype and the validator, no run | any validator run |
| `8cd0b0cc` | AM1: a REPORTED sensitivity row (X5), after the oracle's first run showed the sidecar's first galaxy at RA 130.26, not 120 | the prototype existed; no bound moved |
| `3a9fa3b0` | AM2: P1 is NOT RUN as committed (Table 1's best-fit column prints no z_drag); a new leg P1b with its bound committed; **the numbers were seen first** (section 3) | the integral was run on any printed input |
| spike `bfc56531` | P1b in the validator and the extraction script | the validator was run |
| `8d1a9315` | `authentic/planck-table1.json`, read by script (`tools/bao-extract-planck.mjs`) from Carl's saved text, every line used printed | the validator was run |
| `7f54f8e8` | the oracle run again against the AM2 file (numbers unchanged; only the thresholds sha256 and the run time differ) | the validator was run |
| spike `87655baf`, run 1, run 2 | the stream (37 s), twice | |
| `8147be31` | results, failed legs | |

What had been seen before the contract was committed, and only that: the roadmap sections, the register rows and gate documents of 255 and 256, the 255 kernel's API, the pack's record (not its
2,911 values), and the COUNT of lines containing "drag" in the saved text of arXiv:1807.06209 (the full list is `seenBeforeCommitting`). Nothing was fetched and no published number, coefficient,
covariance value or licence term was typed from memory.

## 2. The decision

**The observable is a form, not a release (DEC1).** The committed observable is a BAO distance ratio at an effective redshift, in the anisotropic form (D_M/r_d, D_H/r_d) or the isotropic
D_V/r_d, with the release's fiducial cosmology and covariance, compared only through the ratio, never through a distance in Mpc alone. The release, its effective redshifts, values and covariance
are published data; none was fetched and none is typed here, so they are request O1 (section 7) and the three legs that need them (O1 to O3) are NOT RUN. This departs from the prompt's "which
release, which effective redshift" wording, recorded before any run.

**The ruler is the integral (DEC2).** `r_s(z_d) = Int_0^{a_d} c_s c da / (a^2 H)`, `c_s = 1/sqrt(3 (1 + R))`, `R = (3 omegaB / (4 omegaGamma)) a`, `a^2 H = H0 sqrt(Om a + Or + Ok a^2 + Ode a^(1 - 3 w))`,
finite at a = 0, in Mpc; the drag redshift is an INPUT. The fitting formulas for z_d and r_d have published coefficients, so none is implemented: they are request F1 and legs F1 to F5 (NOT RUN).
Radiation is `omegaGamma = rho_gamma / rho_crit,100` from T = 2.7255 K (read from astropy's installed Planck18 data file), the exact SI constants and G from astropy.constants, plus massless
neutrinos with `Neff = 3.046`; massive neutrinos are not modelled (they are bracketed in P1b only). Design domain of the integral: z_d in [500, 3000], omegaB > 0, Ob < Om, omegaGamma and Or > 0,
and the 255 kernel's own domain; outside it the function refuses with a code (nine codes, in the committed order, `soundHorizon.refusalCodesInOrder`).

For a Lambda-free flat matter-radiation universe the integral has a closed form (derived by differentiating the logarithm, `d/dx ln(sqrt(alpha (gamma x + delta)) + sqrt(gamma (alpha x + beta))) =
(sqrt(alpha gamma) / 2) / sqrt((gamma x + delta)(alpha x + beta))`):
`r_s = (c/H0)(1/sqrt 3)(2 / sqrt(b Om)) [ ln(sqrt(b (Om a_d + Or)) + sqrt(Om (1 + b a_d))) - ln(sqrt(b Or) + sqrt(Om)) ]`, `b = 3 omegaB / (4 omegaGamma)`; for `b -> 0` it is
`(c/H0)(1/sqrt 3)(2/Om)(sqrt(Om a_d + Or) - sqrt(Or))`.

**The likelihood.** Flat Lambda-CDM with `Or = 0` (the redshifts are below 3, where radiation is below 1 part in 1,000 of E^2), `model = theta b(Om)`, `theta = c / (H0 r_d)` a nuisance profiled analytically,
`chi2_prof(Om) = d^T C^-1 d - (b^T C^-1 d)^2 / (b^T C^-1 b)`; intervals are the sets `chi2_prof <= min + delta` (delta 1 and 4) on `Om` in [0.02, 0.98], grid step 0.001, end points by Brent's
method, a set that reaches an edge is open and reported as not constrained. BAO alone gives Om and H0 r_d; it gives no H0 and no r_d separately and the gate never reads one from it.

**The combination (DEC3).** A joint constraint from independent measurements is the product of likelihoods, the sum of chi-squares, and nothing else. **With 256 it is OMITTED**: 256's committed verdict
is FC (`SN_LIKELIHOOD_GATE.md` section 10.5) and Appendix C removes "257's combination" for a C. No supernova likelihood, no contour of 256's prototype and neither the split form nor the pack's
diagonal is used here, and neither is ever called a stand-in for the release's covariance (section 10.6 of that document). K1 tests the arithmetic of the product on a labelled synthetic factor
(`((Om - 0.28)/0.03)^2`, not any survey's likelihood).

**The demonstration (DEC4).** The pack `sdss-dr18-redshift-slice` has 2,911 galaxies with right ascension and redshift only: no declination is stored, so every galaxy and every random point sits at
the strip's midpoint, 0.25 degree (a transverse error of at most about 3.5 Mpc at 400 Mpc). Randoms: 10 x 2,911, RA uniform on 120 to 240, z shuffled from the data, on `stream('injection',
'257:bao:randoms')` (mulberry32 v1); Landy-Szalay on 12 bins of 10 Mpc/h from 40 to 160; delete-one jackknife over 12 RA blocks; the smooth model is a weighted straight line in log s outside the
window [90, 130) Mpc/h and the peak is detectable iff the largest window S/N is at least 4.

Delta table (rule 9). Existing authority: `js/kernels/cosmology/late` (255: distances, E(z), the domain and refusals), `js/numeric` (quadrature, linalg, roots), `js/kernels/statistics/special.js`
(gammaQ), `js/random/streams.js` (149). Missing behaviour: the sound horizon, D_V, the ratio relation, a profile likelihood over a nuisance, a pair counter. Adopter: this gate's spike only. Duplication
removed: none made; nothing was added to the product tree.

## 3. Results

44 rows: **27 pass, 2 fail, 4 reported, 10 not run, 1 omitted**.

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 sidecar sha256 and 2,911 rows | exact | pass |
| | I2 oracle and prototype decodes | sums 3.0e-15, first five 0 | pass |
| ruler | G1 Einstein-de Sitter closed forms (D_M, D_H, D_V) | 3.3e-15 (bound 1e-11) | pass |
| | G2 the empty universe | 5.4e-16 | pass |
| | G3 against astropy, 10 worlds x 8 redshifts | 8.0e-16 (bound 1e-10) | pass |
| | G4 D_V^3 = c z (1+z)^2 D_A^2 / H | 5.9e-16 | pass |
| | G5 (H0, r_d) scaling | 3.5e-16 | pass |
| | G6 low redshift, z = 1e-4 | 4.5e-5 (bound 5e-4) | pass |
| | R1 radiation against astropy's Ogamma0 and Onu0 | 5.0e-13 (bound 1e-9) | pass |
| | R2 closed form, 5 Lambda-free sets | 2.8e-16 | pass |
| | R3 against scipy quad (own E and astropy's H), 10 worlds | 1.1e-13 (bound 1e-9) | pass |
| | R4 baryon-free limit | 5.8e-8 (bound 1e-6) | pass |
| | R5 monotone in z_d, omegaB, Om, Neff | 20 of 20 steps each | pass |
| | R6 the error estimate covers the difference | 10 of 10 | pass |
| published | P1b r_drag of Planck 2018 VI Table 1 inside the bracketed interval | see section 4 | pass |
| | P1 (as committed) and P2 | Table 1's best-fit column prints no z_drag; a formula is needed | **not run** |
| ensemble | E1 coverage at 68.27 percent | prototype 0.6920, oracle 0.6935, band [0.6515, 0.7139] | pass |
| | E2 coverage at 95.45 percent | 0.9605 and 0.9605, band [0.9406, 0.9684] | pass |
| | E3 three pinned vectors, prototype against oracle | worst quantity at 0.4 percent of its tolerance | pass |
| | E4 not constrained (100 percent errors) | open in 100 percent of draws in both, no finite number reported for an open set | pass |
| | **E5 misspecified (open matter-only truth, 1 percent errors, flat fit): poor-fit flag in at least 80 percent** | **0.288 (prototype), 0.314 (oracle)** | **fail** |
| combination | K1 product arithmetic | sum difference 0; the joint best fit 0.291 lies between 0.326 and 0.28 | pass |
| refusals | Z1 400 seeded parameter sets: accept or code, and r_s of the 27 accepted | 0 disagreements, 6.2e-16 | pass |
| | Z2 six input refusals | 6 of 6, both implementations | pass |
| formula | F1 to F5 | request F1 | **not run** (5) |
| observable | O1 to O3 | request O1 | **not run** (3) |
| demonstration | D1 the stream, three seeds x 1,000 draws, bit for bit | 0 differences | pass |
| | D2 pair counts, oracle (cKDTree) against prototype (brute force) | identical to the pair | pass |
| | D3 xi_LS, D4 the jackknife sigma | 0 and 0 | pass |
| | D5 sixteen null catalogs unbiased in at least 11 of 12 bins | 12 of 12, both | pass |
| | **D6 the peak is detectable (largest window S/N at least 4)** | **0.539 (prototype), 0.539 (oracle)** | **fail: not detectable** |
| reported | X1 the sound horizon of the ten worlds (Mpc) | W1 145.8997, W2 153.4266, W3 145.9265, W4 145.8935, W5 145.9028, W6 145.8997, W7 145.8997, W8 154.6409, W9 145.1277, W10 151.3204 | |
| | X2 the position of the printed r_drag | below r_L by 0.0100 Mpc, 0.33 of u outside the interval | |
| | X3 pairs, xi, sigma_jk, S/N | DD 98,015 to 182,612 per bin; xi within 0.055 of zero; sigma_jk 0.041 to 0.088 | |
| | X5 randoms over the data's own RA extent (AM1) | largest window S/N 0.491 | |
| omitted | X4 the combination with 256 | OMITTED (Appendix C, 256 verdict FC) | |

Failing rows (2), left failing: **E5**, **D6**. Neither is a defect that a number of this file can cure: E5 is the power of a goodness-of-fit flag against a misspecification the flat family can partly
mimic, D6 is a measurement of the pack's size.

## 4. What the numbers say

* **The integral and the relation are right to rounding.** Against astropy 6.0.1 the distances agree to 8e-16, against the closed forms to 3e-15 and the sound horizon against two independent
  quadratures (scipy with its own E(z) and with astropy's H(z)) to 1.1e-13, against the closed form of the Lambda-free set to 3e-16. Both sides integrate the same smooth integrand
  (the 255 kernel's integrator is adaptive Gauss-Legendre, the oracle's scipy's QUADPACK, in different variables), so agreement at this level says the code implements the formula, not that the
  formula is the physics.
* **One published full calculation could be read, and the integral matches its massless-neutrino end.** AM2's P1b: Planck 2018 VI Table 1 (best-fit column): omegaB 0.022383, omegaC 0.12011, H0 67.32,
  r_drag 147.049 Mpc; z_drag 1059.94 +- 0.30 from Table 2's fifth column. The integral at those inputs gives r_L = 147.0590 Mpc (three massless species) and r_H = 152.2345 Mpc (one 0.06 eV species
  counted as non-relativistic matter at z_d), u = 0.0309 Mpc, interval [147.028, 152.265]; the printed 147.049 is inside it and 0.0100 Mpc (6.8e-5 relative) **below r_L**, at the bottom of the
  bracket, 0.33 of u outside [r_L, r_H]. **Limit, stated plainly:** the H case is an extreme, not a physical bracket (at z_d the neutrino temperature is of the order of 0.2 eV against a mass of 0.06 eV, so
  the species is still relativistic and behaves almost like radiation; the true effect of the mass is a small fraction of the gap between the two extremes), which makes the committed interval 3.5 percent wide; the pass therefore proves less than the position
  shows. The informative statement is the reported one: the integral reproduces the printed full calculation to 7e-5 at the massless end. Because the numbers were seen before AM2, this is not a
  blind comparison; a tighter leg (relative agreement with r_L within u) would be a new leg committed first and is a question below.
* **The interval machinery covers.** 2,000 draws each: 0.692 and 0.9605 (prototype), 0.6935 and 0.9605 (oracle), all inside the three-sigma binomial bands. With 100 percent errors every draw's interval
  is open and no finite two-sided number is reported.
* **E5, the goodness-of-fit flag, has little power at this design.** Data from an open matter-only universe (Om 0.3, Ok 0.7) with 1 percent errors at three redshifts are fitted with flat Lambda-CDM and
  free (Om, theta); the p < 0.0027 flag fires in 28.8 percent (prototype) and 31.4 percent (oracle) of 500 draws, against the committed 80 percent. The two agree within their binomial noise. The
  result is consistent with the flat family, with a free Om and a free theta, absorbing most of the difference at this precision (not separately investigated); the committed bound was a design choice made before any run, not a reading of the physics, and it stays.
  A flag with its power stated at a stated misspecification would be a new leg (question 2).
* **The peak is not detectable at the pack's size, with room to spare.** The largest window S/N is 0.54 (bound 4), identically in the oracle and the prototype, the null catalogs are unbiased in 12 of 12
  bins, and the jackknife sigma per bin is 0.04 to 0.09 against a correlation function that is within 0.055 of zero everywhere. The strip is 0.5 degree wide in declination, so every pair is
  effectively along the line of sight and RA, and the sample holds about 100,000 to 180,000 pairs per 10 Mpc/h bin. With the randoms over the data's own RA extent (AM1, reported) the number is
  0.49. A production script would also need a pack that stores declination (DEC4). No demonstration is built.
* **What the stream does not touch.** The sidecar's first RA is 130.26, so the committed footprint carries an empty 10 degree block; AM1 shows it does not matter for the verdict.

## 5. The verdict, by the function

**C.** The committed function: KERNEL PASS needs every leg of groups integrity, ruler, ensemble, combination and refusals to pass (E5 does not), P1b to pass or be NOT RUN (it passes) and the
demonstration's D1 to D5 to pass if the demonstration is to be built; otherwise KERNEL FAIL, and a KERNEL FAIL is C ("a reading step; 260's The pillars omits BAO", Appendix C). Had E5 passed the
verdict would have been **NOT ESTABLISHED** (F1 to F5 NOT RUN), which is neither A, B nor C and meets no consumers clause either, so the consequence for the product is the same in both cases:
**nothing may be built on this kernel.** The consumers clause is unmet. The verdict does not say the sound-horizon integral or the distance ratios are wrong (every numerical leg of them passes); it
says the committed validation contract is not met and that the cited-formula and named-observable parts could not be tested.

## 6. What the verdict permits (and does not)

* **Part B is not begun** and is declined in this session. By Appendix C a C yields a reading step; what survives is a reading step about what BAO measure (a ratio D/r_d at an effective redshift, with a
  fiducial cosmology and a covariance, never a distance or an H0 alone), which needs no kernel.
* **The consumers rule holds.** No lesson, panel, viewer, contour, model-page section or data pack.
* **Nothing here changes 255 or 256.** The 255 kernel is unchanged; the split form and the pack's diagonal are not called stand-ins for the release's covariance.
* If Carl wants the kernel part to be able to reach NOT ESTABLISHED or better, the route is new legs with bounds committed first (questions 2 and 3), then the requests of section 7.

## 7. Requests (nothing fetched, nothing typed)

| Request | State |
| --- | --- |
| **O1** a BAO release's table, `tests/fixtures/bao/authentic/published-release.json` with a sources record: citation identifiers, the effective redshift of each measurement, the measured D_M/r_d and D_H/r_d (or D_V/r_d, or the alphas with the fiducial values to convert them) with the printed digits, the covariance or correlation matrix as a file with its sha256, the fiducial cosmology (Om, omegaB, h, Neff, the neutrino mass, r_d,fid), the paper's printed flat-Lambda-CDM matter density from BAO alone with its uncertainty, the terms as read, a retrieval date and a rights basis (7.5 rule 4). arXiv or the collaboration's data release. | NOT RUN: legs O1 to O3 |
| **F1** the source text of the cited fitting formulas for z_d and r_d: equations with every coefficient and exponent as printed, the stated domain, the stated accuracy, the terms as read (a transcription checked against the extracted text, with the PDF's sha256). Candidates for Carl's session to choose and record: Eisenstein and Hu 1998 (astro-ph/9709112) and a later fit to Boltzmann-code output. | NOT RUN: legs F1 to F5, P2 |
| **X1** a Boltzmann code (CAMB, CLASS) or a fitting package pinned as a fixture: a second independent full calculation. Downloading or running code needs Carl's separate permission. | not requested of this session |

The correlation-function data is the pack already in the tree (public domain, D-COSMO-04); the Planck numbers rest on D-R10-255-11 (same document, same use). The BAO table has no rights decision:
none is possible before a release is chosen and its terms are read.

## 8. Questions for Carl

1. **A release and a formula.** Name the BAO release (and fetch O1) and the fitting-formula source (F1)? These are the only route from NOT ESTABLISHED to B or A; both are fetches only your session may make.
2. **E5.** Keep it failing as committed (recommended) and add, as a NEW leg with its bound committed first, a flag whose power is stated at a stated misspecification (for example the leg passes if the flag
   fires at the rate the closed-form non-central chi-square predicts for a stated misfit), so the contract tests the flag's calibration and not a precision?
3. **P1b.** Add a tighter new leg (the printed r_drag within u of r_L at the massless-neutrino end, with z_drag's sigma in u), committed first and labelled not blind? Recommendation: yes, with the H extreme kept only as reported.
4. **Demonstration.** Not detectable at 2,911 galaxies in a 0.5 degree strip; a declination column would be a pack change and the signal would still be far too small. Close the optional demonstration for this pack (recommended), or name a larger public sample (a data decision)?
5. **Part B.** Wait for 1 to 3 (recommended); the reading step the verdict allows can be its own small prompt if wanted.

## 9. Reproduce

`STUBS=<dir with the import-only PyYAML stand-in> python3 -E tools/bao-oracle/oracle.py thresholds.json cosmology/sdss-dr18-redshift-slice.json oracle-results.json` and
`node tools/bao-validate.mjs thresholds.json oracle-results.json cosmology/sdss-dr18-redshift-slice.json data-packs/sdss-dr18-redshift-slice.json <outdir> authentic/planck-table1.json` on the spike branch;
`node tools/bao-extract-planck.mjs <saved text> <out.json>` rebuilds the Planck fixture from Carl's saved text. `tests/baoGate.test.js` recomputes the verdict, the counts and the status of every row from
the pinned files and checks the record against this document and the register.
