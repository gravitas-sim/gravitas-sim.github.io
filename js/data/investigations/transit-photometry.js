// =============================================================================
// Transit photometry
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

// --- 2. Transit photometry ----------------------------------------------------

const TRANSIT_LAB = {
  scenario: 'Transit Lab',
  seed: 'transit-lab',
  camera: { zoom: 60, pan: { x: 0, y: 0 } },
  paused: false,
};

/** The last few transit times, for the step that measures a period. */
const timing = ctx => {
  const a = ctx.photometry();
  const rows = [
    {
      label: 'Complete transits recorded',
      value: String(a.seen),
      emphasis: true,
    },
  ];
  const recent = a.log.slice(-4);
  if (!recent.length) {
    rows.push({ label: 'Waiting for a complete transit', value: '...' });
  }
  for (const t of recent) {
    rows.push({ label: `Transit ${t.seq}`, value: `${t.mid.toFixed(4)} days` });
  }
  rows.push({ label: 'Clock', value: `${ctx.days().toFixed(4)} days` });
  return rows;
};

/**
 * What a first look at the recording shows: the moment on screen and how many
 * transits have gone by, and not the levels the next steps ask the student to
 * find (the panel's own baseline and bottoms would hand them over).
 */
const watching = ctx => {
  const a = ctx.photometry();
  return [
    ...transitRows(ctx),
    { label: 'Complete transits recorded', value: String(a.seen) },
    { label: 'Clock', value: `${ctx.days().toFixed(4)} days` },
  ];
};

/** The stretch of time on the plot, for a step where the student sets bounds. */
const recording = ctx => {
  const a = ctx.photometry();
  const { x } = a.series?.() ?? { x: [] };
  const rows = [{ label: 'Complete transits recorded', value: String(a.seen) }];
  rows.push(
    x.length
      ? {
          label: 'The plot runs from',
          value: `${x[0].toFixed(3)} to ${x[x.length - 1].toFixed(3)} days`,
        }
      : { label: 'The plot', value: 'empty: let the simulation run' }
  );
  return rows;
};

/** Two stretches of the recorded curve a student sets, and what they make. */
const SPANS = {
  outside: ctx => ({ ...ctx.photometry().series?.(), unit: 'days' }),
  inside: ctx => ({ ...ctx.photometry().series?.(), unit: 'days' }),
};
const mean = (id, label, span) => ({
  id,
  label,
  unit: '',
  source: { span, stat: 'mean' },
});
const DEPTH = 'Transit depth <em>δ</em> = out of transit − in transit';
const depthFields = of => [
  {
    id: 'depth',
    label: DEPTH,
    unit: '',
    decimals: 5,
    compute: v => v.base - v.bot,
  },
  {
    id: 'depthpc',
    label: `The same depth, as a percent of ${of}`,
    unit: '%',
    decimals: 2,
    compute: v => (100 * (v.base - v.bot)) / v.base,
  },
];
/** The check on two stretches: the wrong turns they can take, or `ok` for a floor's depth between `lo` and `hi`. */
const judgeStretches = (lo, hi, ok) => v => {
  const d = v.base - v.bot;
  const say = (level, message) => ({ level, message });
  if (!Number.isFinite(d)) return null;
  if (d < -3e-4)
    return say(
      'error',
      'The in-transit mean sits <em>below</em> the out-of-transit mean, so the depth has to come out positive. Check that you have not swapped the two stretches.'
    );
  if (v.base < 0.9995)
    return say(
      'error',
      'Your out-of-transit stretch averages in part of a dip: its mean is below the level the star holds between transits. Move it onto a flat stretch, clear of every dip.'
    );
  if (Math.abs(d) < 3e-4)
    return say(
      'warn',
      'The two stretches have almost the same mean, so there is no depth between them. Put the in-transit stretch on the floor of a dip and the other on a flat stretch between dips.'
    );
  if (d < lo)
    return say(
      'warn',
      'Your in-transit stretch includes the sloping sides of the dip, or runs outside it, where the planet is only partly on the star. Choose a stretch from the floor, between the two sides, and the depth will be the planet’s whole shadow.'
    );
  if (d > hi)
    return say(
      'warn',
      'That is deeper than the floor of any dip on this curve. Check that both stretches are on the curve now on the plot and in the right boxes.'
    );
  return say('ok', ok);
};

/**
 * The two bodies this lesson watches, bound by exact name.
 *
 * The dot crossing the star and the dip on the plot are the same event seen
 * twice, and until now nothing on screen said so: the reader was told to watch
 * the canvas and then told to read the curve, with no way to check that the
 * planet was actually in front when the dip happened. Binding names both, and
 * `transitRows` below reports where the planet is against the disc at the
 * instant the curve is being drawn.
 */
const TRANSIT_PAIR = {
  star: { name: 'HD 209458' },
  planet: { name: 'HD 209458 b' },
};

/**
 * Where the planet is against the star's disc, and what the photometer sees.
 *
 * Every number comes from js/lightCurve.js - the module that computes the
 * curve - rather than being re-derived here, so the label and the dip cannot
 * disagree about whether a transit is happening.
 */
const transitRows = ctx => {
  const planet = ctx.role('planet') || ctx.selected;
  const g = ctx.transitGeometry(planet);
  const rows = [{ label: 'Brightness now', value: ctx.flux().toFixed(6) }];
  if (!g) {
    rows.push({
      label: 'The planet',
      value: 'select it, and let a frame go by',
    });
    return rows;
  }
  rows.push(
    { label: 'Planet', value: g.name || 'planet' },
    { label: 'Where it is', value: g.phase, emphasis: true },
    {
      label: 'Distance from disc center',
      value: `${g.impact.toFixed(2)} stellar radii`,
    }
  );
  return rows;
};

const TRANSITS = {
  id: 'transit-photometry',
  thumbnail: 'images/scenarios/transit-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Finding Planets by Their Shadows',
  subtitle:
    'Measure a transit, weigh what it tells you, and find what is hiding',
  question:
    'How can you find a planet you cannot see, and measure how big it is?',
  medium: { kind: 'instrument', name: 'the light curve' },
  duration: '50-70 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: '21.4' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  retired: {
    'what-will-the-brightness-do': {
      to: 'estimate-the-dip',
      release: '3.1',
      was: {
        en: 'Choose what the brightness does while the planet crosses the star: rise, drop a little and recover, drop to zero, or stay flat.',
        es: 'Elegir qué hace el brillo mientras el planeta cruza la estrella: subir, bajar un poco y recuperarse, bajar a cero o mantenerse plano.',
      },
    },
    'measure-the-dip': {
      to: 'choose-the-two-stretches',
      release: '3.1',
      was: {
        en: 'Copy the brightness outside transit and at the bottom of the dip from the panel, and work out the depth and the radius ratio.',
        es: 'Copiar del panel el brillo fuera del tránsito y en el fondo de la caída, y calcular la profundidad y el cociente de radios.',
      },
    },
    'now-measure-it': {
      to: 'compare-the-two-curves',
      release: '3.1',
      was: {
        en: 'Watch the same planet with a companion half a magnitude fainter in the aperture and read the new baseline and bottom from the panel.',
        es: 'Observar el mismo planeta con una compañera media magnitud más tenue en la abertura y leer del panel la nueva línea base y el fondo.',
      },
    },
    'recover-the-real-planet': {
      to: 'find-the-hidden-companion',
      release: '3.1',
      was: {
        en: 'Copy the blended depth, enter the clean depth, and read the companion’s contrast and the corrected radius the page works out.',
        es: 'Copiar la profundidad mezclada, introducir la profundidad limpia y leer el contraste de la compañera y el radio corregido que calcula la página.',
      },
    },
  },
  objectives: [
    'Explain why almost every known exoplanet was found indirectly, and what each method actually measures',
    'Derive the relation between transit depth and radius ratio, and use it on a measured light curve',
    'Account for limb darkening when turning a measured depth into a planet radius',
    'Time successive transits to recover an orbital period, and use it to find the orbit',
    'Explain what a transmission spectrum measures and why the depth changes with wavelength',
    'Correct a transit depth for light from an unresolved companion star, and say why that matters to a whole survey',
  ],
  steps: [
    {
      sid: 'a-firefly-beside-a-lighthouse',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'A planet you cannot see',
      body: `How can you find a planet you cannot see, and measure how big it
             is? You will watch a star dim as its planet crosses in front of
             it, predict how deep the dip will be, then read the depth off the
             light curve and turn it into a size.
             \n\nOn screen is <strong>HD 209458</strong>, a slightly hotter and
             more massive relative of the Sun about 160 light years away in
             Pegasus, with a planet on a three and a half day orbit. The view is
             zoomed far in to show the pair. Sizes on screen are not to scale:
             the planet is drawn smaller against its star than it really is, as
             every planet is, while the light curve works from the real sizes
             (details under Sizes).`,
      tip: 'Everything in this investigation is measurable from what is on screen. Clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      time: { speed: 0.03, paused: true },
      setup: TRANSIT_LAB,
    },
    {
      sid: 'five-ways-to-find-a',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'Five ways to find a planet you cannot see',
      body: `<strong>[[radial-velocity|Radial velocity]].</strong> A planet and its star both orbit
             their common center of mass, so the star wobbles, and the wobble
             shifts its spectral lines blue then red. Jupiter moves the Sun at
             12.5 m/s; the Earth manages 9 cm/s. This is how the first planet
             around a normal star was found: Michel Mayor and Didier Queloz
             announced 51 Pegasi b in 1995, a Jupiter-mass world on a four-day
             orbit that nobody's theory of planet formation had allowed for. It
             won them a share of the 2019 Nobel Prize. Radial velocity measures a
             minimum mass, because an orbit seen face-on produces no shift at
             all.
             \n\n<strong>[[transit|Transits]].</strong> If the orbit happens to be edge-on to
             us, the planet crosses the stellar disk and the star dims by a fixed
             fraction, once per orbit, forever. This measures a radius. It is by
             far the most productive method, and it is the one you are about to
             do.
             \n\n<strong>Microlensing.</strong> When one star passes in front of
             another, its gravity focuses the background star's light. A planet
             adds a brief extra spike. This finds planets thousands of light years
             away, including cold ones beyond the snow line, but each event
             happens once and never repeats.
             \n\n<strong>Astrometry.</strong> The same wobble as radial velocity,
             measured as a position on the sky rather than a Doppler shift. Gaia
             has the precision to do this at scale and is beginning to deliver.
             \n\n<strong>Direct imaging.</strong> Blocking the starlight with a
             coronagraph and photographing the planet itself. Rare, difficult, and
             the only method that gets you a photon that actually came from the
             planet.
             \n\nNotice what is missing from all of them except the last: nobody
             has seen the planet. Everything is inferred from an effect on
             something else, and every inference carries assumptions that can be
             wrong. Keeping track of which is which is most of the skill.`,
      tip: 'Radial velocity gives a mass, transits give a radius. Neither gives both, which is why the two together are worth far more than either alone.',
    },
    {
      sid: 'estimate-the-dip',
      bind: TRANSIT_PAIR,
      type: 'predict',
      kind: 'estimate',
      unit: '%',
      reveal: 'why-that-radius-came-out',
      title: 'How deep will the dip be?',
      body: `The planet is about to cross in front of the star from your point
             of view. The star is a little larger than the Sun, 1.15 times its
             radius, and the planet is 1.4 times the radius of Jupiter. Jupiter's
             radius is about a tenth of the Sun's.
             \n\nIn a moment a photometer will record the star's total
             brightness while the planet crosses. Before it does, commit to an
             estimate of how much light goes missing at the deepest point of the
             crossing.`,
      prompt:
        'At the deepest point of the crossing, about what percent of the star’s light will be missing?',
    },
    {
      sid: 'your-first-transit',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'Your first transit',
      // The transit itself is over in half a second of wall clock. The watch
      // stops the run as soon as one complete transit has been recorded and
      // Replay shows the crossing again, so the event is something to look at
      // rather than something to catch.
      // The lesson has its own Replay: no Pause at Event panel over the scene.
      pauseAt: { kind: 'transit', auto: true, replay: true, quiet: true },
      body: `The <strong>Light Curve</strong> panel has opened on the right. It
             plots the total brightness of everything in view against time,
             exactly what a photometer on a telescope records, and nothing else:
             no image, no positions, one number per moment.
             \n\nThe planet goes around once every 13 seconds or so of your
             time, and the transit itself is over in half a second: it occupies
             4% of the orbit, three and a half hours out of a three and a half
             day year. It goes past too quickly to watch closely, so the
             simulation stops itself as soon as one complete transit has been
             recorded. Press <strong>Replay</strong> to see the crossing again
             from a little before it, as often as you like.
             \n\nThe readout below names where the planet is against the star at
             the moment on screen - clear of the disc, crossing the limb, or
             fully on it - beside the brightness the photometer records at that
             same moment. The dot on the canvas and the dip on the plot are one
             event described twice, and Replay lets you check that for yourself
             rather than being told.
             \n\nThe <em>observer angle</em> control rotates your vantage point
             around the system. Try it: the transits move to a different moment
             but they never stop happening, because this simulation runs in a
             single plane and every orbit in it is edge-on. Real orbits are
             tilted, and that changes everything: you will come back to it.`,
      lightCurve: true,
      observerAngle: 0,
      allowInspector: true,
      checklist: [
        'Select the planet, from the canvas or the list below',
        'Press Replay and watch the readout change from "clear of the disc" to "crossing the limb" and on to "fully on the disc"',
        'Check that the brightness starts falling as the planet reaches the limb',
        'Hover over the flat part of the curve and read the value in the tooltip',
        'Hover over the bottom of the dip and read that value too',
        'Move the observer angle and confirm the dips shift but do not disappear',
        'Notice the very slight rise and fall of the baseline between transits',
      ],
      tip: 'That slow baseline ripple is the planet’s phase curve: like the Moon, it shows us more or less of its lit side as it goes round. It is a real signal, roughly a thousand times smaller than the transit, and space telescopes measure it.',
      // Both halves of the same instant: where the planet is against the disc,
      // then what the photometer has recorded. Merged rather than replaced -
      // two `probe` keys in one object mean the later one silently wins, which
      // is how the geometry rows vanished the first time.
      probe: watching,
    },
    {
      sid: 'where-the-depth-comes-from',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'Where the depth comes from',
      body: `Why measure the star at all? Fewer than a hundred of the six
             thousand known planets have ever been photographed, because each
             sits beside something overwhelmingly brighter: seen from thirty
             light years, Jupiter is about a billion times fainter than the Sun
             and half an arcsecond from it, inside the blur every telescope
             makes of a star. A planet cannot hide what it does to its star,
             though. It pulls the star around, it bends the light of stars
             behind it, and, if the geometry is right, it blocks some of its
             light, which is the dip you have just recorded. All three are
             measurements of the <em>star</em>, and stars are bright and easy.
             \n\nA star is, to a photometer, a uniformly bright disk of radius
             <em>R</em><sub>★</sub> and area π<em>R</em><sub>★</sub><sup>2</sup>. A planet in front
             of it is an opaque disk of radius <em>R</em><sub>p</sub> and area
             π<em>R</em><sub>p</sub><sup>2</sup>, and it blocks exactly its own area.
             \n\nThe fractional drop in brightness, the <strong>transit
             depth</strong>, is therefore the ratio of the two areas:
             \n\n<strong><em>δ</em> = π<em>R</em><sub>p</sub><sup>2</sup> / π<em>R</em><sub>★</sub><sup>2</sup>
             = (<em>R</em><sub>p</sub> / <em>R</em><sub>★</sub>)<sup>2</sup></strong>
             \n\nThe π cancels, the distance to the star cancels, the star's
             [[luminosity|luminosity]] cancels, and the planet's own brightness is negligible.
             What survives is a pure ratio of sizes. Turn it around and the
             measurement you want falls straight out:
             \n\n<strong><em>R</em><sub>p</sub> / <em>R</em><sub>★</sub> = √<em>δ</em></strong>
             \n\nThat is the whole method in one line. It also tells you what the
             method cannot do: a transit gives you the planet's size <em>relative
             to the star</em>. To get a planet radius in kilometers you need to
             know the star, which is why a great deal of exoplanet work is
             actually stellar astrophysics.`,
      tip: 'The ratio is usually written k, and it is the single most important number in a transit fit.',
    },
    {
      sid: 'try-it-on-some-real',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'Try it on some real planets',
      body: `The instrument on the right draws the silhouette to scale on the
             left and the transit it produces on the right, on a fixed vertical
             scale so that changes read as changes.
             \n\nWork through the presets. The investigation is in the two extremes: an
             Earth in front of the Sun is 84 parts per million, a depth that took
             a dedicated space telescope to reach, while the same Earth in front
             of TRAPPIST-1 is nearly 1%, easily within reach of a small ground
             telescope. Nothing about the planet changed. The star did.`,
      tool: { id: 'depth-size' },
      checklist: [
        'Find the depth of an Earth in front of the Sun',
        'Find the depth of a Jupiter in front of the Sun',
        'Put an Earth in front of TRAPPIST-1 and compare',
        'Shrink the star and watch the depth climb as 1 / R★²',
        'Convince yourself that doubling the planet radius quadruples the depth',
      ],
      tip: 'This is why the search for small planets moved to small stars. Chasing an Earth around a Sun-like star costs you a space mission; chasing one around an M dwarf is a hundred times easier in signal and can be done from the ground.',
    },
    {
      sid: 'from-a-depth-to-a',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'From a depth to a size',
      kind: 'numeric',
      body: `Suppose a survey reports a clean, repeating 1% dip:
             <em>δ</em> = 0.0100.`,
      prompt: 'What is R<sub>p</sub> / R<sub>★</sub> for a 1% dip?',
      unit: '',
      answer: 0.1,
      tolerance: 0.015,
      because:
        'The square root of 0.01 is 0.1: the planet is a tenth of the star’s radius. Around a Sun-like star that is roughly Jupiter-sized, which is exactly why every transiting planet found before about 2005 was a hot Jupiter. They were the only ones anybody could see.',
      hints: [
        'The depth is the fraction of the starlight that is blocked. What part of the star’s disc does the planet cover?',
        'Blocked light goes as area, and area goes as the square of a radius.',
        'So the depth is the radius ratio squared. Undo that to get the ratio.',
      ],
      feedback: {
        close:
          'Near, but outside the tolerance. Square your answer and compare it with the depth you were given.',
        'wrong-order-of-magnitude':
          'A power of ten out. Check whether you used the depth itself as the radius ratio, or squared where a root was needed.',
        off: 'Test it: square your radius ratio. If that does not return the depth, work backwards from the depth with the opposite operation.',
        correct:
          'To check a result like this, square it and see that the depth comes back.',
      },
    },
    {
      sid: 'choose-the-two-stretches',
      bind: TRANSIT_PAIR,
      type: 'measure',
      title: 'Choose the two stretches',
      body: `Now do it for real. The plot has kept the points since your first
             transit and the simulation runs again. Let it draw one complete dip
             with flat curve on both sides, then press the timeline's pause button: the curve is held still
             and the plot keeps every point.
             \n\nA depth is a difference between two levels, and you decide
             which stretches of the curve stand for them: one stretch of the
             flat curve between transits, <em>out of transit</em>, and one
             stretch inside the dip, <em>in transit</em>. For each, type where
             the stretch begins and ends, in days along the plot's bottom axis,
             and press the button under it. The page averages the points inside
             your stretch and reports the mean, how many points there are and
             the standard error of that mean.
             \n\nThe depth and the radius ratio are worked out from your two
             means. A different choice of stretch gives a different depth, so
             check what each one is made of. If the flat stretch is too short
             for you, press play for a few seconds more and pause again.`,
      time: { paused: false },
      lightCurve: true,
      series: SPANS,
      fields: [
        mean('base', 'Mean brightness, out of transit', 'outside'),
        {
          ...mean('base_n', 'Points in the out-of-transit stretch', 'outside'),
          source: { span: 'outside', stat: 'n' },
        },
        {
          ...mean('base_se', 'Standard error, out of transit', 'outside'),
          source: { span: 'outside', stat: 'se' },
        },
        mean('bot', 'Mean brightness, in transit', 'inside'),
        {
          ...mean('bot_n', 'Points in the in-transit stretch', 'inside'),
          source: { span: 'inside', stat: 'n' },
        },
        {
          ...mean('bot_se', 'Standard error, in transit', 'inside'),
          source: { span: 'inside', stat: 'se' },
        },
        ...depthFields('the star’s light'),
        {
          id: 'k_naive',
          label:
            'Radius ratio <em>R</em><sub>p</sub> / <em>R</em><sub>★</sub> = √(δ)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.base - v.bot),
        },
      ],
      validate: judgeStretches(
        0.013,
        0.0195,
        'Two stretches, one depth. Keep it: the next screens set it beside your estimate and say why the radius it gives is not quite right.'
      ),
      probe: recording,
      tip: 'A real light curve is noisy, and nobody reads a level off it by eye: you fit a model transit to every point at once, which is how the precision ends up better than any single measurement in it. The curve here has no noise, so the standard error you get is the scatter of the model’s own points inside your stretch, a feature of the stretch you chose and not a measurement uncertainty.',
    },
    {
      sid: 'why-that-radius-came-out',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'Why the square root of the depth is not the radius ratio',
      evidence: [
        { step: 'choose-the-two-stretches', field: 'depthpc' },
        { step: 'choose-the-two-stretches', field: 'base' },
        { step: 'choose-the-two-stretches', field: 'bot' },
      ],
      compare:
        'A planet that blocked only the area it covers would give a depth equal to the radius ratio squared; set your estimate and your reading side by side, and the paragraphs below say what makes the dip you measured deeper.',
      body: `A star is not a uniformly bright disk. You are looking down through
             a partly transparent atmosphere, and at the center of the disk you
             see straight down into hot, bright layers, while near the edge your
             line of sight slants and stops in cooler, dimmer ones. The disk is
             brightest in the middle and fades towards the rim. This is
             <strong>limb darkening</strong>, and it is visible in any decent
             photograph of the Sun.
             \n\nSo a planet crossing the middle of the disk covers brighter than
             average light, and the dip at mid-transit is deeper than the plain
             area ratio predicts. For the coefficients used here, the center of
             the disk is <strong>1.215</strong> times as bright as the disk
             average, so:
             \n\n<strong><em>δ</em><sub>measured</sub> = 1.215 × (<em>R</em><sub>p</sub> /
             <em>R</em><sub>★</sub>)<sup>2</sup></strong>
             \n\nTaking the square root of your measured depth therefore gives a radius
             ratio that is off, by an amount that depends on where on the floor
             your stretch sits. At the middle of the dip it is too large by
             √1.215 = 1.102, about 10%. The floor is curved, because towards
             either end of it the planet is crossing dimmer light, so a stretch
             over the whole floor has a lower mean depth and its square root is
             about 6% too large, and near the ends of the floor it is too small.
             On a planet near a classification boundary, an error of that size is
             the difference between two different answers about what the world is
             made of.
             \n\nThis is not a quirk of the simulation. It is why nobody in the
             field reports √<em>δ</em> as a radius ratio: a real transit fit solves for the
             radius ratio, the limb-darkening coefficients, the [[impact-parameter|impact parameter]]
             and the orbit together, because they are all tangled up in the same
             curve.`,
      figure: {
        src: 'images/transit-of-venus-2012.webp',
        alt: 'The Sun photographed in white light. Its disk is noticeably brighter in the middle and fades towards the rim. The small, hard-edged black disk of Venus sits near the upper right edge, and several sunspots are scattered across the middle.',
        caption: `Venus crossing the Sun on 5 June 2012, photographed from San
                  Francisco. This is the same measurement you have been making,
                  on the one star close enough to resolve. The
                  <strong>limb darkening</strong> is plain: the middle of the
                  disk is visibly brighter than the rim, and Venus happens to be
                  crossing near the edge, where the star is dimmer. Venus is
                  0.0087 of the Sun's radius, so it blocks about 76 parts per
                  million: almost exactly what an Earth transiting a Sun-like
                  star would give an observer somewhere else. The dark specks
                  across the middle are sunspots, and they are the reason real
                  transit photometry has to contend with a star that does not
                  hold still.`,
        author: 'Brocken Inaglory',
        source:
          'https://commons.wikimedia.org/wiki/File:2012_Transit_of_Venus_from_SF.jpg',
        license: 'CC BY 2.5',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.5/',
        changes: 'resized',
      },
      tip: 'Limb darkening is wavelength dependent, and it is much weaker in the infrared. That is one reason precise radius measurements are usually made in the red or the infrared rather than in blue light.',
    },
    {
      sid: 'correct-it-and-get-a',
      bind: TRANSIT_PAIR,
      type: 'measure',
      title: 'Correct it, and get a real radius',
      body: `Divide out the limb darkening, then convert the ratio into a size.
             \n\nHD 209458 is a well-studied star. Spectroscopy and its distance
             from Gaia give a radius of <strong>1.155 R<sub>☉</sub></strong>,
             which is the number the transit depth has to be multiplied by. Enter
             your measured depth and the star's radius; the rest is arithmetic.`,
      fields: [
        {
          id: 'd2',
          label: 'Depth you measured',
          unit: '',
          hint: 'your depth from the two stretches',
        },
        {
          id: 'rstar',
          label: 'Star radius R<sub>★</sub>',
          unit: 'R☉',
          want: '1.155',
        },
        {
          id: 'k_true',
          label: 'Corrected ratio √(<em>δ</em> / 1.215)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.d2 / 1.2146),
        },
        {
          id: 'rp_rj',
          label: 'Planet radius',
          unit: 'R_Jupiter',
          decimals: 3,
          compute: v => Math.sqrt(v.d2 / 1.2146) * v.rstar * 9.7311,
        },
        {
          id: 'rp_re',
          label: 'The same radius',
          unit: 'R⊕',
          decimals: 2,
          compute: v => Math.sqrt(v.d2 / 1.2146) * v.rstar * 109.198,
        },
      ],
      validate: v => {
        const rj = Math.sqrt(v.d2 / 1.2146) * v.rstar * 9.7311;
        if (!Number.isFinite(rj)) return null;
        if (v.rstar > 50 || Math.abs(v.rstar - 1.155) > 0.01) {
          return {
            level: 'error',
            message:
              'The star radius goes in solar radii, not in kilometers or in Jupiters. HD 209458 is 1.155 R☉.',
          };
        }
        if (v.d2 > 1) {
          return {
            level: 'error',
            message:
              'The depth is a fraction, not a percentage: 1.8% goes in as 0.018.',
          };
        }
        if (rj > 1.15 && rj < 1.45) {
          return {
            level: 'ok',
            message:
              'That is it: about 1.38 Jupiter radii, or 15.5 Earth radii. The published value from a decade of Hubble transits is 1.38 R_Jupiter. You just measured a planet 160 light years away by watching a star get slightly dimmer.',
          };
        }
        if (rj >= 1.45) {
          return {
            level: 'warn',
            message:
              'Too large. Check that you divided the depth by 1.215 before taking the square root rather than after, and that the depth is the one you measured rather than a percentage.',
          };
        }
        return {
          level: 'warn',
          message:
            'Too small. The most common cause is reading the bottom of the dip from the ingress shoulder rather than the lowest point.',
        };
      },
      tip: 'A radius of 1.38 R_Jupiter with a mass of only 0.69 M_Jupiter makes this planet less dense than water. Hot Jupiters are inflated by the heat they absorb, and explaining exactly how is still an open problem.',
    },
    {
      sid: 'the-shape-of-the-dip',
      bind: TRANSIT_PAIR,
      // Half a second of real time is not something a reader can study by
      // watching for it. The watch stops the run as soon as a complete transit
      // has been recorded, which puts the whole event on the plot behind them
      // and lets them step back through it a frame at a time with the
      // timeline controls - the geometry readout follows the frame they are
      // standing on, so ingress, floor and egress become places to visit
      // rather than moments to catch.
      pauseAt: { kind: 'transit' },
      probe: transitRows,
      type: 'read',
      title: 'The shape of the dip',
      body: `A transit is not a step function. It has four contact points, and
             the shape between them carries information.
             \n\n<strong>Ingress</strong> begins when the planet's leading edge
             first touches the stellar disk and ends when its trailing edge has
             fully crossed onto it. During that interval the blocked area climbs
             from nothing to its full value. For a central
             transit ingress lasts <em>k</em>/(1 + <em>k</em>) of the whole event, with <em>k</em> = <em>R</em><sub>p</sub>/<em>R</em><sub>★</sub>, so the steepness of
             the shoulders is itself a measurement of the radius ratio,
             independent of the depth.
             \n\nThe <strong>floor</strong> between second and third contact is
             where the planet is entirely on the disk. It is not flat: limb
             darkening curves it, deepest at mid-transit where the planet covers
             the brightest part of the star.
             \n\nYou do not have to catch any of this by eye. Arm the event
             watch below and the simulation stops the moment a complete transit
             has been recorded. Then step backwards through it with the timeline
             controls: the readout follows, so you can walk from "clear of the
             disc" through "crossing the limb" to "fully on the disc" and back,
             reading the brightness at each.
             \n\n<strong>Egress</strong> mirrors ingress.
             \n\nThe <strong>total duration</strong> depends on how fast the planet
             is moving and how long a chord it cuts across the disk. Combine the
             duration with the [[period|period]] and you can extract the density of the
             star, without ever resolving it.`,
    },
    {
      sid: 'reading-the-floor',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'Reading the floor',
      kind: 'choice',
      body: `Look closely at a dip on the light curve. The bottom is not flat: it
             curves gently, deepest in the middle.`,
      prompt: 'The rounded floor of the transit is caused by…',
      options: [
        'the planet slowing down as it crosses',
        'limb darkening: the star is brighter at its center than at its edge',
        'the planet’s atmosphere leaking light through',
        'noise in the measurement',
      ],
      answer: 1,
      because:
        'Limb darkening. You see deeper, hotter layers at the center of the stellar disk and cooler, dimmer layers near the edge, so the planet blocks more light mid-transit than just after ingress. It is also exactly the effect you divided out two steps ago.',
    },
    {
      sid: 'the-angle-you-happen-to',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'The angle you happen to be standing at',
      body: `Everything so far assumed the planet crosses the middle of the star.
             Real orbits are tilted, and the tilt is set by how the system happens
             to be oriented relative to Earth: nothing about the planet, entirely
             about us.
             \n\nThe <strong>impact parameter</strong> <em>b</em> is how far from the
             center of the disk the planet's path passes, in units of the stellar
             radius. <em>b</em> = 0 is dead center. <em>b</em> = 1 clips the limb. Above about
             <em>b</em> = 1 + <em>k</em> the planet misses the star altogether and there is no
             transit at all, however patiently you watch.
             \n\nSlide it and watch three things change at once: the transit gets
             shorter, the floor loses its flat section and becomes a V, and the
             depth drops because the planet is now covering the dim limb rather
             than the bright center. All three are why a fit that ignores the
             impact parameter gets the radius wrong.`,
      tool: { id: 'geometry' },
      lightCurve: false,
      checklist: [
        'Start at <em>b</em> = 0 and note the duration and depth',
        'Raise b to 0.9 and watch the flat floor turn into a V',
        'Find the value of b where the transit disappears entirely',
        'Load the Earth-around-the-Sun preset and read off the transit probability',
        'Shrink a / R★ and watch the probability climb',
      ],
      tip: 'The simulation runs in a plane, so every orbit in it has <em>b</em> = 0 and transits. That is a limitation of a two-dimensional sandbox, not a claim about the sky. This instrument is where the third dimension lives.',
    },
    {
      sid: 'how-lucky-do-you-have',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'How lucky do you have to be?',
      kind: 'numeric',
      body: `For a randomly oriented orbit, the chance that it happens to be
             edge-on enough to transit is very close to
             R<sub>★</sub> / a: the star's radius divided by the size of the
             orbit.
             \n\nThe Sun's radius is 0.00465 AU. The Earth orbits at 1 AU.`,
      prompt:
        'An alien astronomer picks a random direction to look at the Sun from. Roughly one chance in how many that they see the Earth transit?',
      unit: 'to one',
      answer: 215,
      tolerance: 40,
      because:
        'R★/<em>a</em> = 0.00465, or about 1 in 215. That is the single hardest fact about the transit method: even a survey with perfect photometry watching every star in the sky forever would find fewer than one in two hundred of the Earth-like planets out there. Everything the method reports about how common planets are has to be divided by this geometric factor before it means anything.',
      hints: [
        'The chance is a ratio of two lengths that the step gives you.',
        'Divide the star’s radius by the size of the orbit, in the same unit.',
        'That gives a fraction. The question asks one chance in how many, so think about what to do to a fraction to get that.',
      ],
      feedback: {
        close:
          'Close. Re-check the division, and that both lengths are in the same unit.',
        'wrong-order-of-magnitude':
          'Out by a large factor. If you have 0.00465, that is the chance as a fraction; the question asks one chance in how many, so turn it over. Otherwise check both lengths are in AU.',
        off: 'Write the chance as a fraction first, then ask how many of them make one.',
      },
    },
    {
      sid: 'what-the-method-misses',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'What the method misses',
      kind: 'short',
      body: `You have now seen both halves of the problem: the geometry has to be
             right, and the signal has to be big enough to detect.`,
      prompt:
        'A transit survey reports that hot Jupiters are far more common than Jupiters on wide orbits. Give two separate reasons this survey would say that even if it were not true.',
      rubric:
        'Two biases should appear. (1) Geometric: transit probability goes as R★/a, so a planet at 0.05 AU is twenty times more likely to transit than one at 1 AU and four hundred times more likely than one at 20 AU. (2) Detection: a survey has to see several transits to confirm a period, so a planet with a long period either falls outside the observing baseline or gives too few events; short periods produce hundreds of transits that can be stacked. Credit also for depth bias, since large planets give deeper dips and are found further out in distance, and for duration or duty-cycle arguments.',
    },
    {
      sid: 'getting-the-period',
      bind: TRANSIT_PAIR,
      type: 'predict',
      reveal: 'time-two-transits',
      title: 'Getting the period',
      body: `So far you have used a single dip. The light curve has more in it
             than that: the transits repeat.`,
      prompt: 'The orbital period of the planet is best measured by…',
      options: [
        'the width of one transit',
        'the time between the middles of two successive transits',
        'the depth of the transit',
        'how long the star stays at its baseline brightness',
      ],
      answer: 1,
      because:
        'The spacing between transits is the period, by definition: the planet has gone exactly once around. The width of a transit is a different quantity, set by the geometry and the orbital speed, and it is what you use to get the stellar density once you know the period.',
    },
    {
      sid: 'time-two-transits',
      bind: TRANSIT_PAIR,
      type: 'measure',
      title: 'Time two transits',
      body: `The readout below numbers every complete transit and gives the
             time of its middle. Press the button to record whichever one has
             most recently gone past, wait for a later one, and press it again.
             Each press brings its transit number with it, so you can leave the
             simulation running and come back to it.
             \n\nThe two do not have to be consecutive. Enter how many orbits
             went by between them, which is the difference of the two transit
             numbers, and the period is divided by that. This is not a trick to
             save you waiting: it is how transit timing actually works. If each
             mid-time is good to a minute and you wait one orbit, the period is
             good to a minute; wait a hundred orbits and the same two
             measurements give a period good to under a second. Kepler periods
             are quoted to seven significant figures for exactly this reason, and
             you can see it happen here by waiting longer.`,
      lightCurve: true,
      importLabel: 'Record the latest transit',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last ? [a.last.mid.toFixed(4), String(a.last.seq)] : null;
      },
      importGroups: [
        ['t1', 'n1'],
        ['t2', 'n2'],
      ],
      fields: [
        { id: 't1', label: 'First mid-transit time', unit: 'days' },
        { id: 'n1', label: 'which transit it was', unit: '', want: 'e.g. 2' },
        { id: 't2', label: 'A later mid-transit time', unit: 'days' },
        { id: 'n2', label: 'which transit it was', unit: '', want: 'e.g. 5' },
        {
          id: 'n',
          label: 'Orbits between the two',
          unit: '',
          hint: 'the difference of the two transit numbers',
        },
        {
          id: 'P',
          label:
            'Orbital period <em>P</em> = (<em>t</em>₂ − <em>t</em>₁) / <em>n</em>',
          unit: 'days',
          decimals: 4,
          compute: v => (v.t2 - v.t1) / v.n,
        },
      ],
      validate: v => {
        const P = (v.t2 - v.t1) / v.n;
        if (!Number.isFinite(P)) return null;
        if (P < 0) {
          return {
            level: 'error',
            message:
              'The second stamp has to come after the first. Swap them, or take a fresh pair.',
          };
        }
        if (v.n < 1) {
          return {
            level: 'error',
            message: 'At least one orbit has to pass between two transits.',
          };
        }
        // The classic off-by-one: transit 2 to transit 5 is three orbits, not
        // four. Worth naming, because the period comes out wrong by a factor
        // that looks almost right.
        const gap = v.n2 - v.n1;
        if (Number.isFinite(gap) && gap > 0 && v.n !== gap) {
          return {
            level: 'warn',
            message:
              `You recorded transit ${v.n1} and transit ${v.n2}, so the planet went ` +
              `round <strong>${gap}</strong> ${gap === 1 ? 'time' : 'times'} in between, not ${v.n}. ` +
              'Count the gaps between the transits, not the transits themselves.',
          };
        }
        if (P > 3.2 && P < 3.9) {
          return {
            level: 'ok',
            message:
              'About 3.5 days. The published period of HD 209458 b is 3.5247 days, known to better than a tenth of a second from two decades of transits.',
          };
        }
        if (P > 6.5 && P < 7.5) {
          return {
            level: 'warn',
            message:
              'That is twice the period: a transit went by between your two stamps and was not counted. Put 2 in the orbits box.',
          };
        }
        if (P > 1.5 && P < 2.1) {
          return {
            level: 'warn',
            message:
              'That is about half the period. Check that both stamps were taken at the bottom of a transit and not one at a transit and one at the secondary eclipse halfway between.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected something near 3.5 days. Check that the orbit count matches the difference between the two transit numbers in the readout.',
        };
      },
      probe: timing,
      tip: 'The transit numbers in the readout count every complete dip since the recording started, so the orbits between transit 3 and transit 7 is simply 4.',
    },
    {
      sid: 'from-a-period-to-an',
      bind: TRANSIT_PAIR,
      type: 'measure',
      title: 'From a period to an orbit',
      body: `A period and a stellar mass are enough to place the planet, through
             the same [[keplers-third-law|third law]] you would use on the Solar System:
             \n\n<strong><em>a</em>³ = <em>P</em>² M<sub>★</sub></strong>,
             with <em>a</em> in AU, <em>P</em> in years and M<sub>★</sub> in solar masses.
             \n\nHD 209458 weighs <strong>1.148 M<sub>☉</sub></strong>, from its
             [[spectrum|spectrum]] and its position on the [[main-sequence|main sequence]]. Enter your period and
             that mass.
             \n\nThe last two rows are what the orbit means. a / R<sub>★</sub> is
             how many stellar radii out the planet sits, which is what sets the
             transit probability and the duration. The [[equilibrium-temperature|equilibrium temperature]] is
             what you get by balancing the starlight it absorbs against the heat
             it radiates away.`,
      fields: [
        {
          id: 'P_d',
          label: 'Period P',
          unit: 'days',
          hint: 'from the previous step',
        },
        {
          id: 'M',
          label: 'Star mass M<sub>★</sub>',
          unit: 'M☉',
          want: '1.148',
        },
        {
          id: 'P_yr',
          label: 'Period in years',
          unit: 'yr',
          decimals: 6,
          compute: v => v.P_d / 365.25,
        },
        {
          id: 'a_au',
          label:
            'Semi-major axis <em>a</em> = (<em>P</em>² <em>M</em>)<sup>⅓</sup>',
          unit: 'AU',
          decimals: 5,
          compute: v => Math.cbrt((v.P_d / 365.25) ** 2 * v.M),
        },
        {
          id: 'a_over_r',
          label: 'Orbit in stellar radii, a / R<sub>★</sub>',
          unit: '',
          decimals: 2,
          compute: v =>
            (Math.cbrt((v.P_d / 365.25) ** 2 * v.M) * 215.032) / 1.155,
        },
        {
          id: 'teq',
          label: 'Equilibrium temperature',
          unit: 'K',
          decimals: 0,
          compute: v =>
            6065 /
            Math.sqrt(
              (2 * (Math.cbrt((v.P_d / 365.25) ** 2 * v.M) * 215.032)) / 1.155
            ),
        },
      ],
      validate: v => {
        const a = Math.cbrt((v.P_d / 365.25) ** 2 * v.M);
        if (!Number.isFinite(a)) return null;
        if (v.P_d < 0.5) {
          return {
            level: 'error',
            message:
              'The period goes in days, not years. Three and a half days, not three and a half thousandths of a year.',
          };
        }
        if (v.M > 20) {
          return {
            level: 'error',
            message:
              'The mass goes in solar masses. HD 209458 is 1.148 of them.',
          };
        }
        if (a > 0.035 && a < 0.06) {
          return {
            level: 'ok',
            message:
              'About 0.047 AU: one eighth of Mercury’s distance from the Sun, and roughly nine stellar radii out. At 1,450 K the planet’s day side is hot enough to glow dull red on its own. Nothing in planet formation theory before 1995 put a gas giant there, and working out how it arrived is still an active argument between migration through the disk and scattering off other planets.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected roughly 0.047 AU. Check the period is in days and the mass in solar masses.',
        };
      },
    },
    {
      sid: 'what-a-transit-cannot-tell',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'What a transit cannot tell you',
      body: `You have a radius, a period and an orbit. You do not have a mass, and
             no amount of better [[photometry|photometry]] will give you one. A puffy gas planet
             and a dense rocky one of the same size produce identical dips.
             \n\nThe mass has to come from somewhere else, and it almost always
             comes from radial velocities: the star's spectral lines shift as the
             planet pulls it around, and the size of that shift gives the planet's
             mass. For HD 209458 b that is 0.69 Jupiter masses. Put the two
             measurements together and you get a density: 0.69 Jupiter masses
             inside 1.38 Jupiter radii is about 0.34 grams per cubic centimeter,
             a third the density of water. The planet would float, if you had an
             ocean large enough.
             \n\nThat is why the standard plot in the field is the
             <strong>mass-radius diagram</strong>, and why a planet with only one
             of the two is a candidate rather than a result. It is also where the
             most interesting recent result came from: plot radius against period
             for the small Kepler planets and there is a visible gap near
             1.8 R<sub>⊕</sub>, the <em>radius valley</em>, separating rocky
             super-Earths from small worlds holding a thin hydrogen envelope. The
             gap is thought to be carved by atmospheric escape, and it is a
             feature nobody predicted before the data showed it. Finding it
             required thousands of planet radii to be accurate, which is where the
             last section of this investigation goes.`,
      tip: 'The TRAPPIST-1 planets got their masses a third way: they perturb each other enough to shift each other’s transits by minutes, and those transit timing variations are a mass measurement.',
    },
    {
      sid: 'the-planet-changes-size-with',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'The planet changes size with color',
      body: `Here is something the simple picture does not predict. Measure the
             transit depth in red light and again in blue light and you can get
             different answers.
             \n\nThe reason is that the planet's edge is not a hard edge. A gas
             planet has an atmosphere, and how deep you can see into it depends on
             what is absorbing at the wavelength you are looking at. At a
             wavelength where sodium absorbs strongly, the atmosphere goes opaque
             high up and the planet presents a slightly larger disk. At a
             wavelength where nothing absorbs, you see further down and the disk
             is slightly smaller. The transit depth traces out the planet's
             opacity against wavelength: a <strong>transmission spectrum</strong>.
             \n\nThe size of the effect is set by the atmospheric
             <strong>[[scale-height|scale height]]</strong>, the vertical distance over which
             pressure falls by a factor of e: <em>H</em> = kT / μg. Hot, low-gravity,
             hydrogen-rich atmospheres are puffy and have large scale heights,
             which is why hot Jupiters are the easiest atmospheres to study. For
             this planet <em>H</em> is roughly 550 km against a radius of 99,000 km, so a
             strong band lifts the radius by a few tenths of a percent and the
             depth by a few hundred parts per million on top of 18,000.
             \n\nThat sounds impossible to measure. It was done first in this very
             system: in 2002 David Charbonneau and colleagues used the Hubble
             Space Telescope to find that HD 209458 b's transit was very slightly
             deeper in the sodium D lines than beside them. It was the first
             detection of an atmosphere on a planet around another star.`,
      tip: 'The same idea in reverse gives you emission spectra: watch the planet pass behind the star, subtract, and what disappears is the planet’s own light.',
    },
    {
      sid: 'read-an-atmosphere',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'Read an atmosphere',
      body: `The instrument plots transit depth against wavelength for a hot
             Jupiter like this one. The dashed line is where the depth would sit
             if the planet had no atmosphere at all; every bump above it is a
             molecule making the atmosphere opaque at that color.
             \n\nThe cloud slider is the honest part. High cloud and haze decks sit
             above the layers where the molecular features form and mute them
             towards a flat line. A large fraction of well-observed hot Jupiters
             look at least partly like this, and telling a genuinely dry
             atmosphere from a cloudy wet one is a real and current difficulty.`,
      tool: { id: 'spectrum' },
      lightCurve: false,
      checklist: [
        'Find the sodium feature and read its size in parts per million',
        'Compare the 1.4 μm water band with the 4.3 μm carbon dioxide band',
        'Turn the clouds up and watch the features flatten',
        'Change the scale height and see which features survive',
        'Find a wavelength where nothing is absorbing at all',
      ],
      tip: 'Wavelengths beyond about 2.5 μm are absorbed by our own atmosphere and were unreachable until JWST. Its first exoplanet results in 2022 included the first unambiguous carbon dioxide detection in an exoplanet atmosphere.',
    },
    {
      sid: 'why-the-depth-moves',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'Why the depth moves',
      kind: 'choice',
      body: `A team measures a planet's transit 300 parts per million deeper at
             1.4 μm than at 1.2 μm, and repeats the result on four separate
             transits.`,
      prompt: 'The most likely explanation is that…',
      options: [
        'the planet is physically larger when observed at 1.4 μm',
        'water vapor makes the atmosphere opaque at 1.4 μm, so the planet blocks a slightly wider disk',
        'the star is brighter at 1.4 μm, which deepens the transit',
        'the orbit is slightly different on the transits taken at 1.4 μm',
      ],
      answer: 1,
      because:
        'Opacity, not size. At a wavelength where an abundant molecule absorbs, the atmosphere becomes opaque higher up, so the radius at which the planet stops transmitting starlight is larger. The star’s own brightness cancels out of the depth entirely, which is what makes this measurement possible in the first place.',
    },
    {
      sid: 'things-that-are-not-planets',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'Things that are not planets',
      body: `A dip in a light curve is a dip in a light curve. Several things that
             are not planets produce one.
             \n\nAn <strong>[[eclipsing-binary|eclipsing binary]]</strong> of two stars produces dips
             of tens of percent, which is obvious, until the pair is grazing and
             only clips a few percent. A <strong>background eclipsing binary</strong>
             behind your target, its deep eclipses watered down by all the light of
             the foreground star, produces a shallow dip of exactly planetary
             depth. Starspots rotating in and out of view produce dips that
             almost repeat. Kepler and TESS both flag more candidates than they
             confirm, and sorting them out is the bulk of the follow-up effort.
             \n\nThe subtler problem is not a [[false-positive|false positive]] at all. It is a real
             planet whose measurement is quietly wrong.
             \n\nSurvey telescopes have coarse [[pixel|pixels]]. Kepler's were about four
             arcseconds across; TESS's are <strong>21 arcseconds</strong>, roughly
             the apparent size of a small crater on the Moon. Every star that
             falls in the aperture contributes light to the same one number.
             Stellar companions are common: roughly half of Sun-like stars have
             one. If your target has a neighbor a fraction of an arcsecond away,
             the survey has no way of knowing, and the neighbor's light is in
             every measurement you make.
             \n\nAdding constant light to a light curve does not hide the transit.
             It <em>dilutes</em> it.`,
    },
    {
      sid: 'a-star-you-did-not',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'A star you did not know was there',
      body: `Suppose a fraction of the light in the aperture comes from a
             companion, with [[flux|flux]] ratio <em>F</em>₂/F<sub>1</sub>. The planet
             still blocks the same fraction of its own star, but that blocked
             light is now a smaller share of the total:
             \n\n<strong><em>δ</em><sub>observed</sub> = <em>δ</em><sub>true</sub> /
             (1 + <em>F</em>₂/<em>F</em>₁)</strong>
             \n\nSince the radius goes as √<em>δ</em>, the radius you report is too small
             by exactly
             \n\n<strong><em>R</em><sub>true</sub> / <em>R</em><sub>measured</sub> =
             √(1 + <em>F</em>₂/<em>F</em>₁)</strong>
             \n\nContrast is usually quoted as a [[magnitude|magnitude]] difference, and
             <em>F</em>₂/<em>F</em>₁ = 10<sup>−0.4Δm</sup>. An equal twin
             makes every radius too small by √2. A companion four magnitudes
             fainter changes it by 1.2%.
             \n\nThis is what high-resolution imaging of planet hosts is for. The
             <strong>Robo-AO Kepler Survey</strong> put a robotic laser adaptive
             optics system on the 1.5 m telescope at Palomar and imaged
             <strong>3,857</strong> Kepler planet-candidate hosts between 2012 and
             2016, reaching about 0.15 arcseconds. It found a nearby star within
             4 arcseconds around <strong>14.5 ± 0.5%</strong> of them: about one
             host in seven. The <strong>SOAR TESS Survey</strong> does the same
             job for TESS with speckle imaging on the 4.1 m SOAR telescope in
             Chile, resolving to about 0.04 arcseconds, and has observed nearly
             3,000 targets.`,
      tool: { id: 'dilution' },
      lightCurve: false,
      checklist: [
        'Set Δm = 0 and confirm the correction is exactly √2',
        'Set Δm = 1.0 and read what the correction is',
        'Find the Δm beyond which the correction is under 1%',
        'Set the measured radius to 1.5 R⊕ and find the Δm that pushes it past 1.6',
      ],
      tip: 'Robo-AO Survey IV corrected 814 candidate radii. Treating the primary and the secondary as equally likely hosts, the mean radius grew by a factor of 1.54, and 35 candidates previously believed to be rocky moved out of the rocky size range entirely.',
    },
    {
      sid: 'go-and-look',
      bind: TRANSIT_PAIR,
      type: 'explore',
      title: 'Go and look',
      body: `Knowing that dilution matters does not tell you which stars are
             diluted. Somebody has to point a telescope with enough resolving
             power at every planet host and find out what else is in the
             aperture.
             \n\nThat is hard from the ground, because the atmosphere smears
             every point of light into a blur about an arcsecond across, and a
             companion inside that blur is simply part of the star. Two
             techniques get underneath it. <strong>Adaptive optics</strong>
             measures the distorted wavefront with a guide star, often an
             artificial one made by a laser, and corrects it with a deformable
             mirror hundreds of times a second. <strong>Speckle imaging</strong>
             takes hundreds of exposures short enough to freeze the atmosphere
             and combines them in Fourier space, where the binary signal
             survives and the atmospheric scrambling does not.
             \n\nThe instrument on the right shows the same pair of stars
             imaged at a resolution you choose. Work down from ordinary seeing
             to what a 4 m telescope reaches with speckle, and watch a single
             star become two.`,
      tool: { id: 'resolve' },
      lightCurve: false,
      checklist: [
        'Start at ordinary seeing and confirm the pair reads as one star',
        'Step down to the Robo-AO resolution and find where it splits',
        'Reach the SOAR speckle resolution and see how much closer it goes',
        'Move the companion inwards until even that cannot separate them',
        'Turn the contrast up and note that separation is not the only thing that matters',
      ],
      tip: 'Robo-AO reached about 0.15 arcseconds on a 1.5 m telescope and imaged 3,857 Kepler hosts; SOAR speckle reaches about 0.04 arcseconds on a 4.1 m and has observed close to 3,000 TESS targets. Neither is a large telescope by modern standards. What made them work was doing it to every host, not to a chosen few.',
    },
    {
      sid: 'will-the-dip-look-the-same',
      bind: TRANSIT_PAIR,
      type: 'predict',
      kind: 'estimate',
      unit: '%',
      reveal: 'find-the-hidden-companion',
      title: 'Will the dip look the same?',
      body: `The same star and the same planet are back, with one change: a
             second star, in the same pixel, adds its light to every
             measurement. It sits 300 AU from the star you are watching. At the
             distance of this system that is about six arcseconds on the sky,
             comfortably inside a single TESS pixel and inside a Kepler
             aperture, and it is 30,000 simulation units from the star, far
             outside the view. You cannot see it. Neither could the survey. You
             are not told how bright it is.
             \n\nIn a moment you will record this system's transit the way you
             recorded the first one. Before you do, estimate how deep its dip
             will be, as a percent of the light the photometer collects.`,
      prompt: 'The dip in the combined light will be about what percent deep?',
    },
    {
      sid: 'compare-the-two-curves',
      bind: TRANSIT_PAIR,
      type: 'measure',
      title: 'Compare the two curves',
      body: `The simulation is now running the second system and the plot is
             empty. Let it draw one complete dip with flat curve on both sides,
             then press the timeline's pause button.
             \n\nMeasure this transit exactly as you measured the first: choose
             a stretch out of transit and a stretch from the floor of the dip,
             type where each begins and ends, and press the button under it.
             Then compare the new curve with the one you measured before: the
             time between transits, the length of the dip and its shape, and
             its depth.`,
      time: { speed: 0.03, paused: false },
      setup: {
        scenario: 'Blended Binary',
        seed: 'transit-lab',
        camera: { zoom: 60, pan: { x: 0, y: 0 } },
        paused: false,
      },
      lightCurve: true,
      observerAngle: 0,
      series: SPANS,
      fields: [
        mean('base', 'Mean brightness, out of transit', 'outside'),
        mean('bot', 'Mean brightness, in transit', 'inside'),
        ...depthFields('the light collected'),
      ],
      validate: judgeStretches(
        0.008,
        0.0125,
        'Two stretches, one depth for the second system. The next screen puts it beside the first.'
      ),
      probe: recording,
      checklist: [
        'Compare the time between the mid-times of two transits with the first system',
        'Compare the length of the dip, and the shape of its sides and floor',
        'Compare the depth with the one you measured before',
        'Decide what could make the depth shallower while the period and the shape stay as they were',
      ],
      tip: 'Only the depth changes. The period, the duration and the shape are untouched, which is precisely why blending is so easy to miss: nothing about the light curve looks wrong.',
    },
    {
      sid: 'find-the-hidden-companion',
      bind: TRANSIT_PAIR,
      // The clean depth and the blended depth, one from each of those two
      // measurements. Neither on its own recovers anything.
      requires: ['choose-the-two-stretches', 'compare-the-two-curves'],
      evidence: [{ step: 'compare-the-two-curves', field: 'depthpc' }],
      compare:
        'Set your estimate beside the dip you measured with the companion: the dip got shallower while the period and the shape stayed the same, and that combination is what dilution looks like.',
      type: 'measure',
      title: 'Find the hidden companion',
      body: `You have measured the same planet twice, once clean and once
             blended, and the two depths are in the box above. The ratio of the
             clean depth to the blended depth is 1 + <em>F</em>₂/<em>F</em>₁
             directly, which means this pair of measurements contains the
             companion's brightness even though you never saw it.
             \n\nFrom the ratio below, work out the companion's contrast as a
             magnitude difference, <em>F</em>₂/<em>F</em>₁ = 10<sup>−0.4Δm</sup>,
             and the radius the blended curve would give if you did not know
             about the companion, then the radius once it is corrected for.
             \n\nIn practice you never get the clean measurement: that is the
             whole difficulty, and it is why somebody has to go and take a
             high-resolution image. Here you have both, so you can check that
             the correction does what it claims.`,
      lightCurve: true,
      fields: [
        {
          id: 'd_clean',
          label: 'Depth measured without the companion',
          unit: '',
          decimals: 5,
          compute: (v, e) => e('choose-the-two-stretches', 'depth'),
        },
        {
          id: 'd_blend',
          label: 'Depth measured with the companion',
          unit: '',
          decimals: 5,
          compute: (v, e) => e('compare-the-two-curves', 'depth'),
        },
        {
          id: 'ratio',
          label: 'Depth ratio = 1 + <em>F</em>₂/<em>F</em>₁',
          unit: '',
          decimals: 4,
          compute: v => v.d_clean / v.d_blend,
        },
        {
          id: 'rp_blend',
          label: 'Radius the blended curve implies',
          unit: 'R⊕',
          decimals: 2,
          compute: v => Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198,
        },
        {
          id: 'dm',
          label: 'Companion contrast Δm you infer',
          unit: 'mag',
        },
        {
          id: 'rp_true',
          label: 'Corrected planet radius you infer',
          unit: 'R⊕',
        },
      ],
      validate: v => {
        const ratio = v.d_clean / v.d_blend;
        if (!Number.isFinite(ratio)) return null;
        if (ratio <= 1) {
          return {
            level: 'error',
            message:
              'The blended depth has to be the <em>shallower</em> of the two. Check that both depths were measured on the right curves.',
          };
        }
        if (![v.dm, v.rp_true].every(Number.isFinite)) return null;
        if (Math.abs(ratio - 1.631) > 0.04) {
          return {
            level: 'warn',
            message:
              'The ratio only measures the companion if both depths come from the same part of their floors. Take the middle of each floor, measure again, and the ratio will follow.',
          };
        }
        const dm = -2.5 * Math.log10(ratio - 1);
        const rp =
          Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198 * Math.sqrt(ratio);
        if (Math.abs(v.dm - dm) < 0.02 && Math.abs(v.rp_true - rp) < 0.5) {
          return {
            level: 'ok',
            message:
              'That is the result. The blended curve alone says a smaller planet; the correction takes it back to the radius you found without the companion. The companion in this scene is half a magnitude fainter than its star, and the contrast you inferred should land close to that.',
          };
        }
        if (Math.abs(v.dm - dm) >= 0.02) {
          return {
            level: 'warn',
            message:
              'Check the contrast. The ratio is 1 + F₂/F₁, so subtract one before taking the logarithm: Δm = −2.5 log₁₀(ratio − 1).',
          };
        }
        return {
          level: 'warn',
          message:
            'Check the radius. The correction multiplies the blended radius by the square root of the ratio, not by the ratio itself.',
        };
      },
      tip: 'Notice what the correction does not need: the companion’s distance, its mass, or whether it is even bound to the star. Only how much light it adds.',
    },
    {
      sid: 'what-it-does-to-a',
      bind: TRANSIT_PAIR,
      type: 'question',
      title: 'What it does to a survey',
      kind: 'choice',
      body: `Roughly one Kepler planet host in seven has a neighboring star
             within four arcseconds, and every one of those planets had its radius
             underestimated by some amount between a fraction of a percent and
             40%.`,
      prompt:
        'What is the most important consequence for results drawn from the whole catalog?',
      options: [
        'None: the corrections are small and average out across the sample',
        'Planet radii are systematically too small, so any feature that depends on a radius boundary, such as the count of rocky planets, is biased in one direction',
        'The affected planets are not real and should be discarded',
        'Only the orbital periods are affected, not the radii',
      ],
      answer: 1,
      because:
        'The bias is one-directional: dilution can only ever make a planet look smaller, never larger, so it does not average out. That matters most where a scientific conclusion depends on which side of a line a planet falls: how many rocky planets there are, where the radius valley sits, how many worlds are in a habitable zone. Robo-AO Survey V, working with the companions it could establish were physically bound, found a mean radius correction of 1.77 for those systems, and found hot Jupiters roughly four times more likely to sit in binaries than other planets: a result about planet formation that only exists because somebody imaged the hosts.',
    },
    {
      sid: 'what-you-did-and-where',
      bind: TRANSIT_PAIR,
      type: 'read',
      title: 'What you did, and where it goes next',
      body: `Every radius you found is a ratio to the star, made better
             three times over, and each correction rested on something besides
             the dip: how the star's edge darkens, how the orbit is tilted to
             us, what else shines in the same aperture. A planet's radius is
             only as good as those.
             \n\nTESS, JWST and PLATO are measuring transits now, and behind
             every one of their planets is the follow-up of the last three
             steps: somebody has to look at the host star with a big enough
             telescope to find out what else is there.`,
      tip: 'A note on numbers: the survey results quoted here come from the Robo-AO Kepler Survey and the SOAR TESS Survey, both of which set out to image every planet-candidate host they could reach. The Robo-AO census covers 3,857 Kepler hosts; the SOAR program has observed close to 3,000 TESS targets and finds a median primary-host radius correction of about 1.07, rising to 1.33 for the worst tenth.',
    },
  ],
};

export default TRANSITS;
