// =============================================================================
// The experiment runner, in Spanish
// -----------------------------------------------------------------------------
// Every id in ./en.experiments.js, translated. js/experiments/i18n.js reads
// the pair and nothing else.
// =============================================================================

export const ES_EXPERIMENTS = {
  'exp.doc.title': 'Ejecutor de experimentos | Gravitas',
  'exp.title': 'Ejecutar un experimento',
  'exp.lang.label': 'Idioma',
  'exp.intro':
    'Varía un ajuste de laboratorio a lo largo de un intervalo, ejecuta cada valor con varias semillas y observa qué cambió. Cada ensayo se ejecuta en un proceso de fondo propio, varios a la vez, así que la página sigue respondiendo; no se envía nada a ninguna parte. Antes de ejecutar nada, se construye un ensayo y se estima el coste del experimento completo en este dispositivo, y un experimento demasiado grande para él se rechaza explicando por qué.',
  'exp.back': 'Volver a Gravitas',

  'exp.what.title': 'Qué ejecutar',
  'exp.what.scenario': 'Escenario',
  'exp.what.param': 'Ajuste que se varía',
  'exp.values.title': 'Valores',
  'exp.values.from': 'Desde',
  'exp.values.to': 'Hasta',
  'exp.values.count': 'Cuántos valores',
  'exp.values.range': 'Permitido de {min} a {max}{exclude}.',
  'exp.values.exclude':
    ', salvo de {from} a {to}, donde la sonda choca con el planeta',
  'exp.runs.title': 'Semillas y duración',
  'exp.runs.seeds': 'Semillas por valor',
  'exp.runs.seedBase': 'Nombre de la semilla',
  'exp.runs.seedHint':
    'Cada valor se ejecuta una vez por semilla. En estos escenarios de laboratorio la semilla no cambia nada de la configuración, así que más semillas confirman que la respuesta se repite; no añaden dispersión.',
  'exp.runs.duration': 'Tiempo simulado por ensayo',
  'exp.measure.title': 'Qué medir',
  'exp.measure.metric': 'Medida',

  'exp.scenario.binary-planet-lab': 'Laboratorio de planeta en binaria',
  'exp.scenario.circumbinary-planet-lab':
    'Laboratorio de planeta circumbinario',
  'exp.scenario.gravity-assist-lab': 'Laboratorio de asistencia gravitatoria',
  'exp.scenario.gravity-assist-heliocentric':
    'Asistencia gravitatoria: heliocéntrica',
  'exp.param.binary_lab_planet_a':
    'Tamaño de la órbita del planeta (separaciones estelares)',
  'exp.param.assist_impact_parameter':
    'Parámetro de impacto (unidades de simulación)',
  'exp.param.assist_v_infinity':
    'Velocidad de aproximación (unidades de simulación)',
  'exp.metric.distance_to_primary': 'Distancia media a la primaria',
  'exp.metric.orbital_period': 'Período orbital',
  'exp.metric.closest_approach': 'Máximo acercamiento',
  'exp.metric.speed': 'Rapidez media',
  'exp.metric.separation': 'Separación media',
  'exp.metric.total_energy': 'Energía total al final',
  'exp.metric.angular_momentum': 'Momento angular al final',
  'exp.metric.energy_drift': 'Deriva de la energía al final',
  'exp.metric.angular_drift': 'Deriva del momento angular al final',

  'exp.device.low-end':
    'Este dispositivo se considera modesto: {cores} núcleos. Los experimentos usan como máximo {realms} procesos y pueden durar hasta {minutes} minutos.',
  'exp.device.desktop':
    'Este dispositivo se considera de escritorio: {cores} núcleos. Los experimentos usan hasta {realms} procesos y pueden durar hasta {minutes} minutos.',
  'exp.plan.pending': 'Estimando el coste del experimento…',
  'exp.plan.timeout':
    'Construir un ensayo para estimar el coste tardó demasiado.',
  'exp.plan.failed':
    'No se pudo construir un ensayo, así que no se puede estimar el coste.',
  'exp.invalid':
    'No es un experimento que esta página pueda ejecutar: {path} {message}.',
  'exp.estimate':
    '{trials} ensayos de {bodies} cuerpos y {steps} pasos cada uno: unos {seconds} s aquí, en {realms} procesos, medido en este dispositivo.',
  'exp.estimate.untimed':
    '{trials} ensayos de {bodies} cuerpos y {steps} pasos cada uno: unos {seconds} s en {realms} procesos. El reloj de este dispositivo es demasiado grueso para medir un ensayo, así que el cálculo es una estimación prudente.',
  'exp.refuse.tooManyTrials':
    '{trials} ensayos son más de los que este dispositivo ejecuta en un experimento (como máximo {max}).',
  'exp.refuse.tooLong':
    'Tardaría unos {seconds} segundos, más que el límite de {max} de este dispositivo.',
  'exp.refuse.trialTooLong':
    'Un ensayo tardaría unos {seconds} segundos, demasiado cerca del límite de {max} segundos por ensayo.',
  'exp.refuse.tooMuchData':
    'Sus resultados ocuparían unos {mb} MB, más que el límite de {max} MB.',
  'exp.refuse.tooManySamples':
    'Guarda {samples} muestras por ensayo; este dispositivo guarda como máximo {max}.',
  'exp.refuse.wouldBeCapped':
    'Cada ensayo llegaría al límite de muestras tras {reachable} de sus {duration} unidades de tiempo, y un ensayo interrumpido queda fuera de todos los promedios. Acorta los ensayos a {reachable} unidades o menos.',
  'exp.refuse.tooMuchMemory':
    'Ocuparía unos {mb} MB a la vez, más que el límite de {max} MB de este dispositivo.',
  'exp.refuse.tooManyRealms':
    'Pide {realms} procesos; este dispositivo ejecuta como máximo {max}.',

  'exp.run': 'Ejecutar',
  'exp.cancel': 'Cancelar',
  'exp.resume': 'Reanudar ({done} de {total} hechos)',
  'exp.canceled': 'Cancelado desde la página.',
  'exp.progress.label': 'Progreso',
  'exp.progress': '{done} de {total} ensayos terminados; {running} en curso.',
  'exp.done.complete':
    'Terminado: {ok} de {total} ensayos dieron una medida, en {seconds} s.',
  'exp.done.partial':
    'Detenido antes de tiempo: {reason} {ok} de {total} ensayos dieron una medida. Lo terminado se conserva, y Reanudar ejecuta el resto.',
  'exp.done.canceled':
    'Cancelado. {ok} de {total} ensayos dieron una medida antes de detenerse. Lo terminado se conserva, y Reanudar ejecuta el resto.',
  'exp.checkpoint.skipped':
    'Los resultados eran demasiado grandes para guardarlos en este navegador, así que esta ejecución no se puede reanudar.',
  'exp.noWorkers':
    'Este navegador no puede ejecutar procesos de fondo, así que aquí no se pueden ejecutar experimentos.',

  'exp.results.title': 'Resultados',
  'exp.plot.label':
    '{metric} frente a {param}: {ok} ensayos con medida, {failed} sin ella. La tabla de abajo tiene los mismos números.',
  'exp.plot.log': '(escala logarítmica)',
  'exp.plot.caption':
    'Cada punto es un ensayo; la línea une la media de cada valor; una cruz sobre el eje es un ensayo sin medida.',
  'exp.summary.caption':
    '{metric} ({unit}) en cada valor, con {seeds} semilla(s)',
  'exp.summary.value': 'Valor',
  'exp.summary.mean': 'Media',
  'exp.summary.min': 'Mínimo',
  'exp.summary.max': 'Máximo',
  'exp.summary.spread': 'Dispersión (d. e.)',
  'exp.summary.n': 'Ensayos usados',
  'exp.summary.left': 'Excluidos',
  'exp.trials.caption': 'Todos los ensayos, en el orden en que se planificaron',
  'exp.trials.index': 'Ensayo',
  'exp.trials.value': 'Valor',
  'exp.trials.seed': 'Semilla',
  'exp.trials.status': 'Resultado',
  'exp.trials.result': 'Medida',
  'exp.trials.steps': 'Pasos',
  'exp.trials.wall': 'Tiempo (ms)',
  'exp.download.json': 'Descargar el resultado (JSON)',
  'exp.download.csv': 'Descargar los ensayos (CSV)',
  'exp.manifest.title': 'El experimento como archivo',

  'exp.status.ok': 'medido',
  'exp.status.buildFailed': 'no se construyó',
  'exp.status.bodiesMissing': 'faltan cuerpos',
  'exp.status.notFinite': 'sin valor finito',
  'exp.status.lostBody': 'se perdió un cuerpo',
  'exp.status.canceled': 'cancelado',
  'exp.status.stalled': 'detenido',
  'exp.status.capped': 'límite de muestras alcanzado',
  'exp.status.timeout': 'se agotó el tiempo',
  'exp.status.corrupt': 'respuesta ilegible',
  'exp.status.workerFailed': 'falló el proceso',
  'exp.status.resourceLimit': 'resultado demasiado grande',

  'exp.check.title': 'Comprobar un resultado guardado',
  'exp.check.hint':
    'Pega un archivo de resultado que haya guardado esta página, o un archivo de experimento, para ver si se puede reproducir aquí y, si no, por qué.',
  'exp.check.input': 'Resultado o experimento (JSON)',
  'exp.check.run': 'Comprobar',
  'exp.check.notJson': 'Eso no es JSON.',
  'exp.check.cannot': 'Esto no se puede leer aquí: {reason}.',
  'exp.check.manifest':
    'Un experimento que esta página puede leer. Notas: {notes}.',
  'exp.check.yes':
    'Reproducible aquí: el mismo experimento da los mismos números en esta versión. Notas: {notes}.',
  'exp.check.no': 'No es reproducible aquí, porque {reasons}.',
};
