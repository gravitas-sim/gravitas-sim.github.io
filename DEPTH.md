# Progressive depth

Roadmap II, Prompt 72. One investigation serves introductory, majors and
advanced students through step depth, with one model and one truth behind every
depth. This is the rule set and what is covered.

## The idea

A step may declare `depth`: `core` (the default), `quantitative` or `advanced`.
A lesson declares the depths it offers in `depths`. A reader reads at one depth
and sees the steps at that depth or shallower; the others are hidden from Next
and Back and the step counter, but reachable through **Go deeper** and **Fewer
steps** in the panel. Nothing is cleared by a switch: every answer is keyed by
the step's id, and the saved progress records the choice (`depth`) and the
deepest depth the reader has been at (`deepest`), so a reader who returns to
core still has the deeper answers read back.

The depth is chosen, in this order, by an assignment or a course item (the
instructor's), by a link (`#investigation=<id>/<depth>`), by the student's own
choice, and by the course level (Prompt 52: introductory is core, majors
quantitative, advanced advanced).

The core steps stay in the lesson's own file and are unchanged. The deeper
steps are in `js/data/investigations/depth/<id>.js`, with their Spanish in
`depth/es/<id>.js`, and are loaded and laid in (`js/investigations/depth.js`,
`depthPure.js`) only when somebody reads at a deeper depth. A core reader
downloads nothing extra; that is what keeps the lesson routes inside their
ceilings.

## The rule set

`js/authoring/depthRules.js`, run by `npm run author:check` (which also runs
every per-step rule over the deeper steps, laid into their lesson):

| Rule | What it holds |
|---|---|
| `depth/offered` | `depths` starts with core, and each deeper depth offered has steps |
| `depth/anchor` | A deeper step is laid after a step that exists, and never behind a deeper one |
| `depth/closing` | The closing step is core at every depth |
| `depth/world` | A deeper step has no `setup`, `stage` or scenario: a depth never changes a scenario, a seed or an instrument's model |
| `depth/refs` | No step requires, reveals or follows a deeper one; core names no deeper step |
| `depth/earlier` | A computed field reads only earlier steps of no deeper depth (`compute(values, earlier)`): nothing is measured twice |
| `depth/uncertainty` | An uncertainty answer is numeric, with a finite answer and a positive tolerance |
| `depth/expectation` | A deeper step that `restates` a core numeric step carries the same answer and unit, within the core tolerance; one that `agrees` with a core computed field gets the value that field computes (by the lesson's own code) |
| `depth/translation` | Every deeper step has its Spanish, text for text |

## A number with its uncertainty

A `question` step with `kind: 'numeric'` and `uncertainty: true` is answered as
`value ± uncertainty` (also `+/-` or `+-`). It is correct when the interval
given overlaps the interval the tolerance allows and is no wider than
`maxUncertainty` (default twice the tolerance). A value alone is
`unreadable` (`needsUncertainty`), not wrong. No lesson offered this before.

## Where the depth is stated

| Surface | How |
|---|---|
| Assignment link | `d` (payload version 2); the builder has a depth picker and a set depth holds no deeper step |
| Course pack item | `depth` on lesson and assignment items; a lesson item links to `#investigation=<id>/<depth>` |
| Report | A Depth row, and only the steps read at that depth, numbered as the student saw them |
| Submission token | `dp`; the review page lays the deeper steps in, grades only that depth, and names it |
| Answer key | `answerKeyFor(lesson, depth)`; the instructor key prints core steps numbered as students see them and marks each deeper step by its depth |
| Library | The card says how many depths the investigation can be read at |
| Composer | A depth per step, a pack's `depths`, and the translation status of each depth |
| Pins | `stepFingerprint` has never read `depth`, so no pin or assignment fingerprint moves |

## Coverage

| Lesson | Core | Quantitative adds | Advanced adds |
|---|---|---|---|
| Kepler's Laws | 23 steps: the slope | Repeated readings of a period with their uncertainty; a weighted fit of P² = k·a³ to the table already filled in; a prediction given as value ± uncertainty (restates "Use the law") | Weighing HD 209458 from its period and orbit with the uncertainty carried through; why two independent methods agreeing on a period matters |
| Finding Planets by Their Shadows | 29 | The radius's uncertainty from photometric scatter; the radius as value ± uncertainty (agrees with the core radius field) | A forward model of the depth, with its uncertainty; whether a measured depth agrees with it |
| Weighing the Stars | 36 | The total mass's uncertainty from the readings of a and P; the mass as value ± uncertainty (agrees with the core total) | Which measurement limits the mass; one star's mass with an error bar |
| The Missing Mass | 33 | The dark-to-visible ratio's uncertainty; the ratio as value ± uncertainty (restates "How much of it is dark?") | Why two halo parameters are reported together; what would tell a halo from modified gravity |

The advanced Kepler step uses reference values for HD 209458 b that the
transit and radial-velocity investigations already use, and names the
radial-velocity analysis built into Gravitas, because the Observatory's
comparison instrument (Prompt 85) has not landed. When it does, that step is the
one to point at the TESS period.

## What is not done

The instructor materials bundle (`instructors/materials.enc.json`) is encrypted
with a passphrase this work does not have, so the committed bundle is stale until
the owner rebuilds it; its source digest sees the deeper steps.
