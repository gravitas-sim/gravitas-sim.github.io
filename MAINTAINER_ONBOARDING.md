# Maintainer onboarding

For a second maintainer on their first day. It points; it does not repeat.
[`CONTINUITY.md`](CONTINUITY.md) says why a second maintainer matters and how
one is added. This file says where things are. (`ONBOARDING.md` is the student
feature's document and has nothing to do with this one.)

## 1. The map

[`DOCUMENTS.md`](DOCUMENTS.md) lists every root document with its purpose, its
kind, the prompt that keeps it current, whether it is written or generated, and
whether a student can meet its content. Below that it lists every generated
artifact, the command that writes it and whether that command depends on a
secret. Start there; `npm run docs-map:check` keeps it honest. The block below
is written by `node tools/docs-map.mjs` from the same table; never edit it by
hand.

<!-- docs-map:begin (written by node tools/docs-map.mjs; do not edit) -->
219 root documents (4 front-door, 10 policy, 2 legal, 10 process, 5 guide, 9 design, 11 reference, 105 feature, 54 gate, 9 record) and 6 archived.
A document the code no longer matches is moved to `docs/archive/`, never
deleted, with a header naming the date and what superseded it:

- [`ENERGY_TAB_FEATURE.md`](docs/archive/ENERGY_TAB_FEATURE.md), archived 2026-10-17 (P128); superseded by OBJECT_INSPECTOR.md.
- [`IMPLEMENTATION_CHECKLIST.md`](docs/archive/IMPLEMENTATION_CHECKLIST.md), archived 2026-10-17 (P128); superseded by the shipped investigations Listening to Spacetime, A Universe of Stars and Lives of Stars.
- [`PERFORMANCE_OPTIMIZATIONS_SUMMARY.md`](docs/archive/PERFORMANCE_OPTIMIZATIONS_SUMMARY.md), archived 2026-11-11 (P289); superseded by PERFORMANCE_PROFILING_GUIDE.md, npm run perf and tools/perf-thresholds.json.
- [`UI_PERFORMANCE_AUDIT.md`](docs/archive/UI_PERFORMANCE_AUDIT.md), archived 2026-11-11 (P289); superseded by npm run perf, npm run budget:check, tools/route-budgets.json and ACCESSIBILITY.md.
- [`SCENARIO_FIXES.md`](docs/archive/SCENARIO_FIXES.md), archived 2026-11-11 (P289); superseded by npm run validate:scenarios and the scenario section of CONTRIBUTING.md.
- [`SCENARIO_GALLERY.md`](docs/archive/SCENARIO_GALLERY.md), archived 2026-11-11 (P289); superseded by README.md, CONTRIBUTING.md, js/scenarioBrowser.js and npm run thumbnails:check.
<!-- docs-map:end -->

## 2. Setup from nothing, and the three commands

What a clean machine needs: **git**, **Node 22** (`.nvmrc` says 22, `package.json`
asks for 22 or later, and CI runs 22; the byte budgets are authoritative only on
22, see below), a network connection, about 1 GB of disk for the clone and its
`node_modules`, and another 600 MB if a browser is installed. No account, no
token and no passphrase. Then, in an empty directory:

```bash
git clone --branch v3 https://github.com/gravitas-sim/gravitas-sim.github.io.git gravitas
cd gravitas
npm ci
npx playwright install chromium
npm test
npm run release:check -- --fast
```

The three commands are `npm ci`, `npm test` and `npm run release:check -- --fast`,
in that order, before and after any change. `git clone` is the prelude (use the
branch `INTEGRATION.md` names as the open train; `v3` was it on 2026-11-12) and
`npx playwright install chromium` is a prerequisite of the third command, not
a fourth step: without a browser `release:check` stops on its lesson-card check.

- `npm test` is the Jest suite: physics, data, number formatting, i18n parity,
  the documentation counts and the decision register.
- `npm run release:check -- --fast` is the release gate without the slow parts:
  the checks CI runs, from one registry (`tools/checks.mjs`). It also fails on
  an import cycle that `npm test` misses.
- When a change touches a generated file, `npm run generate` rewrites every
  generated artifact in dependency order, and `npm run docs:check:full` says
  whether the documentation counts still match. Never fix generated output by
  hand; fix the source and regenerate.

**Rehearsed on 2026-11-12 (Prompt 293).** The original agent, alone, on the
same Mac as the first two rehearsals, from an empty directory with a cold npm
cache and a cold browser path, no passphrase, Node 22.23.4, `v3` at fa0f64ad.
This is not a second person's first day; a second person will find stumbles this
run could not.

| Step | Wall time | Result |
| --- | --- | --- |
| `git clone --branch v3` (full history, 5,087 tracked files; the clone's `.git` is 723 MB) | 35 s | ok |
| `npm ci` | 5 s | ok (the clone is 1.0 GB with `node_modules`) |
| `npm test -- --maxWorkers=2` | 1,426 s (23.8 min) | 619 suites, 20,887 tests, all passed, exit 0 |
| `npm run release:check -- --fast`, no browser installed | 135 s | **exit 1**: 40 passed, 0 failed, 23 skipped, 1 unable to launch (lesson cards) |
| `npx playwright install chromium` | 9 s | ok (104 MiB headless shell; 601 MB in all) |
| `npm run release:check -- --fast`, again | 139 s | exit 0: **41 passed, 0 failed, 23 skipped**; working tree clean afterwards |

About 29 minutes of command time end to end, nearly all of it Jest. The Jest
run was capped at two workers to keep the machine usable while other work ran;
the documented `npm test` takes Jest's default of one fewer than the cores, so
an ordinary laptop should be faster (not measured). Every stumble:

1. **The browser.** The first `release:check` without a Playwright browser
   exits 1 and prints both "0 failed" and "1 check(s) failed", because an
   unlaunchable browser is its own outcome (the check says nothing was tested
   either way). The `npx playwright install chromium` line above is the fix; it
   was missing from the older version of this section.
2. **A green Jest run looks alarming.** The log of a passing `npm test`
   contains a `TypeError: Cannot read properties of undefined (reading
   'documentElement')` trace (its stack names `js/sunWidgets.js`) and a block
   saying "27 documentation problem(s) ... Run `npm run docs:sync`". The run
   still ended with every suite and test passing and exit 0; the verdict is the
   exit code and the `Tests:` line at the end. Where those lines come from was
   not investigated. Do not run `docs:sync` because of them.
3. **Twenty-four minutes with no progress line.** The Jest reporter printed no
   per-suite line while it ran. A silent terminal is not a hang.
4. **Node.** Only Node 22 was used here. A build under another major version
   can move the deferred budget by a kilobyte (see RELEASING.md, "Rehearsing
   recovery from an archive"); judge a budget failure on Node 22.

Not exercised, and so not claimed: a shallow clone (the merge tripwire reads
history), Windows, a machine without Node 22 and a version manager, the browser
suites (`npm run e2e`), the slow half of `release:check` and a pull request. The
recovery-from-an-archive path, with no git at all, is in
[`RELEASING.md`](RELEASING.md) and was rehearsed twice.

From an unpacked tag or archive rather than a checkout, `release:check` runs
without git on the current tree (the merge tripwire says there is no merge to
check; the 2.0.0 archive's older tool fails there). The deferred budget is
authoritative only on CI's Node 22; see [`RELEASING.md`](RELEASING.md),
"Rehearsing recovery from an archive".

The browser suite is `npm run e2e`, on a private port you choose through
`GRAVITAS_E2E_PORT`, never the shared default. CI shards it.

## 3. The queue protocol

One merge-queue session owns merges. Authors open pull requests and do not
merge them; the queue merges one at a time, refreshes the head pull request
against its base, and runs the full suite on the merged tip.

- **The base.** `INTEGRATION.md` names the integration branch and the open
  trains in a machine-readable block. While a train is open, every change for
  that roadmap branches from the train's green tip and targets the train. `main`
  receives a release when the owner says so, and a hotfix for a live defect.
- **The class.** Every pull request carries one of the labels `invisible` or
  `visible`, and the flag `instructional` when the instructor bundle reads
  what changed. The CI job `Pull-request class` enforces it.
- **Talking to the queue.** By a pull request comment or a message to the
  queue session; say the pull request number and its head.
- **When the base moves,** merge it into the branch; never rebase, and never
  force-push, even before the pull request exists. A pushed branch only gets
  new commits. Files with generated regions conflict on every merge by design:
  keep both sides' hand-written lines, then regenerate.

## 4. The budgets and the register

- **Byte budgets.** `tools/bundle-budget.mjs` (initial and deferred JavaScript)
  and `tools/route-budgets.json` (per page). `npm run budget:check` runs them,
  and only on the CI Node version is the number authoritative (gzip differs
  between Node versions by a byte or two). A raise needs a register row.
  **The policy in force** is the one in `tools/budget-policy.json`, which says
  `"mode": "exact"`: the ceilings are the numbers in `tools/bundle-budget.mjs`
  and `tools/route-budgets.json` as they stand. The richer policy in
  [`docs/BUDGET_POLICY.md`](docs/BUDGET_POLICY.md) (workflow ceilings, an
  optional-growth allowance the owner grants per release, a ledger) is
  proposed and **switched off** until the owner adopts it in writing. Never
  raise a ceiling to make a check pass without the register row the owner has
  asked for; ask.
- **The decision register.** `DECISION_REGISTER.md` is the one list of
  decisions later work may rely on. A row names the decision, its source at a
  commit, its status, who authorized it, what would reopen it and the prompt
  that made it. A gate verdict in it is binding; an unratified one is evidence,
  not permission.
- **Owner-only actions.** `OWNER_ACTIONS.md` lists what only the owner can do:
  accounts, credentials, the instructor passphrase and external reviews. Its
  bus-factor table records, for each thing only the owner holds, whether the
  arrangement is owner-confirmed or UNKNOWN. On 2026-11-12 one is confirmed
  (there is no second passphrase holder) and the rest are UNKNOWN; treat
  UNKNOWN as "ask", never as "someone has it".

## 5. The trains

A train is a long-lived branch that stages one roadmap's work. Its state is one
of `open`, `frozen`, `promoted` and `deleted`, recorded in `INTEGRATION.md`.
Promotion into `main` is a release and is the owner's decision. On 2026-11-12
`v3` is the open train, the `v3.0` tag exists, and it has no GitHub release or
Zenodo record.

## 6. What never to do

- Merge into `main`, tag, deploy or release without the owner saying so.
- Force-push, rewrite history, delete a branch or a worktree you did not make.
- Use, print, log or ask for the instructor passphrase. The ciphertext is
  rebuilt by whoever holds it, on the pull request's branch, on request.
- Raise a ceiling, loosen a scientific threshold or skip a test to make a check
  pass. A failing gate is information; record what it said.
- Edit a generated file by hand, or a file that carries generated regions
  without regenerating.
- Put a local filesystem path, a secret or an attribution line in the
  repository.
- Add student-facing text without Spanish beside it, and call an investigation
  anything but an investigation in it.

## 7. Where the roadmaps live

The implementation roadmaps are planning documents, not repository files, and
are kept outside every checkout on purpose: a copy inside a repository goes
stale and gets treated as authority. They are named
`Gravitas_Master_Implementation_Roadmap_Claude_Ready.md` (prompts 1 to 43),
`Gravitas_Master_Implementation_Roadmap_II_Claude_Ready.md` (44 to 121) and
`Gravitas_Master_Implementation_Roadmap_III_Claude_Ready.md` (122 to 295), and
sit side by side in the maintainer's planning directory, which the maintainer's
own project instructions name. The pattern is
`<planning directory>/Gravitas_Master_Implementation_Roadmap_<edition>_Claude_Ready.md`
(the first has no edition; the others say II and III), and the directory is
deliberately not in this repository or in any checkout, so a second maintainer
asks the owner for it. A prompt number means its numbered section in the
matching file. The decisions the roadmaps led to are in the register, and
that is what a repository reader should rely on.

## 8. The first hour

1. Read `CONTINUITY.md`, then this file, then `DOCUMENTS.md`.
2. Run the commands in section 2 and read what fails, if anything; budget a
   half hour, most of it the test suite.
3. Read `INTEGRATION.md` and `DECISION_REGISTER.md`'s last page.
4. Open `OWNER_ACTIONS.md` and confirm which items are yours to hold.

If an instruction here and the repository disagree, the repository wins and this
file is the defect: fix it in the same change.

<!-- Listed in DOCUMENTS.md. -->
