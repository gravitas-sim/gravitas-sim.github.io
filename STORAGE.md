# What Gravitas keeps in the browser

Everything Gravitas stores stays in the reader's browser; nothing leaves it without an explicit export. This is the inventory Roadmap II Prompt 65 starts from:
- every localStorage and sessionStorage key;
- every IndexedDB database;
- the service worker's cache.

For each, it gives its owner module, what it holds, its format and version, and its migrations. `tests/storageInventory.test.js` fails when the code names a key this page does not.

Formats are described in [FORMATS.md](FORMATS.md) where they have one. What `main` wrote and how v2 reads it is in the Prompt 48 checkpoint, which found nothing unreadable.

## What a student owns

These are the student's own work, and what an "export everything" would carry:

| Key | Holds | Owner | Format | Migrations |
|---|---|---|---|---|
| `gravitas_investigation_<id>` (and `…:v1`, a safety copy) | A lesson's progress: answers, steps, the language each answer was typed in | `js/investigations.js` | progress schema 2 | reads schema 1 (`migrateFromV1`) and keeps the v1 copy |
| `gravitas_assignment_<hash>` | An assignment's progress | `js/investigations.js`, `js/assignments/assignment.js` | progress schema 2 | moves main's dated `gravitas_assignment_<yymmdd+hash>` key across when the link opens |
| `gravitas_student_name` | The name a student gives for reports and submissions | `js/investigations.js` | text | none |
| `gravitas_evidence_notebook` | The evidence notebook: entries, their snapshots and fingerprints | `js/notebook/store.js` | notebook store 1, entry snapshots 1 | none; a newer store is left unopened and not overwritten |
| `gravitas_experiment_<id>` and `gravitas_experiments_index` | The A/B bench's saved experiments and their index | `js/experiments/store.js` | experiment store 3 | reads 1 and 2; version 3 withdrew drift values recorded before #49, with a notice |
| `gravitas_experiment_checkpoint_<hash>` | A running experiment's checkpoint, to resume after a reload | `js/experimentsPage.js` | experiment result 1 | none |
| `gravitas_simulation_save` | The sandbox's saved world | `js/world.js` | unversioned: settings, view, bodies | setting names renamed since are rewritten on load |
| `gravitas_guides` | The Observatory guides' answers | `js/observatory/guidePanel.js` | guide record `1.0.0` | a record of another version is dropped |
| `gravitas_lab3d_guide_<id>` | The 3-D lab guides' answers | `js/lab3d/view/guidePanel.js` | guide answers | none |
| `gravitas_missionlab_<id>` | The mission lab's answers | `js/mission/lab/guidePanel.js` | guide answers | none |
| `gravitas_composer_draft:<id>`, `gravitas_composer_last` | Composer drafts, and the one last open | `js/composerPage.js`, through `js/studio/model.js` | investigation pack 1 | none recorded; a file opened is migrated (`migrateInvestigationPack`) |
| `gravitas_studio_draft:<id>`, `gravitas_studio_last` | Studio scenario drafts, and the one last open | `js/studio/model.js` | scenario pack 1 | none recorded |
| `gravitas_course_draft:<id>`, `gravitas_course_last` | Course builder drafts, and the one last open | `js/coursePage.js` | course pack 2 | reads course pack 1 |
| `gravitas_made_<id>` | A scenario or experiment the student made: a world saved from the Sandbox, a system built in the builder, a scenario opened from a link and changed (with the scenario it came from), or a runner result; its name, seed, link, build and the evidence entries it is attached to | `js/myWork/made.js` | `gravitas.made/1` (FORMATS.md) | none yet; a newer record is left out of the list and not overwritten |
| `gravitas_evaluation_draft_v1` | The evaluation kit's unsent draft | `js/evaluationKit.js` | evaluation 1 | none |
| `gravitas_teaching_notes_v1` | A teacher's notes on the teaching page | `js/teachingPage.js` | a JSON object | none |

## Previews, handed from one page to another

| Key | Holds | Owner |
|---|---|---|
| `gravitas_composer_preview` | The lesson the Composer hands to its preview | `js/composerPage.js`, `js/authoring/preview.js` |
| `gravitas_course_preview` | The course the builder hands to the course home | `js/course/links.js` |
| `gravitas_next_context` | The sequence or course a lesson was opened from, so its finish panel can offer the next one | `js/investigations/next.js` |

## Preferences

| Key | Holds | Owner |
|---|---|---|
| `gravitas_locale` | The interface language, shared by every page | `js/i18n/index.js` and each page's catalog loader |
| `gravitas_theme` | The theme | `js/theme.js` |
| `gravitas_units` | Physical or simulation units | `js/units.js` |
| `gravitas_course_level` | The course level: introductory, majors or advanced (sets the readout precision) | `js/settingsSchema.js` |
| `gravitas_last_export` | When My work last made a backup file, and what it held (the file is the student's; this only remembers that one was made) | `js/myWorkPage.js`, through `js/storage/local.js` |
| `gravitas_lesson_objects_open` | Whether the lesson panel's objects list was left open | `js/investigations.js` |
| `gravitas_rail_sections` | Which rail sections are open | `js/controls.js` |
| `gravitas_lecture_sequence` | Lecture mode's sequence | `js/lecture.js` |
| `gravitas_welcome_seen_v1` | That the welcome was seen | `js/welcomeGate.js` |
| `gravitas_orientation_seen_v1` | That the first-run introduction on Home was shown (once, however it ended) | `js/welcomeGate.js` |
| `mobile_instructions_shown` | That the phone instructions were shown | `js/main.js` |
| `gravitasDebug` | Developer logging | `js/utils.js` |

## The platform's own state

| Where | Holds | Owner |
|---|---|---|
| `gravitas_capability_versions` | The version of each capability package loaded, so a changed one is noticed | `js/platform/resolver.js` |
| sessionStorage `gravitas_instructor_key` | The instructor materials' key, for the session only | `js/instructorPortal.js` |
| IndexedDB `gravitas-catalog` | Installed catalog extensions: their archives' files | `js/catalog/store.js` |
| IndexedDB `gravitas-archive` | The archive import's cached answers | `js/archive/cache.js` |
| IndexedDB `gravitas-store` | The storage module's collections (Prompt 65): one object store, `records`, keyed by collection and name. Nothing writes to it yet: the keys above keep their own formats and the writers go through `js/storage/local.js` (below) | `js/storage/index.js` |
| `gravitas_store:<collection>:<name>` | The same records, one key each, when IndexedDB is unavailable | `js/storage/index.js` |
| Cache Storage `gravitas-<build>` | The service worker's precache; an older build's cache is deleted when a new one activates | `sw.js` |

## Ownership matrix

Every record a student's browser holds, its owner, how it migrates, whether a backup file carries it, and its row in the compatibility corpus (`tests/compat`, Prompt 134). Generated by `npm run storage:matrix` from `js/storage/index.js`, the code and `tools/storage-ownership.json`; `tests/storageMatrix.test.js` fails when a key, a writer or a corpus row is missing. Durable work is what an "export everything" carries; evictable data is regenerated or downloaded again and a browser may drop it.

<!-- storage:records:start -->
| Record | Holds | Collection | Owner | Writes through | Migration | Export | Corpus row (134) |
|---|---|---|---|---|---|---|---|
| `gravitas_experiment_checkpoint_…` | A running experiment's checkpoint | drafts | `js/experimentsPage.js` | `js/storage/local.js` | none | evictable: regenerated or cached, not in a backup file | `experiment-store` |
| `gravitas_experiment` | Saved experiments and their index | experiments | `js/experiments/store.js` | `js/storage/local.js` | store v3 reads v1 and v2 records | durable: in a backup file | `experiment-store` |
| `gravitas_investigation_…` | A lesson's progress and its :v1 safety copy | progress | `js/investigations.js` | `js/storage/local.js` | progress schema 1 re-keyed to 2 by position, original kept under :v1 | durable: in a backup file | `progress-store` |
| `gravitas_guides` | Observatory guide answers | progress | `js/observatory/guidePanel.js` | `js/storage/local.js` | a record of another version is dropped | durable: in a backup file | no corpus kind yet: Prompt 134 left guide answers to a later row |
| `gravitas_lab3d_guide_…` | 3-D lab guide answers | progress | `js/lab3d/view/guidePanel.js` | `js/storage/local.js` | none | durable: in a backup file | no corpus kind yet; the guide report is a written-never-read file (report-files) |
| `gravitas_missionlab_…` | Mission lab answers | progress | `js/mission/lab/guidePanel.js` | `js/storage/local.js` | none | durable: in a backup file | as 3-D lab guides |
| `gravitas_assignment_…` | An assignment's progress | assignments | `js/investigations.js` | `js/storage/local.js` | moves main's dated key to the hash key on first read | durable: in a backup file | `progress-store` |
| `gravitas_evidence_notebook` | The evidence notebook | evidence | `js/notebook/store.js` | `js/storage/local.js` | store 1; entries revived by reviveEntry | durable: in a backup file | `ledger-entry` |
| `gravitas_made_…` | A scenario or experiment the student made | made | `js/myWork/made.js` | direct | none yet; a newer record is left out of the list | durable: in a backup file | gravitas.made/1 has no corpus kind yet |
| `gravitas_course_level` | The course level | preferences | `js/settingsSchema.js` | direct | none | preference: in a backup file only when ticked | a one-word preference |
| `gravitas_course_preview` | The course handed to the course home | — | `js/course/links.js` | direct | none | transient: handed from one page to another | `course-home-link` |
| `gravitas_next_context` | Where a lesson was opened from | — | `js/investigations/next.js` | `js/storage/local.js` | none | transient: handed from one page to another | a handed-over context |
| `gravitas_course_…` | Course builder drafts and the last open | courses | `js/coursePage.js` | direct | reads course pack 1 | durable: in a backup file | `course-pack` |
| `gravitas_composer_preview` | The lesson handed to the Composer preview | — | `js/composerPage.js` | direct | none | transient: handed from one page to another | `investigation-pack` |
| `gravitas_composer_…` | Composer drafts and the last open | drafts | `js/composerPage.js` | direct | none | durable: in a backup file | `investigation-pack` |
| `gravitas_studio_…` | Studio scenario drafts and the last open | drafts | `js/studio/model.js` | direct | none recorded | durable: in a backup file | scenario pack 1 has no corpus kind yet |
| `gravitas_simulation_save` | The Sandbox's saved world | drafts | `js/world.js` | direct | setting names renamed since are rewritten on load | durable: in a backup file | `share-link` |
| `gravitas_evaluation_draft_…` | The evaluation kit's unsent draft | drafts | `js/evaluationKit.js` | `js/storage/local.js` | none | durable: in a backup file | evaluation 1 has no corpus kind yet |
| `gravitas_teaching_notes_…` | A teacher's notes | drafts | `js/teachingPage.js` | `js/storage/local.js` | none | durable: in a backup file | a JSON object with no format name |
| `gravitas_student_name` | The name a student gives for reports | settings | `js/investigations.js` | `js/storage/local.js` | none | durable: in a backup file | `submission-token` |
| `gravitas_last_export` | When My work last made a backup | preferences | `js/myWorkPage.js` | `js/storage/local.js` | none | preference: in a backup file only when ticked | remembers that a file was made |
| `gravitas_capability_versions` | The capability package versions loaded | — | `js/platform/resolver.js` | direct | none | platform: the site’s own state, not exported | `capability-package` |
| `gravitas_locale` | The interface language | preferences | `js/i18n/index.js` | direct | none | preference: in a backup file only when ticked | a one-word preference |
| `gravitas_theme` | The theme | preferences | `js/theme.js` | direct | none | preference: in a backup file only when ticked | a one-word preference |
| `gravitas_units` | Physical or simulation units | preferences | `js/units.js` | direct | none | preference: in a backup file only when ticked | a one-word preference |
| `gravitas_lesson_objects_open` | Whether the objects list was left open | preferences | `js/investigations.js` | `js/storage/local.js` | none | preference: in a backup file only when ticked | a flag |
| `gravitas_rail_sections` | Which rail sections are open | preferences | `js/controls.js` | direct | none | preference: in a backup file only when ticked | a list of ids |
| `gravitas_lecture_sequence` | Lecture mode's sequence | preferences | `js/lecture.js` | direct | none | preference: in a backup file only when ticked | a list of links |
| `gravitas_welcome_seen_…` | That the welcome was seen | preferences | `js/welcomeGate.js` | direct | none | preference: in a backup file only when ticked | a flag |
| `gravitas_orientation_seen_…` | That the introduction on Home was shown | preferences | `js/welcomeGate.js` | direct | none | preference: in a backup file only when ticked | a flag |
| `mobile_instructions_shown` | That the phone instructions were shown | preferences | `js/main.js` | direct | none | preference: in a backup file only when ticked | a flag |
| IndexedDB gravitas-catalog | Installed catalog extensions: their archives' files | — | `js/catalog/store.js` | its own | database version 1; none | evictable: regenerated or cached, not in a backup file | `archive-record` |
| IndexedDB gravitas-archive | The archive import's cached answers | — | `js/archive/cache.js` | its own | rows are { value, usedMs }; a bare row from before 2.0.1 reads as the least recently used | evictable: regenerated or cached, not in a backup file | a cache of public answers, rebuilt on demand; evicted least recently used past 400 answers or 64 MiB (Prompt 147) |
| IndexedDB gravitas-store | The storage module's collections (records keyed by collection and name) | — | `js/storage/index.js` | `js/storage/index.js` | none; nothing writes to it yet | durable: in a backup file | empty in 2.0.0 and today |
| localStorage gravitas_store:<collection>:<name> | The same records when IndexedDB is unavailable | — | `js/storage/index.js` | `js/storage/index.js` | none | durable: in a backup file | nothing writes it yet |
| Cache Storage gravitas-<build> | The service worker's precache | — | `sw.js` | its own | an older build's cache is deleted when a new one activates | evictable: regenerated or cached, not in a backup file | generated from the build, never student work |
| sessionStorage gravitas_instructor_key | The instructor materials' key, for the session | — | `js/instructorPortal.js` | its own | none | session: gone when the tab closes | gone when the tab closes; never exported |
<!-- storage:records:end -->

## The round-trip fixture (Prompt 146)

`tests/storageProfile/profile-2.0.0.json` is a 2.0.0 student's whole browser: every localStorage key group (written by 2.0.0's own writers wherever a module writes the record, and by hand from the format where only a page does; `origins` says which), the contents of the `gravitas-catalog` and `gravitas-archive` databases, and a Cache Storage snapshot. `report-2.0.0.json` is what 2.0.0 itself makes of it. `tests/storageProfile.test.js` opens the same profile on the tip and requires the same My work inventory, lesson progress, saved experiments, notebook, installed packages and archive manifest; an export imported into an empty profile must reproduce every key a backup file carries; and 2.0.0's readers must read what the tip wrote (the corpus's rollback rows, against a whole profile). Every prompt that touches a saved record runs it. `npm run storage:profile -- --capture` rewrites it from the 2.0.0 tag and refuses without the flag.

## Size policies

**The storage module** (`js/storage/index.js`, Prompt 65 step 2) states a policy for each of its ten collections: the most one record and the collection may hold (`COLLECTIONS`). It refuses a write that would leave less than a reserve free: 5 MiB or a tenth of the origin's quota, whichever is more, as `navigator.storage.estimate()` reports it. Until step 3 moves the writers over, the keys above keep their own handling:

- **Only the experiment store states a budget:** 512 KB per experiment and 2 MB in total (`js/experiments/store.js`, `LIMITS`), with checkpoints of up to 1.5 million characters (`js/experimentsPage.js`).
- **Every other key relies on the browser's quota.** Nothing else calls `navigator.storage.estimate()`, and a full quota is handled where a write fails, in a few catch blocks.

## Moving the writers (Prompt 65, step 3)

Existing keys keep their key and their stored text, and none is removed or migrated: the key is where the work lives, so every earlier build reads what a later one writes. The writers go through `js/storage/local.js` (`get`, `put`, `drop`, `readJson`, `writeJson`), which states each collection's per-record limit (`ITEM`, equal to `COLLECTIONS` in `js/storage/index.js`; a test holds them together) and throws a `QuotaExceededError` with `reason: 'itemTooLarge'` for a record over it, as a full disk does. `js/storage/index.js` maps every key to its collection (`KEYS`, `collectionOf`) and reads and writes them as a backend (`legacyBackend`, `openStudentStore`), so `exportAll`, `importAll` (keep both, replace, skip, dry run) and `deleteAll` work over the keys the writers use. `adoptLegacy` copies them once into another store's collections without touching a key; no page runs it. The reserve and the collection total are the Store's checks: the writers get the record limit and the browser's own quota. In-tab change events are not on the writers' path (they cost every route bytes); another tab hears a write through the browser's `storage` event, which `openStudentStore` re-emits.

Moved: lesson progress, assignment progress, the student's name and the objects-list preference (`js/investigations.js`); the evidence notebook; the Observatory, 3-D lab and mission lab guides; the teaching page's notes; the Studio's drafts.

Moved: lesson progress, assignment progress, the student's name and the objects-list preference (`js/investigations.js`); the evidence notebook; the Observatory, 3-D lab and mission lab guides; the teaching page's notes; the Studio's drafts; the experiment store and its checkpoints, the evaluation draft, and the lesson browser's and finish panel's next-lesson context (Prompt 146, where the routes had room: measured with `node tools/route-budget.mjs`, sources and build).

Still direct, and why, with what each lacks (measured at Prompt 146; `tests/studentStorage.test.js` fails on any writer not listed). Prompt 146 tried the start-up writers and the build's front door and Sandbox went from 55 to 56 requests with none free, so they stay direct until a route has the request:

<!-- storage:writers:start -->
| Writer | Why it is still direct | Lacks |
|---|---|---|
| `js/studio/model.js` | writes through the Storage a page hands it (Studio hands a guarded one) | not student work, or not a Storage the module can wrap |
| `js/composerPage.js` | its route has no room for the module | 1.4 KB on composer |
| `js/coursePage.js` | its route has no room for the module | 1.3 KB on course-builder |
| `js/courseHome.js` | gravitas_next_context, not student work; its route has no room for the module | 1.4 KB and 1 request on course-home |
| `js/libraryPage.js` | gravitas_next_context, not student work; its route has no room for the module | 1.4 KB on library |
| `js/world.js` | reached from the start-up entry: the module there costs the front door and the Sandbox one build request, with 0 free | 1 request on front-door, sandbox (build) |
| `js/controls.js` | as world.js | 1 request on front-door, sandbox (build) |
| `js/lecture.js` | as world.js | 1 request on front-door, sandbox (build) |
| `js/main.js` | as world.js | 1 request on front-door, sandbox (build) |
| `js/welcomeGate.js` | as world.js | 1 request on front-door, sandbox (build) |
| `js/settingsSchema.js` | as world.js | 1 request on front-door, sandbox (build) |
| `js/theme.js` | a preference on every route, several with no room | 1.4 KB and 1 request on my-work, sky, course-home and the other routes with 0.0 KB free |
| `js/units.js` | as theme.js | 1.4 KB and 1 request on as theme.js |
| `js/shell.js` | the shell's own theme and language choice, on every route | 1.4 KB and 1 request on as theme.js |
| `js/i18n/index.js` | the language; each page's catalog loader | 1.4 KB and 1 request on as theme.js |
| `js/myWork/made.js` | reached from the Sandbox: a second importer would split storage/local.js into a chunk every lesson fetches; it states the collection's record limit itself (512 KB, equal to ITEM.made) and announces a refusal | 1 request on lesson routes (build) |
| `js/platform/resolver.js` | the platform stamps, not student work | not student work, or not a Storage the module can wrap |
| `js/instructorPortal.js` | sessionStorage: the instructor key, for the session | not student work, or not a Storage the module can wrap |
| `js/notebook/store.js` | the availability probe, removed at once | not student work, or not a Storage the module can wrap |
<!-- storage:writers:end -->

IndexedDB `gravitas-catalog` and `gravitas-archive`, `js/library/progress.js` and `js/authoring/preview.js` (read only) are not writers of this kind.

## Names that look like keys and are not

`gravitas_input`, `gravitas_params` and `gravitas_output` are Python names a compute notebook sees (`js/compute/frame/worker.js`); nothing is stored under them.
