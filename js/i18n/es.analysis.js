// =============================================================================
// The analysis laboratory on /experiments/, in Spanish
// -----------------------------------------------------------------------------
// The same ids as ./en.analysis.js, lazy with the same panel.
// =============================================================================

export const ES_ANALYSIS = {
  'lab.title': 'Analizar: incertidumbre, sensibilidad, distribución',
  'lab.intro':
    'Lee un resultado con cuidado: con qué fuerza sigue la medida al ajuste, de dónde viene su incertidumbre (las semillas o el paso de integración) y qué no puede decirte el resultado. Cada intervalo es un intervalo de confianza del 95 %, no la probabilidad de que la respuesta esté dentro.',
  'lab.source.none':
    'Aún no hay resultado: ejecuta un experimento arriba o abre uno guardado desde esta página.',
  'lab.source.run': 'La última ejecución: {title}, {trials} ensayos ({hash}).',
  'lab.source.file': 'Abierto {name}: {title}, {trials} ensayos ({hash}).',
  'lab.open': 'Abrir un resultado o análisis guardado',
  'lab.open.bad':
    'Ese archivo no es un resultado de experimento ni un análisis guardado: {reason}',
  'lab.open.analysis':
    'Abierto el análisis {name}: {cells} ajustes, {metric} ({hash}). No contiene ensayos, así que no se dibuja ninguno; abre el resultado para verlos.',
  'lab.open.analysisBad': 'Ese análisis no se puede abrir: {reason}',
  'lab.trials.absent':
    'Un análisis guardado contiene los resúmenes, no los ensayos. Abre el resultado del experimento con el que se hizo para ver cada ensayo.',
  'lab.save.observation': 'Guardar como observación (para el Observatorio)',
  'lab.observation.saved':
    'Resultado guardado como tabla de observación. En el Observatorio, ábrela como archivo; su origen nombra este experimento y sus ensayos.',
  'lab.nb.result': 'Guardar el resultado en el cuaderno',
  'lab.nb.analysis': 'Guardar el análisis en el cuaderno',
  'lab.nb.added':
    'Guardado en el cuaderno de evidencia, con el resumen de sus datos. Abre el cuaderno en la aplicación principal para escribir sobre él.',
  'lab.nb.failed': 'No se pudo guardar en el cuaderno: {why}.',
  'lab.nb.title.result': 'Experimento: {title}, {metric}',
  'lab.nb.title.analysis': 'Análisis de {metric}: {title}',
  'lab.nb.untitled': 'sin título',
  'lab.nb.q.mean': 'Media',
  'lab.nb.q.median': 'Mediana',
  'lab.nb.q.slope': 'Pendiente de la tendencia',
  'lab.nb.q.rho': 'Correlación de rangos (Spearman)',
  'lab.nb.q.eta2': 'Parte de la dispersión debida al ajuste',
  'lab.nb.note.interval':
    'Con su intervalo del 95 %, de los ensayos que terminaron.',
  'lab.metric': 'Medida',
  'lab.resamples': 'Remuestreos',
  'lab.seed': 'Semilla del remuestreo',
  'lab.axis': 'Representar frente a',
  'lab.run': 'Analizar',
  'lab.cancel': 'Cancelar',
  'lab.forecast':
    'Unos {draws} sorteos aleatorios: {time} en este dispositivo.',
  'lab.forecast.seconds': 'unos {seconds} s',
  'lab.forecast.instant': 'menos de un segundo',
  'lab.refuse.notAResult': 'Esto no es un resultado de experimento.',
  'lab.refuse.noMetric':
    'El resultado no tiene ninguna medida llamada {metric}.',
  'lab.refuse.noTrials': 'Ningún ensayo terminó con un valor que analizar.',
  'lab.refuse.tooManyDraws':
    'Eso son {draws} sorteos, más de los {max} que permite este dispositivo. Usa menos remuestreos.',
  'lab.step.intro':
    'Una simulación que ignora su semilla conserva una sola incertidumbre: cuánto se mueven sus números cuando cambia el paso de tiempo. Ejecuta el mismo experimento con otro paso (el Paso de integración del formulario), o abre uno guardado con otro paso, y elígelo aquí.',
  'lab.step.compare': 'Comparar con el mismo experimento con otro paso',
  'lab.step.open': 'Abrir el mismo experimento con otro paso',
  'lab.step.none': 'Sin comparación',
  'lab.step.option': 'La ejecución con {step} ({hash})',
  'lab.step.with':
    'Comparado con el mismo experimento con {step}: los valores se mueven hasta un {rel} %. Esa diferencia es la escala del error numérico, no una cota.',
  'lab.step.caption':
    '{metric} en cada ajuste con {a} y con {b}, y su diferencia.',
  'lab.running': 'Analizando…',
  'lab.done': 'Analizados {trials} ensayos en {cells} ajustes en {seconds} s.',
  'lab.canceled': 'Análisis cancelado. No se conservó nada de él.',
  'lab.failed': 'El análisis se detuvo: {why}',

  'lab.h.summary': 'Qué dice',
  'lab.h.warnings': 'Qué no dice',
  'lab.h.trials': 'Cada ensayo',
  'lab.h.cells': 'Cada ajuste',
  'lab.h.sensitivity': 'Cómo sigue la medida al ajuste',
  'lab.h.shares': 'El ajuste y la semilla',
  'lab.h.distribution': 'La distribución de todos los ensayos terminados',
  'lab.h.methods': 'Métodos',
  'lab.h.step': 'El paso de integración',
  'lab.noWarnings': 'Nada aquí pide cautela.',

  'lab.summary.trend':
    'A lo largo de {values} valores de {param}, {metric} va de {first} a {last}. Una recta por las medias tiene una pendiente de {slope} ± {se} {unit} por unidad del ajuste.',
  'lab.summary.trend2d':
    'En una rejilla de {values} combinaciones de {param} y {param2}, {metric} va de {lo} a {hi}.',
  'lab.summary.sampled':
    'A lo largo de {values} valores de {param} sorteados al azar, {metric} va de {lo} a {hi}. Su correlación de rangos con el ajuste es {rho} (95 %: de {rhoLo} a {rhoHi}).',
  'lab.summary.share':
    'El ajuste explica el {share} % de la dispersión, y las semillas el resto; la probabilidad de una parte así de grande si el ajuste no importara es {p}.',
  'lab.summary.share2d':
    '{param} explica el {a} % de la dispersión, {param2} el {b} %, los dos juntos, más allá de sus efectos por separado, el {ab} %, y las semillas el {seeds} %.',
  'lab.summary.identical':
    'Cada semilla dio el mismo valor en cada ajuste, así que toda la variación es del ajuste y nada de ella es dispersión.',
  'lab.summary.noShare':
    'Con un solo ensayo en cada ajuste no se puede medir qué parte de la dispersión es de la semilla.',
  'lab.summary.left':
    '{left} de {trials} ensayos no terminaron y no están en estas cifras.',

  'lab.warn.oneSeed':
    'Cada ajuste se ejecutó una vez, así que no se midió dispersión y no se puede dar ningún intervalo. En estos escenarios de laboratorio la semilla no cambia nada de todos modos; la incertidumbre que importa es la del paso de integración. Ejecuta el experimento con otro paso y compara los dos aquí.',
  'lab.warn.oneSeedStepped':
    'Cada ajuste se ejecutó una vez, así que no se midió dispersión. Las pendientes se juzgan en cambio frente a cuánto se movió cada valor al cambiar el paso.',
  'lab.warn.deterministic':
    'Cada semilla dio el mismo valor en cada ajuste: estos escenarios no dependen de la semilla. No hay dispersión sobre la que poner un intervalo, así que no se da ninguno, y ningún cambio puede contrastarse con ruido. La incertidumbre que importa es la del paso de integración: ejecuta el experimento con otro paso y compara los dos aquí.',
  'lab.warn.deterministicStepped':
    'Cada semilla dio el mismo valor en cada ajuste, así que la incertidumbre aquí es la del paso de integración. Las pendientes se juzgan frente a cuánto se movió cada valor al cambiar el paso.',
  'lab.warn.stepSensitive':
    'Cambiar el paso de {a} a {b} mueve la medida hasta un {rel} %: hay un error numérico de ese orden en cada cifra de aquí.',
  'lab.warn.reference.otherExperiment':
    'El resultado elegido para comparar no es el mismo experimento con otro paso, así que no se comparó.',
  'lab.warn.reference.sameStep':
    'El resultado elegido para comparar se ejecutó con el mismo paso, así que no dice nada del error de la integración.',
  'lab.warn.fewTrials':
    '{cells} ajustes tienen menos de cinco ensayos terminados. Sus intervalos son anchos y suponen que la dispersión es aproximadamente normal.',
  'lab.warn.emptyCells':
    '{cells} ajustes no tienen ningún ensayo terminado. Allí no se sabe nada.',
  'lab.warn.survivors':
    '{trials} ensayos no terminaron ({statuses}). Las cifras son de los que sí terminaron, que pueden no ser típicos: los supervivientes son una muestra sesgada.',
  'lab.warn.notResolved':
    'El efecto del ajuste no se distingue de la dispersión entre semillas (p = {p}). Este experimento no puede decir si el ajuste importa en este intervalo.',
  'lab.warn.noTrend':
    'El intervalo de la correlación de rangos incluye el cero ({lo} a {hi}): no se distingue ninguna tendencia.',
  'lab.warn.seedsDominate':
    'La mayor parte de la dispersión ({share} %) está entre semillas con el mismo ajuste, no entre ajustes.',
  'lab.warn.nonMonotonic':
    'La medida sube y baja a lo largo del intervalo ({turns} giro(s) distinguido(s)). Un mismo valor medido puede venir de más de un ajuste, así que el ajuste no puede deducirse de una medida.',
  'lab.warn.flat':
    'De {from} a {to} la medida no cambia más allá de su dispersión. Ahí el ajuste no es identificable a partir de esta medida.',
  'lab.warn.edgeMax':
    'La media mayor está en el extremo del intervalo ({at}). El máximo puede estar más allá.',
  'lab.warn.edgeMin':
    'La media menor está en el extremo del intervalo ({at}). El mínimo puede estar más allá.',
  'lab.warn.unbalanced':
    'La rejilla está incompleta o sus ajustes tienen distinto número de ensayos, así que las partes suman uno solo aproximadamente.',
  'lab.warn.wideRange':
    'Los valores abarcan un factor de {ratio}. La mediana y su intervalo dicen más que la media.',

  'lab.col.trial': 'Ensayo',
  'lab.col.trials': 'Ensayos',
  'lab.col.n': 'Terminados',
  'lab.col.mean': 'Media',
  'lab.col.meanCi': 'Media, 95 %',
  'lab.col.median': 'Mediana',
  'lab.col.medianCi': 'Mediana, 95 %',
  'lab.col.range68': 'Percentiles 16 a 84',
  'lab.col.at': 'En',
  'lab.col.slope': 'Pendiente',
  'lab.col.slopeSe': 'Su error',
  'lab.col.elasticity': 'Elasticidad',
  'lab.col.resolved': '¿Distinguida?',
  'lab.col.numErr': 'Error numérico de la pendiente',
  'lab.col.diff': 'Diferencia',
  'lab.col.rel': 'Relativa',
  'lab.col.effect': 'Media sobre el otro ajuste',
  'lab.col.part': 'Parte de la dispersión',
  'lab.col.share': 'Proporción',
  'lab.col.binLo': 'Desde',
  'lab.col.binHi': 'Hasta',
  'lab.col.count': 'Ensayos',
  'lab.yes': 'sí',
  'lab.no': 'no',
  'lab.unknown': 'no se puede saber',
  'lab.none': '—',
  'lab.interaction': 'los dos juntos',
  'lab.seeds': 'las semillas',
  'lab.cells.caption':
    '{metric} en cada ajuste: la media con un intervalo t de Student, la mediana con un intervalo bootstrap y el 68 % central de los ensayos.',
  'lab.sens.caption':
    'Pendientes locales de la media, por diferencias finitas, en {unit} por unidad del ajuste. Una pendiente se distingue cuando supera el doble de su error. La elasticidad es el cambio porcentual de la medida por un cambio del 1 % del ajuste.',
  'lab.main.caption':
    'La media de {metric} en cada valor de {param}, promediada sobre {param2}.',
  'lab.shares.caption':
    'Cómo se reparte la dispersión de {metric} entre los ajustes y las semillas.',
  'lab.bins.caption':
    'Los ensayos en {bins} grupos del mismo tamaño, por {param}.',
  'lab.trend.line':
    'Tendencia: {slope} ± {se} {unit} por unidad del ajuste: una recta de mínimos cuadrados por las medias, con su error a partir de la dispersión de estas en torno a la recta.',
  'lab.rho': 'Correlación de rangos (Spearman): {rho}, 95 % de {lo} a {hi}.',
  'lab.hist.caption':
    'Cuántos ensayos dieron cada intervalo de {metric}: {bins} barras, por la regla de Freedman-Diaconis. La tabla de abajo tiene los mismos recuentos.',
  'lab.hist.label': 'Histograma de {metric} sobre {n} ensayos',
  'lab.quantiles':
    'Percentiles 2,5, 16, 50, 84 y 97,5: {q025}, {q16}, {q50}, {q84}, {q975}.',
  'lab.plot.caption':
    'Cada punto es un ensayo. Arrastra sobre el gráfico, o usa las flechas y Mayús, para seleccionar ensayos; la tabla y el resumen de abajo siguen la selección.',
  'lab.selected.none':
    'No hay ensayos seleccionados. Selecciona algunos en el gráfico o en la tabla.',
  'lab.selected':
    '{n} ensayos seleccionados: media {mean}, mediana {median}, de {min} a {max}.',
  'lab.selected.interval': ' Intervalo del 95 % de la media: de {lo} a {hi}.',
  'lab.table.rows': 'Filas {first} a {last} de {n}.',
  'lab.row': 'Fila',
  'lab.missing': 'no terminó',
  'lab.masked': 'enmascarado',
  'lab.notStated': 'unidad no indicada',
  'lab.save.json': 'Guardar el análisis (JSON)',
  'lab.save.csv': 'Guardar la tabla de ajustes (CSV)',
  'lab.methods':
    'Análisis {tool} {version} del resultado {hash}, medida {metric}, semilla "{seed}". Los intervalos son del 95 %: para una media, la t de Student con la desviación típica de la muestra; para una mediana, el bootstrap de percentiles (Efron y Tibshirani 1993) con {resamples} remuestreos, dado solo con cinco o más ensayos terminados. Las pendientes locales son diferencias finitas de las medias con sus errores combinados en cuadratura. La tendencia es una recta de mínimos cuadrados ordinarios por las medias, con su error a partir de la dispersión en torno a ella. La parte de la dispersión es la eta² de un análisis de la varianza de un factor, contrastada con "el ajuste no importa" mediante {permutations} permutaciones aleatorias (p = (1 + k)/(1 + B), Phipson y Smyth 2010). La correlación de rangos es la de Spearman, con un intervalo bootstrap. Cuando cada semilla da el mismo valor no se da ningún intervalo ni contraste: la incertidumbre numérica es entonces la diferencia con el mismo experimento con otro paso de integración, y una pendiente se distingue cuando supera el doble de la pendiente de esa diferencia. Los ensayos que no terminaron se cuentan y se dejan fuera. El manifiesto del experimento está, entero, en el análisis guardado.',
};
