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

/**
 * What the recorded light curve says.
 *
 * A transit of this system goes past in half a second of wall clock, so asking
 * a student to read a value off the screen at the right instant measures their
 * reflexes rather than their understanding. The panel finds the transits in the
 * recording instead, which is also how the measurement is really made.
 */
const photometry = ctx => {
  const a = ctx.photometry();
  const rows = [
    { label: 'Baseline, out of transit', value: a.baseline.toFixed(6) },
    { label: 'Complete transits recorded', value: String(a.seen) },
  ];
  if (a.last) {
    rows.push({
      label: `Transit ${a.last.seq}: bottom`,
      value: a.last.bottom.toFixed(6),
      emphasis: true,
    });
    rows.push({
      label: `Transit ${a.last.seq}: mid-time`,
      value: `${a.last.mid.toFixed(4)} days`,
    });
  } else {
    rows.push({ label: 'Waiting for a complete transit', value: '...' });
  }
  rows.push({ label: 'Clock', value: `${ctx.days().toFixed(4)} days` });
  return rows;
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

const TRANSITS = {
  id: 'transit-photometry',
  thumbnail: 'images/scenarios/transit-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Finding Planets by Their Shadows',
  subtitle:
    'Measure a transit, weigh what it tells you, and find what is hiding',
  duration: '50-70 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'Work through the transit method from first principles on HD 209458 b, the first planet ever caught crossing its star: measure a depth and turn it into a radius, correct it for limb darkening, time two transits to get a period, read an atmosphere out of the color of the dip, and finish by finding the hidden companion star that makes the planet look smaller than it is.',
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
      type: 'read',
      title: 'A firefly beside a lighthouse',
      body: `There are more than six thousand confirmed planets around other
             stars. Fewer than a hundred have ever been photographed.
             \n\nThe problem is not that they are far away, it is that they sit
             next to something overwhelmingly brighter. Seen from thirty light
             years, Jupiter is about a billion times fainter than the Sun and
             sits half an arcsecond away from it: the angle a coin subtends
             from four kilometers. Every telescope spreads a point of light out
             into a small blur, and the star's blur is a billion times taller
             than the planet is. Direct imaging works only in the rare corner of
             parameter space where the planet is young enough to still glow with
             its own heat, massive enough to glow brightly, and far enough out to
             be clear of the glare: a young, enormous world on a wide orbit. That
             is not what most planets are.
             \n\nSo we look for the star instead. A planet cannot hide what it
             does to its host: it pulls the star around, it bends the light of
             stars behind it, and, if the geometry is right, it passes in front
             of it and blocks some light. All three are measurements of the
             <em>star</em>, and stars are bright and easy.
             \n\nOn screen is <strong>HD 209458</strong>, a slightly hotter and
             more massive relative of the Sun about 160 light years away in
             Pegasus, with a planet on a three and a half day orbit. The star and
             the planet are drawn at their true relative sizes, which is why the
             view is zoomed so far in.`,
      tip: 'Everything in this lesson is measurable from what is on screen. Clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: TRANSIT_LAB,
    },
    {
      type: 'read',
      title: 'Five ways to find a planet you cannot see',
      body: `<strong>Radial velocity.</strong> A planet and its star both orbit
             their common center of mass, so the star wobbles, and the wobble
             shifts its spectral lines blue then red. Jupiter moves the Sun at
             12.5 m/s; the Earth manages 9 cm/s. This is how the first planet
             around a normal star was found: Michel Mayor and Didier Queloz
             announced 51 Pegasi b in 1995, a Jupiter-mass world on a four-day
             orbit that nobody's theory of planet formation had allowed for. It
             won them a share of the 2019 Nobel Prize. Radial velocity measures a
             minimum mass, because an orbit seen face-on produces no shift at
             all.
             \n\n<strong>Transits.</strong> If the orbit happens to be edge-on to
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
      type: 'predict',
      title: 'What will the brightness do?',
      body: `The planet is about to cross in front of the star from your point of
             view. In a moment you will open a photometer and watch. Commit to an
             answer first.`,
      prompt:
        'While the planet crosses the star, the measured brightness will…',
      options: [
        'rise, because the planet reflects extra light towards us',
        'drop by a small amount, then recover',
        'drop to zero until the planet has passed',
        'stay flat: the planet is far too small to matter',
      ],
      answer: 1,
      because:
        'It drops by a small amount and recovers. The planet blocks a fraction of the star’s disk equal to the ratio of their areas, and even a Jupiter in front of a Sun-like star only covers about 1% of it. Everything in this lesson follows from that one number being small but perfectly measurable.',
    },
    {
      type: 'explore',
      title: 'Your first transit',
      body: `The <strong>Light Curve</strong> panel has opened on the right. It
             plots the total brightness of everything in view against time,
             exactly what a photometer on a telescope records, and nothing else:
             no image, no positions, one number per moment.
             \n\nThe planet goes around once every 13 seconds or so of your
             time, and the transit itself is over in half a second. That ratio is
             real: the transit occupies 4% of the orbit, or three and a half hours
             out of a three and a half day year. It goes past too quickly to
             watch closely, which is exactly the situation a real observer is in
             and exactly why the measurement is made on the recording afterwards.
             The curve keeps every dip that has gone past.
             \n\nThe <em>observer angle</em> control rotates your vantage point
             around the system. Try it: the transits move to a different moment
             but they never stop happening, because this simulation runs in a
             single plane and every orbit in it is edge-on. Real orbits are
             tilted, and that changes everything: you will come back to it.`,
      lightCurve: true,
      observerAngle: 0,
      checklist: [
        'Wait until at least two dips are on the plot',
        'Hover over the flat part of the curve and read the value in the tooltip',
        'Hover over the bottom of a dip and read that value too',
        'Move the observer angle and confirm the dips shift but do not disappear',
        'Notice the very slight rise and fall of the baseline between transits',
      ],
      tip: 'That slow baseline ripple is the planet’s phase curve: like the Moon, it shows us more or less of its lit side as it goes round. It is a real signal, roughly a hundred times smaller than the transit, and space telescopes measure it.',
      probe: photometry,
    },
    {
      type: 'read',
      title: 'Where the depth comes from',
      body: `A star is, to a photometer, a uniformly bright disk of radius
             R<sub>★</sub> and area πR<sub>★</sub><sup>2</sup>. A planet in front
             of it is an opaque disk of radius R<sub>p</sub> and area
             πR<sub>p</sub><sup>2</sup>, and it blocks exactly its own area.
             \n\nThe fractional drop in brightness, the <strong>transit
             depth</strong>, is therefore the ratio of the two areas:
             \n\n<strong>δ = πR<sub>p</sub><sup>2</sup> / πR<sub>★</sub><sup>2</sup>
             = (R<sub>p</sub> / R<sub>★</sub>)<sup>2</sup></strong>
             \n\nThe π cancels, the distance to the star cancels, the star's
             luminosity cancels, and the planet's own brightness is negligible.
             What survives is a pure ratio of sizes. Turn it around and the
             measurement you want falls straight out:
             \n\n<strong>R<sub>p</sub> / R<sub>★</sub> = √δ</strong>
             \n\nThat is the whole method in one line. It also tells you what the
             method cannot do: a transit gives you the planet's size <em>relative
             to the star</em>. To get a planet radius in kilometers you need to
             know the star, which is why a great deal of exoplanet work is
             actually stellar astrophysics.`,
      tip: 'The ratio is usually written k, and it is the single most important number in a transit fit.',
    },
    {
      type: 'explore',
      title: 'Try it on some real planets',
      body: `The instrument on the right draws the silhouette to scale on the
             left and the transit it produces on the right, on a fixed vertical
             scale so that changes read as changes.
             \n\nWork through the presets. The lesson is in the two extremes: an
             Earth in front of the Sun is 84 parts per million, a depth that took
             a dedicated space telescope to reach, while the same Earth in front
             of TRAPPIST-1 is nearly 1%, easily within reach of a small ground
             telescope. Nothing about the planet changed. The star did.`,
      tool: { id: 'depth-size' },
      lightCurve: false,
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
      type: 'question',
      title: 'From a depth to a size',
      kind: 'numeric',
      body: `Suppose a survey reports a clean, repeating 1% dip:
             δ = 0.0100.`,
      prompt: 'What is R<sub>p</sub> / R<sub>★</sub> for a 1% dip?',
      unit: '',
      answer: 0.1,
      tolerance: 0.015,
      because:
        'The square root of 0.01 is 0.1: the planet is a tenth of the star’s radius. Around a Sun-like star that is roughly Jupiter-sized, which is exactly why every transiting planet found before about 2005 was a hot Jupiter. They were the only ones anybody could see.',
    },
    {
      type: 'measure',
      title: 'Measure the dip',
      body: `Now do it for real, on the curve you have been watching.
             \n\nYou need two numbers: the brightness on the flat stretch
             between transits, and the brightness at the bottom of a dip.
             \n\nThe panel is already finding them. It takes the baseline as
             the level the star sits at for nearly all of its orbit, and it
             measures the bottom of every complete dip that has gone past. Wait
             until the readout below shows at least one transit, then press the
             button to copy both numbers in. If you would rather read them
             yourself, hover the pointer over the light curve and it reports the
             value under it to six decimal places.
             \n\nThe depth and the radius ratio are worked out from what you
             enter, so a slipped decimal point in your arithmetic cannot be
             mistaken for a misunderstanding of the physics.`,
      lightCurve: true,
      importLabel: 'Copy the last transit',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last
          ? [a.baseline.toFixed(6), a.last.bottom.toFixed(6)]
          : null;
      },
      importGroups: [['base', 'bot']],
      fields: [
        {
          id: 'base',
          label: 'Brightness outside transit',
          unit: '',
          hint: 'e.g. 1.000065',
        },
        { id: 'bot', label: 'Brightness at the bottom of the dip', unit: '' },
        {
          id: 'depth',
          label: 'Transit depth δ = baseline − bottom',
          unit: '',
          decimals: 5,
          compute: v => v.base - v.bot,
        },
        {
          id: 'k_naive',
          label: 'Radius ratio R<sub>p</sub> / R<sub>★</sub> = √(δ)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.base - v.bot),
        },
      ],
      validate: v => {
        const d = v.base - v.bot;
        if (!Number.isFinite(d)) return null;
        if (d <= 0) {
          return {
            level: 'error',
            message:
              'The bottom of a transit sits <em>below</em> the baseline, so the depth has to come out positive. Check that you have not swapped the two.',
          };
        }
        if (d > 0.2) {
          return {
            level: 'error',
            message:
              'A 20% dip would be a stellar eclipse, not a planet. If you entered numbers like 98.2 and 100, enter the brightness itself rather than a percentage of it.',
          };
        }
        if (d < 0.005) {
          return {
            level: 'warn',
            message:
              'That is shallower than this system can produce. Make sure the bottom value really is from the lowest point of a dip and not from the shoulder on the way in.',
          };
        }
        if (d > 0.014 && d < 0.024) {
          return {
            level: 'ok',
            message:
              'Good: about 1.8%, giving a radius ratio near 0.135. Hold on to that number, because the next step is going to tell you it is about 10% too big, and why.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected somewhere near 0.018 for this system. Read the baseline from a flat stretch well away from any dip, and the bottom from the lowest point of one.',
        };
      },
      probe: photometry,
      tip: 'A real light curve is noisy, and nobody reads the bottom off it by eye: you fit a model transit to every point at once, which is how the precision ends up better than any single measurement in it. What the panel does here is the same idea with the noise left out.',
    },
    {
      type: 'read',
      title: 'Why that radius came out too big',
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
             \n\n<strong>δ<sub>measured</sub> = 1.215 × (R<sub>p</sub> /
             R<sub>★</sub>)<sup>2</sup></strong>
             \n\nTaking the square root of your measured depth therefore
             overestimates the radius ratio by √1.215 = 1.102, about 10%. On a
             planet near a classification boundary, 10% is the difference between
             two different answers about what the world is made of.
             \n\nThis is not a quirk of the simulation. It is why nobody in the
             field reports √δ as a radius ratio: a real transit fit solves for the
             radius ratio, the limb-darkening coefficients, the impact parameter
             and the orbit together, because they are all tangled up in the same
             curve.`,
      figure: {
        src: 'images/transit-of-venus-2012.jpg',
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
          hint: 'from the previous step',
        },
        {
          id: 'rstar',
          label: 'Star radius R<sub>★</sub>',
          unit: 'R☉',
          hint: '1.155',
        },
        {
          id: 'k_true',
          label: 'Corrected ratio √(δ / 1.215)',
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
        if (v.rstar > 50) {
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
        if (rj > 1.15 && rj < 1.65) {
          return {
            level: 'ok',
            message:
              'That is it: about 1.38 Jupiter radii, or 15.5 Earth radii. The published value from a decade of Hubble transits is 1.38 R_Jupiter. You just measured a planet 160 light years away by watching a star get slightly dimmer.',
          };
        }
        if (rj > 1.65) {
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
      type: 'read',
      title: 'The shape of the dip',
      body: `A transit is not a step function. It has four contact points, and
             the shape between them carries information.
             \n\n<strong>Ingress</strong> begins when the planet's leading edge
             first touches the stellar disk and ends when its trailing edge has
             fully crossed onto it. During that interval the blocked area climbs
             from nothing to its full value. Ingress lasts roughly
             2R<sub>p</sub>/2R<sub>★</sub> of the whole event, so the steepness of
             the shoulders is itself a measurement of the radius ratio,
             independent of the depth.
             \n\nThe <strong>floor</strong> between second and third contact is
             where the planet is entirely on the disk. It is not flat: limb
             darkening curves it, deepest at mid-transit where the planet covers
             the brightest part of the star.
             \n\n<strong>Egress</strong> mirrors ingress.
             \n\nThe <strong>total duration</strong> depends on how fast the planet
             is moving and how long a chord it cuts across the disk. Combine the
             duration with the period and you can extract the density of the
             star, without ever resolving it. That trick, called asterodensity
             profiling, is one of the reasons transit surveys turned out to be
             useful for stellar astrophysics as well.`,
    },
    {
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
      type: 'explore',
      title: 'The angle you happen to be standing at',
      body: `Everything so far assumed the planet crosses the middle of the star.
             Real orbits are tilted, and the tilt is set by how the system happens
             to be oriented relative to Earth: nothing about the planet, entirely
             about us.
             \n\nThe <strong>impact parameter</strong> b is how far from the
             center of the disk the planet's path passes, in units of the stellar
             radius. b = 0 is dead center. b = 1 clips the limb. Above about
             b = 1 + k the planet misses the star altogether and there is no
             transit at all, however patiently you watch.
             \n\nSlide it and watch three things change at once: the transit gets
             shorter, the floor loses its flat section and becomes a V, and the
             depth drops because the planet is now covering the dim limb rather
             than the bright center. All three are why a fit that ignores the
             impact parameter gets the radius wrong.`,
      tool: { id: 'geometry' },
      lightCurve: false,
      checklist: [
        'Start at b = 0 and note the duration and depth',
        'Raise b to 0.9 and watch the flat floor turn into a V',
        'Find the value of b where the transit disappears entirely',
        'Load the Earth-around-the-Sun preset and read off the transit probability',
        'Shrink a / R★ and watch the probability climb',
      ],
      tip: 'The simulation runs in a plane, so every orbit in it has b = 0 and transits. That is a limitation of a two-dimensional sandbox, not a claim about the sky. This instrument is where the third dimension lives.',
    },
    {
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
        'R★/a = 0.00465, or about 1 in 215. That is the single hardest fact about the transit method: even a survey with perfect photometry watching every star in the sky forever would find fewer than one in two hundred of the Earth-like planets out there. Everything the method reports about how common planets are has to be divided by this geometric factor before it means anything.',
    },
    {
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
      type: 'predict',
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
        { id: 'n1', label: 'which transit it was', unit: '', hint: 'e.g. 2' },
        { id: 't2', label: 'A later mid-transit time', unit: 'days' },
        { id: 'n2', label: 'which transit it was', unit: '', hint: 'e.g. 5' },
        {
          id: 'n',
          label: 'Orbits between the two',
          unit: '',
          hint: 'the difference of the two transit numbers',
        },
        {
          id: 'P',
          label: 'Orbital period P = (t₂ − t₁) / n',
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
      type: 'measure',
      title: 'From a period to an orbit',
      body: `A period and a stellar mass are enough to place the planet, through
             the same third law you would use on the Solar System:
             \n\n<strong>a<sup>3</sup> = P<sup>2</sup> M<sub>★</sub></strong>,
             with a in AU, P in years and M<sub>★</sub> in solar masses.
             \n\nHD 209458 weighs <strong>1.148 M<sub>☉</sub></strong>, from its
             spectrum and its position on the main sequence. Enter your period and
             that mass.
             \n\nThe last two rows are what the orbit means. a / R<sub>★</sub> is
             how many stellar radii out the planet sits, which is what sets the
             transit probability and the duration. The equilibrium temperature is
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
          hint: '1.148',
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
          label: 'Semi-major axis a = (P² M)^⅓',
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
      type: 'read',
      title: 'What a transit cannot tell you',
      body: `You have a radius, a period and an orbit. You do not have a mass, and
             no amount of better photometry will give you one. A puffy gas planet
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
             last section of this lesson goes.`,
      tip: 'The TRAPPIST-1 planets got their masses a third way: they perturb each other enough to shift each other’s transits by minutes, and those transit timing variations are a mass measurement.',
    },
    {
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
             <strong>scale height</strong>, the vertical distance over which
             pressure falls by a factor of e: H = kT / μg. Hot, low-gravity,
             hydrogen-rich atmospheres are puffy and have large scale heights,
             which is why hot Jupiters are the easiest atmospheres to study. For
             this planet H is roughly 550 km against a radius of 99,000 km, so a
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
      type: 'question',
      title: 'Why the depth moves',
      kind: 'choice',
      body: `A team measures a planet's transit 300 parts per million deeper at
             1.4 μm than at 1.2 μm, and repeats the result on four separate
             transits.`,
      prompt: 'The most likely explanation is that…',
      options: [
        'the planet is physically larger when observed at 1.4 μm',
        'water vapour makes the atmosphere opaque at 1.4 μm, so the planet blocks a slightly wider disk',
        'the star is brighter at 1.4 μm, which deepens the transit',
        'the orbit is slightly different on the transits taken at 1.4 μm',
      ],
      answer: 1,
      because:
        'Opacity, not size. At a wavelength where an abundant molecule absorbs, the atmosphere becomes opaque higher up, so the radius at which the planet stops transmitting starlight is larger. The star’s own brightness cancels out of the depth entirely, which is what makes this measurement possible in the first place.',
    },
    {
      type: 'read',
      title: 'Things that are not planets',
      body: `A dip in a light curve is a dip in a light curve. Several things that
             are not planets produce one.
             \n\nAn <strong>eclipsing binary</strong> of two stars produces dips
             of tens of percent, which is obvious, until the pair is grazing and
             only clips a few percent. A <strong>background eclipsing binary</strong>
             behind your target, its deep eclipses watered down by all the light of
             the foreground star, produces a shallow dip of exactly planetary
             depth. Starspots rotating in and out of view produce dips that
             almost repeat. Kepler and TESS both flag more candidates than they
             confirm, and sorting them out is the bulk of the follow-up effort.
             \n\nThe subtler problem is not a false positive at all. It is a real
             planet whose measurement is quietly wrong.
             \n\nSurvey telescopes have coarse pixels. Kepler's were about four
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
      type: 'explore',
      title: 'A star you did not know was there',
      body: `Suppose a fraction of the light in the aperture comes from a
             companion, with flux ratio F<sub>2</sub>/F<sub>1</sub>. The planet
             still blocks the same fraction of its own star, but that blocked
             light is now a smaller share of the total:
             \n\n<strong>δ<sub>observed</sub> = δ<sub>true</sub> /
             (1 + F<sub>2</sub>/F<sub>1</sub>)</strong>
             \n\nSince the radius goes as √δ, the radius you report is too small
             by exactly
             \n\n<strong>R<sub>true</sub> / R<sub>measured</sub> =
             √(1 + F<sub>2</sub>/F<sub>1</sub>)</strong>
             \n\nContrast is usually quoted as a magnitude difference, and
             F<sub>2</sub>/F<sub>1</sub> = 10<sup>−0.4Δm</sup>. An equal twin
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
        'Set Δm = 0.5, the contrast in the scenario you are about to load',
        'Find the Δm beyond which the correction is under 1%',
        'Set the measured radius to 1.5 R⊕ and find the Δm that pushes it past 1.6',
      ],
      tip: 'Robo-AO Survey IV corrected 814 candidate radii. Treating the primary and the secondary as equally likely hosts, the mean radius grew by a factor of 1.54, and 35 candidates previously believed to be rocky moved out of the rocky size range entirely.',
    },
    {
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
      type: 'explore',
      title: 'Now measure it',
      body: `The same star and the same planet are back, with one change: a
             second star half a magnitude fainter sits 300 AU away. At the
             distance of this system that is about three arcseconds on the sky,
             comfortably inside a single TESS pixel and inside a Kepler aperture,
             and it is 30,000 simulation units from the star you are watching, far
             outside the view. It is there. You cannot see it. Neither could the
             survey.
             \n\nMeasure the transit depth again exactly as you did before. The
             readout below is measuring the new curve as it comes in; wait for a
             complete transit and compare its bottom with what you got the first
             time.`,
      setup: {
        scenario: 'Blended Binary',
        seed: 'transit-lab',
        camera: { zoom: 60, pan: { x: 0, y: 0 } },
        paused: false,
      },
      lightCurve: true,
      observerAngle: 0,
      clearLightCurve: true,
      checklist: [
        'Wait for a complete transit and read the new baseline and the new bottom',
        'Confirm the dip is visibly shallower than it was',
        'Check the mid-times: the period has not changed at all',
        'Note that the shape and duration of the transit are exactly as before',
      ],
      probe: photometry,
      tip: 'Only the depth changes. The period, the duration and the shape are untouched, which is precisely why blending is so easy to miss: nothing about the light curve looks wrong.',
    },
    {
      type: 'measure',
      title: 'Recover the real planet',
      body: `You have measured the same planet twice, once clean and once
             blended. The ratio of the two depths is 1 + F<sub>2</sub>/F<sub>1</sub>
             directly, which means this pair of measurements contains the
             companion's brightness even though you never saw it.
             \n\nIn practice you never get the clean measurement: that is the whole
             difficulty, and it is why somebody has to go and take a
             high-resolution image. Here you have both, so you can check that the
             correction does what it claims.`,
      lightCurve: true,
      importLabel: 'Copy the blended depth',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last ? [a.last.depth.toFixed(6)] : null;
      },
      importGroups: [['d_blend']],
      probe: photometry,
      fields: [
        {
          id: 'd_blend',
          label: 'Depth you just measured, blended',
          unit: '',
        },
        {
          id: 'd_clean',
          label: 'Depth you measured earlier, unblended',
          unit: '',
          hint: 'from step 8',
        },
        {
          id: 'rp_blend',
          label: 'Radius the blended curve implies',
          unit: 'R⊕',
          decimals: 2,
          compute: v => Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198,
        },
        {
          id: 'ratio',
          label: 'Depth ratio = 1 + F₂/F₁',
          unit: '',
          decimals: 4,
          compute: v => v.d_clean / v.d_blend,
        },
        {
          id: 'dm',
          label: 'Implied companion contrast Δm',
          unit: 'mag',
          decimals: 2,
          compute: v => -2.5 * Math.log10(v.d_clean / v.d_blend - 1),
        },
        {
          id: 'corr',
          label: 'Radius correction √(1 + F₂/F₁)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.d_clean / v.d_blend),
        },
        {
          id: 'rp_true',
          label: 'Corrected planet radius',
          unit: 'R⊕',
          decimals: 2,
          compute: v =>
            Math.sqrt(v.d_blend / 1.2146) *
            1.155 *
            109.198 *
            Math.sqrt(v.d_clean / v.d_blend),
        },
      ],
      validate: v => {
        const ratio = v.d_clean / v.d_blend;
        const rp = Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198;
        if (!Number.isFinite(ratio) || !Number.isFinite(rp)) return null;
        if (v.d_clean > 1 || v.d_blend > 1) {
          return {
            level: 'error',
            message:
              'Both depths are fractions, not percentages: 1.1% goes in as 0.011.',
          };
        }
        if (ratio <= 1) {
          return {
            level: 'error',
            message:
              'The blended depth has to be the <em>shallower</em> of the two. Check you have not put them in the wrong boxes.',
          };
        }
        const corrected = rp * Math.sqrt(ratio);
        if (
          ratio > 1.4 &&
          ratio < 1.95 &&
          corrected > 13.5 &&
          corrected < 17.5
        ) {
          return {
            level: 'ok',
            message:
              'That is the result. The blended curve says about 12 Earth radii; the correction of roughly ×1.28 takes it back to about 15.5, which is the 1.38 Jupiter radii you measured before the companion was there. The implied contrast should land near Δm = 0.5, which is what the companion actually is.',
          };
        }
        if (ratio > 1.95) {
          return {
            level: 'warn',
            message:
              'The ratio is larger than this companion can produce. Re-read the blended depth: it should be near 0.011, not near half the clean value.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected a ratio near 1.63 and a corrected radius near 15.5 R⊕. Check both depths came from the bottom of a dip rather than a shoulder.',
        };
      },
      tip: 'Notice what the correction does not need: the companion’s distance, its mass, or whether it is even bound to the star. Only how much light it adds.',
    },
    {
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
      type: 'read',
      title: 'What you did, and where it goes next',
      body: `You measured a transit depth and turned it into a planet radius, and
             then made that radius more accurate three times over: once by
             dividing out limb darkening, once by understanding the geometry that
             sets the impact parameter, and once by correcting for a star nobody
             could see. That sequence, measurement then correction then
             correction, is what the field actually looks like from the inside.
             \n\nThe method is not slowing down. TESS is surveying essentially the
             whole sky for transits around bright, nearby stars, the ones worth
             following up. JWST is taking transmission spectra of small planets
             around cool stars, which is the only route to an atmosphere on
             anything rocky with current technology. ESA's PLATO, due later this
             decade, is built to find Earth-sized planets in year-long orbits
             around Sun-like stars, the corner of parameter space Kepler could
             only just reach. Ariel after it will do atmospheres at survey scale.
             \n\nAnd behind all of them sits the unglamorous work you did in the
             last three steps: somebody has to go and look at every host star with
             a big enough telescope to find out what else is in the aperture.
             Every one of those thousands of planet radii is only as good as the
             answer.`,
      tip: 'A note on numbers: the survey results quoted here come from the Robo-AO Kepler Survey and the SOAR TESS Survey, both of which set out to image every planet-candidate host they could reach. The Robo-AO census covers 3,857 Kepler hosts; the SOAR programme has observed close to 3,000 TESS targets and finds a median primary-host radius correction of about 1.07, rising to 1.33 for the worst tenth.',
    },
  ],
};

export default TRANSITS;
