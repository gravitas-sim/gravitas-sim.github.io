# Authentic observation data packs: gate

**Status: decided under delegation, not reviewed.** Carl asked for Prompts 10
onward to run and merge in sequence while he was away, deciding each gate on
its recommendation. So these verdicts went to Prompt 12 without anybody
reading them first. They are evidence, not a signed decision. Unlike
[LAZY_CAPABILITIES_GATE.md](LAZY_CAPABILITIES_GATE.md) and
[PLATFORM_PACKAGE_RFC.md](PLATFORM_PACKAGE_RFC.md), no thresholds were
committed before the prototype. Each verdict names the evidence it rests on
and the condition that would reverse it.

| Question | Verdict |
|---|---|
| The shared schema, `gravitas.observation-data-pack/1` | **B**: accept, with four named production changes |
| TESS light curve, HD 209458, sector 56 | **A** |
| HARPS radial velocities, HD 75289 | **B**: science holds; attribution and time scale still to settle |
| CSV/JSON student-file import | **A**, as the design Prompt 15 builds |
| FITS | **B**: developer tools now; browser import later, light curves only |

The schema is not C, so the dependent Observatory and inference prompts are
not stopped.

**Base:** `v2` at `65ab01d` (green). **Prototype:** branch
`spike/observation-data-packs` at `ac1f448`, in
[`spike/data-packs/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/ac1f448/spike/data-packs).
It is disposable and will not merge. This PR is the decision record only.

---

## Audit: the authentic data Gravitas ships

The prompt names five kinds of data: GWOSC strain, galaxy rotation data, MIST
tracks, real-system parameters and the stellar spectra. There are seven
datasets:

| Dataset | What the numbers are | Raw input | Checked against the pin on a fresh download | Derived-file check | Provenance lives in |
|---|---|---|---|---|---|
| `js/data/gw/gw150914.js` | LIGO strain, band-passed by the collaboration (the published figure data) | 8 GWOSC text files | **no**: hashes are computed from what was read and recorded | module rebuilt and compared (needs the cache) | `PROVENANCE` in the data module |
| `js/data/gw/gwoscEvents.js` | 5 events, whitened by this project | 5 GWOSC 32 s strain files | yes: SHA-256 and byte count | payload SHA-256 per event | separate `gwoscEventsProvenance.js` |
| `js/data/spectra/sdssSpectra.js` | 4 SDSS DR18 spectra | 4 archive CSVs | yes | payload SHA-256 per spectrum | separate `sdssSpectraProvenance.js`, plus a capability package |
| `js/data/stellar/mistTracks.js` | MIST v1.2 model tracks (a model, not an observation) | a 100 MB tarball | **only when cached**: a fresh download is used unchecked | module rebuilt and compared | `PROVENANCE` in the data module |
| `js/data/trappist1.js` | TRAPPIST-1 parameters, compiled from papers | none; transcribed | none | none | a comment naming three papers |
| `js/data/exoplanetSystems.js` | HD 209458 and a Sun-Jupiter comparison, compiled | none; transcribed | none | none | a comment; no paper per value |
| NGC 3198 in `js/darkMatterWidgets.js` | **synthetic**: a model curve plus written-in offsets | none | none | none | a code comment |

### What is duplicated

- **Four nearly identical pipelines** (`tools/build-gw-data.mjs`,
  `build-gwosc-events.mjs`, `build-sdss-spectra.mjs`,
  `build-stellar-tracks.mjs`). Each one fetches, caches in a gitignored
  directory, hashes, transforms, quantises to integers, writes a generated
  module, and offers `--check` plus a provenance rebuild. Each keeps its own
  copy of the cache logic, the hash helper and the structural check.
- **Four provenance shapes.**
  - GW150914 records `inputs[]`.
  - GWOSC records `RECORDS[event].detectors[det]`.
  - SDSS records `RECORDS[letter].sourceSha256`.
  - MIST records one `sourceSha256`.
  - The same facts sit under different names, so no tool can list every
    raw input Gravitas depends on.
- **Four decoders.** Each module ships its own base64-to-int16 decoder
  (`decodeTrace`, `decodeEvent`, `decodeSpectrum`, `decodeTrack`). All four
  read the integers in the machine's own byte order. That is correct on every
  little-endian machine a browser runs on, but no format names the order. The
  prototype's decoder reads little-endian explicitly.
- **Licences are recorded three times.** Each is written in the provenance
  module, in NOTICE, and, for SDSS only, in a capability package. Nothing
  checks that the three agree, except SDSS's generated check from Prompt 09.
- **Units are free text.** MIST's `units` object is prose. The others put units
  in comments or column names.
- **Loading and offline are identical and implicit.** Every dataset is a JS
  module under `js/`, so the service worker precaches all of them as core. Only
  SDSS says so in a manifest.

### Findings to act on, outside this gate

1. **NGC 3198 is labelled as measured, and it is not.** The file header says
   "It is synthetic, and the panel says so", but only the MOND panel
   (`dm-mond`) draws "synthetic curve, NGC 3198 parameters". The fitting
   panel (`dm-fit`) draws the same points unlabelled, under the title "Fit a
   real galaxy". Its note says "the measured rotation curve of a spiral
   galaxy". *The Missing Mass* repeats this in step prose, in its objective
   ("Decompose a measured rotation curve") and in its closing tip ("You
   fitted a real galaxy").
   - This is a scientific-honesty fault in a lesson, not a data-pack question.
     A fix has been filed as its own task: label the curve, and reword the
     English and Spanish text without moving any steps.
   - Replacing the curve with published data (for example the THINGS curves,
     de Blok et al. 2008) is a candidate pack for a later prompt, not for this
     one.
2. **A fresh MIST download is not verified.** `ensureGrid()` compares the hash
   only when the tarball is already cached.
3. **GW150914 records hashes rather than pinning them.** A changed file on the
   archive would be caught only by the regenerate-and-compare check, and only
   on a machine that has the cache.
4. **No transformation tool has a version.** A derivative cannot say which
   revision of its tool made it.
5. **The two compilations cannot be reproduced.** They have no tool and no
   retrieval date. The exoplanet systems module cites no paper for any value.
6. **The MIST module and tool say seven tracks. There are eight.**

## The design: `gravitas.observation-data-pack/1`

A pack manifest is the **scientific record** behind a capability package's
`provides.dataPacks[]` entry. The capability package
(`gravitas.capability-package/1`, Prompts 08 and 09) keeps doing what it
already does: it says how the data loads, which offline class each file
has, and which checks cover it. The pack manifest says where the numbers came
from and what was done to them.

- **The two meet on one id.** The pack id is the package's public data-pack
  id.
- **A cross-check keeps the overlap honest.** `agreesWithPackage()` fails when
  the two disagree about that id or about the derived file's offline class.
- **Neither format grows a copy of the other.**

Fields (the prompt's list, all present):

| Group | Fields |
|---|---|
| Identity | `id` (public id), `version` (semver), `title`, `object` (name, identifiers, coordinates and frame), `facility` (observatory, instrument, pipeline), `dataType`, `origin` |
| Source | `source.urls`, `source.citations[]` (doi / bibcode / text), `source.retrieved`, `source.archive` |
| Rights | `license.status` (closed list), `license.statement`, `license.basis` (required when the status is not a licence) |
| Integrity | `raw[]` (file, bytes, SHA-256, `pinned`, and an optional `canonical` form with its own SHA-256), `derived` (file, bytes, SHA-256) |
| Reproduction | `transformation.script`, `transformation.version`, `transformation.steps[]` |
| Meaning | `columns[]` (name, unit, `uncertaintyOf`), `time` (scale, reference; required for time series), `masks[]`, `assumptions[]`, `reductions[]` |
| Checking | `validation` (the check, the published values and references, the result) |
| Use | `compatible.widgets[]` / `compatible.investigations[]`, `offline` (`core` / `optional` / `none`, the package's classes) |

Rules the validator enforces beyond presence:

- **`origin: synthetic` is refused, however complete the manifest is.** Numbers
  made to look like a measurement are not a data pack. A lesson that needs them
  labels them itself, and a pack is how a lesson says it is showing
  something real.
- **Every raw input must be pinned.** The tool must refuse any other bytes.
  "Recorded" is not enough (see findings 2 and 3).
- **A source that is not byte-stable is pinned over a canonical form.** A VizieR
  response dates itself (`#INFO request_date=...`), so its SHA-256 changes on
  every fetch. The pin is over the data rows, and the as-served hash is kept
  for the record.
- **`attribution-requested` and `no-license-stated` need a `basis`.** That is
  the argument for why redistribution is defensible.
- **A compilation may have no raw files.** Its citations are its source, but it
  still needs URLs, a retrieval date and a script.

The validator is 3.5 KB minified (1.5 KB gzipped) and is **build-time code**.
A built-in pack is validated when Gravitas is built, never in a visitor's
browser, as Prompt 09 decided for the package validator.

### Coverage: the seven shipped datasets, written as manifests

[`retrofit.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ac1f448/spike/data-packs/retrofit.mjs)
builds a manifest for each dataset from **only** what its own provenance
records, then validates it. The complaints are exactly what a migration has
to supply:

| Dataset | What its provenance cannot yet say |
|---|---|
| GWOSC five events | `transformation.version` |
| SDSS DR18 spectra | `transformation.version` (agrees with its capability package) |
| GW150914 figure data | retrieval date; 8 raw inputs unpinned; tool version |
| MIST tracks | retrieval date; tarball unpinned on a fresh download; tool version |
| TRAPPIST-1 | source URLs; retrieval date; script; version |
| Exoplanet systems | source URLs; **any citation**; retrieval date; script; version |
| NGC 3198 | **refused: synthetic** (plus no source) |

- **No field went unused.** Every field the schema asks for is supplied by at
  least one shipped dataset.
- **The two newest pipelines are one field from valid.**
- **What the schema demands is what the audit found missing.** That is the
  test of the design, and it passed.

## Prototype 1: a TESS transit light curve

**Source.** TESS SPOC 2-minute light curve of HD 209458 (TIC 420814525),
sector 56, camera 1, CCD 2, pipeline `spoc-5.0.96-20230729`. Fetched once from
MAST by the developer tool, and pinned by size and SHA-256. The lesson would
read only the derivative. No API is called at run time.

**Transformation**
([`build-tess-pack.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ac1f448/spike/data-packs/build-tess-pack.mjs),
with a 1.5 KB FITS reader):

1. Keep the cadences with `QUALITY` 0 and finite values: 18,791 of 20,079.
2. Divide by the median PDCSAP flux.
3. Average into 10-minute bins, keeping bins with at least 3 cadences. The
   error is propagated in quadrature.
4. Store the bins as 5 runs of consecutive indices. Flux is int16 ppm,
   little-endian. The error is a uint8 in 5 ppm steps.

The result is 3,758 bins in **15,246 bytes (7,088 gzipped)**. The same input
always gives the same file (`f6fad627...`). Time is BTJD (BJD − 2457000),
TDB, as SPOC writes it.

**Scientific check.** The build fails unless folding on the published period
(3.52474859 d) finds the transit at the published depth within 0.003.

- **Found:** a central depth of 0.0160, against (Rp/Rs)² = 0.0146 (Torres et
  al. 2008).
- **Why it is deeper:** limb darkening. A G0 star in the TESS band darkens the
  limb enough to deepen a central transit by about a tenth. That is an
  estimate from typical coefficients, not a fit.
- **Noise:** the median bin error is 104 ppm.
- **Consistency:** the application's own HD 209458 record says 1.5 %.

**Bin width is a lesson decision, and it moves the budget.** All rows below
come from the same pinned raw file:

| Bin | Bins | Bytes | Gzipped | Folded depth | Median error |
|---|---:|---:|---:|---:|---:|
| 10 min (pinned) | 3,758 | 15,246 | 7,082 | 0.01599 | 104 ppm |
| 20 min | 1,882 | 7,727 | 3,683 | 0.01592 | 74 ppm |
| 30 min | 1,256 | 5,223 | 2,521 | 0.01590 | 60 ppm |

The depth hardly moves. What wider bins lose is timing. The ingress lasts
about 25 minutes, so a 20-minute bin smears it, and a transit duration read
off the data gets about twice as uncertain. Narrower than 10 minutes, the
at-least-3-cadences rule breaks the series into short runs. At 5 minutes the
pack grows to 48 KB, so 10 minutes is the floor for this encoding.

**Verdict: A.** The data are public-domain NASA mission data, the raw file is
pinned, the derivative is reproducible, the science check passes, and the
object is already the star two investigations use (*Can You Detect This
Planet?*, *Design the Schedule*). Condition: record the MAST collection DOI, which was
not verified in this gate.

## Prototype 2: a radial-velocity series

**Source.** The HARPS RV bank (Trifonov et al. 2020, A&A 636, A74, served by
CDS VizieR). It holds SERVAL velocities corrected for nightly zero points,
from ESO archive spectra. Three stars were looked at:

| Star | Rows (Flag 0) | Nights | Largest orbital-phase gap | Fitted K | Published K | Chosen |
|---|---:|---:|---:|---:|---|---|
| HD 75289 | 19 of 21 | 17 | 0.16 | 52.5 m/s | 54.9 ± 1.8 (Butler et al. 2006) | **yes** |
| HD 179949 | 39 of 39 | 7 | 0.33 | 117.8 m/s | 112.6 ± 1.8 (Butler et al. 2006); 102.2 to 118.1 across the literature | no: a third of the orbit unobserved |
| HD 209458 | 19 | 1 | n/a | n/a | 84 | no: one night, a transit sequence |

The fit is a circular orbit at the published period (3.509267 d), by weighted
least squares. It recovers K = 52.5 m/s, 1.3σ from Butler et al. 2006
(Udry et al. 2000 give 54.0 ± 1). The residual scatter is 2.9 m/s, against
a median formal error of 1.0 m/s. That excess is the stellar jitter the formal
errors leave out, and the manifest says so. The derivative is 19 rows of
plain JSON, **457 bytes (300 gzipped)**, and reproducible.

**Verdict: B.** The series is public, sound and small. Three things stop it
being A:

1. **Rights are attribution, not a licence.** The catalogue states no licence.
   ESO asks users of archive data to acknowledge ESO and each observation's
   programme ID. The bank carries `PROGID` and `PROGPI` columns, so the
   production tool must request them and the pack must credit them.
2. **The time scale is unstated.** The catalogue says "barycentric Julian date"
   without UTC or TDB. They differ by 69 s, about 2 × 10⁻⁴ of this orbit: far
   below anything the lesson can read, but a fact to confirm before any series
   is fitted jointly with a TDB light curve.
3. **It is not the TESS star.** HD 75289 b does not transit. The bank has only a
   single night of HD 209458, so it cannot supply the RV half of a
   mass-and-radius investigation. Prompt 12 should ship the transit pack alone,
   which its own run condition allows, and add an RV pack only when a lesson
   needs one.

## Prototype 3: CSV/JSON student-file import

[`import.mjs`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/ac1f448/spike/data-packs/import.mjs)
reads a student's file into **the same in-memory observation** a pack decodes
to. The shape is `{quantity, x, y, err, source}`, and a test asserts that the
keys match. An instrument cannot tell a curated series from an imported one
except by `source.kind`.

- **Accepted formats:**
  - comma-, tab-, semicolon- or space-separated text;
  - `#` and `%` comment lines, a BOM and CRLF line ends;
  - a header with units as `time (d)` or `flux [e-/s]`;
  - decimal commas in semicolon files;
  - JSON rows, JSON columns, and an observation this code wrote.
- **Nothing is guessed silently.** Dropped rows, reordering, delimiter choice and
  every column chosen without being told come back as notes for the interface
  to show.
  - A third column becomes the uncertainty only by name, or by position when
    the file has no header. A column named `airmass` is not an error bar.
  - A file where more rows fail than parse is refused as probably the wrong
    file.
  - Limits are 5 MB and 100,000 rows.
  - A JSON `__proto__` key stays data.
- **A student's file never leaves the machine.** It is parsed locally, so import
  works offline.
- **Round trip.** The TESS light curve exported to CSV and imported back is
  identical, value for value.
- **Speed.** A 3,758-row, 134 KB CSV imports in 5 ms.

**Verdict: A** as the design Prompt 15 builds on. What Prompt 15 still owns:

- the mapping interface and remembering its choices;
- translating the messages, which are English literals here;
- quoted fields that contain the delimiter;
- units containing spaces in space-separated headers.

## FITS

The prompt treats FITS as a separate decision because a parser could be a large
dependency. It is not one for this use:

- **Size:** the reader is **1,492 bytes minified (920 gzipped)**.
- **Coverage:** it reads every header and all 20 columns of a SPOC light curve.
- **Speed:** it parses the 2 MB file in 11 ms.

It reads headers and scalar binary-table columns of types L, B, I, J, K, E
and D. It does not read images, tile compression, variable-length arrays, ASCII
tables, or the `TSCAL`/`TZERO` scaling that encodes unsigned integers.

**Verdict: B.**

- **Developer tools now:** FITS is how raw TESS products arrive, and the
  reader is enough for them.
- **No browser FITS import yet.** A student who downloads a light curve from
  MAST gets a SPOC FITS file, so the case is real. But a browser reader must
  refuse, not misread, every form it does not support. That needs `TZERO`
  handling and tests against Kepler and TESS files it did not see here.
- **Where it goes:** Prompt 15 may add it as an optional import format limited
  to binary-table light curves, with those tests. Until then, import is CSV and
  JSON.

## Exact bundle cost

Minified with the esbuild the project builds with; bytes before compression,
with gzip for reference:

| Piece | Where it would load | Minified | Gzipped |
|---|---|---:|---:|
| Pack decoders and `checkObservation` | with the instrument that shows a measured series | 1,676 B | 800 B |
| Student-file import (includes the check) | on the import control's first use | 5,135 B | 2,456 B |
| Both together | | 6,309 B | 2,904 B |
| Manifest validator | build time only | 3,520 B | 1,510 B |
| FITS reader | developer tool only | 1,492 B | 920 B |
| TESS pack, 10-minute bins | with the lesson that uses it | 15,246 B | 7,088 B |
| TESS pack, 20-minute bins | | 7,727 B | 3,683 B |
| HARPS HD 75289 pack | | 457 B | 300 B |
| Each pack's manifest | build and provenance only, never loaded | about 3.9 KB | about 1.9 KB |

**Nothing reaches start-up.** The initial download stays at 818.3 of 830 KB.

**Every row that loads in a lesson counts against the deferred ceiling:**

- The ceiling has **21.3 KB** left (4158.7 of 4180 KB at this base).
- The 10-minute TESS pack plus its decoder costs 16.5 KB.
- The 20-minute pack plus its decoder costs 9.2 KB.

**Recommendation for Prompt 12:**

- **Ship the pack as a generated JS module, as the SDSS spectra are.** The
  bundler, the deferred budget, the route budgets, the capability runtime and
  the service worker then all see it the way they see every other dataset.
  Serving it as fetched JSON would move the same bytes out of the metafile
  and so out of the budgets' sight. That is an accounting trick, not a saving.
- **Default to 20-minute bins.** Use 10 minutes only if the lesson Prompt 24
  writes measures ingress shape; say so when that happens, and pay for it
  there.
- **No ceiling is raised.**

## Offline behaviour

- **Shipped packs.** A pack is an asset of its capability package, so the
  service worker already honours its offline class (`capabilityOffline()` in
  `tools/build-service-worker.mjs`, from Prompt 09).
  - The two prototypes declare `optional`: precached at install, but a failed
    fetch does not fail the install. A lesson that needs its data offline
    raises it to `core` in both manifests, and `agreesWithPackage()` fails the
    build if only one of them changes.
  - No lesson ever needs the network for data. The only network step is the
    developer tool's fetch, which needs `--fetch`; without it the tool reads
    the cache or stops.
- **Student imports** are local by construction and work offline.
- **The shipped datasets today** are all precached as core by the `js/`
  directory walk. The pack manifests don't change that until a dataset
  migrates.

## Licensing findings

| Source | Status | What redistribution requires |
|---|---|---|
| TESS / MAST | public domain (NASA mission data) | Cite Ricker et al. 2015 and Jenkins et al. 2016, and acknowledge MAST. The collection DOI is to be recorded. |
| HARPS RV bank / ESO | no licence stated; attribution requested | Cite Trifonov et al. 2020 and Mayor et al. 2003, acknowledge ESO, and list programme IDs. The last is not done yet. |
| GWOSC | CC BY 4.0 | The attribution sentence, already in NOTICE. |
| SDSS DR18 | public; acknowledgement asked | The acknowledgement, already in NOTICE. |
| MIST | cite the model papers; no licence | Citations, already in NOTICE. |
| TRAPPIST-1, exoplanet systems | facts from papers | Citation per value. The exoplanet module has none. |

Nothing here is restricted. No raw product is committed, on any branch. The
spike branch holds only the two derivatives, which carry their citations.

## How the stellar-spectra data would migrate

SDSS is the dataset closest to the target: it already has a capability
package, a separate provenance record, pinned raw hashes and payload hashes.
Its migration is:

1. **Add a version** to `tools/build-sdss-spectra.mjs` (the one field it fails
   on).
2. **Generate its pack manifest.** Have the tool write
   `sdss-dr18-stellar-spectra`'s `gravitas.observation-data-pack/1` manifest
   beside `sdssSpectraProvenance.js`, from the same run. The detailed
   per-spectrum record stays where it is, as the pack's extended provenance.
3. **Point the package at the manifest.** The capability package's
   `provides.dataPacks[0].provenance` names the manifest. `agreesWithPackage()`
   joins the build checks the package already runs.
4. **Share one decoder.** A spectrum decodes to the same observation shape,
   with `x` as wavelength, so the spectra instruments can later share the
   decoder with every other pack. That is an adapter, not a rewrite.

No lesson text, instrument or number changes. The GWOSC events follow the
same four steps. GW150914 and MIST first need their raw inputs pinned
(findings 2 and 3). The compilations need a small tool that asserts each
value against its cited table. NGC 3198 needs the lesson fix, not a pack.

## What Prompt 12 builds from this

- The schema and validator in `tools/`, with the rules above. Production
  changes over the prototype:
  - `transformation.version` is required and written by the tool;
  - the canonical-form pin is tested against a second non-byte-stable source
    before it is relied on;
  - a shared fetch, pin and cache helper replaces the four copies;
  - one base64 and integer decoder is used by every pack.
- One production pack: TESS HD 209458 sector 56, 20-minute bins by default,
  as a JS module under `js/data/`, precached `optional`, inside the current
  budgets.
- The TESS developer tool with its FITS reader, raw files cached outside the
  repository, and a `--check` that rebuilds the pack from the cache and
  compares bytes.
- Migration *rules* for SDSS, GWOSC, GW150914 and MIST, as above, without
  converting them in that PR.
- Tests: checksum tampering; schema, units, time and flags; transform
  repeatability; the licence inventory; offline; route budgets.

It does not build an investigation, an RV pack, browser FITS import, or the
import interface.

## Downloads made for this gate

All downloads went into a scratch cache outside every checkout. None is
committed.

| File | Source | Bytes | SHA-256 |
|---|---|---:|---|
| `tess2022244194134-s0056-0000000420814525-0243-s_lc.fits` | MAST (`mast:TESS/product/...`) | 2,039,040 | `1b76b4a4b73e24954fa6e29a7e28a174685113ecdbad1bf10ef0e7b766ce99e9` |
| `harps-hd75289.tsv` (5 columns) | VizieR `J/A+A/636/A74/rvbank` | 3,545 | `c69d13360214405276a5929526f761cb1a4dbae7b3634bc808fd6911b822f849` (data rows `cf5359e7...a155`) |
| `harps-hd179949.tsv` (5 columns) | same | 4,608 | `2516efa8e91b765f531110619a047c8c236a0242399eadabf0815c14153fbb7e` (data rows `b82a7725...6947`) |
| `harps-hd209458.tsv` (5 columns) | same | 3,428 | `3f9da9777a91caeaf5ca8981b97d33c088aeea9e95d487330b941aa07c4db6bf` |
| `harps-readme.txt` | VizieR catalogue ReadMe | 12,529 | `5fa9242d93838bbcf7bd1085be37699f574d6af9d3a5ce4f4119eb313404fe27` |
| `n-HD75289.tsv` (row count: `Name`, `BJD`, `Flag`) | same | 2,643 | `b2b4d07430f483810b4182e209bb9a83ad5d4beb4c0e4fb25b3d6bf9b813adea` |
| `n-HD179949.tsv` (row count) | same | 3,238 | `9654813a751b3825a8f59140a82128a9b3bb0b20a97b30800a4d09c6ae79e72b` |
| `n-HD120136.tsv`, `n-HD189733.tsv`, `n-HD212301.tsv`, `n-HD217014.tsv` (row counts; no rows under these names) | same | 1,898 each | `5a7a5913...cd4c`, `a24192d5...d127`, `3549ee77...a48d`, `06c3f68b...1d0b` |

Two lookups returned no file and were not kept: a MAST search for the
product's name, and a NASA Exoplanet Archive query for the published orbits
of HD 75289 b and HD 179949 b. That query also corrected one attribution: 54.9
m/s is Butler et al. 2006, not Udry et al. 2000.

## How to reproduce

On the spike branch:

```bash
node spike/data-packs/build-tess-pack.mjs --cache /path/to/cache --fetch
```

```bash
node spike/data-packs/build-rv-pack.mjs --cache /path/to/cache --fetch
```

```bash
P11_CACHE=/path/to/cache node --test spike/data-packs/spike.test.mjs
```

```bash
node spike/data-packs/retrofit.mjs
```

The test file has 25 tests. The 2 that rebuild from the raw cache skip
without `P11_CACHE`. With the cache all 25 pass, including byte-identical
rebuilds of both derivatives and the TESS tool's refusal of a raw file with
one changed byte.
