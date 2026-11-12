# The interstellar medium kernel: lines, widths, velocities, columns and reddening (Prompt 247, Part A)

Measure what the gas between and around the stars does to a spectrum, and say how well. This is the kernel part of Part A
of Prompt 247 (an invisible pull request: no overlay, no investigation, no instructor material, nothing a student sees).
It adds `js/kernels/ism/` (eight modules), its validator `tools/ism-validate.mjs`, an independent oracle
`tools/ism-oracle/`, a validation group of six checks, and the fixtures under `tests/fixtures/ism/`. The spectra
viewer's line-identification overlays and equivalent-width tool, the three investigations ("What the nebula is made of",
"The dust in between", "The gas on the way") and the model-page section are a separate instructional pull request that
waits for Carl's go-ahead. Part B, the plasma diagnostics, is a gate with no result: see
[PLASMA_DIAGNOSTICS_GATE.md](PLASMA_DIAGNOSTICS_GATE.md).

The validation contract was committed first, in `tests/fixtures/ism/thresholds.json` (and the gate's in
`gate-thresholds.json`), before any kernel, oracle output, spectrum or result existed. This document was written after
it. A crossed bound is a failed leg and stays failing; only Carl resets one. **The recorded run has no failing leg**
(31 pass, 3 reported, 3 not run); four amendments to the worlds, none to a bound, are in `thresholds.json` with their
reasons. No consumers rule was committed beforehand, so the overlays, investigations and model section wait for Carl
whatever the table says.

## What is built and what is not

Built: (1) **line detection and identification** against the radiation line pack (hydrogen, helium, calcium, sodium,
magnesium and iron lines), in the spectrum's own medium, with a redshift from the identified lines and a label for
features inside a caller-supplied diffuse band; (2) **the continuum and the equivalent width**: a straight line through two
side windows, the direct sum `W = sum (1 - F/C) w` over a line window (positive for absorption) with the continuum choice
recorded and the constant-continuum result beside it, and a pixel-integrated Gaussian line through the spectrograph kernel's
`fitLine`; (3) **Doppler velocities** from a fitted centre, through the spectrograph kernel's `radialVelocity`, which
refuses a missing or mismatched medium, with the 154 interval; (4) **the resolution flags**: undersampled, broadened, an
unresolved pair; (5) **the column density, linear regime only**, with the classical electron radius derived from a pinned
reading of astropy's constants, the oscillator strength a required input, the regime tested by the doublet ratio or by the
line's own peak depth and refused otherwise; (6) **the Balmer decrement** and the colour excess it gives through the
CCM89 law the radiation kernel already holds, the intrinsic ratio and R_V required inputs, with de-reddening of a line
flux; (7) **the stellar-versus-interstellar classification** by width and velocity offset, which says "ambiguous" when the
data cannot tell; (8) **a labelled synthetic generator** of three worlds with a truth manifest.

Not built, on purpose: the overlays, the investigations, the model section and instructor materials; **any pack** (packs
have 0 B of room, and the files the contract needs are not in the tree); the oxygen, nitrogen and sulphur lines (the line pack
does not hold them: "Rights and the authentic legs" below); the diffuse-band centres; "The dust in between"'s intrinsic
colours; the plasma diagnostics (Part B, no verdict); a curve of growth beyond the linear part; a velocity profile or an
apparent-optical-depth column; a multi-component fit; underlying stellar absorption in the Balmer lines.

## The electron radius and the column density

An optically thin line of equivalent width `W` from `N` absorbers per unit area of oscillator strength `f` has
`W / lambda = pi r_e N f lambda`, so `N = W / (pi r_e f lambda^2)`, `r_e = e^2 / (4 pi eps0 m_e c^2) = alpha h / (2 pi m_e c)`.
`h` and `c` are exact. The fine-structure constant and the electron mass are not typed: they are copied from
`tests/fixtures/ism/constants-source.json`, which `tools/ism-oracle/constants.py` writes from the installed astropy 6.0.1
(CODATA 2018 by its own reference string, offline, nothing fetched). The module holds no value for `r_e`; leg A1 recomputes
it from the file (0 relative difference) and from `e^2 / (4 pi eps0 m_e c^2)` (3.0e-12, CODATA's own consistency), and B4
agrees with astropy's route to 3.0e-12. **The oscillator strength has no default**: a typed one would be a published value
from memory. The caller supplies it with a source string and a call without one is refused.

## The linear regime is tested, not assumed

A column density from a saturated line is wrong by a factor that grows without bound, so the number is withheld unless a
test says the line is thin. **T1** (a doublet): the ratio of the two equivalent widths against `f2 lambda2^2 / (f1 lambda1^2)`;
linear when they agree within 2 sigma of the observed ratio, `saturated` when the observed ratio is below by more than 2 sigma,
`ratio-above-atomic` when above. **T2** (one line): the line must be *resolved* (an unresolved line's depth is the
instrument's, not the gas's) and its peak optical depth `-ln(1 - depth)` must not exceed 0.3, where a Gaussian line's
equivalent width is 0.902 of its linear value (leg A2: the numerical integral against the series
`sum (-tau0)^(n-1) / (n! sqrt n)`, 5e-15). Where neither test applies the answer is `linear-regime-untested`. The power of T1
is stated in its result (`detectableDeficit`): at the committed noise a doublet ratio is uncertain by about 23 percent, so it
sees heavy saturation and not a few percent. **At SDSS resolution the sodium D lines are one blended feature or, on the
repository's own 3-sample-binned pack, below one pixel per resolution element, so no sodium column can be given from the
in-tree spectra** (legs A10, D5, E3): that is a correct refusal and the lesson should say so.

## The Balmer decrement

`R = F1 / F2` of two hydrogen lines against an intrinsic ratio `R0` the caller states gives
`E(B-V) = 2.5 log10(R / R0) / (k2 - k1)`, `k = R_V A(lambda) / A(V)` from the CCM89 law of the radiation kernel (the law object is
passed in). **No default for `R0` or `R_V`**: both are required inputs with a source string for `R0`. A value below the
intrinsic ratio is returned signed and flagged `below-intrinsic`; when the one-sigma interval contains zero the result says
"no reddening detected". A line under 5 sigma, a non-positive flux, a wavelength outside the law and a missing input are refused
by code. The model is a uniform foreground screen of dust and no underlying stellar absorption: leg R1 puts a price on three
of its assumptions (a wrong R_V of 2.5 and 4.0 biases E(B-V) by +0.037 and -0.045 mag, an intrinsic ratio 5 percent high
by -0.048 mag, stellar absorption equal to 5 percent of the H-beta flux by +0.053 mag, against a statistical scatter of
0.049 mag on these worlds).

## Velocities and the medium

The air and vacuum conventions differ by 82.8 km/s at H-alpha (leg A8). The spectrum's medium is required, the rest wavelength
carries its medium, and a mismatch is `medium-mismatch`, never converted. `restOf(line, medium)` takes the pack's value in
the spectrum's own medium. The fit is in sample-index space, linear in wavelength to first order on a uniform or a
logarithmic grid; on the nebula grid that costs 0.016 km/s (leg A3, bound 0.05).

## Stellar or interstellar

A narrow absorption line at a different velocity from a star's broad lines is the signature of gas in front of it. `narrow`
is a width of at most 1.5 line-spread sigma (or half the star's own broad-line sigma); `offset` is a velocity difference of at
least 3 sigma. Narrow and offset is `interstellar-candidate`; broad and at the star's velocity is `stellar`; the rest is
`ambiguous`, including a narrow line at the star's own velocity. It is evidence, never a proof, and the result says so.

## The synthetic worlds

`generateNebula` (Gaussian emission lines at a velocity, reddened through CCM89 on a sloped continuum at R = 1800 on a
log grid of step 1e-4 dex), `generateStar` (broad Gaussian Balmer absorption at the star's velocity, narrow Gaussian
absorption at another) and `generateSodium` (Gaussian optical depth for a column density, convolved with a Gaussian
line-spread function at R = 30000). Every spectrum carries the label that begins `SYNTHETIC ISM SPECTRUM` and a truth
manifest. The line wavelengths are the pack's; every other number is invented by a rule and labelled so, including the oscillator
strengths (0.2 and 0.45, "not sodium's") and the intrinsic Balmer ratios (3.0 and 0.5, "not a recombination value"). The worlds are drawn from the
analysis's own model family (Gaussian lines, a linear continuum, white noise), so the coverage legs test the arithmetic and the
propagation, not model misspecification; R1, R2 and E3 are where misspecification enters.

## Validation contract and measured table

Run: `npm run ism:validate` (about fifteen seconds), Node 22.23.4, oracle numpy 1.26.4, scipy 1.13.1, astropy 6.0.1.
37 rows: 31 pass, 0 fail, 3 reported, 3 not run.

| Leg | What | Result |
| --- | --- | --- |
| A1 | r_e derived; consistent with e, eps0 | 0; 3.0e-12 |
| A2 | Gaussian curve of growth against its series; ratio at tau0 = 0.3 | 5e-15; 0.902 (bound 0.89 to 0.91) |
| A3 | noise-free velocity, five velocities | worst 0.016 km/s (bound 0.05); sigma 1.0e-4 |
| A4 | noise-free equivalent width, direct and Gaussian; the continuum systematic with asymmetric windows | 2.7e-6; 1.1e-4 (bound 1e-3); predicted 0.01487 nm, measured 0.01476 nm |
| A5, A6, A7 | noise-free colour excess; no reddening and below-intrinsic; de-reddening | 1.6e-4 mag (bound 1e-3); flags as committed; 1.3e-4 relative |
| A8 | the medium rule | refused by code; air and vacuum agree to 0.0003 km/s |
| A9, A10 | pair resolution; sampling | the sodium doublet is 1.82 FWHM apart at R = 1800 (resolved) and 30 at R = 30000; the binned grid is 0.80 pixel per FWHM and not fitted |
| A11 | ten pack lines identified at z = 0.0123 | 10 of 10; redshift error 3.9e-6 (bound 5e-5) |
| B1, B2 | equivalent width, continuum, Gaussian fit against the independent implementation and scipy | 7e-15; 2.3e-7 of a sigma |
| B3, B4, B5 | extinction and colour excess; column density against astropy's route; the in-tree A star | 0 and 6e-17 mag; 3.0e-12; 2.5e-15 |
| B6 | a cited independent tool | NOT RUN |
| C1 | velocity coverage, 300 worlds | 0.670 (band 0.602 to 0.763); sd of the normalised error 1.024 |
| C2 | colour-excess coverage | 0.693; sd 0.980 |
| C3 | equivalent-width coverage, direct and Gaussian | 0.677; 0.680 |
| C4 | column-density coverage, linear regime | 0.650 of the 283 that passed T1; pass rate 0.943 (the test rejects a linear line about 5 percent of the time by its own definition); mean bias -2.5 percent (the saturation bias the A2 series predicts) |
| C5 | classification, 200 of each kind | 200 of 200 interstellar candidates; 200 of 200 stellar; none crossed |
| D1 to D10 | refusals, flags, label | all as committed: saturated doublet and single line refused, unresolved single line `linear-regime-untested`, a blend flagged `broadened` (28.6 percent excess), the far pair not (8.0 percent), no feature in 100 noise-only spectra |
| E1, E2 | an authentic H II region against its published decrement; an authentic sodium column | NOT RUN |
| E3 | the fixed contract on the four in-tree stars | reported: the Balmer equivalent widths of the A star are 1.16, 1.26 and 1.36 nm (about 11.6, 12.6 and 13.6 angstrom) with errors from scatter; no sodium line can be fitted on the binned pack |
| R1, R2 | assumptions priced; continuum curvature | reported (see above); a 2 percent quadratic term biases the direct equivalent width of a broad line by +0.077 nm |

C4's mean bias and z (-0.43) show the saturation bias is visible at the committed noise even in the linear regime. The
contract's coverage band held; a lower-noise sodium world would turn C4 into a test of that bias, which is why AM2 limits the
optical depth to 0.05 to 0.08 (it is not a bound that moved).

## Rights and the authentic legs (7.5 rule 4)

Nothing was fetched, no atomic datum, line list, catalogue value or paper value was typed, and no tool was installed. The
line pack (NIST ASD, public domain as the pack records) holds hydrogen, helium, calcium, sodium, magnesium and iron lines; the
SDSS stellar pack (public domain on the basis the pack records) holds four stars on a 3-sample-binned grid. What is needed to
run the remaining legs and what the instructional pull request would need, each a request for Carl to fetch (or to name):

1. **Nebular lines (identification of oxygen, nitrogen and sulphur).** Extend `LINE_SPECS` in
   `tools/data-packs/radiation/specs.mjs` with the lines of O I, O II, O III, N II, S II and S III that appear in nebular spectra,
   each `at` (the NIST query window's centre) taken by Carl from the NIST ASD rows he retrieves (the existing URLs already
   request forbidden lines, `forbid_out=1`), then `npm run packs:data` (the radiation pack's builder; `npm run packs:provenance` rebuilds it from the pinned raw files). This changes the
   line pack (a version bump, the deferred figure and a register row); it is a separate pull request. The kernel needs no change:
   `identifyFeatures` takes any pack line.
2. **Oscillator strengths.** The kernel takes `f` as an input. A pack of `f_ik` (or `A_ki` with the statistical weights, from which
   `f` is derived by a formula the pack states) for Na I D1, D2 and Ca II H, K from the NIST ASD lines form with the transition-probability
   columns enabled, in the same form as `radiation-lines`, so that the investigation can show a student the source.
3. **The intrinsic Balmer ratios.** A cited table of the recombination H-alpha/H-beta and H-gamma/H-beta ratios with the
   temperature and density they hold for (the standard source is Storey and Hummer's recombination tables; that name is from
   memory and unverified, and Carl may choose another), as data the investigation passes in with its source string.
4. **The diffuse interstellar bands.** A cited catalogue with a readable table of band centres and widths (a survey of high
   signal-to-noise stellar spectra is the usual source; Carl names it) and its licence, as a caller input with a source string.
5. **E1.** One SDSS DR18 spectrum of an H II region (CSV, the pack's own URL form
   `https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite?plateid=P&mjd=M&fiberid=F`), with the Balmer decrement
   (value and uncertainty) a published paper gives for it, its reference, and the intrinsic ratio and R_V that paper assumed.
   The contract is fixed before the file is opened: the lines are H-alpha and H-beta, the windows follow the rule of AM4, R_V is the pack's
   (`LAW.defaultRv`), the intrinsic ratio the paper's, and the bound is 2 combined sigma. Rights are decided per source
   (7.5 rule 4); the pack's SDSS basis was read for the stellar spectra and is not inherited without a read.
6. **E2.** One SDSS spectrum of a hot star with interstellar sodium absorption and a published equivalent width or column for it,
   under the same terms. At SDSS resolution a refusal is a correct outcome.
7. **B6.** A cited independent spectral tool (a spectral-analysis package) in a pinned virtual environment: install it, run it on
   the exported B1 and B5 spectra (`node tools/ism-oracle/make-inputs.mjs`), and pin its equivalent widths and line list in
   `tests/fixtures/ism/toolkit/result.json`; the leg will compare its widths to the kernel's.
8. **"The dust in between".** A cited table of intrinsic colours by spectral type, for the colour-excess investigation; none is in the tree.

## Open questions for Carl

1. **The consumers rule.** May the instructional pull request (overlays, the equivalent-width tool, the three investigations,
   the model section) proceed on this kernel, and which of the requests above must land first? Items 2 and 3 gate the
   Balmer and sodium investigations; items 1 and 4 gate the identification overlay's oxygen, nitrogen, sulphur and band rows.
2. **The sodium investigation at SDSS resolution (answered by Carl's overnight delegation, 2026-11-05; a plan, not a built item).** The in-tree
   spectra cannot give a sodium column (the binned pack is under one pixel per resolution element). When the lessons come, "The gas
   on the way" is built on the synthetic sodium world with the refusal as the lesson (a saturated doublet and an unresolved single line
   are refused by code, legs D1 and D5). No high-resolution pack and no new rights decision is planned for it. Nothing of it is built here.
3. **E1, E2 and B6** need the files above; **Part B** needs the atomic data and the independent pipeline of
   `PLASMA_DIAGNOSTICS_GATE.md`.

## Inherited limits to state in claims built on this kernel

Every spectrum here is synthetic except the four in-tree stars, whose uncertainties are the scatter of their continuum windows
because the pack carries no per-sample error. The worlds share the analysis's model family, so a coverage here is not a
statement about real nebulae; the authentic tier (E1, E2, B6) is NOT RUN. The resolving power of the in-tree stars (1974) is
derived from the pack record's statement that SDSS resolves about 2.2 samples of its native step, not measured. The decrement
assumes a uniform foreground screen and a stated intrinsic ratio, and an electron temperature and density the intrinsic ratio
depends on are not measured here (Part B). The column density is the linear-regime value of a Gaussian line and a single
velocity component; T1 sees only a deficit larger than its own uncertainty.

## References

The CCM89 law is Cardelli, Clayton and Mathis 1989 (ApJ 345, 245) as `js/kernels/radiation/extinction.js` and the extinction
pack cite it; the rest wavelengths are the NIST Atomic Spectra Database as the line pack records; the air-to-vacuum conversion is
Morton 2000 as `js/kernels/radiation/doppler.js` cites it; the SDSS spectra are DR18 (Almeida et al. 2023) as the pack
records. The curve of growth is textbook; the constants are derived. `DECISION_REGISTER.md` D-R10-247-01 to -05.

<!-- Listed in DOCUMENTS.md. -->
