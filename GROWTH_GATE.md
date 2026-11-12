# The structure-growth gate

Roadmap III, Prompt 259, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, `DECISIONS_2026-11-06.md`; prerequisites 255, 152 and 157 are merged on `v3`). A growth equation and its
declared domain, a cited fit and an independent oracle, the transfer-function shape and the variance on a scale, the Jeans criterion, the imagery decision, the claim rule, the tolerances and the verdict function, all committed
before any code, then measured on a spike. **Verdict by the committed function: C**, because two legs of the kernel group fail and stay failing (section 4): C1, the comparison with a cited approximation, crosses a design bound by
0.017 percentage points at one parameter set, and R2, the guard test, finds that the committed domain contains one genuine bounce corner (the kernel's guard refused it correctly; the committed statement of the domain was wrong).
What C means here is narrow and stated in section 5: every numerical leg of the growth equation, the shape, the variance and the Jeans criterion agrees with an independent calculation to 4e-9 or better, the one authentic leg
passes at 2.4 percent against a 5 percent bound, and nothing student-facing can follow under C. Nothing is built, the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, and **Part B is not begun** (the execution contract
forbids starting the next part). The record is decision-register rows D-R10-259-01 to D-R10-259-05.

The numbers are in `tests/fixtures/growth/` (`thresholds.json` the contract; `oracle-results.json` the pinned independent calculation; `authentic/eh98-formulas.json` the transcribed equations with their lines; `authentic/planck-best-fit.json`
the printed numbers of leg X1; `results.json` the gate stream; `failed-legs.json`). The prototype kernel (growth.js under js/kernels/cosmology/growth/ on the spike), the validator (growth-validate.mjs), the extraction script
(growth-extract-planck.py) and the oracle (oracle.py under tools/growth-oracle/) are on `spike/structure-growth-gate` (prototype and validator at 9fcd07e9), never merged (rule 7.5.4): this PR is documentation, fixtures and one
test. The gate stream ran on Node 22.23.4 (9 s); the oracle on Python 3.9.6 with numpy 1.26.4 and scipy 1.13.1 (6 s). Two complete runs agree row for row except the CPU timings.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `05fe0052` | `thresholds.json`: the model, the domains and refusal codes, the parameter sets, the 31 legs and bounds, the verdict function, the requests, six decisions | any prototype, validator, oracle script or output, and any computation |
| `a62c8394` | `authentic/eh98-formulas.json` and `authentic/SOURCES.json`: the cited equations transcribed with the line of every token, checked by script and against the rendered PDF pages 14, 15 and 18 | any code |
| `2a97b12f` | `authentic/planck-best-fit.json`: the printed best-fit column read by script, every line recorded | the validator or the oracle was run |
| spike `d3135669`, `27ffe8c6` | the oracle and the Planck extraction script (the oracle's first run crashed at its last line on a shadowed variable name and warned about the far oscillatory tail; both were fixed, the numerics unchanged) | the prototype existed |
| `908167d6` | the oracle's pinned output (it also printed the Planck chain's sigma_8, which this session therefore saw before the kernel existed, section 3) | the prototype existed |
| spike `9fcd07e9` | the prototype and the validator, no run (checked for syntax only) | any validator run |
| `3509fe04` | `results.json` and `failed-legs.json` (the stream, twice) | |

What had been seen before the contract was committed, and only that (`seenBeforeCommitting`): the roadmap sections, the register rows and gate documents of 255 to 257, the 255 kernel's domain and refusal codes, the export
list of `js/numeric/` (no ODE integrator), the saved text of Eisenstein and Hu 1998 at equations 26 to 31 and A1 to A7, Table 1 of Planck 2018 VI **including its printed sigma_8**, and the installed Python packages. Nothing was
fetched by this session and no published number, coefficient, table value, simulation datum or licence term was typed from memory; the model inputs (Om, Ode, w, Ob, h, ns, sigma_8 = 0.8) are declared test inputs.

## 2. The decision

**Equation.** Linear perturbations of pressureless matter, sub-horizon, general relativity, smooth dark energy of constant `w`, no radiation: in `u = ln a`,
`D'' + (2 + dlnE/du) D' - (3/2) Omega_m(a) D = 0`, `E^2 = Om a^-3 + Ok a^-2 + Ode a^(-3(1+w))`, growth rate `f = D'/D`, normalised `D -> a` in the matter era. **Domain** (committed): Om in [0.1, 1], Ode in [0, 1.2], w in
[-1.5, -0.5], Or = 0, a in [0.01, 1], linear scales only; outside it the kernel refuses with one of seven codes and returns no number. **Initial data** at a = 1e-6: the first-order series with curvature,
`D = a (1 - (4/7)(Ok/Om) a)`, derived by substituting `D = a (1 + c K a)`, `K = Ok/Om`, into the equation (`3.5 c + 2 = 0`) and confirmed by legs G2 to G4 (4e-11).

**Numerics (DEC2).** 152 has no ODE routine (quadrature, linear algebra, roots, interpolation, polynomial fits). The prototype integrates with a private embedded Dormand-Prince 5(4) pair at relative tolerance 1e-11 (about 600
steps from a = 1e-6 to 1) and carries the sum of the accepted steps' error estimates plus the initial-data truncation beside every D, as an estimate and not a bound (leg O2 tests it). 152's adaptive quadrature does the variance
integral and 152's Brent finds the Jeans crossing. Delta table (rule 9): existing authority, `js/kernels/cosmology/late/` (255: E(z), the domain, the bounce guard), `js/numeric/quadrature.js` and `roots.js`; missing behaviour,
the growth ODE, the rate, the shape function, sigma(R) and its normalisation, the Jeans quantities; adopter, this gate's spike; duplication removed, none (nothing added to the product tree).

**Shape and variance.** The Eisenstein-Hu no-wiggle form, equations (26) and (28) to (31), `T = T0(q_eff)`, from the transcribed coefficients; `sigma^2(R) = Int dlnk Delta^2 [3 j1(kR)/kR]^2` (A7) with `Delta^2 = N k^(3+ns) T^2`, `N` fixed by
sigma(8 Mpc/h) = sigma_8, a declared input. Domain from the paper's own statements: Om h^2 in [0.025, 0.5], Ob h^2 at least 0.0125, Ob/Om at most 0.5, plus h, ns, sigma_8, k and R ranges (ten codes). The oscillations, neutrino
mass and any running are not modelled.

**Jeans criterion (a bounded derivation).** One pressure-supported fluid, Newtonian, sub-horizon, constant sound speed c_s as an input: the growth equation gains `+(c_s k/(H0 a E))^2 D`; the comoving Jeans wavenumber is
`k_J(a) = sqrt(3 Omega_m(a)/2) a E H0/c_s`; modes with `k < k_J` grow, others oscillate. Not modelled: free streaming, the thermal history, the baryon and dark-matter two-fluid system. A real baryon Jeans mass is therefore not
claimed.

**Imagery (DEC3): none.** No simulation release is named, none was fetched, and no rights decision exists for any; each would need one per source and per form (rule 4). The prompt's alternative is the growth curve. Verdict A
needs slices, so it was not attainable by construction. No computed Gaussian-field image is made: it is outside the tested scope and could be taken for a simulation. **Claim rule:** no sandbox, N-body or rescaled run is shown as
structure formation; leg Q1 and the test of this PR scan every student-facing string for it (756 files, no match).

## 3. Results

31 rows: **22 pass, 2 fail, 3 reported, 3 not run, 1 omitted.**

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 sources and 19 transcribed tokens, I2 same inputs | 19 of 19 found; hashes equal | pass |
| (a) closed forms | G1 Einstein-de Sitter; G2 open (Peebles, 200 digits); G3 flat Lambda (hypergeometric); G4 Lambda with curvature (Heath integral) | D to 3.8e-11 relative, f to 4.0e-12 (G4: 1.0e-11), bound 1e-8 | pass |
| (b) oracle | O1 thirteen sets against DOP853 (D 5.8e-11, f 6.8e-12); O2 the carried estimate covers | 533 of 533 points covered, estimate about 3e-9 | pass |
| (b) cited fit | C1 EH98 (A4) against the kernel | largest deviation 0.02017 at S5, bound 0.02 | **fail** |
| (b) published | C2.publishedTable, C3.citedCode, P6.numericalTransfer (a table, a cited code, a numerical transfer function) | requests below | NOT RUN |
| power | P1 T0 (2e-16); P2 T(k) on four sets (2e-16); P3 variance, power law (1.6e-8 against 1e-6); P4 sigma(R) on four sets (6e-14); P5 normalisation (0 and 2e-16) | far inside the bounds | pass |
| (e) authentic | X1 sigma_8 from the printed A_s, n_s, Omega_b h^2, Omega_c h^2, H0 against the printed sigma_8 | model 0.8311 against 0.8120 printed: +2.36 percent, bound 5 percent | pass |
| Jeans | J1 k_J (2e-16); J2 pressure equation against DOP853 (3.8e-9 against 1e-7); J3 kappa = 0 bit for bit; J4 Einstein-de Sitter crossing (4e-16) | | pass |
| (d) refusals | R1 twelve growth cases; R3 ten shape cases; R4 five Jeans cases | every code and the order as committed | pass |
| (d) refusals | R2 no in-domain set refused (6,875 sets) | one refused: Om 0.1, Ode 1.2, w -1.5, code `bounce` | **fail** |
| claim rule | Q1 | 0 matches in 756 files | pass |
| reported | W1 growth index; W2 radiation; W3 CPU | section 5 | reported |
| imagery | W4 | none | omitted |

Tier (c), ensemble coverage, is not applicable (the kernel has no random input and states no coverage); O2 tests the carried estimate instead. X1 is not blind: the printed sigma_8 had been seen when the contract was
committed and the oracle printed the model's sigma_8 (0.8311) before the kernel existed; the bound (5 percent, the paper's own accuracy statement for the shape fit) was committed first and the model was not touched.

## 4. The two failing legs, left failing

**C1.cptFit.** The Lahav and Carroll fit of equation (A4) with (A5) and (A6), implemented from the transcription (it agrees with the oracle's own implementation to 3e-16), differs from the kernel's growth factor by 0.66 percent
(S2), 1.68 percent (S3) and **2.017 percent (S5, flat, Om 0.1)** at its worst, and by 0.4 percent or less for S4, S6, S7 and S8. The 2 percent bound was a design bound for a stated approximation, not a published accuracy;
it is crossed by 1.7e-4. It stays failing and is not moved: a bound chosen after the number is exactly what the rule forbids. The reading of the leg is that the fit is a few tenths of a percent from the equation for Om at
or above 0.25 and about two percent at Om = 0.1; which of the two is a defect of the fit or of the kernel is decided by legs G3 and G4 (the kernel agrees with the hypergeometric function and the Heath integral to 4e-11 at Om 0.1),
so the deviation belongs to the fit.

**R2.growthAccepted.** The committed text says the domain admits no bounce, and the guard test refused one of 6,875 grid sets, (Om 0.1, Ode 1.2, w -1.5): with `w = -1.5` the dark-energy term grows as `a^1.5` while the curvature
is `-0.3 a^-2`, and `E^2` is negative for a between 0.39 and 0.48 (a numpy scan made for this document, not a gate leg): a universe that starts small turns around at a = 0.39 and never reaches a = 1, so the equation does not describe today's universe there. The guard is the 255 idea
and it was right; the sentence about the domain was wrong (a hand check at the corner used the wrong exponent). The committed function counts the leg as failed. It was not amended after the result. A narrowed domain (for example an
upper bound on Ode for `w` below -1) is Part B's amendment, and a threshold is reset by Carl only.

## 5. What the evidence supports, and what C means

By the committed function the verdict is **C** (KERNEL FAIL), and Appendix C's C is "a reading step", with 260's The pillars omitting growth. Under C and the consumers rule nothing student-facing follows in any case. What the record shows
beside the letter, labelled as evidence and not as a verdict:

- The growth factor and rate from the kernel equal the independent calculations to 1e-10 or better on thirteen parameter sets including constant w from -1.4 to -0.6, curvature of either sign and Om from 0.1 to 1, and equal three
  independent closed forms (Peebles open, hypergeometric flat Lambda, the Heath integral) to 4e-11. The Jeans legs agree to 4e-9.
- **Growth index** (W1): the least-squares gamma in `f = Omega_m(a)^gamma` over a in [0.3, 1] is 0.5536, 0.5525 and 0.5516 for flat Lambda with Om 0.25, 0.30 and 0.35, measured on the kernel; a comparison with any published value is NOT RUN.
- **Radiation cost of the domain** (W2, the oracle with Meszaros initial data, Or = 8.5e-5, flat, Om 0.3): D(a)/D(1) changes by **1.85 percent at a = 0.01** and 0.15 percent at a = 0.1 when radiation is in the background. The
  "Or = 0, a from 0.01" domain therefore costs about two percent at its lower edge; a student-facing statement would have to say so or start at a = 0.1.
- **Authentic leg X1**: from Planck 2018 VI's printed best-fit A_s, n_s, Omega_b h^2, Omega_c h^2 and H0, flat Lambda, the matter-era Poisson relation `Delta^2 = (4/25)(ck/H0)^4 Om^-2 D(1)^2 T^2 Delta_R^2` and the no-wiggle shape,
  sigma_8 comes out 2.4 percent above the printed value (0.8311 against 0.8120). The model leaves out neutrino mass (0.06 eV) and the oscillations, and uses Om = (Omega_b + Omega_c) h^2/h^2 = 0.3144 against the printed 0.3158.
  One published number was tested; it does not validate the shape function for any other parameters.
- CPU (W3, Node 22.23.4): a growth solve to 41 scale factors takes 4.9 ms; the sigma(R) normalisation about 13 ms.

If Part B follows, a B2 or B slice would need Carl's decision on both failures first (the verdict letter is his to reset, not the session's). The committed B and B2 definitions and the claim that A is unattainable stand.

## 6. The validation table (7.5 rule 8)

| Tier | Content | State |
| --- | --- | --- |
| (a) analytic | G1 to G4 closed forms; J3, J4 | pass |
| (b) reference | oracle O1, O2, P1 to P5, J1, J2; cited fit C1; published table C2; cited code C3; numerical transfer P6 | oracle legs pass; **C1 fails**; C2, C3, P6 NOT RUN |
| (c) ensemble | not applicable, stated | n/a |
| (d) refusals | R1, R3, R4 pass; **R2 fails** | one failing |
| (e) authentic | X1 passes (one printed value, 5 percent); C2 and C3 would add the growth side | passes; growth side NOT RUN |

## 7. Requests (all NOT RUN legs name theirs)

- **Request C2.** A published growth-factor or growth-rate table for a stated cosmology (a paper's table or appendix), transcribed by Carl's session into `tests/fixtures/growth/authentic/published-growth.json` with the printed
  parameters, each tabulated value with its precision, the page or table, the terms as read with a retrieval date and the rights basis. Nothing typed from memory.
- **Request C3.** One cited code's output (CAMB, CLASS, pyccl or colossus) for the parameter sets S4, S9, S10 and T1 to T4: D(z) and the linear power spectrum at z = 0 and z = 1, as a file produced by Carl's session (installing and
  running a downloaded code needs his permission; none is installed here and this session ran none), with the code's version and sha256, the input, the date and the output's sha256.
- **Request P6.** The same code's transfer function (or a paper's printed table of it) for T1 to T4.
- **Request S1.** For any imagery: a named public simulation release, the terms as read with a retrieval date, the rights basis, the transformation (a projected density slice and its colour map), the attribution, the fallback
  (the growth curve) and the redshifts; each slice a 157 image pack with provenance. Until then the imagery decision is none.

## 8. Rights, data and size

Nothing was fetched. The two saved texts were fetched by Carl's session; the arXiv licence basis is D-R10-255-11 (numbers and cited facts, no text reproduced); both sha256 are pinned in `authentic/SOURCES.json` and the saved texts are not in the
repository. No home path is in any fixture. **No size ceiling is raised**: the PR adds a document, about 120 KB of JSON fixtures (none shipped), one test and register rows; nothing under `js/` changes, so no bundle, route, precache or pack
is touched. Labels: `invisible` and `documentation`.

## 9. Questions for Carl

1. Is the committed verdict C (a reading step for 259) final, or do you want Part B to start from a narrowed domain (for example Ode at most 1.0 for w below -1, or Om h^2 and Ode jointly bounded) and a growth-fit leg judged as reported only?
   Either reset is yours, not the session's; nothing here moves a bound.
2. Do you want the radiation cost of the a = 0.01 edge (1.85 percent) to move the committed domain to a from 0.1 in Part B?
3. Requests C2, C3 and P6: should your session fetch one published growth table and run one cited code, and may the code be run (it is a download and an execution)?
4. Imagery: any simulation release you would accept (request S1), or keep the growth curve alone?

<!-- Listed in DOCUMENTS.md. -->
