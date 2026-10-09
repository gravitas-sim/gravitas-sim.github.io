// =============================================================================
// What an instructor should expect to see at a step, by lesson and step sid
// -----------------------------------------------------------------------------
// Keyed by the step's sid, so inserting or reordering a step cannot slide an
// expectation onto the wrong screen (the old key was the 1-based step number).
// js/instructorExpectations.js reads it through readVersioned and still reads
// the number-keyed /1 form. Not imported by any route: the answer-key PDF and
// the author check read it. Generated once from instructorContent.js by
// tools/migrate-expectations.mjs; edited by hand since.
// =============================================================================

export default {
  format: 'gravitas.instructor-expectations',
  formatVersion: 2,
  lessons: {
    'lines-and-motion': {
      'measure-one-shift':
        'Synthetic star 1 reads about +86 ± 5 km/s and star 2 about −143 ± 5 km/s from H-alpha. The true values, +85 and −142, are accepted within 12 km/s. The velocity is positive for a redshift (a line at a longer wavelength than rest): a student who reports star 2 as +143 has dropped the sign.',
    },
    'color-and-temperature': {
      'three-peaks':
        'Peaks near 966, 483 and 241.5 nm: each doubling of temperature halves the peak, and peak × temperature comes out near 2.9 million nm·K. The validator accepts readings within 1.5 percent.',
      'three-colors':
        'B − V (Vega system) of about 1.69 at 3,000 K, 0.60 at 6,000 K and 0.15 at 10,000 K. Within 0.05 is accepted; a student who reads the g − r row instead will be a little off at every temperature.',
    },
    'keplers-laws': {
      'measure-the-two-orbits':
        'The Circular Orbiter comes out at e near 0.02; the Eccentric Orbiter at roughly e = 0.6–0.7. The derived semi-major axis is the mean of the periapsis and apoapsis distances, and the validator warns if the two are entered the wrong way round.',
      'fast-and-slow-in-numbers':
        'Speed at periapsis should exceed speed at apoapsis by roughly the inverse ratio of the distances. The validator warns if the two are swapped, which is the common error.',
      'measure-four-planets':
        'Any two or more Solar System planets. P²/a³ should come out near 1 for every row when a is in AU and P in years; the validator flags a spread greater than 50%, which almost always means a period entered in days.',
      'work-the-law-out-step':
        'P² ÷ a³ = 1 within reading error. The star in this scenario is exactly one solar mass, so the constant is exactly 1 by construction, and the validator says so.',
      'weigh-trappist-1-yourself':
        'TRAPPIST-1 comes out at 0.0898 solar masses. The validator accepts within 0.008 and names the published value when a student lands on it.',
    },
    'retrograde-motion': {
      'watch-from-outside-first':
        'Both planets circle counterclockwise and neither ever reverses. Earth’s speed reads about 29.8 km/s and Mars’s about 24.1 km/s; students should notice both that Earth is faster and that it has less far to go. If a student reports a reversal here, they have already switched the frame.',
      'the-two-orbits':
        'Earth: 1.00 AU and about 365 days. Mars: 1.52 AU and about 687 days. The inspector computes these from live position and velocity, so readings drift by a per cent or two depending on when they are taken; anything within 5 per cent is a good measurement.',
      'how-fast-each-one-goes':
        'Earth 0.99 degrees per day, Mars 0.52, and a gain of about 0.46 degrees per day. A student getting a negative gain has subtracted the wrong way round.',
      'put-yourself-on-earth':
        'Earth sits still at the center, the Sun circles it once a year, and Mars’s trail carries a loop or a cusp. The loop needs roughly half a minute of running to appear: the trail has to fill and Earth has to reach opposition. Students who switch the frame and immediately switch back will see nothing.',
      'catch-the-reversal':
        'The direction from Earth climbs at roughly half a degree a day for most of the cycle, then falls for about ten weeks around opposition. Any pair of readings that brackets a fall is a correct answer; the day numbers themselves depend on when the student started.',
      'nearest-and-furthest':
        'Closest about 0.5 AU, furthest about 2.5 AU, a ratio near 5. Readings of 0.53 and 1.98 are typical if the student has not watched a full synodic period, and that is fine: the point is that the ratio is large, not its exact value. The real range is 0.38 to 2.68 AU because of the eccentricities this model leaves out.',
      'do-it-for-the-sun':
        'The Sun traces a closed circle of radius 1 AU around Earth, once a year, with no loop and no cusp anywhere on it. Switching to the world frame stops the Sun dead; switching to the Sun’s own frame puts Earth back on the circle. Students often find this screen more unsettling than the Mars loop, which is a good sign.',
      'how-long-does-a-loop':
        'About 70 to 80 days between the direction starting to fall and starting to rise again. The real figure for Mars is about 72 days, and it varies from one opposition to the next by a couple of weeks for reasons this planar circular model does not include.',
    },
    'transit-photometry': {
      'measure-the-dip':
        'Baseline near 1.000; depth about 1.8%. The naive radius ratio is then about 0.135, which is roughly ten percent larger than the true value, and the investigation goes on to explain why.',
      'correct-it-and-get-a':
        'With the limb-darkening correction and a stellar radius of 1.155 solar radii, the recovered planet radius lands near 1.38 Jupiter radii, the published value for HD 209458 b.',
      'time-two-transits':
        'Two successive transits are about 3.52 days apart. Students who miss a transit will get a multiple of that; the validator catches the doubled value and says so.',
      'from-a-period-to-an':
        'A 3.52-day period around a 1.148 solar mass star gives a semi-major axis near 0.047 AU and an equilibrium temperature of order 1400 K.',
      'recover-the-real-planet':
        'The blended depth is shallower than the clean one. Correcting for a companion half a magnitude fainter recovers a planet radius consistent with the unblended measurement.',
    },
    'orbital-energy': {
      'fire-it':
        'A low launch speed gives a suborbital arc that returns to the surface. Total energy is clearly negative.',
      'fire-it-again':
        'A high launch speed gives a path that leaves and does not return. Total energy is at or above zero.',
      'find-the-dividing-line':
        'The dividing line is where the total energy bar reaches zero. Students should be able to bracket it within a small range of the slider.',
      'write-down-the-dividing-speed':
        'Two numbers with a gap between them, bracketing 10.9 km/s. A student who moved the slider in whole units will report a gap of 1 km/s; one who worked through the last stretch in hundredths will report 0.02. Both are correct measurements and the difference is the point - the gap is the uncertainty, and the field check says so rather than marking the coarse one wrong. Anything centered outside 10.3 to 11.5 is a misread of which shot came back.',
      'watch-the-total':
        'The kinetic and potential bars change continuously; the total does not. This is the observation the next question depends on.',
      'check-it-yourself':
        'ʻOumuamua’s total energy is positive. The eccentricity is above 1 and the path is hyperbolic.',
    },
    'weighing-stars': {
      'watch-them':
        'Two stars of 2 M☉ each, 4.00 AU apart, read off their cards on the canvas. The point of asking is that they are equal: everything the next few screens conclude about the balance point follows from that, and a student who has not checked will not notice when it stops being true on screen 9.',
      'what-are-they-going-round':
        'Both arms read 2.00 AU. Worth saying out loud that the cross is drawn by the renderer from where the two stars are at that instant rather than placed there by the investigation - it is a measurement of the pair, which is why it stays still while they swing round it.',
      'try-it':
        'At 4 M☉ and 1 M☉ the arms are 0.80 and 3.20 AU, a ratio of 4.00 against a mass ratio of 4.00. Expect somebody to ask why the pair restarts when they move a slider: because a star whose mass changed mid-orbit would be on a path that no longer closes, so the pair is restood rather than edited. That is worth two minutes.',
      'a-practice-run':
        'Practice pair: a = 2 AU, P = 2 years, giving a total of 2 solar masses.',
      'measurement-one-how-big-is':
        'The mystery pair is 4 AU apart: Star A about 1 AU from the balance point, Star B about 3 AU. Both are read off the canvas, and the inspector is deliberately closed on this screen so the masses cannot simply be looked up.',
      'measurement-two-how-long-does':
        'One lap takes about 4 years. Capture this orbit records the separation, both arm lengths and the timing into the notebook, and marks the period as student-timed - a period taken from the model instead is recorded as a prediction, which is the distinction that entry exists to keep.',
      'weigh-the-pair':
        'a³ = 64, P² = 16, so the total is 4 solar masses. A student who uses one star’s barycenter distance instead of the separation gets 0.5 and is told so.',
      'now-weigh-each-one':
        'The 3:1 distance ratio splits 4 solar masses into 3 and 1. Star A, on the smaller circle, is the heavier one.',
      'one-on-your-own':
        'The independent pair is a = 3 AU, P = 3 years, giving 3 solar masses.',
    },
    'black-holes': {
      'the-event-horizon':
        "The card gives 10 M☉ and a Schwarzschild radius of 29.5 km, so 59.1 km right across. The labels on the canvas are the renderer's own: they name the dark region, the disk and the jets, which are what such a system looks like from outside. None of them is the black hole, and it is worth saying that out loud.",
      'thirty-kilometers-is-not-very':
        'The readout puts the two scales side by side on purpose: about 16 world units drawn, 59.1 km real. The drawn size is whatever lets four orbits fit in a window and carries no information. Students who try to measure the horizon off the screen are doing the thing this screen exists to stop.',
      'three-measurements':
        'Three trials at 5, 10 and 20 solar masses give 14.8, 29.5 and 59.1 km. The points fall on a straight line through the origin. 5, 10 and 20 M☉ give 14.8, 29.5 and 59.1 km. The hole on the canvas changes with the slider and its orbiters change with it, which is the consequence the graph is about.',
      'squeeze-the-sun':
        'Squeezing one solar mass: the Sun today gives 0.2% of light speed, Earth-sized 2.2%, 30 km gives 31%, 6 km gives 70%, and 2.95 km gives exactly 100%.',
      'the-right-answer-for-the':
        "Both orbiters have the same period, to as many figures as the readout gives. That is the whole demonstration: eight solar masses is eight solar masses, and at the same distance the orbit is the same orbit whether the center is a star or a hole. Expect at least one student to predict the black hole's orbiter will be faster or will spiral in; neither happens, and the reason is that a black hole is not a stronger kind of gravity.",
      'mass-divided-by-volume':
        'The density marker moves down the ladder as mass rises. At 10 solar masses it sits near nuclear density; at a million it is ten powers of ten lower.',
      'the-thermometer':
        'The thermometer level falls with mass. Sagittarius A* comes out at 1.4×10⁻¹⁴ K, far below the coldest temperature ever produced in a laboratory.',
      'a-timeline-that-will-not':
        'The lifetime bar for a 10 solar mass hole reaches 70 zeros against the universe’s 10.',
    },
    'radial-velocity': {
      'toward-away-toward-again':
        "The live readout pairs the star's place in its orbit with what a spectrograph would read there. The sign is the thing to draw out: negative means approaching, which is the opposite of what most students guess, and it is a convention about wavelength rather than a fact about the star.",
      'open-the-real-instrument':
        'The instrument measures whichever star is selected, so this is the screen to make sure they have selected one. The readout underneath gives the phase and the reading together, which is the pairing the rest of the investigation relies on.',
      'measure-the-period':
        'The curve repeats every 3.52 days. Students reading between successive peaks typically land between 3.3 and 3.8; anything in that range is a good measurement off a live plot. The published period is 3.5247 days. The event watch stops the run at the most positive radial velocity. Two stops bracket one period: about 3.5 days. While it is stopped, ask which way the star is actually moving on the canvas and whether the sign agrees - that is the point of stopping rather than reading it off a graph.',
      'read-k-off-the-panel':
        'The panel reports K near 84 m/s once a full cycle is recorded, which matches the published semi-amplitude for HD 209458 b. A student answer near 168 has taken the full peak-to-peak range rather than the semi-amplitude and should be sent back to step 13.',
      'one-thing-at-a-time':
        'The rv-mass instrument holds star, period and viewing angle fixed, so K is strictly proportional to planet mass: an Earth gives 0.38 m/s, a Neptune 6.6, HD 209458 b 84, and a five-Jupiter planet 609. At step 17 students match this instrument to their measured K and should land near 0.69 Jupiter masses, the published value; the accepted range is 0.61 to 0.77, wide enough to absorb a slightly misread K.',
      'the-same-planet-four-viewing':
        "The observer has been swung to 90 degrees on the live system: one controlled change, nothing about the star or planet touched. The panel's inclination presets are the analytic version of the same idea, and the two should be read together rather than confused - the panel tilts a model, the observer angle moves where we are standing.",
      'characterize-the-planet':
        'The characterization panel reports HD 209458 b at 1.38 Jupiter radii, 0.69 Jupiter masses and a bulk density of 0.33 g/cm³: about a third the density of water and a sixteenth of Earth’s. It receives roughly 785 times Earth’s starlight and sits far inside the inner edge of the modeled zone. At step 32 the accepted density range is 0.25 to 0.41; a student answering near 5.5 has read Earth’s density from the comparison text rather than the planet’s.',
    },
    'goldilocks-question': {
      'three-distances':
        'At 0.5, 1 and 2 AU the panel reads 4.00, 1.00 and 0.25 Earths. These are exact by construction, not rounded.',
      'write-the-three-down':
        'The three pairs should be (0.5, 4), (1, 1) and (2, 0.25). The validator confirms starlight × distance² is constant and says the relationship has appeared in the student’s own numbers; it warns if the rows do not sit on one curve, which almost always means a value was read at the wrong distance.',
      'the-star-is-not-running':
        'The shell areas read 1×, 4×, 9× and 16× at 1, 2, 3 and 4 AU, and the third line of the readout gives 1, 0.25, 0.111 and 0.063 Earths. The last line never changes: the total energy crossing the shell is the same at every distance.',
      'four-stars-one-planet':
        'At a fixed 1 AU: the red dwarf gives 0.0015 Earths, the orange dwarf 0.34, the Sun 1.00, the brighter star 5.1. The starlight equals the luminosity exactly, because the distance is 1 AU.',
      'so-where-would-a-planet':
        'Conservative zones: red dwarf 0.042 to 0.080 AU, Sun 0.98 to 1.69 AU, brighter star 2.11 to 3.58 AU. A factor of about fifty between the extremes.',
      'now-put-it-round-the':
        'The ring runs from 0.98 to 1.69 AU. Venus at 0.72 AU sits inside the inner edge and Ceres at 2.77 AU well beyond the outer one, so Earth and Mars are the two worlds inside. Mars being inside is the point of the screen and is worth waiting for a student to notice. Venus at 0.72 AU is inside the inner edge, Earth at 1.00 is comfortably in, Mars at 1.52 is just inside the outer edge on the conservative definition, and Ceres at 2.77 is far outside. Have them click each and read the distance and insolation rather than being told: the numbers come from the same functions that draw the ring.',
      'two-definitions-of-the-same':
        'Around the Sun the conservative zone is 0.98 to 1.69 AU and the optimistic zone is 0.75 to 1.77 AU. The inner edge moves much further than the outer one, which surprises most students.',
      'the-wider-definition-on-the':
        "The inner edge visibly jumps inward from 0.98 to 0.75 AU while the outer barely moves, 1.69 to 1.77. Venus at 0.72 AU is still outside it, by about 0.03 AU. The census of the Solar System does not change: Earth and Mars, on either definition. Venus is now inside the optimistic zone at 0.72 AU against an inner edge of 0.75. Nothing about Venus changed - the definition did. That is the screen's whole point, and the readout says which definition is in force so the change is attributable.",
      'a-year-on-a-circular':
        'On a circular orbit the starlight graph is a flat line. That is the observation the next prediction depends on.',
      'run-an-eccentric-year':
        'At a = 1.2 AU and e = 0.45 the planet swings between 0.66 and 1.74 AU, receiving 2.30 and 0.33 Earths. The starlight peak is narrow and the trough is wide, because the planet moves fastest at periapsis.',
      'crossing-the-edges':
        'At e = 0.45 the planet spends about 56% of its year inside the conservative zone; at e = 0.3 about 78%; on a circular orbit at the same semi-major axis, 100%. Wanderer swings between 0.66 AU at closest approach and 1.74 AU at furthest, so its starlight varies by a factor of about seven over one year. Arm the watch at periapsis, read the insolation, then let it run to apoapsis and read it again. Being inside the zone for part of a year is not the same as being habitable, and the next screen is where to say so.',
      'all-seven-planets':
        'Insolations: b 4.18, c 2.22, d 1.11, e 0.65, f 0.37, g 0.25, h 0.14 Earths. The conservative zone runs 0.0254 to 0.0499 AU, putting e, f and g inside. Switching to optimistic brings d in as well.',
      'watch-it-run':
        'The whole system fits inside the ring plus a little either side. Orbital periods from the inspector: b about 1.5 days, c 2.4, d 4.0, e 6.1, f 9.2, g 12.4, h 18.8. TRAPPIST-1b completes about twelve laps for each one of h. Seven planets on their real orbits, with the zone drawn at the same scale. The caution printed on the ring matters: TRAPPIST-1 at 2,566 K is below the temperature range the published fit covers, so the model is evaluated at its own lower limit rather than extrapolated.',
      'take-the-readings-yourself':
        'e 0.65, f 0.37, g 0.25 Earths, with the zone running 0.0254 to 0.0499 AU. The validator accepts anything within five percent and names the specific fields that are off, so a student who has read the wrong row is told which one rather than being given the value. TRAPPIST-1e receives about 0.65 Earths, f about 0.38, g about 0.26. Selecting each planet gives the same numbers from the same code that draws the ring, so a student can check the instrument against the world it describes.',
      'three-planets-that-all-look':
        'All three candidates receive close to one Earth of starlight and all three are inside the zone. The differences are atmosphere, size and stellar activity.',
    },
    'missing-mass': {
      'put-the-mass-somewhere':
        'All four presets should be pressed. The falling presets return an outer slope near -0.50 and the shape reads "falling, Keplerian"; the disc reads about -0.28 and "falling"; "What galaxies do" reads about +0.10 and "FLAT". The +0.10 is worth a word if a student queries it: a pseudo-isothermal halo approaches its asymptote from below, so over a finite range it is still climbing slightly. The claim the investigation makes is comparative — flat rather than -0.5 — and the panel’s bands are set for that.',
      'the-solar-system-plotted':
        'The Solar System returns an exponent of -0.500 and the panel names the shape Keplerian. Mercury sits at the left of the plot at 48.5 km/s and 0.389 AU, and Neptune at the right at 5.43 km/s and 30.1 AU, both within a per cent of the real values, and every point lies on the dashed prediction. This is the agreement the rest of the investigation is measured against.',
      'what-the-speed-tells-you':
        'On the falling curve, dragging the marker from 2 kpc to 30 leaves the lower plot almost level and the readout says the enclosed mass "barely changes (x 1.00)". On the flat curve the lower plot is a straight line through the origin and the readout says it "roughly doubles (x 2.00)". On the real galaxy the visible dashed line accounts for about a quarter of the enclosed mass at 30 kpc, which is the number step 19 will reproduce independently.',
      'measure-the-enclosed-mass-yourself':
        'The flat curve gives 2.62, 5.23, 10.46 and 15.69 in units of 10^10 solar masses at 5, 10, 20 and 30 kpc: exactly proportional to radius, and the plot is a straight line through the origin. The falling curve gives 5.23 at 30 kpc, the same as it gives at 10, which is the contrast the step is for. Students who read 5.2 rather than 5.23 are fine; the point is the proportionality, not the third digit.',
      'measure-the-expected-curve':
        'The Spiral Galaxy scenario gives an exponent near -0.45 and the shape reads Keplerian. It is not exactly -0.5 because the disc carries about a fifth of the visible mass, so the enclosed total does keep growing a little; students who notice that discrepancy and can explain it are ahead of the investigation. The visible mass reads 14.7 solar masses in the model’s own units.',
      'measure-the-real-curve':
        'The Milky Way Rotation scenario gives an exponent near +0.02 and the shape reads Flat. The visible mass is unchanged at 14.7, which is the point worth drawing out: nothing about the bookkeeping changed, only the motion. At the outer edge the stars are moving roughly 2.7 times faster than the dashed prediction, so answers between 2 and 3 are good readings off the plot.',
      'try-it-with-stars-alone':
        'Expect frustration, and protect it. A heavier disc lifts the whole curve and overshoots the inner points long before it reaches the outer ones; a wider disc flattens its peak a little and moves it outward but still comes back down. The best achievable stars-only fit is an average miss of about 15 km/s at a disc mass near 8.5 and a scale length near 4.5, and it is worst at 30 kpc where the model runs about 27 km/s too slow. Students who get anywhere near 15 have found the real answer and should be told so.',
      'record-your-best-stars-only':
        'Around 15 km/s for the average miss, a disc mass between 6 and 10, and the worst miss at 30 kpc with the model too slow. A student reporting an average miss under 10 has almost certainly left the halo on or misread the row; a student reporting 40 or more has not swept the range. The sign of the worst miss is the field that matters most: too slow, at the outer edge, every time.',
      'now-add-the-halo':
        'Raising the halo strength from zero lifts the outer curve while the inner points barely move, which is the observation the whole exercise exists to produce. FITTED appears once the average miss drops below about 4.7 km/s. There is a real degeneracy between halo strength and core radius, so a range of settings will fit: anything from roughly 140 to 160 km/s with a matching core between 4 and 9 kpc gets there. That degeneracy is a feature of the real problem and worth naming.',
      'record-the-fit-that-works':
        'A halo flat speed near 150 km/s and a core radius near 6 kpc, with an average miss around 2 km/s. The visible mass reads 3.35 and the halo mass inside 30 kpc reads about 11.4, both in units of 10^10 solar masses. Because of the degeneracy the individual halo numbers will vary between students while the halo mass, and therefore the ratio at step 19, will not vary much.',
      'what-the-halo-is-holding':
        'With the halo on the star holds 20 kpc indefinitely. The readout shows a launch speed near 146 km/s against about 77 km/s for what the visible disc alone could hold — a factor of nearly two in speed, which is a factor of nearly four in the mass required. Switching the halo off sends the star out past three times its launch radius within a few seconds and the verdict line appears. Relaunching at 8 kpc with the halo off keeps the star, because the disc still dominates there; that contrast is worth asking for explicitly.',
      'take-the-halo-away-from':
        'With the halo switched off the outermost stars begin drifting outward within a few seconds and the disc visibly unwinds from the outside in. The fitted slope climbs as the outer stars carry their speed to larger radii. Reloading the scenario restores it; the toggle alone does not, because the stars have already moved.',
      'zwicky-s-arithmetic-and-the':
        'Done correctly, Coma comes out near 1.6 x 10^15 solar masses, about 11 times the galaxies and hot gas combined and about 54 times the galaxies alone. Selecting "forget the factor of 3" divides the mass by exactly three. Selecting "forget to square it" collapses it by a factor of a thousand and the discrepancy disappears entirely, which is the most useful thing on the panel: an answer that shows no discrepancy is the signal that the arithmetic went wrong, not that the problem went away.',
      'measure-the-simulated-cluster':
        'Twenty-four members, a speed spread of 20.5 simulation units per time, and a cluster radius of about 2516 simulation units. The visible mass reads 96 solar masses. Because the scenario is paused and seeded these are the same for every student, so a different answer is a reading error rather than a different moment.',
    },
    tides: {
      'three-points-three-pulls':
        'At a distance of 1.00 the three arrows are visually indistinguishable, which is the intended reaction. The readout gives 3.43 × 10⁻⁵, 3.32 × 10⁻⁵ and 3.21 × 10⁻⁵ m/s², and the last row reports the near side as 6.9% larger than the far side. Students who slide the distance down to 0.2 will see the arrows separate visibly, which is worth encouraging.',
      'take-the-center-away':
        'The residual row shows about 1.1 × 10⁻⁶ m/s² outward on each side, roughly a thirtieth of the pull itself, and the panel reports the magnification between the two rows. The center shows a dot rather than an arrow, and students regularly ask whether that is a drawing error; it is the answer.',
      'four-distances':
        'At mass 1, the readings should be 0.13, 1.00, 8.00 and 64.00 times the lunar tide at distances of 2, 1, 0.5 and 0.25. The validator checks that stretch × distance³ is the same for every row and warns at a spread above 35%, which almost always means a strength read at a different slider position from the distance beside it. The transformed plot straightens to a line through the origin.',
      'three-masses':
        'At distance 1, the readings should be 1.00, 2.00 and 4.00 at masses of 1, 2 and 4. The validator checks that stretch ÷ mass is constant and warns if the distance slider was moved during the run, which is the only common failure here.',
      'seven-real-tides-on-one':
        'The seven bars run from 5.05 × 10⁻⁷ m/s² for the Sun on the Earth to 68 m/s² for a stellar-mass black hole on the Sun at three million km. The two comparisons worth drawing out are the Moon beating the Sun by 2.2, and the last two rows differing by 1.2 × 10⁵ for a fifty-fold change in distance alone.',
      'stretch-against-grip':
        'At 5 Earth radii and lunar density the green bar dwarfs the red one and the verdict reads HOLDS TOGETHER. The bars become equal near 1.50 Earth radii. Comet ice moves the crossing out to about 2.64 Earth radii and iron brings it in to about 1.22, which is the observation step 25 depends on.',
      'the-roche-limit-and-why':
        'With porous ice at 600 kg/m³ the no-strength limit is 2.47 Saturn radii, or about 149,000 km, and the keeps-its-shape limit is 1.27 Saturn radii. The A ring’s outer edge is at 2.27 Saturn radii and Mimas at 3.08, so the rings sit inside the outer limit and the innermost round moon sits outside it. That is the payoff of the screen.',
      'change-what-the-moon-is':
        'Both arcs move inward as density rises: the no-strength limit runs from 2.47 Saturn radii at 600 kg/m³ to 1.14 at 6,000. Above roughly 2,500 kg/m³ the keeps-its-shape limit drops below one Saturn radius and the panel reports it as being inside Saturn itself rather than drawing it.',
      'the-extreme-case-running-live':
        'Bodies on close passages shed debris that spreads along the orbit; bodies passing further out are untouched. Students will ask whether the streams are real. The answer to give is that the geometry is plausible and the mechanism is a threshold rule, not a fluid calculation, which the screen also says.',
      'a-star-and-a-black':
        'At ten solar masses the tidal radius is about 1.9 million km against a 29.5 km horizon, a ratio of 6.4 × 10⁴. At Sagittarius A* the ratio is about 11. The two meet near 1.6 × 10⁸ solar masses, and the billion-solar-mass preset reads SWALLOWED WHOLE.',
    },
    'butterfly-effect': {
      'the-reproducibility-control':
        'About a minute of running from one button. The separation should read exactly zero for the whole run and the instrument should report "the two runs are identical". The section reports both intervals - 40.0 simulated seconds each, against 40 asked for - and says in as many words that nothing was changed between the runs. Any nonzero value means something was; the parameter-difference line will name it. This is also the moment to point out that the runs are compared on simulated time, not wall-clock time.',
      'measure-the-binary':
        'A growth factor of order 100 over four or five orbits, a straight-line fit around r-squared 0.99, and no e-folding time. The instrument should say the separation is growing in proportion to time. Students often read the refusal as an error; it is the result. The section names the nudge - 1500 km along x - as the only difference between the runs, which is worth reading aloud before the result.',
      'measure-the-triple':
        'The guided pair runs a defined forty seconds at a defined step, so this is now the same for everyone: an e-folding time of 8.33 simulated seconds, r-squared 0.991, growth about 220, fitted between t = 5.3 and t = 29.3. The shaded band on the log plot marks that interval. Reproducibility is the change worth noticing here - two students who disagree have loaded different scenarios, not made different measurements.',
      'write-down-what-you-measured':
        'Expect tau 8.3 s, r-squared 0.99 and growth about 220. Values of tau outside 7 to 9 mean the wrong run or the wrong scenario rather than a physics error. The field validation warns rather than blocks, so a student can record an unexpected number and discuss it.',
      'the-numerical-control':
        'Two controls, about a minute each, and the three e-folding times should agree far better than the twenty per cent the verdict allows. Measured: 8.333 s at the shipped step with symplectic Euler, 8.322 s at half that step, 8.314 s with velocity Verlet - a spread of 0.1 per cent, reported as resolved. Two things to check if it does not read that way. Wild disagreement means something else changed as well, and the parameter diff will name it. A verdict that says the repeats did not change the arithmetic means the same control was run twice: the section refuses to count agreement between two identical calculations, which is a point worth making out loud. Note also that the step control halves the MEASURED step rather than the setting - this lab ships with no cap at all, so halving the setting would have halved nothing.',
      'move-the-horizon':
        'The e-folding time should be essentially unchanged by a smaller or larger perturbation; what moves is the time at which the two runs become visibly different, and it moves by ln(factor) times tau. A perturbation ten times smaller buys about sixteen extra seconds and no more.',
    },
    'when-orbits-lock': {
      'measure-the-four-periods':
        'Periods of about 1.769, 3.552, 7.155 and 16.69 days and ratios of 2.007, 2.014 and 2.333, settling within about thirty Io orbits. The figures to draw attention to are the "closer than chance" numbers, which come out around 2, 1 and 25 depending on how long the run has been going.',
      'write-down-the-ratios':
        'The field validation warns rather than blocks. A student who enters exactly 2 gets a note that the instrument does not report exactly 2, which is the point of the step. Expect about 2.008, 2.014 and 2.333; the last figure of each moves a little with the length of the run.',
      'watch-the-line-ups':
        'The sky dial should be a broad arc rather than a tight clump, and the arrow short. Most students predicted clustering at step 7, so this is the moment the investigation turns; do not rescue it too quickly.',
      'watch-the-laplace-argument':
        'Three verdicts in order over about three and a half minutes: confined, then one reversal, then libration. If a class has less time, the first two are enough to make the argument as long as the paired control at step 17 is also run.',
      'record-the-laplace-libration':
        'A center within a degree or two of 180, an amplitude near 26 degrees and a libration period near 2,100 days. A much shorter period usually means the instrument is still quoting a provisional value from a single swing; leave it running.',
      'break-it':
        'CIRCULATION within about ten seconds, with a period near 47 Io orbits. Worth remarking on how much faster this verdict arrives than the libration one, and why: one completed circuit proves circulation, while ruling out a slow circulation takes as long as it takes.',
      'the-awkward-case':
        'Never LIBRATION. The verdict passes through confined, then either "the center is moving" or "it has turned back once", and the reported amplitude grows through the run. The growing amplitude is the specific evidence and is what step 20 asks about.',
      'measure-pluto-s-resonance':
        'LIBRATION about 180 degrees with an amplitude near 80 and a period near 19,600 years, against published values of 180, 82 and 19,670. This is the closest agreement with a published measurement anywhere in the investigation, and it takes about ninety seconds.',
      'record-pluto-s-libration':
        'The same three numbers, recorded. The validation accepts a center within 15 degrees of 180 and a period between 12,000 and 30,000 years; a value near zero for the center means the sign of the argument was read backwards, and the note says so.',
      'where-the-line-ups-happen':
        'The sky dial is a broad smear; the orbit dial clusters near 180 degrees with a spread of about 38. The instrument’s own summary line reads that every line-up happens near the outer body’s aphelion.',
      'the-rotating-frame':
        'Four different behaviors: the L4 probe reported as an equilibrium with an amplitude of 0, Patroclus librating about 296 degrees with an amplitude near 24 and a period near 13 Jupiter years, the L3 probe more than 150 degrees from where it started, and the wide probe circulating. The instrument needs about twenty Jupiter years - roughly forty-five seconds - before it will commit to any of them.',
      'record-the-tadpole':
        'A center near 296 degrees, an amplitude near 24 and a period near 13 Jupiter years against a linearized prediction of 12.47. The validation catches a student who has read L4 instead of L5, which is the common slip, and one who has recorded Jupiter’s own period instead of the libration period.',
      'one-last-ratio':
        'A nearest ratio of 7:5, an offset near 0.25%, about 4.6 times closer than chance, and circulation. Ask the class to compare that offset with Pluto’s 0.30% before revealing the verdict.',
    },
    'detect-this-planet': {
      'twelve-nights':
        'Have them actually select the star before going on: the instruments measure whichever star is selected, and a run planned against nothing is the commonest way this investigation stalls.',
      'schedule-a-twelve-nights-one':
        'Schedule A, seed 1, 8 m/s. The left panel shows twelve points tracing one full sine cycle; the right panel has at least one point in every phase bin. The readout gives phase coverage 10 of 10, scatter about 55.8 m/s against an expected 8, and chi-square per degree of freedom about 48.7. With the uncertainty dragged to zero the points sit exactly on the dashed curve, which is worth doing once with the class. Schedule A covers 9 or 10 of the ten phase bins. The readout underneath gives the live star\'s phase, which is what a phase bin is a bin of - worth pointing at, because students read "phase coverage" as an abstraction otherwise.',
      'write-down-what-schedule-a':
        'Coverage 10 of 10, scatter about 55.8 m/s, chi-square per degree of freedom about 48.7. A student reporting coverage below 10 has not loaded the preset; one reporting a chi-square near 1 has left the uncertainty far too high. The field check warns below 5.',
      'the-same-planet-invisible':
        'Schedule B. The left panel spans 38.7 days and looks almost flat; the folded panel shows all twelve points stacked in two adjacent bins. Coverage drops to 2 of 10 and chi-square per degree of freedom to about 1.9. Moving the cadence to 3.0 or 4.2 restores most of the coverage immediately, which is the cleanest way to show that the failure is the cadence and nothing else. Schedule B covers 2 bins of ten. Be exact about what is controlled: same star, same planet, same instrument precision, same twelve nights, same random draw. Only the cadence differs, so every conclusion here is a conclusion about cadence.',
      'write-down-what-schedule-b':
        'Coverage 2 of 10, scatter about 11 m/s, chi-square per degree of freedom about 1.9. The scatter being close to the 8 m/s error bar is the whole result. Setting the uncertainty to zero here is worth doing: the run still fails, which separates "noisy" from "uninformative".',
      'the-third-knob':
        'The Neptune preset at 8 m/s gives K near 7.3 m/s, full phase coverage and chi-square per degree of freedom near 1.7 - a perfect schedule that still fails. Switching to 1 m/s leaves the planet and the schedule untouched and takes chi-square per degree of freedom to about 22.8.',
      'do-it-to-the-real':
        'The live panel completes Schedule A in about thirteen seconds of wall clock at normal speed, laying down twelve points on the dashed overlay. Untick the overlay and what is left is what an observer has. If a student runs the simulation fast, the panel warns that the frames are too coarse for the cadence and the extremes may be flattened; that warning is real and the answer is to slow down and restart.',
      'the-noise-budget':
        'The instrument opens on HAT-P-7 b: a measured depth of 5,900 ppm, a four-hour transit, six hundred of them, and a depth-over-noise of about 587. The green depth line sits far beyond every noise bar. Dragging the transit count down barely moves the ratio, because at six hundred transits almost the entire remaining budget is the persistent term - the white and within-transit rows are both well under one part per million. This is the floor-limited case, and it is worth naming as such before the ground-based one arrives.',
      'the-floor':
        'The same planet from three nights on the ground: white noise about 260 ppm, the within-transit term about 1,440, the persistent term 120, and a ratio of about 4. Dragging the transit count to 300 takes it to about 31 - a real factor of eight, not the factor of ten a pure square-root law would give, because part of the budget was already persistent. Keep dragging and it approaches 49 and stops. Both halves matter: more observing does help, and it stops helping, and the ceiling row says where before any nights are spent.',
      'read-two-budgets':
        'About 587 with Kepler and about 4 from three nights on the ground, a factor of 150 on the same planet. The largest ground-based term is the within-transit bar at about 1,440 ppm after three transits. A student who reports the two ratios the other way round has read the columns backwards; the field check says so.',
      'the-edge-of-what-tess-can-do':
        'Pi Mensae c about 10.5, TOI-700 d about 2.7, the Earth twin about 0.6. Two things to draw out. The Earth twin has by far the longest transit - thirteen hours against under two for TOI-700 d - and it is still the least detectable, which cuts against the intuition that a longer transit is an easier one. And two hundred transits take it to about 2.5 against a ceiling of 2.8, so even unlimited TESS observing of this system does not produce a detection: the honest answer, and a more useful one than implying it is a few more sectors away.',
    },
    'design-the-schedule': {
      'set-the-run-up':
        'The note under the controls should read eight observations over 24.673 days with a schedule checksum. If it shows a different count, the Observations field has been left at its default rather than set to 8.',
      'run-both-schedules':
        'Both arms observe together and the comparison appears only when both have finished; before that the panel reports progress as two counts. Expect a few minutes at normal speed, or under a minute at high speed.',
      'read-the-comparison':
        'The regular arm lands somewhere well away from 3.5 days with an amplitude of a few m/s - it has seen essentially no variation - while the irregular arm recovers about 3.52 days with an amplitude near 100 m/s against a true 84. The exact figures move with the simulation speed and the seed; the pattern does not.',
      'break-your-own-result':
        'The regular arm fails on every seed, because its failure is geometric. The irregular arm recovers the period on most seeds, with the amplitude varying more than the period does.',
      'lose-a-fortnight':
        'The note reports how many epochs fell inside the 8-16 day gap. If the two arms lose different numbers, the comparison block says it is no longer a comparison of scheduling alone and lists what stopped being equal.',
      'type-the-dates':
        'Unreadable entries and duplicate times are reported in the note rather than dropped silently, and a list that cannot be read at all falls back to a regular cadence and says so.',
    },
    'binary-star-planets': {
      'run-the-default':
        'The planet at 0.15 separations, twenty binary periods, about half a minute of wall clock. The trail band holds its shape throughout - it widens and narrows slightly as the stars swing through periapsis, and it never stops being a ring. Energy drift settles around 0.00017% and stays there. If a machine is struggling, the "Step actually used" row will report a mean larger than 1.0; that is worth pointing out rather than ignoring, because it is the same effect the second half of the investigation is about.',
      'what-the-quiet-run-did':
        'Twenty periods completed, farthest out about 0.62 separations, zero close encounters, energy drift about 0.00017%. A student reporting fewer than twenty periods has the starting radius wrong - the panel prints the value it actually used. A farthest-out figure above 2 usually means they have read the row in AU rather than in separations.',
      'run-it-at-030':
        'The planet at 0.30 separations is ejected after about 2.5 binary periods, following one close pass with the companion. Energy drift around 0.0005%, comfortably inside the screen, so this is a physical result and not a numerical one. The run ends itself once the planet is unbound and past ten separations. Exact timing varies with the step: at a timestep of 1.0 it leaves around 2.5 periods and at 0.25 nearer 5, which is expected in a chaotic system and is the subject of step 19 - the runs must agree on whether, not on when.',
      'when-did-it-leave':
        'About 2.5 binary periods and one close encounter. Any answer of twenty periods means the planet did not leave; check the starting radius. The encounter count is the interesting number here, because the circumbinary case at step 24 records zero and loses its planet anyway.',
      'run-the-sweep':
        'The sweep takes four to seven minutes for five trials of twenty periods. Expect 0.12 through 0.22 to survive the window and 0.30 to be ejected after about five periods, with a farthest distance of ten separations and a handful of close passes. The exact ejection time is not reproducible between machines and does not need to be.',
      'read-the-sweep':
        'Four survived; the largest surviving radius is 0.22 and the smallest ejecting one is 0.30. A class that reads 0.22 as "the boundary" has read a gap between two samples as a measurement, which is what the next question is for.',
      'resolve-the-edge':
        'The re-run at the change of outcome with half the step gives the same answer, so the ejection is not an artifact of the step. If it disagrees, that is the better investigation: neither run has measured that configuration.',
      'energy-drift-as-a-screen':
        'At 0.50 separations the planet starts about 1 AU from the companion, which is not really an orbit at all. At a timestep of 1.0 the drift is about 0.18%, past the 0.1% screen, and the panel refuses to name an outcome; the eccentricity readout comes out above 100, which is a useful thing for students to see a number do. The first halving is the instructive part: the drift goes to 0.17%, essentially unchanged, and is still refused. The second, to a timestep of 0.25, takes it to 0.0023% and produces an answer - the planet collided with a star after 0.010 binary periods. Two points to draw out: resolving an encounter is not a matter of doing gradually better, and the outcome turned out to be a collision rather than the ejection most students will have assumed. This is the blunt demonstration; the subtle one is next.',
      'the-case-that-matters':
        'This is the run to do at the front of the room. At 0.25 separations with a timestep of 1.0 the planet survives all twenty periods while the encounter counter climbs into the dozens - around seventy by the end - and the drift readout sits at about 0.00018%. At a timestep of 0.25 the same configuration is ejected, after roughly thirteen periods, with drift near 0.0000034%. Both runs pass the energy screen and they disagree. Wall clock is about half a minute, one minute and two minutes for the three timesteps; consider splitting them across groups.',
      'the-drift-was-tiny':
        'Drift about 0.00018% at a timestep of 1.0 and about 0.0000034% at 0.25 - both several orders of magnitude inside the screen. The third field has no single right answer and is meant to be uncomfortable: students who ran all three steps will usually find two agreeing and one not, and the point is that "two out of three" is not how convergence works. Take the count they report and ask what it would take to make it three.',
      'run-the-circumbinary':
        'At 4.0 separations the planet holds its ring for all forty binary periods, with a farthest-out figure of about 4.03 and zero encounters. At 2.0 it is ejected after about 3.4 periods, still with zero encounters and a closest approach of about 0.22 separations - it never comes near either star. Energy drift is around 0.0007% in both, so neither result is numerical. Each run is about half a minute.',
      'no-encounter-at-all':
        'About 3.4 binary periods, zero close encounters, drift about 0.0007%. The zero is the point of the step. A student reporting a nonzero encounter count has the radius smaller than 2.0.',
      'sweep-the-circumbinary':
        'Optional, eight to twelve minutes. Expect the outer radii to hold and the inner ones to be disrupted, with the change not falling neatly at the published 3.61 - which is the disagreement the next two screens are about.',
      'where-the-fit-disagrees':
        'Both should report that the planet survived the integration, which is not what the fit predicts. What separates them from the genuine survivor at 4.0 is the farthest-out figure: about 14 separations from the run at 3.0 and about 25 from the run at 2.5, against 4.03 for the 4.0 run. Those excursions are the answer to step 28 - the planets are being pumped outward and forty periods is not long enough to see where it ends. Expect some students to assume they have made a mistake; tell them in advance that this is the intended result.',
    },
    'gravity-assist': {
      'fly-the-gaining-pass':
        'About nine seconds of wall clock. The trail bends visibly as the spacecraft rounds the planet, closest approach is 0.234 AU which is twelve planet radii, and the deflection is 58.63 degrees against a two-body prediction of 58.63 - they agree to a hundredth of a degree, which is worth pointing at. The "Planet’s frame" button is the moment: press it after the readings and the same path is redrawn as a clean hyperbola about a stationary planet.',
      'write-down-both-columns':
        'Relative to the planet, 4.343 km/s both before and after - the panel reports the change as roughly minus three parts in a hundred billion, which is zero. Relative to everything else, 3.32 km/s before and 5.89 after, a gain of 78 per cent. A student whose left column differs is reading the wrong column; the field check says so. A student whose right column shrank has the impact parameter negative.',
      'the-other-side':
        'About a minute of wall clock for both passes, measured. The table fills with two columns and the same left column in each: 4.343 km/s in and out on both sides. The rows that matter are the last three. Change in speed: +2.57 km/s behind, -1.67 in front. Change in velocity: 4.28 km/s in both columns. Encounter: "read in and out" in both. The caveat beneath reports the two velocity changes agreeing to a part in 10^13, the deflections to a part in 10^12 and the closest approaches to a part in 10^12, and then says the speed changes are not mirror images and were never going to be. Do not resolve that before the tenth screen.',
      'read-the-comparison':
        'A gain of about 2.57, a loss of about 1.67 and a velocity change of about 4.28, all in km/s. Two ways to get this wrong, and the field check catches both: reading the velocity-change row for both of the first two answers, which makes them equal, and entering the loss as a negative number. The ratio 1.67 / 2.57 is 0.65 and is worth writing on the board before the next screen.',
      'who-paid':
        'The planet slows by about 4.3 mm/s, which is 1.5 parts per million of its own 2.83 km/s. Expect the ledger figure to differ between machines and say so if it does: it is around 0.002 per cent on a laptop under load and four orders of magnitude smaller when the encounter is integrated in fine steps, because the application sizes its integration step from the frame rate and the residual is a finite-gate effect that shrinks with the step. Every one of those numbers is far tighter than anything the thirteenth screen needs, which is the point to make - not the digits.',
      'sweep-the-impact-parameter':
        'Optional, and about three minutes of wall clock, measured. Five passes, all reported as complete encounters. Turn: 96.6, 73.6, 58.6, 41.0 and 28.0 degrees at b = 20, 30, 40, 60 and 90. Speed change: 3.58, 3.05, 2.57, 1.90 and 1.34 km/s. Closest approach runs from 0.076 AU - about 3.8 planet radii - out to 0.70 AU. The plot draws points and no line, and the caveat states which pass turned most, which gained most, and that the answer is not a rule.',
      'read-the-sweep':
        'Turn 96.6 degrees and speed change 3.58 km/s at b = 20; 3.05 km/s at b = 30. The field check catches the two common misreadings - reading the table upside down, so that the widest pass is entered as the closest, and reading the turn from the wrong row. The subtraction they will need next is 3.58 minus 3.05 against 96.6 minus 73.6: about 0.023 km/s per degree, against 0.043 per degree at the wide end.',
      'fly-it-heliocentric':
        'A few seconds only. Relative to the star the spacecraft goes from about 13.7 to about 19.8 km/s, a gain of 45 per cent. Relative to the planet it goes from 8.48 to 8.51, a change of 0.34 per cent where the isolated version gave 3e-12. The measured deflection is 34.2 degrees against a two-body prediction of 36.3, a six per cent miss. Both residuals are physical. Reading the gate distance of 0.45 AU against the quoted Hill radius of 0.58 AU is worth doing with a class: the encounter is being measured only just inside the region where the planet is what matters. The comparison and the sweep are deliberately not offered here - with a star present their two arms would differ in two ways rather than one.',
    },
    'hohmann-transfer': {
      'try-radial':
        'The preview shows periapsis falling, apoapsis rising, and the specific angular momentum unchanged to every digit shown. Students should set the field back to zero without applying; if somebody applies it, Undo restores the world exactly.',
      'measure-the-orbits':
        'About 29.8 km/s for the spacecraft and 18.8 for the station. Anything an order of magnitude off is the unit toggle rather than the student.',
      'apply-the-first-burn':
        'The previewed apoapsis reads 250 simulation units, which is 2.5 AU, and the periapsis stays at 100. After applying, the trail visibly climbs away from the inner circle. A student whose apoapsis is wildly wrong has entered the km/s figure rather than the converted one.',
      'watch-the-coast':
        'The coast takes about 423 simulated days and the speed falls from 35.6 km/s to 14.2 as the spacecraft climbs. At normal speed this is a long wait; the transport control is the intended route.',
      'read-the-arc':
        'The top of the arc reads about 250 simulation units, which is 2.5 AU, and the bottom still reads about 100, which is 1 AU. The bottom is the number that answers the previous screen: the first burn moved the far side of the orbit and left the near side exactly where it was, so with no second burn the spacecraft returns. A student whose bottom figure has changed has applied a burn somewhere other than at periapsis.',
      'apply-the-second-burn':
        'The eccentricity in the preview falls to a few thousandths, and the periapsis and apoapsis both read about 250 simulation units. A residual eccentricity above about 0.05 means the burn was made away from apoapsis rather than at it.',
    },
    'lagrange-points': {
      'read-the-constant':
        'Two readings of C agreeing to four or five figures. A difference in the fourth figure over a long run is the integrator; a large difference means something was changed between the readings.',
      'open-the-neck':
        'C falls as the burn is applied and the shaded region visibly retreats. The neck opens when C passes 3.313. Students who see C rise have burned retrograde, which is a useful mistake to have made.',
      'watch-it-not-cross':
        'About a minute of running, and the same answer for everybody, which is what separates this from screen 10. The control rows should read: both arms started at (0.600, 0.000) at a rotating-frame speed of 0.565, both with a Jacobi constant of 3.28426 - identical to every digit shown, because C is fixed by position and speed and neither differs - both with the L1 neck open and L2 still closed, and both integrated at the same measured step. Then the outcome rows diverge: 30 degrees crosses the neck 0.11 periods in and comes within 0.008 of L1; 130 degrees never crosses, never gets nearer than 0.172, and its x never passes the 0.600 it started at. The sentence to insist on is "same accessible region, different paths"; the sentence to catch is "B can never cross", which the window cannot support and the caveat says so.',
      'break-it':
        'The overlay switches off and names the assumption: "this needs exactly two massive bodies" for an added star, or the tracer being heavy enough to move the others. Removing the change brings it straight back.',
    },
    'what-is-a-gravitational-wave': {
      'meet-the-two-objects':
        'Two cards, giving 36 and 29 solar masses. Students often expect a photograph and are surprised there is none; that surprise is the screen working. Worth saying out loud that the separation on the canvas is to scale in Schwarzschild radii while the two discs are fixed-size markers - the picture is honest about the geometry and silent about the sizes.',
      'change-the-shape':
        'Switching to the binary is the moment the rings start. Same total mass, same place, and the only difference is that the mass is now in two lumps whose arrangement changes as they turn. Encourage switching back and forth: the old rings keep traveling outward after the source stops emitting, which is worth noticing on its own.',
      'watch-the-pair':
        'The arrangement changing rather than either object moving. Ask what is the same about the two paused moments - the same two objects, the same separation - and what differs, which is only the orientation of the pair.',
      'follow-a-disturbance-outward':
        'Rings more widely spaced further out, because they left when the orbit was slower. A student who says the wave is speeding up has it backwards and is worth catching here.',
      'freely-floating-markers':
        'The ring becoming an oval and turning over. Expect at least one student to think the ring is the orbit seen from above; the body text says it is not, and it is worth repeating.',
      'now-swap':
        'Two different numbers - whichever direction they recorded first, the other one half a cycle later. The value that matters is not which is which but that they differ; a pair of identical answers means the scrubber was moved a whole cycle rather than half, and the validator says so. Worth adding out loud: between the two stops there is an instant when the ring is a perfect circle and nothing is happening to it, which is not a gap in the wave but the moment it passes through zero.',
      'markers-not-carried-away':
        'A marker that returns to where it started. If it does not, the student is watching the whole ring rather than one dot.',
      'why-drawn-so-large':
        'Nothing measurable - this screen is a statement, not a task. The number to leave them with is one part in 10²¹, and the atom-across-an-astronomical-unit comparison is the one most students remember.',
      'measure-a-change-in-length':
        'A practice answer of 0.0001 and a real one around 10⁻²¹. The common error is reading "Strain now", which passes through zero twice a cycle; the validator rejects anything above 10⁻¹⁵ and says why.',
      'count-the-rhythm':
        'About two peaks per orbit, and the validator accepts 1.6 to 2.4 because it is a hand count. Students who get four have counted zero crossings rather than peaks.',
      'different-compact-pairs':
        'Two neutron stars of 1.4 solar masses each, and a signal that stays in band far longer than the black-hole pair. The limit to state: the model treats both objects as points and says nothing about composition or about what happens when neutron stars touch.',
      'the-same-source-farther-away':
        'Amplitude halving each time the distance doubles, and the frequency identical at all three. Only the distance moved, which is what makes it an experiment.',
      'an-observatory-measures-a-difference':
        'The two arms are drawn over the marker ring and the readout gives both as numbers with opposite signs, plus their difference and what that difference is in meters on four-kilometer arms. This screen is edge-on deliberately — see the note on polarization below.',
      'what-two-observatories-recorded':
        'A trace that is unmistakably noisier than anything else in the investigation, with a recognizable rise in it. Ask which of the three kinds of picture it is, and then ask the same about the ring overlay on the previous screen.',
      'design-one-small-experiment':
        'One variable, two readings, and a ratio. The half students forget is saying what they held fixed; the validator prompts for it and it is worth insisting on.',
    },
    'listening-to-spacetime': {
      'three-things-called-a-wave':
        'That there are three different objects on screen and only one of them is a calculation of a gravitational wave. Worth spending a minute on the sandbox specifically, because the honest description has two halves: the black holes’ <em>motion</em> is a genuine Newtonian N-body calculation, and their <em>spiralling in</em> is not — Newtonian gravity radiates nothing, so the inspiral is a damping constant chosen so a merger happens while somebody is watching. Students who hear only "it is not real" draw the wrong conclusion, that the sandbox is a cartoon throughout. Students who hear only "it is a simulation" draw the other wrong one, that the merger rate on screen means something. Neither the orbit nor the damping produces the waveform in the panel, which is computed separately from the masses.',
      'find-your-way-around':
        'Everything moving together: the playhead, the two bodies in the schematic, both plots and the readout. A student who reports one of them lagging has found a bug worth hearing about.',
      'watch-the-waves':
        'Rings that are further apart at the edge of the picture than near the center, and a masked region in the middle. The test-mass ring stretches across the page and squeezes at right angles to that, alternately.',
      'two-crests-per-orbit':
        'Two wave peaks per orbit, within counting error. Anything between about 1.7 and 2.3 is a successful count; the validator says so and asks for a recount outside that.',
      'frequency-early-and-late':
        'Roughly 20 Hz near the start and 60-67 Hz near the end for the default black-hole preset, a factor of about three. The time before merger falls from about 0.85 s to under 0.05 s.',
      'stop-at-a-milestone':
        'At 50 Hz the readout gives about 0.14 s before merger, a separation near 3.9 Schwarzschild radii and an orbital velocity parameter around 0.36. The saved notebook entry should carry the model’s limitations alongside those numbers.',
      'change-one-thing':
        'Halving both masses roughly triples the time in band and roughly doubles the frequency at which the model stops. The panel will report two changes rather than one, which is correct and worth discussing.',
      'measure-time-in-band':
        'The lighter pair stays in band longest and reaches the highest frequency; the heavier pair does neither. For 18 + 14.4, 36 + 29 and 60 + 48 solar masses the model stops at about 135, 68 and 41 Hz respectively, and the whole inspiral from 20 Hz lasts roughly 2.7 s, 0.85 s and 0.39 s.',
      'the-one-mass-that-matters':
        'Chirp masses within about a solar mass of each other - near 28 for both pairs - despite total masses of 65 and 69.4 and mass ratios of 1.24 and 2.6. The two traces should be hard to tell apart over most of the window.',
      'test-distance':
        'Strain amplitude halving each time the distance doubles, so a ratio near 2.0, and the frequency at which the model stops identical at all three distances. Two things to watch for. Students reach for the "Strain now" row, which is the instantaneous signed value and passes through zero twice a cycle: the step says to use "Strain amplitude" and the validator rejects a zero or negative entry with that explanation. And if they are listening, the loudness is scaled against one fixed reference pinned by the step, so the three distances really do differ by ear - the amplitude ratio is 1 : 0.5 : 0.25, which is NOT a ratio of perceived loudness and should not be described as one.',
      'edge-on':
        'Edge-on about half the amplitude of face-on, and an effective distance of about 800 Mpc for a source at 400. The number to draw out is that the effective distance is what a single detector measures.',
      'three-sources':
        'Three very different windows from the same equations: the black-hole pair stops at 68 Hz after 0.8 s, the neutron-star pair at 1.57 kHz after 158 s of which the lab models the last eight, and the mixed pair at 386 Hz after 35 s. Chirp masses of about 28, 1.2 and 3.0 solar masses.',
      'add-the-noise':
        'At 410 Mpc the signal is clearly visible above the simulated noise; by 2000 Mpc it is not findable by eye in the time series. Pressing New noise changes the gray trace and leaves the blue one exactly where it was.',
      'looks-like-is-not-enough':
        'The correct template near 0.9 or above, the wrong-mass template somewhere around 0.3 to 0.6, and the distant case still scoring high because the overlap is blind to amplitude. That last one is the finding: similarity does not fall with distance, which is precisely why it cannot be a detection statistic.',
      'what-they-actually-recorded':
        'A shift near 7 ms with the sign flipped, at which the two traces visibly line up. The readout reports -7.3 ms and a correlation of -0.76 as measured from the published files.',
      'model-against-measurement':
        'The measurement and the reconstruction agreeing closely through the last cycles, and a residual that is as loud before the signal arrives as after it. The rapid die-away at the end is the ringdown and this investigation’s own model does not produce it.',
      'five-recordings':
        'Five maps, four with a visible curve that climbs and stops, and an "End of the chirp" line for each of those four. For GW170817 the line says nothing clears the noise, and no end is measured. Expect some students to say they can see a faint track on its map anyway; that is worth keeping for screen 27.',
      'the-same-moment':
        'About 58, 69, 55 and 104 Hz for GW150914, GW190412, GW190521 and GW190814, read from the line for a twentieth of a second before the end. The validator accepts anything within twelve per cent and names the event that is off. GW170817 has no reading and is not asked for.',
      'what-the-catalog-says':
        'Where the ranking prediction on screen 25 is marked, and the answer is GW190521: the lowest frequency at the same moment before the end, and no reading at a tenth of a second, both point the same way. The common wrong answer is GW190814, from "higher frequency, more energy"; the marking is held until this screen so the catalog settles it rather than the answer key. Chirp masses of about 63, 28, 13 and 6 solar masses for GW190521, GW150914, GW190412 and GW190814, in the order the ranking predicted, and GW170817 at 1.186. The distance of GW190521 is about seven times that of GW150914, and its redshift of 0.56 is why its detector-frame chirp mass is near 99.',
      'the-one-you-cannot-measure':
        'No measured end for GW170817, a catalog signal-to-noise ratio of 33 - the highest of the five - and a six-and-a-half-second map against three for the others. Students may report a faint track in the last two seconds, climbing from about 110 to 190 Hz, and they are right that it is where the model puts the signal. Its loudest pixel there reaches about 18, where the threshold for a search of the whole six-and-a-half-second map is about 26 - noise alone would put a couple of dozen pixels above 14 somewhere in a map that size. Expect some students to point instead at the brightest patch, near 37 Hz about four seconds before the catalog time. It is not on the track, and at about 25 it is still below that threshold. The track is real and not measurable here; the brighter patch is measurable-looking and not real. That contrast is the screen in miniature.',
      'the-model-on-five':
        'For GW150914 the model gives about 42 and 55 Hz against a measured 43 and 58. For GW190814 it gives about 112 and 145 Hz against 90 and 104. For GW190521 the model line appears only in the last few hundredths of a second, because the leading-order chirp for about 99 detector-frame solar masses is below 30 Hz until then. For GW170817 it gives about 55 seconds in band from 30 Hz.',
      'measured-or-supplied':
        'A sort into two lists, with the model track correctly placed in neither. The strongest answers name the ranking as the conclusion that needed both kinds: a measured frequency order that predicted a catalog mass order.',
      'your-own-experiment':
        'Any controlled comparison with one variable and a saved capture. Distance and viewing angle change amplitude alone; mass changes the shape as well, so a mass change is two effects and a good answer says so.',
    },
    'a-universe-of-stars': {
      'the-numbers-arrive':
        'Near 3,373 K, 4,298 K and 16,596 K. The order on the stage is by radius, so the temperatures are deliberately not in stage order - students who read them off in the order shown will get them out of sequence, which is the intended stumble.',
      'temperature-makes-color':
        'Deep red at the cool end through white to blue-white at the hot end. Do not grade the color words; the observation that matters is that only one control moved.',
      'same-temperature-different-light':
        'Both stars near 4,300 K; luminosities of about 0.18 and 62 solar, a ratio near 345.',
      'measure-the-radius-ratio':
        'Radii 0.78 and 14.3 solar, a ratio of about 18.4. The square root of 345 is 18.6; the small discrepancy is the 26 K difference in temperature and is worth mentioning if a student notices it.',
      'the-two-axes':
        'Anywhere within about 15 per cent of 10,000 K and 100 solar luminosities. The common failure is moving right to get hotter.',
      'where-the-sun-sits':
        'A radius of 1.00 solar, give or take the precision of the placement.',
      'straight-up-the-diagram':
        'About 100 solar radii. Four decades of luminosity at fixed temperature is two decades of radius, every time.',
      'lines-of-constant-radius':
        'Any two points on the 1 R-sun reference line. A good pair might be 3,000 K at 0.073 L-sun and 12,000 K at 18.7 L-sun: the temperature ratio is 4 and the luminosity ratio is 256, which is 4 to the fourth.',
      'three-on-the-main-sequence':
        'Luminosities of about 0.0066 and 58,550 solar, a ratio near nine million, for a mass ratio of 100.',
      'the-whole-sequence':
        'About 1.2, 726 and 58,550 solar luminosities, giving a slope near 3.6 between the ends.',
      'measure-the-two-reds':
        'Radii 0.24 and 101.6 solar, a ratio of 426; luminosities 0.0066 and 1,146 solar, a ratio of about 173,000. The square of 426 is 181,000 and the gap is the 40 K difference in temperature.',
      'a-supergiant':
        'About 1,070 solar radii and a current mass near 14, from an initial 20. The mass loss is the number students skip past; it is worth stopping on.',
      'hot-and-faint':
        'About 47,600 K, 1.6 solar luminosities and 0.018 solar radii - roughly twice the radius of the Earth, holding 0.54 solar masses.',
      'measure-the-lifetimes':
        'About 1,140,000, 9,880 and 8.7 million years for 0.2, 1 and 20 solar masses. Students often mis-key the trillion; the validation accepts billions and says so.',
      'a-population':
        '227 M, 93 K, 21 G out of 351 placed. Not one O and not one B: the sample drew a few and they had already left the main sequence.',
      'only-the-bright-ones':
        'Sixteen stars kept, of which 8 F, 6 G, 2 A, and no K or M at all.',
      'find-a-counterexample':
        'Any pair where the hotter star is the fainter, or where the cooler star exceeds ten solar radii. The end of the 1 solar-mass track and the end of the 20 solar-mass track each supply one in a single click.',
      'spectra-two-features':
        'Hydrogen beta, about 36.6, 14.4, 9.0 and 4.8 per cent for W, X, Y and Z. Calcium II K, about 3.4, 56.1, 52.6 and 21.9 per cent for the same four. The hydrogen column falls the whole way; the calcium column rises and then falls, which is the point of the screen and the thing to draw on the board. Accept anything within a point or two - the figures move slightly with which window is on screen because the shaded band is the same but the plot is not. A student who reports the calcium column in falling order has read the rows in stage order rather than by name; the validation catches it.',
    },
    'lives-of-stars': {
      'contraction-luminosity':
        'The radius falls from about 14.9 to about 0.88 solar radii across the pre-main-sequence stage, over 42 million years. Students sometimes read the two boxes in the wrong order; the validator catches it and says so.',
      arriving:
        'About 5,740 K and 0.80 solar luminosities at 457 million years - the zero-age main sequence.',
      'the-sun-today':
        'About 5,850 K, 1.11 solar luminosities, 1.03 solar radii at 4.6 Gyr. Worth pointing out that the real Sun is 5,772 K and 1.00 by definition, so the model is within a couple of per cent without having been fitted.',
      'across-the-main-sequence':
        'From 0.80 to 2.28 solar luminosities over 9.9 billion years - nearly three times - with the surface temperature almost unchanged.',
      'compare-young-and-old':
        'Radii of about 0.90 and 1.56 solar - a factor of 1.7 across ten billion years, and the smallest change in the investigation. Both versions are on the canvas at once, so a student can click either. Hold on to these: three screens later the same star is 173.',
      'the-interior':
        'On the main sequence a filled core; on the red-giant branch a ring outside a core that is no longer the energy source. Expect at least one student to ask how big the shell really is, which is the question the "The interior" row answers: the model does not say.',
      'core-in-envelope-out':
        'From about 1.65 to about 173 solar radii, with the surface cooling from 5,590 K to about 3,070 K.',
      'measure-the-giant':
        'About 3,070 K, 2,390 solar luminosities, 173 solar radii, and 0.95 solar masses. The mass is the number to stop on: a giant is a stage, not a heavyweight.',
      'true-size-then-and-now':
        'Two comparisons on one screen. On the canvas: freeze the star on the main sequence, run to the tip of the giant branch, and the frozen copy is about 0.9 solar radii beside a live star near 170 - a factor of two hundred, side by side, on one scale. Expect the class to freeze at different moments, which makes the discussion better; ask what the label says, because the age is on it and a copy without one is indistinguishable from a second star. In the panel: true-size mode makes the main-sequence star a mark and the giant fill the box, fitted mode fills it with both and the caption says the size means nothing.',
      'the-agb-and-the-wind':
        'From 1.00 to about 0.54 solar masses - nearly half the star leaves. Most of the loss is late on the asymptotic giant branch, so students who stop early will see too little.',
      'white-dwarf-cooling':
        'About 47,600 K, 1.6 solar luminosities, 0.018 solar radii, 0.54 solar masses. Roughly twice the radius of the Earth.',
      'how-long-was-each-part':
        'About 9.88 Gyr, 1.42 Gyr and 1.35 Myr. The last is a ten-thousandth of the first and gets a third of the playhead.',
      'the-same-age':
        'About 1.11 and 0.0048 solar luminosities, a ratio near 230. Both stars are on the canvas and both are 4.6 billion years old - the same AGE, not the same fraction of a life: the Sun-like star is half way through its main sequence and the red dwarf has done four thousandths of its. Contrast with screen 1, where all three are half way through their own, explicitly; a class that misses the difference reads this screen as contradicting that one.',
      'massive-versus-sun':
        'About 1.11 against 43,000 solar luminosities, and 9.88 Gyr against 8.65 Myr.',
      'supergiant-and-burning':
        'The radius climbs past 1,000 solar radii while the mass falls from 20 towards 14. Six solar masses lost to a wind is more than most stars weigh in total.',
      'the-neutron-star':
        'A remnant of about 1.4 solar masses, from a track that stopped with 9.4. The wording of the "How this is known" row is the point of the screen, not the number.',
      'the-black-hole':
        'The track stopped during helium ignition with 35.1 of the original 40 solar masses, and the remnant range is 10 to 35 solar masses - a factor of three.',
      'design-a-comparison':
        'Any two models. The validator recognizes both outcomes: heavier-and-brighter, which is the main-sequence case, and lighter-and-brighter, which means one of them is off it.',
    },
    'twelve-nights': {
      'measure-the-window':
        'The window reads 4.96 h and the drift 3.9 min per night. A student reading 8-9 hours has read the astronomical-night row rather than the usable one; a student reading about 2 hours has left the airmass slider low.',
      'measure-the-window-power':
        'About 0.998 for the best-moment plan and about 0.701 for both-ends. The second figure is the one to dwell on: it is a large improvement and it is still a peak of 0.7.',
      'why-not-one-day':
        'Option B. Expect "the Sun moves" as the common wrong answer - it is option D, and it is wrong because twilight is not what opens the window.',
      'read-what-you-got':
        'The best-moment run should return 0.58, 0.78 or 1.39 days. About one class in five will see it return 3.52 anyway, which is the correct behavior at a window power of 1 and is what the validator says; a second seed settles it. The both-ends run returns about 3.52 roughly four times in five.',
    },
    'power-law-gravity': {
      'record-the-precession':
        'Precession readings of about -31.42, 0.00, 9.38 and 42.67 degrees per orbit at n = 1.8, 2, 2.05 and 2.2. The n = 2 value is zero to several decimals; a student reading anything above about half a degree there has read the wrong preset, and the field validation warns them. The negative sign at n = 1.8 is a result, not a typo.',
      'refine-the-timestep':
        'At n = 2.2 the four timesteps all give 42.667 degrees and the spread is around 1e-5 degrees or smaller. At n = 2 every reading is zero. The comparison students should make is between the spread and the effect itself, which differ by six orders of magnitude.',
      'measure-the-slope':
        'Slopes of 1.400, 1.500, 1.600 and 1.750 at n = 1.8, 2, 2.2 and 2.5. These are exact to the displayed precision, which surprises students who expect measured numbers to be untidy; the orbits are circular and the fit is over a wide radius range, so the residual is around 1e-14.',
      'predict-the-slope':
        'Answer 1.95, from (n+1)/2 at n = 2.9. Tolerance is 0.03, so a student who reads the pattern as "half of one more than n" gets it and one who guesses does not.',
      'measure-conservation':
        'Momentum and angular-momentum drift around 1e-15 at both exponents, with no systematic difference between them. Energy drift is around 1e-5, larger than the other two because that bench uses a first-order scheme; it is bounded rather than growing, which is the point.',
    },
  },
};
