import { ID_COURSE_PACK } from '../../names.js';
// =============================================================================
// Stellar astrophysics: a majors course package (Prompt 224)
// -----------------------------------------------------------------------------
// A gravitas.course-pack/2 (js/course/pack.js, COURSE_PACKS.md), pinned to the
// investigations as they are now: the stellar unit of an astronomy major, OpenStax
// Astronomy 2e chapters 17 to 23, with the topics Gravitas has no investigation for,
// or whose gate was not passed, listed as readings with the reason (D-R10-224-04).
// Opened as /course/?course=stellar-astrophysics. Teaching material under CC BY 4.0
// like the lessons it orders (LICENSES.md); the Spanish has not been read by a fluent
// speaker.
// =============================================================================

export const STELLAR_ASTROPHYSICS = {
  format: ID_COURSE_PACK,
  formatVersion: 2,
  id: 'stellar-astrophysics',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en', 'es'],
  pinning: 'compatible',
  courseLevel: 'majors',
  title: {
    en: 'Stellar astrophysics',
    es: 'Astrofísica estelar',
    esOf: 'ae11e172',
  },
  summary: {
    en: 'Five units for the stellar part of an astronomy major, with the OpenStax Astronomy 2e chapters they follow (17 to 23): starlight, the census of the stars, distances and variables, evolution, and death. Each unit has the investigations in order, with prerequisites, and the last unit lists the readings for what has no investigation and why.',
    es: 'Cinco unidades para la parte estelar de un grado en astronomía, con los capítulos de OpenStax Astronomy 2e que siguen (17 a 23): la luz de las estrellas, el censo de las estrellas, distancias y variables, evolución y muerte. Cada unidad tiene las investigaciones en orden, con requisitos, y la última unidad enumera las lecturas de lo que no tiene investigación y por qué.',
    esOf: 'd44128d7',
  },
  audience: {
    en: 'Students of astronomy or physics with algebra and logarithms; a course for majors, after a first course.',
    es: 'Estudiantes de astronomía o física con álgebra y logaritmos; un curso para especialistas, después de un primer curso.',
    esOf: '64591b4f',
  },
  teacherGuide: {
    en: 'Run the units in order, beside the chapters. The core path of each investigation is short; the quantitative and advanced depths add a derived number or a limit, and every investigation has an instructor guide and key. The last unit lists what the stellar investigations leave out and why, so it can be assigned as a reading.',
    es: 'Haz las unidades en orden, junto a los capítulos. El camino principal de cada investigación es corto; los niveles cuantitativo y avanzado añaden un número derivado o un límite, y cada investigación tiene notas para el docente y clave. La última unidad enumera lo que las investigaciones estelares dejan fuera y por qué, para poder asignarla como lectura.',
    esOf: 'ea63d544',
  },
  objectives: [
    {
      id: 'light',
      text: {
        en: 'Say what a star’s color and spectrum tell and do not tell: temperature from the pattern of lines, gravity from their width.',
        es: 'Decir qué dicen y qué no dicen el color y el espectro de una estrella: la temperatura por el patrón de líneas, la gravedad por su anchura.',
        esOf: '249cf55e',
      },
    },
    {
      id: 'census',
      text: {
        en: 'Read the HR diagram, weigh stars from orbits and eclipses, and say what a rotation period and a flare record give.',
        es: 'Leer el diagrama HR, pesar estrellas a partir de órbitas y eclipses, y decir qué dan un período de rotación y un registro de erupciones.',
        esOf: '86f3ff1a',
      },
    },
    {
      id: 'distance',
      text: {
        en: 'Use pulsating stars as distance indicators, with the metallicity term and the ways a variable can be mistaken.',
        es: 'Usar las estrellas pulsantes como indicadores de distancia, con el término de metalicidad y las formas en que se puede confundir una variable.',
        esOf: '3cb5429b',
      },
    },
    {
      id: 'evolution',
      text: {
        en: 'Follow a star’s life in numbers and date a cluster by its turnoff, with the metallicity it assumes.',
        es: 'Seguir la vida de una estrella en números y fechar un cúmulo por su punto de giro, con la metalicidad que supone.',
        esOf: 'af429a23',
      },
    },
    {
      id: 'death',
      text: {
        en: 'Say which stars end as white dwarfs, neutron stars or black holes, how uncertain the edges are, and what a collapse releases.',
        es: 'Decir qué estrellas acaban como enanas blancas, estrellas de neutrones o agujeros negros, lo inciertos que son los límites y qué libera un colapso.',
        esOf: '73659acb',
      },
    },
  ],
  prerequisites: [
    {
      text: {
        en: 'Algebra, logarithms and powers of ten; a first course in astronomy.',
        es: 'Álgebra, logaritmos y potencias de diez; un primer curso de astronomía.',
        esOf: '9084f5fe',
      },
    },
  ],
  units: [
    {
      id: 'light',
      title: {
        en: 'Starlight (chapter 17)',
        es: 'La luz de las estrellas (capítulo 17)',
        esOf: '2f1515c3',
      },
      summary: {
        en: 'Color, spectra, and what a line can and cannot say.',
        es: 'Color, espectros, y lo que una línea puede y no puede decir.',
        esOf: '1ae466b1',
      },
      items: [
        {
          id: 'read-ch17',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['light'],
          title: {
            en: 'Astronomy 2e, chapter 17: Analyzing Starlight',
            es: 'Astronomy 2e, capítulo 17: Análisis de la luz estelar (en inglés)',
            esOf: 'eb311606',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Read this before the first investigation if spectra are new.',
            es: 'Léelo antes de la primera investigación si los espectros son nuevos.',
            esOf: '674961ce',
          },
        },
        {
          id: 'color-and-temperature',
          kind: 'lesson',
          lesson: 'color-and-temperature',
          objectives: ['light'],
          pin: {
            fp: '7be525cf',
            n: 11,
          },
        },
        {
          id: 'lines-and-motion',
          kind: 'lesson',
          lesson: 'lines-and-motion',
          objectives: ['light'],
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
          objectives: ['light'],
          needs: ['lines-and-motion'],
          pin: {
            fp: '0bfb78da',
            n: 10,
          },
        },
        {
          id: 'spectra-tell-temperature-and-gravity',
          kind: 'lesson',
          lesson: 'spectra-tell-temperature-and-gravity',
          objectives: ['light'],
          needs: ['what-a-spectrum-is-made-of'],
          pin: {
            fp: 'e9290483',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'census',
      title: {
        en: 'The stars and their properties (chapter 18)',
        es: 'Las estrellas y sus propiedades (capítulo 18)',
        esOf: '561cf9a6',
      },
      summary: {
        en: 'The HR diagram, masses and radii, rotation and flares.',
        es: 'El diagrama HR, masas y radios, rotación y erupciones.',
        esOf: '1e836b61',
      },
      items: [
        {
          id: 'read-ch18',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['census'],
          title: {
            en: 'Astronomy 2e, chapter 18: The Stars: A Celestial Census',
            es: 'Astronomy 2e, capítulo 18: Las estrellas, un censo celeste (en inglés)',
            esOf: '684de37a',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Chapter 18 gives the vocabulary of the diagram.',
            es: 'El capítulo 18 da el vocabulario del diagrama.',
            esOf: 'b749a2b9',
          },
        },
        {
          id: 'a-universe-of-stars',
          kind: 'lesson',
          lesson: 'a-universe-of-stars',
          objectives: ['census'],
          pin: {
            fp: 'b0b1e010',
            n: 37,
          },
        },
        {
          id: 'reading-the-hr-diagram',
          kind: 'lesson',
          lesson: 'reading-the-hr-diagram',
          objectives: ['census'],
          needs: ['a-universe-of-stars'],
          pin: {
            fp: '91797782',
            n: 5,
          },
        },
        {
          id: 'weighing-stars',
          kind: 'lesson',
          lesson: 'weighing-stars',
          objectives: ['census'],
          pin: {
            fp: '5d378d36',
            n: 36,
          },
        },
        {
          id: 'two-stars-eclipsing',
          kind: 'lesson',
          lesson: 'two-stars-eclipsing',
          objectives: ['census'],
          pin: {
            fp: '68c2e569',
            n: 6,
          },
        },
        {
          id: 'weighing-the-stars-for-real',
          kind: 'lesson',
          lesson: 'weighing-the-stars-for-real',
          objectives: ['census'],
          needs: ['two-stars-eclipsing'],
          pin: {
            fp: '5d8b64b3',
            n: 7,
          },
        },
        {
          id: 'how-fast-does-the-star-spin',
          kind: 'lesson',
          lesson: 'how-fast-does-the-star-spin',
          objectives: ['census'],
          pin: {
            fp: '9414aaa3',
            n: 7,
          },
        },
        {
          id: 'flares',
          kind: 'lesson',
          lesson: 'flares',
          objectives: ['census'],
          pin: {
            fp: 'a0309510',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'distance',
      title: {
        en: 'Distances and variable stars (chapter 19)',
        es: 'Distancias y estrellas variables (capítulo 19)',
        esOf: 'c105af4d',
      },
      summary: {
        en: 'Cepheids as a ladder, the metallicity term, and telling variables apart.',
        es: 'Las cefeidas como escalera, el término de metalicidad, y distinguir variables.',
        esOf: 'a9406cce',
      },
      items: [
        {
          id: 'read-ch19',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['distance'],
          title: {
            en: 'Astronomy 2e, chapter 19: Celestial Distances',
            es: 'Astronomy 2e, capítulo 19: Distancias celestes (en inglés)',
            esOf: '3926572d',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Chapter 19 covers the distance ladder this unit’s Cepheids stand on.',
            es: 'El capítulo 19 trata de la escalera de distancias en la que se apoyan las cefeidas de esta unidad.',
            esOf: 'f893b026',
          },
        },
        {
          id: 'the-beat-of-a-star',
          kind: 'lesson',
          lesson: 'the-beat-of-a-star',
          objectives: ['distance'],
          pin: {
            fp: 'c665c968',
            n: 13,
          },
        },
        {
          id: 'leavitts-law',
          kind: 'lesson',
          lesson: 'leavitts-law',
          objectives: ['distance'],
          needs: ['the-beat-of-a-star'],
          pin: {
            fp: '4cb80430',
            n: 8,
          },
        },
        {
          id: 'which-kind-of-variable',
          kind: 'lesson',
          lesson: 'which-kind-of-variable',
          objectives: ['distance'],
          needs: ['the-beat-of-a-star'],
          pin: {
            fp: 'dbb6d7e8',
            n: 9,
          },
        },
        {
          id: 'the-first-rung',
          kind: 'lesson',
          lesson: 'the-first-rung',
          objectives: ['distance'],
          needs: ['leavitts-law'],
          pin: {
            fp: '363c7fb8',
            n: 8,
          },
        },
        {
          id: 'the-metallicity-term',
          kind: 'lesson',
          lesson: 'the-metallicity-term',
          objectives: ['distance'],
          needs: ['leavitts-law', 'the-first-rung'],
          pin: {
            fp: '46b4bb34',
            n: 7,
          },
        },
      ],
    },
    {
      id: 'evolution',
      title: {
        en: 'Stars from birth to old age (chapters 21 and 22)',
        es: 'Las estrellas del nacimiento a la vejez (capítulos 21 y 22)',
        esOf: '0f39d4bf',
      },
      summary: {
        en: 'A star’s life in numbers, its interior, and clusters as clocks.',
        es: 'La vida de una estrella en números, su interior, y los cúmulos como relojes.',
        esOf: 'c9deb7b4',
      },
      items: [
        {
          id: 'read-ch21-22',
          kind: 'reading',
          path: 'intro',
          minutes: 90,
          objectives: ['evolution'],
          title: {
            en: 'Astronomy 2e, chapters 21 and 22: The Birth of Stars and the Discovery of Planets outside the Solar System, and Stars from Adolescence to Old Age',
            es: 'Astronomy 2e, capítulos 21 y 22: El nacimiento de las estrellas y el descubrimiento de planetas fuera del sistema solar, y Estrellas de la adolescencia a la vejez (en inglés)',
            esOf: 'fdb85c83',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Chapter 22 covers the evolution this unit puts into numbers.',
            es: 'El capítulo 22 trata de la evolución que esta unidad pone en números.',
            esOf: 'dce69d4e',
          },
        },
        {
          id: 'lives-of-stars',
          kind: 'lesson',
          lesson: 'lives-of-stars',
          objectives: ['evolution'],
          pin: {
            fp: '584bfc2b',
            n: 35,
          },
        },
        {
          id: 'a-stars-life-in-numbers',
          kind: 'lesson',
          lesson: 'a-stars-life-in-numbers',
          objectives: ['evolution'],
          needs: ['lives-of-stars'],
          pin: {
            fp: '7b5ba5a2',
            n: 6,
          },
        },
        {
          id: 'inside-a-star',
          kind: 'lesson',
          lesson: 'inside-a-star',
          objectives: ['evolution'],
          needs: ['lives-of-stars'],
          pin: {
            fp: 'be2999dd',
            n: 9,
          },
        },
        {
          id: 'scaling-the-main-sequence',
          kind: 'lesson',
          lesson: 'scaling-the-main-sequence',
          objectives: ['evolution'],
          needs: ['inside-a-star'],
          pin: {
            fp: 'e277b2b4',
            n: 10,
          },
        },
        {
          id: 'cluster-membership',
          kind: 'lesson',
          lesson: 'cluster-membership',
          objectives: ['evolution'],
          pin: {
            fp: '32d1e99e',
            n: 11,
          },
        },
        {
          id: 'two-clusters-two-ages',
          kind: 'lesson',
          lesson: 'two-clusters-two-ages',
          objectives: ['evolution'],
          needs: ['lives-of-stars'],
          pin: {
            fp: '3feb1a2d',
            n: 7,
          },
        },
        {
          id: 'populations-i-and-ii',
          kind: 'lesson',
          lesson: 'populations-i-and-ii',
          objectives: ['evolution'],
          needs: ['two-clusters-two-ages'],
          pin: {
            fp: '33a7c309',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'death',
      title: {
        en: 'The death of stars (chapter 23)',
        es: 'La muerte de las estrellas (capítulo 23)',
        esOf: 'f16fe875',
      },
      summary: {
        en: 'White dwarfs, the limit, remnants and explosions.',
        es: 'Enanas blancas, el límite, remanentes y explosiones.',
        esOf: '3ad71422',
      },
      items: [
        {
          id: 'read-ch23',
          kind: 'reading',
          path: 'intro',
          minutes: 60,
          objectives: ['death'],
          title: {
            en: 'Astronomy 2e, chapter 23: The Death of Stars',
            es: 'Astronomy 2e, capítulo 23: La muerte de las estrellas (en inglés)',
            esOf: '8c317343',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Chapter 23 covers the remnants and the explosions.',
            es: 'El capítulo 23 trata de los remanentes y las explosiones.',
            esOf: 'b32ae75c',
          },
        },
        {
          id: 'the-limit',
          kind: 'lesson',
          lesson: 'the-limit',
          objectives: ['death'],
          pin: {
            fp: 'bc570fde',
            n: 9,
          },
        },
        {
          id: 'how-old-is-this-white-dwarf',
          kind: 'lesson',
          lesson: 'how-old-is-this-white-dwarf',
          objectives: ['death'],
          needs: ['the-limit'],
          pin: {
            fp: 'e81502cb',
            n: 7,
          },
        },
        {
          id: 'from-star-to-remnant',
          kind: 'lesson',
          lesson: 'from-star-to-remnant',
          objectives: ['death'],
          needs: ['the-limit'],
          pin: {
            fp: '8c0289af',
            n: 7,
          },
        },
        {
          id: 'when-a-star-explodes',
          kind: 'lesson',
          lesson: 'when-a-star-explodes',
          objectives: ['death'],
          needs: ['from-star-to-remnant'],
          pin: {
            fp: 'fdb2ac9c',
            n: 6,
          },
        },
      ],
    },
    {
      id: 'not-yet',
      title: {
        en: 'Not here yet: readings with the reason (optional)',
        es: 'Aún no está aquí: lecturas con el motivo (opcional)',
        esOf: '731348df',
      },
      summary: {
        en: 'Topics of these chapters that Gravitas does not have an investigation for, each with the reason.',
        es: 'Temas de estos capítulos para los que Gravitas no tiene una investigación, cada uno con el motivo.',
        esOf: '2766f74f',
      },
      items: [
        {
          id: 'not-yet-visual-binaries',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 18: masses from visual binaries',
            es: 'Astronomy 2e, capítulo 18: masas a partir de binarias visuales (en inglés)',
            esOf: 'b4535de3',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Visual-binary masses need a distance and a photocenter contract that has not been built, so the investigation of binary masses stops at the eclipsing and spectroscopic chain.',
            es: 'Las masas de binarias visuales necesitan una distancia y un contrato de fotocentro que aún no se han construido, así que la investigación de masas de binarias se detiene en la cadena eclipsante y espectroscópica.',
            esOf: '9a7efd07',
          },
        },
        {
          id: 'not-yet-asteroseismology',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 22: oscillations and the interiors of stars',
            es: 'Astronomy 2e, capítulo 22: oscilaciones e interiores de las estrellas (en inglés)',
            esOf: 'db49703c',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'The seismology gate returned a reading step: the background and the oscillation scale did not cover on the test spectra, so no mass or radius is derived from oscillations.',
            es: 'La puerta de sismología devolvió un paso de lectura: el fondo y la escala de oscilación no cubrieron en los espectros de prueba, así que no se deriva masa ni radio de las oscilaciones.',
            esOf: '66e89040',
          },
        },
        {
          id: 'not-yet-activity-ages',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 18: stellar rotation, age and flare energy',
            es: 'Astronomy 2e, capítulo 18: rotación estelar, edad y energía de las erupciones (en inglés)',
            esOf: '43c9288d',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'Rotation periods and flare rates are in the investigations; ages from rotation and flare energies did not pass their gate and are not given.',
            es: 'Los períodos de rotación y las tasas de erupciones están en las investigaciones; las edades por rotación y las energías de las erupciones no pasaron su puerta y no se dan.',
            esOf: '7e1da53d',
          },
        },
        {
          id: 'not-yet-four-parameter-clusters',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 22: fitting a cluster’s age, distance, metallicity and reddening together',
            es: 'Astronomy 2e, capítulo 22: ajustar juntos la edad, la distancia, la metalicidad y el enrojecimiento de un cúmulo (en inglés)',
            esOf: 'f176a20d',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'The cluster fit takes the metallicity as stated; the four-parameter fit did not pass its gate.',
            es: 'El ajuste de cúmulos toma la metalicidad como dada; el ajuste de cuatro parámetros no pasó su puerta.',
            esOf: 'e9fe4a4b',
          },
        },
        {
          id: 'not-yet-supernova-light-curves',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 23: supernova light curves',
            es: 'Astronomy 2e, capítulo 23: curvas de luz de supernovas (en inglés)',
            esOf: '084ea817',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'No public supernova light curve has a recorded rights decision for redistribution here, so the explosion investigation works from the progenitor and the energy bound.',
            es: 'Ninguna curva de luz pública de supernova tiene una decisión de derechos registrada para redistribuirla aquí, así que la investigación de la explosión parte del progenitor y de la cota de energía.',
            esOf: '26f1ec3d',
          },
        },
        {
          id: 'not-yet-population-kinematics',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 22: the motions of the disc and halo populations',
            es: 'Astronomy 2e, capítulo 22: los movimientos de las poblaciones del disco y del halo (en inglés)',
            esOf: '27b1126f',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'The metallicity half of the two populations is in an investigation; the motion half needs a sample of stars with velocities and metallicities that no panel carries yet.',
            es: 'La mitad de metalicidad de las dos poblaciones está en una investigación; la mitad de movimiento necesita una muestra de estrellas con velocidades y metalicidades que ningún panel tiene aún.',
            esOf: '51f18323',
          },
        },
        {
          id: 'not-yet-variable-classifier',
          kind: 'reading',
          path: 'advanced',
          minutes: 30,
          title: {
            en: 'Astronomy 2e, chapter 19: classifying variables by machine',
            es: 'Astronomy 2e, capítulo 19: clasificar variables con una máquina (en inglés)',
            esOf: '535bc9c0',
          },
          cite: {
            authors:
              'Andrew Fraknoi, David Morrison, Sidney C. Wolff and others',
            year: 2022,
            source: 'OpenStax, Rice University',
            url: 'https://openstax.org/details/books/astronomy-2e',
          },
          license: 'CC BY 4.0',
          access: 'open',
          studentNote: {
            en: 'A classifier needs independently labeled examples; the gate returned a version in which the student classifies by features.',
            es: 'Un clasificador necesita ejemplos etiquetados de forma independiente; la puerta devolvió una versión en la que el estudiante clasifica por rasgos.',
            esOf: '7461c4ae',
          },
        },
      ],
    },
  ],
};
