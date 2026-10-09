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
| `<Activity name> feedback` | the row summary in words, with the instructor-entered parts labelled | Map to that item as feedback. |

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

Columns: `schema`, `submission`, `fingerprint`, `roster_id`, `assignment_id`, `name_as_typed`, `lesson_id`, `step_id`, `step_title`, `auto_verdict`, `entered_by`, `mark`, `points_possible`, `comment`, `response_status`, `response`.

One row per written answer that needs reading. `mark` is the instructor's
points, `comment` their words. Written answers are in the file only if the
instructor asks (`response_status` says which); the file is saved and reopened by
the instructor, never stored by the page.

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
- **Rubric data.** Prompt 79's rubric data does not exist yet; the review shows
  the marking note an investigation step already has and takes a free mark and
  comment. Prompt 79 can feed the same field.
- **Platform notes quote the platform's own labels** ("Assignments"), which are
  third-party names; they live in `js/teach/lmsNotes.js`, not in a catalog the
  terminology check reads. Everything a student reads uses activity,
  investigation and course.

## Staged

- "Add it to a course" on Library cards (the Library route has about 2 KB spare).
- Prompt 79's rubric data in the judgment view.
- Platform notes and gradebook layouts verified on live platforms.
- A scan test with a real phone camera (the encoder is read back by a separate
  decoder in `tests/qrCode.test.js`).
