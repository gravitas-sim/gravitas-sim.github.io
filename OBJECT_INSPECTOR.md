# The object inspector

Clicking an object in Gravitas opens the inspector. It used to be a 600px card
that landed in the middle of the simulation and covered most of what the student
had just clicked on. It is now a 420px panel docked out of the way, and you can
keep several of them on screen at once.

This document covers the redesign, the placement rule, and the comparison cards.

---

## Smaller

Measured on the running app at 1440x900, showing the same planet:

| | before | after |
| --- | --- | --- |
| size | 600 x 765 | 420 x 496 |
| share of the viewport | 35.4% | 16.1% |
| position | centered on the simulation | docked, top right |
| rows before the first number | 6 | 2 |

Nothing was cut for the sake of the number. What changed is how much room each
part is given by default:

**The description was the single largest block**, printed in full for every
object whether or not anyone was reading it. It is now a collapsed disclosure,
and the disclosure stays open across the ten-times-a-second refresh, which the
old rebuild-everything update path did not manage.

**The mass control was four rows for one control**: a centered heading, a
full-width slider, a glowing value badge, and a permanent line of text reading
"Hover for mass adjustment tips". It is one row now, and the explanation hangs
off a help affordance.

**Each overlay toggle was its own bordered block** with a paragraph underneath.
They are gathered into one OVERLAYS section of labelled switches.

**Properties past the ninth** move under a "More" heading rather than extending
the panel indefinitely, so a black hole and an asteroid open to a similar height.

1045 lines of superseded CSS came out of `css/styles.css` along the way,
including a `#energyChart { height: 300px !important }` that had been quietly
overriding the chart's own sizing.

---

## Placement

The panel used to be centered, which is how it ended up over the readout in the
top left corner. Docking it at a fixed inset from the right edge fixes that on a
wide screen and not on a narrow one: between roughly 620 and 760 pixels of width
the panel's left edge crosses the readout and lands on top of it again.

So the position is measured rather than assumed.
[`computeDockPosition`](js/objectInspector.js) takes the rectangles of the
readout and the control rail and returns a point:

- dock right, against the rail when the rail is a right-hand column and against
  the window edge when it is not
- if that crosses the readout, drop below the readout
- if dropping below would hang the panel off the bottom of the window, give it a
  height budget for where it landed instead, down to a floor of 260px

There is no third case where the panel tucks in beside the readout at the same
height. Reaching it would mean the panel's left edge is inside the readout *and*
there is room to the readout's right for the whole panel, and those two cannot
both be true. The branch was written, found to be unreachable, and removed.

Checked against the live page's own rectangles from 1920x1080 down to 660x820:
the panel clears the readout at every width, clears the rail wherever the rail is
a column, and never leaves the viewport. Under 620px the layout becomes a bottom
sheet and the docking is skipped, because there the panel is meant to cover
things.

---

## More than one at a time

"How does this planet differ from that one?" is a question one panel cannot
answer. The pin button in the header keeps a copy of the current object on screen
while the inspector moves on to whatever is selected next.

Pinned cards are deliberately read-only: identity and numbers, no mass slider and
no overlay toggles. Two reasons, and both matter.

The first is mechanical. The inspector's controls are addressed by id, `#massSlider`
and `#hzToggleBtn` among them. A second copy would collide, and every lookup in
the app would silently find whichever came first in the document. A verification
pass asserts that opening cards introduces no duplicate ids anywhere on the page.

The second is that a slider is not what the comparison needs. You pin a card to
hold one set of numbers still beside another.

The cards are live, not snapshots. They run their own update loop rather than
borrowing the inspector's, because the inspector's stops when it closes and a
pinned card has to outlive that. A card whose object is absorbed or culled
removes itself.

They fill a column to the left of the panel, from its top edge downward, and
start a new column further left when the next card would not fit, so pinning a
fourth never pushes anything off screen. Dragging a card by its header opts it
out of that layout: the user has said where they want it. On a phone they take
the top of the screen and the bottom sheet keeps the bottom.

---

## What was deliberately not done

**The scenario banner is not a docking constraint.** The panel and the cards can
overlap the scenario description at the top of the screen. It is a transient
banner the user can dismiss, and treating it as an obstacle would push the panel
down the screen every time a scenario loads.

**Pinned cards do not persist across a scenario change.** Their objects do not
either, so the cards remove themselves. Comparing bodies from two different
scenarios would need the numbers copied out, not the card kept.

**The minimize control is gone rather than reimplemented.** The panel is now
small enough that minimizing it saves little, and the dead code behind the old
button had already stopped being reachable.
