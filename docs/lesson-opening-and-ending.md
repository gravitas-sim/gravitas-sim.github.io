# The lesson as a whole: opening, medium, ending

The rule a lesson follows for how it opens, where it happens and how it ends,
written as it was tried on the five pilot lessons (six lessons: Kepler's Laws,
Finding Planets by Their Shadows, Measuring the Moon, Io's Fire with Tides That
Move the Moon, Weighing the Stars). The code is `js/lesson/opening.js` (the
check and the ending's rows) and `js/investigations/ending.js` (the finish
dialog's section). The tests are `tests/lessonOpening.test.js` and
`e2e/lessonEnding.spec.js`. The rule is opt-in: a lesson that states neither
`question` nor `medium` is not checked, and keeps the finish dialog it had.

## Opening

A lesson states its question in its data, `question`, in both languages.

- The first sentence of the first step **is** the question, word for word.
- The second sentence says what the student will do and with what, and names
  the lesson's medium by the words in `medium.name`.
- Neither sentence answers a question the lesson asks later. A method, a
  direction or a result that a later prediction or question asks for stays out
  of the opening (leak rule L3). Two pilots needed this: Measuring the Moon
  does not say where a scale comes from, and Weighing the Stars does not say
  how a star is weighed or that both stars move.
- What used to come first (history, motivation, background) moves after the
  first thing the student does, into the first `read` step that follows it,
  or is cut where a later step already says it.

**Measure.** At 1366×800 and 375×812, in English and Spanish, the end of the
second sentence lies inside the visible part of the lesson panel with nothing
scrolled (`e2e/lessonEnding.spec.js`). A miss is fixed by shortening the two
sentences, never by moving the panel (the layout is not this rule's to
change).

## Medium

A lesson names one central medium, `medium: { kind, name }`:

| kind | When | The pilots |
|---|---|---|
| `scene` | the live view's dynamics answer the question | Kepler's Laws, Weighing the Stars |
| `instrument` | an instrument's readout, plot or table answers it | the transit lesson (the light curve), Io's Fire (the tidal heating instrument), Tides That Move the Moon (the tide model) |
| `image` | a picture the student marks and measures | Measuring the Moon (the Galileo picture) |
| `data` | a dataset the student reads | none of the pilots |

A `scene` medium needs the scene in force where the student first acts: a
`scene` canvas, or no canvas stated and a setup, stage or bind before that
step. The medium never sets or changes the canvas mode
(`js/lesson/canvasKind.js`): it states which of the things on screen is where
the answer is.

Io's Fire was expected to be a live-scene lesson, but the lesson as revised
holds Jupiter and Io as a portrait and measures on an instrument, so its medium
is the instrument and the portrait stays. Changing that is a content decision
for the lesson's owner, not this rule's.

## Ending

The finish dialog gains a section above the name field (the counts stay, below
it): the lesson's question, then the student's own work in lesson order.

- Each prediction the student made (the option they chose, or their estimate
  with its unit).
- Each reading they took, with how it was taken: typed by them, or taken from
  a readout row, named.
- Each number they gave to a numeric question, and their own words to a short
  question.

It never shows a key, an expected value, a mark or whether an answer was right.
A multiple-choice check is a check of understanding, not evidence, and is left
to the report. A run with nothing recorded shows the question and one sentence
saying so. What comes next is the dialog's existing list.

The closing `read` step of a lesson no longer repeats the student's own
numbers, which the ending now shows. It says what the student's work cannot
show: what a result rests on, what the model leaves out, why the method matters
beyond this lesson.

## Where it fit

| Lesson | Opening | Medium | Ending | Read steps before the first action, before → after |
|---|---|---|---|---|
| Kepler's Laws | fit | scene | fit | 2 → 2 |
| Finding Planets by Their Shadows | fit | instrument | fit | 2 → 2 |
| Measuring the Moon | fit (scale held) | image | fit | 1 → 1 |
| Io's Fire | fit | instrument (see above) | fit | 1 → 1 |
| Tides That Move the Moon | fit | instrument | fit | 1 → 1 |
| Weighing the Stars | fit (method held) | scene | fit | 1 → 1 |

No step was added, moved, removed or given a new id: every change is a
rewording under the task-change contract, and the Spanish follows in
`lesson-text/`. The second `read` step before the first action in Kepler's Laws
(what is on screen) is orientation the first prediction needs. In the transit
lesson it is a survey of detection methods; moving it after the first transit
would be a reorder, and is left to the lesson's next content change.
