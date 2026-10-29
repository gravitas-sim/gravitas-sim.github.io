// =============================================================================
// Plan an Exposure (Prompt 210)
// -----------------------------------------------------------------------------
// One investigation for a majors course, in one module that also carries its
// Spanish words and its instructor content: the one closure file the prompt adds
// (D-R10-210-02), because the shared sequence files sit at their line ceilings.
// The per-lesson path every loader builds from an id is a one-line re-export of a
// named export here. No imports: every number a step states is recomputed in
// tests/exposureLessons.test.js from the instrument (js/exposureWidgets.js over
// js/kernels/detector/snr.js, planExposure, and the instrument library). Every
// step carries a `sid`, an opaque stable id that student progress is keyed by.
//
// The calculation is a prediction under stated assumptions, never a guarantee;
// the frame is synthetic; the throughput, dark current and (for the Las Cumbres
// telescopes) extinction coefficient are teaching values the library does not
// state, and the instrument says so (EXPOSURE_PLANNING.md).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star to be observed', teffK: 5800, lumSun: 1 },
  ],
};
/** The exposure planner with its controls set: Rubin in r, a 24th-magnitude star, a signal-to-noise of 20, two exposures. */
const EXP = (values = {}) => ({
  id: 'exposure-planner',
  values: {
    setup: 3,
    kind: 0,
    mag: 24,
    aperture: 1.5,
    patch: 3,
    exposures: 2,
    target: 20,
    airmass: 1,
    moon: 0,
    ...values,
  },
});

export const PLAN_AN_EXPOSURE = {
  id: 'plan-an-exposure',
  thumbnail: 'images/investigations/plan-an-exposure.webp',
  title: 'Plan an Exposure',
  subtitle:
    'How long to expose a faint star for a signal-to-noise of 20, what limits it, what splitting it, the air and the moon cost, and what a frame says back',
  duration: '12-22 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['signal-noise-and-exposure'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Plan the exposure that reaches a target signal-to-noise for a star in a stated band, sky and seeing, and name the term of the noise budget that limits it',
    'Say what splitting an exposure into more frames, a higher airmass and a brighter sky cost, and why',
    'Check the plan against a synthetic frame measured with aperture photometry, and say what agreement does and does not show',
    'Say when a target cannot be reached in the exposure limit, and what the calculation leaves out',
  ],
  steps: [
    {
      sid: 'what-a-plan-is',
      stage: STAGE,
      type: 'read',
      title: 'A plan from the equation',
      body: `The <strong>exposure planner</strong> takes a facility from the instrument
             library (here the Rubin Observatory camera in the r band), a target and a
             signal-to-noise to reach, and returns the exposure the CCD equation asks, the
             budget of the noise and the faintest object that exposure reaches. Beside it
             is a <strong>synthetic frame</strong> of exactly that plan, and the
             photometry of that frame.
             \n\nThe values the library states (the pixel scale, the read noise, the sky
             brightness, the seeing) come from its cited table. The ones it does not state
             (the share of the light the system delivers, the dark current) are <strong>teaching
             values</strong>, and the panel lists them as supplied by Gravitas. The
             calculation is a <strong>prediction</strong>: it leaves out flat-field error,
             crowding and the changing sky, and it is not a guarantee.`,
      tool: EXP(),
    },
    {
      sid: 'predict-the-limit',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-plan',
      title: 'What limits a faint star',
      body: `A star of magnitude 24 in the r band, seen from the ground with the
             seeing the library states, is faint but not hopeless for an 8 meter telescope.
             Do not read the planner yet.`,
      prompt:
        'The largest term of the noise budget for this star will be&hellip;',
      options: [
        'The star’s own photons',
        'The sky’s photons in the aperture',
        'The dark current',
        'The read noise of the camera',
      ],
      answer: 1,
      hints: [
        'The star is thousands of times fainter than the sky in a seeing disc of this size.',
      ],
      because:
        'The sky. In the aperture the sky puts out far more light than the star, so the noise is the sky’s shot noise, and the plan is sky-limited. Brighter stars are limited by themselves; the faintest, in short exposures, by the camera.',
      tool: EXP(),
    },
    {
      sid: 'the-plan',
      stage: STAGE,
      type: 'measure',
      title: 'The plan for a signal-to-noise of 20',
      body: `With Rubin in <strong>r</strong>, a magnitude of <strong>24</strong>, a
             target signal-to-noise of <strong>20</strong> and <strong>2</strong>
             exposures, read the <strong>total exposure</strong> and the
             <strong>faintest object (5σ)</strong> that exposure reaches.`,
      fields: [
        { id: 'total', label: 'Total exposure', unit: 's', hint: '455' },
        {
          id: 'limit',
          label: 'Faintest object (5σ)',
          unit: 'mag',
          hint: '25.51',
        },
      ],
      validate: v => {
        if (![v.total, v.limit].every(Number.isFinite)) return null;
        if (near(v.total, 455.3, 8) && near(v.limit, 25.51, 0.05)) {
          return {
            level: 'ok',
            message:
              'About 455 seconds in two exposures, and the same exposure would reach a star of magnitude 25.5 at a signal-to-noise of 5: 1.5 magnitudes fainter than the target, because 20 is four times 5 and the exposure grows as the square of the signal-to-noise. Sky is 96 percent of the noise squared.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the facility to “Rubin, r”, brightness 24, two exposures and a target of 20, then read “Total exposure” and “Faintest object this exposure reaches”.',
        };
      },
      tool: EXP(),
    },
    {
      sid: 'predict-more-exposures',
      stage: STAGE,
      type: 'predict',
      reveal: 'twenty-exposures',
      title: 'Splitting the exposure',
      body: `Keep the same star and target. A telescope often cannot take one long frame:
             the sky saturates the detector, or a cosmic ray ruins it. Suppose the plan is
             split into 20 shorter exposures.`,
      prompt:
        'The total time to reach the same signal-to-noise will be&hellip;',
      options: [
        'Much shorter, because each frame is shorter',
        'The same: the light collected is the same',
        'A little longer, because the camera is read 20 times',
        'Much longer: noise grows with the number of frames',
      ],
      answer: 2,
      hints: [
        'The star and the sky collect light the whole time. What is paid once for every frame?',
      ],
      because:
        'A little longer. The star’s and the sky’s light are collected for the whole time however it is split, but the read noise is paid once per frame, so 20 frames carry 10 times the read noise of 2, and a bit more total time buys the quality back.',
      tool: EXP(),
    },
    {
      sid: 'twenty-exposures',
      stage: STAGE,
      type: 'measure',
      title: 'Twenty exposures',
      body: `Set the exposures to <strong>20</strong> and read the <strong>total
             exposure</strong> and the share of the noise squared that the
             <strong>read noise</strong> now has, in percent.`,
      fields: [
        { id: 'total', label: 'Total exposure', unit: 's', hint: '512' },
        { id: 'read', label: 'Read noise share', unit: '%', hint: '12.5' },
      ],
      validate: v => {
        if (![v.total, v.read].every(Number.isFinite)) return null;
        if (near(v.total, 512, 8) && near(v.read, 12.5, 1.5)) {
          return {
            level: 'ok',
            message:
              '512 seconds against 455: 12 percent longer, and the read noise has gone from 2 percent of the noise squared to 12. Splitting costs read noise and nothing else; it is worth paying when the alternative is a saturated or ruined frame.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the exposures to 20 and read “Total exposure” and the row “Noise budget: the read noise” (its percent).',
        };
      },
      tool: EXP({ exposures: 20 }),
    },
    {
      sid: 'airmass-cost',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'What the air costs',
      body: `Return to 2 exposures. At the zenith the plan takes 455.3 seconds. Set the
             <strong>airmass</strong> to 2 (a star 30 degrees above the horizon): the star is
             dimmed by the extinction the library states for the band and the seeing
             spreads as the airmass to the power 0.6.`,
      prompt:
        'How many times longer is the total exposure at an airmass of 2 than at the zenith',
      unit: '',
      answer: 2.83,
      tolerance: 0.1,
      hints: [
        'Set the airmass to 2, read the total exposure, and divide by 455.3.',
      ],
      worked:
        '1288 ÷ 455.3 = 2.83. Extinction dims the star by 0.13 magnitude, and the blur grows from 0.65 to 0.99 arcsecond, which puts more sky in the aperture: both cost time, the second most of all, which is why surveys avoid high airmass.',
      feedback: {
        close:
          'Close. Divide the exposure at airmass 2 by the one at the zenith.',
        'wrong-order-of-magnitude':
          'A small factor, a few at most: both exposures are hundreds of seconds.',
        off: 'exposure at airmass 2 ÷ exposure at the zenith.',
      },
      tool: EXP({ airmass: 2 }),
    },
    {
      sid: 'the-moon',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'What the moon costs',
      body: `Choose <strong>Las Cumbres 1.0 m, V</strong>, a magnitude of <strong>22</strong>, a
             target of <strong>20</strong> and <strong>1</strong> exposure. Read the total
             exposure with the sky at the library’s dark value, then with the sky
             <strong>2 magnitudes brighter</strong> (a bright moon).`,
      prompt:
        'How many times longer is the exposure with the brighter sky than with the dark one',
      unit: '',
      answer: 5.09,
      tolerance: 0.15,
      hints: [
        'Read 602 seconds at the dark sky, set the sky brighter by 2 magnitudes, read the new total, and divide.',
      ],
      worked:
        '3067 ÷ 602 = 5.09. A sky 2 magnitudes brighter is 6.3 times the light, but the star’s own photons are part of the noise, so the exposure grows by a little less than that.',
      feedback: {
        close: 'Close. Divide the brighter-sky exposure by the dark-sky one.',
        'wrong-order-of-magnitude': 'A factor of a few, between 3 and 7.',
        off: 'exposure with the moon ÷ exposure without it.',
      },
      tool: EXP({ setup: 1, mag: 22, exposures: 1 }),
    },
    {
      sid: 'on-the-frame',
      stage: STAGE,
      type: 'measure',
      title: 'What the frame says back',
      body: `Return to <strong>Rubin, r</strong>, magnitude 24, 2 exposures, a target of 20 and a
             zenith airmass. The frame beside the readout is a synthetic exposure of exactly
             that plan, and its two rows say what the calculation predicts for the frame’s own
             aperture and what aperture photometry <em>measures</em> in it. Read both
             signal-to-noise values.`,
      fields: [
        {
          id: 'predicted',
          label: 'Predicted signal-to-noise',
          unit: '',
          hint: '19.8',
        },
        {
          id: 'measured',
          label: 'Measured signal-to-noise',
          unit: '',
          hint: '19.6',
        },
      ],
      validate: v => {
        if (![v.predicted, v.measured].every(Number.isFinite)) return null;
        if (near(v.predicted, 19.77, 0.3) && near(v.measured, 19.64, 3)) {
          return {
            level: 'ok',
            message:
              'Predicted 19.8 and measured 19.6, against a target of 20: the frame is one draw of the noise, and a measurement of a signal-to-noise of 20 varies by about 1 in 20 from draw to draw, so agreement within a few tenths is what the equation promises, no more. It is not evidence that the equation covers what it leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rows “Predicted for the frame’s own aperture” and “Measured on the frame”: about 19.8 and 19.6 for this plan.',
        };
      },
      tool: EXP(),
    },
    {
      sid: 'cannot-be-reached',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A target the exposure limit forbids',
      body: `Set the brightness to <strong>29</strong>: a star more than a hundred times
             fainter than the 5σ limit of a 455 second exposure. The planner has a limit of four
             hours of exposure.`,
      prompt: 'What does the planner do?',
      options: [
        'It returns a very long exposure, 4 million seconds, as the plan',
        'It says the target is not reachable in the exposure limit, and gives the signal-to-noise four hours reach',
        'It lowers the target signal-to-noise until it fits in four hours',
        'It returns the four hour exposure as the plan, because that is the most allowed',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'long-plan',
          option: 0,
          say: 'The equation does return that number (4.4 million seconds, about 51 days), but a plan nobody can observe is not a plan: the planner refuses and says why.',
        },
        {
          id: 'lowers',
          option: 2,
          say: 'The planner never changes your target. It reports what the limit does reach, 1.1, so you can decide.',
        },
        {
          id: 'cap',
          option: 3,
          say: 'Four hours would reach a signal-to-noise of 1.1, not 20. Returning it as the plan would promise a measurement the exposure cannot make.',
        },
      ],
      hints: [
        'Read the “Result” row. A plan that cannot be made is refused, with the reason.',
      ],
      because:
        'It says the target is not reachable in the exposure limit, and reports the signal-to-noise that four hours reach, about 1.1. Sky-limited exposures grow as the square of the signal-to-noise, so a star this faint needs weeks, and the honest answer is no.',
      tool: EXP({ mag: 29 }),
    },
    {
      sid: 'what-the-plan-leaves-out',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the calculation leaves out',
      body: `Read the last row of the panel, “It leaves out”. A student plans an exposure
             of a very bright star for a signal-to-noise of 500.`,
      prompt: 'What is the right thing to say about that plan?',
      options: [
        'The plan is exact: a signal-to-noise of 500 is just a longer exposure',
        'The calculation promises more than flat fielding can deliver, about 1 percent, so the measurement will not reach 500 however long it exposes',
        'The telescope’s mirror will be damaged by so bright a star',
        'The read noise limits it, so more exposures will fix it',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'exact',
          option: 0,
          say: 'The equation has no flat-field error, so it keeps promising more with time. A real frame is flat-fielded to about one percent, a floor the panel warns about above 100.',
        },
        {
          id: 'read',
          option: 3,
          say: 'For a bright star the read noise is a small term; it is the flat-field error, which the calculation does not have, that sets the floor.',
        },
      ],
      hints: [
        'Look at the warning the panel gives for a high target signal-to-noise.',
      ],
      because:
        'The calculation leaves out flat-field and sky-subtraction error, so for bright stars it keeps promising more with time than a real measurement delivers. The panel warns above a signal-to-noise of 100 (a stated teaching value for flat fielding to about one percent). A prediction is not a guarantee.',
      tool: EXP({ mag: 16, target: 150 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A star of magnitude 24 in the Rubin r band needed about 455 seconds in two
             exposures for a signal-to-noise of 20, sky-limited, and those 455 seconds would
             reach a star of magnitude 25.5 at a signal-to-noise of 5. Twenty exposures cost 12
             percent more time, all of it read noise; an airmass of 2 cost a factor of 2.8; and a
             sky 2 magnitudes brighter, on the 1 m telescope, a factor of 5. A target 5
             magnitudes fainter was refused, with the signal-to-noise four hours would reach.
             The frame agreed with the prediction to a few tenths, which is what one draw of the
             noise allows.
             \n\nThe plan is a <strong>prediction</strong>. It leaves out flat-field and
             sky-subtraction error, crowding and scintillation, and three of its inputs are
             teaching values the library does not state. A real exposure-time calculator adds a
             margin; this one shows where the time goes.`,
      tool: EXP(),
    },
  ],
};

export const PLAN_AN_EXPOSURE_ES = {
  title: 'Planifica una exposición',
  subtitle:
    'Cuánto exponer una estrella débil para una señal a ruido de 20, qué la limita, qué cuestan dividirla, el aire y la Luna, y qué responde una imagen',
  objectives: [
    'Planificar la exposición que alcanza una señal a ruido objetivo para una estrella en una banda, un cielo y un seeing declarados, y nombrar el término del presupuesto de ruido que la limita',
    'Decir qué cuestan dividir una exposición en más imágenes, una masa de aire mayor y un cielo más brillante, y por qué',
    'Comprobar el plan con una imagen sintética medida con fotometría de abertura, y decir qué muestra el acuerdo y qué no',
    'Decir cuándo un objetivo no se alcanza dentro del límite de exposición, y qué omite el cálculo',
  ],
  steps: [
    {
      title: 'Un plan a partir de la ecuación',
      body: 'El <strong>planificador de exposición</strong> toma una instalación de la biblioteca de instrumentos (aquí la cámara del Observatorio Rubin en la banda r), un objetivo y una señal a ruido que alcanzar, y devuelve la exposición que pide la ecuación del CCD, el presupuesto del ruido y el objeto más débil que alcanza esa exposición. A su lado hay una <strong>imagen sintética</strong> de ese mismo plan, y la fotometría de esa imagen.\n\nLos valores que declara la biblioteca (la escala de píxel, el ruido de lectura, el brillo del cielo, el seeing) vienen de su tabla citada. Los que no declara (la parte de la luz que entrega el sistema, la corriente oscura) son <strong>valores didácticos</strong>, y el panel los lista como aportados por Gravitas. El cálculo es una <strong>predicción</strong>: omite el error de aplanado, el apiñamiento y el cielo cambiante, y no es una garantía.',
    },
    {
      title: 'Qué limita una estrella débil',
      body: 'Una estrella de magnitud 24 en la banda r, vista desde el suelo con el seeing que declara la biblioteca, es débil pero no imposible para un telescopio de 8 metros. Todavía no leas el planificador.',
      prompt:
        'El mayor término del presupuesto de ruido para esta estrella será&hellip;',
      options: [
        'Los fotones de la propia estrella',
        'Los fotones del cielo en la abertura',
        'La corriente oscura',
        'El ruido de lectura de la cámara',
      ],
      hints: [
        'La estrella es miles de veces más débil que el cielo en un disco de seeing de este tamaño.',
      ],
      because:
        'El cielo. En la abertura el cielo emite mucha más luz que la estrella, así que el ruido es el ruido de disparo del cielo, y el plan está limitado por el cielo. Las estrellas más brillantes están limitadas por sí mismas; las más débiles, en exposiciones cortas, por la cámara.',
    },
    {
      title: 'El plan para una señal a ruido de 20',
      body: 'Con Rubin en <strong>r</strong>, una magnitud de <strong>24</strong>, una señal a ruido objetivo de <strong>20</strong> y <strong>2</strong> exposiciones, lee la <strong>exposición total</strong> y el <strong>objeto más débil (5σ)</strong> que alcanza esa exposición.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Objeto más débil (5σ)' },
      ],
    },
    {
      title: 'Dividir la exposición',
      body: 'Deja la misma estrella y el mismo objetivo. Un telescopio a menudo no puede tomar una sola imagen larga: el cielo satura el detector o un rayo cósmico la estropea. Supón que el plan se divide en 20 exposiciones más cortas.',
      prompt:
        'El tiempo total para alcanzar la misma señal a ruido será&hellip;',
      options: [
        'Mucho menor, porque cada imagen es más corta',
        'El mismo: la luz recogida es la misma',
        'Algo mayor, porque la cámara se lee 20 veces',
        'Mucho mayor: el ruido crece con el número de imágenes',
      ],
      hints: [
        'La estrella y el cielo recogen luz todo el tiempo. ¿Qué se paga una vez por cada imagen?',
      ],
      because:
        'Algo mayor. La luz de la estrella y del cielo se recoge durante todo el tiempo, se divida como se divida, pero el ruido de lectura se paga una vez por imagen, así que 20 imágenes llevan 10 veces el ruido de lectura de 2, y algo más de tiempo total recupera la calidad.',
    },
    {
      title: 'Veinte exposiciones',
      body: 'Pon las exposiciones en <strong>20</strong> y lee la <strong>exposición total</strong> y la parte del ruido al cuadrado que tiene ahora el <strong>ruido de lectura</strong>, en por ciento.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte del ruido de lectura' },
      ],
    },
    {
      title: 'Lo que cuesta el aire',
      body: 'Vuelve a 2 exposiciones. En el cenit el plan tarda 455,3 segundos. Pon la <strong>masa de aire</strong> en 2 (una estrella a 30 grados sobre el horizonte): la estrella se atenúa con la extinción que declara la biblioteca para la banda y el seeing se ensancha como la masa de aire elevada a 0,6.',
      prompt:
        '¿Cuántas veces mayor es la exposición total con una masa de aire de 2 que en el cenit?',
      hints: [
        'Pon la masa de aire en 2, lee la exposición total y divide entre 455,3.',
      ],
      worked:
        '1288 ÷ 455,3 = 2,83. La extinción atenúa la estrella 0,13 magnitudes, y el desenfoque crece de 0,65 a 0,99 segundos de arco, lo que mete más cielo en la abertura: las dos cosas cuestan tiempo, la segunda más, y por eso los sondeos evitan la masa de aire alta.',
      feedback: {
        close:
          'Casi. Divide la exposición con masa de aire 2 entre la del cenit.',
        'wrong-order-of-magnitude':
          'Un factor pequeño, unos pocos como mucho: las dos exposiciones son de cientos de segundos.',
        off: 'exposición con masa de aire 2 ÷ exposición en el cenit.',
      },
    },
    {
      title: 'Lo que cuesta la Luna',
      body: 'Elige <strong>Las Cumbres 1,0 m, V</strong>, una magnitud de <strong>22</strong>, un objetivo de <strong>20</strong> y <strong>1</strong> exposición. Lee la exposición total con el cielo en el valor oscuro de la biblioteca, y luego con el cielo <strong>2 magnitudes más brillante</strong> (una Luna brillante).',
      prompt:
        '¿Cuántas veces mayor es la exposición con el cielo más brillante que con el oscuro?',
      hints: [
        'Lee 602 segundos con el cielo oscuro, pon el cielo 2 magnitudes más brillante, lee el nuevo total y divide.',
      ],
      worked:
        '3067 ÷ 602 = 5,09. Un cielo 2 magnitudes más brillante es 6,3 veces más luz, pero los fotones de la propia estrella son parte del ruido, así que la exposición crece algo menos que eso.',
      feedback: {
        close:
          'Casi. Divide la exposición con el cielo brillante entre la del cielo oscuro.',
        'wrong-order-of-magnitude': 'Un factor de unos pocos, entre 3 y 7.',
        off: 'exposición con Luna ÷ exposición sin ella.',
      },
    },
    {
      title: 'Lo que responde la imagen',
      body: 'Vuelve a <strong>Rubin, r</strong>, magnitud 24, 2 exposiciones, un objetivo de 20 y masa de aire en el cenit. La imagen junto a la lectura es una exposición sintética de exactamente ese plan, y sus dos filas dicen qué predice el cálculo para la abertura de la propia imagen y qué <em>mide</em> en ella la fotometría de abertura. Lee las dos señales a ruido.',
      fields: [
        { label: 'Señal a ruido predicha' },
        { label: 'Señal a ruido medida' },
      ],
    },
    {
      title: 'Un objetivo que el límite de exposición prohíbe',
      body: 'Pon el brillo en <strong>29</strong>: una estrella más de cien veces más débil que el límite de 5σ de una exposición de 455 segundos. El planificador tiene un límite de cuatro horas de exposición.',
      prompt: '¿Qué hace el planificador?',
      options: [
        'Devuelve una exposición larguísima, de 4 millones de segundos, como plan',
        'Dice que el objetivo no se alcanza dentro del límite de exposición, y da la señal a ruido que alcanzan cuatro horas',
        'Baja la señal a ruido objetivo hasta que quepa en cuatro horas',
        'Devuelve la exposición de cuatro horas como plan, porque es lo máximo permitido',
      ],
      misconceptions: [
        {
          say: 'La ecuación sí da ese número (4,4 millones de segundos, unos 51 días), pero un plan que nadie puede observar no es un plan: el planificador lo rechaza y dice por qué.',
        },
        {
          say: 'El planificador nunca cambia tu objetivo. Informa de lo que alcanza el límite, 1,1, para que decidas tú.',
        },
        {
          say: 'Cuatro horas alcanzarían una señal a ruido de 1,1, no de 20. Devolverlas como plan prometería una medida que la exposición no puede dar.',
        },
      ],
      hints: [
        'Lee la fila «Resultado». Un plan que no se puede hacer se rechaza, con el motivo.',
      ],
      because:
        'Dice que el objetivo no se alcanza dentro del límite de exposición, e informa de la señal a ruido que alcanzan cuatro horas, cerca de 1,1. Las exposiciones limitadas por el cielo crecen como el cuadrado de la señal a ruido, así que una estrella tan débil necesita semanas, y la respuesta honesta es no.',
    },
    {
      title: 'Lo que omite el cálculo',
      body: 'Lee la última fila del panel, «Lo que omite». Un estudiante planifica la exposición de una estrella muy brillante para una señal a ruido de 500.',
      prompt: '¿Qué es lo correcto decir de ese plan?',
      options: [
        'El plan es exacto: una señal a ruido de 500 es solo una exposición más larga',
        'El cálculo promete más de lo que el aplanado puede dar, cerca del 1 por ciento, así que la medida no llegará a 500 por mucho que se exponga',
        'El espejo del telescopio se dañará con una estrella tan brillante',
        'El ruido de lectura lo limita, así que más exposiciones lo arreglarán',
      ],
      misconceptions: [
        {
          say: 'La ecuación no tiene error de aplanado, así que sigue prometiendo más con el tiempo. Una imagen real se aplana a cerca de un uno por ciento, un suelo sobre el que el panel avisa por encima de 100.',
        },
        {
          say: 'Para una estrella brillante el ruido de lectura es un término pequeño; es el error de aplanado, que el cálculo no tiene, el que fija el suelo.',
        },
      ],
      hints: [
        'Mira el aviso que da el panel para una señal a ruido objetivo alta.',
      ],
      because:
        'El cálculo omite el error de aplanado y de resta del cielo, así que para estrellas brillantes sigue prometiendo más con el tiempo de lo que da una medida real. El panel avisa por encima de una señal a ruido de 100 (un valor didáctico declarado para un aplanado de cerca del uno por ciento). Una predicción no es una garantía.',
    },
    {
      title: 'Lo que averiguaste',
      body: 'Una estrella de magnitud 24 en la banda r de Rubin necesitó unos 455 segundos en dos exposiciones para una señal a ruido de 20, limitada por el cielo, y esos 455 segundos alcanzarían una estrella de magnitud 25,5 con una señal a ruido de 5. Veinte exposiciones costaron un 12 por ciento más de tiempo, todo de ruido de lectura; una masa de aire de 2 costó un factor 2,8; y un cielo 2 magnitudes más brillante, en el telescopio de 1 m, un factor 5. Un objetivo 5 magnitudes más débil fue rechazado, con la señal a ruido que alcanzarían cuatro horas. La imagen coincidió con la predicción en unas décimas, lo que permite una realización del ruido.\n\nEl plan es una <strong>predicción</strong>. Omite el error de aplanado y de resta del cielo, el apiñamiento y el centelleo, y tres de sus entradas son valores didácticos que la biblioteca no declara. Un calculador real de tiempos de exposición añade un margen; este muestra adónde va el tiempo.',
    },
  ],
};

const CONTENT = {
  'plan-an-exposure': {
    topic:
      'Planning an exposure with the CCD equation: a 24th-magnitude star in the Rubin r band needs about 455 seconds in two exposures for a signal-to-noise of 20 (sky-limited, 96 percent of the noise squared), twenty exposures cost 12 percent more time in read noise, an airmass of 2 costs a factor of 2.8 and a sky 2 magnitudes brighter a factor of 5 on a 1 m telescope; a target 5 magnitudes fainter is refused; a synthetic frame of the plan is measured with aperture photometry',
    difficulty:
      'Majors (the CCD equation as a planning tool, with the noise budget and its regimes)',
    placement:
      'In a majors observational course after Signal, Noise and Exposure and before photometry of real frames; it supports OpenStax Astronomy 2e chapter 6 and is the planning step of an observing proposal.',
    overview:
      'Students predict what limits a faint star, plan its exposure for a signal-to-noise of 20 on a facility from the instrument library, read the cost of splitting the exposure, of the air and of a brighter sky, check the plan against a synthetic frame measured with aperture photometry, meet a target the exposure limit refuses and name what the calculation leaves out.',
    priorKnowledge: [
      'The CCD equation and its four noise terms (Signal, Noise and Exposure)',
      'Magnitudes and the airmass',
      'What a signal-to-noise of 5 and of 20 mean for a measurement',
    ],
    keyConcepts: [
      {
        heading: 'The exposure grows as the square of the signal-to-noise',
        body: 'Where the sky limits, four times the signal-to-noise costs sixteen times the time, so a star 1.5 magnitudes brighter than the 5σ limit of an exposure reaches 20 in that exposure.',
      },
      {
        heading: 'The read noise is paid once per frame',
        body: 'Splitting an exposure keeps the star’s and the sky’s light and multiplies the read noise: 20 frames cost 12 percent more time here, and the read noise rises from 2 to 12 percent of the noise squared.',
      },
      {
        heading: 'A prediction under stated assumptions',
        body: 'The calculation has no flat-field error, no crowding and no scintillation, and three of its inputs (the throughput, the dark current and, for Las Cumbres, the extinction) are teaching values; above a signal-to-noise of 100 it warns, and a frame measured with the same photometry agrees with it only as one draw of the noise does.',
      },
    ],
    features: [
      {
        name: 'The exposure planner (a lazy family)',
        text: 'A facility from the instrument library, a star or an extended patch, a band, an airmass and a sky: the exposure, its noise budget (a table and a bar), the faintest object it reaches, and a synthetic frame with its predicted and measured signal-to-noise.',
      },
      {
        name: 'Refusals',
        text: 'A target the four-hour limit forbids, a detector that would saturate, no signal and a target below the horizon are refused with the reason, never given as a plan.',
      },
      {
        name: 'Library values and supplied values',
        text: 'The panel lists which numbers come from the cited table and which Gravitas supplies as teaching values.',
      },
    ],
    misconceptions: [
      {
        claim: 'Splitting an exposure into more frames loses nothing.',
        response:
          'It costs read noise once per frame: 12 percent more time for 20 frames here, and much more for a faint star in a dark sky.',
      },
      {
        claim: 'An exposure-time calculator is a guarantee.',
        response:
          'It is a prediction under stated assumptions. It leaves out flat-field error, crowding and the changing sky, and it says so.',
      },
      {
        claim: 'The limiting magnitude belongs to the telescope.',
        response:
          'It belongs to an exposure, a band, a sky and a seeing; the same telescope reaches a different magnitude on a moonlit night.',
      },
      {
        claim: 'A longer exposure can always reach a fainter star.',
        response:
          'Only up to a limit: the planner refuses a target the four-hour limit forbids, and a bright star or a bright sky fills the wells before the exposure is long enough; the plan then needs more, shorter frames.',
      },
    ],
    teachingNotes: [
      'The plan is Prompt 210’s extension of js/kernels/detector/snr.js: the CCD equation with several exposures, a Gaussian point-spread function, extinction by airmass, and a closed-form limiting magnitude. The frame is the detector kernel’s forward model of exactly the plan, measured with the Observatory’s aperture photometry; the prediction for it uses the pixels the photometry used.',
      'The published Rubin depth model agrees with the kernel in r, i, z and y; in u and g, where the read noise matters, the CCD equation with the library’s inputs predicts a larger read-noise loss than the paper states, and the validation record keeps those legs as failed and labeled (EXPOSURE_PLANNING.md).',
      'Inherited limits: the throughput, dark current and (Las Cumbres) extinction are teaching values; the sky is an input, not a moon model; a Gaussian point-spread function; no flat-field error.',
      'The frame is one draw of the noise: a measured signal-to-noise within about 3 of the prediction is agreement, and a class that pools its frames sees the scatter close in on the prediction (the validation record holds the coverage of the interval, 0.95 on 1600 frames).',
    ],
    discussion: [
      'Why does a sky-limited exposure grow as the square of the signal-to-noise and a read-limited one as the signal-to-noise?',
      'When is it worth paying the read noise of more frames?',
      'What would you add to this plan before putting it in a proposal?',
    ],
    extensions: [
      'Plan the same star on Las Cumbres 0.35 m and 1.0 m and say what the aperture buys.',
      'Set an extended patch and find its surface-brightness limit for an exposure.',
    ],
    modelNotes:
      'js/kernels/detector/snr.js (planExposure and its parts), js/instruments/exposure.js (the facility adapter), js/exposureField.js (the frame and its measurement), EXPOSURE_PLANNING.md.',
  },
};

const FLOW = {
  'plan-an-exposure': [
    {
      from: 'what-a-plan-is',
      to: 'the-plan',
      text: 'What a plan is, a prediction of what limits a magnitude-24 star, and the plan: about 455 s in two exposures, sky-limited, reaching 25.5 at 5σ.',
    },
    {
      from: 'predict-more-exposures',
      to: 'twenty-exposures',
      text: 'Splitting the exposure into 20 frames: 512 s, the read noise at 12 percent of the noise squared.',
    },
    {
      from: 'airmass-cost',
      to: 'the-moon',
      text: 'The cost of the air (a factor of 2.8 at an airmass of 2) and of a sky 2 magnitudes brighter (a factor of 5 on a 1 m telescope).',
    },
    {
      from: 'on-the-frame',
      to: 'cannot-be-reached',
      text: 'The frame against the prediction (19.8 and 19.6), and a target the four-hour limit refuses.',
    },
    {
      from: 'what-the-plan-leaves-out',
      to: 'what-you-worked-out',
      text: 'What the calculation leaves out, and the summary of the plan.',
    },
  ],
};

const EXPECTATIONS = {
  'plan-an-exposure': {
    'the-plan':
      'A total exposure of 455.3 s (within 8) and a 5σ limit of 25.51 (within 0.05) for Rubin r, magnitude 24, signal-to-noise 20, two exposures.',
    'twenty-exposures':
      'A total of 512 s (within 8) and a read-noise share of 12.5 percent (within 1.5) with twenty exposures.',
    'on-the-frame':
      'Predicted signal-to-noise 19.77 (within 0.3) and a measured value within 3 of 19.64: one draw of the noise.',
  },
};

const BANDS = {
  'plan-an-exposure': { core: 'short' },
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
  'plan-an-exposure': PLAN_AN_EXPOSURE_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [PLAN_AN_EXPOSURE];
