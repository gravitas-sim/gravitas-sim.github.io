// =============================================================================
// Measuring the Moon, deeper
// -----------------------------------------------------------------------------
// The quantitative and advanced steps. They live in their own module since the
// squeeze answer outgrew the shared file's line ceiling
// (./measurement-sequence.js re-exports them, so the instructor registries and
// every loader see the same object as before). Content only, no imports.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;
const MM = (values = {}, hide = []) => ({ id: 'moon-marks', values, hide });

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
      sid: 'a-diameter-with-the-squeeze',
      after: 'a-pixel-at-each-end',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'The diameter with an error bar',
      body: `Report the diameter of the dark plain as a value, then &plusmn;, then an uncertainty
             you can defend. Two things are not in the tool&rsquo;s own figure. A careful person
             places the soft edge to within about three pixels either way, which is 21 km. And if
             the plain is round, the slant you measured makes it wider than your round circle by
             that share, along one direction only. It counts as right when the range you give
             reaches the plain&rsquo;s allowed diameter, and is no wider than 60 km.`,
      prompt: 'The diameter, with its uncertainty',
      unit: 'km',
      placeholder: 'a value, then ± its uncertainty',
      answer: 660,
      tolerance: 4,
      maxUncertainty: 60,
      hints: [
        'Write the diameter, then ±, then an uncertainty that includes how well the edge can be placed and the slant.',
      ],
      because:
        'About 634 km, and up to about 660 if the plain is round: the 6 km the tool states is only the rounding of the marks. The soft edge adds about 21 km either way, and the slant, about 4 percent of 634 km, adds about 26 km upward only, so an error bar you can defend is longer above the value than below it.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
    {
      sid: 'near-the-limb',
      after: 'a-diameter-with-the-squeeze',
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
          want: '0.89',
        },
        {
          id: 'share',
          label: 'Width along that direction',
          unit: '%',
          want: '45',
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

export default MEASURING_THE_MOON_DEEPER;
