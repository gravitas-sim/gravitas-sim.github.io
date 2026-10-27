// Las palabras de los instrumentos de anillos y mareas, en español (Prompt 204, segunda parte).
export const ES_TIDES = {
  'tideW.row.model': 'Modelo',
  'tideW.row.assumes': 'Lo que deja fuera',
  'tideW.model.roche':
    'Límite de Roche de un satélite que solo la gravedad mantiene unido',
  'tideW.model.res':
    'Resonancia de movimientos medios de una partícula del anillo con una luna, órbitas de masas puntuales',
  'tideW.a.roche':
    'la resistencia del satélite (el límite rígido es para un cuerpo que no se deforma nada, el fluido para uno que se deforma libremente, y un cuerpo real queda entre ambos); su giro; su forma antes de la marea; el tiempo que pasa dentro del límite (un paso rápido puede no romperlo)',
  'tideW.a.res':
    'el achatamiento de Saturno, que desplaza el radio real en cerca de medio por ciento; la fuerza de la resonancia (que abra o no un hueco depende de la masa de la luna y de cómo disipa el anillo); toda resonancia de orden superior',
  'tideW.a.moon':
    'una Q que no cambia con el tiempo ni con la frecuencia (no se sabe que la evolución de la Luna siguiera una sola Q); la respuesta real de los océanos; la excentricidad y la inclinación de la órbita lunar; la inclinación del eje; y la edad de la Luna (hacia atrás el modelo pone a la Luna en contacto con la Tierra en menos que la edad del sistema solar, cosa que el registro contradice)',
  'tideW.a.heating':
    'el interior real de Ío: se desconocen su k2 y su Q y la respuesta es proporcional a su cociente, así que el número es una cota y no una predicción; el acoplamiento de la marea de excentricidad con un interior parcialmente fundido; el calor de las órbitas de las otras lunas; y todo término posterior al primero en la excentricidad',
  'tideW.r.title': '¿Dónde se desintegra una luna?',
  'tideW.r.note':
    'Un satélite que solo su propia gravedad mantiene unido se deshace cuando la marea del planeta a través de él supera su autogravedad. Para un par de densidades dado eso ocurre dentro del límite de Roche: más cerca para un satélite rígido (el límite rígido), más lejos para uno que puede deformarse (el límite fluido). Elige un par y mueve el satélite.',
  'tideW.r.control.system': 'Par',
  'tideW.r.control.own': 'Distancia',
  'tideW.r.real': 'la real',
  'tideW.r.mine': 'la mía',
  'tideW.r.control.radii': 'Distancia (R)',
  'tideW.r.sys.phobos': 'Fobos, Marte',
  'tideW.r.sys.sl9': 'SL9, Júpiter',
  'tideW.r.sys.moon': 'Luna, Tierra',
  'tideW.r.sys.ring': 'Hielo anillo B',
  'tideW.r.axis.x': 'Distancia (radios del planeta)',
  'tideW.r.axis.y': 'Marea, en unidades del límite rígido',
  'tideW.r.legend.curve':
    'marea a través del satélite, relativa a la del límite rígido',
  'tideW.r.legend.limits': 'límites rígido y fluido',
  'tideW.r.legend.here': 'el satélite',
  'tideW.r.row.rigid': 'Límite rígido',
  'tideW.r.row.fluid': 'Límite fluido',
  'tideW.r.row.at': 'El satélite está a',
  'tideW.r.row.regime': 'Dónde queda eso',
  'tideW.r.regime.safe': 'fuera del límite fluido: se mantiene unido',
  'tideW.r.regime.deforming':
    'entre los límites: un cuerpo fluido se rompería, uno rígido no tiene por qué',
  'tideW.r.regime.disrupting':
    'dentro del límite rígido: nada que solo la gravedad mantenga unido sobrevive',
  'tideW.s.title': '¿Dónde cae la resonancia de una luna dentro del anillo?',
  'tideW.s.note':
    'Una partícula del anillo cuyo periodo orbital es una fracción simple del de una luna recibe el tirón de la luna en el mismo punto de cada órbita, y esos tirones se suman. La resonancia p:q está en un radio que fija solo la distancia de la luna. Elige una luna y una razón y compara el radio con los bordes y huecos de los anillos de Saturno.',
  'tideW.s.control.moon': 'Luna',
  'tideW.s.control.p': 'p',
  'tideW.s.control.q': 'q',
  'tideW.s.moon.mimas': 'Mimas',
  'tideW.s.moon.enceladus': 'Encélado',
  'tideW.s.moon.tethys': 'Tetis',
  'tideW.s.axis.x': 'Radio desde el centro de Saturno (miles de km)',
  'tideW.s.legend.features': 'bordes y huecos de los anillos',
  'tideW.s.legend.resonance': 'la resonancia {p}:{q}',
  'tideW.s.row.radius': 'Radio de la resonancia {p}:{q}',
  'tideW.s.row.nearest': 'Rasgo más cercano',
  'tideW.s.row.offset': 'Respecto de ese rasgo',
  'tideW.s.feature.bOuter':
    'borde exterior del anillo B, borde interior de la división de Cassini',
  'tideW.s.feature.aInner':
    'borde interior del anillo A, borde exterior de la división de Cassini',
  'tideW.s.feature.encke': 'la división de Encke',
  'tideW.s.feature.keeler': 'la división de Keeler',
  'tideW.m.title': 'Cómo cambian la órbita de la Luna y el día',
  'tideW.m.note':
    'La Luna levanta en la Tierra una marea que va por delante de ella, porque la Tierra gira más rápido de lo que la Luna orbita. Ese abultamiento tira de la Luna hacia delante, así que la Luna se aleja, y frena el giro de la Tierra, así que el día se alarga. La tabla es la forma cerrada del modelo: no se simula nada y no actúa ninguna fuerza.',
  'tideW.m.control.k2': 'k2',
  'tideW.m.control.Q': 'Q',
  'tideW.m.control.gyr': 'Tiempo (Ga)',
  'tideW.m.axis.x': 'Tiempo desde ahora (miles de millones de años)',
  'tideW.m.axis.y': 'Distancia de la Luna (radios terrestres)',
  'tideW.m.legend.orbit': 'la distancia de la Luna',
  'tideW.m.legend.now': 'ahora',
  'tideW.m.model':
    'Marea de equilibrio de Q constante, órbita circular, giro alineado',
  'tideW.m.llr': 'medido por telemetría láser lunar: 3,82 ± 0,07',
  'tideW.m.eclipse': 'por eclipses antiguos: cerca de 2,3',
  'tideW.m.row.rate': 'Alejamiento de la Luna ahora',
  'tideW.m.row.day': 'Alargamiento del día ahora',
  'tideW.m.row.at': 'A los {gyr} miles de millones de años',
  'tideW.m.value.at':
    '{a} mil km ({radii} radios terrestres); el día dura {day} horas',
  'tideW.m.row.ends': 'El modelo se detiene',
  'tideW.m.ends.orbit-inside-body':
    'la órbita llega a la superficie de la Tierra a {gyr} miles de millones de años: el modelo no puede correrse tan lejos',
  'tideW.m.ends.corotation':
    'el giro de la Tierra alcanza el ritmo orbital a {gyr} miles de millones de años: las mareas dejan de mover la Luna',
  'tideW.h.title': '¿Cuánto calor produce la marea de Ío?',
  'tideW.h.note':
    'La marea de Júpiter flexiona a Ío, y como su órbita es algo excéntrica la flexión nunca cesa. El rozamiento de la flexión es calor. La fórmula da el calor como un múltiplo de k2/Q, un número que nadie conoce para Ío, así que la respuesta honesta es un intervalo. Compara el calor con lo que se observa.',
  'tideW.h.control.k2': 'k2',
  'tideW.h.control.Q': 'Q',
  'tideW.h.control.e': 'Excentricidad',
  'tideW.h.axis.x': 'Excentricidad',
  'tideW.h.axis.y': 'Calentamiento (10^13 W)',
  'tideW.h.legend.chosen': 'mi k2 y mi Q',
  'tideW.h.legend.max': 'lo máximo que permite el modelo',
  'tideW.h.legend.observed': 'observado, superior',
  'tideW.h.legend.observedLow': 'observado, inferior',
  'tideW.h.model':
    'Calentamiento de un satélite síncrono en órbita excéntrica, primer orden en e',
  'tideW.h.row.power': 'Calentamiento',
  'tideW.h.row.orbit': 'Energía en una órbita (periodo)',
  'tideW.h.row.bound':
    'Intervalo que permite el modelo, con esta excentricidad',
  'tideW.h.row.observed': 'Observado',
  'tideW.h.row.need': 'k2/Q que necesita el valor medio observado',
};
