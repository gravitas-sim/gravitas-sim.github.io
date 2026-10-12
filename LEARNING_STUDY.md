# Learning-outcome study: design and instrument validation plan

**Status: a design. No study has been run, no data has been collected, no
registration has been filed, and no ethics or institutional review has taken
place.** Nothing in this file is a finding about Gravitas, and no page may
quote it as one. The teaching page's sentence stands: no study has been run on
this software, there is no validated assessment and no measured learning gain.

This is what somebody would need in order to change that sentence honestly.
The pilot instruments it refers to are the ones in the
[classroom evidence kit](evaluation/index.html) (`js/data/evaluation.js`). A
green test suite, a defensible model, an educator adopting a workflow and a
measured learning outcome are four different facts
(the project's standing rule for every claim); this file is only about the last
one, and it keeps usability and adoption evidence apart from it.

**Review status, stated plainly.** Two people are written into this plan and
neither has seen it: two astronomy educators for expert review, and an
institutional review board. Both are outside the project, so neither step has
happened and the plan is written to be ready for them. Nothing below records an
approval, a sign-off or a "reviewed by". Decision-register rows D-STUDY-01 to
D-STUDY-04 say the same.

**The draft `concept/2` (2026-10-11).** Carl approved a second version of the
concept items that repairs the key and length defects and fills the alignment
gap (D-STUDY-05). It is a DRAFT: no review, interview or calibration has
touched it, its items may still change, and the conditions of D-STUDY-02
stand as written. Sections 2.1 and 2.5 and Appendix B.2 describe it.

Contents: [1 Research questions and design](#1-research-questions-and-design) ·
[2 Instrument validation](#2-instrument-validation-plan) ·
[3 Data handling](#3-data-handling-and-the-review-path) ·
[4 What the platform logs](#4-what-the-platform-must-log-without-telemetry) ·
[5 What a first study can show](#5-what-a-first-study-can-and-cannot-show) ·
[6 Recruitment requirements](#6-recruitment-requirements) ·
[Appendix A Preregistration text](#appendix-a-preregistration-text-unfiled) ·
[Appendix B Item alignment](#appendix-b-the-twelve-items-against-the-objectives) ·
[Appendix C Expert review sheet](#appendix-c-expert-review-sheet)

## 1. Research questions and design

### 1.1 Population and sequence, named

- **Population.** Students in an introductory, algebra-based, non-majors
  astronomy course at a four-year institution, taught by one instructor in one
  term. This is the level the kit's items are written at. A different level
  (majors, a high school course, a different language) is a different study.
- **Sequence.** The kit's own: the investigations _Kepler's Laws_, _Bound,
  Unbound and Escape_, then _Weighing the Stars_, thirty-five to forty-five
  minutes each, as the in-class activity for the orbits unit.
- **Comparison.** The instructor's usual activity for the same class meetings
  (a worksheet, a demonstration, a different simulator), matched for contact
  time as far as the fidelity checklist can show. The comparison is not "no
  instruction". The question is whether this sequence does better than what
  that instructor would otherwise have done with those meetings.

### 1.2 Research questions

Stated narrowly, each answerable by the design below and by nothing broader.

- **RQ1 (primary).** Among students in that population, does doing the
  sequence rather than the instructor's usual activity change the score on the
  items that assess the sequence's stated objectives (Appendix B), measured
  after the sequence and adjusted for the same students' score before it?
- **RQ2 (secondary).** Does the same contrast show on the items about reading
  the model (what is drawn, what is computed, what the engine omits)?
- **RQ3 (secondary).** Three weeks after the last meeting, is the difference
  still there for the section that did the sequence first?
- **RQ4 (descriptive only).** Among students who did the sequence, do those
  who took more hints or made more attempts score differently? Hint use and
  attempts happen after assignment, so this is a description of a pattern and
  never a causal statement about hints.

### 1.3 The design: a delayed-start comparison

A crossover is the wrong tool. Learning carries over: a student who has done
the sequence cannot be returned to not having done it, so the second period of
a crossover measures something else. A **delayed-start** (waitlist, or stepped)
design gives the comparison a single instructor can run and still lets every
student have the sequence.

Two arms, Early (E) and Late (L), and three measurements with the same
instrument:

| Time | What happens | E | L |
|---|---|---|---|
| T0 | Pre-test, before either arm starts | pre | pre |
| unit 1 | Orbits unit, three meetings | **Gravitas sequence** | usual activity |
| T1 | Post-test, at the end of unit 1 | post 1 | post 1 (control reading) |
| unit 2 | A later unit of the same length | usual activity | **Gravitas sequence** |
| T2 | Post-test, three weeks after the end of unit 2 | post 2 (retention) | post 2 |

- **The controlled contrast is E against L at T1**, both pre-tested at T0.
  That is RQ1 and RQ2.
- **The replication is L's own change** from T1 to T2, the period in which it
  does the sequence, compared with E's change over unit 1. If the sequence does
  something, it should do it in the section that waited too. The order swap
  makes a section difference (time of day, group chemistry) less able to
  masquerade as an effect, because it would have to favor E in unit 1 and L in
  unit 2 together.
- **Retention (RQ3).** E's T2 score against its own T1, with L's T2 read as the
  point at which both arms have had the sequence.
- **Unit 2 must teach a topic the same items do not cover**, or L's T1 control
  reading is contaminated by teaching on the orbit items in the gap. The plan
  therefore fixes that unit 2 is on a different topic (say, light and spectra)
  and that no unit 1 item content is taught in it.

**Assignment, in order of preference.**

1. **D1, randomized.** If the course has six or more lab or recitation groups,
   the instructor (or, better, someone else) assigns groups to E or L by a
   random draw recorded before the term. The unit of assignment is the group,
   and the analysis keeps that.
2. **D2, intact sections.** If the course has two sections, one coin flip
   before the term assigns E and L. The section is the unit and there are two
   of them: **section and arm are completely confounded** and no statistic can
   separate them. D2 supports a description with a replication check, not a
   causal claim. It is written down here because it is the case a single
   instructor most often has, and the report must say which design ran.
3. **Fewer than two groups:** not a study. Run the instruments for the
   instructor's own improvement (the kit already supports that) and stop.

Who runs the instruments matters as much as how groups are assigned; see 3.2.

### 1.4 Threats to validity and how each is handled

| Threat | Why it applies here | Handling |
|---|---|---|
| Selection (D2) | Two sections differ before anything happens | Pre-test as covariate; random draw for which gets the sequence first; the order swap; D2 reported as descriptive; the section is named in every table |
| Instructor effect and allegiance | One instructor delivers both arms and may favor the tool (or distrust it) | Fidelity checklist for both arms; the instructor does not score or enter the data; teaching materials for both arms archived with the data |
| Testing effect | The same twelve items before and after; students may remember them | A three-week gap for retention; no item feedback or key given; the control arm has the same two exposures so the contrast, not the gain, is the estimate; parallel forms are an instrument task (2.5) |
| History and time | Events between T0 and T1 | Both arms live through the same calendar weeks; the swap |
| Contamination | Sections talk; students share links | Same term unavoidably; students asked not to share; the plan reports it as a limit. D1 with groups inside one section makes it worse, not better, which is a real cost of randomizing |
| Attrition | Students drop or miss a test | Analysis as assigned; missingness reported by arm; multiple imputation as a sensitivity analysis (1.6) |
| Instrumentation | The twelve items are unvalidated | Part 2 is a precondition. The trial does not start on an unfrozen instrument |
| Alignment bias | The items were written by the people who wrote the investigations, from their objectives, which favors the sequence | Items reviewed by two educators who did not write the sequence (2.3); an external, published inventory subset as a transfer outcome if its owners permit (2.6); the primary subscale is declared before data |
| Answer key in public | The key sits in a public repository | Paper, proctored, forms collected; the key is not on the printed page; an unpublished parallel form when 2.5 delivers one. Residual risk is reported |
| Test-wiseness | The key is the longest option on 8 of 12 items and option d is never correct (2.4) | Item revision before the freeze; until then the effect is the same in both arms, which is why the contrast, not the raw score, is the estimate |
| Motivation | Low-stakes test, uneven effort | Participation credit independent of score, if the instructor offers any; time-on-test recorded by the proctor |
| Time on task | The Gravitas arm may simply spend longer | Fidelity checklist records contact minutes per arm; the minutes enter RQ4-style sensitivity analysis |
| Outcome switching, analyst flexibility | Many subscales, many models | Preregistration (Appendix A); one primary outcome; analysis script committed before T1 data is read |
| Novelty | A new tool engages for a while | Not controlled in a first study. Retention at three weeks is the only partial answer |

### 1.5 Sample size reasoning

The primary analysis is an adjusted comparison of two arms. For an ordinary
two-arm comparison of a post-test with a pre-test covariate, the number
analyzable per arm is

`n = 2 (z(1 - alpha/2) + z(power))^2 (1 - r^2) / d^2`,

multiplied by the design effect `1 + (m - 1) rho` when whole groups are
assigned (m students per group, intra-class correlation rho). With alpha 0.05
two-sided and power 0.80, and a normal approximation that is one or two
students per arm too low at these sizes:

| Smallest effect worth detecting, d | pre-post r | Analyzable per arm (individuals) |
|---|---|---|
| 0.3 | 0.4 / 0.6 | 147 / 112 |
| 0.4 | 0.4 / 0.6 | 83 / 63 |
| **0.5** | **0.4 / 0.6** | **53 / 41** |
| 0.6 | 0.4 / 0.6 | 37 / 28 |

For D1 (groups assigned), with d = 0.5, r = 0.5 and groups of 15, rho 0.05
needs 81 students per arm (six groups) and rho 0.10 needs 114 (eight groups).
The plan assumes the second, which is typical of classroom data and is an
assumption: neither r nor rho is measured for this instrument, and the
calibration administration (2.2) replaces both before the trial.

- **Smallest effect of interest: d = 0.5 on the primary score** (about one
  item on a twelve-item test with a standard deviation near two). A smaller
  effect than that would not change what an instructor does. This is a
  decision about relevance, not an estimate of the true effect, and not a
  forecast that the sequence will reach it.
- **Planned enrollment: 120 or more students across both arms**, which leaves
  about 100 analyzable after a typical 15 to 20 percent loss to a missed test
  or an unmatched code. For D2 the number is a precision target only, because
  with two sections the confounding, not the sample, sets the limit.
- **Fewer students than that:** the study is a feasibility pilot. It estimates
  r, the standard deviation, attrition and fidelity, reports interval
  estimates and no test, and states so in its title.

### 1.6 Analysis plan, statistics named in advance

All of it fixed in the registration (Appendix A) and in a script committed
before T1 data is read. Software, version and seed recorded.

1. **Primary.** Linear model of the post-test (T1) primary score on arm and the
   pre-test score. D1: with a random intercept for group; if fewer than six
   groups, group as a fixed effect and the interval flagged as unreliable. D2:
   section is the arm, so no section term, and the report says the estimate
   is the section difference. The estimate is the adjusted mean difference
   with a 95% confidence interval from heteroscedasticity-robust (HC3)
   standard errors, and the same difference standardized by the pooled pre-test
   standard deviation (Hedges' g). No percentage, no normalized gain, which is
   a ratio of two noisy numbers whose behavior is poor near a ceiling.
2. **Replication.** The change in the second period for L against the first
   period for E, as a difference of paired gains with a bootstrap percentile
   interval resampling participants (the unit that was sampled), as
   `tools/evaluation-summary.mjs` already does for a single pair of files.
3. **Secondary (RQ2, RQ3).** The same model for the model-reading subscale and
   for T2 on T0. Holm correction across the three secondaries.
4. **Missing data.** Primary analysis: students with both T0 and T1, analyzed
   in the arm assigned. Sensitivity: multiple imputation (50 imputations) of
   T1 given T0 and arm; and a worst-case bound that gives the Gravitas arm's
   missing T1 scores the control arm's lowest observed quartile.
5. **Item-level sanity check.** A logistic model of each item response with
   person and item random effects and an arm term. It guards against the total
   being driven by one broken item. No per-item hypothesis tests.
6. **Dose (RQ4).** Rank correlation of hints taken and attempts with T1,
   adjusted for T0, in the Gravitas arm only. Described, never tested as
   causal.
7. **Assumption checks, reported.** Residual plots, pre-test and post-test
   score distributions by arm (ceiling and floor), baseline balance table.

### 1.7 What counts as a null

Fixed in advance, with three outcomes and never a fourth:

- **Supported.** The 95% interval for the adjusted difference excludes zero in
  favor of the sequence and the replication difference points the same way.
- **Null for effects of the size that matter**, if the result is not
  Supported. The upper end of the 95% interval is below d = 0.5. This does not say the sequence does nothing. It says an effect
  as large as the one chosen as worth detecting is not supported by these data.
- **Inconclusive.** Everything else, including an interval that spans zero and
  0.5. An underpowered study that finds nothing is reported as inconclusive,
  not as a null.
- A difference favoring the usual activity, with the interval excluding zero,
  is reported as exactly that.

## 2. Instrument validation plan

The trial does not start on the instrument as it stands. Parts 2.1 to 2.5 come
first and **end in a freeze**: after it no item, option or key changes, and the
version number is recorded in every export. Item changes made with trial data
in hand would turn the instrument into the thing being fitted.

### 2.1 What the twelve items are, and what is already known about them

Already measurable without a student (computed from `js/data/evaluation.js`):

- **Key positions.** The key is option a once, b five times, c six times and
  d never. A student who guesses c scores above chance, and option d is dead.
- **Key length.** The correct option is the longest on 8 of 12 items. Chance
  would put it there on three. A student who has learned that cue can score
  well on those items without the physics.
- **Alignment.** Seven items map to a stated objective of the three
  investigations; five (q07, q08, q10, q11, q12) test reading the model and
  come from the model page, not from an objective of the sequence. Nine of the
  sixteen objectives have no item (Appendix B). The four "domains" have three
  items each, which is too few to report as separate scores (2.4).

These are defects of a first draft and are expected. They are listed so the
plan starts from them rather than from a hope.

**Version 2, a draft (2026-10-11).** Carl approved repairing the first two
defects and the alignment gap in the instrument itself while the outside
steps stay skipped (D-STUDY-05). The result is `concept/2`, sixteen items in
`CONCEPT_ITEMS_V2` of `js/data/evaluation.js`, printed in section 3b of
`/evaluation/`:

- **Key positions.** Exactly four each of a, b, c and d.
- **Key length.** The correct option is the longest on 2 of 16 items (ties
  counted, so the figure is the cautious one) and the shortest on 2 of 16. No
  distractor was padded: the options were rewritten, and where a correct
  option is short its distractors were left as short.
- **Alignment.** All sixteen stated objectives of the three investigations
  have exactly one item (Appendix B.2). The five model-page items of version 1
  are not in it, so RQ2 has no items until a set for it is written (2.5).
- **Checks.** `tests/conceptV2.test.js` fails if the key unbalances, if the
  correct option is the longest or the shortest on more than a quarter of the
  items, if an objective loses its item, if the two versions' ids stop being
  disjoint, or if a computed key stops agreeing with a recomputation of the
  physics. Version 1 stays readable and fails that rule on purpose.

`concept/2` is a **DRAFT**. It has had no expert review, no student
interview and no calibration, and its items may still change. The conditions
of D-STUDY-02 for fixing an instrument stand exactly as written: two-educator
review, think-aloud, a calibration of 150 or more students outside the trial,
KR-20 at or above 0.60, corrected item-total correlation at or above 0.20.

### 2.2 Phased plan

| Phase | Work | Who is needed | Output |
|---|---|---|---|
| V0 | Expert review (2.3), then revise | Two astronomy educators who did not write the investigations | Rated items, a revision log |
| V1 | Cognitive interviews: five to eight students think aloud through each item | Students at the target level | Items students misread, distractors nobody picks |
| V2 | Calibration administration: the revised draft, pre-instruction, in sections **not** in the trial | At least 150 students, two or more institution-terms | Item statistics (2.4) |
| V3 | Revise on V2 statistics, freeze, version `concept/2` | The project | Frozen instrument and a validation report |
| V4 | Trial (section 1) | The trial's instructor | Data |

V2 can use the same students as a prior term of the trial instructor's
course, so long as they are not the trial's students.

### 2.3 Expert review

Two astronomy educators, independent, each rating every item on the sheet in
Appendix C (printable from the kit):

- **Alignment**: which objective the item assesses, and how well (1 to 4);
- **Accuracy**: is the key correct, and is each distractor wrong, in the
  physics the model page states for Gravitas (including its stated
  simplifications);
- **Clarity**: a student could misread it without misreading the physics (1 to 4);
- **Distractor plausibility**: would a student with a documented
  misconception choose it;
- **Missing**: objectives the set does not assess that it should.

Two raters cannot produce a stable content-validity index, so the plan reports
both raters' ratings in full, the proportion of items rated 3 or 4 on
alignment by **both**, and the disagreements, which are discussed and recorded
with the outcome. An item rated below 3 by either rater on alignment or
accuracy is revised or replaced. A third educator adjudicating disagreements
is better than two and is recommended, not required.

### 2.4 Item analysis, reliability and the sample it needs

On the calibration data (V2), pre-instruction, then again post-instruction:

- **Difficulty** (proportion correct): pre-instruction between 0.15 and 0.70
  and post-instruction between 0.30 and 0.90. An item every student gets wrong
  or right both times is a candidate for removal, not a finding.
- **Discrimination**: the corrected item-total correlation (the item against
  the sum of the other items), retained at 0.20 or above, flagged below 0.15.
  Upper-lower (top and bottom 27%) as a cross-check.
- **Distractor analysis**: every distractor chosen by at least 5% of
  students, and chosen more by low scorers than high. A distractor nobody picks
  is rewritten.
- **Reliability**: KR-20 and omega for the total, with their intervals, and the
  standard error of measurement in score units. Target **0.60 or above for a
  group comparison**. Twelve items cannot reach the 0.80 an individual decision
  would need, and the instrument is **never used to place or grade a student**.
- **Dimensionality and subscales**: three items per domain cannot yield a
  reliable subscale. Unless a longer item set delivers at least eight items per
  scale, only the total and the aligned total are reported. A factor analysis
  (on tetrachoric correlations) is run only at 300 or more students.
- **Sample.** About 150 gives a standard error near 0.08 on a discrimination of
  0.2 to 0.3 (an interval half-width about 0.15), and near 0.05 on a KR-20 of
  0.6. That is why V2 asks for 150, and why a calibration of 60 to 120 (the
  five-to-ten-students-per-item rule of thumb) is a smoke test, not a
  validation. A one-parameter item response model needs 200 or more and is
  optional.

### 2.5 Adding, replacing and versioning items

- Aim for **20 candidates** and retain 12 to 16: write at least eight new items
  for the objectives with none (Appendix B), each with misconception-based
  distractors taken from the think-aloud interviews and from the published
  literature on orbital reasoning, with options in a randomized order and no
  option systematically longer than the rest.
  - **Draft done, 2026-10-11 (`concept/2`).** Twenty-one candidates were
    written or kept: the twelve of version 1 and nine new items, one for each
    objective that had none. Sixteen are retained, chosen by alignment: the
    seven version 1 items that assess an objective, rewritten, and the nine
    new ones, so each of the sixteen objectives has one item. The five
    model-page items were not retained because they assess no stated
    objective. That leaves RQ2 (reading the model) without items; the
    options are to write a model-reading set from the model page's statements
    or to drop RQ2, and neither is decided here.
  - **Distractors.** Each is meant to be a documented misconception, and
    Appendix B.2 says, distractor by distractor, where it is documented and at
    what level of evidence. Of the 48, **25 have no source I could verify**:
    they are plausible wrong answers, not documented misconceptions, and the
    think-aloud interviews are what is to confirm or replace them. They are
    not presented as documented.
  - **The key and the length.** Balanced at four each, and the correct option
    is neither the longest nor the shortest on more than a quarter of the
    items; both are enforced by a test. Options are in a fixed order in the
    draft; randomizing the order per printed form remains below.
- **Replace** an item that fails two of: difficulty, discrimination, expert
  accuracy or alignment. **Revise** one that fails one. Keep every decision in
  a revision log with the statistic that prompted it.
- **Rebalance the key** across a, b, c and d, and print forms with option
  order randomized per form, so a position cue cannot work.
- **Versions.** A changed item set is `concept/2`; `concept/1` stays readable.
  The draft already carries that name, as a draft: its ids (`r01` to `r16`)
  and export columns are disjoint from version 1's, an export names its version
  in the `instrument` column, a score is only ever computed against the key of
  the version the sheet was written for, and the summary tool reports the two
  separately and never pairs across them. A participant code that appears on
  both is reported as a problem. Whether any later revision is called
  `concept/2` or `concept/3` is left to the review, since the name now belongs
  to the draft.
  Scores from different versions are never pooled without at least six
  unchanged anchor items. A parallel form B built from the same blueprint
  reduces the testing effect and also keeps the form in use out of the public
  repository.
- **Spanish.** A translation is not an equivalent instrument. The Spanish
  forms are not part of the first study and are not claimed valid; equivalence
  needs its own review and calibration. The page prints a Spanish text for the
  sixteen draft items beside the English, consistent with the rest of the page,
  and says on the page that it is a project draft translation, not reviewed by
  a fluent reader, and not equivalent to the English. The page's Spanish is
  inline in the markup, not a catalogue indexed by position, so appending a
  section shifted nothing.

### 2.6 Relation to established concept inventories

The project's items are its own, written from its investigations' objectives.
They are not copied from, adapted from, or scored against any published
inventory, and the plan keeps it so.

- **Construct mapping, not borrowing.** Published inventories in astronomy
  education (the Astronomy Diagnostic Test, the Lunar Phases Concept
  Inventory, the Star Properties Concept Inventory, the Light and Spectroscopy
  Concept Inventory) and the Force Concept Inventory in physics (as the model
  of building distractors from documented misconceptions) are read for which
  constructs they cover, to find where the orbits unit overlaps and where it
  does not. Where it overlaps, the project's item is written afresh.
- **Convergent evidence, only with permission.** If an inventory's owners
  permit, a subset of its items on orbits can be given to the calibration
  sample (V2) alongside the project's items, and the correlation between the
  two totals reported. The expectation is moderate (a correlation near 0.4 to
  0.6), because the overlap is partial; a very high one would mean the
  project's items add nothing, and a very low one would mean they measure
  something else. Neither outcome is a failure to report.
- **Transfer.** The same subset is the plan's check on alignment bias (1.4):
  items the sequence's authors did not write.
- Reference details for those instruments are to be checked against the
  primary sources before they are cited in any write-up. This file does not
  reproduce them.

## 3. Data handling and the review path

### 3.1 What is collected, and de-identification

- **Instrument sheets** (paper or the kit's on-screen forms): the occasion,
  the participant code and the answers. The kit has **no column** for a name,
  email address, student number or institution (`CONCEPT_COLUMNS` in
  `js/data/evaluationShape.js`; a test forbids one).
- **Participant codes** are chosen by the student and kept on a slip the
  student keeps; nobody holds a list linking codes to names. A student who
  loses the slip is unpaired, and the summary tool counts them as such. A code
  collision is reported, not merged. Two additions for a study, both within the
  same rule: the code is built from the kit's word list, never from personal
  facts, and a short recovery cue chosen by the student (not recorded) is
  suggested on the slip.
- **Fidelity checklist** (instructor): no name or institution field. For a
  study the section label is a letter (E, L) and the term a season, not a
  course number.
- **Demographics.** None collected. The pre-test is the only covariate, so
  there is no cell small enough to identify anyone. If a funder or reviewer
  asks for any, they are banded (prior astronomy course: yes or no) and
  reported only in cells of ten or more.
- **No linkage to records.** The plan does not link scores to grades,
  grade-point averages or any education record. Those are protected under the
  Family Educational Rights and Privacy Act (FERPA) in the US, and linkage
  would need consent and a data steward. The instrument score never enters a
  student's grade.

### 3.2 Who does what, and sees what

| Role | Sees | Never sees |
|---|---|---|
| Student | Own sheets and code | Anyone else's, the key |
| Instructor | Fidelity checklist, aggregate class results after grades are submitted | Which students consented, individual sheets, codes with names |
| Independent administrator (a colleague or graduate student, not in the grading chain) | Consent forms, sheets, codes | Grades |
| Analyst | The de-identified dataset and scripts | Consent forms, names |
| Public (after review) | The de-identified dataset, materials, scripts, registration | Anything above |

The independent administrator exists because consent that is genuinely
optional is difficult when the person asking also assigns the grade. The
instructor does not know who took part until after final grades.

### 3.3 Retention, storage and export

- **Paper sheets**: kept in a locked cabinet until data entry is checked, then
  destroyed (shredded), unless the IRB sets another period.
- **Consent forms**: stored apart from sheets, for the period the IRB sets
  (US federal rules commonly require at least three years after the study).
- **Digital data**: the kit's CSV or JSON export, schema `1`, on an
  institution-approved encrypted drive, no email, no consumer cloud.
  Responses from students who did not consent are destroyed unread.
- **Release**: the de-identified dataset, the materials, the registered
  analysis script and the frozen instrument, deposited in a public repository
  after the IRB agrees, whatever the result.
- **Export formats**: kit CSV and JSON as they are (`evaluation-1.schema.json`).
  Section 4 lists the additions a study would want, as proposals.

### 3.4 The institutional review path

The kit's page already says that classroom improvement is not automatically
research and that review is the instructor's responsibility. For a study:

1. The instructor (the principal investigator for the institution) writes the
   protocol from sections 1 and 3 and submits it to **their own institution's
   review board** before any data is collected. Retrospective approval is
   usually unavailable.
2. The board decides the category. Studies of normal educational practice or
   educational tests whose records cannot identify students are sometimes
   exempt in the US under the federal Common Rule, but **only the board
   decides** and an exemption does not remove the consent-process questions in
   3.2. This file makes no determination.
3. The consent script is written in the board's template, in English and
   Spanish if both populations are enrolled, with the statements that
   participation does not affect grades, that the instructor does not know who
   participates, and that withdrawal is possible until the codes are separated
   from the sheets (which, by design, ends individual withdrawal after
   collection: the consent text says so).
4. Training certificates and any collaboration agreement with a second
   institution are the board's own requirements.
5. The registration (Appendix A) is filed after approval and before T0.

## 4. What the platform must log without telemetry

Gravitas transmits nothing. Study data from the platform therefore reaches the
analyst only as a **file a consenting student chooses to hand over**: the
lab report, its submission token, or an export from My work. Nothing below
changes that.

### 4.1 What the report and the token already carry

From the submission token (`sdk/schemas/submission-token-2.schema.json`) and
the progress backup inside it:

| Fact | Where | Limits |
|---|---|---|
| Attempts per step | `progress.attempts` | A count; no times, no classes of mistake |
| Hints taken, per step and per rung (`h1`, `h2`, `h3`, or `concept`, `method`), and the worked answer shown | `<investigation>:<step>:help` keys in `progress.responses`, printed as "Help taken" (see `SCAFFOLDING.md`) | Which rung, not when |
| Every response | `progress.responses` | |
| Steps visited | `progress.visited` | The set, not the order |
| Start and last-save times | `progress.startedAt`, `savedAt` | **Elapsed clock time**, not active time: it includes lunch, a closed laptop and an overnight gap |
| Locale, depth setting | `fl`, `dp` | |
| Evidence ledger digest and the first rows | `ev` | Not a time measure |
| What the student attached | `sy` | |
| Roster-style label from the instructor's link | `r` | "Not identity" by design |

**A privacy hazard to name.** The progress backup carries a `student` field,
"the name the student typed, exactly". The token carries the backup whole, so a
study that extracts from tokens **must drop that field** before any other
step. It is listed here because the kit's guarantee (no name column) does not
extend to a token handed over as it is.

### 4.2 What is missing, as bounded proposals

None of these is built here. Each is opt-in per export, shown to the student
before they hand a file over, written only to the file the student keeps, and
needs its own prompt, tests and review. Estimated cost is in new fields, not
in a new route.

| Id | Proposal | Study use | Privacy review |
|---|---|---|---|
| L1 | An optional `pc` field in the token: the student's kit participant code, entered by the student on the report page behind an explicit consent checkbox | Joins the instrument to the platform log without a roster | The code is already anonymous; the checkbox text says it links the two files |
| L2 | Active seconds per step (`:t` keys): foreground-visible time, idle gaps over 60 s excluded, capped at 30 min per step | Time on task that is not clock time | No timestamps of day; only a per-step total; stored in the same progress record |
| L3 | The answer class of each attempt (`close`, `wrong-unit`, `wrong-sign`, ...), at most eight per step, from `answerClass()` | What kinds of mistakes, for RQ4 and item review | The classes are not answers; no free text |
| L4 | Number of sessions and the dates of first and last (day granularity) | Distribution of work over time | Day only, never time of day |
| L5 | Evaluation export schema 2: `occasion` extended to `t0`/`t1`/`t2`, a `form` id, a `section` letter, an `instrument` version | The study's own design as data | Fields are letters and ids; a test that no column can hold a free-text identifier |

Not proposed, deliberately: keystroke or pointer logging, anything
identifying a device, any automatic upload.

## 5. What a first study can and cannot show

**Can show**, if it runs as designed: whether, in one course at one institution
in one term, students who did this three-investigation sequence scored
differently on this pilot instrument (validated or not, as the report must say) than students given that
instructor's usual activity, with the size and the uncertainty; whether the
difference appeared again when the sections swapped; whether it persisted
three weeks; how the instrument behaved (reliability, item statistics); and
how much of the platform's own record (hints, attempts) is usable for a study.

**Cannot show.** Whether the sequence works in other courses, levels,
languages or hands; that it beats the best available alternative (only that
instructor's usual one); that any feature (a hint ladder, a simulator, the
sonification) is responsible for a difference; durable learning beyond three
weeks; transfer to topics the items do not cover; anything about adoption or
usability, which are reported apart; or anything at all under D2 about
causation, where the arm and the section are one thing. Spanish forms are
outside it.

**How results are reported, whatever they are.** The registration, the
instrument and its validation report, the materials, the de-identified data and
the analysis script are published together. The write-up states the design that
ran (D1 or D2), enrollment, attrition by arm, every deviation, and the
outcomes in the three classes of 1.7. A null and an inconclusive result are
published with the same prominence as a positive one. The platform's pages
change only to the extent a preregistered outcome supports, in the form:

- Supported: "In one section of an introductory astronomy course, students who
  did these three investigations scored X (interval) points higher on the
  project's twelve-item pilot instrument than students given the instructor's
  usual activity. One instructor, one term; see the study."
- Null: "A study found no difference as large as X in one section ..."
- Inconclusive: "A study was run and could not tell."

The teaching page's present sentence stays until one of those is true.

## 6. Recruitment requirements

None of these exists, so none of the plan can start. Each is a person
outside this project, and Carl needs to find them.

1. **An instructor** teaching an introductory, algebra-based, non-majors
   astronomy course, willing to run the sequence in the orbits unit and the
   usual activity in the other, **with two sections or six or more lab or
   recitation groups**, at least 120 students across them. (D1 if six groups;
   D2 if two sections; fewer is not a study.)
2. **Their institution's review board** and the instructor as principal
   investigator, with a start date that leaves the board's turnaround before T0.
3. **Two astronomy educators** who did not write the investigations, for
   expert review (a third to adjudicate if possible).
4. **An independent administrator** at the instructor's institution to collect
   consent, run the tests and enter data.
5. **A calibration sample** of at least 150 students in two or more
   institution-terms, not in the trial, and five to eight students for
   interviews.
6. **Optional but wise:** a statistician to read the registration before it is
   filed.
7. **Time.** One term for V0 to V3, the next for V4, plus review lead time.
   About two terms from the day a named instructor agrees.

A pilot without a named, consenting participant is reported as awaiting one,
and blocks nothing else.

## Appendix A. Preregistration text (unfiled)

This is the text to file, with brackets to fill. **It has not been filed, and
no registration exists.** It becomes a registration only when filed on a public
registry, dated, after the review board's approval and before T0.

> **Title.** [A delayed-start comparison of a three-investigation orbits
> sequence against usual instruction on a conceptual instrument, in
> [one] section[s] of an introductory astronomy course, [term, year].]
>
> **Design as run (select one).** D1: [six or more] groups assigned at random
> [method, who, date] / D2: two intact sections assigned by one coin flip
> [who, date]. The unit of assignment is the [group / section].
>
> **Hypotheses.** H1 (primary): at T1, adjusted for T0, the mean score on the
> [aligned-item] score is higher in the arm that did the sequence. H2: the same
> for the model-reading items. H3: the T1 difference persists at T2 in the
> Early arm. H4 (descriptive): hints and attempts are associated with T1 in
> the Gravitas arm.
>
> **Population, setting, instructor.** [course, level, institution type]; [one
> instructor]; enrollment [N].
>
> **Conditions.** Gravitas: the investigations _Kepler's Laws_, _Bound,
> Unbound and Escape_, _Weighing the Stars_, [three] meetings of [N] minutes.
> Comparison: [the instructor's usual activity, described, archived].
>
> **Instrument.** `concept/[2]`, frozen on [date] after expert review (two
> educators) and a calibration administration (N = [N], [institution-terms]).
> Version, items, key and forms deposited at [location] before T0.
>
> **Primary outcome.** The proportion of the [k] aligned items answered
> correctly at T1. **Secondary:** the model-reading items at T1; total at T2.
>
> **Sample size.** [N] analyzable per arm gives 80% power for d = 0.5 given a
> pre-post correlation of [r from calibration] and, for D1, an intra-class
> correlation of [rho]. If enrollment is below [threshold] the study is
> reported as a feasibility pilot without tests.
>
> **Analysis.** As section 1.6 of the design: linear model of T1 on arm and T0
> [with a random intercept for group / section confounded], HC3 interval,
> Hedges' g by pooled pre-test SD; Holm across secondaries; 50-imputation
> sensitivity analysis; bootstrap interval for the replication contrast. Script
> deposited at [location] before T1 data is read.
>
> **Exclusions.** Students without both T0 and T1 are excluded from the primary
> analysis only; students who did not consent are never entered. No outlier
> exclusion. No post-hoc subscales.
>
> **Interpretation rule.** Supported / null for d = 0.5 / inconclusive, exactly
> as defined in 1.7 of the design.
>
> **Deviations.** Recorded in a dated log and reported in full.
>
> **Review and consent.** Approved by [board, protocol number, date]. [No such
> approval exists at the time this template was written.]

## Appendix B. The twelve items against the objectives

Objectives are the ones each investigation states on its own card. "Domain" is
the kit's grouping. "Source" is the item's own `from` note.

| Item | Domain | Source note | Objective it assesses |
|---|---|---|---|
| q01 | orbital | Kepler: where the primary sits | Kepler 1: where the primary sits |
| q02 | orbital | Kepler: speed at periapsis | Kepler 2: fastest at periapsis, angular momentum |
| q03 | orbital | Orbital energy: escape is not the end of gravity | Energy 4: escaping does not mean gravity stopped |
| q04 | measurement | Kepler: P squared against a cubed | Kepler 3: P^2 proportional to a^3 |
| q05 | measurement | Weighing: total mass from size and period | Stars 4: total mass from orbit size and period |
| q06 | measurement | Weighing: splitting the total | Stars 3: compare masses by barycenter distance |
| q07 | model | Model page: displayed sizes | none (model page) |
| q08 | model | Model page: two dimensions | none (model page) |
| q09 | model | Orbital energy: bound is negative total energy | Energy 2: total energy below zero means trapped |
| q10 | illustration | Model page: simulated and drawn | none (model page) |
| q11 | illustration | Model page: the spacetime view | none (model page) |
| q12 | illustration | Model page: a number off a picture | none (model page) |

**Objectives with no item (nine of sixteen):** Kepler 4 (predict a period from
the third law and say what its constant depends on); Energy 1 (what happens to
a launched object past the escape point), Energy 3 (escape speed at the
Earth's surface), Energy 5 (how escape speed changes with mass and starting
distance), Energy 6 (decide from a path whether a real object is bound);
Stars 1 (why both stars move), Stars 2 (what the barycenter is and where it
sits), Stars 5 (splitting a measured total between two stars), Stars 6 (why
binaries are how astronomers know what stars weigh).

The consequence for the trial is the choice in 1.2: the primary outcome is the
aligned items, not the twelve, until the item set covers the objectives.

### B.2 The draft `concept/2` against the objectives

Objectives are numbered in the order each investigation lists them on its own
card. Each of the sixteen has one item.

| Item | Objective | Key | Option lengths (a to d) | Computed |
|---|---|---|---|---|
| r01 | Kepler 1: where the primary sits | c | 28, 43, 39, 51 | no |
| r02 | Kepler 2: fastest at periapsis, angular momentum | a | 92, 101, 96, 90 | yes |
| r03 | Kepler 3: P^2 proportional to a^3 | d | 88, 34, 22, 52 | yes |
| r04 | Kepler 4: predict a period, what the constant depends on | b | 42, 11, 58, 7 | yes |
| r05 | Energy 1: path as speed rises past escape | a | 62, 83, 60, 57 | no |
| r06 | Energy 2: total energy below zero means trapped | c | 46, 47, 47, 47 | yes |
| r07 | Energy 3: escape speed at the Earth's surface | d | 49, 38, 48, 41 | yes |
| r08 | Energy 4: escaping does not mean gravity stopped | b | 35, 63, 47, 69 | no |
| r09 | Energy 5: escape speed against starting distance | b | 59, 61, 54, 66 | yes |
| r10 | Energy 6: decide from a path whether an object is bound | d | 36, 39, 36, 47 | yes |
| r11 | Stars 1: why both stars move | a | 58, 71, 55, 79 | no |
| r12 | Stars 2: what the barycenter is and where it sits | c | 35, 29, 38, 47 | yes |
| r13 | Stars 3: compare masses by barycenter distance | c | 31, 54, 31, 56 | yes |
| r14 | Stars 4: total mass from orbit size and period | a | 14, 15, 14, 12 | yes |
| r15 | Stars 5: split a measured total | b | 23, 23, 23, 27 | yes |
| r16 | Stars 6: why binaries are how astronomers weigh stars | d | 88, 70, 71, 78 | no |

"Computed" items are recomputed in `tests/conceptV2.test.js` from the physics
(Kepler's third law, vis-viva, the barycenter, escape speed), most also by a
two-body integration, and each distractor is checked to differ from the key.
The key is not printed on the page. The flag is `computed: true` in the data
and a test checks that the flagged ids are exactly these. Three are computed in
a weaker sense than a number: r02, where the angular-momentum and energy
relations behind the key are checked at both apsides; r03, where the slope it
states is checked; and r10, where vis-viva for a path with a negative
semi-major axis (a hyperbola) is checked to give a positive total energy, from
which the keyed word "unbound" follows.

r07's stem says the engine is off after launch. Without that, option c ("no
minimum") is true for a rocket under continuous thrust, so the item had two
defensible answers (found in review of PR #272). With it, escape speed is the
speed at the end of the burn. Option c now reads "any speed will do, given
enough time", which is rated N: the Force Concept Inventory's active-force
category was a loose fit for it and no source was found.

Two limits of coverage. Energy 5 has one item, on distance; it does not test
mass. Stars 6 is a reasoning item whose key is a statement, not a number.

**Where each distractor's misconception is documented.** Levels, strongest
first:

- **L**, in a published source I opened and read: Williamson, Willoughby and
  Prather (2013), "Development of the Newtonian Gravity Concept Inventory",
  *Astronomy Education Review* 12, 010107 (its Boundary model, in which
  gravity ends at the edge of the atmosphere or at some distance; its
  finding that students treat gravity as a property of one body rather than a
  mutual attraction, and that only the larger mass matters; its
  distance-against-distance-squared error, found for the force); and Hestenes,
  Wells and Swackhamer (1992), "Force Concept Inventory", *The Physics
  Teacher* 30, 141 (Table I: motion implies an active force, velocity
  proportional to force, greater mass implies greater force). The Force
  Concept Inventory's categories are about motion in general, so applying them
  to an orbit is an analogy, not a finding about orbits.
- **G**, in the project's own instructor guide for the investigation
  (`js/data/instructorContent.js`, the misconceptions lists of Kepler's Laws,
  Bound, Unbound and Escape, and Weighing the Stars). The guide names no outside
  source for these, so G is the project's own classroom claim, not a
  literature citation.
- **A**, an arithmetic or proportional-reasoning slip (for example one over the
  distance for one over its root). It is a predictable wrong answer, not a
  documented misconception, and the Newtonian Gravity Concept Inventory
  reports the analogous slip only for force.
- **N**, no source located. A plausible wrong answer I wrote; to be confirmed
  or replaced by the think-aloud interviews.

| Item | Distractor (letter): misconception | Level |
|---|---|---|
| r01 | a: star at the center of the ellipse | G |
| r01 | b: star at the point of greatest speed | N |
| r01 | d: a second star at the other focus | G |
| r02 | b: gravity stronger, so speed follows the force | L (FCI, by analogy) |
| r02 | c: speed is constant | G |
| r02 | d: fastest when farthest, where the pull is weakest | N |
| r03 | a: period proportional to the axis | A |
| r03 | b: same mass; c: circular orbits | N |
| r04 | a: the constant is the same everywhere | G |
| r04 | c: a heavier star makes it slower | N |
| r04 | d: period proportional to the star's mass | A |
| r05 | b: the orbit stays closed but larger | N |
| r05 | c: gravity has stopped acting | L (NGCI boundary model) |
| r05 | d: a larger circular orbit | N |
| r06 | a, b, d: gravity always pulls; negative potential means bound; mass is needed | N |
| r07 | a: about 1 km/s; b: orbital speed taken for escape speed | N |
| r07 | c: no minimum, any speed escapes given time | N |
| r08 | a: no pull at all | L (NGCI), G |
| r08 | c: the pull becomes a push | N |
| r08 | d: the pull switches off beyond a critical distance | L (NGCI distance threshold), G |
| r09 | a: escape speed is one number for a planet | G |
| r09 | c, d: one over the distance, one over its square | A |
| r10 | a, b, c: bent path, close pass, long period, each taken to mean bound | N |
| r11 | b: heavier star pulls harder, only the lighter moves | L (FCI, NGCI), G |
| r11 | c: big star held by its own gravity | N |
| r11 | d: heavier star feels more force so moves more | L (FCI), G |
| r12 | a: halfway; d: at the heavier star | G |
| r12 | b: 3 AU, the reversed distance | N |
| r13 | a, b, d: reversed ratio; equal mass because one period; period needed | N |
| r14 | b: one star's own distance used as a | G |
| r14 | c, d: a^3 over P; a over P | A |
| r15 | a: reversed split; | N |
| r15 | c: equal split | G |
| r15 | d: ratio squared | A |
| r16 | a: mass from brightness | G |
| r16 | b: mass from color; c: binaries are heavier | N |

The count by the strongest level: 6 L, 10 G, 7 A, 25 N, of 48 distractors.
**I could not verify, and do not claim, that half of the distractors are
documented misconceptions.** The two papers' existence and subject were
confirmed by a search; the NGCI and FCI statements above were read in the
papers' own text. Sadler (1998), *Journal of Research in Science Teaching* 35,
265, and Bailey and Slater (2003), *Astronomy Education Review* 2(2), 20, are
the usual references for distractor-driven items in astronomy and a review of
the field; their existence and topics were confirmed, but they were not read
item by item here, so no distractor is attributed to them.

## Appendix C. Expert review sheet

One row per item; the kit prints a blank copy (section 7 of
`/evaluation/`). Each rater fills it alone.

| Item | Objective assessed (id) | Alignment 1-4 | Key correct? (y/n) | Any distractor correct? (item, option) | Clarity 1-4 | Distractors plausible? (y/n each) | Comment |
|---|---|---|---|---|---|---|---|
| q01 to q12 | | | | | | | |

Scale: 1 = not aligned or unclear, 2 = weakly, 3 = mostly, 4 = fully. After
the twelve rows: the objectives the set should assess and does not.
