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
| course terms | `gravitas_terms` (Prompt 168) | yes: under Courses, a line per course and term opened | in a backup file only when preferences are ticked | with delete-all |
| collections | `gravitas_collections` (Prompt 164): the saved items and the collections kept | yes: under Courses, "Saved items" and a line per kept collection, each linking to the Library, where it is taken out | yes (a durable record of the courses collection) | with delete-all, or in the Library |
| evidence | `gravitas_evidence_notebook` | yes, grouped by the page that made each entry, each with a link to it | yes (the notebook whole) | yes (the notebook whole) |
| experiments | `gravitas_experiment_<id>`, `gravitas_experiments_index` | yes | yes (with its index row) | yes (the index row is removed too) |
| made | `gravitas_made_<id>` | yes, with link, seed, scenario it came from, build and attachments | yes, per item and all | yes |
| drafts | Studio, Composer, course drafts (each listed draft opens in its page with `?open=<id>`, Prompt 78), `gravitas_simulation_save`, evaluation draft, teaching notes, experiment checkpoints | yes | yes | yes |
| settings | `gravitas_student_name` | yes (storage panel) | yes | with delete-all |
| preferences | locale, theme, units, flags, `gravitas_last_export` | no | yes; imported only if ticked | no |
| installs | IndexedDB `gravitas-catalog` | yes, listed | no | no (the Catalog removes them) |
| not student work | `gravitas-archive` (cached archive answers), platform stamps, previews, sessionStorage key | no | no | no |

## 3-D systems (Prompt 105)

The 3-D lab (`/3d/`) saves a system as a made record of kind `system3d`: its file is a `gravitas.system3d`, named `<name>.system3d.json`, and its "Open" link is `/3d/?open=<id>`. Evidence it keeps appears under Evidence with the source "3-D lab". A 3-D system cannot be attached to a report or a token.

## Missions (Prompt 106)

The mission lab saves a mission as a made record of kind `mission`: its file is the `gravitas.mission-plan/1` the lab writes, named `<name>.mission-plan.json`, and its "Open" link is `/mission/lab/?open=<id>`. Evidence it keeps appears under Evidence with the source "Mission lab". A mission cannot be attached to a report or a token.

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

## Reviewing and comparing the evidence (Prompt 275, part A)

When the evidence notebook holds entries, My work draws "Review and compare your evidence" under the Evidence list (`js/myWork/evidenceView.js`, a lazy module the page loads only then; the model is `js/myWork/evidenceReview.js`). It reads the whole ledger and offers:

- **Filters** by investigation (the lesson or activity the entry was kept in, else the tool that made it), kind (the entry's source, "Inference-core fit", "Parameter sweep") and date (from and to, the reader's local days), with a count of what is shown and a Clear filters button.
- **Open**: each entry links to the page that made it ("Open in the Observatory"). A record that carries its own replay (an image's marks) is replayed there, as before; nothing here invents a deep link a record does not carry.
- **Annotate**: the student's own heading and three prose fields (what it shows, what supports it, what limits it), written through `annotate()`; the snapshot, its numbers and its fingerprint do not change.
- **For a report**: a mark, kept as `marked: true` on the notebook entry (`mark()` in `js/notebook/entry.js`; present only while set). The report of one investigation does not read it; the marked entries make up the composed report (the next section).
- **Compare**: two entries of one kind (the same `source`), one quantity of each, or one entry's two quantities. Entries of different kinds, quantities in different units, and an uncertainty that is not one standard deviation (a limit, "not constrained", a failed fit, an asymmetric interval, none) are refused in words.

**The covariance rule.** The difference is A - B with Var(A - B) = Var(A) + Var(B) - 2 Cov(A, B), computed by Prompt 151's `compareEstimates` and worded by its `describeComparison` (`js/compare/estimates.js`, `compareW.est.*`). The statistics kernel's `difference` (Prompt 154) computes the same quantity; the page does not import it, because the kernel is NEVER_PRECACHED with no adopter and a first adopter would carry its nine files into the install, so `tests/evidenceReview.test.js` checks the two agree on a grid instead. The covariance is used when it is known: when both quantities are of one record and the record states a coefficient between them (`correlatedWith`), or when the student gives a correlation (or a covariance) for two records. Two different records state no coefficient of each other and nothing infers one. So:

| What is known | What the page says |
|---|---|
| nothing shared, nothing given | "Independence assumed." and the sentence that the two are treated as independent |
| the records share data (the same observation digest on a measurement, or one record) or calibration (the same assumed quantity), no coefficient | "Independence assumed.", then that they share their data or calibration, so the uncertainty of the difference is probably smaller than stated and the difference more significant, and that a correlation corrects it |
| a coefficient the record states, or one the student gives | "Covariance used", with where it came from |

Every statement ends with the Gaussian assumption. The page's comparison agrees with the kernel's `difference` (Prompt 154) on a grid of 60 cases and with Python's `math.erfc` on three hand-computed ones (`tests/evidenceReview.test.js`).

**Limits, said plainly.**
- A mark is an additive field on the stored notebook entry. A 2.0.0 or 2.1.0 build reads the entry and drops the mark on its next save, as it drops any field it does not know; nothing else about the entry changes. A made report keeps the list of its entries under its own key, which those builds do not rewrite, and My work offers to mark them again from it (the next section).
- Sharing is detected only from what a record says (a digest, an assumed quantity). Records that share data without saying so are compared with independence assumed and no warning; the student can state that they share, and give a correlation.
- The annotation fields are the notebook's own; there is no free-form note field beyond them.
- Spanish has not been read by a fluent reader.

## The report composed from marked entries (Prompt 275, part B)

When an entry is marked "For a report", or a composed report was made before, the review draws "Your report" under the comparison (`js/myWork/reportView.js`, a lazy module the review loads only then; the format, its reader and its words are `js/myWork/composedReport.js`). It is a report across investigations. The report of one investigation (`js/labReport.js`) and the notebook's own report (`js/notebook/report.js`) are unchanged, and nothing here prints into them.

- **Sections, in the student's order.** The marked entries, each with Move up and Move down (buttons, so the keyboard and one finger do the same thing; nothing is dragged). The focus stays with the entry that moved, and the status line says its new place.
- **A title**, the student's.
- **Comparisons carried in.** "Add this comparison to your report" under the comparison above puts it in, when what it compares is marked. The report keeps the two numbers, the correlation the student gave or that the record states, what the records share, and the result; it is computed again from the records when the report is made.
- **Make the report.** Writes one record among the things made (`gravitas_made_composed-report`, a `gravitas.made/1` of kind `report`, listed under "Scenarios and experiments you made" as a composed report). The record holds a `gravitas.composed-report/1`. Nothing is written before this, and making it does not touch the notebook.
- **Downloads**, all of the report as it was made: a tagged PDF, the accessible HTML (`js/htmlReport.js`: one h1, headings in order, tables, no script), the numbers as CSV (a row per number, then a row per comparison; numbers as JavaScript writes them in either language), and the report file for the instructor (`<title>.composed-report.json`).
- **Stale.** If the marks, their order or the annotations change afterwards, the card says so and the downloads stay those of the made report until it is made again.

**What a section says.** The entry's title, kind, the day it was recorded and its checksum; the student's claim; a table of its numbers; a methods paragraph; its sources (credit, licence, retrieval date, citations) when the record carries them; the student's evidence and limitations, with the record's own warnings; and, in the PDF and the HTML, the entry's figure with the numbers it draws as a table.

**The uncertainty statement.** Every number is printed in Prompt 151's one pattern, by the same function the notebook's report uses (`describeUncertain`, `js/platform/uncertain.js`): "X ± Y (method)", an asymmetric interval, a limit, "not constrained", a failed fit; a number with no uncertainty stated is printed alone.

**The methods paragraph** is generated from the record and is the same sentence every time, in English and in Spanish (`methodsText`). It names the instrument (the entry's kind and its envelope's source, with a version when one is recorded), then only what the record carries: scenario, integrator and step, reference frame, seed, viewing geometry, schedule, the tool's settings, the digest of the data or the starting state, the engine fingerprint, the build, and where the entry was kept. A field the record does not carry is not printed. The one absence that is said is the seed of a simulation ("The record carries no seed."), because a reading without one cannot be made again.

**The covariance statement** of a carried comparison is the one the comparison was made under: "Independence assumed.", "Covariance used, as the record states it." or "Covariance used, from the correlation the author gave.", followed by Prompt 151's sentence (the difference with its uncertainty, how many sigma, how often chance alone would do it, and every assumption, the shared data or calibration among them). The rule is Part A's and is not relaxed: nothing infers a covariance between two records.

**The file** (`gravitas.composed-report/1`, FORMATS.md) holds numbers, ids and the student's own words, and no generated prose: the page that made it and the review page each say it in their own language from the same record. Its `digest` is the SHA-256 of its canonical JSON without the digest. It does not hold figures.

**Handing in.** Once a report was made, the next submission token a lesson writes carries `cr`: the report's digest and its number of sections (`composedStamp` in `js/myWork/made.js`, read by `ledgerForReport`; `submission-token-2.schema.json`). The lesson's printed report is unchanged. The student hands in the report file; the review page (`/instructors/submissions/`) takes it like any other file, says which submission states its digest, recomputes the digest from the file, and writes the report out in the instructor's language. A file whose contents do not hash to the digest it states is shown open with an alert.

**Limits, said plainly.**
- The digest says the file is the one the digest was made from. It does not say who made it: a file edited and digested again, with a token edited to match, passes (PROVENANCE.md).
- One composed report is kept at a time; making another replaces it. A token states the report that exists when the token is made.
- The review page's results file and its archive do not carry the composed report or `cr`; the report is read again by adding its file.
- The report file carries no figure. The PDF and the HTML draw the notebook's figure at download time. In the HTML, the sentence under a drawing ("y against x. The data it draws:") is the shared HTML builder's and is English in a Spanish report.
- My work says its own strings from the page's language; the report's catalog words (the names of kinds, origins and uncertainty methods) are read in that language too, which the review sets for the visit without storing anything.
- A number's table leaves out the unit column and the note column when no number of the section has one.
- An image entry is not replayed from the report: "Open in" goes to the page that made the entry, as in Part A, and nothing invents a deep link a record does not carry.
- A 2.0.0 or 2.1.0 build lists the made record without reading it (it leaves a kind it does not know out of its list and does not overwrite it), reads a token that carries `cr` and does not show the field, and drops marks when it saves the notebook. "Mark them again" on the card restores the marks from the made report.
- Spanish has not been read by a fluent reader.

## Progress and prerequisites (Prompt 276, part 1)

The Your progress section answers "where am I and what is next" without a new
record. It is derived, in `progressGroups` of `js/myWork/model.js`, from three
things the page already reads: the progress records (an investigation with no
record is not started, one with a record and fewer steps seen than it has is in
progress, one with every step seen is done), the Library's entries and
sequences (an entry's `rel.in` names the sequences and courses it belongs to
and its place in each), and the resume record of Prompt 163 (its newest item is
the "Where you left off" line). The depth reached is the progress record's
`deepest` field, shown only when it names a depth the lesson engine knows.

A Library entry's `prerequisites` that are investigations and not yet done
appear on an investigation that is itself not done as "You may want X first",
with a link. That is advice: nothing is locked, hidden or disabled, and every
investigation opens from its own link. There are no points, badges or streaks.

**Not built here (Prompt 276 parts 2 and 3 and the card and panel forms of
part 1).** Prerequisites on a Library card and in the lesson panel; the
recovery pattern (a generated minimal hint ladder from the step's check,
"the units", "the order of magnitude", "the formula", named as generated; a
path to the worked example; the attempts record for Prompt 173's summary and
its compatibility-corpus row); the comparison across investigations. Spanish
has not been read by a fluent reader.
