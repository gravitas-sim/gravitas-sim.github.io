# The compute page

Roadmap II Prompt 101. `/compute/` runs one of a few reviewed Python notebooks on a document Gravitas writes (an observation, an orbital system, an experiment result), in the reader's browser, and records the run as a compute capsule. It is **opt-in and online only**, and it is a separate route with its own budget: it is not in the offline precache, not in any other route's download, and not in the menu.

It is the advanced-teaching slice that the notebook-bridge gate accepted (D-NB-01, D-NB-02; [NOTEBOOK_BRIDGE_GATE.md](NOTEBOOK_BRIDGE_GATE.md)). General users get nothing Python-shaped (D-NB-03), and JupyterLite and same-origin notebooks are not offered to anyone (D-NB-04). The frame's origin is Carl's decision, D-COMPUTE-ORIGIN-01.

## What a reader sees

1. The page says it is online and opt-in, and loads nothing else.
2. The reader picks a notebook and an input: the example Gravitas vendors for it, or a file of their own (a `gravitas.observation/1`, checked as one).
3. "Start the runtime (about 8.9 MB)" or "(about 18.9 MB)": the cold download is stated first, from the catalogue's packages. Pressing it checks the frame, frames it and loads the runtime.
4. "Run the notebook" returns the numbers (with units, uncertainties and what kind of number each is), the table, a plot if there is one with its caption and its data as text, and the capsule.
5. The capsule can be downloaded, kept in My work as evidence the report can cite, or taken to a local Jupyter as one notebook.

Opening a capsule file needs no runtime and runs nothing: it is checked, then shown.

## Isolation

| Layer | What it does |
|---|---|
| Separate origin | The frame is the document at `https://gravitas-compute.github.io/`, built in this repository (`compute-frame/`) and published verbatim to the `gravitas-compute` organization. The page's policy admits that origin as a frame and as a fetch target, and nothing else; it starts no Worker. |
| Pinned bytes | Before framing, the page fetches the frame's document and hashes it against `js/compute/framePin.js`. The frame reports its build id in its first message and the page refuses a different one. |
| Opaque origin | `<iframe sandbox="allow-scripts">`, never `allow-same-origin`: the frame has no storage or cookies and no reach into the page, whatever origin serves it. `allow=""`, no referrer, hidden. |
| A Worker inside | Pyodide runs in a Worker made by the frame. A loop that never ends blocks the Worker, not the frame or the page (opaque-origin frames share the page's event loop; the gate measured this in three engines). Cancelling or a timeout removes the frame, which ends the Worker. |
| The frame's own policy | `default-src 'none'`; the one inline script by hash, the runtime CDN and `'wasm-unsafe-eval'`; `connect-src` the runtime CDN; `worker-src blob:`. No `'unsafe-eval'`, no inline permission. |
| Typed messages | `gravitas-compute/1` ([schema](sdk/schemas/compute-messages-1.schema.json)): hello, load, run, cancel from the page; ready, loaded, progress, result, error from the frame. Every string has a bound; another key, a wrong type or a wrong side is refused, by both ends, through the same reader. |
| Answers checked | `js/compute/check.js` checks the whole answer before anything is drawn: the exact keys the catalogue entry declares, the envelope as `gravitas.artifact/1` with exactly the declared quantities in the declared units, the table as `gravitas.observation/1`, the figure as a PNG. Results are drawn as text and a `data:` image, never as markup. |
| Who the frame answers | Only a page of `https://gravitas-sim.online` or a loopback address (a developer's machine), and only one port, once. |

`e2e/computeOnline.spec.js` runs hostile cells in the real Worker: `js.parent`, `js.top`, `localStorage`, `sessionStorage`, cookies, `indexedDB`, a fetch of this site's own files and of another site are all refused; a `while True` loop leaves the page ticking and is ended by cancelling.

## What is and is not pinned

- **Pinned:** the frame's document by SHA-256 (page, then build id); the runtime release by its versioned URL; the release's lock file by SHA-256 (checked by the frame's script, because a Worker made from a blob in an opaque frame is not a secure context and has no WebCrypto); every wheel by the lock, checked as it loads (`checkIntegrity`); the notebook's cells and file and the example input by SHA-256 (`js/compute/catalogueHashes.js`).
- **Not pinned:** the runtime core (`pyodide.asm.wasm`, the standard library) is trusted by URL alone, since a script a Worker imports cannot be checked. If the CDN stops serving the release, a notebook cannot run (a capsule can still be opened and checked). Self-hosting the runtime on the compute origin would close both; it is a decision for Carl (the repository would hold about 19 MB).

## The catalogue

`js/compute/catalogueData.js` (what each notebook reads and returns, and its words in both languages) and `js/compute/catalogueHashes.js` (generated). The page refuses a notebook whose cells do not hash to the catalogue's; there is no upload of a notebook. Each entry names its single input (a public schema and kind), its few bounded settings, the packages it needs (and so its download), and exactly what it returns.

| Notebook | Reads | Needs | Cold download | Returns | Expected on the pinned runtime |
|---|---|---|---|---|---|
| `transit-times` | `gravitas.observation/1`, time series (the TESS light curve of HD 209458) | numpy, matplotlib | about 18.9 MB | period, epoch, mean depth, transits found; the table of transits; a folded plot | period 3.5238 d (0.0007), depth 15,831 ppm, 8 transits |
| `line-centroid` | `gravitas.observation/1`, spectrum (an SDSS A star) | numpy | about 8.9 MB | line centroid, width at half depth, equivalent width, depth, Doppler velocity, each with an uncertainty from seeded noisy copies; the continuum-divided window | centroid 6560.78 A, equivalent width 8.30 A, velocity -175 km/s |
| `integrators-compared` | `gravitas.orbital-system/1`, the Builder's file (its `initial` state; the example is the Kepler-16 template) | numpy, matplotlib | about 18.9 MB | the final energy drift in percent of explicit Euler, symplectic Euler, velocity Verlet and Runge-Kutta 4, and the steps; the drift curves; a log plot | +49.75, -0.002317, +0.001768 and -6.47e-8 percent in 10,722 steps |
| `population-at-scale` | `gravitas.experiment-result/1` (twenty Binary Planet Lab planets at seeded random distances) | numpy, matplotlib | about 18.9 MB | the half-way distance and its width, the bound fraction of the trials and of 200,000 synthetic planets, the count; ten bins; a plot | half-way 0.255 (0.024), 0.6 of the trials and 0.596 (0.076) of the synthetic planets bound |

The notebooks' own prose and comments are English. To add one: add the file under `compute/notebooks/`, an example input under `compute/inputs/` if it needs one, the entry in `catalogueData.js`, run `node tools/compute.mjs`, and state in the pull request what it reads and returns; the entry's expected values are what the online check holds the runtime to.

## The computational-astrophysics module (Prompt 102)

Two of the notebooks, `integrators-compared` and `population-at-scale`, are the course module that makes the page teach computation, each with a companion investigation in both languages (`integrators-in-practice`, `extending-an-experiment`) that sets the task, sends the reader to `/compute/`, and grades the numbers the capsule's declared quantities hold. A step that does so declares `compute: '<notebook id>'`; the scene audit calls it `external-computation`, and `docs/lesson-acceptance.json` names the notebook as the central experiment's object (`compute:<id>`) with the dedicated `@accepts` test in `e2e/centralExperiments.spec.js`. Both investigations are in the Library, in the gravity-and-orbits and planets sequences and in the computation unit of the `upper-level-modules` course.

What each notebook is held to:

- `integrators-compared` against Gravitas's engine. Its symplectic Euler, velocity Verlet and RK4 are the engine's three schemes, so `tests/computeCurriculum.test.js` runs the engine in a fresh process on the builder's own system at the notebook's step for its number of steps and requires the same drift to a part in a million (absolute values: symplectic -0.0023168, Verlet +0.0017676, RK4 -6.47e-8 percent). The notebook's step and run length are worked out again in the test from the file. Explicit Euler is the notebook's own addition, not in the application. At the application's own step (0.0278 time units, 438 steps per period) velocity Verlet and RK4 agree with the engine to 0.2 and 0.4 percent; symplectic Euler's end-of-run drift does not (-0.000165 against -0.002188), which the investigation teaches as phase: its drift oscillates.
- `population-at-scale` against its experiment: the bound fraction is counted again in the test from the trials, and the fitted edge is held between the last bound planet and the first of the unbroken run that left. The input is made by the engine's trial runner (`node tools/compute-examples.mjs`), with wall-clock fields zeroed and per-trial series left out.

Not done, and why. The roadmap's notebooks 2 to 4 (a SciPy refit of an inference/1 export, Lomb-Scargle and BLS with astropy, an emcee posterior) need packages the published frame does not admit: the frame is pinned to numpy and matplotlib (`PACKAGE_NAMES` in `js/compute/messages.js` and `RUNTIME` are bundled into it), and adding a name changes the frame's bytes, which would mean republishing the `gravitas-compute` frame. That is outward-facing and was not done; whether the pinned Pyodide lock carries those packages is unchecked. Decision D-COMPUTE-CURRICULUM-02.

`tools/compute-answers.mjs <id>` writes the answer fixtures from the vendored cells under the machine's CPython (and `--runs` the few other runs the investigations ask for); the pinned runtime itself is checked by `COMPUTE_ONLINE=1` `e2e/computeOnline.spec.js`, which now runs all four notebooks.

## The capsule

`gravitas.compute-capsule/1` ([schema](sdk/schemas/compute-capsule-1.schema.json), [FORMATS.md](FORMATS.md)): the notebook by id, version and the hash of its cells; each input by name, format, size and the SHA-256 of its exact text; the settings; the runtime (release, Python, lock hash, package versions) and the frame (origin, build); each output as the exact text the notebook returned with its SHA-256; timing; citations (the notebook's, the input's, the packages'). `digest` covers the notebook, inputs, settings, runtime and each output's hash, so two runs of the same computation share it; it leaves out the frame, timing, clock and citations.

- **My work.** "Keep in My work" writes a notebook entry (source `compute-capsule`) holding the run's envelope, whose source digest is the input's hash and whose engine is `pyodide-<release>/<notebook hash>`; the report cites it as it cites an experiment result.
- **Run it yourself.** One `.ipynb` for a local Jupyter: the input (base64), the reviewed cells as they ran, and a last cell that hashes the researcher's outputs against the capsule's and prints each quantity's relative difference. A different NumPy can differ in the last digits and the plot's bytes always differ; the cell says by how much.
- **Opening.** `verifyCapsule` checks every hash, the digest, the notebook against the catalogue and the answer again as a result; it says (without refusing) when another runtime release made it.

## Failures

Every one has words in both languages, a block with `role="alert"` and a way forward: offline, frame unreachable, frame not the pinned build, handshake timeout, runtime download failed, runtime release differs, notebook refused (hash), setting out of range, input refused, timeout, memory, notebook raised, answer off its declaration, cancelled. A timeout or cancel removes the frame; the runtime must be started again.

## Budgets and the precache

`/compute/` has its own route ceilings (`tools/route-budgets.json`); its modules are `js/compute/` and `js/computePage.js`, built as their own entry (`compute-*` chunks) and listed in `NEVER_PRECACHED` (`tools/build-service-worker.mjs`) with the notebooks and inputs, so none is precached. The frame is a published directory, not a page of this site's build.

## Generated files and publishing

`node tools/compute.mjs` writes `compute-frame/`, `js/compute/framePin.js` and `js/compute/catalogueHashes.js`; `--check` fails when any is stale (a Jest test and the generator graph run it). `node tools/compute.mjs --publish-plan` prints what would be published and the steps. Nothing in this repository pushes to, enables Pages on or otherwise changes the `gravitas-compute` repository.

## Checks

`tests/computeMessages`, `computeCatalogue`, `computeCapsule`, `computeSession`, `computeFrame`, `computeCurriculum` and `computeInvestigations` (Jest); `e2e/compute.spec.js` (no network, always) and `e2e/computeOnline.spec.js` (`COMPUTE_ONLINE=1`).

## Not done

Notebooks over `gravitas.inference/1` and `gravitas.analysis/1` (the two over an orbital system and an experiment result are Prompt 102's; the others wait on the frame's package list, see above); a phone measurement (T5 of the gate stays unmeasured); self-hosting the runtime; a link to the page from the menu.
