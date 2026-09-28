// =============================================================================
// Las palabras del Compositor de investigaciones (/studio/lesson/), en español
// -----------------------------------------------------------------------------
// La sombra de ./en.composer.js, con las mismas claves. Solo la importa
// js/composerPage.js, cuando el lector elige el español.
// =============================================================================

export const ES_COMPOSER = {
  'composer.title': 'Compositor de investigaciones',
  'composer.intro':
    'Compón una investigación guiada como datos: lo que los estudiantes leen, predicen, prueban, miden y responden, qué escenario e instrumento abre cada paso y qué ven cuando una respuesta es incorrecta. La comprueban las mismas reglas que cada lección que trae Gravitas, y nunca ejecuta nada de lo que escribes.',
  'composer.toStudio': 'El Estudio de escenarios',
  'composer.toolbar.label': 'Archivo de la investigación',
  'composer.action.new': 'Investigación nueva',
  'composer.action.saveBank': 'Guardar el banco de preguntas',
  'composer.action.export': 'Exportar el archivo de la lección',
  'composer.action.exportEs': 'Exportar su archivo en español',
  'composer.raw.label': 'El archivo de la investigación, en JSON',

  'composer.section.about': 'Sobre la investigación',
  'composer.section.steps': 'Pasos',
  'composer.section.bank': 'Banco de preguntas',
  'composer.hint.bank':
    'Preguntas que un paso puede hacer por su nombre. Cada una tiene una versión, sus puntos y qué intento cuenta, y puede tener variantes: opciones barajadas, o números tomados de una relación que calcula Gravitas. La semilla decide qué variante recibe esta investigación.',
  'composer.pair.en': 'inglés',
  'composer.pair.es': 'español',
  'composer.state.done': 'Traducido',
  'composer.state.missing': 'Aún sin español',
  'composer.state.stale': 'Español desactualizado',
  'composer.field.id': 'Identificador',
  'composer.hint.id':
    'Palabras en minúsculas unidas por guiones. No puede ser el identificador de una lección que Gravitas ya tiene.',
  'composer.field.version': 'Versión',
  'composer.field.title': 'Título',
  'composer.field.subtitle': 'Subtítulo',
  'composer.field.summary': 'Resumen',
  'composer.field.level': 'Nivel',
  'composer.field.duration': 'Duración',
  'composer.hint.duration':
    'Un intervalo como 20-25 min, tal como lo imprime la tarjeta de la lección.',
  'composer.field.thumbnail': 'Imagen de la tarjeta',
  'composer.thumbnail.first': 'El escenario del primer paso',
  'composer.field.objectives': 'Objetivos',
  'composer.objective': 'Objetivo {n}',
  'composer.objective.add': 'Añadir un objetivo',
  'composer.objective.remove': 'Quitar el objetivo {n}',
  'composer.field.prerequisites': 'Antes de esto',
  'composer.prereq.lesson': 'Una lección de Gravitas',
  'composer.prereq.text': 'Otra cosa, en palabras',
  'composer.prereq.add': 'Añadir un requisito',
  'composer.prereq.remove': 'Quitar el requisito {n}',
  'composer.field.seed': 'Semilla de las variantes',
  'composer.hint.seed':
    'Qué variante de cada pregunta del banco hace esta investigación. La misma semilla construye siempre la misma investigación; anótala con lo que des a una clase.',

  'composer.type.read': 'Leer',
  'composer.type.predict': 'Predecir',
  'composer.type.explore': 'Explorar',
  'composer.type.measure': 'Medir',
  'composer.type.question': 'Pregunta',
  'composer.step.legend': '{n}. {type}',
  'composer.step.sid': 'Identificador del paso',
  'composer.hint.sid':
    'Lo que identifica las respuestas guardadas. Consérvalo una vez que los estudiantes hayan usado la investigación.',
  'composer.step.title': 'Título',
  'composer.step.body': 'Texto',
  'composer.step.tip': 'Consejo (opcional)',
  'composer.step.setup': 'Escenario',
  'composer.setup.keep': 'Mantener la escena del paso anterior',
  'composer.setup.seed': 'Semilla del mundo (opcional)',
  'composer.hint.setupSeed':
    'Una palabra como orbita-1: la misma palabra construye el mismo mundo.',
  'composer.setup.paused': 'Empezar en pausa',
  'composer.setup.zoom': 'Zoom (opcional)',
  'composer.step.tool': 'Instrumento',
  'composer.tool.none': 'Ninguno',
  'composer.step.when': 'Se muestra a',
  'composer.when.everyone': 'Todos los estudiantes',
  'composer.when.incorrect': 'Quienes respondieron mal el paso {n}',
  'composer.when.correct': 'Quienes respondieron bien el paso {n}',
  'composer.hint.when':
    'Refuerzo: este paso se salta salvo que la respuesta a ese paso sea incorrecta (o correcta) cuando el estudiante llega aquí.',
  'composer.step.checklist': 'Cosas que hacer',
  'composer.checklist.item': 'Elemento {n}',
  'composer.checklist.add': 'Añadir un elemento',
  'composer.checklist.remove': 'Quitar el elemento {n}',
  'composer.step.fields': 'Números que anotar',
  'composer.measure.id': 'Nombre',
  'composer.measure.label': 'Etiqueta',
  'composer.measure.unit': 'Unidad (opcional)',
  'composer.measure.add': 'Añadir un número',
  'composer.measure.remove': 'Quitar el número {n}',
  'composer.step.prompt': 'Pregunta',
  'composer.step.options': 'Opciones',
  'composer.option': 'Opción {n}',
  'composer.option.add': 'Añadir una opción',
  'composer.option.remove': 'Quitar la opción {n}',
  'composer.option.right': 'La correcta',
  'composer.step.because': 'Por qué (se muestra tras responder)',
  'composer.step.reveal': 'Se corrige en',
  'composer.reveal.choose': 'Elige un paso posterior',
  'composer.question.source': 'Pregunta',
  'composer.source.choice': 'Escrita aquí: de opción',
  'composer.source.numeric': 'Escrita aquí: un número',
  'composer.source.short': 'Escrita aquí: una respuesta breve',
  'composer.source.bank': 'Del banco: {id}',
  'composer.numeric.answer': 'Respuesta',
  'composer.numeric.tolerance': 'Tolerancia (misma unidad)',
  'composer.numeric.unit': 'Unidad',
  'composer.expect.dimension': 'Unidades que puede usar un estudiante',
  'composer.expect.none': 'Solo la unidad de arriba',
  'composer.expect.unit': 'Se corrige en',
  'composer.expect.accept': 'También se aceptan (separadas por comas)',
  'composer.hints.concept': 'Pista: la idea',
  'composer.hints.method': 'Pista: el método',
  'composer.step.worked': 'Respuesta resuelta',
  'composer.step.rubric': 'Rúbrica (para quien corrija)',
  'composer.scoring.points': 'Puntos',
  'composer.scoring.attempts': 'Cuenta',
  'composer.attempts.first': 'El primer intento',
  'composer.attempts.best': 'El mejor intento',
  'composer.steps.openAll': 'Abrir todos los pasos',
  'composer.steps.closeAll': 'Cerrar todos los pasos',
  'composer.step.up': 'Subir el paso {n}',
  'composer.step.down': 'Bajar el paso {n}',
  'composer.step.duplicate': 'Duplicar el paso {n}',
  'composer.step.remove': 'Quitar el paso {n}',
  'composer.step.addType': 'Tipo de paso',
  'composer.step.add': 'Añadir un paso',

  'composer.item.legend': 'Pregunta del banco {id}',
  'composer.item.id': 'Identificador',
  'composer.item.version': 'Versión',
  'composer.hint.itemVersion':
    'Súbela siempre que un cambio pueda cambiar una nota.',
  'composer.item.kind': 'Tipo',
  'composer.kind.choice': 'De opción',
  'composer.kind.numeric': 'Número',
  'composer.kind.short': 'Respuesta breve',
  'composer.item.variants': 'Variantes',
  'composer.variants.none': 'Ninguna: una sola pregunta',
  'composer.variants.shuffle': 'Barajar las opciones',
  'composer.variants.relation': 'Números de una relación',
  'composer.item.relation': 'Relación',
  'composer.relation.kepler3':
    'Tercera ley de Kepler: el periodo en años, a partir de a (UA) y M (masas solares)',
  'composer.relation.circularSpeed':
    'Velocidad de una órbita circular en km/s, a partir de a (UA) y M (masas solares)',
  'composer.relation.escapeSpeed':
    'Velocidad de escape en km/s, a partir de a (UA) y M (masas solares)',
  'composer.relation.inverseSquare':
    'Inverso del cuadrado: cuántas veces más intensa es la gravedad a r1 que a r2 (UA)',
  'composer.relation.transitDepth':
    'Profundidad del tránsito en porcentaje, a partir de Rp (radios terrestres) y Rs (radios solares)',
  'composer.hint.relation':
    'Escribe cada dato en la pregunta como {a}, {M} y así. Gravitas calcula la respuesta de cada variante; nada de lo que escribes se evalúa.',
  'composer.item.tolerancePct': 'Tolerancia (porcentaje de la respuesta)',
  'composer.item.values': 'Variante {n}',
  'composer.values.add': 'Añadir una variante',
  'composer.values.remove': 'Quitar la variante {n}',
  'composer.values.answer': 'Respuesta: {answer} {unit}',
  'composer.a11y.textOnly': 'Se puede responder solo con su texto',
  'composer.a11y.note': 'Para un lector que no puede usar la simulación',
  'composer.item.add': 'Añadir una pregunta al banco',
  'composer.item.remove': 'Quitar la pregunta {id}',
  'composer.item.duplicate': 'Duplicar la pregunta {id}',

  'composer.estimate.heading': 'Estimaciones',
  'composer.estimate.minutes':
    'Unos {minutes} minutos de trabajo, con {words} palabras que leer.',
  'composer.estimate.card': 'La tarjeta dice {duration}.',
  'composer.estimate.outside':
    'Atención: eso queda fuera de los {duration} que dice la tarjeta. Cambia la duración, o la investigación.',
  'composer.estimate.steps': '{count} pasos: {list}.',
  'composer.estimate.graded':
    '{count} con nota, que valen {points} puntos en total.',
  'composer.translation.heading': 'Traducción',
  'composer.translation.summary':
    '{done} de {total} textos traducidos; {missing} sin español y {stale} desactualizados.',
  'composer.translation.complete':
    'Cada texto está en los dos idiomas y al día.',
  'composer.translation.item': '{where}: {state}',
  'composer.preview.hint':
    'La investigación en el motor de lecciones de verdad, solo desde este navegador: allí no se guarda nada y no se publica nada.',
  'composer.preview.student': 'Vista previa como estudiante',
  'composer.preview.author': 'Abrir con la barra de autoría',
  'composer.preview.frame':
    'Gravitas, ejecutando esta investigación tal como la ve un estudiante',
  'composer.key.heading': 'Clave de respuestas',
  'composer.key.hint':
    'Lo que ve un docente: cada paso con nota, su respuesta y sus puntos.',
  'composer.key.step': 'Paso',
  'composer.key.answer': 'Respuesta',
  'composer.key.points': 'Puntos',
  'composer.key.variant': 'Variante {index} de {count}',
  'composer.key.shuffled': 'Opciones barajadas',
  'composer.key.none': 'Todavía no hay nada con nota.',
  'composer.key.rubric': 'Se corrige con rúbrica: {rubric}',
  'composer.key.prediction': 'Predicción, corregida en el paso {n}',
  'composer.report.heading': 'Evidencia del informe',
  'composer.report.hint':
    'El informe de laboratorio que entrega un estudiante, hecho con la clave de respuestas, para que veas lo que mostrará.',
  'composer.report.make': 'Hacer un informe de muestra',
  'composer.report.open': 'Abrir el informe de muestra',
  'composer.report.made': 'El informe de muestra está listo.',
  'composer.report.failed': 'No se pudo hacer el informe de muestra: {error}',
  'composer.checks.format':
    'Resuelve esto primero; las comprobaciones de la lección se hacen cuando el archivo está en orden.',
  'composer.checks.rule': 'Paso {n}: {message}',
  'composer.checks.lesson': 'La lección: {message}',
  'composer.checks.count':
    '{count} problema(s) que resolver antes de poder guardar la investigación.',
  'composer.checks.valid': 'La investigación es válida.',
  'composer.checks.running': 'Comprobando…',

  'composer.status.example':
    'La investigación de ejemplo, para aprender de ella: usa cada parte del formato una vez. Nueva empieza desde cero.',
  'composer.status.new':
    'Una investigación nueva. Se guarda en este navegador a medida que trabajas.',
  'composer.status.saved': 'Se guardó {file}.',
  'composer.status.bankSaved': 'Se guardó {file}.',
  'composer.status.exported':
    'Se guardó {file}: la lección, para js/data/investigations/.',
  'composer.status.exportedEs':
    'Se guardó {file}: su español, para js/data/investigations/es/ (renómbralo {id}.js allí).',
  'composer.status.previewed':
    'La vista previa muestra la investigación tal como la ve un estudiante.',
  'composer.status.bankMerged': 'Se añadieron {count} pregunta(s) al banco.',
  'composer.status.bankClash':
    'El banco ya tiene {ids} con otro contenido; no se añadió nada. Cámbiales el nombre en el archivo, o quítalas aquí primero.',
  'composer.file.notPack':
    'Ese archivo no es ni una investigación de Gravitas ni un banco de preguntas.',

  'composer.error.textUnsafe':
    'Solo las etiquetas strong, em, sub y sup; ningún otro marcado y ninguna dirección web.',
  'composer.error.entity':
    '&{entity}; no es una de las entidades que usan las lecciones.',
  'composer.error.esOf':
    'El registro de qué inglés traduce el español está dañado.',
  'composer.error.tooLarge':
    'El archivo es más grande de lo que necesita cualquier investigación.',
  'composer.error.tooDeep':
    'El archivo está anidado más hondo de lo que está cualquier investigación.',
  'composer.error.unsafeKey': '«{key}» no puede ser una clave.',
  'composer.error.notData': 'Esto no son datos simples.',
  'composer.error.idTaken':
    'Ese es el identificador de una lección que Gravitas ya tiene.',
  'composer.error.duration': 'Un intervalo como 20-25 min.',
  'composer.error.scenario': 'Elige un escenario que Gravitas tenga.',
  'composer.error.objectives': 'De uno a ocho objetivos.',
  'composer.error.prerequisite': 'O una lección o un texto.',
  'composer.error.lesson': 'Elige una lección que Gravitas tenga.',
  'composer.error.steps': 'De 2 a {max} pasos.',
  'composer.error.repeat': 'Otro ya tiene este identificador.',
  'composer.error.closing':
    'El último paso cierra la investigación: que sea un paso de leer o de explorar.',
  'composer.error.stepType': 'Uno de estos: {options}.',
  'composer.error.sid':
    'Hasta 80 caracteres, sin dos puntos, y no solo dígitos.',
  'composer.error.firstSetup': 'El primer paso abre un escenario.',
  'composer.error.widget': 'Elige un instrumento que Gravitas tenga.',
  'composer.error.earlier': 'Elige un paso anterior.',
  'composer.error.checklist': 'De una a ocho cosas que hacer.',
  'composer.error.fields': 'De uno a seis números que anotar.',
  'composer.error.fieldId': 'Un nombre corto como periodo, usado una sola vez.',
  'composer.error.unit': 'Una unidad como days.',
  'composer.error.options': 'De {min} a {max} opciones.',
  'composer.error.choiceAnswer': 'Marca la opción correcta.',
  'composer.error.reveal':
    'Elige un paso posterior, donde se corrige la predicción.',
  'composer.error.revealConditional':
    'Se corrige en un paso al que llega todo estudiante: no en un paso de refuerzo.',
  'composer.error.notHere': 'Esto no va aquí.',
  'composer.error.bankItem': 'Elige una pregunta del banco.',
  'composer.error.bankRepeat': 'Otro paso hace esta pregunta.',
  'composer.error.setupSeed':
    'Una palabra como orbita-1: letras, dígitos y guiones.',
  'composer.error.whenIs': 'Mal o bien.',
  'composer.error.whenGraded':
    'Elige un paso con nota: una predicción, o una pregunta de opción o de número.',
  'composer.error.whenNested':
    'Elige un paso al que llega todo estudiante: el refuerzo tiene un solo nivel.',
  'composer.error.whenLast': 'Al último paso llega todo estudiante.',
  'composer.error.kind': 'Uno de estos: {options}.',
  'composer.error.itemVersion': 'Un número entero desde 1.',
  'composer.error.numericAnswer': 'Un número, distinto de cero.',
  'composer.error.tolerance':
    'Un número positivo, en la unidad de la respuesta.',
  'composer.error.misconception':
    'O un factor por el que se desvía la respuesta, o el número al que equivale.',
  'composer.error.hintsOrder':
    'Una pista de método va después de una pista de idea.',
  'composer.error.scoring': 'Cuántos puntos, y qué intento cuenta.',
  'composer.error.points': 'Un número entero de 1 a {max}.',
  'composer.error.attempts': 'El primer intento o el mejor.',
  'composer.error.a11y': 'Di si se puede responder solo con su texto.',
  'composer.error.dimension': 'Uno de estos: {options}.',
  'composer.error.expectUnit':
    'Una unidad de {dimension} que lea el analizador de respuestas.',
  'composer.error.acceptUnit':
    'Incluye {unit}, la unidad en que se corrige: el analizador solo acepta las unidades de la lista.',
  'composer.error.relation': 'Elige una relación.',
  'composer.error.tolerancePct': 'De 0,5 a 25 por ciento.',
  'composer.error.variantValues': 'De 1 a {max} variantes.',
  'composer.error.relationUnit': 'La relación responde en «{unit}».',
  'composer.error.variantsClose':
    'La respuesta de esta variante está dentro de la tolerancia de la variante {other}: un estudiante podría copiarla.',
  'composer.error.placeholder': 'La pregunta debe decir {{name}}.',
  'composer.error.placeholderUnknown':
    '{{name}} no es un dato de esta relación.',
  'composer.error.shuffle': 'Barajar, o sin variantes.',
  'composer.error.inputUnknown': '«{input}» no es un dato de esta relación.',
  'composer.error.inputNumber': 'Un número.',
  'composer.error.inputRange': 'De {min} a {max} {unit}.',
  'composer.error.values': 'Cada variante da sus datos como números.',
  'composer.error.answer': 'Estos datos no dan una respuesta utilizable.',
};
