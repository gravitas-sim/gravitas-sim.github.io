// =============================================================================
// The measurement and claim investigations, deeper (Prompt 190)
// -----------------------------------------------------------------------------
// Three modules of deeper steps in one file (D-R10-67; see
// ../measurement-sequence.js). The same instruments, the same seeds. Quantitative
// steps do by hand what the instrument reads; advanced steps state the limits of
// the claim, not more controls. Every expected value is recomputed
// (tests/claimInvestigations.test.js).
// =============================================================================

const FM = (values = {}, hide = ['offset', 'truth']) => ({
  id: 'frame-marks',
  values,
  hide,
});
const CR = (values = {}, hide = ['case', 'form', 'rate', 'repeats']) => ({
  id: 'coverage-repeats',
  values,
  hide,
});
const PR = (values = {}, hide = ['terms']) => ({
  id: 'profile-refusal',
  values,
  hide,
});

export const WHAT_IS_A_MEASUREMENT_DEEPER = {
  id: 'what-is-a-measurement',
  steps: [
    {
      sid: 'a-position-with-an-error-bar',
      after: 'the-standard-error',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'The position with its error bar',
      body: `A result is reported as a value, then ±, then its uncertainty. Report
             the mean x position of the five marks with its standard error, from
             the two rows you have already read.
             \n\nIt counts as right when the range you give overlaps the range
             the marks allow, and is no wider than a few standard errors, because an
             uncertainty large enough to overlap anything has told nobody anything.`,
      prompt: 'The mean x position, with its uncertainty',
      unit: 'px',
      placeholder: 'e.g. 12.3 ± 0.4',
      answer: 31.1,
      tolerance: 0.1,
      maxUncertainty: 0.8,
      hints: ['Write the mean, then ±, then the standard error of x.'],
      because:
        'The mean is 31.10 pixels and its standard error 0.36, so the position is 31.10 ± 0.36 pixels: a range that sits around the marks and, as the next steps show, around the truth.',
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'how-many-marks-by-hand',
      after: 'a-position-with-an-error-bar',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How many marks for a tenth of a pixel?',
      body: `One mark of this star is scattered by about 0.8&nbsp;pixel. The
             standard error is the spread over the square root of the number of
             marks, N. You want the standard error to be 0.1&nbsp;pixel.`,
      prompt: 'The number of marks needed',
      unit: '',
      answer: 64,
      tolerance: 6,
      hints: ['Solve 0.1 = 0.8 ÷ √N for N.', 'N = (0.8 ÷ 0.1)².'],
      worked:
        'N = (0.8 ÷ 0.1)² = 8² = 64 marks. Going from 5 marks to 64 buys a standard error of a tenth of a pixel, and the cost grows as the square of the precision wanted.',
      feedback: {
        close:
          'Close. Square the ratio of the spread to the wanted standard error.',
        'wrong-order-of-magnitude':
          'A power of ten out. Remember the standard error falls only as the square root of N.',
        off: 'N = (spread ÷ wanted standard error)², with 0.8 and 0.1.',
      },
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'a-pointer-offset',
      after: 'a-blurrier-star',
      depth: 'advanced',
      type: 'measure',
      title: 'What more marks cannot fix',
      body: `A new instrument places every mark <strong>1.0 pixel</strong> too far
             right: the cross sits where the cursor's hot spot is, and nobody has
             checked it. Set <strong>Offset of every mark</strong> to 1.0, take 30 marks, and show
             the truth. Read the standard error of x and the error of the mean in
             standard errors.`,
      fields: [
        {
          id: 'sex',
          label: 'Standard error of x, 30 marks',
          unit: 'px',
          hint: '0.14',
        },
        {
          id: 'inse',
          label: 'Error of the mean in standard errors',
          unit: '',
          hint: '6.2',
        },
      ],
      validate: v => {
        if (![v.sex, v.inse].every(Number.isFinite)) return null;
        if (Math.abs(v.sex - 0.14) <= 0.02 && Math.abs(v.inse - 6.2) <= 0.6) {
          return {
            level: 'ok',
            message:
              'The standard error is small, 0.14 pixel, and the mean is six of them from the truth. More marks made the standard error smaller and left the offset exactly where it was.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the offset to 1.0, the number of marks to 30 and show the truth, then read the two rows.',
        };
      },
      tool: FM({ n: 30, blur: 4, offset: 1, truth: 1 }, []),
    },
    {
      sid: 'what-the-standard-error-leaves-out',
      after: 'a-pointer-offset',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What the plus-or-minus is a statement about',
      body: `A report states the star's x position as 32.27 ± 0.14 pixels, from 30
             marks.`,
      prompt: 'What does the ± 0.14 describe?',
      options: [
        'How the mean of these marks would scatter if the marking were repeated, assuming the marks scatter at random about one center',
        'How far the mean is from the true position',
        'How well the instrument has been calibrated',
        'The size of every error in the measurement, random and systematic together',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'standard-error-is-total-error',
          option: 3,
          say: 'The standard error counts the scatter of the marks. An offset that is the same in every mark is not scatter, so it is not in it, however many marks are made.',
        },
      ],
      hints: ['Which kind of error does taking more marks reduce?'],
      because:
        'The scatter of the mean under repetition, on an assumption about the marks. A systematic offset, the same in every mark, is outside it, and so is anything the marks share. Stating both, the random part and what was done to check the systematic part, is the full claim.',
      tool: FM({ n: 30, blur: 4, offset: 1, truth: 1 }, []),
    },
  ],
};

export const WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER = {
  id: 'what-does-plus-minus-claim',
  steps: [
    {
      sid: 'the-ensemble-wobbles',
      after: 'coverage-at-two-sigma',
      depth: 'quantitative',
      type: 'measure',
      title: 'The count is itself uncertain',
      body: `The coverage was counted from a finite number of repeats, so it
             carries an uncertainty of its own. Set <strong>Repeats</strong> to 100 and
             the interval to ±1 σ. Read the coverage and its own uncertainty.`,
      fields: [
        { id: 'share', label: 'Coverage', unit: '%', hint: '70.0' },
        {
          id: 'se',
          label: 'Uncertainty of the coverage',
          unit: '%',
          hint: '4.6',
        },
      ],
      validate: v => {
        if (![v.share, v.se].every(Number.isFinite)) return null;
        if (Math.abs(v.share - 70) <= 1.5 && Math.abs(v.se - 4.6) <= 0.5) {
          return {
            level: 'ok',
            message:
              'Seventy percent, give or take four and a half: a count of a hundred repeats cannot tell 68 from 72. A coverage check is a measurement, with its own error bar.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Repeats” to 100 and the interval to ±1 σ, then read “Coverage” and its uncertainty.',
        };
      },
      tool: CR({ case: 0, k: 1, repeats: 100 }, ['case', 'form', 'rate']),
    },
    {
      sid: 'the-binomial-by-hand',
      after: 'the-ensemble-wobbles',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The uncertainty of a coverage, by hand',
      body: `Each repeat holds the truth or does not, with probability p. For R
             repeats the share that do has a standard deviation √(p(1 − p) ÷ R). Take
             p = 0.68 and R = 2000.`,
      prompt: 'The uncertainty of the share, in percent',
      unit: '%',
      answer: 1.04,
      tolerance: 0.1,
      hints: [
        'Compute 0.68 × 0.32 first, divide by 2000, take the square root, then express it as a percentage.',
      ],
      worked:
        '0.68 × 0.32 = 0.2176; divided by 2000 is 0.0001088; the square root is 0.01043, which is 1.04 percent. With 2000 repeats a coverage is good to about one percentage point.',
      feedback: {
        close: 'Close. Take the square root at the end.',
        'wrong-order-of-magnitude':
          'A power of ten out. Give the answer in percent, and divide by R before the square root.',
        off: 'The spread is the square root of p times the chance of missing, divided by R.',
      },
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
    {
      sid: 'the-bias-by-hand',
      after: 'biased-coverage',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The biased coverage, by hand',
      body: `Each reading is the truth plus 0.4 plus a random error of scatter 0.3. A
             ±0.3 interval holds the truth when that random error lies between −0.7 and
             −0.1 about the center, that is between −2.33 and −0.33 scatters. The
             normal curve has 0.0099 of its area below −2.33 and 0.3707 below
             −0.33.`,
      prompt: 'The share of intervals that hold the truth, in percent',
      unit: '%',
      answer: 36.1,
      tolerance: 1.5,
      hints: [
        'Subtract the smaller area from the larger and give it as a percentage.',
      ],
      worked:
        '0.3707 − 0.0099 = 0.3608, 36.1 percent. The ensemble reads 36.3, within what 2000 repeats allow. A claim of two in three, held a little over one time in three.',
      feedback: {
        close: 'Close. Subtract the two areas.',
        off: 'Share = area below −0.33 minus area below −2.33.',
      },
      tool: CR({ case: 1, k: 1, repeats: 2000 }, [
        'case',
        'form',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'the-zero-count-limit',
      after: 'upper-limit-coverage',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The limit from a count of zero',
      body: `An experiment sees no events. The 95 percent upper limit on the rate is
             the rate λ at which seeing none has a chance of only 5 percent. The
             chance of seeing none, when the mean is λ, is e<sup>−λ</sup>.`,
      prompt: 'The 95 percent upper limit on the rate, in events',
      unit: '',
      answer: 3,
      tolerance: 0.05,
      hints: [
        'Solve e raised to −λ equal to 0.05 for λ, using a natural logarithm.',
      ],
      worked:
        'λ = −ln(0.05) = 2.996, close to 3. So a count of zero says the rate is below about three events at 95 percent, which is why “nothing seen” is a limit and not zero.',
      feedback: {
        close: 'Close. Use the natural logarithm, and a minus sign.',
        off: 'λ = −ln(0.05).',
      },
      tool: CR({ case: 3, repeats: 2000, rate: 3 }, [
        'case',
        'k',
        'form',
        'repeats',
      ]),
    },
    {
      sid: 'why-a-real-claim-cannot-be-counted',
      after: 'the-symmetric-shortcut',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What this check cannot do',
      body: `In this instrument the true value was known, and the coverage was a
             count.`,
      prompt: 'Why can a real measurement’s coverage not be counted this way?',
      options: [
        'The truth is not known, so the claim can only be checked against repeats, a calibration or an independent method',
        'Real measurements have no stated uncertainty',
        'Real instruments never have bias',
        'A real coverage is always exactly the stated one',
      ],
      answer: 0,
      hints: ['What did the count need that a real star does not supply?'],
      because:
        'The count needed the truth. A real claim is tested against repeats of the measurement, against a calibration source of known value, or against an independent method, and each of those is a check of one thing only. This investigation shows what a check is, and a real one is rarely so complete.',
      tool: CR({ case: 2, k: 1, repeats: 2000, form: 1 }, [
        'case',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'why-not-exactly-95',
      after: 'why-a-real-claim-cannot-be-counted',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why an upper limit does not hit its level',
      body: `At a true rate of 3.0 the limits held 95.6 percent, and at 4.0 they held
             98.7. Counts of events are whole numbers.`,
      prompt: 'What does the jump between the two coverages show?',
      options: [
        'A count can only take whole values, so the limit takes a few discrete values and the coverage cannot be tuned to exactly 95 percent; it is at least 95 by construction',
        'The instrument is broken at a rate of 4.0',
        'The 2000 repeats are too few to measure any coverage',
        'An upper limit has no coverage',
      ],
      answer: 0,
      hints: ['How many different limits can a count produce?'],
      because:
        'The limit is a step function of the count, so the coverage is a staircase in the rate, never below 95 and touching it only at the steps. A conservative claim is a legitimate one; a claim of exactly 95 percent would need a randomised procedure.',
      tool: CR({ case: 3, repeats: 2000, rate: 4 }, [
        'case',
        'k',
        'form',
        'repeats',
      ]),
    },
  ],
};

export const WHEN_THE_METHOD_MUST_REFUSE_DEEPER = {
  id: 'when-the-method-must-refuse',
  steps: [
    {
      sid: 'the-95-percent-bound-by-hand',
      after: 'the-lower-limit',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The 95 percent bound, by hand',
      body: `For masses below the product the best fit has the tilt at its limit of 1,
             so the chi-square is ((m − 0.85) ÷ 0.06)². The 95 percent range is
             where the chi-square has risen by 3.84, which is 1.96 standard
             errors.`,
      prompt: 'The smallest mass inside a 95 percent range, in Jupiter masses',
      unit: 'M_J',
      answer: 0.732,
      tolerance: 0.005,
      hints: ['Subtract 1.96 times the error of the product from the product.'],
      worked:
        '0.85 − 1.96 × 0.06 = 0.85 − 0.1176 = 0.732 Jupiter masses. The instrument reads the same. There is still no upper bound, whatever the confidence level.',
      feedback: {
        close: 'Close. The bound is below the product, not above it.',
        off: 'm = 0.85 − 1.96 × 0.06.',
      },
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'degrees-of-freedom',
      after: 'fit-the-line',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The degrees of freedom of the line',
      body: `The reduced chi-square is the chi-square divided by the number of
             degrees of freedom: the number of points minus the number of
             parameters fitted. The line has two parameters, an intercept and a
             slope, and there are six points.`,
      prompt: 'The degrees of freedom',
      unit: '',
      answer: 4,
      tolerance: 0.1,
      hints: ['Six points, two parameters fitted.'],
      worked:
        'Six points minus two parameters is four. With four degrees of freedom the chi-square of a model that fits is about 4, and the 30.5 the line gives is nearly eight times that.',
      feedback: {
        close: 'Close. Count the points and subtract the fitted parameters.',
        off: 'Degrees of freedom = points − parameters.',
      },
      tool: PR({ case: 1, terms: 2 }, ['case', 'mass', 'terms']),
    },
    {
      sid: 'what-a-prior-would-add',
      after: 'what-to-report',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a prior on the tilt would add',
      body: `A different analysis assumes orbits are tilted at random, with no
             direction preferred, and reports a median mass with an interval.`,
      prompt: 'What does that number carry that the profile does not?',
      options: [
        'An assumption about the tilt, which the data do not contain: the interval is partly the prior’s, and it should be reported with the prior named',
        'More information from the data about the tilt',
        'A smaller uncertainty, which is always better',
        'A way to measure the mass without the product',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'prior-is-data',
          option: 1,
          say: 'The data fix the product and no more. Whatever the tilt prior contributes is the prior’s, and a different prior gives a different interval from the same data.',
        },
      ],
      hints: [
        'The data fix only the product. Where does the rest of the interval come from?',
      ],
      because:
        'An assumption. A prior can be reasonable, and with random tilts it gives a definite interval, but the interval then answers "given this assumption". The profile keeps the two apart: what the data fix, and what is assumed.',
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'what-a-fitting-model-does-not-prove',
      after: 'a-model-that-fits',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a model that fits does not prove',
      body: `The parabola has a reduced chi-square below 1 and a p-value near 0.8, from
             six points.`,
      prompt: 'What may be said of the parabola?',
      options: [
        'It describes these six points within their errors; it is not shown to be the true curve, and six points cannot rule out others with as many parameters',
        'It is the true curve, because the p-value is high',
        'It is certainly wrong, because a high p-value is suspicious',
        'Its coefficients are measured exactly',
      ],
      answer: 0,
      hints: [
        'What does a model with three parameters leave open, fitted to six points?',
      ],
      because:
        'It is not rejected. A model that fits is one the data cannot reject, which is weaker than one the data support over every alternative. Whether more terms, other shapes or a physical reason for the curve fit as well is the next question, and the reduced chi-square cannot answer it.',
      tool: PR({ case: 1, terms: 3 }, ['case', 'mass']),
    },
  ],
};

// =============================================================================
// The instructor side of the three investigations (Prompt 190)
// -----------------------------------------------------------------------------
// Merged by js/data/instructorContent.js, instructorFlow.js,
// instructorExpectations.js and instructorTimeBands.js into the registries the
// instructor documents read. They live in this file, and not in those four
// (which are idle-tier files with 11 bytes of room), because the idle tier of
// the offline install is a data-budget ceiling this change does not raise; this
// file is not installed ahead of use (D-R10-67). English only, as every guide is.
// =============================================================================
// -----------------------------------------------------------------------------
// The image investigations, deeper (Prompt 191). Same rules as above; the
// instruments are js/imagingWidgets.js and every expected value is recomputed
// (tests/imageInvestigations.test.js).
// -----------------------------------------------------------------------------
const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;
const MM = (values = {}, hide = []) => ({ id: 'moon-marks', values, hide });
const SP = (values = {}, hide = ['zero']) => ({
  id: 'star-parallax',
  values,
  hide,
});
const BO = (values = {}, hide = ['plx']) => ({
  id: 'binary-orbit',
  values,
  hide,
});

export const MEASURING_THE_MOON_DEEPER = {
  id: 'measuring-the-moon',
  steps: [
    {
      sid: 'a-pixel-at-each-end',
      after: 'what-would-change-it',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A pixel at each end',
      body: `Suppose both ends of the circle&rsquo;s diameter are one pixel too far out, the
             worst case of a careless placement. One pixel is the scale you read, 7.05 km.`,
      prompt: 'How much does the diameter change, in kilometers?',
      unit: 'km',
      answer: 14.1,
      tolerance: 0.4,
      hints: ['Two ends, one pixel each: how many pixels is that?'],
      worked:
        'Two pixels, 2 × 7.05 = 14.1 km. The tool’s own 6 km is smaller than this worst case because a placement is rounded to a pixel, a step of 0.29 pixel, not out by a whole one.',
      feedback: {
        close: 'Close. Two ends, one pixel each, times the scale.',
        'wrong-order-of-magnitude':
          'A power of ten out: two pixels at about 7 km each.',
        off: '2 pixels × 7.05 km per pixel.',
      },
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
    {
      sid: 'a-diameter-with-an-error-bar',
      after: 'a-pixel-at-each-end',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'The diameter with an error bar',
      body: `Report the diameter of the dark plain as a value, then &plusmn;, then an uncertainty
             you can defend. A careful person places the soft edge of this plain to within about
             three pixels either way, which is 21 km. It counts as right when the range you
             give overlaps the range the plain allows, and is no wider than 60 km.`,
      prompt: 'The diameter, with its uncertainty',
      unit: 'km',
      placeholder: 'e.g. 600 ± 30',
      answer: 634,
      tolerance: 40,
      maxUncertainty: 60,
      hints: [
        'Write the diameter, then ±, then an uncertainty that includes how well the edge can be placed.',
      ],
      because:
        'About 634 km, give or take 20 to 40: the 6 km the tool states is the rounding of the marks and is too small to be the whole uncertainty, because the edge of the plain is soft. An error bar you can defend includes what the stated one leaves out.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
    {
      sid: 'near-the-limb',
      after: 'a-diameter-with-an-error-bar',
      depth: 'advanced',
      type: 'measure',
      title: 'The same circle near the limb',
      body: `A round crater near the edge of the disc is seen at a slant, so it is squeezed in
             the direction toward the center. Move the circle to <strong>x = 470, y = 245</strong>,
             close to the right edge, with the pair across the disc. Read how far from the
             center of the disc the circle is, in radii of the disc, and how wide a round
             feature there looks along that direction, as a share of its true width.`,
      fields: [
        {
          id: 'off',
          label: 'Distance from the disc’s center, in disc radii',
          unit: '',
          hint: '0.89',
        },
        {
          id: 'share',
          label: 'Width along that direction',
          unit: '%',
          hint: '45',
        },
      ],
      validate: v => {
        if (![v.off, v.share].every(Number.isFinite)) return null;
        if (near(v.off, 0.89, 0.02) && near(v.share, 45, 2)) {
          return {
            level: 'ok',
            message:
              'At 0.89 of the radius a round feature looks 45 percent as wide along the radius as across it. A diameter taken in that direction would be less than half the true one, and a circle drawn on it, round, would measure the wrong thing.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the circle’s center to x = 470, y = 245, then read the distance in disc radii and the width along that direction.',
        };
      },
      tool: MM({ x1: 3, x2: 496, cx: 470, cy: 245, r: 20 }, ['x1', 'x2']),
    },
    {
      sid: 'a-gray-level-is-not-light',
      after: 'near-the-limb',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a gray level says',
      body: `The dark plain is darker in the picture than the bright highland beside it.
             A student writes that the plain reflects about a third as much light.`,
      prompt: 'What is wrong with the claim?',
      options: [
        'Nothing: darker pixels mean less light',
        'The gray levels are enhanced display values and carry no record of the light, so the picture can say how big the plain is and not how bright',
        'The Moon has no dark plains',
        'The picture is too small to see brightness',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'darker-is-fainter',
          option: 0,
          say: 'In a stretched, enhanced picture a gray level is whatever the stretch made it. The Observatory marks the picture display-only and gives no photometry for that reason.',
        },
        {
          id: 'too-small',
          option: 3,
          say: 'Size is not the issue. A picture with its units and calibration recorded would allow photometry at any size; this one has neither.',
        },
      ],
      hints: [
        'What does the picture record about how its gray levels were made?',
      ],
      because:
        'The gray levels are display values: contrast stretched for the eye, with no unit or calibration recorded. A scale and a size are measurements of where things are, which survive the stretch; a brightness would be a measurement of light, which does not.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
  ],
};

export const HOW_FAR_IS_THAT_STAR_DEEPER = {
  id: 'how-far-is-that-star',
  steps: [
    {
      sid: 'the-distance-by-hand',
      after: 'say-what-relative-means',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The distance by hand',
      body: `The fit gives a relative parallax of 60.29 mas. Turn it into a distance.`,
      prompt: 'The distance, 1 over the parallax',
      unit: 'pc',
      answer: 16.59,
      tolerance: 0.05,
      hints: [
        'A parallax of p arcseconds is a distance of 1/p parsecs. Convert the milliarcseconds first.',
      ],
      worked:
        '60.29 mas is 0.06029 arcsecond, and 1 ÷ 0.06029 = 16.59 parsecs. It is the middle of an interval, 16.18 to 17.02 at 68 percent, not an exact distance.',
      feedback: {
        close: 'Close. 1000 divided by the parallax in milliarcseconds.',
        'wrong-order-of-magnitude':
          'A power of ten out: milliarcseconds to arcseconds first.',
        off: '1000 ÷ 60.29.',
      },
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'how-many-sigma',
      after: 'the-distance-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How many sigma',
      body: `A parallax is only a measurement when it is well above its own uncertainty. The fit
             gives 60.29 mas with an uncertainty of 1.53 mas.`,
      prompt: 'The parallax over its uncertainty',
      unit: '',
      answer: 39.5,
      tolerance: 1,
      hints: ['Divide the parallax by its uncertainty.'],
      worked:
        '60.29 ÷ 1.53 = 39.4, which the tool reports as 39.5 from the unrounded numbers: a parallax about forty times its own error, so the distance is well determined, to about 2.5 percent.',
      feedback: {
        close: 'Close. The parallax divided by its uncertainty.',
        'wrong-order-of-magnitude':
          'A power of ten out: both are in milliarcseconds.',
        off: '60.29 ÷ 1.53.',
      },
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'fewer-epochs-wider',
      after: 'how-many-sigma',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Fewer epochs, a wider bar',
      body: `Set <strong>Epochs used</strong> to 8, keeping parallax and motion, and read the
             uncertainty of the parallax. With all 14 epochs it was 1.53 mas.`,
      prompt: 'By what factor is the uncertainty larger with 8 epochs?',
      unit: '',
      answer: 1.47,
      tolerance: 0.07,
      hints: [
        'The uncertainty with 8 epochs, divided by the uncertainty with all 14 epochs.',
      ],
      worked:
        'About 2.25 ÷ 1.53 = 1.47. Eight epochs are the least the tool accepts, and they cover only 1.03 years, so the parallax is known to 2.25 mas and the distance to about 4 percent instead of 2.5.',
      feedback: {
        close:
          'Close. Divide the 8-epoch uncertainty by the 14-epoch uncertainty.',
        'wrong-order-of-magnitude': 'A factor near 1 and a half, not ten.',
        off: '(uncertainty with 8 epochs) ÷ (uncertainty with 14 epochs).',
      },
      tool: SP({ fit: 2, n: 8 }),
    },
    {
      sid: 'a-zero-point',
      after: 'fewer-epochs-wider',
      depth: 'advanced',
      type: 'measure',
      title: 'A correction to absolute',
      body: `The reference stars are not at infinity: a relative parallax is smaller than the
             absolute one by their mean parallax. Suppose, as an assumption this investigation states
             and does not measure, that mean is 1.0 mas with an uncertainty of 0.5. Set the
             <strong>Correction</strong> to 1.0 mas, with 14 epochs and the parallax fit, and read
             the absolute parallax and the distance.`,
      fields: [
        { id: 'abs', label: 'Parallax, absolute', unit: 'mas', hint: '61.3' },
        {
          id: 'd',
          label: 'Distance, 1 over the parallax',
          unit: 'pc',
          hint: '16.3',
        },
      ],
      validate: v => {
        if (![v.abs, v.d].every(Number.isFinite)) return null;
        if (near(v.abs, 61.29, 0.3) && near(v.d, 16.32, 0.1)) {
          return {
            level: 'ok',
            message:
              'The absolute parallax is 61.3 ± 1.6 mas and the distance 16.3 pc, 0.3 pc less than the relative one gave. The uncertainty is a little larger, because the correction brings its own 0.5 mas.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the correction to 1.0 mas with parallax and motion and 14 epochs, then read “Parallax, absolute” and the distance.',
        };
      },
      tool: SP({ fit: 2, n: 14, zero: 1 }, []),
    },
    {
      sid: 'which-way-does-it-move',
      after: 'a-zero-point',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Which way the distance moves',
      body: `Compared with the distance from the relative parallax, 16.59 pc, the corrected one
             is 16.32 pc.`,
      prompt:
        'Why is the relative parallax’s distance too large, if the reference stars have a parallax?',
      options: [
        'The reference stars are nearer than the star, so they pull its parallax down',
        'The star’s parallax is measured against stars that have a small parallax of their own, so the relative parallax is the difference and is too small, and 1 over it is too large',
        'A relative parallax is always larger than the absolute one',
        'Nothing: the distance is the same whichever frame is used',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'nearer-references',
          option: 0,
          say: 'The reference stars are farther than the star, which is why they make a reference: what matters is that they are not at infinity, so each moves a little too.',
        },
        {
          id: 'same-distance',
          option: 3,
          say: 'The two differ by 0.3 pc here, and by a larger share for a more distant star, whose parallax is closer to the correction.',
        },
      ],
      hints: ['What is measured when the reference stars also move a little?'],
      because:
        'The reference stars have a parallax of their own, so the star is measured against a frame that moves a little in the same way. What is measured is the difference, which is too small, and one over a number that is too small is too large. The tool says so beside every distance.',
      tool: SP({ fit: 2, n: 14, zero: 1 }, []),
    },
    {
      sid: 'what-limits-the-distance',
      after: 'which-way-does-it-move',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for naming two limits that are not in the stated interval and saying how each moves the distance: the reference stars’ own parallax (the zero point of the frame: the relative distance reads high), the number and spread of the epochs (too few are refused and few give a wide interval), errors that are not independent from epoch to epoch (the interval is too narrow), or orbital motion if the star is a binary (it looks like a parallax). Do not credit saying the interval already includes everything.',
      title: 'What limits the distance',
      body: `The 68 percent interval of 16.18 to 17.02 pc covers the random errors of the fourteen
             positions, with the assumptions the tool states.`,
      prompt:
        'In two or three sentences: name two limits on this distance that the interval does not include, and say which way each moves it.',
      tool: SP({ fit: 2, n: 14 }),
    },
  ],
};

export const A_BINARY_STARS_ORBIT_DEEPER = {
  id: 'a-binary-stars-orbit',
  steps: [
    {
      sid: 'the-mass-by-hand',
      after: 'say-what-the-sum-needs',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The mass by hand',
      body: `Use Kepler&rsquo;s third law, M = a&sup3;/P&sup2;, with the semi-major axis you found in
             astronomical units, 9.08 au, and the period, 14.13 years.`,
      prompt: 'The mass sum',
      unit: 'M_sun',
      answer: 3.75,
      tolerance: 0.1,
      hints: ['Cube the axis in au, square the period in years, and divide.'],
      worked:
        '9.08³ ÷ 14.13² = 748.6 ÷ 199.7 = 3.75 solar masses, which the tool’s 3.76 matches. By hand there is no interval: the tool carries the uncertainties of the orbit and of the parallax through the same formula.',
      feedback: {
        close: 'Close. a cubed over P squared, with a in au and P in years.',
        'wrong-order-of-magnitude':
          'A power of ten out: 9.08 cubed is about 750 and 14.13 squared about 200.',
        off: '9.08³ ÷ 14.13².',
      },
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'a-nearer-star',
      after: 'the-mass-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'If the parallax were 80 mas',
      body: `Set <strong>Parallax, relative</strong> to 80 mas, with the elliptical orbit and all
             twelve epochs, and read the mass sum. The orbit is the same.`,
      prompt: 'The mass sum at 80 mas',
      unit: 'M_sun',
      answer: 7.3,
      tolerance: 0.4,
      hints: [
        'The orbit in au grows as the parallax falls, and the mass goes as its cube.',
      ],
      worked:
        'About 7.3 solar masses: at 80 mas the axis is 0.908 ÷ 0.080 = 11.35 au and 11.35³ ÷ 14.13² = 7.3. A change of 20 percent in the parallax doubled the mass, which is why the distance is the weakest link.',
      feedback: {
        close: 'Close. Read the mass sum with the parallax at 80 mas.',
        'wrong-order-of-magnitude': 'A factor of two from 3.76, not ten.',
        off: 'The mass sum with the parallax set to 80 mas.',
      },
      tool: BO({ n: 12, model: 0, plx: 80 }, []),
    },
    {
      sid: 'eight-epochs',
      after: 'a-nearer-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Eight epochs, a wider period',
      body: `Set <strong>Epochs used</strong> to 8 with the elliptical model and read the
             uncertainty of the period. With all twelve it is 0.06 years.`,
      prompt:
        'By what factor is the period’s uncertainty larger with 8 epochs?',
      unit: '',
      answer: 2.5,
      tolerance: 0.3,
      hints: [
        'The uncertainty with 8 epochs divided by the uncertainty with 12.',
      ],
      worked:
        'About 0.16 ÷ 0.064 = 2.5. The first eight epochs cover 0.74 of a period and the twelve 1.16: the orbit has not yet come round once, and the period is held by less of the arc.',
      feedback: {
        close: 'Close. The 8-epoch uncertainty over the 12-epoch one.',
        'wrong-order-of-magnitude': 'A factor of two or three, not ten.',
        off: '(period uncertainty, 8 epochs) ÷ 0.064.',
      },
      tool: BO({ n: 8, model: 0 }),
    },
    {
      sid: 'the-node',
      after: 'eight-epochs',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The node',
      body: `The tool gives the ascending node as 34.7 &plusmn; 0.7 degrees and says that positions
             alone cannot tell which of the two crossings of the sky is ascending, so it gives the
             node from 0 to 180 degrees.`,
      prompt: 'What would settle which crossing is ascending?',
      options: [
        'More positions on the sky',
        'A smaller parallax uncertainty',
        'The radial velocities of the stars, which say which one moves toward us',
        'A circular model',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'more-positions',
          option: 0,
          say: 'The ambiguity is in the geometry, not the noise: an orbit and its mirror in depth make the same path on the sky, however many positions are taken.',
        },
        {
          id: 'circular',
          option: 3,
          say: 'The circular model is refused for this binary, and it would not fix the ambiguity either.',
        },
      ],
      hints: ['What is the one thing a picture on the sky does not give?'],
      because:
        'Radial velocities. Positions are the sky’s two directions; which side of the orbit is nearer to us is the third, and only motion along the line of sight, measured from the spectrum, tells it.',
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'the-reference-frame',
      after: 'the-node',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A relative parallax and the mass',
      body: `The 100 mas is a parallax relative to reference stars, and the tool says the
             distance and the mass sum read high by those stars&rsquo; mean parallax.`,
      prompt:
        'If the reference stars’ mean parallax is not zero, the true mass sum is…',
      options: [
        'higher than 3.8 solar masses, because the star is nearer',
        'lower than 3.8 solar masses: the absolute parallax is larger, the star is nearer, the orbit smaller in au, and the mass goes as the cube',
        'the same, because the mass does not depend on distance',
        'higher, because the period is longer',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'higher',
          option: 0,
          say: 'A nearer star has a smaller orbit in au for the same angle, and the mass goes as the cube of the orbit. Nearer means lighter, not heavier.',
        },
        {
          id: 'no-distance',
          option: 2,
          say: 'The angle on the sky is fixed; turning it into au, and so into mass, needs the distance. That is why the sum carries the parallax’s uncertainty.',
        },
      ],
      hints: [
        'Which way does the distance move, and what does the orbit in au do?',
      ],
      because:
        'Lower. The absolute parallax is larger than the relative one, so the star is nearer, the same angle is a smaller orbit in au, and the mass sum, which goes as that size cubed, is smaller. The relative mass sum is an upper side of the truth.',
      tool: BO({ n: 12, model: 0 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The crater investigations, deeper (Prompt 195, D-R10-85): the same instruments
// (js/craterWidgets.js); every expected value is recomputed in
// tests/craterLessons.test.js.
// -----------------------------------------------------------------------------
const CRG = (values = {}, hide = []) => ({
  id: 'crater-regions',
  values,
  hide,
});
const CSF = (values = {}, hide = []) => ({
  id: 'crater-sfd',
  values,
  hide,
});
const CBD = (values = {}, hide = []) => ({
  id: 'crater-budget',
  values,
  hide,
});

export const WHICH_SURFACE_IS_OLDER_DEEPER = {
  id: 'which-surface-is-older',
  steps: [
    {
      sid: 'harder-craters',
      after: 'reading-the-interval',
      depth: 'quantitative',
      type: 'measure',
      title: 'Only the largest craters',
      body: `Raise the diameter on the Moon to <strong>50 km</strong>. Fewer craters qualify. Read how many the mare has,
             and the <strong>upper end</strong> of the interval of the density ratio.`,
      fields: [
        { id: 'mare', label: 'Craters in the lunar mare', hint: '2' },
        { id: 'hi', label: 'Upper end of the interval', hint: '84.8' },
      ],
      validate: v => {
        if (![v.mare, v.hi].every(Number.isFinite)) return null;
        if (v.mare === 2 && near(v.hi, 84.8, 1)) {
          return {
            level: 'ok',
            message:
              'The mare has two craters this large and the highland 17: the ratio is 9.5, and its interval runs from 2.3 to 84.8. The verdict has not changed, but the interval has become enormous. Fewer craters give a wider interval, whichever way the counts point.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the Moon, set “Count craters at least” to 50 km and read the number of craters in the mare and the upper end of the interval of the density ratio.',
        };
      },
      tool: CRG({ pair: 0, view: 1, dmin: 50, circles: 1 }),
    },
    {
      sid: 'below-the-limit',
      after: 'harder-craters',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Why will it not compare at 25 km?',
      body: `Set the diameter on the Moon to <strong>25 km</strong>. The instrument refuses a comparison and says the
             diameter is below the one at which the count is complete.`,
      prompt: 'Why is a smaller diameter not allowed?',
      options: [
        'Craters smaller than 30 km do not exist on the Moon',
        'Below 30 km a count of these pictures would miss craters, so a density there would not be the surface’s',
        'The instrument can only count whole numbers of kilometers',
        'Smaller craters have a different age from larger ones',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'none',
          option: 0,
          say: 'There are far more craters below 30 km than above it. The point is that they are the ones a count of this picture would not reach completely: a 25 km crater is 12 pixels across.',
        },
        {
          id: 'age',
          option: 3,
          say: 'A crater’s size is not its age. Small craters are the first to be lost to saturation and to be buried, and the most affected by secondaries, which is the real reason they are counted with care.',
        },
      ],
      hints: ['How many pixels across is a crater of 25 km at 2 km per pixel?'],
      because:
        'A comparison needs both counts complete above the diameter. The Moon’s limit of 30 km is 15 pixels across; the instrument refuses below it rather than compare densities that are partly missing craters.',
      tool: CRG({ pair: 0, view: 0, dmin: 25, circles: 1 }),
    },
    {
      sid: 'the-flip',
      after: 'fewer-craters',
      depth: 'advanced',
      type: 'measure',
      title: 'Where Mars changes its verdict',
      body: `Set Mars to <strong>60 km</strong> and read the density ratio and the <strong>lower end</strong> of its interval.
             Then raise the diameter in steps of 5 km from 20 and watch where the verdict changes.`,
      fields: [
        {
          id: 'ratio',
          label: 'Density ratio, highland over plains',
          hint: '3.00',
        },
        { id: 'lo', label: 'Lower end of the interval', hint: '0.91' },
      ],
      validate: v => {
        if (![v.ratio, v.lo].every(Number.isFinite)) return null;
        if (near(v.ratio, 3.0, 0.05) && near(v.lo, 0.91, 0.03)) {
          return {
            level: 'ok',
            message:
              'A ratio of 3.00 and a lower end of 0.91: the interval holds 1. At 55 km it does not (the lower end is just above 1), at 60 km it does. The verdict depended on where you set the diameter, which is why the diameter has to be stated, and chosen before the counts are read.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mars, set “Count craters at least” to 60 km and read “Density ratio, first over second” and the lower end in brackets.',
        };
      },
      tool: CRG({ pair: 1, view: 0, dmin: 60, circles: 1 }),
    },
    {
      sid: 'no-craters-at-all',
      after: 'the-flip',
      depth: 'advanced',
      type: 'measure',
      title: 'When one region has none',
      body: `Set the Moon to <strong>100 km</strong>. The highland has craters this large and the mare has none. Read how many the
             highland has and the lower end of the interval of the ratio.`,
      fields: [
        { id: 'highland', label: 'Craters in the lunar highland', hint: '5' },
        { id: 'lo', label: 'Lower end of the interval', hint: '1.02' },
      ],
      validate: v => {
        if (![v.highland, v.lo].every(Number.isFinite)) return null;
        if (v.highland === 5 && near(v.lo, 1.02, 0.03)) {
          return {
            level: 'ok',
            message:
              'Five and none. The ratio itself is undefined, and the instrument gives only a floor: at least 1.02. A count of zero is not a count of nothing: it is an upper limit, and the comparison still works, but only in one direction.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the Moon, set “Count craters at least” to 100 km and read the number of craters in the highland and the lower end of the ratio’s interval.',
        };
      },
      tool: CRG({ pair: 0, view: 0, dmin: 100, circles: 1 }),
    },
  ],
};

export const CRATERS_BY_SIZE_DEEPER = {
  id: 'craters-by-size',
  steps: [
    {
      sid: 'raise-the-floor',
      after: 'does-mare-differ',
      depth: 'quantitative',
      type: 'measure',
      title: 'Fit only the largest',
      body: `Choose the <strong>lunar highland</strong> and raise the fit to <strong>60 km</strong>. Read how many craters
             are in the fit and the upper end of the interval.`,
      fields: [
        { id: 'n', label: 'Craters in the fit', hint: '14' },
        { id: 'hi', label: 'Upper end of the interval', hint: '3.56' },
      ],
      validate: v => {
        if (![v.n, v.hi].every(Number.isFinite)) return null;
        if (v.n === 14 && near(v.hi, 3.56, 0.05)) {
          return {
            level: 'ok',
            message:
              'Fourteen craters, an index of 2.24 and an interval from 1.23 to 3.56: more than twice as wide as with 40. Raising the floor throws away craters, and every one thrown away costs width.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the lunar highland (0), set “Fit craters at least” to 60 km and read the number of craters in the fit and the upper end of the interval.',
        };
      },
      tool: CSF({ region: 0, dmin: 60, miss: 0 }, ['miss']),
    },
    {
      sid: 'unbiased-form',
      after: 'raise-the-floor',
      depth: 'quantitative',
      type: 'measure',
      title: 'The unbiased form',
      body: `The maximum-likelihood index is <em>n</em>/<em>S</em>, where <em>S</em> is the sum of ln(<em>D</em>/<em>D</em><sub>min</sub>).
             With few craters it is biased high; <em>(n &minus; 1)/S</em> is the unbiased form. Choose the <strong>lunar mare</strong>,
             fitted from <strong>30 km</strong>, and read the unbiased index.`,
      fields: [
        {
          id: 'unbiased',
          label: 'Index, unbiased form (n − 1) / S',
          hint: '2.97',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.unbiased)) return null;
        if (near(v.unbiased, 2.97, 0.04)) {
          return {
            level: 'ok',
            message:
              '2.97, against the maximum-likelihood 3.47: the ratio is (n − 1)/n, 6 over 7. With 91 craters the two agree to a fraction of a percent. The interval is the exact chi-square one and does not depend on which you quote.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the lunar mare (1), set “Fit craters at least” to 30 km and read “Index, unbiased form”.',
        };
      },
      tool: CSF({ region: 1, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'why-not-a-line',
      after: 'what-the-flag-says',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why not draw a line through the points?',
      body: `The plot shows points joined, to the eye, by a line. The index is not the slope of a line fitted to them.`,
      prompt:
        'Why is a straight-line fit to the plotted points the wrong tool?',
      options: [
        'A line is always better: it uses every point on the plot',
        'The points are not independent (each counts every larger crater too) and their errors are not Gaussian, so the line’s interval would be wrong',
        'A line cannot be fitted on a logarithmic scale',
        'The maximum-likelihood index is the line fit, written differently',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'always',
          option: 0,
          say: 'Using every point is not the same as using every crater. The points share their craters: the largest crater is in every one of them, and a fit that treats them as separate counts its information many times over.',
        },
        {
          id: 'same',
          option: 3,
          say: 'They differ: the maximum-likelihood index weights each crater once and has an exact interval. A least-squares line through the cumulative points weights the large-diameter end, where the points are few and correlated, as much as the small end.',
        },
      ],
      hints: ['How many of the plotted points include the largest crater?'],
      because:
        'Each cumulative point includes all the craters to its right, so the points are correlated, and the error of a count is Poisson, not Gaussian. The fit uses the craters, once each, and gets an exact interval.',
      tool: CSF({ region: 0, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'the-limit-is-the-picture',
      after: 'why-not-a-line',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why 30 km, when the catalog goes lower?',
      body: `The lunar catalog says it is complete down to about 8 km, and the instrument still marks 30 km as the
             completeness limit for the lunar highland.`,
      prompt: 'Why?',
      options: [
        'The catalog is wrong below 30 km',
        'The limit belongs to a count made on this picture: 30 km is about 15 pixels across at 2 km per pixel, the least that can be placed reliably',
        'Craters smaller than 30 km do not exist on the Moon',
        'The Poisson interval is not valid below 30 km',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'wrong',
          option: 0,
          say: 'The catalog was made from other data, at a finer scale, and its own completeness is stated. The limit here is for the picture: a count by a person of this map cannot be complete where the craters are only a few pixels across.',
        },
        {
          id: 'poisson',
          option: 3,
          say: 'The Poisson interval is fine for any number of independent craters. What fails below the limit is that the list is no longer all the craters, which no interval can repair.',
        },
      ],
      hints: ['What is a crater 20 km across, in pixels?'],
      because:
        'Completeness depends on the data a count is made from. The same surface needs a different limit on a different picture, so the limit is stated with the picture, and a fit below it is flagged as untrustworthy.',
      tool: CSF({ region: 0, dmin: 20, miss: 0 }),
    },
  ],
};

export const WHAT_A_CRATER_DIAMETER_IS_WORTH_DEEPER = {
  id: 'what-a-crater-diameter-is-worth',
  steps: [
    {
      sid: 'a-small-circle',
      after: 'the-correction',
      depth: 'quantitative',
      type: 'measure',
      title: 'A small circle',
      body: `Set the rim point to <strong>5 pixels</strong> from the center, a crater 10 pixels across. Read the diameter and the
             uncertainty from <strong>placing the circle</strong>, as a percentage.`,
      fields: [
        { id: 'D', label: 'Diameter', unit: 'km', hint: '22.4' },
        {
          id: 'fit',
          label: 'Uncertainty from placing the circle',
          unit: '%',
          hint: '8.2',
        },
      ],
      validate: v => {
        if (![v.D, v.fit].every(Number.isFinite)) return null;
        if (near(v.D, 22.4, 0.3) && near(v.fit, 8.2, 0.2)) {
          return {
            level: 'ok',
            message:
              '22.4 km, with 8.2 percent from placing the circle. A hand places a point to a fraction of a pixel, and that fraction is a larger share of a small circle: the term goes as one over the radius. Under 8 pixels across a circle is too small to place, and the instrument says so.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Rim point, distance from the center” to 5 px, leave the rest as it is, and read the diameter and “Uncertainty from placing the circle”.',
        };
      },
      tool: CBD({ r: 5 }, ['dmin', 'catalog']),
    },
    {
      sid: 'coin-toss',
      after: 'a-small-circle',
      depth: 'quantitative',
      type: 'measure',
      title: 'Is it at least 110 km across?',
      body: `A count above 110 km needs to know whether this crater is in it. With the circle back at 25 pixels, set
             <strong>Counting craters at least</strong> to <strong>110 km</strong> and read the chance that this crater is
             at least that large, given its uncertainty.`,
      fields: [
        {
          id: 'p',
          label: 'Chance the crater is at least 110 km across',
          unit: '%',
          hint: '63',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.p)) return null;
        if (near(v.p, 63, 2)) {
          return {
            level: 'ok',
            message:
              '63 percent. The diameter is 112.0 ± 5.9 km, so a threshold at 110 km is a third of a sigma away. A crater near the threshold is a coin toss for the count, and the diameter’s uncertainty is reported apart from the Poisson interval of the count, never added to it.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the circle at its start, set “Counting craters at least” to 110 km and read “Chance it is at least 110 km across”.',
        };
      },
      tool: CBD({ dmin: 110 }, ['catalog']),
    },
    {
      sid: 'which-improvement',
      after: 'why-no-age',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The best improvement',
      body: `Four things could shrink the diameter’s uncertainty: a better scale for the map, a more careful hand,
             agreeing on where a rim is, and a better estimate of the view.`,
      prompt: 'Which would shrink it most for this circle?',
      options: [
        'a better scale: the scale term sets the budget',
        'a more careful hand: it places the circle to a pixel',
        'agreeing, by a convention, on where the rim is',
        'a better estimate of the view',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'scale',
          option: 0,
          say: 'The scale is already known to 0.06 percent. Shrinking a term that is already a hundredth of the total changes nothing.',
        },
        {
          id: 'hand',
          option: 1,
          say: 'A more careful hand shrinks the 1.6 percent of placing the circle, which adds to the 5 percent of the rim in quadrature: it makes almost no difference.',
        },
      ],
      hints: ['Terms add in quadrature: which one dominates the sum?'],
      because:
        'The terms add as squares, so the largest dominates. Here it is where the rim is, 5 percent. A convention that fixes it, such as the same rim definition for every crater, is what craters counted by different people need, and that is a different kind of work from a better instrument.',
      tool: CBD({}, ['dmin', 'catalog']),
    },
    {
      sid: 'against-the-catalog',
      after: 'which-improvement',
      depth: 'advanced',
      type: 'measure',
      title: 'Against the catalog',
      body: `Switch <strong>The catalog&rsquo;s circles</strong> on. The catalog lists a crater under the center of your circle.
             Read its diameter.`,
      fields: [
        { id: 'D', label: 'The catalog’s diameter', unit: 'km', hint: '112.2' },
      ],
      validate: v => {
        if (!Number.isFinite(v.D)) return null;
        if (near(v.D, 112.2, 0.3)) {
          return {
            level: 'ok',
            message:
              'The catalog gives 112.2 km and the circle 112.0 ± 5.9: they agree, well inside one sigma. That is agreement between two measurements, each with its own uncertainty, and not a check against the truth: the catalog is another person’s circles.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch “The catalog’s circles” on and read “The catalog’s crater under your center”.',
        };
      },
      tool: CBD({ catalog: 1 }, ['dmin']),
    },
  ],
};

const CRATER_CONTENT = {
  'which-surface-is-older': {
    topic:
      'Relative age by crater density: the number of craters at least one diameter across per area in two regions of the Moon and of Mars, its Poisson interval, the ratio of the two densities with an exact interval, and what that ratio assumes.',
    difficulty: 'Introductory (counting, division, one idea of an interval)',
    placement:
      'In a survey course after the unit on the Moon and the terrestrial planets; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 9 (section 9.2, the Moon), and the chapter citation is the author’s and has not been checked against the book.',
    overview:
      'Students predict that the lunar highland is denser in craters than the dark mare, count craters at least 30 km across in each (40 and 7), convert to densities per million km² (131.2 and 20.5, because the regions differ in area), read the density ratio 6.39 with its interval 2.83 to 16.9, and say what it does and does not mean. On Mars above 20 km the highland is 6.50 times the plains (3.68 to 12.4). At 60 km the Martian verdict becomes no significant difference, and a question separates that from the same age. The deeper steps show the interval widening at 50 km (2 craters in the mare, upper end 84.8), the refusal below the completeness limit, the Martian verdict flipping at 60 km, and a ratio with a zero count.',
    priorKnowledge: [
      'Craters are made by impacts, and impacts continue',
      'A density is a count divided by an area',
      'A count is a little uncertain: a different patch would give a different number',
    ],
    keyConcepts: [
      {
        heading: 'Density, not count',
        body: 'The highland has 40 craters and the mare 7 above 30 km, but the regions differ in size: the comparison is per area, 131.2 against 20.5 per million km².',
      },
      {
        heading: 'A ratio with an interval',
        body: 'Given the two counts, the share that fall in the first region is binomial, and its exact (Clopper-Pearson) interval gives the ratio’s interval. An interval that holds 1 means these counts cannot separate the surfaces, not that they are equal.',
      },
      {
        heading: 'What the ratio assumes',
        body: 'One production function for both surfaces, no saturation or partial resurfacing, secondaries not a large share, a count complete above the diameter used, independent craters. It is a ratio, not an age in years.',
      },
    ],
    features: [
      {
        name: 'Crater instruments (crater family)',
        text: 'Two regions of the Moon and of Mars, the catalog’s circles on the pictures (not marks anyone made), each density with its 95 percent interval, the ratio and its verdict, and the refusals (below the completeness limit, too few craters).',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the largest craters only, and why 25 km is refused on the Moon. Advanced: where Mars changes its verdict, and a region with no craters at all.',
      },
      {
        name: 'Predictions before answers',
        text: 'Which lunar region is denser is predicted before the counts are read, and is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'More craters means older, whatever the area.',
        response:
          'The count has to be per area: the lunar highland and mare differ in area, and the comparison is the density with its interval.',
      },
      {
        claim: 'A density ratio of 6.4 means 6.4 times the age.',
        response:
          'It is a ratio of densities above one diameter. Turning it into years needs a chronology and corrections for saturation, secondaries and completeness; none is applied.',
      },
      {
        claim: '“No significant difference” means the same age.',
        response:
          'It means the interval holds 1: the counts cannot tell. Mars at 60 km shows it, with 12 and 4 craters.',
      },
      {
        claim: 'Small craters count the same as large ones.',
        response:
          'Small craters are the numerous ones, the hardest to count completely and the first lost to saturation, and most affected by secondaries. A count is made above a diameter at which it is complete.',
      },
      {
        claim: 'Secondaries, resurfacing and saturation only add noise.',
        response:
          'They bias: resurfacing and saturation make a surface look younger, secondaries older. The interval allows only for chance among independent craters.',
      },
    ],
    teachingNotes: [
      'The circles are the catalogs’ (LU78287GT for the Moon, Robbins for Mars), made by their authors from other data. Nobody has marked these pictures, and the instrument says so on every row.',
      'The Moon’s highland box takes in an edge of Mare Nubium, which lowers its density: the verdict is reached against, not for, the expectation.',
      'The Mars catalog states no license; only each crater’s diameter and position at least 20 km are used, with credit (a recorded decision, D-R10-77).',
      'The areas have their own uncertainty (0 for the Moon, 0.3 percent for Mars), which is stated and is not in the interval.',
    ],
    discussion: [
      'Why does a surface that was flooded by lava look younger than the rocks beneath it?',
      'What would you want to know about a count before comparing it with another?',
      'Why is a ratio with an interval a better thing to report than a ratio alone?',
    ],
    extensions: [
      'Continue with Craters by Size, which reads the size-frequency plot and its slope.',
      'Pick a diameter before looking at the counts, as a pre-registered choice, and see how the verdict on Mars moves with the diameter.',
    ],
    modelNotes:
      'js/measure/craters.js (CRATER_COUNTING.md): cumulative, relativeAge with its exact interval and refusals, validated against scipy and on a seeded ensemble (npm run craters:validate); the four regions in frames/craters-regions.json.',
  },
  'craters-by-size': {
    topic:
      'The cumulative size-frequency distribution of craters with Poisson intervals, the power-law index with an exact interval, how the number of craters in the fit sets its width, and a roll-off at small diameters that is flagged and not corrected.',
    difficulty: 'Intermediate (logarithms, a power law, intervals)',
    placement:
      'After Which Surface Is Older, whose counts and intervals it reuses. It supports OpenStax Astronomy 2e chapter 9 (section 9.2); the citation is the author’s and has not been checked against the book.',
    overview:
      'Students read the cumulative plot of the lunar highland above 30 km (index 1.71, interval 1.22 to 2.28, from 40 craters), predict that the Martian highland’s interval will be narrower and read it (1.39 to 2.09, from 91), see the mare’s 3.47 (1.39 to 6.47) from seven craters, and say what that can and cannot show. Leaving out the smallest craters of the highland (a count that stops short) bends the list: the index falls to 1.01 and the slope check flags it (z 2.77). Deeper: fitting only above 60 km (14 craters, upper end 3.56), the unbiased form, why a line is not fitted to the points, and why the limit belongs to the picture.',
    priorKnowledge: [
      'Which Surface Is Older: counts, densities and a Poisson interval',
      'Logarithmic axes and a power law as a straight line',
      'A maximum-likelihood estimate as the value the data make most likely',
    ],
    keyConcepts: [
      {
        heading: 'The slope and the level answer different questions',
        body: 'The slope, the index b, is the shape of the size distribution. The level, how many craters there are per area, is what a relative age rests on. A steeper slope is not an older surface.',
      },
      {
        heading: 'The interval is set by n',
        body: 'An index from n craters has an interval that shrinks about as one over the square root of n: 1.06 wide from 40, 0.71 from 91.',
      },
      {
        heading: 'A flag is not a cure',
        body: 'The slope check flags a list that is not one power law. It cannot name the cause (an incomplete count, saturation, resurfacing, a real break) and corrects nothing; the roll-off is not corrected here.',
      },
    ],
    features: [
      {
        name: 'Size-frequency instrument',
        text: 'The cumulative plot through the plot component, with an asymmetric Poisson interval on each point, the fitted power law, the index with its exact chi-square interval and its unbiased form, the check above twice the fit diameter, and a control that leaves out the smallest craters as a count of the picture would miss them.',
      },
      {
        name: 'A controlled perturbation',
        text: 'The stopped-short list is made from the published list by leaving out the smallest craters below the completeness limit; it is labeled as such on its row and is not data.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the largest craters only, and the unbiased index. Advanced: why a line is not fitted to the points, and where a completeness limit comes from.',
      },
    ],
    misconceptions: [
      {
        claim: 'A steeper slope means an older surface.',
        response:
          'The slope is the shape of the size distribution; the age rests on the level of the plot.',
      },
      {
        claim: 'An index is a number; an interval is a footnote.',
        response:
          'The mare’s 3.5 from seven craters runs from 1.4 to 6.5: nearly all uncertainty.',
      },
      {
        claim: 'Small craters count the same as large ones.',
        response:
          'They are the most numerous and the hardest to count completely; leave them out and the plot bends.',
      },
      {
        claim: 'A straight line through the plotted points is the right fit.',
        response:
          'The cumulative points share their craters, and the errors are Poisson: the fit uses each crater once.',
      },
    ],
    teachingNotes: [
      'No roll-off is visible in the published lists above 20 km; the perturbation exists so that a student can see what the flag does. A real roll-off from saturation or resurfacing would bend the plot in the same way.',
      'The Moon’s completeness limit, 30 km, belongs to a count on the 2 km per pixel picture, not to the catalog, which is complete to about 8 km.',
      'The index here is cumulative; the incremental or differential index is one larger.',
      'The mare’s slope is the uncertain one because it rests on seven craters, not because the mare is a different kind of surface; a student who blames the surface has not yet read the interval as a statement about the count.',
    ],
    discussion: [
      'What would you need in order to tell a real roll-off from a count that stopped short?',
      'Why is the interval of the Martian highland’s index narrower than the Moon’s?',
      'Why would a different person counting the same picture get a different list?',
    ],
    extensions: [
      'Continue with What a Crater Diameter Is Worth, which takes a circle apart.',
      'Fit the plains and highland of Mars from 30 km and ask whether their intervals overlap.',
    ],
    modelNotes:
      'js/measure/craters.js (CRATER_COUNTING.md): powerLaw (maximum likelihood, exact chi-square interval, constancy check) and cumulative (Garwood intervals), validated against scipy and by coverage on a seeded ensemble, with the roll-off check committed first (npm run craters:validate).',
  },
  'what-a-crater-diameter-is-worth': {
    topic:
      'The diameter of one crater from a circle on a map: the scale, the view of a sphere, and the four terms of the uncertainty, in quadrature; why a correction can be large and certain; and why no age in years is reported.',
    difficulty: 'Advanced (error propagation, a geometric correction)',
    placement:
      'In an upper-level course, after Which Surface Is Older. It supports OpenStax Astronomy 2e chapter 9; the citation is the author’s and has not been checked against the book.',
    overview:
      'Students read the diameter of a circle set on a large crater of the lunar highlands, 112.0 ± 5.9 km, predict that where the rim is dominates the uncertainty (5.0 of 5.3 percent), and read the four terms. Switching the view’s correction off lowers the diameter by 9.8 percent, to 101.1 km, against an uncertainty of 0.06 percent from the correction: a large, well-known effect. A question names what an age in years would need and has not passed its test. Deeper: a circle five pixels from its center (22.4 km, 8.2 percent from placing it), the chance a crater near a threshold counts (63 percent at 110 km), which improvement would shrink the budget, and the agreement with the catalog (112.2 km).',
    priorKnowledge: [
      'Which Surface Is Older: a count above a diameter',
      'Adding uncertainties in quadrature',
      'A map has a scale, and a view of a sphere is foreshortened toward its edge',
    ],
    keyConcepts: [
      {
        heading: 'Four terms, added in quadrature',
        body: 'The scale of the map (0.06 percent), placing the circle (1.6), where the rim is (5.0, set by the reader) and the view (0.06). The largest dominates the sum.',
      },
      {
        heading: 'A correction is not an error bar',
        body: 'The view stretches the radius by 1.108: a 10 percent correction, with its own uncertainty at 0.06 percent. Leaving it out is a systematic error.',
      },
      {
        heading: 'A diameter is not an age',
        body: 'An age needs a production function, a chronology, corrections for saturation and secondary craters, and a completeness correction checked on craters of known size. None is applied.',
      },
    ],
    features: [
      {
        name: 'Budget instrument',
        text: 'A circle on a Clementine map of the Moon’s southern highlands, with its ground ellipse drawn, the diameter with its four terms, the view’s correction with and without, the chance a crater counts above a threshold, and the catalog’s crater under the center.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: a small circle, and a crater near a threshold. Advanced: the best improvement, and the catalog as another measurement.',
      },
      {
        name: 'Honest limits on the screen',
        text: 'The recognition term is a number the reader sets, and the instrument says it is no measurement; the age is stated as not reported, with its reasons.',
      },
    ],
    misconceptions: [
      {
        claim: 'Once the scale is known, the diameter is exact.',
        response:
          'The scale is the smallest term. The rim’s position and the placement of the circle are larger.',
      },
      {
        claim:
          'A tiny uncertainty on a correction means the correction is unimportant.',
        response:
          'It means the correction is known well. Its size, ten percent here, is why it must be applied.',
      },
      {
        claim: 'A diameter good to five percent is good enough for an age.',
        response:
          'The obstacles to an age are the production function, the chronology and the corrections, not the diameter.',
      },
      {
        claim:
          'The catalog’s diameter is the right answer and mine is the test.',
        response:
          'The catalog is another measurement, made by other people from other data with its own error. Two measurements that differ by their errors agree; neither is the truth.',
      },
    ],
    teachingNotes: [
      'The circle is the reader’s, a rim point and a center; the catalog’s circles are another measurement of other data and are not the truth.',
      'The sigma of the view’s cos E comes from a one-pixel allowance on the disc, a stated input; the Moon is treated as a sphere of 1,737.4 km and the picture as orthographic about the center of the disc.',
      'A crater under 8 pixels across is below what a person can place: the comparison of counts refuses it.',
      'No absolute age is computed anywhere in Gravitas yet (Prompt 196 decides whether any can be).',
    ],
    discussion: [
      'Who decides where a rim is, and what would two people’s disagreement cost a density ratio?',
      'Why is a correction that moves every diameter ten percent worse than an error bar of ten percent?',
      'What would a test of a completeness correction on craters of known size look like?',
    ],
    extensions: [
      'Move the circle to a different crater and see how the view changes the correction with distance from the center of the disc.',
      'Set the recognition to 0 and ask what remains of the budget.',
    ],
    modelNotes:
      'js/measure/craters.js (CRATER_COUNTING.md): diameterOf (the budget by component, the foreshortening of an orthographic view), cumulative (the boundary expectation), validated analytically and by coverage of the diameter budget (npm run craters:validate).',
  },
};

const CRATER_EXPECTATIONS = {
  'which-surface-is-older': {
    'count-the-moon': 'Exactly 40 craters in the highland and 7 in the mare.',
    'per-area':
      'Densities 131.2 (within 0.6) and 20.5 (within 0.3) per million km².',
    'ratio-moon':
      'A ratio of 6.39 (within 0.1) with a lower end of 2.83 (within 0.1).',
    'mars-pair':
      'A ratio of 6.50 (within 0.1) with a lower end of 3.68 (within 0.1).',
  },
  'craters-by-size': {
    'highland-slope':
      'An index of 1.71 with an interval from 1.22 to 2.28 (each within 0.03).',
    'mars-slope': 'An interval from 1.39 to 2.09 (each within 0.03).',
    'thin-mare':
      'An index of 3.47 (within 0.05) and an upper end of 6.47 (within 0.08).',
    'roll-off': 'An index of 1.01 (within 0.04) and a z of 2.77 (within 0.1).',
  },
  'what-a-crater-diameter-is-worth': {
    'read-the-diameter':
      'A diameter of 112.0 km (within 0.6) and an uncertainty of 5.9 km (within 0.3).',
    'the-budget':
      'Placing the circle 1.6 percent and the rim 5.0 percent (each within 0.1).',
    'the-correction':
      'A diameter of 101.1 km (within 0.6), 9.8 percent smaller (within 0.5).',
  },
};

const CRATER_BANDS = {
  'which-surface-is-older': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'craters-by-size': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
  'what-a-crater-diameter-is-worth': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
};

export const INSTRUCTOR = {
  content: {
    ...CRATER_CONTENT,
    'what-is-a-measurement': {
      topic:
        'What a measurement is: repeated marks of one synthetic star, their spread, the mean and its standard error, and what the standard error does not include',
      difficulty: 'Introductory (model-driven)',
      placement:
        'First of three. It needs only arithmetic and the idea of a position on a picture, and can open any course that will later quote an uncertainty. It supports OpenStax Astronomy 2e chapter 6 on how astronomers observe, and it is the first investigation of the observing-and-measuring sequence.',
      overview:
        'Students look at five marks of one synthetic star: a blurred spot at a position the investigation chose, 31.4 and 27.9 pixels, marked by a model of a careful person with a scatter of 0.8 pixel. They predict that careful marks differ, read the mean x (31.10) and spread (0.80) and the standard error (0.36), predict and measure what twenty marks buy (0.17, a factor of 2.06), predict where the truth lies and then see the mean 0.30 pixel from it (0.84 standard errors), and meet a star twice as wide (spread 1.60, error 0.71). The quantitative depth reports a position with its error bar and asks how many marks give a tenth of a pixel (64). The advanced depth adds an offset the same in every mark and shows that the standard error falls while the error does not: six standard errors with 30 marks.',
      priorKnowledge: [
        'A position on a picture in pixels',
        'The mean of a few numbers',
        'Square roots',
      ],
      keyConcepts: [
        {
          heading: 'Careful marks still differ',
          body: 'A blurred spot has no single edge, so each mark lands a little to one side. The spread is a property of the marking.',
        },
        {
          heading: 'The standard error',
          body: 'The spread divided by the square root of the number of marks is how far the mean typically lies from the truth: four times the marks halve it.',
        },
        {
          heading: 'What it leaves out',
          body: 'An offset shared by every mark is not scatter, so more marks never reduce it and the standard error does not include it.',
        },
      ],
      features: [
        {
          name: 'Frame-marks instrument (claim family)',
          text: 'A synthetic 64 by 64 pixel frame with a blurred star, the first marks of a fixed seeded sequence (up to 30), the width of the star, an optional offset of every mark and a switch that shows the true position. The readout lists every mark, the mean, the spread and the standard error on both axes, and (with the truth shown) the error of the mean.',
        },
        {
          name: 'The synthetic truth',
          text: 'The star’s true position is set by the investigation and shown only after the prediction before it, so a student can see how near the mean lands. A real frame has no such answer; the investigation says so and uses no authentic data.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: the position with its error bar, and the number of marks for a standard error of 0.1 pixel (64). Advanced: an offset of 1.0 pixel, 30 marks, 6.2 standard errors from the truth, and what the plus-or-minus is a statement about.',
        },
      ],
      misconceptions: [
        {
          claim: 'A careful measurement gives the same number every time.',
          response:
            'The marks of one blurred star differ by 0.8 pixel however carefully each is placed.',
        },
        {
          claim: 'The mean of the marks is the true position.',
          response:
            'It is 0.30 pixel from it here, 0.84 standard errors: an estimate near the truth.',
        },
        {
          claim: 'With enough marks the standard error reaches zero.',
          response:
            'It falls as the square root of the number of marks, so 64 marks are needed for a tenth of a pixel.',
        },
        {
          claim: 'The standard error is the whole error.',
          response:
            'An offset in every mark leaves it at 0.14 pixel and the mean six of them from the truth.',
        },
      ],
      teachingNotes: [
        'The frame and the marks are synthetic: the marks are the true position plus a fixed seeded pointing error that scales with the width of the star (one fifth of the width), so every student sees the same numbers.',
        'The instrument takes the first N marks of one sequence, so more marks extend the same list rather than start a new one. That is why 20 marks give a factor of 2.06 and not exactly 2.',
        'The truth is hidden until the prediction before it has been made; the switch is hidden from the earlier steps.',
        'No authentic data are used on purpose: the truth is the point of the investigation.',
      ],
      discussion: [
        'What would you do if one of the five marks were far from the others?',
        'What could cause a mark offset like the one in the advanced step in a real measurement, and how would you find it?',
        'Why does a blurrier picture make the same number of marks less useful?',
      ],
      extensions: [
        'Continue with What Does ± Claim?, which checks a stated uncertainty against repeats.',
        'Use the Observatory’s marks on an image once a real frame is available, and compare the spread of your own marks with this one.',
      ],
      modelNotes:
        'js/claimWidgets.js (frameMarks, marksView): the true position (31.4, 27.9), one pointing error of 0.2 of the width per axis, fixed seed claim-marks-151, 30 marks; the readout rows are the sample statistics. See MEASUREMENT_CLAIMS.md.',
    },
    'what-does-plus-minus-claim': {
      topic:
        'What a stated uncertainty claims: coverage over a seeded ensemble of repeats, a biased instrument with a small scatter, an asymmetric interval and an upper limit',
      difficulty: 'Introductory (model-driven)',
      placement:
        'After What Is a Measurement?. It needs the mean and the standard error and the idea of a fraction of repeats. It supports OpenStax Astronomy 2e chapter 6 and any course that reports a value with an uncertainty.',
      overview:
        'Students check claims against a seeded ensemble of 2000 repeats whose truth is known. An honest interval of one sigma holds the truth 1361 times (68.0 percent) and of two sigma 1901 times (95.0 percent). A biased instrument with a scatter of 0.3 that reads 0.4 high holds it 36.3 and 74.4 percent of the time: a small plus-or-minus is precision, not accuracy. A parallax of 3.0 ± 0.9 mas carried through the distance 1000 over the parallax gives an asymmetric interval with 68.0 percent coverage (17 repeats have no upper end), and the symmetric shortcut holds 78.3 percent. A 95 percent upper limit from a Poisson count covers 95.6 percent at a true rate of 3.0 and 98.7 at 4.0. The quantitative depth adds the uncertainty of a coverage (4.6 percent from 100 repeats, 1.04 from 2000), the biased coverage by hand (36.1) and the limit from a count of zero (3.0). The advanced depth states what a check against a known truth cannot do and why an upper limit does not hit its level.',
      priorKnowledge: [
        'A mean and a standard deviation',
        'The normal curve in words: about two thirds within one sigma',
        'What a probability of a repeat is',
      ],
      keyConcepts: [
        {
          heading: 'Coverage',
          body: 'A one-sigma claim says about two repeats in three put the truth inside their own interval, and a two-sigma claim nineteen in twenty.',
        },
        {
          heading: 'Precision is not accuracy',
          body: 'A small stated uncertainty says the repeats agree. Only a check against the truth, or another method, says they are right.',
        },
        {
          heading: 'Claims carried through a function',
          body: 'An interval carried through a division is asymmetric, and a symmetric error bar propagated to first order does not keep its coverage.',
        },
      ],
      features: [
        {
          name: 'Coverage-repeats instrument (claim family)',
          text: 'A seeded ensemble of up to 4000 repeats of four cases (an honest instrument, a biased one, a parallax turned into a distance, a Poisson count with an upper limit), with the half-width in sigmas, the number of repeats, the form of the distance interval and the true rate. The picture shows the first 40 intervals, the readout counts them all with the binomial uncertainty of the coverage.',
        },
        {
          name: 'The synthetic truth',
          text: 'Every repeat is a seeded draw from a distribution whose true value is known, so a claim can be counted. The picture shows the first 40 repeats; the readout counts them all and gives the binomial uncertainty of the count.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: the count’s own uncertainty, the binomial and bias coverages by hand, the limit from zero counts. Advanced: what the check cannot do with real data, and why a limit is conservative.',
        },
      ],
      misconceptions: [
        {
          claim: 'An honest claim is one that is never wrong.',
          response:
            'A one-sigma interval fails about one repeat in three by design: 1361 of 2000 hold the truth.',
        },
        {
          claim: 'A small error bar means an accurate measurement.',
          response:
            'The biased instrument’s intervals hold the truth only 36.3 percent of the time.',
        },
        {
          claim:
            'Carrying ± through a formula gives an interval with the same coverage.',
          response:
            'The symmetric shortcut holds 78.3 percent at one sigma; the asymmetric interval holds 68.0.',
        },
        {
          claim: 'An upper limit is exactly its stated confidence.',
          response:
            'It is at least that: 95.6 percent at one rate and 98.7 at another.',
        },
      ],
      teachingNotes: [
        'The ensemble is one fixed seeded stream of normal and uniform draws (claim-ensemble-1 and -2) taken in order, so a smaller number of repeats is a prefix of the larger and every student sees the same count.',
        'The asymmetric case and the honest case use the same draws, so their coverages are identical by construction: the asymmetric interval is the same claim as the symmetric one on the parallax.',
        'The upper limit is the classical one-sided Poisson limit (the rate at which the observed count or fewer has a probability of 5 percent), computed by bisection.',
        'A coverage from 2000 repeats carries about one percentage point of its own noise, which the readout states. Tolerances in the steps allow for it.',
      ],
      discussion: [
        'A paper states 4.2 ± 0.3. What would you check first?',
        'When is a symmetric error bar a fair summary of an asymmetric interval?',
        'Why would a collaboration prefer an upper limit to a value with a large uncertainty when it sees nothing?',
      ],
      extensions: [
        'Continue with When the Method Must Refuse.',
        'Open the Experiments page and repeat a measurement of your own with a seed, then count its coverage against a known input.',
      ],
      modelNotes:
        'js/claimWidgets.js (coverageView): seeded draws, symmetric (σ = 1), biased (σ = 0.3, offset 0.4), parallax 3.0 ± 0.9 mas, upper limit by bisection on the Poisson distribution at 95 percent. See MEASUREMENT_CLAIMS.md.',
    },
    'when-the-method-must-refuse': {
      topic:
        'When a method must say "not constrained": a two-parameter fit whose data fix only a product, the profile, and a straight line fitted to data that are not straight',
      difficulty: 'Intermediate (model-driven)',
      placement:
        'After What Does ± Claim?. It needs the idea of a chi-square and a fitted parameter. It supports any course that fits a model with more than one parameter, and it is the last of the three measurement investigations.',
      overview:
        'Students read a synthetic radial-velocity result that fixes only the product of a planet’s mass and the sine of its orbit’s tilt, 0.85 ± 0.06 Jupiter masses. At a trial mass of 2.0 the best tilt is 0.425 and the fit is perfect; at 0.5 it is pinned at 1 and costs 34 in chi-square; the smallest allowed mass is 0.79 at one sigma and 0.73 at 95 percent, and there is no largest mass. The honest report is a lower bound with "not constrained" above it. Then a straight line is fitted to six points: slope 1.078 ± 0.024 with a reduced chi-square of 7.6 on four degrees of freedom and a p-value below 0.001, so the analysis refuses the fit and claims no slope; a parabola fits (reduced chi-square 0.37, squared term 0.089). The step graded on the refusal is the choice between reporting, rescaling and refusing. The quantitative depth does the 95 percent bound (0.732) and the degrees of freedom (4) by hand. The advanced depth states what a prior on the tilt would add and what a fitting model does not prove.',
      priorKnowledge: [
        'A chi-square as a sum of squared misses in units of the error',
        'A fitted parameter with a formal uncertainty',
        'The idea of a sine of an angle between 0 and 1',
      ],
      keyConcepts: [
        {
          heading: 'A profile',
          body: 'For each trial value of one parameter, the best fit left when the other is free: where it costs nothing the value is allowed.',
        },
        {
          heading: 'Not constrained',
          body: 'When the profile is flat the data say nothing there, and the honest result is a bound, or no bound, never a number.',
        },
        {
          heading: 'Refusing a model',
          body: 'A formal uncertainty only means something if the model describes the data. A reduced chi-square far above 1 with a small p-value says it does not.',
        },
      ],
      features: [
        {
          name: 'Profile-refusal instrument (claim family)',
          text: 'Two cases. The product case shows the profile of the chi-square against a trial mass (log axis, lines at 1 and 3.84), the best tilt and the chi-square at the trial mass, and the lower bounds. The line case shows six points with error bars, the fitted line or parabola, the slope with its formal uncertainty, the degrees of freedom, the chi-square, the reduced chi-square and the p-value.',
        },
        {
          name: 'The synthetic truth',
          text: 'Both data sets are made for the investigation with the truth built in: a product of two parameters, and six points from a curve with seeded errors. No authentic data are used, so every refusal is the method’s own and not a limit of the data.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: the 95 percent bound by hand (0.732) and the degrees of freedom (4). Advanced: what an orientation prior adds, and what a model that fits does not prove.',
        },
      ],
      misconceptions: [
        {
          claim: 'The fit gives the planet’s mass as 0.85 ± 0.06.',
          response:
            'That is the product of the mass and the sine of the tilt; the mass alone has a lower bound of 0.79 and no upper bound.',
        },
        {
          claim: 'A bound needs an upper and a lower edge.',
          response:
            'The profile is flat for every mass above the product, so the data allow any of them.',
        },
        {
          claim:
            'A poor fit can be rescued by scaling the errors until the reduced chi-square is 1.',
          response:
            'That keeps a model the data have rejected; the line misses by three error bars where a good model would by one.',
        },
        {
          claim: 'A parabola that fits is the true curve.',
          response:
            'It is a model the six points cannot reject, which is weaker than one they support over every alternative.',
        },
      ],
      teachingNotes: [
        'The product case is exact (the profile is analytic: the best tilt is the smaller of 1 and 0.85 over the mass), and it is a likelihood profile, not a posterior; the advanced step names the prior that a posterior would need.',
        'The six points are a quadratic with a curvature of 0.08 and one fixed seeded set of 0.1 errors (seed claim-line-1); the line fit is a closed weighted least-squares solution and the p-value is the chi-square survival function.',
        'The graded decision is the refusal. The numbers in the line steps are read from the instrument; the choice step is marked on the refusal and not on a number.',
        'No authentic data are used on purpose: the truth is the point.',
      ],
      discussion: [
        'Name a measurement where only a combination of two parameters is fixed.',
        'When is reporting a lower bound better than reporting nothing, and when worse than a model?',
        'Who is harmed by a formal uncertainty quoted from a rejected model?',
      ],
      extensions: [
        'Open the radial-velocity investigation and ask which of its parameters the data fix alone.',
        'Fit a parabola and a cubic to the six points by hand and decide whether the data can tell them apart.',
      ],
      modelNotes:
        'js/claimWidgets.js (profileAt, lowerMass, lineFit, chi2Sf): the product 0.85 ± 0.06, the profile analytic, the six-point set from a quadratic of curvature 0.08 and errors 0.1, weighted least squares and the chi-square survival function. See MEASUREMENT_CLAIMS.md.',
    },
    'measuring-the-moon': {
      topic:
        'Giving a real picture a scale from a known length, a size in kilometers from a circle on it, what the stated uncertainty includes and leaves out, and why a display picture can be measured for size and not for brightness',
      difficulty: 'Introductory (real picture, instrument-driven)',
      placement:
        'After What Is a Measurement?, which supplies marks, spread and the standard error. It needs only ratios and a diameter. It supports OpenStax Astronomy 2e chapter 6 on how astronomers observe, and it is the first of the image investigations of the observing-and-measuring sequence, placed after the detector investigations.',
      overview:
        'Students work on a real picture, the Moon from the Galileo spacecraft on 7 December 1992, an enhanced-color composite shown in gray, which the Observatory treats as display-only. They predict what gives a picture its scale (a length in it that is known by other means), mark a reference pair across the disc from x = 3 to x = 496 and read 493 pixels, so 7.05 km per pixel from the Moon’s mean diameter of 3,474.8 km, and say why the scale must come from them (the picture records no coordinates or units). They predict the width of a large dark plain near the middle of the disc (about 600 km) and measure it with a circle centered at (289, 306): about 634 km, with the tool stating 6 km. They say what would change the number. The quantitative depth gives the worst case of a pixel at each end (14.1 km) and the diameter with a defensible error bar, about 634 ± 20 to 40 km. The advanced depth moves the circle to the limb, where a round feature looks 45 percent as wide along the radius, and says that a gray level of an enhanced picture is not light.',
      priorKnowledge: [
        'A position on a picture in pixels',
        'Ratios and a scale',
        'The idea of a standard error from What Is a Measurement?',
      ],
      keyConcepts: [
        {
          heading: 'A picture has no scale of its own',
          body: 'Pixels are not kilometers. A scale comes from a length in the picture that is known by other means; here the Moon’s own diameter. It is a measurement of the student’s, resting on an assumption and on two marks.',
        },
        {
          heading: 'What the stated uncertainty includes',
          body: 'The tool states the rounding of each placement. The softness of an edge, a cropped limb and the assumed diameter are not in it, so a defensible error bar is wider than the stated one.',
        },
        {
          heading: 'Display-only',
          body: 'An enhanced, stretched picture can be marked and measured in pixels for size and position. Its gray levels are not light, and the Observatory refuses photometry on it.',
        },
      ],
      features: [
        {
          name: 'Moon-marks instrument (imaging family)',
          text: 'The Galileo picture, 496 by 496 pixels, with a reference pair along row 245 whose ends are set by two controls and a circle set by its center and radius. The readout gives the pair’s length, the scale from it, the circle’s radius and diameter in pixels and kilometers with the tool’s stated uncertainty, and where the circle sits on the disc and how foreshortened a round feature would be there. Marks and scale are the Observatory’s own modules (marks.js and scale.js).',
        },
        {
          name: 'A real picture, not a synthetic one',
          text: 'The picture is a public-domain NASA image, fetched when the investigation opens and checked against the checksum the image set records. It is cropped close: the right limb touches the last column, which is why the Observatory’s limb refinement refuses it and why the investigation says the disc may be a pixel or two wider than the frame.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: a pixel at each end (14.1 km) and the diameter with an error bar. Advanced: foreshortening near the limb (0.89 of the radius, 45 percent) and why gray levels are not light.',
        },
      ],
      misconceptions: [
        {
          claim: 'A picture already knows how big things in it are.',
          response:
            'It records pixels and angles. A scale needs a length known by other means, and the tool refuses to invent one for a display picture.',
        },
        {
          claim: 'The stated uncertainty of 6 km is the whole uncertainty.',
          response:
            'It is the rounding of the marks. A soft edge placed by eye is good to about three pixels, 21 km, and the assumptions are not in it either.',
        },
        {
          claim: 'A circle on a crater near the limb measures its diameter.',
          response:
            'Near the limb a round feature is squeezed along the radius; at 0.89 of the radius it looks 45 percent as wide.',
        },
        {
          claim: 'Darker pixels mean less light.',
          response:
            'In an enhanced picture the gray level is whatever the stretch made it; the Observatory marks the picture display-only for that reason.',
        },
      ],
      teachingNotes: [
        'The Moon’s mean diameter, 3,474.8 km, is the one number taken from outside the picture, and the investigation says so; the scale is only as good as that assumption and the two marks.',
        'The plain is chosen because its center and rough size are unmistakable in the picture. It is not named: at 7 km per pixel a named crater would be a dozen pixels wide and its rim a guess.',
        'The instrument places marks by controls so every step has a keyboard path; the Observatory’s own marks panel does the same with a click, a nudge pad and a table, and students can repeat the measurement there.',
        'The picture loads when the investigation opens. If it cannot be loaded, the instrument says so and the readout, which does not need the pixels, still works.',
      ],
      discussion: [
        'What would you need to measure the brightness of the plain, and why does this picture not have it?',
        'How would you check the scale against a second length in the picture?',
        'Why would a named crater of 20 km not be measurable here?',
      ],
      extensions: [
        'Open the picture in the Observatory (Galileo Moon) and place the pair and the circle with its marks panel, then compare the table with the instrument’s readout.',
        'Continue with How Far Is That Star?, which turns positions over time into a distance.',
      ],
      modelNotes:
        'js/imagingWidgets.js (moonView): marks placed with js/measure/marks.js and scaled with js/measure/scale.js; the picture is the image set galileo-moon-19921207 (IMAGE_PACKS.md), display-only; the pair’s row is 245 and its length is taken as 3,474.8 km. See IMAGE_INVESTIGATIONS.md.',
    },
    'how-far-is-that-star': {
      topic:
        'A two-epoch shift, a straight proper motion and a parallax fitted to fourteen positions of one synthetic star: why a shift gives no distance, why a straight line is rejected for a star with a parallax, a distance with an interval, a relative parallax and why too few epochs are refused',
      difficulty: 'Intermediate (model-driven)',
      placement:
        'After What Does ± Claim?, because the interval is a statement about repeats. It needs a parallax as an angle and the distance 1/p. It supports OpenStax Astronomy 2e chapter 19 (celestial distances) and chapter 6.',
      overview:
        'Students look at fourteen positions of one synthetic star over 1.92 years, each with a 4 milliarcsecond error. They predict that a shift between two positions gives no distance, and read the shift of the first to the last position (549 mas, 0.287 arcsec a year if it were all motion), labeled by the tool as a shift under a fixed-motion assumption. They predict and see that a straight proper motion cannot describe the star: a chi-square of 1576 for 24 degrees of freedom. The parallax and motion fit gives 60.3 ± 1.5 mas and a distance of 16.59 pc, with a 68 percent interval of 16.18 to 17.02. They choose what the interval supports, and see that six epochs are refused. The quantitative depth does 1/p by hand, the parallax over its uncertainty (39.5) and the effect of eight epochs (a factor of 1.47). The advanced depth applies a stated correction of 1.0 mas (absolute parallax 61.3, distance 16.32), says which way the distance moves, and asks for two limits the interval does not include.',
      priorKnowledge: [
        'Parallax as a small angle and the distance 1/p in parsecs',
        'The idea of an interval as a statement about repeats, from What Does ± Claim?',
        'Chi-square and degrees of freedom in words',
      ],
      keyConcepts: [
        {
          heading: 'A shift is not a distance',
          body: 'Between two dates a star moves by its own motion and by a different part of its yearly loop; two positions cannot tell which is which, so the tool gives a shift and no parallax.',
        },
        {
          heading: 'A model that cannot make the loop is rejected',
          body: 'A straight proper motion fitted to a star with a parallax has a chi-square of 1576 for 24 degrees of freedom: each position misses by about eight of its own error bars.',
        },
        {
          heading: 'A relative parallax',
          body: 'It is measured against reference stars that have a parallax of their own, so it is too small and the distance from it is too large; a correction to absolute needs a stated size and source.',
        },
        {
          heading: 'Refusing',
          body: 'Fewer than eight epochs, or too little of the Earth’s orbit, give no parallax at all: not constrained.',
        },
      ],
      features: [
        {
          name: 'Star-parallax instrument (imaging family)',
          text: 'Fourteen fixed positions with a plot of the path (east to the right, north up, in milliarcseconds from the first position), a choice of fit (two-epoch shift, proper motion, parallax and motion), the number of epochs used and a stated correction to absolute. Every number is the Observatory’s own module (astrometric-series.js), with its refusals and its frame statement; the Earth’s position is fetched when the investigation opens.',
        },
        {
          name: 'The synthetic truth',
          text: 'The star was made at a parallax of 60 mas (16.67 pc) with a proper motion of 250 and −120 mas a year, from the exact geometry of the Earth’s orbit, with a seeded 4 mas error. The truth is withheld until the last step. The Observatory’s series panel takes the same table, so students can repeat the fit there.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: the distance by hand, the significance of the parallax and eight epochs. Advanced: a stated zero-point correction and the limits the interval leaves out.',
        },
      ],
      misconceptions: [
        {
          claim: 'A bigger shift means a nearer star.',
          response:
            'A shift is mostly proper motion here: 0.287 arcsec a year, against a parallax of 0.060 arcsec.',
        },
        {
          claim: 'A straight line is enough, since stars move steadily.',
          response:
            'The yearly loop lies off any line: chi-square 1576 for 24 degrees of freedom.',
        },
        {
          claim: 'The distance is exactly one over the parallax.',
          response:
            'It is the middle of an interval, 16.18 to 17.02 pc at 68 percent, and it is a relative one.',
        },
        {
          claim:
            'A parallax can be fitted from a few epochs with a larger error bar.',
          response:
            'Below eight epochs over 0.9 of a year the tool gives no parallax; a wide bar would hide that a number was invented.',
        },
      ],
      teachingNotes: [
        'The epochs are evenly spaced at 53.8 days from JD 2461045.5; the ephemeris is the project’s own (sky/ephemeris.json), and the series was made with the exact geometry, not the linear model the fit uses.',
        'The first eight epochs cover 1.03 years and give 61.4 ± 2.2 mas; the first six cover 0.74 and are refused; the correction in the advanced depth is an assumption the investigation states, not a measurement of any frame.',
        'A one-sigma interval holding the truth about two times in three is the claim from What Does ± Claim?; here the star was made at 60 mas and the interval 60.3 ± 1.5 holds it.',
        'The distance is the inverse of the parallax, so the investigation states the interval on the parallax first and inverts its ends; the symmetric reading of the distance would only be safe if the parallax were many sigma from zero.',
      ],
      discussion: [
        'Why would a star at ten times the distance need much better positions?',
        'What would you do if the straight-line chi-square had been 30 for 24 degrees of freedom?',
        'What does it mean that a refusal is a result?',
      ],
      extensions: [
        'Paste the same fourteen rows into the Observatory’s series panel (sky coordinates, motion and parallax over time) and compare its parameters table with the instrument.',
        'Continue with A Binary Star’s Orbit, which uses the parallax to turn an orbit into a mass.',
      ],
      modelNotes:
        'js/imagingWidgets.js (parallaxView): twoEpochShift, fitMotion and fitJoint of js/measure/astrometric-series.js on the table STAR (made with tools/astrometric-series-synth.mjs, seed p191-star, parallax 0.060, proper motion 0.25 and −0.12 arcsec a year, 4 mas); the Earth from the ephemeris sidecar. See IMAGE_INVESTIGATIONS.md and ASTROMETRY.md.',
    },
    'a-binary-stars-orbit': {
      topic:
        'The relative positions of a synthetic binary over sixteen years, an elliptical orbit fitted with its uncertainties, a circular orbit refused, the orbit in astronomical units and the mass sum by Kepler’s third law with an interval, and what the positions leave open',
      difficulty: 'Advanced (model-driven)',
      placement:
        'After How Far Is That Star?, whose parallax it uses. It needs Kepler’s third law and an angle as a size at a distance. It supports OpenStax Astronomy 2e chapter 18 (masses of stars in binaries) and is the last of the image investigations of the observing-and-measuring sequence.',
      overview:
        'Students look at twelve relative positions of a synthetic binary over 16.3 years, each with a 15 mas error. They predict that even a circular orbit would look like an ellipse on the sky, and see that a circular model is refused (chi-square 5225 for 19 degrees of freedom). The elliptical fit gives a period of 14.13 ± 0.06 years, a semi-major axis of 0.908 ± 0.008 arcseconds and an eccentricity of 0.443 ± 0.008. With a relative parallax of 100 mas the axis is 9.08 au and the mass sum 3.76 solar masses, between 3.33 and 4.25 at 68 percent. Six epochs are refused. The quantitative depth does the mass by hand (3.75) and at a parallax of 80 mas (7.3). The advanced depth shows the period’s uncertainty growing 2.5 times with eight epochs, why the node is ambiguous without radial velocities, and which way a relative parallax biases the mass.',
      priorKnowledge: [
        'Kepler’s third law, M = a³/P², in au, years and solar masses',
        'A parallax as a distance, from How Far Is That Star?',
        'An ellipse and its eccentricity',
      ],
      keyConcepts: [
        {
          heading: 'A tilted circle is an ellipse',
          body: 'An ellipse on the sky is not an eccentric orbit by itself; the fit asks the data whether a circle seen at an angle describes them, and here it does not.',
        },
        {
          heading: 'The sum, not each mass',
          body: 'Positions of one star relative to the other fix the size and period, so the sum of the masses; splitting it needs the motion of each about the center of mass.',
        },
        {
          heading: 'The distance cubed',
          body: 'The orbit in au needs the parallax, and the mass goes as the cube of it: a parallax 20 percent smaller doubles the mass sum.',
        },
        {
          heading: 'What the arc must cover',
          body: 'Fewer than eight epochs, or too little of a period, give no elliptical orbit at all; eight epochs cover 0.74 of a period and give a period 2.5 times less certain.',
        },
      ],
      features: [
        {
          name: 'Binary-orbit instrument (imaging family)',
          text: 'Twelve fixed positions with a plot of the companion and the fitted orbit (east to the right, north up, in arcseconds), a choice of circular or elliptical model, the number of epochs used and the parallax (with an uncertainty of 4 mas, relative). Every number is the Observatory’s own module (orbit-fit.js), with its refusals, its frame statement and the mass sum by seeded Monte Carlo.',
        },
        {
          name: 'The synthetic truth',
          text: 'The binary was made with a semi-major axis of 0.9 arcseconds, an eccentricity of 0.45, an inclination of 62 degrees, a node of 35, an argument of periastron of 110 and a period of 14.2 years, with a seeded 15 mas error. The Observatory’s orbit panel loads the same table with its synthetic example button, so students can repeat the fit there. One validation leg of the orbit-fit gate fails as committed (a mass sum at a signal-to-noise of 4.7), which is not the regime used here.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: the mass by hand and at 80 mas. Advanced: eight epochs, the node, and the relative parallax.',
        },
      ],
      misconceptions: [
        {
          claim: 'An ellipse on the sky means an eccentric orbit.',
          response:
            'A circle seen at an angle is an ellipse; the circular model is tested and refused here for another reason, the data are not that ellipse.',
        },
        {
          claim: 'The positions give the mass of each star.',
          response:
            'They give the sum; the split needs the motion about the center of mass.',
        },
        {
          claim: 'The mass interval is just the orbit’s uncertainty.',
          response:
            'It carries the parallax’s too, cubed: 3.33 to 4.25 solar masses at 68 percent.',
        },
        {
          claim: 'More epochs never help once the orbit is fitted.',
          response:
            'With eight epochs the period is 2.5 times less certain, and with six there is no orbit.',
        },
      ],
      teachingNotes: [
        'The table is the one the Observatory’s orbit panel loads with its example button; the instrument and the panel use the same module.',
        'The mass sum is a seeded Monte Carlo of 20,000 draws in the module, so it is the same for every student; the parallax is relative, which the tool says beside the mass.',
        'The parallax control runs from 40 to 160 mas; at a very small parallax the module refuses a mass sum whose parallax is under a few times its uncertainty.',
        'The circular model is offered so that it can be refused: the fit still finds a period, but its residuals are far larger than the stated errors, and the tool reports the result as inconsistent and not constrained rather than printing a number from it.',
      ],
      discussion: [
        'What would you need to split the sum into two masses?',
        'Why does a 4 percent parallax become a 12 percent mass?',
        'What would radial velocities add to the positions?',
      ],
      extensions: [
        'Load the synthetic example in the Observatory’s orbit panel and compare its elements table with the instrument.',
        'Compare with Weighing the Stars, which weighs a binary from a period and a separation in the simulator.',
      ],
      modelNotes:
        'js/imagingWidgets.js (orbitView): fitOrbit and massSum of js/measure/orbit-fit.js on the table BINARY (the Observatory orbit panel’s example, 12 epochs, 15 mas), parallax 100 ± 4 mas relative. See IMAGE_INVESTIGATIONS.md and ASTROMETRY.md.',
    },
  },
  flow: {
    'what-is-a-measurement': [
      {
        from: 'a-star-on-a-frame',
        to: 'predict-the-marks',
        text: 'One star marked five times, and the prediction that careful marks differ.',
      },
      {
        from: 'read-the-spread',
        to: 'the-standard-error',
        text: 'The mean, the spread and the standard error of five marks.',
      },
      {
        from: 'predict-more-marks',
        to: 'twenty-marks',
        text: 'Four times the marks halve the standard error.',
      },
      {
        from: 'predict-the-truth',
        to: 'reveal-the-truth',
        text: 'The truth is shown: the mean is within one standard error of it.',
      },
      {
        from: 'a-blurrier-star',
        to: 'why-it-doubled',
        text: 'A star twice as wide doubles the spread and the standard error.',
      },
      {
        from: 'what-you-would-report',
        to: 'what-you-worked-out',
        text: 'A written report of the position, and the close.',
      },
    ],
    'what-does-plus-minus-claim': [
      {
        from: 'a-claim-to-check',
        to: 'predict-one-sigma',
        text: 'A one-sigma claim that can be counted, and the prediction.',
      },
      {
        from: 'coverage-at-one-sigma',
        to: 'coverage-at-two-sigma',
        text: 'About two thirds and nineteen in twenty hold the truth.',
      },
      {
        from: 'predict-the-biased-instrument',
        to: 'what-a-small-error-bar-says',
        text: 'A biased instrument with a small plus-or-minus: precision is not accuracy.',
      },
      {
        from: 'an-asymmetric-interval',
        to: 'the-symmetric-shortcut',
        text: 'A distance from a parallax: the asymmetric interval and the shortcut.',
      },
      {
        from: 'predict-the-upper-limit',
        to: 'upper-limit-coverage',
        text: 'An upper limit covers at least its level.',
      },
      {
        from: 'what-would-prove-it-wrong',
        to: 'what-you-worked-out',
        text: 'A written test of a claim, and the close.',
      },
    ],
    'when-the-method-must-refuse': [
      {
        from: 'a-product-not-two-numbers',
        to: 'predict-the-mass',
        text: 'Two parameters, one measurement, and the prediction.',
      },
      {
        from: 'try-a-mass',
        to: 'the-lower-limit',
        text: 'Trial masses and the smallest mass the data allow.',
      },
      {
        from: 'is-there-a-largest-mass',
        to: 'what-to-report',
        text: 'There is no largest mass, and the honest report is a lower bound.',
      },
      {
        from: 'predict-the-line',
        to: 'refuse-or-report',
        text: 'A line fitted to curved data: the graded refusal.',
      },
      {
        from: 'a-model-that-fits',
        to: 'what-would-you-refuse',
        text: 'A model with one more term, and a written account of what to refuse.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a bound, not a number; a refusal, not a rescaling.',
      },
    ],
    'measuring-the-moon': [
      {
        from: 'a-picture-of-the-moon',
        to: 'predict-the-scale',
        text: 'A real, display-only picture, and what gives it a scale.',
      },
      {
        from: 'scale-from-the-disc',
        to: 'why-a-pair',
        text: 'A reference pair across the disc gives 7.05 km per pixel, and why the scale comes from the student.',
      },
      {
        from: 'predict-the-plain',
        to: 'measure-the-plain',
        text: 'The width of a dark plain: predicted at about 600 km and measured at about 634.',
      },
      {
        from: 'what-would-change-it',
        to: 'what-you-worked-out',
        text: 'What the stated uncertainty includes and leaves out, and the close.',
      },
    ],
    'how-far-is-that-star': [
      {
        from: 'fourteen-positions',
        to: 'the-shift',
        text: 'Fourteen positions, and a shift between two that gives no distance.',
      },
      {
        from: 'predict-a-straight-line',
        to: 'a-straight-line-fails',
        text: 'A straight proper motion is rejected for a star with a parallax.',
      },
      {
        from: 'the-parallax',
        to: 'what-the-interval-says',
        text: 'The parallax, the distance and what its interval claims.',
      },
      {
        from: 'six-epochs',
        to: 'what-you-worked-out',
        text: 'Too few epochs are refused; why a year, what relative means, and the close.',
      },
    ],
    'a-binary-stars-orbit': [
      {
        from: 'twelve-positions',
        to: 'a-circle-first',
        text: 'Twelve positions, the shape of the path, and a circular orbit refused.',
      },
      {
        from: 'the-elliptical-fit',
        to: 'from-arcseconds-to-au',
        text: 'The elliptical orbit, and the orbit in astronomical units.',
      },
      {
        from: 'the-mass-sum',
        to: 'six-epochs',
        text: 'The mass of the pair with its interval, and six epochs refused.',
      },
      {
        from: 'say-what-the-sum-needs',
        to: 'what-you-worked-out',
        text: 'What the sum needs, and the close.',
      },
    ],
    'which-surface-is-older': [
      {
        from: 'two-surfaces',
        to: 'which-is-older-predict',
        text: 'A surface collects craters as time passes, so more craters per area reads as older; students predict the Moon’s two regions before counting.',
      },
      {
        from: 'count-the-moon',
        to: 'ratio-moon',
        text: 'The catalog’s craters at least 30 km across: 40 in the highland and 7 in the mare, 131.2 and 20.5 per million km², a ratio of 6.39 with an interval of 2.83 to 16.9.',
      },
      {
        from: 'reading-the-interval',
        to: 'reading-the-interval',
        text: 'The interval excludes 1, so the highland is denser.',
      },
      {
        from: 'mars-pair',
        to: 'mars-pair',
        text: 'The same question on Mars at 20 km: 91 and 14 craters, a ratio of 6.50 (3.68 to 12.4).',
      },
      {
        from: 'fewer-craters',
        to: 'fewer-craters',
        text: 'On Mars at 60 km, 12 and 4 craters give 3.00 (0.91 to 12.8): no significant difference.',
      },
      {
        from: 'what-can-go-wrong',
        to: 'what-you-worked-out',
        text: 'What could make a surface look older than it is (saturation, resurfacing, secondaries), and why a ratio of densities is not an age in years.',
      },
    ],
    'craters-by-size': [
      {
        from: 'a-plot-of-counts',
        to: 'narrower-predict',
        text: 'The size-frequency plot with Poisson error bars, and the prediction of whose slope is better known; the lunar highland index is 1.71 (1.22 to 2.28) from 40 craters.',
      },
      {
        from: 'mars-slope',
        to: 'does-mare-differ',
        text: 'The Martian highland gives 1.72 (1.39 to 2.09) from 91 craters; the mare’s seven craters give 3.47 (1.39 to 6.47), an interval too wide to say it differs.',
      },
      {
        from: 'roll-off',
        to: 'what-the-flag-says',
        text: 'A count that stops short of the completeness limit flattens the slope to about 1.0 and the constancy check flags it.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a slope with its interval, and what a roll-off does to it.',
      },
    ],
    'what-a-crater-diameter-is-worth': [
      {
        from: 'a-circle-and-a-scale',
        to: 'largest-term-predict',
        text: 'A diameter is a length in pixels times the map’s scale, corrected for the view; students read one circle’s diameter and predict which uncertainty term is largest.',
      },
      {
        from: 'the-budget',
        to: 'the-correction',
        text: 'The default circle reads 112.0 ± 5.9 km, with the scale, the placement, where the rim is and the view as separate terms; leaving the view out reads 101.1 km.',
      },
      {
        from: 'big-correction-small-uncertainty',
        to: 'why-no-age',
        text: 'A large correction can carry a small uncertainty, and an age in years is not reported because its model has not passed its test here.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a diameter is a measurement with four terms.',
      },
    ],
  },
  expectations: {
    ...CRATER_EXPECTATIONS,
    'what-is-a-measurement': {
      'read-the-spread':
        'With 5 marks: mean x 31.10 px (within 0.05) and spread 0.80 px (within 0.03).',
      'the-standard-error':
        'Standard error of x 0.36 px and of y 0.34 px, each within 0.02.',
      'twenty-marks':
        'With 20 marks: standard error of x 0.17 px (within 0.02), 2.06 times smaller than with 5 (within 0.2).',
      'reveal-the-truth':
        'The error of the mean in x is −0.30 px (within 0.04), −0.84 standard errors (within 0.1).',
      'a-blurrier-star':
        'Width 8 px, 5 marks: spread 1.60 px (within 0.06) and standard error 0.71 px (within 0.03).',
    },
    'what-does-plus-minus-claim': {
      'coverage-at-one-sigma':
        'At ±1 sigma: 1361 of 2000 hold the truth (within 25), 68.0 percent (within 1.5).',
      'coverage-at-two-sigma':
        'At ±2 sigma: 1901 hold it (within 15), 95.0 percent (within 1).',
      'biased-coverage':
        'The biased instrument: 36.3 percent at one sigma and 74.4 at two (each within 1.5).',
      'an-asymmetric-interval':
        'Asymmetric distance interval at one sigma: 68.0 percent (within 1.5) and 17 repeats with no upper end (within 4).',
      'the-symmetric-shortcut':
        'Symmetric form at one sigma: 78.3 percent (within 1.5).',
      'upper-limit-coverage':
        'Upper limits: 95.6 percent at a true rate of 3.0 and 98.7 at 4.0 (each within 1).',
    },
    'when-the-method-must-refuse': {
      'try-a-mass':
        'Trial mass 2.0: best sine 0.425 (within 0.005), chi-square 0 (within 0.1).',
      'try-a-small-mass':
        'Trial mass 0.5: sine 1 (within 0.005), chi-square 34 (within 0.7).',
      'the-lower-limit':
        'Smallest mass inside a rise of 1: 0.79 (within 0.01); of 3.84: 0.73 (within 0.01).',
      'fit-the-line':
        'Line: slope 1.078 (within 0.01), formal uncertainty 0.024 (within 0.003), reduced chi-square 7.64 (within 0.15).',
      'a-model-that-fits':
        'Parabola: reduced chi-square 0.37 (within 0.04) and squared term 0.089 (within 0.005).',
    },
    'measuring-the-moon': {
      'scale-from-the-disc':
        'Pair length 493 px (within 3) and a scale of 7.05 km per pixel (within 0.05), with the left end at 3 and the right end at 496.',
      'measure-the-plain':
        'A circle centered at (289, 306) with a radius of about 45 px gives a diameter of 634 km (the validator accepts within 45 km), with the tool stating ± 6 km.',
    },
    'how-far-is-that-star': {
      'the-shift':
        'First to last of 14 epochs: a shift of 549 mas (within 5) and 0.287 arcsec a year (within 0.004).',
      'a-straight-line-fails':
        'Proper motion alone, 14 epochs: chi-square 1576 (within 12) for 24 degrees of freedom.',
      'the-parallax':
        'Parallax 60.3 mas (within 0.5), uncertainty 1.53 mas (within 0.1), distance 16.6 pc (within 0.15), chi-square 13.2 for 23 degrees of freedom.',
    },
    'a-binary-stars-orbit': {
      'the-elliptical-fit':
        'Period 14.13 yr (within 0.15), semi-major axis 0.908 arcsec (within 0.02), eccentricity 0.443 (within 0.02).',
      'from-arcseconds-to-au': '0.908 ÷ 0.100 = 9.08 au (within 0.1).',
      'the-mass-sum':
        'Mass sum 3.76 solar masses (within 0.06), with a 68 percent interval of 3.33 (within 0.08) to 4.25 (within 0.1).',
    },
  },
  bands: {
    ...CRATER_BANDS,
    'what-is-a-measurement': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'medium',
    },
    'what-does-plus-minus-claim': {
      core: 'medium',
      quantitative: 'long',
      advanced: 'long',
    },
    'when-the-method-must-refuse': {
      core: 'medium',
      quantitative: 'long',
      advanced: 'long',
    },
    'measuring-the-moon': {
      core: 'short',
      quantitative: 'medium',
      advanced: 'medium',
    },
    'how-far-is-that-star': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'long',
    },
    'a-binary-stars-orbit': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'long',
    },
  },
};

/** The deeper steps by lesson id: what depthAll.js registers. */
export default {
  [WHAT_IS_A_MEASUREMENT_DEEPER.id]: WHAT_IS_A_MEASUREMENT_DEEPER.steps,
  [WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER.id]:
    WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER.steps,
  [WHEN_THE_METHOD_MUST_REFUSE_DEEPER.id]:
    WHEN_THE_METHOD_MUST_REFUSE_DEEPER.steps,
  [MEASURING_THE_MOON_DEEPER.id]: MEASURING_THE_MOON_DEEPER.steps,
  [HOW_FAR_IS_THAT_STAR_DEEPER.id]: HOW_FAR_IS_THAT_STAR_DEEPER.steps,
  [A_BINARY_STARS_ORBIT_DEEPER.id]: A_BINARY_STARS_ORBIT_DEEPER.steps,
  [WHICH_SURFACE_IS_OLDER_DEEPER.id]: WHICH_SURFACE_IS_OLDER_DEEPER.steps,
  [CRATERS_BY_SIZE_DEEPER.id]: CRATERS_BY_SIZE_DEEPER.steps,
  [WHAT_A_CRATER_DIAMETER_IS_WORTH_DEEPER.id]:
    WHAT_A_CRATER_DIAMETER_IS_WORTH_DEEPER.steps,
};
