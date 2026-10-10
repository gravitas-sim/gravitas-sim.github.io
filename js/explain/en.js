// =============================================================================
// What am I looking at? (English)
// -----------------------------------------------------------------------------
// One entry for every instrument family and every kind of plot: four short
// answers, in this order - what the axes (or the picture) are, what a feature
// of it means, what to read off it, and what it cannot show. Shown on demand
// from the docked panel and from a plot's help button (js/explainers.js);
// js/explain/es.js is the Spanish, entry for entry. The ids a family owns are
// in js/explainers.js, held to the registry by tests/explainers.test.js.
// =============================================================================

export default {
  energy: [
    'Energy per unit mass (vertical) against time or distance (horizontal).',
    'Kinetic energy is motion, potential energy is stored by position; their sum is conserved without outside forces.',
    'Whether the total stays level while the other two trade places.',
    'A level total shows the integrator is accurate, not that a real system loses nothing.',
  ],
  binary: [
    'Two orbits drawn around their common centre of mass, with time on the stopwatch.',
    'The heavier star moves less and sits closer to the centre of mass.',
    'The period, the separation, and how the two speeds compare.',
    'Two bodies only: a third body would change every orbit shown.',
  ],
  blackHole: [
    'Sizes and scales on logarithmic axes, so one step is a factor of ten.',
    'The event horizon is the radius inside which escape needs more than light speed.',
    'How a quantity scales with mass: read the slope, not the height.',
    'It cannot show what happens inside the horizon; the model is for outside it.',
  ],
  habitability: [
    'Starlight received by a planet, against its distance from the star.',
    'The habitable zone is where liquid water could last on a surface under the model.',
    'Which distances fall in the zone for a given star.',
    'Being in the zone does not mean a planet is habitable: air and water are not in the model.',
  ],
  exoplanet: [
    'The star’s small motion or dip in light, against time or angle.',
    'A wobble or dip betrays an unseen planet pulling or crossing the star.',
    'The size of the signal, and how it changes with mass, distance and tilt.',
    'Each method sees only part of the system; the tilt of the orbit is often unknown.',
  ],
  tidal: [
    'Arrows or bars for the stretching force across a body, against distance or density.',
    'Tides come from the difference in gravity across a body, which falls as 1/distance³.',
    'How fast the tidal force grows as the bodies get closer.',
    'The Roche limit here is a simple model; a real body’s strength changes it.',
  ],
  darkMatter: [
    'Speed of orbit (vertical) against distance from the centre (horizontal).',
    'A flat curve at large distance means more mass than the visible matter supplies.',
    'Whether the visible mass alone can match the measured curve.',
    'A fit that matches does not identify what the extra mass is made of.',
  ],
  chaos: [
    'How far apart two almost identical runs drift, against time.',
    'Steady growth by a constant factor is the signature of chaos.',
    'How long the two runs stay close before they separate.',
    'It cannot predict the far future of one run; it measures how soon prediction fails.',
  ],
  resonance: [
    'Orbital periods and the angle between orbits, against time.',
    'A resonance is a fixed ratio of periods, so the two bodies meet in the same places.',
    'Whether the resonant angle librates (swings) or circulates (keeps turning).',
    'A near-ratio of periods is not a resonance unless the angle librates.',
  ],
  stellar: [
    'Brightness (vertical, increasing upward) against surface temperature (horizontal, hotter on the left).',
    'Where a star sits shows its mass and age; the main sequence is where stars spend most of their lives.',
    'Which stars are hotter, larger or brighter, and how the shape changes with age.',
    'Models track average stars; one measured star has its own uncertainties.',
  ],
  stellarEvolution: [
    'The same diagram with a star moving along its track as it ages.',
    'Each turn of the track is a change in how the star makes energy.',
    'Which stage the star is in, and how much of its life each stage takes.',
    'The pace is sped up; the stages are not equal in length.',
  ],
  observing: [
    'Time of night against target height above the horizon, and the strength of each repeating signal.',
    'Airmass is how much air the light crosses; a schedule with gaps hides periods.',
    'When a target can be seen and which periods a schedule cannot tell apart.',
    'A plan can be good for one night and poor for a whole programme.',
  ],
  spectra: [
    'Brightness (vertical) against wavelength (horizontal).',
    'Dark absorption lines mark which elements and conditions the starlight passed through.',
    'Which lines are deep, and how that changes from one star to another.',
    'A spectrum does not give a distance; it gives temperature, composition and motion.',
  ],
  transit: [
    'Brightness of the star (vertical) against time (horizontal).',
    'The dip is a planet crossing the star; its depth is roughly the square of the radius ratio.',
    'The depth, the duration, and how noise or a second star changes them.',
    'A dip alone does not say a planet caused it; other stars and spots can mimic it.',
  ],
  powerLaw: [
    'An orbit under a force that falls as a chosen power of distance.',
    'An orbit that closes is the sign of an inverse-square force; otherwise it turns slowly.',
    'Whether the ellipse closes, and how the period depends on distance.',
    'A turning orbit can come from the force law or from the computer’s steps; check the step size.',
  ],
  gw: [
    'Strain (a stretch of space, vertical) against time (horizontal).',
    'The signal rises in pitch and size as two black holes spiral together.',
    'The pitch and the speed of the rise, which depend on the masses.',
    'The mass and distance trade off; one signal does not fix both on its own.',
  ],
  light: [
    'Brightness per unit wavelength (vertical) against wavelength on a logarithmic scale (horizontal).',
    'The peak moves to shorter wavelengths as the temperature rises, and the whole curve rises with it.',
    'Where the peak is, how the two bandpasses sample the curve, and the color index they give.',
    'A real star is not a blackbody: its lines and edges change a measured color from this one.',
  ],
  sky: [
    'The sky as a computed model: heights, times and angles for a place and a date.',
    'Each reading is a number from a model of the Sun, Moon, stars and planets, listed beneath the picture.',
    'How a height, a time or an angle changes when you move the date, the place or a limit.',
    'It is a model, good to a fraction of a degree for the Sun and Moon and about 0.2 degrees for planets; it is not tonight’s sky.',
  ],
  gwEvents: [
    'Real detector strain against time, and a map of pitch against time.',
    'A rising track on the map is the chirp of an inspiral.',
    'When the signal appears, and whether a model of the event follows it.',
    'The noise is real and often larger than the signal in the raw data.',
  ],
  'plot-measure': [
    'Your own measurements, one point each, with the quantities named on the axes.',
    'A straight line of points means the two quantities are proportional, or after a transform, a power law.',
    'The slope, and how closely the points follow it.',
    'A line through a few points is a hypothesis, not a proof of the law.',
  ],
  'plot-series': [
    'One column of the data (vertical) against another (horizontal), with units on both.',
    'A bar through a point is its uncertainty; a hollow gray point is left out of any calculation.',
    'Trends, gaps and outliers, and how large the uncertainties are.',
    'Where no bars are drawn, the data states no uncertainty; that is not a claim of precision.',
  ],
  'plot-table': [
    'Two columns of a table of objects, one point per object.',
    'Groups of points are populations; a color-magnitude diagram shows stars sorted by temperature and brightness.',
    'Clusters, sequences and isolated objects.',
    'A crowded region is thinned in the drawing; the table below holds every row.',
  ],
  'plot-log': [
    'An axis where each step is a factor of ten.',
    'A straight line on a log axis means a power law (both logarithmic) or an exponential (one).',
    'The slope on log-log axes, which is the exponent.',
    'Zero and negative values cannot be drawn on a logarithmic axis.',
  ],
  'plot-bars': [
    'Bars for counts or values in each bin or category.',
    'A taller bar means more values in that range.',
    'The shape of the spread: where it peaks and how wide it is.',
    'The bin width changes the look; the numbers beside the chart are exact.',
  ],
  'plot-light-curve': [
    'Brightness (vertical) against time (horizontal).',
    'A dip is a dimming; a regular repeat gives a period.',
    'The depth, the length of each dip and the time between dips.',
    'Gaps in the data hide events; a few points cannot rule out a dip.',
  ],
  'plot-rv': [
    'Line-of-sight speed of the star (vertical) against time or phase (horizontal).',
    'A repeating wave is the star’s orbit around the shared centre of mass.',
    'The period and the half-height of the wave, which gives the speed.',
    'The speed gives the planet’s mass only times the unknown tilt of the orbit.',
  ],
  'plot-energy': [
    'Energy (vertical) against time (horizontal), with kinetic, potential and total as separate lines.',
    'Lines that move in opposite directions are energy changing form.',
    'Whether the total is steady, and when the others peak.',
    'Energy that changes with no outside cause is a sign of the numerical method.',
  ],
  'plot-ellipse': [
    'An ellipse with the star at one focus and sliders for its shape.',
    'The eccentricity is how far the star sits from the centre, as a fraction of the half-length.',
    'How the shape and the two distances change as the slider moves.',
    'A drawing at one scale; the sliders do not change the size of the orbit.',
  ],
  'plot-experiment': [
    'An outcome (vertical) at each setting (horizontal), with an interval around each average.',
    'An interval is where the average would likely fall if the experiment were repeated.',
    'Whether the outcome changes with the setting by more than the intervals overlap.',
    'Overlapping intervals are not proof of no effect; more trials narrow them.',
  ],
  'plot-compare': [
    'The same quantity from two or more runs or methods, side by side.',
    'A gap between curves is a difference between the runs.',
    'Where they agree, where they part, and by how much.',
    'Agreement between two simulations does not make either right.',
  ],
  'observatory-image': [
    'A picture of the sky, with a sky position at each pixel.',
    'Bright patches are sources; the brightness scale is a choice made for viewing.',
    'Where a source is and how it compares with its neighbors.',
    'Stretching the display changes how it looks, never the data underneath.',
  ],
  'observatory-measure': [
    'A chosen region of the data and the number measured in it.',
    'A measured value comes with a stated method, background and uncertainty.',
    'The value, its uncertainty, and what was assumed to get it.',
    'Another choice of region or background would give a different value; compare them.',
  ],
  'observatory-fit': [
    'The data and a model curve, with the leftover differences below.',
    'A good fit leaves differences that scatter randomly about zero.',
    'The fitted values, their uncertainties and the pattern of the differences.',
    'A model that fits is not thereby true; compare a simpler and a richer one.',
  ],
  'observatory-archive': [
    'A list of archived observations and their sources.',
    'Each entry records who observed, when, and under what terms of use.',
    'Which observation fits your question, and how it was reduced.',
    'Opening an observation does not check it; read the notes on how it was made.',
  ],
  'analysis-sweep': [
    'The outcome of many trials (vertical) at each setting (horizontal).',
    'A trend with settings, and the spread of the trials, are separate things to read.',
    'How strongly the outcome follows the setting, and where the uncertainty comes from.',
    'A fitted slope is a description of these trials, not a probability that a model is true.',
  ],
  'analysis-models': [
    'Several model curves fitted to one set of data, with a score for each.',
    'A weight is relative support among the models compared, not the chance one is true.',
    'Which model the data prefer, and by how much.',
    'If the best model is not in the list, the weights cannot say so.',
  ],
};
