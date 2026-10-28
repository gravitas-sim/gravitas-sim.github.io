# Atmospheres gate II: transmission, emission and phase curves

Roadmap III, Prompt 201 (tranche T2, authorized by D-R10-73; Prompt 200 landed as #457). The second half of the
atmosphere family reads an exoplanet's atmosphere from light: a band's transit depth, a secondary eclipse's
brightness temperature and a phase curve's albedo. This document commits what that must satisfy, **before any
prototype or oracle output exists**, and then records whether Prompt 202 may build it whole (**A**), without the
transmission piece (**B**) or not at all (**C**).

The thresholds are held in `tests/fixtures/atmospheres-gate-ii/thresholds.json` and read by
`tests/atmospheresGateII.test.js`, which also recomputes the verdict from the recorded checks. The text down to
"Results" and the thresholds file were committed first (the branch history shows the order); the prototype, the
independent oracle and the harness live on the branch `spike/atmospheres-gate-ii`, which is never merged. A threshold
that a measurement crosses is a failed check, not a reason to move it; only Carl resets a threshold, with a register
row. A check that was not measured is never a pass. Every bound below was fixed from the physics and the arithmetic
written beside it, not from any run.

## 1. The regime (committed first)

Three models, each its own model, each carrying `model` and `assumes` fields, each refusing with a reason and no
number outside its domain.

| Model | Statement | What it is not |
| --- | --- | --- |
| **Band-integrated transmission** | An opaque disc of radius `R_p` (the radius at the reference pressure `P_0`) under an **isothermal, hydrostatic, constant-gravity** atmosphere, `n(r) = n_0 exp(-(r - R_p)/H)`, `n_0 = P_0/(k T)`, `H = k T/(mu m_u g)`. **One absorber** of constant volume mixing ratio `X`; its cross-section is a **pinned table** at one temperature and pressure, reduced per **named band** to a 16-point k-distribution `(sigma_i, w_i)` (8 Gauss-Legendre points on the lower 90 percent of the sorted band, 8 on the upper 10 percent). **No scattering, no clouds, no refraction, no temperature structure.** Slant optical depth at impact parameter `b`: `tau(b) = 2 sigma X n(b) b exp(b/H) K1(b/H) = sigma X n(b) sqrt(2 pi b H) [1 + 3H/(8b) - 15 H^2/(128 b^2)]`, and the depth `delta = [R_p^2 + 2 integral_{R_p}^{inf} b (1 - sum_i w_i exp(-tau_i(b))) db] / R_s^2` (uniform stellar disc, central transit) | A spectrum. It is a depth **integrated over each named band**, not resolved; the lesson says so. It is not a retrieval: limb darkening, impact parameter, stellar activity, clouds, hazes, pressure broadening (the table is height-independent) and a temperature gradient are outside it. The effective height is `z_eff = R_eff - R_p`, `R_eff^2 = R_s^2 delta` |
| **Blackbody plus one band (emission)** | Band radiance `B(T) = (1/(lambda_2 - lambda_1)) integral B_lambda(T) d lambda` (a flat response, no filter profile). Eclipse depth `delta_ecl = (R_p/R_s)^2 B(T_p)/B(T_*) + A_g (R_p/a)^2`. In an absorption band of optical depth `tau_b` the planet's band flux is that of a blackbody at `T_p` seen through an isothermal skin at `T_skin = T_p/2^(1/4)` (the layer temperature of Gate I's one-layer model): `F/pi = B(T_p) 2 E3(tau_b) + B(T_skin) (1 - 2 E3(tau_b))`. A brightness temperature is the inverse of the band ratio | A temperature map or a profile. The skin is one isothermal layer; the planet is a uniform blackbody (no day-night structure), so a band can only be a **dip** (`T_skin < T_p`). In a band where reflected light is a tenth of the thermal depth or more (computed for `A_g` up to 0.3) a depth is **not** converted to a temperature |
| **Lambert-sphere phase curve** | Reflected flux ratio `f(alpha) = A_g (R_p/a)^2 Phi(alpha)`, `Phi(alpha) = [sin(alpha) + (pi - alpha) cos(alpha)]/pi`, `alpha` the phase angle (0 at full phase, the secondary eclipse), `A_g = (2/3) A_B` and the phase integral `q = 3/2` (a **Lambert** sphere, Russell 1916 form) | A real planet. Real phase functions are not Lambertian (Lommel-Seeliger and Henyey-Greenstein spheres are the committed misspecified cases, N1); thermal phase variation, polarisation, clouds and the planet's own thermal emission are not modelled. A fitted albedo is the albedo **of a Lambert sphere**, and the Bond albedo it implies is the same assumption with a factor 3/2 |

**The domain.** `H/R_p <= 0.01` and `z_eff/R_p <= 0.1` (beyond it the transmission model refuses: "the constant-gravity,
plane-parallel treatment was tested only to here"), `300 <= T <= 3500` K, `2 <= mu <= 45`, `2 <= g <= 40` m s^-2. Hot
Jupiters sit inside it (`H/R_p` 0.003 to 0.01); warm Neptunes and super-Earths with a long scale height do not, and the
model says so. The a-priori error the transmission model **states** is `1.5 z_eff/R_p` of the atmospheric excess
`delta - (R_p/R_s)^2` (derivation: in `n(z) ~ exp(-z/H_0 + z^2/(H_0 R_p))` the density at the effective height is raised
by `exp(z^2/(H_0 R_p))`, which moves `z_eff` by `z^2/R_p`, a relative change `z/R_p`; the factor 1.5 is margin).

**What cannot be said (the claim rule, (3) below).** The model's output is "this band's depth is consistent with this
absorber at this scale height under these assumptions". It is never "water detected", and never a statement about
whether a planet keeps its atmosphere.

## 2. The independent reference and the tolerance (committed first)

**The oracle** is a second implementation written without reading the kernel (numpy, scipy and astropy constants; it
runs under `python -I`): it builds the atmosphere on a fine radial grid, optical depths by numerical path integration
along exact chords (not the Bessel expansion), the transit depth by integrating over `b`, a line-by-line absorber over a
fine wavelength grid (not a k-distribution), and for the regime tests it uses **`g(r) = GM/r^2`**, the physics the
kernel's constant-gravity form approximates. Planck band integrals are `scipy.integrate.quad`; the slab flux is a
numerical `mu` integral; the Lambert phase function is a surface integral over the visible lit hemisphere.

**The tolerance in the regime** (`X3`): `|delta_kernel - delta_oracle| / (delta_oracle - (R_p/R_s)^2) <= max(0.001, 1.5 z_eff/R_p)`
on every one of 2,000 seeded in-regime draws; and `X2` separates the numerics from the physics by running the oracle
with constant gravity: at most 1e-4 for one wavelength (the Bessel expansion and the quadrature) and at most 1 percent
for a band (the 16-point k-distribution against line-by-line). Outside the domain the kernel refuses; the refusal is the
tolerance's other half (`X5`).

**The published-code reference** (`XR`) is a cited radiative-transfer code's band-integrated depths for the same inputs
(same atmosphere, same pinned table, same bands), pinned as a fixture with the code's name, version and settings, **never
recomputed by Gravitas**, agreeing with the kernel to the same tolerance as `X3`. The pinned cited cross-section table is
`XT`. **Neither is in the repository and nothing may be downloaded here**, so both are `not-measured` and so is the
transmission slice's A (see 7). They are listed as requests in the fixture (`dataRequests`, Q1 and Q2) for Carl.

**Amendment AM1 (before any measurement).** Re-deriving `E1` found that its Rayleigh-Jeans sub-bound, written at `lambda T = 1e5` micron K, cannot be met by any code: there `x = h c/(lambda k T) = 0.144` and the Rayleigh-Jeans form is wrong by `x/2 = 7.2` percent. It is restated at `lambda T = 1e7` micron K (`x/2 = 7.2e-4`). The first commit's text is in the branch history; no output of `E1` had been inspected; the fixture's `amendments` records it.

**Amendment AM2 (after the first harness run, before any recorded verdict).** The claim rule's committed positive controls caught a defect in the committed Spanish patterns: JavaScript's ASCII word boundary does not treat an accented letter as a letter, so the Spanish bad control about detecting water was not caught (11 of 12 bad controls). The Spanish patterns now use Unicode-aware boundaries and the flags are `iu`; the bound (12 of 12, 6 of 6, no violation) is unchanged. Unlike AM1 this was made after one measurement of `C1`, so it is listed among the rulings Carl is asked for.

**Analytic cases** (`X1`, `E1` to `E4`): for a frozen exponential `tau = tau_0 exp(-x/H)` the depth integral has the closed form
`H [E1(tau_0) + ln tau_0 + gamma]`; the full-spectrum Planck integral is `sigma T^4/pi`; the slab flux is `B_p` at `tau = 0` and
`B_skin` as `tau` grows; the Lambert function is 1 at `alpha = 0`, `1/pi` at 90 degrees, 0 at 180 degrees, with phase
integral `3/2`.

## 3. Ensembles, negative cases and what is only reported (committed first)

Seeded ensembles (oracle numpy PCG64 seed 201; harness mulberry32 seeds in the record):

- `X3`: 2,000 in-regime draws (`T` 500 to 3000 K, `mu` 2.2 to 4.0, `g` 5 to 30 m s^-2 log-uniform, `R_p` 0.8 to 1.6 R_Jup,
  `R_s` 0.6 to 1.4 R_Sun, `P_0` 0.1 to 10 bar log-uniform, `X` 1e-5 to 1e-2 log-uniform, rejected if `H/R_p > 0.01`), three
  bands of one **synthetic absorber** (below).
- `X4` (coverage): 2,000 draws; the scale-height inference from the depth difference of a strong and a weak band with
  30 ppm of Gaussian noise on each depth, truth from the oracle; the 95 percent interval is the propagated noise plus the
  stated model error (as a variance of `b^2/3`); coverage must lie in **[0.93, 0.99]** (conservative is allowed, narrow is not).
- `E5` (coverage): 2,000 draws; Lambert albedo from 24 noisy phase-curve points; the 95 percent interval covers in **[0.93, 0.97]**.
- `E6` (coverage): 2,000 draws; brightness temperature from an eclipse depth with 5 percent noise; coverage in **[0.93, 0.97]**.

Negative and misspecified cases, where the method must refuse, widen or say "not constrained":

- `X5`: twelve seeded inputs outside the domain all refuse and twelve inside do not; with a true depth difference of zero,
  the scale height is returned in at most 0.5 percent of 2,000 draws, and with a difference of six noise standard
  deviations in at least 99 percent (the committed rule: a depth difference under three standard deviations is "not
  constrained").
- `X6`: an opaque grey cloud deck above the weak band's effective height (oracle truth) makes the two bands equal; the
  method returns "not constrained" in at least 95 percent of 500 draws, never a number labelled a scale height.
- `N1`: the Lambert fit is **flagged as not describing the data** (reduced chi-square above the 0.99 quantile, no albedo
  returned) in at least 80 percent of 500 draws each for a Lommel-Seeliger sphere and Henyey-Greenstein single-scattering
  spheres with `g = +0.3` and `g = -0.3` (oracle truth, noise 2 percent of the full-phase signal per point), and in at most 2 percent of 500
  draws from a true Lambert sphere.
- `N2`: a band depth whose reflected-light share exceeds the committed fraction (0.1 at `A_g = 0.3`) is refused as a
  temperature; a depth at or below zero is refused.
- `Z1` (**reported, not asserted**, as Gate I's `A6`): the bias of the scale height when `X P_0` is wrong by a factor 3, when the true
  atmosphere has a linear temperature gradient of plus and minus 10 percent over five scale heights, and when a deck cuts only the
  strong band. No published number says what a student's estimate should be; the figure is what the lesson shows.

**The synthetic absorber.** Truth for the numerical checks is a seeded forest of 400 Lorentzian lines (peak cross-sections
log-uniform 1e-28 to 1e-24 m^2, half-widths 2e-4 micron, on a 0.10 micron strong band, 0.10 micron weak band with 40 lines
and a continuum-only window band), written with its truth manifest into the results. It is **labelled synthetic and named
no molecule**: it tests the integration and the geometry, not any molecule's opacity.

## 4. Claim rule as a test over the strings (committed first)

`C1`: the forbidden patterns (English and Spanish) and the permitted sentence forms are in the fixture. The scanner must
catch each of 12 committed bad strings and pass each of 6 permitted ones (a test that cannot fail proves nothing), and
find **no violation** in any string of the atmosphere family: `js/i18n/{en,es}.atmospheres.js`, the atmosphere sequences and
their depths in both languages, and the prototype's own words. Prompt 202 extends the scan to its strings.

## 5. Data, with the rights rule and the stop rule (committed first)

A data-rights decision is per source and per intended redistribution form (Roadmap III 7.5.4). Nothing was downloaded
for this gate; no table was read. The five data requests (the cross-section table Q1, a cited code and its outputs Q2,
a published transmission spectrum Q3, an eclipse-depth table Q4, a Solar System phase-function table Q5) are written
out in the fixture with their intake rules and **none is accepted until read**. A table whose source, terms and basis
are not decided is not shipped, not simulated and not reconstructed from memory: the check that needs it is
`not-measured`.

The three data legs (`D1` transmission spectrum, `D2` eclipse depths, `D3` phase function) are **qualitative comparisons,
never refits, and not inputs of the decision function**: Prompt 202's own text provides, when the table is absent, "a
synthetic spectrum from the model with its truth manifest". A `not-measured` data leg means 202's comparison steps are
built over synthetic data with the truth manifest and carry the words "no published table was compared"; the Roadmap's
validation contract (7.5.8e, authentic-data applicability) is then **unmet for that leg and the register row says so**; the
question whether that stands is Carl's (needed ruling, 7).

## 6. Bytes, requests and plots (committed first)

Prompt 160 allocated T2 no deferred JavaScript and D-R10-73 replaced the allocation with a raise by each prompt's measured
overrun, so the allocation is stated as bounds the prototype must meet. The prototype extends the existing `atmosphere`
widget family (`js/atmosphereWidgets.js`, `js/kernels/atmospheres/`); a new instrument only adds its id to that family's list in
`js/widgets.js`. Bounds on a Node 22 copy (CI's major), as differences of the app build against the base:

- the eclipse and phase slice (kernel, two instruments, English words plus a rot13 size stand-in for Spanish): at most
  **7,168 B** gzipped of deferred JavaScript, its kernel alone at most 2,048 B (`T1.ep.deferred`);
- the whole family with transmission: at most **12,288 B**, its kernel alone at most 4,096 B (`T1.whole.deferred`);
- at most 2 new lazy chunks (`T1.requests`); first-visit precache at most +64 B and idle precache +0 B (`T1.tier`; new files are
  `NEVER_PRECACHED`); no existing route gains a request and none rises by more than 0.2 KB in sources or build figure (`T1.routes`).

Every plot goes through the plot component (`js/plot/chart.js`): the band depths with the stated error, the eclipse bands, the
phase curve (`P1.plot`: path vertices where the data is to 0.1 px, legend toggled from the keyboard, the keyboard readout in
words, units in the axis titles, no drawing code outside `js/plot/`; jsdom).

## 7. The decision function and the slices (committed first)

Groups: `shared` (units, refusals, claim rule, plots, the slice's bytes), `ep` (the eclipse and phase physics: `E1` to `E6`,
`N1`, `N2`), `tx` (transmission: `X1` to `X6`, the published reference `XR`, the pinned table `XT`, the whole family's bytes) and
`data` (`D1` to `D3`, recorded, not decision inputs).

In order: a `shared` or `ep` check that is not a pass (a pass under a ruling counts) gives **C**; else a `tx` check that is not a
pass gives **B**; else **A**. A B authorizes only the slice it names.

- **A**: Prompt 202 whole.
- **B**: Prompt 202 without the transmission piece: the eclipse model with its brightness temperature, and the Lambert phase curve
  with the Bond-albedo relation, over synthetic data with a truth manifest unless a table's rights decision exists. Prompt 205's
  spectra items need the transmission piece and are **not** authorized by B (Carl to rule if he reads them otherwise).
- **C**: stop and record. Prompt 202 is not run; 205's spectra items are removed and the Goldilocks lesson keeps its present
  step; 231's "One planet, every method" omits the eclipse depth (Appendix C, entry 201).

**Needed rulings, stated before the result so none is read into it:** (R-a) whether a `not-measured` data leg leaves the validation
contract's authentic-data requirement met for the slice it supports; (R-b) whether to allow Q1 and Q2 so that the transmission slice
can be measured and the gate re-run (a B is then re-decidable by Carl only).
