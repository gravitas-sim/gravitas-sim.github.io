# Leaving and coming back: what resume rebuilds

A student who closes the tab on a step and returns finds the same step with
the scene walking there would have left. This note says what "the same" means,
how it is checked, what the check found, and where the engine does not know.

## The rule, and where it lives

Opening an investigation at a step from its saved record (`openInvestigation`
in `js/investigations.js`) rebuilds the scene: it applies the nearest earlier
`setup`, stands the step's own `stage` and binds its roles, exactly as walking
to the step does. Two steps are not covered by that:

- A step with no `stage` clears the stage it finds (`bindStepRoles` calls
  `clearStage`). The memory note that such a step "keeps the previous stage" is
  wrong at this base: walking onto a stage-less step after a stage leaves the
  canvas without the stage's bodies (empty, where no setup is in force).
- Opening there from a record found nothing to clear, so it left whatever the
  reader's own sandbox held behind the panel (a random scenario with 44 bodies,
  in Weighing the Stars' last step and Listening to Spacetime's last two).

The engine now follows what walking does. `carriedStage` (`js/lesson/stage.js`)
finds the stage of the nearest earlier step on the depth's path, back to the
last setup; `goToStep` stands it first when the step is opened with a rebuild
(opening, Reset the scene) and `bindStepRoles` takes it down. No lesson's scene
was changed to make this so. The cost is one lazily loaded stage chunk on a
resume that would not otherwise have fetched it, which a student who walked
there had fetched already.

## What is compared

`e2e/resumeSceneKit.js` reads, in the page, the bodies (list, kind, name, mass,
radius, position and velocity), the simulation time, paused, the speed setting,
the pinned integration step, the stage key and its roles, the canvas kind and
the instrument's controls. `compare` then applies these rules:

- Bodies are compared by list, kind and name. Positions, masses, radii and
  velocities are compared only when both screens are paused at the same
  simulation time (to 1e-9 s, to a relative 1e-9): a scene that ran between two
  steps has moved, and a running one is not a function of the clock alone (a
  ring built by an instrument ran at the same simulation time with different
  phases).
  A scene that ran may have lost comets and debris the engine culls, so the
  resumed screen may hold more of those and nothing else.
- Paused, speed and the pin count only where the step states its clock: it
  declares a `setup` (every one declares `time`, #719), a `time`, or it is a
  reading step that holds the clock. A step that states nothing carries the
  reader's own play or pause from the step before, which a returning student has
  no record of; it is reported as carried, not as a difference.
- Instrument controls that an instrument moves itself (a cursor sweeping a
  curve, a position that advances) are left out; every other control is compared.
  A step whose instrument moves itself is not compared on bodies either: the
  star it stands is a function of how long the screen was looked at (Lives of
  Stars' neutron-star-scale showed a neutron star walked, a star resumed).
  Such a step is reported as carried.

## The sampling rule

`e2e/resumeScene.spec.js` generates one test per lesson at the core path and,
for the 98 lessons with deeper steps, one at the deepest path (which holds every
step of the shallower ones). Each walks the path with the Next button and
reopens it from a record at: the first and last step of the path, every step
that declares a setup, a stage, a bind or an instrument, the step after each of
those, and every step a deeper depth adds. `RESUME_ALL=1` compares every step.
`RESUME_LESSONS=a,b` limits the lessons. The middle depth is not walked on its
own; a step that is on it is on the deepest path too.

## What it found at the base (v4 69a644d5d, core path, 56 of 124 lessons)

Six lessons, five kinds of difference:

| Lesson | Step | Difference | Disposition |
|---|---|---|---|
| weighing-stars | say-how-the-weighing-worked | walked 0 bodies, resumed 44 (the sandbox's) | fixed: stage carried |
| listening-to-spacetime | what-they-actually-recorded, model-against-measurement | the same | fixed: stage carried |
| goldilocks-question | five steps | one comet fewer when walked | check rule: culled comets are not a difference |
| lives-of-stars, what-is-a-gravitational-wave, a-universe-of-stars | 18 steps | an instrument's moving cursor or position, and one control drawn late | check rule: moving controls are left out; the late control waits for its panel |
| keplers-laws | fast-and-slow-in-numbers, why-the-speed-changes, equal-areas-however-you-slice | running when walked (watch-it-happen runs the clock), paused when resumed | not a difference: the step states no clock; reported as carried |

## Differences understood and left

`e2e/resumeScene.spec.js` holds a short list, by lesson and step, of
differences it reports and does not fail on:

- `lives-of-stars` / `read-the-descriptions`: walking leaves the black hole an
  earlier instrument made. The step declares the same stage as the one before
  it, and a stage whose key is unchanged is not rebuilt, so the remnant stays;
  opening the step shows the star the stage declares. Changing it would rebuild
  stages on every step and discard what a student did with an instrument between
  two steps; it is left for the lesson's owner.

## More defects found on the way

An instrument that stands a remnant (the stellar evolution instrument) kept a
memo of the remnant it had stood, so reopening an investigation in the same tab
at such a step (white-dwarf-cooling, neutron-star-scale in Lives of Stars)
rebuilt the scene without the remnant: the instrument read "end" and the canvas
showed the star. It now stands the remnant again whenever the role does not hold
one.

An activity resumed from its address showed the investigation's title instead
of the activity's after a language change (the locale handler rewrote the title
and subtitle from the lesson). It now keeps the activity's title, and leaves
the subtitle (the activity's own words) alone. Found by the assignment check:
its depth, its five steps and its position survived; the title did not.

## The altered scene

`sceneAltered` (`js/lessonFrame.js`) answers whether the student changed the
bodies a step drew: a body placed (`EV_OBJECT_PLACED`), a burn applied (the
engine's intervention counter, `getInterventionEpoch`), or, after the student
pressed or typed outside the lesson panel, a body added or removed, three
seconds after the step drew. Running or pausing the
clock is not a change (a measurement may need it). It is memory only, set from
the student's own actions and read when a reading is taken and by the existing
once-a-second scene note, never per frame; nothing is stored. A stage the lesson
stands itself (an instrument restanding a pair) resets the baseline.

A measure step whose fields are all filled shows one line in a polite status
region while the scene is altered: "You changed the scene. Reset the scene to
measure from the start of this step." with a Reset the scene button (the same
action as the control in the panel). It does not block the reading or reset
anything; steps that allow placement are exempt because the lesson asks for it.
The note that says a scene is not kept while altered also offers "Back to this
investigation's scene", the same action. The words are in
`js/i18n/en.reset.js` and `es.reset.js` and arrive with the reset vocabulary,
only when the line is first needed.

Limits: a body edited by hand (a mass changed in the inspector) without a burn
or placement is not seen.

## What is said on a return

The note that a scene is rebuilt and last time's is not kept is said on coming
back to a step with a scene. Within a tab it is said only if the scene was
altered when the student left; after a closed tab nothing can say, because the
altered flag is never stored, so it is said as before.

## Continue on My work and the next item at a unit's end

Confirmed at the base: My work already shows "Where you left off" (the newest
item of the resume record) and a Resume control on each unfinished row, the
course home leads with Continue (the first unfinished lesson), and the finish
panel offers the next item of the course the student came from
(`js/investigations/next.js`). Nothing is added for them here. A separate
next-item control at the end of each unit on the course home is not built: it
needs a new rendering path in `js/courseHome.js` on a route that is over its
ceiling already; the measured cost is in the register row.
