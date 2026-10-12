// El panel de evidencia del laboratorio de misiones: su español
// (js/mission/lab/evidencePanel.js), con los mismos ids que
// ./en.missionEvidence.js. El botón que lo abre es ml.ev.open en
// ./es.missionLab.js.

export const ES_MISSIONEVIDENCE = {
  'mle.heading': 'Evidencia y Mi trabajo',
  'mle.intro':
    'Guarda un resultado de este plan como evidencia para un informe, compara el diseño por cónicas empalmadas con la nave volada directamente, guarda la misión en Mi trabajo o copia un enlace que abre este plan. Cada número de un resultado guardado dice qué es: lo que elegiste en el plan es supuesto, y lo que el modelo calculó a partir de eso es derivado. Ninguno tiene incertidumbre, porque este es un modelo didáctico sin navegación ni seguimiento.',
  'mle.close': 'Cerrar',

  'mle.keep.heading': 'Guardar un resultado como evidencia',
  'mle.keep.kind': 'Resultado',
  'mle.keep.button': 'Guardar como evidencia',
  'mle.keep.none': 'Calcula primero la misión y sus resultados estarán aquí.',
  'mle.keep.kept':
    'Guardado en tu cuaderno de evidencia, donde tu informe lo cita y Mi trabajo lo lista.',
  'mle.keep.failed': 'No se pudo guardar: {why}',
  'mle.keep.whyUnavailable': 'este navegador no está guardando nada',
  'mle.keep.whyFull': 'el cuaderno está lleno',
  'mle.kind.timeline': 'La cronología de eventos',
  'mle.kind.maneuvers': 'Las maniobras',
  'mle.kind.budget': 'El presupuesto de delta-v',
  'mle.kind.comparison': 'La cónica empalmada frente al vuelo propagado',

  'mle.title.timeline': 'Cronología de la misión, salida el {date}',
  'mle.title.maneuvers': 'Maniobras de la misión, salida el {date}',
  'mle.title.budget': 'Presupuesto de delta-v, salida el {date}',
  'mle.title.comparison':
    'Cónica empalmada frente al vuelo propagado, salida el {date}',
  'mle.note.assumed': 'elegido en el plan',

  'mle.q.depart.jd': 'Fecha de salida (fecha juliana)',
  'mle.q.depart.tof': 'Tiempo de vuelo',
  'mle.q.correct.day': 'Día del impulso de corrección',
  'mle.q.parking.altitude': 'Altura de la órbita de espera',
  'mle.q.depot.altitude': 'Altura de la órbita del depósito',
  'mle.q.depot.phase': 'Ángulo de ventaja del depósito',
  'mle.q.arrive.periapsis': 'Altura del periapsis de la órbita de captura',
  'mle.q.arrive.apoapsis': 'Altura del apoapsis de la órbita de captura',
  'mle.q.vehicle.dry': 'Masa en seco',
  'mle.q.vehicle.isp': 'Impulso específico',
  'mle.q.direct.bodies': 'Planetas que tiran de la nave en el vuelo directo',
  'mle.q.direct.fromCenter':
    'El vuelo directo parte del centro de la Tierra (1) o de la órbita (0)',
  'mle.q.vinf.departure': 'Velocidad de exceso hiperbólico en la salida',
  'mle.q.vinf.arrival': 'Velocidad de exceso hiperbólico en la llegada',
  'mle.q.capture.period': 'Período de la órbita de captura',
  'mle.q.dv.total': 'Delta-v total',
  'mle.q.propellant.earthOrbit':
    'Propelente de los impulsos en órbita terrestre',
  'mle.q.propellant.interplanetary':
    'Propelente de los impulsos interplanetarios',
  'mle.q.exhaust.earthOrbit':
    'Velocidad de escape de gases, impulsos en órbita terrestre',
  'mle.q.exhaust.interplanetary':
    'Velocidad de escape de gases, impulsos interplanetarios',
  'mle.q.miss.arrival': 'Distancia a la que falla Marte, en vuelo directo',
  'mle.q.residual.first': 'Residuo en la salida',
  'mle.q.residual.max': 'Mayor residuo',
  'mle.q.residual.max.day': 'Día del mayor residuo',
  'mle.q.residual.last': 'Residuo en la llegada',
  'mle.q.closest.distance': 'Mayor acercamiento a Marte, en vuelo directo',
  'mle.q.closest.day': 'Día del mayor acercamiento',
  'mle.q.mars.drift': 'Deriva de Marte en el vuelo directo',
  'mle.q.correction.dv': 'Delta-v del impulso de corrección',
  'mle.q.correction.miss': 'Distancia a la que falla Marte tras la corrección',
  'mle.q.event': 'Evento: {name} (fecha juliana)',
  'mle.q.burn.jd': 'Impulso: {name} (fecha juliana)',
  'mle.q.burn.dv': 'Impulso: {name}, delta-v',
  'mle.q.burn.propellant': 'Impulso: {name}, propelente',
  'mle.q.burn.massBefore': 'Impulso: {name}, masa antes',

  'mle.cmp.heading': 'La cónica empalmada frente al vuelo propagado',
  'mle.cmp.intro':
    'El diseño por cónicas empalmadas dice dónde está la nave cada día. El vuelo propagado es la misma nave integrada bajo el Sol y los planetas que marcaste. El residuo es la distancia entre las dos.',
  'mle.cmp.distance': 'Distancia a Marte (km, logarítmico)',
  'mle.cmp.residual': 'Residuo (km, logarítmico)',
  'mle.cmp.days': 'Días tras la salida',
  'mle.cmp.alt':
    'Dos gráficas a lo largo de {tof} días. Distancia a Marte: la nave de la cónica empalmada termina a {pEnd} y la propagada a {dEnd}. Residuo entre las dos naves: {first} en la salida, como máximo {max} el día {day}, {last} en la llegada.',
  'mle.cmp.table': 'Los dos vuelos cada {n} días',
  'mle.cmp.col.day': 'Día',
  'mle.cmp.col.patched': 'Empalmada: a Marte',
  'mle.cmp.col.direct': 'Propagada: a Marte',
  'mle.cmp.col.residual': 'Residuo',
  'mle.cmp.corrected':
    'El plan tiene una corrección el día {day}, así que el vuelo propagado se apunta de nuevo entonces y el residuo se reduce después.',
  'mle.cmp.uncorrected':
    'El plan no tiene corrección, así que nada vuelve a apuntar a Marte el vuelo propagado, y el residuo es lo que el diseño deja fuera.',
  'mle.cmp.none': 'Calcula primero la misión y la comparación estará aquí.',
  'mle.unit.km': '{v} km',

  'mle.save.heading': 'Guardar esta misión',
  'mle.save.hint':
    'La misión guardada es el archivo de plan que escribe el laboratorio: tu plan y lo que resultó de él. Mi trabajo la lista y el laboratorio la abre de nuevo. Un informe cita la evidencia que guardas arriba, no una misión guardada.',
  'mle.save.name': 'Nombre',
  'mle.save.defaultName': 'Misión a Marte',
  'mle.save.button': 'Guardar en Mi trabajo',
  'mle.save.saved':
    'Guardada. Mi trabajo la lista y el laboratorio la abre de nuevo.',
  'mle.save.failed': 'No se pudo guardar: {why}',
  'mle.save.none': 'Calcula primero la misión.',
  'mle.save.open': 'Mi trabajo',

  'mle.link.heading': 'Un enlace que abre este plan',
  'mle.link.label': 'Enlace',
  'mle.link.hint':
    'Quien lo abra obtiene el laboratorio con este plan en el editor. El creador de figuras hace una figura incrustada a partir de él.',
  'mle.link.copy': 'Copiar el enlace',
  'mle.link.copied': 'Copiado.',
  'mle.link.manual': 'Selecciona el enlace y cópialo.',
  'mle.link.none': 'Este plan es demasiado largo para un enlace.',
};
