# Deploy-model gate: measurements

On v2 7299b2d (the build output is identical to c4d0984's).

- `node build.js`: dist/ has 838 files, 38 MB. There is no `dist/sw.js` and no
  `dist/sw-manifest.js`.
- `dist/instructors/materials.enc.json` is present, copied from the tree.
- The route budgets for both models: `node tools/route-budget.mjs --report`.
- The dist-target browser suite: 247 passed, 1 failed, 19 skipped (267 tests),
  against about 1474 tests in the source suite (run of 40c0777 on 2026-09-29).
