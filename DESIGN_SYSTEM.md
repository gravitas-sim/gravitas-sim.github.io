# The design system

Gravitas has one component language for its controls. A page that uses it
needs no styles of its own for a form: the field, its control, its hint and its
error, the button that acts on it and the row the buttons sit in are all here,
in every theme. This document is the one place each component is described:
what it is for, the markup, its states, the tokens it reads and what it does
for accessibility.

## Where it lives

| File                                       | What it holds                                                                       | Loaded by                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`css/tokens.css`](css/tokens.css)         | Every color, size, radius, shadow, duration and focus ring, and the four themes      | Every page                                                 |
| [`css/components.css`](css/components.css) | `.ui-button`, `.ui-checkbox`, the focus ring, and the element-level look of bare controls | Every page; part of the application's initial download |
| [`css/icons.css`](css/icons.css)           | The icon set                                                                         | Every page; part of the initial download                   |
| [`css/page.css`](css/page.css)             | Everything below: the form controls, the page, cards, tables, status, alerts and states | The document and tool pages, not the simulation    |

The form controls are in `css/page.css` rather than `css/components.css`
because the simulation draws none of them, and `css/components.css` is part of
what a first-time visitor to the sandbox downloads before anything moves. Every
tool page links `css/page.css`; the build minifies it to its own file.

All of it is in the `components` cascade layer, after `tokens`, `base` and
`legacy` and before `overrides`. Nothing here uses `!important`, and nothing
here writes a color: every value is a token, so the four themes - Midnight,
Deep space, Observatory red and Daylight - follow without a rule of their own.
The Observatory's red night-vision theme is a set of token values in
`css/tokens.css`, never an override of a component.

Three things hold it in place. [`tools/design-ratchet.mjs`](tools/design-ratchet.mjs)
counts, per file, the color literals and `!important` rules outside the tokens,
the emoji in the interface's strings and the native controls on the tool pages
with no class, and
[`tests/designRatchet.test.js`](tests/designRatchet.test.js) fails when any
count rises. [`e2e/accessibility.spec.js`](e2e/accessibility.spec.js) runs axe
on every tool page in all four themes and both languages.

The legacy stylesheets' repeated literals (three or more uses) now stand on
`--c1` to `--c16`, a literal palette at the end of the default block in
`css/tokens.css`. Each holds exactly the value it replaced and is the same in
every theme, so a rule that moved onto one renders what it did; they are a
step toward the semantic tokens above, not a substitute for them.

### Rules every component follows

- **Focus is visible.** One ring, `--focus-ring` in `--focus-ring-color`,
  2px outside the box, drawn on `:focus-visible` and never on a mouse click.
  A text field also turns its border `--accent`.
- **Targets are at least 24px** (WCAG 2.2, 2.5.8). Buttons, inputs, selects
  and the file picker's button are 36px tall; a checkbox with `.ui-checkbox`
  is 24px. **On a touch screen they are at least 44px** (2.5.5), under
  `@media (pointer: coarse)`: in this file for the components, in
  `css/shell.css` for the shell and in `css/chrome.css` for the application.
  A slider keeps its thin track and grows the box a finger presses by
  padding; a link inside running text stays text, the criterion's inline
  exception.
- **Text is 16px in a field,** the size below which iOS zooms the page when
  the field takes focus.
- **State is never color alone.** An invalid field has a message; a disabled
  control is dimmed and says why nearby when the reason is not obvious.
- **Every control has a name** from a `<label>`, or an `aria-label` where a
  visible label would repeat a heading.

## Visual direction

The component language above says how a control looks. This section says what
the scene, the step and the chrome are each owed on screen, how a visual
change is judged, and what it must cost. It applies to the sandbox's scenes,
to the pages and to the lessons. It is the yardstick later work is held to; it
changes nothing that is drawn.

### The direction

- **The scene or the instrument first, the step second, chrome last.** What a
  student is studying gets the room and the contrast; the words that guide
  them come next; the buttons and panels that run the application give way.
- **Calm defaults.** Nothing moves unless it is the thing being studied, and a
  reading step is still.
- **Stable layout.** A panel does not change size between steps, and a control
  does not move because something else opened.
- **Motion only where it shows change.** Motion that shows a body moving, a
  quantity changing or a state arriving is part of the picture; motion that
  decorates is not. The Motion choice is honoured everywhere.
- **Scientific accuracy before polish.** Every mark means something: an
  arrow's length is a magnitude, a trail's length is a time, a size is true or
  says it is not. A picture never implies a calculation that does not exist.

### Three kinds of reason, all legitimate

A visual change names which of the three it is for.

| Kind | The question | How it is judged |
|---|---|---|
| **Perception** | Can a student read it? Label and tick size at the display's own sharpness, a mark that survives grayscale, a number that is a number. | Measured: criterion I-9 below, on the pilot states. |
| **Orientation** | Can a student find their way? The scene in view while they work, the object they were told about marked, where they are in the step. | Measured: criterion I-8 below, on the pilot states. |
| **Appearance** | Is it better to look at? Composition, typography, purposeful detail on a body, scientific imagery, polish. A reason that stands without a learning score. | Shown, not computed: matched before-and-after captures (below), judged by the maintainer. No test states it, on purpose. |

### What a visual change states

Every later visual change records, in its pull request and its register row:

1. its **kind** and its **reason**;
2. its **measured cost**: bytes and requests on each route it touches under the
   pinned toolchain (`tools/route-budget.mjs`, `npm run budget:check`), frame
   time on the sandbox reference scenes (`npm run perf` with the profiles in
   `tools/perf-thresholds.json`: `sandbox-scenes-full` and
   `sandbox-scenes-low-cpu4`), and heap on the same scenes;
3. **where the room comes from**: recovered waste first (a duplicate, an unused
   rule, a font or image that need not load), then the appearance allocation
   that Prompt 317 proposes (10% of each saving, `docs/BUDGET_POLICY_II.md`,
   register row D-R4-317-03).

A change is dropped for lacking a stated reason, a measured cost or room. It is
never dropped merely because it is an appearance change, or because it costs
something, or because its value is not a learning score. A change that needs
more than its allocation goes to the maintainer as a concrete tradeoff with
before-and-after captures. No ceiling is raised silently, and none is raised to
make a change fit.

The appearance allocation and the rendering budget are **a proposal that the
maintainer has not adopted** (D-R4-317-03). Until he does, the budget policy in
force stands (mode exact, a margin of 0.5% and one request, the standing
approval of 2026-10-10), the allocation is the reference a change cites and
not a licence, and the deferred JavaScript ceiling has tens of bytes of room.
A visual change that adds to a route therefore states the overrun in bytes and
goes to the maintainer as a tradeoff.

### The criteria, as tests

`tools/visual-criteria.mjs` holds the numbers, the judges and the page-side
measurements; `tests/visualCriteria.test.js` shows each judge pass on a
known-good measurement and fail on a known-bad one. The criteria are run on the
pilot states (five lesson pilots and the four sandbox pilot scenes, listed in
that file) from `e2e/visualCriteria.criteria.js`. Most of the 3.0 pilots miss
them, and that is the result: the file fails by design, so it is run on demand
(`npm run e2e:criteria`) and is not part of the browser suite or CI. It is not
marked as an expected failure and not run non-fatal, because a red test
recorded as green weakens the gate. What CI runs on the same measurements are
the judges' own tests and the criteria that have passed and moved into the
suite: the label and selection clauses of I-9, in `e2e/bodyLabels.spec.js`. The
prompt that makes a criterion pass on its pilots moves its test from the
criteria file into the suite as a `.spec.js` with a README row, in the same
change.

| Criterion | Statement | Test |
|---|---|---|
| **I-8**, phone | At 375x812 and 412x915, during a step that uses the scene, the bound bodies are fully visible outside every panel and at least a third of the viewport height is unobscured canvas, or one announced action reaches that state with the step's controls reachable. | `e2e/visualCriteria.criteria.js` |
| **I-8**, tablet | At 768x1024 the step and the scene are both readable side by side. | same |
| **I-8**, desktop clause | At 1366x800 and 1440x900 the bound bodies sit outside every panel. | same |
| **I-9**, labels | Bound-body labels are at least 11 CSS px effective and do not overlap at the pilot states, at device pixel ratios 1 and 2; other canvas text is at least 11. | `e2e/bodyLabels.spec.js`, in the suite |
| **I-9**, selection | The selected body carries a cue that shows in luminance, not only in hue. | `e2e/bodyLabels.spec.js`, in the suite |
| **I-9**, crowd | In the star cluster and the Kuiper belt at their scene records, at 1366 and 375 wide and device pixel ratios 1 and 2, no two body labels overlap, none is under 11 CSS px, and no more than the cap (24, besides the selected and a step's bodies) are drawn; a crowd draws trails for the selected body and the 12 heaviest only and the scene says so. | `e2e/crowdedScene.spec.js`, in the suite |
| **I-9**, arrows | Arrow length rises with the speed it shows, and the legend states the scale. | `e2e/visualCriteria.criteria.js` |
| **I-9**, trails | A trail spans a stated simulated time that does not follow the frame rate (30, 60 and 144 frames a second). | same |
| **I-9**, plots | Ticks are at least 11 px and labels at least 12 px; with several series, each differs by marker shape. | same |

How each is measured, so a later prompt can argue with the method and not the
number:

- *Bound bodies visible.* Each body the step binds is placed on the screen with
  the canvas's own transform and tested with `document.elementFromPoint`: it is
  visible when the canvas is what is at that point.
- *Unobscured canvas.* The viewport is sampled on an 8 px grid with the same
  test; the open height (or width) is the longest run of rows (columns) in
  which at least 60% of the samples are canvas. A phone needs at least a third
  of the height; a tablet at least a third of the width and a lesson panel at
  least 300 px wide that does not overlap the instrument.
- *An instrument pilot.* The Moon image and Io lessons of 3.0 stage a star that
  nothing in the step is about, so for them I-8 asks that the instrument's own
  canvas (or panel) lies inside the viewport and not under another panel.
- *Label size.* Every `fillText` on the main canvas is recorded with its font,
  its transform and the canvas's backing-store scale (`js/quality.js`
  `renderScale`), and converted to CSS pixels. A single symbol glyph after a
  mass (the Earth or Sun sign) belongs to the label before it and is not
  judged alone.
- *Arrow, trail and plot.* The arrow is the shaft the overlay strokes in its own
  colour, drawn for a body at its speed and at three times it; the trail span is
  the trail's sample budget times the step the app plans at that frame rate
  (`js/timestep.js`); plot text is read from the canvas recorder or from the
  plot SVG's `text` nodes scaled by the viewBox.
- *The announced action.* A control in the lesson panel whose name matches
  `SCENE_ACTION_NAME` in `tools/visual-criteria.mjs`. None exists at 3.0; the
  layout prompt names its own control and updates the pattern.

### The 3.0 baseline: what the criteria find

Measured on `v4` at `f1c30f6f` (Chromium, headless, device pixel ratio 1 unless
stated). The full table with every size is `tools/visual-measure.mjs`'s output,
stored under `criteria` in `tests/fixtures/visual-baseline.json`.

| State | 375x812 | 412x915 | 768x1024 | 1366x800 |
|---|---|---|---|---|
| Kepler's 2nd Law | fails: star and eccentric orbiter under the sheet, circular orbiter off screen, 192 px open | fails (240 px open) | fails: panel is 752 px wide | fails: circular orbiter under the control rail |
| Transit Lab | fails: both bodies under panels, 192 px open | fails (232 px open) | fails: planet under the observer help, 144 px open | fails: both bodies under the light-curve panel |
| Weighing the Stars' binary | fails: both stars off screen, 192 px open | fails (240 px open) | fails: both off screen | passes |
| Galilean Resonance (Io, instrument) | passes | passes | passes | passes |
| Moon image (instrument) | fails: 45% of the image canvas under the sheet | fails: 31% | passes | passes |

The labels are 10 px at ratio 1 on the planets and the size disclosure, and
5.1 to 6.1 CSS px at ratio 2 (the canvas's backing store is 1.96 times its CSS
box and its context is not scaled to match). No body is marked when selected.
The velocity arrow's shaft is 70.2 CSS px at speed 1 and at speed 3. A trail's
span is 1.96, 1.85 and 1.74 simulated time units at 30, 60 and 144 frames a
second (a ratio of 1.13). The Kepler plot's ticks and labels are 10 px; the
transit light curve's ticks are 10 px and its labels 11.

### Cost to respect

Read from the files that own them; this section restates, and never sets, a
number.

- **Frame time.** `tools/perf-thresholds.json`, profile
  `sandbox-scenes-low-cpu4` (the low tier, the CPU throttled four times, the
  sandbox reference scenes, thresholds the measurement times 1.5). Measured
  again at this baseline, median of three runs of five seconds, headless
  Chromium at 1366x800 with other jobs on the machine: `solar-system` 14.23 ms
  against 25.0, the zoomed Galilean scene 17.22 ms against 27.0,
  `circumbinary-planet-lab` 12.01 ms against 20.5 and `star-cluster` 20.25 ms
  against 38.5 (the committed 2026-11-13 values were 16.34, 17.73, 13.44 and
  25.40). The profiles are advisory and their runs vary up to twofold on a
  shared machine, so a change is compared on a quiet machine with its own
  before-and-after pair, and a move beyond the threshold is a tradeoff for the
  maintainer with captures, not a threshold to be loosened.
- **Route bytes.** `tools/route-budgets.json`; source routes measured on this
  tree (`node tools/route-budget.mjs`): front door and sandbox 1917.0 KB (104
  requests), Kepler 2634.4 KB (135), Transit 2646.2 KB (135; with its instrument
  2726.3 KB, 140), largest lesson 2941.0 KB (144). The deferred JavaScript
  ceiling has 26 B of room on this build and the first-visit data tier 641 B
  (register row D-R4-317-02).
- **Module size.** `tools/module-size-ceilings.json`: `js/render.js` is 2,932
  lines against a ceiling of 2,932 and `js/lessonStage.js` 1,900 against 1,900.
  Both are at their ceilings, so a change extracts before it adds.

### Matched captures

Before any visual prompt runs, the pilot states are photographed so that its
after can be shown beside its before (`tools/visual-matrix.mjs`).

- **The matrix.** Nine pilot states (five lesson pilots; four sandbox pilot
  scenes: an orbital system, a world seen close, a binary, a crowded scene) at
  375, 768 and 1366 CSS px wide, in the Midnight and Daylight themes and in
  English and Spanish: 108 cells, each with the canvas, the viewport and the
  viewport with the focus ring on one control. The images are an output and
  stay outside the repository, in
  `visual-baseline/v4-f1c30f6f/ in the folder that holds the roadmap files`;
  `tests/fixtures/visual-baseline.json` holds the table of what was captured,
  with image hashes, clocks and records, and `--compare` says which cells a
  later capture changed.
- **Matched states.** A sandbox cell is a scene record
  (`tools/scene-record.mjs`) derived from the committed 1366 record by changing
  the viewport and the theme only: the same camera, seed and physics clock, so
  a narrower width shows less of the scene. A lesson cell is a page record: the
  route, the step's sid, the viewport, the theme, the language, the scroll
  position, the tier and the pixel ratio, with the bodies' places.
- **Framing.** A comparison at different framing is labelled as such and goes
  beside the matched one, never in its place.
- **Reproducibility.** Each cell was captured twice. 49 of the 108 repeat
  (to the pixel, by under six pixels, or differing only inside the playback
  bar's box, whose label samples on the wall clock); 59 do not: all of the
  Weighing the Stars, Galilean Resonance and Moon image cells and 8 of the
  Transit Lab and 3 of the Kepler ones (the staged-star lessons run a physics
  clock a capture cannot hold), and 12 sandbox cells (8 of the binary, 3 of the
  crowded scene, 1 of the close world). A cell that did not repeat is compared
  by eye or by crop, never by hash alone; the table marks each one.

### A world seen close: light, phase and surface

What the sandbox may claim about a lit world, and the numbers it is held to.
The numbers were fixed before the drawing that meets them was written; the
fixture and its tests read them from
`tests/fixtures/light-phase-tolerances.json`, which is the only place they are
stated.

- **The light.** A planet, moon or giant is shaded from the one luminous body
  that sends it the most flux (`dominantLight`, `js/bodyVisuals.js`). A summed
  direction is not used: two stars on opposite sides would cancel and leave a
  world lit from nowhere. A body heavier than a star's lower mass limit lights
  others; a body below it does not, whatever class a scenario gives it.
- **The terminator.** At a drawn radius of 10 px or more, at either quality
  tier, a rocky world or giant shows a lit half and a night half, the edge
  between them perpendicular to the direction of the light. Below 10 px the
  drawing does not change.
- **The phase.** A body whose primary is a planet or a giant is drawn as that
  primary sees it: the lit fraction of the disc is (1 + cos a) / 2, a being the
  angle at the body between the light and the observer, and the terminator is
  an ellipse of semi-minor axis |cos a| r. A body that goes round a star shows
  the half-lit disc a view from above the orbital plane sees, which is the only
  phase that view has.
- **No star.** A scene with no luminous body keeps the fixed light from the
  upper left, draws no phase, and says that its shading is illustration.
- **What is modelled.** The direction of the light, the terminator and the
  phase come from the bodies' positions. Markings, bands and the ring shadow's
  width are illustration, and the canvas description and the inspector say so.

How it is drawn (`js/bodyDraw.js`, with the light from `lightingFor` in
`js/bodyDrawSky.js`, register rows D-R4-448-01 to 05):

- A body keeps its light until another star sends 5% more flux, so the choice
  does not flicker where two stars send the same.
- The observer for a phase is the planet or giant whose Hill sphere the body
  is inside, not the body that pulls on it hardest: the Sun pulls the real
  Moon harder than the Earth does.
- The night side is one fill over the disc after the markings, from 10 px of
  drawn radius at either tier; the low tier's cap removes markings, not the
  night side. Markings (Earth's continents and ice, the Moon's maria and
  craters) and a giant's bands at its latitudes and its flattening come from
  the body's visual seed at the full tier's detailed level.
- Three looks were captured for the maintainer: the terminator alone, with
  markings (shipped), and with limb darkening.

Tolerances, checked on a fixture world (a star, a planet and a moon built by the
scenario builder, never shipped):

| Check | Tolerance | Why this number |
|---|---|---|
| Terminator orientation, at a = 45, 90 and 135 degrees | within 0.5 degrees of the computed one | At a = 0 the disc is fully lit and at a = 180 fully dark, so there is no edge to orient. |
| Lit pixel fraction, at a = 0, 45, 90, 135 and 180 degrees | within 0.02 of (1 + cos a) / 2, on a disc of at least 80 px radius | Edge quantization: an 80 px disc has about 500 edge pixels in 20,000, half a part in a hundred at the limb and as much again along the terminator. |
| The chosen light, at the equal-flux locus of two equal stars | unchanged over 100 steps | Two equal fluxes differ by rounding; a choice made on the exact comparison would flicker. |
| A body drawn below 10 px | the same canvas calls, in the same order, with the same arguments, as before | Stronger than comparing pixels, and it does not depend on the browser's antialiasing. |

### Page families

This section sets no page family's direction. A family (a workspace for doing,
a reference for finding, a catalogue for choosing, a lesson for reasoning, an
instructor page for preparing and reviewing) is given its identity once, by its
pilot, from two or three composed alternatives shown as matched captures and
chosen by the maintainer; the choice is recorded here when it is made. None has
been chosen.

## Breakpoints

One scale, for every stylesheet, every page's own `<style>` and every script
that compares the window's width with a number. PLATFORM_MODEL.md lays the
platform out at four widths; each has a tier, and each width sits inside its
tier rather than on an edge, so a window a few pixels either side of a layout
width gets that layout and not an untested one.

| Tier | Widths | Laid out at | `max-width` that ends it | `min-width` that starts the next |
| --- | --- | --- | --- | --- |
| phone | up to 767 | 375 | `767px` | `768px` |
| tablet | 768 to 900 | 768 | `900px` | `901px` |
| laptop | 901 to 1200 | 1024 | `1200px` | `1201px` |
| desktop | 1201 and up | 1440 | - | - |

`(max-width: 375px)` is the fourth edge, for the few things that do not fit
even the narrowest phone layout (an embedded figure drops its scrubber there).

[`tests/breakpoints.test.js`](tests/breakpoints.test.js) refuses any other
width, in px, rem or em, in a `min-width`, `max-width` or range query. Height
queries (`max-height`) are not widths and are not on the scale.

The scale replaced twenty widths (Roadmap II Prompt 55): 360, 400, 480, 560,
600, 620, 640, 700, 720, 760, 767, 768, 860, 900, 1024, 1099, 1100, 1180,
1200 and 1320, with 30rem, 40rem, 60rem and 64rem in the pages. Each moved to
the edge of its own tier, the one that gave the same answer at 375, 768, 1024
and 1440, so the computed styles at those widths did not change (measured on
seventeen surfaces, every element). Between them a window can change tier:
the control rail now docks from 1201 px rather than 1025, and a rule written
for 480 px holds to 767. The four 360 px rules went: the phone tier holds at
320 without them.

## Field: `.ui-field`

A label, the control it names, and optionally a hint and an error, stacked in
one column. The field sets the spacing; the page sets the grid the fields sit
in.

```html
<label class="ui-field">
  <span>Period</span>
  <input class="ui-input" type="number" step="any" aria-describedby="periodHint" />
  <p id="periodHint" class="ui-hint">In days, from the periodogram.</p>
</label>
```

A field may also be a `<div>` holding a `<label for>` when the control is
named some other way, or when the error must sit outside the label.

| Part         | Look                                                   | Tokens                                   |
| ------------ | ------------------------------------------------------ | ---------------------------------------- |
| `.ui-field`  | Grid, one column, `--space-1` between parts, no margin | `--space-1`                              |
| `.ui-hint`   | 13px, secondary text                                   | `--text-sm`, `--text-secondary`          |
| `.ui-error`  | 13px, semibold, danger                                 | `--text-sm`, `--weight-semibold`, `--danger` |

A hint or an error outside a field (a paragraph after a row of fields) keeps a
`--space-1` top margin; inside a field it has none.

**Invalid.** Set `aria-invalid="true"` on the control, put the message in a
`.ui-error` and name it in the control's `aria-describedby`. The border turns
`--danger` and thickens with an inset ring, so nothing moves. `.ui-field.is-invalid`
does the same for every control in the field. `:invalid` is deliberately not
used: it would mark an empty required field before anyone has typed in it.

## Text input: `.ui-input`

Every text-like input: `text`, `number`, `search`, `url`, `email`, `password`,
`tel`, `date`, `time`. Full width of its field.

```html
<input class="ui-input" type="text" maxlength="120" />
```

| State             | Look                                                         |
| ----------------- | ------------------------------------------------------------ |
| Rest              | `--surface-2`, 1px `--border-strong` edge, `--radius-sm`     |
| Hover             | Edge mixed toward `--accent`                                 |
| Focus             | Edge `--accent`, plus the focus ring                         |
| Disabled          | 55% opacity, not-allowed cursor                              |
| Read-only         | `--surface-1`, a step back from an editable field            |
| Invalid           | Edge `--danger`, thickened                                   |
| Placeholder       | `--text-muted` at full opacity                               |

Modifiers:

- `is-numeric` - tabular figures, for a number typed in a `text` input
  (`inputmode="decimal"`). A `type="number"` input has them already.
- `is-code` - monospace at 13px, for a link, an identifier or JSON to copy.
- `is-inline` - the width of its content, for a control in a sentence. A
  control that is a direct child of a `.ui-toolbar` is inline already, and
  never narrower than 12rem.

### A number with its unit: `.ui-input-group`

```html
<label class="ui-field">
  <span>Exposure</span>
  <span class="ui-input-group">
    <input class="ui-input" type="number" step="any" aria-describedby="expUnit" />
    <span id="expUnit" class="ui-input-unit">days</span>
  </span>
</label>
```

The unit is drawn as a suffix joined to the box. It is text, not part of the
value, so the control names it with `aria-describedby` (or the label says it
too); a screen reader otherwise announces a bare number.

## Select: `.ui-select`

The same box as `.ui-input`, with the browser's own arrow, which follows the
page's `color-scheme`. Long options are clipped with an ellipsis inside the box
- WebKit otherwise sizes a select to its longest option and counts its open
menu as overflow - and the open list is drawn in `--surface-1` and
`--text-primary`, which Windows takes from the options rather than the select.

```html
<select class="ui-select" id="obsTimeScale"></select>
```

`is-inline` works as for an input.

## Textarea: `.ui-textarea`

The same box, at least 4.5rem tall, resizable vertically only, at the reading
line height. `is-code` for JSON and markup.

```html
<textarea class="ui-textarea is-code" rows="5" spellcheck="false"></textarea>
```

## File: `.ui-file`

A file picker that is also its own drop zone. Every engine accepts a file
dropped on a file input, so the zone is the input itself, drawn as a dashed
box in `--surface-inset` that turns `--accent` with `--accent-soft` on hover.
The picker's button has the face of a `.ui-button`. No script is involved.

```html
<label class="ui-field">
  <span>Or import your own file</span>
  <input class="ui-file" type="file" accept=".csv,.json" aria-describedby="importHint" />
</label>
```

`is-compact` draws the button alone, for a picker that already sits inside a
larger drop zone of the page's own (the submission review page). A file input
opened by a separate button stays `hidden` and still carries the class.

## Range: `.ui-range`

A row holding a slider and, optionally, its value. The slider's own look -
the track, its fill to the current value (`--range-fill`, set by script), the
18px thumb - is `css/components.css`'s, shared with the simulation.

```html
<div class="ui-range">
  <input id="zoom" type="range" min="1" max="10" />
  <output class="ui-range-value" for="zoom">5</output>
</div>
```

`.ui-range-value` is monospace with tabular figures, so the row does not jitter
as the value changes. The thumb is under 24px and meets WCAG 2.2's target size
by its spacing: the row is 36px tall and nothing else is within reach of it.

## Button: `.ui-button`

In `css/components.css`, for every page. `is-quiet` for a secondary action
with no surface, `is-danger` for a destructive one. `is-primary` (in
`css/page.css`) marks the one action a form exists for - Run, Save, Compute -
in `--accent` on `--accent-contrast`, 4.5:1 or better in all four themes.

```html
<button type="button" class="ui-button is-primary">Run</button>
```

Disabled is 45% opacity with no hover lift. A link that acts as a button takes
the same class.

## Toolbar: `.ui-toolbar`

A row of buttons and inline controls that wraps on a narrow screen, with
`--space-2` between rows and `--space-3` between items, and `--space-3` above
it. When the row is one group of actions, give it `role="group"` and an
`aria-label`.

```html
<div class="ui-toolbar" role="group" aria-label="Scenario file">
  <button type="button" class="ui-button">New</button>
  <button type="button" class="ui-button is-primary">Save</button>
</div>
```

## Button group: `.ui-button-group`

Buttons that act on one thing - undo and redo - joined into one shape. The
hovered or focused button's edge and ring are drawn on top. Inside a toolbar
that is already a labeled group it needs no role of its own; standing alone,
give it `role="group"` and an `aria-label`.

```html
<span class="ui-button-group">
  <button type="button" class="ui-button">Undo</button>
  <button type="button" class="ui-button">Redo</button>
</span>
```

## Checkbox and radio

In `css/components.css`, on the element, so no class is needed and none can be
forgotten: every `input[type='checkbox']` and `input[type='radio']` is a 24px
box in `--accent` (WCAG 2.2, 2.5.8), which a browser draws at 13-15px. The
rule's weight is nothing (`:where`), so a layout that sizes one for itself
still wins. The label beside it is part of the same target. `e2e/a11ySweepII.spec.js`
fails on any under 24px on any page. (The `.ui-checkbox` class this section once
described was removed as dead by Prompt 51's sweep; nothing used it.)

```html
<label class="ui-choice"><input type="checkbox" /> Trails</label>
```

## Windows high contrast

Under `forced-colors: active` the system palette draws every edge, and an
invalid control keeps a 2px border so its state survives without the danger
color. A button that has no border of its own takes `border: 1px solid
transparent`, which the system palette draws (`none` is not drawn). A pressed,
selected, checked or current button, link or tab keeps the selection color on its
edge and an underline on its words, and the shell's current place the same, so
none of them rests on a color alone. A plot (an svg) is `forced-color-adjust:
none`: its series are told apart by color and the palette would collapse them to
one. `e2e/a11ySweepII.spec.js` holds all of it on every page.

## Page: `.ui-page`

The tool pages' column: centered, `--space-8` above, `--space-4` at the sides
and twice `--space-8` below, above the footer. 64rem wide; `is-narrow` is
52rem (a course read top to bottom), `is-wide` 72rem (a form beside its
output), `is-full` 76rem (a workbench). Links inside it are `--accent` with
the document pages' underline offset - the browser's own blue is 2.2:1 on
these grounds - except a link drawn as a `.ui-button`, which keeps its face.
Headings are on one scale: `h2` is `--text-lg`, `h3` is `--text-md`.

```html
<main id="main" class="ui-page is-wide">...</main>
```

A page keeps its own class beside it (`class="ui-page is-wide fb-wrap"`) when
it has layout of its own to scope.

## Split: `.ui-split`

A workspace beside a narrower column: one column on a phone, two from 64rem.
The narrow column is 26rem (`--ui-split-aside` changes it) and second;
`is-aside-start` puts it first. A child with `.ui-split-aside` stays in view as
the page scrolls; `.ui-split-aside.is-scroll` is also bounded to the window and
scrolls itself, for a column of checks taller than any window.

```html
<div class="ui-split">
  <div id="editor"></div>
  <div class="ui-split-aside is-scroll">...</div>
</div>
```

Tokens: `--space-4`, `--space-8`. A scrolling aside holds focusable controls, so
it is reachable by keyboard without a `tabindex` of its own.

## Grid: `.ui-grid`

Fields side by side, as many as fit at 12rem each (`--ui-grid-min`), with
`--space-3` between. Fields align at their tops; `is-end` aligns them along the
row's foot, for a row of fields that ends in the button acting on them.

```html
<div class="ui-grid is-end">
  <label class="ui-field">...</label>
  <div><button type="button" class="ui-button">Open</button></div>
</div>
```

`.ui-toolbar.is-fields` is the same idea as a wrapping flex row: its fields
share the row at `--ui-field-basis` (12rem) each and line up with the buttons
at its foot.

## Card: `.ui-card`

A bordered box on the page's ground: 1px `--border`, `--radius`, `--space-4`
inside, `--space-5` below. Its first child has no top margin and its last no
bottom margin. `is-compact` is `--space-3` by `--space-4` inside and
`--space-3` below, for a list of cards (a course's items, the composer's steps).

```html
<section class="ui-card" aria-labelledby="openTitle">
  <h2 id="openTitle">Open an observation</h2>
  ...
</section>
```

A card is a region only when it has a heading that names it.

## Fieldset

Every `<fieldset>` on a tool page is a card with its `<legend>` in
`--weight-semibold` - whether or not it carries `.ui-fieldset`, so a script
that builds a form gets it without naming it. `min-width: 0` undoes the user
agent's `min-content`, which otherwise lets one wide select push a fieldset,
and the page, past a phone's edge. `is-compact` is `--space-2` by `--space-3`
inside, for a panel of controls.

```html
<fieldset class="ui-fieldset">
  <legend>Values</legend>
  ...
</fieldset>
```

## Disclosure: `details.ui-disclosure`

A section that opens. The summary is semibold, at least 24px tall, with
`--space-2` below it when open, the browser's own marker and the focus ring on
`:focus-visible`. With `.ui-card` it is a card that opens.

```html
<details class="ui-card ui-disclosure">
  <summary>Change what you are looking at</summary>
  ...
</details>
```

The marker turns with `[open]`, which assistive technology announces as
expanded or collapsed; nothing is hidden by script.

## More: `details.more` (task-aware disclosure)

Simple by default, deeper on request, and never hiding what a task asks the
student to reason about (Roadmap III Prompt 167). One pattern serves four
surfaces: the lesson panel (`#investigationMore`: help, depth switching, the
progress backup and Restart), an instrument panel (`#investigationToolMore`:
sliders and presets the step does not ask about), the settings dialog (the
`.settings-advanced` section: the simulation, black holes, compact objects,
numerical accuracy and performance), and the lesson plot's options.

```html
<details class="more" data-more="lesson">
  <summary>More</summary>
  <div class="more-body">...</div>
</details>
```

- **Native `<details>`.** The browser supplies Enter and Space on the summary,
  the expanded state a screen reader announces and find-in-page, so collapsed
  content stays discoverable by search. Nothing is hidden by script.
- **The summary** is a real target: 32px (24px is the floor) and 44px under a
  coarse pointer, with the panel's focus ring.
- **When it starts open** (`moreOpen`, `js/settingsSchema.js`): what the
  student last chose for that surface comes first, then an activity's
  `'open'` or `'shut'`, then (on the lesson and instrument panels) what the
  first-week collection the student is in says (Prompt 277), then the depth's
  default: shut at the core and
  quantitative depths and the survey course level, open at the advanced depth.
  The student can always open everything and can always fold it again.
- **Remembered per surface** in `gravitas_disclosure` (a preference: a map of
  surface to a flag, device-local, never in a share link). A program that opens
  a More for a reason of its own (a settings search that found something inside
  it) calls `setMore`, which neither remembers nor announces.
- **Announced once per change** through the page's live region
  (`announce`, `js/notify.js`), by a student's own press only.
- **Every control is reachable in two actions**: open More, then use it. The
  explainer for an instrument stays in its panel header, one press away folded
  or open, and the lesson's Help lists it again.

**The task rule.** A step declares the quantities it asks about in the metadata
it already has (`declaredQuantities`, `js/widgets.js`: the fields and their
units, a numeric answer and its unit, the live readout it names, a derived
quantity, a plot, a tolerance). A control or readout that produces a declared
quantity, its unit or its uncertainty cannot be folded on that step:
`toolFold` keeps every slider and every preset where it is on a step that
declares a quantity or sends the student to measure or explore, folds the
sliders after the first on a step that only reads, and folds only the presets
on a step that asks a question with no number. Readouts never fold.
`tests/progressiveDisclosure.test.js` reads every shipped step against this.

**A new control goes behind the disclosure** unless its decision-register row
says why not, and never when the task rule applies. The default-view control
counts are committed in `tools/disclosure-ceilings.json` and held by
`e2e/progressiveDisclosure.spec.js`; a count that rises fails.

## Data table: `.ui-table` and `.ui-table-wrap`

```html
<div class="ui-table-wrap is-numeric is-scroll" tabindex="0" role="region" aria-label="Rows">
  <table id="obsTable">
    <caption>...</caption>
    <thead><tr><th scope="col">Row</th>...</tr></thead>
    <tbody>...</tbody>
  </table>
</div>
```

`.ui-table` on the table, or any table directly inside `.ui-table-wrap`: a
script that builds a table gets the look from its wrapper. The wrapper scrolls
a wide table sideways instead of widening the page; `is-scroll` also bounds
its height (24rem, `--ui-table-height`) and the header row stays on top of the
rows under it. A wrapper that can scroll is a region with a name and
`tabindex="0"`, so a keyboard can reach it, and draws the focus ring.

| Part or state            | Look                                                              | Tokens                                   |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------- |
| Table                    | Full width, `--text-base`, collapsed borders                      | `--text-base`                            |
| Caption                  | Start-aligned, secondary                                          | `--text-secondary`, `--space-1`          |
| Cell                     | `--space-1` by `--space-2`, 1px rule below, top-aligned, wraps    | `--border`                               |
| Header                   | Semibold, sticky, on the page's ground                            | `--bg-color`, `--weight-semibold`        |
| `is-numeric`             | Cells right-aligned in tabular figures on one line; heads stay left |                                        |
| `.is-missing` cell       | Secondary; the page says "missing" in words                       | `--text-secondary`                       |
| `tr[aria-selected]`      | Pointer; hover tint                                               | `--surface-2`                            |
| `tr[aria-selected=true]` | Accent tint and a 3px bar at the row's start                      | `--accent-soft`, `--accent`              |
| `tr:focus-visible`       | The focus ring, inset                                             | `--focus-ring`                           |
| `tr.is-masked`           | Italic and secondary                                              | `--text-secondary`                       |

**Keyboard row selection** is the page's script: `js/plot/table.js` makes
the table an ARIA grid (`role="grid"`, `aria-multiselectable`), gives the
focused row `tabindex="0"` and the rest `-1`, and moves with the arrows, Page
Up and Down, Home and End, toggles with Space and clears with Escape; the
Observatory and the analysis laboratory's trials both use it. The component
draws the states those keys set. Selected is never color alone: the bar is a
shape, and the row is `aria-selected`. Under `forced-colors` a selected row is
drawn in `Highlight`. The submission review's table has no selection and
needs none.

## Status line: `.ui-status`

One line under a form that says what happened, at least one line tall even
while empty, so text arriving does not move the page. `is-error`, `is-warning`
and `is-success` color it; the words say the same thing. The element carries
`role="status"` (or `aria-live`) from its page.

```html
<p id="fbLinkStatus" class="ui-status" role="status" aria-live="polite"></p>
```

## Issues: `.ui-issues`

The list a check produces. Each item's `data-level` - `error` or `warn` - colors
it `--danger` or `--warning`; the item's text states the problem, so the color
is the second telling.

```html
<ul id="st-checks" class="ui-issues">
  <li data-level="error">Title (English): write this in every language.</li>
</ul>
```

## Inline alert: `.ui-alert`

A message about the content, in the page's flow: a 3px bar at its start in the
alert's color, a 10% tint of it, and the text in `--text-primary`, so it meets
4.5:1 in every theme whatever the alert's color. Info (the default) is
`--accent`; `is-success`, `is-warning` and `is-error` use the status colors.
An empty alert takes no room, so a script can keep one in place and fill it.
It may be a `<p>`, or a `<ul>` of several problems. A message that appears
while the reader works carries `role="alert"`; a standing note does not.

```html
<ul id="importProblems" class="ui-alert is-error" role="alert" hidden></ul>
<p class="ui-alert">Educational software, not operational mission design.</p>
```

## Toasts and tabs

None of the tool pages has a toast or a tab set of its own, so neither is a
component here. The application's toast is `js/controls.js`'s, styled in
`css/components.css`.

## Empty, loading and error blocks: `.ui-state`

The place where content will be, saying why it is not there: centered,
secondary text in a dashed `--border` box, `--space-8` of room. Prompt 57 writes
their words; this is their shape.

| Modifier     | Look                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| `is-empty`   | The default look: nothing yet                                               |
| `is-loading` | An indeterminate 3px `--accent` bar under the words; still under reduced motion |
| `is-error`   | Solid `--danger` edge, text in `--text-primary`                             |
| `is-bare`    | No edge, inside a box that has one                                          |
| `is-overlay` | Covers a view, on its own dark (`--space-far` at 86%), in `--hud-text-strong` |

On `.ui-sky` the words are `--hud-text`. A loading block carries
`aria-busy="true"` from its page and its words are in a live region, so the
change to content is announced; the bar is decoration.

```html
<p class="ui-state is-empty">Drop reports, backups or tokens above.</p>
<div class="ui-state is-overlay" id="l3-notice" role="status" hidden></div>
```

## Small parts

| Class                         | What                                                                          | Tokens                                     |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `.ui-badge`, `is-accent`      | A pill: a kind, a version, "advanced"                                         | `--border-strong`/`--accent`, `--text-sm`, `--radius-full` |
| `.ui-note`                    | Secondary text: a caption, a legend, a note under a heading                   | `--text-base`, `--text-secondary`          |
| `.ui-meta`                    | A definition list, term beside value; one column under 30rem                  | `--space-1`, `--space-4`                   |
| `.ui-choice`, `is-block`      | A checkbox or radio and its words, one 24px target; `is-block` one per line   | `--space-2`                                |
| `.ui-choices`                 | A wrapping row of choices                                                     | `--space-1`, `--space-4`                   |
| `button.ui-link`              | A button that reads as a link, in a list of steps; `aria-current` is semibold | `--border-strong`, `--accent`              |
| `.ui-button.is-small`         | A 28px button beside a table or a selection                                   | `--space-1`, `--space-3`, `--text-sm`      |
| `.ui-legend`, `is-stacked`    | What a plot's colors mean, in a wrapping row or a column                      | `--text-base`, `--text-secondary`          |
| `.ui-swatch`, `is-round`      | A legend's square or dot; its color is the data's, set by script              | `--border-strong`                          |
| `.ui-figures`                 | Plots side by side at 16rem (`--ui-figures-min`), captions secondary          | `--space-4`                                |
| `.ui-plot`                    | A plot or a view: full width, an edge, `--radius-sm`                          | `--border`                                 |
| `.ui-sky`                     | The simulation's dark sky in every theme, with the HUD's text                 | `--space-far`, `--hud-text`                |
| `progress.ui-progress`        | 12rem, or the row with `is-block`, in `--accent`                              | `--accent`, `--space-3`                    |

`button.ui-link` is still a button: Enter and Space press it, it is named by
its words, and it is at least 24px tall. A swatch is `aria-hidden`; its entry's
words say what it stands for. Plots drawn on `.ui-sky` keep the object hues
(`--hue-*`), which no theme changes, so a mark means the same thing in every
theme; Observatory red reddens the ground and the text around them.

## Observation plots

`js/plot/plot.js` ([PLOT_COMPONENT.md](PLOT_COMPONENT.md)) draws the
Observatory's plots and the analysis laboratory's, and its marks are styled
once, in `css/page.css`: points in `--hue-comet`, the selection in
`--hue-star`, masked points as `--hue-asteroid` rings, the model curves in
`--hue-gasgiant`, `--hue-blackhole` and the cyan and amber mixed, the focus
ring in `--hud-text-strong`, on `--space-far`.

## The Observatory's red night vision

Observatory red is a set of token values in `css/tokens.css`. The tool pages
write no color of their own, so every card, table, status line and alert
follows it: grounds and edges go red, text goes warm. The plots keep the
object hues, as the simulation's canvas does. A proposal to give the plots
their own red set is in the token proposals below.

## Touch measurement

How any instrument that reads a value off a picture is operated by a finger,
defined here once for Prompt 179 and every later instrument
([INTERACTION.md](INTERACTION.md), the single-pointer rule). A mouse and a
keyboard keep what they have; this is the pattern a touch reader gets.

- **Place, then nudge.** A tap puts a marker where the finger landed; a drag is
  never required to reach a value. Beside the marker, one pad of controls moves
  it by the keyboard's three step sizes (fine a quarter step, one step, coarse
  four) and a confirm and a cancel, so a touch reader has Enter and Escape.
  The marker stays until it is confirmed or cancelled.
- **The loupe.** While a finger is down on the picture, a 3x magnifier circle,
  96 px across, is drawn 72 px above the contact point (below it near the top
  edge), with the marker's crosshair at its centre, because the finger hides
  what it points at. It is a picture of the same pixels, not a second
  measurement. It is not shown for a mouse.
- **Handle sizes.** A handle the reader grabs is at least 24 x 24 CSS px, the
  floor of WCAG 2.5.8 (Target Size, Minimum) and the design system's size for
  every control today, and 44 x 44 on a touch screen (`pointer: coarse`).
  A handle for a precise task (a ruler's end, an aperture's edge) is a larger,
  dedicated one, 56 x 56, with a visible dot of the true size at its centre.
- **Spacing.** A target smaller than 24 px is allowed only if a 24 px circle
  centred on it meets no other target's circle (2.5.8's spacing exception);
  two adjacent 24 px handles need no gap. Handles that cannot meet this, such
  as the ends of a short ruler, move apart or are reached by selecting one and
  nudging.
- **Inline exceptions.** A link inside a sentence is exempt (2.5.8's inline
  exception) and is not enlarged; neither is a control the browser draws, or
  one whose size is essential to what it measures. Each use of an exception is
  named in the instrument's own documentation.
- **No drag is required, and no second finger.** Pinch and rotate have buttons;
  the nudge pad is the keyboard's arrow keys on a screen.

Where the pattern is built and measured (Prompt 283, `e2e/mobileSweep.spec.js`,
at a phone of 375 x 812 and a tablet of 768 x 1024, touch emulation, Chromium):

- **The loupe** is one module, `js/observatory/loupe.js`, used by every image
  task that takes a finger: the marks panel, the photometry stamp and the
  Observatory's pixel image. It is for touch only.
- **Handles.** The photometry stamp draws a dot of the true size at the east
  side of each of its three rings; a tap within 28 CSS px of a handle (a 56 px
  target) chooses that ring, and a tap anywhere else sets the chosen ring's
  radius, which the three step sizes then nudge. A tap that would be nearer a
  handle than the ring it means to set chooses the handle: tap off the east
  axis to set a radius.
- **The plot cursor.** On a series chart (`js/plot/chart.js`) a finger puts the
  readout on the nearest point and scrubs it along; the readout stays when the
  finger lifts, is said as the keyboard's is, and two buttons, Previous point
  and Next point, move it one point at a time (made on the first touch).
- **Measured.** `e2e/touchTargets.js` applies this section's size, spacing and
  inline rules to every shown control; `tools/touch-targets.json` records the
  rule and what each page measured. The inline exception is read as a link in a
  block that is not a flex or grid row and has at least eight letters or digits
  of other text; a browser-drawn picker is the user-agent exception.

## Token proposals

`css/tokens.css` is not edited by component work. What the components above
wanted and did not have, for whoever next changes the tokens:

- `--space-7` (1.75rem) and `--space-9` (2.25rem) are used by `css/page.css`'s
  document-page rules (`.doc-main h2`, `.doc-glance`, `.portal-login`) and are
  not defined, so those margins and gaps compute to their initial values. Define
  them, or move those rules to `--space-6`/`--space-8`.
- `--space-12` (3rem) and `--space-16` (4rem): the tool pages' foot is written
  as `calc(2 * var(--space-8))`.
- Plot tokens - `--plot-point`, `--plot-selected`, `--plot-masked`,
  `--plot-model-1` to `--plot-model-3`, `--plot-axis` - defaulting to the
  object hues used today, with an Observatory-red set, so a plot in that theme
  is night-vision safe too. Today they are theme-invariant by design.
- `--focus-ring-inset` for a ring drawn inside a row or a view, now written as
  `calc(-1 * var(--focus-ring-width))`.

<!-- Listed in DOCUMENTS.md. -->
