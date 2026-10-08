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
| `gravitas_last_export` | When My work last made a backup file, and what it held (the file is the student's; this only remembers that one was made) | `js/myWorkPage.js`, through `js/storage/local.js` |
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
| IndexedDB `gravitas-store` | The storage module's collections (Prompt 65): one object store, `records`, keyed by collection and name. Nothing writes to it yet: the keys above keep their own formats and the writers go through `js/storage/local.js` (below) | `js/storage/index.js` |
| `gravitas_store:<collection>:<name>` | The same records, one key each, when IndexedDB is unavailable | `js/storage/index.js` |
| Cache Storage `gravitas-<build>` | The service worker's precache; an older build's cache is deleted when a new one activates | `sw.js` |

## Size policies

**The storage module** (`js/storage/index.js`, Prompt 65 step 2) states a policy for each of its nine collections: the most one record and the collection may hold (`COLLECTIONS`). It refuses a write that would leave less than a reserve free: 5 MiB or a tenth of the origin's quota, whichever is more, as `navigator.storage.estimate()` reports it. Until step 3 moves the writers over, the keys above keep their own handling:

- **Only the experiment store states a budget:** 512 KB per experiment and 2 MB in total (`js/experiments/store.js`, `LIMITS`), with checkpoints of up to 1.5 million characters (`js/experimentsPage.js`).
- **Every other key relies on the browser's quota.** Nothing else calls `navigator.storage.estimate()`, and a full quota is handled where a write fails, in a few catch blocks.

## Moving the writers (Prompt 65, step 3)

Existing keys keep their key and their stored text, and none is removed or migrated: the key is where the work lives, so every earlier build reads what a later one writes. The writers go through `js/storage/local.js` (`get`, `put`, `drop`, `readJson`, `writeJson`), which states each collection's per-record limit (`ITEM`, equal to `COLLECTIONS` in `js/storage/index.js`; a test holds them together) and throws a `QuotaExceededError` with `reason: 'itemTooLarge'` for a record over it, as a full disk does. `js/storage/index.js` maps every key to its collection (`KEYS`, `collectionOf`) and reads and writes them as a backend (`legacyBackend`, `openStudentStore`), so `exportAll`, `importAll` (keep both, replace, skip, dry run) and `deleteAll` work over the keys the writers use. `adoptLegacy` copies them once into another store's collections without touching a key; no page runs it. The reserve and the collection total are the Store's checks: the writers get the record limit and the browser's own quota. In-tab change events are not on the writers' path (they cost every route bytes); another tab hears a write through the browser's `storage` event, which `openStudentStore` re-emits.

Moved: lesson progress, assignment progress, the student's name and the objects-list preference (`js/investigations.js`); the evidence notebook; the Observatory, 3-D lab and mission lab guides; the teaching page's notes; the Studio's drafts.

Still direct, and why (`tests/studentStorage.test.js` lists them and fails on any other):
- `js/experiments/store.js`, `js/experimentsPage.js`, `js/composerPage.js`, `js/coursePage.js`: their source routes sit at their request ceiling, and the module is a request.
- `js/evaluationKit.js`: 0.7 KB of room on its route; the module is 1.4 KB.
- `js/ui.js` (saved world), `js/controls.js`, `js/lecture.js`, `js/main.js`, `js/welcomeGate.js`, `js/settingsSchema.js`: reached from the start-up entry as well as from lazy chunks, which makes the module a shared chunk and costs every lesson route one request (0 free).
- `js/theme.js`, `js/units.js`, `js/shell.js` and the per-page `i18n.js` files (locale, theme, units): preferences on every route.
- `js/studio/model.js` writes to the Storage a page hands it (the Studio hands a guarded one; the Composer and course builder hand the raw one).
- `js/platform/resolver.js` (platform stamps), `js/instructorPortal.js` (sessionStorage), the notebook's availability probe; IndexedDB `gravitas-catalog` and `gravitas-archive`; `js/library/progress.js` and `js/authoring/preview.js` read only.
