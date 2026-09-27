# Stars and their populations: spectra, clusters and variables

The second suite of guided investigations in the Observatory (`/observatory/`),
after the Exoplanet Observatory (EXOPLANET_OBSERVATORY.md). Five guides, each
on an introductory and an advanced path, with real observations and the
page's own tools:

| Guide | What it asks | Data | Tools |
|---|---|---|---|
| 1. What a spectrum says | H-alpha from A to M, a molecular band, and an A-type star whose gravity says it is not a dwarf | four SDSS DR18 spectra | line tool, band index |
| 2. A cluster's color–magnitude diagram | g against g − r for NGC 2420, and what the survey left out: the crowded core, the saturated giants, the field | SDSS DR18 photometry, 2301 stars | new columns, filter, column summary |
| 3. Who belongs? | members by velocity, the field stars a cut lets in, the giants the targeting missed, three metallicities | SEGUE stellar parameters, 517 spectra | crop, column summary, filter |
| 4. Ages from models | MIST isochrones against the members: an age and a distance, and how metallicity and reddening trade against both | SEGUE members, MIST isochrones (a model) | new columns, isochrone comparison |
| 5. A star that varies | SU Dra's period and light curve, its distance as a standard candle against a parallax, and a period search fooled by a transit | TESS sector 15 (catalog), HD 209458's sector 56 | period search, fold |

Every number a step checks is the reader's own measurement, a number computed
from the data on screen by a rule the step's panel states, or a published value
named as adopted. The isochrones are labeled a model everywhere they appear,
and every age the guides give is "MIST's, for what was assumed".

## What the roadmap asked for, and where it is

| Asked for | Where |
|---|---|
| A second flagship suite, showing the Observatory is a platform | `js/observatory/guides/populations.js`, loaded by the same runner as the exoplanet suite; the runner, its checks and its documents were made suite-generic first (below) |
| Real or defensibly curated spectra | the four SDSS DR18 spectra the stellar lessons use, unchanged |
| Gaia-like catalog quantities | positions, radial velocities and SSPP's parameters from SEGUE, and SDSS photometry; Gaia itself is not redistributable (Data and licenses) and enters only as cited numbers |
| Cluster color–magnitude diagrams | NGC 2420 in SDSS g and r, made by the reader from its magnitudes |
| MIST tracks | MIST v1.2's isochrones in SDSS ugriz, a new model pack |
| A variable-star time series | SU Dra's TESS light curve, the catalog pack Prompt 13's SDK built |
| Through the shared data and provenance pipeline | three new data packs, pinned and rebuilt byte for byte by `npm run packs:provenance` (DATA_PACKS.md) |
| Spectral features, classification, temperature and luminosity | guide 1 |
| Extinction and distance | guides 4 (reddening, distance modulus) and 5 (extinction on a standard candle) |
| Cluster membership | guide 3 |
| Isochrone comparison and ages | guide 4 |
| Variability | guide 5 |
| Degeneracy and selection effects | the crowded core and saturated giants (2), the field in the velocity window and the giants SEGUE never targeted (3), metallicity against reddening against age (4), a sinusoid on a transit (5) |
| Model tracks not turned into truth; preprocessing not hidden | the isochrones' origin is `model` and the steps say so; every reduction, including the survey's own selections, is in each pack's details |
| New general measurement primitives in the Observatory, with independent tests | the band index, the isochrone comparison, the column summary, derived columns, and table packs (below), tested in `tests/stellarTools.test.js` |
| Accessible alternatives, English and Spanish, offline data, instructor materials, reports, reproducible assignments | Accessibility and languages; For instructors |
| Reused platform code against suite-specific code | The platform, measured |

Prompt 01's spectra experiment was merged, not rejected; its classroom
criterion has not been run with students (REAL_SPECTRA_EXPERIMENT.md). This
suite uses the same four spectra and does not call that experiment a pilot
success; the instructor guide says the first guide is a first use.

## Decisions made under delegation

Made while Carl was away, under his standing instruction to take the
recommendation where a decision was needed. Each is reversible.

1. **NGC 2420 as the cluster.** An SDSS/SEGUE calibration cluster (Lee et al.
   2008b), in both the imaging and the spectroscopy, public domain, at 2.5 kpc
   with little reddening. M67 is the textbook cluster but saturates in SDSS
   down to its turnoff.
2. **SEGUE, not Gaia, for the catalog quantities.** Gaia DR3 is CC BY-NC 3.0
   IGO (re-verified on cosmos.esa.int), which the data-pack schema and the
   catalog refuse. SEGUE's velocities and parameters are public domain and
   answer the same membership question. Gaia's results enter as cited
   numbers (Cantat-Gaudin et al. 2020).
3. **MIST's SDSS isochrones, thinned.** Three metallicities around the
   cluster's published range, seven ages, the main-sequence, giant and
   core-helium phases, each curve simplified to 0.005 mag: 1410 points, 34.7
   KB. Non-rotating, to match the tracks Gravitas already ships.
4. **The isochrone comparison is a distance statistic, not a likelihood.** A
   defensible likelihood needs a model of binaries, field stars and
   photometric errors that the suite cannot justify; the statistic (mean of
   capped squared distances in stated scales) is honest about what it is, and
   the tool says it gives no standard errors. Its ordering of metallicities
   was checked at five choices of scale and cap and did not change.
5. **A column summary tool.** The Observatory had no way to take a median;
   "Describe a column" (count, median, mean, standard deviation, extremes,
   masked rows left out) is general and was needed by three steps.
6. **The work limit on the comparison.** Its default grid (401 distance
   moduli by 61 reddenings) exceeded the 20,000-shift limit it shipped with, so
   the panel's defaults failed; the limit is now on points × shifts × models
   (4 × 10⁸), which is what it costs. The default run on the members takes
   about a second.
7. **A warning for a best model at the edge of the family.** At [Fe/H] −0.5
   the best age is the grid's oldest; the result now says an older model
   might fit better, and the instructor guide calls such an age a limit.
   Guide 4 sends advanced readers to try −0.5 with the dust map's reddening,
   where they meet it.
8. **SU Dra's distance from Benedict et al. 2011.** Their relation's zero
   point was set with five RR Lyrae parallaxes, SU Dra's among them, so the
   agreement the guide shows is not independent, and the guide says so.
9. **Spanish loads lazily on the Observatory page.** The suite's tools put
   the page's start-up 1 KB over its ceiling; the page's Spanish catalog, 12.9
   KB every English reader downloaded, now loads only for a reader in
   Spanish. The start-up fell to 85.9 KB, below where it was before the
   suite, and the ceilings were lowered to the new measurement.
10. **The SEGUE pack's fiber statement corrected.** Its reduction said two
    fibers could not be placed within 55 arcsec; the table holds 97 closer
    pairs, from different plates. It now says "on any one plate".
11. **SDK 1.4.0** adds the `catalog` data type to the manifest schema, which
    the format's own test requires to match the tool's; an extension cannot
    yet ship one (sdk/README.md says why).

## How every number is produced

Each step's number is one of three kinds, and its panel or its words say
which.

- **Measured** by the reader with a tool: H-alpha's equivalent width and the
  A star's velocity (line tool), TiO5 (band index), an age, distance modulus
  and reddening (isochrone comparison), SU Dra's period and amplitude (period
  search), and the period found on HD 209458.
- **Computed** in the page from the data on screen by a stated rule: the stars
  within a radius, the ring densities, the members a crop kept, their median
  velocity and [Fe/H], the field stars in the neighboring windows, the
  folded light curve's spread, and H-alpha in all four spectra. Each is a
  function in `populations.js` whose rule is its comment, and a reader can
  reach each with the filter tool or the column summary.
- **Adopted**, with its source: the pipeline's template parameters, the
  cluster's center and published age, distance and metallicities, the dust
  map's reddening, SU Dra's magnitude, extinction, metallicity and parallax,
  and the RR Lyrae relation.

## The reference run, and the literature

`npm run guides:populations-key` does what a reader does with every panel's
defaults and writes the answer key (`js/data/populationsAnswerKey.js`, 122
rows); `tests/populationsGuides.test.js` holds the committed key to it and
the results to the literature:

| Quantity | This run | Published |
|---|---|---|
| A star, H-alpha equivalent width | 7.01 Å (G 3.07, K 1.49, M 0.37) | the order A > G > K > M |
| A star, velocity from H-alpha | −241.0 km/s | SDSS redshift: −242.8 km/s |
| M star, TiO5 | 0.6569 | the stellar lesson's own 0.6569; Reid et al. 1995 scale |
| Stars within 3′ of NGC 2420's center | 5 | half of Gaia's 393 members within 3.2′ (Cantat-Gaudin et al. 2020) |
| Field share, 3–8′ ring, g < 20 | 0.749 | |
| Brightest star | g = 13.797 | SDSS saturates near g = 14 |
| Members, 65–85 km/s | 225 | Lee et al. 2008b: 130, by stricter cuts |
| Members' median velocity | 75.93 km/s | 74.8 ± 6.2 (Lee et al. 2008b) |
| Members' median [Fe/H] (SSPP, DR18) | −0.32 | −0.46 (SSPP, DR6), −0.44 (high resolution), −0.16 ± 0.04 (APOGEE) |
| Isochrones at [Fe/H] −0.25 | log age 9.5 (3.16 Gyr), m − M 11.78, E(g − r) 0.005 | |
| Isochrones at [Fe/H] 0 | log age 9.3 (2.0 Gyr), m − M 12.06, 2582 pc | 1.74 Gyr, 12.06, 2587 pc (Cantat-Gaudin et al. 2020); 2.2 Gyr, 12.54 (WEBDA) |
| [Fe/H] −0.25 with the map's E(g − r) 0.042 | log age 9.4 (2.5 Gyr) | |
| SU Dra's period | 0.660435 ± 0.00011 d | 0.66042001 d (Monson et al. 2017) |
| SU Dra as a standard candle | 746 pc | 704 pc from its HST parallax, 629 to 800 at one standard error |
| A sinusoid on HD 209458 | 1.764 d | half of 3.52475 d |

The metallicity–reddening–age trade-off in guide 4, measured: with the
reddening free, [Fe/H] −0.25 fits best (statistic 0.765 against 0.852 at
solar and 0.839 at −0.5); with the dust map's reddening fixed, −0.5 and −0.25
tie (0.857 and 0.854) and solar falls behind (0.959), and the age at −0.25
drops from 3.2 to 2.5 Gyr.

## The platform, measured

The roadmap asks for the reused platform code against the suite's own, with
duplication treated as a defect. Code lines, not blank and not only a comment,
at this commit against the merge of Prompt 24 (8e4d24a):

| | Lines |
|---|---|
| **The suite's own code** | **1317** |
| — its steps, targets, adopted values and the targets each answer reads, as data | 637 |
| — its rules, answers and panels | 415 |
| — its reference run, instructor documents and the suite's export | 265 |
| Its words, English and Spanish | 1016 |
| Its data build (`tools/data-packs/ngc2420.mjs`) | 795 |
| Its tests | 659 |
| **Platform it runs on that existed before it** | **9827** |
| — the guide runner | 956 |
| — the measurement pipeline and panel | 3140 |
| — the Observatory workspace | 3833 |
| — the data-pack pipeline | 1278 |
| — catalog install and the notebook | 620 |
| **General platform code this prompt added** | **1746** |
| — the guide core, suite registry, instructor documents and reference kit, taken out of the exoplanet suite | 409 |
| — the band index, isochrone comparison, column summary and their panel forms | 779 |
| — derived columns, table fixtures, plot overlays | 384 |
| — table packs: decoder, encoder, the `catalog` type | 174 |

The suite is 11% of the code it runs on. Its imperative part, 415 lines, is
the rules its panels compute and the rows they draw. The exoplanet suite
shrank by 206 lines when the runner, the checks, the answer key and the
instructor documents moved into the platform, and both suites now use one
copy of each.

Duplication found and removed before review: the suite's median and its
velocity windows reimplemented the column summary and the filter tool, and now
call them; the Balmer presets moved from the measurement panel into the line
tool's module so the suite could measure all four spectra as the panel does
without importing the panel. None is left that the tests or a search found.

## New general measurement primitives

All in the Observatory's measurement pipeline (`js/measure/pipeline.js`), open
to any observation of the right kind, not only this suite's:

- **Band index** (`js/measure/bandIndex.js`): a band's mean flux over one or
  more reference windows', each window's mean weighted by coverage, with
  windows in air or vacuum. Presets TiO5 and CaH2 (Reid et al. 1995).
  Reproduces the stellar lesson's TiO5 on all four spectra to 10⁻⁴.
- **Isochrone comparison** (`js/measure/curveCompare.js`): points against a
  family of model curves, each shifted by a distance modulus and a reddening
  over a grid, the distance to each curve read from an exact distance
  transform. Warns when the best shift or model is at the edge of what was
  searched, and when several models fit about as well. Its best curve is drawn
  over the points.
- **Column summary** (`js/measure/describe.js`): count, median, mean,
  standard deviation, extremes, leaving out masked rows and missing values.
- **Derived columns** (`js/observatory/transforms.js`, `derive`): a sum of up
  to four columns of one kind of quantity with factors and a constant, its
  errors in quadrature; and the distance on the sky from a position. Recorded
  and undoable like any change.
- **Table packs** (`js/tableObservation.js`, `table-columns/1`).

Their tests (`tests/stellarTools.test.js`) recover what synthetic data holds:
a band of known depth, exact; the band index within its error at the rate one
standard error implies; a known curve and shift through noise and field stars;
the degeneracy, edge and limit warnings; derived colors and distances; a table
round trip within half a step.

## Data and licenses

| Data | Source | Terms |
|---|---|---|
| Four stellar spectra | SDSS DR18, built in since Prompt 01 | public domain; acknowledged in NOTICE |
| NGC 2420 photometry | SDSS DR18 SkyServer, pinned | public domain; acknowledged in NOTICE |
| NGC 2420 SEGUE parameters | SDSS DR18 SkyServer, pinned | public domain; acknowledged in NOTICE |
| MIST isochrones (a model) | mist.science, pinned archive | no license stated; cited, thinned subset (NOTICE) |
| SU Dra light curve | MAST, the catalog extension `community.su-dra-tess-s15` | public domain (NASA) |
| HD 209458 light curve | MAST, built in | public domain (NASA) |
| Adopted numbers | the papers each names | cited, not redistributed |

Gaia DR3's data are CC BY-NC 3.0 IGO, which Gravitas does not redistribute;
its catalog quantities enter only as numbers published from it.

## Accessibility and languages

Every panel of numbers is a definition list, and every plot has the
Observatory's table beside it; the guide runner's controls are the exoplanet
suite's, with its keyboard and screen-reader behavior
(`e2e/populationsGuides.spec.js` runs axe in English and Spanish). Every word
is in both languages, and a test fails for a key in one only. The suite's
data are built in or, for SU Dra, installed once from the catalog, and the
service worker keeps them for offline use.

## For instructors

The instructor portal carries two new documents, built by
`tools/build-instructor-materials.js` from `js/populationsGuideDocs.js`: an
instructor guide (curriculum map, the data and their terms, teaching notes,
assignment sheets, and the approximations below) and the answer key from the
reference run. The runner's notebook export is the student's report: their
answers with the measurements behind them. An assignment is reproducible
because the data are pinned, the key is regenerated from them, and a student
is checked against their own measurements, not against the key.

## What remains an educational approximation

- Line and band errors come from the scatter in their windows: the spectra
  carry no per-sample errors.
- The four stars' parameters are the SDSS pipeline's nearest ELODIE template.
- The field estimates assume a field that does not change across the rings
  or the velocity window.
- Membership uses velocity alone; no proper motions or parallaxes.
- The isochrone comparison is a statistic, not a likelihood, with one
  extinction law and one model.
- Seven ages and three metallicities: an age at the grid's edge is a limit.
- The RR Lyrae distance rests on an adopted relation calibrated on SU Dra
  among others.

## Budgets

- The application's start-up (818.9 of 830 KB) and deferred JavaScript
  (4177.8 of 4180 KB) did not move: the Observatory is its own entry.
- The Observatory page's start-up fell from 88.2 KB (before the suite) to
  85.9 KB in the build, with the suite's tools in it, because Spanish now
  loads lazily; its ceilings were lowered to 86.3 KB and 175.3 KB (sources).
- The suite, its words and its packs are lazy: none loads until a reader
  chooses the suite or opens one of its observations.

## Tests

- `tests/populationsGuides.test.js`: the guides as data, both languages, every
  answer reading only earlier steps, every adopted value tied to its source
  (the spectra's record, the pack's center, the exoplanet suite's period),
  the suite's rules on synthetic data, the committed key against the
  reference run, the results against the literature, and a guide walked in
  the DOM.
- `tests/stellarTools.test.js`: the primitives, on their own.
- `tests/dataPacks.test.js`: the three packs, their pins, their notices and
  licenses, and their offline class.
- `e2e/populationsGuides.spec.js`, against the sources and dist/: the suite
  from a link, a color, a distance and a count made in the page, the
  isochrone comparison drawn over the members, the column summary's median,
  and Spanish and axe.
