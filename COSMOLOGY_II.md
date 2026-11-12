# Cosmology kernel II: late-time FLRW depth (Prompt 255)

Status: kernel, contract and validation done and tested; the committed verdict function gives **kernel verdict C** (four
legs fail and stay failing, section 6; the follow-up of section 9 gives A on its own committed legs); the published-age leg
B6 has now been run, age-only, and passes (section 10: product verdict C in the original form, A in the follow-up form, each
with the words age-only B6); nothing student-facing is built (the consumers rule holds, and lifting it is Carl's call). The kernel it extends is [COSMOLOGY.md](COSMOLOGY.md), which is unchanged.

## 1. What this is

`js/kernels/cosmology/late/` adds to `flrw.js` what that file leaves out: radiation, a dark-energy component of constant
equation of state `w`, closed universes, the deceleration parameter and the transition redshift, a stated domain with
refusals, the integrator's error estimate beside every integral, and the degeneracy of a distance at fixed redshift
shown as a contour in a plane of two parameters. It imports the existing constants, the quadrature
(`js/numeric/quadrature.js`) and the root finder (`roots.js`); `flrw.js`, `fit.js` and `index.js` are not edited, so every
cosmology lesson golden is unchanged by construction. Nothing shipped imports it, the cosmology index does not
re-export it, and it is NEVER_PRECACHED (D-R10-255-01).

Delta table (rule 9). Existing authority: `flrw.js` (flat and open Lambda-CDM, `w = -1`, radiation neglected, closed
refused). Missing behaviour: radiation, `w`, closed geometry, the transition, domain refusals, the error carried,
contours. Adopter: this prompt's validation group; later and gated, 256 to 259. Duplication removed: none made.

## 2. Equations, units, domain

```
E(z)^2 = Om x^3 + Or x^4 + Ok x^2 + Ode x^(3 (1 + w)),   x = 1 + z,   Ok = 1 - Om - Or - Ode   (Ode omitted: flat)
D_C = (c/H0) Int dz/E      D_M = D_C | (c/H0) sinh(s D_C H0/c)/s | (c/H0) sin(s D_C H0/c)/s,   s = sqrt|Ok|
D_L = (1 + z) D_M          D_A = D_M/(1 + z)          mu = 5 log10(D_L / 10 pc)
lookback = (1/H0) Int dz/((1 + z) E)       age = (1/H0) Int_0^1 a da / sqrt(F(a)),   F = a^4 E^2
q(z) = [Om x^3 + 2 Or x^4 + (1 + 3 w) Ode x^(3 (1 + w))] / (2 E^2)
```

Units are those of `flrw.js`: Mpc, Gyr, km/s/Mpc, densities as fractions of the critical density. Radiation is one
component with a density the caller supplies (no CMB temperature or neutrino count is in the kernel; massive neutrinos
are not modelled). **No sound horizon, acoustic scale or fitting formula for either is here** (257 and 258 own them).

The validated domain: `H0` in (0, 1000]; `Om` in [0, 10]; `Or` in [0, 1]; `Ode` in [0, 10]; `w` in [-3, 0]; `z` in
[0, 1e4]. Outside it the kernel throws `FriedmannDomainError` with a code and a reason and returns no number. The
codes, in the order a set that breaks several rules is judged (AM1): `not-finite`, `bad-H0`, `negative-density`,
`density-out-of-domain`, `w-out-of-domain`, `bounce`; then, at the call, `z-out-of-domain`, `beyond-antipode`,
`age-unbounded`, `not-converged`, `bad-argument`.

- **Bounce.** With `F(a) = a^4 E^2`, the set is refused when the scale-free ratio `F / (Or + Om a + |Ok| a^2 + Ode a^(1 - 3w))`
  is at or below zero anywhere on [1e-8, 1] (20000 log-spaced points, refined at the minimum). A recollapse in the
  future is not tested: nothing here evaluates it.
- **Antipode.** A closed universe's `D_M` is refused when `sqrt|Ok| D_C H0/c` reaches pi. A closed set with light that
  crosses it (Om 0.3, Ode 1.4) is accepted and gives distances up to the antipode.
- **Age.** Refused `age-unbounded` when no matter, radiation or curvature term leads at small `a` (de Sitter has no
  beginning); its distances and lookback time remain available.
- **Transition.** The root of `Om x^(-3w) + 2 Or x^(1-3w) + (1 + 3w) Ode = 0`, unique because the left side increases
  with `x` for `w <= 0`; null with the reason `decelerating-today` or `always-accelerating`.

Numerics: adaptive Gauss-Legendre (16 points per panel, relative tolerance 1e-12 per panel, depth 20) in `u = ln(1 + z)`
for distances and lookback and in `v = ln a` for the age, in panels at most one unit wide; the age integral starts at
`a = 1e-10` with the leading small-`a` term added analytically. The error estimate returned beside every value is the
sum of the accepted panels' disagreements plus eight units of rounding; the library calls it an estimate and not a
bound, and so does this kernel (leg B5 tests whether it covers). A non-converging integral is refused.

## 3. Use

```js
import * as K from './js/kernels/cosmology/late/index.js';
const c = K.createFriedmann({ H0: 70, Om: 0.3, Or: 0, Ode: 0.7, w: -1 });
c.quantity('luminosity', 1);   // { value: 6607.66 Mpc, error: 1.4e-11 }
c.age(); c.lookbackTime(1); c.decelerationParameter(0); c.transitionRedshift();   // { z: 0.671, reason: null }
c.history([0, 0.5, 2, 10]);    // E, H, q, density fractions, lookback time, age at z
K.distanceContour({ base: { H0: 70, Om: 0.3, w: -0.9, flat: true }, z: 0.5, quantity: 'luminosity',
  x: { name: 'Om', min: 0.15, max: 0.6, n: 19 }, y: { name: 'w', min: -3, max: 0 } });
K.degeneracyDirection({ base, z: 0.5, quantity: 'luminosity', x: 'Om', y: 'w' });
```

The contour scans the second parameter at 64 points, takes the first sign change between two in-domain points and refines
it by Brent's rule; a grid value with none is skipped with `no-root` or `all-refused`, and a contour never contains a point
of a refused set. The direction is the tangent of the contour from five-point central differences at a step of 1 percent of
each parameter's scale.

## 4. Validation (`npm run cosmology2:validate`, held by `tests/cosmology2Results.test.js`)

Thresholds were committed first (`tests/fixtures/cosmology2/thresholds.json`, commit 1a199901), before the kernel, the
oracle's output or any validator run. The independent oracle `tools/cosmology2-oracle/oracle.py` (numpy 1.26.4, scipy
1.13.1, astropy 6.0.1, no Gravitas code) was written after the thresholds and its output pinned (7414ee63) before the
kernel was run. It holds two calculations: astropy's `FlatLambdaCDM`, `LambdaCDM`, `FlatwCDM`, `wCDM` (the cited
independent cosmology code; radiation read back from its photon and massless-neutrino densities) and its own scipy `quad`
at relative 1e-13 with a complex-step derivative; it also draws the seeded ensemble (numpy `default_rng(255)`), applies
its own brute-force domain check and solves the contours. (astropy's `import` needs PyYAML; none was installed, and
nothing was downloaded: the run used a four-line import-only stand-in outside the tree. No YAML is read or written.)

| Leg | Contract | Bound | Measured | Status |
|---|---|---|---|---|
| A1 Einstein-de Sitter | closed forms, 3 H0 x 9 z, 9 quantities | 1e-10 | 2.6e-14 | pass |
| A2 empty universe | closed forms, q = 0, transition null | 1e-10 | 5.3e-15 | pass |
| A3 de Sitter | closed forms, age refused | 1e-10 | 8.0e-16 | pass |
| A4 radiation only | closed forms | 1e-10 | 1.1e-14 | pass |
| A5 w = -1/3 is curvature in E(z) | E to 1e-14, D_C and D_M to 1e-9 | | 1.8e-15 | pass |
| A6 flat Lambda-CDM | age, lookback, q, transition | 1e-10 | 1.3e-15 | pass |
| A7 matter only, not flat | Mattig D_L (open and closed), ages | 1e-10 | D_L 2.8e-13; age **2** (section 6) | **fail** |
| A8 identities | closure, E(0), D_L = (1+z)^2 D_A, mu, fractions, lookback + age(z) = age, bits, frozen input | 1e-14 to 1e-10 | 5.2e-15 | pass |
| A9 existing kernel | 5 sets, flat and open, `createCosmology` | 1e-9 | 3.5e-16 | pass |
| B1 astropy, ten sets, z to 1100 | E, distances, lookback, age, age(z) | 1e-8 | 4.1e-14 except age(z): **5.0e-7** (section 6) | **fail** |
| B2 own quadrature, same rows | | 1e-10 | 8.3e-15 | pass |
| B3 the oracle against itself | | 1e-7 | **5.0e-7** (age(z) at z = 1100, three sets) | **fail** |
| B4 q and the transition | complex-step q; Brent root | 1e-10 | 6.1e-16, 1.1e-15 | pass |
| B5 error estimate covers | 290 values | 99% | 100% | pass |
| B6 published table | file required | | | NOT RUN |
| C1 seeded ensemble | 400 draws, 295 accepted, 2642 values | 1e-9, 99% | 1.1e-13, 100% | pass |
| D1 to D4, D6 | bounce, densities, w and H0, z and antipode, de Sitter age | exact codes | all as committed | pass |
| D5 domain agrees with the oracle | 400 draws, 295 accepted, 105 refused, 0 margin | 0 disagreements | 0 | pass |
| D7 refusals are explained | 150 refusals, messages of 30 characters or more | | 0 bad (first run: 15, section 6) | pass |
| F1 contours | 3 contours reproduce the target; oracle solutions | 1e-9, 1e-7 | 4.2e-16, 3.1e-15 | pass |
| F2 direction vs complex-step gradient | slope and gradient | 1e-6 | 3.5e-8, 4.0e-8 | pass |
| F3 Hubble scaling | d ln D / d ln H0 = -1; H0 closed form | 1e-8; 1e-9 | **4.0e-8**; 2.2e-16 | **fail** |
| F4 contour skips | the skip-refusal and unreachable contours | | as committed | pass |
| R1 CPU time | reported | | 14 s whole table; 2.3 ms per construction and distance; 0.28 ms per age | |

(c) of the validation contract (a stated uncertainty covering the truth at a stated rate) is **not applicable to a fitted
uncertainty**: nothing is fitted. C1 and B5 test the one uncertainty the kernel carries, the integrator's estimate.

## 5. Verdict

By the function committed in the thresholds, from the rows: **kernel verdict C** (A7, B1, B3 failed; F3 failed, which
would alone make it B). The product verdict is NOT ESTABLISHED (B6 NOT RUN). The consumers clause is unmet whatever the
kernel verdict and is met only by a product verdict of A, so the panels, the lessons ("The Expanding Universe", "The Shape
of Expansion", "How old is the universe?") and the model-page section of the prompt's items 2 to 4 are not built
(DECISIONS_2026-11-05 and -06, consumers rule). Nothing to claim and nothing to release.

## 6. The failed legs, and what each is about

None of the four failures is a disagreement of the kernel with an independent calculation; each is in what the
committed leg says. They stay failing (no bound is moved after a result; the follow-ups below enter as new legs with
thresholds committed first).

- **A7, the open-universe age.** The committed form `Om/(2 (1-Om)^(3/2)) arccosh(2/Om - 1) - 1/(1-Om)` has the wrong
  sign (the age is `1/(1-Om)` minus that term; it is negative as written). Luminosity distances (open and closed) pass at
  2.8e-13 and the closed-universe ages at 1e-15; the kernel against the negated form is 3.6e-16 on Om 0.1, 0.3 and 0.7
  (a diagnostic recorded in the row, not a pass criterion), and the same kernel matches astropy and the independent
  quadrature on the open sets S3 and S7 to 1e-14.
- **B1 and B3, astropy's `age(z)` at z of 100 and 1100.** astropy 6.0.1 is accurate to about 5e-7 there: the identity
  `age(0) = lookback(z) + age(z)` fails inside astropy at z = 1100 by 5.0e-7 (S2), 4.8e-7 (S9), 3.5e-7 (S10) and 2.7e-8
  or less on the other sets, while the oracle's own quadrature satisfies it to 1e-11 and the kernel agrees with that
  quadrature to 8e-15 (B2). Every other quantity agrees with astropy to 4e-14. B1's 1e-8 was taken from astropy's stated default tolerance; its measured error is larger.
- **F3, the step of the direction tool.** The committed 1 percent step has a five-point truncation error of
  `4 (h/H0)^4 = 4e-8` on a function that is exactly `1/H0`; F3 asks for 1e-8. The committed rule and the committed bound are
  inconsistent with each other and the measurement shows it. F2, whose bound is 1e-6, passes at 4e-8.
- **D7, the first run.** The not-finite refusals were 26 to 28 characters against the committed 30. That is a defect of the
  kernel's message, not of a bound, so the kernel's message was lengthened and the bound left alone; the first complete
  run's five failures are kept in `tests/fixtures/cosmology2/first-run.json`.

## 7. Files requested from Carl (nothing fetched, nothing typed; they have since arrived, section 10)

B6 (and so the product verdict) needs one file, `tests/fixtures/cosmology2/authentic/published-table.json`: a published
table of distances and ages for a stated standard cosmology, with the printed parameters, the values as printed, the printed
precision, the source, the licence terms as read from a saved copy and the retrieval date (an `authentic/SOURCES.json`).
Carl chooses the source; no table, parameter or licence term was written from memory.

## 8. Questions for Carl

1. A7, B1, B3 and F3 are failed as committed. Recommendation: a follow-up contract (255b) of new legs with thresholds
   committed first, the four old legs left failing: A7b (the age of an open matter-only universe with the corrected sign,
   same bound), B1b (astropy compared for age(z) only at z of 10 and below, with the identity `age(0) = lookback + age(z)`
   as the oracle's own check at 1e-9), B3b (the same restriction), F3b (a 0.1 percent step or Richardson extrapolation,
   a new direction rule, same 1e-8). The verdict stays C until then. Alternative: ratify the kernel on its other
   22 passing legs and leave the four as an oracle and test-text record.
2. The consumers rule holds: no panel, lesson or model-page section. Recommendation: keep holding until B6's file arrives.
3. D-R10-255-01 to -05 are DELEGATED.

## 9. Follow-up 255b (Carl's ruling of 2026-11-06 on section 8)

Four new legs, `tests/fixtures/cosmology2/followup-thresholds.json`, committed (421a8fe8) before any code, oracle output or
run of this follow-up and by a stated rule: no bound is read from an old measurement; each is the same numeric bound the old
leg committed before its run, or a fraction stated in words. The old thresholds, oracle, results and failed-legs files and
the old validator are not edited; `npm run cosmology2:followup` runs the old validator too and the old legs reproduce to
the digit. The only kernel change is an opt-in `rule: 'richardson'` of `degeneracyDirection` (the default five-point rule
is unchanged).

| Leg | What changed | Bound | Measured | Status |
|---|---|---|---|---|
| A7b | the age with the corrected open form; the formulas are also checked against a new independent scipy quadrature of the age (`followup-oracle.json`), so a transcription error cannot decide the leg again | 1e-10 | D_L 3.5e-13; age 4.1e-15 against the formula, formula against quadrature 4.1e-15, kernel against quadrature 5.0e-16 | pass |
| B1b | astropy's age(z) row is judged only where astropy satisfies age(0) = lookback + age(z) at 1e-8; everything else as B1 | 1e-8 | 14 of 70 age rows excluded (z of 100 and 1100); worst kept age(z) 3.3e-10; every other quantity 4.1e-14; the oracle's own quadrature satisfies the identity to 1.2e-11 on all rows | pass |
| B3b | the same rule at 1e-7 | 1e-7 | 3 of 70 excluded; worst kept 2.7e-8; own identity 1.2e-11 | pass |
| F3b | Richardson differencing, (16 g(h/2) - g(h))/15, O(h^6) | 1e-8; 1e-6 | d ln D / d ln H0 = -1 to display precision; slope 1.0e-12, gradient 9.6e-13 against the oracle | pass |

Follow-up kernel verdict by the original function with the four replaced: **A**. The original verdict C stays on record (the
committed form binds; the follow-up does not replace it). The product verdict stays NOT ESTABLISHED (B6 NOT RUN until Carl
fetches the table) and the consumers clause stays unmet. Honest limits of what the follow-up shows: the exclusion rule for
astropy's age(z) was chosen knowing which rows fail, so B1b and B3b say only that the kernel agrees with astropy wherever
astropy agrees with itself, while the own quadrature, which satisfies the identity everywhere, carries the claim for the
excluded rows (B2 of the first gate, unchanged). The first run of the follow-up validator is kept in `followup-first-run.json`:
B3b failed because the exclusion was coded for B1b only, an implementation slip against the committed text found at once.

## 10. Leg B6, the published ages (run after Carl's session fetched the data)

Carl's session fetched three papers from arXiv and transcribed what they print; the transcription is in
`tests/fixtures/cosmology2/authentic/published-table.json` (sha256 in the rule and in `authentic/SOURCES.json`, which also
holds each paper's identifier, PDF sha256 and the terms as read; the licence text itself was not saved, so only numbers and cited
facts are recorded). Each printed number was checked against the extracted text of its paper in this session; none is typed from
memory. **No printed table of comoving or luminosity distances for a stated cosmology was found** (Planck 2018 VI, Hogg 1999
and Wright 2006 were read; Hogg holds formulas, not values). B6 is therefore an **age-only** leg.

**The rule, committed first** (`tests/fixtures/cosmology2/b6-thresholds.json`, commit afd2a3e0, alone, before the kernel was
called with any of these inputs; the only arithmetic before it was plain arithmetic on the printed numbers, no kernel, no
oracle). Three legs; each passes when the kernel's age is within the leg's tolerance of the printed age, the tolerance being
the sum of (a) one unit of the last printed digit of the age (the committed B6's own bound), (b) the half unit of every printed
input propagated (the kernel runs at the rounded input), (c) for Planck only, an allowance for the radiation and neutrino
difference. The radiation supplied is the one density the data print, Wright's `Omega_r h^2 = 4.165e-5` (three massless
neutrino species, T0 = 2.72528 K) divided by the leg's own `h^2`, because Planck's Table 1 prints none and the kernel takes
one caller-supplied component. Planck's `Omega_m` includes one 0.06 eV neutrino (the caption says so), non-relativistic over
the epochs that matter, so the supplied radiation exceeds Planck's by at most one neutrino species' share (at most one third
of the supplied `Or` for any neutrino-to-photon weight); the allowance fraction is one half, covering that third and the
unprinted small differences. A convexity bound (`|Delta(H0 t)| <= |Delta Or| / Om^(3/2)` with flat closure) turns the
allowance into a relative age tolerance without any integral of the age. Amendment AM3 records that this widens the committed
one-unit bound, and why: a one-unit bound on an age printed to six digits (7e-6) is smaller than the effect of radiation on the
age, so it would measure the radiation density chosen and not the kernel. The literal one-unit reading is reported beside
every leg.

| Leg | Printed (as transcribed) | Kernel | Difference | Tolerance by the rule | Status |
|---|---|---|---|---|---|
| Planck 2018 VI Table 1, Plik best fit: flat, H0 and Omega_m as printed, Or = 4.165e-5 / h^2 | 13.7971 Gyr | 13.797235 Gyr | +9.8e-6 relative (1.35 units of the last digit) | 4.53e-4 (0.0062 Gyr) | **pass** |
| Wright, open, Omega_M = 0, H0 97.78, its radiation | 9.934 Gyr | 9.934352 Gyr | +3.5e-5 (0.35 units) | 1.59e-4 | **pass** |
| Wright, open, Omega_M = 0, H0 977.8, its radiation | 999 Myr | 999.3325 Myr | +3.3e-4 (0.33 units) | 1.12e-3 | **pass** |

Reported beside, not judged. The literal committed reading (within one unit of the last printed digit) **fails for Planck** (1.35
units: the kernel with the one supplied radiation density is 1.3e-4 Gyr above the printed value; that is inside the stated
radiation and neutrino allowance and is consistent with a mismatch of that kind, but nothing here shows it is the cause) and passes for both Wright legs. With the radiation set to
zero the Planck leg still passes (+4.1e-4 relative, inside 4.53e-4) and the 977.8 leg still passes, while the 97.78 leg
fails (0.66 percent: 10.000 Gyr against 9.934): only the 97.78 leg depends on the radiation term. The kernel's age beside the
printed marginalised Plik mean (13.797 with a printed error of 0.023) is 0.01 of that error. The empty-universe-with-radiation
closed form `(1/H0) / (1 + sqrt(Or))` agrees with the kernel to rounding.

**Verdict.** B6 passes (age-only). By the function committed in the rule: the product verdict is **C (age-only B6)** in the
original form (kernel verdict C, section 5) and **A (age-only B6)** in the follow-up form (kernel verdict A, section 9; the
original form is not replaced). The consumers clause is met only by a product verdict of A: **unmet in the original form, met
on the letter in the follow-up form.** Reporting that is not lifting the consumers rule: that is Carl's call, as is whether an
age-only B6 satisfies the contract's B6 (which asked for distances and ages). Nothing is built.

What a pass does establish: the kernel's ages agree with two published sources: Planck's best-fit age within a tolerance that is
wider than the effect of the radiation (so the leg checks matter, flat dark energy and the unit conversion, not the radiation or
neutrino treatment), and Wright's printed empty-universe ages with radiation, the 97.78 case depending on the radiation term.
What it does not establish: any distance (comoving, luminosity, angular diameter, modulus, lookback) against a published number;
distances rest on the closed forms, astropy 6.0.1 and the independent quadrature only. Nor w other than -1, matter with
curvature, closed universes, the transition redshift or the contours against any published value. Wright's calculator integrates
by the mid-point rule with 1000 panels (printed); the rule gives that a term, assuming the integration variable is `a`.

Mechanics. `npm run cosmology2:b6` (`tools/cosmology2-b6.mjs`) recomputes every tolerance term from the printed numbers, asserts
they equal the committed ones, runs the kernel once per leg and writes `b6-results.json` and `b6-failed-legs.json` (empty);
`tests/cosmology2B6.test.js` holds both. The first-gate validator keeps B6 NOT RUN in its pinned table (`results.json` is
unchanged, as is every follow-up file); the first-gate test no longer asserts that the authentic directory is absent. The one
run is the run recorded: nothing was rerun, tuned or counted out.

Questions for Carl. (1) Is an age-only B6 enough for the contract's B6, so that the follow-up form's product verdict A counts?
If not, a published table of distances for a stated cosmology is the file that would close it (none was found in the three
papers). (2) Which form binds, the committed one (product C) or the follow-up (product A)? (3) Lift the consumers rule for the
three lessons, the panels and the model-page section, or keep holding? This session builds none of them. (4) D-R10-255-09..12
are DELEGATED.

<!-- Listed in DOCUMENTS.md. -->
