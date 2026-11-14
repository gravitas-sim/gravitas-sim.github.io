# Step-policy gate

Roadmap IV, Prompt 446: may a number read in the sandbox depend on how fast a
screen draws? This is a gate: it decides on numbers fixed in advance, and
builds nothing. The verdict is recorded here and as a decision-register row.

**Status of this file: verdict C.** The machine-readable thresholds are
`tests/fixtures/step-policy/thresholds.json`; the pinned results are
`tests/fixtures/step-policy/results.json`, and `tests/stepPolicyGate.test.js`
recomputes every pass and the verdict from them. Everything from "The question
and what is already known" to "Conditions" is as committed in 82520272b, before
any candidate was run, and has not been edited since; the sections after it
(the measurements, the verdict, the bill) were written afterwards. The
candidates were built and run on `spike/step-policy` (2e8e264db) and
`spike/step-policy-s1-rows` (be7700496); neither is merged and this change
edits no preset row, loop or engine file.

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

## Measurements

Measured on an Intel Core i5-10500 with 24 GB, macOS, Node 22.23.4, headless
Chromium (Playwright 1.64). The reference-case legs are CPU-time counts and do
not depend on the machine beyond rounding; the frame times do, and say so.

### T1 to T3: the reference cases at four rates

Run with 445's runner and bounds, the frame plan replaced per candidate
(`node tools/reference-cases.mjs --policy Sk` on the spike). S0 is 445's record.
R2, R3 and R4 are capped scenarios: under every candidate their 60 rows equal
S0's (checked row by row), so they are always judged and always pass. R5's
fragment leg and R6 are reported only.

| Candidate | R1 energy / bound at 120 | R1 end-position error, four rates (percent of a) | R4x energy, four rates (percent; bound 2) | R5 position, four rates (percent; bound 1) | judged rows failing |
|---|---|---|---|---|---|
| S0 | 1.74e-06 / 3.47e-06 | 0.0773 / 0.309 / 1.24 / 2.78 | 4.67 / 7.73 / 16.8 / 25.7 | 1.08 / 2.14 / 4.24 / 6.24 | 8 |
| S1 (cap 1/24) | 4.34e-07 / 8.68e-07 | 0.0193 / 0.0343 / 0.0495 / 0.0773 | 2.56 / 3.31 / 3.88 / 4.67 | 1.08 / 1.08 / 1.44 / 2.14 | 8 |
| S1b (cap 0.0417) | 1.74e-06 / 3.47e-06 | 0.0773 / 0.0773 / 0.0773 / 0.0773 | 4.67 / 4.67 / 4.67 / 4.67 | 1.08 / 2.14 / 2.14 / 2.14 | 8 |
| S2 (1/24) | 1.74e-06 / 3.47e-06 | 0.0773 / 0.0773 / 0.0773 / 0.0773 | 4.67 / 4.67 / 4.67 / 4.67 | 2.14 / 2.14 / 2.14 / 2.14 | 8 |
| S3 (1/48) | 4.34e-07 / 8.68e-07 | 0.0193 / 0.0193 / 0.0193 / 0.0193 | 2.56 / 2.56 / 2.56 / 2.56 | 1.08 / 1.08 / 1.08 / 1.08 | 8 |
| S4 (1/96) | 1.08e-07 / 2.17e-07 | 0.00483 / 0.00483 / 0.00483 / 0.00483 | 1.25 / 1.25 / 1.25 / 1.25 | 0.544 / 0.544 / 0.544 / 0.544 | 0 |


Columns of the four rates are 120, 60, 30 frames a second and the clamp. The
bounds are R1 energy 3.47e-6 at 120 for the step 1/24 (second order in the
step), R4x 2 percent and R5 position 1 percent.

- **S0** fails R4x and R5 at every rate (8 judged rows), and its end-state
  position error for R1 differs between rates by 2.70 points of a (bound 0.5)
  and its R4x energy by 21.1 points (bound 2): the dependence the gate was
  asked about, measured.
- **S1 (cap 1/24).** The cap written as the exact fraction 1/24 splits the 120
  frames-a-second frame, whose advance is one rounding step above 1/24, into two
  pieces, so its steps are 1/48, 0.0278, 1/30 and 1/24 for R1 at 120, 60, 30 and
  the clamp. That is an accident of floating point, found by the run and
  recorded here as measured: the plan is `substepPlan(advance, 1/24)`, as the
  thresholds file says. S1b is the same plan with the cap written as the
  decimal 0.0417, the form the roadmap prints: every rate then takes the step
  S0 takes at 120 (1/24) and the result is S0 at 120 at every rate. Both fail
  R4x and R5 at every rate. S1b was run for T1 to T3 only.
- **S2 (1/24)** is rate independent (spreads 0) and fails R4x (4.67 percent) and
  R5 (2.14).
- **S3 (1/48)** is rate independent and fails R4x (2.56 percent against 2) and R5
  (1.08 against 1).
- **S4 (1/96)** meets every bound at every rate: R4x 1.25 percent, R5 position
  0.544, R1 energy 1.08e-7 against 2.17e-7, and every spread is 1e-8 of a or
  smaller. The 64-piece limit never binds on any of the 35 scenarios at any
  rate: the largest step count in a frame is 28.8 (kessler-cascade at the
  clamp), so the carried remainder never exceeds 0.9 of a step and simulated
  time never falls behind.
- **T2, R2 and R3.** R2's end-state error spans 0.0108 to 0.0155 of a across
  the rates (a spread of 0.00474, under 0.005) under every candidate, since
  the scenario is capped. The runner does not report R3's end-state error;
  R3 is capped and identical under every candidate, so it is recorded NOT RUN
  and cannot change the choice.

T1, T2 and T3 are met by S4 alone, on all 35 scenarios and on both slices.

### T4: frame time

`npm run perf` with `--scene`, `--policy` and `--fixed-step 1/60` (the probe
carries these flags on the spike), three runs of 5 s per scene and profile, the
median, S0 and S4 interleaved, nothing else running by design (the one-minute
load average of the 14 invocations was 6.4 to 12.9, a shared machine). The
baseline is the lower of 445's recorded `measuredFrameMs` and this session's
median of S0. Only S4 was measured: S1, S2 and S3 fail T1 and T3 on every slice,
which decides them. Scenes whose scenario has its own cap run the same plan under
every candidate and are not judged; they show the instrument's spread in this
session (S4 over baseline 0.81 to 1.23).

| profile | scene | recorded S0 ms | S0 now (median of 3) | S4 now (median of 3) | baseline (lower) | S4 / baseline | pass (<=1.5) |
|---|---|---|---|---|---|---|---|
| full | black-hole-lab-midnight-1366 | 8.79 | 5.28 | 4.77 | 5.28 | 0.90 | yes |
| full | circumbinary-planet-lab-midnight-1366 | 3.44 | 3.85 | 4.23 | 3.44 | 1.23 | yes |
| full | galilean-resonance-midnight-1366 | 4.06 | 3.63 | 3.74 | 3.63 | 1.03 | yes |
| full | galilean-resonance-zoomed-midnight-1366 | 4.4 | 3.60 | 3.66 | 3.60 | 1.02 | yes |
| full | solar-system-midnight-1366 | 2.32 | 2.05 | 3.09 | 2.05 | 1.51 | NO |
| full | star-cluster-midnight-1366 | 26.01 | 16.70 | 32.13 | 16.70 | 1.92 | NO |
| low | black-hole-lab-midnight-1366 | 19.5 | 10.93 | 8.86 | 10.93 | 0.81 | yes |
| low | circumbinary-planet-lab-midnight-1366 | 13.44 | 8.66 | 8.94 | 8.66 | 1.03 | yes |
| low | galilean-resonance-midnight-1366 | 22.1 | 11.89 | 14.11 | 11.89 | 1.19 | yes |
| low | galilean-resonance-zoomed-midnight-1366 | 17.73 | 11.67 | 13.19 | 11.67 | 1.13 | yes |
| low | solar-system-midnight-1366 | 16.34 | 8.18 | 13.33 | 8.18 | 1.63 | NO |
| low | star-cluster-midnight-1366 | 25.4 | 16.56 | 21.07 | 16.56 | 1.27 | yes |


The scenes a candidate changes are solar-system and star-cluster. **S4 fails T4
on solar-system at both profiles (1.51 at the full tier, 1.63 at the low tier
with the CPU throttled 4x) and on star-cluster at the full tier (1.92).** The
verdict does not rest on the 1.51: the other three misses exceed 1.5 by more
than the spread of the unchanged scenes. Every one of S4's frames does eight
or more complete `updatePhysics` calls where S0's does one (sim_speed 1 at 60
Hz is eight steps of 1/96).

Informational, not judged: the heavier members of slice B2 that have no
reference scene, full tier, unthrottled, fixed 1/60 frame, one run, S0 and S4
in milliseconds a frame: exoplanet-lab 22.3 and 47.0, kuiper-belt 12.4 and 32.5,
sagittarius-a 22.9 and 37.4, galactic-center 12.6 and 17.6, intermediate-mass-bh
10.5 and 11.2, galactic-collision 71.9 and 116.7 (not in a slice), star-cluster
21.7 and 23.8. T4 as committed reads a slice only on the reference scenes it
holds, so slice B2 would not have been judged on these; a build of S4 on B2
would have to be.

**Sensitivity of the verdict to the baseline, stated plainly.** 445's recorded
medians were taken with another job running (load 5 to 15) and are higher than
this session's S0 medians for solar-system (2.32 against 2.05 ms at the full
tier, 16.34 against 8.18 at the low tier) and star-cluster (26.0 against 16.7,
25.4 against 16.6). The committed rule takes the lower of the two so that a
candidate is never judged against a baseline that carried more load; that is why
S4 fails. Read against 445's recorded figures alone, S4's medians would be 1.33
and 0.82 of the baseline on solar-system and 1.24 and 0.83 on star-cluster, T4
would be met on every changed scene, and the verdict would be A. The rule was
committed before any measurement and is not moved here. Whether T4's baseline is
the recorded one is Carl's to reset; this file records both readings and applies
the committed one.

### T5: stored records and links

S1 as a `max_timestep` row in the 35 uncapped preset rows
(`spike/step-policy-s1-rows`, `js/scenarios.js` only), the world golden
regenerated: the `bodies` and `camera` digests of all 61 rows are equal, and the
`settings` digest changed in exactly the 35 uncapped rows and in no other field
of any row. S2 to S4 as a code policy (no row named): the unchanged golden
passes in all 61 rows. A seeded link made on the base for a named row stores no
`max_timestep` (the link keeps only settings that differ from the scenario's
current row), so on S1 it rebuilds equal t = 0 bodies and then takes the row's
cap: an old link keeps what it builds and changes how it runs. An old saved
world restores with its stored `max_timestep` of 0 (`js/world.js:495-545`): under
S1 it keeps the old plan; under S2 to S4, whose trigger is `max_timestep` = 0, it
runs under the new policy. The two forms differ here.

### T6: lesson steps

The recount reads `tools/lesson-scene-audit.mjs` and follows each lesson's
rebuilds forward to the steps that run while a changed scenario is the live
scene: 118 steps in 8 lessons (butterfly-effect, comets-and-the-sun,
goldilocks-question, keplers-laws, missing-mass, power-law-gravity,
the-scale-of-the-solar-system, tides) on four scenarios (solar-system,
earth-moon-system, tidal-disruption-event, three-body-sensitivity-lab; the
slice B1). 16 steps read a number out of the running integration, and 6 of
those are validated.

Five validated steps **accept** at all four rates under every candidate:
keplers-laws measure-four-planets and work-the-law-out-step test
P squared over a cubed against bounds of 25 and 50 percent, and the engine's
own formula gives that ratio from the masses alone (the largest deviation
anywhere is 7e-16); the-scale-of-the-solar-system three-distances and the two
comet steps compare the reading with the live world at 2 to 5 percent
(`planets-sequence.js`), and the readings move by at most the amounts below over
five Earth years at four rates:

| policy | a | P | P^2/a^3 | comet periapsis | comet apoapsis | Earth, Jupiter, Neptune distance |
|---|---|---|---|---|---|---|
| S0 | 1.08e-03 | 1.62e-03 | 6.7e-16 | 7.89e-06 | 2.43e-05 | 3.98e-03 |
| S1 | 3.00e-05 | 4.49e-05 | 6.7e-16 | 1.32e-06 | 4.05e-06 | 6.60e-04 |
| S2 | 3.00e-05 | 4.49e-05 | 6.7e-16 | 1.32e-06 | 4.05e-06 | 6.60e-04 |
| S3 | 7.49e-06 | 1.12e-05 | 6.7e-16 | 6.58e-07 | 2.03e-06 | 3.30e-04 |
| S4 | 1.87e-06 | 2.81e-06 | 6.7e-16 | 3.29e-07 | 1.01e-06 | 1.65e-04 |

The five readings are all within 0.4 percent under S0 and within 0.02 percent
under S4. **Listed for revision under 7.8, with the prompt that carries them
(345), if a candidate were built:** the validated butterfly-effect
write-down-what-you-measured (an e-folding time window of 3 to 14 s, with 8.3 s
and 6.0 s quoted in the text) and four display steps of the same lesson
(the-reproducibility-control, measure-the-triple, the-numerical-control,
move-the-horizon), whose readings are the chaos-sensitive quantity the gate
changes, and tides the-extreme-case-running-live (fragment counts, 460's).
These were not run: they need the lesson's own instrument in a browser (NOT RUN).
Five display-only steps read the engine without a validate
(missing-mass the-solar-system-plotted, tides twice-a-day-everywhere,
three-points-three-pulls, take-the-center-away, comets-and-the-sun
watch-the-tails). Under verdict C nothing changes and this list is evidence.

### T7: instruments

- Two live runs of 240 frames under `setFixedStep(1/60)` with the same seed,
  every body's state compared as text, are identical for S0 to S4 on
  solar-system and three-body-sensitivity-lab (10 of 10).
- The reliability check halves `max_timestep`, which is the real step under S0
  and S1. With the live plan taken from a fixed-step policy it halves the real
  step exactly in 33 to 36 of the 56 scenarios it does not refuse and fails in
  20 to 23, those whose frame advance is not a multiple of h; driving the
  policy's own step instead (coarse h, fine h/2) the pieces taken equal h and
  h/2 exactly and the two runs cover the same duration within 0.21 percent
  (S1, S2), 0.10 (S3) and 0.05 (S4). So T7 holds for S4 only with the
  consumer changed to drive the policy step, which is 458's list.
- `tools/seeded-step.mjs stellar-graveyard 9 300` prints the same digest with and
  without `--effects` and the same digest as on the base.
- `tools/reversibility-probe.mjs` equals the base in every deterministic row; the
  rows the probe labels an unseeded shower differ from run to run on the base
  itself.

### T8: the engine and the 61 scenarios

`npm run validate:physics` prints 442 of 442 on the spike and on the base, the
same lines apart from timings. Every scenario ran 600 frames at each of the four
rates: S0 on all 61 (244 legs), and S1 to S4 on the 35 uncapped (140 legs each):
804 legs, no NaN in a position or a velocity and no throw. A capped scenario's
plan under S1 to S4 equals `substepPlan` (416 plan comparisons, 0 differences).

### Slice B2

Closest pair over the softening floor in 600 frames at 60 fps under S0, seed 1;
B2 is the uncapped scenarios with no pair inside the floor.

| scenario | closest pair / floor | enters |
|---|---|---|
| hungry-hungry-holes | 0.00111 | yes |
| kessler-cascade | 0.00139 | yes |
| alien-dyson-swarm-collapse | 0.00154 | yes |
| stellar-nursery | 0.00157 | yes |
| tidal-arm-tango | 0.00232 | yes |
| the-pinwheel-galaxy-core | 0.00386 | yes |
| stellar-graveyard | 0.00488 | yes |
| galactic-collision | 0.00494 | yes |
| quasar-cannon | 0.00524 | yes |
| star-frisbee | 0.00549 | yes |
| star-cluster | 0.00798 | yes |
| micro-bh-swarm | 0.00901 | yes |
| supernova-remnant | 0.00941 | yes |
| slingshot-gauntlet | 0.0114 | yes |
| compact-object-zoo | 0.0192 | yes |
| black-hole-billiards | 0.0197 | yes |
| rogue-encounter | 0.0199 | yes |
| triple-bh-system | 0.0298 | yes |
| neutron-star-collision | 0.0331 | yes |
| tidal-disruption-event | 0.0613 | yes |
| slingshot | 0.242 | yes |
| supermassive-bh | 0.42 | yes |
| white-dwarf-binary | 0.8 | yes |
| sagittarius-a | 1.05 | no |
| intermediate-mass-bh | 1.05 | no |
| galactic-center | 1.43 | no |
| kuiper-belt | 1.69 | no |
| millisecond-pulsar | 2.03 | no |
| exoplanet-lab | 2.05 | no |
| binary-bh | 2.15 | no |
| solar-system | 2.22 | no |
| earth-moon-system | 6.99 | no |
| gw150914 | 10.5 | no |
| pulsar-system | 14.6 | no |
| three-body-sensitivity-lab | 17.2 | no |

B2 holds twelve scenarios: sagittarius-a, intermediate-mass-bh, galactic-center,
kuiper-belt, millisecond-pulsar, exoplanet-lab, binary-bh, solar-system,
earth-moon-system, gw150914, pulsar-system and three-body-sensitivity-lab
(R1 and R4x; not R5). B1 holds solar-system, earth-moon-system,
tidal-disruption-event and three-body-sensitivity-lab (R1, R4x, R5).

## Verdict

**Verdict: C**

By the committed rule: S4 is the only candidate that meets T1 to T3, and it
fails T4 on solar-system, which belongs to all 35 and to both slices, so no
candidate meets T1 to T8 on any slice. S1 to S3 fail R4x and R5 on every slice
(B1 and B2 both hold R4x; S1 to S3 leave it at 2.56 to 4.67 percent against 2).
Stated as numbers, a reading depends on the frame rate under the present
policy as follows (S0, 120, 60, 30 and 20 or fewer frames a second):

| quantity | 120 | 60 | 30 | clamp |
|---|---|---|---|---|
| R1 Earth after 100 orbits, position error in percent of a | 0.077 | 0.31 | 1.24 | 2.78 |
| R1 Earth, sidereal period error | 1.23e-6 | 4.92e-6 | 1.97e-5 | 4.43e-5 |
| R4x hard three-body pass, energy lost before the first close approach, percent | 4.67 | 7.73 | 16.8 | 25.7 |
| R5 tidal-disruption-event, position at periapsis, percent of its periapsis distance | 1.08 | 2.14 | 4.24 | 6.24 |
| R5 fragments created by the star (445's record) | 0 | 53 | 75 | 92 |

(All five rows are 445's record of S0.)

**What is true if a candidate were built, and what would change the verdict.**
A fixed step of 1/96 removes the dependence (every spread at most 1e-8 of a,
the hard pass at 1.25 percent, the periapsis at 0.54), but at the cost of eight
or more full `updatePhysics` calls a frame at 60 Hz, which the frame-time
threshold does not allow on the solar-system scene at the low tier. Each
substep repeats the whole of `updatePhysics` (forces, integration, trails, the
black-hole path, the tidal loop, merging and collisions, the cull); whether
the per-substep bookkeeping, and not the forces, is what costs the time was not
measured here. A change that cut the work per substep, or a re-measurement of
T4 against a baseline Carl names, would bring the same thresholds to the same
candidate again. Neither is done here, and no threshold moved.

## Consequences (verdict C), exactly

- Prompt 458 (the physics step) is recorded **NOT RUN**, with this file as the
  reason.
- Prompt 461 states the dependence beside timed readings and on the model page,
  with the table above.
- Prompts 460 and 496 proceed in every verdict.
- 345 does not re-derive lesson steps because of this gate; the T6 list is
  evidence for 461 and for a later gate if one is run.
- Continuation checkpoint I-10 reads this verdict as recorded (a C verdict is
  a valid result).

## The compatibility bill (T5, T6, T7)

Consumers of the step, each with its outcome under a built candidate. "458"
means the production prompt that builds the verdict; "345" re-derives lesson
steps.

**World golden (T5, measured).** `e2e/worldConstruction.spec.js` run on the
spike. S1 as a `max_timestep` row in the 35 uncapped preset rows
(`spike/step-policy-s1-rows`, `js/scenarios.js` only), golden regenerated: the
`bodies` and `camera` digests of all 61 rows are equal; the `settings` digest
changed in exactly 35 rows and in no other field of any row; the 35 are the
uncapped scenarios (the rows S1 names). S2 to S4 as a code policy (no row
named): the unchanged golden passes in all 61 rows, all three digests.

**Share links.** A link stores the settings that differ from the scenario's
*current* preset row (`js/shareState.js` `settingsDelta`, `pristineSettingsFor`).
A seeded link made on the base for a named row has an empty delta for
`max_timestep`; on a candidate built as S1 the row supplies 1/24, so the link
rebuilds equal t = 0 bodies (the `bodies` digest equality above is that
statement) and then runs with the new cap: an old link keeps what it builds
and changes how it runs. Under S2 to S4 (code) a link is unchanged and runs
under the policy.

**Saved worlds.** `load_simulation_state` restores the whole stored settings
object (`js/world.js:495-545`), so an old save restores with its stored
`max_timestep` of 0. Under S1 that save keeps the old plan (S0); under S2 to
S4, whose trigger is `max_timestep` = 0, the same save runs under the new
policy. The two forms differ here, and 458 states which it wants.

**Label golden.** `tests/labelGolden/record.mjs` runs the lesson data's own
functions against a fixed synthetic world and never steps: unchanged.

**Engine and checks.** `validate:physics` is unaffected (it builds its own
worlds and calls `updatePhysics` at one step; no candidate edits the engine).

**Consumers of `frameAdvance` and `substepPlan`** (458 updates each; the
spike changed only the first three):
`js/render.js` (the loop), `js/timestep.js`, `js/experimentsBridge.js` (what the
bench is told the live plan is), `js/experiments/bench.js` (lines 653, 952,
1206: the live plan for the reliability check and the recorded
`frameAdvance`), `js/experiments/reliability.js` (`stepPlan`),
`js/experiments/trialRunner.js` (154-163, 400: trial frames and substeps),
`js/experiments/experimentManifest.js` (581), `js/experiments/exports.js`
(317: an export records `frame_advance`, which under a carried remainder is
not the simulated time of every frame), `js/experiments/frameRate.js` (41),
`js/experiments/panel.js` (915), `e2e/sweep.spec.js` (118). Two more
consumers are not callers of those functions but read the same number:
`tickSandboxTools(dt_sim)` (the stopwatch) and `tickTimeline(dt_sim)` (the
recorder's `simClock`, `js/timeline.js:297-311`) are both advanced by the
frame's advance, and under a carried remainder the integrated time differs from
it by less than one step; 458 advances both by the integrated time (the
recorder captures on a wall-clock interval, so replay and rewind of 451 are
not otherwise touched).

## Reproducing

On `spike/step-policy` (never merged): `node tools/reference-cases.mjs --policy S4
--only R1,R2,R3,R4,R4x,R5 --out f.json`, `node tools/step-policy-spike.mjs b2|t6|t8`,
`node tools/t7-reliability.mjs`, `node tools/t7-bench.mjs`, and `npm run perf --
--scene ... --policy S4 --fixed-step 0.016666666666666666`. The golden check of T5
for S1 is `GRAVITAS_UPDATE_WORLD_GOLDEN=1 npx playwright test worldConstruction`
on `spike/step-policy-s1-rows`, then a diff of `e2e/golden/world-construction.json`.
