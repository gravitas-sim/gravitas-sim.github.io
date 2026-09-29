# Investigation Composer

A page at `/studio/lesson/`, the Studio's second, for composing a guided
investigation as data. It covers what students read, predict, explore, measure
and answer, which scenario and instrument each step opens, what a student sees
after a wrong answer, and every word in English and Spanish, side by side. It
writes a `gravitas.investigation-pack/1` file. The pack is judged by the same
checker every lesson in the repository passes (`js/authoring/rules.js`), and
it previews in the real lesson engine.

Nothing an author writes is ever run:

- A pack has no field that can hold code.
- A numeric variant's answer comes from a relation Gravitas computes.
- A file that tries to carry anything else is refused before any rule reads
  it.

The round-trip gate ([STUDIO_ROUNDTRIP_GATE.md](STUDIO_ROUNDTRIP_GATE.md)) is
why the composer works this way. A lesson in the repository is a module, and
some of what is in one is code: a measure step's feedback, a live readout, a
computed field. The composer writes the data part, which is 77% of the steps
the built-in lessons have, using the step types the engine already runs and
the answer checks it already has.

## What an investigation holds

| Field | What it is |
|---|---|
| `format`, `formatVersion` | `gravitas.investigation-pack` and `1` |
| `id`, `version` | Lower-case words joined by hyphens, not the id of a lesson Gravitas has; a version such as `1.0.0` |
| `title`, `subtitle`, `summary`, `level` | What the lesson card shows |
| `duration` | A range the card prints, such as `20-25 min` |
| `thumbnail` | The scenario whose picture the card shows; blank for the first step's |
| `objectives` | From one to eight |
| `prerequisites` | Up to six: a Gravitas lesson, or a text |
| `seed` | Which variant of each bank question this investigation asks |
| `bank` | Questions a step can ask by name (below) |
| `steps` | From 2 to 80 |

Every text is `{en, es, esOf}`: the English, the Spanish, and the digest of
the English the Spanish was written from.

## Steps

| Type | What a student does | What it holds |
|---|---|---|
| `read` | Reads | Title, text, tip |
| `predict` | Commits to an answer before seeing | Prompt, options, the right one, why, and the later step where it is marked (`reveal`) |
| `explore` | Tries something | A checklist of one to eight things |
| `measure` | Records numbers from the instrument | One to six named fields, each with a label and unit |
| `question` | Answers: a choice, a number or a short text | Inline, or `from` a bank item |

Every step may also bind:

- a scenario (a built-in scenario, and a seed word such as `orbit-1` that
  makes it the same world every time);
- whether it starts paused, and the zoom;
- an instrument (a widget id).

The first step opens a scenario. The last is a read or explore step that
closes the investigation. A numeric answer checks its unit through the answer
parser: the graded unit, and the others it accepts.

**Remediation** is the one branch the format has, bounded to one level:

- A step with `when: {sid, is: "incorrect"}` (or `"correct"`) is shown only
  when that earlier graded step has an answer that is wrong (or right) as the
  student reaches it. Otherwise Next and Previous pass over it.
- The step it names is graded, is reached by every student, and is not
  remediation itself.
- A remediation step is never the last step, and never where a prediction is
  marked.
- Remediation on a held prediction comes after the step where it is marked
  (`whenHeld`). Before then the prediction has no verdict, and a step that Next
  showed or passed over would give the verdict away before the experiment runs.
- So every student walks a straight line to the end, with detours.

The engine does this in `stepApplies` in `js/investigations.js`, and
`js/authoring/rules.js` checks it as `interaction/when`. The engine also treats
a held prediction as unanswered until its reveal step is reached, as the lesson
panel does, so a preview staged before `whenHeld` existed still holds it. A
lesson without `when` moves exactly as before.

## The question bank

A bank item is one question with everything an inline question has: the
prompt, options or answer, tolerance and unit, staged hints (the idea, then
the method), a worked answer, misconceptions, a rubric for a short answer.
Four things are added:

- **Identity.** A stable id and an integer version. The version goes up with
  any change that could change a grade, so a recorded answer can always be
  matched to what it answered.
- **Scoring.** Points from 1 to 10, and whether the first or the best attempt
  counts. Inline questions declare the same.
- **Accessibility.** Whether it can be answered from its text alone. When it
  cannot, a note is required for a reader who cannot use the simulation.
- **Variants.** Controlled ways of asking the same question:
  - A choice question may **shuffle** its options, and its answer follows the
    right option.
  - A numeric question may take its inputs from a **relation** Gravitas
    computes, with a list of input sets. The question writes each input as
    `{a}`, `{M}` and so on; each variant fills them in, with a decimal comma in
    Spanish.

| Relation | Answer | From |
|---|---|---|
| `kepler3` | P = √(a³ / M), in years | a in AU, M in solar masses |
| `circularSpeed` | v = 29.78 √(M / a), in km/s | a in AU, M in solar masses |
| `escapeSpeed` | √2 times the circular speed | a in AU, M in solar masses |
| `inverseSquare` | (r2 / r1)², a pure number | r1 and r2 in AU |
| `transitDepth` | 100 (Rp / Rs)², in percent | Rp in Earth radii, Rs in solar radii |

Each input has a range within which the relation, and a lesson about it, make
sense. A bank item's variants are **equivalent by construction**:

- They share one relation, one unit and one relative tolerance.
- Every input is inside its range.
- The question states every input in every language, and names no input the
  relation lacks.
- No two variants' answers are within the tolerance of each other, so a
  copied answer is marked wrong.

`tests/composer.test.js` holds every variant to being graded right inside its
tolerance, right in another accepted unit, and wrong outside.

Which variant an investigation asks is decided by its seed and the item's id
(mulberry32 over the seed xor a digest of the id). **The same seed always
builds the same investigation.** A class section given another seed gets other
numbers for the same question.

## Translation

Each text shows English and Spanish side by side, with its state:

- **translated;**
- **no Spanish yet;**
- **Spanish out of date:** the English has changed since the Spanish was
  written from it. Writing the Spanish records a digest of the English it
  translates, so the digest mismatches when the English moves.

The Translation list names every text still to do and opens its card. The
compiler writes the index-aligned Spanish shadow the engine expects
(`js/data/investigations/es/`). The pack itself keeps each text's languages
together, so inserting a step cannot mis-align a translation, the hazard the
round-trip gate recorded.

## Checks

Checks run in two stages:

1. **The format's own rules** (`js/platform/investigation.js`,
   `js/platform/questionBank.js`), each on the field it is about. They start
   with a structural guard that refuses a hostile file for one reason and
   stops:
   - a prototype key (`__proto__`, `constructor`, `prototype`);
   - anything that is not plain data;
   - a file larger or deeper than any pack needs.

   Prose may use lesson prose's four tags (strong, em, sub, sup) and the
   entities lessons use. It may not use other markup, links or script URLs.
2. **The lesson checker** (`js/authoring/rules.js`), once the file is sound,
   over the compiled lesson and its Spanish shadow. Every rule a lesson in the
   repository passes applies, except the ones that need what a pack does not
   have yet: the manifests, the instructor guide and the generated answer key.

A problem blocks saving, exporting and the preview. A warning does not.

## Estimates, the answer key and the report

- **Estimate.** Words at 300 a minute, plus half a minute a read step, two an
  explore, three a measurement, one a prediction and a quarter a question.
  These allowances were fitted to the durations the 24 built-in lessons
  declare:
  - the estimate's median is their declared midpoint;
  - individual lessons range from 0.6 to 2.2 times it;
  - the page cautions only outside half the card's lower bound or 2.2 times
    its upper one.

  The step counts by type, the graded steps and the total points come with it.
- **Answer key.** What an instructor sees: every graded step, its answer
  (tolerance and unit, the variant, where a prediction is marked, or the
  rubric) and its points.
- **Report evidence.** A sample of the lab report a student hands in
  (`js/labReport.js`), made from the answer key, as a PDF.

## Preview

**Preview as a student** opens the investigation in the page, in the real
lesson engine: `/?author=draft-<id>&view=student`. The composer leaves the
compiled draft in this browser (`js/authoring/preview.js` `DRAFT_KEY`), and
the engine installs it through the same door a packaged lesson uses. **Open
with the author bar** is the same with the authoring preview's bar and
findings. Nothing is read from or written to saved progress, as in every
authoring preview, and nothing is published.

## Files

- **Save** writes `<id>.investigation.json`. Opening it again changes nothing.
  A file whose id belongs to a different draft asks first: replace, keep both
  (as `<id>-2`), or cancel.
- **Save the question bank** writes `<id>.bank.json`
  (`gravitas.question-bank/1`). Opening a bank file adds its new questions to
  this investigation's bank. It adds nothing that is already there, and it
  refuses a question with the same id and different contents.
- **Export the lesson file** and **Export its Spanish file** write the two
  modules a maintainer vendors, one file per click. To add one to Gravitas:
  1. `npm run author:new -- --id=<id> --title="…"` for the six registration
     points ([CONTRIBUTING.md](CONTRIBUTING.md)).
  2. Replace the scaffolded `js/data/investigations/<id>.js` and
     `js/data/investigations/es/<id>.js` with the exported files.
  3. Write the instructor guide.
  4. Run `npm run author:check` and `npm run author:walk`.

Drafts are kept in this browser after every edit, with undo and redo from the
buttons or the keys, and a raw JSON view that refuses what does not parse.

## What authors may ask for that it does not do

These are recorded rather than built in this change:

- **Per-student variants at run time.** A variant is chosen when the
  investigation is built, from its recorded seed. Different students of one
  build see the same numbers; different builds, or seeds, differ.
- **Points in the running lesson.** Scoring is declared, shown in the answer
  key and carried in the file, but the engine, the lab report and the
  submission results do not add points up yet.
- **Branching beyond one level:** paths that rejoin later, loops, or
  conditions on more than one answer.
- **Code:** feedback computed from a measurement (`validate`), live readouts
  (`probe`), computed fields, plots, importing from a selected body, and the
  Kepler lesson's `ellipse` and `wedges` renderers.
- **Scenario packs from the Scenario Studio as a step's world.** A step opens
  a built-in scenario. The settings a lesson's setup may override, and an
  instrument's preset values, are not offered either.
- **Instructor guidance as data.** The encrypted instructor guide's
  expectations and flow are keyed by step number and written in
  `js/data/instructorContent.js`.
- **Publishing from the browser.** An investigation reaches students through a
  maintainer (above), not from this page. There is no catalog entry for packs
  yet, and no SDK extension type.

## Where it lives

| Path | What it is |
|---|---|
| `studio/lesson/index.html` | The page (its own bundle in `build.js`) |
| `js/composerPage.js` | The page controller |
| `js/platform/investigation.js` | The format and its rules |
| `js/platform/checker.js` | The structural guard and text rules every Studio format shares |
| `js/platform/questionBank.js` | Bank items and the bank file |
| `js/platform/relations.js` | The vetted relations |
| `js/composer/compile.js` | Pack to lesson and shadow, variants, scoring, status, estimate, module export |
| `js/composer/api.js` | This build's scenarios, instruments, lessons, units and entities, and the whole verdict |
| `js/composer/widgetIds.js` | The instrument ids, as data |
| `js/composer/example.js` | "Reading an orbit", every part of the format |
| `js/studio/model.js` | History, drafts and differences, shared with the Scenario Studio |

Tests:

- `tests/investigationPack.test.js`: the format, the bank, the relations and
  hostile files.
- `tests/composer.test.js`: the compiler, the lesson checker's verdict,
  variants, translation, the estimate's fit, module export and the words.
- `e2e/composer.spec.js`: the page, against the sources and dist, in all three
  engines.
