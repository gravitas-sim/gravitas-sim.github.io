// =============================================================================
// The words of the instructor guides and answer keys, in English and Spanish
// -----------------------------------------------------------------------------
// Prompt 79. A guide or a key is made of three kinds of text:
//
//   - the investigation's own words (title, prompts, options, explanations),
//     which come from the lesson and its Spanish shadow (data/investigations/es);
//   - the instructor's prose (js/data/instructorContent.js and the expectations),
//     which has an English original and an optional Spanish shadow
//     (instructorContent.es.js, instructorExpectations.es.js);
//   - the words around them: headings, column titles, "Correct answer", the
//     names of the kinds of step. Those are here.
//
// Why a module of its own and not a message catalog: the interface catalogs are
// deferred JavaScript that every route's budget counts, and nothing on a route
// reads these. The only readers are the build (tools/build-instructor-materials.js)
// and the portal's on-demand key for a pack, both outside the deferred total, as
// D-TERM-02 did for the document pages. tests/instructorDocs.test.js holds the two
// languages to the same keys and the same {placeholders}.
//
// A noun that counts is a pair, [one, other], and is used through count().
// =============================================================================

export const LABEL_LOCALES = Object.freeze(['en', 'es']);

const en = {
  // --- the nouns that count --------------------------------------------------
  'n.step': ['step', 'steps'],
  'n.graded': ['graded question', 'graded questions'],
  'n.prediction': ['prediction', 'predictions'],
  'n.measurement': ['measurement screen', 'measurement screens'],
  'n.written': ['written answer', 'written answers'],
  'n.more': ['more step', 'more steps'],
  'n.document': ['document', 'documents'],

  // --- the guide -------------------------------------------------------------
  'guide.kicker': 'Gravitas Investigation | Instructor Guide',
  'guide.docTitle': '{title}: Instructor Guide',
  'guide.subject':
    'Instructor guide for the Gravitas investigation "{title}": objectives, flow, misconceptions, discussion prompts and model notes.',
  'guide.footer': 'Gravitas Instructor Guide  |  {title}',
  'guide.row.time': 'Estimated time',
  'guide.row.level': 'Student level',
  'guide.row.topic': 'Primary topic',
  'guide.row.difficulty': 'Difficulty',
  'guide.row.length': 'Length',
  'guide.row.input': 'Student input',
  'guide.row.placement': 'Recommended placement',
  'guide.row.courseLevel': 'Course level',
  'guide.row.textbook': 'Textbook alignment',
  'guide.row.mathematics': 'Mathematics asked of students',
  'guide.row.prerequisites': 'Investigations to do first',
  'guide.row.version': 'Investigation version',
  'guide.row.depths': 'Depths',
  'guide.textbook':
    'OpenStax Astronomy 2e, chapter {chapter}, section {section}',
  'guide.textbookChapter': 'OpenStax Astronomy 2e, chapter {chapter}',
  'guide.depthsValue': '{depths}; the key has one variant for each',
  'guide.none': 'None',
  'guide.s.overview': 'Overview',
  'guide.s.objectives': 'Learning objectives',
  'guide.objectivesIntro':
    'After completing this investigation, students should be able to:',
  'guide.s.prior': 'Prior knowledge',
  'guide.s.concepts': 'Key concepts',
  'guide.s.flow': 'Investigation flow',
  'guide.flow.steps': 'Steps',
  'guide.flow.what': 'What students do',
  'guide.flow.range': '{from}-{to}',
  'guide.held.note':
    'Predictions in this investigation are recorded when they are made and marked later, at the step where the result arrives. Until then the panel says only that the answer is recorded and where it will be settled. This is deliberate: a prediction marked on commit is settled by the answer key rather than by the experiment.',
  'guide.held.prediction': 'Prediction',
  'guide.held.markedAt': 'Marked at',
  'guide.held.step': 'Step {n}: {title}',
  'guide.s.features': 'Interactive features',
  'guide.features.feature': 'Feature',
  'guide.features.notes': 'Notes',
  'guide.s.misconceptions': 'Common misconceptions',
  'guide.misc.think': 'Students often think',
  'guide.misc.address': 'How to address it',
  'guide.s.scoring': 'What is scored automatically',
  'guide.scoring.intro':
    'The site marks multiple-choice and numeric answers as they are given. Everything else is recorded in the lab report for a person to read.',
  'guide.scoring.kind': 'Kind of screen',
  'guide.scoring.count': 'Screens',
  'guide.scoring.who': 'Marked by',
  'guide.scoring.site': 'The site, against the stated answer or tolerance',
  'guide.scoring.recorded':
    'Recorded, never marked wrong: the point is the commitment before experimenting',
  'guide.scoring.checked':
    'Sanity-checked on the screen; no single right number',
  'guide.scoring.person': 'You, with the rubric in the answer key',
  'guide.scoring.reflection':
    'Nobody: kept with the work and printed in the report',
  'guide.scoring.choice': 'Multiple choice',
  'guide.scoring.numeric': 'Numeric',
  'guide.scoring.prediction': 'Prediction',
  'guide.scoring.measurement': 'Measurement',
  'guide.scoring.written': 'Written answer',
  'guide.scoring.reflect': 'Reflection',
  'guide.s.accessibility': 'Accessibility',
  'guide.access.instruments':
    'Instruments docked in this investigation: {n}. Each has a text readout beside it, and every number a student is asked to record can be read from that readout.',
  'guide.access.noInstruments':
    'This investigation docks no instrument beside the lesson; every screen is text, a choice, a number to type or the simulation itself.',
  'guide.access.simulation':
    'The simulation is a canvas animation. It can be paused at any point without losing progress, and its speed is adjustable, which matters for a student who needs longer to read a changing value.',
  'guide.access.report':
    'The lab report is real text, not an image, so a screen reader can read it. Print and PDF both work.',
  'guide.access.statement':
    'The accessibility statement lists what was tested, how, and what is not yet covered:',
  'guide.access.link': 'Accessibility statement',
  'guide.s.notes': 'Teaching notes',
  'guide.s.discussion': 'Discussion questions',
  'guide.discussion.hint':
    'Optional. Suitable before the investigation, during class, or as a wrap-up.',
  'guide.s.extensions': 'Optional extensions',
  'guide.extensions.hint':
    'For interested or advanced students. None of these is a prerequisite for the investigation itself.',
  'guide.s.model': 'Model notes',
  'guide.modelLink': 'How Gravitas Models the Universe',
  'guide.closing':
    'The answer key for this investigation is a separate document. Every answer in it is generated from the investigation itself and checked against the same grading rule the website applies.',
  'guide.status.title': 'Translation status',
  'guide.status.none':
    'This guide is in English. The investigation itself is available in Spanish for students, and the Spanish guide is a separate document in the portal.',
  'guide.status.some':
    'Spanish guide. The headings, the investigation’s own words and {done} of {total} prose passages of the instructor notes are translated; the other {rest} are still in English and are marked in the margin of the status table.',
  'guide.status.chrome': 'Headings and table titles',
  'guide.status.lesson': 'The investigation’s own words',
  'guide.status.prose':
    'Instructor notes (overview, flow, misconceptions, discussion)',
  'guide.status.expectations': 'Expected observations in the key',
  'guide.status.col.part': 'Part of the document',
  'guide.status.col.count': 'In Spanish',
  'guide.status.col.state': 'State',
  'guide.status.done': 'translated',
  'guide.status.english': 'in English',

  // --- the key ---------------------------------------------------------------
  'key.kicker': 'Gravitas Investigation | Answer Key',
  'key.docTitle': '{title}: Answer Key',
  'key.docTitleDepth': '{title}: Answer Key, {depth} depth',
  'key.subject':
    'Answer key for the Gravitas investigation "{title}", derived from the investigation definitions and verified against the site’s own grader.',
  'key.footer': 'Gravitas Answer Key  |  {title}  |  Instructor copy',
  'key.footerDepth':
    'Gravitas Answer Key  |  {title}  |  {depth} depth  |  Instructor copy',
  'key.footerActivity':
    'Gravitas Answer Key  |  {title}  |  {activity}  |  Instructor copy',
  'key.docTitleActivity': '{title}: Answer Key, {activity}',
  'key.subtitle.depths': '{n} more at {depth} depth',
  'key.subtitle.graded': '{graded}, {pred}',
  'key.intro1':
    'Instructor copy. Every answer below is generated from the live investigation definition and verified against the same rule the website uses to mark it, so this key and the site cannot disagree. Steps that only ask students to read or watch are omitted, unless there is an observation to expect on them.',
  'key.intro2':
    'Predictions are recorded but never marked wrong: their purpose is to make students commit before they experiment. The answer given is the conclusion they should reach afterwards.',
  'key.introDepth':
    'This variant is the key for a student who reads at {depth} depth: the steps are numbered as that student sees them, and the steps of a deeper reading are not here.',
  'key.introActivity':
    'This variant is cut to the steps of the activity "{activity}": {n} of the investigation’s {total} steps, numbered as in the investigation, so a step keeps the number the full key gives it.',
  'key.step': 'Step {n}',
  'key.depthName': '{depth} depth',
  'key.depth.core': 'Core',
  'key.depth.quantitative': 'Quantitative',
  'key.depth.advanced': 'Advanced',
  'key.cat.graded': 'Question',
  'key.cat.prediction': 'Prediction',
  'key.cat.measurement': 'Measurement',
  'key.cat.activity': 'Activity',
  'key.cat.written': 'Written answer',
  'key.cat.reading': 'Reading',
  'key.correct': '(correct answer)',
  'key.rowCorrect': 'Correct answer',
  'key.rowConclusion': 'Conclusion after experimenting',
  'key.rowValue': 'Expected value',
  'key.rowRange': 'Accepted range',
  'key.rangeTo': '{low} to {high}',
  'key.lookFor': 'What to look for:',
  'key.rubric': 'Rubric',
  'key.rubric.criterion': 'Criterion',
  'key.rubric.levels': 'Levels',
  'key.rubric.points': '{points} pt',
  'key.rubric.pointsMany': '{points} pts',
  'key.rubricOnReflection':
    'Criteria for reading this reflection. Nothing marks it, and the review page shows them beside the response:',
  'key.fields': 'Fields on this screen:',
  'key.derived': ' (worked out for the student)',
  'key.validator':
    'This screen checks the entered values as they are typed and explains what is wrong when they do not hang together.',
  'key.checklist': 'Students are asked to:',
  'key.expected': 'Expected observation:',
  'key.reflection':
    'A reflection: kept with the work and printed in the student’s report. Nothing marks it.',
  'key.hints': 'Hints, shown one at a time when a student asks:',
  'key.feedback': 'What a wrong number is told, by kind of miss:',
  'key.mistakes': 'Mistakes the step names:',
  'key.option': 'Option {letter}: ',
  'key.why': 'Why:',
  'key.fb.correct': 'Right',
  'key.fb.close': 'Close',
  'key.fb.wrong-sign': 'Wrong sign',
  'key.fb.wrong-unit': 'Wrong unit',
  'key.fb.wrong-order-of-magnitude': 'Out by a power of ten',
  'key.fb.off': 'Otherwise off',
  'key.status.title': 'Translation status',
  'key.status.none':
    'This key is in English. The investigation is available in Spanish for students, and the Spanish key is a separate document in the portal.',
  'key.status.some':
    'Spanish key. Headings are translated, and {done} of {total} strings of the investigation’s own words and instructor expectations are in Spanish; the rest print in English.',

  'fact.courseLevel.survey': 'Survey course (non-majors)',
  'fact.courseLevel.majors': 'Course for majors',
  'fact.courseLevel.upper': 'Upper-division course',
  'fact.math.none': 'None',
  'fact.math.arithmetic':
    'Arithmetic: students record values and the investigation works out the rest',
  'fact.math.algebra':
    'Algebra: a step asks for a number the student has to work out',
  'fact.math.logarithms':
    'Logarithms: students read or plot a logarithmic axis',

  // --- documents the portal lists --------------------------------------------
  'doc.guide': '{title} - Instructor Guide',
  'doc.key': '{title} - Answer Key',
  'doc.keyDepth': '{title} - Answer Key, {depth} depth',
  'doc.keyActivity': '{title} - Answer Key, {activity}',
};

const es = {
  'n.step': ['paso', 'pasos'],
  'n.graded': ['pregunta calificada', 'preguntas calificadas'],
  'n.prediction': ['predicción', 'predicciones'],
  'n.measurement': ['pantalla de medición', 'pantallas de medición'],
  'n.written': ['respuesta escrita', 'respuestas escritas'],
  'n.more': ['paso más', 'pasos más'],
  'n.document': ['documento', 'documentos'],

  'guide.kicker': 'Investigación de Gravitas | Guía para docentes',
  'guide.docTitle': '{title}: Guía para docentes',
  'guide.subject':
    'Guía para docentes de la investigación de Gravitas "{title}": objetivos, desarrollo, ideas erróneas, preguntas de discusión y notas sobre el modelo.',
  'guide.footer': 'Guía para docentes de Gravitas  |  {title}',
  'guide.row.time': 'Tiempo estimado',
  'guide.row.level': 'Nivel del estudiantado',
  'guide.row.topic': 'Tema principal',
  'guide.row.difficulty': 'Dificultad',
  'guide.row.length': 'Extensión',
  'guide.row.input': 'Lo que responde el estudiantado',
  'guide.row.placement': 'Ubicación recomendada',
  'guide.row.courseLevel': 'Nivel del curso',
  'guide.row.textbook': 'Correspondencia con el libro de texto',
  'guide.row.mathematics': 'Matemáticas que se piden',
  'guide.row.prerequisites': 'Investigaciones previas',
  'guide.row.version': 'Versión de la investigación',
  'guide.row.depths': 'Profundidades',
  'guide.textbook':
    'OpenStax Astronomy 2e, capítulo {chapter}, sección {section}',
  'guide.textbookChapter': 'OpenStax Astronomy 2e, capítulo {chapter}',
  'guide.depthsValue': '{depths}; la clave tiene una variante para cada una',
  'guide.none': 'Ninguna',
  'guide.s.overview': 'Panorama general',
  'guide.s.objectives': 'Objetivos de aprendizaje',
  'guide.objectivesIntro':
    'Al terminar esta investigación, el estudiantado debería poder:',
  'guide.s.prior': 'Conocimientos previos',
  'guide.s.concepts': 'Conceptos clave',
  'guide.s.flow': 'Desarrollo de la investigación',
  'guide.flow.steps': 'Pasos',
  'guide.flow.what': 'Qué hace el estudiantado',
  'guide.flow.range': '{from}-{to}',
  'guide.held.note':
    'Las predicciones de esta investigación se registran cuando se hacen y se califican después, en el paso donde llega el resultado. Hasta entonces el panel solo dice que la respuesta quedó registrada y dónde se resolverá. Es deliberado: una predicción calificada al instante la resuelve la clave de respuestas y no el experimento.',
  'guide.held.prediction': 'Predicción',
  'guide.held.markedAt': 'Se califica en',
  'guide.held.step': 'Paso {n}: {title}',
  'guide.s.features': 'Funciones interactivas',
  'guide.features.feature': 'Función',
  'guide.features.notes': 'Notas',
  'guide.s.misconceptions': 'Ideas erróneas frecuentes',
  'guide.misc.think': 'El estudiantado suele pensar',
  'guide.misc.address': 'Cómo abordarlo',
  'guide.s.scoring': 'Lo que se califica automáticamente',
  'guide.scoring.intro':
    'El sitio califica las respuestas de opción múltiple y las numéricas al darse. Todo lo demás queda registrado en el informe de laboratorio para que lo lea una persona.',
  'guide.scoring.kind': 'Tipo de pantalla',
  'guide.scoring.count': 'Pantallas',
  'guide.scoring.who': 'Quién califica',
  'guide.scoring.site':
    'El sitio, contra la respuesta o la tolerancia indicadas',
  'guide.scoring.recorded':
    'Se registra y nunca se califica como error: lo importante es comprometerse antes de experimentar',
  'guide.scoring.checked':
    'Se revisa su coherencia en pantalla; no hay un único número correcto',
  'guide.scoring.person': 'Usted, con la rúbrica de la clave de respuestas',
  'guide.scoring.reflection':
    'Nadie: se guarda con el trabajo y se imprime en el informe',
  'guide.scoring.choice': 'Opción múltiple',
  'guide.scoring.numeric': 'Numérica',
  'guide.scoring.prediction': 'Predicción',
  'guide.scoring.measurement': 'Medición',
  'guide.scoring.written': 'Respuesta escrita',
  'guide.scoring.reflect': 'Reflexión',
  'guide.s.accessibility': 'Accesibilidad',
  'guide.access.instruments':
    'Instrumentos acoplados en esta investigación: {n}. Cada uno tiene una lectura en texto a su lado, y todo número que se pide registrar puede leerse ahí.',
  'guide.access.noInstruments':
    'Esta investigación no acopla ningún instrumento junto a la lección; cada pantalla es texto, una elección, un número que escribir o la propia simulación.',
  'guide.access.simulation':
    'La simulación es una animación en un lienzo. Se puede pausar en cualquier momento sin perder el progreso, y su velocidad es ajustable, lo que ayuda a quien necesita más tiempo para leer un valor que cambia.',
  'guide.access.report':
    'El informe de laboratorio es texto real, no una imagen, así que un lector de pantalla puede leerlo. Funcionan tanto la impresión como el PDF.',
  'guide.access.statement':
    'La declaración de accesibilidad indica qué se probó, cómo y qué falta por cubrir:',
  'guide.access.link': 'Declaración de accesibilidad',
  'guide.s.notes': 'Notas para la enseñanza',
  'guide.s.discussion': 'Preguntas de discusión',
  'guide.discussion.hint':
    'Opcionales. Sirven antes de la investigación, durante la clase o como cierre.',
  'guide.s.extensions': 'Ampliaciones opcionales',
  'guide.extensions.hint':
    'Para estudiantes con interés o nivel avanzado. Ninguna es requisito de la investigación.',
  'guide.s.model': 'Notas sobre el modelo',
  'guide.modelLink': 'Cómo modela Gravitas el universo',
  'guide.closing':
    'La clave de respuestas de esta investigación es un documento aparte. Cada respuesta se genera a partir de la propia investigación y se comprueba con la misma regla de calificación que aplica el sitio web.',
  'guide.status.title': 'Estado de la traducción',
  'guide.status.none':
    'Esta guía está en inglés. La investigación misma está disponible en español para el estudiantado.',
  'guide.status.some':
    'Guía en español. Los encabezados, las palabras de la propia investigación y {done} de {total} pasajes de las notas para docentes están traducidos; los otros {rest} siguen en inglés.',
  'guide.status.chrome': 'Encabezados y títulos de tabla',
  'guide.status.lesson': 'Las palabras de la propia investigación',
  'guide.status.prose':
    'Notas para docentes (panorama, desarrollo, ideas erróneas, discusión)',
  'guide.status.expectations': 'Observaciones esperadas en la clave',
  'guide.status.col.part': 'Parte del documento',
  'guide.status.col.count': 'En español',
  'guide.status.col.state': 'Estado',
  'guide.status.done': 'traducido',
  'guide.status.english': 'en inglés',

  'key.kicker': 'Investigación de Gravitas | Clave de respuestas',
  'key.docTitle': '{title}: Clave de respuestas',
  'key.docTitleDepth': '{title}: Clave de respuestas, profundidad {depth}',
  'key.subject':
    'Clave de respuestas de la investigación de Gravitas "{title}", derivada de las definiciones de la investigación y verificada con el propio calificador del sitio.',
  'key.footer':
    'Clave de respuestas de Gravitas  |  {title}  |  Copia para docentes',
  'key.footerDepth':
    'Clave de respuestas de Gravitas  |  {title}  |  profundidad {depth}  |  Copia para docentes',
  'key.footerActivity':
    'Clave de respuestas de Gravitas  |  {title}  |  {activity}  |  Copia para docentes',
  'key.docTitleActivity': '{title}: Clave de respuestas, {activity}',
  'key.subtitle.depths': '{n} más en profundidad {depth}',
  'key.subtitle.graded': '{graded}, {pred}',
  'key.intro1':
    'Copia para docentes. Cada respuesta de abajo se genera a partir de la definición vigente de la investigación y se verifica con la misma regla que usa el sitio para calificarla, de modo que esta clave y el sitio no pueden discrepar. Se omiten los pasos que solo piden leer o mirar, salvo que haya una observación que esperar en ellos.',
  'key.intro2':
    'Las predicciones se registran pero nunca se califican como error: su propósito es que el estudiantado se comprometa antes de experimentar. La respuesta que se da es la conclusión a la que deberían llegar después.',
  'key.introDepth':
    'Esta variante es la clave para quien lee en profundidad {depth}: los pasos están numerados como los ve esa persona, y no aparecen los pasos de una lectura más profunda.',
  'key.introActivity':
    'Esta variante se limita a los pasos de la actividad "{activity}": {n} de los {total} pasos de la investigación, con la numeración de la investigación, de modo que cada paso conserva el número que le da la clave completa.',
  'key.step': 'Paso {n}',
  'key.depthName': 'Profundidad {depth}',
  'key.depth.core': 'básica',
  'key.depth.quantitative': 'cuantitativa',
  'key.depth.advanced': 'avanzada',
  'key.cat.graded': 'Pregunta',
  'key.cat.prediction': 'Predicción',
  'key.cat.measurement': 'Medición',
  'key.cat.activity': 'Actividad',
  'key.cat.written': 'Respuesta escrita',
  'key.cat.reading': 'Lectura',
  'key.correct': '(respuesta correcta)',
  'key.rowCorrect': 'Respuesta correcta',
  'key.rowConclusion': 'Conclusión tras experimentar',
  'key.rowValue': 'Valor esperado',
  'key.rowRange': 'Intervalo aceptado',
  'key.rangeTo': '{low} a {high}',
  'key.lookFor': 'Qué buscar:',
  'key.rubric': 'Rúbrica',
  'key.rubric.criterion': 'Criterio',
  'key.rubric.levels': 'Niveles',
  'key.rubric.points': '{points} pt',
  'key.rubric.pointsMany': '{points} pts',
  'key.rubricOnReflection':
    'Criterios para leer esta reflexión. Nada la califica, y la página de revisión los muestra junto a la respuesta:',
  'key.fields': 'Campos de esta pantalla:',
  'key.derived': ' (calculado para el estudiante)',
  'key.validator':
    'Esta pantalla comprueba los valores a medida que se escriben y explica qué falla cuando no concuerdan entre sí.',
  'key.checklist': 'Se pide al estudiantado:',
  'key.expected': 'Observación esperada:',
  'key.reflection':
    'Una reflexión: se guarda con el trabajo y se imprime en el informe del estudiante. Nada la califica.',
  'key.hints': 'Pistas, que se muestran de una en una cuando alguien las pide:',
  'key.feedback':
    'Lo que se le dice a un número erróneo, según el tipo de error:',
  'key.mistakes': 'Errores que nombra el paso:',
  'key.option': 'Opción {letter}: ',
  'key.why': 'Por qué:',
  'key.fb.correct': 'Correcto',
  'key.fb.close': 'Cerca',
  'key.fb.wrong-sign': 'Signo equivocado',
  'key.fb.wrong-unit': 'Unidad equivocada',
  'key.fb.wrong-order-of-magnitude': 'Error de una potencia de diez',
  'key.fb.off': 'Otro error',
  'key.status.title': 'Estado de la traducción',
  'key.status.none':
    'Esta clave está en inglés. La investigación está disponible en español para el estudiantado; pida la clave en español.',
  'key.status.some':
    'Clave en español. Los encabezados están traducidos, y {done} de {total} cadenas de las palabras de la investigación y de las expectativas para docentes están en español; el resto se imprime en inglés.',

  'fact.courseLevel.survey': 'Curso general (no especialistas)',
  'fact.courseLevel.majors': 'Curso para especialistas',
  'fact.courseLevel.upper': 'Curso de nivel superior',
  'fact.math.none': 'Ninguna',
  'fact.math.arithmetic':
    'Aritmética: el estudiantado registra valores y la investigación calcula el resto',
  'fact.math.algebra': 'Álgebra: un paso pide un número que hay que calcular',
  'fact.math.logarithms': 'Logaritmos: se lee o se grafica un eje logarítmico',

  'doc.guide': '{title} - Guía para docentes',
  'doc.key': '{title} - Clave de respuestas',
  'doc.keyDepth': '{title} - Clave de respuestas, profundidad {depth}',
  'doc.keyActivity': '{title} - Clave de respuestas, {activity}',
};

export const LABELS = Object.freeze({ en, es });

/**
 * A reader for one language's labels.
 *
 * `L(key, vars)` fills {placeholders}; `L.count(n, noun)` is "3 steps" or "3
 * pasos". A key a language lacks falls back to English rather than printing
 * "undefined", and the test that holds the two languages to the same keys is
 * what makes the fallback unreachable.
 *
 * @param {string} locale - 'en' or 'es'
 * @returns {Function} L, with `locale` and `count`
 */
export function labelsFor(locale = 'en') {
  const table = LABELS[locale] ?? en;
  const L = (key, vars = {}) => {
    const raw = table[key] ?? en[key];
    if (raw === undefined) throw new Error(`No instructor label "${key}"`);
    return String(raw).replace(/\{(\w+)\}/g, (m, k) =>
      vars[k] === undefined ? m : String(vars[k])
    );
  };
  L.locale = locale in LABELS ? locale : 'en';
  L.count = (n, noun) => {
    const forms = table[`n.${noun}`] ?? en[`n.${noun}`];
    return `${Number.isFinite(n) ? n : 0} ${n === 1 ? forms[0] : forms[1]}`;
  };
  return L;
}
