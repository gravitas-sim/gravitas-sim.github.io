# Translation freshness and the glossary (Prompt 156)

Parity of the two languages is complete and its quality is not reviewed: the
Spanish is a draft, and `docs/evidence-status.md` records that no fluent reader
has read it. What engineering can do before the content grows is find a
translation whose English has moved, hold the labels to one set of words, and say
which surfaces are English only on purpose. Nothing here translates anything and
nothing here changes an English string.

## One freshness mechanism per content type

A translation is stale when the English it was written against is not the English
that stands beside it. Every content type has exactly one way to know.

| Content type | Where | The mechanism |
|---|---|---|
| Pack texts (investigation, course, activity packs, the SDK's examples) | `{en, es, esOf}` in the file | `esOf`, the digest of the English the Spanish was written from. Already in the formats (`js/course/review.js` `translationState`, `js/composer/compile.js` `digest`); the tool only reports it. A `/1` course pack has no such field (its schema has none); migrating it to `/2` adds it |
| Message catalogs | `js/i18n/*.js`, five or more fragments per locale | the ledger, keyed by message id |
| Lesson shadows | `js/data/investigations/es/<id>.js` | the ledger, keyed by lesson id and the path to the string (arrays line up by index) |
| Deeper-step shadows | `js/data/investigations/depth/es/<id>.js` | the same |
| Instructor prose and expectations | `js/data/instructorContent.es.js`, `instructorExpectations.es.js` | the same; empty in Spanish today |
| Lesson cards' summaries, the "what am I looking at" explainers, the distribution kit's words, the instructor guides' labels, the SDK example's strings | one twin table each | the same, keyed by table and path |
| Document pages | an English span with a Spanish span beside it | the ledger, keyed by the digest of the Spanish, so an insertion elsewhere on a page moves nothing |
| A document that exists twice (`DATA_PROTECTION.md`, `.es.md`) | the two files | the ledger, whole file |
| Computed lesson messages | `lessonFn.*` ids | none needed: the id is a slug of the English, so a reworded sentence has a new id and loses its translation by construction (`js/i18n/lesson.js`) |

The ledger is `tools/i18n-freshness/<source>.json`, one file per source, and it
uses the pack formats' digest function. A row reads

```text
<English digest>:<translation digest>[@date]
```

The English digest is the English the translation stood against when it was last
written or confirmed. The translation digest says which translation that was.
They are in `tools/` and not in the catalogs on purpose: the catalogs and the
lesson shadows are inputs of the instructor bundle's source digest, so a field
added to them is a rebuild by the owner, and the ledger is a tool's output
rather than something to edit by hand.

The first ledger took every translation then present as written against its
English (the `baseline` in each file). That records no review, and it is the only
time the ledger was written without a person changing a translation.

### What the tool does

`npm run i18n:check` runs the freshness check beside the id audit. It prints, per
source, how many entries are fresh, stale inside the grace period, stale past it,
new, and removed.

- **English changed, translation did not**: stale. `node tools/i18n-freshness.mjs
  --write` records the day it was first seen (`@date`) and leaves both digests
  alone. Writing cannot clear a stale entry.
- **Translation changed**: the translator has read the new English, so `--write`
  stamps the entry against it.
- **English changed and the meaning did not** (punctuation, a typo, a markup
  fix): `node tools/i18n-freshness.mjs --write --confirm 'catalog:es/lib.*'`
  re-stamps the English digest for the keys named (`source/key`, a trailing `*`
  for a prefix). It is a diff in the ledger that a reviewer reads.
- **A stale entry fails the gate after 14 days** (`GRACE_DAYS` in
  `tools/i18n-ledger.mjs`), counted from the date `--write` recorded. A stale
  entry that was never recorded, or a ledger that is not what `--write` would
  leave, fails at once, so a change to English cannot pass without the ledger
  saying so.
- **A new or removed entry** reaches the ledger by `--write` in the same change.

Acceptance for a pull request that touches English text: the check passes and
no entry is stale, or the stale entries are listed in the pull request with the
day they will expire.

### Inserting a lesson step

Lesson strings line up with the Spanish by index, so inserting a step in the
English slides every later string against the wrong Spanish, silently, at run
time. The ledger turns that into a loud result: every later string goes stale.
Append a step, or translate the steps after the insertion in the same change.

## The glossary: identifiers and labels

`tools/glossary.mjs` is the table. It writes the glossary page (the eight nouns,
the retired words) and, since Prompt 156, holds `LABELS`: navigation, Library
labels, instrument names, quantity names and unit names, each with its English
and its Spanish. `tools/i18n-labels.mjs` holds the catalogs to it, and the check
fails when:

- an id the table names does not carry the table's English and Spanish exactly;
- any other catalog entry whose English is exactly a table label carries a
  different Spanish (a necessary synonym is listed in `allow`);
- a label's English changed and the glossary did not follow.

Divergences that exist today are recorded on the label as `known`, with the id
and the text it carries. They are `js/i18n` edits, which this work does not make.
The list is a ratchet: a fixed entry has to be removed from it and a new
divergence fails. Two are recorded: the 3-D lab's scalar `Speed` column reads
`Velocidad` where speed is `rapidez`, and one `Inclination` label lacks its
accent mark.

Prose is not checked. `tools/glossary.mjs` `TERMINOLOGY` lists forms the
Spanish uses beside the preferred one (`laboratorio 3-D` and `laboratorio 3D`,
`Sistema Solar` and `sistema solar`), and `npm run i18n:check` prints how often
each occurs. So does a list of words spelled both with and without an accent
mark. Both are for a reader and neither fails. Scientific symbols and necessary
synonyms are allowed.

## Surfaces that are English only by decision

`tools/i18n-surfaces.json` is the list. The check holds the pages to it: every
page (a directory's `index.html`, and the front door) carries Spanish (a
`gs-en` span with a `gs-es` span after it, or message ids) or is declared; a page
declared English only carries none; every declaration names a path that exists, a
reason and where it was decided.

Declared today: the sandboxed compute frame; the general instructor documents
(adopter's guide, curriculum map, the observatory, 3-D and mission guides, the
activity guides and worksheets); the printed user manual; the SDK documentation;
the repository's Markdown documents (except a `.es.md` twin); and the messages
the validation groups compute. The model and validation pages are not declared:
they carry their Spanish in pairs and the pair check applies.

To declare a new one, add an entry to `tools/i18n-surfaces.json` with its `id`,
`kind` (`page`, `document` or `code`), `path`, `reason` and `decided` (the
document or register row where the decision is written), and add a decision row
if it is a decision. A new page with no Spanish and no declaration fails
`npm run i18n:check`, which is the point.

## New vocabulary

A change that adds a term adds both languages at once, from the glossary's entry
if the term has one, and adds the term to `LABELS` if it is a label. Nothing is
machine-translated. A Spanish string that the author cannot write is left absent
(the audit lists it as not yet translated), never copied from the English and
never invented.

## What is not covered

- **Flow table.** `js/data/instructorFlow.es.js` is empty and is keyed by step id
  rather than by index; it is not read until it holds something.
- **Unit names in `js/units/registry.js`** (`es: 'año'`) are held by their own
  tests, not by `LABELS`.
- **Fluency.** A digest says the Spanish was written against this English. It
  does not say the Spanish is good.
- **Edits to `js/i18n` or the lesson shadows.** Fixing a recorded divergence, a
  missing accent mark or a stale entry is a change to a bundle source, and the
  owner rebuilds the instructor bundle afterwards.
