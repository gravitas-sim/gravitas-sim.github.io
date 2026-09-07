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
    'Las trayectorias coincidieron al principio y se separaron después. Eso descarta un esquema que fuera erróneo desde el primer acercamiento; no dice por qué se separaron.',
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
  'reliability.reason.sweeping':
    'Un barrido de parámetros está usando la simulación. Espera a que termine, o cancélalo.',
  'reliability.reason.checking':
    'Una comprobación de fiabilidad está usando la simulación. Espera a que termine, o cancélala.',
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
  'reliability.divergenceObserved':
    'Lo que muestra esta comparación: con estos dos tamaños de paso las medidas agregadas coinciden y las trayectorias no, a partir de cierto punto.',
  'reliability.divergenceIsNotChaos':
    'Ese patrón no demuestra caos. Una diferencia sistemática pequeña también lo produce: un paso de integración que desplaza el período orbital una fracción de un por ciento hace que dos ejecuciones se desfasen, y dos sinusoides de frecuencia ligeramente distinta coinciden al principio y se separan después por la misma razón. La dependencia sensible es una explicación entre varias.',
  'reliability.divergenceNextStep':
    'Distinguirlas requiere pruebas que esta ejecución no recoge: cómo crece la separación con el tiempo, y si crece igual desde muchos inicios cercanos. La convergencia de los agregados, la divergencia de la trayectoria y la evidencia de caos son tres hallazgos distintos.',
  'reliability.quoteStatistics':
    'Cita los agregados de esta ejecución en vez de posiciones en un instante dado.',
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
  // Habitability, binary and tidal widget prose. Same boundary and same
  // reasoning as the resW/chaosW/energyW families above: js/widgets.js is
  // reached only from the lazy js/investigations.js, and each of these three
  // modules registers this catalogue itself so a direct import cannot render
  // raw ids.
  'binW.twoStarsOrbiting': 'Dos estrellas, orbitando',
  'binW.bothStarsAreMovingWatch':
    'Las dos estrellas se mueven. Obsérvalas unos segundos antes de leer nada.',
  'binW.massOfStarA': 'Masa de la Estrella A',
  'binW.massOfStarB': 'Masa de la Estrella B',
  'binW.mark': '⚑ Marcar',
  'binW.stop': '■ Parar',
  'binW.runPause': '▶ Ejecutar / Pausar',
  'binW.reset': '↺ Reiniciar',
  'binW.starADistanceFromThe': 'Estrella A, distancia al baricentro',
  'binW.starBDistanceFromThe': 'Estrella B, distancia al baricentro',
  'binW.distanceBetweenTheTwoStars': 'Distancia entre las dos estrellas',
  'binW.whichStarIsCloserTo':
    'Qué estrella está más cerca del punto de equilibrio',
  'binW.yearsSinceYouStartedWatching': 'Años desde que empezaste a observar',
  'binW.stopwatch': 'Cronómetro',
  'binW.timeForOneFullOrbit': 'Tiempo de una órbita completa',
  'binW.totalMassOfThePair': 'Masa total del par',
  'binW.howFarThePlanetMoves': 'Cuánto se mueve el planeta',
  'binW.howFarTheStarMoves': 'Cuánto se mueve la estrella',
  'binW.theStarSWobbleCompared':
    'El bamboleo de la estrella, comparado con la órbita del planeta',
  'binW.lightweightPair': 'par ligero',
  'binW.heavyweightPair': 'par pesado',
  'binW.sameSizeOrbitDifferentMasses':
    'Órbita del mismo tamaño, masas distintas',
  'binW.bothPairsAreExactlyThe':
    'Ambos pares están exactamente a la misma distancia. Solo difieren las masas. Observa cuál da la vuelta primero.',
  'binW.yearsElapsed': 'Años transcurridos',
  'binW.separationOfEachPair': 'Separación de cada par',
  'binW.theBalancePoint': 'El punto de equilibrio',
  'binW.aSeeSawBalancesWhen':
    'Un balancín se equilibra cuando el niño más pesado se sienta más cerca del centro. Dos estrellas hacen exactamente lo mismo.',
  'binW.starADistanceFromThe2': 'Estrella A, distancia al centro',
  'binW.starBDistanceFromThe2': 'Estrella B, distancia al centro',
  'binW.1AuAnd2Au': '1 UA y 2 UA',
  'binW.starBIsTwiceAs':
    'La Estrella B está el doble de lejos, así que la Estrella A debe ser el doble de pesada para equilibrarla.',
  'binW.1AuAnd3Au': '1 UA y 3 UA',
  'binW.starBIsThreeTimes':
    'La Estrella B está tres veces más lejos, así que la Estrella A es tres veces más pesada.',
  'binW.2AuAnd4Au': '2 UA y 4 UA',
  'binW.twiceAsFarAgainSo':
    'Otra vez el doble de lejos, así que otra vez el doble de pesada. Solo importa el cociente de las dos distancias, no las distancias en sí.',
  'binW.equal2AuEach': 'Iguales, 2 UA cada una',
  'binW.equalDistancesMeanEqualMasses':
    'Distancias iguales significan masas iguales. Este es el caso con el que empezaste la lección.',
  'binW.starAIsThisFar': 'La Estrella A está a esta distancia del centro',
  'binW.starBIsThisFar': 'La Estrella B está a esta distancia del centro',
  'binW.theHeavierStarAndBy': 'La estrella más pesada, y por cuánto',
  'binW.siriusWatchedForACentury': 'Sirio, observada durante un siglo',
  'binW.observationsUpTo': 'Observaciones hasta',
  'binW.oneDecade': 'Una década',
  'binW.threeDotsTheyAreMoving':
    'Tres puntos. Se mueven, pero nadie podría decirte la forma de la órbita a partir de esto.',
  'binW.halfAnOrbit': 'Media órbita',
  'binW.oneFullOrbit': 'Una órbita completa',
  'binW.aCentury': 'Un siglo',
  'binW.observationsPlotted': 'Observaciones representadas',
  'binW.yearsOfWatching': 'Años de observación',
  'binW.orbitsCompleted': 'Órbitas completadas',
  'binW.periodOnceTheOrbitCloses': 'Periodo, una vez que la órbita se cierra',
  'binW.orbitSizeOnceTheOrbit': 'Tamaño de la órbita, una vez que se cierra',
  'tideW.thePullOnThreePoints': 'La atracción sobre tres puntos',
  'tideW.distanceToTheCompanion': 'Distancia al compañero',
  'tideW.moonSDistance': '× la distancia de la Luna',
  'tideW.massOfTheCompanion': 'Masa del compañero',
  'tideW.moonSMass': '× la masa de la Luna',
  'tideW.pullOnTheNearSide': 'Atracción sobre el lado cercano',
  'tideW.pullOnTheCentre': 'Atracción sobre el centro',
  'tideW.pullOnTheFarSide': 'Atracción sobre el lado lejano',
  'tideW.nearSideMinusTheCentre': 'Lado cercano, menos el centro',
  'tideW.farSideMinusTheCentre': 'Lado lejano, menos el centro',
  'tideW.nearSideBiggerThanFar': 'El lado cercano supera al lejano en',
  'tideW.towardTheCompanion': 'hacia el compañero',
  'tideW.whatIsLeftOver': 'lo que queda',
  'tideW.tidalStrength': 'Intensidad de marea',
  'tideW.distance': 'Distancia',
  'tideW.mass': 'Masa',
  'tideW.tidalStretch': 'Estiramiento de marea',
  'tideW.inFullUnits': 'En unidades completas',
  'tideW.sevenRealTidesOnOne': 'Siete mareas reales, en una escala',
  'tideW.highlight': 'Resaltar',
  'tideW.pairing': 'Pareja',
  'tideW.separation': 'Separación',
  'tideW.comparedWithTheLunarTide': 'Comparada con la marea lunar',
  'tideW.cometIce': 'Hielo de cometa',
  'tideW.aPorousWeaklyBoundNucleus':
    'Un núcleo poroso y débilmente ligado. Muy poco agarre para su tamaño, así que la balanza se inclina muy lejos.',
  'tideW.theMoon': 'La Luna',
  'tideW.iron': 'Hierro',
  'tideW.aDenseMetallicBodyMore':
    'Un cuerpo metálico denso. Más agarre para su tamaño, así que puede acercarse más antes de que la balanza se incline.',
  'tideW.stretchAgainstGrip': 'Estiramiento contra agarre',
  'tideW.distanceFromTheEarthS': 'Distancia al centro de la Tierra',
  'tideW.earthRadii': 'radios terrestres',
  'tideW.densityOfTheBody': 'Densidad del cuerpo',
  'tideW.itsOwnGravityAtIts': 'Su propia gravedad, en su superficie',
  'tideW.tidalStretchAtItsSurface': 'Estiramiento de marea, en su superficie',
  'tideW.stretchGrip': 'Estiramiento ÷ agarre',
  'tideW.theTwoAreEqualAt': 'Los dos se igualan a',
  'tideW.whatThatMeans': 'Qué significa eso',
  'tideW.bringAMoonInToward': 'Acerca una luna a Saturno',
  'tideW.distanceFromSaturnSCentre': 'Distancia al centro de Saturno',
  'tideW.saturnRadii': 'radios de Saturno',
  'tideW.densityOfTheMoon': 'Densidad de la luna',
  'tideW.porousIce': 'Hielo poroso',
  'tideW.whatSaturnSRingParticles':
    'Lo que son de verdad las partículas de los anillos de Saturno: hielo de agua, poco compactado. Este es el caso que ponen a prueba los propios anillos.',
  'tideW.solidIce': 'Hielo sólido',
  'tideW.denseUnfracturedIceTheLimit':
    'Hielo denso y sin fracturar. El límite se mueve hacia dentro, porque un cuerpo más denso se agarra a sí mismo con más fuerza.',
  'tideW.rock': 'Roca',
  'tideW.denserSoItHoldsTogether':
    'Más denso, así que se mantiene unido más cerca. El límite de Roche no es una sola distancia: depende de lo que cae.',
  'tideW.denserStillAndTheLimit':
    'Más denso todavía, y el límite se mueve de nuevo hacia dentro. Cambia de qué está hecha la luna y cambias dónde se rompe.',
  'tideW.rocheLimitBodyWithNo': 'Límite de Roche, cuerpo sin resistencia',
  'tideW.rocheLimitBodyThatKeeps':
    'Límite de Roche, cuerpo que conserva su forma',
  'tideW.stretchGripWhereYouHave': 'Estiramiento ÷ agarre donde lo has puesto',
  'tideW.verdict': 'Veredicto',
  'tideW.forComparisonTheARing':
    'Como comparación, el borde exterior del anillo A',
  'tideW.andMimasTheInnermostRound': 'Y Mimas, la luna redonda más interior',
  'tideW.aSunLikeStarFalling':
    'Una estrella parecida al Sol cayendo hacia un agujero negro',
  'tideW.blackHoleMass': 'Masa del agujero negro',
  'tideW.stellar10M': 'Estelar, 10 M☉',
  'tideW.sagittariusA4MillionM': 'Sagitario A*, 4 millones de M☉',
  'tideW.aGiant1BillionM': 'Un gigante, 1000 millones de M☉',
  'tideW.starIsTornApartAt': 'La estrella se desgarra a',
  'tideW.eventHorizonAt': 'Horizonte de sucesos a',
  'tideW.tidalRadiusHorizon': 'Radio de marea ÷ horizonte',
  'tideW.whatAnOutsideObserverSees': 'Lo que ve un observador externo',
  'hzW.howMuchStarlightReachesThe': '¿Cuánta luz estelar llega al planeta?',
  'hzW.distanceFromTheStar': 'Distancia a la estrella',
  'hzW.halfOfEarthSDistance': 'La mitad de la distancia de la Tierra.',
  'hzW.earthSDistanceFromThe': 'La distancia de la Tierra al Sol.',
  'hzW.twiceEarthSDistance': 'El doble de la distancia de la Tierra.',
  'hzW.threeTimesEarthSDistance': 'Tres veces la distancia de la Tierra.',
  'hzW.starlightReachingEachSquareMeter':
    'Luz estelar que llega a cada metro cuadrado',
  'hzW.theSameThingInPhysical': 'Lo mismo en unidades físicas',
  'hzW.earthForComparison': 'La Tierra, como comparación',
  'hzW.theSameLightSpreadFurther': 'La misma luz, repartida más lejos',
  'hzW.theStarIsNotRunning':
    'La estrella no se está quedando sin luz. Observa el trozo de luz y la cáscara sobre la que cae a medida que crece la distancia.',
  'hzW.theShell': 'La cáscara',
  'hzW.soEachSquareMeterGets': 'Así que cada metro cuadrado recibe',
  'hzW.totalEnergyCrossingTheShell': 'Energía total que cruza la cáscara',
  'hzW.theShellIsThisMany': 'La cáscara es esta cantidad de veces mayor',
  'hzW.aDimRedDwarf': 'Una enana roja tenue',
  'hzW.likeProximaCentauriTheNearest':
    'Como Próxima Centauri, la estrella más cercana al Sol.',
  'hzW.anOrangeDwarf': 'Una enana naranja',
  'hzW.likeAlphaCentauriB': 'Como Alfa Centauri B.',
  'hzW.theSun': 'El Sol',
  'hzW.theStarWeKnowBest': 'La estrella que mejor conocemos.',
  'hzW.aHotterBrighterStar': 'Una estrella más caliente y más brillante',
  'hzW.likeProcyonA': 'Como Proción A.',
  'hzW.theSamePlanetADifferent': 'El mismo planeta, otra estrella',
  'hzW.star': 'Estrella',
  'hzW.planetSDistance': 'Distancia del planeta',
  'hzW.itsLuminosity': 'Su luminosidad',
  'hzW.starlightThePlanetReceives': 'Luz estelar que recibe el planeta',
  'hzW.habitableZoneRunsFrom': 'La zona habitable va de',
  'hzW.thisPlanetIs': 'Este planeta está',
  'hzW.whereTheEdgesComeFrom': 'De dónde salen los bordes',
  'hzW.definition': 'Definición',
  'hzW.conservative': 'Conservadora',
  'hzW.optimistic': 'Optimista',
  'hzW.definitionShown': 'Definición mostrada',
  'hzW.innerEdge': 'Borde interior',
  'hzW.outerEdge': 'Borde exterior',
  'hzW.widthOfTheZone': 'Anchura de la zona',
  'hzW.earthSitsAt': 'La Tierra está a',
  'hzW.aYearOnAnEccentric': 'Un año en una órbita excéntrica',
  'hzW.eccentricity': 'Excentricidad',
  'hzW.semiMajorAxis': 'Semieje mayor',
  'hzW.runPause': '▶ Ejecutar / Pausar',
  'hzW.reset': '↺ Reiniciar',
  'hzW.distanceRightNow': 'Distancia ahora mismo',
  'hzW.starlightRightNow': 'Luz estelar ahora mismo',
  'hzW.closestFurthest': 'Mínima / máxima',
  'hzW.starlightAtClosestFurthest':
    'Luz estelar en el punto más cercano / más lejano',
  'hzW.rightNowThePlanetIs': 'Ahora mismo el planeta está',
  'hzW.fractionOfTheYearInside': 'Fracción del año dentro de la zona',
  'hzW.trappist1AllSevenPlanets': 'TRAPPIST-1, los siete planetas',
  'hzW.zoneDefinition': 'Definición de la zona',
  'hzW.habitableZone': 'Zona habitable',
  'hzW.mercury': 'Mercurio',
  'hzW.venus': 'Venus',
  'hzW.earth': 'La Tierra',
  'hzW.planetA': 'Planeta A',
  'hzW.planetB': 'Planeta B',
  'hzW.planetC': 'Planeta C',
  'hzW.threePlanetsSimilarStarlight': 'Tres planetas, luz estelar parecida',
  'hzW.showing': 'Mostrando',
  // --- El análisis de incertidumbre ---------------------------------------------
  'rvfit.mc.title': 'Análisis de incertidumbre (opcional)',
  'rvfit.mc.hint':
    'Simula esta campaña de observación una y otra vez —las mismas épocas, las mismas incertidumbres declaradas, un sorteo de ruido nuevo cada vez— y reajusta cada una con la búsqueda que acabas de hacer. Donde caen los reajustes indica con qué precisión tus datos fijan el período.',
  'rvfit.mc.trials': 'Pruebas',
  'rvfit.mc.seed': 'Semilla de ruido',
  'rvfit.mc.seedHint':
    'La misma semilla reproduce exactamente los mismos intervalos, y la exportación la incluye.',
  'rvfit.mc.run': 'Ejecutar análisis',
  'rvfit.mc.cancel': 'Cancelar',
  'rvfit.mc.running': 'Prueba {done} de {total}…',
  'rvfit.mc.idle': 'Sin ejecutar todavía.',
  'rvfit.mc.stale':
    'La grabación, el ajuste o el rango de búsqueda han cambiado desde que se ejecutó este análisis, así que sus intervalos ya no describen lo que hay en pantalla. Vuelve a ejecutarlo.',
  'rvfit.mc.outcome.complete':
    'Todas las pruebas se ejecutaron y dieron ajuste.',
  'rvfit.mc.outcome.cancelled':
    'Detenido por ti tras {done} de {total} pruebas.',
  'rvfit.mc.outcome.partial': '{done} de {total} pruebas dieron ajuste.',

  'rvfit.mc.refused.noFit':
    'No hay ningún ajuste en pantalla alrededor del cual remuestrear. Fija primero un período.',
  'rvfit.mc.refused.tooFewPoints':
    'Solo {n} medidas utilizables; esto necesita al menos {need}.',
  'rvfit.mc.refused.noUncertainties':
    'Esta campaña no declara incertidumbres, así que no hay nada que propagar. Cada campaña simulada sería idéntica a tu ajuste y el intervalo saldría nulo, lo que se leería como un período perfectamente determinado en vez de como una ausencia de barras de error. Fija una incertidumbre distinta de cero en el panel de observación y vuelve a grabar.',
  'rvfit.mc.refused.badBounds':
    'El rango de períodos no es un rango. Revisa los límites de búsqueda de arriba.',
  'rvfit.mc.refused.badTrials': 'Elige entre {min} y {max} pruebas.',

  'rvfit.mc.failed.noSearch':
    'la búsqueda de período no encontró nada que ajustar',
  'rvfit.mc.failed.notFinite':
    'el cálculo devolvió un valor que no era un número',

  'rvfit.mc.assume.model':
    'Una órbita circular con un solo acompañante. Todos los intervalos de abajo están condicionados a que ese modelo sea el correcto.',
  'rvfit.mc.assume.gaussian':
    'Los errores son gaussianos, con la desviación típica que declara cada época.',
  'rvfit.mc.assume.independent':
    'Los errores son independientes entre épocas: sin sistemáticos de noche a noche ni derivas del instrumento.',
  'rvfit.mc.assume.sigmas':
    'Las incertidumbres declaradas son correctas. Si son optimistas, todos los intervalos de aquí también lo son.',
  'rvfit.mc.assume.precision':
    'Esto mide precisión, no corrección. Un modelo equivocado puede dar un intervalo muy estrecho.',
  'rvfit.mc.assumptions': 'Estos intervalos están condicionados a:',

  'rvfit.mc.result.single':
    'Período {median} d, de {p16} a {p84} ({pct}% de las pruebas). Amplitud {kMedian} m/s, de {kP16} a {kP84}.',
  'rvfit.mc.result.multimodal': {
    one: 'Los reajustes cayeron en {n} familia separada; mira abajo.',
    other:
      'Los reajustes cayeron en {n} familias separadas. Aquí no hay un único período con barra de error: dar uno promediaría soluciones que ajustan los datos casi igual de bien y no describiría nada.',
  },
  'rvfit.mc.result.gridLimited':
    'Todas las pruebas devolvieron el mismo período, lo que significa que la rejilla de búsqueda es más gruesa que la incertidumbre que se está midiendo. No se informa ningún intervalo, porque sería un retrato de la rejilla y no de los datos.',
  'rvfit.mc.result.incomplete':
    'Se ejecutaron {done} de {total} pruebas. Los intervalos de abajo salen de esas {done}.',
  'rvfit.mc.result.cancelled': 'Cancelado tras {done} de {total} pruebas.',
  'rvfit.mc.result.failures': '{n} pruebas no dieron ajuste: {why}.',
  'rvfit.mc.result.epochs':
    '{n} épocas, línea de base de {baseline} d, {samples} puntos de rejilla por prueba, semilla {seed}.',

  'rvfit.mc.families': 'Familias de alias',
  'rvfit.mc.col.share': 'Proporción',
  'rvfit.mc.col.period': 'Período (d)',
  'rvfit.mc.col.amplitude': 'K (m/s)',
  'rvfit.mc.col.trials': 'Pruebas',
  'rvfit.mc.familyRow': '{median} ({p16}–{p84})',
  'rvfit.mc.otherFamilies': {
    one: 'y {n} familia más con menos del 1% de las pruebas',
    other: 'y {n} familias más con menos del 1% de las pruebas cada una',
  },

  'rvfit.mc.plot.period': 'Períodos recuperados',
  'rvfit.mc.plot.amplitude': 'Amplitudes recuperadas',
  'rvfit.mc.plot.periodAxis': 'Período (días)',
  'rvfit.mc.plot.amplitudeAxis': 'K (m/s)',
  'rvfit.mc.plot.count': 'Pruebas por intervalo',
  'rvfit.mc.plot.none': 'Todavía no hay nada que dibujar.',

  'rvfit.mc.guidance.heading': 'La precisión no es la corrección',
  'rvfit.mc.guidance.a':
    'Un intervalo estrecho dice que el ruido de tus datos no habría movido mucho la respuesta. No dice que la respuesta sea correcta. Ajusta un modelo circular a una órbita excéntrica y puedes obtener un período fijado a cuatro decimales que está equivocado en el primero: el intervalo mide el ruido, y el error del modelo no es ruido.',
  'rvfit.mc.guidance.b':
    'Así que lee juntos el intervalo y los residuos. Un intervalo estrecho con residuos estructurados significa un parámetro determinado con precisión de un modelo que no ajusta. Lo que hay que creer es la estructura de los residuos.',
  'rvfit.mc.guidance.c':
    'Y cuando los reajustes se separan en familias, esa es la respuesta honesta: los datos admiten varios períodos. Lo que elimina familias son más observaciones, u observaciones espaciadas de otra forma, no más pruebas aquí. Ejecutar diez mil pruebas hace cada intervalo más suave y las familias igual de reales.',

  // --- Widget prose, moved off the start-up path ---------------------------
  // Resonance, chaos and energy widget strings. Nothing outside a lesson can
  // render these: js/widgets.js is reached only from js/investigations.js,
  // which is lazy and whose loader registers this catalogue before any step
  // draws. Same boundary and same reasoning as the exoW.* family above it.
  'resW.periods.title': 'Periodos medidos y las razones entre ellos',
  'resW.periods.note':
    'Los periodos se miden de las propias órbitas y se promedian sobre toda la ejecución; no se leen de una tabla. La razón de enteros pequeños más cercana se halla por fracciones continuas, que encuentran una para cualquier número: por eso importa más la última cifra de cada fila —cuánto más cerca está la razón de lo que daría el azar— que la razón misma.',
  'resW.periods.axis': 'periodo orbital, logarítmico',
  'resW.periods.scaled': 'modelo a escala: distancias ×100, reloj ×1000',
  'resW.periods.true': 'escala real',
  'resW.angle.title': 'El ángulo resonante',
  'resW.angle.note':
    'Arriba: el ángulo plegado en una vuelta. Si recorre todos los valores, los cuerpos adoptan sucesivamente todas las geometrías relativas y no hay resonancia. Abajo: el mismo ángulo desplegado, donde una circulación es una rampa y una libración es una onda. El veredicto sale del gráfico inferior, y puede legítimamente ser «aún no se puede saber».',
  'resW.conj.title': 'Dónde se alinean los dos cuerpos',
  'resW.conj.note':
    'Cada conjunción de la ejecución, trazada dos veces: dónde ocurrió en el cielo y dónde estaba el cuerpo exterior en su propia órbita en ese momento. Una resonancia aparece como un cúmulo en el segundo disco; y si ese cúmulo está en 180°, toda alineación ocurre en el afelio del cuerpo exterior.',
  'resW.conj.sky': 'longitud en el cielo',
  'resW.conj.orbit': 'posición en la órbita exterior',
  'resW.frame.title': 'El marco rotante',
  'resW.frame.note':
    'El mismo sistema visto desde un marco que gira con el secundario, fijo a la derecha y a una unidad de distancia. L4 y L5 son los dos puntos triangulares de equilibrio. En este marco un cuerpo coorbital dibuja un lazo cerrado alrededor de uno de ellos; uno que no lo sea da la vuelta entera.',
  'resW.plot.wrapped': 'ángulo, plegado en 0–360°',
  'resW.plot.unwrapped': 'el mismo ángulo, desplegado',
  'resW.empty.no-world': 'no hay ningún sistema cargado',
  'resW.empty.warming-up': 'observando: deja correr la simulación',
  'resW.empty.no-argument':
    'este sistema no tiene un par para el argumento solicitado',
  'resW.empty.no-pair': 'los cuerpos indicados no están ambos aquí',
  'resW.empty.no-secondary':
    'no hay cuerpo secundario sobre el que construir un marco rotante',
  'resW.empty.no-conjunctions': 'aún no ha ocurrido ninguna alineación',
  'resW.row.status': 'Estado',
  'resW.row.argument': 'Argumento',
  'resW.row.ratio': 'P({a}) / P({b})',
  'resW.row.watched': 'Observado durante',
  'resW.row.verdict': 'Veredicto',
  'resW.row.centre': 'Centro de libración',
  'resW.row.amplitude': 'Amplitud',
  'resW.row.libration': 'Periodo de libración',
  'resW.row.circulation': 'Periodo de circulación',
  'resW.row.needed': 'Qué falta',
  'resW.row.sampling': 'Muestreo',
  'resW.row.pair': 'Par',
  'resW.row.count': 'Conjunciones vistas',
  'resW.row.skySpread': 'Dispersión en el cielo',
  'resW.row.orbitSpread': 'Dispersión en la órbita exterior',
  'resW.row.where': 'Lo que significa',
  'resW.row.frame': 'El marco gira con',
  'resW.value.periodDays': '{days} días',
  'resW.value.periodYears': '{years} años',
  'resW.value.ratio':
    '{ratio} — la más cercana es {p}:{q}, desviada un {off}% ({chance}× más cerca que el azar)',
  'resW.value.watched': '{cycles} ciclos de conjunción ({days} días)',
  'resW.value.amplitudeBound': 'al menos ±{amp}°: todavía no ha dado la vuelta',
  'resW.value.librationPeriod':
    '{days} días = {cycles} ciclos de conjunción ({certainty})',
  'resW.value.measured': 'medido',
  'resW.value.provisional': 'de una sola oscilación, provisional',
  'resW.value.librationUnresolved':
    'más largo que esta ejecución: cualquier circulación tardaría más de {cycles} ciclos de conjunción',
  'resW.value.circulationPeriod': '{days} días = {cycles} ciclos de conjunción',
  'resW.value.needed':
    'el ángulo se ha movido {drift}° hasta ahora; eso es una libración de al menos esa anchura o una circulación de {cycles} ciclos de conjunción, y nada aquí las distingue',
  'resW.value.sampling': '{n} muestras, una cada {every} días',
  'resW.value.spread': 'centrado en {mean}°, dispersión ±{spread}°',
  'resW.value.tadpole': '{kind} en torno a {centre}°, amplitud ±{amp}°',
  'resW.verdict.none': 'aún no se ha medido nada',
  'resW.verdict.circulation':
    'CIRCULACIÓN: el ángulo recorre todos los valores, así que no hay resonancia',
  'resW.verdict.libration':
    'LIBRACIÓN: el ángulo se da la vuelta en lugar de completar el giro; los cuerpos están enganchados',
  'resW.verdict.stationary':
    'EQUILIBRIO: el ángulo no se ha movido en absoluto; este cuerpo está en un punto de Lagrange',
  'resW.verdict.librationProvisional':
    'LIBRACIÓN: el ángulo se dio la vuelta y regresó a donde empezó; una inversión más confirmará el periodo',
  'resW.inconclusive.one-reversal':
    'NO CONCLUYENTE: se ha dado la vuelta una vez, cosa que también hace un ángulo que circula despacio con una oscilación encima',
  'resW.inconclusive.drifting-centre':
    'NO CONCLUYENTE: oscila, pero cada oscilación termina más allá que la anterior, así que el centro se desplaza',
  'resW.inconclusive.confined':
    'NO CONCLUYENTE: confinado hasta ahora, pero aún no se ha dado la vuelta, y una circulación suficientemente lenta se vería igual',
  'resW.inconclusive.ambiguous-drift':
    'NO CONCLUYENTE: esta ejecución no distingue una libración amplia de una circulación lenta',
  'resW.inconclusive.too-few-samples':
    'NO CONCLUYENTE: aún no hay muestras suficientes',
  'resW.inconclusive.too-short':
    'NO CONCLUYENTE: la ejecución es más corta que veinte ciclos de conjunción',
  'resW.inconclusive.undersampled':
    'NO CONCLUYENTE: el ángulo se mueve demasiado deprisa entre muestras para seguirlo',
  'resW.inconclusive.no-window': 'NO CONCLUYENTE: no ha transcurrido tiempo',
  'resW.where.aphelion':
    'toda alineación ocurre cerca del afelio del cuerpo exterior, en su punto más lejano',
  'resW.where.perihelion':
    'toda alineación ocurre cerca del perihelio del cuerpo exterior, en su punto más cercano',
  'resW.where.side': 'las alineaciones se agrupan, pero lejos de ambos ápsides',
  'resW.where.scattered':
    'las alineaciones están repartidas por toda la órbita',
  'resW.kind.tadpole': 'renacuajo',
  'resW.kind.horseshoe': 'herradura',
  'chaosW.title': 'Cuán separadas están las dos ejecuciones',
  'chaosW.note':
    'La distancia entre la ejecución A y la B, sumada sobre todos los cuerpos y emparejada por identidad, en cada instante de tiempo simulado. Los mismos datos en dos ejes: lineal arriba, logarítmico abajo. Una recta en la gráfica inferior es crecimiento exponencial.',
  'chaosW.plot.linear': 'separación, escala lineal',
  'chaosW.plot.log': 'separación, escala logarítmica',
  'chaosW.plot.empty': 'no hay suficientes muestras solapadas',
  'chaosW.axis.separation': 'separación',
  'chaosW.axis.logSeparation': 'log₁₀ separación',
  'chaosW.axis.time': 'tiempo simulado →',
  'chaosW.empty.no-runs':
    'Graba la ejecución A y la B en el Banco A/B y vuelve aquí.',
  'chaosW.empty.no-overlap':
    'Las dos ejecuciones no se solapan en tiempo simulado. Grábalas con duraciones parecidas.',
  'chaosW.row.status': 'Estado',
  'chaosW.row.perturbation': 'Perturbación',
  'chaosW.row.start': 'Separación al principio',
  'chaosW.row.end': 'Separación al final',
  'chaosW.row.growth': 'Creció',
  'chaosW.row.behaviour': 'Comportamiento',
  'chaosW.row.window': 'Ajustado en',
  'chaosW.row.noEstimate': 'Sin tiempo de crecimiento porque',
  'chaosW.row.straightLine': 'Una recta ajusta con',
  'chaosW.row.refinement': 'Bajo refinamiento',
  'chaosW.value.perturbation': '{body}, {axis}, {km}',
  'chaosW.value.window': 't = {from} a {to} s  ({efolds} factores e)',
  'chaosW.value.resolved':
    'resuelto: los tiempos de crecimiento coinciden dentro del {spread}%',
  'chaosW.verdict.none': 'todavía no se ha medido nada',
  'chaosW.verdict.identical':
    'las dos ejecuciones son idénticas: la simulación es determinista',
  'chaosW.verdict.bounded':
    'acotada: las dos ejecuciones se mantienen próximas',
  'chaosW.verdict.linear':
    'crece en proporción al tiempo: eso es deriva, no caos',
  'chaosW.verdict.saturated':
    'saturada: las ejecuciones están tan separadas como permite este sistema',
  'chaosW.verdict.exponential':
    'exponencial, tiempo de crecimiento {tau} s  (r² = {r2})',
  'chaosW.reject.too-few-points':
    'hay muy pocas muestras utilizables para ajustar nada',
  'chaosW.reject.too-little-range':
    'la separación no creció los suficientes factores e. Por debajo de tres, una recta puede imitar una exponencial.',
  'chaosW.reject.too-short':
    'el intervalo ajustado es más corto que dos tiempos de crecimiento',
  'chaosW.reject.poor-fit':
    'una exponencial no ajusta lo bastante bien como para citar una escala temporal',
  'chaosW.reject.not-growing': 'la separación no está creciendo',
  'chaosW.reject.no-window':
    'ningún intervalo de la ejecución sirve para un ajuste',
  'chaosW.reject.insufficient': 'no hay datos suficientes',
  'chaosW.unresolved.need-two-estimates':
    'vuelve a grabar la comparación con un paso temporal menor u otro integrador',
  'chaosW.unresolved.behaviour-changed':
    'NO RESUELTO: el comportamiento mismo cambió con la numérica',
  'chaosW.unresolved.timescale-moved':
    'NO RESUELTO: el tiempo de crecimiento se movió con el paso temporal, así que es una propiedad del integrador',
  'energyW.theMoon': 'la Luna',
  'energyW.earth': 'la Tierra',
  'energyW.jupiter': 'Júpiter',
  'energyW.theSun': 'el Sol',
  'energyW.total': 'TOTAL',
  'energyW.doesItComeBack': '¿Vuelve?',
  'energyW.launchSpeed': 'Velocidad de lanzamiento',
  'energyW.slow6KmS': 'Lento: 6 km/s',
  'energyW.orbit78KmS': 'Órbita: 7,8 km/s',
  'energyW.boundary109KmS': 'Frontera: 10,9 km/s',
  'energyW.fast14KmS': 'Rápido: 14 km/s',
  'energyW.clearlyGoneItLeavesAlong':
    'Claramente se ha ido. Se marcha por una trayectoria abierta y todavía le sobra velocidad cuando está muy lejos.',
  'energyW.run': '▶ Ejecutar',
  'energyW.reset': '↺ Reiniciar',
  'energyW.totalEnergy': 'Energía total',
  'energyW.escapeSpeedFromHere': 'Velocidad de escape desde aquí',
  'energyW.furthestItGets': 'Hasta dónde llega',
  'energyW.energyAroundOneOrbit': 'Energía a lo largo de una órbita',
  'energyW.clickAPlanetInThe': 'Pulsa un planeta en la simulación',
  'energyW.watching': 'Observando',
  'energyW.energyOfMotion': 'Energía de movimiento',
  'energyW.howMuchTheTotalHas': 'Cuánto se ha movido el total',
  'energyW.whereItIs': 'Dónde está',
  'energyW.whatMakesEscapeHard': '¿Qué hace difícil escapar?',
  'energyW.escapeSpeedFromFourReal':
    'Velocidad de escape desde cuatro cuerpos reales. Mueve el deslizador para empezar más lejos y observa cómo caen todas las barras.',
  'energyW.startDistance': 'Distancia inicial',
  'energyW.bodyRadius': '× radio del cuerpo',
  'energyW.atTheSurface': 'En la superficie',
  'energyW.twiceAsFarOut': 'Al doble de distancia',
  'energyW.tenRadiiOut': 'A diez radios',
  'energyW.startingDistance': 'Distancia de partida',
  'energyW.oneLawThreeShapes': 'Una ley, tres formas',
  'energyW.theSamePlanetTheSame':
    'El mismo planeta, el mismo punto de lanzamiento, la misma ley de la gravedad. Solo cambia la velocidad.',
  'energyW.speedAsAFractionOf':
    'Velocidad, como fracción de la velocidad de escape',
  'energyW.belowEscape': 'Por debajo del escape',
  'energyW.exactlyEscape': 'Exactamente el escape',
  'energyW.aboveEscape': 'Por encima del escape',
  'energyW.shapeOfThePath': 'Forma de la trayectoria',
  'energyW.escapeSpeedHere': 'Velocidad de escape aquí',
  'energyW.belowEscapeEllipse': 'por debajo del escape: elipse',
  'energyW.escapeExactlyParabola': 'escape exacto: parábola',
  'energyW.aboveEscapeHyperbola': 'por encima del escape: hipérbola',
  // --- El cuaderno de pruebas --------------------------------------------------
  'nb.title': 'Cuaderno de pruebas',
  'nb.intro':
    'Mediciones que has guardado. Cada una queda congelada tal como se tomó, con las condiciones en que se tomó; las palabras son tuyas y puedes revisarlas, los números no. Ordénalas como se desarrolla tu argumento.',
  'nb.empty':
    'Aún no has guardado nada. Guarda un ajuste desde el espacio de velocidad radial, o un resultado del banco A/B, y aparecerá aquí.',
  'nb.untitled': 'Medición sin título',
  'nb.unknownTarget': 'un objetivo sin nombre',
  'nb.unknownScenario': 'un escenario sin nombre',
  'nb.nothingToSave': 'Todavía no hay ningún resultado terminado que guardar.',

  'nb.kind.measured': 'medido',
  'nb.kind.analytic': 'predicho',
  'nb.kind.truth': 'revelado',

  'nb.field.title': 'Encabezado',
  'nb.field.claim': 'Afirmación',
  'nb.field.evidence': 'Pruebas que la respaldan',
  'nb.field.limitations': 'Limitaciones',
  'nb.placeholder.claim': '¿Qué crees que muestra esta medición? Una frase.',
  'nb.placeholder.evidence':
    '¿Cuáles de los números de arriba lo respaldan, y con qué precisión?',
  'nb.placeholder.limitations':
    '¿Qué no resolvería esta medición, por buena que parezca? Una por línea.',

  'nb.action.save': 'Guardar en el cuaderno',
  'nb.action.report': 'Informe',
  'nb.action.report.hint':
    'Descargar un PDF del cuaderno: cada entrada con sus números, su figura, tus palabras y las condiciones en que se tomó.',
  'nb.action.download': 'Descargar',
  'nb.action.download.hint':
    'Descargar el cuaderno como archivo, para guardarlo o llevarlo a otro equipo. Es también la respuesta cuando el navegador se niega a almacenarlo.',
  'nb.action.restore': 'Restaurar',
  'nb.action.restore.hint':
    'Cargar un archivo de cuaderno. Las entradas que ya tienes se reemplazan por sus copias guardadas en vez de duplicarse.',
  'nb.action.close': 'Cerrar el cuaderno',
  'nb.action.up': 'Mover «{title}» antes',
  'nb.action.down': 'Mover «{title}» después',
  'nb.action.delete': 'Eliminar «{title}»',
  'nb.confirm.delete':
    '¿Eliminar «{title}»? La medición no se puede volver a tomar en un mundo que ya ha cambiado, y esto no se puede deshacer.',

  'nb.draft.heading': 'Guardar esta medición',
  'nb.draft.hint':
    'Los números ya están congelados, así que puedes tomarte tu tiempo con las palabras: cambiar la simulación ahora no alterará lo capturado.',
  'nb.draft.save': 'Guardarla',
  'nb.draft.discard': 'Descartar',

  'nb.entry.results': 'Lo que se registró',
  'nb.entry.conditions': 'Condiciones en que se tomó',
  'nb.entry.checksum': 'suma de control {code}',
  'nb.entry.figure': {
    one: 'Figura: {title} ({n} serie, dibujada en el informe)',
    other: 'Figura: {title} ({n} series, dibujadas en el informe)',
  },
  'nb.entry.tampered':
    'Esta entrada ya no coincide con su propia suma de control, así que sus números se cambiaron fuera de Gravitas. Se conserva tal como llegó y el informe lo indica.',

  'nb.save.ok': '{n} de {max} entradas · {pct}% del espacio usado',
  'nb.save.unavailable':
    'Este navegador no almacenará nada, así que el cuaderno solo existe en esta pestaña. Descárgalo antes de cerrar la página.',
  'nb.save.quota':
    'Tu navegador se negó a almacenar el cuaderno: probablemente esté lleno. El cuaderno sigue en pantalla; descárgalo ahora.',
  'nb.save.too-large':
    'Una entrada ocupa {bytes} KB, por encima del límite de {limit} KB por entrada. Sigue en pantalla; descarga el cuaderno.',
  'nb.save.total-exceeded':
    'El cuaderno ocupa {bytes} KB, por encima del límite de {limit} KB. Elimina una entrada, o descarga el cuaderno y empieza uno nuevo.',
  'nb.save.too-many':
    'El cuaderno tiene todas las entradas que puede tener ({limit}). Elimina una, o descarga este cuaderno y empieza otro.',
  'nb.save.from-a-newer-version':
    'El cuaderno almacenado lo escribió una versión más nueva de Gravitas y no se ha abierto, así que no se ha sobrescrito nada.',
  'nb.save.unreadable':
    'No se pudo leer el cuaderno almacenado. No se ha sobrescrito nada; restaura desde un archivo si tienes uno.',
  'nb.save.tooLarge': 'Ese archivo es demasiado grande para ser un cuaderno.',
  'nb.save.notJson': 'Ese archivo no se puede leer como un cuaderno.',
  'nb.save.notAnObject': 'Ese archivo no es un cuaderno.',
  'nb.save.notANotebook': 'Ese archivo no es un cuaderno de Gravitas.',
  'nb.save.noVersion': 'Ese archivo de cuaderno no indica de qué versión es.',
  'nb.save.tooNew':
    'Ese cuaderno lo escribió una versión más nueva de Gravitas.',
  'nb.save.noEntries': 'Ese archivo de cuaderno no contiene ninguna entrada.',
  'nb.save.tooManyEntries':
    'Ese archivo de cuaderno tiene más entradas de las que puede tener un cuaderno.',
  'nb.save.not-an-entry':
    'Ese archivo de cuaderno contiene algo que no es una entrada.',
  'nb.save.no-id': 'Una entrada de ese archivo no tiene identidad.',
  'nb.save.no-snapshot':
    'Una entrada de ese archivo no contiene ninguna medición registrada.',
  'nb.save.no-quantities':
    'Una entrada de ese archivo no registra ningún número.',
  'nb.save.bad-quantity':
    'Una entrada de ese archivo contiene un número ilegible.',
  'nb.save.unknown-kind':
    'Una entrada de ese archivo etiqueta un número de una forma que esta versión no conoce.',
  'nb.save.bad-figure':
    'Una entrada de ese archivo contiene una figura ilegible.',

  'nb.source.rv-fit': 'Ajuste de velocidad radial',
  'nb.source.bench-comparison': 'Comparación A/B',
  'nb.source.bench-reliability': 'Comprobación de fiabilidad',
  'nb.source.bench-sweep': 'Barrido de parámetro',

  'nb.prov.scenario': 'Escenario',
  'nb.prov.target': 'Objetivo',
  'nb.prov.simTime': 'Tiempo de simulación',
  'nb.prov.days': '{d} días',
  'nb.prov.seed': 'Semilla',
  'nb.prov.world': 'Generación del mundo',
  'nb.prov.interventions': 'Cambios manuales previos a esta medición',
  'nb.prov.revision': 'Compilación',
  'nb.prov.numerical': 'Ajustes numéricos',
  'nb.prov.step': 'paso máx. {v}',
  'nb.prov.speed': 'velocidad {v}',
  'nb.prov.geometry': 'Geometría de observación',
  'nb.prov.geometryValue': 'ángulo de posición {pa}°, inclinación {inc}°',
  'nb.prov.frame': 'Sistema de referencia',
  'nb.prov.quality': 'Renderizado durante la medición',
  'nb.prov.qualityValue': 'nivel {tier}, {fps} fps',
  'nb.prov.units': 'Unidades',
  'nb.prov.flags': 'Advertencias',
  'nb.prov.stateHash': 'Estado inicial',

  'nb.flag.truth-revealed':
    'la verdad de la simulación ya se había revelado antes de guardar esto',
  'nb.flag.degraded-epochs':
    'algunas épocas estaban degradadas y se descartaron',
  'nb.flag.unverified-epochs': 'algunas épocas no estaban verificadas',
  'nb.flag.weights-assumed':
    'las incertidumbres se supusieron, así que no hay chi-cuadrado reducido',
  'nb.flag.structured-residuals':
    'los residuos aún tienen forma, así que el modelo no es suficiente',
  'nb.flag.multivariable': 'más de una variable difería entre las ejecuciones',
  'nb.flag.bench-warning':
    'el banco emitió una advertencia sobre esta comparación',
  'nb.flag.cancelled': 'la ejecución se canceló antes de terminar',
  'nb.flag.failed-trials': 'algunas pruebas no produjeron resultado',
  'nb.flag.reliability-check': 'esto es una comparación de dos tamaños de paso',
  'nb.flag.verdict-converging':
    'reducir el paso a la mitad no movió el resultado',
  'nb.flag.verdict-unresolved': 'reducir el paso a la mitad movió el resultado',
  'nb.flag.verdict-diverged':
    'las trayectorias se separaron mientras el agregado se mantuvo: caos, no un paso malo',
  'nb.flag.verdict-incomparable': 'las dos ejecuciones no medían lo mismo',

  'nb.rv.title': 'Ajuste de velocidad radial de {target}',
  'nb.rv.mcPeriod': 'Período, con intervalo de Monte Carlo',
  'nb.rv.mcK': 'K, con intervalo de Monte Carlo',
  'nb.rv.mcNote':
    'la mitad del rango entre los percentiles 16 y 84 sobre {n} pruebas, semilla {seed}',
  'nb.rv.mcFamilies': 'Familias de alias en las que se separaron los reajustes',
  'nb.rv.mcTopFamily':
    'la más poblada es {period} d, con el {pct}% de las pruebas; ningún intervalo único es significativo',
  'nb.flag.uncertainty-analysed':
    'se guardó un análisis de incertidumbre con esta medición',
  'nb.flag.uncertainty-multimodal':
    'los reajustes se separaron en varias familias de alias, así que no se da un intervalo único',
  'nb.flag.uncertainty-cancelled':
    'el análisis de incertidumbre se detuvo antes de terminar',
  'nb.flag.uncertainty-partial':
    'algunas pruebas de incertidumbre no dieron ajuste',
  'nb.flag.uncertainty-grid-limited':
    'el intervalo de incertidumbre se retuvo por estar limitado por la rejilla',
  'nb.flag.uncertainty-refused':
    'se intentó un análisis de incertidumbre y fue rechazado',
  'nb.flag.uncertainty-stale':
    'existe un análisis de incertidumbre pero se calculó para otro ajuste, así que no se adjunta',
  'nb.rv.period': 'Período',
  'nb.rv.K': 'Semiamplitud de velocidad K',
  'nb.rv.msini': 'da M sin i, no una masa',
  'nb.rv.gamma': 'Velocidad sistémica',
  'nb.rv.rms': 'RMS de los residuos',
  'nb.rv.chi2': 'Chi-cuadrado reducido',
  'nb.rv.chi2Note':
    'del modelo tal como está ajustado a mano, no de uno reajustado',
  'nb.rv.truthPeriod': 'Período (simulación)',
  'nb.rv.truthK': 'K (simulación)',
  'nb.rv.figure': 'Velocidades plegadas sobre el período de prueba',
  'nb.rv.phase': 'Fase',
  'nb.rv.velocity': 'Velocidad radial (m/s)',
  'nb.rv.observed': 'Observado',
  'nb.rv.model': 'Modelo circular',
  'nb.rv.evidence':
    'Se ajustaron {used} épocas, con un RMS de residuos de {rms} m/s.',
  'nb.rv.limit.model':
    'Un modelo circular de un solo acompañante: una órbita excéntrica o un segundo acompañante aparecerían como estructura en los residuos, no como un período peor.',
  'nb.rv.limit.msini':
    'Solo se mide la componente en la línea de visión, así que K restringe M sin i y no una masa.',
  'nb.rv.limit.revealed':
    'La verdad de la simulación se reveló antes de guardar esto, así que cualquier coincidencia de abajo no es una comprobación independiente.',

  'nb.bench.title': 'Comparación A/B: {name}',
  'nb.bench.runA': '{metric}, ejecución A',
  'nb.bench.runB': '{metric}, ejecución B',
  'nb.bench.figure': '{metric} frente al tiempo simulado',
  'nb.bench.time': 'Muestra',
  'nb.bench.evidence': 'Las ejecuciones diferían en: {changed}.',
  'nb.bench.evidenceNone':
    'No se registró ninguna diferencia de parámetros entre las dos ejecuciones.',
  'nb.bench.limit.oneSeed':
    'Una semilla y un par de ejecuciones: esto muestra lo que pasó, no con qué frecuencia pasa.',
  'nb.bench.limit.multivariable':
    'Difería más de una variable, así que la comparación no aísla ninguna en particular.',

  'nb.sweep.title': '{parameter} barrido en {scenario}',
  'nb.sweep.trials': 'Pruebas que produjeron resultado',
  'nb.sweep.duration': 'Duración simulada por prueba',
  'nb.sweep.durationNote': 'la misma para todas las pruebas',
  'nb.sweep.min': '{metric}, mínimo',
  'nb.sweep.max': '{metric}, máximo',
  'nb.sweep.figure': '{metric} frente a {parameter}',
  'nb.sweep.changed':
    '{metric} cambia con {parameter} a lo largo del rango barrido, {direction}.',
  'nb.sweep.flat':
    '{metric} no cambia con {parameter} a lo largo del rango barrido, más allá de la tolerancia declarada.',
  'nb.sweep.dir.increasing': 'creciendo en todo el rango',
  'nb.sweep.dir.decreasing': 'decreciendo en todo el rango',
  'nb.sweep.dir.flat': 'sin una dirección constante',
  'nb.sweep.noSummary':
    'Demasiadas pocas pruebas tuvieron éxito para resumir una tendencia.',
  'nb.sweep.limit.oneVariable':
    'Se barrió una variable y se mantuvo todo lo demás: nada de aquí dice cómo interactúan los parámetros.',
  'nb.sweep.limit.failed':
    '{n} pruebas no produjeron resultado, así que el rango no está muestreado de forma uniforme.',
  'nb.sweep.limit.cancelled':
    'El barrido se canceló, así que el rango no se cubrió como estaba previsto.',

  'nb.rel.title': 'Comprobación de fiabilidad: {scenario}',
  'nb.rel.coarse': '{metric} con el paso de trabajo',
  'nb.rel.fine': '{metric} con la mitad del paso',
  'nb.rel.agrees': 'sin cambio dentro de {tolerance}',
  'nb.rel.moved': 'se movió más de {tolerance}',
  'nb.rel.cost': 'Coste en tiempo real de la comprobación',
  'nb.rel.costNote': 'las dos ejecuciones juntas',
  'nb.rel.earlyWorst': 'Peor discrepancia inicial entre las trayectorias',
  'nb.rel.earlyNote': 'en las primeras {n} muestras',
  'nb.rel.worst': 'Peor discrepancia en toda la ejecución',
  'nb.rel.worstNote': 'relativa al rango de la magnitud',
  'nb.rel.evidence':
    'El mismo estado se ejecutó con un paso de {coarse} y con uno de {fine}, y ambos se compararon frente a una tolerancia de {tolerance}.',
  'nb.rel.limit.conservation':
    'Conservar la energía no es lo mismo que seguir la trayectoria correcta: un esquema puede conservar bien y aun así ir por el camino equivocado.',
  'nb.rel.limit.chaos':
    'En un sistema caótico dos ejecuciones útiles acaban separándose, así que una separación no es por sí misma señal de un paso mal elegido.',
  'nb.rel.limit.noFigure':
    'Solo se guardan los estadísticos resumen de las dos trayectorias, no las trayectorias en sí.',
  'nb.rel.limit.verdict.converging':
    'Reducir el paso a la mitad dejó el resultado igual. Es la afirmación más fuerte que respalda una comprobación de convergencia; no es afirmar que la respuesta sea correcta.',
  'nb.rel.limit.verdict.unresolved':
    'Reducir el paso a la mitad movió el resultado, así que esta medición describe el paso de integración tanto como el sistema.',
  'nb.rel.limit.verdict.diverged':
    'Las trayectorias se separaron mientras el agregado se mantuvo. Cita el estadístico, no la trayectoria.',
  'nb.rel.limit.verdict.incomparable':
    'Las dos ejecuciones no medían lo mismo, así que no se puede concluir nada de su coincidencia o discrepancia.',

  'nb.report.title': 'Cuaderno de pruebas',
  'nb.report.subtitle':
    'Mediciones guardadas de una sesión de Gravitas, cada una con las condiciones en que se tomó.',
  'nb.report.footer': 'Gravitas — cuaderno de pruebas',
  'nb.report.student': 'Guardado por',
  'nb.report.anonymous': 'sin indicar',
  'nb.report.generated': 'Informe generado',
  'nb.report.build': 'Compilación',
  'nb.report.entries': 'Entradas',
  'nb.report.howToRead': 'Cómo leer los números',
  'nb.report.readMeasured':
    'medido: obtenido de los datos que produjo el instrumento.',
  'nb.report.readAnalytic':
    'predicho: lo que dice un modelo de forma cerrada que debería pasar, no una observación.',
  'nb.report.readTruth':
    'revelado: leído del propio estado de la simulación. Disponible solo porque esto es una simulación, y no es una medición.',
  'nb.report.tampered': {
    one: '{n} entrada ya no coincide con su propia suma de control; mira la nota sobre ella más abajo.',
    other:
      '{n} entradas ya no coinciden con sus propias sumas de control; mira las notas sobre ellas más abajo.',
  },
  'nb.report.source': 'Origen',
  'nb.report.captured': 'Capturado',
  'nb.report.checksum': 'Suma de control',
  'nb.report.entryTampered':
    'Esta entrada no coincide con su propia suma de control: sus números se cambiaron fuera de Gravitas.',
  'nb.report.results': 'Lo que se registró',
  'nb.report.colQuantity': 'Magnitud',
  'nb.report.colValue': 'Valor',
  'nb.report.colKind': 'Tipo',
  'nb.report.colNote': 'Nota',
  'nb.report.figure': 'Figura',
  'nb.report.conditions': 'Condiciones en que se tomó',
  'nb.report.noValue': 'no registrado',
  'nb.report.notRecorded': 'no registrado',

  // --- Búsqueda y filtros del catálogo ----------------------------------------
  'inv.filter.search.placeholder': 'Buscar por título, tema o materia',
  'inv.filter.query': 'Búsqueda',
  'inv.filter.subject': 'Materia',
  'inv.filter.subject.any': 'Cualquier materia',
  'inv.filter.subject.option': '{subject} ({n})',
  'inv.filter.length': 'Tiempo necesario',
  'inv.filter.length.any': 'Cualquier duración',
  'inv.filter.length.demo': 'Demostración (25 min o menos)',
  'inv.filter.length.period': 'Una clase (hasta 50 min)',
  'inv.filter.length.long': 'Más de una clase (50 min o más)',
  'inv.filter.calculation': 'Cálculo',
  'inv.filter.calculation.any': 'Cualquier cantidad de cálculo',
  'inv.filter.calculation.none': 'Sin números que calcular',
  'inv.filter.calculation.some': 'Unos pocos números que calcular',
  'inv.filter.calculation.lots': 'Varios números que calcular',
  'inv.filter.progress': 'Progreso',
  'inv.filter.progress.any': 'Cualquier progreso',
  'inv.filter.progress.new': 'Sin empezar',
  'inv.filter.progress.going': 'En curso',
  'inv.filter.progress.done': 'Terminadas',
  'inv.filter.clear': 'Quitar filtros',
  'inv.filter.count': {
    one: '{n} de {total} lecciones coincide',
    other: '{n} de {total} lecciones coinciden',
  },

  'inv.tag.chaos': 'Caos',
  'inv.tag.compact-objects': 'Objetos compactos',
  'inv.tag.exoplanets': 'Exoplanetas',
  'inv.tag.galaxies': 'Galaxias',
  'inv.tag.gravity': 'Gravedad',
  'inv.tag.habitability': 'Habitabilidad',
  'inv.tag.observing': 'Observación',
  'inv.tag.orbits': 'Órbitas',
  'inv.tag.resonance': 'Resonancia',
  'inv.tag.solar-system': 'El sistema solar',
  'inv.tag.spaceflight': 'Vuelo espacial',
  'inv.tag.stars': 'Estrellas',

  'inv.empty.search': 'Nada coincide con «{query}».',
  'inv.empty.filters': 'Ninguna lección cumple todo eso a la vez.',
  'inv.empty.relax': {
    one: 'Ignorar {filter}: {n} lección',
    other: 'Ignorar {filter}: {n} lecciones',
  },

  // --- Los recorridos ---------------------------------------------------------
  'inv.seq.heading': 'Recorridos',
  'inv.seq.intro':
    'Cada lección se sostiene sola, pero algunas se apoyan en otras. Estos son órdenes que funcionan, con lo que cada paso da por hecho.',
  'inv.seq.all': 'Todas las lecciones',
  'inv.seq.needs': 'Da por hecho que ya hiciste: {lessons}.',
  'inv.seq.needs.none': 'No da nada por hecho. Empieza aquí.',
  'inv.seq.fit.demo': 'Cabe en una demostración',
  'inv.seq.fit.period': 'Cabe en una clase',
  'inv.seq.fit.long': 'Más larga que una clase',
  'inv.seq.assign':
    'Recorta una actividad más corta de esta lección con el generador de tareas',

  'inv.seq.orbits.title': 'Mecánica orbital',
  'inv.seq.orbits.blurb':
    'De la forma de una órbita a moverse entre dos. Las dos primeras lecciones miden lo que hacen las órbitas; las tres últimas usan eso para llegar a alguna parte.',
  'inv.seq.orbits.keplers-laws':
    'Las tres leyes, medidas en lugar de recitadas. Todo lo que viene después remite a la elipse y a la relación período–tamaño que encuentras aquí.',
  'inv.seq.orbits.orbital-energy':
    'Por qué una órbita más rápida es más baja. La contabilidad de energía de aquí es lo que hace que un impulso de transferencia tenga sentido en vez de parecer al revés.',
  'inv.seq.orbits.hohmann-transfer':
    'La forma más barata de pasar entre dos órbitas circulares, planificada y volada. Corta como para hacerla en demostración una vez asentado el argumento energético.',
  'inv.seq.orbits.gravity-assist':
    'La otra forma de cambiar de órbita: tomar prestado de un planeta en vez de gastar combustible. Acompaña a la lección de transferencia más que continuarla.',
  'inv.seq.orbits.lagrange-points':
    'Donde el problema de dos cuerpos deja de bastar. Un final natural, y la puerta de entrada al recorrido de tres cuerpos.',

  'inv.seq.exoplanets.title': 'Detección de exoplanetas',
  'inv.seq.exoplanets.blurb':
    'Los dos métodos que han encontrado casi todos los planetas conocidos, y luego usarlos juntos sobre una estrella desconocida. Lecciones largas: cuenta con dos sesiones, o deja parte como tarea.',
  'inv.seq.exoplanets.transit-photometry':
    'Profundidad, duración y ruido, a partir de una curva de luz que mides tú. El vocabulario que usa el resto del recorrido.',
  'inv.seq.exoplanets.radial-velocity':
    'La otra mitad del cuadro: lo que hace la estrella. El tránsito da el tamaño, esto da la masa, y ninguno por separado da una densidad.',
  'inv.seq.exoplanets.detect-this-planet':
    'Un sistema desconocido con los dos instrumentos y sin solucionario. Vale la pena solo cuando ambos métodos resultan familiares.',
  'inv.seq.exoplanets.goldilocks-question':
    'Qué dice y qué no dice una detección sobre si algún sitio es habitable. Necesita la lección de tránsitos; la de velocidad radial ayuda.',

  'inv.seq.threebody.title': 'Cuando dos cuerpos no bastan',
  'inv.seq.threebody.blurb':
    'Resonancia, puntos de equilibrio y sensibilidad a las condiciones iniciales: las tres formas en que añadir un cuerpo más cambia la respuesta.',
  'inv.seq.threebody.when-orbits-lock':
    'La introducción más suave a un tercer cuerpo: tirones pequeños y repetidos que se acumulan. No hace falta nada previo de tres cuerpos.',
  'inv.seq.threebody.lagrange-points':
    'Los puntos de equilibrio del problema restringido, y el sistema rotante en el que viven. Corta, y ese sistema es en lo que se apoya la siguiente.',
  'inv.seq.threebody.butterfly-effect':
    'Dependencia sensible, medida con una separación que ves crecer. Mucho más convincente después de haber visto una órbita que se queda donde está.',
  'inv.seq.threebody.binary-star-planets':
    'Todo lo anterior a la vez: estabilidad, resonancia y caos decidiendo dónde puede sobrevivir un planeta alrededor de dos estrellas.',

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
  'cr3bp.invalid.eccentricityUnknown':
    'No se pudo determinar la excentricidad del par, así que aquí no hay nada a lo que llamar circular. El silencio sobre una órbita no es prueba de que sea redonda.',
  'cr3bp.invalid.thirdMass':
    'Hay otros cuerpos con masa suficiente para importar. El problema restringido supone que todo salvo los dos cuerpos masivos no ejerce atracción, y su masa combinada supera ese límite.',
  'cr3bp.invalid.unbound':
    'Los dos cuerpos masivos no están en una órbita cerrada uno alrededor del otro, así que no hay un sistema rotante en el que plantear el problema.',
  'cr3bp.invalid.tracerTooHeavy':
    'el tercer cuerpo pesa lo bastante como para mover a los otros dos, asi que no es una particula de prueba y el problema restringido no lo describe.',
  'cr3bp.invalid.noTracer': 'no hay un tercer cuerpo ligero que describir.',
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

  // --- Calendarios de observacion, y la comparacion de dos ---------------------
  'rvsched.shape': 'Calendario',
  'rvsched.shape.regular': 'Cadencia regular',
  'rvsched.shape.irregular': 'Irregular',
  'rvsched.shape.clustered': 'Agrupado',
  'rvsched.shape.explicit': 'Tiempos indicados',
  'rvsched.epochs': 'Observaciones',
  'rvsched.jitter': 'Dispersion',
  'rvsched.clusters': 'Grupos',
  'rvsched.epochList': 'Tiempos de observacion (dias)',
  'rvsched.gaps': 'Huecos (dias, desde-hasta)',
  'rvsched.note.plan':
    '{planned} observaciones en {span} dias. Calendario {id}.',
  'rvsched.note.dropped':
    '{count} cayeron dentro de un hueco y no se observaron.',
  'rvsched.note.rejected':
    'No se pudieron leer {count} entradas y se ignoraron: {list}.',
  'rvsched.note.duplicates':
    '{count} tiempos aparecen dos veces; un instante es una sola observacion.',
  'rvsched.note.noTimes':
    'No hay tiempos legibles, asi que la campana vuelve a una cadencia regular.',
  'rvsched.note.badGaps': 'No se pudieron leer estos huecos: {list}.',
  'rvsched.compare': 'Comparar con un segundo calendario',
  'rvsched.compare.shape': 'Segundo calendario',
  'rvsched.compare.waiting':
    'Observando ambos calendarios: {a} y {b} de {planned}. La comparacion aparece cuando ambos terminen.',
  'rvsched.compare.arm':
    '{kind}: {taken} medidas, mejor periodo {period} d, K {k} m/s, mayor arco sin observar {hole}% del ciclo, pico de ventana peor {alias}%.',
  'rvsched.compare.agree':
    'Ambos calendarios dan el mismo periodo, dentro de los {tolerance} d que esta linea de base puede resolver.',
  'rvsched.compare.disagree':
    'Los dos calendarios discrepan en {difference} d: mas de lo que la linea de base puede resolver, asi que la diferencia esta en los tiempos, no en la aritmetica.',
  'rvsched.compare.alias':
    'Esa diferencia coincide con un pico de la ventana del calendario {side} en {period} d: uno de estos ajustes es la misma senal leida a un alias de distancia.',
  'rvsched.compare.uncontrolled':
    'Esto no compara solo el calendario: no se mantuvieron iguales {list}.',
  'rvsched.compare.control.count': 'el numero de observaciones',
  'rvsched.compare.control.baseline': 'la linea de base',
  'rvsched.compare.control.sigma': 'la incertidumbre declarada',
  'rvsched.compare.control.seed': 'la semilla de ruido',
  'rvsched.compare.control.system': 'la estrella',
  'rvsched.compare.control.noiseModel': 'el modelo de ruido',
  'rvsched.compare.atBound':
    'Al menos uno de estos ajustes queda en el borde del rango de periodos explorado, asi que lo decidio el rango y no las medidas. Alarga la linea de base o amplia el rango antes de interpretar la comparacion.',
  'rvsched.compare.oneDraw':
    'Un solo sorteo de ruido en cada brazo: esto dice lo que hicieron estos dos calendarios en esta campana, no que calendario es mejor.',
};
