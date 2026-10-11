# The compute page

Roadmap II Prompt 101. `/compute/` runs one of a few reviewed Python notebooks on a Gravitas observation, in the reader's browser, and records the run as a compute capsule. It is **opt-in and online only**, and it is a separate route with its own budget: it is not in the offline precache, not in any other route's download, and not in the menu.

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

The notebooks' own prose and comments are English. To add one: add the file under `compute/notebooks/`, an example input under `compute/inputs/` if it needs one, the entry in `catalogueData.js`, run `node tools/compute.mjs`, and state in the pull request what it reads and returns; the entry's expected values are what the online check holds the runtime to.

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

`tests/computeMessages`, `computeCatalogue`, `computeCapsule`, `computeSession` and `computeFrame` (Jest); `e2e/compute.spec.js` (no network, always) and `e2e/computeOnline.spec.js` (`COMPUTE_ONLINE=1`).

## Not done

Notebooks over `gravitas.experiment-result/1`, `gravitas.inference/1` and `gravitas.analysis/1` (no authentic example of a result can be vendored without running the engine in a browser Worker; the catalogue format admits them, and Prompt 102 owns the curriculum); a phone measurement (T5 of the gate stays unmeasured); self-hosting the runtime; a link to the page from the menu.
