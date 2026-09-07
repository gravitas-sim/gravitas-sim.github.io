// =============================================================================
// Messages that arrive with the chunk that needs them
// -----------------------------------------------------------------------------
// Strings for panels nobody sees on a first visit: the two scenario-specific
// instruments, the radial velocity analysis workspace, and the transit noise
// budget. Together they are about twelve kilobytes of prose, and every visitor
// was downloading all of it at start-up so that four scenarios and one lesson
// widget could have their labels.
//
// They are a separate catalogue rather than part of js/i18n/es.js because a
// single object cannot be code-split: esbuild follows the static import and
// the whole thing lands in the entry graph. The bridges that load those panels
// register these through registerMessages() at the same moment, so a reader
// who opens one gets the strings and a reader who does not never fetches them.
//
// Everything else about them is normal. The audit and the i18n tests merge
// both halves, so coverage, placeholder and length checks still see one
// catalogue.
// =============================================================================

export const ES_DEFERRED = {
  'binaryRun.close.hint': 'Ocultar el panel de ejecución en binaria',
  'assist.close.hint': 'Ocultar el panel de asistencia gravitatoria',
  'rvfit.close.hint': 'Ocultar el espacio de análisis',
  'rvfit.period': 'Periodo',
  'rvfit.amplitude': 'Amplitud K',
  'rvfit.phase': 'Fase',
  'rvfit.gamma': 'Velocidad sistémica',
  'rvfit.minPeriod': 'Buscar desde',
  'rvfit.maxPeriod': 'hasta',
  'rvfit.snap': 'Mejor ajuste a este periodo',
  'rvfit.search': 'Buscar en este rango',
  'rvfit.reveal': 'Revelar la verdad de la simulación',
  'rvfit.status.none': 'Sin registro',
  'rvfit.status.tooFew': 'No hay medidas suficientes',
  'rvfit.status.points': '{used} medidas ajustadas, {dropped} excluidas',
  'rvfit.status.degraded':
    '(De esas, {n} se interpolaron entre fotogramas demasiado espaciados para resolver la curva, as\u00ed que quedan fuera del ajuste.)',
  'rvfit.status.unverified':
    '({n} se interpolaron con muy poco historial para estimar el error, que es desconocido y no peque\u00f1o. S\u00ed entran en el ajuste.)',
  'rvfit.noStats':
    'Este modelo no se puede evaluar con estas mediciones. Revisa el periodo.',
  'rvfit.tooFew':
    'Un modelo circular tiene cuatro parámetros, así que necesita al menos tres medidas utilizables y este registro tiene {n}.',
  'rvfit.chi2': '\u03c7\u00b2 reducida {reduced}, RMS de residuos {rms} m/s',
  'rvfit.noChi2':
    'RMS de residuos {rms} m/s. Sin \u03c7\u00b2 reducida, porque estas medidas no llevan incertidumbres utilizables y una \u03c7\u00b2 calculada con pesos inventados no significaría nada.',
  'rvfit.rivalsList':
    'Periodos que ajustan dentro de \u0394\u03c7\u00b2 = 1 del mejor: {list}. Nada en estos datos los distingue.',
  'rvfit.oneMinimum':
    'Un mínimo claro en el rango buscado. Eso dice algo sobre este rango y este muestreo, no es una detección.',
  'rvfit.structured':
    'Los residuos cambian de signo {runs} veces donde por azar se esperarían {expected}. Tienen una forma, así que al modelo circular le falta algo.',
  'rvfit.unstructured':
    'Los residuos cambian de signo {runs} veces frente a las {expected} esperadas por azar, que es lo que parece ruido disperso.',
  'rvfit.truth':
    'La simulación usó: periodo {period} d, K {K} m/s, velocidad sistémica {gamma} m/s.',
  'rvfit.noTruth':
    'Este registro no lleva sus parámetros generadores, así que no hay nada que revelar.',
  'rvfit.badBounds':
    'La búsqueda necesita un rango con un límite inferior positivo por debajo del superior.',
  'rvfit.noData': 'Toma primero un registro',
  'rvfit.noSearch':
    'Ejecuta una búsqueda acotada para ver la curva de \u03c7\u00b2',
  'rvfit.plot.time': 'medidas y modelo',
  'rvfit.plot.folded': 'plegado sobre el periodo de prueba',
  'rvfit.plot.residuals': 'residuos',
  'rvfit.plot.periodogram': '\u03c7\u00b2 frente al periodo',
  'rvfit.rivals': '{n} periodos ajustan más o menos igual de bien',
  'rvfit.hint':
    'Un modelo circular de un solo planeta: periodo, amplitud, fase y velocidad sistémica, y nada más. Cuando no ajusta, los residuos mostrarán una forma en vez de absorber el problema en un parámetro, que es la razón de mantener el modelo así de restrictivo. El punto más bajo del periodograma no es una respuesta: en datos poco muestreados varios periodos ajustan igual de bien de forma rutinaria, y los que lo hacen se listan debajo.',
  'assist.impact': 'Parámetro de impacto (+ por detrás, \u2212 por delante)',
  'assist.run': 'Lanzarla',
  'assist.flip': 'El otro lado',
  'assist.planetFrame': 'Sistema del planeta',
  'assist.side': 'Pasó',
  'assist.side.leading': 'por delante del planeta',
  'assist.side.trailing': 'por detrás del planeta',
  'assist.closest': 'Máximo acercamiento',
  'assist.closest.value': '{au} AU ({radii} radios planetarios)',
  'assist.deflection': 'Desviada',
  'assist.deflection.value':
    '{measured}\u00b0 (dos cuerpos: {predicted}\u00b0)',
  'assist.frame.planet': 'Respecto del planeta',
  'assist.frame.inertial': 'Respecto de todo lo demás',
  'assist.before': 'Antes',
  'assist.after': 'Después',
  'assist.change': 'Cambio',
  'assist.change.value': '{delta} km/s ({percent}%)',
  'assist.recoil': 'Lo que le costó al planeta',
  'assist.recoil.value': '{dv} mm/s, o {ratio} de su propia velocidad',
  'assist.ledger':
    'La nave ganó {probe} de momento lineal y el planeta perdió {planet}: el mismo número con un {mismatch}% de diferencia. No se creó nada; se transfirió.',
  'assist.maxDeltaV':
    'Ningún sobrevuelo de este planeta a esta velocidad de aproximación puede cambiar la velocidad más de {max} km/s, que es el doble de la velocidad de aproximación y exige una inversión completa.',
  'assist.status.idle': 'Sin empezar',
  'assist.status.inbound': 'Acercándose',
  'assist.status.outbound': 'Alejándose',
  'assist.status.done': 'Sobrevuelo terminado',
  'assist.status.lost': 'La nave no sobrevivió al paso',
  'assist.caveat.pending':
    'Hay una estrella presente, así que los números de la izquierda no coincidirán exactamente. Lo cerca que estén es la medida de la aproximación, y aparece aquí cuando termine el sobrevuelo.',
  'assist.caveat.helio':
    'La velocidad respecto del planeta cambió un {residual}% en este encuentro, y en la versión aislada no cambia nada en absoluto. Ese residuo es la aproximación: el planeta acelera, así que su sistema no es inercial, y la estrella también tira de la nave. Las lecturas se tomaron a {gate} AU, frente a un radio de Hill de {hill} AU: la distancia más allá de la cual lo que la nave orbita de verdad es la estrella y no el planeta. Esto es la aproximación de cónicas empalmadas, y es la que usan de verdad quienes diseñan misiones.',
  'assist.hint':
    'Las dos columnas describen el mismo encuentro en los mismos dos instantes. La de la izquierda no puede cambiar, porque en el sistema del propio planeta este no realiza trabajo sobre la nave. La de la derecha cambia porque se ha rotado un vector de longitud fija y luego se ha sumado a la velocidad del planeta. No se crea nada: el planeta se frena exactamente en el momento lineal que gana la nave.',
  'binaryRun.planetA': 'Inicio del planeta (a / a_binaria)',
  'binaryRun.periods': 'Periodos binarios a integrar',
  'binaryRun.timestep': 'Paso de integración',
  'binaryRun.start': 'Ejecutar',
  'binaryRun.halve': 'Repetir con la mitad del paso',
  'binaryRun.progress': 'Integrado',
  'binaryRun.progress.value':
    '{done} de {asked} periodos binarios, {steps} pasos',
  'binaryRun.drift': 'Deriva de energía',
  'binaryRun.step': 'Paso realmente usado',
  'binaryRun.step.varied': '{mean} de media, {max} el mayor',
  'binaryRun.encounters': 'Encuentros cercanos',
  'binaryRun.closest': 'Máximo acercamiento a la otra estrella',
  'binaryRun.farthest': 'Distancia máxima alcanzada',
  'binaryRun.orbit': 'Órbita actual del planeta',
  'binaryRun.orbit.value': 'a = {a} separaciones, e = {e}',
  'binaryRun.orbit.open': 'e = {e}, órbita abierta: ya no se cierra',
  'binaryRun.maxEcc': 'Excentricidad máxima alcanzada',
  'binaryRun.status.idle': 'Sin empezar',
  'binaryRun.status.running': 'En marcha',
  'binaryRun.status.finished': 'Terminada',
  'binaryRun.outcome.notStarted':
    'Fija un radio inicial y un número de periodos binarios, y ejecuta.',
  'binaryRun.outcome.running':
    'En marcha: {periods} de {asked} periodos binarios.',
  'binaryRun.outcome.survived':
    'El planeta sobrevivió a esta integración de {periods} periodos binarios. Eso dice algo sobre esta ejecución y no sobre el futuro: aquí la inestabilidad suele ser lenta, y el estudio publicado con el que se compara integró diez mil periodos binarios.',
  'binaryRun.outcome.ejected':
    'El planeta fue expulsado tras {periods} periodos binarios. Acabó desligado de ambas estrellas y a más de diez separaciones binarias, así que se está marchando y no está en una órbita ancha.',
  'binaryRun.outcome.collided':
    'El planeta chocó con una estrella tras {periods} periodos binarios. Aquí las estrellas se dibujan unas diez veces más grandes de lo real y la distancia de colisión es la dibujada, así que léelo como "pasó a menos de unas 0,06 AU de una estrella" y no como un impacto medido.',
  'binaryRun.outcome.unreliable':
    'Esta ejecución no es creíble. La energía cambió un {drift}%, por encima del filtro del {limit}%, lo que significa que el paso dejó de resolver algo de lo que depende el resultado: casi siempre un acercamiento. Lo que le pasó al planeta a partir de ahí es cosa de la aritmética. Repítela con la mitad del paso.',
  'binaryRun.outcome.vanished':
    'El planeta salió de la simulación sin quedar registrado como colisión. No hay ninguna afirmación física que hacer sobre eso; vuelve a empezar la ejecución.',
  'binaryRun.boundary.inside':
    'Holman y Wiegert sitúan el radio crítico para esta razón de masas y esta excentricidad en {critical} separaciones binarias; este planeta empezó en {a}, del lado que sobrevive.',
  'binaryRun.boundary.outside':
    'Holman y Wiegert sitúan el radio crítico para esta razón de masas y esta excentricidad en {critical} separaciones binarias; este planeta empezó en {a}, del lado que se desestabiliza.',
  'binaryRun.boundary.tooClose':
    'Este planeta empezó en {a} separaciones binarias y Holman y Wiegert sitúan el radio crítico en {critical}. Eso cae dentro de la propia incertidumbre del ajuste, así que no predice nada en ningún sentido.',
  'binaryRun.boundary.extrapolated':
    'Estos valores quedan fuera del rango sobre el que se hizo el ajuste, así que esa cifra es una extrapolación.',
  'binaryRun.boundary.source':
    'Fuente: Holman y Wiegert 1999, AJ 117, 621. El ajuste supone un planeta sin masa, coplanario y prógrado con la binaria, que empieza en órbita circular, y define la supervivencia como durar 10\u2074 periodos binarios. Es un ajuste a dónde está la transición la mayor parte de las veces, y el artículo describe islas de inestabilidad por dentro y de estabilidad por fuera.',
  'binaryRun.hint':
    'Un resultado de aquí describe esta integración y nada más. En estos sistemas la inestabilidad suele ser lenta: un planeta puede girar tranquilo durante cientos de periodos binarios antes de que su órbita se vaya del sistema, así que "sobrevivió" habla de la ejecución que hiciste, no del futuro. La deriva de energía es un filtro y no un certificado: la prueba que zanja un resultado es repetir la ejecución con la mitad del paso y obtener la misma respuesta.',
  'exoW.readout.depthOverNoise': 'Profundidad sobre ruido',
  'exoW.readout.totalNoise': 'Ruido total sobre la profundidad',
  'exoW.readout.photonAfterAveraging': 'Ruido de fotones, tras promediar',
  'exoW.readout.correlatedAfterTransits':
    'T\u00e9rmino intratr\u00e1nsito, tras {n} tr\u00e1nsitos',
  'exoW.readout.persistentFloor':
    'Suelo persistente (nunca promedia a la baja)',
  'exoW.readout.inTransitHours': 'Horas pasadas en tránsito',
  'exoW.readout.ceiling': 'Lo mejor posible, observando infinitamente',
  'exoW.whatSwampsATransit': 'Contra qué compite un tránsito',
  'exoW.whatSwampsATransit.note':
    'El ruido de fotones se da por hora y se promedia a lo largo de todo el tiempo en tránsito. Los otros dos están correlacionados en la escala de tiempo de un tránsito y no se promedian en absoluto.',
  'exoW.transitDepth': 'Profundidad del tránsito',
  'exoW.whitePerHour': 'Ruido blanco, \u03c3 de un bin de 1 hora',
  'exoW.correlatedWithinTransit':
    'Correlacionado dentro de un tr\u00e1nsito, independiente entre ellos',
  'exoW.persistentFloor': 'Coherente en toda la campa\u00f1a',
  'exoW.transitDuration': 'Duración del tránsito',
  'exoW.transitsObserved': 'Tránsitos observados',
  'exoW.ppmAxis': 'partes por millón',
  'exoW.depthMarker': 'profundidad',
  'exoW.depthOverNoise': 'profundidad / ruido = {ratio}',
  'exoW.noise.photon': 'fotones',
  'exoW.noise.stellar': 'estelar',
  'exoW.noise.instrument': 'instrumento',
  'exoW.noise.total': 'total',
  'exoW.preset.hotJupiterKepler': 'Júpiter caliente, Kepler',
  'exoW.preset.hotJupiterKepler.note':
    'Un Júpiter caliente tipo HAT-P-7 b: 6.400 ppm de profundidad, un tránsito de cuatro horas y seiscientos de ellos en cuatro años desde una plataforma estable por encima de la atmósfera. El extremo fácil del problema.',
  'exoW.preset.sameFromTheGround': 'El mismo planeta, desde tierra',
  'exoW.preset.sameFromTheGround.note':
    'El mismo planeta y la misma profundidad, a través del aire. El centelleo y las tendencias con la masa de aire están correlacionados justo en la escala de tiempo de un tránsito, así que fijan un suelo que más noches no pueden bajar.',
  'exoW.preset.superEarthTess': 'Supertierra, TESS',
  'exoW.preset.superEarthTess.note':
    'Pi Mensae c: el doble del radio terrestre alrededor de una estrella visible a simple vista, 290 ppm. Una detección real de TESS, y no precisamente cómoda.',
  'exoW.preset.rockyTess': 'Planeta rocoso en la zona habitable, TESS',
  'exoW.preset.rockyTess.note':
    'TOI-700 d: del tamaño de la Tierra, pero alrededor de una estrella roja pequeña, así que la profundidad es unos respetables 550 ppm. La dificultad es un periodo de 37 días: aproximadamente un tránsito por sector de TESS, y costó un año de ellos.',
  'exoW.preset.earthTwin': 'Gemela de la Tierra, TESS',
  'exoW.preset.earthTwin.note':
    'Una Tierra alrededor de un Sol, vista por TESS: 84 ppm, un tránsito de trece horas, un tránsito al año. El tránsito más largo de aquí y el planeta menos detectable, lo que merece una pausa.',

  // --- La comprobacion de fiabilidad numerica --------------------------------
  'reliability.title': 'Fiabilidad numerica',
  'reliability.hint':
    'Repite este experimento dos veces durante el mismo tiempo simulado - una con el paso que usa el motor y otra con la mitad - e indica que conclusiones se mantienen.',
  'reliability.run': 'Comprobar con el paso a la mitad',
  'reliability.cancel': 'Detener',
  'reliability.running': 'Ejecutando {phase} de 2, {percent}% completado',
  'reliability.phase.coarse': 'la pasada con el paso actual',
  'reliability.phase.fine': 'la pasada con la mitad del paso',
  'reliability.cost':
    'Dos pasadas de {duration} unidades simuladas tardaron {seconds}s: {coarseSub} subpasos por fotograma y luego {fineSub}.',
  'reliability.steps': 'Paso {coarse} frente a {fine}',
  'reliability.export': 'Exportar esta comprobacion',

  'reliability.verdict.converging':
    'Reducir el paso a la mitad no movio este resultado.',
  'reliability.verdict.unresolved':
    'Reducir el paso a la mitad movio este resultado. Es una afirmacion sobre el paso de integracion, no sobre el sistema.',
  'reliability.verdict.incomparable':
    'Las dos pasadas no miden lo mismo, asi que la diferencia no permite concluir nada.',
  'reliability.verdict.diverged':
    'Las dos trayectorias se separaron, pero las medidas agregadas se mantuvieron.',

  'reliability.reason.missingRun': 'Falta una de las dos pasadas.',
  'reliability.reason.noDuration':
    'Una pasada no cubrio tiempo simulado alguno.',
  'reliability.reason.differentDurations':
    'Las pasadas cubrieron cantidades distintas de tiempo simulado.',
  'reliability.reason.differentSystems':
    'Las pasadas terminaron con distinto numero de cuerpos: algo se fusiono o se destruyo en una y no en la otra. Eso ya es un hallazgo, y mas interesante que cualquier cifra de aqui.',
  'reliability.reason.noStep': 'No se pudo leer el paso de integracion.',
  'reliability.reason.stepNotHalved':
    'La segunda pasada no se integro con mas finura que la primera.',
  'reliability.reason.noMeasurement':
    'No se midio nada que se pudiera comparar.',
  'reliability.reason.trajectoryDiverged':
    'Las trayectorias coincidieron al principio y se separaron despues, que es el aspecto del caos y no el de un paso demasiado grande.',
  'reliability.reason.disagreedFromTheStart':
    'Las trayectorias discreparon desde el principio. Eso no tiene nada de caotico: la pasada mas gruesa no estaba resolviendo el movimiento.',
  'reliability.reason.outcomeMoved':
    'El resultado medido cambio mas que la tolerancia.',
  'reliability.reason.aggregateMovedToo':
    'Las trayectorias se separaron y el agregado tambien se movio, asi que no queda nada a lo que recurrir.',
  'reliability.reason.substepCeiling':
    'Este escenario ya se integra con {n} subpasos por fotograma y el motor no admite el doble. Aqui no se puede hacer una pasada mas fina, asi que no se ofrece comparacion en lugar de compararla con una pasada del mismo paso.',
  'reliability.reason.noExperiment': 'Captura primero un estado inicial.',
  'reliability.reason.recording': 'Se esta grabando una pasada.',
  'reliability.reason.alreadyRunning': 'Ya hay una comprobacion en curso.',
  'reliability.reason.noMetrics': 'Elige al menos una magnitud que medir.',
  'reliability.reason.cancelled':
    'Detenida. El mundo ha vuelto a donde estaba.',

  'reliability.conservationIsNotAccuracy':
    'La energia y el momento angular se muestran como evidencia aparte, no como veredicto. Una pasada que conserva bien puede seguir siendo erronea: la energia es un solo numero, y un encuentro cercano puede resolverse con muy poca finura sin alterarla.',
  'reliability.conservationNotExpected':
    'Este modelo no es un sistema cerrado, asi que una energia que deriva es el modelo funcionando como se diseno y no un fallo. Las cifras de deriva se informan pero no deciden nada.',
  'reliability.driftDidNotFall':
    'La deriva de energia no bajo al reducir el paso a la mitad. Es motivo para mirar con mas cuidado, no un veredicto: el veredicto de arriba se calculo sin ella.',
  'reliability.chaosSeparates':
    'Dos pasadas de un sistema caotico acaban separandose por fina que sea la integracion, y ambas pueden seguir siendo utiles numericamente. Lo que importa es que coincidieran al principio: un par mal resuelto discrepa desde el primer acercamiento.',
  'reliability.quoteStatistics':
    'Cita los agregados de esta pasada en lugar de posiciones en un instante dado.',
  'reliability.stillNotProof':
    'Eso no equivale a que el resultado sea correcto. Significa que este paso no es lo que lo esta decidiendo.',
  'reliability.agrees': 'sin cambio dentro de {tolerance}',
  'reliability.moved': 'cambio {change}',
  'reliability.noValue': 'no medido',

  // --- The A/B experiment bench ---------------------------------------------
  // Moved out of the start-up catalogue. The bench is loaded on first press
  // and most visitors never press it, so its prose has no business being
  // downloaded by everyone; js/experimentsBridge.js registers this before the
  // panel builds its markup. bench.error.load stays in the base catalogue,
  // because it is what the bridge says when this very import fails.
  'bench.title': 'Experimento A/B',
  'bench.untitled': 'Experimento sin título',
  'bench.copyOf': 'Copia de {name}',
  'bench.status.idle': 'Sin experimento',
  'bench.status.recording': 'Grabando: {n} muestras, {seconds} s',
  'bench.status.runs': '{n} de 2 ejecuciones grabadas',
  'bench.field.name': 'Nombre',
  'bench.field.namePlaceholder': '¿Qué estás probando?',
  'bench.field.primary': 'Medir distancia desde',
  'bench.field.chart': 'Gráfica',
  'bench.primary.none': 'Nada seleccionado',
  'bench.section.selection': 'Qué medir',
  'bench.section.saved': 'Experimentos guardados',
  'bench.hint.selection':
    'Elige los cuerpos de los que trata el experimento y después las magnitudes que se van a registrar. Una magnitud que necesita dos cuerpos permanece atenuada hasta que se eligen dos.',
  'bench.hint.noBodies': 'Captura primero un estado inicial.',
  'bench.action.capture': 'Capturar inicio',
  'bench.action.restore': 'Volver al inicio',
  'bench.action.record': 'Grabar',
  'bench.action.recording': 'Grabando',
  'bench.action.stop': 'Parar',
  'bench.action.save': 'Guardar',
  'bench.action.save.hint': 'Conservar este experimento en este navegador',
  'bench.action.close.hint': 'Ocultar el banco de experimentos',
  'bench.action.csv': 'Exportar CSV',
  'bench.action.json': 'Exportar JSON',
  'bench.action.share': 'Compartir montaje',
  'bench.action.duplicate': 'Duplicar',
  'bench.action.import': 'Abrir un archivo',
  'bench.action.delete': 'Eliminar este experimento',
  'bench.action.confirmMultivariable': 'Sí, los cambié a propósito',
  'bench.section.perturb': 'Perturbar el inicio',
  'bench.hint.perturb':
    'Cambia una coordenada de un cuerpo en el inicio capturado en una cantidad muy pequeña. La ejecución B se restaura entonces a ese estado perturbado, de modo que las dos ejecuciones difieren exactamente en eso y en nada más.',
  'bench.field.amount': 'Cantidad (km, o km/s)',
  'bench.axis.x': 'posición x',
  'bench.axis.y': 'posición y',
  'bench.axis.vx': 'velocidad x',
  'bench.axis.vy': 'velocidad y',
  'bench.action.perturb': 'Aplicar',
  'bench.action.asControl': 'Registrar como control numérico',
  'bench.perturb.applied':
    'Perturbado: {body}, {axis}, {km} km — una parte en {fraction} del sistema',
  'bench.perturb.done': 'El inicio capturado está perturbado',
  'bench.perturb.needAmount': 'Escribe una perturbación distinta de cero.',
  'bench.perturb.noExperiment': 'Captura primero un inicio.',
  'bench.perturb.no-bodies':
    'Este inicio capturado no tiene cuerpos que perturbar. Captura con el estado completo.',
  'bench.perturb.no-such-body': 'Ese cuerpo no está en el inicio capturado.',
  'bench.perturb.bad-axis': 'Eso no es una coordenada.',
  'bench.perturb.bad-delta': 'Escribe una perturbación distinta de cero.',
  'bench.control.row': '{label}: {behaviour}, crecimiento {tau} s',
  'bench.control.recorded': 'Registrado como control: {label}',
  'bench.control.failed':
    'Graba primero ambas ejecuciones, con las posiciones entre las medidas.',
  'bench.run.a': 'Ejecución A',
  'bench.run.b': 'Ejecución B',
  'bench.run.empty': 'sin grabar',
  'bench.run.recorded': '{n} muestras en {seconds} s',
  'bench.start.captured': 'Inicio: {scenario}, semilla {seed}, estado {hash}',
  'bench.diff.heading': 'Qué cambió entre las ejecuciones',
  'bench.diff.none': 'Nada. Ambas ejecuciones usaron los mismos ajustes.',
  'bench.diff.incidental':
    'También difieren, pero no son variables experimentales: {list}',
  'bench.table.metric': 'Magnitud',
  'bench.table.delta': 'B - A',
  'bench.table.fraction': 'Fracción',
  'bench.chart.time': 'Tiempo simulado (s)',
  'bench.chart.label':
    'Ejecución A frente a ejecución B sobre un eje común de tiempo simulado',
  'bench.metric.position': 'Posición',
  'bench.metric.separation': 'Separación',
  'bench.metric.speed': 'Rapidez',
  'bench.metric.velocity_x': 'Velocidad, x',
  'bench.metric.velocity_y': 'Velocidad, y',
  'bench.metric.distance_to_primary': 'Distancia al primario',
  'bench.metric.orbital_period': 'Periodo orbital',
  'bench.metric.closest_approach': 'Máxima aproximación',
  'bench.metric.total_energy': 'Energía total',
  'bench.metric.angular_momentum': 'Momento angular',
  'bench.metric.energy_drift': 'Deriva de energía',
  'bench.metric.angular_drift': 'Deriva de momento angular',
  'bench.metric.needs': 'Selecciona {n} cuerpos para medir esto',
  'bench.warn.noChange':
    'Ambas ejecuciones usaron ajustes idénticos, así que cualquier diferencia entre ellas es numérica, no física.',
  'bench.warn.multivariable':
    'Cambiaron {n} cosas entre las ejecuciones, no una: {list}. Una comparación con más de una variable independiente no puede decir cuál causó la diferencia.',
  'bench.warn.identical': 'Las dos ejecuciones partieron del mismo estado.',
  'bench.warn.noOverlap':
    'Las dos ejecuciones no se solapan en tiempo simulado, así que {metric} no se puede comparar.',
  'bench.warn.uneven':
    'La ejecución {run} se muestreó de forma irregular: su intervalo mayor es {ratio} veces el menor. Los valores intermedios se interpolan.',
  'bench.flash.captured': 'Inicio capturado',
  'bench.flash.restored': 'De vuelta al inicio capturado',
  'bench.flash.restoredDrift':
    'Restaurado, pero el hash del estado difiere: consulta el manifiesto',
  'bench.flash.stopped': 'Ejecución grabada',
  'bench.saved': 'Experimento guardado',
  'bench.saved.none': 'Todavía no hay nada guardado.',
  'bench.imported': 'Se abrió {name}',
  'bench.quota':
    '{used} KB de {total} KB usados, {count} de {max} experimentos',
  'bench.error.tooLarge':
    'Ese experimento ocupa {size} KB y el límite es {limit} KB. Expórtalo a un archivo.',
  'bench.error.storeFull':
    'Los experimentos guardados superarían {limit} KB. Elimina uno o exporta este a un archivo.',
  'bench.error.tooMany':
    'Ya tienes {limit} experimentos guardados. Elimina uno para hacer sitio.',
  'bench.error.quota':
    'Este navegador se negó a almacenar el experimento. Expórtalo a un archivo.',
  'bench.error.unavailable':
    'Este navegador no tiene almacenamiento local disponible, así que los experimentos no se pueden conservar entre visitas. Exporta a un archivo.',
  'bench.error.open': 'No se pudo abrir ese experimento ({reason}).',
  'bench.error.import': 'No se pudo leer ese archivo ({reason}).',

  // --- El barrido de parametros -----------------------------------------------
  'sweep.title': 'Barrido de parametros',
  'sweep.hint':
    'Repite el mismo escenario varias veces cambiando un solo parametro, y muestra como se mueve la medida con el.',
  'sweep.scenario': 'Escenario',
  'sweep.parameter': 'Parametro',
  'sweep.from': 'Desde',
  'sweep.to': 'hasta',
  'sweep.count': 'Valores',
  'sweep.duration': 'Tiempo simulado por prueba',
  'sweep.run': 'Ejecutar el barrido',
  'sweep.cancel': 'Detener',
  'sweep.export': 'Exportar el barrido',
  'sweep.guided': 'Ejemplo guiado',
  'sweep.progress': 'Prueba {trial} de {total}, {percent}%',
  'sweep.done':
    '{ok} de {total} pruebas medidas, {failed} fallidas, {cancelled} sin ejecutar. {seconds}s.',
  'sweep.range': 'Rango permitido de {min} a {max}',
  'sweep.settings':
    'Las demas condiciones iniciales son las del escenario con la semilla {seed}. {integrator}, {substeps} subpasos por fotograma, paso {step}.',

  'sweep.param.planetA': 'Orbita inicial del planeta',
  'sweep.param.impact': 'Parametro de impacto',
  'sweep.param.vInfinity': 'Velocidad de aproximacion lejana',
  'sweep.unit.separations': 'separaciones binarias',
  'sweep.unit.simUnits': 'unidades de simulacion',
  'sweep.unit.simVelocity': 'unidades de velocidad de simulacion',

  'sweep.status.ok': 'medida',
  'sweep.status.buildFailed': 'el mundo no se pudo construir con este valor',
  'sweep.status.bodiesMissing':
    'los cuerpos que necesita esta medida no estaban',
  'sweep.status.notFinite': 'la medida no resulto ser un numero',
  'sweep.status.lostBody':
    'un cuerpo se destruyo durante esta prueba, asi que las muestras posteriores son de otro sistema',
  'sweep.status.cancelled': 'sin ejecutar',

  'sweep.reason.parameterNotSweepable':
    'Ese parametro no se puede barrer en este escenario. Solo las variables de laboratorio propias de un escenario sobreviven a la reconstruccion que necesita cada prueba.',
  'sweep.reason.valueCount':
    'Un barrido necesita entre {min} y {max} valores. Con dos valores ya esta la comparacion A/B del banco.',
  'sweep.reason.rangeNotNumeric': 'El rango debe ser dos numeros.',
  'sweep.reason.rangeEmpty': 'El rango empieza y termina en el mismo valor.',
  'sweep.reason.outOfRange':
    'Fuera del rango en el que este parametro esta definido aqui, que es de {min} a {max}.',
  'sweep.reason.crossesExcluded':
    'Ese rango pasa por {from} a {to}, donde el escenario no describe un sobrevuelo en absoluto.',
  'sweep.reason.duration':
    'El tiempo simulado por prueba debe estar entre {min} y {max}.',
  'sweep.reason.noMetrics': 'Elige al menos una magnitud que medir.',
  'sweep.reason.notReady': 'El banco todavia se esta cargando.',
  'sweep.reason.alreadyRunning': 'Ya hay un barrido en curso.',
  'sweep.reason.recording': 'Se esta grabando una pasada.',

  'sweep.summary.changed':
    '{metric} paso de {min} a {max} a lo largo del rango.',
  'sweep.summary.monotonic': 'Cambio en una sola direccion en todo el rango.',
  'sweep.summary.turned':
    'Dio la vuelta en lugar de moverse en una sola direccion, asi que el valor interesante esta dentro del rango y no en un extremo.',
  'sweep.summary.flat':
    '{metric} no se movio de forma apreciable en este rango. Es un resultado sobre este rango y esta duracion, no sobre el parametro.',
  'sweep.partial':
    'Algunas pruebas no dieron medida, asi que esto describe los valores que se ejecutaron y no el rango que se pidio.',

  'sweep.guide.title':
    'Hasta donde puede orbitar un planeta alrededor de una estrella de un par?',
  'sweep.guide.body':
    'Esto barre la orbita inicial del planeta desde muy cerca hasta bastante lejos, manteniendo fijas las estrellas, la semilla y el paso de integracion, y mide cuanto se aleja el planeta de su estrella. Cerca, la orbita es la del propio planeta y la distancia apenas cambia. Mas lejos la segunda estrella empieza a contar, y pasado cierto punto el planeta deja de estar en orbita.',
  'sweep.guide.after':
    'Fijate donde la medida deja de comportarse suavemente: ese es el limite que tiene este escenario, con esta duracion. Una pasada mas larga solo puede moverlo hacia dentro: una orbita que sobrevivio 20 periodos binarios no ha demostrado sobrevivir 200.',
  'sweep.guide.run': 'Ejecutar el barrido guiado',

  // --- Tareas para clase --------------------------------------------------
  // Every one of these is shown from a lazy chunk - the builder, the link
  // bridge, or the lesson panel with an assignment open - so none of them has
  // any business in a first-time visitor's download. Registered by
  // ensureDeferredMessages() before any of those render.
  'assign.title': 'Crear una tarea',
  'assign.hint':
    'Elige los pasos que quieres asignar. Los pasos que construyen el mundo del que trata otro paso se anaden solos, y se indican donde corresponden.',
  'assign.close': 'Cerrar',
  'assign.name': 'Nombre de la tarea',
  'assign.intro': 'Instrucciones para el alumnado (opcional)',
  'assign.selectAll': 'Seleccionar todo',
  'assign.selectNone': 'Limpiar',
  'assign.count':
    '{chosen} elegidos, {included} incluidos, de {total} de la leccion',
  'assign.build': 'Crear el enlace',
  'assign.print': 'Instrucciones imprimibles',
  'assign.download': 'Guardar como archivo',
  'assign.link': 'Enlace de la tarea',
  'assign.link.ok': 'Son {n} caracteres, un tamano comodo.',
  'assign.link.long':
    'Este enlace tiene {n} caracteres, por encima de los {limit} que los clientes de correo y las plataformas de curso transportan con fiabilidad. Con menos pasos seria mas corto; un enlace truncado falla en el lado del alumnado, donde nadie puede arreglarlo.',
  'assign.added.setup':
    'Anadido: construye el mundo {scenario} del que trata \u201c{step}\u201d.',
  'assign.added.summary':
    'Se anadieron {n} paso(s) porque los que elegiste tratan sobre los mundos que estos construyen.',
  'assign.subtitle': '{n} pasos de {lesson} ({total} en la leccion completa)',
  'assign.print.steps': '{n} pasos',
  'assign.print.open': 'Abre la tarea en esta direccion:',
  'assign.print.id': 'Tarea {id}, emitida el {date}.',

  'assign.error.nothingSelected': 'Elige al menos un paso.',
  'assign.error.noLesson': 'No se pudo leer esa leccion.',
  'assign.error.unknownSteps':
    'Esta tarea nombra pasos que la leccion no tiene.',
  'assign.error.tooManySteps': 'Una tarea admite como maximo {max} pasos.',
  'assign.error.titleTooLong': 'Ese nombre es demasiado largo.',
  'assign.error.introTooLong': 'Esas instrucciones son demasiado largas.',
  'assign.error.notAnObject': 'Ese enlace no contiene una tarea.',
  'assign.error.wrongKind': 'Ese enlace no es un enlace de tarea.',
  'assign.error.badVersion': 'Ese enlace de tarea esta mal formado.',
  'assign.error.newerVersion':
    'Esa tarea se creo con una version mas nueva de Gravitas. Recarga la pagina e intentalo de nuevo.',
  'assign.error.badLesson': 'Esa tarea no nombra ninguna leccion.',
  'assign.error.badId': 'Esa tarea no tiene un identificador utilizable.',
  'assign.error.noSteps': 'Esa tarea no contiene ningun paso.',
  'assign.error.badStepId':
    'Esa tarea nombra un paso en un formato que no podemos usar.',
  'assign.error.duplicateSteps': 'Esa tarea lista el mismo paso dos veces.',
  'assign.error.fingerprintMismatch': 'Ese enlace de tarea esta incompleto.',
  'assign.error.badText': 'Ese enlace de tarea esta mal formado.',
  'assign.error.unexpectedField':
    'Ese archivo lleva un campo \u201c{field}\u201d, que una tarea nunca tiene. No lo creo esta herramienta y no se ha abierto.',
  'assign.error.notJson': 'Ese archivo no es una tarea.',
  'assign.error.corrupt':
    'Ese enlace parece incompleto. Algunos clientes de correo parten los enlaces largos en varias lineas.',
  'assign.error.noStepsLeft':
    'Ninguno de los pasos de esta tarea sigue en la leccion. Probablemente se creo con una version anterior.',
  'assign.notice.changed':
    'Se han reescrito {n} paso(s) desde que se asigno esto. Esos empiezan en blanco en lugar de mostrar una respuesta a una pregunta que ya no se hace.',
  'assign.notice.missing':
    'Ya no hay {n} paso(s) en la leccion y se han dejado fuera.',

  // --- El planificador de maniobras --------------------------------------------
  'burn.title': 'Planificador de maniobras',
  'burn.close': 'Ocultar el planificador de maniobras',
  'burn.body': 'Cuerpo',
  'burn.about':
    'En orbita alrededor de {name}. La \u0394v se mide respecto a el.',
  'burn.noPrimary':
    'Este cuerpo no orbita claramente alrededor de nada, asi que no hay un sistema de referencia en el que planificar un impulso.',
  'burn.radial': '\u0394v radial',
  'burn.transverse': '\u0394v transversal',
  'burn.frame':
    'La direccion radial se aleja del primario; la transversal es perpendicular a ella, en el sentido del movimiento. Solo coinciden con \u201ca lo largo de la velocidad\u201d donde la velocidad radial es cero: en todo punto de una orbita circular, y en el periastro y el apoastro de una elipse.',
  'burn.quantity': 'Magnitud',
  'burn.before': 'Ahora',
  'burn.after': 'Despues',
  'burn.periapsis': 'Periastro',
  'burn.apoapsis': 'Apoastro',
  'burn.energy': 'Energia especifica',
  'burn.angularMomentum': 'Momento angular especifico',
  'burn.period': 'Periodo',
  'burn.none': '\u2014',
  'burn.magnitude': '\u0394v total {dv}.',
  'burn.becomesUnbound':
    'Este impulso pone al cuerpo en una trayectoria de escape. No tiene apoastro ni periodo: se va y no vuelve.',
  'burn.staysUnbound':
    'El cuerpo ya esta en una trayectoria de escape y este impulso no lo captura.',
  'burn.becomesBound':
    'Este impulso captura al cuerpo en una orbita cerrada desde una trayectoria de escape.',
  'burn.twoBody':
    'La orbita prevista es la orbita osculadora de dos cuerpos alrededor de este primario: es lo que ocurriria si estos fueran los dos unicos cuerpos del universo. Se ignoran todos los demas, asi que en un sistema donde otra masa cuenta la trayectoria real se apartara de esta prediccion, y deprisa si esa masa esta cerca.',
  'burn.apply': 'Aplicar impulso',
  'burn.undo': 'Deshacer el ultimo impulso',
  'burn.export': 'Exportar el registro de impulsos',
  'burn.logRow':
    'Impulso {n}: {body} en t = {time}, radial {radial}, transversal {transverse}.',

  // --- The investigations panel ------------------------------------------------
  // js/investigations.js is the only module that reads these and it is loaded
  // on demand, so a visitor who never opens a lesson was downloading all of
  // them. Registered by ensureInvestigations() before initInvestigations()
  // runs. The dozen that stay in the base catalogue are on static buttons in
  // index.html, translated by the boot sweep, plus the two the loader itself
  // says when a lesson fails before its chunk arrives.
  'inv.error.scenario': 'No se pudo cargar el escenario de este paso.',
  'inv.plot.placeholder': 'Los valores que introduzcas aparecen aquí',
  'inv.plot.title': 'Tus medidas',
  'inv.import.default': 'Usar el objeto seleccionado',
  'inv.import.needObject':
    'Selecciona primero un objeto con una órbita medible.',
  'inv.import.duplicate': 'Ese ya lo has registrado.',
  'inv.import.full':
    'Todas las filas están llenas. Vacía una para importar de nuevo.',
  'inv.action.finish': 'Terminar',
  'inv.action.next': 'Siguiente',
  'inv.probe.unavailable': 'Lectura no disponible',
  'inv.answer.correct': 'Correcto.',
  'inv.answer.recorded': 'Registrado.',
  'inv.answer.model': 'Respuesta modelo mostrada.',
  'inv.announce.started': 'Investigación iniciada: {title}',
  'inv.report.building': 'Generando…',
  'inv.report.done': 'Informe de laboratorio descargado',
  'inv.report.failed': 'No se pudo generar el informe.',
  'inv.report.download': 'Descargar informe de laboratorio (PDF)',
  'inv.progress.cleared': 'Progreso borrado',
  'inv.progress.steps': '{done} de {total} pasos',
  'inv.scenario.reset': 'Escenario reiniciado',
  'inv.card.loading': 'Cargando…',
  'inv.card.review': 'Repasar la lección',
  'inv.card.start': 'Empezar la lección',
  'inv.card.resume': 'Continuar en el paso {n}',
  'inv.card.complete': 'Completada',
  'inv.card.seen': '{done} de {total} pasos vistos',
  'inv.card.report': 'Informe de laboratorio',
  'inv.card.series': '{label}, lección {index} de {of}',
  'inv.summary.about': 'unas {h} horas',
  'inv.summary.range': '{l}–{h} horas',
  'inv.summary.work': '{hours} de trabajo',
  'inv.summary.level': 'Todas de nivel {level}.',
  'inv.summary.lessons': { one: '{n} lección', other: '{n} lecciones' },
  'inv.summary.steps': { one: '{n} paso', other: '{n} pasos' },
  'inv.summary.complete': '{n} completada',
  'inv.summary.going': '{n} en curso',
  'inv.card.objectives': { one: '{n} objetivo', other: '{n} objetivos' },

  'inv.step.counter': 'Paso {n} de {total}',
  'inv.step.kind.read': 'lectura',
  'inv.step.kind.predict': 'predicción',
  'inv.step.kind.explore': 'exploración',
  'inv.step.kind.measure': 'medida',
  'inv.step.kind.question': 'pregunta',
  'inv.step.kind.ellipse': 'exploración',
  'inv.step.kind.wedges': 'exploración',
  'inv.save.saved': 'Progreso guardado en este dispositivo',
  'inv.save.full':
    'No se pudo guardar el progreso: el almacenamiento de este navegador est\u00e1 lleno. Tus respuestas siguen aqu\u00ed, pero se perder\u00e1n al cerrar la pesta\u00f1a. Descarga una copia de seguridad para conservarlas.',
  'inv.save.unavailable':
    'No se puede guardar el progreso en este navegador; la navegaci\u00f3n privada suele impedirlo. Tus respuestas siguen aqu\u00ed, pero se perder\u00e1n al cerrar la pesta\u00f1a. Descarga una copia de seguridad para conservarlas.',
  'inv.save.authoring':
    'Vista previa de autor\u00eda: no se guarda nada y no se toca el progreso de ning\u00fan estudiante.',
  'inv.save.foreign':
    'Se encontró progreso guardado por una versión más reciente de Gravitas y se ha dejado intacto. Tus respuestas funcionan aquí, pero no se están guardando.',
  'inv.progress.migrated':
    'Se han recuperado {n} respuestas guardadas de un formato anterior, emparejadas por posición. Si esta lección ha cambiado desde la última vez que la abriste, comprueba que cada respuesta esté en la pregunta que pretendías.',
  'inv.progress.removedSteps':
    'Se descartaron {n} respuestas guardadas de pasos que esta lección ya no tiene.',
  'inv.progress.foreign':
    'Tu progreso guardado de esta lección lo escribió una versión más reciente de Gravitas y no se ha podido leer. Se ha dejado tal cual en lugar de sobrescribirlo.',
  'inv.backup.downloaded': 'Copia del progreso descargada.',
  'inv.backup.restored': 'Progreso restaurado.',
  'inv.backup.restoredMoved':
    'Progreso restaurado. {moved} respuestas se asociaron a pasos que han cambiado de sitio desde la copia.',
  'inv.backup.restoredPartly':
    'Progreso restaurado, pero {dropped} pasos de la copia ya no est\u00e1n en esta investigaci\u00f3n y sus respuestas se omitieron.',
  'inv.backup.restoredUncertain':
    'Se restauraron {applied} respuestas. {n} no se pudieron ubicar porque sus pasos han cambiado desde que se hizo la copia; siguen estando en el archivo que restauraste.',
  'inv.backup.tooLarge':
    'Ese archivo es demasiado grande para ser una copia del progreso.',
  'inv.backup.notJson': 'Ese archivo no se puede leer como JSON.',
  'inv.backup.failed': 'No se pudo leer esa copia de seguridad.',
  'inv.backup.invalid.notAnObject': 'Ese archivo no es una copia del progreso.',
  'inv.backup.invalid.notABackup':
    'Es un archivo JSON, pero no una copia de progreso de Gravitas.',
  'inv.backup.invalid.noVersion':
    'Esa copia no tiene versi\u00f3n y no se puede leer con seguridad.',
  'inv.backup.invalid.tooNew':
    'Esa copia se hizo con una versi\u00f3n de Gravitas m\u00e1s reciente que esta.',
  'inv.backup.invalid.noLesson':
    'Esa copia no indica a qu\u00e9 investigaci\u00f3n pertenece.',
  'inv.backup.invalid.noProgress':
    'Esa copia no contiene ning\u00fan progreso.',
  'inv.backup.invalid.badResponses':
    'Las respuestas de esa copia no tienen un formato legible.',
  'inv.backup.invalid.badVisited':
    'El historial de pasos de esa copia no tiene un formato legible.',
  'inv.backup.invalid.badAttempts':
    'Los recuentos de intentos de esa copia no se pueden leer, así que no se aplicó.',
  'inv.backup.invalid.badStartedAt':
    'La hora de inicio de esa copia no es una fecha legible, así que no se aplicó.',
  'inv.backup.invalid.badPosition':
    'Esa copia no indica de forma legible en qué paso se quedó, así que no se aplicó.',
  'inv.backup.invalid.badSteps':
    'La lista de pasos de esa copia está dañada, así que no se aplicó.',
  'inv.backup.wrongLesson':
    'Esa copia es de \u201c{backup}\u201d y est\u00e1 abierta \u201c{open}\u201d. Abre esa investigaci\u00f3n primero.',
  'inv.backup.confirmReplace':
    '\u00bfReemplazar tus respuestas actuales con la copia? Tienes {n} respuestas registradas y esto no se puede deshacer.',
  'inv.answer.matches': 'Eso coincide.',
  'inv.answer.notYet':
    'Todavía no. Revisa tu razonamiento e inténtalo de nuevo.',
  'inv.answer.oneGood': 'Una buena respuesta:',
  'inv.answer.placeholder': 'Tu valor',
  'inv.answer.placeholderUnit': 'Tu valor en {unit}',
  'inv.answer.converted': '(leído como {value} {target})',
  'inv.answer.blank': 'La casilla está vacía: escribe un número.',
  'inv.answer.notANumber':
    'Eso no es un número que pueda leer. Funcionan los dígitos, un separador decimal y un exponente como 3e5 o 3×10^5.',
  'inv.answer.ambiguous':
    'No puedo saber cuál separador es el decimal. Escríbelo con un solo separador decimal, o usa un espacio entre los millares.',
  'inv.answer.unknownUnit': 'No reconozco la unidad «{unit}».',
  'inv.answer.wrongDimension':
    '«{unit}» es una unidad de {got}, y esta respuesta debería ser una magnitud de {want}.',
  'inv.answer.unitNotAllowed':
    'Este paso no admite «{unit}». Responde en una de estas: {allowed}.',
  'inv.answer.unitExpected':
    'Este paso espera el número en {expected}, así que no puedo usar «{unit}». Conviértelo tú y da el número.',
  'inv.answer.trailingText': 'No sé qué hacer con «{text}» después del número.',
  'inv.dimension.time': 'tiempo',
  'inv.dimension.length': 'longitud',
  'inv.dimension.speed': 'velocidad',
  'inv.dimension.mass': 'masa',
  'inv.dimension.angle': 'ángulo',
  'inv.hint.ask': 'Me vendría bien una pista',
  'inv.hint.reveal': 'Muéstrame cómo se hace',
  'inv.hint.concept': 'Piensa en:',
  'inv.hint.method': 'Cómo abordarlo:',
  'inv.hint.worked': 'Resuelto paso a paso:',
  'inv.hint.given': 'Pista mostrada.',
  'inv.hint.revealed': 'Explicación resuelta mostrada.',
  'inv.hint.taken': '{n} pista(s) usada(s)',
  'inv.hint.takenRevealed':
    '{n} pista(s) usada(s), respuesta resuelta mostrada',
  'inv.misconception.radiusForDiameter':
    'Eso es la mitad del valor pedido: comprueba si la pregunta quiere un radio o un diámetro.',
  'inv.misconception.diameterForRadius':
    'Eso es el doble del valor pedido: comprueba si la pregunta quiere un radio o un diámetro.',
  'inv.misconception.peakToPeakForSemiAmplitude':
    'Eso es el rango completo de pico a pico. K es la mitad: la distancia desde el centro de la curva hasta un extremo, no de un extremo al otro.',
  'inv.misconception.semiAmplitudeForPeakToPeak':
    'Eso es la semiamplitud K. El rango de pico a pico es el doble.',
  'inv.misconception.daysForYears':
    'Eso parece el valor en días, y la pregunta pide años.',
  'inv.misconception.yearsForDays':
    'Eso parece el valor en años, y la pregunta pide días.',
  'inv.misconception.radiansForDegrees':
    'Eso parece el ángulo en radianes, y la pregunta pide grados.',
  'inv.answer.check': 'Comprobar',

  // --- El modo didactico del problema restringido de tres cuerpos --------------
  'cr3bp.title': 'Modo de tres cuerpos restringido',
  'cr3bp.close': 'Ocultar la superposicion de tres cuerpos',
  'cr3bp.convention':
    'Unidades: los dos cuerpos estan a distancia uno, su masa total es uno y el sistema de referencia gira con ellos alrededor de su baricentro. El mas pesado esta en \u2212\u03bc y el mas ligero en 1\u2212\u03bc. C = 2\u03a9 \u2212 v\u00b2 con v medida en el sistema giratorio, asi que una C MAYOR significa un trazador MAS LENTO y una region accesible MENOR: el sentido contrario al de cualquier otra energia aqui. (Esta convencion omite el termino \u03bc(1\u2212\u03bc)/2 que anaden algunos textos, lo que situa C\u2084 en 3\u2212\u03bc+\u03bc\u00b2 y no en 3.)',
  'cr3bp.valid':
    'Problema restringido circular de tres cuerpos, \u03bc = {mu}. La zona sombreada es donde la energia de este trazador le prohibe estar.',
  'cr3bp.invalid.title': 'La superposicion esta desactivada:',
  'cr3bp.invalid.bodyCount':
    'esto necesita exactamente dos cuerpos masivos, y el sistema no tiene dos.',
  'cr3bp.invalid.eccentric':
    'los dos cuerpos no estan en orbita circular, asi que los puntos de Lagrange y la region prohibida estarian moviendose y el diagrama no seria de ningun instante concreto.',
  'cr3bp.invalid.tracerTooHeavy':
    'el tercer cuerpo pesa lo bastante como para mover a los otros dos, asi que no es una particula de prueba y el problema restringido no lo describe.',
  'cr3bp.invalid.noTracer': 'no hay un tercer cuerpo ligero que describir.',
  'cr3bp.invalid.thirdMass': 'hay un tercer cuerpo masivo.',
  'cr3bp.noTracer': 'Sin trazador, no hay constante de Jacobi.',
  'cr3bp.jacobi': 'Constante de Jacobi C = {C}',
  'cr3bp.point': 'Punto',
  'cr3bp.reachableHere': 'La energia lo permite',
  'cr3bp.yes': 'si',
  'cr3bp.no': 'no',
  'cr3bp.stableMark': '(estable)',
  'cr3bp.toGate':
    'C tendria que bajar {d} para que se abriera el cuello de {gate}.',
  'cr3bp.regime.separated':
    'Todas las rutas entre los dos cuerpos estan cerradas. El trazador esta confinado en la region donde empezo.',
  'cr3bp.regime.l1Open':
    'El cuello de L1 esta abierto: la energia ya no separa a los dos cuerpos. Que el trazador pase por el es otra cuestion.',
  'cr3bp.regime.l2Open':
    'L1 y L2 estan abiertos, asi que el exterior es alcanzable energeticamente igual que la region del otro cuerpo.',
  'cr3bp.regime.l3Open':
    'Solo quedan dos pequenas islas prohibidas, alrededor de L4 y L5.',
  'cr3bp.regime.unrestricted':
    'Nada en ninguna parte esta energeticamente prohibido para este trazador.',
  'cr3bp.routh.below':
    '\u03bc esta por debajo del valor de Routh, {mu}, asi que L4 y L5 son linealmente estables. Los tres puntos colineales no lo son nunca, con ninguna razon de masas.',
  'cr3bp.routh.above':
    '\u03bc esta por encima del valor de Routh, {mu}, asi que ninguno de los cinco es estable, ni siquiera L4 y L5.',
  'cr3bp.claims.title': 'Tres afirmaciones que no son la misma',
  'cr3bp.claims.accessible':
    'Accesible energeticamente: la constante de Jacobi no prohibe al trazador estar en ese punto. Eso es todo lo que dice el sombreado.',
  'cr3bp.claims.reachable':
    'Que vaya a ir realmente: es otra cuestion, y esta superposicion no puede responderla. Un cuello abierto es un hueco en un muro, no una ruta a traves de el; el trazador puede orbitar para siempre a un lado de una abertura que nunca usa. Solo integrar la trayectoria lo resuelve.',
  'cr3bp.claims.stable':
    'Estable: una tercera cuestion distinta. Significa que un trazador desplazado ligeramente de un equilibrio vuelve en lugar de irse, y aqui solo es cierto de L4 y L5, y solo por debajo de la razon de masas de Routh. Nada en una curva de velocidad cero lo implica.',

  // --- The exoplanet lesson widgets ---------------------------------------------
  // js/exoplanetWidgets.js is reached only through js/widgets.js, which is
  // reached only from js/investigations.js - all of it lazy. These were in the
  // start-up catalogue for a widget nobody sees until they open a lesson.
  'exoW.whoIsActuallyMoving': '¿Quién se mueve de verdad?',
  'exoW.theStarAndThePlanet':
    'La estrella y el planeta giran ambos alrededor del mismo punto. Sube el aumento para ver hacerlo a la estrella.',
  'exoW.planetMass': 'Masa del planeta',
  'exoW.orbitSize': 'Tamaño de la órbita',
  'exoW.stellarWobbleShown': 'Bamboleo estelar mostrado',
  'exoW.jupiterAtJupiterSDistance': 'Júpiter, a la distancia de Júpiter',
  'exoW.theSunReallyDoesThis':
    'El Sol hace esto de verdad. Su órbita de reflejo mide como un radio solar y tarda doce años en completarse.',
  'exoW.anEarth': 'Una Tierra',
  'exoW.starSOwnOrbit': 'Órbita propia de la estrella',
  'exoW.planetSOrbit': 'Órbita del planeta',
  'exoW.planetSOrbitIsBigger': 'La órbita del planeta es mayor en',
  'exoW.bothGoRoundOnceEvery': 'Ambos dan una vuelta cada',
  'exoW.towardUsAwayFromUs': 'Hacia nosotros, lejos de nosotros',
  'exoW.inclination': 'Inclinación',
  'exoW.radialVelocityNow': 'Velocidad radial ahora',
  'exoW.whichWay': 'En qué sentido',
  'exoW.semiAmplitudeK': 'Semiamplitud K',
  'exoW.whatMakesTheWobbleBigger': '¿Qué hace mayor el bamboleo?',
  'exoW.oneThingChangesAtA':
    'Cambia una cosa cada vez. La estrella, el periodo y el ángulo de visión se mantienen quietos.',
  'exoW.aNeptune': 'Un Neptuno',
  'exoW.aHeavyJupiter': 'Un Júpiter pesado',
  'exoW.doubleTheMassAndK': 'Dobla la masa y K',
  'exoW.theSamePlanetTilted': 'El mismo planeta, inclinado',
  'exoW.thePlanetDoesNotChange':
    'El planeta no cambia. Solo cambia nuestro ángulo de visión. Observa qué le pasa a la masa que informa la velocidad radial.',
  'exoW.truePlanetMass': 'Masa real del planeta',
  'exoW.edgeOn90': 'De canto, 90°',
  'exoW.aTransitingSystemIsClose':
    'Un sistema en tránsito está cerca de esto, y por eso su masa es una masa y no un límite inferior.',
  'exoW.faceOn5': 'De frente, 5°',
  'exoW.almostNoRadialVelocitySignal':
    'Casi ninguna señal de velocidad radial. El planeta sigue estando ahí.',
  'exoW.kWeWouldMeasure': 'K que mediríamos',
  'exoW.massRvAloneReports': 'Masa que informa la VR por sí sola',
  'exoW.thatIsTheTrueMass': 'Es decir, la masa real por',
  'exoW.soRadialVelocityGives': 'Así que la velocidad radial da',
  'exoW.theWobbleAcrossTheSky': 'El bamboleo por el cielo',
  'exoW.astrometryMeasuresWhereTheStar':
    'La astrometría mide dónde está la estrella, no con qué rapidez viene hacia nosotros. Aquí nada es una imagen del planeta.',
  'exoW.distance': 'Distancia',
  'exoW.aTextbookRadialVelocityTarget':
    'Un objetivo de manual para la velocidad radial y desesperado para la astrometría: muy cerca de su estrella y a casi cincuenta pársecs.',
  'exoW.sunAndJupiterAt10': 'El Sol y Júpiter a 10 pc',
  'exoW.theSameMethodAWide':
    'El mismo método, una órbita ancha y un sistema cercano: cientos de veces más fácil.',
  'exoW.twiceAsFarAway': 'Al doble de distancia',
  'exoW.theStarSOrbitHas':
    'La órbita de la estrella no ha cambiado en absoluto. Solo ha cambiado el ángulo que subtiende.',
  'exoW.starSReflexOrbit': 'Órbita de reflejo de la estrella',
  'exoW.angularSignature': 'Firma angular',
  'exoW.orbitalPeriod': 'Periodo orbital',
  'exoW.distanceChanges': 'Cambios de distancia',
  'exoW.threeMethodsOneSystem': 'Tres métodos, un sistema',
  'exoW.tiltTheSamePlanetAnd':
    'Inclina el mismo planeta y observa qué medidas sobreviven. Ningún método gana en todas partes.',
  'exoW.transit': 'Tránsito',
  'exoW.radialVelocity': 'Velocidad radial',
  'exoW.astrometry': 'Astrometría',
  'exoW.together': 'Juntas',
  'exoW.whatDoWeActuallyKnow': '¿Qué sabemos en realidad?',
  'exoW.eachRowIsOneObservation':
    'Cada fila es una observación y lo que compra. Las dos últimas filas necesitan las de arriba.',
  'exoW.radiusFromTheTransit': 'Radio, del tránsito',
  'exoW.massFromRadialVelocity': 'Masa, de la velocidad radial',
  'exoW.starSLuminosity': 'Luminosidad de la estrella',
  'exoW.starSTemperature': 'Temperatura de la estrella',
  'exoW.thePlanetThisLessonMeasured':
    'El planeta que midió esta lección. Grande, ligero y demasiado cerca de su estrella para la zona.',
  'exoW.planetAARockyCandidate': 'Planeta A: un candidato rocoso',
  'exoW.planetBPuffy': 'Planeta B: esponjoso',
  'exoW.planetCRockyTooHot': 'Planeta C: rocoso, demasiado caliente',
  'exoW.aRockyDensityAndFar':
    'Una densidad rocosa, y demasiado cerca de su estrella para la zona. La composición nunca fue toda la pregunta.',
  'exoW.bulkDensity': 'Densidad media',
  'exoW.whichMeans': 'Lo que significa',
  'exoW.starlightReceived': 'Luz estelar recibida',
  'exoW.modeledHabitableZone': 'Zona habitable modelada',
  'exoW.thisPlanetIs': 'Este planeta está',
  'exoW.whatYourScheduleSees': 'Lo que ve tu calendario',
  'exoW.theDashedCurveIsTheTruth':
    'La curva discontinua es el planeta tal como lo conoce la simulación, dibujada aquí para enseñar. Un sondeo real solo tiene los puntos.',
  'exoW.daysBetweenMeasurements': 'Días entre medidas',
  'exoW.numberOfMeasurements': 'Número de medidas',
  'exoW.measurementUncertainty': 'Incertidumbre de medida',
  'exoW.noiseSeed': 'Semilla del ruido',
  'exoW.scheduleAIntensive': 'Calendario A: un ciclo',
  'exoW.scheduleAIntensive.note':
    'Doce medidas repartidas a lo largo de una sola órbita. Cada parte del ciclo se observa una vez.',
  'exoW.scheduleBPatient': 'Calendario B: un ciclo de separación',
  'exoW.scheduleBPatient.note':
    'Las mismas doce medidas a lo largo de once veces el intervalo total, una cada 3,52 días. El planeta completa casi exactamente una órbita entre una y otra.',
  'exoW.aSmallerPlanet': 'Un planeta más pequeño',
  'exoW.aBetterSpectrograph': 'Un espectrógrafo mejor',
  'exoW.aSmallerPlanet.note':
    'Un Neptuno en lugar de un Júpiter, con el calendario bueno. La señal ya es comparable a las barras de error.',
  'exoW.aBetterSpectrograph.note':
    'El mismo Neptuno, medido ocho veces con más precisión. Nada cambió en el planeta ni en el calendario.',
  'exoW.daysAxis': 'Días',
  'exoW.phaseAxis': 'Fase',
  'exoW.idealSignalOverlay': 'discontinua: señal ideal (capa didáctica)',
  'exoW.foldedOnTheTruePeriod': 'plegada con el periodo verdadero',
  'exoW.measurementsTaken': 'Medidas',
  'exoW.phaseCoverage': 'Cobertura en fase',
  'exoW.binsOfTheCycle': 'intervalos del ciclo',
  'exoW.scatterOfTheMeasurements': 'Dispersión de las medidas',
  'exoW.scatterExpectedFromNoise': 'Dispersión esperada solo por el ruido',
  'exoW.scatterVsConstantVelocity': 'Frente a una velocidad constante',
  'exoW.needsAnErrorBar': 'hace falta una incertidumbre con la que comparar',
  'exoW.whatThatDoesNotSay': 'Lo que eso no dice',
  'exoW.excessScatterIsNotAPlanet':
    'Una dispersión mayor significa que la velocidad no es constante. No identifica un planeta, ni un periodo, ni una masa.',
};
