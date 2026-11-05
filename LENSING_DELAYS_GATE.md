# The lensing time-delay and finite-source gate (Prompt 251, Part B)

Part B of Prompt 251 is a gate. Its thresholds and its verdict function are committed in `tests/fixtures/lensing2/gate-thresholds.json`, in the same commit
(`29b4f276`) as Part A's contract and before any kernel, oracle output or fit code of this prompt existed. **In this pull request three legs that test already-merged code were
measured (P0 to P2); every leg that needs a prototype is NOT RUN, every leg that needs data is NOT RUN, and there is no verdict.** The rule that holds throughout: *no Hubble
constant is reported from a delay without the mass-sheet degeneracy statement and the verdict*, and none is reported anywhere in this pull request.

A gate's prototype belongs on a spike branch that is never merged (7.5 rule 4). That branch does not exist: this session was scoped to the kernel, the contract and the
validation-gate documents, and a delay model written in the kernel directory would be exactly the unspiked prototype the rule forbids. What this pull request does carry is the
other half the gate needs before a prototype: the committed models and thresholds, and the **independent oracle's calculations pinned** (`oracle-results.json`, group `delay`),
written before any prototype.

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
| G1 to G4 | SIS delay by Fermat; point delay by Fermat; images invariant and delays scaled under the sheet; H0 shifted by 1/lambda | NOT RUN (no prototype) |
| G5 | the refusal 'mass-sheet-degenerate' without kappa_ext; coverage of the H0 interval with it on 400 seeded lenses | NOT RUN (no prototype) |
| G6 | a published delay with its covariance, the lens model and the paper's H0, within two published sigma | NOT RUN (no file) |
| G7, G8 | a rho search with coverage on 200 events and an upper limit where rho is unconstrained; the blended-baseline degeneracy flagged on 100 low-magnification events | NOT RUN (no prototype) |
| G9 | an authentic event against a published independent fit | NOT RUN (no file; D-LENS-01 and D-RIGHTS-02 record that no event is bundled) |

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

**Current: no verdict.** At most B is reachable until Carl supplies the files below, because A needs G6 and G9.

## What Carl would supply, and what a Part B session would then do

Nothing was fetched and no published delay, covariance, event or licence term was typed. Any object, survey or paper named is a suggestion from memory, unverified.

1. **G6.** One lensed quasar with a published time delay and its covariance (or a published delay with its uncertainty), the lens redshift and the source redshift, the paper's lens model
   (image positions at least, and the paper's H0 and its external-convergence treatment), the paper citation and the table, from a source whose terms allow the numbers to be committed (a per-source
   rights decision, 7.5 rule 4). File `tests/fixtures/lensing2/authentic/delay.json`: `{system, zl, zs, delayDays, sigmaDays, covariance, imagePositionsArcsec, thetaEArcsec, kappaExt, sigmaKappaExt, h0Published, sigmaH0, cosmology, citation, table}` with
   `SOURCES.json` (terms as read from a saved copy, retrieval date). The contract is fixed: the kernel's conditional H0 with the paper's kappa_ext against the paper's value within two published sigma.
2. **G9.** One microlensing event whose data terms allow redistribution (D-LENS-01 and D-RIGHTS-02: the survey archives are linked and not bundled; a per-event rights decision is new), its photometry,
   and a published independent fit (parameters with uncertainties, including the finite-source parameter and the blend). File `event.json` with `SOURCES.json`.
3. **The spike.** A session told to run Part B creates `spike/lensing-delays-gate` from this branch's tip, builds `delays.js` (the Fermat potential for both lenses, the sheet transformation, `hubbleFromDelay`) and a rho search beside the existing fit, runs G1 to G5, G7, G8 against the pinned oracle, and lands a documentation-only
   pull request with the results and a register row; only then does a verdict exist, and only then a build ("A delayed echo"; "A Lens Passing By" with its upper depth), each under the consumers rule.

## Rights

Nothing is bundled and nothing was fetched. D-LENS-01 (no authentic microlensing event: terms not confirmed) and D-RIGHTS-02 (the survey archives are linked with their citation text) stand
unchanged; a lensing-cluster image has no recorded basis (D-R10-251-03).
