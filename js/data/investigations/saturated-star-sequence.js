// =============================================================================
// The Saturated Star (Prompt 211)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: the one closure file the
// prompt adds (D-R10-211-01, approved by the coordinator), because the shared
// sequence files sit at their line ceilings. The per-lesson path every loader
// builds from an id is a one-line re-export of a named export here, and the
// instructor modules read INSTRUCTOR. No imports: every number a step states is
// recomputed in tests/saturatedStarLessons.test.js from the instrument
// (js/effectsWidgets.js over js/kernels/detector/effects.js and Prompt 180's
// photometry). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by.
//
// The frame is synthetic and says so; the effects are stated models, not the
// measured response of a detector (DETECTOR_EFFECTS.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
/** The detector-effects panel with its controls set (exposure is an index: 3 is 60 s). */
const FX = (values = {}, hide = []) => ({
  id: 'detector-effects',
  values: {
    bright: 9.5,
    exposure: 3,
    nonlinear: 0,
    bleed: 0,
    cosmic: 0,
    fwhm: 2.8,
    flags: 1,
    ...values,
  },
  hide,
});

export const THE_SATURATED_STAR = {
  id: 'the-saturated-star',
  thumbnail: 'images/investigations/the-saturated-star.webp',
  title: 'The Saturated Star',
  subtitle:
    'Why the brightest star in the frame has the wrong magnitude, what bleeding and cosmic rays do to its neighbors, and where a measurement is safe',
  duration: '10-20 min',
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
    'Predict what a measurement of a saturated star gives, then read it, and say why a star that is too bright comes out too faint',
    'Turn the clipped flux into the magnitude error it makes',
    'Say what charge bleeding does to the stars on a saturated star’s column, and why a flagged pixel is refused rather than repaired by hand',
    'Say what a cosmic-ray track does to the stars it crosses, and what an observer does about it',
  ],
  steps: [
    {
      sid: 'a-bright-star',
      stage: STAGE,
      type: 'read',
      title: 'The brightest star in the frame',
      body: `A CCD records light by collecting electrons in each pixel, and a pixel can hold
             only so many: the <strong>full well</strong>, 50,000 electrons here. The frame
             below shows one very bright star, <strong>S</strong>, among fainter ones. The
             photometry tool measures each star and, when it cannot trust a number, it
             <em>refuses</em> and says why: the stars drawn in orange are the ones it
             refused.
             \n\nThe frame is <strong>synthetic</strong>: made by a model, with the star
             brightnesses and the electrons they put on the frame known exactly. Nobody
             observed it.`,
      tool: FX(),
    },
    {
      sid: 'bright-star-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'clipped-star',
      title: 'What would the number have been?',
      body: `The tool refuses S. Suppose it had not: it adds up the light in a circle around
             the star, as it does for every other star. The row for S says what it would
             have read, as a share of the electrons the model put in.`,
      prompt: 'Added up anyway, the flux of S would be&hellip;',
      options: [
        'close to the true flux, because a bright star is easy to measure',
        'far too low, because the brightest pixels cannot hold more than the full well',
        'too high, because the extra light spills into the circle',
        'impossible to say without more observations',
      ],
      answer: 1,
      hints: [
        'Think about the pixel at the middle of the star: it receives far more light than a pixel can hold.',
      ],
      because:
        'Far too low: the middle pixels hold 50,000 electrons each and the rest of their light is not recorded.',
      tool: FX(),
    },
    {
      sid: 'clipped-star',
      stage: STAGE,
      type: 'measure',
      title: 'What the clipped star reads',
      body: `Read the row for <strong>Star S</strong>: ignoring the refusal, what share of
             the electrons the model put in would the sum have read? Give it in percent.`,
      fields: [
        {
          id: 'r',
          label: 'Share of the true flux it would read',
          unit: '%',
          hint: '30',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.r)) return null;
        if (near(v.r, 30.2, 2)) {
          return {
            level: 'ok',
            message:
              'About 30 percent: the middle of the star was cut off at the full well and 70 percent of its light is missing from the sum. The tool refused to give that number; a star that bright is not measured by adding up what is left.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the percent in the Star S row (the brightness is 9.5 and the exposure 60 s): the share of the true flux that the clipped sum reads.',
        };
      },
      tool: FX(),
    },
    {
      sid: 'magnitude-error',
      stage: STAGE,
      type: 'measure',
      title: 'The magnitude error',
      body: `A star with 30 percent of its flux looks fainter by a number of magnitudes. Type
             the share again and the instrument gives the magnitude error, 2.5 times the
             logarithm of the true flux over the measured flux: how much too faint the
             star would be cataloged.`,
      fields: [
        {
          id: 'r',
          label: 'Share of the true flux it would read',
          unit: '%',
          hint: '30',
        },
        {
          id: 'dm',
          label: 'Magnitude error (too faint)',
          unit: 'mag',
          compute: v => 2.5 * Math.log10(100 / v.r),
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.r)) return null;
        if (near(v.r, 30.2, 2) && near(v.dm, 1.3, 0.12)) {
          return {
            level: 'ok',
            message:
              'About 1.3 magnitudes too faint. A saturated star is not a little wrong: the catalog would list a star that is a factor of three brighter than its entry, and any colour or distance built on it inherits the error.',
          };
        }
        return {
          level: 'error',
          message:
            'Type the share from the previous step (about 30 percent); the magnitude error is 2.5 log10(100 / share).',
        };
      },
      tool: FX(),
    },
    {
      sid: 'why-too-faint',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why too faint?',
      body: `The star is the brightest thing in the frame and its measured flux is the
             smallest fraction of the truth.`,
      prompt: 'Why does a star that is too bright come out too faint?',
      options: [
        'A pixel holds at most the full well, so the light beyond it is not recorded and the sum is short',
        'The telescope cannot collect that much light, so the star is dimmed before it arrives',
        'The star is so bright that the noise hides it',
        'The tool subtracts too much sky around a bright star',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'mirror',
          option: 1,
          say: 'The light arrived: the model put 5 million electrons on the frame. It was the pixels that could not hold it.',
        },
        {
          id: 'noise',
          option: 2,
          say: 'The noise of a bright star is small next to its signal. The problem is not noise but a hard limit on what each pixel stores.',
        },
        {
          id: 'sky',
          option: 3,
          say: 'The sky level is the same around every star. The shortfall is in the star’s own pixels.',
        },
      ],
      hints: ['What is the largest number of electrons one pixel can hold?'],
      because:
        'Each pixel saturates at the full well; light that arrives after a pixel is full is lost (or, as the next step shows, spills), and a sum of what was recorded is short.',
      tool: FX(),
    },
    {
      sid: 'trail-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'trail',
      title: 'Where the extra charge goes',
      body: `Switch on <strong>charge bleeding</strong>. In a CCD the charge a full pixel
             cannot hold can spill along its column into the pixels above and below.
             <strong>N1</strong> and <strong>N2</strong> are faint stars on S&rsquo;s
             column; <strong>C</strong> is a faint star elsewhere. The frame now flags the
             pixels that received spilled charge (magenta).`,
      prompt: 'Which of the three faint stars will the tool refuse?',
      options: [
        'None: they are faint and far from S',
        'N1 and N2, the ones on S’s column',
        'Only C',
        'All three',
      ],
      answer: 1,
      hints: ['Spilled charge travels along a column, not across the frame.'],
      because:
        'N1 and N2: the charge spills up and down S’s column until it runs out, and a trail through a star’s circle is flagged and refused.',
      tool: FX({ bleed: 1 }),
    },
    {
      sid: 'trail',
      stage: STAGE,
      type: 'measure',
      title: 'The trail',
      body: `With bleeding on, count how many of the faint stars <strong>N1, N2 and
             C</strong> the tool refuses, and read from the <em>Bleeding</em> row how many
             pixels received charge from saturated ones.`,
      fields: [
        {
          id: 'k',
          label: 'Faint stars refused (of N1, N2, C)',
          unit: '',
          hint: '2',
        },
        {
          id: 'p',
          label: 'Pixels that received bled charge',
          unit: 'pixels',
          hint: '85',
        },
      ],
      validate: v => {
        if (![v.k, v.p].every(Number.isFinite)) return null;
        if (near(v.k, 2, 0.01) && near(v.p, 85, 0.5)) {
          return {
            level: 'ok',
            message:
              'Two refused, N1 and N2, and 85 pixels fed by the spill. The pixels along the trail sit at the full well, so a star whose circle holds them has been replaced there by the trail. C is on another column and measures normally. The refusal is the safe answer: the trail’s charge is not the star’s.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch bleeding on, then read the three faint stars’ rows (refused or measured) and the Bleeding row.',
        };
      },
      tool: FX({ bleed: 1 }),
    },
    {
      sid: 'a-ray',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A ray through the circle',
      body: `Now switch bleeding off and switch on <strong>cosmic-ray tracks</strong>, with
             S dimmed so that it is not saturated. A cosmic ray is a charged particle that
             crosses the detector and leaves a track of charge (cyan). The tool refuses the
             stars whose circle a track crosses.`,
      prompt:
        'A faint star you need is refused because a track crosses it. What does an observer do?',
      options: [
        'Take more exposures and combine them, so that no pixel is hit in more than one frame',
        'Measure it anyway and subtract a typical track’s flux',
        'Subtract the median of the whole frame',
        'Nothing: a cosmic ray is too small to matter',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'subtract',
          option: 1,
          say: 'A track deposits a different amount in every case, set by the angle it crosses at. The flagged number is wrong by an amount nobody knows; unflagged, it is wrong by more than five times its own error in the model.',
        },
        {
          id: 'median',
          option: 2,
          say: 'The median of a frame is the sky. It says nothing about the charge a track left in a few pixels.',
        },
        {
          id: 'small',
          option: 3,
          say: 'A track puts about a thousand electrons in every pixel it crosses; a faint star may have fewer than that in its brightest pixel.',
        },
      ],
      hints: ['A track hits different pixels in different exposures.'],
      because:
        'Combine several exposures with a rejection (a median or a clipped mean): a track is in one frame at a place the others do not have, and the combination drops it.',
      tool: FX({ cosmic: 1, bright: 13 }),
    },
    {
      sid: 'what-an-observer-does',
      stage: STAGE,
      type: 'read',
      title: 'What an observer does',
      body: `What you saw comes to one point: <strong>a quality flag is a refusal, and the
             refusal is the safe answer</strong>. A saturated star is avoided with a shorter
             exposure or a defocused star, and measured where it does not saturate. A star
             a cosmic ray crosses is recovered by combining several exposures with
             rejection. And a flagged pixel is never corrected by hand: it is replaced by a
             better image. The frames are synthetic and the effects are stated models, not
             a measured detector.`,
      tool: FX({}),
    },
  ],
};

export const THE_SATURATED_STAR_DEEPER = {
  id: 'the-saturated-star',
  steps: [
    {
      sid: 'the-response',
      after: 'why-too-faint',
      depth: 'quantitative',
      type: 'read',
      title: 'A response that bends before it stops',
      body: `Switch on the <strong>nonlinearity</strong>. A real detector does not record
             electrons linearly all the way to the full well: the response bends over near
             it. The model here is a stated curve: linear up to a knee at 0.8 of the full
             well, then a tanh roll-off, so a full pixel reads a little below 50,000. The
             plot below the picture shows each star&rsquo;s peak, recorded against the
             charge collected. The dashed vertical line is the <strong>linear
             limit</strong>, where the response is 1 percent below the straight line.
             \n\nThe curve is <strong>a model choice</strong>, not a measurement of any
             detector. A real one is measured, by exposing to a uniform light and plotting
             the output against the exposure.`,
      tool: FX({ nonlinear: 1, bright: 12.5 }),
    },
    {
      sid: 'linear-limit',
      after: 'the-response',
      depth: 'quantitative',
      type: 'measure',
      title: 'The linear limit and the plateau',
      body: `Read the <em>Linear limit</em> row: the number of electrons at which the
             response is 1 percent below linear, and what a full pixel reads. Then give the
             limit as a percentage of the full well.`,
      fields: [
        { id: 'lim', label: 'Linear limit', unit: 'electrons', hint: '45330' },
        {
          id: 'plateau',
          label: 'What a full pixel reads',
          unit: 'electrons',
          hint: '47616',
        },
        {
          id: 'pct',
          label: 'Limit as a share of the full well',
          unit: '%',
          compute: v => (100 * v.lim) / 50000,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.lim, v.plateau].every(Number.isFinite)) return null;
        if (near(v.lim, 45330, 60) && near(v.plateau, 47616, 60)) {
          return {
            level: 'ok',
            message:
              'The curve is 1 percent below linear at 45,330 electrons, 90.7 percent of the well, and a full pixel reads 47,616, less than the well. The tool refuses any pixel above the limit, so it stops trusting a star before the pixels are full.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Linear limit” row with the nonlinearity switched on: the limit in electrons and what a full pixel reads.',
        };
      },
      tool: FX({ nonlinear: 1, bright: 12.5 }),
    },
    {
      sid: 'brightest-measured',
      after: 'linear-limit',
      depth: 'quantitative',
      type: 'measure',
      title: 'How bright can S be and still be measured?',
      body: `Keep the nonlinearity on and step S&rsquo;s magnitude up from 12 (brighter is
             lower). Find the <strong>brightest</strong> magnitude, to the half-magnitude
             the slider steps, at which the tool still measures S instead of refusing it.`,
      fields: [
        {
          id: 'm',
          label: 'Brightest magnitude still measured',
          unit: 'V',
          hint: '12.5',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.m)) return null;
        if (near(v.m, 12.5, 0.01)) {
          return {
            level: 'ok',
            message:
              'V = 12.5 is measured and V = 12 is refused (at a 60 second exposure). A half magnitude is a factor of 1.26 in flux: the safe range ends between those two, within the next step’s estimate.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the brightness to 12.5, then 12, and read whether the Star S row is a measurement or a refusal.',
        };
      },
      tool: FX({ nonlinear: 1, bright: 12 }),
    },
    {
      sid: 'safe-flux',
      after: 'brightest-measured',
      depth: 'quantitative',
      type: 'measure',
      title: 'Where the measurement is safe',
      body: `The limit is on a <em>pixel</em>. The brightest pixel of a star holds only a
             share of its light: the <em>Sampling</em> row gives the range, by where the
             star sits in its pixel. A star is safe if its brightest pixel stays below the
             limit even when it sits in the worst place, the largest share. Type that
             largest share (percent); the instrument gives the most electrons a star can
             deliver and the magnitude of that star at 60 seconds (a star of magnitude 0
             gives 5.606 &times; 10<sup>8</sup> electrons per second here).`,
      fields: [
        {
          id: 'share',
          label: 'Largest share of the light in one pixel',
          unit: '%',
          hint: '11',
        },
        {
          id: 'f',
          label: 'Most electrons a star can deliver and be safe',
          unit: 'electrons',
          compute: v => 45330 / (v.share / 100),
          decimals: 0,
        },
        {
          id: 'm',
          label: 'Its magnitude at 60 s',
          unit: 'V',
          compute: v =>
            -2.5 * Math.log10(45330 / (v.share / 100) / 60 / 5.606e8),
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.share)) return null;
        if (near(v.share, 10.6, 0.7) && near(v.m, 12.26, 0.12)) {
          return {
            level: 'ok',
            message:
              'The largest share is about 10.6 percent, so a safe star delivers at most about 430,000 electrons in 60 seconds: magnitude 12.2. That agrees with the step before, where 12.5 was measured and 12 refused. The share used is the largest, because a star sitting at the middle of a pixel saturates first.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Sampling” row and take the larger of the two percentages (about 11), not the smaller.',
        };
      },
      tool: FX({ nonlinear: 1, bright: 12.5 }),
    },
    {
      sid: 'can-you-correct-it',
      after: 'safe-flux',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Could you correct for it?',
      body: `The curve is known here, so it could be undone: a pixel that reads 46,000
             electrons tells you how many were collected. The tool refuses instead.`,
      prompt: 'Why is refusing the safer default for a real detector?',
      options: [
        'The curve of a real detector must be measured, it differs from pixel to pixel and from night to night, and a full pixel has lost its information altogether',
        'A correction is impossible in principle: no function can be inverted',
        'The correction changes the noise, so no star can be corrected',
        'Corrections are only allowed on the brightest stars',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'impossible',
          option: 1,
          say: 'A monotonic curve can be inverted when it is known (the kernel does it, and the check shows it recovers the electrons). The trouble is knowing it for a real detector.',
        },
        {
          id: 'noise',
          option: 2,
          say: 'Noise does grow where the curve is flat, but that limits a correction rather than forbidding one; the larger problem is knowing the curve and the plateau.',
        },
      ],
      hints: [
        'Could you apply the correction to a pixel that is full? What does it read, however much light arrived?',
      ],
      because:
        'The correction needs a measured curve, and it fails for a full pixel, which reads the same plateau whatever arrived. Observers keep stars below the linear limit, and measure the curve (the photon transfer curve) before they trust a correction.',
      tool: FX({ nonlinear: 1, bright: 12.5 }),
    },
    {
      sid: 'undersampled',
      after: 'a-ray',
      depth: 'advanced',
      type: 'read',
      title: 'A star narrower than two pixels',
      body: `Set the profile width to <strong>1.2 pixels</strong>. A profile needs a width of
             about 2 pixels to be sampled: narrower than that it is <em>undersampled</em>,
             and the pixels no longer follow its shape. The model already integrates the
             profile over each square pixel, so the pixels are exact; what changes is that
             where the star sits <em>within</em> its pixel now decides how much of its light
             lands in the brightest pixel. The <em>Sampling</em> row gives the range.`,
      tool: FX({ nonlinear: 1, bright: 12.5, fwhm: 1.2 }),
    },
    {
      sid: 'phase-predict',
      after: 'undersampled',
      depth: 'advanced',
      type: 'predict',
      reveal: 'phase-dependence',
      title: 'Two stars, one brightness',
      body: `Two stars deliver exactly the same number of electrons. One sits at the middle
             of a pixel and the other at its corner. The profile is 1.2 pixels wide.`,
      prompt: 'The peak pixels of the two stars hold&hellip;',
      options: [
        'the same charge: the stars are equally bright',
        'charges that differ by a factor of about two, so one could saturate and the other not',
        'charges that differ by a few percent',
        'the same charge only if the stars are above the linear limit',
      ],
      answer: 1,
      hints: [
        'At the middle the star falls on one pixel; at the corner it is shared by four.',
      ],
      because:
        'About a factor of two: the peak pixel holds 45 percent of the light at the middle and 24 at the corner.',
      tool: FX({ nonlinear: 1, bright: 12.5, fwhm: 1.2 }),
    },
    {
      sid: 'phase-dependence',
      after: 'phase-predict',
      depth: 'advanced',
      type: 'measure',
      title: 'The peak pixel, by phase',
      body: `Read the <em>Sampling</em> row at a width of <strong>1.2</strong> pixels, then at
             <strong>2.8</strong>: the smallest and largest share of a star&rsquo;s light that
             the brightest pixel holds.`,
      fields: [
        {
          id: 'lo12',
          label: 'Smallest share at 1.2 px',
          unit: '%',
          hint: '24',
        },
        { id: 'hi12', label: 'Largest share at 1.2 px', unit: '%', hint: '45' },
        { id: 'lo28', label: 'Smallest share at 2.8 px', unit: '%', hint: '9' },
        { id: 'hi28', label: 'Largest share at 2.8 px', unit: '%', hint: '11' },
      ],
      validate: v => {
        if (![v.lo12, v.hi12, v.lo28, v.hi28].every(Number.isFinite))
          return null;
        if (
          near(v.lo12, 24, 1) &&
          near(v.hi12, 45, 1) &&
          near(v.lo28, 9, 1) &&
          near(v.hi28, 11, 1)
        ) {
          return {
            level: 'ok',
            message:
              'At 1.2 pixels the peak holds 24 to 45 percent, a factor of 1.9; at 2.8 it holds 9 to 11, a factor of 1.16. Undersampling makes the brightest pixel a poor measure of how much light a star has, so whether a star saturates depends on its position as well as its brightness.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the width to 1.2, then 2.8, and read the two percentages in the Sampling row each time: about 24 and 45, then 9 and 11.',
        };
      },
      tool: FX({ nonlinear: 1, bright: 12.5, fwhm: 1.2 }),
    },
    {
      sid: 'aperture-scatter',
      after: 'phase-dependence',
      depth: 'advanced',
      type: 'measure',
      title: 'What it does to photometry',
      body: `The photometry sums the flux in an aperture 1.5 FWHM in radius. The
             <em>Sampling</em> row also gives how much that flux varies (one standard
             deviation, in percent) as the star moves within its pixel. Read it at
             <strong>1.2</strong> and at <strong>2.8</strong> pixels; the instrument gives
             the ratio.`,
      fields: [
        { id: 's12', label: 'Variation at 1.2 px', unit: '%', hint: '0.27' },
        { id: 's28', label: 'Variation at 2.8 px', unit: '%', hint: '0.035' },
        {
          id: 'ratio',
          label: 'Ratio (1.2 over 2.8)',
          unit: '',
          compute: v => v.s12 / v.s28,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.s12, v.s28].every(Number.isFinite)) return null;
        if (near(v.s12, 0.271, 0.02) && near(v.s28, 0.035, 0.005)) {
          return {
            level: 'ok',
            message:
              'About 0.27 percent against 0.035: nearly eight times as much scatter when undersampled, yet small next to the photon noise of a faint star. For photometry with a proportional aperture the cost of undersampling is modest; for centroids, for finding the peak, and for the saturation of the brightest pixel it is not.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the last percentage in the Sampling row at each width: about 0.27 at 1.2 px and 0.035 at 2.8 px.',
        };
      },
      tool: FX({ nonlinear: 1, bright: 12.5, fwhm: 1.2 }),
    },
    {
      sid: 'what-undersampling-costs',
      after: 'aperture-scatter',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What undersampling costs',
      body: `The aperture&rsquo;s flux varied by a few tenths of a percent; the peak pixel by
             a factor of two.`,
      prompt:
        'For a star that must be measured, which cost of undersampling matters most?',
      options: [
        'The peak pixel: whether it saturates depends on the star’s place in the pixel, so the linear limit has to be applied to the largest share',
        'The total flux: an undersampled star always has the wrong flux',
        'Nothing: every undersampled frame is as good as a well-sampled one',
        'The sky: undersampling changes the sky level',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'total',
          option: 1,
          say: 'The total flux in a proportional aperture varies by a fraction of a percent here; undersampling leaves the sum nearly intact and distorts how it is shared among pixels.',
        },
        {
          id: 'nothing',
          option: 2,
          say: 'It costs the peak pixel’s meaning, the centroid’s precision and the shape of the profile; photometry survives because the aperture sums the light that the pixels share.',
        },
      ],
      hints: [
        'Look at how much the peak share varied, against how much the aperture flux did.',
      ],
      because:
        'The sum survives; the peak pixel does not. A star that is safe at the corner of a pixel can saturate at its middle, so the safe flux is set by the largest share, as in the step on where the measurement is safe.',
      tool: FX({ nonlinear: 1, bright: 12.5, fwhm: 1.2 }),
    },
  ],
};

export const THE_SATURATED_STAR_ES = {
  title: 'La estrella saturada',
  subtitle:
    'Por qué la estrella más brillante de la imagen tiene la magnitud equivocada, qué hacen el desbordamiento de carga y los rayos cósmicos a sus vecinas y dónde es segura una medida',
  objectives: [
    'Predecir qué da la medida de una estrella saturada, leerla y decir por qué una estrella demasiado brillante sale demasiado débil',
    'Convertir el flujo recortado en el error de magnitud que produce',
    'Decir qué hace el desbordamiento de carga a las estrellas de la columna de una estrella saturada y por qué un píxel marcado se rechaza en vez de repararse a mano',
    'Decir qué hace la traza de un rayo cósmico a las estrellas que cruza y qué hace un observador al respecto',
  ],
  steps: [
    {
      title: 'La estrella más brillante de la imagen',
      body: 'Un CCD registra la luz acumulando electrones en cada píxel, y un píxel solo puede guardar cierto número: la <strong>capacidad máxima</strong>, 50&nbsp;000 electrones aquí. La imagen muestra una estrella muy brillante, <strong>S</strong>, entre otras más débiles. La herramienta de fotometría mide cada estrella y, cuando no puede fiarse de un número, lo <em>rechaza</em> y dice por qué: las estrellas dibujadas en naranja son las que rechazó.\n\nLa imagen es <strong>sintética</strong>: la hizo un modelo, y los brillos de las estrellas y los electrones que pusieron en la imagen se conocen exactamente. Nadie la observó.',
    },
    {
      title: '¿Cuál habría sido el número?',
      body: 'La herramienta rechaza S. Supón que no lo hubiera hecho: suma la luz en un círculo alrededor de la estrella, como en todas las demás. La fila de S dice qué habría leído, como parte de los electrones que puso el modelo.',
      prompt: 'Sumado de todos modos, el flujo de S sería&hellip;',
      options: [
        'casi el flujo verdadero, porque una estrella brillante es fácil de medir',
        'mucho menor, porque los píxeles más brillantes no pueden guardar más que la capacidad máxima',
        'mayor, porque la luz de más se derrama dentro del círculo',
        'imposible de decir sin más observaciones',
      ],
      hints: [
        'Piensa en el píxel del centro de la estrella: recibe mucha más luz de la que un píxel puede guardar.',
      ],
      because:
        'Mucho menor: los píxeles centrales guardan 50&nbsp;000 electrones cada uno y el resto de su luz no se registra.',
    },
    {
      title: 'Lo que lee la estrella recortada',
      body: 'Lee la fila de la <strong>Estrella S</strong>: sin tener en cuenta el rechazo, ¿qué parte de los electrones que puso el modelo habría leído la suma? Dala en porcentaje.',
      fields: [{ label: 'Parte del flujo verdadero que leería' }],
    },
    {
      title: 'El error de magnitud',
      body: 'Una estrella con el 30 por ciento de su flujo parece más débil en cierto número de magnitudes. Escribe de nuevo la parte y el instrumento da el error de magnitud, 2,5 veces el logaritmo del flujo verdadero entre el medido: lo demasiado débil que se catalogaría la estrella.',
      fields: [
        { label: 'Parte del flujo verdadero que leería' },
        { label: 'Error de magnitud (demasiado débil)' },
      ],
    },
    {
      title: '¿Por qué demasiado débil?',
      body: 'La estrella es lo más brillante de la imagen y su flujo medido es la fracción más pequeña de la verdad.',
      prompt: '¿Por qué una estrella demasiado brillante sale demasiado débil?',
      options: [
        'Un píxel guarda como máximo la capacidad máxima, así que la luz de más no se registra y la suma se queda corta',
        'El telescopio no puede recoger tanta luz, así que la estrella llega atenuada',
        'La estrella es tan brillante que el ruido la oculta',
        'La herramienta resta demasiado cielo alrededor de una estrella brillante',
      ],
      misconceptions: [
        {
          say: 'La luz llegó: el modelo puso 5 millones de electrones en la imagen. Fueron los píxeles los que no pudieron guardarla.',
        },
        {
          say: 'El ruido de una estrella brillante es pequeño frente a su señal. El problema no es el ruido sino un límite duro a lo que guarda cada píxel.',
        },
        {
          say: 'El nivel del cielo es el mismo alrededor de cada estrella. El déficit está en los píxeles de la propia estrella.',
        },
      ],
      hints: [
        '¿Cuál es el mayor número de electrones que puede guardar un píxel?',
      ],
      because:
        'Cada píxel se satura en la capacidad máxima; la luz que llega cuando un píxel está lleno se pierde (o, como muestra el paso siguiente, se derrama), y una suma de lo registrado se queda corta.',
    },
    {
      title: 'Adónde va la carga de más',
      body: 'Activa el <strong>desbordamiento de carga</strong>. En un CCD la carga que un píxel lleno no puede guardar puede derramarse a lo largo de su columna hacia los píxeles de arriba y de abajo. <strong>N1</strong> y <strong>N2</strong> son estrellas débiles en la columna de S; <strong>C</strong> es una estrella débil en otro sitio. La imagen marca ahora los píxeles que recibieron carga derramada (magenta).',
      prompt: '¿Cuáles de las tres estrellas débiles rechazará la herramienta?',
      options: [
        'Ninguna: son débiles y están lejos de S',
        'N1 y N2, las de la columna de S',
        'Solo C',
        'Las tres',
      ],
      hints: [
        'La carga derramada viaja a lo largo de una columna, no a través de la imagen.',
      ],
      because:
        'N1 y N2: la carga se derrama hacia arriba y hacia abajo por la columna de S hasta agotarse, y una estela que atraviesa el círculo de una estrella se marca y se rechaza.',
    },
    {
      title: 'La estela',
      body: 'Con el desbordamiento activado, cuenta cuántas de las estrellas débiles <strong>N1, N2 y C</strong> rechaza la herramienta, y lee en la fila <em>Desbordamiento</em> cuántos píxeles recibieron carga de píxeles saturados.',
      fields: [
        { label: 'Estrellas débiles rechazadas (de N1, N2, C)' },
        { label: 'Píxeles que recibieron carga desbordada' },
      ],
    },
    {
      title: 'Un rayo por el círculo',
      body: 'Ahora desactiva el desbordamiento y activa las <strong>trazas de rayos cósmicos</strong>, con S atenuada para que no esté saturada. Un rayo cósmico es una partícula cargada que cruza el detector y deja una traza de carga (cian). La herramienta rechaza las estrellas cuyo círculo cruza una traza.',
      prompt:
        'Una estrella débil que necesitas se rechaza porque una traza la cruza. ¿Qué hace un observador?',
      options: [
        'Tomar más exposiciones y combinarlas, de modo que ningún píxel reciba un impacto en más de una imagen',
        'Medirla de todos modos y restar el flujo de una traza típica',
        'Restar la mediana de toda la imagen',
        'Nada: un rayo cósmico es demasiado pequeño para importar',
      ],
      misconceptions: [
        {
          say: 'Una traza deposita una cantidad distinta en cada caso, fijada por el ángulo con que cruza. El número marcado está mal en una cantidad que nadie conoce; sin marcar, está mal en más de cinco veces su propio error en el modelo.',
        },
        {
          say: 'La mediana de una imagen es el cielo. No dice nada de la carga que una traza dejó en unos pocos píxeles.',
        },
        {
          say: 'Una traza pone unos mil electrones en cada píxel que cruza; una estrella débil puede tener menos que eso en su píxel más brillante.',
        },
      ],
      hints: ['Una traza cae en píxeles distintos en exposiciones distintas.'],
      because:
        'Combina varias exposiciones con un rechazo (una mediana o una media recortada): una traza está en una imagen en un lugar que las otras no tienen, y la combinación la elimina.',
    },
    {
      title: 'Qué hace un observador',
      body: `Lo que viste se reduce a una idea: <strong>un indicador de calidad es una
             negativa, y la negativa es la respuesta segura</strong>. Una estrella saturada
             se evita con una exposición más corta o con la estrella desenfocada, y se mide
             donde no se satura. Una estrella cruzada por un rayo cósmico se recupera
             combinando varias exposiciones con rechazo. Y un píxel marcado nunca se
             corrige a mano: se sustituye por una imagen mejor. Las imágenes son sintéticas
             y los efectos son modelos declarados, no un detector medido.`,
    },
  ],
};

export const THE_SATURATED_STAR_DEEPER_ES = {
  steps: [
    {
      title: 'Una respuesta que se curva antes de parar',
      body: 'Activa la <strong>no linealidad</strong>. Un detector real no registra los electrones linealmente hasta la capacidad máxima: la respuesta se curva cerca de ella. El modelo es aquí una curva declarada: lineal hasta un codo en 0,8 de la capacidad máxima y después una caída tipo tanh, de modo que un píxel lleno lee algo menos de 50&nbsp;000. El gráfico bajo la imagen muestra el máximo de cada estrella, registrado frente a la carga recogida. La línea vertical discontinua es el <strong>límite lineal</strong>, donde la respuesta está 1 por ciento por debajo de la recta.\n\nLa curva es <strong>una elección del modelo</strong>, no una medida de ningún detector. En uno real se mide, exponiéndolo a una luz uniforme y representando la salida frente a la exposición.',
    },
    {
      title: 'El límite lineal y la meseta',
      body: 'Lee la fila <em>Límite lineal</em>: el número de electrones con el que la respuesta está 1 por ciento por debajo de lo lineal, y lo que lee un píxel lleno. Después da el límite como porcentaje de la capacidad máxima.',
      fields: [
        { label: 'Límite lineal' },
        { label: 'Lo que lee un píxel lleno' },
        { label: 'Límite como parte de la capacidad máxima' },
      ],
    },
    {
      title: '¿Cuánto puede brillar S y seguir midiéndose?',
      body: 'Con la no linealidad activada, sube la magnitud de S desde 12 (más brillante es más bajo). Halla la magnitud <strong>más brillante</strong>, con el medio punto de magnitud del control, con la que la herramienta todavía mide S en vez de rechazarla.',
      fields: [{ label: 'Magnitud más brillante aún medida' }],
    },
    {
      title: 'Dónde es segura la medida',
      body: 'El límite es de un <em>píxel</em>. El píxel más brillante de una estrella guarda solo una parte de su luz: la fila <em>Muestreo</em> da el intervalo, según dónde esté la estrella dentro de su píxel. Una estrella es segura si su píxel más brillante se queda por debajo del límite incluso en el peor sitio, la parte mayor. Escribe esa parte mayor (porcentaje); el instrumento da los electrones máximos que puede entregar una estrella y la magnitud de esa estrella en 60 segundos (una estrella de magnitud 0 da aquí 5,606 &times; 10<sup>8</sup> electrones por segundo).',
      fields: [
        { label: 'Mayor parte de la luz en un píxel' },
        {
          label: 'Máximo de electrones que puede entregar una estrella segura',
        },
        { label: 'Su magnitud en 60 s' },
      ],
    },
    {
      title: '¿Podría corregirse?',
      body: 'Aquí se conoce la curva, así que podría deshacerse: un píxel que lee 46&nbsp;000 electrones dice cuántos se recogieron. La herramienta rechaza en su lugar.',
      prompt:
        '¿Por qué rechazar es lo más seguro por defecto en un detector real?',
      options: [
        'La curva de un detector real hay que medirla, difiere de un píxel a otro y de una noche a otra, y un píxel lleno ha perdido toda su información',
        'Una corrección es imposible en principio: ninguna función puede invertirse',
        'La corrección cambia el ruido, así que ninguna estrella puede corregirse',
        'Las correcciones solo se permiten en las estrellas más brillantes',
      ],
      misconceptions: [
        {
          say: 'Una curva monótona puede invertirse cuando se conoce (el núcleo lo hace, y la comprobación muestra que recupera los electrones). La dificultad está en conocerla en un detector real.',
        },
        {
          say: 'El ruido crece donde la curva es plana, pero eso limita una corrección en vez de prohibirla; el problema mayor es conocer la curva y la meseta.',
        },
      ],
      hints: [
        '¿Podrías aplicar la corrección a un píxel lleno? ¿Qué lee, llegue la luz que llegue?',
      ],
      because:
        'La corrección necesita una curva medida, y falla en un píxel lleno, que lee la misma meseta llegue lo que llegue. Los observadores mantienen las estrellas por debajo del límite lineal y miden la curva (la curva de transferencia de fotones) antes de fiarse de una corrección.',
    },
    {
      title: 'Una estrella más estrecha que dos píxeles',
      body: 'Fija la anchura del perfil en <strong>1,2 píxeles</strong>. Un perfil necesita una anchura de unos 2 píxeles para estar muestreado: más estrecho está <em>submuestreado</em>, y los píxeles ya no siguen su forma. El modelo ya integra el perfil sobre cada píxel cuadrado, así que los píxeles son exactos; lo que cambia es que dónde está la estrella <em>dentro</em> de su píxel decide ahora cuánta luz cae en el píxel más brillante. La fila <em>Muestreo</em> da el intervalo.',
    },
    {
      title: 'Dos estrellas, un brillo',
      body: 'Dos estrellas entregan exactamente el mismo número de electrones. Una está en el centro de un píxel y la otra en su esquina. El perfil mide 1,2 píxeles de ancho.',
      prompt: 'Los píxeles más brillantes de las dos estrellas guardan&hellip;',
      options: [
        'la misma carga: las estrellas son igual de brillantes',
        'cargas que difieren en un factor de unos dos, así que una podría saturarse y la otra no',
        'cargas que difieren en unos pocos por ciento',
        'la misma carga solo si las estrellas están por encima del límite lineal',
      ],
      hints: [
        'En el centro la estrella cae en un píxel; en la esquina la comparten cuatro.',
      ],
      because:
        'Un factor de unos dos: el píxel del máximo guarda el 45 por ciento de la luz en el centro y el 24 en la esquina.',
    },
    {
      title: 'El píxel del máximo, según la fase',
      body: 'Lee la fila <em>Muestreo</em> con una anchura de <strong>1,2</strong> píxeles y luego de <strong>2,8</strong>: la parte menor y la mayor de la luz de una estrella que guarda el píxel más brillante.',
      fields: [
        { label: 'Parte menor con 1,2 px' },
        { label: 'Parte mayor con 1,2 px' },
        { label: 'Parte menor con 2,8 px' },
        { label: 'Parte mayor con 2,8 px' },
      ],
    },
    {
      title: 'Qué le hace a la fotometría',
      body: 'La fotometría suma el flujo en una apertura de radio 1,5 FWHM. La fila <em>Muestreo</em> da también cuánto varía ese flujo (una desviación típica, en porcentaje) al moverse la estrella dentro de su píxel. Léelo con <strong>1,2</strong> y con <strong>2,8</strong> píxeles; el instrumento da el cociente.',
      fields: [
        { label: 'Variación con 1,2 px' },
        { label: 'Variación con 2,8 px' },
        { label: 'Cociente (1,2 entre 2,8)' },
      ],
    },
    {
      title: 'Lo que cuesta el submuestreo',
      body: 'El flujo de la apertura varió unas décimas de por ciento; el píxel del máximo, un factor de dos.',
      prompt:
        'Para una estrella que hay que medir, ¿qué coste del submuestreo importa más?',
      options: [
        'El píxel del máximo: que se sature depende del lugar de la estrella en el píxel, así que el límite lineal hay que aplicarlo a la parte mayor',
        'El flujo total: una estrella submuestreada tiene siempre el flujo equivocado',
        'Nada: toda imagen submuestreada es tan buena como una bien muestreada',
        'El cielo: el submuestreo cambia el nivel del cielo',
      ],
      misconceptions: [
        {
          say: 'El flujo total en una apertura proporcional varía aquí una fracción de por ciento; el submuestreo deja casi intacta la suma y distorsiona cómo se reparte entre píxeles.',
        },
        {
          say: 'Cuesta el significado del píxel del máximo, la precisión del centroide y la forma del perfil; la fotometría sobrevive porque la apertura suma la luz que comparten los píxeles.',
        },
      ],
      hints: [
        'Mira cuánto varió la parte del máximo frente a cuánto varió el flujo de la apertura.',
      ],
      because:
        'La suma sobrevive; el píxel del máximo no. Una estrella que es segura en la esquina de un píxel puede saturarse en su centro, así que el flujo seguro lo fija la parte mayor, como en el paso sobre dónde es segura la medida.',
    },
  ],
};

const CONTENT = {
  'the-saturated-star': {
    topic:
      'What a detector does to a bright star: a full pixel holds a fixed charge, so the measured flux is a fraction of the true one (30 percent for the bright star here, 1.3 magnitudes too faint); charge that cannot be held spills along the column and spoils the stars on it; a cosmic ray puts a track of charge across an aperture; a response that bends near the full well sets a linear limit (45,330 of 50,000 electrons) below which a measurement is safe; and a profile narrower than two pixels makes the peak pixel depend on where the star sits in it.',
    difficulty:
      'Introductory (a share and a magnitude); majors (a response curve and the limit on a pixel); advanced (sampling and what it costs the peak pixel and the photometry)',
    placement:
      'In a survey course after the unit on detectors and before photometry; in a majors course beside the investigations of the CCD and of exposure planning. It supports OpenStax Astronomy 2e chapter 6 (astronomical instruments). It is the investigation behind the refusals of Prompt 180’s photometry.',
    overview:
      'Students predict what the photometry tool would read for the brightest star in a synthetic frame, read it (30 percent of the true flux), turn it into a magnitude error (1.3 mag), say why, then see what charge bleeding does to the stars on the bright star’s column (two of three refused) and what a cosmic-ray track does. At the quantitative depth they read the linear limit and the plateau of a stated nonlinear response, find the brightest star still measured and estimate it from the largest peak share; at the advanced depth they read how the peak pixel and the aperture flux depend on the star’s place in its pixel for an undersampled profile.',
    priorKnowledge: [
      'A CCD collects electrons in pixels',
      'Five magnitudes is a factor of 100 in brightness',
      'A star seen through a telescope is a small blur, not a point',
    ],
    keyConcepts: [
      {
        heading: 'A pixel holds a fixed charge',
        body: 'Beyond the full well the light of a bright star is not recorded (or spills). A sum of what was recorded is short, and the magnitude is too faint.',
      },
      {
        heading: 'A flag is a refusal, and the refusal is the safe answer',
        body: 'A pixel at the linear limit, a bleed trail and a cosmic-ray track are flagged in the frame’s sidecar; the tool refuses an aperture that holds one. In the model an unflagged cosmic-ray track spoils a faint star by more than five times its own error.',
      },
      {
        heading: 'The linear limit is on a pixel, the safe flux is on a star',
        body: 'A star is safe if its brightest pixel stays under the limit at the pixel’s worst place; for a well-sampled star that is about a tenth of its light.',
      },
    ],
    features: [
      {
        name: 'The detector-effects panel (its own lazy family)',
        text: 'A synthetic frame with a bright star, two faint stars on its column, a faint control and a ladder of five rising brightnesses, with toggles for the nonlinearity, charge bleeding and cosmic-ray tracks and a profile width; each star’s measurement or refusal beside the number it would have given, and the sidecar flags near it.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the linear limit, the brightest star still measured, the safe flux. Advanced: the peak pixel and the aperture flux against the position in the pixel for an undersampled profile.',
      },
      {
        name: 'Synthetic frames, stated',
        text: 'Every step says the frame is synthetic. The nonlinearity, the track deposit and the bleed rule are stated models, not the measured response of any detector.',
      },
    ],
    misconceptions: [
      {
        claim: 'A bright star is easy to measure.',
        response:
          'Until its pixels fill: the brightest star in this frame reads 30 percent of its true flux.',
      },
      {
        claim:
          'A saturated star’s extra light is just lost, and nothing else is affected.',
        response:
          'In a CCD the charge can spill along the column, and the stars on that column are then wrong too (two of three here).',
      },
      {
        claim: 'A cosmic ray is too small to matter.',
        response:
          'A track puts about a thousand electrons in each pixel it crosses, more than a faint star’s brightest pixel holds.',
      },
      {
        claim: 'The brightest pixel tells how bright a star is.',
        response:
          'It holds 9 to 11 percent of the light of a well-sampled star and 24 to 45 percent of an undersampled one, by where the star sits in its pixel.',
      },
    ],
    teachingNotes: [
      'The frame is a synthetic model: a Gaussian profile integrated over square pixels, Poisson and read noise, a full well of 50,000 electrons, a response with a knee at 0.8 of it, cosmic-ray tracks and a column spill rule (DETECTOR_EFFECTS.md has the equations). The sidecar flags are the model’s own truth; the tool judges a pixel by its value against the contract’s limit and by the bleed and cosmic-ray bits.',
      'With bleeding on, the bright star itself is refused as masked rather than saturated, because the pixels beside its core carry the bleed bit; with it off it is refused as saturated. Both are refusals of the same fact.',
      'The model is validated against its own stated curves and against an independent implementation of the track deposit and the spill rule; no authentic saturated-star frame was measured. Two checks of the committed contract failed and are reported: the Observatory’s own cosmic-ray mask finds half of the detectable track pixels (its sharpness test needs a deposit of about four times the background), and an unflagged bleed trail is still refused because its pixels sit at the full well.',
      'Inherited limits: one full well for every pixel; a stated curve; no charge-transfer loss, hot columns or persistence.',
    ],
    discussion: [
      'Why is a 30 percent flux a bigger problem for a catalog than a 30 percent error on a faint star?',
      'What would an observer do to measure the brightest star in this field?',
      'Why does a shorter exposure help with a saturated star, and what does it do to the chance of a cosmic-ray track?',
    ],
    extensions: [
      'Step S’s brightness through the ladder and watch its row go from measured to refused; note the magnitude at which it changes with a 5 second exposure.',
      'Set the profile width to 1 pixel and say what the largest peak share does to the brightest safe star.',
    ],
    modelNotes:
      'js/kernels/detector/effects.js (the response, the tracks, the spill), sampling.js (the peak share and the aperture variation), frame.js (the effects field), js/effectsField.js (the sidecar and the tool’s measurement), DETECTOR_EFFECTS.md.',
  },
};

const FLOW = {
  'the-saturated-star': [
    {
      from: 'a-bright-star',
      to: 'bright-star-predict',
      text: 'The brightest star in a synthetic frame is refused by the tool; the prediction of what its flux would read had it not been.',
    },
    {
      from: 'clipped-star',
      to: 'why-too-faint',
      text: 'The clipped star reads 30 percent of its flux, which is 1.3 magnitudes too faint, and why the error has a floor and not a scatter.',
    },
    {
      from: 'trail-predict',
      to: 'trail',
      text: 'Charge bleeding: which faint stars the tool refuses (the two on the column) and the 85 pixels the spill fed.',
    },
    {
      from: 'a-ray',
      to: 'what-an-observer-does',
      text: 'A cosmic-ray track through a faint star, combining exposures, and what an observer does about all three effects.',
    },
  ],
};

const EXPECTATIONS = {
  'the-saturated-star': {
    'clipped-star':
      'About 30 percent (within 2): the share of the true flux the clipped sum reads for the bright star at V = 9.5 and 60 s.',
    trail:
      'Two of the three faint stars refused with bleeding on, and 85 pixels fed by the spill.',
    'magnitude-error':
      'About 1.3 magnitudes too faint (within 0.12): the clipped sum is 30 percent of the truth, so the magnitude is 2.5 log10(1/0.302) fainter.',
  },
};

const BANDS = {
  'the-saturated-star': {
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
  'the-saturated-star': THE_SATURATED_STAR_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'the-saturated-star': THE_SATURATED_STAR_DEEPER,
};
export const DEPTH_ES = {
  'the-saturated-star': THE_SATURATED_STAR_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [THE_SATURATED_STAR];
