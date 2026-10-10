# The model-versus-data comparison instrument (Roadmap II, Prompt 85)

A model's prediction laid over an observation, with residuals, chi-square and a sentence about where the model misses. `js/compare/` is the arithmetic (pure, Node-importable); `js/observatory/comparePanel.js` is the Observatory panel ("Compare a model with the data", loaded when opened).

## Supported model sources

| Source | What it is | Evaluated through | Parameter kinds reported |
|---|---|---|---|
| `system` | a star and a planet: the exoplanet records (`hd209458`, `sun-jupiter`) or the Orbital System Builder's bodies (`stateFromBuilder`) | Prompt 84's forward models `transit` and `radial-velocity`, at the data's own epochs (a noise-free listed setup, matched back by offset) | elements assumed; the forward model's truth manifest derived |
| `inference` | a `gravitas.inference` result with a fit | the inference core's model at the data's epochs | fitted or fixed as the fit says; its sigma carried |
| `analytic` | a named model of `js/inference/models.js` (transit-quadratic, rv-keplerian, poly-1, poly-2, power-law) with stated values | the model's own `predict` | every value assumed unless the caller says otherwise |

Not supported yet: astrometry, periodic, spectrum, catalogue and image forward models; several planets' separate sliders (planet 0 only); an unlisted scenario by id (the two exoplanet records and Builder bodies are the system sources).

## What it never does

It never fits. Nothing is searched and no linear parameter (baseline flux, velocity zero point) is solved for: each is a stated value. A parameter is `fitted` only when an inference result says so. Degrees of freedom count only those; a slider the student moves is reported `moved` and stays `assumed`.

## The objective

The one the inference core fits: chi-square with the stated uncertainties, or the sum of squared residuals in the data's unit when there are none. `m2lnL` is -2 ln L for independent Gaussian errors. Residual is data minus model, so a negative regional mean means the model is above the data; a region is flagged when its mean differs from zero by more than two standard errors.

## Parameter linkage

`js/compare/system.js` `ELEMENTS` binds each slider to one element and `withElement` returns a new state (the input is never modified). The Builder's semi-major axis `aAU` and the period are one number (Kepler III with both masses); the integrator's mass units differ from the SI masses by 3.2e-4 in the Earth-to-Sun ratio, so the two periods agree to 1.5e-7 for a 300 Earth-mass planet (tested).

## Evidence

`comparisonArtifact` makes a `gravitas.artifact/1` (source kind `comparison`, added to the schema and SDK types): the digest of the rows, the observation's id, the model's identity, every parameter with its kind, the objective and the residual summary. The panel keeps it in the notebook (source `comparison`).

## Accessibility

Residuals table (first 200 rows), a text summary of the overlay, native range inputs for keyboard adjustment, a polite status line.

## Not done in this prompt

The lesson `compare` step type and the widget family that docks the instrument in lessons, and the use of it by the exoplanet guides and the depth-advanced steps; the dist-coverage test. The core and the envelope are what those need.
