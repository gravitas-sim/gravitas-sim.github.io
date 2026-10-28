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

// -----------------------------------------------------------------------------
// The ring and tide investigations (Prompt 204 part 2): the deeper steps.
// -----------------------------------------------------------------------------
const RO = (values = {}, hide = []) => ({ id: 'tides-roche', values, hide });
const RS = (values = {}, hide = []) => ({
  id: 'tides-resonance',
  values,
  hide,
});
const TM = (values = {}, hide = []) => ({ id: 'tides-moon', values, hide });
const TH = (values = {}, hide = []) => ({ id: 'tides-heating', values, hide });

export const WHY_RINGS_DEEPER = {
  id: 'why-rings',
  steps: [
    {
      sid: 'saturn-ice-limit',
      after: 'phobos-where',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Ice about Saturn',
      body: `The limit comes from the two densities: d = 2.44 R (ρ<sub>planet</sub> /
             ρ<sub>satellite</sub>)<sup>1/3</sup> for a body that can deform. Saturn has a
             radius of 60,268 km and a mean density of 687 kg/m&sup3;, and ice is about 900
             kg/m&sup3;.`,
      prompt:
        'What is the fluid Roche limit of ice about Saturn, in thousand km?',
      unit: '',
      answer: 134.4,
      tolerance: 0.6,
      hints: [
        '(687 / 900) to the one third is 0.914; multiply by 2.44 and by 60,268 km.',
      ],
      worked:
        '2.44 × 60,268 × (687/900)^(1/3) = 2.44 × 60,268 × 0.9139 = 134,400 km: 134.4 thousand km. The B ring’s outer edge is at 117,580 km, inside it.',
      feedback: {
        close:
          'Close. The satellite’s density is in the denominator, inside the cube root.',
        'wrong-order-of-magnitude':
          'A power of ten out: the radii in the step are in kilometers and this answer is in thousand km.',
        off: '2.44 R (ρ planet / ρ satellite)^(1/3).',
      },
      tool: RO({ system: 3, own: 1 }),
    },
    {
      sid: 'mimas-3-to-1',
      after: 'where-the-gap-falls',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Mimas’s other resonances',
      body: `The p:q resonance lies at a<sub>m</sub> (q/p)<sup>2/3</sup>, with a<sub>m</sub> =
             185,540 km for Mimas. The 3:1 resonance, where a particle goes round three times
             for every orbit of Mimas, lies much deeper in.`,
      prompt:
        'Where is the 3:1 resonance of Mimas, in thousand km from Saturn’s center?',
      unit: '',
      answer: 89.2,
      tolerance: 0.4,
      hints: ['(1/3) to the two thirds is 0.4807.'],
      worked:
        '185,540 × (1/3)^(2/3) = 185,540 × 0.4807 = 89,200 km: 89.2 thousand km.',
      feedback: {
        close: 'Close. The exponent is 2/3, and the ratio is q/p = 1/3.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a little under a hundred thousand km.',
        off: 'a (q/p)^(2/3) with q = 1 and p = 3.',
      },
      tool: RS({ moon: 0, p: 3, q: 1 }),
    },
    {
      sid: 'why-two-limits',
      after: 'a-ring-with-a-resonance',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that a rigid body has strength against being pulled apart and a fluid one has none, so a fluid body breaks farther out; that the real limit for a real body lies between the two; and that the limit depends on the densities and not on the satellite’s size. Partial credit for one of the three.',
      title: 'Two limits for one pair',
      body: `For Phobos and Mars the rigid limit is 5,466 km and the fluid limit 10,585 km:
             almost a factor of two apart (2.44 against 1.26). Phobos orbits at 9,376 km.`,
      prompt:
        'In two or three sentences: why are there two limits, and where does a real moon’s lie?',
      tool: RO({ system: 0, own: 1 }),
    },
  ],
};

export const TIDES_DEEPER = {
  id: 'tides-that-move-the-moon',
  steps: [
    {
      sid: 'moon-locking-time',
      after: 'the-model-run-backward',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How long to lock the Moon',
      body: `The same torque that moves the Moon slows the Moon’s own spin: the Earth’s tide
             on the Moon. The time to remove a spin ω is t = Iω/N, with I =
             α m R&sup2; the Moon&rsquo;s moment of inertia (α = 0.393) and N =
             (3/2)(k2/Q) G M&sup2; R&sup5; / a&sup6; the torque. For the Moon (k2 = 0.024, Q =
             100, radius 1,737.4 km) at 384,400 km, from a spin of one turn in ten hours, the
             kernel gives the time below.`,
      prompt: 'What is the time to lock the Moon, in units of 10⁸ years?',
      unit: '',
      answer: 1.15,
      tolerance: 0.1,
      hints: [
        'The torque falls as a⁻⁶: at the Moon’s distance it is small, but the Moon’s spin is small too.',
      ],
      worked:
        'N = 1.5 × (0.024/100) × G M² R⁵/a⁶ = 4.2 × 10¹⁵ N m and I ω = 0.393 × 7.342 × 10²² × (1.7374 × 10⁶)² × 1.745 × 10⁻⁴ = 1.52 × 10³¹, so t = 3.6 × 10¹⁵ s = 1.15 × 10⁸ years: far below the age of the Moon, consistent with the Moon being locked.',
      feedback: {
        close: 'Close. Divide the spin angular momentum by the torque.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a hundred million years, not a billion or a million.',
        off: 't = I ω / N.',
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: 0 }),
    },
    {
      sid: 'a-q-that-changes',
      after: 'moon-locking-time',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the model’s Q is one number and the Earth’s real tidal dissipation depends on the oceans (their depth, the shape of the basins, which have changed with continental drift) and so on time; that run backward with the present Q the Moon is in contact 1.58 billion years ago, which the Moon’s age contradicts; and that this means the recession rate in the past was lower, not that the model’s present rate is wrong. Partial credit for two.',
      title: 'A Q that changes',
      body: `Run backward with Q = 12, the model puts the Moon in contact with the Earth 1.58
             billion years ago. The Moon is about 4.5 billion years old.`,
      prompt:
        'In two or three sentences: what does that say about Q, and about the Moon’s past rate of recession?',
      tool: TM({ k2: 0.3, Q: 12, gyr: -2 }),
    },
  ],
};

export const IOS_DEEPER = {
  id: 'ios-fire',
  steps: [
    {
      sid: 'how-far-from-the-maximum',
      after: 'the-bound',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How far from the largest k2/Q',
      body: `The model allows k2/Q up to 0.3 (k2 = 1.5 over Q = 5). The k2/Q that the middle of
             the observed heat needs is the number you read.`,
      prompt:
        'How many times smaller is the needed k2/Q than the model’s largest?',
      unit: '',
      answer: 17,
      tolerance: 0.5,
      hints: ['Divide 0.3 by the k2/Q you read.'],
      worked:
        '0.3 / 0.01768 = 17.0: the observed heat needs a k2/Q seventeen times below the largest the model allows, comfortably inside the range.',
      feedback: {
        close: 'Close. The larger number goes on top.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is about seventeen.',
        off: '0.3 divided by the needed k2/Q.',
      },
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
    {
      sid: 'what-the-formula-leaves-out',
      after: 'how-far-from-the-maximum',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the formula takes k2 and Q as given numbers for the whole body while Io’s interior is layered and may be partly molten, so k2 and Q are not known and the heat is a bound; that it is leading order in the eccentricity; and that it needs a reason for the orbit to stay eccentric (the resonance with Europa and Ganymede), because tidal heating also circularizes the orbit. Partial credit for two.',
      title: 'What the formula leaves out',
      body: `The formula gives Io&rsquo;s heat as 21/2 &times; (k2/Q) G M&sup2; n R&sup5; e&sup2; /
             a&sup6;. It needs three things it does not supply.`,
      prompt:
        'In two or three sentences: what does the formula take as given, and what keeps Io’s orbit eccentric?',
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The small-body investigations (Prompt 198 part 3): the deeper steps of two
// more lessons in this file, and their instructor content. Every number is
// recomputed in tests/smallBodiesLessons.test.js.
// -----------------------------------------------------------------------------
const BG = (values = {}, hide = []) => ({
  id: 'belt-gaps',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});
const SC = (values = {}, hide = []) => ({
  id: 'spin-curve',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});

// -----------------------------------------------------------------------------
// The Gaps in the Belt: the deeper steps.
// -----------------------------------------------------------------------------
export const THE_GAPS_IN_THE_BELT_DEEPER = {
  id: 'the-gaps-in-the-belt',
  steps: [
    {
      sid: 'a-different-window',
      after: 'the-second-gap',
      depth: 'quantitative',
      type: 'measure',
      title: 'A different window',
      body: `Set the 3:1 window&rsquo;s width to 2, twice as wide (0.05 AU either side). Read how many objects it holds and
             the depletion.`,
      fields: [
        { id: 'found', label: 'Found in the window', unit: '', hint: '170' },
        {
          id: 'dep',
          label: 'The depletion (percent)',
          unit: '',
          hint: '62.4',
        },
      ],
      validate: v => {
        if (![v.found, v.dep].every(Number.isFinite)) return null;
        if (near(v.found, 170, 0.5) && near(v.dep, 62.4, 0.3)) {
          return {
            level: 'ok',
            message:
              'Twice as wide, the window holds 170 objects and is depleted by 62.4 percent instead of 88.0. The belt did not change: the wider window takes in the shoulders of the gap, where the objects are more numerous. A depletion belongs to a stated window, so quote it with the window.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the window at 3:1, set its width to 2, and read “Found” and the percent in “Depletion against the baseline”.',
        };
      },
      tool: BG({ gap: 1, width: 2 }, ['hlimit', 'degree', 'classes', 'survey']),
    },
    {
      sid: 'a-brighter-cut',
      after: 'a-different-window',
      depth: 'quantitative',
      type: 'measure',
      title: 'Only the brightest',
      body: `Set the width back to 1 and the H limit to 11: only the 2,537 brightest objects in the catalog, 1,118 of them in
             the range of the picture. Read the 3:1 window&rsquo;s count, its depletion and the low end of the interval.`,
      fields: [
        { id: 'found', label: 'Found in the window', unit: '', hint: '7' },
        {
          id: 'dep',
          label: 'The depletion (percent)',
          unit: '',
          hint: '83.8',
        },
        {
          id: 'lo',
          label: 'Low end of the 95 percent interval (percent)',
          unit: '',
          hint: '69.4',
        },
      ],
      validate: v => {
        if (![v.found, v.dep, v.lo].every(Number.isFinite)) return null;
        if (
          near(v.found, 7, 0.5) &&
          near(v.dep, 83.8, 0.4) &&
          near(v.lo, 69.4, 0.6)
        ) {
          return {
            level: 'ok',
            message:
              '7 found where 43 are expected: 83.8 percent, interval 69.4 to 95.2. The same gap, at the same depth to within the interval, but the interval is about three times wider (13 points either side against 5) because there are far fewer objects. The gap is still resolved; its depth is less sure.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the width to 1 and the H limit to 11, and read “Found” and the percent and low end in “Depletion against the baseline”.',
        };
      },
      tool: BG({ gap: 1, hlimit: 11 }, [
        'width',
        'degree',
        'classes',
        'survey',
      ]),
    },
    {
      sid: 'which-gaps-are-resolved',
      after: 'a-brighter-cut',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Two windows the instrument will not call resolved',
      body: `Choose the 7:3 window and then the 2:1. Both show deep depletions, 84 and 89 percent, and the instrument
             declines to call either of them resolved.`,
      prompt: 'Why?',
      options: [
        'The count differs a great deal on the two sides of each window (152 against 645 objects either side of 7:3, 1,045 against 73 either side of 2:1), so a smooth curve through the window does not describe it and the depletion cannot be told from the slope',
        'The windows hold too few objects for an interval to be made',
        'Because they are not real gaps',
        'Because Jupiter’s 7:3 and 2:1 resonances are weaker than its 3:1',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'too-few',
          option: 1,
          say: 'The baseline expects 354 and 487 objects there, plenty for an interval. What fails is the assumption that a smooth curve describes the belt across the window.',
        },
        {
          id: 'not-real',
          option: 2,
          say: 'Nothing here says the gaps are not there. It says this measurement cannot state how deep, because the baseline is not trustworthy across the window; the gap and its measurement are different things.',
        },
        {
          id: 'weaker',
          option: 3,
          say: 'The instrument says nothing of the strength of a resonance. It looks only at the shape of the counts around the window.',
        },
      ],
      hints: [
        'Look at the flank counts: what would a smooth baseline have to do between them?',
      ],
      because:
        'The belt’s density changes by a large factor from one side of each window to the other, so the depletion cannot be separated from the slope of the baseline. The instrument reports “not resolved” and says why, rather than a depth that looks as sure as the 3:1’s. The depth is not shown to be zero; it is shown to be unmeasurable by this method.',
      tool: BG({ gap: 3 }, ['hlimit', 'width', 'degree', 'classes', 'survey']),
    },
    {
      sid: 'hildas-and-trojans',
      after: 'which-gaps-are-resolved',
      depth: 'quantitative',
      type: 'measure',
      title: 'Hildas and Trojans',
      body: `Switch on &ldquo;Show orbit-class counts&rdquo;. The Hildas (near 3.97 AU, the 3:2 resonance) and the Jupiter
             Trojans (at 5.20 AU, the 1:1) are counted by a box in semi-major axis, eccentricity and inclination: a class
             rule, not a test that the orbit is in resonance. Read both counts.`,
      fields: [
        { id: 'hilda', label: 'Hildas', unit: '', hint: '183' },
        { id: 'trojan', label: 'Jupiter Trojans', unit: '', hint: '1555' },
      ],
      validate: v => {
        if (![v.hilda, v.trojan].every(Number.isFinite)) return null;
        if (near(v.hilda, 183, 0.5) && near(v.trojan, 1555, 0.5)) {
          return {
            level: 'ok',
            message:
              '183 Hildas and 1,555 Trojans with H below 13. They are counts of what the catalog holds: the Trojans, at 5.2 AU, are far and faint, and the catalog’s own note says it is less complete there than in the inner belt at the same H.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch on the orbit-class counts and read “Hildas” and “Jupiter Trojans” in “Orbit classes”.',
        };
      },
      tool: BG({ gap: 1, classes: 1 }, ['hlimit', 'width', 'degree', 'survey']),
    },
    {
      sid: 'what-a-survey-keeps',
      after: 'hildas-and-trojans',
      depth: 'advanced',
      type: 'measure',
      title: 'What a survey keeps',
      body: `Switch on &ldquo;Show what a survey keeps&rdquo;. A survey with one limiting magnitude finds nearer bodies more
             completely, because brightness at opposition falls with distance. This is a model with a stated slope, not a
             correction of the catalog. Read how many times more completely a body at 2.0 AU is found than one at 3.5 AU,
             and the mean a that a belt uniform in a would show.`,
      fields: [
        {
          id: 'ratio',
          label: 'Found at 2.0 AU against 3.5 AU',
          unit: '',
          hint: '40.0',
        },
        {
          id: 'mean',
          label: 'The mean a of what is found (AU)',
          unit: '',
          hint: '2.35',
        },
      ],
      validate: v => {
        if (![v.ratio, v.mean].every(Number.isFinite)) return null;
        if (near(v.ratio, 40.0, 0.5) && near(v.mean, 2.35, 0.01)) {
          return {
            level: 'ok',
            message:
              '40.0 times, and a mean of 2.35 AU against a true 2.75 AU. A histogram of discoveries is skewed inward by selection alone. This catalog’s cut, H below 13, is meant to sit above that limit in the main belt, which is why the gaps can be measured on it; the same cut cannot be trusted for bodies at 5 AU.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch on “Show what a survey keeps” and read the two rows “A magnitude-limited survey” and “The mean of what is found”.',
        };
      },
      tool: BG({ gap: 1, survey: 1 }, ['hlimit', 'width', 'degree', 'classes']),
    },
    {
      sid: 'the-baseline-is-a-choice',
      after: 'what-a-survey-keeps',
      depth: 'advanced',
      type: 'measure',
      title: 'The baseline is a choice',
      body: `The baseline is a polynomial in the logarithm of the count; the default is degree 4. Set the degree to 3 and
             read the 3:1 depletion, then set it to 6 and read it again.`,
      fields: [
        {
          id: 'd3',
          label: 'The depletion at degree 3 (percent)',
          unit: '',
          hint: '83.7',
        },
        {
          id: 'd6',
          label: 'The depletion at degree 6 (percent)',
          unit: '',
          hint: '88.5',
        },
      ],
      validate: v => {
        if (![v.d3, v.d6].every(Number.isFinite)) return null;
        if (near(v.d3, 83.7, 0.3) && near(v.d6, 88.5, 0.3)) {
          return {
            level: 'ok',
            message:
              '83.7 at degree 3 and 88.5 at degree 6: a spread of 4.8 points, about the size of the interval’s half-width (4.8 points). The interval states sampling error only; the choice of baseline adds a systematic of the same size. At 5:2 the spread is wider still, 74.3 at degree 3 and 62.2 at degree 6.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the window at 3:1, set the degree to 3 and then 6, and read the percent in “Depletion against the baseline” each time.',
        };
      },
      tool: BG({ gap: 1, degree: 3 }, ['hlimit', 'width', 'classes', 'survey']),
    },
    {
      sid: 'a-depletion-is-not-a-clearing-fraction',
      after: 'the-baseline-is-a-choice',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What does 88 percent say about Jupiter?',
      body: `The 3:1 window is depleted by 88 percent.`,
      prompt: 'What does that number say?',
      options: [
        'That the catalog finds 88 percent fewer large objects in the window than a smooth curve fitted outside would give; how many bodies Jupiter removed, and over what time, is a question for orbit calculations that a histogram cannot answer',
        'That Jupiter removed 88 percent of the asteroids that were ever in the window',
        'That the window is 88 percent empty of asteroids of every size',
        'That the same depletion holds for objects of every size',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'cleared',
          option: 1,
          say: 'The histogram does not know what was once there. The baseline is a smooth curve fitted to what is found outside the windows, not a record of the belt’s past.',
        },
        {
          id: 'all-sizes',
          option: 2,
          say: 'The catalog keeps only H below 13, the large bodies. Nothing here says what the small ones do.',
        },
        {
          id: 'same-size',
          option: 3,
          say: 'The 3:1 depth of the brightest 1,118 objects is 83.8 percent and of the whole catalog 88.0, within the interval, but that is a test with a wide interval, not a result about every size.',
        },
      ],
      hints: [
        'What is the baseline made from, and what is the depletion measured against?',
      ],
      because:
        'The depletion is a measured statement about this catalog against a stated smooth baseline. Whether the baseline is what the belt would be without Jupiter is a model, and whether the gap was cleared in the way you imagine is a dynamical question; the interval covers sampling error only.',
      tool: BG({ gap: 1 }, ['hlimit', 'width', 'degree', 'classes', 'survey']),
    },
    {
      sid: 'resolved-is-not-precise',
      after: 'a-depletion-is-not-a-clearing-fraction',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What does “resolved” promise?',
      body: `Set the H limit to 9: the 304 brightest objects between 2.0 and 3.5 AU. The 3:1 window holds 1 where 17 are
             expected, a depletion of 94 percent with an interval from 80 to 100 percent, and the instrument calls it
             resolved.`,
      prompt: 'What does &ldquo;resolved&rdquo; promise here?',
      options: [
        'Only that the interval stays above zero: the window is depleted, but how deeply is known to about twenty points',
        'That the depth is known to a percent',
        'That the true depletion is 94 percent',
        'That the baseline is right',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'precise',
          option: 1,
          say: 'An interval from 80 to 100 percent is not a depth known to a percent. “Resolved” is a verdict about the interval’s lower end, and the interval is as wide as the data allow.',
        },
        {
          id: 'point',
          option: 2,
          say: '94 percent is the point estimate from one object found where 17 were expected; one more or fewer found moves it by six points.',
        },
        {
          id: 'baseline',
          option: 3,
          say: '“Resolved” says nothing about the baseline beyond the warnings the instrument also checks; the previous step showed that a different degree moves a depth by several points.',
        },
      ],
      hints: ['What is the interval, and what does it exclude?'],
      because:
        'The rule is that the interval’s low end is above zero and no warning applies. With 304 objects the interval spans about twenty points. “Resolved” is a floor on what you may say, not a statement of precision, and a verdict should always be read beside the interval.',
      tool: BG({ gap: 1, hlimit: 9 }, ['width', 'degree', 'classes', 'survey']),
    },
  ],
};

// -----------------------------------------------------------------------------
// How Fast Does It Spin?: the deeper steps.
// -----------------------------------------------------------------------------
export const HOW_FAST_DOES_IT_SPIN_DEEPER = {
  id: 'how-fast-does-it-spin',
  steps: [
    {
      sid: 'fewer-nights',
      after: 'ask-for-the-truth',
      depth: 'quantitative',
      type: 'measure',
      title: 'Only one night',
      body: `Set the number of nights to 1: 40 measurements in one night of 7 hours. Read the rotation period and its
             uncertainty.`,
      fields: [
        {
          id: 'p',
          label: 'The rotation period (hours)',
          unit: '',
          hint: '6.268',
        },
        { id: 's', label: 'Its uncertainty (hours)', unit: '', hint: '0.036' },
      ],
      validate: v => {
        if (![v.p, v.s].every(Number.isFinite)) return null;
        if (near(v.p, 6.268, 0.01) && near(v.s, 0.036, 0.005)) {
          return {
            level: 'ok',
            message:
              '6.268 ± 0.036 h, against 6.199 ± 0.001 from five nights. The uncertainty fell by more than thirty times while the points grew five times: a long baseline of days fixes a period far better than more points in one night. The simulation’s period is 6.200 h, which the one-night value misses by 1.9 of its own sigmas.',
          };
        }
        return {
          level: 'error',
          message:
            'Use target A with one night and read the two numbers in “Rotation period”.',
        };
      },
      tool: SC({ target: 0, nights: 1 }, [
        'hours',
        'noise',
        'cadence',
        'truth',
      ]),
    },
    {
      sid: 'the-error-is-a-floor',
      after: 'fewer-nights',
      depth: 'quantitative',
      type: 'measure',
      title: 'The error is a floor',
      body: `Choose target B (five nights again). Read its rotation period and the uncertainty the instrument gives, then
             turn on &ldquo;Show the truth&rdquo; and compare.`,
      fields: [
        {
          id: 'p',
          label: 'The rotation period (hours)',
          unit: '',
          hint: '11.388',
        },
        { id: 's', label: 'Its uncertainty (hours)', unit: '', hint: '0.005' },
      ],
      validate: v => {
        if (![v.p, v.s].every(Number.isFinite)) return null;
        if (near(v.p, 11.388, 0.01) && near(v.s, 0.005, 0.002)) {
          return {
            level: 'ok',
            message:
              '11.388 ± 0.005 h. The simulation’s period is 11.400 h, which is more than two of these sigmas away. The ± comes from resampling the measurements, which assumes they are independent; it is a floor on the error, not the whole of it, and a difference of two such errors is not a failure of the method.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose target B, keep five nights, and read the two numbers in “Rotation period”.',
        };
      },
      tool: SC({ target: 1 }, ['nights', 'hours', 'noise', 'cadence']),
    },
    {
      sid: 'a-nearly-round-body',
      after: 'the-error-is-a-floor',
      depth: 'quantitative',
      type: 'measure',
      title: 'A nearly round body',
      body: `Target B is nearly round. Read its amplitude and the bound on a/b it gives.`,
      fields: [
        { id: 'amp', label: 'The amplitude (mag)', unit: '', hint: '0.106' },
        { id: 'bound', label: 'a/b is at least', unit: '', hint: '1.10' },
      ],
      validate: v => {
        if (![v.amp, v.bound].every(Number.isFinite)) return null;
        if (near(v.amp, 0.106, 0.003) && near(v.bound, 1.1, 0.01)) {
          return {
            level: 'ok',
            message:
              '0.106 mag and a/b of at least 1.10 (the simulation’s truth, shown if you ask, is 1.15). The bound holds but says little: it tells you only that the body is not a sphere. A small amplitude is a weak constraint on the shape, and no constraint at all on how flat the body is.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose target B and read “Amplitude” and the number in “The axis ratio a/b”.',
        };
      },
      tool: SC({ target: 1 }, ['nights', 'hours', 'noise', 'cadence', 'truth']),
    },
    {
      sid: 'one-night-is-not-enough',
      after: 'a-nearly-round-body',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'One night of a slow rotator',
      body: `Choose target B with one night. Its rotation takes 11.4 hours and the night is 7 hours long. The instrument
             gives a period of 16.6 &plusmn; 9.3 h and, for the amplitude, the word &ldquo;withheld&rdquo;.`,
      prompt: 'Why is the amplitude withheld?',
      options: [
        'About 0.60 of the turn was never observed, so the fitted curve there is a guess, and an amplitude read from it would be one too',
        'The noise is too large for any amplitude',
        'A nearly round body has no amplitude',
        'The instrument has failed',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'noise',
          option: 1,
          say: 'The noise is the same 0.01 mag as with five nights, when the amplitude is read without difficulty. What is different is how much of the turn was seen.',
        },
        {
          id: 'round',
          option: 2,
          say: 'The body has an amplitude of 0.103 mag, as five nights show. One night simply does not cover enough of the turn to measure it.',
        },
        {
          id: 'failed',
          option: 3,
          say: 'Withholding is the instrument working: it would rather say nothing than return a number it cannot support.',
        },
      ],
      hints: ['How much of the turn does 7 hours of 11.4 cover?'],
      because:
        'The gap in the folded phase, the largest stretch of the turn never observed, is 0.60 of the rotation, above the limit of 0.35 the instrument allows. The period from one night is no better, 16.6 ± 9.3 h against a truth of 11.4: a rotation that is slower than the night is long cannot be measured from one night.',
      tool: SC({ target: 1, nights: 1 }, [
        'hours',
        'noise',
        'cadence',
        'truth',
      ]),
    },
    {
      sid: 'once-a-night',
      after: 'one-night-is-not-enough',
      depth: 'advanced',
      type: 'measure',
      title: 'One point a night',
      body: `Set the sampling to one point a night: 40 nights, a little different time each night. Read the two competing
             periods the instrument lists.`,
      fields: [
        { id: 'p1', label: 'The first period (hours)', unit: '', hint: '5.49' },
        {
          id: 'p2',
          label: 'The second period (hours)',
          unit: '',
          hint: '6.20',
        },
      ],
      validate: v => {
        if (![v.p1, v.p2].every(Number.isFinite)) return null;
        if (near(v.p1, 5.49, 0.02) && near(v.p2, 6.2, 0.02)) {
          return {
            level: 'ok',
            message:
              '5.49 h and 6.20 h, and the verdict is ambiguous. The strongest peak is the first, and it is wrong: the simulation’s period is 6.2 h. The rotation row even prints 5.491 ± 0.000 h. Sampling once a day cannot tell a frequency from that frequency plus or minus one cycle a day, and an error bar that small is meaningless when the periods cannot be told apart.',
          };
        }
        return {
          level: 'error',
          message:
            'Use target A and one point a night, and read the two periods in “The competing periods”.',
        };
      },
      tool: SC({ target: 0, cadence: 1 }, [
        'nights',
        'hours',
        'noise',
        'truth',
      ]),
    },
    {
      sid: 'not-periodic-is-the-samplings',
      after: 'once-a-night',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A period that is not found',
      body: `Choose target C with one point a night. The simulation rotates every 8.0 hours and varies by 0.315 mag, but the
             verdict is &ldquo;not periodic&rdquo;.`,
      prompt: 'What does that verdict say?',
      options: [
        'That this sampling cannot show a period: it is a verdict about the data, not the asteroid. An 8-hour rotation fits three times into a day, so each night finds the asteroid at nearly the same phase',
        'That target C does not rotate',
        'That it rotates but is round',
        'That the instrument is broken',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'no-rotation',
          option: 1,
          say: 'The same target with five dense nights gives a clean 8.002 h. Not finding a period is a statement about what was observed.',
        },
        {
          id: 'round',
          option: 2,
          say: 'Its amplitude is 0.315 mag, as dense nights show. A round body would be a flat line at any sampling.',
        },
        {
          id: 'broken',
          option: 3,
          say: 'The instrument says the strongest peak could be noise: its false-alarm probability is 0.33. Saying so is the right thing to do.',
        },
      ],
      hints: ['How many turns does the asteroid make in 24 hours?'],
      because:
        'A period that divides a day sampled once a night is seen at the same phase every time, so the light looks constant. Dense sampling reveals it. “Not periodic” is the sampling’s verdict, which no amount of looking at the same data can overturn.',
      tool: SC({ target: 2, cadence: 1 }, [
        'nights',
        'hours',
        'noise',
        'truth',
      ]),
    },
    {
      sid: 'nothing-to-find',
      after: 'not-periodic-is-the-samplings',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A peak with nothing behind it',
      body: `Choose target D: a point that does not vary at all. The periodogram still has a highest peak, at 4.09 hours with a
             power of 0.06, and the instrument reports no period.`,
      prompt: 'Why?',
      options: [
        'A highest peak always exists. Its false-alarm probability, 0.26, says noise alone gives a peak this high about a quarter of the time, so it is not a detection',
        'The peak is too small to see',
        'A round body has an infinite period',
        'The instrument needs more nights',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'small',
          option: 1,
          say: 'Whether a peak is “small” is not the question; it is whether noise would give one as high. That probability is what the instrument computes.',
        },
        {
          id: 'infinite',
          option: 2,
          say: 'A round body does not vary, so no period can be measured; it does not have an infinite one.',
        },
        {
          id: 'nights',
          option: 3,
          say: 'More nights would not help: there is no signal to find.',
        },
      ],
      hints: ['Would the highest of many noisy peaks be zero?'],
      because:
        'The periodogram’s strongest peak is the strongest of hundreds of trial periods, and even pure noise has one. The false-alarm probability asks how often noise would reach that power; at 0.26 it is not unusual, and the instrument declines to give a period.',
      tool: SC({ target: 3 }, ['hours', 'noise', 'cadence', 'truth']),
    },
    {
      sid: 'one-maximum',
      after: 'nothing-to-find',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Six hours or three?',
      body: `The strongest peak is at 3.10 h and the instrument gives the rotation period as twice that, 6.20 h. The row
             below it gives the other reading: 3.10 h, if the curve has one maximum a rotation.`,
      prompt: 'What decides between 6.20 h and 3.10 h?',
      options: [
        'The assumption that the body is convex and roughly an ellipsoid, with two maxima a turn; this light curve cannot prove it, which is why both are listed',
        'The periodogram: its strongest peak is at 3.10 h, so the rotation is 3.10 h',
        'The noise level',
        'Nothing: the answer is always twice the peak',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'peak-is-period',
          option: 1,
          say: 'The peak is the period of the light. The rotation period equals it only if the body shows one maximum a turn.',
        },
        {
          id: 'noise',
          option: 2,
          say: 'The noise changes the error, not the factor of two between the readings.',
        },
        {
          id: 'always-twice',
          option: 3,
          say: 'Twice is what an ellipsoid gives. An albedo marking, or a shape far from an ellipsoid, can give one maximum a turn, and then the rotation is the light’s period.',
        },
      ],
      hints: ['What shape did the model assume?'],
      because:
        'The factor of two is an assumption about shape, the two-maxima rule, and the instrument states the other reading beside the first for that reason. Evidence that settles it comes from elsewhere: curves seen at other geometries, or the two halves of the fold differing.',
      tool: SC({ target: 0 }, ['nights', 'hours', 'noise', 'cadence', 'truth']),
    },
  ],
};

const SMALL_BODY_CONTENT = {
  'the-gaps-in-the-belt': {
    topic:
      'A histogram of a real catalog of 8,886 numbered asteroids by semi-major axis, a smooth baseline fitted outside the resonance windows, and the depth of each gap with a bootstrap interval, a verdict and its limits.',
    difficulty:
      'Introductory (a count and a ratio), with an upper depth on what a baseline and a window assume',
    placement:
      'In a survey course after the unit on asteroids, and in a majors course as a first measurement from a real catalog; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 14 (asteroids); the chapter citation is the author’s and has not been checked against the book.',
    overview:
      'Students read what a catalog of numbered objects with H below 13 is a count of (what was found, not what is there), predict how depleted the 3:1 gap is, and measure it: 26 found where 216 are expected, 88.0 percent (interval 82.9 to 92.4); the 5:2 gap is 63.3 percent (56.5 to 70.0). The quantitative depth widens the window (62.4 percent), cuts to the brightest 2,537 (83.8, interval 69.4 to 95.2), meets 7:3 and 2:1, which the instrument will not call resolved because their flanks differ, and counts 183 Hildas and 1,555 Jupiter Trojans. The advanced depth states what a magnitude-limited survey keeps (40.0 times as completely at 2.0 as at 3.5 AU), varies the baseline (83.7 to 88.5 percent), and says what a depletion does not say about Jupiter.',
    priorKnowledge: [
      'Kepler’s third law: a larger orbit takes longer',
      'A histogram counts objects in bins',
      'A ratio of two counts is a fraction',
    ],
    keyConcepts: [
      {
        heading: 'A catalog is what was found',
        body: 'The numbered objects with H below 13 are the large ones that were discovered and numbered. A histogram of them shows where large objects are found, which describes the main belt as far as the large bodies are all found; it is not a count of the population and says nothing of small bodies.',
      },
      {
        heading: 'A gap is a depletion against a baseline',
        body: 'A smooth curve is fitted outside every window and carried across them; the depletion is one minus the objects found over the objects it expects. 3:1 is 88.0 percent deep and 5:2 63.3: gaps, not holes, and of different depths.',
      },
      {
        heading: 'A method that can decline',
        body: 'Where the counts on the two sides of a window differ by a large factor (7:3, 2:1) or too few are expected (4:1), the instrument says not resolved and why. A different window, cut or baseline is a different measurement; the interval covers sampling error only.',
      },
    ],
    features: [
      {
        name: 'Belt instrument (small-body family)',
        text: 'The histogram of semi-major axis from 2.0 to 3.5 AU of the JPL numbered cut, the baseline, the five Jupiter resonance windows, the depletion with a 400-draw bootstrap interval and a verdict with its warnings, controls for the window, the width, the H limit and the baseline degree, the orbit-class counts and the survey model.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: a wider window, a brighter cut, two windows that are not resolved, and the Hildas and Trojans. Advanced: what a survey keeps, the choice of baseline, what a depletion does not say, and what “resolved” promises.',
      },
      {
        name: 'Predictions before answers',
        text: 'The depth of the 3:1 gap is predicted before it is counted, and is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'The histogram counts the asteroids there are.',
        response:
          'It counts the numbered objects with H below 13: what was found, and only the large ones.',
      },
      {
        claim: 'A gap in the asteroid belt is empty.',
        response:
          'The 3:1 window holds 26 objects where 216 are expected: a depletion of 88 percent.',
      },
      {
        claim: 'A depletion is the share of asteroids Jupiter removed.',
        response:
          'It is how far the count falls below a smooth baseline fitted outside the windows; the baseline is a model and the history is a dynamical question.',
      },
      {
        claim: 'A window the instrument will not call resolved is not a gap.',
        response:
          'It says the measurement is not trustworthy there (7:3 and 2:1 have uneven flanks), not that the gap is absent.',
      },
      {
        claim: 'The interval is the whole uncertainty.',
        response:
          'It covers sampling error only; degrees 3 and 6 move the 3:1 depth by 4.8 points and a window of twice the width by 26.',
      },
    ],
    teachingNotes: [
      'The catalog is the JPL Small-Body Database query for numbered objects with H below 13, retrieved on 27 October 2026 (8,886 rows), kept whole as a lazy file (js/data/smallbodies/numbered-h13.json) with its selection statement; JPL is credited and does not endorse this use. The 5,871 rows with a between 2.0 and 3.5 AU are the picture.',
      'The windows (half-widths 0.015, 0.025, 0.025, 0.02 and 0.04 AU) and the degree-4 Poisson baseline were fixed before the catalog was read (SMALL_BODIES.md). On validation belts the 3:1 and 5:2 intervals covered at 0.927 and 0.913, but the 7:3 and 2:1 did not (0.847 and 0.787): those validation legs fail and are recorded, not hidden.',
      'The Hildas and Trojans are counted by a box in a, e and i, not a libration test; the catalog is less complete for the Trojans, and the counts are not populations.',
      'The depth of the 3:1 gap on the brightest 2,537 objects is 83.8 percent; with 1,118 in range its interval is about three times wider.',
    ],
    discussion: [
      'What would you need to say how many bodies Jupiter removed from a window, rather than how deep the gap looks?',
      'Why does the same gap look shallower when the window is wider?',
      'A new survey finds ten times as many faint objects. What would you expect it to do to the catalog’s histogram, and what to the gaps?',
    ],
    extensions: [
      'Step the H limit from 9 to 13 and watch the interval of the 3:1 gap narrow.',
      'Set the degree to 2 and to 6 at the 5:2 window and compare the spread with the interval.',
    ],
    modelNotes:
      'js/kernels/smallbodies/ (SMALL_BODIES.md): histogram, fitBaseline, gapSurvey (the depletion, the case-bootstrap interval and the verdicts), countClasses, detectedFractionRatio and meanAxisDetected; the e1 legs of npm run small-bodies:validate, with the coverage failures at 7:3 and 2:1 recorded.',
  },
  'how-fast-does-it-spin': {
    topic:
      'A rotation period and an axis-ratio bound from a synthetic light curve: a periodogram, the two-maxima rule, the amplitude and the bound it gives, and what the instrument says when the sampling or the signal cannot support a period.',
    difficulty:
      'Introductory (a period and a ratio), with an upper depth on aliasing and false alarms',
    placement:
      'In a survey course after the unit on asteroids, and in a majors course alongside periodograms; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 14 (asteroids); the citation is the author’s and has not been checked against the book.',
    overview:
      'Students see the light of a synthetic rotating ellipsoid (five nights, 40 points a night, noise 0.01 mag), predict that its rotation period is twice the light’s, and read 3.099 h and 6.199 ± 0.001 h; the amplitude is 0.333 mag and a/b is at least 1.36. With the truth shown (6.2 h, a/b 1.5, 70 degrees) the bound lies below it, as a bound must. The quantitative depth shortens the run (one night: 6.268 ± 0.036), shows the error is a floor (target B: 11.388 ± 0.005 against 11.400), a nearly round body (amplitude 0.106, a/b at least 1.10) and an amplitude withheld for a gap in the phase. The advanced depth samples once a night (5.49 or 6.20 h, ambiguous, the top peak wrong), a period hidden by the sampling, a peak with nothing behind it, and the one-maximum alternative.',
    priorKnowledge: [
      'A period is the time for something to repeat',
      'Brightness in magnitudes: a lower number is brighter',
      'A graph of brightness against time',
    ],
    keyConcepts: [
      {
        heading: 'Two maxima a turn',
        body: 'An elongated body shows its long side twice a rotation, so the light repeats at half the rotation period and the rotation period is twice the strongest peak. That is an assumption about shape, and the instrument lists the one-maximum reading beside it.',
      },
      {
        heading: 'An amplitude bounds, it does not measure',
        body: 'The brightness ratio 10^(0.4 times the amplitude) is a lower bound on a/b, equal to it only when the body is seen equator-on, and it says nothing of b/c.',
      },
      {
        heading: 'What the data cannot support',
        body: 'Once-a-night sampling aliases the period (a top peak that is wrong), a part of the turn never observed withholds the amplitude, a flat star has a highest peak with a false-alarm probability near a quarter. The instrument says so rather than printing a number.',
      },
    ],
    features: [
      {
        name: 'Spin instrument (small-body family)',
        text: 'A seeded synthetic light curve of one of four targets, controls for the number of nights, the hours a night, the noise, one point a night, and a truth toggle; the data, the periodogram, the fold, the period with its floor error, the amplitude with an interval, the bound on a/b, and the verdicts ambiguous, not periodic and withheld. The truth is withheld until asked for.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: one night, the error as a floor, a nearly round body and a phase gap. Advanced: one point a night, a period hidden by the sampling, a peak with nothing behind it, and the one-maximum reading.',
      },
      {
        name: 'Predictions before answers',
        text: 'The rotation period is predicted before it is read, and is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'The strongest peak is the rotation period.',
        response:
          'It is the period of the light; the rotation period is twice it if the curve has two maxima a turn.',
      },
      {
        claim: 'The amplitude gives the shape.',
        response:
          'It gives a lower bound on a/b, equal to it only at an aspect of 90 degrees, and nothing of b/c.',
      },
      {
        claim: 'A small ± means the period is right.',
        response:
          'The ± is a floor from resampling the points; at one point a night the rotation row prints 5.491 ± 0.000 h for a truth of 6.2.',
      },
      {
        claim: '“Not periodic” means the asteroid does not rotate.',
        response:
          'It is a verdict about the sampling: target C, at 8.0 h, is not periodic at one point a night and clean at five dense nights.',
      },
      {
        claim: 'The data are a real asteroid.',
        response:
          'They are synthetic, with a known truth; the measured light curve the project looked for was not available.',
      },
    ],
    teachingNotes: [
      'Every light curve is simulated: a triaxial ellipsoid rotating about its short axis at one aspect, geometric scattering at zero phase angle, seeded Gaussian noise. The truth manifest (period, axes, aspect, amplitude) is withheld until “Show the truth” is switched on. Tier e2 of the validation, a measured curve, was not run, and the investigation never presents the data as authentic.',
      'On the validation ensemble of 300 synthetic curves the period within 0.003 h and the claim a/b at least the bound held for between 92 and 99 percent of curves; several legs (amplitude interval coverage near 0.62 to 0.70 against 0.95 stated, the claim at one noise level) failed as committed and are recorded in tests/fixtures/small-bodies/failed-legs.json. Read the amplitude interval as a floor.',
      'The false-alarm probability is the Horne and Baliunas form; the phase-gap limit (0.35 of the turn) and the alias ratio (0.9) are fixed in the kernel before any curve was seen.',
      'Phase angle, albedo markings, non-ellipsoidal shapes and tumbling are left out, and the instrument says so.',
    ],
    discussion: [
      'Why does a long baseline fix a period better than many points in one night?',
      'What observation would tell six hours from three?',
      'A real survey observes each asteroid once or twice a night for a few nights. What could it conclude about rotation?',
    ],
    extensions: [
      'Raise the noise to 0.05 mag and watch which numbers move and which do not.',
      'Try two nights of 2 hours and watch the verdict and the amplitude.',
    ],
    modelNotes:
      'js/kernels/smallbodies/ (SMALL_BODIES.md): synthLightCurve, nightlyTimes, rotationFromLightCurve (the Lomb-Scargle peak, the two-maxima rule, the harmonic refinement, the amplitude with an interval, the bound, the verdicts) and falseAlarm; the b, c and d legs of npm run small-bodies:validate, with the failed legs recorded.',
  },
};

const SMALL_BODY_FLOW = {
  'the-gaps-in-the-belt': [
    {
      from: 'a-catalog-of-whats-found',
      to: 'what-is-counted',
      text: 'A catalog of what was found, and what its histogram does and does not say.',
    },
    {
      from: 'depletion-predict',
      to: 'count-the-gap',
      text: 'The prediction of the 3:1 depth, held, and the count of the window against the baseline.',
    },
    {
      from: 'depletion',
      to: 'not-empty',
      text: 'The depletion with its bootstrap interval, and a gap that is not a hole.',
    },
    {
      from: 'the-second-gap',
      to: 'what-you-worked-out',
      text: 'A shallower gap at 5:2, and the close.',
    },
  ],
  'how-fast-does-it-spin': [
    {
      from: 'a-flickering-point',
      to: 'two-maxima-predict',
      text: 'A synthetic light curve and the prediction of its rotation period, held.',
    },
    {
      from: 'rotation-period',
      to: 'rotation-period',
      text: 'The period at the strongest peak, and the rotation period twice it.',
    },
    {
      from: 'amplitude-and-bound',
      to: 'amplitude-and-bound',
      text: 'The amplitude and the lower bound it gives on a/b.',
    },
    {
      from: 'ask-for-the-truth',
      to: 'what-you-worked-out',
      text: 'The truth shown against the measurements, and the close.',
    },
  ],
};

const SMALL_BODY_EXPECTATIONS = {
  'the-gaps-in-the-belt': {
    'count-the-gap': '26 found (within 0.5) and 216 expected (within 1.5).',
    depletion:
      'A depletion of 88.0 percent (within 0.3), with an interval of 82.9 to 92.4 (within 0.5).',
    'the-second-gap':
      '115 found (within 0.5) and a depletion of 63.3 percent (within 0.3).',
  },
  'how-fast-does-it-spin': {
    'rotation-period':
      'A light period of 3.099 h (within 0.01) and a rotation period of 6.199 h (within 0.01).',
    'amplitude-and-bound':
      'An amplitude of 0.333 mag (within 0.004) and a/b of at least 1.36 (within 0.01).',
  },
};

const SMALL_BODY_BANDS = {
  'the-gaps-in-the-belt': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'how-fast-does-it-spin': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: {
    ...SMALL_BODY_CONTENT,
    'why-rings': {
      topic:
        'The Roche limit for a rigid and a fluid body from two densities, a resonance as a radius in a ring, and two scale-model scenarios that show a tidal stream and the first sign of a resonance, with what each leaves out.',
      difficulty: 'Introductory',
      placement:
        'After the Tides investigation and Newton’s gravity. It needs a ratio and a cube root. It supports OpenStax Astronomy 2e chapter 12 (section 12.5, planetary rings).',
      overview:
        'Students read the Roche limit of four pairs (Phobos and Mars, Shoemaker-Levy 9 and Jupiter, the Moon and the Earth, ice in Saturn’s B ring), predict where Phobos lies against the two limits, watch a clump pass inside the limit in the Roche Pass scenario, and find where the 2:1 resonance of Mimas falls against the Cassini Division. The Ring Gap scenario is shown with what its run records: a thinning, not a gap.',
      priorKnowledge: [
        'Newtonian gravity and the idea of a tide',
        'Density and a cube root',
        'Orbital period and the idea of a resonance as a ratio of two periods',
      ],
      keyConcepts: [
        {
          heading: 'Two limits for one pair',
          body: 'A rigid body resists being pulled apart (rigid limit, 1.26 R (ρp/ρs)^(1/3)); a fluid one does not (2.44 times the same). A real body lies between them.',
        },
        {
          heading: 'A resonance is a radius',
          body: 'The p:q resonance lies at a (q/p)^(2/3) of the moon’s distance. Mimas’s 2:1 lies 0.6 percent from the edge of the Cassini Division; the real radius differs by about as much because of Saturn’s oblateness.',
        },
        {
          heading: 'A model shows what it contains',
          body: 'The ring scenario’s particles never collide, so its resonance thins the ring and does not empty it. Say what each model leaves out.',
        },
      ],
      features: [
        {
          name: 'Roche and resonance instruments (tides family)',
          text: 'The rigid and fluid limits of four named pairs, with the regime of a distance, and the resonance radius of three moons beside four edges and gaps in Saturn’s rings. Every number is the tides kernel’s.',
        },
        {
          name: 'Ring and pass steps of the investigation',
          text: 'The first and the last stage of the investigation open the two scenarios in the simulation so the numbers of the instruments can be seen on bodies; every step names the instrument it reads.',
        },
        {
          name: 'Roche Pass and Ring Gap scenarios',
          text: 'Two scale models declared through the geometry table with Newtonian gravity and no extra force. Their committed legs, three of which failed their bounds, are in tests/fixtures/tides/display-record.json.',
        },
      ],
      misconceptions: [
        {
          claim: 'A resonance always clears a gap.',
          response:
            'It excites the ring particles’ orbits; whether a gap results depends on collisions and on the ring’s own gravity. The scenario’s ring has no collisions and thins rather than empties.',
        },
        {
          claim: 'The Roche limit is a distance from the planet’s surface.',
          response:
            'It is measured from the planet’s center, in units of the planet’s radius or kilometers; a Phobos orbit radius of 9,376 km is from Mars’s center.',
        },
        {
          claim: 'Anything inside the Roche limit is torn apart.',
          response:
            'Only a body held together by gravity alone. A body with strength survives inside the fluid limit, and a rocky moon can orbit between the limits.',
        },
        {
          claim: 'Rings are the debris of a moon that crossed the limit.',
          response:
            'That is one idea. Rings can also be material that never formed a moon; the limit says only that a moon cannot form there.',
        },
      ],
      teachingNotes: [
        'Say before the pass that the clump is held by its own gravity alone, which is the case the fluid limit describes; ask what a body with strength would do.',
        'The Roche numbers are exact in the kernel; the steps use two decimals for Jupiter radii and kilometers to the nearest ten.',
        'The pass is a scale model: the clump is a softened swarm of 60 particles. In the recorded run its extent grows sixteenfold. At 1.5 times the fluid limit the committed control run grows about a quarter, but that is not a robust number: across eight periapses within 2 percent of it the extent ratio runs from 0.2 to 4 (five of eight under 2), because one body that escapes sets the largest extent. A longer run loosens the clump by itself, which the scenario’s summary says.',
        'The ring scenario fails three of its committed legs (the eccentricity contrast at the resonance, the thinning bound by 0.03, and the shepherd’s lane); the investigation states what the run shows (19 particles in the resonance window against 24 beside it) and no more. A ring that has no collisions cannot hold a clean gap.',
      ],
      discussion: [
        'Why does a scale model with an exaggerated G still tell you the ratio of the two radii?',

        'Phobos is between the two limits. What does that tell you about what Phobos is made of?',
        'The model says where a resonance is, not whether it opens a gap. What else would you need?',
      ],
      extensions: [
        'Find the distance at which the Moon’s fluid Roche limit for the Earth’s density would lie, and compare it to the Moon’s orbit.',
        'Run the Roche Pass scenario in the sandbox and move the periapsis with the inspector.',
      ],
      modelNotes:
        'js/tidesWidgets.js (rocheView, resonanceView), the tides kernel (rocheLimit, rocheRegimeAt, resonanceRadius), the scenarios ring-gap and roche-pass (ENGINE_GEOMETRY in js/world/build.js), tools/tides-scenarios.mjs and tests/tidesScenarios.test.js.',
    },
    'tides-that-move-the-moon': {
      topic:
        'The Moon’s recession and the day’s lengthening as one exchange of angular momentum in a constant-Q model, a closed-form table forward and backward, and the failure of the model run backward.',
      difficulty: 'Intermediate',
      placement:
        'After Tides and Newton’s gravity. It needs an exponent and a unit conversion. It supports OpenStax Astronomy 2e chapter 4 (section 4.6, tides).',
      overview:
        'Students read the Moon’s recession and the day’s lengthening for k2 = 0.30 and Q = 12 against lunar laser ranging and eclipse records, run the model forward one billion years, and run it backward until it stops: contact 1.58 billion years ago, long after the Moon formed.',
      priorKnowledge: [
        'Tides and the tidal bulge',
        'Angular momentum and its conservation',
        'Kepler’s third law and the idea of a period',
      ],
      keyConcepts: [
        {
          heading: 'One process, two effects',
          body: 'The bulge pulls the Moon forward and the Moon pulls it back: the Moon gains orbital angular momentum and the Earth loses spin, and the sum is conserved.',
        },
        {
          heading: 'Backward is a test',
          body: 'Run backward, the model puts the Moon in contact 1.58 billion years ago, far more recently than the age of the lunar rocks allows; the mismatch says the model’s one number cannot hold across time.',
        },
        {
          heading: 'Q is a parameter',
          body: 'The model fits the present with one Q and fails backward. That is information about Q, not about the Moon.',
        },
      ],
      features: [
        {
          name: 'Constant-Q model',
          text: 'k2 = 0.30 and Q = 12 are fixed at values that reproduce the present rate; the instrument has no fitted parameter and shows the model’s consequences, not an evolution simulation.',
        },
        {
          name: 'Forward and backward table',
          text: 'A closed-form table for a chosen number of years in either direction, stopping at contact; it is the same function the tests recompute.',
        },
        {
          name: 'Moon instrument (tides family)',
          text: 'The recession rate, the day’s lengthening and a precomputed closed-form table from now to a stated time, forward or backward, with the point where the model stops. Nothing is simulated; no force acts on any engine body (the tidal-torque gate’s verdict B).',
        },
      ],
      misconceptions: [
        {
          claim: 'The tide slows the Moon.',
          response:
            'It speeds the Moon up in energy and angular momentum; a higher orbit is a slower orbit. The Earth’s spin loses what the Moon gains.',
        },
        {
          claim: 'The Moon will escape.',
          response:
            'The Earth’s spin will slow until it matches the Moon’s, at which point the evolution stops, long before the Sun’s evolution matters.',
        },
        {
          claim: 'The Moon recedes at a constant rate.',
          response:
            'The rate falls steeply with distance (da/dt goes as a^-11/2), so it is larger in the past; the model reaches contact in finite time.',
        },
        {
          claim: 'The failure backward means the present rate is wrong.',
          response:
            'The present rate matches laser ranging. The failure is of the assumption that Q was the same in the past.',
        },
      ],
      teachingNotes: [
        'Have students predict the sign of the Moon’s change before the table.',
        'The contact time is a model result; say what geologic evidence says and let the mismatch stand.',
        'k2 = 0.30 and Q = 12 are chosen to match the present; the instrument does not fit them. The tier-b check holds the recession within 10 percent of 3.82 and the day within 15 percent of 2.3.',
        'The table stops at the first sample before contact; the model’s contact time (1.58 billion years) is the number to quote.',
      ],
      discussion: [
        'What evidence beyond the lunar rocks could test the Moon’s past distance?',

        'What would the ocean’s geography do to Q over time?',
        'If the Moon were once close, what would the day have been?',
      ],
      extensions: [
        'Change Q and find the contact time for Q = 30.',
        'Find the day length when the Moon has receded to 450 thousand km in the model.',
      ],
      modelNotes:
        'js/tidesWidgets.js (moonView), the tides kernel (recession, tidalTrajectory, lockingTime). The constant-Q evolution is a parameterisation, as TIDAL_KERNEL.md says.',
    },
    'ios-fire': {
      topic:
        'Tidal heating as a formula, energy per orbit, the square dependence on the eccentricity, and a bound over three orders of magnitude from the unknown k2/Q.',
      difficulty: 'Intermediate',
      placement:
        'After Tides and the Galilean moons. It needs squares and a power of ten. It supports OpenStax Astronomy 2e chapter 12 (section 12.2, the Galilean moons).',
      overview:
        'Students read the heating of Io for k2 = 1.5 and Q = 100 (9.3 × 10¹³ W, inside the observed 0.6 to 1.6 × 10¹⁴), double the eccentricity (four times the heat), and read the k2/Q the observed heat needs (0.0177), seventeen times below the model’s largest.',
      priorKnowledge: [
        'Tides and the tidal bulge',
        'Orbital eccentricity',
        'Power and energy in watts and joules',
      ],
      keyConcepts: [
        {
          heading: 'Heat is friction in a flexing',
          body: 'Io’s orbit is eccentric, so its tide rises and falls once an orbit; the friction is the heat, in proportion to e squared.',
        },
        {
          heading: 'Energy in one orbit',
          body: 'The heat times the period is the energy a tide dissipates in one orbit, 1.43 × 10¹⁹ J at the model’s maximum; the observation sets what the interior must do with it.',
        },
        {
          heading: 'A bound, not a prediction',
          body: 'The heat is proportional to k2/Q, which nobody knows for Io. The kernel gives a range of three orders of magnitude; the observation selects k2/Q.',
        },
      ],
      features: [
        {
          name: 'Observed range',
          text: 'The observed heat flow of 6 × 10¹³ to 1.6 × 10¹⁴ W is drawn as a band beside the formula’s range, so the match is a comparison and not a fit.',
        },
        {
          name: 'Eccentricity control',
          text: 'The eccentricity can be changed and the heating follows as its square; the circular orbit has no heat from this source.',
        },
        {
          name: 'Heating instrument (tides family)',
          text: 'The heating of a synchronous satellite on an eccentric orbit, its energy per orbit, the range the model allows and the k2/Q the observed heat needs, against the observed flow of 0.6 to 1.6 × 10¹⁴ W.',
        },
      ],
      misconceptions: [
        {
          claim: 'Io is hot inside because of radioactivity.',
          response:
            'Its radioactive heat is a small part of what it radiates; the observed heat is of the order the tide can supply.',
        },
        {
          claim: 'The heat depends on Jupiter’s tide alone.',
          response:
            'It depends on the radius, the orbit, the eccentricity squared and k2/Q; the interior sets the last.',
        },
        {
          claim: 'The formula predicts Io’s heat.',
          response:
            'It predicts a multiple of k2/Q. The match to the observed heat depends on the chosen k2 and Q.',
        },
        {
          claim: 'Tidal heating can go on forever.',
          response:
            'It also circularizes the orbit; Io’s eccentricity is sustained by the resonance with Europa and Ganymede.',
        },
      ],
      teachingNotes: [
        'Ask for the sign and size of the change before the eccentricity is doubled; the factor of four surprises students who expect two.',
        'The bound’s width is the point: say that agreement within the range is not evidence for a value of k2/Q.',
        'The observed heat flow is a range (Veeder et al. 1994; Spencer et al. 2000); the tier-b check holds the formula within a factor of two of it.',
        'The numbers in the steps are the kernel’s for Io’s radius, orbit and mass, with e = 0.0041.',
      ],
      discussion: [
        'If k2/Q were ten times larger, what would Io’s surface look like?',

        'What would change if Io’s interior were not uniform?',
        'Why does the Moon not heat this way?',
      ],
      extensions: [
        'Compare Io’s heating to that of Europa at its eccentricity of 0.0094.',
        'Find the eccentricity that gives the lower observed bound at k2/Q = 0.015.',
      ],
      modelNotes:
        'js/tidesWidgets.js (heatingView) and the tides kernel (tidalHeating, heatingRange, requiredK2OverQ), recomputed in tests/tidesLessons.test.js for every number a step states.',
    },
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
    ...SMALL_BODY_FLOW,
    'why-rings': [
      {
        from: 'rings-and-limits',
        to: 'sl9-limits',
        text: 'The two Roche limits of Shoemaker-Levy 9 and Jupiter, and the pass inside both.',
      },
      {
        from: 'phobos-predict',
        to: 'phobos-where',
        text: 'Phobos orbits between the rigid and the fluid limit.',
      },
      {
        from: 'a-pass-inside-the-limit',
        to: 'where-the-gap-falls',
        text: 'From a stream to a resonance: where Mimas’s 2:1 lies against the Cassini Division.',
      },
      {
        from: 'a-ring-with-a-resonance',
        to: 'what-rings-tell',
        text: 'What the ring scenario shows and what it leaves out; the close.',
      },
    ],
    'tides-that-move-the-moon': [
      {
        from: 'the-bulge-ahead',
        to: 'the-moons-recession',
        text: 'The bulge that runs ahead, and the recession and the day’s lengthening it gives.',
      },
      {
        from: 'forward-predict',
        to: 'forward-one-billion',
        text: 'The Moon a billion years from now.',
      },
      {
        from: 'the-model-run-backward',
        to: 'the-model-run-backward',
        text: 'The model run backward stops at contact 1.58 billion years ago.',
      },
      {
        from: 'what-the-model-leaves-out',
        to: 'what-the-model-leaves-out',
        text: 'What the constant-Q model leaves out; the close.',
      },
    ],
    'ios-fire': [
      {
        from: 'a-moon-that-melts',
        to: 'a-moon-that-melts',
        text: 'Where Io’s heat comes from.',
      },
      {
        from: 'heating-at-the-maximum',
        to: 'heating-at-the-maximum',
        text: 'Its size at k2 = 1.5 and Q = 100, and the energy in one orbit.',
      },
      {
        from: 'double-predict',
        to: 'double-the-eccentricity',
        text: 'Doubling the eccentricity quadruples the heat.',
      },
      {
        from: 'the-bound',
        to: 'what-heat-is',
        text: 'The bound over three orders of magnitude and the k2/Q the observed heat needs; the close.',
      },
    ],
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
    ...SMALL_BODY_EXPECTATIONS,
    'why-rings': {
      'sl9-limits':
        'The rigid limit 1.64 and the fluid limit 3.18 Jupiter radii (within 0.03 and 0.04).',
      'phobos-where':
        'The rigid limit 5,466 km (within 60) and the fluid limit 10,585 km (within 100); Phobos at 9,376 km is between them.',
      'where-the-gap-falls':
        'The 2:1 resonance of Mimas at 116,883 km (within 400), 0.59 percent (within 0.1) inside the outer edge of the B ring.',
    },
    'tides-that-move-the-moon': {
      'the-moons-recession':
        'Recession 3.75 cm per year (within 0.06) and day lengthening 2.05 ms per century (within 0.06).',
      'forward-one-billion':
        'The Moon at 414.6 thousand km (within 1.5) and a day of 29.5 hours (within 0.4) in one billion years.',
      'the-model-run-backward': 'Contact 1.58 billion years ago (within 0.03).',
    },
    'ios-fire': {
      'heating-at-the-maximum':
        'Heating 9.33 × 10¹³ W (within 0.1) and 1.43 × 10¹⁹ J in one orbit (within 0.03).',
      'double-the-eccentricity':
        'Heating 3.73 × 10¹⁴ W (within 0.05), four times as much.',
      'the-bound': 'The needed k2/Q is 0.0177 (within 0.0006).',
    },
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
    ...SMALL_BODY_BANDS,
    'why-rings': { core: 'short', quantitative: 'medium', advanced: 'medium' },
    'tides-that-move-the-moon': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'medium',
    },
    'ios-fire': { core: 'short', quantitative: 'medium', advanced: 'medium' },
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
  [WHY_RINGS_DEEPER.id]: WHY_RINGS_DEEPER.steps,
  [TIDES_DEEPER.id]: TIDES_DEEPER.steps,
  [IOS_DEEPER.id]: IOS_DEEPER.steps,
  [THE_GAPS_IN_THE_BELT_DEEPER.id]: THE_GAPS_IN_THE_BELT_DEEPER.steps,
  [HOW_FAST_DOES_IT_SPIN_DEEPER.id]: HOW_FAST_DOES_IT_SPIN_DEEPER.steps,
};
