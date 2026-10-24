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
        'How the mean of these marks would scatter if the marking were repeated, assuming the marks scatter at random about one centre',
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
             −0.1 about the centre, that is between −2.33 and −0.33 scatters. The
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
export const INSTRUCTOR = {
  content: {
    'what-is-a-measurement': {
      topic:
        'What a measurement is: repeated marks of one synthetic star, their spread, the mean and its standard error, and what the standard error does not include',
      difficulty: 'Introductory (model-driven)',
      placement:
        'First of three. It needs only arithmetic and the idea of a position on a picture, and can open any course that will later quote an uncertainty. It supports OpenStax Astronomy 2e chapter 6 on how astronomers observe, and it is the first investigation of the observing-and-measuring sequence.',
      overview:
        'Students look at five marks of one synthetic star: a blurred spot at a position the lesson chose, 31.4 and 27.9 pixels, marked by a model of a careful person with a scatter of 0.8 pixel. They predict that careful marks differ, read the mean x (31.10) and spread (0.80) and the standard error (0.36), predict and measure what twenty marks buy (0.17, a factor of 2.06), predict where the truth lies and then see the mean 0.30 pixel from it (0.84 standard errors), and meet a star twice as wide (spread 1.60, error 0.71). The quantitative depth reports a position with its error bar and asks how many marks give a tenth of a pixel (64). The advanced depth adds an offset the same in every mark and shows that the standard error falls while the error does not: six standard errors with 30 marks.',
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
          text: 'The star’s true position is set by the lesson and shown only after the prediction before it, so a student can see how near the mean lands. A real frame has no such answer; the lesson says so and uses no authentic data.',
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
          text: 'Both data sets are made for the lesson with the truth built in: a product of two parameters, and six points from a curve with seeded errors. No authentic data are used, so every refusal is the method’s own and not a limit of the data.',
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
  },
  expectations: {
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
  },
  bands: {
    'what-is-a-measurement': {
      core: 'short',
      quantitative: 'short',
      advanced: 'medium',
    },
    'what-does-plus-minus-claim': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'medium',
    },
    'when-the-method-must-refuse': {
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
};
