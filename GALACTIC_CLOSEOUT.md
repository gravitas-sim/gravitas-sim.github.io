# Galactic investigations, sequence, package and cohesion closeout (Prompt 238)

A closeout run honestly against what Prompts 233 to 237 landed. Prompt 238 asks for connecting investigations (where the center is, the
spiral arms, the Galaxy's history, a 21-cm pointer, a satellite falling in), a sequence, alignment rows, topic pages, an extended
upper-level package and the cohesion check. What 233 shipped for a student is two investigations and their panels; what 234 to 237 shipped is
no student-facing item at all (234 was never run; 235 is a gate with verdict C; 236 and 237 are kernels with failing legs). Carl's rulings of
2026-11-05 (`DECISIONS_2026-11-05.md`, outside the repository) hold the consumers rule: no go-ahead for panels, lessons or viewers until
their gates pass. The connecting investigations would be built on data and methods that do not exist, so this prompt builds none of them.

It does the parts that apply. The two Gaia investigations that did ship are checked against the closeout's acceptance, cohesion and package
requirements, and the one gap that applied to them (neither was in any course package) is closed in the upper-level package. Everything
else is recorded as done, not applicable or blocked, with the reason.

Nothing here changes a shipped step, a lesson, a page, a pack or a bound; the one ceiling it moves is a 32-byte idle-precache raise, below. No published number or licence term is typed from
memory, and nothing was fetched.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at f2de6e74 (Merge #540), cut when this branch was made. Its aggregate push CI (run 42159666654) completed success, as did the previous tip's. |
| Tranche | T4 (prompts 233 to 254) is authorized by D-R10-232-01, the record of Continuation checkpoint IV (`CONTINUATION_CHECKPOINT_IV.md`, outside the repository): CONTINUE AS PLANNED. The row is DELEGATED, not ratified. |
| Hard prerequisites (Appendix C: 233, 237) | Both landed on `v3`: 233 as #511 (kernel, packs) and #516 (panels, investigations); 237 as #518 (kernel, reference runs, gate; verdict C). The optional enrichments 234 (never run), 235 (gate C), 236 (kernel, consumers rule unmet) did not produce a shipped item. |
| Gate outcomes that change 238 (Appendix C) | 237's Part B gate is C: the quantitative evolution claim is omitted and 238's "A satellite falls in" becomes a reading step. 234 to 236's gated parts are C or unbuilt: their consumers in 238 are reading steps. |
| Exists elsewhere | No open pull request or branch builds any 238 deliverable. The open pull requests are #538 (test temporary directories), #541 (the time-domain closeout) and two dependency updates. |
| Decision register | Every gate verdict it lists was read and is treated as binding: D-R10-233-01 to -11, D-R10-235-01 to -06, -90 and -91, D-R10-236-01 to -03 and -90, D-R10-237-01, -02 and -90. |

## What landed in 233 to 237

Every result below is read from the committed `results.json` and `failed-legs.json` of the kernel or gate, not from a handoff. A failed leg
stays failing and labelled; only Carl resets a bound.

| Prompt | Landed as | Student-facing | Legs: pass / fail / reported / not run | Failed and not-run legs, by id | Verdict |
| --- | --- | --- | --- | --- | --- |
| 233 Gaia workflows | Part A #511 (kernel, packs 1.1.0); Part B #516 | two investigations, two panels, a model-page section; the NGC 2420 text in Cluster Membership by Motion corrected | 23 / 0 / 3 / 1 | not run: E1 (NGC 2420 against a published, Gaia-based catalog distance) | none; the lessons state the distance with its labels (E1 NOT RUN, no systematic floor) |
| 234 Moving groups | not run when this closeout was written; the gate ran afterwards (#545, follow-up #546; MOVING_CLUSTER_GATE.md) | none | not applicable | at the time: no branch, pull request or register row existed; since then the gate's committed form returned C and its follow-up C, and Part B was not run | **C** (committed form and follow-up); no panel, no distance |
| 235 Kinematics gate | #520, follow-up #522; the Oort correction #521 | the Rotating Disk's corrected Oort values (#521) | 39 / 23 / 4 / 0 | 23 failing (the planar Oort form, the Oort recovery and coverage legs, the dispersion legs, the Toomre classification, the drift legs, each with its amendment-form twin) | **C for all four methods** (Oort, dispersions by metallicity, Toomre, drift); Part B does not run |
| 236 Rotation-curve decomposition | Part A #523 | none | 21 / 4 / 2 / 1 | fail A3, A5, C3, D4; not run E2 (published ranges not supplied) | no gate verdict; the consumers rule is unmet (four legs fail); Part B deferred, no sample (D-R10-236-90) |
| 237 Stellar dynamics | part 1 #518 | none | 25 / 4 / 0 / 1 | fail C1, C2, R2, R7; not run B1 (the Harris table was not supplied) | **C** by the committed rule (R2 fails); the analytic lessons stand but are not built |

The Rotating Disk (a shipped investigation) changed once in this range: #521 added the latitude factor to the Oort fit and corrected the
numbers students see (D-R10-235-05). It is the one Galactic step that moved after 233 and is not touched here.

Carl's rulings of 2026-11-05 bear on this range: the consumers rule for 236 (no panel, lesson depth or viewer until its gate passes); the
failed legs stay failing; the DELEGATED rows are ratified, including 235's AM1 and AM2 and its bounds and 237's R2, R7, virial structure
term, equilibrium start and analytic-only lessons; unverified references are verified by Carl from the papers before any lesson cites them.
The register's status column still reads DELEGATED in the tree; the ratification pass is Carl's.

## What a student can and cannot do in the Galaxy today

Available, and unchanged by this pull request: the Galactic items of the "Galaxies and the universe" sequence in their order, The Sun's
Motion, The Rotating Disk, How far, and how sure?, What Gaia does not see and Missing Mass, with the lensing, variable-star and expansion
investigations after them; Cluster Membership by Motion in the Observatory path; the Gaia NGC 2420 and solar-neighbourhood data, labelled
non-commercial, and the Milky Way rotation-curve pack.

Not available: any investigation, panel or viewer for moving groups, kinematic populations (dispersions by metallicity, the Toomre diagram,
the drift), the rotation-curve decomposition, the dynamics of a cluster or a satellite falling in, 21-cm mapping, the Galaxy's center or its
spiral arms. The kernels run in tests and in the validation suite; a student cannot reach them. No page, label or claim says otherwise.

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1a "Where is the center?" | BLOCKED | no globular-cluster catalog is in the repository and none has been fetched under a recorded rights decision (the Harris table that leg B1 of 237 wanted was not supplied); the labelled Gaia sample is within 1 kpc, so it cannot show the Sun's offset; the majors "distance to the center from a cited method" and the upper "methods compared" need cited values that are not in the tree and may not be typed from memory |
| 1b "The spiral arms" | BLOCKED | the shipped Gaia samples are the 1 kpc neighbourhood and one cluster at 2.3 kpc, with no model of Gaia's selection, so young stars cannot trace arms; "the pattern from a cited map" needs a map that was not fetched |
| 1c "The Galaxy's history" | BLOCKED | 235's populations are verdict C (nothing shipped) and 219 shipped with the metallicity stated, not fitted (its Part B gate was C); one cluster pack is not a metallicity-age picture, and a discussion with no measurement does not meet the acceptance sheet |
| 1d "Mapping with 21-cm" | BLOCKED | the prompt makes it a pointer to 241 "when it lands"; 241 landed a kernel with no consumer and no authentic data (D-R10-239 verdicts), so a pointer has nothing to point at; it appears as a reading-step topic in the package below |
| 1e "A satellite falls in" | DONE as a reading step | 237's gate is C, so by Appendix C the item is a reading step: the course package's reading step `not-yet-the-galaxy-as-a-whole` names it with the reason |
| 2 Sequence "The Milky Way" | N/A | see below |
| 3 Alignment rows for chapter 25; curriculum map | N/A for new rows | no new item to align: The Sun's Motion (25.1) and The Rotating Disk (25.3) already carry chapter 25; the two Gaia investigations carry chapters 19 and 22 from 233's own discovery rows and are not re-assigned; the rows state what ships and must not name an item that does not exist |
| 3 Upper-level modules package extended | DONE (visible) | `upper-level-modules` 1.2.0 to 1.3.0, below |
| 4 Topic pages, related and next links, recommended starts | checked, nothing to add | both Gaia investigations are in the Galaxies topic, have prerequisite, next and related links, an adoption page and search entries (below); a recommended start is one of four fixed starts and a new content item does not become one |
| 5a The cohesion check (9.4) | DONE | below |
| 5b The content acceptance sheet (8.4) | DONE for the two Gaia investigations | below; no new investigation exists to hold another |
| 5c Evidence-status rows | DONE | `gaia-lessons-recomputed` (V-internal, established, with its limits); no public claim was made or changed for 234 to 237 |
| 5d The data budget's ledger | DONE | below; nothing added or changed |
| 5e Generated artifacts regenerated | DONE | the documents map, the register, the evidence-status page, the tools index, the counts a change moves |
| Tests: library, sequences, course-pack, alignment, relations; i18n:check, docs:check:full, generate --check, links; lint, format; the full suite | DONE | listed in the pull request; axe, lesson validators, headless grading and e2e walks are not run because no page, lesson, panel or e2e spec changed |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies to the connecting investigations: they are **not built**,
so the Galactic unit is **NOT READY** as the roadmap defines it. The two investigations that shipped pass the cohesion check and the
acceptance sheet.

### Sequence "The Milky Way": not created

The two Gaia investigations were placed by 233 in `galaxies-and-the-universe` after The Rotating Disk, with their prerequisites (How far,
and how sure? needs The Sun's Motion; What Gaia does not see needs How far, and how sure?). A new sequence would hold the same four Galactic
investigations and Missing Mass, five items already ordered there. A sequence holds lessons only, so it could carry none of the gated-out
items as reading steps; those live in the course package, where the mechanism already exists (the `not-yet-` readings of
`stellar-astrophysics`). It would add a twelfth choice to the Library for no new content, and `tests/curriculumSequences.test.js` fixes the
set of sequences (a new one is a deliberate change to a test that names nine). Carl's question 2 below says when it becomes worth doing.

### The upper-level package

`upper-level-modules` 1.2.0 to 1.3.0, the galactic dynamics unit:

- **How far, and how sure?** and **What Gaia does not see** at the advanced depth, pinned by step digest (953ed4be and 92378a26, eight steps each),
  in the order of the sequence, with a new objective, "Turn a parallax into a distance with an interval, and say what a sample's selection
  does to it" (English and Spanish, the Spanish unreviewed by a fluent reader like the rest of the package).
- **A reading step**, `not-yet-the-galaxy-as-a-whole`: Astronomy 2e chapter 25, "The Milky Way Galaxy" (CC BY 4.0, the same citation the
  other packages use), whose student note says what has no investigation and that the chapter is the reading for the whole Galaxy, and
  whose teacher note gives each missing item's reason as recorded (moving groups never run, as written then, and since package 1.5.0 the gate's C and the unrun Part B; the four kinematic methods verdict C; the
  decomposition's failing legs and no panel; a satellite falling in waiting on a gate that returned C; 21-cm with no authentic data; the
  center, the arms and the history with no catalog or map fetched under a rights decision). The chapter is named by its title only; no claim
  is made about which sections cover which topic.
- The package stays UNVALIDATED as a course: no instructor has run it, no learning is measured, and no cartridge of it has been opened in a
  learning-management system by anyone outside the project (the same status as 1.2.0). The pack validates against the schema and audits
  clean (`tests/coursePack.test.js`, `tests/curriculumSequences.test.js`, `tests/commonCartridge.test.js`, `tests/formatSchemasCourse.test.js`).
  The change touches no deferred chunk (the deferred figure is unchanged to the byte); the first-visit precache tier read 5,362,122 bytes
  gzipped on the build before it and 5,363,495 after, inside its ceiling of 5,365,197; the idle tier, which carries the Library's data, grew by 33 bytes
  and is the one ceiling this pull request raises (below).

## The content acceptance sheet (8.4), for the two Gaia investigations

Both are read from `js/data/investigations/gaia-sequence.js` and held by `tests/gaiaLessons.test.js` (the rows marked T) and
`docs/lesson-acceptance.json`.

| Requirement | How far, and how sure? | What Gaia does not see |
| --- | --- | --- |
| Objective at survey depth, quantitative and inferential forms deeper | four objectives; deeper steps at the quantitative and advanced depths | four objectives; deeper steps at the quantitative and advanced depths |
| A specific misconception | a negative parallax is not thrown away; an interval is not symmetric (misconception feedback on three steps) | a cut removes the faint end and more; a distance from the stars left moves by more than its statistics (feedback on three steps) |
| A prediction recorded before the answer is revealed | `commit-to-a-distance` (a held prediction, reveal) | `commit-to-a-cut` (a held prediction, reveal) |
| The measurement and its uncertainty | `read-the-distance`: the distance and its 68 percent interval, fields graded (T) | `read-what-is-left`: the stars left and the distance with its statistical interval, fields graded (T) |
| A competing explanation, withheld transfer case or misspecified example | `what-the-prior-assumes`, `justify-a-report` (a catalog line of 0.10 mas with 0.10 mas) | `not-gaias-selection`, `answer-a-colleague` (use only the clean stars) |
| A brief reflection | partly: the survey depth ends on a summary read step; written justification is asked at the deeper depths (`justify-a-report`, `what-the-interval-leaves-out`) | partly: same shape (`say-what-the-sample-is` at the quantitative depth) |
| The instructor's key and rubric criteria | a guide, a flow, expectations and time bands; the short answers carry a rubric of the four kinds the key prints (T) | the same (T) |
| The upper depth's limits rather than more controls | `what-the-interval-leaves-out`, `the-zero-point` | `what-the-pack-already-cut`, `a-pack-that-gives-no-distance` |
| English and Spanish | the Spanish carries the same step structure (T) | the same (T) |
| Evidence status | `gaia-lessons-recomputed`: V-internal; the cluster distance is not validated against a published catalog (E1 NOT RUN) | the same row |

The one requirement met only in part is the survey depth's reflection. It is a shipped step, and "do not change a shipped step" holds; it is a
question for Carl, not a defect fixed here.

## The cohesion check (section 9.4), recorded

Run against `v3` f2de6e74 with this pull request's tree. An internal inspection, not evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass: nothing in them changed; every committed navigation ceiling is met as at the base |
| No new kind, term or filter without a register row | pass: none added (the one new objective is a course-pack objective with its own row) |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | pass for the two Gaia investigations: sequence `galaxies-and-the-universe`; the Galaxies topic; a course (now `upper-level-modules`); prerequisite, next and related links in `library.json`; the Library search index; an adoption page and the textbook alignment (chapters 19 and 22). A recommended start is not applicable (four fixed starts). No other new item exists |
| No duplicated terminology | pass: no label or glossary entry added; the glossary-consistency test passes |
| Default choice counts not substantially increased | pass: unchanged |
| Structural navigation checks green | pass: `npm run navigation:check`, `npm run surface:check`, `tests/navigationChecks.test.js`, `tests/surfaceGate.test.js` and the library, relations, sequence and course-pack suites pass on Node 22 |

The check passes because the one visible change is a course package's items; it is not evidence that the connecting investigations would
pass.

## The data budget's ledger

No pack, sidecar or data file is added or changed. The Gaia material, as it stands (register D-R10-233-02, GAIA_WORKFLOWS.md): the two
manifests (`gaia-dr3-ngc2420.json`, 18,173 bytes; `gaia-dr3-solar-neighbourhood.json`, 19,650 bytes) and their sidecars
(`gaia/ngc2420.json`, 54,011 bytes; `gaia/solar-neighbourhood.json`, 93,287 bytes), CC BY-NC 3.0 IGO, `nonCommercial` true, labelled
wherever the data is shown, and removable as module, manifest, service-worker entry and sidecar (D-GAIA-01's mechanism). The kernel's zero-point
table (`js/kernels/galactic/zeropointTables.js`, 2,921 bytes) is generated by a script from the authors' files and imported by no route.
`npm run budget:data` on a Node 22.23.4 build of this branch: packs 355,282 of 355,282 bytes raw (no room), packs gzip 111,422 of 111,422,
first-visit precache 5,363,495 of 5,365,197, idle precache 1,610,682 of 1,610,682 (raised from 1,610,650, below), IndexedDB and cache
18,508,011 of 209,715,200. The Gaia packs hold none of the room: any further pack needs a recorded raise or a sidecar.

The one raise: the idle precache tier's ceiling in `tools/data-budget.json`, 1,610,650 to 1,610,682 bytes, exactly the measured overrun of 32
bytes on a Node 22.23.4 build, under the standing approval of 2026-10-10 (register D-R10-238-06). The overrun is `library/library.json`,
which regenerates because the upper-level package's text changed and which the idle tier precaches.

## What would unlock each blocked item

The order follows the prerequisites, not importance.

1. A go-ahead from Carl for the matching consumer (the consumers rule). Without it nothing below is built.
2. Files and terms only Carl fetches: a globular-cluster catalog (the Harris table, also the leg B1 of 237) and a cited distance to the
   center; a cited map of the spiral pattern; the Gaia sample large enough to reach beyond 1 kpc (`ROTATION_DECOMPOSITION.md` Part B and
   `GAIA_WORKFLOWS.md` list what was asked); the published mass-model ranges for leg E2 of 236.
3. New legs for the failing ones, committed before any run, as Carl ruled for 245 and 248: 235's amendment forms and its T rule, 236's
   A3, A5, C3 and D4, 237's R2, C1 and C2. A bound is never moved after its result.
4. Then the consumer, then the connecting investigations in the order the prompt lists them, then the sequence "The Milky Way" (the
   package's reading step becomes the investigations it names), the alignment rows and the topic page. A re-run of this prompt is only
   meaningful after 1 and 2 for at least two of the five investigations.

## Questions for Carl

1. Is the shape of this run right: a package extension for the two shipped Gaia investigations and a record for the rest, rather than any
   connecting investigation built on gated or missing material? Recommendation: yes.
2. Create the sequence "The Milky Way" now, carved from `galaxies-and-the-universe`, or wait until at least two connecting investigations
   exist? Recommendation: wait; it would order five items that already have an order.
3. Add the two Gaia investigations to the introductory-course packages too (`astronomy-semester`'s galaxies unit, `observing-lab`), or keep
   them in the upper-level package only? Recommendation: leave as is until an instructor asks; each is a visible change to a different
   audience.
4. Should the survey depth of the two Gaia investigations end on a prompted reflection? It is a shipped step, so it is Carl's to ask for.
5. Which consumer, if any, is released first? The least blocked is 237's analytic lesson (crossing and relaxation times from a cluster's
   numbers, the virial mass with its refusals), which Appendix C says stands under verdict C and needs no file; it is not built.
6. Ratify the DELEGATED rows D-R10-238-01 to 238-06, or say which to change.

## Not done, on purpose

- No investigation, lesson, panel, viewer mode, pack, Library entry, sequence, topic page or alignment row.
- No instructor materials, no instructor bundle rebuild (the queue owns it), no passphrase, no Spanish catalog string beyond the package's
  own texts.
- No ceiling raised beyond the idle precache tier's measured 32 bytes, no `.github` edit, no bound moved, no failed leg re-labelled, no data fetched, no published number typed.

<!-- Listed in DOCUMENTS.md. -->
