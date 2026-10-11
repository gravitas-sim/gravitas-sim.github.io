# Gravitas compute frame

This repository is published verbatim from the Gravitas application repository
(gravitas-sim/gravitas-sim.github.io, directory `compute-frame/`). Do not edit
it here: `node tools/compute.mjs` in that repository writes every file, and a
test there fails if they differ.

It serves one page, `index.html`, at https://gravitas-compute.github.io/. The compute page of
Gravitas (https://gravitas-sim.online/compute/) frames it with
`sandbox="allow-scripts"`, so the page has an opaque origin: no storage, no
cookies, no access to Gravitas. It runs reviewed Python notebooks in Pyodide
314.0.7 inside a Worker, on the inputs Gravitas sends it over a
MessagePort, and returns what the notebook returns. It collects nothing and
sends nothing anywhere: it fetches the pinned Pyodide release from
cdn.jsdelivr.net and nothing else.

- `index.html`: the frame, with its script inline and hashed into its
  Content-Security-Policy.
- `manifest.json`: the SHA-256 of the page and its script, the policy, the
  runtime pin, and the pages it answers.
- `LICENSE`: MIT, as Gravitas.

What is and is not pinned is in COMPUTE.md in the application repository.
