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

/**
 * The bodies each half of this lesson is about, bound by exact name.
 *
 * The first half is the Earth and the Moon; the last four screens are a star
 * being pulled apart by a black hole. The hole carries whatever name the world
 * builder gave it, so it is bound by kind - there is exactly one, and matching
 * on the class is honest where matching on a random name would be luck.
 */
const EARTH_MOON = {
  earth: { name: 'Earth' },
  moon: { name: 'Luna' },
};

/** The disruption scene: one doomed star and the hole doing the pulling. */
const DISRUPTION = {
  star: { name: 'Doomed star' },
  hole: { kind: 'BlackHole' },
};

/**
 * The difference in pull across a body, measured on the live scene.
 *
 * The whole lesson is about one quantity, and until now it existed only inside
 * a panel diagram: a reader could see three arrows drawn for them but could
 * not check the claim against the two bodies actually on the canvas.
 *
 * This computes it from the live positions and masses - GM/r² at the near
 * side, at the center and at the far side of the selected body - and reports
 * the near and far differences. Those two are what makes two bulges rather
 * than one, and they are the numbers the arrows are a picture of.
 */
const tideRows = (
  ctx,
  { onRole = 'earth', byRole = 'moon', trueRatio = null } = {}
) => {
  const on = ctx.role(onRole);
  const by = ctx.role(byRole);
  if (!on || !by) {
    return [{ label: 'The pair', value: 'not both on the canvas' }];
  }
  const r = Math.hypot(by.pos.x - on.pos.x, by.pos.y - on.pos.y);
  const R = on.radius || 1;
  if (!(r > R)) return [{ label: 'The pair', value: 'too close to separate' }];
  const g = d => (ctx.G * by.mass) / (d * d);
  const center = g(r);
  const pct = d => `${((100 * (g(d) - center)) / center).toFixed(2)}%`;
  const rows = [
    {
      label: `Pull on ${on.name}, at its center`,
      value: center.toExponential(3),
    },
    { label: 'Near side, compared with the center', value: pct(r - R) },
    { label: 'Far side, compared with the center', value: pct(r + R) },
    {
      label: 'Measured across the body as drawn',
      value: `${on.name} is drawn ${((100 * R) / r).toFixed(1)}% of the way to ${by.name}`,
    },
  ];
  // The two percentages above are honest arithmetic on what is on screen, and
  // they are not the real numbers: this scenario draws the Earth far larger
  // than scale so that it is visible at all, and the difference in pull across
  // a body scales with its size. Quoting only the on-screen figure would teach
  // a tide about sixty times too strong, so the true one is printed beside it.
  if (trueRatio) {
    rows.push({
      label: 'The same subtraction at true scale',
      value: trueRatio,
      emphasis: true,
    });
  }
  rows.push({
    label: 'Which is why there are two bulges',
    value: 'the near side is pulled towards it, the far side is left behind',
  });
  return rows;
};

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

/** Rows of two fields: what the student set, then the stretch taken from the panel. */
const PAIRS = (rows, set, got, unit, setWant, gotWant, ids = ['d', 't']) =>
  rows.flatMap((n, i) => [
    { id: `${ids[0]}${n}`, label: `${set} ${n}`, unit, want: setWant[i] },
    {
      id: `${ids[1]}${n}`,
      label: `${got} ${n}`,
      unit: '× lunar tide',
      want: gotWant[i],
      source: { tool: 'stretch' },
    },
  ]);

/** The readings of a measuring step, as the evidence a reveal sets beside a prediction. */
const SHOWN = (step, [a, b], n) =>
  Array.from({ length: n }, (_, i) => [`${a}${i + 1}`, `${b}${i + 1}`])
    .flat()
    .map(field => ({ step, field }));

/** A step this lesson replaced, with its successor and what it asked. */
const WAS = (to, en, es) => ({ to, release: '3.1', was: { en, es } });

const TIDES = {
  id: 'tides',
  thumbnail: 'images/scenarios/earth-moon-system.webp',
  title: 'Tides',
  subtitle:
    'Stretch a world, move a moon, and discover why gravity can tear objects apart',
  duration: '40-50 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 4, section: '4.6' },
  courseLevel: 'survey',
  mathematics: 'logarithms',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['gravity', 'solar-system'],
  lock: { placement: true, inspector: true },
  retired: {
    'four-distances': WAS(
      'choose-four-distances',
      'Set the slider to 2, then 1, then 0.5, then 0.25 times the Moon’s distance and type each stretch beside its distance.',
      'Poner el deslizador en 2, luego 1, luego 0,5 y luego 0,25 veces la distancia de la Luna y escribir cada estiramiento junto a su distancia.'
    ),
    'how-steeply-does-it-fall': WAS(
      'the-factor-per-halving',
      'Read the factor the stretch rose by between 1.00 and 0.50 times the Moon’s distance in your table.',
      'Leer en tu tabla el factor en que subió el estiramiento entre 1,00 y 0,50 veces la distancia de la Luna.'
    ),
    'three-masses': WAS(
      'choose-three-masses',
      'Set the mass slider to 1, then 2, then 4 times the Moon’s mass and type each stretch beside its mass.',
      'Poner el deslizador de masa en 1, luego 2 y luego 4 veces la masa de la Luna y escribir cada estiramiento junto a su masa.'
    ),
    'where-the-balance-tips': WAS(
      'hunt-the-crossing',
      'For a body of the Moon’s density, read the distance in Earth radii where the stretch equals the grip.',
      'Para un cuerpo con la densidad de la Luna, leer la distancia, en radios terrestres, a la que el estiramiento iguala la sujeción.'
    ),
  },
  objectives: [
    'Explain why an extended object feels a different gravitational pull at each point in it',
    'State that a tide is the difference between the local pull and the pull on the center, and use that to say why there are two ocean bulges rather than one',
    'Measure how tidal strength changes with separation and with the mass of the companion, and state both relationships',
    'Compare the tide a body raises against that body’s own gravity, and predict whether it holds together',
    'Explain why a Roche limit is different for every pair of objects, and say what it does and does not predict',
  ],
  steps: [
    {
      sid: 'twice-a-day-everywhere',
      bind: EARTH_MOON,
      type: 'read',
      title: 'Twice a day, everywhere',
      body: `Stand on almost any coast and the sea comes in and goes out roughly
             twice a day. Not once. Twice.
             \n\nThat "twice" is the whole puzzle. The Moon is on one side of
             the Earth at a time, and the ocean bulges on <em>both</em> sides at
             once: there is a high tide under the Moon and another high tide on
             the opposite face of the planet, twelve thousand kilometers away
             from it. Any explanation that amounts to "the Moon pulls the water
             toward it" predicts one bulge and is therefore wrong.
             \n\nOn screen is the real Earth-Moon system: the Earth at the
             center and the Moon, <strong>Luna</strong>, on its 27.3 day orbit.
             The simulation is a straightforward Newtonian one, and that turns
             out to be all you need. Nothing in this investigation requires a force
             that is not already in that picture. What it requires is
             subtraction.`,
      tip: 'While an investigation is running, clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      time: { speed: 1, paused: true },
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
      sid: 'is-the-pull-the-same',
      bind: EARTH_MOON,
      type: 'predict',
      reveal: 'three-points-three-pulls',
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
        'only felt at the Earth’s center, where all the mass is treated as being',
      ],
      answer: 1,
      because:
        'Stronger on the near side. Gravity falls off with distance, and the near side really is closer, so it really is pulled harder. The last option is a genuinely useful half-truth: the Earth’s own gravity can be treated as coming from its center, and for working out the Earth’s orbit the Moon can be too. But the Earth is being pulled by something outside it, and for that the difference between one part of the Earth and another is the entire story.',
    },

    {
      sid: 'three-points-three-pulls',
      bind: EARTH_MOON,
      allowInspector: true,
      // The panel draws the arrows; this measures them, on the Earth and
      // Moon actually on the canvas. A reader can check the diagram against
      // the scene instead of taking it on trust.
      probe: ctx =>
        tideRows(ctx, {
          trueRatio:
            'the real Earth is 1.66% of the way to the Moon, so the near side feels about 3.3% more pull than the center and the far side about 3.3% less',
        }),
      type: 'read',
      title: 'Three points, three pulls',
      body: `The panel shows the Earth with an arrow leaving three places on it:
             the <strong>near side</strong>, the <strong>center</strong>, and
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
      sid: 'how-different-are-they',
      bind: EARTH_MOON,
      type: 'question',
      title: 'How different are they?',
      kind: 'choice',
      body: `Read the three accelerations off the panel on the previous screen,
             or set the distance back to 1.00 here and read them again. The near
             side is pulled hardest, the far side least, and the center sits
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
        'About seven percent. That is a tiny difference, and it is the entire cause of every ocean tide on Earth. Hold on to how small it is: a seven percent variation in a pull that is itself only about a three-hundred-thousandth of the Earth’s own surface gravity. Tides are a small residue of a small quantity, which is why the seas move a few meters rather than being ripped off the planet.',
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        title: 'Read the three numbers again',
        note: 'Near side, center, far side. The last row does the comparison for you.',
      },
    },
    {
      sid: 'so-why-two-bulges',
      bind: EARTH_MOON,
      type: 'predict',
      reveal: 'take-the-center-away',
      title: 'So why two bulges?',
      body: `Everything you have seen so far points one way: toward the Moon.
             The near side is pulled toward the Moon, the center is pulled
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
      misconceptions: [
        {
          id: 'pushed',
          option: 0,
          say: 'Nothing pushes the far side. The Moon’s gravity only ever pulls: the far side is pulled toward the Moon like everything else, just less than the Earth as a whole.',
        },
        {
          id: 'spin',
          option: 1,
          say: 'The spin does not make the bulges: an Earth that did not rotate would still have both, and the spin only carries you through them. The cause is the Moon’s pull, taken as a difference.',
        },
        {
          id: 'displaced',
          option: 3,
          say: 'The far-side bulge is not near-side water that went somewhere else. It is raised by the same subtraction as the near-side one, so both exist at once.',
        },
      ],
      because:
        'The far side is left behind. Nobody pushes it: it is pulled toward the Moon like everything else, just less than average, so relative to the Earth as a whole it lags on the far side. That is the answer, and the next screen shows the arithmetic that produces it. The spin option is a common and stubborn story, and it is worth being clear that it is not the cause: the two bulges are there for a non-rotating Earth too, and the Earth’s rotation is what carries you through them twice a day rather than what creates them.',
    },

    {
      sid: 'take-the-center-away',
      bind: EARTH_MOON,
      allowInspector: true,
      // The panel draws the arrows; this measures them, on the Earth and
      // Moon actually on the canvas. A reader can check the diagram against
      // the scene instead of taking it on trust.
      probe: ctx =>
        tideRows(ctx, {
          trueRatio:
            'the real Earth is 1.66% of the way to the Moon, so the near side feels about 3.3% more pull than the center and the far side about 3.3% less',
        }),
      type: 'read',
      title: 'Take the center away',
      body: `Here is the move that makes tides make sense.
             \n\nThe Earth as a whole is in free fall around the Earth-Moon
             center of mass. It accelerates at whatever rate the pull on its
             <em>center</em> dictates, and it carries everything on it along at
             that rate: you, the seas, the rocks. What you can feel is not the
             pull. It is the difference between the pull where you are and the
             pull the whole planet is being carried along by.
             \n\nSo subtract the center’s pull from all three. The panel now
             shows both rows: the raw pulls on top, and underneath what is left
             after the subtraction.
             \n\n<strong>Near side:</strong> pulled harder than average, so what
             is left points toward the Moon.
             \n\n<strong>Center:</strong> exactly average, so nothing is left. A
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
        title: 'The pulls, and what is left after the center is taken away',
        note: 'The bottom row is drawn far larger than the top row, and the panel says by how much. Drawn to the same scale it would be invisible, which is exactly why the subtraction has to be done rather than looked at.',
      },
      tip: 'Nothing new has been added between the two rows. The bottom row is the top row minus one number.',
    },

    {
      sid: 'what-the-far-side-arrow',
      canvas: 'quiet',
      type: 'question',
      title: 'What the far-side arrow means',
      kind: 'choice',
      body: `On the bottom row, the far-side arrow points away from the Moon.
             That is the thing most worth getting right in this entire investigation,
             so it is worth stating carefully.`,
      prompt: 'The outward-pointing far-side arrow means that…',
      options: [
        'gravity from the Moon reverses direction on the far side of the Earth',
        'the far side is still pulled toward the Moon, but less than the Earth’s center is',
        'a second force, separate from gravity, acts on the far side',
        'the far side is beyond the Moon’s reach',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'reverses',
          option: 0,
          say: 'The Moon’s pull still points toward the Moon at the far side. What points away is what is left after the motion the whole Earth shares has been taken out.',
        },
        {
          id: 'second-force',
          option: 2,
          say: 'There is no second force: both rows come from the Moon’s gravity alone, and the lower row is the upper row with one number subtracted.',
        },
        {
          id: 'out-of-reach',
          option: 3,
          say: 'Gravity has no edge. The far side is pulled by the Moon, a little less strongly than the center is.',
        },
      ],
      because:
        'Still pulled toward the Moon, just less than average. Gravity never reverses and never switches off; there is no second force. The outward arrow is a bookkeeping result, not a push: it is what is left over after you subtract the acceleration the whole planet shares. If you insist on describing tides without subtracting the center, you are stuck with one bulge and a coastline that disagrees with you twice a day.',
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
      sid: 'what-a-tide-actually-is',
      type: 'read',
      title: 'What a tide actually is',
      body: `A definition worth memorizing, because it is short and it is the
             whole subject:
             \n\n<strong>A tide is the difference in gravitational acceleration
             across an object.</strong>
             \n\nNot the strength of gravity. The <em>difference</em> in it.
             This distinction does real work: strong gravity and strong tides
             are not the same thing, and later you will test a case where they
             come apart.
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
      sid: 'bring-the-companion-closer',
      type: 'predict',
      reveal: 'the-factor-per-halving',
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
      sid: 'choose-four-distances',
      type: 'measure',
      title: 'Four distances of your own',
      body: `The panel reports the tidal stretch as a multiple of the real lunar
             tide, so the real Moon reads 1.00 and everything else is measured
             against it.
             \n\nChoose four distances of your own, two of them at least four
             times apart, and leave the companion’s mass alone. For each one,
             set the slider, press <strong>Take reading</strong> beside the
             stretch, and type the distance you set. Your points land on the
             graph as you record them.`,
      fields: PAIRS(
        [1, 2, 3, 4],
        'Distance',
        'Stretch at distance',
        '× Moon’s',
        ['2', '1', '0.5', '0.25'],
        ['0.13', '1', '8', '64']
      ),
      validate: (v, _ctx, got = {}) => {
        const rows = [
          [v.d1, v.t1, 1],
          [v.d2, v.t2, 2],
          [v.d3, v.t3, 3],
          [v.d4, v.t4, 4],
        ].filter(([d, t]) => Number.isFinite(d) && Number.isFinite(t));
        if (rows.length < 2) return null;
        if (rows.some(([d, t]) => d <= 0 || t <= 0)) {
          return {
            level: 'error',
            message: 'Distances and tidal strengths are both positive numbers.',
          };
        }
        const moved = rows.find(([d, , i]) => {
          const at = got[`t${i}`]?.s?.dist;
          return Number.isFinite(at) && Math.abs(at - d) > 0.005;
        });
        if (moved) {
          return {
            level: 'warn',
            message: `Row ${moved[2]} has a distance that is not where the slider was when you took its reading. Type the distance you set, or take the reading again.`,
          };
        }
        if (rows.some(([d, t]) => rows.some(([e, u]) => d < e && t < u))) {
          return {
            level: 'warn',
            message:
              'A nearer companion raises a bigger tide, and two of your rows say the opposite. The near and far readings look swapped: check each stretch against the distance beside it.',
          };
        }
        const products = rows.map(([d, t]) => t * d * d * d);
        const off = products.filter(p => Math.abs(p - 1) > 0.12).length;
        if (off) {
          const mean = products.reduce((a, b) => a + b, 0) / products.length;
          const spread = (Math.max(...products) - Math.min(...products)) / mean;
          return {
            level: 'warn',
            message:
              spread < 0.12
                ? 'Your rows agree with each other but not with the panel. Leave the mass at the Moon’s and read each stretch at the distance beside it.'
                : 'These do not all sit on one relationship. The usual cause is a stretch read at a different distance from the one beside it: check each row against the slider position that produced it.',
          };
        }
        if (rows.length < 4) return null;
        const ds = rows.map(([d]) => d);
        if (new Set(ds).size < 4) {
          return {
            level: 'warn',
            message: 'Two of your distances are the same. Choose four.',
          };
        }
        const span = Math.max(...ds) / Math.min(...ds);
        if (span < 4) {
          return {
            level: 'warn',
            message: `Your distances span less than a factor of four. Spread them wider, so that one is at least four times another and the curve has room to show its shape.`,
          };
        }
        return {
          level: 'ok',
          message: `Four distances spread over a factor of four or more, each stretch read where you said. Look at the shape of the graph: the next step asks what halving the distance does to the stretch.`,
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
        note: `Raw, the points climb away from the axis as the distance
               shrinks. Look at how the curve bends: the next question asks
               what happens to the stretch each time the distance is halved.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'Read each distance here',
        note: 'The slider runs from 0.2 to 2 times the Moon’s distance. The companion’s mass is held at the Moon’s.',
      },
      tip: 'Any four distances will do, so long as each stretch was read at the distance beside it and they are spread out.',
    },

    {
      hints: [
        'An ordinary inverse-square pull rises by the square of the distance factor. A tide depends on how fast the pull changes across a body.',
        'Find two of your distances where one is half the other, and divide the larger stretch by the smaller.',
      ],
      feedback: {
        close:
          'Close. Take two of your own distances where one is half the other, and divide the larger stretch by the smaller.',
        off: 'Find a pair of distances where one is half the other, in your table or on the panel, and divide the stretch at the nearer one by the stretch at the farther one.',
      },
      misconceptions: [
        {
          id: 'inverse-square',
          equals: 4,
          say: 'That is what an ordinary pull would do when the distance is halved. A tide is a difference between pulls, and it grows by more. Read your own two stretches.',
        },
        {
          id: 'wrong-way',
          equals: 0.125,
          say: 'Halving the distance makes the tide stronger, so the factor is larger than one. Divide the stretch at the nearer distance by the stretch at the farther one, not the other way round.',
        },
      ],
      sid: 'the-factor-per-halving',
      type: 'question',
      title: 'The factor per halving',
      kind: 'numeric',
      body: `Look at your own table and graph. Each time the distance is halved,
             the stretch is multiplied by a factor. Find it from your readings:
             take two of your distances where one is half the other. If your
             table has no such pair, set the slider to one on the panel and
             read the two stretches there.
             \n\nAn ordinary inverse-square pull would go up by four. A tide is
             not an ordinary pull.`,
      prompt:
        'By what factor does the tidal stretch increase each time the distance is halved?',
      unit: '×',
      answer: 8,
      tolerance: 0.6,
      evidence: SHOWN('choose-four-distances', 'dt', 4),
      compare:
        'Set the factor your readings give for a halving beside the one you predicted.',
      because:
        'Eight, which is two cubed: every halving of the distance multiplies the tide by eight again, whichever distances you started from. Distance enters three times over, not twice: the tide goes as one divided by the separation cubed. That is why the transformed plot straightens, and it is why tidal effects are almost always negligible until something gets close, and then suddenly are not.',
      tool: {
        id: 'tide-strength',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'The curve you measured',
        note: 'The dot is your slider. Use it to read a pair of distances, one half the other, if your table has none.',
      },
    },

    {
      sid: 'pick-a-new-distance',
      type: 'measure',
      title: 'Pick a distance you have not used',
      body: `A relationship earns its keep by predicting something you have not
             measured. Choose a distance between 0.2 and 2 times the Moon’s
             that is not one of your four, and not close to one of them.
             \n\nRecord it here, and do not set the slider there yet. The next
             step asks for your estimate of the stretch first.`,
      fields: [
        { id: 'd5', label: 'The new distance', unit: '× Moon’s', want: '0.7' },
        {
          id: 'gap',
          label: 'Your nearest earlier distance is this far away',
          unit: '× Moon’s',
          compute: (v, earlier) => {
            const used = ['d1', 'd2', 'd3', 'd4']
              .map(f => earlier?.('choose-four-distances', f))
              .filter(Number.isFinite);
            return used.length && Number.isFinite(v.d5)
              ? Math.min(...used.map(u => Math.abs(u - v.d5)))
              : NaN;
          },
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.d5)) return null;
        if (v.d5 < 0.2 || v.d5 > 2) {
          return {
            level: 'warn',
            message:
              'The slider runs from 0.2 to 2 times the Moon’s distance. Choose a distance in that range.',
          };
        }
        if (Math.abs(v.d5 / 0.05 - Math.round(v.d5 / 0.05)) > 0.001) {
          return {
            level: 'warn',
            message:
              'The slider moves in steps of 0.05, so choose a distance it can be set to exactly, a multiple of 0.05.',
          };
        }
        if (Number.isFinite(v.gap) && v.gap < 0.05) {
          return {
            level: 'warn',
            message:
              'That is within a few hundredths of a distance you already used, so reading the panel there would prove little. Choose a distance in a gap between two of yours.',
          };
        }
        return {
          level: 'ok',
          message:
            'A distance you have not used. Hold on to it: the next step asks what the stretch will be there.',
        };
      },
    },

    {
      sid: 'estimate-the-new-stretch',
      type: 'predict',
      kind: 'estimate',
      unit: '× lunar tide',
      reveal: 'the-estimate-and-the-reading',
      title: 'Estimate the stretch there',
      body: `Look back at your four readings and the curve they make. Without
             setting the slider to the new distance, estimate the stretch there
             as a multiple of the real lunar tide.
             \n\nCommit to a number. It stays unmarked until you have read the
             panel.`,
      prompt: 'The stretch at the distance you chose will be about',
    },

    {
      sid: 'read-the-new-distance',
      type: 'measure',
      title: 'Read the panel at your new distance',
      body: `Set the slider to the distance you chose, press <strong>Take
             reading</strong> beside the stretch, and compare it with your
             estimate below. Leave the companion’s mass alone.`,
      fields: [
        {
          id: 'd5r',
          label: 'The distance you chose',
          unit: '× Moon’s',
          compute: (v, earlier) =>
            earlier?.('pick-a-new-distance', 'd5') ?? NaN,
          decimals: 2,
        },
        {
          id: 't5',
          label: 'Stretch at that distance',
          unit: '× lunar tide',
          want: '2.9',
          source: { tool: 'stretch' },
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.t5)) return null;
        if (!Number.isFinite(v.d5r)) {
          return {
            level: 'warn',
            message:
              'Record the distance you chose on the earlier step, then read the panel at it.',
          };
        }
        if (Math.abs(v.t5 * v.d5r ** 3 - 1) > 0.12) {
          return {
            level: 'warn',
            message:
              'That stretch does not belong to the distance you chose. Set the slider to your distance, read the stretch there, and take the reading again.',
          };
        }
        return {
          level: 'ok',
          message:
            'Read at the distance you chose. Your estimate is set beside it below.',
        };
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 1.35, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'Read the stretch at your distance',
        note: 'Set the slider to the distance you chose, and leave the companion’s mass at the Moon’s.',
      },
    },

    {
      sid: 'the-estimate-and-the-reading',
      type: 'read',
      title: 'Your estimate and the panel',
      body: `Your estimate and the stretch you read are below, at the distance
             you chose.`,
      evidence: [
        { step: 'read-the-new-distance', field: 't5' },
        { step: 'read-the-new-distance', field: 'd5r' },
      ],
      compare:
        'Set your estimate beside the stretch the panel gave, and say which of your four readings you leaned on.',
    },

    {
      sid: 'now-change-the-companion',
      type: 'predict',
      reveal: 'the-relationship-written-down',
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
      sid: 'choose-three-masses',
      type: 'measure',
      title: 'Three masses of your own',
      body: `This time the distance is held at the Moon’s real distance, and
             only the mass changes. The slider is yours.
             \n\nChoose three masses of your own, spread far enough apart that
             the stretch visibly changes. For each one, set the slider, press
             <strong>Take reading</strong> beside the stretch, and type the mass
             you set. Three points are plenty, because you are looking for a
             straight line and three points either make one or do not.`,
      fields: PAIRS(
        [1, 2, 3],
        'Mass',
        'Stretch at mass',
        '× Moon’s',
        ['1', '2', '4'],
        ['1', '2', '4'],
        ['m', 's']
      ),
      validate: (v, _ctx, got = {}) => {
        const rows = [
          [v.m1, v.s1, 1],
          [v.m2, v.s2, 2],
          [v.m3, v.s3, 3],
        ].filter(([m, s]) => Number.isFinite(m) && Number.isFinite(s));
        if (rows.length < 2) return null;
        if (rows.some(([m, s]) => m <= 0 || s <= 0)) {
          return {
            level: 'error',
            message: 'Masses and tidal strengths are both positive numbers.',
          };
        }
        const moved = rows.find(([m, , i]) => {
          const at = got[`s${i}`]?.s?.mass;
          return Number.isFinite(at) && Math.abs(at - m) > 0.005;
        });
        if (moved) {
          return {
            level: 'warn',
            message: `Row ${moved[2]} has a mass that is not where the slider was when you took its reading. Type the mass you set, or take the reading again.`,
          };
        }
        // The distance is held at the Moon’s, so each stretch ÷ mass is one.
        const ratios = rows.map(([m, s]) => s / m);
        if (ratios.some(r => Math.abs(r - 1) > 0.12)) {
          const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
          const spread = (Math.max(...ratios) - Math.min(...ratios)) / mean;
          return {
            level: 'warn',
            message:
              spread < 0.12
                ? 'Your rows agree with each other but not with the panel. Leave the distance at the Moon’s and read each stretch at the mass beside it.'
                : 'Stretch ÷ mass is not coming out the same for every row. Check that the distance slider stayed put while you changed the mass: moving both at once hides the relationship you are looking for.',
          };
        }
        if (rows.length < 3) return null;
        const ms = rows.map(([m]) => m);
        const span = Math.max(...ms) / Math.min(...ms);
        if (new Set(ms).size < 3 || span < 2) {
          return {
            level: 'warn',
            message:
              'Your masses are too close together for a line to show. Choose three that differ by at least a factor of two from the smallest to the largest.',
          };
        }
        return {
          level: 'ok',
          message: `Three masses held at one distance. Stretch ÷ mass comes out the same for every row: a constant ratio is what a straight line through the corner looks like in a table.`,
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
        note: `No transformation is needed: if these three land on a straight
               line through the corner as they are, the relationship is as
               simple as a relationship gets.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 1, mass: 1 },
        hide: ['dist'],
        axis: 'mass',
        title: 'Read each mass here',
        note: 'The mass slider runs from a quarter of the Moon’s to four times it. The distance is held at the Moon’s real distance.',
      },
      tip: 'If your three points make a straight line that goes through the corner of the graph rather than starting partway up an axis, the two quantities are simply proportional.',
    },

    {
      sid: 'what-the-mass-graph-says',
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
      sid: 'the-relationship-written-down',
      type: 'read',
      title: 'The relationship, written down',
      body: `You have measured both, so here it is in symbols. You are not being
             asked to derive it or to calculate with it, only to recognize the
             three things in it.
             \n\nFor a body of radius <em>R</em> sitting a distance <em>d</em>
             from a companion of mass <em>M</em>, the tidal stretch across it is
             about
             \n\n<strong>2 G M R ÷ d³</strong>
             \n\nRead it as three statements you already believe:
             \n\n<strong>M on top.</strong> A heavier companion stretches you
             harder, in proportion: the straight line you drew.
             \n\n<strong>R on top.</strong> A bigger object gets stretched
             harder, because its two ends are further apart and so differ more.
             A pebble feels essentially no tide at all.
             \n\n<strong>d³ underneath.</strong> The cube you found.
             Distance matters far more than anything else in the expression.
             \n\nOne honest caveat: this is an approximation, good when the
             object is small compared with its distance. It is excellent for the
             Moon on the Earth, and it gets worse as a body closes in on
             something. The first panel in this investigation used the exact
             difference; the balance and breakup panels later on use this
             approximation, so read their distances as good estimates.`,
      tip: 'The 2 is not important. The three letters and where they sit are.',
      evidence: SHOWN('choose-three-masses', 'ms', 3),
      compare:
        'Divide each of your stretches by its mass: if the answer is the same every time, mass appears once.',
    },

    {
      sid: 'the-sun-against-the-moon',
      type: 'predict',
      reveal: 'seven-real-tides-on-one',
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
      sid: 'seven-real-tides-on-one',
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
      sid: 'locking-and-what-this-simulation',
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
             investigation is computed from the positions and masses in the picture,
             which is legitimate, and the deformation you are shown is drawn
             rather than simulated. That distinction is worth keeping.`,
      tip: 'Tidal locking is the normal outcome, not the exception: most large moons in the Solar System are locked to their planets, and Pluto and Charon are locked to each other.',
    },

    {
      sid: 'say-it-in-your-own',
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `Halfway. Before the investigation moves from tides that move water to
             tides that destroy things, put the core idea into a sentence of
             your own.`,
      prompt:
        'Why does the Earth have a high tide on the side facing away from the Moon? Answer in one or two sentences, and be careful about what is doing what to what.',
      rubric:
        'The far side is pulled toward the Moon more weakly than the Earth’s center is, because it is further away. The whole planet is accelerated at the rate its center feels, so relative to that shared motion the far side lags behind, producing a bulge pointing away from the Moon. Full credit requires the comparison with the center, or an equivalent statement that a tide is a difference. Common wrong answers to watch for and not credit: that the Moon pushes the far side; that gravity reverses there; that the Earth’s rotation flings the water outward; that the water displaced from the near side has to go somewhere. Partial credit for "the far side is pulled less" without saying less than what.',
    },

    {
      sid: 'what-holds-a-moon-together',
      type: 'predict',
      reveal: 'stretch-against-grip',
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
      sid: 'stretch-against-grip',
      type: 'explore',
      title: 'Stretch against grip',
      body: `The panel takes a body the size of the Moon, with the Moon’s own
             density, and lets you walk it in toward the Earth. Two bars,
             measured at the body’s surface:
             \n\n<strong>Green</strong> is its own gravity, holding it together.
             It does not change as you move the body, because it depends only on
             the body itself.
             \n\n<strong>Red</strong> is the tidal stretch trying to pull its
             ends apart. It grows as one over the distance cubed, so it climbs
             very fast as you bring the body in.
             \n\nSomewhere the red bar catches the green one. Find it by moving
             the body, and watch what the verdict line does as you cross it.
             \n\nThe Moon really sits at about sixty Earth radii, far off the
             right-hand end of this slider. You are bringing it in to somewhere
             it has never been.`,
      checklist: [
        'Start at 5 Earth radii and note that the green bar dwarfs the red one',
        'Bring the distance slider down slowly and watch only the red bar',
        'Stop where the two bars are the same length, and notice what the verdict line says there',
      ],
      tool: {
        id: 'tide-balance',
        values: { dist: 5, density: 3300 },
        hide: ['density'],
        hunt: true,
        title: 'Its own gravity, against the tide',
        note: 'Green is grip, red is stretch. The marker on the ruler at the bottom is where you have put the body. The density is held at the Moon’s own.',
      },
      tip: 'The green bar never moves when you change the distance: it depends only on the body, not on where it is.',
    },

    {
      sid: 'a-denser-body-closer-in',
      type: 'predict',
      reveal: 'how-density-moved-it',
      title: 'A denser body, closer in?',
      body: `You have found where the tide catches a body with the Moon’s
             density. Now change what the body is made of. Comet ice is a
             loose, porous snowball; iron is about as dense as a solid body
             gets.
             \n\nCommit before you move anything.`,
      prompt:
        'Compared with comet ice, a body made of solid iron will be pulled apart…',
      options: [
        'closer to the planet, because it holds itself together harder for its size',
        'at the same distance, because the planet alone decides where tides win',
        'farther from the planet, because it has more mass for the planet to pull on',
        'at the same distance, because the two bodies are the same size',
      ],
      answer: 0,
      because:
        'Closer in. A denser body of the same size has more gravity at its surface, so the tide has to grow stronger, and that means getting nearer, before it wins. The planet’s mass is the same in every case; what changes is what is falling toward it.',
    },

    {
      sid: 'hunt-the-crossing',
      type: 'measure',
      title: 'Hunt the crossing for two bodies',
      body: `Press <strong>Comet ice</strong>. Bring the distance down until the
             red and green bars are the same height, and record the distance in
             Earth radii. Then press <strong>Iron</strong> and find the crossing
             again.
             \n\nThe panel does not print where the bars meet this time. You
             find it by moving the slider, and the ratio of stretch to grip is
             one at the crossing.`,
      fields: [
        {
          id: 'ice',
          label: 'Crossing for comet ice',
          unit: 'Earth radii',
          want: '2.64',
        },
        {
          id: 'iron',
          label: 'Crossing for iron',
          unit: 'Earth radii',
          want: '1.22',
        },
      ],
      validate: v => {
        if (![v.ice, v.iron].every(Number.isFinite)) return null;
        // The panel’s balance in Earth radii; its slider moves in 0.05.
        const cross = rho => 2 ** (1 / 3) * Math.cbrt(5514 / rho);
        if (v.iron >= v.ice) {
          return {
            level: 'warn',
            message:
              'The two distances look swapped between the bodies. Check which density each one was found at.',
          };
        }
        if (Math.abs(v.ice - cross(600)) > 0.12) {
          return {
            level: 'warn',
            message:
              'The bars are not the same height at that distance for comet ice. Press Comet ice and move the slider until red and green match.',
          };
        }
        if (Math.abs(v.iron - cross(6000)) > 0.12) {
          return {
            level: 'warn',
            message:
              'The bars are not the same height at that distance for iron. Press Iron and move the slider until red and green match.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two crossings, each found by moving the bars. The next step sets them beside your prediction.',
        };
      },
      tool: {
        id: 'tide-balance',
        values: { dist: 5, density: 3300 },
        hunt: true,
        title: 'Where the stretch catches the grip',
        note: 'Distances are in Earth radii from the Earth’s center. The three buttons set the density; the sliders are yours.',
      },
      tip: 'The red bar never moves when you change the density, and the green bar never moves when you change the distance. Each control drives exactly one bar.',
    },

    {
      sid: 'how-density-moved-it',
      type: 'question',
      title: 'What density did',
      kind: 'short',
      body: `Your two crossings are below, beside what you predicted.
             \n\nThe distance where a body’s own gravity equals the tide across
             it has a name: the <strong>Roche limit</strong>, after Édouard
             Roche, who worked it out in 1848. This balance gives the
             rigid-body Roche limit, and its textbook formula is the algebra of
             setting the two bars equal.
             \n\nThe size of the body does not enter the balance, so the iron
             crossing describes a small iron body. A body as large as the Moon
             could not get there at all: it would touch the Earth at 1.27 Earth
             radii, before the bars met at 1.22.`,
      prompt:
        'In one sentence, say how the density of the body moved the distance where the tide catches it, and why.',
      rubric:
        'The denser body is caught closer in. A denser body grips itself harder for its size, so the tide must grow stronger, which means getting nearer, before the stretch equals the grip. Full credit needs the direction and a reason from the body’s own gravity against the tide. Partial credit for the direction alone. Do not credit "denser bodies are heavier, so the planet pulls them harder" or size as the cause: size cancels.',
      evidence: [
        { step: 'hunt-the-crossing', field: 'ice' },
        { step: 'hunt-the-crossing', field: 'iron' },
      ],
      compare:
        'Set your prediction beside the two distances you found, and say what the denser body’s grip did to the crossing.',
    },

    {
      sid: 'the-roche-limit-and-why',
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
             keeps-its-shape limit. Between them is a genuine gray band, not a
             rounding error.
             \n\nAnd now look at the rings. Saturn’s ring system ends abruptly
             at 136,780 km, and the innermost round moon, Mimas, orbits well
             outside that. Set the density to porous ice, which is what ring
             particles actually are, and compare the outer arc with where the
             rings stop. The rings sit inside the limit; the moons sit outside
             it. Saturn has a hundred thousand kilometers of debris where a moon
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
      sid: 'change-what-the-moon-is',
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
      sid: 'not-one-distance',
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
      misconceptions: [
        {
          id: 'fixed-radius',
          option: 0,
          say: 'A planet does not have one limit. Two bodies of different density come apart at different distances from the same planet, as the arcs you moved showed.',
        },
        {
          id: 'bigger-breaks-sooner',
          option: 2,
          say: 'Size cancels. Doubling a body’s radius doubles the stretch across it and also doubles its own gravity at the surface, so the balance does not move.',
        },
        {
          id: 'orbital-speed',
          option: 3,
          say: 'Orbital speed does not decide where the tide wins; the comparison is the stretch against the body’s own gravity.',
        },
      ],
      because:
        'The planet’s mass and the infalling body’s density. Its size cancels out entirely, which surprises most people: doubling a moon’s radius doubles the stretch across it and also doubles its own surface gravity, so the balance is untouched. A single "the Roche limit of Saturn" is therefore an incomplete statement. It has to be the Roche limit of Saturn for something.',
    },

    {
      sid: 'what-a-roche-limit-does',
      type: 'read',
      title: 'What a Roche limit does not tell you',
      body: `Four qualifications, because this is the idea in the investigation most
             likely to be over-applied.
             \n\n<strong>It is about self-gravity, not glue.</strong> The whole
             argument compares the tide against a body’s own gravity. Small
             bodies are held together mostly by material strength instead: a
             one-meter rock is not going to be pulled apart by Saturn at any
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
      sid: 'the-extreme-case-running-live',
      canvas: 'scene',
      bind: DISRUPTION,
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
             That last one is the same subtraction you started the investigation with.
             \n\nThe readout below is that subtraction, on this scene: the pull
             of the hole at the near side of the doomed star, at its center and
             at its far side. Watch the difference grow as the star falls in.
             That difference is what tears it apart, and it is the only part of
             the disruption this simulation actually computes.`,
      allowInspector: true,
      checklist: [
        'Watch one body make a close pass and follow what comes off it',
        'Notice that bodies passing further out are left alone',
        'Follow a debris stream and notice it spreads out along the orbit rather than staying in a clump',
        'Look for material that ends up bound to the hole and material that leaves',
      ],
      time: { speed: 0.5, paused: false },
      setup: TIDES_DISRUPTION,
      tip: 'Debris spreading along the orbit rather than falling in together is a real feature of tidal disruption: the near end of the object was on a slightly tighter orbit than the far end, so the pieces have slightly different periods.',
      // The differential pull first, then what the model does and does not
      // compute. Merged into one probe: two `probe` keys in one object mean
      // the later one silently wins, and the measurement would vanish.
      probe: ctx => {
        const bodies = ctx.bodies || [];
        return [
          ...tideRows(ctx, { onRole: 'star', byRole: 'hole' }),
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
      sid: 'a-star-and-a-black',
      bind: DISRUPTION,
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
             at the center of our galaxy it is still shredded outside, by a
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
             self-gravity balance as the rest of the investigation. Real tidal
             disruption events are hydrodynamic: the star is compressed as well
             as stretched, the debris shocks and radiates, and general
             relativity matters near the horizon. None of that is modeled here
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
      sid: 'the-whole-lesson-in-three',
      bind: DISRUPTION,
      type: 'question',
      title: 'The whole investigation in three sentences',
      kind: 'short',
      body: `You have gone from a beach to a black hole using one idea and two
             measured relationships. Write it down.`,
      prompt:
        'Explain what causes tides, what makes them stronger, and how they can destroy an object. Three sentences is plenty.',
      rubric:
        'Expect three components. (1) Tides are caused by gravity being unequal across an extended object: the difference between the pull at a point and the pull on the center, not the strength of gravity itself. (2) They get stronger with the companion’s mass, in proportion, and far more sharply with decreasing separation, as one over separation cubed. (3) A body is destroyed when the tidal stretch across it exceeds its own surface gravity, which happens inside its Roche limit, and that limit depends on the two bodies involved rather than being one universal distance. Credit any correct statement of the inverse-cube relationship however phrased. Do not require a formula. Deduct for "tides are caused by strong gravity", for the far-side bulge being pushed or flung outward, or for a Roche limit described as a fixed radius around a planet.',
    },

    {
      sid: 'what-you-worked-out',
      bind: DISRUPTION,
      type: 'read',
      title: 'What you worked out',
      body: `<strong>A tide is a difference.</strong> Not a pull. Take the pull
             on the center away from the pull where you are, and what is left is
             what deforms things. It is the reason there are two bulges and not
             one, and the reason the far side bulges without anything pushing it.
             \n\n<strong>Distance dominates.</strong> One power of mass, three
             powers of separation. This is why the Moon beats the Sun, why the
             last two rows of the comparison chart differ by five orders of
             magnitude, and why tidal effects are usually irrelevant right up
             until they are catastrophic.
             \n\n<strong>Size matters too.</strong> A bigger object has ends
             further apart, so it feels a bigger difference. You feel essentially
             no tide. The Earth feels a few meters of one.
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
