# The label golden (Prompt 144)

Prompt 144 moves number formatting onto `js/format.js`, unit strings onto
`js/units/registry.js` and typed numbers onto `js/answerParse.js`, one consumer
family at a time, and it requires that a label which was right prints the same
afterwards. This is what "the same" is measured against. It is a recording of
every number and unit a family prints, made before any file of the family
changes, so that a migration is judged by a diff and not by a reading.

This is the harness and the first family's recording: the lesson data under
`js/data/investigations/`, every lesson with its depth laid in, in English and
Spanish. The instrument readouts and the other families are recorded by their
own PRs, with the same recorder.

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
