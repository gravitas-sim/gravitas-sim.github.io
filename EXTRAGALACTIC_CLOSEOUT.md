# Extragalactic and interstellar-medium investigations, sequence, package and cohesion closeout (Prompt 253)

A closeout run honestly against what Prompts 247 to 252 landed. Prompt 253 asks for five connecting investigations (a galaxy's colour
and its stars, the Local Group, large-scale structure, dust in galaxies, from a nebula to a galaxy), a sequence, alignment rows for
chapters 20, 26, 27 and 28, an extended upper-level package, topic pages and the cohesion check. What 247 to 252 shipped for a student
is **nothing**: each is a kernel with its validation record, and two are gates with no result. No panel, lesson, viewer mode, pack or
Library entry came out of them. Carl's rulings of 2026-11-05 and 2026-11-06 (`DECISIONS_2026-11-05.md` and
`DECISIONS_2026-11-06.md`, outside the repository) hold the **consumers rule** for every one of these kernels: no panel, lesson, viewer
or synthetic-spectrum view is built on a kernel whose gate has not passed its consumers condition. The connecting investigations would
join those kernels, or need files nobody has fetched, so this prompt builds none of them.

It does the parts that apply: the record of what landed, each closeout item as done, not applicable or blocked with its reason, the one
course-package change the existing content supports (a reading step), the cohesion check, the acceptance audit of the extragalactic
investigations that were already shipped, an evidence-status row for them, the data ledger, the register rows and the regeneration.

Nothing here changes a shipped step, a lesson, a page or a bound. No published number or licence term is typed from memory, nothing was
fetched, and every failed leg stays failing and labelled.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at 64b2611a (Merge #546). Its push CI (run 42243713508) was queued when this branch was cut; the previous tip's (ac65da0e) completed success. |
| Tranche | T4 (prompts 233 to 254) is authorized by D-R10-232-01, the record of Continuation checkpoint IV (CONTINUE AS PLANNED). The row is DELEGATED, not ratified. |
| Hard prerequisites (Appendix C: 247, 248, 249, 250, 251, 252) | All six landed on `v3` (table below). The optional enrichments were absent or gated, and are not invented. |
| Gate outcomes that change 253 (Appendix C) | 247's Part B gate has no verdict (every leg NOT RUN): the effective state is C, and "From a nebula to a galaxy" uses the line tools only. 263's two-point statistic has not run, so "Large-scale structure" stays at counts in cells. 249's Part B and 252's Part B have no verdict. 251's Part B returned C. |
| Exists elsewhere | No open branch or pull request builds any 253 deliverable. The open pull requests are #538 (test temporary directories) and two dependency updates. |
| Decision register | Every gate verdict was read and is treated as binding: D-R10-247-01 to -05, 248-01 to -09, 249-01 to -05, 250-01 to -08, 251-01 to -06, 252-01 to -10. |

## What landed in 247 to 252

Read from each kernel's committed `results.json` (and follow-up results) and `failed-legs.json`, not from a handoff. A failed leg stays
failing and labelled; only Carl resets a bound.

| Prompt | Landed as | Student-facing | Legs: pass / fail / reported / not run | Failing and not-run legs, by id | Verdict as recorded |
| --- | --- | --- | --- | --- | --- |
| 247 Interstellar medium | Part A kernel #529; Part B gate | none | 31 / 0 / 3 / 3 | not run: B6 (the cited toolkit), E1 (an authentic nebula), E2 (an authentic star's sodium) | no failing leg; Part B (plasma diagnostics): no verdict, six legs NOT RUN for want of atomic data and an independent pipeline |
| 248 Galaxy spectra | kernel #532; follow-up #533 | none | 18 / 4 / 5 / 3 | fail C2 (line-method coverage, conservative), D2 (a committed-contract error: the break of a flat F_lambda spectrum is not 1), D2b (a wrong committed expectation), D3 (a mismatched template read as a good redshift in 10.5 percent of worlds); not run B5, E1, E2 | D3b, the new refusal leg, passes; the failed D3 stays on record; consumers held |
| 249 Galaxy morphology | Part A kernel #535; Part B gate | none | 15 / 6 / 3 / 10 | fail A2, A4, A7, B2, C1, D1b; not run E1 to E3 (authentic) and G1 to G7 (Part B) | no committed verdict function for Part A; Part B: thresholds committed, no leg run |
| 250 Galaxy clusters | kernel #542; follow-up #544 | none | 27 / 3 / 8 / 4, then 6 / 2 / 3 / 0 | fail C1b, C4, D3, then C4b, D3b; not run E1 to E4 (no table) | kernel verdict **B**; follow-up verdict B; product NOT ESTABLISHED; consumers held |
| 251 Lensing II | Part A kernel #537; Part B result #540 | none | 22 / 1 / 3 / 13 (Part A and Part B legs run in the tree) | fail P2 (finite-source magnification at tiny rho); not run B6, E1 to E3, G6, G9; spike: G3, G7, G8 fail | Part A kernel verdict **A**, product NOT ESTABLISHED; Part B verdict **C** |
| 252 Active galactic nuclei | kernel #536; follow-up #539 | none | 20 / 5 / 4 / 12, then 0 / 5 / 2 / 0 | fail A7, B3, B6, C1, D2, then A7b, B3b, C1b, C1c, D2b; not run B7, E1 to E4, G1 to G7 | no verdict function for the kernel; Part B (luminosity function): no verdict, all seven legs NOT RUN, effective state C |

No shipped investigation, course package, data pack or Library entry changed in this range (`git log` over those paths from the 247 merge
to this base shows only regeneration commits and Prompt 238's package change). Carl's rulings bear on it: the consumers rule held for all
six kernels; failed legs stay failing; D3 of 248, C4, D3 and the weak-cluster refusal of 250, and A7, B3, C1, D2 of 252 each got **new**
legs committed first, never a moved bound; 251's P2 stays failing with no looser bound; 247 and 252's lensing, plasma and luminosity
gates wait for files that Carl fetches.

## What a student can and cannot do today

Available, and unchanged by this pull request: the investigations the extragalactic path already had, in `galaxies-and-the-universe` in
their order (The Expanding Universe, Standard Candles, The Shape of Expansion and Where Galaxies Live, after the distance-ladder and
lensing items), Missing Mass, Einstein Rings and Arcs, the redshift-wedge, Hubble-law and expansion-diagram instruments, the scenarios
that show galaxies, clusters and quasars as simulations, and the data packs listed in the ledger below.

Not available: any investigation, panel or viewer for emission-line and absorption-line identification and equivalent widths, the Balmer
decrement and reddening, plasma diagnostics, a galaxy's redshift from its spectrum, the 4000-angstrom break, galaxy shapes, sizes or
colours measured on an image, cluster dispersions and virial masses, the mass inside an Einstein radius, lensing delays, quasar
spectra, Eddington ratios, BPT classes or a luminosity function. The kernels run in tests and in the validation suite; a student cannot
reach them. No page, label or claim says otherwise.

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1a "A galaxy's colour and its stars" | BLOCKED | needs 249's photometry and 248's D4000 across four galaxies. 249 has six failing legs, no authentic leg run and no image pack, and 248 has four failing legs and no galaxy spectrum; the only galaxy data in the tree is the redshift slice, whose columns are right ascension and redshift, with no magnitude or colour. Both kernels' consumers are held. |
| 1b "The Local Group" | BLOCKED | needs distances and motions from a public table under a recorded rights decision (none fetched) and a timing-argument mass as a cited bounded estimate (its inputs are cited published values, which may not be typed from memory; no timing-argument tool exists). The in-tree 1929 table lists a few nearby galaxies, with distances Hubble's calibration made about seven times too small (stated in its pack record): a historical record, not a Local Group table. The Local Group is named in the package's reading step below. |
| 1c "Large-scale structure" | NOT BUILT, shipped content already covers survey and majors | Where Galaxies Live is that investigation: a 2,911-galaxy SDSS redshift strip, counts in cells against a random scatter, and the flux-limit thinning as selection. The new content the prompt names, counts in cells **with Poisson intervals**, has its tool (`js/kernels/statistics/intervals.js`, the exact Garwood interval) and no held-kernel consumer. It is not built because the instrument reports the variance-to-mean ratio with no interval, so it means either changing a shipped step and instrument, or a second investigation on the same strip that would duplicate the first. Question 2. 263's two-point statistic has not run (Appendix C). |
| 1d "Dust in galaxies" | BLOCKED | needs 247's reddening applied to 249's colours. 247's colour-excess leg passes, but its consumers are held, no viewer overlay exists and no authentic spectrum was run; 249's colour legs include a failing sign leg (A4, with A4b passing) and no image exists. Two held consumers and no data. |
| 1e "From a nebula to a galaxy" | BLOCKED | Appendix C makes the line tools alone the content (247's plasma gate has no verdict). The line tools pass their synthetic legs, but the spectra viewer's overlay and equivalent-width tool are not built (consumers rule held), no integrated galaxy spectrum is in the tree (the SDSS spectra pack holds stars), and E1, E2 are NOT RUN. Their limits are recorded for the day it is built: a saturated doublet and an unresolved single line are refused by code, and the in-tree spectra are too coarse for a sodium column (`ISM.md`). |
| 2 Sequence "Galaxies and what lies between" | NOT CREATED | see below |
| 3 Alignment rows for chapters 20, 26, 27, 28; the curriculum map | no new rows | below |
| 3 Upper-level modules package extended | DONE (visible) | 1.3.0 to 1.4.0, one reading step, below |
| 4 Topic pages, related and next links, recommended starts | checked, nothing to add | below |
| 5a The cohesion check (9.4) | DONE | below |
| 5b The content acceptance sheet (8.4) | DONE for the extragalactic investigations that are shipped | below; no new investigation exists to hold another |
| 5c Evidence-status rows | DONE | one row, `cosmology-investigations-recomputed`; no public claim was made or changed for 247 to 252 |
| 5d The data budget's ledger | DONE | below; nothing added or changed |
| 5e Generated artifacts regenerated | DONE | the Library and its search index, the service-worker manifest, the documents map, the evidence-status page, the tools index, the counts a change moves |
| Tests | DONE | listed in the pull request; the e2e walks, axe and lesson validators are not run because no page, lesson, panel or e2e spec changed (the course page was checked in a browser once) |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies to the connecting investigations: they are **not
built**, so the extragalactic and interstellar unit is **NOT READY** as the roadmap defines it. The investigations that were already
shipped pass the cohesion check, and the acceptance audit below records where they fall short of 8.4.

### Sequence "Galaxies and what lies between": not created

The existing extragalactic investigations are already placed. `galaxies-and-the-universe` orders them (The Expanding Universe, then
Standard Candles, The Shape of Expansion, Where Galaxies Live; Missing Mass, Bending Light, Einstein Rings and Arcs before them), each
with its prerequisite, and the three course levels (survey, majors, upper) already read them through `astronomy-semester`,
`stellar-astrophysics` and `upper-level-modules`. A new sequence would hold the same items, could hold none of the gated-out items (a
sequence holds lessons only; reading steps live in the course package, where the mechanism exists), would add a Library choice for no
new content, and `tests/curriculumSequences.test.js` fixes the set of sequences. A path without content is not a unit.

### Alignment rows for chapters 20, 26, 27 and 28

| Chapter (title as the tree's `tools/library-curation.json` has it) | Items that carry it now | Rows added |
| --- | --- | --- |
| 20, Between the Stars: Gas and Dust in Space | `the-clock-that-drifts` only (a transit-timing investigation; see question 5) | none: no shipped item is about the gas between the stars |
| 26, Galaxies | The Expanding Universe, Standard Candles | none: already aligned |
| 27, Active Galaxies, Quasars, and Supermassive Black Holes | none | none: no shipped item is about active nuclei (252 is a kernel) |
| 28, The Evolution and Distribution of Galaxies | Missing Mass, Where Galaxies Live | none: already aligned |

A row is a claim that the investigation supports the chapter, and the instructors' adoption pages state it. There is nothing new to
state for 20 and 27, and 26 and 28 are carried by the same items as before.

### The upper-level package

`upper-level-modules` 1.3.0 to 1.4.0, the cosmology unit:

- **A reading step**, `not-yet-the-gas-and-the-galaxies`: Astronomy 2e chapters 20, 26, 27 and 28 (CC BY 4.0, the same citation the other
  packages use), whose student note says what has no investigation (the gas and dust between the stars, a galaxy's colour and its stars,
  dust in a galaxy, the Local Group, galaxy shapes, clusters of galaxies, active nuclei) and why in plain words, and whose teacher note
  gives each missing item's reason as recorded and names the investigations that do exist. The chapters are named by number only; no
  claim is made about which sections cover which topic. English and Spanish; the Spanish unreviewed by a fluent reader, like the rest.
- The package stays UNVALIDATED as a course: no instructor has run it, no learning is measured, and no cartridge of it has been opened in
  a learning-management system by anyone outside the project. It validates against the schema and audits clean (`tests/coursePack.test.js`,
  `tests/curriculumSequences.test.js`, `tests/commonCartridge.test.js`, `tests/formatSchemasCourse.test.js`). The change touches no
  deferred chunk. No other course changed; the reading step is not added to `astronomy-semester` (question 4).

### Topic pages, related and next links, recommended starts

Checked against `library/library.json`: the six extragalactic investigations are in the Galaxies topic and in `galaxies-and-the-universe`,
each has prerequisite, next and related links (Standard Candles and Where Galaxies Live next to the first rung and Leavitt's law; Where
Galaxies Live to the selection-effects investigations; Missing Mass to Bending Light and The Expanding Universe; Einstein Rings and Arcs
to the lensing items and three course packages), an adoption page, and search entries. A recommended start is one of four fixed starts and
a new content item does not become one. Nothing was added.

## The content acceptance sheet (8.4), for the extragalactic investigations that are shipped

Read from the investigation sources (`js/data/investigations/`, the depth files) and `docs/lesson-acceptance.json`; held by
`tests/cosmologyInvestigations.test.js`, `tests/darkMatter.test.js` and `tests/lensingInvestigations.test.js`. This audit records fact and changes nothing.

| Requirement | The Expanding Universe, Standard Candles, The Shape of Expansion, Where Galaxies Live | Missing Mass, Einstein Rings and Arcs |
| --- | --- | --- |
| Objective at survey depth, quantitative and inferential forms deeper | four objectives each; quantitative and advanced depth steps | eight and five objectives; both depths present |
| A specific misconception | misconception feedback on one or two steps each | feedback on four steps (Missing Mass) and one (Einstein Rings) |
| A prediction recorded before the answer is revealed | `predict-the-slope`, `predict-a-calibration-error`, `predict-matter-only`, `predict-the-clumping` and `predict-the-thinning` (each predict with a reveal) | `now-a-galaxy` (predict with reveal), `predict-the-ring` |
| The measurement and its uncertainty | measured fields are graded; the deeper steps treat the fit's error (`the-slopes-error`, `a-five-percent-gap`, `how-many-sigma-is-0-3`), **but Where Galaxies Live reports the variance-to-mean ratio with no interval** | measured fields graded; the halo fit's uncertainty at the quantitative depth |
| A competing explanation, withheld transfer case or misspecified example | `does-it-need-the-origin`, `the-degeneracy`, `why-it-changes`, `why-it-thins` (structure against selection) | `which-arrangement-gives-a-flat`, `why-arcs` |
| A brief reflection | partly: each ends on a read summary, `what-you-worked-out` | partly: the same |
| The instructor's key and rubric criteria | a guide, a flow, expectations and time bands exist for each (generated; the bundle is the queue's) | the same |
| The upper depth's limits rather than more controls | `the-slopes-error`, `the-calibration-for-one-percent`, `what-the-interval-leaves-out`; **Where Galaxies Live's advanced steps are calculations about brightness and magnitude, not the limits of the clustering statistic** | `why-not-report-one-number`, `what-would-tell-them-apart`; `the-speed-spread` |
| English and Spanish | the Spanish carries the same step structure (machine-checked) | the same |
| Evidence status | `cosmology-investigations-recomputed` (new row, V-internal) | not part of that row (Missing Mass and Einstein Rings have their own suites, `tests/darkMatter.test.js` and `tests/lensingInvestigations.test.js`, and carry no evidence row) |

Two requirements are met only in part, both in shipped steps, both Carl's to ask about (questions 2 and 3): the missing interval on the
clustering ratio, and the survey depth's reflection being a summary read step and not a prompted one.

## The cohesion check (section 9.4), recorded

Run against `v3` 64b2611a with this pull request's tree. An internal inspection, not evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass: nothing in them changed; every committed navigation ceiling is met as at the base |
| No new kind, term or filter without a register row | pass: none added (the reading step is a course-pack item of a kind the packages already use) |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | pass: there is no new investigation or tool; the one new item is a package reading step, reached through the package that holds it. The shipped extragalactic investigations stay reachable as above |
| No duplicated terminology | pass: no label or glossary entry added; the glossary-consistency test passes |
| Default choice counts not substantially increased | pass: unchanged |
| Structural navigation checks green | pass: `npm run navigation:check`, `npm run surface:check`, `tests/navigationChecks.test.js`, `tests/surfaceGate.test.js` and the library, relations, sequence and course-pack suites pass on Node 22 |

The check passes because the one visible change is a course package's reading step. It is not evidence that the connecting investigations
would pass.

## The data budget's ledger

No pack, sidecar or data file is added or changed. The extragalactic material in the tree, from the pack manifests (sizes are the
manifests'): `sdss-dr18-redshift-slice` (6,638 bytes; public domain by SDSS's image-use policy, read 2026-10-09; right ascension and
redshift only), `sdss-dr18-stellar-spectra` (16,944; public domain, stars only), `hubble-1929-table1` (5,996; public domain by date),
`shoes-r22-cepheids` (6,152; CC BY 4.0 by the publisher page), `des-sn5yr-hd` (6,930; CC BY 4.0 by the Zenodo record),
`pantheon-plus-hd` (no licence stated, credited, its own recorded decision), `milky-way-rotation-curve` (no licence stated, credited),
`coma-cluster-quoted` (5,324; Gravitas's own record, CC BY 4.0), `ngc3198-synthetic-curve` (Gravitas's own synthetic data). The ISM and
AGN kernels' line and extinction tables are the radiation packs (`radiation-lines`, NIST, public domain; `radiation-extinction`, a
published law's coefficients, cited). `npm run budget:data` on a Node 22.23.4 build of this branch: packs 355,282 of 355,282 bytes raw
(no room), packs gzip 111,422 of 111,422, first-visit precache 5,364,855 of 5,365,197, idle precache 1,610,681 of 1,610,682 (1 byte of
room), IndexedDB and cache 18,508,011 of 209,715,200. No ceiling is raised. The idle tier's room is one byte: any change to
`library/library.json` that adds text will overrun it, and the raise is then the measured overrun under the standing approval.

## What would unlock each blocked item

The order follows the prerequisites, not importance.

1. A go-ahead from Carl for the matching consumer (the consumers rule). Without it nothing below is built.
2. Files and terms only Carl fetches (none was fetched here; each leg that needs one stays NOT RUN):
   - **Four galaxies' integrated spectra and images** (for 1a, 1d, 1e): SDSS spectra and images of four well-separated galaxy types
     (an elliptical, a spiral, a star-forming and an active one), the terms read with a retrieval date. The galaxy image pack is
     `GALAXY_MORPHOLOGY.md`'s request and the galaxy spectra are `GALAXY_SPECTRA.md`'s (legs E1, E2).
   - **A Local Group table** (for 1b): a published table of the distances and radial velocities of the Local Group's galaxies, one
     source, the terms read, its distance method named. A candidate is a VizieR dwarf-galaxy compilation; this session has not verified
     that it exists in that form. The timing argument's inputs (the Andromeda galaxy's approach speed and distance) come from it, with
     their stated errors, and nothing is typed from memory.
   - The atomic data and the independent pipeline of `PLASMA_DIAGNOSTICS_GATE.md`; the SDSS quasar subset, completeness document,
     K-correction source and published luminosity function of `AGN_LUMINOSITY_FUNCTION_GATE.md`; the Coma table and cited analysis of
     `GALAXY_CLUSTERS.md`; the cluster and delay files of `LENSING_II.md` and `LENSING_DELAYS_GATE.md`.
3. New legs for the failing ones, committed before any run, as Carl ruled for 248, 250 and 252: 249's A2, A7, B2, C1 and D1b (A4 has
   its A4b), 251's P2, and the remainder of 252's. A bound is never moved after its result.
4. Then the consumer, then the connecting investigations in the order the prompt lists them, then the sequence, the alignment rows (20 and
   27 only when an item exists for them) and the topic page. A re-run of this prompt is only meaningful after 1 and 2 for at least two
   of the five.

## Questions for Carl

1. Is the shape of this run right: a reading step for the package and a record for the rest, rather than any connecting investigation
   built on held or missing material? Recommendation: yes.
2. Counts in cells with Poisson intervals: its tool exists and nothing holds it back, but building it either changes Where Galaxies
   Live's instrument and steps (a shipped step) or duplicates the investigation. Add an interval readout to the existing instrument as
   a separate prompt, or leave the shipped investigation? Recommendation: a separate small prompt that adds an optional interval
   readout and one advanced step, with your go-ahead to change that shipped investigation.
3. Should the survey depth of the four cosmology investigations end on a prompted reflection? A shipped step, so yours to ask for.
4. Add the reading step to `astronomy-semester`'s galaxies unit too, or keep it in the upper-level package only? Recommendation: leave
   as is until an instructor asks; each is a visible change to a different audience.
5. `the-clock-that-drifts` (transit-timing variations) is aligned to chapter 20, whose title is the gas and dust between the stars, and
   exoplanets are in chapter 21 of the list in `tools/library-curation.json`. It was not changed here (shipped metadata, and
   regenerating the adoption pages and the alignment page is a visible change). Change it to 21, or is chapter 20 deliberate?
6. Which consumer, if any, is released first? The least blocked: 247's line tools on its synthetic worlds (no failing leg, no file
   needed; the sodium and Balmer investigations were planned that way), or 251's Part A (verdict A, the mass inside an Einstein circle,
   an extension to Einstein Rings and Arcs). Both need your go-ahead; neither is built.
7. Ratify the DELEGATED rows D-R10-253-01 to 253-05, or say which to change.

## Not done, on purpose

- No investigation, lesson, panel, viewer mode, pack, Library entry, sequence, topic page or alignment row.
- No instructor materials and no instructor bundle rebuild (the queue owns it), no passphrase, no Spanish catalog string beyond the
  package's own texts.
- No ceiling raised, no `.github` edit, no bound moved, no failed leg re-labelled, no data fetched, no published number typed, no count
  typed (every leg count above is read from a committed results file).

<!-- Listed in DOCUMENTS.md. -->
