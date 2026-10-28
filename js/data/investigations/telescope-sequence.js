// =============================================================================
// What a Telescope Resolves (Prompt 208)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure
// file the prompt adds (D-R10-208-02), because the shared sequence files sit at
// their line ceilings. The per-lesson path every loader builds from an id is a
// one-line re-export of a named export here, and the instructor modules read
// INSTRUCTOR. No imports: every number a step states is recomputed in
// tests/telescopeLessons.test.js from the instrument (js/telescopeWidgets.js over
// js/kernels/detector/optics.js and Prompt 183's PSF tool). Every step carries a
// `sid`, an opaque stable id that student progress is keyed by.
//
// The frame is synthetic and says so; the seeing is an input; the Rayleigh
// separation is computed and the FWHM is measured, and they are never called the
// same thing (TELESCOPES.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
/** The telescope panel with its controls set: aperture is an index (10 cm = 1, 20 = 2, 40 = 4, 100 = 6, 400 = 8). */
const TEL = (values = {}, hide = []) => ({
  id: 'telescope',
  values: {
    aperture: 2,
    focal: 12,
    wavelength: 550,
    seeing: 0.6,
    obstruction: 0,
    exposure: 3,
    scene: 0,
    separation: 1,
    ...values,
  },
  hide,
});

export const WHAT_A_TELESCOPE_RESOLVES = {
  id: 'what-a-telescope-resolves',
  thumbnail: 'images/investigations/what-a-telescope-resolves.webp',
  title: 'What a Telescope Resolves',
  subtitle:
    'Which aperture shows two stars as two, when the faint star appears, and why the width of a star is not the limit of the telescope',
  duration: '15-25 min',
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
    'Predict which aperture shows a close pair of stars as two, then try it, and say what the dip between them is',
    'Say how aperture and exposure together bring a faint star out of the noise',
    'Say that magnification enlarges an image and adds no detail the aperture and the seeing did not allow',
    'Tell the Rayleigh separation (computed from the aperture) from the measured width of a star (read from a frame), and say why they differ',
  ],
  steps: [
    {
      sid: 'a-pair-of-stars',
      stage: STAGE,
      type: 'read',
      title: 'A pair of stars',
      body: `Two stars of the same brightness lie <strong>1.0 arcsecond</strong> apart, the
             width of a coin seen from four kilometers away. Through the telescope panel
             you will look at them with different apertures and see when they separate.
             \n\nThe frame is <strong>synthetic</strong>: made by the model, with the
             atmosphere&rsquo;s blur set to 0.6 arcseconds, a good night at a good site.
             Nobody observed it. The blue curve below the picture is what the model says
             the row of pixels through the pair should look like; the dots are this
             frame&rsquo;s own row.`,
      tool: TEL({ aperture: 1 }),
    },
    {
      sid: 'smallest-aperture-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'dips',
      title: 'Which aperture shows two stars?',
      body: `Four apertures are on offer: 5, 10, 20 and 40 centimeters. A larger one
             collects more light and gives a sharper image.`,
      prompt:
        'The smallest of these that shows the pair as two stars will be&hellip;',
      options: ['5 cm', '10 cm', '20 cm', '40 cm'],
      answer: 2,
      hints: [
        'Two stars are separate when the light has a dip between them. Try the apertures in turn and watch the curve.',
      ],
      because:
        'About 20 centimeters: the dip between the stars is 27 percent there and nothing at 10. A 5 or 10 centimeter telescope shows one fat blob; a larger one only sharpens what the atmosphere already allows.',
      tool: TEL({ aperture: 1 }),
    },
    {
      sid: 'dips',
      stage: STAGE,
      type: 'measure',
      title: 'The dip between the stars',
      body: `Set the aperture to <strong>10 cm</strong>, then <strong>20 cm</strong>, then
             <strong>40 cm</strong>, and read the dip between the stars from <em>The
             pair</em> row, in percent: how far the light midway between them falls below
             the light at a star.`,
      fields: [
        { id: 'd10', label: 'Dip at 10 cm', unit: '%', hint: '0' },
        { id: 'd20', label: 'Dip at 20 cm', unit: '%', hint: '27' },
        { id: 'd40', label: 'Dip at 40 cm', unit: '%', hint: '50' },
      ],
      validate: v => {
        if (![v.d10, v.d20, v.d40].every(Number.isFinite)) return null;
        if (near(v.d10, 0, 2) && near(v.d20, 26.8, 2) && near(v.d40, 50.3, 2)) {
          return {
            level: 'ok',
            message:
              'No dip at 10 cm, 27 percent at 20 and 50 at 40. Two diffraction patterns at the Rayleigh separation dip by 26.5 percent, so 20 cm is just about the smallest aperture that shows two. Past 40 cm the dip grows slowly, because the blur of the air, 0.6 arcseconds, takes over from the telescope’s.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose each aperture in turn with the seeing at 0.6 arcsec and read the percent in the “The pair” row: 0, 27 and 50.',
        };
      },
      tool: TEL({ aperture: 2 }),
    },
    {
      sid: 'faint-star-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'faint-appears',
      title: 'Bringing out a faint star',
      body: `Switch the field to <strong>faint field</strong>. A star of magnitude 19, about
             a hundred thousand times fainter than the faintest star the eye can see, sits
             in the dashed circle. The detector lists a star when its signal rises well
             above the noise.`,
      prompt: 'What will bring the faint star out?',
      options: [
        'A larger aperture and a longer exposure each help, because each collects more light',
        'Only a larger aperture helps: a longer exposure repeats the same light',
        'Only a longer exposure helps: the aperture changes the size of the picture',
        'Neither: the star is fainter than any telescope can show',
      ],
      answer: 0,
      hints: ['Light collected is area times time.'],
      because:
        'Both: the light collected is proportional to the area of the aperture times the exposure, and the star appears when that is large enough above the sky’s and the detector’s noise.',
      tool: TEL({ aperture: 2, scene: 1, seeing: 1 }),
    },
    {
      sid: 'faint-appears',
      stage: STAGE,
      type: 'measure',
      title: 'When the faint star appears',
      body: `With the seeing at 1.0 arcsecond, find the <strong>shortest exposure</strong>,
             in seconds, at which the faint star is listed (the row says so) for a
             10 cm, a 20 cm and a 40 cm telescope. The exposures on offer are 5, 10, 30,
             60, 120, 300 and 600 seconds.`,
      fields: [
        {
          id: 't10',
          label: 'Shortest exposure at 10 cm',
          unit: 's',
          hint: '600',
        },
        {
          id: 't20',
          label: 'Shortest exposure at 20 cm',
          unit: 's',
          hint: '120',
        },
        {
          id: 't40',
          label: 'Shortest exposure at 40 cm',
          unit: 's',
          hint: '60',
        },
      ],
      validate: v => {
        if (![v.t10, v.t20, v.t40].every(Number.isFinite)) return null;
        if (near(v.t10, 600, 1) && near(v.t20, 120, 1) && near(v.t40, 60, 1)) {
          return {
            level: 'ok',
            message:
              '600, 120 and 60 seconds. Doubling the aperture quadruples the area, so the same light arrives in about a quarter of the time: the exposure needed falls steeply, though the list of exposures is coarse. The detector lists a star when the CCD equation’s signal to noise is near 7; the row gives that number for each setting.',
          };
        }
        return {
          level: 'error',
          message:
            'Switch the field to the faint field, set the seeing to 1.0 and step the exposure up until the row says the star is listed, for each aperture.',
        };
      },
      tool: TEL({ aperture: 2, scene: 1, seeing: 1 }),
    },
    {
      sid: 'magnification',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is magnification what a telescope is for?',
      body: `A friend says the best telescope is the one that magnifies most. The panel has no
             magnification control: the frame is always shown at the size you see.`,
      prompt: 'What does magnifying an image more do?',
      options: [
        'It makes the image larger, and adds no detail that the aperture and the seeing did not already allow',
        'It lets a small telescope separate any pair of stars, if the magnification is high enough',
        'It makes a faint star brighter, because the light is spread over more of the picture',
        'It sharpens the image, because the pixels are bigger',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'any-pair',
          option: 1,
          say: 'At 10 cm the pair has no dip at all: its light is one blob, and enlarging a blob leaves one blob. The detail that separates two stars is set by the aperture and the seeing, before any eyepiece.',
        },
        {
          id: 'brighter',
          option: 2,
          say: 'Spreading the same light over more picture makes each part dimmer, not brighter. What brings out a faint star is collecting more light: a larger aperture or a longer exposure.',
        },
        {
          id: 'sharper',
          option: 3,
          say: 'Bigger pixels or a bigger picture show the same blur larger. The blur is set by the diffraction of the aperture and the air.',
        },
      ],
      hints: [
        'Compare the picture at 10 cm with the same picture drawn twice as large.',
      ],
      because:
        'A telescope collects light and, within the limits of the air, sharpens the image; magnification only changes how big the result is drawn.',
      tool: TEL({ aperture: 1 }),
    },
    {
      sid: 'two-widths',
      stage: STAGE,
      type: 'read',
      title: 'Two widths, kept apart',
      body: `The panel gives two numbers. The <strong>Rayleigh separation</strong> is computed
             from the aperture and the wavelength alone: the radius of the first dark ring of
             the light the aperture diffracts, 1.22 wavelengths over the diameter. The
             <strong>measured FWHM</strong> is read from the stars in this frame: the full
             width at half the height of the profile, with the atmosphere in it. They are
             different quantities. The deeper steps measure both and say why they differ.
             The width of a star is not the limit of the telescope.`,
      tool: TEL({ aperture: 2 }),
    },
  ],
};

export const WHAT_A_TELESCOPE_RESOLVES_DEEPER = {
  id: 'what-a-telescope-resolves',
  steps: [
    {
      sid: 'measure-the-width',
      after: 'dips',
      depth: 'quantitative',
      type: 'measure',
      title: 'The width of a star in this frame',
      body: `With the aperture at <strong>20 cm</strong> and the seeing at 0.6 arcsecond, read
             the <strong>measured FWHM</strong> in arcseconds: the width the PSF tool fits to
             the reference stars in the frame, and its uncertainty.`,
      fields: [
        {
          id: 'w',
          label: 'Measured FWHM at 20 cm',
          unit: 'arcsec',
          hint: '0.77',
        },
        { id: 's', label: 'Its uncertainty', unit: 'arcsec', hint: '0.003' },
      ],
      validate: v => {
        if (![v.w, v.s].every(Number.isFinite)) return null;
        if (near(v.w, 0.767, 0.03) && v.s >= 0 && v.s <= 0.03) {
          return {
            level: 'ok',
            message:
              'About 0.77 arcseconds, with an uncertainty of a few thousandths: the three reference stars fix the width well. It is the width of the model the tool fits (a Moffat profile) to this frame, so it contains the seeing, the aperture’s pattern and the fit’s own shape.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the aperture to 20 cm and the seeing to 0.6 arcsec, then read the “Measured FWHM” row.',
        };
      },
      tool: TEL({ aperture: 2 }),
    },
    {
      sid: 'rayleigh-by-hand',
      after: 'measure-the-width',
      depth: 'quantitative',
      type: 'measure',
      title: 'The Rayleigh separation, by hand',
      body: `Compute the Rayleigh separation for the same telescope: 1.22 times the wavelength
             over the diameter, in radians, times 206,265 to get arcseconds. Type the aperture
             and the wavelength and the instrument does the arithmetic.`,
      fields: [
        { id: 'd', label: 'Aperture', unit: 'cm', hint: '20' },
        { id: 'wl', label: 'Wavelength', unit: 'nm', hint: '550' },
        {
          id: 'r',
          label: 'Rayleigh separation',
          unit: 'arcsec',
          compute: v => (1.21967 * v.wl * 1e-9 * 206264.806) / (v.d / 100),
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.d, v.wl].every(Number.isFinite)) return null;
        if (
          near(v.d, 20, 0.5) &&
          near(v.wl, 550, 1) &&
          near(v.r, 0.692, 0.01)
        ) {
          return {
            level: 'ok',
            message:
              '0.69 arcseconds, the figure the panel shows. Note that the measured width of 0.77 is not this number: the Rayleigh separation is a criterion for the aperture’s diffraction pattern; the measured width is a property of the frame.',
          };
        }
        return {
          level: 'error',
          message:
            'Use 20 cm and 550 nm: 1.22 × 550e-9 / 0.20 radians, times 206,265.',
        };
      },
      tool: TEL({ aperture: 2 }),
    },
    {
      sid: 'why-they-differ',
      after: 'rayleigh-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Why do they differ?',
      body: `Set the seeing to <strong>0</strong>, as in space, with 20 cm. The Rayleigh
             separation is 0.69 arcseconds; the pattern&rsquo;s own FWHM, a computed row, is
             0.58. There is no atmosphere in either.`,
      prompt:
        'Why are the Rayleigh separation and the FWHM of the same pattern different?',
      options: [
        'They are different measures of one pattern: the first dark ring is at 1.22 wavelengths over the diameter, the half-maximum width is 1.03',
        'One of them is wrong, and the FWHM is the real resolution limit',
        'The seeing was not quite zero',
        'The FWHM includes the detector’s pixels and the Rayleigh separation does not',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'fwhm-is-limit',
          option: 1,
          say: 'Neither is wrong, and neither is “the” limit. The Rayleigh separation is a convention for when two patterns count as separate; the FWHM is a width. They differ by a factor of 1.19 for a clear circular aperture.',
        },
      ],
      hints: [
        'The first dark ring and the half-maximum point are two different places on the same pattern.',
      ],
      because:
        'For a clear circular aperture the first dark ring is at 1.220 wavelengths over the diameter and the half-maximum is at 1.029 of the same: a ratio of 1.185 even with no atmosphere.',
      tool: TEL({ aperture: 2, seeing: 0 }),
    },
    {
      sid: 'seeing-sets-a-floor',
      after: 'magnification',
      depth: 'advanced',
      type: 'measure',
      title: 'Seeing sets a floor',
      body: `Put the seeing at <strong>1.0 arcsecond</strong>, an ordinary night, and read the
             <strong>FWHM of the combined profile</strong> (a computed row: the seeing and the
             aperture&rsquo;s pattern together) at 20 cm, at 1 m and at 4 m.
             Use a focal ratio of 6 for the 4 m.`,
      fields: [
        {
          id: 'w20',
          label: 'Combined FWHM at 20 cm',
          unit: 'arcsec',
          hint: '1.19',
        },
        {
          id: 'w100',
          label: 'Combined FWHM at 1 m',
          unit: 'arcsec',
          hint: '1.03',
        },
        {
          id: 'w400',
          label: 'Combined FWHM at 4 m',
          unit: 'arcsec',
          hint: '1.01',
        },
      ],
      validate: v => {
        if (![v.w20, v.w100, v.w400].every(Number.isFinite)) return null;
        if (
          near(v.w20, 1.186, 0.02) &&
          near(v.w100, 1.026, 0.02) &&
          near(v.w400, 1.006, 0.02)
        ) {
          return {
            level: 'ok',
            message:
              '1.19, 1.03 and 1.01 arcseconds. Going from 1 m to 4 m changes the width by two percent: on the ground the air’s blur sets a floor near the seeing. A bigger mirror still collects sixteen times the light, so it sees fainter stars; it does not resolve a closer pair.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the seeing to 1.0 and read the “FWHM of the combined profile” row at each aperture.',
        };
      },
      tool: TEL({ aperture: 6, seeing: 1 }),
    },
    {
      sid: 'why-space-does',
      after: 'seeing-sets-a-floor',
      depth: 'advanced',
      type: 'measure',
      title: 'Why space does',
      body: `Now set the seeing to <strong>0</strong>, as above the atmosphere, and read the
             <strong>diffraction pattern&rsquo;s own FWHM</strong> for the same 1 m and 4 m
             (a computed row).`,
      fields: [
        {
          id: 'a100',
          label: 'Pattern FWHM at 1 m',
          unit: 'arcsec',
          hint: '0.117',
        },
        {
          id: 'a400',
          label: 'Pattern FWHM at 4 m',
          unit: 'arcsec',
          hint: '0.029',
        },
      ],
      validate: v => {
        if (![v.a100, v.a400].every(Number.isFinite)) return null;
        if (near(v.a100, 0.117, 0.004) && near(v.a400, 0.029, 0.002)) {
          return {
            level: 'ok',
            message:
              '0.117 and 0.029 arcseconds, in proportion to one over the diameter: with no atmosphere the width follows the aperture, and a telescope in space resolves ten to forty times finer detail than the same mirror on the ground. This is a synthetic frame with a stated blur, not a prediction for any site.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the seeing to 0 and read the “The diffraction pattern’s own FWHM” row.',
        };
      },
      tool: TEL({ aperture: 6, seeing: 0 }),
    },
    {
      sid: 'the-crossover',
      after: 'why-space-does',
      depth: 'advanced',
      type: 'measure',
      title: 'Where the air takes over',
      body: `For 1.0 arcsecond of seeing, the aperture at which the pattern&rsquo;s own FWHM
             (1.029 wavelengths over the diameter) equals the seeing is a crossover: larger
             than that, a ground telescope gains light and little else. Type the seeing and
             the wavelength and the instrument gives the aperture, in centimeters.`,
      fields: [
        { id: 'see', label: 'Seeing', unit: 'arcsec', hint: '1.0' },
        { id: 'wl', label: 'Wavelength', unit: 'nm', hint: '550' },
        {
          id: 'dc',
          label: 'Crossover aperture',
          unit: 'cm',
          compute: v => (100 * 1.028994 * v.wl * 1e-9 * 206264.806) / v.see,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.see, v.wl].every(Number.isFinite)) return null;
        if (
          near(v.see, 1, 0.01) &&
          near(v.wl, 550, 1) &&
          near(v.dc, 11.7, 0.2)
        ) {
          return {
            level: 'ok',
            message:
              'About 11.7 centimeters. Beyond that a ground telescope under 1 arcsecond of seeing is seeing-limited; the crossover moves out to larger apertures as the seeing improves (about 23 cm at 0.5 arcsecond).',
          };
        }
        return {
          level: 'error',
          message:
            'Use a seeing of 1.0 and a wavelength of 550: 1.029 × 550e-9 / (1/206,265) meters.',
        };
      },
      tool: TEL({ aperture: 1, seeing: 1 }),
    },
  ],
};

export const WHAT_A_TELESCOPE_RESOLVES_ES = {
  title: 'Qué resuelve un telescopio',
  subtitle:
    'Qué apertura muestra dos estrellas como dos, cuándo aparece la estrella débil y por qué la anchura de una estrella no es el límite del telescopio',
  objectives: [
    'Predecir qué apertura muestra un par cercano de estrellas como dos, comprobarlo y decir qué es la caída entre ellas',
    'Decir cómo la apertura y la exposición juntas sacan una estrella débil del ruido',
    'Decir que la ampliación agranda una imagen y no añade detalle que la apertura y el seeing no permitieran',
    'Distinguir la separación de Rayleigh (calculada a partir de la apertura) de la anchura medida de una estrella (leída en una imagen) y decir por qué difieren',
  ],
  steps: [
    {
      title: 'Un par de estrellas',
      body: 'Dos estrellas del mismo brillo están a <strong>1,0 segundo de arco</strong> una de otra, el ancho de una moneda vista a cuatro kilómetros. Con el panel del telescopio las mirarás con distintas aperturas y verás cuándo se separan.\n\nLa imagen es <strong>sintética</strong>: la hace el modelo, con el desenfoque de la atmósfera en 0,6 segundos de arco, una buena noche en un buen sitio. Nadie la observó. La curva azul bajo la imagen es lo que el modelo dice que debería ser la fila de píxeles que pasa por el par; los puntos son la fila de esta imagen.',
    },
    {
      title: '¿Qué apertura muestra dos estrellas?',
      body: 'Hay cuatro aperturas: 5, 10, 20 y 40 centímetros. Una mayor recoge más luz y da una imagen más nítida.',
      prompt:
        'La menor de estas que muestra el par como dos estrellas será&hellip;',
      options: ['5 cm', '10 cm', '20 cm', '40 cm'],
      hints: [
        'Dos estrellas están separadas cuando hay una caída de luz entre ellas. Prueba las aperturas una a una y mira la curva.',
      ],
      because:
        'Unos 20 centímetros: allí la caída entre las estrellas es del 27 por ciento y con 10 no hay ninguna. Un telescopio de 5 o 10 centímetros muestra una mancha gorda; uno mayor solo afina lo que la atmósfera ya permite.',
    },
    {
      title: 'La caída entre las estrellas',
      body: 'Pon la apertura en <strong>10 cm</strong>, luego en <strong>20 cm</strong> y luego en <strong>40 cm</strong>, y lee la caída entre las estrellas en la fila <em>El par</em>, en por ciento: cuánto baja la luz a medio camino entre ellas respecto de la luz en una estrella.',
      fields: [
        { label: 'Caída con 10 cm' },
        { label: 'Caída con 20 cm' },
        { label: 'Caída con 40 cm' },
      ],
    },
    {
      title: 'Sacar una estrella débil',
      body: 'Cambia el campo a <strong>campo débil</strong>. Una estrella de magnitud 19, unas cien mil veces más débil que la más débil que ve el ojo, está en el círculo discontinuo. El detector anota una estrella cuando su señal sube bien por encima del ruido.',
      prompt: '¿Qué sacará la estrella débil?',
      options: [
        'Una apertura mayor y una exposición más larga ayudan, cada una porque recoge más luz',
        'Solo ayuda una apertura mayor: una exposición más larga repite la misma luz',
        'Solo ayuda una exposición más larga: la apertura cambia el tamaño de la imagen',
        'Ninguna: la estrella es más débil de lo que cualquier telescopio puede mostrar',
      ],
      hints: ['La luz recogida es área por tiempo.'],
      because:
        'Ambas: la luz recogida es proporcional al área de la apertura por la exposición, y la estrella aparece cuando eso es lo bastante grande sobre el ruido del cielo y del detector.',
    },
    {
      title: 'Cuándo aparece la estrella débil',
      body: 'Con el seeing en 1,0 segundo de arco, halla la <strong>exposición más corta</strong>, en segundos, con la que la estrella débil aparece en la lista (la fila lo dice) para un telescopio de 10 cm, de 20 cm y de 40 cm. Las exposiciones disponibles son 5, 10, 30, 60, 120, 300 y 600 segundos.',
      fields: [
        { label: 'Exposición más corta con 10 cm' },
        { label: 'Exposición más corta con 20 cm' },
        { label: 'Exposición más corta con 40 cm' },
      ],
    },
    {
      title: '¿Sirve el telescopio para ampliar?',
      body: 'Un amigo dice que el mejor telescopio es el que más amplía. El panel no tiene control de ampliación: la imagen siempre se muestra al tamaño que ves.',
      prompt: '¿Qué hace ampliar más una imagen?',
      options: [
        'La hace más grande, y no añade detalle que la apertura y el seeing no permitieran ya',
        'Deja que un telescopio pequeño separe cualquier par de estrellas, si la ampliación es suficiente',
        'Hace más brillante una estrella débil, porque la luz se reparte por más imagen',
        'Afina la imagen, porque los píxeles son más grandes',
      ],
      misconceptions: [
        {
          say: 'Con 10 cm el par no tiene caída alguna: su luz es una sola mancha, y agrandar una mancha deja una mancha. El detalle que separa dos estrellas lo fijan la apertura y el seeing, antes de cualquier ocular.',
        },
        {
          say: 'Repartir la misma luz por más imagen hace cada parte más tenue, no más brillante. Lo que saca una estrella débil es recoger más luz: una apertura mayor o una exposición más larga.',
        },
        {
          say: 'Píxeles o imagen mayores muestran el mismo desenfoque más grande. El desenfoque lo fijan la difracción de la apertura y el aire.',
        },
      ],
      hints: [
        'Compara la imagen con 10 cm con la misma imagen dibujada al doble de tamaño.',
      ],
      because:
        'Un telescopio recoge luz y, dentro de los límites del aire, afina la imagen; la ampliación solo cambia lo grande que se dibuja el resultado.',
    },
    {
      title: 'Dos anchuras, por separado',
      body: 'El panel da dos números. La <strong>separación de Rayleigh</strong> se calcula solo a partir de la apertura y la longitud de onda: el radio del primer anillo oscuro de la luz que difracta la apertura, 1,22 longitudes de onda entre el diámetro. El <strong>FWHM medido</strong> se lee en las estrellas de esta imagen: la anchura total a media altura del perfil, con la atmósfera dentro. Son cantidades distintas. Los pasos más profundos miden ambas y dicen por qué difieren. La anchura de una estrella no es el límite del telescopio.',
    },
  ],
};

export const WHAT_A_TELESCOPE_RESOLVES_DEEPER_ES = {
  steps: [
    {
      title: 'La anchura de una estrella en esta imagen',
      body: 'Con la apertura en <strong>20 cm</strong> y el seeing en 0,6 segundos de arco, lee el <strong>FWHM medido</strong> en segundos de arco: la anchura que la herramienta de PSF ajusta a las estrellas de referencia de la imagen, y su incertidumbre.',
      fields: [
        { label: 'FWHM medido con 20 cm' },
        { label: 'Su incertidumbre' },
      ],
    },
    {
      title: 'La separación de Rayleigh, a mano',
      body: 'Calcula la separación de Rayleigh del mismo telescopio: 1,22 veces la longitud de onda entre el diámetro, en radianes, por 206&nbsp;265 para pasar a segundos de arco. Escribe la apertura y la longitud de onda y el instrumento hace la aritmética.',
      fields: [
        { label: 'Apertura' },
        { label: 'Longitud de onda' },
        { label: 'Separación de Rayleigh' },
      ],
    },
    {
      title: '¿Por qué difieren?',
      body: 'Pon el seeing en <strong>0</strong>, como en el espacio, con 20 cm. La separación de Rayleigh es 0,69 segundos de arco; el FWHM propio del patrón, una fila calculada, es 0,58. No hay atmósfera en ninguno de los dos.',
      prompt:
        '¿Por qué son distintos la separación de Rayleigh y el FWHM del mismo patrón?',
      options: [
        'Son medidas distintas de un mismo patrón: el primer anillo oscuro está a 1,22 longitudes de onda entre el diámetro, la anchura a media altura a 1,03',
        'Una de ellas está mal, y el FWHM es el verdadero límite de resolución',
        'El seeing no era exactamente cero',
        'El FWHM incluye los píxeles del detector y la separación de Rayleigh no',
      ],
      misconceptions: [
        {
          say: 'Ninguna está mal, y ninguna es «el» límite. La separación de Rayleigh es una convención para cuándo dos patrones cuentan como separados; el FWHM es una anchura. Difieren en un factor de 1,19 para una apertura circular libre.',
        },
      ],
      hints: [
        'El primer anillo oscuro y el punto de media altura son dos lugares distintos del mismo patrón.',
      ],
      because:
        'Para una apertura circular libre el primer anillo oscuro está a 1,220 longitudes de onda entre el diámetro y la media altura a 1,029 de lo mismo: un cociente de 1,185 incluso sin atmósfera.',
    },
    {
      title: 'El seeing pone un suelo',
      body: 'Pon el seeing en <strong>1,0 segundo de arco</strong>, una noche corriente, y lee el <strong>FWHM del perfil combinado</strong> (una fila calculada: el seeing y el patrón de la apertura juntos) con 20 cm, con 1 m y con 4 m. Usa relación focal 6 para los 4 m.',
      fields: [
        { label: 'FWHM combinado con 20 cm' },
        { label: 'FWHM combinado con 1 m' },
        { label: 'FWHM combinado con 4 m' },
      ],
    },
    {
      title: 'Por qué el espacio sí',
      body: 'Ahora pon el seeing en <strong>0</strong>, como por encima de la atmósfera, y lee el <strong>FWHM propio del patrón de difracción</strong> para el mismo 1 m y 4 m (una fila calculada).',
      fields: [
        { label: 'FWHM del patrón con 1 m' },
        { label: 'FWHM del patrón con 4 m' },
      ],
    },
    {
      title: 'Dónde toma el relevo el aire',
      body: 'Para 1,0 segundo de arco de seeing, la apertura en la que el FWHM propio del patrón (1,029 longitudes de onda entre el diámetro) iguala al seeing es un cruce: por encima, un telescopio terrestre gana luz y poco más. Escribe el seeing y la longitud de onda y el instrumento da la apertura, en centímetros.',
      fields: [
        { label: 'Seeing' },
        { label: 'Longitud de onda' },
        { label: 'Apertura de cruce' },
      ],
    },
  ],
};

const CONTENT = {
  'what-a-telescope-resolves': {
    topic:
      'What aperture, exposure and the atmosphere do to a point of light: the dip between two stars at three apertures (0, 27 and 50 percent at 10, 20 and 40 cm with 0.6 arcseconds of seeing), the exposure at which a magnitude-19 star is listed (600, 120 and 60 seconds at 10, 20 and 40 cm), the misconception about what magnification does, and, at depth, the measured FWHM against the Rayleigh separation, the floor that seeing sets, and the crossover aperture.',
    difficulty:
      'Introductory (a ratio and a picture); majors (a diffraction formula); advanced (seeing against diffraction)',
    placement:
      'In a survey course after the unit on light and telescopes, before photometry; in a majors course beside the investigations of the CCD and the exposure. It supports OpenStax Astronomy 2e chapter 6 (astronomical instruments). It needs no earlier investigation.',
    overview:
      'Students predict the smallest aperture that shows a pair 1 arcsecond apart as two stars, read the dip between the stars at 10, 20 and 40 cm (0, 27 and 50 percent), predict and find the exposure at which a faint star is listed, and answer the magnification question. At the quantitative depth they read the width the Observatory’s PSF tool fits (0.77 arcseconds at 20 cm), compute the Rayleigh separation (0.69) and explain why the two differ even in space (1.22 against 1.03 wavelengths over the diameter). At the advanced depth they read the floor seeing sets (1.19, 1.03 and 1.01 arcseconds at 20 cm, 1 m and 4 m), the pattern’s own width in space, and the crossover aperture (11.7 cm at 1 arcsecond).',
    priorKnowledge: [
      'An arcsecond as an angle',
      'Light collected is area times time',
      'A star seen through a telescope is a small blur, not a point',
    ],
    keyConcepts: [
      {
        heading: 'Two stars are two when there is a dip between them',
        body: 'The Rayleigh criterion is a dip of 26.5 percent between two diffraction patterns. At 20 cm and 0.6 arcseconds of seeing the pair dips by 27 percent, so 20 cm is about the smallest aperture that shows it.',
      },
      {
        heading: 'The Rayleigh separation is computed, the FWHM is measured',
        body: 'The first is 1.22 wavelengths over the diameter, from the aperture alone. The second is the width of a profile in a frame, with the seeing and the fit’s model in it. They are different quantities and differ by 18.5 percent for a clear aperture with no atmosphere.',
      },
      {
        heading:
          'Aperture buys light always and resolution only up to the seeing',
        body: 'On the ground a larger aperture keeps collecting more light (it sees fainter stars) but stops narrowing the image near the seeing; above the atmosphere the width follows one over the diameter.',
      },
    ],
    features: [
      {
        name: 'The telescope panel (detector family)',
        text: 'A synthetic double star or faint field through the telescope the controls describe, with the Rayleigh separation and the measured FWHM as two labeled numbers, the dip between the stars, whether the faint star is listed, the light gathered and the plate scale.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the measured width, the Rayleigh separation by hand and why they differ. Advanced: the seeing floor, space, and the crossover aperture.',
      },
      {
        name: 'Synthetic frames, stated',
        text: 'Every step says the frame is synthetic. The seeing is an input; no site or night is represented.',
      },
    ],
    misconceptions: [
      {
        claim: 'A bigger magnification makes a better telescope.',
        response:
          'Magnification only enlarges the image. The detail is set by the aperture and the seeing, and a faint star is brought out by collecting light, not by enlarging.',
      },
      {
        claim:
          'The width of a star in a frame is the resolution limit of the telescope.',
        response:
          'It is the width of a fitted profile with the seeing in it. The Rayleigh separation is a different quantity, computed from the aperture, and neither is “the” limit.',
      },
      {
        claim: 'A bigger telescope on the ground always resolves finer detail.',
        response:
          'Only up to the seeing: from 1 m to 4 m the combined width changes by two percent at 1 arcsecond of seeing. A bigger mirror still sees fainter stars.',
      },
      {
        claim:
          'A small telescope can separate any pair if the magnification is high enough.',
        response:
          'At 10 cm the pair has no dip: its light is one blob, and enlarging a blob leaves a blob.',
      },
    ],
    teachingNotes: [
      'The frame is a synthetic model: an Airy pattern for the aperture convolved with a Moffat seeing profile (beta 4.765), drawn through the detector kernel’s frame model with Poisson and read noise, and measured with the same PSF tool the Observatory ships. TELESCOPES.md holds the validation: the analytic checks, the independent FFT oracle at two apertures, the coverage ensemble (0.675 against a band of 0.60 to 0.76) and the refusals. The authentic-data check is not measured.',
      'The dip is the model’s (the kernel’s), not read from the noisy frame; the dots in the plot are the frame’s own row. The faint star is “listed” when Prompt 183’s detector finds it at 4 sigma near its true position, which in this field happens at a CCD-equation signal to noise near 7; the row shows both.',
      'The measured FWHM is a Moffat fit to three reference stars. When the profile is mostly diffraction (space, large aperture, small pixels) the fit is flagged a model fit and its number is below the pattern’s FWHM; say so.',
      'Inherited limits: one wavelength, a Moffat seeing independent of wavelength and aperture, no adaptive optics, aberrations or spider; the stars’ brightness is V whatever the wavelength.',
    ],
    discussion: [
      'Why does the dip at 40 cm, 50 percent, barely change at 1 m, 60 percent?',
      'What would a telescope in space with the same 20 cm show of the pair at 1 arcsecond?',
      'If you could only afford one of a bigger mirror or a better site, which would resolve closer pairs, and which would see fainter stars?',
    ],
    extensions: [
      'Set a 30 percent central obstruction at 20 cm and compare the Rayleigh separation and the dip.',
      'Change the wavelength to 1000 nm and say what happens to the Rayleigh separation.',
    ],
    modelNotes:
      'js/kernels/detector/optics.js (Airy, Moffat, their convolution), telescope.js (the frame), js/telescopeField.js (the PSF tool’s measurement), TELESCOPES.md.',
  },
};

const FLOW = {
  'what-a-telescope-resolves': [
    {
      from: 'a-pair-of-stars',
      to: 'smallest-aperture-predict',
      text: 'A pair 1 arcsecond apart, and the prediction of the smallest aperture that shows two.',
    },
    {
      from: 'dips',
      to: 'dips',
      text: 'The dip between the stars at 10, 20 and 40 cm, with the Rayleigh pair’s 26.5 percent as the reference.',
    },
    {
      from: 'faint-star-predict',
      to: 'faint-appears',
      text: 'A magnitude-19 star: which setting brings it out, and the exposures at which it is listed.',
    },
    {
      from: 'magnification',
      to: 'two-widths',
      text: 'The magnification misconception, and the two widths named and kept apart.',
    },
  ],
};

const EXPECTATIONS = {
  'what-a-telescope-resolves': {
    dips: 'Dips of 0, 27 and 50 percent at 10, 20 and 40 cm (each within 2) with 0.6 arcseconds of seeing.',
    'faint-appears':
      'The shortest listing exposures 600, 120 and 60 seconds at 10, 20 and 40 cm with 1.0 arcsecond of seeing.',
  },
};

const BANDS = {
  'what-a-telescope-resolves': {
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
  'what-a-telescope-resolves': WHAT_A_TELESCOPE_RESOLVES_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'what-a-telescope-resolves': WHAT_A_TELESCOPE_RESOLVES_DEEPER,
};
export const DEPTH_ES = {
  'what-a-telescope-resolves': WHAT_A_TELESCOPE_RESOLVES_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WHAT_A_TELESCOPE_RESOLVES];
