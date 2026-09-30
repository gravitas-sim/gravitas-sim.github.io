// =============================================================================
// The words for the mission-design diagnostics page (/mission/), in Spanish
// -----------------------------------------------------------------------------
// Imported by js/mission/i18n.js alone.
// =============================================================================

export const ES_MISSION = {
  'mission.doc.title': 'Diagnóstico de diseño de misiones | Gravitas',
  'mission.title': 'Diagnóstico de diseño de misiones',
  'mission.intro':
    'El núcleo de diseño de misiones, ejecutado en un Worker: transferencias entre órbitas circulares, cambios de plano, encuentros, el problema de Lambert, cónicas empalmadas, ventanas de transferencia y sobrevuelos. Cada respuesta dice qué supuso, cómo convergió su método o por qué se rechazó. Es una página de diagnóstico, no un plan de estudios.',
  'mission.notFor':
    'Un modelo educativo. Sus números no son diseño operativo de misiones ni navegación: los planetas se mueven en círculos en un mismo plano, los impulsos son instantáneos y solo atraen los cuerpos nombrados.',
  'mission.kernel': 'El núcleo en 3-D',
  'mission.docs': 'Cómo funciona el núcleo (MISSION.md)',
  'mission.compute': 'Calcular',
  'mission.cancel': 'Cancelar',
  'mission.export': 'Guardar el plan como archivo',
  'mission.body': 'En órbita de',
  'mission.planet': 'Planeta',
  'mission.from': 'Desde',
  'mission.to': 'Hasta',

  'mission.bodyName.sun': 'el Sol',
  'mission.bodyName.venus': 'Venus',
  'mission.bodyName.earth': 'la Tierra',
  'mission.bodyName.mars': 'Marte',
  'mission.bodyName.jupiter': 'Júpiter',

  'mission.transfer.heading': 'Entre dos órbitas circulares',
  'mission.transfer.hint':
    'De una órbita circular a otra alrededor del mismo cuerpo: la transferencia de Hohmann, la bielíptica por un apoápside intermedio y un cambio de plano repartido entre los dos impulsos de la forma que menos cuesta. Las altitudes son sobre el ecuador, en km.',
  'mission.transfer.h1': 'Altitud inicial (km)',
  'mission.transfer.h2': 'Altitud final (km)',
  'mission.transfer.hb': 'Altitud del apoápside bielíptico (km)',
  'mission.transfer.di': 'Cambio de plano (grados)',
  'mission.transfer.caption': 'Transferencias comparadas',
  'mission.transfer.hohmann': 'Hohmann',
  'mission.transfer.biElliptic': 'Bielíptica',
  'mission.transfer.limit': 'Bielíptica, apoápside en el infinito',
  'mission.plane.caption': 'El cambio de plano',
  'mission.plane.apoapsis': 'Todo en el segundo impulso',
  'mission.plane.best': 'Repartido de la mejor forma',
  'mission.plane.split': 'Cambiado en el primer impulso',
  'mission.plane.search': 'Hallado por',
  'mission.plane.searchValue': 'búsqueda de la sección áurea, {n} pasos',

  'mission.meet.heading': 'Encuentro y ajuste de fase',
  'mission.meet.hint':
    'Alcanzar un objetivo en una órbita circular. En otra órbita, una transferencia de Hohmann que sale cuando el objetivo va adelante el ángulo justo; en la misma órbita, una órbita de fase que vuelve tras cierto número de vueltas. El adelanto del objetivo es cuánto va por delante de la nave ahora.',
  'mission.meet.h1': 'Altitud de la nave (km)',
  'mission.meet.h2': 'Altitud del objetivo (km)',
  'mission.meet.phase': 'Adelanto del objetivo (grados)',
  'mission.meet.laps': 'Vueltas (misma órbita)',
  'mission.meet.caption': 'El encuentro',
  'mission.meet.kind': 'Método',
  'mission.meet.phasing': 'Una órbita de fase',
  'mission.meet.rendezvous': 'Una transferencia de Hohmann',
  'mission.meet.orbit': 'Órbita de fase',
  'mission.meet.orbitValue':
    'semieje mayor {a}, el otro ápside a {other} de altitud',
  'mission.meet.duration': 'Hasta el encuentro',
  'mission.meet.lead': 'Adelanto necesario en el primer impulso',
  'mission.meet.wait': 'Espera hasta entonces',
  'mission.meet.synodic': 'Una ocasión perdida vuelve tras',
  'mission.meet.transfer': 'Tiempo de transferencia',

  'mission.lambert.heading': 'El problema de Lambert',
  'mission.lambert.hint':
    'La órbita de una posición a otra en un tiempo dado, sin vueltas completas. Las posiciones son x, y, z en km desde el centro del cuerpo, separadas por comas, o por punto y coma cuando la coma es el separador decimal. La respuesta se comprueba llevándola adelante de forma independiente; la que no se puede confirmar se rechaza.',
  'mission.lambert.r1': 'Posición inicial (km)',
  'mission.lambert.r2': 'Posición final (km)',
  'mission.lambert.tof': 'Tiempo de vuelo (s)',
  'mission.lambert.direction': 'Sentido',
  'mission.direction.prograde': 'Directo (antihorario alrededor de +z)',
  'mission.direction.retrograde': 'Retrógrado',
  'mission.lambert.caption': 'La órbita de transferencia',
  'mission.lambert.v1': 'Velocidad al inicio',
  'mission.lambert.v2': 'Velocidad al final',
  'mission.lambert.conic': 'Cónica',
  'mission.lambert.a': 'Semieje mayor',
  'mission.lambert.angle': 'Ángulo de transferencia',
  'mission.lambert.branch': 'Rama',
  'mission.conic.ellipse': 'Elipse',
  'mission.conic.hyperbola': 'Hipérbola',
  'mission.conic.parabola': 'Parábola, dentro del redondeo',
  'mission.branch.short': 'El camino corto (menos de 180 grados)',
  'mission.branch.long': 'El camino largo (más de 180 grados)',
  'mission.solver.caption': 'Cómo le fue al método',
  'mission.solver.status': 'Estado',
  'mission.solver.ok': 'Convergió y se confirmó',
  'mission.solver.iterations': 'Iteraciones',
  'mission.solver.residual': 'Residuo del tiempo de vuelo (relativo)',
  'mission.solver.miss':
    'Comprobación independiente: error al final (relativo)',
  'mission.solver.condition':
    'Condicionamiento, 1 / |sen del ángulo de transferencia|',

  'mission.planets.heading': 'Entre planetas, por cónicas empalmadas',
  'mission.planets.hint':
    'Una transferencia de Hohmann entre las órbitas modelo de dos planetas, saliendo de una órbita circular de estacionamiento y entrando en otra: la elipse heliocéntrica y una hipérbola en cada extremo, dentro de la esfera de influencia del planeta.',
  'mission.planets.h1': 'Altitud de estacionamiento a la salida (km)',
  'mission.planets.h2': 'Altitud de estacionamiento a la llegada (km)',
  'mission.planets.caption': 'La transferencia por cónicas empalmadas',
  'mission.planets.tof': 'Tiempo de vuelo',
  'mission.planets.depart.vinf': 'Velocidad de exceso a la salida',
  'mission.planets.depart.dv': 'Impulso de salida',
  'mission.planets.depart.soi': 'Esfera de influencia a la salida',
  'mission.planets.arrive.vinf': 'Velocidad de exceso a la llegada',
  'mission.planets.arrive.dv': 'Impulso de captura',
  'mission.planets.arrive.soi': 'Esfera de influencia a la llegada',

  'mission.window.heading': 'Ventanas de transferencia',
  'mission.window.hint':
    'Un problema de Lambert por cada fecha de salida y tiempo de vuelo entre las órbitas modelo de dos planetas: la suma de los impulsos de salida y de captura desde órbitas de estacionamiento a 300 km. Las celdas que el método rechazó se dibujan como huecos; la línea de las transferencias de 180 grados cruza todas las ventanas.',
  'mission.window.start': 'Primera salida (AAAA-MM-DD)',
  'mission.window.span': 'Intervalo de salidas (días)',
  'mission.window.tof1': 'Vuelo más corto (días)',
  'mission.window.tof2': 'Vuelo más largo (días)',
  'mission.window.steps': 'Pasos en cada eje',
  'mission.window.csv': 'Guardar la malla como CSV',
  'mission.window.running': 'Calculando: {percent} %',
  'mission.window.ok': 'Terminado: {n} celdas en {s} s.',
  'mission.window.canceled':
    'Cancelado: se muestran las celdas calculadas hasta ahora.',
  'mission.window.timeLimit':
    'Detenido en el límite de tiempo: se muestran las celdas calculadas hasta ahora.',
  'mission.window.alt':
    'Ventana de transferencia de {from} a {to}: salida del {d1} (izquierda) al {d2} (derecha), tiempo de vuelo de {t1} a {t2} días (de abajo arriba). Más oscuro es más barato; el círculo marca la celda más barata, {best}.',
  'mission.window.cheap': 'La más barata, {v}',
  'mission.window.dear': 'El doble, {v}, o más',
  'mission.window.refusedCell': 'Rechazada por el método',
  'mission.window.axes':
    'A lo ancho: fecha de salida. Hacia arriba: tiempo de vuelo.',
  'mission.window.bestCaption': 'La celda más barata',
  'mission.window.depart': 'Salida',
  'mission.window.tof': 'Tiempo de vuelo',
  'mission.window.c3': 'C3 de salida',
  'mission.window.vinf': 'Velocidad de exceso a la llegada',
  'mission.window.total': 'Suma de ambos impulsos',
  'mission.cell.ok': 'Convergió y se confirmó',
  'mission.cell.collinear': 'Rechazada: colineal',
  'mission.cell.antipodal': 'Rechazada: a menos de 0,06 grados de 180',
  'mission.cell.branchAmbiguous': 'Rechazada: sentido ambiguo',
  'mission.cell.tooFast': 'Rechazada: demasiado rápida para la rama',
  'mission.cell.noConvergence': 'Rechazada: no convergió',
  'mission.cell.checkFailed': 'Rechazada: no se pudo confirmar',
  'mission.cell.input': 'Rechazada: entrada no válida',
  'mission.window.countsCaption': 'Las {n} celdas',

  'mission.flyby.heading': 'Sobrevuelos',
  'mission.flyby.hint':
    'Un sobrevuelo sin propulsión en un plano: el planeta gira la velocidad de aproximación un ángulo que fija la máxima aproximación, y su módulo no cambia. La máxima aproximación no puede quedar bajo la superficie.',
  'mission.flyby.vinf': 'Velocidad de exceso de aproximación (km/s)',
  'mission.flyby.h': 'Altitud de máxima aproximación (km)',
  'mission.flyby.side': 'Giro',
  'mission.flyby.side.left': 'Antihorario',
  'mission.flyby.side.right': 'Horario',
  'mission.flyby.caption': 'El sobrevuelo',
  'mission.flyby.e': 'Excentricidad',
  'mission.flyby.turn': 'Ángulo de giro',
  'mission.flyby.dv': 'Cambio de velocidad, sin combustible',
  'mission.flyby.vp': 'Rapidez en la máxima aproximación',
  'mission.flyby.out': 'Velocidad de exceso a la salida',
  'mission.flyby.soi': 'Esfera de influencia',

  'mission.check.heading': 'Los casos de referencia',
  'mission.check.hint':
    'Ejemplos de libro de texto con sus propias constantes, constantes de forma cerrada deducidas a mano y el núcleo en 3-D validado volando la respuesta de cada método, todo en el Worker. Cada tolerancia está fijada de antemano.',
  'mission.check.go': 'Ejecutar los casos de referencia',
  'mission.check.caption': 'Cada medida frente a su tolerancia',
  'mission.check.case': 'Caso',
  'mission.check.kind': 'Tipo',
  'mission.check.measure': 'Medida',
  'mission.check.expected': 'Esperado',
  'mission.check.result': 'Resultado',
  'mission.check.pass': 'correcto',
  'mission.check.fail': 'fallo',
  'mission.check.done': 'Terminado: {n} medidas, {failed} fallidas, en {s} s.',
  'mission.kind.textbook': 'Libro de texto',
  'mission.kind.analytic': 'Forma cerrada',
  'mission.kind.independent': 'El núcleo en 3-D',

  'mission.scope.heading': 'Lo que hace el núcleo, y lo que no',
  'mission.scope.supported': 'Admitido',
  'mission.scope.unsupported': 'No admitido',
  'mission.scope.yes.hohmann':
    'Transferencias de Hohmann entre órbitas circulares coplanares',
  'mission.scope.yes.biElliptic':
    'Transferencias bielípticas, y su límite en el infinito',
  'mission.scope.yes.plane':
    'Cambios de plano, solos o combinados con los impulsos de una transferencia de Hohmann',
  'mission.scope.yes.meet':
    'Encuentros por una transferencia de Hohmann, y ajuste de fase en una órbita circular',
  'mission.scope.yes.lambert':
    'El problema de Lambert sin vueltas completas, en ambos sentidos, elipse o hipérbola',
  'mission.scope.yes.patched':
    'Salidas y capturas por cónicas empalmadas entre los planetas del modelo',
  'mission.scope.yes.window':
    'Ventanas de transferencia en las órbitas circulares de los planetas del modelo',
  'mission.scope.yes.flyby': 'Sobrevuelos sin propulsión en un plano',
  'mission.scope.no.multiRev': 'Transferencias de Lambert de varias vueltas',
  'mission.scope.no.lowThrust': 'Impulsos finitos o de bajo empuje',
  'mission.scope.no.ephemeris':
    'Posiciones reales de los planetas: se mueven en círculos',
  'mission.scope.no.nBody':
    'Trayectorias voladas bajo todos los cuerpos a la vez (el núcleo solo comprueba)',
  'mission.scope.no.poweredFlyby':
    'Sobrevuelos con propulsión y secuencias de sobrevuelos',
  'mission.scope.no.bPlane':
    'Puntería de sobrevuelos en tres dimensiones (plano B)',
  'mission.scope.no.navigation':
    'Determinación de órbitas, navegación u operaciones de cualquier tipo',

  'mission.col.quantity': 'Magnitud',
  'mission.col.value': 'Valor',
  'mission.col.transfer': 'Transferencia',
  'mission.col.dv': 'Delta-v',
  'mission.col.time': 'Tiempo',
  'mission.col.status': 'Estado',
  'mission.col.cells': 'Celdas',
  'mission.budget.caption': 'Presupuesto de delta-v',
  'mission.budget.burn': 'Impulso',
  'mission.budget.at': 'En',
  'mission.budget.dv': 'Delta-v',
  'mission.budget.di': 'Cambio de plano',
  'mission.budget.n': 'Impulso {n}',
  'mission.budget.total': 'Total',
  'mission.timeline.caption': 'Cronología',
  'mission.timeline.t': 'Tiempo',
  'mission.timeline.event': 'Suceso',
  'mission.event.wait': 'Espera en la órbita inicial',
  'mission.event.burn': 'Impulso {n}: {dv}',
  'mission.event.meet': 'Encuentro con el objetivo',
  'mission.event.arrive': 'Llegada',
  'mission.event.depart': 'Salida: {dv}',
  'mission.event.capture': 'Captura: {dv}',

  'mission.unit.kms': '{v} km/s',
  'mission.unit.kmsBare': 'km/s',
  'mission.unit.km': '{v} km',
  'mission.unit.deg': '{v}°',
  'mission.unit.min': '{v} min',
  'mission.unit.h': '{v} h',
  'mission.unit.d': '{v} días',
  'mission.unit.c3': '{v} km²/s²',
  'mission.unit.forever': 'sin límite',

  'mission.status.working': 'Calculando…',
  'mission.status.done': 'Hecho.',
  'mission.status.refused': 'Rechazado: {why}',
  'mission.status.failed': 'Falló: {why}',
  'mission.refused.input':
    'falta un número, no es finito o está fuera de rango.',
  'mission.refused.sameOrbit': 'las dos órbitas son la misma.',
  'mission.refused.intermediate':
    'el apoápside intermedio debe estar al menos tan alto como ambas órbitas.',
  'mission.refused.belowSurface': 'la trayectoria pasaría bajo la superficie.',
  'mission.refused.outOfPlane': 'el sobrevuelo debe estar en un plano.',
  'mission.refused.revolutions':
    'las transferencias de varias vueltas no se admiten.',
  'mission.refused.collinear':
    'las dos posiciones apuntan en el mismo sentido, y cualquier plano las contiene.',
  'mission.refused.antipodal':
    'las dos posiciones están a menos de 0,06 grados de ser opuestas, donde el plano, y con él las velocidades, los fija el redondeo. Una transferencia de 180 grados entre círculos es una transferencia de Hohmann.',
  'mission.refused.branchAmbiguous':
    'el plano de transferencia contiene el polo, así que directo y retrógrado son lo mismo.',
  'mission.refused.tooFast':
    'el tiempo es más corto de lo que puede lograr cualquier órbita de esta rama.',
  'mission.refused.noConvergence':
    'el método no convergió dentro de su límite de iteraciones.',
  'mission.refused.checkFailed':
    'la respuesta no se pudo confirmar: llevada adelante de forma independiente, falla el final por más de 1e-8 de la distancia.',
  'mission.problem.input': 'El problema está incompleto.',
  'mission.problem.kind': 'Ese tipo de problema no se admite.',
  'mission.problem.body': 'Ese cuerpo no está en el modelo.',
  'mission.problem.planet': 'Elige un planeta del modelo.',
  'mission.problem.samePlanet': 'Elige dos planetas distintos.',
  'mission.problem.value': 'Falta un número o está fuera de rango.',
  'mission.problem.steps': 'Los pasos deben ser un número entero de 1 a {max}.',
  'mission.problem.cells': 'La ventana puede tener como mucho {max} celdas.',
  'mission.problem.vector': 'Una posición necesita tres números.',
  'mission.problem.date': 'La primera salida debe ser una fecha, AAAA-MM-DD.',
};
