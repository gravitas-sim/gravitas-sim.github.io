// =============================================================================
// The Limit
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the interiors family's "wd-mass-radius" tool
// (js/interiorsWidgets.js over js/kernels/stellar): a white dwarf of cold
// degenerate electrons integrated from a central density, whose mass rises to
// a limit that nothing in the integration puts in. The numbers a student reads
// are checked against that model by tests/interiorsInvestigations.test.js. No
// observed white dwarfs are drawn (D-INTERIOR-01), and the lesson says the model
// is cold and ideal.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'dwarf', name: 'A white dwarf', teffK: 12000, lumSun: 0.003 },
    { role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 },
  ],
};
const WD = (values = {}) => ({ id: 'wd-mass-radius', values });
const TYPICAL = { logRho: 6.5, muE: 2 };

const THE_LIMIT = {
  id: 'the-limit',
  thumbnail: 'images/investigations/the-limit.webp',
  title: 'The Limit',
  subtitle: 'White-dwarf mass and radius, and why 1.4 solar masses',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 23, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['inside-a-star'],
  tags: ['compact-objects', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what holds a white dwarf up and why its radius falls as its mass rises',
    'Measure the mass and radius of a model white dwarf from its central density',
    'Explain why the mass has a limit and read the limit from the model',
    'Say how the limit depends on the composition, and what the model leaves out',
  ],
  steps: [
    {
      sid: 'a-star-held-up-by-electrons',
      stage: STARS,
      type: 'read',
      title: 'A star held up by electrons',
      body: `A star that has stopped burning fuel has nothing to keep it hot. A
             white dwarf is what is left, and it does not collapse because its
             electrons are squeezed so close that the exclusion principle
             forbids more of them from sharing a state: they fill every
             momentum state up to a top value, and that gas of
             <strong>degenerate</strong> electrons pushes back, whatever the
             temperature. The ions supply the mass and the electrons the
             pressure.
             \n\nThe instrument integrates a star of this gas outward from a
             central density you choose, balancing weight against pressure at
             every radius. The curve is every such star; the dot is yours.
             This is a <strong>model</strong>: cold, with ideal electrons, and
             no observed white dwarfs are drawn.`,
      tool: WD(TYPICAL),
    },
    {
      sid: 'a-typical-dwarf',
      stage: STARS,
      type: 'measure',
      title: 'A typical white dwarf',
      body: `With a central density of 3 million g/cm³ (carbon and oxygen,
             two nucleons per electron) read the <strong>mass</strong> and the
             <strong>radius in kilometers</strong>. For comparison, the Earth is
             6,371 km in radius.`,
      fields: [
        { id: 'm', label: 'Mass', unit: 'M☉', hint: '0.60' },
        { id: 'r', label: 'Radius', unit: 'km', hint: '8860' },
      ],
      validate: v => {
        if (![v.m, v.r].every(Number.isFinite)) return null;
        if (Math.abs(v.m - 0.597) <= 0.012 && Math.abs(v.r - 8864) <= 150) {
          return {
            level: 'ok',
            message:
              '0.60 solar masses in a ball 1.4 times the Earth’s radius: the mass of the Sun’s core and the size of a planet. Typical white dwarfs measured in the sky are about 0.6 solar masses, which the model reproduces in kind; the model’s radius is a few percent larger than the best published relations.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the preset “A typical dwarf, 0.6 solar masses” (central density 3.2 million g/cm³, two nucleons per electron), then read “Mass” and “Radius, in kilometers”.',
        };
      },
      tool: WD(TYPICAL),
    },
    {
      sid: 'predict-the-squeeze',
      stage: STARS,
      type: 'predict',
      reveal: 'a-dense-dwarf',
      title: 'Squeeze the center',
      body: `Now imagine a white dwarf whose central density is about three
             hundred times higher, one billion g/cm³. Do not change the
             instrument yet.`,
      prompt: 'Compared with the typical dwarf, it will have&hellip;',
      options: [
        'a larger mass and a larger radius',
        'a larger mass and a smaller radius',
        'a smaller mass and a smaller radius',
        'the same mass and radius',
      ],
      answer: 1,
      hints: [
        'More central density means more of the star is packed in, but the weight on the electrons also grows.',
      ],
      because:
        'A larger mass and a smaller radius. A more massive white dwarf presses its electrons harder, they resist by getting closer together, and the star shrinks: heavier white dwarfs are smaller. The next step measures it.',
      tool: WD(TYPICAL),
    },
    {
      sid: 'a-dense-dwarf',
      stage: STARS,
      type: 'measure',
      title: 'A dense white dwarf',
      body: `Set the central density to <strong>10⁹</strong> g/cm³ and read the
             mass and the radius in kilometers.`,
      fields: [
        { id: 'm', label: 'Mass', unit: 'M☉', hint: '1.37' },
        { id: 'r', label: 'Radius', unit: 'km', hint: '2470' },
      ],
      validate: v => {
        if (![v.m, v.r].every(Number.isFinite)) return null;
        if (Math.abs(v.m - 1.367) <= 0.015 && Math.abs(v.r - 2470) <= 50) {
          return {
            level: 'ok',
            message:
              '1.37 solar masses in 2,470 km: the mass more than doubled and the radius fell to a quarter, so the density rose a hundredfold on average. Heavier is smaller. Notice how close to 1.4 the mass is getting.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Central density” to 10⁹ g/cm³ (slider at 9) with two nucleons per electron, then read “Mass” and “Radius, in kilometers”.',
        };
      },
      tool: WD({ logRho: 9, muE: 2 }),
    },
    {
      sid: 'the-ceiling',
      stage: STARS,
      type: 'measure',
      title: 'The ceiling',
      body: `Raise the central density another hundred times, to
             <strong>10¹¹</strong> g/cm³ (the end of the slider). Read the mass
             and the <strong>limiting mass</strong> the instrument lists for this
             composition, which is where the curve is heading.`,
      fields: [
        { id: 'm', label: 'Mass', unit: 'M☉', hint: '1.45' },
        { id: 'limit', label: 'Limiting mass', unit: 'M☉', hint: '1.456' },
      ],
      validate: v => {
        if (![v.m, v.limit].every(Number.isFinite)) return null;
        if (
          Math.abs(v.m - 1.45) <= 0.012 &&
          Math.abs(v.limit - 1.456) <= 0.003
        ) {
          return {
            level: 'ok',
            message:
              '1.450 against a limit of 1.456. A hundred times the density added six percent of the mass, and the next hundredfold would add far less: the mass climbs toward 1.456 and never passes it. Nothing in the integration contains that number; it emerges from the equations as the electrons become relativistic.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Central density” to 10¹¹ g/cm³ (the end of the slider) with two nucleons per electron, then read “Mass” and “Limiting mass for this μₑ”.',
        };
      },
      tool: WD({ logRho: 11, muE: 2 }),
    },
    {
      sid: 'why-a-limit',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why a limit',
      body: `The central Fermi momentum, in units of mₑc, is 37 at this density:
             the electrons at the top of the gas move at nearly the speed of
             light. At low density the degenerate pressure rises as ρ<sup>5/3</sup>;
             when the electrons are relativistic it rises only as ρ<sup>4/3</sup>.`,
      prompt: 'Which statement explains the limiting mass?',
      options: [
        'Above that mass the star runs out of nuclear fuel and collapses',
        'Relativistic electrons add pressure only as ρ^(4/3), the same rate at which gravity strengthens as the star shrinks, so no additional pressure can hold up more mass',
        'At 1.4 solar masses a white dwarf turns into a black hole at once',
        'Heavier white dwarfs spin so fast that they fly apart',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'fuel',
          option: 0,
          say: 'A white dwarf has no fuel to run out of, at any mass. The limit comes from how electron pressure grows with density, not from burning.',
        },
        {
          id: 'black-hole',
          option: 2,
          say: 'Nothing here makes a black hole. A white dwarf pushed over the limit collapses until a different pressure (neutrons) holds it, or explodes.',
        },
      ],
      hints: [
        'Compare the exponent of pressure against density with the exponent gravity needs. Which one wins at the limit?',
      ],
      because:
        'Gravity grows as the star contracts as fast as relativistic degenerate pressure does, so a star at the limiting mass has no stable size: more mass wins. The mass where that happens is 5.8 solar masses divided by μₑ², which is 1.46 for carbon and oxygen.',
      tool: WD({ logRho: 11, muE: 2 }),
    },
    {
      sid: 'hydrogen-would-be-different',
      stage: STARS,
      type: 'measure',
      title: 'If the star were hydrogen',
      body: `The limit depends on how many nucleons ride along with each electron,
             μₑ: 2 for carbon, oxygen and helium, 1 for hydrogen. Load “A
             hypothetical hydrogen star, μₑ = 1” and read the limiting mass.`,
      fields: [
        { id: 'limit', label: 'Limiting mass', unit: 'M☉', hint: '5.82' },
      ],
      validate: v => {
        if (!Number.isFinite(v.limit)) return null;
        if (Math.abs(v.limit - 5.823) <= 0.03) {
          return {
            level: 'ok',
            message:
              'Four times as much: the limit goes as 1 ÷ μₑ², and halving μₑ multiplies it by 4. Real white dwarfs are made of what the star burned, carbon and oxygen or helium, with two nucleons per electron, so their limit is the 1.4 and not the 5.8.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the preset “A hypothetical hydrogen star, μₑ = 1”, then read “Limiting mass for this μₑ”.',
        };
      },
      tool: WD({ logRho: 8, muE: 1 }),
    },
    {
      sid: 'an-iron-core',
      stage: STARS,
      type: 'measure',
      title: 'An iron core',
      body: `The core of a very massive star ends as iron, with 56 nucleons for
             26 electrons: μₑ = 2.15. Set “Nucleons per electron” to
             <strong>2.15</strong> and read the limiting mass, which is why such
             a core collapses a little below the white-dwarf limit.`,
      fields: [
        { id: 'limit', label: 'Limiting mass', unit: 'M☉', hint: '1.26' },
      ],
      validate: v => {
        if (!Number.isFinite(v.limit)) return null;
        if (Math.abs(v.limit - 1.26) <= 0.006) {
          return {
            level: 'ok',
            message:
              '1.26 solar masses for μₑ = 2.15: lower than 1.46 because there are more nucleons per electron. The real collapse mass of an iron core is higher (heat and shells matter), so this is the cold, ideal gas bound and not the mass of any actual star.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Nucleons per electron, μₑ” to 2.15 and read “Limiting mass for this μₑ”.',
        };
      },
      tool: WD({ logRho: 11, muE: 2.15 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Degenerate electrons hold a white dwarf up, and because they get
             closer together as the star gets heavier, a heavier white dwarf is
             a smaller one: 0.6 solar masses in a planet-sized ball, 1.4 in under
             3,000 kilometers. The mass does not grow without end: when
             the electrons are relativistic, their pressure stops keeping pace
             with gravity, and the mass approaches 5.8 ÷ μₑ² solar masses, 1.46
             for carbon and oxygen. The model is cold and ideal, so it leaves
             out ion interactions, composition layers, temperature and
             relativity of the star itself; a real white dwarf is a few percent
             smaller than the model, and its limit is set a little lower by
             the instabilities the model does not have.`,
      tool: WD(TYPICAL),
    },
  ],
};

export default THE_LIMIT;
