// =============================================================================
// Inside a Star
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the interiors family's "polytrope" tool
// (js/interiorsWidgets.js over js/kernels/stellar): a star whose pressure
// follows P = K rho^(1 + 1/n), the Lane-Emden solution scaled to a mass and a
// radius. The numbers a student reads are checked against that model by
// tests/interiorsInvestigations.test.js. A polytrope is a shape, not a star:
// the lesson says what it leaves out.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'model', name: 'A model star', teffK: 5772, lumSun: 1 },
    { role: 'compare', name: 'A red dwarf', teffK: 3300, lumSun: 0.01 },
  ],
};
const PT = (values = {}) => ({ id: 'polytrope', values });
const SUN = { n: 3, logM: 0, logR: 0 };

const INSIDE_A_STAR = {
  id: 'inside-a-star',
  thumbnail: 'images/investigations/inside-a-star.webp',
  title: 'Inside a Star',
  subtitle: 'Hydrostatic equilibrium, a polytrope, and why the center is hot',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 16, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: true },
  objectives: [
    'State what holds a star up and write the balance that fixes its structure',
    'Read the central density and temperature of a star modeled as a polytrope, and say how concentrated it is',
    'Explain why the center of a star is hot from its weight alone, and how the temperature scales with the mass and the radius',
    'Say what a polytrope leaves out and which real stars it describes',
  ],
  steps: [
    {
      sid: 'weight-and-pressure',
      stage: STARS,
      type: 'read',
      title: 'Weight and pressure',
      body: `A star is a ball of gas that does not collapse and does not
             blow apart, so at every depth the pressure pushing outward must
             balance the weight of the gas above pressing inward. That
             balance is <strong>hydrostatic equilibrium</strong>:
             <strong>dP/dr = −G m ρ ÷ r²</strong>, where <em>m</em> is the mass
             inside radius <em>r</em> and ρ the density there.
             \n\nThe equation alone does not give a star: it needs a rule for
             how pressure depends on density. A <strong>polytrope</strong>
             takes <em>P = K ρ<sup>1 + 1/n</sup></em>, and the balance then has
             a single solution for each <em>n</em>, the Lane-Emden equation.
             The instrument draws it, from the center on the left to the
             surface on the right. This is a <strong>model</strong>: a shape
             with no source of energy in it.`,
      tool: PT(SUN),
    },
    {
      sid: 'predict-the-centre',
      stage: STARS,
      type: 'predict',
      reveal: 'the-suns-centre',
      title: 'How dense is the center?',
      body: `The Sun’s average density is 1.4 grams per cubic centimeter, a bit
             more than water. The instrument shows the Sun as a polytrope with
             <em>n</em> = 3, which puts more of the mass toward the center.
             Do not read the instrument yet.`,
      prompt: 'The density at the center will be&hellip;',
      options: [
        'about the same, 1.4 g/cm³',
        'about five times the average, 7 g/cm³',
        'about fifty times the average, 70 g/cm³',
        'about five thousand times the average, 7,000 g/cm³',
      ],
      answer: 2,
      hints: [
        'Water is 1 g/cm³ and lead is 11 g/cm³: a gas that is squeezed by the weight of a whole star is much denser than either.',
      ],
      because:
        'About fifty times the average. The n = 3 polytrope has a central density of 54 times the mean, which is 76 g/cm³, seven times lead. The next step reads it.',
      tool: PT(SUN),
    },
    {
      sid: 'the-suns-centre',
      stage: STARS,
      type: 'measure',
      title: 'The center of the Sun, as a polytrope',
      body: `With <em>n</em> = 3, one solar mass and one solar radius, read the
             <strong>central density</strong> and the <strong>central
             temperature</strong>. The instrument gives the temperature in
             kelvin; enter it in millions of kelvin.`,
      fields: [
        { id: 'rho', label: 'Central density', unit: 'g/cm³', hint: '76.4' },
        {
          id: 'tc',
          label: 'Central temperature',
          unit: 'million K',
          hint: '11.8',
        },
      ],
      validate: v => {
        if (![v.rho, v.tc].every(Number.isFinite)) return null;
        if (Math.abs(v.rho - 76.4) <= 0.8 && Math.abs(v.tc - 11.76) <= 0.3) {
          return {
            level: 'ok',
            message:
              '76 g/cm³ and 11.8 million kelvin. The real center is denser and hotter, about 150 g/cm³ and 15.7 million kelvin, because the real Sun is more concentrated than n = 3. The model gets the order of magnitude, from the weight alone.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Polytropic index n” to 3, the mass to 1 and the radius to 1, then read “Central density” and “Central temperature” (kelvin; divide by a million).',
        };
      },
      tool: PT(SUN),
    },
    {
      sid: 'half-the-mass',
      stage: STARS,
      type: 'measure',
      title: 'Where the mass is',
      body: `The dot on the gray curve marks the radius that holds half of the
             star’s mass. Read it, as a fraction of the star’s radius, and
             read how many times denser the center is than the average.`,
      fields: [
        {
          id: 'half',
          label: 'Radius holding half the mass',
          unit: '',
          hint: '0.28',
        },
        {
          id: 'ratio',
          label: 'Central density ÷ mean density',
          unit: '',
          hint: '54.2',
        },
      ],
      validate: v => {
        if (![v.half, v.ratio].every(Number.isFinite)) return null;
        if (
          Math.abs(v.half - 0.283) <= 0.012 &&
          Math.abs(v.ratio - 54.18) <= 0.4
        ) {
          return {
            level: 'ok',
            message:
              'Half the mass lies inside 28 percent of the radius, which is only 2 percent of the volume. A star like this is mostly a dense center with a long, thin outside.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep n = 3, mass 1 and radius 1, and read “Radius holding half the mass” and “Central density divided by the mean density”.',
        };
      },
      tool: PT(SUN),
    },
    {
      sid: 'twice-the-mass',
      stage: STARS,
      type: 'measure',
      title: 'Twice the mass in the same size',
      body: `Keep the radius at 1 solar radius and make the mass
             <strong>2</strong> solar masses. Read the central density and the
             central temperature (in millions of kelvin). Compare each with the
             values for one solar mass.`,
      fields: [
        { id: 'rho', label: 'Central density', unit: 'g/cm³', hint: '153' },
        {
          id: 'tc',
          label: 'Central temperature',
          unit: 'million K',
          hint: '23.5',
        },
      ],
      validate: v => {
        if (![v.rho, v.tc].every(Number.isFinite)) return null;
        if (Math.abs(v.rho - 152.8) <= 1.6 && Math.abs(v.tc - 23.53) <= 0.5) {
          return {
            level: 'ok',
            message:
              'Both doubled. Twice the mass in the same volume is twice the density, and the temperature that carries the extra weight is twice as high: the central temperature grows in proportion to M ÷ R.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep n = 3 and the radius at 1, set the mass to 2, then read the two rows (temperature in kelvin, divided by a million).',
        };
      },
      tool: PT({ n: 3, logM: Math.log10(2), logR: 0 }),
    },
    {
      sid: 'why-the-centre-is-hot',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why the center is hot',
      body: `Nothing in the model makes energy: the temperature comes out of the
             balance between weight and pressure, for a gas of ions and
             electrons whose pressure is ρkT ÷ (μm). Doubling the mass at the
             same radius doubled the central temperature.`,
      prompt: 'Which statement explains the hot center?',
      options: [
        'The center is hot because nuclear fusion heats it',
        'The weight of the layers above has to be held up, so the pressure there is enormous, and for a dense gas that much pressure means a very high temperature',
        'Heat flows inward from the cooler surface and piles up',
        'The center is hot because it is far from the cold of space',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'fusion-first',
          option: 0,
          say: 'Fusion needs the heat, not the other way round: it begins only because the center is already this hot. Here there is no fusion in the model and the temperature is the same.',
        },
      ],
      hints: [
        'The model has no energy source. What is left that can fix the temperature?',
      ],
      because:
        'The weight sets the pressure (millions of times atmospheric at the Sun’s center), and the gas law sets what temperature a gas of that density needs to supply it. Fusion is then possible because the center is hot, and it replaces the energy the star radiates, but it does not set the structure.',
      tool: PT({ n: 3, logM: Math.log10(2), logR: 0 }),
    },
    {
      sid: 'a-red-dwarf',
      stage: STARS,
      type: 'measure',
      title: 'A red dwarf is a different shape',
      body: `Load “A red dwarf as n = 3/2”: 0.2 solar masses in 0.22 solar radii.
             A star that is convective all the way through is less centrally
             condensed. Read the central temperature (in millions of kelvin) and
             how many times denser the center is than the average.`,
      fields: [
        {
          id: 'tc',
          label: 'Central temperature',
          unit: 'million K',
          hint: '6.74',
        },
        {
          id: 'ratio',
          label: 'Central density ÷ mean density',
          unit: '',
          hint: '5.99',
        },
      ],
      validate: v => {
        if (![v.tc, v.ratio].every(Number.isFinite)) return null;
        if (Math.abs(v.tc - 6.74) <= 0.15 && Math.abs(v.ratio - 5.99) <= 0.06) {
          return {
            level: 'ok',
            message:
              'The center is only 6 times denser than the average, against 54 for the Sun model, and 6.7 million kelvin, cooler than the Sun’s because the star is lighter for its size. A red dwarf’s fusion is slow, and the star is almost uniformly mixed.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the preset “A red dwarf as n = 3/2”, then read “Central temperature” (divide kelvin by a million) and “Central density divided by the mean density”.',
        };
      },
      tool: PT({ n: 1.5, logM: Math.log10(0.2), logR: Math.log10(0.22) }),
    },
    {
      sid: 'no-concentration',
      stage: STARS,
      type: 'measure',
      title: 'The limit of no concentration',
      body: `Load “Uniform density, n = 0”: a ball of the same density
             throughout. Read the central density divided by the mean density,
             and the radius that holds half the mass. A uniform ball has half
             its mass inside the radius whose volume is half the star’s.`,
      fields: [
        {
          id: 'ratio',
          label: 'Central density ÷ mean density',
          unit: '',
          hint: '1',
        },
        {
          id: 'half',
          label: 'Radius holding half the mass',
          unit: '',
          hint: '0.79',
        },
      ],
      validate: v => {
        if (![v.ratio, v.half].every(Number.isFinite)) return null;
        if (
          Math.abs(v.ratio - 1) <= 0.01 &&
          Math.abs(v.half - 0.794) <= 0.012
        ) {
          return {
            level: 'ok',
            message:
              '1.00 and 0.79, the cube root of one half. A real star lies between this and the most concentrated models, and the index n says where: a higher n holds more of the mass near the center.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Polytropic index n” to 0, the mass to 1 and the radius to 1, then read the two rows.',
        };
      },
      tool: PT({ n: 0, logM: 0, logR: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A star is held up by pressure against its own weight, and a
             polytrope is the shape that balance takes when pressure follows
             density as a power. For the Sun that shape has a center some fifty
             times denser than the average and about twelve million kelvin,
             which comes from the weight alone and grows as the mass over the
             radius. The model leaves out where the energy comes from, how it
             gets out (opacity and convection) and the radiation pressure that
             matters above about ten solar masses, so it describes shapes, not
             stars. The next investigation asks how far a simple scaling of
             those ideas gets across the whole main sequence.`,
      tool: PT(SUN),
    },
  ],
};

export default INSIDE_A_STAR;
