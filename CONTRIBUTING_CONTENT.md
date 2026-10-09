# Contributing content

How an instructor or researcher outside the Gravitas team gets an
investigation, a scenario, a course or a dataset listed in the
[catalog](CATALOG.md). This is the path for content. For code, see
[CONTRIBUTING.md](CONTRIBUTING.md).

What you contribute is a **package**: a directory with a
`gravitas-extension.json` manifest, built with the [SDK](sdk/README.md). A
package is declarative, which means data and text and never script. An
instrument or anything else that runs code is a different path (the SDK's
"Vendoring"), and the catalog never serves it.

## The five steps

1. **Scaffold.** `npm run sdk -- init <investigation-pack|scenario-pack|course-pack|data-pack> <id>`
   writes `extensions/<id>/`. The Studio's composers (`/studio/`,
   `/studio/lesson/`, `/studio/course/`) write the files for you.
2. **Write it, validate and test it.**
   `npm run sdk -- validate extensions/<id>` and `npm run sdk -- test extensions/<id>`.
   Made it in the Composer, the course builder or the Scenario Studio? Do not
   copy the file by hand: `npm run sdk -- init investigation-pack <id> --from
   <your-file>.json --author "<name>"` writes the package, manifest and README
   for you (also `course-pack` and `scenario-pack`; sdk/README.md, "Make a
   Package from a pack").
3. **Run the review yourself.** `npm run sdk -- review extensions/<id>`
   runs the checks a maintainer's tooling will run and prints the questions a
   person will answer. A package that fails here is not ready.
4. **Open a pull request** with `extensions/<id>/` and nothing else, and say
   in it where the content came from, who should be credited and how, and
   whether you agree to the terms under "What acceptance means".
5. **A maintainer reviews it,** accepts it by adding it to
   `catalog/curation.json` and running `npm run catalog`, which packs the
   archive and records the review. You are credited under Contributed on
   [/catalog/](catalog/index.html).

## Requirements

**License.**
- Text you wrote (an investigation, a scenario's words, a course's notes) is
  **CC BY 4.0**, the license of Gravitas's own teaching material. A package
  declares it in `licenses`, for every file.
- Data is under a license the catalog accepts: CC BY 4.0, CC0 1.0, MIT, or
  public domain for NASA mission data. Anything else is refused until
  CATALOG.md says why it belongs.
- You hold the rights to everything in the package, or each third-party item
  states the license that lets it be here. Do not include a figure, a table or
  a passage from a textbook or a paper.

**Provenance.**
- A data package pins its raw source by URL, size and SHA-256, cites it, and
  states a scientific check `sdk test` runs against a published value.
- Every other package has a `README.md` with an **Author** line (who wrote it,
  in the words you want printed) and a **Sources** line (what it is based on;
  "original work" is a complete answer).

**No personal data.** No student, class, school or other person is
identifiable. No email address, phone number, identifier or secret appears in
any file, in the README either. The only name is the attribution you chose.

**Languages.** English and Spanish both, in every string, or one language
declared in the package's `locales` and said in its README. A package that
declares both has both in its title. Gravitas never machine-translates a
package.

**Accessibility notes.** Meaning is never carried by color alone; every figure
and table is described in words; the text is plain at the level it states.

**Scientific claims** are checked against the [model page](model/index.html)
and the sources you cite. A claim Gravitas's model does not support is removed
or said to be outside it.

## The review checklist

`sdk review` runs the first six and prints the rest. The same function runs in
`npm run catalog` and in CI, so the answer is the same everywhere.

| Check | Mechanical | What it holds |
|---|---|---|
| `validate` | yes | the SDK's validation, with no errors |
| `tests` | yes | `sdk test` passes |
| `licenses` | yes | every license is accepted, authored text is CC-BY-4.0, every declared file is covered; the inventory is printed |
| `provenance` | yes | a data package cites its sources; any other has the README's Author and Sources |
| `locales` | yes | both languages in the title and the content, or one declared |
| `content` | yes | no email, phone, national identifier, secret, script or code file; the archive fits the install limits (4 MB packed, 16 MB unpacked, 64 files) |
| claims | person | scientific claims checked against the model page and the cited sources |
| rights | person | the author holds the rights, or each third-party item is covered |
| personal | person | nobody is identifiable beyond the stated attribution |
| accessibility | person | the notes above |
| Spanish | person | read by someone who reads Spanish, or one language declared and accepted |
| interest | person | the reviewer's conflict of interest, stated |
| attribution | person | the credit is the author's own words and they agree to it being archived |
| versioning | person | a changed package has a new version; a breaking change a new major |

## The acceptance record

The maintainer's acceptance is an entry in `catalog/curation.json`. For a
contributed package `npm run catalog` refuses the entry unless it holds:

- `origin: "contributed"` and `attribution`: the author's own words, in
  English and, if they gave it, Spanish;
- `review.date`, `review.checks`, `review.reviewer`, and `review.interest`
  (`"none"`, or what the interest is);
- `review.confirmed`: the id of every human item above, each answered;
- `history`: an entry for every version listed, `{ version, date, change: { en, es? } }`.

The generator adds `review.mechanical`, the checks the package passed. Nothing
else is written by hand. A pull request that edits only the curation cannot
skip a rule: the same refusal is in `npm run catalog:check`.

## What CI does

On every run, `npm run catalog:check` holds each entry to the repository and
`npm run catalog:review` reviews each archive in `catalog/packages/`. On a
pull request, `catalog:review` is given the base and names the archives the
branch adds, writing the checklist, human items included, to the job summary.
An archive no catalog entry names fails `catalog:check`.

## Versioning and deprecation

- A change to an accepted package is a **new version**, with a `history`
  entry. A change that breaks what names it (an investigation id an
  assignment pins, a data package's columns) is a **new major version** and
  says so in its migrations.
- Assignments pin the package and its version, so an older link says what
  changed (CATALOG.md, "Updates, migrations and old assignments").
- A package may be marked deprecated in its README and the next version's
  `history` for at least one minor version before it is withdrawn, unless it
  must go at once (below).

## Withdrawing a package

An author may ask to withdraw a package at any time, and a maintainer may
withdraw one for a license, privacy or accuracy problem. Withdrawing:

1. moves its entry from `extensions` to `withdrawn` in `catalog/curation.json`
   with `id`, `version`, `type`, `title`, `origin`, `attribution`, the
   `history`, and `withdrawn: { date, reason: { en, es? } }`;
2. deletes `extensions/<id>/`;
3. runs `npm run catalog`, which keeps a tombstone entry, removes the archive,
   and bumps nothing else.

Nobody can install a withdrawn package. A reader who already installed it
sees it on /catalog/ with the date and the reason, keeps a copy that works,
and can remove it; it will not be updated. A reader who never installed it
does not see it. The history stays in the repository and in the archives it
was already part of (below).

## What acceptance means

- Your package is listed under **Contributed** with the attribution you gave,
  the review date and its history.
- It is served from this site, under the license you declared.
- It enters the **Zenodo archive** with the release that follows, so it is
  cited and preserved with Gravitas. An archived release is permanent:
  withdrawing a package removes it from the site and the catalog, not from a
  version already archived. Say no in the pull request if you do not agree.
- Accepting it implies no endorsement of its conclusions beyond what the
  review checked. It may be corrected, or withdrawn, when the model changes.

[OWNER_ACTIONS.md](OWNER_ACTIONS.md) has the maintainers' side: who may
accept, how long review takes, conflicts of interest and attribution.
