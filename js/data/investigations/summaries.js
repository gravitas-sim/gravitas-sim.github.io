// =============================================================================
// Lesson card summaries
// -----------------------------------------------------------------------------
// The one place a lesson's summary paragraph is written. The lesson files carry
// none and the generated manifest carries none: the lesson browser fetches this
// file when it draws its cards, and the static catalog (../investigations.js)
// attaches it for tools and tests, so the paragraph is shipped once instead of
// in the lesson and again in the manifest. Edit it here; no generator run is
// needed.
// =============================================================================

export const SUMMARIES = {
  'keplers-laws':
    'Work through all three of Kepler’s laws by measuring orbits rather than being shown them: find the focus of an ellipse, watch equal areas sweep out in equal times, and recover the three-halves power law by plotting it yourself.',
  'retrograde-motion':
    'Twice every three years Mars stops in the sky, reverses, and loops back on itself. Watched from outside, nothing of the sort happens: Earth and Mars both go round the Sun the same way and never turn back. You will measure both orbits, predict what Mars does when seen from Earth, then switch the reference frame and watch the loop draw itself. Nothing in the physics changes when you do. That is the entire point, and it is what took astronomy from Ptolemy to Copernicus.',
  'transit-photometry':
    'Work through the transit method from first principles on HD 209458 b, the first planet ever caught crossing its star: measure a depth and turn it into a radius, correct it for limb darkening, time two transits to get a period, read an atmosphere out of the color of the dip, and finish by finding the hidden companion star that makes the planet look smaller than it is.',
  'orbital-energy':
    'Fire something off a planet and find out what decides whether it falls back, circles forever, or leaves and never returns. Work up from the experiment to the idea behind it: every object near a star carries an amount of energy, and the sign of that one number settles the question. Finish on a real interstellar visitor and decide for yourself whether it will be back.',
  'weighing-stars':
    'Kepler’s laws end with Newton’s correction, and this is what that correction is for. Watch two stars circle each other, find the balance point they are both going round, and use nothing but the size and the timing of their orbit to work out how much each one weighs. No telescope has ever put a star on a scale; this is how it is actually done.',
  'black-holes':
    'Change one thing about a black hole, its mass, and watch four completely different properties respond. Its event horizon grows in step with the mass. Its average density falls. It gets colder. It lives dramatically longer. Two of those four surprise almost everybody, and you will predict them before you measure them.',
  'radial-velocity':
    'A planet you cannot see still pulls on its star, and the star moves. Measure that motion two different ways, turn it into a mass, and combine it with the radius a transit gave you to work out what kind of world it is.',
  'goldilocks-question':
    'Work out for yourself why a planet twice as far from its star receives a quarter as much energy, why dim stars have their habitable zones tucked in close, and why an eccentric orbit means a planet does not receive one steady amount of light all year. Then finish with the harder question the phrase "habitable zone" invites people to skip: what does being inside it actually tell you?',
  'missing-mass':
    'There are two ways to weigh a system in space: add up the light, or watch how things move. For the Solar System the two agree. For a galaxy they do not, and for a cluster of galaxies they are out by more than a factor of ten. Students arrange mass and watch the rotation curve it makes, turn a measured speed into an enclosed mass, then take a rotation curve built from a real galaxy’s published parameters and try to fit it with stars alone — and fail, in the specific way the field failed for a decade, before adding a halo and getting it right. It closes on Zwicky’s cluster and the mass budget of the universe. It is how dark matter was found, and it is a measurement rather than a theory.',
  tides:
    'Tides are not caused by strong gravity. They are caused by gravity being unequal across an object, and the whole investigation is built on that one subtraction: take the pull on the center away from the pull on the near side and the far side, and everything from the two daily high tides to a star being shredded by a black hole falls out of what is left.',
  'butterfly-effect':
    'Two runs of the same three stars, started from positions differing by fifteen hundred kilometers in a system a hundred and thirty million kilometers across, end up somewhere completely different. Nothing random happens in between: the simulation is deterministic, and running it twice from exactly the same numbers gives exactly the same answer both times. Along the way you will measure a case that looks like chaos and is not, put a number on how fast prediction fails, and check that the number is a property of the physics rather than of the computer.',
  'when-orbits-lock':
    'Three of Jupiter’s moons keep time with each other, Pluto crosses Neptune’s orbit and has never come near it, and thousands of asteroids sit sixty degrees ahead of Jupiter and stay there. All three are the same phenomenon, and none of them is explained by the thing everybody quotes: the ratio of the periods. You will measure the ratios, find that the tidiest one in the system belongs to a moon in no resonance at all, and then measure the quantity that actually settles it — an angle that either swings or goes round.',
  'detect-this-planet':
    'A planet is either there or it is not, but whether you find it depends on choices you make before you take a single measurement. Plan two radial-velocity runs of the same star with the same instrument and the same number of nights, and find that one detects a Jupiter and the other cannot tell you anything. Then do it again with transits, where the same planet is a 587-sigma certainty from space and a 4-sigma maybe from three nights on the ground — and work out how many more nights would fix that, and where the answer stops improving.',
  'design-the-schedule':
    'You have eight nights and one star. Plan the run yourself in the live Radial Velocity panel, commit to a prediction, then observe two schedules side by side against the same star with the same instrument and the same noise — and watch one of them recover a Jupiter while the other cannot establish that the velocity changes at all. Then break your own result: change the seed, lose a fortnight to weather, and type a list of dates by hand, until you can say what a reported period has to carry before anybody else can check it.',
  'binary-star-planets':
    'Most stars come in pairs, so most planets have to make a living in a system with two suns. Some orbits work and some do not, and the line between them is sharper than you would guess. Find it twice — once for a planet around one star, once for a planet around both — and then find out how much of what you just measured was the physics and how much was the arithmetic.',
  'gravity-assist':
    'Voyager 2 arrived at Jupiter traveling ten kilometers a second and left traveling twenty-six. Jupiter did not burn any fuel for it. Fly the same maneuver yourself, measure it in the planet’s frame and in an inertial one, run it past both sides of the planet at once, and find out why the two measurements disagree — and who actually paid.',
  'hohmann-transfer':
    'A spacecraft at 1 AU, a station at 2.5 AU, and no fuel to waste. Work out both burns and the coast between them with a pencil, then fly the maneuver and see whether the engine agrees with you. It does — to a part in a thousand — which is what makes the two surprises in it worth trusting: you speed up to go further out, and you have to speed up again on arrival or you fall straight back.',
  'lagrange-points':
    'Two stars on a circular orbit and a speck of dust that feels them both. There is one number you can compute about the speck that tells you where it is forbidden to be — and as you make it go faster, walls open one at a time in a fixed order. Find the five places where the speck could sit still, work out which of them it can reach, and then find out why "can reach" is three different questions wearing the same coat.',
  'what-is-a-gravitational-wave':
    'Two objects circle each other on screen and emit no light at all. Over twenty-four short screens you work out what leaves them, what it does to anything it passes, and how an instrument could notice - and you learn to tell the three kinds of picture apart: the drawing, the calculation and the measurement. No equations, no prior physics, and it can be done with the sound off.',
  'listening-to-spacetime':
    'A pattern arrives with no label on it: a wiggle that gets faster and louder and then stops. You work out what could produce it, measure the two relationships that give it away, find out which questions the model can answer and which it cannot, compare your answer with what two detectors recorded in September 2015, and then measure five more mergers from the open archive yourself. You can do all of it with the sound off.',
  'a-universe-of-stars':
    'Three stars, no labels, and a guess about which is biggest. You separate the four things that get confused with each other - mass, radius, temperature and luminosity - learn to read the diagram that organizes them, meet giants and supergiants and white dwarfs where they actually sit on it, work out why the heaviest stars live the shortest lives, and count a synthetic population twice to see why the stars you can see are not the stars there are. Everything to that point is built on published models. The last stretch is not: four real spectra, observed by SDSS, and what a color turns out not to be able to tell you.',
  'lives-of-stars':
    'A star is not a thing so much as a process that takes a while. Over thirty-four steps you follow three of them from a contracting cloud to what they leave behind — a solar-mass star to a white dwarf, a ten solar-mass star to a neutron star, and a forty solar-mass star to a black hole — reading every stage off the same diagram and the same published tracks. You will also meet the star that does none of this: a red dwarf that will still be burning hydrogen when the Universe is a hundred times its present age.',
  'twelve-nights':
    'A committee gives you twelve nights on one star from one telescope in Chile. The star is above the airmass limit for five hours a night and the window opens four minutes earlier every night, so your twelve measurements land on a comb whose spacing you did not choose. Plan the run in the observing planner, watch the spectral window before you have a single velocity, then commit two plans to the live spectrograph and find that one of them returns a planet with the wrong period. Finish by working out what would actually fix it — and why more nights would not.',
  'power-law-gravity':
    'Newton said gravity falls off as one over the distance squared. Not one over the distance, not one over the cube — squared, exactly. This investigation asks what that exactly is doing. You will turn the exponent up and down and measure three things: whether the orbit still closes, how the orbital period depends on distance, and which conservation laws survive. Two of those change immediately. One of them does not change at all, and the reason it does not is the most useful thing in the investigation.',
  'color-and-temperature':
    "Everything that glows by temperature leaves a signature in its light. You will predict how the peak wavelength of a blackbody moves as it heats up, measure it on a computed Planck curve, and run Wien's law both ways: temperature from a peak, and temperature from a color index. Along the way the Sun's green peak turns out not to make it green, and the line between a blackbody and a real star is drawn. Quantitative depth adds the Stefan–Boltzmann law and the size of a star from its light; advanced depth adds synthetic photometry in two real filter systems.",
};
