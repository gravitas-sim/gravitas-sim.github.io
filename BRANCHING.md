# Branching for v2

`main` publishes. Every push to it goes live at
[gravitas-sim.online](https://gravitas-sim.online) through the `deploy` job in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml). That is the whole reason
this document exists: work on the next major version needs somewhere to
accumulate for months without any of it reaching a classroom until it is
finished and decided.

That place is **`v2`**.

## The protocol

- **Feature branches come off `v2`**, named `feat/<thing>`, and merge back into
  `v2` **by pull request**. Never into `main`.
- **`main` merges into `v2`** whenever `main` moves. Do it often; a long-lived
  branch that diverges quietly is the expensive kind.
- **Never rebase `v2`.** It is shared and long-lived and it has its own history
  worth keeping. Rebasing it rewrites commits other branches are cut from.
- **`v2` gets the full suite on every push.** `v2` is listed in
  `on.push.branches`, so all fifteen jobs run — not only when a pull request
  happens to be open.

## Why `v2` cannot publish

Worth stating precisely rather than trusting, because the whole arrangement
rests on it. The deploy job is a conjunction:

```yaml
deploy:
  needs: [ci]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

A push to `v2` satisfies the first term and fails the second. A pull request
fails the first. A manual `workflow_dispatch` fails the first. There is no path
through it for any ref but `main`.

Two further facts make this stable rather than merely true today. GitHub
resolves a `push` event against the workflow file **on the pushed ref**, so
`main`'s copy of `ci.yml` governs `main` and nothing on `v2` can change that.
And the `v1.0.0` tag, its GitHub release, and both DOIs are immutable: nothing
on this branch can disturb what has already been archived.

## Generated artifacts: regenerate, never hand-merge

These files are build output. Resolving a conflict in one by hand produces a
file that no generator would have produced, which is worse than either side.

| File | Notes |
| --- | --- |
| `instructors/materials.enc.json` | **Conflicts on every merge, by design.** Fresh salt and IV per build, so the ciphertext differs in every byte even when the content is identical. Check `materials.manifest.json`'s digest to see whether anything actually changed. |
| `instructors/materials.manifest.json` | Deterministic. If this is unchanged, the bundle's *content* is unchanged. |
| `sw-manifest.js` | Precache list and version hash. |
| `validation/data.json` | The physics suite's own output; the `/validation/` page paints from it. |
| `CITATION.cff`, `.zenodo.json` | Generated from `tools/project-metadata.mjs`. |
| `manual/facts.tex`, `manual/*.tex`, `Gravitas_User_Manual.pdf` | |
| `docs/lesson-scene-catalog.json`, `docs/lesson-scene-record.md` | |
| `js/data/investigations/manifest.js`, `manifest.es.js`, `browseData.js` | |
| `js/data/teachingGenerated.js` | |
| `e2e/golden/world-construction.json` | Regenerate only deliberately — a change here means behaviour moved, not that a file went stale. |

### The files that are NOT on that list, and why it matters

Every file above is rewritten **in full** by a generator, so taking one side is
safe: whatever you pick is about to be overwritten. That is the whole
justification for the shortcut below, and it does not extend one inch further.

A file that merely _contains_ generated regions is not on this list and must
never be resolved with a whole-file choice:

| File | What it also contains |
| --- | --- |
| `README.md` | The project's entire hand-written introduction, with about a dozen fact markers inside it |
| `PHYSICS_VALIDATION.md` | Hand-written methodology around a generated coverage table |
| `model/index.html` | The public physics-model page, with generated blocks inside it |
| `ACCESSIBILITY.md`, `paper.md`, `index.html`, `js/i18n/en.js`, `js/i18n/es.js` | Prose and code around generated facts and attributes |
| `tools/physics-checks.mjs` | Hand-written, and the file two branches will both append a validation group to |

**`git checkout --ours/--theirs <path>` does not mean "take my side of these
hunks."** It restores the whole file from that stage and discards every
non-conflicting change the other side made to it.

During the v1.1 integration that cost `README.md` sixteen lines: the
`/evaluation/` section and the "no evaluation of Gravitas has been run and no
learning gain has been measured" statement, both added by one branch and both
silently dropped by the next merge, which conflicted only on a generated count
elsewhere in the same file. Nothing failed. Every test passed. It was found
afterwards, by diffing each merged branch's contributions against the integrated
tree.

For those files, keep the merged working copy and edit only the marked regions,
or run a real three-way merge and then regenerate:

```bash
git merge-file <ours> <base> <theirs>
```

Verify the result by re-measuring what the file describes — the suite total, the
check count, the rendered page — never by the absence of conflict markers.

On a conflict in one of the fully-generated artifacts above, take either side
and rebuild:

```bash
git checkout --theirs <file> && git add <file>   # either side will do
npm run build:instructors && npm run manifest && npm run cards \
  && npm run teaching:data && npm run audit:scene -- --write \
  && npm run manual && npm run sw:manifest && npm run validation:data \
  && npm run docs:sync -- --full && npm run format
```

The `--full` on `docs:sync` is not optional. `CITATION.cff` and `.zenodo.json`
quote a fact that only a full run measures, so a cheap sync neither writes nor
judges them and will report success while leaving them stale.

The world golden is the exception: if `e2e/golden/world-construction.json`
conflicts, that is a signal, not a chore. Two branches changed physics. Resolve
the physics first.

## Rolling out

When `v2` is complete and you have decided it is a release:

1. **Merge `main` into `v2` one last time** and regenerate. The merge into
   `main` should be a fast-forward-shaped merge of a branch that already
   contains everything on `main`.
2. **Run the full gate on the merged tree** — `npm run release:check`, with
   nothing else running on the machine. Port contention on 4173 makes a
   concurrent run's failures fiction.
3. **Remove `v2` from `on.push.branches`** in `ci.yml`. It has no meaning once
   the branch is gone, and leaving it means a future branch of that name would
   silently run CI.
4. **Merge `v2` into `main`.** This is the moment it goes live; the deploy job
   fires on that push.
5. **Verify the deployment** — `deployed-revision.json` must name the merge
   commit — and smoke the live site before going further.
6. **Then tag**, following [`RELEASING.md`](RELEASING.md). Not before: the tag
   should name a commit that has been published and checked.
7. **Delete `v2`** and any merged `feat/*` branches.

## Working on a candidate

The ranked v2 docket — twenty refereed proposals, each with the experiment that
decides it — is a published artifact rather than a file in this repository.
Each item names its own branch.
