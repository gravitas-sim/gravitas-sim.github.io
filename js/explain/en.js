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
    'Where the peak is, how the two bandpasses sample the curve, and the color index they give; in the spectrum viewer, where a line sits and how far it has moved from its rest wavelength.',
    'A real star is not a blackbody: its lines and edges change a measured color from this one. A line’s shift gives only the speed along the line of sight, never the sideways motion.',
  ],
  galactic: [
    'Stars as measured by Gaia: velocities, proper motions against longitude, a rotation curve, or a cluster’s proper motions and colors.',
    'How the stars’ mean velocity, the fitted Oort constants, the curve against its model or the membership change as you change what is kept, weighted or assumed.',
    'What the data say before a model is put on them, and how far a changed assumption (the Sun’s V, the weighting, the halo) moves the answer.',
    'Real measurements with real scatter; the models are simple and stated, and a membership is a probability, not a label.',
  ],
  interiors: [
    'The inside of a star from center to surface: density, pressure, temperature and the mass inside each radius; the mass and radius of white dwarfs; or luminosity, radius and lifetime against mass for model stars.',
    'How the profile, the central values, the white-dwarf mass and the fitted exponents change as the polytropic index, the mass, the radius, the central density, the composition and the physics of the scaling change.',
    'Why the center is hot and dense, why a degenerate star has a limiting mass, and how far a scaling argument gets before the shape of real stars shows.',
    'A polytrope is a shape, not a star: no energy generation, opacity or convection; the white dwarf is cold and ideal; the main sequence is a MIST model, not a measurement.',
  ],
  variables: [
    'Real TESS light curves of two pulsating stars, a period search and a fold on a trial period; the Cepheid period-luminosity relation of the Large Magellanic Cloud and the distances it gives to two galaxies; or a labeled sample of five kinds of variable star and a confusion table.',
    'How the period, its error, the aliases, the slope, the zero point, the distance and its error budget, or the share classified correctly change as the star, the fold period, the galaxy or the measurements a classifier may use change.',
    'How a period is read from a light curve and what limits it, why a Cepheid’s period gives its luminosity and so a distance, and why one accuracy number hides which kinds of star are mistaken for which.',
    'The light curves and Cepheids are real measurements in one band, with no metallicity or crowding correction; the bootstrap error is a floor; the classification sample is synthetic, balanced and stylised; pulsar timing is not modelled.',
  ],
  lensing: [
    'Bending against closest approach (log scales); the lens plane in Einstein radii with the source and its images; or flux against time as a lens passes.',
    'How the bending, the ring, the images and the light curve change as the mass, the distance, the speed, the offset and the blend change.',
    'How far a mass bends light, how large a ring a mass makes, and what a light curve fixes (the crossing time) and what it leaves open (mass, distance and speed separately).',
    'One thin lens in the weak field, a point mass or a circular galaxy, a uniform star, no shear or second lens; the synthetic event is a model with noise, with a truth the real sky never gives.',
  ],
  cosmology: [
    "Hubble's 24 nebulae of 1929 and the 1,829 supernovae of the Dark Energy Survey, the line of velocity against distance, a distance-modulus diagram with a flat Lambda-CDM curve, or 2,911 SDSS galaxies drawn as a wedge of the sky.",
    'How the Hubble constant, the matter density, its interval, the chi-square and the clustering and density in each shell change as the sample, the redshift limit, the curve or the calibration offset change.',
    'What a straight line of velocity against distance can and cannot say, why distant supernovae are fainter than a coasting universe predicts, why H0 and the supernovae\u2019s absolute brightness cannot be separated, and what a flux-limited survey of galaxies shows.',
    'The supernova distances are on the release scale (H0 = 70), the statistical errors only, the model is flat Lambda-CDM with w = -1 and no radiation, and the SDSS strip is flux limited, so its thinning with distance is selection and not structure.',
  ],
  detector: [
    'Synthetic CCD frames from a stated model: a bias, a dark, a flat field and a picture of four stars, a calculation of signal-to-noise for one star, or forty frames of a field with a variable star.',
    'How the measured light, the noise, the exposure that reaches a target, and the scatter and fitted amplitude of a light curve change as the calibration steps, the exposure, the aperture, the sky or the comparison star change.',
    'What each calibration frame removes, what limits the signal-to-noise of a bright and of a faint star, and why a comparison star removes thin cloud that a star measured alone cannot.',
    'Everything is synthetic, from a forward model with a known truth, or a calculation for a stated 0.4 m telescope: no blooming, nonlinearity, color terms or seeing, so a real camera adds errors these frames do not show.',
  ],
  survey: [
    'Synthetic stars of known brightness at known distances: counted and missed stars, the bias by shells of distance, or the luminosity function against its truth.',
    'How the counted share, the bias and the recovered luminosity function change as the magnitude limit, the completeness curve or the parallax cut changes.',
    'Which stars a survey misses, how the counted ones differ from the stars there are, and how much of the truth a correction puts back.',
    'The stars are a model, the survey is a model, and the truth is known only because they were made here; a real survey has no such answer key.',
  ],
  compare: [
    'The data (vertical, above) and the model over them, against time; below, each residual in units of its own error bar.',
    'Where the residuals leave the zero line in a run, the model is above or below the data there; scatter around zero is the noise.',
    'Which region the model misses, and whether moving one element brings the residuals back to the noise.',
    'The sliders move values the model was given; nothing is fitted, and a better match does not by itself say the model is right.',
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
  claim: [
    'Synthetic data with a known truth: marks of one blurred star on a frame, seeded repeats of a measurement drawn as intervals, or the chi-square of a fit against a trial value or a line through six points.',
    'How the mean, the spread and the standard error of the marks, the share of intervals that hold the truth, or the chi-square and the reduced chi-square change as the number of marks, the interval, the trial mass or the terms change.',
    'How well a position is known and what the plus-or-minus claims, which parameter the data fix and which they leave open, and whether a model describes the data.',
    'Everything is a model with the truth built in: real repeats rarely come with the truth to count against, and a fit with a good chi-square is not thereby shown to be right.',
  ],
  imaging: [
    'A real picture of the Moon marked with a reference pair and a circle, the positions of one synthetic star over two years, or the relative positions of a synthetic binary over sixteen years.',
    'How the scale and a size in kilometers follow from the marks, how a shift, a proper motion and a parallax come from the epochs used, and how an orbit and a mass sum come from the positions.',
    'What a mark on a picture can and cannot measure, what a distance from a parallax claims and its zero point, and what the positions of a binary fix.',
    'The Moon is a display picture whose gray levels are not light; the star and the binary are synthetic with the truth withheld, and a fit that is refused is the answer, not a failure.',
  ],
  jovian: [
    'Synthetic frames of Jupiter and its moons, one moon’s distance against time with a sinusoid, or Kepler’s third law on a fitted period and radius.',
    'Who is who against the ephemeris, which period and radius the points fix, and Jupiter’s mass with its uncertainty.',
    'Why one frame a night cannot give Io’s period, and why the period the Earth sees is not quite the orbital one.',
    'The frames are synthetic, made from JPL Horizons positions; the mass is the planet’s alone and leaves out its oblateness.',
  ],
  atmosphere: [
    'The temperature sunlight alone gives a planet beside the temperature measured there, a one-layer and a gray greenhouse side by side for one planet, or how quickly the pressure falls with height.',
    'How far the measured temperature of Venus, Earth, Mars and the giant planets is from their equilibrium temperature, what emissivity or optical depth each greenhouse model needs to close the gap, and the scale height each body implies.',
    'Why Venus is far warmer than its equilibrium temperature and why a single layer cannot reach it, why the two greenhouse models give different numbers for the same planet, and where gray opacity stops being a good description.',
    'These are teaching models: no convection, no clouds, no internal heat, one opacity at every wavelength. The Eddington curve is about 4 percent warm at the top of a gray atmosphere, and a giant planet has no surface to compare with.',
  ],
  crater: [
    'Two regions side by side with their densities, one region’s size-frequency plot with its intervals, or one circle’s diameter with the four terms of its uncertainty.',
    'How many craters of at least a given diameter a region has per area and how sure that is, the ratio of two regions’ densities with its interval, and the slope of the plot with its interval.',
    'Which surface has more craters, per area, at a diameter where both are counted completely; whether a slope holds higher up or breaks; and which term of a diameter’s uncertainty is the largest.',
    'The circles are a catalog’s, not marks on the pictures. A density ratio is not an age in years: no production function, saturation, secondary craters or completeness correction is applied.',
  ],
  tides: [
    'The rigid and the fluid Roche limit of a planet and a satellite from their two densities, where a moon’s resonance falls in a ring, the Moon’s recession and the lengthening day under a constant tidal Q, or the heat a tide can put into Io.',
    'How near a satellite can come before gravity alone stops holding it together, which ring radii a moon at a given distance empties, how far the Moon was in the past under the model, and the heat per orbit against the heat Io is observed to radiate.',
    'Why a ring lies inside the Roche limit and a moon outside it, why a resonance clears a gap, why a constant-Q model run backward puts the Moon in contact too recently, and why the tidal heating formula gives a bound and not a prediction.',
    'These are closed-form teaching models: a rigid body has a strength a rubble pile lacks, Q is a constant when it is not, Love numbers are assumed, and the heating formula needs an eccentricity and a dissipation nobody measures independently.',
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
