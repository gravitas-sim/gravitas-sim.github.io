// =============================================================================
// The guides of the three planetary lessons (the instructor side)
// -----------------------------------------------------------------------------
// The topic, flow, expectations and time band of each lesson in
// planets-sequence.js, kept in a file of their own so that the lessons stay under
// their line ceiling and the student route does not carry the guides. Content
// only, no imports.
// =============================================================================

const CONTENT = {
  'the-scale-of-the-solar-system': {
    topic:
      'The distances of Earth, Jupiter and Neptune from the Sun, each taken from the selected planet in the sandbox at true scale (1.00, 5.20 and 30.07 AU), the light time to Neptune (4.17 hours), and a scale model in which the Earth is a marble of the student’s own size (for a one-centimeter marble the Sun is a meter wide at 117 meters, and Neptune is at 3.5 kilometers).',
    difficulty: 'Introductory (a product and a ratio)',
    placement:
      'In a survey course at the start of the unit on the Solar System, before any investigation of a single world; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 7 (an overview of the planetary system); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students zoom out in the sandbox, drawn with the distances true and the planets enlarged, select three planets and take each distance from the Sun, predict the light time to Neptune and see it worked out from the distance they took, predict the Sun in a marble-scale model of the Earth, then choose their own marble and find where Neptune falls in it, and say what a one-page diagram gets wrong.',
    priorKnowledge: [
      'What an astronomical unit is',
      'Speed, distance and time: time is distance over speed',
      'Scaling a length by a ratio',
    ],
    keyConcepts: [
      {
        heading: 'Distances are true, sizes are not',
        body: 'The sandbox draws the orbits at 100 units to the AU and the planets larger than life so that they can be seen. At the true scale of the distances a planet would be a speck.',
      },
      {
        heading: 'Light time as a ruler',
        body: 'Light takes 499 seconds to cross an AU: 8.3 minutes to the Earth, 43 minutes to Jupiter, 4.17 hours to Neptune. The delay is a distance the student can feel.',
      },
      {
        heading: 'One scale cannot show size and distance',
        body: 'With the Earth a marble, the Sun is a ball 109 centimeters across, 117 meters away, and Neptune is 3.5 kilometers out. A page cannot keep both.',
      },
    ],
    features: [
      {
        name: 'The sandbox, no instrument',
        text: 'The Solar System scenario at its seed, framed from Mercury to Saturn, with a readout of the selected planet’s distance from the Sun; the step asks the student to zoom out to Neptune and take each distance with Take reading.',
      },
      {
        name: 'Predictions before answers',
        text: 'The light time to Neptune and the marble-scale distance are predicted before they are worked out, and are never marked wrong in the report.',
      },
      {
        name: 'Light time as a ruler',
        text: 'The light time to Neptune is worked out by the page from the distance the student took, multiplying by 499 seconds, so a student can check the arithmetic by hand; the constant appears only after the prediction.',
      },
    ],
    misconceptions: [
      {
        claim: 'The planets in a diagram are nearly to scale.',
        response:
          'Their sizes are enormously exaggerated against the distances; the order is right and the spacing roughly so.',
      },
      {
        claim: 'Sunlight reaches every planet at once.',
        response:
          'It takes 8.3 minutes to reach the Earth and 4.17 hours to reach Neptune.',
      },
      {
        claim: 'Neptune is only a little farther from the Sun than Saturn.',
        response:
          'Saturn is 9.6 AU out and Neptune 30.1: the outer planets are spread far more widely than the inner ones, which is why the sandbox frames Mercury to Saturn.',
      },
      {
        claim: 'The Sun is a small coin among the planets, as in a diagram.',
        response:
          'In the marble model it is a ball 109 centimeters across; the diagram shrinks it to fit.',
      },
    ],
    teachingNotes: [
      'The planets are placed on near-circular orbits at the table’s distances (Earth 1.00 AU, Jupiter 5.20, Neptune 30.07), so the readout equals the table to within its precision; it is a model of the Solar System and not an ephemeris.',
      'The light time per AU is 499.005 seconds (8 minutes 19 seconds); the marble model is a worked example, not a measurement.',
      'The sandbox’s planets are drawn larger than their true size at every zoom so that they can be seen; the distances in the readout are the table’s, and the first step says so.',
      'The marble model uses the Earth’s diameter, 12,742 kilometers, and the astronomical unit, 149,597,870.7 kilometers: one AU is 11,741 Earths across and the Sun 109 Earths across, so for any marble Neptune is 353,000 marbles out. The student’s own size is checked against 30.07 times the model’s AU within 2 percent; the prediction is made for a one-centimeter marble.',
    ],
    discussion: [
      'Where would the nearest star be in the marble model?',
      'What would you have to give up to make a page-wide diagram that is to scale in size and in distance?',
      'Where would the nearest star be in the marble model, and what does that say about a diagram of the Solar System?',
    ],
    extensions: [
      'Mark the planets on a long strip of paper at a scale of your choice and walk it.',
      'Compute the light times of all eight planets and sort them.',
    ],
    modelNotes:
      'js/world/build.js: the planet table (distances at 100 units to the AU); the sandbox is a scenario, with no kernel of its own.',
  },
  'comets-and-the-sun': {
    topic:
      'The closest and furthest distance of a comet the student chooses, taken from the sandbox, its bare-body emission temperature at each end (275.5 K at 1 AU, falling as the inverse square root of the distance, 160 K at about 3 AU where tails are drawn), and which way the ion tail points, whichever way the comet moves.',
    difficulty: 'Introductory (a square root and a ratio)',
    placement:
      'In a survey course after the investigation of the scale of the Solar System and the unit on orbits, and before a unit on small bodies; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 13 (comets); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students watch the sandbox’s model comets, predict which way the tail points, pause a comet that comes inside 3 AU at three points of their choosing to read its tail against the line to the Sun, take the chosen comet’s two distances from the Sun, see its temperature at each end, predict and then read the temperature of the real Halley, and say why the tail grows near the Sun. The comets are model comets: the sandbox gives them the names of famous comets and starts each at the distance of its average orbit at 70 percent of circular speed, so the one named Halley comes no closer than 5.79 AU and goes out to 17.84 AU, while Wild 2 and Hartley 2 come in to 1.1 AU. The real Halley (0.586 AU) is a transfer case.',
    priorKnowledge: [
      'An orbit is an ellipse with the Sun at a focus',
      'The inverse-square law for light',
      'A square root',
    ],
    keyConcepts: [
      {
        heading: 'Two ends of an orbit',
        body: 'The closest and furthest distances are the orbit’s two ends; a comet spends most of its time near the far one.',
      },
      {
        heading: 'Temperature falls as 1 over the square root of the distance',
        body: 'The emission temperature of a bare dark body is 275.5 K at 1 AU for an albedo of 0.04; the ratio of the two ends’ temperatures is the square root of the ratio of the distances. It is a bare-body estimate that leaves out the energy spent turning ice to gas.',
      },
      {
        heading: 'The ion tail points away from the Sun',
        body: 'It is swept directly away by the solar wind, so on the way out the comet flies tail first; the dust tail is broader and curves back along the orbit.',
      },
    ],
    features: [
      {
        name: 'The sandbox, no instrument',
        text: 'The Solar System scenario with its model comets and the asteroids off; a readout names the selected comet, its two distances, its distance now, whether it is moving toward or away from the Sun and whether the sandbox draws its tail.',
      },
      {
        name: 'Live checking',
        text: 'The distance step is checked against the live orbit of the comet the readings came from, within four percent, so any comet and any seed gives a graded answer.',
      },
      {
        name: 'Predictions before answers',
        text: 'The direction of the tail, and the temperature of the real Halley, are predicted before they are shown, and the predictions are never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'A comet’s tail trails behind it, like smoke.',
        response:
          'The ion tail points away from the Sun, so an outbound comet flies tail first; only the dust tail trails along the orbit.',
      },
      {
        claim: 'A comet’s tail is there all the time.',
        response:
          'It grows as the ice warms near the Sun and fades far from it.',
      },
      {
        claim: 'A comet’s orbit is the same as a planet’s, only longer.',
        response:
          'Its eccentricity is large: the model comet here comes within 5.79 AU and goes out to 17.84, a ratio of three, and real ones are far more extreme.',
      },
      {
        claim: 'A comet is hot because it is near the Sun.',
        response:
          'A bare nucleus at 5.79 AU would be at 114 K, far too cold to turn its ice to gas; what matters is how close it comes, not that it is near.',
      },
    ],
    teachingNotes: [
      'The comets carry the names of famous comets but are placed by the sandbox at the distance of their average orbit at 70 percent of circular speed, so their orbits are not the real ones; the investigation says so and uses the real Halley (0.586 AU) as a transfer case. The student chooses the comet the distance steps use: the one named Halley comes no closer than 5.79 AU and goes out to 17.84 AU and its bare-body temperature never reaches 160 K, while Wild 2 and Hartley 2 come in to about 1.1 AU and do. The sandbox draws a tail where a comet receives more than a ninth of the Earth’s sunlight, closer than 3 AU, and a bare nucleus is at 160 K at (275.5 / 160) squared, 2.96 AU: the two thresholds agree.',
      'The temperature is a bare-body, uniform-redistribution estimate with a Bond albedo of 0.04 (the emission temperature of the atmosphere kernel); a real nucleus loses energy by sublimation and is not uniform.',
      'The temperature of 275.5 K at 1 AU is the emission temperature of the atmosphere kernel for a Bond albedo of 0.04 and uniform redistribution; the day-side maximum is higher by a factor of 2^(1/4), about 1.19.',
      'The sandbox’s ion and dust tails are drawn from the geometry in js/bodyVisuals.js: the ion tail always away from the Sun, the dust tail lagging along the orbit; their length and brightness are a drawing, not a measurement.',
    ],
    discussion: [
      'Why would a comet that has been round the Sun many times grow a smaller tail than a new one?',
      'What would change in the temperature estimate for a comet with a bright surface?',
      'Which of a comet’s two tails would you expect to see curve, and why?',
    ],
    extensions: [
      'Compare the comet’s temperature at its near end with the equilibrium temperatures of the planets in Why Venus Is Hot.',
      'Estimate where in the Solar System a bare dark body reaches 160 K, and compare it with the inner edge of the asteroid belt.',
    ],
    modelNotes:
      'js/kernels/atmospheres/equilibrium.js: the emission temperature, with uniform redistribution and a Bond albedo of 0.04; js/bodyVisuals.js: the ion and dust tail directions.',
  },
  'moons-of-the-giants': {
    topic:
      'The periods of Io, Europa and Ganymede fitted from synthetic frames, their ratios (2.007 and 2.013), the Laplace combination of the three motions with its uncertainty for a sampling the student chooses (0.022 ± 0.025 degrees a day on the designed sampling, and 47 degrees a day off zero on one frame a night), and Callisto outside the chain (2.33, predicted first).',
    difficulty: 'Introductory (a division, and a combination of three numbers)',
    placement:
      'In a survey course after the unit on the giant planets and their moons, and before When Orbits Lock if both are set; it needs no earlier investigation, though Weighing Jupiter From Its Moons makes the frames familiar. It supports OpenStax Astronomy 2e chapter 12 (section 12.2, the Galilean moons); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students predict and then take the periods of three moons from the instrument of the Jupiter investigation (1.7682, 3.5480 and 7.1413 days), see them divided (2.007 and 2.013), are asked what a near-miss of 2 can establish, choose the sampling and take the periods and uncertainties again to form the combination of the three motions with its uncertainty, and predict and then test Callisto. The frames are synthetic, made from the real ephemeris, and the investigation says so.',
    priorKnowledge: [
      'A period is the time for one orbit',
      'A rate is an angle divided by a time',
      'What an uncertainty is, at the level of “plus or minus”',
    ],
    keyConcepts: [
      {
        heading: 'A ratio near 2 is where to look',
        body: 'Europa takes 2.007 times as long as Io and Ganymede 2.013 times as long as Europa. Unrelated periods fall this near a whole-number ratio often enough that the ratio cannot decide; a resonance is a relation between angles that holds on average, so the periods need not give an exact ratio.',
      },
      {
        heading: 'The combination that cancels what the moons share',
        body: 'Io’s motion minus three times Europa’s plus twice Ganymede’s is zero for exact step, and the coefficients sum to zero, so an offset common to all three, such as the apparent one Jupiter’s travel adds to the periods seen from Earth, cancels. The value from the printed four-decimal periods is 0.022 degrees a day (0.015 from the unrounded fit), with an uncertainty of about 0.025.',
      },
      {
        heading: 'Consistent with zero is not proof',
        body: 'The relation among the motions is a necessary condition. That the angle itself librates and does not circulate takes years of data, and is followed in a model in When Orbits Lock. Callisto, at 2.33 times Ganymede, is outside the chain.',
      },
    ],
    features: [
      {
        name: 'Jupiter instruments (jovian family)',
        text: 'The frames and the period fit of the Jupiter investigation: the four moons at hourly and nightly cadence, a sinusoid fitted to each moon’s distance, and the period with its uncertainty to four decimals.',
      },
      {
        name: 'Four decimals',
        text: 'The combination is sensitive: rounding the three periods to three decimals gives 0.05, not 0.022. The readings keep the four decimals the instrument prints, and the page forms the combination and its uncertainty from them.',
      },
      {
        name: 'Predictions before answers',
        text: 'The periods’ pattern, the value of the combination for exact step and Callisto’s ratio are predicted before they are measured, and are never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim:
          'A resonance needs the period ratio to be exactly a whole-number ratio.',
        response:
          'It needs a relation between angles to hold on average while the orbits slowly turn, so the measured periods differ a little from the ratio.',
      },
      {
        claim: 'A ratio of 2.007 is a ratio of 2.',
        response:
          'It is within half a percent of 2, which is what a hint looks like; many unrelated pairs are that close. The test is the combination of all three motions, with its uncertainty.',
      },
      {
        claim: 'A value inside its uncertainty proves the relation.',
        response:
          'It is consistent with zero and no more: it cannot tell exact step from a small departure the frames are too coarse to see.',
      },
      {
        claim:
          'The Laplace combination is a measurement of the resonance angle.',
        response:
          'It combines three periods; the angle itself is a different quantity, which librates about 180 degrees in a model that When Orbits Lock runs.',
      },
    ],
    teachingNotes: [
      'The periods are the ones the frames show, from Earth: each is a little shorter than the moon’s true period because Jupiter moves along its own orbit, by the same angle a day for all three, which the combination cancels. The true sidereal periods are 1.7691, 3.5512 and 7.1546 days.',
      'The frames are synthetic, made from the real positions of the satellite ephemeris JUP365 (JPL Horizons), and the set covers only Jupiter’s moons: the title says “giants” and the last step says what is not covered.',
      'The combination is a necessary relation. The libration of the Laplace angle is shown, in a model, by When Orbits Lock; it should not be claimed from these frames.',
      'Callisto is not part of the Laplace chain: its period is 2.328 times Ganymede’s. The step says so with the same arithmetic, not by assertion.',
      'The sampling is the student’s decision. At one frame a night Io’s period (1.77 days, under the 2-day limit the sampling can tell apart) comes out as an alias, 2.30 days, with an uncertainty as small as the right one (0.0002 days), so the combination is about −47 degrees a day: the uncertainty does not flag the alias. Europa and Ganymede are unchanged to four decimals (3.5480 and 7.1415). The instrument’s search and Nyquist rows say what the sampling can do.',
    ],
    discussion: [
      'If the combination had come out as 0.4 degrees a day, what would you conclude, and what would you check first?',
      'Why does a shared offset cancel from the combination, and what else could be removed the same way?',
      'What would observing the angle itself for years tell you that three periods cannot?',
    ],
    extensions: [
      'Repeat the combination with the once-a-night frames and see what the alias does to it.',
      'Use the weighing instrument of Weighing Jupiter From Its Moons on the same three moons.',
    ],
    modelNotes:
      'js/satellites/ (SATELLITE_EPHEMERIS.md): the fit of js/satellites/weigh.js on the marks measured from the synthetic frames; the Laplace argument itself is in js/resonance/elements.js.',
  },
};

const FLOW = {
  'the-scale-of-the-solar-system': [
    {
      from: 'a-picture-you-have-seen',
      to: 'three-distances',
      text: 'A picture you have seen, and three true distances taken from the planets.',
    },
    {
      from: 'light-time-predict',
      to: 'light-time',
      text: 'The prediction of the light time to Neptune, and the arithmetic on the distance taken.',
    },
    {
      from: 'earth-as-a-marble',
      to: 'choose-your-marble',
      text: 'The marble-scale model: the prediction for a one-centimeter marble, then the student’s own marble and where Neptune falls.',
    },
    {
      from: 'what-a-diagram-gets-wrong',
      to: 'what-you-worked-out',
      text: 'What a one-page diagram gets wrong, and the close.',
    },
  ],
  'comets-and-the-sun': [
    {
      from: 'a-dirty-snowball',
      to: 'tail-predict',
      text: 'A dirty snowball, and the prediction of the tail’s direction.',
    },
    {
      from: 'watch-the-tails',
      to: 'going-out',
      text: 'Watching the tails, and the outbound comet.',
    },
    {
      from: 'orbit-ends',
      to: 'the-real-halley',
      text: 'The two ends of the orbit, the temperature at each, and the real Halley as a transfer case, predicted before it is read.',
    },
    {
      from: 'why-a-tail-near-the-sun',
      to: 'what-you-worked-out',
      text: 'Why a tail grows near the Sun, and the close.',
    },
  ],
  'moons-of-the-giants': [
    {
      from: 'a-family-of-moons',
      to: 'three-periods',
      text: 'A family of moons, the prediction of the pattern, and three fitted periods taken from the instrument.',
    },
    {
      from: 'the-ratios',
      to: 'a-hint-is-not-proof',
      text: 'The ratios, 2.007 and 2.013, and why a near-miss of 2 is a hint.',
    },
    {
      from: 'the-laplace-combination',
      to: 'consistent-with-zero',
      text: 'The combination of the three motions, its value with its uncertainty on the sampling the student chooses, and what consistent with zero means.',
    },
    {
      from: 'callisto-predict',
      to: 'what-you-worked-out',
      text: 'The prediction for Callisto, Callisto outside the chain, and the close.',
    },
  ],
};

const EXPECTATIONS = {
  'the-scale-of-the-solar-system': {
    'three-distances':
      'Earth 1.00 AU (within 0.05), Jupiter 5.20 (within 0.15) and Neptune 30.07 (within 0.5), each taken from the selected planet.',
    'light-time':
      'A light time to Neptune of 4.17 hours (within 0.1), computed from the distance taken in the step before.',
    'choose-your-marble':
      'Any marble size: Neptune at 30.07 times the model’s astronomical unit, within 2 percent (3,530 meters for a one-centimeter marble).',
  },
  'comets-and-the-sun': {
    'orbit-ends':
      'The closest and furthest distance of the comet the student selected, taken with Take reading, each within four percent of its live orbit (the model Halley: 5.79 and 17.84 AU).',
    'heat-at-the-ends':
      'The two distances of the step before, from which the page computes 275.5 K over the square root of each (the model Halley: 114 K and 65 K).',
    'the-real-halley':
      'A closest approach of 0.586 AU and a temperature of 360 K, both computed by the page and set beside the student’s prediction.',
  },
  'moons-of-the-giants': {
    'three-periods':
      'Periods of 1.7682 (within 0.001), 3.5480 (within 0.001) and 7.1413 days (within 0.002), taken with the sampling at 1.',
    'the-ratios':
      'Ratios of 2.0065 and 2.0128 (each within 0.004), computed from the periods of step 3.',
    'how-sure-is-the-sum':
      'On the designed sampling, periods within 0.003 of 1.7682, 3.5480 and 7.1413 and a combination of about 0.022 degrees a day with an uncertainty of about 0.025; on one frame a night Io’s period is 2.30 days, an alias, and the step refuses it.',
    'callisto-is-not-in-the-chain':
      'A period of 16.62 days (within 0.02) and a ratio to Ganymede’s of 2.33 (within 0.006), after a prediction.',
  },
};

const BANDS = {
  'the-scale-of-the-solar-system': { core: 'short' },
  'comets-and-the-sun': { core: 'short' },
  'moons-of-the-giants': { core: 'short' },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};
