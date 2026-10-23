# Interaction contract

The rules every widget obeys, and the tests that hold it to them (Prompt 155,
Roadmap III). The rules are here; the same rules as data are in
[`tools/interaction-contract.json`](tools/interaction-contract.json), which
`tests/interactionContract.test.js` reads against the source. The walks of the
surfaces are in `e2e/interactionContract.spec.js` and the specs it names.
[ACCESSIBILITY.md](ACCESSIBILITY.md) says what was found and fixed;
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) holds the touch-measurement pattern.

```bash
npx jest tests/interactionContract.test.js
GRAVITAS_E2E_PORT=4391 npx playwright test e2e/interactionContract.spec.js
```

## 1. One keyboard model

The same keys for the same actions everywhere. A surface binds the keys it
needs and no others, and names a conflict for any it uses differently.

| Action | Keys | Notes |
| --- | --- | --- |
| nudge | Arrow keys | Alt is a quarter of a step, no modifier one step, Shift four: `js/shortcuts.js` (`nudgeSize`, `nudgeScale`), the sizes the placement aim has always had |
| along | Left, Right | Previous and next along an ordered set |
| across | Up, Down | Previous and next series |
| page | PageUp, PageDown | A jump the surface declares (10 points on a plot's cursor, 50 on its selection) |
| first, last | Home, End | |
| confirm | Enter | Space where the item is a toggle |
| cancel | Escape | The innermost thing: a placement, a selection, a dialog |
| zoom | + or =, - | Where a surface has a camera |
| open the table | the surface's Table control | No bare key: T is the theme everywhere |
| open the disclosure | Enter or Space on its summary | The browser provides it |

Existing bindings stay wherever they are consistent. The help overlay is built
from the registry in `js/shortcuts.js`, so a global key shown there and the
key that is handled cannot differ; surface-local keys are in this table.

### The conflict list

Found by reading every surface against the table, and kept honest by the test:
a letter that a shortcut and the pan handler both take must be named here, and
a module that listens for pointer movement must be registered.

- **K1, Shift+Arrow.** Coarse nudge in the sandbox's aim; extend the selection
  on a plot, the image and the table; pan in the 3-D camera. Declared: a
  selection surface keeps Shift to extend and uses PageUp and PageDown for its
  coarse step, and the 3-D camera keeps Shift to pan. A rename of the camera's
  pan (to Ctrl) is proposed, not made: it changes a binding people may have been
  taught.
- **K2, A.** One press arms keyboard placement and pans the view left. Measured
  on 2026-10-19 with a type armed: the view moved 40 px and a placement began.
  The rename that removes it, visible and on its own train PR, is that A no
  longer pans while a type is armed (the arrows always pan). Status: open in
  this PR.
- **K3, - and =.** Simulation speed in the sandbox, zoom in the 3-D lab. The two
  never share a page. The contract gives + and - to zoom, so the sandbox, which
  has no keyboard zoom, has a gap (`interaction.keyboard.sandbox-zoom`).

### The binding test

For every registered surface: each key it binds is a key of the contract with an
action the contract gives it (or the surface names its conflict), and the key is
written in its source. The checker is `tools/interaction-contract.mjs`; the test
also runs it on contracts built to fail.

## 2. The single-pointer rule

Every drag has an alternative that needs one pointer and no path (WCAG 2.5.7),
and a keyboard alternative where the drag sets a value. Where the drag's feel
matters, a numeric form reproduces its outcome, with a test that a numeric
launch equals a recorded drag in the sandbox
(`e2e/interactionContract.spec.js`, "a typed launch is the recorded drag").

| Drag | Surface | Alternative | Status |
| --- | --- | --- | --- |
| `sandbox.throw` | `sandbox.placement` | Precise placement form; keyboard aim | met |
| `sandbox.pan` | `sandbox.view` | Arrow keys and W, A, S, D | gap: `interaction.single-pointer.sandbox-pan` |
| `observatory.brush` | `observatory.selection` | Click a table row; Shift-click a run; click the plot for the nearest row | met for a pointer; a run without a modifier is `interaction.single-pointer.observatory-run` |
| `observatory.image-box` | `observatory.selection` | Click a pixel; the table lists every pixel | met |
| `lesson.picker` | lessons | A click sets the value; the arrows step it | met |
| `lab3d.orbit` | `lab3d.camera` | The View and Projection selects; arrows, Shift pans, + and - zoom | gap: `interaction.single-pointer.lab3d-orbit` |
| `observer.handle` | the sandbox canvas | none found | gap: `interaction.single-pointer.observer-handle` |
| `window.move` | pinned inspector cards, the 3-D view window | none | gap: `interaction.single-pointer.window-move` |

A gap is a pending acceptance check (`tools/pending-acceptance.json`), run and
reported on every run and not a failure until Prompt 278 activates it and
builds the control. Its probe in `tests/interactionContract.test.js` is a
placeholder for the design that prompt chooses.

### Touch measurement

Defined once, in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#touch-measurement), for
Prompt 179 and every later instrument to use: place then nudge, the loupe, the
handle sizes and the spacing and inline exceptions, and the larger dedicated
handles for precise tasks.

## 3. Focus and announcements

- **Dialogs** open and close through `js/dialog.js`, which traps focus, makes the
  rest of the page inert and returns focus to the trigger.
- **Panels, disclosures and in-page changes** use `moveFocus(el, message)` and
  `returnFocus(trigger, fallback)` from `js/interaction.js`: focus never rests
  on an element that has gone, and a move is announced.
- **One announcer**: `announce()` in `js/notify.js` and its single live region,
  `#srStatus`. A repeat is made audible; a caller that can fire unprompted
  passes `again` false.
- **Readouts: announce on commit.** A nudge changes a value many times a second;
  `settledAnnouncer` says the latest only after the pressing stops, and `commit`
  says it at once. Moving through an ordered set (a plot's cursor, a table row)
  is navigation, not a nudge, and describes each stop.

## 4. Reduced motion

One policy, `prefersReducedMotion()` in `js/quality.js` and, for CSS,
`prefers-reduced-motion` with the reader's override `data-motion` on the root:

- the system setting is honoured everywhere;
- **Settings, Motion**: Follow my device, Reduced, or Step by step. It is kept on
  this device (`gravitas_motion`, STORAGE.md) and never travels in a share link;
- an override only adds reduction, as an embed's does: a system that asks for
  reduced motion keeps it whatever is chosen;
- the shell's transitions and every animation stop (`css/tokens.css` durations,
  and the two blanket rules in `css/styles.css` and `css/components.css`), the
  splash is skipped, dialogs open without waiting a frame;
- the plot component animates nothing (a test holds it);
- **Step by step** is the orbital motion's mode: the world is built but not
  started, and nothing moves until the reader steps it with the period key or
  presses play. The content is unchanged. A scenario the reader chooses starts
  as it always does; that is their act.

Applies to the sandbox. The other pages follow the system setting and have
their own controls (the 3-D lab's Reduced box); carrying the override to the
shared shell is Prompt 161's.

## 5. Tests as a contract

A surface registered here passes four things, each a named test in a named
file (the checker fails a name that does not exist):

1. the binding test (section 1);
2. a keyboard walk of its primary task;
3. a single-pointer walk of every drag it has;
4. an announcement test.

The accessibility shard runs them. Prompt 161 folds the registry into the
navigation inventory, registers the remaining surfaces and lists their failures
as pending acceptance; Prompt 278 activates them.

### Registered surfaces

| Surface | Keyboard walk | Single-pointer walk | Announcement |
| --- | --- | --- | --- |
| `sandbox.placement` | `e2e/bodyPlacement.spec.js` | `e2e/interactionContract.spec.js` | `e2e/bodyPlacement.spec.js` |
| `sandbox.view` | `e2e/canvasInput.spec.js` | gap (`sandbox.pan`) | not applicable: a picture moves, no value changes |
| `plot.cursor` | `e2e/plotChart.spec.js` | `e2e/interactionContract.spec.js` | `e2e/interactionContract.spec.js` |
| `observatory.selection` | `e2e/observatory.spec.js` | `e2e/interactionContract.spec.js` | `e2e/observatory.spec.js` |
| `observatory.marks` | `e2e/imageMarks.spec.js` | `e2e/imageMarks.spec.js` (place, then nudge with the pad; no drag) | `e2e/imageMarks.spec.js` (one message per commit) |
| `lab3d.camera` | `e2e/lab3dView.spec.js` | `e2e/interactionContract.spec.js` (presets); orbit is a gap | not applicable: a picture moves, the tables do not change |

What the registered surfaces do not yet do is listed in the pending checks:
`interaction.keyboard.sandbox-zoom`, `interaction.single-pointer.sandbox-pan`,
`interaction.single-pointer.lab3d-orbit`,
`interaction.single-pointer.observer-handle`,
`interaction.single-pointer.window-move` and
`interaction.single-pointer.observatory-run`.
