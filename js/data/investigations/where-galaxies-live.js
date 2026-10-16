// =============================================================================
// Where Galaxies Live
// -----------------------------------------------------------------------------
// Content only, no imports (see the-expanding-universe.js for the conventions).
// The instrument is the cosmology family's "redshift-wedge" tool
// (js/cosmologyWidgets.js over js/kernels/cosmology/flrw.js): 2,911 SDSS galaxies
// of a strip 120 degrees by 0.5 degree, placed by right ascension and by the
// comoving distance their redshifts give, with the clustering of counts in cells
// and the density in two shells. The sample is flux limited (r < 17.77), so
// its thinning is selection, not structure: a preview of the selection-effects
// investigations. Numbers are checked by tests/cosmologyInvestigations.test.js.
// =============================================================================

const GALAXIES = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'bright', name: 'A bright galaxy', teffK: 5800, lumSun: 1 },
    { role: 'faint', name: 'A faint galaxy', teffK: 5800, lumSun: 1 },
  ],
};
const WEDGE = (values = {}) => ({ id: 'redshift-wedge', values });
const NEAR = { zmax: 0.04, om: 0.3, view: 0 };
const ALL = { zmax: 0.12, om: 0.3, view: 0 };
const DENSITY = { zmax: 0.12, om: 0.3, view: 1 };

const WHERE_GALAXIES_LIVE = {
  id: 'where-galaxies-live',
  thumbnail: 'images/investigations/where-galaxies-live.webp',
  title: 'Where Galaxies Live',
  subtitle:
    'A wedge of the sky from the Sloan survey: the scale of structure, and a thinning that is not a void',
  duration: '12-22 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 28, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['the-expanding-universe'],
  tags: ['galaxies', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say how a redshift becomes a position, and read a wedge of galaxies as a map',
    'Measure how clumped the galaxies are against a random scatter',
    'Say why the density of a flux-limited survey falls with distance',
    'Tell structure from selection, and say which one a falling density is here',
  ],
  steps: [
    {
      sid: 'a-slice-of-the-universe',
      stage: GALAXIES,
      type: 'read',
      title: 'A slice of the universe',
      body: `A galaxy’s redshift gives its distance, through the expansion, and its
             position on the sky gives its direction. Together they place it in
             space. The instrument shows 2,911 galaxies of the Sloan Digital Sky
             Survey in a strip 120 degrees long and half a degree thick, seen from
             above: we are at the bottom, and distance runs upward. These are
             <strong>authentic</strong> redshifts.
             \n\nThe first thing to read is how far the picture reaches. Choose the
             nearest galaxies, <strong>z ≤ 0.04</strong>, and read how many there
             are and how far the farthest is.`,
      tool: WEDGE(NEAR),
    },
    {
      sid: 'the-near-sample',
      stage: GALAXIES,
      type: 'measure',
      title: 'The near sample',
      body: `With the range at <strong>z ≤ 0.04</strong>, read the
             <strong>galaxies shown</strong> and the <strong>distance of the
             farthest</strong>.`,
      fields: [
        { id: 'n', label: 'Galaxies shown', hint: '363' },
        {
          id: 'r',
          label: 'Distance of the farthest',
          unit: 'Mpc',
          hint: '170',
        },
      ],
      validate: v => {
        if (![v.n, v.r].every(Number.isFinite)) return null;
        if (v.n === 363 && Math.abs(v.r - 169.8) <= 1.5) {
          return {
            level: 'ok',
            message:
              '363 galaxies, the farthest at 170 megaparsecs, about 550 million light-years. A redshift of 0.04 is a velocity of 12,000 km/s, and at these distances the distance is close to the redshift times the speed of light over the Hubble constant.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the range to z ≤ 0.04 and read “Galaxies shown” and “Distance of the farthest, in the cosmology chosen”.',
        };
      },
      tool: WEDGE(NEAR),
    },
    {
      sid: 'the-whole-strip',
      stage: GALAXIES,
      type: 'measure',
      title: 'The whole strip',
      body: `Now take all of it, <strong>z ≤ 0.12</strong>. Read the galaxies
             shown and the farthest distance.`,
      fields: [
        { id: 'n', label: 'Galaxies shown', hint: '2911' },
        {
          id: 'r',
          label: 'Distance of the farthest',
          unit: 'Mpc',
          hint: '500',
        },
      ],
      validate: v => {
        if (![v.n, v.r].every(Number.isFinite)) return null;
        if (v.n === 2911 && Math.abs(v.r - 499.7) <= 2) {
          return {
            level: 'ok',
            message:
              '2,911 galaxies out to 500 megaparsecs. Three times the redshift is three times the distance, to within a few percent, but 8 times the galaxies: the volume grows as the cube of the distance, and the wedge grows with it.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the range to z ≤ 0.12 and read “Galaxies shown” and “Distance of the farthest”.',
        };
      },
      tool: WEDGE(ALL),
    },
    {
      sid: 'predict-the-clumping',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'the-clumping',
      title: 'Clumped or scattered',
      body: `Divide the strip into 24 cells of 5 degrees of right ascension, in
             each shell of distance, and count the galaxies in each. For a random
             scatter, the variance of the counts equals their mean, so their ratio is
             1. The instrument gives that ratio, averaged over the shells. Do not
             read it yet.`,
      prompt: 'The ratio for these galaxies will be&hellip;',
      options: [
        'about 1: galaxies are scattered at random',
        'well below 1: galaxies avoid each other',
        'well above 1: galaxies gather in clumps and leave voids between them',
        'exactly the number of galaxies',
      ],
      answer: 2,
      hints: [
        'If galaxies cluster, some cells hold many and some hold none, and the variance is large.',
      ],
      because:
        'It is well above 1. Galaxies gather into walls, filaments and clusters, with voids between, so the counts in cells vary far more than a random scatter allows. The next step reads how much.',
      tool: WEDGE(ALL),
    },
    {
      sid: 'the-clumping',
      stage: GALAXIES,
      type: 'measure',
      title: 'How clumped',
      body: `With the whole strip showing, read the <strong>variance over
             mean</strong> of the counts in cells.`,
      fields: [{ id: 'vmr', label: 'Variance over mean', hint: '9.8' }],
      validate: v => {
        if (![v.vmr].every(Number.isFinite)) return null;
        if (Math.abs(v.vmr - 9.79) <= 0.2) {
          return {
            level: 'ok',
            message:
              '9.79: the counts vary as if the typical cell’s spread were 3.1 times what chance allows (the square root). Galaxies live in clusters and in the walls between voids; a random scatter would give 1. This is the large-scale structure the wedge shows.',
          };
        }
        return {
          level: 'error',
          message:
            'With z ≤ 0.12, read “Variance over mean of counts in cells (1 for no clustering)”.',
        };
      },
      tool: WEDGE(ALL),
    },
    {
      sid: 'predict-the-thinning',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'the-thinning',
      title: 'Near and far',
      body: `Switch to the picture of galaxies per volume against distance. The
             instrument gives the density in a shell from 100 to 125 megaparsecs and in
             one from 300 to 325. Do not read them yet.`,
      prompt: 'The density at 300 megaparsecs will be&hellip;',
      options: [
        'about the same as at 100, if the universe is the same everywhere',
        'about three times higher',
        'much lower, about a third',
        'zero',
      ],
      answer: 2,
      hints: [
        'The wedge visibly thins with distance. Ask whether the universe or the survey is doing that.',
      ],
      because:
        'It is much lower, about a third. Whether that is the universe or the survey is the next question. The next step reads both numbers.',
      tool: WEDGE(DENSITY),
    },
    {
      sid: 'the-thinning',
      stage: GALAXIES,
      type: 'measure',
      title: 'Near and far density',
      body: `Read the <strong>galaxies per million cubic megaparsecs</strong> in the
             shell at 100 to 125 megaparsecs, and in the one at 300 to 325.`,
      fields: [
        { id: 'near', label: 'At 100 to 125 Mpc', hint: '15800' },
        { id: 'far', label: 'At 300 to 325 Mpc', hint: '4860' },
      ],
      validate: v => {
        if (![v.near, v.far].every(Number.isFinite)) return null;
        if (Math.abs(v.near - 15840) <= 120 && Math.abs(v.far - 4860) <= 40) {
          return {
            level: 'ok',
            message:
              '15,800 galaxies per million cubic megaparsecs near, 4,860 far: the far shell is 3.3 times thinner. A universe that is the same everywhere, as the large scale of the universe is, does not do this; the survey does.',
          };
        }
        return {
          level: 'error',
          message:
            'With the whole strip, read “Galaxies per 10^6 cubic Mpc, 100 to 125 Mpc” and “… 300 to 325 Mpc”.',
        };
      },
      tool: WEDGE(DENSITY),
    },
    {
      sid: 'why-it-thins',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'A void, or the survey',
      body: `The galaxies are three times thinner at 300 megaparsecs than at 100,
             and the survey took every galaxy it could with an r-band magnitude
             brighter than 17.77.`,
      prompt: 'What is the best explanation?',
      options: [
        'We live at the center of a huge void, and the density rises with distance from us',
        'The survey sees only galaxies brighter than its limit; far away, it counts only the intrinsically brightest, so the density it reports falls: selection, not structure',
        'The expansion of the universe has pushed the far galaxies apart',
        'The redshifts of far galaxies are less accurate',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'local-void',
          option: 0,
          say: 'A local void of that size would contradict everything else we know of the universe’s uniformity. A flux limit explains the thinning with no new physics.',
        },
        {
          id: 'pushed-apart',
          option: 2,
          say: 'The expansion is already in the distances: a density per comoving volume is unchanged by it. The thinning is in the counts, not in the space.',
        },
      ],
      hints: [
        'A galaxy has to be bright enough to make the cut. Ask what fraction of galaxies is that bright at 100 megaparsecs and at 300.',
      ],
      because:
        'At 100 megaparsecs the survey counts galaxies much fainter than at 300, so it finds many more per volume near and only the brightest far. The thinning follows from the limit. It is a selection effect: a survey that looks the same at every distance would need a luminosity function to correct it. Selection effects are the subject of the next group of investigations.',
      tool: WEDGE(DENSITY),
    },
    {
      sid: 'what-you-worked-out',
      stage: GALAXIES,
      type: 'read',
      title: 'What you worked out',
      body: `A redshift placed 2,911 galaxies in a wedge 500 megaparsecs deep, and
             the wedge is not smooth: the counts in cells vary with a variance 9.8
             times the mean, where chance would give 1. Galaxies gather in
             clusters and walls with voids between them. The density in the
             far shell is 3.3 times thinner than in the near one, and that is the
             flux limit of the survey, which sees only the brightest galaxies far
             away.
             \n\nNot done here: the stretching of a redshift by a galaxy’s own
             motion (which stretches clusters along the line of sight), the
             correction for the survey’s limit that would show the true density, and
             the three-dimensional picture of a survey on the whole sky. The
             distances use a flat universe with the matter density you set.`,
      tool: WEDGE(DENSITY),
    },
  ],
};

export default WHERE_GALAXIES_LIVE;
