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
      body: `The limit comes from the two densities: d = 2.44 R (&rho;<sub>planet</sub> /
             &rho;<sub>satellite</sub>)<sup>1/3</sup> for a body that can deform. Saturn has a
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
          'A power of ten out: the answer is about a hundred thousand km, so about 134 in thousand km.',
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
             on the Moon. The time to remove a spin &omega; is t = I&omega;/N, with I =
             &alpha; m R&sup2; the Moon&rsquo;s moment of inertia (&alpha; = 0.393) and N =
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
      after: 'what-the-model-leaves-out',
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
      after: 'what-heat-is',
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

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: {
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
          name: 'Ring and pass steps of the lesson',
          text: 'The first and the last stage of the lesson open the two scenarios in the simulation so the numbers of the instruments can be seen on bodies; every step names the instrument it reads.',
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
        'The ring scenario fails three of its committed legs (the eccentricity contrast at the resonance, the thinning bound by 0.03, and the shepherd’s lane); the lesson states what the run shows (19 particles in the resonance window against 24 beside it) and no more. A ring that has no collisions cannot hold a clean gap.',
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
        'The bound’s width is the lesson: say that agreement within the range is not evidence for a value of k2/Q.',
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
    'why-rings': { core: 'medium', quantitative: 'medium', advanced: 'short' },
    'tides-that-move-the-moon': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'short',
    },
    'ios-fire': { core: 'medium', quantitative: 'short', advanced: 'short' },
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
};
