// =============================================================================
// The First Rung
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the variable-star family's "leavitt-law" tool, here on its
// two host galaxies (js/variableWidgets.js over js/kernels/variables/
// ladder.js): the relation fitted on the Large Magellanic Cloud is slid onto the
// Cepheids of NGC 4258 and M101, and the slide is the distance modulus, with a
// four-term error budget. NGC 4258 has an independent distance from water masers
// (Reid, Pesce and Riess 2019). The Large Magellanic Cloud's distance is a
// published value (Pietrzynski et al. 2019). Not linked: the Hubble constant;
// Prompt 91 has not landed. The numbers a student reads are checked by
// tests/variableInvestigations.test.js.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    {
      role: 'host',
      name: 'A Cepheid in another galaxy',
      teffK: 5500,
      lumSun: 5000,
    },
    {
      role: 'anchor',
      name: 'A Cepheid in the Magellanic Cloud',
      teffK: 5500,
      lumSun: 5000,
    },
  ],
};
const LEAVITT = (values = {}) => ({ id: 'leavitt-law', values });

const THE_FIRST_RUNG = {
  id: 'the-first-rung',
  thumbnail: 'images/investigations/the-first-rung.webp',
  title: 'The First Rung',
  subtitle:
    'The distance to two galaxies from their Cepheids, with every error accounted for',
  duration: '12-20 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: ['leavitts-law'],
  tags: ['observing', 'stars', 'galaxies'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure a galaxy’s distance modulus by sliding the Cepheid relation onto its Cepheids, and turn it into a distance',
    'Check a Cepheid distance against an independent one and say whether they agree within their errors',
    'Read an error budget and say which term limits the distance and which do not matter',
    'Say what is not corrected and what this first rung does not reach',
  ],
  steps: [
    {
      sid: 'sliding-the-relation',
      stage: STARS,
      type: 'read',
      title: 'Sliding the relation',
      body: `A Cepheid’s period gives its luminosity, and its luminosity with its
             measured brightness gives its distance. In practice you do not do it
             star by star: you fit the relation on stars at a known distance,
             then slide the whole line up or down until it passes through another
             galaxy’s Cepheids. The slide, in magnitudes, is the
             <strong>distance modulus</strong>, μ, the difference between how
             bright the stars look and how bright they are. The distance is
             10<sup>(μ+5)/5</sup> parsecs.
             \n\nThe instrument has the relation of the Large Magellanic Cloud as
             the pale line. Choose a galaxy: its Cepheids appear as colored dots
             and the warm line is the slid relation. These are
             <strong>authentic</strong> Hubble measurements, thinned to every
             fourth star.`,
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'a-maser-galaxy',
      stage: STARS,
      type: 'measure',
      title: 'NGC 4258',
      body: `Choose <strong>NGC 4258</strong>, a spiral galaxy in Canes Venatici.
             Read its <strong>distance modulus</strong> and its
             <strong>distance</strong> in megaparsecs.`,
      fields: [
        { id: 'mu', label: 'Distance modulus', unit: 'mag', hint: '29.40' },
        { id: 'd', label: 'Distance', unit: 'Mpc', hint: '7.59' },
      ],
      validate: v => {
        if (![v.mu, v.d].every(Number.isFinite)) return null;
        if (Math.abs(v.mu - 29.4) <= 0.02 && Math.abs(v.d - 7.59) <= 0.08) {
          return {
            level: 'ok',
            message:
              '29.40 ± 0.05 magnitudes, which is 7.59 ± 0.18 megaparsecs, about 25 million light-years, from 111 Cepheids. The slide is 10.9 magnitudes from the Magellanic Cloud’s 18.48: the galaxy is 153 times as far, so a Cepheid in it looks 23,000 times fainter than the same star in the cloud.',
          };
        }
        return {
          level: 'error',
          message:
            'Pick “NGC 4258” and read “Distance modulus” (magnitudes) and “Distance” (megaparsecs).',
        };
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'predict-the-maser-check',
      stage: STARS,
      type: 'predict',
      reveal: 'the-maser-check',
      title: 'Does it agree',
      body: `NGC 4258 has a second, independent distance. Water masers in its
             nucleus orbit the central black hole, and their motion gives the
             distance geometrically, with no Cepheid in it. Do not change the
             instrument yet.`,
      prompt: 'The Cepheid distance modulus will&hellip;',
      options: [
        'agree with the maser distance within the errors of both',
        'differ by about two combined errors',
        'differ by many times the combined errors',
        'be impossible to compare, because one is a modulus and the other a distance',
      ],
      answer: 0,
      hints: [
        'The comparison is the difference of the two moduli over the quadrature sum of their errors.',
      ],
      because:
        'It will agree. The two methods share no steps except the Large Magellanic Cloud’s distance on the Cepheid side, and the difference comes out at a tenth of the combined error. A distance modulus and a distance are the same quantity in two units, so they can be compared. The next step reads the maser value.',
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'the-maser-check',
      stage: STARS,
      type: 'measure',
      title: 'The maser check',
      body: `With NGC 4258 chosen, read the <strong>distance modulus from water
             masers</strong> the instrument lists, and its error.`,
      fields: [
        {
          id: 'maser',
          label: 'Maser distance modulus',
          unit: 'mag',
          hint: '29.40',
        },
        { id: 'sigma', label: 'Its error', unit: 'mag', hint: '0.032' },
      ],
      validate: v => {
        if (![v.maser, v.sigma].every(Number.isFinite)) return null;
        if (
          Math.abs(v.maser - 29.4) <= 0.02 &&
          Math.abs(v.sigma - 0.032) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              '29.397 ± 0.032 from the masers against 29.403 ± 0.051 from the Cepheids: they differ by 0.006 magnitudes, 0.1 of the combined error 0.060. That is agreement: the Cepheid ladder, anchored on the Magellanic Cloud, reproduces a geometric distance to under one percent of it.',
          };
        }
        return {
          level: 'error',
          message:
            'With “NGC 4258” chosen, read “Distance modulus from water masers” and the error that follows it.',
        };
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'the-budget',
      stage: STARS,
      type: 'measure',
      title: 'The budget',
      body: `The error of ±0.051 magnitudes is the sum, in quadrature, of four
             terms. Read the biggest two: the <strong>error from this galaxy’s
             scatter</strong> and the <strong>error in the Magellanic Cloud’s
             distance</strong>.`,
      fields: [
        {
          id: 'host',
          label: 'From this galaxy’s scatter',
          unit: 'mag',
          hint: '0.043',
        },
        {
          id: 'lmc',
          label: 'From the Cloud’s distance',
          unit: 'mag',
          hint: '0.026',
        },
      ],
      validate: v => {
        if (![v.host, v.lmc].every(Number.isFinite)) return null;
        if (
          Math.abs(v.host - 0.043) <= 0.003 &&
          Math.abs(v.lmc - 0.026) <= 0.002
        ) {
          return {
            level: 'ok',
            message:
              'The galaxy’s own scatter (0.043) and the Cloud’s distance (0.026) between them make the whole 0.051. The other two terms are tiny: the calibration’s scatter, 0.005, and the slope carried across, 0.0002, because NGC 4258’s Cepheids have about the same periods as the cloud’s. Quadrature means the larger terms dominate: 0.043 and 0.026 make 0.050 together, and the last two add almost nothing.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Error from this galaxy’s scatter” and “Error in the Magellanic Cloud’s distance”, both in magnitudes, with NGC 4258 chosen.',
        };
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'what-limits-it',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What limits the distance',
      body: `The terms are 0.043 (the galaxy’s scatter over its 111 stars),
             0.026 (the Cloud’s distance), 0.005 (the calibration’s scatter over
             339 stars) and 0.0002 (the slope).`,
      prompt:
        'Which of these would shrink if you found ten times as many Cepheids in both galaxies?',
      options: [
        'All four, to a tenth',
        'The two scatter terms, which fall as one over the square root of the number of stars, but not the Cloud’s distance, which is a separate measurement',
        'Only the Cloud’s distance',
        'None: more stars never helps',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'all-shrink',
          option: 0,
          say: 'Scatter terms fall as one over √N, so ten times the stars helps by a factor of 3, not 10; and the Cloud’s distance does not fall at all, because it is a different measurement.',
        },
        {
          id: 'never',
          option: 3,
          say: 'More stars do help the scatter terms. They just cannot reach the part of the error that comes from outside the Cepheids.',
        },
      ],
      hints: [
        'Ask for each term whether it is an average over stars, or a number that came from somewhere else.',
      ],
      because:
        'The galaxy and calibration terms are averages over stars and shrink as 1/√N; the Cloud’s distance is a fixed input with its own error. With a hundred times the stars the scatter terms would be negligible and the Cloud’s 0.026 would set the floor, 1.2 percent in distance. That floor is why anchors matter so much to the distance ladder.',
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'another-galaxy',
      stage: STARS,
      type: 'measure',
      title: 'M101',
      body: `Choose <strong>M101</strong>, the Pinwheel Galaxy, and read its
             <strong>distance modulus</strong> and its
             <strong>distance</strong>.`,
      fields: [
        { id: 'mu', label: 'Distance modulus', unit: 'mag', hint: '29.21' },
        { id: 'd', label: 'Distance', unit: 'Mpc', hint: '6.95' },
      ],
      validate: v => {
        if (![v.mu, v.d].every(Number.isFinite)) return null;
        if (Math.abs(v.mu - 29.21) <= 0.02 && Math.abs(v.d - 6.95) <= 0.08) {
          return {
            level: 'ok',
            message:
              '29.21 ± 0.05 magnitudes: 6.95 ± 0.17 megaparsecs, about 23 million light-years, from 65 Cepheids. M101 comes out 0.2 magnitudes nearer than NGC 4258, which is 8 percent nearer; the slope term here is larger (0.002) because M101’s Cepheids differ more in period from the cloud’s.',
          };
        }
        return {
          level: 'error',
          message:
            'Pick “M101” and read “Distance modulus” (magnitudes) and “Distance” (megaparsecs).',
        };
      },
      tool: LEAVITT({ host: 2 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Sliding the Magellanic Cloud’s Cepheid relation onto NGC 4258’s
             Cepheids gives a distance modulus of 29.40 ± 0.05, 7.59 ± 0.18
             megaparsecs, and the geometric distance from masers agrees to a tenth
             of the combined error. M101 comes out at 6.95 ± 0.17 megaparsecs.
             The error is the galaxy’s own scatter and the cloud’s distance; the
             rest does not matter.
             \n\nThis is the first rung of the distance ladder: Cepheids reach
             galaxies tens of millions of light-years away, and supernovae,
             calibrated on them, reach much farther. Not corrected here: the
             effect of metal content on the Cepheids, crowding in the images,
             and the covariance in the table’s errors, which the scatter about
             the relation stands in for. The link from this ladder to the
             Hubble constant is made in <em>Standard Candles</em>: the error
             of a rung is the error it passes on, and the advanced step here
             counts it. The supernova hosts that would carry the ladder to the
             Hubble constant are not in this investigation.`,
      tool: LEAVITT({ host: 1 }),
    },
  ],
};

export default THE_FIRST_RUNG;
