// =============================================================================
// La página de revisión de entregas, en español
// -----------------------------------------------------------------------------
// See ./en.submissions.js for why this page has a catalog of its own.
// =============================================================================

export const ES_SUBMISSIONS = {
  'sub.doc.title': 'Revisión de entregas | Gravitas',
  'sub.title': 'Revisión de entregas',
  'sub.lang.label': 'Idioma',
  'sub.intro':
    'Suelte aquí los informes de laboratorio que entregaron sus estudiantes y esta página le dirá qué pregunta falló la clase. Lee el propio PDF, la copia de seguridad del progreso en JSON o un código pegado desde la última página de un informe.',
  'sub.privacy':
    'Nada sale de su navegador y nada se guarda. Al cerrar la pestaña, desaparece. Lo que lea aquí puede descargarse como hoja de cálculo o como JSON; no hay lista de clase ni libro de calificaciones.',
  'sub.drop.title': 'Suelte aquí informes, copias de seguridad o códigos',
  'sub.drop.picker':
    'Elegir informes, copias de seguridad o archivos de código',
  'sub.paste.label': 'o pegue un código',
  'sub.paste.go': 'Leer este código',
  'sub.clear': 'Borrar todo',
  'sub.count.none': 'nada todavía',
  'sub.count.one': '1 entrega',
  'sub.count.many': '{n} entregas',
  'sub.rates.title': 'Tasa de error por pregunta',
  'sub.rates.note':
    'La más difícil primero. «Calificadas» cuenta solo las respuestas que Gravitas puede comprobar por sí mismo; las respuestas escritas son suyas para leer y se cuentan como «no calificables», no como errores. Un duplicado exacto se cuenta una sola vez.',
  'sub.rates.empty': 'Suelte arriba informes, copias de seguridad o códigos.',
  'sub.col.question': 'Pregunta',
  'sub.col.lesson': 'Investigación',
  'sub.col.wrong': 'Incorrectas',
  'sub.col.marked': 'Calificadas',
  'sub.col.rate': 'Tasa de error',
  'sub.col.unmarkable': 'No calificables',
  'sub.read.title': 'Leídas',
  'sub.read.noName': '(sin nombre)',
  'sub.read.duplicate': 'duplicado exacto de la n.º {n}',
  'sub.read.attempt': 'intento {n} de {of}',
  'sub.refused.title': 'No leídas',
  'sub.reason.empty': 'no hay nada que leer',
  'sub.reason.wrongKind': 'no es un código de entrega de Gravitas',
  'sub.reason.newerVersion': 'lo creó una versión más reciente de Gravitas',
  'sub.reason.corrupt': 'se truncó o se alteró en el camino',
  'sub.reason.mangled':
    'algunos caracteres cambiaron en el camino: un cuadro de texto enriquecido convierte "--" en un guion largo. Péguelo en un campo de texto sin formato o suelte el PDF.',
  'sub.reason.notAnObject': 'no es una entrega',
  'sub.reason.noVersion': 'no indica la versión del esquema',
  'sub.reason.noBackup': 'no contiene respuestas',
  'sub.reason.noLesson': 'no indica qué investigación es',
  'sub.reason.noResponses': 'no contiene respuestas',
  'sub.reason.noSteps': 'no trae la lista de pasos con la que comprobar',
  'sub.reason.notABackup':
    'no es una copia de seguridad del progreso de Gravitas',
  'sub.reason.unknownLesson':
    'menciona una investigación que esta versión no tiene',
  'sub.reason.noTokenInPdf': 'este PDF no contiene ningún código',
  'sub.reason.notJson': 'no es JSON ni un código',
  'sub.paste.source': 'código pegado',
  'sub.reason.badAttempts':
    'el número de intentos que contiene está mal formado',
  'sub.reason.badPosition':
    'la posición guardada que contiene está mal formada',
  'sub.reason.badResponses': 'las respuestas que contiene están mal formadas',
  'sub.reason.badStartedAt': 'la hora de inicio que contiene está mal formada',
  'sub.reason.badSteps': 'la lista de pasos que contiene está mal formada',
  'sub.reason.badVisited': 'la lista de pasos visitados está mal formada',
  'sub.reason.noProgress': 'no contiene respuestas',
  'sub.reason.tooNew': 'lo creó una versión más reciente de Gravitas',
  'sub.reason.other': 'no se pudo leer ({code})',
  'sub.export.title': 'Descargar los resultados',
  'sub.export.note':
    'El resumen tiene una fila por informe; el archivo de preguntas, una fila por pregunta de cada informe. Los duplicados exactos y los intentos repetidos se conservan y se marcan; nunca se fusionan ni se elige entre ellos. Los informes se agrupan como intentos solo por el identificador de la lista de clase: un nombre escrito no es una identidad, así que sin identificador no se agrupa nada.',
  'sub.export.written':
    'Incluir las respuestas escritas (las palabras de los estudiantes)',
  'sub.export.writtenNote':
    'Desactivado por defecto. Los números y las opciones elegidas se incluyen siempre, porque son aquello a partir de lo cual se llegó a cada veredicto.',
  'sub.export.summaryCsv': 'Resumen (CSV)',
  'sub.export.questionsCsv': 'Pregunta por pregunta (CSV)',
  'sub.export.json': 'Todo (JSON)',
  'sub.export.empty': 'Lea al menos un informe para descargar resultados.',
  'sub.export.done': 'Se descargó {file}.',
  'sub.export.failed': 'No se pudo crear el archivo: {reason}',
  'sub.notice':
    'Un código de entrega dice qué respondió un estudiante. No prueba quién respondió: se calcula en un navegador, y cualquiera que controle el navegador puede falsificar lo que este calcula. Lo que le ahorra es escribir.',
};
