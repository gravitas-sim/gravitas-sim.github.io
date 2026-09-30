# Provenance: what kind of number this is

Every result Gravitas produces can be written as a `gravitas.artifact/1` envelope. The authority is [`js/platform/artifact.js`](js/platform/artifact.js). The schema for outside authors is [`sdk/schemas/artifact-1.schema.json`](sdk/schemas/artifact-1.schema.json), and its type is in `sdk/types`.

An envelope says what made the result and from what. That is a source: its kind, id and version, and a content digest of the data it read. It also says what may be done with the result, and gives, for each quantity:
- a number, in a unit of [the registry](js/units/registry.js) named by its id (`null` when no one has stated the unit);
- an uncertainty that says what it is;
- an origin.

It is data. A report or an export renders it in the reader's locale when it is read.

Six vocabularies used to say "what kind of number this is" in six ways. This page maps each onto the envelope's two:
- `origin`: what the number is;
- `basis`: where its uncertainty comes from.

Each mapping comes with the rule for reversing it, so no older document loses what it said.

## The envelope's vocabulary

| `origin` | Meaning |
|---|---|
| `measured` | Read off data, by a person or a pipeline |
| `derived` | Computed from other quantities by a stated relation |
| `assumed` | Taken as given by the analysis, not determined by it |
| `fitted` | A free parameter a model was fitted for |
| `fixed` | A model parameter held at a stated value during a fit |
| `truth` | The value the simulation was built with |
| `analytic` | From a closed-form result |
| `synthetic` | Made by a forward model, not observed (reserved for Prompt 84) |

| Uncertainty `kind` | Carries |
|---|---|
| `sigma` | One standard deviation, `sigma` |
| `interval` | `lo` and `hi`, and `level`, the probability between them, where it is known |
| `none` | Nothing: the number has no uncertainty, or none was given, and the envelope says so rather than printing a zero |

| `basis` | Where the uncertainty comes from |
|---|---|
| `data` | The data's scatter or error bars |
| `model` | The model's own error, such as an integrator's |
| `assumed` | Stated, not estimated: where the data carry none |
| `scaled` | A data sigma rescaled, by the reduced chi-square or a correlated-noise factor |
| `profile` | A likelihood profile, as a Delta chi-square interval |

## The older vocabularies, and where they map

| Vocabulary | Where | Value | `origin` | Uncertainty and `basis` |
|---|---|---|---|---|
| Pipeline `KIND` | `js/measure/pipeline.js` | `measured`, `derived`, `assumed` | the same | `error` → `sigma`; `errorKind` `assumed` → `assumed`, otherwise `data` |
| Notebook `KIND` | `js/notebook/entry.js` | `measured`, `analytic`, `truth` | the same | `uncertainty` → `sigma`, `data` |
| Inference parameter `mode` | `js/inference/manifest.js`, `infer.js` | `fitted`, `fixed`, and `derived` on outputs | the same | `sigma` → `data` (`model` for an unweighted fit, whose sigma is the residual scatter); `sigmaScaled` and `sigmaRed` → `scaled`; the profile's Delta chi-square = 1 interval → `interval`, `profile`, level 0.68 |
| Data-pack `origin` | `tools/data-packs/schema.mjs` | `observed`, `model`, `compilation`, `synthetic` | `measured`, `analytic` (a model grid), `measured` (cited), and `synthetic`, which is refused as a pack | from the columns |
| Observation `origin` | `js/observatory/schema.js` | `observed`, `model`, `compilation`, `imported` | `measured`, `analytic`, `measured`, `measured` | an `uncertainty` column → `sigma`, `data`; a `lower` and `upper` pair → `interval` with its `level`; none stated → `none` |
| GWOSC evidence | `js/data/gw/gwoscEventsProvenance.js` | `observedStrain`, `measuredFromStrain`, `catalogValue`, `model`, `illustration` | `measured`, `derived`, `measured` (cited), `analytic`, `synthetic` | as given by GWOSC: its 90% intervals → `interval`, level 0.9 |
| Model-page badges | `model/index.html` | `is-simulated`, `is-analytic`, `is-approximate`, `is-illustrative`, `is-measured` | `truth`, `analytic`, `analytic` (basis `model`), `synthetic`, `measured` | (a page label, not a quantity) |
| Validation kinds | `js/validation/physicsChecks.js` | `analytic`, `integration`, `approximation`, `data`, `empirical` | the reference: `analytic`, `truth`, `analytic`, `measured`, `measured` | the check's tolerance is not an uncertainty and is not carried |
| Scene-audit kinds | `tools/lesson-scene-audit.mjs` | `engine-measurement`, `model-result`, `imported-data` | `truth`, `analytic`, `measured` | the audit's other four kinds describe scenes, not numbers |

## Reversing a mapping

Every older document keeps its own field as written. The envelope is computed from it, never stored over it. So a mapping reverses by reading the older field again, and a mapping found wrong is corrected here and in the one function that applies it. No saved file needs rewriting.

Three mappings lose something. Each says so where it happens:
- **The pipeline's "assumed error"** becomes the basis `assumed`. The tool's reason (the data carry no uncertainty) stays in its warnings.
- **The notebook's Monte Carlo spread** is stored today as half the p16-p84 range (`js/notebook/capture.js`), so any asymmetry is already gone. Carrying it as an `interval` is part of adopting the envelope in the notebook, not something a mapping can recover.
- **The notebook's observed group** forces every pipeline quantity to `measured` (`js/notebook/observed.js`). A `derived` velocity reads back as `measured` until the notebook adopts the envelope.

## Where the envelope is written today

| Producer | Function | Test |
|---|---|---|
| The measurement pipeline: every node | `nodeArtifact()` in `js/measure/envelope.js` | `tests/measure.test.js`: the period, box, line and aperture results on their real fixtures, and the scaling and citation rules |

The remaining producers adopt it in the order of Roadmap II Prompt 60:
1. the notebook's quantities and observed group, with the report rendering envelopes;
2. inference results, with a data digest;
3. experiment trial summaries;
4. analysis documents;
5. the Observatory guides' answers;
6. forward-model outputs.

Each adoption adds its row here and a test that holds the producer to the schema.
