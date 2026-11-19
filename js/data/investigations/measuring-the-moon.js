// =============================================================================
// Measuring the Moon
// -----------------------------------------------------------------------------
// The English lesson. It lives in its own module since the pair, the squeeze and
// their validators outgrew the shared file's line ceiling
// (js/data/investigations/measurement-sequence.js re-exports it, so the barrel,
// the instructor registries and every loader see the same object as before).
// Content only, no imports. Every step carries a `sid`, an opaque stable id that
// student progress is keyed by: reword a step, move it, translate it, never
// change its sid. The deeper steps are in depth/measurement-sequence.js.
// =============================================================================

const MM = (values = {}, hide = []) => ({
  id: 'moon-marks',
  values,
  hide,
});
const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

export const MEASURING_THE_MOON = {
  id: 'measuring-the-moon',
  thumbnail: 'images/investigations/measuring-the-moon.webp',
  title: 'Measuring the Moon',
  subtitle:
    'Marks on a real picture, a scale from a known length, and a size in kilometers',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: ['what-is-a-measurement'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  // The picture is the subject, so nothing is staged behind it (D-R4-330-01).
  canvas: 'quiet',
  retired: {
    'scale-from-the-disc': {
      to: 'mark-the-disc-width',
      release: '3.1',
      was: {
        en: 'Set the two ends of the reference pair to the numbers the step named and read its length and scale.',
        es: 'Poner los dos extremos del par de referencia en los números que indicaba el paso y leer su longitud y su escala.',
      },
    },
    'a-diameter-with-an-error-bar': {
      to: 'a-diameter-with-the-squeeze',
      release: '3.1',
      was: {
        en: 'Give the plain’s diameter with an uncertainty that includes the soft edge, without the slant of the plain.',
        es: 'Dar el diámetro de la llanura con una incertidumbre que incluye el borde suave, sin la inclinación de la llanura.',
      },
    },
  },
  objectives: [
    'Say why a picture has no scale of its own, and where a scale comes from',
    'Give a real picture a scale from a length you know, and read a size in kilometers from a circle on it',
    'Predict the size of a feature before measuring it, and say what the stated uncertainty includes and what it leaves out',
    'Say why this picture can be marked and measured in pixels but not read for brightness',
  ],
  steps: [
    {
      sid: 'a-picture-of-the-moon',
      type: 'read',
      title: 'A real picture of the Moon',
      body: `This is a <strong>real</strong> picture: the Moon, photographed by NASA&rsquo;s
             Galileo spacecraft on 7 December 1992 as it flew past the Earth on
             its way to Jupiter. It is an enhanced-color composite, shown here in
             gray. <em>Enhanced</em> means the contrast was stretched to show
             differences in the ground, so its gray levels are for the eye and are
             not a measure of the light the Moon reflects. The Observatory calls such
             a picture <strong>display-only</strong>: you may mark it and measure
             it in [[pixel|pixels]], and nothing more.
             \n\nA picture has no scale of its own. This one is 496 pixels across,
             and a pixel is not a kilometer. The pixels are numbered from the lower
             left, x to the right and y up, and the disc is cropped close: its right
             edge touches the last column. In this investigation you give the picture a
             scale and take one measurement off it.`,
      tool: MM({}, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'predict-the-scale',
      type: 'predict',
      reveal: 'mark-the-disc-width',
      title: 'What gives a picture its scale?',
      body: `You want a length on the picture in kilometers, and you have only
             pixels.`,
      prompt: 'To turn pixels into kilometers you need&hellip;',
      options: [
        'the date the picture was taken',
        'a length in the picture that you already know in kilometers',
        'the brightness of the Moon in the picture',
        'the number of colors in the picture',
      ],
      answer: 1,
      hints: [
        'Where could a length in kilometers come from, with nothing else on the picture?',
      ],
      because:
        'A length in the picture that you already know. A picture records angles and pixels and never says how far away the thing is, so the only way to a scale is to point at something in it whose size you know by other means. Here that is the Moon itself, whose mean diameter, 3,474.8 km, was measured by other means.',
      tool: MM({}, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'mark-the-disc-width',
      type: 'measure',
      title: 'Mark the width of the disc',
      body: `The <strong>reference pair</strong> is a line along row 245, through the middle of
             the disc, and the tool takes it to span the Moon&rsquo;s mean diameter,
             3,474.8 km. Where you put its two ends sets the scale.
             \n\nMove <strong>Left end of the pair</strong> and <strong>Right end of the
             pair</strong> to the two edges of the Moon, then take the length of the pair
             and the scale it gives. The right edge touches the last column, so the disc may
             be a pixel or two wider than the picture: that is not in the
             [[uncertainty|uncertainty]] the tool states.`,
      fields: [
        {
          id: 'pair',
          label: 'Length of the pair',
          unit: 'px',
          want: '493',
          source: { tool: 'pair' },
        },
        {
          id: 'scale',
          label: 'Scale from the pair, in km per pixel',
          unit: '',
          want: '7.05',
          source: { tool: 'scale' },
        },
      ],
      validate: v => {
        if (![v.pair, v.scale].every(Number.isFinite)) return null;
        if (!near(v.scale * v.pair, 3474.8, 8)) {
          return {
            level: 'error',
            message:
              'The scale is the Moon’s width divided by the length of the pair. Take both readings from the instrument.',
          };
        }
        if (v.pair < 486) {
          return {
            level: 'error',
            message:
              'The pair stops short of the Moon’s edge. The tool still counts it as the Moon’s whole width, so every pixel is made to look bigger than it is. Look at where each end of the line meets the edge of the disc.',
          };
        }
        return {
          level: 'ok',
          message:
            'The pair reaches both edges, so one pixel is about 7 km on the Moon. The scale is only as good as the two things it rests on: the diameter assumed, and where the two ends sit.',
        };
      },
      tool: MM({ x1: 60, x2: 440 }, ['cx', 'cy', 'r']),
    },
    {
      sid: 'a-pair-that-stops-short',
      type: 'measure',
      title: 'A pair that stops short',
      body: `Now make the mistake on purpose. Move an end of the pair well inside the
             edge of the Moon, and take the scale and the diameter of the circle in
             kilometers. The circle stays the same size; a longer or shorter pair changes
             only the scale.`,
      fields: [
        {
          id: 'scale',
          label: 'Scale from the short pair, in km per pixel',
          unit: '',
          want: '8',
          source: { tool: 'scale' },
        },
        {
          id: 'km',
          label: 'Diameter of the circle',
          unit: 'km',
          want: '398',
          source: { tool: 'diameterKm' },
        },
      ],
      validate: v => {
        if (![v.scale, v.km].every(Number.isFinite)) return null;
        // The circle is 25 px in radius: its diameter is 50 pixels of this scale.
        if (!near(v.km, 50 * v.scale, 3)) {
          return {
            level: 'error',
            message:
              'The scale and the diameter must come from the same pair. Take both again once the pair is where you want it.',
          };
        }
        if (v.scale < 7.4) {
          return {
            level: 'error',
            message:
              'That pair is still close to the edge, within what the tool already states. Move the right end in by 30 pixels or more, then take both readings again.',
          };
        }
        return {
          level: 'ok',
          message:
            'The circle did not change, yet its diameter did. A pair that is short by some share makes every length read off the picture too long by the same share, so a scale error is carried into every size.',
        };
      },
      tool: {
        ...MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 25 }, ['cx', 'cy', 'r']),
        // The circle is pinned and hidden here, so the circle's reset button is not offered.
        presets: false,
      },
    },
    {
      sid: 'why-a-pair',
      type: 'question',
      kind: 'choice',
      title: 'Why the scale comes from you',
      body: `Some pictures carry world coordinates, and from them the Observatory can read a
             scale in arcseconds per pixel.`,
      prompt: 'Why does the scale have to come from a pair that you mark?',
      options: [
        'The picture was taken by a spacecraft, so it has no pixels',
        'The picture carries no coordinates or units for its pixels, so no scale can be read from it; the only scale is one you make from a length you know',
        'The Observatory does not trust pictures from NASA',
        'A scale is only needed for pictures in color',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'no-pixels',
          option: 0,
          say: 'Every digital picture has pixels. What this one lacks is a record of what a pixel is worth on the sky or on the ground.',
        },
        {
          id: 'trust',
          option: 2,
          say: 'It is not about trust. A display picture was stretched and re-encoded for the eye, and no one recorded a scale for it; a scale you state yourself is yours, and the tool shows it as such.',
        },
      ],
      hints: ['What does the picture record about its own pixels?'],
      because:
        'The picture carries no coordinates or units, so nothing in it says what a pixel is worth. A scale you make from a length you know is a measurement of yours, with the assumption written beside it, and that is the only kind this picture allows.',
      tool: MM({ x1: 3, x2: 496 }, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'predict-the-plain',
      type: 'predict',
      reveal: 'measure-the-plain',
      title: 'How wide is the dark plain?',
      body: `Near the middle of the disc there is a large dark plain, nearly round,
             with its center close to <em>x</em> = 289, <em>y</em> = 306. The Moon&rsquo;s dark plains are
             old lava flows. Before you measure it, look at it beside the whole disc.`,
      prompt: 'Across, the plain is about&hellip;',
      options: ['6 km', '60 km', '600 km', '6,000 km'],
      answer: 2,
      hints: [
        'Compare the plain with the pair drawn across the whole disc.',
        'The pair stands for the Moon’s width. What share of it is the plain?',
      ],
      because:
        'About 600 km, a little under a fifth of the Moon’s width: the plain spans roughly a fifth of the disc and the disc is 3,475 km across. The next step measures it.',
      // Held prediction: the circle's controls are hidden, so the plain is
      // compared by eye with the pair and cannot be measured before the guess.
      tool: {
        ...MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 20 }, [
          'x1',
          'x2',
          'cx',
          'cy',
          'r',
        ]),
        presets: false,
      },
    },
    {
      sid: 'measure-the-plain',
      type: 'measure',
      title: 'A circle on the plain',
      body: `The pair is set across the disc for you, so the scale is fixed. The circle starts at
             <em>x</em> = 289, <em>y</em> = 306. Change the <strong>radius</strong> until the circle
             follows the edge of the dark plain, and nudge the center if the circle drifts to one
             side. Then take the diameter of the circle in kilometers.`,
      fields: [
        {
          id: 'km',
          label: 'Diameter of the circle',
          unit: 'km',
          want: '634',
          source: { tool: 'diameterKm' },
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.km)) return null;
        if (near(v.km, 634, 45)) {
          return {
            level: 'ok',
            message:
              'That is within the few pixels a careful person can place the edge of a soft dark plain. The tool states a much smaller uncertainty; the next steps are about what it leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Fit the circle to the edge of the dark plain, then take the diameter of the circle in kilometers.',
        };
      },
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 30 }, ['x1', 'x2']),
    },
    {
      sid: 'squeezed-at-the-plain',
      type: 'measure',
      title: 'The plain is seen at a slant',
      body: `The plain is not at the middle of the disc, so you see it at a slant: a round
             feature here looks narrower along the line to the disc&rsquo;s center than it is.
             Move the circle&rsquo;s center onto the plain, near <em>x</em> = 289, <em>y</em> = 306,
             and take that width as a share of the true width. Then try a spot nearer the
             edge and see how the number changes.`,
      fields: [
        {
          id: 'share',
          label: 'Width of a round feature along the line to the center',
          unit: '%',
          want: '96',
          source: { tool: 'foreshort' },
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.share)) return null;
        if (near(v.share, 96, 3)) {
          return {
            level: 'ok',
            message:
              'Along the line to the disc’s center the plain looks a few percent narrower than it is, and across that line it does not. A round circle on it therefore measures somewhat less than the plain’s true width.',
          };
        }
        return {
          level: 'error',
          message:
            'Put the circle back on the plain (center near x = 289, y = 306), then take the width along the line to the center.',
        };
      },
      tool: {
        ...MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
        start: { x1: 3, x2: 496, cx: 250, cy: 245, r: 45 },
      },
    },
    {
      sid: 'what-would-change-it',
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for naming two things that change the diameter, for example where the edge of the plain is placed (a soft edge, so two careful people differ by a few pixels), where the two ends of the pair are placed, the assumed diameter of the Moon, the picture being cropped at the right, or the plain being seen at a slant, and for saying that the stated uncertainty includes only the rounding of each placement, and so leaves the softness of the edge, the slant and the assumptions out. Do not credit saying the number is exact, or that more marks of the same kind remove the assumptions.',
      title: 'What would change the number?',
      body: `Two people who each fit the circle by eye will not agree exactly, and the
             tool prints an uncertainty beside the diameter.`,
      prompt:
        'In two or three sentences: name two things that would change the diameter you got, and say which of them the stated uncertainty includes.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `A picture has no scale until you give it one, and the scale you give it is
             a measurement of yours, resting on a length you assumed and on two marks you
             placed. With it, a circle on a feature gave a size in kilometers, about
             634 km for the plain, and the tool&rsquo;s stated uncertainty covered only the
             rounding of your marks. The softness of the edge, the crop at the right,
             the assumed diameter and the slant of the plain (about 4 percent narrower along the line to the center) are not in it. And because the picture is a
             display picture, its gray levels are not light: you measured where things
             are and how big they are, and nothing about how bright.`,
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
  ],
};

export default MEASURING_THE_MOON;
