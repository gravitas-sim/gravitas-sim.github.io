// =============================================================================
// The atmosphere investigations, deeper (Prompt 200)
// -----------------------------------------------------------------------------
// The deeper steps of "Why Venus Is Hot" and "Two Greenhouse Models" and their
// instructor content, in a module of its own (D-R10-81; see
// ../atmosphere-sequence.js). The same instruments. Every expected value is
// recomputed (tests/atmosphereLessons.test.js).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const BAL = (values = {}, hide = []) => ({
  id: 'atmosphere-balance',
  values,
  hide,
});
const GRN = (values = {}, hide = []) => ({
  id: 'atmosphere-greenhouse',
  values,
  hide,
});
const SCL = (values = {}, hide = []) => ({
  id: 'atmosphere-scale',
  values,
  hide,
});

// -----------------------------------------------------------------------------
// Why Venus Is Hot: the deeper steps.
// -----------------------------------------------------------------------------
export const WHY_VENUS_IS_HOT_DEEPER = {
  id: 'why-venus-is-hot',
  steps: [
    {
      sid: 'earth-without-clouds',
      after: 'what-the-gap-says',
      depth: 'quantitative',
      type: 'measure',
      title: 'Earth with no albedo',
      body: `The Bond albedo sets how much sunlight a planet absorbs. Set the planet to
             <strong>Earth</strong>, switch the albedo to <strong>my own</strong> and set it to
             <strong>0</strong>: a planet that absorbs everything. Read the new equilibrium
             temperature and how much warmer it is than with Earth&rsquo;s own albedo, 254 K.`,
      fields: [
        {
          id: 'teq',
          label: 'Earth’s equilibrium temperature with albedo 0',
          unit: 'K',
          hint: '278.3',
        },
        {
          id: 'rise',
          label: 'How much warmer than with its own albedo',
          unit: 'K',
          hint: '24.3',
        },
      ],
      validate: v => {
        if (![v.teq, v.rise].every(Number.isFinite)) return null;
        if (near(v.teq, 278.3, 0.7) && near(v.rise, 24.3, 1)) {
          return {
            level: 'ok',
            message:
              '278.3 K, 24.3 K warmer. The temperature goes as the fourth root of the absorbed sunlight, so removing the 30.6 percent that Earth reflects warms it by less than 10 percent. Even a perfectly absorbing Earth would sit 10 K below its measured 288 K: the albedo cannot replace the greenhouse.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1), set “Albedo” to “my own”, set “My Bond albedo” to 0 and read “Equilibrium temperature”.',
        };
      },
      tool: BAL({ body: 1, own: 0, albedo: 0 }),
    },
    {
      sid: 'how-thick-is-venus',
      after: 'gray-depth-for-venus',
      depth: 'advanced',
      type: 'measure',
      title: 'How quickly does the air thin out?',
      body: `In an isothermal atmosphere the pressure falls by the same factor, 1/e or about
             37 percent, over every <strong>scale height</strong>
             <em>H</em> = <em>kT</em>/(<em>μm</em><sub>u</sub><em>g</em>). It is not the thickness
             of the atmosphere: there is no top. Read the scale height of
             <strong>Venus</strong> at its surface temperature, and of <strong>Earth</strong>.`,
      fields: [
        {
          id: 'venus',
          label: 'Venus’s scale height',
          unit: 'km',
          hint: '15.9',
        },
        {
          id: 'earth',
          label: 'Earth’s scale height',
          unit: 'km',
          hint: '8.4',
        },
      ],
      validate: v => {
        if (![v.venus, v.earth].every(Number.isFinite)) return null;
        if (near(v.venus, 15.9, 0.2) && near(v.earth, 8.43, 0.15)) {
          return {
            level: 'ok',
            message:
              '15.9 km for Venus and 8.4 km for Earth. Venus’s air is hotter, which raises H, and heavier (carbon dioxide against nitrogen and oxygen), which lowers it; the net is a scale height almost twice Earth’s. The model assumes one temperature all the way up, which neither atmosphere has.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus (0) with the planet’s own temperature, read “Scale height”, then Earth (1).',
        };
      },
      tool: SCL({ body: 0, own: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// Two Greenhouse Models: the deeper steps.
// -----------------------------------------------------------------------------
export const TWO_GREENHOUSE_MODELS_DEEPER = {
  id: 'two-greenhouse-models',
  steps: [
    {
      sid: 'mars-barely-a-greenhouse',
      after: 'earth-gray',
      depth: 'quantitative',
      type: 'measure',
      title: 'Mars in both models',
      body: `Mars has a thin atmosphere. Set the planet to <strong>Mars</strong> and read the
             emissivity of one layer and the optical depth that give its measured surface
             temperature, 210 K.`,
      fields: [
        { id: 'eps', label: 'Emissivity that gives 210 K', hint: '0.006' },
        { id: 'tau', label: 'Optical depth that gives 210 K', hint: '0.004' },
      ],
      validate: v => {
        if (![v.eps, v.tau].every(Number.isFinite)) return null;
        if (near(v.eps, 0.006, 0.003) && near(v.tau, 0.004, 0.003)) {
          return {
            level: 'ok',
            message:
              'About 0.006 and 0.004: both models need almost no atmosphere, because Mars’s measured surface temperature is within a fraction of a kelvin of its equilibrium temperature. The two numbers are tiny and close, but they are still different quantities. Real Mars has a day and night swing the model leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mars (2) and read “Emissivity of one layer that gives the measured temperature” and “Optical depth that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 2, tau: 0, emissivity: 0 }),
    },
    {
      sid: 'one-unit-two-models',
      after: 'mars-barely-a-greenhouse',
      depth: 'quantitative',
      type: 'measure',
      title: 'One unit in each model',
      body: `Set the planet to <strong>Earth</strong>. Give the one-layer model an emissivity of
             <strong>1</strong> (a layer that absorbs all the infrared) and the gray model an
             optical depth of <strong>1</strong>. Read the ground temperature each gives.`,
      fields: [
        {
          id: 'gray',
          label: 'Ground temperature, gray model with optical depth 1',
          unit: 'K',
          hint: '292.2',
        },
        {
          id: 'layer',
          label: 'Ground temperature, one layer with emissivity 1',
          unit: 'K',
          hint: '302.1',
        },
      ],
      validate: v => {
        if (![v.gray, v.layer].every(Number.isFinite)) return null;
        if (near(v.gray, 292.2, 0.7) && near(v.layer, 302.1, 0.7)) {
          return {
            level: 'ok',
            message:
              '292.2 K and 302.1 K. A layer that absorbs everything and a column one optical depth thick are not the same: the gray column lets some of the infrared from the ground escape through its upper layers, and the layer does not. “1” means a different thing in each model.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1), set the optical depth to 1 and the emissivity to 1, then read “Ground temperature, gray model” and “Ground temperature, one layer”.',
        };
      },
      tool: GRN({ body: 1, tau: 1, emissivity: 1 }),
    },
    {
      sid: 'limits-of-gray',
      after: 'venus-both-try',
      depth: 'advanced',
      type: 'measure',
      title: 'Where the gray model stops',
      body: `The gray profile is the Eddington solution. A numerically exact gray solution
             exists and the instrument draws it dashed. Look at the top of the atmosphere, at
             optical depth 0, and read how much warmer the Eddington curve is than the exact
             gray one, as a percentage.
             \n\nThat gap is the error of the approximation. A bigger limit is the word
             <em>gray</em>: real opacity depends on wavelength, and sunlight and the planet&rsquo;s
             infrared are absorbed very differently, which this model cannot represent.`,
      fields: [
        {
          id: 'gap',
          label: 'Eddington against exact gray, at the top',
          unit: '%',
          hint: '3.7',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.gap)) return null;
        if (near(v.gap, 3.7, 0.2)) {
          return {
            level: 'ok',
            message:
              'About 3.7 percent warm at the top, and the curves close together with depth. That is the stated error of the Eddington closure and not a quantity to minimise. The larger omission is the one the model is named for: gray opacity, the same at every wavelength.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Eddington against the exact gray solution, at the top” in the instrument.',
        };
      },
      tool: GRN({ body: 1, tau: 5, emissivity: 0.79 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The instructor's side of both lessons.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// The Sun investigations, deeper (Prompt 194 part 2, D-R10-92): the same
// instruments (js/sunWidgets.js); every expected value is recomputed in
// tests/sunLessons.test.js.
// -----------------------------------------------------------------------------
const SF = (values = {}, hide = []) => ({ id: 'sun-frames', values, hide });
const SR = (values = {}, hide = []) => ({ id: 'sun-rotation', values, hide });
const SP = (values = {}, hide = []) => ({ id: 'sun-power', values, hide });

export const THE_TURNING_SUN_DEEPER = {
  id: 'the-turning-sun',
  steps: [
    {
      sid: 'a-southern-group',
      after: 'the-sidereal-period',
      depth: 'quantitative',
      type: 'measure',
      title: 'A second group, in the south',
      body: `G3 is the largest group in the pictures, at 20 degrees south. Choose <strong>G3</strong>
             with the same days (1 to 9) and read its <strong>sidereal rate</strong> and the uncertainty
             of that rate.`,
      fields: [
        {
          id: 'rate',
          label: 'G3’s sidereal rate (degrees a day)',
          unit: '',
          hint: '13.48',
        },
        {
          id: 'sigma',
          label: 'The uncertainty of that rate (degrees a day)',
          unit: '',
          hint: '0.06',
        },
      ],
      validate: v => {
        if (![v.rate, v.sigma].every(Number.isFinite)) return null;
        if (near(v.rate, 13.48, 0.08) && near(v.sigma, 0.056, 0.02)) {
          return {
            level: 'ok',
            message:
              '13.48 ± 0.06 degrees a day, from nine marks. That is 0.66 degree a day slower than G1’s 14.13, at 20 degrees south instead of 7 degrees north. The uncertainty of 0.06 is how well the marks lie on a line, and the next steps ask whether that is the only uncertainty there is.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose G3 (group 2), the first day 1 and the last day 9, and read “Sidereal rate”.',
        };
      },
      tool: SR({ group: 1, first: 1, last: 9, limb: 0, mode: 0 }, ['mode']),
    },
    {
      sid: 'the-law-at-two-latitudes',
      after: 'a-southern-group',
      depth: 'quantitative',
      type: 'measure',
      title: 'What the reference law says at each',
      body: `The reference law, Howard, Harvey and Forgach (1990), gives the rate at any latitude with a
             fixed form, <em>A</em> + <em>B</em> sin<sup>2</sup>(latitude) + <em>C</em> sin<sup>4</sup>(latitude). It was measured on magnetic
             features, not sunspots, and it was typed from the paper and not re-read here. Read what it
             predicts at G1&rsquo;s latitude and at G3&rsquo;s: switch between the two groups.`,
      fields: [
        {
          id: 'law1',
          label: 'The law’s rate at G1’s latitude, 7.3 degrees (degrees a day)',
          unit: '',
          hint: '14.29',
        },
        {
          id: 'law3',
          label:
            'The law’s rate at G3’s latitude, −20.1 degrees (degrees a day)',
          unit: '',
          hint: '14.05',
        },
      ],
      validate: v => {
        if (![v.law1, v.law3].every(Number.isFinite)) return null;
        if (near(v.law1, 14.29, 0.03) && near(v.law3, 14.05, 0.03)) {
          return {
            level: 'ok',
            message:
              'The law gives 14.29 at G1 and 14.05 at G3: the equator turns faster, by 0.24 degree a day. G1 measured 14.13, 0.16 below; G3 measured 13.48, 0.57 below. Both are below the law, and the instrument shows each difference against ± 0.31, the fit and a 0.3 degree a day scatter between groups.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “The reference law at this latitude” for G1 and then for G3 (the number before “the group is”).',
        };
      },
      tool: SR({ group: 0, first: 1, last: 9, limb: 0, mode: 0 }, ['mode']),
    },
    {
      sid: 'solid-or-not',
      after: 'the-law-at-two-latitudes',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Is the Sun a solid ball?',
      body: `If the Sun turned as a solid ball every spot would have the same sidereal rate. G1 turns at
             14.13 &plusmn; 0.06 degrees a day and G3 at 13.48 &plusmn; 0.06, which differ by 0.66.`,
      prompt: 'What do these two groups say?',
      options: [
        'The difference is in the direction the law gives, the group nearer the equator faster, but groups scatter by about 0.3 degree a day from each other, so two groups are suggestive and cannot settle it alone',
        'They settle it: 0.66 is more than ten times the 0.06 uncertainty of each',
        'They are the same within error, so the Sun is a solid ball',
        'They show that the Sun’s rotation changes from day to day',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'solid',
          option: 2,
          say: 'A difference of 0.66 is far outside the 0.06 of the fit, so they are not the same by that measure. But the fit’s uncertainty is not the only one, and that is the point of the answer.',
        },
        {
          id: 'overclaim',
          option: 1,
          say: 'The 0.06 is only how well the marks of one group lie on a line. Groups also differ among themselves, by about 0.3 degree a day, for reasons a placement cannot see (they grow, they split). Against ± 0.43, the two groups’ difference is about 1.5, not 10.',
        },
        {
          id: 'daily',
          option: 3,
          say: 'Each rate is a fit over nine days of one group, so a change from day to day cannot be read from it.',
        },
      ],
      hints: [
        'What is the uncertainty of the difference once the scatter between groups is counted?',
      ],
      because:
        'The direction is right and the size is not settled by two groups: 0.66 against about 0.43 once the scatter between groups is counted. That the Sun’s surface turns faster at the equator was settled by following very many groups and features over a century; two groups are two points.',
      tool: SR({ group: 1, first: 1, last: 9, mode: 0 }, ['mode', 'limb']),
    },
    {
      sid: 'near-the-limb',
      after: 'solid-or-not',
      depth: 'quantitative',
      type: 'measure',
      title: 'A mark near the edge',
      body: `G1 is still on the disc on day 7, near the east-to-west edge. Set the day to <strong>7</strong> and read
             G1&rsquo;s <strong>mu</strong>, the cosine of the angle from the middle of the disc as seen from the Sun (1 in the
             middle, 0 at the edge), and the uncertainty of its longitude.`,
      fields: [
        { id: 'mu', label: 'G1’s mu on day 7', unit: '', hint: '0.29' },
        {
          id: 'sigma',
          label: 'The uncertainty of its longitude',
          unit: 'deg',
          hint: '0.64',
        },
      ],
      validate: v => {
        if (![v.mu, v.sigma].every(Number.isFinite)) return null;
        if (near(v.mu, 0.29, 0.03) && near(v.sigma, 0.64, 0.06)) {
          return {
            level: 'ok',
            message:
              'mu 0.29 and ± 0.64 degree: three times the ± 0.2 degree of the marks near the middle, from the same 1.5 pixels, because near the edge a pixel covers many degrees of longitude. The instrument warns that the mark is foreshortened and that a rate that includes it is not precise. Adding it to the fit changes the rate by 0.01 degree a day, which is why the marks near the edge are kept out of the rates above.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the day to 7 and read G1’s mu and ± in the “Author’s mark of G1” row.',
        };
      },
      tool: SF({ day: 7, marks: 1 }),
    },
    {
      sid: 'fit-the-equatorial-term',
      after: 'near-the-limb',
      depth: 'advanced',
      type: 'measure',
      title: 'Fit the one coefficient the groups can fix',
      body: `Two groups, at two latitudes, give two numbers. The law has three coefficients. So fit only
             the <strong>equatorial term A</strong> and hold the other two at the law&rsquo;s values. Choose the
             mode <strong>Fit the equatorial term</strong> and read A, its uncertainty and the chi-square.`,
      fields: [
        {
          id: 'a',
          label: 'The fitted equatorial term A (degrees a day)',
          unit: '',
          hint: '13.96',
        },
        {
          id: 'sigma',
          label: 'The uncertainty of A (degrees a day)',
          unit: '',
          hint: '0.22',
        },
      ],
      validate: v => {
        if (![v.a, v.sigma].every(Number.isFinite)) return null;
        if (near(v.a, 13.96, 0.05) && near(v.sigma, 0.216, 0.03)) {
          return {
            level: 'ok',
            message:
              'A = 13.96 ± 0.22 degrees a day against the law’s 14.33, 0.37 lower and within 1.7 of the uncertainty. Each group lies about 0.21 degree a day from the fitted curve, one above and one below, and one degree of freedom is left, chi-square 0.92: the curve is consistent with both groups. Only one number was fitted, and the shape of the curve was not.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the mode “Fit the equatorial term” and read “Equatorial term A, fitted” and its ±.',
        };
      },
      tool: SR({ group: 0, first: 1, last: 9, mode: 1 }, ['group', 'limb']),
    },
    {
      sid: 'three-from-two',
      after: 'fit-the-equatorial-term',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why not fit all three?',
      body: `Choose the mode <strong>Fit all three coefficients</strong>. The instrument refuses.`,
      prompt: 'Why does it refuse?',
      options: [
        'Two latitudes fix two numbers: with three coefficients to find there are infinitely many curves through the two groups, and the data cannot choose',
        'The marks are too noisy: more days would let it fit',
        'The law is wrong, so it cannot be fitted',
        'Fitting three numbers is too much arithmetic for a browser',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'noise',
          option: 1,
          say: 'Noise would widen the uncertainty, not forbid the fit. More days of the same two groups would not help: they would add precision at the same two latitudes, and the curve is still free between and beyond them.',
        },
        {
          id: 'wrong',
          option: 2,
          say: 'The refusal is about how many latitudes there are, not about the law: with three or more distinct latitudes the same fit is allowed, with its uncertainties.',
        },
      ],
      hints: ['How many numbers do two groups give you?'],
      because:
        'Two latitudes give two numbers, and a curve with three free coefficients has a whole family of fits through them. The instrument says which number of latitudes it needs rather than return coefficients that look exact and mean nothing.',
      tool: SR({ group: 0, first: 1, last: 9, mode: 2 }, ['group', 'limb']),
    },
    {
      sid: 'why-the-scatter',
      after: 'three-from-two',
      depth: 'advanced',
      type: 'measure',
      title: 'Do the marks of G3 lie on a line?',
      body: `Choose <strong>Track one group</strong> and G3 again. Read the chi-square per degree of freedom: about
             1 when the marks lie on the line as far as their uncertainties say, larger when they do not.`,
      fields: [
        {
          id: 'chi',
          label: 'G3’s chi-square per degree of freedom',
          unit: '',
          hint: '2.35',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.chi)) return null;
        if (near(v.chi, 2.35, 0.1)) {
          return {
            level: 'ok',
            message:
              '2.35: the marks scatter about the line more than 1.5 pixels of placement can explain, so the instrument has made the rate’s uncertainty 1.5 times larger. The reason is in the pictures: G3 grows, from 78 dark pixels on 4 May to 465 on 10 May, and the center of a growing group moves. Its Carrington longitude drifts from 351 to 347 degrees in a week. The rate you read is the rate of a changing group’s center, and the law is for features that do not change that way.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Track one group”, G3, the first day 1 and the last day 9, and read “Do the marks lie on a line?”.',
        };
      },
      tool: SR({ group: 1, first: 1, last: 9, mode: 0 }, ['mode', 'limb']),
    },
  ],
};

export const THE_SUNS_POWER_DEEPER = {
  id: 'the-suns-power',
  steps: [
    {
      sid: 'the-fall-and-its-cause',
      after: 'forget-the-au',
      depth: 'quantitative',
      type: 'measure',
      title: 'The flux falls over the six days',
      body: `With all six days and the correction on, read how far the flux at the Earth fell from the first
             day to the last, and how far the flux at 1 AU fell.`,
      fields: [
        {
          id: 'earth',
          label: 'The fall at the Earth (W/m²)',
          unit: '',
          hint: '4.04',
        },
        { id: 'au', label: 'The fall at 1 AU (W/m²)', unit: '', hint: '0.86' },
      ],
      validate: v => {
        if (![v.earth, v.au].every(Number.isFinite)) return null;
        if (near(v.earth, 4.04, 0.06) && near(v.au, 0.86, 0.06)) {
          return {
            level: 'ok',
            message:
              '4.04 at the Earth and 0.86 at 1 AU. Most of what a user of the raw numbers would see, 3.2 of the 4.0 watts per square meter, is the Earth moving away from the Sun. What is left, 0.86 or 0.06 percent, is the Sun’s, and it is under three times the 0.3 W/m² the file quotes as each day’s uncertainty: not a measurement to build much on.',
          };
        }
        return {
          level: 'error',
          message:
            'Use 6 days with the correction on, and read “At the Earth, first and last day” and “At 1 AU, first and last day”: the falls.',
        };
      },
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'how-sure-is-the-mean',
      after: 'the-fall-and-its-cause',
      depth: 'quantitative',
      type: 'measure',
      title: 'How sure is the mean?',
      body: `The mean of the six corrected days has an uncertainty from the scatter of the days divided
             by the square root of six. Read it, and the uncertainty it gives the luminosity.`,
      fields: [
        {
          id: 'se',
          label: 'The uncertainty of the mean flux (W/m²)',
          unit: '',
          hint: '0.15',
        },
        {
          id: 'sl',
          label: 'The uncertainty of the luminosity (× 10²² W)',
          unit: '',
          hint: '4.2',
        },
      ],
      validate: v => {
        if (![v.se, v.sl].every(Number.isFinite)) return null;
        if (near(v.se, 0.149, 0.01) && near(v.sl, 4.19, 0.3)) {
          return {
            level: 'ok',
            message:
              '± 0.15 W/m² of 1361.17, which is 0.011 percent, and ± 4.2 × 10²² W of 3.828 × 10²⁶. This is how closely six days agree with each other, which is not the same as how close the answer is to the truth.',
          };
        }
        return {
          level: 'error',
          message:
            'Use 6 days with the correction on, and read the “±” of “Mean over the days used” and of “The Sun’s luminosity”.',
        };
      },
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'zeros-are-not-data',
      after: 'how-sure-is-the-mean',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Seven rows of zero',
      body: `The file has seven more rows, 10 to 16 May, with an irradiance of 0.0 and an uncertainty of 0.0.`,
      prompt: 'What do they mean, and what should be done with them?',
      options: [
        'They are fill values, not measurements: no value was available. Leave them out of the mean',
        'The Sun gave out no light on those days: include them',
        'They are very small measurements: include them with their uncertainty of 0.0',
        'They are errors in the six real days: throw those out too',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'zero',
          option: 1,
          say: 'The Sun does not switch off. An irradiance of exactly 0.0 with an uncertainty of exactly 0.0 is how a file marks a value it does not have, and a mean that included them would be low by hundreds of W/m².',
        },
        {
          id: 'weight',
          option: 2,
          say: 'An uncertainty of 0.0 would give those rows infinite weight in a weighted mean. A number that cannot be a measurement must not be one anywhere in a calculation.',
        },
      ],
      hints: [
        'Could any real instrument measure the Sun to be exactly zero with no uncertainty at all?',
      ],
      because:
        'Fill values mark missing data. The file says so and carries no irradiance for 10 to 17 May; the mean and the luminosity above use the six measured days only. Silent zeros in a series are one of the commonest ways for a mean to come out wrong without looking wrong.',
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'the-quoted-uncertainty',
      after: 'zeros-are-not-data',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Which uncertainty is bigger?',
      body: `The file quotes a measurement uncertainty of 0.27 to 0.32 W/m² for each day. The mean of the six
             days has an uncertainty of 0.15 W/m² from their scatter.`,
      prompt:
        'What is the relation between the two, and what does it say about the 0.15?',
      options: [
        'The quoted uncertainty is about twice the scatter-based one: the 0.15 leaves out what the instrument itself is uncertain about, which the days share, and so averaging does not remove it',
        'The 0.15 is right and the quoted one is too cautious: averaging six days divides it by √6',
        'They must be equal, since they describe the same measurement',
        'The quoted uncertainty is for one day, so it has nothing to do with the mean of six',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'average',
          option: 1,
          say: 'Averaging reduces scatter that is independent from day to day. A part of an instrument’s uncertainty, its calibration for instance, is the same on every day, so six days do not average it down.',
        },
      ],
      hints: [
        'If a calibration is off by a little, is it off by the same little each day?',
      ],
      because:
        'Twice as large. The scatter of six days says how well they agree with one another; the instrument’s quoted uncertainty also covers what they share. A fair statement of the Sun’s power from these days has the larger one in it, about 0.02 percent, and neither includes the Sun’s real change over the days.',
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'compare-with-the-nominal',
      after: 'the-quoted-uncertainty',
      depth: 'advanced',
      type: 'measure',
      title: 'Against the nominal Sun',
      body: `The International Astronomical Union&rsquo;s nominal solar luminosity is 3.828 &times; 10<sup>26</sup> W and its
             nominal effective temperature 5772 K. Read how far your luminosity is from the nominal one, in
             percent, and your temperature, in kelvin.`,
      fields: [
        {
          id: 'diff',
          label: 'The luminosity against the nominal',
          unit: '%',
          hint: '0.00',
        },
        {
          id: 'dt',
          label: 'The temperature against 5772 K',
          unit: 'K',
          hint: '0.0',
        },
      ],
      validate: v => {
        if (![v.diff, v.dt].every(Number.isFinite)) return null;
        if (near(v.diff, 0, 0.02) && near(v.dt, 0, 0.3)) {
          return {
            level: 'ok',
            message:
              'Within a thousandth of a percent and a hundredth of a kelvin: the six days land on the nominal value. Do not read that as a result that is good to a thousandth of a percent. The quoted uncertainty is about 0.02 percent, and the nominal value is itself a defined round number; the agreement to five digits is partly luck, and what the comparison supports is agreement within about 0.02 percent.',
          };
        }
        return {
          level: 'error',
          message:
            'Use 6 days with the correction on, and read the percent in the luminosity row and the K in the temperature row.',
        };
      },
      tool: SP({ days: 6, correct: 1 }),
    },
  ],
};

const SUN_CONTENT = {
  'the-turning-sun': {
    topic:
      'The Sun’s rotation from its spots: the latitude and longitude of a spot read from a picture with an uncertainty, one group followed over days to a synodic and a sidereal rate and period, a second group at another latitude, a reference law of fixed form, and what two groups can and cannot show.',
    difficulty:
      'Introductory (a straight line and a division), with an upper depth on fitting',
    placement:
      'In a survey course after the unit on the Sun, and in a majors course as the first measurement from solar data; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 16 on the Sun as a variable star; the chapter citation is the author’s and has not been checked against the book.',
    overview:
      'Students read where on the Sun a spot is, 7.1 degrees north and 7.3 east of the central meridian, from the pixel and the Sun’s tilt (both from JPL Horizons), find G1 turns 13.2 degrees a day from two days and 13.17 ± 0.06 from six (a synodic period of 27.3 days), predict that the Sun’s own period is shorter, correct for the Earth’s motion to 14.13 ± 0.06 degrees a day (25.5 days), and say what a spot is. The quantitative depth follows G3 in the south (13.48 ± 0.06), compares both with the reference law (14.29 and 14.05 degrees a day), asks whether two groups show the Sun is not a solid ball (suggestive, not settled: 0.66 against 0.43) and reads a mark near the edge (mu 0.29, three times the longitude uncertainty). The advanced depth fits only the equatorial term A (13.96 ± 0.22), shows why three coefficients cannot be fitted from two latitudes, and finds that G3, which grows, does not lie on a line (chi-square per degree of freedom 2.35).',
    priorKnowledge: [
      'The Sun turns, and a spot on it is a place that turns with it',
      'Latitude and longitude on a sphere',
      'A rate is a distance divided by a time',
    ],
    keyConcepts: [
      {
        heading: 'Synodic and sidereal',
        body: 'A rate measured from the Earth includes the Earth’s own motion around the Sun. Adding 0.96 degree a day turns the synodic rate, 13.17, into the sidereal rate, 14.13: the Sun’s own, against the stars. The synodic period, 27.3 days, is longer than the sidereal, 25.5.',
      },
      {
        heading: 'A rate has an uncertainty, and so does the comparison',
        body: 'The fit’s uncertainty (0.06) is how well the marks lie on a line. Groups also scatter by about 0.3 degree a day among themselves, so a difference of 0.66 between two groups is about 1.5 times its uncertainty, not 10. Two groups are suggestive; the law was settled with very many.',
      },
      {
        heading: 'Two latitudes, two numbers',
        body: 'The reference law has three coefficients. Two groups at two latitudes can fix one of them (the equatorial term, with the others held), and the instrument refuses to fit all three rather than return coefficients that look exact.',
      },
    ],
    features: [
      {
        name: 'Sun instruments (sun family)',
        text: 'Fourteen daily SDO continuum pictures (4 to 17 May 2024) with a crosshair the student places and the heliographic position it gives, the author’s marks of two groups, one group’s longitude against time with its rates and period, the reference law, the equatorial term fitted alone, and a refusal for three coefficients.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: a second group, the law at both latitudes, whether two groups show differential rotation, and a mark near the edge. Advanced: the equatorial term, why three cannot be fitted, and a group that changes as it turns.',
      },
      {
        name: 'Predictions before answers',
        text: 'Whether the Sun’s own period is shorter or longer than the one the Earth sees is predicted before the sidereal rate is read, and is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'A sunspot is a hole in the Sun.',
        response:
          'It is a cooler patch of the surface, dark only beside the hotter surface around it; it belongs to the Sun, which is how tracking it follows the Sun’s turning.',
      },
      {
        claim:
          'The Sun turns as a solid ball, so every spot has the same period.',
        response:
          'The law gives 14.29 degrees a day at G1’s latitude and 14.05 at G3’s, and the two groups differ by 0.66; but two groups scatter too much to show it alone, and the investigation says so.',
      },
      {
        claim: 'The rate seen from the Earth is the Sun’s rotation rate.',
        response:
          'The Earth moves in the same direction, so a spot takes 27.3 days to face us again and 25.5 to turn once against the stars.',
      },
      {
        claim: 'A small uncertainty from the fit is the whole uncertainty.',
        response:
          'The fit’s 0.06 degree a day excludes the scatter between groups (about 0.3) and a growing group’s drifting center; against both, G3 sits 0.57 below the law.',
      },
      {
        claim: 'A picture of the Sun gives positions as exact as the pixels.',
        response:
          'Near the middle of the disc a pixel is a fraction of a degree, near the edge it is many degrees: G1’s longitude on day 7 is three times less certain, and the instrument warns.',
      },
    ],
    teachingNotes: [
      'The pictures are SDO HMI continuum BROWSE pictures: display pictures whose source says they are not for science analysis. A position read from one is an instructional reading with a placement uncertainty, labeled not astrometry (D-R10-92). The brightness is not calibrated and the picture has no coordinates of its own.',
      'The rings G1 and G3 are the author’s marks, made by a stated rule (dark clusters, tracked by solid co-rotation); no participant has marked these pictures, and NOAA’s region counts were not retrieved, so the alternative text states only the number of dark clusters the page’s detector reads.',
      'The disc geometry per day (the limb fitted to 0.07 pixel, B0 and L0 from JPL Horizons) is pinned in frames/sun-2024-05.json; the pictures have north up, so the pole angle used is 0 and Horizons’ NP.ang is only listed.',
      'The reference law’s coefficients (Howard, Harvey and Forgach 1990) were typed from the paper and not re-read; its tracer is not sunspots. A third group, G2, was tracked and its rate disagrees with the law at 4 standard errors because the rule lost the group as it split (tests/fixtures/sun/failed-legs.json); it is not used.',
    ],
    discussion: [
      'Why can the Sun turn at different rates at different latitudes when a rock cannot?',
      'What would you have to add to say how the whole law is shaped, and not only its equatorial term?',
      'How would you check that the center of a growing group is a fair tracer?',
    ],
    extensions: [
      'Add the days near the edge to a rate and see what the instrument warns about.',
      'Use the grid and read where the groups sit; do spots stay at one latitude?',
    ],
    modelNotes:
      'js/kernels/sun/ (SUN_KERNEL.md Part 2): diskToHeliographic, positionSigma, trackRotation, compareToLaw, fitRotationLaw, and the sequence readers; the authentic legs of npm run sun:validate, with three failed legs recorded.',
  },
  'the-suns-power': {
    topic:
      'The Sun’s luminosity and effective temperature from a measured irradiance: bringing a flux at the Earth to one astronomical unit, the sphere around the Sun, the Stefan–Boltzmann law, and what the interval of a six-day mean does and does not include.',
    difficulty: 'Introductory (a square, a product and a fourth root)',
    placement:
      'In a survey course after the unit on the Sun or on stellar luminosities; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 15 (the Sun’s luminosity); the citation is the author’s and has not been checked against the book.',
    overview:
      'Students read a flux measured by TSIS-1 TIM at the Earth on 4 May 2024 (1338.90 W/m²), bring it to 1 AU with the Earth–Sun distance (1361.60), predict the Sun’s power (about 4 × 10²⁶ W), and read it from the six measured days: 3.828 × 10²⁶ W and 5772 K, the Sun of Color and Temperature. Leaving out the correction gives a luminosity 1.8 percent low. The quantitative depth reads the fall over the days (4.04 at the Earth, 0.86 at 1 AU), the uncertainty of the mean (0.15 W/m²) and why seven rows of 0.0 are fill values. The advanced depth sets the quoted uncertainty (about twice the scatter-based one) beside the mean’s, and compares the result with the nominal solar values.',
    priorKnowledge: [
      'The inverse-square law for light',
      'The area of a sphere',
      'A black body’s power rises as the fourth power of its temperature',
    ],
    keyConcepts: [
      {
        heading: 'A flux belongs to a distance',
        body: 'A flux measured at the Earth is brought to 1 AU with the distance squared before it is compared or turned into a luminosity. Here the Earth was 0.8 to 1 percent beyond 1 AU, and leaving the correction out costs 1.8 percent.',
      },
      {
        heading: 'Luminosity and effective temperature',
        body: 'The flux at 1 AU times the area of a sphere of that radius is the Sun’s power, 3.828 × 10²⁶ W; the black-body temperature of a surface of the Sun’s size that radiates it is 5772 K.',
      },
      {
        heading: 'What an interval includes',
        body: 'The scatter of six days over √6 is 0.15 W/m²; the instrument’s quoted uncertainty, about twice that, also covers what the days share and averaging does not remove; neither includes the Sun’s real change over the days.',
      },
    ],
    features: [
      {
        name: 'Power instrument (sun family)',
        text: 'The TSIS-1 TIM daily irradiance at the Earth, the distance from JPL Horizons, the flux at 1 AU, the mean with its uncertainty, the luminosity and temperature through the radiation kernel with the nominal values beside them, and the cost of leaving out the correction. A note says seven fill rows were left out.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the fall over the days and its cause, the uncertainty of the mean, and fill values. Advanced: the quoted uncertainty against the mean’s, and the comparison with the nominal Sun.',
      },
      {
        name: 'Predictions before answers',
        text: 'The Sun’s total power is predicted before the instrument reveals it, and is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'A flux measured at the Earth is the Sun’s output.',
        response:
          'It is the output spread over a sphere of the Earth’s distance; it must be brought to a stated distance, and then multiplied by that sphere’s area.',
      },
      {
        claim: 'The “solar constant” does not change.',
        response:
          'It falls by 0.86 W/m² (0.06 percent) over these six days at 1 AU, about three of the file’s daily uncertainties; the name is a convention.',
      },
      {
        claim: 'A mean of many days has a tiny uncertainty.',
        response:
          'Its scatter-based interval is 0.15 W/m² and the instrument’s own is about twice that, a part of which does not average down.',
      },
      {
        claim: 'A row of 0.0 is a measurement of no sunlight.',
        response:
          'In this file seven rows of 0.0 with an uncertainty of 0.0 are fill values; they are left out.',
      },
    ],
    teachingNotes: [
      'The irradiance is the file’s own daily TSIS-1 TIM value at the Earth; the distance is JPL Horizons’. The file’s own 1 AU column differs from this correction by 0.16 W/m² at most, which is under its quoted uncertainty (tests/fixtures/sun/failed-legs.json records the committed bound it exceeded).',
      'Only six days (4 to 9 May) are measured: the file’s other seven rows are fill values and 17 May is not in it; the investigation says so.',
      'The luminosity treats the Sun as a sphere radiating equally in every direction; 1361 W/m² is not used as a measurement, only as the nominal value to compare with.',
      'The prediction before the instrument reveals the power is held and never marked wrong; students who answer in the wrong units (watts per square meter for watts) are worth a minute, because the area of the sphere is the step that turns one into the other.',
    ],
    discussion: [
      'What else would have to be done to compare irradiance on two days a year apart?',
      'Why is a luminosity that agrees to a thousandth of a percent with the nominal value not a result that good?',
      'Which of the numbers on the screen would change if the Earth were at 2 AU, and which would not?',
    ],
    extensions: [
      'Add the days one at a time and watch the mean and its uncertainty settle.',
      'Compare 5772 K with the temperature at which a black body peaks in the middle of the visible spectrum in Color and Temperature.',
    ],
    modelNotes:
      'js/kernels/sun/ (SUN_KERNEL.md Part 2): summariseIrradiance, luminosityFromFlux and temperatureFromLuminosity through the radiation kernel; the e2 legs of npm run sun:validate.',
  },
};

const SUN_FLOW = {
  'the-turning-sun': [
    {
      from: 'fourteen-days',
      to: 'which-way',
      text: 'Fourteen pictures, and which way the spots go.',
    },
    {
      from: 'read-a-position',
      to: 'how-far-in-three-days',
      text: 'A position on the sphere with its uncertainty, and a first rate from two days.',
    },
    {
      from: 'track-the-group',
      to: 'the-sidereal-period',
      text: 'The synodic rate from the whole track, the prediction, and the correction for the Earth.',
    },
    {
      from: 'what-is-a-spot',
      to: 'what-you-worked-out',
      text: 'What a sunspot is, and the close.',
    },
  ],
  'the-suns-power': [
    {
      from: 'a-flux-above-the-air',
      to: 'flux-at-one-au',
      text: 'A flux measured above the air, and brought to one astronomical unit.',
    },
    {
      from: 'power-predict',
      to: 'power-predict',
      text: 'The prediction of the Sun’s total power, held until the instrument reveals it.',
    },
    {
      from: 'luminosity',
      to: 'luminosity',
      text: 'The luminosity and the effective temperature from the six measured days.',
    },
    {
      from: 'forget-the-au',
      to: 'what-you-worked-out',
      text: 'What leaving out the correction costs, and the close.',
    },
  ],
};

const SUN_EXPECTATIONS = {
  'the-turning-sun': {
    'read-a-position':
      'A latitude of 7.14 degrees (within 0.3) and a longitude of −7.29 degrees (within 0.4).',
    'how-far-in-three-days':
      'A longitude of 32.44 degrees (within 0.3) on day 4 and 13.22 degrees a day (within 0.25).',
    'track-the-group':
      'A synodic rate of 13.17 degrees a day (within 0.06) and a period of 27.33 days (within 0.15).',
    'the-sidereal-period':
      'A sidereal rate of 14.13 degrees a day (within 0.06) and a period of 25.47 days (within 0.15).',
  },
  'the-suns-power': {
    'flux-at-one-au':
      'A flux of 1338.9 W/m² at the Earth (within 0.1) and 1361.6 at 1 AU (within 0.1).',
    luminosity:
      'A luminosity of 3.828 × 10²⁶ W (within 0.012) and a temperature of 5772 K (within 3).',
  },
};

const SUN_BANDS = {
  'the-turning-sun': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  'the-suns-power': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'long',
  },
};

export const INSTRUCTOR = {
  content: {
    ...SUN_CONTENT,
    'why-venus-is-hot': {
      topic:
        'The equilibrium temperature of a planet, the gap between it and the measured surface temperature, and what closes the gap: the one-layer and the gray greenhouse models, with Venus as the case that a single layer cannot reach.',
      difficulty: 'Introductory (a fourth root and a ratio)',
      placement:
        'In a survey course after the unit on the terrestrial planets; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 10 (section 10.3 on the atmosphere of Venus), and the chapter citation is the author’s and has not been checked against the book.',
      overview:
        'Students read the equilibrium temperature of Earth (254 K) and see the 34 K gap to its surface, predict and read Venus (229 K, cooler than Earth because it reflects 76 percent of its sunlight, against a surface at 737 K), read why that gap is a greenhouse effect for Venus and Earth but not for Jupiter, find that one absorbing layer cannot give Venus more than 272 K, and fit one optical depth, about 142, for the gray model. The deeper steps vary the albedo and compare the scale heights of Venus and Earth.',
      priorKnowledge: [
        'Planets reflect part of the sunlight and absorb the rest',
        'Temperature and radiated power are linked (hotter radiates more)',
        'Venus and Earth are close in size and different in atmosphere',
      ],
      keyConcepts: [
        {
          heading: 'Equilibrium temperature is not a surface temperature',
          body: 'It is the temperature of a black body that radiates the sunlight the planet absorbs. Venus’s is 229 K, cooler than Earth’s 254 K, because its albedo is 0.76.',
        },
        {
          heading: 'The gap is the finding',
          body: 'Measured minus equilibrium is 34 K for Earth, 508 K for Venus and 0.2 K for Mars. For a giant planet it is not a greenhouse gap: there is no surface and internal heat is left out.',
        },
        {
          heading: 'A model can refuse',
          body: 'One isothermal layer cannot warm the ground above 2^(1/4) times the equilibrium temperature, 272 K for Venus. The instrument reports no solution; the gray model reaches 737 K with an optical depth of about 142.',
        },
      ],
      features: [
        {
          name: 'Atmosphere instruments (atmosphere family)',
          text: 'The energy balance, the two greenhouse models side by side with the profile drawn by the plot component, and the scale height. Every readout names its model and what it leaves out.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: Earth with no albedo. Advanced: the scale heights of Venus and Earth.',
        },
        {
          name: 'Predictions before answers',
          text: 'The Venus prediction is recorded before the instrument reveals the equilibrium temperature, and is never marked wrong in the report.',
        },
      ],
      misconceptions: [
        {
          claim: 'A planet nearer the Sun is hotter.',
          response:
            'Not by distance alone: a planet is heated by the sunlight it absorbs. Venus absorbs a quarter of the sunlight that reaches it and has a lower equilibrium temperature than Earth.',
        },
        {
          claim:
            'The fitted optical depth or emissivity measures the atmosphere.',
          response:
            'Each is one number fitted to one surface temperature in a model that leaves out convection, clouds and the wavelength dependence of opacity. Two models give two numbers for the same planet.',
        },
        {
          claim:
            'Every gap between measured and equilibrium temperature is a greenhouse effect.',
          response:
            'Jupiter’s 55 K is the 1 bar level against a model with no internal heat, and Jupiter has no surface. The instrument says so.',
        },
        {
          claim: 'Venus is hot because it is the planet nearest the Sun.',
          response:
            'Mercury is nearer, and its surface is cooler on average than Venus’s. What matters is the sunlight absorbed and what the atmosphere does with the heat.',
        },
      ],
      teachingNotes: [
        'The planet table (albedos, distances, temperatures) is typed from the NASA fact sheets and was read by the project’s author; it was not checked against the sources.',
        'The albedo is the Bond albedo (the fraction of all incident power reflected), not a geometric albedo.',
        'The models are not climate models: no convection, no clouds, no internal heat, gray opacity. A fitted number is not an observation of the atmosphere.',
        'No claim is made about retention of an atmosphere: the escape instrument is not built.',
      ],
      discussion: [
        'Why does the planet that absorbs less sunlight end up with the hotter surface?',
        'What would you need to measure to say the fitted optical depth of Venus is right?',
        'Why does a fourth root make the temperature change so slowly when the albedo changes?',
      ],
      extensions: [
        'Continue with Two Greenhouse Models, which fits Earth, Mars and Venus in both models.',
        'Look up the measured surface pressure of Venus and compare it with the scale height you found.',
      ],
      modelNotes:
        'js/kernels/atmospheres/ (ATMOSPHERES.md): equilibriumTemperature, oneLayer, grayGround and grayDepthFor, scaleHeight and the six-body planet table, validated against an independent numpy and scipy oracle (npm run atmospheres:validate).',
    },
    'two-greenhouse-models': {
      topic:
        'A single absorbing layer and a gray atmosphere with an optical depth fitted to Earth, Mars and Venus: what each free number means, why they differ, which model can reach Venus and where gray opacity stops being a description.',
      difficulty:
        'Intermediate (fourth roots, two models, an approximation with a stated error)',
      placement:
        'After Why Venus Is Hot, whose equilibrium temperature and gap it reuses. It supports OpenStax Astronomy 2e chapter 8 (section 8.3 on Earth’s atmosphere); the citation is the author’s and has not been checked against the book.',
      overview:
        'Students fit Earth’s surface temperature with a one-layer emissivity (0.79) and a gray optical depth (0.87), say why the numbers differ, predict and then read that Venus is out of reach for one layer (272 K at most) and needs an optical depth near 142 in the gray model. Deeper: Mars needs almost nothing in either model, one unit in each model gives 292.2 K and 302.1 K, and the Eddington profile is 3.7 percent warm at the top against the exact gray solution.',
      priorKnowledge: [
        'The equilibrium temperature and the measured-minus-equilibrium gap',
        'Energy balance: what comes in as sunlight leaves as infrared',
        'The fourth-root relation between absorbed power and temperature',
      ],
      keyConcepts: [
        {
          heading: 'Two models, two free numbers',
          body: 'An emissivity is the share of the infrared one sheet absorbs, between 0 and 1. An optical depth sets the opacity of a whole column and can be 142. They are not the same quantity.',
        },
        {
          heading: 'A ceiling is information',
          body: 'One layer cannot exceed 2^(1/4) times the equilibrium temperature. A planet that needs more refuses the model.',
        },
        {
          heading: 'The approximation has a stated error',
          body: 'The Eddington profile is 3.66 percent warm at the top against the exact gray solution (a Milne-equation calculation). The error is stated, not minimised, and it is smaller than the error of calling real opacity gray.',
        },
      ],
      features: [
        {
          name: 'Greenhouse instrument',
          text: 'Both models for Earth, Mars or Venus: the gray profile as Eddington and exact curves through the plot component, the ground temperature of each model, and the number each needs to reproduce the measured temperature.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: Mars in both models, one unit in each model. Advanced: the limits of gray opacity.',
        },
        {
          name: 'A model that can refuse',
          text: 'The one-layer model returns no solution, with the reason, when the planet needs a ground warmer than 2^(1/4) times its equilibrium temperature.',
        },
      ],
      misconceptions: [
        {
          claim:
            'If both models reproduce 288 K, both describe Earth’s atmosphere correctly.',
          response:
            'Each is fitted to the one measurement. They agree on the ground temperature and disagree on everything else, and neither number is measured.',
        },
        {
          claim: 'An emissivity of 1 and an optical depth of 1 are the same.',
          response:
            'They give 302.1 K and 292.2 K for Earth: a fully absorbing sheet and a column of one optical depth are different atmospheres.',
        },
        {
          claim: 'The gray model is exact, since it is a published solution.',
          response:
            'It is the Eddington approximation of the gray problem, 3.66 percent warm at the top, and the gray assumption itself is the larger simplification.',
        },
        {
          claim: 'A model that has no solution for a planet is broken.',
          response:
            'A refusal is a result: the one layer has a ceiling and Venus is above it.',
        },
      ],
      teachingNotes: [
        'The exact gray curve uses the Hopf function in a closed approximation, checked against a numerical solution of the Milne equation to 0.5 percent.',
        'The planet table’s values were read by the project’s author and not checked against the NASA fact sheets.',
        'These are not climate models; they cannot say what a real atmosphere will do.',
        'The one number fitted to each planet is a fit to one measurement, not an observation: say so when students quote it.',
      ],
      discussion: [
        'Which of the two numbers would you expect to move if the clouds changed, and why?',
        'Why is “gray” a bigger limitation than the Eddington approximation?',
        'What would a model with two opacities, one for sunlight and one for infrared, change?',
      ],
      extensions: [
        'Open the validation page and find the atmospheres group.',
        'Compare the one-layer ceiling with the ratio of measured to equilibrium temperature of each planet in Why Venus Is Hot.',
      ],
      modelNotes:
        'js/kernels/atmospheres/ (ATMOSPHERES.md): oneLayer, oneLayerEmissivityFor, grayGround, grayDepthFor, grayTemperatureExact; the oracle results are pinned in tests/fixtures/atmospheres/.',
    },
  },
  flow: {
    ...SUN_FLOW,
    'why-venus-is-hot': [
      {
        from: 'two-temperatures',
        to: 'earth-sunlight-alone',
        text: 'The equilibrium temperature and Earth’s gap.',
      },
      {
        from: 'venus-predict',
        to: 'what-the-gap-says',
        text: 'Venus is cooler by sunlight and hotter at the surface: the gap.',
      },
      {
        from: 'six-bodies',
        to: 'gray-depth-for-venus',
        text: 'Which gaps are a greenhouse, one layer cannot reach Venus, a gray atmosphere can.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the gap and the two models say.',
      },
    ],
    'two-greenhouse-models': [
      {
        from: 'two-models',
        to: 'earth-one-layer',
        text: 'The two models, and Earth fitted with an emissivity.',
      },
      {
        from: 'earth-gray',
        to: 'same-planet-different-numbers',
        text: 'The same planet fitted with an optical depth, and why the two numbers differ.',
      },
      {
        from: 'venus-both',
        to: 'venus-both-try',
        text: 'Which model can reach Venus.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: two numbers, two meanings.',
      },
    ],
  },
  expectations: {
    ...SUN_EXPECTATIONS,
    'why-venus-is-hot': {
      'earth-sunlight-alone':
        'Earth’s equilibrium temperature 254 K (within 0.6) and a gap of 34 K (within 1).',
      'venus-sunlight-alone':
        'Venus’s equilibrium temperature 229 K (within 0.7) and a gap of 508 K (within 2).',
      'six-bodies':
        'Mars within 0.5 K of 0.2 and Jupiter’s 1 bar level 55 K above its equilibrium temperature (within 2).',
      'one-layer-for-venus':
        'The highest ground temperature one layer can give Venus, 272 K (within 1.5).',
      'gray-depth-for-venus': 'An optical depth near 141.6 (within 1.5).',
    },
    'two-greenhouse-models': {
      'earth-one-layer': 'An emissivity of 0.79 (within 0.01).',
      'earth-gray': 'An optical depth of 0.87 (within 0.02).',
      'venus-both-try':
        'The one-layer ceiling for Venus, 272 K (within 1.5), and an optical depth near 141.6 (within 1.5).',
    },
  },
  bands: {
    ...SUN_BANDS,
    'why-venus-is-hot': {
      core: 'short',
      quantitative: 'medium',
      advanced: 'medium',
    },
    'two-greenhouse-models': {
      core: 'short',
      quantitative: 'medium',
      advanced: 'medium',
    },
  },
};

/** The deeper steps by lesson id: what depthAll.js registers. */
export default {
  [WHY_VENUS_IS_HOT_DEEPER.id]: WHY_VENUS_IS_HOT_DEEPER.steps,
  [TWO_GREENHOUSE_MODELS_DEEPER.id]: TWO_GREENHOUSE_MODELS_DEEPER.steps,
  [THE_TURNING_SUN_DEEPER.id]: THE_TURNING_SUN_DEEPER.steps,
  [THE_SUNS_POWER_DEEPER.id]: THE_SUNS_POWER_DEEPER.steps,
};
