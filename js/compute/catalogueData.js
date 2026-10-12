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
const SCIPY = {
  text: 'Virtanen et al. 2020, Nature Methods 17, 261 (SciPy 1.0)',
  url: 'https://doi.org/10.1038/s41592-019-0686-2',
};
const ASTROPY = {
  text: 'Astropy Collaboration 2022, ApJ 935, 167 (Astropy)',
  url: 'https://doi.org/10.3847/1538-4357/ac7c74',
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
  {
    id: 'refit-transit',
    version: 1,
    title: {
      en: 'Refit a transit with SciPy',
      es: 'Reajustar un tránsito con SciPy',
    },
    summary: {
      en: 'Fits the transit model of the Observatory’s fit panel to a light curve with SciPy’s bounded least squares, and returns the five fitted numbers with their scaled sigmas, the profile intervals of the planet’s size and the impact parameter, and the folded light curve with the fit. The same model, fitted by a different route, to set beside the panel’s own result.',
      es: 'Ajusta a una curva de luz el modelo de tránsito del panel de ajuste del Observatorio con los mínimos cuadrados acotados de SciPy, y devuelve los cinco números ajustados con sus sigmas escalados, los intervalos de perfil del tamaño del planeta y del parámetro de impacto, y la curva de luz plegada con el ajuste. El mismo modelo, ajustado por otro camino, para ponerlo junto al resultado del panel.',
    },
    note: {
      en: 'Fit the same light curve in the Observatory’s fit panel with the same bounds and compare every number. They should agree to a small fraction of a sigma. Where they differ, say which step of the route is responsible: the optimizer, the covariance, or how the profile’s crossing is found.',
      es: 'Ajusta la misma curva de luz en el panel de ajuste del Observatorio con los mismos límites y compara cada número. Deben coincidir en una pequeña fracción de un sigma. Donde difieran, di qué paso del camino es el responsable: el optimizador, la covarianza o cómo se halla el cruce del perfil.',
    },
    notebook: 'compute/notebooks/refit-transit.ipynb',
    packages: ['numpy', 'scipy'],
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
        id: 'limb',
        label: {
          en: 'Fit the limb darkening (1) or hold it at q1 = 0.36, q2 = 0.30 (0)',
          es: 'Ajustar el oscurecimiento del limbo (1) o fijarlo en q1 = 0,36, q2 = 0,30 (0)',
        },
        min: 0,
        max: 1,
        step: 1,
        default: 1,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 't0',
            unit: 'd',
            label: {
              en: 'Epoch of mid-transit',
              es: 'Época del tránsito',
            },
          },
          { id: 'P', unit: 'd', label: { en: 'Period', es: 'Período' } },
          {
            id: 'k',
            unit: '',
            label: {
              en: 'Planet-to-star radius ratio, Rp/R*',
              es: 'Cociente de radios planeta-estrella, Rp/R*',
            },
          },
          {
            id: 'aRs',
            unit: '',
            label: {
              en: 'Orbit size in stellar radii, a/R*',
              es: 'Tamaño de la órbita en radios estelares, a/R*',
            },
          },
          {
            id: 'b',
            unit: '',
            label: { en: 'Impact parameter', es: 'Parámetro de impacto' },
          },
          {
            id: 'k.profile',
            unit: '',
            label: {
              en: 'Rp/R* with its profile interval',
              es: 'Rp/R* con su intervalo de perfil',
            },
          },
          {
            id: 'b.profile',
            unit: '',
            label: {
              en: 'Impact parameter with its profile interval',
              es: 'Parámetro de impacto con su intervalo de perfil',
            },
          },
          {
            id: 'chi2.reduced',
            unit: '',
            label: {
              en: 'Reduced chi-square',
              es: 'Chi cuadrado reducido',
            },
          },
          {
            id: 'points',
            unit: 'count',
            label: { en: 'Points fitted', es: 'Puntos ajustados' },
          },
        ],
      },
      table: true,
      figure: false,
    },
    expected: [
      { id: 't0', value: 2826.78164, tolerance: 0.0005 },
      { id: 'P', value: 3.524541, tolerance: 0.00008 },
      { id: 'k', value: 0.119262, tolerance: 0.0004 },
      { id: 'aRs', value: 9.2096, tolerance: 0.08 },
      { id: 'b', value: 0.43013, tolerance: 0.012 },
      { id: 'chi2.reduced', value: 7.9814, tolerance: 0.05 },
      { id: 'points', value: 1882, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Mandel and Agol 2002, ApJ 580, L171 (the light blocked by a planet crossing a limb-darkened star)',
        url: 'https://doi.org/10.1086/345520',
      },
      {
        text: 'Kipping 2013, MNRAS 435, 2152 (the q1, q2 limb-darkening parameters)',
        url: 'https://doi.org/10.1093/mnras/stt1435',
      },
      {
        text: 'Winn et al. 2008, ApJ 683, 1076 (correlated noise in transit timing and depth, which this notebook does not count)',
        url: 'https://doi.org/10.1086/589737',
      },
      PYODIDE,
      NUMPY,
      SCIPY,
    ],
  },
  {
    id: 'periodograms',
    version: 1,
    title: {
      en: 'Two periodograms of one light curve',
      es: 'Dos periodogramas de una curva de luz',
    },
    summary: {
      en: 'Computes a Lomb-Scargle and a box least squares periodogram of a light curve with Astropy, returns each one’s best period, the box’s epoch, duration, depth and signal-to-noise ratio, how the two periods compare, and a table of both periodograms on one period axis. Says plainly that a periodogram’s period has no error bar.',
      es: 'Calcula un periodograma de Lomb-Scargle y otro de mínimos cuadrados de caja de una curva de luz con Astropy, y devuelve el mejor período de cada uno, la época, duración, profundidad y relación señal-ruido de la caja, cómo se comparan los dos períodos y una tabla de ambos periodogramas en un mismo eje de períodos. Dice claramente que el período de un periodograma no tiene barra de error.',
    },
    note: {
      en: 'Run the Observatory’s box search on the same light curve over the same range and compare its period with the box least squares one here, and then both with the fitted period. Then say why the Lomb-Scargle peak is at about half the planet’s period, and what a period “from a periodogram” can and cannot claim.',
      es: 'Ejecuta la búsqueda de caja del Observatorio sobre la misma curva de luz en el mismo intervalo y compara su período con el de mínimos cuadrados de caja de aquí, y luego ambos con el período ajustado. Después explica por qué el pico de Lomb-Scargle está en cerca de la mitad del período del planeta, y qué puede y qué no puede afirmar un período “de un periodograma”.',
    },
    notebook: 'compute/notebooks/periodograms.ipynb',
    packages: ['numpy', 'astropy'],
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
        id: 'max_period',
        label: {
          en: 'Longest period searched (days)',
          es: 'Período más largo buscado (días)',
        },
        min: 5,
        max: 20,
        step: 1,
        default: 15,
      },
      {
        id: 'max_duration',
        label: {
          en: 'Longest box duration tried (hours)',
          es: 'Duración de caja más larga probada (horas)',
        },
        min: 2,
        max: 8,
        step: 1,
        default: 6,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'ls.period',
            unit: 'd',
            label: {
              en: 'Lomb-Scargle best period',
              es: 'Mejor período de Lomb-Scargle',
            },
          },
          {
            id: 'ls.power',
            unit: '',
            label: {
              en: 'Lomb-Scargle peak power',
              es: 'Potencia del pico de Lomb-Scargle',
            },
          },
          {
            id: 'ls.fap',
            unit: '',
            label: {
              en: 'False-alarm probability of that peak',
              es: 'Probabilidad de falsa alarma de ese pico',
            },
          },
          {
            id: 'bls.period',
            unit: 'd',
            label: {
              en: 'Box least squares best period',
              es: 'Mejor período de mínimos cuadrados de caja',
            },
          },
          {
            id: 'bls.epoch',
            unit: 'd',
            label: {
              en: 'Epoch of the best box',
              es: 'Época de la mejor caja',
            },
          },
          {
            id: 'bls.duration',
            unit: 'h',
            label: { en: 'Box duration', es: 'Duración de la caja' },
          },
          {
            id: 'bls.depth',
            unit: 'ppm',
            label: { en: 'Box depth', es: 'Profundidad de la caja' },
          },
          {
            id: 'bls.snr',
            unit: '',
            label: {
              en: 'Box depth signal-to-noise ratio',
              es: 'Relación señal-ruido de la profundidad de la caja',
            },
          },
          {
            id: 'period.ratio',
            unit: '',
            label: {
              en: 'Lomb-Scargle period over box period',
              es: 'Período de Lomb-Scargle sobre período de caja',
            },
          },
        ],
      },
      table: true,
      figure: false,
    },
    expected: [
      { id: 'ls.period', value: 1.7689, tolerance: 0.01 },
      { id: 'bls.period', value: 3.52396, tolerance: 0.002 },
      { id: 'bls.duration', value: 2.5, tolerance: 0.3 },
      { id: 'bls.depth', value: 14582, tolerance: 400 },
      { id: 'period.ratio', value: 0.502, tolerance: 0.004 },
    ],
    citations: [
      {
        text: 'Lomb 1976, Astrophysics and Space Science 39, 447 (the periodogram for unevenly spaced data)',
        url: 'https://doi.org/10.1007/BF00648343',
      },
      {
        text: 'Scargle 1982, ApJ 263, 835 (its statistics and the false-alarm probability)',
        url: 'https://doi.org/10.1086/160554',
      },
      {
        text: 'Kovacs, Zucker and Mazeh 2002, A&A 391, 369 (box least squares, the method of the Observatory’s box search)',
        url: 'https://doi.org/10.1051/0004-6361:20020802',
      },
      {
        text: 'VanderPlas 2018, ApJS 236, 16 (understanding the Lomb-Scargle periodogram)',
        url: 'https://doi.org/10.3847/1538-4365/aab766',
      },
      PYODIDE,
      NUMPY,
      ASTROPY,
    ],
  },
  {
    id: 'posterior-sampling',
    version: 1,
    title: {
      en: 'Sampling a transit’s posterior',
      es: 'Muestrear la posterior de un tránsito',
    },
    summary: {
      en: 'Samples the posterior of a transit’s planet size and impact parameter with an affine-invariant ensemble sampler written in NumPy alone, checks it against a grid of the same posterior, reports the convergence diagnostics, refuses to report an interval from a run that has not converged, and compares the draws’ central interval with the profile interval of the same two-parameter problem.',
      es: 'Muestrea la posterior del tamaño de un planeta y del parámetro de impacto de un tránsito con un muestreador de conjunto de invariancia afín escrito solo con NumPy, lo compara con una malla de la misma posterior, informa de los diagnósticos de convergencia, se niega a dar un intervalo de una corrida que no ha convergido, y compara el intervalo central de las muestras con el intervalo de perfil del mismo problema de dos parámetros.',
    },
    note: {
      en: 'Only the planet’s size and the impact parameter are free here; the epoch, the period, a/R* and the limb darkening are held fixed. Compare the intervals with the fit panel’s, which refits all of them, and say why these are so much narrower and what that does and does not mean. Then lower the number of steps until the notebook refuses, and read why.',
      es: 'Aquí solo son libres el tamaño del planeta y el parámetro de impacto; la época, el período, a/R* y el oscurecimiento del limbo están fijos. Compara los intervalos con los del panel de ajuste, que reajusta todos ellos, y explica por qué estos son mucho más estrechos y qué significa y qué no significa eso. Luego baja el número de pasos hasta que el cuaderno se niegue, y lee por qué.',
    },
    notebook: 'compute/notebooks/posterior-sampling.ipynb',
    packages: ['numpy'],
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
        id: 'steps',
        label: {
          en: 'Steps per ensemble (the first half is discarded)',
          es: 'Pasos por conjunto (la primera mitad se descarta)',
        },
        min: 1000,
        max: 10000,
        step: 500,
        default: 8000,
      },
      {
        id: 'epoch',
        label: {
          en: 'Epoch of mid-transit held fixed (days, in the light curve’s own time)',
          es: 'Época del tránsito fija (días, en el tiempo propio de la curva de luz)',
        },
        min: 0,
        max: 3000000,
        step: 0.00001,
        default: 2826.78164,
      },
      {
        id: 'period',
        label: {
          en: 'Period held fixed (days)',
          es: 'Período fijo (días)',
        },
        min: 0.5,
        max: 30,
        step: 0.00001,
        default: 3.52454,
      },
      {
        id: 'aRs',
        label: {
          en: 'Orbit size a/R* held fixed',
          es: 'Tamaño de la órbita a/R* fijo',
        },
        min: 3,
        max: 30,
        step: 0.01,
        default: 9.21,
      },
    ],
    outputs: {
      envelope: {
        quantities: [
          {
            id: 'k',
            unit: '',
            label: {
              en: 'Rp/R*, median of the draws with its 68 percent interval',
              es: 'Rp/R*, mediana de las muestras con su intervalo del 68 por ciento',
            },
          },
          {
            id: 'b',
            unit: '',
            label: {
              en: 'Impact parameter, median of the draws with its 68 percent interval',
              es: 'Parámetro de impacto, mediana de las muestras con su intervalo del 68 por ciento',
            },
          },
          {
            id: 'k.profile',
            unit: '',
            label: {
              en: 'Rp/R* with its profile interval (the same two-parameter problem)',
              es: 'Rp/R* con su intervalo de perfil (el mismo problema de dos parámetros)',
            },
          },
          {
            id: 'b.profile',
            unit: '',
            label: {
              en: 'Impact parameter with its profile interval',
              es: 'Parámetro de impacto con su intervalo de perfil',
            },
          },
          {
            id: 'k.width.ratio',
            unit: '',
            label: {
              en: 'Width of the draws’ interval over the profile’s, Rp/R*',
              es: 'Anchura del intervalo de las muestras sobre la del perfil, Rp/R*',
            },
          },
          {
            id: 'b.width.ratio',
            unit: '',
            label: {
              en: 'Width of the draws’ interval over the profile’s, impact parameter',
              es: 'Anchura del intervalo de las muestras sobre la del perfil, parámetro de impacto',
            },
          },
          {
            id: 'grid.offset',
            unit: '',
            label: {
              en: 'Largest gap between the draws’ median and the grid’s, in standard deviations',
              es: 'Mayor diferencia entre la mediana de las muestras y la de la malla, en desviaciones estándar',
            },
          },
          {
            id: 'rhat.max',
            unit: '',
            label: {
              en: 'Largest split R-hat',
              es: 'Mayor R-hat dividido',
            },
          },
          {
            id: 'ess.min',
            unit: 'count',
            label: {
              en: 'Smallest effective sample size',
              es: 'Menor tamaño de muestra efectivo',
            },
          },
          {
            id: 'tau.max',
            unit: 'count',
            label: {
              en: 'Longest autocorrelation time (steps)',
              es: 'Mayor tiempo de autocorrelación (pasos)',
            },
          },
          {
            id: 'acceptance',
            unit: '',
            label: {
              en: 'Acceptance fraction',
              es: 'Fracción de aceptación',
            },
          },
          {
            id: 'chi2.reduced',
            unit: '',
            label: {
              en: 'Reduced chi-square used as the likelihood’s scale',
              es: 'Chi cuadrado reducido usado como escala de la verosimilitud',
            },
          },
          {
            id: 'steps',
            unit: 'count',
            label: { en: 'Steps per ensemble', es: 'Pasos por conjunto' },
          },
        ],
      },
      table: true,
      figure: false,
    },
    expected: [
      { id: 'k', value: 0.119262, tolerance: 0.0003 },
      { id: 'b', value: 0.4301, tolerance: 0.008 },
      { id: 'k.width.ratio', value: 1, tolerance: 0.15 },
      { id: 'b.width.ratio', value: 1, tolerance: 0.15 },
      { id: 'grid.offset', value: 0, tolerance: 0.15 },
      { id: 'rhat.max', value: 1.01, tolerance: 0.04 },
      { id: 'acceptance', value: 0.72, tolerance: 0.1 },
      { id: 'chi2.reduced', value: 7.9814, tolerance: 0.05 },
      { id: 'steps', value: 8000, tolerance: 0 },
    ],
    citations: [
      {
        text: 'Goodman and Weare 2010, Communications in Applied Mathematics and Computational Science 5, 65 (the affine-invariant ensemble sampler)',
        url: 'https://doi.org/10.2140/camcos.2010.5.65',
      },
      {
        text: 'Foreman-Mackey et al. 2013, PASP 125, 306 (emcee, and the parallel half-step form used here)',
        url: 'https://doi.org/10.1086/670067',
      },
      {
        text: 'Vehtari et al. 2021, Bayesian Analysis 16, 667 (the split R-hat)',
        url: 'https://doi.org/10.1214/20-BA1221',
      },
      {
        text: 'Mandel and Agol 2002, ApJ 580, L171 (the transit model)',
        url: 'https://doi.org/10.1086/345520',
      },
      PYODIDE,
      NUMPY,
    ],
  },
];
