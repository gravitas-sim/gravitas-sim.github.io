// =============================================================================
// Where Can It Get To?
// -----------------------------------------------------------------------------
// The circular restricted three-body problem in nineteen screens, built around
// one question a student can answer by looking: given how fast this thing is
// going, where is it forbidden to be?
//
// The lesson is arranged so that the three claims that look alike are met one
// at a time and never together. Screens 1-9 are entirely about energy: the
// forbidden region, the Jacobi constant, the necks opening. Screens 10-13 put
// a tracer in an open neck and let it not go through, which is the only honest
// way to teach that accessible is not reachable. Screens 14-16 are stability,
// introduced last and explicitly as a third thing.
//
// Why screens 12 and 13 are a controlled pair
// -----------------------------------------------------------------------------
// Screen 10 has the reader push the tracer around until the neck opens, which
// is the right way to meet the idea and a bad way to establish it: everyone
// ends up somewhere different, so what they see is an anecdote and no two
// anecdotes are comparable. Screens 12 and 13 are the same claim as an
// experiment. One tracer, one place, one speed, two directions - which fixes
// the Jacobi constant and therefore the whole accessible region, and leaves
// the trajectory as the only thing that can differ. At 30 degrees it crosses
// the neck a tenth of a period in; at 130 it never comes within 0.17 of L1 in
// two full periods. Both are allowed everywhere the other is.
//
// The activity is scoped to accessibility against trajectory and says nothing
// about stability, which is screens 14-16 and a different kind of evidence.
//
// The sign convention is the other pedagogical hazard. C rises as the tracer
// slows, so every graph in a student's head is upside down, and the lesson
// says so three times: at the definition, at the first measurement, and again
// when the necks open. Numbers here were measured through the engine.
// =============================================================================

/** Two stars on a circular orbit and a tracer nobody notices. */
const LAB = {
  scenario: 'Lagrange Point Lab',
  seed: 'lagrange',
  paused: false,
};

/**
 * The restricted three-body cast, bound by exact name.
 *
 * The lesson is about where a third body can sit relative to two others, and
 * the two others have to be identifiable for that to mean anything. The tracer
 * is the one the reader moves.
 */
const RESTRICTED = {
  primary: { name: 'Primary' },
  secondary: { name: 'Secondary' },
  tracer: { name: 'Tracer' },
};

/**
 * Where the tracer is, and whether it is inside the neck.
 *
 * The lesson's claim is that an accessible region is not the same as a
 * realized path. That is a statement about a boundary, and a reader could only
 * see the boundary in a panel. This reports the tracer's distance from each
 * star live, so "it is in the neck" and "it never crossed" become things
 * observed on the scene rather than read off a plot.
 */
const neckRows = ctx => {
  const tracer = ctx.role('tracer');
  const primary = ctx.role('primary');
  const secondary = ctx.role('secondary');
  if (!tracer || !primary || !secondary) {
    return [{ label: 'The tracer', value: 'not on the canvas' }];
  }
  const d = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
  const sep = d(primary, secondary);
  const toP = d(tracer, primary);
  const toS = d(tracer, secondary);
  return [
    {
      label: 'Tracer to the primary',
      value: `${(toP / sep).toFixed(3)} separations`,
    },
    {
      label: 'Tracer to the secondary',
      value: `${(toS / sep).toFixed(3)} separations`,
    },
    {
      label: 'Which side of the pair it is on',
      value: toP < toS ? 'the primary’s' : 'the secondary’s',
      emphasis: true,
    },
    {
      label: 'What crossing would look like',
      value: 'that answer changing while you watch',
    },
  ];
};

const LAGRANGE_POINTS = {
  id: 'lagrange-points',
  thumbnail: 'images/scenarios/lagrange-point-lab.webp',
  title: 'Where Can It Get To?',
  subtitle: 'Forbidden regions, five balance points, and one conserved number',
  // Two screens longer than it was, and one of them runs for about a minute
  // while nobody types.
  duration: '25-30 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalogue rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['orbits', 'gravity', 'spaceflight'],
  lock: { placement: true },
  summary:
    'Two stars on a circular orbit and a speck of dust that feels them both. There is one number you can compute about the speck that tells you where it is forbidden to be — and as you make it go faster, walls open one at a time in a fixed order. Find the five places where the speck could sit still, work out which of them it can reach, and then find out why "can reach" is three different questions wearing the same coat.',
  objectives: [
    'State the normalisation and sign convention of the Jacobi constant',
    'Predict how the forbidden region changes as the tracer speeds up',
    'Locate the five Lagrange points and say which are stable',
    'Distinguish energetically accessible from actually reachable from stable',
    'Identify the critical values at which the L1 and L2 necks open',
    'Say which assumptions the whole picture depends on, and what breaks first',
  ],
  steps: [
    // --- Part 1: the setup ----------------------------------------------------
    {
      sid: 'two-stars-and-a-speck',
      bind: RESTRICTED,
      type: 'read',
      title: 'Two stars and a speck',
      setup: LAB,
      body: `Two stars orbit each other on a circle: one like the Sun, one about
             a thirtieth of its mass, eight astronomical units apart. The small
             red dot is a tracer — a grain of dust, a spacecraft, an asteroid.
             It is light enough that neither star notices it at all.
             \n\nThat arrangement has a name: the <strong>circular restricted
             three-body problem</strong>. Restricted because the third body does
             not pull back; circular because the other two are on a circle. It
             is the simplest system in which the two-body answers stop working,
             and almost everything interesting about it was worked out by
             Euler, Lagrange and Jacobi before 1840.`,
      tip: 'The Restricted Three-Body panel opened with the scenario. Everything this lesson asks you to read is in it.',
    },
    {
      sid: 'the-rotating-frame',
      bind: RESTRICTED,
      type: 'read',
      title: 'Ride along with them',
      body: `Watching from outside, the two stars go round and nothing stands
             still. So we stop the picture: work in a frame that
             <strong>turns with the pair</strong>, in which both stars are
             fixed and the tracer moves against a stationary background.
             \n\nEverything from here on is measured in that frame, in units
             where the two stars are one apart, their total mass is one, and
             the time unit makes the orbit take 2π. The heavier star sits at
             <strong>−μ</strong> and the lighter at <strong>1−μ</strong>, where
             μ is the small star's share of the mass. In this system μ = 0.0291.
             \n\nThose choices are not decoration. Every number in the panel is
             in these units, and a value from a textbook will only match if it
             was written in the same ones.`,
    },
    {
      sid: 'predict-forbidden',
      bind: RESTRICTED,
      type: 'predict',
      title: 'Is anywhere off limits?',
      body: `The tracer has some energy. Some places would need more energy than
             it has to reach — not because something is in the way, but because
             it would arrive going at an imaginary speed, which is another way
             of saying it cannot arrive.
             \n\nCommit before looking at the shading.`,
      prompt: 'If the tracer speeds up, the region forbidden to it will…',
      options: [
        'grow, because it has further to travel',
        'shrink, because more energy means more places it can reach',
        'stay the same, because the forbidden region is a property of the stars',
        'shrink near the stars but grow far away',
      ],
      answer: 1,
      because:
        'More kinetic energy means more of the potential landscape is affordable, so the forbidden region shrinks. The catch is bookkeeping rather than physics: the number this is conventionally measured with, the Jacobi constant, gets SMALLER as the tracer gets faster. So the forbidden region shrinks as the constant falls, which feels backwards until you have said it out loud a few times.',
    },
    {
      sid: 'the-jacobi-constant',
      bind: RESTRICTED,
      type: 'read',
      title: 'One number that does not change',
      body: `In the rotating frame there is a quantity that stays fixed along
             any trajectory, however complicated:
             \n\n<strong>C = 2Ω − v²</strong>
             \n\nΩ is the effective potential — gravity from both stars plus the
             centrifugal term from the rotation — and v is the tracer's speed in
             the rotating frame. C is the <strong>Jacobi constant</strong>, and
             it is not the energy: it is a combination that happens to be
             conserved when the ordinary energy is not.
             \n\nRead the sign carefully. <strong>Faster tracer, smaller
             C.</strong> Everywhere else in this application a bigger number
             means more energy; here it is the other way round, and it is the
             single most common thing to get backwards.`,
      tip: 'The panel prints the convention under the readout, including the fact that some textbooks add a constant that shifts every C by μ(1−μ)/2.',
    },
    {
      sid: 'read-the-constant',
      bind: RESTRICTED,
      type: 'measure',
      title: 'Read it',
      body: `Read the Jacobi constant from the panel, then use the speed control
             to let the simulation run for a while and read it again.`,
      fields: [
        { id: 'c_start', label: 'C at the start' },
        { id: 'c_later', label: 'C after running a while' },
      ],
      tip: 'They should agree to four or five figures. Any difference is the integrator, not the physics.',
    },
    {
      sid: 'why-conserved-matters',
      bind: RESTRICTED,
      type: 'question',
      kind: 'choice',
      title: 'Why one number is worth so much',
      body: `The tracer's path in this system has no closed-form solution — the
             three-body problem famously does not. But C does not change.`,
      prompt: 'Knowing C without knowing the trajectory lets you…',
      options: [
        'predict exactly where the tracer will be at any future time',
        'rule out regions the tracer can never enter, without solving anything',
        'calculate how long the tracer will take to reach a given point',
        'determine whether the tracer’s orbit is stable',
      ],
      answer: 1,
      because:
        'This is what makes the Jacobi constant worth having. You cannot solve the motion, but you can draw a wall: any point where 2Ω is less than C would require v² to be negative, so the tracer can never be there. A conserved quantity buys you a boundary even when it buys you no solution.',
    },

    // --- Part 2: the five points ----------------------------------------------
    {
      sid: 'five-places',
      bind: RESTRICTED,
      type: 'read',
      title: 'Five places to stand still',
      body: `In the rotating frame there are exactly five points where a tracer
             placed at rest would stay at rest: gravity from both stars and the
             centrifugal effect cancel exactly. They are marked on screen.
             \n\n<strong>L1</strong> sits between the stars,
             <strong>L2</strong> just beyond the small one, <strong>L3</strong>
             on the far side of the big one. Those three are on the line joining
             the stars and were found by Euler. <strong>L4</strong> and
             <strong>L5</strong> sit at the corners of equilateral triangles
             with the two stars — Lagrange's discovery, and the surprising one,
             because there is no obvious reason for a balance point to be
             sixty degrees off to the side.`,
      tip: 'Jupiter has about 12,000 known asteroids sitting near its L4 and L5 with the Sun. They are called the Trojans.',
    },
    {
      sid: 'l4-distance',
      bind: RESTRICTED,
      type: 'question',
      kind: 'numeric',
      title: 'How far is L4 from each star?',
      body: `L4 forms an equilateral triangle with the two stars. The stars are
             one unit apart in these coordinates.`,
      prompt: 'The distance from L4 to either star, in units of the separation',
      answer: 1,
      tolerance: 0.02,
      hints: [
        'Equilateral means all three sides are the same length.',
        'The side joining the two stars has length 1.',
      ],
      worked:
        'All three sides of an equilateral triangle are equal, and the side between the stars is 1 by definition of the units — so L4 is 1 from each. It is not on the line between them, and it is not at the midpoint.',
    },
    {
      sid: 'critical-order',
      bind: RESTRICTED,
      type: 'read',
      title: 'The walls open in a fixed order',
      body: `Each of the five points has its own Jacobi constant — the value a
             tracer sitting there would have. Read them off the panel:
             \n\n<strong>C₁ = 3.313, C₂ = 3.274, C₃ = 3.029, C₄ = C₅ =
             2.971</strong>
             \n\nThey are in descending order, and that ordering is the plot of
             the whole subject. Start with a very slow tracer — large C — and
             it is walled into whichever region it started in. Speed it up and
             C falls, and as it passes each of those values a wall opens: first
             the neck at L1 between the two stars, then L2 to the outside
             world, then L3, and finally nothing is forbidden anywhere.`,
    },
    {
      sid: 'open-the-neck',
      bind: RESTRICTED,
      allowInspector: true,
      probe: neckRows,
      type: 'explore',
      title: 'Open the neck',
      body: `The tracer starts nearly at rest in the rotating frame, so its C is
             high and it is sealed into the big star's region — the panel says
             so.
             \n\nSelect the tracer and use the manoeuvre planner (the ▲ button
             in the inspector) to give it a transverse push. Watch C fall in the
             three-body panel and watch the shaded region retreat. Keep going
             until the panel reports that the L1 neck is open.`,
      checklist: [
        'Note the Jacobi constant before any burn',
        'Apply a burn and watch C fall and the shading shrink',
        'Keep going until the panel says the L1 neck is open',
        'Note that the neck opened at a particular C, and that you got there your own way',
      ],
      tip: 'The panel tells you how much further C has to fall before the next gate opens. Everybody in the room will have opened the neck from a slightly different push, which is exactly why the next screen but one runs a controlled version.',
    },
    {
      sid: 'accessible-not-reachable',
      bind: RESTRICTED,
      type: 'predict',
      title: 'The neck is open. Now what?',
      body: `The wall between the two stars has gone. The tracer is
             energetically permitted to be anywhere in the other star's region.
             \n\nOn the next screen you will send the same tracer out from the
             same place at the same speed, twice, in two different directions.
             Both will have exactly the same Jacobi constant, so both will be
             allowed in exactly the same places.`,
      prompt: 'With the L1 neck open, the tracer will…',
      options: [
        'cross to the other star’s region, since nothing forbids it',
        'cross eventually, though it may take many orbits',
        'not necessarily ever cross — an open neck says only that it is not forbidden',
        'settle at L1, since that is the balance point',
      ],
      answer: 2,
      because:
        'This is the distinction the whole diagram exists to be misread about. An open neck is a gap in a wall, not a route through it. The zero-velocity curve says where the tracer cannot be; it says nothing at all about where it goes. A tracer can orbit for ever on one side of an opening it never happens to use, and the only way to find out is to integrate the trajectory and look.',
    },
    {
      sid: 'predict-same-region-same-path',
      bind: RESTRICTED,
      type: 'predict',
      title: 'Same permission, same route?',
      setup: LAB,
      body: `Two tracers, from the same point, at the same speed in the rotating
             frame, sent out in two different directions. Their Jacobi constants
             are identical — C depends on where you are and how fast you are
             going, and neither of those differs — so the shaded forbidden
             region is the same picture for both, with the same open neck in it.`,
      prompt: 'Two starts with the same accessible region will…',
      options: [
        'follow the same path, since the same region is available to both',
        'follow different paths, but both use the neck sooner or later',
        'follow different paths, and there is no guarantee either uses the neck at all',
        'follow different paths only if their speeds differ',
      ],
      answer: 2,
      because: `Different paths, with no guarantee about the neck. The forbidden
                region is a statement about where the tracer <em>cannot</em> be,
                and two states with the same C have the same one — but the
                trajectory is decided by the direction of travel, which the
                diagram does not contain. Commit to that before you run it: the
                next screen is the two runs, and one of them behaves very
                differently from the other.`,
      tip: 'Whatever you predicted is kept, right or wrong. What the next screen asks you to do is read what actually happened and say whether it supports your answer.',
    },
    {
      sid: 'watch-it-not-cross',
      bind: RESTRICTED,
      allowInspector: true,
      probe: neckRows,
      type: 'explore',
      title: 'Watch one cross and one not',
      setup: LAB,
      // Reads the prediction's own claim back against evidence.
      requires: ['predict-same-region-same-path'],
      body: `In the three-body panel, open <strong>Two directions, one
             accessible region</strong> and press <strong>Run both
             directions</strong>. It takes about a minute.

             \n\nIt puts the tracer back to a stated start — 0.6 separations
             out, at rest in the rotating frame — and then gives it the same
             speed twice, at <strong>30°</strong> and at <strong>130°</strong>.
             Everything else is held: the stars, their masses, their circular
             orbit, the integrator, the step, and two binary periods of watching
             each.

             \n\nRead the table from the top. The first five rows are the
             control: same place, same speed, same Jacobi constant to the last
             digit, same open neck, same measured step. The rows after them are
             what happened, and they do not match.`,
      checklist: [
        'Check the Jacobi constant row: the two numbers should be identical',
        'Check the L1 neck row: open for both',
        'Read whether each direction crossed, and when',
        'Read how close the one that did not got to L1',
        'Say whether that supports what you predicted on the last screen',
      ],
      rubric: `Both arms should report the same Jacobi constant — 3.28426, to
               every digit shown — and an open L1 neck with L2 still closed.
               Direction A crosses the neck about a tenth of a period in and
               comes back; direction B never gets closer to L1 than 0.17 of the
               separation in two full periods, and its x never goes past where
               it started. Full credit for reading the control rows first and
               only then the outcome, and for stating the conclusion in the
               form the evidence supports: same accessible region, different
               paths. A student who writes "B can never cross" has overreached
               by exactly the distance this activity is about — the window is
               two periods, and the caveat under the table says so.`,
      tip: 'Everything is drawn and quoted in the rotating frame, the same one the shaded region is drawn in, so the paths and the walls are in the same coordinates.',
    },

    // --- Part 3: stability, the third question --------------------------------
    {
      sid: 'stability-is-different',
      bind: RESTRICTED,
      type: 'read',
      title: 'A third question',
      body: `So far there have been two questions that sound alike:
             <em>is it allowed there?</em> and <em>will it go there?</em> Here
             is a third: <em>if it were there, would it stay?</em>
             \n\nThat is <strong>stability</strong>, and nothing in a
             zero-velocity curve implies anything about it. All five Lagrange
             points are equilibria — a tracer at rest at any of them stays. The
             question is what happens when it is nudged.`,
    },
    {
      sid: 'predict-stability',
      bind: RESTRICTED,
      type: 'predict',
      title: 'Which ones survive a nudge?',
      body: `L1, L2 and L3 sit on the line between the stars, at what are
             effectively saddle points of the effective potential. L4 and L5 sit
             at what are, oddly, maxima of it.`,
      prompt: 'Nudged slightly, a tracer at these points would stay put at…',
      options: [
        'all five, since they are all equilibria',
        'the three collinear points, because they are between the masses',
        'L4 and L5 only, and only when the mass ratio is small enough',
        'none of them — every equilibrium here is unstable',
      ],
      answer: 2,
      because:
        'The three collinear points are saddles: nudge a tracer and it leaves, at any mass ratio. L4 and L5 are the counter-intuitive case. They sit at maxima of the effective potential, which sounds like the worst place to balance, and the Coriolis force in the rotating frame turns a departing tracer back into a small orbit around the point. That works only when the mass ratio is below Routh’s value of 0.03852 — which this system, at 0.0291, just satisfies.',
    },
    {
      sid: 'trojans',
      bind: RESTRICTED,
      type: 'read',
      title: 'Which is why the Trojans exist',
      body: `Sun to Jupiter is a mass ratio of 0.000955, well under Routh's
             value, so Jupiter's L4 and L5 are stable and have been collecting
             asteroids for four billion years. The same is true of Neptune,
             Mars, and Earth — which has at least two.
             \n\nMeanwhile nothing accumulates at L1 or L2. Spacecraft are put
             there anyway, because a saddle point is cheap to hover near even
             though nothing stays by itself: JWST at Sun–Earth L2 spends a few
             metres per second a year on station-keeping. Left alone it would
             drift away in months.`,
      tip: 'This system has μ = 0.0291, close to Routh’s 0.0385. Push the small star’s mass past about a thirtieth of the large one and L4 and L5 stop being stable — the panel says which side of the line you are on.',
    },

    // --- Part 4: what it all rests on -----------------------------------------
    {
      sid: 'break-it',
      bind: RESTRICTED,
      allowInspector: true,
      probe: neckRows,
      type: 'explore',
      title: 'Break it on purpose',
      body: `Everything you have read depends on assumptions the panel checks
             every time the world is rebuilt: exactly two massive bodies, on a
             circular orbit, with a third body light enough to ignore.
             \n\nAdd a third star from the object menu, or make the tracer
             heavy. The overlay switches itself off and tells you which
             assumption failed.`,
      checklist: [
        'Add a third massive body and read what the panel says',
        'Remove it and watch the overlay come back',
      ],
      tip: 'This is not a limitation being apologised for. A diagram of a system that is not on screen would be worse than no diagram.',
    },
    {
      sid: 'which-assumption',
      bind: RESTRICTED,
      type: 'question',
      kind: 'choice',
      title: 'Which one breaks first?',
      body: `Suppose you gave the two stars a slightly eccentric orbit instead
             of a circular one.`,
      prompt: 'The Jacobi constant would then…',
      options: [
        'stay conserved, since it does not depend on the orbit shape',
        'stop being conserved, because the frame no longer rotates uniformly',
        'be conserved but the Lagrange points would move',
        'become negative',
      ],
      answer: 1,
      because:
        'The whole construction rests on the frame rotating at a constant rate, which needs the two bodies to be at a constant separation. Make the orbit eccentric and the frame speeds up and slows down, the effective potential breathes, and C is no longer conserved. There are elliptic versions of this problem and they are considerably harder — which is why the panel refuses rather than approximating.',
    },
    {
      sid: 'three-claims',
      bind: RESTRICTED,
      type: 'read',
      title: 'Three claims, kept apart',
      body: `The thing worth carrying away is that these are three different
             statements and the diagram only makes the first:
             \n\n<strong>Energetically accessible.</strong> The Jacobi constant
             does not forbid the tracer from being there. That is what the
             shading means, and all it means.
             \n\n<strong>Will actually travel there.</strong> A question about
             the trajectory. Only integrating answers it. An open neck is a gap
             in a wall.
             \n\n<strong>Stable.</strong> A question about what happens after a
             nudge. True here of L4 and L5, below Routh's ratio, and of nothing
             else — and no zero-velocity curve implies it.
             \n\nMissions get planned on all three. A transfer through the L1
             neck of the Earth–Moon system needs the first to be possible, the
             second to be designed, and the third to be paid for in
             station-keeping fuel for as long as the spacecraft is meant to
             last.`,
    },
  ],
};

export default LAGRANGE_POINTS;
