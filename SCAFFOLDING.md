# Scaffolding: hints, explainers and feedback

Roadmap II, Prompt 71. What a student is given when stuck, and what a wrong
answer is told, without leaking the answer.

## Hints

A step may declare `hints`: an array of at most three texts (a ladder), or
the original object of a `concept` hint then a `method` hint, which reads as a
ladder of two. A student asks for them one at a time (`I could use a hint`);
the worked answer (`worked`) is behind one more press. Each press is recorded
under the step's `:help` key (`h1`, `h2`, `h3`, or `concept`/`method`, then
`reveal`) and is a fact: the report prints it ("Help taken"), the submission
token carries it with the progress, and the review page counts it per step
and per report (`hints_taken`, `worked_shown` in both CSVs and the JSON).
It is never a penalty and `checkAnswer` never sees it. A reveal moves focus
to the hint shown and is announced in `#srStatus` with the hint's own words.

Hints are authored. `author:check` refuses a hint, a feedback text or a named
mistake that contains a number the step would accept, or (for a choice) the
right option's own words (`content/hint-leak`), in English and in Spanish.

## Feedback by outcome class

A numeric step may declare `feedback` with any of `correct`, `close`,
`wrong-sign`, `wrong-unit`, `wrong-order-of-magnitude`, `off`. The class is
decided by `answerClass()` in `js/answerFeedback.js` from what `gradeAnswer`
already decides, as a relationship between two numbers and nothing more:

| Class | When |
|---|---|
| wrong-sign | the answer's negative |
| wrong-unit | the parser refused the unit, or the number is the answer times a conversion (24, 60, 3600, 86400, 365.25, pi/180, km per AU, solar radii per AU and per Earth radius, or a reciprocal) |
| close | outside the tolerance but within three tolerances |
| wrong-order-of-magnitude | a factor of about eight or more out |
| off | anything else |

A named mistake (`misconceptions`) still wins over the class: it says what the
student did, the class only says which check to make. Class text shows in
`.inv-class`, a named mistake in `.inv-misconception`.

### Remediation is the deeper branch

The existing one-level remediation (`when: {sid, is}`) is unchanged and is
the deeper branch of the same idea: hints and feedback act inside a step;
`when` adds a whole step after an earlier graded step went a certain way. It
stays one level deep (the step it names is one every student reaches).

## Named mistakes by option

On a choice, `misconceptions: [{id, option, say}]` binds a wrong option to the
mistake it is; the wrong pick shows and announces `say`. Not on shuffled
options (their numbers move).

## Reflections

`type: 'question', kind: 'short', reflect: true`: a written step with no
rubric, no model answer, no hints and no marks. It is kept in the student's
progress (so in the token and the backup, as a written answer an instructor
reads) and printed in the report under "Reflection (not marked)". The review
page lists it with the other written answers.

## Explainers

`js/explainers.js` and `js/explain/en.js`, `es.js`: four answers per entry
(axes, what a feature means, what to read off it, what it cannot show), lazy,
fetched on first press, Spanish only for a Spanish reader.

| Where | Button | Keys |
|---|---|---|
| Docked instrument panel | `#investigationToolExplain` | the 17 instrument families (`FAMILY_IDS`, held equal to `LAZY_FAMILIES`) |
| Lesson measurements plot | `#investigationPlotExplain` | `plot-measure` |
| Ellipse panel | `#investigationEllipseExplain` | `plot-ellipse` |
| `createPlot` (hook `explain`) | `.plot-help` | `plot-series`, `plot-table`, `plot-log` (Observatory), `observatory-fit`, `observatory-archive`, `observatory-measure`, `plot-experiment`, `analysis-sweep` |

Declared but not yet reachable from a button, because their charts are still
Chart.js panels rather than the plot component (Prompt 64's migration will
give them the affordance): `plot-light-curve`, `plot-rv`, `plot-energy`,
`plot-compare`, `plot-bars`, `analysis-models`, `observatory-image`.

## Authoring and the composer

The investigation-pack and question-bank schemas accept the ladder, `feedback`,
`reflect` and option-bound misconceptions (additive within format version 1).
The composer edits a ladder (three fields), the six feedback classes and a
reflection toggle with the same Spanish status as other texts. The answer key
prints the hints, the feedback classes and the named mistakes for instructors.

## Coverage and inventory

The eight most-used investigations by the Library's sequences (score = number
of sequences it is in, plus the number of lessons that `needs` it, plus one
when it opens a sequence; ties by numeric steps). Authored: a ladder on each
numeric step and on a sample of choice steps, feedback on every numeric step,
and named options on two steps. The rest are the inventory for Prompt 97.

| Investigation | Library score | Numeric | Choice | With hints | With feedback | Status |
|---|---:|---:|---:|---:|---:|---|
| transit-photometry | 5 | 2 | 3 | 2 | 2 | authored (Prompt 71) |
| keplers-laws | 3 | 2 | 3 | 2 | 2 | authored (Prompt 71) |
| radial-velocity | 3 | 2 | 9 | 2 | 2 | authored (Prompt 71) |
| lagrange-points | 3 | 1 | 2 | 1 | 1 | authored (Prompt 71) |
| when-orbits-lock | 3 | 1 | 7 | 1 | 1 | authored (Prompt 71) |
| orbital-energy | 3 | 0 | 5 | 5 | 0 | authored (Prompt 71) |
| what-is-a-gravitational-wave | 3 | 0 | 4 | 4 | 0 | authored (Prompt 71) |
| hohmann-transfer | 2 | 6 | 3 | 6 | 6 | authored (Prompt 71) |
| butterfly-effect | 2 | 2 | 5 | 0 | 0 | inventory for Prompt 97 |
| detect-this-planet | 2 | 2 | 4 | 1 | 0 | inventory for Prompt 97 |
| binary-star-planets | 1 | 2 | 9 | 2 | 0 | inventory for Prompt 97 |
| goldilocks-question | 1 | 2 | 10 | 0 | 0 | inventory for Prompt 97 |
| gravity-assist | 1 | 1 | 6 | 1 | 0 | inventory for Prompt 97 |
| design-the-schedule | 1 | 0 | 4 | 0 | 0 | inventory for Prompt 97 |
| listening-to-spacetime | 1 | 0 | 1 | 0 | 0 | inventory for Prompt 97 |
| missing-mass | 0 | 4 | 4 | 0 | 0 | inventory for Prompt 97 |
| retrograde-motion | 0 | 3 | 7 | 0 | 0 | inventory for Prompt 97 |
| tides | 0 | 2 | 4 | 0 | 0 | inventory for Prompt 97 |
| black-holes | 0 | 1 | 11 | 0 | 0 | inventory for Prompt 97 |
| power-law-gravity | 0 | 1 | 5 | 0 | 0 | inventory for Prompt 97 |
| a-universe-of-stars | 0 | 0 | 4 | 0 | 0 | inventory for Prompt 97 |
| lives-of-stars | 0 | 0 | 4 | 0 | 0 | inventory for Prompt 97 |
| twelve-nights | 0 | 0 | 2 | 0 | 0 | inventory for Prompt 97 |
| weighing-stars | 0 | 0 | 10 | 0 | 0 | inventory for Prompt 97 |

Not done in the eight: ladders on every choice step (orbital-energy and
what-is-a-gravitational-wave have them on four to five; the others none), and
the 149 instructor misconception records in `js/data/instructorContent.js` have
not been given shared ids with a step binding yet; the step side
(`misconceptions[].id`, `option`) is in place for that retrofit.
