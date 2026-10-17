# Branching

`main` publishes. Every push to it goes live at
[gravitas-sim.online](https://gravitas-sim.online) through the `deploy` job in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml). That is why work that a
student would notice does not go straight to `main`: it accumulates on a
**train**, and the train reaches `main` in one reviewed promotion.
[`INTEGRATION.md`](INTEGRATION.md) holds the model (which branch takes which
class of change, the active train, the windows); this file is the day-to-day
protocol. (This file was titled "Branching for v2" until `v2` was released and
deleted, 2026-10-16.)

## The protocol

- **Feature branches come off the base their class names** and merge back by
  pull request, never by a direct push: an `invisible` change comes off a green
  `main` tip and targets `main`; a `visible` or `instructional` change comes off
  the active train's green tip and targets the train
  (`train/<version>`, named in INTEGRATION.md). Name branches `feat/<thing>`,
  `fix/<thing>`, `docs/<thing>`, `chore/<thing>` or `refactor/<thing>`.
- **`main` merges into the train** whenever `main` moves, never the reverse
  before promotion. A long-lived branch that diverges quietly is the expensive
  kind.
- **Never rebase a shared branch** and never force push, even before review: a
  pushed branch only ever receives new commits.
- **Every pull request carries a class label** (`invisible` or `visible`), the
  `instructional` flag where it applies, and, for an urgent live-site defect,
  `hotfix`. The `Pull-request class` job enforces them (INTEGRATION.md).
- **A train runs the full suite.** The queue dispatches the engine jobs
  (Firefox and WebKit) on its branch, because they run on `main` pushes.

## Why only `main` can publish

The deploy job is a conjunction:

```yaml
deploy:
  needs: [ci]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

A push to any other branch satisfies the first term and fails the second. A pull
request fails the first. A manual `workflow_dispatch` fails the first. There is
no path through it for any ref but `main`, and `on.push.branches` lists `main`
alone. GitHub resolves a `push` event against the workflow file on the pushed
ref, so `main`'s copy of `ci.yml` governs `main`. The tags and both DOIs are
immutable: nothing on a branch can disturb what has been archived.

## Generated artifacts: regenerate, never hand-merge

These files are build output. Resolving a conflict in one by hand produces a
file that no generator would have produced, which is worse than either side.

The table is written from `tools/generate-graph.mjs`, the list that
`npm run generate` runs in order, so an artifact cannot be missing from it.

<!--fact-block:generatedArtifacts-->
| File | Made by | Notes |
| --- | --- | --- |
| `js/widgets.js` (regions), `js/platform/builtins.js` (regions), `js/data/investigations/registry.js` (regions) | `node tools/capability-registries.mjs` | Regions between `// <generated:NAME>` and `// </generated:NAME>`; the rest of each file is hand-written. A conflict inside one is resolved by regenerating, never by taking a side. |
| `js/platform/catalog.generated.js`, `docs/capabilities.md` | `node tools/capabilities.mjs generate` |  |
| `catalog/catalog.json` | `node tools/catalog.mjs generate` |  |
| `js/data/investigations/manifest.js`, `js/data/investigations/manifest.es.js`, `js/data/investigations/browseData.js` | `node tools/build-investigation-manifest.js` |  |
| `images/investigations` | `node tools/generate-lesson-cards.mjs` |  |
| `compute-frame`, `js/compute/framePin.js`, `js/compute/catalogueHashes.js` | `node tools/compute.mjs` |  |
| `js/data/teachingGenerated.js` | `node tools/build-teaching-demos.mjs` |  |
| `library/library.json` | `node tools/build-library.mjs` |  |
| `teaching/investigation`, `teaching/activity`, `teaching/find`, `teaching/alignment`, `teaching/adopt` | `node tools/build-adoption-pages.mjs` | Whole files, each stamped with the shared shell and its policy as the repository holds it, so shell.mjs --write and csp.mjs --write find nothing to change. |
| `images/scenarios` | `node tools/generate-scenario-thumbnails.mjs` |  |
| `docs/lesson-scene-catalog.json`, `docs/lesson-scene-record.md`, `js/data/investigations/provenance.js` | `node tools/lesson-scene-audit.mjs --write` |  |
| `js/data/irreversible.js` | `node tools/build-irreversibility-audit.mjs` |  |
| `validation/data.json` | `node tools/build-validation-data.mjs` | The physics suite's own output; the `/validation/` page paints from it. |
| `tools/README.md` | `node tools/build-tools-index.mjs` |  |
| `sw-manifest.js` | `node tools/build-service-worker.mjs` | Precache list and version hash. |
| `manual/facts.tex`, `CITATION.cff`, `.zenodo.json` | `node tools/docs-facts.mjs --sync --full` |  |
| `Gravitas_User_Manual.pdf`, `manual/scenarios.tex`, `manual/investigations.tex` | needs a LaTeX engine (npm run manual) |  |
| `instructors/materials.enc.json`, `instructors/materials.manifest.json` | needs the instructor passphrase (npm run build:instructors) | **Conflicts on every merge, by design.** Fresh salt and IV per build, so the ciphertext differs in every byte even when the content is identical. Check `materials.manifest.json`'s digest to see whether anything actually changed. |
| `e2e/golden/world-construction.json` | needs a deliberate decision (GRAVITAS_UPDATE_WORLD_GOLDEN=1, e2e/README.md) | Regenerate only deliberately — a change here means behaviour moved, not that a file went stale. |
<!--/fact-block-->

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
| `js/validation/physicsChecks.js` | Hand-written, and the file two branches will both append a validation group to |
| `js/widgets.js`, `js/platform/builtins.js`, `js/data/investigations/registry.js` | Hand-written code around the lazy registries (`// <generated:NAME>` regions); a conflict inside a region is resolved by `npm run registries`, not by a side |

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

## After a train is promoted

The merge into `main` is Carl's action (INTEGRATION.md, "Promotion of a
train"). Afterwards the owner deletes the train branch and any merged `feat/*`
branches; nobody else deletes a branch. `RELEASING.md` has the tag, the Zenodo
record and the DOI steps.

## Working on a candidate

The ranked docket of proposals is a published artifact rather than a file in
this repository. Each item names its own branch.
