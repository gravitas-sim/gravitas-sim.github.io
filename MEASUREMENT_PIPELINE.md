# The measurement pipeline

The Observatory can measure what it holds, and say exactly how. Open any
observation, open **Measure, and the pipeline**, and each result becomes a
node of a `gravitas.pipeline/1`. A node records:

- the tool and its version;
- its parameters, with their units;
- where among your changes it was taken, and a checksum of the data it saw;
- every number it gave, each labeled **measured**, **derived** or
  **assumed**;
- its warnings.

Change the data behind a node, by undoing a mask for example, and the node
says it is **stale** until you recompute it.

Nothing of it loads until the panel is opened, and no lesson uses it. The code
is `js/measure/` (the tools and the pipeline), the panel is
`js/observatory/measurePanel.js`, and the tests are `tests/measure.test.js`
and `e2e/measure.spec.js`.

## The tools

A bounded first toolset, each for the kind of observation it suits:

| Tool | For | What it gives | What it rests on |
|---|---|---|---|
| **Period search** | time series | the best period, its error, the power, the false-alarm probability, the amplitude | the generalized Lomb-Scargle periodogram (Zechmeister & Kürster 2009, A&A 496, 577). The period error is Montgomery & O'Donoghue 1999 (DSSN 13, 28), which **assumes** a sinusoid in white noise. The false-alarm probability is Baluev 2008 (MNRAS 385, 1279), an upper bound |
| **Transit search** | time series | period, mid-transit epoch, duration, depth, signal detection efficiency | box least squares (Kovacs, Zucker & Mazeh 2002, A&A 391, 369). It gives **no** period uncertainty; the fit panel's transit model does |
| **Spectral line** | spectra | equivalent width, depth-weighted center, depth; a velocity against a rest wavelength | a straight continuum fitted to two side windows, with uncertainties propagated linearly through the sums and the continuum's covariance. The rest wavelength is **assumed** (the Balmer presets are NIST's, vacuum or air to match the spectrum) |
| **Aperture** | images | a flux image: the sum in a circle, less the median of an annulus, its error, and the centroid. A flag image: the pixels with a bit set, their centroid, and its sky position | sub-pixel circle edges. The flux error **assumes** background-limited noise, plus Poisson noise when a gain is given |
| **Filter** | tables | the rows that pass up to three tests, joined by *all* or *any* | each test compares in the column's own unit, named in the test. A missing value passes no test, and is counted |
| **Cross-match** | tables | pairs with a second table, one to one, nearest first: by a value within a tolerance, or by sky position within a radius | the haversine separation, exact near zero, across the pole and across RA 0 |

Each tool is bounded so it stays teaching-sized on a low-end device:

- **Period and transit searches:** 20,000 points, 50,000 trial periods, and
  40 million point-trials. A search yields to the page every 12 ms, so the
  page keeps drawing, the progress bar moves, and **Cancel** is heard within a
  frame.
- **Tables:** 20,000 rows a table.

A result can become a change in the workspace, and the pipeline shows that
change coming from it:

- **Fold at this period:** the fold records which measurement it came from.
- **Mask the rows that fail:** does the same for a filter's result.

## Measured, derived, assumed

Every number carries one of three words. Where it has an uncertainty, so does
the uncertainty:

- **Measured:** read from the data by the tool. Examples: a period, an
  equivalent width, a pixel count.
- **Derived:** computed from measured numbers. Examples: a velocity from a
  line center, a false-alarm probability, a sky position from a pixel
  centroid and the image's WCS.
- **Assumed:** taken as given, not measured. Examples: a rest wavelength, an
  error built from a noise model rather than from the data's own
  uncertainties, and an SDSS spectrum's per-point error, which the bundle does
  not carry, so it is taken from the continuum's scatter.

## Uncertainty through the workspace's changes

The pipeline view says how each change treats uncertainty, and so does the
methods summary:

| Change | Stage | Uncertainty |
|---|---|---|
| crop, mask, unmask | selection | kept |
| convert | calibration | scaled with the values |
| time format | calibration | kept |
| normalize | calibration | divided by the same median, **whose own uncertainty is not included** |
| fold, rest frame | transformation | kept |
| bin | transformation | propagated (sqrt(sum sigma^2) / n), or the scatter / sqrt(n) where there were none |
| note | annotation | kept |

## The pipeline, saved and read back

**Save the pipeline (JSON)** writes a `gravitas.pipeline/1` document. It
holds:

- the observation's identity: its id, source, license and the SHA-256 of its
  content;
- the workspace itself, the Observatory's own save, so it replays;
- every node, with its parameters and results;
- any fit the fit panel ran, as its `gravitas.inference/1`;
- the methods, in words.

**Open a saved pipeline** reads one back:

1. It replays the changes.
2. It recomputes every node with this build's tools.
3. It says node by node whether each gives the number it saved, and which
   saved node came from another version of its tool.

What it accepts:

- **An Observatory save** (a `gravitas.observation/1` with its workspace)
  opens as a pipeline with no measurements yet. That is the migration from the
  older format.
- **A newer format version**, or a tool this build does not have, is refused
  by name.

**Save the results (CSV)** writes every quantity, value, error, unit and kind.
A period or transit search also saves its periodogram (CSV).

**Methods** is the whole pipeline in sentences, with the citation for every
method. It is written for a lab report, and is also inside the saved JSON.

## Into the notebook and its report

**Add to the notebook** puts a result in the evidence notebook
(`js/notebook/`). It then appears in the notebook panel and in the PDF report,
like any capture from the simulation, with these differences:

- **Kinds:** every quantity is *measured*, since a derived number is still from
  the data, and its note says how it was derived.
- **Where it came from:** instead of a simulation's conditions (scenario,
  seed, integrator), the entry carries an `observed` group
  (`js/notebook/observed.js`). The report prints it under "The data and what
  was done to them":
  - the observation and its content checksum;
  - the tool, its version and parameters;
  - the changes it saw;
  - what was assumed;
  - its warnings.
- **Checksum:** the entry's fingerprint covers all of it.
- **Figure:** a period or transit search goes in with its periodogram as the
  figure, reduced to the notebook's 400 points by keeping each stretch's
  highest power.

## Validation

Every tool is checked two ways in `tests/measure.test.js`. `npm run
measure:validate` prints these tables, from fixed seeds, so every machine
prints the same numbers.

**Recovery on synthetic truth.** Each case is 200 or 300 trials with seeded
noise. A pull is (estimate − truth) / stated error. Right errors give pulls of
mean 0 and spread 1.

| Tool | Quantity | Case | Pull mean | Pull spread |
|---|---|---|---:|---:|
| period | period | sinusoid, 60 random epochs over 900 d, S/N 8 a point | −0.15 | 1.00 |
| line | equivalent width | Gaussian line, depth 0.4, S/N 100, errors given | −0.02 | 0.88 |
| line | center | the same | 0.07 | 0.99 |
| line | equivalent width | the same, errors from the continuum scatter | −0.02 | 0.90 |
| line | center | the same | 0.08 | 0.99 |
| aperture | net flux | Gaussian star, 5,000 counts on 200 ± 10 a pixel, r = 6 px | −0.13 | 1.00 |
| aperture | centroid x | the same | 0.08 | 0.98 |

The equivalent width's error is slightly conservative (0.88), never
optimistic.

The false-alarm probability was tested on noise alone: 300 trials of 50
epochs. At a stated FAP of 0.05, 0.1, 0.2 and 0.5, the rates were 0.023,
0.067, 0.190 and 0.453. Each is at or below the nominal rate, as Baluev's
bound should be.

**Reference cases on the curated data, against cited values:**

| Case | Measured | Reference | Residual | In errors |
|---|---:|---:|---:|---:|
| SU Dra, 47 Gaia DR3 G epochs: period | 0.660434 ± 0.000028 d | 0.66042001 d (Monson et al. 2017, AJ 153, 96) | +1.4 × 10⁻⁵ d | 0.5 |
| HD 209458 b, TESS sector 56: period (box) | 3.524197 d | 3.52474859 d (Knutson et al. 2007, ApJ 655, 564) | −5.5 × 10⁻⁴ d | no error claimed |
| SDSS A0 star, H-alpha velocity | −241.0 ± 9.5 km/s | −242.8 km/s (SDSS DR18's own redshift) | +1.8 km/s | 0.19 |
| SDSS A0 star, H-beta velocity | −241.0 ± 15.6 km/s | −242.8 km/s | +1.8 km/s | 0.11 |
| SDSS G2 star, H-alpha velocity | −61.1 ± 39.7 km/s | −63.8 km/s | +2.7 km/s | 0.07 |
| TESS optimal aperture: pixels | 23 | 23 (`NPIXSAP`, the aperture header) | 0 | exact |
| TESS optimal aperture: centroid to HD 209458 | 7.8″ | within one 19.4″ pixel | | |

Two more facts the tests hold:

- **Balmer lines weaken with temperature:** the equivalent widths fall
  A > G > K.
- **Lomb-Scargle on a transit light curve finds half the period.** That is
  why the box search is a separate tool, and the test says so.

## What it does not do yet

- **Aperture photometry on curated flux images.** No curated flux image
  exists: the one curated image is the TESS aperture mask, a flag image, which
  the aperture tool measures by counting its pixels. The flux mode is
  validated on synthetic stars. A TESS target-pixel cutout of HD 209458, whose
  optimal-aperture sum should reproduce the light curve's `SAP_FLUX`, is the
  natural next curated image, and would need its own data pack.
- **A second table as a source of its own.** A cross-match's second table is
  embedded in its node, so a saved pipeline recomputes it, but the pipeline
  view lists it only inside that node, not beside the observation.
- **Model fits as nodes the pipeline recomputes.** A fit is recorded as the
  fit panel exported it. Recomputing one is the fit panel's job
  (`INFERENCE_CORE.md`).
