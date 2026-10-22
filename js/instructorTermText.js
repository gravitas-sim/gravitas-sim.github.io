// =============================================================================
// The words of the next-term path, in both languages
// -----------------------------------------------------------------------------
// Prompt 168: the panel on the course builder ("Use a course as it is", "Start
// a new term"), the kit's new-term step and the review page's archive messages.
// They are instructor surfaces whose output (a link, a file name) is written
// once, so the words live here as two tables read by id, as the kit's do
// (js/teach/kitText.js), and not in the catalogs, whose route cost every visitor
// to the builder and the review page their share. `tr(locale, id, vars)` is the
// only reader; tests/instructorTerm.test.js holds the tables to the same ids.
// =============================================================================

export const WORDS = {
  en: {
    'archive.none':
      'Read at least one report first; there is nothing to archive.',
    'archive.saved':
      'Saved {file} with {n} reports{marks}. They are cleared from this page; open the file here to bring them back.',
    'archive.marks': ' and your marks',
    'archive.opened': 'Opened {file}: {n} reports{marks}.',
    'archive.failed':
      'The archive could not be made ({reason}). Nothing was cleared.',
    'archive.reason.notJson': 'That archive is not a JSON file.',
    'archive.reason.wrongFormat': 'That is not a Gravitas archive.',
    'archive.reason.newer':
      'That archive was made by a newer Gravitas than this page.',
    'archive.reason.shape':
      'That archive is damaged: a report in it is not readable.',
    'archive.reason.tooMany':
      'That archive holds more reports than this page reads.',

    // --- The panel on the course builder -----------------------------------
    'p.use.h': 'Use this course as it comes',
    'p.next.h': 'Start a new term',
    'p.use.lede':
      "Gravitas makes a copy of this course for your class: every investigation pinned to today's version, a fresh code for each activity and one link for your students. You change nothing, and you can still edit the copy below.",
    'p.next.lede':
      "Gravitas makes a copy of this course for the new term: every investigation re-pinned to today's version, a fresh code for each activity, a new link and a list of what changed since last term. Last term's file and links are not touched, and nothing students made is deleted.",
    'p.course': 'Course: {title}, version {version}',
    'p.term': 'Term',
    'p.term.hint.use':
      "For example Spring 2027. It is added to each activity's title, so students who used the course before start this one clean.",
    'p.term.hint.next':
      "For example Spring 2027. It is added to each activity's title, so students who used the course last term start this one clean.",
    'p.term.empty': 'Write the term, for example Spring 2027.',
    'p.term.long': 'Use {max} characters or fewer.',
    'p.term.markup': 'Use plain words: no angle brackets or character codes.',
    'p.fixFirst':
      'This course has problems the builder lists below. Fix them first.',
    'p.keep': "Save last term's course file first",
    'p.go.use': 'Make the link for my class',
    'p.go.next': 'Start the new term',
    'p.close': 'Close',
    'r.h': 'Ready for your class',
    'r.ready':
      '{title} is ready. Every investigation is pinned to the version Gravitas has today.',
    'r.link': 'Link to give your students',
    'r.copy': 'Copy the link',
    'r.copied': 'Copied.',
    'r.copyFailed': 'Copying was refused; select the link and copy it.',
    'r.open': 'Open the course page',
    'r.kit': 'Hand it out: link, QR code and handout',
    'r.save': 'Save the course file',
    'r.saved':
      'Saved {file}. Next term, open it here and choose Start a new term.',
    'r.long':
      'The link is {n} characters, longer than some mail programs and platforms keep. Give students the course file instead (Save the course file); the course page opens it.',
    'r.same':
      'Nothing changed under the course: every investigation is as it was pinned.',
    'r.changed.one':
      "One item was not what the course pinned. It is pinned to today's version now:",
    'r.changed.many':
      "{n} items were not what the course pinned. They are pinned to today's versions now:",
    'r.refused':
      'These could not be re-pinned and stay as they were; remove or replace them in the builder below: {ids}.',
    'r.item': '{name}: {standing}{steps}',
    'r.steps.changed': '; steps whose question changed: {n}',
    'r.steps.missing': '; steps no longer in the investigation, dropped: {n}',
    'st.same': 'as pinned',
    'st.changed': "the investigation's steps changed",
    'st.compatible': 'a newer compatible version',
    'st.major': 'a new major version of its package',
    'st.moved': 'now comes from another package',
    'st.unpinned': 'had no pin',
    'st.missing': 'no longer in Gravitas',
    'st.unchecked': 'not checked here',
    'r.keys.term':
      "{n} activities have a new code and the term in their title, so this term's reports, and the answers students keep for them, stay apart from last term's.",
    'r.keys.noterm':
      '{n} activities have a new code, so reports from this class are grouped on their own on the review page.',
    'r.keys.none':
      "This course has no activities, so there is no code to refresh. Progress on whole investigations is kept in each student's own browser, as it always was, and is not separated by term.",
    'r.next':
      'Then students open the link and work, and hand in the lab report PDF or its token. Open the course file on the review page, with their reports, and it groups them under your names.',
    'r.review': 'Open submission review',
  },
  es: {
    'archive.none':
      'Lee al menos una entrega primero; no hay nada que archivar.',
    'archive.saved':
      'Se guardó {file} con {n} entregas{marks}. Se quitaron de esta página; abre el archivo aquí para recuperarlas.',
    'archive.marks': ' y tus notas',
    'archive.opened': 'Se abrió {file}: {n} entregas{marks}.',
    'archive.failed':
      'No se pudo crear el archivo ({reason}). No se quitó nada.',
    'archive.reason.notJson': 'Ese archivo no es un archivo JSON.',
    'archive.reason.wrongFormat': 'Ese no es un archivo de Gravitas.',
    'archive.reason.newer':
      'Ese archivo lo creó una versión de Gravitas más nueva que esta página.',
    'archive.reason.shape':
      'Ese archivo está dañado: una de sus entregas no se puede leer.',
    'archive.reason.tooMany':
      'Ese archivo tiene más entregas de las que esta página lee.',

    // --- El panel del creador de cursos ------------------------------------
    'p.use.h': 'Usar este curso tal como viene',
    'p.next.h': 'Empezar un periodo nuevo',
    'p.use.lede':
      'Gravitas hace una copia de este curso para tu clase: cada investigación fijada a la versión de hoy, un código nuevo para cada actividad y un enlace para tus estudiantes. No cambias nada, y puedes seguir editando la copia más abajo.',
    'p.next.lede':
      'Gravitas hace una copia de este curso para el periodo nuevo: cada investigación fijada otra vez a la versión de hoy, un código nuevo para cada actividad, un enlace nuevo y una lista de lo que cambió desde el periodo pasado. El archivo y los enlaces del periodo pasado no se tocan, y no se borra nada de lo que hicieron los estudiantes.',
    'p.course': 'Curso: {title}, versión {version}',
    'p.term': 'Periodo',
    'p.term.hint.use':
      'Por ejemplo Primavera 2027. Se añade al título de cada actividad, así quienes usaron el curso antes empiezan este desde cero.',
    'p.term.hint.next':
      'Por ejemplo Primavera 2027. Se añade al título de cada actividad, así quienes usaron el curso el periodo pasado empiezan este desde cero.',
    'p.term.empty': 'Escribe el periodo, por ejemplo Primavera 2027.',
    'p.term.long': 'Usa {max} caracteres o menos.',
    'p.term.markup':
      'Usa palabras sencillas: sin paréntesis angulares ni códigos de caracteres.',
    'p.fixFirst':
      'Este curso tiene problemas que el creador lista más abajo. Corrígelos primero.',
    'p.keep': 'Guarda primero el archivo del curso del periodo pasado',
    'p.go.use': 'Crear el enlace para mi clase',
    'p.go.next': 'Empezar el periodo nuevo',
    'p.close': 'Cerrar',
    'r.h': 'Listo para tu clase',
    'r.ready':
      '{title} está listo. Cada investigación está fijada a la versión que Gravitas tiene hoy.',
    'r.link': 'Enlace para dar a tus estudiantes',
    'r.copy': 'Copiar el enlace',
    'r.copied': 'Copiado.',
    'r.copyFailed': 'No se pudo copiar; selecciona el enlace y cópialo.',
    'r.open': 'Abrir la página del curso',
    'r.kit': 'Para repartirlo: enlace, código QR y hoja',
    'r.save': 'Guardar el archivo del curso',
    'r.saved':
      'Se guardó {file}. El periodo próximo, ábrelo aquí y elige Empezar un periodo nuevo.',
    'r.long':
      'El enlace tiene {n} caracteres, más de lo que admiten algunos programas de correo y plataformas. Da a los estudiantes el archivo del curso (Guardar el archivo del curso); la página del curso lo abre.',
    'r.same':
      'No cambió nada en el curso: cada investigación está como estaba fijada.',
    'r.changed.one':
      'Un elemento no era lo que el curso tenía fijado. Ahora está fijado a la versión de hoy:',
    'r.changed.many':
      '{n} elementos no eran lo que el curso tenía fijado. Ahora están fijados a las versiones de hoy:',
    'r.refused':
      'Estos no se pudieron fijar otra vez y quedan como estaban; quítalos o reemplázalos en el creador, más abajo: {ids}.',
    'r.item': '{name}: {standing}{steps}',
    'r.steps.changed': '; pasos cuya pregunta cambió: {n}',
    'r.steps.missing':
      '; pasos que ya no están en la investigación, quitados: {n}',
    'st.same': 'como estaba fijado',
    'st.changed': 'cambiaron los pasos de la investigación',
    'st.compatible': 'una versión compatible más nueva',
    'st.major': 'una versión mayor nueva de su paquete',
    'st.moved': 'ahora viene de otro paquete',
    'st.unpinned': 'no tenía fijación',
    'st.missing': 'ya no está en Gravitas',
    'st.unchecked': 'no se comprobó aquí',
    'r.keys.term':
      '{n} actividades tienen un código nuevo y el periodo en su título, así que las entregas de este periodo, y las respuestas que los estudiantes guardan, quedan aparte de las del periodo pasado.',
    'r.keys.noterm':
      '{n} actividades tienen un código nuevo, así que las entregas de esta clase se agrupan aparte en la página de revisión.',
    'r.keys.none':
      'Este curso no tiene actividades, así que no hay código que renovar. El avance en investigaciones completas se guarda en el navegador de cada estudiante, como siempre, y no se separa por periodo.',
    'r.next':
      'Luego los estudiantes abren el enlace y trabajan, y entregan el PDF del informe o su ficha. Abre el archivo del curso en la página de revisión, con sus entregas, y las agrupa con tus nombres.',
    'r.review': 'Abrir la revisión de entregas',
  },
};

/**
 * One sentence in a language, with {name} slots filled; the English when the
 * other language lacks it, and the id itself when neither has it.
 * @param {string} locale - 'en' or 'es'
 * @param {string} id - A key of WORDS.en
 * @param {object} [vars] - Values for the slots
 * @returns {string}
 */
export function tr(locale, id, vars) {
  const entry = WORDS[locale]?.[id] ?? WORDS.en[id];
  if (entry === undefined) return id;
  return vars
    ? entry.replace(/\{(\w+)\}/g, (w, k) =>
        Object.hasOwn(vars, k) ? String(vars[k]) : w
      )
    : entry;
}
