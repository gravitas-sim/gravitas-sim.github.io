// The deeper steps of ios-fire, in a module of its own so the shared file ./satellite-sequence.js stays inside its line ceiling.
// Every number is recomputed in tests/tidesLessons.test.js.
const TH = (values = {}, hide = []) => ({ id: 'tides-heating', values, hide });

// The names the lesson's picture of Jupiter and its moons carries (see ../satellite-sequence.js).
const IO_BIND = {
  io: { name: 'Io' },
  europa: { name: 'Europa' },
  ganymede: { name: 'Ganymede' },
  callisto: { name: 'Callisto' },
};
export const IOS_DEEPER = {
  id: 'ios-fire',
  steps: [
    {
      sid: 'how-far-from-the-maximum',
      bind: IO_BIND,
      after: 'two-interiors-one-heat',
      depth: 'quantitative',
      decides:
        'which k2/Q to divide into the model’s largest: the one the observed heat needs, which both pairs share',
      type: 'question',
      kind: 'numeric',
      title: 'How far from the largest k2/Q',
      body: `Both of your pairs sit near the same k2/Q: the row <strong>k2/Q the observed middle
             value needs</strong> gives it. The model allows k2/Q up to 0.3 (k2 = 1.5 over
             Q = 5).`,
      prompt:
        'How many times smaller is the k2/Q both pairs share than the model’s largest?',
      unit: '',
      answer: 17,
      tolerance: 0.5,
      hints: ['Divide 0.3 by the k2/Q in that row.'],
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
      sid: 'how-wide-is-the-bound',
      bind: IO_BIND,
      after: 'how-far-from-the-maximum',
      depth: 'quantitative',
      decides:
        'which two observed values set the ends of the range, and what the heating is proportional to',
      type: 'question',
      kind: 'numeric',
      title: 'How wide is the answer',
      body: `At one eccentricity the heating is proportional to k2/<em>Q</em>. The observed heat
             flow is not one number: it runs from 6 &times; 10<sup>13</sup> W to
             1.6 &times; 10<sup>14</sup> W, the two lines on the plot, so the k2/<em>Q</em> that
             fits is a range too.`,
      prompt:
        'By what factor does the k2/Q that fits differ between the highest and the lowest observed heat?',
      unit: '',
      answer: 2.67,
      tolerance: 0.1,
      hints: [
        'Heating is proportional to k2/Q, so compare the two observed values with each other.',
      ],
      worked:
        'Heating is proportional to k2/Q, so the factor is 1.6 × 10¹⁴ / 6 × 10¹³ = 2.67: however many pairs you find, the observation fixes k2/Q only to within a factor of about two and a half.',
      feedback: {
        close: 'Close. The larger observed value goes on top.',
        'wrong-order-of-magnitude':
          'A power of ten out: the two observed values are not that far apart.',
        off: 'Compare the highest and the lowest observed heat.',
      },
      tool: TH({ k2: 0.8, Q: 250, e: 0.0041 }),
    },
    {
      sid: 'what-would-separate-them',
      bind: IO_BIND,
      after: 'how-wide-is-the-bound',
      depth: 'advanced',
      decides:
        'which measurement depends on k2 or on Q alone, rather than on their ratio',
      type: 'question',
      kind: 'choice',
      title: 'What would separate them',
      body: `The observed heat fixes k2/<em>Q</em> and no more. Suppose a spacecraft could make one
             more measurement of Io.`,
      prompt: 'Which measurement would let you find k2 and Q separately?',
      options: [
        'The heat flow again, measured to a few percent',
        'How high the tide on Io rises as it goes round its orbit, which depends on k2 alone',
        'Io’s orbital period, measured to more digits',
        'The temperature of the lava at the surface',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'more-heat',
          option: 0,
          say: 'A better heat flow narrows k2/Q, but it is still the ratio. Many pairs share one ratio, so a more precise ratio does not split them.',
        },
        {
          id: 'period',
          option: 2,
          say: 'The period is already known far better than anything else here, and it enters the formula the same way for every interior, so it cannot tell k2 from Q.',
        },
        {
          id: 'lava',
          option: 3,
          say: 'The lava’s temperature says something about melting, but not how big the tide is or how much of it is lost, which are what k2 and Q are.',
        },
      ],
      hints: [
        'The heat depends on a ratio. You want a measurement that depends on one of the two numbers, not on their ratio.',
      ],
      because:
        'The height of the tide is set by k2 alone, while the heat is set by k2 divided by Q. A spacecraft that measures how far Io’s shape and gravity flex as it circles Jupiter gets k2, and then the heat gives Q.',
      tool: TH({ k2: 0.8, Q: 250, e: 0.0041 }),
    },
    {
      sid: 'what-the-formula-leaves-out',
      bind: IO_BIND,
      after: 'what-would-separate-them',
      depth: 'advanced',
      decides:
        'what the formula takes as given and what keeps the orbit eccentric',
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
export { IOS_DEEPER as default };
