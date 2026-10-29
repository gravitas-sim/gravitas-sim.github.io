# The spectrograph model and wavelength calibration

Roadmap III, Prompt 213 (tranche T3, D-R10-207-01). Branch `feat/spectrograph`. The kernel is `js/kernels/spectrograph/`; the
adapter is `js/instruments/spectrograph.js`; the investigation is "Why Two Lines Become One"; the instrument is the
`spectrograph` panel family (`spectrograph-arc`, `spectrograph-lines`, `spectrograph-trade`). The validation contract below was
committed (with `tests/fixtures/spectrograph/thresholds.json`) before any kernel, oracle, panel or lesson existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/measure/spectrumLine.js` (a straight continuum, the equivalent width and the depth-weighted centre of one line, with a velocity from a rest wavelength) | a line fit that knows the instrument: a pixel-integrated Gaussian with the line-spread function's width, its covariance, the resolving power recovered from the width, a broadened (blended) flag | the panel and the coverage ensemble | none: the moment measurement stays the Observatory's, this is the instrument-aware fit |
| `js/inference/fit.js` (`createProblem`, `refine`, `covarianceAt`) | a model for the Gaussian line on a linear continuum | the line fit | none: the line fit is a model of the existing machinery, not a new optimizer |
| `js/numeric/polyfit.js` (Prompt 152, weighted Householder QR with covariance) | the wavelength solution's states: constrained, exactly determined, not constrained, with residuals, an uncertainty at every pixel and an extrapolation flag | the solution | none |
| `js/kernels/radiation/` (`planckLambda`, `doppler.js`, `lines.js`; the line pack's air and vacuum columns, Prompt 125) | a spectrum as an instrument makes it (pixel-integrated, noisy, at a chosen resolving power); a velocity with the media rule and its uncertainty | the forward model, the velocity | none |
| `js/random/streams.js` (Prompt 149) | nothing: the noise is a named `noise` stream | the noisy exposure | none |
| `js/instruments/` (Prompt 209) | nothing: the library holds no spectrograph and nothing is typed from memory; the panel takes a facility's telescope aperture and site seeing where the library states them and says where each number came from | the panel | none |

## The quantities, kept apart

* **Resolving power** `R = lambda / FWHM`, FWHM the width of the line-spread function at half maximum, in the same units as
  lambda. A property of the instrument at a wavelength. The reference instrument has a constant FWHM, so R changes with
  wavelength (`R(lambda) = lambda / FWHM`); the panel states R at the reference wavelength.
* **Dispersion** `d lambda / d x`, nm per pixel, the derivative of the wavelength solution. A property of the grating, the
  camera and the detector, never of the line-spread function.
* **Sampling** the FWHM in pixels, `FWHM / (d lambda / d x)`. The criterion is at least 2 pixels per FWHM. Sampling is not
  resolving power: finer pixels sample the line-spread function better and cannot separate two lines it has merged.
* **Resolution element** one FWHM of wavelength; the number of independent measurements across a spectrum is its span over the
  FWHM, not the number of pixels.
* **A measured line width** is the quadrature sum of the instrument's and the line's own width; for an arc line (intrinsically
  unresolved) it is the instrument's, which is how R is recovered.
* **A wavelength is in a medium**: air (standard air, 15 C, 101325 Pa, dry) or vacuum. The line pack carries both columns
  (NIST, Prompt 125's correction); a solution carries the medium of the wavelengths it was fitted to and so does a velocity.

## Equations, limits, assumptions

Wavelengths are nm. Pixel `i` has its centre at `x = i` and spans `x - 1/2` to `x + 1/2`.

1. **The line-spread function** is a Gaussian of `sigma = FWHM / (2 sqrt(2 ln 2))`, `2 sqrt(2 ln 2) = 2.35482`. Assumption: the
   same width everywhere on the detector (a slit-limited grating spectrograph); a constant-R instrument, a Voigt wing and a
   position-dependent width are not built.
2. **A pixel's value** is the average over the pixel of the template convolved with the line-spread function (counts per pixel
   are the electron counts the pixel holds). A Gaussian line of total flux `F`, centre `mu` and intrinsic sigma `s_int` gives
   `F [Phi((b - mu) / s) - Phi((a - mu) / s)]` over the pixel `[a, b]`, `s = sqrt(s_int^2 + s_l^2)`; the areas are computed with
   `erf` and `erfc` (not sampled at the centre), so flux is conserved at any sampling. The smooth continuum is integrated over the
   pixel by a fixed Gauss-Legendre rule and is not smoothed by the line-spread function (B1 bounds the neglect at 1e-4 of the
   continuum for the resolving powers tested). The kernel is used for absorption (a depth) and emission (a flux).
3. **Noise**: photon noise and read noise, `sigma_i^2 = N_i + RN^2` with `N_i` the expected electrons (the variance array a
   pipeline would carry), drawn Gaussian from the `noise` stream. Gaussian is an approximation of Poisson that holds above
   about 20 electrons per pixel; a line fit with fewer says so.
4. **The line fit** is a weighted least-squares fit (js/inference/fit.js, Levenberg-Marquardt) of `c0 + c1 (x - x0) + A g(x)`
   where `g` is the pixel-integrated Gaussian of centre and width fitted; centre, width, amplitude and the two continuum terms
   are free; the covariance is `(J^T W J)^-1`. A reduced chi-square above the 0.99 quantile scales the uncertainties and says so.
   **Broadened**: an arc line whose width exceeds the instrument's by more than 3 sigma and by more than 10 percent is flagged;
   it is the signature of an unresolved blend, and it is a flag and not a proof (a line can be intrinsically wide).
5. **The wavelength solution** is a polynomial `lambda(x)` of degree 1 to 5 fitted by `polyfit` (Prompt 152) to the marked lines'
   pixel centres and wavelengths. The line errors in nm are the fit's pixel errors times the local dispersion (an effective
   variance, from a first unweighted pass). States: **not constrained** (fewer lines than the degree plus one: no
   coefficients), **exactly determined** (degree plus one lines: the coefficients and the uncertainty from the line errors, no
   residual check, said so), **constrained** (at least degree plus two lines). The uncertainty at a pixel is
   `v^T C v` with the coefficient covariance `C`; outside the span of the marked lines it is flagged as an extrapolation.
6. **A velocity** `v = c (lambda_obs / lambda_rest - 1)` (relativistic form `c (r^2 - 1) / (r^2 + 1)`, `r = lambda_obs /
   lambda_rest`), with `sigma_v = c sigma_obs / lambda_rest` to first order; both wavelengths are in a stated medium and a
   mismatch is refused. A rest wavelength in air against an observed one in vacuum is 82.8 km/s off at H-alpha.
7. **Throughput and the trade.** For a long slit of width `w` and Gaussian seeing of FWHM `theta`, the fraction of light through
   the slit is `erf(w / (2 sqrt 2 sigma_seeing))`. For a fixed grating, camera and detector the resolving power is inversely
   proportional to the slit width, `R w = R_s theta`, with `R_s` the resolving power at which the slit equals the seeing; the
   throughput is then `erf(sqrt(ln 2) R_s / R)`. The signal-to-noise of an absorption line of equivalent width `EW` in a
   continuum of `S_c` electrons per nm is `EW / sigma_EW`, `sigma_EW = sqrt(2 sqrt(pi) sigma_obs / S_c)` for a matched filter
   with no read noise (the kernel uses the discrete sum). Assumptions: no guiding error, no diffraction in the slit, a slit
   long enough to hold the seeing disk along its length, sky noise ignored.

## The reference instrument, the arc and the science exposure (teaching values, synthetic, with their truth)

The thresholds file states them: 2048 pixels, `lambda(x) = 380 + 0.105 x - 1e-7 x^2 + 4e-12 x^3` nm, a line-spread FWHM of
0.30 nm (R = 1500 at 450 nm, 2.86 pixels per FWHM), 5 electrons of read noise; the lamp is the 23 lines of the NIST-derived line
pack (the lamp is synthetic: the wavelengths are the pack's and the intensities are invented); the science exposure is a 6000 K
blackbody with four Balmer absorption lines redshifted by 120 km/s. None is a real facility.

## Validation contract

`tests/fixtures/spectrograph/thresholds.json` holds the bounds (groups a to f, check ids below). Committed first; a crossed
bound is a failed leg kept failing in `tests/fixtures/spectrograph/failed-legs.json`; only Carl resets one.

| Group | Checks |
|---|---|
| a analytic | A1 line-spread conversions, A2 the pixel integral, A3 sampling and its criterion, A4 flux conservation, A5 absorption lines through the instrument, A6 the continuum integral, A7 Doppler and the media rule, A8 noise-free recovery of lines and of R |
| b oracle | B1 numerical convolution (numpy, scipy), B2 the line fit (scipy curve_fit, astropy), B3 the solution (numpy lstsq, astropy Chebyshev1D), B4 the whole chain |
| c coverage | C1 line centres, C2 the solution, C3 velocities, C4 recovered R, C5 a mis-specified solution is flagged |
| d refusals | D1 not constrained, D2 blends, D3 undersampled lines |
| e authentic | E1 SDSS A and G star Balmer velocities against the pipeline's, E2 SDSS sampling |
| f trade | F1 line signal-to-noise, F2 slit throughput, F3 the resolving-power trade |
| p speed | P1 |

The oracle is independent code in Python (numpy 1.26.4, scipy 1.13.1, astropy 6.0.1); `specutils`, `specreduce`, `PypeIt` and
`rascal` are not installed on this machine and none was downloaded, so the "cited reduction routine" for the solution is
`astropy.modeling.fitting.LinearLSQFitter` with `Chebyshev1D`, the fitter those packages call for a dispersion function, and
numpy's least squares; this is stated as what it is, not as an end-to-end comparison with a spectroscopy package.

## Claims this prompt may and may not make

Evidence classes (7.5.10): the model is S (software works) and V-internal (analytic, oracle, ensemble, E1 authentic velocities);
nothing here is V-external beyond E1, A (adopted) or L (learning measured). The panel and the lesson do not claim the
reference instrument is a real facility. The air and vacuum conventions follow the line pack (NIST), as corrected by Prompt 125.
