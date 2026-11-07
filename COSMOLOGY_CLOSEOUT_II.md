# Cosmology II closeout (Prompt 260)

A documentation-only closeout. Prompt 260 asks for three connecting investigations (the pillars, the Hubble tension measured, how far we can
see), a restructured Cosmology sequence, alignment rows for chapters 28 and 29, an extended upper-level package, topic pages and a cohesion
check over what Prompts 255 to 259 shipped. What 255 to 259 shipped is kernels, contracts, validators, oracles and gate records, each with legs
that failed or were not run, and no lesson, panel, viewer, pack or Library entry for a student. Carl's rulings of 2026-11-05 to 2026-11-07
(`DECISIONS_2026-11-05.md`, `DECISIONS_2026-11-06.md` and `DECISIONS_2026-11-07.md`, outside the repository) hold the consumers rule: no
go-ahead for a panel, lesson, viewer or contour until a consumer is released. Two of the three connecting investigations would be built on
nothing and the third rests on a released consumer and a rights decision that do not exist, so this prompt builds none of them. It runs the
parts of the contract that apply, states what a student can and cannot do in cosmology today, and records for each closeout item whether it is
done, not applicable or blocked, and why.

Nothing here changes a shipped step, a lesson, a page, a pack, a ceiling or a bound. No published number or licence term is typed, nothing was
fetched and no code was run. The Spanish text of the shipped cosmology items stays unreviewed by a fluent reader; that is a permanent fact of
the project (Carl, 2026-11-07), stated here once and not carried as a pending item.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at 7bf95b8f (Merge #565), the head of the train when this branch was cut; the push CI of that SHA completed success. `INTEGRATION.md` names `v3` as the target of every Roadmap III pull request, whatever its class. |
| Tranche | T5 (prompts 255 to 267) is authorized by D-R10-254-01, the record of Continuation checkpoint V (`CONTINUATION_CHECKPOINT_V.md`, outside the repository): CONTINUE AS PLANNED. The row is DELEGATED, not ratified. |
| Hard prerequisite (Appendix C: 255) | Landed on `v3` as #550, with its follow-up #551 and its leg B6 as #554. It landed a kernel and no consumer. |
| Optional enrichments (Appendix C: 256, 257, 258, 259) | All four landed as gate pull requests (#552 and #553; #556 and #557; #558; #559). None landed a consumer. |
| Gate outcomes that change 260 (Appendix C) | 256, 257 and 258 returned a kernel-level C or a failing follow-up, so The pillars omits supernovae, BAO and the CMB; 259's C names a reading step. Below. |
| Exists elsewhere | No branch or pull request builds any 260 deliverable. The open pull requests are #538 (test temporary directories) and two dependency updates; the parallel Prompt 266 session works on a different lane. |
| Decision register | Every gate verdict it lists was read and is treated as binding: the D-R10-255 rows, the D-R10-256 to D-R10-259 rows and D-R10-254-01. |

## What landed in 255 to 259

All the kernel code is under `js/kernels/cosmology/late/` and is `NEVER_PRECACHED`, imported by no shipped module and not re-exported by the
cosmology index. The prototypes of 256 to 259 stay on spike branches that are never merged, so the tree holds their contracts, fixtures,
validators' pinned results and documents and no code of theirs. Every figure below is read from the committed `results.json` files and the
register, not from a handoff. A failed leg stays failing and labelled; only Carl resets a bound.

| Prompt | Landed as | Student-facing | Rows: pass / fail / not run (reported) | Failed and not-run legs, by id | Verdict by the committed function |
| --- | --- | --- | --- | --- | --- |
| 255 late-time FLRW kernel (`COSMOLOGY_II.md`) | #550 | none | 28: 22 / 4 / 1 (1 reported) | fail A7, B1, B3, F3; not run B6 | kernel C; product NOT ESTABLISHED |
| 255b follow-up legs | #551 | none | 4 new legs, 4 pass | A7b, B1b, B3b, F3b all pass; the old four stay failing | follow-up kernel A; the original C stays on record |
| 255 leg B6, the published ages | #554 | none | 3 legs, 3 pass | the literal one-unit reading fails for the Planck leg (1.35 units) and is reported beside it | age-only B6: C in the original form, A in the follow-up form; consumers clause met on the letter in the follow-up form |
| 256 supernova likelihood, Part A | #552 | none | 58: 50 / 0 / 3 (5 reported) | not run B10.cited, E3.published, X3.fullCovariance | A, narrow: the decided likelihood is computed correctly; no published contour is compared |
| 256 follow-up (published value and the release's covariance) | #553 | none | 58: 31 / 17 / 1 (9 reported) | 17 fail: I2, I4a, I4b, I4d; Q1 to Q5 of the split form; seven Q rows of the T2 projections; W1 of the T1 subset at n = 100; not run X1 | FC (FC' under AM1; FB'' under AM2, which is proposed and not ratified) |
| 257 BAO, Part A | #556 | none | 44: 27 / 2 / 10 (4 reported, 1 omitted) | fail E5 and D6 (the peak is not detectable at the pack's size); not run P1, P2, F1 to F5, O1 to O3 | C (kernel fail on E5) |
| 257 follow-up (authentic legs) | #557 | none | 19: 9 / 5 / 2 (3 reported) | fail F1, F2, F5, P2, F1b; not run O2, O3; E5 stays failing | C |
| 258 CMB angular scale, Part A | #558 | none | 42: 25 / 5 / 8 (4 reported) | fail B5, E1, E2, E6a, E6b; not run S1 to S4, G1, F1, F2, C1 | C |
| 259 structure growth, Part A | #559 | none | 31: 22 / 2 / 3 (3 reported, 1 omitted) | fail C1 (2.017 percent against a 2 percent design bound) and R2 (one genuine bounce in the grid); not run C2, C3, P6 | C |

What the kernel and the gates support, and nothing beyond it. The late-time kernel agrees with astropy and with an independent scipy
quadrature to better than 1e-13 on ten parameter sets and with its closed forms; the three published ages (Planck 2018 VI best fit, two
empty-universe values) agree within their committed tolerances, none of which tests a distance. The supernova likelihood is computed correctly,
but the decided split covariance form is inadequate as a stand-in for the release's covariance (the pack's `mu_err` is not the diagonal of the
release's covariance), and no tau reproduces the release's width. The BAO ruler's integral is verified and the cited fitting formulas fail
their committed domain and accuracy rows; the peak is not detectable at the pack's size. The CMB relation is numerically verified and the peak
fit's intervals do not cover. The growth factor equals three independent closed forms and a numerical solution, with two committed rows
failing. None of this is a statement a student can reach, and no public claim rests on it (`kernel-cosmology-late` and `cosmology-gates-ii`
in `tools/evidence-status.json` record the limits).

## What a student can and cannot do in cosmology today

Available, and unchanged by this pull request: the Roadmap II cosmology work. The Expanding Universe, Standard Candles, The Shape of Expansion
and Where Galaxies Live, in the sequence `galaxies-and-the-universe` and in the Cosmology unit of the `upper-level-modules` course package;
their instruments (the Hubble law, the Hubble diagram, the redshift wedge) over the original kernel `js/kernels/cosmology/flrw.js`, flat and
open Lambda-CDM with the radiation, w, curvature and domain limits `COSMOLOGY.md` states; the Hubble-constant step of The First Rung; the
Hubble 1929, DES-SN5YR, SDSS redshift-slice and Pantheon+ data packs (the last with no instrument reading it).

Not available: any investigation, panel, viewer, contour or Library entry that uses radiation, a constant-w dark energy, a closed universe,
the transition redshift, a horizon, the supernova likelihood, the BAO ruler, the CMB angular scale or the growth factor; any statement of a
Hubble tension as a number of standard deviations; any sound-horizon or acoustic-scale value. The kernels run in tests and in the validation
suite; a student cannot reach them. No page, label or claim says otherwise, and none should be added until the matching consumer ships
(7.5 rule 12). The phrase "Hubble tension" appears nowhere in the tree.

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1a "The pillars" | BLOCKED | its three constraints are all gated out: supernovae (256: A narrow, then FC against the release's covariance; Appendix C's consequence is that The pillars omits them), BAO (257: C twice) and the CMB (258: C). With no pillar there is no overlap to read, no "degenerate alone" step and no plot; the reading step for a gated-out pillar presupposes the investigation around it. 259's growth is not a pillar of the prompt and also returned C. |
| 1b "The Hubble tension, measured" | BLOCKED | needs a cited early-universe value under a recorded data-rights decision for redistribution in a lesson (7.5 rule 4: exact product and version, terms as read, basis accepted, transformation, attribution, fallback). The printed Planck 2018 values in `tests/fixtures/cosmology2/authentic/` rest on D-R10-255-11, which covers numbers and cited facts transcribed for a test fixture and not a lesson. The ladder side exists in the shipped lessons, and the sigma statement needs the covariance assumption stated, but no instrument, grader or step for the comparison exists, and the first step is a rights decision that is Carl's to rule on. No verdict is offered either way (the prompt's own rule). |
| 1c "How far can we see?" | BLOCKED | the horizon, lookback time and age in one calculation is the consumer of 255's late-time kernel (the original kernel has lookback and age but no horizon and no radiation). 255's product verdict is NOT ESTABLISHED in the original form and A (age-only B6) in the follow-up form; D-R10-255-10 leaves whether an age-only B6 satisfies the contract, and the release of the consumer, to Carl. |
| 2 Sequence "Cosmology" in survey, majors and upper tiers | NOT CREATED | see below |
| 3 Alignment rows for chapters 28 and 29; the curriculum map | no new rows | below |
| 3 Upper-level package extended | NOT CHANGED | below; a changed item is visible and there is no new item to add |
| 4 Topic pages, related and next links, recommended starts | checked, nothing to add | below |
| 5a The cohesion check (9.4) | DONE | below |
| 5b The content acceptance sheet (8.4) | N/A for new items; the four shipped investigations are unchanged | below |
| 5c Evidence-status rows | DONE | two V-internal rows (`kernel-cosmology-late`, `cosmology-gates-ii`), status partial and UNKNOWN, limitations naming every failing and not-run leg; no public claim made or changed |
| 5d The data budget's ledger | DONE | below; nothing added or changed |
| 5e Generated artifacts regenerated | DONE | the evidence-status page, the documents map, the tools index and the counts a documentation change moves; nothing else changed |
| Tests | DONE | listed in the pull request; axe, lesson validators, headless grading and e2e walks are not run because no page, lesson, panel or e2e spec changed |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies to the student-facing unit: it is **NOT READY, not built**
(items 1 to 4). The cohesion check passes because this pull request changes no surface; it is not evidence that the unit would pass.

### The Appendix C consequences applied

| Gate | Verdict | Consequence for 260 |
| --- | --- | --- |
| 256 | A narrow, then FC | The pillars omits supernovae; the existing line fit of The Shape of Expansion stands; 257's combination is omitted. |
| 257 | C | The pillars omits BAO. |
| 258 | C | The pillars omits the CMB; the relation alone as a reading step is not built (no consumer). |
| 259 | C | A reading step for growth, and none is built; no growth appears in any item. |
| 255 | kernel C, follow-up A, age-only B6 A in the follow-up form | The hard prerequisite of 260 landed; its consumer is held. |

No failed leg was re-labelled and no bound moved. 256's AM2 is proposed and not ratified: it is evidence, not permission.

### Sequence "Cosmology": not created

The existing cosmology investigations are already placed. `galaxies-and-the-universe` orders them (The Expanding Universe, then Standard
Candles, The Shape of Expansion, Where Galaxies Live), each with its prerequisite, and the three course levels read them through
`astronomy-semester`, `stellar-astrophysics` and `upper-level-modules`, whose Cosmology unit holds the same four. A new sequence would hold the
same items, could hold none of the gated-out ones (a sequence holds lessons only), would add a Library choice for no new content, and
`tests/curriculumSequences.test.js` fixes the set of sequences. "Survey, majors and upper tiers with the new depths" has no new depth to
order: the depths the four investigations have are unchanged. A path without content is not a unit.

### Alignment rows for chapters 28 and 29

| Chapter (title as `tools/library-curation.json` has it) | Items that carry it now | Rows added |
| --- | --- | --- |
| 28, The Evolution and Distribution of Galaxies | Missing Mass (28.4), Where Galaxies Live | none: already aligned |
| 29, The Big Bang | The Shape of Expansion | none: already aligned |

A row is a claim that the investigation supports the chapter, and the instructors' adoption pages state it. There is nothing new to state: the
Big Bang chapter's remaining ground (the early universe, the microwave background, nucleosynthesis, the age and the horizon) has no shipped
investigation, and a row that named an item that does not exist would be a false claim.

### The upper-level package

Unchanged. `upper-level-modules` keeps its Cosmology unit as it stands. A reading step in the style of the Galactic and extragalactic closeouts
(one step naming chapters 28 and 29 and the pillars that have no investigation, English and Spanish) is possible and is a visible change; it is
not made here, because it would state in student-facing text the absence of items whose consumers Carl has not released, and it would add
Spanish text no one will read. Question 3.

### Topic pages, related and next links, recommended starts

Checked against `library/library.json`: the four cosmology investigations are in the Galaxies topic and in `galaxies-and-the-universe`, each has
prerequisite, next and related links, an adoption page and search entries. A recommended start is one of four fixed starts and a new content
item does not become one. Nothing was added.

## The cohesion check (section 9.4), recorded

Run against `v3` 7bf95b8f with this pull request's tree (documentation, one data file and a generated page). An internal inspection, not
evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass: nothing changed; `npm run navigation:check` and `npm run surface:check` pass and every committed navigation ceiling is met as at the base |
| No new kind, term or filter without a register row | pass: none added |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | not applicable: no new item; the kernels are deliberately undiscoverable |
| No duplicated terminology | pass: no label or glossary entry added; the glossary-consistency test passes |
| Default choice counts not substantially increased | pass: unchanged |
| Structural navigation checks green | pass: `tests/navigationChecks.test.js`, `tests/surfaceGate.test.js` and the library, relations, sequence and course-pack suites pass on Node 22 |

## The content acceptance sheet (8.4)

No investigation or guide is shipped, so no new sheet exists. The four shipped cosmology investigations are untouched and their audit in
`EXTRAGALACTIC_CLOSEOUT.md` stands; no step of theirs changed. For the three that were not built, what the sheet will need on the day is
already fixed by the gates: a prediction recorded before the overlap is shown (The pillars); the covariance assumption stated beside the
number of sigma, with the decided split form named as a design size and not the release's covariance (The Hubble tension, measured); and the
radiation approximation and the domain refusals stated beside every horizon value (How far can we see?).

## The data budget's ledger

No pack, sidecar or data file is added or changed by this prompt. The fixtures of 255 to 259 (about 2.4 MB of JSON and text in all, none shipped) are
test files and are not in any budget. `npm run budget:data`, `npm run budget:composition` and `npm run budget:routes` pass. Deferred
JavaScript, measured on a Node 22.23.4 build of this branch over v3 7bf95b8f, is unchanged by a Markdown, JSON-record and generated-page
change: 3,165,262 bytes gzipped (3091.1 KB) against a committed ceiling of 3091.2 KB, the initial download 801.7 KB of 830.0, the first-visit precache and the packs unchanged. No ceiling is
raised.

## What would unlock each blocked item

The order follows the prerequisites, not importance.

1. A go-ahead from Carl for the matching consumer (the consumers rule). Without it nothing below is built. The least blocked is 1c: it needs
   only 255's late-time kernel, whose follow-up verdict is A and whose age-only B6 passes, and Carl's ruling that an age-only B6 satisfies the
   contract (D-R10-255-10).
2. For 1b, a data-rights decision for one early-universe value and its uncertainty as a cited fact (per source and per redistribution form),
   which Carl rules on, plus a decision on how the covariance assumption behind a number of sigma is stated. The values themselves are public
   and may be fetched into `scratch-data/` with terms and sha256 recorded.
3. For 1a, at least two pillars that return A or B: the cited requests in `SN_LIKELIHOOD_GATE.md` (section 10.8), `BAO_GATE.md` (10.5),
   `CMB_SCALE_GATE.md` (section 7: S1, F2 are public data; G1 and X1 need a Boltzmann code run, which needs Carl's permission) and
   `GROWTH_GATE.md` (section 7). Each is a new leg with its bound committed first; a bound is never moved after its result.
4. Then the consumer, then the investigations in the order the prompt lists them, then the sequence, the alignment rows and the topic page.
   A re-run of this prompt is only meaningful after 1 and 2 for at least two of the three.

## Questions for Carl

1. Is the documentation-only reading of 260 right (kernels and gates exist, no consumers, so a record and not an unlock)? Recommendation: yes.
2. Release 255's late-time kernel as the consumer of "How far can we see?" (and does an age-only B6 satisfy the contract's B6)? Recommendation:
   wait until a student-facing cosmology piece is wanted; it is the cheapest of the three.
3. Add a reading step to the Cosmology unit of `upper-level-modules` (as the Galactic and extragalactic closeouts did), saying that the
   pillars, the Hubble tension and the horizon have no investigation? Recommendation: no, until one of them ships.
4. Rule on a rights basis for a cited early-universe Hubble-constant value and a ladder value, so that "The Hubble tension, measured" has a
   first step? Recommendation: wait.
5. Ratify the DELEGATED rows D-R10-260-01 to 260-04, or say which to change.

## Not done, on purpose

- No investigation, lesson, panel, viewer mode, pack, Library entry, sequence, topic page, alignment row, course item or reading step.
- No instructor materials, no Spanish strings, no instructor bundle rebuild (the queue owns it), no passphrase.
- No ceiling change, no `.github` edit, no bound moved, no failed leg re-labelled, no data fetched, no code run, no published number typed.
