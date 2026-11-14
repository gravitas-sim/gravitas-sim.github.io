// =============================================================================
// The exoplanet closeout investigations (Prompt 231)
// -----------------------------------------------------------------------------
// The connecting investigations of the exoplanet unit (Prompts 225 to 230), in one
// module that also carries their Spanish words, their deeper steps and their
// instructor content: the one closure file the closeout adds (D-R10-231-01),
// because the shared sequence files sit at their line ceilings. The per-lesson
// path every loader builds from an id is a one-line re-export of a named export
// here (English, `_ES` for the Spanish, `_DEEPER` and `_DEEPER_ES` for the deeper
// steps), and the instructor modules read INSTRUCTOR.
//
// Content, no imports: every number a step states is recomputed in
// tests/exoplanetCloseout.test.js from the panels the lesson points at (the joint
// fit's field, the vetting field, the occurrence field, the mass-radius diagram's
// constant-density lines and the Solar System table behind it, the dilution panel,
// the observing-window planner's field and the eclipse panel's field). Every step
// carries a `sid`, an opaque stable id that student progress is keyed by: reword a
// step, move it, translate it, never change its sid.
//
// What the four investigations are, and are not (D-R10-231-02):
// - They use the panels that already exist. No instrument is added, no dataset
//   is added, and nothing is fetched.
// - Every system is synthetic and says so, with its truth known. The planet of
//   "One Planet, Every Method" is the joint-fit panel's hot Jupiter; its vetting
//   candidate and its eclipse are two other synthetic systems of the same panel
//   families, and the investigation says that no panel joins the four methods on
//   one star (a joined panel would be a new instrument).
// - "What Kinds of Planets Exist?" reads the mass-radius diagram and the
//   synthetic survey's grid. A public catalog subset (the roadmap's first choice)
//   is not shipped: no rights decision exists for one and no fetch was made.
// - "Could It Hold an Atmosphere?" is not an investigation: the escape panel that
//   would carry it was gated out (Prompt 199, verdict B), so it is a reading step
//   of "What Kinds of Planets Exist?" that says what the diagram cannot say.
// - The orbit of an imaged planet is not here: Prompt 230 Part B's gate returned C.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const JOINT_STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    {
      role: 'star',
      name: 'A star with a hot Jupiter',
      teffK: 5900,
      lumSun: 1.4,
    },
  ],
};
const SURVEY_STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'One of 2000 stars', teffK: 5800, lumSun: 1 }],
};
const VET_STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star with a dip', teffK: 5800, lumSun: 1 },
    { role: 'star', name: 'A neighbor', teffK: 5200, lumSun: 0.4 },
  ],
};
const PLAN_STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'The target', teffK: 5800, lumSun: 1 }],
};

/** The joint-fit panel: stellar mass and radius uncertainty by step index (4 is 5 percent, 3 is 3.5, 0 is none), correlation. */
const JOINT = (values = {}) => ({
  id: 'joint-fit',
  values: {
    massPct: 4,
    radiusPct: 3,
    correlation: 0.5,
    starMass: 1.1,
    starRadius: 1.15,
    ...values,
  },
});
/** The mass-radius diagram: the same uncertainty steps, the data-alone box (1 shown) and the constant-density lines (1 shown). */
const MR = (values = {}) => ({
  id: 'mass-radius',
  values: { massPct: 4, radiusPct: 3, alone: 0, lines: 1, ...values },
});
/** The vetting panel: candidate 0 to 7 (A to H); view 0 odd and even, 1 half an orbit later, 2 where the light dips; truth 0 hidden, 1 shown. */
const VET = (values = {}) => ({
  id: 'vetting-checklist',
  values: { candidate: 0, plots: 1, view: 0, truth: 0, ...values },
});
/** The occurrence efficiency panel: radius bin, period bin, view (0 by period, 1 the curve). */
const EFF = (values = {}) => ({
  id: 'occurrence-efficiency',
  values: { radius: 1, period: 3, view: 0, ...values },
});
/** The occurrence grid: seed, radius bin, period bin, level (0 is 68 percent), reliability (1 stated), truth. */
const GRID = (values = {}) => ({
  id: 'occurrence-grid',
  values: {
    seed: 1,
    radius: 1,
    period: 3,
    level: 0,
    reliability: 1,
    truth: 0,
    ...values,
  },
});
/** The observing-window planner: Cerro Tololo, 10 nights, a weather seed; target 0 is the southern one, 1 the northern. */
const PLAN = (values = {}) => ({
  id: 'strategy-plan',
  values: {
    site: 0,
    target: 0,
    nights: 10,
    perNight: 3,
    spacing: 1.5,
    exposure: 300,
    overhead: 60,
    pClear: 0.6,
    persistence: 0.5,
    seed: 3,
    period: 0.8,
    snr: 5,
    run: 0,
    ...values,
  },
});
/** The dilution panel: the companion's contrast in magnitudes and the radius the blended curve gave. */
const DIL = (values = {}) => ({
  id: 'dilution',
  values: { dm: 1, rp: 2, ...values },
});
/** The eclipse panel of a synthetic planet: dataset 0, the planet's temperature, reflected light assumed absent (1). */
const ECL = (values = {}) => ({
  id: 'atmosphere-eclipse',
  values: { dataset: 0, tPlanet: 1500, reflected: 1, ...values },
});

// -----------------------------------------------------------------------------
// 1. One Planet, Every Method
// -----------------------------------------------------------------------------
export const ONE_PLANET_EVERY_METHOD = {
  id: 'one-planet-every-method',
  thumbnail: 'images/investigations/one-planet-every-method.webp',
  title: 'One Planet, Every Method',
  subtitle:
    'Follow one planet through the transit, the velocity curve, the joint fit and the checklist, and write down every record with its uncertainty',
  duration: '10-14 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'algebra',
  prerequisites: ['what-is-it-made-of', 'planet-or-not'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say what a transit gives (a radius ratio, a depth, the shape) and what a velocity curve gives (an amplitude), and that a density needs both',
    'Read a planet’s density with its uncertainty from a joint fit, and say how much of that uncertainty is the star’s',
    'Say that a candidate that survives a checklist is not validated, and what a report must carry besides the values',
    'Write one record per method, each with its value, its uncertainty, its method and its assumption',
  ],
  steps: [
    {
      sid: 'two-methods-one-planet',
      stage: JOINT_STAGE,
      type: 'read',
      title: 'Two methods, one planet',
      body: `A planet that passes in front of its star dims it, and the dip is the planet&rsquo;s area as a
             fraction of the star&rsquo;s: a radius <em>ratio</em> of 0.118, a depth of 1.40 percent, a shape
             that gives how big the orbit is in stellar radii (9.04) and a period of 3.52 days. The same planet
             tugs its star back and forth, and the velocity curve gives an amplitude of 85.6 meters per second.
             \n\nNeither gives what we most want to know about the planet&rsquo;s makeup. A density needs a mass
             and a radius, and each of those needs the <em>star</em>: the ratio is in stellar radii, and the
             amplitude is a mass only with the star&rsquo;s mass in it. The panel is the joint fit of both data
             sets for a <strong>synthetic</strong> hot Jupiter (with a period like HD 209458 b&rsquo;s, so the
             answers are known), with the star&rsquo;s uncertainty in the controls.`,
      tool: JOINT(),
    },
    {
      sid: 'what-needs-both',
      stage: JOINT_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What needs both',
      body: `Look at what each method measures and what the panel derives from them together.`,
      prompt: 'Which of these needs both the transit and the velocity curve?',
      options: [
        'The planet’s bulk density: mass from the velocity curve, radius from the transit, and the star behind both',
        'The orbital period: it takes both methods to find it',
        'The radius ratio: the velocity curve fixes it',
        'The depth of the dip: it needs the planet’s mass',
      ],
      answer: 0,
      hints: [
        'Density is mass over volume. Which method gives a mass, and which gives a size?',
      ],
      because:
        'The bulk density. The velocity curve gives the mass (with the star’s mass in it), the transit gives the radius (in stellar radii), and the density needs the two. The period and the depth come from the transit alone, and neither needs the planet’s mass.',
      misconceptions: [
        {
          id: 'period',
          option: 1,
          say: 'Either method finds the period alone; it is what makes the two data sets share a clock, which is why the fit can use both.',
        },
        {
          id: 'ratio',
          option: 2,
          say: 'The radius ratio is the transit’s, and it is the size of the shadow; the velocity curve knows nothing about size.',
        },
      ],
      tool: JOINT(),
    },
    {
      sid: 'read-the-record',
      stage: JOINT_STAGE,
      type: 'measure',
      title: 'Read the density and what it carries',
      body: `With the star&rsquo;s mass uncertain by 5 percent, its radius by 3.5 percent and the two correlated
             (the panel&rsquo;s opening values), read the planet&rsquo;s <strong>bulk density</strong> and its
             <strong>one-sigma uncertainty</strong> (the &ldquo;plus or minus&rdquo;) in g/cm³. A value without
             its uncertainty is not yet a record.`,
      fields: [
        {
          id: 'rho',
          label: 'Bulk density',
          unit: 'g/cm³',
          want: '0.365',
        },
        {
          id: 'sigma',
          label: 'Its one-sigma uncertainty (plus or minus)',
          unit: 'g/cm³',
          want: '0.050',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.rho) || !Number.isFinite(v.sigma)) return null;
        if (near(v.rho, 0.365, 0.01) && near(v.sigma, 0.0501, 0.003)) {
          return {
            level: 'ok',
            message:
              'About 0.365 grams per cubic centimeter, give or take 0.050 (13.8 percent of the value): well below the 1.3 of Jupiter and far below rock. The uncertainty is part of the answer, and it is not small.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the controls at their opening values and read the bulk density and its uncertainty from the readout: about 0.365 g/cm³, plus or minus about 0.050.',
        };
      },
      tool: JOINT(),
    },
    {
      sid: 'the-star-share',
      stage: JOINT_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'How much is the star’s',
      body: `The density&rsquo;s uncertainty has two sources: the planet&rsquo;s own data (the transit and the
             velocities) and the star&rsquo;s stated mass and radius. Set both of the star&rsquo;s uncertainties to
             <strong>0</strong> and read the density&rsquo;s uncertainty again, then put them back.`,
      prompt:
        'What fraction of the density’s variance comes from the star’s uncertainty at the opening values?',
      options: [
        'About half: the planet’s own data and the star each contribute a similar share',
        'Almost none: the data decide the density and the star only sets a scale',
        'Almost all: the data contribute nothing',
        'It cannot be said without knowing the planet’s true density',
      ],
      answer: 0,
      hints: [
        'The readout states the share of the variance the star adds. With the star exact, the uncertainty falls from 13.8 to about 10 percent.',
      ],
      because:
        'About half (46 percent of the variance). With the star taken as exact, the density is still uncertain by about 10 percent from the planet’s own data, and the star’s mass and radius add the rest. A better star would help as much as a better light curve.',
      misconceptions: [
        {
          id: 'scale',
          option: 1,
          say: 'The star is not only a scale: its radius sets the planet’s radius and its mass sets the planet’s mass, and the density inherits both.',
        },
        {
          id: 'all',
          option: 2,
          say: 'The data do contribute: with the star exact the density is still uncertain by about 10 percent.',
        },
      ],
      tool: JOINT(),
    },
    {
      sid: 'a-dip-is-a-candidate',
      stage: VET_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is it a planet?',
      body: `Before any of this, the dip had to be a planet. The panel shows a candidate (a different synthetic
             system from the one above; no panel carries all the methods on one star) that has been put through
             three tests: whether odd and even dips match, whether a second eclipse appears half an orbit later, and
             whether the light moves on the sky during the dip. It passes all three.`,
      prompt:
        'Does passing all three tests validate the candidate as a planet?',
      options: [
        'No: it has survived the tests that were run; what those tests cannot see is still open',
        'Yes: three tests are enough to validate any planet',
        'Yes, if the dip is deep enough',
        'No: a candidate can never be validated',
      ],
      answer: 0,
      hints: [
        'A test can reject a false positive; passing does not exclude the ones the test cannot see.',
      ],
      because:
        'Survived is not validated. Each test rejects some false positives and misses others, and a checklist that is all passes leaves the ones that no test could see. Validation is a statement about how likely each alternative is, not a count of tests passed.',
      misconceptions: [
        {
          id: 'enough',
          option: 1,
          say: 'There is no number of tests that is enough in general; what matters is which false positives each test can and cannot see.',
        },
        {
          id: 'never',
          option: 3,
          say: 'Candidates are validated, by showing that the alternatives are far less likely than a planet; passing a checklist is one input to that, not the whole of it.',
        },
      ],
      tool: VET(),
    },
    {
      sid: 'the-record',
      stage: JOINT_STAGE,
      type: 'read',
      title: 'The record',
      body: `A report of this planet carries one row for each thing it says, and every row has its
             <strong>value</strong>, its <strong>uncertainty</strong>, its <strong>method</strong> and its
             <strong>assumption</strong>: the period (the transit), the depth of 1.40 percent (the transit), the
             velocity amplitude of 85.6 m/s (the velocities), the mass of 0.684 &plusmn; 0.024 Jupiter masses
             (the joint fit, with the star&rsquo;s mass in it), the radius of 1.325 &plusmn; 0.064 Jupiter radii
             (the joint fit, in stellar radii and so with the star&rsquo;s radius in it), the density of
             0.365 &plusmn; 0.050 g/cm³ and, beside them, the vetting row: <em>survives three tests, not
             validated</em>.
             \n\nTwo things belong in the report that are not values: the star&rsquo;s share of each uncertainty,
             because it says where a better measurement would help, and the failures and the undecided tests,
             because a reader needs to know what was tried. The deeper steps put the fourth method, an
             eclipse, beside these.`,
      tool: JOINT(),
    },
  ],
};

export const ONE_PLANET_EVERY_METHOD_DEEPER = {
  id: 'one-planet-every-method',
  steps: [
    {
      sid: 'the-depth',
      after: 'two-methods-one-planet',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'From the ratio to the dip',
      body: `A dip is the planet&rsquo;s area over the star&rsquo;s, so it is the radius <em>ratio</em> squared.
             The ratio the transit gave is 0.1184.`,
      prompt: 'The depth of the dip, as a percent',
      unit: '%',
      answer: 1.4,
      tolerance: 0.03,
      hints: ['Square 0.1184 and multiply by 100.'],
      worked:
        '0.1184² = 0.01402, so 1.40 percent of the star’s light. A planet a tenth of the star’s radius blocks a hundredth of its light.',
      feedback: {
        close: 'Close. Square the ratio, then express it as a percent.',
        'wrong-order-of-magnitude':
          'A power of ten out: square the ratio, then convert the fraction to a percent.',
        off: '0.1184 × 0.1184 × 100.',
      },
      tool: JOINT(),
    },
    {
      sid: 'what-the-star-costs',
      after: 'the-star-share',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The planet’s own part',
      body: `Set the star&rsquo;s mass and radius uncertainties both to <strong>0</strong>: the density&rsquo;s
             uncertainty that remains is the planet&rsquo;s own data alone. Read the &ldquo;plus or minus&rdquo; and divide it by
             the density to get a percent.`,
      prompt:
        'The density’s uncertainty with the star exact, as a percent of the value',
      unit: '%',
      answer: 10.1,
      tolerance: 0.3,
      hints: [
        'Read it from the readout with both of the star’s uncertainties at 0 %.',
      ],
      worked:
        'About 10.1 percent. At the opening values it was 13.8, and the two parts add in quadrature: the star’s part alone is about 9.3 percent, and 10.1² + 9.3² is 13.8².',
      feedback: {
        close:
          'Close. Read the density’s relative uncertainty with both star uncertainties set to 0.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a few percent to a few tens of percent, not a tenth or a thousand.',
        off: 'Set both of the star’s uncertainties to 0 % and read the density’s uncertainty.',
      },
      tool: JOINT({ massPct: 0, radiusPct: 0 }),
    },
    {
      sid: 'a-worse-star',
      after: 'what-the-star-costs',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A poorly known star',
      body: `Now set the star&rsquo;s mass and radius uncertainties both to <strong>8 percent</strong> (the
             controls&rsquo; sixth step), with the same correlation, and read the density&rsquo;s uncertainty as a percent of its
             value (the &ldquo;plus or minus&rdquo; over the density).`,
      prompt:
        'The density’s uncertainty with the star at 8 percent, as a percent of the value',
      unit: '%',
      answer: 24.1,
      tolerance: 0.8,
      hints: [
        'It is more than the 13.8 percent of the opening values, and the star’s share of it grows.',
      ],
      worked:
        'About 24.1 percent, and 82 percent of the variance is now the star’s. Past this point a better light curve buys nothing: the star is the limit, which is why the stellar parameters of a host are measured before its planets are interpreted.',
      feedback: {
        close:
          'Close. Set both uncertainties to 8 percent and read the density’s uncertainty.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a few tens of percent, not a few percent or hundreds.',
        off: 'Both star uncertainties at 8 percent, correlation 0.5: read the density’s relative uncertainty.',
      },
      tool: JOINT({ massPct: 5, radiusPct: 5 }),
    },
    {
      sid: 'the-eclipse',
      after: 'a-dip-is-a-candidate',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A fourth method: the eclipse',
      body: `When a planet passes behind its star, the light it gives out disappears for a while, and the
             <strong>eclipse depth</strong> in a band is the planet&rsquo;s own glow over the star&rsquo;s. The panel
             shows four bands for a <strong>synthetic</strong> planet (another system, labeled as one; no published
             table was compared). With reflected light set to <strong>assume none</strong>, read the brightness
             temperature in the 3.2 to 4.0 micron band.`,
      prompt: 'The brightness temperature in the 3.2 to 4.0 micron band',
      unit: 'K',
      answer: 2094,
      tolerance: 15,
      hints: [
        'It is the temperature of the blackbody that would give that depth in that band.',
      ],
      worked:
        'About 2094 K. It is a bound under assumptions that the readout states (a uniform blackbody, no reflected light, one isothermal layer): it is the planet’s day side in one band, not its temperature, and it belongs in the report with those words.',
      feedback: {
        close:
          'Close. Read the 3.2 to 4.0 micron row with reflected light set to assume none.',
        'wrong-order-of-magnitude':
          'A power of ten out: a hot planet’s day side is a couple of thousand kelvin.',
        off: 'Set reflected light to assume none and read the third band’s brightness temperature.',
      },
      tool: ECL(),
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. What Kinds of Planets Exist?
// -----------------------------------------------------------------------------
export const WHAT_KINDS_OF_PLANETS_EXIST = {
  id: 'what-kinds-of-planets-exist',
  thumbnail: 'images/investigations/what-kinds-of-planets-exist.webp',
  title: 'What Kinds of Planets Exist?',
  subtitle:
    'Read planets by their mass and radius, then read a survey’s grid of sizes and periods against what the survey could see',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: ['how-many-earths'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Read a planet’s bulk density from its place between lines of constant density on a mass-radius diagram, and say what a low density does and does not say',
    'Say that a survey sees large and close-in planets most easily, and read the chance it recovers a planet of a given size and period',
    'Read a rate from a few listed planets, and say why a bin with no listing is an upper limit in one place and unconstrained in another',
    'Say that a diagram of mass and radius cannot say whether a planet keeps an atmosphere',
  ],
  steps: [
    {
      sid: 'a-diagram-of-planets',
      stage: JOINT_STAGE,
      type: 'read',
      title: 'A diagram of planets',
      body: `Put each planet on a graph of its <strong>mass</strong> against its <strong>radius</strong>, both in
             Earth units, and add lines of constant <strong>bulk density</strong>. The Solar System&rsquo;s planets fall
             in groups: Earth, Venus and Mercury near 5.5 grams per cubic centimeter, rock and metal; Jupiter and
             Saturn near 1.3 and 0.7, mostly hydrogen; Uranus and Neptune near 1.3 to 1.6, in between.
             \n\nThe panel shows the lines and the Solar System, with the box of the synthetic hot Jupiter of the
             <em>One Planet, Every Method</em> investigation, drawn with its uncertainty. Nothing here says what a planet is
             made of; it says what density it has, and several mixtures can have one density.`,
      tool: MR(),
    },
    {
      sid: 'what-the-density-says',
      stage: JOINT_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the box says',
      body: `The hot Jupiter&rsquo;s box sits at about 217 Earth masses and 14.9 Earth radii, with the lines of
             0.3, 1, 3, 5.51 and 12 grams per cubic centimeter around it.`,
      prompt: 'Which statement does its place support?',
      options: [
        'Its density is about 0.37 g/cm³, far below any rock: most of its volume must be a light gas',
        'It is made mostly of rock, because it is heavy',
        'It is a twin of Jupiter, because it is about as massive',
        'It has a thin atmosphere, because its density is low',
      ],
      answer: 0,
      hints: [
        'Find the nearest line of constant density, and compare it with the 5.51 line of the Earth.',
      ],
      because:
        'A density near 0.3 to 0.4 g/cm³ is far below rock, so a large part of the volume is a gas of low density. A diagram can say that much; it cannot say how the gas and any core are mixed, and it says nothing about an atmosphere’s thickness.',
      misconceptions: [
        {
          id: 'heavy',
          option: 1,
          say: 'Mass alone is not density: this planet is heavy and very large, and the large volume gives the low density.',
        },
        {
          id: 'twin',
          option: 2,
          say: 'Jupiter is denser (1.33 g/cm³) and smaller. A planet of Jupiter’s mass but much larger radius is a different object.',
        },
      ],
      tool: MR(),
    },
    {
      sid: 'what-the-survey-sees',
      stage: SURVEY_STAGE,
      type: 'read',
      title: 'What a survey could see',
      body: `A diagram of the planets a survey found is a diagram of what the survey <em>could</em> find. The panel
             shows, for a synthetic survey of 2000 stars, the chance that a transiting planet of a given size and period is
             recovered: the <strong>efficiency</strong>. It combines the shallower dip of a small planet, the fewer transits
             of a long period, and the survey&rsquo;s own search. The synthetic planets are drawn from a known truth, so
             the next steps can say how far the survey&rsquo;s count is from it.`,
      tool: EFF({ radius: 0, period: 5 }),
    },
    {
      sid: 'larger-is-easier',
      stage: SURVEY_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Larger is easier',
      body: `At periods of 32 to 64 days, the panel gives the efficiency for planets of 0.5 to 1 Earth radii and
             for planets of 4 to 8 Earth radii.`,
      prompt: 'How do the two compare?',
      options: [
        'The large planets are recovered about four times as often (81 percent against 20), so a count of large planets is closer to the truth',
        'They are recovered equally, because the period is the same',
        'The small planets are recovered more often, because there are more of them',
        'Neither is recovered, because 32 to 64 days is too long for a survey',
      ],
      answer: 0,
      hints: [
        'Read the two bars of the panel at the period bin 32 to 64 days.',
      ],
      because:
        'The efficiency at 32 to 64 days is 81 percent for 4 to 8 Earth radii and 20 percent for 0.5 to 1: a small planet’s dip is shallow, and the survey finds one in five. Abundance does not change the chance that a given planet is recovered; it changes how many are there to recover.',
      misconceptions: [
        {
          id: 'equal',
          option: 1,
          say: 'The period is the same, but the dip is not: the small planet’s dip is far shallower and often lost in the noise.',
        },
        {
          id: 'more',
          option: 2,
          say: 'How many planets there are is not the same as the chance of finding one that is there; the efficiency is the second.',
        },
      ],
      tool: EFF({ radius: 0, period: 5 }),
    },
    {
      sid: 'a-rate-from-few',
      stage: SURVEY_STAGE,
      type: 'measure',
      title: 'A rate from a few',
      body: `In the grid, the bin of <strong>0.5 to 1 Earth radii</strong> and <strong>32 to 64 days</strong> lists
             only a few planets, because the survey could hardly see them. Read how many it lists and the rate per star
             that the survey&rsquo;s completeness turns that count into (the first seed, reliability as stated).`,
      fields: [
        {
          id: 'listed',
          label: 'Planets listed in the bin',
          unit: '',
          want: '3',
        },
        {
          id: 'rate',
          label: 'The rate, in planets per star',
          unit: '',
          want: '0.35',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.listed) || !Number.isFinite(v.rate)) return null;
        if (near(v.listed, 3, 0.01) && near(v.rate, 0.347, 0.02)) {
          return {
            level: 'ok',
            message:
              'Three planets listed, and a rate of about 0.35 per star: the count is small and the survey saw only a fifth of what was there, so the rate is large and its range is wide. A few listings in a bin the survey could hardly see is not a rare planet.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose radius 0.5 to 1, period 32 to 64 days, the first seed, and read the number listed and the rate: 3 planets and about 0.35 per star.',
        };
      },
      tool: GRID({ radius: 0, period: 5 }),
    },
    {
      sid: 'what-an-atmosphere-needs',
      stage: JOINT_STAGE,
      type: 'read',
      title: 'Could it hold an atmosphere?',
      body: `A natural next question is whether a planet of a given mass and radius keeps a gas, and the diagram
             does not answer it. A low density says the planet <em>has</em> a thick envelope; whether a small, hot world
             can <em>hold on to</em> one is a balance between how fast gas moves at its temperature and how fast it takes
             to leave, and it depends on the star&rsquo;s light over time, which no diagram of mass and radius carries.
             \n\nThe calculation of the escape of a gas from a world was gated out of this project (it was judged that
             the models could not support it at the standard the rest of the unit keeps), so this is a reading step and not
             an investigation. The honest statement from this diagram is the one in the box: a bulk density, with its
             uncertainty, and nothing about what a planet keeps.`,
      tool: MR({ lines: 1 }),
    },
    {
      sid: 'kinds-and-what-they-hide',
      stage: SURVEY_STAGE,
      type: 'read',
      title: 'Kinds, and what each diagram hides',
      body: `Two diagrams, two kinds of statement. The mass&ndash;radius diagram says what a planet&rsquo;s bulk density
             is and so what family it belongs to, with the uncertainty the star adds. The grid of sizes and periods says how
             many planets a survey could count in each bin, and a rate comes out only when the survey&rsquo;s completeness
             is stated: few listings in a faint bin is a wide range, and a bin the survey could not see says nothing at all.
             \n\nNeither diagram is a map of the planets that exist. Which kinds look common in a listing depends on which are
             easy to see, and the deeper steps say how to tell the two apart.`,
      tool: GRID({ radius: 1, period: 3 }),
    },
  ],
};

export const WHAT_KINDS_OF_PLANETS_EXIST_DEEPER = {
  id: 'what-kinds-of-planets-exist',
  steps: [
    {
      sid: 'jupiters-density',
      after: 'what-the-density-says',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Jupiter’s density from its place',
      body: `In Earth units, density is the Earth&rsquo;s 5.51 g/cm³ times the mass divided by the radius
             cubed. Jupiter is 317.8 Earth masses and 10.96 Earth radii.`,
      prompt: 'Jupiter’s bulk density',
      unit: 'g/cm³',
      answer: 1.33,
      tolerance: 0.03,
      hints: ['5.51 × 317.8 / 10.96³; the cube of 10.96 is about 1317.'],
      worked:
        '10.96³ = 1317, and 317.8 / 1317 = 0.2413, so 5.51 × 0.2413 = 1.33 g/cm³: a quarter of the Earth’s density, which is why the planets of its kind sit far from the rock line.',
      feedback: {
        close:
          'Close. Cube the radius, divide the mass by it and multiply by 5.51.',
        'wrong-order-of-magnitude':
          'A power of ten out: a gas giant is about a quarter of the Earth’s density, not ten times or a tenth of it.',
        off: '5.51 × 317.8 / 10.96³.',
      },
      tool: MR(),
    },
    {
      sid: 'efficiency-ratio',
      after: 'larger-is-easier',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much easier',
      body: `At 32 to 64 days the efficiency is 81 percent for planets of 4 to 8 Earth radii and 20 percent for planets of
             0.5 to 1.`,
      prompt: 'How many times more likely is the large planet to be recovered?',
      unit: '',
      answer: 4.0,
      tolerance: 0.1,
      hints: ['Divide the larger efficiency by the smaller.'],
      worked:
        '81 / 20 = 4.05, which is 4.0 to the precision the panel gives. To count the small planets honestly, each one listed has to stand for about five that were there.',
      feedback: {
        close: 'Close. Divide 81 by 20.',
        'wrong-order-of-magnitude':
          'A power of ten out: the ratio is a few, not tens.',
        off: '81 / 20.',
      },
      tool: EFF({ radius: 0, period: 5 }),
    },
    {
      sid: 'an-upper-limit',
      after: 'a-rate-from-few',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Two empty bins',
      body: `Two bins list no planet at all. In the bin of 4 to 8 Earth radii and 2 to 4 days the survey would
             list about 242 planets for every planet per star there is; in the bin of 0.5 to 1 Earth radii and 128 to 256
             days only about 1.3. The panel gives the first an upper limit of about 0.012 per star and says the second is
             <em>not constrained</em>.`,
      prompt: 'Why do the same empty listings say such different things?',
      options: [
        'The first bin was searched thoroughly, so finding none rules out a high rate; the second was hardly searched, so finding none says almost nothing',
        'The first bin has fewer planets in truth, and the second has more',
        'The panel is inconsistent: an empty bin is an empty bin',
        'The first bin is closer to the star, so planets there are not counted',
      ],
      answer: 0,
      hints: [
        'Ask how many planets the survey would have listed if they were there at a given rate.',
      ],
      because:
        'Completeness. With a yield of 242 per planet per star, a rate above about 0.012 would very probably have produced a listing, so none is an upper limit. With 1.3, a rate of one per star would produce one listing on average, so none says nothing: the survey is blind there.',
      misconceptions: [
        {
          id: 'truth',
          option: 1,
          say: 'The truth can be anything in both; what differs is how well the survey would have seen a planet if one were there.',
        },
        {
          id: 'empty',
          option: 2,
          say: 'An empty listing means different things when the search was thorough and when it was blind; stating the yield is what separates them.',
        },
      ],
      tool: GRID({ radius: 3, period: 1 }),
    },
    {
      sid: 'a-selection-in-each-diagram',
      after: 'what-an-atmosphere-needs',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The selection in each diagram',
      body: `For the smallest planets the efficiency falls from 64 percent at 1 to 2 days to 8 percent at 128 to 256 days.
             For the largest it stays above 99 percent out to 32 days.`,
      prompt:
        'Which diagram of the planets a survey <em>listed</em> would mislead if read as a diagram of the planets that exist?',
      options: [
        'Both: the listing of period against radius is crowded toward large and close-in planets because those are easy to see, and the mass-radius diagram of measured planets is limited to those with both a transit and a velocity amplitude',
        'Neither: a survey lists every planet there is',
        'Only the period–radius diagram: a mass-radius diagram has no selection',
        'Only the mass-radius diagram: a period–radius diagram counts every planet',
      ],
      answer: 0,
      hints: [
        'A planet must be found, and for a mass it must also be measured by another method.',
      ],
      because:
        'Both. The listing of sizes and periods is shaped by the efficiency, which is far lower for small and distant planets. The mass–radius diagram holds only the planets for which a mass was measured as well, which are the ones with a large velocity amplitude. A rate needs the completeness; a bulk density needs both measurements, and the missing ones are not random.',
      misconceptions: [
        {
          id: 'all',
          option: 1,
          say: 'A survey lists what it could see; the efficiency of 8 percent for small planets at long periods says it sees about one in twelve.',
        },
        {
          id: 'none',
          option: 2,
          say: 'A mass-radius diagram has a selection of its own: a planet needs a mass, and masses are measured for the planets that pull their stars hardest.',
        },
      ],
      tool: EFF({ radius: 0, period: 7 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. The Transit That Was a Star
// -----------------------------------------------------------------------------
export const THE_TRANSIT_THAT_WAS_A_STAR = {
  id: 'the-transit-that-was-a-star',
  thumbnail: 'images/investigations/the-transit-that-was-a-star.webp',
  title: 'The Transit That Was a Star',
  subtitle:
    'Four candidates whose dips were really a star: what rejected two of them, what a checklist cannot see in the others, and what a neighbor does to a real planet’s dip',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['planet-or-not'],
  tags: ['exoplanets', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say why alternate dips of different depth point to an eclipsing pair at twice the period',
    'Say what a pair of equal stars does to the odd-even test, and what the difference-image test sees',
    'Say why a blend inside the test’s exclusion radius survives every test, and what that costs a claim',
    'Say the two ways a neighbor changes a transit: it can be the dip, or it can dilute a real one',
  ],
  steps: [
    {
      sid: 'a-dip-with-company',
      stage: VET_STAGE,
      type: 'read',
      title: 'A dip with company',
      body: `Many stars in a survey have a neighbor too close to separate, and a neighbor can be an
             <strong>eclipsing binary</strong>: two stars that pass in front of each other. Its eclipses look like a
             transit, only deeper or shallower, and the light of the target dilutes them. The panel holds eight
             <strong>synthetic</strong> candidates; this investigation walks four whose truth is a blend.
             \n\nCandidate <strong>B</strong> is the first. Its odd dips and its even dips (the dips of alternate
             orbits) are plotted separately: the two are different by a wide margin (0.93 percent and 0.44 percent).`,
      tool: VET({ candidate: 1 }),
    },
    {
      sid: 'odd-and-even',
      stage: VET_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Odd and even',
      body: `A planet blocks the same fraction of the light at every transit. Candidate B&rsquo;s dips come in
             two sizes that alternate.`,
      prompt: 'What does the alternation say?',
      options: [
        'The dips are two different eclipses of a pair of stars: the deeper dip is one star in front of the other, the shallower the reverse, and the true period is twice the one searched',
        'The planet is changing size from one orbit to the next',
        'The telescope is measuring every second transit badly',
        'The planet has two moons, one for each dip',
      ],
      answer: 0,
      hints: [
        'A pair of stars of different surface brightness gives a deeper eclipse when the hotter star is covered.',
      ],
      because:
        'A pair of stars of unequal brightness gives two different eclipses per orbit, and a search that looks for one dip per period finds half the real period. The odd–even difference is 98 times its uncertainty, so it is not noise. A planet does not change size, which is the reason the test works.',
      misconceptions: [
        {
          id: 'size',
          option: 1,
          say: 'A planet does not change size between orbits; a change of depth at that scale is a sign it is not one body crossing one star.',
        },
        {
          id: 'noise',
          option: 2,
          say: 'The difference is about 98 times its uncertainty: it is far too large to be a bad measurement of one depth.',
        },
      ],
      tool: VET({ candidate: 1 }),
    },
    {
      sid: 'the-twin',
      stage: VET_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The twin',
      body: `Candidate <strong>D</strong> has equal odd and even dips (0.715 and 0.713 percent), no second eclipse
             and <em>no frames</em>, so the difference-image test was not run. Every test it was given passes.`,
      prompt: 'What can be said about D?',
      options: [
        'Nothing in the data rejects it, and nothing validates it: two equal stars give equal dips, and the one test that could see a neighbor was not run',
        'It is a planet, because it passes every test that was run',
        'It is a star, because the dips are equal',
        'It cannot be anything, because no frames exist',
      ],
      answer: 0,
      hints: [
        'Two identical stars eclipsing each other give the same dip every time. Which test was not run?',
      ],
      because:
        'D survives, and it is a blend of exactly the kind the first two tests cannot catch: a pair of equal stars at twice the period gives a dip every period, all the same, so the odd and even dips match and nothing appears half an orbit later. Only a test of where the light dips on the sky could see it, and it was not run.',
      misconceptions: [
        {
          id: 'passes',
          option: 1,
          say: 'Passing the tests that could be run is not validation; a test that was not run could not reject anything.',
        },
        {
          id: 'equal',
          option: 2,
          say: 'Equal dips do not prove a star: they are what two equal stars give and also what a planet gives, which is the point.',
        },
      ],
      tool: VET({ candidate: 3 }),
    },
    {
      sid: 'the-frames',
      stage: VET_STAGE,
      type: 'measure',
      title: 'The frames',
      body: `Candidate <strong>E</strong> has the same equal dips, but with images taken during and between the
             dips. The <strong>difference-image</strong> test measures where the light that disappeared sits on the
             sky. Read how far from the target the centroid of the missing light is, in pixels.`,
      fields: [
        {
          id: 'offset',
          label: 'Offset of the light that dips',
          unit: 'pixels',
          want: '1.8',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.offset)) return null;
        if (near(v.offset, 1.81, 0.1)) {
          return {
            level: 'ok',
            message:
              'About 1.8 pixels, about fifteen times its own uncertainty and several times the test’s 0.41 pixel exclusion radius: the light that vanished is not at the target. The dip is on the neighbor, and the candidate is rejected.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose candidate E and read the centroid test: the offset is about 1.8 pixels.',
        };
      },
      tool: VET({ candidate: 4 }),
    },
    {
      sid: 'too-close-to-see',
      stage: VET_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Too close to see',
      body: `Candidate <strong>G</strong> has images too, and the same equal dips. The light that dips is
             only 0.17 pixels from the target, and the test&rsquo;s exclusion radius for this one is 0.30. It passes all
             three tests.`,
      prompt: 'What does G passing the centroid test mean?',
      options: [
        'It means the neighbor, if there is one, is inside the test’s exclusion radius: the test cannot place the dip off the target, and a blend that close survives it',
        'It means the dip is on the target, so G is a planet',
        'It means the test is broken',
        'It means the exclusion radius is zero',
      ],
      answer: 0,
      hints: [
        'A test that measures a position has a smallest offset it can resolve, and below that it says on-target.',
      ],
      because:
        'The test cannot see inside its exclusion radius. G passes because the dip is within 0.30 pixels of the target, which includes a neighbor that is truly 0.15 pixels away (turn on the panel’s truth to see that G is a blend). A passed centroid test says the dip is on the target to within that radius, no better.',
      misconceptions: [
        {
          id: 'planet',
          option: 1,
          say: '“On target” means within the exclusion radius, which here is larger than the separation of a blend that is truly there.',
        },
        {
          id: 'broken',
          option: 2,
          say: 'The test works as designed; it has a resolution, and a neighbor closer than that survives it.',
        },
      ],
      tool: VET({ candidate: 6 }),
    },
    {
      sid: 'the-whole-story',
      stage: VET_STAGE,
      type: 'read',
      title: 'The whole story',
      body: `A neighbor changes a transit in two ways. It can <strong>be</strong> the dip: an eclipsing pair that the
             tests reject when they can see it (B by its two depths, E by where the light dips) and survives when they
             cannot (D with no frames, G inside the exclusion radius). Or it can <strong>dilute</strong> a real planet:
             the extra light fills in the dip, and the planet measures smaller than it is. The dilution panel shows the
             second case: a measured planet of 2 Earth radii with a companion one magnitude fainter is a planet of 2.4.
             \n\nThe two cases are opposite in what they do to a claim: the first can make a planet from a star, and the second
             can make a world look rocky that was not. The answer in both is a high-resolution image of the host, which
             the deeper steps put numbers on.`,
      tool: DIL(),
    },
  ],
};

export const THE_TRANSIT_THAT_WAS_A_STAR_DEEPER = {
  id: 'the-transit-that-was-a-star',
  steps: [
    {
      sid: 'the-two-depths',
      after: 'odd-and-even',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much shallower',
      body: `Candidate B&rsquo;s odd dips are 0.927 percent deep and its even dips 0.436 percent.`,
      prompt: 'The even depth as a fraction of the odd depth',
      unit: '',
      answer: 0.47,
      tolerance: 0.02,
      hints: ['Divide the even depth by the odd depth.'],
      worked:
        '0.436 / 0.927 = 0.47. For two eclipses of one pair the depth ratio is the ratio of the surface brightnesses of the two stars, so the star in front in the deeper eclipse is about twice as bright per unit area as the other.',
      feedback: {
        close: 'Close. Divide 0.436 by 0.927.',
        'wrong-order-of-magnitude':
          'A power of ten out: the two depths are about the same size, so the ratio is near one half.',
        off: '0.436 / 0.927.',
      },
      tool: VET({ candidate: 1 }),
    },
    {
      sid: 'the-diluted-radius',
      after: 'too-close-to-see',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The planet behind the glare',
      body: `A blended light curve gave a planet of 2.0 Earth radii, and a companion in the aperture is one
             magnitude fainter than the star. The panel&rsquo;s correction is the square root of one plus the
             companion&rsquo;s flux ratio.`,
      prompt: 'The planet’s true radius',
      unit: 'R⊕',
      answer: 2.37,
      tolerance: 0.03,
      hints: [
        'The flux ratio of a star one magnitude fainter is 10 to the power of minus 0.4, about 0.398.',
      ],
      worked:
        'The flux ratio is 0.398, the correction is √1.398 = 1.18 and the radius 2.0 × 1.18 = 2.37 R⊕. It always goes up: a neighbor can only make a planet look smaller.',
      feedback: {
        close: 'Close. Multiply 2.0 by the square root of 1 plus 0.398.',
        'wrong-order-of-magnitude':
          'A power of ten out: the correction is a fraction of a radius, not a factor of ten.',
        off: '2.0 × √(1 + 10^(−0.4)).',
      },
      tool: DIL(),
    },
    {
      sid: 'the-share-of-the-light',
      after: 'the-diluted-radius',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How much of the light is the neighbor’s',
      body: `Set the companion&rsquo;s contrast to <strong>0.5</strong> magnitudes and read the share of the
             light in the aperture that does not come from the star being transited.`,
      prompt: 'The share of the light from the companion',
      unit: '%',
      answer: 38.7,
      tolerance: 0.5,
      hints: [
        'It is f over 1 + f, where f is the flux ratio, 0.631 for half a magnitude.',
      ],
      worked:
        '0.631 / 1.631 = 0.387: almost two fifths of the light is not the target’s, and the planet’s radius is too small by a factor of 1.28.',
      feedback: {
        close: 'Close. The share is f / (1 + f) with f = 10^(−0.2).',
        'wrong-order-of-magnitude':
          'A power of ten out: the share is a few tens of percent.',
        off: '0.631 / 1.631 × 100.',
      },
      tool: DIL({ dm: 0.5, rp: 1.5 }),
    },
    {
      sid: 'how-faint-is-harmless',
      after: 'the-share-of-the-light',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How faint is harmless',
      body: `Dilution changes a radius by under one percent when the correction is under 1.01, that is when the
             flux ratio is under 0.0201.`,
      prompt:
        'The companion’s contrast at which the correction falls to 1 percent',
      unit: 'mag',
      answer: 4.2,
      tolerance: 0.1,
      hints: [
        'The contrast in magnitudes is −2.5 times the base-10 logarithm of the flux ratio.',
      ],
      worked:
        '−2.5 log₁₀(0.0201) = 4.24 magnitudes: a companion more than four magnitudes fainter changes a radius by less than a percent, and one three magnitudes fainter by three.',
      feedback: {
        close: 'Close. Take −2.5 times the base-10 logarithm of 0.0201.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a few magnitudes.',
        off: '−2.5 × log₁₀(0.0201).',
      },
      tool: DIL({ dm: 4.2, rp: 1.5 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 4. Planning a Transit Campaign
// -----------------------------------------------------------------------------
export const PLANNING_A_TRANSIT_CAMPAIGN = {
  id: 'planning-a-transit-campaign',
  thumbnail: 'images/investigations/planning-a-transit-campaign.webp',
  title: 'Planning a Transit Campaign',
  subtitle:
    'A planet with a known ephemeris, a site, ten nights and the weather: which transits can be caught whole, and what the sky leaves',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['design-the-schedule'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that a transit campaign needs a whole transit and a baseline on each side inside the night’s window, and find the nights that qualify from an ephemeris',
    'Say that the weather takes nights at random and that a plan states an expected count, not a promise',
    'Say that a cadence built to find a period is not a transit sequence',
    'Say that a target that is up for too short a time cannot be planned at all, and what an aging ephemeris does to the baseline',
  ],
  steps: [
    {
      sid: 'what-a-campaign-needs',
      stage: PLAN_STAGE,
      type: 'read',
      title: 'What a campaign needs',
      body: `A planet with a known period transits at times you can predict, so the question is not <em>whether</em>
             to look but <em>when it can be caught whole</em>. Suppose a planet transits every <strong>2 days</strong>, the
             first transit is centered <strong>1.0 hour after local midnight</strong> on the first night, and a transit lasts
             <strong>2.8 hours</strong>. To measure its depth you want an hour of baseline on each side, so
             <strong>4.8 hours</strong> of target, dark sky and good weather in a row.
             \n\nThe panel is the observing-window planner for a telescope on Cerro Tololo and a southern target. Each
             night it shows the window in which the target is up and the sky is dark (from 4.2 hours before local midnight to
             4.7 hours after, on the first night: 8.8 hours), and which nights the weather took (a synthetic draw, with a seed).
             The visits it also plans are a cadence for finding a period; this investigation uses only the windows and the
             weather.`,
      tool: PLAN(),
    },
    {
      sid: 'which-nights',
      stage: PLAN_STAGE,
      type: 'measure',
      title: 'Which nights',
      body: `A transit every 2 days lands at the same hour of the night every <em>second</em> night, and the
             nights between hold none. Of the 10 nights in the panel, count the nights on which a whole transit plus its baseline fits in the window, with the weather ignored.`,
      fields: [
        {
          id: 'nights',
          label: 'Nights with a whole transit and baseline',
          unit: '',
          want: '5',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.nights)) return null;
        if (near(v.nights, 5, 0.01)) {
          return {
            level: 'ok',
            message:
              'Five nights, the first, third, fifth, seventh and ninth: every 2 days the transit comes back to the same hour of the night, and the nights between hold none. A 2-day period gives a transit in the window on every second night.',
          };
        }
        return {
          level: 'error',
          message:
            'The transit returns to the same hour every 2 days, so it is in the window on nights 1, 3, 5, 7 and 9.',
        };
      },
      tool: PLAN(),
    },
    {
      sid: 'what-the-weather-left',
      stage: PLAN_STAGE,
      type: 'measure',
      title: 'What the weather left',
      body: `The panel marks the nights the weather took. Of the nights you found, count the ones that are
             clear.`,
      fields: [
        {
          id: 'observed',
          label: 'Of those nights, clear',
          unit: '',
          want: '2',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.observed)) return null;
        if (near(v.observed, 2, 0.01)) {
          return {
            level: 'ok',
            message:
              'Two: nights 1 and 9 are clear and nights 3, 5 and 7 are lost. That is one draw of the weather; another seed would give another count, and a plan states the expected number.',
          };
        }
        return {
          level: 'error',
          message:
            'Check nights 1, 3, 5, 7 and 9 in the panel: the first and the ninth are clear, the others are lost to weather.',
        };
      },
      tool: PLAN(),
    },
    {
      sid: 'the-other-target',
      stage: PLAN_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A northern target',
      body: `Change the target to the <strong>northern</strong> one (the second). From the same telescope its
             window on the first night is only about 1.2 hours, from 4.3 hours before local midnight to 3.2 before.`,
      prompt: 'What does that do to the campaign?',
      options: [
        'It ends it: a transit with its baseline needs 4.8 hours and the target is up for 1.2, so no transit can be caught whole from this site',
        'It halves the number of transits, because the window is shorter',
        'Nothing: a transit lasts 2.8 hours, and the window only needs to be that long',
        'It helps: a short window means less weather',
      ],
      answer: 0,
      hints: ['Compare 4.8 hours of target with the window the panel shows.'],
      because:
        'A window shorter than the transit plus baseline cannot hold one, however many nights there are. This is the first thing to check in a plan, before weather or cadence: the target has to be up long enough. A different site, or a time of year when the target is higher, is the remedy.',
      misconceptions: [
        {
          id: 'half',
          option: 1,
          say: 'It is not a fraction of the transits: no night has a window long enough, so the count is zero.',
        },
        {
          id: 'duration',
          option: 2,
          say: 'The baseline matters: without time on each side the depth cannot be measured against a flat star, so the window needs the transit and the baseline both.',
        },
      ],
      tool: PLAN({ target: 1 }),
    },
    {
      sid: 'visits-are-not-a-transit',
      stage: PLAN_STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Visits are not a transit',
      body: `The panel also plans three short visits a night, an hour and a half apart: a cadence designed to find an
             unknown period without being fooled by aliases.`,
      prompt: 'What sampling does a known transit want instead?',
      options: [
        'One continuous sequence from an hour before the predicted ingress to an hour after egress, because the shape of the dip is the measurement',
        'The same three visits a night, because a cadence that finds a period finds a transit',
        'One visit at the predicted mid-transit',
        'A visit every night for the whole ten nights',
      ],
      answer: 0,
      hints: [
        'A transit is a shape in time. What does a visit every hour and a half see of it?',
      ],
      because:
        'A transit lasts under three hours, and three visits spread over four and a half hours would sample it at three points. The sequence that measures a depth, a duration and a mid-transit time is continuous across the event with baseline on both sides. The cadence of the plan is for another question.',
      misconceptions: [
        {
          id: 'cadence',
          option: 1,
          say: 'That cadence tells a period from its aliases when the period is unknown; with a known ephemeris the question is a different one.',
        },
        {
          id: 'one',
          option: 2,
          say: 'A single point cannot give a depth against a baseline or a duration, and an error in the ephemeris would put it off the dip.',
        },
      ],
      tool: PLAN(),
    },
    {
      sid: 'the-campaign-in-one-line',
      stage: PLAN_STAGE,
      type: 'read',
      title: 'The campaign in one line',
      body: `A transit campaign is the intersection of three things: the <strong>ephemeris</strong> (when the
             transits are), the <strong>window</strong> (when the target is up in a dark sky, long enough for the transit and
             its baseline) and the <strong>weather</strong> (which takes nights at random). The answer is a list of nights and
             an expected number of whole transits, with the plan&rsquo;s assumptions: the ephemeris is exact, the baseline is
             an hour, the weather is the stated fraction.
             \n\nThe deeper steps put numbers on the share of the night a transit takes, on the expected count, and on what an
             ephemeris that is slowly wrong does to the baseline.`,
      tool: PLAN(),
    },
  ],
};

export const PLANNING_A_TRANSIT_CAMPAIGN_DEEPER = {
  id: 'planning-a-transit-campaign',
  steps: [
    {
      sid: 'the-share-of-the-night',
      after: 'which-nights',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The share of the night',
      body: `A transit with its baseline takes 4.8 hours. The window on the first night is 8.81 hours.`,
      prompt: 'The share of the night’s window that one transit uses',
      unit: '%',
      answer: 54,
      tolerance: 1,
      hints: ['Divide 4.8 by 8.81 and express it as a percent.'],
      worked:
        '4.8 / 8.81 = 0.545: more than half of the window. A transit that is centered an hour off the middle of the night still fits; one that falls more than about 2 hours from the middle of the window does not.',
      feedback: {
        close: 'Close. Divide 4.8 by 8.81 and multiply by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is about half the window.',
        off: '4.8 / 8.81 × 100.',
      },
      tool: PLAN(),
    },
    {
      sid: 'the-expected-count',
      after: 'what-the-weather-left',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The expected count',
      body: `Five nights qualify, and each night is clear with probability 0.6 (the panel&rsquo;s setting).`,
      prompt: 'The expected number of whole transits caught',
      unit: '',
      answer: 3.0,
      tolerance: 0.05,
      hints: ['Multiply the number of nights by the chance a night is clear.'],
      worked:
        '5 × 0.6 = 3.0. The panel’s draw gave 2, but the expectation is the plan’s statement, and the real count may be anywhere from 0 to 5: with correlated weather a bad stretch can take them all.',
      feedback: {
        close: 'Close. Multiply 5 by 0.6.',
        'wrong-order-of-magnitude':
          'A power of ten out: the expected count is between 0 and 5.',
        off: '5 × 0.6.',
      },
      tool: PLAN(),
    },
    {
      sid: 'the-ephemeris-grows-old',
      after: 'visits-are-not-a-transit',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'An ephemeris that grows old',
      body: `The period is known only to 0.001 days, and the last measured transit is 30 cycles before the one you
             plan. The error in the mid-transit time grows with the number of cycles.`,
      prompt: 'The uncertainty in the predicted mid-transit time',
      unit: 'h',
      answer: 0.72,
      tolerance: 0.02,
      hints: [
        'Multiply the period’s uncertainty by the number of cycles, then by 24 hours.',
      ],
      worked:
        '30 × 0.001 d = 0.03 d = 0.72 h. The hour of baseline covers it, but after about 60 cycles the uncertainty reaches 1.44 hours and the baseline has to widen or the ephemeris has to be remeasured.',
      feedback: {
        close: 'Close. 30 cycles times 0.001 days, converted to hours.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a fraction of an hour.',
        off: '30 × 0.001 × 24.',
      },
      tool: PLAN(),
    },
  ],
};

// =============================================================================
// Spanish words, step for step (the index is the alignment)
// =============================================================================

export const ONE_PLANET_EVERY_METHOD_ES = {
  title: 'Un planeta, todos los métodos',
  subtitle:
    'Sigue a un planeta por el tránsito, la curva de velocidades, el ajuste conjunto y la lista de comprobación, y anota cada registro con su incertidumbre',
  objectives: [
    'Decir qué da un tránsito (una razón de radios, una profundidad, la forma) y qué da una curva de velocidades (una amplitud), y que una densidad necesita las dos',
    'Leer la densidad de un planeta con su incertidumbre en un ajuste conjunto, y decir qué parte de esa incertidumbre es de la estrella',
    'Decir que un candidato que supera una lista de comprobación no está validado, y qué debe llevar un informe además de los valores',
    'Escribir un registro por método, cada uno con su valor, su incertidumbre, su método y su suposición',
  ],
  steps: {
    'two-methods-one-planet': {
      title: 'Dos métodos, un planeta',
      body: `Un planeta que pasa delante de su estrella la atenúa, y la caída es el área del planeta como fracción de la de la estrella: una <em>razón</em> de radios de 0,118, una profundidad del 1,40 por ciento, una forma que da el tamaño de la órbita en radios estelares (9,04) y un periodo de 3,52 días. El mismo planeta tira de su estrella a un lado y a otro, y la curva de velocidades da una amplitud de 85,6 metros por segundo.
             \n\nNinguno da lo que más queremos saber de la composición del planeta. Una densidad necesita una masa y un radio, y cada uno necesita a la <em>estrella</em>: la razón está en radios estelares, y la amplitud es una masa solo con la masa de la estrella dentro. El panel es el ajuste conjunto de los dos conjuntos de datos para un Júpiter caliente <strong>sintético</strong> (con un periodo como el de HD 209458 b, para que las respuestas se conozcan), con la incertidumbre de la estrella en los controles.`,
    },
    'what-needs-both': {
      title: 'Qué necesita los dos',
      body: `Mira qué mide cada método y qué deduce el panel de los dos juntos.`,
      prompt:
        '¿Cuál de estas cosas necesita la curva de tránsito y la de velocidades?',
      options: [
        'La densidad media del planeta: la masa de la curva de velocidades, el radio del tránsito y la estrella detrás de las dos',
        'El periodo orbital: hacen falta los dos métodos para hallarlo',
        'La razón de radios: la fija la curva de velocidades',
        'La profundidad de la caída: necesita la masa del planeta',
      ],
      hints: [
        'La densidad es masa entre volumen. ¿Qué método da una masa y cuál un tamaño?',
      ],
      because:
        'La densidad media. La curva de velocidades da la masa (con la masa de la estrella dentro), el tránsito da el radio (en radios estelares) y la densidad necesita las dos. El periodo y la profundidad salen solo del tránsito, y ninguno necesita la masa del planeta.',
      misconceptions: [
        {
          say: 'Cada método halla el periodo por sí solo; es lo que hace que los dos conjuntos de datos compartan un reloj, y por eso el ajuste puede usar ambos.',
        },
        {
          say: 'La razón de radios es del tránsito, y es el tamaño de la sombra; la curva de velocidades no sabe nada del tamaño.',
        },
      ],
    },
    'read-the-record': {
      title: 'Lee la densidad y lo que lleva',
      body: `Con la masa de la estrella incierta en un 5 por ciento, su radio en un 3,5 y los dos correlacionados (los valores con que se abre el panel), lee la <strong>densidad media</strong> del planeta y su <strong>incertidumbre a una sigma</strong> (el «más menos») en g/cm³. Un valor sin su incertidumbre todavía no es un registro.`,
      fields: [
        { label: 'Densidad media' },
        { label: 'Su incertidumbre a una sigma (más menos)' },
      ],
    },
    'the-star-share': {
      title: 'Cuánto es de la estrella',
      body: `La incertidumbre de la densidad tiene dos fuentes: los datos del propio planeta (el tránsito y las velocidades) y la masa y el radio declarados de la estrella. Pon las dos incertidumbres de la estrella en <strong>0</strong> y lee otra vez la incertidumbre de la densidad, y luego vuelve a ponerlas.`,
      prompt:
        '¿Qué fracción de la varianza de la densidad viene de la incertidumbre de la estrella con los valores iniciales?',
      options: [
        'Cerca de la mitad: los datos del planeta y la estrella aportan una parte parecida',
        'Casi nada: los datos deciden la densidad y la estrella solo fija una escala',
        'Casi todo: los datos no aportan nada',
        'No se puede decir sin conocer la densidad verdadera del planeta',
      ],
      hints: [
        'La lectura da la parte de la varianza que añade la estrella. Con la estrella exacta, la incertidumbre baja de 13,8 a cerca de 10 por ciento.',
      ],
      because:
        'Cerca de la mitad (el 46 por ciento de la varianza). Con la estrella tomada como exacta, la densidad sigue siendo incierta en cerca de un 10 por ciento por los datos del planeta, y la masa y el radio de la estrella añaden el resto. Una estrella mejor ayudaría tanto como una curva de luz mejor.',
      misconceptions: [
        {
          say: 'La estrella no es solo una escala: su radio fija el radio del planeta y su masa fija la masa del planeta, y la densidad hereda las dos.',
        },
        {
          say: 'Los datos sí aportan: con la estrella exacta la densidad sigue siendo incierta en cerca de un 10 por ciento.',
        },
      ],
    },
    'a-dip-is-a-candidate': {
      title: '¿Es un planeta?',
      body: `Antes de todo esto, la caída tenía que ser un planeta. El panel muestra un candidato (un sistema sintético distinto del de arriba; ningún panel lleva todos los métodos en una estrella) que ha pasado tres pruebas: si las caídas impares y pares coinciden, si aparece un segundo eclipse media órbita después y si la luz se mueve en el cielo durante la caída. Pasa las tres.`,
      prompt: '¿Validan al candidato como planeta las tres pruebas superadas?',
      options: [
        'No: ha superado las pruebas que se hicieron; lo que esas pruebas no pueden ver sigue abierto',
        'Sí: tres pruebas bastan para validar cualquier planeta',
        'Sí, si la caída es lo bastante profunda',
        'No: un candidato nunca puede validarse',
      ],
      hints: [
        'Una prueba puede rechazar un falso positivo; superarla no excluye los que la prueba no puede ver.',
      ],
      because:
        'Superar no es validar. Cada prueba rechaza algunos falsos positivos y deja pasar otros, y una lista con todo aprobado deja los que ninguna prueba podía ver. Validar es una afirmación sobre lo probable que es cada alternativa, no un recuento de pruebas superadas.',
      misconceptions: [
        {
          say: 'No hay un número de pruebas que baste en general; lo que importa es qué falsos positivos puede ver cada prueba y cuáles no.',
        },
        {
          say: 'Los candidatos se validan, mostrando que las alternativas son mucho menos probables que un planeta; superar una lista es una aportación, no el todo.',
        },
      ],
    },
    'the-record': {
      title: 'El registro',
      body: `Un informe de este planeta lleva una fila por cada cosa que dice, y cada fila tiene su <strong>valor</strong>, su <strong>incertidumbre</strong>, su <strong>método</strong> y su <strong>suposición</strong>: el periodo (el tránsito), la profundidad del 1,40 por ciento (el tránsito), la amplitud de velocidad de 85,6 m/s (las velocidades), la masa de 0,684 &plusmn; 0,024 masas de Júpiter (el ajuste conjunto, con la masa de la estrella dentro), el radio de 1,325 &plusmn; 0,064 radios de Júpiter (el ajuste conjunto, en radios estelares y por tanto con el radio de la estrella dentro), la densidad de 0,365 &plusmn; 0,050 g/cm³ y, junto a ellas, la fila de la comprobación: <em>supera tres pruebas, no validado</em>.
             \n\nHay dos cosas que van en el informe y no son valores: la parte de cada incertidumbre que es de la estrella, porque dice dónde ayudaría una medida mejor, y los fallos y las pruebas sin decidir, porque quien lee necesita saber qué se intentó. Los pasos más profundos ponen el cuarto método, un eclipse, junto a estos.`,
    },
  },
};

export const ONE_PLANET_EVERY_METHOD_DEEPER_ES = {
  steps: {
    'the-depth': {
      title: 'De la razón a la caída',
      body: `Una caída es el área del planeta entre la de la estrella, así que es la <em>razón</em> de radios al cuadrado. La razón que dio el tránsito es 0,1184.`,
      prompt: 'La profundidad de la caída, como porcentaje',
      hints: ['Eleva 0,1184 al cuadrado y multiplica por 100.'],
      worked:
        '0,1184² = 0,01402, así que el 1,40 por ciento de la luz de la estrella. Un planeta de una décima del radio de la estrella tapa una centésima de su luz.',
      feedback: {
        close: 'Casi. Eleva la razón al cuadrado y exprésala como porcentaje.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: eleva la razón al cuadrado y convierte la fracción en porcentaje.',
        off: '0,1184 × 0,1184 × 100.',
      },
    },
    'what-the-star-costs': {
      title: 'La parte del propio planeta',
      body: `Pon las incertidumbres de masa y radio de la estrella en <strong>0</strong>: la incertidumbre de la densidad que queda es solo la de los datos del planeta. Lee el «más menos» y divídelo entre la densidad para obtener un porcentaje.`,
      prompt:
        'La incertidumbre de la densidad con la estrella exacta, como porcentaje del valor',
      hints: ['Léela con las dos incertidumbres de la estrella en 0 %.'],
      worked:
        'Cerca del 10,1 por ciento. Con los valores iniciales era 13,8, y las dos partes se suman en cuadratura: la parte de la estrella sola es cerca de 9,3 por ciento, y 10,1² + 9,3² es 13,8².',
      feedback: {
        close:
          'Casi. Lee la incertidumbre relativa de la densidad con las dos incertidumbres de la estrella en 0.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es de unos pocos por ciento a unas pocas decenas, no una décima ni mil.',
        off: 'Pon las dos incertidumbres de la estrella en 0 % y lee la de la densidad.',
      },
    },
    'a-worse-star': {
      title: 'Una estrella mal conocida',
      body: `Ahora pon las incertidumbres de masa y radio de la estrella en <strong>8 por ciento</strong> (el sexto paso de los controles), con la misma correlación, y lee la incertidumbre de la densidad como porcentaje de su valor (el «más menos» entre la densidad).`,
      prompt:
        'La incertidumbre de la densidad con la estrella al 8 por ciento, como porcentaje del valor',
      hints: [
        'Es más que el 13,8 por ciento de los valores iniciales, y la parte de la estrella crece.',
      ],
      worked:
        'Cerca del 24,1 por ciento, y el 82 por ciento de la varianza es ya de la estrella. Pasado este punto una curva de luz mejor no compra nada: la estrella es el límite, y por eso los parámetros estelares de un anfitrión se miden antes de interpretar sus planetas.',
      feedback: {
        close:
          'Casi. Pon las dos incertidumbres en 8 por ciento y lee la de la densidad.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son unas pocas decenas de por ciento, no unos pocos ni cientos.',
        off: 'Las dos incertidumbres de la estrella en 8 por ciento, correlación 0,5: lee la incertidumbre relativa de la densidad.',
      },
    },
    'the-eclipse': {
      title: 'Un cuarto método: el eclipse',
      body: `Cuando un planeta pasa detrás de su estrella, la luz que emite desaparece un rato, y la <strong>profundidad del eclipse</strong> en una banda es el brillo propio del planeta entre el de la estrella. El panel muestra cuatro bandas de un planeta <strong>sintético</strong> (otro sistema, declarado como tal; no se comparó ninguna tabla publicada). Con la luz reflejada en <strong>suponer ninguna</strong>, lee la temperatura de brillo en la banda de 3,2 a 4,0 micras.`,
      prompt: 'La temperatura de brillo en la banda de 3,2 a 4,0 micras',
      hints: [
        'Es la temperatura del cuerpo negro que daría esa profundidad en esa banda.',
      ],
      worked:
        'Cerca de 2094 K. Es una cota bajo suposiciones que declara la lectura (un cuerpo negro uniforme, sin luz reflejada, una sola capa isoterma): es el lado diurno del planeta en una banda, no su temperatura, y va en el informe con esas palabras.',
      feedback: {
        close:
          'Casi. Lee la fila de 3,2 a 4,0 micras con la luz reflejada en suponer ninguna.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el lado diurno de un planeta caliente está en un par de miles de kelvin.',
        off: 'Pon la luz reflejada en suponer ninguna y lee la temperatura de brillo de la tercera banda.',
      },
    },
  },
};

export const WHAT_KINDS_OF_PLANETS_EXIST_ES = {
  title: '¿Qué tipos de planetas existen?',
  subtitle:
    'Lee los planetas por su masa y su radio, y luego la cuadrícula de tamaños y periodos de un sondeo frente a lo que el sondeo podía ver',
  objectives: [
    'Leer la densidad media de un planeta por su lugar entre las líneas de densidad constante de un diagrama masa-radio, y decir qué dice y qué no dice una densidad baja',
    'Decir que un sondeo ve más fácilmente los planetas grandes y cercanos, y leer la probabilidad de que recupere un planeta de un tamaño y periodo dados',
    'Leer una tasa a partir de unos pocos planetas listados, y decir por qué un intervalo sin listados es un límite superior en un sitio y no está acotado en otro',
    'Decir que un diagrama de masa y radio no puede decir si un planeta conserva una atmósfera',
  ],
  steps: {
    'a-diagram-of-planets': {
      title: 'Un diagrama de planetas',
      body: `Pon cada planeta en una gráfica de su <strong>masa</strong> contra su <strong>radio</strong>, ambos en unidades terrestres, y añade líneas de <strong>densidad media</strong> constante. Los planetas del Sistema Solar caen en grupos: la Tierra, Venus y Mercurio cerca de 5,5 gramos por centímetro cúbico, roca y metal; Júpiter y Saturno cerca de 1,3 y 0,7, sobre todo hidrógeno; Urano y Neptuno cerca de 1,3 a 1,6, en medio.
             \n\nEl panel muestra las líneas y el Sistema Solar, con la caja del Júpiter caliente sintético de la investigación <em>Un planeta, todos los métodos</em>, dibujada con su incertidumbre. Nada de esto dice de qué está hecho un planeta; dice qué densidad tiene, y varias mezclas pueden tener una misma densidad.`,
    },
    'what-the-density-says': {
      title: 'Qué dice la caja',
      body: `La caja del Júpiter caliente está en unas 217 masas terrestres y 14,9 radios terrestres, con las líneas de 0,3, 1, 3, 5,51 y 12 gramos por centímetro cúbico alrededor.`,
      prompt: '¿Qué afirmación apoya su lugar?',
      options: [
        'Su densidad es cerca de 0,37 g/cm³, muy por debajo de cualquier roca: la mayor parte de su volumen debe ser un gas ligero',
        'Está hecho sobre todo de roca, porque es pesado',
        'Es un gemelo de Júpiter, porque tiene casi la misma masa',
        'Tiene una atmósfera fina, porque su densidad es baja',
      ],
      hints: [
        'Busca la línea de densidad constante más cercana y compárala con la línea de 5,51 de la Tierra.',
      ],
      because:
        'Una densidad entre 0,3 y 0,4 g/cm³ está muy por debajo de la roca, así que gran parte del volumen es un gas de baja densidad. Un diagrama puede decir tanto; no puede decir cómo se mezclan el gas y un posible núcleo, y no dice nada del grosor de una atmósfera.',
      misconceptions: [
        {
          say: 'La masa sola no es densidad: este planeta es pesado y muy grande, y el gran volumen da la densidad baja.',
        },
        {
          say: 'Júpiter es más denso (1,33 g/cm³) y más pequeño. Un planeta de la masa de Júpiter pero de radio mucho mayor es otro objeto.',
        },
      ],
    },
    'what-the-survey-sees': {
      title: 'Lo que un sondeo podía ver',
      body: `Un diagrama de los planetas que halló un sondeo es un diagrama de lo que el sondeo <em>podía</em> hallar. El panel muestra, para un sondeo sintético de 2000 estrellas, la probabilidad de que se recupere un planeta en tránsito de un tamaño y un periodo dados: la <strong>eficiencia</strong>. Combina la caída menos profunda de un planeta pequeño, los menos tránsitos de un periodo largo y la propia búsqueda del sondeo. Los planetas sintéticos salen de una verdad conocida, así que los pasos siguientes pueden decir cuánto se aleja el recuento del sondeo de ella.`,
    },
    'larger-is-easier': {
      title: 'Más grande es más fácil',
      body: `Con periodos de 32 a 64 días, el panel da la eficiencia de los planetas de 0,5 a 1 radios terrestres y de los de 4 a 8 radios terrestres.`,
      prompt: '¿Cómo se comparan?',
      options: [
        'Los planetas grandes se recuperan unas cuatro veces más a menudo (81 por ciento frente a 20), así que un recuento de planetas grandes está más cerca de la verdad',
        'Se recuperan por igual, porque el periodo es el mismo',
        'Los planetas pequeños se recuperan más a menudo, porque hay más',
        'Ninguno se recupera, porque 32 a 64 días es demasiado largo para un sondeo',
      ],
      hints: [
        'Lee las dos barras del panel en el intervalo de periodos de 32 a 64 días.',
      ],
      because:
        'La eficiencia entre 32 y 64 días es 81 por ciento para 4 a 8 radios terrestres y 20 por ciento para 0,5 a 1: la caída de un planeta pequeño es poco profunda, y el sondeo halla uno de cada cinco. La abundancia no cambia la probabilidad de recuperar un planeta dado; cambia cuántos hay que recuperar.',
      misconceptions: [
        {
          say: 'El periodo es el mismo, pero la caída no: la del planeta pequeño es mucho menos profunda y a menudo se pierde en el ruido.',
        },
        {
          say: 'Cuántos planetas hay no es lo mismo que la probabilidad de hallar uno que está ahí; la eficiencia es lo segundo.',
        },
      ],
    },
    'a-rate-from-few': {
      title: 'Una tasa a partir de unos pocos',
      body: `En la cuadrícula, el intervalo de <strong>0,5 a 1 radios terrestres</strong> y <strong>32 a 64 días</strong> lista solo unos pocos planetas, porque el sondeo apenas podía verlos. Lee cuántos lista y la tasa por estrella en que la completitud del sondeo convierte ese recuento (la primera semilla, fiabilidad como se declara).`,
      fields: [
        { label: 'Planetas listados en el intervalo' },
        { label: 'La tasa, en planetas por estrella' },
      ],
    },
    'what-an-atmosphere-needs': {
      title: '¿Podría tener una atmósfera?',
      body: `Una pregunta natural es si un planeta de una masa y un radio dados conserva un gas, y el diagrama no la responde. Una densidad baja dice que el planeta <em>tiene</em> una envoltura gruesa; si un mundo pequeño y caliente puede <em>retener</em> una es un equilibrio entre lo rápido que se mueve el gas a su temperatura y lo que tarda en escapar, y depende de la luz de la estrella a lo largo del tiempo, que ningún diagrama de masa y radio lleva.
             \n\nEl cálculo del escape de un gas de un mundo quedó fuera de este proyecto (se juzgó que los modelos no podían sostenerlo al nivel que mantiene el resto de la unidad), así que este es un paso de lectura y no una investigación. La afirmación honesta de este diagrama es la de la caja: una densidad media, con su incertidumbre, y nada sobre lo que un planeta conserva.`,
    },
    'kinds-and-what-they-hide': {
      title: 'Tipos, y lo que oculta cada diagrama',
      body: `Dos diagramas, dos clases de afirmación. El diagrama masa&ndash;radio dice cuál es la densidad media de un planeta y por tanto a qué familia pertenece, con la incertidumbre que añade la estrella. La cuadrícula de tamaños y periodos dice cuántos planetas pudo contar un sondeo en cada intervalo, y una tasa sale solo cuando se declara la completitud del sondeo: pocos listados en un intervalo débil es un rango amplio, y un intervalo que el sondeo no podía ver no dice nada.
             \n\nNinguno de los dos diagramas es un mapa de los planetas que existen. Qué tipos parecen comunes en un listado depende de cuáles son fáciles de ver, y los pasos más profundos dicen cómo distinguirlo.`,
    },
  },
};

export const WHAT_KINDS_OF_PLANETS_EXIST_DEEPER_ES = {
  steps: {
    'jupiters-density': {
      title: 'La densidad de Júpiter por su lugar',
      body: `En unidades terrestres, la densidad es los 5,51 g/cm³ de la Tierra por la masa dividida entre el radio al cubo. Júpiter tiene 317,8 masas terrestres y 10,96 radios terrestres.`,
      prompt: 'La densidad media de Júpiter',
      hints: ['5,51 × 317,8 / 10,96³; el cubo de 10,96 es cerca de 1317.'],
      worked:
        '10,96³ = 1317, y 317,8 / 1317 = 0,2413, así que 5,51 × 0,2413 = 1,33 g/cm³: una cuarta parte de la densidad de la Tierra, y por eso los planetas de su clase están lejos de la línea de la roca.',
      feedback: {
        close:
          'Casi. Eleva el radio al cubo, divide la masa entre él y multiplica por 5,51.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un gigante gaseoso tiene cerca de una cuarta parte de la densidad de la Tierra, no diez veces ni una décima.',
        off: '5,51 × 317,8 / 10,96³.',
      },
    },
    'efficiency-ratio': {
      title: 'Cuánto más fácil',
      body: `Entre 32 y 64 días la eficiencia es 81 por ciento para planetas de 4 a 8 radios terrestres y 20 por ciento para planetas de 0,5 a 1.`,
      prompt: '¿Cuántas veces es más probable recuperar el planeta grande?',
      hints: ['Divide la eficiencia mayor entre la menor.'],
      worked:
        '81 / 20 = 4,05, que es 4,0 con la precisión que da el panel. Para contar los planetas pequeños con honradez, cada uno listado tiene que representar unos cinco que había.',
      feedback: {
        close: 'Casi. Divide 81 entre 20.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la razón es unos pocos, no decenas.',
        off: '81 / 20.',
      },
    },
    'an-upper-limit': {
      title: 'Dos intervalos vacíos',
      body: `Dos intervalos no listan ningún planeta. En el de 4 a 8 radios terrestres y 2 a 4 días el sondeo listaría unos 242 planetas por cada planeta por estrella que hay; en el de 0,5 a 1 radios terrestres y 128 a 256 días solo unos 1,3. El panel da al primero un límite superior de cerca de 0,012 por estrella y dice que el segundo <em>no está acotado</em>.`,
      prompt: '¿Por qué los mismos listados vacíos dicen cosas tan distintas?',
      options: [
        'El primer intervalo se buscó a fondo, así que no hallar ninguno descarta una tasa alta; el segundo apenas se buscó, así que no hallar ninguno casi no dice nada',
        'El primer intervalo tiene menos planetas en realidad, y el segundo más',
        'El panel es incoherente: un intervalo vacío es un intervalo vacío',
        'El primer intervalo está más cerca de la estrella, así que no se cuentan los planetas',
      ],
      hints: [
        'Pregunta cuántos planetas habría listado el sondeo si estuvieran ahí a una tasa dada.',
      ],
      because:
        'La completitud. Con un rendimiento de 242 por planeta por estrella, una tasa por encima de cerca de 0,012 habría producido muy probablemente un listado, así que ninguno es un límite superior. Con 1,3, una tasa de uno por estrella produciría un listado de media, así que ninguno no dice nada: el sondeo es ciego ahí.',
      misconceptions: [
        {
          say: 'La verdad puede ser cualquier cosa en los dos; lo que difiere es lo bien que el sondeo habría visto un planeta si lo hubiera.',
        },
        {
          say: 'Un listado vacío significa cosas distintas cuando la búsqueda fue a fondo y cuando fue ciega; declarar el rendimiento es lo que las separa.',
        },
      ],
    },
    'a-selection-in-each-diagram': {
      title: 'La selección de cada diagrama',
      body: `Para los planetas más pequeños la eficiencia cae de 64 por ciento a 1 a 2 días a 8 por ciento a 128 a 256 días. Para los mayores se mantiene por encima de 99 por ciento hasta 32 días.`,
      prompt:
        '¿Qué diagrama de los planetas que un sondeo <em>listó</em> engañaría si se leyera como un diagrama de los planetas que existen?',
      options: [
        'Los dos: el listado de periodo contra radio se agolpa hacia los planetas grandes y cercanos porque son fáciles de ver, y el diagrama masa-radio de planetas medidos se limita a los que tienen tránsito y amplitud de velocidad',
        'Ninguno: un sondeo lista todos los planetas que hay',
        'Solo el diagrama periodo–radio: un diagrama masa-radio no tiene selección',
        'Solo el diagrama masa-radio: un diagrama periodo–radio cuenta todos los planetas',
      ],
      hints: [
        'Un planeta tiene que hallarse, y para una masa tiene que medirse además por otro método.',
      ],
      because:
        'Los dos. El listado de tamaños y periodos lo da la eficiencia, mucho menor para planetas pequeños y lejanos. El diagrama masa–radio guarda solo los planetas con masa medida además, que son los de gran amplitud de velocidad. Una tasa necesita la completitud; una densidad media necesita las dos medidas, y las que faltan no faltan al azar.',
      misconceptions: [
        {
          say: 'Un sondeo lista lo que podía ver; la eficiencia de 8 por ciento de los planetas pequeños de periodo largo dice que ve uno de cada doce.',
        },
        {
          say: 'Un diagrama masa-radio tiene su propia selección: un planeta necesita una masa, y las masas se miden en los planetas que más tiran de su estrella.',
        },
      ],
    },
  },
};

export const THE_TRANSIT_THAT_WAS_A_STAR_ES = {
  title: 'El tránsito que era una estrella',
  subtitle:
    'Cuatro candidatos cuyas caídas eran en realidad una estrella: qué rechazó a dos de ellos, qué no puede ver una lista de comprobación en los otros y qué hace una vecina a la caída de un planeta real',
  objectives: [
    'Decir por qué las caídas alternas de distinta profundidad apuntan a un par eclipsante al doble del periodo',
    'Decir qué hace un par de estrellas iguales a la prueba impar-par, y qué ve la prueba de la imagen diferencia',
    'Decir por qué una mezcla dentro del radio de exclusión de la prueba supera todas las pruebas, y qué cuesta eso a una afirmación',
    'Decir las dos formas en que una vecina cambia un tránsito: puede ser la caída, o puede diluir una real',
  ],
  steps: {
    'a-dip-with-company': {
      title: 'Una caída con compañía',
      body: `Muchas estrellas de un sondeo tienen una vecina demasiado cerca para separarla, y una vecina puede ser una <strong>binaria eclipsante</strong>: dos estrellas que pasan una delante de la otra. Sus eclipses parecen un tránsito, solo que más o menos profundos, y la luz de la estrella objetivo los diluye. El panel tiene ocho candidatos <strong>sintéticos</strong>; esta investigación recorre cuatro cuya verdad es una mezcla.
             \n\nEl candidato <strong>B</strong> es el primero. Sus caídas impares y pares (las de órbitas alternas) se dibujan por separado: las dos difieren por un margen amplio (0,93 por ciento y 0,44 por ciento).`,
    },
    'odd-and-even': {
      title: 'Impares y pares',
      body: `Un planeta tapa la misma fracción de la luz en cada tránsito. Las caídas del candidato B vienen en dos tamaños que se alternan.`,
      prompt: '¿Qué dice la alternancia?',
      options: [
        'Las caídas son dos eclipses distintos de un par de estrellas: la más profunda es una estrella delante de la otra, la menos profunda lo inverso, y el periodo verdadero es el doble del buscado',
        'El planeta cambia de tamaño de una órbita a la siguiente',
        'El telescopio mide mal cada segundo tránsito',
        'El planeta tiene dos lunas, una por cada caída',
      ],
      hints: [
        'Un par de estrellas de distinto brillo superficial da un eclipse más profundo cuando se tapa la estrella más caliente.',
      ],
      because:
        'Un par de estrellas de distinto brillo da dos eclipses distintos por órbita, y una búsqueda que mira una caída por periodo halla la mitad del periodo real. La diferencia impar–par es 98 veces su incertidumbre, así que no es ruido. Un planeta no cambia de tamaño, y por eso funciona la prueba.',
      misconceptions: [
        {
          say: 'Un planeta no cambia de tamaño entre órbitas; un cambio de profundidad de esa escala indica que no es un solo cuerpo cruzando una sola estrella.',
        },
        {
          say: 'La diferencia es unas 98 veces su incertidumbre: es demasiado grande para ser una mala medida de una sola profundidad.',
        },
      ],
    },
    'the-twin': {
      title: 'La gemela',
      body: `El candidato <strong>D</strong> tiene caídas impares y pares iguales (0,715 y 0,713 por ciento), ningún segundo eclipse y <em>ninguna imagen</em>, así que no se hizo la prueba de la imagen diferencia. Pasa todas las pruebas que se le hicieron.`,
      prompt: '¿Qué puede decirse de D?',
      options: [
        'Nada en los datos lo rechaza, y nada lo valida: dos estrellas iguales dan caídas iguales, y no se hizo la única prueba que podía ver a una vecina',
        'Es un planeta, porque pasa todas las pruebas que se hicieron',
        'Es una estrella, porque las caídas son iguales',
        'No puede ser nada, porque no hay imágenes',
      ],
      hints: [
        'Dos estrellas idénticas que se eclipsan dan la misma caída siempre. ¿Qué prueba no se hizo?',
      ],
      because:
        'D supera las pruebas, y es una mezcla justo de la clase que las dos primeras no pueden captar: un par de estrellas iguales al doble del periodo da una caída cada periodo, todas iguales, así que las impares y las pares coinciden y no aparece nada media órbita después. Solo una prueba de dónde cae la luz en el cielo podía verla, y no se hizo.',
      misconceptions: [
        {
          say: 'Superar las pruebas que se pudieron hacer no es validar; una prueba que no se hizo no podía rechazar nada.',
        },
        {
          say: 'Caídas iguales no prueban una estrella: son lo que dan dos estrellas iguales y también lo que da un planeta, que es el punto.',
        },
      ],
    },
    'the-frames': {
      title: 'Las imágenes',
      body: `El candidato <strong>E</strong> tiene las mismas caídas iguales, pero con imágenes tomadas durante las caídas y entre ellas. La prueba de la <strong>imagen diferencia</strong> mide dónde está en el cielo la luz que desapareció. Lee a qué distancia del objetivo queda el centroide de la luz que falta, en píxeles.`,
      fields: [{ label: 'Desplazamiento de la luz que cae' }],
    },
    'too-close-to-see': {
      title: 'Demasiado cerca para verla',
      body: `El candidato <strong>G</strong> también tiene imágenes y las mismas caídas iguales. La luz que cae está a solo 0,17 píxeles del objetivo, y el radio de exclusión de la prueba para este es 0,30. Supera las tres pruebas.`,
      prompt: '¿Qué significa que G supere la prueba del centroide?',
      options: [
        'Significa que la vecina, si la hay, está dentro del radio de exclusión de la prueba: la prueba no puede situar la caída fuera del objetivo, y una mezcla tan cercana la supera',
        'Significa que la caída está en el objetivo, así que G es un planeta',
        'Significa que la prueba está rota',
        'Significa que el radio de exclusión es cero',
      ],
      hints: [
        'Una prueba que mide una posición tiene un desplazamiento mínimo que puede resolver, y por debajo dice en el objetivo.',
      ],
      because:
        'La prueba no ve dentro de su radio de exclusión. G pasa porque la caída está a menos de 0,30 píxeles del objetivo, lo que incluye una vecina que de verdad está a 0,15 (activa la verdad del panel para ver que G es una mezcla). Una prueba del centroide superada dice que la caída está en el objetivo dentro de ese radio, no mejor.',
      misconceptions: [
        {
          say: '«En el objetivo» significa dentro del radio de exclusión, que aquí es mayor que la separación de una mezcla que de verdad está ahí.',
        },
        {
          say: 'La prueba funciona como se diseñó; tiene una resolución, y una vecina más cercana que eso la supera.',
        },
      ],
    },
    'the-whole-story': {
      title: 'La historia entera',
      body: `Una vecina cambia un tránsito de dos formas. Puede <strong>ser</strong> la caída: un par eclipsante que las pruebas rechazan cuando pueden verlo (B por sus dos profundidades, E por dónde cae la luz) y supera cuando no pueden (D sin imágenes, G dentro del radio de exclusión). O puede <strong>diluir</strong> un planeta real: la luz de más rellena la caída, y el planeta se mide menor de lo que es. El panel de dilución muestra el segundo caso: un planeta medido de 2 radios terrestres con una compañera una magnitud más débil es un planeta de 2,4.
             \n\nLos dos casos son opuestos en lo que hacen a una afirmación: el primero puede hacer un planeta de una estrella, y el segundo puede hacer que parezca rocoso un mundo que no lo era. La respuesta en ambos es una imagen de alta resolución del anfitrión, a lo que los pasos más profundos ponen números.`,
    },
  },
};

export const THE_TRANSIT_THAT_WAS_A_STAR_DEEPER_ES = {
  steps: {
    'the-two-depths': {
      title: 'Cuánto menos profunda',
      body: `Las caídas impares del candidato B tienen un 0,927 por ciento de profundidad y las pares un 0,436 por ciento.`,
      prompt: 'La profundidad par como fracción de la impar',
      hints: ['Divide la profundidad par entre la impar.'],
      worked:
        '0,436 / 0,927 = 0,47. Para dos eclipses de un mismo par, la razón de profundidades es la razón de los brillos superficiales de las dos estrellas, así que la estrella que está delante en el eclipse más profundo es cerca del doble de brillante por unidad de área que la otra.',
      feedback: {
        close: 'Casi. Divide 0,436 entre 0,927.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las dos profundidades son de un tamaño parecido, así que la razón está cerca de un medio.',
        off: '0,436 / 0,927.',
      },
    },
    'the-diluted-radius': {
      title: 'El planeta tras el resplandor',
      body: `Una curva de luz mezclada dio un planeta de 2,0 radios terrestres, y una compañera en la apertura es una magnitud más débil que la estrella. La corrección del panel es la raíz cuadrada de uno más la razón de flujos de la compañera.`,
      prompt: 'El radio verdadero del planeta',
      hints: [
        'La razón de flujos de una estrella una magnitud más débil es 10 elevado a menos 0,4, cerca de 0,398.',
      ],
      worked:
        'La razón de flujos es 0,398, la corrección es √1,398 = 1,18 y el radio 2,0 × 1,18 = 2,37 R⊕. Siempre sube: una vecina solo puede hacer que un planeta parezca menor.',
      feedback: {
        close: 'Casi. Multiplica 2,0 por la raíz cuadrada de 1 más 0,398.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la corrección es una fracción de un radio, no un factor de diez.',
        off: '2,0 × √(1 + 10^(−0,4)).',
      },
    },
    'the-share-of-the-light': {
      title: 'Cuánta de la luz es de la vecina',
      body: `Pon el contraste de la compañera en <strong>0,5</strong> magnitudes y lee la parte de la luz de la apertura que no viene de la estrella en tránsito.`,
      prompt: 'La parte de la luz que viene de la compañera',
      hints: [
        'Es f entre 1 + f, donde f es la razón de flujos, 0,631 para media magnitud.',
      ],
      worked:
        '0,631 / 1,631 = 0,387: casi dos quintos de la luz no son de la estrella objetivo, y el radio del planeta sale demasiado pequeño por un factor de 1,28.',
      feedback: {
        close: 'Casi. La parte es f / (1 + f) con f = 10^(−0,2).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la parte es unas pocas decenas de por ciento.',
        off: '0,631 / 1,631 × 100.',
      },
    },
    'how-faint-is-harmless': {
      title: 'Cuán débil es inofensiva',
      body: `La dilución cambia un radio en menos de un uno por ciento cuando la corrección es menor que 1,01, es decir, cuando la razón de flujos es menor que 0,0201.`,
      prompt:
        'El contraste de la compañera con el que la corrección baja al 1 por ciento',
      hints: [
        'El contraste en magnitudes es −2,5 veces el logaritmo decimal de la razón de flujos.',
      ],
      worked:
        '−2,5 log₁₀(0,0201) = 4,24 magnitudes: una compañera más de cuatro magnitudes más débil cambia un radio en menos de un uno por ciento, y una tres magnitudes más débil en un tres.',
      feedback: {
        close: 'Casi. Toma −2,5 veces el logaritmo decimal de 0,0201.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son unas pocas magnitudes.',
        off: '−2,5 × log₁₀(0,0201).',
      },
    },
  },
};

export const PLANNING_A_TRANSIT_CAMPAIGN_ES = {
  title: 'Planificar una campaña de tránsitos',
  subtitle:
    'Un planeta con una efeméride conocida, un observatorio, diez noches y el tiempo: qué tránsitos pueden captarse enteros y qué deja el cielo',
  objectives: [
    'Decir que una campaña de tránsitos necesita un tránsito entero y una línea base a cada lado dentro de la ventana de la noche, y hallar las noches que cumplen a partir de una efeméride',
    'Decir que el tiempo se lleva noches al azar y que un plan declara un recuento esperado, no una promesa',
    'Decir que una cadencia pensada para hallar un periodo no es una secuencia de tránsito',
    'Decir que un objetivo que está arriba demasiado poco tiempo no puede planificarse, y qué hace una efeméride que envejece a la línea base',
  ],
  steps: {
    'what-a-campaign-needs': {
      title: 'Qué necesita una campaña',
      body: `Un planeta de periodo conocido transita en momentos que puedes predecir, así que la pregunta no es <em>si</em> mirar sino <em>cuándo puede captarse entero</em>. Supón que un planeta transita cada <strong>2 días</strong>, que el primer tránsito está centrado <strong>1,0 hora después de la medianoche local</strong> de la primera noche, y que un tránsito dura <strong>2,8 horas</strong>. Para medir su profundidad quieres una hora de línea base a cada lado, así que <strong>4,8 horas</strong> seguidas de objetivo, cielo oscuro y buen tiempo.
             \n\nEl panel es el planificador de ventanas de observación para un telescopio de Cerro Tololo y un objetivo austral. Cada noche muestra la ventana en que el objetivo está arriba y el cielo oscuro (de 4,2 horas antes de la medianoche local a 4,7 horas después, la primera noche: 8,8 horas), y qué noches se llevó el tiempo (un sorteo sintético, con una semilla). Las visitas que también planea son una cadencia para hallar un periodo; esta investigación usa solo las ventanas y el tiempo.`,
    },
    'which-nights': {
      title: 'Qué noches',
      body: `Un tránsito cada 2 días cae a la misma hora de la noche una noche <em>sí y otra no</em>, y las noches intermedias no tienen ninguno. De las 10 noches del panel, cuenta las noches en que un tránsito entero más su línea base cabe en la ventana, sin contar el tiempo.`,
      fields: [{ label: 'Noches con un tránsito entero y línea base' }],
    },
    'what-the-weather-left': {
      title: 'Lo que dejó el tiempo',
      body: `El panel marca las noches que se llevó el tiempo. De las noches que hallaste, cuenta las que están despejadas.`,
      fields: [{ label: 'De esas noches, despejadas' }],
    },
    'the-other-target': {
      title: 'Un objetivo del norte',
      body: `Cambia el objetivo al <strong>del norte</strong> (el segundo). Desde el mismo telescopio su ventana de la primera noche es de solo 1,2 horas, de 4,3 horas antes de la medianoche local a 3,2 antes.`,
      prompt: '¿Qué le hace eso a la campaña?',
      options: [
        'La termina: un tránsito con su línea base necesita 4,8 horas y el objetivo está arriba 1,2, así que no puede captarse ningún tránsito entero desde este observatorio',
        'Reduce a la mitad el número de tránsitos, porque la ventana es más corta',
        'Nada: un tránsito dura 2,8 horas, y la ventana solo necesita ser de esa duración',
        'Ayuda: una ventana corta significa menos mal tiempo',
      ],
      hints: [
        'Compara 4,8 horas de objetivo con la ventana que muestra el panel.',
      ],
      because:
        'Una ventana más corta que el tránsito más la línea base no puede contener uno, por muchas noches que haya. Es lo primero que hay que comprobar en un plan, antes del tiempo o la cadencia: el objetivo tiene que estar arriba el tiempo suficiente. Otro observatorio, o una época del año en que el objetivo esté más alto, es el remedio.',
      misconceptions: [
        {
          say: 'No es una fracción de los tránsitos: ninguna noche tiene una ventana suficiente, así que el recuento es cero.',
        },
        {
          say: 'La línea base importa: sin tiempo a cada lado no puede medirse la profundidad frente a una estrella plana, así que la ventana necesita el tránsito y la línea base.',
        },
      ],
    },
    'visits-are-not-a-transit': {
      title: 'Las visitas no son un tránsito',
      body: `El panel también planea tres visitas cortas por noche, separadas una hora y media: una cadencia pensada para hallar un periodo desconocido sin dejarse engañar por alias.`,
      prompt: '¿Qué muestreo quiere en cambio un tránsito conocido?',
      options: [
        'Una secuencia continua desde una hora antes del ingreso previsto hasta una hora después del egreso, porque la forma de la caída es la medida',
        'Las mismas tres visitas por noche, porque una cadencia que halla un periodo halla un tránsito',
        'Una visita en el mínimo previsto del tránsito',
        'Una visita cada noche durante las diez noches',
      ],
      hints: [
        'Un tránsito es una forma en el tiempo. ¿Qué ve de ella una visita cada hora y media?',
      ],
      because:
        'Un tránsito dura menos de tres horas, y tres visitas repartidas en cuatro horas y media lo muestrearían en tres puntos. La secuencia que mide una profundidad, una duración y un instante de mitad de tránsito es continua a lo largo del suceso con línea base a ambos lados. La cadencia del plan es para otra pregunta.',
      misconceptions: [
        {
          say: 'Esa cadencia distingue un periodo de sus alias cuando el periodo se desconoce; con una efeméride conocida la pregunta es otra.',
        },
        {
          say: 'Un solo punto no puede dar una profundidad frente a una línea base ni una duración, y un error en la efeméride lo pondría fuera de la caída.',
        },
      ],
    },
    'the-campaign-in-one-line': {
      title: 'La campaña en una línea',
      body: `Una campaña de tránsitos es la intersección de tres cosas: la <strong>efeméride</strong> (cuándo están los tránsitos), la <strong>ventana</strong> (cuándo está el objetivo arriba en un cielo oscuro, el tiempo suficiente para el tránsito y su línea base) y el <strong>tiempo</strong> (que se lleva noches al azar). La respuesta es una lista de noches y un número esperado de tránsitos enteros, con las suposiciones del plan: la efeméride es exacta, la línea base es de una hora, el tiempo es la fracción declarada.
             \n\nLos pasos más profundos ponen números a la parte de la noche que ocupa un tránsito, al recuento esperado y a lo que hace una efeméride que se equivoca poco a poco a la línea base.`,
    },
  },
};

export const PLANNING_A_TRANSIT_CAMPAIGN_DEEPER_ES = {
  steps: {
    'the-share-of-the-night': {
      title: 'La parte de la noche',
      body: `Un tránsito con su línea base ocupa 4,8 horas. La ventana de la primera noche es de 8,81 horas.`,
      prompt: 'La parte de la ventana de la noche que usa un tránsito',
      hints: ['Divide 4,8 entre 8,81 y exprésalo como porcentaje.'],
      worked:
        '4,8 / 8,81 = 0,545: más de la mitad de la ventana. Un tránsito centrado una hora fuera del medio de la noche aún cabe; uno que cae a más de unas 2 horas del medio de la ventana no.',
      feedback: {
        close: 'Casi. Divide 4,8 entre 8,81 y multiplica por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es cerca de la mitad de la ventana.',
        off: '4,8 / 8,81 × 100.',
      },
    },
    'the-expected-count': {
      title: 'El recuento esperado',
      body: `Cumplen cinco noches, y cada noche está despejada con probabilidad 0,6 (el ajuste del panel).`,
      prompt: 'El número esperado de tránsitos enteros captados',
      hints: [
        'Multiplica el número de noches por la probabilidad de que una noche esté despejada.',
      ],
      worked:
        '5 × 0,6 = 3,0. El sorteo del panel dio 2, pero la esperanza es la afirmación del plan, y el recuento real puede ir de 0 a 5: con tiempo correlacionado una mala racha puede llevárselos todos.',
      feedback: {
        close: 'Casi. Multiplica 5 por 0,6.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el recuento esperado está entre 0 y 5.',
        off: '5 × 0,6.',
      },
    },
    'the-ephemeris-grows-old': {
      title: 'Una efeméride que envejece',
      body: `El periodo se conoce solo con 0,001 días, y el último tránsito medido está 30 ciclos antes del que planeas. El error en el instante de mitad de tránsito crece con el número de ciclos.`,
      prompt: 'La incertidumbre en el instante previsto de mitad de tránsito',
      hints: [
        'Multiplica la incertidumbre del periodo por el número de ciclos, y luego por 24 horas.',
      ],
      worked:
        '30 × 0,001 d = 0,03 d = 0,72 h. La hora de línea base lo cubre, pero tras unos 60 ciclos la incertidumbre llega a 1,44 horas y hay que ensanchar la línea base o volver a medir la efeméride.',
      feedback: {
        close: 'Casi. 30 ciclos por 0,001 días, convertido a horas.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es una fracción de hora.',
        off: '30 × 0,001 × 24.',
      },
    },
  },
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
      name: 'The panels (joint fit, mass-radius diagram, vetting checklist, occurrence efficiency and grid, dilution, observing-window planner, eclipse)',
      text: 'The instruments of the exoplanet unit, set to a prepared state: every number a step states is the panel’s own or is recomputed from its field module (the joint fit’s stored covariance, the vetting runs, the survey’s completeness table, the dilution formula, the planner’s nights and weather mask). No instrument was added for these investigations.',
    },
    {
      name: 'Depth',
      text: 'Each investigation has quantitative and advanced steps that add a derived number or a limit; the core path asks for readings and reasoning only.',
    },
    {
      name: 'What is synthetic and what is a model',
      text: 'Every system, candidate, survey and weather draw is synthetic and carries its truth; no published table was compared. Each investigation says what it leaves out.',
    },
  ],
  misconceptions,
  teachingNotes: notes,
  discussion,
  extensions,
  modelNotes:
    'The joint-fit and mass-radius panels are js/jointWidgets.js over js/jointField.js and js/inference/jointPlanet.js (JOINT_INFERENCE.md); the vetting panel is js/vettingWidgets.js over js/vettingField.js and js/kernels/vetting/; the occurrence panels are js/occurrenceWidgets.js over js/occurrenceField.js and js/kernels/occurrence/ (OCCURRENCE_RATES.md); the dilution panel is in js/transitWidgets.js; the observing-window planner is js/strategyWidgets.js over js/strategyField.js and js/kernels/strategy/; the eclipse panel is js/atmosphereWidgets.js over js/kernels/atmospheres/.',
});

const CONTENT = {
  'one-planet-every-method': GUIDE(
    'One planet followed through the transit, the velocity curve, the joint fit and the vetting checklist, with every record carrying its value, uncertainty, method and assumption',
    'Students read what each method gives (a radius ratio of 0.118 and a 1.40 percent dip; an amplitude of 85.6 m/s), read the density of a synthetic hot Jupiter with its uncertainty (0.365 g/cm³, 13.8 percent), find that about half of that variance is the star’s (10.1 percent with the star exact, 24.1 with it at 8 percent), say that a candidate that survives a checklist is not validated, and, in the deepest step, read an eclipse’s brightness temperature (2094 K) as a bound under stated assumptions.',
    'Upper-level exoplanet unit (the core path is for majors; the quantitative depth adds two derived numbers and the advanced depth a worse star and the eclipse)',
    'After What Is It Made Of? and Planet or Not?; as the closing investigation of the exoplanet sequence, before the campaign investigation.',
    [
      {
        heading: 'A density needs both methods and the star',
        body: 'The transit gives a radius in stellar radii and the velocities a mass with the star’s mass in it; the joint fit carries the star’s stated uncertainty into the density, so a planet’s density is only as good as its star.',
      },
      {
        heading: 'The star’s share is a number',
        body: 'About half of the density’s variance is the star’s at the opening values; with the star exact the density is still uncertain by 10.1 percent, and with the star at 8 percent the star is 82 percent of a 24.1 percent uncertainty.',
      },
      {
        heading: 'A record is more than a value',
        body: 'Each row of a report has its uncertainty, its method and its assumption; a candidate that survives its checks is reported as survived and not validated, and the failures and undecided tests are reported too.',
      },
    ],
    [
      {
        claim:
          'The mass and radius of a planet are measurements like any other.',
        response:
          'Both are derived: the radius ratio is in stellar radii and the velocity amplitude gives a mass only with the star’s mass; the density inherits the star’s uncertainty.',
      },
      {
        claim: 'A candidate that passes three tests is a planet.',
        response:
          'It has survived the tests that were run; validation is a statement about how likely each alternative is.',
      },
      {
        claim: 'A better light curve always improves the density.',
        response:
          'Not past the point where the star dominates: at 8 percent in the star’s mass and radius the star is 82 percent of the density’s variance.',
      },
      {
        claim: 'A brightness temperature is the planet’s temperature.',
        response:
          'It is the temperature of a blackbody that gives the band’s depth, under assumptions the readout lists (no reflected light, a uniform planet, one layer).',
      },
    ],
    [
      'The planet of the joint-fit and mass-radius panels is synthetic (a hot Jupiter with the period of HD 209458 b) and its truth is known; the candidate of the checklist step and the planet of the eclipse step are two other synthetic systems of their own panels, and the investigation says so: no panel joins all the methods on one star.',
      'The star’s mass and radius uncertainties are the panel’s steps (0, 1, 2, 3.5, 5, 8 and 12 percent); the opening values are 5 and 3.5 percent with a correlation of 0.5.',
      'The density comes out in g/cm³ with the Jupiter equatorial radius, as the mass-radius diagram does; a student who computes it from the table’s mean radius gets a slightly different number.',
      'No published eclipse table was compared (the eclipse data are a synthetic truth manifest); a brightness temperature in one band is not a planetary temperature.',
    ],
    [
      'Which row of your report would improve most if the star were measured better, and which would not?',
      'What would you want a reader to know about the candidate that survived three tests?',
      'Why does the report list the undecided tests?',
    ],
    [
      'Set the star’s uncertainties to 12 percent and say what a planet’s density is then worth.',
      'Compare the eclipse bands’ brightness temperatures with reflected light allowed, and say why the panel refuses.',
    ],
    [
      'Transit depth, radius ratio and the radial-velocity amplitude',
      'What Is It Made Of? (the joint fit and the star’s share)',
      'Planet or Not? (the three tests and what passing means)',
    ]
  ),
  'what-kinds-of-planets-exist': GUIDE(
    'Planets read by bulk density on a mass-radius diagram, and a survey’s grid of sizes and periods read against what the survey could see; why a bin with no listing is an upper limit in one place and unconstrained in another',
    'Students read the density of a hot Jupiter from its box (about 0.37 g/cm³, far below rock), recompute Jupiter’s density from its place (1.33), read the survey’s efficiency for small and large planets at 32 to 64 days (20 and 81 percent, a ratio of 4.0), read a rate from three listed planets (0.35 per star), compare two empty bins (an upper limit of 0.012 and not constrained), and read a reading step on why a diagram cannot say whether a planet keeps an atmosphere.',
    'Survey to majors exoplanet unit (the quantitative depth adds two ratios; the advanced depth the empty bins and the selection in each diagram)',
    'After How Many Earths?; before the investigation that connects the methods, or as the unit’s survey of kinds.',
    [
      {
        heading: 'A density sorts planets, and says little else',
        body: 'Lines of constant bulk density on a mass-radius diagram separate rock (5.5 g/cm³), ice and gas (0.3 to 1.6); a density does not give a composition, and says nothing about an atmosphere’s thickness or retention.',
      },
      {
        heading: 'A listing is shaped by what could be seen',
        body: 'The survey’s efficiency at 32 to 64 days is 20 percent for planets of 0.5 to 1 Earth radii and 81 percent for 4 to 8; a count of what was found is not a rate until it is divided by what could have been found.',
      },
      {
        heading: 'An empty bin can be strong or silent',
        body: 'An empty bin the survey searched thoroughly gives an upper limit (0.012 per star); one it hardly searched is not constrained, and the panel says which.',
      },
    ],
    [
      {
        claim: 'A planet that is heavy is rocky.',
        response:
          'Density is mass over volume: a heavy planet that is very large has a low density.',
      },
      {
        claim: 'If few small planets were found, few exist.',
        response:
          'The survey finds one in five of the small ones at long periods; few listed is a wide range of rates, not a rare planet.',
      },
      {
        claim: 'An empty bin means there are none.',
        response:
          'It means none were listed, and what that rules out depends on how well the survey searched.',
      },
      {
        claim: 'The diagram says whether a planet has an atmosphere.',
        response:
          'A low density says there is a thick envelope; whether a world keeps one depends on escape, which these diagrams do not carry and this project gated out.',
      },
    ],
    [
      'The survey is synthetic (2000 stars with a known truth); the mass-radius diagram’s Solar System table is typed from published values and not rechecked (D-R10-203); the hot Jupiter is the synthetic planet of the joint fit.',
      'A public catalog subset (the first choice for the diagrams) is not shipped: no rights decision was made and nothing was fetched, so the investigation uses what the suite holds.',
      'The reading step on atmospheres replaces an investigation that was gated out (gate verdict B: the escape panel was not built); it makes no retention statement.',
      'The rate of a bin is the panel’s (a count over the completeness with a stated reliability); the first seed and the stated reliability are the opening values.',
    ],
    [
      'If you found only large planets in a survey, what could you say about the small ones?',
      'Which would you trust more, a rate from a bin with 242 times its exposure or one from a bin with 1.3?',
      'Why can two different compositions share one density?',
    ],
    [
      'Find another seed’s count for the same bin and compare the rate’s range.',
      'Place Neptune on the diagram and say which line it is nearest.',
    ],
    [
      'Bulk density and the mass-radius diagram',
      'How Many Earths? (completeness and a rate from a count)',
      'Logarithmic axes',
    ]
  ),
  'the-transit-that-was-a-star': GUIDE(
    'Four candidates whose dips were a star: alternating depths, an equal pair that passes every test it is given, the difference-image test that rejects one, a blend inside its exclusion radius; and the two ways a neighbor changes a transit',
    'Students read the odd and even depths of a blend (0.93 and 0.44 percent, 98 times the uncertainty), say what an equal pair does to the odd-even test, read the centroid offset that rejects a blend (1.8 pixels against 0.41), say why one at 0.17 passes (exclusion 0.30), and compute what a companion one magnitude fainter does to a planet of 2.0 Earth radii (2.37).',
    'Majors exoplanet unit (the quantitative depth adds the depth ratio and the diluted radius; the advanced depth the share of the light and the faintest harmless companion)',
    'After Planet or Not?; before or beside the investigation that connects the methods.',
    [
      {
        heading: 'Alternate depths are two eclipses',
        body: 'A planet blocks the same fraction every time; alternating depths (0.93 and 0.44 percent) are the two eclipses of a pair of unequal stars, and the true period is twice the one searched.',
      },
      {
        heading: 'Survived is not validated',
        body: 'An equal pair passes the odd-even and secondary tests; a blend inside the centroid test’s exclusion radius passes all three; the checklist rejects what it can see.',
      },
      {
        heading: 'A neighbor can be the dip or can dilute one',
        body: 'The first makes a star look like a planet; the second makes a planet look smaller (2.0 becomes 2.37 R⊕ for a companion one magnitude fainter), and only a high-resolution image of the host says which applies.',
      },
    ],
    [
      {
        claim: 'Equal odd and even dips prove a planet.',
        response:
          'An equal pair of stars gives equal alternate dips too; the test cannot separate them.',
      },
      {
        claim: 'A centroid test that passes puts the dip on the target.',
        response:
          'It puts the dip within its exclusion radius of the target; a blend closer than that survives.',
      },
      {
        claim: 'A neighbor can only add false planets.',
        response:
          'It can also hide a real planet’s size: dilution makes planets look smaller, and the bias does not average out.',
      },
      {
        claim: 'A faint companion can be ignored.',
        response:
          'Only beyond about four magnitudes, where the correction falls under one percent; at three it is three percent.',
      },
    ],
    [
      'The eight candidates of the panel are synthetic with a truth the panel can reveal; the four used here are blends (B, D, E, G), and the investigation does not walk the planets (A, F, H) or the eclipsing binary with a secondary (C).',
      'The depth ratio of B (0.47) is the ratio of the surface brightnesses of the pair only under the circular, central-eclipse assumptions of the synthetic binary.',
      'The dilution panel’s correction is the square root of one plus the companion’s flux ratio, for a companion fully inside the aperture; partial inclusion is not modeled.',
      'The panel’s truth toggle shows what G is; the step does not require it, and it can be used as a reveal after the question.',
    ],
    [
      'Why does a pair of equal stars pass two tests that an unequal pair fails?',
      'What would you ask for to decide candidate D, and why?',
      'Which is worse for a population study, a false planet or a diluted one?',
    ],
    [
      'Walk candidate H, which the checklist leaves undecided, and say what data would decide it.',
      'Apply the dilution correction to a population of radii that straddle a boundary and say what happens to the count on each side.',
    ],
    [
      'Planet or Not? (the three tests)',
      'Transit depth and the radius ratio',
      'Eclipsing binaries (the two eclipses of a pair)',
    ]
  ),
  'planning-a-transit-campaign': GUIDE(
    'A campaign for a known ephemeris: the nights on which a whole transit and its baseline fit in the window, the weather, why a period-search cadence is not a transit sequence, and what an aging ephemeris does to the baseline',
    'Students count the nights on which a transit (2-day period, 2.8 hours, an hour of baseline each side) fits the window of a southern target from Cerro Tololo (five of ten: nights 1, 3, 5, 7 and 9), count what the weather left (two), see that a northern target’s 1.2-hour window ends the plan, say what sampling a transit wants, and compute the share of the night (54 percent), the expected count (3.0) and the ephemeris error after 30 cycles (0.72 hours).',
    'Majors observing-and-exoplanet unit (the quantitative depth adds the share and the expectation; the advanced depth the ephemeris error)',
    'After Design the Schedule; at the close of the exoplanet sequence or in the observing unit.',
    [
      {
        heading: 'A plan is an intersection',
        body: 'The ephemeris says when, the window says whether the target is up long enough for the transit and its baseline, and the weather takes nights at random; the answer is a list of nights and an expected count.',
      },
      {
        heading: 'A cadence is not a transit sequence',
        body: 'Visits spread to find a period sample a three-hour transit at a few points; a transit wants a continuous sequence with a baseline on both sides.',
      },
      {
        heading: 'An ephemeris ages',
        body: 'The error in a predicted mid-transit time grows with the cycles since the last measurement (0.72 hours after 30 cycles at 0.001 days), and the baseline has to grow with it.',
      },
    ],
    [
      {
        claim:
          'If the planet transits every 2 days, I can observe every transit.',
        response:
          'The transit returns to the same hour of the night only every second night, and the nights between hold none; the weather then takes most of those.',
      },
      {
        claim:
          'The weather is an average, so I can count on a fraction of the nights.',
        response:
          'It is a random draw with runs of bad nights; a plan states an expected count and a spread, and the real count can be zero.',
      },
      {
        claim:
          'The cadence of a period search is the right sampling for a transit.',
        response:
          'It is built to tell a period from its aliases; a transit wants continuous coverage across the event.',
      },
      {
        claim: 'A short window is only a smaller opportunity.',
        response:
          'A window shorter than the transit plus its baseline holds none, however many nights there are.',
      },
    ],
    [
      'The planet’s ephemeris (2 days, a first transit 1.0 hours after local midnight, 2.8 hours long) is a teaching value stated in the investigation; no known planet’s ephemeris is used.',
      'The windows and the weather are the observing-window planner’s: a southern teaching target from Cerro Tololo, ten nights from 14 March 2026, a clear fraction of 0.6 with persistence 0.5 and the third seed; the northern target is the planner’s second.',
      'The count of nights is computed from the planner’s usable intervals with a baseline of an hour on each side; it ignores the moon beyond the planner’s own constraints and assumes the ephemeris is exact.',
      'The visits the planner also shows are for the period search of the strategy investigation and are not used here.',
    ],
    [
      'What would you change first if the plan caught no transit: the site, the target, the baseline or the dates?',
      'How would you decide how many transits to plan for if the weather were worse?',
      'When would you remeasure the ephemeris instead of widening the baseline?',
    ],
    [
      'Change the period to 3.0 days and find the nights that qualify.',
      'Change the weather seed and compare the count with the expectation of 3.0.',
    ],
    [
      'Design the Schedule (windows and weather)',
      'Transit duration and the baseline of a light curve',
      'Local midnight, windows and the length of a night',
    ]
  ),
};

const FLOW = {
  'one-planet-every-method': [
    {
      from: 'two-methods-one-planet',
      to: 'what-needs-both',
      text: 'What a transit and a velocity curve each give, and that a density needs both and the star.',
    },
    {
      from: 'read-the-record',
      to: 'read-the-record',
      text: 'The density with its uncertainty: a value is not yet a record.',
    },
    {
      from: 'the-star-share',
      to: 'the-star-share',
      text: 'How much of the uncertainty is the star’s.',
    },
    {
      from: 'a-dip-is-a-candidate',
      to: 'a-dip-is-a-candidate',
      text: 'Survived is not validated.',
    },
    {
      from: 'the-record',
      to: 'the-record',
      text: 'What a report carries: value, uncertainty, method, assumption, and the star’s share and the failures.',
    },
  ],
  'what-kinds-of-planets-exist': [
    {
      from: 'a-diagram-of-planets',
      to: 'what-the-density-says',
      text: 'Lines of constant density, and what a low density does and does not say.',
    },
    {
      from: 'what-the-survey-sees',
      to: 'larger-is-easier',
      text: 'The survey’s efficiency: large and close-in planets are easiest.',
    },
    {
      from: 'a-rate-from-few',
      to: 'a-rate-from-few',
      text: 'A rate from three listed planets, and why the range is wide.',
    },
    {
      from: 'what-an-atmosphere-needs',
      to: 'what-an-atmosphere-needs',
      text: 'The reading step: a diagram of mass and radius cannot say whether a planet keeps an atmosphere.',
    },
    {
      from: 'kinds-and-what-they-hide',
      to: 'kinds-and-what-they-hide',
      text: 'What each diagram says and hides.',
    },
  ],
  'the-transit-that-was-a-star': [
    {
      from: 'a-dip-with-company',
      to: 'odd-and-even',
      text: 'Alternating depths are two eclipses of a pair at twice the period.',
    },
    {
      from: 'the-twin',
      to: 'the-twin',
      text: 'An equal pair passes the first two tests; the third was not run.',
    },
    {
      from: 'the-frames',
      to: 'the-frames',
      text: 'The difference-image test places the dip on the neighbor.',
    },
    {
      from: 'too-close-to-see',
      to: 'too-close-to-see',
      text: 'A blend inside the exclusion radius survives every test.',
    },
    {
      from: 'the-whole-story',
      to: 'the-whole-story',
      text: 'The two ways a neighbor changes a transit.',
    },
  ],
  'planning-a-transit-campaign': [
    {
      from: 'what-a-campaign-needs',
      to: 'which-nights',
      text: 'The ephemeris, the window and the nights that qualify.',
    },
    {
      from: 'what-the-weather-left',
      to: 'what-the-weather-left',
      text: 'What the weather left of them.',
    },
    {
      from: 'the-other-target',
      to: 'the-other-target',
      text: 'A target that is up too briefly cannot be planned.',
    },
    {
      from: 'visits-are-not-a-transit',
      to: 'visits-are-not-a-transit',
      text: 'A period-search cadence is not a transit sequence.',
    },
    {
      from: 'the-campaign-in-one-line',
      to: 'the-campaign-in-one-line',
      text: 'The campaign as ephemeris, window and weather.',
    },
  ],
};

const EXPECTATIONS = {
  'one-planet-every-method': {
    'read-the-record':
      'A density of 0.365 g/cm³ (within 0.01) and an uncertainty of 13.8 percent (within 0.6) at the panel’s opening values.',
  },
  'what-kinds-of-planets-exist': {
    'a-rate-from-few':
      'Three planets listed and a rate of about 0.35 per star (within 0.02) in the bin of 0.5 to 1 Earth radii and 32 to 64 days, first seed.',
  },
  'the-transit-that-was-a-star': {
    'the-frames':
      'A centroid offset of about 1.8 pixels (within 0.1) for candidate E.',
  },
  'planning-a-transit-campaign': {
    'which-nights':
      'Five nights (the first, third, fifth, seventh and ninth) on which a whole transit and its baseline fit the window.',
    'what-the-weather-left':
      'Two of those five nights clear (the first and the ninth) at the third weather seed.',
  },
};

const BANDS = {
  'one-planet-every-method': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'what-kinds-of-planets-exist': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'the-transit-that-was-a-star': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'planning-a-transit-campaign': {
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
  'one-planet-every-method': ONE_PLANET_EVERY_METHOD_ES,
  'what-kinds-of-planets-exist': WHAT_KINDS_OF_PLANETS_EXIST_ES,
  'the-transit-that-was-a-star': THE_TRANSIT_THAT_WAS_A_STAR_ES,
  'planning-a-transit-campaign': PLANNING_A_TRANSIT_CAMPAIGN_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'one-planet-every-method': ONE_PLANET_EVERY_METHOD_DEEPER,
  'what-kinds-of-planets-exist': WHAT_KINDS_OF_PLANETS_EXIST_DEEPER,
  'the-transit-that-was-a-star': THE_TRANSIT_THAT_WAS_A_STAR_DEEPER,
  'planning-a-transit-campaign': PLANNING_A_TRANSIT_CAMPAIGN_DEEPER,
};
export const DEPTH_ES = {
  'one-planet-every-method': ONE_PLANET_EVERY_METHOD_DEEPER_ES,
  'what-kinds-of-planets-exist': WHAT_KINDS_OF_PLANETS_EXIST_DEEPER_ES,
  'the-transit-that-was-a-star': THE_TRANSIT_THAT_WAS_A_STAR_DEEPER_ES,
  'planning-a-transit-campaign': PLANNING_A_TRANSIT_CAMPAIGN_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
// The catalog order is the order the lessons are written in this file: the
// registry generator reads it from the text (tools/capability-registries.mjs).
export default [
  ONE_PLANET_EVERY_METHOD,
  WHAT_KINDS_OF_PLANETS_EXIST,
  THE_TRANSIT_THAT_WAS_A_STAR,
  PLANNING_A_TRANSIT_CAMPAIGN,
];
