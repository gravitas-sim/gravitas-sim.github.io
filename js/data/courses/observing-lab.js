import { ID_COURSE_PACK } from '../../names.js';
// =============================================================================
// Observational astronomy lab: from a night plan to authentic data
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md), pinned to the
// investigations as they are now. Roadmap II, Prompt 97. Opened as
// /course/?course=observing-lab; tests/coursePack.test.js holds it to the format and
// to a clean audit. Teaching material under CC BY 4.0 like the lessons it
// orders (LICENSES.md); the Spanish has not been reviewed by a native speaker.
// =============================================================================

export const OBSERVING_LAB = {
  format: ID_COURSE_PACK,
  formatVersion: 2,
  id: 'observing-lab',
  version: '1.1.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  courseLevel: 'majors',
  title: {
    en: 'Observational astronomy lab: from a night plan to authentic data',
    es: 'Laboratorio de astronomía observacional: del plan de una noche a datos auténticos',
    esOf: '72e1cf0b',
  },
  summary: {
    en: 'A lab course in how astronomical measurements are made and trusted: plan a night at a telescope, choose an instrument and an exposure, measure spectra, measure a light curve from frames and schedule an observing run, count what a survey misses, and work with real archive data. The detector and exposure investigations use a prepared plan and a table of two dark sites and one survey telescope; no city or moonlight model is claimed.',
    es: 'Un curso de laboratorio sobre cómo se hacen y se confían las mediciones astronómicas: planear una noche en un telescopio, elegir un instrumento y una exposición, medir espectros, medir una curva de luz a partir de imágenes y programar una campaña de observación, contar lo que un sondeo pierde y trabajar con datos reales de archivo. Las investigaciones de detector y exposición usan un plan preparado y una tabla de dos sitios oscuros y un telescopio de sondeo; no se afirma ningún modelo de ciudad ni de luz lunar.',
    esOf: 'b4548343',
  },
  audience: {
    en: 'A second-year or majors observational astronomy lab. Algebra and logarithms; no calculus.',
    es: 'Un laboratorio de astronomía observacional de segundo año o para especialistas. Álgebra y logaritmos; sin cálculo.',
    esOf: 'a86c9c96',
  },
  teacherGuide: {
    en: "Seven units, one lab meeting each, with the quantitative depth of each investigation. The two instrument units follow the sequence Observing and instruments: the detector and the exposure first, then a facility, the sky and a whole night with a prepared plan, ending on the number a measurement reports. Students work with the same data a researcher would open: the datasets are real spectra, a TESS light curve and a cluster observed by SDSS, SEGUE and Gaia. Ask for a lab report from the last unit. The instructor notes and answer keys are in the instructors' portal.",
    es: 'Siete unidades, una sesión de laboratorio cada una, con la profundidad cuantitativa de cada investigación. Las dos unidades de instrumentos siguen la secuencia Observación e instrumentos: primero el detector y la exposición, luego una instalación, el cielo y una noche completa con un plan preparado, hasta el número que informa una medición. Los estudiantes trabajan con los mismos datos que abriría un investigador: espectros reales, una curva de luz de TESS y un cúmulo observado por SDSS, SEGUE y Gaia. Pide un informe de laboratorio de la última unidad. Las notas y las claves están en el portal para docentes.',
    esOf: '41973be7',
  },
  objectives: [
    {
      id: 'instruments',
      text: {
        en: 'Choose an instrument and an exposure for a question, and say what the sky, the detector and the arithmetic do to the number a measurement reports.',
        es: 'Elegir un instrumento y una exposición para una pregunta, y decir qué hacen el cielo, el detector y la aritmética con el número que informa una medición.',
        esOf: '9616c37c',
      },
    },
    {
      id: 'plan',
      text: {
        en: 'Plan an observing night and schedule a run under real constraints.',
        es: 'Planear una noche de observación y programar una campaña con restricciones reales.',
        esOf: '90284b40',
      },
    },
    {
      id: 'spectra',
      text: {
        en: 'Measure a spectrum: temperature from the continuum, speed from a line shift.',
        es: 'Medir un espectro: temperatura a partir del continuo y velocidad a partir del desplazamiento de una línea.',
        esOf: '6ea10a9a',
      },
    },
    {
      id: 'photometry',
      text: {
        en: 'Measure depth, period and noise on a light curve and say how well each is known.',
        es: 'Medir profundidad, período y ruido en una curva de luz y decir con qué precisión se conoce cada uno.',
        esOf: 'c720eb63',
      },
    },
    {
      id: 'selection',
      text: {
        en: 'Say what a survey cannot see and correct a sample for it.',
        es: 'Decir qué no puede ver un sondeo y corregir una muestra por ello.',
        esOf: '1f3421d5',
      },
    },
    {
      id: 'archive',
      text: {
        en: 'Work with real archive data and report what it shows.',
        es: 'Trabajar con datos reales de archivo e informar de lo que muestran.',
        esOf: 'e99efee8',
      },
    },
  ],
  prerequisites: [
    {
      text: {
        en: 'Algebra and logarithms.',
        es: 'Álgebra y logaritmos.',
        esOf: 'f1e986d4',
      },
    },
    {
      text: {
        en: 'Reading and plotting a graph with error bars.',
        es: 'Leer y trazar una gráfica con barras de error.',
        esOf: '5da2701c',
      },
    },
  ],
  units: [
    {
      id: 'planning',
      title: {
        en: 'Planning',
        es: 'Planificación',
        esOf: 'f4a277c4',
      },
      items: [
        {
          id: 'the-turning-sky',
          kind: 'lesson',
          lesson: 'the-turning-sky',
          objectives: ['plan'],
          pin: {
            fp: 'f906a846',
            n: 10,
          },
        },
        {
          id: 'the-sun-through-the-year',
          kind: 'lesson',
          lesson: 'the-sun-through-the-year',
          objectives: ['plan'],
          needs: ['the-turning-sky'],
          pin: {
            fp: '64690989',
            n: 9,
          },
        },
        {
          id: 'plan-a-night',
          kind: 'lesson',
          lesson: 'plan-a-night',
          depth: 'quantitative',
          objectives: ['plan'],
          needs: ['the-sun-through-the-year'],
          pin: {
            fp: '8cb9cfd0',
            n: 10,
          },
        },
        {
          id: 'coordinates-and-time',
          kind: 'lesson',
          lesson: 'coordinates-and-time',
          depth: 'quantitative',
          objectives: ['plan'],
          needs: ['the-turning-sky'],
          pin: {
            fp: '048642ff',
            n: 8,
          },
        },
        {
          id: 'twelve-nights',
          kind: 'lesson',
          lesson: 'twelve-nights',
          objectives: ['plan'],
          pin: {
            fp: '40302168',
            n: 13,
          },
        },
      ],
    },
    {
      id: 'instruments',
      title: {
        en: 'Instruments and exposure',
        es: 'Instrumentos y exposición',
        esOf: '825a4b99',
      },
      items: [
        {
          id: 'what-a-ccd-records',
          kind: 'lesson',
          lesson: 'what-a-ccd-records',
          objectives: ['instruments'],
          pin: {
            fp: 'de636cb4',
            n: 11,
          },
        },
        {
          id: 'what-a-telescope-resolves',
          kind: 'lesson',
          lesson: 'what-a-telescope-resolves',
          objectives: ['instruments'],
          pin: {
            fp: 'f230d249',
            n: 7,
          },
        },
        {
          id: 'signal-noise-and-exposure',
          kind: 'lesson',
          lesson: 'signal-noise-and-exposure',
          depth: 'quantitative',
          objectives: ['instruments'],
          needs: ['what-a-ccd-records'],
          pin: {
            fp: '146dbc90',
            n: 10,
          },
        },
        {
          id: 'plan-an-exposure',
          kind: 'lesson',
          lesson: 'plan-an-exposure',
          objectives: ['instruments'],
          needs: ['signal-noise-and-exposure'],
          pin: {
            fp: 'aa80cd10',
            n: 11,
          },
        },
      ],
    },
    {
      id: 'the-night',
      title: {
        en: 'A night at the telescope',
        es: 'Una noche en el telescopio',
        esOf: '60704854',
      },
      items: [
        {
          id: 'which-instrument-for-which-question',
          kind: 'lesson',
          lesson: 'which-instrument-for-which-question',
          objectives: ['instruments'],
          needs: ['plan-an-exposure'],
          pin: {
            fp: '49d62621',
            n: 10,
          },
        },
        {
          id: 'the-sky-background',
          kind: 'lesson',
          lesson: 'the-sky-background',
          objectives: ['instruments'],
          needs: ['plan-an-exposure'],
          pin: {
            fp: 'ea082093',
            n: 12,
          },
        },
        {
          id: 'counts-to-magnitudes',
          kind: 'lesson',
          lesson: 'counts-to-magnitudes',
          objectives: ['instruments'],
          needs: ['what-a-ccd-records'],
          pin: {
            fp: '4d8c2633',
            n: 6,
          },
        },
        {
          id: 'a-night-at-the-telescope',
          kind: 'lesson',
          lesson: 'a-night-at-the-telescope',
          objectives: ['instruments', 'plan'],
          needs: ['the-sky-background', 'counts-to-magnitudes'],
          teacherNote: {
            en: 'The capstone of the unit: one prepared night, five stations, each handing a number to the next. Run it as a survey would, following the plan; ask students for the five numbers and the assumption most likely to fail on a real night.',
            es: 'El cierre de la unidad: una noche preparada, cinco estaciones, cada una entrega un número a la siguiente. Hazla como lo haría un sondeo, siguiendo el plan; pide los cinco números y el supuesto con más probabilidad de fallar en una noche real.',
            esOf: '3563c0ac',
          },
          pin: {
            fp: '74113e4d',
            n: 11,
          },
        },
        {
          id: 'from-photons-to-a-number',
          kind: 'lesson',
          lesson: 'from-photons-to-a-number',
          depth: 'quantitative',
          objectives: ['instruments'],
          needs: ['a-night-at-the-telescope'],
          pin: {
            fp: '9c414f1d',
            n: 10,
          },
        },
      ],
    },
    {
      id: 'spectra',
      title: {
        en: 'Spectra',
        es: 'Espectros',
        esOf: '350b597f',
      },
      items: [
        {
          id: 'color-and-temperature',
          kind: 'lesson',
          lesson: 'color-and-temperature',
          objectives: ['spectra'],
          pin: {
            fp: '7be525cf',
            n: 11,
          },
        },
        {
          id: 'lines-and-motion',
          kind: 'lesson',
          lesson: 'lines-and-motion',
          depth: 'quantitative',
          objectives: ['spectra'],
          needs: ['color-and-temperature'],
          pin: {
            fp: '26286db2',
            n: 11,
          },
        },
        {
          id: 'what-a-spectrum-is-made-of',
          kind: 'lesson',
          lesson: 'what-a-spectrum-is-made-of',
          depth: 'quantitative',
          objectives: ['spectra'],
          needs: ['lines-and-motion'],
          pin: {
            fp: '0bfb78da',
            n: 10,
          },
        },
        {
          id: 'data-sdss-a',
          kind: 'dataset',
          minutes: 20,
          objectives: ['spectra'],
          dataset: 'sdss-a',
        },
        {
          id: 'data-sdss-k',
          kind: 'dataset',
          minutes: 20,
          objectives: ['spectra'],
          dataset: 'sdss-k',
        },
      ],
    },
    {
      id: 'photometry',
      title: {
        en: 'Photometry and time series',
        es: 'Fotometría y series temporales',
        esOf: '6ffd583d',
      },
      items: [
        {
          id: 'transit-photometry',
          kind: 'lesson',
          lesson: 'transit-photometry',
          depth: 'quantitative',
          objectives: ['photometry'],
          pin: {
            fp: '8908fdd2',
            n: 29,
          },
        },
        {
          id: 'data-tess-light-curve',
          kind: 'dataset',
          minutes: 30,
          objectives: ['photometry'],
          dataset: 'tess-light-curve',
          needs: ['transit-photometry'],
        },
        {
          id: 'radial-velocity',
          kind: 'lesson',
          lesson: 'radial-velocity',
          objectives: ['photometry'],
          needs: ['transit-photometry'],
          pin: {
            fp: '480cbfeb',
            n: 38,
          },
        },
        {
          id: 'detect-this-planet',
          kind: 'lesson',
          lesson: 'detect-this-planet',
          objectives: ['plan', 'photometry'],
          needs: ['transit-photometry', 'radial-velocity'],
          pin: {
            fp: '488c98f2',
            n: 26,
          },
        },
        {
          id: 'design-the-schedule',
          kind: 'lesson',
          lesson: 'design-the-schedule',
          objectives: ['plan'],
          needs: ['radial-velocity', 'detect-this-planet'],
          teacherNote: {
            en: 'This is the observing-plan unit of the course: ask for the schedule as a short written plan.',
            es: 'Esta es la unidad de plan de observación del curso: pide el calendario como un plan escrito breve.',
            esOf: '56275303',
          },
          pin: {
            fp: 'dbbc247b',
            n: 15,
          },
        },
        {
          id: 'the-beat-of-a-star',
          kind: 'lesson',
          lesson: 'the-beat-of-a-star',
          depth: 'quantitative',
          objectives: ['photometry'],
          pin: {
            fp: 'c665c968',
            n: 13,
          },
        },
        {
          id: 'which-kind-of-variable',
          kind: 'lesson',
          path: 'advanced',
          lesson: 'which-kind-of-variable',
          objectives: ['photometry'],
          needs: ['the-beat-of-a-star'],
          pin: {
            fp: 'dbb6d7e8',
            n: 9,
          },
        },
        {
          id: 'a-variable-star-from-frames',
          kind: 'lesson',
          lesson: 'a-variable-star-from-frames',
          objectives: ['photometry'],
          needs: ['transit-photometry'],
          pin: {
            fp: '8f28b4c6',
            n: 8,
          },
        },
        {
          id: 'what-is-in-this-field',
          kind: 'lesson',
          lesson: 'what-is-in-this-field',
          depth: 'quantitative',
          objectives: ['photometry'],
          needs: ['a-variable-star-from-frames'],
          pin: {
            fp: '038434fe',
            n: 10,
          },
        },
      ],
    },
    {
      id: 'selection',
      title: {
        en: 'What a survey misses',
        es: 'Lo que un sondeo no ve',
        esOf: 'f2769576',
      },
      items: [
        {
          id: 'who-gets-counted',
          kind: 'lesson',
          lesson: 'who-gets-counted',
          objectives: ['selection'],
          pin: {
            fp: '4c7a4e9e',
            n: 10,
          },
        },
        {
          id: 'why-the-bright-ones-win',
          kind: 'lesson',
          lesson: 'why-the-bright-ones-win',
          depth: 'quantitative',
          objectives: ['selection'],
          needs: ['who-gets-counted'],
          pin: {
            fp: 'c0751033',
            n: 10,
          },
        },
        {
          id: 'the-completeness-curve',
          kind: 'lesson',
          lesson: 'the-completeness-curve',
          depth: 'quantitative',
          objectives: ['selection'],
          needs: ['why-the-bright-ones-win'],
          pin: {
            fp: '306b2238',
            n: 10,
          },
        },
      ],
    },
    {
      id: 'archive',
      title: {
        en: 'Authentic data',
        es: 'Datos auténticos',
        esOf: 'aaa4ee04',
      },
      items: [
        {
          id: 'lives-of-stars',
          kind: 'lesson',
          lesson: 'lives-of-stars',
          objectives: ['archive'],
          pin: {
            fp: '584bfc2b',
            n: 35,
          },
        },
        {
          id: 'cluster-membership',
          kind: 'lesson',
          lesson: 'cluster-membership',
          depth: 'quantitative',
          objectives: ['archive'],
          needs: ['lives-of-stars'],
          pin: {
            fp: '32d1e99e',
            n: 11,
          },
        },
        {
          id: 'data-ngc2420-photometry',
          kind: 'dataset',
          minutes: 30,
          objectives: ['archive'],
          dataset: 'ngc2420-photometry',
        },
        {
          id: 'data-ngc2420-segue',
          kind: 'dataset',
          minutes: 30,
          objectives: ['archive'],
          dataset: 'ngc2420-segue',
        },
        {
          id: 'data-gaia-ngc2420',
          kind: 'dataset',
          minutes: 30,
          objectives: ['archive'],
          dataset: 'gaia-ngc2420',
          teacherNote: {
            en: 'Gaia data are licensed for non-commercial use; credit ESA/Gaia/DPAC in a report.',
            es: 'Los datos de Gaia tienen licencia de uso no comercial; en un informe, reconoce a ESA/Gaia/DPAC.',
            esOf: '3e401e89',
          },
        },
      ],
    },
  ],
};
