// =============================================================================
// The Rotating Disk, deeper (Prompt 92)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the circular speed from A - B by hand, and
// the mass enclosed by the Sun's orbit. Advanced: the halo's share of the force
// at the Sun, and why the disk is bounded. Expected values are recomputed from
// the model (tools/authoring/galacticModels.mjs).
// =============================================================================

const RD = (values = {}) => ({ id: 'rotating-disk', values });

export default {
  id: 'the-rotating-disk',
  steps: [
    {
      sid: 'v0-by-hand',
      after: 'speed-at-the-sun',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The speed by hand',
      body: `A circular orbit has speed V = R × Ω, with R the distance from the
             center and Ω the angular speed. Oort’s A − B is Ω at the Sun:
             27.24&nbsp;km/s/kpc. Use R = 8.3&nbsp;kpc.`,
      prompt: 'The circular speed at the Sun',
      unit: 'km/s',
      answer: 226,
      tolerance: 5,
      hints: ['Multiply 27.24 by 8.3.'],
      worked:
        '27.24 km/s/kpc × 8.3 kpc = 226 km/s. Its uncertainty is 8.3 times that of A − B (2.8 km/s/kpc), about 24 km/s, so 244 km/s from the curve agrees.',
      feedback: {
        close: 'Close. Check the multiplication: 27.24 × 8.3.',
        'wrong-order-of-magnitude':
          'A power of ten out. A speed in a galaxy is of order 100 to 300 km/s.',
        off: 'V = (A − B) × R, with A − B = 27.24 km/s/kpc and R = 8.3 kpc.',
      },
      tool: RD({ view: 0, weight: 0 }),
    },
    {
      sid: 'enclosed-mass',
      after: 'the-rotation-curve',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The mass inside the Sun’s orbit',
      body: `Gravity must supply the circular motion: M = v² r ÷ G. In units of
             kiloparsecs, km/s and solar masses, G = 4.30 × 10<sup>−6</sup>.
             Take v = 244&nbsp;km/s at r = 8.3&nbsp;kpc, the rotation curve’s
             values. This assumes the mass is spherical, which a disk is not:
             treat it as an estimate.`,
      prompt: 'The mass inside 8.3 kpc, in 10¹⁰ solar masses',
      unit: '',
      answer: 11.5,
      tolerance: 0.5,
      hints: ['244² is 59,536; multiply by 8.3 and divide by 4.30 × 10⁻⁶.'],
      worked:
        '244² × 8.3 ÷ 4.30 × 10⁻⁶ = 59,536 × 8.3 ÷ 4.30 × 10⁻⁶ = 1.15 × 10¹¹, or 11.5 × 10¹⁰ solar masses.',
      feedback: {
        close:
          'Close. M = v² r ÷ G; check that you divided by G and not multiplied.',
        'wrong-order-of-magnitude':
          'A power of ten out. Check the units: the answer is in tens of billions of solar masses.',
        off: 'M = v² × r ÷ G, with v = 244, r = 8.3 and G = 4.30 × 10⁻⁶; divide the answer by 10¹⁰.',
      },
      tool: RD({ view: 1, fit: 1 }),
    },
    {
      sid: 'halo-share',
      after: 'where-the-halo-matters',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The halo’s share at the Sun',
      body: `Speeds from different components add in quadrature, so a
             component’s share of the force is its speed squared over the total
             speed squared. In the halo fit, the row for 8.3&nbsp;kpc gives the
             halo’s speed (178.3) and the total (270.3).`,
      prompt: 'The halo’s share of v² at 8.3 kpc',
      unit: '%',
      answer: 43.5,
      tolerance: 2,
      hints: ['Square both, divide, multiply by 100.'],
      worked:
        '178.3² ÷ 270.3² = 31,790 ÷ 73,080 = 0.435, or 43.5 percent. Near the Sun the halo is already close to half the force in the model; far out it is nearly all of it.',
      feedback: {
        close: 'Close. Share of v² means squaring before dividing.',
        off: '(halo ÷ total)² × 100, with halo = 178.3 and total = 270.3 km/s.',
      },
      tool: RD({ view: 1, fit: 1 }),
    },
    {
      sid: 'why-bound-the-disk',
      after: 'halo-share',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why the disk is bounded',
      body: `The fits bound the disk at 8 × 10<sup>10</sup> solar masses. Without
             a bound, a disk can be made massive enough to fit the curve with no
             halo, and the fit would say nothing about a halo.`,
      prompt:
        'Why is bounding the disk honest rather than a thumb on the scale?',
      options: [
        'The bound comes from independent estimates of the Galaxy’s stellar mass, so the fit asks whether the stars we count can do it',
        'It makes the halo fit look better',
        'A disk cannot have mass above 8 × 10¹⁰ in any galaxy',
        'The data forbid a heavier disk',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'bound-is-tuning',
          option: 1,
          say: 'The bound applies to the stars-only fit too, and it is what makes that fit fail. It is set before the fit, from the stars we can count.',
        },
      ],
      hints: ['What question is the comparison meant to answer?'],
      because:
        'The question is whether the stars and gas we can count are enough. An unbounded disk would answer a different question (could some disk do it?) and the answer would be uninformative. The bound states the question; a different bound is a different, stated assumption.',
      tool: RD({ view: 1, fit: 2 }),
    },
  ],
};
