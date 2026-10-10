# The Library

Roadmap II, Prompt 54. The Library is one index of everything a student or
instructor can open in Gravitas, with the same fields for every kind, at
[`/library/`](library/). Home leads into it, and the lesson browser inside the
application is the part of it that runs there.

## The record

`library/library.json` is format `gravitas.library/1`
([schema](sdk/schemas/library-1.schema.json), [FORMATS.md](FORMATS.md)).
`tools/build-library.mjs` writes it from the sources that already own each
thing, and nothing in it is typed by hand. It is a node of the generate graph
(`library`), and the gate's `library` check fails when the file, the coverage
table below or Home's Library cards differ from what the generator writes.

Every entry has the same sixteen fields:

| Field | What it is |
|---|---|
| `id` | `<kind>:<the source's own id>`, e.g. `investigation:keplers-laws`, `activity:orbital-speed/route` |
| `kind` | The noun of [PLATFORM_MODEL.md](PLATFORM_MODEL.md): investigation, activity, scenario, dataset, course, experiment |
| `format` | How it is delivered: the surface that runs it, or the classroom format it is cut to |
| `source` | The file the entry was read from |
| `title`, `summary` | `{en, es}` |
| `level` | Who it is written for: `beginner` or `intro`, the lessons' `audience` |
| `duration` | `{min, max}` minutes |
| `length` | `demo`, `period` or `long`, bucketed from the duration by the lesson browser's own rule |
| `mathematics` | What a student is asked to work out: `none`, `arithmetic`, `algebra`, `logarithms` |
| `calculation` | How many numbers there are to work out, bucketed: `none`, `some`, `lots` (the lesson browser's "Arithmetic" filter) |
| `subjects` | Subject ids, in the lessons' vocabulary |
| `prerequisites` | Library ids |
| `steps` | How many steps or items |
| `thumbnail` | A picture of it, under `images/` |
| `route` | The canonical link to the page that runs it |

A field a source does not declare is `null`, never guessed. `prerequisites: []`
means the source says there are none; `null` means it does not say.

The document also carries the `subjects` (id, label in both languages, how many
entries) and the `sequences`: the lesson browser's four curated orders and the
Observatory's two suites, each an ordered list of Library ids.

## The kinds and where each is read from

| Kind | Format | Source | Route |
|---|---|---|---|
| investigation | `lesson` | the lesson manifest in both languages, `browseData.js`, `discovery.js` | `/#investigation=<id>` |
| investigation | `observatory` | `js/observatory/guides/exoplanet.js`, `populations.js` | `/observatory/?guide=<id>` |
| investigation | `lab3d` | `js/lab3d/guides/curriculum.js` | `/3d/?guide=<id>` |
| investigation | `mission` | `js/mission/lab/curriculum.js` | `/mission/lab/?guide=<id>` |
| activity | `demonstration`, `route`, `guided`, `lab` | `js/data/activities.js`, one entry per format | `/?activity=<a>&format=<f>#activity=<a>/<f>`, as the teaching page links it |
| scenario | `sandbox` | `js/data/scenarioInfo.js` and the scenario catalogs | a seeded world link, `/#1z…`, at the seed `library` |
| dataset | `observation` | the Observatory's fixtures (`js/observatory/fixtures.js`) | `/observatory/?open=<id>` |
| dataset | `data-pack` | the catalog's data packs (`catalog/catalog.json`) | `/catalog/`, where it is installed |
| course | `course` | the built-in course packs (`js/data/courses/`) | `/course/?course=<id>` |
| course | `course-pack` | the catalog's course packs | `/catalog/` |
| experiment | `sweep` | the scenarios the experiment runner sweeps (`js/experiments/sweep.js`) | `/experiments/` |

The Observatory's guides, the 3-D lab's and the mission lab's are
Investigations, with the lessons' fields. Prompt 54 added `level` and `tags`
(subjects) to every guide definition, and `tags` to every Observatory fixture;
a guide's duration is its two paths' minutes, and its arithmetic is counted
from its `answer` steps as a lesson's is from its numeric steps.

The scenario gallery has its own tag vocabulary ("what could I teach with
this?"). `SCENARIO_SUBJECTS` in the generator reads each gallery tag as the
lesson subject it means, and a gallery tag without one fails the build.

`tools/library-routes.mjs` resolves every route against the source its page
reads: a lesson id against the manifest, a guide against its set, a world link
by decoding it and naming its scenario. `npm run validate:links` runs it over
the index in the repository and in `dist/`.

## Coverage

How many entries of each kind carry each field. Generated; "none" is what
Prompt 76 starts from.

<!-- library:coverage -->
| Kind | Entries | summary | level | duration | mathematics | calculation | subjects | prerequisites | textbook | courseLevel | thumbnail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| investigation | 44 | all | all | all | all | all | all | all | all | all | 27 |
| activity | 6 | all | all | all | all | all | all | all | all | all | all |
| scenario | 59 | all | all | all | all | all | all | all | **none** | **none** | all |
| dataset | 13 | all | all | all | all | all | all | all | **none** | **none** | **none** |
| course | 2 | all | all | all | all | all | all | all | **none** | all | **none** |
| experiment | 4 | all | all | all | all | all | all | all | **none** | **none** | all |
<!-- /library:coverage -->

What is left unstated, and why:

- **Thumbnails** for datasets, courses and the guides: there is no picture.
- **Textbook and course level** are declared for every investigation and
  activity. A scenario, dataset, experiment or catalog course has no chapter,
  because a world or a table is not a chapter's worth of anything; a
  built-in course takes its course level from the investigations it names.
- A **catalog data pack's** subjects come from the curation file, because the
  catalog entry carries none.

## What no source owns (Prompt 76, R-L)

`tools/library-curation.json` holds the fields no source file declares: the
summary, level, duration, mathematics and prerequisites of each dataset and
experiment, the mathematics, prerequisites, textbook chapter and course level
of each guide, and the rules that give an open-ended scenario its level (the
most advanced subject it is about), its duration (5 to 15 minutes of
exploring), its mathematics (none: a world asks nothing to be worked out) and
its prerequisites (none). A built-in or catalog course takes its level,
mathematics, calculation and course level from the investigations it names
(the highest of each) and its duration from theirs, and an activity takes its
mathematics, prerequisites, textbook chapter and course level from the
investigation it is cut from, as an upper bound for a cut of it. The generator
fails for a record that names nothing, and for a source with none. Nothing in
the file reaches a reader's download; it is read by the generator and written
into `library/library.json`. Each value is an author's declaration, in the
way a lesson's own `audience` is, and is reviewed like prose.

**Textbook alignment** is OpenStax Astronomy 2e. Lessons declare it in their
own source (`textbook: {chapter, section}`, `courseLevel`), the manifest
generator carries it into `discovery.js`, and the Library reads it from there;
the guides' alignment lives in the curation file, because their files are on
routes with no spare bytes. The chapters were written from the book's table of
contents without the book at hand to check: the chapter is the claim, a
section is given only where one fits, and an instructor adopting a different
edition should treat the field as a pointer, not a citation.

## The page

`/library/` is a tool page in the shell (`js/libraryPage.js`, its own bundle,
and its own route budget, `library`). It fetches the index and filters it with
the lesson browser's own functions (`js/data/investigations/browse.js`): the
same search, which folds accents and reads the id, and the same subject, time,
arithmetic and progress filters, plus the Library's kind, format and level.
It groups the results in one list, by subject, by course level or by
sequence. Every kind gets one card (`js/library/card.js`), and the whole card
is one link to its route. The filters are kept in the address (`?q=`,
`?kind=`, `?group=`, ...), so a link can open the Library already narrowed.
Its words are `js/i18n/en.library.js` and its Spanish shadow.

Progress badges are read, never written, from what each surface saved in this
browser (`js/library/progress.js`): a lesson's steps seen, and whether a guide
was opened. A guide's record cannot say it is finished, so a guide is never
shown as finished.

The page and the index are precached as optional, as the catalog is.

## Home

Home (`js/welcome.js`) keeps its heading and three buttons in its module, and
its sections are now a fragment, `js/fragments/home.html`, fetched with it
(INDEX_DECOMPOSITION.md's mechanism). That moved 2.6 KB of markup out of the
deferred JavaScript, which paid for the rest:

- **Continue where you left off:** up to three lessons started and not
  finished, most recently started first, each opening the lesson.
- **In the Library:** a card per kind, with how many there are and the first
  two, each a link into the Library narrowed to that kind. Generated, as
  static markup in the fragment, by the Library's generator.
- **Three ways in**, the featured scenarios, the lessons and the teaching
  links, as before.

The shell's Learn group links the Library on every page.

## The lesson browser inside the application

The lesson browser is the Library's view of its lessons: the generator reads
the same tables the browser reads, `tests/library.test.js` holds the
Library's `lesson` entries to the manifest's order, subjects, length and
arithmetic, and the browser and the Library filter with the same functions.
The browser links to the whole Library.

What it does not do yet is render the Library's card or show the other kinds;
see "Staged" below.

## Staged

Recorded in [DECISION_REGISTER.md](DECISION_REGISTER.md), D-LIB-01.

- **The in-app chooser on the Library's card and data.** Rendering the
  Library card inside the application, with the other kinds, needs the card
  (1.3 KB minified), the progress reader (0.7 KB), the page's words in both
  languages (3.2 and 3.5 KB) and its wiring, about 9.7 KB of deferred
  JavaScript. After Home's move the deferred total has 2.8 KB of room
  (4,277,514 of 4,280,320 bytes), and the ceiling is not raised. The browser's
  own card is also what 27 browser specs select on, and a test is not changed to
  suit a refactor.
- **My work.** Home cannot link it: it does not exist until Prompt 69.
- **The teaching page's activity list and the scenario gallery** stay their
  own lists (PLATFORM_MODEL.md names them as Library filters later).
