// =============================================================================
// Why the Period Is Wrong, and the upper depth of Design the Schedule (Prompt 214)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure file
// the prompt adds (D-R10-214-02), because the shared sequence files sit at their
// line ceilings. It also carries the three advanced steps Design the Schedule gains
// (DEPTH['design-the-schedule']), whose core steps are untouched. The per-lesson
// path every loader builds from an id is a one-line re-export of a named export
// here, and the instructor modules read INSTRUCTOR. No imports: every number a step
// states is recomputed in tests/strategyLessons.test.js from the instruments
// (js/strategyWidgets.js over js/strategyField.js and js/kernels/strategy/). Every
// step carries a `sid`, an opaque stable id that student progress is keyed by.
//
// The series are synthetic and say so; the verdict is a sinusoid's; the weather is
// a seeded draw, never a forecast (OBSERVING_STRATEGY.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A variable star', teffK: 6500, lumSun: 4 }],
};
/** The window panel with its controls set: the cadence is an index (see CADENCES), the period in days. */
const WIN = (values = {}) => ({
  id: 'strategy-window',
  values: {
    cadence: 0,
    period: 0.8,
    nights: 40,
    snr: 5,
    series: 0,
    ...values,
  },
});
/** The plan panel with its controls set: Cerro Tololo, 14 nights, three visits a night. */
const PLAN = (values = {}) => ({
  id: 'strategy-plan',
  values: {
    site: 0,
    target: 0,
    nights: 14,
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

export const WHY_THE_PERIOD_IS_WRONG = {
  id: 'why-the-period-is-wrong',
  thumbnail: 'images/investigations/why-the-period-is-wrong.webp',
  title: 'Why the Period Is Wrong',
  subtitle:
    'Why looking once a night cannot tell a period from its aliases, how to design a cadence that can, and what a plan costs',
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
    'Predict what period a search returns for a star observed once a night at the same time, and say why the data cannot tell the true period from its aliases',
    'Read the aliases a cadence predicts and the verdict (resolved or ambiguous) from the panel',
    'Say which changes to a cadence break the tie (irregular times) and which do not (more nights at the same time)',
    'Say that a period quoted from a search carries the cadence that produced it',
  ],
  steps: [
    {
      sid: 'a-star-seen-once-a-night',
      stage: STAGE,
      type: 'read',
      title: 'A star seen once a night',
      body: `A star brightens and fades every <strong>0.8 days</strong>, about 19 hours. You
             can look at it from one observatory, once a night, for forty nights, at the
             same time each night. The panel below is the period search&rsquo;s own view
             of that plan: the blue curve is what the search returns for a
             <em>perfect</em> signal at the true frequency when it is sampled at your
             epochs. The true peak is 1; every other peak is an <strong>alias</strong>, a
             frequency your cadence cannot tell from the true one.
             \n\nEvery series here is <strong>synthetic</strong>: made by the model, with
             the period set to 0.8 days. Nobody observed it.`,
      tool: WIN(),
    },
    {
      sid: 'predict-the-period',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-aliases',
      title: 'What will the search say?',
      body: `Forty visits, one a night, always at the same time. The true period is 0.8
             days. A period search looks for the period that fits the points best.`,
      prompt: 'The search will return&hellip;',
      options: [
        '0.8 days, the true period, because that is the only period the star has',
        'The true period and a period of about 4 days fit the points equally well, so the data cannot say which',
        'No period at all: forty points are too few to find one',
        'A period of exactly one day, the spacing of the visits',
      ],
      answer: 1,
      hints: [
        'Look at the curve: how high is the tallest peak other than the true one?',
      ],
      because:
        'The data cannot tell them apart: one visit a night at the same time recurs once a sidereal day, so a star that pulses every 0.8 days and one that pulses every 4.04 days give exactly the same forty points. The curve reaches 1 at the alias as well as at the truth.',
      tool: WIN(),
    },
    {
      sid: 'the-aliases',
      stage: STAGE,
      type: 'measure',
      title: 'Read the aliases',
      body: `In the panel (<em>one visit a night, same time</em>, true period 0.8 days)
             read the three alias rows. One of them is near 4 days. Type its period, and
             the <em>chi-square preference</em> the data give the true period over it:
             how many times worse than the truth a fit at the alias is, in the
             statistician&rsquo;s units. Nine or more is a clear preference.`,
      fields: [
        { id: 'p', label: 'The alias near 4 days', unit: 'd', hint: '4.04' },
        { id: 'x', label: 'Chi-square preference for the truth', hint: '0' },
      ],
      validate: v => {
        if (![v.p, v.x].every(Number.isFinite)) return null;
        if (near(v.p, 4.044, 0.02) && near(v.x, 0, 0.5)) {
          return {
            level: 'ok',
            message:
              '4.04 days, and a preference of 0: the data favour the true period by nothing at all. The alias is the true frequency, 1.25 cycles a day, less one visit-spacing, 1.0027 cycles a day: 0.2473 cycles a day, a period of 4.044 days. The panel calls this ambiguous.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the cadence “one visit a night, same time”, the true period 0.8 days, and read the alias row that is near 4 days: its period (4.04) and its chi-square preference (0).',
        };
      },
      tool: WIN(),
    },
    {
      sid: 'why-the-comb',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Where the aliases come from',
      body: `The alias periods are 4.04, 0.444 and 0.307 days, none of them a multiple or a
             simple fraction of 0.8. Yet one visit a night puts all of them in the list.`,
      prompt: 'Why does a cadence of one visit a night produce them?',
      options: [
        'The visits recur once a sidereal day, so a frequency and the same frequency shifted by one cycle a day look identical at every visit',
        'The star is really pulsing at several periods at once',
        'The telescope is too small to measure the star accurately',
        'There are too few visits: with a hundred nights the aliases would vanish',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'several',
          option: 1,
          say: 'The model star has one period, 0.8 days. The other periods are in the sampling, not in the star.',
        },
        {
          id: 'small',
          option: 2,
          say: 'The noise is not the problem here: a perfect, noise-free signal has the same aliases. They come from when you look.',
        },
        {
          id: 'more',
          option: 3,
          say: 'More nights at the same time of day sharpen every peak, aliases included. The comb stays exactly as high.',
        },
      ],
      hints: [
        'Between one visit and the next the star completes a whole number of pulses plus a fraction. What if the fraction repeats?',
      ],
      because:
        'Between two visits a day apart the star advances 1.25 pulses, a quarter more than a whole number. A star pulsing 0.25 times a day would advance the same 0.25, so at the visits the two look identical. Shifting a frequency by one cycle a day, the visit rate, changes nothing the visits can see.',
      tool: WIN(),
    },
    {
      sid: 'break-the-tie',
      stage: STAGE,
      type: 'measure',
      title: 'Break the tie',
      body: `Change the cadence to <em>three visits a night, irregular</em>: the same forty
             nights, but each night three visits at different clock times. Read the
             strongest alias row: how high its peak stands, in percent of the true peak,
             and the chi-square preference the data now give the truth.`,
      fields: [
        {
          id: 'h',
          label: 'Strongest alias, percent of the true peak',
          hint: '67',
        },
        { id: 'x', label: 'Chi-square preference for the truth', hint: '490' },
      ],
      validate: v => {
        if (![v.h, v.x].every(Number.isFinite)) return null;
        if (near(v.h, 67, 3) && near(v.x, 491, 30)) {
          return {
            level: 'ok',
            message:
              'The alias falls to about two thirds of the true peak and the data prefer the truth by about 490, far above the 9 that counts as clear. The panel calls this resolved. Nothing about the star or the telescope changed: only when you looked.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the cadence to “three visits a night, irregular” (period 0.8 days, forty nights) and read the first alias row: about 67 percent and a preference near 490.',
        };
      },
      tool: WIN({ cadence: 1 }),
    },
    {
      sid: 'what-breaks-it',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What breaks the tie',
      body: `You could change the plan in several ways.`,
      prompt: 'Which one breaks the tie between the period and its alias?',
      options: [
        'Looking at irregular times, so that the visits do not all recur at one rate',
        'Looking on more nights, always at the same time',
        'Exposing longer on each visit',
        'Using a bigger telescope',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'more-nights',
          option: 1,
          say: 'More nights at the same time keep every visit on the same comb. Try sixty nights in the panel with the cadence “one visit a night, same time”: the alias is still exactly as high as the truth.',
        },
        {
          id: 'longer',
          option: 2,
          say: 'A longer exposure lowers the noise of each point. The aliases are in the times of the points, not their noise.',
        },
        {
          id: 'bigger',
          option: 3,
          say: 'A bigger telescope also lowers the noise. A noise-free signal still has the same aliases.',
        },
      ],
      hints: [
        'What do the five cadences in the panel have in common when the verdict is resolved?',
      ],
      because:
        'Aliases come from the times. Only a cadence whose visits do not all fall on one regular comb lowers the alias below the truth; noise, exposure and aperture do not enter.',
      tool: WIN({ cadence: 1 }),
    },
    {
      sid: 'the-wrong-answer',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The search that sounded sure',
      body: `Go back to <em>one visit a night, same time</em> and switch on <strong>Run the
             search on a series</strong>. The panel makes the series the plan would produce
             (0.8 days, with noise) and runs the period search on it. It returns about
             <strong>0.266 days</strong>.`,
      prompt: 'What does that result tell you?',
      options: [
        'The star pulses every 0.266 days',
        'An alias won the search: the true period is one of the periods the panel lists, and these visits cannot say which',
        'The search is broken: it should have found 0.8 days',
        'The noise made the star pulse faster',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'trust-search',
          option: 0,
          say: 'A search always returns a tallest peak, and here forty peaks are nearly equal. Which one wins is decided by noise. The panel called the cadence ambiguous before any search was run.',
        },
        {
          id: 'broken',
          option: 2,
          say: 'The search found the tallest peak correctly. The cadence made the peaks equal.',
        },
      ],
      hints: ['Read the verdict row first.'],
      because:
        'The verdict was ambiguous before the search ran. With a perfect comb the true period and its aliases are equal, so a search returns whichever noise favours. A period from a search is only as good as the cadence that produced it.',
      tool: WIN({ series: 1 }),
    },
    {
      sid: 'the-cadence-comes-first',
      stage: STAGE,
      type: 'read',
      title: 'The cadence comes first',
      body: `The aliases were predictable before the first night. The window function of the
             epochs says which periods the plan cannot tell apart, and the panel&rsquo;s
             verdict says whether the noise lets you pick the true one. A period you report
             should carry the cadence that produced it, so that a reader can compute the
             aliases too. The deeper steps design a cadence that breaks the tie, verify it
             on a series, and measure the window, the phase coverage and the cost of a
             plan.`,
      tool: WIN({ cadence: 1 }),
    },
  ],
};

export const WHY_THE_PERIOD_IS_WRONG_DEEPER = {
  id: 'why-the-period-is-wrong',
  steps: [
    {
      sid: 'design-a-cadence',
      after: 'break-the-tie',
      depth: 'quantitative',
      type: 'measure',
      title: 'Design a cadence',
      body: `Three visits a night worked, but it costs three times the telescope time. Try
             <em>one visit a night, clock time varies</em>: one visit each night, but its
             clock time moves by up to 3.6 hours either way. Read the strongest alias row.`,
      fields: [
        {
          id: 'h',
          label: 'Strongest alias, percent of the true peak',
          hint: '77',
        },
        { id: 'x', label: 'Chi-square preference for the truth', hint: '116' },
      ],
      validate: v => {
        if (![v.h, v.x].every(Number.isFinite)) return null;
        if (near(v.h, 77, 3) && near(v.x, 116, 15)) {
          return {
            level: 'ok',
            message:
              'The alias stands at 77 percent and the data prefer the truth by 116: resolved, with one visit a night. Scattering the clock time costs no telescope time, only a little planning.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the cadence “one visit a night, clock time varies”, 0.8 days, forty nights: about 77 percent and a preference near 116.',
        };
      },
      tool: WIN({ cadence: 2 }),
    },
    {
      sid: 'how-many-resolve',
      after: 'design-a-cadence',
      depth: 'quantitative',
      type: 'measure',
      title: 'Which cadences resolve it?',
      body: `Step through all five cadences at 0.8 days, forty nights, and an amplitude of
             five times the noise. Count the ones whose verdict reads <em>resolved</em>.`,
      fields: [
        { id: 'n', label: 'Cadences that resolve the period', hint: '3' },
      ],
      validate: v => {
        if (!Number.isFinite(v.n)) return null;
        if (near(v.n, 3, 0.1)) {
          return {
            level: 'ok',
            message:
              'Three of the five: three visits a night, a varying clock time and random times. The two that fail are the exact comb and the two seasons, whose alias still stands at 99 percent (a preference of 6.5, below 9).',
          };
        }
        return {
          level: 'error',
          message:
            'Try cadences 0 to 4 in turn and count the verdicts that say resolved: the comb and the two seasons are ambiguous.',
        };
      },
      tool: WIN({ cadence: 3 }),
    },
    {
      sid: 'verify-on-a-series',
      after: 'how-many-resolve',
      depth: 'quantitative',
      type: 'measure',
      title: 'Verify on a series',
      body: `Take <em>three visits a night, irregular</em> and switch on <strong>Run the
             search on a series</strong>. Read the period the search finds and its
             uncertainty, from the Cramer-Rao bound for the epochs and the noise.`,
      fields: [
        { id: 'p', label: 'Period found', unit: 'd', hint: '0.8004' },
        { id: 's', label: 'Its uncertainty', unit: 'd', hint: '0.0002' },
      ],
      validate: v => {
        if (![v.p, v.s].every(Number.isFinite)) return null;
        if (near(v.p, 0.8004, 0.0006) && near(v.s, 0.0002, 0.0002)) {
          return {
            level: 'ok',
            message:
              '0.8004 days, give or take 0.0002: the right lobe, and the uncertainty is a small fraction of the gap to the nearest alias (3.2 days away). The truth, 0.8, is 1.6 standard errors off, which an honest interval allows about one time in ten.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “three visits a night, irregular” and switch the series on: the panel reports a period near 0.8004 days with an uncertainty near 0.0002.',
        };
      },
      tool: WIN({ cadence: 1, series: 1 }),
    },
    {
      sid: 'is-it-consistent',
      after: 'verify-on-a-series',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Is that consistent with 0.8 days?',
      body: `The search says 0.8004 &plusmn; 0.0002 days. The true period in the model is
             exactly 0.8.`,
      prompt: 'Is the measurement consistent with the truth?',
      options: [
        'Yes: it is 1.6 standard errors away, inside the 95 percent interval of two',
        'No: the interval does not contain 0.8',
        'Not enough information: the true period is unknown, so nothing can be compared',
        'Yes, but only because the cadence broke the alias; the uncertainty means nothing',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'inside-one',
          option: 1,
          say: 'A one-sigma interval holds the truth only about two times in three. Here the truth is 1.6 sigma away, inside two sigma.',
        },
        {
          id: 'unknown',
          option: 2,
          say: 'In this synthetic series the truth is known (that is what makes it a test of the method). In real data you would compare two measurements the same way.',
        },
      ],
      hints: ['Divide the difference by the uncertainty.'],
      because:
        'The difference is 0.0004 days, 1.6 times the uncertainty. A correct 95 percent interval holds the truth about 95 times in 100, and the validation of the panel counts exactly that over 300 series (about 94 percent).',
      tool: WIN({ cadence: 1, series: 1 }),
    },
    {
      sid: 'window-width',
      after: 'is-it-consistent',
      depth: 'advanced',
      type: 'measure',
      title: 'The width of a peak',
      body: `Read the baseline of the forty nights from the <em>Epochs</em> row (the span
             from the first visit to the last, in days). A peak in the window is about
             <strong>one over the baseline</strong> wide, in cycles a day: how finely the
             plan can tell two frequencies apart.`,
      fields: [
        { id: 'T', label: 'Baseline', unit: 'd', hint: '38.9' },
        {
          id: 'r',
          label: 'Peak width in cycles per day, one over the baseline',
          unit: '',
          compute: v => 1 / v.T,
          decimals: 4,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.T)) return null;
        if (near(v.T, 38.9, 0.3) && near(v.r, 0.0257, 0.0006)) {
          return {
            level: 'ok',
            message:
              '38.9 days and a width of 0.0257 cycles a day: the window can separate frequencies 0.03 apart, and no finer. The alias of a 0.8-day period is 1.0 cycles a day away, forty times wider than that: far outside the peak, not a smeared copy of it.',
          };
        }
        return {
          level: 'error',
          message:
            'With forty nights and one visit a night the Epochs row says 38.9 days; its inverse is 0.0257 cycles a day.',
        };
      },
      tool: WIN(),
    },
    {
      sid: 'phase-coverage',
      after: 'window-width',
      depth: 'advanced',
      type: 'measure',
      title: 'How much of the cycle you see',
      body: `Fold the visits on the period: each lands at a phase between 0 and 1 of one
             pulse. With the cadence <em>one visit a night, same time</em>, read the
             <em>Phase coverage</em> row at a true period of <strong>0.8 days</strong>
             and then of <strong>1.0 days</strong>: the number of the twenty phase bins that
             hold a point, and the largest empty arc.`,
      fields: [
        { id: 'c8', label: 'Bins filled at 0.8 d', hint: '13' },
        {
          id: 'g8',
          label: 'Largest empty arc at 0.8 d, in cycles',
          unit: '',
          hint: '0.137',
        },
        { id: 'c1', label: 'Bins filled at 1.0 d', hint: '4' },
        {
          id: 'g1',
          label: 'Largest empty arc at 1.0 d, in cycles',
          unit: '',
          hint: '0.894',
        },
      ],
      validate: v => {
        if (![v.c8, v.g8, v.c1, v.g1].every(Number.isFinite)) return null;
        if (
          near(v.c8, 13, 0.1) &&
          near(v.g8, 0.137, 0.01) &&
          near(v.c1, 4, 0.1) &&
          near(v.g1, 0.894, 0.01)
        ) {
          return {
            level: 'ok',
            message:
              'At 0.8 days the forty visits fill 13 of 20 bins and leave a 0.14-cycle gap; at a period of one day (nearly the visit spacing) they all land within 0.11 of a cycle, 4 bins, with 0.89 of the cycle never seen. A period close to the visit spacing is watched at one phase: the cadence that is regular in time stares at a few phases.',
          };
        }
        return {
          level: 'error',
          message:
            'With cadence 0, forty nights, read the Phase coverage row at 0.8 days (13 bins, 0.137) and at 1.0 days (4 bins, 0.894).',
        };
      },
      tool: WIN(),
    },
    {
      sid: 'what-a-plan-costs',
      after: 'phase-coverage',
      depth: 'advanced',
      type: 'measure',
      title: 'What a plan costs',
      body: `The plan panel asks a facility for the nights a target is usable: Cerro Tololo,
             a target at declination &minus;30, 14 nights, three visits a night each 300
             seconds plus 60 seconds of overhead. The weather is a seeded draw (draw 3,
             60 percent clear nights, persistence 0.5): it loses whole nights. Read the
             <em>Cost</em> row: the hours requested, and the hours executed.`,
      fields: [
        { id: 'r', label: 'Hours requested', unit: 'h', hint: '4.2' },
        { id: 'e', label: 'Hours executed', unit: 'h', hint: '2.4' },
        {
          id: 'l',
          label: 'Hours lost to weather',
          unit: 'h',
          compute: v => v.r - v.e,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.r, v.e].every(Number.isFinite)) return null;
        if (near(v.r, 4.2, 0.05) && near(v.e, 2.4, 0.05)) {
          return {
            level: 'ok',
            message:
              '4.2 hours asked for (42 visits of 6 minutes) and 2.4 executed: six of the fourteen nights were lost, 1.8 hours. Same plan, another draw, another loss: seed it and say so.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the panel as set (draw 3): 42 visits of 360 seconds are 4.2 hours; 8 nights observed leave 24 visits, 2.4 hours.',
        };
      },
      tool: PLAN(),
    },
    {
      sid: 'the-plan-and-the-verdict',
      after: 'what-a-plan-costs',
      depth: 'advanced',
      type: 'measure',
      title: 'Does the plan tell the period?',
      body: `Switch on <strong>Run the search on the series</strong> in the plan panel and
             read the <em>Can the plan tell the period?</em> row with <em>three visits a
             night</em>, then with <em>one visit a night</em> (the visit goes at the centre
             of the window every night, so it is the comb again). Type the chi-square
             preference of each.`,
      fields: [
        { id: 'x3', label: 'Preference with three visits a night', hint: '30' },
        { id: 'x1', label: 'Preference with one visit a night', hint: '0' },
      ],
      validate: v => {
        if (![v.x3, v.x1].every(Number.isFinite)) return null;
        if (near(v.x3, 30, 4) && near(v.x1, 0, 0.5)) {
          return {
            level: 'ok',
            message:
              'Three visits a night keep a preference of 30 even after the weather has taken six nights; one visit a night at the centre of the window is ambiguous whatever the weather does, because the window centre drifts exactly one sidereal day a night.',
          };
        }
        return {
          level: 'error',
          message:
            'Plan panel with the series on: three visits a night give a preference near 30; one visit a night gives 0.',
        };
      },
      tool: PLAN({ run: 1 }),
    },
    {
      sid: 'when-the-verdict-is-wrong',
      after: 'the-plan-and-the-verdict',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'When the verdict does not apply',
      body: `The verdict compares a sinusoid at the true period with a sinusoid at each
             alias, in white noise. A real target may be an eclipsing binary with sharp
             dips, or a star with spots that change.`,
      prompt: 'What does that do to the verdict?',
      options: [
        'It is only a sinusoid’s verdict: a sharp signal has harmonics with aliases of their own, and red noise can fake a peak, so “resolved” is not a guarantee',
        'Nothing: the verdict is exact for any light curve',
        'It makes the verdict “ambiguous” for every cadence',
        'It means the window function must be recomputed from the light curve',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'exact',
          option: 1,
          say: 'The criterion assumes a sinusoid and white noise. It says how well the cadence separates sinusoids; a real light curve may do worse.',
        },
        {
          id: 'light-curve',
          option: 3,
          say: 'The window is a property of the times alone, whatever is observed. That is why it can be computed before the first night.',
        },
      ],
      hints: ['What does the verdict assume about the signal?'],
      because:
        'The window is exact for the times; the verdict adds an assumption about the signal (a sinusoid in white noise). Say what you assumed alongside the period you report.',
      tool: PLAN({ run: 1 }),
    },
  ],
};

/** The three advanced steps Design the Schedule gains; its core steps are untouched. */
export const DESIGN_THE_SCHEDULE_DEEPER = {
  id: 'design-the-schedule',
  steps: [
    {
      sid: 'the-site-sets-the-comb',
      after: 'what-the-window-says',
      depth: 'advanced',
      type: 'measure',
      title: 'The comb the site imposes',
      body: `The window you read for your own eight nights has teeth because the site
             imposes a comb: a visit a night recurs once a sidereal day. Use the strategy
             panel for the planet of this investigation (a period of 3.5 days, the nearest
             setting) with <em>one visit a night, same time</em> over 24 nights. Read the
             verdict, and the alias period near 1.4 days.`,
      fields: [
        {
          id: 'p',
          label: 'Alias period near 1.4 days',
          unit: 'd',
          hint: '1.395',
        },
        { id: 'x', label: 'Chi-square preference for the truth', hint: '0' },
      ],
      validate: v => {
        if (![v.p, v.x].every(Number.isFinite)) return null;
        if (near(v.p, 1.395, 0.02) && near(v.x, 0, 0.5)) {
          return {
            level: 'ok',
            message:
              '1.395 days, and a preference of zero: the same comb as before. One visit a night, same time, cannot tell 3.5 days from 1.4 days whatever the noise, and sixty nights would not change it. The schedules you compared break it by their times.',
          };
        }
        return {
          level: 'error',
          message:
            'Strategy panel: cadence “one visit a night, same time”, period 3.5, 24 nights; read the alias row near 1.4 days.',
        };
      },
      tool: WIN({ period: 3.5, nights: 24 }),
    },
    {
      sid: 'an-irregular-night-costs-nothing',
      after: 'lose-a-fortnight',
      depth: 'advanced',
      type: 'measure',
      title: 'What irregular times buy, in numbers',
      body: `Change the cadence to <em>three visits a night, irregular</em> over the same
             24 nights at 3.5 days. Read the strongest alias row: how high it stands and
             the preference the data give the true period.`,
      fields: [
        {
          id: 'h',
          label: 'Strongest alias, percent of the true peak',
          hint: '69',
        },
        { id: 'x', label: 'Chi-square preference for the truth', hint: '282' },
      ],
      validate: v => {
        if (![v.h, v.x].every(Number.isFinite)) return null;
        if (near(v.h, 69, 3) && near(v.x, 282, 20)) {
          return {
            level: 'ok',
            message:
              'About 69 percent and a preference near 280: resolved. Irregular times inside a night do what irregular nights do in the investigation: no alias can be as high as the truth. It also costs three visits instead of one, a cost the plan panel counts in hours.',
          };
        }
        return {
          level: 'error',
          message:
            'Strategy panel: cadence “three visits a night, irregular”, period 3.5, 24 nights; read the first alias row.',
        };
      },
      tool: WIN({ cadence: 1, period: 3.5, nights: 24 }),
    },
    {
      sid: 'what-the-verdict-assumes',
      after: 'what-travels-with-a-period',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What the verdict assumes',
      body: `The strategy panel calls a cadence resolved when the nearest alias is rejected
             by a chi-square preference of nine or more for a sinusoid in white noise.`,
      prompt: 'What should travel with a period found on such a schedule?',
      options: [
        'The epochs, the amplitude over noise and the aliases the cadence predicts, so that a reader can see which periods were ruled out and on what assumption',
        'Only the period and its uncertainty',
        'The telescope that was used',
        'Nothing: a resolved verdict makes the period certain',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'only-period',
          option: 1,
          say: 'A period without its cadence cannot be checked: the reader cannot tell whether an alias was possible.',
        },
        {
          id: 'certain',
          option: 3,
          say: 'Resolved says the cadence separates sinusoids in white noise; it is not a proof that the star is a sinusoid.',
        },
      ],
      hints: ['What would a second astronomer need to recompute the aliases?'],
      because:
        'The aliases are computed from the epochs; whether they matter depends on the amplitude, the noise and the signal’s shape. All three belong with the number.',
      tool: WIN({ cadence: 1, period: 3.5, nights: 24 }),
    },
  ],
};

export const WHY_THE_PERIOD_IS_WRONG_ES = {
  title: 'Por qué el período sale mal',
  subtitle:
    'Por qué mirar una vez por noche no distingue un período de sus alias, cómo diseñar una cadencia que sí, y cuánto cuesta un plan',
  objectives: [
    'Predecir qué período devuelve una búsqueda para una estrella observada una vez por noche a la misma hora, y decir por qué los datos no distinguen el período verdadero de sus alias',
    'Leer en el panel los alias que predice una cadencia y el veredicto (resuelto o ambiguo)',
    'Decir qué cambios de la cadencia deshacen el empate (tiempos irregulares) y cuáles no (más noches a la misma hora)',
    'Decir que un período citado de una búsqueda lleva la cadencia que lo produjo',
  ],
  steps: [
    {
      title: 'Una estrella vista una vez por noche',
      body: 'Una estrella se aviva y se apaga cada <strong>0,8 días</strong>, unas 19 horas. Puedes mirarla desde un observatorio, una vez por noche, durante cuarenta noches, a la misma hora cada noche. El panel de abajo es la vista de la búsqueda de períodos de ese plan: la curva azul es lo que devuelve la búsqueda para una señal <em>perfecta</em> en la frecuencia verdadera cuando se muestrea en tus épocas. El pico verdadero vale 1; cualquier otro pico es un <strong>alias</strong>, una frecuencia que tu cadencia no distingue de la verdadera. \n\nTodas las series son <strong>sintéticas</strong>: las hace el modelo, con el período fijado en 0,8 días. Nadie las observó.',
    },
    {
      title: '¿Qué dirá la búsqueda?',
      body: 'Cuarenta visitas, una por noche, siempre a la misma hora. El período verdadero es 0,8 días. Una búsqueda de períodos busca el período que mejor ajusta los puntos.',
      prompt: 'La búsqueda devolverá&hellip;',
      options: [
        '0,8 días, el período verdadero, porque es el único período que tiene la estrella',
        'El período verdadero y un período de unos 4 días ajustan los puntos igual de bien, así que los datos no pueden decir cuál',
        'Ningún período: cuarenta puntos son pocos para hallar uno',
        'Un período de exactamente un día, la separación de las visitas',
      ],
      hints: [
        'Mira la curva: ¿qué altura tiene el pico más alto aparte del verdadero?',
      ],
      because:
        'Los datos no los distinguen: una visita por noche a la misma hora se repite una vez por día sidéreo, así que una estrella que pulsa cada 0,8 días y otra que pulsa cada 4,04 días dan exactamente los mismos cuarenta puntos. La curva llega a 1 en el alias igual que en la verdad.',
    },
    {
      title: 'Lee los alias',
      body: 'En el panel (<em>una visita por noche, a la misma hora</em>, período verdadero 0,8 días) lee las tres filas de alias. Una está cerca de 4 días. Escribe su período y la <em>preferencia en chi cuadrado</em> que dan los datos al período verdadero sobre él: cuántas veces peor que la verdad es un ajuste en el alias, en unidades del estadístico. Nueve o más es una preferencia clara.',
      fields: [
        { label: 'El alias cerca de 4 días' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    {
      title: 'De dónde salen los alias',
      body: 'Los períodos de los alias son 4,04, 0,444 y 0,307 días, ninguno múltiplo ni fracción simple de 0,8. Pero una visita por noche los pone todos en la lista.',
      prompt: '¿Por qué los produce una cadencia de una visita por noche?',
      options: [
        'Las visitas se repiten una vez por día sidéreo, así que una frecuencia y la misma desplazada un ciclo por día se ven idénticas en cada visita',
        'La estrella pulsa en realidad en varios períodos a la vez',
        'El telescopio es demasiado pequeño para medir la estrella con exactitud',
        'Hay muy pocas visitas: con cien noches los alias desaparecerían',
      ],
      misconceptions: [
        {
          say: 'La estrella modelo tiene un solo período, 0,8 días. Los otros períodos están en el muestreo, no en la estrella.',
        },
        {
          say: 'El ruido no es el problema: una señal perfecta, sin ruido, tiene los mismos alias. Vienen de cuándo miras.',
        },
        {
          say: 'Más noches a la misma hora afilan todos los picos, alias incluidos. El peine sigue igual de alto.',
        },
      ],
      hints: [
        'Entre una visita y la siguiente la estrella completa un número entero de pulsos más una fracción. ¿Y si la fracción se repite?',
      ],
      because:
        'Entre dos visitas separadas un día la estrella avanza 1,25 pulsos, un cuarto más que un número entero. Una estrella que pulsara 0,25 veces al día avanzaría lo mismo, 0,25, así que en las visitas las dos se ven idénticas. Desplazar una frecuencia un ciclo por día, la tasa de visitas, no cambia nada de lo que las visitas pueden ver.',
    },
    {
      title: 'Deshaz el empate',
      body: 'Cambia la cadencia a <em>tres visitas por noche, irregulares</em>: las mismas cuarenta noches, pero cada noche tres visitas a horas distintas. Lee la fila del alias más fuerte: cuánto sube su pico, en por ciento del pico verdadero, y la preferencia en chi cuadrado que ahora dan los datos a la verdad.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    {
      title: 'Qué deshace el empate',
      body: 'Podrías cambiar el plan de varias maneras.',
      prompt: '¿Cuál deshace el empate entre el período y su alias?',
      options: [
        'Mirar en tiempos irregulares, para que las visitas no se repitan todas a un mismo ritmo',
        'Mirar más noches, siempre a la misma hora',
        'Exponer más tiempo en cada visita',
        'Usar un telescopio mayor',
      ],
      misconceptions: [
        {
          say: 'Más noches a la misma hora dejan cada visita en el mismo peine. Prueba sesenta noches en el panel con la cadencia «una visita por noche, a la misma hora»: el alias sigue igual de alto que la verdad.',
        },
        {
          say: 'Una exposición más larga baja el ruido de cada punto. Los alias están en los tiempos de los puntos, no en su ruido.',
        },
        {
          say: 'Un telescopio mayor también baja el ruido. Una señal sin ruido tiene los mismos alias.',
        },
      ],
      hints: [
        '¿Qué tienen en común las cadencias del panel cuando el veredicto es resuelto?',
      ],
      because:
        'Los alias vienen de los tiempos. Solo una cadencia cuyas visitas no caen todas en un mismo peine baja el alias por debajo de la verdad; el ruido, la exposición y la apertura no intervienen.',
    },
    {
      title: 'La búsqueda que sonaba segura',
      body: 'Vuelve a <em>una visita por noche, a la misma hora</em> y activa <strong>Buscar en una serie</strong>. El panel hace la serie que daría el plan (0,8 días, con ruido) y ejecuta en ella la búsqueda de períodos. Devuelve unos <strong>0,266 días</strong>.',
      prompt: '¿Qué te dice ese resultado?',
      options: [
        'La estrella pulsa cada 0,266 días',
        'Ganó un alias: el período verdadero es uno de los que lista el panel, y estas visitas no pueden decir cuál',
        'La búsqueda está rota: debería haber hallado 0,8 días',
        'El ruido hizo pulsar más rápido a la estrella',
      ],
      misconceptions: [
        {
          say: 'Una búsqueda siempre devuelve un pico más alto, y aquí cuarenta picos son casi iguales. Cuál gana lo decide el ruido. El panel llamó ambigua a la cadencia antes de hacer ninguna búsqueda.',
        },
        {
          say: 'La búsqueda halló bien el pico más alto. La cadencia hizo iguales los picos.',
        },
      ],
      hints: ['Lee primero la fila del veredicto.'],
      because:
        'El veredicto era ambiguo antes de la búsqueda. Con un peine perfecto el período verdadero y sus alias son iguales, así que una búsqueda devuelve el que favorezca el ruido. Un período de una búsqueda vale lo que la cadencia que lo produjo.',
    },
    {
      title: 'Primero la cadencia',
      body: 'Los alias eran previsibles antes de la primera noche. La función ventana de las épocas dice qué períodos no distingue el plan, y el veredicto del panel dice si el ruido te deja escoger el verdadero. Un período que publiques debe llevar la cadencia que lo produjo, para que un lector pueda calcular también los alias. Los pasos más profundos diseñan una cadencia que deshace el empate, la comprueban en una serie, y miden la ventana, la cobertura de fase y el coste de un plan.',
    },
  ],
};

export const WHY_THE_PERIOD_IS_WRONG_DEEPER_ES = {
  steps: [
    {
      title: 'Diseña una cadencia',
      body: 'Tres visitas por noche funcionaron, pero cuestan el triple de tiempo de telescopio. Prueba <em>una visita por noche, la hora varía</em>: una visita cada noche, pero su hora se mueve hasta 3,6 horas a un lado y a otro. Lee la fila del alias más fuerte.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    {
      title: '¿Qué cadencias lo resuelven?',
      body: 'Recorre las cinco cadencias con 0,8 días, cuarenta noches y una amplitud cinco veces el ruido. Cuenta las que tienen el veredicto <em>resuelto</em>.',
      fields: [{ label: 'Cadencias que resuelven el período' }],
    },
    {
      title: 'Compruébalo en una serie',
      body: 'Toma <em>tres visitas por noche, irregulares</em> y activa <strong>Buscar en una serie</strong>. Lee el período que halla la búsqueda y su incertidumbre, de la cota de Cramér-Rao para las épocas y el ruido.',
      fields: [{ label: 'Período hallado' }, { label: 'Su incertidumbre' }],
    },
    {
      title: '¿Es compatible con 0,8 días?',
      body: 'La búsqueda dice 0,8004 &plusmn; 0,0002 días. El período verdadero del modelo es exactamente 0,8.',
      prompt: '¿Es la medida compatible con la verdad?',
      options: [
        'Sí: está a 1,6 desviaciones estándar, dentro del intervalo del 95 por ciento de dos',
        'No: el intervalo no contiene 0,8',
        'No hay información suficiente: el período verdadero se desconoce, así que no se puede comparar nada',
        'Sí, pero solo porque la cadencia deshizo el alias; la incertidumbre no significa nada',
      ],
      misconceptions: [
        {
          say: 'Un intervalo de una sigma contiene la verdad solo unas dos veces de cada tres. Aquí la verdad está a 1,6 sigma, dentro de dos sigma.',
        },
        {
          say: 'En esta serie sintética la verdad se conoce (eso es lo que la hace una prueba del método). Con datos reales compararías dos medidas del mismo modo.',
        },
      ],
      hints: ['Divide la diferencia entre la incertidumbre.'],
      because:
        'La diferencia es 0,0004 días, 1,6 veces la incertidumbre. Un intervalo del 95 por ciento correcto contiene la verdad unas 95 veces de cada 100, y la validación del panel cuenta justo eso en 300 series (alrededor del 94 por ciento).',
    },
    {
      title: 'El ancho de un pico',
      body: 'Lee la base de las cuarenta noches en la fila <em>Épocas</em> (el intervalo desde la primera visita hasta la última, en días). Un pico de la ventana tiene unos <strong>uno sobre la base</strong> de ancho, en ciclos por día: lo finamente que el plan puede distinguir dos frecuencias.',
      fields: [
        { label: 'Base' },
        { label: 'Ancho del pico en ciclos por día, uno sobre la base' },
      ],
    },
    {
      title: 'Cuánto del ciclo ves',
      body: 'Pliega las visitas sobre el período: cada una cae en una fase entre 0 y 1 de un pulso. Con la cadencia <em>una visita por noche, a la misma hora</em>, lee la fila <em>Cobertura de fase</em> con un período verdadero de <strong>0,8 días</strong> y luego de <strong>1,0 días</strong>: cuántas de las veinte casillas de fase tienen un punto, y el arco vacío más largo.',
      fields: [
        { label: 'Casillas llenas con 0,8 d' },
        { label: 'Arco vacío más largo con 0,8 d, en ciclos' },
        { label: 'Casillas llenas con 1,0 d' },
        { label: 'Arco vacío más largo con 1,0 d, en ciclos' },
      ],
    },
    {
      title: 'Lo que cuesta un plan',
      body: 'El panel del plan pide a una instalación las noches en que un objetivo es útil: Cerro Tololo, un objetivo en declinación &minus;30, 14 noches, tres visitas por noche de 300 segundos más 60 de tiempo muerto. El tiempo es un sorteo con semilla (sorteo 3, 60 por ciento de noches despejadas, persistencia 0,5): pierde noches enteras. Lee la fila <em>Coste</em>: las horas pedidas y las ejecutadas.',
      fields: [
        { label: 'Horas pedidas' },
        { label: 'Horas ejecutadas' },
        { label: 'Horas perdidas por el tiempo' },
      ],
    },
    {
      title: '¿Distingue el plan el período?',
      body: 'Activa <strong>Buscar en la serie</strong> en el panel del plan y lee la fila <em>¿Distingue el plan el período?</em> con <em>tres visitas por noche</em>, y luego con <em>una visita por noche</em> (la visita va en el centro de la ventana cada noche, así que es otra vez el peine). Escribe la preferencia en chi cuadrado de cada una.',
      fields: [
        { label: 'Preferencia con tres visitas por noche' },
        { label: 'Preferencia con una visita por noche' },
      ],
    },
    {
      title: 'Cuando el veredicto no se aplica',
      body: 'El veredicto compara una sinusoide en el período verdadero con una sinusoide en cada alias, en ruido blanco. Un objetivo real puede ser una binaria eclipsante con caídas bruscas, o una estrella con manchas que cambian.',
      prompt: '¿Qué le hace eso al veredicto?',
      options: [
        'Es solo el veredicto de una sinusoide: una señal brusca tiene armónicos con alias propios, y el ruido rojo puede fingir un pico, así que «resuelto» no es una garantía',
        'Nada: el veredicto es exacto para cualquier curva de luz',
        'Hace «ambigua» a toda cadencia',
        'Significa que hay que recalcular la ventana a partir de la curva de luz',
      ],
      misconceptions: [
        {
          say: 'El criterio supone una sinusoide y ruido blanco. Dice lo bien que la cadencia separa sinusoides; una curva de luz real puede salir peor.',
        },
        {
          say: 'La ventana es una propiedad solo de los tiempos, sea lo que sea lo que se observe. Por eso se puede calcular antes de la primera noche.',
        },
      ],
      hints: ['¿Qué supone el veredicto sobre la señal?'],
      because:
        'La ventana es exacta para los tiempos; el veredicto añade una suposición sobre la señal (una sinusoide en ruido blanco). Di lo que supusiste junto al período que publiques.',
    },
  ],
};

export const DESIGN_THE_SCHEDULE_DEEPER_ES = {
  steps: [
    {
      title: 'El peine que impone el sitio',
      body: 'La ventana que leíste para tus ocho noches tiene dientes porque el sitio impone un peine: una visita por noche se repite una vez por día sidéreo. Usa el panel de estrategia para el planeta de esta investigación (un período de 3,5 días, el ajuste más cercano) con <em>una visita por noche, a la misma hora</em> durante 24 noches. Lee el veredicto y el período del alias cerca de 1,4 días.',
      fields: [
        { label: 'Período del alias cerca de 1,4 días' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    {
      title: 'Lo que compran los tiempos irregulares, en números',
      body: 'Cambia la cadencia a <em>tres visitas por noche, irregulares</em> durante las mismas 24 noches con 3,5 días. Lee la fila del alias más fuerte: cuánto sube y la preferencia que dan los datos al período verdadero.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    {
      title: 'Lo que supone el veredicto',
      body: 'El panel de estrategia llama resuelta a una cadencia cuando el alias más cercano queda descartado por una preferencia en chi cuadrado de nueve o más para una sinusoide en ruido blanco.',
      prompt: '¿Qué debe acompañar a un período hallado en un horario así?',
      options: [
        'Las épocas, la amplitud sobre el ruido y los alias que predice la cadencia, para que un lector vea qué períodos se descartaron y con qué suposición',
        'Solo el período y su incertidumbre',
        'El telescopio que se usó',
        'Nada: un veredicto resuelto hace seguro el período',
      ],
      misconceptions: [
        {
          say: 'Un período sin su cadencia no se puede comprobar: el lector no sabe si un alias era posible.',
        },
        {
          say: 'Resuelto dice que la cadencia separa sinusoides en ruido blanco; no prueba que la estrella sea una sinusoide.',
        },
      ],
      hints: ['¿Qué necesitaría otro astrónomo para recalcular los alias?'],
      because:
        'Los alias se calculan de las épocas; que importen o no depende de la amplitud, el ruido y la forma de la señal. Las tres cosas van con el número.',
    },
  ],
};

const CONTENT = {
  'why-the-period-is-wrong': {
    topic:
      'What a cadence does to a period search: one visit a night at the same time (forty nights, a true period of 0.8 days) cannot tell 0.8 days from 4.04, 0.444 or 0.307 days, a chi-square preference of 0 for the truth; three visits a night at irregular times give about 490; the verdict, the window function, the phase coverage and the cost of a plan in hours.',
    difficulty:
      'Introductory (a picture and a rule of thumb); majors (design and verify a cadence); advanced (the window, the phase coverage, the cost of a plan and the limits of the verdict)',
    placement:
      'In a survey course with the unit on variable stars or exoplanet detection, before any period search of real data; in a majors course after the investigations on the period search and the radial-velocity schedule. It supports OpenStax Astronomy 2e chapter 6 (astronomical instruments). It needs no mathematics beyond a frequency as one over a period.',
    overview:
      'Students predict what period a search returns for a star observed once a night at the same time, read the aliases (4.04 days and others) and a chi-square preference of 0, change to three visits a night and read about 67 percent and 490, say what breaks the tie, and see a search return 0.266 days from a series whose true period is 0.8. The deeper steps design a cadence (77 percent and 116), count the cadences that resolve (three of five), verify on a series (0.8004 ± 0.0002 days), then read the width of a peak, the phase coverage (13 and 4 of 20 bins), the cost of a 14-night plan (4.2 hours asked, 2.4 executed in draw 3) and the limits of the verdict.',
    priorKnowledge: [
      'A period as the time for one cycle, and a frequency as one over it',
      'That a light curve is measured at a list of times',
      'What a periodogram is for (the period search), not how it is computed',
    ],
    keyConcepts: [
      {
        heading:
          'An alias is a frequency the cadence cannot tell from the truth',
        body: 'One visit a night from one site recurs at the sidereal day, 1.0027 cycles a day. A signal at 1.25 cycles a day and one at 0.2473 or 2.2527 give the same points, so the search has several equal peaks.',
      },
      {
        heading: 'Only the times break the tie',
        body: 'Irregular times (three visits a night, or a varying clock time) lower the aliases; more nights at the same time, a longer exposure and a bigger telescope do not. The panel measures it: a chi-square preference of 0, 116, 490 or 695.',
      },
      {
        heading: 'A verdict is a sinusoid’s',
        body: 'The panel says resolved when the nearest alias is rejected by a chi-square preference of nine or more for a sinusoid in white noise. A sharp light curve or red noise may do worse, and the investigation says so.',
      },
    ],
    features: [
      {
        name: 'The strategy panels (strategy-window and strategy-plan)',
        text: 'The window function of five cadences through the plot component, the aliases it predicts, the verdict, the phase coverage, and the synthetic series the plan would produce with the period the search finds; and a plan from the observing-window planner with its weather and its cost in hours.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: design a cadence, count the cadences that resolve, verify on a series. Advanced: the window width, the phase coverage, the cost of a plan, the plan and the verdict, and when the verdict does not apply. Design the Schedule gains three advanced steps.',
      },
      {
        name: 'Synthetic series, stated',
        text: 'Every series is made by the periodic forward model with a seeded noise draw; the truth is the period set in the panel. The weather is a seeded draw that loses whole nights, never a forecast.',
      },
    ],
    misconceptions: [
      {
        claim: 'More nights make the period certain.',
        response:
          'More nights at the same time of day sharpen every peak, aliases included. Only different times break the tie.',
      },
      {
        claim: 'A bigger telescope or a longer exposure removes aliases.',
        response:
          'They lower the noise of each point. The aliases are in the times of the points, so a noise-free signal has them too.',
      },
      {
        claim: 'The tallest peak of a period search is the period.',
        response:
          'It is the tallest peak. With a cadence that makes several peaks equal, noise picks one; the verdict says so before any search is run.',
      },
      {
        claim: 'A period without its schedule is as good as one with it.',
        response:
          'The aliases are computed from the epochs, so a reader needs them to know which periods were ruled out.',
      },
    ],
    teachingNotes: [
      'The panel’s curve is the Lomb-Scargle power of a noise-free unit sinusoid at the true frequency sampled at the epochs; it is the window function seen through the period search, close to the classical window for long baselines. The kernel is validated against Astropy’s LombScargle and a direct numpy sum (OBSERVING_STRATEGY.md).',
      'One visit a night recurs at the sidereal day (1.0027 cycles per solar day), not the solar day: the plan panel places the visit at the middle of the target’s window, which drifts exactly one sidereal day a night, so it is an exact comb.',
      'The series are synthetic: the period is set in the panel and the search is the Gravitas period search with its Cramer-Rao uncertainty. With the exact comb the search returns whichever alias noise favours (0.266 days with this seed).',
      'Inherited limits: a sinusoid in white noise, whole nights lost, no slew time, the Moon only through the planner’s 30-degree separation limit, no seeing model.',
    ],
    discussion: [
      'Why does a cadence that avoids the Moon (a monthly comb) add aliases of its own?',
      'If you could only add three more nights, would you add them at the same clock time or at others, and why?',
      'What would the verdict say for an eclipsing binary, and why not trust it?',
    ],
    extensions: [
      'Set the true period to 1.0 day and read the phase coverage: what does a period close to the visit spacing look like when folded?',
      'Use the plan panel for the declination +45 target from McDonald and say how many nights have no window.',
    ],
    modelNotes:
      'js/kernels/strategy/ (window.js, aliases.js, coverage.js, weather.js, plan.js), js/instruments/strategy.js over the observing-window planner, js/strategyField.js, OBSERVING_STRATEGY.md.',
  },
};

const FLOW = {
  'why-the-period-is-wrong': [
    {
      from: 'a-star-seen-once-a-night',
      to: 'predict-the-period',
      text: 'Forty nights at one clock time, a period of 0.8 days, and the prediction of what the search will find before it is run.',
    },
    {
      from: 'the-aliases',
      to: 'why-the-comb',
      text: 'The alias list and a preference of 0 for the truth, then why one visit a night makes a comb of equal peaks.',
    },
    {
      from: 'break-the-tie',
      to: 'what-breaks-it',
      text: 'Three visits a night break the tie; what does and does not help.',
    },
    {
      from: 'the-wrong-answer',
      to: 'the-cadence-comes-first',
      text: 'A search that returns 0.266 days, and the cadence that carries the period.',
    },
  ],
};

const EXPECTATIONS = {
  'why-the-period-is-wrong': {
    'the-aliases':
      'The alias near 4 days at 4.04 (within 0.02) and a chi-square preference of 0 for the truth (within 0.5) for one visit a night at the same time over forty nights.',
    'break-the-tie':
      'The strongest alias at about 67 percent (within 3) and a preference of about 491 (within 30) for three visits a night, irregular.',
  },
};

const BANDS = {
  'why-the-period-is-wrong': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'long',
  },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'why-the-period-is-wrong': WHY_THE_PERIOD_IS_WRONG_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'why-the-period-is-wrong': WHY_THE_PERIOD_IS_WRONG_DEEPER,
  'design-the-schedule': DESIGN_THE_SCHEDULE_DEEPER,
};
export const DEPTH_ES = {
  'why-the-period-is-wrong': WHY_THE_PERIOD_IS_WRONG_DEEPER_ES,
  'design-the-schedule': DESIGN_THE_SCHEDULE_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WHY_THE_PERIOD_IS_WRONG];
