// =============================================================================
// The stellar closeout investigations (Prompt 224)
// -----------------------------------------------------------------------------
// The connecting investigations of the stellar unit (Prompts 217 to 223), in one
// module that also carries their Spanish words, their deeper steps and their
// instructor content: the one closure file the closeout adds (D-R10-224-01),
// because the shared sequence files sit at their line ceilings. The per-lesson
// path every loader builds from an id is a one-line re-export of a named export
// here (English, `_ES` for the Spanish, `_DEEPER` and `_DEEPER_ES` for the deeper
// steps), and the instructor modules read INSTRUCTOR.
//
// Content, no imports: every number a step states is recomputed in
// tests/stellarCloseout.test.js from the instruments the lesson points at (the
// cluster-fit panel and the bundled MIST tracks behind the evolution playback,
// the remnant panel, the SDSS spectrum dataset's own grid and temperatures). Every
// step carries a `sid`, an opaque stable id that student progress is keyed by:
// reword a step, move it, translate it, never change its sid.
//
// What the five investigations are, and are not (D-R10-224-02):
// - They use the panels that already exist. No instrument is added, no dataset
//   is added, and nothing is fetched.
// - Every cluster is synthetic and says so; the evolutionary tracks are MIST
//   models at solar metallicity, not observations of named stars; the four SDSS
//   spectra are observations, and the investigation about them never claims a
//   measurement they cannot support (they hold no giant to set against a dwarf).
// - A public supernova light curve is not shipped: no rights decision exists for
//   one, and a synthetic curve would need a new instrument. "When a Star
//   Explodes" is about the progenitor and the energy bound, and says that the
//   light curve is the missing half.
// - The metallicity and kinematic split of the stellar populations needs a
//   sample (R18) that no panel carries; "Populations I and II" teaches the
//   metallicity half with the cluster fit and says what is left out.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

/** A shelf of stars on the main canvas: a display, not an orbit. */
const shelf = (stars, extra = {}) => ({
  spacing: 95,
  fit: true,
  ...extra,
  stars,
});

const EIGHT = [
  { role: 'm020', name: '0.2 M☉', track: 'm020', at: 'ms' },
  { role: 'm050', name: '0.5 M☉', track: 'm050', at: 'ms' },
  { role: 'm100', name: '1 M☉', track: 'm100', at: 'ms' },
  { role: 'm200', name: '2 M☉', track: 'm200', at: 'ms' },
  { role: 'm500', name: '5 M☉', track: 'm500', at: 'ms' },
  { role: 'm1000', name: '10 M☉', track: 'm1000', at: 'ms' },
  { role: 'm2000', name: '20 M☉', track: 'm2000', at: 'ms' },
  { role: 'm4000', name: '40 M☉', track: 'm4000', at: 'ms' },
];
const FOUR_KINDS = [
  { role: 'main', name: 'A', track: 'm100', at: 'ms' },
  { role: 'giant', name: 'B', track: 'm100', at: 0.206 },
  { role: 'supergiant', name: 'C', track: 'm2000', at: 1 },
  { role: 'wd', name: 'D', teffK: 25000, lumSun: 0.01 },
];
/** One star alone, for the evolution playback to drive. */
const ALONE = track => ({
  spacing: 95,
  fit: true,
  stars: [{ role: 'star', name: 'The star', track, at: 'ms' }],
});
const CLUSTERS_STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A younger cluster', teffK: 6500, lumSun: 2 },
    { role: 'star', name: 'An older cluster', teffK: 5600, lumSun: 1 },
  ],
};
const BLACKHOLE_STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    {
      role: 'star',
      name: 'A star of 15 solar masses',
      teffK: 28000,
      lumSun: 20000,
    },
  ],
};
const SPECTRA_STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'a', name: 'An A star', teffK: 7852, lumSun: 15 },
    { role: 'm', name: 'An M star', teffK: 3980, lumSun: 0.1 },
  ],
};

/** The stellar lab's diagram of the model stars, with its regions drawn. */
const LAB = (extra = {}) => ({
  id: 'stellar-lab',
  mode: 'model',
  regions: true,
  ...extra,
});
/** The evolution playback on one track, parked where a step wants it. */
const EVOL = (extra = {}) => ({
  id: 'stellar-evolution',
  bind: 'star',
  autoplay: false,
  capture: false,
  ...extra,
});
/** The cluster fit: cluster 0 is A and 1 is B; feh the assumed metallicity; binaries 0 or 1. */
const CL = (values = {}) => ({
  id: 'cluster-fit',
  values: { cluster: 0, feh: -0.25, binaries: 0, truth: 0, ...values },
});
/** The remnant panel: initial mass in solar masses, view 1 the outcome probabilities. */
const OUT = (values = {}) => ({
  id: 'remnant-outcome',
  values: { mi: 15, relation: 0, view: 1, ...values },
});
/** The spectrum comparison: window 0 the whole range, 1 Ca K, 2 H-beta, 3 Na D, 4 TiO. */
const SPEC = (values = {}) => ({
  id: 'spectra-compare',
  values: { window: 0, focus: 0, named: 0, ...values },
});

// -----------------------------------------------------------------------------
// 1. Reading the HR diagram
// -----------------------------------------------------------------------------
export const READING_THE_HR_DIAGRAM = {
  id: 'reading-the-hr-diagram',
  thumbnail: 'images/investigations/reading-the-hr-diagram.webp',
  title: 'Reading the HR Diagram',
  subtitle:
    'What the regions of the diagram are, how a distance puts a star on it, and why the main sequence is a band and not a line',
  duration: '6-8 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['a-universe-of-stars'],
  tags: ['stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Name the regions of the diagram (the main sequence, the giants, the supergiants and the white dwarfs) and say what puts a star in each',
    'Say why a star that is hot and faint must be small, from the surface it has to shine with',
    'Say that a distance is needed to put a star on the diagram, and read a cluster’s distance modulus from its fit',
    'Say that the main sequence is a band whose width has causes (binaries, the metallicity that is assumed, the age) and not a measurement error alone',
  ],
  steps: [
    {
      sid: 'two-numbers-one-picture',
      stage: shelf(EIGHT, { spacing: 78 }),
      type: 'read',
      title: 'Two numbers and a picture',
      body: `The <strong>Hertzsprung&ndash;Russell diagram</strong> plots every star by two numbers: how
             hot its surface is, along the bottom with the hot end on the left, and how much light it gives
             out, up the side. Both axes are logarithmic. Most stars fall on a diagonal band, the
             <strong>main sequence</strong>, where they fuse hydrogen in their cores. Stars that have used
             that hydrogen up leave it and become <strong>giants</strong> and <strong>supergiants</strong>,
             cool and very bright; the cores they leave behind are <strong>white dwarfs</strong>, hot and
             faint.
             \n\nThe panel draws eight model stars from the bundled MIST tracks (models at the Sun&rsquo;s
             composition, not named stars) with the regions marked. The position of a star on the diagram is
             not a place in space: it is two properties, and a star moves across the diagram as it ages.`,
      tool: LAB(),
    },
    {
      sid: 'which-region',
      stage: shelf(FOUR_KINDS, { fit: true }),
      type: 'question',
      kind: 'choice',
      title: 'Hot and faint',
      body: `Star <strong>D</strong> on the shelf has a surface at 25,000 K and gives out one hundredth of
             the Sun&rsquo;s light. Stars A, B and C are a Sun-like star, a red giant and a supergiant. A hot
             surface gives out a great deal of light for each square meter.`,
      prompt:
        'What kind of star is D, and what does its position say about its size?',
      options: [
        'A white dwarf: a hot surface that gives out so little light in all must have very little surface, so the star is tiny',
        'A red giant: it is faint because it is cool',
        'A main-sequence star: hot stars are always the brightest',
        'A supergiant: it is hot, so it is large',
      ],
      answer: 0,
      hints: [
        'The light a star gives out is its surface area times what each square meter gives out, and a hot surface gives out a lot.',
      ],
      because:
        'D is a white dwarf. Each square meter of a 25,000 K surface shines about 350 times as hard as the Sun’s, yet the star gives out only a hundredth of the Sun’s light, so its area is about a hundredth over 350 of the Sun’s: it is roughly the size of a planet. Faint is not the same as cool.',
      misconceptions: [
        {
          id: 'cool',
          option: 1,
          say: 'A red giant is cool and bright, in the upper right. D is hot, in the lower left.',
        },
        {
          id: 'bright',
          option: 2,
          say: 'Hot surfaces are bright per square meter, but the star’s total light also depends on its size, and D is very small.',
        },
      ],
      tool: LAB(),
    },
    {
      sid: 'distance-puts-it-there',
      stage: CLUSTERS_STAGE,
      type: 'measure',
      title: 'A distance puts the stars there',
      body: `A diagram of <em>apparent</em> brightness is not yet an HR diagram: a star twice as far looks
             four times fainter. The panel shows the stars of cluster <strong>A</strong> (synthetic, so the
             answer can be checked) with their apparent magnitudes and fits a model curve to them. The shift
             that lines the curve up with the stars is the <strong>distance modulus</strong>, the apparent
             magnitude minus the absolute magnitude. Read it, at the metallicity the panel opens on.`,
      fields: [
        {
          id: 'dm',
          label: 'Distance modulus of cluster A',
          unit: 'mag',
          hint: '12.10',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.dm)) return null;
        if (near(v.dm, 12.1, 0.03)) {
          return {
            level: 'ok',
            message:
              'About 12.10 magnitudes: every star of the cluster is 12.1 magnitudes fainter than it would be at 10 parsecs. That one number turns the cluster’s apparent diagram into an HR diagram.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose cluster A, [Fe/H] −0.25, no binaries, and read the distance modulus from the readout: about 12.10.',
        };
      },
      tool: CL(),
    },
    {
      sid: 'a-band-not-a-line',
      stage: CLUSTERS_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A band, not a line',
      body: `Look at the main sequence of the cluster. The stars are all at one distance, so distance cannot
             spread them, yet they do not fall on a single curve. Switch binaries <strong>on</strong> in the
             panel and watch the sequence.`,
      prompt: 'Which of these widens the main sequence of a real cluster?',
      options: [
        'Unresolved binary stars, which look brighter than either star alone, and stars of different metal content; the measurement error adds to both',
        'Only the measurement error: a main sequence is a line',
        'Only the distance of each star, because a cluster is deep',
        'Only the age, because stars of one age have different ages on the sequence',
      ],
      answer: 0,
      hints: [
        'Two stars blended into one point give out more light than either, so the point sits higher than the sequence.',
      ],
      because:
        'Several things. A pair of unresolved binary stars is brighter than one star and lies above the sequence, up to about 0.75 magnitude; stars of different [Fe/H] lie on slightly different sequences; and the stars’ measured brightnesses have errors. In a cluster the distance is common to all, so it does not widen the band. The width is information, not just scatter.',
      misconceptions: [
        {
          id: 'line',
          option: 1,
          say: 'The error is part of it, but binaries and composition move whole stars off the line by more than the error does.',
        },
        {
          id: 'depth',
          option: 2,
          say: 'A cluster’s stars are all at nearly one distance (it is far smaller than its distance), so distance does not spread them.',
        },
      ],
      tool: CL({ binaries: 1 }),
    },
    {
      sid: 'what-the-diagram-gives',
      stage: CLUSTERS_STAGE,
      type: 'read',
      title: 'What the diagram gives',
      body: `A star&rsquo;s place on the diagram says what kind of star it is: on the main sequence it is
             fusing hydrogen, above it it has left, and below and to the left it is a white dwarf. The place
             needs a distance, and the width of the sequence needs an explanation, which can be a pair of
             stars, a composition or a spread in age. The cluster panel fits an age and a distance on
             assumptions it states, and you will see in the deeper steps what two of those assumptions cost.
             \n\nThe stars near the Sun have a diagram of their own in the Observatory (the Gaia nearby-star dataset,
             with the limits of its selection stated there). It is not drawn in this investigation.`,
      tool: CL(),
    },
  ],
};

export const READING_THE_HR_DIAGRAM_DEEPER = {
  id: 'reading-the-hr-diagram',
  steps: [
    {
      sid: 'the-size-of-a-white-dwarf',
      after: 'which-region',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How small is D?',
      body: `A star&rsquo;s radius follows from its light and its temperature: <em>R</em> over the
             Sun&rsquo;s radius is the square root of <em>L</em> over the Sun&rsquo;s light, divided by the
             square of <em>T</em> over the Sun&rsquo;s temperature (5772 K). Use L = 0.01 and T = 25,000 K.`,
      prompt: 'The radius of star D, in solar radii',
      unit: 'R☉',
      answer: 0.0053,
      tolerance: 0.0003,
      hints: ['√0.01 = 0.1, and (25000 / 5772)² is about 18.8.'],
      worked:
        '0.1 / 18.76 = 0.00533 R☉, about 3,700 km: a little smaller than the Earth. A white dwarf holds a star’s mass in a planet’s volume.',
      feedback: {
        close:
          'Close. Take the square root of 0.01, then divide by (25000/5772) squared.',
        'wrong-order-of-magnitude':
          'A power of ten out: the star is far smaller than the Sun, but not a thousand times smaller.',
        off: '√0.01 / (25000 / 5772)².',
      },
      tool: LAB(),
    },
    {
      sid: 'the-distance-in-parsecs',
      after: 'distance-puts-it-there',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The cluster’s distance',
      body: `A distance modulus <em>m &minus; M</em> and a distance <em>d</em> in parsecs are related by
             <em>m &minus; M</em> = 5 log<sub>10</sub>(<em>d</em>) &minus; 5. Use the 12.10 you read.`,
      prompt: 'The distance of cluster A, in parsecs',
      unit: 'pc',
      answer: 2630,
      tolerance: 60,
      hints: ['d = 10^((12.10 + 5) / 5).'],
      worked:
        '10^(17.10/5) = 10^3.42 = 2,630 pc, about 2.6 kiloparsecs. A twelfth-magnitude modulus is a few kiloparsecs; ten parsecs would be a modulus of zero.',
      feedback: {
        close: 'Close. Ten to the power (12.10 + 5) divided by 5.',
        'wrong-order-of-magnitude':
          'A power of ten out: a modulus of 12 is a few thousand parsecs, not a few hundred or a few hundred thousand.',
        off: '10 ^ ((12.10 + 5) / 5).',
      },
      tool: CL(),
    },
    {
      sid: 'what-binaries-do-to-the-fit',
      after: 'a-band-not-a-line',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What binaries do to the distance',
      body: `Fit cluster A with binaries <strong>off</strong> and then <strong>on</strong> (30 percent of
             the stars are drawn as unresolved pairs), at the same metallicity, and read the distance
             modulus each time: 12.10 and 12.04. A pair is brighter than one star, so stars that sit high
             make the cluster look nearer.`,
      prompt:
        'By what percentage does the fitted distance fall when the pairs are in the sample?',
      unit: '%',
      answer: 2.6,
      tolerance: 0.3,
      hints: [
        'The distance changes by the factor 10 to the power (Δmodulus / 5).',
      ],
      worked:
        '10^(−0.058/5) = 0.974: 2.6 percent nearer, and the age rises from 2.02 to 2.06 Gyr. The fit does not know the pairs are pairs, so the answer moves, and the width of the sequence was the clue.',
      feedback: {
        close:
          'Close. Ten to the power of the modulus difference over five, minus one.',
        'wrong-order-of-magnitude':
          'A power of ten out: a hundredth of a magnitude is a few tenths of a percent of the distance.',
        off: '100 × (1 − 10 ^ (−0.058 / 5)).',
      },
      tool: CL({ binaries: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. A star's life in numbers
// -----------------------------------------------------------------------------
export const A_STARS_LIFE_IN_NUMBERS = {
  id: 'a-stars-life-in-numbers',
  thumbnail: 'images/investigations/a-stars-life-in-numbers.webp',
  title: 'A Star’s Life in Numbers',
  subtitle:
    'How long a star lives on the main sequence, read from the MIST tracks, why the heaviest die first, and how a cluster’s turnoff is a clock',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 22, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Read the main-sequence lifetime of a model star from the evolution playback and compare a 20 solar-mass star with the Sun',
    'Say why a heavier star lives so much less: it has more fuel but spends it far faster',
    'Say that the lifetime does not fall as one power of the mass, and read how the slope changes',
    'Say how the stars that are leaving the main sequence in a cluster give its age',
  ],
  steps: [
    {
      sid: 'fuel-and-rate',
      stage: ALONE('m100'),
      type: 'read',
      title: 'Fuel and rate',
      body: `A star on the main sequence fuses hydrogen in its core. How long that lasts is a fuel
             supply divided by a rate of use: the fuel is the hydrogen in the core, which is a share of the
             star&rsquo;s mass, and the rate is the star&rsquo;s luminosity. The evolution playback beside the
             text follows eight model stars from the MIST tracks (at the Sun&rsquo;s composition, with no
             rotation). The <strong>This phase</strong> row of its readout gives how long the phase the
             playhead is in lasts. The playback opens on the main-sequence phase of a one-solar-mass
             star.`,
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
    {
      sid: 'which-lives-longer',
      stage: ALONE('m100'),
      type: 'predict',
      reveal: 'a-heavy-life',
      title: 'Twenty times the fuel',
      body: `A star of 20 solar masses has 20 times the hydrogen of the Sun. Before you read the
             playback, commit.`,
      prompt: 'Its main sequence lasts…',
      options: [
        'about 20 times longer than the Sun’s, because it has 20 times the fuel',
        'about the same, because bigger stars burn at the same rate',
        'far shorter: about a thousandth of the Sun’s, because it uses the fuel much faster than it has more of it',
        'about 20 times shorter, because bigger stars are 20 times hotter',
      ],
      answer: 2,
      because:
        'About a thousandth. The star has 20 times the fuel, but it shines about 57,000 times as brightly as the Sun-like star, so it uses its fuel thousands of times faster than it has more of it. The next step reads the two lifetimes.',
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
    {
      sid: 'a-sun-like-life',
      stage: ALONE('m100'),
      type: 'measure',
      title: 'A Sun-like life',
      body: `The playhead is part-way along the <strong>main sequence</strong> of the one-solar-mass
             star. Read the <strong>This phase</strong> row of the readout: how long this phase really
             lasts.`,
      fields: [
        { id: 'sun', label: 'Main sequence of 1 M☉', unit: 'Gyr', hint: '9.9' },
      ],
      validate: v => {
        if (!Number.isFinite(v.sun)) return null;
        if (near(v.sun, 9.88, 0.3)) {
          return {
            level: 'ok',
            message:
              'About 9.9 billion years for the Sun’s model, most of its life. The next step reads the same phase for a star of 20 solar masses.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the This phase row with the star on the main-sequence phase: about 9.9 billion years, in Gyr.',
        };
      },
      tool: EVOL({ track: 'm100', at: 0.139 }),
    },
    {
      sid: 'a-heavy-life',
      stage: ALONE('m2000'),
      type: 'measure',
      title: 'A heavy life',
      body: `The playhead is now part-way along the <strong>main sequence</strong> of a star of 20
             solar masses, with 20 times the hydrogen. Read the <strong>This phase</strong> row again.`,
      fields: [
        {
          id: 'heavy',
          label: 'Main sequence of 20 M☉',
          unit: 'Myr',
          hint: '8.7',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.heavy)) return null;
        if (near(v.heavy, 8.65, 0.3)) {
          return {
            level: 'ok',
            message:
              'About 8.7 million years, in Myr: the ratio to the Sun’s 9.9 billion is about 1,140. The star with 20 times the fuel lives a thousandth as long.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the This phase row on the main-sequence phase of the 20 solar-mass star: about 8.7 million years, so in Myr, not Gyr.',
        };
      },
      tool: EVOL({ track: 'm2000', at: 0.448 }),
    },
    {
      sid: 'why-the-heavy-one-is-short',
      stage: ALONE('m2000'),
      type: 'question',
      kind: 'choice',
      title: 'Why the heavy one is short',
      body: `The 20 solar-mass star has 20 times the fuel and a main sequence a thousand times shorter.
             Read the <strong>luminosity</strong> of the 20 solar-mass star at the start of its main
             sequence: about 43,000 times the Sun&rsquo;s.`,
      prompt: 'What explains the short life?',
      options: [
        'Its luminosity grows much faster than its mass, so it spends its fuel far faster than it has more of it',
        'Heavy stars have less hydrogen, which runs out sooner',
        'Heavy stars are younger, so they have had less time',
        'Heavy stars burn helium, not hydrogen, and helium is used up faster',
      ],
      answer: 0,
      hints: [
        'Lifetime is fuel over rate: what happens to the rate when the mass goes up twenty times?',
      ],
      because:
        'The lifetime is the fuel divided by the luminosity. The fuel grows in proportion to the mass; the luminosity grows far faster (about as the mass to the 3.5 power across the lower main sequence), so the ratio falls. A heavy star also burns a larger share of its hydrogen on the main sequence, which is why the ratio of the two lifetimes is about 1,140 and not the 3,000 that the luminosities alone would give. A heavy star has more hydrogen, not less, and it begins on hydrogen like the rest.',
      misconceptions: [
        {
          id: 'less',
          option: 1,
          say: 'A heavy star has more hydrogen in total; it is the rate of using it that decides.',
        },
        {
          id: 'young',
          option: 2,
          say: 'Both stars start at zero age on the playback; what differs is how long each phase lasts.',
        },
      ],
      tool: EVOL({ track: 'm2000', phase: 'main-sequence' }),
    },
    {
      sid: 'what-the-lifetimes-say',
      stage: ALONE('m100'),
      type: 'read',
      title: 'What the lifetimes say',
      body: `A star&rsquo;s main-sequence lifetime is its fuel over its luminosity, and the luminosity
             rises so steeply with mass that a heavier star lives less, however much it has. That is why the
             heaviest stars of a cluster are the first to leave the main sequence, and why the stars still
             on it in an old cluster are the light ones. The lifetimes here are the models&rsquo;, from one
             grid, at one composition. The deeper steps read how the lifetime falls with mass and use it as a
             clock.`,
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
  ],
};

export const A_STARS_LIFE_IN_NUMBERS_DEEPER = {
  id: 'a-stars-life-in-numbers',
  steps: [
    {
      sid: 'the-ratio',
      after: 'a-heavy-life',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The ratio',
      body: `You read 9.88 billion years for 1 solar mass and 8.65 million for 20. Divide.`,
      prompt: 'How many times longer is the Sun-like star’s main sequence?',
      unit: '',
      answer: 1140,
      tolerance: 30,
      hints: ['9.88 Gyr is 9,880 Myr.'],
      worked:
        '9,878 / 8.652 = 1,142: a star of 20 times the mass lives about 1,140 times less. If the lifetime fell as one power of the mass, 20 to that power would be 1,140, a power of 2.3; the next step shows that no single power fits.',
      feedback: {
        close: 'Close. Put both in the same unit (9,880 Myr) before dividing.',
        'wrong-order-of-magnitude':
          'A power of ten out: Gyr and Myr differ by a thousand.',
        off: '9880 / 8.65.',
      },
      tool: EVOL({ track: 'm2000', phase: 'main-sequence' }),
    },
    {
      sid: 'the-slope-changes',
      after: 'the-ratio',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The slope is not constant',
      body: `Between 1 and 2 solar masses the main sequence falls from 9.88 Gyr to 1.05 Gyr. If the
             lifetime goes as the mass to the power &minus;<em>k</em>, then <em>k</em> is the logarithm of the
             ratio of the lifetimes over the logarithm of 2.`,
      prompt: 'The power k between 1 and 2 solar masses',
      unit: '',
      answer: 3.23,
      tolerance: 0.1,
      hints: ['log₂(9.878 / 1.054).'],
      worked:
        'log₂(9.878/1.054) = 3.23. Between 10 and 20 solar masses the same calculation gives 1.44, because among the heaviest stars the luminosity grows more slowly with mass, and larger convective cores bring more hydrogen to the burning. The lifetime is not one power of the mass, so a rule of thumb has to say where it holds.',
      feedback: {
        close:
          'Close. Take the logarithm of 9.878/1.054 and divide it by the logarithm of 2.',
        'wrong-order-of-magnitude':
          'A power of ten out: k is a few, not a few tenths or tens.',
        off: 'ln(9.878 / 1.054) / ln 2.',
      },
      tool: EVOL({ track: 'm200', phase: 'main-sequence' }),
    },
    {
      sid: 'the-turnoff-as-a-clock',
      after: 'the-slope-changes',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The turnoff as a clock',
      body: `The stars leaving the main sequence in a cluster are the ones whose lifetime equals its age.
             Cluster A (the synthetic cluster of the cluster-fit panel) has a fitted age of 2.02 Gyr. Between
             1 and 2 solar masses the lifetime goes as the mass to the power &minus;3.23 from 9.88 Gyr at 1
             solar mass.`,
      prompt:
        'The mass of the stars at the turnoff of cluster A, in solar masses',
      unit: 'M☉',
      answer: 1.63,
      tolerance: 0.06,
      hints: ['M = (9.88 / 2.02)^(1 / 3.23).'],
      worked:
        '(9.878/2.022)^(1/3.23) = 1.63 M☉. Cluster B, at 3.16 Gyr, gives 1.42. It is an interpolation between two tracks and the turnoff star is not exactly where the tracks end the main sequence, so a fit with a finer grid of isochrones will differ a little; the point is that a cluster’s age is the lifetime of its turnoff stars.',
      feedback: {
        close: 'Close. Raise 9.88 / 2.02 to the power 1/3.23.',
        'wrong-order-of-magnitude':
          'A power of ten out: the turnoff mass is a little over one solar mass.',
        off: '(9.88 / 2.02) ^ (1 / 3.23).',
      },
      tool: CL(),
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. When a star explodes
// -----------------------------------------------------------------------------
export const WHEN_A_STAR_EXPLODES = {
  id: 'when-a-star-explodes',
  thumbnail: 'images/investigations/when-a-star-explodes.webp',
  title: 'When a Star Explodes',
  subtitle:
    'Which stars end in a collapse, how uncertain the edge is, and how much energy the collapse releases compared with the blast we see',
  duration: '6-10 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 23, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['from-star-to-remnant'],
  tags: ['compact-objects', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say which stars end in a core collapse and which end as white dwarfs without an explosion, and that the boundary is a range',
    'Read an outcome panel that gives probabilities and say what a probability means there',
    'Say that the energy a collapse releases is its gravitational binding energy, and compare it with the energy of the blast',
    'Say what a light curve would add, and that this investigation does not show one',
  ],
  steps: [
    {
      sid: 'the-end-of-a-heavy-star',
      stage: BLACKHOLE_STAGE,
      type: 'read',
      title: 'The end of a heavy star',
      body: `A star fuses hydrogen, then helium, then heavier elements in shells, each stage shorter than
             the one before. If its core grows past what the pressure of its electrons can hold up, the
             core falls in until something stops it: a <strong>neutron star</strong> or, for the heaviest, a
             <strong>black hole</strong>. The fall releases a great deal of energy and throws off the outer
             layers: a <strong>supernova</strong>. Stars below a certain mass never get there; their cores
             become white dwarfs and their outer layers drift off.
             \n\nThe panel is the remnant panel of &ldquo;From Star to Remnant&rdquo;: for an initial mass it gives the
             probability of each outcome, from published thresholds that it cites, with the edges drawn as
             ranges. It is set to a star of 15 solar masses.`,
      tool: OUT(),
    },
    {
      sid: 'which-stars-explode',
      stage: BLACKHOLE_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Which stars explode',
      body: `Set the initial mass to <strong>5</strong> solar masses and read the outcome, then to
             <strong>15</strong>.`,
      prompt: 'What ends a star of 5 solar masses, and what ends one of 15?',
      options: [
        'The 5 solar-mass star becomes a white dwarf without a supernova; the 15 solar-mass star collapses to a neutron star',
        'Both explode, because every star of more than the Sun’s mass does',
        'Neither explodes: supernovae need a companion star',
        'The 5 solar-mass star becomes a black hole and the 15 solar-mass star a white dwarf',
      ],
      answer: 0,
      hints: [
        'Read the probabilities: at 5 solar masses, which outcome has all of them?',
      ],
      because:
        'Below roughly 7 to 9.5 solar masses the core never reaches collapse and the star ends as a white dwarf; above it, up to roughly 20 to 40, the collapse leaves a neutron star. Some supernovae do need a companion (a white dwarf that takes in matter), but a star of 15 solar masses collapses on its own.',
      misconceptions: [
        {
          id: 'every',
          option: 1,
          say: 'A star of 5 solar masses does not explode: the panel gives its outcome as a white dwarf with probability 1.',
        },
        {
          id: 'companion',
          option: 2,
          say: 'One kind of supernova needs a companion, but a massive star’s own core collapse does not.',
        },
      ],
      tool: OUT({ mi: 5 }),
    },
    {
      sid: 'a-star-near-the-edge',
      stage: BLACKHOLE_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A star near the edge',
      body: `Set the initial mass to <strong>9</strong> solar masses. The panel gives a white dwarf with
             probability 0.2 and a neutron star with probability 0.8, and calls the verdict uncertain.`,
      prompt: 'What does that probability mean?',
      options: [
        'The boundary between the two outcomes is only known to lie between 7 and 9.5 solar masses, and at 9 the sources do not decide: it is a statement about what is known, not that a fifth of the star becomes a white dwarf',
        'Eighty percent of the star’s mass collapses and twenty percent does not',
        'The model flips a coin for each star of this mass',
        'The star ends as a white dwarf 20 percent of the time because of its rotation',
      ],
      answer: 0,
      hints: [
        'Look at the thresholds the panel cites: they are ranges, not numbers.',
      ],
      because:
        'The thresholds come from published work that gives a range (the minimum mass for a supernova is 8 ± 1 solar masses in one review, and about 9 in another), so a star at 9 is inside the range and the panel gives a probability over the sources’ disagreement. It is not a share of the star, and it is not a measured rate.',
      misconceptions: [
        {
          id: 'share',
          option: 1,
          say: 'The probability is about the outcome of the whole star, not a share of its mass.',
        },
        {
          id: 'coin',
          option: 2,
          say: 'Nothing is random: the same star of the same mass always gets the same two numbers, because they describe how well the edge is known.',
        },
      ],
      tool: OUT({ mi: 9 }),
    },
    {
      sid: 'where-the-energy-goes',
      stage: BLACKHOLE_STAGE,
      type: 'predict',
      reveal: 'the-share-in-the-blast',
      title: 'Where the energy goes',
      body: `The collapse of a core to a neutron star releases its gravitational binding energy, about
             2.6 &times; 10<sup>46</sup> joules for a star of 1.4 solar masses and a radius of 12 kilometers
             (the deeper step works it out). The expanding layers of a typical supernova carry about
             10<sup>44</sup> joules of motion. Before you divide, commit.`,
      prompt: 'The motion of the blast is…',
      options: [
        'most of the energy the collapse releases',
        'about a tenth of it',
        'well under one percent: nearly all the rest leaves in another form, mainly neutrinos',
        'none of it: the collapse releases no energy',
      ],
      answer: 2,
      because:
        'Well under one percent. A neutron star’s binding energy is about a tenth of its rest energy, and almost all of it leaves as neutrinos in seconds; the motion of the blast and the light are small fractions. The next step divides.',
      tool: OUT(),
    },
    {
      sid: 'the-share-in-the-blast',
      stage: BLACKHOLE_STAGE,
      type: 'measure',
      title: 'The share in the blast',
      body: `Take the binding energy as 2.6 &times; 10<sup>46</sup> J and the motion of the blast as
             1 &times; 10<sup>44</sup> J, a typical value (Janka 2012). Work out the share, as a
             percentage.`,
      fields: [
        {
          id: 'share',
          label: 'Blast motion over the binding energy',
          unit: '%',
          hint: '0.39',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.share)) return null;
        if (near(v.share, 0.39, 0.05)) {
          return {
            level: 'ok',
            message:
              'About 0.39 percent: the blast carries less than half of one percent of what the collapse releases. The energy you see is a small part of the energy there is, and the rest is in a form the sky shows far less easily.',
          };
        }
        return {
          level: 'error',
          message:
            'Divide 1 × 10^44 by 2.6 × 10^46 and multiply by 100: about 0.39 percent.',
        };
      },
      tool: OUT(),
    },
    {
      sid: 'what-a-light-curve-would-add',
      stage: BLACKHOLE_STAGE,
      type: 'read',
      title: 'What a light curve would add',
      body: `The progenitor comes from the mass thresholds above, and the energy is a bound: the most a
             collapse can release is its binding energy, and the blast and the light are a small fraction
             of it. What a supernova&rsquo;s <strong>light curve</strong> adds is how that fraction comes
             out over weeks: the rise, the peak and the long decline. This investigation does not show one.
             No public light curve has a recorded rights decision for redistribution here, and drawing a
             synthetic one would be teaching a curve the program never fitted. The binding energy is a
             uniform-density estimate; a neutron star is not uniform, and the estimate is good to a few
             tens of percent.`,
      tool: OUT(),
    },
  ],
};

export const WHEN_A_STAR_EXPLODES_DEEPER = {
  id: 'when-a-star-explodes',
  steps: [
    {
      sid: 'compute-the-bound',
      after: 'a-star-near-the-edge',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The bound by hand',
      body: `A uniform ball of mass <em>M</em> and radius <em>R</em> has gravitational binding energy
             (3/5) <em>G M</em><sup>2</sup> / <em>R</em>. Use <em>M</em> = 1.4 solar masses
             (2.79 &times; 10<sup>30</sup> kg) and <em>R</em> = 12 km, with <em>G</em> =
             6.674 &times; 10<sup>&minus;11</sup> in SI units.`,
      prompt: 'The binding energy, in units of 10^46 joules',
      unit: '',
      answer: 2.6,
      tolerance: 0.1,
      hints: ['0.6 × 6.674e−11 × (2.785e30)² / 1.2e4.'],
      worked:
        '0.6 × 6.674e−11 × (2.785e30)² / 12,000 = 2.59e46 J. A real neutron star is denser at the center than a uniform ball and relativistic effects matter, so the true figure is within a few tens of percent of this; the order of magnitude, 10^46 to 10^47 joules, is firm.',
      feedback: {
        close:
          'Close. Square the mass first, then divide by the radius in meters.',
        'wrong-order-of-magnitude':
          'A power of ten out: the radius is 12,000 meters, not 12.',
        off: '0.6 × G × M² / R in SI units.',
      },
      tool: OUT(),
    },
    {
      sid: 'compared-with-a-sun',
      after: 'the-share-in-the-blast',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Against a star’s whole life',
      body: `The Sun fuses the hydrogen of its core, about a tenth of its mass, and 0.7 percent of the
             mass of hydrogen that fuses becomes energy. The energy released is
             0.007 &times; 0.1 &times; <em>M c</em><sup>2</sup> for <em>M</em> = 1.989 &times; 10<sup>30</sup> kg.`,
      prompt:
        'How many times the Sun’s main-sequence energy output is the collapse’s binding energy?',
      unit: '',
      answer: 207,
      tolerance: 5,
      hints: ['The Sun’s main-sequence energy is about 1.25 × 10^44 J.'],
      worked:
        '0.0007 × 1.989e30 × (2.998e8)² = 1.25e44 J, about the energy of the blast; the binding energy 2.59e46 over that is 207. A core that collapses for a second releases about two hundred times what a star radiates in its whole hydrogen-burning life.',
      feedback: {
        close: 'Close. Divide 2.59e46 by 1.25e44.',
        'wrong-order-of-magnitude':
          'A power of ten out: the ratio is a couple of hundred.',
        off: '2.59e46 / (0.0007 × M × c²).',
      },
      tool: OUT(),
    },
  ],
};

// -----------------------------------------------------------------------------
// 4. Populations I and II
// -----------------------------------------------------------------------------
export const POPULATIONS_I_AND_II = {
  id: 'populations-i-and-ii',
  thumbnail: 'images/investigations/populations-i-and-ii.webp',
  title: 'Populations I and II',
  subtitle:
    'Metal-rich and metal-poor stars, what the metallicity you assume does to a cluster’s age and distance, and why the old stars that are left are light',
  duration: '6-8 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 22, section: null },
  courseLevel: 'majors',
  mathematics: 'logarithms',
  prerequisites: ['two-clusters-two-ages'],
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say what [Fe/H] means and what a value of −0.5 says about a star’s iron',
    'Say that the age a cluster fit gives depends on the metallicity that is assumed, and read the size of the dependence',
    'Say why the same stars look older when they are assumed to be metal-poor',
    'Say which stars are still on the main sequence in a very old population, and what this investigation leaves out',
  ],
  steps: [
    {
      sid: 'two-kinds-of-star',
      stage: CLUSTERS_STAGE,
      type: 'read',
      title: 'Two kinds of star',
      body: `Astronomers sort stars into two <strong>populations</strong>. Population I, like the Sun,
             is rich in elements heavier than helium, which they call <em>metals</em>; Population II is
             poor in them and old. The measure is <strong>[Fe/H]</strong>: the logarithm of the ratio of iron
             to hydrogen in the star, minus the same for the Sun. The Sun is 0, a star with a tenth of the
             Sun&rsquo;s iron is &minus;1.
             \n\nThe cluster panel fits an age and a distance to a synthetic cluster of stars, but it
             cannot fit the metallicity: you tell it. It offers three, &minus;0.5, &minus;0.25 and 0. The
             stars are the same each time.`,
      tool: CL(),
    },
    {
      sid: 'what-minus-half-means',
      stage: CLUSTERS_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What minus a half means',
      body: `[Fe/H] is a logarithm: &minus;1 is a factor of ten below the Sun&rsquo;s ratio of iron to
             hydrogen.`,
      prompt: 'A star with [Fe/H] = −0.5 has…',
      options: [
        'about a third of the Sun’s iron relative to its hydrogen',
        'half of the Sun’s iron relative to its hydrogen',
        'about a tenth of the Sun’s iron relative to its hydrogen',
        'half of the Sun’s mass',
      ],
      answer: 0,
      hints: ['10 raised to −0.5 is 1 over the square root of 10.'],
      because:
        '10^(−0.5) = 0.316: about a third of the Sun’s iron-to-hydrogen ratio. A negative half is not half; it is a factor of 3.2 below. The scale is logarithmic because stars range over several factors of ten.',
      misconceptions: [
        {
          id: 'half',
          option: 1,
          say: 'The scale is logarithmic: −0.5 dex is a factor of 10^0.5, about 3.2, not 2.',
        },
        {
          id: 'mass',
          option: 3,
          say: '[Fe/H] is a composition and says nothing about the star’s mass.',
        },
      ],
      tool: CL(),
    },
    {
      sid: 'the-same-stars-three-ways',
      stage: CLUSTERS_STAGE,
      type: 'measure',
      title: 'The same stars, two assumptions',
      body: `Fit cluster <strong>A</strong> with the metallicity set to <strong>&minus;0.5</strong> and
             read the age, then set it to <strong>0</strong> and read it again. The stars do not change;
             only the assumption does.`,
      fields: [
        {
          id: 'poor',
          label: 'Age assuming [Fe/H] = −0.5',
          unit: 'Gyr',
          hint: '3.35',
        },
        {
          id: 'rich',
          label: 'Age assuming [Fe/H] = 0',
          unit: 'Gyr',
          hint: '1.47',
        },
      ],
      validate: v => {
        if (![v.poor, v.rich].every(Number.isFinite)) return null;
        if (near(v.poor, 3.35, 0.08) && near(v.rich, 1.47, 0.05)) {
          return {
            level: 'ok',
            message:
              'About 3.35 Gyr if the cluster is metal-poor and 1.47 if it is as rich as the Sun: the same stars, an age more than twice as large. At −0.25 the panel gives 2.02, and that is the metallicity the cluster was drawn with.',
          };
        }
        return {
          level: 'error',
          message:
            'Cluster A, no binaries: about 3.35 Gyr at [Fe/H] −0.5 and 1.47 at 0. The age falls as the assumed metallicity rises.',
        };
      },
      tool: CL({ feh: -0.5 }),
    },
    {
      sid: 'why-older-when-poor',
      stage: CLUSTERS_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why metal-poor means older',
      body: `Compare the model curves the panel draws at the two metallicities: a metal-poor star of a
             given mass is hotter and brighter than a metal-rich one of the same mass.`,
      prompt:
        'Why does assuming the cluster is metal-poor give it a larger age?',
      options: [
        'A metal-poor model of any mass is hotter and brighter, so the stars at the turnoff must be of lower mass to be where they are, and lower-mass stars take longer to leave the main sequence',
        'Metal-poor stars are always older, so the panel adds age',
        'The panel cannot fit a metal-poor cluster, so its answer is a guess',
        'Metals slow the clock of a star',
      ],
      answer: 0,
      hints: [
        'Think of the turnoff: which stars are leaving the main sequence, heavy ones or light ones, in an older cluster?',
      ],
      because:
        'The fit puts the models’ turnoff where the stars’ turnoff is. A metal-poor star is hotter and brighter at a given mass, so to match the same turnoff the stars must be lower in mass, and a lower-mass star lives longer: the cluster must be older. The composition of the stars is not changed by the assumption; what changes is which model they are matched to.',
      misconceptions: [
        {
          id: 'adds',
          option: 1,
          say: 'The panel adds nothing: it matches the stars to the model curve for the metallicity you state, and the curve changes.',
        },
        {
          id: 'guess',
          option: 2,
          say: 'The fit works at each metallicity; the answer it gives is conditional on the one you chose.',
        },
      ],
      tool: CL({ feh: -0.5 }),
    },
    {
      sid: 'who-is-left',
      stage: ALONE('m100'),
      type: 'question',
      kind: 'choice',
      title: 'Who is left',
      body: `The playback gives a one-solar-mass model star a main sequence of 9.9 billion years, and a
             two-solar-mass star 1.05 billion. An old population, such as the halo, is about 12 billion
             years old.`,
      prompt: 'Which stars of that population are still on the main sequence?',
      options: [
        'Only those a little lighter than the Sun; every heavier one has left',
        'All of those heavier than the Sun, which are bigger and longer-lived',
        'Every star, because the main sequence lasts forever',
        'Only the heaviest, which burn the fastest',
      ],
      answer: 0,
      hints: [
        'A heavier star runs through its hydrogen sooner. Where does 12 billion years fall?',
      ],
      because:
        'A solar-mass model leaves the main sequence after 9.9 billion years, so after 12 billion every star of about that mass or more has left, and what remains on the main sequence is the lighter ones. The lighter the star, the longer the wait, and a red dwarf of a fifth of a solar mass has trillions of years.',
      misconceptions: [
        {
          id: 'heavier-longer',
          option: 1,
          say: 'Heavier stars live shorter lives, not longer: the lifetime falls steeply with mass.',
        },
        {
          id: 'forever',
          option: 2,
          say: 'Every model star leaves the main sequence at some time; the red dwarfs just take longer than the age of the universe.',
        },
      ],
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
    {
      sid: 'what-this-does-not-show',
      stage: CLUSTERS_STAGE,
      type: 'read',
      title: 'What this does not show',
      body: `Two things sort the populations in the sky that this investigation does not draw. The first is
             <strong>motion</strong>: Population I stars move in the disc of the galaxy on nearly circular
             orbits, and Population II stars in a halo on eccentric ones, so a sample of stars with
             velocities and metallicities falls into two clouds. The sample for that is not on any panel
             here, and a later part of the program is meant to supply it. The second is the evolutionary
             tracks: they are for the Sun&rsquo;s composition, and a metal-poor star of the same mass
             lives somewhat less, so the deeper steps&rsquo; turnoff masses are bounds for old populations, not
             answers.`,
      tool: CL(),
    },
  ],
};

export const POPULATIONS_I_AND_II_DEEPER = {
  id: 'populations-i-and-ii',
  steps: [
    {
      sid: 'the-age-ratio',
      after: 'the-same-stars-three-ways',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much older',
      body: `You read 3.35 Gyr at [Fe/H] &minus;0.5 and 1.47 Gyr at 0. Divide.`,
      prompt: 'The age assuming −0.5 over the age assuming 0',
      unit: '',
      answer: 2.29,
      tolerance: 0.08,
      hints: ['3.35 / 1.47.'],
      worked:
        '3.350 / 1.466 = 2.29: a half-dex change in the assumed metallicity changes the age by a factor of 2.3. The fit’s own interval at one metallicity is a few percent, so the assumption outweighs it by far.',
      feedback: {
        close: 'Close. Divide the larger age by the smaller.',
        'wrong-order-of-magnitude':
          'A power of ten out: the ages differ by a factor of about two.',
        off: '3.35 / 1.47.',
      },
      tool: CL({ feh: -0.5 }),
    },
    {
      sid: 'the-turnoff-of-an-old-population',
      after: 'who-is-left',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The turnoff of an old population',
      body: `Between 0.5 and 1 solar mass the main sequence falls from 95.6 Gyr to 9.88 Gyr, a power of
             3.28 of the mass. Take a population 12 Gyr old and ask where the lifetime reaches 12 Gyr from
             1 solar mass at 9.88 Gyr.`,
      prompt: 'The mass at the turnoff of a 12 Gyr population, in solar masses',
      unit: 'M☉',
      answer: 0.94,
      tolerance: 0.03,
      hints: ['M = (9.88 / 12)^(1 / 3.28).'],
      worked:
        '(9.878/12)^(1/3.275) = 0.94 M☉. These are solar-composition tracks; a metal-poor star of the same mass lives somewhat less, so for a halo population the true turnoff is a little lower. The answer is a bound.',
      feedback: {
        close: 'Close. Raise 9.88 / 12 to the power 1/3.28.',
        'wrong-order-of-magnitude':
          'A power of ten out: the turnoff mass is a little under one solar mass.',
        off: '(9.88 / 12) ^ (1 / 3.28).',
      },
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
    {
      sid: 'the-distance-moves-too',
      after: 'why-older-when-poor',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The distance moves too',
      body: `The metallicity assumption also moves the distance modulus: 11.86 at &minus;0.5 and 12.43 at
             0 for cluster A.`,
      prompt:
        'By what percentage is the fitted distance larger at [Fe/H] 0 than at −0.5?',
      unit: '%',
      answer: 29.6,
      tolerance: 1,
      hints: ['10^((12.43 − 11.86) / 5) − 1.'],
      worked:
        '10^(0.563/5) = 1.296: 29.6 percent. A change in the assumed composition moves the age by a factor of 2.3 and the distance by nearly a third; they move together because a brighter model puts the cluster farther away. Neither is the answer without the metallicity.',
      feedback: {
        close:
          'Close. Ten to the power of the difference over five, minus one, times a hundred.',
        'wrong-order-of-magnitude':
          'A power of ten out: a half-magnitude is a few tens of percent of the distance.',
        off: '100 × (10 ^ (0.563 / 5) − 1).',
      },
      tool: CL({ feh: 0 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 5. Spectra tell temperature and gravity
// -----------------------------------------------------------------------------
export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY = {
  id: 'spectra-tell-temperature-and-gravity',
  thumbnail: 'images/investigations/spectra-tell-temperature-and-gravity.webp',
  title: 'Spectra Tell Temperature and Gravity',
  subtitle:
    'Four real SDSS spectra, what the depth of a line says about temperature, what a spectrum would say about gravity, and what the spectrograph can resolve',
  duration: '6-8 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 17, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['what-a-spectrum-is-made-of'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that the depth of one line is not a thermometer: the Balmer lines are deepest in the hot star and the sodium lines in the cool one',
    'Say why the pattern of lines, not one line, gives a star’s temperature',
    'Say that the width of lines also depends on gravity, and what that separates',
    'Say what the spectrograph could resolve and what the dataset’s sampling keeps',
  ],
  steps: [
    {
      sid: 'a-thermometer-and-a-scale',
      stage: SPECTRA_STAGE,
      type: 'read',
      title: 'A thermometer and a scale',
      body: `A star&rsquo;s spectrum is its light split by wavelength, and the dark lines are atoms in its
             atmosphere taking light out. Which lines are there and how deep they are depends on the
             <strong>temperature</strong>, because the temperature sets which atoms are excited or ionized.
             How wide the lines are depends on the <strong>gravity</strong> of the surface, because gravity
             sets the pressure and the density of the gas.
             \n\nThe panel draws four stars observed by the Sloan Digital Sky Survey, one each of spectral type
             A, G, K and M: observations, with nothing smoothed, fitted or computed. The spectra are in
             the public domain, and the credit is in the panel.`,
      tool: SPEC(),
    },
    {
      sid: 'the-deepest-balmer',
      stage: SPECTRA_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The deepest Balmer line',
      body: `Choose the <strong>H&beta;</strong> window in the panel and switch the names on. H&beta; is a
             hydrogen line from the second level, and the panel reports how deep each star&rsquo;s is.`,
      prompt: 'Which of the four has the deepest H-beta line?',
      options: [
        'The A star, the hottest of the four',
        'The M star, the coolest of the four',
        'The G star, because it is like the Sun',
        'None: they are all the same depth',
      ],
      answer: 0,
      hints: [
        'Hydrogen in the second level is what absorbs H-beta: which temperature populates it best?',
      ],
      because:
        'The A star, at about 7,850 K by the dataset’s catalog temperature. A Balmer line needs hydrogen already excited to its second level, and that is most common at about 10,000 K; in the cooler stars almost no hydrogen is in that level, and in much hotter ones it is ionized.',
      misconceptions: [
        {
          id: 'cool',
          option: 1,
          say: 'In an M star, at about 4,000 K, hardly any hydrogen is in the second level, so the line is nearly absent.',
        },
        {
          id: 'sun',
          option: 2,
          say: 'The G star’s H-beta is real but shallower: at 5,600 K less hydrogen is excited.',
        },
      ],
      tool: SPEC({ window: 2, named: 1 }),
    },
    {
      sid: 'read-the-depths',
      stage: SPECTRA_STAGE,
      type: 'measure',
      title: 'Read the depths',
      body: `With the <strong>H&beta;</strong> window and the names on, the panel lists how deep each
             star&rsquo;s line is, as a percentage of the continuum next to it. Read the A star&rsquo;s and
             the M star&rsquo;s.`,
      fields: [
        { id: 'a', label: 'H-beta depth, A star', unit: '%', hint: '36.6' },
        { id: 'm', label: 'H-beta depth, M star', unit: '%', hint: '4.8' },
      ],
      validate: v => {
        if (![v.a, v.m].every(Number.isFinite)) return null;
        if (near(v.a, 36.6, 1.5) && near(v.m, 4.8, 1)) {
          return {
            level: 'ok',
            message:
              'About 37 percent for the A star and 5 for the M star: the line is nearly eight times deeper in the hot star. The next window shows the opposite order for sodium.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the H-beta window, names on, and read the A and the M rows: about 36.6 and 4.8 percent.',
        };
      },
      tool: SPEC({ window: 2, named: 1 }),
    },
    {
      sid: 'the-opposite-orderings',
      stage: SPECTRA_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The opposite ordering',
      body: `Now choose the <strong>Na D</strong> window, the sodium doublet near 589 nanometers. It
             deepens from the A star to the M star, the opposite of H-beta.`,
      prompt:
        'What does it mean that one line gets shallower and another deeper along the same sequence?',
      options: [
        'Each line has its own dependence on temperature, so one line is not a thermometer; the pattern of several lines, read against each other, gives the temperature',
        'One of the two measurements must be wrong',
        'The spectra were taken on different nights',
        'The cool stars are closer, so the sodium looks deeper',
      ],
      answer: 0,
      hints: [
        'Hydrogen needs to be excited; sodium atoms are easily ionized by heat.',
      ],
      because:
        'Sodium is ionized in the hot stars and survives in the cool ones, so its line deepens as the temperature falls, while hydrogen’s Balmer line peaks in the middle. A depth is a function of temperature that differs by line, so the spectral classification reads a pattern, and a single line cannot be turned into a temperature without saying which line.',
      misconceptions: [
        {
          id: 'wrong',
          option: 1,
          say: 'Both are right: they are two different lines with two different curves of depth against temperature.',
        },
        {
          id: 'distance',
          option: 3,
          say: 'Distance changes how bright a star looks, not how deep its lines are compared with its own continuum.',
        },
      ],
      tool: SPEC({ window: 3, named: 1 }),
    },
    {
      sid: 'what-gravity-does',
      stage: SPECTRA_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Same temperature, different gravity',
      body: `Take two stars at the same temperature: a dwarf on the main sequence, and a giant, whose
             radius is tens of times larger and whose surface gravity is thousands of times smaller. The
             gas in the dwarf&rsquo;s atmosphere is much denser.`,
      prompt: 'Which shows the broader lines, and why?',
      options: [
        'The dwarf: dense gas means more collisions between atoms, which broaden the lines, so the giant’s lines are narrower',
        'The giant: it is bigger, so its lines are bigger',
        'They are the same: the temperature sets everything',
        'The giant, because lower gravity means more motion',
      ],
      answer: 0,
      hints: ['Collisions broaden a line. Where is the gas denser?'],
      because:
        'The dwarf. At the same temperature the dwarf’s atmosphere is denser and its atoms collide more, which broadens the lines; a giant’s thin atmosphere gives narrow ones. That is how a spectrum tells a giant from a dwarf of the same color.',
      misconceptions: [
        {
          id: 'bigger',
          option: 1,
          say: 'Size does not widen a line; the density of the gas does.',
        },
        {
          id: 'same',
          option: 2,
          say: 'Temperature fixes which lines appear, but the density of the gas changes how wide they are.',
        },
      ],
      tool: EVOL({ track: 'm100', phase: 'main-sequence' }),
    },
    {
      sid: 'the-pack-has-no-giant',
      stage: SPECTRA_STAGE,
      type: 'read',
      title: 'What the four cannot show',
      body: `The four SDSS stars were not chosen to differ in gravity: their catalog types are A1V, G5,
             K3V and M2Vvar, and the dataset has no giant to set against a dwarf. So this investigation shows the
             temperature half on real data, and takes the gravity half from the evolution playback, where
             the surface gravity of a model star can be worked out from its mass and radius. The deeper
             steps put numbers on three limits: where the A star&rsquo;s peak lies, how many samples the dataset
             keeps across the sodium doublet, and how far gravity changes along a star&rsquo;s life.`,
      tool: SPEC({ named: 1 }),
    },
  ],
};

export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER = {
  id: 'spectra-tell-temperature-and-gravity',
  steps: [
    {
      sid: 'the-peak-of-the-a-star',
      after: 'a-thermometer-and-a-scale',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Where the A star peaks',
      body: `Wien&rsquo;s law gives the wavelength where a blackbody peaks: 2.898 &times; 10<sup>6</sup>
             nanometer-kelvins divided by the temperature. Use 7,852 K, the dataset&rsquo;s catalog
             temperature for the A star. The dataset&rsquo;s first sample is at 381.5 nanometers.`,
      prompt: 'The peak wavelength of the A star, in nanometers',
      unit: 'nm',
      answer: 369,
      tolerance: 3,
      hints: ['2.898e6 / 7852.'],
      worked:
        '2.898e6 / 7852 = 369 nm, in the ultraviolet and bluer than the dataset’s first sample at 381.5 nm. The spectrograph does not see this star’s peak, so its temperature has to come from the shape of the rising continuum and from the lines, not from the position of a maximum.',
      feedback: {
        close: 'Close. Divide 2.898e6 by 7852.',
        'wrong-order-of-magnitude':
          'A power of ten out: the peak is a few hundred nanometers.',
        off: '2.898e6 / 7852.',
      },
      tool: SPEC(),
    },
    {
      sid: 'samples-across-the-doublet',
      after: 'the-opposite-orderings',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Samples across the doublet',
      body: `The sodium D lines are at 5891.58 and 5897.56 angstroms in vacuum, 5.975 angstroms apart.
             The dataset&rsquo;s samples are spaced 0.0003 in log<sub>10</sub> of the wavelength, so at
             5894.6 angstroms each is 5894.6 &times; ln(10) &times; 0.0003 apart.`,
      prompt: 'How many of the dataset’s samples fit between the two lines?',
      unit: '',
      answer: 1.47,
      tolerance: 0.05,
      hints: ['The spacing is 4.07 angstroms.'],
      worked:
        '5.975 / 4.072 = 1.47 samples. The dataset averaged three of the archive’s samples into one, so the doublet is spread over one and a half of its samples: the two lines are close to blended in the dataset even where the spectrograph separated them.',
      feedback: {
        close:
          'Close. The spacing is wavelength × ln(10) × 0.0003; divide the 5.975 Å by it.',
        'wrong-order-of-magnitude':
          'A power of ten out: the doublet spans about one and a half samples.',
        off: '5.975 / (5894.6 × ln(10) × 0.0003).',
      },
      tool: SPEC({ window: 3, named: 1 }),
    },
    {
      sid: 'gravity-in-numbers',
      after: 'what-gravity-does',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A star’s gravity over its life',
      body: `Surface gravity is <em>G M</em> over <em>R</em> squared. In the playback the one-solar-mass
             model has a radius of 0.884 solar radii at the start of its main sequence and 173 solar radii,
             at a mass of 0.954, at the tip of its giant branch (the start of the helium-ignition phase).
             Take the base-10 logarithm of the ratio of the two gravities.`,
      prompt: 'How many powers of ten does the surface gravity fall?',
      unit: 'dex',
      answer: 4.6,
      tolerance: 0.1,
      hints: ['g ∝ M / R², so the ratio is (1 / 0.884²) / (0.954 / 173²).'],
      worked:
        'g at the start is 1.28 (in solar-radius units), at the tip 3.2e−5: a ratio of 40,000, 4.6 dex. The same star has atmospheres 40,000 times apart in surface gravity over its life, so its lines are very different and a spectrum can tell the two stages apart.',
      feedback: {
        close: 'Close. Take the logarithm of (M1 / R1²) over (M2 / R2²).',
        'wrong-order-of-magnitude':
          'A power of ten out: the radius grows by a factor of nearly 200, and gravity goes as its square.',
        off: 'log10((1 / 0.884²) / (0.954 / 173²)).',
      },
      tool: EVOL({ track: 'm100', phase: 'helium-ignition' }),
    },
    {
      sid: 'resolved-or-not',
      after: 'samples-across-the-doublet',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Resolved or not',
      body: `The SDSS spectrographs have a resolving power of about 1,800 (the description of the NGC 2420
             SEGUE dataset). The resolution element at 5894.6 angstroms is the wavelength divided by 1,800. Divide
             the 5.975 angstrom separation of the doublet by it.`,
      prompt: 'How many resolution elements apart are the two sodium lines?',
      unit: '',
      answer: 1.82,
      tolerance: 0.05,
      hints: ['The resolution element is 5894.6 / 1800 = 3.27 angstroms.'],
      worked:
        '5.975 / 3.275 = 1.82: the spectrograph separates the lines, barely, but the dataset keeps only 1.47 samples between them, so the sampling throws away what the instrument delivered. Resolving power and sampling are two limits and the lower one wins.',
      feedback: {
        close: 'Close. Divide the separation by wavelength / 1800.',
        'wrong-order-of-magnitude':
          'A power of ten out: the lines are about two resolution elements apart.',
        off: '5.975 / (5894.6 / 1800).',
      },
      tool: SPEC({ window: 3, named: 1 }),
    },
  ],
};

// =============================================================================
// Spanish (the shadows of the lessons above; not read by a fluent speaker)
// =============================================================================

export const READING_THE_HR_DIAGRAM_ES = {
  title: 'Leer el diagrama HR',
  subtitle:
    'Qué son las regiones del diagrama, cómo una distancia pone una estrella en él y por qué la secuencia principal es una banda y no una línea',
  objectives: [
    'Nombrar las regiones del diagrama (la secuencia principal, las gigantes, las supergigantes y las enanas blancas) y decir qué pone a una estrella en cada una',
    'Decir por qué una estrella caliente y débil tiene que ser pequeña, por la superficie con la que brilla',
    'Decir que hace falta una distancia para poner una estrella en el diagrama, y leer el módulo de distancia de un cúmulo en su ajuste',
    'Decir que la secuencia principal es una banda cuya anchura tiene causas (binarias, la metalicidad que se supone, la edad) y no solo un error de medida',
  ],
  steps: [
    {
      title: 'Dos números y una imagen',
      body: `El <strong>diagrama de Hertzsprung&ndash;Russell</strong> sitúa cada estrella por dos números: lo caliente que está su superficie, abajo con el extremo caliente a la izquierda, y cuánta luz emite, en vertical. Los dos ejes son logarítmicos. La mayoría de las estrellas cae en una banda diagonal, la <strong>secuencia principal</strong>, donde fusionan hidrógeno en el núcleo. Las que han agotado ese hidrógeno la dejan y se vuelven <strong>gigantes</strong> y <strong>supergigantes</strong>, frías y muy brillantes; los núcleos que dejan atrás son <strong>enanas blancas</strong>, calientes y débiles.
             \n\nEl panel dibuja ocho estrellas modelo de las trayectorias MIST incluidas (modelos con la composición del Sol, no estrellas con nombre) con las regiones marcadas. La posición de una estrella en el diagrama no es un lugar del espacio: son dos propiedades, y una estrella se mueve por el diagrama al envejecer.`,
    },
    {
      title: 'Caliente y débil',
      body: `La estrella <strong>D</strong> del estante tiene una superficie a 25 000 K y emite una centésima de la luz del Sol. Las estrellas A, B y C son una estrella parecida al Sol, una gigante roja y una supergigante. Una superficie caliente emite mucha luz por cada metro cuadrado.`,
      prompt:
        '¿Qué tipo de estrella es D, y qué dice su posición sobre su tamaño?',
      options: [
        'Una enana blanca: una superficie caliente que emite tan poca luz en total debe tener muy poca superficie, así que la estrella es diminuta',
        'Una gigante roja: es débil porque es fría',
        'Una estrella de la secuencia principal: las calientes son siempre las más brillantes',
        'Una supergigante: es caliente, así que es grande',
      ],
      hints: [
        'La luz que emite una estrella es su superficie por lo que emite cada metro cuadrado, y una superficie caliente emite mucho.',
      ],
      because:
        'D es una enana blanca. Cada metro cuadrado de una superficie de 25 000 K brilla unas 350 veces más fuerte que el del Sol, y sin embargo la estrella emite solo una centésima de la luz del Sol, así que su superficie es unas 350 veces menor que una centésima de la del Sol: tiene más o menos el tamaño de un planeta. Débil no es lo mismo que fría.',
      misconceptions: [
        {
          say: 'Una gigante roja es fría y brillante, arriba a la derecha. D es caliente, abajo a la izquierda.',
        },
        {
          say: 'Las superficies calientes son brillantes por metro cuadrado, pero la luz total de la estrella depende también de su tamaño, y D es muy pequeña.',
        },
      ],
    },
    {
      title: 'Una distancia pone las estrellas ahí',
      body: `Un diagrama de brillo <em>aparente</em> todavía no es un diagrama HR: una estrella al doble de distancia parece cuatro veces más débil. El panel muestra las estrellas del cúmulo <strong>A</strong> (sintético, para poder comprobar la respuesta) con sus magnitudes aparentes y ajusta una curva modelo a ellas. El desplazamiento que alinea la curva con las estrellas es el <strong>módulo de distancia</strong>, la magnitud aparente menos la absoluta. Léelo, con la metalicidad con la que se abre el panel.`,
      fields: [{ label: 'Módulo de distancia del cúmulo A' }],
    },
    {
      title: 'Una banda, no una línea',
      body: `Mira la secuencia principal del cúmulo. Las estrellas están todas a una distancia, así que la distancia no puede dispersarlas, y sin embargo no caen en una sola curva. <strong>Activa</strong> las binarias en el panel y observa la secuencia.`,
      prompt:
        '¿Cuál de estas cosas ensancha la secuencia principal de un cúmulo real?',
      options: [
        'Las estrellas binarias sin resolver, que parecen más brillantes que cualquiera de las dos solas, y las estrellas de distinto contenido de metales; el error de medida se suma a ambos',
        'Solo el error de medida: una secuencia principal es una línea',
        'Solo la distancia de cada estrella, porque un cúmulo tiene profundidad',
        'Solo la edad, porque las estrellas de una edad tienen edades distintas en la secuencia',
      ],
      hints: [
        'Dos estrellas fundidas en un punto emiten más luz que cualquiera de las dos, así que el punto queda por encima de la secuencia.',
      ],
      because:
        'Varias cosas. Un par de binarias sin resolver es más brillante que una estrella y queda por encima de la secuencia, hasta unas 0,75 magnitudes; las estrellas de distinto [Fe/H] están en secuencias algo distintas; y los brillos medidos tienen errores. En un cúmulo la distancia es común a todas, así que no ensancha la banda. La anchura es información, no solo dispersión.',
      misconceptions: [
        {
          say: 'El error es parte, pero las binarias y la composición sacan estrellas enteras de la línea más que el error.',
        },
        {
          say: 'Las estrellas de un cúmulo están todas casi a una distancia (es mucho menor que su distancia), así que la distancia no las dispersa.',
        },
      ],
    },
    {
      title: 'Lo que da el diagrama',
      body: `El lugar de una estrella en el diagrama dice qué tipo de estrella es: en la secuencia principal fusiona hidrógeno, por encima la ha dejado, y abajo a la izquierda es una enana blanca. El lugar necesita una distancia, y la anchura de la secuencia necesita una explicación, que puede ser un par de estrellas, una composición o una dispersión de edades. El panel del cúmulo ajusta una edad y una distancia con suposiciones que declara, y en los pasos más profundos verás lo que cuestan dos de ellas.
             \n\nLas estrellas cercanas al Sol tienen un diagrama propio en el Observatorio (el paquete de estrellas cercanas de Gaia, con los límites de su selección declarados allí). No se dibuja en esta investigación.`,
    },
  ],
};

export const READING_THE_HR_DIAGRAM_DEEPER_ES = {
  steps: [
    {
      title: '¿Qué tamaño tiene D?',
      body: `El radio de una estrella se sigue de su luz y su temperatura: <em>R</em> entre el radio del Sol es la raíz cuadrada de <em>L</em> entre la luz del Sol, dividida entre el cuadrado de <em>T</em> entre la temperatura del Sol (5772 K). Usa L = 0,01 y T = 25 000 K.`,
      prompt: 'El radio de la estrella D, en radios solares',
      hints: ['√0,01 = 0,1, y (25000 / 5772)² es unos 18,8.'],
      worked:
        '0,1 / 18,76 = 0,00533 R☉, unos 3700 km: algo menor que la Tierra. Una enana blanca guarda la masa de una estrella en el volumen de un planeta.',
      feedback: {
        close:
          'Casi. Toma la raíz cuadrada de 0,01 y divide entre (25000/5772) al cuadrado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la estrella es mucho menor que el Sol, pero no mil veces menor.',
        off: '√0,01 / (25000 / 5772)².',
      },
    },
    {
      title: 'La distancia del cúmulo',
      body: `Un módulo de distancia <em>m &minus; M</em> y una distancia <em>d</em> en pársecs se relacionan por <em>m &minus; M</em> = 5 log<sub>10</sub>(<em>d</em>) &minus; 5. Usa el 12,10 que leíste.`,
      prompt: 'La distancia del cúmulo A, en pársecs',
      hints: ['d = 10^((12,10 + 5) / 5).'],
      worked:
        '10^(17,10/5) = 10^3,42 = 2630 pc, unos 2,6 kilopársecs. Un módulo de doce son unos pocos kilopársecs; diez pársecs serían un módulo de cero.',
      feedback: {
        close: 'Casi. Diez elevado a (12,10 + 5) dividido entre 5.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un módulo de 12 son unos pocos miles de pársecs, no unos cientos ni unos cientos de miles.',
        off: '10 ^ ((12,10 + 5) / 5).',
      },
    },
    {
      title: 'Lo que hacen las binarias a la distancia',
      body: `Ajusta el cúmulo A con las binarias <strong>desactivadas</strong> y luego <strong>activadas</strong> (el 30 por ciento de las estrellas se dibujan como pares sin resolver), con la misma metalicidad, y lee cada vez el módulo de distancia: 12,10 y 12,04. Un par es más brillante que una estrella, así que las estrellas que quedan altas hacen que el cúmulo parezca más cercano.`,
      prompt:
        '¿En qué porcentaje cae la distancia ajustada cuando los pares están en la muestra?',
      hints: ['La distancia cambia en el factor 10 elevado a (Δmódulo / 5).'],
      worked:
        '10^(−0,058/5) = 0,974: un 2,6 por ciento más cerca, y la edad sube de 2,02 a 2,06 Gyr. El ajuste no sabe que los pares son pares, así que la respuesta se mueve, y la anchura de la secuencia era la pista.',
      feedback: {
        close:
          'Casi. Diez elevado a la diferencia de módulos entre cinco, menos uno.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una centésima de magnitud son unas pocas décimas de por ciento de la distancia.',
        off: '100 × (1 − 10 ^ (−0,058 / 5)).',
      },
    },
  ],
};

export const A_STARS_LIFE_IN_NUMBERS_ES = {
  title: 'La vida de una estrella en números',
  subtitle:
    'Cuánto vive una estrella en la secuencia principal, leído de las trayectorias MIST, por qué mueren primero las más pesadas y cómo el punto de giro de un cúmulo es un reloj',
  objectives: [
    'Leer la vida en la secuencia principal de una estrella modelo en la reproducción de la evolución y comparar una estrella de 20 masas solares con el Sol',
    'Decir por qué una estrella más pesada vive mucho menos: tiene más combustible pero lo gasta mucho más deprisa',
    'Decir que la vida no cae como una sola potencia de la masa, y leer cómo cambia la pendiente',
    'Decir cómo las estrellas que dejan la secuencia principal en un cúmulo dan su edad',
  ],
  steps: [
    {
      title: 'Combustible y ritmo',
      body: `Una estrella de la secuencia principal fusiona hidrógeno en su núcleo. Cuánto dura eso es una reserva de combustible dividida por un ritmo de gasto: el combustible es el hidrógeno del núcleo, que es una parte de la masa de la estrella, y el ritmo es su luminosidad. La reproducción de la evolución junto al texto sigue ocho estrellas modelo de las trayectorias MIST (con la composición del Sol, sin rotación). La fila <strong>Esta fase</strong> de su lectura da cuánto dura la fase en la que está el cursor. La reproducción se abre en la fase de secuencia principal de una estrella de una masa solar.`,
    },
    {
      title: 'Veinte veces el combustible',
      body: `Una estrella de 20 masas solares tiene 20 veces el hidrógeno del Sol. Antes de leer la reproducción, comprométete.`,
      prompt: 'Su secuencia principal dura…',
      options: [
        'unas 20 veces más que la del Sol, porque tiene 20 veces el combustible',
        'más o menos lo mismo, porque las estrellas mayores queman al mismo ritmo',
        'mucho menos: una milésima de la del Sol, porque gasta el combustible mucho más deprisa de lo que tiene más',
        'unas 20 veces menos, porque las estrellas mayores son 20 veces más calientes',
      ],
      because:
        'Una milésima, más o menos. La estrella tiene 20 veces el combustible, pero brilla unas 57 000 veces más que la estrella parecida al Sol, así que gasta su combustible miles de veces más deprisa de lo que tiene más. El paso siguiente lee las dos vidas.',
    },
    {
      title: 'Una vida como la del Sol',
      body: `El cursor está a mitad de la <strong>secuencia principal</strong> de la estrella de una masa solar. Lee la fila <strong>Esta fase</strong> de la lectura: cuánto dura de verdad esta fase.`,
      fields: [{ label: 'Secuencia principal de 1 M☉' }],
    },
    {
      title: 'Una vida pesada',
      body: `El cursor está ahora a mitad de la <strong>secuencia principal</strong> de una estrella de 20 masas solares, con 20 veces el hidrógeno. Lee otra vez la fila <strong>Esta fase</strong>.`,
      fields: [{ label: 'Secuencia principal de 20 M☉' }],
    },
    {
      title: 'Por qué la pesada dura poco',
      body: `La estrella de 20 masas solares tiene 20 veces el combustible y una secuencia principal mil veces más corta. Lee la <strong>luminosidad</strong> de la estrella de 20 masas solares al principio de su secuencia principal: unas 43 000 veces la del Sol.`,
      prompt: '¿Qué explica la vida corta?',
      options: [
        'Su luminosidad crece mucho más deprisa que su masa, así que gasta su combustible mucho más deprisa de lo que tiene más',
        'Las estrellas pesadas tienen menos hidrógeno, que se agota antes',
        'Las estrellas pesadas son más jóvenes, así que han tenido menos tiempo',
        'Las estrellas pesadas queman helio, no hidrógeno, y el helio se gasta más deprisa',
      ],
      hints: [
        'La vida es combustible entre ritmo: ¿qué le pasa al ritmo cuando la masa se multiplica por veinte?',
      ],
      because:
        'La vida es el combustible dividido entre la luminosidad. El combustible crece en proporción a la masa; la luminosidad crece mucho más deprisa (como la masa elevada a 3,5 en la parte baja de la secuencia principal), así que el cociente cae. Una estrella pesada además quema una parte mayor de su hidrógeno en la secuencia principal, por eso el cociente de las dos vidas es unas 1140 y no las 3000 que darían solo las luminosidades. Una estrella pesada tiene más hidrógeno, no menos, y empieza con hidrógeno como las demás.',
      misconceptions: [
        {
          say: 'Una estrella pesada tiene más hidrógeno en total; lo que decide es el ritmo al que lo gasta.',
        },
        {
          say: 'Las dos estrellas empiezan en edad cero en la reproducción; lo que difiere es cuánto dura cada fase.',
        },
      ],
    },
    {
      title: 'Lo que dicen las vidas',
      body: `La vida de una estrella en la secuencia principal es su combustible entre su luminosidad, y la luminosidad sube tan deprisa con la masa que una estrella más pesada vive menos, tenga lo que tenga. Por eso las estrellas más pesadas de un cúmulo son las primeras en dejar la secuencia principal, y por eso las que quedan en ella en un cúmulo viejo son las ligeras. Las vidas de aquí son las de los modelos, de una rejilla, con una composición. Los pasos más profundos leen cómo cae la vida con la masa y la usan como reloj.`,
    },
  ],
};

export const A_STARS_LIFE_IN_NUMBERS_DEEPER_ES = {
  steps: [
    {
      title: 'El cociente',
      body: `Leíste 9,88 miles de millones de años para 1 masa solar y 8,65 millones para 20. Divide.`,
      prompt:
        '¿Cuántas veces más larga es la secuencia principal de la estrella parecida al Sol?',
      hints: ['9,88 Gyr son 9880 Myr.'],
      worked:
        '9878 / 8,652 = 1142: una estrella de 20 veces la masa vive unas 1140 veces menos. Si la vida cayera como una sola potencia de la masa, 20 elevado a esa potencia sería 1140, una potencia de 2,3; el paso siguiente muestra que ninguna potencia única ajusta.',
      feedback: {
        close:
          'Casi. Pon las dos en la misma unidad (9880 Myr) antes de dividir.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: Gyr y Myr difieren en mil.',
        off: '9880 / 8,65.',
      },
    },
    {
      title: 'La pendiente no es constante',
      body: `Entre 1 y 2 masas solares la secuencia principal cae de 9,88 Gyr a 1,05 Gyr. Si la vida va como la masa elevada a &minus;<em>k</em>, <em>k</em> es el logaritmo del cociente de las vidas entre el logaritmo de 2.`,
      prompt: 'La potencia k entre 1 y 2 masas solares',
      hints: ['log₂(9,878 / 1,054).'],
      worked:
        'log₂(9,878/1,054) = 3,23. Entre 10 y 20 masas solares el mismo cálculo da 1,44, porque entre las estrellas más pesadas la luminosidad crece más despacio con la masa y los núcleos convectivos mayores llevan más hidrógeno a la combustión. La vida no es una potencia de la masa, así que una regla práctica tiene que decir dónde vale.',
      feedback: {
        close:
          'Casi. Toma el logaritmo de 9,878/1,054 y divídelo entre el logaritmo de 2.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: k es unos pocos, no unas décimas ni decenas.',
        off: 'ln(9,878 / 1,054) / ln 2.',
      },
    },
    {
      title: 'El punto de giro como reloj',
      body: `Las estrellas que dejan la secuencia principal en un cúmulo son aquellas cuya vida iguala su edad. El cúmulo A (el cúmulo sintético del panel de ajuste de cúmulos) tiene una edad ajustada de 2,02 Gyr. Entre 1 y 2 masas solares la vida va como la masa elevada a &minus;3,23 desde 9,88 Gyr a 1 masa solar.`,
      prompt:
        'La masa de las estrellas en el punto de giro del cúmulo A, en masas solares',
      hints: ['M = (9,88 / 2,02)^(1 / 3,23).'],
      worked:
        '(9,878/2,022)^(1/3,23) = 1,63 M☉. El cúmulo B, con 3,16 Gyr, da 1,42. Es una interpolación entre dos trayectorias y la estrella del punto de giro no está exactamente donde las trayectorias terminan la secuencia principal, así que un ajuste con una rejilla más fina de isócronas diferirá algo; lo importante es que la edad de un cúmulo es la vida de las estrellas de su punto de giro.',
      feedback: {
        close: 'Casi. Eleva 9,88 / 2,02 a la potencia 1/3,23.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la masa del punto de giro es un poco más de una masa solar.',
        off: '(9,88 / 2,02) ^ (1 / 3,23).',
      },
    },
  ],
};

export const WHEN_A_STAR_EXPLODES_ES = {
  title: 'Cuando una estrella explota',
  subtitle:
    'Qué estrellas acaban en un colapso, lo incierto que es el límite y cuánta energía libera el colapso comparada con la explosión que vemos',
  objectives: [
    'Decir qué estrellas acaban en un colapso del núcleo y cuáles acaban como enanas blancas sin explosión, y que la frontera es un intervalo',
    'Leer un panel de resultados que da probabilidades y decir qué significa una probabilidad ahí',
    'Decir que la energía que libera un colapso es su energía de ligadura gravitatoria, y compararla con la energía de la explosión',
    'Decir qué añadiría una curva de luz, y que esta investigación no muestra ninguna',
  ],
  steps: [
    {
      title: 'El final de una estrella pesada',
      body: `Una estrella fusiona hidrógeno, luego helio, luego elementos más pesados en capas, cada etapa más corta que la anterior. Si su núcleo crece más allá de lo que aguanta la presión de sus electrones, el núcleo cae hasta que algo lo detiene: una <strong>estrella de neutrones</strong> o, para las más pesadas, un <strong>agujero negro</strong>. La caída libera muchísima energía y expulsa las capas externas: una <strong>supernova</strong>. Las estrellas por debajo de cierta masa nunca llegan ahí; sus núcleos se vuelven enanas blancas y sus capas externas se dispersan.
             \n\nEl panel es el panel de remanentes de «De estrella a remanente»: para una masa inicial da la probabilidad de cada resultado, a partir de umbrales publicados que cita, con los límites dibujados como intervalos. Está puesto en una estrella de 15 masas solares.`,
    },
    {
      title: 'Qué estrellas explotan',
      body: `Pon la masa inicial en <strong>5</strong> masas solares y lee el resultado, y luego en <strong>15</strong>.`,
      prompt:
        '¿Qué acaba con una estrella de 5 masas solares, y qué con una de 15?',
      options: [
        'La estrella de 5 masas solares se vuelve enana blanca sin supernova; la de 15 masas solares colapsa en una estrella de neutrones',
        'Las dos explotan, porque toda estrella de más de una masa solar lo hace',
        'Ninguna explota: las supernovas necesitan una estrella compañera',
        'La estrella de 5 masas solares se vuelve agujero negro y la de 15 masas solares enana blanca',
      ],
      hints: [
        'Lee las probabilidades: con 5 masas solares, ¿qué resultado las tiene todas?',
      ],
      because:
        'Por debajo de unas 7 a 9,5 masas solares el núcleo nunca llega al colapso y la estrella acaba como enana blanca; por encima, hasta unas 20 a 40, el colapso deja una estrella de neutrones. Algunas supernovas sí necesitan una compañera (una enana blanca que recibe materia), pero una estrella de 15 masas solares colapsa por sí sola.',
      misconceptions: [
        {
          say: 'Una estrella de 5 masas solares no explota: el panel da su resultado como enana blanca con probabilidad 1.',
        },
        {
          say: 'Un tipo de supernova necesita una compañera, pero el colapso del núcleo de una estrella masiva no.',
        },
      ],
    },
    {
      title: 'Una estrella cerca del límite',
      body: `Pon la masa inicial en <strong>9</strong> masas solares. El panel da una enana blanca con probabilidad 0,2 y una estrella de neutrones con probabilidad 0,8, y llama al veredicto incierto.`,
      prompt: '¿Qué significa esa probabilidad?',
      options: [
        'La frontera entre los dos resultados solo se sabe que está entre 7 y 9,5 masas solares, y con 9 las fuentes no deciden: es una afirmación sobre lo que se sabe, no que una quinta parte de la estrella se vuelva enana blanca',
        'El ochenta por ciento de la masa de la estrella colapsa y el veinte por ciento no',
        'El modelo lanza una moneda para cada estrella de esta masa',
        'La estrella acaba como enana blanca el 20 por ciento de las veces por su rotación',
      ],
      hints: [
        'Mira los umbrales que cita el panel: son intervalos, no números.',
      ],
      because:
        'Los umbrales vienen de trabajos publicados que dan un intervalo (la masa mínima para una supernova es 8 ± 1 masas solares en una revisión, y alrededor de 9 en otra), así que una estrella en 9 está dentro del intervalo y el panel da una probabilidad sobre el desacuerdo de las fuentes. No es una parte de la estrella, y no es una tasa medida.',
      misconceptions: [
        {
          say: 'La probabilidad es sobre el resultado de toda la estrella, no una parte de su masa.',
        },
        {
          say: 'Nada es aleatorio: la misma estrella de la misma masa recibe siempre los mismos dos números, porque describen lo bien que se conoce el límite.',
        },
      ],
    },
    {
      title: 'Adónde va la energía',
      body: `El colapso de un núcleo a una estrella de neutrones libera su energía de ligadura gravitatoria, unos 2,6 &times; 10<sup>46</sup> julios para una estrella de 1,4 masas solares y un radio de 12 kilómetros (el paso profundo lo calcula). Las capas en expansión de una supernova típica llevan unos 10<sup>44</sup> julios de movimiento. Antes de dividir, comprométete.`,
      prompt: 'El movimiento de la explosión es…',
      options: [
        'la mayor parte de la energía que libera el colapso',
        'más o menos una décima de ella',
        'mucho menos del uno por ciento: casi todo el resto sale de otra forma, sobre todo neutrinos',
        'nada de ella: el colapso no libera energía',
      ],
      because:
        'Mucho menos del uno por ciento. La energía de ligadura de una estrella de neutrones es más o menos una décima de su energía en reposo, y casi toda sale como neutrinos en segundos; el movimiento de la explosión y la luz son fracciones pequeñas. El paso siguiente divide.',
    },
    {
      title: 'La parte de la explosión',
      body: `Toma la energía de ligadura como 2,6 &times; 10<sup>46</sup> J y el movimiento de la explosión como 1 &times; 10<sup>44</sup> J, un valor típico (Janka 2012). Calcula la parte, como porcentaje.`,
      fields: [
        { label: 'Movimiento de la explosión sobre la energía de ligadura' },
      ],
    },
    {
      title: 'Lo que añadiría una curva de luz',
      body: `El progenitor sale de los umbrales de masa de arriba, y la energía es una cota: lo máximo que puede liberar un colapso es su energía de ligadura, y la explosión y la luz son una pequeña fracción de ella. Lo que añade la <strong>curva de luz</strong> de una supernova es cómo sale esa fracción a lo largo de semanas: la subida, el máximo y el largo descenso. Esta investigación no muestra ninguna. Ninguna curva de luz pública tiene una decisión de derechos registrada para redistribuirla aquí, y dibujar una sintética sería enseñar una curva que el programa nunca ajustó. La energía de ligadura es una estimación de densidad uniforme; una estrella de neutrones no es uniforme, y la estimación vale hasta unas pocas decenas de por ciento.`,
    },
  ],
};

export const WHEN_A_STAR_EXPLODES_DEEPER_ES = {
  steps: [
    {
      title: 'La cota a mano',
      body: `Una bola uniforme de masa <em>M</em> y radio <em>R</em> tiene energía de ligadura gravitatoria (3/5) <em>G M</em><sup>2</sup> / <em>R</em>. Usa <em>M</em> = 1,4 masas solares (2,79 &times; 10<sup>30</sup> kg) y <em>R</em> = 12 km, con <em>G</em> = 6,674 &times; 10<sup>&minus;11</sup> en unidades del SI.`,
      prompt: 'La energía de ligadura, en unidades de 10^46 julios',
      hints: ['0,6 × 6,674e−11 × (2,785e30)² / 1,2e4.'],
      worked:
        '0,6 × 6,674e−11 × (2,785e30)² / 12 000 = 2,59e46 J. Una estrella de neutrones real es más densa en el centro que una bola uniforme y los efectos relativistas importan, así que la cifra verdadera está a unas pocas decenas de por ciento de esta; el orden de magnitud, de 10^46 a 10^47 julios, es firme.',
      feedback: {
        close:
          'Casi. Eleva primero la masa al cuadrado, luego divide entre el radio en metros.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el radio son 12 000 metros, no 12.',
        off: '0,6 × G × M² / R en unidades del SI.',
      },
    },
    {
      title: 'Frente a toda la vida de una estrella',
      body: `El Sol fusiona el hidrógeno de su núcleo, más o menos una décima de su masa, y el 0,7 por ciento de la masa del hidrógeno que se fusiona se vuelve energía. La energía liberada es 0,007 &times; 0,1 &times; <em>M c</em><sup>2</sup> para <em>M</em> = 1,989 &times; 10<sup>30</sup> kg.`,
      prompt:
        '¿Cuántas veces la energía que emite el Sol en la secuencia principal es la energía de ligadura del colapso?',
      hints: [
        'La energía del Sol en la secuencia principal es unos 1,25 × 10^44 J.',
      ],
      worked:
        '0,0007 × 1,989e30 × (2,998e8)² = 1,25e44 J, más o menos la energía de la explosión; la energía de ligadura 2,59e46 entre eso es 207. Un núcleo que colapsa durante un segundo libera unas doscientas veces lo que una estrella irradia en toda su vida quemando hidrógeno.',
      feedback: {
        close: 'Casi. Divide 2,59e46 entre 1,25e44.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el cociente es un par de cientos.',
        off: '2,59e46 / (0,0007 × M × c²).',
      },
    },
  ],
};

export const POPULATIONS_I_AND_II_ES = {
  title: 'Poblaciones I y II',
  subtitle:
    'Estrellas ricas y pobres en metales, lo que hace a la edad y la distancia de un cúmulo la metalicidad que se supone, y por qué las estrellas viejas que quedan son ligeras',
  objectives: [
    'Decir qué significa [Fe/H] y qué dice un valor de −0,5 sobre el hierro de una estrella',
    'Decir que la edad que da el ajuste de un cúmulo depende de la metalicidad que se supone, y leer el tamaño de la dependencia',
    'Decir por qué las mismas estrellas parecen más viejas cuando se supone que son pobres en metales',
    'Decir qué estrellas siguen en la secuencia principal en una población muy vieja, y qué deja fuera esta investigación',
  ],
  steps: [
    {
      title: 'Dos tipos de estrella',
      body: `Los astrónomos clasifican las estrellas en dos <strong>poblaciones</strong>. La población I, como el Sol, es rica en elementos más pesados que el helio, que llaman <em>metales</em>; la población II es pobre en ellos y vieja. La medida es <strong>[Fe/H]</strong>: el logaritmo de la razón del hierro al hidrógeno en la estrella, menos lo mismo para el Sol. El Sol es 0, una estrella con una décima del hierro del Sol es &minus;1.
             \n\nEl panel de cúmulos ajusta una edad y una distancia a un cúmulo sintético de estrellas, pero no puede ajustar la metalicidad: se la dices tú. Ofrece tres, &minus;0,5, &minus;0,25 y 0. Las estrellas son las mismas cada vez.`,
    },
    {
      title: 'Lo que significa menos un medio',
      body: `[Fe/H] es un logaritmo: &minus;1 es un factor de diez por debajo de la razón del Sol del hierro al hidrógeno.`,
      prompt: 'Una estrella con [Fe/H] = −0,5 tiene…',
      options: [
        'más o menos un tercio del hierro del Sol respecto a su hidrógeno',
        'la mitad del hierro del Sol respecto a su hidrógeno',
        'más o menos una décima del hierro del Sol respecto a su hidrógeno',
        'la mitad de la masa del Sol',
      ],
      hints: ['10 elevado a −0,5 es 1 entre la raíz cuadrada de 10.'],
      because:
        '10^(−0,5) = 0,316: más o menos un tercio de la razón hierro-hidrógeno del Sol. Menos un medio no es la mitad; es un factor de 3,2 por debajo. La escala es logarítmica porque las estrellas abarcan varios factores de diez.',
      misconceptions: [
        {
          say: 'La escala es logarítmica: −0,5 dex es un factor de 10^0,5, unos 3,2, no 2.',
        },
        {
          say: '[Fe/H] es una composición y no dice nada de la masa de la estrella.',
        },
      ],
    },
    {
      title: 'Las mismas estrellas, dos suposiciones',
      body: `Ajusta el cúmulo <strong>A</strong> con la metalicidad en <strong>&minus;0,5</strong> y lee la edad, luego ponla en <strong>0</strong> y léela otra vez. Las estrellas no cambian; solo cambia la suposición.`,
      fields: [
        { label: 'Edad suponiendo [Fe/H] = −0,5' },
        { label: 'Edad suponiendo [Fe/H] = 0' },
      ],
    },
    {
      title: 'Por qué pobre en metales significa más viejo',
      body: `Compara las curvas modelo que dibuja el panel con las dos metalicidades: una estrella pobre en metales de una masa dada es más caliente y más brillante que una rica en metales de la misma masa.`,
      prompt:
        '¿Por qué suponer que el cúmulo es pobre en metales le da una edad mayor?',
      options: [
        'Un modelo pobre en metales de cualquier masa es más caliente y más brillante, así que las estrellas del punto de giro deben ser de menor masa para estar donde están, y las de menor masa tardan más en dejar la secuencia principal',
        'Las estrellas pobres en metales son siempre más viejas, así que el panel añade edad',
        'El panel no puede ajustar un cúmulo pobre en metales, así que su respuesta es una conjetura',
        'Los metales frenan el reloj de una estrella',
      ],
      hints: [
        'Piensa en el punto de giro: ¿qué estrellas dejan la secuencia principal en un cúmulo más viejo, las pesadas o las ligeras?',
      ],
      because:
        'El ajuste pone el punto de giro de los modelos donde está el de las estrellas. Una estrella pobre en metales es más caliente y más brillante con una masa dada, así que para igualar el mismo punto de giro las estrellas deben ser de menor masa, y una estrella de menor masa vive más: el cúmulo debe ser más viejo. La composición de las estrellas no cambia con la suposición; lo que cambia es con qué modelo se las compara.',
      misconceptions: [
        {
          say: 'El panel no añade nada: compara las estrellas con la curva modelo de la metalicidad que indicas, y la curva cambia.',
        },
        {
          say: 'El ajuste funciona con cada metalicidad; la respuesta que da es condicional a la que elegiste.',
        },
      ],
    },
    {
      title: 'Quién queda',
      body: `La reproducción da a una estrella modelo de una masa solar una secuencia principal de 9,9 miles de millones de años, y a una de dos masas solares 1,05 miles de millones. Una población vieja, como el halo, tiene unos 12 miles de millones de años.`,
      prompt:
        '¿Qué estrellas de esa población siguen en la secuencia principal?',
      options: [
        'Solo las algo más ligeras que el Sol; todas las más pesadas la han dejado',
        'Todas las más pesadas que el Sol, que son mayores y viven más',
        'Todas, porque la secuencia principal dura para siempre',
        'Solo las más pesadas, que queman más deprisa',
      ],
      hints: [
        'Una estrella más pesada gasta su hidrógeno antes. ¿Dónde cae 12 miles de millones de años?',
      ],
      because:
        'Un modelo de una masa solar deja la secuencia principal tras 9,9 miles de millones de años, así que a los 12 miles de millones toda estrella de esa masa o más la ha dejado, y lo que queda en la secuencia principal son las más ligeras. Cuanto más ligera la estrella, más larga la espera, y una enana roja de una quinta parte de masa solar tiene billones de años.',
      misconceptions: [
        {
          say: 'Las estrellas más pesadas viven menos, no más: la vida cae muy deprisa con la masa.',
        },
        {
          say: 'Todo modelo de estrella deja la secuencia principal en algún momento; las enanas rojas solo tardan más que la edad del universo.',
        },
      ],
    },
    {
      title: 'Lo que esto no muestra',
      body: `Dos cosas ordenan las poblaciones en el cielo que esta investigación no dibuja. La primera es el <strong>movimiento</strong>: las estrellas de población I se mueven en el disco de la galaxia en órbitas casi circulares, y las de población II en un halo en órbitas excéntricas, de modo que una muestra de estrellas con velocidades y metalicidades se separa en dos nubes. La muestra para eso no está en ningún panel de aquí, y una parte posterior del programa está pensada para aportarla. La segunda son las trayectorias evolutivas: son para la composición del Sol, y una estrella pobre en metales de la misma masa vive algo menos, así que las masas del punto de giro de los pasos profundos son cotas para poblaciones viejas, no respuestas.`,
    },
  ],
};

export const POPULATIONS_I_AND_II_DEEPER_ES = {
  steps: [
    {
      title: 'Cuánto más viejo',
      body: `Leíste 3,35 Gyr con [Fe/H] &minus;0,5 y 1,47 Gyr con 0. Divide.`,
      prompt: 'La edad suponiendo −0,5 entre la edad suponiendo 0',
      hints: ['3,35 / 1,47.'],
      worked:
        '3,350 / 1,466 = 2,29: un cambio de medio dex en la metalicidad supuesta cambia la edad en un factor de 2,3. El intervalo propio del ajuste con una metalicidad es de unos pocos por ciento, así que la suposición pesa mucho más.',
      feedback: {
        close: 'Casi. Divide la edad mayor entre la menor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las edades difieren en un factor de unos dos.',
        off: '3,35 / 1,47.',
      },
    },
    {
      title: 'El punto de giro de una población vieja',
      body: `Entre 0,5 y 1 masa solar la secuencia principal cae de 95,6 Gyr a 9,88 Gyr, una potencia de 3,28 de la masa. Toma una población de 12 Gyr y pregunta dónde la vida llega a 12 Gyr partiendo de 1 masa solar con 9,88 Gyr.`,
      prompt:
        'La masa en el punto de giro de una población de 12 Gyr, en masas solares',
      hints: ['M = (9,88 / 12)^(1 / 3,28).'],
      worked:
        '(9,878/12)^(1/3,275) = 0,94 M☉. Son trayectorias de composición solar; una estrella pobre en metales de la misma masa vive algo menos, así que para una población del halo el punto de giro verdadero es algo menor. La respuesta es una cota.',
      feedback: {
        close: 'Casi. Eleva 9,88 / 12 a la potencia 1/3,28.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la masa del punto de giro es un poco menos de una masa solar.',
        off: '(9,88 / 12) ^ (1 / 3,28).',
      },
    },
    {
      title: 'La distancia también se mueve',
      body: `La suposición de metalicidad mueve también el módulo de distancia: 11,86 con &minus;0,5 y 12,43 con 0 para el cúmulo A.`,
      prompt:
        '¿En qué porcentaje es mayor la distancia ajustada con [Fe/H] 0 que con −0,5?',
      hints: ['10^((12,43 − 11,86) / 5) − 1.'],
      worked:
        '10^(0,563/5) = 1,296: un 29,6 por ciento. Un cambio en la composición supuesta mueve la edad en un factor de 2,3 y la distancia casi en un tercio; se mueven juntas porque un modelo más brillante pone el cúmulo más lejos. Ninguna es la respuesta sin la metalicidad.',
      feedback: {
        close:
          'Casi. Diez elevado a la diferencia entre cinco, menos uno, por cien.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: media magnitud son unas pocas decenas de por ciento de la distancia.',
        off: '100 × (10 ^ (0,563 / 5) − 1).',
      },
    },
  ],
};

export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_ES = {
  title: 'Los espectros dicen temperatura y gravedad',
  subtitle:
    'Cuatro espectros reales de SDSS, qué dice la profundidad de una línea sobre la temperatura, qué diría un espectro sobre la gravedad y qué puede resolver el espectrógrafo',
  objectives: [
    'Decir que la profundidad de una línea no es un termómetro: las líneas de Balmer son más profundas en la estrella caliente y las de sodio en la fría',
    'Decir por qué el patrón de líneas, y no una línea, da la temperatura de una estrella',
    'Decir que la anchura de las líneas depende también de la gravedad, y qué separa eso',
    'Decir qué podía resolver el espectrógrafo y qué conserva el muestreo del paquete',
  ],
  steps: [
    {
      title: 'Un termómetro y una escala',
      body: `El espectro de una estrella es su luz separada por longitud de onda, y las líneas oscuras son átomos de su atmósfera que quitan luz. Qué líneas hay y lo profundas que son depende de la <strong>temperatura</strong>, porque la temperatura fija qué átomos están excitados o ionizados. Lo anchas que son las líneas depende de la <strong>gravedad</strong> de la superficie, porque la gravedad fija la presión y la densidad del gas.
             \n\nEl panel dibuja cuatro estrellas observadas por el Sloan Digital Sky Survey, una de cada tipo espectral A, G, K y M: observaciones, sin nada suavizado, ajustado ni calculado. Los espectros son de dominio público, y el crédito está en el panel.`,
    },
    {
      title: 'La línea de Balmer más profunda',
      body: `Elige la ventana de <strong>H&beta;</strong> en el panel y activa los nombres. H&beta; es una línea de hidrógeno desde el segundo nivel, y el panel indica lo profunda que es la de cada estrella.`,
      prompt: '¿Cuál de las cuatro tiene la línea H-beta más profunda?',
      options: [
        'La estrella A, la más caliente de las cuatro',
        'La estrella M, la más fría de las cuatro',
        'La estrella G, porque es como el Sol',
        'Ninguna: todas tienen la misma profundidad',
      ],
      hints: [
        'El hidrógeno en el segundo nivel es lo que absorbe H-beta: ¿qué temperatura lo puebla mejor?',
      ],
      because:
        'La estrella A, a unos 7850 K según la temperatura del catálogo del paquete. Una línea de Balmer necesita hidrógeno ya excitado a su segundo nivel, y eso es lo más común a unos 10 000 K; en las estrellas más frías casi no hay hidrógeno en ese nivel, y en las mucho más calientes está ionizado.',
      misconceptions: [
        {
          say: 'En una estrella M, a unos 4000 K, apenas hay hidrógeno en el segundo nivel, así que la línea casi no existe.',
        },
        {
          say: 'El H-beta de la estrella G es real pero menos profundo: a 5600 K hay menos hidrógeno excitado.',
        },
      ],
    },
    {
      title: 'Lee las profundidades',
      body: `Con la ventana de <strong>H&beta;</strong> y los nombres activados, el panel enumera lo profunda que es la línea de cada estrella, como porcentaje del continuo contiguo. Lee la de la estrella A y la de la estrella M.`,
      fields: [
        { label: 'Profundidad de H-beta, estrella A' },
        { label: 'Profundidad de H-beta, estrella M' },
      ],
    },
    {
      title: 'El orden opuesto',
      body: `Elige ahora la ventana de <strong>Na D</strong>, el doblete del sodio cerca de 589 nanómetros. Se hace más profundo de la estrella A a la M, lo contrario que H-beta.`,
      prompt:
        '¿Qué significa que una línea se haga menos profunda y otra más a lo largo de la misma secuencia?',
      options: [
        'Cada línea tiene su propia dependencia de la temperatura, así que una línea no es un termómetro; el patrón de varias líneas, leídas unas contra otras, da la temperatura',
        'Una de las dos medidas debe de estar mal',
        'Los espectros se tomaron en noches distintas',
        'Las estrellas frías están más cerca, así que el sodio parece más profundo',
      ],
      hints: [
        'El hidrógeno necesita estar excitado; los átomos de sodio se ionizan fácilmente con el calor.',
      ],
      because:
        'El sodio está ionizado en las estrellas calientes y sobrevive en las frías, así que su línea se hace más profunda al bajar la temperatura, mientras que la línea de Balmer del hidrógeno tiene su máximo en medio. Una profundidad es una función de la temperatura que difiere según la línea, así que la clasificación espectral lee un patrón, y una sola línea no puede convertirse en temperatura sin decir de qué línea se trata.',
      misconceptions: [
        {
          say: 'Las dos son correctas: son dos líneas distintas con dos curvas distintas de profundidad frente a temperatura.',
        },
        {
          say: 'La distancia cambia lo brillante que parece una estrella, no lo profundas que son sus líneas respecto a su propio continuo.',
        },
      ],
    },
    {
      title: 'La misma temperatura, distinta gravedad',
      body: `Toma dos estrellas a la misma temperatura: una enana de la secuencia principal y una gigante, cuyo radio es decenas de veces mayor y cuya gravedad superficial es miles de veces menor. El gas de la atmósfera de la enana es mucho más denso.`,
      prompt: '¿Cuál muestra las líneas más anchas, y por qué?',
      options: [
        'La enana: un gas denso significa más colisiones entre átomos, que ensanchan las líneas, así que las de la gigante son más estrechas',
        'La gigante: es más grande, así que sus líneas son más grandes',
        'Son iguales: la temperatura lo fija todo',
        'La gigante, porque menos gravedad significa más movimiento',
      ],
      hints: [
        'Las colisiones ensanchan una línea. ¿Dónde es más denso el gas?',
      ],
      because:
        'La enana. A la misma temperatura la atmósfera de la enana es más densa y sus átomos chocan más, lo que ensancha las líneas; la atmósfera tenue de una gigante da líneas estrechas. Así es como un espectro distingue una gigante de una enana del mismo color.',
      misconceptions: [
        {
          say: 'El tamaño no ensancha una línea; lo hace la densidad del gas.',
        },
        {
          say: 'La temperatura fija qué líneas aparecen, pero la densidad del gas cambia lo anchas que son.',
        },
      ],
    },
    {
      title: 'Lo que las cuatro no pueden mostrar',
      body: `Las cuatro estrellas de SDSS no se eligieron para diferir en gravedad: sus tipos de catálogo son A1V, G5, K3V y M2Vvar, y el paquete no tiene ninguna gigante para ponerla junto a una enana. Así que esta investigación muestra la mitad de la temperatura con datos reales, y toma la mitad de la gravedad de la reproducción de la evolución, donde la gravedad superficial de una estrella modelo puede calcularse a partir de su masa y su radio. Los pasos profundos ponen números a tres límites: dónde queda el máximo de la estrella A, cuántas muestras conserva el paquete en el doblete del sodio y cuánto cambia la gravedad a lo largo de la vida de una estrella.`,
    },
  ],
};

export const SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER_ES = {
  steps: [
    {
      title: 'Dónde tiene su máximo la estrella A',
      body: `La ley de Wien da la longitud de onda donde tiene su máximo un cuerpo negro: 2,898 &times; 10<sup>6</sup> nanómetros-kelvin divididos entre la temperatura. Usa 7852 K, la temperatura de catálogo del paquete para la estrella A. La primera muestra del paquete está en 381,5 nanómetros.`,
      prompt: 'La longitud de onda del máximo de la estrella A, en nanómetros',
      hints: ['2,898e6 / 7852.'],
      worked:
        '2,898e6 / 7852 = 369 nm, en el ultravioleta y más azul que la primera muestra del paquete en 381,5 nm. El espectrógrafo no ve el máximo de esta estrella, así que su temperatura tiene que salir de la forma del continuo ascendente y de las líneas, no de la posición de un máximo.',
      feedback: {
        close: 'Casi. Divide 2,898e6 entre 7852.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el máximo está en unos pocos cientos de nanómetros.',
        off: '2,898e6 / 7852.',
      },
    },
    {
      title: 'Muestras a través del doblete',
      body: `Las líneas D del sodio están en 5891,58 y 5897,56 ångström en el vacío, separadas 5,975 ångström. Las muestras del paquete están espaciadas 0,0003 en log<sub>10</sub> de la longitud de onda, así que en 5894,6 ångström cada una dista de la siguiente 5894,6 &times; ln(10) &times; 0,0003.`,
      prompt: '¿Cuántas muestras del paquete caben entre las dos líneas?',
      hints: ['El espaciado es 4,07 ångström.'],
      worked:
        '5,975 / 4,072 = 1,47 muestras. El paquete promedió tres muestras del archivo en una, así que el doblete se reparte en una y media de sus muestras: las dos líneas están cerca de fundirse en el paquete incluso donde el espectrógrafo las separó.',
      feedback: {
        close:
          'Casi. El espaciado es longitud de onda × ln(10) × 0,0003; divide los 5,975 Å entre él.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el doblete abarca una muestra y media.',
        off: '5,975 / (5894,6 × ln(10) × 0,0003).',
      },
    },
    {
      title: 'La gravedad de una estrella a lo largo de su vida',
      body: `La gravedad superficial es <em>G M</em> entre <em>R</em> al cuadrado. En la reproducción el modelo de una masa solar tiene un radio de 0,884 radios solares al principio de su secuencia principal y 173 radios solares, con una masa de 0,954, en el extremo de su rama de gigante (el inicio de la fase de ignición del helio). Toma el logaritmo en base 10 del cociente de las dos gravedades.`,
      prompt: '¿Cuántas potencias de diez cae la gravedad superficial?',
      hints: [
        'g ∝ M / R², así que el cociente es (1 / 0,884²) / (0,954 / 173²).',
      ],
      worked:
        'g al principio es 1,28 (en unidades de radio solar), en el extremo 3,2e−5: un cociente de 40 000, 4,6 dex. La misma estrella tiene atmósferas con gravedades superficiales 40 000 veces distintas a lo largo de su vida, así que sus líneas son muy distintas y un espectro puede distinguir las dos etapas.',
      feedback: {
        close: 'Casi. Toma el logaritmo de (M1 / R1²) entre (M2 / R2²).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el radio crece en un factor de casi 200, y la gravedad va como su cuadrado.',
        off: 'log10((1 / 0,884²) / (0,954 / 173²)).',
      },
    },
    {
      title: '¿Resueltas o no?',
      body: `Los espectrógrafos de SDSS tienen un poder de resolución de unos 1800 (la descripción del paquete SEGUE de NGC 2420). El elemento de resolución en 5894,6 ångström es la longitud de onda dividida entre 1800. Divide entre él la separación de 5,975 ångström del doblete.`,
      prompt:
        '¿A cuántos elementos de resolución están las dos líneas del sodio?',
      hints: ['El elemento de resolución es 5894,6 / 1800 = 3,27 ångström.'],
      worked:
        '5,975 / 3,275 = 1,82: el espectrógrafo separa las líneas, por poco, pero el paquete conserva solo 1,47 muestras entre ellas, así que el muestreo tira lo que el instrumento entregó. El poder de resolución y el muestreo son dos límites y manda el menor.',
      feedback: {
        close: 'Casi. Divide la separación entre longitud de onda / 1800.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las líneas están a unos dos elementos de resolución.',
        off: '5,975 / (5894,6 / 1800).',
      },
    },
  ],
};

// =============================================================================
// Instructor content
// =============================================================================

const GUIDE = (
  topic,
  overview,
  difficulty,
  placement,
  concepts,
  misconceptions,
  notes,
  discussion,
  extensions,
  priorKnowledge
) => ({
  topic,
  difficulty,
  placement,
  overview,
  priorKnowledge,
  keyConcepts: concepts,
  features: [
    {
      name: 'The panels (stellar lab, evolution playback, cluster fit, remnant outcome and spectra comparison)',
      text: 'The instruments of the stellar unit, set to a prepared state: every number a step states is the panel’s own or is recomputed from the bundled MIST tracks, the cluster fit, the remnant thresholds or the SDSS spectrum dataset’s own grid and catalog temperatures. No instrument was added for these investigations.',
    },
    {
      name: 'Depth',
      text: 'Each investigation has quantitative and advanced steps that add a derived number or a limit; the core path asks for readings and reasoning only.',
    },
    {
      name: 'What is synthetic and what is a model',
      text: 'The clusters are synthetic and carry their truth; the evolutionary tracks are MIST models at the Sun’s composition and not named stars; the four spectra are SDSS observations. Each investigation says what it leaves out.',
    },
  ],
  misconceptions,
  teachingNotes: notes,
  discussion,
  extensions,
  modelNotes:
    'The cluster panel is js/clusterFitWidgets.js over js/clusterFitField.js and js/kernels/clusters/ (CLUSTER_FITTING.md); the evolution playback is js/stellarEvolutionWidgets.js over js/stellar/tracks.js and js/data/stellar/mistTracks.js; the remnant panel is js/remnantsWidgets.js over js/remnantsField.js and js/kernels/remnants/ (REMNANTS.md); the spectra panel is js/stellarSpectraWidgets.js over js/data/spectra/sdssSpectra.js; the diagram is js/stellarWidgets.js.',
});

const CONTENT = {
  'reading-the-hr-diagram': GUIDE(
    'The regions of the HR diagram and what puts a star in each, how a distance turns an apparent diagram into an absolute one, and why a cluster’s main sequence is a band',
    'Students place a hot, faint star as a white dwarf and compute its size (0.0053 solar radii), read the distance modulus of a synthetic cluster (12.10, 2630 parsecs), and see binaries and the assumed metallicity widen and move the fit (a distance 2.6 percent nearer with binaries in the sample).',
    'Majors stellar unit (the quantitative depth adds two derived numbers; the advanced depth adds the binary effect on the fit)',
    'In a stellar unit after A Universe of Stars; before Two Clusters, Two Ages or the connecting investigations of the unit.',
    [
      {
        heading: 'Position is two properties',
        body: 'A star’s place is its temperature and luminosity; a hot, faint star must be small, because the light is the surface area times what each square meter gives out.',
      },
      {
        heading: 'A distance makes the diagram absolute',
        body: 'The distance modulus is the apparent minus the absolute magnitude: 12.10 for cluster A, 2630 parsecs.',
      },
      {
        heading: 'The band has causes',
        body: 'Unresolved binaries (up to 0.75 magnitude above the sequence), composition and measurement error widen the main sequence; the cluster panel shows the effect of binaries on the fitted distance and age.',
      },
    ],
    [
      {
        claim: 'A faint star must be a cool star.',
        response:
          'Faintness follows from small area as well as from low temperature: a 25,000 K white dwarf is faint because it is tiny.',
      },
      {
        claim: 'A cluster’s main sequence is spread by distance.',
        response:
          'The stars of a cluster are all at nearly one distance; the spread is binaries, composition and error.',
      },
      {
        claim: 'The HR diagram is a map of where stars are.',
        response:
          'It is a graph of two properties; two stars side by side on it may be far apart in space.',
      },
      {
        claim: 'Hot stars are always bright.',
        response:
          'A hot, faint star is a white dwarf: temperature sets the color and the light from each square meter, and the small area keeps the total low.',
      },
    ],
    [
      'The stage shelf of four stars is a display and not an orbit; star D is given a temperature and luminosity, not a track.',
      'The distance of cluster A is the fit’s: a synthetic cluster of known truth (distance modulus 12.10).',
      'The Gaia nearby-star diagram of the Observatory is named in the last step and not drawn; its selection limits are stated in the Observatory.',
      'A star’s radius follows from its temperature and luminosity (L = 4πR²σT⁴); the investigation uses it once, for the white dwarf, and students who ask how the sizes were drawn can be shown the same line.',
    ],
    [
      'If you could measure only temperature and apparent brightness, what could you say about a star?',
      'Which of binaries, composition and age would you expect to widen the sequence of a globular cluster most?',
      'If every star in a cluster were twice as far, how would its apparent diagram move, and what would stay the same?',
    ],
    [
      'Fit cluster B with binaries on and off and compare the shift in its distance with cluster A’s.',
      'Compute the radius of a red giant of 4,000 K and 1,000 solar luminosities.',
    ],
    [
      'Logarithmic axes and magnitudes',
      'The Stefan–Boltzmann law (a star’s light is area times surface flux)',
      'The main sequence, giants and white dwarfs (A Universe of Stars)',
    ]
  ),
  'a-stars-life-in-numbers': GUIDE(
    'Main-sequence lifetime as fuel over luminosity, read from the MIST tracks (9.88 Gyr at 1 solar mass, 8.65 Myr at 20), the changing slope of the lifetime against mass, and a cluster’s turnoff as a clock',
    'Students read the main-sequence phase of a one-solar-mass and a 20 solar-mass model (9.88 billion and 8.65 million years), divide (1140), find the power of the mass between 1 and 2 solar masses (3.23, against 1.44 between 10 and 20), and turn a cluster age (2.02 Gyr) into a turnoff mass (1.63 solar masses).',
    'Majors stellar unit (the quantitative depth adds the ratio and the slope; the advanced depth the turnoff mass)',
    'In a stellar unit after Lives of Stars; before Populations I and II and the cluster-fitting investigation.',
    [
      {
        heading: 'Lifetime is fuel over rate',
        body: 'A heavier star has more fuel but a luminosity that grows far faster, so it lives less: 20 times the fuel and a main sequence 1140 times shorter.',
      },
      {
        heading: 'No single power fits',
        body: 'The power of the mass is 3.23 between 1 and 2 solar masses, 2.08 between 5 and 10 and 1.44 between 10 and 20 in these models; a rule of thumb has a domain.',
      },
      {
        heading: 'The turnoff is a clock',
        body: 'The stars leaving the main sequence in a cluster are the ones whose lifetime is the cluster’s age: 1.63 solar masses for 2.02 Gyr, by interpolation between two tracks.',
      },
    ],
    [
      {
        claim: 'More fuel means a longer life.',
        response:
          'The rate of use rises much faster than the fuel: 57,000 times the luminosity for 20 times the mass.',
      },
      {
        claim: 'Lifetime goes as one power of the mass.',
        response:
          'Not over the whole range: the slope falls from 3.2 to 1.4 between the Sun-like stars and the most massive here.',
      },
      {
        claim: 'The tracks are measurements of real stars.',
        response:
          'They are MIST models at the Sun’s composition and no rotation, not named stars.',
      },
      {
        claim: 'A star burns all its hydrogen.',
        response:
          'Only the hydrogen in the core is available to the main sequence, so the phase ends with most of the star unburned.',
      },
    ],
    [
      'The readings are the “This phase” row of the playback at the start of the main-sequence phase; each is the segment duration of the bundled track.',
      'The turnoff mass is an interpolation between two tracks with a power law; a fitted isochrone grid would put it a little differently.',
      'The tracks are at solar metallicity; the next investigation shows what the metallicity does to an age.',
      'A student may ask where the Sun is on its 9.88 billion year main sequence: about halfway, at 4.6 billion years.',
    ],
    [
      'Why do the heaviest stars of a cluster leave first?',
      'Which stars of a ten-billion-year-old cluster are still on the main sequence?',
      'What does a main sequence of a few million years mean for the chance of planets, and of life, around a heavy star?',
    ],
    [
      'Read the main sequence of the 2 and 5 solar-mass models and compute the power between them.',
      'Use the 0.5 solar-mass model to find the age at which a red dwarf’s main sequence ends (95.6 Gyr).',
    ],
    [
      'Lives of Stars (the playback and its phases)',
      'Powers and logarithms',
      'Luminosity as energy per second',
    ]
  ),
  'when-a-star-explodes': GUIDE(
    'Which stars end in a core collapse, how uncertain the boundary is, and the energy of a collapse (about 2.6 × 10^46 J) against the energy of a typical blast (about 10^44 J)',
    'Students read the outcome of 5, 9 and 15 solar masses on the remnant panel, say what a probability of 0.8 means at the edge of a range, work out the share of the blast (0.39 percent of the binding energy), and in the deeper steps compute the binding energy by hand and compare it with a Sun’s whole fusing life (207 times).',
    'Majors stellar unit (the quantitative depth adds the binding energy; the advanced depth the comparison)',
    'In a stellar unit after From Star to Remnant; before the compact-object investigations.',
    [
      {
        heading: 'The edge is a range',
        body: 'The white-dwarf boundary lies between about 7 and 9.5 solar masses in the cited sources; a probability at 9 is about what is known.',
      },
      {
        heading: 'The energy is a bound',
        body: 'The most a collapse can release is its binding energy, about 2.6 × 10^46 J for 1.4 solar masses and 12 km; the motion of the blast is a few tenths of a percent of it.',
      },
      {
        heading: 'What the light curve adds',
        body: 'It shows how the small visible fraction comes out over weeks; none is shown here, for want of a recorded rights decision.',
      },
    ],
    [
      {
        claim: 'Every star more massive than the Sun explodes.',
        response:
          'A star of 5 solar masses ends as a white dwarf without a supernova.',
      },
      {
        claim: 'Most of the energy of a supernova is light.',
        response:
          'The light is a tiny part; almost all the binding energy leaves as neutrinos.',
      },
      {
        claim: 'A probability in the panel is a measured rate.',
        response:
          'It states how well the edge is known, not how often anything happens.',
      },
      {
        claim: 'Every collapse leaves a black hole.',
        response:
          'The remnant depends on the mass: the lighter collapses leave neutron stars, and the panel gives a probability for each at the edge of the range.',
      },
    ],
    [
      'The binding energy is a uniform-density estimate, good to a few tens of percent; the order of magnitude is firm.',
      'The blast energy of 10^44 J is a typical value from a review (Janka 2012), not computed in Gravitas.',
      'No light curve ships: no rights decision exists for a public one and a synthetic one would need a new instrument.',
      'Keep the exponents in view: the blast’s 10^44 J against the binding energy’s 10^46 J is a ratio of two powers of ten, and students who lose a factor of 100 usually dropped an exponent, not a digit.',
    ],
    [
      'Why does the same total energy come out so differently as motion and as neutrinos?',
      'What would a light curve tell you that the binding energy cannot?',
      'Why can a collapse release so much more energy than the explosion itself shows?',
    ],
    [
      'Compute the binding energy for a radius of 10 km and 15 km and say how the share moves.',
      'Find the mass at which the panel first says black hole with probability above one half.',
    ],
    [
      'Lives of Stars and From Star to Remnant',
      'Gravitational potential energy',
      'Mass–energy equivalence',
    ]
  ),
  'populations-i-and-ii': GUIDE(
    'Metal-rich and metal-poor populations, [Fe/H] as a logarithm, what the assumed metallicity does to a cluster’s age (3.35 against 1.47 Gyr) and distance (30 percent), and which stars survive in a very old population',
    'Students read what −0.5 dex means (about a third of the Sun’s iron), fit one synthetic cluster at two metallicities (an age 2.3 times larger when metal-poor), say why, and find that a 12 Gyr population has a turnoff near 0.94 solar masses on solar-composition tracks.',
    'Majors stellar unit (the quantitative depth adds the age ratio and the old turnoff; the advanced depth the distance shift)',
    'In a stellar unit after Two Clusters, Two Ages; before the Milky Way and galaxy investigations.',
    [
      {
        heading: 'A logarithmic composition scale',
        body: '[Fe/H] = −0.5 is a factor of 3.2 below the Sun in iron to hydrogen, not half, because the scale is a base-ten logarithm.',
      },
      {
        heading: 'The age is conditional on the metallicity',
        body: 'The same stars give 3.35, 2.02 and 1.47 Gyr at −0.5, −0.25 and 0, and the distance moves with them.',
      },
      {
        heading: 'What the investigation leaves out',
        body: 'The disc–halo kinematic split needs a sample with velocities that no panel carries; the tracks are at solar metallicity, so old-population turnoff masses are bounds.',
      },
    ],
    [
      {
        claim: '−0.5 dex is half the Sun’s metals.',
        response: 'It is a factor of 10^0.5, about 3.2, below.',
      },
      {
        claim: 'The fit measures the metallicity.',
        response: 'It never does: the panel takes it as stated and says so.',
      },
      {
        claim: 'Heavier stars last longer in an old population.',
        response:
          'They leave the main sequence first; only the lighter ones remain.',
      },
      {
        claim: 'A metal-poor cluster is a young one.',
        response:
          'Metal-poor stars are hotter at the same mass, so the same turnoff reads older when the assumed metallicity is lower; the metal-poor populations are the old ones.',
      },
    ],
    [
      'The three metallicities are the grid’s; the stars are the same each time, drawn at −0.25.',
      'The old-population turnoff uses solar-composition tracks and a power law between 0.5 and 1 solar mass; a metal-poor star of the same mass lives somewhat less, so the figure is a bound.',
      'The SEGUE spectroscopic sample of NGC 2420 is in the Observatory; no panel here carries a metallicity-and-velocity sample, and the kinematic split is named as a reading step.',
      'Write 10^[Fe/H] beside every [Fe/H] on the board; students trip on the logarithm far more often than on the astronomy.',
    ],
    [
      'If you only knew a cluster’s color–magnitude diagram, how well could you tell its age?',
      'Why do stars of lower metallicity look hotter at the same mass?',
      'Beyond colors and brightnesses, what would you need to measure for a cluster’s stars to fix their metallicity rather than assume it?',
    ],
    [
      'Do the fit for cluster B at all three metallicities and compare the spread of ages with A’s.',
      'Say what would change if the cluster were 30 percent binaries instead of 0.',
    ],
    [
      'Two Clusters, Two Ages (the cluster fit and its assumptions)',
      'Logarithms and powers of ten',
      'What the main sequence and the turnoff are',
    ]
  ),
  'spectra-tell-temperature-and-gravity': GUIDE(
    'Four SDSS spectra: the depth of one line is not a temperature (hydrogen deepest in the hot star, sodium in the cool one), line width depends on gravity, and what the spectrograph resolves against what the dataset keeps',
    'Students find the deepest Balmer line in the A star and the deepest sodium doublet in the M star, say why one line is not a thermometer, say that a dwarf’s lines are broader than a giant’s, and compute the A star’s peak (369 nm, outside the dataset), the dataset’s 1.47 samples across the sodium doublet, a 4.6 dex fall of surface gravity over a star’s life, and the doublet’s 1.82 resolution elements.',
    'Majors stellar unit (the quantitative depth adds the peak and the sampling; the advanced depth the gravity and the resolution)',
    'In a stellar unit after What a Spectrum Is Made Of; before the stellar-population and galactic investigations.',
    [
      {
        heading: 'A pattern, not a line',
        body: 'Balmer lines are deepest in the hot star (the A star) and the sodium lines in the cool one (the M star); each line has its own temperature dependence.',
      },
      {
        heading: 'Gravity broadens',
        body: 'At one temperature a dwarf’s denser atmosphere gives broader lines than a giant’s; the four stars of the dataset cannot show this, so the gravity half is worked from the evolution playback (a fall of 4.6 dex).',
      },
      {
        heading: 'Two limits',
        body: 'The spectrograph separates the sodium doublet by 1.82 resolution elements, but the dataset keeps 1.47 samples between the lines: sampling can throw away what the instrument delivered.',
      },
    ],
    [
      {
        claim: 'The deepest line is the coolest star’s.',
        response:
          'It depends on the line: Balmer is deepest in the A star, sodium in the M star.',
      },
      {
        claim: 'Two stars of one color have the same spectrum.',
        response:
          'A giant and a dwarf of one temperature differ in line width, because the gas density differs.',
      },
      {
        claim: 'A blackbody peak gives every star’s temperature.',
        response:
          'The A star’s peak is in the ultraviolet, outside the dataset’s range.',
      },
      {
        claim: 'More samples across a line always mean a better measurement.',
        response:
          'Sampling finer than the spectrograph resolves adds nothing and coarser loses what it delivered; here the dataset keeps 1.47 samples where the spectrograph separated the doublet by 1.82 resolution elements.',
      },
    ],
    [
      'The temperatures are the dataset’s catalog values (ELODIE); the depths the panel reports are its own measurements of the dataset.',
      'The dataset holds one star of each of four types and no giant; the gravity half uses the model star’s mass and radius.',
      'The resolving power of about 1,800 is the description of the NGC 2420 SEGUE dataset; the doublet wavelengths are vacuum values.',
      'Students who find the A star’s peak by Wien’s law should connect 369 nm to the dataset’s first sample at 381.5 nm: the peak is outside the range the dataset covers.',
    ],
    [
      'Why is a single line a poor thermometer?',
      'What would a pair of spectra of one temperature and different gravity show?',
      'Which would you trust for a temperature: the depth of one line, the pattern of several lines, or the color?',
    ],
    [
      'Find the peak wavelength of the G, K and M stars and say which lie in the dataset’s range.',
      'Compute the sampling across Hβ and say whether the line is well sampled.',
    ],
    [
      'What a Spectrum Is Made Of (absorption lines)',
      'Wien’s law and blackbody radiation',
      'Surface gravity as GM over R squared',
    ]
  ),
};

const FLOW = {
  'reading-the-hr-diagram': [
    {
      from: 'two-numbers-one-picture',
      to: 'which-region',
      text: 'Two properties and a picture of regions, and the hot, faint star as a white dwarf.',
    },
    {
      from: 'distance-puts-it-there',
      to: 'distance-puts-it-there',
      text: 'A cluster’s distance modulus, which turns an apparent diagram into an absolute one.',
    },
    {
      from: 'a-band-not-a-line',
      to: 'a-band-not-a-line',
      text: 'Why the main sequence is a band and not a line.',
    },
    {
      from: 'what-the-diagram-gives',
      to: 'what-the-diagram-gives',
      text: 'What the diagram gives, and what it leaves out.',
    },
  ],
  'a-stars-life-in-numbers': [
    {
      from: 'fuel-and-rate',
      to: 'which-lives-longer',
      text: 'Lifetime as fuel over rate, and the prediction for 20 times the fuel.',
    },
    {
      from: 'a-sun-like-life',
      to: 'a-heavy-life',
      text: 'The two lifetimes read from the playback.',
    },
    {
      from: 'why-the-heavy-one-is-short',
      to: 'why-the-heavy-one-is-short',
      text: 'Why the heavy star is short-lived.',
    },
    {
      from: 'what-the-lifetimes-say',
      to: 'what-the-lifetimes-say',
      text: 'What the lifetimes say about a cluster’s heaviest stars.',
    },
  ],
  'when-a-star-explodes': [
    {
      from: 'the-end-of-a-heavy-star',
      to: 'which-stars-explode',
      text: 'The end of a heavy star, and which stars collapse.',
    },
    {
      from: 'a-star-near-the-edge',
      to: 'a-star-near-the-edge',
      text: 'The uncertain edge of the collapse range.',
    },
    {
      from: 'where-the-energy-goes',
      to: 'the-share-in-the-blast',
      text: 'The prediction of where the energy goes, and the blast’s share of the binding energy.',
    },
    {
      from: 'what-a-light-curve-would-add',
      to: 'what-a-light-curve-would-add',
      text: 'What a light curve would add.',
    },
  ],
  'populations-i-and-ii': [
    {
      from: 'two-kinds-of-star',
      to: 'what-minus-half-means',
      text: 'Two populations, and what [Fe/H] means.',
    },
    {
      from: 'the-same-stars-three-ways',
      to: 'the-same-stars-three-ways',
      text: 'The same stars at two assumed metallicities.',
    },
    {
      from: 'why-older-when-poor',
      to: 'who-is-left',
      text: 'Why metal-poor means older, and who is left in a very old population.',
    },
    {
      from: 'what-this-does-not-show',
      to: 'what-this-does-not-show',
      text: 'What the investigation does not show.',
    },
  ],
  'spectra-tell-temperature-and-gravity': [
    {
      from: 'a-thermometer-and-a-scale',
      to: 'the-deepest-balmer',
      text: 'Temperature and gravity in a spectrum, and the deepest Balmer line.',
    },
    {
      from: 'read-the-depths',
      to: 'read-the-depths',
      text: 'The depths of the three features, read for each star.',
    },
    {
      from: 'the-opposite-orderings',
      to: 'what-gravity-does',
      text: 'The opposite ordering of sodium, and what gravity does to line width.',
    },
    {
      from: 'the-pack-has-no-giant',
      to: 'the-pack-has-no-giant',
      text: 'What the four stars cannot show.',
    },
  ],
};

const EXPECTATIONS = {
  'reading-the-hr-diagram': {
    'distance-puts-it-there':
      'A distance modulus of 12.10 (within 0.03) for cluster A at [Fe/H] −0.25 with no binaries.',
  },
  'a-stars-life-in-numbers': {
    'a-sun-like-life':
      'A main sequence of 9.88 Gyr (within 0.3) for 1 solar mass.',
    'a-heavy-life':
      'A main sequence of 8.65 Myr (within 0.3) for 20 solar masses.',
  },
  'when-a-star-explodes': {
    'the-share-in-the-blast':
      'About 0.39 percent (within 0.05): 10^44 J over 2.6 × 10^46 J.',
  },
  'populations-i-and-ii': {
    'the-same-stars-three-ways':
      'Ages of 3.35 Gyr (within 0.08) at [Fe/H] −0.5 and 1.47 Gyr (within 0.05) at 0 for cluster A.',
  },
  'spectra-tell-temperature-and-gravity': {
    'the-deepest-balmer': 'The A star has the deepest H-beta line of the four.',
    'read-the-depths':
      'About 36.6 percent (within 1.5) for the A star and 4.8 (within 1) for the M star.',
  },
};

const BANDS = {
  'reading-the-hr-diagram': {
    core: 'short',
    quantitative: 'short',
    advanced: 'short',
  },
  'a-stars-life-in-numbers': {
    core: 'short',
    quantitative: 'short',
    advanced: 'short',
  },
  'when-a-star-explodes': {
    core: 'short',
    quantitative: 'short',
    advanced: 'short',
  },
  'populations-i-and-ii': {
    core: 'short',
    quantitative: 'short',
    advanced: 'short',
  },
  'spectra-tell-temperature-and-gravity': {
    core: 'short',
    quantitative: 'short',
    advanced: 'short',
  },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'reading-the-hr-diagram': READING_THE_HR_DIAGRAM_ES,
  'a-stars-life-in-numbers': A_STARS_LIFE_IN_NUMBERS_ES,
  'when-a-star-explodes': WHEN_A_STAR_EXPLODES_ES,
  'populations-i-and-ii': POPULATIONS_I_AND_II_ES,
  'spectra-tell-temperature-and-gravity':
    SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'reading-the-hr-diagram': READING_THE_HR_DIAGRAM_DEEPER,
  'a-stars-life-in-numbers': A_STARS_LIFE_IN_NUMBERS_DEEPER,
  'when-a-star-explodes': WHEN_A_STAR_EXPLODES_DEEPER,
  'populations-i-and-ii': POPULATIONS_I_AND_II_DEEPER,
  'spectra-tell-temperature-and-gravity':
    SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER,
};
export const DEPTH_ES = {
  'reading-the-hr-diagram': READING_THE_HR_DIAGRAM_DEEPER_ES,
  'a-stars-life-in-numbers': A_STARS_LIFE_IN_NUMBERS_DEEPER_ES,
  'when-a-star-explodes': WHEN_A_STAR_EXPLODES_DEEPER_ES,
  'populations-i-and-ii': POPULATIONS_I_AND_II_DEEPER_ES,
  'spectra-tell-temperature-and-gravity':
    SPECTRA_TELL_TEMPERATURE_AND_GRAVITY_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
// The catalog order is the order the lessons are written in this file: the
// registry generator reads it from the text (tools/capability-registries.mjs).
export default [
  READING_THE_HR_DIAGRAM,
  A_STARS_LIFE_IN_NUMBERS,
  WHEN_A_STAR_EXPLODES,
  POPULATIONS_I_AND_II,
  SPECTRA_TELL_TEMPERATURE_AND_GRAVITY,
];
