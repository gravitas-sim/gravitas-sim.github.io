// =============================================================================
// The words of the printable activity list, in both languages (an instructor
// module, Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// Two readers of one table: the list itself (the HTML to print and the Markdown
// to paste) and the panel on the course builder and the kit. An instructor
// surface whose output is written once, so the words live here as two tables
// read by id (as js/instructorCartridgeText.js and js/teach/kitText.js do) and
// not in the catalogs, whose cost every visitor pays. `tr(locale, id, vars)` is
// the only reader; tests/activityList.test.js holds the two tables to the same
// ids and the same slots.
//
// The time words never promise: a band is an editorial estimate (the statement
// itself is js/data/instructorTimeBands.js STATEMENT, the one place it is
// written), and the outcome words say the matrix is the instructor's own
// mapping of what the course intends and shows nothing of what a student
// attained.
// =============================================================================

export const WORDS = {
  en: {
    'k.lesson': 'Investigation',
    'k.assignment': 'Activity cut from an investigation',
    'k.scenario': 'Simulation',
    'k.dataset': 'Observation',
    'k.reading': 'Reading',
    'k.pack': "Instructor's investigation",
    'k.guide': 'Guided investigation',
    'd.core': 'core depth',
    'd.quantitative': 'quantitative depth',
    'd.advanced': 'advanced depth',
    'p.core': 'Core',
    'p.intro': 'Optional: introductory background',
    'p.advanced': 'Optional: advanced extension',
    'b.short': 'short',
    'b.medium': 'medium',
    'b.long': 'long',
    'b.range': '{band}, {lo}–{hi} min',
    'b.none': 'not estimated',
    'b.rangeOnly': '{lo}–{hi} min',

    'doc.title': 'Activity list: {title}',
    'doc.term': 'Term: {term}',
    'doc.home': 'Course home (students open this link)',
    'doc.generated':
      'Made in the browser by Gravitas from the course file; nothing was sent anywhere.',
    'doc.link.open': 'Open',
    'doc.longlink':
      'A link too long to print in full shows as “Open”: on screen it still opens, and the saved page, the Markdown and the course file carry it whole.',
    'doc.audience': 'For: {audience}',
    'doc.prereq': 'Before the course',
    'doc.prereq.lesson': 'Investigation: {name}',
    'doc.glance': 'The course at a glance',
    'doc.glance.unit': 'Unit',
    'doc.glance.items': 'Items',
    'doc.glance.time': 'Time',
    'doc.glance.total': 'Whole course (core items)',
    'doc.glance.optional':
      'Optional items add {lo}–{hi} min if a student does them all.',
    'doc.time.note':
      'Time bands: short is {s}, medium {m}, long {l}. Each is an editorial estimate written by the project, from the investigations’ declared durations and step counts. {statement} Plan a class from them as you would from any estimate, and not from a measurement.',
    'doc.units': 'The plan, unit by unit',
    'doc.unit.time': 'Time for this unit: {range} (core items).',
    'doc.unit.optional': 'Optional items add {range}.',
    'doc.item.link': 'Link',
    'doc.item.kind': 'Kind',
    'doc.item.time': 'Time',
    'doc.item.after': 'Comes after',
    'doc.item.prereq': 'The investigation builds on',
    'doc.item.chapter': 'Textbook',
    'doc.item.objectives': 'Course objectives this serves',
    'doc.item.own': 'The investigation’s own objectives',
    'doc.item.note': 'Note for students',
    'doc.item.teacher': 'Note for the instructor',
    'doc.chapter':
      'OpenStax Astronomy 2e, chapter {chapter}, section {section}',
    'doc.chapter.only': 'OpenStax Astronomy 2e, chapter {chapter}',
    'doc.handin': 'What students hand in',
    'doc.handin.lede':
      'Students hand in the lab report as a PDF, or its token. Their work stays in their own browsers, and Gravitas collects nothing.',
    'doc.handin.lesson':
      'The lab report for {name}: its answers, {n} marked steps at the core depth.',
    'doc.handin.lessonDeep':
      'The lab report for {name}: its answers, including the marked steps added at the {depth}.',
    'doc.handin.assignment':
      'The lab report for {name}: the {n} steps chosen for it.',
    'doc.handin.pack': 'The lab report for {name}.',
    'doc.handin.none':
      'Nothing is handed in for {names}. Gravitas asks for nothing there: ask for what you want (a screenshot, a sentence).',
    'doc.handin.empty':
      'No item of this course produces a lab report. Ask students for what you want.',
    'doc.out': 'Objectives and outcomes',
    'doc.out.none':
      'No outcomes are entered for this course. Add your own in the course builder (Outcomes and the objectives they serve) to print the matrix here.',
    'doc.out.lede':
      'The matrix shows which of your outcomes each item serves, through the course objectives you mapped to them. It is your own mapping of what the course intends. It is not evidence that any student attained an outcome; the course’s activities hold no such evidence.',
    'doc.out.list': 'Your outcomes',
    'doc.out.map': 'Course objectives and the outcomes you mapped them to',
    'doc.out.unmapped': 'not mapped to an outcome',
    'doc.out.unserved':
      'No item serves {names}. Either an objective is not mapped to it, or no item names the objective.',
    'doc.out.item': 'Item',
    'doc.out.yes': 'serves',
    'doc.out.no': 'not mapped',
    'doc.out.itemNone':
      'These items name no course objective, so the matrix leaves them out: {names}.',
    'doc.out.objective': 'Objective {n}',
    'doc.objectives': 'Course objectives',

    'p.h': 'Print the activity list',
    'p.lede':
      'Makes a plan of this course to print or to paste into a page of your learning platform: units, items, links, depths, time bands, what builds on what, textbook chapters, objectives and what students hand in. It is made here, in the browser, from the course on this page; nothing is sent anywhere.',
    'p.lang': 'The list is written in {language}, the language of this page.',
    'p.lang.en': 'English',
    'p.lang.es': 'Spanish',
    'p.fixFirst': 'This course has problems the builder lists. Fix them first.',
    'p.loading': 'Reading the investigations…',
    'p.print': 'Print',
    'p.html': 'Save as a web page',
    'p.md': 'Save as Markdown',
    'p.copy': 'Copy Markdown',
    'p.copied': 'Copied the Markdown for {title} ({n} characters).',
    'p.copyFailed': 'The browser would not copy; use Save as Markdown instead.',
    'p.saved': 'Saved {file}.',
    'p.printing': 'Opening the print dialog for {title}.',
    'p.close': 'Close',
    'p.preview': 'The list, as it will print',
    'p.statement': 'Time bands: {statement}',
    'p.out.h': 'Your outcomes',
    'p.out.lede':
      'Write the outcomes your department or syllabus names (free text), then say which of the course’s objectives serve each. The list prints the matrix. It is your mapping of what the course intends, and it is not evidence that students attained anything.',
    'p.out.add': 'Add an outcome',
    'p.out.remove': 'Remove outcome {n}',
    'p.out.text': 'Outcome {n}',
    'p.out.textEs': 'Outcome {n}, in Spanish',
    'p.out.map': 'Objectives mapped to outcome {n}',
    'p.out.noObjectives':
      'The course has no objectives yet. Add them in the builder’s Objectives section first; an outcome is mapped to them.',
    'p.out.count': '{n} of {max} outcomes.',
    'p.out.spanish':
      'This course has Spanish, so each outcome needs its Spanish too.',
    'p.out.error':
      'The outcomes are not valid yet ({first}); the list is made from the last valid ones.',
    'p.out.empty': '(empty)',
  },
  es: {
    'k.lesson': 'Investigación',
    'k.assignment': 'Actividad hecha de una investigación',
    'k.scenario': 'Simulación',
    'k.dataset': 'Observación',
    'k.reading': 'Lectura',
    'k.pack': 'Investigación del docente',
    'k.guide': 'Investigación guiada',
    'd.core': 'profundidad básica',
    'd.quantitative': 'profundidad cuantitativa',
    'd.advanced': 'profundidad avanzada',
    'p.core': 'Básico',
    'p.intro': 'Opcional: antecedentes introductorios',
    'p.advanced': 'Opcional: ampliación avanzada',
    'b.short': 'corta',
    'b.medium': 'media',
    'b.long': 'larga',
    'b.range': '{band}, {lo}–{hi} min',
    'b.none': 'sin estimar',
    'b.rangeOnly': '{lo}–{hi} min',

    'doc.title': 'Lista de actividades: {title}',
    'doc.term': 'Periodo: {term}',
    'doc.home': 'Inicio del curso (los estudiantes abren este enlace)',
    'doc.generated':
      'Hecha en el navegador por Gravitas a partir del archivo del curso; no se envió nada a ninguna parte.',
    'doc.link.open': 'Abrir',
    'doc.longlink':
      'Un enlace demasiado largo para imprimirlo entero aparece como «Abrir»: en pantalla sigue abriendo, y la página guardada, el Markdown y el archivo del curso lo llevan completo.',
    'doc.audience': 'Para: {audience}',
    'doc.prereq': 'Antes del curso',
    'doc.prereq.lesson': 'Investigación: {name}',
    'doc.glance': 'El curso de un vistazo',
    'doc.glance.unit': 'Unidad',
    'doc.glance.items': 'Elementos',
    'doc.glance.time': 'Tiempo',
    'doc.glance.total': 'Todo el curso (elementos básicos)',
    'doc.glance.optional':
      'Los elementos opcionales suman {lo}–{hi} min si un estudiante los hace todos.',
    'doc.time.note':
      'Franjas de tiempo: corta es {s}, media {m}, larga {l}. Cada una es una estimación editorial escrita por el proyecto, a partir de las duraciones declaradas y del número de pasos de las investigaciones. {statement} Planifique una clase con ellas como con cualquier estimación, y no como con una medición.',
    'doc.units': 'El plan, unidad por unidad',
    'doc.unit.time': 'Tiempo de esta unidad: {range} (elementos básicos).',
    'doc.unit.optional': 'Los elementos opcionales suman {range}.',
    'doc.item.link': 'Enlace',
    'doc.item.kind': 'Tipo',
    'doc.item.time': 'Tiempo',
    'doc.item.after': 'Va después de',
    'doc.item.prereq': 'La investigación se apoya en',
    'doc.item.chapter': 'Libro de texto',
    'doc.item.objectives': 'Objetivos del curso a los que sirve',
    'doc.item.own': 'Los objetivos propios de la investigación',
    'doc.item.note': 'Nota para estudiantes',
    'doc.item.teacher': 'Nota para el docente',
    'doc.chapter':
      'OpenStax Astronomy 2e, capítulo {chapter}, sección {section}',
    'doc.chapter.only': 'OpenStax Astronomy 2e, capítulo {chapter}',
    'doc.handin': 'Qué entregan los estudiantes',
    'doc.handin.lede':
      'Los estudiantes entregan el informe de laboratorio como PDF, o su token. Su trabajo se queda en su propio navegador y Gravitas no recoge nada.',
    'doc.handin.lesson':
      'El informe de laboratorio de {name}: sus respuestas, {n} pasos calificables en la profundidad básica.',
    'doc.handin.lessonDeep':
      'El informe de laboratorio de {name}: sus respuestas, con los pasos calificables añadidos en la {depth}.',
    'doc.handin.assignment':
      'El informe de laboratorio de {name}: los {n} pasos elegidos para ella.',
    'doc.handin.pack': 'El informe de laboratorio de {name}.',
    'doc.handin.none':
      'No se entrega nada de {names}. Gravitas no pide nada ahí: pida lo que desee (una captura, una frase).',
    'doc.handin.empty':
      'Ningún elemento de este curso produce un informe de laboratorio. Pida a los estudiantes lo que desee.',
    'doc.out': 'Objetivos y resultados',
    'doc.out.none':
      'No hay resultados escritos para este curso. Escriba los suyos en el creador de cursos (Resultados y los objetivos a los que sirven) para imprimir aquí la matriz.',
    'doc.out.lede':
      'La matriz muestra a cuáles de sus resultados sirve cada elemento, por medio de los objetivos del curso que usted asoció con ellos. Es su propia asociación de lo que el curso pretende. No es evidencia de que ningún estudiante haya alcanzado un resultado; las actividades del curso no guardan tal evidencia.',
    'doc.out.list': 'Sus resultados',
    'doc.out.map': 'Objetivos del curso y los resultados con que los asoció',
    'doc.out.unmapped': 'sin asociar a un resultado',
    'doc.out.unserved':
      'Ningún elemento sirve a {names}. O un objetivo no está asociado con él, o ningún elemento nombra el objetivo.',
    'doc.out.item': 'Elemento',
    'doc.out.yes': 'sirve',
    'doc.out.no': 'sin asociar',
    'doc.out.itemNone':
      'Estos elementos no nombran ningún objetivo del curso, por lo que la matriz los deja fuera: {names}.',
    'doc.out.objective': 'Objetivo {n}',
    'doc.objectives': 'Objetivos del curso',

    'p.h': 'Imprimir la lista de actividades',
    'p.lede':
      'Hace un plan de este curso para imprimir o para pegar en una página de su plataforma de aprendizaje: unidades, elementos, enlaces, profundidades, franjas de tiempo, qué se apoya en qué, capítulos del libro de texto, objetivos y qué entregan los estudiantes. Se hace aquí, en el navegador, a partir del curso de esta página; no se envía nada a ninguna parte.',
    'p.lang': 'La lista está escrita en {language}, el idioma de esta página.',
    'p.lang.en': 'inglés',
    'p.lang.es': 'español',
    'p.fixFirst':
      'Este curso tiene problemas que el creador enumera. Corríjalos primero.',
    'p.loading': 'Leyendo las investigaciones…',
    'p.print': 'Imprimir',
    'p.html': 'Guardar como página web',
    'p.md': 'Guardar como Markdown',
    'p.copy': 'Copiar el Markdown',
    'p.copied': 'Se copió el Markdown de {title} ({n} caracteres).',
    'p.copyFailed': 'El navegador no quiso copiar; use Guardar como Markdown.',
    'p.saved': 'Se guardó {file}.',
    'p.printing': 'Abriendo el diálogo de impresión de {title}.',
    'p.close': 'Cerrar',
    'p.preview': 'La lista, tal como se imprimirá',
    'p.statement': 'Franjas de tiempo: {statement}',
    'p.out.h': 'Sus resultados',
    'p.out.lede':
      'Escriba los resultados que nombra su departamento o su programa (texto libre) y diga a cuáles sirve cada objetivo del curso. La lista imprime la matriz. Es su asociación de lo que el curso pretende y no es evidencia de que los estudiantes alcanzaran nada.',
    'p.out.add': 'Añadir un resultado',
    'p.out.remove': 'Quitar el resultado {n}',
    'p.out.text': 'Resultado {n}',
    'p.out.textEs': 'Resultado {n}, en español',
    'p.out.map': 'Objetivos asociados con el resultado {n}',
    'p.out.noObjectives':
      'El curso aún no tiene objetivos. Añádalos primero en la sección Objetivos del creador; un resultado se asocia con ellos.',
    'p.out.count': '{n} de {max} resultados.',
    'p.out.spanish':
      'Este curso tiene español, así que cada resultado necesita también el suyo.',
    'p.out.error':
      'Los resultados aún no son válidos ({first}); la lista se hace con los últimos válidos.',
    'p.out.empty': '(vacío)',
  },
};

/**
 * A word by id in a language, with `{name}` slots filled; English when a
 * language lacks it, the id when neither has it.
 * @param {'en'|'es'} locale
 * @param {string} id
 * @param {object} [vars]
 * @returns {string}
 */
export function tr(locale, id, vars = {}) {
  const s = WORDS[locale]?.[id] ?? WORDS.en[id] ?? id;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
