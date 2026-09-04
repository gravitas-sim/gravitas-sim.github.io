// =============================================================================
// Lesson manifest - GENERATED, do not edit
// -----------------------------------------------------------------------------
// Written by tools/build-investigation-manifest.js from the lesson files in
// this directory. Run `npm run manifest` after changing a lesson's title,
// subtitle, duration, level, summary, thumbnail, series, steps or objectives.
//
// This is what the lesson browser reads. It carries exactly what a card shows
// and nothing else, so ten cards cost a few kilobytes instead of the 225KB the
// ten lessons weigh. The counts are counts rather than the arrays themselves:
// a card quotes "35 steps", it does not render them.
// =============================================================================

export const MANIFEST = [
  {
    id: 'keplers-laws',
    title: "Kepler's Laws",
    subtitle: 'Measure the shape, pacing and timing of real orbits',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Work through all three of Kepler’s laws by measuring orbits rather than being shown them: find the focus of an ellipse, watch equal areas sweep out in equal times, and recover the three-halves power law by plotting it yourself.',
    thumbnail: 'images/scenarios/keplers-2nd-law.webp',
    stepCount: 23,
    gradedCount: 13,
    objectiveCount: 4,
  },
  {
    id: 'retrograde-motion',
    title: 'Why Mars Goes Backwards',
    subtitle: 'Change the frame, and fourteen centuries of epicycles fall away',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Twice every three years Mars stops in the sky, reverses, and loops back on itself. Watched from outside, nothing of the sort happens: Earth and Mars both go round the Sun the same way and never turn back. You will measure both orbits, predict what Mars does when seen from Earth, then switch the reference frame and watch the loop draw itself. Nothing in the physics changes when you do. That is the entire point, and it is what took astronomy from Ptolemy to Copernicus.',
    thumbnail: 'images/scenarios/retrograde-mars.webp',
    stepCount: 33,
    gradedCount: 18,
    objectiveCount: 6,
  },
  {
    id: 'transit-photometry',
    title: 'Finding Planets by Their Shadows',
    subtitle:
      'Measure a transit, weigh what it tells you, and find what is hiding',
    duration: '50-70 min',
    level: 'Introductory astronomy',
    summary:
      'Work through the transit method from first principles on HD 209458 b, the first planet ever caught crossing its star: measure a depth and turn it into a radius, correct it for limb darkening, time two transits to get a period, read an atmosphere out of the color of the dip, and finish by finding the hidden companion star that makes the planet look smaller than it is.',
    thumbnail: 'images/scenarios/transit-lab.webp',
    series: 'Detecting exoplanets',
    stepCount: 29,
    gradedCount: 13,
    objectiveCount: 6,
  },
  {
    id: 'orbital-energy',
    title: 'Bound, Unbound and Escape',
    subtitle: 'Find out what decides whether something comes back',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Fire something off a planet and find out what decides whether it falls back, circles forever, or leaves and never returns. Work up from the experiment to the idea behind it: every object near a star carries an amount of energy, and the sign of that one number settles the question. Finish on a real interstellar visitor and decide for yourself whether it will be back.',
    thumbnail: 'images/scenarios/interstellar-visitor.webp',
    stepCount: 23,
    gradedCount: 9,
    objectiveCount: 6,
  },
  {
    id: 'weighing-stars',
    title: 'Weighing the Stars',
    subtitle: 'Use an orbit to measure something you cannot put on a scale',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Kepler’s laws end with Newton’s correction, and this is what that correction is for. Watch two stars circle each other, find the balance point they are both going round, and use nothing but the size and the timing of their orbit to work out how much each one weighs. No telescope has ever put a star on a scale; this is how it is actually done.',
    thumbnail: 'images/scenarios/binary-pair.webp',
    stepCount: 35,
    gradedCount: 17,
    objectiveCount: 6,
  },
  {
    id: 'black-holes',
    title: 'Black Holes by the Numbers',
    subtitle: 'Make a black hole bigger and discover some surprising rules',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Change one thing about a black hole, its mass, and watch four completely different properties respond. Its event horizon grows in step with the mass. Its average density falls. It gets colder. It lives dramatically longer. Two of those four surprise almost everybody, and you will predict them before you measure them.',
    thumbnail: 'images/scenarios/black-hole-lab.webp',
    stepCount: 29,
    gradedCount: 17,
    objectiveCount: 5,
  },
  {
    id: 'radial-velocity',
    title: 'Finding Planets by Their Tug',
    subtitle: 'Watch a star wobble, weigh its planet, and combine the clues',
    duration: '45-55 min',
    level: 'Introductory astronomy',
    summary:
      'A planet you cannot see still pulls on its star, and the star moves. Measure that motion two different ways, turn it into a mass, and combine it with the radius a transit gave you to work out what kind of world it is.',
    thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
    series: 'Detecting exoplanets',
    stepCount: 37,
    gradedCount: 20,
    objectiveCount: 7,
  },
  {
    id: 'goldilocks-question',
    title: 'The Goldilocks Question',
    subtitle:
      "Move a planet, change its star, and decide what 'habitable' really means",
    duration: '40-50 min',
    level: 'Introductory astronomy',
    summary:
      'Work out for yourself why a planet twice as far from its star receives a quarter as much energy, why dim stars have their habitable zones tucked in close, and why an eccentric orbit means a planet does not receive one steady amount of light all year. Then finish with the harder question the phrase "habitable zone" invites people to skip: what does being inside it actually tell you?',
    thumbnail: 'images/scenarios/habitable-zone-lab.webp',
    series: 'Detecting exoplanets',
    stepCount: 37,
    gradedCount: 19,
    objectiveCount: 7,
  },
  {
    id: 'missing-mass',
    title: 'The Missing Mass',
    subtitle: 'Weigh a system twice, and find the two answers do not agree',
    duration: '45-60 min',
    level: 'Introductory astronomy',
    summary:
      'There are two ways to weigh a system in space: add up the light, or watch how things move. For the Solar System the two agree. For a galaxy they do not, and for a cluster of galaxies they are out by more than a factor of ten. Students arrange mass and watch the rotation curve it makes, turn a measured speed into an enclosed mass, then take a real galaxy’s curve and try to fit it with stars alone — and fail, in the specific way the field failed for a decade, before adding a halo and getting it right. It closes on Zwicky’s cluster and the mass budget of the universe. It is how dark matter was found, and it is a measurement rather than a theory.',
    thumbnail: 'images/scenarios/milky-way-rotation.webp',
    stepCount: 33,
    gradedCount: 17,
    objectiveCount: 8,
  },
  {
    id: 'tides',
    title: 'Tides',
    subtitle:
      'Stretch a world, move a moon, and discover why gravity can tear objects apart',
    duration: '35-45 min',
    level: 'Introductory astronomy',
    summary:
      'Tides are not caused by strong gravity. They are caused by gravity being unequal across an object, and the whole lesson is built on that one subtraction: take the pull on the centre away from the pull on the near side and the far side, and everything from the two daily high tides to a star being shredded by a black hole falls out of what is left.',
    thumbnail: 'images/scenarios/earth-moon-system.webp',
    stepCount: 30,
    gradedCount: 16,
    objectiveCount: 5,
  },
  {
    id: 'butterfly-effect',
    title: 'The Butterfly Effect in Space',
    subtitle:
      'Run the same system twice and find out how long the answer lasts',
    duration: '55-70 min',
    level: 'Introductory astronomy',
    summary:
      'Two runs of the same three stars, started from positions differing by fifteen hundred kilometres in a system a hundred and thirty million kilometres across, end up somewhere completely different. Nothing random happens in between: the simulation is deterministic, and running it twice from exactly the same numbers gives exactly the same answer both times. Along the way you will measure a case that looks like chaos and is not, put a number on how fast prediction fails, and check that the number is a property of the physics rather than of the computer.',
    thumbnail: 'images/scenarios/three-body-sensitivity-lab.webp',
    stepCount: 28,
    gradedCount: 13,
    objectiveCount: 5,
  },
  {
    id: 'when-orbits-lock',
    title: 'When Orbits Lock',
    subtitle: 'A ratio is a hint. Find out what counts as proof',
    duration: '55-70 min',
    level: 'Introductory astronomy',
    summary:
      'Three of Jupiter’s moons keep time with each other, Pluto crosses Neptune’s orbit and has never come near it, and thousands of asteroids sit sixty degrees ahead of Jupiter and stay there. All three are the same phenomenon, and none of them is explained by the thing everybody quotes: the ratio of the periods. You will measure the ratios, find that the tidiest one in the system belongs to a moon in no resonance at all, and then measure the quantity that actually settles it — an angle that either swings or goes round.',
    thumbnail: 'images/scenarios/galilean-resonance.webp',
    stepCount: 33,
    gradedCount: 16,
    objectiveCount: 6,
  },
];
