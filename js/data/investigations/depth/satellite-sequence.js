// =============================================================================
// The Jupiter investigation, deeper (Prompt 193)
// -----------------------------------------------------------------------------
// The deeper steps of "Weighing Jupiter From Its Moons" and its instructor
// content, in a module of its own (D-R10-74; see ../satellite-sequence.js). The
// same instruments, the same seeds. Every expected value is recomputed
// (tests/galileanMoons.test.js).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

// -----------------------------------------------------------------------------
// Weighing Jupiter From Its Moons (Prompt 193): the deeper steps.
// -----------------------------------------------------------------------------
const JP = (values = {}, hide = []) => ({ id: 'moon-fit', values, hide });
const JW = (values = {}, hide = []) => ({ id: 'jupiter-weigh', values, hide });

export const WEIGHING_JUPITER_DEEPER = {
  id: 'weighing-jupiter',
  steps: [
    {
      sid: 'ganymede-period-and-radius',
      after: 'try-once-a-night',
      depth: 'quantitative',
      type: 'measure',
      title: 'Ganymede’s period and radius',
      body: `Now the same fit for Ganymede, with the designed sampling. Choose Ganymede
             (3) and read its <strong>period</strong> and its <strong>orbit radius</strong>, the
             amplitude, in Jupiter radii. One Jupiter radius is 71,492 km.`,
      fields: [
        { id: 'period', label: 'Ganymede’s period', unit: 'd', hint: '7.14' },
        {
          id: 'radius',
          label: 'Ganymede’s orbit radius',
          unit: 'RJup',
          hint: '15.0',
        },
      ],
      validate: v => {
        if (![v.period, v.radius].every(Number.isFinite)) return null;
        if (near(v.period, 7.141, 0.03) && near(v.radius, 14.97, 0.1)) {
          return {
            level: 'ok',
            message:
              '7.141 days and 14.97 Jupiter radii, 1.070 million km. Kepler’s third law turns these two numbers into a mass.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Ganymede (3) with the designed sampling (1), then read “Period” and “Amplitude”.',
        };
      },
      tool: JP({ moon: 3, cadence: 1 }),
    },
    {
      sid: 'keplers-third-law',
      after: 'ganymede-period-and-radius',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Kepler’s third law on a moon',
      body: `For a small moon around a heavy planet, GM = 4π²a&sup3;/P&sup2;, with
             a the orbit radius in kilometers and P the period in seconds. G is the
             gravitational constant and M Jupiter&rsquo;s mass. Use the radius and period
             you just read: a = 14.97 &times; 71,492 km and P = 7.141 days.`,
      prompt: 'What is Jupiter’s GM from Ganymede, in millions of km³/s²?',
      unit: '',
      answer: 127.2,
      tolerance: 1.0,
      hints: [
        'a is about 1.07 million km; P is 7.141 × 86,400 s. Compute a³ / P² and multiply by 4π².',
      ],
      worked:
        'a = 14.97 × 71,492 = 1.0702 million km, P = 7.141 × 86,400 = 617,000 s. GM = 4π² × (1.0702 × 10⁶)³ / 617,000² = 1.272 × 10⁸ km³/s², 127.2 million. The instrument’s Jupiter-weigh row says the same with its uncertainty.',
      feedback: {
        close: 'Close. Check the unit of a (kilometers) and of P (seconds).',
        'wrong-order-of-magnitude':
          'A power of ten out: a is in kilometers, about a million, P in seconds.',
        off: '4π² a³ / P² with a in km and P in s.',
      },
      tool: JW({ moon: 3, correct: 0 }),
    },
    {
      sid: 'jupiters-mass',
      after: 'keplers-third-law',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      placeholder: 'e.g. 1.5 ± 0.05',
      title: 'Jupiter’s mass, with its uncertainty',
      body: `Divide GM by the gravitational constant, G = 6.674 &times; 10&minus;&sup1;&sup1;
             m&sup3;/(kg s&sup2;), and Ganymede gives Jupiter&rsquo;s mass. The instrument
             states the uncertainty from the fit&rsquo;s own, carried through the law: three
             times the radius&rsquo;s relative uncertainty and twice the period&rsquo;s.`,
      prompt:
        'Report Jupiter’s mass from Ganymede as value ± uncertainty, in units of 10²⁷ kg.',
      unit: '',
      answer: 1.905,
      tolerance: 0.02,
      maxUncertainty: 0.04,
      hints: ['GM is 1.272 × 10¹⁷ m³/s²; divide by 6.674 × 10⁻¹¹.'],
      worked:
        '1.2717 × 10¹⁷ / 6.674 × 10⁻¹¹ = 1.905 × 10²⁷ kg, with the instrument’s uncertainty of about 0.003 × 10²⁷ kg.',
      feedback: {
        close: 'Close. Give a value, then ±, then an uncertainty.',
        'wrong-order-of-magnitude':
          'A power of ten out: Jupiter is about two thousand million million million million kilograms.',
        off: 'GM / G, with GM in m³/s² (1 km³ = 10⁹ m³).',
      },
      tool: JW({ moon: 3, correct: 0 }),
    },
    {
      sid: 'against-the-ephemeris',
      after: 'jupiters-mass',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Against JPL’s value',
      body: `JPL&rsquo;s tables give the planet&rsquo;s GM as 126.69 million km&sup3;/s&sup2;.
             Ganymede&rsquo;s is 127.17 &plusmn; 0.17: 0.48 above, almost three of its own
             uncertainties.`,
      prompt: 'What does that disagreement tell you?',
      options: [
        'Ganymede is the wrong moon to use',
        'Kepler’s third law fails for moons',
        'The stated uncertainty leaves something out, and the next depth finds what',
        'JPL’s value is out of date',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'law-fails',
          option: 1,
          say: 'The law holds to better than a tenth of a percent here. What is off is smaller than that, and it is in what was measured, not in the law.',
        },
      ],
      hints: [
        'Three standard errors is rarely luck. What does the period measurement assume about the observer?',
      ],
      because:
        'The uncertainty carries the scatter of the points and nothing else. The period the Earth sees is not quite the moon’s orbital period, because the Earth and Jupiter move while the moon goes round; that shifts Ganymede’s GM by about 0.3 percent, more than its stated 0.13. The advanced steps correct for it.',
      tool: JW({ moon: 3, correct: 0 }),
    },
    {
      sid: 'the-sky-frame-turns',
      after: 'against-the-ephemeris',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The Earth moves too',
      body: `Over these nights the line from the Earth to Jupiter turns, which turns the
             frame the distances are read in by 0.083 degrees a day (the instrument shows
             it when the correction is on). A moon goes round in its orbit by
             360&deg;/P a day, Callisto by 21.6&deg; a day. The period the Earth sees
             differs from the orbital one by the ratio of the two.`,
      prompt:
        'By what percent does Callisto’s period as the Earth sees it differ from its orbital period?',
      unit: '%',
      answer: 0.38,
      tolerance: 0.05,
      hints: ['0.083 divided by 21.6, as a percent.'],
      worked:
        '0.083 / 21.57 = 0.0038, 0.38 percent. For Io, which turns 203° a day, it is 0.04 percent: the correction matters most for the slowest moons.',
      feedback: {
        close:
          'Close. Divide the frame’s turning by the moon’s own, then use percent.',
        'wrong-order-of-magnitude':
          'A power of ten out: 0.083 is small beside 21.6, and the ratio is a few thousandths.',
        off: '0.083 / 21.57 × 100.',
      },
      tool: JW({ moon: 4, correct: 1 }),
    },
    {
      sid: 'weigh-again-corrected',
      after: 'the-sky-frame-turns',
      depth: 'advanced',
      type: 'measure',
      title: 'Four moons, corrected',
      body: `Choose <strong>all four</strong> (0) and set the correction to <strong>1</strong>.
             The instrument converts each apparent period to the orbital one with the
             frame&rsquo;s turning, weighs Jupiter with each moon and combines the four,
             with a chi-square test of how well they agree. Without the correction the
             four disagree badly (chi-square 21 for 3 degrees of freedom); read the
             corrected weighted mean and the chi-square.`,
      fields: [
        {
          id: 'gm',
          label: 'Weighted mean GM, corrected (millions of km³/s²)',
          unit: '',
          hint: '126.9',
        },
        {
          id: 'chi2',
          label: 'Chi-square of the four, corrected',
          unit: '',
          hint: '6.1',
        },
      ],
      validate: v => {
        if (![v.gm, v.chi2].every(Number.isFinite)) return null;
        if (near(v.gm, 126.85, 0.35) && near(v.chi2, 6.12, 0.8)) {
          return {
            level: 'ok',
            message:
              'The four now agree (chi-square 6.1 for 3 degrees of freedom, p = 0.11), and the mean, 126.85 ± 0.13 million, is 0.13 percent above JPL’s planet value: 1.3 of its own uncertainties. Jupiter’s bulge raises each moon’s apparent GM by 0.06 percent for Io and far less for Callisto, and the moons’ own masses add a little: not removed, and within what is left.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose all four (0), turn the correction on (1), then read “Weighted mean of the four” and the chi-square in “Do the four agree?”.',
        };
      },
      tool: JW({ moon: 0, correct: 1 }),
    },
    {
      sid: 'projection-and-light-time',
      after: 'weigh-again-corrected',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Seen nearly edge on',
      body: `From the Earth the line of sight lies 1.37&deg; above Jupiter&rsquo;s equatorial
             plane, which is where the moons&rsquo; orbits are. A moon&rsquo;s greatest north or
             south offset from Jupiter is then its orbit radius times the sine of that
             angle. The east-west offsets, which you fitted, are the full radius. (Light
             from Jupiter also takes 36 to 38 minutes to reach the Earth here, which the
             frames and the ephemeris both take into account.)`,
      prompt:
        'What is Callisto’s greatest north-south offset from Jupiter, in Jupiter radii?',
      unit: 'RJup',
      answer: 0.63,
      tolerance: 0.1,
      hints: [
        'Its radius is 26.4 Jupiter radii; multiply by the sine of 1.37°.',
      ],
      worked:
        '26.4 × sin 1.37° = 26.4 × 0.0239 = 0.63 Jupiter radii: about 15 arcseconds, against east-west offsets of 600.',
      feedback: {
        close: 'Close. Radius times sin 1.37°, about 0.024.',
        'wrong-order-of-magnitude':
          'A power of ten out: the offset is a small fraction of the radius.',
        off: '26.4 × sin 1.37°.',
      },
      tool: JP({ moon: 4, cadence: 1 }),
    },
    {
      sid: 'the-alias-exercise',
      after: 'projection-and-light-time',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The alias, by hand',
      body: `A moon at f turns a day, sampled once a day, looks like one at 1 &minus; f
             turns a day whenever f is above one half. Io turns 1/1.769 = 0.565 a day.`,
      prompt:
        'What period, in days, would a once-a-night observer find for Io?',
      unit: 'd',
      answer: 2.3,
      tolerance: 0.02,
      hints: ['1 − 0.565 = 0.435 turns a day; the period is its inverse.'],
      worked:
        '1/(1 − 1/1.769) = 1/0.4347 = 2.30 days: the same number the instrument found from the frames. Europa, at 0.282 turns a day, is already below one half and is not aliased.',
      feedback: {
        close: 'Close. The alias frequency is 1 minus Io’s, then invert.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is a little over two days.',
        off: '1 / (1 − 1/1.769).',
      },
      tool: JP({ moon: 1, cadence: 0 }),
    },
    {
      sid: 'galileos-nights',
      after: 'the-alias-exercise',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that Galileo’s nightly drawings of January 1610 could establish identification, that there were several points that stayed near Jupiter and changed sides, and so that they were moons, and for saying that a nightly cadence could not give Io’s period of 1.77 days (it would give an alias, about 2.3 days), which needs frames within a night. Do not credit saying the nightly drawings gave the periods of all four moons without a caution, or that nothing could be learned from them.',
      title: 'Galileo’s nights',
      body: `In January 1610 Galileo drew Jupiter and its &ldquo;stars&rdquo; night after night,
             roughly once a night, and by the 13th had counted four that stayed with the
             planet and changed sides. A year or more of such nights gave the periods of the
             outer moons.`,
      prompt:
        'In two or three sentences: what could once-a-night drawings establish about the moons, and what could they not?',
      tool: JP({ moon: 1, cadence: 0 }),
    },
  ],
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: {
    'weighing-jupiter': {
      topic:
        'Four moons identified night by night, a cadence that can measure them, a sinusoid for each, and Kepler’s third law with the Earth’s motion corrected: Jupiter’s mass with its uncertainty against the ephemeris',
      difficulty: 'Intermediate to advanced (synthetic frames, real positions)',
      placement:
        'After A Binary Star’s Orbit, whose mass sum by Kepler’s third law this reuses on a planet. It needs a period, a radius, and cubes and squares. It supports OpenStax Astronomy 2e chapter 12 (section 12.2, the Galilean moons) and chapter 3 on Kepler’s laws, and it closes the observing-and-measuring sequence’s first planetary example.',
      overview:
        'Students look at 51 synthetic frames of Jupiter and its four moons made from the moons’ real positions (JPL Horizons, JUP365) for 20 November to 30 December 2025: three long nights of hourly frames and one frame a night on the others. They identify the moons with the ephemeris overlay (Callisto is farthest in frame 13, 26.3 Jupiter radii east), read how far Ganymede moves in two hours (0.89 radii), and fit Io: 1.768 days at 5.89 radii. They predict and then see that once-a-night frames give Io a clean but wrong period of 2.30 days, an alias, and that the hourly nights tell it from the moon. The quantitative depth fits Ganymede (7.141 days, 14.97 radii), applies Kepler’s third law (GM 127.2 million km³/s², mass 1.905 × 10²⁷ kg with an uncertainty of 0.003) and finds it 2.9 of its own uncertainties above JPL’s 126.69. The advanced depth finds why: the Earth and Jupiter move, so the period seen is 0.38 percent off for Callisto; with the correction the four moons agree (chi-square 6.1, p = 0.11, mean 126.85 ± 0.13), then computes the north-south offset seen at 1.37 degrees (0.63 radii), derives Io’s alias by hand (2.30 days) and reads Galileo’s nights.',
      priorKnowledge: [
        'Kepler’s third law and the mass of a planet from a moon',
        'A period and an amplitude of a sinusoid',
        'The idea of an uncertainty and a chi-square from the earlier investigations',
      ],
      keyConcepts: [
        {
          heading: 'Cadence is part of the measurement',
          body: 'One frame a day cannot tell a moon going round 0.565 times a day from one going round 0.435 times: the alias period is 2.30 days. Hourly frames over three nights see Io move and settle it.',
        },
        {
          heading: 'Kepler’s third law weighs a planet',
          body: 'GM = 4π²a³/P² from a moon’s radius and period, with the uncertainty carried through the cube and the square.',
        },
        {
          heading: 'What the uncertainty leaves out',
          body: 'The period the Earth sees differs from the orbital one by 0.04 percent for Io and 0.38 percent for Callisto. Left uncorrected, the four moons disagree (chi-square 21 for 3); corrected, they agree.',
        },
      ],
      features: [
        {
          name: 'Moon-frames, moon-fit and jupiter-weigh instruments (jovian family)',
          text: 'The synthetic frame with an ephemeris overlay and each moon’s measured distance; one moon’s distances against time with the best sinusoid, its alias list and the Nyquist note; Kepler’s third law with the GM, mass, reference and a consistency test of the four.',
        },
        {
          name: 'Synthetic frames, real positions',
          text: 'The positions are JPL Horizons (JUP365) through a Chebyshev data file (sky/galilean-moons.json, lazily fetched, never precached); the frames are rendered by the CCD forward model with seeing and noise and are labeled synthetic. The investigation links NASA’s Jupiter moons page for a real picture.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: Ganymede, the third law, the mass with its uncertainty, and the disagreement with JPL. Advanced: the turning of the sky frame, the corrected four-moon weighing, the north-south offset, the alias by hand and Galileo’s nights.',
        },
      ],
      misconceptions: [
        {
          claim: 'A clean fit means the period is right.',
          response:
            'Io from once-a-night frames fits a 2.30-day sinusoid cleanly, and 2.30 days is not Io’s period. Only the cadence tells.',
        },
        {
          claim:
            'The moons’ period as seen from the Earth is their orbital period.',
          response:
            'The Earth and Jupiter move. The apparent period is off by the frame’s turning over the moon’s own, 0.38 percent for Callisto.',
        },
        {
          claim: 'A small stated uncertainty means a small error.',
          response:
            'Ganymede’s GM is 2.9 stated uncertainties from JPL’s before the correction: the uncertainty counted the scatter and not the Earth’s motion.',
        },
        {
          claim: 'The brightest moon stands farthest out.',
          response:
            'Ganymede is brightest, Callisto stands farthest: the overlay says who is who.',
        },
      ],
      teachingNotes: [
        'The frames are synthetic on purpose: the moons are at their real positions on those nights, and the truth is known. The investigation says so in the first step and links a real picture.',
        'Marks are the centroids of the moons near where the overlay predicts them; a moon on the disk or blended with another is not measured, so a fit has fewer than 51 points. Each point carries an assumed 0.03 Jupiter radii of seeing.',
        'Planet GM here is the planet alone, 126,686,534 km³/s² (the value js/mission/bodies.js states); Jupiter’s oblateness and a moon’s own mass are not removed and are named.',
        'Inherited limits: nothing here claims astrometry on authentic frames or a moving object; the sinusoid is not the whole of the moon’s motion and the stated uncertainty includes that misfit.',
      ],
      discussion: [
        'Why does Io need hourly frames and Callisto does not?',
        'Which of the three depths would you drop for an introductory class, and why?',
        'What other measurement would give Jupiter’s mass independently?',
      ],
      extensions: [
        'Open the Observatory and fit a sinusoid to one moon’s table with its fitting panel.',
        'Continue with the resonance investigation, where the moons’ periods meet 1 : 2 : 4.',
      ],
      modelNotes:
        'js/jovianWidgets.js (sequenceOf, fitMoon, weighAll): the data file made by the galilean-2025-11 manifest read by js/satellites/galilean.js, the plan and alias analysis of cadence.js, the frames of sequence.js through js/forward/models/ccd.js, the fit and Kepler law of weigh.js. See SATELLITE_EPHEMERIS.md for the validation contract and the failing legs.',
    },
  },
  flow: {
    'weighing-jupiter': [
      {
        from: 'a-sequence-of-frames',
        to: 'which-moon-is-farthest',
        text: 'The synthetic frames and the ephemeris overlay as the check on who is who.',
      },
      {
        from: 'how-fast-does-ganymede-move',
        to: 'io-period-and-radius',
        text: 'A moon’s motion within a night, and Io’s period and radius from a sinusoid.',
      },
      {
        from: 'once-a-night',
        to: 'try-once-a-night',
        text: 'One frame a night gives Io a clean, wrong period of 2.30 days.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the cadence showed.',
      },
    ],
  },
  expectations: {
    'weighing-jupiter': {
      'how-fast-does-ganymede-move':
        'Ganymede is 9.66 Jupiter radii from Jupiter in frame 14 (within 0.25) and moves 0.89 radii by frame 16 (within 0.2).',
      'io-period-and-radius':
        'Io’s period 1.768 days (within 0.01) and orbit radius 5.89 Jupiter radii (within 0.1).',
      'try-once-a-night':
        'Io’s period from once-a-night frames, 2.30 days (within 0.03): an alias, not Io’s period.',
    },
  },
  bands: {
    'weighing-jupiter': {
      core: 'medium',
      quantitative: 'long',
      advanced: 'long',
    },
  },
};

/** The deeper steps by lesson id: what depthAll.js registers. */
export default {
  [WEIGHING_JUPITER_DEEPER.id]: WEIGHING_JUPITER_DEEPER.steps,
};
