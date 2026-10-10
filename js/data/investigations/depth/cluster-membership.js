// =============================================================================
// Cluster Membership by Motion, deeper (Prompt 92)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the distance from the mean parallax by
// hand, and the cluster's internal velocity spread. Advanced: the field stars
// the fit expects, and what parallax adds to a fit by proper motion alone.
// Expected values are recomputed from the model (tools/authoring/galacticModels.mjs).
// =============================================================================

const CM = (values = {}) => ({ id: 'cluster-members', values });

export default {
  id: 'cluster-membership',
  steps: [
    {
      sid: 'distance-by-hand',
      after: 'read-the-distance',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The distance by hand',
      body: `A star whose parallax is p milliarcseconds is 1 ÷ p kiloparsecs
             away. The members’ mean parallax is 0.385&nbsp;mas.`,
      prompt: 'The distance',
      unit: 'kpc',
      answer: 2.6,
      tolerance: 0.05,
      hints: ['Divide 1 by 0.385.'],
      worked:
        '1 ÷ 0.385 = 2.60 kpc. A star at 1 kpc has a parallax of 1 mas; this cluster’s is a little more than a third of that.',
      feedback: {
        close: 'Close. The distance is the reciprocal of the parallax.',
        'wrong-order-of-magnitude':
          'A power of ten out. A parallax below 1 mas is a distance above 1 kpc.',
        off: 'Distance = 1 ÷ parallax, with the parallax in mas and the answer in kpc.',
      },
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'internal-velocity',
      after: 'why-so-stable',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How fast the members move among themselves',
      body: `The row “Cluster’s spread in proper motion” says how much the
             members differ among themselves: 0.081&nbsp;mas/yr, before errors.
             A proper motion μ in mas/yr at a distance d in kpc is a speed
             4.74 × μ × d in km/s. Use d = 2.6&nbsp;kpc.`,
      prompt: 'The members’ speed spread across the sky',
      unit: 'km/s',
      answer: 1,
      tolerance: 0.15,
      hints: ['Multiply 4.74 by 0.081 and by 2.6.'],
      worked:
        '4.74 × 0.081 × 2.6 = 1.0 km/s. The stars of an old cluster stir among themselves at about a kilometer per second, small against the 20 or more km/s of the field’s spread.',
      feedback: {
        close: 'Close. The factor is 4.74 × μ × d.',
        off: 'Speed = 4.74 × μ × d, with μ = 0.081 mas/yr and d = 2.6 kpc.',
      },
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'expected-field',
      after: 'does-the-color-agree',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How many field stars the fit expects',
      body: `The row “Expected members” adds every star’s probability. The table
             has 993 stars, and the fit expects 505.9 of them in the cluster
             (proper motion and parallax).`,
      prompt: 'The number of field stars the fit expects',
      unit: 'stars',
      answer: 487,
      tolerance: 3,
      hints: [
        'Everything not expected in the cluster is expected in the field.',
      ],
      worked:
        '993 − 505.9 = 487.1. The expected members are a sum of probabilities, so it need not be a whole number, and it differs a little from the count above a threshold.',
      feedback: {
        close: 'Close. Subtract the expected members from the whole table.',
        off: 'Field = total − expected members, with 993 stars and 505.9 expected.',
      },
      tool: CM({ view: 1, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'what-parallax-adds',
      after: 'expected-field',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What parallax adds',
      body: `Switch the fit to <strong>proper motion only</strong> and compare
             with proper motion and parallax: the number of members barely
             moves (505 against 506), but the stars with probability between
             0.1 and 0.9 go from 8 to 4.`,
      prompt: 'What does that show?',
      options: [
        'Parallax resolves some borderline stars that proper motion alone could not decide, without changing the picture',
        'Parallax changes which cluster is found',
        'Proper motion alone is wrong',
        'Parallax makes every star a member',
      ],
      answer: 0,
      hints: ['Compare the two counts of uncertain stars.'],
      because:
        'It resolves borderline stars. A third independent measurement separates a few stars the motion alone leaves ambiguous, so the uncertain count falls from 8 to 4 while the member count stays within a star or two.',
      tool: CM({ view: 0, dims: 0, threshold: 0.5 }),
    },
  ],
};
