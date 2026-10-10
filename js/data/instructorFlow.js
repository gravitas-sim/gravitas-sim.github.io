// =============================================================================
// What students do, screen by screen: the flow table of each instructor guide
// -----------------------------------------------------------------------------
// Each block runs from one step sid to another, so inserting or moving a step
// cannot slide a block onto the wrong screens (the old key was a range of
// 1-based numbers, "18-22"). js/instructorFlow.js reads it through
// readVersioned, still reads the number-keyed /1 form, and works out the
// printed range from the lesson as it is. Not imported by any route. Generated
// once from instructorContent.js by tools/migrate-flow.mjs; edited by hand
// since, and tests/instructorDocs.test.js holds every lesson's flow to
// covering each step once.
// =============================================================================

export default {
  format: 'gravitas.instructor-flow',
  formatVersion: 2,
  lessons: {
    'lines-and-motion': [
      {
        from: 'light-by-wavelength',
        to: 'calcium-in-the-g-star',
        text: 'A real spectrum has dark lines in it, and the line list names them. Students read hydrogen in the A star and calcium in the G star, and see that which lines show depends on temperature.',
      },
      {
        from: 'predict-the-shift',
        to: 'doppler-arithmetic',
        text: 'A motion moves every line. Students predict the direction, measure two shifts on synthetic stars, read the sign as a direction and turn a shift into a speed by hand.',
      },
      {
        from: 'star-three',
        to: 'sideways-motion',
        text: 'A shift smaller than its uncertainty is not a detection, and a sideways motion leaves no mark: what a spectrum can and cannot say about motion.',
      },
      {
        from: 'one-sentence',
        to: 'what-you-worked-out',
        text: 'A written plan to settle star 3, and the close.',
      },
    ],
    'color-and-temperature': [
      {
        from: 'everything-glows',
        to: 'three-peaks',
        text: 'A blackbody and its peak. Students predict how heating moves the peak, then measure three peaks and see that peak times temperature is constant.',
      },
      {
        from: 'peak-of-4000',
        to: 'temperature-from-peak',
        text: 'Wien’s law in both directions: a peak from a temperature, and a temperature from a peak.',
      },
      {
        from: 'why-not-green',
        to: 'temperature-from-color',
        text: 'The Sun’s green peak and why it does not look green, then a color index as a thermometer: three B − V readings and a temperature recovered from a color.',
      },
      {
        from: 'real-stars-differ',
        to: 'what-you-worked-out',
        text: 'The limits of a blackbody as a model of a star, a written comparison of the two methods, and the close.',
      },
    ],
    'keplers-laws': [
      {
        from: 'eight-minutes-of-arc',
        to: 'what-sits-at-the-other',
        text: 'Tycho’s data and Kepler’s problem, then the anatomy of an ellipse with an eccentricity slider. Ends with the empty second focus.',
      },
      {
        from: 'measure-the-two-orbits',
        to: 'why-the-speed-changes',
        text: 'The second law. Students measure both orbits, watch the equal-area wedges, then measure speed at periapsis and apoapsis and write down why it changes.',
      },
      {
        from: 'kepler-s-third-law',
        to: 'what-the-constant-depends-on',
        text: 'The third law. Four planets are tabulated from the live Solar System, plotted automatically, and the constant is worked out and then used to predict a period.',
      },
      {
        from: 'what-newton-added',
        to: 'where-kepler-s-version-breaks',
        text: 'Newton’s correction. Students weigh TRAPPIST-1 from one planet’s orbit, then weigh a second star, and identify where Kepler’s version breaks.',
      },
      {
        from: 'where-this-leaves-you',
        to: 'where-this-leaves-you',
        text: 'A closing summary rather than a question: the shape of an orbit, the speed-for-distance trade, the power law recovered from the students’ own eight measurements, and a star weighed from naked-eye positions recorded before the telescope.',
      },
    ],
    'retrograde-motion': [
      {
        from: 'the-wandering-stars',
        to: 'watch-from-outside-first',
        text: 'The phenomenon is stated as history and then as a measurement: five wandering stars, and the fact that the only measurable quantity was a direction. Students then watch the system from outside and confirm for themselves that neither planet ever reverses. Everything that follows is about reconciling those two screens.',
      },
      {
        from: 'the-two-orbits',
        to: 'how-fast-each-one-goes',
        text: 'The two orbits are measured off the inspector and converted to angular speeds. The multiple-choice step in the middle is there to make students say out loud that the inner planet is the faster one, which is the entire mechanism and is easy to skate past.',
      },
      {
        from: 'the-synodic-period',
        to: 'a-lap-gained',
        text: 'The synodic period, computed twice. Step 9 uses the reciprocal formula, step 10 the rate of degrees gained. Students who get two different answers have usually put the longer period first in the subtraction.',
      },
      {
        from: 'before-you-look',
        to: 'what-the-trails-are-doing',
        text: 'A prediction is committed to before anything changes, then reference frames are introduced, then a screen explaining what the trails are actually doing. The last of these matters more than it looks: students who think the picture is being redrawn artistically will not accept the loop as evidence.',
      },
      {
        from: 'put-yourself-on-earth',
        to: 'nearest-and-furthest',
        text: 'The frame is switched and the loop appears. Students then put numbers on it: the direction from Earth running backwards, and the distance to Mars reaching a clear minimum and maximum. The direction readout is the observable the whole investigation rests on.',
      },
      {
        from: 'bright-and-backwards-together',
        to: 'say-it-in-your-own',
        text: 'The geometry is pinned down. Brightness and reversal are shown to be the same event, the reversal is located at opposition, the overtaking analogy is given, and students write the explanation in their own words. This short-answer step is the assessment center of the investigation.',
      },
      {
        from: 'what-it-cost-to-explain',
        to: 'counting-the-machinery',
        text: 'Ptolemy. The epicycle is presented as a device that worked rather than as a mistake, and students find the one-year period that a geocentric model has to accept as a coincidence, then count the twenty separate devices the five planets needed.',
      },
      {
        from: 'and-what-about-the-sun',
        to: 'which-one-is-moving',
        text: 'The Sun is examined in Earth’s frame, where it traces a clean annual circle with no loop, and students are then asked directly whether the loop proves heliocentrism. The intended answer is that it does not, and this is the step most likely to generate discussion.',
      },
      {
        from: 'frames-are-not-all-equal',
        to: 'why-tycho-found-nothing',
        text: 'What actually settles the question: the fictitious forces a geocentric frame requires, and stellar parallax. Tycho’s null result is treated as sound reasoning with an inadequate instrument, which gives a transferable investigation about what a non-detection constrains.',
      },
      {
        from: 'how-long-does-a-loop',
        to: 'what-you-did',
        text: 'A final measurement of the length of the retrograde episode, a prediction about Jupiter that students can check against the formula, and a closing screen that names the transferable question: measured against what?',
      },
    ],
    'transit-photometry': [
      {
        from: 'a-firefly-beside-a-lighthouse',
        to: 'where-the-depth-comes-from',
        text: 'Why planets are found indirectly, the five main methods, and a first transit watched live on HD 209458.',
      },
      {
        from: 'try-it-on-some-real',
        to: 'correct-it-and-get-a',
        text: 'Depth to radius. Students explore the depth–size relation, measure the real dip, discover the naive radius is too big, and correct it for limb darkening.',
      },
      {
        from: 'the-shape-of-the-dip',
        to: 'what-the-method-misses',
        text: 'The shape of the dip, viewing geometry and transit probability, ending in a written answer about survey bias.',
      },
      {
        from: 'getting-the-period',
        to: 'what-a-transit-cannot-tell',
        text: 'Timing. Two transits give a period; the period gives the orbit and an equilibrium temperature.',
      },
      {
        from: 'the-planet-changes-size-with',
        to: 'why-the-depth-moves',
        text: 'Transmission spectroscopy: the planet changes size with color.',
      },
      {
        from: 'things-that-are-not-planets',
        to: 'what-it-does-to-a',
        text: 'False positives and dilution. A hidden companion is found, imaged, and corrected for, recovering the true planet radius.',
      },
      {
        from: 'what-you-did-and-where',
        to: 'what-you-did-and-where',
        text: 'A closing summary rather than a question: one depth turned into a radius, then made more accurate three times over — limb darkening divided out, the impact parameter understood, and a star nobody could see corrected for.',
      },
    ],
    'orbital-energy': [
      {
        from: 'how-hard-would-you-have',
        to: 'where-is-the-line',
        text: 'The cannonball experiment. Students predict, fire at low and high speed, hunt for the dividing line, and identify what happens at it.',
      },
      {
        from: 'what-is-actually-deciding-this',
        to: 'what-stays-put',
        text: 'The reframing. Energy bars are introduced, the sign of the total is read, and students confirm it stays constant around a real orbit.',
      },
      {
        from: 'escape-speed',
        to: 'a-common-misunderstanding',
        text: 'Escape speed, and the misconception that gravity stops.',
      },
      {
        from: 'somewhere-else-entirely',
        to: 'three-shapes-one-law',
        text: 'What changes escape speed: mass, then starting distance. Ends with the three orbit shapes.',
      },
      {
        from: 'something-that-came-from-outside',
        to: 'what-you-worked-out',
        text: 'ʻOumuamua. Students check its energy themselves and decide in writing whether it will return.',
      },
    ],
    'weighing-stars': [
      {
        from: 'you-cannot-put-a-star',
        to: 'where-does-it-sit',
        text: 'Both stars move, and there is a fixed point between them. Ends with the barycenter of an equal-mass pair.',
      },
      {
        from: 'make-one-of-them-heavier',
        to: 'one-more-to-be-sure',
        text: 'Unequal masses. The balance point shifts toward the heavier star; the see-saw makes the mass ratio visible and then quantitative.',
      },
      {
        from: 'what-kepler-found-and-what',
        to: 'newton-s-version-and-what',
        text: 'Kepler’s third law and Newton’s correction, then a side-by-side comparison showing that the heavier pair orbits faster at the same separation.',
      },
      {
        from: 'a-practice-run',
        to: 'stop-and-look-at-what',
        text: 'The central measurement. Students practice on a known pair, then measure a mystery binary’s separation and period with a stopwatch and weigh it.',
      },
      {
        from: 'back-to-the-balance-point',
        to: 'the-answer',
        text: 'Splitting the total between the two stars using the balance point, and the reveal.',
      },
      {
        from: 'somebody-really-did-this',
        to: 'what-you-can-now-say',
        text: 'Sirius, measured from real observations, then a star with a planet, then one worked independently.',
      },
    ],
    'black-holes': [
      {
        from: 'not-a-hole-and-not',
        to: 'thirty-kilometers-is-not-very',
        text: 'What a black hole is not, what "size" could mean, and the event horizon at a fixed scale against familiar lengths.',
      },
      {
        from: 'now-make-it-heavier',
        to: 'the-rule-you-just-found',
        text: 'The mass experiment. Students record three trials, watch the points land on a straight line through the origin, and only then meet R_s ∝ M.',
      },
      {
        from: 'squeezing-and-getting-away',
        to: 'the-right-answer-for-the',
        text: 'Squeezing the Sun until the escape speed reaches c, followed by the careful statement that this is the right answer for the wrong reason.',
      },
      {
        from: 'which-one-is-denser',
        to: 'where-the-room-comes-from',
        text: 'The density surprise: prediction, ladder, then the zero-counting explanation.',
      },
      {
        from: 'which-one-is-hotter',
        to: 'colder-not-hotter',
        text: 'Hawking temperature, introduced cautiously, with a logarithmic thermometer.',
      },
      {
        from: 'then-what-happens-to-it',
        to: 'longer-and-then-much-longer',
        text: 'Evaporation lifetime on a bar chart that counts zeros rather than years.',
      },
      {
        from: 'from-city-sized-to-solar',
        to: 'it-has-a-name',
        text: 'Mass classes, a four-object lineup at clearly labeled separate scales, and the reveal that the mystery object is Sagittarius A*.',
      },
    ],
    'radial-velocity': [
      {
        from: 'the-planet-you-already-measured',
        to: 'watch-it-grow',
        text: 'The planet from the transit investigation returns, with the history that it was found by its star’s wobble first. Students predict which body moves, then use the reflex-motion instrument to see both orbiting the barycenter and to discover that more planet mass means a bigger stellar orbit.',
      },
      {
        from: 'light-carries-the-answer',
        to: 'toward-away-toward-again',
        text: 'Absorption lines and the Doppler shift are introduced from scratch, with the restriction that only line-of-sight motion produces a shift. The rv-observer instrument connects the star’s position on its orbit to the curve that motion produces.',
      },
      {
        from: 'open-the-real-instrument',
        to: 'read-k-off-the-panel',
        text: 'Students open the live Radial Velocity panel on the Exoplanet Characterization Lab scenario, watch a real curve build over two orbits, measure the period, and learn the definition of K before reading it off the panel.',
      },
      {
        from: 'what-would-make-k-bigger',
        to: 'weigh-hd-209458-b',
        text: 'A controlled experiment: hold everything fixed and change only planet mass. Students discover the linear relationship, then use it in reverse to weigh HD 209458 b from the K they measured.',
      },
      {
        from: 'now-tilt-the-whole-system',
        to: 'what-a-transit-adds',
        text: 'The inclination problem. The same planet is tilted and the reported mass falls away as sin i. M sin i is named, and students reason out why a transiting planet escapes the ambiguity.',
      },
      {
        from: 'a-face-on-system',
        to: 'different-methods-different-planets',
        text: 'Astrometry as the complementary method. Students tilt a system from edge-on to face-on and watch the sky path open from a line into a circle while the radial-velocity signal dies, then explore how distance and orbit size govern detectability.',
      },
      {
        from: 'bring-the-transit-back',
        to: 'where-does-hd-209458-b',
        text: 'The payoff. Transit radius and radial-velocity mass are combined into a bulk density, and the characterization panel adds stellar flux and habitable-zone context from the same habitability module The Goldilocks Question uses.',
      },
      {
        from: 'three-candidates',
        to: 'what-you-can-now-say',
        text: 'Three candidate planets, designed so that no single measurement identifies the best one. A short-answer step asks what is still unknown, and the investigation closes on the idea that combination, not any one technique, is what characterization consists of. The last screen is a closing summary: the chain from reflex motion to a density and a place on a diagram, and what a habitable-zone placement does not say.',
      },
    ],
    'goldilocks-question': [
      {
        from: 'what-does-earth-get-from',
        to: 'what-the-graph-says',
        text: 'Insolation is introduced with Earth as the unit. Students predict what doubling the distance does, measure three distances with the instrument and the graph on the same screen, and read the curve their own points make.',
      },
      {
        from: 'the-star-is-not-running',
        to: 'writing-it-down-then-using',
        text: 'Only now the explanation. Students step a shell outward one astronomical unit at a time and read off the areas 1, 4, 9, 16 before the inverse-square relation is written down, then apply it at an unfamiliar distance.',
      },
      {
        from: 'leave-the-planet-change-the',
        to: 'dim-stars-close-bands',
        text: 'The star changes instead of the planet. Students find that insolation tracks luminosity, then meet the habitable zone as a band and watch it move by a factor of fifty as the star changes.',
      },
      {
        from: 'saying-it-carefully',
        to: 'the-mars-problem',
        text: 'The careful definition, then the live Solar System with the zone drawn on it. Students classify four real worlds and then write a short answer about the one that makes the definition mean something: Mars is inside the zone and bone dry.',
      },
      {
        from: 'the-two-edges',
        to: 'venus-by-the-rule-you',
        text: 'What sets each edge, the conservative and optimistic prescriptions side by side, and the same comparison run on the live Solar System. Ends with an inverse-square calculation for Venus.',
      },
      {
        from: 'a-year-on-a-circular',
        to: 'reading-the-fraction',
        text: 'Orbits. A circular year gives a flat starlight curve; an eccentric one does not. Students watch the planet cross a zone boundary and interpret the fraction of the year spent inside.',
      },
      {
        from: 'a-real-system-forty-light',
        to: 'take-the-readings-yourself',
        text: 'TRAPPIST-1, with the real measured luminosity: a prediction, the diagram, the live seven-planet simulation, and a measurement screen where students take the readings themselves instead of being told the answer.',
      },
      {
        from: 'the-question-the-name-invites',
        to: 'what-you-worked-out',
        text: 'The turn. Does being inside the zone establish anything about the planet? Three candidates with similar insolation and different everything else, a follow-up-target choice, an unfamiliar case, and the synthesis.',
      },
    ],
    'missing-mass': [
      {
        from: 'two-ways-to-weigh-a',
        to: 'which-arrangement-gives-a-flat',
        text: 'A rotation curve is established as a tool before it is used as a result. Students rearrange a fixed amount of mass four ways in the "Where the mass is" instrument and watch the curve change shape, then commit in a choice step to which arrangement produces a flat curve. Nothing about dark matter has been mentioned yet.',
      },
      {
        from: 'the-solar-system-plotted',
        to: 'what-the-slope-means',
        text: 'The Solar System, plotted live from the simulation. Students read the fitted exponent off the Rotation Curve panel and then reason out, in a multiple-choice step, why it comes to -0.5. This is the case where light and motion agree, and it is the reference the rest of the investigation is measured against.',
      },
      {
        from: 'what-the-speed-tells-you',
        to: 'measure-the-enclosed-mass-yourself',
        text: 'The relation is worked backwards. The "What the speed tells you about the mass" instrument shows a curve and its enclosed mass together with a draggable radius marker, a choice step draws out what a flat curve requires, and then students record the enclosed mass at four radii and plot it. The four points fall on a straight line through the origin, which is what "proportional to radius" looks like.',
      },
      {
        from: 'now-a-galaxy',
        to: 'measure-the-real-curve',
        text: 'The prediction and the observation. Students predict the curve of a galaxy built on the assumption that light traces mass, measure it, then meet Rubin and Ford’s result in the same disc with the speeds telescopes actually find, and measure that too. The visible mass is identical in both; only the motion differs.',
      },
      {
        from: 'now-do-what-the-astronomers',
        to: 'why-a-heavier-disc-cannot',
        text: 'The fitting exercise begins, and this is the heart of the investigation. Students are handed a measured curve with error bars and a stellar disc with two free parameters, and asked to reproduce the data. They cannot. Step 15 has them record their own best attempt, and step 16 asks why a heavier disc does not rescue it: the shortfall is the wrong shape, not the wrong size.',
      },
      {
        from: 'now-add-the-halo',
        to: 'how-much-of-it-is',
        text: 'The halo goes in. Two more sliders, a fit that closes to within the measurement errors, and a numeric step in which students divide their own fitted halo mass by their own visible mass. The answer, about 3.4, is a number they produced rather than received.',
      },
      {
        from: 'what-the-halo-is-holding',
        to: 'take-the-halo-away-from',
        text: 'What the halo is holding. A single star is launched on a circular orbit at the speed a real galaxy gives it and the halo is switched off underneath it; then the same experiment runs on ninety stars in the live simulation and the disc unwinds from the outside in.',
      },
      {
        from: 'forty-years-earlier',
        to: 'measure-the-simulated-cluster',
        text: 'Zwicky and the Coma Cluster. The history is introduced, then students work the virial theorem on the real Coma Cluster in an instrument where both classic arithmetic mistakes are selectable, and only then switch to simulation units and record the member count, speed spread and radius of the simulated cluster by hand.',
      },
      {
        from: 'weigh-the-cluster-by-its',
        to: 'now-compare',
        text: 'The cluster calculation. Two numeric steps take students from the virial theorem to a dynamical mass and then to its ratio against the visible mass.',
      },
      {
        from: 'a-different-way-to-read',
        to: 'does-the-curve-decide',
        text: 'The other explanation, in four screens. MOND is introduced as what it is - an empirical observation that rotation curves stop falling at a particular acceleration, turned into a law - and then put on the same twelve measurements the halo was fitted to. Students discover that both reproduce the curve inside its error bars, that the halo spent three fitted numbers doing it and MOND spent one, and that the two disagree about how heavy the stellar disc is. A numeric step has them apply v⁴ = G M a₀ by hand, and a short-answer step asks what the curve can and cannot settle. Expect the question "so which one is right?" here; the honest answer is that this measurement does not say, and the step exists to make that a finding rather than a dodge. Nothing in the investigation asserts that either explanation is correct, and the answer key credits students who reach for evidence outside rotation curves.',
      },
      {
        from: 'what-have-you-actually-shown',
        to: 'where-it-stands',
        text: 'What it all establishes. A short-answer step asks what has and has not been shown, the mass-budget instrument puts the result in cosmological context, and the investigation closes on where the evidence stands and what remains unknown.',
      },
    ],
    tides: [
      {
        from: 'twice-a-day-everywhere',
        to: 'what-a-tide-actually-is',
        text: 'The Earth-Moon system live, then the three-arrow panel. Students see that the pulls differ by seven percent, predict why there are two bulges, and are shown the subtraction that produces them. Ends with the definition of a tide as a difference.',
      },
      {
        from: 'bring-the-companion-closer',
        to: 'what-the-mass-graph-says',
        text: 'The two scaling relationships, each predicted and then measured. Four distances give the inverse cube (with a straighten-the-curve transform on the plot); three masses give simple proportionality. The expression 2GMR/d³ appears at step 12, after the distance measurement and before the mass one.',
      },
      {
        from: 'the-sun-against-the-moon',
        to: 'say-it-in-your-own',
        text: 'Applying both relationships. Students predict the Sun-versus-Moon contest, read seven real tides off a logarithmic comparison chart, meet tidal locking and heating conceptually, and write the far-side bulge in their own words.',
      },
      {
        from: 'what-holds-a-moon-together',
        to: 'what-a-roche-limit-does',
        text: 'Disruption. Stretch is set against a body’s own surface gravity as two bars, the crossing point is measured and named as the Roche limit, the material is varied to show the limit moving, and a full screen is given to what a Roche limit does not predict.',
      },
      {
        from: 'the-extreme-case-running-live',
        to: 'what-you-worked-out',
        text: 'The extreme case: the live tidal disruption scenario with its modeling honestly described, the tidal-radius-against-horizon panel and the hundred-million-solar-mass crossover, then the written synthesis and the summary.',
      },
    ],
    'butterfly-effect': [
      {
        from: 'a-word-that-has-been',
        to: 'what-zero-proves',
        text: 'The three-star lab, introduced, then the reproducibility control: two runs changing nothing, which come out identical. Establishes determinism before anything diverges. Ends by asking what exactly zero proves, and the answer is narrower than most students expect.',
      },
      {
        from: 'a-control-before-the-interesting',
        to: 'linear-in-numbers',
        text: 'The two-body control. The Binary Pair scenario given a 1,500 km nudge separates steadily and linearly; the instrument declines to report an e-folding time and says the growth is proportional to time. This is the section to protect if time is short.',
      },
      {
        from: 'back-to-the-triangle',
        to: 'buying-more-time',
        text: 'The three-body case. Lagrange’s equilateral solution, Gascheau’s stability criterion, and why three equal masses make it unstable. Students measure the e-folding time from the shaded log-linear interval and work out the predictability horizon and what improving the measurement buys.',
      },
      {
        from: 'the-objection-you-should-have',
        to: 'reading-the-verdict',
        text: 'The numerical control. Repeat at half the simulation speed and with a different integrator, record each, and read the refinement verdict. Includes the hypothetical of an unresolved result and what to report about it.',
      },
      {
        from: 'not-every-three-body-system',
        to: 'what-you-established',
        text: 'What chaos is not: the Trojan asteroids and the figure-eight orbit as stable three-body configurations, a sorting question, a short-answer synthesis, a free exploration of perturbation size, then the real-world reach of the result, the sources, and the summary.',
      },
    ],
    'when-orbits-lock': [
      {
        from: 'four-moons-and-a-suspicious',
        to: 'where-do-the-line-ups',
        text: 'The four Galilean moons. Students predict the Io–Europa ratio, measure all four periods, and meet the counter-example: the tidiest ratio in the system belongs to the moon that is not resonant. Ends on why small-integer ratios are dense enough to be worthless as evidence.',
      },
      {
        from: 'watch-the-line-ups',
        to: 'the-resonant-angle',
        text: 'Conjunctions. A prediction most students get wrong - that line-ups cluster in a fixed direction in the sky - followed by the measurement showing they drift, and the explanation: the orbits themselves precess, so a direction in the sky is the wrong thing to measure.',
      },
      {
        from: 'the-laplace-argument',
        to: 'one-percent',
        text: 'The resonant angle, built from mean longitudes and longitudes of periapsis, then applied to the Laplace argument. The instrument moves through three verdicts as the run lengthens; students are told to start it and read on. Closes with the algebra showing that 180 degrees means the three moons are never all in conjunction.',
      },
      {
        from: 'break-it',
        to: 'the-orbit-that-crosses-and',
        text: 'The paired control and the awkward case. Europa moved one percent out and the argument circulates in forty-seven Io orbits. Then Callisto’s 7:3, which stays inconclusive for the whole run, and the question of what that establishes.',
      },
      {
        from: 'measure-pluto-s-resonance',
        to: 'sixty-degrees-ahead',
        text: 'Pluto and Neptune. The crossing orbits, the 3:2, the libration measured in ninety seconds, the conjunctions clustered at Pluto’s aphelion, and the one line of algebra that connects the two. A third body on nearly the same orbit but outside the resonance circulates and is scattered.',
      },
      {
        from: 'the-rotating-frame',
        to: 'what-you-can-and-cannot',
        text: 'The Trojans in the rotating frame: an exact equilibrium, a real tadpole libration, an unstable equilibrium that departs, and a non-co-orbital body whose ratio is closer to 7:5 than Pluto’s is to 3:2. The distinction between an equilibrium and a stable equilibrium is the target here.',
      },
      {
        from: 'the-report-you-would-write',
        to: 'where-this-goes',
        text: 'The four cases sorted two ways - by how good the ratio is, and by whether they are resonant - which give different orders. Then a referee-style question about a paper that overclaims, and the closing survey: Kirkwood gaps, plutinos, Io’s volcanism, and resonant chains as evidence for migration.',
      },
    ],
    'detect-this-planet': [
      {
        from: 'twelve-nights',
        to: 'what-decides-whether-you-find',
        text: 'The framing: twelve nights, one star, and the question of whether the schedule would find a planet rather than whether one is there. Students commit to which of four choices matters most before seeing any data.',
      },
      {
        from: 'schedule-a-twelve-nights-one',
        to: 'what-have-you-established',
        text: 'Schedule A - twelve measurements across one orbit - in the survey-schedule instrument. Students read phase coverage, scatter and chi-square, then face the key question: the most this establishes is that the velocity is not constant.',
      },
      {
        from: 'schedule-b-twelve-nights-thirty',
        to: 'why-it-failed',
        text: 'Schedule B, the same twelve measurements at 3.52-day intervals. Students predict, observe the folded panel collapse into two bins, record the numbers, and work out that the cadence is one orbital period.',
      },
      {
        from: 'the-third-knob',
        to: 'ambiguous-evidence',
        text: 'Precision isolated: a Neptune on the good schedule is invisible at 8 m/s and obvious at 1 m/s. Then the ambiguous-evidence question, which is the investigation’s hardest and the one most worth discussing aloud.',
      },
      {
        from: 'do-it-to-the-real',
        to: 'take-the-data-with-you',
        text: 'The synthetic observing run in the live Radial Velocity panel, against the simulated star, followed by the CSV export. Schedule A completes in about thirteen seconds of wall clock.',
      },
      {
        from: 'the-limits-of-finding-nothing',
        to: 'the-limits-of-finding-nothing',
        text: 'A written question on the limits of a nondetection: what a flat dataset excludes, and what it leaves open.',
      },
      {
        from: 'the-other-way-to-find-one',
        to: 'how-deep-is-an-earth',
        text: 'The turn to transits. The depth of a transit is a ratio of areas, and students compute the 84 ppm an Earth would make across the Sun - a number that comes back at step 23 as a planet TESS cannot reach.',
      },
      {
        from: 'the-noise-budget',
        to: 'the-floor',
        text: 'The noise budget instrument, opening on a Kepler hot Jupiter at a depth-over-noise of 587. Students predict what the same planet does from three nights on the ground, then watch it fall to about 4 - and then find that three hundred nights take it to 31, but no further than a ceiling of 49.',
      },
      {
        from: 'white-noise-and-red-noise',
        to: 'assumptions-of-the-model',
        text: 'Three noise terms rather than two and why they scale differently, then what the model is pretending - the middle term is treated as perfectly correlated within a transit and perfectly independent between them, and reality is neither. The second of these is the screen to slow down on.',
      },
      {
        from: 'read-two-budgets',
        to: 'why-more-nights-do-not-help',
        text: 'A measurement of both budgets side by side, then the question that names the ceiling: two of the three terms average down and one does not, which is why three hundred nights bought a factor of eight rather than ten and why it stops at 49.',
      },
      {
        from: 'the-edge-of-what-tess-can-do',
        to: 'what-would-it-take',
        text: 'Three real TESS cases in order of difficulty: Pi Mensae c at 10.5, TOI-700 d at 2.7 after a year of sectors, and an Earth twin at 0.6 whose ceiling is 2.8 - unreachable however long anyone observes. Then what would actually have to change.',
      },
      {
        from: 'what-you-decided-before-you',
        to: 'what-you-decided-before-you',
        text: 'The closing statement, now covering both halves: the radial-velocity failure could have been repaired by observing differently, and the photometric one only by lowering the persistent floor.',
      },
    ],
    'design-the-schedule': [
      {
        from: 'eight-nights',
        to: 'set-the-run-up',
        text: 'The framing - eight nights, one star, the times to be decided in advance - and the setup of the live panel: baseline 24.673 d, uncertainty 8 m/s, seed schedule-1, regular cadence, eight observations. Have students write down the schedule checksum the note prints.',
      },
      {
        from: 'predict-the-comb',
        to: 'run-both-schedules',
        text: 'The prediction, collected before anything is observed, then the comparison run itself. This is the long screen: about seven simulated orbits. It is a good moment to poll the room on the prediction and to point out that the second arm is not a second run.',
      },
      {
        from: 'read-the-comparison',
        to: 'is-irregular-better',
        text: 'Reading the two arms, then the two questions that decide what the reading is worth: what a window peak of 100% means, and what one draw of each schedule does and does not establish. The second is the harder one and the one worth discussing aloud.',
      },
      {
        from: 'break-your-own-result',
        to: 'break-your-own-result',
        text: 'Changing the noise seed and running again, to separate the geometric failure of the comb from the luck in the irregular arm.',
      },
      {
        from: 'predict-the-weather',
        to: 'type-the-dates',
        text: 'The run as it actually arrives: a weather gap typed into the panel, which drops epochs and can break the control, and then a hand-typed list of times, which is also where students discover that unreadable entries are reported rather than dropped.',
      },
      {
        from: 'the-range-you-searched',
        to: 'what-you-decided',
        text: 'What a number has to be quoted with - the range searched, the schedule, the seed - and the closing statement that a schedule is not administration around a sampled measurement but the measurement itself.',
      },
    ],
    'binary-star-planets': [
      {
        from: 'two-suns',
        to: 'what-survived-will-mean',
        text: 'The system and the vocabulary. Two stars of 1.0 and 0.5 solar masses, 10 AU apart at e = 0.4, every parameter stated rather than generated. Students commit to a prediction for the stable radius, and are told before measuring anything that a finished run will be reported as "survived this integration" and why that is not "stable".',
      },
      {
        from: 'run-the-default',
        to: 'why-so-quiet',
        text: 'The quiet run: the planet at 0.15 separations for twenty binary periods, about half a minute of wall clock. Students record four numbers and answer why the companion barely matters at that radius - proximity, not mass.',
      },
      {
        from: 'move-it-out',
        to: 'ejected-means-what',
        text: 'The planet moved to 0.30. It is ejected within about three binary periods after one close pass. Students predict first, then measure when it left, then work out why positive energy alone is not enough to call something an ejection.',
      },
      {
        from: 'work-out-the-boundary',
        to: 'what-the-fit-assumes',
        text: 'The published boundary. Students compute a_c = 0.177 separations from the fit and find their two runs on either side of it, then answer which of four departures from the fit’s assumptions would most clearly put a real system outside its scope. (Inclination, because the fit is two-dimensional and Kozai-Lidov is not in it.)',
      },
      {
        from: 'a-harder-question',
        to: 'energy-drift-as-a-screen',
        text: 'The turn. What a timestep is, why a close approach is where it fails, and the energy screen - demonstrated by running 0.50 separations, which starts the planet almost on top of the companion and produces a refusal rather than a result.',
      },
      {
        from: 'predict-the-sweep',
        to: 'is-it-resolved',
        text: 'The sweep. Students predict the trend, run the same twenty-period experiment at five radii with everything else held fixed, read the outcomes off the table and the plot, and then re-run the trial at the change of outcome at half the step. It replaces three manual runs and the copying that went with them: the machine time is about the same, four to seven minutes, and it is spent discussing the prediction rather than typing. The plot deliberately draws no line through the points.',
      },
      {
        from: 'the-case-that-matters',
        to: 'report-it',
        text: 'The case the investigation is built around. 0.25 separations, run at timesteps of 1.0, 0.5 and 0.25. The outcome changes; the energy drift stays under a part in a million throughout. Students record all three, choose what to report, meet the convergence rule, and write two or three sentences reporting the configuration honestly. This is the longest stretch and should not be rushed.',
      },
      {
        from: 'around-both',
        to: 'how-without-a-pass',
        text: 'Circumbinary planets. Kepler-16b as the real example, a prediction about which direction the danger lies, then one explore covering 4.0 separations (survives) and 2.0 (ejected in about 3.4 periods with no close encounter at all), a measurement of both, and the question about what drove it out.',
      },
      {
        from: 'circumbinary-boundary',
        to: 'who-is-wrong',
        text: 'The circumbinary boundary at 3.6 separations, then the deliberate disagreement: 3.0 and 2.5 both survive forty periods although the fit excludes them, with excursions to 14 and 25 separations. Students are asked who is wrong, and the answer is neither - forty periods is four thousandths of what the fit was calibrated on.',
      },
      {
        from: 'the-strongest-claim',
        to: 'what-you-can-say',
        text: 'The strongest claim the work supports, written out in full so students can see how long an honest one is, and a closing summary of every result together with the three things the model leaves out: it is flat, the planet is a test particle, and the stars are points drawn ten times life size.',
      },
    ],
    'gravity-assist': [
      {
        from: 'voyager-left-faster',
        to: 'which-side-gains',
        text: 'Voyager 2 arriving at Jupiter at 10 km/s and leaving at 26 with its engines off, then the stripped-down version on screen and why it has no star. Students commit to which side of the planet gains before running anything.',
      },
      {
        from: 'fly-the-gaining-pass',
        to: 'the-vector-addition',
        text: 'The gaining pass, flown by hand, about nine seconds of wall clock. Students record all four speeds, face the central question, and are given the vector addition. This is the part to slow down for.',
      },
      {
        from: 'the-other-side',
        to: 'why-not-mirror-image',
        text: 'The retained comparison: both sides at once, about a minute of wall clock, both results kept on screen. Then three numbers off the table, then why the loss is smaller than the gain - which is geometry rather than physics and catches almost everybody.',
      },
      {
        from: 'the-ceiling',
        to: 'the-planets-frame-is-two-frames',
        text: 'The ceiling of twice the approach speed, the recoil and the momentum ledger, where the energy actually came from, and then the sharpest screen in the investigation: whose frame, exactly, and what survives a change of one.',
      },
      {
        from: 'sweep-the-impact-parameter',
        to: 'explain-the-sweep',
        text: 'Optional, about five minutes, three of them the sweep running. Five impact parameters on the gaining side, and the question of whether the biggest turn must give the biggest gain. Skip the whole block if the period is short; nothing after it depends on it.',
      },
      {
        from: 'now-with-a-sun',
        to: 'what-this-leaves-out',
        text: 'The same encounter with a star, the residuals it introduces, what they mean, and the three things the model leaves out.',
      },
    ],
    'hohmann-transfer': [
      {
        from: 'the-problem',
        to: 'try-radial',
        text: 'The problem, then a prediction about pushing straight outward, then a preview of a radial burn that leaves the angular momentum untouched. Nothing is applied yet; the planner previews without changing the world.',
      },
      {
        from: 'transverse-is-the-lever',
        to: 'why-slower-further-out',
        text: 'Why transverse is the lever and why the change appears on the far side, then measuring the two circular speeds and asking why the outer body is slower. Straightforward, and worth moving through briskly.',
      },
      {
        from: 'the-transfer-ellipse',
        to: 'first-burn-size',
        text: 'The transfer ellipse, its semi-major axis, the departure speed from vis-viva, and the size of the first burn. This is the arithmetic core - budget half the investigation time here and let students check each other.',
      },
      {
        from: 'apply-the-first-burn',
        to: 'where-the-change-appeared',
        text: 'Applying the first burn and reading where the orbit changed. The preview should show apoapsis at 2.5 AU before they press Apply; a student whose preview disagrees has mistyped, and Undo restores the whole world.',
      },
      {
        from: 'transfer-time',
        to: 'read-the-arc',
        text: 'The transfer time from Kepler’s third law, the coast itself, and the prediction about doing nothing on arrival. The coast takes about 423 simulated days; use the speed control rather than waiting.',
      },
      {
        from: 'second-burn-size',
        to: 'when-this-is-true',
        text: 'The second burn, circularizing, the total cost, why both burns were accelerations, and what the whole answer depended on. The last screen is the one to leave time for.',
      },
    ],
    'lagrange-points': [
      {
        from: 'two-stars-and-a-speck',
        to: 'predict-forbidden',
        text: 'The system, the rotating frame, the normalization, and a prediction about whether speeding up opens or closes the forbidden region. Set the units carefully here - every number later is in them.',
      },
      {
        from: 'the-jacobi-constant',
        to: 'why-conserved-matters',
        text: 'The Jacobi constant, reading it twice to see it hold, and what a conserved quantity is worth when the trajectory is unsolvable. Screen 6 is the conceptual center of the first half.',
      },
      {
        from: 'five-places',
        to: 'critical-order',
        text: 'The five points, the equilateral geometry of L4, and the ordering of the critical values. Brisk; the arithmetic is one line.',
      },
      {
        from: 'open-the-neck',
        to: 'accessible-not-reachable',
        text: 'Open the L1 neck with a burn, and predict what an open neck licenses. Everyone opens it differently, which is deliberate and is why the next two screens exist.',
      },
      {
        from: 'predict-same-region-same-path',
        to: 'watch-it-not-cross',
        text: 'The controlled version, and the heart of the second act: one tracer, one place, one speed, two directions, so the accessible region is identical by construction and the trajectory is the only thing left that can differ. About a minute of running. Budget time here and resist resolving the ambiguity beyond what the runs show - "did not cross in two periods" is the whole finding.',
      },
      {
        from: 'stability-is-different',
        to: 'trojans',
        text: 'Stability as a third question, the surprise that L4 and L5 are stable at maxima, and the Trojans. This is the part students remember.',
      },
      {
        from: 'break-it',
        to: 'three-claims',
        text: 'Break the assumptions deliberately and watch the overlay refuse, then the eccentric case, then the three claims restated side by side. Leave time for the last screen.',
      },
    ],
    'what-is-a-gravitational-wave': [
      {
        from: 'travel-without-shining',
        to: 'what-has-to-change',
        text: 'What has to be happening — Screen 1 is a prediction and is designed to be got wrong; do not resolve it early, and make sure it is written down, because screen 27 comes back to it. Screen 4 is the conceptual core of this quarter: the pulsating sphere emits nothing, and students who answer "B, because it is moving" have exposed the misconception the screen exists for. Spend a minute there. Screens 3 to 5 are the argument, and screen 4 is where it lands: an enormous amount of motion — a sphere swelling and shrinking — and nothing leaves it. Take a show of hands before revealing that one; "it is moving, so it radiates" is the answer most of a room gives, and it is the misconception the investigation exists to remove. The canvas shows each source in turn because the control puts it there.',
      },
      {
        from: 'watch-the-pair',
        to: 'follow-a-disturbance-outward',
        text: 'The source and its rhythm — Screen 6 is the one to slow down on. Students reliably answer "a full orbit"; the half-orbit answer, and the reason for it - two identical objects swapped over look the same - is what makes the factor of two on screen 16 land rather than being a fact to memorize. Screen 7 introduces the ring overlay and says plainly that the speed is slowed and the rings are not matter.',
      },
      {
        from: 'freely-floating-markers',
        to: 'can-space-carry-a-sound',
        text: 'What arrives — The physical heart of the investigation. Screen 11 is the one students most often need help with: the markers are not carried along, and the water-cork analogy is the one place a water analogy helps. Screen 12 is where the exaggeration is admitted, and it is worth pausing on the atom-across-an-astronomical-unit comparison. Screen 14 heads off "we heard the black holes" before anybody says it.',
      },
      {
        from: 'slower-pair-faster-pair',
        to: 'where-the-calculation-stops',
        text: 'Shrinking orbits and the chirp — Screen 16 is the only counting exercise and it is worth the time: students count orbits on the canvas and peaks on the plot themselves and get two. Screen 17 draws the line between the energy argument and the sandbox’s own illustrative damping, which matters because the rest of Gravitas uses the latter. Screen 19 establishes that the plot ends because the model was switched off, not because anything happened.',
      },
      {
        from: 'different-compact-pairs',
        to: 'what-two-observatories-recorded',
        text: 'Other pairs, distance, and a measurement — Screen 21 is a clean controlled comparison - only the distance moves, and the frequency does not - and its validator checks the factor of two. Screen 22 is the payoff: the L-shape follows from the transverse stretch and squeeze the students have already watched, and the published trace is the first and only observation in the investigation.',
      },
      {
        from: 'design-one-small-experiment',
        to: 'what-you-worked-out',
        text: 'Their own experiment, and the story — Screen 26 is deliberately open and deliberately small: one variable, two readings, and a statement of what was held fixed. Screen 27 is the assessment. Read the revisit of screen 1 as carefully as the explanation - a student who can say why their first answer was wrong has done the investigation. The last screen is a closing summary of the five things the investigation established.',
      },
    ],
    'listening-to-spacetime': [
      {
        from: 'an-unlabeled-signal',
        to: 'find-your-way-around',
        text: 'An unlabeled signal, a prediction about what made it, then the reveal and the three-kinds-of-picture screen. Screen 2 is the one to slow down on: if a class leaves without the distinction between the animation, the schematic and the plots, the rest lands differently. Screen 3 is controls practice and can be brisk.',
      },
      {
        from: 'predict-as-it-tightens',
        to: 'explain-the-chirp',
        text: 'The chirp, measured. A prediction, the wave overlay, the two-per-orbit count, two frequency readings, a saved evidence capture at 50 Hz, and a written explanation. The counting exercise at screen 6 takes longer than it looks and is worth the time.',
      },
      {
        from: 'predict-heavier',
        to: 'the-one-mass-that-matters',
        text: 'Mass. A prediction about time in band, the first controlled comparison, a three-way table, and the chirp-mass surprise. Screen 13 lands best if students have not been told the answer at screen 11.',
      },
      {
        from: 'predict-twice-as-far',
        to: 'edge-on',
        text: 'Distance and geometry. The vertical scale is pinned across screens 15 and 16 so the comparison is honest; screen 16 is where the degeneracy appears and it is the hardest idea in the investigation.',
      },
      {
        from: 'three-sources',
        to: 'where-the-model-stops',
        text: 'The three presets side by side, then the limits screen. Screen 18 is a multiple-choice question but it is really the conceptual close of the model half.',
      },
      {
        from: 'add-the-noise',
        to: 'looks-like-is-not-enough',
        text: 'Noise, and what a similarity number is and is not. Expect this pair to generate the most discussion in the room.',
      },
      {
        from: 'what-they-actually-recorded',
        to: 'model-against-measurement',
        text: 'The real data. Students find the seven-millisecond shift and the sign flip themselves before the readout confirms them, then see the residual. Do not shortcut the finding.',
      },
      {
        from: 'five-recordings',
        to: 'measured-or-supplied',
        text: 'Five more mergers, read from open strain. The measurement screen and the ranking prediction are the core: students rank four pairs by chirp mass from a frequency they read themselves, before any catalog value is on the screen, and the catalog confirms it. Budget twenty minutes. Screen 27 is where the class learns why the highest signal-to-noise event is the one with nothing measurable on its map, and screen 29 asks the question the whole block is for: what was measured here, and what was supplied.',
      },
      {
        from: 'your-own-experiment',
        to: 'where-this-leaves-you',
        text: 'The open challenge and the written conclusion. Budget fifteen minutes: the challenge is the only screen with no right answer and it is where the experimental-control habit either shows up or does not. The last screen is a closing summary: what the chirp fixes, what it leaves open, and why a chirp is not a detection.',
      },
    ],
    'a-universe-of-stars': [
      {
        from: 'three-stars-no-labels',
        to: 'measure-the-radius-ratio',
        text: 'Four words that are not synonyms — The opening prediction is designed so that every "they go together" answer is wrong about these particular stars. Do not resolve it early; screen 2 reveals the numbers and screens 4 to 6 build the relation that explains them. Screen 3 is free exploration of color and is deliberately ungraded.',
      },
      {
        from: 'the-two-axes',
        to: 'lines-of-constant-radius',
        text: 'The diagram, and what a point on it means — All five screens are in free-cursor mode. Expect the reversed temperature axis to catch most of the room on screen 7; the validation catches a student who moved the wrong way and says why. Screen 11 turns on the constant-radius reference lines, which are straight lines on these axes - worth showing on the board as log L = 2 log R + 4 log T.',
      },
      {
        from: 'switch-to-modeled-stars',
        to: 'what-the-trend-covers',
        text: 'The main sequence, and its limits — Screens 13 and 15 are the quantitative core. Screen 16 is a short written answer and the first place the investigation checks whether "main sequence" has landed as a stage rather than a category. If time is short, screen 15 can be demonstrated from the front rather than done individually.',
      },
      {
        from: 'two-red-stars',
        to: 'classify-from-position',
        text: 'Everything that is not on the main sequence — The strongest fifteen minutes in the investigation. Screen 17 has two stars of identical color differing by a factor of 426 in radius. Screen 20 is a prediction and the one to hold the room on: a hot star that is faint has to be tiny, and the fourth option - "you cannot tell without the mass" - is the habit the whole investigation is trying to break. Take a show of hands before revealing it. Screen 21 needs the age slider paced by phase, which the step sets automatically; the tip invites students to switch it back and watch the whole post-main-sequence collapse into a sliver.',
      },
      {
        from: 'predict-who-lives-longer',
        to: 'measure-the-lifetimes',
        text: "Why the big ones go first — Screen 22 is a prediction most students get wrong for a good reason, and the discussion is better if they commit first. Screen 23 carries the investigation's one genuinely unverifiable number and says so: no 0.2 solar-mass star has ever finished its main sequence anywhere.",
      },
      {
        from: 'a-population',
        to: 'find-a-counterexample',
        text: 'A population, counted twice, and a challenge — One population, one histogram and one canvas across screens 25 to 28; only the cut changes, and it now moves the canvas as well as the plot. Screen 26 is the prediction and it is worth a show of hands - "almost none" is the answer nearly nobody offers before seeing it. The written answer on screen 28 is the one worth collecting; see the rubric, and in particular the wrong answer it rejects. Screen 29 is open and accepts either counterexample; the validation recognizes both and nudges a student whose two stars break neither rule.',
      },
      {
        from: 'spectra-the-light-itself',
        to: 'spectra-four-is-four',
        text: "What a color cannot tell you — The only part of this investigation built on observations. Four real SDSS spectra, and an argument in four moves: screen 31 shows that a color works, screen 32 removes the color and shows that a feature still separates the four, screen 33 asks for a classification with no color on the screen at all, and screen 34 asks for the general statement in the student's own words. The one to hold the room on is the calcium column on screen 32: it rises from the A star to the G star and falls again to the M star, and a quantity that rises and falls cannot be recovered from a temperature. That is the whole argument, and it is not an argument about instruments being nicer. Screen 33 is the one to watch students do rather than collect - see the classroom check below. Say once, out loud, that these four are measurements and that the eight tracks behind the first twenty-nine screens are not.",
      },
      {
        from: 'the-argument',
        to: 'what-the-diagram-is-for',
        text: 'The argument, and the summary — Screen 36 puts the step 1 prediction back on screen and is the summative piece. The last screen is a closing summary: the five quantities, what the main sequence fixes, what a position on the diagram does not, and the one point the spectra added that no model in this investigation could.',
      },
    ],
    'lives-of-stars': [
      {
        from: 'three-futures',
        to: 'arriving',
        text: 'Before there is a star — The opening prediction is worth protecting: do not resolve it, and note that the two wrong answers about the small and the Sun-like star are corrected at screens 22 and 18 respectively. Screen 2 is the cloud, which carries no numbers at all, and the readout says why - that refusal is the investigation, not a gap. All three stars now stand on the main canvas rather than only on the comparison card, and they are half way through their own main sequences - the same FRACTION of a life, not the same age. That is the deliberate contrast with screen 23, which lines two stars up at the same number of years and gets a completely different picture. Name the difference here; a class that misses it reads screen 23 as contradicting this one.',
      },
      {
        from: 'the-sun-today',
        to: 'core-in-envelope-out',
        text: 'The long part, and what ends it — Screen 8 is where a student sees that the Sun has already brightened by a third since it arrived, which kills the picture of a star sitting at one point for ten billion years. Screen 10 is the core-hydrogen prediction and the most important single screen in the investigation; give it time before revealing.',
      },
      {
        from: 'predict-direction',
        to: 'how-long-was-each-part',
        text: 'Giant, ejection, cinder — Screen 16 exists to stop the tidy story: after helium ignites the star does not carry on getting bigger and redder, it drops and loops back. Screen 18 is the "the Sun will explode" correction. Screen 21 is the duration comparison and is the one to keep if you are short of time.',
      },
      {
        from: 'predict-the-red-dwarf',
        to: 'massive-versus-sun',
        text: 'The two ends of the mass range — Screen 22 is the red dwarf, and the point is that almost nothing happens to it. Screen 23 is explicitly a same-age comparison and says so - the distinction between comparing at the same age and at the same fraction of a life is set up here and used again at screen 33.',
      },
      {
        from: 'supergiant-and-burning',
        to: 'the-black-hole',
        text: 'What the heavy ones do — Screen 27 is a written answer about iron and is the hardest question in the investigation. Screens 29 and 31 are the two endpoint cases, and the contrast between them is deliberate: one is confident, one is a range spanning a factor of three with no bright supernova expected.',
      },
      {
        from: 'read-the-descriptions',
        to: 'what-you-followed',
        text: 'Reading it back — Screen 32 has "not enough information" as its correct answer, which students find harder than any of the physics. Screen 33 is the open challenge and screen 34 the summative piece, which requires naming a limitation of the models. The last screen is a closing summary: mass to luminosity to lifetime, what is left behind, and what these models do not model.',
      },
    ],
    'twelve-nights': [
      {
        from: 'the-allocation',
        to: 'measure-the-window',
        text: 'The allocation, and measuring what it actually buys: five hours a night, walking 3.9 minutes earlier each time. The drift is the number everything later depends on.',
      },
      {
        from: 'predict-the-comb',
        to: 'measure-the-window-power',
        text: 'Predict the comb, then see it in the spectral window, and measure how far the peak falls when the full width of the window is used instead of its middle.',
      },
      {
        from: 'why-not-one-day',
        to: 'why-not-one-day',
        text: 'Why the peak sits at the sidereal day and not at one cycle a day. Worth not rushing: it is the evidence that the comb was imposed rather than chosen.',
      },
      {
        from: 'predict-which-plan-wins',
        to: 'read-what-you-got',
        text: 'Commit both plans to the live spectrograph, in sequence with one seed, and read an alias off one of them.',
      },
      {
        from: 'sixty-nights-would-not-help',
        to: 'what-the-sky-decided',
        text: 'What nine more weeks would have bought, what would actually fix it, and what a period has to be quoted with before anybody else can check it.',
      },
    ],
    'power-law-gravity': [
      {
        from: 'the-exactly',
        to: 'predict-does-small-matter',
        text: 'What is being changed, and why it needs an anchor. Step 2 is the conceptual one and should not be rushed; step 3 is a held prediction about whether a 2.5% change in n could matter.',
      },
      {
        from: 'first-look-at-the-orbit',
        to: 'what-closes-an-orbit',
        text: 'The precession experiment. Students step through four exponents and watch the ellipse stop closing, including a shallower-than-Newton case that precesses backwards. Ends on Bertrand’s theorem.',
      },
      {
        from: 'predict-is-it-the-computer',
        to: 'the-refinement-verdict',
        text: 'Is it real? A prediction, then a four-timestep refinement, then the verdict. The n = 2 control reading zero at every timestep is what stops the refinement result being vacuous.',
      },
      {
        from: 'predict-period-and-distance',
        to: 'why-the-slope-and-not-something-else',
        text: 'The quantitative half. Four measured slopes, a linear pattern, a numeric prediction at an exponent not measured, and then the question of why the slope in particular is worth measuring rather than anything else.',
      },
      {
        from: 'predict-what-breaks',
        to: 'and-energy',
        text: 'What does not break. A prediction most students get wrong, the conservation readouts at two exponents, the reason the two survive, and the potential-energy trap.',
      },
      {
        from: 'two-lists',
        to: 'the-honest-caveat',
        text: 'Synthesis: the two lists, the n = 3 stability boundary and why the instrument stops short of it, one closing question about method, and an explicit statement of what the model is and is not.',
      },
    ],
  },
};
