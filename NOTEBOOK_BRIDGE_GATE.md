# A browser notebook bridge and compute capsules: gate

**Status: decided under delegation, not reviewed.** Carl asked for the roadmap
to run in order while he was away, with each gate decided on its
recommendation. These verdicts are evidence, not a signed decision. Each one
names the evidence it rests on and the condition that would reverse it.

| Audience | Verdict |
|---|---|
| **Advanced teaching** | **B, staged.** A separate, opt-in, online-only compute page runs reviewed notebooks over Gravitas's public schemas. It uses a pinned Pyodide in a Worker inside an opaque-origin sandbox, and returns checked results with a compute capsule. It stays out of ordinary start-up and the offline precache. Not JupyterLite, and not in the application's origin |
| **Independent research** | **B, staged, and a different B.** Researchers get the compute capsule and an export of its inputs, notebook and hashes, to run in their own Jupyter. The in-browser runtime is not a research platform: it lacks packages research uses, holds 78 MB before any data, and depends on a CDN |
| **General users** | **C.** Nothing Python-shaped in ordinary Gravitas. They are served by the Observatory's own transforms, fits and guides, and, if wanted, a closed formula language for derived columns (1.1 KB gzipped) |

**Base:** `v2` at `45a6d14` (#90 merged, CI green).

**Prototype:** branch `spike/browser-notebook-bridge` at `550bf5d`, in
[`spike/notebook/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/550bf5d/spike/notebook)
and [`spike/expression/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/550bf5d/spike/expression).
It is disposable and will not merge. This PR is the decision record only.

---

## The question

Could a reader send a Gravitas observation, experiment or inference result
into a Python notebook, run a notebook on it, and bring back a derived table
and plot with its provenance? It must not make Python, WebAssembly packages or
notebook assets part of anybody's ordinary download. And it must treat
notebook code as untrusted: it must not reach local storage, submissions,
instructor materials or the application's internals.

There are four routes, and the notebook is not assumed to be the best:

| Route | Where the code runs | Cost | Offline | Who writes the code |
|---|---|---|---|---|
| **External:** export CSV or JSON, open `notebooks/gravitas_analysis.ipynb` in Colab or Jupyter | the reader's own Python | none in Gravitas | as their Python is | anyone |
| **Built-in:** the Observatory's transforms (crop, mask, convert, normalize, fold, bin, derive), the fit panel and the guides | Gravitas, reviewed code | already paid | yes, precached | Gravitas |
| **Built-in, extended:** a closed formula language for derived columns | Gravitas, reviewed code | 2.25 KB minified, 1.10 KB gzipped | yes | the reader writes a formula, not code |
| **Bridge:** Pyodide in a sandbox, fed and read by Gravitas | a sandboxed frame's Worker | 18.9 MB cold for numpy and matplotlib | not reliably (below) | the notebook's author |

## The prototype workflow

1. **Export.** `export-observation.mjs` writes the TESS light curve of HD
   209458 through the Observatory's own `observationJson()`. That is
   `gravitas.observation/1`: 1,882 rows of time (BTJD, TDB), flux and flux
   uncertainty, with the pack's credit, license, citations and reductions.
   It is 120,160 bytes.
2. **Frame.** The host page (`host.js`, the Gravitas side) validates the
   input with `validateObservation`. It opens `<iframe sandbox="allow-scripts">`
   with no `allow-same-origin`, so the frame's origin is `null`, and hands it
   a `MessagePort`. Every later message travels on that port.
3. **Run.** It sends one typed message:
   `{protocol: 'gravitas-notebook', v: 1, type: 'run', id, input, cells, packages}`.
   Limits: the input at most 2 MB, at most 40 cells of 20,000 characters, and
   packages from a closed list.
4. **Execute.** The frame starts a classic Worker from a blob. The Worker
   loads Pyodide 314.0.7 from its pinned CDN path with
   `loadPackage(…, {checkIntegrity: true})`, which checks each wheel's
   SHA-256 against the release's lock file, and runs the cells.
5. **The notebook.** `transit-times.ipynb` reads only the public schema:
   columns by role, their units, the masks. It:
   - finds 8 transits;
   - measures each one's mid-time and depth;
   - fits a period of 3.5238 ± 0.0007 d and a mean depth of 15,831 ppm;
   - returns a `gravitas.observation/1` table, the values, and a folded plot as
     a PNG.

   The period is 1.4σ from the value the pack is checked against (3.52474859
   d, Knutson et al. 2007): the notebook times each transit by the center of
   its run of low points, which is coarse at the pack's cadence. That is the
   notebook's science, not the bridge's.
6. **Check.** The host checks the result as it would a file a reader chose:
   - at most 4 MB;
   - only `table`, `values` and `figure`;
   - the table passes `validateObservation`;
   - the figure is a PNG by its signature, at most 1 MB.

   It shows the table as text and the PNG as a `data:` image, and never
   parses anything the notebook returned as markup.
7. **Record.** It writes the compute capsule (below).

## What the prototype measured

The runs are Playwright's Chromium, Firefox and WebKit on macOS, on a shared
machine with other sessions' test suites running. The load average was 12 to
20 when checked during these runs, and above 200 earlier the same afternoon.
Byte counts do not depend on load; times do, and are given as the spread seen.

### Cold download

| What | As served (compressed) | Raw |
|---|---|---|
| Pyodide core: `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide.js`, the lock | 5.98 MB | 12.29 MB |
| numpy 2.4.6 | 2.93 MB | 2.96 MB |
| matplotlib 3.10.8 and its 10 dependencies | 9.94 MB | 10.30 MB |
| **All 17 files** | **18.85 MB** | **25.55 MB** |

Playwright's browsers counted 19.1 MB in 17 requests from the CDN, in each
engine, for the same run. That is 23 times Gravitas's whole initial download
(820.2 KB) and 4.6 times everything the application defers (4,169.4 KB).
Without matplotlib (a notebook that returns a table and no plot), it is
about 8.9 MB.

For comparison, the JupyterLite demo's interface alone is 3.66 MB in 134
requests before any kernel is started. Its Pyodide kernel then fetches the
core above.

### Time to a checked result, and memory

| Engine | Runtime ready | Packages loaded | Cells run | Total |
|---|---|---|---|---|
| WebKit | 1.9–2.0 s | 2.8–2.9 s | 5.6–5.8 s | 5.7–6.1 s |
| Chromium | 2.5–5.8 s | 3.7–8.2 s | 7.4–16.7 s | 7.6–17.1 s |
| Firefox | 9.0–41 s | 12.3–64 s | 29–139 s | 30–140 s |

The phases are cumulative from the frame's first message.

- **Where the cells' time goes.** Most of it is importing matplotlib; the
  computation itself is fractions of a second.
- **Memory.** The WebAssembly heap was 78.5 MB in every engine, before the
  notebook's own arrays.
- **Mobile is unmeasured.** There is no device run. Chromium's CPU throttling
  (4×) did not slow the run (6.3 s). It throttles the page's thread, and the
  notebook runs in a Worker, so it is not a phone. What is known: 19 MB over a
  phone's connection and 78.5 MB of heap. A threshold not measured counts as
  not passed.

### Offline

The sandbox that makes the bridge safe also leaves it no storage: in the
frame, `localStorage`, `sessionStorage`, cookies, IndexedDB and the Cache API
are all refused (SecurityError), in all three engines. The runtime cannot be
installed for offline use there. What remains is each browser's HTTP cache:

| Engine | Second visit, online | Second visit, network off |
|---|---|---|
| Chromium | fetched 6.9 MB of the 19.1 again | **failed**: the CDN files were not served from the cache |
| Firefox | ran | **ran** |
| WebKit | ran | not testable: Playwright's WebKit refuses a navigation with the network off, as it does for the catalog's existing offline test |

Offline is therefore not something the bridge can promise. A service worker
cannot fix that for an opaque-origin frame. A separate real origin could hold
its own cache, and hosting one is the owner's decision (below).

### Content Security Policy

The frame's policy, written by `build-runner.mjs`:

```text
default-src 'none'; script-src 'sha256-…' https://cdn.jsdelivr.net 'wasm-unsafe-eval';
connect-src https://cdn.jsdelivr.net; worker-src blob:; base-uri 'none'; form-action 'none'
```

- **`'wasm-unsafe-eval'` is required.** Without it, every engine refuses to
  compile Pyodide, and the run ends at the host's timeout.
- **`'unsafe-eval'` is not required.** The run completes without it in all
  three engines.
- **`worker-src blob:`** is needed for the Worker.
- **A harmless refusal.** Firefox and WebKit each log one refused
  `data:text/javascript` script; Chromium logs none. The run completes
  regardless, and the source was not traced.
- **The host page's own policy** (`default-src 'self'; img-src 'self' data:`)
  needed nothing new.

## Isolation, tested

**What the frame itself can reach**, asked of the frame, identically in
Chromium, Firefox and WebKit:

- its origin is `null`;
- `localStorage`, `sessionStorage`, `document.cookie`, IndexedDB and `caches`
  are all refused;
- `parent.document` and `top.location.href` are refused.

**What a hostile notebook can do** (`hostile-reach.ipynb`):

| Attempt | Pyodide on the frame's thread (Chromium) | Pyodide in a Worker (all three engines) |
|---|---|---|
| `js.parent.document`, `js.top.localStorage`, `js.localStorage`, `js.document.cookie` | refused (SecurityError) | refused: the Worker has no `parent`, `top`, `localStorage` or `document` at all |
| `js.parent.postMessage("…", "*")` | **delivered** to the host window; the host ignores it, since it listens only on its port | impossible |
| fetch the app's own files, `instructors/materials.enc.json`, or another site | refused by `connect-src` | refused. In WebKit the refused fetch never settles, and the host's timeout ends the run |

**Answers the host must refuse** (`hostile-large.ipynb`,
`hostile-shape.ipynb`, in Chromium): a 5 MB answer is refused by the
runner's size limit, and the host checks the same limit again. An
answer with an unknown field is refused by name. An answer with no table was
at first refused by a crash in the host's check (`reading 'columns'`); it is
now refused by name, which is a reminder that the host's check is the security
boundary for what comes back.

**Availability** (`loop.mjs`, a notebook that runs forever, the host's timeout
at 15 s):

| Runner | Chromium | Firefox | WebKit |
|---|---|---|---|
| Pyodide on the frame's thread | the host page stops answering for the whole 45 s sampled; its timeout never fires | same | same |
| Pyodide in a Worker in the frame | the host stays responsive; at 15 s it removes the frame and says the notebook did not finish | same | same |

This is the finding the verdicts turn on. An opaque-origin frame protects
Gravitas's data, but not Gravitas's availability: it shares the page's event
loop in all three engines. The Worker is what protects availability.

- **Only a classic Worker works.** A module Worker cannot be started from a
  blob in an opaque-origin frame in Chromium (it can in WebKit), so the
  Worker loads Pyodide with `importScripts`.
- **Termination follows the HTML standard.** Removing the frame ends the
  Worker, because a dedicated Worker's owner document is gone. The spike
  observed the host recover; it did not measure the Worker's CPU afterwards.

**JupyterLite in the same sandbox** (`jl-sandbox.mjs`): it stops at "Loading
JupyterLite…", with "No available storage method found" from six of its
plugins. JupyterLite needs a real origin with storage and its own service
worker. So it cannot be isolated by an opaque sandbox, and it would have to
live on a separate origin, with an extension to receive Gravitas's data.

## The compute capsule

`gravitas.compute-capsule/1`, as the host writes it:

```json
{
  "format": "gravitas.compute-capsule", "formatVersion": 1,
  "inputs": [{ "name": "observation", "format": "gravitas.observation/1",
               "sha256": "fe818ee9…", "bytes": 120160 }],
  "code": { "kind": "ipynb", "name": "transit-times.ipynb", "cells": 4,
            "sha256": "b76b4173…" },
  "runtime": { "name": "pyodide", "version": "314.0.7", "python": "3.14.2",
               "packages": { "numpy": "2.4.6", "matplotlib": "3.10.8", "…": "…" },
               "lock": "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide-lock.json" },
  "outputs": [{ "name": "table", "format": "gravitas.observation/1", "sha256": "f806d1ce…" },
              { "name": "values", "sha256": "8c43e233…" },
              { "name": "figure", "format": "image/png", "sha256": "e1efdd76…" }],
  "citations": [{ "text": "TESS light curves from MAST (Ricker et al. 2015, JATIS 1, 014003)",
                  "url": "https://doi.org/10.17909/t9-nmc8-f686" },
                { "text": "Pyodide: Python compiled to WebAssembly", "url": "https://pyodide.org" }]
}
```

**Reproducibility.** The three output hashes were identical across two runs
and across Chromium, Firefox and WebKit, the PNG included. The notebook saves
it with `metadata={"Software": None}`, so no version or date is written into
the file.

The capsule pins:

- the input by its hash;
- the code by the hash of its cells in order;
- the runtime by the release and its lock file, whose per-wheel SHA-256
  `checkIntegrity` enforces.

A capsule is therefore enough to say whether a later run is the same
computation. It is not enough to re-run one if the CDN stops serving that
release (below).

## Package compatibility and pinning

The 314.0.7 lock pins 357 packages for Python 3.14.2 (ABI `2026_0`). Among
them:

- numpy 2.4.6 and scipy 1.18.0;
- matplotlib 3.10.8;
- pandas 3.0.2 and astropy 7.2.0;
- scikit-learn 1.8.0.

Not in it: emcee, lmfit, astroquery. `micropip` could install pure-Python
wheels from PyPI, but only by widening `connect-src` to PyPI's hosts, which
this spike did not do or test.

Pinning is by URL (`/pyodide/v314.0.7/full/`). The runtime depends on
jsDelivr serving that path: a notebook cannot run if it does not. Self-hosting
the 19 MB would need either repository storage, which is 23 times the
application's initial download and outside every budget, or a separate
origin. Both are owner decisions.

## Thresholds and results

The prompt fixed the requirements but no numbers. These thresholds are read
from its words, and were written after the measurements: they are the prompt's
requirements stated as tests, not tuned to the results.

| # | Threshold | Result |
|---|---|---|
| T1 | Notebook code cannot read Gravitas storage, submissions, instructor materials or internals | **pass**, in three engines |
| T2 | A notebook cannot make Gravitas unavailable | **pass with the Worker runner only**; fails on the frame's thread in all three engines |
| T3 | Nothing reaches ordinary start-up or the offline precache | **pass** by construction: a separate route, not built or precached |
| T4 | Works offline once visited | **fail**: no storage in an opaque origin; the HTTP cache serves Firefox and not Chromium |
| T5 | Viable on a phone | **unmeasured**, so not passed |
| T6 | The same inputs give the same outputs, recorded in a capsule | **pass**: identical bytes across runs and engines |
| T7 | Runs under a restrictive policy: no `'unsafe-eval'`, no unhashed script, network limited to the pinned runtime | **pass**, with `'wasm-unsafe-eval'` |
| T8 | Runs without a third-party service | **fail**: jsDelivr, unless self-hosted on a separate origin |

## The verdicts, and what would reverse them

Verdict rules, as the earlier gates have them: **A** proceeds, **B** stages
with the passing subset and names bounded tasks for the rest, **C** stops.

**Advanced teaching: B.**
- **Why:** T1, T2 (Worker), T3, T6 and T7 pass. T4 and T8 fail in a bounded
  way: the route can be declared online-only, and the CDN either accepted or
  replaced by a separate origin. T5 is not measured.
- **What it looks like:** a separate page, like the Observatory, that is not
  precached. It runs *provided*, reviewed notebooks over the public schemas.
  It shows the cold download before it starts, and writes a capsule with
  every result.
- **What would reverse it:**
  - a Worker proving unable to protect the page in a future engine;
  - Pyodide needing `'unsafe-eval'`;
  - a phone measurement that fails.

**Independent research: B, as the capsule and an export.**
- **Why:** a researcher needs their own environment. Pyodide lacks packages
  research uses, holds 78 MB before any data, and depends on a CDN.
- **What is accepted:**
  - the capsule format;
  - an export of a capsule's inputs (in the public schema), notebook and
    hashes, to run in the researcher's own Jupyter;
  - a check that their outputs match the capsule's hashes.

  The in-browser runtime is not offered to research.
- **What would reverse it:** a researcher named with a workflow that needs the
  in-browser runtime.

**General users: C.**
- **Why:** 19 MB, 78 MB of memory, not offline and not measured on a phone
  is the opposite of ordinary Gravitas. The built-in route already covers the
  workflow the bridge was proved on, and does it better. The Exoplanet guide
  `exo-find` finds HD 209458 b's transit with a box search, a period, an
  epoch and a fold. Its period is 3.52399 d, 1.09 minutes short of the
  reference (EXOPLANET_OBSERVATORY.md), against the notebook's 3.5238 d.
- **The lighter extension, if wanted:** a closed formula language for derived
  columns, 2.25 KB minified and 1.10 KB gzipped, evaluating 1,882 rows in
  3 ms (`spike/expression/`). It has no `eval`, no loops, no names outside
  its list, and missing values stay missing. It caught its own bug on the
  way: function names were looked up through the object prototype, so
  `constructor` and `__proto__` reached it and were refused only by
  accident; they are refused by name now.
- **What would reverse it:** a phone that runs the bridge offline in under a
  few seconds, which no measured engine does.

**Not recommended for anyone:** JupyterLite in the application, or any
notebook in the application's own origin. JupyterLite cannot run in an opaque
sandbox, and a same-origin notebook can read everything a student has.

## Proposed prompts, if these verdicts are accepted

Neither runs until the verdicts are reviewed.

**Production (compute page, advanced teaching B).**
- Build `/compute/` as its own page and bundle, not precached, with no link
  from start-up.
- The host is this spike's, hardened:
  - the port protocol;
  - the result check as a tested module;
  - a capsule module;
  - the cold download shown before loading;
  - the timeout.
- The runner is this spike's Worker variant, generated by the build with its
  hash, with Pyodide pinned.
- Inputs are exported from the Observatory (`gravitas.observation/1`) and
  from experiment and inference results (`gravitas.experiment-result/1`,
  `gravitas.inference/1`), as reviewed notebooks in the repository.
- Tests: the isolation and availability checks above, in all three engines;
  identical capsule outputs across engines; and the refusals.
- Decide before building: jsDelivr, or a separate origin the owner creates.

**Curriculum (advanced teaching).**
- Two or three reviewed notebooks over existing Observatory data:
  - transit times, with the timing method fixed and checked against the
    pack's period;
  - a spectral-line measurement on an SDSS spectrum;
  - an ensemble comparison from an experiment result.
- Each notebook has expected outputs held by capsule hashes, an instructor
  note, and an export for students who want to run it in their own Jupyter.

**The capsule export (research B)** can be one task of the production prompt.

## Findings to act on, outside this gate

- **Opaque-origin frames share the page's event loop** in Chromium, Firefox
  and WebKit. Nothing in Gravitas runs untrusted code today, and the embed
  contract (EMBEDDING.md) runs Gravitas inside other pages, not the reverse.
  This belongs in any future design that frames code, not only notebooks.
- **The Exoplanet guides already do this workflow built in.** A curriculum
  prompt should start from them, not from a notebook.

## Downloads made for this gate

All were fetched at run time by the browsers or `curl`, and none is
committed:

- Pyodide 314.0.7's core, its lock file and 12 wheels, from `cdn.jsdelivr.net`;
- the JupyterLite demo's interface, from `jupyterlite.github.io`.

No npm package was installed.

## How to reproduce

On the spike branch, `npm ci`, then serve the repository on port 4634
(`python3 -m http.server 4634 --bind 127.0.0.1`) and run the commands in
[`spike/notebook/README.md`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/550bf5d/spike/notebook/README.md).
Each prints one JSON line.
