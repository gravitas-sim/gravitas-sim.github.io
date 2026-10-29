// =============================================================================
// Why Two Lines Become One (Prompt 213)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure file
// the prompt adds (D-R10-213-02), because the shared sequence files sit at their
// line ceilings. The per-lesson path every loader builds from an id is a one-line
// re-export of a named export here, and the instructor modules read INSTRUCTOR. No
// imports: every number a step states is recomputed in
// tests/spectrographLessons.test.js from the instruments
// (js/spectrographWidgets.js over js/spectrographField.js and
// js/kernels/spectrograph/). Every step carries a `sid`, an opaque stable id that
// student progress is keyed by.
//
// The spectra are synthetic and say so; the lamp's lines are the NIST list's with
// invented intensities; the wavelength solution is a fit with an uncertainty, never
// an answer key (SPECTROGRAPH.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 6000, lumSun: 1 }],
};
/** The pair panel with its controls set (R and sampling are indices; see PAIR_R and PAIR_SAMPLING). */
const PAIR = (values = {}, hide = ['snr']) => ({
  id: 'spectrograph-lines',
  values: { R: 3, sep: 0.5, sampling: 3, snr: 0, ...values },
  hide,
});
/** The arc panel with its controls set. */
const ARC = (values = {}, hide = []) => ({
  id: 'spectrograph-arc',
  values: { marked: 8, degree: 3, seed: 0, line: 0, medium: 0, ...values },
  hide,
});
/** The trade panel with its controls set (R and R_s are indices; see TRADE_R and TRADE_RS). */
const TRADE = (values = {}, hide = []) => ({
  id: 'spectrograph-trade',
  values: {
    R: 5,
    Rs: 2,
    seeing: 1,
    width: 0,
    vmag: 12,
    facility: 1,
    exposure: 2,
    ...values,
  },
  hide,
});

export const WHY_TWO_LINES_BECOME_ONE = {
  id: 'why-two-lines-become-one',
  thumbnail: 'images/investigations/why-two-lines-become-one.webp',
  title: 'Why Two Lines Become One',
  subtitle:
    'Why a spectrograph can show two lines as one, what pixels can and cannot fix, how a wavelength scale is calibrated from an arc and what it costs in light',
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
    'Predict which resolving power separates two close spectral lines, then read the dip between them and say what the resolving power is',
    'Say that finer pixels sample a line better and cannot separate two lines the instrument has already merged',
    'Say what a blended line looks like to a fit that expects one: wider than the instrument allows',
    'Tell the resolving power from the sampling, and the number of resolution elements from the number of pixels',
  ],
  steps: [
    {
      sid: 'two-lines',
      stage: STAGE,
      type: 'read',
      title: 'Two lines, one instrument',
      body: `A star&rsquo;s light carries two spectral lines <strong>0.5 nm</strong> apart,
             near 500 nm, too close to tell by eye. A spectrograph spreads the light into a spectrum on
             a detector. Its <strong>line-spread function</strong> turns each line into a small
             bump of its own width, and the <strong>resolving power</strong> R is the
             wavelength over that width, measured at half the height (the FWHM).
             \n\nEverything in the panel is <strong>synthetic</strong>: a model with noise, not
             a night&rsquo;s data. The smooth curve is the instrument&rsquo;s response to the
             pair; the dots are the pixels it lands on.`,
      tool: PAIR(),
    },
    {
      sid: 'smallest-r-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'dip-by-r',
      title: 'Which resolving power shows two lines?',
      body: `Four spectrographs are on offer, with resolving powers of 300, 500, 750 and 1000
             at 500 nm. A higher resolving power gives a narrower line-spread function.`,
      prompt:
        'The smallest of these that shows two separate peaks will be&hellip;',
      options: ['R = 300', 'R = 500', 'R = 750', 'R = 1000'],
      answer: 3,
      hints: [
        'Two lines are two when there is a dip between them. Set each resolving power in turn and watch the curve.',
      ],
      because:
        'R = 1000: the line-spread width is then 0.5 nm, equal to the separation, and the curve dips by 7 percent. At 750 the two bumps have merged into one wide peak.',
      tool: PAIR({ R: 2 }),
    },
    {
      sid: 'dip-by-r',
      stage: STAGE,
      type: 'measure',
      title: 'The dip between the lines',
      body: `With the lines 0.5 nm apart, set the resolving power to <strong>500</strong>, then
             <strong>1000</strong>, then <strong>2000</strong>, and read the <em>Dip between
             the lines</em>, in percent: how far the smooth profile falls between the two
             peaks, relative to the lower peak. If the row says the peaks have merged, the
             dip is 0.`,
      fields: [
        { id: 'd500', label: 'Dip at R = 500', unit: '%', hint: '0' },
        { id: 'd1000', label: 'Dip at R = 1000', unit: '%', hint: '7.3' },
        { id: 'd2000', label: 'Dip at R = 2000', unit: '%', hint: '87.5' },
      ],
      validate: v => {
        if (![v.d500, v.d1000, v.d2000].every(Number.isFinite)) return null;
        if (
          near(v.d500, 0, 0.5) &&
          near(v.d1000, 7.3, 0.6) &&
          near(v.d2000, 87.5, 1)
        ) {
          return {
            level: 'ok',
            message:
              'No dip at 500, 7 percent at 1000 and 88 percent at 2000. Two Gaussian lines of equal height first show two peaks when they are 0.85 of a FWHM apart (two sigma); at one FWHM the dip is 7 percent, and at two FWHM it is nearly complete. This criterion is for Gaussian profiles, and it is not Rayleigh&rsquo;s, which belongs to the Airy pattern of an aperture.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the separation at 0.5 nm and the noise off, and read the “Dip between the lines” row: 0, 7.3 and 87.5.',
        };
      },
      tool: PAIR({ R: 3 }),
    },
    {
      sid: 'finer-pixels',
      stage: STAGE,
      type: 'measure',
      title: 'Do finer pixels help?',
      body: `A friend says smaller pixels would separate the lines. Test it. Keep the lines
             0.5 nm apart. At <strong>R = 500</strong> set the sampling to 8 pixels per FWHM
             and read <em>Peaks in the pixels</em> (1 or 2). Then set
             <strong>R = 1000</strong>, where the dip is real, and read the peaks at 2 pixels
             per FWHM and at 8.`,
      fields: [
        {
          id: 'p500',
          label: 'Peaks at R = 500, 8 pixels per FWHM',
          unit: '',
          hint: '1',
        },
        {
          id: 'p1000a',
          label: 'Peaks at R = 1000, 2 pixels per FWHM',
          unit: '',
          hint: '1',
        },
        {
          id: 'p1000b',
          label: 'Peaks at R = 1000, 8 pixels per FWHM',
          unit: '',
          hint: '2',
        },
      ],
      validate: v => {
        if (![v.p500, v.p1000a, v.p1000b].every(Number.isFinite)) return null;
        if (v.p500 === 1 && v.p1000a === 1 && v.p1000b === 2) {
          return {
            level: 'ok',
            message:
              'One, one and two. Finer pixels cannot split lines the line-spread function has merged (R = 500 stays one peak at any sampling). They can reveal a dip that is really there: at R = 1000 a grid of only 2 pixels per FWHM can miss a 7 percent dip, and 8 pixels per FWHM shows it. Sampling decides whether you see what the instrument delivered; the resolving power decides what it delivered.',
          };
        }
        return {
          level: 'error',
          message:
            'Set R to 500 with 8 pixels per FWHM, then R to 1000 with 2 and with 8, and read the “Peaks in the pixels” row each time.',
        };
      },
      tool: PAIR({ R: 3, sampling: 6 }),
    },
    {
      sid: 'a-blend',
      stage: STAGE,
      type: 'measure',
      title: 'What a blend looks like to a fit',
      body: `At <strong>R = 500</strong> the two lines have merged, but a fit that expects a
             single, unresolved line finds it too wide. Read <em>Fitted as one line</em>:
             by what percent is the fitted FWHM wider than the instrument&rsquo;s?`,
      fields: [
        {
          id: 'w',
          label: 'Broader than the instrument',
          unit: '%',
          hint: '16',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.w)) return null;
        if (near(v.w, 16, 3)) {
          return {
            level: 'ok',
            message:
              '16 percent. A line that is wider than the instrument allows is the signature of a blend, or of a line with a width of its own: a flag, not a proof. The deeper steps use it to leave blends out of a calibration.',
          };
        }
        return {
          level: 'error',
          message:
            'Set R to 500, the sampling to 3 and the separation to 0.5 nm, and read the percent in the “Fitted as one line” row.',
        };
      },
      tool: PAIR({ R: 3 }),
    },
    {
      sid: 'resolving-power-and-sampling',
      stage: STAGE,
      type: 'read',
      title: 'Resolving power, sampling, resolution elements',
      body: `Three numbers, kept apart. The <strong>resolving power</strong> R is the wavelength
             over the FWHM of the line-spread function: it is the instrument&rsquo;s, and only a
             narrower slit, a bigger grating or a better design raise it. The
             <strong>sampling</strong> is how many pixels the FWHM covers; two or more is the
             rule, and a coarser grid undersamples the line. The number of independent
             measurements across a spectrum is its span over the FWHM, the
             <strong>resolution elements</strong>, and it is not the number of pixels.
             Two lines become one when they are closer than the line-spread function can
             show, whatever the pixels do.`,
      tool: PAIR({ R: 5, sep: 0.5 }),
    },
  ],
};

export const WHY_TWO_LINES_BECOME_ONE_DEEPER = {
  id: 'why-two-lines-become-one',
  steps: [
    {
      sid: 'the-arc-lamp',
      after: 'a-blend',
      depth: 'quantitative',
      type: 'read',
      title: 'An arc lamp ties pixels to wavelengths',
      body: `A spectrograph records pixels; astronomy needs wavelengths. An <strong>arc
             lamp</strong>, a source with lines of known wavelength, is recorded through the
             same instrument, and each line is tied to the pixel where it falls. A low-order
             polynomial through the pairs is the <strong>wavelength solution</strong>. In
             the panel the lamp is synthetic (its lines are the NIST list&rsquo;s, in air,
             with invented intensities) and the instrument&rsquo;s own solution is hidden.
             The panel marks the lines in an order that spreads them over the detector;
             you choose how many, and the degree.`,
      tool: ARC({ marked: 8, degree: 3 }, ['seed', 'line', 'medium']),
    },
    {
      sid: 'degrees-of-freedom',
      after: 'the-arc-lamp',
      depth: 'quantitative',
      type: 'measure',
      title: 'How many lines does a cubic need?',
      body: `A cubic has four coefficients. Keep the degree at <strong>3</strong> and mark
             <strong>5</strong> lines, then <strong>8</strong>, then <strong>14</strong>. Read the
             degrees of freedom from <em>The solution</em> (the number of lines minus four).
             With four lines the solution is <em>exactly determined</em>: it passes through
             every line and there is nothing left to test it with; with three or two it is
             <em>not constrained</em>.`,
      fields: [
        {
          id: 'k5',
          label: 'Degrees of freedom with 5 lines',
          unit: '',
          hint: '1',
        },
        {
          id: 'k8',
          label: 'Degrees of freedom with 8 lines',
          unit: '',
          hint: '4',
        },
        {
          id: 'k14',
          label: 'Degrees of freedom with 14 lines',
          unit: '',
          hint: '10',
        },
      ],
      validate: v => {
        if (![v.k5, v.k8, v.k14].every(Number.isFinite)) return null;
        if (v.k5 === 1 && v.k8 === 4 && v.k14 === 10) {
          return {
            level: 'ok',
            message:
              '1, 4 and 10: the number of lines minus the four coefficients. A cubic needs four lines to be determined and five to be tested, and two lines for a cubic is not constrained at all. A solution should never have as many parameters as lines.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the degree to 3 and mark 5, 8 and 14 lines in turn; the degrees of freedom are lines minus 4.',
        };
      },
      tool: ARC({ marked: 5, degree: 3 }, ['seed', 'line', 'medium']),
    },
    {
      sid: 'the-residuals',
      after: 'degrees-of-freedom',
      depth: 'quantitative',
      type: 'measure',
      title: 'What the residuals say',
      body: `Mark <strong>8</strong> lines and read the rms of the <em>Residuals</em>, in nm,
             for a degree-3 solution and for a degree-1 solution. A straight line cannot follow
             a wavelength scale that bends, and the residuals show the bend; the panel also says
             when the scatter exceeds the errors.`,
      fields: [
        { id: 'r3', label: 'rms at degree 3', unit: 'nm', hint: '0.0005' },
        { id: 'r1', label: 'rms at degree 1', unit: 'nm', hint: '0.018' },
      ],
      validate: v => {
        if (![v.r3, v.r1].every(Number.isFinite)) return null;
        if (near(v.r3, 0.0005, 0.0003) && near(v.r1, 0.0184, 0.003)) {
          return {
            level: 'ok',
            message:
              '0.0005 nm for the cubic, about a twentieth of a pixel, and 0.018 nm for the line, thirty-six times larger, with the reduced chi-square near 1,400 and the flag raised. The residuals of a wrong model are not noise: they trace the part of the solution the model leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Mark 8 lines, then set the degree to 3 and to 1 and read the rms in the “Residuals” row.',
        };
      },
      tool: ARC({ marked: 8, degree: 3 }, ['seed', 'line', 'medium']),
    },
    {
      sid: 'a-velocity',
      after: 'the-residuals',
      depth: 'quantitative',
      type: 'measure',
      title: 'A velocity from a calibrated line',
      body: `The star in the panel is moving along the line of sight. With <strong>8</strong>
             lines marked and a cubic, the panel fits the H&beta; line of the star, turns its
             pixel into a wavelength with the solution&rsquo;s uncertainty, and gives the
             <em>Radial velocity</em> with its own. Read both.`,
      fields: [
        { id: 'v', label: 'Radial velocity', unit: 'km/s', hint: '116' },
        { id: 's', label: 'Its uncertainty', unit: 'km/s', hint: '3.2' },
      ],
      validate: v => {
        if (![v.v, v.s].every(Number.isFinite)) return null;
        if (near(v.v, 115.8, 4) && near(v.s, 3.2, 0.8)) {
          return {
            level: 'ok',
            message:
              'About 116 km/s with an uncertainty of 3 km/s. The star was made with 120 km/s (the panel does not say), and 116 is 1.3 of its own uncertainties away, as the uncertainty promises about two times in three. With only two lines marked and a straight-line solution the panel would say 92 km/s with the same 3 km/s: a line through two points has no residual to warn you that the scale bends.',
          };
        }
        return {
          level: 'error',
          message:
            'Mark 8 lines, degree 3, the line H-beta and the medium air, and read the “Radial velocity” row.',
        };
      },
      tool: ARC({ marked: 8, degree: 3, line: 0, medium: 0 }, ['seed']),
    },
    {
      sid: 'the-medium',
      after: 'a-velocity',
      depth: 'quantitative',
      type: 'measure',
      title: 'Air or vacuum?',
      body: `The arc lamp&rsquo;s wavelengths are in <strong>air</strong>, so the star is measured
             in air. A rest wavelength must be in the same medium. Switch the medium of the
             rest wavelength to <strong>vacuum</strong>: the panel refuses, and shows what the
             velocity would have been had the two been mixed. For H&beta; the rest wavelength
             is 486.135 nm in air and 486.2708 nm in vacuum. Read the wrong velocity, and work
             out by hand the offset the mix-up is worth: c &times; (vacuum over air &minus; 1),
             with c = 299,792 km/s.`,
      fields: [
        {
          id: 'wrong',
          label: 'Velocity with the media ignored',
          unit: 'km/s',
          hint: '32',
        },
        {
          id: 'off',
          label: 'The offset of the mix-up',
          unit: 'km/s',
          compute: () => 299792.458 * (486.2708 / 486.135 - 1),
          decimals: 1,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.wrong)) return null;
        if (near(v.wrong, 32.1, 3) && near(v.off, 83.8, 1)) {
          return {
            level: 'ok',
            message:
              '32 km/s instead of 116, a difference of 84 km/s: the offset between air and vacuum, 0.028 percent of the wavelength, is as large as a fast star&rsquo;s velocity. The panel refuses the mixed request on purpose, and a velocity always carries the medium it was measured in.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the medium to vacuum, read “If the media were ignored”, and compute 299,792 × (486.2708 / 486.135 − 1).',
        };
      },
      tool: ARC({ marked: 8, degree: 3, line: 0, medium: 1 }, ['seed']),
    },
    {
      sid: 'light-through-the-slit',
      after: 'the-medium',
      depth: 'advanced',
      type: 'read',
      title: 'Resolution costs light',
      body: `A narrower slit makes a narrower line-spread function, so a higher resolving
             power, and lets through less of a star whose image is wider than the slit. For a
             fixed grating and camera R is inversely proportional to the slit width, and the
             panel&rsquo;s <em>R at which the slit equals the seeing</em> is where the slit just
             matches the seeing disk. Above it, every doubling of R halves the light that gets
             through. The panel puts the trade on one curve for a star, a telescope from the
             instrument library and an exposure.`,
      tool: TRADE({}, ['facility', 'exposure', 'vmag']),
    },
    {
      sid: 'slit-and-throughput',
      after: 'light-through-the-slit',
      depth: 'advanced',
      type: 'measure',
      title: 'The slit and the light that passes',
      body: `With the seeing at 1.0 arcsecond and the slit equal to the seeing at R = 3000,
             read the percent of the star&rsquo;s light that passes at <strong>R = 3000</strong>
             and at <strong>R = 10000</strong>.`,
      fields: [
        {
          id: 't3000',
          label: 'Light passed at R = 3000',
          unit: '%',
          hint: '76',
        },
        {
          id: 't10000',
          label: 'Light passed at R = 10000',
          unit: '%',
          hint: '28',
        },
      ],
      validate: v => {
        if (![v.t3000, v.t10000].every(Number.isFinite)) return null;
        if (near(v.t3000, 76.1, 1.5) && near(v.t10000, 27.6, 1.5)) {
          return {
            level: 'ok',
            message:
              '76 and 28 percent. At R = 3000 the slit is exactly the seeing (1 arcsecond) and passes 76 percent of a Gaussian seeing disk; at R = 10000 it is 0.3 arcsecond and passes 28 percent. Beyond the point where the slit equals the seeing the light falls roughly as one over R.',
          };
        }
        return {
          level: 'error',
          message:
            'Set R to 3000 and then 10000 with the seeing at 1.0 and R_s at 3000, and read the percent in “Slit width that gives this R”.',
        };
      },
      tool: TRADE({ R: 5 }, ['facility', 'exposure', 'vmag', 'width']),
    },
    {
      sid: 'does-more-r-always-help',
      after: 'slit-and-throughput',
      depth: 'advanced',
      type: 'predict',
      reveal: 'the-best-r',
      title: 'Does more resolving power always pay?',
      body: `For a line that is narrower than the instrument, so its observed width is the
             instrument&rsquo;s, the panel plots the signal to noise of the line against R.`,
      prompt:
        'As R rises beyond the point where the slit equals the seeing, the signal to noise of such a line will&hellip;',
      options: [
        'keep rising in proportion to R',
        'stop rising: it levels off, because the light lost balances the narrower width',
        'fall steeply, because the slit passes so little light',
        'not change at all with R at any value',
      ],
      answer: 1,
      hints: [
        'A narrower line-spread function concentrates the line, and a narrower slit starves it.',
      ],
      because:
        'It barely moves: 16.2 at R = 3000, 17.6 at R = 10000 and 16.6 at R = 30000 for this star. Below the slit-equals-seeing point more resolving power is free; beyond it, the gain in contrast is paid for in light, almost exactly.',
      tool: TRADE({ R: 5 }, ['facility', 'exposure', 'vmag', 'width']),
    },
    {
      sid: 'the-best-r',
      after: 'does-more-r-always-help',
      depth: 'advanced',
      type: 'measure',
      title: 'The best resolving power for a line with its own width',
      body: `Now give the line a width of its own: set <em>Line&rsquo;s own width</em> to
             <strong>0.1 nm</strong>. Its observed width can no longer shrink below that, so
             extra resolving power only costs light. Read <em>The resolving power that maximises
             it</em> and the signal to noise there.`,
      fields: [
        { id: 'rbest', label: 'Best resolving power', unit: '', hint: '2355' },
        {
          id: 'snrbest',
          label: 'Signal to noise there',
          unit: '',
          hint: '12.6',
        },
      ],
      validate: v => {
        if (![v.rbest, v.snrbest].every(Number.isFinite)) return null;
        if (near(v.rbest, 2355, 60) && near(v.snrbest, 12.6, 0.4)) {
          return {
            level: 'ok',
            message:
              'R of about 2350 and a signal to noise of 12.6. The line is resolved when R reaches about 2350, where the line-spread width equals its own; a lower R blurs it into the continuum, a higher one only starves it. Choosing a resolving power is matching the instrument to the line, not buying the most.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the line’s own width to 0.1 nm, with R_s = 3000, and read the “resolving power that maximises it” row.',
        };
      },
      tool: TRADE({ R: 5, width: 2 }, ['facility', 'exposure', 'vmag']),
    },
  ],
};

export const WHY_TWO_LINES_BECOME_ONE_ES = {
  title: 'Por qué dos líneas se vuelven una',
  subtitle:
    'Por qué un espectrógrafo puede mostrar dos líneas como una, qué pueden y qué no pueden arreglar los píxeles, cómo se calibra una escala de longitud de onda con un arco y cuánta luz cuesta',
  objectives: [
    'Predecir qué poder de resolución separa dos líneas espectrales cercanas, leer la caída entre ellas y decir qué es el poder de resolución',
    'Decir que los píxeles más finos muestrean mejor una línea y no pueden separar dos líneas que el instrumento ya fundió',
    'Decir qué aspecto tiene una mezcla para un ajuste que espera una sola línea: más ancha de lo que permite el instrumento',
    'Distinguir el poder de resolución del muestreo, y el número de elementos de resolución del número de píxeles',
  ],
  steps: [
    {
      title: 'Dos líneas, un instrumento',
      body: 'La luz de una estrella lleva dos líneas espectrales separadas <strong>0,5 nm</strong>, cerca de 500 nm: demasiado juntas para distinguirlas a simple vista. Un espectrógrafo abre la luz en un espectro sobre un detector. Su <strong>función de dispersión</strong> convierte cada línea en un pequeño bulto de ancho propio, y el <strong>poder de resolución</strong> R es la longitud de onda entre ese ancho, medido a media altura (el FWHM).\n\nTodo en el panel es <strong>sintético</strong>: un modelo con ruido, no los datos de una noche. La curva suave es la respuesta del instrumento al par; los puntos son los píxeles donde cae.',
    },
    {
      title: '¿Qué poder de resolución muestra dos líneas?',
      body: 'Hay cuatro espectrógrafos, con poderes de resolución de 300, 500, 750 y 1000 a 500 nm. Un poder mayor da una función de dispersión más angosta.',
      prompt: 'El menor de estos que muestra dos picos separados será&hellip;',
      options: ['R = 300', 'R = 500', 'R = 750', 'R = 1000'],
      hints: [
        'Dos líneas son dos cuando hay una caída entre ellas. Fija cada poder de resolución y mira la curva.',
      ],
      because:
        'R = 1000: entonces el ancho de dispersión es de 0,5 nm, igual a la separación, y la curva cae un 7 por ciento. Con 750 los dos bultos se fundieron en un solo pico ancho.',
    },
    {
      title: 'La caída entre las líneas',
      body: 'Con las líneas a 0,5 nm, fija el poder de resolución en <strong>500</strong>, luego en <strong>1000</strong> y luego en <strong>2000</strong>, y lee <em>Hundimiento entre las líneas</em>, en por ciento: cuánto baja el perfil suave entre los dos picos, respecto del pico menor. Si la fila dice que los picos se fundieron, la caída es 0.',
      fields: [
        { label: 'Caída con R = 500' },
        { label: 'Caída con R = 1000' },
        { label: 'Caída con R = 2000' },
      ],
    },
    {
      title: '¿Ayudan los píxeles más finos?',
      body: 'Un amigo dice que píxeles más pequeños separarían las líneas. Compruébalo. Mantén las líneas a 0,5 nm. Con <strong>R = 500</strong> fija el muestreo en 8 píxeles por FWHM y lee <em>Picos en los píxeles</em> (1 o 2). Luego fija <strong>R = 1000</strong>, donde la caída es real, y lee los picos con 2 píxeles por FWHM y con 8.',
      fields: [
        { label: 'Picos con R = 500, 8 píxeles por FWHM' },
        { label: 'Picos con R = 1000, 2 píxeles por FWHM' },
        { label: 'Picos con R = 1000, 8 píxeles por FWHM' },
      ],
    },
    {
      title: 'Qué aspecto tiene una mezcla para un ajuste',
      body: 'Con <strong>R = 500</strong> las dos líneas se fundieron, pero un ajuste que espera una sola línea sin resolver la encuentra demasiado ancha. Lee <em>Ajustadas como una sola línea</em>: ¿en qué por ciento es más ancho el FWHM ajustado que el del instrumento?',
      fields: [{ label: 'Más ancha que el instrumento' }],
    },
    {
      title: 'Poder de resolución, muestreo, elementos de resolución',
      body: 'Tres números, por separado. El <strong>poder de resolución</strong> R es la longitud de onda entre el FWHM de la función de dispersión: es del instrumento, y solo una rendija más angosta, una red mayor o un mejor diseño lo suben. El <strong>muestreo</strong> es cuántos píxeles cubre el FWHM; dos o más es la regla, y una rejilla más gruesa submuestrea la línea. El número de medidas independientes a lo largo de un espectro es su extensión entre el FWHM, los <strong>elementos de resolución</strong>, y no es el número de píxeles. Dos líneas se vuelven una cuando están más cerca de lo que la función de dispersión puede mostrar, hagan lo que hagan los píxeles.',
    },
  ],
};

export const WHY_TWO_LINES_BECOME_ONE_DEEPER_ES = {
  steps: [
    {
      title: 'Una lámpara de arco une píxeles y longitudes de onda',
      body: 'Un espectrógrafo registra píxeles; la astronomía necesita longitudes de onda. Una <strong>lámpara de arco</strong>, una fuente con líneas de longitud de onda conocida, se registra con el mismo instrumento, y cada línea se une al píxel donde cae. Un polinomio de grado bajo por los pares es la <strong>solución de longitud de onda</strong>. En el panel la lámpara es sintética (sus líneas son las de la lista del NIST, en aire, con intensidades inventadas) y la solución propia del instrumento está oculta. El panel marca las líneas en un orden que las reparte por el detector; tú eliges cuántas, y el grado.',
    },
    {
      title: '¿Cuántas líneas necesita una cúbica?',
      body: 'Una cúbica tiene cuatro coeficientes. Deja el grado en <strong>3</strong> y marca <strong>5</strong> líneas, luego <strong>8</strong> y luego <strong>14</strong>. Lee los grados de libertad en <em>La solución</em> (el número de líneas menos cuatro). Con cuatro líneas la solución está <em>exactamente determinada</em>: pasa por todas las líneas y no queda nada con que comprobarla; con tres o dos está <em>no restringida</em>.',
      fields: [
        { label: 'Grados de libertad con 5 líneas' },
        { label: 'Grados de libertad con 8 líneas' },
        { label: 'Grados de libertad con 14 líneas' },
      ],
    },
    {
      title: 'Qué dicen los residuos',
      body: 'Marca <strong>8</strong> líneas y lee el rms de los <em>Residuos</em>, en nm, para una solución de grado 3 y para una de grado 1. Una recta no puede seguir una escala de longitud de onda que se curva, y los residuos muestran la curva; el panel también dice cuándo la dispersión supera los errores.',
      fields: [{ label: 'rms con grado 3' }, { label: 'rms con grado 1' }],
    },
    {
      title: 'Una velocidad desde una línea calibrada',
      body: 'La estrella del panel se mueve a lo largo de la línea de visión. Con <strong>8</strong> líneas marcadas y una cúbica, el panel ajusta la línea H&beta; de la estrella, convierte su píxel en longitud de onda con la incertidumbre de la solución y da la <em>Velocidad radial</em> con la suya. Lee ambas.',
      fields: [{ label: 'Velocidad radial' }, { label: 'Su incertidumbre' }],
    },
    {
      title: '¿Aire o vacío?',
      body: 'Las longitudes de onda de la lámpara de arco están en <strong>aire</strong>, así que la estrella se mide en aire. Una longitud de onda en reposo debe estar en el mismo medio. Cambia el medio de la longitud de onda en reposo a <strong>vacío</strong>: el panel la rechaza y muestra cuál habría sido la velocidad de mezclarlos. Para H&beta; la longitud de onda en reposo es 486,135 nm en aire y 486,2708 nm en vacío. Lee la velocidad equivocada y calcula a mano el desplazamiento que vale la confusión: c &times; (vacío entre aire &minus; 1), con c = 299 792 km/s.',
      fields: [
        { label: 'Velocidad ignorando los medios' },
        { label: 'El desplazamiento de la confusión' },
      ],
    },
    {
      title: 'La resolución cuesta luz',
      body: 'Una rendija más angosta da una función de dispersión más angosta, es decir un poder de resolución mayor, y deja pasar menos luz de una estrella cuya imagen es más ancha que la rendija. Para una red y una cámara fijas R es inversamente proporcional al ancho de la rendija, y el <em>R con el que la rendija iguala al seeing</em> del panel es donde la rendija iguala justo al disco de seeing. Por encima, cada duplicación de R reduce a la mitad la luz que pasa. El panel pone el compromiso en una curva para una estrella, un telescopio de la biblioteca de instrumentos y una exposición.',
    },
    {
      title: 'La rendija y la luz que pasa',
      body: 'Con el seeing en 1,0 segundo de arco y la rendija igual al seeing con R = 3000, lee el por ciento de la luz de la estrella que pasa con <strong>R = 3000</strong> y con <strong>R = 10000</strong>.',
      fields: [
        { label: 'Luz que pasa con R = 3000' },
        { label: 'Luz que pasa con R = 10000' },
      ],
    },
    {
      title: '¿Compensa siempre más poder de resolución?',
      body: 'Para una línea más angosta que el instrumento, de modo que su ancho observado es el del instrumento, el panel dibuja la señal a ruido de la línea frente a R.',
      prompt:
        'Cuando R sube más allá del punto en que la rendija iguala al seeing, la señal a ruido de una línea así&hellip;',
      options: [
        'seguirá subiendo en proporción a R',
        'dejará de subir: se estabiliza, porque la luz perdida compensa el ancho menor',
        'caerá con fuerza, porque la rendija deja pasar muy poco',
        'no cambiará en absoluto con R',
      ],
      hints: [
        'Una función de dispersión más angosta concentra la línea, y una rendija más angosta la deja sin luz.',
      ],
      because:
        'Se estabiliza cerca de su límite (17,6 con R = 10000 frente a 16,2 con R = 3000 para esta estrella). Por debajo del punto en que la rendija iguala al seeing más poder de resolución es gratis; más allá, la ganancia en contraste se paga en luz, casi exactamente.',
    },
    {
      title: 'El mejor poder de resolución para una línea con ancho propio',
      body: 'Ahora da a la línea un ancho propio: fija <em>Ancho propio de la línea</em> en <strong>0,1 nm</strong>. Su ancho observado ya no puede bajar de eso, así que más poder de resolución solo cuesta luz. Lee <em>El poder de resolución que la maximiza</em> y la señal a ruido allí.',
      fields: [
        { label: 'Mejor poder de resolución' },
        { label: 'Señal a ruido allí' },
      ],
    },
  ],
};

const CONTENT = {
  'why-two-lines-become-one': {
    topic:
      'What a spectrograph does to a line: the line-spread function and the resolving power, the dip between two close lines at three resolving powers (0, 7 and 88 percent at R = 500, 1000 and 2000 for lines 0.5 nm apart at 500 nm), the misconception that finer pixels separate lines, the fit that calls a blend too wide, and, at depth, the wavelength solution from an arc lamp (degrees of freedom, residuals, a velocity with its uncertainty, air against vacuum) and the trade between resolving power, the slit and the signal to noise.',
    difficulty:
      'Introductory (a ratio and a picture); majors (a polynomial fit and its uncertainty); advanced (light through a slit and an optimum)',
    placement:
      'In a survey course after the unit on light and telescopes, before spectra of stars; in a majors course beside the exposure and telescope investigations and before the first radial velocity. It supports OpenStax Astronomy 2e chapter 6 (astronomical instruments). It needs no earlier investigation.',
    overview:
      'Students predict the smallest resolving power that shows two lines 0.5 nm apart as two (1000), read the dip between them at R = 500, 1000 and 2000 (0, 7 and 88 percent), test whether finer pixels separate the lines (they do not; at R = 1000 they can reveal a real dip) and read how a fit that expects one line sees the blend (16 percent too wide at R = 500). At the quantitative depth they use a synthetic arc lamp: the degrees of freedom of a cubic from 5, 8 and 14 lines (1, 4, 10), the residuals of a cubic and of a line (0.0005 and 0.018 nm), a velocity from the H-beta line with its uncertainty (116 and 3 km/s against the 120 the star was made with) and the air against vacuum mix-up (84 km/s). At the advanced depth they read the light through a slit at R = 3000 and 10000 (76 and 28 percent), predict that more resolving power stops paying beyond the point where the slit equals the seeing, and find the best resolving power for a line of its own width (about 2350, signal to noise 12.6).',
    priorKnowledge: [
      'A wavelength and a spectral line',
      'A signal to noise ratio',
      'A fit with an uncertainty',
    ],
    keyConcepts: [
      {
        heading:
          'Resolving power is the line-spread function’s, not the pixels’',
        body: 'R is the wavelength over the FWHM of the line-spread function. Two equal Gaussian lines show two peaks when they are more than 0.85 of a FWHM apart; finer pixels sample the result better and cannot undo the merge.',
      },
      {
        heading: 'A wavelength solution is a fit with an uncertainty',
        body: 'The number of lines limits the degree: a cubic needs four lines to be determined and five to be tested. Its residuals show what a too simple model leaves out, and its uncertainty at a pixel is the solution’s covariance and the line’s own error together.',
      },
      {
        heading: 'A velocity needs a medium',
        body: 'Air and vacuum wavelengths differ by about 0.03 percent, worth 84 km/s at H-beta. The panel refuses to mix them.',
      },
      {
        heading: 'More resolving power costs light',
        body: 'With a slit narrower than the seeing, R rises as the light falls; for a line narrower than the instrument the signal to noise levels off, and for a line with its own width it has a maximum.',
      },
    ],
    features: [
      {
        name: 'The spectrograph panels (spectrograph family)',
        text: 'Two lines through an instrument (the dip, the sampling and its verdict, a fit that flags a blend), an arc lamp and a star (mark lines, a solution with residuals and uncertainty, a velocity with its medium) and the trade (slit, throughput, signal to noise and the best resolving power).',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the arc, the degrees of freedom, the residuals, a velocity with its uncertainty and the medium. Advanced: the slit and the optimum.',
      },
      {
        name: 'Synthetic spectra, stated',
        text: 'Every step says the spectrum is synthetic. The lamp’s lines are the NIST list’s with invented intensities, the instrument is not a real one, and the star’s velocity is withheld.',
      },
    ],
    misconceptions: [
      {
        claim: 'Smaller pixels raise the resolving power.',
        response:
          'Pixels sample the line-spread function. At R = 500 two lines 0.5 nm apart are one peak at 2 and at 8 pixels per FWHM. Only a narrower line-spread function separates them.',
      },
      {
        claim: 'More pixels mean more independent measurements.',
        response:
          'The independent measurements are the resolution elements, the span over the FWHM, whatever the pixel size.',
      },
      {
        claim:
          'A wavelength solution with as many lines as coefficients is the best fit.',
        response:
          'It is exactly determined and untestable: with four lines a cubic passes through all of them and there is no residual to warn of a mistake. Five lines test it.',
      },
      {
        claim: 'Air and vacuum wavelengths can be used interchangeably.',
        response:
          'They differ by 84 km/s at H-beta. A velocity needs the observed and the rest wavelength in the same, stated medium.',
      },
      {
        claim: 'The highest resolving power is always the best.',
        response:
          'It costs light, and for a line with a width of its own the signal to noise peaks near the resolving power that matches the line.',
      },
    ],
    teachingNotes: [
      'The spectra are a synthetic model: Gaussian lines through a Gaussian line-spread function of fixed width, integrated over each pixel, with photon and read noise (the Poisson distribution taken as Gaussian above about 20 electrons). SPECTROGRAPH.md holds the validation: analytic checks, the independent numpy, scipy and astropy oracle for the convolution, the line fit and the solution, the coverage ensembles (one-sigma coverage held to a band of 0.60 to 0.76), the refusals, and a leg on SDSS stellar spectra.',
      'The arc lamp is synthetic: the wavelengths are NIST’s (the NIST line list, in air and vacuum, with Prompt 125’s correction), the intensities are invented, and the hidden wavelength solution is a cubic. The panel marks lines in a spread-out order; students choose how many and the degree. The two-line solution in the quantitative depth is the teaching point that its stated uncertainty is only as good as the model: with a straight line it says 92 km/s with 3 km/s and the truth is 120.',
      'The throughput is the long-slit Gaussian-seeing result erf(sqrt(ln 2) R_s / R); no guiding error, no diffraction in the slit, no sky. The star’s flux and the efficiency are teaching values labeled as such; the telescope’s aperture comes from the instrument library.',
      'Inherited limits: a constant-width line-spread function (a slit-limited grating spectrograph), no echelle orders, no flat field, no cosmic rays, no telluric lines; the lamp’s lines closer than 6 FWHM to a neighbor are left out of the marking.',
    ],
    discussion: [
      'Why does a pair 0.5 nm apart need R of 1000 to dip, when the pixels at R = 500 can be made arbitrarily fine?',
      'What does a cubic solution through exactly four lines claim about its own accuracy, and what has it not tested?',
      'If you could only afford a bigger telescope or a better spectrograph, which would let you measure a narrower line, and which a fainter one?',
    ],
    extensions: [
      'Mark 5 lines with a degree-4 solution and read what the panel says.',
      'Change the star’s line to H-delta and compare the velocity and its uncertainty with H-beta.',
    ],
    modelNotes:
      'js/kernels/spectrograph/ (the line-spread function, the solution, the forward model, the line fit, the velocity, the slit trade), js/spectrographField.js, SPECTROGRAPH.md.',
  },
};

const FLOW = {
  'why-two-lines-become-one': [
    {
      from: 'two-lines',
      to: 'smallest-r-predict',
      text: 'Two lines 0.5 nm apart, and the prediction of the smallest resolving power that shows two.',
    },
    {
      from: 'dip-by-r',
      to: 'dip-by-r',
      text: 'The dip at R = 500, 1000 and 2000 (0, 7 and 88 percent), with the Gaussian pair’s 0.85 FWHM as the reference.',
    },
    {
      from: 'finer-pixels',
      to: 'finer-pixels',
      text: 'Finer pixels: one peak at any sampling at R = 500; at R = 1000 only the finer grid shows the dip.',
    },
    {
      from: 'a-blend',
      to: 'resolving-power-and-sampling',
      text: 'The blend a fit calls too wide, and the three numbers named and kept apart: resolving power, sampling, resolution elements.',
    },
  ],
};

const EXPECTATIONS = {
  'why-two-lines-become-one': {
    'dip-by-r':
      'Dips of 0, 7 and 88 percent at R = 500, 1000 and 2000 for lines 0.5 nm apart at 500 nm (the first within 0.5, the second within 0.6, the third within 1).',
    'a-blend':
      'A fitted width about 16 percent above the instrument’s at R = 500 (within 3 points), flagged as broadened.',
    'finer-pixels':
      'One peak at R = 500 with 8 pixels per FWHM; one peak at R = 1000 with 2 pixels per FWHM and two with 8.',
  },
};

const BANDS = {
  'why-two-lines-become-one': {
    core: 'short',
    quantitative: 'long',
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
  'why-two-lines-become-one': WHY_TWO_LINES_BECOME_ONE_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'why-two-lines-become-one': WHY_TWO_LINES_BECOME_ONE_DEEPER,
};
export const DEPTH_ES = {
  'why-two-lines-become-one': WHY_TWO_LINES_BECOME_ONE_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [WHY_TWO_LINES_BECOME_ONE];
