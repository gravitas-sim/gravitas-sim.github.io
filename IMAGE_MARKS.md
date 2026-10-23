# Marks, scale, time and the ledger

The Observatory can mark an image and measure the marks, and say exactly how.
Open an image observation, open **Marks and scale on the image**, and place
marks on the picture. The instrument is the accepted slice of the
image-measurement gate (`IMAGE_MEASUREMENT_GATE.md`, verdict A, D-R10-48): its
thresholds were fixed before it was built and are held as tests.

## What it does

- **Six kinds of mark.** A point, a segment, a circle (centre and a point on the
  limb), a polygon, a count with a tag, and a reference pair (two points a known
  distance apart). Positions follow FITS: 1 is the centre of the first pixel and
  y runs up.
- **Place, then nudge.** A tap or Enter puts a draft marker down; the arrows, the
  nudge pad and a step selector (0.25, 1 or 4 pixels) move it; **Place** or Enter
  commits. Nothing needs a drag, a second finger or a pointer at all, and each
  commit is one announcement.
- **Refine.** A point is refined by a windowed centroid and a circle by a
  72-ray limb fit. Both are deterministic and say why they refuse (too near the
  edge, too faint, not round, no clear edge). A refused refinement leaves the
  mark as it was.
- **The scale** comes from one of two places and is never a blend. A reference
  pair and its stated length give a scale in any unit, on any image. The sidecar
  of a quantitative image with world coordinates gives arcseconds per pixel. A
  **display-only** image can be marked, but it refuses the sky's scale in the
  contract's words, because its pixels have been stretched or never had their
  units and provenance recorded; a reference pair still works there.
- **Time.** A frame's time is shown with its scale (UTC, TT, TDB). A time with no
  scale is not shown as one.
- **A table** of the marks, editable (tag, position, known length) and sortable,
  and a navigator for a sequence of frames that says which tags are not yet
  marked in this frame and copies a mark to the next frame.
- **Undo and redo**, with a run of nudges counting as one step.

## What it saves

- **In the workspace file:** `workspace.marks`, a `gravitas.image-marks/1` block
  (the frames' digests, the marks as placed and, for a refined mark, the
  result), written **only when marks exist**. A save without marks is the
  bytes it always was. A 2.0.0 reader refuses a file that has it ("nested too
  deep": the block nests eight deep and 2.0.0 reads six), which is the safe
  outcome; `tests/compat/boundary.mjs` holds the row `workspace-marks`. The
  current reader reads eight deep.
- **In the ledger:** **Keep in the ledger** writes a `gravitas.artifact/1` whose
  quantities are every position, radius, area, the scale and each frame time,
  each labelled measured, derived or assumed, with the replay in its
  provenance. **Reopen from the ledger** replays it against the open image:
  refined positions are computed again and reported as identical (bit for bit,
  in one build) or agreeing within 1e-6 pixel. If the image changed, the replay
  refuses.

## What it loads

Nothing on the Observatory route: the panel is one `import()` made when the
details element opens. The idle tier carries it as the group `image measurement`
(`tools/build-service-worker.mjs`), never the first visit. The FITS reader stays
out of the precache.

## Checks

- `npm run image-marks:validate` runs the gate's precision, undo, determinism,
  record and replay checks against these modules, in plain Node.
- `npm run image-marks:bytes` measures the bytes and requests the way the gate
  did.
- `tests/imageMeasure.test.js` and `tests/imageMeasureBudget.test.js` hold both;
  `e2e/imageMarks.spec.js` holds the page (the keyboard-only and pointer-only
  paths, announcements, the sequence, both languages, axe, target sizes and the
  gate's throttled-profile timings).

The code is `js/measure/` (`refine.js`, `marks.js`, `scale.js`,
`imageRecord.js`) and `js/observatory/imageMarks.js`; the words are
`js/i18n/en.imageMarks.js` and `js/i18n/es.imageMarks.js`. The Spanish has not
been read by a fluent speaker.
