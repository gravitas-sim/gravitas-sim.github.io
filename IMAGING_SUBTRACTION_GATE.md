# The subtraction and orbit gate

Roadmap III, Prompt 230, Part B. Reference-star subtraction on the detector kernel's frames, its throughput
measured by injection, the residual-noise statement, and the apparent orbit of an imaged planet fitted by Prompt
187's fitter (verdict A, D-R10-66) to positions this pipeline measured. This file records the contract that was
committed before any module, oracle or output existed, the measurements, and the verdict. **The verdict is C:
nothing of this part ships as a lesson or a panel, and "Following a Planet" is not built.** The record is
decision-register row D-R10-230-90.

The numbers are in `tests/fixtures/imaging-subtraction/` (`thresholds.json` the contract and its amendments,
`results.json` the single gate run, `failed-legs.json` the failed legs, each labelled). The modules, the
validator, the independent oracle and the pinned oracle cases are on `spike/imaging-subtraction-gate`
(`js/kernels/imaging/subtract.js` and `orbit.js`, `tools/imaging-subtract-validate.mjs`,
`tools/imaging-subtract-oracle/`), never merged. No spike was kept apart from the modules: the validated modules
are the ones a lesson would have used, so a spike that copied them would only have added a second copy; the same
branch holds the two panels, the lesson and its registrations, written while the gate ran and left unshipped.

## What was committed first

The thresholds file (`46b116db`) fixed, before any code existed: the scene (a 64 by 64 clean detector, a star of
10,000 electrons a second for 30 s, a Moffat profile of 3 pixels FWHM and beta 4.765 through the detector
kernel's own profile-table path, sky 3 electrons a second a pixel, gain 1.5, read noise 8); the reference star
(brightness 0.6 to 1.6 of the target's, FWHM within 3 percent, centroid 0.03 pixel); the method (M1 to M8:
electrons, sky from the outer ring, the least-squares scale inside 2 FWHM, the residual, local robust noise, a fit
of the known profile, a matched-filter search, injection with shot noise); the refusals; 27 legs with their
bounds; the verdict function; and the rule that a crossed bound stays crossed.

| Verdict | Condition (committed) |
| --- | --- |
| A | every core leg and every orbit leg passes: the subtraction demonstration with its throughput, and the orbit fit above 187's criterion |
| B | every core leg passes and an orbit leg fails: the subtraction only |
| C | a core leg fails: neither; reading steps |

Core legs: A1 A2 A3 B1 B2 B3 B4 T1 C1 D1 D2 D3. Orbit legs: O1 O2 O3 O4. Secondary (recorded, no effect on the
letter): T2 N1 N2 C2 D4 D5 O5 O6.

## Amendments, all before the gate stream was run

A development stream (`dev230b`) was used to debug and to set method parameters; its numbers are never read
against a bound. Six amendments were written before any leg ran on the gate stream, each with its reason in
`thresholds.json`, the original text staying in the file:

| Id | What | Why |
| --- | --- | --- |
| AM1 | working radius 1.5 to 2.5 FWHM; D1, T2, T3, C pool and the search follow | on 60 planet-free pairs the residual's rms was 48 electrons at 1.5 FWHM and 22.8 at 2 against a floor of 18.1, and 27 of 60 frames produced a candidate of S/N 5 or more |
| AM2 | an injection is recovered when the best candidate is within 2 pixels (Prompt 184's pattern) | a clarification of M8 |
| AM3 | O4 reads Prompt 187's criterion for the depth the fit returned | 187 returns the circular elements, judged by the circular criterion, when no eccentricity is detected |
| AM4 | A2's list moves from 2 to 2.5, 3, 5, 8 FWHM (2 FWHM reported, not judged) | AM1 left the 2 FWHM cell inside the working radius (a flux bias of 6.7e-4 and a position bias of 2.5e-3 px, the star residual's wing) |
| AM5 | the subtraction-depth refusal limit 0.25 to 0.10; the search's outer radius 0.69 to 0.8 of the half-width | on the development stream nominal pairs had depth 0.015 to 0.056 and a reference 20 percent wider 0.150 to 0.167, so 0.25 would refuse none; the committed search radius ended at the sky ring, short of the planets of T1 and N2 at 8 FWHM |
| AM6 | D2's bad cases use the reference brightness 0.6 | a narrower, brighter reference saturates, which is D5's case |

AM5's limit was set on development numbers; D2 therefore tests a rule whose threshold was set between two
groups on another stream, which is the most it can say. No bound of any leg moved, and none was moved after the
gate stream ran.

## The measured legs

One run of the gate stream (`imaging-subtraction-230b`), Node 24.4.0, 926 s, on the commit `d10f1984`.
The oracle is numpy 1.26.4 and scipy 1.13.1 (its own scale, subtraction, robust noise and a `least_squares`
Moffat fit; no Gravitas code).

| Leg | Result | Bound |
| --- | --- | --- |
| A1 pure scale | k to 1.3e-15, residual 1.5e-15 of the peak | 1e-12, 1e-9 |
| A2 closed-form throughput, noise-free fit | 7e-15 (throughput); flux 2.7e-5, position 1.0e-4 px (2.5 to 8 FWHM) | 1e-9, 1e-3, 1e-3 px |
| A3 noise propagation | variance ratio 1.0025 | 0.97 to 1.03 |
| B1 to B4 against the oracle (8 pairs) | k 0, residual 0, fit 4e-7 sigma, formal sigma 5e-9 | 1e-9, 1e-6, 0.01 sigma, 1e-3 |
| T1 throughput by injection, 3, 5, 8 FWHM, contrast 3e-3, 1e-2, 3e-2 | medians 0.9986 to 1.0101 (16th to 84th percentile 0.89 to 1.14 at 3e-3, 0.96 to 1.05 at 1e-2, 0.98 to 1.02 at 3e-2); detected 0.99 to 1 | 0.95 to 1.05 |
| T2 at 2.5 FWHM | medians 1.0018 and 0.9984 | 0.85 to 1.15 |
| N1 matched-case residual noise | robust rms ratio 1.0014 | 0.97 to 1.05 |
| N2 completeness at the 5-sigma limit | 0.535, 0.600, 0.515 at 3, 5, 8 FWHM (limit contrast 1.65e-3, 1.64e-3, 1.60e-3) | 0.35 to 0.75 |
| **C1 coverage, 68.27 percent** | **flux 0.538, x 0.540, y 0.548 (2,197 injections)** | **0.60 to 0.76: FAILS** |
| **C2 coverage, 95 percent** | **flux 0.827, x 0.850, y 0.838** | **0.90 to 0.99: FAILS** |
| **D1 inside the working radius** | **0.855 of 200 returned inside-working-region** | **1.0: FAILS** |
| D2 reference 20 percent off, nominal | refused 1.0, accepted 1.0 | 0.95, 0.95 |
| D3 missing, size, non-finite, bad width | 1.0 | 1.0 |
| D4 planet-free false alarms | 0.0067 | at most 0.05 |
| D5 saturated reference | 1.0 | 1.0 |
| O1 short arcs refused | 10 percent 1.000, 30 percent 0.993 | 0.99, 0.95 |
| **O2 110 percent accepted** | **0.753** (60 percent: 0.700) | **0.80: FAILS** |
| **O3 coverage where accepted** | 60 percent arc (105 accepted): period 68 percent 0.610, 95 percent **0.867**, semi-major axis 0.648 and **0.876**; 110 percent arc (113): 0.628, 0.912, 0.611, 0.912 | 0.60 to 0.76, 0.90 to 0.99: **FAILS at 60 percent** |
| O4 no orbit below the criterion | 219 accepted, 0 below the criterion of the depth returned | 1.0 |
| O5 the map against the fitter | 1.0 of 100 inside | 0.90 |
| **O6 the degeneracy on a short arc** | **0.84** of 100 spanned a factor of 2 or more (median factor 5.0) | **0.90: FAILS** |
| E1 authentic data | NOT RUN: no real reference-star pair or published astrometry was supplied, nothing was fetched | |

T3 (a report) forced the measurement inside the working radius: at 1 FWHM the median flux ratio is 2.27 at
contrast 3e-3 (16th to 84th percentile -4.2 to 5.8), 0.96 at 1e-2, 0.93 at 3e-2 and 0.87 at 1e-1 (149 of 200
measurable); at 2 FWHM it is 1.04, 0.99, 1.00 and 1.00.

### Verdict

**C.** The committed function gives C because two core legs fail, C1 (the stated one-sigma interval of a measured
planet covers the truth in 54 percent of the injections against a stated 68.27) and D1 (the pipeline returned
the working-radius refusal in 85.5 percent of the cases injected inside the radius, not all). The orbit legs
O2, O3 (at 60 percent) and O6 fail as well, so a B verdict would not have held either. Nothing was reinterpreted
after the result.

What passed is not nothing. The subtraction is correct against closed forms and an independent implementation to
rounding; its throughput is 1 within a few percent wherever the planet is detected outside the working radius
(T1, T2); its noise is the propagated photon and read noise (A3, N1); it refuses a mismatched, saturated or
malformed reference and finds no planet in 99.3 percent of planet-free frames (D2 to D5); the fitter's refusal of
10 and 30 percent arcs holds on positions this pipeline measured (O1), no orbit is returned below its criterion
(O4), and an independent map of the chi-squared agrees with the fitter's period (O5). Those are secondary or
supporting and cannot change the letter.

### Why the failed legs failed (labelled as readings, not results)

These are readings made after the verdict. They do not move a bound.

- **C1 and C2.** The formal sigma comes from the fit's Jacobian and the residual's measured noise: the sky and
  read noise, white. It leaves out the planet's own shot noise. A diagnostic on the development stream, not a gate
  leg, split the coverage by contrast: flux coverage 0.61 to 0.65 for planets of 3e-3 and 1e-2 (inside the
  bound), 0.46 to 0.53 for 3e-2 (the rms of the flux error over its stated sigma 1.5 to 1.6). The pooled gate
  population includes the bright cells and fails. A re-gate with the planet's Poisson term in the sigma is the
  obvious repair; it is Carl's to open, with thresholds committed before it.
- **D1.** The leg injected planets of contrast 0.1 inside the radius. Of 200 development-stream cases
  169 returned `inside-working-region` and 31 returned `reference-mismatch`: a planet carrying a tenth of the
  star's light inside the scale-fit disc lifts the residual above the depth limit, so the subtraction refuses
  earlier. The refusal is correct and the code differs from the committed one. The committed leg named the code,
  and the leg failed.
- **O2, O3, O6.** On the gate stream 37 of the 150 trials at 110 percent were refused by the fitter as
  `inconsistent` (and 22 at 60 percent): the stated positional uncertainties are too small for the model's
  chi-squared test, which is the same understatement as C1. The 60 percent arc's 95 percent intervals under-cover
  (0.867, 0.876). The degeneracy span on 30 percent arcs is wide (median factor 5.0) but under the committed
  factor of 2 in 16 percent of the trials.

## What ships instead

The reading, not a lesson: this document and its register row; `IMAGING.md` states that Part B was gated and
what the gate found. No panel, no kernel, no lesson, no closure file and no ceiling changes. Prompt 187's orbit
fit and its panel in the Observatory are unchanged, and the Part A lessons (Why We Cannot See Earth From Here,
Architectures) stand as merged. A student who wants subtraction or an orbit from imaging uses Prompt 187's panel
on measured positions, with its refusal.

## What a re-gate would change

The conditions Carl would be asked to set, none of them done here: the planet's shot noise in the stated sigma
(C1, C2, O2, O3); D1 stated by outcome (a refusal of the measurement, whichever code) rather than by code; a
brighter or a mismatched-profile scene in which subtraction changes what is detectable. In this scene the
Moffat profile falls off so fast that beyond about 3 FWHM the frame is limited by sky and read noise rather than by the
star, so subtraction removes light that was not the limit; the interesting regime (a speckle halo) is not
modeled. A gate on that regime needs an authentic frame pair or a speckle model with its own validation, and
neither was available.

Ruled on 2026-11-04: the re-gate is declined for now and reopens only with an authentic frame pair or a
validated speckle model (register row D-R10-230-91).

## Limits

Synthetic frames and invented orbits throughout; a clean detector; one profile; the authentic leg not run;
the oracle shares the contract's definitions (the scale, the residual and the fit are the contract's), so B1 to
B4 hold the code against an independent implementation of the stated method and not the method against a real
instrument; the amendments set parameters on a development stream.

<!-- Listed in DOCUMENTS.md. -->
