# Accessibility

Gravitas targets **WCAG 2.2 Level AA**. This is what has been done, what is
checked automatically, and — the part worth reading — what the visual
simulation cannot offer regardless of effort.

## What is checked, on every run

| Check | Covers |
| --- | --- |
| `e2e/accessibility.spec.js` | axe-core over 13 surfaces × 2 languages × 2 themes — 52 runs |
| `e2e/accessibilityManual.spec.js` | Focus order, focus traps, Escape, focus restoration, heading order, landmarks, reflow, reduced motion, and the canvas description |

Both run in CI. The axe run uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` and `best-practice` rule sets, and **disables no rules**. There were
two candidates for exemption during the pass and neither survived it: each was
a real defect with a real fix.

The surfaces: the front door, the sandbox, the settings rail, the scenario
gallery, the object inspector, the investigations browser, an open
investigation, the share dialog, the A/B bench, the observing panels, lecture
mode, the model page and the instructor portal.

Both languages, because a Spanish string is often longer than its English
original and because `lang` has to follow the interface or a screen reader
pronounces Spanish with an English voice. Both themes, because contrast is a
property of the palette and passing in Midnight says nothing about Daylight.

## What was wrong, and what changed

**Contrast.** Every one of the nineteen contrast failures traced to a single
token, `--text-muted`, which measured between 2.98:1 and 4.48:1 depending on
the surface under it. It is now 4.5:1 or better in all four themes. Two more
followed: the Daylight accent put white text at 4.10:1, and the "on" state of a
toggle rendered at 4.04:1 because it is drawn at less than full opacity over a
tinted background — a reminder that a token passing in isolation is not the
same as the pixels passing.

**`aria-labeledby`.** Six sections of the front door used a misspelling of
`aria-labelledby`, so none of them had the accessible name the markup was
trying to give them.

**A panel hidden from assistive technology.** The 3-D viewport carried
`aria-hidden="true"` while containing two real buttons. They stayed in the tab
order, so a keyboard reader could focus the close button and be told nothing at
all about it. The attribute is gone; `display: none` hides the panel from
everyone when it is shut, which is the correct mechanism and the only one
needed.

**Landmarks.** The page had none — a skip link and an `h1`, and then forty
top-level `div`s. Everything outside a dialog was outside a landmark. The
simulation is now `<main>`, and the readout, the scenario card, the transport,
the pinned cards and the observing panels are named regions.

**Two roles that promised behaviour that did not exist.** The control rail and
the lecture bar declared `role="toolbar"`, which tells a screen-reader user to
expect a single tab stop and arrow-key navigation between the controls. Neither
implements that, and in lecture mode the arrow keys do something else entirely
— they step the sequence. Both are named regions now, which is both true and a
landmark.

**Escape did not work from a text field.** The keyboard shortcut layer ignored
every key when focus was in an input, Escape included. The share dialog opens
with the URL focused and the gallery has a search box, so in both cases a
keyboard reader who had reached the field could not dismiss the dialog with the
key everyone tries first. Escape is now the one key exempt from that guard; a
field that wants it takes it with `stopPropagation()`, which the settings filter
already did.

**Three modals did not trap focus.** The gallery, the share dialog and the
investigations browser all declared `aria-modal="true"` and let Tab walk out
into a control rail the reader could not see. The front door had a correct
implementation; it is now `js/focusTrap.js` and all four use it. It cycles Tab
within the dialog, marks the rest of the page `inert`, and restores focus to
whatever opened it.

**Target size.** Sliders presented a 7-pixel-tall target across their whole
width; the inspector's help affordances were 16px and checkboxes 15px. All are
at least 24×24 now. The sliders keep their thin visual track — the element grew
and its background is clipped to the content box.

**Reduced motion.** `css/tokens.css` collapsed the duration tokens, which
covered `components.css`. It did not cover `styles.css`, which animates with
literal durations and had four loops that never stopped. It does now.

**Two headings competing for the top level.** The splash wordmark was an `h1`
alongside the page's own. It is a paragraph.

## The canvas

The simulation canvas has an accessible name and points, through
`aria-describedby`, at a textual equivalent that is kept current by
`js/canvasSummary.js`:

> Scenario: Solar System. Running. 32 bodies: 1 star, 4 planets, 4 gas giants,
> 16 asteroids, 7 comets. Nothing is selected. Measurements are in the
> simulation readout region.

It reports the four things the canvas shows at a glance: which system is
loaded, whether it is running, what is in it, and what is selected.

**It is deliberately not a live region.** The simulation changes sixty times a
second and a live region attached to it would produce a stream of speech no
reader could interrupt — worse than silence, because it would also drown out
the announcements that matter. The description is read when a reader moves to
the canvas. Discrete events — a scenario loading, a pause, a selection — go to
a separate polite live region, and only when the reader caused them.
`e2e/accessibilityManual.spec.js` watches that region for six seconds of
ordinary running and fails if it is written to more than once.

## Honest limitations

These are real and are not going to be fixed by more ARIA.

**A sentence is not a simulation.** "Four planets on elliptical orbits" is not
equivalent to watching them move, and no textual description makes it so. What
the description can do — and does — is make the *state* legible, which is what
almost every control in the interface acts on. A reader who cannot see the
canvas can still load a scenario, pause it, select a body, read its measured
properties as text in the inspector, and work through an investigation.

**The orbital motion itself does not stop for `prefers-reduced-motion`.** It is
the content, not decoration; a planetarium that will not move is a picture.
Every decorative animation stops, and the simulation can be paused from the
transport bar or the space bar — a real control rather than a media query.

**Some measurements are only available by reading a chart.** The light curve,
the rotation curve and the radial-velocity trace are drawn to a canvas. Their
*numbers* are available as text in the readout and in the investigation
probes, and the lessons that depend on them ask for typed values rather than
for a visual judgement — but the shape of a curve is not currently narrated.
Investigation steps state their instructions and their expected measurements as
text, so a lesson is followable; the aesthetic reading of a curve is not.

**Direct manipulation has no keyboard equivalent.** Placing a body by clicking,
and dragging to set its velocity, are pointer gestures. The same systems can be
loaded from the gallery, from a share link, and from a lesson's own setup, and
every scenario in the catalogue is reachable without the canvas — but building
an arbitrary system by hand is not currently a keyboard task.

**The attribution links in the footer are under 24×24.** They are inline text
links in a sentence, which WCAG 2.5.8 explicitly exempts. Enlarging them would
mean changing a line of running text into a row of buttons.

**Automated checks are a floor, not a ceiling.** 52 clean axe runs mean no
machine-detectable violation on those surfaces in those states. They do not
mean the application is pleasant to use with a screen reader, and nothing here
substitutes for testing with one. Nothing in this pass was made to pass by
hiding a control from assistive technology; where that had already happened, it
was removed.

## Running the checks

```bash
npm run a11y            # both suites
npm run a11y:axe        # axe only, all 52 combinations
npm run a11y:manual     # keyboard, focus, reflow, reduced motion, the canvas
```
