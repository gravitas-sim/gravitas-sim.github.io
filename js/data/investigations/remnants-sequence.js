// =============================================================================
// How Old Is This White Dwarf? and From Star to Remnant (Prompt 222)
// -----------------------------------------------------------------------------
// Two investigations, each at three depths, in one module that also carries their Spanish
// words, their deeper steps and their instructor content: this is the one closure file the
// prompt adds (D-R10-222-05), because the shared sequence files sit at their line ceilings.
// The per-lesson path every loader builds from an id is a one-line re-export of a named export
// here, and the instructor modules read INSTRUCTOR. No imports: every number a step states is
// recomputed in tests/remnantsLessons.test.js from the instruments (js/remnantsWidgets.js over
// js/remnantsField.js and the kernel js/kernels/remnants/). Every step carries a `sid`, an
// opaque stable id that student progress is keyed by.
//
// The data are models: the cooling law with the error it makes against a published cooling
// table, the cited initial-final mass relation, and threshold ranges from the literature. No
// observed white dwarf is shown (D-INTERIOR-01, D-RIGHTS-03), and the lessons say so.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'dwarf', name: 'A white dwarf', teffK: 9100, lumSun: 0.001 },
    { role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 },
  ],
};
/** The cooling panel: entry 0 luminosity, 1 temperature; precision 0 exact to 3 poor; view 0 age against luminosity, 1 against mass. */
const COOL = (values = {}) => ({
  id: 'remnant-cooling',
  values: {
    mass: 0.6,
    entry: 0,
    logL: -3,
    teff: 8000,
    precision: 0,
    view: 0,
    ...values,
  },
});
/** The outcome panel: relation 0 MIST, 1 PARSEC; view 0 the final mass, 1 the probabilities, 2 neutron stars. */
const OUT = (values = {}) => ({
  id: 'remnant-outcome',
  values: { mi: 3, relation: 0, view: 0, ...values },
});

export const HOW_OLD_IS_THIS_WHITE_DWARF = {
  id: 'how-old-is-this-white-dwarf',
  thumbnail: 'images/investigations/how-old-is-this-white-dwarf.webp',
  title: 'How Old Is This White Dwarf?',
  subtitle:
    'Read how long a white dwarf has been cooling from its mass and its light, and keep the uncertainty of the measurement apart from the error of the law',
  duration: '14-28 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 23, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['the-limit'],
  tags: ['compact-objects', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say why a white dwarf cools, and why it cools more slowly the fainter it gets',
    'Read the cooling age of a white dwarf from its mass and its luminosity or temperature',
    'Say that an age has two uncertainties, one from the measurements and one from the law, and which of them better measurements can remove',
    'Say where the law is checked, and why a dwarf outside that range gets a bound and not an age',
  ],
  steps: [
    {
      sid: 'an-ember-cooling',
      stage: STAGE,
      type: 'read',
      title: 'An ember cooling',
      body: `A white dwarf is what is left of a star that has stopped burning fuel. It makes no heat of its
             own. What it shines with is the heat its nuclei stored while it was a star, and it lets that heat out
             slowly through a thin outer layer, so it cools, and the longer it has been cooling the fainter it is.
             That is a clock: if you know how fast a white dwarf cools, its brightness says how long ago it
             formed. \n\nThe panel does this with a law of Mestel’s kind. Give it the mass of a white dwarf and its
             luminosity, and it gives the <strong>cooling age</strong>: the time since it began to cool. Here is a
             white dwarf of 0.6 solar masses, about the commonest mass, at a thousandth of the Sun’s luminosity.
             The law is a model, and the panel says where it is checked.`,
      tool: COOL(),
    },
    {
      sid: 'ten-times-fainter',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-two-ages',
      title: 'Ten times fainter',
      body: `A 0.6 solar-mass white dwarf at a thousandth of the Sun’s luminosity has been cooling for a
             little under a billion years. It cools until it is ten times fainter, at a ten-thousandth.`,
      prompt:
        'Compared with its age at a thousandth, its age at a ten-thousandth will be&hellip;',
      options: [
        'about the same: a white dwarf is hardly changing',
        'about ten times older: ten times fainter takes ten times as long',
        'about five times older: it cools more slowly the fainter it gets',
        'about twice as old',
      ],
      answer: 2,
      hints: [
        'The hotter a body is, the faster it loses heat. What does that do to the time it takes to fall by the same factor again?',
      ],
      because:
        'About five times. A hot white dwarf loses its heat fast and a cool one slowly, so each factor of ten in luminosity takes longer than the one before: in the law the age grows as the luminosity to the power minus five sevenths, and ten to the five sevenths is 5.2. It takes less than a billion years to reach a thousandth and about four billion to reach a ten-thousandth.',
      tool: COOL(),
    },
    {
      sid: 'read-two-ages',
      stage: STAGE,
      type: 'measure',
      title: 'Read two ages',
      body: `Set the <strong>luminosity</strong> to a ten-thousandth of the Sun’s (log10 of it is &minus;4.0) and
             read the cooling age; then set it back to a thousandth (&minus;3.0) and read that. Give both in billions
             of years.`,
      fields: [
        {
          id: 'a',
          label: 'Age at a ten-thousandth',
          unit: 'Gyr',
          hint: '4.09',
        },
        {
          id: 'b',
          label: 'Age at a thousandth',
          unit: 'Gyr',
          hint: '0.79',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 4.09, 0.1) && near(v.b, 0.79, 0.04)) {
          return {
            level: 'ok',
            message:
              'About 4.1 billion years at a ten-thousandth and 0.79 at a thousandth: the ratio is 5.2, not 10. The second factor of ten took more than three billion years, four times the first stretch, because the white dwarf was already cool.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the mass at 0.6 solar masses and set the luminosity to −4.0, then −3.0: the ages are about 4.09 and 0.79 billion years.',
        };
      },
      tool: COOL({ logL: -4 }),
    },
    {
      sid: 'two-uncertainties',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Two uncertainties',
      body: `A cooling age has two uncertainties. One comes from how well you know the mass and the luminosity.
             The panel’s <strong>Measurement</strong> control sets that: exact, good (the mass to 0.02 solar masses,
             the luminosity to 0.02 in log10), typical or poor. The other comes from the law itself: Gravitas compared
             it with a published table of white-dwarf cooling and measured how far it strays. The panel is set to
             good measurements; read the two lines.`,
      prompt: 'What mostly sets the width of the interval?',
      options: [
        'The law’s own error, about ± 19 percent: the measurements add about ± 8 percent on top',
        'The measurements, about ± 19 percent: the law adds about ± 8 percent on top',
        'Nothing but the measurements: a law is exact once it is written down',
        'The two are the same thing',
      ],
      answer: 0,
      hints: [
        'Set the measurement to exact. The interval narrows, but does it close?',
      ],
      because:
        'The law’s own. With good measurements the interval is the age plus or minus about 20 percent, and even with exact measurements it is plus or minus 19: that is the error the law makes against the published table, and better measurements cannot remove it. Only a better law, or the tables themselves, can.',
      misconceptions: [
        {
          id: 'exact',
          option: 2,
          say: 'A law is a simplification of a star. This one has one store of heat and one way of losing it; the real star has more, and the difference is the error the panel states.',
        },
        {
          id: 'same',
          option: 3,
          say: 'They are different: one is about the numbers you put in, the other is about the formula they go into, and only the first shrinks with better measurements.',
        },
      ],
      tool: COOL({ precision: 1 }),
    },
    {
      sid: 'beyond-the-edge',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Beyond the edge',
      body: `Set the luminosity to &minus;4.4, cooler than the faintest white dwarf the law is checked for. The
             panel gives no age.`,
      prompt: 'Why does it give none?',
      options: [
        'Below that luminosity other things set the cooling, such as the ions freezing into a crystal, and the law that leaves them out is no longer checked there',
        'Because a white dwarf cannot be that faint',
        'Because the age would be larger than the age of the universe',
        'Because the panel cannot calculate a number that small',
      ],
      answer: 0,
      hints: [
        'The law has one store of heat and one way of losing it. What happens to a store of heat when its ions freeze?',
      ],
      because:
        'The law counts the heat of the ions and nothing else. As a white dwarf cools its ions freeze into a crystal and give out latent heat, and at lower luminosities their vibrations change how much heat they hold: both change the cooling in ways the law leaves out. The panel refuses rather than state an age it has not checked.',
      misconceptions: [
        {
          id: 'universe',
          option: 2,
          say: 'The law would give about eight billion years, which is shorter than the universe’s age; it is the physics, not the size of the number, that is missing.',
        },
      ],
      tool: COOL({ logL: -4.4 }),
    },
    {
      sid: 'a-bound-not-an-age',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A bound, not an age',
      body: `A 0.6 solar-mass white dwarf is found at a luminosity of &minus;4.4, beyond the edge. The panel at the
             edge, &minus;4.0, gives an age of 4.1 billion years, with an interval from 3.4 to 4.9. A white dwarf
             only grows fainter with time.`,
      prompt: 'What can you say about the age of the one at −4.4?',
      options: [
        'At least about 3.4 billion years: it has been cooling for longer than it takes to reach the edge, and the edge’s age cannot be lower than 3.4',
        '7.9 billion years: extend the law a little',
        'Less than 4.1 billion years',
        'Nothing at all',
      ],
      answer: 0,
      hints: [
        'A cooler white dwarf has been cooling for longer than a warmer one of the same mass. What is the lowest the warmer one’s age can be?',
      ],
      because:
        'It is at least about 3.4 billion years old (the lower end of the interval at the edge). That is a bound, not an age, and it is one the law can give where it cannot give the age. It also says something about the star’s population: the white dwarf’s own progenitor lived before it, so the population is older still.',
      misconceptions: [
        {
          id: 'extend',
          option: 1,
          say: 'Extending the law past the edge gives a number, but the physics that takes over there, crystallization among it, is what the law leaves out.',
        },
      ],
      tool: COOL({ logL: -4 }),
    },
    {
      sid: 'what-the-age-says',
      stage: STAGE,
      type: 'read',
      title: 'What the age says',
      body: `The cooling age of a white dwarf comes from its mass and its light through a law checked for 0.5 to
             1.0 solar masses and for luminosities from a ten-thousandth to a thirtieth of the Sun’s. An age carries
             two uncertainties, one from the measurements and one from the law itself; with exact measurements only
             the second is left, about 19 percent. Beyond the edge the panel gives a bound and not an age, and the
             law is a model checked against published model sequences: no table of observed white dwarfs is part
             of this investigation.`,
      tool: COOL(),
    },
  ],
};

/** The deeper steps: quantitative (majors) and advanced (upper-level), after the core steps they hang on. */
export const HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER = {
  id: 'how-old-is-this-white-dwarf',
  steps: [
    {
      sid: 'from-a-temperature',
      after: 'beyond-the-edge',
      depth: 'quantitative',
      type: 'measure',
      title: 'From a temperature',
      body: `A spectrum gives a white dwarf’s temperature more directly than its luminosity. Set
             <strong>Enter</strong> to temperature, the temperature to 6000 K, the mass to 0.6 and the measurement to
             good. The panel turns the temperature into a luminosity with the white dwarf’s radius. Read the
             <strong>age</strong>, the part of the uncertainty that comes from the measurements, and the part that
             comes from the law, as percentages.`,
      fields: [
        { id: 'a', label: 'Cooling age', unit: 'Gyr', hint: '2.60' },
        {
          id: 'b',
          label: 'From the measurements',
          unit: 'percent',
          hint: '14',
        },
        { id: 'c', label: 'From the law', unit: 'percent', hint: '19' },
      ],
      validate: v => {
        if (![v.a, v.b, v.c].every(Number.isFinite)) return null;
        if (near(v.a, 2.6, 0.08) && near(v.b, 14, 1.5) && near(v.c, 18.5, 1)) {
          return {
            level: 'ok',
            message:
              'About 2.6 billion years, ± 14 percent from the measurements and ± 19 from the law. The measurement part is larger here than at fixed luminosity because a temperature error of 100 K becomes a fourfold-larger error in the luminosity, and the mass error enters twice, through the age and through the radius.',
          };
        }
        return {
          level: 'error',
          message:
            'Set Enter to temperature, 6000 K, the mass to 0.6 and the measurement to good: the age is about 2.6 billion years, ± 14 percent from the measurements and ± 19 from the law.',
        };
      },
      tool: COOL({ entry: 1, teff: 6000, precision: 1 }),
    },
    {
      sid: 'heavier-is-older',
      after: 'from-a-temperature',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Heavier, and older',
      body: `Show <strong>age against mass</strong> at a luminosity of &minus;3.5. A 0.5 solar-mass white dwarf at
             that luminosity is 1.6 billion years old; a 1.0 solar-mass one is 2.6.`,
      prompt: 'Why is the heavier white dwarf older at the same luminosity?',
      options: [
        'It holds more ions, so more heat, and the same luminosity takes it longer to let that heat out: the age grows as the mass to the power five sevenths, 1.64 times for twice the mass',
        'It formed earlier',
        'It is bigger, so it cools more slowly',
        'It is not older: the panel is wrong',
      ],
      answer: 0,
      hints: [
        'The heat is the ions’ heat. Twice the mass has twice the ions. What does that do to the time to lose it at a given rate?',
      ],
      because:
        'The age is the store of heat divided by the rate it is lost, and the store grows with the mass while, at a given luminosity, the rate is fixed; the rest of the law (the temperature inside depends on the mass) brings the power down from one to five sevenths. Twice the mass gives 2 to the five sevenths, 1.64 times the age: 2.59 against 1.58 billion years.',
      misconceptions: [
        {
          id: 'bigger',
          option: 2,
          say: 'A heavier white dwarf is smaller, not bigger: its radius falls as its mass rises (see The Limit).',
        },
      ],
      tool: COOL({ mass: 1, logL: -3.5, view: 1 }),
    },
    {
      sid: 'what-better-measurements-buy',
      after: 'a-bound-not-an-age',
      depth: 'advanced',
      type: 'measure',
      title: 'What better measurements buy',
      body: `Set the measurement to <strong>exact</strong>, for a 0.6 solar-mass white dwarf at &minus;3.0. The age
             is 0.79 billion years. Read the two ends of the 95 percent interval: they are what is left when the
             measurements are perfect.`,
      fields: [
        { id: 'a', label: 'Lower end', unit: 'Gyr', hint: '0.66' },
        { id: 'b', label: 'Upper end', unit: 'Gyr', hint: '0.95' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.657, 0.02) && near(v.b, 0.951, 0.02)) {
          return {
            level: 'ok',
            message:
              'From 0.66 to 0.95 billion years: still about ± 19 percent with exact inputs. That is the floor the law sets, and the panel says the age is limited by the law.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the measurement to exact, the mass to 0.6 and the luminosity to −3.0: the interval is 0.66 to 0.95 billion years.',
        };
      },
      tool: COOL({ precision: 0 }),
    },
    {
      sid: 'why-two-terms',
      after: 'what-better-measurements-buy',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why the law’s error is in the interval',
      body: `Gravitas tested the interval on 1,166 simulated white dwarfs of masses 0.7, 0.8 and 0.9 that the law was not
             fitted to, with their true ages taken from the published table and measurements as noisy as
             the panel’s: 0.03 solar masses and 0.04 in log10 of the luminosity. A 95 percent interval from the
             measurements alone held the true age 86 percent of the time. With the law’s own error added, it held it 96 percent.`,
      prompt: 'What does the difference say?',
      options: [
        'The law’s error is real: an interval that leaves it out is too narrow, and says it is surer than it is',
        'The measurements were not noisy enough',
        'The table is wrong where the law is right',
        'Intervals should always be made wider, whatever the check says',
      ],
      answer: 0,
      hints: [
        'An interval that is meant to hold the truth 95 percent of the time should do so on a test where the truth is known.',
      ],
      because:
        'An interval is a promise about how often it holds the truth, and a promise that fails on a test where the truth is known is too narrow. Leaving the law out of the interval made the interval wrong about one time in seven; putting it in brought it to the stated rate. The table is itself a model, so the term is the law’s error against it, not against the sky.',
      misconceptions: [
        {
          id: 'wider',
          option: 3,
          say: 'An interval that is wider than it needs to be is also wrong: it claims to know less than the data say. The test checks both sides.',
        },
      ],
      tool: COOL({ precision: 1 }),
    },
    {
      sid: 'why-not-a-heavy-one',
      after: 'why-two-terms',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why 1.2 solar masses is refused',
      body: `Set the mass to 1.2. The panel gives no age, though the same luminosity at 1.0 gets one. Against the
             published table, the law at 1.2 solar masses is off by about 21 percent at the median and 49 percent
             at worst across the same range of luminosity. Inside the range of 0.5 to 1.0 solar masses it is
             off by 7.5 percent at the median and at most 32 percent.`,
      prompt: 'What is the refusal for?',
      options: [
        'The law has been checked for 0.5 to 1.0 solar masses, and heavier white dwarfs crystallize at luminosities inside the range, which the law leaves out; the larger error there shows it',
        'A white dwarf of 1.2 solar masses does not exist',
        'The panel runs out of memory',
        'Heavier white dwarfs are hotter, and the law cannot do heat',
      ],
      answer: 0,
      hints: [
        'The edge of the range is where the checks stop passing, not where the star stops existing.',
      ],
      because:
        'White dwarfs of 1.2 solar masses exist, and the law could give them a number, but it has not been checked there, and where it was compared it is worse: the ions of a heavy white dwarf freeze at higher luminosities, which the law leaves out. A refusal marks the edge of what was tested.',
      misconceptions: [
        {
          id: 'exist',
          option: 1,
          say: 'They exist, up to the limit near 1.4 solar masses. The refusal is about the law, not the stars.',
        },
      ],
      tool: COOL({ mass: 1.2, logL: -3 }),
    },
  ],
};

export const FROM_STAR_TO_REMNANT = {
  id: 'from-star-to-remnant',
  thumbnail: 'images/investigations/from-star-to-remnant.webp',
  title: 'From Star to Remnant',
  subtitle:
    'Follow what a star leaves behind from the mass it was born with: a white dwarf of a mass the star largely shed, or a neutron star or a black hole, with the odds and not a verdict',
  duration: '14-28 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 23, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['the-limit', 'lives-of-stars'],
  tags: ['compact-objects', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that most of a star’s mass is shed before it becomes a white dwarf, and read the final mass from the initial mass',
    'Say that the final mass of white dwarfs scatters about the relation, and that this is real',
    'Say that the masses at which the remnant changes class are known only as ranges, so the answer near them is a probability',
    'Say why a neutron star can be heavier than the limit of a white dwarf',
  ],
  steps: [
    {
      sid: 'three-ends',
      stage: STAGE,
      type: 'read',
      title: 'Three ends',
      body: `A star that has used its fuel leaves one of three things. Lighter stars, the great majority, leave a
             <strong>white dwarf</strong>. Heavier ones explode and leave a <strong>neutron star</strong>, or, if the
             core is heavy enough, a <strong>black hole</strong>. Which one, and how heavy, depends on the mass the star
             was born with. \n\nThe panel gives both. For stars up to a few solar masses it gives the white dwarf’s
             final mass from a relation fitted to white dwarfs in star clusters, whose ages give the mass their
             progenitors began with. For all masses it gives the <strong>probability</strong> of each kind of
             remnant, from ranges in the literature for the masses at which the kind changes. It gives
             probabilities and never a single answer, because the changes are not known to better than a range.`,
      tool: OUT(),
    },
    {
      sid: 'how-heavy-the-ember',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-final-mass',
      title: 'How heavy the ember',
      body: `A star is born with 3 solar masses and ends as a white dwarf.`,
      prompt: 'The white dwarf will have a mass of about&hellip;',
      options: [
        '3 solar masses: nothing is lost',
        '1.5 solar masses: it keeps half',
        '0.75 solar masses: most of the star is shed',
        '0.1 solar masses',
      ],
      answer: 2,
      hints: [
        'A star ends by puffing off its outer layers. How much of the star is in them?',
      ],
      because:
        'About 0.75 solar masses. The star loses most of its mass in winds and in the shell it throws off at the end, and what is left is the core, a quarter of what it began with. The relation read from white dwarfs in clusters gives 0.745.',
      tool: OUT(),
    },
    {
      sid: 'read-the-final-mass',
      stage: STAGE,
      type: 'measure',
      title: 'Read the final mass',
      body: `The panel is set to a star of 3 solar masses and the relation of the MIST stellar models. Read the
             <strong>final mass</strong> and the <strong>mass lost</strong> as a percentage of the initial mass.`,
      fields: [
        { id: 'a', label: 'Final mass', unit: 'M☉', hint: '0.745' },
        { id: 'b', label: 'Mass lost', unit: 'percent', hint: '75' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.745, 0.02) && near(v.b, 75.2, 1.5)) {
          return {
            level: 'ok',
            message:
              'A final mass of 0.745 solar masses, and 75 percent of the star shed. The white dwarfs of star clusters scatter about this relation by 0.06 solar masses, and that scatter is real: stars of the same mass do not all end the same.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the initial mass at 3.0: the final mass is 0.745 solar masses and 75 percent of the star is lost.',
        };
      },
      tool: OUT(),
    },
    {
      sid: 'a-star-near-a-threshold',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A star near a threshold',
      body: `Show <strong>probabilities</strong> and set the initial mass to 8.25 solar masses. Somewhere between 7
             and 9.5 solar masses a star stops leaving a white dwarf and starts to explode, and the published
             estimates differ by that much.`,
      prompt: 'What does the panel say a star of 8.25 solar masses leaves?',
      options: [
        'A white dwarf or a neutron star, even odds: nobody can say which',
        'A white dwarf, because 8.25 is below 9',
        'A neutron star, because it is above 8',
        'A black hole',
      ],
      answer: 0,
      hints: ['The probabilities in the readout add up to one. What are they?'],
      because:
        'Even odds, 50 percent each. The change from white dwarf to neutron star is placed somewhere between 7 and 9.5 solar masses, and 8.25 is in the middle of that range, so a star of that mass is as likely to be on one side as the other. The honest answer is the odds, not a class.',
      misconceptions: [
        {
          id: 'below',
          option: 1,
          say: 'Some published estimates put the change near 9 and others near 8; a star of 8.25 is on one side of one of them and on the other side of the other.',
        },
      ],
      tool: OUT({ mi: 8.25, view: 1 }),
    },
    {
      sid: 'read-the-odds',
      stage: STAGE,
      type: 'measure',
      title: 'Read the odds',
      body: `Set the initial mass to 25 solar masses, still showing probabilities. Read the probability of a
             <strong>neutron star</strong> and of a <strong>black hole</strong>, as percentages.`,
      fields: [
        { id: 'a', label: 'Neutron star', unit: 'percent', hint: '75' },
        { id: 'b', label: 'Black hole', unit: 'percent', hint: '25' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 75, 1) && near(v.b, 25, 1)) {
          return {
            level: 'ok',
            message:
              '75 percent a neutron star and 25 percent a black hole. The change to black holes is placed between 20 and 40 solar masses, so at 25 the star is still more likely to leave a neutron star; the panel treats the range as uniform, a simplification the papers do not make for it.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the initial mass to 25 solar masses: a neutron star with probability 75 percent and a black hole with 25.',
        };
      },
      tool: OUT({ mi: 25, view: 1 }),
    },
    {
      sid: 'a-limit-for-a-white-dwarf',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A limit for a white dwarf',
      body: `Show <strong>neutron stars</strong>. The masses are the components of seven systems of two neutron
             stars, measured from their orbits. The orange line is the largest mass a white dwarf can have in the model
             of <em>The Limit</em>, 1.46 solar masses. The pulsar of the system J0453+1559 has 1.559, above it.`,
      prompt: 'Does that break the limit?',
      options: [
        'No: the limit is for a star held up by electrons, and a neutron star is held up by neutrons and the forces between them, which carry a different limit',
        'Yes: so the limit is wrong',
        'Yes: so the pulsar must be a white dwarf',
        'No: the measurement must be wrong',
      ],
      answer: 0,
      hints: ['What holds each of the two up against gravity?'],
      because:
        'A white dwarf is held up by the pressure of its electrons, and that pressure cannot hold more than about 1.4 solar masses. A neutron star is held up by neutrons, much more compressed, and by the forces between them, and its limit is higher; the best measured neutron stars are about 2 solar masses.',
      misconceptions: [
        {
          id: 'broken',
          option: 1,
          say: 'The limit in The Limit is a statement about white dwarfs. It says nothing about a star held up in another way.',
        },
      ],
      tool: OUT({ view: 2 }),
    },
    {
      sid: 'what-the-odds-say',
      stage: STAGE,
      type: 'read',
      title: 'What the odds say',
      body: `The mass a star is born with fixes what it leaves only as odds. The initial-final mass relation gives
             the white dwarf’s mass with a scatter of 0.06 solar masses that is real and not a measurement error.
             A star of about 8 solar masses may leave a white dwarf or a neutron star, and one of 20 to 40 a
             neutron star or a black hole, because the thresholds are known only as ranges; so the panel names an
             outcome only when its odds are nine in ten or better. A neutron star can be heavier than the limit of a
             white dwarf, because that limit belongs to electrons and not to neutrons.`,
      tool: OUT({ mi: 25, view: 1 }),
    },
  ],
};

/** The deeper steps: quantitative (majors) and advanced (upper-level), after the core steps they hang on. */
export const FROM_STAR_TO_REMNANT_DEEPER = {
  id: 'from-star-to-remnant',
  steps: [
    {
      sid: 'the-relation-at-two-masses',
      after: 'a-limit-for-a-white-dwarf',
      depth: 'quantitative',
      type: 'measure',
      title: 'The relation at two masses',
      body: `Show the <strong>final mass</strong> again. Read the final mass of a star born with
             <strong>1.0</strong> solar mass, then of one born with <strong>6.0</strong>.`,
      fields: [
        { id: 'a', label: 'At 1.0 M☉', unit: 'M☉', hint: '0.569' },
        { id: 'b', label: 'At 6.0 M☉', unit: 'M☉', hint: '1.113' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.569, 0.01) && near(v.b, 1.113, 0.01)) {
          return {
            level: 'ok',
            message:
              '0.57 and 1.11 solar masses. A white dwarf from a star of six solar masses is twice as heavy as one from a Sun-like star, though the star was six times heavier: the fraction shed rises from 43 to 81 percent.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the initial mass to 1.0 and then 6.0: the final masses are 0.569 and 1.113 solar masses.',
        };
      },
      tool: OUT({ mi: 1 }),
    },
    {
      sid: 'models-or-scatter',
      after: 'the-relation-at-two-masses',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Models, or scatter?',
      body: `The initial mass of a cluster white dwarf is not measured: it is worked out from the cluster’s age and
             stellar models, and two sets of models, MIST and PARSEC, give two relations. At 5 solar masses they say
             1.006 and 0.983 solar masses. The scatter of white dwarfs about either is 0.06.`,
      prompt: 'What do you conclude at this mass?',
      options: [
        'The choice of stellar models moves the answer by about 0.02, less than half the scatter: here the scatter of the white dwarfs matters more than the models',
        'The models disagree, so neither can be used',
        'MIST is right and PARSEC is wrong',
        'The scatter is the difference between the models',
      ],
      answer: 0,
      hints: [
        'Compare the difference between the two lines with the scatter, 0.06.',
      ],
      because:
        'The two relations are 0.023 solar masses apart at 5 solar masses, well inside the 0.06 by which white dwarfs of the same initial mass differ from each other. Above about 5.5 solar masses the two diverge more, and there the choice of models counts for more.',
      misconceptions: [
        {
          id: 'which',
          option: 2,
          say: 'Neither is a measurement: each is a fit to white dwarfs whose initial masses depend on the models used to get them.',
        },
      ],
      tool: OUT({ mi: 5, relation: 1 }),
    },
    {
      sid: 'ranges-not-edges',
      after: 'models-or-scatter',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Ranges, not edges',
      body: `At 30 solar masses the panel gives a black hole probability of 50 percent. It comes from a range, 20 to
             40 solar masses, in which published work puts the change to black holes, and the panel treats every
             mass in the range as equally likely.`,
      prompt: 'What is that 50 percent, and what is it not?',
      options: [
        'A way of saying the mass of the change is not known better than the range; it is not a measured chance, and the papers also find that above 20 solar masses whether a star explodes is not even a steady function of its mass',
        'The chance that a real star of 30 solar masses ends as a black hole, measured',
        'The fraction of the star that falls into the hole',
        'The precision of the mass',
      ],
      answer: 0,
      hints: [
        'The probability comes from a range of masses, not from counting stars.',
      ],
      because:
        'It is the panel’s way of saying the change is somewhere in a range of 20. Treating the range as uniform is a simplification the panel makes; the papers give the range and state that, above 20 solar masses, stars of neighbouring masses can end differently, in islands of explosion among black-hole formation, so no smooth probability is the true map.',
      misconceptions: [
        {
          id: 'measured',
          option: 1,
          say: 'No observed set of stars was counted to make it. It comes from the ranges stated in the literature.',
        },
      ],
      tool: OUT({ mi: 30, view: 1 }),
    },
    {
      sid: 'a-wide-interval',
      after: 'ranges-not-edges',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A wide interval',
      body: `At 1.0 solar mass the 95 percent interval of the final mass is 0.43 to 0.70, about 0.14 either side. At 3.0
             it is 0.20 to 1.29, about 0.54 either side, though the scatter of the data is 0.06 at both.`,
      prompt: 'Why is it so much wider at 3.0?',
      options: [
        'The paper’s uncertainties for the steep piece of the relation are large, and the panel takes the slope and intercept as independent, which overstates them because a steeper slope comes with a lower intercept',
        'Stars of 3 solar masses scatter more than stars of 1',
        'The panel adds the scatter three times',
        'There are no white dwarfs of that mass',
      ],
      answer: 0,
      hints: [
        'The width is the data’s scatter combined with the uncertainty of the fitted coefficients. Which is larger at 3.0?',
      ],
      because:
        'The scatter alone would give plus or minus 0.12 at any mass. The rest is the uncertainty of the fitted line, which on the steep piece between 2.85 and 3.6 is large (± 0.27) because its slope and intercept errors are large and are taken as independent. In the fit they run against each other, so the panel’s interval is too wide there; the paper does not give the correlation.',
      misconceptions: [
        {
          id: 'scatter',
          option: 1,
          say: 'The scatter the paper gives is the same, 0.06, for the whole relation.',
        },
      ],
      tool: OUT({ mi: 3 }),
    },
  ],
};

// ---- Spanish ------------------------------------------------------------------------------
// By position: the same steps in the same order, only the words (the ids, the answers and the
// validators stay in the English record).

export const HOW_OLD_IS_THIS_WHITE_DWARF_ES = {
  title: '¿Qué edad tiene esta enana blanca?',
  subtitle:
    'Lee cuánto tiempo lleva enfriándose una enana blanca a partir de su masa y de su luz, y mantén separada la incertidumbre de la medida del error de la ley',
  objectives: [
    'Decir por qué se enfría una enana blanca, y por qué se enfría más despacio cuanto más débil es',
    'Leer la edad de enfriamiento de una enana blanca a partir de su masa y de su luminosidad o su temperatura',
    'Decir que una edad tiene dos incertidumbres, una de las medidas y otra de la ley, y cuál de ellas pueden quitar mejores medidas',
    'Decir dónde está comprobada la ley, y por qué una enana fuera de ese intervalo recibe una cota y no una edad',
  ],
  steps: [
    {
      title: 'Una brasa que se enfría',
      body: 'Una enana blanca es lo que queda de una estrella que ha dejado de quemar combustible. No produce calor propio. Brilla con el calor que sus núcleos guardaron cuando era estrella, y lo deja salir despacio por una capa exterior delgada, así que se enfría, y cuanto más tiempo lleva enfriándose, más débil es. Eso es un reloj: si se sabe a qué ritmo se enfría una enana blanca, su brillo dice hace cuánto se formó. \n\nEl panel lo hace con una ley del tipo de la de Mestel. Dale la masa de una enana blanca y su luminosidad, y da la <strong>edad de enfriamiento</strong>: el tiempo desde que empezó a enfriarse. Aquí hay una enana blanca de 0,6 masas solares, más o menos la masa más común, con una milésima de la luminosidad del Sol. La ley es un modelo, y el panel dice dónde está comprobada.',
    },
    {
      title: 'Diez veces más débil',
      body: 'Una enana blanca de 0,6 masas solares con una milésima de la luminosidad del Sol lleva enfriándose algo menos de mil millones de años. Se sigue enfriando hasta ser diez veces más débil, con una diezmilésima.',
      prompt:
        'Comparada con su edad con una milésima, su edad con una diezmilésima será&hellip;',
      options: [
        'casi la misma: una enana blanca apenas cambia',
        'unas diez veces mayor: diez veces más débil tarda diez veces más',
        'unas cinco veces mayor: se enfría más despacio cuanto más débil es',
        'el doble',
      ],
      hints: [
        'Cuanto más caliente está un cuerpo, más deprisa pierde calor. ¿Qué le hace eso al tiempo que tarda en bajar otra vez por el mismo factor?',
      ],
      because:
        'Unas cinco veces. Una enana blanca caliente pierde su calor deprisa y una fría despacio, así que cada factor de diez en la luminosidad tarda más que el anterior: en la ley la edad crece como la luminosidad elevada a menos cinco séptimos, y diez elevado a cinco séptimos es 5,2. Llegar a una milésima tarda menos de mil millones de años y llegar a una diezmilésima, unos cuatro mil millones.',
    },
    {
      title: 'Lee dos edades',
      body: 'Pon la <strong>luminosidad</strong> en una diezmilésima de la del Sol (el log10 es &minus;4,0) y lee la edad de enfriamiento; luego vuelve a una milésima (&minus;3,0) y lee esa. Da las dos en miles de millones de años.',
      fields: [
        { label: 'Edad con una diezmilésima' },
        { label: 'Edad con una milésima' },
      ],
    },
    {
      title: 'Dos incertidumbres',
      body: 'Una edad de enfriamiento tiene dos incertidumbres. Una viene de cuán bien se conocen la masa y la luminosidad. El control <strong>Medida</strong> del panel la fija: exacta, buena (la masa a 0,02 masas solares, la luminosidad a 0,02 en log10), típica o pobre. La otra viene de la propia ley: Gravitas la comparó con una tabla publicada de enfriamiento de enanas blancas y midió cuánto se aparta. El panel está en medidas buenas; lee las dos líneas.',
      prompt: '¿Qué fija sobre todo la anchura del intervalo?',
      options: [
        'El error propio de la ley, de unos ± 19 por ciento: las medidas añaden unos ± 8 por ciento encima',
        'Las medidas, de unos ± 19 por ciento: la ley añade unos ± 8 por ciento encima',
        'Solo las medidas: una ley es exacta una vez escrita',
        'Las dos son lo mismo',
      ],
      hints: [
        'Pon la medida en exacta. El intervalo se estrecha, pero ¿se cierra?',
      ],
      because:
        'El de la ley. Con medidas buenas el intervalo es la edad más o menos un 20 por ciento, y incluso con medidas exactas es más o menos 19: es el error que la ley comete frente a la tabla publicada, y mejores medidas no pueden quitarlo. Solo una ley mejor, o las propias tablas, pueden.',
      misconceptions: [
        {
          say: 'Una ley es una simplificación de una estrella. Esta tiene un solo depósito de calor y una sola manera de perderlo; la estrella real tiene más, y la diferencia es el error que el panel declara.',
        },
        {
          say: 'Son distintas: una es sobre los números que se meten, la otra sobre la fórmula en que entran, y solo la primera se reduce con mejores medidas.',
        },
      ],
    },
    {
      title: 'Más allá del borde',
      body: 'Pon la luminosidad en &minus;4,4, más fría que la enana blanca más débil para la que la ley está comprobada. El panel no da edad.',
      prompt: '¿Por qué no da ninguna?',
      options: [
        'Por debajo de esa luminosidad otras cosas fijan el enfriamiento, como que los iones se congelen en un cristal, y la ley que las deja fuera ya no está comprobada ahí',
        'Porque una enana blanca no puede ser tan débil',
        'Porque la edad sería mayor que la edad del universo',
        'Porque el panel no puede calcular un número tan pequeño',
      ],
      hints: [
        'La ley tiene un solo depósito de calor y una sola manera de perderlo. ¿Qué le pasa a un depósito de calor cuando sus iones se congelan?',
      ],
      because:
        'La ley cuenta el calor de los iones y nada más. Al enfriarse una enana blanca sus iones se congelan en un cristal y sueltan calor latente, y con luminosidades más bajas sus vibraciones cambian cuánto calor guardan: ambas cosas cambian el enfriamiento de maneras que la ley deja fuera. El panel se niega antes que dar una edad que no ha comprobado.',
      misconceptions: [
        {
          say: 'La ley daría unos ocho mil millones de años, que es menos que la edad del universo; lo que falta es la física, no el tamaño del número.',
        },
      ],
    },
    {
      title: 'Una cota, no una edad',
      body: 'Se halla una enana blanca de 0,6 masas solares con una luminosidad de &minus;4,4, más allá del borde. El panel en el borde, &minus;4,0, da una edad de 4,1 miles de millones de años, con un intervalo de 3,4 a 4,9. Una enana blanca solo se vuelve más débil con el tiempo.',
      prompt: '¿Qué puedes decir de la edad de la de −4,4?',
      options: [
        'Al menos unos 3,4 miles de millones de años: lleva enfriándose más tiempo del que cuesta llegar al borde, y la edad del borde no puede ser menor que 3,4',
        '7,9 miles de millones de años: extiende un poco la ley',
        'Menos de 4,1 miles de millones de años',
        'Nada en absoluto',
      ],
      hints: [
        'Una enana blanca más fría lleva enfriándose más tiempo que una más caliente de la misma masa. ¿Cuál es lo mínimo que puede valer la edad de la más caliente?',
      ],
      because:
        'Tiene al menos unos 3,4 miles de millones de años (el extremo inferior del intervalo en el borde). Es una cota, no una edad, y es una que la ley puede dar donde no puede dar la edad. También dice algo de la población de la estrella: la progenitora de la enana blanca vivió antes que ella, así que la población es aún más antigua.',
      misconceptions: [
        {
          say: 'Extender la ley más allá del borde da un número, pero la física que toma el relevo allí, la cristalización entre ella, es lo que la ley deja fuera.',
        },
      ],
    },
    {
      title: 'Lo que dice la edad',
      body: `La edad de enfriamiento de una enana blanca sale de su masa y de su luz con una ley comprobada de 0,5 a 1,0 masas solares y de una diezmilésima a un treintavo de la luminosidad del Sol. La edad lleva dos incertidumbres, la de las medidas y la de la propia ley; con medidas exactas queda solo la segunda, cerca del 19 por ciento. Más allá del borde el panel da una cota y no una edad, y la ley es un modelo comprobado con secuencias de modelos publicadas: esta investigación no incluye ninguna tabla de enanas blancas observadas.`,
    },
  ],
};

export const HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER_ES = {
  steps: [
    {
      title: 'A partir de una temperatura',
      body: 'Un espectro da la temperatura de una enana blanca más directamente que su luminosidad. Pon <strong>Dar</strong> en temperatura, la temperatura en 6000 K, la masa en 0,6 y la medida en buena. El panel convierte la temperatura en luminosidad con el radio de la enana blanca. Lee la <strong>edad</strong>, la parte de la incertidumbre que viene de las medidas y la que viene de la ley, como porcentajes.',
      fields: [
        { label: 'Edad de enfriamiento' },
        { label: 'De las medidas' },
        { label: 'De la ley' },
      ],
    },
    {
      title: 'Más pesada, y más vieja',
      body: 'Muestra <strong>por masa</strong>, la edad frente a la masa, con una luminosidad de &minus;3,5. Una enana blanca de 0,5 masas solares con esa luminosidad tiene 1,6 miles de millones de años; una de 1,0 masas solares, 2,6.',
      prompt:
        '¿Por qué es más vieja la enana más pesada con la misma luminosidad?',
      options: [
        'Tiene más iones, así que más calor, y con la misma luminosidad tarda más en soltarlo: la edad crece como la masa elevada a cinco séptimos, 1,64 veces para el doble de masa',
        'Se formó antes',
        'Es más grande, así que se enfría más despacio',
        'No es más vieja: el panel se equivoca',
      ],
      hints: [
        'El calor es el de los iones. El doble de masa tiene el doble de iones. ¿Qué le hace eso al tiempo que tarda en perderlo a un ritmo dado?',
      ],
      because:
        'La edad es el depósito de calor dividido por el ritmo al que se pierde, y el depósito crece con la masa mientras que, con una luminosidad dada, el ritmo es fijo; el resto de la ley (la temperatura interior depende de la masa) baja la potencia de uno a cinco séptimos. El doble de masa da 2 elevado a cinco séptimos, 1,64 veces la edad: 2,59 frente a 1,58 miles de millones de años.',
      misconceptions: [
        {
          say: 'Una enana blanca más pesada es más pequeña, no más grande: su radio baja al subir su masa (mira El límite).',
        },
      ],
    },
    {
      title: 'Lo que compran mejores medidas',
      body: 'Pon la medida en <strong>exacta</strong>, para una enana blanca de 0,6 masas solares en &minus;3,0. La edad es 0,79 miles de millones de años. Lee los dos extremos del intervalo del 95 por ciento: es lo que queda cuando las medidas son perfectas.',
      fields: [{ label: 'Extremo inferior' }, { label: 'Extremo superior' }],
    },
    {
      title: 'Por qué el error de la ley está en el intervalo',
      body: 'Gravitas probó el intervalo con 1166 enanas blancas simuladas de masas 0,7, 0,8 y 0,9 a las que no se ajustó la ley, con sus edades verdaderas tomadas de la tabla publicada y medidas tan ruidosas como las del panel: 0,03 masas solares y 0,04 en log10 de la luminosidad. Un intervalo del 95 por ciento hecho solo con las medidas contenía la edad verdadera el 86 por ciento de las veces. Con el error propio de la ley añadido, la contenía el 96 por ciento.',
      prompt: '¿Qué dice la diferencia?',
      options: [
        'El error de la ley es real: un intervalo que lo deja fuera es demasiado estrecho, y dice estar más seguro de lo que está',
        'Las medidas no eran lo bastante ruidosas',
        'La tabla se equivoca donde la ley acierta',
        'Los intervalos deben ser siempre más anchos, diga lo que diga la prueba',
      ],
      hints: [
        'Un intervalo que debe contener la verdad el 95 por ciento de las veces debería hacerlo en una prueba donde se conoce la verdad.',
      ],
      because:
        'Un intervalo es una promesa sobre cuántas veces contiene la verdad, y una promesa que falla en una prueba donde se conoce la verdad es demasiado estrecha. Dejar fuera la ley hizo que el intervalo se equivocara una vez de cada siete; ponerla lo llevó al ritmo declarado. La tabla es en sí un modelo, así que el término es el error de la ley frente a ella, no frente al cielo.',
      misconceptions: [
        {
          say: 'Un intervalo más ancho de lo necesario también es incorrecto: afirma saber menos de lo que dicen los datos. La prueba comprueba los dos lados.',
        },
      ],
    },
    {
      title: 'Por qué se rechazan 1,2 masas solares',
      body: 'Pon la masa en 1,2. El panel no da edad, aunque con la misma luminosidad a 1,0 sí la da. Frente a la tabla publicada, la ley con 1,2 masas solares se equivoca en un 21 por ciento en la mediana y en un 49 por ciento en el peor caso, en el mismo intervalo de luminosidad. Dentro del intervalo de 0,5 a 1,0 masas solares se equivoca en un 7,5 por ciento en la mediana y como mucho en un 32 por ciento.',
      prompt: '¿Para qué sirve el rechazo?',
      options: [
        'La ley está comprobada de 0,5 a 1,0 masas solares, y las enanas blancas más pesadas se cristalizan con luminosidades dentro del intervalo, algo que la ley deja fuera; el mayor error allí lo muestra',
        'Una enana blanca de 1,2 masas solares no existe',
        'Al panel se le acaba la memoria',
        'Las enanas blancas más pesadas son más calientes, y la ley no sabe de calor',
      ],
      hints: [
        'El borde del intervalo es donde las comprobaciones dejan de pasar, no donde la estrella deja de existir.',
      ],
      because:
        'Las enanas blancas de 1,2 masas solares existen, y la ley podría darles un número, pero no está comprobada allí, y donde se comparó es peor: los iones de una enana blanca pesada se congelan con luminosidades mayores, algo que la ley deja fuera. Un rechazo marca el borde de lo que se probó.',
      misconceptions: [
        {
          say: 'Existen, hasta el límite cercano a 1,4 masas solares. El rechazo es sobre la ley, no sobre las estrellas.',
        },
      ],
    },
  ],
};

export const FROM_STAR_TO_REMNANT_ES = {
  title: 'De estrella a remanente',
  subtitle:
    'Sigue lo que deja una estrella a partir de la masa con que nació: una enana blanca de una masa que la estrella perdió en gran parte, o una estrella de neutrones o un agujero negro, con las probabilidades y no un veredicto',
  objectives: [
    'Decir que la mayor parte de la masa de una estrella se pierde antes de ser enana blanca, y leer la masa final a partir de la masa inicial',
    'Decir que la masa final de las enanas blancas se dispersa en torno a la relación, y que eso es real',
    'Decir que las masas en que cambia la clase de remanente solo se conocen como intervalos, así que la respuesta cerca de ellas es una probabilidad',
    'Decir por qué una estrella de neutrones puede ser más pesada que el límite de una enana blanca',
  ],
  steps: [
    {
      title: 'Tres finales',
      body: 'Una estrella que ha gastado su combustible deja una de tres cosas. Las estrellas más ligeras, la gran mayoría, dejan una <strong>enana blanca</strong>. Las más pesadas explotan y dejan una <strong>estrella de neutrones</strong> o, si el núcleo es lo bastante pesado, un <strong>agujero negro</strong>. Cuál, y cuán pesada, depende de la masa con que nació la estrella. \n\nEl panel da ambas cosas. Para estrellas de hasta unas pocas masas solares da la masa final de la enana blanca a partir de una relación ajustada a enanas blancas de cúmulos estelares, cuyas edades dan la masa con que empezaron sus progenitoras. Para todas las masas da la <strong>probabilidad</strong> de cada clase de remanente, a partir de intervalos de la literatura para las masas en que la clase cambia. Da probabilidades y nunca una respuesta única, porque los cambios no se conocen mejor que un intervalo.',
    },
    {
      title: 'Cuán pesada la brasa',
      body: 'Una estrella nace con 3 masas solares y acaba como enana blanca.',
      prompt: 'La enana blanca tendrá una masa de unas&hellip;',
      options: [
        '3 masas solares: no se pierde nada',
        '1,5 masas solares: conserva la mitad',
        '0,75 masas solares: se pierde la mayor parte de la estrella',
        '0,1 masas solares',
      ],
      hints: [
        'Una estrella acaba soltando sus capas exteriores. ¿Cuánto de la estrella hay en ellas?',
      ],
      because:
        'Unas 0,75 masas solares. La estrella pierde la mayor parte de su masa en vientos y en la envoltura que expulsa al final, y lo que queda es el núcleo, una cuarta parte de lo que tenía al empezar. La relación leída de enanas blancas de cúmulos da 0,745.',
    },
    {
      title: 'Lee la masa final',
      body: 'El panel está puesto en una estrella de 3 masas solares y la relación de los modelos estelares MIST. Lee la <strong>masa final</strong> y la <strong>masa perdida</strong> como porcentaje de la masa inicial.',
      fields: [{ label: 'Masa final' }, { label: 'Masa perdida' }],
    },
    {
      title: 'Una estrella cerca de un umbral',
      body: 'Muestra las <strong>probabilidades</strong> y pon la masa inicial en 8,25 masas solares. En algún punto entre 7 y 9,5 masas solares una estrella deja de dejar una enana blanca y empieza a explotar, y las estimaciones publicadas difieren en tanto.',
      prompt: '¿Qué dice el panel que deja una estrella de 8,25 masas solares?',
      options: [
        'Una enana blanca o una estrella de neutrones, con las mismas probabilidades: nadie puede decir cuál',
        'Una enana blanca, porque 8,25 es menos de 9',
        'Una estrella de neutrones, porque es más de 8',
        'Un agujero negro',
      ],
      hints: ['Las probabilidades de la lectura suman uno. ¿Cuáles son?'],
      because:
        'Las mismas, 50 por ciento cada una. El cambio de enana blanca a estrella de neutrones se sitúa en algún punto entre 7 y 9,5 masas solares, y 8,25 está en la mitad de ese intervalo, así que una estrella de esa masa es tan probable a un lado como al otro. La respuesta honrada son las probabilidades, no una clase.',
      misconceptions: [
        {
          say: 'Algunas estimaciones publicadas sitúan el cambio cerca de 9 y otras cerca de 8; una estrella de 8,25 está a un lado de una de ellas y al otro lado de la otra.',
        },
      ],
    },
    {
      title: 'Lee las probabilidades',
      body: 'Pon la masa inicial en 25 masas solares, mostrando todavía las probabilidades. Lee la probabilidad de una <strong>estrella de neutrones</strong> y de un <strong>agujero negro</strong>, como porcentajes.',
      fields: [{ label: 'Estrella de neutrones' }, { label: 'Agujero negro' }],
    },
    {
      title: 'Un límite para una enana blanca',
      body: 'Muestra las <strong>estrellas de neutrones</strong>. Las masas son las de los componentes de siete sistemas de dos estrellas de neutrones, medidas a partir de sus órbitas. La línea naranja es la mayor masa que puede tener una enana blanca en el modelo de <em>El límite</em>, 1,46 masas solares. El púlsar del sistema J0453+1559 tiene 1,559, por encima.',
      prompt: '¿Rompe eso el límite?',
      options: [
        'No: el límite es para una estrella sostenida por electrones, y una estrella de neutrones la sostienen los neutrones y las fuerzas entre ellos, que tienen otro límite',
        'Sí: así que el límite está mal',
        'Sí: así que el púlsar debe ser una enana blanca',
        'No: la medida debe estar mal',
      ],
      hints: ['¿Qué sostiene a cada una de las dos frente a la gravedad?'],
      because:
        'A una enana blanca la sostiene la presión de sus electrones, y esa presión no puede sostener más de unas 1,4 masas solares. A una estrella de neutrones la sostienen los neutrones, mucho más comprimidos, y las fuerzas entre ellos, y su límite es mayor; las estrellas de neutrones mejor medidas tienen unas 2 masas solares.',
      misconceptions: [
        {
          say: 'El límite de El límite es una afirmación sobre las enanas blancas. No dice nada de una estrella sostenida de otra manera.',
        },
      ],
    },
    {
      title: 'Lo que dicen las probabilidades',
      body: `La masa con que nace una estrella solo fija lo que deja como probabilidades. La relación entre masa inicial y masa final da la masa de la enana blanca con una dispersión de 0,06 masas solares que es real y no un error de medida. Una estrella de unas 8 masas solares puede dejar una enana blanca o una estrella de neutrones, y una de 20 a 40 una estrella de neutrones o un agujero negro, porque los umbrales solo se conocen como rangos; por eso el panel nombra un desenlace solo cuando sus probabilidades son de nueve de cada diez o más. Una estrella de neutrones puede ser más pesada que el límite de una enana blanca, porque ese límite es de los electrones y no de los neutrones.`,
    },
  ],
};

export const FROM_STAR_TO_REMNANT_DEEPER_ES = {
  steps: [
    {
      title: 'La relación en dos masas',
      body: 'Muestra otra vez la <strong>masa final</strong>. Lee la masa final de una estrella nacida con <strong>1,0</strong> masa solar, y luego de una nacida con <strong>6,0</strong>.',
      fields: [{ label: 'Con 1,0 M☉' }, { label: 'Con 6,0 M☉' }],
    },
    {
      title: '¿Modelos o dispersión?',
      body: 'La masa inicial de una enana blanca de cúmulo no se mide: se deduce de la edad del cúmulo y de modelos estelares, y dos conjuntos de modelos, MIST y PARSEC, dan dos relaciones. Con 5 masas solares dicen 1,006 y 0,983 masas solares. La dispersión de las enanas blancas en torno a cualquiera de ellas es 0,06.',
      prompt: '¿Qué concluyes con esta masa?',
      options: [
        'La elección de modelos estelares mueve la respuesta unas 0,02, menos de la mitad de la dispersión: aquí importa más la dispersión de las enanas blancas que los modelos',
        'Los modelos discrepan, así que ninguno puede usarse',
        'MIST acierta y PARSEC se equivoca',
        'La dispersión es la diferencia entre los modelos',
      ],
      hints: [
        'Compara la diferencia entre las dos líneas con la dispersión, 0,06.',
      ],
      because:
        'Las dos relaciones están a 0,023 masas solares con 5 masas solares, bien dentro de las 0,06 en que difieren entre sí enanas blancas de la misma masa inicial. Por encima de unas 5,5 masas solares las dos se separan más, y allí la elección de modelos cuenta más.',
      misconceptions: [
        {
          say: 'Ninguna es una medida: cada una es un ajuste a enanas blancas cuyas masas iniciales dependen de los modelos usados para obtenerlas.',
        },
      ],
    },
    {
      title: 'Intervalos, no bordes',
      body: 'Con 30 masas solares el panel da una probabilidad de agujero negro del 50 por ciento. Sale de un intervalo, de 20 a 40 masas solares, en el que el trabajo publicado sitúa el cambio a agujeros negros, y el panel trata cada masa del intervalo como igual de probable.',
      prompt: '¿Qué es ese 50 por ciento, y qué no es?',
      options: [
        'Una manera de decir que la masa del cambio no se conoce mejor que el intervalo; no es una probabilidad medida, y los artículos hallan además que por encima de 20 masas solares que una estrella explote ni siquiera es una función regular de su masa',
        'La probabilidad, medida, de que una estrella real de 30 masas solares acabe como agujero negro',
        'La fracción de la estrella que cae en el agujero',
        'La precisión de la masa',
      ],
      hints: [
        'La probabilidad sale de un intervalo de masas, no de contar estrellas.',
      ],
      because:
        'Es la manera que tiene el panel de decir que el cambio está en algún punto de un intervalo de 20. Tratar el intervalo como uniforme es una simplificación del panel; los artículos dan el intervalo y afirman que, por encima de 20 masas solares, estrellas de masas vecinas pueden acabar de otra manera, en islas de explosión entre la formación de agujeros negros, así que ninguna probabilidad suave es el mapa verdadero.',
      misconceptions: [
        {
          say: 'No se contó ningún conjunto observado de estrellas para obtenerlo. Sale de los intervalos que da la literatura.',
        },
      ],
    },
    {
      title: 'Un intervalo ancho',
      body: 'Con 1,0 masa solar el intervalo del 95 por ciento de la masa final es de 0,43 a 0,70, unas 0,14 a cada lado. Con 3,0 es de 0,20 a 1,29, unas 0,54 a cada lado, aunque la dispersión de los datos es 0,06 en ambas.',
      prompt: '¿Por qué es tanto más ancho con 3,0?',
      options: [
        'Las incertidumbres del artículo para el trozo empinado de la relación son grandes, y el panel toma la pendiente y la ordenada como independientes, lo que las exagera porque una pendiente mayor viene con una ordenada menor',
        'Las estrellas de 3 masas solares se dispersan más que las de 1',
        'El panel suma la dispersión tres veces',
        'No hay enanas blancas de esa masa',
      ],
      hints: [
        'La anchura es la dispersión de los datos combinada con la incertidumbre de los coeficientes ajustados. ¿Cuál es mayor con 3,0?',
      ],
      because:
        'La dispersión sola daría más o menos 0,12 con cualquier masa. El resto es la incertidumbre de la recta ajustada, que en el trozo empinado entre 2,85 y 3,6 es grande (± 0,27) porque los errores de su pendiente y su ordenada son grandes y se toman como independientes. En el ajuste van en sentidos opuestos, así que el intervalo del panel es demasiado ancho allí; el artículo no da la correlación.',
      misconceptions: [
        {
          say: 'La dispersión que da el artículo es la misma, 0,06, para toda la relación.',
        },
      ],
    },
  ],
};

// ---- instructor content ------------------------------------------------------------------

const CONTENT = {
  'how-old-is-this-white-dwarf': {
    topic:
      'How a white dwarf’s age is read from how far it has cooled: a white dwarf has no fuel and cools by letting out the heat of its ions, so the cooling age grows as the mass to the five sevenths and the luminosity to the minus five sevenths (0.79 Gyr for 0.6 solar masses at a thousandth of the Sun’s luminosity, 4.09 at a ten-thousandth); the age has two uncertainties, one from the measurements and the law’s own error against a published cooling table (about ± 19 percent), and the law is refused outside the range where it is checked',
    difficulty:
      'Introductory (a white dwarf cools, more slowly as it gets fainter; two ages read from the panel; the two uncertainties; why there is no age below the edge, and a bound there); majors (the age from a temperature with its two terms, why a heavier dwarf is older at the same luminosity); upper-level (what perfect measurements still leave, the coverage test that put the law’s error into the interval, and why 1.2 solar masses is refused)',
    placement:
      'In a stellar-evolution unit after The Limit (the mass-radius relation and the limit of a white dwarf) and Lives of Stars, and before or beside From Star to Remnant; in a unit on stellar populations it pairs with the investigation on the turnoff as a clock, because a white dwarf’s cooling age is a second clock, and the age of a population is at least the cooling age of its oldest white dwarf.',
    overview:
      'Students predict how much older a white dwarf is when it is ten times fainter, read two ages from the panel (4.09 and 0.79 billion years, a ratio of 5.2 and not 10), see that an age has a part from the measurements and a part from the law, find why the panel refuses a dwarf cooler than the edge of the checked range and say what bound it can still give, and, at the deeper depths, read an age from a temperature, compare two masses, and meet the test that showed an interval without the law’s error to be too narrow.',
    priorKnowledge: [
      'That a white dwarf is the remnant of a star that has stopped burning fuel (Lives of Stars, The Limit)',
      'Luminosity as the light a star gives out per second, and a power law such as age proportional to luminosity to a power',
      'What an uncertainty is, and that an interval states how often it should hold the truth',
    ],
    keyConcepts: [
      {
        heading: 'A white dwarf is a clock that slows',
        body: 'It makes no heat and lets out what it stored, at a rate that falls as it cools. Each factor of ten in luminosity takes longer than the one before: 0.79 Gyr to a thousandth, 4.09 to a ten-thousandth.',
      },
      {
        heading: 'An age has two uncertainties',
        body: 'One is the propagation of the errors of the mass and the luminosity; better measurements shrink it. The other is the law’s own error against the published sequences, about ± 19 percent at the 95 percent level, and no measurement removes it. The panel says which is limiting.',
      },
      {
        heading: 'A refusal marks the edge of what was tested',
        body: 'The law is checked from 0.5 to 1.0 solar masses and for log10 L/L☉ from −4.0 to −1.5; outside it other physics, crystallization above all, changes the cooling and the panel gives no age. Below the edge a bound can still be given, because a cooler white dwarf has been cooling for longer.',
      },
    ],
    features: [
      {
        name: 'The cooling panel (remnant-cooling)',
        text: 'A mass and a luminosity or a temperature, with a measurement quality from exact to poor; the age with its two terms and the interval, the law drawn against luminosity or against mass with the law’s own error and the edges of the checked range, and the reason when there is no age. The temperature route uses the cold white-dwarf radius of The Limit.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the age from a temperature, why a heavier dwarf is older. Advanced: what exact measurements still leave, the coverage test that put the law’s error in, and why a heavy dwarf is refused.',
      },
      {
        name: 'A model, checked against a table',
        text: 'The law’s coefficient comes from the published cooling sequences of the Montreal group (Bédard et al. 2020) at 0.6 solar masses, and its error is measured on the other masses. No observed white dwarf is shown: the compilations that exist are under non-commercial terms, and the investigation says so.',
      },
    ],
    misconceptions: [
      {
        claim: 'A white dwarf cools at a steady rate.',
        response:
          'It cools fast when hot and slowly when cool: the age grows as luminosity to the minus five sevenths, so each factor of ten takes about five times longer than a factor of ten in age would.',
      },
      {
        claim: 'A better measurement always gives a better age.',
        response:
          'Only down to the law’s own error. With exact inputs the interval is still about ± 19 percent, and the panel says the age is limited by the law.',
      },
      {
        claim: 'The cooling age is the age of the star.',
        response:
          'It is the time since the white dwarf began to cool. The star lived before that, as a progenitor, so the age of the population it belongs to is the cooling age plus the progenitor’s lifetime, and at least the cooling age.',
      },
      {
        claim: 'If the panel refuses, nothing can be said.',
        response:
          'A bound can: a white dwarf cooler than the edge has been cooling at least as long as the edge’s age, about 3.4 Gyr for 0.6 solar masses at the lower end of its interval.',
      },
    ],
    teachingNotes: [
      'The law is t = tau (M/Msun)^(5/7) (L/Lsun)^(−5/7) with tau = 8.19 million years for a carbon-oxygen core, fitted to the 0.6 solar-mass sequence of Bédard et al. (2020) over log L from −4.0 to −1.5 and checked on 0.5, 0.7, 0.8, 0.9 and 1.0: the median error is 7.5 percent and the largest 32, and the 95th percentile of the error over 0.5, 0.6 and 1.0, 0.185 in ln t, is the law’s own term (REMNANTS.md).',
      'The interval was tested on 1,166 simulated white dwarfs at 0.7, 0.8 and 0.9 solar masses, which neither the coefficient nor the law’s own term used, with measurement noise of 0.03 solar masses and 0.04 in log L: 96.5 percent with both terms and 85.6 percent with the measurements alone. Two legs of the committed contract fail and are recorded, neither about the cooling law: the PARSEC relation’s printed coefficients are discontinuous by 0.004 solar masses at 2.80, and a neutron-star leg premised a wrong limit (REMNANTS.md).',
      'The temperature route uses the cold degenerate radius of The Limit, about 3 percent larger than the best published radii at 0.6 solar masses; against the table it recovers the luminosity within 3 percent at the median and 17 at worst. The model term was measured with the luminosity taken from the table, so this radius approximation (about 2 percent in the age at the median and 12 at worst) is not in it, and the panel says the radius is the cold one.',
      'No observed white dwarfs are shown (the open compilations are non-commercial). The investigation does not claim a real white dwarf’s age; the oldest white dwarfs of the disk are a bound, not a measurement here, and the progenitor’s lifetime adds to the cooling age.',
    ],
    discussion: [
      'A white dwarf’s cooling age is a lower limit on the age of its population. What would you add to turn it into the age of the population, and which of the two terms would you expect to be the larger for a star that began as three solar masses?',
      'The law’s error does not shrink with better measurements. What would you need to change to shrink it?',
      'The panel refuses a 1.2 solar-mass white dwarf. Is a refusal a failure of the panel or a statement it makes? What did the comparison have to show for it to be the second?',
    ],
    extensions: [
      'Set the measurement to exact, poor and back, at three luminosities, and say where the measurements’ share is larger than the law’s.',
      'Find the luminosity at which a 0.5 and a 1.0 solar-mass white dwarf differ in age by a factor of 1.64, and say whether it depends on the luminosity.',
    ],
    modelNotes:
      'js/kernels/remnants/cooling.js (the law, its two terms and the refusals), js/remnantsField.js, js/remnantsWidgets.js, REMNANTS.md (the validation contract, the pinned Montreal-sequence rows and the failing legs). The oracle is tools/remnants-oracle/oracle.py.',
  },
  'from-star-to-remnant': {
    topic:
      'What a star leaves behind, as a function of the mass it was born with: the white dwarf’s final mass from the Cummings et al. (2018) relation fitted to cluster white dwarfs (0.745 solar masses from 3, 0.569 from 1.0, 1.113 from 6.0, with a scatter of 0.06), and the class of remnant as probabilities from cited threshold ranges (white dwarf to neutron star between 7 and 9.5 solar masses, neutron star to black hole between 20 and 40), never as a step',
    difficulty:
      'Introductory (most of a star is shed; the final mass read from the initial mass; the odds near a threshold; why a neutron star can be heavier than the white-dwarf limit); majors (the relation at two masses, the choice of stellar models against the scatter); upper-level (what the 50 percent at 30 solar masses is and is not, and why the interval is so wide on the steep piece)',
    placement:
      'In a stellar-evolution unit after Lives of Stars and The Limit, and beside How Old Is This White Dwarf?; in a course on stellar populations it leads into the turnoff as a clock and the supernova rate.',
    overview:
      'Students predict a white dwarf’s mass from its star’s (0.75 solar masses from 3), read the final mass and the share of the star lost, find that a star of 8.25 solar masses is as likely a white dwarf as a neutron star and read the odds at 25 (75 percent a neutron star, 25 a black hole), see that a neutron star can be heavier than the white-dwarf limit because it is held up differently, and, deeper, read the relation at 1.0 and 6.0, compare two sets of stellar models with the scatter, and say what the probabilities are and are not.',
    priorKnowledge: [
      'That a star ends as a white dwarf, a neutron star or a black hole (Lives of Stars)',
      'The white-dwarf limit of about 1.4 solar masses and what holds a white dwarf up (The Limit)',
      'A piecewise-linear relation, and a scatter as the spread of data about a line',
    ],
    keyConcepts: [
      {
        heading: 'Most of a star is shed',
        body: 'A star of 1 solar mass leaves 0.57; one of 6 leaves 1.11. The fraction lost rises from 43 to 81 percent: heavier stars leave heavier white dwarfs, but by much less than their mass.',
      },
      {
        heading: 'A relation with a real scatter',
        body: 'White dwarfs of the same initial mass differ by about 0.06 solar masses. That is not measurement error; it is how stars of the same mass end differently. The two sets of stellar models used to find the initial masses give relations that differ by less than the scatter below about 5.5 solar masses.',
      },
      {
        heading: 'Thresholds are ranges, and the answer is a probability',
        body: 'Where a star starts to explode, and where it starts to leave a black hole, are known as ranges (7 to 9.5 and 20 to 40 solar masses). Near them the honest answer is the odds. The panel treats each range as uniform, which is its choice; above 20 solar masses the papers find no steady map from mass to outcome at all.',
      },
    ],
    features: [
      {
        name: 'The outcome panel (remnant-outcome)',
        text: 'An initial mass and a choice of stellar models; the final mass with the scatter, the mass lost and the 95 percent interval; the probabilities of a white dwarf, a neutron star and a black hole with a verdict that is decisive only at 90 percent; the cited neutron-star masses against the population mean and the white-dwarf limit.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the relation at two masses, models against scatter. Advanced: what the probabilities are, and why the interval is wide on the steep piece.',
      },
      {
        name: 'Cited, and said to be',
        text: 'The relations are equations 4 to 6 (MIST) and 1 to 3 (PARSEC) of Cummings et al. (2018); the ranges are from Smartt (2009), Heger et al. (2003) and Sukhbold et al. (2016); the neutron-star masses are from Özel and Freire (2016). Each was read in its paper for this investigation.',
      },
    ],
    misconceptions: [
      {
        claim: 'A star’s remnant is set by its mass at a sharp cut-off.',
        response:
          'The cut-offs are known only within ranges, and above about 20 solar masses whether a star explodes is not a steady function of its mass. The panel gives probabilities for that reason.',
      },
      {
        claim: 'A white dwarf keeps about half of its star.',
        response:
          'A star of 3 solar masses leaves 0.75 and one of 6 leaves 1.1: three quarters or more is shed, and the fraction shed rises with the mass.',
      },
      {
        claim:
          'A neutron star more massive than 1.4 solar masses breaks the Chandrasekhar limit.',
        response:
          'The limit is for a star held up by electrons. A neutron star is held up by neutrons and the forces between them, and the best measured are about 2 solar masses.',
      },
      {
        claim: 'The 50 percent at 30 solar masses is a measured frequency.',
        response:
          'It is the panel’s way of showing a threshold known only within a range of 20 solar masses; no counted sample produced it.',
      },
    ],
    teachingNotes: [
      'The MIST-based relation is Mf = 0.080 Mi + 0.489 (0.83 to 2.85), 0.187 Mi + 0.184 (2.85 to 3.60) and 0.107 Mi + 0.471 (3.60 to 7.20), with scatter 0.06; the panel refuses outside 0.83 to 7.5 solar masses and flags above 7.2. The PARSEC-based relation’s printed pieces meet at 2.80 with a gap of 0.004 solar masses; the panel states the coefficients as printed (REMNANTS.md, leg A6 fails and is recorded).',
      'Against the 78 cluster white dwarfs of Table 1 of the paper (two excluded outliers) the relation’s scatter is 0.061 and 98.7 percent lie inside the panel’s 95 percent interval; the relation was fitted to those white dwarfs, so this is an applicability check, not an independent validation.',
      'The interval’s coefficient part takes the slope and intercept uncertainties as independent, which overstates it where the paper’s uncertainties are large (± 0.27 at 3 solar masses); the paper gives no correlation. The scatter alone is ± 0.12 at 95 percent.',
      'The threshold ranges were read in the papers: Smartt (2009) 8 ± 1 and 8.5 +1 −1.5; Heger et al. (2003) about 9, and fallback black holes from 20 or 25 to a direct-collapse limit near 40; Sukhbold et al. (2016) islands of explodability. The uniform shape is the kernel’s choice. Neutron-star masses: seven systems’ 14 components of Özel and Freire (2016) Table 1.',
    ],
    discussion: [
      'A star of 8.25 solar masses may leave a white dwarf or a neutron star. What observations would narrow the range, and what could they not?',
      'The white dwarfs of a cluster scatter about the relation by 0.06 solar masses. Name two reasons stars of the same initial mass might end differently.',
      'Why do the two sets of stellar models differ more above 5.5 solar masses than below?',
    ],
    extensions: [
      'Use the panel to find the initial mass whose white dwarf has the mass of a typical white dwarf, 0.6, and say how its uncertainty compares with the range of initial masses that give it.',
      'Show the probabilities and say at which initial masses the verdict is decisive, and why there are two gaps.',
    ],
    modelNotes:
      'js/kernels/remnants/ifmr.js and outcomes.js, js/kernels/remnants/constants.js (the cited tables, each read in its paper), js/remnantsField.js, js/remnantsWidgets.js, REMNANTS.md. The oracle is tools/remnants-oracle/oracle.py (numpy and scipy).',
  },
};

const FLOW = {
  'how-old-is-this-white-dwarf': [
    {
      from: 'an-ember-cooling',
      to: 'ten-times-fainter',
      text: 'A white dwarf as a cooling ember, and the prediction of how much older it is when ten times fainter.',
    },
    {
      from: 'read-two-ages',
      to: 'two-uncertainties',
      text: 'The two ages read from the panel, then the two uncertainties of an age: the measurements’ and the law’s.',
    },
    {
      from: 'beyond-the-edge',
      to: 'beyond-the-edge',
      text: 'The edge of the range where the law is checked, and why the panel gives no age beyond it.',
    },
    {
      from: 'a-bound-not-an-age',
      to: 'a-bound-not-an-age',
      text: 'What can still be said below the edge: a lower bound on the age.',
    },
    {
      from: 'what-the-age-says',
      to: 'what-the-age-says',
      text: 'The summary: an age from a mass and a luminosity, its two uncertainties, and the edge of the law.',
    },
  ],
  'from-star-to-remnant': [
    {
      from: 'three-ends',
      to: 'how-heavy-the-ember',
      text: 'The three kinds of remnant, and the prediction of a white dwarf’s mass from its star’s.',
    },
    {
      from: 'read-the-final-mass',
      to: 'a-star-near-a-threshold',
      text: 'The final mass and the share of the star shed, then a star near a threshold, where the answer is the odds.',
    },
    {
      from: 'read-the-odds',
      to: 'read-the-odds',
      text: 'The odds of a neutron star and of a black hole at 25 solar masses.',
    },
    {
      from: 'a-limit-for-a-white-dwarf',
      to: 'a-limit-for-a-white-dwarf',
      text: 'Why a neutron star can be heavier than the limit of a white dwarf.',
    },
    {
      from: 'what-the-odds-say',
      to: 'what-the-odds-say',
      text: 'The summary: a final mass with its scatter, the thresholds as ranges, and an outcome named only at nine in ten.',
    },
  ],
};

const EXPECTATIONS = {
  'how-old-is-this-white-dwarf': {
    'read-two-ages':
      'The cooling age of a 0.6 solar-mass white dwarf about 4.09 billion years at a luminosity of −4.0 (within 0.1) and about 0.79 at −3.0 (within 0.04).',
  },
  'from-star-to-remnant': {
    'read-the-final-mass':
      'For a star of 3 solar masses on the MIST relation, a final mass of 0.745 solar masses (within 0.02) and 75 percent of the star lost (within 1.5).',
    'read-the-odds':
      'At 25 solar masses, a neutron star with probability 75 percent (within 1) and a black hole 25 percent (within 1).',
  },
};

const BANDS = {
  'how-old-is-this-white-dwarf': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
  },
  'from-star-to-remnant': {
    core: 'medium',
    quantitative: 'medium',
    advanced: 'long',
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
  'how-old-is-this-white-dwarf': HOW_OLD_IS_THIS_WHITE_DWARF_ES,
  'from-star-to-remnant': FROM_STAR_TO_REMNANT_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'how-old-is-this-white-dwarf': HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER,
  'from-star-to-remnant': FROM_STAR_TO_REMNANT_DEEPER,
};
export const DEPTH_ES = {
  'how-old-is-this-white-dwarf': HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER_ES,
  'from-star-to-remnant': FROM_STAR_TO_REMNANT_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [HOW_OLD_IS_THIS_WHITE_DWARF, FROM_STAR_TO_REMNANT];
