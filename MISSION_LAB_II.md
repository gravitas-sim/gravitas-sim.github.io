# Mission lab II: the first window-and-budget workflow

Roadmap III, Prompt 272 (tranche T6, authorized by Checkpoint VI's recorded outcome CONTINUE AS PLANNED, register row D-R10-267-01, merged as #568). Labels `invisible` and `documentation`. **The first workflow's kernel and its validation record; verdict C by the committed function (one failing leg, A2), the legs the prompt requires and cannot be run here declared NOT RUN before any run, and no panel, guide, model-page section or follow-on part.** Nothing a student sees changed. English only; no Spanish was written, and any Spanish a later part adds stays unreviewed by a fluent reader (Carl, 2026-11-07).

## 1. Authorization, prerequisites and the base

| Check | Result |
| --- | --- |
| Base and target | `origin/v3` ca776f30 (Merge #571); `INTEGRATION.md` names `v3` as the staging branch for every Roadmap III change; the PR targets it. The tip's own push run was queued when read; its parent #570 (run 42443995615) and the two before it are success |
| Tranche | T6 authorized by D-R10-267-01 (CONTINUE AS PLANNED) and its operating terms (a) to (j) |
| Hard prerequisites (Appendix C: 148, 152, 267) | all landed: 148 (the orbital utilities and the engine's shared kernels, the 3-D and mission modules it owns), 152 as #392 (`NUMERICS.md`), 267 as #568. 153's pool is the contract `js/workers/pool.js`, built, proven and not yet adopted by a shipped module (`WORKER_POOL.md`) |
| Existing result | none under this prompt: no `feat/mission-lab-ii` branch or pull request on `origin`. The tree already has the lab's own window (19,026 Lambert transfers on the ephemeris pack in `js/mission/window.js`), the hyperbolic and capture burns, the rocket equation (`js/mission/solar.js`) and a three-guide lab; what it did not have is the ledger as one record, the grid in row ranges, and any check against something that is not the lab |
| Gate verdicts read as binding | 268 C (no compute links), 265 A8 failing and A8b the replacement, and the T5 verdicts bear on no deliverable here |
| Release hold | no tag, GitHub release or DOI; the next version is 3.0 (Carl, 2026-11-06) |

## 2. What was delivered and what was held

**Delivered (invisible; the mission lab is outside the app's route and bundle budgets, and the installed idle tier, which does count it, is unchanged by this work: 1,610,715 of 1,610,724 bytes on the first base, 1,664,138 of 1,664,205 on v3 1dff1b8c, measured on the merged tree).**

- `js/mission/workflow.js` (in `NEVER_PRECACHED`: no shipped page imports it): the ledger (`budgetLedger`, `ledgerProblems`), one mission end to end (`missionWorkflow`: a transfer on an ephemeris and its ledger, with the ephemeris span refused beyond) and `windowMinimum`. Rows in flight order: launch (the launcher's: the parking orbit's circular speed plus stated losses), departure, corrections (a stated allowance, never computed), arrival (into the capture ellipse), capture (circularising at its periapsis). The rocket equation gives the spacecraft's propellant from its dry mass. Every row says what it assumes and the record carries `notFor`.
- `fillRow` (in `workflow.js`): one departure row of a window, so the grid can be run as row-range jobs that need nothing from each other and joined into the same bytes as the whole window (A9, and a test through the real pool). It repeats the loop of `createWindow` in `window.js` rather than sharing it: a first version shared it, and the 150 bytes it added to `window.js` took the idle precache over its data-budget ceiling (1,610,865 of 1,610,724 bytes; the standing size approval is for route and bundle ceilings, and savings come first), so `window.js` is unchanged and `workflow.js` is in `NEVER_PRECACHED` until a panel imports it. The test holds the two loops to identical cells.
- `tests/fixtures/mission-lab-ii/`: the contract (`thresholds.json`, committed first), the public states the oracle used (`horizons-rows.json`), the oracle (`oracle.py`) and its pinned output, the kernel's departures it flew, the legs (`legs.mjs`) and the results (`results.json`); `tests/missionWorkflow.test.js`.
- `MISSION.md` extended with the workflow section.

**Held, and why.**

| Held | Why |
| --- | --- |
| The porkchop panel, the budget panel (a 150 record), the geometry panel | The consumers rule (Carl, 2026-11-05 to -07: no panel, lesson or viewer until its gate passes). The gate returned C; the thresholds say that no consumer is added whatever the verdict. The image panel, 155's keyboard contract and 150's record are the consumers' work |
| The guides "When to leave" and "What it costs", then the three that follow | Every guide's instructor content lives in closure sources (`js/i18n/en.missionLabGuides.js`, `js/data/missionLabKey.js`, `js/missionLabDocs.js`); a guide changes the ciphertext, which is the queue's to rebuild, and `Do not: ship a guide whose fixture row is not green` applies: the table is not green. Nothing was added to the closure (306 of fewer than 307) |
| Rendezvous phasing, a gravity-assist sequence, mission geometry | The prompt orders them after the first tier table is green, each with its own fixture row |
| The pool adoption by a shipped module | It costs the first-visit precache 3,517 bytes over a ceiling the standing approval does not cover (`WORKER_POOL.md`); the grid is made pool-ready and a test runs it through the real pool |
| The model page section | Student-facing, with its translation; it waits with the panels |

## 3. The contract, committed first

`tests/fixtures/mission-lab-ii/thresholds.json` was committed alone (25a79acd) before the oracle existed, before any state was fetched for the fixtures and before the workflow module existed: nineteen legs by the prompt's tiers (a), (b), (c), (d), their bounds and the reasons for them, the three date pairs, the grid (an 806-cell subgrid on a 5-day lattice), the degenerate pair's selection rule, the verdict function and an empty `amendments` list. One amendment was recorded afterwards, before the run it concerns: **AM1** (commit after 25a79acd): the first oracle run flew the kernel's velocity from the Horizons departure position instead of the kernel's, against the rule committed for B2c, which put 4 km of the pack's own error into the miss (5.49, 5.06 and 7.65 km against the bound of 5 km); the oracle was corrected to the committed rule and the bound was not touched. The rest of that run's output was identical in a second run. **Two legs were declared NOT RUN in that commit**, not discovered: B1 (a cited public mission summary) and B4 (a pinned run of an independent astrodynamics package). The test holds the list to AM1 and `boundMoved: false`. A bound that proves unmeasurable fails its leg; only Carl resets one.

The oracle (`oracle.py`, `python3 -E`, CPython 3.9.6, numpy 1.26.4, scipy 1.13.1: installed packages, nothing downloaded was run) reads no Gravitas code and no number from the ephemeris pack but the pack manifest's date range (D2). Its Lambert answer is found by shooting: DOP853 two-body propagation (rtol 1e-12, atol 1e-9 km) and `fsolve` on the departure velocity until the arrival position is met, which shares no formulation with the lab's universal-variable solver. The burns and the ledger are written from their closed forms; the constants come from the Horizons physical-data text.

Public data, downloaded by this session under Carl's 2026-11-07 ruling into `scratch-data/mission272/raw/`: JPL Horizons API 1.2 (DE441), Sun-centered, ecliptic of J2000.0, geometric, 151 state rows (Earth and Mars on a 5-day lattice from 2026-09-01, the three pairs' ends, and the degenerate pair's) and the text answers for bodies 10, 399 and 499; retrieved 2026-11-07 (the sha256 of every answer is in `horizons-rows.json`). Terms: no licence is stated for Horizons output; it is credited to NASA/JPL (the basis the ephemeris pack already records, `MISSION_LAB.md`); cite-only, so only the rows the fixtures use are committed. No published number was typed from memory.

## 4. The table

<!-- mission-lab-ii:table -->
| Leg | Tier | What | Measured | Committed bound | Result |
| --- | --- | --- | --- | --- | --- |
| A1 | a | porkchop minimum against the Hohmann estimate | relative 0.00177 | relative 0.12 | pass |
| A2 | a | the minimum falls at the Hohmann epoch | differenceDays 33.1 | days 20 | **FAIL** |
| A3 | a | the minimum falls at the Hohmann flight time | relative 0.197 | relative 0.25 | pass |
| A4 | a | the minimum is interior | row 61; col 80 | - | pass |
| A5 | a | the hyperbolic burn against its closed form | maxDifferenceKmS 9.32e-08 | absoluteKmS 1e-06 | pass |
| A6 | a | the rocket equation | maxRelative 2.2e-16 | relative 1e-12 | pass |
| A7 | a | the ledger adds up and says what the spacecraft carries | maxRelative 1.11e-16 | relative 1e-12 | pass |
| A8 | a | the launch row | maxDifferenceKmS 6.17e-08 | absoluteKmS 1e-06 | pass |
| A9 | a | the grid in row ranges | differencesPerSplit [0, 0, 0] | differences 0 | pass |
| B1 | b | a cited public mission summary's departure window and delta-v | - | relative 0.08 | **NOT RUN** |
| B2a | b | the three date pairs, same states | maxComponentDifferenceKmS 3.47e-09 | absoluteKmS 2e-06 | pass |
| B2b | b | the three date pairs, the pack's states | maxBurnDifferenceKmS 7.5e-06 | absoluteKmS 0.001 | pass |
| B2c | b | the kernel's trajectory flown by the oracle | oracleMissKm [0.189, 0.263, 0.242] | absoluteKm 5 | pass |
| B3 | b | the porkchop against an independent grid | worstCellDifferenceKmS 3.54e-05; minimumDifferenceKmS 6.81e-07; excluded 9 | cellAbsoluteKmS 0.005, minimumAbsoluteKmS 0.001, excludedFraction 0.02 | pass |
| B4 | b | a pinned run of an independent astrodynamics tool | - | absoluteKmS 2e-06 | **NOT RUN** |
| C | c | ensemble coverage | - | - | not applicable |
| D1 | d | a degenerate date pair refuses | oracleSine 0.000413; kernelPack antipodal; control ok | sine 0.001 | pass |
| D2 | d | a window outside the pack's span refuses | oneDayPast [outOfRange] | - | pass |
| D3 | d | a ledger with an impossible input refuses | validAccepted True | - | pass |

19 legs: 15 pass, 1 fail, 2 NOT RUN, 1 not applicable; **verdict C** by the committed function (`thresholds.json`: A every leg passes; B only B1 and B4 not run; C otherwise). A leg not run is not passed; the failing legs stay failing.
<!-- /mission-lab-ii:table -->

## 5. Reading the legs

**A2 fails and stays failing.** The committed bound is 20 days between the departure date of the porkchop's minimum and the Hohmann epoch (the date when Mars leads Earth by the Hohmann angle, from Horizons longitudes and the osculating semi-major axes at 2026-11-15). The minimum is at 2026-11-01 with a 310-day flight; the Hohmann epoch is 2026-12-04, 33.1 days later, and the valley is not flat: the best cell in the departure row at the Hohmann epoch is 0.64 km/s above the window's minimum. The porkchop is right (B3 agrees with the oracle's independent grid to 3.5e-5 km/s at every cell, and the minimum to 7e-7 km/s at the same cell); the Hohmann phase rule is the poor predictor here. The reason for the 20 days (Mars's speed varying by about 20 percent shifting the phase a few degrees) was an estimate, and the measurement says the shift is larger, because the real minimum is on a longer, earlier, non-Hohmann branch (A3 passes at 19.7 percent of a 25 percent bound, on the same cell). No bound was moved after the result. A claim like "the best date is when the planets are in the Hohmann alignment" is therefore dropped from anything built on this kernel; "the best date is where the grid's minimum is" stands.

**What agrees, and how closely** (the legs that pass are measurements, not ratios): the lab's two-body Lambert against the shooting oracle on identical states agrees to 3.5e-9 km/s (bound 2e-6); on the pack's states against Horizons states the burns agree to 7.5e-6 km/s (bound 1e-3); the oracle's integrator flies the kernel's departure to within 0.26 km of the kernel's arrival (bound 5 km); the minimum total delta-v of the window, 5.669 km/s, is within 0.18 percent of the Hohmann estimate (bound 12 percent); the degenerate pair (2026-11-12 to 2027-08-10 plus 6 hours, sine 4.13e-4 by the oracle) is refused as antipodal with the pack's states and with Horizons states, and the pair three days earlier solves; the pack's span is a hard edge (a window ending exactly on 2045-01-01 is accepted, one day past is refused).

**The ledger.** The five rows add up, the launch row is the circular speed plus the stated losses, the rocket equation matches its closed form to 1e-12, and the ledger fed the oracle's departure and arrival excess speeds equals the oracle's ledger to 7e-8 km/s per row and 4.4e-9 in propellant (reported, not a leg: the committed legs cover the hyperbolic burn and the identities). The ledger's inputs are choices of the test (1.5 km/s of launch losses, a 0.05 km/s correction allowance, 1000 kg, 320 s), stated as inputs; none is a published figure.

## 6. What the legs do not show

- B1: no Earth to Mars mission has a departure window inside the pack's span (2025 to 2045) with a published summary this session could pin. The JPL Mars 2020 launch press kit page answered an automated download with HTTP 403; the one workaround (presenting a browser identity) was refused by the permission system and was not attempted; the NASA technical-reports record of a ballistic-trajectory table (20210005618) is metadata only. A mission outside the span could only be tested with injected Horizons states and from a file that can be pinned. NOT RUN; a request for Carl (section 8).
- B4: a pinned run of poliastro, pykep or GMAT needs installing or running downloaded code; Carl's permission is not given. The shooting solver stands for the independent tool and is labelled as an independent implementation, never as a package.
- C: not applicable. The workflow is deterministic and states no uncertainty, so there is no coverage rate; the pack's own error bounds are tested by the lab's E1 and E2.
- The workflow is a patched conic on the pack's ephemeris: impulsive burns, a circular parking orbit, the arrival burn at the periapsis of the arrival hyperbola, one specific impulse for every burn, no launch-vehicle model, no plane change, no gravity assist. It is not for operational mission design or navigation, and the record says so.
- The validation is internal: against the project's committed thresholds, an independent implementation and public ephemeris states. No outside astrodynamicist has reviewed it.
- The grid on the pool: `fillRow` and a test through the real `createPool` (a realm that computes its row range) show the cells are identical in any finishing order; no shipped module imports the pool, so the lab still computes its window in its own Worker.

## 7. Decisions taken (register rows D-R10-272-01 to -04, DELEGATED)

1. The first workflow's kernel and record land; the consumers (three panels, five guides, the model page section) and the three follow-on parts are held (consumers rule; the table is not green; the guides need the queue's ciphertext rebuild).
2. The verdict is C by the committed function, with A2 left failing and labelled; no bound moved, no amendment.
3. B1 and B4 are NOT RUN, declared before any run, with their requests.
4. No ceiling was raised and no closure file added; nothing was downloaded to the tree beyond 27 KB of cited Horizons rows; no downloaded code was run.

## 8. Questions for Carl

1. Ratify D-R10-272-01 to -04, and the verdict C with A2 failing.
2. B1: name a public, pinnable mission summary (or supply one) with a departure window and a delta-v or C3, or accept that B1 stays NOT RUN. Two routes: a mission outside the pack's span tested with injected Horizons states (the kernel accepts them), or a mission in 2026 to 2028 when a summary exists.
3. B4: may a pinned run of an independent package (poliastro or pykep, installed into a scratch environment and run for the three date pairs) be done, or does B4 stay NOT RUN?
4. A2: a new leg with its bound committed first (for example, the minimum's departure date against the oracle's own independent grid minimum, which B3 already reports), or leave the Hohmann epoch rule as the failing record?
5. The consumers: when the table is green, which first: the porkchop panel (the image panel, the contours and the keyboard cursor under 155) or the two guides (with the queue's ciphertext rebuild and the closure unchanged)?

## 9. Reproducing it

```
node tests/fixtures/mission-lab-ii/legs.mjs --kernel    # the kernel's departures (input to the oracle's B2c)
python3 -E tests/fixtures/mission-lab-ii/oracle.py > tests/fixtures/mission-lab-ii/oracle-results.json   # about 8 minutes
node tests/fixtures/mission-lab-ii/legs.mjs --write      # the table, results.json
npm test -- tests/missionWorkflow.test.js
```

<!-- Listed in DOCUMENTS.md. -->
