// =============================================================================
// La página de revisión de entregas, en español
// -----------------------------------------------------------------------------
// See ./en.submissions.js for why this page has a catalog of its own.
// =============================================================================

export const ES_SUBMISSIONS = {
  'sub.doc.title': 'Revisión de entregas | Gravitas',
  'sub.title': 'Revisión de entregas',
  'sub.intro':
    'Suelte aquí los informes de laboratorio que entregaron sus estudiantes y esta página le dirá qué pregunta falló la clase. Lee el propio PDF, la copia de seguridad del progreso en JSON o un código pegado desde la última página de un informe. También acepta el archivo de actividad o de curso que usted hizo, o un enlace a uno, para agrupar los informes bajo los nombres que les dio.',
  'sub.privacy':
    'Nada sale de su navegador y nada se guarda. Al cerrar la pestaña, desaparece. Lo que lea aquí puede descargarse como hoja de cálculo, como JSON o como un archivo para importar en Canvas, Moodle o D2L Brightspace; no hay cuentas ni conexión con ninguno de ellos.',
  'sub.drop.title': 'Suelte aquí informes, copias de seguridad o códigos',
  'sub.drop.picker':
    'Elegir informes, copias de seguridad, archivos de código, o un archivo de actividad o de curso',
  'sub.paste.label': 'o pegue un código, o un enlace de actividad o de curso',
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
  'sub.depth.core': 'profundidad básica',
  'sub.depth.quantitative': 'profundidad cuantitativa',
  'sub.depth.advanced': 'profundidad avanzada',
  'sub.read.attempt': 'intento {n} de {of}',
  'sub.read.help':
    'ayuda usada: {hints} pista(s), respuesta resuelta mostrada en {shown} paso(s)',
  'sub.written.summary': 'Respuestas escritas: {n}',
  'sub.written.rubric': 'Nota para corregir',
  'sub.refused.title': 'No leídas',
  'sub.reason.unreadable': 'el navegador no pudo leer el archivo',
  'sub.reason.lessonLoad':
    'no se pudo cargar su investigación; comprueba la conexión y vuelve a añadirlo',
  'sub.reason.empty': 'no hay nada que leer',
  'sub.reason.wrongKind': 'no es un código de entrega de Gravitas',
  'sub.reason.newerVersion': 'lo creó una versión más reciente de Gravitas',
  'sub.reason.tooLarge': 'más grande de lo que puede ser una entrega',
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
  'sub.reason.remix':
    'es una investigación de un instructor, que esta página nombra pero no puede calificar',
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
  'sub.reason.badEvidence': 'su registro de evidencia está mal formado',
  'sub.systems.title': 'Escenarios y experimentos entregados',
  'sub.systems.note':
    'Adjuntados por cada estudiante a su evidencia. Abre el enlace para ver el mismo mundo. El escenario del que salió, la versión y la huella del motor dicen con qué compararlo; lo que es demasiado largo para un enlace llega como archivo.',
  'sub.systems.caption': 'Escenarios y experimentos entregados por {name}',
  'sub.systems.none': 'ninguno',
  'sub.systems.open': 'Abrir en la simulación libre',
  'sub.systems.file': 'entregado como archivo',
  'sub.systems.kind.sc': 'escenario',
  'sub.systems.kind.ex': 'experimento',
  'sub.systems.col.name': 'Nombre',
  'sub.systems.col.kind': 'Tipo',
  'sub.systems.col.seed': 'Semilla',
  'sub.systems.col.from': 'Hecho a partir del escenario',
  'sub.systems.col.build': 'Versión',
  'sub.systems.col.engine': 'Motor',
  'sub.systems.col.digest': 'Resumen',
  'sub.systems.col.open': 'Abrir',
  'sub.evidence.title': 'La evidencia detrás de las respuestas',
  'sub.evidence.note':
    'Un informe de versión 2 lleva la tabla de medidas y resultados que tenía el cuaderno del estudiante, y un resumen criptográfico de ella. La comprobación recalcula ese resumen a partir de la tabla que tienes delante. Que coincida indica que la tabla es aquella con la que se hizo el resumen; no indica quién la hizo: cualquiera puede construir un código coherente consigo mismo.',
  'sub.evidence.summary': 'Evidencia de {name}: {state}, {n} filas',
  'sub.evidence.state.none': 'no incluida',
  'sub.evidence.state.verified': 'coincide con su resumen',
  'sub.evidence.state.partial': 'no se puede comprobar entera',
  'sub.evidence.state.mismatch': 'NO COINCIDE con su resumen',
  'sub.evidence.none':
    'Este informe no incluye registro de evidencia. Se hizo antes de que los informes lo llevaran, o el estudiante no había guardado nada.',
  'sub.evidence.verified':
    'La tabla coincide con el resumen que indica el código ({digest}).',
  'sub.evidence.partial':
    'El código lleva {n} de {total} filas, así que su resumen no se puede recalcular. Las filas mostradas son las que el código indica.',
  'sub.evidence.mismatch':
    'La tabla no coincide con el resumen que indica el código ({digest}). El código se cambió después de hacer el informe, o se dañó por el camino. No te fíes de estos números.',
  'sub.evidence.col.envelope': 'Sobre',
  'sub.evidence.col.quantity': 'Magnitud',
  'sub.evidence.col.value': 'Valor',
  'sub.evidence.col.unit': 'Unidad',
  'sub.evidence.col.uncertainty': 'Incertidumbre',
  'sub.evidence.col.origin': 'Origen',
  'sub.evidence.col.source': 'Fuente',
  'sub.evidence.caption': 'Tabla de evidencia de {name}',
  'sub.evidence.mismatchNote': 'la evidencia no coincide con su resumen',
  'sub.export.evidenceCsv': 'Tabla de evidencia (CSV)',
  'sub.evidence.origin.measured': 'medido',
  'sub.evidence.origin.derived': 'derivado',
  'sub.evidence.origin.assumed': 'supuesto',
  'sub.evidence.origin.fitted': 'ajustado',
  'sub.evidence.origin.fixed': 'fijado',
  'sub.evidence.origin.truth': 'valor de la simulación',
  'sub.evidence.origin.analytic': 'analítico',
  'sub.evidence.origin.synthetic': 'sintético',
  'sub.ctx.title': 'Nombres tomados de:',
  'sub.ctx.activity': 'Actividad “{name}” ({n})',
  'sub.ctx.course': 'Curso “{name}”: {n} actividades',
  'sub.reason.ctx.notJson':
    'no es un enlace de actividad ni de curso, ni un archivo JSON',
  'sub.reason.ctx.unknownKind': 'no es una actividad ni un curso',
  'sub.reason.ctx.badCourse': 'ese archivo de curso tiene un problema',
  'sub.reason.ctx.tooLarge':
    'mayor de lo que puede ser una actividad o un curso',
  'sub.reason.ctx.corrupt': 'truncado o alterado en el camino',
  'sub.reason.ctx.wrongKind': 'no es un enlace de actividad ni de curso',
  'sub.reason.ctx.newerVersion': 'hecho con una versión más nueva de Gravitas',
  'sub.act.title': 'Por actividad',
  'sub.act.note':
    'Los informes se agrupan por el código de actividad que traía el enlace. Los nombres y los cursos salen de la actividad o del curso que abrió arriba; sin uno se muestra el código. Los puntos medios cuentan las respuestas que Gravitas comprobó, no las escritas.',
  'sub.act.none': 'Sin actividad asignada',
  'sub.act.col.activity': 'Actividad',
  'sub.act.col.course': 'Curso y unidad',
  'sub.act.col.reports': 'Informes',
  'sub.act.col.students': 'Estudiantes',
  'sub.act.col.mean': 'Puntos medios',
  'sub.act.col.hardest': 'Pregunta más difícil',
  'sub.judge.title': 'Criterio del docente',
  'sub.judge.note':
    'Las respuestas escritas las lee usted; Gravitas no las califica. Ábralas aquí, ponga una nota a cada una y, si quiere, un comentario. Las notas se quedan en esta página y solo salen en el archivo de notas que guarde. Se marcan como escritas por el docente y solo se suman a una calificación en los archivos de calificaciones de abajo.',
  'sub.judge.open': 'Leer las respuestas escritas y calificarlas',
  'sub.judge.close': 'Ocultar las respuestas escritas',
  'sub.judge.none': 'Ningún informe tiene una respuesta escrita que calificar.',
  'sub.judge.summary': '{marked} de {n} respuestas escritas calificadas',
  'sub.judge.report': '{name} ({activity})',
  'sub.judge.mark': 'Nota (de 0 a {max})',
  'sub.judge.comment': 'Comentario',
  'sub.judge.badMark': 'La nota debe ser un número de 0 a {max}.',
  'sub.judge.save': 'Guardar el archivo de notas',
  'sub.judge.load': 'Abrir un archivo de notas',
  'sub.judge.loaded': 'Se leyeron {read} notas de {file}; {skipped} sin usar.',
  'sub.judge.reason.notMarks': 'no es un archivo de notas',
  'sub.judge.reason.wrongSchema': 'un archivo de notas de otra versión',
  'sub.gb.title': 'Archivos de calificaciones',
  'sub.gb.note':
    'Una calificación por estudiante y actividad, escrita para Canvas, Moodle o D2L Brightspace. Importe primero a un solo estudiante para comprobar el archivo con su plataforma; las columnas están en el documento del flujo del docente.',
  'sub.gb.identifier': 'Identificar a los estudiantes por',
  'sub.gb.identifier.roster': 'el identificador de lista del enlace',
  'sub.gb.identifier.name': 'el nombre escrito en el informe',
  'sub.gb.identifierNote':
    'Un código muestra qué navegador produjo las respuestas, no quién las escribió. Use el identificador de lista cuando cada estudiante tenga su propio enlace. Use el nombre escrito cuando un solo código de clase sirva a todos y haya pedido que escribieran su usuario o su número de estudiante donde el informe pide un nombre. El texto se compara tal cual.',
  'sub.gb.policy': 'Si un estudiante entregó más de una vez',
  'sub.gb.policy.latest': 'usar la última',
  'sub.gb.policy.best': 'usar la mejor',
  'sub.gb.policy.first': 'usar la primera',
  'sub.gb.canvas': 'Archivo para Canvas (CSV)',
  'sub.gb.moodle': 'Archivo para Moodle (CSV)',
  'sub.gb.d2l': 'Archivo para D2L Brightspace (CSV)',
  'sub.gb.match': 'Identificar con',
  'sub.gb.scale': 'Calificación como',
  'sub.gb.scale.points': 'puntos',
  'sub.gb.scale.percent': 'porcentaje',
  'sub.gb.d2lNote': 'Solo puntos, como los admite D2L.',
  'sub.gb.summary':
    '{students} estudiantes, {activities} actividades, {rows} calificaciones.',
  'sub.gb.skipped':
    '{n} informes no tienen identificador y se dejan fuera: {list}.',
  'sub.gb.partial':
    '{n} respuestas escritas aún no tienen nota, así que esas calificaciones son parciales.',
  'sub.gb.possible.title':
    'Puntos posibles, para crear las columnas de calificación',
  'sub.gb.possible.col': 'Puntos posibles',
  'sub.gb.empty':
    'Lea al menos un informe para hacer un archivo de calificaciones.',
  'sub.gb.marks.title': 'Notas del docente',
  'sub.gb.marks.note':
    'Las notas que ponga a las respuestas escritas se guardan solo en este archivo, con cada fila marcada como escrita por el docente. Ábralo de nuevo más tarde para continuar.',
  'sub.gb.fb.auto':
    'Gravitas comprobó {checked} respuestas y {correct} eran correctas ({points} de {possible} puntos).',
  'sub.gb.fb.written':
    'Respuestas escritas calificadas por el docente: {n}, {points} puntos (puestos por el docente, no comprobados por Gravitas).',
  'sub.gb.fb.awaiting':
    'Respuestas escritas aún sin nota: {n}; esta calificación es parcial.',
  'sub.gb.fb.attempts': 'Se contó el intento {used} de {n}.',
  'sub.gb.fb.comment': 'Comentario del docente: {text}',
  'sub.gb.fb.changed':
    'Algunos pasos cambiaron después de guardar este informe.',
  'sub.gb.fb.evidence': 'La tabla de evidencia no coincidía con su resumen.',
};
