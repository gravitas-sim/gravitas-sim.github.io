# Cosmology kernel II: late-time FLRW depth (Prompt 255)

Status: kernel, contract and validation done and tested; the legs that wait for an authentic file are NOT RUN; the
committed verdict function gives **kernel verdict C** (four legs fail and stay failing, section 6); nothing student-facing
is built (the consumers rule holds). The kernel it extends is [COSMOLOGY.md](COSMOLOGY.md), which is unchanged.

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

## 7. Files requested from Carl (nothing fetched, nothing typed)

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
