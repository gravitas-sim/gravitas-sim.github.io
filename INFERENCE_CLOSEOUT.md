# Inference investigations, sequence, package and cohesion closeout (Prompt 266)

A closeout run honestly against what Prompts 261 to 265 landed. Prompt 266 asks for five inference investigations ("Fitting a line, properly",
"Is the difference real?", "The likelihood", "Propagating uncertainty", "The model that was not there"), a sequence "Measurement and
inference", an extended upper-level package, a topic page and the cohesion check. What 261 to 265 shipped for a student is **nothing**: each is
a kernel or a gate with its validation record, and every one of them has a leg that failed, or a part that waits for a file or a decision.
No panel, lesson, viewer mode, pack or Library entry came out of them. Carl's rulings of 2026-11-05, 2026-11-06 and 2026-11-07
(`DECISIONS_2026-11-05.md`, `DECISIONS_2026-11-06.md` and `DECISIONS_2026-11-07.md`, outside the repository) hold the **consumers rule** for
each of these kernels: no panel, lesson or viewer is built on a kernel until its consumers condition is met, and he held 265's lessons, its
creating panel and its client for 184 by name. Four of the five investigations the prompt names rest on those held kernels or on a method no
prompt has built; the fifth rests on landed methods and is left for a decision (question 2).

It does the parts that apply: the record of what landed, each closeout item as done, not applicable or held with its reason, the one course
change the shipped content supports (the three measurement investigations of Prompt 190 join the upper-level package, with a note on what has
no investigation), the cohesion check, the acceptance audit of the three shipped investigations, four evidence-status rows, the register rows
and the regeneration.

Nothing here changes a shipped step, a lesson, a page or a bound. No published number or licence term is typed from memory, nothing was
downloaded, and every failed leg stays failing and labelled. The Spanish of the package text is unreviewed by a fluent reader and stays so;
that is the standing state of every Spanish text in Gravitas and not a pending item.

## Run condition and authorization

| Item | Evidence |
| --- | --- |
| Base | `v3` at 7bf95b8f (Merge #565). Every Roadmap III pull request, whatever its class, targets `v3` (INTEGRATION.md, Carl 2026-10-17). |
| Tranche | T5 (prompts 255 to 267) is authorized by D-R10-254-01, the record of Continuation checkpoint V (CONTINUE AS PLANNED). The row is DELEGATED, not ratified. Its operating terms bind: (d) the instructor closure is one file from its cap and a new sequence takes one new file with a cap raise asked for; (h) the consumers rule is held. |
| Hard prerequisites (Appendix C: 261, 263, 265) | All three landed on `v3` (#560, #562 with its data legs #564, #565). The optional enrichments 262 (#561) and 264 (#563) landed too. |
| Gate outcomes that change 266 (Appendix C) | 262 B: one estimator (the censoring product-limit estimator, slice B-KM). 263's clustering gate B: the estimator on a synthetic clustered sample only. 264 B: the population likelihood without per-object uncertainties (C would have removed the population investigation; it is not among the five). |
| Exists elsewhere | No branch or open pull request builds any 266 deliverable. The open pull requests are #538 (test temporary directories) and two dependency updates; Prompt 260's closeout runs in its own worktree. |
| Decision register | Every verdict was read and is treated as binding: D-R10-261-01 to -03, 262-01 to -05, 263-01 to -09, 264-01 to -05, 265-01 to -05. |

## What landed in 261 to 265

Read from each kernel's committed `results.json` (and follow-up results) and `failed-legs.json`, not from a handoff. A failed leg stays
failing and labelled; only Carl resets a bound. "Legs" are the rows of the results file.

| Prompt | Landed as | Student-facing | Legs: pass / fail / reported / not run | Failing and not-run legs, by id | Verdict as recorded |
| --- | --- | --- | --- | --- | --- |
| 261 Model comparison II | kernel `js/kernels/statistics/modelcompare.js`, #560 | none | 20 / 1 / 3 / 3 | fail F1.authenticCepheid (a calibrated p of 0.011 where the committed leg required the floor; the oracle's own search on the same points gives a similar value, so the data and not the kernel); not run N1 to N3 (published values) | FAILED LEG(S); offered to no consumer |
| 262 Censoring and truncation | gate, spike only, #561 | none | 33 / 1 / 3 / 4 | fail C2o.cmCoverageOracle (the oracle's own implementation, 0.919 against a committed 0.92); not run X1 to X4 (authentic data, a cited form) | **B**, slice B-KM: the censoring estimator and its independence check pass; truncation does not |
| 263 Crossmatch | kernel `js/kernels/crossmatch/`, #562; data legs #564 | none | 37 / 2 / 3 / 1; follow-up legs 3 / 0 / 0 / 0; data legs 3 / 0 / 4 / 0 | fail A6.largeShift (a committed expectation that was a derivation mistake) and G2.coverage (sampling noise against the bound), corrected by the new legs A6b, B1b and G2e, which pass; not run D5.publishedTool in the first run (the data legs then pass D5a, D5c, D5d) | FAILED LEG(S) for the kernel; follow-up legs VALIDATED |
| 263 Part B Angular clustering | gate, spike only, #562; data legs #564 | none | 8 / 0 / 2 / 1; data legs 2 / 0 / 1 / 1 | not run B9.authenticReference (no same-sample published correlation function found) | **B**: the estimator on a synthetic clustered sample only |
| 264 Population inference | gate, spike only, #563 | none | 42 / 1 / 6 / 3 (52 legs) | fail D8.noZeroRule (a limit statement among zero estimates: 0.623 against 0.94; the leg conditions on the outcome); not run X1 to X3 | **B**: the version without per-object uncertainties passes; the version with them fails D8 |
| 265 Experiment runner II | module `js/experiments/ensemble/`, #565 | none | 22 / 1 / not-applicable 1 / not run 1 (25 checks) | fail A8.regressionContext (the three-body kind on the scenario's own settings); A8b on the lab's settings passes to the digit; not run F2.otherEngines (CI's evidence) | one failing leg; item 4, the creating panel and 184 as a client held |

No shipped investigation, course package, data pack or Library entry changed in this range (`git diff` from `v3` 1bc9c07f, the tip 261
was cut from, to this base is empty over `js/data/investigations`, `js/data/courses`, `data-packs`, `library` and `catalog`). Carl's rulings bear on it: the consumers rule is held for every kernel above; F1, C2o, A6, G2, D8 and A8
stay failing and labelled, each with its replacement leg committed first where one exists; the data legs of 263 were fetched under his
words of 2026-11-07 and nothing downloaded was run; 264's follow-ups (D8b, a penalty-convergence leg) and 262's (C2c) are approved for
later and none has run.

## What a student can and cannot do today

Available, and unchanged except for the package listing below: the measurement investigations of Prompt 190 (What Is a Measurement?, What
Does ± Claim?, When the Method Must Refuse), the selection-effects investigations (Who Gets Counted, Why the Bright Ones Win, The Completeness
Curve), How Many Earths? with its exposure-corrected rate, the formula language's propagated uncertainty on a derived quantity, the fitters of
the inference core, and the comparison instrument.

Not available: a choice between models by a test valid for the pair, a simulation-calibrated significance for a searched signal, information
criteria, a limit mixed with detections or a truncated sample, a catalogue cross-match with epochs, an angular correlation function, a fit of
a selected population, a replayable random experiment, a two-sample test with an effect size. The kernels run in tests and in the validation
suite; a student cannot reach them. No page, label or claim says otherwise.

## The methods sequence, as it exists

What a quantitative course can assign today, in order, from shipped investigations only. It is a reading order, not a new sequence in the
Library (see "Sequence not created").

| Order | Item | What it teaches | Level | Where it is placed |
| --- | --- | --- | --- | --- |
| 1 | What Is a Measurement? | marks of one star, the spread, the standard error of the mean, a prediction before the truth is shown | survey | `observing-and-measuring`, first; now `upper-level-modules` |
| 2 | What Does ± Claim? | the coverage of a one- and two-sigma interval, an asymmetric interval, an upper limit, a biased instrument with small scatter | majors | `observing-and-measuring`, after 1; now `upper-level-modules` |
| 3 | When the Method Must Refuse | a fit that fixes one combination of two parameters, the profile, "not constrained" as the answer, a misspecified line graded on the refusal | upper | `observing-and-measuring`, after 2; now `upper-level-modules` |
| 4 | Who Gets Counted, Why the Bright Ones Win, The Completeness Curve | a selection function, Malmquist bias against a known truth, a correction and the bias left | survey to upper | `observing-and-instruments`; `upper-level-modules`, unit "Statistics of surveys", after 1 to 3 |
| 5 | How Many Earths? | what a survey could have seen, what a count becomes, what a bin cannot say | survey to upper | `planets-and-exoplanets` |

Held, with the reason and what would release each (nothing here is built):

| Method | Landed as | Why it is not an investigation | What releases it |
| --- | --- | --- | --- |
| Choosing between models | 261 | the kernel failed its authentic-data leg; consumers held | Carl releases the consumers rule; a new leg for another subsample, bound first; N1, N2 fetched |
| Censored data | 262, B-KM | the estimator passes and has no consumer; the truncation estimator fails C2o | a consumer released, then Part B for the censoring estimator only; the follow-up C2c; R1 to R4 |
| Cross-matching, clustering | 263 | two kernel legs failed (corrected by new legs); the clustering gate returned the synthetic slice only | a consumer released; a same-sample published correlation function for B9 |
| A selected population | 264 | D8 fails; no Part B has run | D8b with its bound first, the penalty-convergence leg, then Part B and a consumer |
| Random experiments | 265 | A8 fails on the scenario's own settings; item 4, the panel and 184 held | a consumer released; the instructor closure raised; the queue's ciphertext rebuild |
| A two-sample test with an effect size | none | no prompt built it; `compare.js` has the difference of two estimates and the nested F-test only | a prompt that builds it, gate or not |

## The closeout items

| Item of the prompt | Status | Why |
| --- | --- | --- |
| 1a "Fitting a line, properly" | NOT BUILT, a decision (question 2) | rests on landed methods (the weighted fit and covariance of the inference core, the residual diagnostics of the statistics kernel) and on no held kernel. Not built because the third investigation of Prompt 190 already teaches the weighted line fit, the covariance and the profile, so the new content is the residual diagnostics, and because a new lesson takes the last free closure slot (306 of fewer than 307) and needs the queue's rebuild of the ciphertext. That is a call for Carl and the coordinator, and not a failed gate |
| 1b "Is the difference real?" | BLOCKED | needs a two-sample test and an effect size; none exists in the tree (see the held table) |
| 1c "The likelihood" | NOT BUILT, a decision (question 2) | the one-parameter surface and the profile are in the inference core and When the Method Must Refuse already carries a profile; a two-parameter contour is the new content. Same reason as 1a |
| 1d "Propagating uncertainty" | BLOCKED in part | the formula language propagates the sigma and 154's `propagate` is landed, but the prompt's Monte Carlo check is on 265's runner, which fails A8 and whose client is held |
| 1e "The model that was not there" | BLOCKED | the simulated significance and false-positive rate are 261's calibrated test, which is offered to no consumer |
| 2 Sequence "Measurement and inference" | NOT CREATED | see below |
| 3 The upper-level package gains the sequence | DONE (visible) | 1.5.0 to 1.6.0: the three measurement investigations and a note on what has no investigation, below |
| 3 Alignment note, the curriculum map | no new rows | below |
| 4 Topic page, related and next links, recommended starts | checked, nothing to add | below |
| 5a The cohesion check (9.4) | DONE | below |
| 5b The content acceptance sheet (8.4) | DONE for the three shipped investigations | below |
| 5c Evidence-status rows | DONE | four rows |
| 5d Generated artifacts regenerated | DONE | the Library and its search index, the service-worker manifest, the documents map, the evidence-status page, the tools index, the counts a change moves |
| Tests | DONE | listed in the pull request; the e2e walks and the lesson validators are not rerun for an investigation that did not change (the course page was checked in a browser once, and the accessibility spec is run because a page's content changed) |

The prompt's own rule, "a failing item fixed here or the phase is NOT READY", applies to the investigations: four are blocked or held and one is
a decision, so the inference phase (R22) is **NOT READY** as the roadmap defines it. The shipped investigations pass the cohesion check.

### Sequence not created

The three measurement investigations are already first in `observing-and-measuring`, in the order 1 to 3 above, with their prerequisites, and
the selection investigations are in `observing-and-instruments`. A sequence "Measurement and inference" would hold the same items (a
sequence holds lessons only, and the held methods are not lessons), would add a Library choice for no new content, would take the last
closure slot for a file that holds nothing a student can open, and `tests/curriculumSequences.test.js` fixes the set of nine sequences. Its prerequisites, ladders
and feedback are the existing sequence's. A path without content is not a unit; the same decision was taken for 253.

### Alignment

Rows exist already for the three measurement investigations (`js/data/investigations/discovery.js`): all three carry textbook chapter 6 with
`courseLevel` survey, majors and upper, and each names its prerequisite. A row is a claim that the investigation supports the
chapter and the adoption pages state it; the held methods have no investigation, so no row is added. The note that the sequence serves any
chapter is true of the existing three (they use synthetic worlds and name no chapter's content) and is stated here and not on a page.

### The upper-level package

`upper-level-modules` 1.5.0 to 1.6.0, the unit "Statistics of surveys":

- **Three lesson items**, at the advanced depth, in the order of their prerequisites, before the unit's selection investigations: What Is a
  Measurement?, What Does ± Claim? (needs the first) and When the Method Must Refuse (needs the second). Each is pinned to the lesson as it
  is now and carries a new objective, `claims`: "State what a measurement and its uncertainty claim, test the claim against a known truth,
  and say when a method must refuse." No step of any lesson changed.
- **One student note and one teacher note** on the last of the three, English and Spanish: what has no investigation (choosing between
  models, limits mixed with detections, matching catalogues, clustering, a population, a random experiment repeated) and why, as recorded,
  and that the three here are what exists. No count, no number and no file path is in the notes; a statistics text is named as the reading
  for the methods.
- The package stays UNVALIDATED as a course: no instructor has run it, no learning is measured, and no cartridge of it has been opened in a
  learning-management system by anyone outside the project. The Spanish is unreviewed by a fluent reader. It validates against the schema and
  audits clean (`tests/coursePack.test.js`, `tests/curriculumSequences.test.js`, `tests/commonCartridge.test.js`,
  `tests/formatSchemasCourse.test.js`). The change touches no deferred chunk. No other course changed; the survey-level lesson is not added to
  `astronomy-semester` (question 4).

### Topic pages, related and next links, recommended starts

Checked against `library/library.json`: the three measurement investigations are in the Observing and measuring sequence, each has prerequisite,
next and related links, an adoption page and search entries. A recommended start is one of four fixed starts, and a new item does not become
one. Nothing was added.

## The content acceptance sheet (8.4), for the three shipped measurement investigations

Read from the investigation sources (`js/data/investigations/measurement-sequence.js` and its depth and Spanish files) and
`docs/lesson-acceptance.json`; held by `tests/claimInvestigations.test.js`. This audit records fact and changes nothing.

| Requirement | What Is a Measurement? | What Does ± Claim? | When the Method Must Refuse |
| --- | --- | --- | --- |
| Objective at survey depth, quantitative and inferential forms deeper | survey form; three depths | majors form; three depths | upper form; three depths |
| A specific misconception | `why-it-doubled` | `what-a-small-error-bar-says` | `is-there-a-largest-mass`, `what-to-report`, `refuse-or-report` |
| A prediction recorded before the answer is revealed | `predict-the-marks`, `predict-more-marks`, `predict-the-truth` (each with a reveal) | `predict-one-sigma`, `predict-the-biased-instrument`, `predict-the-upper-limit` | `predict-the-mass`, `predict-the-line` |
| The measurement and its uncertainty | five measure steps, graded | six measure steps, graded | five measure steps, graded |
| A competing explanation, withheld transfer case or misspecified example | `a-blurrier-star` (the same method on a wider spread) and `reveal-the-truth` (the mean set against the revealed truth) | `biased-coverage` (a biased instrument with small scatter) and `the-symmetric-shortcut` (against an asymmetric interval) | `fit-the-line` and `a-model-that-fits` (a misspecified line, graded on the refusal) |
| A brief reflection | `what-you-would-report` (a prompted question) before the summary | `what-would-prove-it-wrong` | `what-would-you-refuse` |
| The instructor's key and rubric criteria | a guide, a flow and expectations exist (the bundle is the queue's) | the same | the same |
| The upper depth's limits rather than more controls | n/a (survey) | the asymmetric interval and the upper limit state their own coverage | the whole lesson is the limit: "not constrained" is the answer |
| English and Spanish | the Spanish carries the same step structure (machine-checked); unread by a fluent reader | the same | the same |
| Evidence status | `measurement-investigations-recomputed` (new row, V-internal, established) | the same row | the same row |

All three meet the sheet. The one standing limit is stated in the row: every datum is synthetic and the instrument's statistics are the
instrument's own and not the statistics kernel's.

## The cohesion check (section 9.4), recorded

Run against `v3` 7bf95b8f with this pull request's tree. An internal inspection, not evidence about comprehension.

| Test | Result |
| --- | --- |
| No new top-level destination | pass: no page, route or menu entry added |
| Menu, Home and the Library's default view not longer | pass: nothing in them changed; every committed navigation ceiling is met as at the base |
| No new kind, term or filter without a register row | pass: none added (the lesson items, the notes and the objective are of kinds the packages already use) |
| Every new item discoverable by sequence, topic page, course, related or next link, search and recommended start | pass: there is no new investigation or tool; the three lessons that join the package are reached through their sequence, the Library, search and now the package |
| No duplicated terminology | pass: no label or glossary entry added |
| Default choice counts not substantially increased | pass: unchanged |
| Structural navigation checks green | pass: `npm run navigation:check`, `npm run surface:check`, `npm run check:architecture`, `npm run docs-map:check` and `npm run packs:check` exit 0 on Node 22.23.4, and the library, relations, sequence, course-pack, navigation and surface suites pass in the full Jest run |

The check passes because the one visible change is a course package's items and notes. It is not evidence that the held investigations would
pass.

## Data and size

No pack, sidecar or data file is added or changed, and nothing was downloaded. Measured on a Node 22.23.4 build of this branch over `v3`
7bf95b8f (`npm run budget:data`, `npm run budget:check`, `npm run budget:routes`, `npm run budget:composition -- --check`): packs 355,282 of
355,282 bytes raw and 111,422 of 111,422 gzip (no room, nothing added), first-visit precache 5,324,306 of 5,365,197, initial download
801.7 KB, every route within its ceiling, indexedDB and cache 18,508,011 of 209,715,200. Deferred JavaScript reads 3,165,346 bytes gzipped
(3091.2 of 3091.2 KB) **with and without** the package change, because a course package is in no deferred chunk. **One ceiling is raised:** the
idle precache tier, 1,610,682 to 1,610,724 bytes (`tools/data-budget.json`), exactly the 42-byte overrun that `library/library.json` caused
when it regenerated (the three investigations now list the course that holds them), under the standing approval of 2026-10-10 and with a
register row (D-R10-266-05); the queue confirms it on CI. The instructor closure is unchanged and no closure file is added.

## What would unlock each held item

The order follows the prerequisites, not importance.

1. A go-ahead from Carl for the matching consumer (the consumers rule). Without it nothing below is built.
2. The instructor closure: one new file for a new sequence or lesson family, with the cap raised by one (tests/instructorDigest.test.js), and
   the queue's rebuild of the ciphertext.
3. Files only Carl's session fetches, where a leg needs one (each stays NOT RUN until then): 261's N1 and N2, 262's R1 to R4, 264's R1 to R4
   with the cited implementation's run (which needs his permission), 263's same-sample published correlation function.
4. New legs for the failing ones, committed before any run, as he ruled for each: 261's F1b, 262's C2c, 264's D8b and the penalty-convergence
   leg. A bound is never moved after its result.
5. Then the consumer, then the investigations in the order the prompt lists them, then the sequence, the alignment rows and the topic page.
   A re-run of this prompt is only meaningful after 1 and 2, for at least two of the five.

## Questions for Carl

1. Is the shape of this run right: three shipped lessons and a note for the package, and a record for the rest, rather than any
   investigation built on a held or missing method? Recommendation: yes.
2. "Fitting a line, properly" and "The likelihood" rest on landed methods and on no failed leg. Build them as one small follow-up prompt (the
   residual diagnostics and a two-parameter contour at the upper depth, one new closure file, the cap raised by one), or leave them with the
   rest until a consumer is released? Recommendation: the follow-up, after the cap is raised; it is the one item here that is a choice and not
   a blocker.
3. Which consumer is released first? The least blocked is 262's censoring estimator (every leg of its slice passes; Part B for it alone is
   already approved for later once a consumer exists), then 265's runner on the lab's settings (A8b). 261's kernel waits on F1.
4. Add "What Is a Measurement?" to `astronomy-semester` and `intro-astronomy` too, or keep it in the upper-level package only?
   Recommendation: leave as is until an instructor asks; each is a visible change to a different audience.
5. Ratify the DELEGATED rows D-R10-266-01 to 266-05, or say which to change.

## Not done, on purpose

- No investigation, lesson, panel, viewer mode, pack, Library entry, sequence, topic page or alignment row.
- No instructor materials and no instructor bundle rebuild (the queue owns it), no passphrase, no Spanish catalog string beyond the package's
  own texts.
- No ceiling raised but the one named in "Data and size", no `.github` edit, no bound moved, no failed leg re-labelled, no data
  fetched, no published number typed, no count typed (every leg count above is read from a committed results file).
