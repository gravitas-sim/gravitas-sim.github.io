# The observation workspace

`/observatory/` opens an observation and shows it as a plot, a table and, for an
image, the image, all at once. A selection made in one view is the selection in
all of them. The reader can mask, annotate, crop, fold, bin and convert, undo
any of it, and save exactly what they did.

It is built around one canonical shape, `gravitas.observation/1`. Every kind
of data decodes into it: a curated data pack, a dataset Gravitas has carried
since before packs, a reader's own file, or a file the workspace saved.

The page is its own bundle, like `/experiments/`. The simulation never imports
it, and it never imports the simulation. Each observation is fetched only when
it is opened.

## The canonical shape: `gravitas.observation/1`

`js/observatory/schema.js` holds the rules, and `validateObservation()` names
every broken one by path.

| Field | What it holds |
|---|---|
| `kind` | `time-series`, `spectrum`, `image` or `table` |
| `id`, `title` | A stable id (`pack:tess-hd209458-s56-lc@1.0.0`, `builtin:sdss-dr18-g`, `import:<hash>`) and a title |
| `object` | name, RA and Dec in degrees, and the frame, or null |
| `origin` | `observed`, `model`, `compilation` or `imported` |
| `source`, `credit`, `license`, `retrieved`, `citations` | Where it came from and who to credit. Required for everything but an import, which is the reader's own |
| `reductions` | What was done to it before it arrived: binning, dropped cadences, averaging, anything computed rather than measured |
| `columns` | `{ id, name, unit, role, of?, level?, bits?, values }` |
| `axes` | The columns a plot draws by default |
| `time` | For a time series: its column, format (JD, MJD, BJD, BTJD, or time since the first row) and scale (TDB, TT, TAI, UTC or unknown) |
| `spectral` | For a spectrum: its column, quantity (wavelength or frequency), medium (vacuum, air or unknown) and frame |
| `image` | For an image: width, height, a TAN world coordinate system, and the columns that hold x, y and the value |
| `masks` | `{ id, label, source, rows }`: rows left out of the views and every summary, and kept, marked, in every save |
| `annotations` | `{ id, rows, text }`: a note on a run of rows |

### The contracts every view and change keep

- **Units** (`js/observatory/units.js`).
  - A column's unit is a canonical id from a small registry, scaled by a power
    of ten where the data is (SDSS's `1e-17 erg/s/cm2/Angstrom`).
  - `''` means dimensionless, a ratio. `null` means **not stated**. These are
    different claims.
  - Conversion is by a factor, within one dimension: Å to nm, d to h, ppm to a
    fraction, W m⁻² nm⁻¹ to erg s⁻¹ cm⁻² Å⁻¹.
  - Refused, with the reason:
    - a flux per wavelength to a flux per frequency, which needs each sample's
      wavelength;
    - magnitudes, which need a zero point;
    - anything whose unit is not stated.
  - A unit is never guessed. Short ids need their exact case (`M` is not a
    meter), and an import's header suggests a unit but never applies one
    (below).
- **Time.** Formats that share a system differ by a constant and convert
  exactly (BTJD = BJD − 2457000; MJD = JD − 2400000.5). Changing system,
  observatory JD to barycentric BJD, needs the target's position and the
  observer's, and is refused.
- **Uncertainty.** A column with role `uncertainty` is one standard deviation
  of the column it is `of`, in its unit. `lower` and `upper` are offsets to
  the edges of an interval holding `level` of the probability: GWOSC's are
  the "lower and upper limits of the 90% confidence error bar" (its API
  documentation). A value column with none has no uncertainty recorded, and
  the page says so rather than drawing a plot without bars as though it were
  exact.
- **Missing values** are NaN in a number column and null in a text one. They
  are never zero and never dropped. They are counted, listed under "What you
  are seeing", and shown as "missing" in the table.
- **Masks and quality flags.** A mask is rows by index, left out of what is
  computed and drawn hollow, never deleted. A `flag` column holds bit fields
  and says what each bit means and where that meaning is documented.
- **Coordinates** are degrees with the frame named. An image's pixels reach
  the sky through a FITS TAN projection (`js/observatory/wcs.js`,
  Calabretta & Greisen 2002). Any other projection has no sky position here,
  rather than a wrong one.
- **Provenance** travels with the observation: its source, credit, license,
  citations and reductions, and in a save every change made here, in order.

### Changes, and how they are undone

`js/observatory/transforms.js`. The workspace never edits an observation. It
keeps the one it opened and a list of changes, and every view shows
`replay(source, changes)`:

- **Every change is reversible without an inverse.** Undo is the list one
  shorter, redo one longer (`js/observatory/history.js`, 200 deep).
- **A change is checked before it joins the list** (`whyNot()`), so the list
  never holds one that fails, and a refusal says why.
- **A change that reduces is said out loud.** Replay returns a note for every
  crop, fold, bin and normalization, and the page lists them.

| Change | Kinds | What it does |
|---|---|---|
| `crop` | time series, spectrum, table | Keeps the rows in a range of a column; masks and notes follow their rows |
| `mask`, `unmask` | all | Leaves rows out, and takes a reader's mask away; one that came with the data stays |
| `annotate`, `unannotate` | all | A note on a run of rows, and taking it away |
| `convert` | all | A column's unit, and its uncertainty's with it |
| `timeFormat` | time series | JD ↔ MJD, BJD ↔ BTJD, by the exact offset |
| `normalize` | time series, spectrum | Divides a column and its uncertainty by the median of its unmasked, present values |
| `fold` | time series | Phase on a period from an epoch, in [−0.5, 0.5); phase becomes the axis |
| `bin` | time series, spectrum | Means in equal bins along the plotted axis. The uncertainty is the points' combined one where they have one, otherwise the standard error of their scatter, and the note says which |
| `restFrame` | spectrum | Wavelengths divided by 1 + z (frequencies multiplied), once |

A selection is not a change. Moving it is looking, not editing, and undo
doesn't step through it. A change that renumbers the rows (a crop or a bin)
starts a new selection, and the page says so.

### Linked views

One selection (`js/observatory/selection.js`) holds a set of rows and a
focused row. An image's rows are its pixels. Every view changes it, names
itself when it does, and redraws from it.

| View | Pointer | Keyboard | Accessible as |
|---|---|---|---|
| Plot (SVG) | Drag selects the rows between; a click focuses the nearest | ← → move along the axis, Shift extends, Space adds or removes, Home/End, Page Up/Down, Escape clears | A labeled group; the focused point is described in words |
| Image (canvas) | Click toggles a pixel, drag selects a rectangle | Arrows move, Shift extends a rectangle, Space adds or removes, Escape clears | The focused pixel's value, decoded bits and RA/Dec, in words |
| Table (ARIA grid) | Click selects, Shift-click a run, Ctrl/⌘-click adds | ↑ ↓ move, Shift extends, Space adds or removes, Page Up/Down, Home/End, Escape clears | `aria-rowcount`, `aria-rowindex`, `aria-selected`, a page of 50 rows at a time |

The table turns to the page that holds a row focused elsewhere. The plot draws
every selected point on a layer of its own, above the others, so a point the
drawing thinned out still shows when it is selected.

### Honest display

"What you are seeing" lists, in order:
- what was reduced before the data arrived (the source's own words, marked as
  English);
- every change made here that reduced it;
- how many points the plot drew;
- masked and missing rows;
- the uncertainty, or its absence;
- the time system or the spectral medium and frame.

A long series is drawn as the lowest and highest point in each pixel column,
which keeps every peak and dip, and the list says "1,192 of 1,882 points are
drawn". The table and both saves hold all of them.

### Saves

`js/observatory/export.js`. Both are deterministic: the same source and changes
give the same bytes, with no clock, locale or screen in them.

- **JSON** is a `gravitas.observation/1`: the observation as the reader sees
  it, every row, masked ones marked. Its `workspace` block holds where it was
  opened from, the changes in order and, when there are changes, the
  observation as it was opened. Read back, the changes are made again to that
  source. The whole session returns, undo included, and the page checks that
  the replay gives the observation the file holds.
- **CSV** holds the rows as they stand. Each header is `name (unit)`, spelled
  as the registry reads it, so importing it offers the units back. A `masked`
  column is 0 or 1, and a missing value is an empty field. It is written
  through `js/csv.js`, so text that looks like a spreadsheet formula is
  disarmed.

### Import

`js/observatory/import.js`. Two steps, kept apart on purpose.

1. **`read()` describes the file and decides nothing.** It reports the
   delimiter (comma, tab or semicolon, sniffed), whether there is a header
   row, and any leading `#` comments, which is where an astronomical table
   often names its units. For each column it reports how many values are
   numbers, how many are missing and how each was spelled, the range, and a
   unit its header names, as `name (unit)` or `name [unit]`.
2. **`build()` takes the reader's mapping.** The reader says what each column
   is and chooses its unit. For a time series they choose the format and
   scale; for a spectrum, the medium and frame. Every choice starts at
   "Choose…".

The rule between them:
- **No unit is assumed.** "No unit (a ratio)" and "unit not stated" are
  choices, not defaults. A header's unit is a button marked "from the
  header", pressed or not.
- **A malformed file is refused**, with the line: a ragged row, an unclosed
  quote, a repeated or empty column name, text where a number should be.
  Decimal commas are recognized and offered, never applied silently.
- **Missing values are recognized, and listed:** blank, NaN, null, NA, N/A,
  None, - and --.
- **Limits:** 5 MB, 200,000 rows and 50 columns. A phone is not asked to hold
  a survey.
- **An imported observation is `origin: imported`,** and the page says the
  numbers are the reader's and unchecked.

## Built-in observations

Compact, authentic, and each already shipped for a lesson. None is resampled
on the way in.

| Kind | Observation | Rows | Fetched when opened | What was done to it before |
|---|---|---|---|---|
| Time series | HD 209458, TESS sector 56, SPOC PDCSAP (data pack `tess-hd209458-s56-lc`) | 1,882 | 10.7 KB | 20-minute bins; 1,288 flagged cadences and 3 thin bins dropped; flux to 1 ppm |
| Spectrum | Four SDSS DR18 stars, A0, G, K, M (the SDSS bundle) | 1,271 each | 18.8 KB for all four | Three archive samples averaged into one (resolution the spectrograph did not deliver); no per-sample uncertainty in the bundle; vacuum, heliocentric, not shifted to rest (z is given, and `restFrame` uses it) |
| Table | Five GWOSC events, catalog values with 90% intervals (GWTC-1 and GWTC-2.1) | 5 | 59.4 KB | Copied as GWOSC serves them. The values live in the module that also holds the events' strain, so opening the table fetches that too; splitting them is future work |
| Image | The same TESS light curve's aperture mask (new data pack `tess-hd209458-s56-aperture`) | 143 pixels | 4.2 KB | None: the pixels are the archive's. RA and Dec of each pixel center are computed here from the file's WCS, and say so |

The image pack is new in this change and made the way Prompt 12 makes packs,
from the same pinned raw file as the light curve (DATA_PACKS.md). Its bit
meanings come from the TESS Science Data Products Description Document
(NASA/TM-2018-220036, table 15). Two of them are also checked against the
file: every pixel has bit 1, as `NPIXMISS = 0` says, and bit 2 is on exactly
the 23 pixels `NPIXSAP` counts.

A few numbers the fixtures show come from the SDSS and GWOSC provenance
records: each star's position and redshift, and the catalog citations. The
browser never loads those records, because a test keeps them out of `js/`.
They are copied into `js/observatory/fixtures.js`, and
`tests/observatory.test.js` holds each copy to its record.

## What it supports

### Data kinds

| Kind | Supported | Not yet |
|---|---|---|
| Time series | x in any time unit, with a format and scale; one-sigma uncertainty; fold, bin, crop, normalize, convert, change the time format | Changing time system (JD UTC ↔ BJD TDB); unevenly sampled periodograms; more than one value column plotted at once |
| Spectrum | Wavelength or frequency axis, medium and frame; rest-frame shift; bin, crop, normalize, convert | Air ↔ vacuum conversion (needs a refractive index model); flux per wavelength ↔ per frequency; continuum fitting; line measurement |
| Table | Numeric and text columns; one-sigma and interval uncertainties; any two numeric columns as the axes; crop, convert, mask, annotate | Joins; filtering by expression; per-value citations (the source has none); sorting the table view |
| Image | 2-D pixel grids; bit-field images with decoded legends (categorical colors); other images on a gray scale, linear or square-root; TAN sky coordinates; pixel and rectangle selection | Other projections (SIN, CAR, ...: no sky position is offered, rather than a wrong one); color-map choice; 3-D cubes; stacks and blinking; images from a reader's file |

### File formats

| Format | Read | Written | Notes |
|---|---|---|---|
| CSV (comma, tab or semicolon separated) | Yes, through the preview and mapping | Yes, the rows as they stand | RFC 4180 quoting; `#` comment header; decimal commas on request; 5 MB / 200,000 rows / 50 columns |
| JSON rows (an array of objects) or columns (an object of equal-length arrays) | Yes, through the same mapping | No | Nested values are refused |
| `gravitas.observation/1` JSON | Yes, whole: a session with its changes | Yes | Deterministic; reads back to the same bytes |
| Gravitas data packs | As built-in observations, through the platform | No | `dataType` light-curve and image are decoded (`js/observation.js`) |
| FITS | No, in the browser | No | The data-pack tool reads FITS tables and 2-D images offline (`tools/data-packs/fits.mjs`). A browser reader has to refuse every form it does not read, and be tested on files it has not seen: tile compression, variable-length arrays, WCS distortions and scaled integers. That is a gate of its own, not a corner of this one |
| VOTable, HDF5, ASDF, netCDF | No | No | Out of scope: Prompt 18's archive gateway gate decides what a live archive may bring in |
| Excel (.xlsx) | No | No | Save as CSV first; the preview then shows what was read |

## Budgets

Two measures, and both are recorded.

### Transfer, as a route

`tools/route-budgets.json` counts the JavaScript a first visit fetches before
the page is usable, with the service worker blocked:

| Configuration | JavaScript | Requests | Ceiling |
|---|---|---|---|
| Sources, as Pages serves them | 252.3 KB | 28 | 253.6 KB, 29 |
| Build (`dist/`) | 119.4 KB | 2 | 120.0 KB, 3 |

The application's own budgets are unchanged at start-up (818.3 of 830 KB). The
deferred total grows by 2.7 KB (4169.1 to 4171.8 of 4180) for the aperture
pack's lazy chunk, which the builtin registry names, and the light-curve
module's reductions. No ceiling is raised.

### A reader's cost, per observation

`npm run bench:observatory` (`tools/observatory-bench.mjs`) opens every
observation as two readers:
- **desktop:** 1280 × 800, at the machine's own speed;
- **mobile:** 375 × 812, with the CPU slowed four times, Chrome DevTools'
  mid-tier phone.

The observatory runs on the page's thread, so the throttle slows everything
it does, and none of the mobile figures is modeled. Measured on an Intel Core
i5-10500, Chromium 151, load average 3 to 5.

| | Desktop | Mobile (CPU × 4) |
|---|---|---|
| Page, first visit (everything: HTML, CSS, fonts, JavaScript) | 606.7 KB, ready in 114 ms | 606.7 KB, ready in 244 ms |
| Page's JavaScript heap | 1.4 MB | 1.5 MB |
| Opening an observation | 29–57 ms | 65–248 ms |
| Heap with one open | 1.7–2.1 MB | 1.8–2.2 MB |
| Moving the focused row (the handlers' work) | 0.9–1.8 ms | 3.9–7.1 ms |
| A drag selection (the handlers' work) | 0.4–3.7 ms | 1.1–14 ms |
| Either, input to the painted frame after | 30–32 ms | 27–35 ms |
| A bin of 1,882 rows / its undo | 8.7 / 13.1 ms | 44.6 / 51.9 ms |

The frame after the paint is at the display's floor, two frames at 60 Hz,
however little the work. Even the throttled phone's heaviest action, the undo
of a bin of the longest series, is a quarter of the 200 ms that counts as a
good response.

`tools/observatory-budgets.json` holds the ceilings (`--check`):
- the handlers' work: twice the measured;
- input to paint: 100 ms;
- bytes and heap: about 10% of room.

It is a manual instrument, not a registry check, because timings taken on a
shared machine are not evidence.

## Offline

The page's HTML is precached as an optional file, and its modules and every
built-in observation are under `js/`, precached with the rest. The service
worker serves a precached page for its directory URL.

So once Gravitas has been opened and its worker installed, `/observatory/`
opens with no network, and so does every observation it offers
(`e2e/observatory.spec.js`). The worker is installed by the application, not
by document pages. A reader who has only ever opened `/observatory/` has no
offline copy yet.

## Tests

- **`tests/observatory.test.js`** (39):
  - units: parse, convert and refuse;
  - the schema, every fixture valid and each broken contract named;
  - every change with absolute numbers, refusals, and undo and redo;
  - the shared selection;
  - import: CSV, TSV, semicolons, comments, missing values, malformed files,
    JSON rows and columns;
  - save and read back as a session, the same bytes;
  - two formulations of TAN agreeing to a milliarcsecond;
  - the fixtures held to their provenance records.
- **`tests/dataPackImage.test.js`** (12):
  - the FITS reader on images: order, BSCALE/BZERO, and more than two axes
    unread;
  - the aperture reader's refusals;
  - the aperture pack: valid, pinned, decoded, its check;
  - the SDK schema knowing every data type the tool does;
  - a 1.0.0 runtime copy still agreeing, with a warning.
- **`e2e/observatory.spec.js`** (7), against the sources and `dist/`:
  - every observation opens;
  - drag and keyboard selection linked across views, with the words for the
    focused row and pixel;
  - undo, redo and deterministic saves read back;
  - import preview, refusal to guess, and malformed files;
  - axe in both languages;
  - offline (sources only).

## Decisions

1. **Hand-drawn SVG and canvas, no plotting library.** Chart.js is 168 KB of
   canvas that a screen reader cannot enter, and the views must be linked,
   keyboard-driven and honest about thinning. What they draw is small enough
   to draw directly.
2. **Replay, not inverse operations.** A change is reversible by being
   replayable from the source. A save is exact because it is a source and a
   list, and a numerical inverse cannot drift.
3. **A save embeds its source.** A read-back that re-applied the changes to
   the changed data would fold a folded series. One that dropped them would
   lose the session.
4. **Selections are not changes.** Undo steps through edits, not glances.
5. **No FITS in the browser in this change**, and no image import. The
   prompt says not every professional format belongs here, and FITS is the
   one whose half-reading does the most harm.
6. **The image fixture is a new data pack**, built from the light curve's own
   pinned file, rather than a picture from somewhere else: it answers where
   the light curve's light came from.
7. **The GWOSC table loads the whole event module (59 KB).** Splitting the
   catalog values into their own module means changing a generator whose
   provenance can only be checked with its source cache, which this machine
   does not have. Recorded here as the one fixture that fetches more than it
   shows.
8. **Model-layer messages are English.** A reason a change cannot be made, or
   what is wrong on line 3 of a file, is written by the workspace's modules
   in English and shown marked `lang="en"` inside a translated frame.
   Everything the page itself says is in both catalogs.
9. **Offline follows the site's worker**, which the application installs. A
   document page that installed an 11 MB precache on its own would be a
   product decision, not this one.
