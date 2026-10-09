# Instructor materials v2

Roadmap II, Prompt 79. The generated guides and keys, regenerated for the
platform as it is now: both languages, per investigation, per depth and per
Activity template, inside the static encryption model (no server, one
passphrase, ciphertext in the repository).

## The inventory

150 documents, from 66.

| Cut | English | Spanish | Notes |
|---|---|---|---|
| General (adopter's guide, curriculum map, four observatory, 3-D and mission guides with their keys) | 10 | 0 | English only; see Staged |
| Investigation guide (24) | 24 | 24 | Spanish: headings, the lesson's own words, the prose that has a shadow |
| Investigation key, every depth (24) | 24 | 24 | |
| Key per depth (4 lessons with deeper steps, 3 depths) | 12 | 12 | `<id>-key-<depth>`: numbered as that student sees it |
| Key per Activity format (6 formats) | 6 | 6 | `activity-<id>-<format>-key`: cut to the format's steps, numbered as in the full key |
| Activity guide (3) and worksheets (5) | 8 | 0 | English; see Staged |

`tools/build-instructor-materials.js` writes the counts into
`materials.manifest.json` (`inventory`) on a real build, and
`tests/instructorDocs.test.js` holds them.

## Sources

| What | Where | Keyed by |
|---|---|---|
| Guide prose | `js/data/instructorContent.js` (+ `.es.js` shadow, arrays by index) | lesson id, field |
| Flow table | `js/data/instructorFlow.js` (+ `.es.js`) | lesson id, **step id** (`from`, `to`) |
| Expected observations | `js/data/instructorExpectations.js` (+ `.es.js`) | lesson id, step id |
| Words around them | `js/data/instructorLabels.js` | label key, both languages |
| The lesson in Spanish | `js/data/investigations/es/*`, `depth/es/*` through `js/instructorLocale.js` | |
| Course level, textbook chapter, mathematics, prerequisites, version | `js/instructorFacts.js` from `discovery.js` and the step fingerprints | |

**Flow migration.** The flow table named its steps by a range of 1-based
numbers ("18-22"), which slid onto the wrong screens when a step was inserted
above it. It is `gravitas.instructor-flow/2` now: each block runs from one step
id to another and the printed range is worked out from the lesson.
`js/instructorFlow.js` still reads /1 (a fork's copy) through `readVersioned`;
`tools/migrate-flow.mjs` converted the 171 blocks once. The flow left
`instructorContent.js`, which the portal statically imports, so the portal's
build route went from 649.9 to 536.9 KB.

**Labels are not a message catalog.** The catalogs are deferred JavaScript that
every route's budget counts; the only readers of these words are the build and
the tests (D-TERM-02's reasoning for the document pages). The test holds the two
languages to the same keys and `{placeholders}`.

## Translation status

A Spanish document says how much of it is in Spanish: the lesson's own words
(counted as strings through `translationCoverage`), the instructor prose, and
the expected observations. A string without a shadow prints in English and
counts as not translated. The portal shows the percentage on the button. At the
time of writing no instructor prose is translated (the shadow files are empty);
the lesson shadows are 64 to 100 percent complete, the figure each document
prints. Translating is adding strings to the three `.es.js` files; nothing else
changes.

## Rubrics

A written answer may carry `rubricCriteria` beside its `rubric` sentence: one to
six criteria, each two to five levels, best first, with optional points
(`js/rubric.js`). On a reflection the criteria guide reading and mark nothing.
The key prints a Criterion / Levels table; the review page lists them beside the
response in the written-answers disclosure and in the judgment view (P77).
`rubricProblems()` fails the instructor build, and `tests/instructorDocs.test.js`
runs it over every lesson. Shipped on Orbital Energy's written answer, in both
languages, as the proof; the other written answers keep their sentence.

## The bundle

`materials.enc.json` is `v: 2`: the manifest is gzipped before it is encrypted
(`compress: 'gzip'`), because ciphertext does not compress and 150 documents
would have been an 11 MB download at unlock. The portal reads v1 and v2. The
public manifest and the freshness digest are unchanged in kind.

## Not rebuilt here

`instructors/materials.enc.json` and `materials.manifest.json` were **not**
rebuilt: that needs the real passphrase, which a session never holds. They are
stale by this prompt (`npm run instructors:check` says so) and Carl rebuilds
them with `npm run build:instructors`. Everything else was exercised through the
disposable fixture (`--fixture`, published passphrase, placeholder pages) and
`--validate` (real render, throwaway key, nothing written).

## Staged

- **A key from a pack, in the browser.** Not built. The portal's bundle is a
  single file and the key needs the pack reader, the key generator and the PDF
  writer; the clean route is a lazy chunk (`splitting` on the portal build) or a
  page of its own with a measured route row (D-BIND-07).
- **Rubric criteria in packs.** `investigation-pack/1` and `question-bank/1` carry
  `rubric` only; `rubricCriteria` needs both schemas, the SDK types, the composer
  compile and the remix field table. Lessons carry it today.
- Spanish activity guides and worksheets, the adopter's guide and the curriculum
  map (the activity teaching text has a Spanish catalog; the layout does not read it).
- The Spanish instructor prose itself.
- A guide-side accessibility section per investigation is derived (instruments
  docked, the shared statements); a per-lesson audit is not.
