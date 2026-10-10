# The forward-model loop (Roadmap II, Prompt 84)

A model produces what an instrument would record. `js/forward/` makes that one contract: a model state and a `gravitas.observing-setup/1` go in; a `gravitas.observation/1` with origin `synthetic` and a truth manifest comes out. The Observatory, the inference core, the measurement pipeline and the analysis lab read it like any other observation.

## The setup

`sdk/schemas/observing-setup-1.schema.json`; `js/forward/setup.js` (`validateSetup`, `readSetup`) is the authority. Epochs (regular, irregular, clustered, listed, with gaps), exposure, noise (white with a stated sigma; optional red noise and outliers), systematics (offset, trend), an instrument descriptor and a seed. Every random draw is keyed by the seed and the epoch's index, so a gap never changes the noise of the epochs that remain. The stated uncertainty is the white sigma only; red noise and outliers are unstated, as at a telescope, and the truth manifest records them. Regular and listed setups run to 100,000 epochs; irregular and clustered setups keep the radial-velocity planner's 400.

Older formats read in through `readVersioned`: the radial-velocity panel's survey configuration (`setupFromSurveyConfig`, same epochs, same noise to the last digit) and an experiment manifest's observables (`setupFromExperiment`).

## The models (`js/forward/models/`)

| Model | Reads | Validated against (tolerance, why) |
|---|---|---|
| transit | star, planets, observer geometry | the inference core's own `transitFlux`, exact; uniform-disk depth k^2 (2e-4, 96-annulus quadrature) |
| radial-velocity | the same, via `js/observerGeometry.js` | half range = K and the closed form from the masses (1e-5 / 1e-9); `rvCurve` to 1e-9 m/s at e = 0 and 0.3 |
| astrometry | the same | face-on circle of the reflex radius (1e-9); edge-on line (1e-9) |
| periodic | Fourier series or circular eclipsing binary | series exact (1e-12); total secondary and annular primary depths in closed form (1e-12) |
| spectrum | blackbody, lines (equivalent width, width), velocity, resolving power | each line's area (1e-3) and centroid (0.1 pixel) |
| catalogue | `synthesisePopulation`, decoded bands | distance modulus (1e-9 mag); colour independent of distance (1e-9) |
| image | point sources, Gaussian PSF, TAN WCS | total counts (1e-6), centroid (1e-4 pixel) |

Noise statistics over 200 seeds of 100 points: white mean and standard deviation, chi-square per point, red lag-1 correlation exp(-dt/tau), outlier fraction and sign balance, each within 4.5 standard errors fixed before the run (tests/observingSetup.test.js). A noise-free setup returns the model exactly.

## Limits

Circular orbits only for the transit model (an eccentric planet is refused). Planets' reflex motions add; they do not interact. Eclipsing binaries are uniform disks. Spectrum lines are Gaussians, sampled at pixel centres, and the flux is continuum-relative. Catalogue stars are blackbodies without extinction or binaries. Images have no cosmic rays, saturation or flat-field structure. `elementsFromBodies` reads a counter-clockwise two-body state into elements; the caller supplies the time unit.

## Lessons declare a setup

A lesson step's answer may be a measurement of a forward-modelled system. The declaration (model state, setup, forward model, the truth parameter, how the student measures) is in `tools/authoring/forwardSources.mjs`, not on the step, so no route pays for it. `modelChecked.mjs` turns each declaration into a MODELS entry whose value is the truth manifest's, so `tests/modelCheckedExpectations.test.js` proves the literal; `author:check` (rule `instructor/forward-source`) refuses a declaration whose setup is invalid, whose model or truth id is unknown, or whose measurement misses the truth. The first use is "From a depth to a size" in Transit Photometry. `gradeAgainstTruth` (js/forward) grades an answer against a manifest at run time.

## Not done in this prompt

Opening synthetic observations from a menu in the Observatory (they open as files; the label and the compare-with-truth table appear in the page); wiring the radial-velocity panel's live run to the setup module (the migration and equivalence are tested; the panel's code path is unchanged).
