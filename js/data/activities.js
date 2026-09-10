// =============================================================================
// Classroom activities
// -----------------------------------------------------------------------------
// An instructor with five minutes, twenty minutes or a full period wants three
// different things out of the same physics, and the catalogue answers only the
// third: the investigations are complete lessons, and "which twelve of these
// thirty-seven steps fit before the bell" is work nobody should have to do
// twice.
//
// An activity is that work, done once and checked in. It is a teaching format
// - a duration, an audience, a purpose - pointing at steps that already exist.
//
// What this is NOT
// -----------------------------------------------------------------------------
// It is not a second lesson runner, not a copy of the catalogue, and not three
// forks of one investigation maintained in parallel. A format is a lesson id
// and an ordered list of that lesson's own permanent step ids, which is exactly
// what js/assignments/ already carries from an instructor's browser to a
// student's. Building a format produces an ordinary assignment: the same
// runner, the same progress store, the same printable page, the same
// prerequisite resolution, the same behaviour when a lesson is revised
// underneath it.
//
// That reuse is what makes the properties come free. Progress is namespaced per
// assignment id, so a demonstration and a full lab do not share answers. Steps
// travel as ids with fingerprints, so a rewritten question is detected rather
// than silently mis-answered. Nothing here needs to know any of that.
//
// Ordering
// -----------------------------------------------------------------------------
// A format lists steps and gets them back IN LESSON ORDER. An assignment is a
// subset of a sequence, not a reordering of one, because the prose refers
// backwards - "the value you measured above" - and shuffling produces nonsense.
// So a format cannot move a step to the end; where one is wanted there and the
// lesson puts it earlier, the answer is authored prose in `closing`, not a
// reordering that would break the step it borrowed.
//
// Durations
// -----------------------------------------------------------------------------
// Every one is an ESTIMATE and is labelled as one wherever it appears. They are
// reasoned from the step types - a prediction is a minute, a measurement with
// two armed events is closer to six - and have not been timed in a classroom.
// Saying "about 20 minutes" of something never run with students is a guess,
// and it should read as one until somebody has run it.
// =============================================================================

/**
 * The activities, in the order they are offered.
 *
 * One, deliberately. A catalogue of one honest activity is worth more than six
 * cards where five say "coming soon", and the structure below is what a second
 * one will slot into rather than something to be rebuilt for it.
 */
export const ACTIVITIES = Object.freeze([
  Object.freeze({
    id: 'orbital-speed',
    /** The investigation every format is cut from. */
    lesson: 'keplers-laws',
    /** Where the full lesson can be opened, and the scenario formats land in. */
    scenario: "Kepler's 2nd Law",

    // --- What it is about ---------------------------------------------------
    // Message ids rather than prose: everything a student or instructor reads
    // is in js/i18n/en.teaching.js and its Spanish shadow, like the rest of
    // the page this appears on.
    titleId: 'teach.activity.orbital-speed.title',
    questionId: 'teach.activity.orbital-speed.question',
    audienceId: 'teach.activity.orbital-speed.audience',
    prerequisitesId: 'teach.activity.orbital-speed.prerequisites',
    objectiveIds: Object.freeze([
      'teach.activity.orbital-speed.objective.1',
      'teach.activity.orbital-speed.objective.2',
      'teach.activity.orbital-speed.objective.3',
    ]),

    // --- What is true of the scenario, and what is therefore claimable ------
    // Recorded here because the claims a format may make are a property of the
    // world it opens, and the next person to add a format should not have to
    // re-derive them. Checked by tools/check-activities.mjs against the built
    // scenario, so a retuned scenario fails a build rather than a lecture.
    physics: Object.freeze({
      /** Kepler Star is ~1.1 million times the Eccentric Orbiter's mass. */
      testParticle: true,
      /** Both orbiters go round the same star, so a comparison is controlled. */
      primary: 'Kepler Star',
      bodies: Object.freeze(['Circular Orbiter', 'Eccentric Orbiter']),
      /** Distances and speeds in the lesson are relative to the primary. */
      frame: 'relative-to-primary',
      /** The second law is shown with a real swept-area overlay, not inferred
       *  from an equal-time distance comparison. */
      sweptArea: true,
    }),

    formats: Object.freeze([
      Object.freeze({
        id: 'demonstration',
        /** Stable, and stable is the point: it is the progress namespace. */
        assignmentId: 'act-orbital-speed-demo',
        nameId: 'teach.activity.format.demonstration',
        forId: 'teach.activity.orbital-speed.demonstration.for',
        /** An estimate, and the only place the number lives: the text beside
         *  it is teach.activity.duration with this substituted in. */
        minutes: 5,
        introId: 'teach.activity.orbital-speed.demonstration.intro',
        closingId: 'teach.activity.orbital-speed.demonstration.closing',
        /** Projected by an instructor, answered aloud by the room. */
        context: 'projection',
        /**
         * No step here requires a student to type anything to move on.
         * `where-does-it-move-fastest` is multiple choice, which a room can
         * answer by hand or through whatever polling the instructor already
         * uses; the closing discussion question is in the presenter notes and
         * in `closing`, not as a graded short answer that would stall a
         * five-minute demonstration on somebody's typing.
         */
        steps: Object.freeze([
          'where-does-it-move-fastest',
          'watch-it-happen',
          'equal-areas-however-you-slice',
        ]),
        /** Opened with the lesson panel; lecture mode is offered beside it. */
        lecture: true,
      }),

      Object.freeze({
        id: 'guided',
        assignmentId: 'act-orbital-speed-guided',
        nameId: 'teach.activity.format.guided',
        forId: 'teach.activity.orbital-speed.guided.for',
        minutes: 20,
        introId: 'teach.activity.orbital-speed.guided.intro',
        closingId: 'teach.activity.orbital-speed.guided.closing',
        context: 'individual',
        /**
         * Shape the orbit, predict, watch, see the areas, measure the two
         * extremes with the event tool, explain.
         *
         * `fast-and-slow-in-numbers` carries its own `pauseAt` configuration
         * and its own fields, so the measurement is attached rather than
         * transcribed, and the ratio is computed from what was captured.
         */
        steps: Object.freeze([
          'change-the-shape',
          'where-does-it-move-fastest',
          'watch-it-happen',
          'equal-areas-however-you-slice',
          'fast-and-slow-in-numbers',
          'why-the-speed-changes',
        ]),
        lecture: false,
      }),

      Object.freeze({
        id: 'lab',
        assignmentId: 'act-orbital-speed-lab',
        nameId: 'teach.activity.format.lab',
        forId: 'teach.activity.orbital-speed.lab.for',
        minutes: 50,
        introId: 'teach.activity.orbital-speed.lab.intro',
        closingId: 'teach.activity.orbital-speed.lab.closing',
        context: 'lab',
        /**
         * The whole first-and-second-law arc, plus the transfer step at the
         * end of the lesson that asks where this reasoning stops working.
         *
         * `measure-the-two-orbits` is the controlled comparison: the circular
         * and the eccentric orbiter go round the same star at the same
         * semi-major axis, so eccentricity is the one thing that differs.
         * `where-kepler-s-version-breaks` is the transfer - a comparable-mass
         * pair, where "the planet orbits the star" stops being the right
         * description - and it brings its own setup with it, which the
         * resolver adds and reports rather than leaving the step stranded.
         */
        steps: Object.freeze([
          'where-is-the-star',
          'change-the-shape',
          'what-sits-at-the-other',
          'measure-the-two-orbits',
          'where-does-it-move-fastest',
          'watch-it-happen',
          'equal-areas-however-you-slice',
          'fast-and-slow-in-numbers',
          'why-the-speed-changes',
          'where-kepler-s-version-breaks',
        ]),
        lecture: false,
      }),
    ]),
  }),
]);

/** An activity by id, or undefined. */
export const activityById = id => ACTIVITIES.find(a => a.id === id);

/** A format by id within an activity, or undefined. */
export const formatById = (activity, id) =>
  activity?.formats?.find(f => f.id === id);

/** Every (activity, format) pair, flattened. */
export const allFormats = () =>
  ACTIVITIES.flatMap(activity =>
    activity.formats.map(format => ({ activity, format }))
  );
