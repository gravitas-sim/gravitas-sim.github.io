# Depth II gate

Roadmap IV, Prompt 327: may a deeper step of a lesson run the lesson's own
scene twice with one value changed (a controlled variation, `js/lesson/runs.js`)?
This is a gate. It decides on criteria fixed in advance, and it builds the
decision rule that every verdict needs. The verdict is recorded here and as a
decision-register row.

**Status of this file: thresholds committed, no prototype run.** The
machine-readable criteria are `tests/fixtures/depth-ii/thresholds.json`. Every
section of this file down to "Verdict and slices" is as committed before any
prototype existed. Sections written after the prototype ran are added below
that one and say so.

## The question and what is already known

`depth/world` (`js/authoring/depthRules.js`, `DEPTH.md`) forbids a deeper step a
`setup`, `stage` or scenario of its own, so a depth never changes the world a
lesson is about. It says nothing about `tool` or `variation`. A controlled
variation (`variation: {param, values, runFor, read, label}`) does not open a
world. It pins the step, runs the scene in force with one numeric key of its
`starPair` or `system` stage (or of a stage-free step's `setup.settings`)
changed, reads the named probe rows and then puts the whole scene back. The
restore uses the full-state path (`captureShareState`, kind `full`, with the
camera and `forExperiment`, then `applyShareState`). `tests/controlledRuns.test.js`
compares the restored world with the captured one directly: bodies, clock,
settings, camera and stage bookkeeping. An evidence snapshot is provenance,
not a restoration oracle, and is not used here.

The question is whether that run is safe and honest one level down: on a step
that only a quantitative or advanced reader sees, with a depth switch in the
middle of the lesson. The risks are lost answers or run rows, a scene not put
back, renumbered steps in a report, and stored links and records that stop
opening.

## The prototype

Built only on the spike branch `gate/depth-ii`, which is never merged.

- **Lesson:** `weighing-stars`, unchanged at core. Its baseline stages are
  the equal pair (`starPair` m1 2, m2 2, separation 4 AU) and the mystery pair
  (m1 3, m2 1, separation 4 AU), and it has no `setup`.
- **One added deeper step:** depth `quantitative`, laid `after:
  'one-on-your-own'`. That is a core step whose stage is the mystery pair, and
  every existing deeper step of the lesson is laid before it. The step carries
  no `setup`, `stage` or scenario.
- **The variation:** `param: 'm1'`, a key the stage in force has, with
  `values: [1, 3]`. `m2` stays 1 and the separation 4 AU. The run reads one
  probe row, `ratio`: Star B's distance from the barycentre divided by Star
  A's, with the stars named as the lesson's barycentre probe names them.
- **The analytic value:** for a bound pair about its barycentre the ratio of
  the arms is m1 / m2 at every instant, so 1 and 3 for the two runs.
- **The step's tolerance:** 2 percent relative, fixed here.
- **The decision the step asks for:** a prediction of the second ratio
  before the run, committed as 324's held prediction requires. It exists so
  that the prototype is a step with a student decision, not a computation.

## Criteria

Each criterion is measured on the spike, and passes or fails exactly as stated
here. A criterion that is not run is recorded NOT RUN, which counts as not
passed.

1. **Stored work opens.** Four compatibility rows are added to the corpus
   (`tests/compat/`), each made by the v3.0 build (`V3_COMMIT` in
   `tests/compat/harness.js`) for `weighing-stars` at depth `quantitative`
   and read by the spike build: a progress record with answers on core and
   deeper steps, an assignment link with a depth (`d`), a course-pack item
   pinned to the lesson (step-digest pin) and a submission token with a
   depth (`dp`). Pass: all four read without error, every recorded answer is
   read back on the same step id, the depth is honored, and no pin or
   fingerprint check reports a change.
2. **A depth switch loses nothing and the scene is put back.** In the
   lesson, with a held prediction committed, a reading taken and one run
   saved, the reader switches depth core → quantitative before the run and
   quantitative → core after it. Pass: zero answers, readings or run rows
   lost, and the core scene afterwards equals the scene with no run. The
   comparison is the direct full-state one of 324's restoration test: body
   positions, velocities and masses, clock, the settings a run may touch, and
   camera, equal to 1e-11 relative or 1e-12 absolute. Trails and the timeline
   buffer are not restored, and are stated as such rather than compared.
3. **Report numbering.** The report numbers steps as the student saw them.
   Pass: a core walk numbers every step exactly as the base does (step id →
   number identical). In the quantitative and advanced walks every deeper step
   that exists at the base keeps its number. The core steps laid after the new
   step move down by one in those walks, which any added step causes, and are
   listed rather than failed.
4. **The existing deeper steps pass the rules unchanged.** `author:check`
   over the catalog on the spike reports exactly the base's findings for the
   558 existing deeper steps (293 quantitative, 265 advanced at v4
   1f1235254; the roadmap counted 459 when it was written) (same rule, lesson, step and message), plus zero
   findings for the added step, under every `depth/*` rule and `ref/variation`.
5. **The variation agrees with the model.** Each run's read `ratio` is
   within 2 percent of m1 / m2 for the m1 that run used.
6. **Low-tier frame time.** The prototype step's scene during a run, at the
   low tier with CPU throttled 4x at 1440x900 (the `chromebook-proxy`
   conditions of `tools/perf-thresholds.json`), measured by the perf probe's
   frame measure, has a mean frame time at or under 8.0 ms. That is the
   profile's `frameMsThreshold` for `binary-pair`, its two-star scene.

## Verdict and slices

- **A** needs criteria 1 to 6 all passed. Part B may build slices 1, 2 and 5.
- **B** (tools only, each with a required decision) needs 4 and 6 passed,
  with any of 1 to 3 failed or NOT RUN. Part B may build slices 1, 3 and 5.
- **C** is anything else. The rule stays, Q5 is applied analytically, and
  Part B builds slices 1, 4 and 5.

Slices, as Prompt 327 Part B names them:

1. A rule `depth/decision` (proposal) fails a deeper step whose fields are
   all computed or copied, so every deeper step names what the student
   decides. Computed-only deeper steps become a ratchet whose baseline count
   is what the rule produces; the count may not rise.
2. `depth/world` admits `variation` on a deeper step naming a key of the
   setup or stage in force and nothing else. `DEPTH.md` says so, and the
   corpus rows are added.
3. No change to `depth/world`. A deeper step with a `tool` must name the
   student's choice, and the rule checks it.
4. `DEPTH.md` text only, besides slice 1.
5. No existing deeper step is rewritten. The rule's list goes to 332 and the
   batches, and Spanish and keys are unchanged.

In every verdict a deeper step still opens no `setup`, `stage` or scenario of
its own. A threshold, value, tolerance or slice here is never moved after a
result.
