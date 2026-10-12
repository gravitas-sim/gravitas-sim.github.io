// El panel de evidencia y observación del laboratorio 3-D: su español, con
// los mismos ids que ./en.lab3dEvidence.js. Lo carga js/lab3d/view/evidencePanel.js
// solo para quien lee en español.

export const ES_LAB3DEVIDENCE = {
  'l3e.heading': 'Evidencia y observación',
  'l3e.intro':
    'Guarda lo que mides como evidencia para un informe, guarda un sistema, o pregunta qué registraría un observador que mira desde una dirección elegida.',
  'l3e.close': 'Cerrar',

  'l3e.keep.heading': 'Guardar una medida',
  'l3e.keep.reading':
    'El instrumento bajo la vista, con los cuerpos que elegiste: {what}',
  'l3e.keep.none':
    'Elige un instrumento y sus cuerpos bajo la vista, y la lectura aparecerá aquí.',
  'l3e.keep.button': 'Guardar esta lectura',
  'l3e.keep.event': 'Un suceso de la ejecución',
  'l3e.keep.eventNone': 'Todavía no hay sucesos que guardar',
  'l3e.keep.eventButton': 'Guardar este suceso',
  'l3e.keep.kept':
    'Guardada en tu cuaderno de evidencia, donde tu informe la cita y Mi trabajo la enumera.',
  'l3e.keep.failed': 'No se pudo guardar: {why}',
  'l3e.keep.whyUnavailable': 'este navegador no guarda nada',
  'l3e.keep.whyFull': 'el cuaderno está lleno',

  'l3e.title.distance': 'Distancia de {a} a {b}',
  'l3e.title.relative': 'Movimiento relativo de {a} y {b}',
  'l3e.title.angle': 'Ángulo en {v}, entre {a} y {b}',
  'l3e.title.elements': 'Órbita de {a} alrededor de {p}',
  'l3e.title.sky': '{b} frente a {a} en el cielo',
  'l3e.title.between': 'Planos de las órbitas de {a} y {b}',
  'l3e.title.merger': 'Fusión de {a} y {b}',
  'l3e.title.closeApproach': 'Aproximación de {a} y {b}',
  'l3e.title.crossing': 'Cruce del plano por {a}',
  'l3e.title.escape': 'Escape de {a}',
  'l3e.title.forward': 'Lo que registra un observador: {model}',

  'l3e.q.t': 'tiempo de la lectura',
  'l3e.q.distance': 'distancia',
  'l3e.q.speed': 'velocidad relativa',
  'l3e.q.radialRate': 'ritmo al que cambia la distancia',
  'l3e.q.angle': 'ángulo',
  'l3e.q.a': 'semieje mayor',
  'l3e.q.e': 'excentricidad',
  'l3e.q.i': 'inclinación respecto al plano de referencia',
  'l3e.q.Omega': 'longitud del nodo ascendente',
  'l3e.q.omega': 'argumento del periapsis',
  'l3e.q.M': 'anomalía media',
  'l3e.q.period': 'período',
  'l3e.q.across': 'separación transversal a la línea de visión',
  'l3e.q.along': 'separación a lo largo de la línea de visión',
  'l3e.q.sightInclination': 'línea de visión, ángulo polar',
  'l3e.q.sightAzimuth': 'línea de visión, acimut',
  'l3e.q.radiiSum': 'suma de los dos radios',
  'l3e.q.mutualInclination': 'inclinación mutua',
  'l3e.q.inclination.a': 'inclinación de la primera órbita',
  'l3e.q.inclination.b': 'inclinación de la segunda órbita',

  'l3e.system.heading': 'Guardar este sistema',
  'l3e.system.name': 'Nombre',
  'l3e.system.start': 'Como empezó',
  'l3e.system.now': 'Como está ahora',
  'l3e.system.save': 'Guardar en Mi trabajo',
  'l3e.system.download': 'Descargar el archivo',
  'l3e.system.saved': 'Guardado en Mi trabajo.',
  'l3e.system.tooFew':
    'Quedan menos de dos cuerpos, así que no hay un sistema que guardar como está ahora.',
  'l3e.system.failed': 'No se pudo guardar: {why}',
  'l3e.system.open': 'Abrir Mi trabajo',
  'l3e.system.note':
    'El archivo es el propio del laboratorio: guarda la masa, el tamaño, la posición y la velocidad de cada cuerpo, así que se abre de nuevo como exactamente este sistema.',
  'l3e.system.defaultName': 'Mi sistema 3-D',

  'l3e.obs.heading': '¿Qué registraría un observador?',
  'l3e.obs.intro':
    'El sistema se observa con los mismos modelos directos que usa el Observatorio. Las órbitas se leen en el momento del que partiste y los planetas no se atraen entre sí en el modelo, así que un cambio lento que muestra el laboratorio no está en la curva.',
  'l3e.obs.model': 'Observación',
  'l3e.obs.model.transit': 'Curva de luz de un tránsito',
  'l3e.obs.model.radial-velocity': 'Velocidad radial de la estrella',
  'l3e.obs.star': 'Estrella',
  'l3e.obs.sight': 'Línea de visión',
  'l3e.obs.sight.view': 'A lo largo de la vista actual',
  'l3e.obs.sight.angles': 'En ángulos que elijo',
  'l3e.obs.sight.now':
    'La vista mira desde {incl}° de la normal del plano de referencia, acimut {az}°.',
  'l3e.obs.inclination': 'Ángulo polar de la línea de visión (0° a 180°)',
  'l3e.obs.azimuth': 'Acimut (0° a 360°)',
  'l3e.obs.teff': 'Temperatura de la estrella (K)',
  'l3e.obs.distance': 'Distancia (parsecs)',
  'l3e.obs.starRadius': 'Radio de la estrella (radios solares)',
  'l3e.obs.planetRadius': 'Radio de {id} (radios terrestres)',
  'l3e.obs.span': 'Intervalo de tiempo (días)',
  'l3e.obs.count': 'Número de épocas',
  'l3e.obs.noise.transit': 'Ruido (partes por millón)',
  'l3e.obs.noise.radial-velocity': 'Ruido (metros por segundo)',
  'l3e.obs.go': 'Observar',
  'l3e.obs.refused.needsScale':
    'Este sistema está en unidades de código, que no nombran longitud, tiempo ni masa, así que no se puede pasar a días y masas solares.',
  'l3e.obs.refused.noStar': 'No hay tal estrella en el sistema.',
  'l3e.obs.refused.massless': 'La estrella no tiene masa.',
  'l3e.obs.refused.badObserver': 'La línea de visión no es una dirección.',
  'l3e.obs.refused.noPlanet':
    'Ningún cuerpo de este sistema está en una órbita ligada a la estrella elegida.',
  'l3e.obs.refused.needsRadii':
    'Un tránsito necesita un tamaño para la estrella y para cada planeta. Escríbelos arriba.',
  'l3e.obs.refused.eccentricTransit':
    'El modelo de tránsito necesita órbitas circulares, y este sistema tiene una excéntrica.',
  'l3e.obs.refused.other': 'Se rechazó el sistema: {code}.',
  'l3e.obs.refused.setup': 'Se rechazó la configuración: {why}',
  'l3e.obs.done':
    '{n} puntos, vistos desde el ángulo polar {incl}° y el acimut {az}°.',
  'l3e.obs.plot': '{what} sintético frente al tiempo, {n} puntos',
  'l3e.obs.what.transit': 'Flujo relativo',
  'l3e.obs.what.radial-velocity': 'Velocidad radial en metros por segundo',
  'l3e.obs.table': 'Los primeros puntos',
  'l3e.obs.col.time': 'Tiempo (días)',
  'l3e.obs.col.value': 'Valor',
  'l3e.obs.truth': 'Con qué se construyó el modelo',
  'l3e.obs.keep': 'Guardar como evidencia',
  'l3e.obs.download': 'Descargar la observación',
  'l3e.obs.kept':
    'Guardada en tu cuaderno de evidencia. El archivo de la observación se abre en el Observatorio, donde el instrumento de comparación puede superponerlo a datos reales.',
  'l3e.obs.note.assumed': 'supuesto',
  'l3e.obs.note.truth': 'con lo que se construyó el modelo',
  'l3e.obs.warn.osculating':
    'Las órbitas se leen en un instante, y una órbita real se desplaza.',
  'l3e.obs.warn.planetsDoNotInteract':
    'Se trata a los planetas como si no se atrajeran entre sí.',
  'l3e.obs.warn.assumedTeff':
    'La temperatura de la estrella se supuso, no se leyó del sistema.',
  'l3e.obs.warn.assumedDistance':
    'La distancia al sistema se supuso, no se leyó de él.',
  'l3e.obs.warn.unbound': '{id} no está en una órbita ligada y se deja fuera.',
  'l3e.obs.warn.notAboutStar':
    '{id} orbita más a un planeta que a la estrella y se deja fuera.',
};
