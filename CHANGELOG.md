# Changelog

Notable changes to Gravitas. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`main` deploys straight to <https://gravitas-sim.online>, so the live site can
be ahead of the newest tag; `deployed-revision.json` there names the commit it
was built from. `CITATION.cff` and `.zenodo.json` carry the version and the
release date and are generated from `tools/project-metadata.mjs` — see
[RELEASING.md](RELEASING.md), which also explains why the DOI is recorded after
the release rather than in the tag.

## [Unreleased]

### Added

- **Accessibility sweep II: structure, focus, motion, reflow, forced colors and contrast (Prompt 279; visible).** Every page of the walk inventory now has a recorded outline (`tools/page-outlines.json`: one h1, no skipped level, one main, every navigation and region named) that a test holds it to in English and Spanish, one test for each focus pattern, and tests that run every page with reduced motion (by the system and by the reader's own setting), at 320 CSS pixels, under forced colors, and with no checkbox or radio under 24 px (`e2e/a11ySweepII.spec.js`). `tools/motion-inventory.json` lists every keyframes and scheduler in the sources and what each does under reduced motion, and `tests/motionInventory.test.js` keeps it true; the design ratchet measures the contrast of 216 token pairs in each of the four themes and lets a ratio only rise. What changed for a reader: four families of lesson instruments (the launch, the binary orbits, the habitable-zone orbit, the galaxy flyby) now open still under reduced motion and Step by step; Deep's muted text, Daylight's accent and Daylight's warning are a little darker to reach 4.5:1; every checkbox and radio is a 24 px box; the Spanish investigations browser no longer clips its cards at 320 px; the validation page no longer measures 1,121 px wide there; the scenario card's close button and the validation page's Run button keep an edge under forced colors, the shell marks the current place without color, and a plot keeps its own palette. Recorded, not changed: six lesson instruments start moving by themselves with no Run control, and the reader's Motion setting reaches only the application page. Chromium only; no assistive technology; no Spanish string added.
- **Prerequisites as advice on Library cards and in the lesson panel, a way back after a wrong answer, and the same quantity across investigations (Prompt 276 part 2; visible and instructional).** A Library card and the lesson panel's More say "You may want this first:" with a link when an earlier investigation is unfinished; nothing is locked. After a wrong number, a step whose author wrote no hints offers a generated ladder made only from its own check (the units, the order of magnitude and, where the check is a formula over the student's measurements, the formula), each rung on request and named as generated; a step with an instrument offers "Try again with the instrument explained". Every shipped numeric step keeps its authored hints. The wrong numbers checked are kept in order under the step's `:tries` key and the generated rungs under `:gen` (additive sub-keys of the progress record; a 2.0.0 build opens, keeps and re-saves them; FORMATS.md). My work lists "Across your investigations": the same quantity measured in two investigations, one press from Prompt 275's comparison. Not built: the class summary (Prompt 173) reading the attempts record. Ceilings raised under the standing approval are in D-R10-276-04. Spanish has not been read by a fluent reader.
- **Accessibility sweep I: every surface by keyboard and by one pointer (Prompt 278; visible).** Every drag now has a control that needs no drag, and every such control answers the keyboard. The sandbox gains a view pad in Tools (move the view a step, zoom about its center; the zoom is said once the pressing stops); the inspector, a pinned card and the spacetime view gain a Move button (press it, then press where the corner goes, or use the arrow keys) and the spacetime view a Size button and a camera pad (turn, tilt, move, zoom); the 3-D lab gains a view pad under the view and says where the camera is after a run of moves; the Observatory's table gains **Select a run of rows**, which needs no held key. With a type armed, A arms a keyboard placement and no longer also pans (conflict K2, resolved). Fixed on the way: a dialog that ended in a disclosure never gave it focus (the last card of the investigation browser), and a row selected or cleared from the keyboard in the Observatory's table was not marked. The six checks Prompt 155 left pending are activated. `e2e/a11ySweep.spec.js` walks all 33 pages of the navigation inventory in English and Spanish (Tab round the page: no trap, every stop named and on screen, every pressable control reached; then the primary control by its key) and every new control by keyboard and by single presses; `tools/interaction-contract.json` holds the walk inventory and `tests/interactionContract.test.js` refuses a surface without a walk. `ACCESSIBILITY_CONFORMANCE.md` is regenerated from its source with the walk method and the remarks of seven criteria; no status changes and the scope statement keeps its form. Not done here: six pages stay in English with Spanish chosen (recorded for Prompt 282); no assistive technology was used and no person took part; the walks ran in Chromium. The Spanish added is unreviewed by a fluent reader.
- **The numerics instruments: the five measuring tools the numerical-methods investigations need, validated before any investigation (the approved follow-up to Prompt 270; invisible, nothing student-facing).** `js/kernels/numerics/` (imported by no shipped module, never precached), `NUMERICS_INSTRUMENTS.md`, `tools/numerics-instruments-validate.mjs` with its independent Python oracle, and `tests/fixtures/numerics-instruments/`: a two-step energy ledger with reference explicit and symplectic Euler steps, the step history of the 3-D kernel's adaptive integrator, the divergence rate of an ensemble of pairs on the one validated three-body setting, a discrete Fourier periodogram for a small series, and the error of interpolating a table at points left out. Bounds were committed before any code. By the committed function the verdict is B: the divergence rate and the interpolation error pass; three legs failed in the first run and stay failing. Successor legs committed before they ran pass for the step history and the periodogram; the ledger's classification of an error as accumulating or oscillating still fails one leg, so the ledger is not released to a lesson. No lesson, panel or page is added and nothing links the compute page.
- **The population inference gate, follow-up (Prompt 264; documentation and fixtures only, nothing student-facing).** `POPULATION_INFERENCE_GATE.md` section 10 and `tests/fixtures/population/followup-*.json`: the three items approved on 2026-11-07, each with its bounds committed first and inherited from Part A by one stated rule. The new leg D8b (the coverage over all outcomes of the statement in the bins where zero estimates occur, on new seeds) reads 0.9495 in the prototype and 0.9535 in an independent oracle against [0.90, 0.99]. The penalised fit’s missed criterion is diagnosed (every such fit is at the optimum and ended at its iteration cap, at the rounding of the objective) and a repaired stopping rule, fixed before its first run, is met by all 2,406 fits. By the follow-up’s function the outcome is “A through D8b” and “penalty convergence passes” (22 rows: 12 pass, 0 fail, 7 reported, 3 not run), recorded as unratified evidence: Part A’s verdict stays B, D8 stays failing and labelled, and no bound moved. Four public e-prints were fetched for requests R1 and R3 (cite-only, outside the repository); the legs on real data stay NOT RUN because the archive and the catalogue service they need did not answer, and each carries its exact requests. One finding is reported and not repaired: the prototype’s constrained fit stops early in 4 of 4,000 cross-fed statements. The consumers condition is not met; no panel, lesson or viewer is built. Register rows D-R10-264-06 to -10.
- **A first week on one screen: Home's first-week mode, a collection's `firstWeek` and `more`, and the introduction rewritten for the five destinations (Prompt 277; visible and instructional).** An instructor ticks "First week" on a collection in the distribution kit (`/teaching/kit/#collections`), and its link opens Home showing only that list: up to seven items in order, the next one marked to start or continue, the three-screen introduction inside the first item (shown there on a first visit, on request afterwards), and nothing else but the five destinations' names. A student leaves it with one press, and it ends by itself when every item is done; until then a plain visit returns to the list. The collection can also say how the "More" sections of the investigation and instrument panels start for those students (`more`: open or shut; the activity's field of Prompt 167, on a collection), after the student's own choice. The introduction's second screen is now the five destinations, each with its one line and its one action, generated from the navigation inventory; its skip, its place in the first run, the welcome gate and the splash lifecycle are unchanged. Format: `firstWeek` and `more` are written only for a marked collection, which is already `gravitas.course-pack/3`; a 2.0.0 build refuses it by its version and a 2.1.0 build refuses it and names the field (FORMATS.md, `collection-first-week`). One new device-local record, `gravitas_first_week` (STORAGE.md), which a 2.0.0 build never reads. Fixed on the way: a lesson link that names a depth (`#investigation=<id>/<depth>`, as a course's links do) was covered by Home on a first visit. Not built: a disclosure state for a collection that is not a first week, a first-week mode set by an activity, and anything that needs Prompt 276's second part. Structural checks only: no student has used the mode, and the Spanish has not been read by a fluent reader. `ONBOARDING.md` has the flow and the screen inventory.
- **The censoring and truncation gate, follow-up: C2c and the cross-feed (Prompt 262; documentation only, nothing student-facing).** `CENSORING_TRUNCATION_GATE.md` gains section 10 and `tests/fixtures/censoring/` four follow-up files: the two legs the gate named for its failing leg C2o, with their bounds committed first. Both implementations of the truncation estimator cover 0.939 to 0.944 at 5000 replicates on new seeds (bound 0.92 to 0.98) and are the same function bit for bit on 24,000 cross-fed samples; pooled, the interval labelled 95 percent covers about 94 percent. Outcome by the follow-up's committed function: A through C2c, a delegated row not yet ratified. C2o stays failing with its bound unmoved, Part A's verdict stays B-KM by its own function, the authentic legs are still not run, nothing is built and no consumer is released. Register rows D-R10-262-06 to -08.
- **The advanced closeout: one sequence for the 3-D and mission guides, two reading steps, and a record (Prompt 274; visible and instructional).** The Library gains the sequence Spaceflight and the three-dimensional sky: every guide of the 3-D lab and of the mission lab, in the order of their prerequisites, in both languages, declared in `tools/library-curation.json` and held to the Library by `curatedSequences` in `tools/build-library.mjs`. The guides were in no sequence; each now shows the pathway it is in and a next entry, and the sequence is listed in the Library's pathways, its sequence filter and the topic pages of its subjects. `upper-level-modules` 1.6.0 to 1.7.0: a reading step in the celestial mechanics unit for the launch windows over a grid of dates, mission budgets, rendezvous and gravity assists on the ephemeris and measured resonances that have no investigation, and one in the computation unit for the numerical methods that have none outside the compute page, each saying why; the five compute investigations are unchanged and no compute link is added. `ADVANCED_CLOSEOUT.md` records what Prompts 268 to 273 landed, each closeout item as done, not applicable or held, the sequence Computational astrophysics as NOT CREATED (it would hold only the five investigations that need the compute page, the listing the compute gate's leg G5.b failed), the cohesion check, and an acceptance audit of the twelve guides that finds no written reflection in eleven and no uncertainty on a measured value in any; neither is repaired here. Three evidence-status rows (`compute-page-gate-ii`, `lab3d-curriculum-ii-recomputed`, `guide-sequence-placement`), `tests/advancedCloseout.test.js`, register rows D-R10-274-01 to 274-05, and a note in `INTEGRATION.md` that this is the last content closeout before Prompt 287. No step, guide, lesson or page markup changed; the Spanish is unreviewed by a fluent reader.
- **Resonances and secular dynamics II, the Part A addendum: a ripple-free libration estimator and steps from an error budget, addendum verdict B (Prompt 273; invisible, nothing student-facing).** `measureLibrationHarmonic` (`js/lab3d/libration.js`: a Hann-tapered least-squares line that measures a libration smaller than its ripple and refuses a short window, a missing line, a drifting centre or an unrepeatable line) and `stepForBudget` (`js/lab3d/stepBudget.js`: a fixed step derived from an energy and an angle budget), with 25 new legs whose bounds were committed first (`tests/fixtures/resonances-ii/addendum-thresholds.json`), an amended independent oracle, `tools/resonances-ii-addendum.mjs` and `tests/resonancesIIAddendum.test.js`. 21 gated legs pass on the first run: the authentic Laplace argument of JUP365 is resolved at 2070.5 d (cited 2071 d). The check of the cited values against downloaded sources fails twice (the cited 0.064 deg amplitude is about twice what the ephemeris shows; the cited Pluto period 19,670 yr is stated by neither source read), so the addendum verdict is B and no consumer is built here. The first gate's 8 failed legs and verdict C are unchanged. See `RESONANCES_II.md` sections 9 to 13.
- **Your progress, on My work: done, in progress or not started by sequence and course, with the depth reached and prerequisites as advice (Prompt 276 part 1; visible and instructional; the recovery pattern is NOT built).** A section above Investigations lists each sequence and course with a count of what is finished, begun and not started, the investigations in order with their state ("in progress, 4 of 23 steps seen"), the depth reached from the progress record's own `deepest` field, and, on an investigation not yet done, "You may want X first" with a link when a prerequisite the Library names has not been finished. A prerequisite is never a lock: every link opens. The line "Where you left off" is the newest item of the resume record of Prompt 163. Nothing is written and no record, field or format is added (146's matrix and the compatibility corpus are untouched); the section is derived from the progress records, the Library list and the resume record, in `js/myWork/model.js`. There are no points, badges or streaks. Not built in this change: prerequisites on a Library card and in the lesson panel, the generated hint ladder after a wrong answer, the "try again with a worked example" path, the attempts record for Prompt 173's summary, and the comparison across investigations. Spanish has not been read by a fluent reader.
- **Resonances and secular dynamics II: the resonance kernel and its validation record, verdict C (Prompt 273; invisible, nothing student-facing).** `RESONANCES_II.md`, `js/lab3d/libration.js` (the resonant argument from 3-D elements, `measureLibration` with an uncertainty and a refusal below three libration periods, `secularRate`, the first-order apsidal rate), the committed thresholds, an independent `python -E` oracle on JPL Horizons JUP365 and pinned fixtures. Of 19 committed legs 9 pass and 8 fail and stay failing and labelled (the authentic Laplace argument is not resolved under its osculating ripple; the committed steps were too coarse; one oracle defect); follow-ups at finer steps pass. No panel, guide, lesson depth or model-page section; the Kozai-Lidov leg is NOT RUN. Spanish none written.
- **A report composed from the evidence you marked, on My work (Prompt 275 part B; visible and instructional).** Under the evidence review, "Your report" lists the entries you marked "For a report", from any number of investigations, as sections you put in order with Move up and Move down; a comparison made above can be added with the covariance statement it was made under ("Independence assumed", or "Covariance used" and where the number came from). "Make the report" keeps it as one of the things you made and offers it as a tagged PDF, an accessible HTML page, a CSV of its numbers and a report file for your instructor. Each section prints its numbers with their uncertainty in the one pattern used everywhere, and a methods paragraph generated from the record (the instrument, the settings and the seed it carries, and nothing it does not), in English and Spanish. The next submission token states the made report's digest; the review page reads the report file, says which submission states it, and checks the file against the digest (an edited file is shown as one). The report of each investigation is unchanged. New format `gravitas.composed-report/1`, with a row in the 2.0.0 reader corpus: an older build leaves the report out of its list and reads the rest as before. Not done: the composed report is not in the review page's results file or archive, and it carries no figures. Spanish has not been read by a fluent reader.
- **Review and compare your evidence, on My work (Prompt 275 part A; visible and instructional; Part B, the composed report, is not built).** When the evidence notebook holds entries, My work shows every one with filters by investigation, kind and date, a link to the page that made it, an annotation (your own words; the numbers and their checksum do not change) and a mark "for a report" (kept with the entry as `marked: true`; no report reads it yet). Two entries of one kind, or two quantities of one entry, can be compared: the difference with its uncertainty, its significance and the chance of so large a difference, by the comparison of Prompt 151, which agrees with the statistics kernel of Prompt 154 on a tested grid. The covariance is used when a record states one between two of its quantities or you give a correlation; otherwise the page says "Independence assumed." and, when the two records share their data or calibration, that their errors probably move together. The My work route ceilings rose by the measured overrun under the standing approval (95.3 to 95.5 KB from the sources; 36 to 36.6 KB and 3 to 4 requests from the build; D-R10-275-02). A 2.0.0 or 2.1.0 build drops the mark on its next save. Spanish unread by a fluent reader.

- **The 3-D lab taught in full: run modes, reference planes, an orbit editor and sky view, and five guides (Prompt 271; instruments invisible, guides instructional).** `/3d/` gains a Run mode control (Kepler-only, N-body with its integrator and step named, precomputed with its provenance) that every guide step declares and the lab enforces, a reference-plane switch (system, equatorial, invariable, an observer's sky), an orbit editor and sky view (the six elements in the chosen plane, an exact round trip, the apparent ellipse, the transit chord, the mutual inclination, a resonant pair's argument) and five bilingual guides: The language of orbits, Changing frames, Seen from here, Mutual inclinations and Resonant pairs (a libration only in N-body, over a stated window of 600 inner orbits). Validated against an independent Python oracle: 34 legs pass, E2 and E7 fail as committed (a measurement defect, labelled) and the smoothed legs E2s, E4s and E7s pass. Spanish is unreviewed by a fluent reader. Route ceilings of the lab and of three course routes, the idle precache tier and the line ceilings of three modules rose by their measured values (standing approval of 2026-10-10; register rows D-BUDGET-271-01 to 03). See `LAB3D_CURRICULUM_II.md`.
- **Mission lab II, the first window-and-budget workflow: the kernel and its validation record, verdict C (Prompt 272; invisible, nothing student-facing).** `MISSION_LAB_II.md`, `js/mission/workflow.js` (the five-row delta-v ledger with the rocket equation, one mission end to end on an ephemeris, the porkchop minimum), `fillRow` (the grid in row ranges, equal to the sliced window cell for cell, run through the real Worker-pool contract in a test); `window.js` is unchanged and the new module is in `NEVER_PRECACHED`, `tests/fixtures/mission-lab-ii/` (the contract committed first, public JPL Horizons rows, an independent shooting oracle, the legs and results) and `tests/missionWorkflow.test.js`. Of 19 legs 15 pass, 1 fails (A2, the minimum 33 days from the Hohmann epoch against a committed 20) and stays failing, 2 are NOT RUN (a pinned public mission summary and a pinned independent package, declared before any run), 1 is not applicable; the lab's Lambert agrees with the oracle to 3.5e-9 km/s on identical states and the grid to 3.5e-5 km/s per cell. No panel, guide, model-page section or follow-on part was added (consumers rule); no ceiling raised, no closure file added. Register rows D-R10-272-01 to -04.
- **Numerical-methods investigations in the application: a record, not the investigations (Prompt 270; documentation only, nothing student-facing).** `NUMERICAL_INVESTIGATIONS.md` and `tests/numericalInvestigationsRecord.test.js`: the five investigations of the roadmap (How wrong is Euler?, Adaptive steps, Chaos, measured, A periodogram from scratch, Interpolating the models) were not built, because each needs instructor content in a source the instructor bundle reads, the closure has no file to spare and the ciphertext is the queue's, and four need an instrument that does not exist. The record states what the tree already has for each (the engine's integrator table, the 3-D kernel's adaptive step and its per-step hook, the divergence module that refuses, 265's lazy ensemble module, 152's interpolation), the design of the five, the measured sizes, what a build needs and four questions for Carl (register rows D-R10-270-01 to -03). Nothing was downloaded, no ceiling was raised, and no Spanish was written.
- **The compute page gate, second edition (Prompt 268; documentation only, nothing student-facing).** `COMPUTE_GATE_II.md` and `tests/fixtures/compute-gate-ii/`: the ten candidate notebooks of the roadmap (integration order, adaptive steps, orbital chaos from engine runs, Kepler's equation, least squares, a periodogram, isochrone interpolation, a polytrope, a Barnes-Hut toy, synthetic populations) were committed with their 56 legs and 14 page legs for the roadmap's seven thresholds before any code, prototyped on a spike against an independent Python oracle and the Gravitas modules they name, and judged by the committed function: 57 pass, 6 fail, 4 not run, 3 reported, **verdict C** (the page's coupling to a built-in course, its route ceiling and the missing runtime check fail for every candidate; the legs that need the pinned runtime in a browser were not run). Prompt 269 is not run; 270 and 274 ship without compute links; nothing was built. Register rows D-R10-268-01 to -05.
- **Evidence-status rows for four T5 gates (checkpoint VI repair R-VI-1; documentation only, nothing student-facing).** `tools/evidence-status.json` gains `supernova-likelihood-gate` (status UNKNOWN: verdict FC against the release's covariance), `censoring-truncation-gate` (partial: verdict B, slice B-KM, with C2o failing), `clustering-gate` (partial: verdict B, B9 not run) and `population-inference-gate` (partial: verdict B, with D8 failing), each saying what it does not claim and that no consumer is released; `docs/evidence-status.md` regenerated.
- **Continuation checkpoint VI (Prompt 267; documentation only, nothing student-facing).** Records the continuation decision for tranche T6 as register row D-R10-267-01 and a line in `INTEGRATION.md`: CONTINUE AS PLANNED, T6 (R23 to R26, prompts 268 to 295) may run under the operating terms the row lists (the deferred ceiling has 57.8 B of room, first-visit precache 40,891 B, idle precache and the packs 0 B, the instructor closure one file from its cap). T5 shipped eleven kernels and gates with 41 recorded failing legs and one course change, raised one ceiling under the standing approval (idle precache +42 B, #567), and no tag, release or DOI is proposed before Roadmap III completes. The report is `CONTINUATION_CHECKPOINT_VI.md`, beside the roadmap files and outside the repository. Corrects the Prompt 261 count (24 checks, 20 pass, 3 reported, 1 fail, 3 not run; the verdict is unchanged).
- **The inference closeout (Prompt 266).** `INFERENCE_CLOSEOUT.md`: what Prompts 261 to 265 landed (a model-comparison kernel with one failing leg, a censoring and truncation gate of verdict B for the censoring estimator, a crossmatch kernel with two failing legs and a clustering gate of verdict B, a population-inference gate of verdict B with one failing leg, and an experiment runner with one failing leg; no lesson, panel, viewer or pack), what a student can and cannot do in inference today, the methods sequence as it exists, each closeout item done, held or blocked with its reason, the cohesion check and the acceptance audit of the three measurement investigations. The one visible change: the `upper-level-modules` package (1.6.0) gains What Is a Measurement?, What Does ± Claim? and When the Method Must Refuse at the advanced depth and a note, in English and Spanish, on the inference methods that have no investigation. No shipped step changed; the sequence "Measurement and inference" and the five investigations the prompt names are not created, for the reasons recorded. Four evidence-status rows (`measurement-investigations-recomputed`, `kernel-model-comparison`, `kernel-crossmatch`, `kernel-experiment-ensemble`). Failed legs stay failing and labelled; the Spanish is unreviewed by a fluent reader.
- **The cosmology closeout (Prompt 260; documentation only, nothing student-facing).** `COSMOLOGY_CLOSEOUT_II.md`: what Prompts 255 to 259 landed (a late-time kernel and four gate records, with their failed and not-run legs and no lesson, panel, viewer or pack), what a student can and cannot do in cosmology today, each closeout item done, not applicable or blocked, the Appendix C consequences, the cohesion record and the questions for Carl. The three connecting investigations are blocked and not built; the Cosmology sequence, the alignment rows for chapters 28 and 29 and the upper-level package are unchanged. Two V-internal rows join the evidence-status record (`kernel-cosmology-late`, `cosmology-gates-ii`). No ceiling, bound or shipped step changed.
- **Experiment runner II: reproducible random experiments (Prompt 265; the lazy module and its record; nothing student-facing).** `js/experiments/ensemble/` (lazy tier, imported by no shipped module), `EXPERIMENT_ENSEMBLES.md`, `sdk/schemas/experiment-2.schema.json` and `tests/fixtures/experiments-ensemble/`: the experiment record gains an `ensemble` block (named streams, the stream fork per trial, the kernel versions) and is `gravitas.experiment/2` only when it uses it (a manifest without it is still /1 byte for byte; the corpus row `ensemble-fields` is carried and a 2.0.0 reader refuses /2 by its version); four kinds (a sweep through Prompt 149's legacy streams, an ensemble of one world with different seeds, an injection campaign with Prompt 229's matched filter as the client, a bootstrap over the trials of a finished result); the runner is a client of Prompt 153's pool with cancellation, progress and resume; every trial is a `gravitas.artifact` envelope; the summary goes through Prompt 154 (Student interval, bootstrap interval of the median, quantiles, outcome shares, `not-constrained` where an interval has no width); a record re-runs from itself alone to the same SHA-256 digest, which a report cites. Validation contract committed first against an independent Python oracle: 22 legs pass, **1 fails and stays failing** (A8: the three-body kind on the scenario's own settings does not reproduce Prompt 137's regression statistics to 1e-9; the same kind on the validation lab's settings does, to the digit), F2 (Node 20 and the browser engines) is not run here and F1 (authentic data) is not applicable. Not built: the two upper depths and 'Luck or law?' (they change the instructor answer keys), a panel that creates an ensemble, and Prompt 184's frame injection as a client. No ceiling touched.
- **The population inference gate (Prompt 264 Part A; nothing student-facing).** `POPULATION_INFERENCE_GATE.md` and `tests/fixtures/population/`: one selected-population likelihood for planet occurrence and for a mass function, committed first with its domain and limits (binned rates, an exposure built from Prompt 154's selection object, per-object Gaussian uncertainties as a convolution over bins, the maximum by EM with SQUAREM, profile-likelihood intervals, a floor below which a bin is not constrained, a smoothing penalty named as a penalty and given no interval), four hand examples derived on paper, the scenarios, seeds and a verdict function; an independent oracle (numpy and scipy, two algorithms) pinned before the prototype existed; amendments AM1 and AM2 recorded before the first run and AM3 after it (a correction of the validator's P2 status to the committed bound, the first run kept beside it). 52 rows: 42 pass, 1 fail, 6 reported, 3 not run; **verdict B**: the counts path equals Prompt 229's engine on 8,000 cells to one unit in the last place; with per-object uncertainties the intervals cover 0.947, 0.947 and 0.951 at a nominal 0.95 and equal the oracle to 1e-11; leg D8 (the upper limit among zero estimates, 0.62 against 0.94, a leg that conditions on the outcome) fails and stays failing; the penalty is admitted as a toggle. Authentic data (X1 to X3) NOT RUN with four fetch requests; the consumers rule holds and Part B is not begun. Register rows D-R10-264-01 to -05 (DELEGATED).
- **The crossmatch kernel and the angular clustering gate (Prompt 263; nothing student-facing).** `CROSSMATCH.md`, `CLUSTERING_GATE.md`, `js/kernels/crossmatch/` (lazy tier, imported by nothing) and `tests/fixtures/crossmatch/`: positions moved to a common epoch with their proper motions and refused when an epoch is absent, a nearest-neighbour match with a committed maximum radius, refusal of rounded or unstated positions (the rounded neighbourhood pack is refused with the reason, the precise Gaia and SDSS packs pair for pair with astropy), a shifted-match false-match estimate with an interval, the joined table as a record with the match distance and the epoch difference per row, and populations with Poisson intervals and a two-sample comparison in its valid class. Bounds committed first with an independent astropy oracle: 43 rows, 37 pass, 2 fail (a derivation mistake in one committed expectation and a sampling-noise miss at 0.9385 against 0.94; both stay failing, three new legs with corrected bounds pass), 3 reported, 1 not run. The clustering gate (Landy-Szalay, prototype on a spike) returns verdict B: the estimator and a detectable size of 200 points on a synthetic clustered sample, one job in 5.6 s and 3 MB, the SDSS strip not claimed. The consumers rule is held, so the table tool, the panel, the lesson and 'Clustered or random?' are not built. Register rows D-R10-263-01 to -06 (DELEGATED).
- **The crossmatch and clustering gates' data legs (Prompt 263 follow-up; nothing student-facing).** With Carl's permission to download public data, the SDSS epochs (R1), the Gaia archive's published SDSS best-neighbour table (R2), the strip's declination (R4) and two citations (R3, R6) were fetched into `scratch-data/` and recorded in `tests/fixtures/crossmatch/SOURCES.json`. The kernel's pairs with the survey's own per-object epochs equal an independent astropy calculation (604 pairs, none differing) and agree with the published table to one pair in 604; the strip with its declination shows an excess of close pairs at 0.05 to 2 degrees (reported, not a calibrated measurement); B9 stays NOT RUN (no same-sample published correlation, no footprint) and the clustering verdict stays B. A6 and G2 stay failing. `CROSSMATCH.md` section 10, `CLUSTERING_GATE.md` section 8, `D-R10-263-07` to `-09`; no code under `js/`, no bytes shipped.
- **The censoring and truncation gate (Prompt 262 Part A; nothing student-facing).** `CENSORING_TRUNCATION_GATE.md` and `tests/fixtures/censoring/`: censoring (an upper limit) and truncation (an absent object) kept as two problems; a left-censored product-limit estimator with bounds when the smallest observation is a limit and a log-rank check of independence, the Lynden-Bell estimator above a declared limit, and V/Vmax with an effective volume, all committed first with their domains, seven hand examples derived on paper, the scenarios, seeds and a verdict function; an independent oracle (numpy and scipy, a second algorithm for truncation) pinned before the prototype existed; amendments AM1 to AM3 recorded before the first run. 41 rows: 33 pass, 1 fail, 3 reported, 4 not run; **verdict B, slice B-KM**: the censoring estimator passes every leg (coverage 0.944, 0.938, 0.945; bit-for-bit agreement with the oracle; value-dependent censoring flagged in 500 of 500 replicates), the truncation estimator fails one leg (the oracle's own T1 coverage 0.919 against a committed 0.92, left failing), V/Vmax is admitted. Authentic-data legs are NOT RUN with exact requests. Part B and every consumer wait (the consumers rule); no bytes shipped, no ceiling raised.
- **Model comparison within valid model classes (Prompt 261; the kernel, its contract and validation; nothing student-facing).** `js/kernels/statistics/modelcompare.js`: a pair of models is classified from three declared flags that never default (nested, boundary, searched) as nested and regular (the F-test of Prompt 154), nested and non-regular (simulation-calibrated significance with the search included, the F-test refused with its code) or non-nested (AIC, AICc and BIC as penalised likelihoods with no evidence, no weights and a refusal below 20 values or 5 per parameter), plus deterministic leave-one-out. The calibrated p value is (1 + #{T* >= T}) / (1 + B), never zero, with one named random stream per draw so a pool's chunks equal a serial run. Every bound was committed first (1ee61703), then an independent python oracle, then the kernel; 24 checks: 20 pass, 3 are reported, and one fails and stays failing (with the three NOT RUN requests, 27 rows) (F1: the TESS light curve of eta Aquilae gives p = 0.011, not at the 0.001 floor the bound required; the oracle's own search agrees, so the cause is the data). Three published-value legs are NOT RUN with their fetch requests in `STATISTICS.md`. The comparison instrument's panel and the three investigations are not built (the consumers rule). `npm run modelcompare:validate`.
- **The microwave background angular-scale gate (Prompt 258 Part A; nothing student-facing).** `CMB_SCALE_GATE.md` and `tests/fixtures/cmb-scale/`: the conventions (r_s(z*) from the integral, D_M(z*) from the late-time kernel, theta* = r_s / D_M, the peak relation with its offset as an input), a bounded peak fit and a claim rule against reading a Hubble constant or a composition from a grid, committed first with five recorded amendments (one of them after the oracle's first run was read); 42 rows against an independent Python oracle (astropy, scipy) and the printed rows of Planck 2018 VI: 25 pass, 5 fail, 4 reported, 8 not run. The integral reproduces the printed 100 theta* to 1.5e-6 (not blind, mixed columns) and D_M to astropy at 4e-15; the committed direction of r_s with z* was wrong physics and stays failing (B5), and the quadratic peak fit's intervals are not calibrated (E1, E2). Kernel verdict C; the binned spectrum, the grid, the cited fitting formulas and the cited code's output are NOT RUN with exact requests and no rights decision (NOT DECIDED). The prototype is on a spike branch and nothing is built; the consumers rule holds.
- **Leg B6 of the late-time FLRW kernel, the published ages (Prompt 255; nothing student-facing).** The comparison rule was committed first (afd2a3e0): three age-only legs (no printed table of distances was found), tolerance from the printed precision plus a stated radiation and neutrino allowance, none read from a result. Run once: Planck 2018 VI best-fit age and Wright's two printed empty-universe ages all pass; the literal one-unit reading fails for Planck and the Planck leg cannot test the radiation. Product verdict C (original form) and A (follow-up form), each age-only; the consumers rule is held and lifting it is Carl's call. Register rows D-R10-255-09 to -12 (DELEGATED); see COSMOLOGY_II.md section 10.
- **The multi-messenger authentic-data legs (Prompt 244 follow-up; nothing student-facing).** The leap-second list, the printed numbers of the paper that published the speed-of-gravity bound and the Fermi GBM trigger header, supplied by Carl's session, ran legs B2, B4 and E1 of the first gate. Bounds were committed first in their own commit (`authentic-thresholds.json`), by a stated rule, before the files were copied or any run; amendments AM5 to AM7 recorded before the first run. B2 (against astropy, 1.2e-7 s), B2b (an independent parse of the list), B4 (the printed pair -3e-15 and +7e-16) and B4o (exact rational arithmetic) pass; E1b passes (the trigger-minus-merger delay of the pack and the header, 2.0746 s, against astropy and against the delay the paper's numbers imply for the trigger); **E1 is NOT RUN** because the paper's +1.74 s is the burst's emission onset, not the trigger time, which the supplied file's own definition text gets the other way round (recorded, the file kept as supplied); E3 is NOT RUN (no photometry fetched). No leg fails; no lesson, panel or viewer was built (the consumers rule holds). `MULTIMESSENGER.md`, register rows D-R10-244-04 to -06.
- **The late-time FLRW follow-up (Prompt 255b; nothing student-facing).** Four new legs committed before any code by a stated rule (no bound read from an old measurement): A7b (the open matter-only age with the corrected sign, also checked against an independent quadrature), B1b and B3b (astropy's age(z) judged only where astropy satisfies its own lookback-plus-age identity), F3b (an opt-in Richardson rule of the direction tool, d ln D / d ln H0 = -1 to 1e-9). All four pass; follow-up kernel verdict A by the committed function with the four replaced, the original verdict C kept on record and the four old legs left failing and bit-identical. B6 stays NOT RUN, the consumers rule holds. `tools/cosmology2-followup.mjs`, `tools/cosmology2-oracle/followup-oracle.py`, `tests/fixtures/cosmology2/followup-*.json`, `COSMOLOGY_II.md` section 9, D-R10-255-06 to -08.
- **The late-time FLRW kernel and its gate (Prompt 255, kernel, contract and validation; nothing student-facing).** `js/kernels/cosmology/late/`: the Friedmann equation with matter, radiation, curvature and a constant-w dark energy; comoving, transverse, luminosity and angular-diameter distances, the distance modulus, lookback time, the age and the age at a redshift, each with the integrator's error estimate carried; the deceleration parameter and the transition redshift; closed universes with their antipode; a stated domain whose refusals (a bounce, a negative density, w out of range, an unbounded age) carry a code and a reason; the degeneracy of a distance at fixed redshift as contours and a local direction; `tools/cosmology2-validate.mjs`, `tools/cosmology2-oracle/` (numpy, scipy, astropy, no Gravitas code), `js/validation/groups/cosmology2.js`, `tests/fixtures/cosmology2/`, `COSMOLOGY_II.md`. Thresholds committed first; two amendments before any validator row, no bound moved. 28 rows: 22 pass, 4 fail and stay failing (a wrong sign in the committed open-universe age; astropy's own age(z) at z of 100 and 1100, which fails its own lookback-plus-age identity by 5e-7, in two legs; a 1 percent differencing step against a 1e-8 bound), 1 reported, 1 NOT RUN (a published table: no file supplied, nothing fetched). The kernel agrees with astropy to 4e-14 and with an independent quadrature to 8e-15 on ten sets to z = 1100. Kernel verdict C by the committed function; product NOT ESTABLISHED. The panels, the three lessons' upper depths and the model-page section wait for Carl (consumers rule). Not re-exported by the cosmology index, NEVER_PRECACHED, no ceiling raised.
- **Checkpoint V repairs (R-A, R-C and R-D; documentation and the install tier only).** The dynamics and multi-messenger kernel files and the Gaia parallax workflow files of the galactic kernel (`astrometry`, `cuts`, `gaia`, `zeropoint`, `zeropointTables`) leave the install-time core tier of the service worker and join the paths the service worker keeps after their first online use: no start-up path imports them, the Gaia lessons that do were never installed, and the first-visit precache measurement falls by their gzipped size (the change is in `tools/build-service-worker.mjs`; `sw-manifest.js` is its output; no ceiling is lowered). The upper-level package (1.5.0) now says in the teacher note of the galactic reading step what the moving-cluster gate returned (verdict C in its committed form and in its follow-up, Part B not run), English and Spanish, where it had said moving groups were never run. `tools/evidence-status.json` gains a V-internal row for each kernel of tranches T2 to T4 that has a validator, each marked by what its gate and failed-legs record say (the verdict where there is one, the failing legs and the NOT RUN legs by name, no count); `docs/evidence-status.md` is regenerated. Register rows D-R10-254-02 to -05.
- **The extragalactic closeout (Prompt 253).** `EXTRAGALACTIC_CLOSEOUT.md`: what Prompts 247 to 252 landed (an interstellar-medium kernel with no failing leg and a plasma gate with no result; galaxy-spectra, galaxy-morphology, galaxy-cluster, lensing and active-galactic-nucleus kernels, each with its recorded failing and not-run legs and no consumer released; no student-facing item from any of them), each closeout item recorded as done, not applicable or blocked with its reason (the five connecting investigations are blocked by held consumers or files not fetched, and large-scale structure is already covered by Where Galaxies Live), the cohesion check (section 9.4) and the acceptance audit (8.4) run over the extragalactic investigations that are shipped, the data ledger, and what would unlock each blocked item. The upper-level astrophysics package, 1.3.0 to 1.4.0, gains a reading step in its cosmology unit for what has no investigation (the gas between the stars, a galaxy's colour and its stars, dust in galaxies, the Local Group, galaxy shapes, clusters, active nuclei), each reason recorded. One evidence row, `cosmology-investigations-recomputed`. No sequence, alignment row, investigation, panel, pack or ceiling was added or changed, nothing was fetched and no published number was typed (D-R10-253-01 to -05).
- **The galaxy-cluster follow-up (Prompt 250, 250b; nothing student-facing).** Three new legs committed before any code, for the first gate's findings, with the first gate's results bit-identical: the light interval with the cluster redshift's distance term (C4b, fails the 95 percent band by 0.01), a contamination flag on the dispersion's expected bias (D3b, flags well, its estimate of the size of the bias falls short at 50 percent interlopers and the leg fails), and a refusal for a field with no cluster by an overdensity test (R6b, passes). Opt-in options only: `light.distanceTerm`, `contaminationRule: 'bias'`, `requireOverdensity`; `npm run clusters:followup`; an independent scipy and astropy oracle for the new closed forms; follow-up kernel verdict B.
- **The galaxy-cluster kernel and gate (Prompt 250, kernel, contract and validation; nothing student-facing).** `js/kernels/galaxy/clusters/`: rest-frame velocities, membership by an iterated sigma clip with a stated pass cap and the clip's Gaussian truncation factor, the plain or biweight velocity dispersion with analytic or bootstrap uncertainty and per-galaxy error subtraction, a kurtosis flag and a contamination flag, great-circle geometry with the half-number and harmonic radii, the virial mass `K sigma^2 R / G` with a caller-supplied projection factor and a three-term interval, the cluster's light and mass-to-light ratio (bounds labelled), the morphology-density fraction with exact binomial intervals, the baryon budget from a cited gas mass, and labelled synthetic clusters; an independent numpy/scipy/astropy oracle, a validator with its committed thresholds (`npm run clusters:validate`), a six-check validation group, and `GALAXY_CLUSTERS.md`. 42 legs: 27 pass, 3 fail and stay failing (the bootstrap interval of the dispersion, the light interval, the contamination flag), 4 not run (no cluster table was supplied and nothing was fetched), 8 reported; kernel verdict B. No panel, lesson, model section or pack, and the Coma pack's re-sourcing waits for a table.
- **The time-domain closeout (Prompt 246; documentation only, nothing student-facing).** `TIME_DOMAIN_CLOSEOUT.md`: what Prompts 239 to 245 landed (kernels, validators and gate records; no lesson, panel, viewer or pack), what a student can and cannot do in the time domain today, each of the closeout items recorded as done, not applicable or blocked with its reason, the cohesion check (section 9.4) run against the tree, and the files and rulings that would unlock the five connecting investigations. No investigation, sequence, alignment row, topic page or course item is added; the unit is NOT READY as a student-facing unit. No bound moved, nothing fetched, no ceiling raised.
- **The Galactic closeout (Prompt 238).** `GALACTIC_CLOSEOUT.md`: what Prompts 233 to 237 landed (two Gaia investigations and their panels; 234 never run; a kinematics gate with verdict C for all four methods; a rotation-curve decomposition kernel and a stellar-dynamics kernel, each with failing legs and no consumer), each closeout item recorded as done, not applicable or blocked with its reason, the cohesion check (section 9.4) and the acceptance sheet (8.4) run over the two Gaia investigations, the data ledger, and what would unlock the connecting investigations. The upper-level astrophysics package, 1.2.0 to 1.3.0, gains How far, and how sure? and What Gaia does not see at the advanced depth and a reading step for what the Galaxy unit has no investigation for (the center, the arms, the Galaxy's history, a satellite falling in, 21-cm mapping), each missing item's reason recorded. No connecting investigation, sequence, alignment row or topic page is added; the unit is NOT READY as a student-facing unit. No bound moved, nothing fetched; one precache ceiling raised by its measured 32 bytes.
- **The lensing time-delay and finite-source spike, result only (Prompt 251, Part B; nothing student-facing).** The prototype (delay model, mass-sheet transformation, conditional H0, finite-source rho search, blend profile) was run on `spike/lensing-delays-gate`, which is never merged, against the committed bounds and the pinned independent oracle; this records the results in `tests/fixtures/lensing2/gate-spike-results.json` and `gate-spike-failed-legs.json`, the three amendments recorded before the run (`gate-thresholds.json`), the oracle's scipy fit of the 200 finite-source events, and `LENSING_DELAYS_GATE.md`. Verdict C by the committed function: G1, G2, G4 and G5 pass; G3, G7 and G8 fail and stay failing; G6 and G9 are NOT RUN (no data). No H0 value is reported and nothing is built (D-R10-251-06).
- **The enclosed-mass lensing extension and the time-delay gate (Prompt 251, Part A kernel and validation, Part B thresholds; nothing student-facing).** `js/kernels/lensing/enclosed/`: lens distances from redshifts in a flat cosmology with refusals (no lens redshift is 'not constrained', nothing is defaulted), the critical surface density, the mass inside an Einstein radius and the SIS velocity dispersion as the alternative input, point-lens and SIS image positions and their inversions (one image each side of the lens, both models shown with the factor between them), the arc radius as a geometric circle fit through marked points with its covariance and the centre's own uncertainty, and the mass from an arc as a statistical interval for a ring or a model-limited bracket for a single arc (the narrow on-axis interval covers an off-axis arc in 0.5 percent of the worlds, the bracket in all of them), with labelled synthetic generators; `tools/lensing2-validate.mjs`, `tools/lensing2-oracle/` (numpy, scipy, astropy, no Gravitas code), `js/validation/groups/lensing2.js`, `tests/fixtures/lensing2/`, `LENSING_II.md`, `LENSING_DELAYS_GATE.md`. Thresholds committed first; two amendments before any run, no bound moved. Part A: 27 rows, 20 pass, 0 fail, 3 reported, 4 NOT RUN (the cited tool and three authentic legs); kernel verdict A, product NOT ESTABLISHED. Part B: the delay model, the mass-sheet degeneracy and the verdict function committed, the independent delay and H0 calculations pinned, no prototype built and no verdict; of three legs on merged code two pass and one (P2, the finite-source magnification at a source radius of 1e-5, 1.2e-7 against 1e-8) is left failing and labelled. No H0 is reported. The viewer mode, the cluster pack, the upper depth of Einstein Rings and Arcs, the model section and every lesson wait for Carl (no consumers rule). Not re-exported by the lensing index, NEVER_PRECACHED, no ceiling raised.
- **The galaxy-morphology kernel and gate (Prompt 249, Part A kernel and validation, Part B thresholds; nothing student-facing).** `js/kernels/galaxy/morphology/`: the Petrosian radius and the fixed point of the second moments in elliptical apertures (shape and centre), isophote annuli, the surface-brightness profile with labelled intervals, the curve of growth (half-light radius, r_20, r_80, total flux inside 2 r_P), total magnitude and colour with a caller's zero point, concentration and the 180-degree asymmetry, an `unresolved` status with no size claim, noise-injection uncertainties, a classification function that takes the caller's rule and holds no published boundary, and a labelled synthetic image generator with analytic truths; 34 validation legs against an independent numpy and scipy implementation (15 pass, 6 fail and are left failing and recorded, 3 reported, 10 not run: the authentic SDSS legs and Part B's gate). The failures: concentration of an n = 4 galaxy low by 0.1 with no PSF, a sign in a committed sentence (a new leg passes), the annulus axis ratio, two oracle bounds in the inner profile, a 0.38-sigma bias in the half-light radius, and n = 4 galaxies a quarter of the PSF wide called resolved. Part B (PSF-convolved and two-component fits, Tully-Fisher) has its thresholds and verdict function committed and no leg run; Tully-Fisher's data requirement is recorded as unmet. No image-panel tool, lesson, pack or model section (consumers rule unmet); nothing fetched. `GALAXY_MORPHOLOGY.md`, `GALAXY_PROFILES_GATE.md`, D-R10-249-01 to -05.
- **The AGN kernel and gate (Prompt 252, Part A kernel, contract and gate; nothing student-facing).** `js/kernels/agn/`: the redshift of a quasar from its broad lines (Prompt 248's correlation with a broad-line template the caller supplies and a 401-sample high-pass, an opt-in parameter whose default is unchanged), the luminosity at the observed band through the cosmology kernel with the band and the absence of a K-correction stated, the bolometric luminosity as a caller-supplied factor whose scatter is a separate model-limited term (refused when the band does not map to the factor's), the Eddington luminosity and the mass it bounds from below (always labelled a bound with its assumptions), the fastest significant e-folding time of a light curve and the light-crossing size bound, the BPT classes with caller-supplied dividing curves, seeded probabilities, refusals and the stated limits of two ratios, and a labelled synthetic generator. Validation contract committed first (`tests/fixtures/agn/thresholds.json`), independent oracle (numpy, scipy, astropy constants), 41 legs: 20 pass, 5 fail and stay failing (an invented line spacing that makes a shifted template align with itself so the committed ambiguity rule refuses 45 percent of worlds, a redshift systematic floor the noise-only interval omits, two fits that disagree by a sigma, a failed fit that is not called a non-detection), 4 reported and 12 wait for files. The luminosity-function gate (Part B) has committed thresholds and no verdict (`AGN_LUMINOSITY_FUNCTION_GATE.md`). The viewer modes, the two investigations and the model section are not built (the consumers rule is unmet). Kernel and group are NEVER_PRECACHED. See `AGN.md`.
- **The AGN follow-up: a non-harmonic world, a failed fit as a non-detection and a redshift floor (Prompt 252b; nothing student-facing).** Carl's 2026-11-05 rulings on the 252 questions, each as a new leg with its thresholds committed first (`tests/fixtures/agn/followup-thresholds.json`, no amendment) and the old legs untouched: `generateQuasar` and `quasarTemplate` take `lineSet` (`'non-harmonic'`: the invented lines at 0.175, 0.285 and 0.35 of H-alpha, chosen by a written separation rule; the harmonic world stays the default), `measureBptLines` returns a failed fit at the expected position as `line-not-detected` with `fitFailed` (the old code stays behind `fitFailureCode`), and `quasarRedshift` carries a default model-limited floor (one grid sample over the square root of twelve, replaced by a caller's `systematicKmS`) beside the unchanged noise-only `sigmaZ`. Five new legs (A7b, B3b, C1b, C1c, D2b; `npm run agn:followup`), an independent oracle leg on the new world, and **all five fail and stay failing**: the harmonic spacing was a cause of the refusals (45 percent fell to 14) but not the only one, because where H-alpha leaves the spectrum's cut the correlation can prefer a lag that overlaps more of the template; the floor closes the undercoverage and slightly overshoots; the D2b bound of all-of-200 fails on one noise fluctuation. Questions for Carl are in `AGN.md`. See `AGN.md`.
- **The SED kernel and gate (Prompt 245, kernel, contract and gate; nothing student-facing).** `js/kernels/sed/`: flux-density conventions (AB and Vega magnitudes per band through the radiation kernel's zero point and the bandpass pack's offsets, f_nu, f_lambda, nu f_nu), the point contract that carries band, convention, band-integrated versus monochromatic and epoch on every point and refuses a point that does not say (by code), a blackbody fit of temperature and angular radius in log flux with a profile interval, an adequacy test, the stated range and `not-constrained` for two points or an open profile, nonsimultaneity as a per-point flag that widens the error by a stated allowance, the integrated SED with the model's tails as labelled extrapolation, the luminosity with a distance and a seeded bootstrap interval, and a labelled synthetic generator. Validation contract committed first (`tests/fixtures/sed/thresholds.json`), independent oracle (astropy, numpy, scipy), 24 legs: 14 pass, 4 fail and stay failing (the AB zero point of the tree, 3631 Jy, against astropy's 48.60 mag by 6.0e-5; the radiation kernel's band mean and pivot quadratures by 1.8e-5 and 4.5e-5; the luminosity interval, which omits the integration's 2 percent bias; four Rayleigh-Jeans points that fixed a temperature in 28 percent of runs), 2 reported, 4 not run (no catalogue file was supplied). Kernel verdict C by the committed function, and no catalogue flux, zero point or licence term was typed or fetched. No SED view, investigation or pack. `SED.md`, `SED_GATE.md`.
- **The SED follow-up legs (Prompt 245, follow-up; nothing student-facing).** Four new legs committed before any code or run, the first gate's failed legs left on record: the AB zero-point difference (3631 Jy against 48.60 mag, 6.0e-5) reported with the conversions agreeing to 6e-16 (one sub-check of B1b fails at 1.2e-12 against a 1e-12 bound, the conditioning of a small number, and stays failing), the radiation kernel's quadratures inside the trapezoid's own error rule (B2b pass), a model-residual luminosity integral (`integration: 'model-residual'`) whose interval covers 0.587 and 0.947 where the chords covered 0.033 and 0.220 (C2b pass), and the colour temperature against a published one reported with the adequacy flag. Follow-up kernel verdict C (B1b, D3). `SED.md`, `SED_GATE.md`, `npm run sed:followup`, D-R10-245-05 to -07.
- **The X-ray counts kernel and gate (Prompt 243, kernel, contract and gate; nothing student-facing).** `js/kernels/xray/`: the counts-series contract (time system and barycentric flag, exposure per bin, good-time intervals, dead time, energy bands, background) with every refusal by code, so a series without good-time intervals is refused; the Poisson rate with the exact interval at every count; binning by counts; the hardness ratio with an exact binomial interval; outburst detection with a refusal when no quiet level exists; the period search on the existing periodogram's statistic with its significance by simulation, an alias flag and a barycentric requirement; a labelled synthetic generator. 23 of 31 validation legs pass, 4 fail and stay failing (an alias the committed rule does not flag, a degenerate oracle case, the net-rate interval's coverage at a few counts, the period interval's coverage), 4 wait for authentic files that were not supplied; the kernel verdict is B (no period claims), the product verdict NOT ESTABLISHED. No product, pack, lesson or ceiling. `HIGH_ENERGY.md`, `X_RAY_COUNTS_GATE.md`.
- **The HI spectroscopy kernel (Prompt 241, kernel and validation; nothing student-facing).** `js/kernels/radio/`: the 21-cm rest frequency and the radio, optical and relativistic Doppler conventions; the heliocentric to LSR transform with both values of D-GAIA-03 kept as options and shown with the circular speed each gives; the fixed longitude mask (20 to 65 and 295 to 340 degrees, in the plane) and the refusals outside it and outside the solar circle; the terminal-velocity edge rule with the offset of a Gaussian-smoothed tangent edge computed by quadrature; the circular speed at the tangent radius with a 68.27 and 95 percent interval from the statistics kernel; the thin column density with an opacity diagnostic that says when the assumption fails; and a labelled synthetic HI spectrum generator with a truth manifest, which is the pack because every HI row of the radio data-rights gate is C. Validation contract committed first (`tests/fixtures/radio/thresholds.json`), independent oracle (astropy, numpy, scipy), 23 legs: 16 pass, 2 fail and stay failing (A1, a bound below double precision; C2, one refusal outside the committed allowance), 3 reported, 2 not run (no authentic HI spectra or tangent-velocity table). The Sun's V and Theta0 enter the method only as a sum; the interval is limited by the assumed gas dispersion, not by noise. `RADIO.md`; the spectra viewer's radio mode, the investigations and the model-page section wait for Carl.
- **The galaxy-spectra kernel (Prompt 248, kernel and validation; nothing student-facing).** `js/kernels/galaxy/`: a redshift from line identification (the ISM detection and identification, a free-width refit, an inverse-variance mean) and from direct lagged cross-correlation with a template the caller supplies, its uncertainty from the correlation peak's curvature, a significance ladder and an ambiguity refusal, and the 4000-angstrom break as a ratio of F_nu band means under a definition the caller states (the kernel holds no template and no band edges), with its limits priced; a labelled synthetic generator; 27 validation legs against an independent numpy and scipy implementation (17 pass, 3 fail and are recorded: a conservative line-method interval, a flat-spectrum expectation written wrongly, and a template mismatch the peak's significance does not flag; 3 wait for files). The viewer's galaxy mode, the two investigations and the model section wait for Carl. `GALAXY_SPECTRA.md`, D-R10-248-01 to -05.
- **The galaxy cross-correlation's goodness-of-fit refusal (Prompt 248 follow-up; nothing student-facing).** `crossCorrelate` reports the residual chi-square of the template match and, with the opt-in `refuseMisfit`, refuses `template-misfit` at the 1e-4 quantile (the rule committed before the code). New legs D3b (passes: 0 of 200 mismatched-template worlds confidently wrong, 0 of 300 exact-template worlds falsely refused), D2b (fails and is recorded: flat in F_nu still gives a low-significance correlation, not a refusal) and R1b (reported: 75 of 200 approximately-right templates refused). The earlier failed legs stay failing. `GALAXY_SPECTRA.md`, D-R10-248-06 to -08.
- **The interstellar-medium kernel (Prompt 247, Part A, kernel and validation; nothing student-facing).** `js/kernels/ism/`: line detection and identification against the radiation line pack in the spectrum's own medium, the continuum and the direct equivalent width with the continuum choice recorded, a Gaussian line fit and Doppler velocities that refuse a missing or mismatched medium, the column density in the linear regime only (the electron radius derived from a pinned reading of astropy's constants, the oscillator strength a required input, the regime tested by the doublet ratio or the line's peak depth and refused otherwise), the Balmer decrement and the colour excess through the CCM89 law (the intrinsic ratio and R_V required inputs), the stellar-versus-interstellar classification that says "ambiguous" when the data cannot tell, and a labelled synthetic generator with a truth manifest. Validated against a contract committed first, an independent implementation and seeded ensembles: 31 of 37 rows pass, none fails, 3 are reported and 3 (a cited tool, an authentic H II region, an authentic sodium column) are NOT RUN; the plasma-diagnostics gate (the [O III] temperature, the [S II] density) has committed thresholds and no verdict because its atomic data and independent pipeline are not in the tree. The overlays, investigations and model section wait for Carl's go-ahead. `ISM.md`, `PLASMA_DIAGNOSTICS_GATE.md`.
- **The pulsar kernel (Prompt 242, Part A, kernel and validation; nothing student-facing).** `js/kernels/radio/`: the cold-plasma dispersion delay with a constant derived from a pinned reading of astropy's constants and not typed; de-dispersion, folding with a trial-corrected detection probability, a harmonic-sum coarse DM search, a matched-filter arrival-time DM refinement and the period from whole-pulse sub-integrations, each with an interval from the statistics kernel; refusals by code; a crude DM distance that refuses without a cited electron density; a labelled synthetic dynamic-spectrum generator, which is the pack because every pulse-series row of the radio data-rights gate is C. Validation contract committed first (`tests/fixtures/pulsars/thresholds.json`), independent oracle (astropy, numpy, scipy), 30 legs: 24 pass, 1 fails and stays failing (A5, the noise-free period floor 2.53e-6 against 2e-6), 3 reported, 2 not run (no authentic series, no toolkit output). `PULSARS.md`, `npm run pulsar:validate`; the panel, the lesson, the model-page section and Part B wait for Carl.
- **The multi-messenger kernel (Prompt 244, kernel and validation; nothing student-facing).** `js/kernels/multimessenger/`: events of the two messengers (gravitational waves and photons; gamma-ray, optical and the other bands belong to photons) with each time's system (GPS, Fermi mission elapsed time, UTC, MJD) and definition, on one continuous scale through a leap-second table the caller supplies; the speed-of-gravity bound as a function of the assumed intrinsic emission delay, always returned with its assumption and refused when the assumption excludes equal speeds; sky areas and the galaxy-count problem; a stated host-ranking rule with refusals; the distance from a redshift; an illustrative expanding-blackbody kilonova model with a declared domain; a light-curve detection rule with exact false-alarm, detection and completeness figures. 24 validation legs pass, none fails, 4 wait for authentic files (`MULTIMESSENGER.md`, `npm run multimessenger:validate`, register rows D-R10-244-01 to -03).
- **Rotation-curve decomposition, kernel and validation contract (Prompt 236, Part A, the kernel half; nothing student-facing).** `js/kernels/galactic/decomposition.js`: a Hernquist bulge, Freeman's thin exponential disk and an NFW or pseudo-isothermal halo fitted through the inference core with the covariance, the disk-halo degeneracy as a profile over the disk mass, the disk mass range as a stated input, and "not constrained" for a halo the points do not fix; `ROTATION_DECOMPOSITION.md` with the validation contract (28 legs committed first: 21 pass, 4 fail and stay failing, 2 reported, 1 not run) and the independent scipy oracle. The panel, the lesson depth and Part B (the escape speed and the local density, deferred) are not built.
- **How far, and how sure? and What Gaia does not see (Prompt 233, Part B).** Two panels, `gaia-distance` (a parallax and its error as a likelihood in 1/r with the prior as an option, the status ladder, the interval and the tangential velocity) and `gaia-sample` (NGC 2420's 993 stars through the magnitude, parallax-over-error and RUWE cuts, with what each removes alone and in order, the colour-magnitude diagram, a velocity plot, and the cluster distance by the validation's contract), and two investigations in English and Spanish at three depths with instructor materials (one new closure file), placed in the galaxies sequence, with a model-page section. The cluster's measured distance is stated as 2.324 kpc with a statistical interval of 2.316 to 2.332 kpc and no systematic floor, with leg E1 NOT RUN and the value not validated against a published catalogue; Cluster Membership by Motion no longer calls it "about 2.6 kpc" (that was the uncorrected 1 / parallax reading). No blanket correction, and no distance from the rounded neighbourhood pack. See GAIA_WORKFLOWS.md.
- **Cluster dynamics and the dynamics reference gate (Prompt 237, kernel and gate; nothing student-facing).** `js/kernels/dynamics/`: the dynamical, crossing, half-mass and local relaxation times with a stated Coulomb logarithm, segregation and evaporation as cited orders of magnitude, Chandrasekhar friction and its sinking time in a singular isothermal sphere, the collisionless-versus-collisional criterion, and the virial mass with an interval from the statistics kernel and its refusals; an independent reference (own C Hermite code, no Gravitas code) and the engine's precomputed cluster runs (two `gravitas.grid` documents, generate-graph node `dynamics-runs`). The gate's verdict is C by the committed rule (the reference's momentum conservation, 8.2e-8 against 1e-9); the engine's runs pass their seven comparison legs with little power; two coverage legs and the cross-integrator leg fail and stay failing; the published-table leg is not run. See `DYNAMICS.md` and `DYNAMICS_REFERENCE_GATE.md`.
- **Gaia parallaxes as distances, with their assumptions (Prompt 233, kernel and packs).** `js/kernels/galactic/astrometry.js`: a parallax as a likelihood in 1/r with the exact interval and an open far end, a named and cited prior only as an option, a status ladder that returns a likelihood and no distance for a non-positive corrected parallax, the tangential velocity by sampling with the parallax-proper-motion correlations; `zeropoint.js`: Lindegren et al.'s zero point reimplemented independently from the tabulated coefficients (none of the authors' code; its output on 993 stars agrees to 2.9e-5 mas; its own uncertainty is not built in); `cuts.js`: what a sample's cuts remove through the statistics kernel's selection object. The two Gaia packs are version 1.1.0 with eight more columns (the correlations, RUWE, the solution type, the colour and the latitude the zero point needs); earlier columns are byte-identical. 23 validation legs pass, 3 are reported and one, NGC 2420's distance against the published range, is NOT RUN because no DR3-catalogue distance was available; the measured 2.32 kpc is reported unjudged. No investigation or panel yet. See GAIA_WORKFLOWS.md.
- **Exoplanet investigations, a sequence and a course (Prompt 231).** Four connecting investigations in English and Spanish with instructor materials and a deeper step layer, placed in the exoplanet sequence: One Planet, Every Method (what each of four methods fixes, and what the density of a planet owes to its star), What Kinds of Planets Exist? (the mass-radius diagram, the synthetic survey's occurrence grid, and a reading step on what an atmosphere needs that the diagram cannot say), The Transit That Was a Star (a vetting candidate, the odd-even test, a centroid offset and a diluted radius) and Planning a Transit Campaign (which of ten nights qualify, the window, and an ephemeris that grows old). They use the panels that exist: no instrument and no data pack was added, and every system is synthetic with its truth known. The upper-level modules package (1.2.0) gains seven exoplanet items. Not built, and said so: the escape-velocity investigation (Prompt 199, verdict B: no escape panel), an imaged planet's orbit (Prompt 230 Part B, gate C) and a public catalog subset (no rights decision): see D-R10-231-02.
- **Weighing a visual pair (Prompt 218, Part B).** `js/measure/visualBinary.js` over Prompt 187's orbit fit: the photocentre contract (the light-weighted centre of an unresolved pair traces the relative ellipse scaled by l − B, so its orbit with a parallax is a mass function, not a mass), the mass sum of a resolved pair from a parallax with its frame statement, the mass fraction and the two masses from each star's own motion about the moving centre of mass, and a companion's mass from a stated light fraction and primary mass with both roots returned; refusals without a parallax, a frame, a light fraction or both components. The panel `masses-visual` and three advanced steps in Weighing the Stars, for Real (English and Spanish, no new closure file). Gate verdict A on thresholds committed first (25 legs pass against an independent two-body and least-squares oracle, coverage on 200 and 150 seeded systems; the real-star leg, alpha Centauri AB from published elements, is only a circular arithmetic check); `tools/visual-binary-validate.mjs`, `VISUAL_BINARY_GATE.md`, `BINARY_MASSES.md`.
- **How many planets? Occurrence rates on a searched population (Prompt 229).** `js/kernels/occurrence/`: a synthetic survey of 2000 stars with their own noise and span, completeness by injection and recovery (the geometric probability times the recovery of an injected transit at the injected ephemeris, with the number of transits the span holds), the occurrence rate of a bin from its listings on the selected-population Poisson likelihood of the statistics kernel (a rate may exceed one planet per star), a one-sided limit for a bin with no listing, a refusal for a bin the survey could hardly see and for a rate without a stated reliability, and a population whose rates are known. Two panels (the efficiency, the grid of rates), a new investigation, How Many Earths?, in English and Spanish with instructor materials and a deeper layer, and two advanced steps added to Who Gets Counted. Gate verdict A against an independent oracle (numpy, scipy, batman) and a 400-population coverage test; two demonstration legs of the reliability term failed and stay labelled, and the authentic leg was not run. `OCCURRENCE_RATES.md`.
- **A planet's density is only as good as its star (Prompt 227).** The model `transit-rv-joint`: one light curve and the velocities of any number of instruments fitted with one period, epoch and orbit, and the planet's mass (the full relation, the sum of the masses), radius and bulk density derived with the star's stated mass, radius, uncertainty, correlation and source carried through, the star's share of each variance printed, a minimum mass and no mass without a transit, a named refusal for every quantity the inputs do not give, and a flag when the stated star's density disagrees with the transit's by more than 3 sigma. The panels `joint-fit` and `mass-radius` (lines of constant density only; no composition curve was supplied), the investigation What Is It Made Of? at two depths in English and Spanish with instructor materials, the upper depth of Finding Planets by Their Tug, and a model-page section. Validated against an independent numpy, scipy and batman implementation at thresholds committed first: 29 legs pass, two (D6, C4) stay failing and labelled, and the authentic leg (E1) is NOT RUN because no velocity series was supplied (`JOINT_INFERENCE.md`).
- **Stellar investigations, a sequence and a course (Prompt 224).** A sequence, Stars, in depth, ordering the stellar investigations that exist, with five new connecting investigations in English and Spanish with instructor materials and a deeper step layer: Reading the HR Diagram (the regions, how a distance puts a star on the diagram, why the main sequence is a band), A Star's Life in Numbers (main-sequence lifetimes from the MIST tracks, the changing slope, the turnoff as a clock), When a Star Explodes (which stars collapse, an uncertain edge, the binding energy against the blast), Populations I and II (what an assumed metallicity does to a cluster's age and distance) and Spectra Tell Temperature and Gravity (four SDSS spectra, line depth against temperature, what gravity does to a line, what the spectrograph resolves). They use the panels that exist: no instrument and no data pack was added. A course package, Stellar astrophysics (majors, OpenStax Astronomy 2e chapters 17 to 23, with readings and the reason for what has no investigation or did not pass its gate), and the upper-level modules package (1.1.0) gains three advanced items. No supernova light curve ships (no rights decision), and the disc-halo kinematic split and the Gaia nearby-star diagram are not drawn (no panel carries them): see D-R10-224-02.
- **Direct imaging, an angle and a contrast (Prompt 230, Part A).** `js/kernels/imaging/`: the contrast of a planet and its star as a thermal term (two blackbodies) plus a reflected term (a Lambert sphere with a stated geometric albedo and phase), the irradiation equilibrium beside a stated temperature with a self-luminous flag, the angular separation (a sin of the phase angle over the distance), the diffraction scale λ/D with the statement that it is not a coronagraph's inner working angle, and an observability verdict that returns not observable with this instrument inside a stated working angle or below a stated contrast floor and refuses when none is stated. Two investigations, Why We Cannot See Earth From Here and Architectures (three depths, English and Spanish, one new closure file), two panels, and a model-page section; the imaged planets are the NASA Exoplanet Archive's rows retrieved 2026-10-31 (per-planet references not retrieved, terms page not read). The four instruments are teaching examples, not specifications. Thresholds were committed before the code; an independent numpy, scipy and astropy implementation agrees with the kernel; 19 bounded legs pass, one is not run (no published contrast or cited working angle was supplied). Subtraction, throughput and orbits are Part B and are not built (IMAGING.md).
- **Vetting with ambiguity (Prompt 228).** `js/kernels/vetting/`: odd-even depths with red-noise-widened errors, a secondary-eclipse search at the expected phase, a difference-image centroid test on detector frames of a blended neighbor, blend light curves from the eclipsing-binary model at a stated dilution, and a summary of rejected, undecided or survives that never says planet; a candidate whose signal cannot decide a test is inconclusive, never a pass. Validated against an independent implementation and an ensemble at committed thresholds (24 bounded legs pass, none failed). The vetting panel, the investigation Planet or Not? (English and Spanish, three depths), the advanced steps of A Star That Is Not Alone, and the model-page section on what a passed checklist does and does not mean. See VETTING.md.
- **Transit timing variations (Prompt 226).** `js/kernels/ttv/`: the linear ephemeris and the O-C diagram, a sinusoid fit with a super-period interval and an honest no-signal and too-short-a-record verdict (1.5 cycles needed), the first-order Lithwick, Xie and Wu (2012) super-period and amplitude relations from Laplace coefficients with their domain and a refusal outside it, a per-transit template-fit time with an error bar flagged `low-snr` when it is longer than half the cadence, and an engine forward model (`js/physics.js`, headless). An independent scipy oracle was pinned before the kernel. 21 of 26 validation legs pass, four stay failing and labelled (C2, C3, D1, D2: the 400 ppm error bars understate the scatter by 1.4), amended by legs at 100 ppm that all pass (AM1), and the published Kepler-9 leg (E1) is NOT RUN because the data were not supplied (`TTV.md`). Two panels (`ttv-transit`, `ttv-timing`) and one investigation, The Clock That Drifts, at three depths in English and Spanish with instructor materials, on engine-made synthetic systems; a model-page section. Part B (a mass from an amplitude) was gated: verdict B, a mass only for a pair assumed circular and labeled as that (`TTV_MASS_GATE.md`, `D-R10-226-90`).

- **The transit model delta (Prompt 225).** A four-coefficient limb-darkening law (Claret 2000, coefficients fixed from a table or typed by the reader, never fitted) as a second transit model beside the quadratic one, which is unchanged to the bit; the star's mean density from P and a/R* with the circular-orbit assumption stated and the eccentric correction (Kipping 2010) as a labelled row; a constraint check that says "not constrained" for a grazing transit; an in-transit residual test; the covariance ellipse of k against b and against q1 through the plot component, with its table; the full parameter set behind a disclosure in the fit panel (English and Spanish), the result as the 150 record; an upper depth of Fit the transit with the lower depths graded identically. Validation against batman and scipy with committed bounds: 18 of 31 legs pass, 11 stay failing and labelled, 2 are not run for want of data (`TRANSIT_DELTA.md`). Fixed on the way: in Spanish the fit panel prefilled "0.005", which the Spanish reader parses as five.

- **Variable-star classifier gate (Prompt 223 Part B).** `VARIABLE_CLASSIFIER_GATE.md`: the shipped nearest-neighbour
  classifier measured on 350 Gaia DR3 Cepheid and RR Lyrae rows (Gaia's own labels, CC BY-NC 3.0 IGO, a derived
  fixture) against bounds committed first. Two legs fail and stay failing (accuracy among the stars called 0.772
  against 0.90; the bootstrap lower end 0.718 against 0.85); the verdict is B: the classifier may be offered only as a
  suggestion with its confusion matrix and the ambiguous cases left unresolved. Documentation, fixtures and register
  rows only; nothing student-facing changes.
- **Remnants (Prompt 222).** `js/kernels/remnants/`: a white-dwarf cooling age from a Mestel-type law calibrated on
  one published model sequence, valid for 0.5 to 1.0 solar masses and a stated luminosity range, refused outside it,
  with an interval that keeps the measurement term apart from the law's own error; the initial-final mass relations
  of Cummings et al. (2018) with their scatter; and the odds of a white dwarf, a neutron star or a black hole from
  the cited threshold ranges, named only at nine in ten. 20 of 22 bounded validation legs pass, two stay failing and
  labelled (`REMNANTS.md`). No observed white-dwarf table is shipped: the law is checked against models and a
  simulated sample. Two panels (`remnant-cooling`, `remnant-outcome`) and two investigations, How Old Is This White
  Dwarf? and From Star to Remnant, each at three depths in English and Spanish with instructor materials; a
  model-page section.
- **Stellar rotation and flares (Prompt 220).** `js/kernels/activity/`: a spotted rotating
  sphere (circular spots, quadratic limb darkening, an exact azimuthal integral), the rotation period over the
  existing periodogram with a false-alarm probability, a residual-correlation widening and the factor-two alias
  always listed as a candidate, flare detection by the form of the Chang et al. criteria with template-fitted
  equivalent durations and their uncertainty, and the flare-frequency slope with an exact interval. Two TESS
  light-curve packs (AU Microscopii at 2-minute cadence, EK Draconis in 30-minute bins). 28 of 30 committed
  validation legs pass, two stay failing and labelled (`STELLAR_ACTIVITY.md`). Four panels (`activity-spots`,
  `activity-period`, `activity-flares`, `activity-ffd`) and two investigations, How Fast Does the Star Spin? and
  Flares, each at three depths in English and Spanish with instructor materials: the period of a spotted star with
  the factor-two alias kept in view, the real period of AU Microscopii and EK Draconis, the flares of AU Microscopii
  with their equivalent durations, and the power-law slope by size with its interval; a model-page section. Part B
  (ages and flare energies in erg) was gated: verdict C, no age and no energy (`D-R10-220-90`), and each lesson has
  a reading step that says why.

- Three investigations on measurement, uncertainty and claim-limits, first in the Observing-and-measuring sequence, each in English and Spanish with instructor materials: What Is a Measurement? (survey), What Does ± Claim? (majors) and When the Method Must Refuse (upper), on synthetic data with a known truth, with one new instrument family (`js/claimWidgets.js`). They open offline only after one online use (D-R10-67, `MEASUREMENT_CLAIMS.md`).
- Three image investigations, after them in the same sequence, each in English and Spanish with instructor materials: Measuring the Moon (a scale from a reference pair on a real Galileo picture), How Far Is That Star? (a parallax and its distance from fourteen positions of a synthetic star) and A Binary Star's Orbit (an orbit and a mass sum from twelve positions), with one new instrument family (`js/imagingWidgets.js`) that calls the Observatory's own measuring modules. They open offline only after one online use. "What is in this field?" is not built (D-R10-72, `IMAGE_INVESTIGATIONS.md`).
- A planetary sequence, Planets and the Sun, ordering the Solar System investigations that exist, with three new connecting investigations, each in English and Spanish with instructor materials: The Scale of the Solar System (sizes, distances, a marble model and light time), Moons of the Giants (the Laplace combination of Io, Europa and Ganymede from fitted periods) and Comets and the Sun (a comet's orbit and the heat at each end of it). A course package, The Solar System and the Sun, and a Solar System unit in the one-semester course. Worlds Compared, Reading a Surface and Space Weather from the Sun are not built: each needs a component or a data pack that is not in the project yet, and DECISION_REGISTER.md (D-R10-206-01) says which.
- Observing strategy: a kernel for the window function of a sampling pattern (read through the period search, unchanged), the aliases of a period against the sidereal day, the year and the month, a verdict (resolved, ambiguous, not constrained) with its alias list, phase coverage, a multi-night plan from the observing-window planner with its cost in hours and a seeded weather loss, validated against Astropy's `LombScargle` and closed forms with the thresholds committed first; two panels (the window and aliases, the plan of the nights), the investigation Why the Period Is Wrong at three depths and three new advanced steps in Design the Schedule, both languages.
- Eclipsing binaries: a detached two-sphere model on a circular or eccentric Kepler orbit with quadratic limb darkening (`js/inference/binaries.js`), fitted through the inference core (`js/inference/binaryModel.js`) with each parameter's uncertainty or the words "not constrained" (a grazing eclipse leaves the radius ratio open), the secondary's phase giving e cos w and the durations only weakly e sin w, validated against batman, a brute-force quadrature, closed forms, seeded ensembles and misspecified systems (`BINARIES.md`); the model in the Observatory's fit panel; one investigation, Two Stars Eclipsing, at three depths in English and Spanish with instructor materials and one new instrument family (`js/eclipseWidgets.js`).
- Binary masses and radii: the double-lined spectroscopic orbit (a second radial-velocity curve on the same orbit, the mass ratio, a sin i, minimum masses labelled as minimum, the single-lined mass function) and the joint eclipse-plus-spectroscopic solution (absolute masses, radii, the orbit's size and surface gravity, with the covariance of the whole fit) in the inference core (`js/inference/binaryMasses.js`, `js/inference/binaryJoint.js`), validated against closed forms, a direct two-body integration, an independent oracle, seeded ensembles and negative cases, with three legs kept failing and labelled (`BINARY_MASSES.md`); one investigation, Weighing the Stars, for Real, at three depths in English and Spanish with instructor materials and three new instruments (`js/massesWidgets.js`). The visual-binary branch is not built.
- Exposure planning: the CCD-equation kernel (`js/kernels/detector/snr.js`) extended with several exposures, point-spread-function photometry, extended sources, extinction by airmass, the limiting magnitude of an exposure and refusals for targets the exposure limit or the full well forbids, a facility adapter over the instrument library that fills in nothing the library does not state, an exposure-planner panel with a synthetic frame measured with aperture photometry, four new advanced steps in Signal, Noise and Exposure (the lower depths grade as before), and the majors investigation Plan an Exposure, in English and Spanish with instructor materials. Validated against analytic cases, an independent implementation, the published Rubin depth model and 1600 rendered frames; three legs against the published model (the read-noise loss in u and g, and the equation away from the fiducial sky) stay failing and labelled in `EXPOSURE_PLANNING.md`.
- Survey design: a kernel for the depth an exposure and a facility reach (the CCD equation of the exposure planner, with optimal photometry), the area a plan covers, the expected counts from a stated count model, completeness and contamination, the depth-against-area trade-off at fixed time and the time two facilities need for one goal (`js/kernels/survey/`, `SURVEY_DESIGN.md`), validated against an independent Python oracle and an ensemble; four validation legs failed their committed bounds and are recorded and labelled, and a leg against an authentic catalogue was not run. An open-ended `plan` step on the lesson format (feasibility and the student's own stated numbers, never one correct plan), and three investigations, each in English and Spanish with instructor materials: Deep or Wide? (survey, majors, upper), Two Telescopes, One Question and the capstone Propose an Observation.
- An observing sequence, Observing and instruments, ordering the detector, telescope, exposure, calibration, strategy and survey investigations that exist, with five new connecting investigations, each in English and Spanish with instructor materials and a deeper step layer: Which Instrument for Which Question? (one star and one field on three facilities), The Sky Background (the sky in the aperture, the Moon and a redder sky), Coordinates and Time at Depth (sidereal time, meridian crossings and precession), A Night at the Telescope, End to End (five stations on a prepared plan) and From Photons to a Number (a magnitude and its uncertainty from counts). The Observational astronomy lab course (1.1.0) is rebuilt around the sequence with the two image investigations, and the numbers every step asks for are recomputed from the project's own kernels and instrument library (`tests/observingCloseout.test.js`).
- Cluster fitting: a kernel that fits MIST isochrones (interpolated between the grid) to a cluster's colour-magnitude diagram over age and distance modulus at a stated metallicity and reddening (`js/kernels/clusters/`), with a stated magnitude-conditional binned likelihood, profile intervals, the age-distance valley and a "not constrained" verdict below a committed member count, checked against an independent numpy/scipy/emcee oracle, an ensemble coverage test (with a binary fraction as a reported misspecification) and NGC 2420 (`CLUSTER_FITTING.md`, `tools/cluster-fit-validate.mjs`); the Observatory's cluster panel with the fitted isochrone over the data, the profile plots and the record; four advanced steps in the populations guide "Ages from models"; the four-parameter gate's verdict (`CLUSTER_FOUR_PARAMETER_GATE.md`). Metallicity is not fitted.

### Fixed

- **The Pantheon+ pack no longer calls its errors the covariance's diagonal (checkpoint VI repair R-VI-2; metadata only, no number or measured value changed).** The release's covariance has a lower diagonal than the pack's `mu_err` (the median of the square root of the diagonal over the error is 0.713, `SN_LIKELIHOOD_GATE.md` section 10); the column, the reductions, the assumptions, the validation check and `COSMOLOGY.md` now say that `mu_err` is the release's plotting error and not that diagonal. The pack, its module and its manifest hash were rebuilt from the generator; no ceiling moved.
- **The textbook-alignment page no longer shows an empty bullet before every entry (checkpoint VI repair R-VI-3).** The generator wrapped list items that were already list items, so the page carried 144 nested `<li><li>` that a browser read as 144 empty bullets between the 144 entries. `tools/build-adoption-pages.mjs` now writes one item per entry; the visible words are unchanged, and `tests/adoptionPages.test.js` fails on a nested or empty item in any adoption page.
- **A report pasted while the previous one is being read is no longer wiped.** On the submission review page (`/instructors/submissions/`) the paste box was emptied after the previous report finished loading, so a second report pasted in that window was cleared before Add was pressed and was silently dropped. `js/submissionReview.js` now empties the box when Add is pressed, before the reading begins. Found as a 1-in-15 failure of `e2e/instructorFlow.spec.js`.
- **A lesson that opens while a dialog is open stays behind it.** The lesson panel is mounted the first time a lesson opens, which can be after a dialog has made the rest of the page inert; it came in live and its title took keyboard focus out of the dialog, so Tab from the precise-placement form or Settings reached the lesson's close button. `js/dialog.js` now makes markup that arrives while an isolating dialog is open inert too (and puts it back on close), and opening a lesson no longer moves focus out of an open modal (D-R10-228-08).

## [2.1.0] - 2026-10-24

**Gravitas 2.1.0** promotes the `v3` staging branch (frozen at `e0f4df4b`, its
push CI run 40144810683 green) to `main`. `v3` stays open and keeps taking pull
requests; this is a release of its tip, not the end of the train.

**Version number, plainly.** Released as 2.1.0 on Carl's direction (chat,
2026-10-24: "Make it the new v2.1"); the format boundary note in
[RELEASING.md](RELEASING.md) and [FORMATS.md](FORMATS.md) names 3.0.0, because a
2.0.0 build refuses some of what this version writes. The refusals are the ones
FORMATS.md lists, by version number and in words the old build already has, and
a file that needs nothing new is still the bytes 2.0.0 wrote. Nothing is
converted in place.

**No new DOI.** Carl's decision (chat, 2026-10-24: "Let's wait til v3.0 to
mint the doi"): no GitHub release and no Zenodo deposit for 2.1.0, so it has no
version DOI. `RELEASE.doi` is null, so `CITATION.cff` and `.zenodo.json` name
the 2.1.0 tag and the concept DOI and claim no version DOI for it; the 2.0.0
archive and its DOI are unchanged. The tag `v2.1.0` is a plain git tag.

- Detector effects in the frame model (Prompt 211, invisible): saturation and full well, a stated nonlinearity near the full well, seeded cosmic-ray tracks, bounded column bleeding and the under- and oversampling regimes, each flagged in the image sidecar's mask plane, a detector-effects panel with instrument toggles, and the investigation The Saturated Star (survey, majors, upper; English and Spanish) in which the measuring tools refuse a saturated, bleeding or track-crossed star. Validated against an independent oracle; three legs are recorded as failing (DETECTOR_EFFECTS.md).
- Photometric calibration (Prompt 212, invisible): a kernel beside the reduction (`js/kernels/detector/photcal.js`) that turns instrumental magnitudes into calibrated ones from a night of standard stars, with the zero point at unit airmass, the atmospheric extinction in magnitudes per airmass (never the interstellar extinction), a color term and an optional color-dependent extinction, weighted least squares with the catalog error shared among a star's measurements, refusals for a night that cannot fix a term (no number is given) and above airmass 2.5, and the target's calibrated magnitude with its propagated uncertainty; the cited site coefficients of the instrument library as a prior, the record as an artifact envelope, a panel of synthetic nights (`js/photcalWidgets.js`) that keeps a calibration in the notebook, and the investigation Counts to Magnitudes at three depths in English and Spanish with instructor materials. Checked against closed forms, an independent numpy, Astropy and SciPy implementation, an ensemble, a physical night and a cross-match of SDSS and Gaia for NGC 2420; four legs of the contract fail and are reported (`PHOTOMETRIC_CALIBRATION.md`).

### Format version boundary (Prompt 176; FORMATS.md names 3.0.0)

- The saved formats a 2.0.0 build refuses or misreads now carry a version number it refuses by, in words it already has. A course package that carries a collection profile, a term or outcomes is `gravitas.course-pack/3` (a course link for it is `c3`); a result envelope with an uncertainty state beyond sigma, interval and none, a failed quantity, a correlation or a fit record is `gravitas.artifact/2`; an investigation pack or question bank whose rubric criterion sets a kind, a depth or a weight is `/2` (its link is `i2`). Every other file and link is written as 2.0.0 wrote it (the lowest version that carries the payload), so it opens in 2.0.0 and in 3.0.0 alike. Readers for every earlier version stay; no support period starts. A 2.0.0 build refuses a newer file as made by a newer version of Gravitas, and refuses an Observatory workspace with image marks as nested too deep (it checks nesting before the version, so no version could name it). FORMATS.md records every refusal message and the rollback rehearsal (`tests/compat/`), and the paragraph for the release notes is generated there. RELEASING.md names 3.0.0 as the version this boundary asks for.

- The Observatory has a panel, "Frames to a light curve", that turns a stack of synthetic frames into a differential light curve one step at a time (calibrate, mark, register, photometry, comparison stars, light curve), with a table to choose the comparison stars, the plot with its table, a CSV, a ledger entry and the frame limit stated; "A Variable Star From Frames" gains an advanced step that runs it, and the grading of every earlier step is unchanged (Prompt 185, `FRAME_PIPELINE.md`).

### Earlier entries from the same train (Prompts 122 to 169)

- While an investigation is open, the frosted panels are drawn solid (the same opaque surfaces `prefers-reduced-transparency` already gives), and frosted again when it closes. Linux software WebKit stopped producing frames once the lesson panel opened over the stack of blurs; removing all of them restored the frames, removing only the panel's own did not.

- Chart.js is removed (Prompt 132, D-PLOT-02 stage 4): every chart is the plot component; the dependency, `vendor/chartjs/` and its license lines are gone. No bytes change in the build (the library was already unreachable); the parity record stays in `tests/fixtures/chart-parity.json`.

- The investigation cards and the Scenario Studio, Investigation Composer and course-builder pages are available offline after one visit (D-PERF-02, change 1).
- Page titles follow the language on ten pages that kept an English title in Spanish.
- Teach marks its links to English-only documents "(en inglés)" in Spanish.
- A duration whose bounds are equal reads "5", never "5–5", on the generated pages.
- The catalog says "platform API" for the number that is not the Gravitas release; a test pins that the two differ and that every community package's range is satisfied.
- A test counts the "New in 2.0" badges against D-R8-01's nine, in both languages; the evidence record keeps novelty apart from field use.
- `tools/bundle-budget.mjs` names its reference environment (Node from `.nvmrc`, zlib from a committed record) and prints a figure from another environment as advisory; CI and `--strict` fail.
- The splash runs once per genuine startup (Prompt 124): not on an internal navigation, a reload, back or forward, or a duplicated tab; the navigation is never painted ahead of it; a failed script leaves a usable shell within six seconds. See ACCESSIBILITY.md, "Startup".
- Not done, listed for Prompt 133 because each adds bytes to a route with no room: the Library's scoped scenario count, My work's "preferences" label, and "illustrative" on the Coma and NGC 2420 values.

Navigation grouping and approved retirements (Prompt 166, visible, train v3): the surface gate's two RETIRE verdicts are carried out, both presentation. /catalog/ no longer has a "Contributed" section with its empty-state line; every package is in the one list, a package written outside the team keeps its "Contributed" badge and its "Contributed by", review and history rows, and the invitation to submit one (CONTRIBUTING_CONTENT.md) is in the page's intro, in both languages. The Library's "Where it runs" facet was removed by Prompt 163. No route, saved record or link changed; no GROUP, CONSOLIDATE or FREEZE verdict exists; the nine pending-acceptance checks were all active already.

Home and the global navigation (Prompt 162, visible, train v3): the navigation is the five destinations (Explore, Learn, Observe, My work, Teach), one link each, in both languages, the same on every page; the 25 links that were menu entries are places on their destination's page (and Home's Explore entry), nothing was removed; every page but the sandbox has a breadcrumb; Home is what Gravitas is, where to start (an investigation, an observation, the sandbox, a course for an instructor) and the five places, with no counts, scenario cards or feature lists; the introduction is reachable from Home's foot. The Spanish tab title of the adopter's guide reads "Guía de adopción".

Collections and saved items (Prompt 164, invisible by the roadmap's label; visible in practice, so labelled visible, train v3): a course package may carry `profile: "collection"`, a list of one unit of lessons, guides, scenarios, datasets and readings with an optional note and depth on each, no assignments, no optional paths and no `needs` (COURSE_PACKS.md, `validateCoursePack`, the schema). The Library's item page has a Save button and its start page "Your collections", a student's saved items and the collections they chose to keep, in one new record (`gravitas_collections`, a durable record in a backup file, listed in My work); a collection opened from a link is kept only when the student presses Keep on the course home; the distribution kit makes an instructor's collection from what they saved (order, a note and a depth for each, a link or a file) and the Library's recommended starts are written as collections where every entry can be one. **A 2.0.0 build cannot open a collection:** its reader refuses the pack and names the field, so the field is written only for a collection (the first definite boundary on the compatibility corpus's list; no course changed). Spanish text of the new interface has not been read by a fluent reader.

The minimal instructor path (Prompt 168, visible and instructional, train v3): Teach opens with one course in fifteen minutes (choose a built-in course, "use as is", a student link, the review page and the grade export, no authoring); "Start a new term" on the course builder and the distribution kit copies a course or an activity with fresh keys and a new course-home link, re-pins it and lists what changed under it (step digests); the review page's "Archive" saves its reports as one file (`gravitas.submission-archive`, version 1) and clears the page, and reads that file back; a course pack may carry an optional `term` (written only when set), shown on the course home page ("Term: ...") and by My work from a new local record `gravitas_terms` (twelve most recent) so terms do not merge. Last term's links and files open exactly what they opened; nothing a student keeps is deleted; the submission key is unchanged. The adopter's guide leads with the path and the evaluation kit says what comes back. One closure file edited: js/course/pack.js. Route byte ceilings raised by the measured overruns under the standing approval (D-R10-47); no request ceiling moved.

Common Cartridge export (Prompt 169, invisible by the roadmap's label; the button is instructor-visible, train v3): the course builder's "Export a Common Cartridge" and the distribution kit's "Make a Common Cartridge" make a `.imscc` file of a course in the browser: the IMS Thin Common Cartridge Profile v1.0 over Common Cartridge v1.3, one module for each unit and one web link for each item, each opening the item in Gravitas, in English or Spanish, with the notes for instructors only if asked. It runs no service, carries nothing about students and returns no grades; the course package format is unchanged and no closure file was edited. **Imports into Canvas, Moodle, D2L and Blackboard are recorded as VERIFIED on the owner's report only:** Carl reported in chat on 2026-10-22 that they are verified; the LMS versions, the cartridge imported and what imported were not supplied, so no date of import, version or artifact is recorded. The file itself is checked against the specification's schema and rules (all sixteen built-in cartridges validate), which is not an import; Teach and the adopter's guide say exactly what the table says. The schemas are not committed (their licence needs a registration with 1EdTech): COURSE_PACKS.md and D-R10-54.

Governance only (Prompt 122): INTEGRATION.md and BRANCHING.md describe `main` plus trains; a `Pull-request class` CI job enforces labels, windows and the instructor ciphertext rule; `tools/evidence-status.json` records the evidence class of each public claim and generates `docs/evidence-status.md`. No student-facing behavior changes.

Scientific-defect triage (Prompt 125, visible): the model page has a generated known-discrepancies table (a register plus the validation report's per-check status); the extinction ratio of the cluster-fit tool is kept at 3.245 and its difference from the kernel's CCM89 value is explained (RADIATION.md); the Sky Lab and validation pages state that refraction below 5 degrees is not validated, in place of "several arcminutes" (it is up to about 20). No number a student sees changes.

Institution-facing documents and an accessible report (Prompt 127, invisible): ACCESSIBILITY_CONFORMANCE.md, a scoped conformance report in the ACR form generated from tools/conformance/*.json (the project's own evaluation, no conformance claimed); DATA_PROTECTION.md with a Spanish draft; "What your IT office will ask" in the adopter's guide and on the Teach page; and the lab report as an accessible web page beside the PDF in the finish dialog.
Balmer rest wavelengths (Prompt 125, part 2, visible and instructional): the line tool's H-alpha (air 6562.79, vacuum 6564.60 A) and H-beta vacuum (4862.71 A) follow NIST and Morton 2000, closing a discrepancy of up to 1.7 km/s; the populations guide's H-alpha velocity answer moves from -240.971 to -240.515 km/s.

Toolchain (carried from main into v3, invisible): `acorn` 8.19.0, `prettier` 3.9.10 and `eslint-plugin-prettier` 5.5.7; held as a group: Playwright 1.64.0 with `@axe-core/playwright` 4.13.0 and `axe-core` 4.14.0 (WebKit lesson-card clicks time out on 1.64's browsers, and axe 4.14 finds the gallery chip count's contrast; see D-TOOL-02). The decision to keep the CC BY-NC Gaia test fixture in the archive is recorded in OWNER_ACTIONS.md.
Maintenance (invisible): `tools/branch-inventory.mjs` lists every remote branch and the commands the owner may run (nothing is deleted by a session); the dependency audit's exceptions moved to `tools/deps-audit-exceptions.json` with a basis and an expiry date, and an expired one fails the audit; the Q4 2026 quarterly checkpoint is recorded in `TOOLCHAIN.md`; the release traps are collected in `RELEASING.md`.
Documents (invisible): `DOCUMENTS.md`, a generated map of every root document and generated artifact (`tools/docs-map.mjs`, `npm run docs-map:check`), `MAINTAINER_ONBOARDING.md`, two superseded notes archived to `docs/archive/`, the recovery rehearsal's findings in `RELEASING.md`, and `CONTINUITY.md`'s ecosystem sentence dated.

Toolchain (invisible): `@playwright/test` and `playwright` 1.64.0 (supported browser builds move with it, Chromium 153 to 156), `@axe-core/playwright` 4.13.0 and `axe-core` 4.14.0, taken together (D-TOOL-03); the gallery chip counts' contrast raised to what axe 4.14 measures, and one failed-import spec made engine-agnostic.

The first Gravitas is frozen (Prompt 165 follow-up, D-R10-51, visible, train v3): by Carl's ruling of 2026-10-22, `/history/original/` carries a notice in English and Spanish that it is a record, gets no new features, and where to find the current Gravitas. The page itself behaves as before and nothing else on the site changes. The surface gate's own verdict for it is still KEEP; the ruling is recorded beside that verdict (a new optional `ruling` field), not instead of it, and no threshold or rule moved. Separately, the page no longer asks `fonts.googleapis.com` for a stylesheet when it is opened (a third-party request with no opt-in; the one `@import` line is deleted and the page draws in its fallback typefaces, so its lettering differs from before). It still has no content-security policy.

### Added after release (entries missing from the notes above)

These entries were written after the `v2.1.0` tag, for work that is in the tag: each prompt's change merged into `v3` before the freeze at `e0f4df4b`, and the release notes above left it out (Prompt 171's checkpoint report named the gap). Nothing here describes a change made after the release, and nothing in the tag changed. The two cartridge claims in `docs/evidence-status.md` named the version `2.1.0-dev`; they now name `2.1.0`.

Library discovery, related and next, one resume record (Prompt 163, visible, train v3): the Library opens on seven committed starts (the default view's count on a phone falls from 12 to 9, and is 21 on a desktop before and after); search gives its reasons, with the objectives in a committed index and the search code loaded only when used; the facets are counted in one pass and the list is drawn in pieces; a topic and an item each have a page (`?topic=`, `?item=`); relations between entries (`tools/build-relations.mjs`) show in the lesson finish flow and on the item page; and one record, `gravitas_resume`, is read by Home and the Library and written by the Library links, the finish flow and the lesson save. The record is a sidecar in the storage module, not a field of the progress record (a 2.0.0 build drops unknown fields). The Library's whole list is now "Browse everything". Not built, for lack of a request on the routes: relations on the Observatory header, on the sandbox scenario card and on a course unit's next, and "continue" on destination pages and My work. Thirteen route byte ceilings were raised by their measured overruns under the standing approval; no request ceiling moved (D-R10-42). Spanish text of the new interface has not been read by a fluent reader.

Task-aware progressive disclosure (Prompt 167, visible and instructional, train v3): one disclosure pattern, `details.more` (DESIGN_SYSTEM.md), is shut for a core or quantitative task and open for an advanced one, and what a student opens is remembered for each surface in a new preference, `gravitas_disclosure` (each press is announced once). The lesson panel folds Help, depth switching, the progress backup and Restart; the instrument panel folds the sliders after the first and, on a reading step or a question with no number, the presets; Settings folds simulation, black holes, compact objects, accuracy and performance behind "Advanced". Readouts never fold, and a step that declares a quantity or asks the student to measure or explore keeps its sliders and presets. The counts a screen starts with fall (a lesson panel on a reading step from 13 to 10; Settings from 111 to 78) and are committed in `tools/disclosure-ceilings.json`. An activity may set `more: 'open'` or `'shut'`, written as `mo` on the assignment link only when set (a 2.0.0 reader opens such a link). Two closure files were edited (`js/activities/activities.js`, `js/assignments/assignment.js`). Route byte ceilings were raised by the measured overruns under the standing approval (D-R10-45). Not built: folding on the Observatory and experiment plot options, and the uncertainty display of Prompt 151. Spanish unread by a fluent reader.

Instructor materials: distribution policy and generated Spanish notes (Prompt 170, instructional, train v3): INSTRUCTOR_MATERIALS.md states how the materials are requested (by email from an institutional address), how a request is verified and answered, the turnaround (7 and 14 days), rotation, a department route and that there is no second passphrase holder (Carl's ruling of 2026-10-21, D-R10-43); the builder has a `--rehearse` mode, tested against another passphrase (`tests/instructorDistribution.test.js`). The instructors' portal has a button for Spanish notes beside the guide and the key: `js/instructorNotes.js` holds 60 generated Spanish notes (they carry no key and no guide prose), and the rebuilt bundle holds 540 documents. The portal keeps its issue link and no personal address. The adopter's guide sentence about the materials was narrowed. Three closure files and one new one were edited, so the instructor bundle needed a rebuild. Spanish unread by a fluent reader.

Rubric criterion semantics and keys per depth (Prompt 172, instructional, train v3): a rubric criterion in an investigation pack or a question bank may set a `kind` (completion, correctness, reasoning or uncertainty; reasoning when unset), a `depth` and a `weight`. The answer key prints the kind, weight and depth for each criterion, and a key for a depth drops the criteria marked from a deeper depth; the review page has a mark and a comment for each criterion, and the marks file is its `/2` form only when a written answer has criteria (`/1` byte for byte otherwise); a criterion mark never changes a step mark or a score. **A 2.0.0 build refuses a criterion that sets these fields and a `/2` marks file, naming the field.** The lab report no longer prints the "Marking note" unless the activity sets `markingNote: true` (written as `m` on the assignment link; the key always prints it). Orbital Energy has a criteria table with kinds. Keys per depth already existed for 35 of the 60 investigations. The LMS adapters are unchanged: no extra column was tried on a live platform. The review page's criterion list uses existing words, and the Spanish of the kind labels is unread by a fluent reader (D-R10-38, D-R10-40).

The local class summary (Prompt 173, instructional, train v3): the review page gains a summary of the reports an instructor has loaded: counts, steps, criteria by kind from Prompt 172's marks, wrong answers with the misconceptions the author named, elapsed time and the measured quantities from the evidence rows, with each report's own uncertainty plotted as a bar beside the table (the values are ordered by value, with no names), a CSV (`gravitas.class-summary/1`) and a print layout. Repeated attempts each count and exact duplicates do not; time is from first opening to last save, not time on task; the misconception shows only where the author wrote one, and in English; an evidence table that fails its digest is left out. The graded record gains `startedAt`. Teach, the adopter's guide, the evaluation page and INSTRUCTOR_FLOW.md describe it. No closure file was edited. The review page's own bundle grew by 26.5 KB gzip, which the budget check does not count (D-R10-41).

Printable activity list, time bands and outcome mapping (Prompt 174, instructional, train v3): the course builder's "Plan" button makes a printable activity list for a course (print on its own, save as a page, save or copy Markdown) with an editorial time band for each item and an outcomes matrix. The bands are a stated rule over the 60 investigations by depth (short, medium or long; a deeper depth adds extra steps at twice the core's minutes a step) in `js/data/instructorTimeBands.js`, not measurements, and the plan says so; a test ties the band's label to the evidence record. A course package may carry `outcomes`, an instructor's own mapping from objectives to outcomes, additive in the package; the matrix says it is that mapping and shows no attainment evidence. **A 2.0.0 build refuses a package with outcomes**, naming the field. The Library's length facet reads the table and the adoption pages carry a band for each depth. The alignment page says OpenStax is the only textbook (a second was not added: no table of contents was checked). Two closure files were edited (`js/course/pack.js`, `js/course/review.js`) (D-R10-55).

Assignment adaptation proved by the step graph (Prompt 175, instructional, train v3): the course builder lets an instructor reorder, remove or add a sentence to the steps of an assignment, in each language, with a due line and a marking note, and checks the result against the step graph (requires, reveal, when, setup, scene, depth); the check is proved over all 60 investigations, every edge and adjacent swaps (`tests/assignmentAdaptation.test.js`). The student sees the due line and the instructor's sentence under a step title; when a step was rewritten or removed, or a package moved to a new major version, a "what changed" report opens with Keep or Update (Update makes a new id). The assignment link gains the fields `x` and `u`. Preview parity: a preview route of an item (a link from the Library item page and every adoption page) opens it with a banner and keeps no record; seven entries have a one-line banner start. The engine has one depth for an activity, so a depth for each step was refused. The deferred JavaScript grew from 2,045,974 to 2,053,650 B gzipped (+7,676 B, 2,556 B over the round's 5,120 B allocation, inside the 2,044.4 KiB ceiling); the register row records that overrun as pending ratification. The builder, the adaptation and the report are an idle precache group of their own, which put the idle tier over its ceiling, and the ceiling was raised by Carl's answer of 2026-10-23 (1,517,568 to 1,528,832 B). The new Spanish is unread by a fluent reader.

The Observatory's image measurement train (Prompts 179 to 182, 184, 186 to 189, train v3): each piece is a lazy panel, loaded when it is opened; most are kept out of the precache, so they work offline only after one online use. Marks, scale, time and the ledger (179, labelled invisible by the roadmap): a "marks" panel with `workspace.marks` (`gravitas.image-marks/1`, written only when marks exist) and ledger source `image-marks`; IMAGE_MARKS.md. Photometry (180): adapters over the existing reduction with exact area weights, a plane sky and a CSV (PHOTOMETRY.md). Sky coordinates (181): a pixel-to-sky fit (TAN affine or similarity, no distortion terms), registration of frames and `workspace.calibration` (ASTROMETRY.md). Catalog overlays, blink and compare (182, visible): OVERLAYS.md; planets are elements only, at 0.2 degree. Completeness by injection (184, labelled invisible): an injection panel with a completeness curve, m50 and m90 (INJECTION.md). Astrometric series I (186, visible): proper motion and parallax from several epochs, with a stated limit that a half-year epoch shift flips the parallax sign (ASTROMETRY.md). Orbit and track (187, visible): a panel for a fit with a covariance, the mass sum and a mover's track, at two depths (ORBIT_FIT_GATE.md, ASTROMETRY.md). Bounded local FITS and image import (188, visible): PNG and JPEG files are decoded in the pool Worker and are display-only, with sidecar fields for scale, and an imported frame over 200,000 pixels is not saved as JSON or CSV (IMAGE_IMPORT.md). Image packs (189, visible): four packs (one TESS frame from MAST's public mirror, SDO/HMI, a Galileo lunar frame and a HiRISE image), checked by SHA-256 and kept out of the Library (IMAGE_PACKS.md), and authentic test data for the first four (a follow-up: 84 TESS cutouts, a Gaia DR3 subset and one Hipparcos row, committed flagged non-commercial and test-only; the JPL answers were removed on Carl's ruling, D-R10-68). **Validation records some legs that fail as committed:** each bound was committed before its leg ran and none was moved or restated, and the failed legs are kept with their causes in the prompt's document and register row (register rows D-R10-53, 56, 57, 59, 61, 62, 63, 64, 65, 66 and 68; for 187, one leg of the gate fails and one is not run for want of an authentic arc pack). Prompt 178 (the image-measurement gate; verdict A on synthetic frames) is invisible. Spanish text of these panels is unread by a fluent reader.

## [2.0.0] - 2026-10-16

**Gravitas 2.0.0.** Gravitas grows from a gravity sandbox with 22 guided
investigations into a browser laboratory: <!--fact:scenarios-->61<!--/fact-->
sandbox scenarios, <!--fact:libraryInvestigations-->146<!--/fact--> guided
investigations (<!--fact:investigations-->124<!--/fact--> that run in the
simulation and <!--fact:guidedInvestigations-->22<!--/fact--> in the
Observatory, the 3-D lab and the mission lab), a shared shell, a Library, a
workspace for each student's own work, an instructor path from adoption page to
gradebook file, <!--fact:instructorDocuments-->1222<!--/fact--> generated
instructor documents, a public validation suite
of <!--fact:physicsChecks-->439<!--/fact--> checks, and authoring tools
(Scenario Studio, Investigation Composer, course packs and an extension SDK).
The Library lists <!--fact:libraryScenarios-->69<!--/fact--> ready-made
scenarios: the 59 in the sandbox and <!--fact:systems3dScenarios-->8<!--/fact-->
reference systems in the 3-D lab. Gravitas still runs entirely in the browser,
with no account, no server and no analytics.

**What this release does and does not establish.**

- The software has extensive automated validation: unit tests, the public
  physics suite, and browser tests in three engines (Chromium, Firefox and
  WebKit).
- The scientific kernels have internal validation against cited references,
  with tolerances fixed beforehand and documented.
- No external scientist has reviewed those suites.
- No instructor outside the project has adopted Gravitas.
- No learning gain has been measured.
- Spanish has not been read by a fluent reader. Computed validation messages,
  the instructor guides and answer keys, `/model/`, `/validation/`, the user
  manual and the SDK documentation are English only.
- Real phones and low-end devices have not been measured. Every figure for them
  is a proxy from a throttled desktop browser.
- Accessibility targets WCAG 2.2 AA with automated checks; it is not a claim of
  conformance, and no external audit has been done.

**Established and stable.** The main path, most of it already in 1.0.0 and all of
it covered by the automated suites above: the sandbox and its 59 scenarios; the
original 22 investigations; share links and the embed contract; the notebook and lab
report; the shell, the Library, My work and onboarding; assignments, courses and
submission review; `/teaching/`, the adoption pages and the adopter's guide; the
instructor portal and materials; `/model/` and `/validation/`; and the figure
builder.

**New in 2.0 and not yet used in a class.** The Observatory and its two guide
suites; the curated catalog and the extension SDK; the experiment runner, the
analysis lab and the inference core; the opt-in CDS archive import (it sends the
star name you type to CDS); the compute page (online only, opt-in, loaded from a
third-party CDN); the forward-model loop, the model-versus-data comparison and
the calibration lab (synthetic data only); the Sky Lab; the 38 lessons added
since 1.0.0 (their kernels are checked against cited references, but no external
scientist has reviewed them and their Spanish is unreviewed); the 3-D lab and
the mission lab; the formula language; the Gaia, Pantheon+ and other
rights-labelled data packs (some are non-commercial, as labelled, and can be
removed as files; see `NOTICE` and `LICENSES.md`); Scenario Studio packs
delivered by link; and `/evaluation/`, an instrument whose pre/post questions
are unvalidated (the page says so). Nine of these pages carry a "New in 2.0"
badge.

**Does not ship.** Any live service (live sessions, accounts, LTI); in-app MCMC
sampling; WebAssembly kernels; JupyterLite or any same-origin notebook;
instructor-side or student-facing AI help; the external pilots, reviews and
audits; real-device performance tables; and the instructor passphrase. Chart.js
is still shipped (its replacement is partly done and finishes after this release).
`spike/`, `tests/`, `e2e/` and `tools/` stay in the repository and the archive
but are not published on the site.

**Upgrading.** A browser that visited the old site keeps running the old code
until the visitor accepts the "update available" chip or closes every Gravitas
tab. Until then, a link made with 2.0.0 may be refused with "made by a newer
version"; accepting the chip, or closing the tabs and reopening, fixes it. Two
investigations gained steps (A Universe of Stars, Listening to Spacetime), so a
student who finished one in 1.0.0 will see the new steps unanswered.

**Compatibility with 1.0.0.** v2 reads everything 1.0.0 wrote. Three things v2
writes, 1.0.0 cannot read: a world share link (now version 2, which names the
scenario by its public id), an experiment record (schema 3) and an assignment
link that carries a package pin or a non-core depth. After the deploy `main`
serves v2, and a stale cached 1.0.0 tab gets the update chip before it can read
a v2 share link, so v2 does not write 1.0.0-format share links (D-R8-01 records
the choice).

**What that rests on.** Every storage key 1.0.0 used is still read, and the
readers for the formats that changed (experiment records, assignment links,
investigation progress, share links and submission tokens) are pinned by unit
tests. This was checked in source and in tests, not on a real 1.0.0 browser
profile upgraded in place. 1.0.0 ignores the other new data 2.0.0 writes.

**If this release is rolled back.** Share links, pinned or non-core-depth
assignment links and experiment records made while 2.0.0 was live cannot be
read by 1.0.0. The experiment records stay in the browser and 2.0.0 reads them
again.

**Known issue.** The Save State and Load State buttons on `/history/original/`,
the preserved first prototype, do nothing.

### Added

- Prompt 85: the model-versus-data comparison instrument (`js/compare/`, Observatory panel, `COMPARE_INSTRUMENT.md`); artifact source kind `comparison`; notebook source `comparison`. One lesson step uses it (the advanced Transit Photometry step); the exoplanet Observatory guides do not open the panel.

- **The series chart, stage 3a of removing Chart.js** (D-PLOT-02, `PLOT_COMPONENT.md`).
  `js/plot/chart.js` draws connected series with a color, a width and a dash,
  points, a filled area, error bars with caps, a legend that hides and shows
  series from the keyboard, a tooltip and a keyboard readout that is also
  spoken, and updates the nodes it has when it is drawn again, over plain
  arrays with no unit ids; `js/plot/export.js` makes the PNG. Nothing imports
  them yet, so no route moved. The five Chart.js charts are recorded as data
  (`tests/fixtures/chart-parity.json`, `tests/fixtures/chart-limits.json`,
  read from the running application by `e2e/chartParity.spec.js`) for the
  stages that port them, and `tools/plot-live-bench.mjs` measures a live
  update at their caps and rates.
- **Declarative scenario geometry, first slice** (Roadmap II P108, `SCENARIO_GEOMETRY.md`).
  Retrograde Mars, Kepler's 2nd Law and the four resonance scenarios (Galilean
  moons, broken Laplace resonance, Pluto and Neptune, Jupiter's Trojans) are
  built from declarations in `js/scenarios.js` instead of code in
  `js/world/build.js`; the world golden is unchanged and each is held to the
  world the code made at seven seeds. A scenario pack may carry an optional
  `geometry` (`body`, `orbit`, `set`; never a named rule), the Scenario Studio
  starts from the two scenarios whose geometry a pack can carry with it, and
  the pack schema, validator, SDK types and `FORMATS.md` describe the field.
- **The mission lab on the platform, and the ephemeris pack in the Sky Lab** (Roadmap II P106). The Sky Lab takes Venus, Mars and Jupiter from the DE441 pack where it covers the date, shows each planet's source and bound, and offers the elements as a choice; the mission lab's timeline, maneuvers, delta-v budget and patched-conic-against-propagated comparison can be kept as evidence envelopes (notebook source `mission-lab`), a mission is saved to My work and opened by `?open=`, a plan travels in a `#plan1.` link, the lab embeds under `gravitas-embed/1`, the figure builder takes a lab link, and the celestial mechanics unit carries the three mission investigations. `MISSION_LAB.md`, `SKY_LAB.md` and `EMBEDDING.md` have the details.
- **Declarative scenario geometry, second slice** (Roadmap II P108, `SCENARIO_GEOMETRY.md`).
  Earth-Moon System, Interstellar Visitor, Binary Pair, Black Hole Lab, Habitable
  Zone Lab and TRAPPIST-1 are declared, not coded: new built-in constructs take a
  body from the generated population by index, keep the extra generated bodies of
  a type, place a body at a multiple of its central body's drawn radius, draw a
  phase from the seeded generator at its step, and put a circular pair about its
  barycenter. The world golden is unchanged and every field of every body, the
  settings, the camera and the generator's next draw equal the code's at seven
  seeds (the fixture now holds every property, and slice 1's six were
  re-checked against the code before them). These constructs are not a pack's to
  carry (the share link keeps too little of a body), so a pack names the built-in.
- **Declarative scenario geometry, third slice** (Roadmap II P108, `SCENARIO_GEOMETRY.md`).
  The ten laboratory scenarios (Lagrange Point, Orbital Transfer, Binary Planet,
  Circumbinary Planet, Exoplanet Characterization, Transit, Blended Binary,
  Three-Body Sensitivity and the two Gravity Assists) are declared in
  `js/world/build.js` instead of coded there. The ones that are plain bodies
  (Transit Lab, Blended Binary) use three small built-in constructs (a body built
  from another mass, a mutual orbit, a retrograde orbit); the rest name a
  parameterized rule whose table row keeps the names, colors and drawn sizes and
  whose formula reads the settings a student changes. The world golden is
  unchanged; every field of every body equals the code's at seven seeds and
  under 186 share-link cases, and a fuzz of 1,229 worlds against the base found
  no difference. Not a pack's to carry: a pack names the built-in.
- **The 3-D lab on the platform** (Roadmap II P105). Evidence (`gravitas.artifact/1` envelopes for readings, events and observations; notebook source `lab3d`), saved 3-D systems in My work, the 3-D state as the forward models' input (`js/forward/system3d.js`), a 3-D system file in the comparison instrument, an optional `system3d` block in scenario packs with its link (`js/lab3d/link.js`) and Studio support, an embedded 3-D figure under `gravitas-embed/1` and a figure-builder path for it, 3-D reference systems in the Library, depths for the four investigations, and `guide` items in course packs (the celestial mechanics unit carries all four). `LAB3D.md` has the table.
- **The compute page** (Roadmap II P101, `COMPUTE.md`). `/compute/` runs one of two reviewed Python notebooks (transit times; a spectral line's centroid, width and velocity) on a Gravitas observation, in Pyodide in a Worker inside an opaque-origin sandboxed frame served from its own origin (https://gravitas-compute.github.io, `compute-frame/`, published verbatim; D-COMPUTE-ORIGIN-01). Opt-in and online only, never precached, with its own route budget; the cold download (about 8.9 or 18.9 MB) is stated before "Start the runtime". The page checks the frame's bytes against a pin, exchanges only typed, size-bounded messages (`gravitas-compute/1`) and checks every answer before drawing it. Each run is a `gravitas.compute-capsule/1`: notebook, inputs and outputs by hash, runtime, timing, citations; it can be kept in My work (notebook source `compute-capsule`), reopened and verified without a runtime, or exported as one notebook for a local Jupyter that checks its outputs against the capsule. `node tools/compute.mjs` builds the frame, its pin and the catalogue hashes; Jest suites for the messages, catalogue, capsule, session and frame; `e2e/compute.spec.js` (no network) and `e2e/computeOnline.spec.js` (`COMPUTE_ONLINE=1`).
- **The forward-model loop** (Roadmap II P84). `gravitas.observing-setup/1` and seven pure forward models (transit, radial velocity, astrometry, periodic, spectrum, catalogue, image) return synthetic observations with a truth manifest; the Observatory labels them and compares a fit with the truth. See `FORWARD_MODELS.md`.
- **A Package from the Composer** (Roadmap II P81, repair R-A5, SDK 1.10.0).
  `sdk init <type> <id> --from <pack>` now wraps an investigation pack (a
  Composer save or a remix) and a course pack as well as a scenario pack: it
  writes the manifest, the CC BY 4.0 license, a citation naming a remix's
  original and a README with Author and Sources (`--author`, `--sources`),
  carries both languages from the pack and refuses, with what to do, a pack
  that declares Spanish and has no Spanish title. Documented in sdk/README.md,
  CONTRIBUTING_CONTENT.md and COMPOSER.md.
- **Sharing and governance for contributed content** (Roadmap II Prompt 80).
  CONTRIBUTING_CONTENT.md (how to submit a package, the license and provenance
  rules, the review checklist, the acceptance record, versioning, withdrawal,
  what acceptance means for the Zenodo archive); `sdk review <package>` (six
  mechanical checks and the human items), which `npm run catalog` runs and
  records, which refuses a contributed entry with a short acceptance record, and
  which CI runs on archives a pull request adds (`npm run catalog:review`);
  /catalog/ lists contributed packages under their own heading with
  attribution, review date and history, and a withdrawn package stays as a
  tombstone, with a notice and a working copy for a reader who installed it;
  SDK 1.9.0's public instrument API (declared translation catalogs and
  `translator`, `COLOR_TOKENS`, the plot component's entry) and the adequacy
  report in sdk/README.md rewritten as closed items and deliberate limits;
  OWNER_ACTIONS.md says who may accept and what it implies; D-CONTRIB-01.
- **Platform baseline and stewardship** (Roadmap II Prompt 111). A supported-browser
  statement in SUPPORT.md and on the Teach hub, generated from
  `playwright.config.js` and the locked Playwright's browser builds
  (`npm run support:sync`), with a feature-detection inventory held to the code in
  both directions; TOOLCHAIN.md (Node, exact pins, ranges, the quarterly
  checkpoint); CONTINUITY.md (the archive, hosting a copy, adding a
  co-maintainer, what a fork keeps); a bus-factor checklist and the repository
  settings' current status in OWNER_ACTIONS.md. `esbuild` is now an exact pin
  (it was `^0.28.2`; the lockfile already held 0.28.2).
- **Every width designed** (Roadmap II Prompt 55, PLATFORM_MODEL.md "As
  built (Prompt 55)"). One breakpoint scale of four tiers replaces twenty
  media-query widths, and a test refuses any other (DESIGN_SYSTEM.md,
  "Breakpoints").
  - A lesson on a laptop shows one docked panel at a time, as tabs; on a
    tablet the step and its instrument share a sheet across the bottom; on
    a phone the instrument is a second sheet on the step's. The canvas keeps
    a third of the window in every arrangement, Next and Back never need
    scrolling, and no panel covers the transport bar.
  - The footer's links no longer run under the elapsed time at 1024 px, and
    without a lesson the scenario card leaves the top corners to the readout
    and the Menu button.
  - On a touch screen every control is at least 44 px, and the canvas keeps
    a two-finger zoom for itself while the page stays zoomable.
  - The Studio pages are read-only on a phone, and say so.
  - The browser suite runs the investigation walker and a layout spec at
    the phone and a tablet size as well as on a desktop.
- **The Library** (Roadmap II Prompt 54, [LIBRARY.md](LIBRARY.md)). One
  index of everything a student or instructor can open, at `/library/`: the
  lessons and the guided investigations of the Observatory, the 3-D lab and
  the mission lab, the classroom activities, the scenarios, the datasets,
  the courses and the experiments, 125 entries with the same fields.
  - `library/library.json` (`gravitas.library/1`, with a schema) is
    generated from the sources that own each thing, checked fresh by the
    gate, and every route it emits is resolved by `validate:links`. A field
    a source does not declare is left empty and counted per kind.
  - The page searches and filters it with the lesson browser's own
    functions, plus kind, format and level; groups it by subject, course
    level or sequence; keeps its filters in the address; shows the progress
    each surface saved; and gives every kind one card that links to the
    page that runs it.
  - Every guide now declares its level and subjects, and every Observatory
    observation its subjects.
  - Home leads into it: a "continue where you left off" strip for lessons
    started and not finished, and a card per kind of thing in the Library.
    Its sections became a fragment of markup, which paid for both.
  - Every page's Learn group, and the lesson browser, link it.
- **Home** (Roadmap II Prompt 50, item 3). The front door is a page of
  the shell now, not a layer over it: it opens below the bar, and the bar
  stays live, with its navigation, switches and Tab order, while it is up.
  Every page's GRAVITAS link opens it by name (`/#home`), for a returning
  visitor too. Leaving it lands in the sandbox and takes `#home` out of the
  address, and a deep link still goes straight to what it names. Its
  content is the front door's own, the three ways in and the featured
  scenarios and investigations, until Prompt 73 redesigns onboarding.
- **The shared shell, on the application** (Roadmap II Prompt 50, Part 3).
  The simulation at `/` carries the same header as every other page, fixed
  over its full-bleed canvas: the navigation to every surface, and the
  language and theme switches.
  - The readout, the control rail, the lesson panel, the inspector and the
    scenario title move down by the bar's height (`--shell-height`). The
    canvas does not move.
  - The bar is gone in an embedded figure and in lecture mode, where the
    readout moves back up into the room it left.
  - The footer's theme and language menus are gone: the shell's switches
    are the application's own `setTheme` and `setLocale`, so a theme change
    still repaints the canvas and a language change still translates in
    place. The rail's Learn section keeps About Gravitas and the manual; its
    links to the model and instructor pages are in the navigation now.
- **The shared shell, on the tool pages** (Roadmap II Prompt 50, Part 2).
  The Observatory, the catalog, the experiment runner, the figure builder,
  the Scenario Studio, the Investigation Composer, the course builder, the
  course home, both 3-D pages, both mission pages and submission review
  carry the shell. Every page now has the whole navigation, and no page
  has a "Back to Gravitas" link.
  - Five routes pay for the module and use the shell's switches, the
    language one re-translating the page in place: the Observatory, the
    experiment runner, the figure builder, the course builder and
    submission review. Submission review was a dead end with no links out.
  - The other eight carry the markup without the module and keep their own
    language switch until their routes can pay.
  - The stored theme now reaches all thirteen pages. That exposed text,
    rules and fields written for Midnight only, which now use the theme's
    tokens. The course builder's link-table links are at least 24 pixels
    tall (WCAG 2.2, 2.5.8).
- **The shared shell, on the document pages** (PLATFORM_MODEL.md, Roadmap
  II Prompt 50, Part 1). /model/, /validation/, /teaching/, /instructors/
  and /evaluation/ share one header, five navigation groups, a language and
  a theme switch, and one footer, stamped from `tools/shell.mjs`.
  - The navigation is native disclosure (`<details>`), so it works with no
    script at all; `js/shell.js` adds one group open at a time, Escape, the
    two switches and the phone Menu.
  - Every label is written in both languages and the page's language picks
    one, so the shell costs a route no catalog: 3.2 KB of script where the
    prototype needed 8.3.
  - The stored theme now applies on all five pages before the first paint;
    on /evaluation/ it exposed hint text and rules that were legible only in
    Midnight, now drawn with the theme's tokens.
  - /evaluation/ and /instructors/ carry the shell without its module, which
    their routes cannot yet pay for: the navigation works and the theme
    applies, and the two switches wait.
- **Course packs** (COURSE_PACKS.md). `gravitas.course-pack/2` orders a
  course's lessons, assignments cut from them, scenarios, datasets and
  readings in units, with objectives, prerequisites, time, optional
  introductory and advanced paths, and notes in English and Spanish.
  - **The builder,** at `/studio/course/`, picks content from this build and
    the catalog. It checks what the course depends on, its licenses and its
    translations, configures assignments, and makes the course's links,
    embeds, a machine-readable manifest and a printable syllabus.
  - **Pins:** every lesson is pinned to a digest of its steps and its
    package. A course is exact (an archive: any change waits for review) or
    compatible (only what can break waits). The reviewed upgrade re-pins
    what an instructor has looked at, re-issues an assignment whose steps
    moved, and raises the course's version.
  - **The course home,** at `/course/`, is what students open: from a link, a
    file, or a course Gravitas ships. It filters by path, prints as a
    syllabus, reads in English or Spanish, and opens offline once Gravitas
    has been opened.
  - **Introductory astronomy,** a four-unit course from existing content, is
    the first course Gravitas ships.
  - A /1 course migrates. The Observatory opens a built-in observation by
    `?open=<id>`.
- **The mission lab** (`/mission/lab/`, MISSION_LAB.md): a mission to Mars on
  JPL's DE441 ephemeris, in three guided parts.
  - **The ephemeris pack** (`gravitas.ephemeris-pack` 1): Venus, the Earth,
    Mars and the Jupiter system barycenter, 2025 to 2045.
    - Chebyshev fits to daily JPL Horizons states, within 4.2 km and
      7.3e-5 km/s of held-out states; 107 KB.
    - Built reproducibly by `tools/build-ephemeris.mjs`, every request and
      answer pinned. It is checked offline in CI (`ephemeris:check`) and
      rebuilt byte for byte from the pinned answers
      (`ephemeris:provenance`).
  - **The mission:**
    - a rendezvous with a depot in Earth orbit;
    - the 2026 window on the real positions, in three dimensions, with four
      ways to choose;
    - the patched-conic design against the same spacecraft flown directly
      by the 3-D kernel under the Sun and the planets;
    - a correction burn found by aiming again;
    - delta-v and propellant by the rocket equation.
  - **The page:** a maneuver editor, an interactive timeline, three geometry
    views with every number in tables, and plan and report files.
  - **The guides:** checked against the reader's own lab, with a measured
    diagnosis of why the design misses Mars and an explanation students
    write.
  - **Around it:** instructor guide and answer key; English and Spanish;
    offline; ten reference cases.

- **The mission-design core** (`/mission/`, MISSION.md): educational
  astrodynamics on the 3-D engine, as a diagnostic page.
  - **Solvers:** impulsive Hohmann and bi-elliptic transfers; plane changes
    and their best split; rendezvous and phasing; Lambert's problem (zero
    revolutions, either branch, bracketed and bounded); patched-conic
    departures and captures; transfer windows; planar unpowered flybys.
  - **Refusals, not plausible numbers:** every solver returns its
    convergence or a coded refusal. Lambert's answers are confirmed by an
    independent propagation, and near-antipodal, unconfirmable and too-fast
    cases are refused.
  - **Validated** against textbook examples (Curtis, Vallado), closed-form
    constants, and the 3-D kernel flying each answer, with fixed tolerances
    (`npm run validate:mission`, a CI step).
  - **Runs in a Worker,** with cancellation, a wall-clock limit and bounded
    windows. Delta-v budgets, event timelines, a transfer-window plot with
    a CSV, and a plan file (`gravitas.mission-plan` 1) that keeps inputs,
    model and results apart, in English and Spanish.
  - **Not operational mission design or navigation,** and every page, table
    and file says so.

- **Orbits in three dimensions** (LAB3D_CURRICULUM.md): four guides in the
  3-D lab.
  - **The four:** an orbit's plane (inclination and nodes); seen from
    outside (an eclipse lost to half a degree, and a drawn size that lies);
    two orbits' planes (equal inclinations that are not one plane, and when
    a flat model of a planetary system is good enough); and a distant third
    body (the Kozai-Lidov cycle, with √(1 − e²) cos i held while e and i
    trade).
  - **Every guide:** a prediction, a manipulation and a measurement, a 2-D
    comparison and the model's limits. Answers are checked against the
    lab's own numbers.
  - **Runs** on introductory and advanced paths, in English and Spanish,
    from the tables with no WebGL, and offline.
  - **Reports:** a deterministic report file.
  - **For instructors:** an instructor guide and answer key.
  - **The key:** a reference run (`npm run lab3d:key`).
  - **The lab gained** two instruments (on the sky, and between two orbits),
    sessions that continue by themselves, and Spanish loaded only for
    Spanish readers. In the build the guide panel is a bundle of its own.

- **The 3-D lab** (`/3d/`, LAB3D.md): small systems in three dimensions,
  played by the 3-D kernel in a Worker and drawn in WebGL, without touching
  the 2-D renderer.
  - **Snapshots:** the page draws from versioned snapshots, interpolating
    between their every-tick rows, and reads every number from a snapshot
    as it is. Playing faster asks for more whole intervals, never a longer
    step, so no number depends on the speed. API
    1.1.0 adds live sessions.
  - **The view:** looks face-on and edge-on to an orbit or the reference
    plane, perspective or orthographic, orbit, pan, zoom and follow.
    Frames: barycentric, body-centered and rotating with a pair.
  - **Honest scale:** a legend states the scale bar, the body size (equal
    markers, radius × 10 or true), the trails' span, the grid, the height
    lines and the arrows' time scale.
  - **Instruments** measure from the numbers: distance, angle, relative
    velocity and orbital elements about a body's primary.
  - **Tables:** the hierarchy, positions and speeds, elements, conserved
    errors and events, with no WebGL needed.
  - **Access:** keyboard throughout, reduced motion, low quality, recovery
    from a lost WebGL context, and Spanish.
  - **Its own three.js build** (`vendor/three/lab3d.module.js`), so the
    application's 3-D view and budgets do not move.

- **A 3-D small-N dynamics kernel** (LAB3D.md), the accepted design of
  VALIDATED_3D_LAB_GATE.md. It runs only in disposable Worker realms, with
  nothing from the 2-D engine.
  - **Integrators:** compensated fourth-order Yoshida by default, with
    leapfrog, Yoshida and RK4, and adaptive Dormand-Prince 5(4) for close
    approaches.
  - **Physics:** mergers, orbital elements (elliptic and hyperbolic) and
    frames.
  - **Reproducible to the byte:** no engine-dependent arithmetic, so the
    same numbers give the same bytes in every browser.
  - **`gravitas.system3d/1`:** code or solar units with a dimensional check.
    It refuses ambiguous input and migrates the 2-D Orbital System Builder's
    files.
  - **Runs:** limits, cancellation, events, residuals and warnings.
  - **Integration:** a versioned capability API, and 3-D experiments through
    the experiment scheduler.
  - **Validation:** the gate's reference problems, permanent in
    `npm run validate:lab3d` and the check registry.
  - **Diagnostics:** the page `/lab3d/`.

- **The Investigation Composer** (COMPOSER.md). A page at `/studio/lesson/`
  composes a guided investigation as data, `gravitas.investigation-pack/1`,
  judged by the same lesson checker as every built-in lesson.
  - **Steps:** read, predict (marked at a later step), explore, measure and
    question, each binding a scenario, a seed word and an instrument, as
    collapsible cards.
  - **Remediation:** a step shown only to students whose answer to an
    earlier graded step is wrong (or right), one level deep. The engine's
    Next and Previous honor it and `js/authoring/rules.js` checks it.
  - **A question bank** (`gravitas.question-bank/1`): versioned questions
    with explicit points and attempt rules, accessibility metadata, and
    variants, either shuffled options or inputs from a vetted relation
    Gravitas computes (Kepler's third law, orbital and escape speed,
    inverse square, transit depth). A recorded seed picks the variant, so
    the same seed builds the same investigation.
  - **Translation:** English and Spanish side by side, each text marked
    translated, missing or out of date from a digest of the English it was
    written from.
  - **Around it:** an estimate of the work fitted to the built-in lessons, an
    answer key, a sample lab report as a PDF, a preview in the real lesson
    engine as a student or with the author bar, drafts, undo, a raw JSON
    view, import conflicts, bank merging, and the lesson files a maintainer
    vendors.
  - A hostile file is refused before any rule reads it: no prototype keys,
    functions, markup, links, or files larger or deeper than any pack.

- **The Scenario Studio** (STUDIO.md). A page at `/studio/` makes a scenario
  as data rather than code, and writes a `gravitas.scenario-pack/1` file or a
  link the application opens.
  - **What it holds:** any of 47 settings, a seed, bodies as an orbital
    system (as the Orbital System Builder takes it) or as typed positions and
    velocities (as precise placement takes them), the panels and tools it
    opens with, and a title and summary in English and Spanish. Units are on
    every field, and nothing is converted.
  - **Checks:** every problem is shown on its own field and blocks saving.
    Cautions never block: the builder's checks, an overlap, a step longer
    than the system needs, and a typed body faster than the escape speed from
    the rest, said as the two-body estimate it is.
  - **Editing:** undo and redo from the buttons or the keys, a draft saved in
    the browser after every edit, a raw JSON view that refuses what does not
    parse, an import that asks before replacing a different draft, and the
    fields changed since it was opened or saved.
  - **Like a built-in:** a pack made from any of the 22 built-ins whose world
    is generated from their settings builds that world body for body under
    the same seed. Its link opens with the panels and tools it names already
    out, and Refresh Scenario builds it again.
  - Start from a built-in or from an Orbital System Builder file, preview it
    as the embedded application, and read it in English or Spanish.
- **SDK 1.5.0: the `scenario-pack` extension type.** `init scenario-pack`,
  `init --from <file>` for a file the Studio saved, `validate` with the
  Studio's checks and cautions, a `test` that builds the world under its
  seed, steps it and builds it again, and `sdk/schemas/scenario-pack-1.schema.json`.
  The figure-eight choreography (Chenciner and Montgomery 2000) is the
  example.
- **A link can name the instruments it opens with.** A scenario pack's link
  carries its panels and tools, and opening it presses each on the rail, as
  a reader's click would.

- **The Orbital System Builder** (ORBITAL_SYSTEM_BUILDER.md). A form in the
  Scenario section, beside Blank Simulation, builds a two-dimensional
  hierarchical system from orbital elements, with no conversion to positions
  and velocities by hand.
  - **What you enter:** for each companion, what it orbits, its type, mass
    and contact radius, and its semi-major axis, eccentricity, argument of
    periapsis, starting mean anomaly and direction.
  - **How it is built:** companions are added innermost first, each around
    the barycenter of everything inside its orbit. The finished system has
    its barycenter at rest at the origin by construction. Every orbit reads
    back from the starting state to a part in 10¹².
  - **What it shows:** a preview, Keplerian periods, barycenter offsets, and
    checks for overlap, contact at periapsis, the Hill sphere, crossing
    orbits, Holman–Wiegert, Mardling–Aarseth and Gladman spacing. It says
    plainly that the elements are osculating and that no check proves
    stability.
  - **Like any other world:** a built system can be selected, edited,
    shared, rebuilt by Refresh Scenario and restored by the experiment bench.
    It saves as a versioned `gravitas.orbital-system` JSON file,
    independently of URL length.
  - **Six templates:** a star and a planet; the Sun, Earth and Moon; the
    Sun, Jupiter and Saturn; Kepler-16; Alpha Centauri; and a hierarchical
    triple star.
- **Stars and their populations: spectra, clusters and variables**
  (STELLAR_POPULATIONS.md). A second suite of five guides in `/observatory/`,
  on introductory and advanced paths, run by the same runner as the
  Exoplanet Observatory.
  - **What they cover:** what a spectrum says, from H-alpha and TiO5 to an
    A-type star whose gravity says it is no dwarf; NGC 2420's
    color–magnitude diagram and what SDSS left out of it (the crowded core,
    the saturated giants, the field); membership by SEGUE's velocities, and
    three published metallicities that disagree; ages from MIST's isochrones,
    and how metallicity and reddening trade against age and distance; and SU
    Draconis's period, light curve and distance as a standard candle, with a
    period search a transit fools.
  - **Three new data packs:** NGC 2420's SDSS DR18 photometry and SEGUE
    parameters, and MIST v1.2's SDSS isochrones, as the new `catalog` data
    type in the `table-columns/1` encoding, pinned and rebuilt byte for byte
    by `npm run packs:provenance`.
  - **New measurement tools, for any observation:** a band index (TiO5,
    CaH2), a comparison with model curves that draws its best curve over the
    points, a column summary (count, median, mean, spread), and derived
    columns: a sum of columns with its errors in quadrature, and the distance
    on the sky from a position.
  - **The guide runner is a platform:** suites are registered and load when
    chosen; the checks, the answer key and the instructor documents are
    shared, and the exoplanet suite shrank by 206 lines moving onto them.
  - **For instructors:** a guide and an answer key in the portal
    (`npm run guides:populations-key`); English and Spanish; offline.
  - **SDK 1.4.0:** the `catalog` data type in the manifest schema.
- **The Exoplanet Observatory: from photons to a planet**
  (EXOPLANET_OBSERVATORY.md). Five guides in `/observatory/` that take a
  reader through real TESS light curves, each on an introductory and an
  advanced path.
  - **What they cover:** whose light a light curve holds (quality flags, the
    aperture, crowding); finding a transit with the box search and folding
    it; fitting it, what the data cannot separate, and the planet's radius
    from an adopted star's; Kepler-13, where a companion's light hides much
    of the transit and the light curve cannot say which star is the host;
    and whether the dip is a planet at all, ending on what a transit cannot
    weigh.
  - **Every checked number from the data:** a step is checked against the
    reader's own measurement or fit, against a number computed from the light
    curve on screen by a stated method, or against a cited value named as
    adopted.
  - **Kepler-13 from the catalog:** two new catalog packs, its collected (SAP)
    and corrected (PDCSAP) light curves with the pipeline's crowding estimate,
    installed the first time a step opens one.
  - **Evidence and teaching:** progress kept in the browser; the answers go to
    the notebook; an instructor guide with the curriculum map, teaching notes
    and assignment sheets, and an answer key from a reference run
    (`npm run guides:key`); English and Spanish; offline.
  - **The fit panel** takes an adopted stellar radius and its uncertainty, and
    derives the planet's radius with both.
  - **SDK 1.3.0:** `binTessLightCurve` reads SAP flux and records CROWDSAP and
    FLFRCSAP when asked; `foldedDepth` is exported.
- **An analysis laboratory for experiments and fits** (ANALYSIS_LAB.md).
  - **Analyze, on the experiment runner:** for a result, run here or saved,
    each setting's numbers with 95% intervals; local slopes, elasticities, a
    trend and a rank correlation; the share of the scatter that is the
    setting, with a permutation test; the distribution, as a histogram with its
    counts; and warnings of what the result cannot tell, such as a measurement
    that cannot be read back to one setting, or a stretch where the setting is
    not identifiable.
  - **Honest about deterministic scenarios:** the laboratory scenarios ignore
    their seed, so identical repeats get no interval and no test. The same
    experiment run at another integration step gives the numerical
    uncertainty instead, and the slopes are judged against it.
  - **A plot and a table of every trial, linked:** a drag or the keyboard
    selects trials in either, and a summary of the selection follows.
  - **The experiment form:** a second setting (a grid), settings drawn at
    random (a seeded sample), and a choice of integration step.
  - **Compare the fits, in the Observatory:** AIC, AICc, BIC and Akaike
    weights for fits of named models and a constant; likelihood-ratio tests
    between nested ones, flagged on a boundary; residual diagnostics; each
    fit's parameter correlations. Fits to other rows are refused by name.
  - **Priced, refusable and cancelable:** the work is forecast for the device
    and refused past its limit.
  - **Saved whole:** a `gravitas.analysis/1` holding the experiment's manifest
    or every fit's inference document.
  - **Validated over many seeds** (`npm run analysis:validate`), with the
    failure cases recorded: a skewed sample's t interval, understated
    uncertainties, a period range that excludes the truth, and a step too
    coarse next to an instability.
  - **Cost:** the experiment runner now fetches Spanish only when it is
    chosen, which more than pays for the form. Its route is 4.9 KB lighter than
    before on the build.
- **A measurement pipeline in the Observatory** (MEASUREMENT_PIPELINE.md).
  - **What it is:** a versioned, inspectable record of what was done to an
    observation and what it gave. Its nodes are the source, every change, each
    measurement and each fit, in the order they happened.
  - **The tools, each bounded to teaching size:**
    - a period search (generalized Lomb-Scargle, with a Baluev false-alarm
      probability);
    - a transit search (box least squares);
    - a spectral line (continuum, equivalent width, center, velocity);
    - an aperture on an image (flux and centroid, or a flag's pixels and
      their sky position);
    - filtering table rows;
    - a cross-match with a second table.
  - **What every result records:** each number is measured, derived or
    assumed, and each uncertainty too. A node keeps its tool's version, its
    parameters and a checksum of the data it saw. Undo what it depended on and
    it says it is stale.
  - **Working with results:** a result can become a change (fold at its
    period, mask what a filter failed). There is undo and redo for the
    measurements, a methods summary with a citation for every method, and CSV
    of the results and the periodogram.
  - **Saving and reading back:** the pipeline saves as JSON and reads back,
    replayed and recomputed, node by node, to the numbers it saved. An older
    Observatory save opens as a pipeline too.
  - **The notebook:** a result goes into the evidence notebook and its PDF
    report with where its data came from, instead of a simulation's
    conditions, and a period search brings its periodogram as the figure.
  - **Validated two ways (`npm run measure:validate`):**
    - on seeded synthetic truth, where every stated error is the spread of
      its answers;
    - against cited values on the shipped data: SU Dra's period from Gaia
      within 0.5 sigma of Monson et al. 2017, HD 209458 b's from TESS within
      50 s of Knutson et al. 2007, SDSS Balmer velocities within 0.2 sigma of
      SDSS's own redshifts, and the TESS aperture's 23 pixels.
- **The Observatory loads its file reader when a file is first chosen,** not
  on every visit: 10 KB off the page's opening download.

- **The Observatory can import a star's Gaia DR3 epoch photometry live, from
  CDS, by name** (ARCHIVE_IMPORT.md).
  - **What it is:** the slice VO_ARCHIVE_GATE.md accepted, and nothing more.
    It uses CDS Sesame for the name, and CDS VizieR TAP for the Gaia DR3 cone
    and the epochs. It is opt-in and loaded only when opened, and it never
    touches a lesson.
  - **Before anything is used,** the reader reviews every field and its unit
    or "not stated", the rows, the service's status, both checksums, the
    license and what the conversion will do. Then the observation opens in the
    workspace like any other.
  - **Converted honestly:** a curated descriptor supplies what VizieR does not
    say. Times are barycentric TCB, converted to TDB by IAU 2006 B3; the flux
    is in e⁻/s, which gives the G errors. A unit the service states that the
    descriptor does not expect stops the conversion. The id is the content's
    digest, the query and both checksums travel with it, and so does its
    license, CC BY-NC 3.0 IGO.
  - **Bounded:** two origins, held by a meta Content-Security-Policy as well
    as the code. There is no cookie and no referrer. Limits are 64 KB and
    512 KB counted as they stream, 20 s per request, and a row limit on every
    query.
  - **Named failures:** each failure is named in English and Spanish:
    blocked, timeout, rate-limited, unavailable, too large, not a table, a
    service error, a wrong unit, canceled.
  - **Offline:** answers are kept on the device, so a star imported before
    opens offline, marked stale with its age once it is a week old.
  - **Checks:** `npm run archive:live` checks, on demand, that CDS still
    answers this way.
- **Magnitude axes are drawn brighter-up** in the Observatory's plot.

- **A curated catalog, `/catalog/`: data, courses and instruments, each
  reviewed before it is listed, and installable for offline use**
  (CATALOG.md).
  - **What it lists:** `catalog/catalog.json` (`gravitas.catalog/1`),
    generated at release time and checked on every change (`npm run
    catalog:check`, in CI). It lists the four built-in capability packages
    and two extensions built outside the core with only the SDK.
  - **What each entry shows:** what it is and provides, its download and
    installed size, which Gravitas it works with, its license and citations,
    and its review.
  - **Installing** a data pack or a course fetches its archive from this site
    and checks the catalog's checksum before decompressing a byte. The reader
    refuses every archive the SDK would not write: traversal, links,
    duplicates, a gzip bomb, a bad checksum. The content must pass the
    platform's own checks, and only then is the pack stored, in one write, in
    IndexedDB. Each failure is named beside its entry, in English or Spanish,
    with a retry.
  - **Using it:** an installed data pack opens in the observatory, and an
    installed course opens as its units with a link into each lesson.
    Updates, downgrades and new major versions are told apart.
  - **Assignments pin their package:** a link made from a lesson a package
    provides carries that package and its version (assignment schema 2).
    Opening one made with another major version, or before pinning, says so.
  - **Rules for accepting an entry,** and what the SDK lacked: CATALOG.md.
- **SU Draconis, an RR Lyrae star, from TESS** (`extensions/su-dra-tess-s15`):
  26 days of its light, installable from the catalog. A 20-harmonic series
  gives its period as 0.660408 d, against 0.66042001 d published. RR Lyrae
  itself was the first choice; its TESS light curve is unusable, because the
  input catalog lists the star nine magnitudes too faint. The pack's record
  says so.
- **A pulsating-stars course** (`extensions/pulsating-stars`): three lessons,
  in English and Spanish, ending on that light curve.
- **SDK 1.2.0:** `readFits()` and `binTessLightCurve()` in the public API; the
  `binned-relative-flux/2` encoding, for a star that varies by more than 3.3%;
  and the `harmonic-period` check.

- **An inference core: transit and radial-velocity fits in the browser,
  shown to be honest before they are used** (INFERENCE_CORE.md).
  - **What it fits:** a quadratic limb-darkened transit (`transit-quadratic`
    1.0.0) and a Keplerian orbit with a zero point per instrument and a
    jitter (`rv-keplerian` 1.0.0), each a small named parameter set with
    physical bounds. Every parameter is fitted, fixed or derived, and a
    result never mixes them up.
  - **How:** weighted least squares, a bounded grid and then bounded
    Levenberg–Marquardt, with linear parameters solved exactly. No MCMC and
    no black-box optimizer. Deterministic, cancellable, with progress.
  - **Uncertainty, kept apart:** the covariance's sigma, sigma scaled by the
    reduced chi-square, a correlated-noise sigma, a Δχ² = 1 profile interval
    and a slice. None is called a confidence region; how often each holds
    the truth is measured over 100 seeded injections per case.
  - **What it tracks and what it does not claim:** time format and scale,
    exposure smearing, the baseline, RV zero points and jitter, missing
    error bars, a fixed dilution, and the star's radius uncertainty. No mass
    or density from a transit: no radial-velocity data for HD 209458 ships
    with Gravitas, so the real-data fit is transit-only.
  - **Where it runs:** disposable Workers through the experiment runner's
    scheduler, with no world, no network and nothing on the page. A request
    too large for the device is refused before it starts, with the reason.
  - **A manifest,** `gravitas.inference/1`: the data pack and its version,
    the model and its version, the parameters, the bounds, the algorithm,
    the engine's fingerprint and the results.
  - **A diagnostic panel** on `/observatory/`, loaded only when opened, and
    `npm run validate:inference` and `npm run bench:inference`.
- **The observatory starts smaller:** 97.9 KB of JavaScript in the build
  where it was 119.4. It loaded its data packs through the capability
  resolver, which installs every packaged lesson's loaders on import and
  brought the investigations manifest with it; it now loads them from the
  reviewed builtin list directly.
- **An Extension SDK for contributors** (sdk/README.md).
  - **Commands:** `npm run sdk -- init`, `validate`, `test`, `pack` and
    `inspect`, for the three kinds of extension. An observation data pack
    and a course pack are declarative; an instrument family is executable,
    so it is reviewed and vendored rather than installed.
  - **Checks:** the format, the declarative boundary, platform and package
    compatibility, public-id collisions, licences and provenance,
    localization, offline classes and validation references. Every
    finding is reported by file, line and field.
  - **Archives:** a pack is one deterministic `.gxp` archive, and the same
    files always give the same bytes.
  - **Examples:** one of each kind: a single TESS transit of HD 209458 cut
    from the built-in pack, a five-lesson exoplanet course in English and
    Spanish, and a Kepler's-third-law instrument.
  - **Also:** JSON Schemas, TypeScript declarations, fixtures, a contract
    suite that goes through the public API only, a compatibility matrix and
    a deprecation policy.
  - **Platform change:** `gravitas.capability-package/1` can now provide
    `courses`.
  - **Not yet:** Gravitas does not install extensions at run time. The guide
    lists what still stands in an outside author's way.
- **An observatory, `/observatory/`: real observations and a reader's own
  files, as a plot, a table and an image at once** (OBSERVATORY_WORKSPACE_DESIGN.md).
  - **What it opens:** four kinds, each an authentic dataset Gravitas already
    ships. They are HD 209458's TESS light curve (a time series); four SDSS
    DR18 stellar spectra; five GWOSC events' catalog values with their 90%
    intervals (a table); and the same TESS light curve's aperture mask (an
    image), a new data pack. It also opens a reader's CSV or JSON, through a
    preview and a mapping in which every unit is chosen and none is guessed.
  - **One shape for all of them,** `gravitas.observation/1`: units from a
    registry that converts only within a dimension, one-sigma and interval
    uncertainties, missing values kept as missing, masks, bit-field flags,
    time formats and scales, spectral media and frames, and the source's
    provenance.
  - **Linked views:** a selection made by dragging or with the keyboard in the
    plot, the image or the table is the selection in all three, and the
    focused row or pixel is described in words. The table is an accessible
    grid of every row, a page at a time.
  - **Changes, all undoable:** crop, mask, note, convert a unit, change a time
    format, divide by the median, fold, bin, and shift a spectrum to its rest
    frame. Each is refused, with the reason, where it cannot apply.
  - **Honest about what it shows:** "What you are seeing" lists what was done
    to the data before it arrived, every change made here, how many points
    the plot drew of how many, masked and missing rows, and whether there is
    an uncertainty at all.
  - **Saves:** JSON that reads back as the whole session (the observation as
    opened, and the changes made again), the same bytes every time; and CSV
    with units in the header and text disarmed.
  - Works offline once Gravitas has been opened, in English and Spanish, and
    within budgets for a desktop and a throttled phone (`npm run
    bench:observatory`).
- **An image data pack** (`tess-hd209458-s56-aperture`), and the FITS tool
  reads two-dimensional images. Image packs are a new `dataType`, and SDK
  1.1.0 adds two optional runtime fields (`reductions`, `image`) without
  refusing a pack written for 1.0.0.
- **An experiment runner, `/experiments/`.** It is the bench's parameter
  sweep, stated completely enough to run in the background and to run again.
  - **What it runs:** a `gravitas.experiment/1` manifest (EXPERIMENTS.md).
    That is a laboratory scenario; one or two of its variables, as values, a
    range or a seeded uniform draw; a seed set; the bench's metrics; a stop
    duration and events; fixed numerics; and limits.
  - **Where it runs:** every trial runs in its own disposable Worker. The
    engine is evaluated fresh there, so no trial inherits another's state.
    Several run at once, and results are reported in planned order.
  - **Before a run:** one trial is built, and its Worker times its own
    start-up and a short burst of the world, so the experiment is priced on
    this device rather than from a figure per class of device. An experiment
    likely to freeze or exhaust it is refused with the reason, and so is one
    whose trials would all stop at the sample limit and be averaged into
    nothing.
  - **During a run:** cancel, per-trial and total time limits, a result-size
    cap, and reports of corrupt answers and failed Workers. Resume re-runs
    only what did not finish.
  - **The result:** a summary table, the trials and a plot. It downloads as
    JSON with an engine fingerprint, and a saved result can be checked for
    whether it still reproduces here and, if not, why.
  - In English and Spanish.

- **Observation data packs, and the first one: TESS's light curve of HD 209458.**
  A pack is observed data with its record of where it came from and what was
  done to it (DATA_PACKS.md). The record covers the archive and its citation,
  the rights, a pinned checksum of the raw product, every transformation step
  with the tool's version, units, the time system, the quality mask and the
  scientific check the data passed. The first pack is TESS sector 56, with
  18,791 good cadences in 1,882 twenty-minute bins. Folding it on the
  published period finds the transit at its published depth. It loads through
  its capability package, decodes with one shared decoder, and is precached
  for offline use. No lesson uses it yet. `npm run packs:check` verifies it
  without the raw file, and `npm run packs:provenance` rebuilds it byte for
  byte. Start-up is unchanged, and the deferred build grows by 9.0 KB with no
  ceiling raised.

- **An interactive figure builder, and a contract for embedding.** `/figure/`
  turns a Gravitas state - brought from Share with a new "Build a figure" link,
  or a scenario and a seed - into a figure for a course page: whether it opens
  running or paused, its language, theme and shape, its play controls, reduced
  motion, low-cost rendering, what Reset returns to, a title, a caption and a
  link to the figure, with a live preview and markup to copy. Nothing typed can
  become markup. Behind it is gravitas-embed/1 (EMBEDDING.md): `?embed=1&ev=1`
  and a closed list of options, and a small, versioned message contract - ping,
  play, pause, reset, load - that a figure obeys only from the one parent
  origin its URL names, answering nobody else. Plain `?embed=1` links behave as
  they always did. In English and Spanish.

- **A new investigation, _Twelve Nights_.** A 40-to-50-minute lesson in which
  students write a radial-velocity schedule themselves, under the constraint a
  real time allocation imposes: twelve nights on HD 209458 from La Silla, one
  measurement a night, for a target that culminates at 41.9° and is above
  airmass 2 for only part of each night. The window is tied to the target's
  hour angle, so it opens about four minutes earlier every night and the epochs
  fall on a comb spaced by one sidereal day whatever the student does; of the
  two plans they commit to the spectrograph, one returns the planet at an alias
  period. The observing planner shows the windows and the spectral window and
  never a period or a velocity. The first screen says that the sky is real and
  the star is simulated, and that only the list of times crosses between them;
  the last works out why a second site at another longitude removes the alias
  and more nights from the same site do not. In English and Spanish.
- **Observing windows computed from the sky, and checked against published
  values.** `js/observingWindow.js` gives altitude and airmass, astronomical
  twilight, lunar phase and separation, and the intervals in which all three
  allow a measurement. Time is always an argument and never read from a clock,
  so the same night computed on two machines on two different days is the same
  window. A new _Observing windows_ group on `/validation/` checks it against
  published sidereal time, solar positions, equinox and solstice, airmass fits,
  new and full moons and two total lunar eclipses; the largest residual, from
  using UT where TT is meant, is written into the check rather than absorbed
  into its tolerance.
- **A new investigation, _What If Gravity Were Not Inverse Square?_** A
  45-to-60-minute lesson in which students move the exponent of gravity between
  1.5 and 2.9 and measure what depended on it: whether an orbit closes, how the
  period scales with distance, and which conservation laws survive. The law is
  anchored at a reference radius of 1 AU, where the pull is Newtonian for every
  exponent, so moving the exponent changes the shape of the field rather than
  its strength — which a change to G alone cannot imitate. Every number is
  measured by running the model when the step opens: an ellipse that turns
  backwards below 2 and forwards above it, a precession that holds still when
  the timestep is refined, the slope of period against radius, and energy
  conserved only with the potential that belongs to the force. The instruments
  integrate their own orbits in `js/powerLawGravity.js` and never touch the
  engine, so the scenario on screen stays Newtonian; `/model/` says so, and says
  this is a controlled experiment rather than a theory of gravity. In Spanish
  the lesson text is translated but the instruments' own labels are still
  English.
- **Four real stellar spectra in _A Universe of Stars_.** New screens near the
  end of the lesson, before its closing question, put four spectra observed by
  SDSS (DR18) — one star each of type A, G, K and M — behind two instruments: a
  comparison of all four, and one unlabeled spectrum to identify from its
  absorption features. The curves are deliberately not drawn in the colors of
  their stars, every readout opens by saying these are observations and not
  models, and each measured feature depth is given as text with the windows it
  was measured in and the archive record it came from. The lesson says that
  four stars are four examples and not a sample; the selection rule, and why
  the archive's highest-signal M dwarf is not among them, are recorded with the
  data. The flux is not part of the initial download. `npm run spectra:check`
  verifies the committed data offline, and `npm run spectra:provenance`
  regenerates it byte for byte from the archive CSVs once they are cached. No
  class has used these screens yet. In English and Spanish.
- **Five real mergers in _Listening to Spacetime_.** Seven new screens, after
  the published GW150914 traces, put thirty-two seconds of GWOSC strain from
  one LIGO detector each for GW150914, GW170817, GW190412, GW190521 and
  GW190814 behind one instrument: a constant-Q map whitened by each detector's
  own noise, the last instant anything clears a threshold set by the number of
  pixels searched, and the loudest frequency at fixed times before it. The
  readout keeps what the detector recorded, what Gravitas measured from it,
  GWOSC's catalog values and the model under four separate headings; catalog
  values are held back until asked for, so a student ranks the events by chirp
  mass from a measured frequency before any mass is on screen. No chirp mass is
  measured - one was built and rejected as unstable - and nothing is a
  template, fit or detection statistic. The strain is fetched only when the
  lesson reaches it, and `npm run gwosc:provenance` regenerates it byte for byte
  from the archive once it is cached. In English and Spanish.
- **A body can be placed by typing it.** _Precise placement_, beside Add
  object, takes a type, a position, a velocity and a mass as numbers, with the
  unit named on every field, each error attached to the field it is about and
  focus moved to the first one. It calls the same `placeBody()` a click does, so
  a typed body lands in the same list, is undone by the same button and
  serializes into the same share link. Leave the mass blank and one is chosen as
  a click would choose it; a white dwarf above 1.44 solar masses is refused.
  Building an arbitrary system no longer needs a pointer or aiming at the
  canvas; dragging to feel how fast a throw is still has no keyboard
  equivalent.
- **Every exported series can be read as a table.** Each series in the export
  dialog offers **View as table** before **Download CSV**. The table is rendered
  from the bytes the CSV exporter writes, so the table, the file and the plot
  cannot be three derivations that disagree, and a long series is evenly
  sampled with the sampling stated in the caption. The rotation curve, which had
  no export at all, now has one. The shape of a curve is still not narrated.
- **The sound panel prints what the tones stand for.** It lists each voiced
  body with its orbital period, and its ratio and interval in cents to the
  highest voice. This is not a description of the sound, which is compressed
  and quantized onto a five-note scale and cannot be inverted, but of the
  quantity the sound is computed from, read from the same array the oscillators
  follow so the two cannot drift apart. It is plain content rather than a live
  region, so a screen reader is not interrupted as the voices change. A separate
  period-to-cents law, `js/sonify/law.js`, is checked on `/validation/` against
  the cent values of the octave, the just fifth and the just major sixth, and
  for exact invertibility; it is not what the speakers play. None of the
  sonification, and none of the accessibility work above, has been tested with
  a screen reader or a blind user, and [ACCESSIBILITY.md](ACCESSIBILITY.md)
  says so.
- **A lab report an instructor can read back.** The PDF lab report now carries
  a submission token — the student's answers, attempt counts, step fingerprints
  and whatever name they typed, with the assignment and an optional roster id
  taken from `?roster=` on the assignment link — printed on its last page and
  embedded in the PDF's metadata, because the two survive different mishandling.
  `/instructors/submissions/` takes a pile of those PDFs, JSON progress backups
  or pasted tokens and returns one table of per-question failure rates, hardest
  first. Each answer is graded under the language it was typed in, and written
  answers are counted as unmarkable rather than wrong. What it reads can be
  downloaded (below); there is no roster or gradebook, nothing survives a
  reload, and nothing leaves the browser. It verifies answers, not identity: a
  token computed in a browser can be forged. The page needs no passphrase, is in
  English and Spanish, and is reached by its address; nothing links to it yet.
- **The submission page's reading can be downloaded.** A summary CSV with one
  row per report - roster and assignment ids when the link supplied them, the
  name exactly as the student typed it, the lesson and its version, completion,
  and counts of correct, incorrect, unmarked, incomplete and stale answers - a
  question-level CSV with one row per graded step, and a versioned JSON document
  with everything, including what was refused and why. All three and the
  on-screen table come from one graded record per report. Nothing is merged or
  chosen: an exact duplicate is kept and marked, repeated attempts are grouped
  only by roster id and numbered by when they were saved, and without a roster
  id nothing is grouped at all. Students' written answers are left out of both
  exports unless the instructor ticks a labeled box.
- **A classroom evidence kit at `/evaluation/`.** Printable instruments for an
  instructor who wants to evaluate a section: an implementation and fidelity
  checklist, a pilot pre/post concept assessment written against _Kepler's
  Laws_, _Bound, Unbound and Escape_ and _Weighing the Stars_, a usability
  questionnaire, participant codes drawn from a word list so sheets can be
  paired without names, and de-identified CSV and JSON templates with a
  versioned schema. Every item is in the static HTML, so the forms print with
  scripts blocked. `npm run evaluation:summary` reads the exports back and
  prints counts, missing data, per-item before and after, and paired change,
  with a bootstrap interval labeled as describing this sample only — and no
  p-value, no verdict and no "gain". The page asks for no name, email address
  or institution and transmits nothing, and a test searches the built bundle for
  network calls. The assessment is project-developed and unvalidated, and no
  evaluation of Gravitas has been run. The teaching page and the instructor
  portal link to it; it is in English only.
- **A public account of what the simulation cannot undo.** A new section of
  `/model/`, _What cannot be undone_, separates two reasons a run does not come
  back. The default integrator, symplectic Euler, is not time-symmetric, while
  velocity Verlet returns to the floating-point floor. And some operations
  delete information whatever the integrator: mergers, collapse to a black
  hole, bodies culled after leaving the view, damping, and collision fragments
  scattered by an unseeded random draw. That table is generated by scanning
  `js/physics.js` (`npm run audit:irreversible`) and the release gate refuses it
  when it falls behind the engine. A third reason, chaos using up double
  precision, is stated with them. `npm run probe:reversibility` is the
  measurement, and taking it meant fixing two latent engine bugs that no
  control could reach: a negative step is now substepped like a positive one,
  and a non-finite step is refused instead of being added to every position in
  the scene. No control in the application runs the simulation backwards.
- **The engine and the world builder load in a Web Worker.** Two unguarded DOM
  accesses stopped `js/physics.js` and `js/world/build.js` from evaluating
  without a document; both are guarded, and a browser test builds and
  integrates a scenario inside a real module Worker.
  [MULTI_WORLD_DECISION.md](MULTI_WORLD_DECISION.md) records the decision this
  enables: a second, isolated world is a Worker realm, not a refactor of the
  engine into instances, and the synchronous world-swapping prototype built to
  test the idea was removed rather than kept without a consumer. Nothing in the
  application uses a Worker world yet, and the probe pages under
  `spike/lyapunov/` are not part of the build.

- **Capabilities described by versioned packages, starting with three.** The
  power-law gravity instruments, the four SDSS spectra and the lesson that uses
  the instruments are each described by a `gravitas.capability-package/1`
  manifest in `capabilities/`, and reach the application through one runtime
  (`js/platform/`): dependencies resolved in order with the platform version
  checked, each module loaded once and fetched again after a failure, and a
  package's renames of its own identifiers applied to saved answers as they are
  read. Code is named only through a reviewed registry; a package that is
  content alone may name none, and hashed build chunks never appear in a
  manifest, a link or saved work. `npm run capabilities:check` holds every
  manifest to the repository in CI, and the service-worker precache takes each
  file's offline class from its package. Nothing a reader sees changes, and
  every identifier, link and saved answer is what it was. The other
  capabilities stay built in until each is moved in its own step;
  `CAPABILITY_RUNTIME.md` lists the order.

### Changed

- **Toolchain checkpoint, October 2026** (D-R7-06, `TOOLCHAIN.md`). Node 22
  replaces Node 20, which reached its end of life in April 2026: CI, `.nvmrc`
  and the `engines` floor now say 22. Moved: Jest and its environment 30.5.1 to
  30.5.2 (the jest group), Prettier 3.9.6 to 3.9.9, and Playwright with
  `@playwright/test` 1.62.1 to 1.63.0, which moves the suite's browser builds
  to Chromium 153 and Firefox 155 (`SUPPORT.md` and the teaching page are
  regenerated from it). Held: nothing. No test, threshold or size ceiling
  changed. Supersedes the open Dependabot pull requests #154, #155 and #156.
- **CI runs what the release gate runs.**
  - Ten quick checks that only `release:check` ran now run in CI. The SDK
    extensions, the classroom activities, the scene catalog, the
    irreversible-operations audit and the five dataset structure checks run in
    the checks job. The lesson cards run in the accessibility job, which has a
    browser. The bundle-composition check now runs in the build job.
  - A quick check may stay out of CI only if it says what in CI covers it.
  - On the first of each month, the datasets are checked against their pinned
    sources, with the sources cached between runs.
  - On Mondays, the e2e timings are refreshed and offered as a pull request,
    and the Observatory's interaction budgets are reported, report-only.
  - Each scheduled job can be dry-run from `workflow_dispatch`.
  - `waitForTimeout` is held per file to today's count (218 calls, in 52
    files), and the count can only fall.
  - A flaky test can be quarantined by its title, with an owner and an expiry
    date; it still runs.
  - The browser install is one composite action instead of four copies.
  - `npm run packs:data` also fetches the catalog's extension packs' raw
    files (`node tools/catalog.mjs fetch`), from the pins their `build.mjs`
    files export.
  - The MIST tracks now regenerate byte for byte on Node 20 as well as
    Node 24. Their stage ages keep twelve significant digits, because the two
    disagree in the last bit of `10 ** x`.

- **The checker every declarative format shares has a module of its own**
  (`js/platform/checker.js`). Course packs and 3-D systems had reached it
  through `js/platform/investigation.js`, which brought the investigation
  format, the question bank and the vetted relations with it. The course
  pages now download about 41 KB less from the sources, and `/lab3d/` about
  as much. Their route ceilings were lowered to match; the composer, which
  uses all of them, is unchanged.
- **The English catalog no longer repeats the sentences lessons compute.**
  Each of its 139 `lessonFn.*` entries was keyed on its own text, and
  `js/i18n/lesson.js` already returns the sentence when a locale has no
  entry, so English reads exactly as before. Dropping them took 13.6 KB off
  the deferred bundle and every lesson's download; the Spanish translations
  keep their ids.
- **The Orbital System Builder points to the Scenario Studio,** which opens
  the file it saves.
- **The vendored three.js is 475 KB instead of 660.** It now holds only
  what the 3-D view uses, which takes 47.7 KB off the 3-D view's download
  and the deferred bundle. `tests/vendoredThree.test.js` holds the view to
  the names the file exports.
- **The observatory starts lighter again:** the pack decoder arrives with the
  first observation opened. That is 188.7 KB from the sources, where it was
  193.7, and the ceilings are lowered to keep it.
- **A lesson loads only the instruments its current step needs.** Thirteen of
  the seventeen instrument families were still part of the lesson engine, so
  every lesson downloaded and ran all of them before its first step. Every
  family is now fetched when a step first names one of its instruments: before
  its first step a lesson loads 738 to 811 KB less JavaScript from the published
  site and makes 23 to 25 fewer requests, and 269 to 293 KB less in a bundled
  build, and is usable about 40 ms sooner from the published site. Start-up,
  the front door and the document pages are unchanged. A family that is on its
  way or could not be fetched says so in the instrument panel, including when
  it is the lesson's first screen, and a lesson whose files are cached still
  draws its instruments offline. The service worker still
  precaches every family on a first visit, so the total a first visit downloads
  is not smaller for this (LAZY_CAPABILITIES.md).
- **Charts load 32 KB less.** The vendored Chart.js registers only the line and
  scatter charts, axes and plugins Gravitas draws with, instead of the whole
  library.
- **The simulation canvas draws at the display's pixel density.** It had never
  consulted `devicePixelRatio`, so on HiDPI laptops and projectors the
  most-viewed surface rendered at about half linear resolution while smaller
  panels were sharp. The backing store now follows the display, under a pixel
  budget per quality tier so that a large HiDPI window cannot multiply its fill
  cost without limit. The low tier, which is chosen because a machine is already
  struggling, takes none of the extra pixels and renders exactly as before, and
  so does any display at a ratio of 1. `npm run perf -- --dpr 2` emulates a
  HiDPI display for measuring it.
- **Adding a language can no longer break offline install for every reader.**
  Translated lesson bodies are kept out of the offline precache by the shape of
  their directory rather than by a pattern naming Spanish, and the build refuses
  a locale directory that is not registered or a registered locale that has
  none. Before, a third language's lessons would have been precached as core
  files, and one of them failing to download would have stopped the new service
  worker installing for everyone. `npm run i18n:check`, which checks the message
  catalogs against the source that asks for them, now passes and runs in CI.
- **The deferred-download ceiling is raised; the initial-download ceiling is
  not.** The new investigations, the spectra, precise placement and the data
  tables are all loaded on demand, and the deferred ceiling in
  `tools/bundle-budget.mjs` rises from 3880 KB to 4080 KB, with every raise
  itemized in its `reason`. What a first visit downloads is still held to
  830 KB. The lesson-manifest size test is now a bound per entry rather than a
  flat total, which no further lesson could have fitted under.
- **Only a release asks whether the instructor bundle is current.** Every
  branch and fork runs `npm run instructors:validate`, which renders every
  document and re-checks every answer key against the grading function under a
  throwaway key and writes nothing, and `npm run instructors:audit`, which
  confirms the freshness digest covers every module the build actually loads.
  `npm run instructors:check`, which asks whether the committed ciphertext was
  built from these sources, runs on pushes to `main` and pull requests into it,
  so a branch that edits lesson content no longer goes red elsewhere until the
  passphrase holder rebuilds; `tools/verify-release.mjs` now asks it again, with
  no condition, on the tree about to be published. `npm run instructors:restamp`
  re-states the record without the passphrase when the covered files changed
  but the documents did not, and refuses when they did.
- **CI measures what it used to report as unmeasured.** The documentation check
  compares the documented test counts with the suites the `checks` job has just
  run (`npm run docs:check:tests`) and the build facts with the build it has
  just made (`npm run docs:check:build`); before, it passed while listing those
  counts as not measured. The physics suite writes one report that both the
  table and the documentation check read, instead of running twice. The
  browser-suite skip policy, `npm run test:policy`, runs on every push and pull
  request and tells a skip conditioned on the build target from one conditioned
  on what the page happened to render, and the registry drift test now also
  fails when a check marked gate-only is in fact run by CI.
- **The accessibility and sonification claims are checked against the
  production build.** The keyboard-placement, data-table and printed-voices
  tests now work only through what a reader can see and press, and run against
  `dist/` as well as the sources. The tests that compare against internal
  state, such as exact typed coordinates, the plotted arrays and the live voice
  list, stay on the sources, and their headers say why.
- **A lesson no longer downloads instruments it does not use.** Every lesson
  loaded all sixteen instrument families before its first screen. The transit,
  power-law and both gravitational-wave families are now fetched when a step
  reaches them, which takes 242 KB and fourteen requests off every lesson's
  first screen as the site is published, and 85 KB and two requests in the
  build. While a family is on its way the tool panel says so to a screen
  reader; if it cannot be fetched the panel says that too and offers **Try
  again**, or **Reload the page** when a retry cannot work, and the reader's
  answers are kept. Offline, a lesson opened once still draws them. Start-up
  requests do not change in either configuration. `npm run budget:routes`
  measures what a fresh visitor downloads for nine routes, sources and build,
  against ceilings every lesson route's old download exceeds. Thirteen families
  are still loaded with every lesson; `LAZY_CAPABILITIES.md` lists them and the
  order they move in.

- **The pull-request check takes about twelve minutes, not twenty-five to
  thirty.** The source browser suite ran as six shards of equal test count, and
  because the heavy spec files sort first, the first shard took 24 to 29
  minutes while the last took 15; every run waited for the first. It now runs as
  twelve shards of equal duration, planned by `tools/e2e-shards.mjs` from
  Playwright's own listing and each test's median CI duration in
  `tools/e2e-timings.json`. Every test still runs, at the same two workers per
  runner, with the same retries and timeouts; a new required job fails the
  check unless the merged results contain every listed test exactly once. The
  first run on the change finished in 12.1 minutes. Running twelve shards
  means two overlapping runs can briefly wait for runners.

### Fixed

- **The validation report** had three serious accessibility defects, found
  when axe was extended to it.
  - Each of the margin chart's 280 or so dots was a focusable
    `role="button"` that did nothing, inside a chart that is one labeled
    image. The dots are drawn now, with the check's name on hover, and the
    table's "Used" column says its percentage in text as well as in a bar.
  - The Published, Approximation and Empirical hues were too light for the
    Daylight theme (pink was 2.4:1). They are darker there.
- **axe now covers the figure builder, the evaluation kit and the validation
  report**, in both languages and both themes. They were the three pages it
  did not reach.

- **A physics Worker that died stopped gravity, silently.** Its busy flag
  stayed set, so no job was scheduled again, and every body kept the last
  pull the Worker had computed. An error, an unreadable answer or ten seconds
  without one now ends the Worker; gravity is summed on the main thread, and
  the status region says so. The chart Worker falls back to drawing directly,
  and a 3-D lab Worker that sends nothing for thirty seconds, or an
  unreadable answer, is ended with a reason. An uncaught error or unhandled
  rejection is also said in the status region; nothing is swallowed, and the
  browser reports it as before. Commented-out code in `js/preview.js` and
  `js/physics.js` was removed to keep the front door within its budget.

- **The way back to the instructor was hard to find, and half-read.**
  - `/instructors/submissions/` is linked from the instructor portal's public
    section and from the adopters guide. The guide also no longer says three
    things that stopped being true: that there is no instructor-side
    gradebook (there is still none, but the review page reads the reports
    back), that a student who changes machines starts again (a progress file
    carries the work), and that units typed with a number are ignored (they
    are read, converted or refused).
  - The assignment builder takes an optional class or roster code, which it
    adds to the link as `?roster=` - where the submission token has always
    read it - and to the printed instructions.
  - The review page shows each submission's written answers beside the
    rubric their step has, in a disclosure. They were read, counted as
    unmarkable, and never shown.
  - The exports count points: what each question is worth (one, or what the
    step declares) and what it earned, with the totals in the summary and
    the written answers' points reported as unmarked rather than as zero.
    `gravitas.submission-results` is version 2; `readResults()` reads a
    version 1 file, with the points it never had as null. The screen grades
    as it did.
- **Lesson cards can say what a lesson teaches.** A card's objectives open
  under it, fetched with the lesson only when asked for. Every lesson now
  declares its audience, the mathematics it asks for and the lessons it
  builds on, generated into `js/data/investigations/discovery.js` for the
  course-planning views (the lesson browser does not show them yet).

- **What a Spanish student handed in was partly English, and partly wrong.**
  - A measurement typed the Spanish way ("1,52") was NaN to the step's own
    check, so derived columns stayed blank and nothing was checked. Fields
    now record the convention they were typed in, as a checked number does.
  - The finish dialog, the model-answer controls, "worked out for you", the
    wedge readout and every heading and result in the lab report were
    literal English. They are translated, and the report is written in the
    language the student worked in.
- **The submission token could only be handed in as a PDF.** The finish
  dialog now shows it in a read-only field with Copy and a .txt download,
  for a learning management system that takes a text box, and offers a
  progress file beside the report.
- **A choice was final on the first click.** A graded choice now has Change
  answer, as a number can be re-checked: the first answer and the count of
  tries are kept, and the report says how many tries it took. A prediction
  can be changed only until the step that shows its verdict.
- **A re-issued assignment link lost the work done on it.** Progress was
  kept under the assignment's id, which starts with the day it was made, so
  the same worksheet handed out again on another day opened empty. It is
  now kept under the lesson, the steps and the title; work under the old
  key moves across the first time it is read. A new title is a new activity
  and starts afresh, on purpose.

- **An assignment link made on `v2` could not be opened by the deployed
  build.** Every link was written as version 2, which the site `main` serves
  refuses as "made by a newer version", and a browser still running its
  cached copy after an upgrade refuses it too. A link is version 2 only when
  it carries a package pin, the one thing version 2 added; every other link
  is version 1 again. `tests/assignment.test.js` opens both kinds with the
  reader archived from the deployed commit.
- **The deploy published directories no page uses.** `spike/`, `tests/`,
  `e2e/` and `tools/` are dropped from the staged tree after it has been
  verified. The physics suite `/validation/` runs live moved from `tools/` to
  `js/validation/` first, and `tests/spikeNotShipped.test.js` checks that no
  page, and nothing the service worker lists, points into a dropped
  directory. The spike stays in the repository and its archives.

- **The numeric test suites ran 8 to 25 times slower under Jest than in
  Node, and timed out on a loaded machine.**
  - **What it did:** Jest runs every module in a `vm` context, where each
    read of a free global such as `Math` or `Float64Array` goes through the
    context's global lookup instead of a cached property. The transit model,
    the fitter, the period and box searches and the curve comparison read
    `Math` millions of times a run. `tests/inference.test.js` took 299 s, one
    profile test 101 s of it, and the searches in `tests/measure.test.js` and
    `tests/stellarTools.test.js`, which yield to the page and so can time
    out, were the ones that did.
  - **What it does now:** the seven modules that measured a difference
    (`js/inference/transit.js`, `fit.js`, `infer.js` and `rv.js`,
    `js/measure/periodogram.js` and `curveCompare.js`, and
    `js/analysis/stats.js`) bind the globals they use once, at module scope:
    `const { Math, Number, Float64Array } = globalThis;`. They are the same
    objects, so every result is bit-identical. The eight numeric suites take
    20 s of CPU instead of 325 s, `inference.test.js` 12 s instead of 299 s,
    which is plain Node's speed. At a load average of 64 to 127, the
    sinusoid pulls take 8 to 10 s of their 60 s (26 to 38 s before) and the
    TESS reference case 2 s of its 120 s (13 to 20 s before). The other
    numeric modules (`aperture.js`, `bandIndex.js`, `spectrumLine.js`,
    `pipeline.js`, `js/observatory/*` and the rest of `js/inference` and
    `js/analysis`) measured no difference and are unchanged.
  - **Tests:** unchanged, and so is what they assert, their explicit
    timeouts included. The outputs of all seven modules on seventeen
    workloads (fits, profiles, searches on the TESS light curve, the curve
    comparison, the resampling statistics) are byte-for-byte the same as
    before, 1.0 MB of them.
  - **Cost:** nothing. The minifier shortens the local name, so the built
    Observatory, experiments and inference-worker chunks are 724 bytes
    smaller; the app's deferred bundle is unchanged.
- **A pull request could go over a route budget with green CI.**
  - **What it did:** `npm run budget:routes` ran only in the local release
    gate. Its registry entry said no CI job had both the sources and a
    build, but `e2e-build` has had both since before the check existed.
    #97 took the published front door and sandbox 317 bytes over their
    ceilings, and only a later local gate run found it.
  - **What it does now:** `e2e-build` runs the check before its specs,
    against its checkout and the `dist/` artifact, with a five-minute step
    timeout. It takes about a minute, and that job finishes well before the
    slowest sources shard. `tools/route-budget.mjs` now waits for its static
    server to answer instead of sleeping 800 ms, which under load let the
    first route be refused.
  - **Cost:** no ceiling moved, and nothing in the application changed.
- **A remediation step could tell a student whether a held prediction was
  right** before the experiment did (COMPOSER.md).
  - **What it did:** a pack could put a remediation step (`when`) on a held
    prediction (`reveal`) before the step where the prediction is marked.
    The lesson panel held the verdict on screen, but Next showed that step
    to students who predicted one way and passed over it for the rest. Where Next went was the verdict, so the answer key, not
    the experiment, settled the prediction.
  - **What it does now:** the composer refuses such a step as `whenHeld`, on
    its "Shown to" field, in English and Spanish, and that list no longer
    offers a prediction before it is marked. `js/authoring/rules.js` refuses
    the same thing as `interaction/when` in any lesson. The engine also
    treats a held prediction as unanswered until its reveal step is reached,
    as the panel already did. So a preview staged by an older composer passes
    over the step for every student, and shows it on the way back once the
    prediction is marked.
  - **Tests:** `tests/investigationPack.test.js` refuses remediation before
    the reveal, answered either way or with the reveal moved past it, and
    accepts it after. `tests/composer.test.js` does the same through the
    lesson checker and the whole verdict. `e2e/composer.spec.js` checks the
    list and the refusal on the page. It also stages the old shape in the
    preview and presses Next after a right and after a wrong prediction:
    both land on the same step.
  - **Cost:** deferred JavaScript is 178 bytes larger, inside its 4180 KB.
    No route or request ceiling moved.
- **A saved answer with a double quote in it broke out of its box.**
  - **What it did:** the lesson panel wrote a saved numeric answer and a
    saved measure field back into `value="…"` with `escape()`, which is
    `escapeHtml()` from `js/lessonMarkup.js`. That is for element text and
    leaves `"` alone. A student who typed a quote got back only what came
    before it, and the rest was read as more attributes of the box. Saved
    answers are also restored from progress backups, which accept any string,
    so an edited backup could put an `onfocus` on the lesson page and run it.
  - **What it does now:** both use `attr()`, which `js/investigations.js`
    already had for its other attributes. Nothing else in `js/` writes typed
    or imported text into an attribute that way: the other panels' own
    escapers already escape the quote.
  - **Tests:** `e2e/answerEntry.spec.js` types a breakout string into the
    numeric box of Kepler's Laws, and restores one from a crafted backup into
    a measure field. Each step is reopened from storage in a fresh page, and
    must hold the whole string, with no attribute added and nothing run when
    it is focused.
- **Fifteen expected observations reached no document.**
  - **What it did:** the answer key leaves out a step that only asks students
    to read or watch, and it left that step's expectation out with it. The
    authoring rule `instructor/expectations` accepts an expectation on any
    step, and its comment said the key printed one against every entry; for a
    reading step it did not, and the instructor guide prints no expectations,
    so 15 of the 238 were in neither. They were the balance point in Weighing
    the Stars, both horizon screens of Black Holes by the Numbers, five
    screens of Tides, three of What Is a Gravitational Wave?, and one each in
    The Goldilocks Question, Can You Detect This Planet?, Listening to
    Spacetime and A Universe of Stars.
  - **What it does now:** a reading step with an expectation is printed in
    the key like any other entry: its heading, "Reading", and the expected
    observation. A reading step without one is still left out, and the key's
    opening note says which. The expectations were kept rather than refused or
    moved, because each describes its own screen (the numbers on its readout,
    what to say aloud about it) and five of the steps beside them have one of
    their own. The rule's comment now says what the key does, and its summary
    no longer says an expectation must point at a step that grades.
  - **Tests:** `tests/instructorMaterials.test.js` finds every expectation's
    opening words under its own step's heading in its lesson's key, so one
    printed against the wrong step fails as well as a missing one. Before
    this change it failed the eight lessons above, and an expectation looked
    up one step off fails all 24. "Reading-only steps are left out of the
    key" now checks both halves on Black Holes by the Numbers, which has
    both kinds.
  - **Cost:** nothing in the browser; the keys are built in Node. The
    published keys change when the encrypted instructor bundle is next
    rebuilt, which needs the passphrase.
- **A screen reader heard a repeated announcement once, and then never.**
  - **What it did:** `announce()` in `js/notify.js` returned early when a
    message was the one it had last written to `#srStatus`, and nothing
    reset that. The lesson panel announces nothing between steps, so a
    student who answered two graded choices right in a row heard "Correct."
    for the first and silence for the second (Black Holes by the Numbers,
    "What did doubling do?" then "Read the graph"). With held predictions
    announcing their note, the two in a row in Lagrange Points that name the
    same reveal step would have said it once. A toast repeated for a second
    click was silent too.
  - **What it does now:** a repeat is announced again. Writing the words the
    region already holds is not a change a screen reader reads, so a repeat
    gains or drops a trailing no-break space, which is not heard. The dedupe
    had one real use, and it stays there: every world build announces
    "Scenario loaded", and a parameter sweep builds the same world once per
    trial, and a lesson stage whose scene was replaced rebuilds it from a
    timer. That caller passes `again` false and says a scenario once until
    something else is said. No other caller of `announce()` or `toast()`
    fires on a timer or per frame.
  - **Tests:** `tests/notify.test.js` announces a message, waits a frame and
    announces it again, and checks the region changed each time and reads
    the same words; `again` false says a repeat once. In
    `e2e/investigations.spec.js`, a student resumed at "What did doubling
    do?" answers it and the next step right, and a MutationObserver on
    `#srStatus` must see "Correct." twice. `e2e/accessibilityManual.spec.js`
    builds Solar System five times and allows one "Scenario loaded" at most.
    The first two fail on v2, and the last fails without the caller's
    `again` false.
  - **Cost:** 29 bytes of start-up JavaScript and none deferred, and no
    request. `js/notify.js` loads on every route, so in the sources, where
    comments count, it is 321 bytes on the front door, the sandbox, every
    lesson and the figure page. The front door and the sandbox have 109
    bytes of their sources ceiling left. No ceiling moved.
- **A screen reader was told how a held prediction did before the
  experiment.**
  - **What it did:** a prediction that names `reveal` shows no verdict and no
    explanation until the student reaches that step, only the note that the
    answer is recorded. The choice handler graded it anyway and announced the
    result in `#srStatus`: "Correct." for a right answer, and "Recorded."
    followed by the whole `because` for a wrong one. A screen-reader user
    heard the answer key at the moment of commitment, in every lesson, while
    a sighted student was told nothing.
  - **What it does now:** a held prediction announces the note under its
    options, read from the page, so it names the step that will settle it in
    the same words, English or Spanish. A graded choice, and a prediction
    whose reveal step has already been reached, still announce the verdict
    at once.
  - **Tests:** `e2e/predictionLoops.spec.js` now checks the announcement in
    each of its sixteen loops, which commit a wrong answer: it must equal the
    note and contain no sentence of the explanation. A new test commits a
    right answer and checks "Correct." is not announced. Two more check that
    a graded choice still announces "Correct." or "Recorded." with its
    explanation. The held tests fail on v2.
  - **Cost:** 46 bytes of deferred JavaScript, which is on every lesson
    route, and no request.
- **An instructor guide printed lesson markup as text.**
  - **What it did:** `js/instructorDocs.js` put the prose in
    `js/data/instructorContent.js` on the page as written, and Listening to
    Spacetime's guide said `the black holes' <em>motion</em>` and
    `<em>inspiral</em>` in two of its misconceptions. Its expected observation
    for step 2 has the same tags, but the answer key leaves out reading steps,
    so it never printed. Lesson titles, durations and levels, and each PDF's
    `/Title`, were not flattened either, though none holds markup today. The
    same prose is written in template literals, so its lines also broke
    wherever the source line wrapped, and 70 of its 86 paragraph breaks
    printed as two blank lines rather than one.
  - **What it does now:** each document converts a lesson's instructor
    content whole, so a field added later is covered too. Every string goes
    through `plainText()`, one paragraph at a time: tags come out, entities
    are decoded by the table in `js/lessonMarkup.js`, a wrapped source line
    folds into a space, and a blank line stays one paragraph break. The
    answer key's step titles, its lesson title, subtitle, duration and
    level, and the activity guides' prior knowledge go through
    `plainText()` too.
  - **The angstrom sign:** `&#8491;` decodes to U+212B, which WinAnsi has no
    code for, so `js/pdf.js` would have printed "?". It now prints Å
    (U+00C5), the letter it normalizes to. Only step bodies in A Universe of
    Stars use it, and no PDF prints a step body, so no document had shown it
    yet.
  - **Tests:** `tests/instructorMaterials.test.js` now fails any inline tag
    (`<em>`, `<strong>`, `<sub>`, `<sup>`) as well as any entity, in the text
    and the `/Title` and `/Subject` of every lesson's guide and key, and in
    the adopter guide and curriculum map. A new test per lesson checks that
    the overview prints the paragraphs it was written in, and that no line
    is broken while it has room for the next word. `tests/pdf.test.js`
    checks the angstrom sign. On v2 these fail 21 times: the tags in one
    lesson, the source line breaks in 19 overviews, and the "?".
  - **Cost:** 32 bytes of deferred JavaScript, which is 14 in the lab
    report's chunk and 18 in the authoring chunk. On each lesson route that
    is 14 bytes in the build and 176 in the sources. No ceiling moved.
  - **Not yet in the published bundle:** the encrypted instructor materials
    still hold the old PDFs until they are rebuilt with the passphrase
    (`npm run build:instructors`).
- **Refresh Scenario emptied a world a link had brought its own bodies to.**
  A link with bodies and no scenario, such as a shared Blank Simulation
  world, now rebuilds those bodies, as it already did for a built system.
- **A Composer pack's step id could add attributes to the lesson panel.**
  - **What it did:** a step's `sid` only had to be 1 to 80 characters, with
    no colon and not only digits, in the pack format
    (`js/platform/investigation.js`) and in the lesson checker
    (`js/investigations/progressSchema.js`). The panel writes
    `<lesson>:<sid>` into attributes without escaping it, and since the
    Investigation Composer (#98) opens a pack from a file, a sid is text
    someone else may have written. A quote in one ended `data-field="…"` on a
    measure step's input, and the rest of the sid became attributes of it: a
    preview of such a pack gave the field an `autofocus` and an `onfocus`
    handler, and focusing it ran the handler on the lesson page.
  - **What it does now:** a sid is lowercase letters, digits and single
    hyphens, like every other public id in a pack, and still not only digits.
    Both copies of the rule say so, and so does the Composer's message on the
    field. Every sid in the built-in lessons, their Spanish and the capability
    packages already had that form. The lesson panel refuses to open a lesson
    with any other sid, which covers a preview an earlier Composer staged, and
    it escapes the step key with `attr()` in every attribute it is written
    into (the checklist, the written and numeric answers and their buttons,
    and the measure fields), and with `CSS.escape()` in the measure-field
    lookup.
  - **Tests:** `tests/investigationPack.test.js` and
    `tests/authoring.test.js` refuse a sid with a quote in a pack and in a
    lesson, and `tests/progressIdentity.test.js` holds both copies of the rule
    to one table. `e2e/composer.spec.js` opens a crafted pack file, which the
    Composer now marks and will not preview, and a crafted preview left in
    storage, which the panel now refuses, with no attribute added and nothing
    run.
- **Lesson prose showed its HTML entities as text** (STUDIO_ROUNDTRIP_GATE.md,
  bugs the audit found).
  - **What it did:** `prose()` escaped every `&` before it let its four tags
    back in, so an entity reached the screen as its name. Twelve Nights
    opened on "HD&nbsp;209458, from La&nbsp;Silla", and six lessons on the
    public site, and their Spanish, showed `&rsquo;`, `&deg;`, `&mdash;`,
    `&lt;` and `&amp;` the same way. It also reached the verdict on a held
    prediction ("You predicted: The star&rsquo;s gravity"), the screen-reader
    announcement after a choice, and the choice group's accessible name. The
    student lab report had its own `plain()`, which decoded nothing, so a
    student who chose such an option handed in a PDF that said so.
  - **What it does now:** `js/lessonMarkup.js` holds `prose()` and one entity
    table, read by the lesson panel, the lab report and the answer keys, so
    screen and paper cannot disagree. `prose()` decodes after it escapes and
    escapes what it decodes, so `&lt;` is only ever text. The table lists the
    15 names lessons use (it gained `&beta;`), as the characters HTML gives
    them: `&nbsp;` is a no-break space on screen, and the PDFs still fold it
    to a space. The choice group is now named by the prompt on screen
    (`aria-labelledby`), which also ends names cut short at a `"`. What a
    student wrote is printed as typed, because the completion code is
    computed over it.
  - **Tests:** `tests/lessonMarkup.test.js` renders through the real
    `prose()` into a DOM, checks each table entry against jsdom's HTML
    parser, fails any lesson, English or Spanish, that uses an unlisted
    entity, and prints a lab report for every lesson. The lesson walk
    (`e2e/authorWalk.spec.js`) now fails a step that shows an entity by name,
    and `e2e/investigations.spec.js` reads Twelve Nights and a held
    prediction in Chromium.
  - **Cost:** on each lesson route, 726 bytes and no request in the build,
    and 3,088 bytes and one request in the sources. The module shares the
    chunk `js/answerCheck.js` is in, and the lab report is handed the decoder
    as it is handed `checkAnswer`, so it stays there. #79 to #81 had used the
    lesson routes' room first, so their four ceilings in
    `tools/route-budgets.json` rise by exactly that, 0.8 KB and 3.1 KB. No
    request ceiling moved, and deferred JavaScript is 81 bytes larger, inside
    its 4180 KB.
- **A full link, or a saved state, measured drift against the wrong world.**
  The conservation baseline was taken over the world the restore then
  replaced.
- **A link made from a world with no scenario behind it opened differently
  in different tabs.** Such a world comes from Blank Simulation or the
  builder. The link rebuilt on top of whatever scenario the reader's tab had
  open; it now rebuilds from the defaults its settings were measured
  against.
- **A gas giant restored from a link had no mass in Jupiter masses and no
  giant type.** Share links now carry both, and carry `persistent`, so a
  wide system keeps its outer bodies when someone zooms in.
- **Blank Simulation left the energy history of the bodies it deleted.** It
  now clears the world with `clearWorld()`, not a hand-written copy of it.
- **A FITS header can no longer make the data-pack reader allocate or loop**
  (VO_ARCHIVE_GATE.md, finding 4).
  - **What it did:** `readFits()` in `tools/data-packs/fits.mjs` (and in the
    SDK) used header numbers before it checked them against the file. From a
    2,880-byte file, `NAXIS = 50000000` took 32 s and 421 MB, and
    `NAXIS = 2000000000` ran out of heap. A negative `PCOUNT` stepped the walk
    back onto the same header, and the reader never returned.
  - **What it does now:** it walks every header first. It refuses the file,
    naming the card and its value, when `NAXIS` is outside 0 to 999, an axis
    length or `PCOUNT` is not a whole number, `BITPIX` is not one of the six
    FITS defines, `TFIELDS` is outside 0 to 999, a `BINTABLE` does not have
    two axes, or the product of the axes passes the file's length. It also
    refuses a data unit that runs past the end, a header that goes 100 blocks
    without an `END`, and more units than `maxUnits` (16). Only then does it
    decode anything.
  - **Real files are unaffected.** The three TESS light curves in the pack
    cache read exactly as before, and every pack rebuilds byte for byte. The
    tests run on the real headers of the two light curves the packs use,
    kept in `tests/fixtures/fits/`.
  - This was harmless while the reader saw only pinned maintainer downloads.
    It had to be fixed before any browser reads FITS.
- **The Experiments bench's energy and angular momentum drift were not drifts.**
  Since the bench shipped in 1.0.0, both were the system's total energy and
  angular momentum times a hundred, labeled "%". On Binary Planet Lab that was
  −25001.44 "%" for a real drift of 0.00017%. `sampleFrame()` read the
  engine's `energy` and `angular` fields as fractions, and those fields are
  the totals. It now reads the percentages the engine computes, and a baseline
  too close to zero stays a gap rather than becoming a perfect 0. The
  reliability check no longer judges a drift as a conclusion, because halving
  the step is meant to move it. The old rows said "unchanged" only because
  both runs had recorded the same total. Saved experiments (schema 3) open
  with the old drift values removed, and say so. They cannot be converted,
  because the record does not hold the baseline they would be measured from,
  but the captured start is kept, so recording the runs again measures them.
  CSV files and manifests exported before this fix carry the wrong figures in
  their `energy_drift_pct` and `angular_drift_pct` columns and drift results.
- **A recorded drift is measured at the sample it sits in.** The bench read
  its drift from the engine's readout cache, which refreshes at most every
  100 ms, while it measured the total energy fresh in every sample. At 60 fps
  about five samples in six carried a drift from an earlier frame than their
  own energy. Measured in Chromium on a 60 fps clock, Binary Planet Lab
  repeated its energy drift on 199 of 240 samples, and Kepler's 2nd Law on 200
  of 240. Kepler's final drift was 0.01524% where the world at that instant
  gave 0.01504%. Recorded runs, sweeps and the reliability check now measure
  the totals once per sample and derive the drift from them, so each sample's
  drift is exactly its own total's. This adds no work, and a sweep or check
  that selects no conserved quantity no longer computes the O(N²) totals at
  all.
- **Links on the figure builder were the browser's default blue on a
  near-black page, 2.2:1 against the 4.5:1 required.** They now use the
  document pages' accent colour, and the page's own landmark is labelled
  apart from the one in its preview frame.

- **The play button speaks the reader's language.** Once the simulation had
  been paused or resumed, its label and tooltip were set to English literals,
  so a Spanish screen reader heard "Play simulation" over a Spanish interface.
- **A corrupt share link no longer leaves an uncaught error.** Decoding one
  failed correctly, but the decompressor's write was never awaited, and its
  rejection surfaced as an unhandled "invalid block type" beside the message.

- A CSV cell that starts like a spreadsheet formula was wrapped in quotes and
  treated as safe, but a spreadsheet strips the quotes and runs what is inside.
  Every export now prefixes such a cell with an apostrophe, so it opens as text,
  and looks for the formula behind leading spaces, control characters and
  full-width look-alikes; plain numbers are unchanged. The classroom evidence
  kit, which had its own writer with no protection at all, uses the shared one.
- At 900 px wide and below, a lesson with an instrument docked showed no
  question, no answer boxes and no Next button: the bottom sheet was capped in
  height with `overflow: hidden`, and the step body was the only part allowed to
  shrink. The whole sheet now scrolls, Back and Next stay pinned to its bottom
  edge, and each step opens at its heading. The two layout specs that should
  have caught it scrolled boxes no reader can scroll; they now scroll only what
  a finger or a wheel could, and name the box that clips a control. The
  phone-width lesson walk runs in Firefox and WebKit as well.
- The MOND fit in _The Missing Mass_ labeled its horizontal axis with its own
  translation id, `dmW.radiusKpc`, in both languages, because the string was in
  neither catalog.
- Keyboard placement began its aim off the center of the view at the low
  quality tier, because it used a CSS-pixel half-width as a canvas coordinate.
- The Pluto–Neptune 3:2 check on `/validation/` was labeled a published value
  while measuring periods the integrator produced. It is an integration check
  now, renamed to say what it measures, with its value and tolerance unchanged.
  A run that produced no conjunctions would have made the whole suite report
  that it could not run; that case now costs one failed row.
- `npm run instructors:check` could report a stale instructor bundle as current.
  Its digest named a fixed list of files and missed several the build reads,
  including the prose of every instructor guide, the activity teaching notes and
  the instructor schema, so rewriting any of them left the recorded digest
  unchanged. The covered set is now derived from the builder's import graph,
  and the manifest records each input's own hash, so a failure names the file.
- `npm run author:new` appended the new lesson's import to the end of the
  previous line of `js/data/investigations.js`, so a freshly scaffolded lesson
  failed `format:check` and `lint` in a file its author never opened.
- Four statements in the public documentation that the code contradicted.
  `paper.md` named velocity Verlet as the integrator where symplectic Euler is
  the default, and said the whole browser suite runs in Firefox and WebKit where
  only a tagged subset does; `PERFORMANCE_OPTIMIZATIONS_SUMMARY.md` said physics
  is handed to the Barnes–Hut worker when the body count justifies it, where
  only an opt-in setting turns it on; and `/model/` said seven stellar tracks
  above a list of eight. The track count is now generated, and
  `tests/truthSurface.test.js` holds the prose claims to the code.
- The published size of the message catalog counted two of its five
  fragments per language. `README.md` and the manual said the interface ships
  from a catalog of 3691 strings when it held 4017: the activities, teaching and
  placement strings split off for download size were invisible to the count,
  and two tests that sweep the catalogs had each missed a different file. Every
  reader of the catalog now finds its fragments by one rule, and a fragment
  added for one language only, an id defined in two fragments, or a translation
  filed in a different fragment from its original fails `npm run i18n:check`.
- The browser test of the signed-in instructor portal reused the first fixture
  a checkout ever built, so after a lesson was added it went on testing an
  inventory the sources no longer described. The fixture now carries a stamp of
  every input that decides what it says and is rebuilt when any of them moves;
  the real instructor bundle and its release check are unchanged.
- Counts the documentation had stopped keeping true. `README.md` and
  `LICENSES.md` said "the 22 investigations" over a catalog of 24, and the
  summary of `paper.md` said 22 investigations, 636 steps and 243 physics
  checks. The license lines now cover every investigation without a count; the
  paper's counts are generated and held to the source by `npm run docs:check`;
  and a test sweeps the documents that describe the current software for any
  investigation count that disagrees with the catalog.
- `EXOPLANET_OBSERVING.md` still warned that the Jupiter mass unit was wrong by
  a factor of 52.4 across the application. It had already been fixed, derived
  from the solar mass and checked on `/validation/`; the note now says so.
- The contributor instructions told a contributor to run `npm run build`, which
  needs the instructor passphrase and stops without it - including in the
  command for running the browser suite against the build, in `README.md` and
  `e2e/README.md`. They now name `npm run build:ci`, the same build with a
  throwaway key and the one CI runs. The README also said Firefox and WebKit
  run only on pushes to `main` and weekly; they run on every push to `main` and
  `v2`, weekly and on a manual run, and never on a pull request.
- `npm run archive:check` printed only the last few lines of a failing step, so
  the instructor bundle's list of stale inputs came out as its last three
  entries and read as the whole list. Every input that moved is now printed;
  the tail of any other failure is unchanged.
- The gravity-assist comparison could refuse to start, saying only
  "duration", if the world was paused in the moment after _Run_ was pressed.
  The runner first watches ten frames to see how fast the world really
  advances, and it averaged over all ten, so a world paused after one of them
  read as running at a tenth of its speed; the comparison was then sized ten
  times too long and refused for exceeding the sweep's limit. The rate is now
  taken over the frames that actually advanced, which is also what the
  runner's budget counts. The binary laboratories' sweeps share the
  measurement and were exposed the same way. The browser test that freezes the
  world under the comparison hit this intermittently, and then waited eight
  minutes for a report that could not come; a refused run now fails it at
  once, with the reason and the duration it was sized at.

## [1.0.0] - 2026-09-16

The first tagged release. Everything below was developed before v1.0.0 and is
listed here because this is the release that first carries it.

### Added

- **An instructor portal that explains itself.** `/instructors/` states what is
  behind the passphrase before asking for it, says plainly what client-side
  encryption on a static host can and cannot promise, and presents the
  <!--fact:instructorDocuments-->1222<!--/fact--> documents grouped by investigation
  with their kind and size. A wrong passphrase and a missing bundle now report
  as the different problems they are.
- **Dual licensing.** The code is MIT; the original educational material is
  CC BY 4.0 ([LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)); third-party
  material keeps its own terms ([NOTICE](NOTICE)). [LICENSES.md](LICENSES.md)
  says which covers which files.
- **A paper.** `paper.md` and `paper.bib`, for submission to JOSE.
- **A schema for instructor content.** `js/authoring/instructorSchema.js`
  declares what every field has to be, including the minimum length of a
  record's label and of its body separately, and the bundle will not build
  without it.
- **Community and security files.** `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `SUPPORT.md`, and `.nvmrc` pinning Node 20.

- **Controlled A/B activities in two more investigations.** _The Butterfly
  Effect in Space_ replaces nine manual bench steps with one action that
  captures the start, selects the bodies and metrics, records Run A, returns,
  applies the 1,500 km nudge and records Run B — both arms over the same
  simulated interval, with the perturbation named as the only difference. Its
  numerical controls now halve the step the engine was **measured** taking
  rather than the playback speed, which in this laboratory changed nothing at
  all, and a repeat that did not change the arithmetic is refused as evidence.
  _Where Can It Get To?_ gains a short controlled pair: one tracer, one place,
  one rotating-frame speed, two directions — so the Jacobi constant and the
  whole accessible region are identical by construction and the trajectory is
  the only thing that can differ. One direction crosses the L1 neck a tenth of
  a period in; the other never comes near it in two binary periods, and the
  panel says that "did not cross during this run" is not "can never cross".
  Both activities keep the student's prediction whether or not it was right,
  refuse to overwrite an experiment somebody else recorded, and restore the
  world and every setting after a cancellation.
- **Parameter sweeps in two investigations, replacing what was repetitive
  rather than what was instructive.** In _Planets in Binary Stars_, five
  starting radii over the same twenty-period window, each watched by the
  binary watcher and reported as a physical outcome - still there, ejected,
  hit a star, window not finished - with periods done against periods asked
  on every row, and one trial re-runnable at half the step. In _Where Does a
  Gravity Assist Get Its Speed?_, both sides of the planet run as one retained
  A/B comparison so the two results sit on screen together, and an optional
  five-value sweep of the impact parameter on the gaining side. Both are built
  on the A/B bench: the world is captured before the first trial and restored
  after the last, cancellation keeps what it measured, and each trial is read
  by the same recorder that reads a hand-flown pass, so a mean speed is never
  offered as evidence about an encounter. In each lesson the hand-run examples
  stay and come first, the prediction is a prerequisite of the run, the plots
  are points with no curve through them, and results go into the notebook with
  the seed and the settings they actually ran at.
- **A new investigation, "Can You Detect This Planet?"** A 15-to-20-minute
  lesson about observational design rather than about physics: students plan two
  radial-velocity runs of the same star, with the same instrument and the same
  twelve measurements, and find that one detects a hot Jupiter unambiguously
  while the other - eleven times the baseline, not one measurement fewer -
  cannot say anything, because its cadence matches the orbital period. It closes
  on what a marginal result licenses and on the limits of a nondetection.
- **A synthetic observing mode in the radial-velocity panel.** Opt-in. Given a
  cadence in simulated days, a baseline and a Gaussian uncertainty in m/s, it
  keeps only the measurements that schedule would have produced and records
  nothing between them. The noise comes from a generator of its own, seeded by
  name, so a run is reproducible without touching the world's own random stream
  or its dynamics; measurements are scheduled on the simulation clock, so they
  do not depend on the frame rate. The continuous curve stays available behind
  them as a labeled teaching overlay. Runs export through **Export data ->
  Radial velocity measurements**: one row per measurement, carrying the
  uncertainty, the target and the observing configuration.
- **Offline support.** A service worker precaches the application shell, the
  <!--fact:scenarios-->61<!--/fact--> scenario thumbnails and all
  <!--fact:investigations-->124<!--/fact--> English lessons, so a class keeps
  working when the room's wifi drops. The cache name is a content hash, so a
  build invalidates it. See [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md).
- **A measured low-end quality tier.** Chosen from the frame rate the machine
  is actually achieving rather than from a user-agent string: reduced body
  counts, a capped resolution and the expensive full-screen effects switched
  off.
- **An investigation authoring toolchain.** `npm run author:check` validates
  every lesson and every one of the
  <!--fact:investigationSteps-->1521<!--/fact--> steps; `npm run author:new`
  <!--fact:investigationSteps-->1521<!--/fact--> steps; `npm run author:new`
  scaffolds a lesson with its translation shadow and instructor stub;
  `?author=<lesson>&step=<n>` opens any step with diagnostics without touching
  a student's saved progress; and a browser walker exercises every step of
  every lesson.
- **An architecture check.** `npm run check:architecture` fails on an import
  cycle or on a low-level module importing a coordinator.
- **A bundle budget.** `npm run budget` holds the initial download to a written
  ceiling; raising it means saying why in the same commit.
- **Accessibility checks in CI.** axe-core over <!--fact:axeSurfaces-->50<!--/fact--> surfaces in both
  languages and both themes, plus keyboard, focus-trap, reflow and reduced-motion tests.
  See [ACCESSIBILITY.md](ACCESSIBILITY.md).

### Changed

- **The instructor guides carry teaching content**, not a restatement of the
  lesson a student already has.
- **`css/page.css` is no longer part of `app.css`.** Four documentation pages
  load it and the sandbox never does, so it was download the first visit did
  not need: the initial download falls from 832.3 KB to 811.0 KB.

- **The build is self-contained.** three.js, Chart.js and the three font
  families were fetched from jsdelivr and Google Fonts at runtime; they are now
  pinned, bundled into `vendor/` and served from this origin. The application
  makes no third-party network request during normal use.
- **The module graph.** Shared state moved out of `js/ui.js` into
  `js/appState.js`, removing eleven import cycles.
- **Contrast, landmarks and focus management** across the interface, to meet
  WCAG 2.2 AA.

### Fixed

- Five instructor guides shipped with a table that rendered blank, because the
  renderer was handed rows it could not lay out and said nothing rather than
  refusing. One shipped with 590 bullets from a list built at the wrong level
  of nesting.
- Five investigations ended on a step that dropped its instrument, leaving a
  wall of text as the last thing a student saw. They close on the instrument
  they were built around, in both languages.
- A family of spelling corruptions from an old find-and-replace - `realiztic`,
  `characteriztic`, `optimiztic`, `centerd` - across the interface strings, the
  scenario descriptions and the code comments. Two translation keys were
  corrupted with them and are renamed at every use.
- `npm run author:check` warned about every staged value that did not land on a
  slider tick. It now accepts an off-grid value when a preset of the same
  widget sets that control to exactly it, which is what a student presses to
  get back.

- A widget in the radial-velocity lesson that had never drawn: its `draw`
  shadowed the imported translation function with the color palette, so the
  first row threw and the canvas stayed blank.
- Three computed fields in Why Mars Goes Backwards that could only ever be
  empty, because they read a value measured on an earlier step.
- Escape did not dismiss a dialog when focus was in a text field, which made
  the share dialog and the scenario gallery keyboard traps in practice.
- Three modal dialogs declared `aria-modal="true"` without trapping focus.
- Stale counts across the documentation: `/model/` claimed 135 physics checks
  against a suite of <!--fact:physicsChecks-->439<!--/fact-->, and 48 scenarios
  against a catalog of <!--fact:scenarios-->61<!--/fact-->.

### Removed

- The runtime import map and the injected Chart.js script tag.
- `aria-hidden="true"` from the 3-D viewport, which had been hiding two
  focusable buttons from assistive technology.

[Unreleased]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/releases/tag/v1.0.0
