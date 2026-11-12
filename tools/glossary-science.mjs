// =============================================================================
// The glossary's definitions, by topic (Roadmap III, Prompt 286)
// -----------------------------------------------------------------------------
// tools/glossary.mjs holds the names (LABELS, the single source the label check
// of Prompt 156 holds the catalogs to). This file holds what each term means,
// in both languages, and the topic it is filed under. A definition belongs to a
// LABELS entry of the same id; the terms that had no entry are added there from
// EXTRA, with their names, so the label check sees them too.
//
//   TOPICS       the glossary page's groups, in order
//   EXTRA        names of the terms added since Prompt 282 (kind: science)
//   DEFINITIONS  id -> { topic, en, es, model }
//
// `model` is the id of a section of /model/ that states the assumptions behind
// the term; tests/glossaryTerms.test.js holds it to the page. Spanish is written
// by hand, one sentence or two, and awaits a fluent reader (Appendix A).
// Prose here is never machine translated and uses no word RETIRED lists.
// =============================================================================

export const TOPICS = [
  {
    id: 'light',
    en: 'Light, detectors and measurement',
    es: 'Luz, detectores y medición',
  },
  {
    id: 'motion',
    en: 'Motion and orbits',
    es: 'Movimiento y órbitas',
  },
  {
    id: 'planets',
    en: 'Planets and eclipses',
    es: 'Planetas y eclipses',
  },
  {
    id: 'stars',
    en: 'Stars and what is left of them',
    es: 'Estrellas y lo que queda de ellas',
  },
  {
    id: 'spectra',
    en: 'Spectra and redshift',
    es: 'Espectros y corrimiento al rojo',
  },
  {
    id: 'galaxies',
    en: 'Galaxies and the universe',
    es: 'Galaxias y el universo',
  },
  {
    id: 'inference',
    en: 'Fitting, uncertainty and inference',
    es: 'Ajuste, incertidumbre e inferencia',
  },
];

/** Terms added since Prompt 282, as LABELS entries (kind science). */
export const EXTRA = [
  ['flux', 'Flux', 'Flujo'],
  ['magnitude', 'Magnitude', 'Magnitud'],
  ['extinction', 'Extinction', 'Extinción'],
  [
    'point-spread-function',
    'Point spread function',
    'Función de dispersión del punto',
  ],
  ['redshift', 'Redshift', 'Corrimiento al rojo'],
  ['blackbody', 'Blackbody', 'Cuerpo negro'],
  ['effective-temperature', 'Effective temperature', 'Temperatura efectiva'],
  ['absorption-line', 'Absorption line', 'Línea de absorción'],
  ['main-sequence', 'Main sequence', 'Secuencia principal'],
  ['metallicity', 'Metallicity', 'Metalicidad'],
  ['roche-limit', 'Roche limit', 'Límite de Roche'],
  ['hill-sphere', 'Hill sphere', 'Esfera de Hill'],
  ['tidal-locking', 'Tidal locking', 'Acoplamiento de marea'],
  ['resonance', 'Resonance', 'Resonancia'],
  ['habitable-zone', 'Habitable zone', 'Zona habitable'],
  ['albedo', 'Albedo', 'Albedo'],
  ['greenhouse-effect', 'Greenhouse effect', 'Efecto invernadero'],
  ['standard-candle', 'Standard candle', 'Candela estándar'],
  ['hubble-constant', 'Hubble constant', 'Constante de Hubble'],
  ['luminosity-distance', 'Luminosity distance', 'Distancia de luminosidad'],
  ['dark-matter', 'Dark matter', 'Materia oscura'],
  ['rotation-curve', 'Rotation curve', 'Curva de rotación'],
  ['gravitational-lens', 'Gravitational lens', 'Lente gravitacional'],
  ['einstein-radius', 'Einstein radius', 'Radio de Einstein'],
  ['schwarzschild-radius', 'Schwarzschild radius', 'Radio de Schwarzschild'],
  ['eddington-limit', 'Eddington limit', 'Límite de Eddington'],
  ['chandrasekhar-limit', 'Chandrasekhar limit', 'Límite de Chandrasekhar'],
  ['initial-mass-function', 'Initial mass function', 'Función inicial de masa'],
  ['isochrone', 'Isochrone', 'Isócrona'],
  ['selection-effect', 'Selection effect', 'Efecto de selección'],
  ['uncertainty', 'Uncertainty', 'Incertidumbre'],
  ['confidence-interval', 'Confidence interval', 'Intervalo de confianza'],
  ['cluster-membership', 'Cluster membership', 'Pertenencia a un cúmulo'],
  ['supernova', 'Supernova', 'Supernova'],
  ['parsec', 'Parsec', 'Pársec'],
  ['keplers-third-law', 'Kepler’s third law', 'Tercera ley de Kepler'],
  ['aliasing', 'Aliasing', 'Aliasing'],
].map(([id, en, es]) => ({ id, kind: 'science', en, es }));

const d = (topic, en, es, model = null) => ({ topic, en, es, model });

export const DEFINITIONS = {
  // --- light, detectors and measurement
  airmass: d(
    'light',
    'How much atmosphere the light crosses, as a multiple of looking straight up. It is 1 at the zenith and grows toward the horizon, and every bit of it dims and reddens a star.',
    'Cuánta atmósfera cruza la luz, como múltiplo de mirar hacia el cenit. Vale 1 en el cenit y crece hacia el horizonte, y cada parte de ella atenúa y enrojece una estrella.'
  ),
  'aperture-radius': d(
    'light',
    'The radius of the circle of pixels added up to get a star’s light. Too small and light from the star is lost; too large and noise from the sky is added.',
    'El radio del círculo de píxeles que se suman para obtener la luz de una estrella. Si es muy pequeño se pierde luz de la estrella; si es muy grande se añade ruido del cielo.'
  ),
  'signal-to-noise': d(
    'light',
    'A measurement’s size divided by its random scatter. A signal-to-noise of 10 means the scatter is about a tenth of the thing measured.',
    'El tamaño de una medición dividido entre su dispersión aleatoria. Una señal a ruido de 10 significa que la dispersión es cerca de una décima parte de lo medido.'
  ),
  'zero-point': d(
    'light',
    'The number added to an instrument magnitude (minus 2.5 times the log of the counts per second) to put it on the standard scale.',
    'El número que se suma a una magnitud instrumental (menos 2,5 veces el logaritmo de las cuentas por segundo) para llevarla a la escala estándar.'
  ),
  photometry: d(
    'light',
    'Measuring how much light an object gives off, in counts or magnitudes, over time or in several colours.',
    'Medir cuánta luz emite un objeto, en cuentas o magnitudes, a lo largo del tiempo o en varios colores.'
  ),
  pixel: d(
    'light',
    'One light-collecting cell of a detector. An image is a grid of pixels, each holding the counts it collected.',
    'Una celda de un detector que recoge luz. Una imagen es una cuadrícula de píxeles, cada uno con las cuentas que recogió.'
  ),
  noise: d(
    'light',
    'Random variation that makes a measurement differ from the truth each time it is taken. More light or a longer exposure shrinks it; it never reaches zero.',
    'Variación aleatoria que hace que una medición difiera de la verdad cada vez que se toma. Más luz o una exposición más larga la reducen; nunca llega a cero.'
  ),
  'baseline-flux': d(
    'light',
    'The brightness of a star when nothing is happening to it: the level the dips or flares are measured against.',
    'El brillo de una estrella cuando no le pasa nada: el nivel respecto al cual se miden las caídas o los destellos.'
  ),
  flux: d(
    'light',
    'The energy of light arriving each second on each square metre of a detector. It is brightness as it is measured, and it falls with the square of the distance.',
    'La energía de la luz que llega cada segundo a cada metro cuadrado de un detector. Es el brillo tal como se mide, y cae con el cuadrado de la distancia.'
  ),
  magnitude: d(
    'light',
    'A logarithmic scale of brightness in which a smaller number is brighter and a difference of 5 magnitudes is a factor of 100 in flux.',
    'Una escala logarítmica de brillo en la que un número menor es más brillante y una diferencia de 5 magnitudes es un factor de 100 en el flujo.'
  ),
  extinction: d(
    'light',
    'The dimming of starlight by dust and gas along the way, which also reddens it.',
    'La atenuación de la luz estelar por el polvo y el gas del camino, que además la enrojece.'
  ),
  'point-spread-function': d(
    'light',
    'The blurred pattern a point of light makes on a detector, set by the telescope, the atmosphere and the pixels. Every star in an image has this shape.',
    'El patrón difuso que forma un punto de luz en un detector, determinado por el telescopio, la atmósfera y los píxeles. Todas las estrellas de una imagen tienen esta forma.'
  ),
  'light-curve': d(
    'light',
    'A star’s brightness plotted against time.',
    'El brillo de una estrella representado frente al tiempo.'
  ),
  periodogram: d(
    'light',
    'A plot of how strongly each trial period repeats in a light curve. A peak marks a signal that repeats.',
    'Un gráfico de cuán fuertemente se repite cada periodo de prueba en una curva de luz. Un pico señala una señal que se repite.'
  ),
  aliasing: d(
    'light',
    'A false signal at a different period, caused by the times at which the observations were made, for example one sample per night.',
    'Una señal falsa con otro periodo, causada por los momentos en que se hicieron las observaciones, por ejemplo una muestra por noche.'
  ),
  // --- motion and orbits
  parallax: d(
    'motion',
    'The apparent shift of a nearby star against far ones as Earth moves round the Sun. The smaller the shift, the farther the star: the distance in parsecs is 1 divided by the parallax in arcseconds.',
    'El desplazamiento aparente de una estrella cercana frente a las lejanas mientras la Tierra recorre su órbita. Cuanto menor es, más lejos está la estrella: la distancia en pársecs es 1 dividido entre el paralaje en segundos de arco.',
    'gaia-distances'
  ),
  parsec: d(
    'motion',
    'A distance of about 3.26 light-years: the distance at which a star shows a parallax of one arcsecond.',
    'Una distancia de unos 3,26 años luz: la distancia a la que una estrella muestra un paralaje de un segundo de arco.'
  ),
  'proper-motion': d(
    'motion',
    'A star’s slow drift across the sky, measured as an angle per year. It is the part of its motion at right angles to our line of sight.',
    'El lento desplazamiento de una estrella por el cielo, medido como un ángulo por año. Es la parte de su movimiento perpendicular a nuestra línea de visión.'
  ),
  'radial-velocity': d(
    'motion',
    'The speed at which an object moves toward or away from us, read from the Doppler shift of its light. Positive means moving away.',
    'La rapidez con que un objeto se acerca o se aleja de nosotros, leída en el efecto Doppler de su luz. Positiva significa que se aleja.'
  ),
  epoch: d(
    'motion',
    'The date a set of positions or orbital elements refers to. A star’s position changes, so a catalog always says its epoch.',
    'La fecha a la que se refiere un conjunto de posiciones o de elementos orbitales. La posición de una estrella cambia, así que un catálogo siempre indica su época.'
  ),
  'closest-approach': d(
    'motion',
    'The smallest distance two bodies reach in an encounter.',
    'La menor distancia que alcanzan dos cuerpos en un encuentro.'
  ),
  'reference-frame': d(
    'motion',
    'The viewpoint from which positions and speeds are measured: an origin and the way it moves. Change it and the numbers change, but the physics does not.',
    'El punto de vista desde el que se miden posiciones y rapideces: un origen y la manera en que se mueve. Si se cambia, cambian los números, pero no la física.'
  ),
  period: d(
    'motion',
    'The time one full repeat takes: an orbit, a pulsation or a rotation.',
    'El tiempo que dura una repetición completa: una órbita, una pulsación o una rotación.'
  ),
  eccentricity: d(
    'motion',
    'How stretched an orbit is. 0 is a circle; close to 1 is a long, thin ellipse.',
    'Qué tan alargada es una órbita. 0 es un círculo; cerca de 1 es una elipse larga y delgada.'
  ),
  inclination: d(
    'motion',
    'The tilt of an orbit’s plane. For orbits seen from Earth it is measured from the plane of the sky: at 90 degrees the orbit is edge on, and transits and eclipses are possible.',
    'La inclinación del plano de una órbita. En las órbitas vistas desde la Tierra se mide desde el plano del cielo: a 90 grados la órbita se ve de canto, y son posibles los tránsitos y los eclipses.'
  ),
  'semi-major-axis': d(
    'motion',
    'Half of an orbit’s longest width. It is the orbit’s size, and with the period it is what Kepler’s third law relates.',
    'La mitad del ancho mayor de una órbita. Es el tamaño de la órbita y, junto con el periodo, lo que relaciona la tercera ley de Kepler.'
  ),
  periapsis: d(
    'motion',
    'The point of an orbit nearest the body it circles.',
    'El punto de una órbita más cercano al cuerpo que orbita.'
  ),
  apoapsis: d(
    'motion',
    'The point of an orbit farthest from the body it circles.',
    'El punto de una órbita más lejano del cuerpo que orbita.'
  ),
  'keplers-third-law': d(
    'motion',
    'For bodies orbiting the same mass, the square of the period is proportional to the cube of the semi-major axis.',
    'Para cuerpos que orbitan la misma masa, el cuadrado del periodo es proporcional al cubo del semieje mayor.'
  ),
  resonance: d(
    'motion',
    'Two orbital periods in a ratio of small whole numbers, such as 2 to 1, so the bodies tug on each other at the same places again and again.',
    'Dos periodos orbitales con una razón de números enteros pequeños, como 2 a 1, de modo que los cuerpos tiran uno del otro una y otra vez en los mismos lugares.'
  ),
  'roche-limit': d(
    'motion',
    'The distance inside which the tides of the body it orbits pull apart a moon held together only by its own gravity.',
    'La distancia por dentro de la cual las mareas del cuerpo al que orbita desgarran a una luna sostenida solo por su propia gravedad.',
    'tides'
  ),
  'hill-sphere': d(
    'motion',
    'The region around a body where its gravity, and not the star’s, controls what orbits it.',
    'La región alrededor de un cuerpo donde su gravedad, y no la de la estrella, controla lo que lo orbita.'
  ),
  'tidal-locking': d(
    'motion',
    'When a body’s rotation period equals its orbital period, so it keeps one face toward what it orbits, as the Moon does.',
    'Cuando el periodo de rotación de un cuerpo es igual a su periodo orbital, de modo que muestra siempre la misma cara a aquello que orbita, como la Luna.',
    'tides'
  ),
  // --- planets and eclipses
  transit: d(
    'planets',
    'A planet passing in front of its star, so the star dims slightly. The depth of the dip is about the planet’s area divided by the star’s.',
    'Un planeta que pasa delante de su estrella, de modo que esta se atenúa un poco. La profundidad de la caída es aproximadamente el área del planeta dividida entre la de la estrella.',
    'transit-fitting'
  ),
  'eclipsing-binary': d(
    'planets',
    'Two stars that orbit so that, seen from here, each passes in front of the other, and the pair dims twice every orbit.',
    'Dos estrellas que orbitan de modo que, vistas desde aquí, cada una pasa delante de la otra, y el par se atenúa dos veces por órbita.',
    'eclipsing-binaries'
  ),
  'impact-parameter': d(
    'planets',
    'How far from the centre of the star’s disc a transit crosses, in units of the star’s radius. 0 is straight across the middle; near 1 is a grazing transit.',
    'A qué distancia del centro del disco de la estrella cruza un tránsito, en unidades del radio de la estrella. 0 es de lado a lado por el medio; cerca de 1 es un tránsito rasante.',
    'transit-fitting'
  ),
  'target-star': d(
    'planets',
    'The star being observed for a signal such as a transit, as opposed to the comparison stars used to correct it.',
    'La estrella que se observa en busca de una señal, como un tránsito, frente a las estrellas de comparación que sirven para corregirla.'
  ),
  'false-positive': d(
    'planets',
    'A signal that looks like a planet but comes from something else, such as an eclipsing binary in the background.',
    'Una señal que parece un planeta pero viene de otra cosa, como una binaria eclipsante al fondo.',
    'vetting'
  ),
  'equilibrium-temperature': d(
    'planets',
    'The temperature a planet would have if it only absorbed starlight and radiated it back, ignoring any greenhouse effect.',
    'La temperatura que tendría un planeta si solo absorbiera luz estelar y la irradiara de vuelta, sin contar ningún efecto invernadero.'
  ),
  'scale-height': d(
    'planets',
    'The height over which an atmosphere’s pressure falls by a factor of e, about 2.7. It is larger where the air is hot and light and where gravity is weak.',
    'La altura en la que la presión de una atmósfera baja en un factor e, cerca de 2,7. Es mayor donde el aire es caliente y ligero y donde la gravedad es débil.'
  ),
  albedo: d(
    'planets',
    'The fraction of the light that arrives which a surface or planet reflects. 0 is perfectly dark and 1 is perfectly reflective.',
    'La fracción de la luz que llega que refleja una superficie o un planeta. 0 es oscuridad total y 1 es reflexión total.'
  ),
  'greenhouse-effect': d(
    'planets',
    'The warming of a surface because the atmosphere absorbs heat that the surface would otherwise radiate to space.',
    'El calentamiento de una superficie porque la atmósfera absorbe calor que la superficie de otro modo irradiaría al espacio.'
  ),
  'habitable-zone': d(
    'planets',
    'The range of distances from a star where a planet with the right atmosphere could have liquid water on its surface. It is a range of conditions, not a finding of life.',
    'El intervalo de distancias a una estrella donde un planeta con la atmósfera adecuada podría tener agua líquida en su superficie. Es un intervalo de condiciones, no un hallazgo de vida.'
  ),
  // --- stars
  luminosity: d(
    'stars',
    'The total energy a star gives off each second, in watts or in Suns.',
    'La energía total que emite una estrella cada segundo, en vatios o en Soles.',
    'stars'
  ),
  'effective-temperature': d(
    'stars',
    'The temperature of a blackbody that would give off the same energy per square metre as the star’s surface.',
    'La temperatura de un cuerpo negro que emitiría la misma energía por metro cuadrado que la superficie de la estrella.',
    'stars'
  ),
  'main-sequence': d(
    'stars',
    'The long stage when a star fuses hydrogen in its core. Most stars, the Sun included, are on it, and mass sets where.',
    'La larga etapa en que una estrella fusiona hidrógeno en su núcleo. La mayoría de las estrellas, el Sol incluido, están en ella, y la masa fija en qué lugar.',
    'stars'
  ),
  metallicity: d(
    'stars',
    'The share of a star’s matter that is elements heavier than helium. Astronomers call all of these metals.',
    'La proporción de la materia de una estrella que son elementos más pesados que el helio. Los astrónomos llaman metales a todos ellos.'
  ),
  'white-dwarf': d(
    'stars',
    'The hot, dense core left when a Sun-like star has used up its fuel. It is about the size of Earth and slowly cools.',
    'El núcleo caliente y denso que queda cuando una estrella como el Sol agota su combustible. Tiene más o menos el tamaño de la Tierra y se enfría despacio.',
    'remnants'
  ),
  'neutron-star': d(
    'stars',
    'The collapsed core of a massive star: one to two times the Sun’s mass in a radius of about 10 km, held up by the pressure of its neutrons.',
    'El núcleo colapsado de una estrella masiva: de una a dos veces la masa del Sol en un radio de unos 10 km, sostenido por la presión de sus neutrones.',
    'remnants'
  ),
  cepheid: d(
    'stars',
    'A pulsating star whose period of brightening and dimming tells its true brightness, so it can be used to measure distance.',
    'Una estrella pulsante cuyo periodo de brillo y atenuación indica su brillo verdadero, por lo que sirve para medir distancias.',
    'variables-ii'
  ),
  supernova: d(
    'stars',
    'The explosion that ends a massive star, or a white dwarf that has gained too much mass. For a short time it can outshine its whole galaxy.',
    'La explosión que termina la vida de una estrella masiva, o de una enana blanca que ganó demasiada masa. Por un corto tiempo puede brillar más que toda su galaxia.'
  ),
  'schwarzschild-radius': d(
    'stars',
    'The radius of the event horizon of a black hole that does not spin: about 3 km for each solar mass.',
    'El radio del horizonte de sucesos de un agujero negro sin giro: unos 3 km por cada masa solar.',
    'blackholes'
  ),
  'eddington-limit': d(
    'stars',
    'The luminosity at which radiation pushing gas outward balances the gravity pulling it in. Steady accretion cannot be much brighter.',
    'La luminosidad a la que la radiación que empuja el gas hacia fuera equilibra la gravedad que lo atrae. Una acreción estable no puede ser mucho más brillante.',
    'blackholes'
  ),
  'chandrasekhar-limit': d(
    'stars',
    'The largest mass a white dwarf can have, about 1.4 times the Sun’s. Above it the pressure of the electrons cannot hold the star up.',
    'La mayor masa que puede tener una enana blanca, cerca de 1,4 veces la del Sol. Por encima, la presión de los electrones no sostiene la estrella.',
    'remnants'
  ),
  'initial-mass-function': d(
    'stars',
    'How many stars form at each mass: many small ones and few large ones.',
    'Cuántas estrellas se forman de cada masa: muchas pequeñas y pocas grandes.'
  ),
  isochrone: d(
    'stars',
    'A line on a star diagram joining stars of the same age but different masses. The stars of a cluster lie along one.',
    'Una línea en un diagrama de estrellas que une estrellas de la misma edad y masas distintas. Las estrellas de un cúmulo se sitúan sobre una.'
  ),
  'cluster-membership': d(
    'stars',
    'Whether a star belongs to a cluster, judged from its position, motion and distance as well as its colour.',
    'Si una estrella pertenece a un cúmulo, juzgado por su posición, su movimiento y su distancia además de su color.'
  ),
  // --- spectra and redshift
  spectrum: d(
    'spectra',
    'Light split by wavelength: its brightness plotted against wavelength or frequency.',
    'La luz separada por longitud de onda: su brillo representado frente a la longitud de onda o la frecuencia.'
  ),
  blackbody: d(
    'spectra',
    'An ideal glowing object whose colour and brightness depend only on its temperature. Stars come close to it.',
    'Un objeto ideal que brilla y cuyo color y brillo dependen solo de su temperatura. Las estrellas se le parecen mucho.',
    'stars'
  ),
  'absorption-line': d(
    'spectra',
    'A dark, narrow gap in a spectrum where atoms in cooler gas took out light of particular wavelengths.',
    'Un hueco oscuro y estrecho en un espectro donde los átomos de un gas más frío absorbieron luz de longitudes de onda concretas.'
  ),
  'equivalent-width': d(
    'spectra',
    'The width of a rectangle, as tall as the continuum, with the same area as an absorption or emission line. A bigger value means a stronger line.',
    'El ancho de un rectángulo, tan alto como el continuo, con la misma área que una línea de absorción o de emisión. Un valor mayor significa una línea más intensa.'
  ),
  redshift: d(
    'spectra',
    'The stretching of light to longer wavelengths, written z. It comes from motion away from us or, for distant galaxies, from the expansion of space.',
    'El estiramiento de la luz hacia longitudes de onda mayores, escrito z. Proviene del movimiento de alejamiento o, en las galaxias lejanas, de la expansión del espacio.'
  ),
  // --- galaxies and the universe
  'standard-candle': d(
    'galaxies',
    'An object whose true brightness is known, so how dim it looks gives its distance. Cepheids and Type Ia supernovae are used this way.',
    'Un objeto cuyo brillo verdadero se conoce, de modo que cuán tenue se ve da su distancia. Las cefeidas y las supernovas de tipo Ia se usan así.'
  ),
  'hubble-constant': d(
    'galaxies',
    'How fast the universe is expanding now: the speed at which a galaxy recedes for each unit of distance, in km/s per megaparsec.',
    'Qué tan rápido se expande el universo hoy: la rapidez con que se aleja una galaxia por cada unidad de distancia, en km/s por megaparsec.'
  ),
  'luminosity-distance': d(
    'galaxies',
    'The distance inferred from how bright an object of known luminosity appears: the flux is the luminosity divided by 4 pi times that distance squared. In an expanding universe it is not the distance the light travelled.',
    'La distancia deducida de cuán brillante parece un objeto de luminosidad conocida: el flujo es la luminosidad dividida entre 4 pi por esa distancia al cuadrado. En un universo en expansión no es la distancia que recorrió la luz.'
  ),
  'dark-matter': d(
    'galaxies',
    'Matter that gives off no light we can detect but pulls on stars and gas with its gravity. Its presence is inferred from motions; it is not seen.',
    'Materia que no emite luz detectable pero atrae con su gravedad a estrellas y gas. Su presencia se deduce de los movimientos; no se ve.'
  ),
  'rotation-curve': d(
    'galaxies',
    'A galaxy’s orbital speed plotted against distance from its centre. A curve that stays flat at large radius points to unseen mass.',
    'La rapidez orbital de una galaxia representada frente a la distancia a su centro. Una curva que se mantiene plana a radios grandes apunta a masa invisible.'
  ),
  'gravitational-lens': d(
    'galaxies',
    'A mass whose gravity bends the light of a source behind it, which can brighten the source, distort it or split its image.',
    'Una masa cuya gravedad desvía la luz de una fuente que está detrás, y que puede aumentar su brillo, deformarla o dividir su imagen.',
    'lensing'
  ),
  'einstein-radius': d(
    'galaxies',
    'The angular radius of the ring a lens makes when the source lies exactly behind it. It sets the lens’s mass scale.',
    'El radio angular del anillo que forma una lente cuando la fuente está justo detrás. Fija la escala de masa de la lente.',
    'lensing'
  ),
  completeness: d(
    'inference',
    'The fraction of real objects of a given kind that a survey would actually find. Counts must be divided by it to estimate how many exist.',
    'La fracción de objetos reales de un tipo dado que un sondeo realmente encontraría. Los conteos se dividen entre ella para estimar cuántos existen.',
    'completeness'
  ),
  // --- fitting, uncertainty and inference
  'chi-square': d(
    'inference',
    'One number for how far data lie from a model: the sum of each difference divided by its uncertainty, squared. Smaller is a closer fit.',
    'Un número que dice cuánto se alejan los datos de un modelo: la suma de cada diferencia dividida entre su incertidumbre, elevada al cuadrado. Menor es un ajuste más cercano.'
  ),
  'reduced-chi-square': d(
    'inference',
    'Chi-square divided by the degrees of freedom. About 1 means the model fits as well as the uncertainties say it should; much larger means it does not; much smaller means the uncertainties may be too big.',
    'Chi cuadrado dividido entre los grados de libertad. Cerca de 1 significa que el modelo ajusta tan bien como dicen las incertidumbres; mucho mayor, que no; mucho menor, que quizá las incertidumbres son demasiado grandes.'
  ),
  'degrees-of-freedom': d(
    'inference',
    'The number of data points minus the number of parameters fitted: how many independent pieces of information are left to test the fit.',
    'El número de datos menos el número de parámetros ajustados: cuántas piezas independientes de información quedan para poner a prueba el ajuste.'
  ),
  likelihood: d(
    'inference',
    'How probable the observed data would be if a given set of parameter values were true. It is a function of the parameters, not a probability of them.',
    'Qué tan probables serían los datos observados si fueran ciertos unos valores dados de los parámetros. Es una función de los parámetros, no una probabilidad de ellos.'
  ),
  posterior: d(
    'inference',
    'What the data and what was known before say together about a parameter: its probability distribution after the measurement.',
    'Lo que dicen juntos los datos y lo que se sabía antes sobre un parámetro: su distribución de probabilidad después de la medición.'
  ),
  residual: d(
    'inference',
    'The difference between a measured value and the value the model predicts for it.',
    'La diferencia entre un valor medido y el valor que predice el modelo.'
  ),
  residuals: d(
    'inference',
    'The differences between every measured value and the model’s value, in order. A good fit leaves them scattered around zero with no pattern.',
    'Las diferencias entre cada valor medido y el del modelo, en orden. Un buen ajuste las deja dispersas alrededor de cero, sin patrón.'
  ),
  parameter: d(
    'inference',
    'A number in a model that is adjusted to fit the data, such as a planet’s radius ratio or a period.',
    'Un número de un modelo que se ajusta para reproducir los datos, como la razón de radios de un planeta o un periodo.'
  ),
  uncertainty: d(
    'inference',
    'How far a measured or fitted value could plausibly be from the true one, stated together with the value.',
    'Qué tan lejos podría estar, de forma plausible, un valor medido o ajustado del valor verdadero, indicado junto con el valor.'
  ),
  'confidence-interval': d(
    'inference',
    'A range computed from data that, over many repeats of the measurement, would contain the true value at a stated rate such as 68 percent.',
    'Un intervalo calculado con los datos que, en muchas repeticiones de la medición, contendría el valor verdadero con una frecuencia indicada, como el 68 por ciento.'
  ),
  'selection-effect': d(
    'inference',
    'A bias from how a sample was gathered: bright, close or large things are found more easily, so the sample is not the whole population.',
    'Un sesgo debido a cómo se reunió una muestra: lo brillante, cercano o grande se encuentra con más facilidad, así que la muestra no es toda la población.'
  ),
};
