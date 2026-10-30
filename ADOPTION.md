# Teach: the instructor path and the adoption pages

Roadmap II, Prompt 76. An instructor deciding whether to use Gravitas needs
one answer to "what is this, who is it for, how long does it take, what must my
students know first, what is marked, and how do I hand it out", and used to
find a different answer on the teaching page, the investigation chooser, the
instructor portal, the README and the manual. This is the one place, and every
fact on it is read from the sources that own it.

## What there is

| Page | What it is | Written by |
|---|---|---|
| [`/teaching/`](teaching/) | Teach: the eight-step instructor path (why and how it works; quick start; find content; build an activity or a course; collect and review work; materials and answer keys; embed and present; cite and evaluate). Its counts are read from the catalog when the page loads, as before | by hand, with the counts generated |
| [`/teaching/find/`](teaching/find/) | The index of every adoption page, with filters | `tools/build-adoption-pages.mjs` |
| [`/teaching/adopt/`](teaching/adopt/) | The adopter's guide (Prompt 114, `ADOPTER_GUIDE.md`): the first week, the first semester, what the software does and does not do, accessibility, privacy, help and citing, in both languages; its counts are read from the Library | the same |
| `/teaching/investigation/<id>/` | One page for every investigation: the <!--fact:investigations-->95<!--/fact--> lessons that run in the simulation and the <!--fact:guidedInvestigations-->17<!--/fact--> guided investigations of the Observatory, the 3-D lab and the mission lab (<!--fact:libraryInvestigations-->112<!--/fact--> in the Library; the generator reads the count) | the same |
| `/teaching/activity/<id>/` | One page for every classroom activity | the same |
| [`/instructors/`](instructors/) | The public start (the adoption pages, the instructor path, submission review) and, behind the passphrase, only the answer keys, the instructor notes and the rest of the encrypted materials; each card links its adoption page | by hand |

The pages are static HTML, written in both languages as the shell writes them
(`css/shell.css` shows the one the page's `<html lang>` names; a small inline
module applies the language this browser chose, which a static page otherwise
never does). A page costs no JavaScript beyond the shell's own module; the index
adds one small module for its filters (`js/teach/find.js`).

## What an adoption page says

Read from `library/library.json` (LIBRARY.md), the lesson and guide files, the
instructor notes' public words, the dataset manifests and the activity
definitions:

- **At a glance:** where it runs, who it is written for, the course it suits,
  the textbook chapter, the time, the mathematics asked, how many numbers are
  worked out, the subjects, the steps and whether it works offline.
- **Objectives** (lessons), in both languages.
- **Before this:** the investigations declared as prerequisites (linked), and
  what students should already know, from the instructor notes.
- **The steps,** in order, with what each asks (read, predict, question,
  measure, explore, an instrument) and the depth a deeper step belongs to.
- **Instruments** the steps dock.
- **Data it uses,** each dataset with its kind, license, credit and citations,
  read from its manifest (`data-packs/`) or its catalog entry. An investigation
  that runs on worlds the simulation builds says so.
- **Common wrong turns:** the claims the instructor notes record, never the
  responses, which sit with the answer key.
- **What is marked and what is not:** how many steps are checked automatically
  (a choice or a number), how many need an instructor's judgment (a written
  answer) and how many are recorded and not marked (a prediction).
- **Accessibility,** in the words of the teaching page.
- **Hand it out:** the activity builder (`/?assign=<id>`) and the ready-made
  cuts (a demonstration, a short route, a guided activity, a full lab).
- **Embed a figure:** a ready `<iframe>` for each world the investigation uses
  (`EMBEDDING.md`), or the figure builder for one that runs in a lab of its own.
- **Preview as a student:** `/?author=<id>&view=student&preview=student` for a
  lesson, the authoring preview without its bar; every other kind the Library
  lists (the Observatory, 3-D and mission guides, activities, courses, datasets,
  scenarios, experiments) at its own route with `preview=student`. Each starts
  clean, says it is a preview in a banner, and reads and writes none of the
  progress saved in this browser (`js/storage/local.js`; `e2e/adoption.spec.js`
  and `e2e/previewParity.spec.js` hold it to that). Prompt 175 replaced the
  earlier staging (D-ADOPT-01), where the labs' guides recorded that they were
  opened.
- **Instructor materials:** a link to `/instructors/`. The public words are on
  the page; the answers are not (`tests/adoptionPages.test.js` fails if a step's
  explanation, a response or a teaching note appears). This generator never reads
  the passphrase and never writes `instructors/materials.enc.json`.

## The fields it needed (R-L, and the alignment)

`tools/library-curation.json` holds what no source file declares: see
[LIBRARY.md](LIBRARY.md), "What no source owns". Every dataset, experiment,
scenario, course and activity now has a summary, level, duration, mathematics
and prerequisites.

**Textbook alignment** is OpenStax Astronomy 2e: a chapter and, where one fits,
a section. A lesson declares it in its own file (`textbook: {chapter, section}`
and `courseLevel`: `survey`, `majors` or `upper`), `npm run manifest` carries it
into `js/data/investigations/discovery.js` (which no lesson route loads), and
the Library and the pages read it from there. The guides' alignment is in the
curation file, because their files are on routes with no spare bytes. The
Investigation Composer's pack format takes the same two optional fields
(`textbook`, `courseLevel`), validated, in the schema and as three controls in
the composer's About section.

The chapters were written from the book's table of contents, which could not
be fetched while this was written: the chapter is the claim, a section is given
only where one fits, and an adopter should check them against the book in hand
(D-ADOPT-01).

## The alignment page and the short route (Prompt 97)

`/teaching/alignment/` lists every investigation and activity under the OpenStax
chapter it declares, generated from the same rows as the index. Each
investigation's page also links a **default short route**: the assignment
builder opened with a derived selection (`/?assign=<id>&route=short`, from
`js/assignments/shortRoute.js`): the first prediction, measurement, number,
choice and explanation at the core depth, plus the steps they need, estimated at
no more than 25 minutes. It is derived, never stored, so it cannot go stale.

## Coverage per investigation

Every investigation (41 when this section was written; the Library holds 72 now) declares a summary, level, duration,
mathematics, calculation bucket, subjects, prerequisites (an empty list means
none), textbook chapter and course level. Missing: a card picture for the 17
guided investigations, and a textbook *section* for two lessons (Goldilocks,
When Orbits Lock) where no one section fits. The table in LIBRARY.md is the
generated count for every kind.

## Keeping them fresh

`node tools/build-adoption-pages.mjs` writes every page and the adoption block
of `sitemap.xml`; `--check` fails for a page that differs from what it would
write and for a page it no longer writes. It is a node of the generate graph
(`adoption`, after `library`), a quick check (`npm run generate -- --check --only adoption`), and
`tests/adoptionPages.test.js` runs it in Jest, which is how CI holds it. Each
page is written with the shell and the Content-Security-Policy already in it, so
`shell.mjs --check` and `csp.mjs --check` find nothing to change. A new lesson,
guide, activity or dataset package changes a page by itself; a lesson with no
textbook chapter fails the manifest generator.

## Budgets

The pages are markup. Route rows `adoption` and `teach-find` are new, measured
(`tools/route-budgets.json`, D-BIND-07), not raises. The lesson fields add
under a kilobyte to each lesson file and every lesson route stayed inside its
ceiling.

## Staged

D-ADOPT-01 lists what did not fit: the textbook and course-level filters in the
Library page itself, a progress-free preview in the three labs, Spanish for the
instructor notes the pages quote, and a menu entry (index.html has 18 bytes
under its ceiling), so the index is reached from Teach and from the instructor
resources.
