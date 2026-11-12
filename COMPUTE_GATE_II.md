# The compute page gate, second edition

Roadmap III, Prompt 268 (tranche T6, authorized by Checkpoint VI's recorded outcome CONTINUE AS PLANNED, register row D-R10-267-01, merged as #568 at `v3` 0b5d3d0f; its one hard prerequisite, 267, is merged).
The compute page (`/compute/`: online-only, a CDN runtime, opt-in, seven reviewed notebooks, no known user) was judged on merit: can it carry the numerical-methods notebooks an upper-level course needs, inside D-NB-04's isolation, at a maintenance cost the project can bear?
Ten candidate notebooks were committed in the roadmap; each was prototyped on a spike and given the same five kinds of leg (accuracy against an independent code, agreement with the Gravitas module the candidate names, determinism, refusals, supplies), and the page itself was held to the roadmap's seven thresholds.

**Verdict by the committed function: C.** No candidate passes: three page legs fail for every candidate (G4.b, G5.b, G7.a), six legs in all fail as committed (section 3), and the legs that need the pinned runtime in a browser (G2.b, G3.b, G4.c) were not run, because running downloaded code needs Carl's permission and it was not given.
Reading the table as an engineer would, seven of the ten notebooks (N03, N04, N05, N06, N08, N09, N10) have no failed leg of their own, and the three that do fail have a specific reason (section 3). That reading is not a verdict: the page legs that fail decide the function, and a grant of requests R1 to R3 could not change it.
Consequences (Appendix C, the `c` entry): **Prompt 269 is not run; 270 and 274 ship without compute links; the compute page stays at its present size (seven notebooks) with security updates only.** Nothing is built; the consumers rule (Carl, 2026-11-05, -06, -07) holds. The record is decision-register rows D-R10-268-01 to D-R10-268-05, all pending Carl's ratification.

Everything is in `tests/fixtures/compute-gate-ii/`: `thresholds.json` (the contract and its nine amendments), `oracle-results.json` (the pinned independent oracle), `references.json` (the Gravitas modules' pinned outputs), `first-run-results.json` and `results.json` (the two validator streams), `failed-legs.json`, `page-legs.json` (the page legs that are commands, with their results) and `inputs/` (the example inputs this gate made). The prototypes, the oracle, the generators and the validator are on `spike/compute-gate` (head d6cb8780), never merged (rule 7.5.4): this PR is documentation, fixtures and one test.
The machine's CPython 3.9.6 (numpy 1.26.4, scipy 1.13.1, astropy 6.0.1) stands in for the pinned runtime (Pyodide 314.0.7, Python 3.14.2); every number below is labelled CPython and none is a Pyodide result. Node 22.23.4 for every Node step. Two complete runs of the second stream agree row for row except the wall-clock times.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `fcff8bb2` | `thresholds.json` alone: the ten candidates, 56 candidate legs, 14 page legs, the verdict function, requests R1 to R3, four decisions | any notebook, oracle, input file or computation |
| `70dd6114` | AM1 to AM3: N07's ages and masses, how each negative case is made, N03's inputs; no bound moved | the oracle's first run |
| `69b83767` | AM4: the oracle's first invocation failed at an astropy import (PyYAML is not importable here); an empty `yaml` stub in the oracle only | the oracle's second invocation |
| `b0ab61d2` | AM5 (N03.b where the oracle refuses) and the oracle's output pinned | the first notebook |
| `47dfacf3` | the references pinned: `solveKepler` over the N04 mesh, the variable-star `periodogram` over the N06 periods | the first notebook |
| `9520a4b1` | AM6: `python3 -E` rather than `-I` (which hides the user site where numpy lives), and wall-clock limits (a first validator attempt hung in N02's negative case and was stopped by hand; nothing was computed or written) | the pinned run |
| `a5e9f114` | the first stream pinned (54 pass, 9 fail, 4 NOT RUN, 3 reported) and AM7 to AM9 | the second run |
| spike `d6cb8780` and before | the generators and oracle (`4922b01d`), the references script (`c9017c26`), the notebooks, harness and validator (`7e0278b3`, `8ff57d72`, `dd326beb`), the two corrections (`d6cb8780`) | see the rows above |

What had been seen before the contract was committed (`seenBeforeCommitting`): the roadmap sections, `COMPUTE.md`, `NOTEBOOK_BRIDGE_GATE.md`, the frame's manifest, one existing notebook, the shape of the Gravitas modules the candidates are held against, the installed Python, and that `TOOLCHAIN.md`'s quarterly pass has no match for the runtime (so G4.b was written knowing it; it is measured, not assumed). No notebook, oracle value or result existed. No published number was typed from memory; the closed forms used as analytic checks are derived in the contract.
The notebooks were each run once on their example input as a smoke test before the validator existed (nothing compared). The corrections are all recorded: AM7 (N02's code indexed the Dormand-Prince tableau one row early, so the notebook was not the committed scheme; the first stream shows it failing N02.a and N02.b by factors of 144 to 8,463 against scipy, and the corrected notebook is the candidate the second stream judges), AM8 (the validator's key lookup for theta = 1.0), and AM9, which records that the other first-run failures are not defects and stay failing.

## 2. The candidates, the tests and what passed

Every candidate has the same legs: (a) accuracy against an independent code, (b) agreement with the Gravitas module the roadmap names where it names one, (c) determinism (two fresh `python3 -E` runs, byte-identical answers), (d) negative cases that must be refused, (e) supplies (imports inside numpy, scipy, matplotlib and astropy; no file, network, subprocess or eval; the example validates through the repository's own validator for its kind), with a candidate's own legs added. Results are in `results.json`.

| Candidate (input kind) | Independent code | Gravitas module | Result |
| --- | --- | --- | --- |
| N01 integration order (orbital system) | own integrators, DOP853 reference | none named | **N01.a fails** (1.7e-5 against 1e-6 on the smallest error); orders 0.80, 0.85, 2.00, 4.13 pass the band; the rest pass |
| N02 adaptive steps (orbital system) | scipy RK45 | none named | N02.a (error within 100 tol), N02.b (0.65 to 0.96 of scipy's error, step ratio 1.01 to 1.33) pass; **N02.d fails**: the collision case did not refuse in 60 s; adaptive needs 2.5 to 4.9 times fewer function evaluations than fixed RK4 (reported) |
| N03 orbital chaos (grid of engine runs) | the same window rule, numpy | the engine's own export | all legs pass, but on the engine's pair the notebook and the oracle both refuse (R^2 = 0.5575, window 5 to 22, equal to 1e-9); the analytic cases recover lambda to 0.02 and 0.5 percent |
| N04 Kepler's equation (orbital system) | `scipy.optimize.brentq` | `solveKepler` | all pass (2.0e-13 rad against both; Newton order 1.9994); Newton fails to converge from E0 = M at e = 0.99 (4 of 724 points) and 0.999 (10), Halley and bisection never (reported) |
| N05 least squares (time series) | `numpy.linalg.lstsq`, `scipy.stats.f` | 154's `fTest` | all pass (coefficients 6e-12, covariance 2e-14, chi-square 2e-15; F equal, p within 9e-14) |
| N06 periodogram (time series) | astropy `LombScargle` | `periodogram` | all pass (power within 1.8e-14 and 5.1e-14; peak at index 168 in all three) |
| N07 isochrone tables (table) | scipy interpolation | none named | N07.a passes (2.7e-15 mag, 30 held-out points on 3 of the 7 ages); **N07.b fails**: the cubic's RMS 0.0084 mag is larger than the linear's 0.0070 (both under 0.05) |
| N08 polytrope (grid of the kernel's table) | closed forms, scipy Radau | the stellar kernel's table | all pass (n = 0 and 1 to 1e-13, others to 7e-12; the kernel's table agrees to 1.2e-7 in mass and density ratio) |
| N09 Barnes-Hut toy (synthetic grid) | numpy direct sum | none named | all pass (direct sum 2e-16, theta = 0 tree 3e-15; RMS error 0.0065, 0.023, 0.045, 0.113 at theta 0.3, 0.5, 0.7, 1.0; 127,006 interactions at 0.5 against a limit of 249,750) |
| N10 synthetic populations (table) | Prompt 264's pinned oracle | 264's pinned fits | all pass (S1 mu within 5.6e-7, S2 within 1.7e-10 with the 3-exposure bin "not constrained"; recovery over 200 populations: mean z within 0.18, pooled RMS z 1.107) |

## 3. The six failing legs

Each stays failing and labelled; no bound was moved (AM9).

- **N01.a** (errors against the oracle within 1e-6): measured 1.7e-5 on the worst of the twenty errors, which is probably the smallest (RK4 at 800 steps, about 7e-9 in the oracle). The probable cause, not isolated by a run, is that the two codes differ by rounding in the trajectory and the reference solution's own error is near 1e-12, which is a larger relative difference for an error of 7e-9 than for the others; AM9 states that cause as fact and it was not tested. The bound assumed agreement to rounding in the error itself and was too tight for the smallest errors. The orders, which are what the notebook teaches, agree to 5e-6 (bound 1e-4).
- **N02.d** (the collision case must be refused within 20 s of CPU): after the correction of AM7 the notebook still loops on the close-pair file for more than 60 s without refusing (the cap of 200,000 steps in Python is slower than the bound). A real defect of the prototype's guard, not of the method.
- **N07.b** (the cubic no worse than the linear, at most 0.05 mag): the cubic through four ages is slightly worse than the linear through two on this table (0.0084 against 0.0070 mag), a cause this gate did not test (the table's ages are sparse, 30 held-out points on three held-out ages of seven in the table, which may not suit a cubic). Both are within 0.05 mag.
- **G4.b** (a recurring check compares the pinned runtime with the CDN's current release): there is none. `TOOLCHAIN.md`'s quarterly pass (Prompt 129) does not name the runtime and no other tool mentions it. Adding one line to that pass would be cheap.
- **G5.b** (no built-in course lists an investigation with a compute step): `upper-level-modules` lists five (`integrators-in-practice`, `extending-an-experiment`, `refitting-a-transit`, `two-periodograms`, `sampling-a-posterior`), all in a "Computation" unit of a course that otherwise needs nothing outside the application. The page is online-only; a course that lists it depends on it.
- **G7.a** (room in the page's route ceiling for ten more catalogue entries): the compute route measures 181.3 KB in 20 requests from the sources and 82.8 KB from a build, exactly its ceilings (181.3 and 82.8); ten entries at the existing mean of 5,017 source bytes would add about 49 KB. No raise is requested here; the standing approval of 2026-10-10 covers an exact overrun, and this is not one.

## 4. The page's seven thresholds

| Threshold | Leg | Result |
| --- | --- | --- |
| 1 isolation unchanged | G1.a, G1.b, G1.c | pass: no file under `compute-frame/`, `js/compute/` or `js/computePage.js` changed; `node tools/compute.mjs --check` current; 5 suites and 94 tests pass; `e2e/compute.spec.js` 23 pass in chromium |
| 2 cold load and first run | G2.a, G2.b | G2.a passes (every package set is one the catalogue already states, so at most about 23 MB); **G2.b NOT RUN** (R1) |
| 3 determinism | candidate legs c, G3.b | CPython: all ten byte-identical on two runs; **G3.b NOT RUN** (R2) |
| 4 maintenance | G4.a, G4.b, G4.c | G4.a passes (version, lock hash and package versions pinned); **G4.b fails**; **G4.c NOT RUN** (R3) |
| 5 coupling | G5.a, G5.b | G5.a passes (no importer outside the page); **G5.b fails** |
| 6 offline | G6.a | pass: the four path families are in `NEVER_PRECACHED`, absent from the precache list, and the page says online and opt-in in English and Spanish |
| 7 bytes | G7.a | **fails** (section 3) |

## 5. NOT RUN legs and the exact requests

A leg that is not measured is not passed (the bridge gate's rule). The three below need the page's runtime, which is downloaded code; Carl's permission is not given.

- **R1 (G2.b)**: run Pyodide 314.0.7 from `cdn.jsdelivr.net` (the frame already pinned by `compute-frame/manifest.json`, lock hash checked) in Playwright Chromium and WebKit through the page's real frame, the ten prototype notebooks on the spike one at a time, CPU throttled 4x, recording the frame's first message to the answer; bound 30 s each. About 23 MB of download per browser, cached after the first.
- **R2 (G3.b, G3.c)**: two runs of each notebook in each of the two browsers; answer text byte for byte; compare with the CPython answers (reported).
- **R3 (G4.c)**: fetch one newer Pyodide release's lock file as data (sha256, retrieval date, terms read), regenerate the frame on the spike with it, run the ten notebooks on it.

A grant would not change the verdict: G4.b, G5.b and G7.a already fail for every candidate. It would settle which of the seven notebooks run in the browser inside the bound, which is information for a later gate and not a verdict. The notebooks have also only been run here on Python 3.9 and numpy 1.26, not on the pinned 3.14 and 2.4.

## 6. What the legs do not show

- **A CPython proxy.** Nothing here measures the pinned runtime, its download or its time; the browser legs are exactly the ones that were not run.
- **N03 passes on a refusal.** The engine's exported pair of runs does not grow exponentially under the committed window rule (R^2 = 0.56), so the notebook produces no Lyapunov rate on the engine's own data; its legs pass because the oracle refuses too (AM5) and because the analytic cases are recovered. A reader should not take the notebook as showing chaos from the engine's export.
- **A notebook's envelope, table and figure** (the wrapper every catalogue entry returns) were not built; the same wrapper would serve all ten and is Prompt 269's work if it runs.
- **N10's recovery is a recovery of a self-generated truth** and never marks the method valid for real data; N09's snapshot is synthetic and labelled so; N07's table carries the MIST pack's "no licence stated, attributed" status, and the notebook states it in its credit.
- **Python was only run on the machine's 3.9.6**; the notebooks use nothing newer, and nothing about 3.14 was tested.

## 7. Consequences of verdict C, and what is not decided here

By Appendix C: Prompt 269 is not run (it needs an A or B); Prompts 270 and 274 ship without compute links; the compute page stays at seven notebooks with security updates only. Nothing in this PR changes the page, its catalogue or any lesson.
Three of the failing legs are cheap to repair outside a gate (N02's guard, one line in the quarterly pass, the route's room with a raise under the standing approval); repairing them does not make this gate pass, since no bound moves; a different verdict would need a new gate with new thresholds, or Carl's reset of named bounds, recorded as a new row.

## 8. Decisions taken (register rows D-R10-268-01 to -05, pending Carl's ratification)

1. **The contract** (committed alone and first, with its amendments) and the shape of the legs (DEC1 to DEC4 in the file).
2. **The verdict**, C by the committed function, with the six failing legs and the three NOT RUN legs and the first stream recorded beside the second.
3. **The data and rights decision**: nothing was downloaded; no downloaded code was run; the MIST table is the pack already in the tree (its terms are those the pack records); Prompt 264's samples are the pinned fixture; no published number or citation was typed from memory.
4. **The consequences** (269 not run; 270 and 274 without compute links; the page held at seven notebooks).
5. **The requests** R1 to R3 and the questions below.

## 9. Questions for Carl

1. Ratify D-R10-268-01 to -05 (verdict C and its consequences)?
2. Grant R1 and R2 (run the pinned runtime in Chromium and WebKit)? It cannot change this verdict; it would say which notebooks run inside the time bound.
3. Add the pinned runtime to `TOOLCHAIN.md`'s quarterly pass (G4.b) as a separate small change, and decide whether the `upper-level-modules` "Computation" unit (G5.b) should keep its five compute investigations as they are, mark them optional, or move them out of the course?
4. Should N02's guard and the route's room (G7.a, by the standing approval) be repaired for a future gate, or is the page to stay at its present size?

## 10. Reproducing it

On the spike: `node tools/compute-gate-inputs.mjs <dir>` and `python3 -E tools/compute-gate-snapshot.py <dir>` (the inputs; their hashes are in `oracle-results.json`), `python3 -E tools/compute-gate-oracle.py <dir> <repo> <out>`, `node tools/compute-gate-references.mjs <out>`, `python3 -E tools/compute-gate-mknb.py` (the notebooks), then `node tools/compute-gate-validate.mjs --inputs <dir> --fixtures tests/fixtures/compute-gate-ii --page tests/fixtures/compute-gate-ii/page-legs.json --out <out>` under Node 22.23.4. The page legs G1.a to G1.c and the route measurement were run by hand as commands and recorded in `page-legs.json`.

<!-- Listed in DOCUMENTS.md. -->
