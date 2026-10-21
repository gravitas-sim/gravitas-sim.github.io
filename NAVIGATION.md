# The navigation model

What a first-time visitor should find, how every existing surface maps into it, and the structural checks that hold the site to it. Roadmap III Prompt 161 wrote this document and the checks; nothing visible changed in that prompt. Prompts 162 to 167 change what people see, and each is accepted by these checks. The model, the ceilings and the list of checks the site fails today are decision-register row D-R10-37.

The numbers and tables below marked generated come from `tools/navigation-inventory.json` (`node tools/navigation.mjs write` rewrites them; `tests/navigationChecks.test.js` fails when they are stale). Prose is the author's.

## The model

A first-time visitor reads five destinations without documentation, in this order: **Explore, Learn, Observe, My work, Teach**. Everything else is reached from within one of them, by intent (a button that says what it does) or by context (a card, a related link, an action inside a plot). The model adds no destination; a sixth would need a register row.

### Why five, and why these

The working hypothesis of the roadmap (section 9.4) was checked against the tree, not assumed.

- **The menu names tools more than places.** The shell stamps one global navigation on all 109 pages: five groups (Learn, Labs, Make, Teach, About) holding 25 links, with 3 more in the footer. Of the 25 links, 5 are a destination's own page; 11 are a tool, an authoring surface or a diagnostics page (the 3-D lab, Mission lab, Sky Lab, Scenario Studio, Investigation Composer, Course builder, Figure builder, the two diagnostics pages and others), 2 are collections, 3 are instructor resources and 4 are documents. A visitor must already know what a "Composer" is to choose it.
- **Home offers three entries and six counts.** The front door's doors are Sandbox, Investigations and Instructors (`js/data/welcome.js`), and the block under them links six Library kinds with their counts ("Investigations (77)").
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

"Reached from" is the model's answer, written for Prompts 162 and 166 to build; it is not what the site does today (the last column is today's menu group). A surface with no destination is documentation or a diagnostic, reached from within.

<!-- navigation:surfaces -->
| Surface | Path | Role | Destination | Reached from | Menu today |
| --- | --- | --- | --- | --- | --- |
| Sandbox | `/` | destination | Explore | Home; the brand link; Explore's first action | labs |
| 3-D lab | `/3d/` | tool | Explore | a card on the Explore page; the Library's 3-D scenario cards | labs |
| Mission lab | `/mission/lab/` | tool | Explore | a card on the Explore page; the Library's mission investigations | labs |
| Scenario Studio | `/studio/` | authoring | Explore | the scenario section of the Explore page | make |
| Library | `/library/` | destination | Learn | Home; Learn's first action | learn |
| Investigations | `/#investigations` | tool | Learn | the Library's investigation cards; Home | learn |
| Courses | `/course/` | collection | Learn | the Library's course cards; Learn's pathways | learn |
| Observatory | `/observatory/` | destination | Observe | Home; Observe's first action | learn |
| Experiments | `/experiments/` | tool | Observe | the Observe page; the Library's experiment cards | learn |
| Sky Lab | `/sky/` | tool | Observe | the Observe page | labs |
| Compute page | `/compute/` | tool | Observe | the Observe page (today only a saved notebook in My work links to it) | none |
| Catalog | `/catalog/` | collection | Observe | the Observe page (datasets to install); Teach (course packages to install) | make |
| Figure builder | `/figure/` | authoring | Observe | the figure action of a plot or an analysis result | make |
| My work | `/my-work/` | destination | My work | Home; every page's global navigation | learn |
| Teaching with Gravitas | `/teaching/` | destination | Teach | Home; Teach's first action | teach |
| Instructor resources | `/instructors/` | instructor | Teach | the Teach page | teach |
| Submission review | `/instructors/submissions/` | instructor | Teach | the instructor resources | teach |
| Classroom evidence kit | `/evaluation/` | instructor | Teach | the Teach page | teach |
| Investigation Composer | `/studio/lesson/` | authoring | Teach | the Teach page (make an investigation or an activity) | make |
| Course-package builder | `/studio/course/` | authoring | Teach | the Teach page (make a course) | make |
| Investigations in a course | `/studio/course/packs/` | authoring | Teach | the course-package builder | none |
| Find content to teach | `/teaching/find/` | document | Teach | the Teach page | none |
| Adopter's guide | `/teaching/adopt/` | document | Teach | the Teach page | none |
| Textbook alignment | `/teaching/alignment/` | document | Teach | the Teach page | none |
| Classroom kit | `/teaching/kit/` | document | Teach | the Teach page | none |
| Adoption pages: activities | `/teaching/activity/*` | content | Teach | the Teach page; the Library's activity cards | none |
| Adoption pages: investigations | `/teaching/investigation/*` | content | Teach | the Teach page; the Library's investigation cards | none |
| How the model works | `/model/` | document | none (reached from within) | Home; the Teach page; the footer | about |
| Physics validation | `/validation/` | document | none (reached from within) | the footer; the Teach page | about |
| Glossary | `/glossary/` | document | none (reached from within) | a term in context; the Teach page | about |
| User manual (PDF) | `/Gravitas_User_Manual.pdf` | document | none (reached from within) | the Teach page; the footer | about |
| 3-D kernel diagnostics | `/lab3d/` | diagnostic | none (reached from within) | the 3-D lab's evidence section | about |
| Mission core diagnostics | `/mission/` | diagnostic | none (reached from within) | the Mission lab's evidence section | about |
| The first Gravitas | `/history/original/` | document | none (reached from within) | one quiet link in the model page's footer | none |
<!-- /navigation:surfaces -->

Two findings from making the table:

- `/compute/` is on no menu and no page links to it: the one way in is a saved notebook in My work (`js/myWork/model.js`). The reachability check registers it.
- Of the 25 menu links, 7 sit under the group that carries their destination's name (Learn or Teach), 6 belong to no destination (the documents and the diagnostics) and 12 sit under a group that is not their destination's: My work, Observatory and Experiments under Learn, Sandbox, 3-D lab, Mission lab and Sky Lab under Labs, and the five authoring surfaces and the Catalog under Make.

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

Today four do not, all in words that 162 rewrites, and the list can only shrink:

- Sandbox: the shell and the Library say "Simulación libre", Home's door says "Laboratorio".
- Instructor resources: the shell says "Recursos para docentes", Home says "Recursos para el profesorado".
- Figure builder: the shell says "Creador de figuras", the glossary "Constructor de figuras".
- Course builder: the shell says "Course builder" and "Creador de cursos", the glossary "Course-package builder" and "Creador de paquetes de curso".

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
| Glossary consistency | `tests/navigationChecks.test.js` | one thing, one name, across the menu, Home, the Library and the glossary | yes, except the four registered divergences |
| Reachability walk | both | a first action is on its page; every menu and footer link lands; each destination's first action is reached through the global navigation in both languages; Home's links land; no page loses its path from Home | yes, except what is pending |

The default view counts a choice as a link, button, form control or disclosure summary that is rendered, not hidden, not inert, inside the viewport and larger than a sliver; a closed disclosure counts its summary and nothing inside. The sandbox's control rail is the application, not a page of choices, and is not counted. The default-view ceilings carry one to three choices of slack over what the page measured (Chromium on macOS, 2026-10-21), because a fold can fall differently on another platform's fonts; the static counts carry none.

### Ceilings (generated)

Lowering one is the work of the prompt that earns it; raising one needs a decision-register row.

<!-- navigation:ceilings -->
| Ceiling | Value |
| --- | ---: |
| `menu.groups` | 5 |
| `menu.entries` | 25 |
| `menu.distinctPages` | 25 |
| `footer.links` | 3 |
| `home.doors` | 3 |
| `home.resourceLinks` | 3 |
| `home.featuredScenarios` | 6 |
| `home.audiences` | 3 |
| `home.libraryKindLinks` | 6 |
| `home.countedLinks` | 6 |
| `library.kinds` | 6 |
| `library.formats` | 15 |
| `library.filters` | 7 |
| `reach.maxClicksFromHome` | 3 |
| `reach.pagesWithoutALinkFromHome` | 1 |
| `defaultView.home-first-visit.desktop` | 12 |
| `defaultView.home-first-visit.phone` | 6 |
| `defaultView.home.desktop` | 14 |
| `defaultView.home.phone` | 7 |
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

## What the site fails today

These checks describe the model and fail now, by design. They run under the future-acceptance contract of Prompt 145 (`tools/pending-acceptance.mjs`, `tools/pending-acceptance.json`): each runs, its outcome is reported in a "pending acceptance" section, none counts as a failure, and none is quarantined (they never touch the pass or fail of any other test). Prompt 166 activates every one by name; an activated check is an ordinary fatal test. `node tools/pending-acceptance.mjs report` prints them after a run.

<!-- navigation:pending -->
| Check | What it holds the site to | Work of | Activated by |
| --- | --- | --- | --- |
| `navigation.global.five-destinations` | The global navigation's top-level entries are the five destinations, in the model's order, labelled as the model says in both languages. | 162 | 166 |
| `navigation.global.menu-follows-model` | Every global-navigation link goes to a surface the model maps to a destination, under that destination's entry; no tool, authoring surface, diagnostic or document is a menu entry. | 162, 166 | 166 |
| `navigation.labels.shell-matches-glossary` | Every global-navigation label that names a glossary term carries the glossary's English and Spanish. | 162 | 166 |
| `navigation.home.entries-are-destinations` | Home's entries are the five destinations. | 162 | 166 |
| `navigation.home.no-count-walls` | Home shows no count of Library content. | 162 | 166 |
| `navigation.reach.every-page-from-home` | Every page of the site has a path of links from Home, in the pages' own markup. | 162 | 166 |
| `navigation.library.student-kinds-only` | The Library's kind facet and card badges show only the four kinds students see. | 163 | 166 |
| `navigation.library.no-where-it-runs` | The Library has no 'where it runs' facet. | 163 | 166 |
| `navigation.library.default-view-is-bounded` | The Library's default view renders a bounded set of starting points, not the whole catalog. | 163 | 166 |
<!-- /navigation:pending -->

The registered failures are exactly the work of 162 to 167: Home and the global navigation (162), the Library's kinds, facets and default view (163), and the menu's consolidation (166, with 165's verdicts for any surface that changes its route).

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
