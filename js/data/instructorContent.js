// =============================================================================
// Instructor content: the part of a teaching guide that cannot be derived
// -----------------------------------------------------------------------------
// Titles, durations, step counts, questions, correct answers and tolerances are
// NOT here. Those are read out of investigations.js by answerKey.js, so they
// cannot drift from the lessons a class is actually using.
//
// What is here is the prose an instructor needs and a program cannot write: why
// a lesson is built the way it is, what students get wrong, where they slow
// down, and what a measurement should come out at. Step numbers referenced in
// this file are checked against the real lessons by the test suite, so a lesson
// edit that moves a step is caught rather than silently making a guide wrong.
// =============================================================================

/** Shared closing note pointing at the public model page. */
const MODEL_PAGE = 'https://gravitas-sim.online/model/';

export const INSTRUCTOR_CONTENT = {
  'keplers-laws': {
    topic: 'Orbital motion',
    difficulty: 'Introductory',
    placement:
      'During the gravity and orbits unit, after students have met the idea of an orbit but before or instead of a lecture derivation of the three laws.',
    overview: `Students recover all three of Kepler's laws by measuring them, in the order Kepler
      found them. They read the shape of an ellipse off a slider, watch equal areas sweep out and
      then time the speeds that make them equal, tabulate four planets and plot the result, and
      finish by using Newton's version of the third law to weigh a star forty light years away.
      The pedagogical aim is that the laws arrive as conclusions from data the student produced,
      not as three statements to memorise. The final section matters more than it looks: it is
      where "Kepler's third law" stops being a curiosity about the Solar System and becomes the
      instrument astronomers actually weigh things with.`,
    priorKnowledge: [
      'That planets orbit the Sun and moons orbit planets',
      'Reading values off a graph, and plotting a point',
      'Squaring and cubing a number on a calculator',
      'No calculus, and no trigonometry beyond the idea of an angle',
    ],
    keyConcepts: [
      {
        heading: 'The first law is about a shape',
        body: `An ellipse is the set of points whose distances to two fixed foci sum to a constant.
          The semi-major axis a is half the long diameter; the eccentricity e places the foci at a
          distance a·e either side of the center. The star sits at one focus and the other focus is
          empty. Worth stressing: Solar System orbits are nearly circular (Earth e = 0.017), so the
          textbook picture of a squashed ellipse is a teaching exaggeration.`,
      },
      {
        heading: 'The second law is angular momentum',
        body: `Equal areas in equal times is conservation of angular momentum in disguise. Gravity
          is a central force, acting along the line joining the two bodies, so it exerts no torque
          about the star and L = m·v·r·sin(θ) cannot change. When r falls, v must rise. This is the
          single most useful reframing in the lesson, and it is what step 12 asks for in writing.`,
      },
      {
        heading: 'The third law, and what Newton added',
        body: `Kepler found P² ∝ a³ empirically. Newton showed the constant is not universal:
          P² = 4π²a³ / G(M + m). In years, AU and solar masses that reduces to a³ = P²(M + m), so
          for the Solar System the constant is 1 only because the Sun is one solar mass. Around
          TRAPPIST-1 it is not 1, and that is precisely what makes the relation a way to measure
          mass rather than a coincidence.`,
      },
    ],
    flow: [
      {
        steps: '1–6',
        text: 'Tycho’s data and Kepler’s problem, then the anatomy of an ellipse with an eccentricity slider. Ends with the empty second focus.',
      },
      {
        steps: '7–12',
        text: 'The second law. Students measure both orbits, watch the equal-area wedges, then measure speed at periapsis and apoapsis and write down why it changes.',
      },
      {
        steps: '13–17',
        text: 'The third law. Four planets are tabulated from the live Solar System, plotted automatically, and the constant is worked out and then used to predict a period.',
      },
      {
        steps: '18–22',
        text: 'Newton’s correction. Students weigh TRAPPIST-1 from one planet’s orbit, then weigh a second star, and identify where Kepler’s version breaks.',
      },
      { steps: '23', text: 'Synthesis.' },
    ],
    features: [
      {
        name: 'Eccentricity slider (step 5)',
        text: 'Drags the foci apart while holding a fixed. Students who move it to 0.9 and back understand the first law faster than any diagram achieves.',
      },
      {
        name: 'Equal-area wedges (step 10)',
        text: 'A slice-count slider redraws the sweep with more or fewer wedges. The point is that the areas stay equal however finely you slice.',
      },
      {
        name: '"Use selected object" (steps 7, 14)',
        text: 'Clicking a body then pressing the import button fills a measurement row from the live simulation. This is the fastest place for a class to get stuck: students often do not notice they must select the object first.',
      },
      {
        name: 'Automatic plot (steps 14–15)',
        text: 'Points land on the graph as rows are filled. The log-log toggle turns the power law into a straight line, which is the moment the third law becomes visible.',
      },
      {
        name: 'Derived fields',
        text: 'Any field marked "worked out for you" is computed from the others. Students cannot lose the astronomy to an arithmetic slip, and the validator gets a number it can trust.',
      },
    ],
    misconceptions: [
      {
        claim: 'Planets move at a constant speed around their orbits.',
        response:
          'Steps 8–11 exist to break this. Have students commit to the prediction at step 8 before running step 9; the measured speed ratio at step 11 then settles it with their own numbers.',
      },
      {
        claim: 'The Sun sits at the center of the ellipse.',
        response:
          'It sits at a focus. On a near-circular orbit the two are almost the same point, which is exactly why this survives so long. The slider at step 5 separates them visibly.',
      },
      {
        claim: 'Something is at the other focus.',
        response:
          'Nothing is. Step 6 asks this directly. The empty focus is a geometric consequence of an inverse-square force, not a place.',
      },
      {
        claim: 'Orbits are strongly elliptical, as textbook figures show.',
        response:
          'Most are nearly circular. Give students Earth’s e = 0.017 and let them set the slider there.',
      },
      {
        claim: 'Kepler’s third law constant is the same everywhere.',
        response:
          'It depends on the mass being orbited, which is the whole content of steps 17–22. A class that misses this cannot use the law to weigh anything.',
      },
    ],
    teachingNotes: [
      'Steps 1–6 move quickly. If time is short this is the section to compress, not the third-law section.',
      'Step 7 is the first import. Demonstrate the click-then-import gesture once for the whole room; it saves ten minutes of individual questions.',
      'Step 12 is the only written answer in the lesson and the one worth grading by hand. Look for "angular momentum is conserved because gravity exerts no torque", not merely "it speeds up because it is closer".',
      'Step 14 accepts up to eight planets but two are enough for the plot and three make the trend convincing. Students who fill all eight will spend fifteen minutes on one screen.',
      'Step 15 shows the intermediate powers. If a student’s P²/a³ is not near 1, the usual cause is a period read in days rather than years.',
      'Step 20 is the payoff. Give the class a moment on it: they have just measured the mass of a star from two numbers, and most will not notice unless it is pointed out.',
    ],
    discussion: [
      'Kepler had Tycho’s data for years before he abandoned circles. What would it take for you to give up an assumption that had worked for two thousand years?',
      'The second focus of an orbit is empty. Does it mean anything physically, or is it purely geometry?',
      'Newton’s version needs the total mass M + m. When is it safe to ignore the planet’s mass, and when is it not?',
      'You weighed TRAPPIST-1 from one planet. What would you need to measure to weigh a star with no planets at all?',
    ],
    extensions: [
      'Have students look up a real transiting planet, find its period and semi-major axis, and weigh its host the same way. Comparing with the published stellar mass is a genuine check.',
      'Ask why the equal-area result implies angular momentum conservation, and where the sin(θ) in L = m·v·r·sin(θ) goes at periapsis and apoapsis.',
      'For students with calculus: derive P² = 4π²a³/GM for a circular orbit by setting gravity equal to the centripetal requirement.',
    ],
    modelNotes: `This investigation uses the Newtonian N-body model directly, and it is the right tool
      for it: the concepts being measured are exactly the ones Newtonian gravity describes. The
      simulation is two-dimensional, so every orbit here is coplanar and inclination never enters.
      Perturbations between planets are present when mutual gravity is on but are far too small over
      a lesson to affect any measurement. Precession from general relativity is not modeled and is
      not needed at this level.`,
    expectations: {
      7: 'The Circular Orbiter comes out at e near 0.02; the Eccentric Orbiter at roughly e = 0.6–0.7. The derived semi-major axis is the mean of the periapsis and apoapsis distances, and the validator warns if the two are entered the wrong way round.',
      11: 'Speed at periapsis should exceed speed at apoapsis by roughly the inverse ratio of the distances. The validator warns if the two are swapped, which is the common error.',
      14: 'Any two or more Solar System planets. P²/a³ should come out near 1 for every row when a is in AU and P in years; the validator flags a spread greater than 50%, which almost always means a period entered in days.',
      15: 'P² ÷ a³ = 1 within reading error. The star in this scenario is exactly one solar mass, so the constant is exactly 1 by construction, and the validator says so.',
      20: 'TRAPPIST-1 comes out at 0.0898 solar masses. The validator accepts within 0.008 and names the published value when a student lands on it.',
    },
  },

  'transit-photometry': {
    topic: 'Exoplanets',
    difficulty: 'Introductory, longest of the set',
    placement:
      'In the exoplanets unit, after stars and stellar radii have been introduced. Works well as a two-session lab.',
    overview: `The full working chain of the transit method, on the first exoplanet ever caught
      crossing its star. Students measure a depth and turn it into a radius, discover that the naive
      answer is too large and correct it for limb darkening, time two transits to get a period and
      then an orbit, read a transmission spectrum, and finish by finding an unresolved companion
      star that had been making the planet look smaller than it is. That last section is the one
      instructors should not skip: it is real observational practice, it is the author’s own
      research area, and it teaches that a measurement is only as good as your knowledge of what
      else is in the aperture.`,
    priorKnowledge: [
      'That stars are distant suns and planets orbit them',
      'Area of a circle, and taking a square root',
      'Reading a graph of one quantity against another',
      'Helpful but not required: the idea of a stellar radius in solar units',
    ],
    keyConcepts: [
      {
        heading: 'Depth is an area ratio',
        body: `A planet blocks the fraction of the stellar disk it covers, so depth = (R_p/R_★)²
          and R_p/R_★ = √depth. Note what this does *not* involve: mass. Depth alone cannot tell
          you whether the object is a gas giant or a brown dwarf.`,
      },
      {
        heading: 'Limb darkening',
        body: `A star is brighter at the center of its disk than at the limb, because looking at
          the center you see deeper and hotter layers. A planet crossing the middle therefore blocks
          more than its share of the light and the dip is deeper than the area ratio alone predicts.
          Taking √depth without correcting overestimates the planet by several percent.`,
      },
      {
        heading: 'Transit probability',
        body: `A transit is only visible from directions within roughly R_★/a of the orbital plane,
          so the geometric probability is about R_★/a. For the Earth around the Sun that is about
          1 in 215. Transit surveys are therefore heavily biased toward short-period planets, which
          is the substance of the written answer at step 15.`,
      },
      {
        heading: 'Transmission spectroscopy',
        body: `An atmosphere is opaque at some wavelengths and transparent at others, so the planet
          presents a larger silhouette in an absorption band. Measuring depth as a function of color
          gives the composition. The effect is tiny, of order one part in ten thousand of the stellar
          flux, which is worth stating so students appreciate the instrumentation.`,
      },
      {
        heading: 'Dilution by an unresolved companion',
        body: `If a second star falls inside the photometric aperture, its light fills in the dip and
          the measured depth is shallower by a factor 1/(1 + f), where f is the companion’s flux
          ratio. The recovered radius is then too small by √(1 + f). Correcting this is why
          high-resolution imaging surveys of planet hosts exist.`,
      },
    ],
    flow: [
      {
        steps: '1–5',
        text: 'Why planets are found indirectly, the five main methods, and a first transit watched live on HD 209458.',
      },
      {
        steps: '6–10',
        text: 'Depth to radius. Students explore the depth–size relation, measure the real dip, discover the naive radius is too big, and correct it for limb darkening.',
      },
      {
        steps: '11–15',
        text: 'The shape of the dip, viewing geometry and transit probability, ending in a written answer about survey bias.',
      },
      {
        steps: '16–19',
        text: 'Timing. Two transits give a period; the period gives the orbit and an equilibrium temperature.',
      },
      {
        steps: '20–22',
        text: 'Transmission spectroscopy: the planet changes size with color.',
      },
      {
        steps: '23–28',
        text: 'False positives and dilution. A hidden companion is found, imaged, and corrected for, recovering the true planet radius.',
      },
      { steps: '29', text: 'Synthesis.' },
    ],
    features: [
      {
        name: 'Light curve panel',
        text: 'Opens automatically on the steps that need it. It records continuously and detects complete transits on its own; students do not have to catch one by hand.',
      },
      {
        name: 'Observer handle',
        text: 'Dragged on the simulation, or set with the angle slider. Because the simulation is two-dimensional every orbit is edge-on, so the angle changes which side you watch from, not whether a transit happens. Step 13 handles inclination in a dedicated panel instead.',
      },
      {
        name: 'Instrument panels',
        text: 'Five: depth–size, geometry, spectrum, dilution and resolve. The last two are ports of the author’s own research tools.',
      },
      {
        name: '"Use the measurement" buttons',
        text: 'Copy the detected depth, baseline and transit times straight into the measurement fields. Timing a fast transit by hand is not how the measurement is really made either.',
      },
    ],
    misconceptions: [
      {
        claim: 'A deeper transit means a more massive planet.',
        response:
          'Depth gives radius, not mass. A puffy hot Jupiter and a dense brown dwarf of forty times the mass can produce the same dip. Mass needs radial velocities.',
      },
      {
        claim: 'We see the planet in a transit.',
        response:
          'We see a change in the total light of the star. The planet is never resolved; everything is inferred from a number that drops by a percent.',
      },
      {
        claim:
          'Most stars must have transiting planets, since we have found so many.',
        response:
          'Only a small geometric fraction transit. Surveys observe hundreds of thousands of stars to find thousands of planets, and step 14 gets students to that number themselves.',
      },
      {
        claim: 'The bottom of a transit is flat.',
        response:
          'It is curved, because of limb darkening. Step 12 asks students to read the floor, and the curvature is the evidence that the star is not a uniform disk.',
      },
      {
        claim: 'A dip in brightness means a planet.',
        response:
          'Eclipsing binaries, background blends and stellar activity all produce dips. Steps 23–28 exist because a real survey spends much of its effort ruling these out.',
      },
    ],
    teachingNotes: [
      'This is the longest investigation in the library. Splitting at step 15 gives two clean sessions of roughly equal length.',
      'Step 8 needs a complete transit in the recording before the copy button has anything to offer. If a student presses it too early, tell them to let the simulation run one more dip.',
      'Step 10 is where students see that their first answer was wrong and why. Do not let them skip past it: "my first measurement was biased and here is the correction" is the most transferable thing in the lesson.',
      'Step 15 is a written answer and the best assessment item in the investigation. Two distinct biases are wanted, geometric and detection.',
      'Step 17 depends on the transit counter. Students who lose count should use the transit number the panel reports rather than counting dips by eye.',
      'Steps 24–26 change scenario to the blended binary. If a student’s numbers suddenly stop matching, check they have not stepped backward into the unblended system.',
    ],
    discussion: [
      'The transit method finds planets that happen to be lined up with us. What does the population of known planets look like as a result, and how would you correct for it?',
      'You measured a radius but not a mass. What else would you need to know whether this planet is rock or gas?',
      'A dip could be a planet, a small star or a background eclipsing binary. What observation would you make to tell them apart?',
      'Why is a transit around a small, cool star easier to detect than the same planet around a Sun-like star?',
    ],
    extensions: [
      'Pull a real light curve from the NASA Exoplanet Archive or a TESS quick-look product and measure a depth from it. The workflow is identical.',
      'Have students estimate how many stars a survey must watch to find one Earth analogue, using their transit-probability answer from step 14.',
      'Ask advanced students to derive the transit duration for a central transit and compare it with the durations the panel reports.',
    ],
    modelNotes: `Orbits are Newtonian and two-dimensional, which for a transit lesson is a feature
      rather than a limitation: every orbit is edge-on and every planet transits, so the light curve
      is always available. Inclination is therefore handled in a dedicated geometry panel rather than
      by the simulation. The light curve itself is an analytic model, not a radiative-transfer
      calculation: it uses a quadratic limb-darkening law with fixed coefficients, and treats the
      planet as an opaque disk. The transmission spectrum is illustrative. See ${MODEL_PAGE} for the
      full description.`,
    expectations: {
      8: 'Baseline near 1.000; depth about 1.8%. The naive radius ratio is then about 0.135, which is roughly ten percent larger than the true value, and the lesson goes on to explain why.',
      10: 'With the limb-darkening correction and a stellar radius of 1.155 solar radii, the recovered planet radius lands near 1.38 Jupiter radii, the published value for HD 209458 b.',
      17: 'Two successive transits are about 3.52 days apart. Students who miss a transit will get a multiple of that; the validator catches the doubled value and says so.',
      18: 'A 3.52-day period around a 1.148 solar mass star gives a semi-major axis near 0.047 AU and an equilibrium temperature of order 1400 K.',
      27: 'The blended depth is shallower than the clean one. Correcting for a companion half a magnitude fainter recovers a planet radius consistent with the unblended measurement.',
    },
  },

  'orbital-energy': {
    topic: 'Gravity and orbital energy',
    difficulty: 'Introductory, no calculus',
    placement:
      'After gravity has been introduced and before or alongside the discussion of escape velocity. Pairs naturally with a lecture on energy conservation.',
    overview: `Students fire a projectile from a tower at increasing speeds and find, by experiment,
      the line between coming back and leaving forever. The lesson then reframes what they found:
      it was never really about speed, it was about the sign of the total energy. The last third
      applies this to a real object, the interstellar visitor 1I/'Oumuamua, and asks students to
      decide from its measured energy whether it will return. The design deliberately delays the
      formula until after the experiment, and the escape-speed misconception at step 14 is the
      single most valuable screen in the investigation.`,
    priorKnowledge: [
      'That gravity pulls, and weakens with distance',
      'The idea of kinetic and potential energy, at least qualitatively',
      'Positive and negative numbers, and what a sign means',
      'No calculus required',
    ],
    keyConcepts: [
      {
        heading: 'Total energy decides everything',
        body: `E = ½mv² − GMm/r. If E < 0 the object is bound and cannot reach infinity; if E ≥ 0 it
          escapes. This one number, and specifically its sign, settles the question that speed alone
          cannot, because the answer depends on where you started as well as how fast you are going.`,
      },
      {
        heading: 'Escape speed is local',
        body: `v_esc = √(2GM/r) depends on r, so there is no single "escape velocity" for a body,
          only an escape speed at a given distance. Earth’s surface value is 11.2 km/s; from the
          top of a tall orbit it is much less. Students who learn escape velocity as one number for
          each planet have learned something that will mislead them.`,
      },
      {
        heading: 'Escaping does not switch gravity off',
        body: `An unbound object is decelerating the entire time it recedes. It never stops being
          pulled; it simply has enough energy that the pull can never bring it to rest. This is the
          misconception at step 14 and it is extremely common.`,
      },
      {
        heading: 'Energy and orbit shape',
        body: `E < 0 gives an ellipse, E = 0 a parabola, E > 0 a hyperbola. The three shapes at
          step 19 are the same physics as the sign of the number, drawn.`,
      },
    ],
    flow: [
      {
        steps: '1–7',
        text: 'The cannonball experiment. Students predict, fire at low and high speed, hunt for the dividing line, and identify what happens at it.',
      },
      {
        steps: '8–12',
        text: 'The reframing. Energy bars are introduced, the sign of the total is read, and students confirm it stays constant around a real orbit.',
      },
      {
        steps: '13–14',
        text: 'Escape speed, and the misconception that gravity stops.',
      },
      {
        steps: '15–19',
        text: 'What changes escape speed: mass, then starting distance. Ends with the three orbit shapes.',
      },
      {
        steps: '20–23',
        text: 'ʻOumuamua. Students check its energy themselves and decide in writing whether it will return.',
      },
    ],
    features: [
      {
        name: 'Launch panel (steps 3–9)',
        text: 'A speed slider and a fire button. The projectile is launched from a tower 320 km up, because a launch from the ground travels only a few degrees before hitting the surface and shows no arc at all.',
      },
      {
        name: 'Energy bars',
        text: 'Kinetic, potential and total, with the zero line marked. On the launch panel the numbers are deliberately not shown: the sign is the lesson, and simulation-unit energies labeled in joules would be worse than no number.',
      },
      {
        name: 'Escape comparison (steps 16–17)',
        text: 'Switches between bodies of different mass and between starting distances, so the two dependencies are separated.',
      },
      {
        name: 'Live energy panel (step 11)',
        text: 'Reads the running simulation rather than a model, so students see the total holding steady while kinetic and potential trade off.',
      },
    ],
    misconceptions: [
      {
        claim: 'Once something escapes, gravity stops acting on it.',
        response:
          'Step 14 targets this directly. Gravity acts forever; the object simply outruns it. Ask students what force is acting on ʻOumuamua right now.',
      },
      {
        claim: 'Escape velocity is a single number for a planet.',
        response:
          'It is a value at a distance. Steps 17–18 make students find that starting further out lowers it.',
      },
      {
        claim: 'You need to keep pushing to keep escaping.',
        response:
          'No thrust is involved anywhere in this lesson. A single impulse either was or was not enough, and nothing afterwards changes the answer.',
      },
      {
        claim:
          'Something in orbit is weightless because there is no gravity there.',
        response:
          'Gravity is what holds the orbit. This one does not appear in the lesson but reliably comes up in discussion; it is worth having the answer ready.',
      },
      {
        claim:
          'A hyperbolic orbit means the object was fired outward very hard.',
        response:
          'It means E > 0, which can happen at modest speed if you start far enough out. The shapes panel at step 19 separates the shape from the speed.',
      },
    ],
    teachingNotes: [
      'Insist on the predictions at steps 2 and 4 before anything is fired. Students who watch first remember having known the answer all along, and the lesson loses its point.',
      'Step 6 is the discovery moment. Give it time; students should be allowed to bracket the dividing line themselves rather than being told the number.',
      'Step 12 asks what stays put as the object moves. If a class struggles, pause the simulation at two very different points and compare the three bars.',
      'Step 14 is worth doing aloud as a class. It is the misconception most likely to survive the lesson if it is only read silently.',
      'Steps 20–22 change scenario to ʻOumuamua. The measured total energy is positive and that is the whole answer; students should quote the sign, not a speed.',
    ],
    discussion: [
      'If you throw a ball upward it comes back. If you throw it hard enough it does not. Is there a speed at which it hovers?',
      'Voyager 1 is leaving the Solar System. Is the Sun still pulling on it? What is happening to its speed?',
      'ʻOumuamua came from another star. What does its energy tell you about where it has been and where it is going?',
      'Why is it easier to launch a probe out of the Solar System from Earth orbit than from the Earth’s surface?',
    ],
    extensions: [
      'Compute escape speed from the surface of the Moon, Mars and Jupiter and compare with the values the panel gives.',
      'Ask why a gravitational slingshot can raise a spacecraft’s energy without any fuel, and where that energy comes from.',
      'Have students look up 2I/Borisov and compare its eccentricity with ʻOumuamua’s.',
    ],
    modelNotes: `Newtonian energy throughout, in two dimensions. The launch panel integrates its own
      trajectory with an adaptive step so that a highly eccentric path does not drift, and the energy
      it reports is conserved to a few thousandths of a percent of the well depth. The ʻOumuamua
      scenario uses the object’s measured orbit; the simulation reproduces its hyperbolic path but
      does not model the non-gravitational acceleration seen in the real object.`,
    expectations: {
      3: 'A low launch speed gives a suborbital arc that returns to the surface. Total energy is clearly negative.',
      5: 'A high launch speed gives a path that leaves and does not return. Total energy is at or above zero.',
      6: 'The dividing line is where the total energy bar reaches zero. Students should be able to bracket it within a small range of the slider.',
      9: 'The kinetic and potential bars change continuously; the total does not. This is the observation the next question depends on.',
      21: 'ʻOumuamua’s total energy is positive. The eccentricity is above 1 and the path is hyperbolic.',
    },
  },

  'weighing-stars': {
    topic: 'Stars and binary systems',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the stars unit, after Kepler’s laws. Assumes the third law has been met but re-teaches what it needs.',
    overview: `How astronomers know what stars weigh. Students watch a binary pair, discover that both
      stars move, find the balance point, learn that the heavier star sits closer to it, and then
      combine an orbit size with a period to weigh a pair whose masses are hidden from them. They
      finish by splitting that total between the two stars and checking the method against Sirius,
      using the real observations. The lesson is written for students who are uncomfortable with
      algebra: every number is chosen so the arithmetic lands on whole numbers, and every symbol
      arrives only after the thing it stands for has been seen.`,
    priorKnowledge: [
      'That stars orbit each other in pairs',
      'Multiplying and dividing on a calculator',
      'Kepler’s third law is helpful but is re-taught in the lesson',
      'No algebra beyond substituting numbers into a stated relation',
    ],
    keyConcepts: [
      {
        heading: 'Both stars move',
        body: `Neither star orbits the other. Both orbit the barycenter, the balance point of the
          pair, which is why the two are always on opposite sides of it. The Sun does this too, in
          response to Jupiter; it is not a special property of equal-mass binaries.`,
      },
      {
        heading: 'The barycenter locates the mass ratio',
        body: `M_A·r_A = M_B·r_B, exactly as for a see-saw. The heavier star sits closer in and
          traces the smaller circle. Measuring the two distances therefore gives the ratio of the
          masses without knowing either one.`,
      },
      {
        heading: 'Size and period give the total',
        body: `In AU, years and solar masses, a³ = P²(M_A + M_B) with no constants to carry. The a in
          that relation is the semi-major axis of the *relative* orbit, the star-to-star separation,
          not one star’s distance from the barycenter. This is the single most common error in
          the topic and the lesson flags it explicitly.`,
      },
      {
        heading: 'Ratio plus total gives both masses',
        body: `The total comes from the orbit; the ratio comes from the balance point; together they
          determine each mass separately. This is how essentially every stellar mass in the
          literature was originally measured.`,
      },
    ],
    flow: [
      {
        steps: '1–7',
        text: 'Both stars move, and there is a fixed point between them. Ends with the barycenter of an equal-mass pair.',
      },
      {
        steps: '8–14',
        text: 'Unequal masses. The balance point shifts toward the heavier star; the see-saw makes the mass ratio visible and then quantitative.',
      },
      {
        steps: '15–19',
        text: 'Kepler’s third law and Newton’s correction, then a side-by-side comparison showing that the heavier pair orbits faster at the same separation.',
      },
      {
        steps: '20–26',
        text: 'The central measurement. Students practise on a known pair, then measure a mystery binary’s separation and period with a stopwatch and weigh it.',
      },
      {
        steps: '27–30',
        text: 'Splitting the total between the two stars using the balance point, and the reveal.',
      },
      {
        steps: '31–35',
        text: 'Sirius, measured from real observations, then a star with a planet, then one worked independently.',
      },
    ],
    features: [
      {
        name: 'Binary panel',
        text: 'Appears in several modes: plain, with the barycenter marked, with mass sliders, with AU rings for reading distances, with a stopwatch, and as a star-plus-planet with a magnified inset.',
      },
      {
        name: 'Stopwatch (steps 24–25)',
        text: 'Mark and Stop time one lap. The orbits are computed analytically rather than integrated, so a lap reads exactly 4.00 years and the arithmetic on the following screen lands cleanly.',
      },
      {
        name: 'AU rings (step 23)',
        text: 'Concentric rings at whole astronomical units, so a separation is read off rather than estimated. Students are told not to judge distances from pixels and this is how that promise is kept.',
      },
      {
        name: 'See-saw panel (steps 11–12, 29)',
        text: 'Turns the mass ratio into a picture, and on the weighing step into countable mass blocks.',
      },
      {
        name: 'Sirius panel (step 31)',
        text: 'Plots real observations five years apart; sliding from 1900 to 2000 draws the orbit. Its 50.1-year period and 19.8 AU orbit give 3.09 solar masses against the accepted 3.06.',
      },
    ],
    misconceptions: [
      {
        claim: 'The smaller star orbits the bigger one, which stays still.',
        response:
          'Steps 3–5 are built to break this. Every diagram students have seen nails the Sun to the center of the page.',
      },
      {
        claim: 'The barycenter is always midway between the two stars.',
        response:
          'Only for equal masses. Step 8 asks for the prediction before the sliders move.',
      },
      {
        claim: 'The heavier star moves faster because it has more force on it.',
        response:
          'It moves more slowly, on a smaller circle, in the same period. The forces on the two are equal and opposite.',
      },
      {
        claim: 'a is one star’s distance from the barycenter.',
        response:
          'It is the full star-to-star separation. This is the error most likely to produce a wrong mass, and the validator at step 25 catches it with its own message.',
      },
      {
        claim: 'You need to know a star’s brightness or size to get its mass.',
        response:
          'You need an orbit. Brightness–mass relations exist but they are calibrated against binaries measured exactly this way.',
      },
    ],
    teachingNotes: [
      'The lesson is deliberately gentle. A class comfortable with algebra can move through steps 1–14 quickly, but do not skip step 8: the prediction is what makes the balance-point rule stick.',
      'Steps 23–25 are the heart of the lesson. Budget time for them. The stopwatch needs one full lap and students often stop it early.',
      'At step 25 the intended answer is a = 4 AU, P = 4 years, giving 4 solar masses. A student who uses one star’s ring distance instead of the separation gets 0.5 and the validator says specifically what went wrong.',
      'Step 29 splits 4 into 3 and 1. Students who get the ratio right but the sum wrong, or vice versa, get different feedback; both are worth a moment at the board.',
      'Step 31 is real data. Point out that the residual difference from the accepted value is measurement error in a century-old observation, not a flaw in the method.',
    ],
    discussion: [
      'About half the stars you can see have a companion. Why does that make binaries such a useful population for astronomy?',
      'The Sun wobbles because of Jupiter. If an alien astronomer watched the Sun for fifty years, what could they work out?',
      'You measured a total mass and a ratio. Which of the two is easier to measure for a real binary, and why?',
      'What would you need to observe to weigh a star that has no companion at all?',
    ],
    extensions: [
      'Look up Alpha Centauri A and B, find the published separation and period, and weigh the pair.',
      'Ask why the mass–luminosity relation is useful and what it had to be calibrated against.',
      'For students ready for it: why does the relative orbit have a semi-major axis equal to the sum of the two individual orbits?',
    ],
    modelNotes: `The binary panels are analytic rather than integrated: circular two-body orbits
      evaluated in closed form. That is deliberate. The stopwatch must read exactly 4.00 years for
      the arithmetic on the next screen to work, and an integrator that lost a percent per lap would
      quietly break the measurement the whole lesson builds toward. The Sirius panel solves Kepler’s
      equation so the plotted epochs are correctly spaced in time. The main simulation behind the
      lesson is the usual Newtonian N-body model in two dimensions.`,
    expectations: {
      20: 'Practice pair: a = 2 AU, P = 2 years, giving a total of 2 solar masses.',
      23: 'The mystery pair is 4 AU apart, read from the AU rings. Star A sits on the 1 AU ring, Star B on the 3 AU ring.',
      24: 'One lap takes 4.00 years on the stopwatch.',
      25: 'a³ = 64, P² = 16, so the total is 4 solar masses. A student who uses one star’s barycenter distance instead of the separation gets 0.5 and is told so.',
      29: 'The 3:1 distance ratio splits 4 solar masses into 3 and 1. Star A, on the smaller circle, is the heavier one.',
      33: 'The independent pair is a = 3 AU, P = 3 years, giving 3 solar masses.',
    },
  },

  'black-holes': {
    topic: 'Black holes and compact objects',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the stellar-remnants or galaxies unit. Needs no earlier investigation, though the escape-speed section lands better after Bound, Unbound and Escape.',
    overview: `Students change one property of a black hole, its mass, and discover how four unrelated
      properties respond: horizon size, average density, Hawking temperature and evaporation lifetime.
      Two of the four go the opposite way to almost everyone’s expectation, and the lesson is built
      so that students commit to a prediction before each one. The escape-speed section is handled
      carefully on purpose: the Newtonian argument gives the right radius for the wrong reason, and
      saying so is part of the lesson rather than a footnote.`,
    priorKnowledge: [
      'That stars can collapse at the end of their lives',
      'Reading a straight-line graph',
      'Nothing else. Powers of ten are taught in the lesson as "counting zeros"',
    ],
    keyConcepts: [
      {
        heading: 'The event horizon is a boundary, not a surface',
        body: `R_s = 2GM/c² marks where signals can no longer reach the outside universe. There is
          nothing there to touch, and an astronaut crossing the horizon of a large black hole would
          notice nothing at that moment. Roughly 3 km of radius per solar mass.`,
      },
      {
        heading: 'Radius is proportional to mass',
        body: `R_s ∝ M, a straight line through the origin. Double the mass and the horizon radius
          doubles. This is the only one of the four relations that behaves the way students expect.`,
      },
      {
        heading: 'Average density falls with mass',
        body: `Mass divided by the volume of a sphere of radius R_s goes as 1/M². Radius grows in
          step with mass, so volume grows three times as fast in powers of ten, and the density loses
          the difference. A 10 M☉ hole is at roughly nuclear density; one of 1.4×10⁸ M☉ is less dense
          than water. Be careful with wording: this is a comparison quantity, not a claim about the
          interior.`,
      },
      {
        heading: 'Temperature falls, lifetime rises',
        body: `T_H ∝ 1/M and evaporation lifetime ∝ M³. A one-solar-mass black hole is at 6×10⁻⁸ K
          and lasts about 10⁶⁷ years. Every astrophysical black hole is far colder than the cosmic
          microwave background, so all of them are currently absorbing more than they emit and none
          is evaporating yet.`,
      },
      {
        heading: 'Mass classes',
        body: `Stellar-mass, a few to tens of solar masses; intermediate, hundreds to hundreds of
          thousands; supermassive, millions to billions. The boundaries are conventions, not physics.`,
      },
    ],
    flow: [
      {
        steps: '1–4',
        text: 'What a black hole is not, what "size" could mean, and the event horizon at a fixed scale against familiar lengths.',
      },
      {
        steps: '5–9',
        text: 'The mass experiment. Students record three trials, watch the points land on a straight line through the origin, and only then meet R_s ∝ M.',
      },
      {
        steps: '10–13',
        text: 'Squeezing the Sun until the escape speed reaches c, followed by the careful statement that this is the right answer for the wrong reason.',
      },
      {
        steps: '14–17',
        text: 'The density surprise: prediction, ladder, then the zero-counting explanation.',
      },
      {
        steps: '18–21',
        text: 'Hawking temperature, introduced cautiously, with a logarithmic thermometer.',
      },
      {
        steps: '22–24',
        text: 'Evaporation lifetime on a bar chart that counts zeros rather than years.',
      },
      {
        steps: '25–29',
        text: 'Mass classes, a four-object lineup at clearly labeled separate scales, and the reveal that the mystery object is Sagittarius A*.',
      },
    ],
    features: [
      {
        name: 'Horizon panel (steps 3–4)',
        text: 'Holds the pixels-per-kilometre fixed across the whole slider range, so a bigger picture really is a bigger black hole. Auto-fitting would keep the disk the same size and hide the point.',
      },
      {
        name: 'Trial recorder (steps 6–8)',
        text: 'Record and Clear buttons build a table and plot it. Trials persist across steps 6–8 and are cleared on arrival from elsewhere.',
      },
      {
        name: 'Squeeze panel (steps 11–12)',
        text: 'Compresses one solar mass from the Sun’s radius to 2.95 km with a gauge marked at the speed of light. Presets jump to each size.',
      },
      {
        name: 'Ladders and thermometer',
        text: 'Density and temperature use logarithmic scales with familiar benchmarks marked. Each says on the panel that every small tick is a factor of ten.',
      },
      {
        name: 'Lineup (steps 25–29)',
        text: 'Four black holes, each drawn at its own scale with its own scale bar and a comparison object. They cannot share one scale: the largest is half a million times wider than the smallest.',
      },
    ],
    misconceptions: [
      {
        claim: 'Black holes suck in everything nearby.',
        response:
          'Step 1 opens with four objects in stable orbits precisely to kill this. Gravity far from a black hole is the same gravity as anywhere else; swap the Sun for a black hole of equal mass and Earth’s orbit is unchanged.',
      },
      {
        claim: 'The event horizon is a solid surface.',
        response:
          'It is a causal boundary. Step 13 asks this directly. Nothing is there to hit.',
      },
      {
        claim: 'Bigger black holes must be denser.',
        response:
          'Average density on this measure goes as 1/M². Step 14 collects the prediction before the ladder is shown, and most students predict wrongly, which is the point.',
      },
      {
        claim: 'Bigger black holes are hotter.',
        response:
          'T ∝ 1/M. The largest black holes are the coldest objects in the universe. Step 18 takes the prediction first.',
      },
      {
        claim: 'A black hole is a hole in space.',
        response:
          'It is mass in a small volume. The word "hole" does a lot of damage here.',
      },
      {
        claim: 'Black holes are evaporating away now.',
        response:
          'All known black holes are colder than the microwave background around them, so they are absorbing more than they radiate. Evaporation cannot begin until the universe is far colder.',
      },
    ],
    teachingNotes: [
      'Steps 5, 10, 14, 18 and 22 are predictions. The lesson is built on them; a class that clicks through them without committing loses most of the value.',
      'Step 6 asks for three trials at 5, 10 and 20 solar masses. Students who record only one cannot answer step 8, and the panel says so if the graph is empty.',
      'Step 13 is the most important screen scientifically. The Newtonian escape-speed argument gives the correct radius by coincidence; the real reason is the geometry of spacetime. Do not let a class leave believing light is a ball thrown too slowly.',
      'Step 17 is the only numeric answer in the lesson. The panel shows the arithmetic 3 + 3 + 3 = 9 directly; students who type 3 are reading the mass row rather than the volume row.',
      'The lineup at steps 25–29 changes scale between panels. Point at the scale bar explicitly; it is the one place students could be misled about size.',
      'The object inspector is left unlocked in this lesson. Clicking the black hole shows the same numbers the lesson quotes, computed by the simulation, which is worth demonstrating once.',
    ],
    discussion: [
      'If the Sun were replaced by a black hole of the same mass, what would change for the Earth?',
      'A supermassive black hole can be less dense than water. Does that make it less dangerous to approach?',
      'Hawking radiation has never been observed. What would it take to detect it, and why is that so hard?',
      'The boundaries between stellar, intermediate and supermassive are conventions. Is there any physical reason for a gap between the classes?',
    ],
    extensions: [
      'Work out the mass a black hole would need for its average density to equal that of air, and compare with the largest known black holes.',
      'Look up the Event Horizon Telescope images of M87* and Sagittarius A* and compare the apparent sizes with the horizon radii from the lesson.',
      'Ask why a Kerr black hole differs from the Schwarzschild case used here, and which of the lesson’s trends survive.',
    ],
    modelNotes: `Nothing in this investigation is dynamically simulated relativity. The black hole in
      the scenario participates in the ordinary Newtonian N-body simulation like any other mass; the
      horizon radius, average density, Hawking temperature and evaporation lifetime are analytic
      Schwarzschild expressions evaluated for display. Every result assumes a non-rotating, uncharged
      black hole, which the lesson states. Real astrophysical black holes rotate, which changes the
      horizon geometry but none of the trends taught here. See ${MODEL_PAGE} for the full statement.`,
    expectations: {
      6: 'Three trials at 5, 10 and 20 solar masses give 14.8, 29.5 and 59.1 km. The points fall on a straight line through the origin.',
      11: 'Squeezing one solar mass: the Sun today gives 0.2% of light speed, Earth-sized 2.2%, 30 km gives 31%, 6 km gives 70%, and 2.95 km gives exactly 100%.',
      15: 'The density marker moves down the ladder as mass rises. At 10 solar masses it sits near nuclear density; at a million it is ten powers of ten lower.',
      20: 'The thermometer level falls with mass. Sagittarius A* comes out at 1.4×10⁻¹⁴ K, far below the coldest temperature ever produced in a laboratory.',
      23: 'The lifetime bar for a 10 solar mass hole reaches 70 zeros against the universe’s 10.',
    },
  },

  'radial-velocity': {
    topic: 'Exoplanet detection and characterization',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'The third of the three exoplanet lessons, after Finding Planets by Their Shadows and before or after The Goldilocks Question. It closes the inference chain: Shadows measures a radius, this one measures a mass and combines the two into a density, and Goldilocks asks what that buys. It works standalone, but the payoff at steps 30-33 lands hardest for students who have done the transit lesson.',
    overview: `Students discover that a star and its planet both orbit their common center of
      mass, that the star's share of that motion is measurable through the Doppler shift of
      its spectral lines, and that the size of the wobble gives the planet's mass. They then
      meet the central limitation of the method, the M sin i degeneracy, and see why a
      transiting planet escapes it. Astrometry is introduced as the complementary method
      that works precisely where radial velocity fails. The lesson closes by combining the
      transit radius with the radial-velocity mass into a bulk density, placing the planet
      against the modeled habitable zone, and asking students to judge three candidate
      planets on evidence no single column can supply.`,
    priorKnowledge: [
      'That planets orbit stars, and that gravity acts between any two masses',
      'That light can be spread into a spectrum (the lesson explains absorption lines from scratch)',
      'Helpful but not required: Finding Planets by Their Shadows, for the transit radius reused at step 30',
      'Helpful but not required: Weighing the Stars, for the center-of-mass rule reused at step 4',
    ],
    keyConcepts: [
      {
        heading: 'Stellar reflex motion',
        body: 'A star and its planet orbit their common center of mass. Each body’s distance from that point is set by the other body’s share of the total mass, so a star a thousand times heavier than its planet traces an orbit a thousand times smaller. The star moves; it moves very little.',
      },
      {
        heading: 'Radial velocity and the Doppler shift',
        body: 'Only the component of the star’s velocity along the line of sight produces a Doppler shift. Absorption lines move to longer wavelengths as the star recedes (positive radial velocity) and shorter as it approaches (negative). Motion across the sky produces no shift at all.',
      },
      {
        heading: 'The semi-amplitude K',
        body: 'K is half the peak-to-peak range of the radial-velocity curve, not the whole range. It grows with planet mass and shrinks as the orbit is tilted away from edge-on. Confusing K with the full amplitude is the commonest factor-of-two error in the subject.',
      },
      {
        heading: 'The M sin i degeneracy',
        body: 'Radial velocity cannot separate planet mass from orbital inclination. What it reports is a minimum mass. A transit fixes the inclination near 90 degrees, which is what converts that lower limit into a measurement.',
      },
      {
        heading: 'Astrometry and complementarity',
        body: 'Astrometry measures the star’s position on the sky rather than its velocity toward us. The astrometric orbit does not shrink as a system tilts toward face-on; it changes shape from a line to a circle. Radial velocity dies face-on, astrometry does not, and that is why the two are described as complementary.',
      },
      {
        heading: 'Bulk density and its limits',
        body: 'Mass and radius together give a mean density, the first real constraint on composition. It constrains rather than determines: rock under a hydrogen envelope and a water-rich world can produce similar densities.',
      },
    ],
    flow: [
      {
        steps: '1-6',
        text: 'The planet from the transit lesson returns, with the history that it was found by its star’s wobble first. Students predict which body moves, then use the reflex-motion instrument to see both orbiting the barycenter and to discover that more planet mass means a bigger stellar orbit.',
      },
      {
        steps: '7-9',
        text: 'Absorption lines and the Doppler shift are introduced from scratch, with the restriction that only line-of-sight motion produces a shift. The rv-observer instrument connects the star’s position on its orbit to the curve that motion produces.',
      },
      {
        steps: '10-14',
        text: 'Students open the live Radial Velocity panel on the Exoplanet Characterization Lab scenario, watch a real curve build over two orbits, measure the period, and learn the definition of K before reading it off the panel.',
      },
      {
        steps: '15-17',
        text: 'A controlled experiment: hold everything fixed and change only planet mass. Students discover the linear relationship, then use it in reverse to weigh HD 209458 b from the K they measured.',
      },
      {
        steps: '18-21',
        text: 'The inclination problem. The same planet is tilted and the reported mass falls away as sin i. M sin i is named, and students reason out why a transiting planet escapes the ambiguity.',
      },
      {
        steps: '22-29',
        text: 'Astrometry as the complementary method. Students tilt a system from edge-on to face-on and watch the sky path open from a line into a circle while the radial-velocity signal dies, then explore how distance and orbit size govern detectability.',
      },
      {
        steps: '30-33',
        text: 'The payoff. Transit radius and radial-velocity mass are combined into a bulk density, and the characterization panel adds stellar flux and habitable-zone context from the same habitability module The Goldilocks Question uses.',
      },
      {
        steps: '34-37',
        text: 'Three candidate planets, designed so that no single measurement identifies the best one. A short-answer step asks what is still unknown, and the lesson closes on the idea that combination, not any one technique, is what characterization consists of.',
      },
    ],
    features: [
      {
        name: 'Exoplanet Characterization Lab scenario (steps 1, 3, 10, 14)',
        text: 'HD 209458 with the star free to move. The transit scenarios pin their star so the light curve stays centered; this one initializes both bodies in the center-of-mass frame with zero net momentum, so the wobble the instruments measure is the wobble the simulation is doing. The star circles a point 2.7e-5 AU away at 84 m/s.',
      },
      {
        name: 'Radial Velocity panel (steps 10-14)',
        text: 'A live instrument in the Tools list. It projects the observed star’s actual simulated velocity onto the shared line of sight and plots it against time, reporting K once a full cycle is recorded. Velocities are relative to the system barycenter so the curve sits around zero.',
      },
      {
        name: 'Astrometry panel (available from Tools)',
        text: 'Plots the star’s path on the sky about the barycenter, with the physical reflex orbit in AU and the angle it subtends shown separately. Not used by a lesson step, but worth demonstrating alongside step 24.',
      },
      {
        name: 'Shared observer control',
        text: 'Position angle and inclination live in one module and every observing panel mounts the same control. Changing inclination in one panel changes it everywhere, which is what makes the step-24 comparison honest.',
      },
      {
        name: 'reflex-motion instrument (steps 4, 6)',
        text: 'Star, planet and barycenter with the stellar orbit magnified by a labeled factor. The magnification is cosmetic and stated on the picture; the reported numbers are physical.',
      },
      {
        name: 'rv-observer instrument (step 9)',
        text: 'Orbit on the left with a line-of-sight arrow, curve on the right with the star’s current position marked. Direction is given in words as well as color.',
      },
      {
        name: 'rv-mass instrument (step 16)',
        text: 'K against planet mass with everything else held fixed. The straight line is the point.',
      },
      {
        name: 'rv-inclination instrument (steps 17, 19)',
        text: 'Two bars: true mass, and the mass radial velocity would report. Used both to weigh the planet at step 17 and to break the reported mass at step 19.',
      },
      {
        name: 'astrometry-signature instrument (steps 24, 28)',
        text: 'The sky path at any inclination, with sliders for planet mass, orbit size and distance. Distance changes the angle and not the orbit, which the readout shows explicitly.',
      },
      {
        name: 'method-comparison instrument (step 26)',
        text: 'Transit, radial velocity and astrometry side by side as one system tilts. The astrometry bar deliberately stays full: its amplitude does not vanish face-on.',
      },
      {
        name: 'planet-characterization instrument (steps 31, 34)',
        text: 'The inference chain as a table. Calls habitability.js directly for insolation and zone bounds, so its numbers are identical to The Goldilocks Question by construction rather than by coincidence.',
      },
    ],
    misconceptions: [
      {
        claim: 'The star does not really move; only the planet orbits.',
        response:
          'Collect this at step 3 before anyone runs anything. It is the single most common starting belief and the whole lesson depends on dislodging it. The reflex-motion instrument at step 4 shows both bodies on opposite sides of a fixed point; the magnification label is what stops the fix becoming a new misconception.',
      },
      {
        claim: 'Radial velocity measures the planet’s speed.',
        response:
          'It measures the star’s. The planet never enters the measurement directly, which is exactly why the method works on planets nobody can see. Worth restating at step 10 when the live panel opens.',
      },
      {
        claim: 'A Doppler shift makes the star visibly change color.',
        response:
          'At 84 m/s the shift is under a thousandth of a nanometre on a 500 nm line. The panel’s spectral-line strip is labeled "shift exaggerated for visibility" for this reason. If a student describes the star turning blue, the number is the correction.',
      },
      {
        claim: 'Zero radial velocity means the star has stopped.',
        response:
          'It means all of the star’s motion is across our view at that instant. Step 9 makes this visible; a student who misses it will misread the curve’s zero crossings as pauses.',
      },
      {
        claim: 'Radial velocity gives the planet’s true mass.',
        response:
          'It gives M sin i, a lower limit, unless something else fixes the inclination. Steps 18-21 are built entirely around this, and step 21 is where the transit connection pays off.',
      },
      {
        claim: 'A face-on system cannot be detected by any wobble method.',
        response:
          'Radial velocity fails; astrometry does not. The astrometric semi-major axis is unchanged face-on, and the projected path is a circle rather than a line. Step 26 asserts this deliberately because the opposite is widely and wrongly assumed.',
      },
      {
        claim: 'Astrometry photographs the planet.',
        response:
          'It measures the star’s position. The planet stays invisible throughout, which is stated at step 23 and worth repeating if anyone describes the sky plot as an image of the planet.',
      },
      {
        claim: 'Density tells you exactly what a planet is made of.',
        response:
          'It constrains composition, it does not determine it. Rock under a hydrogen envelope and a water-rich world can share a density. The lesson’s language is "consistent with" throughout and student answers should be held to the same standard.',
      },
      {
        claim: 'A planet in the habitable zone is habitable, or inhabited.',
        response:
          'The zone is a statement about the orbit under assumed climate conditions, not a measurement of the planet. Step 36 asks students to name what is still unknown for exactly this reason; answers naming atmosphere, rotation or albedo are the ones to reward.',
      },
    ],
    teachingNotes: [
      'Collect the step 3 prediction out loud before anyone runs the simulation. "Only the planet moves" is the majority answer in most classes and the rest of the lesson is built on overturning it.',
      'At step 10 the live panel takes about thirteen seconds per orbit. Tell students to let it run for two full cycles before moving on; a partial curve gives a K that is too small, and the panel says "so far" while that is true.',
      'Step 14 asks students to read K off the panel rather than compute it. The panel reports the semi-amplitude, not the full range, which is the definition step 13 just gave them. If a student writes 168 rather than 84 they have taken the peak-to-peak value.',
      'Step 17 is the quantitative centerpiece. Students match a mass to their measured K rather than rearranging a formula with G in SI units; the arithmetic is the software’s job and the inference is theirs.',
      'Steps 18-21 work best if you pause between 19 and 20 and ask what a survey would report for a planet it can only see at 30 degrees. The answer, "half its real mass", is the whole of M sin i in one sentence.',
      'Step 26 is the step to slow down on. The astrometry bar staying full while the radial-velocity bar shrinks is counterintuitive and is the single most valuable idea in the second half.',
      'For step 35, resist letting students answer from one column. Planet B is in the zone and Planet C is rocky; only A is both, and the point of the exercise is that neither fact alone was sufficient.',
      'Step 36 is short-answer and deliberately open. Any property beyond the reach of the measurements, tied to liquid water, earns full credit. It is a good exit ticket.',
    ],
    discussion: [
      'The first exoplanet surveys found mostly hot Jupiters. What does that tell us about planetary systems, and what does it tell us only about the surveys?',
      'Radial velocity gives a minimum mass. Is a minimum mass a useful scientific result, or is it a failure? What can you do with a lower limit?',
      'If a planet transits, we know the orbit is nearly edge-on. What fraction of planetary systems would you expect to be oriented that way, and what does that imply about how many planets transit surveys miss?',
      'Astrometry favours wide orbits and nearby stars; transits favour close-in planets. If each method is biased, how does the field arrive at a picture of what planetary systems are actually like?',
      'A planet with Earth’s density in the habitable zone of its star: what would you want to measure next, and with what instrument?',
      'HD 209458 b is a hot Jupiter. Nothing about it resembles Earth. Why has so much effort gone into characterizing it?',
    ],
    extensions: [
      'Have students look up a planet from the NASA Exoplanet Archive with both a measured mass and radius, compute its bulk density, and compare it with the values in this lesson.',
      'Ask students to estimate the radial-velocity semi-amplitude Earth induces on the Sun (about 0.09 m/s) and discuss what that implies about detecting Earth analogues.',
      'Open the Astrometry panel alongside the Radial Velocity panel on the characterization scenario and demonstrate the inclination sweep live, rather than through the analytical widget.',
      'For a mathematically prepared class, derive the semi-amplitude relation from the center-of-mass condition and a circular orbit. The lesson deliberately does not, but the derivation is short.',
    ],
    modelNotes: `The simulation integrates gravity in a plane. The observer geometry is a genuine
      three-dimensional projection over that planar model: a line-of-sight direction is built
      analytically from a position angle and an inclination, and positions and velocities are
      projected onto it. This is what allows inclination to affect the transit, the
      radial-velocity amplitude and the astrometric shape consistently without a
      three-dimensional N-body rewrite. The dynamics remain planar; only the viewing geometry
      is three-dimensional.
      \n\nThe Exoplanet Characterization Lab initializes HD 209458 and its planet in the
      center-of-mass frame from published parameters. Measured against the analytic
      semi-amplitude, the simulated star's wobble reproduces K to within about 0.5 per cent at
      the scenario's own speed. The radial-velocity panel plots velocity relative to the
      measured system barycenter, which removes the small residual drift that integration
      error leaves behind.
      \n\nThe semi-amplitude, reflex orbit, astrometric signature and bulk density all come
      from js/exoplanetObservables.js, and the insolation and habitable-zone boundaries from
      js/habitability.js, the same module The Goldilocks Question uses. The habitable-zone
      prescription is Kopparapu et al. (2013) with the 2014 erratum, valid for stellar
      effective temperatures between 2600 and 7200 K.
      \n\nSystem parameters for HD 209458 are stored in js/data/exoplanetSystems.js and shared
      by the scenario, the widgets and the tests, so a change in one place cannot leave the
      lesson disagreeing with the instrument.`,
    expectations: {
      12: 'The curve repeats every 3.52 days. Students reading between successive peaks typically land between 3.3 and 3.8; anything in that range is a good measurement off a live plot. The published period is 3.5247 days.',
      14: 'The panel reports K near 84 m/s once a full cycle is recorded, which matches the published semi-amplitude for HD 209458 b. A student answer near 168 has taken the full peak-to-peak range rather than the semi-amplitude and should be sent back to step 13.',
      16: 'The rv-mass instrument holds star, period and viewing angle fixed, so K is strictly proportional to planet mass: an Earth gives 0.38 m/s, a Neptune 6.6, HD 209458 b 84, and a five-Jupiter planet 609. At step 17 students match this instrument to their measured K and should land near 0.69 Jupiter masses, the published value; the accepted range is 0.61 to 0.77, wide enough to absorb a slightly misread K.',
      31: 'The characterization panel reports HD 209458 b at 1.38 Jupiter radii, 0.69 Jupiter masses and a bulk density of 0.33 g/cm³: about a third the density of water and a sixteenth of Earth’s. It receives roughly 785 times Earth’s starlight and sits far inside the inner edge of the modeled zone. At step 32 the accepted density range is 0.25 to 0.41; a student answering near 5.5 has read Earth’s density from the comparison text rather than the planet’s.',
    },
  },
  'retrograde-motion': {
    topic: 'Reference frames, apparent motion, and the Copernican argument',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'Any time after circular orbits have been introduced; it pairs naturally with Kepler’s Laws and works well immediately after it, since students arrive already able to read a period off the inspector. It also stands alone as a single-session lesson, and it is the one lesson in the set that is as much history and philosophy of science as it is physics. If you teach a unit on the Copernican revolution, this is the lesson that lets students perform the observation the revolution was about rather than being told it.',
    overview: `Students meet retrograde motion as an observation first, stated in terms of the one
      quantity a pre-telescopic astronomer could actually measure: the direction to a planet against
      the fixed stars. They measure the orbital periods of Earth and Mars, convert them to angular
      speeds, and compute the 780-day synodic period twice by two different routes. They then predict
      what Mars's path will look like from Earth, switch the reference frame, and watch the loop draw
      itself out of positions that never reversed. The rest of the lesson is about what that does and
      does not establish: they locate the reversal at opposition, find that Mars is brightest exactly
      when it is moving backwards, discover that every outer planet's Ptolemaic epicycle has a period
      of one year, and are then asked directly whether the loop proves heliocentrism. It does not, and
      the lesson closes on what did: the fictitious forces a geocentric frame requires, and the
      stellar parallax Tycho looked for with an instrument eighty times too coarse to find it.`,
    priorKnowledge: [
      'That planets orbit the Sun, and that an orbit has a period',
      'Reading a number off a live readout and writing it down',
      'Dividing and subtracting reciprocals on a calculator; the arithmetic at steps 9 and 10 is two divisions',
      'Helpful but not required: Kepler’s Laws, for the period-distance relation students meet again at step 6',
    ],
    keyConcepts: [
      {
        heading: 'Retrograde motion as an observation',
        body: 'Over a few weeks an outer planet stops its steady eastward drift against the stars, reverses, and then resumes. It is a statement about a direction changing the wrong way, not about a path anyone watched being traced. Naked-eye astronomers had no distances at all, so direction against the fixed stars was the entire dataset, and stating the phenomenon that way keeps the lesson honest about what was being explained.',
      },
      {
        heading: 'The synodic period',
        body: 'The interval between successive alignments of Sun, Earth and planet, given by 1/S = 1/P1 - 1/P2 with P1 the shorter period. It counts laps gained rather than laps run, which is why it is longer than either planet’s year. For Earth and Mars it is 780 days. The lesson has students reach the same number twice, once from reciprocals and once from a rate of degrees gained per day, because the formula is easy to apply and hard to feel.',
      },
      {
        heading: 'Reference frames',
        body: 'A position is a relationship between a body and something else, and that something else is the frame. Changing frames adds no force and moves no body; it changes what every position is measured against, and therefore changes the path. Gravitas re-expresses trails by subtracting where the origin body was at the moment each point was recorded, which is why the shape of the path changes rather than the drawing merely sliding across the screen.',
      },
      {
        heading: 'Why the loop happens at opposition',
        body: 'Earth is on the smaller, faster orbit. Around opposition it overtakes Mars on the inside, and the direction from Earth to Mars swings backwards against the distant stars for about ten weeks. This is the motorway-overtaking geometry, and it means the reversal and the closest approach are the same event: Mars is at its brightest precisely while it appears to move backwards.',
      },
      {
        heading: 'The one-year epicycle',
        body: 'In Ptolemy’s model each of Mars, Jupiter and Saturn rides an epicycle, and every one of those epicycles takes exactly one year. Ptolemy knew this and recorded it; his model gives no reason for it. In the heliocentric picture the epicycle is not the planet’s motion at all but Earth’s, reflected onto the planet’s apparent path, so the shared period is forced. Three unrelated planets sharing one number is the specific coincidence Copernicus pointed at.',
      },
      {
        heading: 'What the loop does not establish',
        body: 'Both the geocentric and the heliocentric descriptions reproduce the observation, which is exactly why the argument lasted fourteen centuries. The loop establishes that the observer is moving relative to Mars; it does not by itself say what is at the center. What settles it is that only in the Sun’s frame can every force be traced to a mass, and that the heliocentric picture predicted stellar parallax, measured in 1838.',
      },
    ],
    flow: [
      {
        steps: '1-4',
        text: 'The phenomenon is stated as history and then as a measurement: five wandering stars, and the fact that the only measurable quantity was a direction. Students then watch the system from outside and confirm for themselves that neither planet ever reverses. Everything that follows is about reconciling those two screens.',
      },
      {
        steps: '5-7',
        text: 'The two orbits are measured off the inspector and converted to angular speeds. The multiple-choice step in the middle is there to make students say out loud that the inner planet is the faster one, which is the entire mechanism and is easy to skate past.',
      },
      {
        steps: '8-10',
        text: 'The synodic period, computed twice. Step 9 uses the reciprocal formula, step 10 the rate of degrees gained. Students who get two different answers have usually put the longer period first in the subtraction.',
      },
      {
        steps: '11-13',
        text: 'A prediction is committed to before anything changes, then reference frames are introduced, then a screen explaining what the trails are actually doing. The last of these matters more than it looks: students who think the picture is being redrawn artistically will not accept the loop as evidence.',
      },
      {
        steps: '14-17',
        text: 'The frame is switched and the loop appears. Students then put numbers on it: the direction from Earth running backwards, and the distance to Mars reaching a clear minimum and maximum. The direction readout is the observable the whole lesson rests on.',
      },
      {
        steps: '18-21',
        text: 'The geometry is pinned down. Brightness and reversal are shown to be the same event, the reversal is located at opposition, the overtaking analogy is given, and students write the explanation in their own words. This short-answer step is the assessment center of the lesson.',
      },
      {
        steps: '22-24',
        text: 'Ptolemy. The epicycle is presented as a device that worked rather than as a mistake, and students find the one-year period that a geocentric model has to accept as a coincidence, then count the twenty separate devices the five planets needed.',
      },
      {
        steps: '25-27',
        text: 'The Sun is examined in Earth’s frame, where it traces a clean annual circle with no loop, and students are then asked directly whether the loop proves heliocentrism. The intended answer is that it does not, and this is the step most likely to generate discussion.',
      },
      {
        steps: '28-30',
        text: 'What actually settles the question: the fictitious forces a geocentric frame requires, and stellar parallax. Tycho’s null result is treated as sound reasoning with an inadequate instrument, which gives a transferable lesson about what a non-detection constrains.',
      },
      {
        steps: '31-33',
        text: 'A final measurement of the length of the retrograde episode, a prediction about Jupiter that students can check against the formula, and a closing screen that names the transferable question: measured against what?',
      },
    ],
    features: [
      'The Retrograde Mars scenario: the Sun, Earth and Mars at their real distances, periods and masses, and nothing else. The full Solar System draws the same loops, but with fifty asteroids and ten comets looping at once it is a picture rather than a measurement.',
      'The reference-frame switcher, in Tools > Frame and in the object inspector under Overlays. Choosing a body puts it at rest and re-expresses every position and every trail around it.',
      'Frame-relative readouts in the inspector: Distance from Earth and Direction from Earth appear whenever a frame is active, alongside the unchanged world-frame Velocity row. The direction in degrees is the number steps 16 and 31 are read from.',
      'A trail long enough to close the loop: the scenario holds about 110 days of history, a little longer than a whole retrograde episode.',
    ],
    misconceptions: [
      {
        claim: 'Mars actually slows down and reverses in its orbit.',
        response:
          'It does not, and the lesson is built so students see this before they see the loop: step 4 has them watch from outside and confirm that neither planet ever turns back. If a student still writes this at step 21, send them back to step 4 rather than re-explaining. The whole point is that the reversal is a fact about the observer.',
      },
      {
        claim:
          'Changing the reference frame is just a drawing trick, so the loop is not real.',
        response:
          'The loop is exactly as real as the circle, and both are pictures of the same recorded positions. What makes the loop the observationally relevant one is that we live on Earth: it is what our eyes receive. Step 13 exists to head this off by explaining that each trail point is re-expressed against where the origin was at the time it was recorded, not slid across the screen.',
      },
      {
        claim: 'The retrograde loop proves the Earth moves.',
        response:
          'It does not, and step 27 asks this directly. Both models reproduce it; that is why the dispute lasted so long. The loop shows relative motion between Earth and Mars, and attributing that motion to one body rather than the other needs a separate argument. Students who find this unsatisfying have understood it correctly.',
      },
      {
        claim: 'Ptolemy was simply wrong, and epicycles were a silly idea.',
        response:
          'Epicycles reproduced planetary positions to about naked-eye accuracy and were used for fourteen hundred years, which is a longer run than most theories get. Step 22 presents them as a working model. The weakness worth naming is not inaccuracy but the unexplained coincidence of step 23: five devices tuned separately, three of which turn out to share one period for no reason the model supplies.',
      },
      {
        claim: 'Tycho failed to find parallax because he was a poor observer.',
        response:
          'He was the best pre-telescopic observer there has ever been, and his reasoning was valid: no parallax means either no motion or absurdly distant stars. He had no way to rule out the second. Step 30 puts numbers on it, and the general point is worth drawing out: a null result constrains a theory only once you know what your instrument could have detected.',
      },
      {
        claim:
          'Every frame is equally good, so physics has nothing to say about which to use.',
        response:
          'Step 28 addresses this. Frames are equally valid as descriptions and not equally useful as physics: in Earth’s frame you must add fictitious forces that no mass exerts to explain why the Sun circles us. The frame in which every force can be traced to a body is the one worth building mechanics in, and that argument is Newton’s rather than Copernicus’s.',
      },
    ],
    teachingNotes: [
      'Steps 3 and 4 are the setup for everything else and are worth not rushing. A class that has personally confirmed at step 4 that neither planet reverses will accept the loop at step 14 as a puzzle to solve rather than as an animation to watch.',
      'At step 14 the loop does not appear instantly. The trail has to grow, and Earth has to reach opposition, which can take half a minute of running. Tell students this in advance or several will conclude the control is broken and switch it off again.',
      'Step 21 is the assessment center. The discriminating feature of a good answer is that it explains the reversal without attributing anything unusual to Mars. Answers that invoke gravity pulling Mars back, or Mars slowing at the far point of its orbit, are the common failure and are worth collecting and discussing as a group.',
      'Step 27 is where the room usually divides, and it is the most valuable minute in the lesson. Some students will insist the loop settles it. Ask them to state what a geocentric astronomer would say when shown the same screen, and the argument becomes about criteria for choosing between models rather than about which is true.',
      'If you are short on time, steps 22 to 24 can be assigned as reading rather than done in class; the physics survives without them. Steps 28 to 30 are harder to cut, because without them the lesson has raised the question of what settles the matter and left it unanswered.',
      'Students who have done Kepler’s Laws will notice at step 6 that the inner planet being faster is the third law again. Naming that connection out loud costs nothing and does a lot for the coherence of the unit.',
    ],
    discussion: [
      'A geocentric astronomer and a heliocentric one are shown the same screen at step 14. What exactly do they disagree about, and what observation could settle it? What would each accept as evidence against their own view?',
      'Ptolemy’s model made accurate predictions for fourteen centuries. If a model predicts correctly, in what sense can it be wrong? Is a model that predicts well but explains nothing worse than one that explains well but predicts poorly, which is what Copernicus originally offered?',
      'Step 23 turns on a coincidence: three planets, one period. How much weight should an unexplained coincidence carry when choosing between two models that fit the data equally well? Can students name a modern example of the same kind of argument?',
      'Tycho concluded from a null result that the Earth does not move. His logic was sound and his conclusion was wrong. What was missing, and how would you avoid making the same error with a modern non-detection?',
    ],
    extensions: [
      'Have students find the current retrograde dates for Mars in a planetarium program or an almanac, and check the interval against the 780 days computed at step 9. The agreement is exact enough to be striking.',
      'Repeat the whole exercise for Venus by building a Sun, Venus and Earth system. Venus is an inner planet, so the geometry is reversed and the loop happens at inferior conjunction rather than opposition. Ask students to predict the difference before running it.',
      'Ask students to compute the synodic periods of all five naked-eye planets and to explain, physically, why the outer ones converge on one year while Venus and Mercury do not.',
      'For a mathematically stronger group: derive the direction from Earth to Mars as a function of time for two circular orbits, and find the condition for the derivative to change sign. The result is a clean statement of when a retrograde episode begins and ends.',
    ],
    modelNotes: `The orbits here are circles at the true semi-major axes, 1.00 and 1.523 AU, with the true masses and therefore the true periods. Real eccentricities are 0.017 for Earth and 0.093 for Mars, and both are left out because neither changes the phenomenon: what draws the loop is the difference in angular speed, not the shape of either orbit. Real Mars retrograde episodes vary in length and in the shape of the loop from one opposition to the next, and that variation does come from the eccentricities and from the 1.85 degree inclination of Mars's orbit, which this planar model also omits. Students comparing a screenshot with a photograph of a real Mars loop will find the real one is a flattened S or an open zigzag as often as a closed loop, because Mars is usually a little above or below the ecliptic when it happens. The synodic period, the location of the reversal at opposition, and the coincidence of reversal with closest approach are all reproduced exactly.`,
    expectations: {
      4: 'Both planets circle counterclockwise and neither ever reverses. Earth’s speed reads about 29.8 km/s and Mars’s about 24.1 km/s; students should notice both that Earth is faster and that it has less far to go. If a student reports a reversal here, they have already switched the frame.',
      5: 'Earth: 1.00 AU and about 365 days. Mars: 1.52 AU and about 687 days. The inspector computes these from live position and velocity, so readings drift by a per cent or two depending on when they are taken; anything within 5 per cent is a good measurement.',
      7: 'Earth 0.99 degrees per day, Mars 0.52, and a gain of about 0.46 degrees per day. A student getting a negative gain has subtracted the wrong way round.',
      14: 'Earth sits still at the center, the Sun circles it once a year, and Mars’s trail carries a loop or a cusp. The loop needs roughly half a minute of running to appear: the trail has to fill and Earth has to reach opposition. Students who switch the frame and immediately switch back will see nothing.',
      16: 'The direction from Earth climbs at roughly half a degree a day for most of the cycle, then falls for about ten weeks around opposition. Any pair of readings that brackets a fall is a correct answer; the day numbers themselves depend on when the student started.',
      17: 'Closest about 0.5 AU, furthest about 2.5 AU, a ratio near 5. Readings of 0.53 and 1.98 are typical if the student has not watched a full synodic period, and that is fine: the point is that the ratio is large, not its exact value. The real range is 0.38 to 2.68 AU because of the eccentricities this model leaves out.',
      26: 'The Sun traces a closed circle of radius 1 AU around Earth, once a year, with no loop and no cusp anywhere on it. Switching to the world frame stops the Sun dead; switching to the Sun’s own frame puts Earth back on the circle. Students often find this screen more unsettling than the Mars loop, which is a good sign.',
      31: 'About 70 to 80 days between the direction starting to fall and starting to rise again. The real figure for Mars is about 72 days, and it varies from one opposition to the next by a couple of weeks for reasons this planar circular model does not include.',
    },
  },
  'missing-mass': {
    topic: 'Dark matter',
    difficulty: 'Introductory, with one genuinely open-ended fitting exercise',
    placement:
      'Anywhere after orbital motion has been covered, and it needs nothing else. It pairs naturally with a unit on galaxies or on cosmology, and it also works as a single-session standalone: twenty-nine screens, one argument, and a result students derive rather than receive. If you teach Kepler earlier in the term, this is the lesson that shows what happens when Kepler stops working. The rotation-curve fitting sequence at steps 13-19 is the longest single activity in Gravitas and the closest any of these lessons comes to what research actually feels like; if you are short of time it is the part to protect, and steps 2-3 and 6-8 are the scaffolding that makes it work.',
    overview: `Students weigh systems twice over, once by adding up the mass that is visible and once
      by watching how things move, and discover that the two answers agree for the Solar System and
      disagree badly for anything larger. The lesson opens by making a rotation curve into a tool
      rather than a result: students rearrange a fixed amount of mass four ways and watch the curve
      change shape, then work the relation backwards on a second instrument that shows a curve and its
      enclosed mass side by side, and record four points that fall on a straight line through the
      origin. They read the Solar System's Keplerian exponent of -0.5, predict the same shape for a
      galaxy, and meet the flat curve telescopes actually find.
      \n\nThe centre of the lesson is a fitting exercise. Students are handed a measured rotation
      curve and a model with a stellar disc and a dark halo, and asked to reproduce the data. They try
      the disc alone first, with both of its parameters free, and cannot do it: the best possible
      stars-only fit misses by about 15 km/s against measurement errors of 5, and it misses worst at
      the outer edge. A choice step draws out why - the shortfall is the wrong shape, not merely the
      wrong size - and then the halo goes in and the fit closes. Students read off how much dark mass
      per unit of visible mass their own fit implies.
      \n\nThe rest is consequence and context. A single star is launched on a circular orbit and the
      halo is removed underneath it; then the same experiment is run on ninety stars in the live
      simulation and the disc comes apart. Zwicky's 1933 cluster measurement follows, first on the real
      Coma Cluster in an instrument where the two classic arithmetic mistakes are selectable, then on
      the simulated cluster by hand. The lesson closes on the mass budget of the universe and on a
      short-answer step asking what the measurements establish and, more importantly, what they do
      not.`,
    priorKnowledge: [
      'That gravity holds orbits together, and that a faster orbit implies more mass inside it',
      'Reading a point off a graph, and the idea that a straight line on a log plot is a power law',
      'Squaring a number and dividing on a calculator; the arithmetic at steps 25 and 26 is two multiplications',
      'Comfort with the idea of fitting a model to data with error bars, and that a fit is judged against those errors rather than against zero. Steps 13-19 introduce this from scratch, but a class that has met it before will move faster',
      'Helpful but not required: Kepler’s Laws, for the circular-orbit speed relation the whole lesson leans on',
    ],
    keyConcepts: [
      {
        heading: 'The rotation curve',
        body: 'Orbital speed plotted against distance from the center. Its shape is a direct readout of where the mass is: a system with its mass concentrated in the middle gives a curve falling as the inverse square root of radius, and any departure from that means mass is still being enclosed further out. The Gravitas panel plots one point per body from live positions and velocities, with nothing fitted or smoothed.',
      },
      {
        heading: 'Why the Keplerian exponent is -0.5',
        body: 'Setting gravitational attraction equal to what a circular orbit needs gives v = sqrt(G M(<r) / r). If essentially all the mass sits inside the smallest orbit, M is a constant and only r varies, so v goes as r to the power -1/2. The Sun holds 99.8 per cent of the Solar System’s mass, which is why the Solar System returns almost exactly -0.500.',
      },
      {
        heading: 'What a flat curve requires',
        body: 'Rearranging the same relation for mass gives M(<r) = v squared times r over G. Holding v constant with radius therefore forces M(<r) to grow in proportion to r: double the radius and the mass inside must double. Out where the stars have run out, nothing visible supplies that growth, yet the speeds do not drop. This is the observation, and it is independent of any explanation of it.',
      },
      {
        heading: 'The dark-matter halo',
        body: 'A halo is not an object. It is a smooth mass distribution added to the force law, with no position of its own, nothing drawn on screen and no entry in the body counts. Gravitas uses a pseudo-isothermal profile, the same family used to fit real rotation curves, whose enclosed mass keeps growing with radius and whose circular speed approaches a constant far out. That asymptote is what flattens the curve.',
      },
      {
        heading: 'The virial theorem',
        body: 'For a self-gravitating system that has settled down, 2K + U = 0. Writing the kinetic energy as half M times the mean square speed and the potential energy of a uniform sphere as -(3/5) G M squared over R, and cancelling one factor of M, gives M = (5/3) R times the mean square speed, divided by G. This converts a spread of speeds into a mass, and it is the whole of what Zwicky did.',
      },
      {
        heading: 'Dynamical mass against visible mass',
        body: 'These are two independent estimates of the same quantity, from two unrelated kinds of measurement. Their ratio is the entire result of this lesson. Because it is a ratio it is unaffected by the scale of the model, which is what lets a scaled-down cluster carry a conclusion about a real one.',
      },
      {
        heading: 'Decomposing a rotation curve',
        body: 'A model galaxy is built from components whose circular speeds add in quadrature, because it is the accelerations that add and each of them equals v squared over r. The disc in the fitting instrument is a thin exponential disc with the Freeman (1970) solution, which rises, peaks at about 2.15 scale lengths and then declines more slowly than a point mass would. That shape is the crux: it is fixed by the geometry, so the only freedoms are how much mass the disc has and how spread out it is, and neither of them can turn a declining curve into a level one.',
      },
      {
        heading: 'Why the shape of the residual matters more than its size',
        body: 'The instinctive response to a model that falls below the data is to add mass. Students discover at steps 14-16 that this cannot work, because adding mass to a disc raises the inner curve faster than the outer one: the best stars-only fit leaves about 15 km/s of average error against measurement errors of 5, and the miss is concentrated at the outer edge. What the data requires is mass that is negligible where the light is and dominant where it is not, which is the opposite of how starlight is distributed. This is the argument that actually closed the question in the literature, and it is an argument about shape.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'A rotation curve is established as a tool before it is used as a result. Students rearrange a fixed amount of mass four ways in the "Where the mass is" instrument and watch the curve change shape, then commit in a choice step to which arrangement produces a flat curve. Nothing about dark matter has been mentioned yet.',
      },
      {
        steps: '4-5',
        text: 'The Solar System, plotted live from the simulation. Students read the fitted exponent off the Rotation Curve panel and then reason out, in a multiple-choice step, why it comes to -0.5. This is the case where light and motion agree, and it is the reference the rest of the lesson is measured against.',
      },
      {
        steps: '6-8',
        text: 'The relation is worked backwards. The "What the speed tells you about the mass" instrument shows a curve and its enclosed mass together with a draggable radius marker, a choice step draws out what a flat curve requires, and then students record the enclosed mass at four radii and plot it. The four points fall on a straight line through the origin, which is what "proportional to radius" looks like.',
      },
      {
        steps: '9-12',
        text: 'The prediction and the observation. Students predict the curve of a galaxy built on the assumption that light traces mass, measure it, then meet Rubin and Ford’s result in the same disc with the speeds telescopes actually find, and measure that too. The visible mass is identical in both; only the motion differs.',
      },
      {
        steps: '13-16',
        text: 'The fitting exercise begins, and this is the heart of the lesson. Students are handed a measured curve with error bars and a stellar disc with two free parameters, and asked to reproduce the data. They cannot. Step 15 has them record their own best attempt, and step 16 asks why a heavier disc does not rescue it: the shortfall is the wrong shape, not the wrong size.',
      },
      {
        steps: '17-19',
        text: 'The halo goes in. Two more sliders, a fit that closes to within the measurement errors, and a numeric step in which students divide their own fitted halo mass by their own visible mass. The answer, about 3.4, is a number they produced rather than received.',
      },
      {
        steps: '20-21',
        text: 'What the halo is holding. A single star is launched on a circular orbit at the speed a real galaxy gives it and the halo is switched off underneath it; then the same experiment runs on ninety stars in the live simulation and the disc unwinds from the outside in.',
      },
      {
        steps: '22-24',
        text: 'Zwicky and the Coma Cluster. The history is introduced, then students work the virial theorem on the real Coma Cluster in an instrument where both classic arithmetic mistakes are selectable, and only then switch to simulation units and record the member count, speed spread and radius of the simulated cluster by hand.',
      },
      {
        steps: '25-29',
        text: 'The calculation and its meaning. Two numeric steps take students from the virial theorem to a dynamical mass and then to its ratio against the visible mass. A short-answer step asks what has and has not been established, the mass-budget instrument puts the result in cosmological context, and the lesson closes on where the evidence stands and what remains unknown.',
      },
    ],
    features: [
      {
        name: 'Where the mass is (steps 2-3)',
        text: 'A lesson instrument, not the live panel. It holds a total mass fixed and lets a student arrange it four ways — all in the middle, a uniform ball, an exponential disc, and a halo whose mass keeps growing — showing the mass distribution beside the curve it produces. Every arrangement contains the same mass inside 30 kpc, so the comparison is about shape alone. It reports the outer slope, and names the shape in words using bands that are deliberately comparative: a pseudo-isothermal halo still climbs slightly over any finite range, so "flat" means near zero rather than exactly zero.',
      },
      {
        name: 'What the speed tells you about the mass (steps 6-8)',
        text: 'Two stacked plots — a rotation curve above, the enclosed mass it implies below — joined by one draggable radius marker. The lower plot is the upper one with M = v squared r over G applied to it, and the panel says so. Three curves are selectable: falling, flat, and a real galaxy with the visible contribution drawn as a dashed line. The readout states what happens to the enclosed mass when the radius doubles, which is the sentence step 7 grades.',
      },
      {
        name: 'Fit a real galaxy (steps 13-19)',
        text: 'The centrepiece. A measured rotation curve with error bars, and a four-slider model: disc mass, disc scale length, halo strength and halo core radius. It scores the fit as an RMS residual in km/s and states the mean measurement error alongside it, so a student can tell a good fit from a lucky one, and it names the radius of the worst single miss and whether the model is too fast or too slow there. The plot marks FITTED when the residual drops below the errors. Steps 14-16 hide the two halo sliders so the disc has to be tried on its own first.',
      },
      {
        name: 'What the halo is holding (step 20)',
        text: 'A single star launched on a circular orbit at the speed the full model gives it, integrated live, with a halo toggle. Switching the halo off removes the mass without touching the motion, which is precisely the situation a flat rotation curve presents, and the star leaves. The readout shows the launch speed beside the speed the visible disc alone could have held, and the view does not rescale when the star escapes.',
      },
      {
        name: 'Weigh a cluster by how fast it jitters (step 23)',
        text: 'The virial theorem applied to the real Coma Cluster, with sliders for the measured dispersion and the radius, and a third slider that selects how sigma becomes the mean square speed. Two of its three positions are wrong on purpose: sigma without squaring, and sigma squared without the factor of three for the two unobserved directions. The readout warns when a wrong one is selected and says why. Two bars compare the mass the motion demands against the galaxies and the hot gas.',
      },
      {
        name: 'Where the mass of the universe is (step 28)',
        text: 'Planck 2018 fractions revealed one layer at a time: everything, then the matter alone, then the ordinary matter alone, then the stellar share of it. Each layer rescales to the slice above, which is what makes the last number land — every star and nebula ever photographed is about half a per cent of the universe.',
      },
      {
        name: 'Rotation Curve panel (live, used at steps 4-5, 9-12 and 21-24)',
        text: 'A live instrument in the Tools list. It plots one point per body from the simulation’s own positions and velocities, over a dashed line showing the speeds the visible mass alone would produce and, when the halo is on, a solid line including it. It reports a power-law fit to the outer curve and names the shape in words. The inner region excluded from the fit is shaded, so the reported slope is visibly the slope of the outer curve.',
      },
      {
        name: 'Dark-matter halo toggle (step 21)',
        text: 'Inside the Rotation Curve panel. It adds or removes a term in the force law rather than changing the display, which is why the disc physically disperses when it is switched off. The flat-speed and core-radius sliders beside it set the halo’s two parameters.',
      },
      {
        name: 'Spiral Galaxy and Milky Way Rotation scenarios (steps 9-12 and 21)',
        text: 'The same disc twice: ninety stars and a central bulge, identical visible mass. In the first, each star is launched at the circular speed the visible mass implies, and the curve falls with an exponent near -0.45. In the second, every star moves at the same speed regardless of radius, and the halo is on because the disc does not survive without it.',
      },
      {
        name: 'Coma Cluster scenario (steps 22-24)',
        text: 'Twenty-four galaxies on randomly oriented orbits, named after real members of Coma. Galaxy is a new object type in Gravitas: a point mass with a disc drawn on it, which does not merge or evolve. The scenario is paused and carries a fixed seed, so the numbers a class reads are reproducible.',
      },
      {
        name: 'Cluster measurements block',
        text: 'Appears in the Rotation Curve panel whenever the scene contains three or more galaxies, and reports member count, speed spread and cluster radius. It deliberately stops there: the virial arithmetic is the exercise, so the panel supplies the measurements and not the answer.',
      },
    ],
    misconceptions: [
      {
        claim: 'Dark matter is a theory somebody invented to patch up gravity.',
        response:
          'The discrepancy is a measurement, made independently in galaxies and in clusters decades apart, and this lesson has students reproduce both. What dark matter names is the explanation, and step 27 exists specifically to separate the two. A student who leaves able to make that distinction has the most valuable thing in the lesson.',
      },
      {
        claim:
          'The outer planets move slowly because gravity is weaker out there.',
        response:
          'Gravity weakening with distance is already inside v = sqrt(G M / r) and does not by itself give the -0.5 exponent. What fixes that exponent is the enclosed mass staying constant. The distinction matters, because a flat rotation curve has the same weakening gravity and a completely different slope.',
      },
      {
        claim:
          'A flat rotation curve means the stars are moving too fast to stay bound.',
        response:
          'They are moving too fast for the visible mass to hold, which is not the same claim. The galaxies are bound and stable; what the measurement shows is that something is doing the binding that we cannot see. Steps 20 and 21 make the difference concrete: remove the halo and the star, and then the whole disc, really do come apart.',
      },
      {
        claim:
          'The dark matter is in a halo, so it must be a shell around the outside.',
        response:
          'A halo in this sense is a roughly spherical distribution that extends well beyond the visible disc but is present throughout it, densest in the middle like everything else. It is not a shell and there is no edge. The word is a description of extent, not of shape.',
      },
      {
        claim: 'Zwicky proved dark matter exists in 1933.',
        response:
          'He measured a discrepancy and named it. His own numbers were off by a large factor, partly because the extragalactic distance scale was wrong in 1933 and partly because most of a cluster’s ordinary matter is in hot gas nobody could see until X-ray astronomy. The result was largely ignored for forty years and only became compelling when independent lines of evidence agreed.',
      },
      {
        claim: 'Dark matter has been detected.',
        response:
          'Its gravitational effects have been measured many times over and in several unrelated ways. The substance itself has never been detected in a laboratory and no candidate particle has been identified, after four decades of searching. Step 29 says this plainly and it is worth saying again out loud.',
      },
      {
        claim:
          'The rotation curve problem could be fixed by finding more stars, or heavier ones.',
        response:
          'This is the belief steps 14 to 16 are built to break, and it is worth letting students hold it long enough to test. Both of the disc’s parameters are free, and neither works: adding mass raises the inner curve faster than the outer one, and spreading the disc out flattens its peak without stopping it from declining. The best possible stars-only fit is three times worse than the measurement errors and misses worst at the outer edge. The problem is the shape of what is missing, not the amount, and no amount of starlight has that shape.',
      },
      {
        claim: 'A halo is just a free parameter, so of course it fits.',
        response:
          'It is two free parameters, and that is a fair thing to be suspicious of. Two points are worth making. First, the disc it is competing against also has two free parameters and still cannot fit, so the halo is not winning by having more freedom. Second, the halo is not free to be any shape: it is a specific profile whose enclosed mass grows in proportion to radius far out, which is what a flat curve demands and what the fit tests. A student who presses this is doing exactly the right thing, and the honest answer is that the halo is a fitted model whose form is constrained by the data it was invented to explain — the same status it has in the research literature.',
      },
    ],
    teachingNotes: [
      'Have the class open the Rotation Curve panel at step 4 and leave it open for the rest of the lesson. The live measurements at steps 4-5, 9-12 and 21-24 all come from that one instrument, and the argument is much clearer when students watch the same plot change under three different systems than when they open and close it. Steps 2-3, 6-8, 13-20, 23 and 28 use their own docked instruments instead and need nothing from the rail.',
      'Steps 2 and 3 look like warm-up and are not. Everything after them depends on a student being able to look at a curve and say where the mass is, and this is the only place they get to build that by moving mass around rather than by being told. Ten minutes here saves twenty at step 16.',
      'Collect the step 9 prediction before anyone looks at the panel. Most classes correctly predict a falling curve, which is exactly what you want: the surprise at step 12 only lands for students who had committed to the other answer first.',
      'Steps 13 to 19 are the lesson. Budget half the session for them and resist the urge to shorten. The intended experience at step 14 is sustained, honest failure: students should push the disc mass to the top of its range, watch the inner curve overshoot, bring it back, try the scale length, and arrive at about 15 km/s of residual convinced there is nothing left to try. Do not rescue them, and do not let a fast student tell the room the answer.',
      'Ask for step 15 in writing before anyone touches the halo sliders. The number a student produced themselves, and the fact that their worst miss was at the outer edge, is what makes step 16 an inference rather than a claim.',
      'Step 16 is the pivot of the whole lesson and the one place to run a discussion rather than a click. The distractor about a disc not holding enough mass is the intuitive answer and it is wrong: mass is not the problem, distribution is. If the class can articulate "we need mass where the light is not", they have the argument that settled the question in the literature.',
      'At step 17, expect a spread of halo parameters that all fit. That is a genuine degeneracy between halo strength and core radius, not a mistake, and it is worth naming out loud: published rotation-curve papers quote these two together with a covariance for exactly this reason. The halo mass, and therefore the ratio at step 19, is far better constrained than either slider on its own.',
      'Step 20 is the best demonstration in the lesson and takes about thirty seconds. Run it on one screen with the class watching: launch the star, let it complete an orbit, then drag the halo slider to OFF and say nothing. Then ask why the star left, and insist on the answer that nothing was added to the star.',
      'Step 21 repeats step 20 on ninety stars in the live simulation. It is worth doing both: the single star makes the mechanism clear and the disc makes the consequence visible.',
      'Let students find both wrong settings at step 23 rather than warning them first. The "forget to square it" case is the valuable one, because the discrepancy vanishes: an answer that shows no missing mass is a signal that the arithmetic went wrong, and recognising that is a transferable skill.',
      'At step 24, make sure students actually switch to simulation units before recording anything. In physical units the panel reports a cluster radius in AU, which is a nonsense number for a cluster of galaxies and will produce a mass wrong by many orders of magnitude. The scenario is a scale model and the lesson says so, but the unit switch is the step students skip.',
      'The commonest arithmetic error at step 25 is using sigma rather than sigma squared, which gives about 86,000 instead of 1.76 million in simulation units. The second commonest is forgetting to divide by 1000 to reach solar masses. Both are worth naming in advance, and both were reachable deliberately at step 23 so that a student may already have met them.',
      'Steps 25 and 26 can be done on paper in under two minutes, and doing them on paper rather than in the answer box is worth the time: the point is that this calculation is genuinely small, and that Zwicky needed nothing more than this.',
      'Step 27 is a good exit ticket. Any answer that separates the measured discrepancy from its interpretation earns full credit; naming faint ordinary matter or modified gravity as alternatives earns more, and so does noticing that the rotation-curve result constrains the shape of the missing mass and not only its amount. Students who write only "dark matter exists" have missed the step.',
      'If a student asks whether the halo in this simulation is real physics or a fudge, the honest answer is that it is a fitted model: a pseudo-isothermal profile with two free parameters, chosen because it reproduces real rotation curves. Say so. It is the same status the profile has in the research literature, and the misconceptions section above has a longer answer.',
      'The rotation curve being fitted at steps 13-19 is synthetic, built from NGC 3198’s published structural parameters rather than transcribed from a data table, and the panel says so. This is deliberate: it means the exercise has an exact right answer, so a student who fits well has genuinely fitted well rather than guessed. If a class asks to see the real thing, the published decomposition of NGC 3198 is in the extensions below.',
    ],
    discussion: [
      'The Solar System gives an exponent of -0.5 and a galaxy gives roughly zero. Is there a size at which the disagreement starts, and how would you find out?',
      'Two independent measurements, in different kinds of system, sixty years apart, both say there is more mass than light. Why does independence matter so much here? What would it take for both to be wrong in the same direction?',
      'Suppose the missing mass turned out to be ordinary matter that is simply too faint to count: dim stars, cold gas, free-floating planets. What would you look for to test that, and why do you think it was eventually ruled out?',
      'Modifying the law of gravity at large distances also reproduces flat rotation curves. What would distinguish that from extra mass, and why do clusters make it harder to sustain?',
      'Roughly eighty-five per cent of the matter in the universe is of a kind nobody has identified. Is that a scandal, a research programme, or both?',
      'The panel reports a slope and names the shape in words. What is gained and what is lost when an instrument tells you what its own measurement means?',
    ],
    extensions: [
      'Have students look up a published rotation curve for a real galaxy, NGC 3198 and NGC 2403 are the classic cases, and compare its shape with the two Gravitas scenarios. The published figures usually plot the stellar, gas and halo contributions separately, which is exactly the decomposition the panel draws.',
      'Ask students to quantify the degeneracy they met at step 17. Have them find three different pairs of halo strength and core radius that all fit, record the halo mass inside 30 kpc for each, and compare the spread in the parameters with the spread in the mass. The parameters vary by tens of per cent; the mass barely moves. This is why papers quote the derived mass rather than the fitted parameters.',
      'Have students repeat the step 14 sweep systematically rather than by feel: fix the scale length, step the disc mass across its whole range, and tabulate the average miss. The curve of residual against disc mass has a shallow minimum around 8.5, well above the mass the light implies and still three times worse than the errors. Plotting that curve turns "I could not fit it" into "no disc mass fits, and here is the proof".',
      'Have students read about the Bullet Cluster and explain, in a paragraph, why the separation of the lensing mass from the X-ray gas is difficult for modified-gravity explanations to accommodate.',
      'For a mathematically prepared class, derive M(<r) proportional to r from the flat-curve condition, then integrate to show the implied density falls as r to the power -2 and that the total mass diverges. Ask what that divergence means physically, and connect it back to step 8 where students measured that proportionality directly.',
      'The disc curve in the fitting instrument is the Freeman (1970) thin exponential disc, whose peak sits at 2.15 scale lengths regardless of mass. Have a prepared class verify that from the panel by fixing the scale length and finding the peak, then repeating at a different scale length. It is a pure number that falls out of the geometry, and finding it is a good demonstration that the disc model is not adjustable in the way the mass is.',
    ],
    modelNotes: `The halo is a smooth background field added to the force law, not a body. It uses a
      pseudo-isothermal profile, whose circular speed is v_flat times the square root of
      1 - (r_c/r) arctan(r/r_c). This is the profile used to fit real rotation curves, chosen over the
      NFW profile that better matches structure-formation simulations because NFW is cuspy at the
      center, which would place a singularity in the middle of a scenario students are asked to fly a
      star through. The halo is applied as a velocity kick before the existing gravity solver on each
      step, which keeps it correct for both the direct sum and the Barnes-Hut path; a test confirms
      that a circular orbit in the halo stays circular to better than one per cent over several orbits.
      \n\nThe three scenarios are scale models and their cards say so. A real galactic bulge is around
      ten billion solar masses and a real cluster is megaparsecs across, while Gravitas's units are
      calibrated so that G = 1 works for planetary systems. Rebuilding the unit system around galactic
      scales would change nothing a student measures here, because every quantity this lesson turns on
      is dimensionless: the exponent of a power law, and the ratio of two masses.
      \n\nGalaxies are a genuine object type, deliberately the simplest in the codebase: a mass, a
      position and a drawing. They do not merge, accrete or evolve, because none of those are what a
      student is being asked to look at, and a cluster that lost members would lose the dispersion
      being measured.
      \n\nThe rotation curve excludes the central mass from the plot, identified as the heaviest body
      lying near the middle rather than by a radius cutoff. A cutoff wide enough to catch a galactic
      bulge also discarded Mercury, which is a tracer and belongs on the plot. Everything else shown
      is a live measurement: nothing is fitted or smoothed except the power law, whose fitting window
      is drawn on the plot.`,
    expectations: {
      2: 'All four presets should be pressed. The falling presets return an outer slope near -0.50 and the shape reads "falling, Keplerian"; the disc reads about -0.28 and "falling"; "What galaxies do" reads about +0.10 and "FLAT". The +0.10 is worth a word if a student queries it: a pseudo-isothermal halo approaches its asymptote from below, so over a finite range it is still climbing slightly. The claim the lesson makes is comparative — flat rather than -0.5 — and the panel’s bands are set for that.',
      4: 'The Solar System returns an exponent of -0.500 and the panel names the shape Keplerian. Mercury sits at the left of the plot at 48.5 km/s and 0.389 AU, and Neptune at the right at 5.43 km/s and 30.1 AU, both within a per cent of the real values, and every point lies on the dashed prediction. This is the agreement the rest of the lesson is measured against.',
      6: 'On the falling curve, dragging the marker from 2 kpc to 30 leaves the lower plot almost level and the readout says the enclosed mass "barely changes (x 1.00)". On the flat curve the lower plot is a straight line through the origin and the readout says it "roughly doubles (x 2.00)". On the real galaxy the visible dashed line accounts for about a quarter of the enclosed mass at 30 kpc, which is the number step 19 will reproduce independently.',
      8: 'The flat curve gives 2.62, 5.23, 10.46 and 15.69 in units of 10^10 solar masses at 5, 10, 20 and 30 kpc: exactly proportional to radius, and the plot is a straight line through the origin. The falling curve gives 5.23 at 30 kpc, the same as it gives at 10, which is the contrast the step is for. Students who read 5.2 rather than 5.23 are fine; the point is the proportionality, not the third digit.',
      10: 'The Spiral Galaxy scenario gives an exponent near -0.45 and the shape reads Keplerian. It is not exactly -0.5 because the disc carries about a fifth of the visible mass, so the enclosed total does keep growing a little; students who notice that discrepancy and can explain it are ahead of the lesson. The visible mass reads 14.7 solar masses in the model’s own units.',
      12: 'The Milky Way Rotation scenario gives an exponent near +0.02 and the shape reads Flat. The visible mass is unchanged at 14.7, which is the point worth drawing out: nothing about the bookkeeping changed, only the motion. At the outer edge the stars are moving roughly 2.7 times faster than the dashed prediction, so answers between 2 and 3 are good readings off the plot.',
      14: 'Expect frustration, and protect it. A heavier disc lifts the whole curve and overshoots the inner points long before it reaches the outer ones; a wider disc flattens its peak a little and moves it outward but still comes back down. The best achievable stars-only fit is an average miss of about 15 km/s at a disc mass near 8.5 and a scale length near 4.5, and it is worst at 30 kpc where the model runs about 27 km/s too slow. Students who get anywhere near 15 have found the real answer and should be told so.',
      15: 'Around 15 km/s for the average miss, a disc mass between 6 and 10, and the worst miss at 30 kpc with the model too slow. A student reporting an average miss under 10 has almost certainly left the halo on or misread the row; a student reporting 40 or more has not swept the range. The sign of the worst miss is the field that matters most: too slow, at the outer edge, every time.',
      17: 'Raising the halo strength from zero lifts the outer curve while the inner points barely move, which is the observation the whole exercise exists to produce. FITTED appears once the average miss drops below about 4.7 km/s. There is a real degeneracy between halo strength and core radius, so a range of settings will fit: anything from roughly 140 to 160 km/s with a matching core between 4 and 9 kpc gets there. That degeneracy is a feature of the real problem and worth naming.',
      18: 'A halo flat speed near 150 km/s and a core radius near 6 kpc, with an average miss around 2 km/s. The visible mass reads 3.35 and the halo mass inside 30 kpc reads about 11.4, both in units of 10^10 solar masses. Because of the degeneracy the individual halo numbers will vary between students while the halo mass, and therefore the ratio at step 19, will not vary much.',
      20: 'With the halo on the star holds 20 kpc indefinitely. The readout shows a launch speed near 146 km/s against about 77 km/s for what the visible disc alone could hold — a factor of nearly two in speed, which is a factor of nearly four in the mass required. Switching the halo off sends the star out past three times its launch radius within a few seconds and the verdict line appears. Relaunching at 8 kpc with the halo off keeps the star, because the disc still dominates there; that contrast is worth asking for explicitly.',
      21: 'With the halo switched off the outermost stars begin drifting outward within a few seconds and the disc visibly unwinds from the outside in. The fitted slope climbs as the outer stars carry their speed to larger radii. Reloading the scenario restores it; the toggle alone does not, because the stars have already moved.',
      23: 'Done correctly, Coma comes out near 1.6 x 10^15 solar masses, about 11 times the galaxies and hot gas combined and about 54 times the galaxies alone. Selecting "forget the factor of 3" divides the mass by exactly three. Selecting "forget to square it" collapses it by a factor of a thousand and the discrepancy disappears entirely, which is the most useful thing on the panel: an answer that shows no discrepancy is the signal that the arithmetic went wrong, not that the problem went away.',
      24: 'Twenty-four members, a speed spread of 20.5 simulation units per time, and a cluster radius of about 2516 simulation units. The visible mass reads 96 solar masses. Because the scenario is paused and seeded these are the same for every student, so a different answer is a reading error rather than a different moment.',
    },
  },

  'goldilocks-question': {
    topic: 'Exoplanets and habitability',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the exoplanets unit, or wherever habitability is discussed. Works as a standalone; the eccentric-orbit section lands better after Kepler’s laws.',
    overview: `Students derive the inverse-square law from three measurements, use it to work out why a
      dim star’s habitable zone is tucked in close, meet the two published definitions of that zone and
      what separates them, watch an eccentric planet swing in and out of it, and read the real
      TRAPPIST-1 system against the model. The last five screens are the reason the investigation
      exists: having spent forty minutes making the habitable zone feel powerful, the lesson turns
      round and asks what being inside it actually establishes. The answer is "very little about the
      planet", and a student who leaves with that is better equipped to read an exoplanet headline than
      one who leaves able to recite the definition.`,
    priorKnowledge: [
      'That planets orbit stars, and that stars vary enormously in brightness',
      'Squaring a number, and dividing on a calculator',
      'Reading a point off a graph',
      'No physics background, no algebra beyond substituting into a stated relation',
    ],
    keyConcepts: [
      {
        heading: 'Insolation and the inverse-square law',
        body: `The energy arriving per square meter goes as L/d². The reason is geometric: a star’s
          output crosses an imaginary sphere whose area grows as the square of the radius, so the same
          energy is spread thinner. Earth receives about 1,361 W/m², which the lesson calls one Earth
          and uses as its unit throughout. Watts appear only as a secondary readout.`,
      },
      {
        heading: 'Why luminosity moves the zone',
        body: `A boundary is defined by an effective stellar flux, so the distance at which it falls
          scales as the square root of luminosity. A star a hundred times more luminous has its zone ten
          times further out. TRAPPIST-1, at 0.000553 L☉, has its zone about forty times closer in than
          the Sun’s, which is why all seven of its planets fit inside Mercury’s orbit.`,
      },
      {
        heading: 'What sets each edge',
        body: `The inner edge is the runaway greenhouse: past a certain incident flux, water vapor
          feedback runs away, the oceans end up in the atmosphere and hydrogen escapes. The outer edge
          is the maximum greenhouse: a carbon-dioxide atmosphere can only warm a surface so far before
          it scatters more light than it traps. Neither edge is a temperature; both are limits on
          incident flux that a climate model can cope with.`,
      },
      {
        heading: 'Conservative and optimistic are not moods',
        body: `The conservative zone (runaway to maximum greenhouse) comes from a climate model. The
          optimistic zone (recent Venus to early Mars) comes from what the Solar System’s own history
          rules out: Venus has had no surface water for about a billion years, Mars appears to have had
          some early on. Gravitas uses the Kopparapu et al. (2013) prescription for both, which is why
          the Sun comes out at 0.98 to 1.69 AU and 0.75 to 1.77 AU respectively.`,
      },
      {
        heading: 'Why the zone says so little about a planet',
        body: `It is computed from a star’s luminosity and temperature alone. It knows nothing about
          whether a planet has an atmosphere, has any water, or is rocky. Venus and Earth are nearly the
          same size, receive starlight within a factor of two of each other, and have surfaces four
          hundred degrees apart. That comparison is the whole argument in one line.`,
      },
    ],
    flow: [
      {
        steps: '1–6',
        text: 'Insolation is introduced with Earth as the unit. Students predict what doubling the distance does, measure three distances with the instrument and the graph on the same screen, and read the curve their own points make.',
      },
      {
        steps: '7–8',
        text: 'Only now the explanation. Students step a shell outward one astronomical unit at a time and read off the areas 1, 4, 9, 16 before the inverse-square relation is written down, then apply it at an unfamiliar distance.',
      },
      {
        steps: '9–13',
        text: 'The star changes instead of the planet. Students find that insolation tracks luminosity, then meet the habitable zone as a band and watch it move by a factor of fifty as the star changes.',
      },
      {
        steps: '14–17',
        text: 'The careful definition, then the live Solar System with the zone drawn on it. Students classify four real worlds and then write a short answer about the one that makes the definition mean something: Mars is inside the zone and bone dry.',
      },
      {
        steps: '18–23',
        text: 'What sets each edge, the conservative and optimistic prescriptions side by side, and the same comparison run on the live Solar System. Ends with an inverse-square calculation for Venus.',
      },
      {
        steps: '24–28',
        text: 'Orbits. A circular year gives a flat starlight curve; an eccentric one does not. Students watch the planet cross a zone boundary and interpret the fraction of the year spent inside.',
      },
      {
        steps: '29–32',
        text: 'TRAPPIST-1, with the real measured luminosity: a prediction, the diagram, the live seven-planet simulation, and a measurement screen where students take the readings themselves instead of being told the answer.',
      },
      {
        steps: '33–37',
        text: 'The turn. Does being inside the zone establish anything about the planet? Three candidates with similar insolation and different everything else, a follow-up-target choice, an unfamiliar case, and the synthesis.',
      },
    ],
    features: [
      {
        name: 'Insolation panel (steps 2, 4, 5)',
        text: 'A distance slider with presets at 0.5, 1 and 2 AU. The bar is proportional all the way down, so the falloff past 1.5 AU is visible rather than bottoming out. Step 5 carries the panel and the plot together, so no value has to be remembered from a previous screen.',
      },
      {
        name: 'Automatic plot (step 5)',
        text: 'The three recorded readings plot themselves. The validator checks that starlight × distance² is the same for every row and says so when it is, which is the inverse-square law appearing in the student’s own numbers before it is named.',
      },
      {
        name: 'Spreading panel (step 7)',
        text: 'One spherical shell at a time, with a fixed cone of starlight landing on it. As the distance goes out the patch of light grows while the energy in it does not. The readout spells out the arithmetic: the shell is 9× bigger, so each square meter gets 1/9.',
      },
      {
        name: 'Star panel (steps 10, 12)',
        text: 'Four real main-sequence stars from a faint red dwarf to five solar luminosities. The distance axis rescales with the star, which is deliberate and labeled: a red dwarf’s zone and a bright star’s zone differ by a factor of fifty.',
      },
      {
        name: 'Live Solar System with the zone drawn (steps 15, 21)',
        text: 'The main simulation, not a diagram: the Sun with Venus, Earth, Mars and Ceres on their real orbits, and the habitable zone rendered from the Sun’s own luminosity and temperature by the same module the panels use. Step 21 runs the identical system on the optimistic definition, so the inner edge visibly jumps inward while nothing else changes.',
      },
      {
        name: 'Boundaries panel (steps 18, 19)',
        text: 'Draws both the conservative and optimistic bands at once, the selected one filled and the other outlined, so switching shows exactly what moved.',
      },
      {
        name: 'Orbit panel (steps 24, 26, 27)',
        text: 'Solves Kepler’s equation, so the planet genuinely races through periapsis and crawls through the cold outer year. The starlight graph underneath is synchronized to the planet by a moving marker. Run/Pause and Reset are underneath.',
      },
      {
        name: 'TRAPPIST-1 panel (steps 30, 32)',
        text: 'All seven planets with alternating leader lines so seven labels on a compressed axis cannot collide. Planets inside the zone get a ring as well as a color, so the distinction does not depend on seeing color. Step 32 puts the panel beside a set of entry fields and has students take the readings themselves.',
      },
      {
        name: 'Live TRAPPIST-1 (step 31)',
        text: 'The real system in the simulation at about thirty times the zoom of the Solar System steps, with the zone ring drawn at the same scale as the orbits. The object inspector is unlocked for this one screen, so students can click a planet and read a period the gravity solver produced rather than one typed in. The ring label states that the star is cooler than the published fit covers.',
      },
    ],
    misconceptions: [
      {
        claim: 'Twice as far means half as much light.',
        response:
          'The commonest wrong answer at step 3, and worth collecting before step 4 rather than after. The light spreads over a surface, not along a line: four times the area, a quarter as much. Step 7 is the picture of why.',
      },
      {
        claim: 'Habitable means inhabited.',
        response:
          'Step 33 asks this directly. The zone is calculated from the star alone and says nothing about any planet in it. Watch for students using "habitable" and "inhabited" interchangeably in discussion and correct it each time.',
      },
      {
        claim: 'Every star has a habitable zone near 1 AU.',
        response:
          'Steps 12 and 13 are built to break this. One AU is Earth’s distance from one particular star. Around TRAPPIST-1 the zone sits near 0.03 AU, which students see running live at step 31.',
      },
      {
        claim: 'A planet in the green ring is Earth-like.',
        response:
          'The zone constrains one quantity, incident starlight. Step 34 gives three planets with the same insolation and very different prospects. Mars at step 15 is the version of that comparison students can see with their own eyes: inside the zone, and frozen.',
      },
      {
        claim: 'The habitable zone is a physical region of space.',
        response:
          'It is a calculated range of orbital distances, drawn as an overlay. Nothing is there. The lesson says so at step 12 and again at step 15, where the ring is visibly sitting in empty space, and the wording is worth repeating aloud.',
      },
      {
        claim: 'A planet that leaves the zone freezes immediately.',
        response:
          'Step 28 targets this. Atmospheres and oceans carry enormous heat and take a long time to change temperature. The fraction of the year inside the zone is a flag, not a forecast of the surface.',
      },
      {
        claim:
          'The optimistic definition is the one that finds more habitable planets.',
        response:
          'Step 22 is the counterexample. Widening the Sun’s zone from 0.98–1.69 AU to 0.75–1.77 AU brings in no additional Solar System world: Venus at 0.72 AU still misses the wider inner edge, by 0.03 AU. Which definition a paper uses matters for how a result is stated, not for how many planets exist.',
      },
    ],
    teachingNotes: [
      'Collect the prediction at step 3 before anyone touches the slider. "Half" is the answer most students give, and the value of step 4 depends on them having committed to it.',
      'Step 5 puts the instrument and the plot on one screen. Students who typed a distance into a starlight field get a specific warning from the validator; point them at it rather than at the answer.',
      'At step 7, have students say the area out loud at each distance before reading the third line of the readout. The sequence 1, 4, 9, 16 is the whole lesson, and it lands better spoken than read.',
      'Step 8 asks for 1/9. A student who types 0.33 has divided by three instead of nine.',
      'At step 12 the distance axis rescales when the star changes. Say this out loud: a class that reads the pixels instead of the axis will conclude that all four zones are the same size.',
      'Step 15 is the first time the lesson leaves the panels and uses the simulation itself. Give it a minute of quiet looking before asking anything. Most students will find Mars inside the ring on their own, and the surprise is worth having.',
      'Step 17 is the only written answer in the lesson. The model answer unlocks once a student has written about forty characters, so let them commit before pointing at the button. Collect a few answers aloud before anyone reveals it.',
      'Step 19 is worth doing as a class. The conservative-versus-optimistic distinction is the one place where students see that a published number depends on stated assumptions, and it transfers well beyond this topic.',
      'Steps 26 and 27 need a full lap before the fraction means anything. Students often pause too early.',
      'Step 31 unlocks the object inspector. Expect a minute of clicking; that is the point. TRAPPIST-1b should read about 1.5 days and h about 19 days, and those come out of the integrator rather than a table.',
      'Step 32 replaces what used to be a multiple choice. Students who write 4.18 for planet e have read the wrong row; the validator names the fields that are off rather than giving the values.',
      'Step 33 is the hinge of the whole investigation. If time is short, cut something from the first half rather than rushing steps 33 to 37.',
      'Step 35 has a defensible answer, but a student arguing for A or C with a good reason has understood the lesson. Reward the reasoning.',
    ],
    discussion: [
      'Mars is inside the conservative habitable zone and has no liquid water. What would have to be different about Mars for the zone’s promise to hold?',
      'The habitable zone is defined by liquid water. What does that assumption rule out, and why do astronomers make it anyway?',
      'Venus and Earth are nearly the same size and receive starlight within a factor of two of each other. Why are their surfaces four hundred degrees apart?',
      'The optimistic inner edge is set by Venus itself, and Venus sits 0.03 AU inside it. Is a definition calibrated on one example a strong definition or a weak one?',
      'Red dwarfs are by far the commonest stars, and their habitable zones are very close in. What might that closeness do to a planet, and does it rule it out?',
      'A press release calls a newly found planet "potentially habitable". What has actually been measured, and what has not?',
      'If you had one spectrum of one exoplanet, what would you most want to look for, and why?',
    ],
    extensions: [
      'Have students look up a real planet from the NASA Exoplanet Archive, find its host star’s luminosity and its semi-major axis, and place it against the zone themselves.',
      'Open the Habitable Zone Lab scenario outside the lesson, change the Sun’s mass, and watch the zone move. Ask what would happen to Earth if the Sun were ten percent more luminous, which it will be in about a billion years.',
      'Ask why a tidally locked planet is not automatically uninhabitable, and what an atmosphere would have to do for it to work.',
      'For students ready for it: the zone edges scale as the square root of luminosity, but luminosity itself scales steeply with stellar mass. Work out how the zone distance depends on mass, and why that makes low-mass stars such awkward hosts.',
    ],
    modelNotes: `The habitable-zone boundaries come from the Kopparapu et al. (2013) prescription with
      the 2014 erratum coefficients, evaluated from each star’s luminosity and effective temperature.
      The same module draws the ring in the live simulation and the bands in the lesson panels, so a
      student who reads 0.98 AU off a panel and then looks at the ring on screen is looking at one
      calculation drawn twice. Measured stellar luminosities are used wherever a scenario carries one,
      which matters most for TRAPPIST-1: a mass-luminosity relation would put its zone out by more than
      a factor of four. Below 2,600 K the polynomial is evaluated at its own lower limit rather than
      extrapolated, and the ring says so on screen. The orbital instruments solve Kepler’s equation
      analytically rather than integrating, so the timing of an eccentric year and the fraction spent
      inside the zone are exact. Nothing in this investigation models a climate: the zone is a
      statement about incident starlight against limits from a published model, and the lesson is
      careful to say so.`,
    expectations: {
      4: 'At 0.5, 1 and 2 AU the panel reads 4.00, 1.00 and 0.25 Earths. These are exact by construction, not rounded.',
      5: 'The three pairs should be (0.5, 4), (1, 1) and (2, 0.25). The validator confirms starlight × distance² is constant and says the relationship has appeared in the student’s own numbers; it warns if the rows do not sit on one curve, which almost always means a value was read at the wrong distance.',
      7: 'The shell areas read 1×, 4×, 9× and 16× at 1, 2, 3 and 4 AU, and the third line of the readout gives 1, 0.25, 0.111 and 0.063 Earths. The last line never changes: the total energy crossing the shell is the same at every distance.',
      10: 'At a fixed 1 AU: the red dwarf gives 0.0015 Earths, the orange dwarf 0.34, the Sun 1.00, the brighter star 5.1. The starlight equals the luminosity exactly, because the distance is 1 AU.',
      12: 'Conservative zones: red dwarf 0.042 to 0.080 AU, Sun 0.98 to 1.69 AU, brighter star 2.11 to 3.58 AU. A factor of about fifty between the extremes.',
      15: 'The ring runs from 0.98 to 1.69 AU. Venus at 0.72 AU sits inside the inner edge and Ceres at 2.77 AU well beyond the outer one, so Earth and Mars are the two worlds inside. Mars being inside is the point of the screen and is worth waiting for a student to notice.',
      19: 'Around the Sun the conservative zone is 0.98 to 1.69 AU and the optimistic zone is 0.75 to 1.77 AU. The inner edge moves much further than the outer one, which surprises most students.',
      21: 'The inner edge visibly jumps inward from 0.98 to 0.75 AU while the outer barely moves, 1.69 to 1.77. Venus at 0.72 AU is still outside it, by about 0.03 AU. The census of the Solar System does not change: Earth and Mars, on either definition.',
      24: 'On a circular orbit the starlight graph is a flat line. That is the observation the next prediction depends on.',
      26: 'At a = 1.2 AU and e = 0.45 the planet swings between 0.66 and 1.74 AU, receiving 2.30 and 0.33 Earths. The starlight peak is narrow and the trough is wide, because the planet moves fastest at periapsis.',
      27: 'At e = 0.45 the planet spends about 56% of its year inside the conservative zone; at e = 0.3 about 78%; on a circular orbit at the same semi-major axis, 100%.',
      30: 'Insolations: b 4.18, c 2.22, d 1.11, e 0.65, f 0.37, g 0.25, h 0.14 Earths. The conservative zone runs 0.0254 to 0.0499 AU, putting e, f and g inside. Switching to optimistic brings d in as well.',
      31: 'The whole system fits inside the ring plus a little either side. Orbital periods from the inspector: b about 1.5 days, c 2.4, d 4.0, e 6.1, f 9.2, g 12.4, h 18.8. TRAPPIST-1b completes about twelve laps for each one of h.',
      32: 'e 0.65, f 0.37, g 0.25 Earths, with the zone running 0.0254 to 0.0499 AU. The validator accepts anything within five percent and names the specific fields that are off, so a student who has read the wrong row is told which one rather than being given the value.',
      34: 'All three candidates receive close to one Earth of starlight and all three are inside the zone. The differences are atmosphere, size and stellar activity.',
    },
  },
  tides: {
    topic: 'Gravity and tides',
    difficulty: 'Introductory',
    placement:
      'Immediately after Newtonian gravity and the inverse-square law have been introduced, and before or instead of a lecture treatment of tides. It also works late in the term as the bridge between everyday gravity and compact objects, since the last third is a tidal disruption event done honestly.',
    overview: `Students build the whole subject out of one subtraction. They look at the gravitational
      pull the Moon exerts on three points of the Earth, notice the three numbers differ by about seven
      percent, subtract the pull on the centre, and discover the two bulges falling out of the arithmetic
      rather than being asserted. They then measure both scaling relationships themselves - one power of
      companion mass, three powers of separation - and use them to predict, correctly, that the Moon beats
      the Sun. The second half turns the same difference against a body's own gravity, which produces the
      Roche limit as a competition the student sets up rather than a formula they are handed, and closes on
      a tidal disruption event with the approximations stated out loud. The single most important outcome
      is that "tides are caused by strong gravity" is replaced by "tides are caused by unequal gravity".`,
    priorKnowledge: [
      'That gravity weakens with distance, and ideally that it does so as an inverse square',
      'That the Moon orbits the Earth, and that the Earth and Moon both orbit under mutual gravity',
      'Reading a value off a slider-driven panel and plotting a point',
      'Cubing a number on a calculator. No algebra is derived and no calculus is used',
    ],
    keyConcepts: [
      {
        heading: 'A tide is a residual, not a force',
        body: `The body as a whole accelerates at the rate the pull on its centre of mass dictates, and
          carries everything in it along at that rate. What deforms the body is the local acceleration
          minus the centre's. On the near side that residual points toward the perturber; on the far side
          it points away, because the far side is pulled less than average and so lags behind the shared
          motion. Nothing pushes the far side. This framing - free fall, then subtract - is what makes
          the two bulges obvious instead of paradoxical, and it is worth insisting on the word
          "difference" every time the class says "tide".`,
      },
      {
        heading: 'One power of mass, three of distance',
        body: `The tidal acceleration across a body of radius R at separation d from a mass M is about
          2GMR/d³. Students measure the M and the d dependences separately in steps 10 and 14 and never
          see the expression until step 12. The inverse cube is the surprising half: an inverse-square
          pull differenced across a small offset picks up one extra power of distance. The practical
          consequence, which is the through-line of the whole second half, is that proximity beats mass
          decisively. The Sun outweighs the Moon by 27 million and loses the tidal contest by a factor
          of 2.2.`,
      },
      {
        heading: 'The Roche limit is a competition, not a radius',
        body: `Setting the tidal stretch at a body's surface equal to that body's own surface gravity
          gives d = 2^(1/3)·R_sat·(M/m)^(1/3), which is exactly the classical rigid Roche limit. Written
          with densities it is the more familiar 1.26·R_primary·(ρ_primary/ρ_sat)^(1/3). The satellite's
          radius cancels: doubling a moon's size doubles both the stretch across it and its own surface
          gravity. What survives is the primary's mass and the satellite's density, which is why there
          is no single Roche radius for a planet and why step 25 asks for exactly that.`,
      },
      {
        heading: 'Rigid and fluid limits bracket a real answer',
        body: `A deformable body stretches as it approaches, which lengthens the lever the tide acts on,
          so it disrupts further out than a body that holds its shape. The fluid coefficient is about
          2.44 against the rigid 1.26, so the two limits differ by nearly a factor of two. The gap is
          physics, not error bars, and the lesson draws both arcs rather than one line. Below the scale
          where self-gravity dominates, material strength takes over entirely and the argument does not
          apply at all: a boulder is safe at any distance.`,
      },
    ],
    flow: [
      {
        steps: '1–8',
        text: 'The Earth-Moon system live, then the three-arrow panel. Students see that the pulls differ by seven percent, predict why there are two bulges, and are shown the subtraction that produces them. Ends with the definition of a tide as a difference.',
      },
      {
        steps: '9–15',
        text: 'The two scaling relationships, each predicted and then measured. Four distances give the inverse cube (with a straighten-the-curve transform on the plot); three masses give simple proportionality. The expression 2GMR/d³ appears at step 12, after the distance measurement and before the mass one.',
      },
      {
        steps: '16–19',
        text: 'Applying both relationships. Students predict the Sun-versus-Moon contest, read seven real tides off a logarithmic comparison chart, meet tidal locking and heating conceptually, and write the far-side bulge in their own words.',
      },
      {
        steps: '20–26',
        text: 'Disruption. Stretch is set against a body’s own surface gravity as two bars, the crossing point is measured and named as the Roche limit, the material is varied to show the limit moving, and a full screen is given to what a Roche limit does not predict.',
      },
      {
        steps: '27–30',
        text: 'The extreme case: the live tidal disruption scenario with its modelling honestly described, the tidal-radius-against-horizon panel and the hundred-million-solar-mass crossover, then the written synthesis and the summary.',
      },
    ],
    features: [
      {
        name: 'The three-arrow panel (steps 3, 6)',
        text: 'The centrepiece. At step 3 it draws the three pulls in true proportion, which makes them look identical on purpose; at step 6 it adds a second row showing what is left after the centre is subtracted, and states the magnification factor between the rows on the panel. Students who see only the second row learn a diagram; the pairing is what teaches the mechanism.',
      },
      {
        name: 'Straighten-the-curve transform (step 10)',
        text: 'The distance plot offers a "Try 1 ÷ distance³" button. Points that curve away sharply drop onto a straight line through the corner. This is where most classes recognise the inverse cube, and it is worth pausing on as a general method for identifying a power law.',
      },
      {
        name: 'The two-bar balance (steps 21, 22)',
        text: 'Green is the body’s own surface gravity, red is the tidal stretch. The distance slider moves only the red bar and the density slider only the green one, so the competition is easy to reason about. The crossing point the student finds is the Roche limit, and it is named only after they have measured it.',
      },
      {
        name: 'The Saturn Roche panel (steps 23, 24)',
        text: 'Two arcs, one for a body with no strength and one for a body that keeps its shape, against Saturn’s real ring geometry. Changing the density moves both arcs a long way, which is the argument that a Roche limit is not one distance. At high density the inner arc falls inside Saturn and the panel says so in words rather than clipping it.',
      },
      {
        name: 'Tidal radius against horizon (step 28)',
        text: 'A logarithmic drawing of the two lengths as the black hole mass runs from ten to a billion solar masses, with presets for a stellar-mass hole, Sagittarius A*, and a giant where the star is swallowed whole. The crossover near 1.6 × 10⁸ solar masses is stated on the panel.',
      },
    ],
    misconceptions: [
      {
        claim: 'Tides are caused by the Moon’s gravity being strong.',
        response:
          'They are caused by it being unequal. The single best counterexample is in the lesson at step 16: the Sun pulls the Earth about 180 times harder than the Moon does and raises less than half the tide. If a class takes away only one correction, this is the one.',
      },
      {
        claim:
          'The Moon pushes on the far side of the Earth, or gravity reverses there.',
        response:
          'Step 7 tests this directly. The far side is pulled toward the Moon like everything else, just less than the centre is, so relative to the planet’s shared free-fall motion it lags. The outward arrow is what is left after a subtraction, not a force. Watch for students who accept the arithmetic and still narrate a push.',
      },
      {
        claim:
          'The far-side bulge is centrifugal force from the Earth’s rotation.',
        response:
          'This one is stubborn because it appears in older textbooks. Two bulges appear for a non-rotating Earth held at a fixed distance too. Rotation is what carries an observer through the bulges twice a day; it is not what creates them. Offer the thought experiment of an Earth that does not spin.',
      },
      {
        claim:
          'Halving the distance quadruples the tide, because gravity is inverse-square.',
        response:
          'It multiplies it by eight. The pull does go as the inverse square, but the tide is a difference between two pulls, and closing in makes the two distances differ by a larger fraction as well as making both pulls stronger. Step 9 collects the wrong prediction on purpose and step 10 refutes it with the student’s own table.',
      },
      {
        claim:
          'The Roche limit is a fixed radius around a planet, inside which everything is destroyed.',
        response:
          'It depends on the density of what is falling in as well as on the planet, and there are two of them, bracketing rigid and deformable behaviour. Step 24 moves the limits by changing only the material. Step 26 adds that small bodies held together by material strength are exempt entirely.',
      },
      {
        claim: 'Crossing the Roche limit makes a body explode.',
        response:
          'Disruption takes time and sheds material from the ends first. Shoemaker-Levy 9 passed inside Jupiter’s limit in 1992 and became a line of about twenty fragments rather than a cloud. Step 26 is built around this, and it is the natural place to show the Hubble image if you have it.',
      },
    ],
    teachingNotes: [
      'Steps 3 and 6 are the lesson. If the room is short of time, cut from the middle third, never from here. Consider projecting step 6 and doing the subtraction out loud with the class before letting them work on.',
      'Step 5 collects the wrong prediction deliberately. Do not correct it in the room before step 6; the commitment is what makes the reveal land, and predictions are never graded on correctness.',
      'Step 10 is the longest screen. Four rows is the target but two are enough for the transform to work, so a student who is behind should be told to fill two and press the transform button rather than to hurry through four.',
      'Step 12 introduces 2GMR/d³ after both the prediction and the distance measurement. Students who have seen the expression before will want to skip ahead to it; the measurement is worth more than the formula and is where the retention is.',
      'Step 19 is the first written answer and the one worth grading by hand. The discriminator is whether the student compares the far side with the centre. "It is pulled less" alone is only half the answer.',
      'Step 27 runs the live disruption scenario. Expect students to over-read it. The screen says explicitly that Gravitas sheds debris by a rule rather than computing fluid flow, and it is worth repeating that out loud, because this is the one place in the lesson where the picture is more dramatic than the physics behind it.',
      'Step 29 is the summative written answer and maps directly onto the three learning objectives about cause, scaling and disruption. It grades quickly against the rubric.',
    ],
    discussion: [
      'The Sun pulls the Earth about 180 times harder than the Moon does and raises less than half the tide. What does that tell you about the difference between a quantity and its gradient?',
      'Tidal locking means the Moon shows us one face. What would have to be true for the Earth to show the Moon one face as well, and how long would it take?',
      'Io is kept molten by being kneaded. Where else in the Solar System might tidal heating matter, and what would you look for as evidence?',
      'The largest black holes swallow Sun-like stars whole, so they produce no flare. How would you go about finding a black hole that never tears anything apart?',
      'A Roche limit needs two objects to be stated. What other astronomical "limits" turn out to be relationships between two things rather than properties of one?',
    ],
    extensions: [
      'Have students look up a tide table for a real coastline and identify the spring and neap cycle in it, then check the dates against the phases of the Moon. The agreement is good; the two-hour offsets from local geography are a useful second conversation.',
      'Ask for the Roche limit of the Earth for a body of a given density, worked by hand from d = 1.26·R_Earth·(ρ_Earth/ρ_body)^(1/3), and compare with what the panel at step 22 reports. It is one cube root and it closes the loop between the measurement and the textbook formula.',
      'For students with calculus: differentiate GM/r² with respect to r and show that the leading term of the difference across a small offset R is 2GMR/d³, which is where the factor of two and the extra power of distance come from.',
      'Look up the light curve of a real tidal disruption event and ask what part of it the Newtonian estimate in step 28 does and does not predict. The timing of the peak is roughly accessible; the luminosity is not.',
    ],
    modelNotes: `The tidal and Roche calculations in this lesson are computed in js/tidalPhysics.js from the
      masses and separations shown, using the standard Newtonian expressions, and they are unit-tested
      against published values: the lunar tide at 1.10 × 10⁻⁶ m/s², the Earth-Moon rigid and fluid Roche
      limits at about 9,500 and 18,400 km, and the swallow-whole black hole mass at 1.6 × 10⁸ solar masses.
      What the simulation itself does is Newtonian N-body integration of point masses. It does not deform
      bodies, does not model internal friction, and does not evolve rotation under tidal torques, so tidal
      locking is presented at step 18 as a conceptual account and explicitly labelled as one. In the live
      disruption scenario at step 27 the engine sheds debris particles from a body that passes inside a
      threshold radius and then integrates those particles normally; that is a rule producing a plausible
      geometry, not hydrodynamics. There is no fluid, no pressure, no shock heating and no radiative
      transfer anywhere in Gravitas, and the deformation drawn in the Roche panel is an illustration of the
      outcome rather than a calculation of it. Step 28 states the same caveat for the compact-object case,
      where general relativity would also matter near the horizon and is not used. Every one of these
      limitations is named on the screen where it applies rather than only here.`,
    expectations: {
      3: 'At a distance of 1.00 the three arrows are visually indistinguishable, which is the intended reaction. The readout gives 3.43 × 10⁻⁵, 3.32 × 10⁻⁵ and 3.21 × 10⁻⁵ m/s², and the last row reports the near side as 6.9% larger than the far side. Students who slide the distance down to 0.2 will see the arrows separate visibly, which is worth encouraging.',
      6: 'The residual row shows about 1.1 × 10⁻⁶ m/s² outward on each side, roughly a thirtieth of the pull itself, and the panel reports the magnification between the two rows. The centre shows a dot rather than an arrow, and students regularly ask whether that is a drawing error; it is the answer.',
      10: 'At mass 1, the readings should be 0.13, 1.00, 8.00 and 64.00 times the lunar tide at distances of 2, 1, 0.5 and 0.25. The validator checks that stretch × distance³ is the same for every row and warns at a spread above 35%, which almost always means a strength read at a different slider position from the distance beside it. The transformed plot straightens to a line through the origin.',
      14: 'At distance 1, the readings should be 1.00, 2.00 and 4.00 at masses of 1, 2 and 4. The validator checks that stretch ÷ mass is constant and warns if the distance slider was moved during the run, which is the only common failure here.',
      17: 'The seven bars run from 5.05 × 10⁻⁷ m/s² for the Sun on the Earth to 68 m/s² for a stellar-mass black hole on the Sun at three million km. The two comparisons worth drawing out are the Moon beating the Sun by 2.2, and the last two rows differing by 1.2 × 10⁵ for a fifty-fold change in distance alone.',
      21: 'At 5 Earth radii and lunar density the green bar dwarfs the red one and the verdict reads HOLDS TOGETHER. The bars become equal near 1.50 Earth radii. Comet ice moves the crossing out to about 2.64 Earth radii and iron brings it in to about 1.22, which is the observation step 25 depends on.',
      23: 'With porous ice at 600 kg/m³ the no-strength limit is 2.47 Saturn radii, or about 149,000 km, and the keeps-its-shape limit is 1.27 Saturn radii. The A ring’s outer edge is at 2.27 Saturn radii and Mimas at 3.08, so the rings sit inside the outer limit and the innermost round moon sits outside it. That is the payoff of the screen.',
      24: 'Both arcs move inward as density rises: the no-strength limit runs from 2.47 Saturn radii at 600 kg/m³ to 1.14 at 6,000. Above roughly 2,500 kg/m³ the keeps-its-shape limit drops below one Saturn radius and the panel reports it as being inside Saturn itself rather than drawing it.',
      27: 'Bodies on close passages shed debris that spreads along the orbit; bodies passing further out are untouched. Students will ask whether the streams are real. The answer to give is that the geometry is plausible and the mechanism is a threshold rule, not a fluid calculation, which the screen also says.',
      28: 'At ten solar masses the tidal radius is about 1.9 million km against a 29.5 km horizon, a ratio of 6.4 × 10⁴. At Sagittarius A* the ratio is about 11. The two meet near 1.6 × 10⁸ solar masses, and the billion-solar-mass preset reads SWALLOWED WHOLE.',
    },
  },
};

/** @returns {Object|null} The instructor content for an investigation id */
export const instructorContentFor = id => INSTRUCTOR_CONTENT[id] ?? null;
