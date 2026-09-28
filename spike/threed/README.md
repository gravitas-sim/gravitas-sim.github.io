# 3-D lab gate spike (Prompt 34)

Disposable. The decision record is VALIDATED_3D_LAB_GATE.md; the domain and
tolerances, fixed before any code, are SPEC.md (committed alone first).

- `kernel.js`: the Worker-safe 3-D kernel. Leapfrog, Yoshida 4, Yoshida 4
  with compensated sums (`yoshida4c`), RK4, adaptive Dormand-Prince 5(4),
  merging, conserved quantities, orbital elements, a state hash.
- `corpus.mjs [R1 ...]`: SPEC.md's reference problems. `SCHEMES=yoshida4c`
  runs one scheme; `MAX_EVALS` raises the cost cap. It writes JSON to stdout.
- `bench.js`, `bench-node.mjs [--write] [--speed]`, `bench-browsers.mjs
  [--speed]`, `bench.html`, `worker.js`: R9 (the same bytes in Node and in
  each engine's Worker, from `initial.json`) and the speed table. Serve the
  repository on port 4635 first.
- `results/`: the runs the gate reports.
