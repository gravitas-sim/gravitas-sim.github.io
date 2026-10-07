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
| `gravitas_simulation_save` | The sandbox's saved world | `js/ui.js` | unversioned: settings, view, bodies | setting names renamed since are rewritten on load |
| `gravitas_guides` | The Observatory guides' answers | `js/observatory/guidePanel.js` | guide record `1.0.0` | a record of another version is dropped |
| `gravitas_lab3d_guide_<id>` | The 3-D lab guides' answers | `js/lab3d/view/guidePanel.js` | guide answers | none |
| `gravitas_missionlab_<id>` | The mission lab's answers | `js/mission/lab/guidePanel.js` | guide answers | none |
| `gravitas_composer_draft:<id>`, `gravitas_composer_last` | Composer drafts, and the one last open | `js/composerPage.js`, through `js/studio/model.js` | investigation pack 1 | none recorded; a file opened is migrated (`migrateInvestigationPack`) |
| `gravitas_studio_draft:<id>`, `gravitas_studio_last` | Studio scenario drafts, and the one last open | `js/studio/model.js` | scenario pack 1 | none recorded |
| `gravitas_course_draft:<id>`, `gravitas_course_last` | Course builder drafts, and the one last open | `js/coursePage.js` | course pack 2 | reads course pack 1 |
| `gravitas_evaluation_draft_v1` | The evaluation kit's unsent draft | `js/evaluationKit.js` | evaluation 1 | none |
| `gravitas_teaching_notes_v1` | A teacher's notes on the teaching page | `js/teachingPage.js` | a JSON object | none |

## Previews, handed from one page to another

| Key | Holds | Owner |
|---|---|---|
| `gravitas_composer_preview` | The lesson the Composer hands to its preview | `js/composerPage.js`, `js/authoring/preview.js` |
| `gravitas_course_preview` | The course the builder hands to the course home | `js/course/links.js` |

## Preferences

| Key | Holds | Owner |
|---|---|---|
| `gravitas_locale` | The interface language, shared by every page | `js/i18n/index.js` and each page's catalog loader |
| `gravitas_theme` | The theme | `js/theme.js` |
| `gravitas_units` | Physical or simulation units | `js/units.js` |
| `gravitas_course_level` | The course level: introductory, majors or advanced (sets the readout precision) | `js/settingsSchema.js` |
| `gravitas_lesson_objects_open` | Whether the lesson panel's objects list was left open | `js/investigations.js` |
| `gravitas_rail_sections` | Which rail sections are open | `js/controls.js` |
| `gravitas_lecture_sequence` | Lecture mode's sequence | `js/lecture.js` |
| `gravitas_welcome_seen_v1` | That the welcome was seen | `js/welcomeGate.js` |
| `mobile_instructions_shown` | That the phone instructions were shown | `js/main.js` |
| `gravitasDebug` | Developer logging | `js/utils.js` |

## The platform's own state

| Where | Holds | Owner |
|---|---|---|
| `gravitas_capability_versions` | The version of each capability package loaded, so a changed one is noticed | `js/platform/resolver.js` |
| sessionStorage `gravitas_instructor_key` | The instructor materials' key, for the session only | `js/instructorPortal.js` |
| IndexedDB `gravitas-catalog` | Installed catalog extensions: their archives' files | `js/catalog/store.js` |
| IndexedDB `gravitas-archive` | The archive import's cached answers | `js/archive/cache.js` |
| IndexedDB `gravitas-store` | The storage module's collections (Prompt 65): one object store, `records`, keyed by collection and name. Nothing writes to it yet: the keys above keep their own formats, and step 3 moves their readers and writers over only as the route ceilings allow (below) | `js/storage/index.js` |
| `gravitas_store:<collection>:<name>` | The same records, one key each, when IndexedDB is unavailable | `js/storage/index.js` |
| Cache Storage `gravitas-<build>` | The service worker's precache; an older build's cache is deleted when a new one activates | `sw.js` |

## Size policies

**The storage module** (`js/storage/index.js`, Prompt 65 step 2) states a policy for each of its nine collections: the most one record and the collection may hold (`COLLECTIONS`). It refuses a write that would leave less than a reserve free: 5 MiB or a tenth of the origin's quota, whichever is more, as `navigator.storage.estimate()` reports it. Until step 3 moves the writers over, the keys above keep their own handling:

- **Only the experiment store states a budget:** 512 KB per experiment and 2 MB in total (`js/experiments/store.js`, `LIMITS`), with checkpoints of up to 1.5 million characters (`js/experimentsPage.js`).
- **Every other key relies on the browser's quota.** Nothing else calls `navigator.storage.estimate()`, and a full quota is handled where a write fails, in a few catch blocks.

## Moving the writers (Prompt 65, step 3)

Existing keys keep their key and their stored text; none is migrated. `js/storage/local.js` (`readJson`, `writeJson`) is the shared form of the try/catch for no storage, a damaged value and a full quota. Moved so far: the Observatory guides (`gravitas_guides`), the mission lab's guides (`gravitas_missionlab_*`) and the teaching page's notes (`gravitas_teaching_notes_v1`).

The rest are not moved, because the helper is a module and a module is a request. Adding it to a route that did not load it took the lesson routes (build) one request over their ceilings, the composer and course builder (sources) likewise, the evaluation, library and 3-D guide routes over by 0.3 to 0.6 KB, and the experiment runner sat at its request ceiling already. No ceiling was raised. Still on their own handling: `js/notebook/store.js`, `js/experiments/store.js`, `js/library/progress.js`, `js/studio/model.js` drafts, `js/lab3d/view/guidePanel.js`, `js/evaluationKit.js`, `js/platform/resolver.js`, `js/lecture.js`, `js/controls.js`, `js/composerPage.js` and `js/coursePage.js` drafts, `js/investigations.js`, `js/catalog/store.js`.
