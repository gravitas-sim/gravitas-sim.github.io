# Owner actions before v1.0.0

Everything on this list needs a decision, a credential, or an account only the
project owner has. None of it can be done by a script or by a contributor, which
is why it is a separate file from [`RELEASING.md`](RELEASING.md) — that one is
the procedure, this one is the set of things the procedure waits on.

Nothing here has been done. Nothing in this repository has been tagged,
released, deposited or announced.

## Decisions

- [ ] **Confirm the version number is `1.0.0`.** `1.0.0` is a claim that the
      interfaces are stable enough that breaking them would be a major version.
      `0.9.0` is honest if you expect to break things. Goes in `RELEASE.version`
      in `tools/project-metadata.mjs`.
- [ ] **Choose the release date.** The date the GitHub release is created, not
      the date the metadata was edited. `RELEASE.dateReleased`, `YYYY-MM-DD`.
- [x] **Confirm the content license.** CC BY 4.0 for the original educational
      text and graphics, MIT for the software — decided, and implemented in
      [`LICENSES.md`](LICENSES.md), [`NOTICE`](NOTICE) and
      [`LICENSE-CC-BY-4.0.md`](LICENSE-CC-BY-4.0.md).
- [x] **Choose the Zenodo workflow.** Workflow A, the GitHub–Zenodo integration.
      Documented in [`RELEASING.md`](RELEASING.md), including the consequence:
      the commit that records the DOI is not inside the archived tag.

## Zenodo

- [ ] **Verify the GitHub–Zenodo integration is live** *before* tagging. Log in
      to Zenodo, open the GitHub settings page, and confirm the toggle for
      `gravitas-sim/gravitas-sim.github.io` is on. A tag pushed to a repository
      Zenodo is not watching archives nothing, and the only fix is another
      release.
- [ ] **After the release: record both DOIs.** The version DOI and the concept
      DOI go into `RELEASE.doi` and `RELEASE.conceptDoi`, then
      `npm run docs:sync`, then commit. They are different identifiers and they
      are not interchangeable — see "Two DOIs" in
      [`RELEASING.md`](RELEASING.md).
- [ ] **Check the Zenodo record's metadata** after it appears. It is built from
      `.zenodo.json` in the archive, so it should be right, but the author
      affiliation and the ORCID are worth looking at once with your own eyes.

## GitHub repository settings

- [ ] **Description.** Something a person scanning search results can act on.
      Suggested: *An interactive astrophysics sandbox and 22 guided
      investigations for introductory astronomy. Runs in a browser, no install.*
- [ ] **Homepage.** `https://gravitas-sim.online`
- [ ] **Topics.** Suggested: `astronomy`, `astronomy-education`,
      `physics-education`, `science-education`, `simulation`,
      `nbody-simulation`, `orbital-mechanics`, `exoplanets`,
      `open-educational-resources`, `oer`, `javascript`, `webgl`.
- [ ] **Branch protection on `main`.** Require the CI checks to pass before
      merge. The repository deploys continuously from `main`, so an unprotected
      default branch means any push is a publication.
- [ ] **Enable private vulnerability reporting.** [`SECURITY.md`](SECURITY.md)
      points at it, and the link is inert until it is switched on in
      Settings → Security.
- [ ] **Decide whether to enable Discussions.** [`SUPPORT.md`](SUPPORT.md) says
      "if discussions are enabled"; either enable them or edit that sentence.

## The release itself

- [ ] **Create the tag and the GitHub release.** The procedure is
      [`RELEASING.md`](RELEASING.md) §5. Do not do this until the gate is green
      on the exact tree being tagged.

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
- [ ] **Insert the version DOI into the papers** once minted — the version DOI,
      with the version number, not the concept DOI. The reason is in
      [`RELEASING.md`](RELEASING.md).
- [ ] **Decide the arXiv/JOSE split.** [`paper.md`](paper.md) is the short JOSE
      paper: need, design, functionality, adoption. The longer arXiv manuscript
      is a separate document and is not in this repository.

## Instructor materials

- [ ] **Decide who gets the instructor passphrase, and how.**
      [`SUPPORT.md`](SUPPORT.md) says to email you for it. If that does not
      scale, decide what replaces it before the paper is published rather than
      after.
- [ ] **Rebuild and commit the instructor bundle** whenever instructional
      content changes. `npm run instructors:check` says whether it is current
      and needs no passphrase; rebuilding needs the real one.
