# The baryon acoustic oscillation gate

Roadmap III, Prompt 257, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, `DECISIONS_2026-11-06.md`; prerequisites 255 and 256 are merged on `v3`). A
named BAO observable, a sound horizon, the standard-ruler relation, the combination rule, an independent oracle and the tolerances, all committed before any code, then measured on a spike.
**Verdict by the committed function: C** (the kernel part fails on one leg, E5, and the cited fitting formulas and the release's table are NOT RUN, so the verdict could not have been better
than NOT ESTABLISHED in any case, section 5). What C means here is narrow and stated in section 5: every numerical leg of the ruler passes to 1e-9 or better against an independent calculation
and against the one published full calculation this session could read; the goodness-of-fit flag of the likelihood has too little power at the design precision; the demonstration's peak is
not detectable at the pack's size. Nothing is built, the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, and **Part B is not begun** (the execution contract forbids starting the next
part). The record is decision-register rows D-R10-257-01 to D-R10-257-05.

**Follow-up, 2026-11-07 (section 10).** Carl's session fetched the BOSS DR12 consensus BAO-only table and covariance and the Eisenstein and Hu 1998 formulas; the authentic legs O1 to O3, F1 to F5 and P2 were run, with new legs committed first. The product verdict by the committed function **stays C** (E5 still fails and is not touched); the numbers of sections 1 to 9 are the Part A record and are unchanged.

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


## 10. Follow-up: the authentic legs (2026-11-07)

Prompt 257's follow-up, under the delegate's rulings of 2026-11-07 (`DECISIONS_2026-11-07.md`): E5 stays failing and labelled (not rerun, not touched); a flag-calibration leg and a tighter P1b are allowed only as NEW legs with bounds committed first; the optional demonstration (D6) is closed for this pack and not rerun; Part B waits; the consumers rule holds (no lesson, panel, viewer or contour). The supernova gate's verdict is FC and nothing here combines BAO with 256's split form or diagonal. **Nothing was fetched by this session and no downloaded code was run**; the data are the files Carl's session saved in `scratch-data/bao257/` (outside every repository).

**Sources** (`tests/fixtures/bao/authentic/SOURCES.json`, retrieved 2026-11-07, sha256 of every file, locators by PDF page): Alam et al. 2017 (arXiv:1607.03155), the BAO-only consensus results (6 values) and total covariance (6 x 6), kept byte for byte (203 and 288 bytes; the 5 KB tarball is not kept) with the paper's printed Table 7 and Table 10 numbers read by script; Eisenstein and Hu 1998 (arXiv:astro-ph/9709112v1), equations (2) to (6) and (26) read by script from the layout text (every number one regular expression on one anchored line, checked against a second, raw-mode extraction), with the equation structures and pages 4, 5 and 12 checked against the rendered PDF by eye. **Terms:** the SDSS "How to Cite" page asks for citation of public data, so the basis is cite-only, derived numbers and short fixtures; **the arXiv licence page of the Eisenstein and Hu paper was not read** by anyone, so only coefficients (facts) and cited statements are kept (question 3).

**Order, each before the next:** `004d8844` the fixtures (data, no result); `b7612495` `thresholds-followup.json` alone, the bounds of every new leg and the instantiation of the committed ones (AM3 to AM5); `b460e30e` AM6 (a degenerate comparison and a reported row's unit slip, both found in the second oracle's first run, which was read; no bound moved); `88b660f5` the second oracle's pinned output (Python 3.9.6, numpy 1.26.4, scipy 1.13.1, no `astropy.cosmology`); the prototype additions and the validator on `spike/bao-authentic` (`f709f958`, never merged), no run until then; the stream twice on Node 22.23.4 (12 s, rows identical); `38de950e` results. What was seen before the bounds were committed is in `seenBeforeCommitting` (the fixtures, the page images, two hand estimates: equation (26) at the Planck row about 150 Mpc and the constant 31.5 as 3/(4 omega_gamma) at 2.7 K); no gate quantity had been computed by any program.

### 10.1 Results

19 rows: **9 pass, 5 fail, 2 not run, 3 reported**. Failing rows, left failing: **F1, F2, F5, P2, F1b**.

| Leg | Measured | Status |
| --- | --- | --- |
| **O1** table integrity | sha256 and bytes as recorded, symmetric to 0, Cholesky succeeds (smallest eigenvalue 1.866), 6 ratios at z 0.38, 0.51, 0.61 in the file's own order, both implementations | pass |
| O1b (new) printed Table 7 | 6 of 6 values round to the printed digits, 6 of 6 sqrt(C_ii) inside the printed-error range | pass |
| **O2** BAO-alone Om against the printed value | the paper prints none (Table 10 has Planck, Planck + BAO and so on, no BAO-alone row; pdf page 28) | **not run** |
| **O3** the table's alphas | the paper defines the alphas (equation 11) but prints only D_M and H for the consensus | **not run** |
| O2b (new) BAO-only Om against the printed combined values | best fit Omega_m 0.366, 68 percent [0.311, 0.428], 95 percent [0.262, 0.498], chi-square 1.99 for 4 degrees of freedom (p 0.737); Delta chi-square 1.08 at the printed Planck + BAO 0.309 and 0.78 at Planck's 0.317 (bound 4); prototype and oracle agree to 1e-11 | pass |
| O3b (new) fiducial alphas | value over fiducial for D_M(0.38), H(0.38), D_M(0.51), H(0.51), D_M(0.61), H(0.61): 0.988, 0.979, 0.996, 1.014, 1.000, 1.039; residuals over sigma -0.71, -0.73, -0.24, +0.55, -0.01, +1.50, all inside 3; joint chi-square 3.87 for 6 degrees (p 0.69); kernel against the oracle's own quadrature 1.5e-16 | pass |
| **F1** equation (4) against the printed z_drag | 1020.70 against 1059.94, -3.70 percent; **the source states no accuracy for equation (4)**: the committed threshold is unmeasurable and fails by the committed rule (AM3, decided before any run) | **fail** |
| **P2** the same against the same row | as F1 | **fail** |
| F1b (new) the same, design bound 2 percent | -3.70 percent | **fail** |
| **F2** equation (26) against the integral, 23 nodes of the stated domain | maximum 3.10 percent (omega0 0.025, omega_b 0.0242); 4 of 23 nodes above the stated 2 percent: three at omega0 = 0.025 (2.22, 2.72, 3.10 percent) and (0.5, 0.0125) at 2.70 percent | **fail** |
| **F3** equation (26) against the printed r_drag | 149.95 against 147.049: 1.9745 percent against 2.00034 percent | pass (narrow) |
| **F4** the domain | 12 of 12 outside points refused with the expected code, 3 of 3 inside accepted, prototype and oracle | pass |
| **F5** the oracle's maximum error of (26) | 3.10 percent (scipy quad; prototype agrees to 7e-16 in the integral, 0 in the formula) | **fail** |
| F6 (new) equation (6) against the integral | maximum 0.109 percent, worst node 0.30 of its printed-digit allowance (0.21 to 0.43 percent), oracle identical | pass |
| P1c (new, not blind) the tighter P1b | the integral with the 0.06 eV species by its Fermi-Dirac density: 147.0523 Mpc against the printed 147.049, 0.0033 Mpc (2.2e-5) below, 0.11 of u = 0.0303; prototype and oracle agree to 0 | pass |
| E6 (new) calibration of the poor-fit flag | at the committed misfit lambda 9.815 and p_pred 0.3183 (closed-form non-central chi-square); observed 0.300 (prototype) and 0.316 (oracle) in [0.287, 0.350]; no misfit: 0.005 and 0.002 in [0, 0.0062]; lambda and p_pred equal to 1e-11 | pass |
| X6, X7, X8 reported | the exact-in-(D_M, H) profile gives best Omega_m 0.365 and 95 percent [0.257, 0.496], chi-square 2.06 (the delta method of O2b is 0.001 to 0.005 away); Or = 0 changes the alphas by at most 1.3e-4; at the Planck row equation (6) gives 150.96, (26) 149.95 and the integral at (4)'s z_d 150.86, all above the printed 147.049 | |

### 10.2 What the numbers say

* **The release is read correctly, and flat Lambda-CDM fits it.** The files are the recorded bytes, the covariance is symmetric and positive definite, the printed digits reproduce, and the consensus agrees with the fiducial cosmology's prediction through the 255 kernel (all six components inside 3 sigma, joint p 0.69). BAO alone gives Omega_m = 0.37 with a 95 percent set of 0.26 to 0.50, so the printed Planck + BAO value 0.309 and Planck's 0.317 are inside it: consistent, not compared for agreement (the paper prints no BAO-alone value, so O2 stays NOT RUN). BAO alone gives H0 r_d (9,825 km/s at the best fit), never H0 and r_d separately.
* **The sound-horizon integral reproduces the one published full calculation to 2e-5.** With one 0.06 eV species modelled by its Fermi-Dirac density, the integral gives 147.0523 Mpc against the printed 147.049 at the printed z_drag. The two-case bracket of P1b (3.5 percent wide) is not needed to see that; P1c is not blind (the P1b numbers had been seen).
* **Eisenstein and Hu's formulas are not what the committed legs hoped.** Equation (6) is a faithful closed form of the integral to 0.11 percent, inside the rounding of its three-digit constants. Equation (26) holds to its stated 2 percent over most of its stated domain but not at the low-matter-density, high-baryon-fraction corner (to 3.1 percent) and at omega0 = 0.5 with omega_b = 0.0125 (2.7 percent); at the Planck row it is 1.97 percent high, barely inside. **Equation (4), the drag redshift, is 3.7 percent below Planck's printed z_drag (1020.7 against 1059.94), and the paper states no accuracy for it** (it says it reduced z_d by a factor 0.96 "on phenomenological grounds"). The integral at equation (4)'s z_d is 150.86 Mpc against 147.049, so the 2.6 percent excess comes almost entirely from the drag redshift (P1b's massless integral at the printed z_drag is 147.059), not from the integral. A z_d source with a stated accuracy is what a ruler would need (question 2).
* **E6: the flag is calibrated; E5's 29 to 31 percent is what the arithmetic predicts.** At the committed misfit the non-centrality is 9.8, whose closed-form prediction for the flag rate is 0.318; E5 observed 0.288 and 0.314 and E6 0.300 and 0.316, all inside the binomial bands, and at no misfit the flag fires at the nominal 0.0027 within noise. The committed 80 percent bound of E5 would need a non-centrality of about 20.4 (computed with scipy, not a leg), that is a misfit about 1.4 times as large at the same errors. This is a statement about the design, not a repair: **E5 still fails and stays failing**; only Carl resets it.

### 10.3 The verdict, by the function

The parent's function (`thresholds.json`, `verdict`) over the parent's 44 rows with the follow-up's statuses for F1 to F5, P2 and O1 to O3: **C**, **KERNEL FAIL** on E5 alone, the consumers clause unmet. Had Carl reset E5 the function would still give **C**, because F1, F2, F5 and P2 fail (with F1 and P2 NOT RUN it would still be C, F2 and F5 failing). New legs never enter the function. O2 and O3 NOT RUN also put A out of reach. What C permits is as in section 6: a reading step about what BAO measure; nothing is built, Part B waits, the consumers rule holds. What the follow-up adds for a later decision: the release's table and covariance read and consistent, the integral validated against a published full calculation to 2e-5, and a precise statement of what the cited fitting formulas can and cannot be used for.

### 10.4 Rights, size and consumers

Rights: `authentic/SOURCES.json` (cite-only, derived numbers and short fixtures, no home path in any fixture); the Eisenstein and Hu licence page was not read (question 3). Size: no ceiling raised, no byte shipped, no precache tier or bundle changed; the PR is documentation, fixtures (about 76 KB in all, none shipped), one test and register rows. No lesson, panel, viewer, contour, data pack or model-page section.

### 10.5 Questions for Carl

1. **F1 and P2.** They FAIL because the paper states no accuracy for its drag-redshift fit and the committed rule fails an unmeasurable threshold (AM3, decided before any run). If you read that rule as "NOT RUN" instead, the product verdict is unchanged (C) but F1 and P2 would not be failing rows; F2 and F5 fail either way.
2. **A drag-redshift source with a stated accuracy** (a later fit to Boltzmann-code output, or Planck's tabulated z_drag used as an input with the neutrino mass modelled as in P1c) is the one route to a formula leg that can pass; a fetch only your session makes.
3. **The arXiv licence of Eisenstein and Hu 1998** was not read; only coefficients and cited statements are kept. A rights decision, or a removal of `fitting-formulas.json`, is yours.
4. **O2 and O3** need a source that prints a BAO-alone Omega_m and alphas (another BAO paper); optional; A needs them to pass, and B or A also needs the formula legs, which fail.
5. **E5** stays failing and labelled; E6 shows what its bound asks for (a non-centrality of about 20 rather than 10, a misfit about 1.4 times as large at the same errors). Reset or reframe is yours.
6. **Part B** waits.

### 10.6 Reproduce

`python3 -E tools/bao-oracle/oracle2.py tests/fixtures/bao/authentic tests/fixtures/bao/thresholds-followup.json tests/fixtures/bao/thresholds.json oracle-followup.json` and `node tools/bao-validate-followup.mjs tests/fixtures/bao/thresholds-followup.json tests/fixtures/bao/thresholds.json tests/fixtures/bao/results.json tests/fixtures/bao/oracle-followup.json tests/fixtures/bao/authentic <outdir>` on `spike/bao-authentic` (the oracle and the validator are there, never merged); `node tools/bao-extract-eh98.mjs` and `node tools/bao-extract-alam.mjs` rebuild the two transcriptions from the saved layout texts. `tests/baoFollowup.test.js` recomputes every status from the pinned files.

<!-- Listed in DOCUMENTS.md. -->
