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
| made | `gravitas_made_<id>` | yes, with link, seed, scenario it came from, build and attachments | yes, per item and all | yes |
| drafts | Studio, Composer, course drafts, `gravitas_simulation_save`, evaluation draft, teaching notes, experiment checkpoints | yes | yes | yes |
| settings | `gravitas_student_name` | yes (storage panel) | yes | with delete-all |
| preferences | locale, theme, units, flags, `gravitas_last_export` | no | yes; imported only if ticked | no |
| installs | IndexedDB `gravitas-catalog` | yes, listed | no | no (the Catalog removes them) |
| not student work | `gravitas-archive` (cached archive answers), platform stamps, previews, sessionStorage key | no | no | no |

## Scenarios and experiments (Prompt 74)

What a student builds or runs has a home in the `made` collection (`gravitas_made_<id>`, `gravitas.made/1`, `js/myWork/made.js`). The page lists it in "Scenarios and experiments you made" (`js/myWork/madeView.js`, loaded only when something was made, so the page's route stays at its ceiling).

| Kind | Saved from | Holds | Opens |
|---|---|---|---|
| scenario, `from: sandbox` | the Sandbox's share dialog ("Save to My work", with a name) | name, seed, the settings that differ from the defaults, object count, the link the dialog shows, build, and `derivedFrom` {id, version} when the world was opened from a scenario made in the Studio (the identity a link carries in `x.pack`) | `/#<link>` in the Sandbox |
| scenario, `from: builder` | the Orbital System Builder ("Save to My work") | the above plus the builder file (`gravitas.orbital-system/1`); the link is the Studio's own compile of that file, with no scenario identity | `/#<link>`; the file downloads as `.gravitas-system.json` |
| experiment, `from: runner` | the experiment runner, beside the downloads | the result (`gravitas.experiment-result/1`: manifest, engine fingerprint, summary, trials; the trials are left out, and the record says so, when they would not fit 512 KB) | the runner |

The A/B bench's saved comparisons keep their own keys and are listed under "Experiments and saved comparisons"; a comparison becomes evidence through the bench's notebook buttons, as before.

**Attaching.** Each item lists the evidence entries as checkboxes ("the system I measured"). `attachedTo` holds entry ids; nothing in the notebook changes, so entry fingerprints and the evidence digest are untouched.

**Handing in.** A report that has attached items prints them (name, kind, seed, the scenario made from, build and engine, entry numbers, and the link). Its submission token carries up to four as `sy` (`submission-token-2.schema.json`): a link of up to 1500 characters rides in the token, a longer one is handed in as a file (Download file, or the export file of the item). The review page shows a table per report with the scenario identity, build, engine fingerprint (experiments), a digest of the link and an "Open in the Sandbox" link, and the results JSON export carries `systems`. Importing the student's item file in the instructor's own My work does the same for a file.

**Limits, said plainly.**
- A world carries the build that saved it (the `gravitas-revision` stamp), not an engine fingerprint: the fingerprint is made by integrating a reference world in the experiment worker (`engineFingerprint`), which the Sandbox cannot do without replacing the live world. Experiments carry it. The review page shows `none` where there is none.
- The token is not authentication: a student can attach anything. It transports the identity; it does not vouch for it (PROVENANCE.md).
- There is no rename; save again under another name and delete the first.
- No Studio editing surface was added for students: a pack opened from a link is changed in the Sandbox and saved there, and the copy records what it came from.
