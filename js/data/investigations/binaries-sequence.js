// =============================================================================
// Two Stars Eclipsing (Prompt 217)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: this is the one closure file
// the prompt adds (D-R10-217-02), because the shared sequence files sit at their
// line ceilings. The per-lesson path every loader builds from an id is a one-line
// re-export of a named export here, and the instructor modules read INSTRUCTOR. No
// imports: every number a step states is recomputed in tests/binariesLessons.test.js
// from the instruments (js/eclipseWidgets.js over js/eclipseField.js, the kernel
// js/stellar/binaries.js and the inference core). Every step carries a `sid`, an
// opaque stable id that student progress is keyed by.
//
// Every data set is synthetic and says so, with its truth stated in the panel. The
// model is two spheres on a Kepler orbit and nothing else (BINARIES.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'The hotter star', teffK: 6500, lumSun: 2 },
    { role: 'star', name: 'The cooler star', teffK: 5200, lumSun: 0.5 },
  ],
};
/** The curve panel, the survey system (nearly edge on) unless a step sets another. */
const CURVE = (values = {}) => ({
  id: 'eclipse-curve',
  values: {
    rsum: 0.19,
    k: 0.75,
    inc: 89.5,
    J: 0.55,
    ecosw: 0,
    esinw: 0,
    data: 0,
    ...values,
  },
});
/** The fit panel on a data set (0 the unequal pair, 1 the eccentric pair, 2 the grazing pair, 3 the spotted pair). */
const FIT = (values = {}) => ({
  id: 'eclipse-fit',
  values: { dataset: 0, profile: 0, truth: 0, ...values },
});
const ECC = {
  rsum: 0.14,
  k: 0.8,
  inc: 88,
  J: 0.7,
  ecosw: 0.14,
  esinw: 0.1,
  data: 2,
};

export const TWO_STARS_ECLIPSING = {
  id: 'two-stars-eclipsing',
  thumbnail: 'images/investigations/two-stars-eclipsing.webp',
  title: 'Two Stars Eclipsing',
  subtitle:
    'Read two eclipses to tell which star is hotter and which is larger, fit the stars’ sizes as fractions of their orbit, and see what a fit can and cannot fix',
  duration: '12-24 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say which star is hotter from which eclipse is deeper, and which is smaller from which eclipse has a flat bottom',
    'Read the depths of the two eclipses and say what the secondary’s phase says about the orbit',
    'Say why eclipses give radii as fractions of the orbit and not masses',
    'Say that a fit returns a number whether or not the data fix it, and read the panel’s statement of which parameters they do not',
  ],
  steps: [
    {
      sid: 'two-stars-one-orbit',
      stage: STAGE,
      type: 'read',
      title: 'Two stars, one orbit',
      body: `Two stars circle each other every <strong>3.2 days</strong>, seen from so
             nearly the side that each passes in front of the other once an orbit. The
             curve is the light of both against the orbit&rsquo;s phase. At the
             <strong>primary eclipse</strong> star 2 is in front and star 1 is partly
             hidden; half an orbit later star 1 is in front of star 2, the
             <strong>secondary eclipse</strong>. The panel reads off the depth, the
             duration and the shape of the bottom of each.
             \n\nThe stars are a model: two spheres, each darker at its edge, and nothing
             else. Their sizes are in units of the orbit, because a light curve measures
             how long a star takes to cross the other, which is a fraction of the
             orbit.`,
      tool: CURVE(),
    },
    {
      sid: 'which-eclipse-is-deeper',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-two-depths',
      title: 'Which eclipse is deeper?',
      body: `The two eclipses are not equally deep. At the primary eclipse the star
             in front is the smaller one; at the secondary, the larger one is in front.`,
      prompt:
        'The deeper eclipse is the one in which the star hidden is&hellip;',
      options: [
        'The one with the higher surface brightness, the hotter star, because each square arcsecond hidden costs more light',
        'The larger star, because a larger star hides more light',
        'The cooler star, because it is easier to hide',
        'Neither: the two eclipses are always equally deep',
      ],
      answer: 0,
      hints: [
        'Both eclipses hide about the same area of one disk behind the other. What differs is how bright that piece of disk is.',
      ],
      because:
        'The area that overlaps is the same in both eclipses when the orbit is circular, so the light lost is that area times the surface brightness of the star being hidden. The deeper eclipse hides the star with the higher surface brightness: the hotter one. Size decides how much of a star is hidden, not how deep the eclipse is.',
      tool: CURVE(),
    },
    {
      sid: 'the-two-depths',
      stage: STAGE,
      type: 'measure',
      title: 'Read the depths',
      body: `In the panel (<em>no data</em>, the settings it opens with) read the depth of
             the primary and of the secondary eclipse, in percent of the light of the
             pair. The panel also says whether each bottom is flat or curved.`,
      fields: [
        { id: 'p', label: 'Primary eclipse depth', unit: '%', hint: '48.3' },
        { id: 's', label: 'Secondary eclipse depth', unit: '%', hint: '23.0' },
      ],
      validate: v => {
        if (![v.p, v.s].every(Number.isFinite)) return null;
        if (near(v.p, 48.3, 0.6) && near(v.s, 23.0, 0.6)) {
          return {
            level: 'ok',
            message:
              'About 48 and 23 percent. The primary is deeper, so the star hidden at the primary is the one with the higher surface brightness. The secondary is the shallower and its bottom is flat; the primary’s curves.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the two eclipses with no data switched on and the settings the panel opens with: the primary is about 48 percent deep and the secondary about 23.',
        };
      },
      tool: CURVE(),
    },
    {
      sid: 'the-flat-bottom',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A flat bottom',
      body: `The secondary eclipse has a <strong>flat</strong> bottom: the light stops
             falling and stays at one level for a while. The primary&rsquo;s bottom
             <strong>curves</strong>.`,
      prompt: 'What does the flat bottom say?',
      options: [
        'The smaller star went wholly behind the larger one, so for a while the same light is hidden',
        'The cooler star is not pulsating at that moment',
        'The orbit is eccentric',
        'The larger star is the one in front',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'pulse',
          option: 1,
          say: 'Nothing here varies by itself: the model has two steady stars. The shape of the bottom is geometry.',
        },
        {
          id: 'ecc',
          option: 2,
          say: 'Eccentricity moves the secondary away from half an orbit; it does not flatten a bottom.',
        },
        {
          id: 'front',
          option: 3,
          say: 'When the larger star is in front the smaller is hidden: that is the flat one. When the smaller is in front it crosses the larger one’s disk, and the bottom curves because the larger star is darker at its edge.',
        },
      ],
      hints: [
        'While the smaller star is entirely behind the larger one, is any more or any less of it hidden?',
      ],
      because:
        'A total eclipse has a flat bottom: the smaller star is entirely hidden for a stretch, and the light lost is all of its light, a constant. The other eclipse is a transit of the smaller star across the larger one: the bottom curves because the star it crosses is brighter in the middle than at its edge. Flat bottom: the star hidden is the smaller. Here that is star 2, which is also the cooler.',
      tool: CURVE(),
    },
    {
      sid: 'half-an-orbit',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Half an orbit apart',
      body: `The panel puts the secondary eclipse at phase <strong>0.5000</strong>: exactly
             half an orbit after the primary.`,
      prompt: 'What does that say about the orbit?',
      options: [
        'It is circular, or so nearly that the timing cannot tell the difference: an eccentric orbit moves the secondary off half an orbit',
        'It is eccentric, because the eclipses are not simultaneous',
        'The two stars have equal masses',
        'The inclination is exactly 90 degrees',
      ],
      answer: 0,
      hints: [
        'On a circular orbit the star spends the same time on each side. What happens to that if the orbit is a stretched oval?',
      ],
      because:
        'On a circular orbit the second eclipse comes exactly half an orbit after the first. On an eccentric one the stars move fast near their closest and slowly near their farthest, so the two eclipses are not half an orbit apart unless the long axis points at us or across. How far the secondary is from half an orbit measures a combination of the eccentricity and the direction of the long axis: e cos w. The deeper steps use it.',
      tool: CURVE(),
    },
    {
      sid: 'what-eclipses-leave-out',
      stage: STAGE,
      type: 'read',
      title: 'What the eclipses do not say',
      body: `From the eclipses alone you have which star is hotter, which is smaller, how
             big each is compared with the orbit, how tilted the orbit is and, from the
             secondary&rsquo;s phase, something about its shape. You do not have a
             <strong>mass</strong>, and you do not have a size in kilometres: the orbit
             itself has no scale in a light curve. Those need the stars&rsquo; speeds,
             which come from their spectra. The deeper steps fit the model to data,
             and say what it can and cannot fix.`,
      tool: CURVE(),
    },
  ],
};

export const TWO_STARS_ECLIPSING_DEEPER = {
  id: 'two-stars-eclipsing',
  steps: [
    {
      sid: 'fit-the-pair',
      after: 'half-an-orbit',
      depth: 'quantitative',
      type: 'measure',
      title: 'Fit the pair',
      body: `The panel fits the model to a synthetic light curve of an unequal pair
             (<em>the unequal pair</em>, 686 points, noise 0.04 percent). Read the
             fractional radii of the two stars, R1/a and R2/a, and the uncertainty of
             R2/a, in units of 0.0001.`,
      fields: [
        { id: 'a', label: 'R1/a', hint: '0.1085' },
        { id: 'b', label: 'R2/a', hint: '0.0814' },
        { id: 'u', label: 'Uncertainty of R2/a', unit: '1e-4', hint: '1.6' },
      ],
      validate: v => {
        if (![v.a, v.b, v.u].every(Number.isFinite)) return null;
        if (
          near(v.a, 0.1085, 0.0004) &&
          near(v.b, 0.0814, 0.0004) &&
          near(v.u, 1.6, 0.5)
        ) {
          return {
            level: 'ok',
            message:
              'R1/a = 0.1085 and R2/a = 0.0814, the second known to about 0.00016, 0.2 percent. These are the values the model that made the data was given (0.1086 and 0.0814): the data fix them, and the uncertainty says how well.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the data set “the unequal pair” and read R1/a (0.1085), R2/a (0.0814) and the uncertainty of R2/a in units of 0.0001 (about 1.6).',
        };
      },
      tool: FIT(),
    },
    {
      sid: 'why-fractions',
      after: 'fit-the-pair',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Why fractions of the orbit',
      body: `The fit gives R1/a = 0.1085 and R2/a = 0.0814, not radii in kilometres.`,
      prompt: 'Why can the light curve not give kilometres?',
      options: [
        'The curve records how long each star takes to cross the other as a fraction of the period, which fixes sizes relative to the orbit; the orbit’s own size needs the stars’ speeds',
        'The telescope is not big enough to measure kilometres',
        'The limb darkening hides the size',
        'Kilometres need the distance to the stars, and the model has none',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'aperture',
          option: 1,
          say: 'The same curve from any size of telescope has the same fractions. Sizes in kilometres are missing from the light, not from the instrument.',
        },
        {
          id: 'distance',
          option: 3,
          say: 'A distance would turn an apparent size into a size, but an eclipsing binary’s stars are never resolved. Their sizes come from timing, and timing needs a speed to become a length.',
        },
      ],
      hints: [
        'A star crossing the other for a time t at a speed v covers a distance v t. What does the light curve measure, t or v?',
      ],
      because:
        'The light curve gives times: how long the eclipse lasts and how long the orbit takes. A duration over a period is a length over a circumference, so sizes come out as fractions of the orbit. The orbit’s size in kilometres is the stars’ speeds times the period, and the speeds come from the Doppler shifts of their spectra. With those, a fraction becomes a radius and, with Kepler’s third law, the masses follow. That is the next investigation of this kind.',
      tool: FIT(),
    },
    {
      sid: 'the-residual-test',
      after: 'why-fractions',
      depth: 'quantitative',
      type: 'measure',
      title: 'The residual test',
      body: `Choose <em>the spotted pair</em>: the same stars, but their light also
             rises and falls by 0.3 percent as dark patches turn into view, which the
             model does not have. Read the reduced chi-square and the correlated-noise
             factor the fit reports.`,
      fields: [
        { id: 'c', label: 'Reduced chi-square', hint: '25.6' },
        { id: 'b', label: 'Correlated-noise factor', hint: '1.80' },
      ],
      validate: v => {
        if (![v.c, v.b].every(Number.isFinite)) return null;
        if (near(v.c, 25.6, 1.5) && near(v.b, 1.8, 0.1)) {
          return {
            level: 'ok',
            message:
              'A reduced chi-square near 26 and a factor of 1.8: the scatter is far above the error bars and is correlated in time. The panel says the residual test failed. The unequal pair gave 1.15 and about 1.04.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “the spotted pair” and read the reduced chi-square (about 25.6) and the correlated-noise factor (about 1.80).',
        };
      },
      tool: FIT({ dataset: 3 }),
    },
    {
      sid: 'what-the-spots-did',
      after: 'the-residual-test',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'What the failed test means',
      body: `The fit to the spotted pair returns radii close to the truth, k = 0.758
             against 0.750, with an uncertainty of about 0.013. The residual test failed.`,
      prompt: 'What should you conclude?',
      options: [
        'The model is missing something in the light curve, so the quoted uncertainties are not the whole story and the radii should not be reported as measured to that precision',
        'The radii are right because they are close to the truth',
        'The fit failed, so the numbers are meaningless',
        'The data have too few points',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'close',
          option: 1,
          say: 'You know the truth here only because a model made the data. With a real star you do not, and the test is the only way to learn that the stated uncertainty cannot be trusted.',
        },
        {
          id: 'meaningless',
          option: 2,
          say: 'The numbers are a fit to the part of the curve the model describes, and they are not nonsense. What fails is the claim that the error bars say how far they are from the truth.',
        },
      ],
      hints: [
        'The error bars assume the scatter is only noise. What if part of it is a signal the model has no way to draw?',
      ],
      because:
        'The uncertainty of a fit is correct only if the model describes the data and the scatter is noise. A reduced chi-square of 26 says the scatter is 5 times what the error bars say, and a correlated-noise factor of 1.8 says it varies slowly in time, as a spot does. The fit still scales its error bars up by the square root of the reduced chi-square, but it cannot tell you what it is missing. Check the residuals before quoting the radii.',
      tool: FIT({ dataset: 3 }),
    },
  ].concat([
    {
      sid: 'the-secondary-phase',
      after: 'what-eclipses-leave-out',
      depth: 'advanced',
      type: 'measure',
      title: 'e cos w from the secondary',
      body: `Now an eccentric pair (<em>the eccentric pair</em>, switched on, with the
             model set to the values it was made with). Read the phase of the secondary
             eclipse, then compute e cos w from it to first order:
             <strong>(pi/2) (phase &minus; 0.5)</strong>.`,
      fields: [
        { id: 'p', label: 'Phase of the secondary', hint: '0.5893' },
        { id: 'e', label: 'e cos w, first order', hint: '0.1402' },
      ],
      validate: v => {
        if (![v.p, v.e].every(Number.isFinite)) return null;
        if (near(v.p, 0.5893, 0.0006) && near(v.e, 0.1402, 0.0008)) {
          return {
            level: 'ok',
            message:
              'The secondary falls at phase 0.5893 and the first-order e cos w is 0.1402. The fit’s own value is 0.14004 with an uncertainty of 0.00002: the formula is good to about one part in 700 here, because the correction is of order e squared. Timing is the best-measured thing in a light curve, and e cos w is timing.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the sliders to R sum 0.14, k 0.80, inclination 88, J 0.70, e cos w 0.14, e sin w 0.10 and switch on “the eccentric pair”: the secondary is at phase 0.5893.',
        };
      },
      tool: CURVE(ECC),
    },
    {
      sid: 'why-esinw-is-weaker',
      after: 'the-secondary-phase',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why e sin w is weaker',
      body: `The fit of the eccentric pair gives e cos w = 0.14004 &plusmn; 0.00002 and
             e sin w = 0.0988 &plusmn; 0.0007: the second is about forty times less certain.`,
      prompt: 'Why?',
      options: [
        'e cos w comes from the timing of the secondary, which is measured very precisely; e sin w only from the difference between the two eclipses’ durations, a small difference of two quantities that each carry their own error',
        'e sin w is physically smaller than e cos w',
        'The model has no e sin w term',
        'e sin w needs a spectrum',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'smaller',
          option: 1,
          say: 'Here e sin w is 0.10 and e cos w is 0.14: similar. The difference is in how well the light curve measures them, not in their size.',
        },
        {
          id: 'spectrum',
          option: 3,
          say: 'A velocity curve does constrain e sin w well, which is why a joint fit helps. But the light curve alone does give it, weakly, from the durations.',
        },
      ],
      hints: [
        'Which is easier to measure to one part in ten thousand: the time of a minimum, or the length of an eclipse?',
      ],
      because:
        'The secondary’s time depends on e cos w to first order and is a time of a sharp minimum, measured to a few parts in a hundred thousand of the orbit. e sin w enters through the ratio of the two durations, 1 + 2 e sin w to first order, and each duration is a width, known to a fraction of a percent at best, with limb darkening, k and the inclination all moving it. So e sin w is weaker, and anything the model leaves out (a third body, a wrong limb darkening) moves it as much as the data do.',
      tool: FIT({ dataset: 1 }),
    },
    {
      sid: 'the-grazing-fit',
      after: 'why-esinw-is-weaker',
      depth: 'advanced',
      type: 'measure',
      title: 'A grazing eclipse',
      body: `Choose <em>the grazing pair</em> and switch on <em>profile of the radius
             ratio</em>. In this system the stars barely overlap on the sky: the eclipse is
             a thin lens of light. Read the radius ratio the fit returns and the
             lower end of its profile interval, and see what the panel says.`,
      fields: [
        { id: 'k', label: 'Radius ratio from the fit', hint: '0.162' },
        { id: 'l', label: 'Profile interval, lower end', hint: '0.129' },
      ],
      validate: v => {
        if (![v.k, v.l].every(Number.isFinite)) return null;
        if (near(v.k, 0.162, 0.01) && near(v.l, 0.129, 0.01)) {
          return {
            level: 'ok',
            message:
              'The fit returns k = 0.162, far from the 0.9 that made the data, and the profile is open on the upper side: a radius ratio from about 0.13 up to 0.4 and beyond fits within one unit of chi-square. The panel says k is not constrained. The number is not a measurement.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “the grazing pair”, switch the profile on, and read the radius ratio (0.162) and the lower end of its profile interval (0.129).',
        };
      },
      tool: FIT({ dataset: 2, profile: 1 }),
    },
    {
      sid: 'what-would-help',
      after: 'the-grazing-fit',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What would fix the radius ratio',
      body: `The grazing eclipse leaves the radius ratio open: a larger k with a different
             inclination and sum of radii draws nearly the same thin lens of light.`,
      prompt: 'What would help?',
      options: [
        'An independent measure of the light ratio, from spectra or from the eclipse in a second colour, which ties k down',
        'More points of the same light curve at the same precision',
        'Reporting k with a larger error bar',
        'Choosing the fit that gives the radius ratio nearest 1',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'more',
          option: 1,
          say: 'More points sharpen the valley without breaking it: the stretched direction remains. A direction the light curve does not constrain stays open however many points it has.',
        },
        {
          id: 'bar',
          option: 2,
          say: 'A larger bar on a number that is not a measurement still misleads. Reporting the interval, which is open, or the combinations the data do fix, is the honest form.',
        },
        {
          id: 'one',
          option: 3,
          say: 'Choosing the value you expect uses a prior and calls it a result.',
        },
      ],
      hints: [
        'The data fix one combination of k, the sum of the radii and the inclination, not all three. What fixes another?',
      ],
      because:
        'In a grazing eclipse only part of the smaller star’s disk crosses the larger one, and the shape of the dip depends on the overlap, which many sets of radii and tilts reproduce. A light ratio from the spectra fixes k times the surface brightness ratio, and so ties down k; so does the same eclipse in a second band, which changes the limb darkening and the surface brightness ratio separately. Without one, report what the data fix and say that k is not constrained.',
      tool: FIT({ dataset: 2, profile: 1 }),
    },
  ]),
};

export const TWO_STARS_ECLIPSING_ES = {
  title: 'Dos estrellas que se eclipsan',
  subtitle:
    'Lee dos eclipses para saber qué estrella es más caliente y cuál es mayor, ajusta el tamaño de las estrellas como fracciones de su órbita y mira qué puede y qué no puede fijar un ajuste',
  objectives: [
    'Decir qué estrella es más caliente por cuál eclipse es más profundo, y cuál es menor por cuál eclipse tiene el fondo plano',
    'Leer las profundidades de los dos eclipses y decir qué dice la fase del secundario sobre la órbita',
    'Decir por qué los eclipses dan radios como fracciones de la órbita y no masas',
    'Decir que un ajuste devuelve un número aunque los datos no lo fijen, y leer en el panel qué parámetros no fijan',
  ],
  steps: [
    {
      title: 'Dos estrellas, una órbita',
      body: 'Dos estrellas giran una en torno a la otra cada <strong>3,2 días</strong>, vistas tan de canto que cada una pasa delante de la otra una vez por órbita. La curva es la luz de ambas frente a la fase de la órbita. En el <strong>eclipse primario</strong> la estrella 2 está delante y la 1 queda en parte oculta; media órbita después la estrella 1 está delante de la 2, el <strong>eclipse secundario</strong>. El panel lee la profundidad, la duración y la forma del fondo de cada uno.\n\nLas estrellas son un modelo: dos esferas, cada una más oscura en el borde, y nada más. Sus tamaños están en unidades de la órbita, porque una curva de luz mide cuánto tarda una estrella en cruzar a la otra, que es una fracción de la órbita.',
    },
    {
      title: '¿Qué eclipse es más profundo?',
      body: 'Los dos eclipses no son igual de profundos. En el primario la estrella que está delante es la menor; en el secundario está delante la mayor.',
      prompt:
        'El eclipse más profundo es aquel en que la estrella oculta es&hellip;',
      options: [
        'La de mayor brillo superficial, la más caliente, porque cada segundo de arco cuadrado oculto cuesta más luz',
        'La mayor, porque una estrella mayor oculta más luz',
        'La más fría, porque es más fácil de ocultar',
        'Ninguna: los dos eclipses son siempre igual de profundos',
      ],
      hints: [
        'Los dos eclipses ocultan casi la misma área de un disco tras el otro. Lo que cambia es cuánto brilla ese trozo del disco.',
      ],
      because:
        'El área que se solapa es la misma en los dos eclipses cuando la órbita es circular, así que la luz perdida es esa área por el brillo superficial de la estrella oculta. El eclipse más profundo oculta la estrella de mayor brillo superficial: la más caliente. El tamaño decide cuánto de una estrella se oculta, no cuán profundo es el eclipse.',
    },
    {
      title: 'Lee las profundidades',
      body: 'En el panel (<em>sin datos</em>, con los valores con que se abre) lee la profundidad del eclipse primario y del secundario, en porcentaje de la luz del par. El panel también dice si cada fondo es plano o curvo.',
      fields: [
        { label: 'Profundidad del eclipse primario' },
        { label: 'Profundidad del eclipse secundario' },
      ],
    },
    {
      title: 'Un fondo plano',
      body: 'El eclipse secundario tiene el fondo <strong>plano</strong>: la luz deja de bajar y se queda en un nivel durante un rato. El fondo del primario <strong>se curva</strong>.',
      prompt: '¿Qué dice el fondo plano?',
      options: [
        'La estrella menor pasó por completo detrás de la mayor, así que durante un rato se oculta la misma luz',
        'La estrella más fría no está pulsando en ese momento',
        'La órbita es excéntrica',
        'La estrella mayor es la que está delante',
      ],
      misconceptions: [
        'Aquí nada varía por sí solo: el modelo tiene dos estrellas estables. La forma del fondo es geometría.',
        'La excentricidad aparta el secundario de media órbita; no aplana un fondo.',
        'Cuando la mayor está delante se oculta la menor: ese es el plano. Cuando la menor está delante cruza el disco de la mayor, y el fondo se curva porque la mayor es más oscura en el borde.',
      ],
      hints: [
        'Mientras la estrella menor está entera detrás de la mayor, ¿se oculta más o menos de ella?',
      ],
      because:
        'Un eclipse total tiene el fondo plano: la estrella menor queda oculta entera durante un tramo, y la luz perdida es toda la suya, una constante. El otro eclipse es un tránsito de la menor sobre la mayor: el fondo se curva porque la estrella que cruza es más brillante en el centro que en el borde. Fondo plano: la estrella oculta es la menor. Aquí es la estrella 2, que además es la más fría.',
    },
    {
      title: 'A media órbita',
      body: 'El panel pone el eclipse secundario en la fase <strong>0,5000</strong>: exactamente media órbita después del primario.',
      prompt: '¿Qué dice eso de la órbita?',
      options: [
        'Es circular, o tanto que el momento no distingue la diferencia: una órbita excéntrica aparta el secundario de media órbita',
        'Es excéntrica, porque los eclipses no son simultáneos',
        'Las dos estrellas tienen masas iguales',
        'La inclinación es exactamente de 90 grados',
      ],
      hints: [
        'En una órbita circular la estrella pasa el mismo tiempo a cada lado. ¿Qué cambia si la órbita es un óvalo alargado?',
      ],
      because:
        'En una órbita circular el segundo eclipse llega exactamente media órbita después del primero. En una excéntrica las estrellas van rápido cerca de su máximo acercamiento y despacio cerca de su máxima separación, así que los dos eclipses no distan media órbita salvo que el eje mayor apunte hacia nosotros o de lado. Cuánto se aparta el secundario de media órbita mide una combinación de la excentricidad y la dirección del eje mayor: e cos w. Los pasos más profundos la usan.',
    },
    {
      title: 'Lo que los eclipses no dicen',
      body: 'Solo con los eclipses tienes qué estrella es más caliente, cuál es menor, qué tamaño tiene cada una frente a la órbita, cuánto está inclinada la órbita y, por la fase del secundario, algo de su forma. No tienes una <strong>masa</strong>, ni un tamaño en kilómetros: la órbita misma no tiene escala en una curva de luz. Eso necesita las velocidades de las estrellas, que salen de sus espectros. Los pasos más profundos ajustan el modelo a datos y dicen qué puede y qué no puede fijar.',
    },
  ],
};

export const TWO_STARS_ECLIPSING_DEEPER_ES = {
  steps: [
    {
      title: 'Ajusta el par',
      body: 'El panel ajusta el modelo a una curva de luz sintética de un par desigual (<em>la pareja desigual</em>, 686 puntos, ruido del 0,04 por ciento). Lee los radios fraccionarios de las dos estrellas, R1/a y R2/a, y la incertidumbre de R2/a, en unidades de 0,0001.',
      fields: [
        { label: 'R1/a' },
        { label: 'R2/a' },
        { label: 'Incertidumbre de R2/a' },
      ],
    },
    {
      title: 'Por qué fracciones de la órbita',
      body: 'El ajuste da R1/a = 0,1085 y R2/a = 0,0814, no radios en kilómetros.',
      prompt: '¿Por qué no puede dar kilómetros la curva de luz?',
      options: [
        'La curva registra cuánto tarda cada estrella en cruzar a la otra como fracción del período, lo que fija tamaños relativos a la órbita; el tamaño de la órbita necesita las velocidades de las estrellas',
        'El telescopio no es lo bastante grande para medir kilómetros',
        'El oscurecimiento del limbo oculta el tamaño',
        'Los kilómetros necesitan la distancia a las estrellas, y el modelo no la tiene',
      ],
      misconceptions: [
        'La misma curva de un telescopio de cualquier tamaño tiene las mismas fracciones. Los tamaños en kilómetros faltan en la luz, no en el instrumento.',
        'Una distancia convertiría un tamaño aparente en un tamaño, pero las estrellas de una binaria eclipsante nunca se resuelven. Sus tamaños salen de tiempos, y un tiempo necesita una velocidad para convertirse en longitud.',
      ],
      hints: [
        'Una estrella que cruza a la otra durante un tiempo t a una velocidad v recorre una distancia v t. ¿Qué mide la curva de luz, t o v?',
      ],
      because:
        'La curva de luz da tiempos: cuánto dura el eclipse y cuánto dura la órbita. Una duración sobre un período es una longitud sobre una circunferencia, así que los tamaños salen como fracciones de la órbita. El tamaño de la órbita en kilómetros es la velocidad de las estrellas por el período, y las velocidades salen de los desplazamientos Doppler de sus espectros. Con ellas una fracción se vuelve un radio y, con la tercera ley de Kepler, salen las masas. Eso es la siguiente investigación de este tipo.',
    },
    {
      title: 'La prueba de residuos',
      body: 'Elige <em>la pareja con manchas</em>: las mismas estrellas, pero su luz además sube y baja un 0,3 por ciento al girar a la vista zonas oscuras, algo que el modelo no tiene. Lee el chi cuadrado reducido y el factor de ruido correlacionado que da el ajuste.',
      fields: [
        { label: 'Chi cuadrado reducido' },
        { label: 'Factor de ruido correlacionado' },
      ],
    },
    {
      title: 'Qué significa la prueba no superada',
      body: 'El ajuste de la pareja con manchas da radios cercanos a la verdad, k = 0,758 frente a 0,750, con una incertidumbre de unos 0,013. La prueba de residuos no se superó.',
      prompt: '¿Qué debes concluir?',
      options: [
        'Al modelo le falta algo en la curva de luz, así que las incertidumbres citadas no cuentan toda la historia y los radios no deben darse como medidos con esa precisión',
        'Los radios son correctos porque se acercan a la verdad',
        'El ajuste falló, así que los números no significan nada',
        'Los datos tienen pocos puntos',
      ],
      misconceptions: [
        'Aquí sabes la verdad solo porque un modelo hizo los datos. Con una estrella real no la sabes, y la prueba es la única forma de saber que no se puede confiar en la incertidumbre indicada.',
        'Los números son un ajuste a la parte de la curva que el modelo describe, y no son absurdos. Lo que falla es la afirmación de que las barras de error dicen cuánto se apartan de la verdad.',
      ],
      hints: [
        'Las barras de error suponen que la dispersión es solo ruido. ¿Y si parte de ella es una señal que el modelo no sabe dibujar?',
      ],
      because:
        'La incertidumbre de un ajuste es correcta solo si el modelo describe los datos y la dispersión es ruido. Un chi cuadrado reducido de 26 dice que la dispersión es 5 veces lo que dicen las barras de error, y un factor de ruido correlacionado de 1,8 dice que varía despacio en el tiempo, como una mancha. El ajuste aun así escala sus barras por la raíz cuadrada del chi cuadrado reducido, pero no puede decirte qué le falta. Revisa los residuos antes de dar los radios.',
    },
    {
      title: 'e cos w a partir del secundario',
      body: 'Ahora un par excéntrico (<em>la pareja excéntrica</em>, activada, con el modelo puesto en los valores con que se hizo). Lee la fase del eclipse secundario y calcula e cos w a partir de ella a primer orden: <strong>(pi/2) (fase &minus; 0,5)</strong>.',
      fields: [
        { label: 'Fase del secundario' },
        { label: 'e cos w, primer orden' },
      ],
    },
    {
      title: 'Por qué e sen w es más débil',
      body: 'El ajuste del par excéntrico da e cos w = 0,14004 &plusmn; 0,00002 y e sen w = 0,0988 &plusmn; 0,0007: la segunda es unas cuarenta veces más incierta.',
      prompt: '¿Por qué?',
      options: [
        'e cos w sale del momento del secundario, que se mide con mucha precisión; e sen w solo de la diferencia entre las duraciones de los dos eclipses, una diferencia pequeña de dos cantidades que llevan cada una su error',
        'e sen w es físicamente menor que e cos w',
        'El modelo no tiene término e sen w',
        'e sen w necesita un espectro',
      ],
      misconceptions: [
        'Aquí e sen w vale 0,10 y e cos w 0,14: parecidas. La diferencia está en lo bien que la curva de luz las mide, no en su tamaño.',
        'Una curva de velocidades sí restringe bien e sen w, y por eso ayuda un ajuste conjunto. Pero la curva de luz sola la da, débilmente, por las duraciones.',
      ],
      hints: [
        '¿Qué es más fácil de medir a una parte en diez mil: el momento de un mínimo o la duración de un eclipse?',
      ],
      because:
        'El momento del secundario depende de e cos w a primer orden y es el momento de un mínimo agudo, medido a unas partes en cien mil de la órbita. e sen w entra por el cociente de las dos duraciones, 1 + 2 e sen w a primer orden, y cada duración es un ancho, conocido a una fracción de por ciento en el mejor caso, con el oscurecimiento del limbo, k y la inclinación moviéndolo. Así que e sen w es más débil, y cualquier cosa que el modelo omita (un tercer cuerpo, un oscurecimiento del limbo erróneo) la mueve tanto como los datos.',
    },
    {
      title: 'Un eclipse rasante',
      body: 'Elige <em>la pareja rasante</em> y activa <em>perfil del cociente de radios</em>. En este sistema las estrellas apenas se solapan en el cielo: el eclipse es una lente fina de luz. Lee el cociente de radios que devuelve el ajuste y el extremo inferior de su intervalo de perfil, y mira qué dice el panel.',
      fields: [
        { label: 'Cociente de radios del ajuste' },
        { label: 'Intervalo de perfil, extremo inferior' },
      ],
    },
    {
      title: 'Qué fijaría el cociente de radios',
      body: 'El eclipse rasante deja abierto el cociente de radios: una k mayor con otra inclinación y otra suma de radios dibuja casi la misma lente fina de luz.',
      prompt: '¿Qué ayudaría?',
      options: [
        'Una medida independiente del cociente de luz, de los espectros o del eclipse en un segundo color, que sujeta k',
        'Más puntos de la misma curva de luz con la misma precisión',
        'Dar k con una barra de error mayor',
        'Elegir el ajuste que da el cociente de radios más cercano a 1',
      ],
      misconceptions: [
        'Más puntos afilan el valle sin romperlo: la dirección alargada sigue ahí. Una dirección que la curva de luz no restringe sigue abierta por más puntos que tenga.',
        'Una barra mayor sobre un número que no es una medida sigue engañando. Dar el intervalo, que está abierto, o las combinaciones que los datos sí fijan, es la forma honesta.',
        'Elegir el valor que esperas usa una expectativa previa y la llama resultado.',
      ],
      hints: [
        'Los datos fijan una combinación de k, la suma de los radios y la inclinación, no las tres. ¿Qué fija otra?',
      ],
      because:
        'En un eclipse rasante solo parte del disco de la estrella menor cruza a la mayor, y la forma de la caída depende del solape, que reproducen muchos conjuntos de radios e inclinaciones. Un cociente de luz de los espectros fija k por el cociente de brillos superficiales, y así sujeta k; también lo hace el mismo eclipse en una segunda banda, que cambia por separado el oscurecimiento del limbo y el cociente de brillos superficiales. Sin una de ellas, da lo que los datos fijan y di que k no está restringida.',
    },
  ],
};

const CONTENT = {
  'two-stars-eclipsing': {
    topic:
      'What two eclipses say about a pair of stars: the deeper eclipse hides the hotter star (48.3 and 23.0 percent for the survey system), a flat bottom means the smaller star was hidden, the secondary at phase 0.5000 means a circular orbit; and at depth, a fit of two spheres on a Kepler orbit returns the radii as fractions of the orbit with their uncertainties, a residual test says when the model leaves something out, e cos w comes from the secondary’s phase and e sin w only weakly from the durations, and a grazing eclipse leaves the radius ratio open.',
    difficulty:
      'Introductory (read two eclipses); majors (fit, uncertainties, the residual test); advanced (e cos w, e sin w, the grazing degeneracy)',
    placement:
      'In a survey course with the unit on stellar masses and radii, before the investigation on binary orbits; in a majors course after the exoplanet transit lessons, since the fit is the transit fit with a second light source. It supports OpenStax Astronomy 2e chapter 18 (the stars: a celestial census). It needs no mathematics beyond a ratio at the survey depth.',
    overview:
      'Students predict which eclipse of a pair is deeper and read 48 and 23 percent, say that a flat bottom means the smaller star was hidden and that a secondary at exactly half an orbit means a circular orbit; at depth they read the fitted radii of an unequal pair with their uncertainties, see a spotted pair fail the residual test (reduced chi-square 25.6, correlated-noise factor 1.8), read e cos w from the secondary’s phase of an eccentric pair (0.5893 gives 0.1402), say why e sin w is forty times less certain, and see a grazing eclipse return a radius ratio of 0.16 for stars whose true ratio is 0.9, with the panel saying k is not constrained.',
    priorKnowledge: [
      'A period as the time for one orbit, and a phase as the fraction of it',
      'That a star is darker at its edge than at its centre (limb darkening), at the level of a picture',
      'What a fit is: the model curve that comes closest to the points',
    ],
    keyConcepts: [
      {
        heading: 'The deeper eclipse hides the hotter star',
        body: 'On a circular orbit the two eclipses overlap the same area of the disks, so the light lost is that area times the surface brightness of the star hidden. The deeper eclipse is the one that hides the star with the higher surface brightness.',
      },
      {
        heading: 'Eclipses give radii as fractions of the orbit',
        body: 'Duration over period is a length over a circumference. The orbit’s size in kilometres, and so the masses, need the stars’ velocities from spectra; the light curve alone does not have them.',
      },
      {
        heading:
          'A number from a fit is a measurement only when the data fix it',
        body: 'The fit returns a value for every parameter. The panel says which the data do not fix (a grazing eclipse leaves k open) and whether the residuals pass; the deeper steps read both.',
      },
    ],
    features: [
      {
        name: 'The eclipse panels (eclipse-curve and eclipse-fit)',
        text: 'The light of two spheres with limb darkening on a Kepler orbit through the plot component, with the depth, duration and bottom of each eclipse, the secondary’s phase and light ratio; and the inference core’s fit to a synthetic data set with each parameter’s uncertainty or “not constrained”, the residual test and the profile of the radius ratio.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: fit an unequal pair and read radii as fractions of the orbit, why not kilometres, the residual test on a spotted pair. Advanced: e cos w from the secondary’s phase, why e sin w is weaker, a grazing eclipse and what would fix k.',
      },
      {
        name: 'Synthetic data, stated',
        text: 'Every data set is made by the model with a seeded noise draw; the truth is shown beside the fit when asked. The same model is validated against batman, a brute-force quadrature and closed forms (BINARIES.md).',
      },
    ],
    misconceptions: [
      {
        claim: 'The bigger star makes the deeper eclipse.',
        response:
          'The deeper eclipse is the one that hides the hotter star. A smaller star in front hides less of the larger one but the larger one’s light per area is lower, so the two effects are compared, not assumed.',
      },
      {
        claim: 'An eclipse light curve gives the stars’ masses.',
        response:
          'It gives sizes as fractions of the orbit and the shape of the orbit. Masses need the velocities, from spectra.',
      },
      {
        claim: 'If the fit gives a number, the data measured it.',
        response:
          'A grazing eclipse returns a radius ratio of 0.16 for stars whose ratio is 0.9. The panel says not constrained, and the profile interval is open.',
      },
      {
        claim: 'A fit close to the truth means the model is right.',
        response:
          'The spotted pair’s fit is close to the truth and fails the residual test, which is the only warning a real star would give.',
      },
    ],
    teachingNotes: [
      'The data are synthetic and the truth is stated: the unequal pair has R1/a 0.1086, R2/a 0.0814, k 0.75, inclination 87.6 degrees, J 0.55; the fit returns 0.1085 and 0.0814 within 0.00016.',
      'The model is validated against batman 2.5.1 (maximum difference 2.6e-5 of the flux), a brute-force quadrature, closed forms for depths, contacts and the secondary’s phase, ensembles for coverage, and misspecified systems that must fail the residual test or be flagged not constrained (BINARIES.md).',
      'The convention is Winn (2010): w is the argument of periastron of star 2’s orbit about star 1; the radial-velocity convention adds 180 degrees. The panel and the guide state it.',
      'Inherited limits: no reflection, ellipsoidal light, beaming, spots or third body; limb darkening is fixed from a table; only the spotted pair carries a stated misspecification, and a real star may have several.',
    ],
    discussion: [
      'A system shows two eclipses of equal depth and equal duration. What can you say about the two stars, and what can you not?',
      'Why does a spectroscopic light ratio help a grazing eclipse more than more photometry?',
      'The residual test failed on a real star. List three things the model leaves out that could do it.',
    ],
    extensions: [
      'Set the sliders to k = 1.5 and J = 0.35 and say which eclipse has the flat bottom and why.',
      'Move the inclination down from 90 and say at what value the flat bottom disappears.',
    ],
    modelNotes:
      'js/stellar/binaries.js (the detached two-sphere light curve, the contacts, the identifiability rule), js/inference/binaryModel.js (the fitted model), js/eclipseField.js, js/eclipseWidgets.js, BINARIES.md.',
  },
};

const FLOW = {
  'two-stars-eclipsing': [
    {
      from: 'two-stars-one-orbit',
      to: 'which-eclipse-is-deeper',
      text: 'Two stars on a 3.2-day orbit, and the prediction of which eclipse is deeper before the panel shows it.',
    },
    {
      from: 'the-two-depths',
      to: 'the-two-depths',
      text: 'The depths, 48 and 23 percent, read from the panel and the one number that sets their ratio.',
    },
    {
      from: 'the-flat-bottom',
      to: 'the-flat-bottom',
      text: 'What a flat bottom says: the star hidden is the smaller and wholly behind the larger.',
    },
    {
      from: 'half-an-orbit',
      to: 'what-eclipses-leave-out',
      text: 'A secondary at exactly half an orbit means a circular orbit; what eclipses do not give.',
    },
  ],
};

const EXPECTATIONS = {
  'two-stars-eclipsing': {
    'the-two-depths':
      'The primary eclipse at about 48.3 percent (within 0.6) and the secondary at about 23.0 percent (within 0.6), with the panel’s default values.',
  },
};

const BANDS = {
  'two-stars-eclipsing': {
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
  'two-stars-eclipsing': TWO_STARS_ECLIPSING_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'two-stars-eclipsing': TWO_STARS_ECLIPSING_DEEPER,
};
export const DEPTH_ES = {
  'two-stars-eclipsing': TWO_STARS_ECLIPSING_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [TWO_STARS_ECLIPSING];
