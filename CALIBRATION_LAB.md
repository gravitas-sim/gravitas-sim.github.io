# The calibration lab (Roadmap II, Prompt 86)

A CCD frame is the light plus what the detector adds to it. `js/kernels/detector/` is a pure kernel (no DOM) that makes such frames from a seed, reduces them, and says how uncertain the result is. Everything it makes is **synthetic** and says so; no authentic frames ship (see Rights).

## The forward model (`frame.js`)

A frame is a pure function of its spec (seed, detector, scene, exposure). Electrons per pixel are Poisson(flat x light + dark x t), plus cosmic rays, clipped at the full well, plus Gaussian read noise; counts are bias + electrons / gain, rounded and clipped at the converter's maximum. The fixed pattern (flat-field map with vignetting, pixel scatter and dust; dark map with hot pixels; bias column pattern) is keyed by the seed alone, so a calibration set (bias, dark, flat frames) and the science frames share it. `simulateSeries` makes a time series with a variable star and a common transparency that wanders. Every parameter is a field of `DEFAULT_DETECTOR`.

`js/forward/models/ccd.js` wraps it as the forward model `ccd`: a `gravitas.observation` of kind image, origin synthetic, with a truth manifest (gain, read noise, bias, dark rate, sky, each source's position and rate, cosmic rays, saturated pixels) and the flat and dark maps as per-row truth. `runCalibrationSet` gives the set as observations.

Left out, stated: blooming, charge-transfer loss, nonlinearity, color terms, a non-Gaussian PSF. Poisson draws above 30 electrons use a Gaussian of the same mean and variance.

## The reduction nodes (`reduce.js`, `pipeline.js`)

`masterBias`, `masterDark`, `masterFlat`, `gainFromPairs` (photon-transfer pair method), `calibrate` (bias subtraction, dark scaling and subtraction, flat division), `maskCosmicRays`, `estimateBackground`, `aperturePhotometry` (CCD equation error), `differentialMagnitude`, `reduceFrame`, `reduceSeries`, and a sinusoid fit (`lightcurve.js`). Each returns a record in the shape of the measurement pipeline's nodes: tool, version, parameters, quantities each marked measured, derived or assumed, warnings, and how uncertainty is treated. The records are not yet registered as `TOOLS` of `js/measure/pipeline.js`: that file is on the Observatory route, whose ceiling is not raised for a tool no page calls (see Not done).

## The exposure-time calculator (`snr.js`, `bands.js`)

The CCD equation (Merline and Howell 1995; Howell, Handbook of CCD Astronomy) and its exact quadratic inverse for the exposure; the photon rate of a star from the radiation kernel's V band for a stated 0.4 m telescope (`lab.js`: area, throughput 0.55 assumed, zero point 5.606e8 electrons per second at V = 0).

## Validation (`tests/calibrationKernel.test.js`)

Tolerances were fixed by the method, not the result. Recovered stated parameters (bias level, read noise, gain by the pair method, dark rate) over 20 to 40 seeds within 2 to 5 percent; the star's electrons conserved; saturation at the full well and at the converter's maximum; cosmic-ray recall above 95 percent off the stars and no false flags on 40 clean frames. Aperture photometry over 120 seeds: pull mean within 4.5 standard errors of zero and pull standard deviation within 4.5 standard errors of 1, i.e. the CCD equation (with the masters' own noise) is the scatter. Calibration algebra on textbook arrays. Differential photometry over 8 nights: the check star's scatter is the propagated error within 15 percent, the star alone is at least five times noisier, the fitted amplitude is within 4.5 sigma of the truth every night. The calculator's three limits are closed forms; the V = 0 photon flux is within 3 percent of the published 1005 photons per second per cm2 per angstrom (Bessell 1979; Bessell, Castelli and Plez 1998; the kernel gives 1017). This is one published number; no published exposure-time table for a named instrument was available offline to compare against.

Known limitation found: a cosmic ray that lands on a star's core can escape the single-frame mask (the test excludes pixels within 7 of a star). A series should use several frames.

## Instruments (`js/detectorWidgets.js`)

File `js/detectorWidgets.js` (family `detector`, registered in `js/widgets.js` as a lazy family, the file named `*Widgets.js` as the lazy-widget manifest requires): `ccd-frames` (bias, dark, flat, raw, and each calibration step, with photometry of four stars against the truth), `ccd-snr` (the CCD equation, dominant term, exposure for a target, limiting magnitude) and `diff-photometry` (forty frames, raw and differential light curves, the check star, the fit, an optional truth manifest). The readout under each picture is its table alternative.

## Rights

D-CALIB-01: no authentic calibration or science frames ship. No public teaching set with an explicit, confirmed licence was identified in this run, so the stop condition applies: synthetic only, labelled.

## Investigations

What a CCD Records, Signal, Noise and Exposure, and A Variable Star From Frames (`js/data/investigations/`), each in English, Spanish and quantitative and advanced depth (the advanced steps compare with the truth manifest of the synthetic set), with instructor content, acceptance entries and `tests/calibrationLessons.test.js`, which recomputes every number a lesson states from the kernel. They are in the observing-and-measuring sequence.

## Frames to a light curve (Prompt 185)

The reduction nodes are now `TOOLS` of the measurement pipeline for a whole sequence (`frames-calibrate` to `frames-lightcurve`, lazy), run over the lab's own calibration and photometry by `js/measure/frameSeries.js` and shown in the Observatory's frame panel; `FRAME_PIPELINE.md` has the algorithm, the limits, the oracle and the validation. The lab's calibration physics is unchanged.

## Not done

Wiring the instruments into the Observatory menu; authentic frames (D-CALIB-01).
