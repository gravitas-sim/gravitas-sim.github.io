# Interaction contract

The rules every widget obeys, and the tests that hold it to them (Prompt 155,
Roadmap III). The rules are here; the same rules as data are in
[`tools/interaction-contract.json`](tools/interaction-contract.json), which
`tests/interactionContract.test.js` reads against the source. The walks of the
surfaces are in `e2e/interactionContract.spec.js`, `e2e/a11ySweep.spec.js`
(Prompt 278: every surface of the navigation inventory, and every control that
replaces a drag) and the specs they name.
[ACCESSIBILITY.md](ACCESSIBILITY.md) says what was found and fixed;
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) holds the touch-measurement pattern.

```bash
npx jest tests/interactionContract.test.js
GRAVITAS_E2E_PORT=4391 npx playwright test e2e/interactionContract.spec.js
GRAVITAS_E2E_PORT=4391 npx playwright test e2e/a11ySweep.spec.js --project=chromium --workers=2
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
- **K2, A.** One press armed keyboard placement and panned the view left
  (measured on 2026-10-19 with a type armed: the view moved 40 px and a
  placement began). Resolved by Prompt 278: with a type armed, A arms the
  placement and no longer pans; with nothing armed it pans as W, S and D do, and
  the arrows always pan (`e2e/a11ySweep.spec.js`, "A arms a placement and does
  not also pan").
- **K3, - and =.** Simulation speed in the sandbox, zoom in the 3-D lab. The two
  never share a page. The contract gives + and - to zoom; the sandbox keeps them
  for speed, and its zoom is the view pad's two buttons, reached with Tab and
  pressed with Enter (`interaction.keyboard.sandbox-zoom`, built by Prompt 278).
  Moving speed to another pair, so that + and - could zoom in the sandbox too,
  is still a decision for Carl.

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
| `sandbox.pan` | `sandbox.view` | The view pad in Tools (four buttons move the view, two zoom it); arrow keys and W, A, S, D | met (`interaction.single-pointer.sandbox-pan`, `interaction.keyboard.sandbox-zoom`) |
| `observatory.brush` | `observatory.selection` | Click a table row; click the plot for the nearest row; **Select a run of rows**, then the last row, with no key held | met (`interaction.single-pointer.observatory-run`) |
| `observatory.image-box` | `observatory.selection` | Click a pixel; the table lists every pixel | met |
| `lesson.picker` | lessons | A click sets the value; the arrows step it | met |
| `lab3d.orbit` | `lab3d.camera` | The view pad under the view (arrows that turn or move, two that zoom); the Look and Projection selects; arrows, Shift pans, + and - zoom | met (`interaction.single-pointer.lab3d-orbit`) |
| `observer.handle` | `sandbox.observer` | The Position angle slider in every observing panel | met (`interaction.single-pointer.observer-handle`) |
| `window.move` | `lab3d.describe` | `e2e/a11y3dMission.spec.js` (Tab to Describe the view and Enter) | `e2e/a11y3dMission.spec.js` (one press) | `e2e/a11y3dMission.spec.js` (the description is said in a polite live region; the orbit numbers are withheld while a guide step asks for a measurement) |
| `mission.window.grid` | `e2e/a11y3dMission.spec.js` (the arrows, Page Up and Page Down, Home and End, in English and in Spanish) | `e2e/a11y3dMission.spec.js` (a press on a cell) | `e2e/a11y3dMission.spec.js` (each cell's label is the announcement; the same sentence is under the table) |
| `sandbox.windows` | The Move button in the window's header (press it, then press where the corner goes; or the arrow keys); the spacetime view's Size button | met (`interaction.single-pointer.window-move`) |
| `spacetime.orbit` | `sandbox.spacetime` | The pad under the spacetime view: turn, tilt, move and zoom | met |

No drag is a gap. The six that Prompt 155 recorded as pending acceptance checks
(`tools/pending-acceptance.json`) were built and activated by Prompt 278: each
is an ordinary test now, in `tests/interactionContract.test.js` (the control
exists and is wired) and in `e2e/a11ySweep.spec.js` (what it does, by keyboard
and by single presses). `spacetime.orbit` was not on Prompt 155's list: the
listener is the vendored OrbitControls, which the scan of pointer listeners
does not read, so the contract names such sites by hand
(`dragSites.vendored`).

A window moved without a drag is `js/windowMove.js`: the Move button arms a
placement, the next press lands on a veil over the page (so it cannot also
place a body or press a control) and puts the window's top left corner there;
the arrow keys move it by the three nudge sizes; Escape disarms.

### Touch measurement

Defined once, in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#touch-measurement), for
Prompt 179 and every later instrument to use: place then nudge, the loupe, the
handle sizes and the spacing and inline exceptions, and the larger dedicated
handles for precise tasks.

Prompt 283 measured the whole at a phone and a tablet with touch emulation
(`e2e/mobileSweep.spec.js`, `tools/touch-targets.json`): the size, spacing and
inline rules over every shown control, the precision of the marks panel by
finger, the loupe on every image task, a photometry ring chosen by its handle,
the plot cursor by touch, and fifteen workflows. Emulation is not a device:
OFFLINE_AND_LOW_END.md says what it covers.

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

- an animated lesson instrument opens still: a step's tool starts by itself only
  when the step allows it and motion is not reduced (`autoruns`, `js/widgets.js`),
  and Run starts it. Two families of instruments (resonances, exoplanets) have no
  Run control yet; `tools/motion-inventory.json` names them.

Applies to the sandbox. The other pages follow the system setting and have
their own controls (the 3-D lab's Reduced box). The reader's own choice does not
reach them: Prompt 279 recorded that (`override` in the motion inventory, held
exact by `e2e/a11ySweepII.spec.js`) and proposed carrying it to the shell's head
script. `tools/motion-inventory.json` lists every keyframes and scheduler and
what each does, and `tests/motionInventory.test.js` keeps the list true.

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
| `sandbox.view` | `e2e/canvasInput.spec.js`; the view pad in `e2e/a11ySweep.spec.js` | `e2e/a11ySweep.spec.js` (the view pad) | `e2e/a11ySweep.spec.js` (the zoom, once the pressing stops; a pan moves a picture and says nothing) |
| `plot.cursor` | `e2e/plotChart.spec.js` | `e2e/interactionContract.spec.js` | `e2e/interactionContract.spec.js` |
| `observatory.selection` | `e2e/observatory.spec.js` | `e2e/interactionContract.spec.js`; the run in `e2e/a11ySweep.spec.js` | `e2e/observatory.spec.js` |
| `observatory.marks` | `e2e/imageMarks.spec.js` | `e2e/imageMarks.spec.js` (place, then nudge with the pad; no drag) | `e2e/imageMarks.spec.js` (one message per commit) |
| `lab3d.camera` | `e2e/lab3dView.spec.js` | `e2e/interactionContract.spec.js` (presets); `e2e/a11ySweep.spec.js` (the view pad) | `e2e/a11ySweep.spec.js` (where the view is from and how much it holds, once the pressing stops) |
| `sandbox.windows` | `e2e/a11ySweep.spec.js` | `e2e/a11ySweep.spec.js` (the spacetime view, the inspector and a pinned card) | `e2e/a11ySweep.spec.js` |
| `sandbox.observer` | `e2e/a11ySweep.spec.js` | `e2e/a11ySweep.spec.js` | not applicable: a native slider says its own value |
| `sandbox.spacetime` | `e2e/a11ySweep.spec.js` | `e2e/a11ySweep.spec.js` | not applicable: a picture of a grid moves |

### The walk inventory

`tools/interaction-contract.json` holds, under `inventory`, one row for every
surface of the navigation inventory (`tools/navigation-inventory.json`): its
page, its primary task, the control that task begins with and the key that
operates it. The checker refuses a surface with no row and no reason; the one
reason today is the printed manual, a PDF with no page of ours to walk.

`e2e/a11ySweep.spec.js` walks every row in English and in Spanish with real key
presses (`e2e/walk.js`):

1. Tab from the top of the page until focus comes round again. Focus is never
   trapped; every stop has an accessible name; every stop's box is inside the
   viewport while it has focus (a box, because `toBeVisible()` passes below the
   fold); and every control a pointer can press is among the stops.
2. Tab to the row's control and press its key. Something a reader can notice
   must change: the address, a dialog or a status, the control's own state, or
   the page's text.

`inventory.states` holds the same walk for a state a page does not open in:
the sandbox with Tools open, with State open and with the light curve panel
out (its observer sliders among the stops), each reached from the keyboard
first; Home, Home in its first-week mode and the introduction of a first visit
(Prompt 277's surfaces); and the teaching kit's collection form, after two
Library entries have been saved from the keyboard.

What a walk does not judge: whether the order is the meaningful one, whether a
focus indicator can be seen, anything a screen reader says, and states a page
reaches only after other choices. Prompt 279 takes structure, zoom and
contrast; Prompt 281 the 3-D and mission labs' semantic scenes.

Six rows say `spanish: false`: the instructor portal, the evaluation kit, the
model, validation and glossary pages and the original-version page stay in
English when Spanish is the stored choice. The first five carry Spanish text
and a language switch that stores the choice; their pages do not read it when
they open. That is recorded, not repaired, here: it is Prompt 282's
(Localization II).
