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

const RETROGRADE = {
  id: 'retrograde-motion',
  thumbnail: 'images/scenarios/retrograde-mars.webp',
  title: 'Why Mars Goes Backwards',
  subtitle: 'Change the frame, and fourteen centuries of epicycles fall away',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: false },
  summary:
    'Twice every three years Mars stops in the sky, reverses, and loops back on itself. Watched from outside, nothing of the sort happens: Earth and Mars both go round the Sun the same way and never turn back. You will measure both orbits, predict what Mars does when seen from Earth, then switch the reference frame and watch the loop draw itself. Nothing in the physics changes when you do. That is the entire point, and it is what took astronomy from Ptolemy to Copernicus.',
  objectives: [
    'Describe retrograde motion as an observation, separately from any explanation of it',
    'Compute a synodic period from two orbital periods and say what it counts',
    'Predict and then verify that a retrograde loop happens at opposition',
    'Explain retrograde motion as a consequence of the observer’s own motion, without invoking anything the planet does',
    'Say what a reference frame is, and what changes and what does not when you switch one',
    'State what the retrograde loop does and does not establish about which body is at the center',
  ],
  steps: [
    {
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
             or a zigzag against the background. Mars does this once every 780
             days, and the reversal lasts about ten weeks.
             \n\nThis is not a subtle effect visible only to specialists. Anyone
             who watches Mars for a few months with the naked eye can see it, and
             every civilization that kept sky records noticed it.`,
      quote: {
        text: 'The planets appear sometimes to move forward, sometimes backward, and sometimes to stand still.',
        by: 'Claudius Ptolemy, Almagest, c. 150 CE',
      },
      tip: 'This lesson leaves the inspector switched on: you will need it to read numbers off Earth and Mars. Placing new objects is off, so a stray click cannot alter the system you are measuring.',
      setup: {
        scenario: 'Retrograde Mars',
        seed: 'retrograde-lab',
        camera: { zoom: 1.6, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      type: 'read',
      title: 'What you are looking at',
      body: `Three bodies, and nothing else. The <strong>Sun</strong> at the
             center, <strong>Earth</strong> in blue on the inner orbit, and
             <strong>Mars</strong> in orange on the outer one.
             \n\nThe distances are real: Earth at 1.00 AU, Mars at 1.52. The
             masses are real, so the periods are real too, and the whole system
             is running about four hundred thousand times faster than the sky
             does. A year of Earth's takes a few seconds here.
             \n\nWatch for a moment. Both planets go round the Sun the same way,
             counterclockwise, and neither ever slows, stops or turns back. Whatever
             makes Mars appear to reverse, it is not something Mars does.`,
      tip: 'If the trails are not showing, press the reset button beside the progress bar to rebuild the system.',
    },
    {
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
            value: b ? ctx.speed(Math.hypot(b.vel.x, b.vel.y)) : '-',
          });
        }
        rows.push({ label: 'Day', value: ctx.days().toFixed(0) });
        return rows;
      },
    },
    {
      type: 'measure',
      title: 'The two orbits',
      body: `Click <strong>Earth</strong> and read its orbital period from the
             inspector, then click <strong>Mars</strong> and read its. The
             inspector reports the period of the orbit each body is actually on,
             computed from its live position and velocity.
             \n\nWhile you are there, record how far each one is from the Sun.`,
      fields: [
        { id: 'earth_a', label: 'Earth: distance from the Sun', unit: 'AU' },
        { id: 'mars_a', label: 'Mars: distance from the Sun', unit: 'AU' },
        { id: 'earth_P', label: 'Earth: orbital period', unit: 'days' },
        { id: 'mars_P', label: 'Mars: orbital period', unit: 'days' },
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          if (!b) {
            rows.push({ label: name, value: 'not found' });
            continue;
          }
          const el = ctx.elements(b);
          rows.push({
            label: `${name}: distance from the Sun`,
            value: el ? ctx.distance(el.semiMajorAxis) : '-',
          });
          rows.push({
            label: `${name}: period`,
            value: el ? ctx.time(el.period) : '-',
          });
        }
        return rows;
      },
    },
    {
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
      because:
        'Earth takes 365 days and Mars 687, so Earth laps the Sun nearly twice for every one lap of Mars. That is the whole mechanism of retrograde motion, and you have already measured it. The inner planet is on a shorter track and it also moves faster along it: both effects run the same way, which is what Kepler’s third law says.',
    },
    {
      type: 'measure',
      title: 'How fast each one goes round',
      body: `A period is awkward to compare directly. Turn each one into an
             angular speed instead: a full lap is 360°, so a planet covers
             360 ÷ P degrees every day.
             \n\nUse the two periods you just measured.`,
      fields: [
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
            label: `${name}: period`,
            value: el ? ctx.time(el.period) : '-',
          });
        }
        return rows;
      },
    },
    {
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
      type: 'question',
      title: 'How often does Earth catch up?',
      kind: 'numeric',
      body: `Use your two measured periods in 1/S = 1/P₁ − 1/P₂, with P₁ the
             shorter one. Work in days.
             \n\nWith 365 and 687 the subtraction gives 1/S = 0.00274 − 0.00146 =
             0.00128 per day.`,
      prompt: 'How many days between one opposition of Mars and the next?',
      unit: 'days',
      answer: 780,
      tolerance: 60,
      because:
        'S = 780 days, about two years and seven weeks. That is why Mars is well placed for observing roughly every other year rather than every year: Earth needs 780 days to gain a full lap on it. Venus, being much faster, comes round to the same alignment every 584 days; Jupiter, being much slower, every 399, barely more than an Earth year, because Jupiter has hardly moved while Earth goes round.',
    },
    {
      type: 'question',
      title: 'A lap gained',
      kind: 'numeric',
      body: `You have the rate at which Earth gains on Mars, in degrees per day.
             A full lap gained is 360°.
             \n\nDivide one by the other and you have the synodic period again,
             by a different route. It should agree with what you got from the
             reciprocals.`,
      prompt:
        'At about 0.46° gained per day, how many days to gain a full 360°?',
      unit: 'days',
      answer: 783,
      tolerance: 60,
      because:
        'The same 780 days, reached without touching a reciprocal. This is worth doing twice because the reciprocal formula is easy to apply and hard to feel: what it counts is laps gained, and gaining a lap at half a degree a day takes a little over two years. Every retrograde loop of Mars is one lap gained.',
    },
    {
      type: 'predict',
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
      tip: 'The trail here holds about 110 days of history, which is a little longer than a whole retrograde episode. That is deliberate: much shorter and the loop never closes.',
    },
    {
      type: 'explore',
      title: 'Put yourself on Earth',
      body: `Click <strong>Earth</strong>, then switch its
             <strong>Reference frame</strong> on in the inspector. Or use
             <strong>Tools &gt; Frame</strong> and choose the selected object.
             \n\nGive it half a minute. The trail has to redraw itself over a
             good fraction of the 780 days you calculated before the loop
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
      type: 'measure',
      title: 'Catch the reversal',
      body: `The picture shows the loop; now put a number on it. With Earth's
             frame still on and Mars selected, the inspector shows
             <strong>Direction from Earth</strong> in degrees. That single number
             is the observable: it is the direction you would point at, and the
             thing an ancient astronomer recorded against the fixed stars.
             \n\nLet it run and watch that number. Most of the time it climbs
             steadily. Record it, wait, record it again, and keep going until you
             catch a reading that is <em>lower</em> than the one before. Press
             <strong>Space</strong> to pause when you want to read carefully.
             \n\nThe day counter is on the timeline at the bottom of the screen.`,
      fields: [
        {
          id: 'lon_a',
          label: 'Direction from Earth, first reading',
          unit: '°',
        },
        { id: 'day_a', label: 'Day of that reading', unit: 'days' },
        {
          id: 'lon_b',
          label: 'Direction, a reading that went backwards',
          unit: '°',
        },
        { id: 'day_b', label: 'Day of that reading', unit: 'days' },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
          { label: 'Day', value: ctx.days().toFixed(0) },
        ];
      },
    },
    {
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
      type: 'question',
      title: 'Bright and backwards together',
      kind: 'choice',
      body: `Your two distances differ by a factor of three or so. Brightness
             falls off as the square of distance, so a factor of three in
             distance is a factor of about nine in brightness.
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
      because:
        'The reversal happens at opposition, when Earth overtakes Mars on the inside track. That is also when the two are closest, which is why Mars is at its brightest during a retrograde loop. The coincidence of "brightest" and "moving backwards" was known for two thousand years before anyone had an explanation that tied the two together, and in a geocentric model it is a coincidence: nothing about an epicycle requires the planet to be nearest while it loops.',
    },
    {
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
             \n\nEarth does exactly this to Mars every 780 days. Earth is on the
             inside track and moving faster, so around opposition it sweeps past,
             and for those ten weeks Mars slides backwards against the fixed
             stars. Mars is doing nothing unusual for the whole of it.`,
      tip: 'The fixed stars are the hills. Notice that the starfield behind the simulation does not move when you switch frames: objects that far away do not shift when the observer does, which is exactly why they make a good background to measure against.',
    },
    {
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `You have measured both orbits, watched the loop draw itself, and
             seen where in the geometry it happens.`,
      prompt:
        'In two or three sentences, explain why Mars appears to reverse, without saying anything about what Mars does differently during those weeks.',
      rubric:
        'A good answer says that Mars moves steadily throughout, and that the reversal is produced by the observer’s own motion: Earth is on a smaller, faster orbit, and near opposition it overtakes Mars, so the direction from Earth to Mars swings backwards against the distant stars. Credit for naming opposition, for connecting it to Earth passing between the Sun and Mars, and for noting that this also makes Mars closest and brightest at that time. An answer that has Mars slowing down, stopping or being pulled back has missed the point of the lesson.',
    },
    {
      type: 'read',
      title: 'What it cost to explain this',
      body: `In a model where Earth sits still at the center and everything
             circles it, retrograde motion is a genuine puzzle. Planets are
             supposed to move on circles at constant speed. This one stops and
             goes backwards.
             \n\nThe answer, refined over centuries and set down by Ptolemy
             around 150 CE, was the <em>epicycle</em>: the planet rides a small
             circle whose center rides the large one. Get the two sizes and the
             two speeds right and the combined path makes a loop, at the right
             times, of the right size. It worked. It predicted planetary
             positions well enough to be used for fourteen hundred years.
             \n\nIt also needed one epicycle per planet, plus an off-center
             <em>eccentric</em> to fix the timing, plus an <em>equant</em> point
             about which the motion was uniform instead of about the center.
             Three separate devices, tuned per planet, to reproduce something no
             single one of them explained.`,
      quote: {
        text: 'If the Sun be assumed to be the center, the retrogradations of the planets follow of necessity.',
        by: 'Nicolaus Copernicus, De revolutionibus, 1543',
      },
    },
    {
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
      type: 'predict',
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
        }
        return rows;
      },
    },
    {
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
      because:
        'The retrograde loop establishes that the observer is moving relative to Mars. It does not, by itself, establish what is at the center. Both descriptions reproduce the observation, which is precisely why the argument lasted so long. What eventually settled it was not this loop: it was that the heliocentric picture explains the one-year epicycle without being told to, gives the planets an ordering by distance that matches their periods, and predicts stellar parallax, which was finally measured in 1838. The last option goes too far the other way: frames are not arbitrary, because only some of them are inertial, and picking the wrong one puts forces in your equations that no object exerts.',
    },
    {
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
             <strong>Barycenter</strong> option in the same menu shows you.`,
      tip: 'Try it: switch Frame to Barycenter. For this three-body system the barycenter sits almost exactly on the Sun, because the Sun holds essentially all the mass.',
    },
    {
      type: 'read',
      title: 'What actually settled it',
      body: `If the loop does not decide between the two pictures, what did?
             \n\nCopernicus's own arguments were about economy: one moving Earth
             in place of five epicycles, and an ordering of the planets by
             distance that finally matched their periods. Good reasons, not
             proof, and his model was no more accurate than Ptolemy's because he
             kept the circles.
             \n\nThe decisive prediction was <em>stellar parallax</em>. If Earth
             really swings 2 AU across space every six months, then nearby stars
             must shift very slightly against more distant ones over the year.
             Tycho Brahe looked for exactly this, found nothing, and concluded
             correctly that either Earth does not move or the stars are
             impossibly far away. He chose the first.
             \n\nHe was wrong about which, and right that it was the test. The
             stars are impossibly far away: the largest parallax of any star is
             0.77 arcseconds, about the width of a coin seen from three miles. It
             was finally measured in 1838, three centuries after Copernicus.`,
    },
    {
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
        'A null result from an instrument eighty times too coarse tells you nothing about the effect. Tycho’s reasoning was sound and his data were excellent; what he lacked was any way to know how far away the stars were, so he could not tell a small effect from an absent one. This is a general hazard worth carrying out of the lesson: a measurement that finds nothing constrains a theory only once you know what the measurement could have detected.',
    },
    {
      type: 'measure',
      title: 'How long does a loop last?',
      body: `One last measurement, and it is a prediction you can check against
             the real sky.
             \n\nWith Earth's frame on and Mars selected, watch
             <strong>Direction from Earth</strong> and record the day the number
             starts falling and the day it starts rising again. The gap between
             them is the length of the retrograde episode.`,
      fields: [
        {
          id: 'retro_start',
          label: 'Day the direction starts falling',
          unit: 'days',
        },
        { id: 'retro_end', label: 'Day it starts rising again', unit: 'days' },
        {
          id: 'retro_len',
          label: 'Length of the retrograde episode',
          unit: 'days',
          compute: v => v.retro_end - v.retro_start,
        },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
          { label: 'Day', value: ctx.days().toFixed(0) },
        ];
      },
    },
    {
      type: 'question',
      title: 'Mars or Jupiter?',
      kind: 'choice',
      body: `Jupiter is at 5.2 AU and takes 11.9 years to go round. Use the
             synodic formula on Earth and Jupiter: 1/S = 1/365 − 1/4333.`,
      prompt: 'Compared with Mars, Jupiter’s retrograde loops happen…',
      options: [
        'less often, because Jupiter is so much further away',
        'more often, roughly once an Earth year, because Jupiter has barely moved while Earth goes round',
        'at the same interval, since both are outer planets',
        'never: only Mars shows retrograde motion',
      ],
      answer: 1,
      because:
        'Jupiter’s synodic period is 399 days, barely more than an Earth year, so it goes retrograde almost every year. Saturn’s is 378 days and Neptune’s 367. The further out a planet is, the less it moves while Earth laps it, so the synodic period converges on one year: in the limit the loop is purely Earth’s own orbit, reflected. That limit is the same fact as the one-year epicycle two steps back, arrived at from the other direction.',
    },
    {
      type: 'read',
      title: 'What you did',
      body: `You measured two orbital periods and computed a synodic period from
             them. You predicted what a planet would look like from a moving
             observer, then changed the frame and watched the prediction come
             true. You located the reversal at opposition, tied it to the
             overtaking geometry, and found the one-year epicycle that a
             geocentric model has to accept as a coincidence.
             \n\nThe simulation was doing exactly one thing throughout: two
             planets on circular orbits, under an inverse-square force from a
             star. Every loop, cusp and reversal came out of subtracting one
             body's position from another's.
             \n\nThat is worth holding onto beyond this lesson. A great many
             things that look like anomalies in the sky turn out to be statements
             about where the observer is standing, and the first question to ask
             of a strange motion is always: measured against what?`,
    },
  ],
};

export default RETROGRADE;
