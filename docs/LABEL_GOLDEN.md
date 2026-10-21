# The label golden (Prompt 144)

Prompt 144 moves number formatting onto `js/format.js`, unit strings onto
`js/units/registry.js` and typed numbers onto `js/answerParse.js`, one consumer
family at a time, and it requires that a label which was right prints the same
afterwards. This is what "the same" is measured against. It is a recording of
every number and unit a family prints, made before any file of the family
changes, so that a migration is judged by a diff and not by a reading.

This is the harness and two families' recordings: the lesson data under
`js/data/investigations/`, every lesson with its depth laid in, in English and
Spanish, and the instrument widgets (`js/*Widgets.js`), every readout in both
locales. The other families are recorded by their own PRs, with the same
recorder.

```
npm run label:golden                                 does the recording agree with the lessons?
npm run label:golden -- --regenerate-label-golden    rewrite the fixtures (on purpose, in its own commit)
npm test -- tests/labelGolden.test.js                the same check, with the proofs below
```

## What is recorded

`tests/labelGolden/fixtures/lessons/<lesson>.json`, 60 files, and
`tests/labelGolden/coverage.json`.

**Static**, from the lesson as the application lays it (the Spanish shadow
over the English, `js/data/investigations/i18n.js`):

- every `unit` string, by path (851 in English);
- every label, axis title, placeholder and hint that is short and carries a
  digit, by path (556 in English; the 216 that read differently in Spanish are
  listed beside them);
- every numeric answer with its tolerance and unit, and the decimals of every
  derived field (157 answers).

**Dynamic**, what the lesson's own functions print. Each function is called
as the engine calls it, with a fixed synthetic world standing in for the live
one:

- a step's `probe` rows, in four worlds (nothing selected, an eccentric
  orbiter, a circular one, a far one);
- a step's `validate` messages, for about 70 sets of field values per world:
  nothing read (NaN), ones, a negative, zero, seven seeded sets over four
  decades (four sorted ascending), and the selected body's own distances,
  speeds, period and eccentricity dealt out to the fields, exactly and twelve
  per cent high, plus a few readings the lessons hard-code a check against;
- the row an "import from selection" button fills, and a derived field's value
  when it is text.

The world is built from the engine's own `js/orbital.js`, `js/units.js` and
`js/blackHolePhysics.js` on literals; the values come from a generator seeded
by the step id; nothing reads a clock. A message is kept as a digest of every
distinct result plus the first two of each shape (the text with every digit
masked), so a reviewer reads what is printed and the digest moves when a single
digit anywhere does. Both locales are run: the functions are lesson machinery
that a shadow never replaces, so their output is the same in both, and the file
says `same` (a difference would be recorded in full the day one appears).

## What it can tell apart (held by the test)

- a different number of decimals, and a true minus sign where the hyphen was,
  are different recordings;
- every `toFixed` and `toPrecision` call in the family ran: 101 of 101, by
  line and column, which is the number the ratchet counts. A call the
  recording cannot reach is listed in `coverage.json` and fails the test;
- a naive swap of every `toFixed` for `js/format.js`'s `fixed()` is not
  identity: it changes 20 of the 287 steps that print, in 8 lessons (17
  probes, 3 checks), because `fixed()` writes a true minus (U+2212) where
  `toFixed` writes a hyphen and an empty string where `toFixed` writes `NaN`.
  A wrapper that calls the original `toFixed` changes nothing. So the move is a
  per-site decision, and the golden says which.

## Precision, checked apart from identity

Identity says the label did not change; it does not say the label was right.
`precisionFindings` lists, and never fixes, two things:

- a numeric answer written to more than one place below the leading digit of
  its own tolerance (4.07 within 0.06 is fine; 3.605 within 0.12 is not);
- a value written finer than the uncertainty stated beside it ("x ± u", "x,
  give or take u").

Six answers are found, all of the first kind, and are proposed corrections for
Carl, not changes: `binary-star-planets` `circumbinary-boundary` (3.605 within
0.12), `color-and-temperature` `peak-of-4000` (724.4 nm within 15),
`gravity-assist` `the-ceiling` (8.686 km/s within 0.2), `hohmann-transfer`
`first-burn-size` (5.815 km/s within 0.15), `second-burn-size` (4.598 km/s
within 0.15) and `transfer-time` (422.7 days within 12).

## What it found about the family

Nothing in the lesson-data family could be migrated by this PR; see D-R10-24.

- All 101 `toFixed`/`toPrecision` calls are in 15 files under
  `js/data/investigations/`, and every one of them is a source of the
  instructor bundle (`tools/instructor-freshness.mjs`): editing it makes the
  committed ciphertext stale, and rebuilding needs the passphrase a session
  does not have.
- 31 of the 32 files with unit literals are in that closure too; the
  exception, `js/data/gw/gw150914.js`, holds 8 dimension tags (`strain`,
  `v/c`, `schwarzschild-radii`) that are compared and never printed, and the
  registry cannot take them without adding dimensions the formula language then
  refuses (`js/formula/units.js` refuses a registry dimension it has not been
  taught).
- A lesson data module imports nothing, by design. Measured with
  `tools/route-budget.mjs` on a scratch copy with one import added to
  `keplers-laws.js`: `js/format.js` costs no request on the lesson routes
  (it is already there; 0.1 KB) but one request and 12.5 KB on `/studio/course/`
  in the published sources (46 to 47 against a ceiling of 46); `js/units/registry.js`
  costs one request and 11.7 KB on the lesson routes (kepler 146 to 147) and on
  `/studio/course/`. The build configuration stays inside every ceiling (798.1
  of 830.0 KB initial, 1995.7 of 2044.4 KB deferred) because a bundle absorbs
  the module. The cost screen (`tools/key-registry-free.mjs`) names five pages
  for `js/format.js`; the measurement confirms one. Request ceilings are exact
  and are not covered by the standing size approval.
- Of the 155 unit literals in `js/data`, 69 are in Spanish shadows whose
  `unit` strings no lesson ever reads: `unit` is a key `mergeTranslation` never
  replaces, and the golden shows the Spanish units equal the English ones in
  every lesson. They are dead text, and deleting them is the one identity-
  preserving ratchet drop (69) that needs only the rebuild. Of the other 86,
  72 are in the English lessons and are display phrases or spellings, not
  registry units (`× lunar tide`, `Earths`, `° per orbit`, `× 10¹⁰ M☉`, `AU³`,
  `yr²`), so naming one would change the label; 8 are `gw150914`'s tags and 6
  are the mission key's `km²/s²` and `million km`.

# The second family: the instrument widgets

`tests/labelGolden/widgets.mjs` records what an instrument prints, the way a
student meets it (the engine reads `draw`, `readout` and the controls in
`js/investigations.js` `paintTool`): 100 widgets in 27 families,
`tests/labelGolden/fixtures/widgets/<family>.json` and
`tests/labelGolden/coverage-widgets.json`. The test is
`tests/labelGoldenWidgets.test.js`; `npm run label:golden` records both
families and `-- --regenerate-label-golden` rewrites both.

**What is recorded**, per widget and locale:

- `readout`: the rows under the canvas (`label`, `value`, `emphasis`);
- `canvas`: the text `draw()` paints (axis ticks, marker labels, captions),
  caught from a stand-in 2-D context (`fillText`, `strokeText`);
- `controls`: the number beside each slider, written the way `paintTool()`
  writes it (`format(value)`, or `toFixed(decimals ?? 2)` and the unit);
- `static`: title, note, each slider's label, unit and range, preset and
  action labels, preset notes, and the precision findings.

**How it is read.** A step's `tool` spec decides which rows show, so every
spec any lesson (depth laid in, in each locale) gives a widget is read, and the
bare spec, and one spec per family that asks for every row name its readouts
choose among (`has('masses')`). The bare spec is read at the step's defaults,
at both ends of every control, at the middle, at five places along each control
with the rest at their defaults, and at eight seeded places; a step's own spec
at the four corner sets. An animated widget is reset and stepped 24 frames
(`run`), each button is pressed, the widget stepped and the button pressed
again (`actions`), and each preset is pressed (`presets`). A widget that reads
the live simulation is given the lesson recording's four synthetic worlds; the
chaos divergence instrument is given seven synthetic experiments (every verdict
it can write). The data packs behind the sky, Galactic and variable-star
families are served from the repository by a stand-in `fetch`. Nothing is random
and nothing reads a clock; the same module records under Jest's jsdom and, for
`npm run label:golden`, under the same jsdom in Node.

**What it can tell apart (held by the test)**, as for the lessons: a different
number of decimals, a true minus where a hyphen was, a widget that throws; every
`toFixed` and `toPrecision` call in `js/*Widgets.js` reports its line when it
runs, and `coverage-widgets.json` lists the ones no case reached (those sites
are not moved: the golden cannot vouch for them); a naive swap of every
`toFixed` for `fixed()` is not identity (it writes a true minus and `''` for a
number it cannot write), and a wrapper that calls the original is.

## What it found about the widgets, and what moved (D-R10-26)

`fixed()` differs from `toFixed` in two ways: it writes U+2212 for a hyphen and
`''` for a number it cannot write (`toFixed` writes `NaN`). While recording,
each call site keeps whether it ever wrote a hyphen or saw a non-finite number
(`withWidgetCoverage` in `tests/labelGolden/widgets.mjs`). A site moved to
`fixed()` only when the recording reached it, it wrote no hyphen and saw no
non-finite number, or its value goes straight into `withUnit`, which already
writes the true minus. After the move the recording was regenerated and no
fixture changed: that is the identity proof. The file
`tests/labelGolden/coverage-widgets.json` now lists the 134 calls that are still
`toFixed` or `toPrecision`; the 36 of them the recording cannot reach stay.

- Moved, 111 calls in 7 files: `binaryWidgets` 21, `blackHoleWidgets` 9,
  `chaosWidgets` 7, `darkMatterWidgets` 24, `observingWidgets` 10,
  `tidalWidgets` 16, `transitWidgets` 24. The ratchet falls from 608 to 497.
- Stayed, 23 `toPrecision`: `decimal()` groups the digits, drops the exponent
  form and writes `-` for a non-finite number, so it is not the same text.
- Stayed, 10 that write a hyphen where `fixed()` writes a true minus (a
  typography change, Prompt 282's decision).
- Stayed, 34 the recording cannot reach: 26 in `resonanceWidgets` (a live
  Jovian system the recorder does not build), 5 in `gwWidgets`, 2 in
  `binaryWidgets`, 1 in `stellarWidgets`.
- Stayed, 67 eligible calls in `gwWidgets`, `powerLawWidgets`, `gwEventWidgets`,
  `stellarWidgets`, `stellarSpectraWidgets`, `energyWidgets` and
  `habitabilityWidgets`: moving them costs about 100 bytes of gzip in the
  first-visit precache tier, whose margin is about 114 bytes
  (`tools/data-budget.json`; not covered by the standing approval).
- The 16 unit literals stay: no widget loads `js/units/registry.js`, which costs
  one request and 11.7 KB on the lesson routes.
- Requests: none on any of the 60 lessons or the measured routes; an import of
  `js/format.js` in a widget family is already paid for wherever a lesson
  runs.

`precisionFindings` is applied to everything the widgets print: 45 readings write
a value finer than the uncertainty beside it (`hubble-law`, `solar-motion`,
`rotating-disk`, `lens-passing`, `spectrum-viewer`, `completeness-lf`, and one
parsing artifact in `ccd-frames`). They are listed in the fixtures, not changed.

## The third family: lesson figures and the Observatory (D-R10-29)

`js/investigations/*`, `js/lesson/*` and the Observatory's printed labels
(`js/observatory/**`, `js/observatoryPage.js`) hold 16 `toFixed`/`toPrecision`
calls and no unit literal. `js/lesson/*` prints no number at all (its modules
draw scenes). The recording is `tests/labelGolden/investigations.mjs`
(`npm run label:golden:investigations`, fixtures in
`tests/labelGolden/fixtures/investigations/`, coverage in
`tests/labelGolden/coverage-investigations.json`, the test
`tests/labelGoldenInvestigations.test.js`). It was committed first, on its own,
before any file moved.

**What it records**, in English and Spanish:

- `ellipse`: the readout `drawEllipse` paints ("e = 0.017", "b/a = 1.000") at all
  981 positions of the eccentricity slider (0 to 0.98 by 0.001) and at each
  lesson preset;
- `plots`: `drawPlot` for the six lesson steps that have a plot (goldilocks-question,
  keplers-laws, missing-mass, power-law-gravity, tides twice), plain, on log axes
  and transformed, at the field values `record.mjs` deals out: the table under the
  figure (every cell) and the "slope" label. The tick labels are not stored: they
  are `tickLabel`'s, already on `js/format.js`, and their step is a logarithm at a
  whole number;
- `fieldNumbers`: `formatFieldNumber` over a ladder with signs, `-0`, ties,
  large and tiny values, `NaN` and `Infinity`, at 0 to 4 decimals, both locales;
- `aladin`, `rounded`, `fixtures`, `archive`: the archive link, the committed
  numbers of an answer key, the crowding note a TESS pack carries (seven CROWDSAP
  and FLFRCSAP pairs through the pack reader's own code) and the archive panel's
  position label, mounted in jsdom against a stand-in `fetch` that serves the
  repository's Sesame fixture with the position changed (six positions).

**Per-site evidence.** While recording, each call site keeps whether it ever
wrote a hyphen or was handed a number that is not finite
(`withSiteCoverage`; the `hazards` of the coverage file). A site moves only if
the recording reached it, it wrote no hyphen and saw no non-finite number, and
the import it needs is free. Twelve of 16 were reached.

**Node 20 and Node 24.** The figures take `Math.log10` and `Math.pow`. A first
version stored the tick labels, and a unit in the last place on one `log10` call
in sixteen turned a "10" into "10.0" (a tick step is `10 ** floor(log10(raw))`,
and a logarithm at a whole number may land either side of it). So ticks are not
stored, the one computed residual (a slope that should be zero) is written as a
zero of the same shape (`maskNoise`), and the test perturbs `log10`, `pow`, `log`,
`exp` and `atan2` by one unit in the last place on every sixteenth call and
requires that no surface moves. Recording twice gives the same bytes.

**What moved (4 calls, ratchet down by 4, 497 to 493 with the widgets family merged).** `stepView.js` 541 and 544 (the
ellipse readout: the slider never gives a negative or a non-finite eccentricity)
and `archivePanel.js` 257 and 258 (the label's right ascension and the absolute
declination: `readSesame` refuses a position outside 0 to 360 degrees and 90, and
a `NaN`). After the move the recording was regenerated and no fixture byte
changed. `stepView.js` and `archivePanel.js` import `js/format.js`; the first
already did, the second loads on a toggle like `fitPanel.js` and `comparePanel.js`
(which already import it), and no route figure of `tools/route-budget.mjs` moved
in either configuration. Cost in the first-visit precache: +28 bytes gzipped
(5,175,201 to 5,175,229 of 5,175,296).

**What stayed (12 calls), with the reason:**

- `stepView.js` 643, 801, 1194 (3): the plot table, the slope and a computed
  field's text write a hyphen where `fixed()` writes a true minus (and the
  field's text is read back by `parseFieldNumber`). Prompt 282's decision.
- `archivePanel.js` 94 (2): the Aladin link is a URL; a typographic minus would
  break it. Machine text, not a label; it stays for good.
- `fixtures.js` 143 (2): eligible (reached, no hyphen, no non-finite number) but
  `js/format.js` is not loaded by `/observatory/` at start: the import costs one
  request and 12.5 KB in the sources (observatory 17 to 18 requests against a
  ceiling of 17; 186.7 to 199.2 KB) and one request in the build (5 to 6 against
  5). Request ceilings are outside the standing size approval, so it waits.
- `guides/core.js` 320 (1): an instructor-bundle source, not edited for 144.
- `guidePanel.js` 330, `measurePanel.js` 491, `fitPanel.js` 557,
  `observatoryPage.js` 512 (4): the recording cannot reach them (a clock, a file
  size written by the page's own script, two roundings inside panel closures that
  need a mounted observation and pipeline). `guidePanel.js` and `measurePanel.js`
  round with `Number(x.toPrecision(n))`, which `roundSig` is on every input
  (tested over a ladder with non-finite values and `-0`); they wait for a
  recording that reaches them. `observerControls.js` 134 is a CSS `scaleY`, not a
  label, and is not in this family.
- Three raw parses wait: `guides/core.js` `parseAnswer` (bundle source) and two
  in `import.js` (a data file's decimal comma; `parseNumber` refuses what is
  ambiguous, which is a behaviour change).
- `js/investigations.js` (4 calls, the engine beside the folder) is outside the
  three named folders and its import is not free on one page.

**Findings for Carl, not changed.** Spanish writes a decimal comma in a computed
field (`formatFieldNumber`: "1,00") and a decimal point in the figure's tick
labels, its table and the ellipse readout ("e = 0.017"); Prompt 282 decides.
The archive label gives a position to five decimals of a degree (0.04
arcsecond), finer than Sesame's own coordinates need but not finer than they
state; nothing here writes a value beyond its stated uncertainty.
