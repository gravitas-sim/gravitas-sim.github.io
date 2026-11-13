# Integration

**Status, 2026-11-13: `v3` is promoted and `v4` is the open train.** `v3` and `main` held the same commit when 3.0 was tagged, and `main` has since taken the later documentation and wording commits (`main` = `v3` = `71a5ecfc`, deployed, CI green on both). A promoted train takes no new work, so Roadmap IV (prompts 296 to 498, outside the repository) lands on `v4`, created by the merge-queue session from the `main` tip `71a5ecfc`. Outcome A of that roadmap's section 7.3, with the name `v4` named and approved by the maintainer on 2026-11-13; the rules below apply to `v4` as they did to `v3`. `on.push` in `ci.yml` still lists `main` and `v3`; adding `v4` is a maintainer approval and not part of this change. Every pull request into `v4` gets the pull-request CI, and the queue dispatches a full run on the head before each merge. A pull request still open against `v3` (#538) must be retargeted or closed by its owner; the class check now refuses it.

**Roadmap IV tranches.** Tranche T1 is authorized by this change and nothing later is. Each later tranche is authorized by exactly one recorded continuation checkpoint.

| Tranche | Prompts | Closing checkpoint |
|---|---|---|
| T1 | 296 to 340 and 445 to 457 | 340 (I) |
| T2 | 341 to 374, 458 to 468, 475 to 478, 481, 482, 496, 498 | 374 (II) |
| T3 | 375 to 393, 469 to 474, 479, 480, 483 to 488 | 393 (III) |
| T4 | 394 to 412, 489 to 495 | 412 (IV) |
| T5 | 413 to 429 and 497 | 429 (V) |
| T6 | 430 to 444 | 443 and 444 |

T1 authorized by this change. Prompt numbers are identifiers, not an order; the dependency graph is the order, and a prompt numbered 445 or higher may run before a lower number.

**Release closeout that is not Roadmap IV's, and stays the maintainer's:** the ratification of register rows D-R10-264-05, D-R10-291-01 to 03, D-R10-293-01 to 03 and the other DELEGATED rows (ten at this commit); the owner facts listed in `OWNER_ACTIONS.md`; the repository ownership and successor decision; the cause of the Zenodo webhook's 500 answer (needs a token scope the project does not use); cleanup of merged branches and worktrees; branch protection on `main`; `on.push` for `v4`; the next release's version fields, notes and DOI, which follow RELEASING.md.

**Status, 2026-11-12: `v3` was released as 3.0** (tag `v3.0` on commit `ce1d59561963338645b880aecb20e89ed899c396`, where `main` and `v3` held the same commit; GitHub release and Zenodo archive, version DOI 10.5281/zenodo.24181005). "What 3.0 produced" in [`RELEASING.md`](RELEASING.md) has the rest. The branch rules below are unchanged by it.

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
      "state": "promoted"
    },
    {
      "name": "v4",
      "branch": "v4",
      "base": "71a5ecfca364044acf76fab330d45e5bf4eb9c14",
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

**Recorded outcomes:** Continuation checkpoint I (Prompt 160, 2026-10-21, register row D-R10-35, measured on `v3` at f7f0ab17): CONTINUE AS PLANNED. Tranche T1B (R11, R12 and R13, prompts 161 to 192) may run, each prompt under its own run condition and the byte, request and runner-minute draws the row records; the first-visit precache tier has 18 B of room, so a prompt that ships a new file under `js/` uses an idle group unless its bytes are named in a raise (D-R10-36). T2 (R14 and later) is not authorized: only 192's recorded outcome can authorize it. T1A is closed. The row was ratified by Carl on 2026-10-21 ("go with your recommendations on all pending decisions"); the CI part is a recorded-timings refresh only, and any `ci.yml` change stays his to approve.

**End of T1B (Prompt 191, for Prompt 192):** the image investigations (Measuring the Moon, How Far Is That Star?, A Binary Star's Orbit) are on the Observing-and-measuring sequence after Prompt 190's three; "What is in this field?" is not built (no usable quantitative frame in the repository; recorded in `IMAGE_INVESTIGATIONS.md`, register row D-R10-72). Nothing was added to the precached idle tier; the new files are not precached. The instructor bundle's source closure stays at 273 files and the bundle is rebuilt by the queue. Checkpoint II (192) decides T2; this note authorizes nothing.

**Recorded outcome of continuation checkpoint II (Prompt 192, 2026-10-25, register row D-R10-73, measured on `v3` at cfcc2cb4):** CONTINUE AS PLANNED. Tranche T2 (R14, prompts 193 to 207) may run, each prompt under its own run condition and its Appendix C prerequisites; T3 and later are not authorized (only 207's recorded outcome can authorize T3). The deferred room is 0 to 25 B (2104.7 of 2104.7 KB), so a T2 prompt raises the deferred and route ceilings by exactly its measured overrun under the standing size-budget approval and itemises it; the pack, first-visit and idle ceilings in `tools/data-budget.json` stay Carl's (room 781 B gzip, 810 B and 274 B), so a T2 prompt whose data does not fit uses fixtures or lazy NEVER_PRECACHED files and stops with the decision named. No chunk-sharing repair is proposed: the deferred budget counts only the app build, so each T2 instrument family costs one copy in the deferred figure, and the copies inside the composer and course-packs bundles are counted by no budget. The row is DELEGATED, pending Carl's ratification.

**Recorded outcome of continuation checkpoint III (Prompt 207, 2026-10-28, register row D-R10-207-01, measured on `v3` at 6d5ee4d5):** CONTINUE AS PLANNED. Tranche T3 (R15 to R17, prompts 208 to 232) may run, each prompt under its own run condition and its Appendix C prerequisites; T4 and later are not authorized (only 232's recorded outcome can authorize T4). T2 drew 310.4 KB of deferred JavaScript against an allocation of 0 (now 2415.1 of 2415.1 KB on CI), each step a measured-overrun raise under the standing size-budget approval, so a T3 prompt raises the deferred and route ceilings by exactly its measured overrun and itemises it; the first-visit and idle precache tiers are at 0 B of room and each raise is the exact measured figure with its own row; the instructor closure is one file from its cap, so a T3 prompt uses one new file per sequence and asks for the cap raise; CI shards run 14 to 22 minutes against a 24-minute timeout, so a re-plan is a proposed repair. The row is DELEGATED, pending Carl's ratification.

**Recorded outcome of continuation checkpoint IV (Prompt 232, 2026-11-03, register row D-R10-232-01, measured on `v3` at 7e8ccb16):** CONTINUE AS PLANNED. Tranche T4 (R18 to R20, prompts 233 to 254) may run, each prompt under its own run condition and its Appendix C prerequisites; T5 and later are not authorized (only 254's recorded outcome can authorize T5). T3 drew 631.7 KB of deferred JavaScript against an allocation of 0 and an extrapolation of 250 to 450 KB (now 3046.8 of 3046.8 KB on CI), each step a measured-overrun raise under the standing size-budget approval, so a T4 prompt raises the deferred and route ceilings by exactly its measured overrun and itemises it; idle precache and the packs are at 0 B of room, first-visit has 144,941 B unused, and a pack raise is Carl's; the instructor closure is one file from its cap (305 of below 306), so a T4 prompt uses one new file per sequence and asks for the cap raise; CI shards run 18.0 to 20.3 minutes against a 24-minute timeout, so a re-plan is a proposed repair before T4's content wave. The 3.2.0 tag is held; the next release recommendation is 3.0.0 from `v3`, on Carl's direction only (no tag, no DOI action). The row is DELEGATED, pending Carl's ratification.

**Recorded outcome of continuation checkpoint V (Prompt 254, 2026-11-06, register row D-R10-254-01, measured on `v3` at c2363989):** CONTINUE AS PLANNED. Tranche T5 (R21 to R22, prompts 255 to 267) may run, each prompt under its own run condition and its Appendix C prerequisites; T6 and later are not authorized (only 267's recorded outcome can authorize T6). T4 drew 44.4 KB of deferred JavaScript (3091.2 KB ceiling, 110 B of room), used up the first-visit slack (342 B of room), left idle precache and the packs at 0 B and the instructor closure one file from its cap, so a T5 prompt raises a ceiling by exactly its measured overrun and itemises it, and a closeout asks for the closure-cap raise; CI shards run 15.7 to 17.2 minutes against 24. T4 shipped two investigations and about twenty kernels with no consumer; the consumers rule is held. No tag, release or DOI before Roadmap III completes; nothing merges to `main`. The row is DELEGATED, pending Carl's ratification.

**Recorded outcome of continuation checkpoint VI (Prompt 267, 2026-11-07, register row D-R10-267-01, measured on `v3` at 8d8f8de3):** CONTINUE AS PLANNED. Tranche T6 (R23 to R26, prompts 268 to 295) may run, each prompt under its own run condition and its Appendix C prerequisites; 295 authorizes nothing. T5 raised no deferred or route ceiling and drew about 0.05 KB of deferred JavaScript (3091.2 KB ceiling, 57.8 B of room), made one standing-approval raise (idle precache +42 B), restored 40,891 B of first-visit room (R-A, #549), left idle precache and the packs at 0 B and the instructor closure one file from its cap, so a T6 prompt raises a ceiling by exactly its measured overrun and itemises it, and a content prompt asks for the closure-cap raise; CI shards run 9.6 to 16.9 minutes against 24. T5 shipped eleven kernels and gates with 41 recorded failing legs and one course change; the consumers rule is held. No tag, release or DOI before Roadmap III completes (the next version is 3.0); nothing merges to `main`. The row is DELEGATED, pending Carl's ratification.

**The last content closeout before Prompt 287 (Prompt 274, 2026-11-10, register rows D-R10-274-01 to D-R10-274-05, `ADVANCED_CLOSEOUT.md`):** the content closeouts of Roadmap III are 191, 206, 216, 224, 231, 238, 246, 253, 260, 266 and 274, and 274 is the last. Prompt 287 (cohesion II) runs after every content closeout and after 286, and reads the Library, Home and the navigation inventory as this closeout left them: one sequence added (Spaceflight and the three-dimensional sky, the guides of the 3-D lab and the mission lab), no new destination, kind, term, filter or recommended start, and every committed navigation ceiling unchanged. A content pull request that lands after 274 and before 287 (a follow-up to a gate, the second parts of 275 and 276, the numerics sequence of 270) runs the cohesion check itself and says so in its record; 287 repeats the check over whatever has landed by then.

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

<!-- Listed in DOCUMENTS.md. -->
