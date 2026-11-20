# Classroom entry: where every kind of link lands

A student who is given a link should land on the task and be able to tell what
to do first. This page records, for each kind of link and each kind of visitor,
what the page does, what it did before this change, and what remembers an
activity so that coming back resumes the activity and not the bare
investigation. It is read by anyone changing the front door, the link readers,
Home, the Library or My work.

Words: a student reads "activity" and "investigation", never "assignment" or
"lesson" (`tests/terminology.test.js`). The code keeps its own names
(`assignment`, `investigation`).

## The matrix

Walked in a locally served build at 1280 by 800 (and the three rows marked
phone at 412 wide), English; Spanish is walked for the dialog and the Library
line. "Lands on the task" means the investigation panel is open at step 1, the
title holds the keyboard focus and the panel's own line says "Step 1 of N". The
four visitors are: **fresh** (no stored keys), **returning** (the front door and
the introduction both seen), **first-week** (a first-week record kept, so a
plain visit opens Home in the mode, D-R10-277-01) and **unreadable** (a link the
page cannot open).

### A link that can be opened

| Link | Fresh | Returning | First-week | First action and the text a student reads |
|---|---|---|---|---|
| Investigation (`#investigation=<id>`) | lands on the task | lands on the task | lands on the task | Title focused; "Step 1 of 26"; the step's own directions |
| Investigation at a depth (`#investigation=<id>/quantitative`) | lands, at that depth | lands, at that depth | lands, at that depth | As above, "Step 1 of 29 · Depth: Quantitative" |
| Assignment (`#a1z...`) | lands on the task | lands on the task | lands on the task | Title is the instructor's; subtitle "3 steps of Kepler's Laws (26 in the full investigation)" |
| Activity (`#activity=<id>/<format>`) | lands on the task | lands on the task | lands on the task | The activity's title; "7 steps of Kepler's Laws" |
| Pack (`#i1z...`) | lands on the task | lands on the task | lands on the task | The pack's title; a notice that it is an instructor's version of the original |
| Course (`/course/?course=<id>`) | the course page | the course page | the course page | The course's title and its Continue button; the page reads none of the front door's keys |
| Observatory guide (`/observatory/?guide=<id>`) | the page, guide panel open at its first step | same | same | The guide's first step; the page reads none of the front door's keys |

Before this change the first three rows already landed for every visitor
(Prompt 308 made the front door let every link shape past the introduction;
`tests/linkShapes.test.js`, `e2e/classroomDefects.spec.js`). A plain visit is
unchanged: a fresh profile gets Home and the three-screen introduction, a
returning one the sandbox, a first-week profile Home in the mode
(`e2e/firstRun.spec.js`, `e2e/firstWeek.spec.js`). A link never shows the
introduction and never shows an extra screen.

### A link that cannot be opened

| Link | What the student saw before | What the student sees now |
|---|---|---|
| Assignment cut short | A toast for two seconds with a message id in it (`assign.error.That link is incomplete...`: the decoder's own sentence was used as a key) | The dialog: "That link looks incomplete. Mail clients sometimes break long links across lines." You may be able to fix it; the Library is the way on |
| Assignment from a newer build | A two-second toast | The dialog with the same sentence; reload is the way on |
| Assignment naming an investigation that is gone | Nothing at all: the sandbox, no message | The dialog: "That investigation could not be read."; only the sender can fix it; the Library is the way on |
| Assignment failing a check (wrong kind, no steps, a step gone, ...) | A two-second toast | The dialog with that reason; only the sender can fix it; the investigation on its own when the link names one that exists |
| Activity: unknown activity or format | A two-second toast pointing at the teaching page | The dialog with that sentence; only the sender can fix it; for a known activity, its investigation on its own |
| Pack cut short or invalid | A two-second toast | The dialog with that sentence; only the sender can fix it |
| Investigation id that does not exist | A two-second toast | The dialog: "That investigation link does not match an investigation."; the Library is the way on |
| Investigation at a depth that does not exist | Opens at the core depth, silently | Unchanged: it lands on the task at the core depth (the link names a task that exists; nothing was refused) |
| Course id that does not ship | "No course is open" (the empty page, no reason) | "This course cannot be opened", with "No course called ... comes with Gravitas." and the existing advice: ask for the link again or for the file |
| Observatory guide that does not exist | The page, silently | The page, with "There is no investigation called ... on this page. Choose one from the list below." above the list |

Every reason an assignment link can fail with has a plain sentence in both
languages (`assign.error.*`; `tests/classroomEntry.test.js` lists them).
The dialog never says whether work is saved; that is the status line's job.

## What remembers an activity

Home's and the Library's "continue" lines and My work's rows used to open the
bare investigation for a student who started from an assignment, because the
assignment lived only in the address fragment and the resume record held
`/#investigation=<id>`. Now the address the work was opened from is kept:

- **The progress record** (an assignment's `gravitas_assignment_<hash>`, or a
  pack's `gravitas_investigation_<id>`) gains one optional top-level string,
  `link`: the fragment (`#a...`, `#i...` or `#activity=...`), written only for
  work opened from one and kept when the same work is opened again without it.
  2.0.0 ignores a top-level field it does not know, and saves the record again
  without it, which only means the bare investigation is offered again
  (`tests/compat/boundary.mjs`, row `progress-link`). The schema stays 2.
- **The resume record** (`gravitas_resume`) holds the same address as the item's
  `route`, with id `assignment:<hash>` for an assignment or activity and the
  existing `investigation:<id>` for a pack. The only change to the record is the
  longest `route` it accepts: 4,000 characters instead of 240, because a link is
  the address (`RESUME_ROUTE_MAX`, `js/storage/local.js`; the same number in
  `js/welcome.js`). An older build drops an item over 240 characters and keeps
  the others.
- **Home** names the item "Continue the activity: <title>" (both languages);
  the **Library** does the same (`lib.continue.assignment`); **My work**'s
  activity rows get a Resume link from the progress record, so an activity
  older than the six the resume record keeps still resumes. A record made
  before this change has no link; reopening the original link once adds it.

Resuming opens the link, so the activity's depth, step list and pins come from
the link itself and the student lands at the step they left (progress is keyed
by the activity, as before). The link carries no answers.

## What the next prompts must adapt to

- **Version naming (364)** and **vocabulary (366)**: the dialog and the Home and
  Library lines use "activity" and "investigation" and say nothing about
  resetting; fold their words in at `js/fragments/lesson-finish.html`
  (`#linkNotice`), `lib.continue.assignment` and `js/welcome.js` `fillContinue`.
- **Saving (365)**: entry never says work is saved or lost; the status line is
  where that is said.
- **Leaving and coming back (367)**: the resume item for an activity has id
  `assignment:<hash>` and its `route` is the activity's link; code that reads
  `investigation:<id>` ids from the resume record (Home's `continueRows`, the
  Library's `titleOf`, My work's progress groups) must leave the other ids
  alone. `js/investigations/stepView.js` `noteWork` is the one writer; the link
  comes from `openInvestigation(id, { link })` and is checked by `ENTRY_LINK`.
- Nothing here depends on a shared capability (no reading capture, no neutral
  start, no linked views): there is no narrower form to adapt to.

## Not done, and not verified

- A returning student who opens the Library on a profile whose activity was
  started before this change sees the bare investigation until the original link
  is opened once.
- Keyboard-only and screen-reader walks of the dialog beyond axe and the
  focus checks in `e2e/classroomEntry.spec.js` were not run; Firefox and WebKit
  were not run.
