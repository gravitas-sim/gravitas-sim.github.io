// The 3-D lab's orbit editor and sky view: their English
// (js/lab3d/view/orbitPanel.js). Spanish in ./es.lab3dOrbit.js, with the same
// ids.

export const EN_LAB3DORBIT = {
  'o.heading': 'Orbit editor and sky view',
  'o.intro':
    'Read a body’s orbit about the body it orbits, change one element and press Apply to go on from this instant on the new orbit, see the orbit as an observer sees it, and read two orbits against each other. Every number is computed from the run’s positions and velocities, in the reference plane chosen under “View”.',
  'o.orbit': 'Orbit',
  'o.body': 'Body',
  'o.load': 'Load the current elements',
  'o.apply': 'Apply',
  'o.noPrimary':
    'This body orbits nothing here (it is the heaviest), so it has no orbit to read or edit.',
  'o.frame':
    'Elements of {body} about {primary}, measured in {plane}, at t = {t} ({scale}, in {units}).',
  'o.plane.system': 'the system’s own axes',
  'o.plane.equatorial': 'the equatorial plane',
  'o.plane.invariable': 'the invariable plane',
  'o.plane.sky': 'an observer’s sky',
  'o.scale.code': 'the kernel’s code time',
  'o.scale.elapsed': 'days elapsed from the file’s zero',
  'o.code': 'code units',
  'o.a': 'Semi-major axis a ({unit})',
  'o.e': 'Eccentricity e',
  'o.i': 'Inclination i (degrees)',
  'o.Omega': 'Node Ω (degrees)',
  'o.omega': 'Periapsis ω (degrees)',
  'o.M': 'Mean anomaly M (degrees)',
  'o.now': 'Now:',
  'o.period': 'period',
  'o.notNumber': 'The field {field} is not a number.',
  'o.unchanged': 'Nothing was changed, so the run goes on as it is.',
  'o.loaded': 'The fields hold the elements the run has now.',
  'o.applied':
    'Applied: {body} is on the new orbit from this instant, and what orbits it came along. Nothing else moved.',
  'o.refused': 'These elements were refused: {why}.',
  'o.refused.noPrimary':
    'This body orbits nothing, so it has no orbit to edit.',
  'o.refused.parabolic':
    'A parabola (e = 1) has no semi-major axis, so it cannot be built from elements.',
  'o.refused.ellipseAxis': 'An ellipse needs a positive semi-major axis.',
  'o.refused.hyperbolaAxis': 'A hyperbola needs a negative semi-major axis.',
  'o.refused.eccentricity': 'The eccentricity cannot be negative.',
  'o.refused.inclination': 'The inclination is between 0° and 180°.',
  'o.refused.notFinite': 'Every element must be a finite number.',
  'o.refused.degenerate': 'This body has no orbit to read right now.',
  'o.sky': 'The sky, seen by an observer',
  'o.az': 'Observer’s direction, azimuth (degrees from +x toward +y)',
  'o.el': 'Observer’s direction, elevation (degrees from the reference plane)',
  'o.setObserver': 'Set the observer',
  'o.observerSet':
    'The observer is set. The sky figure and its table now show what this observer sees; the reference plane is unchanged.',
  'o.observe': 'Show the numbers in this observer’s sky',
  'o.observing':
    'The reference plane is now this observer’s sky: +z points at the observer, so an inclination is measured from face-on.',
  'o.skyTable': 'The orbit on the sky',
  'o.skyLabel':
    'The orbit of {body} about {primary} as the observer sees it: the near half solid, the far half dashed.',
  'o.chordLabel':
    'The transit chord: the star’s disc, and the planet’s path across it at its closest approach.',
  'o.noSky': 'There is no bound orbit to draw on the sky for this body.',
  'o.noRadii':
    'The bodies have no radii here, so there is no transit to measure: they are points.',
  'o.t.major': 'Apparent semi-major axis',
  'o.t.minor': 'Apparent semi-minor axis',
  'o.t.ratio': 'Minor over major',
  'o.t.angle': 'Major axis, from the sky’s +x toward +y',
  'o.t.top': 'Highest point on the sky (up is the system’s +z as it appears)',
  'o.t.sep': 'Separation on the sky now',
  'o.t.depth': 'Along the line of sight now (positive: toward the observer)',
  'o.t.nearer': 'Nearer the observer now',
  'o.t.points': 'Transit',
  'o.t.impact': 'Impact parameter',
  'o.t.impactR': 'Impact parameter, in star radii',
  'o.t.transits': 'Passes in front of the star',
  'o.t.chord': 'Half the chord across the contact circle',
  'o.yes': 'yes',
  'o.no': 'no',
  'o.pair': 'Between two orbits',
  'o.other': 'Compare with',
  'o.pairNone': 'Choose two different bodies that both orbit something.',
  'o.pairRead':
    'The orbits of {a} and {b} are inclined to each other by {angle}. Measured in {plane}, {a} is inclined {ia} and {b} {ib}.',
  'o.resonance': 'A resonant pair',
  'o.resIn': 'Inner body',
  'o.resOut': 'Outer body',
  'o.resJ': 'Resonance j : (j − 1)',
  'o.resReset': 'Forget the range',
  'o.resNone':
    'Choose two bodies that orbit the same primary in bound orbits; the argument is about the inner body’s periapsis.',
  'o.resRead':
    'Resonant argument, {j} λ(outer) − {jm} λ(inner) − ϖ(inner), now {phi} rad. This panel has seen it between {lo} and {hi} rad: {kind}.',
  'o.librating': 'it librates, staying on one side of the circle',
  'o.circulating': 'it circulates, going all the way round',
};
