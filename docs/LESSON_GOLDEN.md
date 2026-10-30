# The lesson-engine golden (Prompt 138)

`js/investigations.js` is cut into seams by Prompt 139. This is what those cuts
are judged against: a record of what the engine does today, for the smallest
set of investigations and classroom activity cuts that exercises every branch
the lesson data can select.

Nothing here changes behavior. A seam that moves a result fails
`tests/lessonGolden.test.js` or `e2e/lessonGolden.spec.js` with a diff.

## The coverage is derived

`npm run lesson:coverage` walks every investigation (every depth laid in) and
every activity format and lists the engine branches each one exercises as
feature tokens:

- the step types, and the check kinds (choice, short, numeric) with the shape
  of their answer, whether they carry a tolerance and a unit;
- every step key that is not prose (`explore.pauseAt`, `measure.compute`,
  `question.rubricCriteria`, ...), so a new key is a token nobody has covered;
- the depths a lesson has and the step types that only exist at depth;
- the lesson's locks, mathematics level, audience, prerequisites and languages;
- for an activity cut: the format, its context, whether the resolver added
  steps, the step types, kinds and depths it runs, and the first and last step.

A greedy set cover then picks the smallest set that covers every token (ties
by id, so the answer is deterministic). The result is
`tests/lessonGolden/coverage.json`; the table below is rewritten from it by
`npm run lesson:coverage -- --write`, and the test fails when either is stale.

Some engine paths are chosen by no lesson. The recorder runs each on every
member and `coverage.json` lists them under `enginePaths`: the four submission
token shapes (plain, with an assignment and roster id, with evidence, with a
depth), the saved record and a resume at a step id, the backup and its
restore, the evidence ledger, the author bar's clean step and step jump, and
the six pin statuses.

## What is recorded

**Node half** (`tests/lessonGolden/fixtures/node/`, English and Spanish):

- grading: a fixed answer set through `js/answerCheck.js` (every option of a
  choice; for a numeric step the exact answer, one inside and one outside the
  tolerance, with its unit, a non-number and a blank);
- the saved progress record `writeProgress` makes for a fixed set of right
  answers, and what `readProgress` reads back from it;
- the backup, its validation and what `restoreProgress` makes of it;
- the evidence ledger's record and digest for one fixed notebook entry;
- the submission token, decoded (the compressed bytes differ between Node
  versions, so the payload is recorded, with a check that the backup inside is
  the backup);
- for an activity cut, the assignment it builds, its resolved and added steps,
  its validation, and each pin status.

**Browser half** (`tests/lessonGolden/fixtures/dom/`, English and Spanish): for
each investigation, at every depth it has, the panel's title, subtitle, step
markup and navigation state for the first step, the first graded step
unanswered, the same step answered correctly, and the last step; for each
activity cut, the same at its core depth. Each screen is reached the way a
returning student reaches it (saved progress, then the lesson opened) in a
fresh page, so nothing depends on a click landing.

## Rerecording

A rerecording accepts every difference between the golden and the engine, so
both commands refuse unless asked by name, and are done on purpose in their own
commit with the diff read:

```bash
npm run lesson:coverage -- --write
npm run lesson:golden -- --regenerate-lesson-golden
npm run lesson:golden:dom -- --regenerate-lesson-golden
```

The browser half takes about seven minutes on the private port.

## The table

<!-- coverage:start -->

| # | Investigation | Tokens it adds |
|---|---|---|
| 1 | `keplers-laws` | 84: `audience:intro`, `check:choice/number`, `check:numeric/number+tolerance+unit`, `check:short/undefined`, `depth-step:advanced/question`, `depth-step:quantitative/measure`, … |
| 2 | `goldilocks-question` | 22: `depth-step:advanced/measure`, `depth-step:advanced/read`, `key:explore.allowInspector`, `key:explore.pauseAt`, `key:explore.setup`, `key:explore.stage`, … |
| 3 | `the-saturated-star` | 9: `depth-step:advanced/predict`, `depth-step:quantitative/read`, `key:measure.stage`, `key:predict.after`, `key:predict.depth`, `key:predict.hints`, … |
| 4 | `transit-photometry` | 9: `check:numeric/number+tolerance`, `key:explore.clearLightCurve`, `key:explore.lightCurve`, `key:explore.observerAngle`, `key:measure.lightCurve`, `key:question.agrees`, … |
| 5 | `what-is-a-gravitational-wave` | 5: `audience:beginner`, `key:predict.tip`, `key:read.checklist`, `lock:{"placement":true,"inspector":false,"areaSweep":false}`, `math:arithmetic` |
| 6 | `butterfly-effect` | 3: `key:explore.rubric`, `key:predict.requires`, `lock:null` |
| 7 | `binary-star-planets` | 2: `key:explore.requires`, `lock:{"placement":true}` |
| 8 | `black-holes` | 2: `key:question.checklist`, `key:read.explainView` |
| 9 | `propose-an-observation` | 2: `key:measure.plan`, `key:question.rubricCriteria` |
| 10 | `weighing-stars` | 2: `key:explore.showBarycenter`, `key:read.showBarycenter` |
| 11 | `a-universe-of-stars` | 1: `key:measure.checklist` |
| 12 | `counts-to-magnitudes` | 1: `depth-step:quantitative/predict` |
| 13 | `detect-this-planet` | 1: `key:read.allowInspector` |
| 14 | `extending-an-experiment` | 1: `key:measure.compute` |
| 15 | `measuring-the-moon` | 1: `key:question.maxUncertainty` |
| 16 | `power-law-gravity` | 1: `key:question.explain` |
| 17 | `radial-velocity` | 1: `key:measure.setup` |
| 18 | `retrograde-motion` | 1: `lock:{"placement":true,"inspector":false}` |
| 19 | `weighing-the-stars-for-real` | 1: `key:predict.misconceptions` |

| # | Activity cut | Tokens it adds |
|---|---|---|
| 1 | `orbital-speed/lab` | `assignment:cut`, `assignment:resolver-added`, `context:lab`, `cut-depth:core`, `cut-first:read`, `cut-kind:question/choice`, `cut-kind:question/short`, `cut-last:question`, `cut-type:ellipse`, `cut-type:explore`, `cut-type:measure`, `cut-type:predict`, `cut-type:question`, `cut-type:read`, `cut-type:wedges`, `format:lab`, `lecture:no`, `lesson-lock:{"placement":true,"inspector":true}` |
| 2 | `binary-planets/route` | `context:individual`, `cut-first:explore`, `format:route`, `lesson-lock:{"placement":true}` |
| 3 | `orbital-speed/demonstration` | `context:projection`, `cut-last:wedges`, `format:demonstration`, `lecture:yes` |
| 4 | `star-sizes/route` | `cut-first:predict`, `lesson-lock:{"placement":true,"inspector":false,"areaSweep":false}` |
| 5 | `orbital-speed/guided` | `format:guided` |

<!-- coverage:end -->
