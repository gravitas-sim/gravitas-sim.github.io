// =============================================================================
// Deep or Wide?, Two Telescopes One Question, and Propose an Observation (Prompt 215)
// -----------------------------------------------------------------------------
// Three investigations in one module that also carries their Spanish words, their deeper
// steps and their instructor content: this is the one closure file the prompt adds
// (D-R10-215-02), because the shared sequence files sit at their line ceilings. The
// per-lesson path every loader builds from an id is a one-line re-export of a named
// export here, and the instructor modules read INSTRUCTOR. No imports: every number a
// step states is recomputed in tests/surveyLessons.test.js from the survey views
// (js/surveyDesignField.js over js/kernels/survey/). Every step carries a `sid`.
//
// The classes are teaching models and every patch is synthetic and says so
// (SURVEY_DESIGN.md). The capstone's plan step has no single right plan: it is judged by
// the survey kernel for feasibility and consistency (js/surveyDesignPlan.js).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A field to survey', teffK: 5800, lumSun: 1 }],
};
/** The trade-off panel: LCO 1.0 m, ten nights; cls 0 Euclidean, 1 flattened, 2 steep. */
const TRADE = (values = {}) => ({
  id: 'survey-design-tradeoff',
  values: { facility: 1, cls: 0, logExposure: 2, nights: 10, ...values },
});
/** The plan panel: LCO 1.0 m, the flattened class, a goal of 22.5 mag over 100 deg2. */
const PLAN = (values = {}) => ({
  id: 'survey-design-plan',
  values: {
    facility: 1,
    cls: 1,
    logExposure: 2,
    visits: 1,
    nights: 10,
    threshold: 5,
    goalDepth: 22.5,
    logGoalArea: 2,
    ...values,
  },
});
/** The compare panel: LCO 1.0 m against Rubin, 23 mag over 10 deg2, 100 s a visit. */
const CMP = (values = {}) => ({
  id: 'survey-design-compare',
  values: {
    facilityA: 1,
    facilityB: 2,
    logExposure: 2,
    goalDepth: 23,
    logGoalArea: 1,
    ...values,
  },
});

/** The plan step's fields: a plan, and what the student says it reaches. */
const PLAN_FIELDS = [
  {
    id: 'facility',
    label: 'Facility: 1 LCO 0.35 m, 2 LCO 1.0 m, 3 Rubin 8.4 m',
    hint: '2',
  },
  { id: 'exposure', label: 'Exposure per visit', unit: 's', hint: '100' },
  { id: 'visits', label: 'Visits stacked', hint: '1' },
  { id: 'nights', label: 'Nights', hint: '10' },
  { id: 'threshold', label: 'Detection threshold', unit: 'sigma', hint: '5' },
  { id: 'depth', label: 'Depth your plan reaches (half found)', unit: 'mag' },
  { id: 'n', label: 'Sources your plan finds per square degree' },
];
const PLAN_SPEC = {
  class: 'flattened',
  goal: { depth: 22.5, areaDeg2: 100, minReliability: 0.95, maxNights: 10 },
  tolerance: { depth: 0.15, countsPct: 10 },
};

export const DEEP_OR_WIDE = {
  id: 'deep-or-wide',
  thumbnail: 'images/investigations/deep-or-wide.webp',
  title: 'Deep or Wide?',
  subtitle:
    'The same nights can reach faint sources over a small area or bright ones over a large one: which finds more depends on the class of source',
  duration: '12-22 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Predict whether long exposures over a small area or short ones over a large area find more sources of a class whose counts rise steeply',
    'Read from the panel the exposure that finds most sources, and say that the slope of the class’s counts decides it, with 0.8 dex a magnitude the break-even',
    'Say what a lower detection threshold buys (more sources) and what it costs (more false ones)',
  ],
  steps: [
    {
      sid: 'two-ways-to-spend-the-nights',
      stage: STAGE,
      type: 'read',
      title: 'Two ways to spend the nights',
      body: `Ten nights on a one-metre telescope. You can take long exposures: each pointing
             reaches faint sources, but the nights buy few pointings. Or short exposures:
             each pointing is shallow, but there are many. The panel shows the
             <strong>area surveyed</strong> and the <strong>sources found</strong> against
             the exposure, for a <em>class</em> of source whose counts rise with depth by a
             stated slope.\n\nThe class is a teaching model, a power law with a stated
             slope, not a real population; every number is a model with limits the panel
             lists.`,
      tool: TRADE(),
    },
    {
      sid: 'predict-deep-or-wide',
      stage: STAGE,
      type: 'predict',
      reveal: 'steep-class',
      title: 'Which finds more?',
      body: `A class of source whose counts rise <em>steeply</em> with depth: for every
             magnitude fainter, about ten times as many sources (a slope of 1.0 dex a
             magnitude). The same ten nights are spent either as long exposures over a small
             area or as short ones over a large area.`,
      prompt: 'Which strategy finds more of this class?',
      options: [
        'Deep: the long exposures, because each extra magnitude brings so many more sources that it outweighs the area given up',
        'Wide: the short exposures, because more sky is always better than more depth',
        'They find the same number, because the telescope time is the same',
        'It cannot be said without knowing the telescope',
      ],
      answer: 0,
      hints: [
        'Depth gains a magnitude for each 2.5 times the sky-limited exposure (1.25 mag a decade); the area falls as one over the exposure.',
      ],
      because:
        'The sky-limited depth gains 1.25 magnitude a decade of exposure, so the counts per square degree rise as the exposure to the power 1.25 times the slope, while the area falls as one over the exposure. With a slope of 1.0 the product still rises (to the power 0.25), so deep wins.',
    },
    {
      sid: 'euclid-best',
      stage: STAGE,
      type: 'measure',
      title: 'A class with the Euclidean slope',
      body: `First a class with the slope sources spread evenly through space give, 0.6 dex a
             magnitude. Read the <em>Best exposure</em> row: the exposure at which the
             most sources are found.`,
      fields: [
        {
          id: 'e',
          label: 'The exposure that finds most sources',
          unit: 's',
          hint: '335',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.e)) return null;
        if (near(v.e, 335, 50)) {
          return {
            level: 'ok',
            message:
              'About 335 s: neither the shortest nor the longest. Too short and each frame wastes its 33 s of overhead; too long and the area falls faster than the depth pays.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the Best exposure row with the Euclidean class: it is a few hundred seconds.',
        };
      },
      tool: TRADE({ cls: 0 }),
    },
    {
      sid: 'steep-class',
      stage: STAGE,
      type: 'measure',
      title: 'A class with a steep slope',
      body: `Now the class from the prediction, slope 1.0. Read the exposure that finds the
             most sources. Is there an interior best, or does it run to the end of the
             slider?`,
      fields: [
        {
          id: 'e',
          label: 'The exposure that finds most sources',
          unit: 's',
          hint: '3162',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.e)) return null;
        if (near(v.e, 3162, 300)) {
          return {
            level: 'ok',
            message:
              'The longest exposure on the slider, 3162 s: with a steep class there is no interior best, and deep wins, as predicted.',
          };
        }
        return {
          level: 'error',
          message:
            'Select the steep class (slope 1.0): the best exposure is the longest the slider offers.',
        };
      },
      tool: TRADE({ cls: 2 }),
    },
    {
      sid: 'what-decides-it',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What decides it?',
      body: `The Euclidean class (0.6) has a best exposure in the middle; the steep class
             (1.0) runs to the longest.`,
      prompt: 'What property of the class decides between deep and wide?',
      options: [
        'How fast its counts rise with depth: deep wins only where they rise faster than 0.8 dex a magnitude',
        'How bright its brightest source is',
        'How large the telescope is',
        'How many nights there are',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'telescope',
          option: 2,
          say: 'The telescope sets how deep an exposure goes; the class’s counts set whether that depth pays.',
        },
      ],
      hints: ['Compare 1.25 times the slope with 1.'],
      because:
        'Counts found go as the exposure to the power 1.25 times the slope minus 1, sky-limited. That is positive (deep wins) above a slope of 0.8 and negative (wide wins) below it.',
      tool: TRADE({ cls: 2 }),
    },
    {
      sid: 'the-rule-and-its-limits',
      stage: STAGE,
      type: 'read',
      title: 'A rule with limits',
      body: `Deep wins where the counts rise faster than 0.8 dex a magnitude, and wide wins
             where they rise more slowly: real faint galaxies flatten below that, which is
             why wide surveys dominate for them. The counts here are Poisson only (no
             clustering), the classes are stated power laws, and the weather is an assumed
             clear fraction. A real survey would test the rule with its own counts.`,
      tool: TRADE({ cls: 1 }),
    },
  ],
};

export const DEEP_OR_WIDE_DEEPER = {
  id: 'deep-or-wide',
  steps: [
    {
      sid: 'the-exponent',
      after: 'what-decides-it',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The exponent',
      body: `Sky-limited, the depth gains 1.25 magnitude per decade of exposure and the area
             falls as one over the exposure.`,
      prompt:
        'For a class with a slope of 1.0, the sources found go as the exposure to the power p. What is p?',
      answer: 0.25,
      tolerance: 0.03,
      hints: ['1.25 times the slope, minus 1.'],
      because:
        'The counts per square degree go as the exposure to the 1.25 times the slope, the area as the exposure to the minus one: 1.25 - 1 = 0.25.',
      tool: TRADE({ cls: 2 }),
    },
    {
      sid: 'the-rule-undershoots',
      after: 'the-exponent',
      depth: 'quantitative',
      type: 'measure',
      title: 'Does the rule find the best exposure?',
      body: `For the flattened class (slope 0.4) the panel gives both the exposure that finds
             most sources and the sky-limited rule&rsquo;s estimate, 1.25 times the slope over
             one minus it, times the overhead. Read both.`,
      fields: [
        { id: 'b', label: 'Best exposure found', unit: 's', hint: '84' },
        { id: 'r', label: 'The sky-limited rule gives', unit: 's', hint: '33' },
      ],
      validate: v => {
        if (![v.b, v.r].every(Number.isFinite)) return null;
        if (near(v.b, 84, 12) && near(v.r, 33, 4)) {
          return {
            level: 'ok',
            message:
              '84 s found, 33 s by the rule: the rule undershoots by a factor of two or more. It is the sky-limited limit; the source’s own noise and the read noise make the depth gain faster at short exposures, so longer ones pay.',
          };
        }
        return {
          level: 'error',
          message:
            'Select the flattened class and read the Best exposure row: about 84 s found against 33 s by the rule.',
        };
      },
      tool: TRADE({ cls: 1 }),
    },
    {
      sid: 'a-lower-threshold',
      after: 'the-rule-undershoots',
      depth: 'advanced',
      type: 'measure',
      title: 'Depth against contamination',
      body: `Lowering the detection threshold finds fainter sources, but noise peaks pass it
             too. For the steep class on the one-metre telescope, 31.6 s a visit, ten nights, at
             <strong>3 sigma</strong>: read the depth and the share of the detections that are
             real.`,
      fields: [
        {
          id: 'd',
          label: 'Depth at the threshold',
          unit: 'mag',
          hint: '22.59',
        },
        {
          id: 'r',
          label: 'Reliability, the real share of the detections',
          unit: '%',
          hint: '90.5',
        },
      ],
      validate: v => {
        if (![v.d, v.r].every(Number.isFinite)) return null;
        if (near(v.d, 22.59, 0.08) && near(v.r, 90.5, 1.5)) {
          return {
            level: 'ok',
            message:
              'At 3 sigma the depth is 22.59 against 22.00 at 5 sigma, and about one detection in ten (5 million of 47 million) is false, where at 5 sigma it is one in 250.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the threshold to 3 sigma: the depth is about 22.6 and the reliability about 90 percent.',
        };
      },
      tool: PLAN({
        cls: 2,
        logExposure: 1.5,
        threshold: 3,
        goalDepth: 21,
        logGoalArea: 1,
      }),
    },
    {
      sid: 'what-a-threshold-costs',
      after: 'a-lower-threshold',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a threshold costs',
      body: `At 3 sigma the survey is half a magnitude deeper and finds many more sources,
             with about one in ten false.`,
      prompt:
        'For a class that is rare, what happens to the reliability at 3 sigma?',
      options: [
        'It falls much further: the false positives do not depend on the class, so they swamp a rare class',
        'It stays the same, because the false rate is a property of the threshold only for the real sources',
        'It rises, because a rare class is easier to pick out',
        'It cannot be said',
      ],
      answer: 0,
      hints: [
        'The false positives per square degree depend on the noise and the threshold, not on the class.',
      ],
      because:
        'The number of false detections per square degree is the tail of the noise above the threshold times the number of independent elements: it does not depend on how many real sources there are, so the fewer there are, the larger the false share. For a rare class at 3 sigma it can exceed one half.',
    },
  ],
};

export const TWO_TELESCOPES = {
  id: 'two-telescopes-one-question',
  thumbnail: 'images/investigations/two-telescopes-one-question.webp',
  title: 'Two Telescopes, One Question',
  subtitle:
    'The same depth over the same area with a one-metre telescope and an 8.4-metre one: how much longer does the small one take, and why',
  duration: '12-22 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Predict how much longer a one-metre telescope takes than an 8.4-metre one to reach the same depth over the same area',
    'Read from the panel the visits, the pointings and the hours each facility needs, and their ratio',
    'Say that two things set it: the light each pointing gathers (depth) and the field each pointing covers (area)',
  ],
  steps: [
    {
      sid: 'one-goal-two-telescopes',
      stage: STAGE,
      type: 'read',
      title: 'One goal, two telescopes',
      body: `The goal: reach 23rd magnitude over 10 square degrees, taking 100 s a visit. The
             panel gives, for each facility, the visits it must stack in each pointing to
             reach the depth, the pointings to cover the area and the hours. The two
             facilities are the Las Cumbres 1.0 m with a 0.2 square degree field and Rubin
             (8.4 m, 9.6 square degrees); their throughput is a supplied value and the field,
             pixel scale and overhead come from the cited table.`,
      tool: CMP(),
    },
    {
      sid: 'predict-the-ratio',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-hours',
      title: 'How much longer?',
      body: `Rubin collects about 70 times the light of the one-metre telescope and covers
             about 50 times the sky in each pointing.`,
      prompt:
        'How does the time Rubin needs for this goal compare with the one-metre telescope’s?',
      options: [
        'About the same: the camera is the same kind of detector',
        'About 10 times less',
        'About 60 times less',
        'About 600 times less',
      ],
      answer: 2,
      hints: [
        'Both advantages help, but the depth is reached in one visit by Rubin and in two by the small telescope.',
      ],
      because:
        'The one-metre telescope needs two stacked visits in each of 52 pointings (3.8 hours); Rubin reaches the depth in one visit and needs 2 pointings (3.7 minutes): about 60 times less.',
    },
    {
      sid: 'read-the-hours',
      stage: STAGE,
      type: 'measure',
      title: 'Read the hours',
      body: `Read the hours the first facility (the one-metre telescope) needs, and the
             ratio of the second to the first.`,
      fields: [
        {
          id: 'h',
          label: 'Hours for the one-metre telescope',
          unit: 'h',
          hint: '3.84',
        },
        {
          id: 'r',
          label: 'The second takes this many times as long',
          hint: '0.0155',
        },
      ],
      validate: v => {
        if (![v.h, v.r].every(Number.isFinite)) return null;
        if (near(v.h, 3.84, 0.15) && near(v.r, 0.0155, 0.002)) {
          return {
            level: 'ok',
            message:
              '3.84 hours against 3.7 minutes: a ratio of 0.0155, about 1 in 65. The small telescope stacks two visits in each of 52 pointings; Rubin needs one visit in two.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the first facility’s hours (about 3.8) and the ratio (about 0.0155) from the panel.',
        };
      },
      tool: CMP(),
    },
    {
      sid: 'why-so-much',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why so much?',
      body: `The ratio is about 1 in 65.`,
      prompt: 'Which two advantages of the large telescope combine to give it?',
      options: [
        'Its larger mirror reaches the depth in fewer visits (depth per pointing), and its wider field needs far fewer pointings (area per pointing)',
        'Its mirror alone: the field of view does not matter',
        'Its field alone: the mirror does not matter',
        'Its higher site: the sky is the same for both',
      ],
      answer: 0,
      hints: ['Count the visits and the pointings each facility needs.'],
      because:
        'The time is the pointings times the visits times the cost of a visit. Rubin needs 26 times fewer pointings and a smaller stack, so the product falls by about 65.',
      tool: CMP(),
    },
    {
      sid: 'two-limits-of-the-comparison',
      stage: STAGE,
      type: 'read',
      title: 'Limits of the comparison',
      body: `Both facilities take the same exposure per visit and the same detection
             threshold, with a supplied throughput of 0.5 and the same clear fraction; the
             pointings do not overlap. A different exposure changes the answer: a small
             telescope given a longer exposure wastes less time in overhead. The ratio is a
             model for a planning conversation, not a forecast.`,
      tool: CMP(),
    },
  ],
};

export const TWO_TELESCOPES_DEEPER = {
  id: 'two-telescopes-one-question',
  steps: [
    {
      sid: 'the-field-ratio',
      after: 'why-so-much',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The field ratio',
      body: `Each pointing of Rubin covers 9.6 square degrees and each of the one-metre
             telescope 0.195.`,
      prompt: 'How many times more sky does a Rubin pointing cover?',
      answer: 49.2,
      tolerance: 1,
      hints: ['Divide the two fields.'],
      because:
        '9.6 / 0.195 = 49.2: 52 pointings against 2 is the same factor within the whole-pointing rounding.',
      tool: CMP(),
    },
    {
      sid: 'the-fixed-exposure',
      after: 'the-field-ratio',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A fixed exposure',
      body: `Both facilities take 100 s a visit.`,
      prompt:
        'Why can a different exposure change which facility looks better?',
      options: [
        'Each visit costs an overhead the exposure does not change, so a short exposure wastes a larger share on a facility with a long overhead, and an exposure deeper than the goal needs wastes time',
        'The exposure does not matter: only the mirror and the field do',
        'A longer exposure always favours the larger telescope',
        'The detector saturates at 100 s',
      ],
      answer: 0,
      hints: [
        'Compare the one-metre telescope’s 28 s overhead with its 100 s visit.',
      ],
      because:
        'The time per pointing is visits times (exposure plus overhead); an exposure far shorter or deeper than the goal needs changes that mix. The comparison is a function of the exposure.',
      tool: CMP({ logExposure: 1.5 }),
    },
  ],
};

export const PROPOSE_AN_OBSERVATION = {
  id: 'propose-an-observation',
  thumbnail: 'images/investigations/propose-an-observation.webp',
  title: 'Propose an Observation',
  subtitle:
    'Design a survey for a stated goal, predict what it will find, check it against the model and justify the plan: many plans are right',
  duration: '20-40 min',
  level: 'Upper-level astronomy',
  audience: 'upper',
  textbook: { chapter: 6, section: null },
  courseLevel: 'upper',
  mathematics: 'algebra',
  prerequisites: ['deep-or-wide'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Choose a facility, exposure, visits, nights and threshold that meet a stated depth, area and reliability, and say what the plan will find before checking it',
    'Justify the choice by what it trades away, and name an alternative that also meets the goal',
    'Say what the model leaves out (clustering, a real population, the weather) and what that does to the interval on the count',
  ],
  steps: [
    {
      sid: 'the-brief',
      stage: STAGE,
      type: 'read',
      title: 'The brief',
      body: `You have <strong>ten nights</strong>. Find sources of the <em>flattened class</em>
             (counts rising by 0.4 dex a magnitude) to a depth of <strong>22.5
             magnitude</strong>, over at least <strong>100 square degrees</strong>, with at
             least <strong>95 percent</strong> of the detections real. Three facilities are
             on offer: the Las Cumbres 0.35 m and 1.0 m telescopes and Rubin. Use the panel
             to explore, then propose one plan.\n\nThere is no single right plan. The check is
             whether your plan meets the goal and whether what you say it reaches matches
             it.`,
      tool: PLAN(),
    },
    {
      sid: 'propose-a-plan',
      stage: STAGE,
      type: 'measure',
      title: 'Propose a plan',
      body: `Enter your plan: the facility, the exposure, the visits stacked, the nights
             (at most 10) and the detection threshold. Then say what it reaches: the depth
             (the magnitude at which half the sources are found) and the number of sources
             found per square degree. Both are predictions you can check in the panel.`,
      fields: PLAN_FIELDS,
      plan: PLAN_SPEC,
      tool: PLAN(),
    },
    {
      sid: 'justify-the-plan',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      title: 'Why this plan?',
      body: `A plan is a set of trade-offs. Say what yours gives up.`,
      prompt:
        'Why this plan? Say what you traded away, and name one different plan that would also have met the goal and why you did not choose it.',
      rubric:
        'Credit for naming a real trade (depth against area, threshold against false positives, overhead against exposure), for a second plan that does meet the goal (for example a different facility), and for saying what the model leaves out (clustering, a real population, weather). Any plan the screen accepted is a valid answer; do not mark the choice, mark the reasoning.',
      rubricCriteria: [
        {
          name: 'The plan meets the goal',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'The proposed plan was accepted: feasible and consistent.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'The plan was not accepted, or no plan was entered.',
            },
          ],
        },
        {
          name: 'Names the trade',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says what the plan gives up and why that was worth it.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Restates the plan without a trade.',
            },
          ],
        },
        {
          name: 'A different valid plan',
          kind: 'completion',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Names an alternative that also meets the goal.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names none, or one that fails the goal.',
            },
          ],
        },
        {
          name: 'What the model leaves out',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Says what the count’s interval does not include (clustering, a real population, weather).',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Treats the interval as the whole uncertainty.',
            },
          ],
        },
      ],
      hints: ['Two plans on different facilities can both meet this goal.'],
    },
    {
      sid: 'two-valid-plans',
      stage: STAGE,
      type: 'read',
      title: 'Many plans, one goal',
      body: `The one-metre telescope with about 60 s a visit for ten nights, Rubin with
             about 30 s, and the 0.35 m telescope with about 1000 s all meet this goal; a
             threshold of 3 sigma deepens each but fails the reliability. The screen judges
             feasibility and consistency, never one answer. The count&rsquo;s interval is
             Poisson only: a real survey scatters more, from clustering and from the real
             population differing from a stated class.`,
      tool: PLAN({ facility: 2, logExposure: 1.5 }),
    },
  ],
};

export const PROPOSE_AN_OBSERVATION_DEEPER = {
  id: 'propose-an-observation',
  steps: [
    {
      sid: 'a-second-plan',
      after: 'justify-the-plan',
      depth: 'quantitative',
      type: 'measure',
      title: 'A second plan',
      body: `Now propose a second plan that also meets the goal, on a different facility
             from your first.`,
      fields: PLAN_FIELDS,
      plan: PLAN_SPEC,
      tool: PLAN({ facility: 0 }),
    },
    {
      sid: 'compare-your-plans',
      after: 'a-second-plan',
      depth: 'quantitative',
      type: 'question',
      kind: 'short',
      title: 'Compare your two plans',
      body: `Both plans meet the goal.`,
      prompt:
        'Which would you propose to a time-allocation committee, and what would change your mind?',
      rubric:
        'Credit for choosing by a stated criterion (robustness to weather, time used, margin over the depth, reliability), and for naming something that would change the choice. No plan is the answer.',
      reflect: true,
    },
    {
      sid: 'what-the-interval-misses',
      after: 'compare-your-plans',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What the interval misses',
      body: `The panel gives a count with a Poisson interval.`,
      prompt:
        'Which effect makes a real survey’s count scatter more than that interval?',
      options: [
        'Clustering and cosmic variance: sources are not scattered independently, so the count in a field varies more than Poisson',
        'The telescope’s mirror shape',
        'The exposure time',
        'The number of visits',
      ],
      answer: 0,
      hints: ['Think about what Poisson assumes about where the sources are.'],
      because:
        'A Poisson count assumes sources fall independently. Real sources cluster, so the variance between fields is larger, and a survey should state its interval with that included.',
    },
  ],
};

// ---- Spanish shadows: aligned by index with the English steps ----------------------------

export const DEEP_OR_WIDE_ES = {
  title: '¿Profundo o ancho?',
  subtitle:
    'Las mismas noches pueden alcanzar fuentes débiles en un área pequeña o fuentes brillantes en un área grande: cuál encuentra más depende de la clase de fuente',
  objectives: [
    'Predecir si exposiciones largas sobre un área pequeña o cortas sobre un área grande encuentran más fuentes de una clase cuyos conteos crecen con fuerza',
    'Leer en el panel la exposición que encuentra más fuentes y decir que la pendiente de los conteos de la clase lo decide, con 0,8 dex por magnitud como punto de equilibrio',
    'Decir qué compra un umbral de detección más bajo (más fuentes) y qué cuesta (más falsas)',
  ],
  steps: [
    {
      title: 'Dos formas de gastar las noches',
      body: 'Diez noches en un telescopio de un metro. Puedes tomar exposiciones largas: cada apuntado alcanza fuentes débiles, pero las noches compran pocos apuntados. O exposiciones cortas: cada apuntado es poco profundo, pero hay muchos. El panel muestra el <strong>área observada</strong> y las <strong>fuentes encontradas</strong> frente a la exposición, para una <em>clase</em> de fuente cuyos conteos crecen con la profundidad según una pendiente declarada.\n\nLa clase es un modelo didáctico, una ley de potencias con pendiente declarada, no una población real; todo número es un modelo con los límites que el panel enumera.',
    },
    {
      title: '¿Cuál encuentra más?',
      body: 'Una clase de fuente cuyos conteos crecen <em>con fuerza</em> con la profundidad: por cada magnitud más débil, unas diez veces más fuentes (una pendiente de 1,0 dex por magnitud). Las mismas diez noches se gastan en exposiciones largas sobre un área pequeña o en cortas sobre un área grande.',
      prompt: '¿Qué estrategia encuentra más de esta clase?',
      options: [
        'Profundo: las exposiciones largas, porque cada magnitud extra trae tantas fuentes más que compensa el área cedida',
        'Ancho: las exposiciones cortas, porque más cielo es siempre mejor que más profundidad',
        'Encuentran lo mismo, porque el tiempo de telescopio es el mismo',
        'No se puede decir sin conocer el telescopio',
      ],
      hints: [
        'La profundidad limitada por el cielo gana una magnitud por cada 2,5 veces la exposición (1,25 mag por década); el área cae como uno entre la exposición.',
      ],
      because:
        'La profundidad limitada por el cielo gana 1,25 magnitudes por década de exposición, así que los conteos por grado cuadrado crecen como la exposición elevada a 1,25 veces la pendiente, mientras el área cae como uno entre la exposición. Con pendiente 1,0 el producto sigue creciendo (con exponente 0,25): gana lo profundo.',
    },
    {
      title: 'Una clase con la pendiente euclídea',
      body: 'Primero una clase con la pendiente que dan las fuentes repartidas por igual en el espacio, 0,6 dex por magnitud. Lee la fila <em>Mejor exposición</em>: la exposición con la que se encuentran más fuentes.',
      fields: [{ label: 'La exposición que encuentra más fuentes' }],
    },
    {
      title: 'Una clase con pendiente empinada',
      body: 'Ahora la clase de la predicción, pendiente 1,0. Lee la exposición que encuentra más fuentes. ¿Hay una mejor interior, o llega al extremo del control?',
      fields: [{ label: 'La exposición que encuentra más fuentes' }],
    },
    {
      title: '¿Qué lo decide?',
      body: 'La clase euclídea (0,6) tiene una mejor exposición en el medio; la empinada (1,0) llega a la más larga.',
      prompt: '¿Qué propiedad de la clase decide entre profundo y ancho?',
      options: [
        'Con qué rapidez crecen sus conteos con la profundidad: gana lo profundo solo donde crecen más rápido que 0,8 dex por magnitud',
        'Qué tan brillante es su fuente más brillante',
        'Qué tan grande es el telescopio',
        'Cuántas noches hay',
      ],
      misconceptions: [
        {
          say: 'El telescopio fija hasta dónde llega una exposición; los conteos de la clase fijan si esa profundidad compensa.',
        },
      ],
      hints: ['Compara 1,25 veces la pendiente con 1.'],
      because:
        'Los conteos encontrados van como la exposición elevada a 1,25 veces la pendiente menos 1, limitados por el cielo. Eso es positivo (gana lo profundo) por encima de una pendiente de 0,8 y negativo (gana lo ancho) por debajo.',
    },
    {
      title: 'Una regla con límites',
      body: 'Gana lo profundo donde los conteos crecen más rápido que 0,8 dex por magnitud, y lo ancho donde crecen más despacio: las galaxias débiles reales se aplanan por debajo de eso, y por eso dominan los censos anchos. Los conteos aquí son solo de Poisson (sin agrupamiento), las clases son leyes de potencias declaradas y el tiempo es una fracción despejada supuesta. Un censo real pondría a prueba la regla con sus propios conteos.',
    },
  ],
};

export const DEEP_OR_WIDE_DEEPER_ES = {
  steps: [
    {
      title: 'El exponente',
      body: 'Limitada por el cielo, la profundidad gana 1,25 magnitudes por década de exposición y el área cae como uno entre la exposición.',
      prompt:
        'Para una clase con pendiente 1,0, las fuentes encontradas van como la exposición elevada a p. ¿Cuánto vale p?',
      hints: ['1,25 veces la pendiente, menos 1.'],
      because:
        'Los conteos por grado cuadrado van como la exposición elevada a 1,25 veces la pendiente, y el área como la exposición a menos uno: 1,25 - 1 = 0,25.',
    },
    {
      title: '¿Encuentra la regla la mejor exposición?',
      body: 'Para la clase aplanada (pendiente 0,4) el panel da tanto la exposición que encuentra más fuentes como la estimación de la regla limitada por el cielo, 1,25 veces la pendiente entre uno menos eso, por el tiempo muerto. Lee ambas.',
      fields: [
        { label: 'Mejor exposición encontrada' },
        { label: 'La regla limitada por el cielo da' },
      ],
    },
    {
      title: 'Profundidad frente a contaminación',
      body: 'Bajar el umbral de detección encuentra fuentes más débiles, pero los picos de ruido también lo superan. Para la clase empinada en el telescopio de un metro, 31,6 s por visita, diez noches, a <strong>3 sigma</strong>: lee la profundidad y la parte de las detecciones que son reales.',
      fields: [
        { label: 'Profundidad en el umbral' },
        { label: 'Fiabilidad, la parte real de las detecciones' },
      ],
    },
    {
      title: 'Lo que cuesta un umbral',
      body: 'A 3 sigma el censo es media magnitud más profundo y encuentra muchas más fuentes, con una de cada diez falsa.',
      prompt: 'Para una clase rara, ¿qué le pasa a la fiabilidad a 3 sigma?',
      options: [
        'Cae mucho más: los falsos positivos no dependen de la clase, así que ahogan a una clase rara',
        'Se mantiene igual, porque la tasa de falsos es propia del umbral solo para las fuentes reales',
        'Sube, porque una clase rara es más fácil de distinguir',
        'No se puede decir',
      ],
      hints: [
        'Los falsos positivos por grado cuadrado dependen del ruido y del umbral, no de la clase.',
      ],
      because:
        'El número de detecciones falsas por grado cuadrado es la cola del ruido sobre el umbral por el número de elementos independientes: no depende de cuántas fuentes reales haya, así que cuantas menos haya, mayor es la parte falsa. Para una clase rara a 3 sigma puede superar la mitad.',
    },
  ],
};

export const TWO_TELESCOPES_ES = {
  title: 'Dos telescopios, una pregunta',
  subtitle:
    'La misma profundidad sobre la misma área con un telescopio de un metro y uno de 8,4 metros: cuánto más tarda el pequeño, y por qué',
  objectives: [
    'Predecir cuánto más tarda un telescopio de un metro que uno de 8,4 metros en alcanzar la misma profundidad sobre la misma área',
    'Leer en el panel las visitas, los apuntados y las horas que necesita cada instalación, y su cociente',
    'Decir que dos cosas lo fijan: la luz que reúne cada apuntado (profundidad) y el campo que cubre (área)',
  ],
  steps: [
    {
      title: 'Un objetivo, dos telescopios',
      body: 'El objetivo: llegar a la magnitud 23 sobre 10 grados cuadrados, con 100 s por visita. El panel da, para cada instalación, las visitas que debe apilar en cada apuntado para alcanzar la profundidad, los apuntados para cubrir el área y las horas. Las dos instalaciones son el Las Cumbres de 1,0 m con un campo de 0,2 grados cuadrados y Rubin (8,4 m, 9,6 grados cuadrados); su rendimiento es un valor supuesto y el campo, la escala de píxel y el tiempo muerto vienen de la tabla citada.',
    },
    {
      title: '¿Cuánto más?',
      body: 'Rubin reúne unas 70 veces la luz del telescopio de un metro y cubre unas 50 veces el cielo en cada apuntado.',
      prompt:
        '¿Cómo se compara el tiempo que necesita Rubin para este objetivo con el del telescopio de un metro?',
      options: [
        'Más o menos igual: la cámara es el mismo tipo de detector',
        'Unas 10 veces menos',
        'Unas 60 veces menos',
        'Unas 600 veces menos',
      ],
      hints: [
        'Ambas ventajas ayudan, pero Rubin alcanza la profundidad en una visita y el pequeño en dos.',
      ],
      because:
        'El telescopio de un metro necesita dos visitas apiladas en cada uno de 52 apuntados (3,8 horas); Rubin alcanza la profundidad en una visita y necesita 2 apuntados (3,7 minutos): unas 60 veces menos.',
    },
    {
      title: 'Lee las horas',
      body: 'Lee las horas que necesita la primera instalación (el telescopio de un metro) y el cociente de la segunda entre la primera.',
      fields: [
        { label: 'Horas del telescopio de un metro' },
        { label: 'La segunda tarda este número de veces lo que la primera' },
      ],
    },
    {
      title: '¿Por qué tanto?',
      body: 'El cociente es de aproximadamente 1 entre 65.',
      prompt: '¿Qué dos ventajas del telescopio grande se combinan para darlo?',
      options: [
        'Su espejo mayor alcanza la profundidad con menos visitas (profundidad por apuntado), y su campo más ancho necesita muchos menos apuntados (área por apuntado)',
        'Solo su espejo: el campo no importa',
        'Solo su campo: el espejo no importa',
        'Su sitio más alto: el cielo es el mismo para ambos',
      ],
      hints: [
        'Cuenta las visitas y los apuntados que necesita cada instalación.',
      ],
      because:
        'El tiempo es los apuntados por las visitas por el coste de una visita. Rubin necesita 26 veces menos apuntados y un apilado menor, así que el producto cae unas 65 veces.',
    },
    {
      title: 'Límites de la comparación',
      body: 'Ambas instalaciones toman la misma exposición por visita y el mismo umbral de detección, con un rendimiento supuesto de 0,5 y la misma fracción despejada; los apuntados no se solapan. Otra exposición cambia la respuesta: un telescopio pequeño con una exposición más larga desperdicia menos tiempo en tiempo muerto. El cociente es un modelo para una conversación de planificación, no un pronóstico.',
    },
  ],
};

export const TWO_TELESCOPES_DEEPER_ES = {
  steps: [
    {
      title: 'El cociente de campos',
      body: 'Cada apuntado de Rubin cubre 9,6 grados cuadrados y cada uno del telescopio de un metro 0,195.',
      prompt: '¿Cuántas veces más cielo cubre un apuntado de Rubin?',
      hints: ['Divide los dos campos.'],
      because:
        '9,6 / 0,195 = 49,2: 52 apuntados frente a 2 es el mismo factor salvo el redondeo a apuntados enteros.',
    },
    {
      title: 'Una exposición fija',
      body: 'Ambas instalaciones toman 100 s por visita.',
      prompt:
        '¿Por qué una exposición distinta puede cambiar qué instalación parece mejor?',
      options: [
        'Cada visita cuesta un tiempo muerto que la exposición no cambia, así que una exposición corta desperdicia una parte mayor en una instalación de tiempo muerto largo, y una exposición más profunda de lo que pide el objetivo desperdicia tiempo',
        'La exposición no importa: solo el espejo y el campo',
        'Una exposición más larga favorece siempre al telescopio mayor',
        'El detector se satura a los 100 s',
      ],
      hints: [
        'Compara los 28 s de tiempo muerto del telescopio de un metro con su visita de 100 s.',
      ],
      because:
        'El tiempo por apuntado es las visitas por (exposición más tiempo muerto); una exposición mucho más corta o más profunda de lo que pide el objetivo cambia esa mezcla. La comparación es función de la exposición.',
    },
  ],
};

export const PROPOSE_AN_OBSERVATION_ES = {
  title: 'Propón una observación',
  subtitle:
    'Diseña un censo para un objetivo declarado, predice qué encontrará, compruébalo con el modelo y justifica el plan: muchos planes son correctos',
  objectives: [
    'Elegir una instalación, exposición, visitas, noches y umbral que cumplan una profundidad, un área y una fiabilidad declaradas, y decir qué encontrará el plan antes de comprobarlo',
    'Justificar la elección por lo que cede, y nombrar una alternativa que también cumpla el objetivo',
    'Decir qué deja fuera el modelo (agrupamiento, una población real, el tiempo) y qué le hace al intervalo del conteo',
  ],
  steps: [
    {
      title: 'El encargo',
      body: 'Tienes <strong>diez noches</strong>. Encuentra fuentes de la <em>clase aplanada</em> (conteos que crecen 0,4 dex por magnitud) hasta una profundidad de <strong>magnitud 22,5</strong>, sobre al menos <strong>100 grados cuadrados</strong>, con al menos un <strong>95 por ciento</strong> de las detecciones reales. Hay tres instalaciones: los telescopios Las Cumbres de 0,35 m y de 1,0 m y Rubin. Explora con el panel y propón después un plan.\n\nNo hay un único plan correcto. Se comprueba si tu plan cumple el objetivo y si lo que dices que alcanza coincide con él.',
    },
    {
      title: 'Propón un plan',
      body: 'Introduce tu plan: la instalación, la exposición, las visitas apiladas, las noches (como máximo 10) y el umbral de detección. Después di qué alcanza: la profundidad (la magnitud a la que se encuentra la mitad de las fuentes) y el número de fuentes encontradas por grado cuadrado. Ambas son predicciones que puedes comprobar en el panel.',
      fields: [
        { label: 'Instalación: 1 LCO 0,35 m, 2 LCO 1,0 m, 3 Rubin 8,4 m' },
        { label: 'Exposición por visita' },
        { label: 'Visitas apiladas' },
        { label: 'Noches' },
        { label: 'Umbral de detección' },
        { label: 'Profundidad que alcanza tu plan (se encuentra la mitad)' },
        { label: 'Fuentes que encuentra tu plan por grado cuadrado' },
      ],
    },
    {
      title: '¿Por qué este plan?',
      body: 'Un plan es un conjunto de compromisos. Di a qué renuncia el tuyo.',
      prompt:
        '¿Por qué este plan? Di a qué renunciaste y nombra un plan distinto que también habría cumplido el objetivo y por qué no lo elegiste.',
      rubric:
        'Crédito por nombrar un compromiso real (profundidad frente a área, umbral frente a falsos positivos, tiempo muerto frente a exposición), por un segundo plan que sí cumpla el objetivo (por ejemplo otra instalación) y por decir qué deja fuera el modelo (agrupamiento, una población real, el tiempo). Cualquier plan que la pantalla aceptó es una respuesta válida; no califique la elección, califique el razonamiento.',
      rubricCriteria: [
        {
          name: 'El plan cumple el objetivo',
          levels: [
            {
              label: 'Completo',
              text: 'El plan propuesto fue aceptado: viable y coherente.',
            },
            {
              label: 'Aún no',
              text: 'El plan no fue aceptado, o no se introdujo ninguno.',
            },
          ],
        },
        {
          name: 'Nombra el compromiso',
          levels: [
            {
              label: 'Completo',
              text: 'Dice a qué renuncia el plan y por qué valió la pena.',
            },
            { label: 'Aún no', text: 'Repite el plan sin un compromiso.' },
          ],
        },
        {
          name: 'Un plan válido distinto',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una alternativa que también cumple el objetivo.',
            },
            {
              label: 'Aún no',
              text: 'No nombra ninguna, o una que no cumple el objetivo.',
            },
          ],
        },
        {
          name: 'Lo que deja fuera el modelo',
          levels: [
            {
              label: 'Completo',
              text: 'Dice qué no incluye el intervalo del conteo (agrupamiento, una población real, el tiempo).',
            },
            {
              label: 'Aún no',
              text: 'Trata el intervalo como toda la incertidumbre.',
            },
          ],
        },
      ],
      hints: [
        'Dos planes en instalaciones distintas pueden cumplir este objetivo.',
      ],
    },
    {
      title: 'Muchos planes, un objetivo',
      body: 'El telescopio de un metro con unos 60 s por visita durante diez noches, Rubin con unos 30 s y el de 0,35 m con unos 1000 s cumplen este objetivo; un umbral de 3 sigma profundiza cada uno pero incumple la fiabilidad. La pantalla juzga la viabilidad y la coherencia, nunca una respuesta única. El intervalo del conteo es solo de Poisson: un censo real dispersa más, por el agrupamiento y porque la población real difiere de una clase declarada.',
    },
  ],
};

export const PROPOSE_AN_OBSERVATION_DEEPER_ES = {
  steps: [
    {
      title: 'Un segundo plan',
      body: 'Propón ahora un segundo plan que también cumpla el objetivo, en una instalación distinta de la primera.',
      fields: [
        { label: 'Instalación: 1 LCO 0,35 m, 2 LCO 1,0 m, 3 Rubin 8,4 m' },
        { label: 'Exposición por visita' },
        { label: 'Visitas apiladas' },
        { label: 'Noches' },
        { label: 'Umbral de detección' },
        { label: 'Profundidad que alcanza tu plan (se encuentra la mitad)' },
        { label: 'Fuentes que encuentra tu plan por grado cuadrado' },
      ],
    },
    {
      title: 'Compara tus dos planes',
      body: 'Ambos planes cumplen el objetivo.',
      prompt:
        '¿Cuál propondrías a un comité de asignación de tiempo y qué te haría cambiar de opinión?',
      rubric:
        'Crédito por elegir con un criterio declarado (robustez frente al tiempo, tiempo usado, margen sobre la profundidad, fiabilidad) y por nombrar algo que cambiaría la elección. Ningún plan es la respuesta.',
    },
    {
      title: 'Lo que pierde el intervalo',
      body: 'El panel da un conteo con un intervalo de Poisson.',
      prompt:
        '¿Qué efecto hace que el conteo de un censo real disperse más que ese intervalo?',
      options: [
        'El agrupamiento y la varianza cósmica: las fuentes no se reparten de forma independiente, así que el conteo en un campo varía más que Poisson',
        'La forma del espejo del telescopio',
        'El tiempo de exposición',
        'El número de visitas',
      ],
      hints: ['Piensa en qué supone Poisson sobre dónde están las fuentes.'],
      because:
        'Un conteo de Poisson supone que las fuentes caen de forma independiente. Las fuentes reales se agrupan, así que la varianza entre campos es mayor, y un censo debe dar su intervalo con eso incluido.',
    },
  ],
};

// ---- instructor content ---------------------------------------------------------------------

const GUIDE = (
  topic,
  overview,
  difficulty,
  placement,
  concepts,
  misconceptions,
  notes,
  discussion,
  extensions
) => ({
  topic,
  difficulty,
  placement,
  overview,
  priorKnowledge: [
    'Magnitudes as a logarithmic brightness scale, fainter being a larger number',
    'That a longer exposure reaches fainter sources',
    'A telescope’s collecting area and field of view',
  ],
  keyConcepts: concepts,
  features: [
    {
      name: 'The survey panels (survey-design-tradeoff, survey-design-plan and survey-design-compare)',
      text: 'The area surveyed and the sources found against the exposure, a plan’s depth, area, detections and false positives with a verdict, and the time two facilities need for one goal. Every number is the survey kernel’s over a cited instrument table with a supplied throughput.',
    },
    {
      name: 'Depth',
      text: 'Each investigation has deeper steps (quantitative and advanced) that add a rule, its limits and the contamination of a threshold.',
    },
    {
      name: 'Teaching models, stated',
      text: 'The classes of source are power laws with a stated slope, not real populations; every patch is synthetic; the counts are Poisson only.',
    },
  ],
  misconceptions,
  teachingNotes: notes,
  discussion,
  extensions,
  modelNotes:
    'js/kernels/survey/ (depth, counts, completeness, false positives, plan, trade-off), js/instruments/survey.js over the instrument library and the exposure calculator, js/surveyDesignField.js, SURVEY_DESIGN.md.',
});

const CONTENT = {
  'deep-or-wide': GUIDE(
    'Depth against area at fixed time: for a class of source whose counts rise by a stated slope, long exposures over a small area or short ones over a large area find more, and the slope against 0.8 dex a magnitude decides it; a lower threshold buys depth and false positives',
    'Students predict which strategy finds more of a steeply rising class, read the exposure that finds most sources for a Euclidean class (about 335 s) and a steep one (the longest slider value), say what decides it, and, in the deeper steps, compute the exponent, see that the sky-limited rule undershoots the best exposure, and read what a 3 sigma threshold costs in reliability.',
    'Introductory (the prediction, two readings and the rule); majors (the exponent and why the rule undershoots); advanced (a threshold’s depth against its false positives)',
    'In a survey course after magnitudes and telescopes, or in an observing unit before survey design; the capstone, Propose an Observation, follows.',
    [
      {
        heading: 'The slope of the counts decides it',
        body: 'Sky-limited, the depth gains 1.25 magnitude a decade of exposure; counts per square degree rise as the exposure to 1.25 times the slope; the area falls as one over the exposure. Deep wins only above a slope of 0.8 dex a magnitude.',
      },
      {
        heading: 'A rule is a limit',
        body: 'The rule ignores the source’s own noise and the read noise, which make depth rise faster at short exposures: the best exposure found is larger than the rule’s (84 s against 33 s for the flattened class, 335 against 99 for the Euclidean).',
      },
      {
        heading: 'A threshold has a price',
        body: 'False positives per square degree depend on the noise and the threshold, not on the class; a lower threshold is deeper and less reliable, and for a rare class the false share can exceed half.',
      },
    ],
    [
      {
        claim: 'More sky is always better than more depth.',
        response:
          'Only for a class whose counts rise more slowly than 0.8 dex a magnitude; for a steep class deep wins.',
      },
      {
        claim: 'A bigger telescope decides the strategy.',
        response:
          'It sets how deep an exposure goes; the class’s counts set whether that depth pays.',
      },
      {
        claim:
          'A 3 sigma detection is as good as a 5 sigma one with more sources.',
        response:
          'It finds more, and a share of them are noise; the panel reports the share.',
      },
    ],
    [
      'The classes are stated power laws (teaching models): the Euclidean slope 0.6 is derived for sources uniform in a Euclidean volume; the others are stated, with no claim about a real population.',
      'The best exposure is read from a grid of 41 exposures (0.075 dex apart), so it is good to about 20 percent.',
      'Inherited limits: Poisson counts, Gaussian noise, an assumed 0.6 clear fraction, no clustering, no Moon, a supplied throughput.',
    ],
    [
      'Real faint galaxies have a counts slope that flattens below 0.4: what does the rule say about deep fields?',
      'A time-allocation committee asks for the survey with the most sources: what question do you ask before answering?',
    ],
    [
      'Use the plan panel to find the exposure at which the 5 sigma reliability for the steep class first drops below 99 percent at a 3.5 sigma threshold.',
    ]
  ),
  'two-telescopes-one-question': GUIDE(
    'Instrument comparison for one goal: a one-metre telescope and an 8.4-metre one reaching 23rd magnitude over 10 square degrees; the time ratio is about 1 in 65 and has two sources, the depth each pointing reaches and the sky each pointing covers',
    'Students predict the time ratio, read the hours and the ratio from the panel, say which two advantages combine, and in the deeper steps compute the field ratio and see that the comparison depends on the exposure chosen.',
    'Introductory (the prediction and the reading); majors (the field ratio); advanced (the fixed-exposure caveat)',
    'In an observing or instrumentation unit, after Deep or Wide?; before the capstone.',
    [
      {
        heading: 'Two advantages, one ratio',
        body: 'The time is the pointings times the visits times the cost of a visit. The large telescope needs fewer visits (it is deeper per pointing) and far fewer pointings (it covers more sky): the factors multiply.',
      },
      {
        heading: 'The rule of thumb is a limit',
        body: 'Sky-limited, the time to a depth scales as the seeing squared over the collecting power; the panel shows it beside the full calculation, which includes the field, the overhead and whole pointings.',
      },
      {
        heading: 'The answer depends on the exposure',
        body: 'The comparison fixes one exposure per visit for both; an exposure far from what each needs wastes time in overhead or in depth.',
      },
    ],
    [
      {
        claim: 'The larger mirror alone explains the difference.',
        response:
          'The field of view is a factor of about 50; both advantages multiply.',
      },
      {
        claim: 'The ratio is a property of the telescopes.',
        response:
          'It is a property of the telescopes and the goal and the exposure.',
      },
    ],
    [
      'The facilities are from the instrument library (a cited table of the field, pixel scale and cycle time); the throughput (0.5), the dark current and a 5 s slew are supplied.',
      'Pointings do not overlap and are whole numbers, which is why the ratio of pointings (26) differs from the ratio of fields (49).',
      'Inherited limits: one exposure for both, Poisson counts are not used here, a stated clear fraction.',
    ],
    [
      'When would a small telescope with a wide field be the better choice?',
      'What would you ask of each facility’s time-allocation process before using this ratio?',
    ],
    [
      'Change the exposure for the one-metre telescope to 3 s and read the ratio again.',
    ]
  ),
  'propose-an-observation': GUIDE(
    'A capstone in survey design: choose a facility, an exposure, visits, nights and a threshold for a stated depth, area and reliability, predict what the plan reaches, and justify it; many plans meet the goal and the screen judges feasibility and consistency, never one plan',
    'Students explore the panel, enter a plan and what they say it reaches (the depth and the sources per square degree); the screen accepts it when the survey kernel finds it feasible for the goal and the stated numbers agree with the plan within a tolerance. A written justification is marked with the rubric criteria; deeper steps ask for a second plan and the limits of the interval.',
    'Upper-level (the capstone is open-ended; the key states the rule, not a plan)',
    'As the closing task of an observing unit, after Deep or Wide? and Two Telescopes, One Question.',
    [
      {
        heading: 'Feasibility and consistency',
        body: 'A plan is feasible when it reaches the goal depth, covers the goal area, does not saturate and keeps the reliability; it is consistent when what the student says it reaches matches the kernel within 0.15 mag and 10 percent.',
      },
      {
        heading: 'Many plans are right',
        body: 'The one-metre telescope at about 60 s, Rubin at about 30 s and the 0.35 m telescope at about 1000 s all meet the goal; a 3 sigma threshold fails the reliability for each.',
      },
      {
        heading: 'The interval is Poisson only',
        body: 'The count’s interval does not include clustering, cosmic variance or the real population differing from a stated class.',
      },
    ],
    [
      {
        claim: 'There is one correct plan.',
        response:
          'The screen accepts any plan that is feasible and consistent; the marks are for the reasoning in the justification.',
      },
      {
        claim: 'The Poisson interval is the whole uncertainty.',
        response: 'It is a lower bound: a real survey scatters more.',
      },
    ],
    [
      'The class is a teaching model; every number is the model’s with the limits the panel lists.',
      'Mark the justification with the four criteria (correctness, reasoning, a second plan, uncertainty): the correctness criterion is whether the screen accepted a plan.',
      'The student’s numbers are checked against the kernel, so a plan copied from a neighbour with different numbers is flagged.',
    ],
    [
      'Which of the plans on the board would you fund and why?',
      'What would change your plan if the weather were worse than assumed?',
    ],
    ['Change the goal to 23 mag and see which plans survive.']
  ),
};

const FLOW = {
  'deep-or-wide': [
    {
      from: 'two-ways-to-spend-the-nights',
      to: 'predict-deep-or-wide',
      text: 'Two ways to spend ten nights and the prediction for a steeply rising class, before the panel shows it.',
    },
    {
      from: 'euclid-best',
      to: 'steep-class',
      text: 'The best exposure for the Euclidean class (about 335 s) and for the steep class (the longest).',
    },
    {
      from: 'what-decides-it',
      to: 'what-decides-it',
      text: 'The slope of the counts against 0.8 dex a magnitude decides it.',
    },
    {
      from: 'the-rule-and-its-limits',
      to: 'the-rule-and-its-limits',
      text: 'The rule, and what the model leaves out.',
    },
  ],
  'two-telescopes-one-question': [
    {
      from: 'one-goal-two-telescopes',
      to: 'predict-the-ratio',
      text: 'The goal, the two facilities and the prediction of the time ratio.',
    },
    {
      from: 'read-the-hours',
      to: 'read-the-hours',
      text: 'The hours each needs and their ratio, about 1 in 65.',
    },
    {
      from: 'why-so-much',
      to: 'why-so-much',
      text: 'The two advantages that multiply: depth per pointing and area per pointing.',
    },
    {
      from: 'two-limits-of-the-comparison',
      to: 'two-limits-of-the-comparison',
      text: 'The comparison is for one exposure and one threshold.',
    },
  ],
  'propose-an-observation': [
    {
      from: 'the-brief',
      to: 'the-brief',
      text: 'The goal: 22.5 mag over 100 square degrees in ten nights with 95 percent of the detections real.',
    },
    {
      from: 'propose-a-plan',
      to: 'propose-a-plan',
      text: 'A plan and what it reaches; the screen judges feasibility and consistency.',
    },
    {
      from: 'justify-the-plan',
      to: 'justify-the-plan',
      text: 'The justification: the trade, an alternative that also meets the goal and what the model leaves out.',
    },
    {
      from: 'two-valid-plans',
      to: 'two-valid-plans',
      text: 'Many plans meet the goal; a 3 sigma threshold fails the reliability.',
    },
  ],
};

const EXPECTATIONS = {
  'deep-or-wide': {
    'euclid-best':
      'A best exposure of about 335 s (within 50) for the Euclidean class on the one-metre telescope in ten nights.',
    'steep-class':
      'The longest exposure on the slider, 3162 s (within 300), for the steep class.',
  },
  'two-telescopes-one-question': {
    'read-the-hours':
      'About 3.84 hours (within 0.15) for the one-metre telescope and a ratio of about 0.0155 (within 0.002).',
  },
  'propose-an-observation': {},
};

const BANDS = {
  'deep-or-wide': { core: 'short', quantitative: 'medium', advanced: 'medium' },
  'two-telescopes-one-question': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  'propose-an-observation': {
    core: 'medium',
    quantitative: 'long',
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
  'deep-or-wide': DEEP_OR_WIDE_ES,
  'two-telescopes-one-question': TWO_TELESCOPES_ES,
  'propose-an-observation': PROPOSE_AN_OBSERVATION_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'deep-or-wide': DEEP_OR_WIDE_DEEPER,
  'two-telescopes-one-question': TWO_TELESCOPES_DEEPER,
  'propose-an-observation': PROPOSE_AN_OBSERVATION_DEEPER,
};
export const DEPTH_ES = {
  'deep-or-wide': DEEP_OR_WIDE_DEEPER_ES,
  'two-telescopes-one-question': TWO_TELESCOPES_DEEPER_ES,
  'propose-an-observation': PROPOSE_AN_OBSERVATION_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [DEEP_OR_WIDE, TWO_TELESCOPES, PROPOSE_AN_OBSERVATION];
