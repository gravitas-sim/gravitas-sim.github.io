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
          distance a·e either side of the centre. The star sits at one focus and the other focus is
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
        claim: 'The Sun sits at the centre of the ellipse.',
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
      a lesson to affect any measurement. Precession from general relativity is not modelled and is
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
        body: `A star is brighter at the centre of its disk than at the limb, because looking at
          the centre you see deeper and hotter layers. A planet crossing the middle therefore blocks
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
          presents a larger silhouette in an absorption band. Measuring depth as a function of colour
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
        text: 'Transmission spectroscopy: the planet changes size with colour.',
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
        text: 'Kinetic, potential and total, with the zero line marked. On the launch panel the numbers are deliberately not shown: the sign is the lesson, and simulation-unit energies labelled in joules would be worse than no number.',
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
        body: `Neither star orbits the other. Both orbit the barycentre, the balance point of the
          pair, which is why the two are always on opposite sides of it. The Sun does this too, in
          response to Jupiter; it is not a special property of equal-mass binaries.`,
      },
      {
        heading: 'The barycentre locates the mass ratio',
        body: `M_A·r_A = M_B·r_B, exactly as for a see-saw. The heavier star sits closer in and
          traces the smaller circle. Measuring the two distances therefore gives the ratio of the
          masses without knowing either one.`,
      },
      {
        heading: 'Size and period give the total',
        body: `In AU, years and solar masses, a³ = P²(M_A + M_B) with no constants to carry. The a in
          that relation is the semi-major axis of the *relative* orbit, the star-to-star separation,
          not one star’s distance from the barycentre. This is the single most common error in
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
        text: 'Both stars move, and there is a fixed point between them. Ends with the barycentre of an equal-mass pair.',
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
        text: 'Appears in several modes: plain, with the barycentre marked, with mass sliders, with AU rings for reading distances, with a stopwatch, and as a star-plus-planet with a magnified inset.',
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
          'Steps 3–5 are built to break this. Every diagram students have seen nails the Sun to the centre of the page.',
      },
      {
        claim: 'The barycentre is always midway between the two stars.',
        response:
          'Only for equal masses. Step 8 asks for the prediction before the sliders move.',
      },
      {
        claim: 'The heavier star moves faster because it has more force on it.',
        response:
          'It moves more slowly, on a smaller circle, in the same period. The forces on the two are equal and opposite.',
      },
      {
        claim: 'a is one star’s distance from the barycentre.',
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
      25: 'a³ = 64, P² = 16, so the total is 4 solar masses. A student who uses one star’s barycentre distance instead of the separation gets 0.5 and is told so.',
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
        text: 'Mass classes, a four-object lineup at clearly labelled separate scales, and the reveal that the mystery object is Sagittarius A*.',
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
};

/** @returns {Object|null} The instructor content for an investigation id */
export const instructorContentFor = id => INSTRUCTOR_CONTENT[id] ?? null;
