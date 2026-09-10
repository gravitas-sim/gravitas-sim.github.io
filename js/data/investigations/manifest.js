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
  {
    id: 'detect-this-planet',
    title: 'Can You Detect This Planet?',
    subtitle:
      'Two methods, the same problem: the answer was decided before the data arrived',
    duration: '30-35 min',
    level: 'Introductory astronomy',
    summary:
      'A planet is either there or it is not, but whether you find it depends on choices you make before you take a single measurement. Plan two radial-velocity runs of the same star with the same instrument and the same number of nights, and find that one detects a Jupiter and the other cannot tell you anything. Then do it again with transits, where the same planet is a 587-sigma certainty from space and a 4-sigma maybe from three nights on the ground — and work out how many more nights would fix that, and where the answer stops improving.',
    thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
    series: 'Detecting exoplanets',
    stepCount: 26,
    gradedCount: 13,
    objectiveCount: 8,
  },
  {
    id: 'design-the-schedule',
    title: 'Design the Schedule',
    subtitle:
      'Eight nights on the real instrument, and the times you choose decide the answer',
    duration: '35-40 min',
    level: 'Introductory astronomy',
    summary:
      'You have eight nights and one star. Plan the run yourself in the live Radial Velocity panel, commit to a prediction, then observe two schedules side by side against the same star with the same instrument and the same noise — and watch one of them recover a Jupiter while the other cannot establish that the velocity changes at all. Then break your own result: change the seed, lose a fortnight to weather, and type a list of dates by hand, until you can say what a reported period has to carry before anybody else can check it.',
    thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
    series: 'Detecting exoplanets',
    stepCount: 14,
    gradedCount: 7,
    objectiveCount: 7,
  },
  {
    id: 'binary-star-planets',
    title: 'Planets in Binary Stars',
    subtitle: 'What survives around two stars, and how you would know',
    duration: '40-50 min',
    level: 'Introductory astronomy',
    summary:
      'Most stars come in pairs, so most planets have to make a living in a system with two suns. Some orbits work and some do not, and the line between them is sharper than you would guess. Find it twice — once for a planet around one star, once for a planet around both — and then find out how much of what you just measured was the physics and how much was the arithmetic.',
    thumbnail: 'images/scenarios/binary-planet-lab.webp',
    stepCount: 37,
    gradedCount: 21,
    objectiveCount: 5,
  },
  {
    id: 'gravity-assist',
    title: 'Where Does a Gravity Assist Get Its Speed?',
    subtitle:
      'The same flyby, measured in two frames, with two different answers',
    duration: '15-20 min',
    level: 'Introductory astronomy',
    summary:
      'Voyager 2 arrived at Jupiter travelling ten kilometres a second and left travelling twenty-six. Jupiter did not burn any fuel for it. Fly the same manoeuvre yourself, measure it in the planet’s frame and in an inertial one, run it past both sides of the planet at once, and find out why the two measurements disagree — and who actually paid.',
    thumbnail: 'images/scenarios/gravity-assist-lab.webp',
    stepCount: 22,
    gradedCount: 13,
    objectiveCount: 6,
  },
  {
    id: 'hohmann-transfer',
    title: 'Getting There From Here',
    subtitle: 'Two burns, a long coast, and the arithmetic that decides both',
    duration: '20-25 min',
    level: 'Introductory astronomy',
    summary:
      'A spacecraft at 1 AU, a station at 2.5 AU, and no fuel to waste. Work out both burns and the coast between them with a pencil, then fly the manoeuvre and see whether the engine agrees with you. It does — to a part in a thousand — which is what makes the two surprises in it worth trusting: you speed up to go further out, and you have to speed up again on arrival or you fall straight back.',
    thumbnail: 'images/scenarios/orbital-transfer-lab.webp',
    stepCount: 20,
    gradedCount: 12,
    objectiveCount: 6,
  },
  {
    id: 'lagrange-points',
    title: 'Where Can It Get To?',
    subtitle:
      'Forbidden regions, five balance points, and one conserved number',
    duration: '25-30 min',
    level: 'Introductory astronomy',
    summary:
      'Two stars on a circular orbit and a speck of dust that feels them both. There is one number you can compute about the speck that tells you where it is forbidden to be — and as you make it go faster, walls open one at a time in a fixed order. Find the five places where the speck could sit still, work out which of them it can reach, and then find out why "can reach" is three different questions wearing the same coat.',
    thumbnail: 'images/scenarios/lagrange-point-lab.webp',
    stepCount: 19,
    gradedCount: 8,
    objectiveCount: 6,
  },
  {
    id: 'listening-to-spacetime',
    title: 'Listening to Spacetime',
    subtitle:
      'Work out what made a signal, then check it against the real thing',
    duration: '60-75 min',
    level: 'Introductory astronomy',
    summary:
      'A pattern arrives with no label on it: a wiggle that gets faster and louder and then stops. Over twenty-four steps you work out what could produce it, measure the two relationships that give it away, find out which questions the model can answer and which it cannot, and finish by comparing your answer with what two detectors in Louisiana and Washington actually recorded in September 2015. You can do all of it with the sound off.',
    thumbnail: 'images/scenarios/gw150914.webp',
    stepCount: 24,
    gradedCount: 15,
    objectiveCount: 8,
  },
];
