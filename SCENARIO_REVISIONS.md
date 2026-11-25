# Scenario revisions: what an old link means after a correction

A world link, a lesson's setup, a captured world and an imported file each name
a scenario. When a scenario is corrected, the correction can change the preset
row, the declared geometry or the generator, and a corrected generator changes
the draws, so no setting recorded in a link can keep an old world. This file is
the one rule for which revision of a scenario a payload means, to this build and
to an older one. The rule is proven on a fixture the tests register; the
registered corrections are listed under "Registered corrections" below.

Tests: `tests/scenarioRevisions.test.js` (the rule, on a fixture, and the
byte-identity of every shipped link), `tests/scenarioRevisionsFiles.test.js`
(the three file formats), `tests/scenarioRevisionsSource.test.js` (the producer
table's closure) and `tests/compat/scenarioRevisions.test.js` (the 2.0.0 and 3.0
readers). The producer table is `tests/fixtures/scenarioLinkProducers.json`; the
table below is the same rows.

## The registry

`SCENARIO_REVISIONS` in `js/shareState.js`, beside the codec that reads it (the
codec imports `js/scenarios.js`, so the table cannot import the codec; the codec
is on the start route already, so no module is added to any route, and
`js/scenarios.js` stays at its line ceiling). A tool or a test registers a
fixture by assigning an entry; shipped code never does. One entry per corrected
id:

```js
'some-id': { revision: 2, earlier: { 1: 'retained' }, rows: { 1: { /* its old preset row */ } } }
'some-id': { revision: 3, earlier: { 1: { migrated: { en: '...', es: '...' } }, 2: 'retained' } }
```

- An id that is not in the registry has revision 1 only.
- `revision` is the current one (2 or more). Every earlier revision is listed,
  as `retained` or as `migrated` with a one-sentence reason in both languages.
- A `retained` revision keeps its preset row (`rows[revision]` in the entry,
  otherwise the table's row, which `applyPreset` takes as its fourth argument)
  and, where the correction moved its declaration, that declaration
  (`geometry[revision]`, read by `geometryFor` and handed to the build as
  `ctx.geometryFor`, since `js/world/build.js` may not import the codec),
  its `ENGINE_GEOMETRY` entry and its builder step. The build is handed the
  revision (`ctx.revision`, absent meaning the latest), and each corrected site in
  `js/world/build.js` gates on it. The world builds the row, geometry and
  generator of the revision it is asked for.
- A revision is **retained** when the correction is confined to that scenario's
  own row, geometry entry and builder step. It is **migrated** when keeping the
  old revision would need a branch inside a generator other scenarios share, or a
  second copy of a generator longer than 40 lines. The 40 is a proposal; the
  register row of the first correction that registers an id gives the count
  it measured: `binary-star-system` (D-R4-463-04) copied no generator lines,
  so it is retained.
- A migrated revision opens the corrected world under a notice, in words: "This
  link was made for an earlier version of this scenario. It now opens the
  corrected one: <reason>." The notice is announced and stays until dismissed.
  No silent rebuild, in either direction. Migrate with the notice, not refuse, is
  the maintainer's decision of 2026-11-12; each correction lists its migrated
  ids for him.

## The wire form and the one writer rule

World share link **version 3** carries a required integer `r`, the revision, 2 or
more. The highest version read is 3; the version written is chosen per payload by
one function (`linkVersionOf` in `js/shareState.js`; `withRevision` stamps a payload): 3 with `r` for a registry id
at revision 2 or more, otherwise exactly what that producer writes today (prefix
2 for the dialog, the figure builder, the Studio, the course and the generated
pages' demos; prefix 1 for the build tools' raw links, whose payload says `v: 1`).
A link for an id at revision 1, for scenario `None`, and for every one of the 61
shipped ids is therefore byte-identical to the base.

An older build refuses a version 3 fragment with its existing "This link was
made by a newer version of Gravitas" message. It never rebuilds another world
silently. `r` is a payload key, not link extras and not `d`: extras are read by
a build that ignores what it does not know, which is the silent misreading this
exists to prevent.

## Producers: one committed table, closed by a source test

Every call under `js/` and `tools/` of `encodePayload`, of `encodeTagged` with
the world tag, of `buildPayload`, `captureShareState`, `payloadFromSetup` and
`compileScenarioPack`, and every raw `1r` writer, is a row of
`tests/fixtures/scenarioLinkProducers.json` or the test fails. A row names the
file, the calls it holds (the test counts them), the origin of what is encoded
and the version rule. The table, not this list, is the authority.

| Site | Origin of what it encodes | Version rule |
|---|---|---|
| The share dialog (`js/share.js`) | capture of the live world | the world's revision: 3 with `r` at revision 2 or more, else prefix 2 |
| The lesson's help link (`js/investigations.js`) | setup | `payloadFromSetup` stamps the current revision; else prefix 2 |
| The lesson's step setup (`js/investigations.js`, not encoded) | setup, or declaration when the compiler stated a revision | read, not written |
| The lesson's entry capture (`js/investigations.js`), exit restore | capture, kept in memory | the world's revision; never written to storage |
| The report's links (`js/investigations/finish.js`) | setup | as the help link |
| The lesson's runs (`js/lesson/runs.js`) | capture (kept in memory) and setup | as above |
| The course's scenario item (`js/course/links.js`) | declaration: the item's `revision`, 1 if none | 3 with `r` when the item states 2 or more, else prefix 2 |
| The Library's scenario cards (`tools/build-library.mjs`) | setup (the current revision), no browser | the registry's revision: prefix 3 with `r`, else prefix 1 as today |
| The teaching pages' embeds (`tools/build-adoption-pages.mjs`) | setup | as the cards |
| The teaching demos (`tools/build-teaching-demos.mjs`) | setup | as the share dialog |
| The figure builder (`js/figureBuilder.js`), a pasted link | link, decoded and re-encoded: keeps the revision it carried | the carried revision |
| The figure builder, a scenario chosen on the page | setup (the current revision) | as the share dialog |
| The Scenario Studio (`js/studioPage.js`) | declaration: the pack's `scenarioRevision`, 1 if none | 3 with `r` for 2 or more |
| The Orbital System Builder (`js/systemBuilder.js`) | scenario `None`: no revision | prefix 2, bytes unchanged |
| The pack world (`js/scenarioPackWorld.js`) | declaration; builds, writes no link | read, not written |
| The experiment bench (`js/experiments/bench.js`) | capture, stored in an experiment record | the world's revision, and form (i) below |
| The maneuver planner's undo (`js/maneuverPlanner.js`) | capture, kept in memory | the world's revision |
| The timeline's held moment (`js/timeline.js`) | capture, kept in memory | the world's revision |
| The world (`js/world.js`) | `captureShareState`, the one capture | stamps the world's revision |
| The codec (`js/shareState.js`) | the writer (`encodePayload`) and the reader | the one function above |

## The reader, by origin and never by `v`

Four origins. The caller states the origin: `decodePayload` marks what it
returns as a link; `payloadFromSetup` (now in `js/shareState.js`, where the
codec is) marks a build's own setup `setup` and a compiled declaration `link`;
`applyShareState(payload, origin)` takes it as an argument (passed through
`applySharePayload` in `js/share.js`), and a payload with no mark and no
argument is read as text. A capture is read by the same rule as text (`r` at
version 3, else 1), so an unmarked capture is read correctly by default. Stored
text can supply a revision but never the origin `setup`: a payload marked as text
stays text when asked to be read as a setup.

- **link**: a payload decoded from text (an address, a pasted link, a link kept
  in a report, a pack or My work) means the revision it carries: `r` at version
  3; revision 1 at version 1 or 2, which is right only because the table leaves
  no producer writing an unrevisioned link for a corrected id. An `r` above the
  registry's revision is refused as a newer link.
- **setup**: a declarative setup the running build itself ships (a built-in
  lesson step's `setup`, a card, a demo, an experiment's definition) means the
  current revision.
- **capture**: a payload made from a world already loaded means the revision of
  the world it was made from. `buildPayload` stamps it (3 with `r` at revision 2
  or more), and the stamp survives a JSON clone, storage, export and import. A
  stored or imported record with no stamp was made before any correction and
  means revision 1. A capture is never read against the current row.
- **imported declaration**: a scenario named by a file from outside the build (an
  imported or remixed investigation's `setup`, a scenario pack, an imported
  course pack's scenario item) is stored text, like a link: it means the revision
  it states, and revision 1 if it states none. Passing through the compiler does
  not make it a setup: the compiler sets `setup.revision` explicitly (1 if the
  file stated none) and `applySetup` reads that as the origin. A built-in lesson
  never carries `revision` in a setup (a test holds every lesson to it).

Keys the three formats gain, written only for a registry id at revision 2 or
more, so a file for an uncorrected id keeps its bytes:

| Format | Key | An older reader |
|---|---|---|
| gravitas.scenario-pack | `scenarioRevision` | refuses it: "is not a scenario-pack field" |
| gravitas.investigation-pack (a step's `setup`) | `revision` | refuses it: the setup validator knows four keys |
| gravitas.course-pack (builder form), a scenario item | `revision` | refuses it: an item field it does not know |

The three refusals are run against the 2.0.0 and 3.0 readers in
`tests/compat/scenarioRevisions.test.js`. A format whose old reader would have
ignored the key would use form (ii) below; none does.

The resolver (`resolveRevision` in `js/shareState.js`) turns an origin and a
payload into the revision to build and, for a migrated earlier revision, the
notice. `initialize_simulation` takes the revision; a plain rebuild (a new
scenario, Refresh) builds the current one, and a rebuild with the same seed
(Reset) keeps the world's. The world remembers its revision beside
`current_scenario_name` (`current_scenario_revision`, `js/appState.js`), so a link
made from a revision 1 world is written as version 2 and means revision 1.

## Records that enclose a capture: the form chosen for each

An inner stamp or an inner version 3 is neither form: the 3.0 experiment store
and manifest import check the outer version only and apply the inner payload
unread. For each record kind that encloses a capture, one form:

- **(i) old-reader-safe**: the capture of a world at revision 2 or more is written
  so that the 3.0 (and 2.0.0) reader rebuilds the same settings and bodies: the
  capture is always **full** (the bodies travel, so no generator reruns) and `d`
  holds **every setting**, not the difference from a row. The old reader's row
  plus `d` is then the world's settings whichever row it holds, and the current
  reader's row plus `d` is the same. It is proven by running that reader in
  `tests/compat`.
- **(ii) refused**: the enclosing record's own version is raised, only for a
  record that holds such a capture, so the old reader's "from a newer version"
  refusal fires; a record of a revision 1 world keeps its bytes. A raised version
  is a possible major-version boundary (RELEASING.md), named in the
  handoff.

| Record | Holds | Form |
|---|---|---|
| Experiment store record (`localStorage`, store v3: `initialState`, a run's `setup`) | a capture, persisted | **(i)**; no version raised |
| Experiment manifest (`gravitas.experiment`/1: `initialState`) | a capture, in a file | **(i)**; no version raised |
| The lesson's entry capture and exit restore | a capture, memory only | none needed: never written; the stamp is kept for the restore |
| The bench's saved world, the timeline's held moment, the maneuver planner's undo | captures, memory only | none needed |
| A My work record (`gravitas.made`) | a link (text), not a capture | none needed: an older build opens the record and refuses the link (version 3) in words |
| A link kept in a report, a pack or a course | a link (text) | the link's own refusal |

Form (i) is chosen over (ii) because it needs no raised version and costs bytes
only for a capture of a corrected world, which no shipped scenario is. It
applies to every capture asked for with `forExperiment` (all of the records
above and the memory captures alike, so one rule). If a later scenario's
settings cannot be written out as `d` (none today), that record kind moves to
form (ii) by its own register row. No record's version is raised by this change.

## Retained or migrated, and what each correction proves

Per corrected id (each correction applies these; the registry's own tests prove
them on a test-only id):

- **Retained**: committed v3.0 seeded links (one of version 1, one of version 2)
  rebuild the v3.0 digest of `e2e/worldConstruction.spec.js`.
- **Migrated**: the same links open the current digest and show the notice.
- **Both**: a new link round-trips `r`, and the 2.0.0 and 3.0 readers of
  `tests/compat` refuse it in words.

## Saved worlds

A saved world holds settings and bodies and no scenario id (`js/world.js`), so it
is unaffected by any of this (STORAGE.md). The later save envelope that adds the
scenario id and revision takes both from this registry.

## FORMATS.md row

World share link (with a scenario revision), version 3: fields `v` (link prefix
3) and `r`; reads version 1 and 2 as they are; written only for an id at revision
2 or more; an older build refuses it, in words ("newer version"). Schema
`sdk/schemas/world-link-3.schema.json`. `tools/formats.mjs` is the source and
`node tools/formats.mjs --write` writes FORMATS.md; the row lands in the commit
that adds the constant it names.

## Registered corrections

| Id | Revision | Earlier | What changed | Register |
|---|---|---|---|---|
| `binary-star-system` | 2 | 1 retained (`rows[1]`, `geometry[1]`) | Planets, giants and asteroids start past Holman and Wiegert's critical distance (2.43 separations); only the stars pull; zoom 1.5 to 0.75 | D-R4-463-04 |
