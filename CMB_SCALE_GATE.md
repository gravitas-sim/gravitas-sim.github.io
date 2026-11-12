# The microwave background angular-scale gate

Roadmap III, Prompt 258, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, `DECISIONS_2026-11-06.md`; prerequisites 255 and 157 are merged on `v3`). The conventions
(r_s(z*), D_M(z*), theta* = r_s / D_M, the peak relation and its offset), a bounded peak fit, the claim rule, an independent oracle and the tolerances, all committed before any code, then measured
on a spike. **Verdict by the committed function: C** (the kernel part fails on three legs, B5, E1 and E2, and the binned spectrum, the grid, the cited fitting formulas and the cited code's output are
NOT RUN, so the verdict could not have been better than C by absence in any case, section 5). What C means here is narrow: every numerical leg of the geometry relation passes to 1e-13 or better against
an independent calculation, and the integral reproduces the one published full calculation this session could read; the committed direction of one leg was wrong physics (B5, a sign error of this
session's, left failing); the bounded peak fit's 68 and 95 percent intervals are not calibrated at the design signal to noise (a multipole-level systematic). Nothing is built, the consumers rule (Carl,
2026-11-05 and 2026-11-06) holds, and **Part B is not begun** (with a C there is no Part B: Appendix C gives a reading step). The record is decision-register rows D-R10-258-01 to D-R10-258-05.

The numbers are in `tests/fixtures/cmb-scale/` (`thresholds.json` the contract and its five amendments; `authentic/planck-cmb.json` the printed numbers read by script; `oracle-results.json` the pinned
independent calculation; `results.json` the gate stream; `failed-legs.json`). The prototype (`js/kernels/cosmology/cmb/cmb.js`), the validator (`tools/cmb-validate.mjs`), the extraction script
(`tools/cmb-extract-planck.mjs`) and the oracle (`tools/cmb-oracle/oracle.py`) are on `spike/cmb-scale-gate` (5fc70025), never merged (rule 7.5.4): this PR is documentation and fixtures only. The
gate stream ran on Node 22.23.4 (2 s); the oracle on Python 3.9.6 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1 (6 s). Two complete runs of the second validator agree row for row.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `641c275e` | `thresholds.json`: the conventions, the claim rule, the peak fit, the synthetic peak, 39 legs, the verdict function, the requests | any oracle, prototype, validator, and any computation |
| `2f94a46f` | `authentic/planck-cmb.json`, the printed rows legs P1 to P3 name, read by script from Carl's saved text (**not blind**, below) | the oracle, the prototype, the validator |
| `edd2ebf1` AM1, AM2 | `beyond-antipode` joins the refusal order (the 255 kernel's call-time code); the stream check belongs to I1 | any oracle run |
| `48f6d5c9` AM3 | `bad-window` defined (a single bin), P1's D_M source (the massive-neutrino model's own integral), A2's five sets, G2's outside points | any oracle run |
| `10c5df68` AM4 | after the oracle's **first** run was read: B5's committed direction for r_s versus z* is wrong physics and stays failing; E1 and E2 expected to fail; **new, not blind** legs B5b, E6a, E6b | any prototype or validator run |
| `ec9a3cda` | the oracle's pinned output, run against the thresholds that carry AM1 to AM4 | the prototype |
| spike `5e114d4e` | the prototype and the validator, no run | the first validator run |
| `117bc14c` AM5 | the validator's first run measured B6 against theta*'s error estimate instead of r_s's; corrected, no bound moves | the second and third runs |
| spike `5fc70025`; `71fc683a`; `b2bafab2` | the fix; the oracle run again against the AM5 file (numbers unchanged); the stream's results, run twice | |

**What had been seen before the contract was committed** (the `seenBeforeCommitting` list): the roadmap sections, the decision files, `BAO_GATE.md`, the 255 kernel's API, the 257 spike's integrals, and the
printed rows of Table 1 and Table 2 of arXiv:1807.06209 in Carl's saved text as printed numbers (100 theta*, z*, r*), while locating the rows P1 and P2 name. P1 and P2 are therefore **not blind**: their
bounds are set by a rule written before any computation, not from a computed result. **What was seen after the first oracle run** is listed in AM4 (the E1 coverage 0.1245 and the apex bias, B5's direction,
the oracle's value at the Planck inputs). Nothing was fetched, no code was downloaded and no published number, coefficient, offset, spectrum value or licence term was typed from memory.

## 2. The decision

**Conventions (DEC1, DEC2).** `z*` is an input (design domain 800 to 1500; the cited fitting formula and its domain are request F1). `r_s(z*) = Int_0^{a*} c_s c da / (a^2 H)`, comoving, from the integral,
never from the Eisenstein and Hu fit (which failed its legs in 257). `D_M(z*)` is the comoving transverse distance of the 255 kernel (radiation included, curvature by sinh or sin). `theta* = r_s / D_M`,
`ell_A = pi / theta*`, `ell_1 = ell_A (1 - phi_1)`; the offset `phi_1` is an input (design domain [0, 0.5]; its cited formula is request F2) and a value used in a leg is labelled DESIGN. The inverse a lesson
may read, `theta* = pi (1 - phi_1) / ell_1`, is conditional on the stated offset and on the stated r_s inputs. For P1 and P2 one 0.06 eV neutrino is modelled by its Fermi-Dirac density (as P1c of 257 did).

**The claim rule (DEC3).** A lesson reads the geometry from the first peak's position through the relation and never reads a Hubble constant, a matter or baryon density or a composition from which grid
spectrum looks closest. A sentence violates iff it matches a GRID term and a READ term and no NEG term (English and Spanish word lists in `thresholds.json`); K1 tests the rule on 24 sentences and K2 scans the
shipped tree. The prototype has no function from a spectrum to a parameter through a grid (I2 tests the export list); the grid is a comparison drawn at the node nearest to the student's own parameters,
linear between nodes, never extrapolated (G2, G3).

**The peak fit (DEC4).** A weighted quadratic by least squares in a window of +-75 multipoles about the largest bin; the apex and a delta-method interval; not constrained (no number) for fewer than 5 bins, a
curvature weaker than 5 sigma, an apex outside the window or an interval wider than the window. The synthetic spectrum is a labelled DESIGN with a skewed peak (not any measurement), so a failure by bias is
a result, not a surprise.

Delta table (rule 9). Existing authority: `js/kernels/cosmology/late` (255: D_M, E(z), refusals, domain to z = 1e4), `js/numeric` (quadrature, polyfit), `js/dataKinds/grid.js` (157: `readGrid`, multilinear
interpolation, refusal outside), `js/random/streams.js` (149). Missing behaviour: the sound horizon at z*, theta* and the peak relation, the peak fit, the nearest node, the claim rule. Adopter: this gate's
spike only. Duplication removed: none made; nothing was added to the product tree.

## 3. Results

42 rows: **25 pass, 5 fail, 4 reported, 8 not run**.

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 fixtures, thresholds and Planck sha256, the stream's first 1,000 uniforms | exact; 0 differences | pass |
| | I2 the export list | exact | pass |
| relation | A1 Einstein-de Sitter D_M at z* of 800, 1090, 1500 | 1.6e-16 (bound 1e-11) | pass |
| | A2 Lambda-free closed form of r_s, five sets | 3.0e-16 (1e-10) | pass |
| | A3 theta* unchanged by H0 -> lambda H0, 30 cases | 3.3e-16 (1e-13) | pass |
| | A4 ell_A, ell_1 and theta* round trip, 270 cases | 2.2e-16 (1e-14) | pass |
| | A5 theta* monotone in Omega_k, continuity at 0 | decreases with Omega_k; 1.4e-9 (1e-7) | pass |
| oracle | B1 D_M of ten worlds against astropy | 4.3e-15 (1e-10) | pass |
| | B2 r_s against scipy quad (own E; astropy's H) | 3.9e-16; 1.1e-13 (1e-9) | pass |
| | B3 theta*, ell_A, ell_1 against the oracle | 3.6e-16 (1e-9) | pass |
| | B4 radiation against astropy's Ogamma0 + Onu0 | 4.3e-13 (1e-9) | pass |
| | **B5 directions (r_s with omegaB, Om, and, as committed, INCREASING with z*; D_M with z*)** | 20, 20, **0**, 20 of 20 | **fail** |
| | B5b (new, not blind) r_s DEcreases with z* | 20 of 20, oracle agrees | pass |
| | B6 the error estimate of r_s covers its difference from the oracle | 10 of 10 | pass |
| | C1 a cited Boltzmann code's theta* and peak for the ten sets | request X1 | **not run** |
| ensemble | **E1 68.27 percent interval covers ell0** | 0.1355 (prototype), 0.1245 (oracle); band [0.651, 0.714] | **fail** |
| | **E2 95.45 percent interval** | 0.2935, 0.3205; band [0.941, 0.968] | **fail** |
| | E3 three pinned vectors, apex, sigma, curvature, bins | 2.8e-14 (1e-9) | pass |
| | E4 bins 200 wide: not constrained, `too-few-bins` | 500 of 500, both | pass |
| | E5 no peak: not constrained | 100 percent, both (425 no-curvature and 75 too-few-bins; 405 and 95) | pass |
| | E6a, E6b (new, not blind) coverage on the symmetric truth | 0.399 and 0.7425; 0.396 and 0.754 | **fail** (outside the verdict) |
| refusals | Z1 400 seeded sets, committed order | 0 disagreements; 7 accepted, 6.8e-16 | pass |
| | Z2 six peak-fit input refusals | 6 of 6, both | pass |
| claim | K1 the rule on 24 sentences (12 violating, 12 clean) | 12 of 12, 12 of 12, agrees with the oracle on all 24; a 323-pair probe of the word lists, 0 misses | pass |
| | K2 the shipped tree | 2,820 files, 39 sentences with a CMB context word, 0 violations | pass |
| grid | G1 the precomputed grid, its provenance | request G1 | **not run** |
| | G2 `readGrid` and linear interpolation on a synthetic grid; six outside points refused | 3.8e-16 (1e-12); 6 of 6 | pass |
| | G3 the nearest node, 200 stream points, ties to the lower index | 200 of 200; ties 0, 1, 3 as expected | pass |
| published | P1 100 theta* at Planck 2018 VI's printed inputs against the printed best-fit 1.041085 (not blind) | 1.041087; 1.5e-6 (bound 5e-4) | pass |
| | P2 r_s against the printed r* of 144.43 (not blind) | 144.3935; 2.5e-4 (1e-3) | pass |
| | P3 prototype against the oracle at the same inputs | 2.6e-16 (1e-9) | pass |
| formula | F1 z* formula; F2 peak-offset formula | requests F1, F2 | **not run** (2) |
| spectrum | S1 integrity; S2 the peak from the spectrum with the offset; S3 coarse rebinning; S4 the rights decision | requests S1, F2; **NOT DECIDED** | **not run** (4) |
| reported | X1 the ten worlds; X2 the Planck sensitivity; X3 the apex bias; X4 the curvature | section 4 | |

Failing rows (5), left failing: **B5**, **E1**, **E2**, and the new **E6a**, **E6b**. B5, E1 and E2 are in the verdict function; E6a and E6b never are.

## 4. What the numbers say

* **The geometry relation is right to rounding and the integral reproduces the published full calculation.** D_M(z*) agrees with astropy to 4.3e-15, r_s with two independent quadratures to 1.1e-13 or
  better, the Lambda-free closed form to 3.0e-16, and theta* is independent of H0 at fixed fractions to 3.3e-16. With one 0.06 eV neutrino by its Fermi-Dirac density and Table 1's best-fit
  omega_b, omega_c and H0, the integral gives 100 theta* = 1.041087 against the printed best-fit 1.041085, and r_s = 144.394 Mpc against the printed r* = 144.43 +- 0.26 (0.14 of its sigma).
  **Limit, stated plainly (not blind):** 1.5e-6 is smaller than the mixed columns can account for (z*'s printed sigma moves theta* by 1.5e-4, X2), so the figure is partly the coincidence of
  taking a marginalised z* with a best-fit parameter vector; what the leg supports is agreement within about 1.5e-4, which the committed bound (5e-4) states. Because both sides integrate the same smooth
  integrand, agreement at rounding level says the code implements the formula, not that the formula is the physics.
* **A massless-radiation distance is 0.15 percent off at the Planck inputs.** The 255 kernel treats radiation as a single massless component; at the same omega_b, omega_c, H0 and z* it gives
  100 theta* = 1.03953, 1.49e-3 below the printed value, against 1.5e-6 for the model with the 0.06 eV species (X2, both implementations agree). A lesson that needs theta* to 0.1 percent must model the neutrino
  mass (or say that it does not); the generic worlds of this gate (massless) are 0.15 percent from a full calculation by that amount.
* **Curvature moves the peak, as the lesson wants.** At W1 (Omega_m 0.315, h 0.674, z* 1090) theta* decreases with Omega_k, with d ln theta* / d Omega_k = -1.38 (X4): 100 theta* is 1.118 at Omega_k = -0.05
  (closed) and 0.974 at +0.05 (open), and ell_1 (with the DESIGN offset 0.25) is 210.7, 226.5 and 241.9 at Omega_k of -0.05, 0, +0.05. The offset's own accuracy (request F2) bounds what a lesson may read.
* **B5 fails because its committed direction was wrong.** The committed leg said r_s INCREASES with z*; r_s is the integral from a = 0 up to a*, so a larger z* (smaller a*) gives a smaller r_s, and the
  prototype and the oracle both say so (0 of 20 steps increase; the new leg B5b, 20 of 20 decrease). The kernel is right and the committed expectation was this session's mistake; per the rulings
  (nothing moved after a result) B5 stays failing and labelled, and only Carl resets it (question 1).
* **The bounded peak fit's intervals are not calibrated.** At 1.5 percent noise the formal sigma of the apex is 0.79 multipole (median), and the quadratic fit of the skewed DESIGN peak is biased by +1.0 to
  +3.6 multipoles with no noise at all (X3, depending on where the bin centres fall); coverage is 0.14 and 0.29 against 0.68 and 0.95 (E1, E2). On the symmetric peak the mean apex error is about 0
  but the coverage is still 0.40 and 0.74 (E6a, E6b): the formal interval ignores a phase-dependent shape error (the peak is not a parabola over +-75 multipoles) and the selection of the window by the
  noisy largest bin. Not separately investigated. The consequence is a stated systematic floor of a few multipoles (about 1 percent of 230), well inside the offset's own uncertainty, not a reason to doubt
  the relation; but no interval from this fit may be called a 68 or 95 percent interval. The refusals work: with bins 200 wide the fit says not constrained in 500 of 500 draws, and on a spectrum with no peak
  in 100 percent (the 5 sigma curvature cut; a coin-flip concavity from the largest-bin window would have been the failure).
* **The claim rule and the grid's mechanics hold, and mean nothing about the CMB yet.** The rule flags 12 of 12 violating sentences and passes 12 of 12 clean ones, agrees with an independent implementation
  and finds nothing in the 39 CMB-context sentences of the shipped tree (no CMB lesson exists). The grid mechanics are tested on a synthetic linear grid only (exact interpolation, refusal outside, nearest
  node with ties to the lower index): they say nothing about a spectrum grid, which is request G1.
* **The refusal ensemble is mostly refusals.** 7 of 400 seeded sets are accepted (122 `bad-recombination-redshift`, 81 `negative-density`, 75 `w-out-of-domain`, 58 `bad-H0`, 48 `bad-baryons`, 5 `bad-offset`,
  4 `no-radiation`); the numerical agreement of the accepted ones is carried by A and B (ten worlds, 270 offsets).

## 5. The verdict, by the function

**C.** The committed function: KERNEL PASS needs every leg of groups integrity, relation, oracle, ensemble, refusals and claim, and G2 and G3, to pass (the new legs never count), and P1 to P3 to pass or be NOT
RUN; otherwise KERNEL FAIL, and a KERNEL FAIL is C. B5, E1 and E2 fail, so **KERNEL FAIL**. A or B would need S1 to S4 and F2 (and, for A, G1, C1 and F1) run and pass; every one is NOT RUN, so the product verdict could
not have been better than **C by absence** (NOT ESTABLISHED for A and B) even with the kernel passing. The consumers clause is unmet. The verdict does not say the sound-horizon integral or the angular-scale
relation are wrong (every numerical leg of them passes); it says the committed validation contract is not met (a mis-signed expectation, an uncalibrated peak interval) and that the spectrum, the grid, the cited
formulas and the cited code could not be tested.

## 6. What the verdict permits (and does not)

* **Part B is not begun** and, with a C, there is none: Appendix C gives "the relation alone as a reading step; 260's The pillars omits the CMB". What a reading step may say is what the relation says
  (the angular scale of the sound horizon, `theta* = r_s / D_M`, the first peak near `ell_A (1 - phi_1)`, curvature moves it) with every input and the offset stated and no Hubble constant or composition read
  from any grid; it needs no kernel.
* **The consumers rule holds.** No lesson, panel, "Is space flat?" guide, viewer, model-page section, data pack, grid or spectrum file.
* **Nothing here changes 255, 256 or 257.** The 255 kernel is unchanged; the CMB peak fit is not in the tree.
* If Carl wants the kernel part to reach NOT ESTABLISHED or better, the route is new legs with bounds committed first (questions 1 and 2) and the requests of section 7.

## 7. Requests (nothing fetched, nothing typed, nothing run)

| Request | State |
| --- | --- |
| **S1** a binned CMB temperature power spectrum with the first peak in range and bins finer than 100 multipoles, saved by Carl's session into `scratch-data/` with its sha256 as `tests/fixtures/cmb-scale/authentic/binned-spectrum.json`: ell centre, bin edges, D_ell and its uncertainty as printed, the release's name and version, the exact product, the terms as read with a retrieval date and the rights basis proposed (7.5 rule 4). Candidates for Carl's session to choose: the Planck 2018 binned TT spectrum (ESA Planck Legacy Archive); the WMAP nine-year binned TT spectrum (NASA LAMBDA). **Rights: NOT DECIDED**; no byte is shipped. | NOT RUN: S1 to S3 |
| **G1** the precomputed spectrum grid, produced offline by a cited public Boltzmann code (candidates CAMB, CLASS) in Carl's environment (downloading or running code needs Carl's separate permission): code and version with the licence terms as read, the command, the exact inputs, at most three named parameters (omega_b h^2, omega_c h^2, and H0 or 100 theta*) on at most 4,096 nodes per axis, a size bound Carl names, written as a `gravitas.grid` (157) with the generator in provenance and the sha256 of code, inputs and output. **Rights: NOT DECIDED.** | NOT RUN: G1 |
| **F1** the source text of the cited fitting formula for z*: equations with every coefficient as printed, the stated domain and accuracy, the terms as read, with the PDF's sha256 (candidate: Hu and Sugiyama 1996). | NOT RUN: F1 |
| **F2** the source text of the cited peak-offset formula phi_1 and its stated accuracy (candidate: Hu, Fukugita, Zaldarriaga and Tegmark 2001). | NOT RUN: F2, S2 |
| **X1** the same code's theta*, z*, r_s and first-peak multipole for the ten parameter sets of the `worlds` block, pinned with the code's version and inputs. | NOT RUN: C1 |

The printed Planck numbers rest on D-R10-255-11 (same document, same use). The binned spectrum and the grid have no rights decision: none is possible before a source and its terms are read.

## 8. Questions for Carl

1. **B5.** Its committed direction (r_s increasing with z*) was this session's physics error, found when the oracle's first run was read; B5b carries the corrected direction. Keep B5 failing as the rulings say
   (recommended), or reset it? Either way the product verdict is C, because E1 and E2 fail and S1 to S4 are NOT RUN.
2. **E1, E2 and the peak fit.** The quadratic window fit has a multipole-level systematic that its formal interval ignores. Keep them failing (recommended) and, only when S1 exists, a follow-up adds NEW legs
   for a better-bounded method (a wider window with a free baseline, a stated systematic floor in the interval) with bounds committed first? Or accept the reading step and stop?
3. **Sources.** Which spectrum (S1), which Boltzmann code and grid design (G1, X1), and which z* and offset sources (F1, F2)? Only your session may fetch or run them; B needs S1 and F2 and their rights decision,
   A needs all five.
4. **Neutrino mass in the kernel.** The 255 kernel's massless radiation is 0.15 percent from a full theta*. Worth a separate prompt (an optional massive species in the late-time kernel), or is the reading step's
   stated approximation enough?
5. **Part B.** There is none with C; the reading step it allows can be its own small prompt if wanted.

## 9. Reproduce

`STUBS=<dir with the import-only PyYAML stand-in> python3 -E tools/cmb-oracle/oracle.py thresholds.json authentic/planck-cmb.json oracle-results.json` and
`node tools/cmb-validate.mjs thresholds.json oracle-results.json authentic/planck-cmb.json <tree to scan> <outdir>` on `spike/cmb-scale-gate`;
`node tools/cmb-extract-planck.mjs <saved text> <out.json>` rebuilds the Planck fixture from Carl's saved text. `tests/cmbScaleGate.test.js` recomputes every status from the pinned files and checks
the record against this document and the register.

<!-- Listed in DOCUMENTS.md. -->
