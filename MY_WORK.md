# My work

`/my-work/` (Roadmap II Prompt 69) is the one page where a student sees and manages what they have made in Gravitas. It needs no account and sends nothing anywhere: everything is read from this browser's own storage, and a backup is a file the student saves.

## How it reads

The page opens `openStudentStore()` (`js/storage/index.js`), the store over the keys the writers already use, takes one `exportAll()` snapshot, and describes it (`js/myWork/model.js`). Nothing is migrated and no key is renamed. Records from that adapter carry no saved time, so each document's own stamp is used: a lesson's `startedAt`, a draft's `savedAt`, an experiment's `updated`, a notebook entry's `capturedAt`. Titles, step counts and the page that opens each thing come from `library/library.json` (the Library's index); built-in courses carry their `units` there, for per-unit progress. A lesson's resume link is `/#investigation=<id>`: the lesson reads its own saved step (`stepSid`) when it opens.

Installed Packages are in IndexedDB (`js/catalog/store.js`), which the store does not cover; they are listed through that module and are not in a backup file.

## What the page says plainly

- Work is kept in this browser on this device; there is no account or server, nobody at Gravitas can see or recover it.
- Direct writers (STORAGE.md, "Still direct") do not check how much room is left and do not announce a refused write, so a nearly full device can fail to save silently. The page says so and offers a backup.
- A backup does not hold installed packages or PDF/CSV reports.

## Backup, import, move, delete

- **Download everything / per item.** The file is `gravitas.student-data/1` (`exportAll`). One item is that file cut to its keys; an experiment travels with its row of the index, a guide with its own record.
- **Import.** Previewed with `importAll(..., {dryRun: true})` before anything changes. Modes are *use the file's version* (replace, the default) and *keep what is here* (skip); *keep both* is not offered, because it would write keys no page reads. Language and theme are left out unless ticked. The notebook, the guides and the experiments' index each hold many things in one record, so an import merges those by the id inside them (`js/myWork/transfer.js`) instead of replacing them whole.
- **Refusals.** A write the store refuses (`quota`, `collectionFull`, `itemTooLarge`) is counted and named, nothing already here is changed, and the page offers *Download everything*. The same offer shows when less than 256 KB can still be used.
- **Move to another device.** Four steps on the page: download, carry the file yourself, import with the preview, open an investigation.
- **Delete.** Per item or everything, through a dialog whose Delete button stays disabled until a copy has been downloaded in this visit. Delete-all leaves the language and theme.
- **Last backup.** `gravitas_last_export` (preferences) records when a file was made and how much it held. It cannot know the file was kept.

## Collection coverage

| Collection | Where it lives | Shown | Exported | Deleted here |
|---|---|---|---|---|
| progress: lessons | `gravitas_investigation_<id>` (+ `:v1` copy) | yes, with resume link and report status | yes, per item and all | yes, with its copy |
| progress: guides | `gravitas_guides` (Observatory), `gravitas_lab3d_guide_*`, `gravitas_missionlab_*` | yes | yes (an Observatory guide alone is cut from its record) | yes |
| assignments | `gravitas_assignment_<hash>` | yes; reopens from the instructor's link | yes | yes |
| courses | built-in course progress is derived from lesson records; `gravitas_course_draft:*` | per-unit progress; drafts under drafts | yes | drafts yes |
| evidence | `gravitas_evidence_notebook` | yes, grouped by the page that made each entry, each with a link to it | yes (the notebook whole) | yes (the notebook whole) |
| experiments | `gravitas_experiment_<id>`, `gravitas_experiments_index` | yes | yes (with its index row) | yes (the index row is removed too) |
| drafts | Studio, Composer, course drafts, `gravitas_simulation_save`, evaluation draft, teaching notes, experiment checkpoints | yes | yes | yes |
| settings | `gravitas_student_name` | yes (storage panel) | yes | with delete-all |
| preferences | locale, theme, units, flags, `gravitas_last_export` | no | yes; imported only if ticked | no |
| installs | IndexedDB `gravitas-catalog` | yes, listed | no | no (the Catalog removes them) |
| not student work | `gravitas-archive` (cached archive answers), platform stamps, previews, sessionStorage key | no | no | no |
