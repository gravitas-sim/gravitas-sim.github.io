# Instructor materials v2

Roadmap II, Prompt 79. The generated guides and keys, regenerated for the
platform as it is now: both languages, per investigation, per depth and per
Activity template, inside the static encryption model (no server, one
passphrase, ciphertext in the repository).

## The inventory

540 documents, from 66. The counts below are what `renderDocuments` makes today
and what `tests/instructorDocs.test.js` holds; the manifest's own `inventory`
is written by a real build (Carl's, or the merge queue's rebuild on a train).

| Cut | English | Spanish | Notes |
|---|---|---|---|
| General (adopter's guide, curriculum map, four observatory, 3-D and mission guides with their keys) | 10 | 0 | English only; see Staged |
| Investigation guide (60) | 60 | 60 | Spanish: headings, the lesson's own words, the prose that has a shadow |
| Investigation key, every depth (60) | 60 | 60 | |
| Key per depth (35 lessons with deeper steps, 3 depths) | 105 | 105 | `<id>-key-<depth>`: numbered as that student sees it |
| Key per Activity format (6 formats) | 6 | 6 | `activity-<id>-<format>-key`: cut to the format's steps, numbered as in the full key |
| Activity guide (3) and worksheets (5) | 8 | 0 | English; see Staged |
| Structured notes (60), Prompt 170 | 0 | 60 | `<id>-notes-es`: generated, see "Spanish structured notes" |

`tools/build-instructor-materials.js` writes the counts into
`materials.manifest.json` (`inventory`) on a real build, and
`tests/instructorDocs.test.js` holds them.

## Sources

| What | Where | Keyed by |
|---|---|---|
| Guide prose | `js/data/instructorContent.js` (+ `.es.js` shadow, arrays by index) | lesson id, field |
| Flow table | `js/data/instructorFlow.js` (+ `.es.js`) | lesson id, **step id** (`from`, `to`) |
| Expected observations | `js/data/instructorExpectations.js` (+ `.es.js`) | lesson id, step id |
| Words around them | `js/data/instructorLabels.js` | label key, both languages |
| The lesson in Spanish | `js/data/investigations/es/*`, `depth/es/*` through `js/instructorLocale.js` | |
| Course level, textbook chapter, mathematics, prerequisites, version | `js/instructorFacts.js` from `discovery.js` and the step fingerprints | |

**Flow migration.** The flow table named its steps by a range of 1-based
numbers ("18-22"), which slid onto the wrong screens when a step was inserted
above it. It is `gravitas.instructor-flow/2` now: each block runs from one step
id to another and the printed range is worked out from the lesson.
`js/instructorFlow.js` still reads /1 (a fork's copy) through `readVersioned`;
`tools/migrate-flow.mjs` converted the 171 blocks once. The flow left
`instructorContent.js`, which the portal statically imports, so the portal's
build route went from 649.9 to 536.9 KB.

**Labels are not a message catalog.** The catalogs are deferred JavaScript that
every route's budget counts; the only readers of these words are the build and
the tests (D-TERM-02's reasoning for the document pages). The test holds the two
languages to the same keys and `{placeholders}`.

## Translation status

A Spanish document says how much of it is in Spanish: the lesson's own words
(counted as strings through `translationCoverage`), the instructor prose, and
the expected observations. A string without a shadow prints in English and
counts as not translated. The portal shows the percentage on the button. At the
time of writing no instructor prose is translated (the shadow files are empty);
the lesson shadows are 64 to 100 percent complete, the figure each document
prints. Translating is adding strings to the three `.es.js` files; nothing else
changes.

## Rubrics

A written answer may carry `rubricCriteria` beside its `rubric` sentence: one to
six criteria, each two to five levels, best first, with optional points
(`js/rubric.js`). On a reflection the criteria guide reading and mark nothing.
The key prints a Criterion / Levels table; the review page lists them beside the
response in the written-answers disclosure and in the judgment view (P77).
`rubricProblems()` fails the instructor build, and `tests/instructorDocs.test.js`
runs it over every lesson. Shipped on Orbital Energy's written answer, in both
languages, as the proof; the other written answers keep their sentence.

## The bundle

`materials.enc.json` is `v: 2`: the manifest is gzipped before it is encrypted
(`compress: 'gzip'`), because ciphertext does not compress and 150 documents
would have been an 11 MB download at unlock. The portal reads v1 and v2. The
public manifest and the freshness digest are unchanged in kind.

## Not rebuilt here

`instructors/materials.enc.json` and `materials.manifest.json` were **not**
rebuilt: that needs the real passphrase, which a session never holds. They are
stale by this prompt (`npm run instructors:check` says so) and Carl rebuilds
them with `npm run build:instructors`. Everything else was exercised through the
disposable fixture (`--fixture`, published passphrase, placeholder pages) and
`--validate` (real render, throwaway key, nothing written).

## A key from a pack, in the browser

The author holds the pack, so the key needs no passphrase and nothing leaves the
page. The Composer's Publish card ("Answer key", "Spanish key") and the course
page that opens an investigation's link (`/studio/course/packs/`) download it as a
PDF. `js/composer/packKey.js` is a lazy module (the build keeps it out of both
routes' start-up: it is handed the result of the page's own check rather than
importing the checker, which would have hoisted shared chunks onto every visit);
it lays the key out with `js/answerKeyDocument.js`, the key's layout split out of
`js/instructorDocs.js` so that it does not carry the 360 KB of guide prose. A
faithful remix prints exactly the shipped key (`tests/packKey.test.js` compares
the drawn text). A remix prints the original's expectations by reference, by
step id; a step the author added has none. The Spanish key carries the
translation status: the pack's texts that have Spanish, and the original's
expectations (none are translated yet). No route was added and no ceiling moved.

## Rubric criteria in packs

`rubricCriteria` is on a written answer in `investigation-pack/1` and
`question-bank/1` (both schemas, `sdk/types`, FORMATS.md, the validator, the
compile with its Spanish shadow, and the remix table). A remix carries the
original's criteria, in both languages, and compiles back to them. A pack's
level order is not checked (a lesson's is, by the build): the order is print
layout, not a rule.

## Staged

- Spanish activity guides and worksheets, the adopter's guide and the curriculum
  map (the activity teaching text has a Spanish catalog; the layout does not read it).
- The Spanish instructor prose itself. The structured notes below are what can
  be generated without it; they do not replace it.
- A guide-side accessibility section per investigation is derived (instruments
  docked, the shared statements); a per-lesson audit is not.

## Spanish structured notes (Prompt 170)

One generated page per investigation, in Spanish, kind `notes`, id
`<id>-notes-es`, listed in the portal beside the English guide and key and under
the same filters (the card is the investigation's). `js/instructorNotes.js`
makes it, and only from structured fields: the objectives, the title, the time
band and student level, the prerequisites, the course level, textbook chapter,
mathematics and depths the Library already records (`js/instructorFacts.js`),
the step list numbered as in the full key with each step's kind and its marking
(automatic, shown at a later step, by hand with its criteria, or none), and the
misconceptions the steps name (their identifier and the words the student is
told).

- **Where the Spanish comes from.** The lesson's Spanish shadows
  (`js/instructorLocale.js`), laid over the English as the guides lay them. A
  text a shadow does not supply prints in English with `[EN]` after it, and the
  page counts how many of its texts are Spanish. Nothing is machine-translated
  and nothing is written for the occasion except the page's own labels
  (`notes.*` in `js/data/instructorLabels.js`), short fixed phrases.
- **What stays English.** The hand-written guide prose and every answer key. The
  first line of every page says so, and the page says that nobody fluent in
  Spanish has read it (docs/evidence-status.md: the Spanish is unread).
- **Not a manual.** D-ADOPT-03 declined a Spanish user manual because a second
  hand translation of that length is something nothing would hold to the first.
  These pages hold to their sources by construction: each is regenerated from the
  lesson, and prints two digests (of the English texts and of the Spanish it
  printed) computed by the function the translation-freshness ledger uses
  (TRANSLATION.md), so a reader or a check can compare them.
- **Freshness.** A shadow whose English moved is reported by
  `npm run i18n:freshness`; the notes read that shadow, so they carry the
  staleness until the shadow is fixed and the bundle rebuilt.
- **What is not in them.** Expected observations, answers, tolerances,
  explanations, hints, flow prose, discussion questions: none is generated, so
  none is here.

## Who gets the passphrase, and how (Prompt 170)

This is the distribution policy for the one shared passphrase. It stays inside
the static-encryption model above: no server, no account, no key service, and the
passphrase never appears in the repository, an issue, a pull request, a log, a
chat or a document. The owner's arrangements are recorded as *owner-confirmed*
or `UNKNOWN`, and what is recorded is who, never what. The second holder is
ruled by Carl (2026-10-21, below); every other rule here is a recommendation
adopted under his standing rule to go with the recommendation (D-R10-43), until
he reviews it.

### The request

Who may ask: a person who teaches or supports teaching a course, or a department
that wants to host its own copy (below).

1. **The route.** An email to the maintainer's address, the one in
   `CITATION.cff` and `SECURITY.md`, from an address the institution issues (its
   own domain, not a webmail address), with the subject `Gravitas instructor
   access: <institution>`. The portal's login page keeps its other route, a
   public issue titled "Instructor access request" (commit 56c5205a removed the
   maintainer's address from the portal, on purpose, and this policy leaves it
   so); the answer to such
   an issue is a request to write from an institutional address quoting the
   issue number. The passphrase is never put in an issue, either way.
2. **The form of words.**
   > I teach <course> at <institution> in <term>. I would like the Gravitas
   > instructor materials for my teaching team. I will not post the passphrase or
   > the decrypted documents where students can reach them, and I will say so if
   > I think either has leaked. <name>, <title>, <the page on the institution's
   > site that lists me>.
3. **What Carl verifies**, and nothing else: that the sender's domain belongs to
   an educational institution, and that a public page of that institution (a
   directory, a department or course page) lists the person as teaching or
   supporting teaching. Not the course's content, not an agreement, not a
   promise beyond the sentence above. A request that fails a check is answered
   with the check that failed and an invitation to send it again from another
   address; it is not answered with the passphrase.
4. **The reply.** One message, to the address the request came from and to no
   other (no copy, no forward), carrying the portal's address, the passphrase and
   the rotation rule below in one line. Carl keeps a private list outside the
   repository of the name, institution and date of each holder, never the
   passphrase; "known holders" below means that list.
5. **Turnaround.** A reply within 7 days, and within 14 at the longest. A request
   unanswered after 14 days is sent again; one needed for the first day of a term
   is best sent two weeks before it.

### Rotation

A rotation is a rebuild: a new passphrase, `npm run build:instructors`, the new
ciphertext and manifest committed and deployed, and a notice to the known
holders with the new passphrase. It costs every holder a message, so:

- **On a suspected leak** (the passphrase or a decrypted document seen where
  students or the public can reach it, reported by anyone or found): rotate. The
  holder who reported it is thanked, not blamed.
- **At a term boundary, if Carl chooses**: optional, never required by this
  policy, because it costs each holder a message.
- **What a rotation cannot do.** The old ciphertext stays in the repository's
  history and in every archived release (Zenodo), and still opens with the old
  passphrase. A rotation stops the *current* site and future copies; it does not
  recall a document already downloaded. The notice to the holders says so.

### A department's own passphrase and bundle

For a department that wants its own copy under its own key, which nobody outside
it holds (CONTINUITY.md, "Hosting a copy"). The project is told nothing and
cannot recover the passphrase.

1. Take a release from the archive, or a tag, and unpack it.
2. Choose a passphrase of your own: at least five words or twenty characters,
   made by you, used nowhere else. Write it to `.instructor-password` (which Git
   ignores) or set `GRAVITAS_INSTRUCTOR_PASSWORD` for the next command. Never
   commit it, and never type it into an issue or a message to the project.
3. Rehearse: `node tools/build-instructor-materials.js --rehearse`. It takes a
   second, writes `.instructor-rehearsal/materials.enc.json` (placeholder pages,
   encrypted under your passphrase) and refuses the published test passphrase. In
   a scratch copy of the tree, put that file at `instructors/materials.enc.json`,
   serve the copy and open `/instructors/`: your passphrase opens it and any other
   does not.
4. Build for real: `npm run build:instructors`. It renders every document, which
   takes minutes, and writes `instructors/materials.enc.json` and
   `instructors/materials.manifest.json` encrypted under your passphrase.
5. Serve the tree as static files, open `/instructors/`, and check that your
   passphrase opens the dashboard and a wrong one is refused with an error.
6. Give the passphrase to your own staff by your own channel.
7. When you take a later release, rebuild with the same passphrase (a new
   salt and IV; the passphrase does not change).

`tests/instructorDistribution.test.js` is the test: it builds a bundle under one
passphrase and one under another, and shows each opens with its own and not with
the other's, with the portal's own key derivation. A department does not hold the
project's passphrase; the test uses the published fixture passphrase in its
place, which is not a secret.

### The second holder

Recorded as: **none: Carl is the only holder** (owner-confirmed, 2026-10-21; in
his words in chat, "my decision is having no second passphrase holder").
Nobody besides the maintainer holds the passphrase or can rotate it. What that
means, stated plainly:

- While Carl is available nothing changes: he answers requests and rotates.
- If he is unavailable, nobody can issue the passphrase to a new instructor and
  nobody can rotate it. The deployed bundle keeps opening for everyone who
  already holds the passphrase, because it is a static file; it simply cannot be
  updated, and a leaked passphrase cannot be replaced.
- The way forward without him is the department route above: take a release
  from the archive and build a bundle under a passphrase of the department's own
  (CONTINUITY.md, "Hosting a copy"). That needs nothing from the owner.
- If this changes, the line becomes `owner-confirmed, <date>: <who>` (a name and
  a role, never the passphrase and never where it is kept) and the other
  documents follow.

The decision is `D-R10-43` in DECISION_REGISTER.md. Nothing in this section
changes how the bundle is encrypted or keyed: that is unchanged.
