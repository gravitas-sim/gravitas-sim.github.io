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

## Checkbox: `.ui-checkbox`

In `css/components.css`. A 24px box in `--accent`; the label beside it is part
of the same target.

```html
<label><input class="ui-checkbox" type="checkbox" /> Trails</label>
```

## Windows high contrast

Under `forced-colors: active` the system palette draws every edge, and an
invalid control keeps a 2px border so its state survives without the danger
color.

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

**Keyboard row selection** is the page's script: `js/observatory/table.js` makes
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

`js/observatory/plot.js` draws the Observatory's plot and the analysis
laboratory's, and its marks are styled once, in `css/page.css`: points in
`--hue-comet`, the selection in `--hue-star`, masked points as `--hue-asteroid`
rings, the model curves in `--hue-gasgiant`, `--hue-blackhole` and the cyan and
amber mixed, the focus ring in `--hud-text-strong`, on `--space-far`.

## The Observatory's red night vision

Observatory red is a set of token values in `css/tokens.css`. The tool pages
write no color of their own, so every card, table, status line and alert
follows it: grounds and edges go red, text goes warm. The plots keep the
object hues, as the simulation's canvas does. A proposal to give the plots
their own red set is in the token proposals below.

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
