# The instructor flow: Activity, Course, kit, review

Roadmap II, Prompt 77. One path for an instructor, with no learning platform
required and working beside one: build, hand out, collect, review, reuse.

## Flow map

```text
adoption page / Library                      (ADOPTION.md)
   |  "Make an activity from it"      /?assign=<investigation>       the activity builder
   |  "Add it to a course"            /studio/course/?add=<id>       the course builder, item in place
   v
activity builder  -- link, file, printable page -->  /teaching/kit/#<activity link>
   | "Add to a course"  /studio/course/?activity=<fragment>   (the code is kept)
   v
course builder --- course link / file ---------->  /teaching/kit/#<course link>
                                                          |
   distribution kit: student link, QR code, markup for a page, one-page handout (English,
   Spanish, or both), notes for Canvas / Moodle / Blackboard, reuse check
                                                          |
   student opens the link, works, saves the lab report as a PDF (it carries a token)
                                                          |
   /instructors/submissions/  (drop PDFs; also an activity or course file or link, to name them)
        by activity table  -  evidence tables  -  instructor judgment (marks)
        CSV / JSON as before  -  gradebook files: Canvas, Moodle, D2L Brightspace  -  marks file
```

Nothing is uploaded at any step, there is no LTI claim, and an LMS only ever
holds a link and receives a PDF.

## What was built

| Part of the prompt | Where | Notes |
|---|---|---|
| 1. Build an Activity / Add to a Course | `js/assignments/assignmentBuilder.js`, `js/coursePage.js` (`?add=`, `?activity=`), `tools/build-adoption-pages.mjs` | The builder is still the `/?assign=<id>` panel, not a page in Teach (see Decisions). It now explains the roster policy and offers the kit, a student view and the course builder. The adoption pages link the course builder with the investigation in place. The Library page does not (see Staged). |
| 2. Distribution kit | `/teaching/kit/`, `js/teach/kit.js`, `kitText.js`, `handout.js`, `lmsNotes.js`, `js/kit/qr.js` | Link, QR made in the browser, markup, handout in both languages, notes for three platforms |
| 3. Review and gradebooks | `js/submissionReview.js`, `js/gradebook/` | One canonical model, one adapter each, columns below |
| 4. Instructor judgment | `js/gradebook/marks.js`, the review page | A mark and a comment per written answer, a rubric note where the investigation has one, exported as `entered_by: instructor` |
| 5. Semester reuse | the kit's reuse check, the course builder's reviewed upgrade | An activity file re-opens with its steps checked and a new link can be issued; a course re-opens with its pins checked (COURSE_PACKS.md) |

## The roster id, and what a report can identify

A report's token proves which browser made the answers, not who typed them
(`js/submission/submissionToken.js`). The roster id is whatever the link carried,
and the activity builder's field is a class or roster **code**: one code on a
link is on every report made from it. So a gradebook file needs a choice, made
by the instructor and said on the page:

- **the roster id on the link**, right when each student has a link of their own;
- **the name typed in the report**, right when one class code covers everyone and
  students were asked to type their login or student number where the report
  asks for a name (the kit's handout and the text to paste say so).

Text is matched exactly after trimming, nothing is matched loosely, and a report
with no identifier is listed as left out and not guessed at. When a student
handed in more than once, one score is chosen by a named policy (`latest`,
`best` or `first`), and the row records how many attempts there were and which
counted.

## The canonical result model

`gradebookModel(records, options)` (`js/gradebook/model.js`) reduces the review
page's graded records to one row per student per activity. Every adapter reads
only this. Fields: `identifier`, `nameAsTyped`, `rosterId`, `activity`,
`lessonId`, `submission`, `savedAt`, `attemptsConsidered`, `attemptUsed`,
`checked`, `correct`, `autoPoints`, `instructorPoints`, `instructorMarked`,
`awaiting`, `instructorComments`, `points`, `pointsPossible`, `percent`,
`completion`, `changedSteps`, `evidenceMismatch`. A written answer with no mark is
counted as `awaiting`, never as zero, and the page and the Moodle feedback say
that the score is partial. Marks are bounded by the step's points.

Every file passes through `js/csv.js`, so a name or comment that starts with
`=`, `+`, `-` or `@` is disarmed, and a golden file holds one.

## The adapter columns

Written from each platform's documentation of its import and **not run against a
live platform**: import one student's row first. Golden files:
`tests/fixtures/gradebook/`.

### Canvas (Gradebook, Import)

| Column | Comes from | Note |
|---|---|---|
| `Student` | name_as_typed | What the student typed into the report; Canvas does not match on it. |
| `ID` | the identifier, when idColumn is ID | Empty otherwise. |
| `SIS User ID` | the identifier, when idColumn is SIS User ID | Empty otherwise. |
| `SIS Login ID` | the identifier, when idColumn is SIS Login ID (the default) | Empty otherwise. |
| `Section` | nothing | Always empty. |
| `<Activity name>` | points (or percent), one column per Activity | The second row holds the points possible. |

`idColumn` is `SIS Login ID`, `SIS User ID` or `ID`. The second row is `Points
Possible`. A column for an assignment that exists in Canvas must carry its number,
`Title (12345)`.

### Moodle (Grades, Import)

| Column | Comes from | Note |
|---|---|---|
| `ID number | Username | Email address` | the identifier; the header is the field idColumn names (ID number by default) | Map this column to the same field on the import page. |
| `Name as typed` | name_as_typed | Not an identifier; map it to Ignore. |
| `<Activity name>` | a percentage by default, or points | Map to a new or existing grade item. |
| `<Activity name> feedback` | the row summary in words, with the instructor-entered parts labeled | Map to that item as feedback. |

`idColumn` is `ID number`, `Username` or `Email address`. The default scale is a
percentage, because a grade item made by the import has a maximum of 100.

### D2L Brightspace (Grades, Import)

| Column | Comes from | Note |
|---|---|---|
| `OrgDefinedId | Username` | the identifier; the header is the field idColumn names (OrgDefinedId by default) | Written as it is, without the # Brightspace puts in front of an id in its own export. |
| `<Activity name> Points Grade` | points earned, one column per Activity | The grade item of that name must exist. |
| `End-of-Line Indicator` | the character # | On every row, as the importer requires. |

`idColumn` is `OrgDefinedId` or `Username`.

### Instructor marks (a file of its own)

Columns: `schema`, `submission`, `fingerprint`, `roster_id`, `assignment_id`, `name_as_typed`, `lesson_id`, `step_id`, `step_title`, `auto_verdict`, `entered_by`, `mark`, `points_possible`, `comment`, `response_status`, `response`; and, in a `/2` file only, `criterion`, `criterion_name`, `criterion_kind`, `criterion_weight`.

One row per written answer that needs reading. `mark` is the instructor's
points, `comment` their words. Written answers are in the file only if the
instructor asks (`response_status` says which); the file is saved and reopened by
the instructor, never stored by the page.

#### Rubric criteria (Prompt 172)

A written step can carry rubric criteria (`rubricCriteria`: a name and two to
five levels each). A criterion also says what it claims, in three optional
fields that are written only when set:

| Field | Values | Meaning |
|---|---|---|
| `kind` | `completion`, `correctness`, `reasoning`, `uncertainty` | what the criterion looks for: an answer that speaks to the question; an answer that agrees with the key within the step's stated tolerance; an explanation that is present and sound, judged by the instructor; the quantity's uncertainty stated. No `kind` means `reasoning`, which is what every criterion written before the field was. |
| `depth` | `core`, `quantitative`, `advanced` | the shallowest depth at which the criterion is marked; none means every depth. A report read at a shallower depth is not asked for it. |
| `weight` | a number above 0 and up to 10 | the criterion's relative share of the step's rubric fraction; none means 1. |

The answer key prints each criterion's kind, weight and, where set, the depth it
is marked from, with one note on what the four kinds mean, in English and Spanish
(`js/rubric.js`, `js/answerKeyDocument.js`, `js/data/instructorLabels.js`); a key
for one depth leaves out the criteria marked from a deeper one. On the review
page, each criterion's legend names its kind in words (`sub.judge.kind.*`).

On the review page, each written answer shows one mark and one comment per
criterion, inside the answer's own, and a criterion's points possible is its best
level's points (1 when its levels carry none). A criterion's mark is never added
to the answer's mark or to a gradebook score: the answer's own mark stays the
instructor's, and nothing already graded is regraded. `rubricFraction()` in
`js/gradebook/marks.js` gives the step's criteria as one weighted fraction (each
mark over its points possible, weighted) only when every criterion has a mark;
until then it says how many do. The class summary reads it.

When any written answer has criteria, the marks file is `gravitas.instructor-marks/2`:
the same columns, then `criterion` (`c1`, `c2`, ... the criterion's place among
the step's criteria), `criterion_name`, `criterion_kind` and `criterion_weight`,
and a row per criterion after the answer's own row, whose `points_possible` is
the criterion's. A file with none is `/1`, as before, byte for byte. A 2.0.0 build
refuses a `/2` file as "a marks file of a different version" and reads nothing
(proved in `tests/rubricSemantics.test.js`); it never reads a criterion's mark as
the answer's. The Canvas, Moodle and D2L files do not change: each has the
columns its platform's importer documents, none was tried with extra columns on
a live platform, and the kind is in the marks file's rows instead (D-R10-38).

**The marking note (F-8).** The lab report prints a written answer's marking
note (the sentence of what to look for) only when the activity asks for it:
`markingNote: true` on the activity (`js/data/activities.js`) writes `m: 1` on the
assignment it builds, and the report prints the note when it finds `m`. The
default is off for students; the answer key prints the note whatever the activity
says. An assignment link made without the choice is byte for byte what it was,
and a 2.0.0 build opens one that carries it and prints the note as it always did.
The assignment builder panel and the Studio do not offer the choice yet.

**Which sections start open (Prompt 167).** The lesson panel, an instrument panel
and the Settings dialog keep what a step does not ask about behind a "More"
section, shut at the survey depths and open at the advanced one. An activity can
choose for its students: `more: 'open'` or `more: 'shut'` on the activity
(`js/data/activities.js`) writes `mo: 'open'` or `mo: 'shut'` on the assignment it
builds, and the panels start accordingly. It is written only when set, so every
link made without it is byte for byte what it was, and a 2.0.0 build opens one
that carries it (proved in `tests/progressiveDisclosure.test.js`) and shows the
sections as it always did. It sets a starting point only: a student can always
open everything or fold it again, and what they last chose for a surface outranks
the activity. It never folds anything a step asks about: the task rule holds
whatever the activity says. No shipped activity sets it yet.

Pack authors write the three fields in an investigation pack or a question bank
(`gravitas.investigation-pack/1`, `gravitas.question-bank/1`); a 2.0.0 reader
refuses a criterion that carries one, naming the field (the boundary list,
`tests/compat/boundary.mjs`, `rubric-criterion-semantics`).

## The local class summary (Prompt 173)

The review page draws one picture of the reports it holds, beside the table of
each report, from the same graded records and nothing else
(`js/instructorSummary.js`, the markup in `js/instructorSummaryView.js`, the
plot in `js/instructorSummaryPlot.js`). It is computed in the page. Nothing is
sent, nothing is stored, and it leaves the page only as the one CSV
(`gravitas-class-summary-<date>.csv`, schema `gravitas.class-summary/1`, a long
table: a section, the investigation, the item, the measure, its value and the
count it rests on) or as the page printed (the Print button puts the summary
alone before the printer; Ctrl+P prints the whole page as it did).

Per investigation handed in it shows:

- how far the reports got (the share of steps visited) and the depths read;
- each step: how many reports answered, the share right of the answers Gravitas
  can check, and for a written answer how many the instructor has marked and
  their mean mark as a share of its points. A step nobody has marked says so
  and shows no mean;
- the rubric criteria of the written steps by what each claims (Prompt 172's
  kinds), as the instructor marked them, and the same by kind. A criterion's
  mark stays the instructor's reading and is still never added to a step's mark
  or to a gradebook score; nothing here changes grading;
- the wrong answers given most often (up to three a step, twelve shown, all in
  the CSV), a choice in words and a number as the student's number, with the
  misconception the investigation's author named for it where one is declared
  (`misconceptions` with a `say`, `js/answerFeedback.js`) and nothing where none
  is: a wrong answer is not explained by guessing at the student's thinking.
  The author's words are the investigation's English;
- the time the reports record: first opening to last save (`startedAt` and
  `savedAt` of the backup), in bands, with the median and the middle half. It
  includes every hour away and is not time on task, and says so on the page. A
  report that records no start is left out and counted;
- each measured quantity of the evidence tables (Prompt 150's record: the value,
  and the uncertainty as the row states it): one value from each report, ordered
  by value, drawn through the plot component (`js/plot/plot.js`) with the
  uncertainty each report states as a bar (a sigma as plus or minus one, an
  interval as its edges, none where none is stated), with the table of the same
  numbers. Limits, failed fits and "not constrained" are counted and not
  plotted; a table that does not match its digest is left out altogether and
  counted; a quantity with a single value is not a distribution and is said
  so. Gravitas does not combine the reports' values into one.

No name, roster id or file name appears in the summary, its markup or its CSV;
an exact duplicate is not counted and a repeated attempt is, each once, and the
page says how many of each. It describes what this class handed in: it is the
instructor's own picture, not a study of learning, and the evaluation kit links
it as that, distinct from any study (`/evaluation/`). The modules and their two
catalog fragments (`js/i18n/en.classSummary.js`, `es.classSummary.js`) are in the
idle tier with the instructor modules, so no first-visit byte moved.

## The minimal path and the next term (Prompt 168)

One built-in course, in about fifteen minutes (a plan: no class has been timed),
with no authoring. A walk the tests perform in both languages
(`e2e/minimalInstructorPath.spec.js`):

1. **Teach** opens on "One course in fifteen minutes" and lists the four courses Gravitas ships; "Use as is"
   opens `/studio/course/?use=<id>` with a panel above the editor.
2. **The panel** (`js/instructorTermView.js`) asks for a term (started with this season and year) and, on one
   press, makes the course for the class (`js/instructorTerm.js startTerm`): every lesson and assignment
   re-pinned to this build, every assignment given a fresh code and date and the term in its title, the
   public id carrying the term (`intro-astronomy-fall-2026`) so each term is a draft of its own. It shows the
   link for students (the course home's), a link to the kit, the course file to save and a plain report of what
   the re-pin found. The shipped course is not changed.
3. **The kit** gives the code to scan, the handout and the platform notes.
4. **Students** open the link: the course home says the term, the assignment opens in the lesson engine under
   its own title.
5. **The review page** reads the reports and, from the course file, names the activities; the gradebook files
   carry the activity's name with the term.

**Next term.** "Start a new term" on the course builder (and in the kit, for a course or for one activity)
does the same to a course already open or to a file: a new id, term, codes and links, today's pins, and
the report; the file it came from is untouched and its links open what they opened. An activity's new term
(kit) is the same: a new code, date and title.

**What "fresh keys" means.** A report carries the assignment id (`i`, dated, derived from the lesson, steps and
title); a student's answers are kept under a hash of the lesson, the steps and the title
(`keyForAssignment`, unchanged: "a new title is a new activity and re-keys on purpose"). The term in the
title therefore gives both a new code for the review page and a new place for a student's answers, so
a student who did the course last term starts this term clean and last term's answers stay where they
were. A whole lesson in a course has no assignment code: its progress is the lesson's, in the student's browser, and is
not separated by term (the panel says so when a course has no assignment).

**Archive** (review page). "Archive and clear" writes the reports as handed in (a token or a backup each),
the names they were grouped under, the term and the marks as one file, `gravitas.submission-archive/1`
(`js/instructorArchive.js`), then clears the page; opening the file on the page brings it all back through the
same readers, so grading is redone against this build. A 2.0.0 page given the file refuses it in words.
Nothing is uploaded and nothing a student holds is touched.

**On the student's side** a course opened from a link that names a term is noted (`gravitas_terms`, a
sidecar record read by My work: a line per course and term, so two terms are two lines). The note holds an id, a
title, the term and a time; no link, answer or name.

## A collection of saved items (Prompt 164)

When a whole course is more than an instructor needs, they save lessons, scenarios and datasets with the Library's Save button, open the distribution kit at `/teaching/kit/#collections`, put the items in order, write a sentence for each, pick a depth where an item has one, name the set and make a link or a file. It is a course package with `profile: "collection"` (COURSE_PACKS.md), so it travels as a course does and needs no server. A student who opens the link sees it on the course home and can keep it; it then shows in their Library and in My work. The order, notes and depths are kept on the instructor's saved collection as they change; the title and summary are written for the one being shared. Texts are the instructor's own words: once any text has Spanish, every text needs it, and the kit says which one is missing instead of translating. The kit's panel is a lazy instructor module (`js/instructorCollections.js`) and an older build of Gravitas, such as 2.0.0, cannot open the result.

## Budgets

The kit is a new route (`teach-kit`, measured, added by hand: D-BIND-07): 36.7 KB
in 5 requests from the sources, 24.8 KB in 1 from the build. The QR encoder, the
readers and the registry load only when a link is given. The gradebook adapters
are modules of their own, fetched when a button is pressed. No ceiling was raised.

## Decisions

- **The builder stays a panel.** The prompt calls it a page in Teach. Making it
  a page would put the investigation registry on a new route and was not needed
  for the flow; the panel and the kit page together do what the prompt asks.
- **Course context comes from the instructor's file.** A token never carries a
  course, and adding one would move the token and the report; the review page
  names activities from an activity or course file or link instead.
- **Rubric data.** Prompt 79 added rubric criteria; Prompt 172 gave them kinds,
  depths and weights and a mark of their own on the review page (above).
- **Platform notes quote the platform's own labels** ("Assignments"), which are
  third-party names; they live in `js/teach/lmsNotes.js`, not in a catalog the
  terminology check reads. Everything a student reads uses activity,
  investigation and course.

## Staged

- "Add it to a course" on Library cards (the Library route has about 2 KB spare).
- Platform notes and gradebook layouts verified on live platforms.
- A scan test with a real phone camera (the encoder is read back by a separate
  decoder in `tests/qrCode.test.js`).
