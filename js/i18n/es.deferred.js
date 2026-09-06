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
  'exoW.readout.correlatedFloor': 'Suelo correlacionado',
  'exoW.readout.inTransitHours': 'Horas pasadas en tránsito',
  'exoW.readout.ceiling': 'Lo mejor posible, observando infinitamente',
  'exoW.whatSwampsATransit': 'Contra qué compite un tránsito',
  'exoW.whatSwampsATransit.note':
    'El ruido de fotones se da por hora y se promedia a lo largo de todo el tiempo en tránsito. Los otros dos están correlacionados en la escala de tiempo de un tránsito y no se promedian en absoluto.',
  'exoW.transitDepth': 'Profundidad del tránsito',
  'exoW.photonNoise': 'Ruido de fotones y lectura',
  'exoW.stellarNoise': 'Manchas y granulación estelar',
  'exoW.instrumentNoise': 'Instrumento y atmósfera',
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
};
