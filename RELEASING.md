# Releasing Gravitas

Gravitas deploys continuously: `main` is what <https://gravitas-sim.online>
serves, and every merge is live. A *release* is a different thing — a tagged,
archived, citable point in that history — and this is the checklist for making
one.

**There has been no release yet.** No tag, no GitHub release, no DOI. Until
there is, `CITATION.cff` and `.zenodo.json` deliberately carry no `version` and
no `date-released`: a citation file that names a version nobody can check out
is worse than one that names none.

## This document, and the other one

Two files describe two halves of one process, and neither is the whole of it.

- **This file** is the *release*: choosing a version, cutting a tag, publishing
  it, letting Zenodo archive it, recording the DOI it mints.
- **[`RELEASE.md`](RELEASE.md)** is the *deployment*: how a commit on `main`
  becomes the live site, what the gate refuses to publish, how to tell what is
  live, and how to roll back. It also owns the instructor-bundle rebuild.

They meet at step 5 below. A release is a tag on a commit that is already
deployed and already verified, so the deployment half happens first — pushing
is not the last step before tagging, it is several steps before it.

## Before you start: the decisions a tool cannot make

`npm run release:check` reports these and will not invent any of them.

| Decision | Where it goes | Notes |
| --- | --- | --- |
| **Version number** | `RELEASE.version` in `tools/project-metadata.mjs` | The first release is `1.0.0` only if you mean it. `0.x` is honest for software that expects breaking changes. |
| **Release date** | `RELEASE.dateReleased` | The date of the GitHub release, in `YYYY-MM-DD`. Not the day you edited the file. |
| **ORCID** | `AUTHORS[].orcid` in the same file | A real `https://orcid.org/…` URL or nothing. |
| **DOI** | `RELEASE.doi` and `RELEASE.conceptDoi` | Two of them, and they mean different things — see below. Minted by Zenodo *after* the GitHub release exists, and filled in afterwards in a follow-up commit. |
| **Content license** | `CONTENT_LICENSE` in the same file | `CC-BY-4.0`. Settled; [`LICENSES.md`](LICENSES.md) says what it covers. |

## Two DOIs, and they are not interchangeable

Zenodo mints two identifiers for an archived repository, and a paper that cites
the wrong one is making a different claim than its author intended.

| | What it identifies | Resolves to |
| --- | --- | --- |
| **Version DOI** | one immutable deposit — the files as they were at `v1.0.0`, and nothing else | that exact archive, forever |
| **Concept DOI** | Gravitas as a project, across every version | whichever version is newest at the moment someone clicks |

**For a paper describing v1.0, cite the version DOI, and give the version
number with it.** A paper is a fixed account of a fixed thing: the reader has to
be able to get the software the paper describes, and only the version DOI
promises that. A concept DOI in the same position quietly means "whatever this
has become since", which will eventually not be what was reviewed.

The concept DOI is worth giving *as well*, once, as the place to find the
current release — a sentence in the software-availability paragraph, not the
identifier in the reference list.

    Ziegler, C. (YYYY). Gravitas (version 1.0.0) [Software].
    Zenodo. https://doi.org/<version DOI>

    The latest release is archived at https://doi.org/<concept DOI>.

Both are filled into `RELEASE.doi` and `RELEASE.conceptDoi` in
`tools/project-metadata.mjs`. Neither has a placeholder anywhere in this
repository and neither should ever get one: a DOI-shaped string that does not
resolve is worse than a blank, because a blank is obviously unfinished and a
fake is not.

## Which Zenodo workflow

There are two, they differ in one respect that matters, and the choice has been
made for v1.0: **workflow A.**

### A. GitHub–Zenodo integration — *the one being used*

Zenodo watches the repository and archives each GitHub release automatically.

1. Finalize the v1.0 metadata (step 1 below).
2. Create and push the `v1.0.0` tag.
3. Create the GitHub release from that tag.
4. Zenodo archives it and mints both DOIs.
5. Update the Zenodo record's metadata if anything needs it — Zenodo reads
   `.zenodo.json` from the archive, so normally nothing does.
6. Record both identifiers in a follow-up commit (step 6 below).

**The thing to be plain about:** that follow-up commit is *not* in the archived
`v1.0.0`. The tag was created before the DOI existed, so the deposit Zenodo
holds contains `doi: null`. This is not a mistake and it is not fixable within
this workflow — it is the consequence of letting Zenodo mint the identifier from
the release. The repository will say what the DOI is; the archive of v1.0.0 will
not. Anyone comparing the two should know why.

Chosen anyway because it is the workflow with the fewest manual steps and the
fewest ways to publish the wrong bytes, and because the archive's *content* is
what a reader needs from it.

### B. Reserved DOI and manual deposit

The alternative, for a release where the DOI must be inside the archive — a
journal that requires it, for instance.

1. Create a Zenodo draft deposit.
2. Reserve the version DOI on that draft, without publishing.
3. Put the reserved DOI into `RELEASE.doi` and regenerate `CITATION.cff` and
   `.zenodo.json`.
4. Run `npm run release:check` and `npm run archive:check` against that tree.
5. Tag it, and create `git archive` of the exact tag.
6. Upload that archive to the draft.
7. Publish the record. The reserved DOI becomes live and the concept DOI
   appears alongside it.

Every step is manual and step 6 is the one to be careful with: the file uploaded
has to be the archive of the tag, not of a working tree that has moved on.
`npm run archive:check -- --commit v1.0.0` builds and checks exactly that.

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
npm run manifest                # lesson-card manifests and filter metadata
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

### 5. Push, and wait for the deployment

A tag names a commit. Tag one that has not been through CI and you have an
archived release nobody has verified, so the push and the deploy come first:

```bash
git push origin main
```

Then, in order:

1. **Every required CI job passes.** Actions → the run for your commit. The
   aggregate `CI` job is the one that matters; `Deploy to Pages` runs only if
   it is green.
2. **The site is serving that commit.**

   ```bash
   curl -s https://gravitas-sim.online/deployed-revision.json
   ```

   `commit` must be the SHA you are about to tag. If it names an earlier one,
   the deploy has not finished or has not run — [`RELEASE.md`](RELEASE.md) has
   the failure modes.
3. **The site works.** Open it: the sandbox loads, an investigation opens, the
   service worker activates, the instructor portal asks for its passphrase and
   accepts it.

Only once all three hold does the commit deserve a tag.

### 6. Tag and release

```bash
git tag -a v1.0.0 -m "Gravitas 1.0.0"
git push origin v1.0.0
```

Then create the GitHub release from that tag. The repository is connected to
Zenodo (workflow A), so the release triggers the deposit and Zenodo mints both
DOIs. Check that the connection is actually live before tagging — it is on the
owner-actions checklist in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) for that
reason, because a tag
pushed to a repository Zenodo is not watching archives nothing and the fix is
another release.

### 7. Record the DOIs

Put both into `RELEASE` in `tools/project-metadata.mjs`:

```js
doi: '10.5281/zenodo.XXXXXXX',        // the version DOI for 1.0.0
conceptDoi: '10.5281/zenodo.YYYYYYY', // the concept DOI for Gravitas
```

Run `npm run docs:sync`, and commit. **That commit is not part of the archived
`v1.0.0`** — see "Which Zenodo workflow" above for why, and say so rather than
letting a reader discover it.

Then put the *version* DOI into the papers, not the concept DOI. See the two
DOIs section for the reason and for the form of the citation.

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
