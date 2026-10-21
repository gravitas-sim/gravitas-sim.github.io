// =============================================================================
// El resumen de la clase en la página de revisión de entregas, en español
// -----------------------------------------------------------------------------
// See ./en.classSummary.js for why this has a file of its own.
// =============================================================================

export const ES_CLASSSUMMARY = {
  'sub.sum.title': 'Resumen de la clase',
  'sub.sum.note':
    'Esto es lo que los informes que abrió aquí dicen sobre la clase, calculado en esta página y en ningún otro sitio: no se envía nada y no se guarda nada. No tiene nombres, identificadores de lista ni nombres de archivo. Cada informe cuenta una vez y un duplicado exacto no cuenta. Nunca cambia una nota, una puntuación ni un archivo de calificaciones, y describe los informes que tiene delante; no es un estudio del aprendizaje.',
  'sub.sum.empty': 'Lea al menos un informe para ver el resumen de la clase.',
  'sub.sum.counts':
    '{n} informes contados el {date}; {dup} duplicados exactos omitidos; {rep} de los informes son intentos repetidos y cada intento cuenta.',
  'sub.sum.csv': 'Descargar el resumen de la clase (CSV)',
  'sub.sum.print': 'Imprimir el resumen de la clase',
  'sub.sum.lesson.one': '{title}: 1 informe',
  'sub.sum.lesson.many': '{title}: {n} informes',
  'sub.sum.reading':
    'Hasta dónde llegaron: el informe de la mitad visitó el {median} de los pasos, y los informes van del {min} al {max}.',
  'sub.sum.depths': 'Profundidad leída: {list}.',
  'sub.sum.steps': 'Pasos, en orden',
  'sub.sum.col.step': 'Paso',
  'sub.sum.col.answered': 'Respondidos',
  'sub.sum.col.right':
    'Correctos, entre las respuestas que Gravitas puede comprobar',
  'sub.sum.col.written': 'Respuestas escritas calificadas',
  'sub.sum.col.mark': 'Nota media',
  'sub.sum.of': '{a} de {n}',
  'sub.sum.stale':
    '{n} respuestas corresponden a pasos que esta versión ya no tiene y no se cuentan arriba.',
  'sub.sum.criteria': 'Criterios de rúbrica, según lo que cada uno afirma',
  'sub.sum.col.criterion': 'Criterio',
  'sub.sum.col.claims': 'Afirma',
  'sub.sum.col.marked': 'Calificados',
  'sub.sum.col.marks': 'Notas',
  'sub.sum.kinds': 'Por tipo de afirmación',
  'sub.sum.kinds.none': 'Ningún criterio tiene nota todavía',
  'sub.sum.criteria.note':
    'Cada nota es su propia lectura, tomada como la proporción de los puntos que el criterio podía obtener. La nota de un criterio nunca se suma a la nota de un paso ni a una puntuación del libro de calificaciones.',
  'sub.sum.wrong': 'Respuestas incorrectas más frecuentes',
  'sub.sum.wrong.none':
    'No hay respuestas incorrectas entre las que Gravitas puede comprobar.',
  'sub.sum.col.question': 'Pregunta',
  'sub.sum.col.given': 'Respuesta dada',
  'sub.sum.col.times': 'Veces',
  'sub.sum.col.share':
    'Proporción de las respuestas incorrectas a esa pregunta',
  'sub.sum.col.misconception': 'Concepto erróneo que nombró el autor',
  'sub.sum.unreadable': 'respuesta no legible',
  'sub.sum.none': 'ninguno nombrado',
  'sub.sum.wrong.more':
    'Se muestran las {n} más frecuentes; el CSV tiene todas las conservadas, hasta tres por pregunta.',
  'sub.sum.wrong.note':
    'Aquí solo aparecen respuestas que Gravitas puede comprobar. Un error se nombra solo cuando el autor de la investigación lo escribió, con las palabras en inglés de la propia investigación; cualquier otra respuesta incorrecta se muestra tal como se dio y sin explicación.',
  'sub.sum.time': 'Tiempo que registran los informes',
  'sub.sum.time.line':
    'De {n} informes que registran ambas horas: la mediana es {median}, la mitad central va de {q1} a {q3} y el rango es de {min} a {max}.',
  'sub.sum.time.none':
    'Ningún informe registra a la vez una primera apertura y un último guardado.',
  'sub.sum.time.missing': '{n} informes no registran ambas horas y se omiten.',
  'sub.sum.time.note':
    'Es el intervalo entre la primera apertura y el último guardado que registra un informe. Incluye todas las horas de ausencia y no dice nada sobre el tiempo dedicado a trabajar.',
  'sub.sum.col.time': 'Tiempo',
  'sub.sum.col.reports': 'Informes',
  'sub.sum.min': '{v} min',
  'sub.sum.hours': '{v} h',
  'sub.sum.days': '{v} días',
  'sub.sum.band.under': 'menos de {to}',
  'sub.sum.band.between': '{from} a {to}',
  'sub.sum.band.over': 'más de un día',
  'sub.sum.measured': 'Magnitudes medidas',
  'sub.sum.measured.none':
    'Ningún informe llevó una magnitud medida en una tabla de evidencia que se verificara.',
  'sub.sum.measured.line':
    '{n} valores: mediana {median}, rango de {min} a {max}. {bars} indican una incertidumbre (media {sigma}).',
  'sub.sum.measured.left':
    'Omitidos del gráfico: {limit} límites, {failed} ajustes fallidos, {nc} no acotados.',
  'sub.sum.measured.caption':
    '{name}: una fila por informe, ordenada por valor',
  'sub.sum.col.rank': 'Posición',
  'sub.sum.col.value': 'Valor',
  'sub.sum.col.uncertainty': 'Incertidumbre indicada',
  'sub.sum.col.origin': 'Origen',
  'sub.sum.plot.label':
    '{name}: {n} valores, uno por informe, ordenados por valor, cada uno con la incertidumbre que indica su propio informe como una barra. Los mismos números están en la tabla de abajo.',
  'sub.sum.plot.x': 'Informes, ordenados por valor',
  'sub.sum.measured.more':
    'Se muestran las {shown} magnitudes con más valores, de {n}; el CSV tiene todas.',
  'sub.sum.measured.single':
    '{n} magnitudes tienen un solo valor y no se muestran como distribución.',
  'sub.sum.measured.mismatch':
    '{n} informes cuya tabla de evidencia no coincidía con el resumen que indica su código se omiten.',
  'sub.sum.measured.note':
    'Un informe indica un valor de una magnitud una sola vez. La dispersión de aquí es la de los informes de la clase, con la incertidumbre de cada informe al lado; Gravitas no las combina en un solo número.',
};
