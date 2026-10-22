# The surface-retirement and consolidation gate

Roadmap III Prompt 165. The roadmap says surfaces whose existence is no longer justified should leave the site, and that "redirect for one release" is not a support policy. This document commits, before any surface is judged, the function that judges them, the five outcomes it can return, and the policy that protects the links and records people hold. The judgment of each surface is further down; nothing on the site changes in this prompt. Prompt 166 carries out the verdicts that Carl approves, one pull request each.

The decision function, its thresholds and the support periods are decision-register row D-R10-44. They are code in `tools/surface-gate.mjs` and are held to the evidence by `tests/surfaceGate.test.js`.

## What is committed first

The text of this section and the code of `tools/surface-gate.mjs` were committed before the evidence file `tools/surface-gate.json` existed (see the branch history). A threshold that a surface then failed was not moved to rescue it. If a threshold is wrong, the register row is the place to say so and the next gate uses the new one.

### The question asked of every surface

The same six questions, in the same order, for a page, a section of a page, a facet, an activity format and a stored format alike:

1. **Place in the navigation model.** Is it a destination's own first-action page; is it a menu entry that is not a destination; is it a section of a destination; is it a duplicate of one; is it none of these (documentation or a diagnostic)? The model is `NAVIGATION.md` and `tools/navigation-inventory.json`.
2. **Unique task.** Does it support a task that nothing else on the site supports? Answered `yes`, `partly` (another surface does most of it and the record says what is missing) or `no`, with the replacement named. An answer that cannot be given is `UNKNOWN` and the surface is kept.
3. **Evidence of use.** Links from shipped investigations, courses, activities and Library entries (counted, excluding the navigation's own places blocks, the footer and the sitemap, which exist for every surface); Library entries students open; and the referrer data Carl can read, which is recorded as UNKNOWN for every surface: Gravitas has no analytics by design (a static site; nothing leaves the browser), so no one on the project can say how often a page is opened. The absence of an UNKNOWN is never evidence of use, and an UNKNOWN is never evidence of disuse: only the two counted kinds decide, and the support periods below give the deprecated phase a purpose, which is to find out.
4. **Maintenance cost.** Six signals, each a number reached or not: source lines only the surface loads; test files that name it; generated artifacts that exist for it alone; catalog keys per language that only it uses; gzip kilobytes of its own files in the service worker's precache tiers; rows of the accessibility spec that open it. Cost is **material** when at least two reach their threshold (table below).
5. **Saved-state and link exposure.** Whether a student's or an instructor's record, a downloaded file or a shared link can point at it: stored formats and the links that carry state are listed by name.
6. **What the archive keeps regardless.** Everything. A retired capability leaves the site, not the history: the code stays in git (the `v2.0.0` tag and every later commit) and in the Zenodo deposit, and the release notes say what went where.

### The five outcomes, kept apart

The roadmap's review was right that these are three costs and not one:

- **GROUP**: the capability and its route stay; its *menu entry* moves under a destination. Cheap, reversible, no link breaks. (Prompt 162 already did this for the whole menu, so today GROUP matches no surface and a test proves it.)
- **CONSOLIDATE**: the *route* merges into a destination's page or a tool's tab; the old route redirects under the support policy. It changes what a bookmark does, so it needs a measured gain, not a tidier tree.
- **RETIRE**: the *capability* leaves the site. Code stays in history; the release notes say so; the old route becomes a page that says where the capability went.
- **FREEZE**: no new work; a notice says so; the surface stays and is judged again at the next checkpoint. This is the roadmap's B slice (a notice and a register note; the surface stays).
- **KEEP**: nothing changes. This is the roadmap's C consequence for a surface the gate cannot move (166 skips it) and the default for anything unproven.

### The decision function

Rules are tried in order; the first match wins; the rule id travels with the verdict.

| Rule | When | Verdict |
| --- | --- | --- |
| R0 | the unique-task test cannot be answered | KEEP |
| R1 | the surface is a destination's own first-action page | KEEP |
| R2 | the surface has a global-menu entry and is not a destination | GROUP |
| R3 | unique = yes | FREEZE (R3a) only if unused, nothing holds it or links to it, and cost is material; otherwise KEEP (R3b) |
| R4 | unique = no or partly, and no replacement is named | KEEP |
| R5 | unique = no, a replacement is named, nothing shipped uses it | **RETIRE** |
| R6 | unique = partly, a replacement is named, nothing shipped uses it | FREEZE (R6a) if cost is material; otherwise KEEP (R6b) |
| R7 | used, replaceable, and the merge into the named target is justified | **CONSOLIDATE** |
| R8 | used, replaceable, no justified merge | FREEZE (R8a) if cost is material; otherwise KEEP (R8b) |

A surface in use is never retired by the function. Retiring a used surface is a decision for Carl with a register row of its own, not an output of this table.

**Thresholds** (committed with the function; `THRESHOLDS` in the tool).

| Signal of cost | Reached at |
| --- | ---: |
| source lines only this surface loads | 1,500 |
| test files that name it | 3 |
| generated artifacts that exist for it alone | 2 |
| catalog keys per language that only it uses | 150 |
| gzip KB of its own files in the precache tiers | 20 |
| accessibility-spec rows that open it | 4 |

Material = at least two of the six. A merge is **justified** when it names a target, removes at least one route from the stamped set, does not raise any route's request ceiling, and measures at least one gain: 5 KB of gzip off the precache or a route, one choice fewer on a destination's default view, or one pair of duplicated modules named and removed.

**Why these numbers.** They are round figures about one order below the largest surface in the tree and above a typical document page; they are not fitted to a result. The two that matter most are the pairing (one signal is not material) and the merge rule's insistence on a measured gain, because the roadmap keeps lazy tool boundaries and stable URLs unless a measurement justifies moving them.

## The link-support policy

Adopted for the whole of Roadmap III (register row D-R10-44). It replaces "redirect for one release".

A route, a capability or a stored record is **deprecated**, then **read-only**, then **retired**:

| Phase | What works | Class L (a route or capability that holds nothing) | Class R (a saved record, a file a person can hold, a link that carries state) |
| --- | --- | --- | --- |
| Deprecated | everything, with a notice that names the replacement and the date the next phase starts | at least 6 months and 2 minor releases | at least 12 months and 2 minor releases |
| Read-only | the page or record opens and can be read, exported and printed; nothing new is written; a write is refused with an export path | at least 6 months and 1 minor release | at least 12 months and 1 minor release |
| Retired | a page at the old address, with no script, that names where the capability went and how to export what it held; the reader of a stored format is refused in words with an export path | indefinitely (a static page costs nothing) | indefinitely |

- **Counting.** A phase ends when both its months and its minor releases have passed. It is counted from the release that first carries the notice, never from a merge into `v3` or any train that is not deployed, because nobody has read the notice until the site has published it.
- **Class R is the support period of `FORMATS.md`** (decision D-R10-04: 12 months deprecated, 12 read-only, retirement announced in `CHANGELOG.md` one release ahead). The policy here is the same rule applied to routes and capabilities, and class L is shorter only because nothing a student made is lost when a route changes.
- **Announcement.** A retirement is named in `CHANGELOG.md` one release before it takes effect, and in the release notes of the release that carries it.
- **Records and shared links** are covered by the compatibility corpus of Prompt 134: before a writer stops writing a record, the corpus has a row that proves the reader still reads it, and a retirement that would make a 2.0.0 reader refuse or misread is a major-version boundary on the 3.0 train (Prompt 176).
- **Shortening a period** needs a register row that names the surface and the reason (a rights, safety or correctness defect). It never removes the retired page or the export path.
- **A retired surface's reader** is kept for the whole of its deprecated and read-only phases, and a stored format that nothing writes any longer keeps its reader until its class R periods have run.
- **Scope.** The policy protects a route, a capability a student can use, a stored record and a link that carries state. It does not protect *presentation*: a facet, a label, a section heading or an empty-state line is changed in the release notes, and an old link that names it still opens the page. (This scope sentence was written after the evidence showed two presentation items, the Library's "Where it runs" facet and the catalog's "Contributed" section, and is the one part of the policy that was; the thresholds and the function were not touched. The decision-register row says so.)
- **What this does not promise.** It does not promise that a third party's page that links to Gravitas will be updated, and it does not promise any support period before the first release that carries a notice: today nothing is deprecated.

### What a verdict commits the site to

| Verdict | Prompt 166 does | Notice and periods |
| --- | --- | --- |
| KEEP | nothing; 166 skips the surface | none |
| FREEZE | adds a notice in both languages and a register note; no new content or capability | the notice carries no date; the surface is judged again at the next checkpoint (171, then 287) |
| GROUP | moves the menu entry under the destination's places block | none; no link changes |
| CONSOLIDATE | merges the route into the named target, in its own pull request, `visible` | the old route is class L or R as the evidence says and redirects for its periods |
| RETIRE | removes the capability from the site after the deprecated and read-only phases; the pull request that starts the phases only adds the notice | class L or R as the evidence says |

## The judgments

### How the evidence was gathered

`tools/surface-gate.json` holds one record per surface: what the project judged (is the task unique, what replaces it, why) and what the tree measured (the six cost signals, links, Library entries, citations). `node tools/surface-gate.mjs measure` re-measures and recomputes every verdict; `node tools/surface-gate.mjs report` prints them; `tests/surfaceGate.test.js` holds each stored verdict to `decide()` and checks that every surface of the navigation inventory and every format without a schema is judged. The measurements are a snapshot at commit b5325149 (v3 after #408, Node 24 on macOS); no test recomputes them, because an unrelated edit to a lab would then fail a gate. The method is the comment at the head of the measuring code in `tools/surface-gate.mjs`.

What the evidence cannot say, stated plainly:

- **Referrer data is UNKNOWN for every surface.** The site collects none, by design. Nobody on the project can say how often a page is opened, so no verdict rests on use beyond the counted kinds.
- **"Used" means linked by a shipped investigation, course or activity, or opened by a Library entry.** Both are existence, not opens. A lab whose instruments are docked in lessons (the Sky Lab) shows 0 links when the lessons open the instrument and not the page; that is a weakness of the measure and is why exposure (the manual and the README cite the page by address) is judged separately.
- **The cost signals count what only the surface loads.** A surface that shares most of its code with the sandbox (the investigations picker) cannot be separated and measures zero.
- **Unique is a judgment.** Every `unique` answer and its reason is written in the record, and a different answer changes the verdict by the function and nothing else. The ones that could reasonably be argued the other way are listed under "Decisions for Carl".

### What the verdicts say, in the order the roadmap asked

**Destination or section.** A destination is a first-action page of the five (Explore, Learn, Observe, My work, Teach); everything else is a section reached from one. By that test none of the Sky Lab, the 3-D lab, the mission lab, experiments, the analysis lab, the figure builder, the Scenario Studio, the Investigation Composer, the course builder, the catalog, the evaluation pages or the compute page is a destination, and none needs to become one: each is a section of the destination that holds it (`NAVIGATION.md`, "Where every surface goes"), and grouping them under their destination was done by Prompt 162. No verdict here moves a menu entry, so GROUP matches nothing, which the test proves from the inventory.

**`/history/original/`: KEEP (R6b), and the closest call of the 64.** The page is the first Gravitas, kept byte for byte; Save and Load are inert and nothing runs an accessibility check on it. It is partly replaced by the archive (the commit, the `v2.0.0` tag and the Zenodo deposit keep every line; none of them runs on a click), it has no shipped link and no Library entry, and it reaches one signal of six (four test files; 1,396 lines against a threshold of 1,500). The function therefore keeps it. Three facts the cost signals do not count are reasons to look again (see "Decisions for Carl"): it is the one published page without a content-security policy, it imports a stylesheet from `fonts.googleapis.com` when opened (so it is the one page that asks a third party for something without an opt-in), and its tests pin its bytes so that no one may fix either.

**The compute page: KEEP (R3b), a section of Observe, not a destination.** Five shipped investigations link it, a notebook saved in My work links it, and nothing else on the site names it; it stays off the menus under D-COMPUTE-03 and stays an acknowledged orphan. Whether its content stays at its present size is Prompt 268's gate and is not judged here.

**Activity formats, by the subjects using each.** Demonstration (one subject, orbital speed) and route (three: orbital speed, binary planets, star sizes) are unique in what they do and are kept (R3b). Guided (one subject) and lab (one subject; the fourth format) are each partly replaced, by the route and by assigning the whole lesson, and each has a Library entry, so the function keeps them (R8b: used, no measured merge). Retiring a format that has a Library entry and a stable assignment id would be class R under the policy: progress is namespaced by that id, so a student's saved answers and an instructor's assignment link point at it.

**The 23 formats without a schema: all KEEP, with a schema in Prompt 290.** Each is a unique record kind, and 21 of the 23 are held by a person (a download, a browser's local storage, a file or a link). The other two, the 3-D lab's live snapshot (memory only) and the ephemeris pack (the repository only), are not. Three are written for a person to read and never read back by Gravitas (the 3-D guide report, the mission lab report, the course manifest); for those Prompt 290 either gives a schema or says in words that the file has none. None is retired, so no reader outlives a writer here.

**The "Contributed" catalog section: RETIRE (R5), presentation.** No catalog entry has `origin: "contributed"` (0 of 10). A contributed entry already carries a badge and a "Contributed by" row; the section adds a heading and the line "Nothing has been contributed yet". Retiring the section keeps both, and the invitation to contribute moves to the catalog's intro. Nothing student-made or shared points at a heading, so no period applies (policy scope).

**The Library's "Where it runs" facet: RETIRE (R5), presentation.** The facet names subsystems ("3-D lab", "Observatory"), and no investigation, course or document tells a student to choose by it. Prompt 163 (PR #409, open; ratified in D-R10-42) already removes it; this verdict agrees by the function and adds nothing to do.

### The verdict tables

Counts first, then every surface. "Links / Library / cited" are the shipped investigations, courses and activities that link the page, the Library entries that open it, and the published documents (README, the paper, the citation file, the manual) that name its address. "Cost signals" are the six of the question above, with the ones reached named.

<!-- surface-gate:summary -->
| Verdict | Surfaces |
| --- | ---: |
| KEEP | 62 |
| FREEZE | 0 |
| GROUP | 0 |
| CONSOLIDATE | 0 |
| RETIRE | 2 |
| Total judged | 64 |
<!-- /surface-gate:summary -->

### Pages

<!-- surface-gate:pages -->
| Surface | Path | Place | Unique | Links / Library / cited | Cost signals | Exposure | Verdict | Consequence for 166 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sandbox | `/` | destination, explore | yes | 0 / 0 / 0 | 3 of 6 (lines, tests, precache), material | none | **KEEP** (R1) | none |
| 3-D lab | `/3d/` | tool, explore | yes | 0 / 12 / 2 | 4 of 6 (lines, tests, strings, precache), material | gravitas.system3d; gravitas.lab3d-guide-report; 3-D system link (?system=); guide link (?guide=); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Mission lab | `/mission/lab/` | tool, explore | yes | 0 / 3 / 2 | 4 of 6 (lines, tests, strings, precache), material | gravitas.mission-plan; gravitas.mission-lab-report; mission plan link (?plan=); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Scenario Studio | `/studio/` | authoring, explore | yes | 0 / 0 / 2 | 4 of 6 (lines, tests, strings, precache), material | gravitas.scenario-pack; scenario link the application opens; cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Library | `/library/` | destination, learn | yes | 0 / 0 / 1 | 1 of 6 (tests) | cited in the manual | **KEEP** (R1) | none |
| Investigations picker | `/#investigations` | tool, learn | partly (library) | 0 / 0 / 0 | 0 of 6 | investigation link (/#investigation=) | **KEEP** (R6b) | none |
| Courses | `/course/` | collection, learn | yes | 5 / 4 / 2 | 1 of 6 (tests) | course home link; course home link (c1); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Observatory | `/observatory/` | destination, observe | yes | 0 / 23 / 2 | 4 of 6 (lines, tests, strings, precache), material | cited in README.md; cited in the manual | **KEEP** (R1) | none |
| Experiments | `/experiments/` | tool, observe | yes | 0 / 4 / 2 | 3 of 6 (lines, tests, precache), material | gravitas.experiment; gravitas.experiment-result; experiment link block (xp); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Sky Lab | `/sky/` | tool, observe | yes | 0 / 0 / 1 | 3 of 6 (lines, tests, precache), material | cited in the manual | **KEEP** (R3b) | none |
| Compute page | `/compute/` | tool, observe | yes | 5 / 0 / 0 | 2 of 6 (lines, tests), material | gravitas.analysis; compute capsule | **KEEP** (R3b) | none |
| Catalog | `/catalog/` | collection, observe | yes | 0 / 4 / 2 | 1 of 6 (tests) | gravitas.extension-archive; cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Figure builder | `/figure/` | authoring, observe | yes | 0 / 0 / 2 | 0 of 6 | figure link (the figure is the link); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| My work | `/my-work/` | destination, my-work | yes | 0 / 0 / 1 | 3 of 6 (lines, tests, precache), material | cited in the manual | **KEEP** (R1) | none |
| Teaching with Gravitas | `/teaching/` | destination, teach | yes | 0 / 0 / 3 | 1 of 6 (tests) | cited in README.md; cited in paper.md; cited in the manual | **KEEP** (R1) | none |
| Instructor resources | `/instructors/` | instructor, teach | yes | 0 / 0 / 2 | 1 of 6 (tests) | the address given to instructors in the adopter's guide; cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Submission review | `/instructors/submissions/` | instructor, teach | yes | 0 / 0 / 1 | 3 of 6 (lines, tests, precache), material | gravitas.ledger; gravitas.student-data; submission token; cited in the manual | **KEEP** (R3b) | none |
| Classroom evidence kit | `/evaluation/` | instructor, teach | yes | 0 / 0 / 2 | 1 of 6 (tests) | cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Investigation Composer | `/studio/lesson/` | authoring, teach | yes | 0 / 0 / 2 | 4 of 6 (lines, tests, strings, precache), material | gravitas.investigation-pack; investigation link (packLink); cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Course-package builder | `/studio/course/` | authoring, teach | yes | 0 / 0 / 2 | 4 of 6 (lines, tests, strings, precache), material | gravitas.course-pack; gravitas.course-manifest; course home link; cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Investigations in a course | `/studio/course/packs/` | authoring, teach | partly (course-builder) | 0 / 0 / 0 | 1 of 6 (tests) | investigation link (packLink) | **KEEP** (R6b) | none |
| Find content to teach | `/teaching/find/` | document, teach | partly (library) | 0 / 0 / 1 | 1 of 6 (tests) | cited in the manual | **KEEP** (R6b) | none |
| Adopter's guide | `/teaching/adopt/` | document, teach | yes | 0 / 0 / 1 | 0 of 6 | cited in the manual | **KEEP** (R3b) | none |
| Textbook alignment | `/teaching/alignment/` | document, teach | yes | 0 / 0 / 1 | 0 of 6 | cited in the manual | **KEEP** (R3b) | none |
| Classroom kit | `/teaching/kit/` | document, teach | yes | 0 / 0 / 1 | 1 of 6 (tests) | cited in the manual | **KEEP** (R3b) | none |
| Adoption pages: activities | `/teaching/activity/*` | content, teach | yes | 0 / 0 / 0 | 0 of 6 | links from the Library activity cards | **KEEP** (R3b) | none |
| Adoption pages: investigations | `/teaching/investigation/*` | content, teach | yes | 0 / 0 / 0 | 0 of 6 | links from the Library investigation cards | **KEEP** (R3b) | none |
| How the model works | `/model/` | document, no destination | yes | 0 / 0 / 2 | 2 of 6 (lines, tests), material | cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| Physics validation | `/validation/` | document, no destination | yes | 0 / 0 / 1 | 2 of 6 (lines, tests), material | cited in CITATION.cff | **KEEP** (R3b) | none |
| Glossary | `/glossary/` | document, no destination | yes | 0 / 0 / 0 | 0 of 6 | none | **KEEP** (R3b) | none |
| User manual (PDF) | `/Gravitas_User_Manual.pdf` | document, no destination | yes | 0 / 0 / 0 | 0 of 6 | the manual PDF on the site | **KEEP** (R3b) | none |
| 3-D kernel diagnostics | `/lab3d/` | diagnostic, no destination | yes | 0 / 0 / 1 | 1 of 6 (tests) | cited in README.md | **KEEP** (R3b) | none |
| Mission core diagnostics | `/mission/` | diagnostic, no destination | yes | 0 / 0 / 2 | 4 of 6 (lines, tests, strings, precache), material | cited in README.md; cited in the manual | **KEEP** (R3b) | none |
| The first Gravitas | `/history/original/` | document, no destination | partly (archive) | 0 / 0 / 0 | 1 of 6 (tests) | none | **KEEP** (R6b) | none |
<!-- /surface-gate:pages -->

### Sections, facets and activity formats

<!-- surface-gate:others -->
| Item | Kind | Unique | Links / Library / cited | Cost signals | Exposure | Verdict | Consequence for 166 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Analysis lab (two sections) | section | yes | 0 / 0 / 0 | 3 of 6 (lines, tests, precache), material | gravitas.analysis | **KEEP** (R3b) | none |
| The "Contributed" catalog section | section | no (catalog) | 0 / 0 / 0 | 0 of 6 | none | **RETIRE** (R5, presentation) | 166 removes the section's heading and its empty-state line. A contributed entry keeps its badge and its 'Contributed by' row in the list; the pointer to CONTRIBUTING_CONTENT.md moves to the catalog's intro. Presentation: no support period (policy scope). |
| The Library's "Where it runs" facet | facet | no (library) | 0 / 0 / 0 | 0 of 6 | none | **RETIRE** (R5, presentation) | None for 166 if Prompt 163 (PR #409, open) merges; if it does not, 166 removes the facet. Presentation: no support period (policy scope). A Library link that names the old filter still opens the Library. |
| Activity format: demonstration | activity-format | yes | 0 / 1 / 0 | 0 of 6 | investigation progress (namespaced by assignment id); assignment link ?activity=&format= (act-orbital-speed-demo) | **KEEP** (R3b) | none |
| Activity format: route | activity-format | yes | 0 / 3 / 0 | 0 of 6 | investigation progress (namespaced by assignment id); assignment link ?activity=&format= (act-orbital-speed-route); assignment link ?activity=&format= (act-binary-planets-route); assignment link ?activity=&format= (act-star-sizes-route) | **KEEP** (R3b) | none |
| Activity format: guided | activity-format | partly (activity-route) | 0 / 1 / 0 | 0 of 6 | investigation progress (namespaced by assignment id); assignment link ?activity=&format= (act-orbital-speed-guided) | **KEEP** (R8b) | none |
| Activity format: lab | activity-format | partly (investigation-keplers-laws) | 0 / 1 / 0 | 0 of 6 | investigation progress (namespaced by assignment id); assignment link ?activity=&format= (act-orbital-speed-lab) | **KEEP** (R8b) | none |
<!-- /surface-gate:others -->

### The 23 formats without a schema

<!-- surface-gate:formats -->
| Format | Persisted | Unique | Importers | Exposure | Verdict | Consequence |
| --- | --- | --- | ---: | --- | --- | --- |
| `gravitas.observed` | localStorage | yes | 2 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `world share link` | link | yes | 20 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `experiment link block (xp)` | link | yes | 2 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `link extras (x)` | link | yes | 6 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.system3d` | file, repository | yes | 13 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.lab3d.snapshot` | memory | yes | 2 | none | **KEEP** (R3b) | Keep. Held in memory only; a schema is optional in Prompt 290. |
| `experiment store` | localStorage | yes | 1 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.mission-plan` | download, My work | yes | 3 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.ephemeris-pack` | repository | yes | 7 | none | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `investigation progress` | localStorage | yes | 5 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.investigation.progress` | download | yes | 10 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.lab3d-guide-report` | download | yes | 1 | record | **KEEP** (R3b) | Keep. Written for a person to read; Prompt 290 gives it a schema or says in words that it has none. |
| `gravitas.mission-lab-report` | download | yes | 1 | record | **KEEP** (R3b) | Keep. Written for a person to read; Prompt 290 gives it a schema or says in words that it has none. |
| `notebook store` | localStorage | yes | 10 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `notebook entry snapshot` | localStorage, download | yes | 14 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.ledger` | inside a submission token (ev), never alone | yes | 2 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `course home link` | link | yes | 4 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `investigation link` | link | yes | 3 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.course-manifest` | download | yes | 1 | record | **KEEP** (R3b) | Keep. Written for a person to read; Prompt 290 gives it a schema or says in words that it has none. |
| `gravitas.extension-archive` | repository, download | yes | 1 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `embed options` | link | yes | 5 | link | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.student-data` | download | yes | 1 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
| `gravitas.made` | localStorage, inside gravitas.student-data | yes | 8 | record | **KEEP** (R3b) | Keep; a schema in Prompt 290. |
<!-- /surface-gate:formats -->

### The cost evidence

<!-- surface-gate:evidence -->
| Item | Source lines · tests · generated · strings · precache KB · axe rows | Measured by |
| --- | --- | --- |
| Sandbox | 76163 · 243 · 0 · 0 · 973.9 · 0 | pages `index.html` |
| 3-D lab | 11016 · 16 · 0 · 544 · 232.3 · 2 | pages `3d/index.html` |
| Mission lab | 5684 · 10 · 0 · 445 · 192.7 · 1 | pages `mission/lab/index.html` |
| Scenario Studio | 1759 · 8 · 0 · 172 · 25.2 · 1 | pages `studio/index.html` |
| Library | 1011 · 10 · 0 · 0 · 13.4 · 2 | pages `library/index.html` |
| Courses | 1028 · 6 · 0 · 63 · 15.6 · 1 | pages `course/index.html` |
| Observatory | 22104 · 61 · 0 · 230 · 326.7 · 1 | pages `observatory/index.html` |
| Experiments | 5798 · 22 · 0 · 119 · 68.5 · 1 | pages `experiments/index.html` |
| Sky Lab | 2182 · 5 · 0 · 119 · 33.6 · 0 | pages `sky/index.html` |
| Compute page | 4027 · 12 · 0 · 0 · 0 · 0 | pages `compute/index.html`, `compute-frame/index.html` |
| Catalog | 924 · 5 · 1 · 97 · 14.7 · 1 | pages `catalog/index.html` |
| Figure builder | 1068 · 2 · 0 · 67 · 12.8 · 1 | pages `figure/index.html` |
| My work | 2511 · 18 · 0 · 0 · 31.7 · 1 | pages `my-work/index.html` |
| Teaching with Gravitas | 451 · 10 · 0 · 0 · 0 · 1 | pages `teaching/index.html` |
| Instructor resources | 290 · 7 · 0 · 0 · 0 · 1 | pages `instructors/index.html` |
| Submission review | 5664 · 20 · 0 · 0 · 65.4 · 1 | pages `instructors/submissions/index.html` |
| Classroom evidence kit | 1238 · 7 · 0 · 0 · 5.1 · 1 | pages `evaluation/index.html` |
| Investigation Composer | 4173 · 16 · 0 · 328 · 56.4 · 1 | pages `studio/lesson/index.html` |
| Course-package builder | 3301 · 8 · 0 · 270 · 46.1 · 1 | pages `studio/course/index.html` |
| Investigations in a course | 594 · 4 · 0 · 0 · 6 · 1 | pages `studio/course/packs/index.html` |
| Find content to teach | 235 · 3 · 0 · 0 · 0 · 0 | pages `teaching/find/index.html` |
| Adopter's guide | 215 · 0 · 0 · 0 · 0 · 0 | pages `teaching/adopt/index.html` |
| Textbook alignment | 308 · 0 · 0 · 0 · 0 · 0 | pages `teaching/alignment/index.html` |
| Classroom kit | 1325 · 4 · 0 · 0 · 15.8 · 0 | pages `teaching/kit/index.html` |
| How the model works | 3414 · 7 · 0 · 0 · 0 · 1 | pages `model/index.html` |
| Physics validation | 9384 · 20 · 0 · 0 · 14.4 · 1 | pages `validation/index.html` |
| Glossary | 203 · 0 · 0 · 0 · 0 · 1 | pages `glossary/index.html` |
| User manual (PDF) | 0 · 0 · 0 · 0 · 0 · 0 | library and tests |
| 3-D kernel diagnostics | 937 · 3 · 0 · 79 · 12.3 · 1 | pages `lab3d/index.html` |
| Mission core diagnostics | 1921 · 3 · 0 · 228 · 27.5 · 1 | pages `mission/index.html` |
| The first Gravitas | 1396 · 4 · 0 · 0 · 0 · 0 | pages `history/original/index.html` |
| Analysis lab (two sections) | 4122 · 8 · 0 · 136 · 48 · 0 | named files |
| The "Contributed" catalog section | 203 · 0 · 0 · 0 · 3.3 · 0 | named files |
| The Library's "Where it runs" facet | 0 · 0 · 0 · 0 · 0 · 0 | named files |
| Activity format: demonstration | 0 · 0 · 0 · 0 · 0 · 0 | library and tests |
| Activity format: route | 0 · 0 · 0 · 0 · 0 · 0 | library and tests |
| Activity format: guided | 0 · 0 · 0 · 0 · 0 · 0 | library and tests |
| Activity format: lab | 0 · 0 · 0 · 0 · 0 · 0 | library and tests |
<!-- /surface-gate:evidence -->

## What the function could not act on, and decisions for Carl

The gate's own text says a threshold that proves wrong is Carl's to reset, and that a change after a surface has been judged needs a register row. These are the places where the function's answer and the roadmap's expectation differ, stated so that none is taken silently:

1. **Almost everything is KEEP (62 of 64), and nothing is CONSOLIDATE.** That is what the committed function gives on this evidence, not a finding that the site is tidy. R7 needs a surface that is used, and "used" counts only links from investigations, courses and activities and Library entries; most tools are opened from the destination pages, which the roadmap and the committed text exclude as navigation. So no unused tool can be consolidated, however small its gain.
2. **A measured merge exists that the function does not test.** *Investigations in a course* (`/studio/course/packs/`) is partly replaced by the course builder, is unused by the counted kinds and has a measured gain of one route and 6.0 KB of gzip in the precache (the threshold is 5 KB). R6 sends a partly replaced, unused surface to KEEP or FREEZE and never asks whether a merge is justified; the request ceiling of the course builder would have to be measured with the merged page (13 requests today) before the merge could be justified. **Recommended:** amend R6 so that a partly replaced, unused surface with a justified merge is CONSOLIDATE, as a register row before Prompt 166 runs; this document does not make the change, because the roadmap fixes the function before the judging.
3. **`/history/original/`.** By the function it is KEEP. Two ways to a different verdict are Carl's to take: (a) rule its task not unique (`unique: "no"`, since the archive keeps the code), which gives RETIRE under class L (a notice, then 12 months before it leaves); (b) add a seventh cost signal for "outside a site-wide guarantee" (no policy, a third-party request, no accessibility run), which would make it material and give FREEZE (R6a). **Recommended:** (b) or a plain FREEZE notice, not (a): the page is an archive Carl chose to publish, and removing it is a different decision from judging it unjustified.
4. **Teach's "find content" page** is partly replaced by the Library (same filters) and adds instructor facts; it reaches no cost signal and is KEEP. If Prompt 163's Library grows an instructor view, re-judge.
5. **The Sky Lab** shows 0 links and 0 Library entries but is cited by address in the manual; it is KEEP only because of that one citation (R3b). A release that corrected the manual would turn it into FREEZE (R3a: unique, unused, unheld, material). It is the surface most likely to move when real referrer data exists.

**Not decided here:** any referrer or analytics measure (none exists and none is proposed); the content of the compute page (Prompt 268); whether any activity format should stop being offered (Prompt 215 uses the activity format for "design an observation", so retiring it now would be premature).

## What a verdict is not

A verdict is not a retirement. Nothing on the site changed in Prompt 165. Prompt 166 carries out each verdict that is not KEEP, one pull request each: today the "Contributed" section (and the facet, if #409 has not removed it). A RETIRE of a route or capability would, under the policy, begin with a notice and take effect at least 12 months later; no such verdict exists today.

## Re-running the gate

`node tools/surface-gate.mjs measure` then `write` re-measures the tree and rewrites the tables; a changed verdict shows in the diff. Evidence that would change a verdict: real referrer data (for a surface judged only on counts), a named adopter who uses a surface, a Library entry or investigation that starts to link a surface, a new durable record that points at one, or a changed threshold (a register row). A new surface needs a record in `tools/surface-gate.json` (a test fails without one), and a new menu entry, kind or filter needs the register row `NAVIGATION.md` already asks for.
