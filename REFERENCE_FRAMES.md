# Reference frames

Gravitas integrates its physics in one frame, the one each scenario is built in.
The view can now be re-expressed in another: the system's barycenter, or any
single body. The physics does not change. The picture changes completely.

Put the Solar System into Earth's frame and every planet starts drawing loops
with cusps in them. That is the observation Ptolemy's epicycles were built to
reproduce, and it was sitting in the recorded positions the whole time.

---

## Why Follow Mode was not already this

Follow Mode sets the camera's pan so a chosen body stays in the middle of the
screen. Everything else keeps its world coordinates, trails included, so what
you get is a moving window onto an unchanged drawing. The body sits still and
nothing else about the picture is different.

Re-expressing a frame subtracts the origin's position from every position. For a
trail that has to be the origin's position **at the time each point was
recorded**, not its position now. Subtracting one constant slides the drawing;
subtracting a different value per sample redraws it.

Two lines of arithmetic separate the two, and they are the entire feature.

---

## What the code does

**[`js/referenceFrame.js`](js/referenceFrame.js)** holds the frame, the recorded
barycenter history, and the pure functions that resolve one into the other. It
imports nothing, so it can be tested directly and used from physics, render and
ui without a cycle.

**Every trail sample carries a tick.** Each live body appends one trail point per
physics step, so a shared counter says which samples were taken at the same
moment. Without it, two trails are two lists of coordinates, and lining them up
by array index breaks as soon as one body is younger than the other. This is the
one change to the physics, and it adds a single number per sample.

**The offset is per tick, not per body.** The correction a trail point needs
depends only on when it was recorded, so it is computed once for the whole scene
rather than once per body: one `frameShifts` call per rendered frame, indexed by
ticks-ago.

**The frame is subtracted in `worldToScreen`, not folded into the pan.** The
alternative, which is what Follow Mode does, is to move the camera. Doing it in
the coordinate transform instead means the user's own pan survives a frame
change, and it means everything downstream is consistent for free: hit-testing,
the bloom passes, the overlays, the canvas transform. Nine hand-inlined copies of
the world-to-screen arithmetic in `physics.js` were folded into the shared helper
to make that true rather than nearly true.

Measured on the running app: clicking a body selects that body in a non-world
frame, a round trip through `world_to_screen` and back lands within 0 units, and
a 120px pan still moves a body by exactly 120px with a frame active.

---

## The claim, measured

The Solar System in Earth's frame, read off the drawn trail rather than off a
diagram. Mars's geocentric longitude is sampled along the trail the renderer
actually builds:

| | |
| --- | --- |
| trail points drawn | 179 of a 180 budget |
| longest contiguous backward run | 40 points |
| bracketed by forward motion both sides | yes |
| Earth-Mars separation over the trail | 0.53 to 1.98 AU |

Forwards, backwards, forwards, with the reversal in the middle rather than at an
end. That is a retrograde loop, and it came out of subtraction.

Frame rate is unchanged. Interleaved medians of three runs at 1440x900 with
300-point trails: world 17.1, barycenter 17.2, Earth frame 18.3. The differences
are noise. The world frame resolves to `null` and takes no per-point path at all.

---

## Decisions worth knowing about

**The barycenter is taken over the massive bodies**, which means black holes are
in it. They are integrated separately from everything else and were not in the
list the rest of the physics loop iterates, so a barycenter built from that list
would have left them out. In the default binary-black-hole scenario that would
have been a barycenter of the debris.

**Debris and particles are excluded from it.** They carry little mass and they
are culled when they drift off screen, so counting them would move the frame's
origin every time a fragment left the visible world.

**The starfield does not move with the frame.** Deliberate, and correct: the
background stands in for objects at effectively infinite distance, and
translating the observer does not change the direction to them. It is also what
makes the loop legible, since retrograde motion is defined against the fixed
stars.

**A trail point the frame cannot express is not drawn.** If the origin's own
history is shorter than another body's trail, the older points have no origin
position to subtract. Drawing them where they happen to sit in world coordinates
would splice a piece of a different picture onto the end of this one.

**The frame falls back when its body dies.** A body can be absorbed, merged or
culled while its frame is selected. The renderer resolves to no origin, resets to
the world frame, and the rail stops claiming a frame that no longer exists.

**Speeds are shown in the frame, beside the world speed rather than instead of
it.** A frame that re-expresses positions and says nothing about velocities
leaves the inspector reporting that Earth moves at 29.8 km/s while the view has
Earth sitting perfectly still. While a frame is active the inspector gains one
row, `Speed vs Mars` or `Speed vs barycenter`, and the existing `Velocity` row
keeps its world-frame meaning unchanged. Silently switching what a labelled
number means would be the worse fix. Verified on the running app: Mars in Mars's
own frame reads `Speed vs Mars = 0 km/s` while `Velocity` still reads
24.1 km/s, and the extra row disappears in the world frame.

**Follow Mode and a reference frame compose.** Follow moves the camera, a frame
moves the coordinates, and the pan that centers a target is now measured in the
frame the target is drawn in. Before this, turning on a frame while following
would have thrown the camera off by however far the frame's origin sat from the
world origin.

---

## Where the control is

Two doors into one piece of state, both driven from a single subscription:

- **Tools > Frame** in the rail: World, Barycenter, or the current selection.
  A line of state appears underneath while a frame is active, naming what
  positions are now measured against. It is hidden in the world frame, because
  the rail is already taller than a laptop screen with every group open and a
  permanent explainer would push the primary action over the last tool.
- **Reference frame** in the object inspector, on every body. Click Earth, switch
  it on, and the Solar System rearranges itself around Earth.

---

## The lesson it makes possible

**Why Mars Goes Backwards**, 33 steps, and its own scenario. Students measure
both orbits, compute the 780-day synodic period twice by two routes, predict
what Mars will do seen from Earth, switch the frame and watch the loop draw
itself. Then the harder half: the loop happens at opposition, Mars is brightest
exactly while it moves backwards, every outer planet's Ptolemaic epicycle takes
one year, and none of that settles which body is at the center. The lesson ends
on what did settle it, which is fictitious forces and stellar parallax rather
than the loop.

The scenario is the Sun, Earth and Mars at their real distances, periods and
masses, and nothing else. Two numbers in it were set by measurement rather than
taste:

**The trail holds 2400 samples.** Its span in simulated time is
`trail_length x max_timestep`, not a frame count, because the integrator
substeps: at `max_timestep` 0.1 that is about 220 to 320 days, three to four
times the 72-day retrograde episode. A trail sized to the episode itself is
entirely backwards at opposition with no forward track at either end to show the
reversal against, which is what 300 samples gave. Measured on the running app: a
bracketed loop is present in the drawn trail at 66% of sampled moments, so a
student switching frames waits at most about 25 seconds.

**Mars starts 95 degrees ahead of Earth**, which puts opposition around day 205.
That is chosen against how long the trail takes to fill rather than against
anything astronomical. The first draft started them 39 degrees apart, opposition
arrived at day 85 while the trail was still growing, and the loop was half drawn
when it went past.

`max_timestep` was raised from 0.05 to 0.1 to buy the longer window. Checked over
90 seconds of running, about three Earth years: semi-major axis drift 0.00% for
both planets, eccentricity under 0.003.

---

## Not done

**The frame is not saved or shared.** It is view state, and an object frame names
a body by an id that will not survive a reload or a shared link. Loading a save,
restoring a scenario or resetting all return to the world frame.

**There is no frame indicator on the canvas itself.** The rail says which frame
is active; a screenshot of the canvas alone does not.
