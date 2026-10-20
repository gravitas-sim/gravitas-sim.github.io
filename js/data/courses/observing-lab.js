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
  version: '1.0.0',
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
    en: 'A lab course in how astronomical measurements are made and trusted: plan a night at a telescope, measure spectra, measure a light curve and schedule an observing run, count what a survey misses, and work with real archive data. Detector and noise modeling is not in the investigations yet and is not claimed here.',
    es: 'Un curso de laboratorio sobre cómo se hacen y se confían las mediciones astronómicas: planear una noche en un telescopio, medir espectros, medir una curva de luz y programar una campaña de observación, contar lo que un sondeo pierde y trabajar con datos reales de archivo. El modelado de detectores y ruido aún no está en las investigaciones y no se afirma aquí.',
    esOf: '9b75e257',
  },
  audience: {
    en: 'A second-year or majors observational astronomy lab. Algebra and logarithms; no calculus.',
    es: 'Un laboratorio de astronomía observacional de segundo año o para especialistas. Álgebra y logaritmos; sin cálculo.',
    esOf: 'a86c9c96',
  },
  teacherGuide: {
    en: "Five units, one lab meeting each, with the quantitative depth of each investigation. Students work with the same data a researcher would open: the datasets are real spectra, a TESS light curve and a cluster observed by SDSS, SEGUE and Gaia. Ask for a lab report from the last unit. The instructor notes and answer keys are in the instructors' portal.",
    es: 'Cinco unidades, una sesión de laboratorio cada una, con la profundidad cuantitativa de cada investigación. Los estudiantes trabajan con los mismos datos que abriría un investigador: espectros reales, una curva de luz de TESS y un cúmulo observado por SDSS, SEGUE y Gaia. Pide un informe de laboratorio de la última unidad. Las notas y las claves están en el portal para docentes.',
    esOf: 'c4dc39b5',
  },
  objectives: [
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
