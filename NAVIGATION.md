# The navigation model

What a first-time visitor should find, how every existing surface maps into it, and the structural checks that hold the site to it. Roadmap III Prompt 161 wrote this document and the checks; nothing visible changed in that prompt. Prompt 162 then built Home and the global navigation to the model (see "Home and the global navigation" below). Prompts 163 to 167 change what people see next, and each is accepted by these checks. The model, the ceilings and the list of checks the site still fails are decision-register row D-R10-37; Prompt 162's changes are its own row.

The numbers and tables below marked generated come from `tools/navigation-inventory.json` (`node tools/navigation.mjs write` rewrites them; `tests/navigationChecks.test.js` fails when they are stale). Prose is the author's.

## The model

A first-time visitor reads five destinations without documentation, in this order: **Explore, Learn, Observe, My work, Teach**. Everything else is reached from within one of them, by intent (a button that says what it does) or by context (a card, a related link, an action inside a plot). The model adds no destination; a sixth would need a register row.

### Why five, and why these

The working hypothesis of the roadmap (section 9.4) was checked against the tree, not assumed.

- **The menu named tools more than places** (measured by Prompt 161, before Prompt 162 replaced it). The shell stamped one global navigation on all 109 pages: five groups (Learn, Labs, Make, Teach, About) holding 25 links, with 3 more in the footer. Of the 25 links, 5 are a destination's own page; 11 are a tool, an authoring surface or a diagnostics page (the 3-D lab, Mission lab, Sky Lab, Scenario Studio, Investigation Composer, Course builder, Figure builder, the two diagnostics pages and others), 2 are collections, 3 are instructor resources and 4 are documents. A visitor must already know what a "Composer" is to choose it.
- **Home offered three entries and six counts** (before Prompt 162). The front door's doors were Sandbox, Investigations and Instructors, and the block under them linked six Library kinds with their counts ("Investigations (77)").
- **The Library names where code runs.** Its default view is nine controls (search, seven filters and an arrangement) over 175 entries in six kinds and fifteen formats, and every card carries a second badge such as "In the 3-D lab".
- **The conformance baseline (Prompt 127, `ACCESSIBILITY_CONFORMANCE.md`)** records WCAG 2.2 criterion 3.2.3 (consistent navigation) as partially supported, the shared shell carrying the same navigation in the same order, and 2.4.5 (multiple ways) as partially supported because no test confirmed that every page is reachable in more than one way. This document's reachability walk is the missing test.
- **Every surface maps** (the table below): there is no page the five destinations cannot hold, and none that needs a sixth. What does not fit a destination as a page (the model page, the validation page, the glossary, the manual, the two diagnostics pages, the first Gravitas) is documentation, reached from the footer and from the place it explains.
- **What the audit did not find** is evidence that five is the right number for a person. The count is a working hypothesis about structure; only observed people can test it (Appendix A of the roadmap lists the owner-led sessions). It stands because nothing contradicts it and the mapping is complete.

Teach stays visible to everyone, as today.

### The destinations (generated)

<!-- navigation:destinations -->
| Destination | One line | First action |
| --- | --- | --- |
| Explore / Explorar | Build a system, load a scenario and change anything while it runs.<br>Construye un sistema, carga un escenario y cambia lo que quieras mientras se ejecuta. | Open the sandbox / Abrir la simulación libre (`/`, `#simulationCanvas`) |
| Learn / Aprender | Guided investigations, sequences and courses, each ending in a report you can hand in.<br>Investigaciones guiadas, secuencias y cursos, cada uno con un informe que puedes entregar. | Search the Library / Buscar en la Biblioteca (`/library/`, `#libSearch`) |
| Observe / Observar | Measure real and synthetic observations, and run experiments on the model.<br>Mide observaciones reales y sintéticas, y ejecuta experimentos con el modelo. | Open an observation / Abrir una observación (`/observatory/`, `#obsOpen`) |
| My work / Mi trabajo | Everything you have made, kept on this device: progress, reports and backups.<br>Todo lo que has hecho, guardado en este dispositivo: progreso, informes y copias de seguridad. | Back up your work / Hacer una copia de tu trabajo (`/my-work/`, `#mwExport`) |
| Teach / Enseñar | Run Gravitas in a course: teaching materials, activities, answer keys and a quick start.<br>Usa Gravitas en un curso: materiales didácticos, actividades, claves de respuestas y un inicio rápido. | Start with the quick start / Empezar por el inicio rápido (`/teaching/`, `a[href="#path-start"]`) |
<!-- /navigation:destinations -->

What each contains:

- **Explore** holds the Sandbox, the 3-D lab, the mission lab and scenarios (built in, from the Library, or made in the Scenario Studio). It is where a visitor changes a system and watches it.
- **Learn** holds investigations, sequences and courses, and the Library that lists them. It is where a visitor is guided and ends with a report.
- **Observe** holds the Observatory, experiments, the analysis (compute) page, the Sky Lab, datasets and the Catalog that installs them, and the figure builder. It is where a visitor measures something that was observed or simulated.
- **My work** holds what a visitor has made on this device: progress, reports, backups. It is the only destination that is a place for state rather than for content.
- **Teach** holds the teaching pages, the instructor resources, the submission review, the classroom evidence kit, the investigation and course builders and the adoption pages. It is for an instructor adopting Gravitas in a course.

## Where every surface goes

"Reached from" is what the site does since Prompt 162: the five destinations are the whole menu (the last column), and every other surface is reached from its destination's page through the places block that page carries (`tools/shell.mjs` `PLACES`, stamped between `<!-- shell:places -->` markers), from Home's Explore entry (Explore's own page is the sandbox), or from context. A surface with no destination is documentation or a diagnostic, reached from within.

<!-- navigation:surfaces -->
| Surface | Path | Role | Destination | Reached from | In the menu |
| --- | --- | --- | --- | --- | --- |
| Sandbox | `/` | destination | Explore | Home; the brand link; the global navigation | yes |
| 3-D lab | `/3d/` | tool | Explore | the places block of Home's Explore entry; the Library's 3-D scenario cards | no |
| Mission lab | `/mission/lab/` | tool | Explore | the places block of Home's Explore entry; the Library's mission investigations | no |
| Scenario Studio | `/studio/` | authoring | Explore | the places block of Home's Explore entry | no |
| Library | `/library/` | destination | Learn | Home; the global navigation | yes |
| Investigations | `/#investigations` | tool | Learn | the places block of the Library; the Library's investigation cards; Home's first-week start | no |
| Courses | `/course/` | collection | Learn | the places block of the Library; the Library's course cards; Home's first-week start | no |
| Observatory | `/observatory/` | destination | Observe | Home; the global navigation | yes |
| Experiments | `/experiments/` | tool | Observe | the places block of the Observatory; the Library's experiment cards | no |
| Sky Lab | `/sky/` | tool | Observe | the places block of the Observatory | no |
| Compute page | `/compute/` | tool | Observe | the places block of the Observatory | no |
| Catalog | `/catalog/` | collection | Observe | the places block of the Observatory (datasets to install); Teach (course packages to install) | no |
| Figure builder | `/figure/` | authoring | Observe | the places block of the Observatory; the figure action of a plot or an analysis result | no |
| My work | `/my-work/` | destination | My work | Home; the global navigation | yes |
| Teaching with Gravitas | `/teaching/` | destination | Teach | Home; the global navigation | yes |
| Instructor resources | `/instructors/` | instructor | Teach | the places block of the Teach page | no |
| Submission review | `/instructors/submissions/` | instructor | Teach | the instructor resources | no |
| Classroom evidence kit | `/evaluation/` | instructor | Teach | the places block of the Teach page | no |
| Investigation Composer | `/studio/lesson/` | authoring | Teach | the places block of the Teach page (make an investigation or an activity) | no |
| Course-package builder | `/studio/course/` | authoring | Teach | the places block of the Teach page (make a course) | no |
| Investigations in a course | `/studio/course/packs/` | authoring | Teach | the course-package builder | no |
| Find content to teach | `/teaching/find/` | document | Teach | the Teach page | no |
| Adopter's guide | `/teaching/adopt/` | document | Teach | the Teach page | no |
| Textbook alignment | `/teaching/alignment/` | document | Teach | the Teach page | no |
| Classroom kit | `/teaching/kit/` | document | Teach | the Teach page | no |
| Adoption pages: activities | `/teaching/activity/*` | content | Teach | the Teach page; the Library's activity cards | no |
| Adoption pages: investigations | `/teaching/investigation/*` | content | Teach | the Teach page; the Library's investigation cards | no |
| How the model works | `/model/` | document | none (reached from within) | the places block of the Teach page; Home's orientation | no |
| Physics validation | `/validation/` | document | none (reached from within) | the footer; the places block of the Teach page | no |
| Glossary | `/glossary/` | document | none (reached from within) | a term in context; the places block of the Teach page | no |
| User manual (PDF) | `/Gravitas_User_Manual.pdf` | document | none (reached from within) | the places block of the Teach page | no |
| 3-D kernel diagnostics | `/lab3d/` | diagnostic | none (reached from within) | the 3-D lab's evidence section | no |
| Mission core diagnostics | `/mission/` | diagnostic | none (reached from within) | the Mission lab's evidence section | no |
| The first Gravitas | `/history/original/` | document | none (reached from within) | one quiet link in the model page's footer | no |
<!-- /navigation:surfaces -->

Two findings from making the table (Prompt 161), and what became of them:

- `/compute/` was on no menu and no page linked to it: the one way in was a saved notebook in My work (`js/myWork/model.js`). Prompt 162 put it in the Observatory's places block, so every page now has a path from Home (`reach.pagesWithoutALinkFromHome` is 0).
- Of the 25 menu links, 7 sat under the group that carried their destination's name, 6 belonged to no destination (the documents and the diagnostics) and 12 sat under a group that was not their destination's. The menu is now the five destinations, so every entry is its own destination's.

## What students see: kinds

A student sees four kinds of thing: **investigation, dataset, scenario, course**. This keeps the task, dataset and tool distinction of D-TERM-01: an investigation is a task, a dataset is data, a scenario is a starting world, a course is an ordered set of the others. A tool (a lab, a builder, a runner) is a place and never a kind: nothing in the Library lists one, and no label names a subsystem.

The Library holds six internal kinds today. The two that are not student kinds map onto one:

<!-- navigation:kinds -->
| Library kind | Students see | Why |
| --- | --- | --- |
| `investigation` | seen as `investigation` | shown to students |
| `dataset` | seen as `dataset` | shown to students |
| `scenario` | seen as `scenario` | shown to students |
| `course` | seen as `course` | shown to students |
| `activity` | seen as `investigation` | internal kind; a shorter classroom form of an investigation (glossary: Activity); a student opens it as one, and Teach keeps the word |
| `experiment` | seen as `investigation` | internal kind; a run-and-measure task over the model; a student does it as an investigation, and Observe holds the runner |
<!-- /navigation:kinds -->

The glossary's nouns stay: Teach keeps "activity" (it is the instructor's word for the assignable form, D-TERM-01), and the Library's type badge is the glossary's noun in both languages (a check). What changes in 163 is what the filter and the cards say, not what the kinds are called in storage, formats or links.

## Words

One noun per thing. `tools/glossary.mjs` is the source: `NOUNS` (the eight nouns), `RETIRED` (lesson, guide, pack and assignment, each with what to write instead) and `LABELS` (the page, instrument and quantity names with both languages). `tests/terminology.test.js` keeps the retired words out of what a reader sees; `tools/i18n-labels.mjs` holds the catalogs to `LABELS`. This document adds one table the inventory carries: the things that are named on more than one surface (the shell's menu, Home, the Library, a page's title, the glossary), each of which must carry the same English and Spanish on every one (a leading article is not a difference).

Prompt 161 found four that did not (the sandbox, the instructor resources, the figure builder and the course builder), all in words Prompt 162 rewrites. The shell now says what the glossary says ("Constructor de figuras", "Course-package builder" and "Creador de paquetes de curso"), Home no longer has doors with their own words for the sandbox and the instructors, and the list of registered divergences is empty: a new one fails `tests/navigationChecks.test.js`.

The new labels this document proposes (one line and first action of each destination, in both languages) are written by the project and have not been read by a fluent Spanish reader; the translation pass is owner-led (`TRANSLATION.md`, Appendix A).

## Acceptance criteria

Two binding decisions of Roadmap III (section 7.2) become acceptance criteria for 162 to 167 and for every later closeout. The checks below read the criteria; where a criterion is a judgment, the review protocol covers it.

**Cohesion is an acceptance criterion of every expansion phase (7.2, item 10).**

1. No new top-level destination: the menu's top level is the five destinations (`navigation.global.five-destinations`).
2. The menu, Home and the Library's default view are not longer than the ceilings below, or the growth is absorbed by grouping (the ceilings and the default-view counts).
3. No new kind, menu entry or filter without a register row (the kinds-exposed test and the ceilings: a count that rises fails, and raising a ceiling is a row).
4. Every item is reachable by a sequence, a topic page, a course, a related or next link, a search and a recommended start; "users can search for it" is never the only way (the reachability walk covers links; 163 adds the relations).
5. No duplicated terminology (the label table).
6. The structural navigation checks are green, and every item still on the pending list names the prompt that removes it.

**Progressive disclosure is task-aware (7.2, item 11).** Simple by default, deeper on request, without hiding the quantities a task asks the student to reason about. 161 does not fold anything; its default-view ceilings count what is above the fold now, and 167 owns the control counts of the lesson panel, instruments, settings and the plot component, with its own task rule. A default-view ceiling is never lowered by hiding a unit or an uncertainty a step asks about.

## The structural checks

They are named structural everywhere. Each reads the built pages, this document and the inventory.

| Check | Where | What it holds | Fatal today |
| --- | --- | --- |
| Navigation inventory | `tests/navigationChecks.test.js` | every page and menu entry is a row of the inventory, the rows agree with the shell, the menu is the same on every page, and menu, footer, Home and Library counts are within their ceilings | yes |
| Default-view count | `e2e/navigation.spec.js` | the choices above the fold at 1280 by 800 and 390 by 844 for Home (first visit and reopened), the Library, My work, the Observatory and Teaching, against the ceilings | yes |
| Kinds exposed | both | the Library's facet and every card's type label exist in both languages, are the catalog's, are the glossary's nouns and name no subsystem | yes |
| Glossary consistency | `tests/navigationChecks.test.js` | one thing, one name, across the menu, Home, the Library and the glossary | yes (Prompt 162 emptied the registered divergences) |
| Reachability walk | both | a first action is on its page; every menu and footer link lands; each destination's first action is reached through the global navigation in both languages; Home's links land; no page loses its path from Home | yes (the six Home and navigation checks were activated by Prompt 162) |

The default view counts a choice as a link, button, form control or disclosure summary that is rendered, not hidden, not inert, inside the viewport and larger than a sliver; a closed disclosure counts its summary and nothing inside. The sandbox's control rail is the application, not a page of choices, and is not counted. The default-view ceilings carry one to three choices of slack over what the page measured (Chromium on macOS, 2026-10-21), because a fold can fall differently on another platform's fonts; the static counts carry none.

### Ceilings (generated)

Lowering one is the work of the prompt that earns it; raising one needs a decision-register row.

<!-- navigation:ceilings -->
| Ceiling | Value |
| --- | ---: |
| `menu.groups` | 5 |
| `menu.entries` | 5 |
| `menu.distinctPages` | 5 |
| `footer.links` | 3 |
| `home.doors` | 5 |
| `home.firstWeekLinks` | 4 |
| `home.countedLinks` | 0 |
| `library.kinds` | 6 |
| `library.formats` | 15 |
| `library.filters` | 7 |
| `reach.maxClicksFromHome` | 3 |
| `reach.pagesWithoutALinkFromHome` | 0 |
| `defaultView.home-first-visit.desktop` | 12 |
| `defaultView.home-first-visit.phone` | 6 |
| `defaultView.home.desktop` | 14 |
| `defaultView.home.phone` | 8 |
| `defaultView.library.desktop` | 24 |
| `defaultView.library.phone` | 14 |
| `defaultView.my-work.desktop` | 9 |
| `defaultView.my-work.phone` | 3 |
| `defaultView.observatory.desktop` | 16 |
| `defaultView.observatory.phone` | 9 |
| `defaultView.teaching.desktop` | 21 |
| `defaultView.teaching.phone` | 3 |
<!-- /navigation:ceilings -->

## What these checks do not prove

They prove structure, language consistency and reachability. They do not prove comprehension: that a first-time visitor reads "Observe" and knows it is where measurement happens, that the one-line descriptions are understood, that the first actions are what a student reaches for, or that five is a good number for a person. Only observed people can, in sessions the owner runs (roadmap Appendix A: the student usability sessions that use the first-week mode and these checks as the task list). Nothing here is a user study, a usability result or evidence about learning, and no release note may say so.

## What the site still fails

Three checks describe the Library's model and fail now, by design (Prompt 163's work). The other six of Prompt 161's nine, which describe Home and the global navigation, were activated by Prompt 162 (`activated: true` in `tools/pending-acceptance.json`) and are ordinary fatal tests (`tests/navigationChecks.test.js`, "Home and the global navigation follow the model"). The three run under the future-acceptance contract of Prompt 145 (`tools/pending-acceptance.mjs`, `tools/pending-acceptance.json`): each runs, its outcome is reported in a "pending acceptance" section, none counts as a failure, and none is quarantined (they never touch the pass or fail of any other test). Prompt 166 activates the rest by name; an activated check is an ordinary fatal test. `node tools/pending-acceptance.mjs report` prints them after a run.

<!-- navigation:pending -->
| Check | What it holds the site to | Work of | Activated by |
| --- | --- | --- | --- |
| `navigation.library.student-kinds-only` | The Library's kind facet and card badges show only the four kinds students see. | 163 | 166 |
| `navigation.library.no-where-it-runs` | The Library has no 'where it runs' facet. | 163 | 166 |
| `navigation.library.default-view-is-bounded` | The Library's default view renders a bounded set of starting points, not the whole catalog. | 163 | 166 |
<!-- /navigation:pending -->

The registered failures that remain are the work of 163: the Library's kinds, facets and default view. Prompt 166's consolidation (with 165's verdicts for any surface that changes its route) works from this inventory.

## Home and the global navigation (Prompt 162)

What a visitor sees, since Prompt 162 (the table of what changed is in the pull request):

- **The global navigation is the five destinations**, one link each, in the model's order and in both languages, the same on every page: Explore (the sandbox), Learn (the Library), Observe (the Observatory), My work and Teach. It is a flat list: no dropdown holds anything. The destination a page belongs to is marked (`aria-current="true"`, and `"page"` on the destination's own page); the marking comes from the inventory's rows, so a page that moves is one edit.
- **Everything that was a menu entry is reached from its destination.** A destination's page carries a "places" block (Learn on the Library, Observe on the Observatory, Teach on the Teaching page, the last with the documents), stamped by `tools/shell.mjs` from `PLACES`; Explore's page is the sandbox, so its three places (the 3-D lab, the mission lab, the Scenario Studio) are in Home's Explore entry. No capability was removed: only its menu entry moved.
- **A breadcrumb on every page but the sandbox** (the destination, then the page; Gravitas first only where a page has no destination, since the brand link already goes Home), also stamped from the inventory. The sandbox's fixed bar is one row over the canvas and keeps the marked destination only.
- **Home answers three questions and offers one list.** What this is (one paragraph, in both languages); what to do first (`firstWeek` in the inventory: a first investigation, a first observation, the sandbox and a course for an instructor, each a Library entry read by `tools/build-library.mjs` or an action); where was I (the lessons started and not finished, shown only when there are some; Prompt 163's resume record replaces it); and the five destinations with their one line each, generated from the inventory. The three-screen introduction is kept, shown first on a first visit and reachable from Home's foot ("Show the introduction again", beside the quick tour). Home shows no count of content, no scenario cards, no list of investigations and no feature list.
- **What 162 did not do:** add a destination, rename a surface's route, or touch a lesson. The Library's own kinds, facet and default view are Prompt 163's.

## The internal review protocol

A checkpoint runs this inspection, and records it as an internal inspection: the reviewer is on the project, so it is never reported as a user study and never as evidence that a visitor understands anything.

1. **Build and state.** Record the commit, the date and the build the pages were served from; run the structural checks and `node tools/pending-acceptance.mjs report`; record the counts that moved against the ceilings.
2. **Five destinations.** In both languages, at a phone width and a desktop width, from a first visit, for each destination: record its label and one line as shown, whether its first action is visible without scrolling, and the number of activations from Home to it.
3. **Mapping.** For each surface added or moved since the last checkpoint: record where it is reached from and whether the inventory row says so; for each menu link, whether it sits under its destination.
4. **Kinds and words.** Record every kind and filter label the Library shows, every term that names one thing two ways, and any label that names a subsystem.
5. **Cohesion check (section 9.4).** Record: any new top-level destination; whether the menu, Home and the Library's default view are longer; any new kind, term or filter without a register row; whether each new item is discoverable by a sequence, a topic page, a course, a related or next link, a search and a recommended start; whether the default choice counts rose.
6. **What the inspection cannot say.** State in the record that a reviewer on the project cannot stand in for a first-time visitor, and list what remains for an observed session.

The record is a section of the checkpoint report. It adds no field to `tools/evidence-status.json`: that file holds claims, and this protocol makes none.

## Changing this document

The model, the mapping, the ceilings and the pending list live in `tools/navigation-inventory.json`; this document owns the prose and carries the generated tables. A change that adds a destination, a kind, a menu entry or a filter, or raises a ceiling, needs a register row. The inventory and this document are shared files that serialize merges (roadmap section 13).
