// =============================================================================
// Format-specific teaching guidance
// -----------------------------------------------------------------------------
// The investigation already has instructor content - overview, prior knowledge,
// misconceptions, expectations - and js/data/instructorContent.js is where it
// lives. None of it is repeated here. What is here is the part that changes
// with the format and only with the format: what to ask a room in five minutes
// versus what to set a pair for twenty, where to stop, and how long each
// stretch is thought to take.
//
// Timings are estimates. Every one of them. They are reasoned from the step
// types rather than measured with students, and the documents say so on the
// page rather than in a footnote.
// =============================================================================

// The launch link is NOT here. It is derived from the two ids by
// activityLaunchUrl() in js/activities/activityBridge.js, and this file is a
// domain module: importing a feature module from here is an upward dependency
// the architecture check refuses, and it would drag the bridge - which
// js/investigationsLoader.js is careful to import lazily - into the start-up
// graph and past the initial-download budget. Whoever renders a link already
// has the activity and the format, so it is built there.

/** Guidance for each format, keyed by `<activity>/<format>`. */
export const ACTIVITY_TEACHING = Object.freeze({
  'orbital-speed/demonstration': Object.freeze({
    prepare:
      'Open the link before the class arrives so the scenario is cached, and decide whether you are taking a show of hands or just talking over it. Five minutes from the front, one machine, no student devices needed.',
    reset:
      '"Restart experiment" rebuilds the world from the same seed; "Home" re-centers the camera without disturbing the run. Both are safe mid-demonstration.',
    observe:
      "On the live canvas: the eccentric planet hurries through periapsis and crawls at apoapsis, and with it selected the inspector's speed row changes as it goes. When the equal-area slices are opened, the wedges near the star are visibly thin and long and the far ones wide and short - and they are the same area.",
    access:
      'Keyboard: Tab reaches the canvas, the inspector, the tool controls and Next; space runs and pauses; the preset buttons are reachable by Tab and fired by Enter, which is the way back to any value a step staged. Touch: bodies are large enough to tap and no step requires a drag. Reduced motion: the orbit animates because the motion is the subject, but every number the activity asks for can be read while paused, so a student can step instead of watch. Sound is not used anywhere in this activity.',
    worksheet:
      'There is no worksheet for this format; it is a front-of-room demonstration. The guided and lab formats carry one, and the three screens here are the first three of the guided sheet if you want to hand something out afterwards.',
    setup:
      'Open the link before the class arrives and leave it on the prediction step. It opens paused, so nothing moves until you let it.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Show the orbit, still.',
        ask: 'This planet goes round this star on a fixed path. Where on that path is it moving fastest?',
        note: 'Take a show of hands on the four options before revealing anything. A room that has committed watches differently from a room that has not.',
      }),
      Object.freeze({
        at: '1:00',
        what: 'Run it. Keep the eccentric planet selected so the live speed is on screen.',
        ask: 'Watch the speed reading. When is it largest?',
        note: 'Let it go round twice. The first lap is a surprise; the second is an observation.',
      }),
      Object.freeze({
        at: '3:00',
        what: 'Open the equal-area slices.',
        ask: 'Every one of these wedges took the same time to sweep. What does that force the speed to do near the star?',
        note: 'This is the step that turns the observation into a reason. The wedges are thin and long near the star and wide and short far away, and they are equal in area.',
      }),
      Object.freeze({
        at: '4:30',
        what: 'Close.',
        ask: 'What would have to be true for a planet to move at a constant speed all the way round?',
        note: 'A circular orbit, where the distance never changes. A student who gets there has the idea rather than the phrase.',
      }),
    ]),
    expected:
      'Fastest at closest approach. The good answer connects it to the equal-area rule: a wedge drawn near the star is short in radius, so it has to be long around to enclose the same area, which means more ground covered per unit time.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim: 'It speeds up because gravity is stronger when it is closer.',
        response:
          'True of the force and not an explanation of the speed: a circular orbit keeps a constant speed at constant strong gravity. What changes here is the distance, and it is the product of distance and transverse speed that holds still.',
      }),
      Object.freeze({
        claim:
          'The equal-area rule is a separate fact that has to be remembered.',
        response:
          'It is the same statement as the conserved quantity, in a form that can be drawn. A wedge near the star is short in radius, so it has to be long around to enclose the same area.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Predicts periapsis and explains it by the equal-area rule or by the trade between distance and speed.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Predicts periapsis but explains it as "gravity is stronger there so it goes faster" without reference to what is conserved.',
      }),
      Object.freeze({
        band: 'Not yet',
        looks: 'Predicts constant speed, or fastest at the far point.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem: 'The speed readout is not on screen.',
        fix: 'Nothing is selected. Click the eccentric planet; the inspector fills in and the speed row appears.',
      }),
      Object.freeze({
        problem: 'The orbit is the wrong shape after somebody dragged a body.',
        fix: 'Restart experiment. It rebuilds the world from the same seed and leaves written answers alone.',
      }),
    ]),
  }),

  'orbital-speed/guided': Object.freeze({
    prepare:
      "Students need their own device and the link; nothing else. Check once beforehand that the room's network reaches the site, and after that it works offline. Twenty minutes is the estimate and the measurement screens are where it goes.",
    reset:
      '"Restart experiment" rebuilds the world without touching written answers, which is the button to point at when somebody has changed the orbit. Progress is saved per browser under this activity alone, so a demonstration you ran earlier will not show up as their work.',
    observe:
      "On the live canvas: the shape of the orbit changes as the eccentricity control moves, and the planet's pace around it changes with it. Students should be reading the inspector's speed row, not judging the pace by eye - the readout is the evidence and the animation is the reason to believe it.",
    access:
      'Keyboard: Tab reaches the canvas, the inspector, the tool controls and Next; space runs and pauses; the preset buttons are reachable by Tab and fired by Enter, which is the way back to any value a step staged. Touch: bodies are large enough to tap and no step requires a drag. Reduced motion: the orbit animates because the motion is the subject, but every number the activity asks for can be read while paused, so a student can step instead of watch. Sound is not used anywhere in this activity.',
    worksheet:
      'Six boxes, one per screen and in screen order: the shape chosen, the prediction, what the run looked like, the equal-area observation, the two speeds with their ratio, and the written explanation. Only the two measurement boxes need the simulation open.',
    setup:
      'Students open the link themselves. No account and no setup; progress saves in their own browser under this activity alone, so a demonstration you ran earlier will not appear as their work.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Shape the orbit and predict.',
        ask: 'Before you run anything: where will it be fastest, and why do you think so?',
        note: 'The prediction is recorded. Students who change their mind later can see what they first thought, which is the point of asking.',
      }),
      Object.freeze({
        at: '5:00',
        what: 'Watch, then open the equal-area slices.',
        ask: 'Which wedge took longest to sweep?',
        note: 'None of them: they all took the same time. Expect this to be the surprising one.',
      }),
      Object.freeze({
        at: '9:00',
        what: 'Measure at both extremes with the event tool.',
        ask: 'Arm it for periapsis, read the speed and distance, then arm it for apoapsis.',
        note: 'The tool stops the simulation at the event rather than asking students to catch it. Circulate here: the common error is reading the two the wrong way round, and the activity warns about it.',
      }),
      Object.freeze({
        at: '16:00',
        what: 'Explain, in writing.',
        ask: 'What is conserved, and why does gravity not change it?',
        note: 'Angular momentum, because gravity is a central force and exerts no torque about the star. An energy argument earns credit too.',
      }),
    ]),
    expected:
      'The speed ratio should come out close to the distance ratio inverted. Students who measure carefully find v_peri/v_apo ≈ r_apo/r_peri, which is the equal-area rule in numbers.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim: 'It speeds up because gravity is stronger when it is closer.',
        response:
          'True of the force and not an explanation of the speed: a circular orbit keeps a constant speed at constant strong gravity. What changes here is the distance, and it is the product of distance and transverse speed that holds still.',
      }),
      Object.freeze({
        claim:
          'The equal-area rule is a separate fact that has to be remembered.',
        response:
          'It is the same statement as the conserved quantity, in a form that can be drawn. A wedge near the star is short in radius, so it has to be long around to enclose the same area.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Both measurements taken at the right events, the ratio computed, and the explanation names a conserved quantity and says why gravity does not change it.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Measurements correct; the explanation describes the pattern ("closer means faster") without identifying what is conserved.',
      }),
      Object.freeze({
        band: 'Not yet',
        looks:
          'Measurements swapped or taken away from the events, so the ratio is near one or below it.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem: 'The speed readout is not on screen.',
        fix: 'Nothing is selected. Click the eccentric planet; the inspector fills in and the speed row appears.',
      }),
      Object.freeze({
        problem: 'The orbit is the wrong shape after somebody dragged a body.',
        fix: 'Restart experiment. It rebuilds the world from the same seed and leaves written answers alone.',
      }),
    ]),
  }),

  'orbital-speed/lab': Object.freeze({
    prepare:
      'A full period, student devices, and the expectation that pairs will work at different speeds. Worth deciding in advance where you will call time - screen 9 is a complete outcome and screen 10 is the extension. Open the link once beforehand so the scenario is cached.',
    reset:
      '"Restart experiment" is the safe button throughout: same seed, same world, written answers untouched. The lab measures two orbits, so a mid-session reset does not invalidate earlier measurements - they were taken from the same reproducible world.',
    observe:
      "On the live canvas across the session: where the star actually sits in the ellipse (not the center), what occupies the other focus (nothing), the two orbits being measured off the inspector, and the speed changing around the eccentric one. The lab's last screen is where Kepler's version stops working, and that is a reading rather than a measurement.",
    access:
      'Keyboard: Tab reaches the canvas, the inspector, the tool controls and Next; space runs and pauses; the preset buttons are reachable by Tab and fired by Enter, which is the way back to any value a step staged. Touch: bodies are large enough to tap and no step requires a drag. Reduced motion: the orbit animates because the motion is the subject, but every number the activity asks for can be read while paused, so a student can step instead of watch. Sound is not used anywhere in this activity.',
    worksheet:
      'Ten boxes in screen order, grouped into three: the geometry of the ellipse (screens 1-4), the speed measurements (screens 5-9), and the closing reading (screen 10). The sheet marks which boxes need the simulation open - the geometry and the measurements - and which can be finished away from it.',
    setup:
      'A full period. Students work through it themselves; the last two steps change to a different system, so warn them the screen is meant to change.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Where the star sits, and what the shape means.',
        ask: 'Is the star at the center of the ellipse?',
        note: 'It is at a focus. The empty focus has nothing at it, which students find unsatisfying and which is worth sitting with.',
      }),
      Object.freeze({
        at: '10:00',
        what: 'The controlled comparison: two orbiters, same star, same semi-major axis.',
        ask: 'What is different between these two orbits, and what is the same?',
        note: 'Eccentricity differs; the star, the size of the orbit and therefore the period do not. This is the step that makes the later comparison a controlled one rather than an anecdote.',
      }),
      Object.freeze({
        at: '20:00',
        what: 'Predict, watch, slice, and measure at both extremes.',
        ask: 'How precise is that speed, really?',
        note: 'The tool interpolates the event time and stops at the first step after it, so the reading is a short way past the extreme. The activity says so; ask students what that does to their ratio and in which direction.',
      }),
      Object.freeze({
        at: '38:00',
        what: 'Explain, then transfer.',
        ask: 'Where does "the planet orbits the star" stop being the right description?',
        note: 'When the two masses are comparable, both bodies orbit a common center and neither is stationary. The final step moves to a system where that matters.',
      }),
    ]),
    expected:
      'A conclusion that cites the measured ratio, names angular momentum, and states the controlled variable. The transfer answer should recognize that the reasoning assumed one body was effectively fixed.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim: 'It speeds up because gravity is stronger when it is closer.',
        response:
          'True of the force and not an explanation of the speed: a circular orbit keeps a constant speed at constant strong gravity. What changes here is the distance, and it is the product of distance and transverse speed that holds still.',
      }),
      Object.freeze({
        claim:
          'The equal-area rule is a separate fact that has to be remembered.',
        response:
          'It is the same statement as the conserved quantity, in a form that can be drawn. A wedge near the star is short in radius, so it has to be long around to enclose the same area.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Conclusion supported by their own numbers, control stated explicitly, precision discussed, and the transfer answered in terms of the assumption that fails.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Measurements and conclusion sound; control or precision left implicit; transfer answered by analogy rather than by naming the assumption.',
      }),
      Object.freeze({
        band: 'Not yet',
        looks:
          'Conclusion restates the prediction without using the measurements.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem: 'The speed readout is not on screen.',
        fix: 'Nothing is selected. Click the eccentric planet; the inspector fills in and the speed row appears.',
      }),
      Object.freeze({
        problem: 'The orbit is the wrong shape after somebody dragged a body.',
        fix: 'Restart experiment. It rebuilds the world from the same seed and leaves written answers alone.',
      }),
    ]),
  }),
  'orbital-speed/route': Object.freeze({
    prepare:
      'Nothing to install and nothing to log into. Open the link once yourself before the session so the scenario is cached; after that it works offline. Five minutes is the whole budget, so decide in advance whether you are running it from the front or setting it as a link.',
    setup:
      'The link opens Kepler\u2019s 2nd Law with the eccentric planet already selected, paused, on the prediction. Leave it paused: screen 1 of the route is a prediction and it is meant to be committed to before anything moves.',
    reset:
      '"Restart experiment" rebuilds the world from the same seed and leaves written answers alone, so it is the safe button. "Home" re-centers the camera without touching the run. If the planet has been dragged, restart rather than trying to put it back by eye - the orbit is what is being measured.',
    observe:
      'On the live canvas: the eccentric planet visibly hurries through periapsis and crawls at apoapsis, and the speed readout in the inspector changes with it. That readout is the measurement; the animation is what makes it worth believing. Students who watch only the picture will say "it looks faster" - the number is what turns that into evidence.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Screen 8, still. The orbit is drawn and nothing is moving.',
        ask: 'Where on this path is it moving fastest?',
        note: 'Take the prediction before releasing anything. It is recorded, and screen 12 comes back to it.',
      }),
      Object.freeze({
        at: '1:00',
        what: 'Screen 9. Let it run, with the eccentric planet selected so the live speed is on screen.',
        ask: 'Watch the speed figure rather than the dot. When is it largest?',
        note: 'Two laps. The first is a surprise and the second is an observation.',
      }),
      Object.freeze({
        at: '2:30',
        what: 'Screen 11. Read the speed at both extremes.',
        ask: 'How many times faster is it at its closest than at its farthest?',
        note: 'This is the stopping point if the bell is close: a measured ratio is a complete outcome, and screen 12 can be set as written homework.',
      }),
      Object.freeze({
        at: '4:00',
        what: 'Screen 12. Close on the explanation.',
        ask: 'What is staying constant while the speed changes?',
        note: 'Angular momentum. Accept "it trades distance for speed" as the idea and supply the name.',
      }),
    ]),
    expected:
      'Fastest at closest approach, by a ratio the student read off rather than recalled, and an explanation that names something conserved rather than saying gravity is stronger there.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim: 'It speeds up because gravity is stronger when it is closer.',
        response:
          'True of the force and not an explanation of the speed: a circular orbit has a constant speed at constant strong gravity. What changes here is the distance, and the product of distance and transverse speed is what holds still.',
      }),
      Object.freeze({
        claim: 'The planet is being flung outward at periapsis.',
        response:
          'Nothing is pushing outward. Ask what would happen if you turned gravity off at that instant - it would leave in a straight line, not curve away.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Predicts periapsis, quotes their own measured ratio, and explains it by something conserved.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Predicts periapsis and measures the ratio, but explains it as "gravity is stronger there".',
      }),
      Object.freeze({
        band: 'Not yet',
        looks: 'Predicts constant speed, or fastest at the far point.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem: 'The speed readout is not on screen.',
        fix: 'Nothing is selected. Click the eccentric planet on the canvas; the inspector fills in and the speed row appears.',
      }),
      Object.freeze({
        problem:
          'Somebody dragged the planet and the orbit is a different shape.',
        fix: 'Restart experiment. The route is about one orbit\u2019s shape, so a changed one makes screen 11 measure something else.',
      }),
    ]),
    access:
      'Keyboard: Tab reaches the canvas, the inspector and Next in that order; space runs and pauses; the speed readout is read out as text, not only drawn. Touch: the planet is a large enough target to tap, and nothing here needs a drag. Reduced motion: the orbit still animates, because the motion IS the subject - but every number the route asks for is also readable while paused, so a student who prefers it can step rather than watch. Sound is not used.',
    worksheet:
      'Four boxes, one per screen, in the order they appear: the prediction (screen 8), what was seen (screen 9), the two speeds and their ratio (screen 11), and the explanation (screen 12). The measurement box is the only one that needs the simulation open; the rest can be finished away from it.',
  }),

  'binary-planets/route': Object.freeze({
    prepare:
      'Open it once beforehand so the Binary Planet Lab scenario is cached. Worth knowing before you start: the answer is that the planet leaves, and it leaves within the twenty periods the route runs - so this is a five-minute activity with a real result in it rather than a demonstration of a graph.',
    setup:
      'The link opens the Binary Planet Lab on the prediction screen, with the planet at 0.30 of the binary separation and the world paused. The seed is fixed, so every student who runs it sees the same departure.',
    reset:
      '"Restart experiment" rebuilds the pair and the planet from the same seed, which is what makes the timing comparable between students. Written answers survive it. Do not reset between screens 9 and 10 - the departure time measured on screen 10 is the one from the run watched on screen 9.',
    observe:
      'On the live canvas: two stars circling each other, and a planet that holds an orbit for several binary periods, wobbles, and then leaves. The moment of departure is visible as the path straightening out. The energy readout crossing zero is the evidence; the picture is what makes a student believe the number.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Screen 8, paused. The geometry is on screen and the planet is at 0.30 separations.',
        ask: 'Over twenty binary periods, does this orbit survive?',
        note: 'Commit before running. Most rooms say it survives, which is why running it is worth the four minutes.',
      }),
      Object.freeze({
        at: '1:00',
        what: 'Screen 9. Run it and let it go.',
        ask: 'Watch the planet rather than the stars. When does its path stop closing?',
        note: 'Do not narrate the departure before it happens. The surprise is the teaching.',
      }),
      Object.freeze({
        at: '3:00',
        what: 'Screen 10. Read the time and the energy at departure.',
        ask: 'At what point did the energy go positive, and is that the same moment it looked like it left?',
        note: 'Natural stopping point. If the bell goes here, screen 11 is a good written exit ticket.',
      }),
      Object.freeze({
        at: '4:00',
        what: 'Screen 11. Close on what "ejected" means.',
        ask: 'Why is positive energy on its own not enough to say it has gone?',
        note: 'Because a planet can be briefly positive and come back while it is still close to both stars. Leaving means positive energy AND far enough out that the pair acts as one mass.',
      }),
    ]),
    expected:
      'The prediction is usually wrong, and the good answer says so. Look for a departure time read off the run rather than guessed, and for an answer to screen 11 that distinguishes a momentary positive energy from an escape.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim: 'It left because it drifted too close to one of the stars.',
        response:
          'Look at the run again: the path grows over several periods before anything close happens. The energy is pumped a little on each pass, which is a different mechanism from a single slingshot.',
      }),
      Object.freeze({
        claim: 'Positive energy means it has escaped.',
        response:
          'This is what screen 11 exists for. Positive energy is necessary and not sufficient - the two-body energy is only meaningful once the planet is far enough out that the binary looks like one mass.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Records their prediction honestly, reads the departure time off the run, and says why positive energy alone does not settle it.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Measures the departure but treats positive energy as the whole definition of escape.',
      }),
      Object.freeze({
        band: 'Not yet',
        looks:
          'Reports that the orbit survived, or gives a departure time that does not match the run.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem: 'The planet is gone before anybody looked.',
        fix: 'Restart experiment and slow the speed before running. The seed is fixed, so it leaves at the same time again.',
      }),
      Object.freeze({
        problem: 'The energy readout is not showing.',
        fix: 'Select the planet. The readout is a property of the selected body, and a run with the star selected reports the star\u2019s energy instead.',
      }),
    ]),
    access:
      'Keyboard: space runs and pauses, and the departure can be found by stepping rather than by watching in real time. Touch: the planet is small once it is far out - tap it before running, while it is still near the pair, and the selection follows it. Reduced motion: run at a reduced speed and read the energy row, which updates as text. Nothing here depends on color alone; the departure is a change in path shape and a sign change in a number.',
    worksheet:
      'Four boxes matching the four screens: the prediction at 0.30 separations, what the run looked like, the departure time with the energy at that moment, and the written answer about what ejection means. The middle two need the simulation; the last does not.',
  }),

  'star-sizes/route': Object.freeze({
    prepare:
      'This is the one activity with no fixed scenario to load: each step builds or selects its own stellar model, so there is no world to reset and nothing cached to check beyond the page itself. Four minutes, and it is arithmetic rather than a simulation run - useful when the projector is the only machine in the room.',
    setup:
      'No scenario is loaded and none should be. The link opens the comparison instrument on the prediction screen with two stars already staged at the same surface temperature. If the canvas behind the panel is empty, that is correct: this activity lives in the instrument, not in the sandbox.',
    reset:
      'There is no world to restart. The instrument\u2019s own preset buttons put the two stars back where the step staged them, which is the way back if a slider has been moved. "Restart experiment" is available and harmless, and rebuilds nothing because nothing was built.',
    observe:
      'In the instrument, not on the sandbox canvas: two stars at one temperature and very different luminosities, drawn to scale against each other, with the radius ratio stated as a number. The point a student should see is that the drawing and the arithmetic agree - the bigger disc really is about seventeen times the radius, not three hundred.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Screen 5. Two stars, same temperature, one 300 times brighter.',
        ask: 'How many times bigger is its radius?',
        note: 'Take the prediction. "300 times" is the common answer and it is the one the activity is for.',
      }),
      Object.freeze({
        at: '1:00',
        what: 'Screen 6. Measure the ratio in the instrument.',
        ask: 'What did you get, and how does it compare with what you said?',
        note: 'About 17, because luminosity goes as radius squared at fixed temperature and the square root of 300 is 17.3. Let them find the square root rather than supplying it.',
      }),
      Object.freeze({
        at: '2:30',
        what: 'Screen 10. Move sideways along one luminosity, 3,000 K to 30,000 K.',
        ask: 'If the brightness is held and the temperature goes up tenfold, what happens to the size?',
        note: 'It falls, by a hundred. This is the same relation read in the other direction, and it is the check that the first answer was understood rather than recalled.',
      }),
    ]),
    expected:
      'Seventeen rather than three hundred, with the square root named, and a correct direction for the sideways move. The strong answer states the relation once and uses it twice.',
    misconceptions: Object.freeze([
      Object.freeze({
        claim:
          'Three hundred times the light means three hundred times the size.',
        response:
          'The whole point of the activity. Light comes off a surface, and surface goes as radius squared, so the radius ratio is the square root - 17, not 300.',
      }),
      Object.freeze({
        claim: 'A hotter star is always a bigger star.',
        response:
          'Screen 10 is the counterexample: hold the luminosity and raise the temperature, and the star has to shrink. Temperature and size are independent axes, which is what makes the diagram worth plotting.',
      }),
    ]),
    rubric: Object.freeze([
      Object.freeze({
        band: 'Secure',
        looks:
          'Gets about 17, names the square root, and reasons the sideways move correctly rather than guessing its direction.',
      }),
      Object.freeze({
        band: 'Developing',
        looks:
          'Measures 17 in the instrument but cannot say why it is not 300.',
      }),
      Object.freeze({
        band: 'Not yet',
        looks:
          'Answers 300, and answers the sideways move by saying the size grows.',
      }),
    ]),
    recovery: Object.freeze([
      Object.freeze({
        problem:
          'A slider has been moved and the two stars are no longer at one temperature.',
        fix: 'Press the preset the step names. The instrument restores both stars exactly, which matters here because the comparison is only meaningful at equal temperature.',
      }),
      Object.freeze({
        problem:
          'The canvas behind the panel is empty and somebody thinks it is broken.',
        fix: 'It is not. This activity has no scenario; every step works inside the instrument. Say so at the start and it stops being a distraction.',
      }),
    ]),
    access:
      'Keyboard: every control in the instrument is a slider or a button in the tab order, and the preset buttons are reachable by Tab and activated by Enter - which is also the way back to a staged value. Touch: the sliders are draggable but the presets make dragging optional, which matters on a phone. Reduced motion: nothing here animates; the activity is static by nature. The radius ratio is printed as a number as well as drawn, so the comparison does not depend on judging two discs by eye.',
    worksheet:
      'Three boxes, matching the three screens: the predicted ratio, the measured ratio with the arithmetic that connects them, and the direction of the sideways move with a reason. There is no scenario box on this worksheet, because there is no scenario - the sheet says so rather than leaving a blank.',
  }),
});

/**
 * Guidance for one format.
 * @param {string} activityId - Activity id
 * @param {string} formatId - Format id
 * @returns {?object} The guidance, or null
 */
export const activityTeachingFor = (activityId, formatId) =>
  ACTIVITY_TEACHING[`${activityId}/${formatId}`] ?? null;

/**
 * What to do when the room goes wrong.
 *
 * The same list for every format, because the failures are the same and three
 * copies of them is three things to keep in step.
 */
export const RECOVERY = Object.freeze([
  Object.freeze({
    problem: 'The simulation will not load, or the page is blank.',
    fix: 'Reload. Gravitas is a static page with no server and no account, so a reload loses nothing but the current position, and progress is saved as you go.',
  }),
  Object.freeze({
    problem: 'A student says their answers have gone.',
    fix: 'Progress lives in that browser. A different browser, a different machine or a private window is a different student as far as the page is concerned. Check they are on the same one.',
  }),
  Object.freeze({
    problem: 'The event tool never stops the simulation.',
    fix: 'It has to be armed, and the two bodies have to be chosen. The step opens it with the right pair already selected; if the world was reset by hand, choose the Eccentric Orbiter and Kepler Star again and press Arm.',
  }),
  Object.freeze({
    problem: 'Somebody has dragged the view somewhere unhelpful.',
    fix: 'Press Home to put the camera back. Restart experiment rebuilds the world without touching written answers.',
  }),
  Object.freeze({
    problem: 'The projector shows nothing but a dark rectangle.',
    fix: 'The simulation is paused and framed on an empty patch of sky. Press Home, then space to run it.',
  }),
]);
