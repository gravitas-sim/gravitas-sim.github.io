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

/** Guidance for each format, keyed by `<activity>/<format>`. */
export const ACTIVITY_TEACHING = Object.freeze({
  'orbital-speed/demonstration': Object.freeze({
    launch: 'gravitas-sim.online/#activity=orbital-speed/demonstration',
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
  }),

  'orbital-speed/guided': Object.freeze({
    launch: 'gravitas-sim.online/#activity=orbital-speed/guided',
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
  }),

  'orbital-speed/lab': Object.freeze({
    launch: 'gravitas-sim.online/#activity=orbital-speed/lab',
    setup:
      'A full period. Students work through it themselves; the last two steps change to a different system, so warn them the screen is meant to change.',
    beats: Object.freeze([
      Object.freeze({
        at: '0:00',
        what: 'Where the star sits, and what the shape means.',
        ask: 'Is the star at the centre of the ellipse?',
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
        note: 'When the two masses are comparable, both bodies orbit a common centre and neither is stationary. The final step moves to a system where that matters.',
      }),
    ]),
    expected:
      'A conclusion that cites the measured ratio, names angular momentum, and states the controlled variable. The transfer answer should recognise that the reasoning assumed one body was effectively fixed.',
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
