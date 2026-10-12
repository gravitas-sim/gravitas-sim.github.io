// The 3-D lab's evidence and observing panel: its English
// (js/lab3d/view/evidencePanel.js). Spanish in ./es.lab3dEvidence.js, with the
// same ids. The button that opens it is l3.ev.open in ./en.lab3dLab.js.

export const EN_LAB3DEVIDENCE = {
  'l3e.heading': 'Evidence and observing',
  'l3e.intro':
    'Keep what you measure as evidence for a report, save a system, or ask what an observer looking from a chosen direction would record.',
  'l3e.close': 'Close',

  // --- Keeping a measurement
  'l3e.keep.heading': 'Keep a measurement',
  'l3e.keep.reading':
    'The instrument under the view, with the bodies you chose: {what}',
  'l3e.keep.none':
    'Choose an instrument and its bodies under the view, and the reading will be here.',
  'l3e.keep.button': 'Keep this reading',
  'l3e.keep.event': 'An event from the run',
  'l3e.keep.eventNone': 'No event to keep yet',
  'l3e.keep.eventButton': 'Keep this event',
  'l3e.keep.kept':
    'Kept in your evidence notebook, where your report cites it and My work lists it.',
  'l3e.keep.failed': 'It could not be kept: {why}',
  'l3e.keep.whyUnavailable': 'this browser is not keeping anything',
  'l3e.keep.whyFull': 'the notebook is full',

  // --- What each reading is called in the notebook
  'l3e.title.distance': 'Distance, {a} to {b}',
  'l3e.title.relative': 'Relative motion, {a} and {b}',
  'l3e.title.angle': 'Angle at {v}, between {a} and {b}',
  'l3e.title.elements': 'Orbit of {a} about {p}',
  'l3e.title.sky': '{b} against {a} on the sky',
  'l3e.title.between': 'Planes of the orbits of {a} and {b}',
  'l3e.title.merger': 'Merger of {a} and {b}',
  'l3e.title.closeApproach': 'Close approach of {a} and {b}',
  'l3e.title.crossing': 'Plane crossing by {a}',
  'l3e.title.escape': 'Escape of {a}',
  'l3e.title.forward': 'What an observer records: {model}',

  // --- What each quantity is called
  'l3e.q.t': 'time of the reading',
  'l3e.q.distance': 'distance',
  'l3e.q.speed': 'relative speed',
  'l3e.q.radialRate': 'rate the distance changes',
  'l3e.q.angle': 'angle',
  'l3e.q.a': 'semi-major axis',
  'l3e.q.e': 'eccentricity',
  'l3e.q.i': 'inclination to the reference plane',
  'l3e.q.Omega': 'longitude of the ascending node',
  'l3e.q.omega': 'argument of periapsis',
  'l3e.q.M': 'mean anomaly',
  'l3e.q.period': 'period',
  'l3e.q.across': 'separation across the line of sight',
  'l3e.q.along': 'separation along the line of sight',
  'l3e.q.sightInclination': 'line of sight, polar angle',
  'l3e.q.sightAzimuth': 'line of sight, azimuth',
  'l3e.q.radiiSum': 'sum of the two radii',
  'l3e.q.mutualInclination': 'mutual inclination',
  'l3e.q.inclination.a': 'inclination of the first orbit',
  'l3e.q.inclination.b': 'inclination of the second orbit',

  // --- Saving the system
  'l3e.system.heading': 'Save this system',
  'l3e.system.name': 'Name',
  'l3e.system.start': 'As it started',
  'l3e.system.now': 'As it is now',
  'l3e.system.save': 'Save to My work',
  'l3e.system.download': 'Download the file',
  'l3e.system.saved': 'Saved to My work.',
  'l3e.system.tooFew':
    'Fewer than two bodies are left, so there is no system to save as it is now.',
  'l3e.system.failed': 'It could not be saved: {why}',
  'l3e.system.open': 'Open My work',
  'l3e.system.note':
    'The file is the lab’s own: it holds each body’s mass, size, position and velocity, so it opens again as exactly this system.',
  'l3e.system.defaultName': 'My 3-D system',

  // --- Observing
  'l3e.obs.heading': 'What would an observer record?',
  'l3e.obs.intro':
    'The system is observed through the same forward models the Observatory uses. Orbits are read at the moment you started from, and the planets do not pull on each other in the model, so a slow change the lab shows is not in the curve.',
  'l3e.obs.model': 'Observation',
  'l3e.obs.model.transit': 'Transit light curve',
  'l3e.obs.model.radial-velocity': 'Radial velocity of the star',
  'l3e.obs.star': 'Star',
  'l3e.obs.sight': 'Line of sight',
  'l3e.obs.sight.view': 'Along the current view',
  'l3e.obs.sight.angles': 'At angles I choose',
  'l3e.obs.sight.now':
    'The view looks from {incl}° from the reference plane’s normal, azimuth {az}°.',
  'l3e.obs.inclination': 'Polar angle of the line of sight (0° to 180°)',
  'l3e.obs.azimuth': 'Azimuth (0° to 360°)',
  'l3e.obs.teff': 'Star temperature (K)',
  'l3e.obs.distance': 'Distance (parsecs)',
  'l3e.obs.starRadius': 'Star radius (solar radii)',
  'l3e.obs.planetRadius': 'Radius of {id} (Earth radii)',
  'l3e.obs.span': 'Time span (days)',
  'l3e.obs.count': 'Number of epochs',
  'l3e.obs.noise.transit': 'Noise (parts per million)',
  'l3e.obs.noise.radial-velocity': 'Noise (meters per second)',
  'l3e.obs.go': 'Observe',
  'l3e.obs.refused.needsScale':
    'This system is in code units, which name no length, time or mass, so it cannot be turned into days and solar masses.',
  'l3e.obs.refused.noStar': 'There is no such star in the system.',
  'l3e.obs.refused.massless': 'The star has no mass.',
  'l3e.obs.refused.badObserver': 'The line of sight is not a direction.',
  'l3e.obs.refused.noPlanet':
    'No body in this system is in a bound orbit about the chosen star.',
  'l3e.obs.refused.needsRadii':
    'A transit needs a size for the star and each planet. Enter them above.',
  'l3e.obs.refused.eccentricTransit':
    'The transit model needs circular orbits, and this system has an eccentric one.',
  'l3e.obs.refused.other': 'The system was refused: {code}.',
  'l3e.obs.refused.setup': 'The setup was refused: {why}',
  'l3e.obs.done':
    '{n} points, seen from polar angle {incl}° and azimuth {az}°.',
  'l3e.obs.plot': 'Synthetic {what} against time, {n} points',
  'l3e.obs.what.transit': 'relative flux',
  'l3e.obs.what.radial-velocity': 'radial velocity in meters per second',
  'l3e.obs.table': 'The first points',
  'l3e.obs.col.time': 'Time (days)',
  'l3e.obs.col.value': 'Value',
  'l3e.obs.truth': 'What the model was built with',
  'l3e.obs.keep': 'Keep as evidence',
  'l3e.obs.download': 'Download the observation',
  'l3e.obs.kept':
    'Kept in your evidence notebook. The observation file opens in the Observatory, where the comparison instrument can lay it over real data.',
  'l3e.obs.note.assumed': 'assumed',
  'l3e.obs.note.truth': 'what the model was built with',
  'l3e.obs.warn.osculating':
    'Orbits are read at one instant, and a real orbit drifts.',
  'l3e.obs.warn.planetsDoNotInteract':
    'The planets are treated as not pulling on each other.',
  'l3e.obs.warn.assumedTeff':
    'The star’s temperature was assumed, not read from the system.',
  'l3e.obs.warn.assumedDistance':
    'The distance to the system was assumed, not read from it.',
  'l3e.obs.warn.unbound': '{id} is not in a bound orbit and is left out.',
  'l3e.obs.warn.notAboutStar':
    '{id} orbits a planet more than the star and is left out.',
};
