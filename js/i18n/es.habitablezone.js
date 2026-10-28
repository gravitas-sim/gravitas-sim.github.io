// Las palabras de los instrumentos de los límites de la zona habitable, en
// español (Prompt 205, parte B). Sin lectura por una persona que lea español
// con fluidez.
export const ES_HABITABLEZONE = {
  'hzL.on': 'visible',
  'hzL.off': 'oculto',
  'hzL.axis.distance': 'Distancia a la estrella (UA)',
  'hzL.axis.flux': 'Luz estelar (Tierras)',
  'hzL.row.model': 'Modelo',
  'hzL.row.star': 'Estrella',
  'hzL.row.refused': 'Rechazado',
  'hzL.row.assumes': 'Lo que deja fuera',
  'hzL.m.limits':
    'Límites de la zona habitable: umbrales de flujo de un ajuste publicado',
  'hzL.m.locking': 'Radio de acoplamiento de marea en el modelo de Q constante',
  'hzL.m.ages':
    'Zona habitable de una estrella modelo a una edad (modelo MIST)',
  'hzL.as.limits':
    'las nubes; la rotación y la oblicuidad; el transporte de calor por los océanos; cualquier planeta que no sea de una masa terrestre con la gravedad de la Tierra; cualquier atmósfera que no sea de agua (límites interiores) o de dióxido de carbono (límites exteriores); una estrella fuera de 2600 a 7200 K. La zona es una banda de luz estelar, no una medida de ningún planeta',
  'hzL.as.locking':
    'la excentricidad de la órbita; la resonancia espín-órbita (Mercurio); las mareas atmosféricas (Venus); el k2 y la Q propios del planeta, que no se conocen con un factor de diez, así que el radio se da como un intervalo. Un planeta dentro del radio pierde su espín dentro de la edad en este modelo; no se afirma que esté acoplado',
  'hzL.value.star': '{T} K, {L} veces la luminosidad del Sol',
  'hzL.value.refused':
    'el ajuste está calibrado para estrellas de {min} K a {max} K; esta estrella está a {T} K, fuera del intervalo, y no se da ningún límite',
  'hzL.value.limit':
    '{flux} Tierras de luz estelar ({wm2} W/m²), a {d} UA. {kind}',
  'hzL.kind.model': 'De un modelo climático.',
  'hzL.kind.empirical': 'De la historia de Venus o de Marte, no de un modelo.',
  'hzL.ctl.runawayGreenhouse': 'Desbocado',
  'hzL.ctl.maximumGreenhouse': 'Invernadero máx.',
  'hzL.ctl.recentVenus': 'Venus reciente',
  'hzL.ctl.earlyMars': 'Marte primitivo',
  'hzL.limit.runawayGreenhouse':
    'Efecto invernadero desbocado (borde interior)',
  'hzL.limit.maximumGreenhouse': 'Efecto invernadero máximo (borde exterior)',
  'hzL.limit.recentVenus': 'Venus reciente (borde interior optimista)',
  'hzL.limit.earlyMars': 'Marte primitivo (borde exterior optimista)',
  'hzL.star.sun': 'El Sol',
  'hzL.star.f': 'Una estrella F (6800 K)',
  'hzL.star.k': 'Una enana K (4200 K)',
  'hzL.star.m': 'Una enana M (3200 K)',
  'hzL.star.trappist': 'TRAPPIST-1 (2566 K)',
  'hzL.l.title': 'Cuatro límites, como cantidades de luz estelar',
  'hzL.l.note':
    'Cada límite es una cantidad de luz estelar, en Tierras, que un ajuste climático publicado dice que un planeta de una masa terrestre puede soportar. Muestra u oculta cada límite. La distancia de un límite sale de la luminosidad de la estrella; la cantidad de luz estelar es la del propio ajuste y cambia poco con la temperatura de la estrella. Dos límites vienen de un modelo y dos de lo que le ocurrió a Venus y a Marte.',
  'hzL.l.control.star': 'Estrella',
  'hzL.l.legend.flux': 'Luz estelar que recibe un planeta a cada distancia',
  'hzL.k.title': '¿Qué zonas quedan dentro del radio de acoplamiento?',
  'hzL.k.note':
    'Las mareas que levanta la estrella frenan el espín de un planeta; cuanto más cerca la estrella, más deprisa. El radio de acoplamiento es la distancia dentro de la cual el espín se anula en la edad de la estrella, para un planeta de tipo terrestre (k2 0,3, un espín inicial de 10 horas) y la Q fijada aquí. La Q no se conoce con un factor de diez, así que el radio es un intervalo, dibujado con trazos.',
  'hzL.k.control.star': 'Masa de la estrella',
  'hzL.k.control.age': 'Edad',
  'hzL.k.control.q': 'Q de marea',
  'hzL.k.axis.x': 'Masa de la estrella (masas solares)',
  'hzL.k.legend.inner': 'Borde interior de la zona conservadora',
  'hzL.k.legend.outer': 'Borde exterior de la zona conservadora',
  'hzL.k.legend.lock': 'Radio de acoplamiento, Q = {Q}',
  'hzL.k.legend.low': 'Radio de acoplamiento si Q es diez veces mayor',
  'hzL.k.legend.high': 'Radio de acoplamiento si Q es diez veces menor',
  'hzL.k.row.zone': 'Zona conservadora',
  'hzL.k.row.lock': 'Radio de acoplamiento (intervalo según Q)',
  'hzL.k.row.verdict': 'La zona frente al radio',
  'hzL.k.value.zone': '{inner} a {outer} UA',
  'hzL.k.value.lock': '{r} UA ({low} a {high} UA)',
  'hzL.k.verdict.inside':
    'Toda la zona queda dentro del radio de acoplamiento: un planeta allí perdería su espín dentro de la edad en este modelo.',
  'hzL.k.verdict.outside':
    'Toda la zona queda fuera del radio de acoplamiento: un planeta allí conservaría su espín en este modelo.',
  'hzL.k.verdict.straddles':
    'El radio de acoplamiento cae dentro de la zona: la parte interior perdería su espín y la exterior no.',
  'hzL.k.refused.age-domain':
    'A esa edad la estrella ya no está en este modelo (ha salido de la etapa de secuencia principal que cubre), así que no hay nada que leer.',
  'hzL.k.refused.teff-domain':
    'A esa edad la estrella es más caliente o más fría de lo que cubre el ajuste de los límites (2600 a 7200 K), así que no se da ninguna zona.',
  'hzL.mass.m020': '0,2 masas solares',
  'hzL.mass.m050': '0,5 masas solares',
  'hzL.mass.m100': '1 masa solar',
  'hzL.mass.m200': '2 masas solares',
  'hzL.a.title': 'Dónde está la zona, a tres edades',
  'hzL.a.note':
    'Una estrella de una masa solar de los modelos de evolución MIST se hace más brillante con la edad, y la zona se desplaza hacia fuera con ella. La edad se cuenta desde el comienzo del modelo. Es una estrella modelo, no el Sol: es un 11 por ciento más brillante que el Sol a la edad del Sol.',
  'hzL.a.control.age': 'Edad',
  'hzL.a.axis.x': 'Edad (Ga)',
  'hzL.a.legend.inner': 'Borde interior (invernadero desbocado)',
  'hzL.a.legend.outer': 'Borde exterior (invernadero máximo)',
  'hzL.a.legend.earth': 'Órbita de la Tierra, 1 UA',
  'hzL.a.legend.now': 'La zona a la edad fijada',
  'hzL.a.row.star': 'La estrella modelo',
  'hzL.a.row.zone': 'Zona conservadora',
  'hzL.a.row.earth': 'Un planeta a 1 UA',
  'hzL.a.row.note': 'No es el Sol',
  'hzL.a.value.star': '{L} veces la luminosidad actual del Sol, {T} K',
  'hzL.a.value.zone': '{inner} a {outer} UA',
  'hzL.a.value.earth': 'recibe {flux} Tierras de luz estelar: {where}',
  'hzL.a.where.inner': 'más cerca que el borde interior',
  'hzL.a.where.outer': 'más lejos que el borde exterior',
  'hzL.a.where.inside': 'dentro de la zona',
  'hzL.a.value.note':
    'Es una estrella modelo de una masa solar, no el Sol. A la edad del Sol es un 11 por ciento más brillante que el Sol de verdad, así que la lectura a 1 UA pertenece al modelo.',
};
