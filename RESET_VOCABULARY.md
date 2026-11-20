# Reset, restart and discard: one vocabulary

Two actions put an investigation back, and each is named by what it touches.
Every control, accessible name, tooltip, dialog line and help line that speaks
of either takes its words from `js/i18n/en.reset.js` and `js/i18n/es.reset.js`
(one key set, the same keys in both languages; `tests/resetVocabulary.test.js`
holds them). Later work that names either action (the report, the instructor's
kit, the interface-wide pass) reads the same keys and adds no third phrase.

## The two actions

| Action | English | Spanish | What it touches |
| --- | --- | --- | --- |
| `reset.scene` | Reset the scene | Restablecer la escena | The step's scene (its set-up scenario or its stage) and its instrument. Answers are not changed, and the control says so. |
| `reset.restart` | Start this investigation over | Empezar esta investigación de nuevo | The investigation's saved answers and readings. It also resets the scene, asks first with the count, offers a backup, and can be undone until the investigation closes. |

"Discard" appears only where something is truly lost: the confirmation's
button (`reset.ask.go`) and the sentence that says what discarding does
(`reset.ask.lost`). After a restart the notice says the answers were deleted,
because until the investigation closes they can come back.

## Where each word is used

- **The control beside the progress bar** shows `↺ Reset the scene` as visible
  text; that text is its accessible name. Its tooltip is `reset.scene.hint`
  ("Rebuilds this step's scene. Your answers are not changed."), or, on a
  picture or a quiet canvas, `inv.canvas.reset.portrait` and `.quiet` (the same
  sentence naming the picture or the instrument). After a press the toast says
  what it rebuilt: `reset.did.scene`, `.tool` or `.both`.
- **Off with its reason as text.** Where a step has no scene (no `setup` in
  force, no `stage`) and no instrument, the control is disabled and
  `#investigationResetWhy` says why (`reset.scene.none`); the button points at
  it with `aria-describedby`. It is on wherever there is anything to rebuild.
- **The panel's More** holds `reset.restart` (tooltip `reset.restart.hint`).
  Its dialog (`#investigationRestart`, `js/fragments/lesson-finish.html`) shows
  the count (`reset.ask.count`, with `reset.ask.parts` for the split), says the
  scene resets too (`reset.ask.scene`), for an activity says its saved answers
  go too and the instructor's version does not change (`reset.ask.assigned`),
  offers `reset.ask.backup` (the existing backup download), and confirms with
  `reset.ask.go`.
- **Help** (the panel's Help section, "Starting over") lists both actions with
  the same names and tooltips.
- **The sandbox's rail** inside an open investigation: its three controls are
  named "Leave this investigation's scene: ..." (`reset.leave`, tooltip
  `reset.leave.hint`) and handed back unchanged when the investigation closes
  (`railLeavesScene` in `js/investigations/vocabulary.js`). Outside an
  investigation nothing about the rail changes here.

## What the record does

- **Reset the scene** rebuilds the step's scene and instrument (the same
  `goToStep(..., {rebuild: true})` it always used) and clears only that step's
  instrument values. The saved record's answers, attempts and visited steps are
  not touched, and it never goes to step 1.
- **Start this investigation over** counts the saved answers and readings from
  the record (`countSaved` in `js/investigations/restart.js`: an answer is a
  step answered, a reading is one filled field of a measure step, answers kept
  from an earlier version of the investigation are included). On confirming it
  deletes the investigation's responses, attempts, visited steps and kept
  drafts, goes to step 1 and rebuilds its scene. Another investigation's record
  is never touched.
- **Undo** is a copy of the deleted record held in memory only. It is dropped
  when the investigation closes and is never written to storage, so a reload or
  a closed tab ends it. Undo puts the deleted answers back and goes to the step
  the student restarted from. It merges a step at a time: a step answered since
  the restart is kept whole, with its tries, and the older step is not mixed
  into it; text typed since also wins. A second restart before an undo keeps the
  first one's record (merged the same way when something was answered between
  them); with nothing saved the dialog says only that the place and the visited
  steps reset, and an undo gives them back. Another record opened since is
  never overwritten: the strip is dropped when an investigation opens.
- **An activity** (an assignment) keeps its answers under its own record; the
  confirmation says they go too and offers the backup. The instructor's pinned
  version of the activity does not change.
- **Compatibility:** no record, key or file format changes
  (`tests/compat/` passes unchanged).

## Not decided here

- The old audit said the circular-arrow control re-applied a `setup` only. In
  the tree this was built on, the control already rebuilds a stage and the
  instrument as well (`resetStepScene` calls `goToStep` with a rebuild), so the
  question "should it also re-apply a stage" is answered by what is there; this
  change records it and does not alter what the rebuild does.
- The sandbox tour's closing card still says "Reset restores the scenario as
  it shipped". It is read outside an investigation and belongs to the
  interface-wide pass.
