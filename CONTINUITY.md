# Continuity

How Gravitas survives its maintainer's absence. It has one maintainer, who also
teaches, and the field it belongs to has lost tools that had one (NAAP stopped
development in 2025, JS9 is unmaintained, Trinket shut down in 2026). A teaching
tool an instructor builds a course on has to be able to outlive its author, so
this file says what keeps working without anyone, what a department can do for
itself, and how a second maintainer is added.

It states intent and procedure. It does not make a service-level promise:
[`SUPPORT.md`](SUPPORT.md) is honest that answers come "within a week or two,
usually".

## What does not depend on the maintainer

- **The archive.** Every release is archived on Zenodo through the GitHub–Zenodo
  integration, with a version DOI for the exact release and a concept DOI for
  the whole project (`CITATION.cff`, [`RELEASING.md`](RELEASING.md)). The
  archive holds the full source tree, the teaching material and the
  vendored libraries, under their licenses. If the site and the repository
  both vanished, the latest archived release rebuilds the project.
- **The site needs no service.** It is static files on GitHub Pages: no server
  to run, no database, no account, no tracking. The simulations, the lessons
  and the validation page run from the files alone, offline once loaded
  ([`OFFLINE_AND_LOW_END.md`](OFFLINE_AND_LOW_END.md)). three.js, Chart.js and
  the fonts are vendored into the repository, not fetched from a CDN. The only
  network use beyond the site's own files is the optional lookup of public
  astronomical archives, and that happens only when the user asks for it.
- **The instructor materials are encrypted, not gated.** Because there is no
  server to check a login, they are a ciphertext in the repository that opens
  with a passphrase in the browser ([`RELEASE.md`](RELEASE.md)). A department
  that holds a copy holds the ciphertext too, and the passphrase is the only
  thing it needs from anyone.

## Hosting a copy

The site is the committed tree, published as it is, so a copy is a checkout.
Nothing below needs the maintainer, an account on any service, or a build.

1. Take a release from the archive (the Zenodo record) or a tag of the
   repository, and unpack it.
2. Serve the folder as static files from any host. With Node installed,
   `node tools/static-server.mjs --root . --port 8003` serves it for a trial;
   a department's web server or a file share behind one does the same job.
   Serve it at the root of its own host name.
3. Optionally, `npm ci` then `npm run build` produces the minified production
   bundle in `dist/`, which loads in under half the bytes but has no offline
   copy; the decision to publish the tree and not `dist/` is in
   [`DEPLOY_MODEL_GATE.md`](DEPLOY_MODEL_GATE.md). `npm run build` also builds
   the instructor bundle and so needs the passphrase; `node build.js` alone
   builds `dist/` without it.
4. **A department's own instructor bundle.** Put a passphrase of its own in a
   file named `.instructor-password` (git-ignored) or in
   `GRAVITAS_INSTRUCTOR_PASSWORD`, run `npm run build:instructors`, and serve
   the result. The materials are then encrypted under the department's key, and
   nobody outside it holds it. Choose a long passphrase: the ciphertext is
   public, so its strength is the passphrase's.
5. Read [`SUPPORT.md`](SUPPORT.md) for the browsers that are tested and the
   features that degrade.

## Adding a co-maintainer

The project would be better with a second person. The way it happens:

1. **Who.** Someone who has sent several reviewed changes over at least a few
   months, including something that is not code (a lesson reviewed against the
   physics, a corrected citation, an accessibility fix), who has read
   [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and who understands that a number
   shown to a student is a claim. Teaching experience counts as much as
   programming.
2. **How.** The maintainer invites them; they do not ask to be added. The
   invitation is a pull request that adds a row to
   [`DECISION_REGISTER.md`](DECISION_REGISTER.md) saying who and on what terms,
   so the decision is as visible as any other.
3. **What they get.** Write access to the repository, and review rights over
   every change. Nobody merges their own pull request, the maintainer included
   (BRANCHING.md, INTEGRATION.md). Settings, secrets and the release stay with
   the owner until the owner hands them over, one item at a time, from the
   checklist in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md).
4. **If there is no maintainer.** Anyone may fork under the licenses below.
   There is no reserved right to the project's continuation; the archive and
   this file are what make a fork's start fast.

## What a fork must keep

- **The licenses.** MIT for the software and CC BY 4.0 for the teaching
  material, as [`LICENSES.md`](LICENSES.md) divides them: keep both license
  files, the copyright line, and [`NOTICE`](NOTICE) with every third-party
  attribution (three.js, Chart.js, the fonts under the SIL Open Font License,
  the data packs under their own terms). A file under another license keeps that
  license when it is moved.
- **Attribution.** CC BY 4.0 asks that the teaching material credit the
  original and say what was changed.
- **Honest names.** A fork that changes the physics, the lessons or the
  validation should not present itself as Gravitas at `gravitas-sim.online`.
  Rename it; change the title, `CITATION.cff` and `.zenodo.json`, the `CNAME`
  and the support contact; do not reuse the DOIs. A change to a number a student
  sees should be said in the fork's own validation page, which is the part of
  this project a fork has the strongest reason to keep.
- **Provenance.** Keep [`PROVENANCE.md`](PROVENANCE.md)'s records and the
  validation evidence with the code they describe, or say what no longer applies.

## The bus-factor review

Some things only the current maintainer holds: the owner account of the GitHub
organization, the domain and its DNS, the Zenodo integration, the instructor
passphrase, the maintainer's email, which is where support and the passphrase
requests go. The review of each, what would go wrong without it and what to
do about it, is a checklist in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md). It names
what exists and who can reach it, and never contains a secret.
