# Scenario thumbnails

Every built-in scenario shows a real capture of itself in the scenario gallery and
on the front door's featured cards. The images live in `images/scenarios/`, one
WebP per scenario, and their paths are recorded in `js/data/scenarioInfo.js`.

## Regenerating

```bash
npm run thumbnails                       # every scenario
npm run thumbnails -- "Solar System"     # one or a few
npm run thumbnails:check                 # verify the committed set, capture nothing
```

The generator drives the real application in headless Chromium, so a thumbnail is
by construction a picture of what the user is about to load. It composites the
starfield and simulation canvases directly, which is why no UI appears in the
output even though the app is fully running.

`npm run thumbnails` takes roughly fifteen minutes for the whole catalog: most of
that is deliberate, waiting for each scenario to reach the moment where it looks
like itself.

## When to regenerate

- After changing a scenario's initial conditions, framing or visual style.
- After adding a scenario. Add it to `SCENARIO_INFO` first, with a `thumbnail`
  path, then capture just that one.
- Not for copy edits. Titles and summaries are not in the image.

Until a new scenario is captured, its card shows the titled fallback rather than
a broken image, so an uncaptured scenario is untidy rather than broken.

## Framing

`tools/thumbnail-config.mjs` holds one entry per scenario:

- `settle` — seconds to run before capturing. Frame zero is the wrong moment for
  most of the catalog: a binary is two dots until it has drawn an arc.
- `trail` — trail length for the capture. A scenario's live trail is a hint of
  recent motion; a still frame has only the trail to show that anything moves.
- `boost` — multiplies the scenario's own `preset_zoom`. A framing chosen for a
  full browser window leaves the subject at a few percent of a 640×360 card.
- `speed` / `zoom` — outright overrides, where a scenario's own values cannot
  reach a good moment or a good frame.

These are development-only and deliberately kept out of `SCENARIO_INFO`: the
website has no use for them.

Every capture runs under one fixed seed (`THUMBNAIL_SEED`), so regenerating does
not reframe the randomized scenarios.

## Reviewing

Look at the output. The generator only knows whether a file was written, not
whether it is worth looking at, and it fails a capture only when the frame
encodes to almost nothing. The question to ask of each image is whether someone
could tell that scenario apart from the other forty-two — black holes in
particular all look alike when the framing is too tight.

## Automatic framing

By default the capture measures where the bodies actually are and zooms so the
system fills the card, then recenters on their mass centroid. That handles two
recurring problems without touching any scenario: a `preset_zoom` chosen for a
full browser window leaves the subject a speck in a 640×360 card, and several
scenarios carry a net center-of-mass velocity and walk out of frame while the
capture waits.

The framing uses the 82nd percentile of body distance rather than the maximum,
so one ejected body or a comet at aphelion does not pull the frame out until the
system itself vanishes.

Both `zoom` and `boost` turn automatic framing off. Use them only where measuring
gets it wrong, and say why in a comment: `Blended Binary`'s companion really is
300 AU away and cannot share a frame with the transit, and the Solar System's
comets reach past Neptune.
