# Remix, and investigations that reach students by link

Prompt 78. An instructor adapts a built-in investigation without touching
source, and the result reaches students by a link, with no pull request.

## Remix

In the Composer (`/studio/lesson/`), choose a built-in investigation and press
Remix. The result is a `gravitas.investigation-pack/1` that starts as a faithful
copy of everything the format can carry: the text of every step in both
languages, step order, depths, hints, feedback, misconceptions, scenario
references by id, instruments, and every question with its expected value and
tolerance. It records where it came from:

```json
"derivedFrom": { "id": "keplers-laws", "version": "1.0.0", "digest": "4b0f61aa" }
```

The `version` is the original's package version (1.0.0 for a lesson built into
the core). The `digest` is the same hash an assignment and a course pin record
of a lesson's steps (`js/platform/remix.js` `originalDigest`): it moves when a
step is added, removed or reordered, or when its answer, scenario, instrument
or fields change, and not when only its prose does.

What the format cannot carry stays in the original and is called **by
reference**: a probe, a validate, a computed field, a plot, a binding. The
compiled remix is the original's step with the pack's words laid over it, so a
`validate` function in a remix is the original's own function, not a copy. The
Composer lists these under "Kept from the original, not editable here", and
`tests/remix.test.js` holds, for all 24 investigations, that a faithful copy
compiles to the original step for step (functions by identity), English and
Spanish, with no finding from the lesson checker.

## What a remix may change

| Field | Status | Meaning |
|---|---|---|
| title, body, tip, prompt, because, worked, rubric | editable | words |
| options (the text of each) | editable | reword, translate |
| hints, feedback, misconception notes | editable | words |
| checklist of an explore step | editable | add, remove, reword |
| measure field labels | editable | words |
| depth | editable | core, quantitative or advanced |
| step order and which steps remain | editable | reorder, remove |
| added steps | editable | read, explore and question steps |
| paused, zoom of a step's setup | editable | framing |
| English and Spanish of every text | editable | both |
| setup.scenario, setup.seed | refused | the world the step opens |
| tool (the instrument and its settings) | refused | the instrument's model |
| answer, tolerance, unit, expect | refused | the expected value |
| the number or order of options | refused | the answer is an index |
| misconception factors and targets | refused | what a wrong answer is |
| measure field ids, units and order | refused | what is recorded |
| step type, question kind, reveal | refused | what the step is |
| probe, validate, compute, plot, start, bind... | kept | lesson code, by reference |

A refusal names the field, for example
`steps[6].answer: is 2, but the original "what-sits-at-the-other" expects 3: a
remix does not change an expected value`. An added step opens no scenario and
docks no instrument; an original that has changed since the remix (its digest)
is refused with "remix it again". The table is `REMIX_FIELDS` in
`js/platform/remix.js`.

The format's own limits are an author's (a field id of a short word, a checklist
of at most eight, a first step that opens a scenario). A built-in lesson was
written before them, so a limit that only the original's own shape breaks is
not the remix's (`excusedByOriginal`). A step of a kind only the original's
engine code knows (the ellipse and the wedges of Kepler's Laws) keeps that kind.

## Delivery

**(a) A link.** The Composer's Publish makes a link, `/#i1z...`: the pack,
deflated, in a tagged fragment (a world starts with a digit, an assignment with
`a`, a submission `s`, a course `c`, an investigation `i`), with the course
link's caps: a link past 8,000 characters is reported so the author can send the
file instead, and one that inflates past 64,000 bytes is refused unread. A whole
faithful copy is 17 to 50 KB deflated, so a remix travels as its **difference
from the faithful copy** (`remixDelta`): the identity, the fields that changed,
and the steps in order, an untouched step as its id alone. The reader makes the
copy again from its own build and lays the difference over it. A pack written
from scratch travels whole. The Composer's "preview as student" opens this same
link.

A link opens through `js/remix/open.js`, loaded only when the address holds such
a fragment. The pack is judged by the format and, for a remix, by the remix
rules, compiled, and handed to the lesson engine through the door a packaged
lesson uses. Nothing in a pack is run.

**Progress.** The engine knows a pack by `rx-<id>-<version>` with dots as
hyphens (`rx-my-keplers-laws-1-0-0`), so saved answers, the report's
"Investigation" row and the submission token's `lesson.id` are the pack's and
version's, and a new version starts fresh. The token's backup also carries
`lesson.pack` (`{id, version, from}`). The review page names a remixed
submission and says it cannot grade it, because the pack's questions are not in
its build.

**(b) A package from the catalog.** An investigation pack (a remix, or one
written from scratch) is an `investigation-pack` extension the SDK validates and
archives (`npm run sdk -- validate`, `test`, `pack`; a remix is judged by the
remix rules, against this build's original). The catalog serves it as an archive
(`type: investigation-pack`, summary in both languages), lists it with the
Investigation filter, and installs it into IndexedDB (`js/catalog/store.js`) after
checking that the archive holds the pack its manifest names; the full judgment
waits for the engine. **Open** takes the browser to an investigation link of the
form `#i1r<{"k": "<package id>"}>`, which `js/remix/open.js` reads from the store
(`installedPack`), judges by the format and the remix rules, compiles, and hands to
the engine through `provideLessonLoaders`, under the same `rx-<id>-<version>`
id. A package that is not installed, or whose file is not a pack, says so; a link
made on one machine opens nothing on another. No curated entry ships: the catalog
lists what its curation names, and that is a content decision.

**(c) A course item.** A course-pack /2 item of kind `pack` carries the
investigation as its own link: `{kind: "pack", pack, version, link, title?, pin}`
(`link` is the fragment, at most 4,000 characters, the cap every text in a course
has). The pin is the digest of the compiled steps, the hash a lesson's pin is
(`fp`, `n`), so a faithful remix pins to its original's digest, a reordered or
shortened one to its own, and a pack whose original has since changed no longer
opens (its `derivedFrom.digest` fails) and shows as missing. Progress keys stay
`rx-<id>-<version>` (`lessonKeyOf` in `js/course/pack.js`). The course home opens
the item's link; the review and audit read it as a lesson (time from the pack's
duration, the dependency graph, the reviewed upgrade re-pins it).

Opening a link needs the lesson checker, which the course builder's route has no
room for: a lazy import there split its bundle into nine more requests. So the
check is a page of its own, **/studio/course/packs/**: *make* turns a link into
the course item with its pin; *check* opens each pack of a course file and says
as pinned / steps changed / does not open (and why), with the item re-pinned to
what the pack has now. The builder takes the item pasted from that page, keeps
its fields, and reports the pack as `unchecked` (not missing, not needing review)
until the check has run; the audit adds a note.

**Grading a remix on the review page.** The report carries `lesson.pack`
(`{id, version, from: {id, version, digest}}` and the list of steps the student
was asked. `js/remix/grade.js` grades it against the **original**: its steps by
reference, its own `checkAnswer` and expected values, restricted to the steps the
report lists, never an expected value from the pack (the report has none). If the
original's digest is no longer the one the remix was made from, the report is named
and not graded. Steps the instructor added have no expected value here and are
not graded; a pack written from scratch is still named, not graded.

**Studio drafts from My work.** A draft listed on My work links to its page with
`?open=<id>`; the Scenario Studio, Composer and course builder open that draft
rather than the one saved last.

**Not built (see D-REMIX-01):** the report's "made from" row (the lesson routes
have no room: the report is built on them); the Library listing of investigation
packs (the Library's index lists only course packs from the catalog); a scenario
remix with `derivedFrom` (the scenario pack format is a document, so it travels
as a link already; a record of the built-in it came from is not cheap and nobody
has asked); a curated catalog entry; in-place editing of repository files.

## Budgets

The reader reaches the engine through `packFacts()` in `js/investigations.js`
and imports it dynamically, as every bridge does: a second route to the registry
or the scenario catalog, or a static import, splits chunks a lesson loads, and
the route budgets count them. Measured: the lesson routes and the composer
stay inside their ceilings (no ceiling raised); the deferred JavaScript budget
goes from 4116 to about 4171 of 4180 KB (4107 after budget recovery 5 and the work below). The delivery stage adds one route, /studio/course/packs/ (its row was measured and added by hand), and no ceiling was raised.
