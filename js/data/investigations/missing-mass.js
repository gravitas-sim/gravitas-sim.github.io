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

const DARK_MATTER = {
  id: 'missing-mass',
  thumbnail: 'images/scenarios/milky-way-rotation.webp',
  title: 'The Missing Mass',
  subtitle: 'Weigh a system twice, and find the two answers do not agree',
  duration: '45-60 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'There are two ways to weigh a system in space: add up the light, or watch how things move. For the Solar System the two agree. For a galaxy they do not, and for a cluster of galaxies they are out by more than a factor of ten. Students arrange mass and watch the rotation curve it makes, turn a measured speed into an enclosed mass, then take a real galaxy’s curve and try to fit it with stars alone — and fail, in the specific way the field failed for a decade, before adding a halo and getting it right. It closes on Zwicky’s cluster and the mass budget of the universe. It is how dark matter was found, and it is a measurement rather than a theory.',
  objectives: [
    'Explain why orbital speed falls as the inverse square root of radius when the mass is concentrated in the middle',
    'Read a rotation curve and describe what its slope says about where the mass is',
    'Convert a measured orbital speed into an enclosed mass, and state what a flat curve implies about how that mass grows with radius',
    'Decompose a measured rotation curve into a stellar disc and a dark halo, and judge a fit against the measurement errors',
    'Argue from the shape of the residual, not just its size, that no arrangement of visible matter reproduces a flat curve',
    'Apply the virial theorem to a cluster of galaxies to estimate its mass from the motion of its members, including the conversion from a line-of-sight dispersion',
    'Compare a dynamical mass with a visible mass and quantify the discrepancy',
    'Distinguish what these measurements establish from what they do not',
  ],
  steps: [
    // --- Part 1: what the shape of a curve is telling you --------------------
    {
      type: 'read',
      title: 'Two ways to weigh a thing you cannot touch',
      setup: DM_SOLAR,
      body: `You cannot put a galaxy on a scale. There are two ways to find out
             how much a system in space weighs, and they are completely
             independent of each other.
             \n\nThe first is to <strong>add up what you can see</strong>. Count
             the stars, work out the mass of each from its brightness and colour,
             and add. This is what astronomers mean by the visible mass, or the
             luminous mass.
             \n\nThe second is to <strong>watch how things move</strong>. Gravity
             sets the speed of an orbit, so an orbital speed and an orbital
             radius together give you the mass that must be inside. This is the
             dynamical mass.
             \n\nThe two ways are measuring the same thing, so they had better
             agree. This lesson is about three systems. In the first, they do.`,
      tip: 'Open the Rotation Curve panel from the Tools section of the right-hand rail. Leave it open: you will use it for the whole lesson.',
    },
    {
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
      tip: 'The "outer slope" number is the exponent in v ∝ rⁿ. Keplerian is −0.5. Flat is 0. It is the single number this whole lesson turns on.',
    },
    {
      type: 'question',
      title: 'Which arrangement gives a flat curve?',
      kind: 'choice',
      tool: { id: 'dm-shapes' },
      body: `You have just seen four ways of arranging the same mass, and only one
             of them produced a curve that stays level as you go out. Use the
             instrument to check your answer before committing to it.`,
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
      type: 'question',
      title: 'What a flat curve requires',
      kind: 'choice',
      tool: { id: 'dm-enclosed', values: { shape: 1, radius: 10 } },
      body: `Go back to M(&lt;r) = v²·r/G, and this time treat the speed as known
             and the mass as the unknown. If v is the same at every radius, then
             M(&lt;r) is proportional to r.
             \n\nThe instrument will tell you the answer if you drag the marker.
             Work it out first.`,
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
      type: 'predict',
      title: 'Now a galaxy',
      setup: DM_EXPECTED,
      body: `A spiral galaxy is a disc of stars with a dense bulge in the
             middle, and most of its light comes from that bulge and the inner
             disc. In that respect it is built like the Solar System: bright and
             heavy in the center, thin and faint further out.
             \n\nThis scenario is a galaxy built on exactly that assumption. Every
             star was launched at the speed the visible mass says it should have.
             \n\nBefore you look at the panel, commit to an answer.`,
      prompt: 'The rotation curve of this galaxy will…',
      options: [
        'fall off as 1/√r, like the Solar System',
        'stay flat all the way out',
        'rise with radius',
        'have no particular shape',
      ],
      answer: 0,
      because: `It falls off as 1/√r. The reasoning is the same as for the Solar
                System and so is the answer: put most of the mass in the middle,
                and the mass enclosed by an orbit stops growing once you are
                outside the bulge. This scenario is the prediction, drawn out in
                full. The next one is what telescopes actually find.`,
    },
    {
      type: 'measure',
      title: 'Measure the expected curve',
      body: `Read the panel. The shaded strip on the left of the plot is the
             inner region, which is excluded from the fit: inside the bulge the
             curve rises with radius for reasons that have nothing to do with
             this lesson, and including it would drag the slope towards zero.
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
      type: 'measure',
      title: 'Measure the real curve',
      body: `Record what the panel reports now. The visible mass is unchanged
             from the previous scenario, so any difference is in the motion and
             not in the bookkeeping.`,
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
            'At the outer edge, roughly how many times faster are the stars moving than the dashed prediction?',
          unit: '×',
        },
      ],
    },

    // --- Part 4: do what the astronomers actually do -------------------------
    {
      type: 'read',
      title: 'Now do what the astronomers did',
      tool: { id: 'dm-fit', values: { haloVFlat: 0 } },
      body: `Measuring a flat curve is the easy half. The hard half, and the one
             that took the 1970s and 1980s to settle, is working out what mass
             distribution could possibly produce it — and showing that no
             arrangement of the visible matter will do.
             \n\nThat is a fitting problem, and it is what this instrument is.
             The pink points with error bars are a measured rotation curve. The
             sliders are a model of the galaxy: a disc of stars, and a halo of
             something else. Your job is to reproduce the points.
             \n\nThe rules are the ones a real astronomer works under. You may
             choose how much mass the disc has and how spread out it is, because
             neither is known precisely from the light alone. You may not move the
             data.`,
      tip: 'The panel scores you: "average miss" is how far your curve sits from the points, in km/s, and the data itself is only good to about ±5. Get under that and the plot says FITTED.',
    },
    {
      type: 'explore',
      title: 'Try it with stars alone',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `The halo is switched off and hidden. You have two sliders: how much
             mass is in the disc, and how far it is spread. Both are genuinely
             uncertain in a real galaxy, so this is a fair fight.
             \n\nTry to fit the curve. Really try — the point of this step is not
             to fail quickly.`,
      checklist: [
        'Start from the "Stars only" preset and look at where the model falls below the data',
        'Push the disc mass up until the outer points are matched, and look at what happened to the inner ones',
        'Bring the mass back down until the inner points are matched, and look at the outer ones',
        'Try spreading the disc out with the scale-length slider, and then squeezing it in',
        'Find the best "average miss" you can manage, and write down what it is',
      ],
      tip: 'A heavier disc lifts the whole curve. A wider disc moves its peak outward and flattens it a little. Neither changes the fact that a disc curve comes back down.',
    },
    {
      type: 'measure',
      title: 'Record your best stars-only fit',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `Whatever your best attempt was, record it. This is a real result and
             it is worth having in your own handwriting: it is the number that
             rules out the obvious explanation.`,
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
      tip: 'The best possible stars-only fit leaves an average miss of about 15 km/s, three times the measurement error, and it is worst at the outer edge. If you got close to that, you found the real answer.',
    },
    {
      type: 'question',
      title: 'Why a heavier disc cannot rescue it',
      kind: 'choice',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `You have just discovered something that took the field a decade to
             accept. Adding mass to the disc does lift the outer curve — but it
             lifts the inner curve at the same time, and by more.`,
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
                to have that shape. The outer points are, if anything, measured
                more reliably than the inner ones, because they come from cold
                hydrogen gas that extends well beyond the stars.`,
    },
    {
      type: 'explore',
      title: 'Now add the halo',
      tool: {
        id: 'dm-fit',
        values: { discMass: 3.3, discScale: 2.6, haloVFlat: 0 },
      },
      body: `Two more sliders, controlling a component that is not made of stars.
             The halo's flat speed sets how much of it there is; its core radius
             sets how quickly it takes over from the disc.
             \n\nGet the plot to say FITTED.`,
      checklist: [
        'Set the disc back to about 3.3 and its scale length to about 2.6',
        'Raise the halo strength from zero and watch the outer curve lift while the inner curve barely moves',
        'Adjust the core radius until the two components hand over smoothly',
        'Drive the average miss below 5 km/s and read the FITTED marker',
        'Read the last row: how much dark mass there is for every unit of visible mass',
      ],
      tip: 'This is the shape the halo has to have, and the reason the pseudo-isothermal profile is used: negligible in the middle, growing without limit outward. Nothing made of stars does that.',
    },
    {
      type: 'measure',
      title: 'Record the fit that works',
      tool: { id: 'dm-fit' },
      body: `Write down the model that fitted. These four numbers are a
             decomposition of a galaxy, and they are the same four numbers a
             published rotation-curve paper reports.`,
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
      tip: 'A good fit lands near 150 km/s and a core of about 6 kpc, with an average miss around 2 km/s. There is a genuine degeneracy between the two halo sliders, which is why real papers quote them together with a covariance.',
    },
    {
      type: 'question',
      title: 'How much of it is dark?',
      kind: 'numeric',
      tool: { id: 'dm-fit' },
      body: `You fitted a galaxy. Divide the halo mass inside 30 kpc by the
             visible mass and you have the headline number of forty years of
             galaxy dynamics.`,
      prompt: 'Halo mass inside 30 kpc, divided by visible mass',
      unit: '×',
      answer: 3.4,
      tolerance: 0.9,
      because: `About three and a half. Roughly three-quarters of the mass inside
                the visible extent of this galaxy is in something that gives off
                no light — and the fraction keeps climbing if you measure further
                out, because the halo's mass keeps growing while the disc's does
                not. Note carefully what this is and is not: it is a mass you
                measured from motion, minus a mass you measured from light. It is
                not a claim about what the difference is made of.`,
    },

    // --- Part 5: what the halo actually does --------------------------------
    {
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
      tip: 'The stars do not stop suddenly. They keep the speed they had and simply stop being held, so the disc unwinds from the outside in.',
    },

    // --- Part 6: Zwicky got there first -------------------------------------
    {
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
      type: 'measure',
      title: 'Measure the simulated cluster',
      body: `Now the cluster in the simulation. Switch to <strong>simulation
             units</strong> using the Physical units button in the Tools section
             of the rail. That is not cosmetic. In the app's own units the
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
      type: 'question',
      title: 'Weigh the cluster by its motion',
      kind: 'numeric',
      body: `For any system held together by its own gravity and settled down,
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
      type: 'question',
      title: 'Now compare',
      kind: 'numeric',
      body: `You have weighed the same cluster twice. Once by adding up its
             galaxies, which is the visible mass the panel reports, and once by
             watching how those galaxies move.`,
      prompt: 'Dynamical mass divided by visible mass',
      unit: '×',
      answer: 18.3,
      tolerance: 4,
      because: `About eighteen. The galaxies you can see account for roughly one
                twentieth of the mass needed to hold the cluster together at the
                speeds its members are actually moving. Zwicky's own figure for
                Coma was larger still, partly because the distance scale of the
                universe was wrong in 1933 and partly because he had no way to
                count the hot gas between the galaxies, which turns out to carry
                several times more mass than the galaxies do. The modern figure
                for Coma is around a factor of ten once that gas is included —
                which is the number the instrument two steps back reports.`,
    },

    // --- Part 6b: the other explanation -------------------------------------
    //
    // Four steps, deliberately. The alternative to dark matter deserves to be
    // met honestly rather than named in a footnote, and it deserves not to
    // become a second lesson: what a student needs from it is the comparison,
    // not a course in modified gravity.
    {
      type: 'read',
      title: 'A different way to read the same curve',
      tool: {
        id: 'dm-mond',
        values: { model: 0, discMass: 3.3, haloVFlat: 150 },
      },
      body: `Everything so far has assumed Newton's law of gravity is right and
             asked what mass would have to be there. There is another way to
             read a flat rotation curve, and it has been on the table since 1983.
             \n\nMordehai Milgrom noticed that the curves stop falling at a
             particular <em>acceleration</em> rather than at a particular radius
             or a particular brightness. Below about a₀ = 1.2 × 10⁻¹⁰ m/s² —
             roughly a hundred billionth of Earth's surface gravity — galaxies
             behave as though gravity were stronger than Newton says. Above it
             nothing changes, which is why no laboratory and no planetary orbit
             has ever seen this.
             \n\nIf that is what is happening, then far from a galaxy the
             gravitational pull falls off as 1/r rather than 1/r², and a circular
             orbit out there has
             \n\n<strong>v⁴ = G M a₀</strong>
             \n\nwith M the mass you can see. Not fitted. Predicted, from one
             constant that is meant to be the same for every galaxy.`,
      tip: 'The instrument is showing the halo fit you just built. The switch at the top puts MOND on the same measurements.',
    },
    {
      type: 'explore',
      title: 'Fit it both ways',
      tool: { id: 'dm-mond' },
      body: `Both explanations, the same twelve measurements, scored the same
             way. Try each of them, and use the two presets when you want to see
             where each one ends up.
             \n\nPay attention to what each explanation had to be told. The halo
             needs three numbers chosen to match this galaxy: how heavy the disc
             is, how fast the halo's curve flattens, and how big its core is.
             MOND needs one — the disc — because a₀ is not adjustable and is the
             same number for every galaxy in the universe.`,
      checklist: [
        'Load the best halo fit and read its residual',
        'Switch to MOND, leaving the disc where it is',
        'Bring the disc down until MOND matches too',
        'Compare how many numbers each explanation needed',
      ],
      tip: 'MOND wants a lighter disc than the halo fit does — about two thirds. A rotation curve cannot measure the mass of the stars directly, so how heavy the disc is was never pinned down by the data in either picture.',
    },
    {
      type: 'question',
      title: 'The prediction MOND makes',
      kind: 'numeric',
      tool: {
        id: 'dm-mond',
        values: { model: 1, discMass: 2.1, haloVFlat: 0 },
      },
      body: `The relation v⁴ = G M a₀ turns a visible mass straight into a flat
             speed, with nothing adjusted. Use the disc the instrument is showing
             — 2.1 × 10¹⁰ solar masses, plus the small 0.05 × 10¹⁰ bulge — and
             the value of a₀ above.
             \n\nIn the units the instrument works in, G a₀ = 0.0159 (km/s)⁴ per
             solar mass.`,
      prompt: 'The flat speed MOND predicts for this galaxy',
      unit: 'km/s',
      answer: 136,
      tolerance: 12,
      because: `About 136 km/s. Multiply 2.15 × 10¹⁰ by 0.0159 to get 3.4 × 10⁸,
                and take the fourth root. The instrument reports the same number
                on its own row.
                \n\nThis is the baryonic Tully–Fisher relation, and it is worth
                being clear that it is an observed regularity rather than a MOND
                result: real galaxies do lie on M ∝ v⁴, with remarkably little
                scatter, whatever is causing it. MOND predicts it. A dark-matter
                halo has to arrange for it, because there is no obvious reason a
                halo's properties should track the visible mass so tightly, and
                explaining that tightness is a live problem in galaxy formation.`,
    },
    {
      type: 'question',
      title: 'Does the curve decide?',
      kind: 'short',
      body: `You have now fitted the same rotation curve twice, with two
             incompatible ideas about what is going on, and both of them work.
             \n\nThat is not a failure of the exercise. It is the actual state of
             this particular piece of evidence, and knowing what a measurement
             cannot settle is as much a part of using it as knowing what it can.`,
      prompt:
        'In two or three sentences: does fitting this rotation curve establish which explanation is right? What kind of evidence would you need instead?',
      rubric: `It does not. Both reproduce the curve to within its error bars, so
               the curve cannot distinguish them; the fits differ in how many
               free parameters they spend and in what disc mass they imply, and
               neither of those is decided by the curve either. Credit any
               reasonable route to evidence from somewhere else: galaxy clusters,
               where MOND reduces the missing mass but leaves a residual factor
               of about two and so still needs unseen matter; the Bullet Cluster,
               where the lensing mass is displaced from the visible gas after a
               collision; the cosmic microwave background, whose acoustic peak
               heights are fitted by cold dark matter and not by MOND without
               adding a dark component anyway; or the fact that MOND has no
               settled relativistic form, which makes it hard to apply to
               cosmology or lensing at all. Strong answers note that the two
               ideas are not symmetric in what they still owe: dark matter owes
               an explanation of why halo properties track the visible mass so
               tightly, and MOND owes almost everything outside galaxy rotation
               curves.`,
    },

    // --- Part 7: what this does and does not establish ----------------------
    {
      type: 'question',
      title: 'What have you actually shown?',
      kind: 'short',
      body: `You have made three measurements now, in two kinds of system, using
             two different methods: you fitted a galaxy's rotation curve and found
             no arrangement of its stars would do, and you weighed a cluster by
             its motion and found five times more mass than light. Both say the
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
      tip: 'You fitted a real galaxy and weighed a real cluster. That part is not in doubt, and you did not have to take anyone’s word for it.',
    },
  ],
};

export default DARK_MATTER;
