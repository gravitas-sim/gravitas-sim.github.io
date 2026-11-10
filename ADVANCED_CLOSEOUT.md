# Advanced sequences, packages and cohesion closeout (Prompt 274)

A closeout run honestly against what Prompts 268 to 273 landed. Prompt 274 asks for two sequences ("Computational astrophysics" and
"Spaceflight and the three-dimensional sky", for majors and upper-level courses), the upper-level package extended, the curriculum map,
alignment rows for chapter 3's spaceflight section, topic pages, related and next links, recommended starts, the cohesion check, the content
acceptance sheet and the evidence-status rows. Its run condition is "after 269 to 273 (what landed)", and what landed for a student is one
prompt's worth: Prompt 271's run modes, reference planes and five guides in the 3-D lab. Prompt 268's gate returned C, so Prompt 269 was not
run and no notebook was added; Prompt 270 is a record and built no investigation; Prompts 272 and 273 returned C and landed a kernel and a
record each, with every consumer held. Carl's rulings of 2026-11-05 to 2026-11-07 hold the **consumers rule** for each of them: no panel,
lesson, viewer or sequence is built on a kernel or a page whose gate did not pass.

It does the parts that apply:

- **One sequence is created**, "Spaceflight and the three-dimensional sky": the guides of the 3-D lab and of the mission lab, which were in
  no sequence, in the order of their prerequisites, in both languages. It holds shipped guides only.
- **One sequence is not created**, "Computational astrophysics": it would hold nothing but the five investigations that need the compute
  page, and the gate on that page failed on exactly that coupling (below).
- **The upper-level package** gains two reading steps for what was gated out, one in the celestial mechanics unit and one in the computation
  unit, each saying in words what has no investigation and why. No compute link is added anywhere.
- The record: what landed, each closeout item as done, not applicable or held with its reason, the cohesion check, the acceptance audit of
  the guides the sequence places, three evidence-status rows, the register rows, the regeneration, and the note in `INTEGRATION.md` that
  this is the last content closeout before Prompt 287.

Nothing here changes a shipped step, a guide, a lesson, a page's markup or a bound. No published number or licence term is typed from
memory, nothing was downloaded, and every failed leg stays failing and labelled. The Spanish of the sequence and of the package text is
unreviewed by a fluent reader and stays so; that is the standing state of every Spanish text in Gravitas and not a pending item.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at 325f7ff5 (Merge #576). Every Roadmap III pull request, whatever its class, targets `v3` (INTEGRATION.md, Carl 2026-10-17). |
| Tranche | T6 (prompts 268 to 295) is authorized by D-R10-267-01, the record of Continuation checkpoint VI (CONTINUE AS PLANNED). |
| Hard prerequisites (Appendix C: 270, 271, 272) | All three landed on `v3`: 270 as a record (#571), 271 (#572), 272 as a kernel and a record (#573). |
| Optional enrichments (Appendix C: 269, 273) | 269 was not run (268's verdict C, D-R10-268-04). 273 landed as a kernel and a record (#574), verdict C. |
| Gate outcomes that change 274 (Appendix C) | 268 C: "270 and 274 ship without compute links". 273 C: "the existing guide stands; 274 lists the depth as a reading step". 272 C (D-R10-272-01): the first workflow's panels and guides are held, and with them the four that were to follow. |
| Exists elsewhere | No branch, worktree or pull request built any 274 deliverable. Prompt 277 (onboarding) runs beside this one in its own worktree, on Home and the first week; nothing here touches those files. |
| Decision register | Every verdict was read and is treated as binding: D-R10-268-01 to -05 (ratified), 270-01 to -03, 271-01 and D-BUDGET-271-01 to -03, 272-01 to -04, 273-01 to -04. |

## What landed in 268 to 273

Read from each record's committed `results.json` under `tests/fixtures/` (`compute-gate-ii`, `lab3d-curriculum-ii`, `mission-lab-ii`,
`resonances-ii`), not from a handoff. A failed leg stays failing and labelled; only Carl resets a bound. The counts are the rows of each
results file as committed, follow-up legs included where the file holds them.

| Prompt | Landed as | Student-facing | Legs: pass / fail / reported / not run | Failing and not-run legs, by id | Verdict as recorded |
| --- | --- | --- | --- | --- | --- |
| 268 Compute page gate | gate record, #570 | none | 57 / 6 / 3 / 4 | fail N01.a, N02.d, N07.b, G4.b, G5.b, G7.a; not run G2.b, G3.b, G3.c, G4.c (the pinned runtime in a browser: downloaded code, permission not given) | **C**: 269 not run; the page stays at its present notebooks |
| 269 Compute notebooks | not run | none | none | none | not run (it needs 268 A or B) |
| 270 Numerical-methods investigations | a record, #571 | none | no legs (nothing was built) | none | a record: the five investigations need a new instructor source file and, most of them, an instrument that does not exist |
| 271 3-D lab curriculum II | run modes, reference planes, the orbit editor and sky view, five guides, #572 | **yes**: the guides The language of orbits, Changing frames, Seen from here, Mutual inclinations, Resonant pairs | 34 / 2 / 1 / 0 | fail E2 and E7 (the once-per-orbit sampled resonant argument carries a short-period term); the smoothed legs added by an amendment recorded before they ran pass | landed; E2 and E7 stay failing and labelled |
| 272 Mission lab II | kernel `js/mission/workflow.js` and a record, #573 | none | 15 / 1 / 0 / 2, one not applicable | fail A2 (the cheapest date against the Hohmann date); not run B1 (a published mission summary) and B4 (an independent package: downloaded code is not run) | **C**: panels and guides held |
| 273 Resonances and secular dynamics II | kernel `js/lab3d/libration.js` and a record, #574 | none | 22 / 13 / 1 / 1 (the committed legs and the follow-ups together) | fail L1, L1s, L3, L4, P3, S1, S2, D3, C1, L3f, S1f, S2f, C1f; not run K1 (the Kozai-Lidov timescale) | **C**: "the existing guide stands" |

No shipped lesson changed in this range. The one content change is 271's: five guides, their Library entries, their adoption pages and their
items in the upper-level package's celestial mechanics unit.

## What a student can and cannot do today

Available: the nine guides of the 3-D lab (an orbit's plane, the view from outside, two orbits' planes, a distant third body, the language of
orbits, changing frames, the view from a chosen direction, mutual inclinations, a resonant pair) and the three of the mission lab (a
rendezvous in Earth orbit, the launch window for Mars on the ephemeris, the patched conic against the direct flight); the lessons Getting There From
Here (the Hohmann transfer), Where Does a Gravity Assist Get Its Speed?, Where Can It Get To? (the Lagrange points) and When Orbits Lock; the compute page with its present notebooks and the five investigations that
use it, online only, as before.

Not available: a launch window chosen over a grid of departure and arrival dates, a mission's ledger of velocity changes, a rendezvous or a
gravity assist on the ephemeris, viewing geometry for a mission; a measured libration period and amplitude, secular precession rates, a
Kozai-Lidov timescale against a reference; any numerical-methods investigation inside the application (one step's error, an adaptive step,
the divergence of an ensemble, a transform of a sampled series, interpolation error); any notebook beyond the present ones. The kernels of
272 and 273 run in tests and in their validators; a student cannot reach them. No page, label or claim says otherwise.

## The sequences

### Created: Spaceflight and the three-dimensional sky

Before this pull request the twelve entries of formats `lab3d` and `mission` were Library entries with adoption pages and items of the
upper-level package, and were in no sequence: none had a pathway on its item page, and six had no next entry (`l3-eclipse`, `l3-kozai`,
`l3-seen`, `l3-tilts`, `l3-resonant`, `ml-cruise`). The sequence fixes that with what exists.

| Order | Guide | Lab | Level | Assumes (within the sequence) |
| --- | --- | --- | --- | --- |
| 1 | An orbit's plane (`l3-planes`) | 3-D | majors | none |
| 2 | The language of orbits (`l3-elements`) | 3-D | majors | none |
| 3 | Changing frames (`l3-frames`) | 3-D | majors | The language of orbits |
| 4 | Seen from here (`l3-seen`) | 3-D | majors | Changing frames |
| 5 | Seen from outside (`l3-eclipse`) | 3-D | majors | An orbit's plane |
| 6 | Two orbits' planes (`l3-mutual`) | 3-D | majors | An orbit's plane |
| 7 | Mutual inclinations (`l3-tilts`) | 3-D | majors | Two orbits' planes, Changing frames |
| 8 | A distant third body (`l3-kozai`) | 3-D | upper | Two orbits' planes |
| 9 | Resonant pairs (`l3-resonant`) | 3-D | upper | The language of orbits |
| 10 | In Earth orbit: meeting the depot (`ml-orbit`) | mission | majors | none |
| 11 | Leaving for Mars: the launch window (`ml-window`) | mission | majors | Meeting the depot |
| 12 | On the way: the patched conic against the direct flight (`ml-cruise`) | mission | upper | The launch window |

- **Where it is declared.** `tools/library-curation.json`, a new `sequences` block, read by `tools/build-library.mjs` (`curatedSequences`).
  The curated sequences of lessons stay in `js/data/investigations/sequences.js`, which holds lessons only and whose nine are fixed by
  `tests/curriculumSequences.test.js`; the Observatory's suites order themselves. A sequence of guides is the third case and had no home.
  The curation file is not shipped, so the sequence costs no route or bundle byte; it reaches a reader only through `library/library.json`.
- **What the builder refuses** (each tested in `tests/advancedCloseout.test.js`): an id already taken or not an id; a title or blurb missing
  in either language; an `after` that names no sequence; an entry that is not a guide of the formats the sequence names, or named twice; a
  guide placed before one it assumes; a guide of those formats left out.
- **Prerequisites.** Each guide's own, as the Library already records them (`tools/library-curation.json`, `guides`); the sequence's `after`
  names Gravity and orbits, whose lessons Kepler's Laws and Getting There From Here (`hohmann-transfer`) the package's items already require. Advice, never a lock.
- **Ladders and feedback.** Each guide has its two paths (core and advanced) and the feedback its own steps give; nothing is added to
  either. The generated hint ladder of Prompt 276 is held with that prompt's second part and is not built here.
- **Gated-out items.** They are not entries of the sequence (a sequence holds what can be opened). The blurb says in one sentence what has
  no investigation yet, and the package's reading step says why.
- **Compute links.** None. No entry of the sequence, and nothing this pull request adds, links to the compute page.
- **Where a reader meets it.** The Library's pathways list (one more line in an existing group), the sequence filter, the topic pages of
  every subject its guides carry (Orbits, Spaceflight, Gravity, Exoplanets, Observing), each guide's item page (the pathway it is in, with
  its position, and the next entry), and the package's teacher note. It is not on My work's progress view, which reads lessons only (Prompt
  276), and that view is not changed here.

### Not created: Computational astrophysics

The sequence would hold `integrators-in-practice`, `extending-an-experiment`, `refitting-a-transit`, `two-periodograms` and
`sampling-a-posterior`, and nothing else: Prompt 269's notebooks were not built and Prompt 270's five investigations in the application were
not built. Those five are placed already, in Gravity and orbits and in Planets and exoplanets, and they are the package's computation unit.
All five need the compute page, which is online only, and Prompt 268's leg G5.b (no built-in course lists an investigation with a compute
step) **fails** on exactly that listing; Carl's ruling on the gate left the page and the five investigations unchanged. A new sequence made of
them would add a second listing of the coupling the gate failed, a Library choice for no new content, and shipped strings in a deferred
bundle that has no room. A path without content is not a unit; the same decision was taken for Prompts 253 and 266. It is created when
Prompt 270's investigations exist (question 2).

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1 Sequence "Spaceflight and the three-dimensional sky" | DONE | above |
| 1 Sequence "Computational astrophysics" | NOT CREATED | above |
| 1 Prerequisites, ladders and feedback, both languages | DONE for the sequence created | the guides' own; nothing added |
| 1 The existing 3-D and mission guides placed | DONE | every guide of both labs, once |
| 1 Gated-out items as reading steps | DONE | two reading steps in the package (below) |
| 1 Compute links only where 269 shipped the notebook | DONE | 269 shipped none, so there is none |
| 2 The upper-level package extended | DONE (visible) | 1.6.0 to 1.7.0, below |
| 2 The curriculum map | not edited here | it is an instructor document inside the encrypted bundle; its sources are read when the queue rebuilds the bundle, and this session neither holds the passphrase nor edits `instructors/materials.*` |
| 2 Alignment rows for chapter 3's spaceflight section | no new rows | below |
| 3 Topic pages | DONE by derivation | the topic pages list the sequence wherever one of its guides carries the subject; no topic paragraph changed |
| 3 Related and next links | DONE | every guide gains its pathway and a next entry, or the stated reason "last" |
| 3 Recommended starts | unchanged | a recommended start is one of four fixed starts for a first week; a sequence for majors is not one (the decision of D-R10-216-08) |
| 4 The cohesion check (9.4) | DONE | below |
| 4 The content acceptance sheet (8.4) | DONE as an audit | below; two requirements are not met by the guides and are recorded, not repaired |
| 4 Evidence-status rows | DONE | three rows |
| 4 Generated artifacts regenerated | DONE | the Library, the service-worker manifest, the documents map, the evidence-status page, the tools index, the counts a change moves |
| 4 The last content closeout noted in INTEGRATION.md for 287 | DONE | "Roadmap III execution" |
| Tests | DONE | listed in the pull request |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies: the computational sequence is not created, the
investigations of 269, 270, 272 and 273 are held or were never built, and the acceptance audit records two requirements the guides do not
meet. The advanced phase (R23) is therefore **NOT READY** as the roadmap defines it. What is shipped passes the cohesion check.

### The upper-level package

`upper-level-modules` 1.6.0 to 1.7.0. It keeps its eight units.

- **Celestial mechanics** gains a last item, a reading step (`not-yet-windows-budgets-and-libration`): chapter 3 of the textbook the
  alignment uses, with a student note on what has no investigation (a window over a grid of dates, a mission's budget of velocity changes,
  a rendezvous or a gravity assist on the ephemeris, a measured libration, long-term precession, the length of a Kozai-Lidov cycle) and a
  teacher note on why, as recorded by Prompts 272 and 273, and where the guides that do exist are ordered. This is Appendix C's "274 lists
  the depth as a reading step".
- **Computation** gains a last item, a reading step (`not-yet-numerical-methods`): Gravitas's own model page, the sections on gravity and
  motion and on the conservation check, with the validation page. The student note says what has no investigation of its own outside the
  compute page; the teacher note says why (Prompt 270's record, Prompt 268's verdict). The five investigations of the unit are untouched:
  no note, no depth, no pin and no order changed (`tests/advancedCloseout.test.js` holds that).
- No count, no number beyond the two section numbers the alignment rows already carry, and no file path is in the notes.
- The package stays UNVALIDATED as a course: no instructor has run it, no learning is measured, and no cartridge of it has been opened in a
  learning-management system by anyone outside the project. It validates against the schema and audits clean
  (`tests/coursePack.test.js`, `tests/curriculumSequences.test.js`, `tests/commonCartridge.test.js`, `tests/formatSchemasCourse.test.js`).
  No other course changed.

### Alignment

The rows for chapter 3's spaceflight section exist already and are read by the Library and the adoption pages: section 3.5 is carried by
`orbital-energy`, `hohmann-transfer`, `gravity-assist` and the three mission guides; section 3.6 by `lagrange-points`, `butterfly-effect` and
the four 3-D guides on more than two bodies; section 3.4 by the four 3-D guides on one orbit's geometry. A row is a claim that an entry supports
a section, and the held items have no entry, so no row is added. The reading step names the same chapter.

### Topic pages, related and next links, recommended starts

Checked in `library/library.json` after regeneration: each of the twelve guides carries `["seq", "spaceflight-and-the-3d-sky", position]`,
eleven carry a next entry and the last carries the reason `last`; the relations checker (`tools/build-relations.mjs`) finds nothing. The
topic view derives its sequences from the entries on the subject, so the sequence appears on five topic pages without a change to any
paragraph. The four recommended starts are unchanged.

## The content acceptance sheet (8.4), for the twelve guides the sequence places

Read from the guide sources (`js/lab3d/guides/curriculum.js`, `js/mission/lab/curriculum.js`) and their catalogs; the facts in the first
five rows are held by `tests/advancedCloseout.test.js`. This audit records fact and changes nothing: the prompt forbids changing a shipped
step. Each curriculum's own record (`LAB3D_CURRICULUM.md`, `LAB3D_CURRICULUM_II.md`, `MISSION_LAB.md`) holds its validation.

| Requirement | The nine 3-D guides | The three mission guides |
| --- | --- | --- |
| A prediction recorded before its answer is revealed | met: each has a choice with no keyed answer that a later step answers (`predict-shape`; `predict`; `predict-a` and `predict-flat`; `predict-eq`; `predict-centre` and `predict-omega`) | met: `predict` in each |
| The measurement | met: every guide has answer steps, graded by the guide's own rules | met: answer steps with a stated tolerance and unit |
| Objective at one depth and a deeper form | met: two paths, core and advanced | met: two paths |
| A competing explanation, withheld transfer case or misspecified example | met in part: keyed choices between explanations in every guide; a withheld transfer case in none | met in part: the same; On the way sets the patched conic against the direct flight |
| The limits rather than more controls | met: every guide ends on a `limits` step saying what it leaves out | met: the same |
| A brief reflection | **not met** as a written step in any of the nine | met by On the way only (its `explain` step); **not met** by the other two |
| The measurement's uncertainty | **not met**: an answer is graded within a tolerance and no step asks for the uncertainty of a measured value | **not met**: the same |
| A specific misconception | not audited line by line here; each guide's prediction and keyed choices are built on one (the summaries name them: two orbits with the same inclination need not share a plane; the angle between two planes is not the difference of their tilts) | not audited line by line here |
| The instructor's key and rubric criteria | a key exists for each (the bundle is the queue's) | the same |
| English and Spanish | the Spanish carries the same step structure (machine-checked); unread by a fluent reader | the same |
| Evidence status | `lab3d-curriculum-ii-recomputed` (new row) for the five guides of Prompt 271; the first four predate the record | none of its own; the workflow kernel's row is `mission-window-budget-workflow` |

Two requirements are not met: a written reflection (eleven guides) and an uncertainty on a measured value (all twelve). Neither is repaired
here, because the repair is a new step in a shipped guide, with its Spanish, its key and the queue's rebuild of the bundle. They are
recorded as the audit's finding (question 3).

## The cohesion check (section 9.4), recorded

Run against `v3` 325f7ff5 with this pull request's tree. An internal inspection, not evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass, with one line stated: the menu and Home are unchanged; the Library's default view lists one more pathway, inside the existing pathways group and below the fold, and every committed navigation ceiling is met without a change (the default-view counts are those of the base) |
| No new kind, term or filter without a register row | pass: none added. The sequence filter gains one option, as it does for every sequence; the reading steps are of a kind the packages already use |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | pass: there is no new investigation, guide or tool. The twelve guides the sequence places were reachable by topic page, course, search and an adoption page, and now also by a sequence and a next link |
| No duplicated terminology | pass: no label or glossary entry added; the sequence's name is used for nothing else |
| Default choice counts not substantially increased | pass: one pathway line; nothing else |
| Structural navigation checks green | pass: `npm run navigation:check`, `npm run surface:check`, `npm run check:architecture`, `npm run docs-map:check` and `npm run packs:check` exit 0 on Node 22.23.4, and the library, relations, sequence, course-pack, navigation and surface suites pass in the full Jest run; `e2e/navigation.spec.js`, `e2e/library.spec.js` and `e2e/accessibility.spec.js` pass in Chromium |

The check passes because the visible changes are one pathway and two reading steps. It is not evidence that the held investigations would
pass.

## Data and size

No pack, sidecar or data file is added or changed, and nothing was downloaded. Measured on a Node 22.23.4 build of this branch over `v3`
325f7ff5 (`npm run budget:data`, `npm run budget:check`, `npm run budget:routes`, `npm run budget:composition -- --check`): packs 355,265 of
355,282 bytes raw and 111,422 of 111,422 gzip; first-visit precache 5,341,446 of 5,365,197 bytes (the package file grows by 2,653 bytes
gzipped: its two reading steps in two languages); initial download 801.7 KB of 830.0; deferred JavaScript 3,165,272 bytes gzipped (3091.1
of 3091.2 KB), which this work does not move, because a course package is built into the course pages' own chunks and the Library file is
not JavaScript; every route within its ceiling with none moved (the course pages' chunks grow inside their room); start-up composition
unchanged; indexedDB and cache 18,508,011 of 209,715,200.

**One ceiling is raised:** the idle precache tier, 1,664,205 to 1,664,874 bytes (`tools/data-budget.json`), exactly the 669-byte overrun.
`library/library.json` grows by 736 bytes gzipped (the sequence's title and blurb in two languages and each guide's pathway and next entry)
against 67 bytes of room. The raise is made under the standing approval of 2026-10-10 as it was applied to this tier by Prompts 266 and
271, with a register row (D-R10-274-05); the queue confirms the figure on CI and lists it for Carl.

The instructor closure is unchanged: 306 source files, the same digest, and `npm run instructors:check` reports the bundle current, because
neither the curation file, the Library file nor a course package is a closure source. No closure file is added.

## What would unlock each held item

1. **The computational sequence:** Prompt 270's investigations. They need one new instructor source file with the closure cap raised by
   one, the instruments built first under the validation contract (each a kernel), and the queue's rebuild of the ciphertext
   (`NUMERICAL_INVESTIGATIONS.md`, section 8). A compute link needs a later compute gate that passes G5.b, G4.b and G7.a.
2. **The window and budget guides** (and the rendezvous, gravity-assist and geometry work behind them): Carl's answers in
   `MISSION_LAB_II.md` section 8: a follow-up leg for A2 with its bound committed first, a source for B1, permission or an alternative for
   B4, and the release of a first consumer.
3. **The resonance depth** (the panel, the upper depths of When Orbits Lock, the two guides): Carl's answers in `RESONANCES_II.md`
   section 7: a ripple-free estimator as new legs with bounds first, a step chosen by an error budget, a reference for K1.
4. **The acceptance findings:** a reflection step and an uncertainty step in the guides, as a content prompt of their own with the
   instructor keys and the queue's rebuild.
5. Then a re-run of this prompt's items 1 and 2 for what exists by then; the reading steps are edited down as each item ships.

## Questions for Carl

1. Is the shape of this run right: one sequence of shipped guides, two reading steps, and a record for the rest, with no sequence, panel or
   lesson on a held kernel or on the compute page? Recommendation: yes.
2. "Computational astrophysics" is not created. Create it when Prompt 270's investigations exist, as a curated sequence of lessons, or
   create it now from the five compute investigations alone? Recommendation: wait; a sequence of five investigations that all need a
   connection repeats the listing leg G5.b failed.
3. The acceptance audit finds no written reflection in eleven of the twelve guides and no uncertainty on a measured value in any. Repair
   them as a small content prompt (a step each, both languages, keys, a bundle rebuild), or accept the guides as they are?
   Recommendation: the content prompt, after the accessibility sweeps, since it changes shipped guides.
4. The new sequence is on the Library's default view as a tenth pathway. Keep it there, or list guide sequences only on topic pages and in
   the filter, as the Observatory's two suites are? Recommendation: keep it; it is the only way from the default view to twelve guides.
5. Ratify the DELEGATED rows D-R10-274-01 to 274-05, or say which to change.

## Not done, on purpose

- No investigation, lesson, guide, panel, viewer mode, pack, notebook, compute link, topic paragraph, recommended start or alignment row.
- No sequence built on the compute page, on the mission workflow kernel or on the libration kernel.
- No instructor materials and no instructor bundle rebuild (the queue owns it), no passphrase, no edit under `.github`.
- No bound moved, no failed leg re-labelled, no data fetched, no published number typed, and no count typed where a generator writes one
  (every leg count above is read from a committed results file).
