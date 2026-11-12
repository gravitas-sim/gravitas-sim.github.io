# The lensing time-delay and finite-source gate (Prompt 251, Part B)

Part B of Prompt 251 is a gate. Its thresholds and its verdict function are committed in `tests/fixtures/lensing2/gate-thresholds.json`, in the same commit
(`29b4f276`) as Part A's contract and before any kernel, oracle output or fit code of this prompt existed. The first pull request (#537) measured three legs on merged code (P0 to P2) and
left every prototype leg NOT RUN. **This second pull request records the spike: the prototype was built on `spike/lensing-delays-gate` (never merged), run for G1 to G5, G7 and G8 against the committed
bounds and the pinned oracle, and the verdict by the committed function is C. G3, G7 and G8 fail and stay failing; G6 and G9 are NOT RUN (no data).** The rule that holds throughout: *no Hubble
constant is reported from a delay without the mass-sheet degeneracy statement and the verdict*, and no Hubble constant is reported as a value anywhere in this pull request.

No prototype code is in this pull request. The spike is commit `432f4068c503465f4fc30439f1632c8406a9d276` on `spike/lensing-delays-gate` (run 1 is `cc08c7bd`); the records are `tests/fixtures/lensing2/gate-spike-results.json`,
`gate-spike-failed-legs.json`, the three amendments in `gate-thresholds.json`, and the independent oracle's fit of the G7 events (`oracle-finite.json`, with `tools/lensing2-oracle/make-finite-inputs.mjs` and `finite-fit.py`,
pinned before the prototype ran, its integral self-checked against the pinned quadrature to 8.9e-16).

## The models the gate commits (`gate-thresholds.json`, `models`)

* **The Fermat potential.** `tau(theta; beta) = (1 + z_l)/c * (D_l D_s / D_ls) * [ (theta - beta)^2 / 2 - psi(theta) ]`; a delay is the difference of tau at two images; the
  time-delay distance `D_dt = (1 + z_l) D_l D_s / D_ls` scales as 1/H0 at fixed density parameters.
* **The SIS.** `psi = theta_E |theta|`, images at `beta +- theta_E`, `Delta t = D_dt/(2c) (theta_+^2 - theta_-^2) = 2 D_dt theta_E beta / c`, the image nearer the lens later.
* **The point lens.** The form of `lens.js` `pointTimeDelay` (a geometric and a Shapiro term).
* **The mass-sheet degeneracy**, stated as an unresolvable scaling. `kappa -> lambda kappa + (1 - lambda)`, `beta -> lambda beta` leaves every image position and flux ratio unchanged and multiplies
  every delay by lambda. Delays and images alone therefore fix `D_dt` only up to lambda: the Hubble constant inferred with lambda = 1 is `H0_model`, and the truth is
  `lambda H0_model = (1 - kappa_ext) H0_model` for a sheet of external convergence kappa_ext. Only external information (the lens's stellar kinematics, a weak-lensing or number-count
  estimate of kappa_ext, a model of the environment) can fix lambda. It is never fitted away.
* **`hubbleFromDelay` (the contract for a build).** The kernel returns H0 only when the caller supplies kappa_ext with its sigma and source, as a value with the combined interval;
  without it, a null value, the scaling law, and the code 'mass-sheet-degenerate'.
* **Finite source.** A uniform disc of radius rho in Einstein radii, `F = F_base (f_s A + 1 - f_s)`; rho is constrained only where the event crosses or nearly crosses the disc;
  the blend f_s is degenerate with u0 and tE in low-magnification events. The existing fit (`fit.js`) holds rho fixed: a search over rho is the build.

## The oracle's pinned calculations (no kernel exists for these; for the prototype to meet)

From `oracle.py` (astropy distances, brentq roots, the Fermat potential differenced, astropy-based root-finding for H0), on three invented SIS lenses in the validation cosmology (H0 = 70):

* The delay from the differenced Fermat potential equals the closed form `2 D_dt theta_E beta / c` to 3e-16 relative (the three cases: 49.9, 209.5 and 62.6 days).
* The mass-sheet family (lambda 0.7, 0.85, 1.15): the images are at the same positions, the delay ratio equals lambda to 1.4e-15, and the H0 inferred with lambda = 1 is 100.0, 82.35 and 60.87
  where the truth is 70: that is what a lens model without the sheet would report, and the size of the thing the degeneracy statement guards against (these are invented numbers on a
  synthetic lens and a claim about nothing).

## The legs

| Leg | What | State |
|---|---|---|
| P0 | `pointTimeDelay` against the oracle's differenced Fermat potential, relative 1e-9 | **pass** (2.2e-16, 8 cases) |
| P1 | `finiteSourceMagnification` against the oracle's disc integral (polar angle about the lens, closed radial integral), relative 1e-6; u = 0 closed form to 1e-12 | **pass** (5.7e-8 worst, at rho 0.01, u/rho 1.1; 28 cases) |
| P2 | at rho = 1e-5 the finite-source magnification equals the point-source one to 1e-8; the blend arithmetic to 1e-14 | **FAIL** (1.2e-7 worst, at u = 1; the blend arithmetic is exact) |
| G1 | SIS delay by Fermat against the oracle, relative 1e-10 | **pass** (1.1e-14 on the exact Mpc; 1.6e-10 with the tree's rounded parsec, reported, see below) |
| G2 | point-lens delay by Fermat against the oracle and `pointTimeDelay` | **pass** (1.4e-15, 8 cases) |
| G3 | images invariant and flux ratios invariant under the sheet to 1e-9 against the oracle's pinned roots and Jacobians | **FAIL** (1.7e-7 against the oracle's finite-difference Jacobian; positions 2.3e-16; the closed forms 3.6e-16) |
| G4 | delays scale as lambda; H0 inferred with lambda = 1 is true H0 over lambda | **pass** (5.8e-16 on the scaling; 1.1e-14 on H0; 9 cases) |
| G5 | the refusal 'mass-sheet-degenerate' without kappa_ext; coverage with it on 400 seeded lenses | **pass** (400 of 400 refused; coverage 0.700 and 0.9675 against [0.610, 0.750] and [0.917, 0.983]; all 400 wider than the delay's error alone) |
| G6 | a published delay with its covariance, the lens model and the paper's H0 | NOT RUN (no file; nothing fetched) |
| G7 | a rho search, coverage on 200 events, an upper limit where rho is unconstrained | **FAIL** (56 of 200 returned a value; coverage 0.286 and 0.446 against [0.610, 0.750] and [0.917, 0.983]) |
| G8 | the blended-baseline degeneracy flagged on 100 low-magnification events, at least 0.9 | **FAIL as run** (98 flagged, 95 with a tE range; see the reading below) |
| G9 | an authentic event against a published independent fit | NOT RUN (no file; D-LENS-01 and D-RIGHTS-02 record that no event is bundled) |

## The spike

The prototype (the Fermat potential for both lenses, the mass-sheet transformation, `hubbleFromDelay` and the conditional H0, a finite-source fit that profiles rho on a grid of 0 and 36 log-spaced values, and a blend
profile over the share) was written from the committed sentences. Three amendments were recorded in `gate-thresholds.json` **before any prototype run**, none moves a bound: AM1 (the G5 ensemble, and the exact Mpc used for G1 to G4),
AM2 (the G7 ensemble and what "recovers rho within the interval" is read as: the truth, not the oracle's own estimate, in the interval) and AM3 (the G8 ensemble and the rule for "not constrained").
`verdicts.current` in that file is updated to the result and nothing else in it changed after a run.

**Two runs, both on record.** Run 1 (`cc08c7bd`) failed G3, G7 and G8. Reading its diagnostics, the profile fits for G7 and G8 were stuck above the oracle's chi-square (the inner optimiser, not the model), which made the intervals spuriously narrow
(29 of 53 value-returning G7 fits agreed with the oracle). The optimiser was repaired (warm starts and rho-scaled cold starts, a descending pass over the grid), no bound and no amendment changed, and the legs were run again (run 2, `432f4068`, 3,530 s of CPU on a loaded machine).
Run 1 is kept in `gate-spike-results.json` under `run1`. The second run's rows are the ones the verdict uses.

**Findings, stated against the bounds.**

* **G3 is an oracle limit, and the leg stays failing.** The kernel agrees with the closed forms to 3.6e-16 on the flux ratios and to 2.3e-16 on positions. The oracle pins its magnifications by finite differences of the lens map, which carry about 1e-7 of noise, so the committed
  1e-9 against those numbers cannot be met by any code, correct or not. That is a defect in the committed leg's construction (an oracle Jacobian from the closed form would have been exact), found by running it. The bound is not moved; the leg is FAIL on record, and the closed-form comparison is reported beside it.
* **The parsec.** The tree's ten-digit parsec differs from the exact value by 4.9e-10, which is above G1's 1e-10 by itself and a delay is proportional to a distance. AM1 chose the exact Mpc (the one the cosmology kernel derives its Gyr scale from) for G1 to G4 before the run and reported the rounded-parsec figure (1.6e-10) beside each: G1 and G4 would fail on the rounded one.
* **G7 fails, and not narrowly.** Of 200 events 56 returned a value (the rule: no value unless the 0.95 lower end is above zero); of those 28.6 percent (0.68) and 44.6 percent (0.95) contained the true rho. Far events (u0 above 3 rho) returned a value in 2 of 100, as the leg wants; the upper limits covered the truth in 0.986 of 144 (reported, no bound); 53 of the 56 values agree with the oracle's scipy fit to a relative 0.1 (reported). In 36 of 200 events the profile minimum is still above the oracle's fit by more than 1 in chi-square, so the prototype's optimiser has not reached the oracle's optimum on those. A selection effect (a value is returned only when the fit prefers a large rho) may explain part of the undercoverage; that is a hypothesis, not tested here.
* **G8 as run is FAIL, and its reading is a question.** 98 of 100 events were flagged 'blend-degenerate' and 95 of the 100 carried a tE range. The committed sentence and AM3 both count events returned blend-degenerate with a tE range: 95 of 100 is 0.95, above the bound of 0.9, a pass.
  The runner enforced something stricter (every flagged event must carry a range, 98 against 95), and a result is not re-labelled after it is seen. The row is therefore recorded as run (FAIL), the literal reading is recorded beside it (`readings.G8`), and the verdict does not depend on it (G3 and G7 fail).
* **G5 passes by construction in part:** the ensemble's kappa_ext is calibrated to the truth's distribution ('synthetic ensemble, calibrated by construction'), so the coverage tests the arithmetic of the interval, not a real external-convergence prior.

### P2 stays failing, and what it means

`finiteSourceMagnification` is the merged kernel of Prompt 94. With a source radius of 1e-5 Einstein radii it should equal the point-source magnification to second order in rho (about 1e-10 relative);
the kernel differs by 4e-8 to 1.2e-7 at u = 0.1 to 2. The merged code integrates in rings with 24 panels of 16-point Gauss-Legendre and the angular share `acos(...)/pi`, and for a disc this small
the cancellation in `acos` and the quadrature limit the result to about seven digits. The committed bound is 1e-8; the leg fails and stays failing, and no bound moves after the result.
The size is irrelevant to anything a lesson shows (the P1 leg shows 6e-8 at rho 0.01 against an independent integral) but it is a finding about merged code. **Question for Carl:** accept a
looser bound for the tiny-source limit in a later contract (for example 5e-7, committed before any run, with P2 left failing on record), or ask for the closed small-rho expansion
inside the kernel (a change to `js/kernels/lensing/microlensing.js`, which this prompt does not touch and which would move the lensing goldens).

## The verdict function (committed)

A, then B-delay or B-finite, then C, by the first rule that holds, a NOT RUN leg holding nothing:

* **A**: G1 to G5 and G7 to G8 pass and G6 and G9 have data and pass: the delay-based Hubble constant with the degeneracy statement and the finite-source fit on a cited event; builds
  'A delayed echo' with its H0 step and the upper depth of 'A Lens Passing By'.
* **B-delay**: G1 to G5 pass: the delay demonstration with the degeneracy shown and no H0 number (a delay becomes H0 only as a function of the unknown external convergence).
  **B-finite**: G7 and G8 pass alone: the finite-source fit with its blended baseline on synthetic events. Each builds only its own item.
* **C**: neither: reading steps only; Part A stands.

**Current: C**, by that function on the spike rows (`gate-spike-results.json`, `verdict`): B-delay needs G3 and it fails; B-finite needs G7 and G8 and both fail as run. Even with G8 read literally, B-finite fails on G7 and B-delay fails on G3; A would also need G6 and G9, which have no data. Part A stands: the enclosed-mass kernel is unchanged, nothing student-facing is built (no "A delayed echo", no upper depth for "A Lens Passing By"), and no H0 value is reported.

## What Carl would supply, and what a Part B session would then do

Nothing was fetched and no published delay, covariance, event or licence term was typed. Any object, survey or paper named is a suggestion from memory, unverified.

1. **G6.** One lensed quasar with a published time delay and its covariance (or a published delay with its uncertainty), the lens redshift and the source redshift, the paper's lens model
   (image positions at least, and the paper's H0 and its external-convergence treatment), the paper citation and the table, from a source whose terms allow the numbers to be committed (a per-source
   rights decision, 7.5 rule 4). File `tests/fixtures/lensing2/authentic/delay.json`: `{system, zl, zs, delayDays, sigmaDays, covariance, imagePositionsArcsec, thetaEArcsec, kappaExt, sigmaKappaExt, h0Published, sigmaH0, cosmology, citation, table}` with
   `SOURCES.json` (terms as read from a saved copy, retrieval date). The contract is fixed: the kernel's conditional H0 with the paper's kappa_ext against the paper's value within two published sigma.
2. **G9.** One microlensing event whose data terms allow redistribution (D-LENS-01 and D-RIGHTS-02: the survey archives are linked and not bundled; a per-event rights decision is new), its photometry,
   and a published independent fit (parameters with uncertainties, including the finite-source parameter and the blend). File `event.json` with `SOURCES.json`.
3. **The spike's open questions** (the spike itself is done, see above). (a) G3: replace the oracle's finite-difference Jacobian by an analytic one in a later contract, committed before a run, with this G3 left failing on record. (b) G8: which reading is the record (95 of 100 passes; the runner's stricter rule fails). (c) G7: a later contract could commit an ensemble and a fit that return a value more often, or read the coverage over all 200 events with the upper limits counted; no bound is moved by this note. (d) P2 as above. Only a verdict of B or A would permit a build, each under the consumers rule.

## Rights

Nothing is bundled and nothing was fetched. D-LENS-01 (no authentic microlensing event: terms not confirmed) and D-RIGHTS-02 (the survey archives are linked with their citation text) stand
unchanged; a lensing-cluster image has no recorded basis (D-R10-251-03).

<!-- Listed in DOCUMENTS.md. -->
