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
| [`css/page.css`](css/page.css)             | The form controls below: field, input, select, textarea, file, range, toolbar, button group | The document and tool pages, not the simulation    |

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
  is 24px.
- **Text is 16px in a field,** the size below which iOS zooms the page when
  the field takes focus.
- **State is never color alone.** An invalid field has a message; a disabled
  control is dimmed and says why nearby when the reason is not obvious.
- **Every control has a name** from a `<label>`, or an `aria-label` where a
  visible label would repeat a heading.

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

## Not yet components

Cards, data tables with sticky headers, tabs, disclosure sections, status
lines, toasts, inline alerts and the empty, loading and error blocks are still
page-local. Until each joins this document, copy the nearest page's rule
rather than inventing a new one.
