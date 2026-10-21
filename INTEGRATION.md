# Integration

**Status, 2026-10-16.** `v2` was released as 2.0.0 (merge commit `a71f73f50f30ec6a81d398d2cd54f474e87ddd85` on `main`, tag `v2.0.0`) and has been deleted. `main` is the integration branch for invisible work and deploys on every merge. Visible and instructional work goes to the active train, when there is one. This file is what a session reads first to find where its work goes; it changes only by a reviewed pull request. It is row D-INT-02 of the [decision register](DECISION_REGISTER.md), which supersedes D-INT-01.

The model is machine-readable, and `tools/pr-class.mjs` (the CI job `Pull-request class`) reads it:

<!--integration-model-->
{
  "integrationBranch": "main",
  "trains": [
    {
      "name": "v3",
      "branch": "v3",
      "base": "092a121dc6244eccc54e2548b88a41edd847762a",
      "owner": "the merge-queue session",
      "state": "open"
    }
  ],
  "windows": []
}
<!--/integration-model-->

A train is `{"name", "base", "owner", "state"}`, state one of `open`, `frozen`, `promoted`, `deleted`; its branch is `train/<name>` unless the entry names one. A window is `{"name", "from", "to"}` in ISO dates. **`v3` is the Roadmap III integration and staging branch** (the model block lists it as the one open train so the class check treats it as one). It was created by the merge-queue session from `main` at 092a121d; this change creates no branch. Every Roadmap III pull request, whatever its class, targets `v3`, and the queue never merges into `main`. `main` receives a release only on Carl's direction (see "Promotion of a train"). No window exists today.

**Departure from the roadmap, recorded.** Prompt 122 as written makes `main` the integration branch for invisible work and a train the target for visible work. Carl decided otherwise on 2026-10-17, in his words as the queue relayed them: "No, do not merge into main. Use v3 as the staging ground for the major releases that will be pushed to main under my direction." He then told this session to target every Roadmap III pull request at `v3`. The class labels and the checks that read them are unchanged; only the target differs.

## Roadmap III baseline (measured 2026-10-16)

Read live by Prompt 122; the tree wins over the roadmap's planning snapshot.

- **`v3`:** created from `main` at 092a121d on 2026-10-17; `on.push` in `ci.yml` lists `main` and `v3` (Carl, 2026-10-17, D-CI-03), so every merge into `v3` runs the full suite on the merged tip; the deploy job still runs only for `main`. Each pull request also gets its pull-request CI, and the queue dispatches a full run on the head before every code merge. When `v3` is released, it leaves `on.push` as `v2` did.
- **`origin/main`:** `092a121dc6244eccc54e2548b88a41edd847762a`, CI green (run on 2026-10-16 20:52 UTC). `v2` does not exist on `origin`.
- **Deployed revision:** `deployed-revision.json` on the live site names the same commit (deployed 2026-10-16 21:13 UTC, run 38965399427).
- **Open pull requests:** #335 (records the v2 deletion and the Gaia fixture decision) and four dependency updates (#330 to #333), all into `main`.
- **Decision register:** 284 rows: 283 RATIFIED and 1 SUPERSEDED. Five rows were written with two spaces after the leading pipe and were invisible to `tests/decisionRegister.test.js`; this PR repairs the spacing.
- **Scheduled runs:** the weekly runs of 2026-10-05 and 2026-10-12 failed in the `Lint, tests and physics validation` job on the old `main` (`16d0f24`); 2026-09-21 and 2026-09-28 passed. No scheduled run has happened since `main` moved to the 2.0.0 tree. This is a fact to carry, not a diagnosis; the first scheduled run on the new tree is the evidence.
- **Ciphertext check:** `instructors:check` runs in the `checks` job when `github.ref == 'refs/heads/main' || github.base_ref == 'main'`, so a pull request into `main` is refused on a stale instructor ciphertext and one into a train is not asked.

## How a session finds its base

1. **Read this file.** The model block names the integration branch and the trains.
2. **Choose the base.** While `v3` is the open train, every Roadmap III change, invisible or not, branches from `v3`'s green tip and targets `v3` (Carl, 2026-10-17). A change to `main` itself (a hotfix to the live site, a dependency update) branches from a green `main` tip and targets `main`. When no train is open, an `invisible` change targets `main`, and a `visible` or `instructional` change waits: it is a stop, not a guess.
3. **Verify the base.** Fetch `origin`; check the branch exists, its tip SHA and that the tip's aggregate check (`CI`) is green before starting.
4. **Never assume a name.** If this file names a branch that does not exist, stop and say so.

## What the classes mean

Every pull request carries exactly one of the labels `invisible` or `visible`, and the flag `instructional` when it applies. Classify honestly.

- **Invisible:** refactors with equivalence proofs, tests and tooling, documents, new content that alters no shipped step and carries no instructor documents, defect fixes.
- **Visible:** a shipped investigation's steps, graded answers, instrument behaviour, report layout or content, a hidden or moved control, a changed default, a key binding, a motion behaviour, a scientific number a student sees, a removed, merged or renamed destination, Home or global navigation. A report layout, a hidden control, a key binding, a motion default and a scientific number are visible even when the change is beneficial.
- **Instructional:** anything the instructor bundle reads (guides, keys, notes, rubrics, the materials of a new investigation). New content with instructor documents is therefore instructional and rides a train.
- **Hotfix:** an extra label that waives the window rule for a visible pull request into `main`. It is for a defect on the live site and says why in the pull request.

## Enforcement

The CI job `Pull-request class` (part of the aggregate `CI`; `tools/pr-class.mjs`, `tests/prClass.test.js`) reads the labels from the API when it runs, the target and the windows in the model block:

| Pull request | Result |
| --- | --- |
| no class label, or both | fails |
| `visible` into `main`, no open window, no `hotfix` | fails |
| `instructional` into `main` | fails unless the `checks` job (which runs `instructors:check`) passed |
| into an open train (today `v3`) | exempt from the window and the ciphertext check |
| into an unlisted or non-open train | fails |
| into any other branch (stacked work) | passes; it is judged when its prerequisite lands |
| Dependabot, unlabelled | treated as invisible |

A label change does not re-run CI by itself. **The merge queue re-runs the `Pull-request class` job before it merges** and checks the labels it read. The CHANGELOG classification tripwire stays as a second net. Branch protection that requires `CI` (an owner action, OWNER_ACTIONS.md) is what makes the check a gate rather than advice.

## How work reaches `main` and the trains

- **Every change is a pull request,** from its own branch cut from a green tip of its base. Nothing is pushed to `main` or a train directly, and nobody merges their own pull request.
- **One coordinator merges, on `main` and on every train.** A merge-queue session merges one pull request at a time, only after the base's CI is green, with the head commit pinned (`--match-head-commit`), so a push after the check cannot slip in.
- **Only the head of the queue refreshes.** When a pull request reaches the head it merges the base's tip into its branch once, regenerates what it must and pushes once. A pull request that conflicts before its turn reports it and waits. A branch only ever receives new commits: no rebase and no force push, even before review.
- **Stacked prerequisites are found on the train.** A visible prompt's predecessors have landed on the train it starts from; a change that needs an unmerged predecessor branches from that predecessor and says so.
- **The train runs the full aggregate CI.** Engine jobs (Firefox and WebKit) run on `main` pushes, so the queue dispatches them on a train's branch.
- **`main` is merged into the train, never the reverse before promotion.** A train is refreshed whenever `main` moves, so promotion is a small merge.
- **The queue talks on the pull request.** Turn instructions are comments that begin `queue:`, replies begin `author:`.
- **How a checkpoint judges a train:** from a locally served build of its tip. A train is never "deployed" and no claim about the live site rests on it.

## Promotion of a train

1. Carl rebuilds the instructor ciphertext on the train if any `instructional` pull request landed.
2. The queue freezes the train (state `frozen` in the model block; no new work).
3. The release gate runs on the exact tip SHA.
4. A merge commit of that SHA goes into `main`; the deploy fires.
5. The smoke list runs on the live site.
6. The tag follows [`RELEASING.md`](RELEASING.md).
7. The owner deletes the train branch ([`BRANCHING.md`](BRANCHING.md)).

Promotion, tag, deploy and deletion are Carl's actions. A train lands at a term boundary as a scheduling convention; compatibility is guaranteed by pins, readers and the compatibility corpus, not by the calendar.

## Roadmap III execution

The roadmap (outside the repository, like the first two) is executed in tranches, each opened by exactly one authorization:

| Tranche | Phases | Authorized by | Closed by |
| --- | --- | --- | --- |
| T1A | R9, R10 (prompts 122 to 160) | **Prompt 122 (this change)** | 160, continuation checkpoint I |
| T1B | R11, R12, R13 (161 to 192) | 160's recorded outcome | 192, checkpoint II |
| T2 | R14 (193 to 207) | 192's recorded outcome | 207, III |
| T3 | R15 to R17 (208 to 232) | 207's | 232, IV |
| T4 | R18 to R20 (233 to 254) | 232's | 254, V |
| T5 | R21, R22 (255 to 267) | 254's | 267, VI |
| T6 | R23 to R26 (268 to 295) | 267's | 295, which authorizes nothing |

This pull request authorizes T1A and the policies the register rows D-INT-02, D-R9-01 and D-R9-02 record, and nothing else. T1B is authorized only by 160's recorded outcome, T2 only by 192's, and each later tranche only by its continuation checkpoint's. A continuation checkpoint records one of six outcomes as a register row and a line here naming the tranche and what it may run: CONTINUE AS PLANNED; CONTINUE WITH NARROWED SCOPE; REORDER; DEFER A SPECIFIC DOMAIN; SUBSTITUTE A BETTER BOUNDED VERSION; MAINTENANCE / CONSOLIDATION ONLY. A green closeout, a READY verdict or landed prerequisites are never an authorization. A session verifies the authorization before any work and stops without it.

**Recorded outcomes:** Continuation checkpoint I (Prompt 160, 2026-10-21, register row D-R10-35, measured on `v3` at f7f0ab17): CONTINUE AS PLANNED. Tranche T1B (R11, R12 and R13, prompts 161 to 192) may run, each prompt under its own run condition and the byte, request and runner-minute draws the row records; the first-visit precache tier has 18 B of room, so a prompt that ships a new file under `js/` stops for Carl's decision on it. T2 (R14 and later) is not authorized: only 192's recorded outcome can authorize it. T1A is closed. The row is DELEGATED, pending Carl's ratification.

## Generated artifacts are regenerated, never hand-merged

A file a generator writes in full is never resolved by editing: take either
side and run the generator. A file that only contains generated regions (such as
README.md) is never resolved by taking a side, because that throws away the
other side's prose. [`BRANCHING.md`](BRANCHING.md) lists both kinds, and the
commands.

Two orders matter:
- Build first (`node build.js`), then `npm run docs:sync -- --full`, because the
  full sync reads sizes from the build.
- Regenerate the catalog (`npm run catalog`) before the service-worker manifest
  (`npm run sw:manifest`), because the manifest hashes the catalog.

## A writer changes only when its corpus row is green

An older build is a real reader (a browser on 2.0.0's cached code, an open tab, a rolled-back deploy), and 2.0.0's readers are not uniform about what they do not know: the pack and manifest readers refuse an unknown field, and the envelope and record readers accept it and drop it. So:

- A writer may change only when its row in `tests/compat/` is green for the change (`npm test` runs the corpus; it reads the `v2.0.0` commit's own readers).
- Where a change makes an older build refuse or silently misread, it is a major-version boundary, and it lands on the 3.0 train (Prompt 176), not on this one.
- Where a payload does not need new fields, the writer writes the old version.
- A record a new reader needs that an old reader would ignore is never carried as an unknown field: it is a capability-required refusal, with a message.

`FORMATS.md` ("Compatibility with 2.0.0") has the inventory, the support period and the list of planned extensions against 2.0.0.

## What the checkpoints may and may not do

Checkpoints are read-only readiness reports (130, 160, 171, 177, 192, 207, 232, 254, 267, 288, 294, 295).

- **They may:** measure; list what is not ready; propose repair prompts for Carl to approve; recommend a tag of what has merged on a promoted train or `main`; list RELEASING.md's steps; run the cohesion review; open a re-baseline pull request labelled as a ceiling increase for Carl, where the budget policy (Prompt 133) licenses it; and, for a continuation checkpoint, record the six-outcome decision with its evidence.
- **They may not:** merge, release, tag or deploy, or change `main`.

A checkpoint that returns READY says the lane is ready. It does not say the project is released.

## Hotfixes

A defect on the live site goes to `main` by pull request labelled `hotfix`, as any change to `main` does, and reaches an open train by merging `main` into it.
