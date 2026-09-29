// =============================================================================
// The words for the mission lab (/mission/lab/), in Spanish
// -----------------------------------------------------------------------------
// Imported by js/mission/lab/i18n.js alone. The guides' words are in
// ./es.missionLabGuides.js.
// =============================================================================

export const ES_MISSIONLAB = {
  'ml.doc.title': 'Laboratorio de misiones | Gravitas',
  'ml.title': 'Laboratorio de misiones: a Marte en 2026',
  'ml.intro':
    'Una misión a Marte sobre la efeméride DE441 del JPL, en tres partes guiadas: encontrarse con un depósito en órbita terrestre, elegir el día de salida en la ventana de lanzamiento de 2026 y comparar el diseño por cónicas empalmadas con la nave volada directamente bajo el Sol y los planetas. Edita el plan, calcula y lee cada número en las tablas.',
  'ml.notFor':
    'Software educativo, no diseño operativo de misiones ni navegación. Las posiciones de los planetas son las del JPL, con unos pocos kilómetros de error; todo lo demás es un modelo para enseñar, y la lista al final de la página dice qué deja fuera.',
  'ml.lang': 'Idioma',
  'ml.back': 'Volver a Gravitas',
  'ml.core': 'El núcleo de diseño de misiones',
  'ml.docs': 'Cómo funciona el laboratorio (MISSION_LAB.md)',
  'ml.compute': 'Calcular la misión',
  'ml.cancel': 'Cancelar',
  'ml.savePlan': 'Guardar el plan como archivo',

  'ml.plan.heading': 'El plan',
  'ml.plan.hint':
    'Cada maniobra de la misión, en orden. Las altitudes son sobre el ecuador, en km; la fecha de salida es a las 00:00 de ese día; el tiempo de vuelo va en días enteros.',
  'ml.plan.earth': 'En órbita terrestre',
  'ml.plan.parking': 'Altitud de la órbita de estacionamiento (km)',
  'ml.plan.depot': 'Altitud de la órbita del depósito (km)',
  'ml.plan.phase': 'El depósito va por delante (grados)',
  'ml.plan.departure': 'Salida',
  'ml.plan.date': 'Fecha de salida (AAAA-MM-DD)',
  'ml.plan.tof': 'Tiempo de vuelo (días)',
  'ml.plan.arrival': 'Llegada a Marte',
  'ml.plan.peri': 'Altitud del periapsis de la órbita de captura (km)',
  'ml.plan.apo': 'Altitud del apoapsis de la órbita de captura (km)',
  'ml.plan.correction': 'Corrección en el camino',
  'ml.plan.correctOn': 'Corregir la trayectoria',
  'ml.plan.correctDay': 'El día (tras la salida)',
  'ml.plan.vehicle': 'La nave',
  'ml.plan.dry': 'Masa en seco (kg)',
  'ml.plan.isp': 'Impulso específico (s)',
  'ml.plan.direct': 'El vuelo directo',
  'ml.plan.start': 'Partir desde',
  'ml.plan.startPeriapsis':
    'la órbita del depósito, como partiría una nave real',
  'ml.plan.startCenter':
    'el centro de la Tierra, como supone la cónica empalmada',

  'ml.body.venus': 'Venus',
  'ml.body.earth': 'la Tierra',
  'ml.body.mars': 'Marte',
  'ml.body.jupiter': 'Júpiter',

  'ml.status.working': 'Calculando…',
  'ml.status.done': 'Hecho.',
  'ml.status.refused': 'Rechazado: {why}',
  'ml.status.failed': 'Falló: {why}',
  'ml.refused.input': 'falta un número o está fuera de rango.',
  'ml.refused.sameOrbit':
    'la órbita de estacionamiento y la del depósito son la misma.',
  'ml.refused.revolutions':
    'las transferencias de varias vueltas no se admiten.',
  'ml.refused.collinear':
    'la Tierra y Marte están en la misma dirección desde el Sol en esas fechas.',
  'ml.refused.antipodal':
    'la Tierra y Marte están a menos de 0,06 grados de estar opuestos desde el Sol: el plano de transferencia lo fija entonces el redondeo. Mueve la fecha o el tiempo de vuelo un día.',
  'ml.refused.branchAmbiguous':
    'el plano de transferencia contiene el polo de la eclíptica.',
  'ml.refused.tooFast':
    'ninguna órbita puede hacer la transferencia en ese tiempo.',
  'ml.refused.noConvergence':
    'el método, o la puntería de la corrección, no convergió dentro de su límite.',
  'ml.refused.checkFailed':
    'la transferencia no se pudo confirmar llevándola adelante de forma independiente.',
  'ml.problem': '{field}: {why}',
  'ml.problem.value': 'falta un número o está fuera de rango.',
  'ml.problem.sameOrbit': 'debe ser distinta de la órbita de estacionamiento.',
  'ml.problem.date': 'debe ser una fecha, AAAA-MM-DD.',
  'ml.problem.outOfRange':
    'la efeméride cubre del 2025-01-01 al 2045-01-01, llegada incluida.',
  'ml.problem.planet': 'elige un planeta de la efeméride.',
  'ml.problem.samePlanet': 'elige dos planetas distintos.',
  'ml.problem.steps': 'demasiados pasos.',
  'ml.problem.cells': 'demasiadas celdas.',
  'ml.field.parking.altitude': 'Altitud de la órbita de estacionamiento',
  'ml.field.depot.altitude': 'Altitud de la órbita del depósito',
  'ml.field.depot.phaseDeg': 'Adelanto del depósito',
  'ml.field.depart.date': 'Fecha de salida',
  'ml.field.depart.tofDays': 'Tiempo de vuelo',
  'ml.field.arrive.periapsisAltitude': 'Periapsis de captura',
  'ml.field.arrive.apoapsisAltitude':
    'Apoapsis de captura (al menos el periapsis)',
  'ml.field.correct.day':
    'Día de la corrección (al menos 1, y 10 días antes de la llegada)',
  'ml.field.vehicle.dryKg': 'Masa en seco',
  'ml.field.vehicle.ispS': 'Impulso específico',
  'ml.field.direct.bodies': 'Cuerpos',
  'ml.field.direct.start': 'Punto de partida',

  'ml.timeline.table': 'La cronología, como tabla',
  'ml.timeline.heading': 'La cronología de la misión',
  'ml.timeline.slider': 'Día del crucero',
  'ml.timeline.show': 'Ver',
  'ml.timeline.caption': 'Cada suceso, en orden',
  'ml.timeline.at':
    'Día {day} ({date}): la nave de la cónica empalmada está a {patched} de Marte, la volada directamente a {direct}.',
  'ml.event.parking': 'En la órbita de estacionamiento',
  'ml.event.meet1': 'Impulso de encuentro 1',
  'ml.event.meet2': 'Impulso de encuentro 2',
  'ml.event.docked': 'Acoplada al depósito, repostada',
  'ml.event.depart': 'Impulso de salida',
  'ml.event.soi': 'Sale de la esfera de influencia de la Tierra',
  'ml.event.correct': 'Impulso de corrección',
  'ml.event.closest': 'Máxima aproximación a Marte (vuelo directo)',
  'ml.event.arrive': 'Llegada y captura',
  'ml.event.capture': 'Impulso de captura',

  'ml.col.quantity': 'Magnitud',
  'ml.col.value': 'Valor',
  'ml.col.event': 'Suceso',
  'ml.col.date': 'Fecha',
  'ml.col.dv': 'Delta-v',
  'ml.col.view': 'En las vistas',
  'ml.col.body': 'Cuerpo',
  'ml.col.sun': 'Desde el Sol',
  'ml.col.mars': 'Desde Marte',
  'ml.col.burn': 'Impulso',
  'ml.col.propellant': 'Propelente',
  'ml.col.massBefore': 'Masa antes',
  'ml.col.choice': 'Elección',
  'ml.col.tof': 'Vuelo',
  'ml.col.c3': 'C3',
  'ml.col.vinf': 'Velocidad de exceso a la llegada',
  'ml.col.total': 'Ambos impulsos',
  'ml.col.use': 'Usarla',

  'ml.views.table': 'Las posiciones el día elegido, como tabla',
  'ml.views.heading': 'La geometría',
  'ml.views.positions': 'Dónde está cada uno el {date}',
  'ml.views.earth': 'la Tierra',
  'ml.views.mars': 'Marte',
  'ml.views.patched': 'Nave, cónica empalmada',
  'ml.views.direct': 'Nave, volada directamente',
  'ml.views.top': 'Desde encima de la eclíptica',
  'ml.views.topAlt':
    'El Sol en el centro; las órbitas de la Tierra y de Marte durante el crucero; la transferencia por cónica empalmada y la nave volada directamente (a trazos). Los puntos marcan dónde está cada uno el día elegido.',
  'ml.views.side':
    'Desde el borde de la eclíptica, alturas multiplicadas por {k}',
  'ml.views.sideAlt':
    'Lo mismo visto de canto, con cada altura sobre la eclíptica multiplicada por {k} para que las inclinaciones se vean.',
  'ml.views.departure': 'Al dejar la Tierra',
  'ml.views.departureAlt':
    'La órbita del depósito, a {rp} del centro de la Tierra a {vc}, y las primeras 20 horas de la hipérbola de salida.',

  'ml.results.table': 'Los números de la misión, como tablas',
  'ml.results.heading': 'La misión en números',
  'ml.results.earthOrbit': 'En órbita terrestre',
  'ml.results.lead': 'Adelanto del depósito que necesita la transferencia',
  'ml.results.wait': 'Espera antes del primer impulso',
  'ml.results.rvTime': 'Tiempo de transferencia',
  'ml.results.rvTotal': 'El encuentro, ambos impulsos',
  'ml.results.turn5':
    'Girar el plano de la órbita del depósito 5 grados costaría',
  'ml.results.patched': 'El diseño por cónicas empalmadas',
  'ml.results.depart': 'Salida',
  'ml.results.arrive': 'Llegada',
  'ml.results.c3': 'C3 de salida',
  'ml.results.vinfDep': 'Velocidad de exceso a la salida',
  'ml.results.declination': 'Su declinación (sobre la eclíptica)',
  'ml.results.vinfArr': 'Velocidad de exceso a la llegada',
  'ml.results.departDv': 'Impulso de salida',
  'ml.results.captureDv': 'Impulso de captura',
  'ml.results.captureOrbit': 'Periodo de la órbita de captura',
  'ml.results.direct': 'La misma nave, volada directamente',
  'ml.results.bodies': 'Atraída por',
  'ml.results.sunOnly': 'el Sol solo',
  'ml.results.start': 'Partió desde',
  'ml.results.miss': 'Distancia a Marte en la llegada prevista',
  'ml.results.closest': 'Máxima aproximación a Marte',
  'ml.results.closestValue': '{km}, el {date}',
  'ml.results.drift': 'Marte en la integración, desde Marte en la efeméride',
  'ml.results.correction': 'La corrección',
  'ml.results.correctionDay': 'Tras la salida',
  'ml.results.correctionDv': 'Su delta-v',
  'ml.results.aims': 'Punterías hasta acertar',
  'ml.results.missAfter': 'Después falla Marte por',
  'ml.results.budget': 'Delta-v y propelente, impulso a impulso',
  'ml.results.total': 'Total',
  'ml.results.resources': 'De dónde sale el propelente',
  'ml.results.launchLoad':
    'Lo que deja en los tanques el lanzamiento, para el encuentro',
  'ml.results.depotLoad': 'Cargado en el depósito, para el resto',
  'ml.results.exhaust': 'Velocidad de escape de los gases',
  'ml.results.solver': 'Cómo le fue al método de Lambert',
  'ml.results.solverStatus': 'Estado',
  'ml.results.solverOk': 'Convergió y se confirmó',
  'ml.results.iterations': 'Iteraciones',
  'ml.results.residual': 'Residuo del tiempo de vuelo (relativo)',
  'ml.results.solverMiss':
    'Comprobación independiente: error en Marte (relativo)',

  'ml.unit.ms': '{v} m/s',
  'ml.unit.kms': '{v} km/s',
  'ml.unit.km': '{v} km',
  'ml.unit.kg': '{v} kg',
  'ml.unit.days': '{v} días',
  'ml.unit.c3': '{v} km²/s²',
  'ml.unit.deg': '{v}°',
  'ml.unit.h': '{v} h',
  'ml.unit.min': '{v} min',
  'ml.unit.au': '{v} UA',

  'ml.window.heading': 'La ventana de lanzamiento de 2026',
  'ml.window.hint':
    'Una transferencia de Lambert por cada día de salida del 2026-09-01 al 2027-01-29 y cada tiempo de vuelo de 150 a 400 días, entre las posiciones de la Tierra y de Marte en la efeméride, en tres dimensiones: la suma del impulso de salida desde la órbita del depósito y del impulso de captura en el periapsis de la órbita de captura.',
  'ml.window.go': 'Calcular la ventana',
  'ml.window.running': 'Calculando: {percent} %',
  'ml.window.ok': 'Terminado: {n} celdas.',
  'ml.window.canceled':
    'Cancelado: se muestran las celdas calculadas hasta ahora.',
  'ml.window.timeLimit':
    'Detenido en el límite de tiempo: se muestran las celdas calculadas hasta ahora.',
  'ml.window.alt':
    'Ventana de transferencia de la Tierra a Marte: salida del {d1} (izquierda) al {d2} (derecha), tiempo de vuelo de {t1} a {t2} días (de abajo arriba). Más oscuro es más barato; la celda más barata es {best}, saliendo el {date} por {tof} días.',
  'ml.window.cheap': 'La más barata, {v}',
  'ml.window.dear': 'El doble, {v}, o más',
  'ml.window.axes':
    'A lo ancho: fecha de salida. Hacia arriba: tiempo de vuelo. Gris: rechazada.',
  'ml.window.candidates': 'Cuatro maneras de elegir',
  'ml.window.cheapest': 'La más barata en delta-v',
  'ml.window.lowC3': 'El menor C3 de salida (lo que mira el lanzador)',
  'ml.window.lowVinf':
    'La llegada más lenta (lo que mira el módulo de aterrizaje)',
  'ml.window.fastest': 'El viaje más corto dentro de un 10 % de la más barata',
  'ml.window.use': 'Usar esta',

  'ml.check.heading': 'Los casos de referencia',
  'ml.check.hint':
    'La efeméride frente a estados del JPL que no se ajustaron y a elementos publicados, y cada paso de la misión volado por el núcleo en 3-D validado, todo en el Worker. Cada tolerancia está fijada de antemano.',
  'ml.check.go': 'Ejecutar los casos de referencia',
  'ml.check.caption': 'Cada medida frente a su tolerancia',
  'ml.check.case': 'Caso',
  'ml.check.measure': 'Medida',
  'ml.check.expected': 'Esperado',
  'ml.check.result': 'Resultado',
  'ml.check.pass': 'correcto',
  'ml.check.fail': 'fallo',
  'ml.check.done': 'Terminado: {n} medidas, {failed} fallidas.',

  'ml.limits.heading': 'Lo que este modelo deja fuera',
  'ml.limits.intro':
    'Las posiciones de los planetas son las de la DE441 del JPL, con unos pocos kilómetros de error de 2025 a 2045. Todo lo demás es un modelo para enseñar:',
  'ml.limits.impulsive':
    'Cada impulso es instantáneo: sin impulsos finitos, sin pérdidas por gravedad, sin encendido ni regulación del motor.',
  'ml.limits.soi':
    'El diseño es una cónica empalmada: dentro de la esfera de influencia de un planeta solo atrae el planeta, fuera solo el Sol. El vuelo directo muestra lo que eso cuesta.',
  'ml.limits.pullers':
    'En el vuelo directo solo atraen el Sol y los planetas marcados: ni Mercurio, Saturno, Urano, Neptuno, la Luna ni los asteroides.',
  'ml.limits.moon':
    'La Luna queda fuera por completo, aunque es la que más atrae a una nave que deja la Tierra.',
  'ml.limits.shape':
    'Cada cuerpo es una masa puntual: sin achatamiento (el J2 de la Tierra gira el plano de una órbita de estacionamiento), sin atmósfera, sin rozamiento.',
  'ml.limits.relativity':
    'Sin presión de radiación, sin desgasificación, sin relatividad.',
  'ml.limits.ephemeris':
    'En el vuelo directo los planetas parten de sus estados en la efeméride y luego se mueven bajo las atracciones del propio modelo, así que en la llegada se han alejado de los del JPL hasta unos miles de kilómetros.',
  'ml.limits.aiming':
    'La corrección apunta al centro de Marte como lo hace el tramo heliocéntrico, sin que Marte atraiga: una misión real apunta a un punto junto a Marte (el plano B), algo que este laboratorio no admite.',
  'ml.limits.launch':
    'No hay lanzamiento: la nave parte en su órbita de estacionamiento, y el depósito se da por hecho.',
  'ml.limits.operations':
    'No hay navegación, ni seguimiento, ni incertidumbre: cada estado se conoce exactamente. Las misiones reales se diseñan con modelos mucho más completos y vuelan con determinación de órbitas.',
  'ml.limits.why':
    'Por eso es software educativo y no diseño operativo de misiones: conserva las ideas en que se apoya una misión y muestra lo grande que puede ser lo que deja fuera, que es justo lo que una herramienta de diseño nunca debe hacer.',

  'ml.guide.heading': 'Misión guiada',
  'ml.guide.path': 'Recorrido',
  'ml.guide.intro': 'Introductorio',
  'ml.guide.advanced': 'Avanzado',
  'ml.guide.steps': 'Todos los pasos',
  'ml.guide.name': 'Tu nombre, para el informe (opcional)',
  'ml.guide.report': 'Guardar el informe como archivo',
  'ml.guide.count': 'Paso {n} de {of}',
  'ml.guide.choose': 'Elige una',
  'ml.guide.answer': 'Tu respuesta ({unit})',
  'ml.guide.explain': 'Tu explicación (al menos {n} palabras)',
  'ml.guide.check': 'Comprobar',
  'ml.guide.checkDo': 'Comprobar que está hecho',
  'ml.guide.showMe': 'Muéstramelo',
  'ml.guide.back': 'Atrás',
  'ml.guide.next': 'Siguiente',
  'ml.guide.notYet': 'Todavía no: el laboratorio no lo muestra hecho.',
  'ml.guide.tooShort': 'Escribe al menos {n} palabras; llevas {have}.',
  'ml.guide.computeFirst':
    'Calcula primero la misión: la respuesta se lee de ella.',
  'ml.guide.wrong':
    'No del todo. Vuelve a mirar las tablas, o pide que te lo muestren.',
  'ml.guide.shown': 'La respuesta: {answer}.',
  'ml.guide.passed': 'superado',
  'ml.guide.wasShown': 'mostrado',
};
