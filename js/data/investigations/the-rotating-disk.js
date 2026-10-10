// =============================================================================
// The Rotating Disk
// -----------------------------------------------------------------------------
// Content only, no imports. Every step has a stable `sid` (progressSchema.js).
// The instrument is the galactic family's rotating-disk tool
// (js/galacticWidgets.js, js/galactic/model.js): the Oort constants fitted to
// Gaia proper motions, and the Milky Way's published rotation curve against the
// bulge + disk + halo model of the galactic kernel. Expected values are checked
// by tests/galacticInvestigations.test.js (tools/authoring/galacticModels.mjs).
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 },
    { role: 'orbiter', name: 'A disk star', teffK: 5000, lumSun: 0.4 },
  ],
};
const RD = (values = {}) => ({ id: 'rotating-disk', values });

const THE_ROTATING_DISK = {
  id: 'the-rotating-disk',
  thumbnail: 'images/investigations/the-rotating-disk.webp',
  title: 'The Rotating Disk',
  subtitle:
    'The Oort constants and the Milky Way’s rotation curve, from data, then a mass model',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 25, section: '25.3' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['the-suns-motion'],
  tags: ['galaxies', 'dark-matter', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure the Oort constants A and B from the proper motions of nearby stars, with uncertainties',
    'Say what A − B means and turn it into the Sun’s circular speed',
    'Compare the Milky Way’s measured rotation curve with the curve its stars and gas alone would make',
    'Add a halo, read how much better the fit becomes, and say what that fit does and does not show',
    'State the assumptions in the model: the bounds on the disk and the distance and speed of the Sun',
  ],
  steps: [
    {
      sid: 'a-wave-in-the-proper-motions',
      stage: STARS,
      type: 'read',
      title: 'The Galaxy’s rotation, in nearby stars',
      body: `The Sun and the stars near it circle the Galactic center, but not
             at one common speed: stars nearer the center go around faster.
             Seen from the Sun, that makes nearby stars drift across the sky in a
             pattern that depends on <strong>Galactic longitude</strong>. Two
             numbers, the <strong>Oort constants A and B</strong>, describe it.
             \n\nThe picture shows 1,570 Gaia stars’ motion along the Galactic
             plane against longitude, in km/s per kiloparsec, binned in
             12 intervals, with the Sun’s own motion taken out. The curve is the
             fit. The values are in the list.`,
      tool: RD({ view: 0, weight: 0 }),
    },
    {
      sid: 'predict-the-shape',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-a-and-b',
      title: 'What shape?',
      body: `Going once around the Galaxy’s plane, from longitude 0° to 360°,
             do not change the instrument yet.`,
      prompt: 'The binned proper motions along the plane will make&hellip;',
      options: [
        'a double wave: two highs and two lows in one turn',
        'a single wave: one high and one low',
        'a flat line, because every star moves alike',
        'random scatter with no pattern',
      ],
      answer: 0,
      hints: [
        'Differential rotation makes stars in opposite directions behave alike: l and l + 180° should look the same.',
      ],
      because:
        'A double wave. Differential rotation produces a pattern in which longitudes 180° apart match (the stars at l and l + 180° move the same way along the plane), so the curve repeats twice in a turn: A cos 2l plus a constant B.',
      tool: RD({ view: 0, weight: 0 }),
    },
    {
      sid: 'measure-a-and-b',
      stage: STARS,
      type: 'measure',
      title: 'Measure A and B',
      body: `The fit is the curve in the picture: <strong>A</strong> sets the
             height of the double wave and <strong>B</strong> where it is
             centered. With the stars weighted by distance (the default), read
             <strong>Oort A</strong> and <strong>Oort B</strong>.`,
      fields: [
        { id: 'A', label: 'Oort A', unit: 'km/s/kpc', hint: '13' },
        { id: 'B', label: 'Oort B', unit: 'km/s/kpc', hint: '-14' },
      ],
      validate: v => {
        if (![v.A, v.B].every(Number.isFinite)) return null;
        if (Math.abs(v.A - 13.5) <= 1 && Math.abs(v.B - -13.7) <= 1) {
          return {
            level: 'ok',
            message:
              'A is positive and B negative, each with an uncertainty of a couple of km/s/kpc. The published values (Bovy 2017) are 15.3 and −11.9: both inside three of these uncertainties.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the picture to the Oort constants and the fit to weight stars by distance, then read the rows “Oort A” and “Oort B”. B is negative.',
        };
      },
      tool: RD({ view: 0, weight: 0 }),
    },
    {
      sid: 'why-weight-by-distance',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why weight the stars?',
      body: `Switch the fit to weight <strong>all stars alike</strong> and read A
             and B again. They change completely, and their uncertainties are
             five times larger.`,
      prompt: 'Why does an unweighted fit fail?',
      options: [
        'A star’s speed scatter becomes a scatter in these units proportional to its parallax, so the nearest stars are the noisiest and dominate',
        'The nearest stars are the most distant ones',
        'Gaia’s nearby stars have no radial velocities',
        'Stars of all distances move alike, so weighting changes nothing',
      ],
      answer: 0,
      hints: [
        'The quantity is a speed divided by a distance: what does a fixed speed scatter do at small distance?',
      ],
      because:
        'The units are km/s per kpc, speed ÷ distance. A given random speed (a few km/s) becomes a bigger number the closer the star is, so near stars scatter most in this quantity. Weighting by 1 ÷ parallax² gives each star the weight its scatter deserves.',
      tool: RD({ view: 0, weight: 1 }),
    },
    {
      sid: 'speed-at-the-sun',
      stage: STARS,
      type: 'measure',
      title: 'The Sun’s circular speed',
      body: `A − B is the angular speed of a circular orbit at the Sun, in km/s
             per kpc. Multiplied by the Sun’s distance from the center, 8.3 kpc
             (an assumption: it is not measured here), it is a speed. With the
             weighted fit, read the row for the circular speed at the Sun.`,
      fields: [
        {
          id: 'v0',
          label: 'Circular speed at the Sun',
          unit: 'km/s',
          hint: '226',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.v0)) return null;
        if (Math.abs(v.v0 - 226) <= 5) {
          return {
            level: 'ok',
            message:
              'About 226 km/s, with an uncertainty of about 24 km/s (8.3 times the uncertainty of A − B). It agrees with the rotation curve’s 244 km/s inside that uncertainty, from completely different data: proper motions, not Doppler shifts.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch the fit back to weight by distance, then read the row “Circular speed at the Sun”. It is (A − B) × 8.3 kpc.',
        };
      },
      tool: RD({ view: 0, weight: 0 }),
    },
    {
      sid: 'the-rotation-curve',
      stage: STARS,
      type: 'read',
      title: 'The whole curve',
      body: `The Oort constants say how the Galaxy rotates here. How does it
             rotate everywhere? The points are the Milky Way’s
             <strong>circular speed</strong> from 2 to 25 kpc from the center, from
             Bhattacharjee, Chaudhury and Kundu (2014), who combined many
             tracers. It assumes the Sun is at 8.3 kpc moving at 244 km/s
             (their paper tabulates two other sets). The curves are a model: a
             bulge and disk (green dashes), a halo (orange dots) and their
             total (blue). The sliders start at a guess, which fits poorly.`,
      tool: RD({ view: 1, fit: 0, mdisk: 10.7, rd: 2.6, vh: 150, rc: 8 }),
    },
    {
      sid: 'predict-stars-alone',
      stage: STARS,
      type: 'predict',
      reveal: 'fit-stars-only',
      title: 'Stars and gas alone',
      body: `Let the instrument find the best fit using only a bulge and a
             disk, no halo, with the disk’s mass bounded by what the Galaxy’s
             stars can plausibly be (8 × 10<sup>10</sup> solar masses at most).
             Do not run it yet.`,
      prompt: 'Past about 10 kpc, the best stars-only curve will&hellip;',
      options: [
        'fall away, short of the measured points',
        'stay flat, matching the measured points',
        'keep rising, above the measured points',
        'be impossible to draw',
      ],
      answer: 0,
      hints: [
        'In a Solar System, where the mass is at the center, speeds fall with distance. A disk is similar far outside it.',
      ],
      because:
        'It falls away. Beyond where most of the stars and gas are, the speed that their mass supports drops with distance, as in the Solar System. The measured points stay flat, which is what the next two steps quantify.',
      tool: RD({ view: 1, fit: 0 }),
    },
    {
      sid: 'fit-stars-only',
      stage: STARS,
      type: 'measure',
      title: 'Best fit, stars only',
      body: `Set <strong>Model parameters</strong> to
             <strong>best fit, stars only (no halo)</strong>. Read the reduced
             χ² (χ² per degree of freedom: about 1 is a fit as good as the
             errors) and the disk mass.`,
      fields: [
        { id: 'reduced', label: 'Reduced χ²', unit: '', hint: '50' },
        { id: 'disc', label: 'Disk mass', unit: '10¹⁰ M☉', hint: '8' },
      ],
      validate: v => {
        if (![v.reduced, v.disc].every(Number.isFinite)) return null;
        if (Math.abs(v.reduced - 50) <= 5 && Math.abs(v.disc - 8) <= 0.3) {
          return {
            level: 'ok',
            message:
              'A reduced χ² of 50 is a fit that is wrong by far more than the errors, and the disk is pressed against the 8 × 10¹⁰ solar-mass bound: the fit would take more if allowed. Stars and gas alone do not make this curve.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “best fit, stars only (no halo)”, then read “Reduced χ²” and “Disk mass” (in units of 10¹⁰).',
        };
      },
      tool: RD({ view: 1, fit: 2 }),
    },
    {
      sid: 'fit-with-a-halo',
      stage: STARS,
      type: 'measure',
      title: 'Add a halo',
      body: `Now choose <strong>best fit, with a halo</strong>. Read the reduced
             χ² and the halo’s speed far out.`,
      fields: [
        { id: 'reduced', label: 'Reduced χ²', unit: '', hint: '4.8' },
        { id: 'halo', label: 'Halo speed, far out', unit: 'km/s', hint: '250' },
      ],
      validate: v => {
        if (![v.reduced, v.halo].every(Number.isFinite)) return null;
        if (Math.abs(v.reduced - 4.79) <= 0.5 && Math.abs(v.halo - 254) <= 10) {
          return {
            level: 'ok',
            message:
              'Ten times better (4.8 against 50) with a halo that carries about 250 km/s far out. It is still not 1: the model is simple (a point bulge, one disk, one halo shape) and the points are combined from different tracers. A good fit shows a halo is enough, not that it is the only possibility.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “best fit, with a halo”, then read “Reduced χ²” and “Halo speed, far out”.',
        };
      },
      tool: RD({ view: 1, fit: 1 }),
    },
    {
      sid: 'where-the-halo-matters',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Where the halo matters',
      body: `With the halo fit, read the row for the speed at 8.3 kpc (the
             Sun): it splits the speed into stars and gas, and halo. Compare
             with the plot far out, at 20 kpc.`,
      prompt: 'Which statement fits the model?',
      options: [
        'At the Sun the stars and gas contribute more than the halo; far out the halo does',
        'The halo contributes more everywhere',
        'The halo contributes nothing at the Sun',
        'The stars and gas contribute more everywhere',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'halo-everywhere',
          option: 1,
          say: 'Look at the row for 8.3 kpc: the stars-and-gas number is the larger one there. The halo takes over past the disk.',
        },
      ],
      hints: [
        'Compare the two numbers in the 8.3 kpc row, then compare the green and orange curves at 20 kpc.',
      ],
      because:
        'At 8.3 kpc stars and gas give about 203 km/s against the halo’s 178, the larger part but not all. At 20 kpc the disk has fallen and the halo is the bigger one. The dark matter is a small part of the force here and most of it far out.',
      tool: RD({ view: 1, fit: 1 }),
    },
    {
      sid: 'say-what-it-assumes',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for naming at least two assumptions and saying what each does: the disk’s mass is bounded (without a bound a disk alone could fit the curve and the fit would not show a halo is needed); the Sun’s distance (8.3 kpc) and speed (244 km/s) are assumed and a different pair changes the curve; the model shapes (a point bulge, an exponential disk, one halo form) are simple. Credit saying the fit shows a halo is enough, not that it exists in that form. Do not credit an answer that says only that the fit proves dark matter.',
      title: 'What the fit assumes',
      body: `The reduced χ² fell from 50 to 4.8. That is a comparison of models,
             not a measurement of a halo.`,
      prompt:
        'Name two assumptions in the stars-only versus halo comparison and say what depends on each.',
      tool: RD({ view: 1, fit: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Nearby stars’ proper motions make a double wave in longitude, whose
             height and center are the Oort constants: A about 13.5 and B about
             −13.7&nbsp;km/s/kpc, so the Sun’s circular speed is about
             226&nbsp;km/s. The measured rotation curve stays flat out to 25&nbsp;kpc;
             a bulge and disk, bounded in mass, fit it badly (reduced χ² of 50)
             and adding a halo fits it ten times better (4.8). That shows a halo is
             enough within a simple model with stated assumptions: the disk’s
             bound, the Sun’s distance and speed.`,
      tool: RD({ view: 1, fit: 1 }),
    },
  ],
};

export default THE_ROTATING_DISK;
