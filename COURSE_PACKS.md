# Course packs

A course pack is a course as a file: the lessons, assignments, simulations,
data and readings an instructor sets, in order, in units, with learning
objectives, prerequisites, time, optional introductory and advanced paths,
and notes for students and instructors in English and Spanish. It is
`gravitas.course-pack/2` (`js/course/pack.js`). Two pages use it:

- **The course-pack builder**, at `/studio/course/`, the Studio's third page,
  makes one. It checks what the course depends on, pins every lesson it
  names, and makes the course's links, embeds, manifest and syllabus.
- **The course home**, at `/course/`, is what a student opens: the course as
  a page, with a link on every item that opens it.

Nothing needs an account, a server or a learning platform: the course is a
file and a link. Nothing in a pack is ever run. It names lessons, scenarios
and datasets by their public ids, and its texts are plain words.

This is not a SCORM package or an LTI tool, and it does not claim to work as
one. A learning platform can link to the course home, embed it, or read the
manifest, and that is all.

## What a course pack holds

| Field | What it is |
|---|---|
| `format`, `formatVersion` | `gravitas.course-pack` and `2` |
| `id`, `version` | Lower-case words joined by hyphens; a version such as `1.0.0`, raised by the upgrade below |
| `gravitas` | The version of Gravitas's platform (`PLATFORM_API`) the course was made with |
| `locales` | `["en"]` or `["en", "es"]` |
| `pinning` | `exact` or `compatible` (see Pins) |
| `title`, `summary`, `audience` | What the course home shows first |
| `teacherGuide` | How to run the course, for another instructor |
| `objectives` | Up to 12, each an id and a text |
| `prerequisites` | Up to 6: a Gravitas lesson, or a text |
| `units` | 1 to 20, each an id, a title, an optional summary and 1 to 30 items (120 in all) |

Every text is `{en, es, esOf}`: the English, the Spanish, and the digest of
the English the Spanish was written from. This is how the Investigation
Composer's texts work (COMPOSER.md), so a Spanish text is marked out of date
when its English changes.

## Items

| Kind | Opens | Holds |
|---|---|---|
| `lesson` | A Gravitas lesson, whole | The lesson's id and its pin |
| `assignment` | Some of a lesson's steps, as the teaching page's assignment link | The lesson, the steps, a title and introduction in each language, the assignment's id and date, and its pin |
| `scenario` | A built-in scenario at a seed | The scenario, a seed word such as `orbit-1`, whether it opens paused, a title |
| `dataset` | An observation in the Observatory | A built-in observation's id (`sdss-g`, `tess-light-curve` and the rest), or a catalog data pack's |
| `reading` | A text outside Gravitas | A title, who wrote it, when and where, a DOI or an https address, its license, and how students reach it (free online, through a library, in print) |

Every item may also have:

- an id, unique in the course;
- a path: `core` (the default), `intro` or `advanced`;
- minutes;
- the objectives it serves;
- the earlier items it comes after (`needs`);
- a note for students and a note for instructors.

Units run in order, and items in order within them. There are no dates:
setting them is the instructor's job, in whatever they use to set them.

- **Paths.** The core is what every student does. An introductory item is
  background for a student who wants it first; an advanced one is more for a
  student who wants more. An item may come after a core item or an item on its
  own path, never after an item on another optional path. A student on the
  core path never meets an optional item, so the core cannot depend on one.
- **Time.** A lesson takes the range its card declares. An assignment takes
  that range in proportion to the steps it keeps (never under five minutes),
  unless it declares its minutes. Scenarios, datasets and readings declare
  theirs. A path takes the core's time plus its own items'.

## Pins

Every lesson and assignment item carries a pin. A pin is:

- an eight-digit digest of the lesson's steps, made from each step's id and
  the fingerprint `js/investigations/progressBackup.js` gives it (its type,
  instrument, scenario, fields and the shape of its answer, never its words,
  so a translation does not move it);
- the number of steps;
- the package and version the lesson came from, when it came from one;
- for an assignment, each assigned step's own hash: the one its link carries.

Against the lessons as they are now, `js/course/review.js` calls each item:

| Standing | Meaning |
|---|---|
| same | The digest and the package match |
| changed | The lesson's steps are not the ones pinned |
| compatible | The package moved within its major version, and the steps did not change |
| major | The package moved a major version |
| moved | The lesson now comes from another package, or from none |
| unpinned | The item has no pin (a /1 course, migrated) |
| missing | Gravitas no longer has the lesson, scenario or dataset |

Whether that waits for an instructor depends on the pack's pinning:

- **Exact** is an archive. Anything but "same" waits for review. An exact
  course must pin every lesson it names.
- **Compatible** follows Gravitas within a major version. It waits only for a
  missing item, a major or moved package, or an assigned step that is gone or
  rewritten, since that changes what the assignment's link asks.

**The reviewed upgrade** is the only way a pin moves. The builder lists what
waits. The instructor ticks what they have looked at and presses Upgrade,
and `upgradeCoursePack()` then:

1. Re-pins exactly those items to the lessons as they are.
2. For an assignment whose steps moved: keeps the steps still there, drops
   the ones that are gone, and gives the assignment a new id and date. Its
   old id names a place in the student's browser holding answers to the steps
   as they were, and those answers must not attach to the new ones.
3. Raises the course's version: a minor version when only lessons changed,
   and a major one when an assignment was re-issued or a package moved a
   major version, since links and answers change then.
4. Refuses a missing lesson. That item can only be removed or replaced.

The file from before the upgrade is the archive. The upgrade makes a new one.

### When what a course includes changes

| What changes | What the course does |
|---|---|
| A lesson is rewritten | Its pin no longer matches. An exact course waits for review; a compatible one notes it. Students opening the lesson see it as it is now |
| An assigned step is rewritten or removed | Both kinds of course wait for review. Until the upgrade, the assignment's link still carries the old step hashes, so the application marks the rewritten step and withholds its stored answer (`js/assignments/assignment.js stepBindings`), as it does for any assignment link |
| A lesson's package moves a major version, or the lesson moves to another package | Both kinds of course wait for review |
| A lesson, scenario or dataset leaves Gravitas | The builder refuses to save or link the course until the item is removed. The course home still opens it and marks the item, so an archived course stays readable |
| A catalog dataset needs a newer Gravitas | The builder refuses it, naming the version it needs |
| A /1 course is opened | It becomes a /2 course with the same units and lessons, unpinned; upgrading its lessons pins them |

## Checks

Checks run in two stages, as the other Studio pages' do:

1. **The format** (`js/course/pack.js`). It starts with the structural guard
   of the investigation pack (`js/platform/investigation.js makeChecker`),
   which refuses a hostile file for one reason and stops: a prototype key
   (`__proto__`, `constructor`, `prototype`), anything that is not plain data,
   a non-finite number, or a file larger or deeper than any pack needs. Then
   every field is checked. Texts are plain: no markup, no entities, no
   addresses. A reading's address is the one place a pack holds an address,
   and it must be a canonical https address with no credentials.
2. **The course against this build** (`js/course/review.js auditCourse`), with
   each finding a problem, a warning or a note:
   - a missing item (a problem), and every item that waits for review;
   - a lesson placed before one that Gravitas's own sequences put ahead of
     it (`js/data/investigations/sequences.js`), such as Bound, Unbound and
     Escape before Kepler's Laws;
   - an assignment without the steps its steps need: the step that builds
     the world a chosen step is about, and a result it uses (a problem; the
     builder adds them as they are chosen);
   - a prerequisite lesson that is also in the course;
   - licenses: a dataset stating none (a problem), a dataset whose makers
     state no license (a warning: MIST's isochrones), a free reading with no
     license or no address;
   - a catalog dataset students install first (a note), or one for another
     Gravitas (a problem);
   - translations: texts with no Spanish or out-of-date Spanish, and lessons
     with no Spanish;
   - no objectives, or an objective no core item serves;
   - an item with no time;
   - a lesson with no instructor guide yet (a note; every lesson Gravitas
     ships has one).

A problem stops saving, the manifest, the preview and the links. A warning or
note does not.

## Links

Links are made from the pack and nothing else (`js/course/links.js`), so the
same file always makes the same links.

| Item | Link |
|---|---|
| Lesson | `/#investigation=<id>`, the lesson browser's own link |
| Assignment | The teaching page's assignment link, `/#a2z…`, made from the id, date, steps and hashes the pack records, one for each language |
| Scenario | A world link, `/#1z…`, the scenario at the seed its word names, as Share writes one; and the figure embed of the same world (EMBEDDING.md) |
| Dataset | `/observatory/?open=<id>` for a built-in observation; `/observatory/?installed=<id>` for a catalog data pack, which a student installs from `/catalog/` first |
| Reading | Its address, or `https://doi.org/<doi>` |
| The course | `/course/#c2z…`: the whole pack, compressed, in the fragment, and an embed of the course home |

A course link is checked against the 8,000 characters some mail programs and
learning platforms keep (`COMFORTABLE_URL_LENGTH`). The example course's is
about 5,500. A course too long for a link is given to students as the file, and the
course home opens it.

## The course home

`/course/` opens, in turn:

- `?course=<id>`, a course Gravitas ships (`js/data/courses/`);
- `?draft=1`, the builder's preview, from this browser;
- a course link;
- a file, with "Open a course file".

It shows:

- the course's title, summary and audience;
- the time each path takes;
- the objectives and the prerequisites;
- every unit and item, each with:
  - its kind and time;
  - its path, when it is optional;
  - what it comes after;
  - the student's note;
  - a reading's reference and terms;
  - a link that opens it in a new tab.

Controls filter it to a path and show the instructors' notes and guidance.
**Print the syllabus** prints it: the controls go, and each short link is
written out. Assignment and world links are too long to print, and the
syllabus says to open those from the course home.

It checks a pack for its shape only. One that names a lesson this build no
longer has still opens, with that item marked.

**Offline.** The course home is in the service worker's precache, as the
catalog is (`tools/build-service-worker.mjs`), and so are its modules and the
course Gravitas ships. Once a student has opened Gravitas, a course link or
the shipped course opens with no network, and so does everything it links to
except readings and catalog datasets not yet installed. The builder is not
precached: it is an author's page.

**Languages.** The course home reads in English or Spanish, sharing the
application's `gravitas_locale` choice, so the lessons it opens are in the
same language. Lesson titles come from the lesson catalog in that language;
the course's own texts are its own.

## The manifest

**Save the manifest** writes `<id>.course-manifest.json`,
`gravitas.course-manifest/1` (`js/course/manifest.js`). For every item it
gives:

- what it opens;
- its time and objectives;
- what it comes after;
- its pin, its standing and whether that waits for review;
- where it works offline (precached, installed first, online, or in print);
- its license;
- its languages;
- its links in each language.

It also gives the time each path takes, the dependency graph (what each item
needs and opens, and the scenarios, instruments and lessons each lesson uses
or assumes), and what is left for the instructor to do. A repository, an
archive or a learning platform's import script can read it without running
Gravitas.

## The course Gravitas ships

**Introductory astronomy: gravity, starlight and other worlds**
(`js/data/courses/intro-astronomy.js`, `/course/?course=intro-astronomy`) is
the fixture the builder was proved on, made from content that already exists.
It has four units: motions in the sky, gravity and energy, what starlight
tells us, and other worlds. Its twelve items are:

- seven lessons;
- an assignment of six steps cut from Finding Planets by Their Shadows;
- the Solar System to explore;
- two real observations, a Sun-like star's SDSS spectrum and HD 209458's TESS
  light curve;
- a chapter of OpenStax's Astronomy 2e, CC BY 4.0, as the introductory
  reading.

Time by path:

| Path | Time |
|---|---|
| The core | 250 to 300 minutes, five or six fifty-minute meetings |
| With the introductions | 280 to 330 minutes |
| With the advanced items | 390 to 475 minutes |

It is in English and Spanish throughout. It pins its lessons compatibly, and
`tests/coursePack.test.js` holds it to the format, to a clean audit and to a
course link a learning platform keeps whole.

What is left for an instructor who runs it:

- setting dates, in whatever they set dates in;
- posting the course link;
- reading the OpenStax chapter to choose its sections;
- collecting and marking the assignment, through the lab report or the
  submission tools Gravitas already has;
- the instructor guides, which are in English only and are behind the
  instructors' portal passphrase.

## What authors may ask for that it does not do

These are recorded rather than built in this change:

- **SCORM, LTI, grade passback and rosters.** A learning platform links to or
  embeds the course home; nothing reports back to it.
- **Dates, deadlines and release conditions.** The order is the course's;
  when is the instructor's.
- **The catalog lists /1 courses.** It reads and installs
  `gravitas.course-pack/1`, and the SDK validates and packages /1. A /2
  course is shared as a file or a link. Listing /2 courses in the catalog,
  and an SDK type for them, are next.
- **A course hosted at an address.** The course home opens a link, a file or
  a shipped course. It does not fetch a pack from another site, which would
  mean trusting that site on every open.
- **Investigations from the composer.** A composed investigation reaches
  students through a maintainer (COMPOSER.md), so a course names it only
  once it is a lesson Gravitas ships.
- **Scenario Studio packs as items.** A scenario item opens a built-in
  scenario at a seed. A Scenario Studio link can be a reading's address, but
  it is not checked.
- **Lesson embeds.** A scenario embeds as a figure; a lesson does not, since
  the embed contract (EMBEDDING.md) is for worlds.
- **Instructor guides in Spanish,** and instructor guidance per item beyond
  the notes. The encrypted guides are English only and keyed by step
  number.
- **Pinning scenarios and datasets by content.** A scenario or built-in
  dataset is pinned only by name. A catalog data pack is versioned by the
  catalog.

## Where it lives

| Path | What it is |
|---|---|
| `studio/course/index.html`, `js/coursePage.js` | The builder (its own bundle in `build.js`) |
| `course/index.html`, `js/courseHome.js` | The course home (its own bundle; precached) |
| `js/course/pack.js` | The format, its checks, and migration from /1 |
| `js/course/review.js` | Pins, standings, the upgrade, the audit, time and the dependency graph |
| `js/course/api.js` | This build's lessons, scenarios and datasets, and each named lesson's facts |
| `js/course/links.js` | Every link, and the course fragment |
| `js/course/manifest.js` | The manifest |
| `js/course/datasets.js` | The built-in observations and the guided lessons, as data |
| `js/course/i18n.js` | The course home's translator |
| `js/data/courses/` | The courses Gravitas ships |
| `js/platform/course.js` | `gravitas.course-pack/1`, as the catalog and the SDK read it |

Tests:

- `tests/coursePack.test.js`: the format, hostile files, migration, pins,
  the upgrade, the audit, time, the graph, the manifest, the links, the
  copied data against its sources, the registrations and every word.
- `e2e/course.spec.js`: both pages, against the sources and dist, in all
  three engines, and the course home offline.
