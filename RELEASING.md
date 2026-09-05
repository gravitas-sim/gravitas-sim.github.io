# Releasing Gravitas

Gravitas deploys continuously: `main` is what <https://gravitas-sim.online>
serves, and every merge is live. A *release* is a different thing — a tagged,
archived, citable point in that history — and this is the checklist for making
one.

**There has been no release yet.** No tag, no GitHub release, no DOI. Until
there is, `CITATION.cff` and `.zenodo.json` deliberately carry no `version` and
no `date-released`: a citation file that names a version nobody can check out
is worse than one that names none.

## Before you start: the decisions a tool cannot make

`npm run release:check` reports these and will not invent any of them.

| Decision | Where it goes | Notes |
| --- | --- | --- |
| **Version number** | `RELEASE.version` in `tools/project-metadata.mjs` | The first release is `1.0.0` only if you mean it. `0.x` is honest for software that expects breaking changes. |
| **Release date** | `RELEASE.dateReleased` | The date of the GitHub release, in `YYYY-MM-DD`. Not the day you edited the file. |
| **ORCID** | `AUTHORS[].orcid` in the same file | A real `https://orcid.org/…` URL or nothing. |
| **DOI** | `RELEASE.doi` and `RELEASE.conceptDoi` | Minted by Zenodo *after* the GitHub release exists. Filled in afterwards, in a follow-up commit. |

## The checklist

### 1. Decide the version, and say so in one place

Edit `tools/project-metadata.mjs`:

```js
export const RELEASE = {
  version: '1.0.0',
  dateReleased: '2026-09-12',
  doi: null,        // filled in after Zenodo mints it
  conceptDoi: null,
};
```

Nothing else needs editing. `CITATION.cff` and `.zenodo.json` are generated
from that file, and `package.json`'s `version` is checked against it.

### 2. Regenerate everything derived

```bash
npm run docs:sync -- --full     # counts, facts.tex, CITATION.cff, .zenodo.json
npm run manifest                # the lesson-card manifests
npm run vendor                  # only if a vendored dependency moved
npm run manual                  # the user manual's generated tables
```

### 3. Write the changelog entry

Move everything under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) into a
new `## [x.y.z] - YYYY-MM-DD` section, leave `Unreleased` empty, and add the
comparison link at the bottom.

### 4. Run the check

```bash
npm run release:check
```

It runs every validation, confirms the metadata files agree with each other and
with `package.json`, and confirms nothing generated is stale. It does **not**
create a tag, a release or a DOI.

### 5. Tag and release

```bash
git tag -a v1.0.0 -m "Gravitas 1.0.0"
git push origin v1.0.0
```

Then create the GitHub release from that tag. If the repository is connected to
Zenodo, the release triggers the deposit and Zenodo mints the DOI.

### 6. Record the DOI

Put the version DOI and the concept DOI into `RELEASE` in
`tools/project-metadata.mjs`, run `npm run docs:sync`, and commit. The concept
DOI is the one to put in a paper: it always resolves to the newest version.

## Why the two metadata files are generated

Zenodo reads `.zenodo.json` in preference to `CITATION.cff` when both are
present. A repository whose CFF is correct and whose Zenodo file is stale will
therefore archive the stale metadata, and nothing will report it — the DOI is
minted, the record looks fine, and the abstract is a year out of date.

Both are generated from `tools/project-metadata.mjs`, and
`tools/validate-citation.mjs` checks that they still say the same things.

## What is deliberately *not* automated

- **Minting a DOI.** It is not reversible and it is not a script's decision.
- **Choosing the version number.** Semantic versioning is a claim about
  compatibility, which only a person can make.
- **The release date.** It is a fact about the world, not about the repository.
