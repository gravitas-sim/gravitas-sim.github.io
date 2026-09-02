// =============================================================================
// Tides
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

// --- 9. Tides ------------------------------------------------------------------

const TIDES_EARTH_MOON = {
  scenario: 'Earth-Moon System',
  seed: 'tides-lab',
  camera: { zoom: 2.2, pan: { x: 0, y: 0 } },
  paused: false,
};

const TIDES_DISRUPTION = {
  scenario: 'Tidal Disruption Event',
  seed: 'tides-lab',
  camera: { zoom: 0.9, pan: { x: 0, y: 0 } },
  paused: false,
};

const TIDES = {
  id: 'tides',
  thumbnail: 'images/scenarios/earth-moon-system.webp',
  title: 'Tides',
  subtitle:
    'Stretch a world, move a moon, and discover why gravity can tear objects apart',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'Tides are not caused by strong gravity. They are caused by gravity being unequal across an object, and the whole lesson is built on that one subtraction: take the pull on the centre away from the pull on the near side and the far side, and everything from the two daily high tides to a star being shredded by a black hole falls out of what is left.',
  objectives: [
    'Explain why an extended object feels a different gravitational pull at each point in it',
    'State that a tide is the difference between the local pull and the pull on the centre, and use that to say why there are two ocean bulges rather than one',
    'Measure how tidal strength changes with separation and with the mass of the companion, and state both relationships',
    'Compare the tide a body raises against that body’s own gravity, and predict whether it holds together',
    'Explain why a Roche limit is different for every pair of objects, and say what it does and does not predict',
  ],
  steps: [
    {
      type: 'read',
      title: 'Twice a day, everywhere',
      body: `Stand on almost any coast and the sea comes in and goes out roughly
             twice a day. Not once. Twice.
             \n\nThat "twice" is the whole puzzle. The Moon is on one side of
             the Earth at a time, and the ocean bulges on <em>both</em> sides at
             once: there is a high tide under the Moon and another high tide on
             the opposite face of the planet, twelve thousand kilometres away
             from it. Any explanation that amounts to "the Moon pulls the water
             toward it" predicts one bulge and is therefore wrong.
             \n\nOn screen is the real Earth-Moon system: the Earth at the
             centre and the Moon, <strong>Luna</strong>, on its 27.3 day orbit.
             The simulation is a straightforward Newtonian one, and that turns
             out to be all you need. Nothing in this lesson requires a force
             that is not already in that picture. What it requires is
             subtraction.`,
      tip: 'While a lesson is running, clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: TIDES_EARTH_MOON,
      probe: ctx => {
        const moon = ctx.find('Luna');
        const el = moon && ctx.elements(moon);
        return [
          { label: 'Bodies on screen', value: 'Earth, and the Moon' },
          {
            label: 'Moon’s distance now',
            value: el ? ctx.distance(el.r) : 'building the system…',
          },
          { label: 'Real separation', value: '384,400 km, on average' },
        ];
      },
    },

    {
      type: 'predict',
      title: 'Is the pull the same everywhere?',
      body: `The Earth is not a point. It is a ball 12,742 km across, and the
             side facing the Moon is 12,742 km closer to the Moon than the side
             facing away.
             \n\nGravity weakens with distance. Commit to an answer before you
             are shown anything.`,
      prompt: 'The Moon’s gravitational pull on the Earth is…',
      options: [
        'exactly the same strength at every point in the Earth',
        'stronger on the side facing the Moon than on the far side',
        'stronger on the far side, because it has further to reach',
        'only felt at the Earth’s centre, where all the mass is treated as being',
      ],
      answer: 1,
      because:
        'Stronger on the near side. Gravity falls off with distance, and the near side really is closer, so it really is pulled harder. The last option is a genuinely useful half-truth: the Earth’s own gravity can be treated as coming from its centre, and for working out the Earth’s orbit the Moon can be too. But the Earth is being pulled by something outside it, and for that the difference between one part of the Earth and another is the entire story.',
    },

    {
      type: 'read',
      title: 'Three points, three pulls',
      body: `The panel shows the Earth with an arrow leaving three places on it:
             the <strong>near side</strong>, the <strong>centre</strong>, and
             the <strong>far side</strong>. The companion is off to the right,
             so every arrow points right.
             \n\nEach arrow is drawn in true proportion to the others. Look at
             them. At the Moon’s real distance they look identical, and that is
             not a failure of the drawing: the Earth is small compared with
             384,400 km, so the three distances are nearly the same and the
             three pulls are nearly the same.
             \n\nNow read the three numbers underneath the picture. They are not
             the same.`,
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        title: 'The pull on three points of the Earth',
        note: 'Distance is in units of the Moon’s real distance. Leave it at 1.00 for now: this is the real Earth-Moon system.',
      },
      tip: 'Slide the distance down toward 0.2 and watch the three arrows stop looking alike. Bring it back to 1.00 before moving on.',
    },

    {
      type: 'question',
      title: 'How different are they?',
      kind: 'choice',
      body: `Read the three accelerations off the panel on the previous screen,
             or set the distance back to 1.00 here and read them again. The near
             side is pulled hardest, the far side least, and the centre sits
             between them.`,
      prompt:
        'At the Moon’s real distance, the pull on the near side is bigger than the pull on the far side by roughly…',
      options: [
        'a factor of two',
        'a factor of ten',
        'about seven percent',
        'nothing measurable: they are identical',
      ],
      answer: 2,
      because:
        'About seven percent. That is a tiny difference, and it is the entire cause of every ocean tide on Earth. Hold on to how small it is: a seven percent variation in a pull that is itself only about a three-hundred-thousandth of the Earth’s own surface gravity. Tides are a small residue of a small quantity, which is why the seas move a few metres rather than being ripped off the planet.',
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        title: 'Read the three numbers again',
        note: 'Near side, centre, far side. The last row does the comparison for you.',
      },
    },

    {
      type: 'predict',
      title: 'So why two bulges?',
      body: `Everything you have seen so far points one way: toward the Moon.
             The near side is pulled toward the Moon, the centre is pulled
             toward the Moon, the far side is pulled toward the Moon. Nothing
             anywhere is pulled away from it.
             \n\nAnd yet there is a high tide on the far side of the Earth, at
             the same time as the one underneath the Moon. Commit to an
             explanation.`,
      prompt: 'The far-side bulge exists because…',
      options: [
        'the Moon pushes on the far side of the Earth',
        'centrifugal force from the Earth’s spin throws the water outward there',
        'the far side is pulled toward the Moon less than the Earth as a whole is, so it gets left behind',
        'the water displaced from the near side has to go somewhere',
      ],
      answer: 2,
      because:
        'The far side is left behind. Nobody pushes it: it is pulled toward the Moon like everything else, just less than average, so relative to the Earth as a whole it lags on the far side. That is the answer, and the next screen shows the arithmetic that produces it. The spin option is a common and stubborn story, and it is worth being clear that it is not the cause: the two bulges are there for a non-rotating Earth too, and the Earth’s rotation is what carries you through them twice a day rather than what creates them.',
    },

    {
      type: 'read',
      title: 'Take the centre away',
      body: `Here is the move that makes tides make sense.
             \n\nThe Earth as a whole is in free fall around the Earth-Moon
             centre of mass. It accelerates at whatever rate the pull on its
             <em>centre</em> dictates, and it carries everything on it along at
             that rate: you, the seas, the rocks. What you can feel is not the
             pull. It is the difference between the pull where you are and the
             pull the whole planet is being carried along by.
             \n\nSo subtract the centre’s pull from all three. The panel now
             shows both rows: the raw pulls on top, and underneath what is left
             after the subtraction.
             \n\n<strong>Near side:</strong> pulled harder than average, so what
             is left points toward the Moon.
             \n\n<strong>Centre:</strong> exactly average, so nothing is left. A
             dot.
             \n\n<strong>Far side:</strong> pulled less than average, so what is
             left points <em>away</em> from the Moon.
             \n\nStretched at both ends. Two bulges, from one pull, by
             subtraction.`,
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        residual: true,
        title: 'The pulls, and what is left after the centre is taken away',
        note: 'The bottom row is drawn far larger than the top row, and the panel says by how much. Drawn to the same scale it would be invisible, which is exactly why the subtraction has to be done rather than looked at.',
      },
      tip: 'Nothing new has been added between the two rows. The bottom row is the top row minus one number.',
    },

    {
      type: 'question',
      title: 'What the far-side arrow means',
      kind: 'choice',
      body: `On the bottom row, the far-side arrow points away from the Moon.
             That is the thing most worth getting right in this entire lesson,
             so it is worth stating carefully.`,
      prompt: 'The outward-pointing far-side arrow means that…',
      options: [
        'gravity from the Moon reverses direction on the far side of the Earth',
        'the far side is still pulled toward the Moon, but less than the Earth’s centre is',
        'a second force, separate from gravity, acts on the far side',
        'the far side is beyond the Moon’s reach',
      ],
      answer: 1,
      because:
        'Still pulled toward the Moon, just less than average. Gravity never reverses and never switches off; there is no second force. The outward arrow is a bookkeeping result, not a push: it is what is left over after you subtract the acceleration the whole planet shares. If you insist on describing tides without subtracting the centre, you are stuck with one bulge and a coastline that disagrees with you twice a day.',
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        residual: true,
        title: 'Both rows again',
        note: 'Compare the far-side arrows on the two rows. On the top it points toward the companion. On the bottom, after the subtraction, it points away.',
      },
    },

    {
      type: 'read',
      title: 'What a tide actually is',
      body: `A definition worth memorising, because it is short and it is the
             whole subject:
             \n\n<strong>A tide is the difference in gravitational acceleration
             across an object.</strong>
             \n\nNot the strength of gravity. The <em>difference</em> in it.
             This distinction does real work. You are, right now, being pulled
             on by the Sun about 180 times harder than by the Moon: the Sun is
             enormously more massive. And yet the Moon raises the bigger ocean
             tide, by more than a factor of two. Strong gravity and strong tides
             are simply not the same thing, and you will measure why in a few
             screens.
             \n\nThe same difference is at work everywhere gravity meets
             something with a size: the seas moving up a beach, a moon kept
             molten by being kneaded, a comet coming apart into a string of
             fragments, and a star being pulled into a stream around a black
             hole. One mechanism, and you have already seen all of it.`,
      quote: {
        text: 'The waters of the sea rise twice and fall twice in the space of a lunar day, and the greatest tides occur at the third hour after the appulse of the luminaries to the meridian of the place.',
        by: 'Isaac Newton, Principia, Book III, 1687',
      },
      tip: 'Newton got the two bulges right in 1687, in the same book that introduced universal gravitation. It was one of the first things his theory explained that no previous one could.',
    },

    {
      type: 'predict',
      title: 'Bring the companion closer',
      body: `You are about to be handed a distance slider, and a graph that
             records what you read off it. Before you touch either, commit.
             \n\nSuppose the Moon moved to half its present distance from the
             Earth, with nothing else changed.`,
      prompt: 'At half the distance, the tide the Moon raises would be…',
      options: [
        'twice as strong',
        'four times as strong',
        'eight times as strong',
        'unchanged, because the Moon’s mass has not changed',
      ],
      answer: 2,
      because:
        'Eight times. Most people say four, reasoning from the inverse-square law, and that reasoning is sound for the pull itself: halve the distance and the pull quadruples. But a tide is a difference between two pulls, and moving in closer makes the near and far distances differ by a larger fraction as well as making both pulls stronger. The two effects compound. You are about to measure it.',
    },

    {
      type: 'measure',
      title: 'Four distances',
      body: `The panel reports the tidal stretch as a multiple of the real lunar
             tide, so the real Moon reads 1.00 and everything else is measured
             against it.
             \n\nSet the slider to each of the four distances in turn and type
             what the panel says. Your points land on the graph as you type, so
             nothing has to be remembered from one row to the next.`,
      fields: [
        { id: 'd1', label: 'Distance 1', unit: '× Moon’s', hint: '2' },
        {
          id: 't1',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '0.13',
        },
        { id: 'd2', label: 'Distance 2', unit: '× Moon’s', hint: '1' },
        {
          id: 't2',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '1',
        },
        { id: 'd3', label: 'Distance 3', unit: '× Moon’s', hint: '0.5' },
        {
          id: 't3',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '8',
        },
        { id: 'd4', label: 'Distance 4', unit: '× Moon’s', hint: '0.25' },
        {
          id: 't4',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '64',
        },
      ],
      validate: v => {
        const rows = [
          [v.d1, v.t1],
          [v.d2, v.t2],
          [v.d3, v.t3],
          [v.d4, v.t4],
        ].filter(([d, t]) => Number.isFinite(d) && Number.isFinite(t));
        if (rows.length < 2) return null;
        if (rows.some(([d, t]) => d <= 0 || t <= 0)) {
          return {
            level: 'error',
            message: 'Distances and tidal strengths are both positive numbers.',
          };
        }
        // Every reading should satisfy tide x distance^3 = 1 at unit mass.
        const products = rows.map(([d, t]) => t * d * d * d);
        const mean = products.reduce((a, b) => a + b, 0) / products.length;
        const spread = (Math.max(...products) - Math.min(...products)) / mean;
        if (spread > 0.35) {
          return {
            level: 'warn',
            message:
              'These do not all sit on one relationship. The usual cause is a strength read at a different distance from the one beside it: check each row against the slider position that produced it.',
          };
        }
        return {
          level: 'ok',
          message: `Every one of your readings satisfies stretch × distance × distance × distance = ${mean.toFixed(2)}. Distance appears three times. Nobody told you that; it is in your own numbers.`,
        };
      },
      plot: {
        title: 'Your four readings',
        xLabel: 'distance  (× Moon’s)',
        yLabel: 'stretch  (× lunar tide)',
        height: 200,
        points: v => [
          { x: v.d1, y: v.t1, label: '1' },
          { x: v.d2, y: v.t2, label: '2' },
          { x: v.d3, y: v.t3, label: '3' },
          { x: v.d4, y: v.t4, label: '4' },
        ],
        transform: {
          label: 'Try 1 ÷ distance³',
          xLabel: '1 ÷ distance³',
          yLabel: 'stretch  (× lunar tide)',
          map: p => ({ x: 1 / (p.x * p.x * p.x), y: p.y, label: p.label }),
        },
        note: `Raw, the points climb away from the axis far too steeply for a
               straight line. Press <strong>Try 1 ÷ distance³</strong>: if the
               tide really does go as one over the distance cubed, they will
               drop onto a straight line through the corner. Straightening a
               curve by choosing the right axes is how a relationship gets
               identified rather than guessed.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 2, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'Read each distance here',
        note: 'Set the slider to 2, then 1, then 0.5, then 0.25, and type each reading into the boxes. The companion’s mass is held at the Moon’s.',
      },
      tip: 'The four suggested distances are only suggestions. Any four will do, so long as each strength was read at the distance beside it.',
    },

    {
      type: 'question',
      title: 'How steeply does it fall?',
      kind: 'numeric',
      body: `Look at rows 2 and 3 of your own table: you went from 1.00 to 0.50
             times the Moon’s distance, which is half the distance.
             \n\nAn ordinary inverse-square pull would have gone up by four. A
             tide is not an ordinary pull.`,
      prompt:
        'By what factor did the tidal stretch increase when you halved the distance?',
      unit: '×',
      answer: 8,
      tolerance: 0.6,
      because:
        'Eight, which is two cubed. Halving again multiplies by eight again: your fourth reading, at a quarter of the Moon’s distance, should be about 64 times the lunar tide. Distance enters three times over, not twice: the tide goes as one divided by the separation cubed. That is why the transformed plot straightens, and it is why tidal effects are almost always negligible until something gets close, and then suddenly are not.',
      tool: {
        id: 'tide-strength',
        values: { dist: 0.5, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'The curve you measured',
        note: 'The dot is your slider. Slide from 1.00 to 0.50 and watch the readout, if you want to check the factor directly.',
      },
    },

    {
      type: 'read',
      title: 'The relationship, written down',
      body: `You have measured it, so here it is in symbols. You are not being
             asked to derive it or to calculate with it, only to recognise the
             three things in it.
             \n\nFor a body of radius <em>R</em> sitting a distance <em>d</em>
             from a companion of mass <em>M</em>, the tidal stretch across it is
             about
             \n\n<strong>2 G M R ÷ d³</strong>
             \n\nRead it as three statements you already believe:
             \n\n<strong>M on top.</strong> A heavier companion stretches you
             harder. You will test this next.
             \n\n<strong>R on top.</strong> A bigger object gets stretched
             harder, because its two ends are further apart and so differ more.
             A pebble feels essentially no tide at all.
             \n\n<strong>d³ underneath.</strong> The one you just measured.
             Distance matters far more than anything else in the expression.
             \n\nOne honest caveat: this is an approximation, good when the
             object is small compared with its distance. It is excellent for the
             Moon on the Earth, and it gets worse as a body closes in on
             something. Later in this lesson, where that matters, the exact
             difference is used instead.`,
      tip: 'The 2 is not important. The three letters and where they sit are.',
    },

    {
      type: 'predict',
      title: 'Now change the companion',
      body: `Put the distance back where it started and change the other thing
             instead. Commit before you measure.
             \n\nSuppose the Moon kept its orbit exactly but was twice as
             massive.`,
      prompt: 'At twice the mass and the same distance, the tide would be…',
      options: [
        'unchanged',
        'twice as strong',
        'four times as strong',
        'eight times as strong',
      ],
      answer: 1,
      because:
        'Twice as strong. Mass enters once, plainly: double it and the tide doubles. This is much less dramatic than the distance relationship, and that contrast is the point of the next few screens. Where a companion sits matters enormously more than how heavy it is.',
    },

    {
      type: 'measure',
      title: 'Three masses',
      body: `The distance is now held at the Moon’s real distance and the mass
             slider is yours. Set it to each value in turn and record what the
             panel reads.
             \n\nThree points are plenty here, because you are looking for a
             straight line and three points either make one or do not.`,
      fields: [
        { id: 'm1', label: 'Mass 1', unit: '× Moon’s', hint: '1' },
        {
          id: 's1',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '1',
        },
        { id: 'm2', label: 'Mass 2', unit: '× Moon’s', hint: '2' },
        {
          id: 's2',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '2',
        },
        { id: 'm3', label: 'Mass 3', unit: '× Moon’s', hint: '4' },
        {
          id: 's3',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '4',
        },
      ],
      validate: v => {
        const rows = [
          [v.m1, v.s1],
          [v.m2, v.s2],
          [v.m3, v.s3],
        ].filter(([m, s]) => Number.isFinite(m) && Number.isFinite(s));
        if (rows.length < 2) return null;
        if (rows.some(([m, s]) => m <= 0 || s <= 0)) {
          return {
            level: 'error',
            message: 'Masses and tidal strengths are both positive numbers.',
          };
        }
        const ratios = rows.map(([m, s]) => s / m);
        const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const spread = (Math.max(...ratios) - Math.min(...ratios)) / mean;
        if (spread > 0.25) {
          return {
            level: 'warn',
            message:
              'Stretch ÷ mass is not coming out the same for every row. Check that the distance slider stayed put while you changed the mass: moving both at once hides the relationship you are looking for.',
          };
        }
        return {
          level: 'ok',
          message: `Stretch ÷ mass is ${mean.toFixed(2)} for every row you filled in. A constant ratio is what a straight line through the corner looks like in a table.`,
        };
      },
      plot: {
        title: 'Your three readings',
        xLabel: 'companion mass  (× Moon’s)',
        yLabel: 'stretch  (× lunar tide)',
        height: 200,
        points: v => [
          { x: v.m1, y: v.s1, label: '1' },
          { x: v.m2, y: v.s2, label: '2' },
          { x: v.m3, y: v.s3, label: '3' },
        ],
        note: `No transformation offered this time, and none needed: if these
               three land on a straight line through the corner as they are,
               the relationship is as simple as a relationship gets.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 1, mass: 1 },
        hide: ['dist'],
        axis: 'mass',
        title: 'Read each mass here',
        note: 'Set the slider to 1, then 2, then 4 times the Moon’s mass. The distance is held at the Moon’s real distance.',
      },
      tip: 'If your three points make a straight line that goes through the corner of the graph rather than starting partway up an axis, the two quantities are simply proportional.',
    },

    {
      type: 'question',
      title: 'What the mass graph says',
      kind: 'choice',
      body: `Compare the two graphs you have now made. One of them bent away
             from the axis so steeply that it needed re-plotting before it would
             straighten. The other did not need anything.`,
      prompt: 'The tidal stretch a companion raises is…',
      options: [
        'proportional to its mass: double the mass, double the tide',
        'proportional to the square of its mass',
        'proportional to the cube of its mass, like the distance relationship',
        'independent of its mass once it is far enough away',
      ],
      answer: 0,
      because:
        'Simply proportional. Both relationships are now in your own numbers: one power of mass on top, three powers of distance underneath. Which is why the answer to "what raises the biggest tide" is almost never "the heaviest thing nearby".',
    },

    {
      type: 'predict',
      title: 'The Sun against the Moon',
      body: `Two bodies raise measurable tides on the Earth, and they are wildly
             mismatched.
             \n\nThe <strong>Sun</strong> is about 27 million times the Moon’s
             mass, and about 390 times further away.
             \n\nYou now know both relationships. One power of mass, three
             powers of distance. Work it out or guess it, but commit.`,
      prompt: 'The bigger ocean tide on Earth is raised by…',
      options: [
        'the Sun, by an enormous margin, because of its mass',
        'the Sun, but only slightly',
        'the Moon, by about a factor of two',
        'the Moon, by a factor of several hundred',
      ],
      answer: 2,
      because:
        'The Moon, by a bit more than two. The Sun brings 27 million times the mass, which helps it by a factor of 27 million. It is 390 times further away, which costs it 390 cubed, or about 59 million. The distance term wins, and it wins by roughly the factor of two you are about to see measured. This is the cleanest demonstration in astronomy that a tide is not the same thing as a pull: the Sun pulls the Earth about 180 times harder than the Moon does, and raises less than half the tide.',
    },

    {
      type: 'read',
      title: 'Seven real tides on one scale',
      body: `The panel lists seven real pairings, with the tide the first body
             raises on the second. They span fourteen powers of ten, so the bars
             are drawn on a scale where every gridline is ten times the one
             before: bar length counts zeros, not units.
             \n\nMove the highlight slider through them and read each one off.
             \n\n<strong>Moon and Sun on the Earth.</strong> Your prediction,
             measured: the Moon wins by 2.2. When the Sun and Moon line up, at
             new and full moon, the two tides add and you get the unusually
             large <em>spring</em> tides; when they are at right angles the
             solar tide partly cancels the lunar one and you get the small
             <em>neap</em> tides. Coastal tide tables are that sum, plus a great
             deal of local coastline.
             \n\n<strong>The Earth on the Moon.</strong> Same separation, other
             direction, and 22 times stronger, because the Earth is 81 times the
             Moon’s mass. Same physics, read backwards.
             \n\n<strong>Jupiter on Io.</strong> Five thousand times the lunar
             tide. Io is squeezed and released as its slightly non-circular
             orbit carries it in and out, and the friction from that kneading
             keeps its interior molten. It is the most volcanically active body
             in the Solar System, and it is heated by a difference in gravity.`,
      tool: {
        id: 'tide-compare',
        values: { which: 0 },
        title: 'Seven real tides',
        note: 'Slide the highlight through all seven. The bottom two are the same black hole at two different distances, which is the distance relationship doing its work again.',
      },
      tip: 'The last two rows differ only in separation: fifty times closer, and the tide is over a hundred thousand times larger. Fifty cubed is 125,000.',
    },

    {
      type: 'read',
      title: 'Locking, and what this simulation does not do',
      body: `You always see the same face of the Moon. That is not a
             coincidence and not a coincidence of viewing angle: the Moon turns
             on its axis exactly once per orbit. It is <strong>tidally
             locked</strong>.
             \n\nThe mechanism, in outline. The Earth raises a tidal bulge on
             the Moon, as you just measured. If the Moon spins at a rate other
             than its orbital rate, that bulge is dragged slightly out of line
             with the Earth, and the Earth’s pull on the misaligned bulge acts
             as a brake. The braking continues until the spin matches the orbit
             and the bulge sits still, at which point there is nothing left to
             drag. The same thing is happening to the Earth, more slowly: our
             day is lengthening by about 1.7 milliseconds per century, and the
             Moon is receding by 3.8 cm a year.
             \n\n<strong>An honest note about the model.</strong> This is a
             conceptual account, not something happening on your screen.
             Gravitas is a Newtonian N-body simulation: it moves point masses
             under mutual gravity. It does not deform bodies, does not model the
             internal friction that makes tidal braking work, and does not
             evolve rotation from tidal torques. Every tidal number in this
             lesson is computed from the positions and masses in the picture,
             which is legitimate, and the deformation you are shown is drawn
             rather than simulated. That distinction is worth keeping.`,
      tip: 'Tidal locking is the normal outcome, not the exception: most large moons in the Solar System are locked to their planets, and Pluto and Charon are locked to each other.',
    },

    {
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `Halfway. Before the lesson moves from tides that move water to
             tides that destroy things, put the core idea into a sentence of
             your own.`,
      prompt:
        'Why does the Earth have a high tide on the side facing away from the Moon? Answer in one or two sentences, and be careful about what is doing what to what.',
      rubric:
        'The far side is pulled toward the Moon more weakly than the Earth’s centre is, because it is further away. The whole planet is accelerated at the rate its centre feels, so relative to that shared motion the far side lags behind, producing a bulge pointing away from the Moon. Full credit requires the comparison with the centre, or an equivalent statement that a tide is a difference. Common wrong answers to watch for and not credit: that the Moon pushes the far side; that gravity reverses there; that the Earth’s rotation flings the water outward; that the water displaced from the near side has to go somewhere. Partial credit for "the far side is pulled less" without saying less than what.',
    },

    {
      type: 'predict',
      title: 'What holds a moon together?',
      body: `Everything so far has been about stretching. Nothing has broken.
             \n\nIf a tide pulls the two ends of a body in opposite directions,
             something must be resisting, or every moon in the Solar System
             would already have come apart. For a body of any decent size,
             what resists is the body’s own gravity: every part of it pulls on
             every other part, holding it in a ball.
             \n\nSo there are two accelerations at the surface of a moon,
             pointing opposite ways, and which one is bigger decides everything.`,
      prompt: 'A moon will be pulled apart by tides when…',
      options: [
        'the planet’s gravity at the moon exceeds the moon’s own surface gravity',
        'the tidal stretch across the moon exceeds the moon’s own surface gravity',
        'the moon’s orbital speed exceeds its escape speed',
        'the moon passes inside the planet’s atmosphere',
      ],
      answer: 1,
      because:
        'The stretch has to beat the grip. Note carefully what the first option compares: the planet’s pull on the moon is always vastly bigger than the moon’s own surface gravity, for every moon that exists, and none of them are coming apart. It is the pull on the moon that keeps it in orbit; it is the difference across the moon that tries to take it apart. The comparison that matters is the second one, and the next screen draws it as two bars.',
    },

    {
      type: 'explore',
      title: 'Stretch against grip',
      body: `The panel takes a body the size of the Moon and lets you walk it in
             toward the Earth. Two bars, measured at the body’s surface:
             \n\n<strong>Green</strong> is its own gravity, holding it together.
             It does not change as you move the body, because it depends only on
             the body itself.
             \n\n<strong>Red</strong> is the tidal stretch trying to pull its
             ends apart. It grows as one over the distance cubed, so it climbs
             very fast as you bring the body in.
             \n\nSomewhere the red bar catches the green one. Find it.
             \n\nThe Moon really sits at about sixty Earth radii, far off the
             right-hand end of this slider. You are bringing it in to somewhere
             it has never been.`,
      checklist: [
        'Start at 5 Earth radii and note that the green bar dwarfs the red one',
        'Bring the distance slider down slowly and watch only the red bar',
        'Find the distance where the two bars are the same length',
        'Read the verdict line, and the distance the panel reports underneath',
        'Press Comet ice and find the crossing point again',
        'Press Iron and find it a third time',
      ],
      tool: {
        id: 'tide-balance',
        values: { dist: 5, density: 3300 },
        title: 'Its own gravity, against the tide',
        note: 'Green is grip, red is stretch. The marker on the ruler at the bottom is where you have put the body; the tick is where the two become equal.',
      },
      tip: 'The green bar never moves when you change the distance, and the red bar never moves when you change the density. Each control drives exactly one bar, which makes the balance easy to reason about.',
    },

    {
      type: 'question',
      title: 'Where the balance tips',
      kind: 'numeric',
      body: `Set the density back to the Moon’s own, 3 300 kg/m³, and read the
             distance at which the two bars become equal. The panel reports it
             in Earth radii, on the line that says the two are equal.`,
      prompt:
        'For a body of the Moon’s density, the stretch equals the grip at a distance of about…',
      unit: 'Earth radii',
      answer: 1.5,
      tolerance: 0.2,
      because:
        'About 1.5 Earth radii from the Earth’s centre, or roughly 9,500 km, which is only about 3,100 km above the ground. That distance has a name: it is the <strong>Roche limit</strong>, after Édouard Roche, who worked it out in 1848. It is not a coincidence that it came out of a comparison you set up yourself: the Roche limit is defined by exactly that balance, and the textbook formula is nothing more than the algebra of setting those two bars equal to each other.',
      tool: {
        id: 'tide-balance',
        values: { dist: 3, density: 3300 },
        hide: ['density'],
        title: 'Read the crossing distance',
        note: 'The density is held at the Moon’s own for this question. Slide the distance until the two bars match, or just read the line that says where they are equal.',
      },
    },

    {
      type: 'read',
      title: 'The Roche limit, and why there are two of them',
      body: `The picture moves to Saturn, which is where this idea earns its
             keep. The moon you are moving is drawn at the distance your slider
             sets, and two arcs mark two different Roche limits.
             \n\nWhy two? Because a real body does not stay a perfect ball as
             the tide gets hold of it. It stretches, which puts its ends further
             apart, which gives the tide a longer lever, which stretches it
             more. A body with no strength at all, free to deform, therefore
             comes apart <em>further out</em> than a body that keeps its shape
             does. The outer arc is the no-strength limit; the inner one is the
             keeps-its-shape limit. Between them is a genuine grey band, not a
             rounding error.
             \n\nAnd now look at the rings. Saturn’s ring system ends abruptly
             at 136,780 km, and the innermost round moon, Mimas, orbits well
             outside that. Set the density to porous ice, which is what ring
             particles actually are, and compare the outer arc with where the
             rings stop. The rings sit inside the limit; the moons sit outside
             it. Saturn has a hundred thousand kilometres of debris where a moon
             cannot assemble, and a moon at the first distance where one can.`,
      tool: {
        id: 'roche-model',
        values: { dist: 3.2, density: 600 },
        title: 'A moon brought in toward Saturn',
        note: 'Distances are in Saturn radii. The readout gives both limits, the A ring’s outer edge, and Mimas, so you can compare all four numbers directly.',
      },
      tip: 'The drawing of a stretched or shattered moon is exactly that: a drawing of the outcome. Gravitas does not compute fluid flow, and nothing in this panel is a hydrodynamic simulation.',
    },

    {
      type: 'explore',
      title: 'Change what the moon is made of',
      body: `Leave the distance alone for a moment and change the material
             instead. Watch the two arcs move.
             \n\nThis is the point of the screen, and it is the thing most
             often got wrong: <strong>a Roche limit is not one distance.</strong>
             There is no radius around Saturn inside which everything shatters.
             There is a different limit for every body, and it depends on what
             that body is made of and on the mass of what it is falling toward.
             \n\nDenser bodies grip themselves harder for their size, so their
             limits sit closer in. Push the density high enough and the
             inner arc disappears inside Saturn itself, which is the honest
             answer that a dense enough body could orbit inside Saturn’s cloud
             tops without the tide troubling it at all.`,
      checklist: [
        'Press Porous ice and note where the outer arc sits',
        'Press Solid ice and watch both arcs move inward',
        'Press Rock, then Iron, and watch them keep moving inward',
        'Find a density at which the inner arc vanishes inside Saturn',
        'Put the density back to porous ice and bring the distance slider in until the moon comes apart',
      ],
      tool: {
        id: 'roche-model',
        values: { dist: 3.2, density: 600 },
        title: 'Same planet, different moons',
        note: 'Only the density is changing. Saturn’s mass is fixed and so is the moon’s size, and the arcs still move a long way.',
      },
      tip: 'The moon’s size does not appear in the answer at all. A 5 km icy chunk and a 500 km icy moon have the same Roche limit around Saturn, because making the body bigger increases the stretch and its own grip by the same factor.',
    },

    {
      type: 'question',
      title: 'Not one distance',
      kind: 'choice',
      body: `You have now moved the arcs around by changing one property of the
             infalling body, without touching the planet at all.`,
      prompt: 'A Roche limit is set by…',
      options: [
        'the mass of the planet alone, so it is a fixed radius around each planet',
        'the mass of the planet and the density of the body falling in',
        'the size of the body falling in, with bigger bodies breaking further out',
        'the orbital speed of the body falling in',
      ],
      answer: 1,
      because:
        'The planet’s mass and the infalling body’s density. Its size cancels out entirely, which surprises most people: doubling a moon’s radius doubles the stretch across it and also doubles its own surface gravity, so the balance is untouched. A single "the Roche limit of Saturn" is therefore an incomplete statement. It has to be the Roche limit of Saturn for something.',
    },

    {
      type: 'read',
      title: 'What a Roche limit does not tell you',
      body: `Four qualifications, because this is the idea in the lesson most
             likely to be over-applied.
             \n\n<strong>It is about self-gravity, not glue.</strong> The whole
             argument compares the tide against a body’s own gravity. Small
             bodies are held together mostly by material strength instead: a
             one-metre rock is not going to be pulled apart by Saturn at any
             distance, because the forces holding a rock together have nothing
             to do with its gravity. The limit applies to bodies big enough that
             gravity is what is holding them.
             \n\n<strong>Crossing it is not an explosion.</strong> Nothing
             detonates at a radius. A body brought inside its limit loses
             material from its ends first, and disruption takes time: a passage
             through, on an orbit that comes out again, may leave a body
             stretched and cracked rather than destroyed.
             \n\n<strong>Spin and shape matter.</strong> The two limits here
             bracket the real answer for a body that is round and not spinning
             fast. A rapidly rotating or elongated body behaves differently.
             \n\n<strong>Comet Shoemaker-Levy 9 is what it actually looks
             like.</strong> In July 1992 it passed about 40,000 km above
             Jupiter’s cloud tops, inside its Roche limit, and did not vanish.
             It came apart into a line of roughly twenty fragments, strung out
             along its orbit, which then hit Jupiter one after another in 1994.
             A string of pieces, not a puff of dust.`,
      tip: 'Rubble piles are the interesting case: many asteroids are loose aggregates held together by little more than their own gravity, and those really do behave the way this argument predicts.',
    },

    {
      type: 'explore',
      title: 'The extreme case, running live',
      body: `The simulation has switched to a scenario built around a
             supermassive black hole with stars and planets falling past it.
             Watch for a while. Bodies that pass close enough are stripped:
             material is pulled off them and drawn out into streams that wind
             around the hole.
             \n\n<strong>Read what you are seeing carefully.</strong> Gravitas
             moves point masses under Newtonian gravity. When a body passes
             inside a disruption radius the simulation sheds debris particles
             from it and lets those particles orbit on their own, which is a
             reasonable cartoon of tidal stripping and is not a calculation of
             it. There is no fluid in this model, no pressure, no shock heating,
             and no radiation. The stream you see is a plausible picture of the
             geometry, produced by a rule rather than by physics.
             \n\nWhat is real in the picture is the gravity: the orbits, the
             fact that closer passages do more damage, and the fact that the
             debris ends up on a spread of different orbits because different
             parts of the body were at different distances when it came apart.
             That last one is the same subtraction you started the lesson with.`,
      checklist: [
        'Watch one body make a close pass and follow what comes off it',
        'Notice that bodies passing further out are left alone',
        'Follow a debris stream and notice it spreads out along the orbit rather than staying in a clump',
        'Look for material that ends up bound to the hole and material that leaves',
      ],
      setup: TIDES_DISRUPTION,
      tip: 'Debris spreading along the orbit rather than falling in together is a real feature of tidal disruption: the near end of the object was on a slightly tighter orbit than the far end, so the pieces have slightly different periods.',
      probe: ctx => {
        const bodies = ctx.bodies || [];
        return [
          { label: 'Bodies being tracked', value: String(bodies.length) },
          {
            label: 'What is simulated',
            value: 'Newtonian gravity between point masses',
          },
          { label: 'What is not', value: 'Fluid flow, pressure, radiation' },
        ];
      },
    },

    {
      type: 'read',
      title: 'A star, and a black hole that is too big',
      body: `Finish with the extreme case, done properly with numbers instead of
             pictures.
             \n\nDrop a Sun-like star toward a black hole. Two distances matter.
             The <strong>tidal radius</strong> is where the stretch across the
             star beats the star’s own gravity: the same balance you found for
             the Moon, with the same arithmetic. The <strong>event
             horizon</strong> is where the star disappears from view for good.
             \n\nSlide the mass up from ten solar masses and watch the two
             circles close on each other. For a stellar-mass hole the star is
             shredded tens of thousands of horizon radii out. For Sagittarius A*
             at the centre of our galaxy it is still shredded outside, by a
             factor of about eleven, and astronomers do see the resulting
             flares. Keep going and the two meet at around 160 million solar
             masses, and beyond that the tidal radius is <em>inside</em> the
             horizon: the star crosses whole and there is nothing for anyone
             outside to see.
             \n\nThat is a real and slightly perverse result. The most massive
             black holes are the ones least able to tear a star apart where you
             could watch, because horizon size grows in proportion to mass while
             tidal radius grows only as the cube root of it.
             \n\n<strong>The approximation, stated.</strong> Both radii here are
             Newtonian estimates, and the tidal radius uses the same
             self-gravity balance as the rest of the lesson. Real tidal
             disruption events are hydrodynamic: the star is compressed as well
             as stretched, the debris shocks and radiates, and general
             relativity matters near the horizon. None of that is modelled here
             or anywhere in Gravitas. What survives the approximation is the
             comparison of two lengths, and that comparison is the reason the
             flares are seen where they are seen.`,
      tool: {
        id: 'tide-disrupt',
        values: { logm: 1 },
        title: 'Tidal radius against event horizon',
        note: 'The dashed circle is where the star comes apart; the filled disc is the horizon. Both are drawn on a scale that counts zeros, because at ten solar masses they differ by a factor of sixty thousand.',
      },
      tip: 'The three preset buttons take you to a stellar-mass hole, to Sagittarius A*, and to a billion-solar-mass giant where the star is swallowed whole.',
    },

    {
      type: 'question',
      title: 'The whole lesson in three sentences',
      kind: 'short',
      body: `You have gone from a beach to a black hole using one idea and two
             measured relationships. Write it down.`,
      prompt:
        'Explain what causes tides, what makes them stronger, and how they can destroy an object. Three sentences is plenty.',
      rubric:
        'Expect three components. (1) Tides are caused by gravity being unequal across an extended object: the difference between the pull at a point and the pull on the centre, not the strength of gravity itself. (2) They get stronger with the companion’s mass, in proportion, and far more sharply with decreasing separation, as one over separation cubed. (3) A body is destroyed when the tidal stretch across it exceeds its own surface gravity, which happens inside its Roche limit, and that limit depends on the two bodies involved rather than being one universal distance. Credit any correct statement of the inverse-cube relationship however phrased. Do not require a formula. Deduct for "tides are caused by strong gravity", for the far-side bulge being pushed or flung outward, or for a Roche limit described as a fixed radius around a planet.',
    },

    {
      type: 'read',
      title: 'What you worked out',
      body: `<strong>A tide is a difference.</strong> Not a pull. Take the pull
             on the centre away from the pull where you are, and what is left is
             what deforms things. It is the reason there are two bulges and not
             one, and the reason the far side bulges without anything pushing it.
             \n\n<strong>Distance dominates.</strong> One power of mass, three
             powers of separation. This is why the Moon beats the Sun, why the
             last two rows of the comparison chart differ by five orders of
             magnitude, and why tidal effects are usually irrelevant right up
             until they are catastrophic.
             \n\n<strong>Size matters too.</strong> A bigger object has ends
             further apart, so it feels a bigger difference. You feel essentially
             no tide. The Earth feels a few metres of one.
             \n\n<strong>Breaking is a competition.</strong> Stretch against the
             body’s own grip. Inside the Roche limit the stretch wins, and that
             limit is different for every pair of objects, because it depends on
             what is falling in as well as on what it is falling toward.
             \n\n<strong>Same mechanism, fourteen orders of magnitude.</strong>
             The sea coming up a beach, Io kept molten, the Moon showing one
             face, Saturn’s rings ending where they do, a comet strung out into
             fragments, and a star pulled into a stream. One subtraction.
             \n\nAnd one sentence to keep: <em>tides happen because gravity is
             not equally strong across an extended object; the difference grows
             sharply as objects get closer, and in extreme cases it overcomes
             the object’s own gravity and tears it apart.</em>`,
      tip: 'The next time you see a tide table, notice that it lists two highs and two lows per day, and that they are largest around new and full moon. Both of those are things you can now explain.',
    },
  ],
};

export default TIDES;
