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
};
