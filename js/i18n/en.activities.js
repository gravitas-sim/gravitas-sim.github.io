// =============================================================================
// The classroom activities' words, in English
// -----------------------------------------------------------------------------
// Split out of ./en.teaching.js because two very different readers shared one
// catalog. /teaching/ reads all of it; the application reads only these
// `teach.activity.*` strings - an activity's title, its objectives and each
// format's opening - which is what js/activities/activityBridge.js registers
// when somebody opens an activity link.
//
// Before the split the bridge pulled the whole showcase page's prose into the
// application's lazy chunks: the cycle, the journey, the instrument
// descriptions, the demonstrations, the access notes, the evaluation template
// and the feedback form, in both languages, none of which the application can
// render. Fifty-seven kilobytes of a page the simulation never shows.
//
// ./en.teaching.js still exports everything by spreading this in, so the showcase
// page and every test that reads one catalog are unchanged.
// =============================================================================

export const EN_ACTIVITIES = {
  'teach.activity.duration': 'about {n} minutes',
  'teach.activity.format.demonstration': 'Demonstration',
  'teach.activity.format.guided': 'Guided activity',
  'teach.activity.format.lab': 'Full lab',

  'teach.activity.orbital-speed.title':
    'Orbital motion: why do planets change speed?',
  'teach.activity.orbital-speed.question':
    'A planet on a fixed elliptical orbit speeds up and slows down, with nothing pushing it and no fuel burned. What is being traded, and what is conserved?',
  'teach.activity.orbital-speed.audience':
    'Introductory astronomy or algebra-based physics. Works with a whole class projected, with pairs at machines, or as a lab period.',
  'teach.activity.orbital-speed.prerequisites':
    'Students should know that gravity pulls two masses together and weakens with distance. No calculus, no prior work on ellipses, and no angular momentum required — the activity builds it.',
  'teach.activity.orbital-speed.objective.1':
    'Predict where on an elliptical orbit a planet moves fastest, and say why',
  'teach.activity.orbital-speed.objective.2':
    'Measure speed and distance at closest and furthest approach and state the relationship between them',
  'teach.activity.orbital-speed.objective.3':
    'Explain the speed change in terms of a conserved quantity, and identify what gravity does and does not do to it',

  'teach.activity.orbital-speed.demonstration.for': 'Projected, instructor-led',
  'teach.activity.orbital-speed.demonstration.intro':
    'A prediction, the motion, and the reason — in the time it takes to change topic. Ask the room to commit to an answer before anything moves; the equal-area slices at the end are the payoff.',
  'teach.activity.orbital-speed.demonstration.closing':
    'Close by asking the room what would have to be true for a planet to move at a constant speed. The answer — a circular orbit, where the distance never changes — is the one that shows they have the idea rather than the phrase.',

  // --- The three short routes on /teaching/ ---------------------------------
  // A route is an activity format like any other: a lesson id and an ordered
  // list of that lesson's own step ids, opened as an ordinary assignment. What
  // makes it a route is the shape - one question, one change the reader makes,
  // one measured result, one explanation - and the length.
  'teach.activity.format.route': 'Short route',

  'teach.activity.orbital-speed.route.for': 'One reader, at a machine',
  'teach.activity.orbital-speed.route.intro':
    'Commit to where the planet moves fastest before anything runs. Your answer is recorded and left unmarked until the measurement settles it — the experiment decides, not the answer key. Then run it, read the speed and the distance at both extremes with the event watch, and say what is being traded.',
  'teach.activity.orbital-speed.route.closing':
    'You measured the product of speed and distance at two points on one orbit and found it unchanged. That is angular momentum, and it is conserved because gravity pulls along the line joining the two bodies and so exerts no torque about the star. The full investigation takes the same measurement to Kepler’s three laws and to where they stop working.',

  'teach.activity.binary-planets.title':
    'Planets around two stars: where can an orbit survive?',
  'teach.activity.binary-planets.question':
    'A planet orbits one star of a close binary pair. How far out can it start and still be there twenty binary periods later?',
  'teach.activity.binary-planets.audience':
    'Introductory astronomy, or anyone who has met the two-body problem and is ready to be shown its edge. No calculus.',
  'teach.activity.binary-planets.prerequisites':
    'Students should know what an orbit is and that a two-body orbit repeats. Nothing about stability, resonance or chaos is assumed — the comparison is the introduction to it.',
  'teach.activity.binary-planets.objective.1':
    'Predict whether a planet at a stated fraction of the binary separation survives, and commit to the answer before running it',
  'teach.activity.binary-planets.objective.2':
    'Read the run that follows and state what "ejected" means as a measurement rather than as a word',
  'teach.activity.binary-planets.route.for':
    'One reader, two runs of the same binary',
  'teach.activity.binary-planets.route.intro':
    'The same binary, the same seed, the same twenty periods: the only thing that changes between the two runs is where the planet starts. Predict what moving it out to 0.30 separations does, then run it and read when it left.',
  'teach.activity.binary-planets.route.closing':
    'Two runs of one seeded system, differing in one number, is a controlled experiment — and the second one ends with the planet unbound rather than on a wider orbit. The full investigation repeats it at five separations, asks whether the edge it finds is physics or arithmetic, and rechecks it at a smaller integration step.',

  'teach.activity.star-sizes.title':
    'Two stars, one temperature: which one is bigger?',
  'teach.activity.star-sizes.question':
    'Two stars have the same surface temperature and one is three hundred times more luminous. What does that tell you about their sizes, and how would you know?',
  'teach.activity.star-sizes.audience':
    'Introductory astronomy. The arithmetic is one square root; the point is that a size nobody can resolve is measurable anyway.',
  'teach.activity.star-sizes.prerequisites':
    'Students should know that a hotter surface radiates more per unit area. The relation between luminosity, radius and temperature is built here rather than assumed.',
  'teach.activity.star-sizes.objective.1':
    'Predict the radius ratio of two stars from their luminosities at a shared temperature',
  'teach.activity.star-sizes.objective.2':
    'Read temperature, luminosity and radius for a star off the comparison card and the H–R diagram, and say which of the three was measured and which was derived',
  'teach.activity.star-sizes.route.for': 'One reader, at a machine',
  'teach.activity.star-sizes.route.intro':
    'Two stars are standing on the canvas and on the diagram beside it. Commit to a radius ratio, then select each one in turn and read the numbers the comparison card gives you. The numbers come from published evolutionary tracks, not from the simulation, and the card says so.',
  'teach.activity.star-sizes.route.closing':
    'Luminosity is surface area times what each square meter radiates, so at a fixed temperature the radius goes as the square root of the luminosity. Three hundred times the light is about seventeen times the radius. The full investigation builds the whole H–R diagram this way and then asks what a survey of real stars would and would not have seen.',

  'teach.activity.orbital-speed.guided.for':
    'One student or a pair, at a machine',
  'teach.activity.orbital-speed.guided.intro':
    'Shape the orbit yourself, commit to a prediction, then let the simulation stop at the two moments that settle it. The measurements attach to your notebook as you take them.',
  'teach.activity.orbital-speed.guided.closing':
    'For a transfer: set the eccentricity slider to 0.7 and predict the speed ratio before measuring it again. A rounder orbit should give a ratio nearer one — say why before you check.',

  'teach.activity.orbital-speed.lab.for':
    'A full period, individually or in pairs',
  'teach.activity.orbital-speed.lab.intro':
    'The whole argument, measured rather than asserted: where the star sits, how the shape is defined, two orbits compared under control, the speeds at both extremes, and where the reasoning stops working.',
  'teach.activity.orbital-speed.lab.closing':
    'The comparison is controlled because both orbiters go round the same star with the same semi-major axis, so eccentricity is the only thing that differs. The final step asks where that description fails — a pair of comparable masses, where neither body simply orbits the other.',
};
