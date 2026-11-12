# Continuity

How Gravitas survives its maintainer's absence. It has one maintainer, who also
teaches, and the field it belongs to has lost tools that had one (NAAP's home site
says development stopped in April 2025, and its Flash simulations now run only
under the Ruffle emulator; JS9's project site lists 3.8, of 21 June 2022, as its
maintainer's last release, announcing the end of active development on 1 July
2022; Trinket announced in March 2026 that it would close and had shut down by
31 August 2026; all read on 2026-10-17, from the projects' own pages and, for Trinket, a news report). A teaching
tool an instructor builds a course on has to be able to outlive its author, so
this file says what keeps working without anyone, what a department can do for
itself, and how a second maintainer is added.

It states intent and procedure. It does not make a service-level promise:
[`SUPPORT.md`](SUPPORT.md) is honest that answers come "within a week or two,
usually".

## What does not depend on the maintainer

- **The archive.** A release made through the GitHub–Zenodo integration is
  archived on Zenodo, with a version DOI for the exact release and a concept
  DOI for the whole project (`CITATION.cff`, [`RELEASING.md`](RELEASING.md)).
  The archive holds the full source tree, the teaching material and the
  vendored libraries, under their licenses. As of 2026-11-12 the latest archived
  release is 2.0.0 (tagged 2026-10-16). Release 2.1.0 (tagged 2026-10-24) and
  `v3.0` (annotated, tagged 2026-11-12, commit `f9277ff8`) are plain git tags
  with no GitHub release and no version DOI, so neither is in the archive;
  the work since 2.0.0 is in the repository only. If the site and the repository
  both vanished, the latest archived release, 2.0.0, rebuilds the project as it
  was then, not as it is. Anyone who still has a clone or GitHub's tag zipball
  of `v3.0` has the current tree; [`RELEASING.md`](RELEASING.md), "Recovering
  from `v3.0`", says how to take and check it.
- **The site needs no service.** It is static files on GitHub Pages: no server
  to run, no database, no account, no tracking. The simulations, the lessons
  and the validation page run from the files alone, offline once loaded
  ([`OFFLINE_AND_LOW_END.md`](OFFLINE_AND_LOW_END.md)). three.js and
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
   repository, and unpack it. The newest Zenodo archive is 2.0.0; for the
   current tree take the tag `v3.0` (RELEASING.md, "Recovering from `v3.0`").
2. Serve the folder as static files from any host. With Node installed,
   `node tools/static-server.mjs --root . --port 8003` serves it for a trial;
   a department's web server or a file share behind one does the same job.
   Serve it at the root of its own host name.
3. Optionally, `npm ci` then `npm run build` produces the minified production
   bundle in `dist/`, which loads in under half the bytes but has no offline
   copy; the decision to publish the tree and not `dist/` is in
   [`DEPLOY_MODEL_GATE.md`](DEPLOY_MODEL_GATE.md). `npm run build` also builds
   the instructor bundle and so needs the passphrase; `node build.js` alone
   builds `dist/` without it. A build also rewrites the tracked
   `social-card.png` (its bytes depend on the Node version's zlib); do not
   commit that.
4. **A department's own instructor bundle.** Put a passphrase of its own in a
   file named `.instructor-password` (git-ignored) or in
   `GRAVITAS_INSTRUCTOR_PASSWORD`, run `npm run build:instructors`, and serve
   the result. The materials are then encrypted under the department's key, and
   nobody outside it holds it. Choose a long passphrase: the ciphertext is
   public, so its strength is the passphrase's. The numbered procedure, with a
   rehearsal step and the test that a bundle under one passphrase does not open
   with another, is in [`INSTRUCTOR_MATERIALS.md`](INSTRUCTOR_MATERIALS.md).
5. Read [`SUPPORT.md`](SUPPORT.md) for the browsers that are tested and the
   features that degrade.

**What has been shown.** The original agent has rehearsed recovery twice,
alone, on one machine, and neither run is independent evidence: nobody else has
done it. On 2026-10-17 it rebuilt Gravitas from the 2.0.0 Zenodo archive
(checksum checked, served, `npm ci`, `node build.js`, the budgets,
`release:check --fast`, an instructor bundle under a throwaway passphrase
opened in the portal) in about twelve minutes. On 2026-11-12 (Prompt 291) it
repeated that for the 2.0.0 archive and for the `v3.0` tag, the tree as it is:
the tag's zipball is identical to `git archive v3.0`; it unpacks, serves,
works offline after a visit, passes the budgets on Node 22 and 24, passes
`release:check --fast` (41 passed, 0 failed, 23 skipped, with or without a git
repository) and builds an instructor bundle under a throwaway passphrase that
opens the portal and that the committed bundle refuses; Spanish, an
Observatory observation, a FITS image, a composed report and a 3.x-format
record opened in a browser (as scripted tests). The steps, timings and
stumbles are in [`RELEASING.md`](RELEASING.md), "Rehearsing recovery from an
archive". Not shown: anything on a second person's machine, in Firefox or
WebKit, or on the live host beyond reading it. Who besides the owner can
administer the Zenodo record is not known to the repository (UNKNOWN until
Carl confirms it). The instructor passphrase has no second holder: Carl
decided that on 2026-10-21 (INSTRUCTOR_MATERIALS.md, "The second holder"), so if
he is unavailable nobody can issue or rotate it, the deployed bundle keeps
opening for current holders, and a department builds its own (step 4 above).

### If the domain goes away

Read on 2026-11-12, not exercised (doing it would change the live site):

1. The site is published by the Pages workflow, and its custom domain
   (`gravitas-sim.online`) is a repository setting. A `CNAME` file is ignored
   by a workflow deployment (GitHub's Pages documentation), so removing the
   domain is Settings, Pages, Custom domain, Remove, by the repository owner;
   the tree's `CNAME` file can then be deleted in a pull request.
2. The repository is named `gravitas-sim.github.io`, so GitHub serves it at
   the root of `https://gravitas-sim.github.io/`, and the pages' root-absolute
   paths work there. (Today that address answers 301 to the domain. The owner
   `gravitas-sim` is a personal account, not an organization; an earlier
   version of this file said otherwise.)
3. A department hosting its own copy at any host name follows "Hosting a copy"
   above and sets nothing else. The domain's registrar and DNS holder are not
   known to the repository (UNKNOWN until Carl records them).
4. What still names `gravitas-sim.online` in a copy: the canonical and Open
   Graph tags, `sitemap.xml` and `robots.txt`, the links printed in the
   instructor documents (`SITE` in `js/instructorDocs.js`), the default of
   `activityLaunchUrl` and one placeholder string. A fork changes them with
   its host name.
5. **The Compute page does not work on another host.** Its sandboxed frame
   answers a page only of `https://gravitas-sim.online` or a loopback address
   (`js/compute/origin.js`, `compute-frame/index.html`, COMPUTE.md, "Who the
   frame answers"). Everything else runs from the files alone. A department
   that wants Compute needs its own frame and a change to both lists.

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
   checklist in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md). The repository belongs
   to a personal GitHub account, and a personal account's repository, as
   third-party summaries of GitHub's rules put it, has an owner and
   collaborators and nothing in between; if that holds, a co-maintainer can
   push and merge but cannot hold settings, so handing those over means a
   decision first (a successor arrangement, or moving the repository to an
   organization). That decision is the owner's, has not been made, and has not
   been checked against GitHub's own documentation.
4. **Their first day, as rehearsed.** On 2026-11-12 (Prompt 293) the original
   agent performed it alone from an empty directory on one machine, with
   nothing but the public repository and no passphrase: clone, `npm ci`,
   `npm test`, `npm run release:check -- --fast`, and reading
   [`MAINTAINER_ONBOARDING.md`](MAINTAINER_ONBOARDING.md), which has the
   timings and every stumble. They then (a) read this file, that one and
   `DOCUMENTS.md`; (b) read `INTEGRATION.md` and the last page of the
   register; (c) open `OWNER_ACTIONS.md` and learn which items are still the
   owner's; (d) take one small documentation or test change through the queue
   protocol (branch from the train's tip, a labelled pull request, no merge by
   its author). The rehearsal is **not** evidence that a second person can do
   it: nobody else has.
5. **If there is no maintainer.** Anyone may fork under the licenses below.
   There is no reserved right to the project's continuation; the archive and
   this file are what make a fork's start fast.

**Where it stands (2026-11-12).** No second maintainer exists, none has been
invited, and no arrangement for one is recorded beyond the passphrase decision
below. The next step needs a person (Roadmap III, Appendix A, "Second
maintainer"). The table in `OWNER_ACTIONS.md` records, for each thing only the
owner holds, whether it is owner-confirmed or UNKNOWN.

## What a fork must keep

- **The licenses.** MIT for the software and CC BY 4.0 for the teaching
  material, as [`LICENSES.md`](LICENSES.md) divides them: keep both license
  files, the copyright line, and [`NOTICE`](NOTICE) with every third-party
  attribution (three.js, the fonts under the SIL Open Font License,
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

Some things only the current maintainer holds: the personal GitHub account that owns
the repository (and the `gravitas-compute` organization that serves the Compute
frame), the domain and its DNS, the Zenodo integration, the instructor
passphrase, the maintainer's email, which is where support and the passphrase
requests go. The review of each, what would go wrong without it and what to
do about it, is a checklist in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md). It names
what exists and who can reach it, and never contains a secret. Each line is
either owner-confirmed, in Carl's words with a date, or UNKNOWN; as of
2026-11-12 one arrangement is confirmed (there is no second passphrase holder)
and the rest are UNKNOWN. The repository does not infer an arrangement from
what an account page or an API happens to show.
