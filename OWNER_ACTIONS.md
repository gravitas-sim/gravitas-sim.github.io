# Owner actions

Everything on this list needs a decision, a credential, or an account only the
project owner has. None of it can be done by a script or by a contributor, which
is why it is a separate file from [`RELEASING.md`](RELEASING.md) — that one is
the procedure, this one is the set of things the procedure waits on.

**v1.0.0 is released.** Tagged, published and archived on 2026-09-16:

| | |
| --- | --- |
| Tag | `v1.0.0` → commit `9148f9e4296f6010293056303e7c6b10d87add1f` |
| Release | <https://github.com/gravitas-sim/gravitas-sim.github.io/releases/tag/v1.0.0> |
| Zenodo record | <https://zenodo.org/records/22800610> |
| Version DOI | [10.5281/zenodo.22800610](https://doi.org/10.5281/zenodo.22800610) |
| Concept DOI | [10.5281/zenodo.22800609](https://doi.org/10.5281/zenodo.22800609) |

What remains below is the work the release did *not* do: the papers, the
repository settings, and how the instructor passphrase is distributed. A ticked
box here means the thing is done and verified, not merely decided.

## Decisions

- [x] **Confirm the version number is `1.0.0`.** Confirmed, and it is the claim
      it looks like: the interfaces are stable enough that breaking them would
      be a major version. In `RELEASE.version`, and `package.json` agrees —
      `release:check` verifies that they do.
- [x] **Choose the release date.** `2026-09-16`, the day the GitHub release was
      actually published rather than the day the metadata was written. In
      `RELEASE.dateReleased`, and carried into `CITATION.cff` and
      `.zenodo.json` by the generators.
- [x] **Confirm the content license.** CC BY 4.0 for the original educational
      text and graphics, MIT for the software — decided, and implemented in
      [`LICENSES.md`](LICENSES.md), [`NOTICE`](NOTICE) and
      [`LICENSE-CC-BY-4.0.md`](LICENSE-CC-BY-4.0.md).
- [x] **Choose the Zenodo workflow.** Workflow A, the GitHub–Zenodo integration.
      Documented in [`RELEASING.md`](RELEASING.md), including the consequence:
      the commit that records the DOI is not inside the archived tag.

## Zenodo

- [x] **Verify the GitHub–Zenodo integration is live.** Confirmed on Zenodo's
      GitHub settings page before the release was published, and the webhook
      then delivered: `release/released` returned `202 Accepted` and the record
      existed four seconds later.

      One correction for next time. This said *before tagging*, and tagging is
      the wrong deadline — a tag triggers nothing. Only publishing a release
      does, so the check has to be green before the publish, which is also the
      last moment it is still free to fix.
- [x] **After the release: record both DOIs.** In `RELEASE.doi` and
      `RELEASE.conceptDoi`, with `CITATION.cff`, `manual/facts.tex` and the
      README badge and citation section regenerated from them. `.zenodo.json`
      is deliberately unchanged: it is Zenodo's *input*, so a DOI in it would
      be circular.

      The command is `npm run docs:sync -- --full`. The `--full` is required —
      a cheap sync neither writes nor judges the citation pair, so it will
      leave a new DOI out of `CITATION.cff` while reporting success. This file
      used to say plain `docs:sync`, and it was wrong.
- [ ] **Check the Zenodo record's metadata with your own eyes.** Machine-checked
      already, and all of it agrees with `.zenodo.json`: title, version `1.0.0`,
      publication date `2026-09-16`, resource type Software, license
      `mit-license`, creator *Ziegler, Carl*, ORCID `0000-0002-0619-7639`, the
      SFA affiliation string, and one archived file whose checksum matches
      GitHub's zipball for the tag byte for byte.

      Still worth your own look. A string can be well-formed, present and
      wrong — the affiliation and the ORCID especially, because nothing
      downstream will ever contradict them.

## GitHub repository settings

- [ ] **Description.** Still empty. Something a person scanning search
      results can act on.
      Suggested: *An interactive astrophysics sandbox with guided
      investigations for introductory astronomy. Runs in a browser, no install.*
      (No count: a number pasted into a repository setting is one nothing can
      regenerate.)
- [x] **Homepage.** Set to `https://gravitas-sim.online/`.
- [ ] **Topics.** Still empty. Suggested: `astronomy`, `astronomy-education`,
      `physics-education`, `science-education`, `simulation`,
      `nbody-simulation`, `orbital-mechanics`, `exoplanets`,
      `open-educational-resources`, `oer`, `javascript`, `webgl`.
- [ ] **Branch protection on `main`.** Require the CI checks to pass before
      merge. The repository deploys continuously from `main`, so an unprotected
      default branch means any push is a publication. Still unprotected: the
      API reports `Branch not protected`.
- [ ] **Enable private vulnerability reporting.** [`SECURITY.md`](SECURITY.md)
      points at it, and the link is inert until it is switched on in
      Settings → Security. Still off. Secret scanning and push protection are
      on; Dependabot security updates are not.
- [ ] **Decide whether to enable Discussions.** [`SUPPORT.md`](SUPPORT.md) says
      "if discussions are enabled"; either enable them or edit that sentence.
      They are off, so that sentence currently describes nothing.

## The release itself

- [x] **Create the tag and the GitHub release.** Done for v1.0.0. The annotated
      tag was cut against the exact commit a clean 35-check gate had passed —
      `9148f9e`, pinned by full SHA rather than by `HEAD` — and the release was
      created as a draft, reviewed, then published and marked latest.
      [`RELEASING.md`](RELEASING.md) records what it produced.

## The papers

- [ ] **Fill the marked placeholders in [`paper.md`](paper.md).** Each is an
      HTML comment beginning `OWNER:`. They are: the submission date, the
      classroom-evaluation sentence, the funding award number if one exists, the
      optional development history, and the archive DOI.
- [ ] **State the classroom-evaluation position honestly.** The paper currently
      says no formal classroom deployment has taken place and no learning gains
      have been measured, which is true. If that changes before submission,
      change the paper — but do not describe a planned evaluation as a completed
      one.
- [ ] **Verify [`paper.bib`](paper.bib) against ADS.** The entries were written
      from standard citations rather than exported. Re-export each one and
      replace the file. A DOI that resolves to the wrong paper is not the kind
      of error a reader catches.
- [ ] **Insert the version DOI into the papers.** It is minted and waiting:
      `10.5281/zenodo.22800610`, the *version* DOI, with the version number —
      not the concept DOI. The reason is in [`RELEASING.md`](RELEASING.md).
      `paper.md` still carries the `OWNER:` placeholder for it.
- [ ] **Decide the arXiv/JOSE split.** [`paper.md`](paper.md) is the short JOSE
      paper: need, design, functionality, adoption. The longer arXiv manuscript
      is a separate document and is not in this repository.

## Instructor materials

- [ ] **Decide who gets the instructor passphrase, and how.**
      [`SUPPORT.md`](SUPPORT.md) says to email you for it. If that does not
      scale, decide what replaces it before the paper is published rather than
      after.
Standing, not a box to tick: **rebuild and commit the instructor bundle**
whenever instructional content changes. `npm run instructors:check` says
whether it is current and needs no passphrase; rebuilding needs the real one.
The gate runs that check, `tools/verify-release.mjs` runs it again on the tree
about to be published, and CI runs it on a release ref - so a stale bundle
fails the release rather than shipping quietly.

Not on a pull request into `v2`, though, and that is deliberate: see
[`RELEASE.md`](RELEASE.md). Asking it of every parallel lesson branch would
make each of them red until you rebuilt, and each rebuild conflicts with the
last. If the check says stale after a change that moved no instructional
content, `npm run instructors:restamp` re-states the record without the
passphrase and without touching the ciphertext - it proves the documents are
unchanged first, and refuses if they are not.
