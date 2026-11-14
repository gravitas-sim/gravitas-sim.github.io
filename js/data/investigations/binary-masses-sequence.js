// =============================================================================
// Weighing the Stars, for Real (Prompt 218)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure file
// the prompt adds (D-R10-218-02), because the shared sequence files sit at their
// line ceilings. The per-lesson path every loader builds from an id is a one-line
// re-export of a named export here, and the instructor modules read INSTRUCTOR. No
// imports: every number a step states is recomputed in tests/binaryMassesLessons.test.js
// from the instruments (js/massesWidgets.js over js/massesField.js, the kernel
// js/inference/binaryMasses.js and the inference core). Every step carries a `sid`, an
// opaque stable id that student progress is keyed by.
//
// Every data set is synthetic and says so, with its truth stated in the panel. The
// chain is two Doppler curves and an eclipse light curve of one orbit and nothing else
// (BINARY_MASSES.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'The heavier star', teffK: 6860, lumSun: 3.3 },
    { role: 'star', name: 'The lighter star', teffK: 6180, lumSun: 1.4 },
  ],
};
/** The minimum-mass panel: system 0 (a double-lined pair that never eclipses), the inclination assumed. */
const MIN = (values = {}) => ({
  id: 'masses-minimum',
  values: { system: 0, inc: 90, ...values },
});
/** The solution panel: system 0 is the F-star pair, lines 2 both velocity curves. */
const SOLVE = (values = {}) => ({
  id: 'masses-solve',
  values: { system: 0, lines: 2, view: 0, truth: 0, ...values },
});
/** The visual-pair panel (Part B): system 0 is A, view 0 both stars resolved, 1 one photocentre. */
const VISUAL = (values = {}) => ({
  id: 'masses-visual',
  values: { system: 0, view: 0, arc: 1.1, snr: 20, ...values },
});
/** The diagram: view 0 radius, 1 luminosity; systems solved so far. */
const DIAGRAM = (values = {}) => ({
  id: 'masses-diagram',
  values: { view: 0, systems: 4, band: 1, ...values },
});

export const WEIGHING_THE_STARS = {
  id: 'weighing-the-stars-for-real',
  thumbnail: 'images/investigations/weighing-the-stars-for-real.webp',
  title: 'Weighing the Stars, for Real',
  subtitle:
    'Weigh two stars from the Doppler shifts of their light and an eclipse, see why velocities alone give only a minimum, and put the stars you weighed on the mass–radius diagram',
  duration: '14-28 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that the star with the smaller velocity amplitude is the heavier, and read the mass ratio from two amplitudes',
    'Say why velocities alone give only a minimum mass, and what the eclipse adds',
    'Read the masses and radii of an eclipsing pair with their uncertainties, and say where the uncertainty comes from',
    'Say what a single line gives (the mass function) and what it does not (a mass)',
  ],
  steps: [
    {
      sid: 'two-stars-one-center',
      stage: STAGE,
      type: 'read',
      title: 'Two stars, one center',
      body: `Two stars circle the point between them that stays still, their
             <strong>center of mass</strong>. Each star&rsquo;s light is shifted by the
             Doppler effect as it moves toward us and away: the curves in the panel are the
             two stars&rsquo; velocities along our line of sight against the orbit&rsquo;s
             phase, from a double-lined spectrum, one measured velocity of each star at
             every night. When star 1 is receding, star 2 is approaching.
             \n\nThe stars are a model, the data are synthetic and the panel says so.
             What the curves can and cannot tell about the stars&rsquo; masses is this
             investigation.`,
      tool: MIN(),
    },
    {
      sid: 'who-moves-faster',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-amplitudes',
      title: 'Who moves faster?',
      body: `The center of mass sits between the stars, nearer one of them. Before you
             read the curves, decide which star swings through the larger velocity.`,
      prompt: 'The star with the larger velocity amplitude is&hellip;',
      options: [
        'The lighter one, because the center of mass is nearer the heavier star and the lighter one has farther to go in the same time',
        'The heavier one, because it has more energy to move with',
        'Neither: gravity is mutual, so the two always move equally fast',
        'The brighter one, because brightness measures speed',
      ],
      answer: 0,
      hints: [
        'Both stars complete one orbit in the same time. The one with the bigger circle has to move faster.',
      ],
      because:
        'The two stars circle their center of mass in the same time. The center is nearer the heavier star, so the heavier star travels the smaller circle and the lighter star the larger, which needs a larger speed. Put in numbers, the masses are inversely proportional to the velocity amplitudes: M1 K1 = M2 K2. The forces are equal and opposite and so are the momenta; the speeds are not equal, because the lighter star needs the larger speed for the same momentum.',
      tool: MIN(),
    },
    {
      sid: 'read-the-amplitudes',
      stage: STAGE,
      type: 'measure',
      title: 'Read the amplitudes',
      body: `The panel fits one orbit to both stars&rsquo; velocities. Read the
             <strong>semi-amplitude</strong> of each curve, K1 for star 1 and K2 for star 2,
             in km/s: half the distance from the highest to the lowest velocity.`,
      fields: [
        { id: 'a', label: 'K1 (star 1)', unit: 'km/s', want: '45.2' },
        { id: 'b', label: 'K2 (star 2)', unit: 'km/s', want: '61.0' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 45.19, 1.2) && near(v.b, 60.96, 1.2)) {
          return {
            level: 'ok',
            message:
              'K1 about 45.2 and K2 about 61.0 km/s, each known to about 0.3. Star 2 swings faster, so star 2 is the lighter: it is on the bigger circle.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the two amplitudes the panel gives for the double-lined pair that never eclipses: K1 about 45.2 and K2 about 61.0 km/s.',
        };
      },
      tool: MIN(),
    },
    {
      sid: 'the-mass-ratio',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The mass ratio',
      body: `The amplitudes are K1 = 45.2 and K2 = 61.0 km/s.`,
      prompt: 'What is the mass ratio M2 / M1?',
      options: [
        'K1 / K2 = 0.74: star 2 is about three quarters as heavy as star 1',
        'K2 / K1 = 1.35: star 2 is heavier',
        'About 0.55, the square of K1 / K2, because gravity is an inverse square law',
        'It cannot be said without the inclination',
      ],
      answer: 0,
      hints: ['Equal momenta: M1 K1 = M2 K2. Solve for M2 / M1.'],
      because:
        'The center of mass does not move, so the stars’ momenta are equal and opposite: M1 K1 = M2 K2, and M2 / M1 = K1 / K2 = 0.74. The tilt of the orbit shrinks both amplitudes by the same factor, sin i, so it cancels in the ratio: the mass ratio of a double-lined pair needs no inclination.',
      misconceptions: [
        {
          id: 'inverted',
          option: 1,
          say: 'That is the ratio the other way round. The star that swings faster is the lighter, so its mass is the smaller.',
        },
        {
          id: 'square',
          option: 2,
          say: 'Nothing is squared here: the momenta are equal, and momentum is mass times velocity.',
        },
        {
          id: 'tilt',
          option: 3,
          say: 'The tilt shrinks both amplitudes by the same factor, so it cancels in their ratio. The masses themselves need the tilt, the ratio does not.',
        },
      ],
      tool: MIN(),
    },
    {
      sid: 'a-mass-or-a-limit',
      stage: STAGE,
      type: 'measure',
      title: 'A mass, or only a limit',
      body: `The two amplitudes and the period give the size of the orbit times
             <strong>sin i</strong> and, with Kepler&rsquo;s third law, the masses times
             <strong>sin³ i</strong>: at i = 90&deg;, edge on, 0.582 and 0.432 solar
             masses. The tilt <em>i</em> of the orbit is not in the velocities. Set the
             inclination you assume to <strong>60&deg;</strong> and read what the masses
             would be.`,
      fields: [
        {
          id: 'a',
          label: 'Mass of star 1 at 60 degrees',
          unit: 'solar masses',
          want: '0.90',
        },
        {
          id: 'b',
          label: 'Mass of star 2 at 60 degrees',
          unit: 'solar masses',
          want: '0.66',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.896, 0.03) && near(v.b, 0.665, 0.03)) {
          return {
            level: 'ok',
            message:
              'About 0.90 and 0.66 solar masses at 60 degrees, against 0.58 and 0.43 at 90. The velocities fix M sin³ i; the tilt can only raise the mass from the minimum, never lower it. For a double-lined pair that never eclipses, that is all they say.',
          };
        }
        return {
          level: 'error',
          message:
            'Move “Inclination you assume” to 60 degrees: the panel gives about 0.90 and 0.66 solar masses.',
        };
      },
      tool: MIN({ inc: 60 }),
    },
    {
      sid: 'what-fixes-the-tilt',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What fixes the tilt',
      body: `A pair that eclipses is in the panel now: the same kind of orbit, the light
             curve beside the velocity curves.`,
      prompt: 'Why does an eclipse tell us the tilt?',
      options: [
        'The stars can pass in front of each other only if the orbit is seen nearly edge on, and the shape of the eclipse says how nearly',
        'An eclipse makes the stars brighter, and brightness measures the tilt',
        'An eclipse lengthens the period, which gives the tilt',
        'It does not: the tilt can only come from more velocities',
      ],
      answer: 0,
      hints: [
        'For one star to cross the disk of the other, the line of sight must lie almost in the orbit’s plane.',
      ],
      because:
        'For the stars to eclipse each other the orbit must be seen almost edge on. How deep an eclipse is and how long it lasts depend on the inclination to better than a hundredth of a degree, and with i known the masses are no longer minimum values: M = M sin³ i / sin³ i, and sin i is within a hair of 1.',
      misconceptions: [
        {
          id: 'brighter',
          option: 1,
          say: 'An eclipse takes light away, and it is the shape of what is lost, not its amount alone, that fixes the geometry.',
        },
        {
          id: 'velocities',
          option: 3,
          say: 'More velocities from the same orbit shrink the same sin i; they cannot separate it from the masses. The light curve is a second kind of measurement.',
        },
      ],
      tool: SOLVE(),
    },
    {
      sid: 'what-the-pair-gives',
      stage: STAGE,
      type: 'read',
      title: 'What the pair gives, and what it leaves open',
      body: `The two amplitudes gave the <strong>mass ratio</strong> and the velocities
             alone gave only <strong>minimum masses</strong>. The eclipse added the tilt,
             and with it the masses themselves and the radii, each with the uncertainty the
             whole fit carries. Take away the eclipse, or one of the two lines, and the
             answer shrinks back to a minimum or to a mass function.
             \n\nThe deeper levels weigh the pair with its uncertainties, put the stars on
             the mass&ndash;radius and mass&ndash;luminosity diagrams, and look at a real star.`,
      tool: SOLVE(),
    },
  ],
};

/** The deeper steps: quantitative (majors) and advanced (upper-level), after the core steps they hang on. */
export const WEIGHING_THE_STARS_DEEPER = {
  id: 'weighing-the-stars-for-real',
  steps: [
    {
      sid: 'weigh-the-pair',
      after: 'what-fixes-the-tilt',
      depth: 'quantitative',
      type: 'measure',
      title: 'Weigh the pair',
      body: `The panel fits the eclipse light curve and both velocity curves at once, one
             orbit for all three (<em>the F-star pair</em>, synthetic). Read the masses of
             the two stars and the uncertainty of the first, in units of 0.001 solar
             masses.`,
      fields: [
        { id: 'a', label: 'M1', unit: 'solar masses', want: '1.303' },
        { id: 'b', label: 'M2', unit: 'solar masses', want: '1.104' },
        {
          id: 'u',
          label: 'Uncertainty of M1 (in units of 0.001)',
          want: '7.6',
        },
      ],
      validate: v => {
        if (![v.a, v.b, v.u].every(Number.isFinite)) return null;
        if (
          near(v.a, 1.303, 0.012) &&
          near(v.b, 1.104, 0.012) &&
          near(v.u, 7.6, 2.5)
        ) {
          return {
            level: 'ok',
            message:
              'M1 = 1.303 and M2 = 1.104 solar masses, the first known to about 0.008 (0.6 percent). The system was made with 1.30 and 1.10: both are inside one standard deviation of the fit.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “F-star pair” with both velocity curves: M1 is about 1.303, M2 about 1.104 and the uncertainty of M1 about 0.008 solar masses.',
        };
      },
      tool: SOLVE(),
    },
    {
      sid: 'where-the-uncertainty-comes-from',
      after: 'weigh-the-pair',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Where the uncertainty comes from',
      body: `The mass of star 1 is known to 0.6 percent. The panel says the inclination
             carries 0.000 percent of the variance of that mass.`,
      prompt: 'Where does the uncertainty of the masses come from?',
      options: [
        'From the velocities: the eclipse fixes the inclination so well that sin³ i is a constant for the purpose of the masses, and the amplitudes’ errors are what is left',
        'From the eclipse, because a light curve is less precise than a spectrum',
        'From the distance to the stars, which a binary needs for its masses',
        'From limb darkening, which changes the inclination',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'lightcurve',
          option: 1,
          say: 'The light curve fixes the inclination to 0.01 degree here, and near 89 degrees a hundredth of a degree changes sin³ i by a part in a million.',
        },
        {
          id: 'distance',
          option: 2,
          say: 'An eclipsing binary needs no distance for its masses or radii: velocities, a period and an eclipse are enough. That is why these stars are the foundation of stellar astrophysics.',
        },
      ],
      hints: [
        'How much does sin³ i change between 89.2 and 89.21 degrees? Compare that with the 0.3 km/s in each amplitude.',
      ],
      because:
        'The fit carries the covariance of everything through: the inclination’s share of the variance of M1 is a millionth of a percent. The masses’ uncertainty is that of K1 and K2 (0.3 km/s of 46 and 61) and of the period, which is why spending more spectra, not more photometry, improves it.',
      tool: SOLVE(),
    },
    {
      sid: 'one-line-only',
      after: 'where-the-uncertainty-comes-from',
      depth: 'quantitative',
      type: 'measure',
      title: 'One line only',
      body: `Set <em>Stars with a velocity curve</em> to <em>one (single-lined)</em>: only
             the brighter star&rsquo;s lines were measured. The fit now returns the
             <strong>mass function</strong>, f = M2³ sin³ i / (M1 + M2)², and, for the
             primary mass of 1.30 solar masses that you are told, the smallest companion
             that could produce it. Read both.`,
      fields: [
        {
          id: 'f',
          label: 'Mass function',
          unit: 'solar masses',
          want: '0.232',
        },
        {
          id: 'm',
          label: 'Minimum companion mass',
          unit: 'solar masses',
          want: '1.10',
        },
      ],
      validate: v => {
        if (![v.f, v.m].every(Number.isFinite)) return null;
        if (near(v.f, 0.2319, 0.008) && near(v.m, 1.102, 0.04)) {
          return {
            level: 'ok',
            message:
              'f = 0.232 and a companion of at least 1.10 solar masses. The panel gives no mass for either star: one line fixes one combination, and the primary’s mass here is a number you were told, not a measurement, so even the companion is a minimum.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the F-star pair and switch “Stars with a velocity curve” to one: the mass function is about 0.232 and the minimum companion about 1.10 solar masses.',
        };
      },
      tool: SOLVE({ lines: 1 }),
    },
    {
      sid: 'on-the-diagram',
      after: 'one-line-only',
      depth: 'quantitative',
      type: 'measure',
      title: 'On the diagram',
      body: `The mass–radius diagram holds the eight stars of four eclipsing pairs you can
             solve in the previous panel, against the MIST tracks: the lower line is a star at birth on the
             main sequence and the upper one a star at its end. Read the mass
             and the radius of the <strong>lighter star of the hot pair</strong> (system D,
             star 2).`,
      fields: [
        { id: 'm', label: 'Mass', unit: 'solar masses', want: '2.01' },
        { id: 'r', label: 'Radius', unit: 'R☉', want: '1.63' },
      ],
      validate: v => {
        if (![v.m, v.r].every(Number.isFinite)) return null;
        if (near(v.m, 2.006, 0.05) && near(v.r, 1.63, 0.03)) {
          return {
            level: 'ok',
            message:
              'About 2.01 solar masses and 1.63 solar radii. The star sits inside the band: it is a main-sequence star, a little above the zero-age radius for its mass. These stars are synthetic, made from the tracks at a stated point in their lives, so they agree with MIST by construction; a real star might not.',
          };
        }
        return {
          level: 'error',
          message:
            'In the diagram (radius, four systems solved) read system D, star 2: about 2.01 solar masses and 1.63 solar radii.',
        };
      },
      tool: DIAGRAM(),
    },
    {
      sid: 'the-mass-luminosity-slope',
      after: 'on-the-diagram',
      depth: 'quantitative',
      type: 'measure',
      title: 'The mass–luminosity slope',
      body: `Switch the vertical axis to <em>luminosity</em>. Read the luminosity of the
             heavier star of the hot pair (D1, 2.6 solar masses) and of the heavier star of
             the F-star pair (A1, 1.3), then compute the exponent
             <strong>n</strong> in L ∝ M<sup>n</sup> between them:
             n = log(L<sub>D1</sub>/L<sub>A1</sub>) / log(M<sub>D1</sub>/M<sub>A1</sub>).`,
      fields: [
        { id: 'a', label: 'Luminosity of D1', unit: 'L☉', want: '54' },
        { id: 'b', label: 'Luminosity of A1', unit: 'L☉', want: '3.4' },
        { id: 'n', label: 'Exponent n', want: '4.1' },
      ],
      validate: v => {
        if (![v.a, v.b, v.n].every(Number.isFinite)) return null;
        if (
          near(v.a, 53.9, 3) &&
          near(v.b, 3.35, 0.3) &&
          near(v.n, 4.07, 0.3)
        ) {
          return {
            level: 'ok',
            message:
              'About 54 and 3.4 solar luminosities, and an exponent near 4.1: luminosity rises about as the fourth power of the mass in this range, the main-sequence relation. The luminosities rest on star 1’s temperature, which is an input here, and on star 2’s from the fitted surface brightness ratio.',
          };
        }
        return {
          level: 'error',
          message:
            'Read D1 and A1 on the luminosity axis (about 54 and 3.4 solar) and compute the exponent from them: about 4.1.',
        };
      },
      tool: DIAGRAM({ view: 1 }),
    },
  ].concat([
    {
      sid: 'the-tilt-you-did-not-measure',
      after: 'the-mass-luminosity-slope',
      depth: 'advanced',
      type: 'measure',
      title: 'The tilt you did not measure',
      body: `Back in the minimum-mass panel, the pair that never eclipses is in fact tilted by
             <strong>52&deg;</strong> to the line of sight (the truth, which the data do not
             contain). Set the inclination you assume to 52&deg; and read M1 and M2, then
             compute how many times the true mass is the minimum:
             <strong>1 / sin³ i</strong>.`,
      fields: [
        {
          id: 'a',
          label: 'M1 at 52 degrees',
          unit: 'solar masses',
          want: '1.19',
        },
        {
          id: 'b',
          label: 'M2 at 52 degrees',
          unit: 'solar masses',
          want: '0.88',
        },
        { id: 'r', label: 'True mass over minimum mass', want: '2.04' },
      ],
      validate: v => {
        if (![v.a, v.b, v.r].every(Number.isFinite)) return null;
        if (
          near(v.a, 1.19, 0.03) &&
          near(v.b, 0.882, 0.03) &&
          near(v.r, 2.044, 0.05)
        ) {
          return {
            level: 'ok',
            message:
              'At 52 degrees the masses are 1.19 and 0.88 solar masses (the pair was made with 1.2 and 0.9), twice the minimum. A system without an eclipse can be off by a factor of 2 or more and say nothing about it: the minimum is only a lower bound, and the covariance of inclination and mass is what an eclipse removes.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the inclination to 52 degrees: M1 is about 1.19 and M2 about 0.88 solar masses, and 1 / sin³ 52° is about 2.04.',
        };
      },
      tool: MIN({ inc: 52 }),
    },
    {
      sid: 'the-real-star',
      after: 'the-tilt-you-did-not-measure',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A real star: V505 Persei',
      body: `V505 Persei is a real pair of F5 stars that eclipse every 4.22 days. Southworth
             (2021, <em>The Observatory</em> 141, 122) took their velocity amplitudes,
             <strong>89.12</strong> and <strong>90.31 km/s</strong>, from published
             spectra. We ran this chain on the TESS light curve of Sector 18 with those two
             amplitudes: masses of 1.2745 and 1.2577 solar masses, the published
             1.2745 &plusmn; 0.0036 and 1.2577 &plusmn; 0.0030, and radii of
             1.2929 &plusmn; 0.0015 and 1.2679 &plusmn; 0.0015 against the published
             1.2941 &plusmn; 0.0016 and 1.2637 &plusmn; 0.0017. The second star&rsquo;s radius is
             2.4 published standard deviations away; the check allowed 2.`,
      prompt: 'What should you conclude?',
      options: [
        'The chain works on a real star for what it shares with the published analysis, the masses follow from the same amplitudes; the one radius that differs is at the edge of what a simpler light-curve model can claim, and the check is recorded as failed and not adjusted',
        'The method is wrong, because one number is outside two standard deviations',
        'The published radius is wrong, because ours is closer to the data',
        'The masses agree, so the radii must be right as well',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'wrong',
          option: 1,
          say: 'One number at 2.4 standard deviations among five that agree is a result to record, not a verdict on the method; the model here has no reflection effect and fits no out-of-eclipse lines, which the published analysis does.',
        },
        {
          id: 'better',
          option: 2,
          say: 'Neither analysis is known to be closer to the truth: the two use different models of the same light curve, and the published one is the more complete.',
        },
        {
          id: 'transfer',
          option: 3,
          say: 'The masses follow from the same velocity amplitudes and the period, so they agree whatever the light curve says; they say nothing about the radii, which come from the eclipses.',
        },
      ],
      hints: [
        'Which of the five numbers depend on the light curve, and which only on the velocities?',
      ],
      because:
        'The masses and the size of the orbit come from the velocity amplitudes and the period, which are the same in both analyses, so their agreement tests the chain’s arithmetic and constants and not the light curve. The radii come from the eclipses, and the simple two-sphere model used here, with no reflection effect and no fitted out-of-eclipse lines, agrees for one star and falls 2.4 standard deviations from the published value for the other. The validation records this as a failed leg and keeps it failing.',
      tool: SOLVE(),
    },
    {
      sid: 'what-the-chain-leaves-out',
      after: 'the-real-star',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a passed test does not say',
      body: `The joint fit of the F-star pair has a reduced chi-square of 0.94 and no
             correlated noise: it passes its residual test.`,
      prompt: 'What does that say about the masses?',
      options: [
        'That the model describes the data to their error bars; it does not say that the velocities are free of an error the error bars leave out, such as a template mismatch between the two stars’ spectra',
        'That the masses are exact',
        'That the inclination is right',
        'Nothing, because a fit that passes is always wrong',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'exact',
          option: 1,
          say: 'The masses are known to the uncertainty the panel states, 0.6 percent, and only if the error bars are right. A passed test is evidence for the error bars, not a proof.',
        },
        {
          id: 'inclination',
          option: 2,
          say: 'The test looks at the scatter of the residuals. An inclination that is slightly wrong can still pass it: that is why the uncertainty of the inclination is reported separately.',
        },
        {
          id: 'always',
          option: 3,
          say: 'A passed test is what a correct model gives. What it cannot do is reach beyond the data and the error bars it was given.',
        },
      ],
      hints: [
        'The test compares the scatter with the error bars. What if the error bars are too small?',
      ],
      because:
        'A velocity offset between the two stars’ lines (a template mismatch, or the gravitational redshift of a compact star) moves K2 and so both masses, and the panel’s fit can absorb part of it in the systemic velocity. The error bars are the measurers’ and the model has the stars as two spheres on one orbit, so anything it leaves out is in the notes of the model, not in the test. The masses of real double-lined eclipsing binaries are quoted with a few tenths of a percent for these reasons, and only when more than one analysis agrees.',
      tool: SOLVE(),
    },
    {
      sid: 'how-small-is-the-photocentre',
      after: 'what-the-chain-leaves-out',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The ellipse of the light',
      body: `System A is a visual pair whose two stars the telescope cannot separate, so
             all it sees is one point, the <strong>photocentre</strong>, the centre of the
             light. Set <em>What is seen</em> to <em>one photocentre</em>. The fitted orbit of
             that point has a semi-major axis of 0.090 arcseconds; the pair&rsquo;s own orbit,
             drawn in grey from the truth, has 0.300. The companion carries 10 percent of the
             light and 40 percent of the mass.`,
      prompt: 'Why is the photocentre’s ellipse 0.30 of the pair’s?',
      options: [
        'The photocentre sits (l − B) times the separation from the centre of mass, the light fraction minus the mass fraction: 0.10 − 0.40 = −0.30, the same ellipse scaled by 0.30 and turned half a turn',
        'The fit is poor, because the stars are not resolved',
        'The parallax shrinks every orbit by the same factor',
        'The companion is dark, so the photocentre follows only the primary’s own orbit',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'poor',
          option: 1,
          say: 'The fit is good: the orbit is closed and the residuals are at the noise. The ellipse is small because of where the light centre sits, not because of the fit.',
        },
        {
          id: 'parallax',
          option: 2,
          say: 'The parallax converts the angle to a distance; it does not change the shape of the orbit on the sky, and the grey orbit is drawn in the same arcseconds.',
        },
        {
          id: 'dark',
          option: 3,
          say: 'A dark companion would put the photocentre on the primary and give 0.40 of the pair’s orbit, the primary’s own. Here the companion carries a tenth of the light, which moves the centre of light a little way toward it.',
        },
      ],
      hints: [
        'The centre of mass sits 0.40 of the way from the primary to the companion. Where does the centre of light sit?',
      ],
      because:
        'The centre of mass is 0.40 of the way from star 1 to star 2, and the centre of light 0.10 of the way. The photocentre is therefore 0.40 − 0.10 = 0.30 of the separation from the centre of mass, on the primary’s side, and as the pair turns it traces the same ellipse scaled by 0.30. That is the whole contract: the photocentre orbit’s axis is |B − l| times the pair’s, and its mass function is the pair’s mass times |B − l| cubed, not a mass.',
      tool: VISUAL({ view: 1 }),
    },
    {
      sid: 'weigh-a-visual-pair',
      after: 'how-small-is-the-photocentre',
      depth: 'advanced',
      type: 'measure',
      title: 'Weigh a resolved pair',
      body: `Set <em>What is seen</em> to <em>both stars resolved</em> (system A, a parallax
             signal-to-noise of 20). Each star&rsquo;s own motion about the moving centre of
             mass gives the <strong>mass fraction</strong> of star 2, and the orbit with the
             parallax gives the <strong>mass sum</strong>. Read both.`,
      fields: [
        { id: 'b', label: 'Mass fraction of star 2', want: '0.400' },
        { id: 's', label: 'Mass sum', unit: 'solar masses', want: '1.31' },
      ],
      validate: v => {
        if (![v.b, v.s].every(Number.isFinite)) return null;
        if (near(v.b, 0.4004, 0.012) && near(v.s, 1.309, 0.1)) {
          return {
            level: 'ok',
            message:
              'B = 0.400 and a sum of 1.31 solar masses, so M1 = 0.79 and M2 = 0.52. The pair was made with 0.90 and 0.60 (sum 1.50, B 0.400): the fraction is known to a few thousandths because it comes from the shapes of the two ellipses, and the sum to about 15 percent because it carries the cube of the parallax, 5 percent here.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose system A with both stars resolved and a signal-to-noise of 20: B is about 0.400 and the mass sum about 1.31 solar masses.',
        };
      },
      tool: VISUAL(),
    },
    {
      sid: 'two-roots-for-the-companion',
      after: 'weigh-a-visual-pair',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Two companions fit one orbit',
      body: `System B has two nearly equal stars, and the telescope sees one photocentre.
             The panel&rsquo;s photocentre orbit is tiny, 0.031 arcseconds against the
             pair&rsquo;s 0.410, and with the light fraction (0.40) and the primary&rsquo;s mass
             (1.10) you state, it lists <strong>two</strong> companion masses, 0.98 and 0.53
             solar masses.`,
      prompt: 'Why two, and what would choose between them?',
      options: [
        'The orbit fixes |B − l| and not its sign: the companion may carry more of the mass than of the light (0.98) or less (0.53); a resolved orbit, a mass ratio from radial velocities, or knowing that the fainter star is also the lighter one would choose',
        'A longer arc of the same photocentre orbit would choose',
        'A more precise parallax would choose',
        'One root is a rounding error of the solver',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'arc',
          option: 1,
          say: 'A longer arc sharpens the same ellipse; both roots stay, because the half turn the other sign would add is the node ambiguity every sky orbit has.',
        },
        {
          id: 'parallax',
          option: 2,
          say: 'A better parallax narrows each root’s interval and leaves both roots in place: the ambiguity is in the sign of l − B, not in the size of the orbit.',
        },
        {
          id: 'solver',
          option: 3,
          say: 'Both roots solve the same equation, M1 |B − l|³ / (1 − B) = f, one with B above l and one with B below; the module returns both and flags the second as ambiguous.',
        },
      ],
      hints: [
        'The photocentre ellipse is scaled by l − B. What happens to the orbit when that number changes sign?',
      ],
      because:
        'The photocentre orbit with a parallax fixes the mass function f = (M1 + M2) |B − l|³ and the sign of l − B only turns the ellipse by half a turn, which a sky orbit cannot tell from the orbit’s own node. For this pair the true companion (1.00 solar masses, B = 0.476) is the first root; a companion lighter than its share of the light would be the second. Which one holds is an extra fact, and the panel does not guess it.',
      tool: VISUAL({ system: 1, view: 1 }),
    },
  ]),
};

export const WEIGHING_THE_STARS_ES = {
  title: 'Pesar las estrellas, de verdad',
  subtitle:
    'Pesa dos estrellas con el efecto Doppler de su luz y un eclipse, mira por qué las velocidades solas dan solo un mínimo y coloca las estrellas que pesaste en el diagrama masa-radio',
  objectives: [
    'Decir que la estrella con la menor amplitud de velocidad es la más pesada, y leer el cociente de masas a partir de dos amplitudes',
    'Decir por qué las velocidades solas dan solo una masa mínima y qué añade el eclipse',
    'Leer las masas y los radios de un par eclipsante con sus incertidumbres, y decir de dónde viene la incertidumbre',
    'Decir qué da una sola línea (la función de masa) y qué no da (una masa)',
  ],
  steps: [
    {
      title: 'Dos estrellas, un centro',
      body: 'Dos estrellas giran en torno al punto que queda quieto entre ellas, su <strong>centro de masas</strong>. La luz de cada estrella se desplaza por el efecto Doppler al acercarse y alejarse de nosotros: las curvas del panel son las velocidades de las dos estrellas a lo largo de la visual frente a la fase de la órbita, a partir de un espectro de dos líneas, con una velocidad medida de cada estrella cada noche. Cuando la estrella 1 se aleja, la 2 se acerca.\n\nLas estrellas son un modelo, los datos son sintéticos y el panel lo dice. Lo que las curvas pueden y no pueden decir de las masas es esta investigación.',
    },
    {
      title: '¿Quién se mueve más deprisa?',
      body: 'El centro de masas está entre las estrellas, más cerca de una de ellas. Antes de leer las curvas, decide cuál de las dos oscila con mayor velocidad.',
      prompt: 'La estrella con mayor amplitud de velocidad es&hellip;',
      options: [
        'La más ligera, porque el centro de masas está más cerca de la más pesada y la ligera tiene que recorrer más en el mismo tiempo',
        'La más pesada, porque tiene más energía con que moverse',
        'Ninguna: la gravedad es mutua, así que las dos se mueven siempre igual de deprisa',
        'La más brillante, porque el brillo mide la velocidad',
      ],
      hints: [
        'Las dos estrellas completan una órbita en el mismo tiempo. La que tiene el círculo mayor tiene que ir más deprisa.',
      ],
      because:
        'Las dos estrellas giran en torno a su centro de masas en el mismo tiempo. El centro está más cerca de la más pesada, que recorre el círculo menor, y la más ligera el mayor, lo que exige más velocidad. En números, las masas son inversamente proporcionales a las amplitudes de velocidad: M1 K1 = M2 K2. Las fuerzas son iguales y opuestas, y también los momentos; las velocidades no son iguales, porque la estrella más ligera necesita más velocidad para el mismo momento.',
    },
    {
      title: 'Lee las amplitudes',
      body: 'El panel ajusta una órbita a las velocidades de las dos estrellas. Lee la <strong>semiamplitud</strong> de cada curva, K1 para la estrella 1 y K2 para la estrella 2, en km/s: la mitad de la distancia entre la velocidad más alta y la más baja.',
      fields: [{ label: 'K1 (estrella 1)' }, { label: 'K2 (estrella 2)' }],
    },
    {
      title: 'El cociente de masas',
      body: 'Las amplitudes son K1 = 45,2 y K2 = 61,0 km/s.',
      prompt: '¿Cuánto vale el cociente de masas M2 / M1?',
      options: [
        'K1 / K2 = 0,74: la estrella 2 pesa unos tres cuartos de la estrella 1',
        'K2 / K1 = 1,35: la estrella 2 es más pesada',
        'Unos 0,55, el cuadrado de K1 / K2, porque la gravedad es una ley del inverso del cuadrado',
        'No se puede decir sin la inclinación',
      ],
      hints: ['Momentos iguales: M1 K1 = M2 K2. Despeja M2 / M1.'],
      because:
        'El centro de masas no se mueve, así que los momentos de las estrellas son iguales y opuestos: M1 K1 = M2 K2, y M2 / M1 = K1 / K2 = 0,74. La inclinación de la órbita reduce las dos amplitudes en el mismo factor, sen i, que se cancela en el cociente: el cociente de masas de un par de dos líneas no necesita la inclinación.',
      misconceptions: [
        {
          say: 'Es el cociente al revés. La estrella que oscila más deprisa es la más ligera, así que su masa es la menor.',
        },
        {
          say: 'Aquí nada se eleva al cuadrado: los momentos son iguales, y el momento es masa por velocidad.',
        },
        {
          say: 'La inclinación reduce las dos amplitudes en el mismo factor, que se cancela en su cociente. Las masas mismas necesitan la inclinación; el cociente no.',
        },
      ],
    },
    {
      title: 'Una masa, o solo un límite',
      body: 'Las dos amplitudes y el periodo dan el tamaño de la órbita por <strong>sen i</strong> y, con la tercera ley de Kepler, las masas por <strong>sen³ i</strong>: con i = 90&deg;, de canto, 0,582 y 0,432 masas solares. La inclinación <em>i</em> de la órbita no está en las velocidades. Pon la inclinación que supones en <strong>60&deg;</strong> y lee qué serían las masas.',
      fields: [
        { label: 'Masa de la estrella 1 a 60 grados' },
        { label: 'Masa de la estrella 2 a 60 grados' },
      ],
    },
    {
      title: 'Qué fija la inclinación',
      body: 'Ahora hay un par que se eclipsa en el panel: el mismo tipo de órbita, con la curva de luz junto a las curvas de velocidad.',
      prompt: '¿Por qué nos dice la inclinación un eclipse?',
      options: [
        'Las estrellas solo pasan una delante de la otra si la órbita se ve casi de canto, y la forma del eclipse dice cuánto de cerca',
        'Un eclipse hace más brillantes las estrellas, y el brillo mide la inclinación',
        'Un eclipse alarga el periodo, lo que da la inclinación',
        'No lo dice: la inclinación solo puede venir de más velocidades',
      ],
      because:
        'Para que las estrellas se eclipsen, la órbita debe verse casi de canto. La profundidad y la duración de un eclipse dependen de la inclinación con una precisión de menos de una centésima de grado, y con i conocida las masas ya no son valores mínimos: M = M sen³ i / sen³ i, y sen i es casi 1.',
      misconceptions: [
        {
          say: 'Un eclipse quita luz, y lo que fija la geometría es la forma de lo perdido, no solo su cantidad.',
        },
        {
          say: 'Más velocidades de la misma órbita reducen el mismo sen i; no pueden separarlo de las masas. La curva de luz es otro tipo de medida.',
        },
      ],
    },
    {
      title: 'Lo que da el par y lo que deja abierto',
      body: 'Las dos amplitudes dieron la <strong>razón de masas</strong> y las velocidades solas dieron solo <strong>masas mínimas</strong>. El eclipse añadió la inclinación y, con ella, las masas mismas y los radios, cada uno con la incertidumbre que arrastra todo el ajuste. Quita el eclipse, o una de las dos líneas, y la respuesta vuelve a ser un mínimo o una función de masa. \n\nLos niveles más profundos pesan el par con sus incertidumbres, sitúan las estrellas en los diagramas masa-radio y masa-luminosidad, y miran una estrella real.',
    },
  ],
};

export const WEIGHING_THE_STARS_DEEPER_ES = {
  steps: [
    {
      title: 'Pesa el par',
      body: 'El panel ajusta a la vez la curva de luz del eclipse y las dos curvas de velocidad, con una sola órbita para las tres (<em>el par de estrellas F</em>, sintético). Lee las masas de las dos estrellas y la incertidumbre de la primera, en unidades de 0,001 masas solares.',
      fields: [
        { label: 'M1' },
        { label: 'M2' },
        { label: 'Incertidumbre de M1 (en unidades de 0,001)' },
      ],
    },
    {
      title: 'De dónde viene la incertidumbre',
      body: 'La masa de la estrella 1 se conoce al 0,6 por ciento. El panel dice que la inclinación aporta el 0,000 por ciento de la varianza de esa masa.',
      prompt: '¿De dónde viene la incertidumbre de las masas?',
      options: [
        'De las velocidades: el eclipse fija la inclinación tan bien que sen³ i es una constante para las masas, y lo que queda son los errores de las amplitudes',
        'Del eclipse, porque una curva de luz es menos precisa que un espectro',
        'De la distancia a las estrellas, que una binaria necesita para sus masas',
        'Del oscurecimiento del limbo, que cambia la inclinación',
      ],
      misconceptions: [
        {
          say: 'La curva de luz fija aquí la inclinación a 0,01 grados, y cerca de 89 grados una centésima de grado cambia sen³ i en una parte por millón.',
        },
        {
          say: 'Una binaria eclipsante no necesita distancia para sus masas ni sus radios: bastan velocidades, un periodo y un eclipse. Por eso estas estrellas son el cimiento de la astrofísica estelar.',
        },
      ],
      hints: [
        '¿Cuánto cambia sen³ i entre 89,2 y 89,21 grados? Compáralo con los 0,3 km/s de cada amplitud.',
      ],
      because:
        'El ajuste arrastra la covarianza de todo: la parte de la varianza de M1 que corresponde a la inclinación es una millonésima de un por ciento. La incertidumbre de las masas es la de K1 y K2 (0,3 km/s de 46 y 61) y la del periodo, por eso mejoran con más espectros, no con más fotometría.',
    },
    {
      title: 'Una sola línea',
      body: 'Pon <em>Estrellas con curva de velocidad</em> en <em>una (de una sola línea)</em>: solo se midieron las líneas de la estrella más brillante. El ajuste devuelve ahora la <strong>función de masa</strong>, f = M2³ sen³ i / (M1 + M2)², y, para la masa primaria de 1,30 masas solares que te dan, el menor compañero que podría producirla. Lee ambas.',
      fields: [
        { label: 'Función de masa' },
        { label: 'Masa mínima del compañero' },
      ],
    },
    {
      title: 'En el diagrama',
      body: 'El diagrama masa-radio contiene las ocho estrellas de los cuatro pares eclipsantes que puedes resolver en el panel anterior, frente a las trayectorias MIST: la línea inferior es una estrella recién nacida en la secuencia principal y la superior una en su final. Lee la masa y el radio de la <strong>estrella más ligera del par caliente</strong> (sistema D, estrella 2).',
      fields: [{ label: 'Masa' }, { label: 'Radio' }],
    },
    {
      title: 'La pendiente masa-luminosidad',
      body: 'Cambia el eje vertical a <em>luminosidad</em>. Lee la luminosidad de la estrella más pesada del par caliente (D1, 2,6 masas solares) y de la más pesada del par de estrellas F (A1, 1,3), y calcula el exponente <strong>n</strong> de L ∝ M<sup>n</sup> entre ellas: n = log(L<sub>D1</sub>/L<sub>A1</sub>) / log(M<sub>D1</sub>/M<sub>A1</sub>).',
      fields: [
        { label: 'Luminosidad de D1' },
        { label: 'Luminosidad de A1' },
        { label: 'Exponente n' },
      ],
    },
    {
      title: 'La inclinación que no mediste',
      body: 'De vuelta en el panel de masas mínimas, el par que nunca se eclipsa está en realidad inclinado <strong>52&deg;</strong> respecto de la visual (la verdad, que los datos no contienen). Pon la inclinación que supones en 52&deg; y lee M1 y M2, y calcula cuántas veces es la masa verdadera la mínima: <strong>1 / sen³ i</strong>.',
      fields: [
        { label: 'M1 a 52 grados' },
        { label: 'M2 a 52 grados' },
        { label: 'Masa verdadera sobre masa mínima' },
      ],
    },
    {
      title: 'Una estrella real: V505 Persei',
      body: 'V505 Persei es un par real de estrellas F5 que se eclipsan cada 4,22 días. Southworth (2021, <em>The Observatory</em> 141, 122) tomó sus amplitudes de velocidad, <strong>89,12</strong> y <strong>90,31 km/s</strong>, de espectros publicados. Hicimos correr esta cadena sobre la curva de luz de TESS del sector 18 con esas dos amplitudes: masas de 1,2745 y 1,2577 masas solares, las publicadas 1,2745 &plusmn; 0,0036 y 1,2577 &plusmn; 0,0030, y radios de 1,2929 &plusmn; 0,0015 y 1,2679 &plusmn; 0,0015 frente a los publicados 1,2941 &plusmn; 0,0016 y 1,2637 &plusmn; 0,0017. El radio de la segunda estrella está a 2,4 desviaciones típicas publicadas; la prueba admitía 2.',
      prompt: '¿Qué debes concluir?',
      options: [
        'La cadena funciona en una estrella real en lo que comparte con el análisis publicado, las masas salen de las mismas amplitudes; el único radio que difiere está en el borde de lo que un modelo de curva de luz más simple puede afirmar, y la prueba se registra como fallida y no se ajusta',
        'El método es erróneo, porque un número queda fuera de dos desviaciones típicas',
        'El radio publicado es erróneo, porque el nuestro está más cerca de los datos',
        'Las masas coinciden, así que los radios también deben ser correctos',
      ],
      misconceptions: [
        {
          say: 'Un número a 2,4 desviaciones típicas entre cinco que coinciden es un resultado que registrar, no un veredicto sobre el método; el modelo de aquí no tiene efecto de reflexión ni ajusta líneas fuera del eclipse, que el análisis publicado sí.',
        },
        {
          say: 'No se sabe que ninguno de los dos análisis esté más cerca de la verdad: usan modelos distintos de la misma curva de luz, y el publicado es el más completo.',
        },
        {
          say: 'Las masas salen de las mismas amplitudes de velocidad y del periodo, así que coinciden diga lo que diga la curva de luz; no dicen nada de los radios, que salen de los eclipses.',
        },
      ],
      hints: [
        '¿Cuáles de los cinco números dependen de la curva de luz y cuáles solo de las velocidades?',
      ],
      because:
        'Las masas y el tamaño de la órbita salen de las amplitudes de velocidad y del periodo, que son los mismos en los dos análisis, así que su coincidencia comprueba la aritmética y las constantes de la cadena y no la curva de luz. Los radios salen de los eclipses, y el modelo simple de dos esferas usado aquí, sin efecto de reflexión ni líneas ajustadas fuera del eclipse, coincide para una estrella y queda a 2,4 desviaciones típicas del valor publicado para la otra. La validación lo registra como una prueba fallida y la mantiene fallida.',
    },
    {
      title: 'Lo que una prueba superada no dice',
      body: 'El ajuste conjunto del par de estrellas F tiene un chi-cuadrado reducido de 0,94 y ningún ruido correlacionado: supera la prueba de los residuos.',
      prompt: '¿Qué dice eso de las masas?',
      options: [
        'Que el modelo describe los datos hasta sus barras de error; no dice que las velocidades estén libres de un error que las barras de error omiten, como un desajuste de plantilla entre los espectros de las dos estrellas',
        'Que las masas son exactas',
        'Que la inclinación es la correcta',
        'Nada, porque un ajuste que pasa siempre está mal',
      ],
      misconceptions: [
        {
          say: 'Las masas se conocen con la incertidumbre que da el panel, un 0,6 por ciento, y solo si las barras de error son correctas. Una prueba superada es evidencia a favor de las barras de error, no una demostración.',
        },
        {
          say: 'La prueba mira la dispersión de los residuos. Una inclinación ligeramente errónea puede superarla: por eso la incertidumbre de la inclinación se da aparte.',
        },
        {
          say: 'Una prueba superada es lo que da un modelo correcto. Lo que no puede es ir más allá de los datos y de las barras de error que se le dieron.',
        },
      ],
      hints: [
        'La prueba compara la dispersión con las barras de error. ¿Y si las barras de error son demasiado pequeñas?',
      ],
      because:
        'Un desplazamiento de velocidad entre las líneas de las dos estrellas (un desajuste de plantilla, o el corrimiento al rojo gravitacional de una estrella compacta) mueve K2 y con ella las dos masas, y el ajuste puede absorber parte en la velocidad sistémica. Las barras de error son de quien midió y el modelo tiene las estrellas como dos esferas en una órbita, así que lo que omite está en las notas del modelo, no en la prueba. Las masas de las binarias eclipsantes de dos líneas reales se dan con unas pocas décimas por ciento por estos motivos, y solo cuando coinciden varios análisis.',
    },
    {
      title: 'La elipse de la luz',
      body: 'El sistema A es un par visual cuyas dos estrellas el telescopio no puede separar, así que solo ve un punto, el <strong>fotocentro</strong>, el centro de la luz. Pon <em>Lo que se ve</em> en <em>un fotocentro</em>. La órbita ajustada de ese punto tiene un semieje mayor de 0,090 segundos de arco; la órbita propia del par, dibujada en gris desde la verdad, tiene 0,300. El compañero lleva el 10 por ciento de la luz y el 40 por ciento de la masa.',
      prompt: '¿Por qué la elipse del fotocentro es 0,30 de la del par?',
      options: [
        'El fotocentro está a (l − B) veces la separación del centro de masas, la fracción de luz menos la fracción de masa: 0,10 − 0,40 = −0,30, la misma elipse reducida por 0,30 y girada media vuelta',
        'El ajuste es malo, porque las estrellas no están resueltas',
        'El paralaje reduce todas las órbitas en el mismo factor',
        'El compañero es oscuro, así que el fotocentro sigue solo la órbita propia de la primaria',
      ],
      misconceptions: [
        {
          say: 'El ajuste es bueno: la órbita es cerrada y los residuos están al nivel del ruido. La elipse es pequeña por dónde está el centro de la luz, no por el ajuste.',
        },
        {
          say: 'El paralaje convierte el ángulo en una distancia; no cambia la forma de la órbita en el cielo, y la órbita gris está dibujada en los mismos segundos de arco.',
        },
        {
          say: 'Un compañero oscuro pondría el fotocentro sobre la primaria y daría 0,40 de la órbita del par, la propia de la primaria. Aquí el compañero lleva una décima de la luz, que mueve un poco el centro de la luz hacia él.',
        },
      ],
      hints: [
        'El centro de masas está a 0,40 del camino de la primaria al compañero. ¿Dónde está el centro de la luz?',
      ],
      because:
        'El centro de masas está a 0,40 del camino de la estrella 1 a la estrella 2, y el centro de la luz a 0,10. El fotocentro está pues a 0,40 − 0,10 = 0,30 de la separación del centro de masas, del lado de la primaria, y al girar el par traza la misma elipse reducida por 0,30. Ese es todo el contrato: el eje de la órbita del fotocentro es |B − l| veces el del par, y su función de masa es la masa del par por |B − l| al cubo, no una masa.',
    },
    {
      title: 'Pesa un par resuelto',
      body: 'Pon <em>Lo que se ve</em> en <em>dos resueltas</em> (sistema A, una señal a ruido del paralaje de 20). El movimiento propio de cada estrella alrededor del centro de masas en movimiento da la <strong>fracción de masa</strong> de la estrella 2, y la órbita con el paralaje da la <strong>suma de masas</strong>. Lee las dos.',
      fields: [
        { label: 'Fracción de masa de la estrella 2' },
        { label: 'Suma de masas' },
      ],
    },
    {
      title: 'Dos compañeros ajustan una órbita',
      body: 'El sistema B tiene dos estrellas casi iguales, y el telescopio ve un solo fotocentro. La órbita del fotocentro en el panel es diminuta, 0,031 segundos de arco frente a los 0,410 del par, y con la fracción de luz (0,40) y la masa de la primaria (1,10) que usted declara, lista <strong>dos</strong> masas del compañero, 0,98 y 0,53 masas solares.',
      prompt: '¿Por qué dos, y qué elegiría entre ellas?',
      options: [
        'La órbita fija |B − l| y no su signo: el compañero puede llevar más de la masa que de la luz (0,98) o menos (0,53); elegiría una órbita resuelta, una razón de masas de las velocidades radiales, o saber que la estrella más débil es también la más ligera',
        'Un arco más largo de la misma órbita del fotocentro elegiría',
        'Un paralaje más preciso elegiría',
        'Una raíz es un error de redondeo del solucionador',
      ],
      misconceptions: [
        {
          say: 'Un arco más largo afina la misma elipse; las dos raíces siguen, porque la media vuelta que añadiría el otro signo es la ambigüedad del nodo que tiene toda órbita en el cielo.',
        },
        {
          say: 'Un mejor paralaje estrecha el intervalo de cada raíz y deja las dos raíces: la ambigüedad está en el signo de l − B, no en el tamaño de la órbita.',
        },
        {
          say: 'Las dos raíces resuelven la misma ecuación, M1 |B − l|³ / (1 − B) = f, una con B por encima de l y otra con B por debajo; el módulo devuelve las dos y marca la segunda como ambigua.',
        },
      ],
      hints: [
        'La elipse del fotocentro se reduce por l − B. ¿Qué le pasa a la órbita cuando ese número cambia de signo?',
      ],
      because:
        'La órbita del fotocentro con un paralaje fija la función de masa f = (M1 + M2) |B − l|³ y el signo de l − B solo gira la elipse media vuelta, que una órbita en el cielo no distingue del nodo de la propia órbita. En este par el compañero verdadero (1,00 masas solares, B = 0,476) es la primera raíz; un compañero más ligero que su parte de la luz sería la segunda. Cuál vale es un dato más, y el panel no lo adivina.',
    },
  ],
};

const CONTENT = {
  'weighing-the-stars-for-real': {
    topic:
      'How two Doppler curves and an eclipse weigh two stars: the star with the smaller amplitude is the heavier (M1 K1 = M2 K2), the mass ratio needs no inclination, the masses of a pair that never eclipses are only minima (0.582 and 0.432 solar masses at 90 degrees, twice that at 52), an eclipse fixes the inclination and with it the masses and radii (1.303 and 1.104 solar masses, 1.296 and 1.036 solar radii for the synthetic F-star pair), a single line gives a mass function and not a mass, and the stars solved so far sit in the MIST main-sequence band, with luminosity rising about as the fourth power of the mass.',
    difficulty:
      'Introductory (mass ratio from two amplitudes, minimum masses, what an eclipse adds); majors (the joint solution, where the uncertainty comes from, one line only, the diagram); advanced (the factor 1 / sin³ i without an eclipse, what a passed test leaves open, and the visual pair: the photocentre’s ellipse, a resolved pair’s mass fraction and sum, and the two roots of a companion’s mass)',
    placement:
      'In a survey course after the unit on binary stars and Kepler’s third law, or beside the investigation Two Stars Eclipsing, which supplies the light curve half; in a majors course after the exoplanet radial-velocity investigations, since the velocity fit is the same orbit with a second star. It supports OpenStax Astronomy 2e chapter 18 (the stars: a celestial census). It needs no mathematics beyond a ratio at the survey depth.',
    overview:
      'Students predict which star of a binary moves faster and read K1 = 45.2 and K2 = 61.0 km/s, say that the mass ratio is K1 / K2 = 0.74 with no inclination, see the minimum masses (0.582 and 0.432) become 0.90 and 0.66 at 60 degrees, and say that an eclipse fixes the tilt; at depth they read the joint solution of an eclipsing pair (1.303 and 1.104 solar masses, the first to 0.6 percent), say that the inclination carries almost none of the uncertainty, see that one velocity curve gives a mass function of 0.232 and no mass, place four pairs on the mass–radius and mass–luminosity diagrams against MIST (a slope near 4.1), and meet a pair tilted at 52 degrees whose masses are twice the minimum.',
    priorKnowledge: [
      'A velocity along the line of sight from the Doppler shift of a line, and the sign (positive away from us)',
      'The idea of a center of mass and Kepler’s third law at the level of a ratio',
      'What an eclipsing binary’s light curve shows (the investigation Two Stars Eclipsing)',
    ],
    keyConcepts: [
      {
        heading: 'The mass ratio comes from two velocities',
        body: 'The center of mass does not move, so M1 K1 = M2 K2. The tilt of the orbit scales both amplitudes by sin i and cancels in the ratio.',
      },
      {
        heading: 'Velocities alone give a minimum mass',
        body: 'The amplitudes and the period fix the orbit’s size times sin i and the masses times sin³ i. Without the inclination every mass is a lower bound, and a pair seen at 52 degrees has masses twice the minimum.',
      },
      {
        heading: 'An eclipse supplies the inclination and the radii',
        body: 'The light curve gives the inclination to a hundredth of a degree and the radii as fractions of the orbit; the velocities give the orbit in solar radii. Together they weigh and measure the stars with no distance needed.',
      },
    ],
    features: [
      {
        name: 'The mass panels (masses-minimum, masses-solve and masses-diagram)',
        text: 'The velocity curves of a pair that does not eclipse with the minimum masses and what they would be at a chosen inclination, and of a single-lined orbit with its mass function; the joint fit of the light curve and both velocity curves of an eclipsing pair with every mass, radius and uncertainty or the words “not constrained”; and the solved stars against the MIST tracks, as radius or luminosity.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the joint solution, where the uncertainty comes from, one line only, the diagram and the mass–luminosity slope. Advanced: the factor 1 / sin³ i of a pair that never eclipses, what a passed residual test does not say, and the visual pair (the photocentre’s ellipse, the mass fraction and sum of a resolved pair, the two roots of a companion’s mass).',
      },
      {
        name: 'The visual pair (masses-visual, advanced depth)',
        text: 'A visual pair weighed from its orbit on the sky: with both stars resolved, the mass fraction from each star’s own motion and the mass sum from the parallax; with one photocentre, only a mass function, because the photocentre traces the pair’s ellipse scaled by (l − B), and a companion’s mass from a light fraction and a primary mass you state, with two roots.',
      },
      {
        name: 'Synthetic data, stated',
        text: 'Every system is made by the forward models with a seeded noise draw; the truth is shown when asked, and the radii and temperatures were read from the MIST tracks at a stated point in each star’s life, so the stars agree with the tracks by construction.',
      },
    ],
    misconceptions: [
      {
        claim: 'The heavier star moves faster.',
        response:
          'The lighter star is on the larger circle about the center of mass and so has the larger amplitude: M1 K1 = M2 K2.',
      },
      {
        claim: 'Two velocity curves give the masses.',
        response:
          'They give the mass ratio, and the masses times sin³ i. The inclination is a separate measurement, and for a system that never eclipses it is missing.',
      },
      {
        claim: 'A binary needs a distance to be weighed.',
        response:
          'An eclipsing double-lined binary is weighed and measured with no distance: velocities, the period and the eclipse are enough, and the distance then follows. That is why such stars anchor the mass–luminosity relation.',
      },
      {
        claim: 'A single spectral line is enough to weigh the companion.',
        response:
          'One line fixes the mass function, a combination of both masses and the tilt. A mass follows only with a primary mass you supply, and then it is a minimum for it.',
      },
    ],
    teachingNotes: [
      'The data are synthetic and the truth is stated: the F-star pair was made with 1.30 and 1.10 solar masses, 1.296 and 1.035 solar radii, inclination 89.2 degrees; the fit returns 1.303 and 1.104 solar masses, 1.296 and 1.036 solar radii.',
      'The chain is validated against a direct integration of the two-body problem, an independent joint fit and ensembles for coverage, and the model refuses to call a minimum a mass (BINARY_MASSES.md). Two legs of its committed contract are recorded as failing there, and the model page says so.',
      'The temperature of star 1 is an input stated in the panel and star 2’s follows from the fitted surface brightness ratio in the 0.8 micrometer band by a Planck ratio; the luminosities are as good as that approximation, and no temperature is fitted.',
      'Inherited limits: the stars are two spheres with fixed limb darkening and no third light, the velocities are taken as given, and the visual-binary steps of the advanced depth use synthetic sky orbits with a stated parallax and frame, no common-mode frame error and no third body (BINARY_MASSES.md, Part B).',
    ],
    discussion: [
      'A radial-velocity survey finds a single-lined binary with a mass function of 0.036 solar masses. What can you say about the companion, and what must you assume to say more?',
      'Why does an eclipsing binary need no distance to be weighed, and what does it give you when you add one?',
      'The luminosity of star 2 rests on a surface brightness ratio and a Planck approximation. Which of the diagram’s points would you trust least, and why?',
    ],
    extensions: [
      'Solve the eccentric pair and say how the velocity curves differ from a circular one, and which parameters in the panel carry that.',
      'Set the inclination you assume in the single-lined panel to 70 degrees and say what companion mass results; compare with 90.',
    ],
    modelNotes:
      'js/inference/binaryMasses.js (the chain from amplitudes to masses and radii), js/inference/binaryJoint.js (the spectroscopic and the joint models), js/massesField.js, js/massesWidgets.js, BINARY_MASSES.md.',
  },
};

const FLOW = {
  'weighing-the-stars-for-real': [
    {
      from: 'two-stars-one-center',
      to: 'who-moves-faster',
      text: 'Two stars about one center, and the prediction of which swings faster before the panel shows it.',
    },
    {
      from: 'read-the-amplitudes',
      to: 'the-mass-ratio',
      text: 'The two amplitudes read from the panel and the mass ratio they give with no inclination.',
    },
    {
      from: 'a-mass-or-a-limit',
      to: 'a-mass-or-a-limit',
      text: 'The minimum masses and what they become at a tilt: velocities alone give a limit.',
    },
    {
      from: 'what-fixes-the-tilt',
      to: 'what-the-pair-gives',
      text: 'What an eclipse adds: the inclination, and with it the masses and the radii; and what the pair still leaves open.',
    },
  ],
};

const EXPECTATIONS = {
  'weighing-the-stars-for-real': {
    'read-the-amplitudes':
      'K1 about 45.2 km/s and K2 about 61.0 km/s (within 1.2), with the panel’s default system.',
    'a-mass-or-a-limit':
      'At 60 degrees M1 about 0.90 and M2 about 0.66 solar masses (within 0.03).',
  },
};

const BANDS = {
  'weighing-the-stars-for-real': {
    core: 'medium',
    quantitative: 'long',
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
  'weighing-the-stars-for-real': WEIGHING_THE_STARS_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'weighing-the-stars-for-real': WEIGHING_THE_STARS_DEEPER,
};
export const DEPTH_ES = {
  'weighing-the-stars-for-real': WEIGHING_THE_STARS_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WEIGHING_THE_STARS];
