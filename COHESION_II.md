# Cohesion II: discovery at scale after the expansion (Prompt 287)

The science phases tripled the content under Prompt 161's navigation model. This is the second discovery pass: it re-measures the navigation inventory, the Library's default view, the topic pages, the sequences and courses, the recommended starts and the search against the real catalog (248 entries), folds what duplicated, tightens the search, judges every card, link, filter and control added since 2.0.0 with Prompt 165's decision function, and runs the structural checks over the whole. It adds no destination, no kind, no filter, no card and no control, removes no capability and shortens no support period. Every decision is a row of `DECISION_REGISTER.md` (D-R10-287-01 to -33, delegated).

Everything below is a count from the tree or an inspection by the project. None of it is a user study, and none of it says a first-time visitor understands anything (see "What this does not prove").

## Before and after

Measured on `v3` at 4c856fa2 (before) and on this branch (after), Node 22.23.4, Chromium on macOS at 1280 by 800 and 390 by 844.

| What | Before | After |
| --- | ---: | ---: |
| Destinations in the global navigation | 5 | 5 |
| Library entries | 248 | 248 |
| Sequences in the Library (all) | 12 | 11 |
| Sequences listed as pathways on the start view | 10 | 9 |
| Courses listed as pathways on the start view | 7 | 6 |
| Recommended start cards | 7 | 7 |
| Largest sequence overlap (share of the smaller one's entries) | 92 percent (Light and stars in Stars, in depth) | 74 percent (Observing and instruments in Observing and measuring) |
| Longest list on a topic page | 90 (Observing, investigations) | 29 undivided (Orbits, scenarios); 25 in the longest sub-topic |
| Topic pages divided into sub-topics | 0 | 5 (Observing, Stars, Exoplanets, Orbits, Solar system) |
| `library/library.json` | 420,317 B | 419,475 B |
| `library/search-index.json` | 123,709 B | 123,709 B |
| Committed search queries answered inside their rank (72: 36 concepts, both languages) | 65 | 72 |
| Library default view, desktop / phone | 21 / 9 choices | 21 / 9 choices |
| Ceilings of the default views lowered | | Library desktop 24 to 23, Observatory phone 9 to 8, Teaching desktop 21 to 20 |

The default-view counts did not move because nothing above the fold changed: the consolidations are below it. The static ceilings (menu, footer, Home, the Library's kinds, formats, facets and starts) are exactly what is counted, as before.

Default views, as measured: Home first visit 11 and 5, Home first-week mode 18 and 17, Home reopened 13 and 7, Library 21 and 9, My work 8 and 2, Observatory 14 and 6, Teaching 18 and 2 (desktop and phone).

Query latency on the throttled profile (4x CPU throttle, Chromium), measured by the Library's scale test (`e2e/library.spec.js`, three times the index, 525 entries, which is more than twice the real catalog): browse 254 ms, a filter 334 ms, a facet 117 ms against the budget of 750 ms; the first search, which loads its code and the objectives, stays inside the spec's bound. Prompt 161's ceilings are unchanged; the three default-view ceilings above are the only ones that moved, and they moved down.

## What was decided

- **Sequences (D-R10-287-03).** The pairs sharing over half of the smaller one's entries were judged. Stars, in depth (24 lessons) is folded into Light and stars as its second tier: 12 of the 13 lessons of the smaller were in the larger, and the larger named the smaller as the one to do first. The result is one sequence of 25, 13 in the path and 12 under the heading "In depth", written in `js/data/investigations/sequences.js` (a row's tier name) and carried by `library.json` as `tiers`. The old id is kept in `js/data/sequenceAliases.js`, so a stored what-next record and a `?sequence=` or `path=seq:` link still open the sequence that took it over. Observing and measuring with Observing and instruments (74 percent) and Planets and exoplanets with Planets and the Sun (58 percent) stay, each for a stated reason, because folding the first pair would make a path of 41 lessons and the second pair are different units of a course. It is a presentation change: every lesson is still in a sequence and no route moved, so no support period applies.
- **Topic pages (D-R10-287-04).** A list over 30 rows is divided inside the same page, one heading per sequence, with the count. No page, link or control was added.
- **Search (D-R10-287-05).** The words together beat the same words found apart; a plural finds its singular; where an entry runs, as its card says, is a field. The committed query set `tools/library-queries.json` (36 concepts, English and Spanish, with the rank each answer must reach, and four queries that must find nothing) is run against the real catalog by `tests/librarySearchQueries.test.js`.
- **Starts and courses (D-R10-287-06).** All four audiences were read against the whole catalog: every start is a first-use entry (no prerequisite, 50 minutes at most), none repeats, and the review found nothing the later closeouts made better, so the starts are unchanged and now held by a test. The built-in courses are course units, not sequences, and none duplicates one; the installed course package leaves the pathways list.
- **Simplification (D-R10-287-08 to -32).** `tools/cohesion-ledger.json` lists 25 items added since 2.0.0 on Home, the Library and the navigation, each with the four parts of the decision function and one register row: 21 KEEP, 2 GROUP (the course pathways list, the topic pages), 1 CONSOLIDATE (the sequences), 1 FREEZE (Save and Your collections, for want of any evidence of use), 0 RETIRE. Use by students is UNKNOWN everywhere because Gravitas has no analytics; the evidence column says what is counted.

## The structural checks

The checks of Prompt 161 were run on this tree: the navigation inventory (`tests/navigationChecks.test.js`), the default-view count, the kinds exposed, the glossary consistency and the reachability walk (`e2e/navigation.spec.js`), with the Library and Home specs and `e2e/firstWeek.spec.js`. `node tools/pending-acceptance.mjs report` lists nothing pending. The new checks of this prompt are in `tests/cohesionDiscovery.test.js` (the overlap ceiling, the topic lengths, the index sizes, the starts, the ledger and its register rows) and `tests/librarySearchQueries.test.js`; their ceilings are `ceilings.scale` in `tools/navigation-inventory.json`, shown in NAVIGATION.md.

## The internal review

An inspection by the project, following the protocol in NAVIGATION.md; the reviewer is on the project, so it is not a user study.

1. **Build and state.** `v3` at 4c856fa2 plus this branch, built with `node build.js` on Node 22.23.4 (2026-11-12). Counts that moved against the ceilings: pathway sequences 10 to 9, pathway courses 7 to 6, three default-view ceilings lowered; nothing rose.
2. **Five destinations.** In English and Spanish a visitor sees Explore, Learn, Observe, My work and Teach, each with one line and one action (Open the sandbox; Search the Library; Open an observation; Back up your work; Start with the quick start), the same on every page. The reachability walk reaches each first action through the navigation in both languages, at most three activations from Home.
3. **Mapping.** No surface was added or moved since the last checkpoint other than the Library's own views; the inventory rows are unchanged.
4. **Kinds and words.** The Library offers four kinds (investigation, dataset, scenario, course) and no facet names a subsystem. The one new word is the sub-heading "In depth" ("En profundidad"), and the search's new reason "where it runs", which says what the card already says ("In the mission lab").
5. **Cohesion check.** No new destination; the menu, Home and the Library's default view are not longer (the pathways are two links shorter); no new kind, term or filter; every item is still discoverable by a sequence, a topic page, a course, a related or next link, a search and a recommended start (the folded sequence's 25 lessons are all in the sequence the Library lists); the default choice counts did not rise.
6. **What the inspection cannot say.** A reviewer on the project cannot stand in for a first-time visitor. Whether a visitor reads "Observe" as where measurement happens, whether the nine pathways and six courses are too many, whether "In depth" is understood, and whether Spanish readers find a result with the words they use, are for an observed session (roadmap Appendix A).

What a first-time visitor sees now: a Home with a paragraph, four recommended starts and five destinations; the Library's start view with seven start cards, nine sequences, six courses and fourteen topics, and one button to the whole catalog. The first-week mode of Prompt 277 was re-verified on this tree: both specs pass, 18 choices at 1280 px and 17 at 390 px.

## Closure files edited

`js/data/investigations/sequences.js`, `js/i18n/en.deferred.js`, `js/i18n/es.deferred.js`, `js/i18n/en.library.js`, `js/i18n/es.library.js` and `tools/i18n-freshness/catalog-es.json` are read by the instructor bundle's closure, so the queue rebuilds it. Both languages were written by hand for the changed sequence blurb and the three new Library words; a fluent reader of Spanish should check them (Appendix A).

## Ceilings

Two size ceilings moved, each by exactly its measured overrun under the standing approval of 2026-10-10 (D-R10-287-33): the Library route in the sources configuration, 99.8 to 100.8 KB (`tools/route-budgets.json`), and the idle precache tier, 1,696,781 to 1,697,439 B (`tools/data-budget.json`, 658 B, re-measured on the merge of v3 d3fedad0). The cause is the topic division, the tier heading and alias handling, the search's ranking and the new Library words. The deferred, initial, first-visit and build-route ceilings held. The figures are local, on Node 22.23.4; CI is the gate, and the queue re-measures after the next merge of `v3`.

## What this does not prove

It proves counts, overlaps, lengths, ranks and verdicts. It does not prove that the Library is easier to use, that the starts are the right ones for a given student, or that the search finds what a reader means. The query set is what the project could think of to type; the real set is what readers type, and nothing here records it, by design.

<!-- Listed in DOCUMENTS.md. -->
