// =============================================================================
// The missing mass
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

// --- The Missing Mass --------------------------------------------------------
// The short one. Fifteen steps against the thirty-seven of the exoplanet
// lessons, because it makes a single argument and the argument is short: you
// can weigh a system two ways, by adding up its light and by watching how it
// moves, and for anything bigger than a solar system the two answers do not
// agree.
//
// The order is the historical order, and it is also the pedagogical one. The
// Solar System first, because it is the case where the two answers do agree and
// so it establishes what the method is. Then a galaxy as it would be if the
// light told the truth. Then a galaxy as telescopes actually find it. Then
// Zwicky's cluster, which came first in time and lands harder once a student
// has already seen one system misbehave.
//
// Nothing in this lesson asks a student to believe in dark matter. It asks them
// to make two measurements and notice that they disagree, which is all the
// evidence itself does.

/**
 * The tracers each scene offers, bound by exact name.
 *
 * A rotation curve is a plot of what individual bodies are doing, and the
 * lesson never let a reader look at one of them. Binding a handful of disc
 * stars puts them in the panel's object list, so "the outer stars are moving
 * too fast" becomes a body you can select and a speed you can read - which is
 * the difference between being shown a curve and measuring one.
 */
const SOLAR_TRACERS = {
  sun: { name: 'Sun' },
  mercury: { name: 'Mercury' },
  earth: { name: 'Earth' },
  jupiter: { name: 'Jupiter' },
  neptune: { name: 'Neptune' },
};

/**
 * The cluster steps are deliberately not bound.
 *
 * Zwicky's argument is about the *spread* of a swarm's velocities, not about
 * any one galaxy, and the panel measures the whole swarm. Putting a chip in
 * the list for one of forty members would invite a reader to think the number
 * came from it.
 */

const GALAXY_TRACERS = {
  bulge: { name: 'Galactic bulge' },
  inner: { name: 'Disc star 4' },
  middle: { name: 'Disc star 20' },
  outer: { name: 'Disc star 40' },
};

/**
 * The selected tracer, and where it sits on the curve the panel is fitting.
 *
 * Every number is read live: the radius and speed off the body, the model's
 * prediction off js/rotationCurve.js - the same state the plot is drawn from.
 * The last row is the whole argument of the lesson in one line, for one star
 * the reader chose themselves.
 */
const tracerRows = ctx => {
  const b = ctx.selected;
  if (!b) {
    return [
      {
        id: 'tracer',
        label: 'Tracer',
        value: 'select a disc star, on the canvas or below',
      },
      { id: 'dist', label: 'Its distance from the center', value: '-' },
      { id: 'speed', label: 'Its speed now', value: '-' },
      {
        id: 'pred',
        label: 'Speed the visible mass alone would give',
        value: '-',
      },
      { id: 'ratio', label: 'Measured ÷ predicted', value: '-' },
    ];
  }
  const rc = ctx.rotationCurve();
  const center = rc?.center;
  if (!center)
    return [{ id: 'tracer', label: 'Tracer', value: b.name || 'body' }];
  const { r, v, predicted } = tracerOf(rc, ctx.G, b);
  return [
    { id: 'tracer', label: 'Tracer', value: b.name || 'body' },
    {
      id: 'dist',
      label: 'Its distance from the center',
      value: ctx.distance(r),
    },
    { id: 'speed', label: 'Its speed now', value: ctx.speed(v) },
    {
      id: 'pred',
      label: 'Speed the visible mass alone would give',
      value: Number.isFinite(predicted) ? ctx.speed(predicted) : '-',
    },
    {
      id: 'ratio',
      label: 'Measured ÷ predicted',
      value:
        Number.isFinite(predicted) && predicted > 0
          ? `${(v / predicted).toFixed(2)}×`
          : '-',
      emphasis: true,
    },
  ];
};

/**
 * One body's distance, speed and the speed the visible mass inside its orbit
 * would give: the dashed line on the plot, from the same enclosed mass.
 */
const tracerOf = (rc, G, b) => {
  const c = rc.center;
  const r = Math.hypot(b.pos.x - c.x, b.pos.y - c.y);
  const v = Math.hypot(b.vel.x, b.vel.y);
  const inside = (rc.bodies || []).reduce(
    (m, o) =>
      Math.hypot(o.pos.x - c.x, o.pos.y - c.y) <= r ? m + (o.mass || 0) : m,
    c.mass || 0
  );
  return { r, v, predicted: r > 0 ? Math.sqrt((G * inside) / r) : NaN };
};

/**
 * The ratios of the outer three fifths of the disc (by distance), so that a reading
 * taken from any outer star is accepted: [{r, ratio}] sorted by r.
 */
const outerRatios = ctx => {
  const rc = ctx.rotationCurve();
  if (!rc?.center) return [];
  const all = (rc.bodies || [])
    .map(b => ({ ...tracerOf(rc, ctx.G, b), name: b.name }))
    .filter(x => x.r > 0 && x.predicted > 0)
    .map(x => ({ r: x.r, ratio: x.v / x.predicted }))
    .sort((a, b) => a.r - b.r);
  return all.slice(Math.floor(all.length * 0.4));
};

const DM_SOLAR = {
  scenario: 'Solar System',
  seed: 'missing-mass',
  paused: false,
};

const DM_EXPECTED = {
  scenario: 'Spiral Galaxy',
  seed: 'missing-mass',
  paused: false,
};

const DM_OBSERVED = {
  scenario: 'Milky Way Rotation',
  seed: 'missing-mass',
  paused: false,
};

// Paused, and on a fixed seed, so that every student measuring this cluster
// measures the same cluster. A swarm on randomly oriented orbits changes its
// dispersion and its extent as it moves, and a lesson that asks a class to
// compute a number from a moving target gets thirty different numbers and no
// way to tell a mistake from a moment.
const DM_CLUSTER = {
  scenario: 'Coma Cluster',
  seed: 'zwicky',
  paused: true,
};

// The fit opens with no mass in the disc and none in the halo: the starting
// position is not a guess at the answer. Where a step holds the disc, it holds
// the mass its light implies (the Stars only preset of the instrument), which
// is a premise of the fit; the fit's answer is the halo.
const NEUTRAL_FIT = { discMass: 0, haloVFlat: 0 };
const HELD_DISC = { discMass: 3.3, discScale: 2.6 };

const DARK_MATTER = {
  id: 'missing-mass',
  thumbnail: 'images/scenarios/milky-way-rotation.webp',
  title: 'The Missing Mass',
  subtitle: 'Weigh a system twice, and find the two answers do not agree',
  duration: '45-60 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 28, section: '28.4' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['galaxies', 'gravity'],
  lock: { placement: true, inspector: false, areaSweep: false },
  // A deeper step revised under a new id: its saved answer stays readable as an
  // answer from an earlier version and is never marked against the new step.
  retired: {
    'dark-fraction-with-an-error-bar': {
      to: 'error-bar-from-your-fits',
      release: '3.1',
      was: {
        en: 'Give the ratio of halo mass to visible mass inside 30 kpc as a value with an uncertainty, copying the uncertainty from the step before.',
        es: 'Dar el cociente entre la masa del halo y la masa visible dentro de 30 kpc como un valor con su incertidumbre, copiando la incertidumbre del paso anterior.',
      },
    },
  },
  objectives: [
    'Explain why orbital speed falls as the inverse square root of radius when the mass is concentrated in the middle',
    'Read a rotation curve and describe what its slope says about where the mass is',
    'Convert a measured orbital speed into an enclosed mass, and state what a flat curve implies about how that mass grows with radius',
    'Decompose a rotation curve built from NGC 3198’s published parameters into a stellar disc and a dark halo, and judge a fit against its error bars',
    'Argue from the shape of the residual, not just its size, that no arrangement of visible matter reproduces a flat curve',
    'Apply the virial theorem to a cluster of galaxies to estimate its mass from the motion of its members, including the conversion from a line-of-sight dispersion',
    'Compare a dynamical mass with a visible mass and quantify the discrepancy',
    'Distinguish what these measurements establish from what they do not',
  ],
  steps: [
    // --- Part 1: what the shape of a curve is telling you --------------------
    {
      sid: 'two-ways-to-weigh-a',
      bind: SOLAR_TRACERS,
      type: 'read',
      title: 'Two ways to weigh a thing you cannot touch',
      setup: DM_SOLAR,
      body: `You cannot put a galaxy on a scale. There are two ways to find out
             how much a system in space weighs, and they are completely
             independent of each other.
             \n\nThe first is to <strong>add up what you can see</strong>. Count
             the stars, work out the mass of each from its brightness and color,
             and add. This is what astronomers mean by the visible mass, or the
             luminous mass.
             \n\nThe second is to <strong>watch how things move</strong>. Gravity
             sets the speed of an orbit, so an orbital speed and an orbital
             radius together give you the mass that must be inside. This is the
             dynamical mass.
             \n\nThe two ways are measuring the same thing, so they had better
             agree. This investigation is about three systems. In the first, they do.`,
      tip: 'Open the Rotation Curve panel from the Tools section of the right-hand rail. Leave it open: you will use it for the whole investigation.',
    },
    {
      sid: 'put-the-mass-somewhere',
      bind: SOLAR_TRACERS,
      type: 'explore',
      title: 'Put the mass somewhere',
      tool: { id: 'dm-shapes' },
      body: `Before measuring anything, get a feel for what a rotation curve is
             for. A curve of orbital speed against radius is not a picture of the
             stars. It is a readout of <strong>where the mass is</strong>, and
             nothing else.
             \n\nThis instrument holds the total mass fixed and lets you rearrange
             it. Every one of the four arrangements contains the same amount of
             matter inside 30 kpc. Look at how differently they spin.`,
      checklist: [
        'Press each of the four preset buttons in turn and watch the curve change shape',
        'On "Solar System", note the speed falling away: the outer orbits are the slow ones',
        'On "Uniform ball", drag the spread slider and watch the peak follow the edge of the ball',
        'On "Spiral disc", notice the curve rises, peaks and then falls: still not flat',
        'On "What galaxies do", read the outer slope and compare it with the first preset',
      ],
      tip: 'The "outer slope" number is the exponent in v ∝ rⁿ. Keplerian is −0.5. Flat is 0. It is the single number this whole investigation turns on.',
    },
    {
      sid: 'which-arrangement-gives-a-flat',
      bind: SOLAR_TRACERS,
      type: 'question',
      title: 'Which arrangement gives a flat curve?',
      kind: 'choice',
      tool: { id: 'dm-shapes' },
      body: `You have just tried four ways of arranging the same mass and watched
             the curve each one gives. Go back to the instrument if you want
             another look, then commit to an answer.`,
      prompt: 'A rotation curve stays flat when…',
      options: [
        'the mass is concentrated in the middle',
        'the mass is in a ball with a definite edge',
        'the mass is in a disc that thins out with radius',
        'the mass keeps being added as you go further out',
      ],
      answer: 3,
      because: `Only the fourth. The first three all have something in common: the
                mass runs out somewhere, and past that point going further out
                adds nothing to the total inside your orbit. Once the enclosed
                mass stops growing, the speed has to fall. A flat curve is the
                signature of a mass distribution that has not finished yet, and
                that is a strange thing for a galaxy to be, because galaxies
                visibly do end.`,
    },
    {
      sid: 'the-solar-system-plotted',
      bind: SOLAR_TRACERS,
      type: 'explore',
      title: 'The Solar System, plotted',
      body: `Now a real system, measured live. The panel is plotting one point for
             every body in the Solar System: how far it is from the Sun, across,
             and how fast it is moving, up. Both axes are the real, measured
             values, taken from the simulation this instant. Nothing is fitted.
             \n\nThe dashed red line is the prediction. It is
             √(G·M/r) using only the mass of the objects on screen: what the
             speeds ought to be if the things you can see are all the mass there
             is.
             \n\nThe points sit on the line.`,
      checklist: [
        'Find Mercury at the left-hand end and Neptune at the right',
        'Notice that the inner planets are the fast ones',
        'Check that the measured points follow the dashed prediction across the whole range',
        'Read the "Outer slope" number at the top of the panel',
      ],
      probe: ctx => {
        const rc = ctx.rotationCurve();
        if (!rc || !rc.points.length) {
          return [{ label: 'Rotation curve', value: 'open the panel' }];
        }
        const inner = rc.points[0];
        const outer = rc.points[rc.points.length - 1];
        return [
          { label: 'Bodies plotted', value: String(rc.points.length) },
          {
            label: 'Innermost',
            value: `${ctx.distance(inner.r)} at ${ctx.speed(inner.speed)}`,
          },
          {
            label: 'Outermost',
            value: `${ctx.distance(outer.r)} at ${ctx.speed(outer.speed)}`,
          },
          {
            label: 'Fitted slope',
            value: rc.fit ? rc.fit.exponent.toFixed(3) : '—',
          },
        ];
      },
    },
    {
      sid: 'what-the-slope-means',
      bind: SOLAR_TRACERS,
      type: 'question',
      title: 'What the slope means',
      kind: 'choice',
      body: `The panel reports the slope as a power: speed goes as radius raised
             to some exponent. For the Solar System that exponent is very close
             to −0.5, which is another way of writing v ∝ 1/√r.
             \n\nThat number is not a coincidence and it is not a fit to data.
             It falls straight out of setting the gravitational pull equal to
             what a circular orbit needs: v = √(G·M/r), with M the mass inside
             the orbit.`,
      prompt: 'Speed falls off as 1/√r in the Solar System because…',
      options: [
        'the outer planets are older and have slowed down',
        'almost all the mass is in the Sun, so M inside the orbit stops growing as you go out',
        'gravity gets weaker with distance, and that alone sets the speed',
        'the outer planets are lighter than the inner ones',
      ],
      answer: 1,
      because: `The Sun holds 99.8% of the mass of the Solar System. Past
                Mercury, going further out adds essentially nothing to the mass
                inside the orbit, so M is a constant in v = √(G·M/r) and only the
                r changes. Gravity does weaken with distance, but that is already
                inside the formula: what makes the exponent exactly −0.5 rather
                than something else is the mass staying put. Orbits do not decay
                on their own, and the outer planets are not the lightest ones:
                Jupiter is the heaviest thing here after the Sun.`,
    },

    // --- Part 2: turning a speed into a mass --------------------------------
    {
      sid: 'what-the-speed-tells-you',
      bind: SOLAR_TRACERS,
      type: 'explore',
      title: 'What the speed tells you about the mass',
      tool: { id: 'dm-enclosed' },
      body: `The relation you have been using runs both ways. Written as
             v = √(G·M/r) it predicts a speed from a mass. Rearranged, it does
             something far more useful:
             \n\n<strong>M(&lt;r) = v²·r / G</strong>
             \n\nA speed and a radius give you the mass inside, and the
             calculation says nothing at all about what that mass is made of or
             whether it gives off any light. That is the entire reason this
             method can find something a telescope cannot.
             \n\nThe top plot is a rotation curve. The bottom plot is the same
             measurement rearranged. Drag the radius marker and watch both.`,
      checklist: [
        'Start on "Falling curve" and drag the marker from 2 kpc out to 30',
        'Watch the bottom plot go flat: everything is already inside, so there is nothing left to enclose',
        'Switch to "Flat curve" and drag the marker out again',
        'Watch the bottom plot climb in a straight line, and read the "go out twice as far" row',
        'Switch to "A real galaxy" and compare the orange dashed line with the green one',
      ],
      tip: 'The bottom plot is not a second measurement. It is the top plot with one line of algebra applied to it.',
    },
    {
      sid: 'what-a-flat-curve-requires',
      bind: SOLAR_TRACERS,
      type: 'question',
      title: 'What a flat curve requires',
      kind: 'choice',
      tool: { id: 'dm-enclosed', values: { shape: 1, radius: 10 } },
      body: `Go back to M(&lt;r) = v²·r/G, and this time treat the speed as known
             and the mass as the unknown. Suppose v has the same value at every
             radius.
             \n\nWork out how the mass inside, M(&lt;r), has to change as r grows,
             before you drag the marker in the instrument.`,
      prompt: 'A flat rotation curve means that as you go further out…',
      options: [
        'the enclosed mass stops growing',
        'the enclosed mass keeps growing, in proportion to the radius',
        'gravity stops obeying the inverse square law',
        'the stars have too much angular momentum to fall in',
      ],
      answer: 1,
      because: `The enclosed mass has to keep growing, and specifically it has to
                grow in proportion to r. Double the radius and you have to double
                the mass inside to hold the speed constant. Out where the disc
                has run out of stars there is nothing visible left to supply it,
                yet the speed does not drop. Something out there is still adding
                mass. Modifying gravity is a real alternative and people have
                proposed it, but it is a different claim from this one and it is
                not what this measurement shows on its own.`,
    },
    {
      sid: 'measure-the-enclosed-mass-yourself',
      bind: SOLAR_TRACERS,
      type: 'measure',
      title: 'Measure the enclosed mass yourself',
      tool: { id: 'dm-enclosed', values: { shape: 1, radius: 5 } },
      body: `Set the instrument to <strong>Flat curve</strong> and read the
             enclosed mass off the bottom plot at four radii. Then switch to
             <strong>Falling curve</strong> and read it once more, at 30 kpc, for
             the contrast.
             \n\nEvery number is in units of 10¹⁰ solar masses, which is what the
             readout gives you. Type the mantissa: for 5.23 × 10¹⁰, type 5.23.`,
      fields: [
        {
          id: 'flat5',
          label: 'Flat curve: mass inside 5 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat10',
          label: 'Flat curve: mass inside 10 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat20',
          label: 'Flat curve: mass inside 20 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat30',
          label: 'Flat curve: mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'kep30',
          label: 'Falling curve: mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
      ],
      plot: {
        title: 'Your four measurements',
        xLabel: 'radius  (kpc)',
        yLabel: 'mass inside  (10¹⁰ M☉)',
        height: 190,
        points: v =>
          [5, 10, 20, 30].map(r => ({
            x: r,
            y: v[`flat${r}`],
            label: `${r}`,
          })),
        note: `Four points on a straight line through the origin. That is what
               "proportional to radius" looks like, and it is what the flat curve
               forces. Compare your last number: on the falling curve the mass
               inside 30 kpc is the same as the mass inside 10, because there is
               nothing out there.`,
      },
      tip: 'The radius slider stops at 30 kpc, which is about as far out as a real rotation curve can be measured before there is nothing left bright enough to see.',
    },

    // --- Part 3: the galaxy we expected, and the galaxy we found -------------
    {
      sid: 'now-a-galaxy',
      bind: GALAXY_TRACERS,
      type: 'predict',
      reveal: 'measure-the-expected-curve',
      title: 'Now a galaxy',
      setup: DM_EXPECTED,
      body: `A spiral galaxy is a disc of stars with a dense bulge in the
             middle, and most of its light comes from that bulge and the inner
             disc.
             \n\nThis scenario holds such a galaxy: a bulge and ninety
             disc stars, each on a circular orbit around the center.
             \n\nBefore you look at the panel, commit to an answer.`,
      prompt: 'The rotation curve of this galaxy will…',
      options: [
        'fall off as 1/√r, like the Solar System',
        'stay flat all the way out',
        'rise with radius',
        'have no particular shape',
      ],
      answer: 0,
      because: `It falls off as 1/√r. This galaxy was built on exactly one
                assumption: every star was launched at the speed the visible
                mass says it should have. The reasoning is then the same as for
                the Solar System and so is the answer: with most of the mass in
                the middle, the mass enclosed by an orbit stops growing once you
                are outside the bulge. This scenario is the prediction, drawn out
                in full. The next one is what telescopes actually find.`,
    },
    {
      sid: 'measure-the-expected-curve',
      bind: GALAXY_TRACERS,
      allowInspector: true,
      // The same readout on the scenario where the prediction holds, so the
      // comparison two screens later is between two measurements the reader
      // made the same way rather than between a measurement and a claim.
      probe: tracerRows,
      type: 'measure',
      title: 'Measure the expected curve',
      body: `Read the panel. The shaded strip on the left of the plot is the
             inner region, which is excluded from the fit: inside the bulge the
             curve rises with radius for reasons that have nothing to do with
             this investigation, and including it would drag the slope towards zero.
             \n\nRecord the slope and the shape the panel reports.`,
      fields: [
        { id: 'exp_slope', label: 'Outer slope (the exponent)', unit: '' },
        {
          id: 'exp_shape',
          label: 'Shape reported by the panel',
          unit: '',
          kind: 'text',
        },
        { id: 'exp_visible', label: 'Visible mass', unit: 'M☉' },
      ],
      tip: 'The slope will not be exactly −0.500 the way the Solar System’s was. The disc carries some mass of its own, so the enclosed total does keep growing a little.',
    },
    {
      sid: 'what-rubin-and-ford-found',
      bind: GALAXY_TRACERS,
      type: 'read',
      title: 'What Rubin and Ford found',
      setup: DM_OBSERVED,
      body: `Through the 1960s and 1970s Vera Rubin and Kent Ford measured
             rotation curves of spiral galaxies, starting with Andromeda. Their
             instrument was a spectrograph: light from the approaching side of a
             galaxy is blueshifted, light from the receding side is redshifted,
             and the size of the shift gives the orbital speed at that radius.
             \n\nThey expected the curve to fall. It did not. In galaxy after
             galaxy the speed climbed out of the bulge, levelled off, and then
             simply stayed there, as far out as there was anything bright enough
             to measure.
             \n\nThis scenario is that result. Same disc, same visible mass, same
             number of stars. Every star is now moving at the speed a real galaxy
             gives, which is the same speed at every radius.`,
      tip: 'Look at the plot. The dashed red line has not moved: that is still the prediction from the visible mass. The points have.',
    },
    {
      sid: 'measure-the-real-curve',
      bind: GALAXY_TRACERS,
      allowInspector: true,
      type: 'measure',
      title: 'Measure the real curve',
      body: `Record what the panel reports now. The visible mass is unchanged
             from the previous scenario, so any difference is in the motion and
             not in the bookkeeping.
             \n\nThen take one star as a case. Select an outer disc star, from
             the canvas or from the list below. The readout gives how fast it is
             actually moving, how fast the visible mass inside its orbit says it
             should be moving, and the ratio between the two. Press
             <strong>Take reading</strong> beside the last field to record that
             ratio for the star you chose. Any outer star will do; take a second
             one and compare.`,
      probe: tracerRows,
      fields: [
        { id: 'obs_slope', label: 'Outer slope (the exponent)', unit: '' },
        {
          id: 'obs_shape',
          label: 'Shape reported by the panel',
          unit: '',
          kind: 'text',
        },
        {
          id: 'obs_gap',
          label:
            'For the star you selected: its speed divided by the speed the visible mass predicts',
          unit: '×',
          source: { probe: 'ratio' },
        },
      ],
      validate: (v, ctx) => {
        if (!Number.isFinite(v.obs_gap)) return null;
        const outer = outerRatios(ctx);
        if (!outer.length) return null;
        const ratios = outer.map(o => o.ratio);
        const lo = Math.min(...ratios);
        const hi = Math.max(...ratios);
        if (v.obs_gap < lo * 0.9 || v.obs_gap > hi * 1.1) {
          return {
            level: 'warn',
            message:
              'That is not the ratio of any outer disc star in this scene. Select one star, from the canvas or the list, and press Take reading beside this field.',
          };
        }
        return {
          level: 'ok',
          message: `That is a reading for one star. The outer stars in this scene run from ${Math.round(lo * 10) / 10} to ${Math.round(hi * 10) / 10} times the prediction, so a second star gives a different number: what do they have in common?`,
        };
      },
    },

    // --- Part 4: do what the astronomers actually do -------------------------
    //
    // Every fit step opens neutral: the halo at zero and, until the step that
    // holds the disc at what the light implies, the disc at zero too.
    {
      sid: 'now-do-what-the-astronomers',
      bind: GALAXY_TRACERS,
      type: 'read',
      title: 'Now do what the astronomers did',
      tool: { id: 'dm-fit', values: NEUTRAL_FIT, presets: false },
      body: `Measuring a flat curve is the easy half. The hard half, and the one
             that took the 1970s and 1980s to settle, is working out what mass
             distribution could possibly produce it — and showing that no
             arrangement of the visible matter will do.
             \n\nThat is a fitting problem, and it is what this instrument is.
             The pink points with error bars are a rotation curve built from
             NGC 3198's published parameters, with a fixed scatter added. They
             are not a measurement, and that is what gives the fit a right
             answer. The sliders are a model of the galaxy: a disc of stars,
             and a halo of something else. Your job is to reproduce the points.
             \n\nThe rules are the ones a real astronomer works under. You may
             choose how much mass the disc has and how spread out it is, because
             neither is known precisely from the light alone. You may not move the
             data.`,
      tip: 'The panel scores you: "average miss" is how far your curve sits from the points, in km/s, and it states how good the data itself is beside it. Get under that and the plot says FITTED.',
    },
    {
      sid: 'try-it-with-stars-alone',
      bind: GALAXY_TRACERS,
      type: 'explore',
      title: 'Try it with stars alone',
      tool: {
        id: 'dm-fit',
        values: NEUTRAL_FIT,
        hide: ['haloVFlat', 'haloCore'],
        presets: false,
      },
      body: `The halo is switched off and hidden, and the disc starts with no
             mass at all. You have two sliders: how much mass is in the disc,
             and how far it is spread. Both are genuinely uncertain in a real
             galaxy, so this is a fair fight.
             \n\nTry to fit the curve. Really try — the point of this step is not
             to fail quickly.`,
      checklist: [
        'Raise the disc mass from zero and watch where the model sits against the points at the inner end and at the outer end',
        'Move the mass up and down to match the inner points, then the outer points, and look at what happens to the other end each time',
        'Try spreading the disc out with the scale-length slider, and then squeezing it in',
        'Find the best "average miss" you can manage, and write down what it is',
      ],
      tip: 'A heavier disc lifts the whole curve. A wider disc moves its peak outward and flattens it a little.',
    },
    {
      sid: 'record-your-best-stars-only',
      bind: GALAXY_TRACERS,
      // It records the best stars-only fit, which is the fit made there.
      requires: ['try-it-with-stars-alone'],
      type: 'measure',
      title: 'Record your best stars-only fit',
      tool: {
        id: 'dm-fit',
        values: NEUTRAL_FIT,
        hide: ['haloVFlat', 'haloCore'],
        presets: false,
      },
      body: `Whatever your best attempt was, record it. This is a real result and
             it is worth having in your own handwriting: it is the number that
             rules out the obvious explanation. The instrument here starts empty
             again, so bring it back to your best fit before you read it.`,
      fields: [
        { id: 'so_rms', label: 'Best average miss you achieved', unit: 'km/s' },
        { id: 'so_disc', label: 'Disc mass that gave it', unit: '× 10¹⁰ M☉' },
        {
          id: 'so_worst',
          label: 'Radius where the model missed worst',
          unit: 'kpc',
        },
        {
          id: 'so_sign',
          label: 'At that radius, was your model too fast or too slow?',
          unit: '',
          kind: 'text',
        },
      ],
      tip: 'Compare your average miss with the error bars the readout quotes for the data. A fit has to get inside those before it can be called a fit.',
    },
    {
      sid: 'why-a-heavier-disc-cannot',
      bind: GALAXY_TRACERS,
      type: 'question',
      title: 'Why a heavier disc cannot rescue it',
      kind: 'choice',
      tool: {
        id: 'dm-fit',
        values: NEUTRAL_FIT,
        hide: ['haloVFlat', 'haloCore'],
        presets: false,
      },
      body: `Look back over your own attempts. Each change to the disc moved the
             model at the inner end and at the outer end of the curve, and you
             saw where it stopped matching the points.`,
      prompt: 'No disc, at any mass, fits the whole curve because…',
      options: [
        'a disc cannot hold enough mass to matter',
        'the shortfall is not just an amount, it is the wrong shape: the data needs mass added where the light is not',
        'the outer measurements are less reliable than the inner ones',
        'discs are two-dimensional and galaxies are three-dimensional',
      ],
      answer: 1,
      because: `The problem is the shape of the shortfall, not its size. A disc's
                contribution peaks a couple of scale lengths out and then declines,
                because that is where its mass is. The data does not decline. To
                fix the outer curve without wrecking the inner one you need mass
                that is <em>negligible in the middle and dominant at the edge</em>,
                which is the opposite of how light is distributed in every spiral
                ever photographed. A disc can be made heavier; it cannot be made
                to have that shape. In a real galaxy the outer points are, if
                anything, measured more reliably than the inner ones, because
                they come from cold hydrogen gas that extends well beyond the
                stars.`,
    },
    {
      sid: 'now-add-the-halo',
      bind: GALAXY_TRACERS,
      type: 'explore',
      title: 'Now add the halo',
      // The disc is held at what its light implies, a premise of the fit and not
      // its answer; the halo opens at zero with a core that is neither end of
      // the range that fits.
      tool: {
        id: 'dm-fit',
        values: { ...HELD_DISC, haloVFlat: 0, haloCore: 10.5 },
        hide: ['discMass', 'discScale'],
        presets: false,
      },
      body: `Two more sliders, controlling a component that is not made of stars.
             The halo's flat speed sets how much of it there is; its core radius
             sets how quickly it takes over from the disc.
             \n\nThe disc is held at the mass its light implies, which the
             readout gives as the visible mass; the light fixes it to about
             20%, so it is not yours to move in this step. Get the plot to say
             FITTED.`,
      checklist: [
        'Raise the halo strength from zero and watch how the outer curve responds, and how the inner curve responds',
        'Adjust the core radius and watch how the two components hand over',
        'Drive the average miss below the data’s own error bars and read the FITTED marker',
        'Read the last row: how much dark mass there is for every unit of visible mass',
      ],
      tip: 'The halo has to be negligible in the middle and keep growing outward, which is why the pseudo-isothermal profile is used. Nothing made of stars does that.',
    },
    {
      sid: 'record-the-fit-that-works',
      bind: GALAXY_TRACERS,
      // It records the model that fitted, which is the one built there.
      requires: ['now-add-the-halo'],
      type: 'measure',
      title: 'Record the fit that works',
      tool: {
        id: 'dm-fit',
        values: { ...HELD_DISC, haloVFlat: 0, haloCore: 10.5 },
        hide: ['discMass', 'discScale'],
        presets: false,
      },
      body: `Write down the model that fitted. These numbers are a
             decomposition of a galaxy, and they are the same ones a
             published rotation-curve paper reports. The instrument here starts
             without a halo again, so bring it back to your fit before you read
             it.`,
      fields: [
        { id: 'fit_vflat', label: 'Halo flat speed', unit: 'km/s' },
        { id: 'fit_core', label: 'Halo core radius', unit: 'kpc' },
        { id: 'fit_rms', label: 'Average miss', unit: 'km/s' },
        { id: 'fit_visible', label: 'Visible mass', unit: '× 10¹⁰ M☉' },
        {
          id: 'fit_halo',
          label: 'Halo mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
      ],
      tip: 'There is a genuine degeneracy between the two halo sliders: different pairs fit almost equally well, which is why real papers quote them together with a covariance.',
    },
    {
      sid: 'compare-your-two-fits',
      bind: GALAXY_TRACERS,
      requires: ['record-your-best-stars-only', 'record-the-fit-that-works'],
      type: 'measure',
      title: 'Your two fits, side by side',
      body: `You saved two fits: your best with stars alone, and your fit with
             the halo. The table below is copied from what you recorded, nothing
             else, so the two sit in one place.
             \n\nThe data is good to a few km/s at each point, and the
             instrument states how many. Say which of your two fits describes
             the points within that, and what in the table tells you so.`,
      fields: [
        {
          id: 'cmp_so_rms',
          label: 'Stars only: average miss',
          unit: 'km/s',
          compute: (v, e) => e('record-your-best-stars-only', 'so_rms'),
          decimals: 1,
        },
        {
          id: 'cmp_so_disc',
          label: 'Stars only: disc mass (× 10¹⁰ M☉)',
          unit: '',
          compute: (v, e) => e('record-your-best-stars-only', 'so_disc'),
          decimals: 1,
        },
        {
          id: 'cmp_halo_rms',
          label: 'With the halo: average miss',
          unit: 'km/s',
          compute: (v, e) => e('record-the-fit-that-works', 'fit_rms'),
          decimals: 1,
        },
        {
          id: 'cmp_halo_disc',
          label: 'With the halo: visible mass (× 10¹⁰ M☉)',
          unit: '',
          compute: (v, e) => e('record-the-fit-that-works', 'fit_visible'),
          decimals: 2,
        },
        {
          id: 'cmp_halo_mass',
          label: 'With the halo: halo mass inside 30 kpc (× 10¹⁰ M☉)',
          unit: '',
          compute: (v, e) => e('record-the-fit-that-works', 'fit_halo'),
          decimals: 1,
        },
        {
          id: 'cmp_which',
          label: 'Which fit describes the points, and what tells you so?',
          unit: '',
          kind: 'text',
        },
      ],
    },
    {
      hints: [
        'The headline number is a ratio of two masses, both given by the fit panel.',
        'Divide the halo mass by the visible mass: the answer is how many times heavier the halo is.',
      ],
      feedback: {
        close:
          'Close. Divide the halo mass by the visible mass, both in the same units.',
        off: 'The ratio compares the halo with what you can see: halo on top, visible below.',
      },
      sid: 'how-much-of-it-is',
      bind: GALAXY_TRACERS,
      type: 'question',
      title: 'How much of it is dark?',
      kind: 'numeric',
      tool: {
        id: 'dm-fit',
        values: { ...HELD_DISC, haloVFlat: 0, haloCore: 10.5 },
        hide: ['discMass', 'discScale'],
        presets: false,
      },
      body: `You fitted a galaxy. Divide the halo mass inside 30 kpc by the
             visible mass, both as you recorded them for your own fit, and you
             have the headline number of forty years of galaxy dynamics.
             \n\nUse the numbers of the fit you recorded: the answer counts when it
             agrees with the ratio of a fit that works.`,
      prompt: 'Halo mass inside 30 kpc, divided by visible mass',
      unit: '×',
      answer: 3.4,
      tolerance: 0.9,
      because: `About three and a half. With the disc held at the mass its light
                implies, every fit that reaches FITTED gives a ratio between
                about 2.9 and 3.9, because the two halo sliders trade off against
                each other; the published decomposition, a halo flat speed of
                150 km/s, a core of 6 kpc and an average miss of 2 km/s, gives
                3.4, in the middle. Roughly three-quarters of the mass inside
                the visible extent of this galaxy is in something that gives off
                no light — and the fraction keeps climbing if you measure further
                out, because the halo's mass keeps growing while the disc's does
                not. Note carefully what this is and is not: it is a mass you
                measured from motion, minus a mass you measured from light. It is
                not a claim about what the difference is made of.`,
    },

    // --- Part 5: what the halo actually does --------------------------------
    {
      sid: 'what-the-halo-is-holding',
      bind: GALAXY_TRACERS,
      type: 'explore',
      title: 'What the halo is holding',
      tool: { id: 'dm-flyby' },
      body: `A halo is a term in the force law. It has no position, it is not an
             object, and it is not drawn on the simulation, which makes it easy to
             suspect it of being a bookkeeping trick.
             \n\nIt is not. Here is a single star, launched on a circular orbit at
             the speed a real galaxy gives it at that radius. Watch it hold its
             orbit, then take the halo away while it runs.`,
      checklist: [
        'Press Run and watch the star complete an orbit with the halo on',
        'Compare the two speeds in the readout: the launch speed, and the speed the visible disc alone could hold',
        'Now drag the halo slider to OFF, without touching anything else',
        'Watch the star leave. It has not been given any extra energy: the mass holding it was removed',
        'Try relaunching at 8 kpc with the halo off, where the disc still dominates, and see it stay',
      ],
      tip: 'This is exactly the situation the flat rotation curve presents. Real stars at 20 kpc really are moving at this speed, and the visible mass really cannot hold them.',
    },
    {
      sid: 'predict-the-disc-without-its-halo',
      bind: GALAXY_TRACERS,
      type: 'predict',
      reveal: 'take-the-halo-away-from',
      title: 'What happens to the disc without its halo?',
      setup: DM_OBSERVED,
      body: `The galaxy on the canvas has ninety disc stars and a halo that is
             switched on. The stars are moving at the speeds you measured.
             \n\nYou are about to switch the halo off, and nothing else, and let
             the simulation run. Before you do, commit to what the disc will do.`,
      prompt: 'With the halo switched off, the disc will…',
      options: [
        'keep orbiting as before: the stars were already moving, and nothing touches them directly',
        'fall inward toward the bulge, because there is less mass holding the galaxy together',
        'drift outward onto wider paths, and most of the disc comes apart; only the stars deep in the bulge’s pull stay near it',
        'speed up and spin faster, because nothing is pulling on the stars from outside',
      ],
      answer: 2,
      because: `The stars keep the speed they had, but the pull that held them at
                that speed is gone, so they move out onto wider paths. The halo
                supplies most of the mass at large radius and very little near the
                center, so only the stars close to the bulge keep a pull strong
                enough to hold them; the rest drift away. Taking
                away mass reduces the pull; it does not add one, which is why the
                disc does not fall inward, and a star that is not pulled harder
                does not speed up.`,
    },
    {
      sid: 'take-the-halo-away-from',
      bind: GALAXY_TRACERS,
      type: 'explore',
      title: 'Take the halo away from the whole galaxy',
      setup: DM_OBSERVED,
      body: `Now the same experiment on ninety stars at once, in the live
             simulation rather than a model panel.
             \n\nThis scenario has a dark-matter halo switched on, and the panel
             draws it as the solid blue line the points are sitting on. Switch it
             off with the toggle in the panel and watch what happens to the disc.`,
      checklist: [
        'Switch the Dark matter halo toggle off and let the simulation run',
        'Watch the stars begin to drift outward: at these speeds the visible mass cannot hold them',
        'Watch the measured points climb away from the solid line and the disc come apart',
        'Switch the halo back on and reload the scenario to restore it',
      ],
      probe: ctx => {
        const rc = ctx.rotationCurve();
        if (!rc) return [{ label: 'Rotation curve', value: 'open the panel' }];
        const outer = rc.points.length ? rc.points[rc.points.length - 1] : null;
        return [
          { label: 'Halo', value: ctx.haloOn() ? 'On' : 'Off' },
          {
            label: 'Outermost star',
            value: outer ? ctx.distance(outer.r) : '—',
          },
          {
            label: 'Slope',
            value: rc.fit ? rc.fit.exponent.toFixed(3) : '—',
          },
        ];
      },
      tip: 'The stars do not stop suddenly. They keep the speed they had and simply stop being held, so the disc comes apart everywhere the bulge cannot hold it.',
    },

    // --- Part 6: Zwicky got there first -------------------------------------
    {
      sid: 'forty-years-earlier',
      type: 'read',
      title: 'Forty years earlier',
      setup: DM_CLUSTER,
      body: `Rubin and Ford were not the first. In 1933 Fritz Zwicky pointed a
             spectrograph at the Coma Cluster, a swarm of about a thousand
             galaxies, and measured how fast its members were moving relative to
             each other.
             \n\nA cluster is not a disc. Its members are on long, randomly
             oriented orbits, so there is no rotation to plot: what there is
             instead is a spread of speeds. But the same logic applies. A bound
             system's members move at speeds set by the mass holding them, so the
             spread of speeds gives the mass.
             \n\nZwicky did the arithmetic, compared the answer with the light of
             the galaxies, and found the two out by a factor of several hundred.
             He named the excess <em>dunkle Materie</em>. Almost nobody took it
             seriously for four decades.
             \n\nThis cluster is paused, so that everyone measuring it measures
             the same thing.`,
      tip: 'The panel now shows a Cluster measurements block. A rotation curve is the wrong instrument for a swarm; those three numbers are the right one.',
    },
    {
      sid: 'zwicky-s-arithmetic-and-the',
      type: 'explore',
      title: 'Zwicky’s arithmetic, and the two ways to get it wrong',
      tool: { id: 'dm-virial' },
      body: `Before doing it on the simulated cluster, do it on the real one. This
             instrument holds the actual Coma Cluster: a measured line-of-sight
             velocity spread of about 1000 km/s across a radius of about 1.4 Mpc,
             against the mass of its galaxies and of the hot gas between them.
             \n\nThe virial theorem is the tool:
             \n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>
             \n\nThe only difficulty in the whole calculation is the step from a
             measured σ to ⟨v²⟩, and there are two classic ways to get it wrong.
             Both are on the third slider. Try them.`,
      checklist: [
        'Start on "Coma, done right" and read the two bars against each other',
        'Switch to "Forget the factor of 3" and watch the mass fall by exactly three',
        'Switch to "Forget to square it" and watch the discrepancy disappear entirely',
        'Go back to the correct setting and drag the σ slider: notice the mass goes as σ², not σ',
        'Note how much of the visible mass is hot gas rather than galaxies',
      ],
      tip: 'A spectrograph measures one component of a velocity, not three. If the orbits are randomly oriented, each direction carries an equal share, so ⟨v²⟩ = 3σ². That factor of three is the step everyone drops.',
    },
    {
      sid: 'measure-the-simulated-cluster',
      type: 'measure',
      title: 'Measure the simulated cluster',
      body: `Now a scale model of a cluster, built in the simulation: the same
             kind of swarm, with its own small masses, not the real Coma
             Cluster. It is paused, so everyone measures the same thing.
             \n\nFirst open the <strong>Rotation Curve</strong> panel, with the
             Rotation Curve button in the Instruments group of the Tools section
             of the rail on the right. If the panel is closed or the Tools section
             is folded, open it again from there. Its Cluster measurements block
             holds the numbers.
             \n\nThen switch to <strong>simulation units</strong> with the unit
             button in the View group of the same section: it reads Physical
             units now, and Sim units when you have switched, and the U key does
             the same. That is not cosmetic. In the app's own units the
             gravitational constant G is exactly 1, so the arithmetic below has no
             unit conversions in it at all, and a mass comes out directly in
             simulation mass units.
             \n\nRecord the three numbers.`,
      fields: [
        { id: 'cl_n', label: 'Number of member galaxies', unit: '' },
        {
          id: 'cl_sigma',
          label: 'Speed spread σ',
          unit: 'simulation units per time',
        },
        { id: 'cl_R', label: 'Cluster radius R', unit: 'simulation units' },
        {
          id: 'cl_visible',
          label: 'Visible mass: the galaxies themselves',
          unit: 'M☉',
        },
      ],
      tip: 'One thousand simulation mass units is one solar mass, which is the conversion you will need at the end.',
    },
    {
      hints: [
        'Use 2K + U = 0, with the kinetic energy written from the spread of the speeds.',
        'Solve for M: it comes out as a constant times the speed spread squared times the size, divided by G.',
      ],
      feedback: {
        close:
          'Close. Check the factor in front: it comes from 2K + U = 0 with the speeds’ spread.',
        off: 'Rearrange the virial relation for M; the speed spread enters squared and the size enters once.',
        'wrong-order-of-magnitude':
          'A power of ten out; check the units of the size and of the speed.',
      },
      sid: 'weigh-the-cluster-by-its',
      type: 'question',
      title: 'Weigh the cluster by its motion',
      kind: 'numeric',
      body: `This is the scale-model cluster, so the mass you get is the model's own.
             \n\nFor any system held together by its own gravity and settled down,
             the kinetic and potential energies are locked in a fixed ratio:
             2K + U = 0. This is the virial theorem, and it is what turns a
             spread of speeds into a mass.
             \n\nWrite the kinetic energy as K = ½·M·⟨v²⟩, and take the potential
             energy of a uniform sphere, U = −(3/5)·G·M²/R. Substitute, cancel one
             factor of M, and rearrange:
             \n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>
             \n\nThe simulation is planar, so its velocities are spread over two
             dimensions rather than three, and the spread the panel reports is
             already the full two-dimensional one rather than a line-of-sight
             projection. So ⟨v²⟩ is simply σ², and in simulation units G is 1 and
             drops out. That leaves M = (5/3)·R·σ², which gives a mass in
             simulation units. Divide by 1000 to turn it into solar masses.`,
      tip: 'The uniform-sphere assumption is an approximation and the estimator is only good to a factor of order one. That is enough: the discrepancy you are about to find is far larger than the error in the method, which is exactly why the result survived.',
      prompt:
        'The dynamical mass of the cluster, in solar masses (this is a scale model, so treat the number as the model’s own)',
      unit: 'M☉',
      answer: 1756,
      tolerance: 180,
      because: `σ = 20.46 and R = 2516, so ⟨v²⟩ = 418.7 and
                M = (5/3) × 2516 × 418.7 = 1.76 × 10⁶ simulation mass units,
                which is 1756 solar masses in this model. If you got something a
                thousand times larger you forgot to convert; if you got something
                near 84,000 you used σ rather than σ².`,
    },
    {
      hints: [
        'Both masses are already worked out in this step and the one before.',
        'Divide the dynamical mass by the visible mass.',
      ],
      feedback: {
        close: 'Close. Dynamical mass on top, visible mass below.',
        off: 'The ratio compares the mass from the motions with the mass you can add up.',
      },
      sid: 'now-compare',
      type: 'question',
      title: 'Now compare',
      kind: 'numeric',
      body: `You have weighed the same scale-model cluster twice. Once by adding up its
             galaxies, which is the visible mass the panel reports, and once by
             watching how those galaxies move.`,
      prompt: 'Dynamical mass divided by visible mass',
      unit: '×',
      answer: 18.3,
      tolerance: 4,
      because: `About eighteen, for this scale model. The galaxies you can see account for roughly one
                twentieth of the mass needed to hold the cluster together at the
                speeds its members are actually moving. Zwicky's own figure for
                Coma was larger still, partly because the distance scale of the
                universe was wrong in 1933 and partly because he had no way to
                count the hot gas between the galaxies, which turns out to carry
                several times more mass than the galaxies do. The modern figure
                for Coma is around a factor of ten once that gas is included —
                which is the number the instrument two steps back reports.`,
    },

    // --- Part 7: what this does and does not establish ----------------------
    {
      sid: 'what-have-you-actually-shown',
      type: 'question',
      title: 'What have you actually shown?',
      kind: 'short',
      body: `You have made three measurements now, in two kinds of system, using
             two different methods: you fitted a galaxy's rotation curve and found
             no arrangement of its stars would do, and you weighed a cluster by
             its motion and found eighteen times more mass than the visible galaxies account for. Both say the
             same thing.
             \n\nBe careful about what follows from that.`,
      prompt:
        'In two or three sentences: what do these measurements establish, and what do they not establish? Name at least one thing other than a new kind of particle that could in principle explain them.',
      rubric: `They establish a discrepancy between mass inferred from motion and
               mass inferred from light, in systems larger than a planetary
               system. They do not establish what the extra mass is made of, or
               that it is made of anything at all. Credit any of: ordinary matter
               that is simply too faint to count (cold gas, dim stars, black
               holes, free-floating planets - collectively MACHOs), which was the
               leading hypothesis for decades and is now ruled out for most of the
               mass by microlensing surveys and by the abundances of light
               elements from big bang nucleosynthesis; or a modification of
               gravity on large scales, such as MOND, which fits rotation curves
               well and clusters poorly. Strong answers note that the two
               measurements here are independent of each other, which is what
               makes an error in either one an unlikely explanation, and that the
               rotation-curve result is a statement about the <em>shape</em> of the
               missing mass and not only its amount.`,
    },
    {
      sid: 'how-much-of-the-universe',
      type: 'read',
      title: 'How much of the universe is this?',
      tool: { id: 'dm-budget' },
      body: `You have been working on one galaxy and one cluster. It is fair to
             ask what the accounting looks like for everything.
             \n\nStep through the four layers. Each one takes the slice you were
             looking at and asks what it is made of.`,
      tip: 'The last layer is the one to sit with. Every star, nebula and galaxy ever photographed, in every wavelength, is about half a percent of the universe.',
    },
    {
      sid: 'where-it-stands',
      type: 'read',
      title: 'Where it stands',
      body: `The evidence has grown a great deal since 1933 and since 1970, and
             it no longer rests on rotation curves at all. The pattern of hot and
             cold spots in the cosmic microwave background, the way galaxies are
             distributed across the sky, how gravitational lensing bends light
             around clusters, and the abundances of hydrogen and helium left over
             from the first few minutes all point the same way, and they are
             sensitive to different things. Ordinary matter that happens to be
             dark cannot account for what they show; there has to be something
             that has mass and does not interact with light.
             \n\nWhat that something is, nobody knows. It has never been detected
             in a laboratory, no candidate particle has been found, and searches
             have been running for forty years. The Bullet Cluster, where two
             clusters passed through each other and the mass visibly separated
             from the gas, is the single hardest observation for modified-gravity
             alternatives to accommodate.
             \n\nThat is an honest place to leave it. The measurement is solid and
             has been repeated in a dozen independent ways. The explanation is a
             name for something we have not identified. Those are different kinds
             of statement and it is worth keeping them apart.`,
      tip: 'You fitted a curve built from a real galaxy’s published parameters and weighed a scale model of a cluster. The numbers came from the literature; the conclusion you reached yourself, without taking anyone’s word for it.',
    },
  ],
};

export default DARK_MATTER;
