// =============================================================================
// Einstein Rings and Arcs
// -----------------------------------------------------------------------------
// Content only, no imports (see bending-light.js for the conventions). The
// instrument is the lensing family's "lens-plane" tool (js/lensingWidgets.js
// over js/kernels/lensing): a point mass or a singular isothermal sphere, a
// source twice as far as the lens, the images the lens makes of it. The numbers
// a student reads are checked against that model by
// tests/lensingInvestigations.test.js.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'lens', name: 'A lens', teffK: 5800, lumSun: 1 },
    { role: 'source', name: 'A distant source', teffK: 9000, lumSun: 30 },
  ],
};
const LP = (values = {}) => ({ id: 'lens-plane', values });
const STAR = { kind: 0, logM: 0, logD: Math.log10(4), y: 0, size: 0.1 };
const GALAXY = { kind: 0, logM: 11, logD: 6, y: 0, size: 0.1 };

const EINSTEIN_RINGS_AND_ARCS = {
  id: 'einstein-rings-and-arcs',
  thumbnail: 'images/investigations/einstein-rings-and-arcs.webp',
  title: 'Einstein Rings and Arcs',
  subtitle:
    'The geometry of strong lensing, and a ring as a way to weigh a lens',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 24, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['bending-light'],
  tags: ['galaxies', 'gravity'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what an Einstein ring is and when a lens makes one',
    'Measure the Einstein radius of a star and of a galaxy, and see why they differ by a factor of a million',
    'Use the size of a ring to find the mass inside it',
    'Find the two images of an off-axis source and their magnifications, for a point mass and for a galaxy',
    'Say why most lensed galaxies are seen as arcs rather than rings',
  ],
  steps: [
    {
      sid: 'a-lens-makes-a-ring',
      stage: STARS,
      type: 'read',
      title: 'A ring made of a lens',
      body: `If a source lies exactly behind a lens, light can reach us all the
             way around it. We see a <strong>ring</strong>, with an angular
             radius called the <strong>Einstein radius</strong>:
             θ<sub>E</sub> = √(4GM ÷ c² × D<sub>ls</sub> ÷ (D<sub>l</sub>D<sub>s</sub>)),
             where D<sub>l</sub>, D<sub>s</sub> and D<sub>ls</sub> are the
             distances to the lens, to the source and between them.
             \n\nThe instrument draws the sky around a lens in units of the
             Einstein radius (the dashed ring). The orange disk is the source and
             the blue shapes are its images. It is a <strong>model</strong>: one
             thin lens, a source at twice its distance, ordinary Euclidean
             distances and no cosmology.`,
      tool: LP(STAR),
    },
    {
      sid: 'predict-the-ring',
      stage: STARS,
      type: 'predict',
      reveal: 'a-star-ring',
      title: 'How big is the ring of a star?',
      body: `The lens is a star of one solar mass, 4 kiloparsecs away, with
             the source straight behind it at 8. Do not change the instrument yet.`,
      prompt: 'The ring’s angular radius is about&hellip;',
      options: [
        'a milliarcsecond',
        'an arcsecond',
        'a degree',
        'a microarcsecond',
      ],
      answer: 0,
      hints: [
        'A milliarcsecond is a thousandth of an arcsecond; Hubble resolves about 50 of them.',
      ],
      because:
        'About a milliarcsecond. The Einstein radius of a star at kiloparsec distances is far smaller than any telescope can resolve, which is why stars make a microlensing event instead of a visible ring.',
      tool: LP(STAR),
    },
    {
      sid: 'a-star-ring',
      stage: STARS,
      type: 'measure',
      title: 'The ring of a star',
      body: `With one solar mass at 4 kpc, read the Einstein radius in
             milliarcseconds.`,
      fields: [
        { id: 'theta', label: 'Einstein radius', unit: 'mas', hint: '1.0' },
      ],
      validate: v => {
        if (!Number.isFinite(v.theta)) return null;
        if (Math.abs(v.theta - 1.01) <= 0.03) {
          return {
            level: 'ok',
            message:
              'About a milliarcsecond: at 4 kiloparsecs that is only 4 astronomical units. No telescope resolves the ring, so a star acts as a lens only by changing brightness.',
          };
        }
        return {
          level: 'error',
          message:
            'Load “A Sun at 4 kpc” (mass 1, distance 4 kpc, offset 0) and read “Einstein radius, in milliarcseconds”.',
        };
      },
      tool: LP(STAR),
    },
    {
      sid: 'a-galaxy-ring',
      stage: STARS,
      type: 'measure',
      title: 'The ring of a galaxy',
      body: `Load “A galaxy at 1 Gpc, source straight behind”: 10<sup>11</sup>
             solar masses inside the ring, 1 gigaparsec away. Read the Einstein
             radius in arcseconds, and its size at the lens in kiloparsecs.`,
      fields: [
        { id: 'theta', label: 'Einstein radius', unit: '″', hint: '0.64' },
        { id: 'radius', label: 'Radius at the lens', unit: 'kpc', hint: '3.1' },
      ],
      validate: v => {
        if (![v.theta, v.radius].every(Number.isFinite)) return null;
        if (
          Math.abs(v.theta - 0.638) <= 0.015 &&
          Math.abs(v.radius - 3.09) <= 0.1
        ) {
          return {
            level: 'ok',
            message:
              'A ring of two thirds of an arcsecond, 3 kiloparsecs across at the lens, is well within what the Hubble Space Telescope resolves. A galaxy is a billion times the mass of the star, and its ring is six hundred times larger on the sky.',
          };
        }
        return {
          level: 'error',
          message:
            'Load the galaxy preset (mass 10^11, distance 1 Gpc), then read the two rows “Einstein radius, in arcseconds” and “Einstein radius at the lens”.',
        };
      },
      tool: LP(GALAXY),
    },
    {
      sid: 'weigh-the-lens',
      stage: STARS,
      type: 'measure',
      title: 'Weigh a galaxy with its ring',
      body: `A ring is seen around a galaxy 1 gigaparsec away, and measures
             <strong>1.0 arcsecond</strong> in radius. Change the mass until the
             instrument's Einstein radius is 1.0 arcsecond (keep the distance at 1
             Gpc and the offset at 0). The mass is inside the ring, whatever the
             lens is made of: stars, gas or dark matter.`,
      fields: [
        {
          id: 'mass',
          label: 'Mass inside the ring',
          unit: '10¹¹ M☉',
          hint: '2.5',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.mass)) return null;
        if (Math.abs(v.mass - 2.46) <= 0.3) {
          return {
            level: 'ok',
            message:
              'About 2.5 × 10¹¹ solar masses. The ring grows as the square root of the mass, so a ring 1.6 times larger (1.0 against 0.64) holds 2.5 times the mass. A ring is a scale in the sky for a mass, measured without knowing what makes it up.',
          };
        }
        return {
          level: 'error',
          message:
            'The Einstein radius goes as the square root of the mass. Raise the mass from 10^11 until “Einstein radius, in arcseconds” reads 1.0, then enter that mass in units of 10^11.',
        };
      },
      tool: LP(GALAXY),
    },
    {
      sid: 'move-the-source',
      stage: STARS,
      type: 'measure',
      title: 'Move the source off to one side',
      body: `Load “The same, source off to one side”: the source is half an
             Einstein radius from the lens. A point mass makes two images, one
             outside the ring and one inside it, on the opposite side. Read the
             outer image's position (in Einstein radii) and the total
             magnification.`,
      fields: [
        { id: 'outer', label: 'Outer image', unit: 'θ_E', hint: '1.28' },
        { id: 'total', label: 'Total magnification', unit: '', hint: '2.18' },
      ],
      validate: v => {
        if (![v.outer, v.total].every(Number.isFinite)) return null;
        if (
          Math.abs(v.outer - 1.28) <= 0.03 &&
          Math.abs(v.total - 2.18) <= 0.05
        ) {
          return {
            level: 'ok',
            message:
              'Two images: one at 1.28 Einstein radii on the source’s side and one at 0.78 on the other, together 2.2 times as bright as the source alone. The inner image is flipped, which the negative sign in its magnification records.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Source offset” to 0.5 with a point mass, then read “Outer image, in Einstein radii” and “Total magnification”.',
        };
      },
      tool: LP({ ...GALAXY, y: 0.5 }),
    },
    {
      sid: 'an-isothermal-galaxy',
      stage: STARS,
      type: 'measure',
      title: 'A galaxy is not a point',
      body: `A real galaxy has its mass spread out. Load “An isothermal galaxy,
             source off to one side”, a singular isothermal sphere with the same
             ring and the same source position. Read the outer image and the
             total magnification again.`,
      fields: [
        { id: 'outer', label: 'Outer image', unit: 'θ_E', hint: '1.5' },
        { id: 'total', label: 'Total magnification', unit: '', hint: '4' },
      ],
      validate: v => {
        if (![v.outer, v.total].every(Number.isFinite)) return null;
        if (Math.abs(v.outer - 1.5) <= 0.03 && Math.abs(v.total - 4) <= 0.1) {
          return {
            level: 'ok',
            message:
              'The same ring, a different galaxy, different images: 1.5 and 0.5 Einstein radii, and a total magnification of 4 rather than 2.2. For this lens the total is 2 ÷ offset. Which lens it is changes what a given picture means, so a ring alone does not say how the mass is arranged.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the singular isothermal sphere, offset 0.5, then read the same two rows.',
        };
      },
      tool: LP({ ...GALAXY, kind: 1, y: 0.5 }),
    },
    {
      sid: 'why-arcs',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Arcs, not rings',
      body: `Set the offset to <strong>0.3</strong> and the source radius to
             <strong>0.2</strong>, keeping the point mass. The source is a disk
             and not a point.`,
      prompt: 'Why are most lensed galaxies seen as arcs and not as rings?',
      options: [
        'The source is rarely exactly behind the lens, and an extended source is stretched into an arc along the ring',
        'Lenses can only make arcs',
        'Rings only form for stars, not for galaxies',
        'The ring is there, but it is too faint to see',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'only-arcs',
          option: 1,
          say: 'Set the offset to 0 in the instrument: the images join into a ring. A perfect alignment is rare but it happens.',
        },
      ],
      hints: [
        'Set the offset to 0 and then back to 0.3 and watch the blue shapes.',
      ],
      because:
        'A ring needs the source exactly behind the lens, which is rare. Off the axis the images are two separated arcs, each a stretched copy of the source, longer the larger the source and the nearer the alignment.',
      tool: LP({ ...GALAXY, y: 0.3, size: 0.2 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A lens makes a ring of angular radius θ<sub>E</sub>, which is
             about a milliarcsecond for a star and about an arcsecond for a
             galaxy. The size of a ring gives the mass inside it, for any lens.
             Off the axis the ring splits into two images of different
             magnifications, and which lens it is (a point or a spread-out
             galaxy) changes those numbers. A star's ring is too small to see,
             but its images' total brightness can be watched as the lens moves:
             the next investigation.`,
      tool: LP(GALAXY),
    },
  ],
};

export default EINSTEIN_RINGS_AND_ARCS;
