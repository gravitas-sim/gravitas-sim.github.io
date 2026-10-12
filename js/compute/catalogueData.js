// =============================================================================
// What each reviewed notebook reads and returns, written by hand
// -----------------------------------------------------------------------------
// The hand-written half of the catalogue (./catalogue.js adds the hashes that
// tools/compute.mjs writes). See that file for what an entry is.
// Pure data, no DOM.
// =============================================================================

const PYODIDE = {
  text: 'Pyodide: Python compiled to WebAssembly (pyodide.org)',
  url: 'https://pyodide.org',
};
const NUMPY = {
  text: 'Harris et al. 2020, Nature 585, 357 (NumPy)',
  url: 'https://doi.org/10.1038/s41586-020-2649-2',
};
const MATPLOTLIB = {
  text: 'Hunter 2007, Computing in Science & Engineering 9, 90 (Matplotlib)',
  url: 'https://doi.org/10.1109/MCSE.2007.55',
};

export const CATALOGUE_DATA = [
  {
    id: 'transit-times',
    version: 1,
    title: {
      en: 'Transit times from a light curve',
      es: 'Tiempos de tránsito de una curva de luz',
    },
    summary: {
      en: 'Finds each transit of a planet in a time series, times it, and fits the period and the mean depth. Returns the numbers, a table of transits and a folded plot.',
      es: 'Encuentra cada tránsito de un planeta en una serie temporal, lo fecha y ajusta el período y la profundidad media. Devuelve los números, una tabla de tránsitos y un gráfico plegado.',
    },
    note: {
      en: 'Compare its period with the one the Observatory’s box search finds for the same light curve: the two methods are meant to disagree by a little, and by how much is the lesson.',
      es: 'Compara su período con el que encuentra la búsqueda de caja del Observatorio para la misma curva de luz: los dos métodos deben diferir un poco, y cuánto es lo que enseña.',
    },
    notebook: 'compute/notebooks/transit-times.ipynb',
    packages: ['numpy', 'matplotlib'],
    input: {
      name: 'observation',
      format: 'gravitas.observation',
      version: 1,
      kind: 'time-series',
      example: {
        path: 'compute/inputs/tess-hd209458-s56.observation.json',
        title: {
          en: 'HD 209458, TESS sector 56 light curve (the Observatory’s)',
          es: 'HD 209458, curva de luz de TESS del sector 56 (la del Observatorio)',
        },
      },
    },
    params: [
      {
        id: 'sigma',
        label: {
          en: 'Transit threshold (robust standard deviations below the median)',
          es: 'Umbral de tránsito (desviaciones estándar robustas bajo la mediana)',
        },
        min: 3,
        max: 8,
        step: 0.5,
        default: 5,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          { id: 'period', unit: 'd', label: { en: 'Period', es: 'Período' } },
          {
            id: 'epoch',
            unit: 'd',
            label: {
              en: 'Epoch of the first fitted transit',
              es: 'Época del primer tránsito ajustado',
            },
          },
          {
            id: 'depth.mean',
            unit: 'ppm',
            label: { en: 'Mean depth', es: 'Profundidad media' },
          },
          {
            id: 'transits',
            unit: 'count',
            label: { en: 'Transits found', es: 'Tránsitos encontrados' },
          },
        ],
      },
      table: true,
      figure: true,
    },
    expected: [
      { id: 'period', value: 3.52381, tolerance: 0.0005 },
      { id: 'depth.mean', value: 15831, tolerance: 5 },
      { id: 'transits', value: 8, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Knutson et al. 2007, ApJ 655, 564 (the transit of HD 209458 b, the value the Observatory’s guide is checked against)',
        url: 'https://doi.org/10.1086/510111',
      },
      PYODIDE,
      NUMPY,
      MATPLOTLIB,
    ],
  },
  {
    id: 'line-centroid',
    version: 1,
    title: {
      en: 'A spectral line: centroid, width and velocity',
      es: 'Una línea espectral: centroide, ancho y velocidad',
    },
    summary: {
      en: 'Measures one line in a spectrum: its centroid, width at half depth, equivalent width and the Doppler velocity of its centroid, each with an uncertainty from seeded noisy copies. NumPy only, so about half the download of a notebook that plots.',
      es: 'Mide una línea de un espectro: su centroide, el ancho a media profundidad, el ancho equivalente y la velocidad Doppler de su centroide, cada uno con una incertidumbre de copias ruidosas con semilla. Solo NumPy, así que la descarga es casi la mitad que la de un cuaderno que dibuja.',
    },
    note: {
      en: 'Its uncertainties count noise only. Compare the velocity with the redshift the pack records for the star, and say what the difference is made of: the pixel step, the window and the continuum are not in the error bars.',
      es: 'Sus incertidumbres cuentan solo el ruido. Compara la velocidad con el corrimiento al rojo que registra el paquete para la estrella, y di de qué está hecha la diferencia: el paso del píxel, la ventana y el continuo no están en las barras de error.',
    },
    notebook: 'compute/notebooks/line-centroid.ipynb',
    packages: ['numpy'],
    input: {
      name: 'observation',
      format: 'gravitas.observation',
      version: 1,
      kind: 'spectrum',
      example: {
        path: 'compute/inputs/sdss-a-star.observation.json',
        title: {
          en: 'SDSS DR18 spectrum of an A star (the Observatory’s)',
          es: 'Espectro SDSS DR18 de una estrella A (el del Observatorio)',
        },
      },
    },
    params: [
      {
        id: 'rest',
        label: {
          en: 'Rest wavelength (angstroms, vacuum)',
          es: 'Longitud de onda en reposo (angstroms, vacío)',
        },
        min: 1000,
        max: 20000,
        step: 0.01,
        default: 6564.61,
      },
      {
        id: 'halfwidth',
        label: {
          en: 'Window half-width (angstroms)',
          es: 'Semiancho de la ventana (angstroms)',
        },
        min: 10,
        max: 300,
        step: 1,
        default: 60,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'line.centroid',
            unit: 'Angstrom',
            label: { en: 'Centroid', es: 'Centroide' },
          },
          {
            id: 'line.fwhm',
            unit: 'Angstrom',
            label: {
              en: 'Width at half depth',
              es: 'Ancho a media profundidad',
            },
          },
          {
            id: 'line.equivalent-width',
            unit: 'Angstrom',
            label: { en: 'Equivalent width', es: 'Ancho equivalente' },
          },
          {
            id: 'line.depth',
            unit: '',
            label: {
              en: 'Depth below the continuum',
              es: 'Profundidad bajo el continuo',
            },
          },
          {
            id: 'line.velocity',
            unit: 'km/s',
            label: {
              en: 'Velocity of the centroid',
              es: 'Velocidad del centroide',
            },
          },
        ],
      },
      table: true,
      figure: false,
    },
    expected: [
      { id: 'line.centroid', value: 6560.78, tolerance: 0.1 },
      { id: 'line.equivalent-width', value: 8.3, tolerance: 0.1 },
      { id: 'line.velocity', value: -174.9, tolerance: 6 },
    ],
    citations: [
      {
        text: 'Almeida et al. 2023, ApJS 267, 44 (SDSS DR18, the spectrum’s source)',
        url: 'https://doi.org/10.3847/1538-4365/acda98',
      },
      PYODIDE,
      NUMPY,
    ],
  },
  {
    id: 'integrators-compared',
    version: 1,
    title: {
      en: 'Four integrators on one system',
      es: 'Cuatro integradores en un mismo sistema',
    },
    summary: {
      en: 'Integrates a system saved by the Orbital System Builder with explicit Euler, symplectic Euler (Gravitas’s default), velocity Verlet and fourth-order Runge-Kutta at one fixed step, and returns each method’s energy drift as Gravitas’s own readout defines it, with the drift curves and a plot.',
      es: 'Integra un sistema guardado por el Constructor de sistemas orbitales con Euler explícito, Euler simpléctico (el de Gravitas), Verlet de velocidad y Runge-Kutta de cuarto orden con un mismo paso fijo, y devuelve la deriva de energía de cada método tal como la define el indicador de Gravitas, con las curvas de deriva y un gráfico.',
    },
    note: {
      en: 'Open the same system in Gravitas, pick the same integrator and read the Energy tab’s drift after the same time: it is the number this notebook computes for that method. Halve the step and see which methods improve by how much.',
      es: 'Abre el mismo sistema en Gravitas, elige el mismo integrador y lee la deriva de la pestaña Energía después del mismo tiempo: es el número que este cuaderno calcula para ese método. Reduce el paso a la mitad y observa qué métodos mejoran y cuánto.',
    },
    notebook: 'compute/notebooks/integrators-compared.ipynb',
    packages: ['numpy', 'matplotlib'],
    input: {
      name: 'system',
      format: 'gravitas.orbital-system',
      version: 1,
      example: {
        path: 'compute/inputs/kepler-16.gravitas-system.json',
        title: {
          en: 'Kepler-16: two stars and a circumbinary planet (the builder’s template)',
          es: 'Kepler-16: dos estrellas y un planeta circumbinario (la plantilla del constructor)',
        },
      },
    },
    params: [
      {
        id: 'orbits',
        label: {
          en: 'Periods of the widest orbit to integrate',
          es: 'Períodos de la órbita más ancha a integrar',
        },
        min: 1,
        max: 10,
        step: 1,
        default: 3,
      },
      {
        id: 'steps',
        label: {
          en: 'Steps per period of the tightest pair',
          es: 'Pasos por período del par más cercano',
        },
        min: 50,
        max: 1000,
        step: 10,
        default: 500,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'drift.euler',
            unit: '%',
            label: {
              en: 'Energy drift, explicit Euler',
              es: 'Deriva de energía, Euler explícito',
            },
          },
          {
            id: 'drift.symplectic',
            unit: '%',
            label: {
              en: 'Energy drift, symplectic Euler',
              es: 'Deriva de energía, Euler simpléctico',
            },
          },
          {
            id: 'drift.verlet',
            unit: '%',
            label: {
              en: 'Energy drift, velocity Verlet',
              es: 'Deriva de energía, Verlet de velocidad',
            },
          },
          {
            id: 'drift.rk4',
            unit: '%',
            label: {
              en: 'Energy drift, Runge-Kutta 4',
              es: 'Deriva de energía, Runge-Kutta 4',
            },
          },
          {
            id: 'steps',
            unit: 'count',
            label: { en: 'Steps taken', es: 'Pasos dados' },
          },
        ],
      },
      table: true,
      figure: true,
    },
    expected: [
      { id: 'drift.euler', value: 49.7495, tolerance: 0.05 },
      { id: 'drift.symplectic', value: -0.0023168, tolerance: 0.00002 },
      { id: 'drift.verlet', value: 0.00176764, tolerance: 0.00002 },
      { id: 'drift.rk4', value: -6.4726e-8, tolerance: 2e-9 },
      { id: 'steps', value: 10722, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Hairer, Lubich and Wanner 2006, Geometric Numerical Integration, 2nd ed., Springer (the methods and why a symplectic one keeps its energy bounded)',
        url: 'https://doi.org/10.1007/3-540-30666-8',
      },
      {
        text: 'Doyle et al. 2011, Science 333, 1602 (Kepler-16, the example system)',
        url: 'https://doi.org/10.1126/science.1210923',
      },
      PYODIDE,
      NUMPY,
      MATPLOTLIB,
    ],
  },
  {
    id: 'population-at-scale',
    version: 1,
    title: {
      en: 'A population of planets, extended',
      es: 'Una población de planetas, ampliada',
    },
    summary: {
      en: 'Reads an experiment result of planets started at seeded random distances in the Binary Planet Lab, classifies which stayed bound, fits the chance of staying bound with a bootstrap, and extends it to a synthetic population of hundreds of thousands, with every uncertainty.',
      es: 'Lee un resultado de experimento de planetas lanzados a distancias aleatorias con semilla en el Laboratorio de planeta en binaria, clasifica cuáles siguieron ligados, ajusta la probabilidad de seguir ligado con bootstrap y la extiende a una población sintética de cientos de miles, con todas sus incertidumbres.',
    },
    note: {
      en: 'The extension is a prediction from twenty trials and one assumed curve. Change the slope and the cutoff and say which of the three results moves most, and why the interval does not cover the choice of curve.',
      es: 'La ampliación es una predicción a partir de veinte ensayos y una curva supuesta. Cambia la pendiente y el umbral y di cuál de los tres resultados se mueve más, y por qué el intervalo no cubre la elección de la curva.',
    },
    notebook: 'compute/notebooks/population-at-scale.ipynb',
    packages: ['numpy', 'matplotlib'],
    input: {
      name: 'result',
      format: 'gravitas.experiment-result',
      version: 1,
      example: {
        path: 'compute/inputs/binary-planet-population.experiment-result.json',
        title: {
          en: 'Twenty planets of the Binary Planet Lab (an experiment result)',
          es: 'Veinte planetas del Laboratorio de planeta en binaria (un resultado de experimento)',
        },
      },
    },
    params: [
      {
        id: 'slope',
        label: {
          en: 'Power-law slope of the synthetic population (number proportional to the setting to the minus slope)',
          es: 'Pendiente de la ley de potencias de la población sintética (número proporcional al ajuste elevado a menos la pendiente)',
        },
        min: -1,
        max: 3,
        step: 0.5,
        default: 1,
      },
      {
        id: 'size',
        label: {
          en: 'Synthetic planets to draw',
          es: 'Planetas sintéticos a generar',
        },
        min: 10000,
        max: 500000,
        step: 10000,
        default: 200000,
      },
      {
        id: 'cutoff',
        label: {
          en: 'Bound if the mean distance stays within this many starting distances',
          es: 'Ligado si la distancia media se mantiene dentro de este número de distancias iniciales',
        },
        min: 1.5,
        max: 10,
        step: 0.5,
        default: 3,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'a.crit',
            unit: '',
            label: {
              en: 'Setting where the chance of staying bound is one half',
              es: 'Ajuste donde la probabilidad de seguir ligado es un medio',
            },
          },
          {
            id: 'a.width',
            unit: '',
            label: {
              en: 'Width of the transition',
              es: 'Anchura de la transición',
            },
          },
          {
            id: 'bound.sample',
            unit: '',
            label: {
              en: 'Fraction bound in the trials',
              es: 'Fracción ligada en los ensayos',
            },
          },
          {
            id: 'bound.extended',
            unit: '',
            label: {
              en: 'Fraction bound in the synthetic population',
              es: 'Fracción ligada en la población sintética',
            },
          },
          {
            id: 'bound.count',
            unit: 'count',
            label: {
              en: 'Synthetic planets bound',
              es: 'Planetas sintéticos ligados',
            },
          },
          {
            id: 'trials',
            unit: 'count',
            label: { en: 'Trials used', es: 'Ensayos usados' },
          },
        ],
      },
      table: true,
      figure: true,
    },
    expected: [
      { id: 'a.crit', value: 0.255, tolerance: 0.002 },
      { id: 'a.width', value: 0.0166, tolerance: 0.001 },
      { id: 'bound.sample', value: 0.6, tolerance: 0 },
      { id: 'bound.extended', value: 0.596, tolerance: 0.01 },
      { id: 'trials', value: 20, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Efron and Tibshirani 1993, An Introduction to the Bootstrap, Chapman and Hall (the resampling)',
        url: 'https://doi.org/10.1201/9780429246593',
      },
      {
        text: 'Holman and Wiegert 1999, AJ 117, 621 (the stability edge of planets in binaries, the physics the example probes)',
        url: 'https://doi.org/10.1086/300695',
      },
      PYODIDE,
      NUMPY,
      MATPLOTLIB,
    ],
  },
];
