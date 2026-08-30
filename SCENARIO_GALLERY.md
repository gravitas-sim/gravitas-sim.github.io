# Scenario gallery: what changed

The Load Scenario browser was a vertical list of title-and-paragraph cards. At 43
scenarios that is a wall of text you scroll past rather than read, and it answers
only "what exists?". It is now a thumbnail gallery indexed by curriculum concept,
which also answers "what should I explore?" and "what can I use to teach this?".

## Scenario audit

Capturing 43 thumbnails ran every scenario and surfaced a list of defects. That
pass was about the gallery, so nothing was fixed at the time. All of it has now
been acted on, and the record of what was wrong and what was done is in
[SCENARIO_FIXES.md](SCENARIO_FIXES.md).

The short version: five findings were reported, and four of them turned out to
share a single cause in `apply_placement`, which never positioned stars at all.
Ten scenarios were stacking their entire stellar population at the origin, on
top of a black hole, where it merged or was swallowed within seconds. That is
why six black-hole scenarios looked alike - by the time anyone saw them there
was nothing left in them to tell apart.

## Catalog

`js/data/scenarioInfo.js` is now the single authoritative catalog. Every entry
gained two fields:

- `tags` — 1 to 4 concept ids, assigned by hand for all 43 scenarios. Not derived
  from title keywords: Black Hole Lab is about orbits far from a hole rather than
  relativity, and Pulsar System earns Exoplanets because the first exoplanets
  found orbited a pulsar.
- `thumbnail` — the path to its capture.

`js/data/scenarioTags.js` is new: 12 curriculum concepts, each with a label and a
one-line description, and the only place a concept's display name is written.

## Removed duplication

- The settings panel enumerated all 43 scenario names by hand. It now reads
  `Object.keys(SCENARIO_INFO)`.
- The Load Scenario tooltip said "all 37 built-in scenarios" while the catalog
  held 43. Counts are now derived everywhere; the gallery writes its own
  subtitle and result line. A test fails if a two-digit scenario count is typed
  into the markup again.
- The front door's featured cards carried six hand-drawn SVG diagrams of the same
  six systems. They now show the same captures the gallery does, through a shared
  `scenarioShotHtml()` and one shared fallback.

## New module

`js/scenarioBrowser.js` replaces roughly 120 lines of list construction inside
`ui.js` and the DOM-filtering search in `controls.js`. It renders the catalog,
the concept chips and the counts, and filters the catalog rather than hiding
markup after the fact, which is what lets search and concept filtering combine.
It does not load scenarios: it calls back into `loadScenarioByKey()` in `ui.js`,
which the front door's featured cards already used.

## Left alone

`css/styles.css` still carries the old browser's `.scenario-list-item` rules,
about two hundred lines across five media queries, with hardcoded `#1a1a2e` and
`#4facfe` values. Nothing renders that class any more, so the rules are inert;
because `components` is declared after `legacy` in the layer order, the new
gallery wins without `!important`. They are dead rather than harmful, and
unpicking them by hand across those media queries is a bigger risk than the
bytes are worth. Worth deleting alongside the next deliberate pass over that
file.

## Filtering

One active concept plus free text, combined as an intersection. Search covers the
scenario key, title, summary and both the ids and display names of its tags, so
"kepler" finds all 14 Orbits & Kepler scenarios whether or not the word appears
in their prose. An unknown tag id returns nothing rather than silently returning
everything.

## Thumbnails

43 WebP captures at 640×360, about 1.1 MB in total, roughly 25 KB each.
Regenerate with `npm run thumbnails`; verify the committed set with
`npm run thumbnails:check`. See `tools/README-thumbnails.md`.

The generator drives the real application in headless Chromium and composites the
starfield and simulation canvases directly, so no UI appears in the output and a
thumbnail is by construction a picture of what the user is about to load. Every
capture runs under one fixed seed, so regenerating does not reframe the
randomized scenarios.

Per-scenario capture settings live in `tools/thumbnail-config.mjs`, development
only and deliberately not in `SCENARIO_INFO`. Frame zero was the wrong moment for
most of the catalog: a binary is two dots until it has drawn an arc, and an
inspiral is a pair of black holes until it has visibly tightened.

Framing defaults to the scenario's own `preset_zoom`. An earlier pass framed
every capture automatically from the bodies' positions; that rescued the ones
that were broken and made the well-tuned ones worse, so it is now opt-in
alongside the explicit `zoom` and `boost` overrides. Twelve scenarios carry an
override and each says why in a comment.

The camera does recenter on the bodies before every capture, which is a camera
move rather than a physics change. It is measured over the bodies already in
frame: a mass-weighted centroid over everything put the camera in empty space
between Blended Binary's transit and its companion 300 AU away.

Nothing is eagerly loaded: opening Gravitas fetches zero thumbnails, and the
gallery lazy-loads the visible ones on open.
