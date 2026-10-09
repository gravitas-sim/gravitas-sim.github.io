# Observation data packs

A data pack is data that a lesson shows as coming from outside Gravitas, with
the record of where it came from and what was done to it. The data might be an
observation, a published model grid, or values compiled from papers. The format
is `gravitas.observation-data-pack/1`, decided by
[OBSERVATION_DATA_PACK_GATE.md](OBSERVATION_DATA_PACK_GATE.md). Every dataset
Gravitas shows as coming from outside it is a pack: sixteen are built in, and
the table below lists them. LICENSES.md and NOTICE carry the licence inventory,
and the model page their badges, all generated from the manifests.

| Pack | What it is | Origin | Module | Commands |
|---|---|---|---|---|
| `tess-hd209458-s56-lc` | TESS light curve of HD 209458 | observed | `js/data/observations/tessHd209458S56.js` | `packs:*` |
| `tess-hd209458-s56-aperture` | its aperture mask | observed | `js/data/observations/tessHd209458S56Aperture.js` | `packs:*` |
| `sdss-dr18-ngc2420-photometry` | SDSS photometry of NGC 2420 | observed | `js/data/observations/sdssNgc2420Photometry.js` | `packs:*` |
| `sdss-dr18-ngc2420-segue` | SEGUE parameters of NGC 2420 | observed | `js/data/observations/sdssNgc2420Segue.js` | `packs:*` |
| `mist-sdss-isochrones` | MIST isochrones in SDSS g and r | model | `js/data/observations/mistSdssIsochrones.js` | `packs:*` |
| `sdss-dr18-stellar-spectra` | four SDSS DR18 spectra | observed | `js/data/spectra/sdssSpectra.js` | `spectra:*` |
| `gwosc-five-events` | five GWOSC events, whitened strain | observed | `js/data/gw/gwoscEvents.js` | `gwosc:*` |
| `gw150914-figure-data` | GW150914, the published figure data | observed | `js/data/gw/gw150914.js` | `gw:*` |
| `mist-v12-tracks` | eight MIST v1.2 evolutionary tracks | model | `js/data/stellar/mistTracks.js` | `stellar:*` |
| `exoplanet-systems` | HD 209458, and the Sun and Jupiter | compilation | `js/data/exoplanetSystems.js` | `packs:*` |
| `trappist-1-system` | TRAPPIST-1 and its seven planets | compilation | `js/data/trappist1.js` | `packs:*` |
| `ngc3198-synthetic-curve` | the NGC 3198 curve The Missing Mass fits | **synthetic** | `js/data/ngc3198Synthetic.js` | `packs:*` |
| `radiation-bandpasses` | UBVRI, SDSS ugriz, TESS and 2MASS bandpasses with AB - Vega offsets | compilation | `js/data/radiation/bandpasses.js` | `packs:*` |
| `radiation-lines` | 22 strong optical lines, air and vacuum, from NIST | compilation | `js/data/radiation/lines.js` | `packs:*` |
| `radiation-extinction` | the Cardelli, Clayton & Mathis 1989 law | compilation | `js/data/radiation/extinction.js` | `packs:*` |
| `radiation-bolometric` | Flower 1996 `BC_V(Teff)` as Torres 2010 corrected it | compilation | `js/data/radiation/bolometric.js` | `packs:*` |
| `radiation-gaia-bandpasses` | Gaia (E)DR3 G, G_BP and G_RP passbands and zero points; **non-commercial** | compilation | `js/data/radiation/gaiaBandpasses.js` | `packs:*` |

The last five are the radiation kernel's (`RADIATION.md`). They are `dataType`
`model-grid` and `catalog` for want of a type for a response function or a law,
they name their own loader (`js/kernels/radiation/packs.js`) in place of the
Observatory's fixtures, and they are built by `tools/data-packs/radiation.mjs`
from raw products pinned in `tools/data-packs/radiation/pins.json`.

## Three files per pack

| File | What it is | Who reads it |
|---|---|---|
| `data-packs/<id>.json` | **The manifest**: sources, citations, rights, the raw product's pin, every transformation step with the tool version, units, time system, masks, assumptions, reductions, and the scientific check and its result | the build, the tests, and anybody checking the work; never the browser, never precached |
| `js/data/observations/<name>.js` | **The runtime module**: `PACK` holds the metadata an interface shows, cut from the manifest's `RUNTIME_FIELDS`; `SERIES` holds the encoded numbers. Content only, with no imports | the instrument that shows it, through the capability runtime |
| `capabilities/<name>.json` | **The capability package** (`gravitas.capability-package/1`): ships the module, names the manifest as its provenance, gives the module's offline class, lists the checks | `tools/capabilities.mjs`, the service worker's precache, the resolver |

The manifest and the runtime module are generated in one run of
`tools/build-data-packs.mjs`. The capability package is hand-written and
checked against them: the pack id, the provenance path and the offline class
must agree. Only the packs a lesson reaches through `builtin:` have one (the
TESS packs and the SDSS spectra); the others are reached by their
instruments' own imports, or the Observatory's, and say `capability: null`.

**Three kinds of runtime module.** The packs written for the format carry
`PACK` and `SERIES`, as below. The four datasets that came before it (the
SDSS spectra, the GWOSC events, GW150914 and the MIST tracks) keep the module
shape their instruments have always read - `SPECTRA`, `EVENTS`, `TRACES`,
`TRACKS` and their decoders, byte for byte - with `PACK`, the manifest's
runtime fields, beside it in place of the private provenance object each used
to carry. The two compilations are content modules written by hand, whose
values' sources are in `js/data/realSystemSources.js`, with no `PACK` (below).

**Pack modules carry no decoder.** Every pack is decoded by `js/observation.js`,
which turns `PACK` and `SERIES` into the one in-memory observation every
measured series shares:

- `x` and `y`, with names, units and the time system;
- `err`, one sigma;
- `source`, which says what the data is and who to credit.

Each series names its encoding (`SERIES.encoding`). A series in an encoding
this build doesn't know is refused, not guessed at.

## The TESS HD 209458 pack

| | |
|---|---|
| Pack | `tess-hd209458-s56-lc`, version 1.0.0 |
| Source | TESS SPOC 2-minute light curve, sector 56, TIC 420814525, pipeline `spoc-5.0.96-20230729`, from MAST |
| Raw product | `tess2022244194134-s0056-0000000420814525-0243-s_lc.fits`, 2,039,040 bytes, SHA-256 `1b76b4a4…99e9`; not committed |
| Kept | 18,791 of 20,079 cadences (1,288 flagged by `QUALITY`, none non-finite) |
| Series | 1,882 twenty-minute bins in 5 runs (3 bins with fewer than 3 cadences dropped); flux as int16 ppm, error in 5 ppm steps |
| Time | BTJD (BJD − 2457000), TDB |
| Check | folding on 3.52474859 d (Knutson et al. 2007) gives a central depth of 0.01592, against (Rp/Rs)² = 0.0146 (Torres et al. 2008), within the 0.003 limb darkening allows |
| Module | 11,063 bytes as committed (it carries its `reductions` since SDK 1.1.0, and its `citations` since 1.6.0); 9.1 KB minified before the citations |
| Rights | public domain (NASA mission data); acknowledge TESS and MAST and cite doi:10.17909/t9-nmc8-f686. See NOTICE |
| Offline | `optional`: precached at install, and a failed fetch does not fail the install |
| Used by | the observatory (`/observatory/`), as its time series |

No lesson uses the pack yet; the observatory opens it (OBSERVATORY_WORKSPACE_DESIGN.md).
It is the foundation the Exoplanet Observatory (Prompt 24) builds on. It reaches the
page only through `builtin:data/tess-hd209458-s56`, so opening a lesson or the
front door never downloads it; a test holds that. The bins are 20 minutes, as
the gate recommended:

- **What they cost:** half the bytes of 10-minute bins.
- **What they keep:** the same depth, to within 10⁻⁴.
- **What they lose:** ingress and egress, about 25 minutes each, are rounded
  to a bin.

A lesson that measures the ingress shape has a reason to change the bin width,
and pays for the bytes when it does.

### Budget

- **Start-up** is unchanged: 818.3 of 830 KB.
- **Deferred** grows by 9.0 KB: 4158.7 to 4167.7 of 4180 KB, with no ceiling
  raised.
- **Routes:** every one is within its ceiling in both configurations. The
  front door and every lesson fetch the same bytes as before.

The next pack will find 12.3 KB of deferred room. That is roughly one more
pack of this size, not two.

## The TESS HD 209458 aperture pack

The same light curve file's third extension: the 11 × 13 pixels read out
around the star, and which of them the light curve summed. It is the
observatory's image, and the answer to where the light in the light curve came
from.

| | |
|---|---|
| Pack | `tess-hd209458-s56-aperture`, version 1.0.0, `dataType: image` |
| Raw product | the light-curve pack's file, the same pin |
| Pixels | 143, as the archive has them: 85 edge (value 257), 35 background (261), 23 optimal aperture (267) |
| Bits | TESS Science Data Products Description Document (NASA/TM-2018-220036), table 15: 1 collected, 2 optimal aperture, 4 background, 8 flux-weighted centroid, 16 PRF centroid, 32 to 256 CCD outputs A to D |
| World coordinates | the extension's TAN projection (CRPIX, CRVAL, CDELT, PC), 19.4 arcseconds a pixel |
| Encoding | `image-uint16/1`: little-endian 16-bit pixels, row by row from the lowest (the FITS order); `js/observation.js` decodes it |
| Check | the optimal aperture holds the 23 pixels the header's `NPIXSAP` counts; all 143 were collected; the flux-weighted-centroid pixels, projected through the WCS, centre 7.13 arcseconds from the target, against a pixel of about 19 |
| Module | 4,719 bytes as committed, with its `citations` (SDK 1.6.0) |
| Rights, offline | as the light-curve pack; a second pack in the same capability package (`gravitas.tess-hd209458-s56` 1.1.0) |

The file carries no description of its own bits, so the meanings are the data
products document's, recorded with their table number in the manifest and the
runtime copy (`image.bitsSource`). Two of the meanings are also checked
against the file itself: every pixel has bit 1, as `NPIXMISS = 0` says, and
bit 2 is on exactly the `NPIXSAP` pixels.

### Budget, with the aperture pack

- **Start-up** is unchanged: 818.3 of 830 KB.
- **Deferred** grows by 2.7 KB, 4169.1 to 4171.8 of 4180 KB, with no ceiling
  raised: the aperture module is a lazy chunk the builtin registry names, and
  the light-curve module carries its reductions (175 bytes). No page loads
  either until it is asked for.
- The next pack will find 8.2 KB of deferred room.

## Series encodings

`js/observation.js` decodes every pack's series, in the browser and in Node
alike, and refuses an encoding it does not know rather than guessing.

| Encoding | What it holds | Range | Since |
|---|---|---|---|
| `binned-relative-flux/1` | equal time bins as runs of bin indices; flux as little-endian int16 ppm about 1; error as one byte in steps of `errStepPpm` | ±3.3%: a transit | the first pack |
| `binned-relative-flux/2` | the same, with the flux in steps of `fluxStepPpm` (a whole number, 1 to 1,000) | ±3.3% × the step: ±65% at 20 ppm | SDK 1.2.0, for a pulsating star |
| `image-uint16/1` | little-endian 16-bit pixels, row by row from the lowest | 0 to 65,535 | SDK 1.1.0 |
| `table-columns/1` | a table of sources, one entry per column: `offset + step × k` for the little-endian int16 or int32 `k`, the type's most negative value for a missing one | the column's range in steps: 65,535 or 4.3 × 10⁹ | SDK 1.4.0, for a catalog |

`table-columns/1` is decoded by its own module, `js/tableObservation.js`, not
by `js/observation.js`: that one loads with the catalog page, whose every byte
is budgeted, and no catalog pack is a table. Each column's step is the
rounding the pack's definition states it can stand (a magnitude to the
millimag, a position to 0.04 arcsec), and the manifest records, per column,
the type chosen and the largest rounding the encoding made
(`tools/data-packs/table-columns.mjs`).

`/2` is a new version rather than an optional field on `/1`: a reader of `/1`
would take a stepped flux for parts per million, and misread it by the step.
The pipeline refuses to clip a value that does not fit, so a star that varies
too much for `/1` fails to build rather than building wrong
(`tools/data-packs/tess-light-curve.mjs`).

## Catalog packs: NGC 2420 and MIST's isochrones

The stellar-populations suite (STELLAR_POPULATIONS.md) needed tables, a data
type the format did not have: `dataType: "catalog"`, encoded as
`table-columns/1`. Three packs use it, built by `tools/build-data-packs.mjs`
from `tools/data-packs/ngc2420.mjs`.

| Pack | What it holds | Raw products | Check |
|---|---|---|---|
| `sdss-dr18-ngc2420-photometry` | the 2301 stars SDSS DR18 measured cleanly within 14.14 arcmin of NGC 2420, with g, r and their errors | three SkyServer answers: the table, its counts by flag, and every detection near the core | stars brighter than g = 20 are more than 1.2 times as dense 3 to 8 arcmin out as 10 to 14.14 arcmin out (1.335) |
| `sdss-dr18-ngc2420-segue` | the 517 SEGUE spectra within 30 arcmin, with SSPP's velocity, temperature, gravity and [Fe/H] and their errors, and g and r | two SkyServer answers: the table and its counts | the median velocity within 10 arcmin is within 5 km/s of 74.0 (74.79) |
| `mist-sdss-isochrones` | MIST v1.2 isochrones in SDSS g and r at [Fe/H] −0.5, −0.25 and 0, log age 9.0 to 9.6: 1410 points | `MIST_v1.2_vvcrit0.0_SDSSugriz.txz`, 79,889,196 bytes | a 1 M☉ star on the solar-metallicity main sequence at log age 9.6 is within 0.1 dex of log L = 0 and 0.01 dex of the Sun's log Teff |

What they prove about the format:

- **SkyServer dates its answers,** so the SDSS pins are in the canonical form
  `data-lines` (the answer without its comment lines), as the VizieR pins
  are; the first packs to use a canonical pin.
- **A selection a survey made is a reduction, stated.** The photometry's
  reductions say that SDSS's standard photometry has almost nothing at the
  cluster's crowded center (3 detections within 2 arcmin in PhotoObjAll) and
  that its brightest giants are saturated; the SEGUE pack's, that its targets
  were chosen by color and magnitude and that one plate could not place two
  fibers within 55 arcsec. The checks were chosen not to depend on the
  missing core.
- **A model is a pack too,** with `origin: "model"`: the isochrones say what
  they are wherever the Observatory shows them. MIST states no license;
  `no-license-stated` carries the basis for shipping a thinned subset.
- **No capability package ships them** (`capability: null`). They are the
  Observatory's alone, opened by its fixtures, so main.js, which reaches the
  builtin registry, never reaches them; the service worker precaches them as
  optional, like the page that opens them (`tools/build-service-worker.mjs`).

## Packs from outside the core

A data pack need not be built in. `extensions/su-dra-tess-s15/` is one built
with the SDK alone, from a raw MAST product, and served by the curated catalog
for a reader to install (CATALOG.md): SU Draconis, an RR Lyrae star, whose
light swings from 0.77 to 1.46 of its median every 0.66 days. It is the first
`/2` pack. Its build script pins the raw file as the built-in packs do, and
`npm run catalog:check` holds the committed archive to it.

`extensions/kepler-13-tess-s14-sap/` and `-pdcsap/` are two more, for the
Exoplanet Observatory's guides (EXOPLANET_OBSERVATORY.md): Kepler-13, a pair of
nearly equal stars 1.2 arcseconds apart in one TESS aperture, one of which a
planet transits every 1.76 days. They are one raw file
(`tess2019198215352-s0014-0000000158324245-0150-s_lc.fits`, sector 14) read two
ways, and the first packs to use two options SDK 1.3.0 added to
`binTessLightCurve`:

- **`flux: 'SAP'`** reads SAP_FLUX and SAP_FLUX_ERR instead of PDCSAP's: the
  light in the aperture as collected, every star's in it, before SPOC removes
  systematics and the other stars' share. The record names the column
  (`fluxColumn`).
- **`crowding: true`** records the LIGHTCURVE header's CROWDSAP (the share of
  the aperture's light SPOC gives the target: 0.5492385 here) and FLFRCSAP
  (the share of the target's light the aperture holds: 0.92097801), and the
  runtime record carries them as `crowding`. The Observatory lists them among
  the reductions.

Without either option a pack is written exactly as before, so
`TRANSFORM_VERSION` did not move and every built-in pack still rebuilds byte
for byte. Each states a folded-depth check (`foldedDepth`, now exported by the
SDK): the PDCSAP pack's depth at 1.763588 days (Esteves et al. 2015), and the
SAP pack's against that depth times CROWDSAP, which is what a corrected and an
uncorrected light curve of a crowded star should differ by.

## Commands

```bash
npm run packs:data
```

Fetches any missing raw product into `.packs-cache/` (gitignored), checks it
against its pin, then writes the manifest and the runtime module. It also
fetches the raw files of the catalog's extension packs (`node tools/catalog.mjs
fetch`), each from the pin its `build.mjs` exports, so `packs:provenance` can
rebuild them too.

```bash
npm run packs:check
```

No network, no cache. It checks that:

- every manifest is valid;
- each runtime module is the file its manifest records, by size and SHA-256;
- `PACK` is exactly the manifest's runtime fields;
- the series decodes cleanly and passes the pack's scientific check with the
  recorded result;
- the capability package agrees.

In the release gate this is the `packs-structure` step.

```bash
npm run packs:provenance
```

Rebuilds every pack from the cached raw product and compares both files byte
for byte. It fails, rather than passes, when the cache is empty. In the release
gate this is the `packs-provenance` step, which runs under `--provenance`. The
four datasets with commands of their own are rebuilt by those
(`npm run spectra:provenance`, `gwosc:provenance`, `gw:provenance`,
`stellar:provenance`), each a step of the same gate against its own cache, so
an archive that is down is reported for itself; `node tools/build-data-packs.mjs
--check --require-sources --all` rebuilds all sixteen at once.

## The datasets that came before packs

Roadmap II Prompt 62 brought every dataset under the format. What each one
gained, and what it lost:

| Dataset | Before | Now |
|---|---|---|
| SDSS DR18 spectra | its own builder; the record a JS module (`sdssSpectraProvenance.js`) the SDK refused | manifest `data-packs/sdss-dr18-stellar-spectra.json`; the capability package names it, so `installedDataPack()` reads it; the readout's credit and the Observatory's citations come from `PACK` |
| GWOSC five events | its own builder; the record a JS module (`gwoscEventsProvenance.js`) | manifest `data-packs/gwosc-five-events.json`, which also pins the five GWOSC event-API answers the catalog values were copied from and holds every copied value to them; each catalog paper now cites its own DOI, where the record had paired it with its strain release's |
| GW150914 figure data | the hash of whatever was read, recorded, nothing compared on a fresh download; `PROVENANCE` inside the browser's module | the eight inputs pinned by size and SHA-256 (the hashes the record carried; a fresh download on 2026-10-01 matched each); manifest `data-packs/gw150914-figure-data.json`; the module carries `PACK` and `FINDINGS` |
| MIST v1.2 tracks | a fresh download used unchecked; `PROVENANCE` inside the browser's module | the tarball checked against its pin on every read; the tracks extracted into a fresh directory on every build; manifest `data-packs/mist-v12-tracks.json`; the module carries `PACK`, whose `model` the Stellar Lab reads |
| HD 209458 and the Sun and Jupiter | no citation at all | `origin: compilation`, `data-packs/exoplanet-systems.json`; every value held to a pinned table and cited, field by field, in `js/data/realSystemSources.js` |
| TRAPPIST-1 | three papers named in a comment, one of them wrongly | `origin: compilation`, `data-packs/trappist-1-system.json`, the same way |
| NGC 3198 | a literal inside `js/darkMatterWidgets.js` | `origin: synthetic`, `data-packs/ngc3198-synthetic-curve.json`, with its generating model and scatter; `js/data/ngc3198Synthetic.js` |

The browser's data did not change: every data export of the four older
modules (the spectra, the events, the traces, the tracks, their grids, ids and
decoders) is byte for byte what it was, and only the provenance object beside
it became `PACK`. Each keeps its own cache directory (`.sdss-cache/`,
`.gwosc-cache/`, `.gw-cache/`, `.mist-cache/`) and its own commands, which
now run the same build, check and rebuild as every pack
(`tools/build-data-packs.mjs` `runDataset()`), with the transformation in
`tools/data-packs/`. Raw products are fetched and checked by the one helper,
`tools/data-packs/pinned.mjs`, which replaced the four builders' copies.

### The compilations: a citation per value

`js/data/exoplanetSystems.js` and `js/data/trappist1.js` are written by hand,
and stay so, byte for byte but for a comment. Every real-system object in them
has its sources in `js/data/realSystemSources.js`, keyed by where the object
is: `[{text, doi | bibcode | url, fields}]`, each paper and the fields it
gives. `tools/data-packs/compilations.mjs` reads every value and finds it in a
pinned copy of the table it cites - the NASA Exoplanet Archive's Planetary
Systems table, SIMBAD, NASA's Jupiter fact sheet, JPL's mean elements - and
fails unless the module's value is the published one rounded to the digits it
keeps, and unless the sources name that table's paper for that field. The
manifest records each value, the row and column it was found in, and what the
table said.

A value no cited table gives is marked `approximate, unsourced` rather than
given a source it does not have: three in the Sun-Jupiter comparison (the
Sun's spectral type, Jupiter's 5.2028 AU, which is JPL's 5.20288700 cut short,
and its eccentricity, 0.0489 against the fact sheet's 0.0487) and one for
TRAPPIST-1 (planet g's period). A unit (one solar mass) or a choice the
scenario makes (the Sun seen from ten parsecs) is said to be one.

The same module holds the sources of every real-system table in
`js/world/build.js` - the Solar System's planets, asteroids and comets, the
Kuiper belt, the habitable-zone and resonance worlds - compared on 2026-10-01
with NASA's fact sheets, JPL's elements and the JPL Small-Body Database. Many
of the small bodies' values match none of them and say so. The author check's
attribution rule (`tools/authoring/realSystems.mjs`) requires an entry for
every one of these objects, naming every value on it; a captured frame's
provenance line prints a one-line summary for the scenario on screen
(`SCENARIO_SOURCES`, js/sandboxTools.js); the model page lists them all.

**Why beside the objects and not on them.** Roadmap II Prompt 62 asks for a
`sources` field on every real-system parameter object. Written onto the
objects, the sources cost the experiment runner's route 14.6 KB and a request
it does not have (1122.7 KB and 48 requests against ceilings of 1109 and 47),
because the objects live in modules every world builder loads. No ceiling is
raised to fit a feature, so they live in a module nothing in the application
imports, and the objects are unchanged. Putting them on the objects is a
decision for Carl: it needs the experiments route's ceiling raised.

### NGC 3198: synthetic, and a pack so it can say so

The curve *The Missing Mass* is fitted to is a model: a bulge, a Freeman disc
and a pseudo-isothermal halo built to resemble NGC 3198 as van Albada et al.
(1985) describe it - their 2.68 kpc disc scale length (2.6 here), a curve flat
near 150 km/s, measured to 30 kpc - plus a scatter of a few km/s written out
point by point, so the fit has an exact answer. It is a pack of
`origin: synthetic`, whose manifest and runtime copy record that model
(`model.name`, `model.parameters`, `model.scatter`), so the panel, the lesson
and the model page's badge can all say what it is.

No published NGC 3198 curve ships beside it. Van Albada et al.'s table 2 and
the THINGS curve (de Blok et al. 2008) are candidates for an `observed` pack,
and their redistribution terms have not been confirmed; a pack is not added
before its rights are.

## Rules the format enforces

The rules are in `tools/data-packs/schema.mjs`; the tests are
`tests/dataPacks.test.js`.

- **Synthetic data is refused unless the manifest records the model that made
  it**: `model.name`, `model.parameters` and `model.scatter`. Its runtime copy
  must carry `model` too, so no interface can show the numbers without saying
  what they are. Until Roadmap II Prompt 62 synthetic data was refused
  outright; binding decision 7 of that roadmap admits it on these terms, and
  DECISION_REGISTER.md records the change for review.
- **Every raw input is pinned**, by byte count and SHA-256, or by a named
  canonical form for sources that aren't byte-stable.
  - Pins are compared on a fresh download as well as on the cached copy, and
    a mismatch is never cached (`tools/data-packs/pinned.mjs`).
  - A VizieR response dates itself in its header, so its pin is taken over
    `data-lines`: the lines that are not `#` comments.
- **Licences.** A pack's `license.status` is one of `public-domain`, `cc0`,
  `cc-by-4.0`, `attribution-requested`, `no-license-stated`,
  `cc-by-nc-3.0-igo` or `restricted`, and `license.statement` is always required.
  - `attribution-requested` and `no-license-stated` must say why
    redistribution is defensible (`license.basis`).
  - `restricted` is refused.
  - **Non-commercial: `cc-by-nc-3.0-igo`** (CC BY-NC 3.0 IGO, the Gaia data
    licence) needs the statement (quoting the terms with their URL and the date
    read), a `basis`, and the marker `license.nonCommercial: true`, which is in
    the runtime copy (`license` is a runtime field), so an interface shows it
    beside the data. It exists for one pack, `radiation-gaia-bandpasses`, by the
    owner's exception (`DECISION_REGISTER.md` D-RAD-01), and is accepted only for
    Gravitas's own packs: the validator refuses it in a contributed pack, and
    the catalog's and `sdk review`'s accepted licences (`ACCEPTED_LICENSES`)
    contain no non-commercial licence. A non-commercial pack is labelled
    wherever it is shown, is kept in a pack of its own so that no other data is
    covered by its terms, and must not be bundled into a commercial
    redistribution of Gravitas: take it out (its loader, its
    service-worker entry and its module).
- **Transformations carry a version.** A tool that changes what it writes
  bumps its `TRANSFORM_VERSION`. `packs:check` fails when a manifest names a
  different version from the tool's.
- **Time series state their time system:** scale, reference and unit.
  **Coordinates state their frame.**
- **An image states its shape** (`image.width`, `image.height`), and an image
  of bit fields says what each bit means and where that is documented
  (`image.bits`, `image.bitsSource`).
- **The runtime copy is the manifest's runtime fields.** `reductions` and
  `image` are optional runtime fields since SDK 1.1.0: a copy that carries one
  must match the manifest, and one that leaves out `reductions` is warned
  about, not refused (sdk/README.md, the deprecation policy). An image must
  carry `image`.
- **Derived files live under `js/data/`**, so the service worker, the
  architecture check and the budgets all see them.
- **Encodings refuse what they can't hold.** A flux outside int16 ppm, or an
  error outside the error byte, fails the build instead of being clipped.

## Adding a pack

1. **Write the transformation** as a pure function in `tools/data-packs/`,
   with its own `TRANSFORM_VERSION`. Test it on a synthetic input built in the
   test, as `tests/dataPacks.test.js` builds FITS files.
2. **Add an entry to `PACKS`** in `tools/build-data-packs.mjs`. It needs:
   - the raw pin, the options, and the published values the check uses;
   - `build()`, which returns the runtime metadata, the rest of the manifest
     and the series - or, for a pack whose module keeps a shape of its own,
     `render(PACK)`, which writes that module around the `PACK` it is given;
   - `validate()`, the scientific check. It runs on the decoded pack, so CI
     checks the science without the raw file.
3. **Write the capability package** and add its `builtin:` entry to
   `js/platform/builtins.js`.
4. **Add the acknowledgements.** NOTICE gets the scope and the citations the
   archive asks for; LICENSES.md gets the scope.
5. **Regenerate the dependent files:**
   - `npm run packs:data`
   - `npm run capabilities`
   - `node tools/build-service-worker.mjs`
   - `npm run docs:sync -- --full`
6. **Check the budget.** The module's minified size is added to the deferred
   budget. Say in the PR what it cost. Raising a ceiling is a separate,
   reviewed decision.

Don't commit a raw product. Don't commit a derivative before its redistribution
rights are confirmed and recorded in the manifest.

## Not supported

| What | Why |
|---|---|
| FITS in the browser | The reader (`tools/data-packs/fits.mjs`) is a developer tool, and the observatory does not import FITS (OBSERVATORY_WORKSPACE_DESIGN.md says why). A browser reader would need to refuse every form it doesn't read, and to be tested on files it hasn't seen. One precondition is met: the reader checks every header against the file before it allocates anything (VO_ARCHIVE_GATE.md, finding 4; `tests/fitsHeaderBounds.test.js`). |
| FITS images of more than two axes, tile compression, variable-length arrays, ASCII tables, repeated columns | The reader lists these in `unread` and refuses a request for one. It reads headers, the scalar binary-table columns of types L, B, I, J, K, E and D with `TSCAL`/`TZERO` applied, and two-dimensional images of every BITPIX but 64 with `BSCALE`/`BZERO` applied. |
| A radial-velocity pack | The gate gave the HARPS HD 75289 series a B. It still needs ESO programme IDs in its credit and a confirmed time scale. It is not the TESS star, so it can't pair with this pack. It waits for a lesson that needs it. |
| Student files as packs | A reader's CSV or JSON opens in the observatory, through a preview and a mapping in which every unit is chosen, as `origin: imported`. It is not a pack, and nothing turns one into one. |
| Live archive queries | No lesson depends on an archive being up. Raw products are fetched only by `npm run packs:data`. |
