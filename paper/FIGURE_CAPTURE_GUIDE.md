# Figure capture guide

Capture all figures from the tagged v1.0.0 release, not from a development
working tree. Use the Daylight theme unless a dark background is materially more
legible in print. Hide browser chrome, dismiss notices, keep text and axis labels
readable at final two-column size, and do not crop away the scenario name,
simulation clock, or scale bar when those are part of the evidence.

Use PNG rather than WebP or JPEG for interface screenshots. Crop cleanly, but do
not alter plotted data or composite states from different runs in a way that
implies they were simultaneous.

## 1. figures/overview.png

Purpose: establish within seconds that Gravitas is an instrumented laboratory,
not only an animation.

- Open the Kepler's Second Law scenario.
- Select the eccentric orbiter.
- Run long enough to leave a clear trail.
- Show the velocity arrow, total acceleration arrow, and gravitational-source
  arrow.
- Place either the ruler or periapsis-latched stopwatch without covering the
  orbit.
- Keep the object inspector, scale bar, elapsed simulated time, and scenario
  title visible.
- Capture a wide landscape image, ideally 1800 x 950 px or larger.

The image should make the relationship between orbit, measurement, vectors, and
numerical readout legible. Avoid a visually spectacular collision here; the
first figure must explain the core teaching experience.

## 2. figures/investigation-workflow.png

Purpose: show that a guided investigation records reasoning rather than merely
offering instructions.

Create a vertical three-part composite from one continuous investigation,
preferably Kepler's Laws or Finding Planets by Their Shadows:

1. a prediction prompt before the simulation is run;
2. a live measurement attached to the relevant step;
3. the evidence notebook or final report preview containing that result.

Use subtle labels (a), (b), and (c). Do not combine unrelated lessons. Crop each
panel so the prompt, measured quantity, units, and student's evidence remain
readable in a single journal column.

## 3. figures/exoplanet-observing.png

Purpose: demonstrate the unusually strong link between an evolving system and
multiple observing methods.

- Open Exoplanet Characterization Lab.
- Show the system and shared observer on the canvas.
- Open the transit, radial-velocity, and astrometry panels.
- Let enough simulated time elapse to populate every plot.
- Choose a non-degenerate viewing geometry that leaves the transit visible while
  producing clear radial-velocity and astrometric signals.
- Include axis titles and units.
- Capture a wide landscape image, ideally 2000 x 1100 px or larger.

If all three plots cannot remain legible in one untouched screenshot, make a
clearly labelled four-panel composite from screenshots of the same saved state:
(a) system and observer, (b) transit, (c) radial velocity, and (d) astrometry.

## 4. figures/breadth-and-classroom.png

Purpose: show the range of the v1 release beyond ordinary orbit visualization.

Build a clean four-panel montage:

- (a) the tagged scenario gallery with concept filters and several cards;
- (b) The Missing Mass with the rotation-curve panel;
- (c) Listening to Spacetime or the GW150914 scenario with the strain display;
- (d) A Universe of Stars or Lives of Stars with the H--R diagram and tracks.

Use images from the same tagged release. Retain meaningful axis labels and avoid
tiny interface text that will disappear when printed. A 2 x 2 montage is
preferred.

## Final checks

- Each caption in gravitas-showcase.tex describes what is actually visible.
- No image contains development warnings, failed checks, personal data, or
  browser extensions.
- Color is not the only way a reader must distinguish essential curves or
  vectors.
- The PDF remains understandable in grayscale.
- Every figure is cited in the text and appears after its first citation.
- Remove the placeholder panels only by adding files with the exact names above;
  no TeX edit is required.
