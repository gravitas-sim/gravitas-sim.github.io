// =============================================================================
// Why We Cannot See Earth From Here, and Architectures (Prompt 230 Part A)
// -----------------------------------------------------------------------------
// Two investigations at three depths, in one module that also carries their Spanish words, their
// deeper steps and their instructor content: this is the one closure file the prompt adds
// (D-R10-230-05), because the shared sequence files sit at their line ceilings. The per-lesson
// path every loader builds from an id is a one-line re-export of a named export here, and the
// instructor modules read INSTRUCTOR. No imports: every number a step states is recomputed in
// tests/imagingLessons.test.js from the instrument (js/directImagingWidgets.js over js/directImagingField.js
// and the kernel js/kernels/imaging/). Every step carries a `sid`, an opaque stable id that
// student progress is keyed by.
//
// The four instruments are teaching examples: their inner working angles and contrast floors are
// not the specifications of any real instrument, and the lessons say so. The imaged planets are
// the NASA Exoplanet Archive rows of js/data/imagedPlanets.js; the contrast of a planet that
// shines by its own heat is drawn as a blackbody at the temperature the archive tabulates, and
// no contrast number of a paper is typed. Subtraction, throughput and orbits are Part B.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A Sun-like star', teffK: 5772, lumSun: 1 }],
};
/** The contrast panel: planet 0 Earth, 1 Jupiter, 2 young giant, 3 hot Jupiter; distance in parsecs; instrument 0 to 3; phase angle in degrees; band 0 the instrument's own wavelength, 1 ten micrometres; plot 1 shown. */
const CONTRAST = (values = {}) => ({
  id: 'imaging-contrast',
  values: {
    system: 0,
    distance: 10,
    telescope: 3,
    phase: 90,
    band: 0,
    plots: 1,
    ...values,
  },
});
/** The architectures panel: view 0 orbit against mass, 1 angle against mass; instrument 0 to 3; the distance the Solar System is seen from. */
const ARCH = (values = {}) => ({
  id: 'imaging-architectures',
  values: { view: 0, telescope: 3, distance: 10, ...values },
});

export const WHY_NOT_EARTH = {
  id: 'why-we-cannot-see-earth',
  thumbnail: 'images/investigations/why-we-cannot-see-earth.webp',
  title: 'Why We Cannot See Earth From Here',
  subtitle:
    'Two separate problems stand between a telescope and a planet, an angle and a contrast: see why a planet like Earth at ten parsecs is out of reach, and why λ/D is not a coronagraph’s inner working angle',
  duration: '6-10 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['what-a-telescope-resolves'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that seeing a planet needs two things, a separation on the sky and a brightness against its star, and compute each for a planet at a distance',
    'Say what λ/D is, and that a coronagraph’s inner working angle is a separate, instrument-specific number that λ/D does not give',
    'Read a verdict of not observable with this instrument and say which of the two problems caused it',
    'Say why a young giant planet can be imaged and an Earth-like planet cannot, and what the panel assumes about each',
  ],
  steps: [
    {
      sid: 'two-problems',
      stage: STAGE,
      type: 'read',
      title: 'Two problems, not one',
      body: `A planet next to its star is hard to see for two different reasons. It has to be far enough from the star
             on the sky to be told apart from the star&rsquo;s light: that is an <strong>angle</strong>. And it has to
             be bright enough against the star&rsquo;s glare: that is a <strong>contrast</strong>, the planet&rsquo;s
             light divided by the star&rsquo;s.\n\nThe panel puts Earth around a Sun-like star, ten parsecs away, and
             lets you change the planet, the distance, the instrument and the wavelength. The four instruments are
             <strong>teaching examples</strong>: their working angles and contrast floors are not the specifications
             of any real instrument.`,
      tool: CONTRAST(),
    },
    {
      sid: 'how-far-apart',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-angle',
      title: 'How far from its star is Earth?',
      body: `An observer ten parsecs away looks at the Sun, and Earth is at its greatest separation from it, a quarter
             of an orbit from either side of the Sun. One astronomical unit seen from one parsec is one arcsecond.`,
      prompt: 'How far from the Sun, on the sky, is Earth?',
      options: [
        'About 0.0001 arcsecond',
        'About 0.1 arcsecond',
        'About 10 arcseconds',
        'About a degree',
      ],
      answer: 1,
      hints: [
        'One AU at one parsec is one arcsecond. What happens to an angle when the distance grows tenfold?',
      ],
      because:
        'About 0.1 arcsecond. One AU seen from one parsec subtends one arcsecond, by the definition of the parsec, and the angle falls in proportion to the distance, so at ten parsecs it is a tenth of an arcsecond. The panel reads 0.100 arcsecond at a phase angle of 90 degrees.',
      tool: CONTRAST(),
    },
    {
      sid: 'the-angle',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Which problem is the hard one?',
      body: `The panel is set to a 6 m space telescope at 0.55 micrometres. Its diffraction scale λ/D is 0.019
             arcsecond, and Earth is 0.100 arcsecond from its star: 5.3 times λ/D. The contrast line says how much
             fainter than its star the planet is.`,
      prompt: 'For this telescope, which is the main obstacle to seeing Earth?',
      options: [
        'The angle: Earth is too close to its star to be separated',
        'The contrast: Earth is about eight and a half billion times fainter than its star',
        'The telescope is too small to collect enough light from Earth',
        'There is no obstacle',
      ],
      answer: 1,
      hints: [
        'Compare the separation with λ/D first. Is Earth closer to its star than the telescope can tell apart?',
        'Then read the contrast line. How many times fainter than its star is the planet?',
      ],
      because:
        'The contrast. Earth is 5.3 diffraction scales from its star, so in angle alone a 6 m telescope could tell them apart; it is the planet’s reflected light, about 1.2 × 10⁻¹⁰ of the star’s, that has to be seen through the glare. The two problems are separate and a telescope can solve one without the other.',
      misconceptions: [
        {
          id: 'light',
          option: 2,
          say: 'Collecting more light helps, but the planet is faint compared with the star, and the star’s light is collected too. The ratio is what matters, and a bigger mirror does not change it.',
        },
      ],
      tool: CONTRAST(),
    },
    {
      sid: 'two-numbers',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Two angles, kept apart',
      body: `The panel is now set to a 2.4 m space telescope at 0.55 micrometres. λ/D is 0.047 arcsecond and Earth is
             2.1 λ/D from its star. The example instrument has an inner working angle of 3 λ/D: a number chosen for
             this teaching example, not a cited specification.`,
      prompt:
        'What does the panel say, and what does it show about the two angles?',
      options: [
        'Observable: Earth is farther from its star than λ/D, the telescope’s limit',
        'Not observable with this instrument: Earth is inside its inner working angle, which belongs to the instrument and is a separate number from λ/D',
        'Not observable: the telescope is smaller than the diffraction limit',
        'The panel cannot say',
      ],
      answer: 1,
      hints: [
        'Read the inner working angle line. Is it the same number as λ/D?',
      ],
      because:
        'Not observable with this instrument. λ/D is the diffraction scale of the telescope. A coronagraph’s inner working angle is where that instrument’s suppression of the star’s light starts to work: it is set by the mask and the wavefront control, it differs between instruments, and it is stated for the instrument rather than derived from λ/D. Here Earth is inside the example’s 3 λ/D.',
      misconceptions: [
        {
          id: 'iwa-is-diffraction',
          option: 0,
          say: 'λ/D is the scale on which a telescope blurs a point of light. A coronagraph removes starlight inside its own inner working angle, which is a different quantity: it is usually a few times λ/D, and the number belongs to the instrument.',
        },
      ],
      tool: CONTRAST({ telescope: 1 }),
    },
    {
      sid: 'the-infrared',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Go to the infrared',
      body: `Earth also shines by its own heat, and a planet at about 254 kelvin radiates most near 11 micrometres.
             Set the wavelength to 10 micrometres for the 6 m telescope and look at the plot: the thermal curve rises
             over the reflected one. The diffraction scale grows in proportion to the wavelength.`,
      prompt: 'What does moving from 0.55 to 10 micrometres do?',
      options: [
        'It makes both problems easier',
        'It eases the contrast to about twelve million times fainter, and makes the angle worse: λ/D grows to 0.34 arcsecond and Earth is 0.3 λ/D from its star',
        'It changes neither',
        'It makes the contrast worse and the angle better',
      ],
      answer: 1,
      hints: [
        'Read both lines again at 10 micrometres: the contrast, and the separation in λ/D.',
      ],
      because:
        'It trades one problem for the other. At 10 micrometres the planet’s own heat makes it only about twelve million times fainter than its star instead of eight and a half billion, but λ/D is 18 times larger, 0.34 arcsecond, so Earth sits at 0.3 λ/D, well inside any working angle. Choosing a wavelength is choosing which problem to have.',
      tool: CONTRAST({ band: 1 }),
    },
    {
      sid: 'what-it-would-take',
      stage: STAGE,
      type: 'read',
      title: 'What it would take',
      body: `Of the four examples only the 6 m visible-light instrument sees Earth at all, and only because its contrast
             floor of 10⁻¹⁰ was chosen just below Earth&rsquo;s own 1.2 × 10⁻¹⁰: it is a thought experiment about what
             a telescope would have to do, not a statement about any mission. Seeing an Earth-like planet needs both a
             working angle under 0.1 arcsecond at a given wavelength and a suppression of the star&rsquo;s light that
             reaches the planet&rsquo;s contrast.\n\nThe panel does not model the suppression itself: no coronagraph,
             no speckle noise, no exposure time. What it states is a necessary condition.`,
      tool: CONTRAST(),
    },
  ],
};

export const WHY_NOT_EARTH_DEEPER = {
  id: 'why-we-cannot-see-earth',
  steps: [
    {
      sid: 'read-the-contrast',
      after: 'what-it-would-take',
      depth: 'quantitative',
      type: 'measure',
      title: 'Earth’s contrast',
      body: `With Earth at a phase angle of 90 degrees and the 6 m visible-light instrument, read the contrast line:
             the reflected light as a fraction of the star&rsquo;s. Give it as a multiple of 10⁻¹⁰.`,
      fields: [
        {
          id: 'a',
          label: 'Reflected contrast, in units of 10⁻¹⁰',
          unit: '',
          hint: '1.18',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a)) return null;
        if (near(v.a, 1.18, 0.05)) {
          return {
            level: 'ok',
            message:
              'About 1.2 × 10⁻¹⁰. It is the geometric albedo times the square of the planet’s radius over its orbit, times the phase function: 0.2 × (6378 km over 1 AU)² × 0.32 at 90 degrees.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth, 10 parsecs, a phase angle of 90 degrees and the 6 m instrument, and read the reflected value in the contrast line: 1.18 × 10⁻¹⁰.',
        };
      },
      tool: CONTRAST(),
    },
    {
      sid: 'phase-trade',
      after: 'read-the-contrast',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'The best phase is not the best place',
      body: `Move the phase angle between 0 and 180 degrees. The separation on the sky is the orbit&rsquo;s radius times
             the sine of the phase angle, and the reflected light follows the Lambert phase function, which is largest
             at phase angle 0.`,
      prompt:
        'Where is Earth brightest, and where is it farthest from its star?',
      options: [
        'Brightest and farthest at the same phase angle',
        'Brightest at phase angle 0, where it is behind its star and the separation is zero; farthest at 90 degrees, where it is about 3.1 times fainter',
        'Brightest at 90 degrees and farthest at 0',
        'Neither depends on the phase angle',
      ],
      answer: 1,
      hints: [
        'Read the separation and the reflected contrast at 0 and at 90 degrees.',
      ],
      because:
        'Brightest at phase angle 0, farthest at 90 degrees. At phase angle 0 the planet is fully lit and 3.7 × 10⁻¹⁰ of the star’s light, but it is behind the star and its separation is zero; at 90 degrees it is as far from the star as it gets, 0.100 arcsecond, and the Lambert phase function has fallen to 1/π, so it is about 3.1 times fainter. An observer takes a compromise between the two.',
      tool: CONTRAST({ phase: 0 }),
    },
    {
      sid: 'young-giant-angle',
      after: 'phase-trade',
      depth: 'quantitative',
      type: 'measure',
      title: 'A planet that can be seen',
      body: `Choose the young giant, 10 parsecs, a phase angle of 90 degrees and the 8 m near-infrared instrument. The
             young giant is a stand-in 30 AU from a cool star. Read how many diffraction scales λ/D it is from its
             star.`,
      fields: [
        {
          id: 'a',
          label: 'Separation in λ/D',
          unit: '',
          hint: '70.5',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a)) return null;
        if (near(v.a, 70.5, 1)) {
          return {
            level: 'ok',
            message:
              'About 70 λ/D: 3.0 arcseconds on the sky over λ/D of 0.043 arcsecond. At that distance from its star even a modest working angle leaves it outside, and at 1.65 micrometres its own heat puts it at about 7 × 10⁻⁴ of the star’s light.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the young giant, 10 parsecs, 90 degrees and the 8 m near-infrared instrument and read the separation in λ/D in the diffraction-scale line: 70.5.',
        };
      },
      tool: CONTRAST({ system: 2, telescope: 2 }),
    },
    {
      sid: 'own-heat',
      after: 'young-giant-angle',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'Its own heat',
      body: `Read the temperature line for the young giant. Starlight alone would heat it to only 25 kelvin, because it
             is 30 AU from a cool star, but the panel draws it at 1500 kelvin, the temperature stated for it. The
             contrast is a blackbody at that temperature.`,
      prompt:
        'Say why a young giant can be imaged while an Earth-like planet cannot, say what the panel assumes about the giant’s temperature, and say what a blackbody at 1500 kelvin leaves out.',
      rubric:
        'Credit for saying that the giant is bright because it radiates its own stored heat (about 1500 K against 25 K from starlight) so its contrast, about 10⁻⁶ to 10⁻³ depending on wavelength, is far larger than the reflected 10⁻¹⁰ of an Earth, and that at 30 AU it is also far from its star in angle; for saying that the panel takes the temperature as stated and draws a blackbody, not a computed spectrum; and for naming something a blackbody leaves out (molecular absorption bands, clouds, the evolution of the temperature with age, a temperature that is not one number). Do not mark the length.',
      rubricCriteria: [
        {
          name: 'Explains the giant against Earth',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the giant shines by its own heat, which makes its contrast millions of times larger than Earth’s reflected light, and that its wide orbit helps in angle.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Says it is bigger or closer, or gives no reason.',
            },
          ],
        },
        {
          name: 'States the assumption',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the temperature is stated, not derived from starlight, and the contrast is a blackbody at it.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Treats the 1500 K as computed, or does not mention it.',
            },
          ],
        },
        {
          name: 'Names what a blackbody leaves out',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Names one of absorption bands, clouds, the planet’s age and cooling, or a temperature that varies.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names nothing.',
            },
          ],
        },
      ],
      tool: CONTRAST({ system: 2, telescope: 2 }),
    },
  ],
};

export const ARCHITECTURES = {
  id: 'architectures',
  thumbnail: 'images/investigations/architectures.webp',
  title: 'Architectures',
  subtitle:
    'The planets we have imaged and the planets of the Solar System on one log diagram: see what direct imaging can find, and why that is not a picture of the planets that exist',
  duration: '6-10 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['why-we-cannot-see-earth'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Read a log-log diagram of semi-major axis against mass and place the Solar System’s planets and the imaged planets on it',
    'Say what the imaged planets have in common and why the sample is selected by what an instrument can see',
    'Compute from a panel how many planets lie outside an example instrument’s inner working angle',
    'Say what the diagram does not show about the planets that exist, and name what a population claim would need',
  ],
  steps: [
    {
      sid: 'two-kinds-of-system',
      stage: STAGE,
      type: 'read',
      title: 'Us and the imaged planets',
      body: `The diagram puts the eight planets of the Solar System and the planets of the NASA Exoplanet Archive that
             were found by direct imaging on one log scale: how far each orbits, and how massive it is. A log scale
             gives the same room to a factor of ten wherever it is, so Mercury and a planet at 500 AU can share the
             page.\n\nThe imaged planets are listed as the archive has them: a distance from the Sun, a semi-major
             axis and, for most, a mass. Read how the two groups sit.`,
      tool: ARCH(),
    },
    {
      sid: 'where-do-they-sit',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-median-planet',
      title: 'Where will they sit?',
      body: `Look at the Solar System&rsquo;s planets on the diagram, from Mercury to Neptune at 30 AU, and from Earth,
             at about a third of a percent of a Jupiter mass, to Jupiter itself.`,
      prompt: 'Compared with them, where do most of the imaged planets sit?',
      options: [
        'Close in, like Mercury and Venus',
        'Among the Solar System’s planets, between Earth and Jupiter',
        'Mostly farther out than Neptune and heavier than Jupiter',
        'Mostly lighter than Earth',
      ],
      answer: 2,
      hints: [
        'Think about what a telescope can separate from a star’s glare, and what is bright enough to see.',
      ],
      because:
        'Mostly farther out than Neptune and heavier than Jupiter: 70 of the 94 imaged planets with an axis and a mass lie beyond Neptune’s 30 AU, and 93 are heavier than Jupiter. They sit up and to the right of the Solar System.',
      tool: ARCH(),
    },
    {
      sid: 'the-median-planet',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The typical imaged planet',
      body: `Read the line on the imaged planets: the median semi-major axis and the median mass.`,
      prompt: 'What does the median imaged planet look like?',
      options: [
        'About 1 AU from its star and about the mass of Earth',
        'About 5 AU out and about the mass of Jupiter',
        'About 170 AU out and about 12 Jupiter masses',
        'About 0.05 AU out and about 0.5 Jupiter mass',
      ],
      answer: 2,
      hints: [
        'Read the median semi-major axis and the median mass in the panel.',
      ],
      because:
        'About 170 AU out and about 12 Jupiter masses: a planet far wider than Neptune and more massive than Jupiter, near the boundary between planets and brown dwarfs. Nothing like it is in the Solar System.',
      tool: ARCH(),
    },
    {
      sid: 'why-so-wide',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why are they all wide and heavy?',
      body: `Switch the plot to angle and mass. The green line is the example instrument&rsquo;s inner working angle.
             The imaged planets are placed at the angle their axis and their distance give.`,
      prompt:
        'Why does the imaged sample look so different from the Solar System?',
      options: [
        'Planets form that way around other stars',
        'The sample is selected by what an instrument can see: a planet has to be far enough from its star and bright enough, which favors wide, massive, young planets',
        'The Solar System’s planets are not planets',
        'The archive lists only unusual stars',
      ],
      answer: 1,
      hints: [
        'Which two things must a planet satisfy to be imaged? The panel names them in Why We Cannot See Earth From Here.',
      ],
      because:
        'The sample is selected by what an instrument can see. A planet has to be outside the working angle and above the contrast floor, which favors planets that are far from their star and that shine brightly by their own heat: massive and young. The imaged planets are the ones that can be imaged. They say little about the planets that exist.',
      misconceptions: [
        {
          id: 'sample-is-population',
          option: 0,
          say: 'A sample is what a method finds. A method that can only find wide, massive planets finds only those, whatever else is there. To say how common planets like Jupiter or Earth are, a survey must count the stars it searched and the planets it could have found.',
        },
      ],
      tool: ARCH({ view: 1 }),
    },
    {
      sid: 'our-system-from-afar',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Our system, seen from ten parsecs',
      body: `Set the instrument to the 2.4 m visible-light example, seen from 10 parsecs. Its inner working angle is
             0.142 arcsecond. The panel says how many of the Solar System&rsquo;s planets lie outside it. Separation is
             all it judges here, not contrast.`,
      prompt: 'How many of the eight planets lie outside the working angle?',
      options: ['All eight', 'Five of the eight', 'Two of the eight', 'None'],
      answer: 1,
      hints: [
        'Read the last line of the panel: the example working angle and the count.',
      ],
      because:
        'Five of the eight. Mercury, Venus and Earth are at 0.039, 0.072 and 0.100 arcsecond, inside 0.142; Mars and the four giants are outside. Even with an angle that large, the three inner planets could not be separated from the star, and contrast has not been judged yet.',
      tool: ARCH({ view: 1, telescope: 1 }),
    },
    {
      sid: 'what-the-diagram-says',
      stage: STAGE,
      type: 'read',
      title: 'What the diagram says',
      body: `The imaged planets are wide, massive and young, because those are the ones a telescope can pick out of
             the star&rsquo;s glare. The Solar System is not unusual for being different from them; they are different
             because of how they were found. A statement about how common planets are needs a survey that counts the
             stars it searched and the planets it could have seen, with a rate and its uncertainty.\n\nThe next
             investigations take the planets one method at a time. This one drew the planets of one method.`,
      tool: ARCH({ view: 1 }),
    },
  ],
};

export const ARCHITECTURES_DEEPER = {
  id: 'architectures',
  steps: [
    {
      sid: 'count-the-seen',
      after: 'what-the-diagram-says',
      depth: 'quantitative',
      type: 'measure',
      title: 'How many are outside?',
      body: `Choose the angle-and-mass plot and the 0.25 m visible-light example. Its inner working angle is 1.36
             arcseconds. Read how many of the imaged planets with a distance lie outside it.`,
      fields: [
        {
          id: 'a',
          label: 'Imaged planets outside the working angle',
          unit: '',
          hint: '49',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a)) return null;
        if (near(v.a, 49, 0.5)) {
          return {
            level: 'ok',
            message:
              '49 of 88 with a distance. A small telescope with a wide working angle sees only the widest half of them, and only 2 of the 8 Solar System planets at 10 parsecs.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the 0.25 m visible-light instrument and read the last line: 49 of the 88 imaged planets with a distance lie outside 1.36 arcseconds.',
        };
      },
      tool: ARCH({ view: 1, telescope: 0 }),
    },
    {
      sid: 'median-orbit-and-mass',
      after: 'count-the-seen',
      depth: 'quantitative',
      type: 'measure',
      title: 'The median imaged planet',
      body: `Read the medians of the imaged planets that have an axis and a mass: the semi-major axis in AU and the
             mass in Jupiter masses.`,
      fields: [
        { id: 'a', label: 'Median semi-major axis', unit: 'AU', hint: '170' },
        { id: 'b', label: 'Median mass', unit: 'M_Jup', hint: '12' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 169.5, 3) && near(v.b, 12.25, 0.3)) {
          return {
            level: 'ok',
            message:
              'About 170 AU and 12.3 Jupiter masses, from 94 planets. A median is robust to the few planets at several hundred AU, but it describes only the planets that were imaged.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the imaged-planets line: the median semi-major axis is about 170 AU and the median mass about 12 Jupiter masses.',
        };
      },
      tool: ARCH(),
    },
    {
      sid: 'is-ours-unusual',
      after: 'median-orbit-and-mass',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'Is the Solar System unusual?',
      body: `Someone reads the diagram and says: the Solar System has no planet at 170 AU and 12 Jupiter masses, so it is
             unusual. Read the source line: the table is the archive&rsquo;s list of planets found by imaging, with the
             per-planet references not retrieved.`,
      prompt:
        'Say what the claim assumes, say why the diagram cannot support it, and say what a survey would have to report before it could.',
      rubric:
        'Credit for saying that the claim treats the imaged sample as a sample of all planetary systems when it is selected by what the instruments could see (outside a working angle, above a contrast floor, young and massive); for noting that the same instruments could not have imaged a planet of the Solar System, which is what the angle plot at 10 parsecs shows; and for saying that a population claim needs the number of stars searched, the planets that could have been found, the detection probability across orbit and mass, and a rate with its uncertainty. Do not mark the length.',
      rubricCriteria: [
        {
          name: 'Identifies the selection',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the imaged sample is selected by angle, contrast and youth, and that the Solar System’s planets would not be imaged by the same instruments.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Accepts the sample as typical, or says it is wrong without a reason.',
            },
          ],
        },
        {
          name: 'Uses the panel',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Cites the angle at which the Solar System’s planets lie at ten parsecs or the count outside a working angle.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Makes the argument without a number from the panel.',
            },
          ],
        },
        {
          name: 'Says what a survey needs',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Names the stars searched, the detection probability and a rate with its uncertainty.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names none of them.',
            },
          ],
        },
      ],
      tool: ARCH({ view: 1 }),
    },
  ],
};

// ---- Spanish ----------------------------------------------------------------------------------

/** The Spanish shadow of why-we-cannot-see-earth: the core steps in order, nothing else (the loaders align by index). */
export const WHY_NOT_EARTH_ES = {
  title: 'Por qué no podemos ver la Tierra desde aquí',
  subtitle:
    'Dos problemas distintos separan a un telescopio de un planeta, un ángulo y un contraste: mira por qué un planeta como la Tierra a diez pársecs está fuera de alcance, y por qué λ/D no es el ángulo de trabajo interno de un coronógrafo',
  objectives: [
    'Decir que ver un planeta exige dos cosas, una separación en el cielo y un brillo frente a su estrella, y calcular cada una para un planeta a cierta distancia',
    'Decir qué es λ/D, y que el ángulo de trabajo interno de un coronógrafo es un número aparte, propio del instrumento, que λ/D no da',
    'Leer un veredicto de no observable con este instrumento y decir cuál de los dos problemas lo causó',
    'Decir por qué un gigante joven se puede fotografiar y un planeta como la Tierra no, y qué supone el panel de cada uno',
  ],
  steps: [
    {
      title: 'Dos problemas, no uno',
      body: `Un planeta junto a su estrella es difícil de ver por dos razones distintas. Tiene que estar lo bastante lejos de la estrella en el cielo para distinguirse de su luz: eso es un <strong>ángulo</strong>. Y tiene que ser lo bastante brillante frente al resplandor de la estrella: eso es un <strong>contraste</strong>, la luz del planeta dividida entre la de la estrella.\n\nEl panel pone a la Tierra alrededor de una estrella como el Sol, a diez pársecs, y deja cambiar el planeta, la distancia, el instrumento y la longitud de onda. Los cuatro instrumentos son <strong>ejemplos didácticos</strong>: sus ángulos de trabajo y sus pisos de contraste no son las especificaciones de ningún instrumento real.`,
    },
    {
      title: '¿A qué distancia de su estrella está la Tierra?',
      body: `Un observador a diez pársecs mira al Sol, y la Tierra está en su mayor separación de él, un cuarto de órbita a cada lado del Sol. Una unidad astronómica vista desde un pársec es un segundo de arco.`,
      prompt: '¿A qué distancia del Sol, en el cielo, está la Tierra?',
      options: [
        'Unos 0,0001 segundos de arco',
        'Unos 0,1 segundos de arco',
        'Unos 10 segundos de arco',
        'Aproximadamente un grado',
      ],
      hints: [
        'Una UA a un pársec es un segundo de arco. ¿Qué le pasa a un ángulo cuando la distancia se multiplica por diez?',
      ],
      because:
        'Unos 0,1 segundos de arco. Una UA vista desde un pársec subtiende un segundo de arco, por la definición del pársec, y el ángulo cae en proporción a la distancia, así que a diez pársecs es una décima de segundo de arco. El panel lee 0,100 segundos de arco con un ángulo de fase de 90 grados.',
    },
    {
      title: '¿Cuál es el problema difícil?',
      body: `El panel está en un telescopio espacial de 6 m a 0,55 micrómetros. Su escala de difracción λ/D es 0,019 segundos de arco, y la Tierra está a 0,100 segundos de arco de su estrella: 5,3 veces λ/D. La línea de contraste dice cuánto más débil que su estrella es el planeta.`,
      prompt:
        'Para este telescopio, ¿cuál es el principal obstáculo para ver la Tierra?',
      options: [
        'El ángulo: la Tierra está demasiado cerca de su estrella para separarla',
        'El contraste: la Tierra es unos 8500 millones de veces más débil que su estrella',
        'El telescopio es demasiado pequeño para recoger suficiente luz de la Tierra',
        'No hay ningún obstáculo',
      ],
      hints: [
        'Compara primero la separación con λ/D. ¿Está la Tierra más cerca de su estrella de lo que el telescopio puede distinguir?',
        'Luego lee la línea de contraste. ¿Cuántas veces más débil que su estrella es el planeta?',
      ],
      because:
        'El contraste. La Tierra está a 5,3 escalas de difracción de su estrella, así que solo por el ángulo un telescopio de 6 m podría distinguirlas; lo que hay que ver a través del resplandor es la luz reflejada del planeta, unos 1,2 × 10⁻¹⁰ de la de la estrella. Los dos problemas son distintos y un telescopio puede resolver uno sin el otro.',
      misconceptions: [
        {
          say: 'Recoger más luz ayuda, pero el planeta es débil comparado con la estrella, y la luz de la estrella también se recoge. Lo que importa es el cociente, y un espejo mayor no lo cambia.',
        },
      ],
    },
    {
      title: 'Dos ángulos, por separado',
      body: `El panel está ahora en un telescopio espacial de 2,4 m a 0,55 micrómetros. λ/D es 0,047 segundos de arco y la Tierra está a 2,1 λ/D de su estrella. El instrumento de ejemplo tiene un ángulo de trabajo interno de 3 λ/D: un número elegido para este ejemplo didáctico, no una especificación citada.`,
      prompt: '¿Qué dice el panel, y qué muestra sobre los dos ángulos?',
      options: [
        'Observable: la Tierra está más lejos de su estrella que λ/D, el límite del telescopio',
        'No observable con este instrumento: la Tierra está dentro de su ángulo de trabajo interno, que es del instrumento y un número aparte de λ/D',
        'No observable: el telescopio es menor que el límite de difracción',
        'El panel no puede decirlo',
      ],
      hints: [
        'Lee la línea del ángulo de trabajo interno. ¿Es el mismo número que λ/D?',
      ],
      because:
        'No observable con este instrumento. λ/D es la escala de difracción del telescopio. El ángulo de trabajo interno de un coronógrafo es donde la supresión de la luz de la estrella de ese instrumento empieza a funcionar: lo fijan la máscara y el control del frente de onda, difiere entre instrumentos y se declara para el instrumento en lugar de derivarse de λ/D. Aquí la Tierra está dentro de los 3 λ/D del ejemplo.',
      misconceptions: [
        {
          say: 'λ/D es la escala en la que un telescopio difumina un punto de luz. Un coronógrafo elimina luz estelar dentro de su propio ángulo de trabajo interno, que es otra cantidad: suele ser unas veces λ/D, y el número es del instrumento.',
        },
      ],
    },
    {
      title: 'Pasemos al infrarrojo',
      body: `La Tierra también brilla con su propio calor, y un planeta a unos 254 kelvin irradia más cerca de 11 micrómetros. Pon la longitud de onda en 10 micrómetros para el telescopio de 6 m y mira el gráfico: la curva térmica sube por encima de la reflejada. La escala de difracción crece en proporción a la longitud de onda.`,
      prompt: '¿Qué hace pasar de 0,55 a 10 micrómetros?',
      options: [
        'Hace más fáciles los dos problemas',
        'Alivia el contraste a unos doce millones de veces más débil, y empeora el ángulo: λ/D crece a 0,34 segundos de arco y la Tierra está a 0,3 λ/D de su estrella',
        'No cambia ninguno',
        'Empeora el contraste y mejora el ángulo',
      ],
      hints: [
        'Lee otra vez las dos líneas a 10 micrómetros: el contraste, y la separación en λ/D.',
      ],
      because:
        'Cambia un problema por el otro. A 10 micrómetros el calor propio del planeta lo hace solo unos doce millones de veces más débil que su estrella en lugar de unos 8500 millones, pero λ/D es 18 veces mayor, 0,34 segundos de arco, así que la Tierra queda a 0,3 λ/D, muy dentro de cualquier ángulo de trabajo. Elegir una longitud de onda es elegir qué problema tener.',
    },
    {
      title: 'Lo que haría falta',
      body: `De los cuatro ejemplos solo el instrumento de 6 m en luz visible ve la Tierra, y solo porque su piso de contraste de 10⁻¹⁰ se eligió justo por debajo de los 1,2 × 10⁻¹⁰ de la Tierra: es un experimento mental sobre lo que tendría que hacer un telescopio, no una afirmación sobre ninguna misión. Ver un planeta como la Tierra exige un ángulo de trabajo menor de 0,1 segundos de arco a una longitud de onda dada y una supresión de la luz de la estrella que llegue al contraste del planeta.\n\nEl panel no modela la supresión misma: ni coronógrafo, ni ruido de moteado, ni tiempo de exposición. Lo que dice es una condición necesaria.`,
    },
  ],
};

export const WHY_NOT_EARTH_DEEPER_ES = {
  steps: [
    {
      title: 'El contraste de la Tierra',
      body: `Con la Tierra a un ángulo de fase de 90 grados y el instrumento de 6 m en luz visible, lee la línea de contraste: la luz reflejada como fracción de la de la estrella. Dala como múltiplo de 10⁻¹⁰.`,
      fields: [{ label: 'Contraste reflejado, en unidades de 10⁻¹⁰' }],
    },
    {
      title: 'La mejor fase no es el mejor lugar',
      body: `Mueve el ángulo de fase entre 0 y 180 grados. La separación en el cielo es el radio de la órbita por el seno del ángulo de fase, y la luz reflejada sigue la función de fase de Lambert, que es mayor con ángulo de fase 0.`,
      prompt:
        '¿Dónde es más brillante la Tierra, y dónde está más lejos de su estrella?',
      options: [
        'Más brillante y más lejos con el mismo ángulo de fase',
        'Más brillante con ángulo de fase 0, donde está detrás de su estrella y la separación es cero; más lejos a 90 grados, donde es unas 3,1 veces más débil',
        'Más brillante a 90 grados y más lejos a 0',
        'Ninguna depende del ángulo de fase',
      ],
      hints: ['Lee la separación y el contraste reflejado a 0 y a 90 grados.'],
      because:
        'Más brillante con ángulo de fase 0, más lejos a 90 grados. Con ángulo de fase 0 el planeta está totalmente iluminado y es 3,7 × 10⁻¹⁰ de la luz de la estrella, pero está detrás de la estrella y su separación es cero; a 90 grados está tan lejos de la estrella como puede estar, 0,100 segundos de arco, y la función de fase de Lambert ha caído a 1/π, así que es unas 3,1 veces más débil. Un observador toma un compromiso entre ambos.',
    },
    {
      title: 'Un planeta que se puede ver',
      body: `Elige el gigante joven, 10 pársecs, un ángulo de fase de 90 grados y el instrumento de 8 m en infrarrojo cercano. El gigante joven es un sustituto a 30 UA de una estrella fría. Lee a cuántas escalas de difracción λ/D está de su estrella.`,
      fields: [{ label: 'Separación en λ/D' }],
    },
    {
      title: 'Su propio calor',
      body: `Lee la línea de temperatura del gigante joven. La luz de la estrella sola lo calentaría solo a 25 kelvin, porque está a 30 UA de una estrella fría, pero el panel lo dibuja a 1500 kelvin, la temperatura indicada para él. El contraste es un cuerpo negro a esa temperatura.`,
      prompt:
        'Di por qué un gigante joven se puede fotografiar y un planeta como la Tierra no, di qué supone el panel sobre la temperatura del gigante y di qué deja fuera un cuerpo negro a 1500 kelvin.',
      rubric:
        'Crédito por decir que el gigante es brillante porque irradia su calor almacenado (unos 1500 K frente a 25 K de la luz estelar), así que su contraste, de unos 10⁻⁶ a 10⁻³ según la longitud de onda, es mucho mayor que los 10⁻¹⁰ reflejados de una Tierra, y que a 30 UA además está lejos de su estrella en ángulo; por decir que el panel toma la temperatura como indicada y dibuja un cuerpo negro, no un espectro calculado; y por nombrar algo que un cuerpo negro deja fuera (bandas de absorción molecular, nubes, la evolución de la temperatura con la edad, una temperatura que no es un solo número). No califiques la longitud.',
      rubricCriteria: [
        {
          name: 'Explica el gigante frente a la Tierra',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el gigante brilla con su propio calor, lo que hace su contraste millones de veces mayor que la luz reflejada de la Tierra, y que su órbita amplia ayuda en el ángulo.',
            },
            {
              label: 'Aún no',
              text: 'Dice que es mayor o más cercano, o no da ninguna razón.',
            },
          ],
        },
        {
          name: 'Declara el supuesto',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la temperatura es indicada, no derivada de la luz de la estrella, y que el contraste es un cuerpo negro a ella.',
            },
            {
              label: 'Aún no',
              text: 'Trata los 1500 K como calculados, o no los menciona.',
            },
          ],
        },
        {
          name: 'Nombra lo que deja fuera un cuerpo negro',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una entre bandas de absorción, nubes, la edad y el enfriamiento del planeta, o una temperatura que varía.',
            },
            {
              label: 'Aún no',
              text: 'No nombra nada.',
            },
          ],
        },
      ],
    },
  ],
};

export const ARCHITECTURES_ES = {
  title: 'Arquitecturas',
  subtitle:
    'Los planetas con imagen directa y los planetas del sistema solar en un diagrama logarítmico: mira qué puede encontrar la imagen directa, y por qué eso no es un retrato de los planetas que existen',
  objectives: [
    'Leer un diagrama logarítmico de semieje mayor contra masa y colocar en él los planetas del sistema solar y los planetas con imagen directa',
    'Decir qué tienen en común los planetas con imagen directa y por qué la muestra está seleccionada por lo que un instrumento puede ver',
    'Calcular con un panel cuántos planetas quedan fuera del ángulo de trabajo interno de un instrumento de ejemplo',
    'Decir qué no muestra el diagrama sobre los planetas que existen, y nombrar lo que haría falta para una afirmación sobre poblaciones',
  ],
  steps: [
    {
      title: 'Nosotros y los planetas con imagen directa',
      body: `El diagrama pone los ocho planetas del sistema solar y los planetas del Archivo de Exoplanetas de la NASA que se hallaron por imagen directa en una escala logarítmica: a qué distancia orbita cada uno y cuánta masa tiene. Una escala logarítmica da el mismo espacio a un factor de diez donde sea, así que Mercurio y un planeta a 500 UA pueden compartir la página.\n\nLos planetas con imagen directa se listan como los tiene el archivo: una distancia al Sol, un semieje mayor y, para la mayoría, una masa. Lee cómo se colocan los dos grupos.`,
    },
    {
      title: '¿Dónde se colocarán?',
      body: `Mira los planetas del sistema solar en el diagrama, de Mercurio a Neptuno a 30 UA, y de la Tierra, con cerca de un tercio de uno por ciento de la masa de Júpiter, a Júpiter mismo.`,
      prompt:
        'Comparados con ellos, ¿dónde se colocan la mayoría de los planetas con imagen directa?',
      options: [
        'Cerca, como Mercurio y Venus',
        'Entre los planetas del sistema solar, entre la Tierra y Júpiter',
        'En su mayoría más lejos que Neptuno y más pesados que Júpiter',
        'En su mayoría más ligeros que la Tierra',
      ],
      hints: [
        'Piensa en lo que un telescopio puede separar del resplandor de una estrella, y en lo que es lo bastante brillante para verse.',
      ],
      because:
        'En su mayoría más lejos que Neptuno y más pesados que Júpiter: 70 de los 94 planetas con imagen directa que tienen semieje y masa están más allá de los 30 UA de Neptuno, y 93 son más pesados que Júpiter. Quedan arriba y a la derecha del sistema solar.',
    },
    {
      title: 'El planeta típico con imagen directa',
      body: `Lee la línea de los planetas con imagen directa: el semieje mayor mediano y la masa mediana.`,
      prompt: '¿Cómo es el planeta mediano con imagen directa?',
      options: [
        'A unos 1 UA de su estrella y con la masa de la Tierra',
        'A unos 5 UA y con la masa de Júpiter',
        'A unos 170 UA y con unas 12 masas de Júpiter',
        'A unos 0,05 UA y con 0,5 masas de Júpiter',
      ],
      hints: ['Lee en el panel el semieje mayor mediano y la masa mediana.'],
      because:
        'A unos 170 UA y con unas 12 masas de Júpiter: un planeta mucho más lejano que Neptuno y más masivo que Júpiter, cerca del límite entre planetas y enanas marrones. Nada así hay en el sistema solar.',
    },
    {
      title: '¿Por qué todos son lejanos y pesados?',
      body: `Cambia el gráfico a ángulo y masa. La línea verde es el ángulo de trabajo interno del instrumento de ejemplo. Los planetas con imagen directa se colocan en el ángulo que dan su semieje y su distancia.`,
      prompt:
        '¿Por qué la muestra con imagen directa es tan distinta del sistema solar?',
      options: [
        'Los planetas se forman así alrededor de otras estrellas',
        'La muestra está seleccionada por lo que un instrumento puede ver: un planeta tiene que estar lo bastante lejos de su estrella y ser lo bastante brillante, lo que favorece planetas lejanos, masivos y jóvenes',
        'Los planetas del sistema solar no son planetas',
        'El archivo lista solo estrellas poco comunes',
      ],
      hints: [
        '¿Qué dos cosas debe cumplir un planeta para fotografiarse? El panel las nombra en Por qué no podemos ver la Tierra desde aquí.',
      ],
      because:
        'La muestra está seleccionada por lo que un instrumento puede ver. Un planeta tiene que estar fuera del ángulo de trabajo y por encima del piso de contraste, lo que favorece planetas lejanos de su estrella y que brillan con su propio calor: masivos y jóvenes. Los planetas con imagen directa son los que se pueden fotografiar. Dicen poco sobre los planetas que existen.',
      misconceptions: [
        {
          say: 'Una muestra es lo que encuentra un método. Un método que solo puede hallar planetas lejanos y masivos solo halla esos, haya lo que haya. Para decir cuán comunes son planetas como Júpiter o la Tierra, un sondeo debe contar las estrellas que buscó y los planetas que podría haber hallado.',
        },
      ],
    },
    {
      title: 'Nuestro sistema, visto desde diez pársecs',
      body: `Pon el instrumento en el ejemplo de 2,4 m en luz visible, visto desde 10 pársecs. Su ángulo de trabajo interno es 0,142 segundos de arco. El panel dice cuántos de los planetas del sistema solar quedan fuera. Aquí solo juzga la separación, no el contraste.`,
      prompt:
        '¿Cuántos de los ocho planetas quedan fuera del ángulo de trabajo?',
      options: ['Los ocho', 'Cinco de los ocho', 'Dos de los ocho', 'Ninguno'],
      hints: [
        'Lee la última línea del panel: el ángulo de trabajo de ejemplo y la cuenta.',
      ],
      because:
        'Cinco de los ocho. Mercurio, Venus y la Tierra están a 0,039, 0,072 y 0,100 segundos de arco, dentro de 0,142; Marte y los cuatro gigantes están fuera. Incluso con un ángulo tan grande, los tres planetas interiores no podrían separarse de la estrella, y el contraste aún no se ha juzgado.',
    },
    {
      title: 'Lo que dice el diagrama',
      body: `Los planetas con imagen directa son lejanos, masivos y jóvenes, porque esos son los que un telescopio puede distinguir del resplandor de la estrella. El sistema solar no es raro por ser distinto de ellos; ellos son distintos por cómo se hallaron. Una afirmación sobre cuán comunes son los planetas necesita un sondeo que cuente las estrellas que buscó y los planetas que podría haber visto, con una tasa y su incertidumbre.\n\nLas próximas investigaciones toman los planetas de un método a la vez. Esta dibujó los planetas de un método.`,
    },
  ],
};

export const ARCHITECTURES_DEEPER_ES = {
  steps: [
    {
      title: '¿Cuántos quedan fuera?',
      body: `Elige el gráfico de ángulo y masa y el ejemplo de 0,25 m en luz visible. Su ángulo de trabajo interno es 1,36 segundos de arco. Lee cuántos de los planetas con imagen directa que tienen distancia quedan fuera.`,
      fields: [
        { label: 'Planetas con imagen directa fuera del ángulo de trabajo' },
      ],
    },
    {
      title: 'El planeta mediano con imagen directa',
      body: `Lee las medianas de los planetas con imagen directa que tienen semieje y masa: el semieje mayor en UA y la masa en masas de Júpiter.`,
      fields: [{ label: 'Semieje mayor mediano' }, { label: 'Masa mediana' }],
    },
    {
      title: '¿Es raro el sistema solar?',
      body: `Alguien lee el diagrama y dice: el sistema solar no tiene ningún planeta a 170 UA y 12 masas de Júpiter, así que es raro. Lee la línea de la fuente: la tabla es la lista del archivo de planetas hallados por imagen directa, sin las referencias de cada planeta.`,
      prompt:
        'Di qué supone la afirmación, di por qué el diagrama no puede sostenerla y di qué tendría que informar un sondeo antes de poder hacerlo.',
      rubric:
        'Crédito por decir que la afirmación trata la muestra con imagen directa como una muestra de todos los sistemas planetarios cuando está seleccionada por lo que los instrumentos podían ver (fuera de un ángulo de trabajo, por encima de un piso de contraste, jóvenes y masivos); por señalar que los mismos instrumentos no habrían podido fotografiar un planeta del sistema solar, que es lo que muestra el gráfico de ángulo a 10 pársecs; y por decir que una afirmación sobre poblaciones necesita el número de estrellas buscadas, los planetas que podrían haberse hallado, la probabilidad de detección según órbita y masa, y una tasa con su incertidumbre. No califiques la longitud.',
      rubricCriteria: [
        {
          name: 'Identifica la selección',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la muestra con imagen directa está seleccionada por ángulo, contraste y juventud, y que los planetas del sistema solar no se fotografiarían con los mismos instrumentos.',
            },
            {
              label: 'Aún no',
              text: 'Acepta la muestra como típica, o dice que está mal sin una razón.',
            },
          ],
        },
        {
          name: 'Usa el panel',
          levels: [
            {
              label: 'Completo',
              text: 'Cita el ángulo al que están los planetas del sistema solar a diez pársecs o la cuenta fuera de un ángulo de trabajo.',
            },
            {
              label: 'Aún no',
              text: 'Hace el argumento sin un número del panel.',
            },
          ],
        },
        {
          name: 'Dice qué necesita un sondeo',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra las estrellas buscadas, la probabilidad de detección y una tasa con su incertidumbre.',
            },
            {
              label: 'Aún no',
              text: 'No nombra ninguna.',
            },
          ],
        },
      ],
    },
  ],
};

// ---- Instructor content -----------------------------------------------------------------------

const CONTENT = {
  'why-we-cannot-see-earth': {
    topic:
      'Direct imaging needs two separate things: a separation on the sky (an angle, the semi-major axis over the distance times the sine of the phase angle) and a contrast (the planet’s light over the star’s, a thermal term and a reflected term); the telescope’s diffraction scale λ/D is a third quantity, and a coronagraph’s inner working angle is an instrument-specific number that λ/D does not give; a planet inside the stated working angle, or fainter than the contrast floor, is not observable with that instrument',
    difficulty:
      'Introductory (angle and contrast kept apart, Earth at ten parsecs, λ/D against an inner working angle, the infrared trade); majors (read Earth’s reflected contrast, the phase trade between brightness and separation, a young giant’s separation in diffraction scales); upper-level (why a young giant can be imaged: its own heat against the irradiation equilibrium, and what a blackbody at the stated temperature leaves out)',
    placement:
      'In a unit on exoplanets after What a Telescope Resolves and Transit Photometry, as the other way to find a planet; before Architectures, which draws the planets found this way. It pairs with the detector and exposure investigations, which supply the diffraction scale and the noise this panel leaves out.',
    overview:
      'Students place Earth ten parsecs away and predict its angle from the Sun, find that a 6 m telescope can tell it apart in angle but not in contrast, see that a 2.4 m telescope’s example inner working angle excludes it although it is outside λ/D, and move to the infrared to see one problem traded for the other. At the deeper depths they read the contrast and the phase trade, read a young giant’s separation in diffraction scales, and explain why its own heat makes it imageable.',
    priorKnowledge: [
      'The small-angle relation: one AU seen from one parsec is one arcsecond',
      'That a telescope blurs a point of light on a scale of λ/D (What a Telescope Resolves)',
      'That a warm body radiates a spectrum that peaks at a wavelength set by its temperature',
    ],
    keyConcepts: [
      {
        heading: 'Two problems, one planet',
        body: 'The angle (is the planet far enough from its star?) and the contrast (is it bright enough against the star?) are independent; a telescope can solve one and not the other. Earth at ten parsecs is 0.1 arcsecond from its star, about 5 λ/D for a 6 m telescope, and about 10⁻¹⁰ of its star’s light.',
      },
      {
        heading: 'λ/D is not an inner working angle',
        body: 'λ/D is the scale on which a telescope blurs a point; a coronagraph’s inner working angle is where its suppression of starlight begins to work, set by the mask and the wavefront control, and stated for the instrument. The panel never derives one from the other and refuses a verdict when none is stated.',
      },
      {
        heading: 'The wavelength trades the problems',
        body: 'Earth is only about twelve million times fainter than its star at 10 micrometres, against about eight and a half billion at 0.55, but λ/D grows with the wavelength, so the angle problem worsens in step. A planet that shines by its own heat, a young giant, has a contrast of 10⁻⁶ to 10⁻³ and is imaged.',
      },
    ],
    features: [
      {
        name: 'The contrast panel (imaging-contrast)',
        text: 'Four planets (Earth, Jupiter, a young giant and a hot Jupiter, the last two stand-ins), a distance of 1 to 100 parsecs, four teaching instruments, a phase angle and the wavelength (the instrument’s own or 10 micrometres): the separation, λ/D and the separation in λ/D, the example inner working angle, the contrast as reflected, thermal and total, the verdict with its reason, the temperature note, and a chart of the contrast against wavelength.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: read Earth’s contrast, the phase trade, the young giant’s separation in λ/D. Advanced: the young giant’s own heat and what a blackbody leaves out (a rubric with three criteria).',
      },
      {
        name: 'A model, checked against an independent implementation',
        text: 'The contrast and angles are checked against closed forms and an independent numpy, scipy and astropy implementation (IMAGING.md). The four instruments are teaching examples whose working angles and contrast floors are not cited specifications.',
      },
    ],
    misconceptions: [
      {
        claim:
          'A telescope that resolves the planet from its star will see it.',
        response:
          'Resolving the angle is half the problem. The planet’s light is about 10⁻¹⁰ of the star’s for an Earth, and the star’s light is in the same image; the contrast has to be overcome as well.',
      },
      {
        claim: 'λ/D is the smallest angle a coronagraph can see.',
        response:
          'λ/D is a property of the telescope. A coronagraph’s inner working angle is a separate number, stated for the instrument, usually a few times λ/D and not derivable from it.',
      },
      {
        claim: 'A bigger telescope solves the contrast problem.',
        response:
          'A bigger telescope shrinks λ/D and collects more light, from the star as well. The ratio of planet to star is unchanged; the star’s light must be suppressed.',
      },
      {
        claim: 'Imaged planets are cold like Earth.',
        response:
          'The planets that can be imaged so far are young giants that radiate their own stored heat at hundreds to thousands of kelvin; starlight alone would heat them to a few tens of kelvin at their distances.',
      },
    ],
    teachingNotes: [
      'The contrast is the planet’s flux over the star’s: a thermal term (Rp over R*)² B(Tp)/B(T*), both bodies blackbodies, and a reflected term A_g (Rp over a)² Φ(α) with a Lambert-sphere phase function. IMAGING.md states the equations and the validation: closed forms, an independent implementation (numpy, scipy, astropy constants), and refusals; thresholds were committed before the kernel.',
      'The separation of a planet on a circular orbit at phase angle α is a sin α, so a planet at full phase (α 0) is behind its star. Reflected light is brightest there and the separation zero; quadrature (90 degrees) is the greatest elongation and the Lambert phase function is 1/π.',
      'The four instruments are teaching examples. Their inner working angles (3, 3, 2 and 3 λ/D) and contrast floors are chosen for the lesson; no published coronagraph specification was supplied. The 6 m example’s floor of 10⁻¹⁰ is set just below Earth’s contrast so that it is a thought experiment about what a telescope would have to do, not a statement about any mission.',
      'The young giant and the hot Jupiter are stand-ins, not catalogue planets. The young giant is drawn as a blackbody at the stated 1500 K (starlight alone would give 25 K); that is a crude spectrum: no molecular bands, clouds or cooling with age. Subtraction of the star’s point-spread function, its throughput and orbit fitting are Part B of Prompt 230 and are not here.',
    ],
    discussion: [
      'The 6 m example sees Earth only because its floor sits just below Earth’s contrast. What would you want to know about a real instrument before believing the same sentence about it?',
      'At 10 micrometres Earth is about twelve million times fainter than its star, not eight and a half billion. Why is that not a way to see it?',
      'Why can a planet at 30 AU that is only 25 kelvin from starlight be imaged?',
    ],
    extensions: [
      'Move Jupiter to 20 parsecs and say which of the four instruments could see it, and which problem stops each of the others.',
      'Find the distance at which the hot Jupiter’s separation reaches the 8 m instrument’s working angle, and say why that is not a distance anyone observes from.',
    ],
    assessment:
      'Core: the prediction of Earth’s angle, the contrast as the main obstacle for the 6 m telescope, λ/D against a working angle, and the infrared trade. Quantitative: Earth’s reflected contrast (1.18 × 10⁻¹⁰, within 0.05), the phase trade, and the young giant’s separation (70.5 λ/D, within 1). Advanced: the written account of the young giant against Earth, what the panel assumes, and what a blackbody leaves out.',
    modelNotes:
      'js/kernels/imaging/ (contrast.js, geometry.js), js/directImagingField.js, js/directImagingWidgets.js, IMAGING.md. The thresholds are tests/fixtures/imaging/thresholds.json, committed before the kernel; the oracle is tools/imaging-oracle/oracle.py (numpy, scipy, astropy constants).',
  },
  architectures: {
    topic:
      'The planets found by direct imaging (the NASA Exoplanet Archive’s imaged planets) and the planets of the Solar System on a log diagram of semi-major axis against mass, and of angle on the sky against mass: the imaged planets are wide, massive and young because those are the planets an instrument can separate and see, so the sample is selected by the method and says little about the planets that exist',
    difficulty:
      'Introductory (read the diagram, predict where the imaged planets sit, why they are wide and heavy, the Solar System seen from ten parsecs); majors (count the planets outside an example working angle, read the medians); upper-level (a population claim needs the stars searched, the detection probability and a rate with its uncertainty)',
    placement:
      'After Why We Cannot See Earth From Here, in a unit on exoplanets; before the occurrence-rate work, whose survey logic it motivates. It pairs with the transit and radial-velocity investigations, which find the planets that imaging cannot.',
    overview:
      'Students predict where the imaged planets sit against the Solar System, read the median imaged planet (about 170 AU and 12 Jupiter masses), explain why the sample is selected by what an instrument can see, and find that even our own inner planets would be inside an example working angle at ten parsecs. At the deeper depths they count the planets outside an instrument’s working angle, read the medians, and say what a claim that the Solar System is unusual would need.',
    priorKnowledge: [
      'A log scale, and reading a point on a log-log plot',
      'The angle and the contrast as two separate problems (Why We Cannot See Earth From Here)',
      'The semi-major axis and mass of the Solar System’s planets',
    ],
    keyConcepts: [
      {
        heading: 'A method’s sample',
        body: 'The imaged planets are outside a working angle and above a contrast floor, which favors wide, massive, young planets. 70 of the 94 with an axis and a mass lie beyond 30 AU and 93 are heavier than Jupiter.',
      },
      {
        heading: 'Angle and axis',
        body: 'The angle on the sky is the semi-major axis over the distance. A planet’s place on the angle plot depends on how far away the star is as well as on its orbit; the Solar System at ten parsecs puts its inner planets inside 0.1 arcsecond.',
      },
      {
        heading: 'A population needs a survey',
        body: 'A claim about how common or unusual planets are needs the stars searched, the planets that could have been found, the detection probability across orbit and mass, and a rate with its uncertainty. A list of discoveries has none of those.',
      },
    ],
    features: [
      {
        name: 'The architectures panel (imaging-architectures)',
        text: 'The eight planets of the Solar System and the archive’s imaged planets on a log plot of semi-major axis against mass or of angle against mass, an example instrument and the distance the Solar System is seen from: the table counts, the medians, the Solar System’s angles, how many of each lie outside the example working angle (separation only), and the source line.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the count outside a working angle and the medians. Advanced: is the Solar System unusual (a rubric with three criteria).',
      },
      {
        name: 'Data',
        text: 'The imaged planets are the NASA Exoplanet Archive’s Planetary Systems Composite Parameters rows with discovery method Imaging, retrieved 2026-10-31 (98 rows; a public archive, credit requested; the per-planet references were not retrieved and the archive’s terms page was not read). The Solar System’s values are the planet table of the simulation’s world builder.',
      },
    ],
    misconceptions: [
      {
        claim:
          'The Solar System is unusual because no imaged planet resembles its planets.',
        response:
          'The imaged sample is selected by what instruments can see; the same instruments could not have imaged most of the Solar System’s planets. The diagram says what imaging finds, not what exists.',
      },
      {
        claim: 'Planets beyond 100 AU are common.',
        response:
          'They are common among the planets that were imaged, which is a different statement. How many stars were searched, and with what sensitivity, is what a rate needs.',
      },
      {
        claim: 'A log plot hides nothing.',
        response:
          'A log plot gives a factor of ten the same room everywhere, which is why Mercury and a planet at 500 AU fit; it also makes a difference of a factor of two look small. Read the numbers, not only the picture.',
      },
    ],
    teachingNotes: [
      'The semi-major axis and mass come from the archive’s composite table as retrieved; masses are in Jupiter masses as the archive lists them (some are model-dependent estimates for young objects near the planet/brown-dwarf boundary, which the panel does not discuss). The angle is the semi-major axis over the distance, not any epoch’s projected separation; 88 of the 94 have a distance.',
      'The panel judges separation only: the example working angles are 3, 3, 2 and 3 λ/D for instruments of 0.25 m, 2.4 m, 8 m and 6 m, teaching values and not specifications. Contrast is Why We Cannot See Earth From Here’s subject; here every planet is given a contrast of one so that only the angle decides.',
      'The Solar System values are those of the world builder’s planet table (masses in Earth masses over 317.8 per Jupiter mass; axes in AU). A test holds them equal to it. No per-planet reference for the imaged planets is given: the reference columns could not be retrieved, and the terms page was not read.',
      'Occurrence rates (Prompt 229) were not available when this was built; the lesson says what a rate needs and does not give one.',
    ],
    discussion: [
      'If you could only image planets beyond 30 AU, what would you conclude about planets from the sample, and what would you not?',
      'Why does the Solar System at ten parsecs fall mostly inside the working angle of a 2.4 m example?',
      'What would a survey have to publish for you to say that planets like the imaged ones are rare?',
    ],
    extensions: [
      'Set the Solar System at 30 parsecs and say which instrument still sees any of its planets by angle alone.',
      'Find the nearest imaged planet’s host in the table and compute its angle and distance by hand.',
    ],
    assessment:
      'Core: the prediction of where the imaged planets sit, the median planet (about 170 AU and 12 Jupiter masses), why the sample is selected, and five of the eight Solar System planets outside the 2.4 m example’s working angle. Quantitative: 49 of 88 outside the 0.25 m example’s working angle, and the medians (170 AU within 3, 12.3 Jupiter masses within 0.3). Advanced: the written account of why the diagram cannot support that the Solar System is unusual, and what a survey would report.',
    modelNotes:
      'js/directImagingField.js, js/directImagingWidgets.js, js/data/imagedPlanets.js (generated by tools/imaging-table.mjs from the pinned CSV, SHA-256 in the file), js/kernels/imaging/, IMAGING.md.',
  },
};

const FLOW = {
  'why-we-cannot-see-earth': [
    {
      from: 'two-problems',
      to: 'the-angle',
      text: 'Earth’s angle at ten parsecs (0.1 arcsecond) and the contrast as the obstacle: the telescope can separate it in angle but the planet is about eight and a half billion times fainter.',
    },
    {
      from: 'two-numbers',
      to: 'the-infrared',
      text: 'λ/D against an instrument’s inner working angle, a separate number, and the infrared as a trade of one problem for the other.',
    },
    {
      from: 'what-it-would-take',
      to: 'what-it-would-take',
      text: 'A thought experiment about what a telescope would have to do: a working angle under 0.1 arcsecond and a suppression that reaches the planet’s contrast.',
    },
  ],
  architectures: [
    {
      from: 'two-kinds-of-system',
      to: 'the-median-planet',
      text: 'Where the imaged planets sit against the Solar System, and the median imaged planet (about 170 AU and 12 Jupiter masses).',
    },
    {
      from: 'why-so-wide',
      to: 'our-system-from-afar',
      text: 'The sample is selected by what an instrument can see, and the Solar System seen from ten parsecs is mostly inside a 2.4 m example’s working angle.',
    },
    {
      from: 'what-the-diagram-says',
      to: 'what-the-diagram-says',
      text: 'A method’s sample is not a population: a rate needs the stars searched and the planets that could have been found.',
    },
  ],
};

// The expectations are the core steps' checked numbers; the deeper steps' are in `assessment`.
const EXPECTATIONS = {
  'why-we-cannot-see-earth': {
    'the-angle':
      'For the 6 m telescope the contrast is the obstacle: Earth is 0.100 arcsecond, 5.3 λ/D, from its star but about 1.2 × 10⁻¹⁰ of its light.',
    'two-numbers':
      'The 2.4 m example says not observable with this instrument: Earth is 2.1 λ/D out, inside the example’s 3 λ/D inner working angle, a number that belongs to the instrument and is separate from λ/D.',
  },
  architectures: {
    'the-median-planet':
      'The median imaged planet is about 170 AU from its star and about 12 Jupiter masses (94 planets with an axis and a mass).',
    'our-system-from-afar':
      'Five of the eight Solar System planets lie outside the 2.4 m example’s 0.142 arcsecond working angle at ten parsecs; Mercury, Venus and Earth do not.',
  },
};

const BANDS = {
  'why-we-cannot-see-earth': {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
  architectures: {
    core: 'short',
    quantitative: 'short',
    advanced: 'medium',
  },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'why-we-cannot-see-earth': WHY_NOT_EARTH_ES,
  architectures: ARCHITECTURES_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'why-we-cannot-see-earth': WHY_NOT_EARTH_DEEPER,
  architectures: ARCHITECTURES_DEEPER,
};
export const DEPTH_ES = {
  'why-we-cannot-see-earth': WHY_NOT_EARTH_DEEPER_ES,
  architectures: ARCHITECTURES_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WHY_NOT_EARTH, ARCHITECTURES];
