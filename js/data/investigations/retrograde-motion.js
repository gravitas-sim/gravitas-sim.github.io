// =============================================================================
// Why Mars goes backwards
// -----------------------------------------------------------------------------
// One lesson, lifted verbatim out of the single 8,460-line module these ten
// used to share. Content only, no imports: every step that needs a live number
// is handed a `ctx` by the engine, so a lesson stays a description of what is
// being taught rather than a piece of the simulation.
//
// The registry in ./registry.js imports this file on demand, so opening one
// lesson no longer pulls in the other nine. See ../investigations.js for the
// synchronous barrel the answer-key generator, the instructor materials build
// and the tests use.
// =============================================================================

/**
 * The three bodies this lesson is about, bound by exact name.
 *
 * The frame matters here more than in any other lesson in the catalog: half
 * of it is watched from outside and half from Earth, and "click Mars" means a
 * different thing depending on which. Binding puts all three in the panel's
 * object list, so a reader who has lost track of which body they are on can
 * see it named rather than inferred from a moving dot - and can get back with
 * one keypress.
 */
const INNER_PAIR = {
  sun: { name: 'Sun' },
  earth: { name: 'Earth' },
  mars: { name: 'Mars' },
};

const RETROGRADE = {
  id: 'retrograde-motion',
  thumbnail: 'images/scenarios/retrograde-mars.webp',
  title: 'Why Mars Goes Backwards',
  subtitle: 'Change the frame, and fourteen centuries of epicycles fall away',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 3, section: '3.1' },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['orbits', 'solar-system', 'observing'],
  lock: { placement: true, inspector: false },
  retired: {
    'catch-the-reversal': {
      to: 'time-the-reversal',
      release: '3.1',
      was: {
        en: 'Read the direction to Mars and the day twice, once at the first reading and once at a reading that had gone backwards.',
        es: 'Leer la dirección a Marte y el día dos veces, una en la primera lectura y otra en una lectura que había retrocedido.',
      },
    },
    'how-long-does-a-loop': {
      to: 'time-the-reversal',
      release: '3.1',
      was: {
        en: 'Give the day the direction starts falling and the day it starts rising again, and the length of the loop between them.',
        es: 'Dar el día en que la dirección empieza a bajar y el día en que vuelve a subir, y la duración del bucle entre ambos.',
      },
    },
    'a-lap-gained': {
      to: null,
      release: '3.1',
      was: {
        en: 'Divide 360 degrees by the rate Earth gains on Mars, given as 0.46 degrees a day, to find the synodic period a second way.',
        es: 'Dividir 360 grados entre el ritmo al que la Tierra gana a Marte, dado como 0,46 grados al día, para hallar el periodo sinódico de otra manera.',
      },
    },
    'what-actually-settled-it': {
      to: 'frames-are-not-all-equal',
      release: '3.1',
      was: {
        en: 'Read why economy and stellar parallax, not the loop, settled the argument, and why Tycho found no parallax.',
        es: 'Leer por qué la economía y la paralaje estelar, y no el bucle, zanjaron la discusión, y por qué Tycho no halló paralaje.',
      },
    },
    'mars-or-jupiter': {
      to: 'jupiters-loops',
      release: '3.1',
      was: {
        en: 'Choose how often Jupiter’s loops come compared with Mars’s, given the subtraction in the text.',
        es: 'Elegir con qué frecuencia llegan los bucles de Júpiter en comparación con los de Marte, con la resta dada en el texto.',
      },
    },
  },
  objectives: [
    'Describe retrograde motion as an observation, separately from any explanation of it',
    'Compute a synodic period from two orbital periods and say what it counts',
    'Predict and then verify that a retrograde loop happens at opposition',
    'Time the two turning points of the loop by bracketing each between two readings, and give the length of the loop with its uncertainty',
    'Explain retrograde motion as a consequence of the observer’s own motion, without invoking anything the planet does',
    'Say what a reference frame is, and what changes and what does not when you switch one',
    'State what the retrograde loop does and does not establish about which body is at the center',
  ],
  steps: [
    {
      sid: 'the-wandering-stars',
      bind: INNER_PAIR,
      type: 'read',
      title: 'The wandering stars',
      body: `Almost everything in the night sky moves together. The stars turn
             overhead as one rigid pattern, night after night, and the patterns
             themselves do not change within a human lifetime.
             \n\nFive points of light do not obey. They drift slowly through the
             fixed stars along their own paths, and the Greeks called them
             <em>planētai</em>, the wanderers. Most of the time each one creeps
             steadily eastward against the stars.
             \n\nAnd then, at intervals, one of them stops. It hangs still for a
             few days, reverses, and travels westward for weeks or months. Then
             it stops again and resumes its eastward march, having traced a loop
             or a zigzag against the background. Mars does this again and
             again, at regular intervals.
             \n\nThis is not a subtle effect visible only to specialists. Anyone
             who watches Mars for a few months with the naked eye can see it, and
             every civilization that kept sky records noticed it.`,
      quote: {
        text: 'The planets appear sometimes to move forward, sometimes backward, and sometimes to stand still.',
        by: 'Claudius Ptolemy, Almagest, c. 150 CE',
      },
      tip: 'This investigation leaves the inspector switched on: you will need it to read numbers off Earth and Mars. Placing new objects is off, so a stray click cannot alter the system you are measuring.',
      setup: {
        scenario: 'Retrograde Mars',
        seed: 'retrograde-lab',
        camera: { zoom: 1.6, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      sid: 'what-you-are-looking-at',
      bind: INNER_PAIR,
      type: 'read',
      motion: true,
      title: 'What you are looking at',
      body: `Three bodies, and nothing else. The <strong>Sun</strong> at the
             center, <strong>Earth</strong> in blue on the inner orbit, and
             <strong>Mars</strong> in orange on the outer one.
             \n\nThe distances are real: Earth at 1.00 AU, Mars at 1.52. The
             masses are real, so the periods are real too, and the whole system
             is running about three million times faster than the sky does. A year of Earth's takes about ten seconds
             here.
             \n\nWatch for a moment. Both planets go round the Sun the same way,
             counterclockwise, and neither ever slows, stops or turns back. Whatever
             makes Mars appear to reverse, it is not something Mars does.`,
      tip: 'If the trails are not showing, press the reset button beside the progress bar to rebuild the system.',
    },
    {
      sid: 'against-the-fixed-stars',
      bind: INNER_PAIR,
      type: 'read',
      title: 'Against the fixed stars',
      body: `Before you measure anything, be clear about what the measurement is.
             \n\nAn ancient astronomer had no distances. Nobody knew how far away
             Mars was, and estimates were wrong by orders of magnitude until the
             seventeenth century. What could be measured, and measured well, was
             a <em>direction</em>: which way Mars lay, recorded against the
             pattern of stars behind it.
             \n\nSo retrograde motion is a statement about one number, the
             direction to the planet, changing the wrong way over weeks. The
             loop that appears in a modern diagram is that direction plotted
             against time, not a path anyone ever saw traced out.
             \n\nGravitas gives you the same number and a distance as well, which
             is more than any observer had until radar. The direction is the one
             to watch.`,
    },
    {
      sid: 'watch-from-outside-first',
      bind: INNER_PAIR,
      type: 'explore',
      title: 'Watch from outside first',
      body: `Before changing anything, spend a moment on the view you already
             have. This is the God's-eye view no observer has ever had: outside
             the system, looking down on it.
             \n\nWatch both planets go round. Click each one and read its speed.
             Nothing here reverses, hesitates or loops.`,
      checklist: [
        'Earth goes counterclockwise around the Sun, and never turns back',
        'Mars goes counterclockwise too, and never turns back',
        'Earth completes a lap in noticeably less time than Mars does',
        'Watch Earth catch up with Mars and pass it on the inside',
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          rows.push({
            label: `${name}: speed`,
            // Named rather than dashed. A dash on this row used to be the only
            // thing a reader saw when the scenario had not finished building,
            // and it looks exactly like a broken lesson.
            value: b
              ? ctx.speed(Math.hypot(b.vel.x, b.vel.y))
              : `${name} is not on the canvas yet`,
          });
        }
        rows.push({ label: 'Day', value: ctx.days().toFixed(0) });
        return rows;
      },
    },
    {
      sid: 'the-two-orbits',
      bind: INNER_PAIR,
      type: 'measure',
      title: 'The two orbits',
      body: `Click <strong>Earth</strong>, then <strong>Mars</strong>, and read the
             orbit each one is actually on: the inspector computes it from the
             body's live position and velocity.
             \n\nThe readout beside this step lists both planets. Press
             <strong>Take reading</strong> beside each box to record the value it
             shows: each planet's distance from the Sun and its orbital period,
             in days.`,
      fields: [
        {
          id: 'earth_a',
          label: 'Earth: distance from the Sun',
          unit: 'AU',
          source: { probe: 'earth_a' },
        },
        {
          id: 'mars_a',
          label: 'Mars: distance from the Sun',
          unit: 'AU',
          source: { probe: 'mars_a' },
        },
        {
          id: 'earth_P',
          label: 'Earth: orbital period',
          unit: 'days',
          source: { probe: 'earth_P' },
        },
        {
          id: 'mars_P',
          label: 'Mars: orbital period',
          unit: 'days',
          source: { probe: 'mars_P' },
        },
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          const key = name.toLowerCase();
          if (!b) {
            rows.push(
              { id: `${key}_a`, label: name, value: 'not found' },
              { id: `${key}_P`, label: name, value: 'not found' }
            );
            continue;
          }
          const el = ctx.elements(b);
          rows.push({
            id: `${key}_a`,
            label: `${name}: distance from the Sun`,
            value: el ? ctx.distance(el.a) : '-',
          });
          rows.push({
            id: `${key}_P`,
            label: `${name}: period`,
            value: el
              ? `${(ctx.years(el.period) * 365.25).toFixed(1)} days`
              : '-',
          });
        }
        return rows;
      },
    },
    {
      sid: 'which-one-is-faster',
      bind: INNER_PAIR,
      // Answered off the periods measured there.
      requires: ['the-two-orbits'],
      type: 'question',
      title: 'Which one is faster?',
      kind: 'choice',
      body: `You have two periods and two distances. Kepler's third law relates
             them, but you do not need it here: you can read the answer straight
             off the numbers you just wrote down.`,
      prompt: 'Going round the Sun, Earth…',
      options: [
        'completes an orbit in less time than Mars, so it is going round faster',
        'completes an orbit in more time than Mars, because it has further to go',
        'goes round in the same time as Mars, since both orbit the same Sun',
        'goes round faster only when it is closer to Mars',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'furtherAround',
          option: 1,
          say: 'Earth is on the shorter track, not the longer one. Compare its distance from the Sun with Mars’s, and then the two periods you took.',
        },
        {
          id: 'sameSun',
          option: 2,
          say: 'The same Sun does not give the same period: how long an orbit takes depends on how far the body is from the Sun. Compare the two periods you took.',
        },
        {
          id: 'closerToMars',
          option: 3,
          say: 'Each planet keeps its own pace round the Sun whatever the other one is doing. A period belongs to one orbit alone.',
        },
      ],
      because:
        'Earth takes 365 days and Mars 687, so Earth laps the Sun nearly twice for every one lap of Mars. That is the whole mechanism of retrograde motion, and you have already measured it. The inner planet is on a shorter track and it also moves faster along it: both effects run the same way, which is what Kepler’s third law says.',
    },
    {
      sid: 'how-fast-each-one-goes',
      bind: INNER_PAIR,
      // It says "copy across the two periods you measured a moment ago".
      requires: ['the-two-orbits'],
      type: 'measure',
      title: 'How fast each one goes round',
      body: `A period is awkward to compare directly. Turn each one into an
             angular speed instead: a full lap is 360°, so a planet covers
             360 ÷ P degrees every day.
             \n\nPress <strong>Take reading</strong> beside each period to bring
             in the value the readout shows; the three speeds work themselves
             out.`,
      fields: [
        // The periods are taken again here: the arithmetic below reads this
        // step's own fields, and a step's saved answers stay readable alone.
        {
          id: 'earth_P',
          label: 'Earth: orbital period',
          unit: 'days',
          source: { probe: 'earth_P' },
        },
        {
          id: 'mars_P',
          label: 'Mars: orbital period',
          unit: 'days',
          source: { probe: 'mars_P' },
        },
        {
          id: 'earth_w',
          label: 'Earth: degrees per day',
          unit: '°/day',
          compute: v => 360 / v.earth_P,
        },
        {
          id: 'mars_w',
          label: 'Mars: degrees per day',
          unit: '°/day',
          compute: v => 360 / v.mars_P,
        },
        {
          id: 'gain_w',
          label: 'Degrees Earth gains on Mars each day',
          unit: '°/day',
          compute: v => 360 / v.earth_P - 360 / v.mars_P,
        },
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          const el = b ? ctx.elements(b) : null;
          rows.push({
            id: `${name.toLowerCase()}_P`,
            label: `${name}: period`,
            // Two different absences, and they need different answers: no
            // body at all means the world is still building, while a body
            // with no closed orbit means there is no period to report.
            value: el
              ? `${(ctx.years(el.period) * 365.25).toFixed(1)} days`
              : b
                ? 'no closed orbit to take a period from'
                : `${name} is not on the canvas yet`,
          });
        }
        return rows;
      },
    },
    {
      sid: 'the-synodic-period',
      bind: INNER_PAIR,
      type: 'read',
      title: 'The synodic period',
      body: `Two runners on a circular track, one faster than the other, meet
             again at intervals. Not once per lap: the faster runner has to gain
             a whole lap on the slower one.
             \n\nFor planets this interval is called the <em>synodic period</em>,
             and it is the time between one alignment of Sun, Earth and Mars and
             the next. Because it counts laps gained rather than laps run, it is
             longer than either planet's own year.
             \n\nIf the faster planet goes round in <em>P</em>₁ and the slower in
             <em>P</em>₂, then in one synodic period <em>S</em> the fast one
             completes exactly one more lap than the slow one:
             \n\n<strong>1/S = 1/P₁ − 1/P₂</strong>
             \n\nThe alignment that matters here is <em>opposition</em>: Earth
             directly between the Sun and Mars, with Mars on the opposite side of
             our sky from the Sun. It is also when Mars is closest to us and
             brightest.`,
    },
    {
      hints: [
        'The formula is in the step before this one, and the two periods are the ones you took above.',
        'Subtract the two reciprocals, then take one over the result.',
      ],
      feedback: {
        close: 'Close. Subtract the reciprocals first, and only then invert.',
        off: 'The synodic period is one over the difference of the two rates, not the difference of the two periods.',
      },
      sid: 'how-often-does-earth-catch',
      bind: INNER_PAIR,
      type: 'question',
      title: 'How often does Earth catch up?',
      kind: 'numeric',
      body: `Use your two measured periods in 1/S = 1/P₁ − 1/P₂, with P₁ the
             shorter one. Work in days.`,
      prompt: 'How many days between one opposition of Mars and the next?',
      unit: 'days',
      answer: 780,
      tolerance: 60,
      because:
        'S = 780 days, about two years and seven weeks. That is why Mars is well placed for observing roughly every other year rather than every year: Earth needs 780 days to gain a full lap on it.',
    },
    {
      sid: 'share-of-the-cycle',
      bind: INNER_PAIR,
      type: 'predict',
      reveal: 'the-share-you-found',
      title: 'How much of the cycle?',
      body: `You have the interval from one opposition of Mars to the next. Over
             one such cycle the direction from Earth to Mars spends part of its
             time climbing and part of it falling.
             \n\nCommit to how much of the cycle is spent falling before you
             measure it: the measurement comes later in this investigation.`,
      prompt:
        'Out of one cycle from one opposition to the next, Mars appears to move backwards for about…',
      options: [
        'less than 5 percent of it',
        'between 5 and 15 percent of it',
        'between 15 and 35 percent of it',
        'more than 35 percent of it',
      ],
      answer: 1,
      because:
        'The backwards stretch is a small part of each cycle: the short time when Earth is passing Mars. The rest of the cycle the direction climbs. Your own length divided by your own synodic period is the share you found.',
    },
    {
      sid: 'before-you-look',
      bind: INNER_PAIR,
      type: 'predict',
      reveal: 'put-yourself-on-earth',
      title: 'Before you look',
      body: `You are about to change what the view is measured against. Right
             now every position on screen is given relative to the scenario's own
             coordinates, which happen to have the Sun sitting still at the
             middle. You are going to re-express the same simulation with
             <strong>Earth</strong> sitting still instead.
             \n\nNothing about the physics will change. No force is added, no
             orbit is altered, no body is moved. Only the question "measured
             against what?" gets a different answer.
             \n\nCommit to a prediction first.`,
      prompt: 'Seen from Earth, Mars’s path will…',
      options: [
        'still be a circle around the Sun, just drawn off-center',
        'be a loop that doubles back on itself at intervals',
        'be a straight line, since neither planet accelerates much',
        'be unchanged, because changing the frame changes only the labels',
      ],
      answer: 1,
      because:
        'The path doubles back. Mars keeps moving steadily round the Sun the entire time, but Earth is moving too, and faster; near opposition Earth overtakes Mars on the inside and the direction from Earth to Mars swings backwards. The last option is the tempting one and it is half right: a frame change alters no physics. It does, however, change the path, because a path is a set of positions and positions are always measured against something.',
    },
    {
      sid: 'reference-frames',
      bind: INNER_PAIR,
      type: 'read',
      title: 'Reference frames',
      body: `A position is never a property of a body on its own. It is a
             relationship between that body and something else, and the something
             else is the <em>reference frame</em>.
             \n\nYou change frames constantly without noticing. Walking down a
             train carriage you move at about 1 m/s in the frame of the train and
             at 55 m/s in the frame of the track. Both are correct. Neither is
             more true than the other, and no experiment on the train can tell
             you which one you are "really" doing.
             \n\nGravitas lets you pick the frame. In the <strong>Tools</strong>
             section of the right-hand panel there is a control marked
             <strong>Frame</strong>, and the object inspector carries the same
             switch under <strong>Overlays</strong>. Choosing a body puts that
             body at rest and re-expresses everything else, trails included,
             around it.
             \n\nThe trails are the part worth watching. They are not slid across
             the screen; they are redrawn as the path that frame would have seen,
             using where the origin body was at the moment each point was
             recorded.`,
      tip: 'This is not the same as Follow Mode in Settings. Follow Mode moves the camera and leaves the drawing alone. Changing the frame changes the drawing.',
    },
    {
      sid: 'what-the-trails-are-doing',
      bind: INNER_PAIR,
      type: 'read',
      title: 'What the trails are doing',
      body: `One detail matters for trusting what you are about to see.
             \n\nWhen you change the frame, the trails are not slid sideways
             across the screen. Each point in a trail was recorded at a
             particular moment, and each one is re-expressed against where the
             origin body was <em>at that moment</em>. Sliding the whole drawing
             would move it without changing its shape; this changes the shape,
             because that is what a different observer would have drawn.
             \n\nThe difference is exactly why Follow Mode, which does slide the
             camera, never showed you a retrograde loop.
             \n\nA point older than the origin body's own recorded history cannot
             be re-expressed at all, and is not drawn. So a freshly rebuilt
             system has no loop yet: the trail has to grow first.`,
      tip: 'The trail here holds about a year of history, long enough to hold a whole retrograde loop. That is deliberate: much shorter and the loop never closes.',
    },
    {
      sid: 'put-yourself-on-earth',
      bind: INNER_PAIR,
      type: 'explore',
      title: 'Put yourself on Earth',
      body: `Click <strong>Earth</strong>, then switch its
             <strong>Reference frame</strong> on in the inspector. Or use
             <strong>Tools &gt; Frame</strong> and choose the selected object.
             \n\nGive it half a minute. The trail has to redraw itself over a
             good fraction of the synodic period you calculated before the loop
             appears, and you may need to wait for Earth to come round to
             opposition.`,
      checklist: [
        'Earth is now motionless at the middle of the view',
        'The Sun is no longer at rest: it circles Earth once a year',
        'Mars’s trail is no longer a circle round the Sun',
        'Somewhere on Mars’s trail there is a cusp or a loop where it doubles back',
      ],
      probe: ctx => {
        const frame = ctx.frame ? ctx.frame() : null;
        if (!frame || frame.mode === 'world') {
          return [
            { label: 'Reference frame', value: 'World, not switched yet' },
          ];
        }
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Reference frame', value: 'Earth' }];
        return [
          { label: 'Reference frame', value: 'Earth' },
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
        ];
      },
    },
    {
      sid: 'that-is-the-observation',
      bind: INNER_PAIR,
      type: 'read',
      title: 'That is the observation',
      body: `The loop on your screen is not a model of anything. It is what the
             recorded positions say, re-expressed against a different origin, and
             it is what people actually see when they watch Mars.
             \n\nEvery point on that trail is a place Mars really was, in a
             simulation where Mars never once slowed down or turned round. The
             reversal is entirely a statement about where the observer was
             standing.
             \n\nNotice what did not change when you flipped the switch. The
             orbital periods are the same. The distances from the Sun are the
             same. Every force is the same. If you switch back to the world frame
             the loop vanishes and the circles return, and switching frames again
             brings it back. Nothing was created or destroyed; the same motion was
             described twice.`,
    },
    {
      sid: 'time-the-reversal',
      bind: INNER_PAIR,
      type: 'measure',
      time: { paused: true },
      title: 'Time the reversal',
      body: `The picture shows the loop; now time it. With Earth's frame still on,
             the readout beside this step gives the <strong>direction from Earth</strong>
             to Mars, in degrees, and the day. That direction is the number an
             ancient astronomer recorded against the fixed stars.
             \n\nMost of the time the direction climbs. The loop has two turns: where it
             stops climbing and starts to fall, and where it stops falling and
             climbs again. Press <strong>Space</strong> to run the scene and
             again to pause it, then <strong>Step forward</strong> (or the full
             stop key) to move on one frame at a time.
             At the first turn, take a reading while the direction is still
             climbing, then keep stepping until you reach one that is lower: the
             turn lies between the two. At the second turn do the same the other
             way, from a reading while it is still falling to the first that is
             higher. The closer the two days, the better you know the turn.
             \n\nPress <strong>Take reading</strong> beside each box to record the
             value the readout shows. The page works out the day of each turn,
             the loop's length and its uncertainty.`,
      fields: [
        {
          id: 'a1_dir',
          label: 'First turn, last reading still rising: direction',
          unit: '°',
          source: { probe: 'dir' },
        },
        {
          id: 'a1_day',
          label: 'First turn, last reading still rising: day',
          unit: 'days',
          source: { probe: 'day' },
        },
        {
          id: 'a2_dir',
          label: 'First turn, first reading that has fallen: direction',
          unit: '°',
          source: { probe: 'dir' },
        },
        {
          id: 'a2_day',
          label: 'First turn, first reading that has fallen: day',
          unit: 'days',
          source: { probe: 'day' },
        },
        {
          id: 'b1_dir',
          label: 'Second turn, last reading still falling: direction',
          unit: '°',
          source: { probe: 'dir' },
        },
        {
          id: 'b1_day',
          label: 'Second turn, last reading still falling: day',
          unit: 'days',
          source: { probe: 'day' },
        },
        {
          id: 'b2_dir',
          label: 'Second turn, first reading rising again: direction',
          unit: '°',
          source: { probe: 'dir' },
        },
        {
          id: 'b2_day',
          label: 'Second turn, first reading rising again: day',
          unit: 'days',
          source: { probe: 'day' },
        },
        {
          id: 'turn_a',
          label: 'First turn: day, the middle of its bracket',
          unit: 'days',
          compute: v => (v.a1_day + v.a2_day) / 2,
          decimals: 1,
        },
        {
          id: 'wid_a',
          label: 'First turn: width of its bracket',
          unit: 'days',
          compute: v => v.a2_day - v.a1_day,
          decimals: 1,
        },
        {
          id: 'turn_b',
          label: 'Second turn: day, the middle of its bracket',
          unit: 'days',
          compute: v => (v.b1_day + v.b2_day) / 2,
          decimals: 1,
        },
        {
          id: 'wid_b',
          label: 'Second turn: width of its bracket',
          unit: 'days',
          compute: v => v.b2_day - v.b1_day,
          decimals: 1,
        },
        {
          id: 'loop_len',
          label: 'Length of the retrograde loop',
          unit: 'days',
          compute: v => (v.b1_day + v.b2_day) / 2 - (v.a1_day + v.a2_day) / 2,
          decimals: 1,
        },
        {
          id: 'loop_unc',
          label: 'Uncertainty in that length: half of the two widths, added',
          unit: 'days',
          compute: v => (v.a2_day - v.a1_day + v.b2_day - v.b1_day) / 2,
          decimals: 1,
        },
      ],
      // The days the direction turns, from two circular, coplanar orbits at 1.000 and 1.523 AU
      // (Earth at 103 degrees and Mars at 198 degrees on day 0, periods 365.21 and 686.43 days):
      // the first turn is START, the second END, and a loop comes round every EVERY days.
      // Worked out apart from the engine in tests/retrogradeMotion.test.js, which holds these to it.
      validate: v => {
        const START = 169.6;
        const END = 242.3;
        const EVERY = 780.44;
        const own = [
          'a1_dir',
          'a1_day',
          'a2_dir',
          'a2_day',
          'b1_dir',
          'b1_day',
          'b2_dir',
          'b2_day',
        ];
        if (!own.every(k => Number.isFinite(v[k]))) return null;
        // A change of direction as a signed step, so that 359.9 to 0.1 is a rise of 0.2.
        const move = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;
        if (v.a2_day <= v.a1_day || v.b2_day <= v.b1_day) {
          return {
            level: 'error',
            message:
              'In each pair the second reading must come on a later day than the first. Check that the first reading of each pair is the earlier one.',
          };
        }
        if (move(v.a1_dir, v.a2_dir) >= 0) {
          return {
            level: 'warn',
            message:
              'No reading in your first pair has fallen: the second direction is not lower than the first. Keep stepping until the direction has dropped, then take that reading as the second of the pair.',
          };
        }
        if (move(v.b1_dir, v.b2_dir) <= 0) {
          return {
            level: 'warn',
            message:
              'In your second pair the second direction is not higher than the first. Keep stepping past the lowest point until the direction is climbing again, then take that reading.',
          };
        }
        if (v.b1_day < v.a2_day) {
          return {
            level: 'warn',
            message:
              'The second turn comes after the first. Take its two readings on days after your first pair.',
          };
        }
        // The loops whose turn lies between a pair's two days, a little wider for the engine's drift.
        const loops = (lo, hi, at) => {
          const out = [];
          for (let n = 0; n < 60; n++) {
            const t = at + n * EVERY;
            const slack = 1 + n / 10;
            if (t + slack >= lo && t - slack <= hi) out.push(n);
          }
          return out;
        };
        const first = loops(v.a1_day, v.a2_day, START);
        const second = loops(v.b1_day, v.b2_day, END);
        if (!first.length) {
          return {
            level: 'warn',
            message:
              'The first turn is not between the two days you took. Between your two readings the direction should stop climbing and start to fall: check that each day is the one showing when you took the direction beside it.',
          };
        }
        if (!second.length) {
          return {
            level: 'warn',
            message:
              'The second turn is not between the two days you took. Between your two readings the direction should stop falling and start to climb: check that each day is the one showing when you took the direction beside it.',
          };
        }
        if (!first.some(n => second.includes(n))) {
          return {
            level: 'warn',
            message:
              'Your two turns belong to different loops. The second turn is the end of the loop that began at the first, so take it soon after.',
          };
        }
        return {
          level: 'ok',
          message:
            'Both turns lie between their two days. The length of the loop is the gap between the two turns, and its uncertainty is the half-widths of your two brackets added: narrow a bracket and the uncertainty shrinks.',
        };
      },
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) {
          return [
            { id: 'dir', label: 'Mars: direction from Earth', value: '-' },
            { id: 'day', label: 'Day', value: '-' },
          ];
        }
        return [
          {
            id: 'dir',
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(2)}°`,
          },
          { id: 'day', label: 'Day', value: ctx.days().toFixed(1) },
        ];
      },
    },
    {
      sid: 'the-share-you-found',
      bind: INNER_PAIR,
      type: 'read',
      evidence: [
        { step: 'time-the-reversal', field: 'loop_len' },
        { step: 'time-the-reversal', field: 'loop_unc' },
      ],
      compare:
        'Your length is the gap between two turns you bracketed yourself, so its uncertainty comes from your own brackets. Divide it by your synodic period for the share of each cycle spent going backwards.',
      title: 'The share you found',
      body: `The box above sets the share you predicted beside the length you
             measured.
             \n\nDivide your length by the synodic period you calculated: that is
             the share of each cycle Mars spends moving backwards. For the rest
             of the cycle the direction climbs, as it did before the loop began.`,
    },
    {
      sid: 'nearest-and-furthest',
      bind: INNER_PAIR,
      type: 'measure',
      title: 'Nearest and furthest',
      body: `Keep Mars selected and watch <strong>Distance from Earth</strong>
             instead. Unlike the direction, this one has a clear smallest value
             and a clear largest one.
             \n\nRecord the closest Mars comes to Earth and the furthest it gets.
             You will need to let it run through a good part of a synodic period
             to see both.`,
      fields: [
        { id: 'sep_min', label: 'Closest Mars comes to Earth', unit: 'AU' },
        { id: 'sep_max', label: 'Furthest Mars gets from Earth', unit: 'AU' },
        {
          id: 'sep_ratio',
          label: 'Furthest ÷ closest',
          unit: '',
          compute: v => v.sep_max / v.sep_min,
        },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
        ];
      },
    },
    {
      sid: 'bright-and-backwards-together',
      bind: INNER_PAIR,
      type: 'question',
      title: 'Bright and backwards together',
      kind: 'choice',
      body: `Your two distances differ by a factor of nearly five. Brightness
             falls off as the square of distance, so a factor of five in
             distance is a factor of more than twenty in brightness.
             \n\nNow recall when the direction ran backwards.`,
      prompt: 'In this simulation, Mars is closest to Earth…',
      options: [
        'at a random point unrelated to the retrograde loop',
        'at the same time as the retrograde loop, because both happen when Earth passes it',
        'when Mars is at the far side of its own orbit from the Sun',
        'twice per retrograde loop, once at each end',
      ],
      answer: 1,
      because:
        'Closest approach and retrograde motion are the same event seen two ways: both happen when Earth passes Mars on the inside. So Mars is at its brightest in our sky precisely while it is moving backwards. In the heliocentric picture that is forced. In an epicyclic one it is an extra fact to be arranged, and Ptolemy did arrange it, by putting the planet at the near side of its epicycle during the loop. It works, but it is another thing the model has to be told rather than something it predicts.',
    },
    {
      sid: 'when-does-it-reverse',
      bind: INNER_PAIR,
      type: 'question',
      title: 'When does it reverse?',
      kind: 'choice',
      body: `Compare your two measurements. The direction ran backwards at some
             point, and the distance had a minimum at some point. Think about
             where Earth is relative to Mars when each of those happens.`,
      prompt: 'Mars appears to move backwards…',
      options: [
        'when Mars is furthest from Earth, on the far side of the Sun',
        'when Earth is passing between the Sun and Mars, at their closest',
        'at random intervals, with no relation to the geometry',
        'whenever Mars is at the far point of its own orbit',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'farSide',
          option: 0,
          say: 'At that moment the direction to Mars is changing most slowly, not backwards. Look again at your readings: was the distance at its largest or its smallest when the direction fell?',
        },
        {
          id: 'atRandom',
          option: 2,
          say: 'The loops come at regular intervals, the synodic period you worked out, so they are tied to where the two planets are in their orbits.',
        },
        {
          id: 'planetTurnsRound',
          option: 3,
          say: 'Mars never turns round at any point of its orbit: its far point is one place on a circle it goes round steadily. What turns round is the direction from Earth, which depends on where Earth is too.',
        },
      ],
      because:
        'The reversal happens at opposition, when Earth overtakes Mars on the inside track. That is also when the two are closest, which is why Mars is at its brightest during a retrograde loop. The coincidence of "brightest" and "moving backwards" was known for two thousand years before anyone had an explanation that tied the two together, and in a geocentric model it is a coincidence: nothing about an epicycle requires the planet to be nearest while it loops.',
    },
    {
      sid: 'overtaking-on-the-inside',
      bind: INNER_PAIR,
      type: 'read',
      title: 'Overtaking on the inside',
      body: `The mechanism is the one you know from a motorway.
             \n\nYou are in the fast lane, overtaking a lorry. As you come up
             behind it, it is ahead of you and drifting slowly forward against
             the hills behind. As you draw level and pass, the lorry slides
             backwards against those hills, even though it is still driving
             forwards at seventy. Once you are well past, it falls behind and
             begins drifting forward again.
             \n\nThe lorry never reversed. You overtook it.
             \n\nEarth does exactly this to Mars once every synodic period. Earth is
             on the inside track and moving faster, so around opposition it
             sweeps past, and for the stretch you timed Mars slides backwards
             against the fixed stars. Mars is doing nothing unusual for the
             whole of it.`,
      tip: 'The fixed stars are the hills. Notice that the starfield behind the simulation does not move when you switch frames: objects that far away do not shift when the observer does, which is exactly why they make a good background to measure against.',
    },
    {
      sid: 'say-it-in-your-own',
      bind: INNER_PAIR,
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `You have measured both orbits, watched the loop draw itself, and
             seen where in the geometry it happens.`,
      prompt:
        'In two or three sentences, explain why Mars appears to reverse, without saying anything about what Mars does differently during those weeks.',
      rubric:
        'A good answer says that Mars moves steadily throughout, and that the reversal is produced by the observer’s own motion: Earth is on a smaller, faster orbit, and near opposition it overtakes Mars, so the direction from Earth to Mars swings backwards against the distant stars. Credit for naming opposition, for connecting it to Earth passing between the Sun and Mars, and for noting that this also makes Mars closest and brightest at that time. An answer that has Mars slowing down, stopping or being pulled back has missed the point of the investigation.',
    },
    {
      sid: 'what-it-cost-to-explain',
      bind: INNER_PAIR,
      type: 'read',
      title: 'What it cost to explain this',
      body: `In a model where Earth sits still at the center, retrograde motion
             is a puzzle: planets are supposed to move on circles at constant
             speed, and this one stops and goes backwards.
             \n\nThe answer, set down by Ptolemy around 150 CE, was the
             <em>epicycle</em>: the planet rides a small circle whose center
             rides the large one. Get the sizes and speeds right and the path
             makes a loop at the right times. It worked for fourteen hundred
             years, but it also needed an off-center <em>eccentric</em> and an
             <em>equant</em> point: separate devices, tuned per planet, to
             reproduce something no one of them explained.`,
      quote: {
        text: 'If the Sun be assumed to be the center, the retrogradations of the planets follow of necessity.',
        by: 'Nicolaus Copernicus, De revolutionibus, 1543',
      },
    },
    {
      sid: 'what-the-epicycle-was-really',
      bind: INNER_PAIR,
      type: 'question',
      title: 'What the epicycle was really tracking',
      kind: 'choice',
      body: `In Ptolemy's model each planet needs its own epicycle, with its own
             size and its own period. For Mars, Jupiter and Saturn those epicycle
             periods all come out the same as something you have already
             calculated.`,
      prompt:
        'The period of the epicycle for each outer planet turns out to equal…',
      options: [
        'that planet’s own orbital period',
        'one Earth year, for every one of them',
        'the planet’s distance from the Sun, in years',
        'a different number for each, with nothing in common',
      ],
      answer: 1,
      because:
        'Every outer planet’s epicycle takes exactly one year. Ptolemy knew this and recorded it; the model gives no reason for it. In the heliocentric picture the reason is immediate: the epicycle is not the planet’s motion at all, it is Earth’s, reflected onto the planet’s apparent path. Three unrelated planets sharing one period is the sort of coincidence that should make you suspicious of a model, and it is the specific fact Copernicus pointed at.',
    },
    {
      hints: [
        'Each planet needs the same four devices.',
        'Multiply the devices for one planet by the number of planets.',
      ],
      feedback: {
        close:
          'Close. Count the devices for one planet, then take that many for each planet.',
        off: 'Multiply the devices for one planet by the number of planets.',
      },
      sid: 'counting-the-machinery',
      bind: INNER_PAIR,
      type: 'question',
      title: 'Counting the machinery',
      kind: 'numeric',
      body: `Ptolemy's model needed, for each of the five visible planets, a
             deferent circle, an epicycle riding on it, an eccentric offset for
             the deferent's center, and an equant point for the timing. Four
             devices per planet.
             \n\nCount the devices needed for the five wandering planets alone,
             leaving out the Sun and Moon.`,
      prompt: 'How many separate geometric devices is that, for five planets?',
      unit: 'devices',
      answer: 20,
      tolerance: 1,
      because:
        'Twenty, each tuned separately against observation. None of them is wrong, exactly: the model reproduced the sky to about the accuracy of naked-eye measurement and stayed in use for fourteen centuries. What it never did was explain why the five epicycles should have the periods they have. Heliocentrism replaces all twenty devices with one fact about the observer, and gets the one-year epicycle for nothing.',
    },
    {
      sid: 'and-what-about-the-sun',
      bind: INNER_PAIR,
      type: 'predict',
      reveal: 'do-it-for-the-sun',
      title: 'And what about the Sun?',
      body: `Stay in Earth's frame. You have watched Mars, which loops. Now
             think about what the Sun does when it is measured against Earth.
             \n\nCommit before you look.`,
      prompt: 'Seen from Earth, the Sun’s path is…',
      options: [
        'a loop with a cusp, like Mars’s',
        'a simple closed circle, once a year, with no reversal',
        'a straight line, because the Sun does not orbit anything',
        'stationary, because the Sun is the center of the system',
      ],
      answer: 1,
      because:
        'A clean circle, once a year. The Sun never goes retrograde as seen from Earth, and that is the observational fact that separates the Sun from the planets in every ancient scheme. The reason is that Earth’s orbit is the Sun’s apparent orbit: there is no third motion to interfere with it. The loops belong to bodies whose own motion has to be combined with Earth’s.',
    },
    {
      sid: 'do-it-for-the-sun',
      bind: INNER_PAIR,
      type: 'explore',
      title: 'Do it for the Sun',
      body: `Keep Earth's frame on and watch the <strong>Sun</strong> instead of
             Mars.
             \n\nIn this frame the Sun goes round Earth once a year, on a
             near-perfect circle. That is not an error and it is not a
             concession: measured against Earth, the Sun really does go round
             once a year, and that is exactly what the sky looks like.`,
      checklist: [
        'The Sun traces a closed circle around Earth once a year',
        'The Sun’s path has no loop and no cusp in it',
        'Switch back to the world frame and the Sun stops moving entirely',
        'Switch to the Sun’s own frame and now Earth is the one going round',
      ],
      probe: ctx => {
        const frame = ctx.frame ? ctx.frame() : null;
        const sun = ctx.find('Sun');
        const seen = sun && ctx.seenFrom ? ctx.seenFrom(sun, 'Earth') : null;
        const rows = [
          {
            label: 'Reference frame',
            value: !frame || frame.mode === 'world' ? 'World' : 'A body',
          },
        ];
        if (seen) {
          rows.push({
            label: 'Sun: distance from Earth',
            value: ctx.distance(seen.separation),
          });
          rows.push({
            label: 'Sun: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          });
        } else {
          // Silently dropping the two rows left the panel looking finished
          // and wrong. Saying which of the two bodies is missing is the
          // difference between "you have not switched the frame yet" and
          // "this lesson is broken".
          rows.push({
            label: 'Sun: as seen from Earth',
            value: sun
              ? 'waiting for Earth to be on the canvas'
              : 'the Sun is not on the canvas yet',
          });
        }
        return rows;
      },
    },
    {
      sid: 'which-one-is-moving',
      bind: INNER_PAIR,
      type: 'question',
      title: 'Which one is moving?',
      kind: 'choice',
      body: `You have now watched the same three bodies in two frames. In one the
             Sun sits still and Earth goes round it. In the other Earth sits
             still and the Sun goes round it. Both pictures came from the same
             simulation, with the same forces, and neither was edited.`,
      prompt: 'Given only what you have seen so far…',
      options: [
        'the heliocentric picture is proved, because the loop disappears in it',
        'the geocentric picture is proved, because that is what we observe',
        'neither is proved: both frames describe the same motion, and the loop only tells you the observer is moving',
        'the question is meaningless, because motion is entirely arbitrary',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'sunFrameProved',
          option: 0,
          say: 'The loop also appears in Earth’s frame, and both pictures came from the same simulation: a picture that reproduces what we see has not shown it is the only one that does.',
        },
        {
          id: 'earthFrameProved',
          option: 1,
          say: 'What we observe is the direction to Mars, and the Sun-centered description gives that same direction. Seeing the loop from Earth shows that the observer moves, not that Earth is the center.',
        },
        {
          id: 'allFramesAlike',
          option: 3,
          say: 'Frames are free to choose but not all equal: only some let every force be traced to a mass.',
        },
      ],
      because:
        'The retrograde loop establishes that the observer is moving relative to Mars. It does not, by itself, establish what is at the center. Both descriptions reproduce the observation, which is precisely why the argument lasted so long. What eventually settled it was not this loop: it was that the heliocentric picture explains the one-year epicycle without being told to, gives the planets an ordering by distance that matches their periods, and predicts stellar parallax, which was finally measured in 1838. The last option goes too far the other way: frames are not arbitrary, because only some of them are inertial, and picking the wrong one puts forces in your equations that no object exerts.',
    },
    {
      sid: 'frames-are-not-all-equal',
      bind: INNER_PAIR,
      type: 'read',
      title: 'Frames are not all equal',
      body: `Choosing a frame is free, but not consequence-free.
             \n\nIn Earth's frame the Sun circles Earth once a year. Nothing is
             wrong with that description, but if you now ask what force bends the
             Sun onto that circle, you are stuck: Earth's gravity is nowhere near
             enough to hold a body a third of a million times its mass in orbit.
             To make the equations work in that frame you have to add fictitious
             forces, which are not exerted by anything and exist only to account
             for the frame's own acceleration.
             \n\nIn the Sun's frame you do not need them. That is the real
             argument for heliocentrism, and it is Newton's rather than
             Copernicus's: the frame in which the description is simplest, and in
             which every force can be traced to a mass, is the one worth
             building physics in.
             \n\nStrictly the Sun is not at rest either. It orbits the
             barycenter of the Solar System, which is what the
             <strong>Barycenter</strong> option in the same menu shows you.
             \n\nIf the loop does not decide between the two pictures, what did?
             Copernicus argued economy: one moving Earth in place of five
             epicycles. The decisive test was <em>stellar parallax</em>: if
             Earth swings 2 AU across space, nearby stars must shift against
             distant ones over the year. Tycho Brahe looked, found nothing, and
             concluded that Earth does not move. The next step asks what his
             null result could have shown.`,
      tip: 'Try it: switch Frame to Barycenter. For this three-body system the barycenter sits almost exactly on the Sun, because the Sun holds essentially all the mass.',
    },
    {
      sid: 'why-tycho-found-nothing',
      bind: INNER_PAIR,
      type: 'question',
      title: 'Why Tycho found nothing',
      kind: 'choice',
      body: `Tycho's instruments were the best in the world before the telescope,
             good to about one arcminute. The largest stellar parallax is
             0.77 arcseconds, and an arcminute is sixty arcseconds.`,
      prompt: 'Tycho’s failure to detect parallax shows that…',
      options: [
        'Earth does not move, exactly as he concluded',
        'his measurements were careless',
        'the effect was about eighty times smaller than his best precision, so a null result was the only possible outcome',
        'parallax does not exist',
      ],
      answer: 2,
      because:
        'A null result from an instrument eighty times too coarse tells you nothing about the effect. Tycho’s reasoning was sound and his data were excellent; what he lacked was any way to know how far away the stars were, so he could not tell a small effect from an absent one. This is a general hazard worth carrying out of the investigation: a measurement that finds nothing constrains a theory only once you know what the measurement could have detected.',
    },
    {
      hints: [
        'Jupiter’s period is in years: change it to days to match Earth’s.',
        'Use the same formula as for Mars, with Earth’s period as the shorter one.',
      ],
      feedback: {
        close: 'Close. Subtract the reciprocals first, and only then invert.',
        off: 'The synodic period is one over the difference of the two rates, not the difference of the two periods.',
      },
      misconceptions: [
        {
          id: 'yearsForDays',
          say: 'That looks like the synodic period in years. The question asks for days, so multiply by 365.',
        },
      ],
      sid: 'jupiters-loops',
      bind: INNER_PAIR,
      type: 'question',
      title: 'How often does Jupiter loop?',
      kind: 'numeric',
      body: `Mars is not the only planet whose loops you can time. Jupiter is
             5.2 AU from the Sun and takes 11.9 years to go round it.
             \n\nWork out Jupiter's synodic period as you did for Mars, and you
             know how often its loops come. Jupiter is not in this scene, so
             this one is arithmetic only.`,
      prompt: 'How many days between one opposition of Jupiter and the next?',
      unit: 'days',
      answer: 399,
      tolerance: 15,
      because:
        'Jupiter’s synodic period is about 399 days, barely more than an Earth year, so its loops come round almost every year, far more often than Mars’s. The further out a planet is, the less it moves while Earth laps it, and the synodic period closes on one year: in the limit the loop is purely Earth’s own motion, reflected. That is the same fact as the one-year epicycle, reached from the other side.',
    },
    {
      sid: 'what-you-did',
      bind: INNER_PAIR,
      type: 'read',
      title: 'What you did',
      body: `You measured two orbital periods and computed a synodic period from
             them. You predicted what share of the cycle Mars spends going
             backwards, and what a planet would look like from a moving observer,
             then changed the frame and watched the second prediction come true.
             You timed the reversal yourself, with its uncertainty, and set it
             beside the first. You located the reversal at opposition, tied it to the
             overtaking geometry, and found the one-year epicycle that a
             geocentric model has to accept as a coincidence.
             \n\nThe simulation was doing exactly one thing throughout: two
             planets on circular orbits, under an inverse-square force from a
             star. Every loop, cusp and reversal came out of subtracting one
             body's position from another's.
             \n\nThat is worth holding onto beyond this investigation. A great many
             things that look like anomalies in the sky turn out to be statements
             about where the observer is standing, and the first question to ask
             of a strange motion is always: measured against what?`,
    },
  ],
};

export default RETROGRADE;
