# Telescopes and resolution over the existing PSF

Roadmap III, Prompt 208 (tranche T3, D-R10-207-01). Branch `feat/telescopes`. The kernel is `js/kernels/detector/optics.js`; the
investigation is "What a Telescope Resolves"; the instrument is the `telescope` panel in the detector family. The validation
contract below was committed (with `tests/fixtures/telescopes/thresholds.json`) before any kernel, oracle, panel or lesson existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/kernels/detector/frame.js` renders stars with a Gaussian of one FWHM; `lab.js` has the 0.4 m, 30 percent obstructed teaching telescope, its zero point and `rateFromMagnitude`; `snr.js` has `collectingArea` | an Airy pattern for an aperture, wavelength and obstruction; a Moffat seeing profile; their combination; plate scale from focal length; light-gathering power; the Rayleigh separation as a different number from the measured FWHM | the `telescope` panel and "What a Telescope Resolves"; Prompts 209, 210, 230 and 228 (as optional enrichments) read the same functions | none removed; the telescope's zero point, area and sky read `lab.js` and `snr.js`, never a second copy |
| `js/measure/detect.js` (Prompt 183): detection, the Gaussian or Moffat fit of a star, FWHM with its covariance, `modelLimited`, `widthAgreement` | nothing: it is the measuring instrument, unchanged | the panel and the coverage ensemble | none |

`frame.js` gains one optional field, `spec.psf`: a radial profile table. With it absent the frame is the version before this
prompt, bit for bit (check F1).

## The quantities, kept apart

* **Rayleigh separation** (`rayleighAngle`): the angular radius of the first dark ring of the diffraction pattern of the
  aperture, `x1 lambda / (pi D)` with `x1 = 3.8317` for a clear circular aperture (1.2197 lambda / D). It is a criterion for the
  pattern of an ideal telescope with no atmosphere. It is computed, never measured.
* **The measured FWHM** (`measurePsf` of Prompt 183): the full width at half maximum of the model a fit assigns to the stars in
  a frame. It includes the seeing, the pixel scale and the fit's own model. For a pure Airy pattern the FWHM is
  1.0290 lambda / D, so the two numbers differ by 18.5 percent even with no atmosphere (check A7).
* **The Dawes and Sparrow limits** are not used. The pair "dip" (`pairDip`) is the summed profile's midpoint relative to its
  peak; at the Rayleigh separation of two unobstructed Airy patterns it is 0.7350, a 26.5 percent dip (Born and Wolf).
* The FWHM is never called the resolution limit (the claim rule in the thresholds file holds the bilingual patterns).

## Equations, limits, assumptions

Angles are radians in the kernel and arcsec at its edges (`ARCSEC_PER_RAD = 206264.80624709636`). `x = pi D theta / lambda`.

1. **Airy pattern with a central obstruction** `e = d / D` (obstruction diameter over aperture, 0 to below 1):
   `I(x) = [2 J1(x)/x - e^2 2 J1(e x)/(e x)]^2 / (1 - e^2)^2`, peak 1 (Born and Wolf section 8.6). Zeros of `J1(x) - e J1(e x)`.
   Encircled energy: `1 - J0^2 - J1^2` for `e = 0`, otherwise the integral of `I` (composite Gauss-Legendre).
2. **Moffat seeing** (Moffat 1969): `M(r) = (beta - 1)/(pi alpha^2) (1 + r^2/alpha^2)^-beta`, FWHM `2 alpha sqrt(2^(1/beta) - 1)`,
   encircled energy `1 - (1 + r^2/alpha^2)^(1 - beta)`; `beta = 4.765` is the default (Trujillo et al. 2001 fit of atmospheric
   turbulence), a stated teaching value.
3. **The combination** is the convolution of the two radial profiles, computed as the product of their transfer functions and an
   inverse Hankel transform: the Airy transfer function is the autocorrelation of the (annular) pupil (circle overlap areas); the
   Moffat transfer function is `2 / Gamma(beta - 1) (k alpha / 2)^(beta - 1) K_(beta - 1)(k alpha)`, `K` by its integral
   `int exp(-z cosh t) cosh(nu t) dt` (trapezoid). The product is band-limited at `D / lambda`, so the Hankel integral is on a
   finite interval (composite Gauss-Legendre between the transfer function's kinks).
4. **Light gathering**: `D^2 (1 - e^2)` relative to a reference (collecting-area ratio). **Plate scale**:
   `206264.806 arcsec / focal length`; the focal length is the focal ratio times the aperture.
5. **Photon rate** reads `lab.js` (`ZERO_POINT_V`, the area of its telescope, a throughput of 0.55): a V = m star gives
   `ZERO_POINT_V (A / A_lab) 10^(-0.4 m)` electrons per second; the sky is `rate(skyMag) x pixel solid angle`.

Assumptions: one wavelength (monochromatic), a clear circular aperture with a circular obstruction and no spider; an
atmosphere that is a Moffat blur of stated FWHM independent of wavelength and aperture (it is not: seeing scales as
`lambda^-0.2` and the pattern changes when `D` is comparable to the turbulence scale, and none of that is modelled); no
aberrations, no detector MTF, a box pixel. The seeing is an input, not a prediction for any site. Every frame is synthetic and
labelled so. **Physical domain**: aperture 0.02 to 10 m, obstruction 0 to 0.9 (the closed form holds up to, not including, 1; an
obstruction of 1 or more is refused), wavelength 300 to 2500 nm, seeing FWHM 0 to 5 arcsec with `beta` above 1.

## Validation contract (committed first)

Seeds: oracle 208; harness 2080001; ensemble prefix `telescope-208`. Bounds are in
`tests/fixtures/telescopes/thresholds.json`; this table is its summary and the file wins.

| Id | Leg | What is held |
|---|---|---|
| A1 to A9 | (a) analytic | dark rings and zeros; FWHM 1.028994 lambda/D; encircled energy 0.8378, 0.9099, 0.9376 at the dark rings; the obstructed formula against scipy and its first dark ring; Moffat normalisation, FWHM and encircled energy; the Rayleigh pair dip 0.7350; Rayleigh/FWHM 1.1853; light gathering and plate scale; the two limits of the combination |
| B1, B2 | (b) oracle | numpy FFT of a sampled annular pupil at two apertures (no Bessel function, no Gravitas code): the Airy profile to 5e-4 of the peak, the encircled energy to 1e-3; the same with a Moffat seeing profile formed by two-dimensional FFT convolution: the combined profile to 2e-3 and the FWHM to 2e-3 |
| C1 | (c) coverage | 200 seeded frames through Prompt 183's tool: the stated 1 sigma interval on the FWHM covers the kernel's combined-profile FWHM at a rate in [0.60, 0.76], mean relative bias at most 0.02 |
| C2 | (d) misspecified | diffraction-limited frames: the tool flags the Moffat model as limiting in at least 90 percent |
| D1 | (d) refusals | obstruction of 1 or more or below 0, non-positive aperture, wavelength, focal length, pixel; beta of 1 or less; negative seeing; no NaN for accepted inputs |
| F1 | frame | the supplied profile conserves light to 2e-3; with none supplied the frame is unchanged |
| P1 | speed | the combined profile builds in at most 400 ms |
| A1.authentic | (e) authentic data | NOT MEASURED (below) |

A crossed bound is a failed leg, left failing in `tests/fixtures/telescopes/failed-legs.json` and labelled; only Carl resets
one.

### Authentic-data request (not measured)

The applicability leg needs one real PSF measurement under a fixed analysis contract, for example the encircled-energy curve
and FWHM that a space telescope's instrument handbook publishes for its aperture, obstruction and a stated wavelength, or a
seeing-limited frame with a header-stated FWHM. Nothing was downloaded and nothing is typed from memory. The decision is Carl's
(the product, its version, its terms and the rights basis).

## Reproduce

`npm run telescopes:validate` prints the table; `tools/telescopes-oracle/oracle.py` produces the pinned fixture
(`tests/fixtures/telescopes/oracle-results.json`) from numpy and scipy outside the repository's code.
