# Integration

**The integration branch is `v2`.** Every change in Roadmap II merges into it
by pull request, and there is **one public release at the end**, when Prompt
121 returns GO and Carl acts. Carl decided this on 2026-09-29. It is row
D-INT-01 of the [decision register](DECISION_REGISTER.md).

`v2` stays the integration branch until that release. [`BRANCHING.md`](BRANCHING.md)
has the day-to-day protocol (feature branches, merging `main` in, never
rebasing), and this file is what a session reads first to find out where its
work goes.

## How a session finds the integration branch

1. **Read this file.** It names the branch, and it changes only by a reviewed
   pull request.
2. **If this file is missing,** read [`BRANCHING.md`](BRANCHING.md).
3. **Never assume.** Verify the branch exists on `origin`, its tip SHA, and
   that the tip's aggregate check (`CI`) is green, before starting work from it.

If `v2` has been released and deleted, this file will say so and name its
successor. Until it does, a missing `v2` is a stop, not a guess.

## How work reaches `v2`

- **Every change is a pull request into `v2`,** from its own branch cut from a
  green `v2` tip. Nothing is pushed to `v2` directly, and nobody merges their
  own pull request.
- **One coordinator merges.** A merge-queue session merges pull requests one at
  a time, and only after `v2`'s own CI is green. It merges with the head commit
  pinned (`--match-head-commit`), so a push after the check cannot slip in.
- **Only the head of the queue refreshes.**
  - When a pull request reaches the head, it merges the current `v2` tip into
    its branch once, regenerates what it must, and pushes once.
  - A pull request that conflicts before its turn reports the conflict and
    waits; it does not refresh on its own.
  - A branch only ever receives new commits: no rebase and no force push, even
    before review.
- **Stacked work.** A prompt that needs a predecessor's unmerged change branches
  from that predecessor's branch and says so in its pull request. The queue
  merges them in order.
- **The queue talks on the pull request.** Turn instructions are comments that
  begin `queue:`, and replies begin `author:`. A pull request that adds or
  changes `@cross-browser` tests says so, and the queue dispatches the Firefox
  and WebKit run on its branch, because those engine jobs run on `v2` pushes,
  not on pull requests.

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

## What the checkpoints may and may not do

Prompts 48, 58, 81, 99 and 113 are **readiness reports on `v2`**.

- **They may:**
  - measure;
  - list what is not ready;
  - propose repair prompts for Carl to approve.
- **They may not:**
  - merge;
  - release, tag or deploy;
  - change `main`;
  - authorize a release.

A checkpoint that returns READY says the lane is ready. It does not say the
project is released.

**Prompt 121 is the single release candidate.** It is the only prompt that may
recommend a release, and it recommends. The release itself, the merge of `v2`
into `main`, the tag and the DOI are Carl's actions ([`RELEASING.md`](RELEASING.md),
and BRANCHING.md's "Rolling out").

## Hotfixes on `main`

A fix that cannot wait for the release goes to `main` by pull request, as any
change to `main` does. It then comes to `v2` by **merging `main` into `v2`**,
never by rebasing `v2` onto `main`, and it goes through the queue like any
other merge. Merge `main` into `v2` whenever `main` moves.

## The risk of one large release, and how it is managed

At the time of writing, `v2` is **523 commits ahead of `main`** (`main` = 16d0f24,
2026-09-17; the live site is that commit). Everything in Roadmap II adds to
that. One release carries all of it at once, and a returning reader meets every
change in one visit.

**Saved-state changes already queued** against what `main` stores in a
reader's browser:
- **Assignment links:** schema 1 on `main`, 2 on `v2`. `main`'s code refuses a
  link newer than it knows, and until a student's browser takes the update it is
  running `main`'s cached code. Blocker B3 of the release-candidate report;
  Prompt 47 repairs it by writing `v: 1` when a link carries no pin.
- **The experiment store:** schema 2 on `main`, 3 on `v2`, which migrates a
  version 2 record forward. A reader who returns to an old build after the
  upgrade has a record the old build does not know.
- **Unchanged against `main`:** lesson progress (schema 2), progress backup
  (version 2), notebook entries (version 1) and the share link (version 1).

**The mitigations:**
- **Merge `main` into `v2` often,** so the release merge is small in what it
  adds and nothing on `main` is lost.
- **Keep readers for old formats.** Every new format keeps a reader for the
  version before it, and a format change that old builds cannot read is a
  major version (RELEASING.md's version policy). Roadmap II's Prompt 61
  enforces this with a test.
- **Check compatibility at the checkpoints.** 48, 58, 81, 99 and 113 each check
  that a browser holding `main`'s stored keys opens `v2` without loss: progress,
  experiments, notebook and assignments.

**When Carl might reconsider an interim release:**
- when a saved-state change would otherwise sit unreleased for more than one
  checkpoint;
- when `main` needs a fix that `v2` has already made (today: lesson-prose
  entities, #82; submission grading, #80);
- when the commit count ahead of `main` passes about 1,000.

None of these is a trigger that acts on its own. Each is a question for Carl.
