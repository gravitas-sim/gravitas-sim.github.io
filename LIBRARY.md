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
| `length` | `demo`, `period` or `long`: a lesson's editorial time band at its default depth (`js/data/instructorTimeBands.js`, Prompt 174), and for everything else the band of its upper bound; the bands' upper bounds are the lesson browser's own cut-offs, and the editorial-estimate label is on every page that shows a time |
| `mathematics` | What a student is asked to work out: `none`, `arithmetic`, `algebra`, `logarithms` |
| `calculation` | How many numbers there are to work out, bucketed: `none`, `some`, `lots` (the lesson browser's "Arithmetic" filter) |
| `subjects` | Subject ids, in the lessons' vocabulary |
| `prerequisites` | Library ids |
| `steps` | How many steps or items |
| `thumbnail` | A picture of it, under `images/` |
| `route` | The canonical link to the page that runs it |

A field a source does not declare is `null`, never guessed. `prerequisites: []`
means the source says there are none; `null` means it does not say.

Since Prompt 163 an entry may also carry `data` (`authentic` for measured
observations and the Observatory's guides, `synthetic` for scenarios,
experiments and a model's output; absent where it can use both) and always
carries `rel`, its relations (below). Additively, the document carries
`kindShown` (the four kinds a student sees: an activity or an experiment is an
investigation), `starts` (the committed starting points) and a `blurb` on each
subject; `library/search-index.json` holds the lessons' learning objectives in
both languages for the search.

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
| investigation | 104 | all | all | all | all | all | all | all | all | all | 87 |
| activity | 6 | all | all | all | all | all | all | all | all | all | all |
| scenario | 69 | all | all | all | all | all | all | all | **none** | **none** | 61 |
| dataset | 16 | all | all | all | all | all | all | all | **none** | **none** | **none** |
| course | 6 | all | all | all | all | all | all | all | **none** | all | **none** |
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

## The sequences (Prompt 97, and Planets and the Sun, Prompt 206)

`sequences` carries named orders over the investigations (The sky; Gravity
and orbits; Light and stars; Planets and exoplanets; Planets and the Sun;
Galaxies and the universe; Observing and measuring), each with `depths` (the depth each entry is read at)
and `after` (sequences worth doing first). Every investigation is in at least
one, and every `needs` in `js/data/investigations/sequences.js` is an earlier
item that the lesson declares as a prerequisite.

`sequenceAliases` maps a sequence id that was renamed or merged to the id that
took it over (`SEQUENCE_ALIASES` in `js/data/sequenceAliases.js`), because a
student's browser can still hold the old one in the "what next" record.

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
and its own route budget, `library`). Since Prompt 163 it answers questions
instead of listing things. It has four views, one page, no new destination:

- **Start** (the default). Where you left off, from the one resume record
  (below); where to start, a committed handful per audience and level
  (`starts` in `tools/library-curation.json`, validated against the entries
  and against Home's first-week list; where a start's entries can all be items
  of a package, the start is also a collection and is drawn from it, below);
  the sequences and courses as pathways; the subjects as topics, with generated
  counts; and, when there is one, "Your collections". No grid of everything.
- **Browse everything** (a button, or any filter or search). The whole catalog,
  with four facets (subject, level, time, kind as a student sees it) and, behind
  "More filters", mathematics, arithmetic, data (real or simulated), depth,
  prerequisites met, sequence, progress and the arrangement. Every option shows
  how many entries choosing it would leave. "Where it runs" is not a facet: the
  surface is a property of the card.
- **Topic** (`?topic=<subject>`). The subject's paragraph, its sequences, its
  courses, its investigations by level, its datasets and its scenarios
  (`js/library/views.js`, loaded when asked for). The alignment table links back.
- **Item** (`?item=<id>`). What comes before, what comes next, what goes with
  it, its instructor page, the pathways it is in (a sequence and a course say
  which is which), and, when nothing comes after it, why. The breadcrumb names
  the destination, the Library, the pathway it was opened from and the item.

The search (`js/library/search.js`, fetched on the first query with
`library/search-index.json`) needs every word to match, ranks a word in the
title above the id and subject, those above the summary and the lesson's
objectives, and those above its details, and each result names the fields that
matched. It runs in the browser: no query leaves it.

The filters are kept in the address (`?q=`, `?kind=`, `?subject=`, `?group=`,
`?browse=1`, ...), so a link can open the Library already narrowed. Every kind
gets one card (`js/library/card.js`), the whole card is one link to its route,
and a second link goes to the item's page. Its words are
`js/i18n/en.library.js` and its Spanish shadow.

Progress badges are read, never written, from what each surface saved in this
browser (`js/library/progress.js`): a lesson's steps seen, and whether a guide
was opened. A guide's record cannot say it is finished, so a guide is never
shown as finished.

The page, its index, the search index and its modules are precached as
optional, as the catalog is.

### Relations (Prompt 163)

`tools/build-relations.mjs` derives, for every entry, `rel`: `pre` (its
prerequisites), `next` (the following entry of each sequence it is in, the
following lesson of each course, what lists it as a prerequisite, then what is
built on it: the investigations that open a scenario or a dataset; at most 3),
`related` (shared subjects, a sequence or a textbook chapter, at most 4), `uses`
(what it is built on), `in` (its pathways), `teach` (its instructor page, when
the site has one) and `why` (`last` or `standalone`) when nothing comes next.
The same file validates them (no dangling or repeated id, a reason wherever
nothing comes next, every instructor page real) and the build refuses a library
that fails. The lesson's finish panel offers up to two of `next` and one of
`related` after the sequence or course it came from.

### Collections and saved items (Prompt 164)

A collection is a course package with `profile: "collection"` (COURSE_PACKS.md).
Two things in the Library are collections:

- **The starts.** `tools/build-library.mjs` writes a start as a collection
  (`starts[].collection`) when every entry in it can be an item (a lesson, a 3-D
  or mission guide, a scenario or a dataset), checks it with the package's own
  validator, and the page draws the start from its items, so the default view is
  what it was. A start with an Observatory investigation or a course in it has no
  collection, and `tests/libraryCollections.test.js` fails if a start that could
  have one does not.
- **A student's own.** An item page has a Save button for the entries a collection
  can hold (not a course, an activity, an experiment, a 3-D system or an
  Observatory investigation: no button is shown for those). The saved items, in
  the order saved (at most 30, a unit's limit), and the collections kept from
  others are "Your collections" on the start page, each item a link with a Remove
  button and each kept collection a "Stop keeping" button, written to one key
  (STORAGE.md) and shown in My work. Nothing is kept by opening a link.

The modules are lazy and take what the page already has (its storage functions,
its names, its checker) as arguments, because a lazy module that imported them
would split the page's bundle into one more request.

### The one resume record (Prompt 163)

The key `gravitas_resume` (`js/storage/local.js`, `readResume` and `noteResume`)
holds the last six items a reader opened, newest first, each with its route,
the pathway it was opened from and the step it was at. The Library's links write
the pathway, the lesson's save writes the step, and Home, the Library and the
lesson's finish panel read it. It is a sidecar key and never a field of a
progress record, because a 2.0.0 reader ignores an unknown field of a progress
record silently (the boundary list), and does not know a key of its own at all
(`tests/compat/kinds/resume-record.mjs`). Nothing in it is a progress record: a
lesson's steps seen still live in its own record. A damaged record reads as
empty. Home reads it with a small reader of its own (`js/welcome.js`), because
the module would be one more request on every lesson route; a test holds the
two readers to each other.

## Home

Home (`js/welcome.js`) keeps its heading in its module, and its sections are a
fragment, `js/fragments/home.html`, fetched with it (INDEX_DECOMPOSITION.md's
mechanism). Since Prompt 162 it is one calm page:

- **Continue where you left off:** the item opened last, from the one resume
  record, then the lessons started and not finished, most recently started
  first, at most three; shown only when there is one.
- **Where to start:** one recommended start per audience, from the committed
  `firstWeek` list in `tools/navigation-inventory.json` (an investigation, an
  observation, the sandbox, a course for an instructor). Generated, as static
  markup in the fragment, by the Library's generator, which reads each entry's
  title and route from the Library and fails on one that does not exist.
- **Five places:** the destinations of NAVIGATION.md with their one line each,
  generated from the same inventory.

Home no longer lists the Library by kind with counts, the featured scenarios,
the lessons or the teaching links; the Library, one click away, is where they
are.

The shell's Learn destination goes to the Library on every page.

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
