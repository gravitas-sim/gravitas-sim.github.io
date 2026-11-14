# Step-policy gate

Roadmap IV, Prompt 446: may a number read in the sandbox depend on how fast a
screen draws? This is a gate: it decides on numbers fixed in advance, and
builds nothing. The verdict is recorded here and as a decision-register row.

**Status of this file: thresholds committed, no candidate measured yet.** The
machine-readable form is `tests/fixtures/step-policy/thresholds.json`. This
section was committed before any candidate existed; the sections after it
(the measurements and the verdict) are added in later commits of the same
change and never edit this one.

## The question and what is already known

The page takes one physics step per frame, sized by the frame: the frame's
seconds, clamped to 0.05, become simulated time scaled by `sim_speed * 50 * DT`
(`frameAdvance`, `js/timestep.js`), and only a scenario with `max_timestep`
above zero is split into at most 64 equal pieces (`substepPlan`). 35 of the 61
scenarios have `max_timestep` 0, so for them the step is the frame. The
recorded results of that policy (S0) are in
`tests/fixtures/reference-cases/record.json`, with the step study at fixed
steps of 1/24, 1/48, 1/96 and 1/192. They are the evidence this file chooses its
candidates from; none of them is a result of a candidate below.

## Candidates

A candidate other than S0 changes only the 35 scenarios whose
`max_timestep` is 0. A scenario with its own cap keeps its present plan under
every candidate; that is how "a scenario's own cap where it has one" is read,
and it is why R2, R3 and R4 (capped) are identical to S0 under every candidate.

| | Step | Plan |
|---|---|---|
| S0 | the frame's advance | as it is: `substepPlan(frameAdvance, max_timestep)` |
| S1 | at most 1/24 | `max_timestep` = 1/24 in the 35 uncapped preset rows; the plan is the unchanged `substepPlan` |
| S2 | h = 1/24 | `planFrame` with h = 1/24 |
| S3 | h = 1/48 | `planFrame` with h = 1/48 |
| S4 | h = 1/96 | `planFrame` with h = 1/96 |

`planFrame` is the one new piece of arithmetic: `acc = carry + advance`;
`n = min(64, floor(|acc| / h + 1e-9))` pieces of exactly h, signed like `acc`;
`carry = acc - n h`; the carry is zeroed when the sign of the advance changes.
At most 64 pieces a frame, with the remainder carried: where the limit binds the
step is never lengthened, simulated time falls behind the clock, and the report
says on what share of frames and by how many steps. A frame whose advance is
under h takes no step and keeps its advance.

Every h has its row in the step study (the study is the evidence for the
choice of h). On the measured hard-encounter case the study has 4.67, 2.56,
1.25 and 0.64 percent at 1/24, 1/48, 1/96 and 1/192 against a 2 percent bound
(first order in the step for a symplectic Euler scheme, an inference the study
repeats), so only S4 can reach verdict A, and S1 to S3 can reach B only on a
slice without R4x. A higher-order scheme or another h is a candidate only if it
is added to this file, with its study row, in a commit that precedes its first
run. None is added.

## Thresholds

Each candidate is judged at 120, 60, 30 frames a second and at the clamp, each
run stating its step. The bounds of R1 to R5 and R4x are 445's, unchanged
(`tests/fixtures/reference-cases/thresholds.json`).

| | Threshold | Reason |
|---|---|---|
| T1 | R1 to R5 and R4x meet 445's bounds at each rate, except the R5 fragment leg (460, carried remainder) and R6 (496), which are reported only. Capped cases (R2, R3, R4) are unchanged by every candidate and read from S0's record | the project already accepts that error and no more |
| T2 | R1, R2, R3: the end-state position error, as a fraction of a, differs between any two rates by at most 0.005 | 0.5 percent of a is 1.5 px on a 300 px orbit, under the smallest drawn radius, 2.75 px (`js/bodyVisuals.js:154`) |
| T3 | R4x: the bound is met at each rate and the pre-encounter energy error differs between rates by at most 0.02 (2 points) | the same 2 percent |
| T4 | mean frame time of each sandbox reference scene the changed set holds, at both profiles (`sandbox-scenes-full`, `sandbox-scenes-low-cpu4` of `tools/perf-thresholds.json`), is at most 1.5 times the baseline | the ratio of `tools/perf-thresholds.json` |
| T5 | world golden: `bodies` and `camera` digests of all 61 rows equal, `settings` digest changed only in rows the candidate names; a seeded link made on the base for each named row rebuilds equal t = 0 bodies; an old saved world restores with its stored `max_timestep`; each stated | no stored record, link or golden changes meaning without a stated, tested migration |
| T6 | every lesson step reading a live scene from a scenario the candidate changes: its own `validate` accepts the candidate's value at all four rates; any other step is listed for revision under 7.8 and the verdict says which prompt carries it (345) | a changed number is a changed answer |
| T7 | two bench runs with `setFixedStep` are bit-identical; the reliability check still halves the real step; `tools/seeded-step.mjs` is equal with and without `--effects`; `tools/reversibility-probe.mjs` unchanged | the instruments the bench and the lessons rest on |
| T8 | `validate:physics` 442 of 442 and unchanged; all 61 scenarios run 600 frames at each rate without a NaN or a throw | no scenario that breaks |

How each is read, fixed here before any run:

- **T4 instrument.** `npm run perf` with `--scene`, three runs of 5 s a scene,
  the median, with the frame driven as a 60 Hz screen drives it
  (`render.setFixedStep(1/60)`). With the frame cap lifted and real elapsed
  time, a policy that steps by elapsed time takes almost no step per frame and
  the instrument could not see its cost. The baseline is the lower of (a) the
  recorded `measuredFrameMs` of that scene and profile and (b) the median of S0
  measured by the same instrument in the same session, interleaved with the
  candidates, so a candidate is never judged against a baseline that carried
  more load than it did. The machine and the load average are stated beside
  every number. A scene whose scenario the candidate does not change is not
  judged.
- **T6 is a bill, not a bound.** A step that does not accept is listed with
  its prompt and does not by itself change the verdict, because the
  consequence of A or B is that 345 re-derives the listed steps. Each row says
  "accepts" (with four values) or "listed" (with the reason: NOT RUN where a
  browser run is needed).
- **T5 for a code policy.** S1 names its rows. S2 to S4 are keyed to
  `max_timestep` = 0 in code and name no row, so the `settings` digest must be
  equal in all 61 rows; the way an old link or saved world runs (not what it
  builds) is stated.
- **T2, R3.** The runner reports R3's end-state error as nothing; it is
  computed on the spike if the two-body reference allows and otherwise
  recorded NOT RUN. R3 is capped and identical under every candidate, so this
  cannot change the choice.

## Slices and the verdict

- **B1:** the uncapped scenarios a lesson names as the scene a step runs in,
  recounted at the base from `tools/lesson-scene-audit.mjs` and the lessons'
  `scenario` fields: `solar-system`, `earth-moon-system`,
  `tidal-disruption-event`, `three-body-sensitivity-lab`. Reference cases:
  R1, R4x, R5. B1 holds `three-body-sensitivity-lab` (butterfly-effect names
  it), so B1 needs R4x met.
- **B2:** the uncapped scenarios in which no pair of bodies comes closer than
  the softening floor (`minInteractionDistance`) at the end of any of 600
  frames at 60 fps under S0, seed 1, on every list of bodies. The members come
  from that baseline run and are listed with the measurements.

**A:** one candidate meets T1 to T8 on all 35. **B:** one candidate meets them
on a named slice only; on a slice, T1 to T3 judge each reference case whose
scenario is in the slice and report the others unjudged, T4 is read on the
reference scenes the slice holds (a slice that holds none: its scenario with
the most bodies, against S0 measured the same way), T5 to T7 judge the slice's
rows, T8 applies whole. A slice that holds none of R1 to R5 and R4x cannot be
B. **C:** otherwise; C stays a real outcome. A is preferred to B; where several
candidates pass, the verdict names the one with the largest step, and where one
passes more than one slice, the slice with the most scenarios; every other
passing pair is an alternative. Consequences, exactly: A or B, 458 builds the
named candidate on all 35 or on the slice and 345 re-derives the listed steps;
C, 458 is recorded NOT RUN with the reason, and 461 states the dependence with
this file's numbers beside timed readings and on the model page. 460 and 496
proceed in every verdict.

## Conditions

Seed 1 and the page's builder, stepped inside the engine's seeded stream as the
445 runner does. The reference cases are CPU-time counts and do not depend on
the machine beyond rounding; every timing names its machine and load. No timing
runs beside another job. The spike branch (`spike/step-policy`) holds the
candidates in the runner and, for T4 only, in the render loop; it is never
merged, and this change edits no preset row, no loop and no engine file.
