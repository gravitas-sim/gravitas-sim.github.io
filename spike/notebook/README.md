# Notebook bridge spike (Prompt 33)

Disposable. The decision record is NOTEBOOK_BRIDGE_GATE.md.

- `export-observation.mjs` writes `observation.json`, the TESS HD 209458
  light curve as the Observatory exports it (`gravitas.observation/1`).
- `transit-times.ipynb` is the provided notebook: it reads only the public
  schema and returns a table, values and a PNG as `gravitas_output`.
- `host.html` / `host.js` is the Gravitas side. `runner.src.js` (Pyodide on
  the frame's thread) and `runner-worker.src.js` with `runner.worker.js`
  (Pyodide in a Worker) are the sandboxed side; `build-runner.mjs <variant>`
  writes `runner*.html` with the inline script's hash in its policy.
- `hostile-*.ipynb` try to reach out, loop, return too much and return the
  wrong shape.
- `measure.mjs <engine> <cold|warm|offline|throttled> [runner] [notebook]`,
  `loop.mjs <engine> [runner]`, `worker-probe.mjs`, `jupyterlite.mjs` and
  `jl-sandbox.mjs` are the measurements. Serve the repository on port 4634
  first: `python3 -m http.server 4634 --bind 127.0.0.1`.
- `../expression/` is the lighter route: a closed formula language for a
  derived column (`check.mjs`).
