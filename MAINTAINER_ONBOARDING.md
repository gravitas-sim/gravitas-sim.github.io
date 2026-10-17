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
secret. Start there; `npm run docs-map:check` keeps it honest. Documents the code
no longer matches are in `docs/archive/`, each with a header naming the date and
what superseded it.

## 2. The three commands

Run these from a clean checkout, in this order, before and after any change:

```bash
npm ci
npm test
npm run release:check -- --fast
```

- `npm test` is the Jest suite: physics, data, number formatting, i18n parity,
  the documentation counts and the decision register.
- `npm run release:check -- --fast` is the release gate without the slow parts:
  the checks CI runs, from one registry (`tools/checks.mjs`). It also fails on
  an import cycle that `npm test` misses.
- When a change touches a generated file, `npm run generate` rewrites every
  generated artifact in dependency order, and `npm run docs:check:full` says
  whether the documentation counts still match. Never fix generated output by
  hand; fix the source and regenerate.

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
- **The decision register.** `DECISION_REGISTER.md` is the one list of
  decisions later work may rely on. A row names the decision, its source at a
  commit, its status, who authorized it, what would reopen it and the prompt
  that made it. A gate verdict in it is binding; an unratified one is evidence,
  not permission.
- **Owner-only actions.** `OWNER_ACTIONS.md` lists what only the owner can do:
  accounts, credentials, the instructor passphrase and external reviews.

## 5. The trains

A train is a long-lived branch that stages one roadmap's work. Its state is one
of `open`, `frozen`, `promoted` and `deleted`, recorded in `INTEGRATION.md`.
Promotion into `main` is a release and is the owner's decision.

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
own project instructions name. A prompt number means its numbered section in
the matching file. The decisions the roadmaps led to are in the register, and
that is what a repository reader should rely on.

## 8. The first hour

1. Read `CONTINUITY.md`, then this file, then `DOCUMENTS.md`.
2. Run the three commands in section 2 and read what fails, if anything.
3. Read `INTEGRATION.md` and `DECISION_REGISTER.md`'s last page.
4. Open `OWNER_ACTIONS.md` and confirm which items are yours to hold.

If an instruction here and the repository disagree, the repository wins and this
file is the defect: fix it in the same change.
