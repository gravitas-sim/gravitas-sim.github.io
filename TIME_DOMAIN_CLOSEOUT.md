# Time-domain and multiwavelength closeout (Prompt 246)

A documentation-only closeout. Prompt 246 asks for five connecting investigations, a sequence, alignment rows, topic pages and a cohesion check
over what Prompts 241 to 245 shipped. What 239 to 245 shipped is kernels, validators, oracles and gate records, each with legs that failed or
were not run, and no lesson, panel, viewer or pack for a student. Carl's rulings of 2026-11-05 (`DECISIONS_2026-11-05.md`, outside the
repository) hold the consumers rule: no go-ahead for panels, lessons or viewers until their gates pass, and no synthetic SED view yet. The
connecting investigations would be built on nothing, so this prompt builds none of them. It runs the parts of the contract that apply, states
what a student can and cannot do in this area today, and records for each closeout item whether it is done, not applicable or blocked, and why.

Nothing here changes a shipped step, a lesson, a page, a pack, a ceiling or a bound. No published number or licence term is typed.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at f2de6e74 (Merge #540), the head of the train when this branch was cut. The aggregate push CI of that SHA was still queued when this was written; the previous tip, 8f864e41, completed success. |
| Tranche | T4 (prompts 233 to 254) is authorized by D-R10-232-01, the record of Continuation checkpoint IV (`CONTINUATION_CHECKPOINT_IV.md`, outside the repository): CONTINUE AS PLANNED. The row is DELEGATED, not ratified. |
| Hard prerequisites (Appendix C: 241, 242, 244, 245) | Landed on `v3` as kernel pull requests: 241 as #526, 242 as #528, 244 as #524, 245 as #531 with its follow-up #534. The optional enrichment 243 landed as #530. None of the five landed a consumer. |
| Gate outcomes that change 246 (Appendix C) | 243's Part A gate: kernel B, net forms total-count only, period legs failing, so "Periods everywhere" omits the X-ray case; 242's Part B gate (the interferometer concept) was never opened, so timing and interferometry stay reading steps. See the table below. |
| Exists elsewhere | No open pull request or branch builds any 246 deliverable. The only open pull requests are #538 (test temporary directories) and two dependency updates. |
| Decision register | Every gate verdict it lists was read and is treated as binding: 239 (A 0, B 1, C 15), the 241 to 245 rows and the 245 follow-up rows. |

## What landed in 239 to 245

All kernels are `NEVER_PRECACHED` and imported by no route. Every result below is read from the committed `results.json` and `failed-legs.json`
of the kernel, not from a handoff. A failed leg stays failing and labelled; only Carl resets a bound.

| Prompt | Landed as | Student-facing | Legs: pass / fail / not run | Failed and not-run legs, by id | Rights |
| --- | --- | --- | --- | --- | --- |
| 239 radio rights gate | #513 | none | A 0, B 1, C 15 (per source) | not applicable | one source released (B); fifteen C |
| 240 radio packs | #525 | the NANOGrav 15-year table as a pack (`nanograv-15yr-pulsars`), no Library entry | not applicable | not applicable | CC BY 4.0, B, carried out on files Carl fetched |
| 241 HI spectroscopy | #526 | none | 16 / 2 / 2 (3 reported) | fail A1.doppler, C2.coverageTheta0; not run B7.publishedTangent, E1.packContract | C path: the generator is the pack; authentic legs NOT RUN |
| 242 pulsars | #528 | none | 24 / 1 / 2 (3 reported) | fail A5.periodNoiseFree; not run B6.toolkit, E1.authenticSeries | C path: synthetic series only |
| 243 X-ray timing | #530 | none | 23 / 4 / 4 | fail A4.periodRecovery, B6.netHardnessOracle, C3.netRateCoverage, C5.periodIntervalCoverage; not run B7.timingPackage, E0, E1, E2 | nothing fetched; every HEASARC product is basis C and not shipped |
| 244 multi-messenger | #524 | none | 24 / 0 / 4 (2 reported) | not run B2.timeAuthentic, B4.boundPublished, E1.delayFromPacks, E3.kilonovaReddening | nothing fetched; leap list, published bound and photometry not shipped |
| 245 SED | #531, follow-up #534 | none | 14 / 4 / 4 (2 reported); follow-up 2 / 1 / 0 (1 reported) | fail B1, B2, C2, D3, then B1b; not run B5.citedTool, E0, E1, E3 | catalogue rows are basis C and not shipped |

Gate verdicts by the committed functions: 243 kernel B (net forms total-count only; product NOT ESTABLISHED); 245 kernel C (first gate and
follow-up gate both); 241, 242 and 244 carry no gate verdict and no consumer. The single failed follow-up leg of 245 (B1b) is held failing by
Carl's ruling of 2026-11-05 and is not re-judged on a metric proposed after its result.

## What a student can and cannot do in the time domain today

Available, and unchanged by this pull request: the Roadmap II time-domain work. The variable-star investigations (`the-beat-of-a-star`,
`which-kind-of-variable`, `leavitts-law`, `the-first-rung`, `standard-candles`, `a-variable-star-from-frames`, `two-periodograms`, and the second
variables sequence) with the period search, Leavitt's law and the first rung of the ladder (`TIME_DOMAIN_LADDER.md`); the observing and exoplanet
investigations that already teach periods and aliases (`why-the-period-is-wrong`, `refitting-a-transit`, `flares`); the gravitational-wave
investigations `what-is-a-gravitational-wave` and `listening-to-spacetime`, which sit in the existing gravity sequence; and the NANOGrav
period and dispersion-measure pack (`nanograv-15yr-pulsars`, D-R10-240-01), which exists as a data pack with no Library entry
(D-R10-240-04 left that question open) and no investigation that uses it.

Not available: any investigation, panel, viewer mode, pack or Library entry for HI spectroscopy, pulsar dispersion and folding, X-ray timing,
the multi-messenger timeline or an SED. The kernels run in tests and in the validation suite; a student cannot reach them. No page, label or
claim says otherwise, and none should be added until the matching consumer ships (7.5 rule 12).

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1a "The same star in radio, optical and X-rays" | BLOCKED | needs a radio viewer mode (241 not built), X-ray light-curve data and hardness (243: consumers rule, product NOT ESTABLISHED, E0 to E2 not run) and an SED view (245: kernel C, held by ruling) |
| 1b "Periods everywhere" | BLOCKED | the pulsar case needs 242's panel (not built; A5 failing); the X-ray binary case is removed by the 243 gate's consequence (A4 and C5 fail, no period claims); only the Cepheid and exoplanet cases exist, which are shipped investigations and not a new one |
| 1c "From a dispersion to a distance" | BLOCKED | 242's crude DM distance has no default electron density by design and the source of the density is an open question for Carl; the NANOGrav pack has no parallax column, so "a parallax where one exists" has no pairing; no consumer |
| 1d "The messenger race" | BLOCKED | 244's kernel passes its legs but no lesson was authorized; B2, B4, E1 and E3 need files Carl has not supplied (a leap list, the published bound, a trigger, photometry); the emission-delay assumption is built into the kernel and would be stated in the lesson |
| 1e "What the survey missed" | BLOCKED | 244's transient-completeness kernel exists and 215 landed; no consumer was authorized |
| 2 Sequence "The changing sky, across the spectrum" | N/A | every new item it would order is unbuilt; the shipped members (variables, ladder, gravitational waves) already belong to existing sequences, and a new visible sequence of items that exist elsewhere would add a path without adding content. "Gated-out items as reading steps" presupposes the gated lesson around them |
| 3 Alignment rows for chapters 6, 23 and 24; curriculum map; upper-level package | N/A | no new item to align; the rows state what ships and must not name an item that does not exist. The upper-level package is unchanged (a changed item would be visible) |
| 4 Topic page, related and next links, recommended starts | N/A | a "time domain" topic within Observe would list the shipped Roadmap II items again, which the Library facets and sequences already do; nothing new to link |
| 5a The cohesion check (9.4) | DONE | below |
| 5b The content acceptance sheet (8.4) | N/A | no investigation was shipped to hold a sheet |
| 5c Evidence-status rows | N/A | a row records a public claim; no public claim was made or changed, and none may rest on a kernel whose product is NOT ESTABLISHED |
| 5d The data budget's ledger | DONE | below; no pack, no data file, no ceiling changed |
| 5e Generated artifacts regenerated | DONE | the documents map, the register, the tools index and the counts a documentation change moves; nothing else changed |
| Tests: library, sequences, course-pack, alignment, relations; i18n:check, docs:check:full, generate --check, links; lint, format | DONE | listed in the pull request; axe, lesson validators, headless grading and e2e walks are not run because no page, lesson or e2e spec changed |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies to the student-facing unit: it is **NOT READY, not
built** (items 1 to 4 above). The cohesion check passes because this pull request changes no surface; it is not evidence that the unit would
pass.

## The cohesion check (section 9.4), recorded

Run against `v3` f2de6e74 with this pull request's tree (documentation only). An internal inspection, not evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass: nothing changed; `npm run navigation:check` and `npm run surface:check` pass and every committed navigation ceiling is met as at the base |
| No new kind, term or filter without a register row | pass: none added |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | not applicable: no new item; the kernels are deliberately undiscoverable |
| No duplicated terminology | pass: no label or glossary entry added; the glossary-consistency test passes |
| Default choice counts not substantially increased | pass: unchanged |
| Structural navigation checks green | pass: `tests/navigationChecks.test.js`, `tests/surfaceGate.test.js` and the library, relations, sequence and course-pack suites pass on Node 22 |

## The data budget's ledger

No pack, sidecar or data file is added or changed by this prompt. The one radio pack that exists (the NANOGrav table) was added by 240 inside
its recorded raises (D-R10-240-03). The data and composition budgets and the route ceilings are read by `npm run budget:data`,
`npm run budget:composition` and `npm run budget:routes`, which pass. Deferred JavaScript is unchanged by a Markdown-only change; the figure
this pull request measured is in the pull request and the register row D-R10-246-04.

## What would unlock each blocked item

The order follows the prerequisites, not importance.

1. A go-ahead from Carl for the matching consumer (the consumers rule). Without it nothing below is built.
2. Files only Carl can fetch, listed in each document's "Files requested from Carl": `RADIO.md`, `PULSARS.md`, `X_RAY_COUNTS_GATE.md`,
   `MULTIMESSENGER.md`, `SED_GATE.md`. Each turns a NOT RUN authentic leg into a reported or failed one.
3. New legs for the failing ones, committed before any run, as Carl ruled for 245 and 248: 241's A1 and C2, 242's A5, 243's four, 245's B1b
   and D3. A bound is never moved after its result.
4. Then the consumer, then these five investigations and the sequence, then the alignment rows and topic page, in that order. A re-run of this
   prompt is only meaningful after 1 and 2 for at least two of the five.

## Questions for Carl

1. Is the documentation-only reading of 246 right (kernels exist, no consumers, so a record and not an unlock), or should a smaller student-facing
   piece be built from the shipped Roadmap II items alone (a sequence of variables, ladder and gravitational waves)? Recommendation: wait; it
   would not need any of the new work.
2. Which consumer, if any, is released first? The least blocked is 244's "The day the universe rang and flashed" with the synthetic kilonova (no
   file needed), then 241's tangent tool on the synthetic generator.
3. The electron-density source for 242's DM distance, and the NANOGrav DM convention (open in `PULSARS.md`).
4. 242's Part B gate (the interferometer concept) was never opened. Open it, or leave timing and interferometry as reading steps for good?
5. Ratify the DELEGATED rows D-R10-246-01 to 246-04, or say which to change.

## Not done, on purpose

- No investigation, lesson, panel, viewer mode, pack, Library entry, sequence, topic page, alignment row or course item.
- No instructor materials, no Spanish strings, no instructor bundle rebuild (the queue owns it), no passphrase.
- No ceiling change, no `.github` edit, no bound moved, no failed leg re-labelled, no data fetched, no published number typed.

<!-- Listed in DOCUMENTS.md. -->
