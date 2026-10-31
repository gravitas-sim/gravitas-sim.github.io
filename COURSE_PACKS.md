# Course packs

A course pack is a course as a file: the lessons, assignments, simulations,
data and readings an instructor sets, in order, in units, with learning
objectives, prerequisites, time, optional introductory and advanced paths,
and notes for students and instructors in English and Spanish. It is
`gravitas.course-pack/2` (`js/course/pack.js`), or `/3` when it carries a profile, a term or outcomes (see The 3.0.0 version, below). Two pages use it:

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
| `courseLevel` | Optional: `survey`, `majors` or `upper`. A lesson item with no `depth` of its own opens at this level's depth (core, quantitative, advanced); the Library's course filter reads it |
| `profile` | Optional (Prompt 164): `collection`, written only for a collection (see Collections below) |
| `term` | Optional (Prompt 168): the term this copy is for, a short plain label such as `Spring 2027` (at most 40 characters), written only when the instructor names one |
| `title`, `summary`, `audience` | What the course home shows first |
| `teacherGuide` | How to run the course, for another instructor |
| `objectives` | Up to 12, each an id and a text, and optionally `outcomes`: the ids of the instructor's outcomes it is mapped to (Prompt 174) |
| `outcomes` | Optional (Prompt 174): up to 12 of the instructor's own outcomes, each an id and a text, written only when the instructor enters some (see The printable activity list below) |
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
| `pack` | An instructor's investigation (a remix, or one written from scratch), from its link | The pack's id and version, the link itself (the fragment the Composer's Publish makes, at most 4,000 characters), a title, and its pin: the digest of the compiled steps, as a lesson's (REMIX.md). Its progress is kept as `rx-<id>-<version>`. The builder cannot open the link (the checker has no room on its route), so it takes the item made at `/studio/course/packs/`, which also checks a whole course's packs; until then the pack is `unchecked`. Time is the pack's own duration |
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

## Collections (Prompt 164)

A collection is a course pack with `profile: "collection"`: a short list rather than a course. It is the same format and the same links (a Gravitas course home link or a file), so there is no second format to read, and what it leaves out is checked:

- exactly one unit, of 1 to 30 items in order;
- an optional note (`studentNote`, `teacherNote`) on any item, a `depth` on a lesson or a guide, and a pin where the package is exact;
- no assignment items, no optional paths (every item is core), no `needs`, and no objectives, prerequisites, course level or term.

A collection can hold a lesson, a 3-D or mission guide, a scenario, a dataset, a reading or an investigation carried as a link. The Library's Save button saves the first four. Who uses them:

- **The recommended starts.** `tools/build-library.mjs` writes each start whose entries a collection can hold as one (`starts[].collection` in `library/library.json`, validated by `validateCoursePack` at build time) and the Library's start page draws those starts from them. Two of the four are collections today (new to astronomy, in an astronomy course). "Measure something real" names an Observatory investigation and "Teaching a course" names a course, and neither is an item of a package, so those two stay plain lists until a package can hold them.
- **A student's saved items**, a collection of their own in one record (`gravitas_collections`: STORAGE.md), and the collections they kept from others. A collection opened from a link is kept only when the student presses Keep on the course home; opening one stores nothing.
- **An instructor's collection**, made in the distribution kit (`/teaching/kit/#collections`) from what they saved in the Library: order, a sentence for each item, a depth where an item has one, a title, and a link or a file. The Spanish is written, never made up: once any text has Spanish, every text needs it.

**A 2.0.0 build cannot open a collection.** A collection is written as `gravitas.course-pack/3` (see The 3.0.0 version, below), which a 2.0.0 build refuses as made by a newer version of Gravitas (`tests/compat/boundary.mjs`, `collection-profile`), and the release notes say so. No course is changed: a course has no profile and stays /2.

### 3-D lab investigations (Prompt 105)

A `guide` item opens one of the 3-D lab's guided investigations (`guide`: `l3-planes`, `l3-eclipse`, `l3-mutual` or `l3-kozai`) at a `depth` of `core` (the introductory path, the default) or `advanced` (the advanced path). It declares its own `minutes`, may be on any path, takes an optional title and carries no pin: the investigations are the lab's, not lessons. Its link is `/3d/?guide=<id>&path=<intro|advanced>`. The id table is `GUIDES_3D` in `js/course/pack.js`, held to the lab's guides by a test.

### Mission lab investigations (Prompt 106)

The same `guide` kind opens the mission lab's investigations (`ml-orbit`, `ml-window`, `ml-cruise`), at the same two depths, at `/mission/lab/?guide=<id>&path=<intro|advanced>`. `GUIDES_MISSION` in `js/course/pack.js` holds their minutes, `GUIDES` is the merged table a pack is checked against, and `guideRoute` says which lab a guide belongs to. A test holds the table to the lab's guides.

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

## A copy for a term (Prompt 168)

`js/instructorTerm.js` makes a copy of a course for a term, or for first use as it comes
(INSTRUCTOR_FLOW.md): `startTerm(pack, facts, {term, today})` runs the reviewed upgrade on every lesson,
assignment and pack item (so every pin is the lesson as it is now), gives every assignment a fresh id and
date and the term in its title (both languages, the Spanish still marked as written from the English), puts
the term in the public id and sets `term`. It returns the new pack and a report: for each pinned item its
standing before (`same`, `changed`, `compatible`, `major`, `moved`, `unpinned`, `missing`), the assigned
steps whose question changed or that are gone, and each assignment's old and new id. The pack passed in is
not changed, and its links open what they opened. The builder's panel (`/studio/course/?use=<id>` and the
Start a new term button) and the kit's term step are its two forms. The `term` field is written only when
a term is named, and a pack that has it is `/3`: a 2.0.0 reader refuses it as made by a newer version
(`tests/compat/boundary.mjs` `course-term`), and every pack without one reads as before.

## Checks

Checks run in two stages, as the other Studio pages' do:

1. **The format** (`js/course/pack.js`). It starts with the structural guard
   every Studio format shares (`js/platform/checker.js makeChecker`),
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
| Assignment | The teaching page's assignment link, `/#a1z…` (`/#a2z…` when the lesson came from a package, whose pin only version 2 carries), made from the id, date, steps and hashes the pack records, one for each language |
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

## The courses that came with Prompt 97

All three are `courseLevel`-declared, pinned compatibly and in both languages
(the Spanish is unreviewed by a native speaker; the OpenStax chapters were
matched from the table of contents, so check them against the edition in hand):

| Course | Level | Core time | Units |
|---|---|---|---|
| `astronomy-semester`: introductory astronomy, one semester, with OpenStax Astronomy 2e | survey | about 11 to 15 hours | seven, each naming its chapters, with an optional reading and an advanced item |
| `observing-lab`: observational astronomy lab (1.1.0, seven units, rebuilt around the Observing and instruments sequence) | majors | about 11 to 16 hours of investigations, before the datasets | planning, instruments and exposure, a night at the telescope, spectra, photometry and time series from frames, what a survey misses, authentic data |
| `stellar-astrophysics`: stellar astrophysics for majors (OpenStax Astronomy 2e chapters 17 to 23) | majors | about 8 to 12 hours of investigations, before the readings | starlight, the census of the stars, distances and variables, evolution, death, and a unit of readings for what has no investigation and why |
| `upper-level-modules`: eight short upper-level modules (1.1.0, the stellar module gained three advanced items and the four prerequisite investigations they assume) | upper | about 15 to 22 hours | celestial mechanics, stellar astrophysics, galactic dynamics, exoplanet science, time-domain, cosmology, statistics of surveys, computation |

They open as `/course/?course=<id>`. No detector or noise lesson exists yet, so
the lab course does not claim one; the 3-D and mission guides are separate pages
and cannot be course items. The catalog still lists /1 courses only, so these
/2 courses are reached from the course home and the Library, not installed from
the catalog.

## Common Cartridge (Prompt 169)

An instructor who expects a course to import into Canvas, Moodle, D2L or Blackboard gets a file: the course builder's **Export a Common Cartridge** button and the distribution kit's **Make a Common Cartridge** (for a course) make `<course id>-<en|es>.imscc` in the browser, from the course as it stands. Nothing is uploaded, and the export runs no service, carries nothing about students and promises no grade return. Live tool connection (LTI) is a service and stays out of scope (D-CLASS-04).

**The profile, and why.** The 1EdTech (IMS) **Thin Common Cartridge Profile v1.0** (Final Specification, 1 May 2015) over **Common Cartridge v1.3** (Final, July 2013), manifest schema `imscp_v1p1` of `imsccv1p3`, `schemaversion` 1.3.0, file extension `.imscc`. Thin Common Cartridge carries web links (and LTI links, which this never writes) and nothing else, which is exactly what a Gravitas course is: a list of links that already encode the pin and the depth. The profile's own conformance exceptions let a platform skip inline resource XML, so each link is a stand-alone web link file (the form every platform must read) and the package holds exactly three kinds of file, as the profile says: the one `imsmanifest.xml` and one web link XML file for each link. Version 1.3 over 1.4: the Thin profile was written for CC 1.2 and 1.3, 1.3 is a Final release, and 1.4 is a Candidate Final (September 2021); which versions each platform's importer reads was not checked, because no platform was available. 1.4 has Thin schemas of its own and is the upgrade path if a platform asks for it.

**What it holds, from a course.**

- One folder (a module on most platforms) for each unit, in order, with one web link for each item that has an address: the link the course already makes (`js/course/links.js`), in the cartridge's language, opening the item in Gravitas. A reading with no address cannot be a link and is left out; the panel says which.
- A first folder with the course home link (the whole course as a page, with its paths, times and notes) and, for a course with a teacher guide, a link to it for instructors.
- A unit whose items carry notes for instructors gets one link for instructors, to the course home, where the notes are behind the "Notes for instructors" switch. Thin Common Cartridge has no pages (web content is not in the profile), so the notes themselves go into the cartridge only if the instructor ticks the box: they become that link's description, with the role Instructor, and a platform that ignores the role would show them to students, which the box says.
- A description for each link: its kind, its time, whether it is optional, and the student note. The text of the cartridge follows the language of the page it is made on (the course's own words fall back to English as the course home does); a package in one language gives one cartridge, and the other language is made by changing the page's language and exporting again.
- A collection (`profile: "collection"`) exports the same way.
- No date, no student, no random number: the manifest text is the same every time, and the archive is a stored (not deflated) ZIP, valid and the same bytes everywhere. A cartridge is never committed.

**It is an export, and not a Gravitas format.** Gravitas never reads a cartridge back, so there is no reader, no version row in FORMATS.md (that table is for formats Gravitas reads or writes under its own name), no compatibility corpus row and no storage. The course package format is unchanged, and no closure file of the instructor bundle was edited.

**How it was checked.** `tools/cartridge-profile.mjs` holds the profile's rules (from the Thin Common Cartridge guide, the CC v1.3 guide and the schemas' own Schematron rules), and `tests/commonCartridge.test.js` builds a cartridge from every built-in course in both languages, with and without the notes, checks each against them, checks every link against what the item names (a lesson id that exists, an assignment link that decodes to the assigned steps, the course home link that decodes to the pack), reads the archive back with a reader that shares no code with the writer, and refuses sixteen broken manifests rule by rule. The real schemas (`ccv1p3_imscp_v1p2_v1p0.xsd`, the two LOM profiles, the web link schema and what they import) validated all sixteen cartridges and every web link file with xmllint on 2026-10-22; six of the sixteen broken manifests are also refused by the schema, and the rest by the profile alone. **The schemas are not in this repository**: their licence lets a developer redistribute them as is only after registering with 1EdTech, which is an account and an agreement for Carl to make (D-R10-54). `tests/fixtures/common-cartridge/provenance.json` holds each source's address, size, SHA-256 and licence statement; `validation.json` is the verdict, with a digest of each manifest and of each link file (the deflated link fragments in the files replaced by a placeholder, because the bytes deflate writes differ between Node versions, and checked by decoding instead), and the test fails when a cartridge differs from it; `node tools/cartridge-validate.mjs --schemas <dir> --write` runs the schemas again (xmllint is needed; the tool fetches nothing and CI never runs it). The Common Cartridge valid test sets and the conformance testing process are behind a member login and were not read; the specification's own printed examples were. A manifest that validates is not an import.

**Where an import has been checked.** A platform is VERIFIED here on one of two bases: an import recorded here (its date and what appeared), or a report by the owner, which says who reported it, where and when, and what was not supplied. All four rest on the second. Carl reported in chat on 2026-10-22 that imports into Canvas, Moodle, D2L and Blackboard are verified; the LMS versions, the cartridge imported and what imported were not supplied, so none of those, and no date of import, is recorded or implied here, and this project holds no screenshot or other artifact of an import. A schema, a unit test and a specification example are not an import, and a manifest that validates is not one either.

| Platform | Import | Basis |
|---|---|---|
| Canvas | VERIFIED | verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied |
| Moodle | VERIFIED | verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied |
| D2L | VERIFIED | verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied |
| Blackboard | VERIFIED | verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied |

Teach, the adopter's guide, the panel and `tools/evidence-status.json` say the same, from one table (`IMPORT_STATUS` in `js/instructorCartridgeText.js`): Gravitas exports a Thin Common Cartridge; imports verified on: Canvas, Moodle, D2L, Blackboard (Canvas: VERIFIED, reported 2026-10-22; Moodle: VERIFIED, reported 2026-10-22; D2L: VERIFIED, reported 2026-10-22; Blackboard: VERIFIED, reported 2026-10-22). Reported by Carl in chat on 2026-10-22; the LMS versions, the cartridge imported and what imported were not supplied.
To record an import itself, add its date and what appeared to the row there, to the evidence record and to this table; `tests/commonCartridge.test.js` holds the five together, pins that every row says exactly the basis above (nothing invented: no date of import, version or screenshot), and refuses a row that claims a recorded import and lacks its date or what appeared.

## The printable activity list, the time bands and the outcomes (Prompt 174)

A course package becomes a plan to print or to paste into a page of a learning platform: the course builder's **Print the activity list** button and the distribution kit's **Make the activity list** (for a course). It is made in the browser, from the course on the page, by `js/instructorPlan.js` (words in `js/instructorPlanText.js`, the panel in `js/instructorPlanView.js`); nothing is committed, stored or sent.

- **What it holds.** The units and their items in order, each with what it is, its depth, its time band, its link (the link the course already makes), what comes after what (`needs`), what the investigation builds on and its OpenStax Astronomy 2e chapter (both read from the Library when the panel opens), the course objectives the item serves, the investigation's own objectives, and the notes. Then **what students hand in** (a lab report as a PDF, or its token, for an investigation, an activity cut from one and an instructor's investigation; nothing for a simulation, an observation, a guide or a reading, because Gravitas collects nothing there) and the outcome matrix. In English or Spanish, the language of the page it is made on; as a page to print (the list alone is on the page while printing, and the page is back after), as a saved web page, as Markdown to save or copy.
- **Time bands, and what they are.** A time is a band, short (5 to 25 minutes), medium (30 to 50) or long (55 to 100), from one committed table, `js/data/instructorTimeBands.js`: for each investigation and each depth it offers, authored by the project from the lessons' declared durations and step counts (the table's header gives the rule, and `tests/timeBands.test.js` redoes it). A unit's time is its core items' bands added; optional items are counted apart. Every page that shows a band says **Editorial estimate; no observed class data.** (the plan, the adoption pages, the index and the alignment page) until the evidence-status record's `timing-estimates` claim holds an observed value; the test holds that constant to the record. No median from a test walk is used anywhere: a script reads faster than a student. The Library's length facet reads the same table (`tools/build-library.mjs`), and the lesson browser's cut-offs are the bands' upper bounds, so a duration cannot be one thing on a page and another in the filter.
- **The instructor's outcomes.** `outcomes` is a list of the instructor's own outcomes (a department's or a syllabus's), free text in both languages like an objective's, and an objective's `outcomes` names the ones it serves. The plan prints the matrix of items against outcomes through the course objectives each item names, lists the objectives' mapping, says which outcome no item serves and which items name no objective (so are left out, not scored as zero). **The mapping is the instructor's claim of what the course intends. It is not evidence that any student attained an outcome**, and the plan says so beside the matrix. The builder's panel is where outcomes are written and mapped (an outcome with no words is a problem the builder lists); a course file that carries them prints the matrix from the kit too. Both fields are written only when entered, and a package that has either is `/3`: a 2.0.0 reader refuses it as made by a newer version (`tests/compat/boundary.mjs` `course-outcomes`), and every package without them reads as before. The adoption pages list each investigation's objectives and say how to map them before a course is built.
- **A second textbook.** Not added. A second alignment needs a public table of contents that can be cited, and none was checked in this work (nothing was fetched); the alignment page says OpenStax is the only textbook aligned and why. Adding one is a content decision (a register row), not a change here.

## The 3.0.0 version (Prompt 176)

`gravitas.course-pack/3` is `/2` plus the three things only a 3.0.0 reader understands: `profile` (a collection), `term` and `outcomes` (on the course and on an objective). The writer writes the lowest version that carries the pack, so a course that needs none of them is `/2` byte for byte and a 2.0.0 build opens it; `withVersion()` in `js/course/pack.js` is that rule, applied where a pack is saved (`serializePack`) and where a link is made (`courseLink`: `c2`, or `c3` for a `/3` pack). Leave the term, the outcomes or the profile out and the next save is `/2` again. The reader reads `/1` (migrating it), `/2` and `/3`; a version past `/3` is refused in words. A 2.0.0 build that is handed a `/3` file or a `c3` link refuses it, and FORMATS.md records the message and the rollback outcome (the table "The 3.0.0 boundary"), held by `tests/compat/boundary.test.js` and `tests/formatBoundary.test.js`. The schemas are `sdk/schemas/course-pack-2.schema.json` (the form 2.0.0 reads) and `course-pack-3.schema.json`.

## What authors may ask for that it does not do

These are recorded rather than built in this change:

- **SCORM, LTI, grade passback and rosters.** A learning platform links to or
  embeds the course home, or imports a Thin Common Cartridge of its links (above);
  nothing reports back to it.
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
| `js/instructorCartridge.js`, `js/instructorCartridgeView.js`, `js/instructorCartridgeText.js` | The Common Cartridge export, its panel and its words (instructor modules, built lazily) |
| `tools/cartridge-profile.mjs`, `tools/cartridge-validate.mjs` | The profile's rules; the run against the real schemas |
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
- `tests/commonCartridge.test.js`, `e2e/commonCartridge.spec.js`: the export, as above.
