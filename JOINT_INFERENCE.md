# Joint transit and radial-velocity inference with the star inside (Prompt 227)

What is a planet made of, and how well do we know it? A transit gives the planet's size as a ratio to its star;
the velocities give how fast the star moves; neither gives a mass, a radius or a density until the star's own mass
and radius are stated, and those carry an uncertainty that goes into every one of them. This document states what
the model computes (`js/inference/jointPlanet.js`, `js/inference/jointModel.js`, the model `transit-rv-joint`
of the inference core), what it assumes and leaves out, and how it was checked. The investigation is **What Is
It Made Of?** (`what-is-it-made-of`, majors, with a quantitative depth) and the upper depth of **Finding Planets by
Their Tug** (`radial-velocity`, advanced); the instruments are the panels `joint-fit` and `mass-radius`
(`js/jointWidgets.js` over `js/jointField.js`).

## What is new, and what already existed (the delta table)

| Existing authority | Missing behavior | Adopter | Duplication removed |
| --- | --- | --- | --- |
| `js/inference/transit.js` (Prompt 225): the transit model, the star's density from P and a/R*, `constraintKB` | a transit fitted together with velocities under one period and one epoch | `js/inference/jointModel.js` calls the same flux model and the same k-b check | none: the model is used, not copied |
| `js/inference/rv.js`: the Keplerian velocity curve, sqrt(e) cos w and sqrt(e) sin w | the same orbit for the transit (the w of rv.js is batman's w, checked against a three-dimensional orbit) | `jointModel.js` | none |
| `js/inference/binaryJoint.js`: one table with several data sets, told apart by a groups column | per-group roles (`flux`, `rv`), a zero point per instrument, jitter on the velocities only | `jointModel.js` uses the same roles trick and `infer.js` reads its jitter rows | the groups column is the existing one |
| `js/inference/rvMonteCarlo.js`: a planet's mass by Monte Carlo with its own percentile helper | mass, radius and density with the star's covariance and provenance | `jointPlanet.js` propagates with the statistics kernel (`propagate`, `percentileInterval`, Prompt 154), which the caller injects so that the Worker-loaded model does not import it | rvMonteCarlo's percentile and the kernel's agree on a fixed array to 1e-12 (leg A9); the helper stays because rvMonteCarlo is on the Worker path of the existing tool and replacing it costs a lazy import there for no change of result, recorded as D-R10-227-04 |
| `js/inference/rvCircular.js` and `js/inference/binaryMasses.js`: a velocity amplitude to a mass for a circular orbit or a binary | the full relation for a planet (the sum of the masses, e), sin i from the transit, and the minimum-mass-only rule with no transit | `jointPlanet.js` | none: those fit different objects and stay |
| `js/inference/transitDelta.js` `constraintKB` (Prompt 225) | the same "not constrained" rule on the radius, density and inclination | `jointModel.identify` | the rule is reused; one extension (AM4, below) |

## The model

One table, several data sets. `settings.roles` says what each group of rows is: `flux` (the light curve,
relative flux) or `rv` (a velocity series in m/s, one instrument, with its own zero point solved exactly).
One orbit serves both: the period P, the epoch of inferior conjunction t0 (the transit time, which is
rv.js's `tc`), and sqrt(e) cos w, sqrt(e) sin w of the planet. The light curve is the circular-orbit
model of Prompt 225 with the first-order scaling of the duration for an eccentric orbit (Winn 2010): the
circular-equivalent a/R* is the true ratio times (1 + e sin w) / sqrt(1 - e^2), and the impact
parameter b is held at conjunction. Jitter, the scatter an instrument's error bars leave out, adds in
quadrature to the velocities' errors only; it is found by a golden-section search on the -2 ln L, not fitted by the
least squares.

**Mass.** Mp sin i is the root in Mp of
K = (2 pi G / P)^(1/3) Mp sin i / ((Ms + Mp)^(2/3) sqrt(1 - e^2)), the sum of the masses and not
the small-mass approximation. Masses are ratios of the IAU 2015 nominal GMs, so G cancels and Mp
in Jupiter masses needs GM only. The mass is Mp sin i divided by sin i with sin i from the transit
(sin i = sqrt(1 - (b (1 + e sin w) / (a/R* (1 - e^2)))^2)). Without a transit it is the **minimum mass** and is
called that.

**Radius** Rp = k Rs (R_sun / R_Jup = 695700 / 71492). **Density** rho_p = Mp / (4 pi Rp^3 / 3), the one place
G = 6.6743e-11 enters.

**The star.** The stellar mass and radius are inputs, never fitted, each with a value, a standard uncertainty,
a source, and one correlation between them. The linearized planet quantities carry the fit's covariance
(the kernel's `fitOnce` Jacobian) and the star's through `externalVariance`; each result prints the fit's
sigma, the star's sigma, and the star's share of the variance. A planet quantity is **not reported** when
the star's uncertainty it needs was not stated: the refusals are `noTransit`, `noVelocities`,
`stellarMassMissing`, `stellarRadiusMissing`, `stellarUncertaintyMissing`, each named for the quantity
refused. The star's mean density from the transit (a/R* and P) is reported beside its density from the stated
mass and radius, and a disagreement of more than 3 sigma is flagged; the planet's density is then only as good
as that star.

**Warnings.** `jitterAtBound` (the jitter search ended at its bound), `jitterExceedsErrors` (the jitter is larger than
the median velocity error), `stellarDensityTension`. **Not constrained**: b and k in the grazing valley
(Prompt 225's rule), extended by AM4 (below) to a fit that rests with b on a bound.

## Candidates and the synthetic system

Everything student-facing runs on a **synthetic** system and says so: the oracle's S1, a hot Jupiter
(P = 3.5247 d) of 0.70 Jupiter masses and a radius ratio of 0.12 around a 1.10 solar-mass, 1.15 solar-radius star, with a
light curve of four transits and thirty velocities from two instruments (3.0 m/s errors, jitter 2.0 m/s), seeded.
The panel does not refit; it holds the stored joint fit and its covariance (`js/jointField.js`, STORED) and
re-derives the planet from them and the star the reader states, which is what changing the star changes.
Pinned numbers with the lesson's default star (mass 5 per cent, radius 3.5 per cent, correlation 0.5):
Mp 0.684 +/- 0.0245 Jupiter masses (the data alone 0.0089; the star holds 87 per cent of the variance),
Rp 1.325 +/- 0.0645 Jupiter radii (share 52 per cent), rho_p 0.365 +/- 0.0501 g/cm3 (the data alone 0.0369, share 46
per cent). With both stellar uncertainties at 8 per cent the density is +/- 0.0878 with the star holding 82 per
cent. A star stated at 1.60 solar radii is 3.2 sigma from the transit's density and gives rho_p = 0.135 g/cm3.

## What a bulk density does and does not say

A density below 1.8 g/cm3 is called volatile-rich, 1.8 to 3 rock and ice, above 3 rocky: a convention on the number
(`compositionClass`, Prompt 203). It cannot tell hydrogen and helium from water ice, and a large planet's density is lower
than its material's would be in a small one because of its own weight. **No composition curve is drawn**: none was
supplied and none is typed from memory. The mass-radius diagram carries only lines of constant density, labelled
as that, and the Solar System's planets from the Prompt 203 table.

## Domain, assumptions and limits

One planet on a Keplerian orbit; white noise plus a stated jitter on the velocities (no red noise, no stellar activity
model, no second planet); a quadratic limb-darkening law fitted by the light curve; the transit's eccentric duration
to first order (leg A6 states its accuracy); the stellar inputs are independent of the data and are never updated by
them (the transit's own density is a check, not a prior); the star's mass and radius are stated with a single
correlation; for the circular cases e is held at zero (AM1), because sqrt(e) cos w and sqrt(e) sin w are singular at the origin.
Not built: a stellar model fit, asteroseismic radii or masses as inputs (Prompt 221 produces such numbers; this model
accepts a stated value with a source, not a pipeline), a second planet, a Gaussian process for activity, composition
curves, an informative prior on b or e.

## Results

`npm run joint-inference:validate` runs every leg (the ensemble takes about 12 minutes on three workers; `--only=A,B,R,D` takes
under a minute); `-- --write-results --write-failed` rewrites `tests/fixtures/joint-inference/results.json` and
`failed-legs.json`.

29 legs pass, **two cross their bound and stay failing and labelled** (D6, C4), and one is **not run** (E1). Counting
D6b, the same system judged under the rule AM4 extended, as its own row, there are 32 rows. The ensemble rates, the pinned
run and the four amendments are in those files; `tests/jointInference.test.js` holds them.

| Leg | Result |
| --- | --- |
| A1 mass from K | worst relative difference from the oracle's root find 3.7e-12 over 12 cases (bound 1e-9) |
| A2, A3 anchors | Jupiter around the Sun gives K = 12.46 m/s (bounds 12.2 to 12.7) and one Jupiter mass back; the Earth gives 0.0895 m/s (0.088 to 0.092) |
| A4 density | 1 Jupiter mass in 1 equatorial Jupiter radius: 1.2401 g/cm3, within 2.4e-12 of the oracle |
| A5 orbit | rv.js against a three-dimensional two-body orbit: worst 1.4e-8 of K (bound 5e-4), the star receding after the transit |
| A6 eccentric duration | the first-order mapping against batman's exact eccentric light curve: worst 0.18 percent (bound 2) at e = 0.2, w = 90 |
| A7, A8, A9 propagation | closed forms and quadrature to machine precision; Monte Carlo against the linearized sigma 1.0, 0.2 and 0.9 percent for mass, radius, density (bounds 5, 5, 8); rvMonteCarlo's percentile and the kernel's identical (difference 0) |
| B1 S1 against the oracle | worst parameter difference 0.067 sigma (bound 0.5), sigma ratios 0.91 to 1.00 (0.8 to 1.25) |
| B2 S1 planet | mass, radius, density within 0.004, 0.13 and 0.41 percent of the oracle's, sigmas within 0.5, 2.5 and 3.4 percent of its Monte Carlo |
| B3, B4 S2 eccentric | worst 0.41 sigma (bound 1.0); derived values within 0.16 percent (bound 3) |
| B5 jitter | 2.33 against the oracle's 2.338 m/s |
| C1 mass coverage | 61 percent of 100 replicates (band 58 to 79); with the star left out 23 percent |
| C2, C3 radius, density coverage | 78 and 79 percent (band 58 to 79, nominal 68) |
| **C4 omission control** | **FAIL: leaving the star out holds the truth 63 percent (radius) and 67 percent (density) of the time, against a committed bound of 55 or less** |
| C5 amplitude coverage | 62 percent |
| C6 stellar-density flag | raised on 0 of 100 replicates whose star is consistent (bound 5 percent) |
| D1 no transit | minimum mass only (0.702 +/- 0.022), Mp, Rp, rho_p, inclination refused by name |
| D2, D7 jitter | a jitter of 40 m/s is found at the search's bound of 20 and flagged; a jitter of 15 m/s from unmodeled signal is flagged |
| D3, D4 star missing | no Mp without the star's mass, no Rp without its radius, no planet quantity at all without a stated uncertainty |
| D5 star that does not fit | a stated star 4.0 sigma from the transit's density is flagged |
| **D6 grazing system, rule as committed** | **FAIL: the best fit is a small planet (k 0.051) on a central transit, chi-square 18 lower than the truth, and the rule flags nothing (AM4)** |
| D6b the same, AM4's rule | passes: radius, density and inclination flagged, mass not |
| R1 to R3 recovery | all parameters within 1.1 sigma of the truth (bound 4); S3, a Neptune-mass planet, recovered at 0.8 sigma with a sigma of 11 percent of its value; S2's eccentricity within 1.5 sigma |
| E1 authentic | **NOT RUN**: no public radial-velocity series for a transiting planet was supplied (see Data not supplied) |


## Validation contract

`tests/fixtures/joint-inference/thresholds.json` fixed every definition, every default and every
bound of the legs above, the systems, the stellar uncertainties (mass 4.5 per cent and radius 3.5 per cent in the ensemble, correlation
0.5), the ensemble size (100) and the sampling, before `js/inference/jointPlanet.js`, the model, the validator, any panel
or lesson existed. The independent oracle (`tools/joint-inference-oracle/oracle.py`: numpy, scipy, batman, no
Gravitas code; its own light curves, its own joint least squares, its own Monte Carlo) ran before any Gravitas joint code existed, and its
output is pinned in `tests/fixtures/joint-inference/oracle-results.json`. A crossed bound is a failed leg, kept
failing in `failed-legs.json`; only Carl resets a bound. Amendments are appended to the file's `amendments` list with their reason.

| Amendment | When | What | Bound moved |
| --- | --- | --- | --- |
| AM1 | after the oracle ran, before any joint code | e held at 0 in the circular systems; the oracle's sigma is the half-width of the 15.9 to 84.1 percentile interval | no |
| AM2 | before any joint code | D6 named the wrong quantity: the grazing valley opens the radius and the density, not the mass | no (the quantity named) |
| AM3 | before any result on S3 | R2's floor on the mass's relative sigma was an arithmetic slip (20 per cent asked of a 14 per cent signal), now 10 | yes, before any result on S3 |
| AM4 | after D6 failed | the not-constrained rule reads a fit resting on a bound as not constrained (D6b re-judges the same system under it); D6 stays failing | no; the rule was extended after the result and D6 is kept as failed |

**The legs that failed and stay failing.** D6 (the grazing system's best fit is a small planet on a central transit
whose chi-square is 18 lower than the truth's, so Prompt 225's rule flags nothing: diagnosis in AM4; D6b with the extended rule
passes) and C4 (leaving the star out was to leave radius and density intervals visibly too narrow, below 55
per cent at one sigma; the measured rates are 63 and 67 per cent. The omission is large for the mass, 23 against 61 per cent, and
modest for the radius and the density at these stellar uncertainties. The bound is not reset.) The with-star
radius and density rates, 78 and 79 per cent, sit at the top of their committed band (58 to 79 per cent) against the nominal 68:
the intervals that carry the star are slightly conservative here.

## Data not supplied

- **E1, the authentic leg, is NOT RUN.** It needed a public radial-velocity series for a transiting planet with a
  light curve; none was supplied (the coordinator could not locate one by a verified identifier, and VizieR is not
  reachable from this machine). What was supplied is the NASA Exoplanet Archive's composite values for HD 209458 b
  (mass 0.73 +/- 0.04 Jupiter masses, radius 1.39 +/- 0.02 Jupiter radii, stellar mass 1.23 +/- 0.09, stellar radius
  1.19 +/- 0.02 solar; file sha256 025af94a26a66563a9d233ed73eb936397e5ea119925b68bafd04a0fd3c2002f); a table of values is a
  comparison target, not a series, and no fit is claimed against it. The reference paper of those values is not recorded and
  the archive's terms page was not read, the same gap as the rights row of Prompt 225.
- **Composition curves** (the models a mass-radius diagram usually draws) were not supplied; none is drawn.
- No value in this document or in the code was written from memory: every number is computed by the code or read
  from a file named here.

## References

Winn 2010, "Transits and Occultations" (the eccentric duration scaling, and the argument of periastron of the planet that batman and rv.js share); Kreidberg 2015, PASP 127, 1161 (batman, the oracle's light curves); IAU 2015 Resolution B3 (the nominal GMs); the statistics kernel of Prompt 154 (`propagate`, `percentileInterval`). No reference was typed from memory beyond these four, each already cited in the code of this repository.
