# Observation data packs

A data pack is data that a lesson shows as coming from outside Gravitas, with
the record of where it came from and what was done to it. The data might be an
observation, a published model grid, or values compiled from papers. The format
is `gravitas.observation-data-pack/1`, decided by
[OBSERVATION_DATA_PACK_GATE.md](OBSERVATION_DATA_PACK_GATE.md). There is one
pack so far: TESS's light curve of HD 209458.

## Three files per pack

| File | What it is | Who reads it |
|---|---|---|
| `data-packs/<id>.json` | **The manifest**: sources, citations, rights, the raw product's pin, every transformation step with the tool version, units, time system, masks, assumptions, reductions, and the scientific check and its result | the build, the tests, and anybody checking the work; never the browser, never precached |
| `js/data/observations/<name>.js` | **The runtime module**: `PACK` holds the metadata an interface shows, cut from the manifest's `RUNTIME_FIELDS`; `SERIES` holds the encoded numbers. Content only, with no imports | the instrument that shows it, through the capability runtime |
| `capabilities/<name>.json` | **The capability package** (`gravitas.capability-package/1`): ships the module, names the manifest as its provenance, gives the module's offline class, lists the checks | `tools/capabilities.mjs`, the service worker's precache, the resolver |

The manifest and the runtime module are generated in one run of
`tools/build-data-packs.mjs`. The capability package is hand-written and
checked against them: the pack id, the provenance path and the offline class
must agree.

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
| Module | 10,710 bytes as committed (it carries its `reductions` since SDK 1.1.0); 9.1 KB minified |
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
| Module | 4,131 bytes as committed |
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

## Commands

```bash
npm run packs:data
```

Fetches any missing raw product into `.packs-cache/` (gitignored), checks it
against its pin, then writes the manifest and the runtime module.

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
gate this is the `packs-provenance` step, which runs under `--provenance`.

## Rules the format enforces

The rules are in `tools/data-packs/schema.mjs`; the tests are
`tests/dataPacks.test.js`.

- **Synthetic data is refused**, however complete its manifest is. A lesson
  that needs made-up numbers labels them itself. A pack is how a lesson says it
  is showing something real.
- **Every raw input is pinned**, by byte count and SHA-256, or by a named
  canonical form for sources that aren't byte-stable.
  - Pins are compared on a fresh download as well as on the cached copy, and
    a mismatch is never cached (`tools/data-packs/pinned.mjs`).
  - A VizieR response dates itself in its header, so its pin is taken over
    `data-lines`: the lines that are not `#` comments.
- **Two licence statuses need a stated basis.** `attribution-requested` and
  `no-license-stated` must say why redistribution is defensible. `restricted`
  is refused.
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
     and the series;
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

## Migrating the datasets that came before packs

Four datasets were built before this format. Each has its own tool, provenance
shape and decoder. None is converted by the change that introduced packs. When
one is migrated, it follows the rule for its kind. The gate's retrofit gives
exactly what each dataset still lacks.

| Dataset | Rule |
|---|---|
| SDSS DR18 spectra (`js/data/spectra/`) | Closest to a pack already: a capability package, a separate provenance module, pinned raw hashes, payload hashes. Give `tools/build-sdss-spectra.mjs` a version and have it write the manifest beside the provenance module. Point the package's `provenance` at the manifest. Keep `sdssSpectraProvenance.js` as the per-spectrum record. Add a `spectrum` encoding to `js/observation.js` when an instrument reads spectra through it. |
| GWOSC five events (`js/data/gw/gwoscEvents.js`) | The same as SDSS: pins and payload hashes already exist. It needs a tool version, a manifest and a capability package. The per-event record stays where it is. |
| GW150914 figure data (`js/data/gw/gw150914.js`) | First **pin** the eight inputs. Today the tool records the hash of whatever it read and compares nothing on a fresh download. Move the fetch to `pinnedBytes()`, record a retrieval date, then as above. |
| MIST v1.2 tracks (`js/data/stellar/mistTracks.js`) | First make a fresh download check its pin: `ensureGrid()` checks only a cached tarball. Record a retrieval date. It is `origin: model`, not an observation, and the manifest says so. |
| TRAPPIST-1 and the exoplanet systems (`js/data/trappist1.js`, `js/data/exoplanetSystems.js`) | `origin: compilation`. They need a small tool that writes each value from a cited table, and a citation per value. The exoplanet module has none. Until then they stay content modules and are not packs. |
| NGC 3198 in *The Missing Mass* | **Not a pack: the curve is synthetic.** The lesson must say so on the fitting panel, as the MOND panel already does. Published curves (for example THINGS, de Blok et al. 2008) would be a new pack, with its own gate. |

## Not supported

| What | Why |
|---|---|
| FITS in the browser | The reader (`tools/data-packs/fits.mjs`) is a developer tool, and the observatory does not import FITS (OBSERVATORY_WORKSPACE_DESIGN.md says why). A browser reader would need to refuse every form it doesn't read, and to be tested on files it hasn't seen. |
| FITS images of more than two axes, tile compression, variable-length arrays, ASCII tables, repeated columns | The reader lists these in `unread` and refuses a request for one. It reads headers, the scalar binary-table columns of types L, B, I, J, K, E and D with `TSCAL`/`TZERO` applied, and two-dimensional images of every BITPIX with `BSCALE`/`BZERO` applied. |
| A radial-velocity pack | The gate gave the HARPS HD 75289 series a B. It still needs ESO programme IDs in its credit and a confirmed time scale. It is not the TESS star, so it can't pair with this pack. It waits for a lesson that needs it. |
| Student files as packs | A reader's CSV or JSON opens in the observatory, through a preview and a mapping in which every unit is chosen, as `origin: imported`. It is not a pack, and nothing turns one into one. |
| Live archive queries | No lesson depends on an archive being up. Raw products are fetched only by `npm run packs:data`. |
