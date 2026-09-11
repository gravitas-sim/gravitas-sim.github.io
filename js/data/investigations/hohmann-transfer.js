// =============================================================================
// Getting There From Here
// -----------------------------------------------------------------------------
// A Hohmann transfer, planned by hand and then flown, in eighteen screens.
//
// The lesson exists because the answer is counter-intuitive twice over. To go
// somewhere further out you speed up, and the speeding up happens where you
// are rather than where you are going. And having arrived, you have to speed
// up again or you fall straight back - which is the half everybody forgets,
// and the half that decides whether a spacecraft stays where it was sent.
//
// It is set in the Orbital Transfer Lab because a Hohmann transfer only has an
// exact answer between circular coplanar orbits about a single dominant mass.
// That scenario is one star, one spacecraft, one station, and nothing else, so
// the number a student works out with a pencil is the number the engine
// produces - to a part in a thousand, checked in e2e/maneuver.spec.js. Run the
// same lesson in the Solar System and the arithmetic would still be right and
// the measurement would not match it, which teaches the wrong thing at the
// point where a student is least able to tell which half is wrong.
//
// Numbers in this file were measured through the engine, not derived and
// hoped for. The inner orbit is 1 AU at 29.787 km/s - Earth's actual orbital
// speed, which is not a coincidence but is a nice check on the unit scale.
// =============================================================================

/** One star, one spacecraft on a circular orbit, one station further out. */
const LAB = {
  scenario: 'Orbital Transfer Lab',
  seed: 'transfer',
  paused: false,
};

/**
 * The three bodies a transfer is flown between, bound by exact name.
 *
 * A burn is planned on the spacecraft and judged by whether it arrives at the
 * station. Both are named here, so selecting the thing a burn will be applied
 * to is a chip rather than a hunt for the right dot.
 */
const TRANSFER = {
  sun: { name: 'Sol' },
  spacecraft: { name: 'Spacecraft' },
  station: { name: 'Target Station' },
};

/**
 * Where the spacecraft is and how fast, against where it is trying to get to.
 *
 * A burn is judged by an arrival, and until now the two numbers that decide
 * that - the height the arc reaches and the speed there - had to be read off
 * the inspector while the thing was moving. This reports them beside the
 * station's own orbit, so "did the burn work" is a comparison a reader can
 * make rather than a claim the lesson makes for them.
 */
const transferRows = ctx => {
  const craft = ctx.role('spacecraft');
  const station = ctx.role('station');
  if (!craft) return [{ label: 'Spacecraft', value: 'not on the canvas' }];
  const el = ctx.elements(craft);
  const target = station ? ctx.elements(station) : null;
  const rows = [
    {
      label: 'Spacecraft, distance from the star',
      value: ctx.distance(el?.r ?? NaN),
    },
    { label: 'Its speed now', value: ctx.speed(el?.v ?? NaN) },
  ];
  if (el?.bound) {
    rows.push(
      { label: 'Top of its current arc', value: ctx.distance(el.apoapsis) },
      { label: 'Bottom of it', value: ctx.distance(el.periapsis) }
    );
  }
  if (target) {
    rows.push({
      label: 'The station orbits at',
      value: ctx.distance(target.r),
      emphasis: true,
    });
  }
  return rows;
};

const HOHMANN_TRANSFER = {
  id: 'hohmann-transfer',
  thumbnail: 'images/scenarios/orbital-transfer-lab.webp',
  title: 'Getting There From Here',
  subtitle: 'Two burns, a long coast, and the arithmetic that decides both',
  duration: '20-25 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalogue rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['spaceflight', 'orbits'],
  lock: { placement: true },
  summary:
    'A spacecraft at 1 AU, a station at 2.5 AU, and no fuel to waste. Work out both burns and the coast between them with a pencil, then fly the manoeuvre and see whether the engine agrees with you. It does — to a part in a thousand — which is what makes the two surprises in it worth trusting: you speed up to go further out, and you have to speed up again on arrival or you fall straight back.',
  objectives: [
    'Predict which way a burn moves an orbit, and where the change appears',
    'Distinguish a radial burn from a transverse one by what each conserves',
    'Compute both burns of a Hohmann transfer from the vis-viva equation',
    'Compute the transfer time as half the period of the transfer ellipse',
    'Explain why the second burn is necessary and what happens without it',
    'State the conditions under which the closed-form answer is the right one',
  ],
  steps: [
    // --- Part 1: what a burn does ---------------------------------------------
    {
      sid: 'the-problem',
      bind: TRANSFER,
      type: 'read',
      title: 'A spacecraft, a station, and no fuel to waste',
      setup: LAB,
      body: `A spacecraft is on a circular orbit one astronomical unit from a
             sunlike star, going round once a year at just under thirty
             kilometres a second. A station sits on another circular orbit two
             and a half times further out, in the same plane, going round every
             four years.
             \n\nYou have to get from one to the other, and the fuel you have is
             the fuel you brought. The question is not <em>can</em> you — it is
             what is the cheapest way, and how long does it take.
             \n\nNothing else is in this system. No other planets, no belt, no
             moon. That is deliberate, and by the end of the lesson you will
             know exactly which of your answers depended on it.`,
      tip: 'Select the Spacecraft and look at the inspector: the ▲ button beside the pin opens the manoeuvre planner.',
    },
    {
      sid: 'predict-point-at-it',
      bind: TRANSFER,
      type: 'predict',
      title: 'Point at it and push?',
      body: `The station is directly outward from the star, further out than you
             are. The obvious thing is to point away from the star and push.
             \n\nCommit to an answer before trying it.`,
      prompt: 'Pushing straight outward, away from the star, would…',
      options: [
        'move the spacecraft steadily outward until it reaches the station',
        'raise the far side of the orbit and leave the near side where it is',
        'make the orbit lopsided without making it bigger by much',
        'do nothing, because thrust away from the star cannot change an orbit',
      ],
      answer: 2,
      because:
        'It makes the orbit lopsided without making it much bigger. A radial push exerts no torque about the star, so the angular momentum is unchanged — but it does add energy, and where an orbit turns around depends on both. At fixed angular momentum, adding energy raises the far side and lowers the near side by almost as much: you get eccentricity rather than size. A transverse push of the same size raises the far side far more, because it adds energy along the direction you are already moving, which is where a given Δv buys the most of it, and it raises the angular momentum at the same time. Beware the shortcut that angular momentum alone decides how far out an orbit reaches — a radial burn does raise the apoapsis, just inefficiently, and it leaves the angular momentum exactly where it was.',
    },
    {
      sid: 'try-radial',
      bind: TRANSFER,
      type: 'explore',
      title: 'Try it',
      body: `Open the manoeuvre planner on the <strong>Spacecraft</strong> and
             put a radial Δv of <strong>0.5</strong> into the box. Do not apply
             it yet — read the preview.
             \n\nThe periapsis falls, the apoapsis rises, and the specific
             angular momentum does not move at all. That last row is the whole
             answer to the last screen.`,
      checklist: [
        'Enter a radial Δv of 0.5 and read the preview table',
        'Check that the specific angular momentum is unchanged',
        'Set it back to 0 without applying',
      ],
      tip: 'The planner previews without changing anything. Nothing happens to the world until you press Apply.',
    },
    {
      sid: 'transverse-is-the-lever',
      bind: TRANSFER,
      type: 'read',
      title: 'The lever is sideways',
      body: `A <strong>transverse</strong> burn — along the direction of travel,
             perpendicular to the line from the star — is the one that changes
             the size of the orbit. Both kinds of burn add energy, and the size
             of an orbit is set by its energy alone; what makes the transverse
             one the lever is that it spends the Δv along the direction you are
             already moving, which is where it buys the most energy, and that it
             raises the angular momentum at the same time so the extra energy
             goes into a rounder, larger orbit rather than into eccentricity.
             \n\nAnd it changes the orbit <em>on the far side</em>. The point
             where you burn stays on the new orbit: you are still there, still
             at that distance, so that distance is still a point the orbit
             passes through. Everything you gain shows up half an orbit later.
             \n\nThat is the first thing about orbital manoeuvring that has to
             be learned rather than guessed: <strong>you push here and the
             orbit changes over there</strong>.`,
    },
    {
      sid: 'measure-the-orbits',
      bind: TRANSFER,
      type: 'measure',
      title: 'Measure what you are starting with',
      body: `Select the <strong>Spacecraft</strong>, then the
             <strong>Target Station</strong>, and read their orbital speeds
             from the inspector.`,
      fields: [
        { id: 'v1', label: 'Spacecraft speed', unit: 'km/s' },
        { id: 'v2', label: 'Station speed', unit: 'km/s' },
      ],
      tip: 'The inspector reports speed in km/s when the unit toggle is set to physical units.',
    },
    {
      sid: 'why-slower-further-out',
      bind: TRANSFER,
      type: 'question',
      kind: 'choice',
      title: 'The station is slower',
      body: `The spacecraft, closer in, is moving at about 29.8 km/s. The
             station, two and a half times further out, is moving at about
             18.8 km/s.`,
      prompt: 'The body further from the star moves more slowly because…',
      options: [
        'it has further to travel, so it takes longer',
        'gravity is weaker there, so a slower speed is enough to stay in orbit',
        'it started more slowly and nothing has changed it',
        'it is losing energy to the star',
      ],
      answer: 1,
      because:
        'Circular orbital speed is sqrt(GM/r): it falls as the radius grows. Weaker gravity needs less centripetal acceleration to balance it, and less acceleration at a larger radius means a slower speed. The further orbit is slower *and* longer, which is why its period grows faster than its radius.',
    },

    // --- Part 2: the first burn ------------------------------------------------
    {
      sid: 'the-transfer-ellipse',
      bind: TRANSFER,
      type: 'read',
      title: 'The cheapest path is an ellipse that touches both',
      body: `Here is the idea, and it is due to Walter Hohmann, who published it
             in 1925 — a decade before anybody had a rocket that could leave the
             ground.
             \n\nBurn once, here, to put yourself on an <strong>ellipse</strong>
             whose closest point is your current orbit and whose furthest point
             just touches the station's orbit. Coast to the far end. Burn again
             to circularise.
             \n\nTwo burns, one coast. For orbits that are not too far apart it
             is the cheapest transfer there is, and the reason is that every
             other route spends fuel changing something that did not need
             changing.`,
    },
    {
      sid: 'transfer-semi-major',
      bind: TRANSFER,
      type: 'question',
      kind: 'numeric',
      title: 'How big is that ellipse?',
      body: `The semi-major axis of an ellipse is half the longest distance
             across it. This ellipse reaches from 1 AU on one side of the star
             to 2.5 AU on the other.`,
      prompt: 'The semi-major axis of the transfer ellipse, in AU',
      answer: 1.75,
      unit: 'AU',
      tolerance: 0.02,
      expect: {
        dimension: 'length',
        unit: 'AU',
        accept: ['au', 'km'],
      },
      hints: [
        'The longest distance across the ellipse runs from one orbit, through the star, to the other.',
        'That distance is 1 AU + 2.5 AU. The semi-major axis is half of it.',
      ],
      worked:
        'The major axis spans r₁ + r₂ = 1 + 2.5 = 3.5 AU, so a = 3.5 / 2 = 1.75 AU.',
    },
    {
      sid: 'vis-viva-departure',
      bind: TRANSFER,
      type: 'question',
      kind: 'numeric',
      title: 'How fast do you have to be going?',
      body: `The vis-viva equation gives the speed anywhere on any orbit:
             \n\n<strong>v² = GM (2/r − 1/a)</strong>
             \n\nOn this transfer ellipse, at the moment of departure, r is 1 AU
             and a is 1.75 AU. A circular orbit at 1 AU here runs at
             <strong>29.787 km/s</strong>, which is the same equation with
             a = r.`,
      prompt: 'Your speed at the start of the transfer ellipse, in km/s',
      answer: 35.6,
      unit: 'km/s',
      tolerance: 0.4,
      expect: {
        dimension: 'speed',
        unit: 'km/s',
        accept: ['km/s', 'm/s'],
      },
      hints: [
        'You can work in units of the circular speed: v/v_circ = sqrt(2 − r/a).',
        'With r = 1 and a = 1.75, that ratio is sqrt(2 − 0.5714) = sqrt(1.4286) = 1.1952.',
      ],
      worked:
        'v = v_circ × sqrt(2 − r/a) = 29.787 × sqrt(2 − 1/1.75) = 29.787 × 1.1952 = 35.60 km/s.',
    },
    {
      sid: 'first-burn-size',
      bind: TRANSFER,
      type: 'question',
      kind: 'numeric',
      title: 'So how big is the first burn?',
      body: `You are going 29.787 km/s and you need to be going 35.60 km/s, in
             the same direction.`,
      prompt: 'The first burn, in km/s',
      answer: 5.815,
      unit: 'km/s',
      tolerance: 0.15,
      expect: {
        dimension: 'speed',
        unit: 'km/s',
        accept: ['km/s', 'm/s'],
      },
      hints: [
        'Both speeds are in the same direction, so this is a subtraction rather than anything vectorial.',
      ],
      worked: 'Δv₁ = 35.60 − 29.787 = 5.815 km/s.',
    },
    {
      sid: 'apply-the-first-burn',
      bind: TRANSFER,
      // "Put your answer into the transverse box" - the answer worked out
      // there.
      requires: ['first-burn-size'],
      type: 'explore',
      title: 'Make it',
      body: `In the planner, set the radial Δv back to <strong>0</strong> and
             put your answer into the <strong>transverse</strong> box. In this
             scenario's units that is <strong>0.873</strong> — the planner works
             in simulation velocity units, and one of those is 6.661 km/s.
             \n\nRead the preview first. The apoapsis should read
             <strong>250</strong> simulation units, which is 2.5 AU: the
             station's orbit. Then press <strong>Apply</strong>.`,
      checklist: [
        'Set radial back to 0 and transverse to 0.873',
        'Check the previewed apoapsis is 2.5 AU before applying',
        'Press Apply, and watch the trail climb away from the inner orbit',
      ],
      tip: 'If you mistype, Undo puts the world back exactly as it was — the whole world, not just the velocity.',
    },
    {
      sid: 'where-the-change-appeared',
      bind: TRANSFER,
      // It compares the orbit before and after that burn.
      requires: ['apply-the-first-burn'],
      type: 'question',
      kind: 'choice',
      title: 'Where did the orbit change?',
      body: `Compare the periapsis and apoapsis in the planner before and after
             the burn.`,
      prompt: 'The burn changed…',
      options: [
        'both ends of the orbit by the same amount',
        'the near side only, leaving the far side where it was',
        'the far side only, leaving the near side where it was',
        'neither end — only the shape',
      ],
      answer: 2,
      because:
        'You burned at 1 AU and you are still at 1 AU, so the new orbit passes through 1 AU: that point is now its periapsis, unchanged. The energy you added went entirely into how far the orbit reaches on the opposite side, which climbed from 1 AU to 2.5 AU. Push here, change there.',
    },

    // --- Part 3: the coast ------------------------------------------------------
    {
      sid: 'transfer-time',
      bind: TRANSFER,
      type: 'question',
      kind: 'numeric',
      title: 'How long is the coast?',
      body: `You are on half of an ellipse: from its closest point to its
             furthest. Kepler's third law gives the period of a whole orbit from
             its semi-major axis, and at 1 AU about this star a full orbit takes
             exactly one year.
             \n\n<strong>T = 1 year × a^(3/2)</strong>, with a in AU.`,
      prompt: 'The coast from the first burn to the station’s orbit, in days',
      answer: 422.7,
      unit: 'days',
      tolerance: 12,
      expect: {
        dimension: 'time',
        unit: 'days',
        accept: ['days', 'years', 'hours'],
      },
      hints: [
        'Work out the period of the whole transfer ellipse first, then take half of it.',
        'a = 1.75, so a^(3/2) = 2.315. The full ellipse takes 2.315 years.',
      ],
      worked:
        'T = 1.75^1.5 = 2.315 years for the whole ellipse. Half of it is 1.157 years, or 423 days.',
    },
    {
      sid: 'watch-the-coast',
      bind: TRANSFER,
      // There is no transfer ellipse to coast along until that burn is made.
      requires: ['apply-the-first-burn'],
      type: 'explore',
      title: 'Coast',
      body: `Let it run. The spacecraft climbs away from the star, slowing the
             whole way, and about fourteen months later it reaches the top of
             the arc at 2.5 AU.
             \n\nUse the speed control if you would rather not wait in real
             time. Watch the speed readout in the inspector fall as it climbs —
             it arrives at the station's orbit doing about
             <strong>14.2 km/s</strong>.`,
      // Arrival is the top of the transfer ellipse - an apoapsis - and it
      // happens once, fourteen simulated months in. Reading a speed there by
      // watching for it means either sitting through the coast or missing it,
      // so the run is stopped at the point instead.
      pauseAt: { kind: 'apoapsis', body: 'Spacecraft', primary: 'Sol' },
      allowInspector: true,
      probe: transferRows,
      checklist: [
        'Arm the event watch below, so the run stops at the top of the arc',
        'Watch the spacecraft climb, and the speed fall as it climbs',
        'Read the speed and the distance where it stopped',
        'Check the distance against the station’s orbit at 2.5 AU',
      ],
    },
    {
      sid: 'predict-do-nothing',
      bind: TRANSFER,
      type: 'predict',
      title: 'What if you do nothing?',
      body: `The spacecraft is at the station's orbital radius, at the top of
             its arc, doing 14.2 km/s. The station at that radius is doing
             18.8 km/s.
             \n\nSuppose you burn no further.`,
      prompt: 'With no second burn, the spacecraft would…',
      options: [
        'stay at 2.5 AU, since it has arrived',
        'fall back inward and return to 1 AU',
        'drift slowly outward, since it is moving away from the star',
        'follow the station round at 14.2 km/s',
      ],
      answer: 1,
      because:
        'The transfer ellipse is a closed orbit and the spacecraft is at its apoapsis, not at rest. Its periapsis is still at 1 AU, so it falls back and returns to exactly where it started, once every 2.3 years, for ever. Arriving somewhere and staying there are different achievements.',
    },

    // --- Part 4: the second burn ------------------------------------------------
    {
      sid: 'second-burn-size',
      bind: TRANSFER,
      type: 'question',
      kind: 'numeric',
      title: 'The burn everybody forgets',
      body: `To stay at 2.5 AU you have to be on the circular orbit at 2.5 AU,
             which means going at the circular speed there:
             <strong>18.84 km/s</strong>. You arrive doing
             <strong>14.24 km/s</strong>.`,
      prompt: 'The second burn, in km/s',
      answer: 4.598,
      unit: 'km/s',
      tolerance: 0.15,
      expect: {
        dimension: 'speed',
        unit: 'km/s',
        accept: ['km/s', 'm/s'],
      },
      hints: [
        'Again both are in the same direction, so it is a subtraction.',
        'You are too slow for the orbit you want, so this is another acceleration.',
      ],
      worked: 'Δv₂ = 18.840 − 14.242 = 4.598 km/s.',
    },
    {
      sid: 'apply-the-second-burn',
      bind: TRANSFER,
      // The second burn is made at apoapsis, which is where that coast ends.
      requires: ['watch-the-coast'],
      type: 'explore',
      title: 'Circularise',
      body: `When the spacecraft is at the top of its arc — apoapsis, where the
             planner shows the distance no longer growing — apply a transverse
             Δv of <strong>0.690</strong> simulation units.
             \n\nWatch the eccentricity in the planner's preview fall to nearly
             zero. That is the manoeuvre finished: the orbit is now the
             station's orbit.`,
      checklist: [
        'Wait until the spacecraft reaches 2.5 AU',
        'Preview a transverse Δv of 0.690 and check the eccentricity goes to ~0',
        'Apply it',
      ],
      tip: 'Timing matters: the same burn made anywhere else on the ellipse gives a different orbit, because a burn changes the far side and the far side depends on where you are.',
    },
    {
      sid: 'total-cost',
      bind: TRANSFER,
      // The two burns being added up.
      requires: ['first-burn-size', 'second-burn-size'],
      type: 'question',
      kind: 'numeric',
      title: 'What did it cost?',
      body: `Add the two burns.`,
      prompt: 'The total Δv for the transfer, in km/s',
      answer: 10.41,
      unit: 'km/s',
      tolerance: 0.3,
      expect: {
        dimension: 'speed',
        unit: 'km/s',
        accept: ['km/s', 'm/s'],
      },
      worked: 'Δv = 5.815 + 4.598 = 10.41 km/s.',
    },
    {
      sid: 'both-burns-forward',
      bind: TRANSFER,
      type: 'question',
      kind: 'choice',
      title: 'Both burns were accelerations',
      body: `Both burns sped the spacecraft up, and the spacecraft ended up
             moving more slowly than it started — 18.8 km/s against 29.8.`,
      prompt: 'That is possible because…',
      options: [
        'the second burn was really a brake, despite the arithmetic',
        'speed and orbital energy are different things, and the burns added energy while the climb spent speed',
        'the star slowed it down between the burns',
        'the arithmetic is an approximation and the real answer differs',
      ],
      answer: 1,
      because:
        'Both burns added orbital energy, and a larger orbit has more energy. But most of that energy is potential: climbing from 1 AU to 2.5 AU costs a great deal of speed and buys height. The spacecraft ends up higher, richer in total energy, and slower. Going further out means going more slowly once you get there — and speeding up twice to manage it.',
    },
    {
      sid: 'when-this-is-true',
      bind: TRANSFER,
      type: 'read',
      title: 'What this answer depended on',
      body: `Every number you computed was right, to a part in a thousand,
             because of how this system was built: two <strong>circular</strong>
             orbits in the <strong>same plane</strong> about a
             <strong>single</strong> dominant mass, with nothing else in the
             system.
             \n\nTake any of those away and the closed form stops being the
             answer. Real transfers to Mars are planned against an eccentric,
             slightly inclined target, and the arithmetic here is where those
             calculations start rather than where they finish. The planner's own
             preview says the same thing about itself: it shows the two-body
             orbit, and in a system where a third mass matters the real path
             leaves the prediction.
             \n\nOne more thing this lesson quietly ignored: the station has to
             be <em>there</em> when you arrive. Getting the timing right is a
             separate problem with its own arithmetic, and it is why launches to
             Mars happen in a few weeks every twenty-six months rather than
             whenever anyone feels like it.`,
      tip: 'A Hohmann transfer stops being the cheapest option when the outer orbit is more than about 11.9 times the inner one. Past that, a three-burn bi-elliptic transfer costs less — and takes far longer.',
    },
  ],
};

export default HOHMANN_TRANSFER;
