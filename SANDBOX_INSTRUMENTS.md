# Instruments in the sandbox

The lessons have always had instruments. A student inside "Kepler's Laws" gets a
stopwatch, a ruler along the bottom of a panel, a scale bar under every drawing;
they measure something, the widget plots their readings back to them, and the
measurement is the point of the step.

The sandbox — the other ninety percent of the application, and the part an
instructor actually assigns — had none of that. A student could watch an orbit
and could not time it. They could see two bodies and could not say how far apart
they were. They could take a screenshot and hand in a picture of some dots with
no scale on it and no clock.

This pass gives the sandbox the same instruments the lessons have, out of the
same code, plus two visualizations of the thing the sandbox is actually about.

---

## What was already there, and what was not

Worth being precise, because the starting point was not what it looked like.

| | before |
| --- | --- |
| Scale bar | a real implementation in `js/blackHoleWidgets.js`, used by every panel that draws at its own zoom |
| Stopwatch | a Mark/Stop latch in `js/binaryWidgets.js`, over that widget's own analytic model |
| Ruler | axis ticks drawn inline in two `js/tidalWidgets.js` panels. Not a widget, not draggable, not reusable |
| Protractor | did not exist anywhere |
| Velocity arrows | a `show_velocity_vectors` setting in three files and **no code anywhere that drew one**. The toggle had been dead for its whole life |

So the scale bar and the stopwatch's latch semantics were extracted and are now
shared; `blackHoleWidgets.js` imports its scale bar from the shared module rather
than keeping the copy it had. The ruler, the protractor and the velocity arrows
were written, because there was nothing to reuse.

---

## Where the code lives

```
js/instruments.js      the arithmetic: nice round lengths, a scale bar, an angle
                       between two rays, a latching stopwatch. No DOM, no
                       simulation state, no physics.
js/sandboxTools.js     the tools over the live canvas: handles, dragging,
                       readouts, the always-on instrumentation panel.
js/vectorOverlay.js    velocity, acceleration and the potential-well underlay.
js/physics.js          the numbers all of the above report: the simulated clock,
                       the acceleration each body was stepped with, the
                       acceleration broken down by source, and the conserved
                       totals.
```

The split is the point. `js/instruments.js` is imported by both the lesson
widgets and the sandbox, so a lesson panel and the live simulation cannot
disagree about how long an AU is. `js/physics.js` publishes numbers and never
draws; `js/vectorOverlay.js` draws and never computes a force.

---

## The measurement tools

Three buttons in the Tools rail: **📏 Ruler**, **📐 Protractor**, **⏱ Stopwatch**.

**Every handle is stored in world coordinates.** A ruler pinned to two screen
positions would slide off the thing it was measuring the moment the view was
panned, and would report a different length at every zoom. Stored in the world,
it stays on what it was put on and its reading does not change with the zoom,
which is the only behavior that makes the number worth writing down. There is a
test that drags a handle at three different zoom levels and lands in the same
world position each time, and another that reads the ruler at five zoom levels
and gets one string.

**The ruler** reads in AU and in kilometers, always both and always in that
order: AU is the unit the scene is laid out in and kilometers is the one a
student has a feel for, and a ruler whose unit changed while you were using it
would be worse than one with no units at all.

**The protractor** measures the angle its two arms enclose, in world
coordinates rather than screen ones — the canvas flips y, and an angle read off
screen positions is the mirror image of the angle in the simulation. It is
always the enclosed angle, in [0, 180], never its reflex: a protractor that read
250 on one side and 110 on the other would be measuring the order of the clicks.
The arithmetic uses `atan2` of the cross and dot products rather than `acos` of
the dot product alone, which loses half its digits on exactly the nearly-parallel
arms a student gets when measuring a small angle.

**The stopwatch** runs on *simulated* time. Pausing the simulation pauses it and
changing the simulation speed does not change a measured period. It has the
binary widget's manual Mark/Stop pair, and a **Periapsis** latch: with a body
selected, the clock arms itself on that body's next closest approach and closes
a lap on every one after it, so timing an orbit from periapsis does not depend on
the student's reaction time — which is the largest error in the measurement they
are being asked to make.

The latch detects a periapsis as a local minimum in the distance to the body's
dominant attractor, from three consecutive samples and nothing else: no orbital
elements, no assumption that the orbit is closed, and nothing that stops working
while the orbit is being perturbed. A body at a constant radius never fires it,
which is what stops a circular orbit from reporting a period of one timestep.

---

## The always-on instrumentation

A **scale bar** and an **elapsed simulated time** readout sit in the bottom-left
corner of the canvas, with the conservation diagnostics under them. Both can be
switched off in Settings; both are on by default, because a picture of a
simulation with no scale and no clock on it cannot be cited.

All of it is painted onto the simulation canvas rather than into the page. That
is what puts it into an exported screenshot: `takeScreenshot` composites the
starfield canvas and the simulation canvas and nothing else, so there is one
rendering path and the export cannot drift away from the live view. Any
measurement tool that is out goes into the screenshot too, so an image can
document the distance or angle it was taken to show.

### What a captured frame carries that the live view does not

The clock, the stopwatch and the vector key are all in the readout panel, which
is HTML and is not part of the export, so painting them onto the canvas as well
would be saying the same thing twice — live. For the one frame a capture is
taken from, `setCaptureMode` switches them on, along with the **scenario name**
across the top left. Three facts, and they are the three a figure has to carry
to be worth citing: which run this is, how big it is, and how far into it the
picture was taken. The clock is labeled `t =` there and not in the readout,
where the row it sits in already says what it is.

The panel measures the page's own bottom-left chrome — the transport bar and the
tutorial button — a few times a second and sits above it, because both of them
move: the transport bar is centered on the window and is a different size on a
phone. On a narrow canvas the panel drops the longest row and shortens the rest
rather than running off the edge.

---

## Recording a clip

The Capture group also records a stretch of the run to a video file, through
`MediaRecorder` on a canvas stream (`js/capture.js`). Most of what this
simulation is for is motion — a resonance locking, a tidal stream peeling off —
and none of that survives a still.

Three things about it are worth knowing:

**It records a composite.** The simulation canvas is transparent and the
starfield sits behind it in a second canvas, so a stream taken off the
simulation canvas alone would be objects on black. Each frame is flattened onto
an offscreen canvas — background, starfield, simulation — and that canvas is
what is streamed, at up to 30 fps and at most 1600 px on its longest side.
Capture mode is on for the whole take, so every frame carries the title, the
scale bar and the clock. The recording indicator is HTML, over the canvas and
not in it, so it does not appear in the file.

**It is bounded.** MediaRecorder hands back chunks that have to be held in
memory until the file is assembled, so an unattended recording is an unbounded
array. A one-second timeslice means the running total is known as it grows, and
a take stops itself and saves what it has at **80 MB** or **3 minutes**,
whichever comes first. The indicator counts both.

**The container is chosen for where the clip is going, not for its own sake.**
H.264 in MP4 where the browser can encode it — which Chromium-based browsers
can — and WebM (VP9, then VP8) where it cannot. PowerPoint and Keynote will not
open a WebM at all, and a PDF reader that plays embedded video plays H.264 and
nothing else, so on Firefox the clip plays in browsers, in Google Slides and in
VLC, but a slide deck or a lab report needs a conversion step or the still
instead. The filename's extension follows whatever the browser actually
produced.

---

## Velocity, acceleration and the potential well

Three Settings toggles, all off by default:

- **Show Velocity Vectors** — one arrow along the track.
- **Show Acceleration Vectors** — one arrow for the total, and one dashed arrow
  per gravitational source, on the same scale as the total so the picture is a
  vector sum a student can check with a ruler.
- **Show Potential Well** — a contoured wash of the scene's gravitational
  potential, under everything else.

All of it is drawn for the **selected** body only, which keeps the picture
readable and the cost flat.

### The colors are the argument

Velocity is a cool green that appears nowhere else in the application.
Acceleration is a hot magenta, its opposite on the color wheel. The per-source
arrows are a muted amber family, dashed, deliberately lower in contrast than the
total — they are components of it, and reading louder than their own sum would
be the wrong emphasis. Each source keeps its color across merges, because it is
keyed on the source's identity rather than its position in a list.

The case that decides the palette is an eccentric orbit near periapsis, where the
velocity and the acceleration are both long and close to perpendicular. That is
also the case the whole overlay exists for. The misconception that a body moves
in the direction it is pulled is the most durable wrong idea in introductory
mechanics, and an eccentric orbit refutes it every second: on the Kepler's 2nd
Law scenario's `e = 0.65` orbiter the angle between velocity and acceleration is
confined to 90° ± asin(e) = 90° ± 40.5°, so it is exactly 90° at periapsis and
apoapsis and never within forty degrees of parallel anywhere. There is a test
that sweeps a whole orbit and asserts those bounds.

### The arrows are the integrator's own numbers

`accelerationBreakdown()` in `js/physics.js` returns the acceleration the last
step was actually taken with alongside the same force law evaluated at the body's
current position, and the per-source decomposition of it. The overlay draws
those; it does not compute a force. An arrow built from a second implementation
of gravity is free to disagree with the motion it is drawn next to, and an arrow
that disagrees with the motion is worse than no arrow. A test takes the breakdown
at one instant, runs a step from the same positions, and requires the two numbers
to be identical rather than merely close.

### The potential well is affordable

`Φ(x) = -Σ G mᵢ / max(rᵢ, softening)`, on the same softening floor the force law
uses — a body that never feels a singular force should not be drawn sitting in
one. Three things keep it cheap:

- One sample per 12 screen pixels, painted into a canvas that small and scaled up
  with the browser's own smoothing. A full-resolution field would be a hundred
  times the samples for a picture that is a smooth gradient either way.
- Only the 24 heaviest sources contribute. The field is dominated by them by
  construction, and a scenario with six hundred asteroids would otherwise cost
  six hundred terms per sample for a contribution below one step of the color
  ramp.
- It is rebuilt only when the view or the masses have actually moved, and at most
  once per 90 ms.

Measured on Galactic Collision (932 bodies, 1440×900): a rebuild costs 2.2 ms and
a frame that reuses the cached field costs 0.12 ms.

The wash is contoured, one ring per fifth of a decade of depth, rather than
smooth. A smooth wash is a picture of a blur; what makes a potential well read as
a well is the contours crowding together as it steepens, for the same reason a
topographic map has contours rather than a gradient.

---

## Choosing an integrator

A Settings dropdown with three schemes.

| | order | symplectic | force evaluations |
| --- | --- | --- | --- |
| **Symplectic Euler** (default) | 1 | yes | 1 |
| Velocity Verlet | 2 | yes | 2 |
| RK4 | 4 | no | 4 |

**Symplectic Euler is the default and has to stay it.** Every scenario in the
catalog was laid out, timed and tuned against its particular error, and several
of them cap their timestep because of it. Quietly promoting a more accurate
scheme would change the dynamics of the whole catalog at once. Two checks in the
validation suite exist only to notice if that ever happens, and an e2e test loads
every scenario in the catalog &mdash; <!--fact:scenarios-->59<!--/fact--> of
them &mdash; and confirms each one comes up under the default. The test reads
the catalog rather than a list, so it does not need updating when one is added.

Switching is live and safe: the schemes share the same state — positions and
velocities — and each reads it fresh, so changing the setting mid-orbit changes
what the next step does and nothing else.

Two things are deliberately outside the selectable schemes.

**Black holes** keep their own symplectic-Euler path. Their step carries the
phenomenological orbit-decay term, and running a fourth-order scheme over a
first-order damping law would report an order it does not have. Within a body's
step the holes are frozen, which is exactly what the default already did.

**The Barnes-Hut worker's cached acceleration** is a snapshot from a previous
frame: correct to reuse once per step, wrong to reuse four times inside one.
Every stage would see the same force and the scheme would collapse to Euler while
still calling itself RK4, so the multi-stage schemes evaluate the direct sum.

What the schemes are for is in
[`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md#selectable-integrators), where
each one's convergence order and its bounded-versus-secular energy behavior are
measured on a bound Kepler orbit. The short version is the contrast: over a few
orbits RK4 is nine orders of magnitude more accurate than the default, and over a
few thousand it is the only one of the three still getting worse, because nothing
holds a non-symplectic scheme to a nearby Hamiltonian.

---

## Conservation diagnostics

Under the elapsed-time readout, three lines: the scheme in force, the energy
drift and the angular-momentum drift, each as a percentage of a baseline taken
when the world was built. There is a fourth line when the configuration cannot
conserve anything — a static black hole, one-way gravity, a dark-matter halo,
inspiral damping, mergers switched on — because a drift figure that did not say
so would be blamed on the integrator.

The definitions are deliberately the ones
[`tools/scenario-stability.mjs`](tools/scenario-stability.mjs) already used
offline: total kinetic plus full pairwise potential, and angular momentum about
the instantaneous center of mass, over every massive body that is not culled.
A readout that measured something slightly different from the validation harness
would let one of them pass while the other failed and leave nobody able to say
which was right.

The potential sum is O(N²) and the readout is repainted every frame, so the
totals are cached and recomputed on a budget: never more than one frame in fifty,
measured from how long the last one took. A two-body scenario refreshes ten times
a second; a nine-hundred-body one backs off to about three, on its own, with no
special case. The sum itself was rewritten over flat arrays with `Math.sqrt`
rather than `Math.hypot`, which took Galactic Collision from 29 ms to 2.8.

The scheme name and the caveats are *not* cached — they are free to compute and
can change between two frames, and a readout that named the previous integrator
for half a second after the setting changed would look like the setting had not
taken.

---

## What `max_timestep` is, and what it is not

Audited 2026-09-21, from the code rather than from the comments around it,
because a proposal for a scientific instrument rested on the opposite claim.

**The claim that was current:** *"`onPhysicsStep` makes instrument cadence
machine-independent — set `max_timestep` and every machine takes the same
sequence of integration steps, so a sampler hung off it samples at the same
simulated times everywhere."*

**That is false**, and the three lines that make it false are these.

[`gameLoop`](js/render.js) takes its frame duration from the clock:

```js
const measured = (timestamp - state.last_time) / 1000.0;
const dt_seconds = fixedStepSeconds || measured;
const dt_sim = frameAdvance(dt_seconds, SETTINGS.sim_speed, DT);
```

[`frameAdvance`](js/timestep.js) is linear in that duration below its own
0.05 s stall guard, so `dt_sim` inherits the frame rate and its jitter. And
[`substepPlan`](js/timestep.js) subdivides `dt_sim` rather than stepping at the
cap:

```js
const wanted = Math.ceil(dtSim / cap);
const substeps = Math.min(MAX_SUBSTEPS, wanted);
return { substeps, step: dtSim / substeps, capped: wanted > MAX_SUBSTEPS };
```

`step` is therefore `dtSim / ceil(dtSim / cap)`. It is bounded above by `cap`
and it is almost never equal to it.

Measured over twelve frames at `sim_speed` 5, `DT` 0.016 and `max_timestep`
0.05 — Kepler's 2nd Law's own settings:

| machine | integration steps | distinct step sizes | step range |
| --- | --- | --- | --- |
| 60 fps, held exactly | 24 | 1 | 0.033333 |
| 144 fps, held exactly | 12 | 1 | 0.027778 |
| a real tab, with jitter and one dropped frame | 25 | 10 | 0.031800 – 0.044133 |

Three machines, three different numbers of steps at three different sizes,
covering three different amounts of simulated time. At 144 fps the cap does not
engage at all: `dt_sim` is 0.0278, already under 0.05, so `substeps` is 1 and
the step is simply the frame advance. The cap is doing exactly what its own
docstring says it does — bounding the local truncation error of a symplectic
Euler step — and nothing else.

**So the rule is:**

> `max_timestep` is a numerical-accuracy ceiling, not an instrument clock.
> `onPhysicsStep` fires once per integration step, and the number, the size and
> the simulated times of those steps are all machine-dependent.

The repository already knew this, which is the strongest evidence for it:
[`setFixedStep()`](js/render.js) exists, its comment says two runs of the same
world otherwise "get different sequences of frame times, so they take different
sequences of steps, so they are not the same calculation", and the Experiment
Bench turns it on before it records anything.

### What a sampler would actually have to do

Not built, and not to be built until something needs it. Three candidates, in
the order they should be considered:

1. **Schedule against simulated time, and evaluate at the target.** The
   ingredients are already here: `onPhysicsStep(fn)` hands its listener
   `(dt, simulationTime)`, and `simulationTime` is advanced by exactly the `dt`
   that was integrated. A sampler that holds a list of target simulated times,
   watches for the step that brackets each one, and interpolates between the
   two states produces the same sample times on every machine without touching
   the loop. This is the one to reach for: it costs one comparison per step and
   it does not change what anybody sees.
2. **Run the experiment in fixed-step mode.** `setFixedStep(1/60)` already makes
   the whole sequence reproducible, which is why the bench uses it. It is the
   right answer when the experiment owns the session — a recording, a
   convergence study — and the wrong one for an instrument a reader is expected
   to use while the sandbox runs at its own pace, because it decouples
   simulated time from wall-clock time.
3. **A fixed-step accumulator in the loop itself.** The conventional fix, and
   the most invasive: it changes the integration every scenario gets, and the
   whole substep-plan design exists to avoid doing that.

Nothing above should be read as a plan. It is a note saying which of the three
is cheap, so that the next proposal starts from the right one.

---

## What is not done

- **The inspector's derived quantities for small bodies** — density, surface
  gravity, escape velocity — are computed from a "rough conversion" of the
  schematic drawing radius to kilometers. An asteroid is drawn at 2 simulation
  units, which is 0.02 AU, or three million kilometers. Those rows were fiction
  before this pass and are differently-scaled fiction after it. The mass row is
  correct and agrees with the slider beside it; the rest wants the radius
  question answered first.
- **The Settings panel hides the label on `option` rows below about 700px**,
  which affects Simulation Size, Placement and now Integrator equally. It is a
  pre-existing layout characteristic rather than something this pass introduced,
  and fixing it belongs with the settings panel rather than here.
- **The vector overlay draws for one selected body.** Showing them for every body
  at once would be a different feature and a different performance question.
