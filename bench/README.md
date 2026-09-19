# Deploy benchmark: does serving the built tree help a student?

Measurement only. Nothing here is on the deploy path and nothing here proposes
one. Run from a worktree at the revision under test.

## The question

Gravitas publishes `git archive HEAD` — the committed, unbundled source. It also
has a `dist/` build that nothing publishes. Would publishing the build reach a
usable first lesson step materially sooner on classroom hardware?

## What the current deployment actually is

- `tools/prepare-pages.mjs` exports the committed tree with `git archive`,
  stamps four pages, regenerates `sw-manifest.js`, writes
  `deployed-revision.json`, and refuses to publish if anything else differs.
- The deploy job runs that script and nothing else. There is no `npm ci` and no
  `npm run build`, deliberately: "nothing here may regenerate a tracked file,
  least of all the instructor bundle."
- So the site serves unbundled ES modules. `dist/` is never staged.
- `tools/bundle-budget.mjs` reads `.build-report.json`, which `build.js` writes
  about `dist/`. The budget therefore measures an artifact production does not
  serve. `build.js` even prints "Built to dist/: publish that directory."

## The primary metric

Time from navigation start until a student can act on the first step of a
guided investigation. Mechanically: the first rAF tick at which all of

1. `#investigationProgressText` matches `^1 of \d+ steps`,
2. `#investigationBody .inv-step-title` has text,
3. `#investigationNext` exists, is enabled and has a layout box,
4. `document.elementFromPoint` at that button's centre returns the button or a
   descendant — which is what proves the welcome overlay is not covering it.

Step 1 of `keplers-laws` is a `read` step, so Next is the control the step
requires. Every trial is then validated by clicking it and waiting for
`^2 of \d+ steps`; a trial whose click does not advance the lesson is not a
trial.

## The profile

Identical for both candidates: Chromium via Playwright, 4 Mbit/s down /
1 Mbit/s up / 80 ms RTT, CPU throttled 4x, viewport 1366x768, HTTP cache
disabled, fresh context per trial, `serviceWorkers: 'block'`.

`gravitas_welcome_seen_v1` is set before boot in both, so the splash is not in
the way and no human reaction time enters the number.

## gzip matters more than anything else here

GitHub Pages gzips text. `npx http-server` does not. Measured uncompressed, the
unbundled candidate looks about 3.5x worse on the wire than it really is and the
apparent improvement from building roughly triples. `gzip-server.mjs` exists for
that reason alone; it reproduces Pages' compressed size for `js/physics.js` to
within 1.4% (87,868 vs 89,081 bytes).

## Running it

    node tools/prepare-pages.mjs --out _siteA --commit "$(git rev-parse HEAD)" \
      --ref v2 --run-id local --run-attempt 1 --workflow local
    npm run build
    node bench/stage-b.mjs "$(pwd)" "$(git rev-parse HEAD)"
    node bench/gzip-server.mjs _siteA 8031 &
    node bench/gzip-server.mjs _siteB 8032 &
    TRIALS=7 node bench/bench-deploy.mjs

`bench-warm.mjs` is the returning-student case with the worker installed. Run it
once per sample: looping trials inside one context stalls, because state carried
between navigations puts the second trial on a step the predicate does not match.
