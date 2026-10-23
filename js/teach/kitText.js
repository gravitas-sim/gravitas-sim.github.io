// =============================================================================
// The words of the distribution kit, in both languages
// -----------------------------------------------------------------------------
// /teaching/kit/ is an instructor page whose output is partly for students (the
// handout, the paragraph to paste into a course platform), and that output is
// written in either language whatever the page itself is in, so the words live
// here as two tables read by id rather than in the catalogs, which hold one
// language at a time. `tr(locale, id, vars)` is the only reader.
//
// Student-facing sentences (the `handout.*` and `paste.*` ids) use the platform
// nouns: activity, investigation, course. The platform notes (`lms.*`) quote
// each platform's own labels exactly as that platform shows them, which are
// third-party names and not ours. tests/instructorFlow.test.js holds the two
// tables to the same ids.
// =============================================================================

export const WORDS = {
  en: {
    'page.title': 'Distribution kit | Gravitas',
    h1: 'Distribution kit',
    lede: 'Everything needed to hand an activity or a course to students: the link, a code to scan, a one-page handout and notes for posting it on a course platform. Nothing is uploaded; it is all made in this browser.',
    'start.h': 'Start from',
    'start.note':
      'The activity link you made, or the course link, pasted here; or the activity file or course file you saved. Opening this page from the builder does this for you.',
    'coll.h': 'A collection of saved items',
    'coll.note':
      'Save investigations, scenarios and datasets with the Save button on a Library item page, then order them here, add a sentence to each and make one link or file. Your students can keep it, and it shows in their Library and in My work. An older build of Gravitas, such as 2.0.0, cannot open a collection.',
    'coll.open': 'Make a link from what I saved',
    'cc.h': 'A Common Cartridge for a course platform',
    'cc.note':
      'A course can go to a course platform as one file: a Thin Common Cartridge of web links, one module for each unit, each link opening an item in Gravitas. It carries nothing about students and no grades come back.',
    'cc.open': 'Make a Common Cartridge',
    'cc.loading': 'Reading the course…',
    'plan.h': 'A printable activity list',
    'plan.note':
      'A course can be printed as a plan: its units, items, links, depths, time bands, textbook chapters, objectives and what students hand in, to print or to paste into a page of your platform. The time bands are editorial estimates with no observed class data.',
    'plan.open': 'Make the activity list',
    'plan.loading': 'Reading the course…',
    'start.paste': 'Paste an activity link or a course link',
    'start.go': 'Make the kit',
    'start.file': 'or choose an activity file or a course file',
    'start.reason.notJson':
      'That is not a link to an activity or a course, and not a JSON file.',
    'start.reason.unknownKind': 'That is neither an activity nor a course.',
    'start.reason.tooLarge':
      'That is larger than an activity or a course can be.',
    'start.reason.badCourse': 'That course file has a problem: {message}',
    'start.reason.other': 'That could not be read ({code}).',
    'kind.activity': 'Activity: {steps} steps of {lesson}',
    'kind.course': 'Course: {units} units, {activities} activities',
    'link.h': 'Student link',
    'link.copy': 'Copy the link',
    'link.copied': 'Copied.',
    'link.ok': '{n} characters: comfortable to paste.',
    'link.long':
      '{n} characters: longer than {limit}, which some mail programs and course platforms cut. Share the file instead, or make a shorter activity.',
    'link.open': 'Open as a student',
    'roster.label': 'Class or roster code on the link (optional)',
    'roster.help':
      'A code on the link rides into every report, so one code covers a whole class. It is not a student’s identity. To tell students apart, ask them to type their login or student number where the report asks for a name; the review page can match on that.',
    'hint.label':
      'What students type where the report asks for a name (optional)',
    'qr.h': 'Code to scan',
    'qr.download': 'Download the code (SVG)',
    'qr.label': 'Code that opens {title}',
    'qr.long':
      'This link is too long for a scannable code (the most is {max} characters). Use the link or the file instead.',
    'embed.h': 'Markup for a page',
    'embed.note.activity':
      'A link to paste into a page of your course platform. An activity opens the full application, so it is a link and not a frame; to show one figure in a page, use the figure builder.',
    'embed.note.course':
      'A frame for a page that allows one, and a link for a page that does not. Some platforms remove frames; the link always works.',
    'embed.copy': 'Copy the markup',
    'handout.h': 'One-page handout',
    'handout.lang': 'Language of the handout and the text to paste',
    'handout.both': 'Both, one page each',
    'handout.print': 'Print the handout',
    'lms.h': 'Notes for course platforms',
    'lms.note':
      'Gravitas is not connected to any platform and is not an LTI tool: a platform holds a link, and students send back a PDF. Platform menus change; these notes name the setting, not its place.',
    'lms.paste': 'Text to paste for students',
    'lms.copy': 'Copy',
    'reuse.h': 'Reuse next term',
    'reuse.note':
      'Check this activity against this build of Gravitas. If a step was rewritten or removed since the activity was made, say so, and make a new activity link whose steps are as they are now.',
    'reuse.check': 'Check against this build',
    'reuse.save': 'Save the activity file',
    'reuse.clean':
      'All {n} steps are as they were. The link is good to use again.',
    'reuse.dirty':
      '{present} steps unchanged, {changed} rewritten, {missing} removed.',
    'reuse.reissued':
      'A new link has been made with the steps as they are now and a new code, so answers saved under the old one do not attach to rewritten steps.',
    'reuse.course':
      'A course keeps its own record of every pin. Open the course file in the course builder to see what changed and to upgrade it.',
    'reuse.use': 'Use the new link',
    'reuse.loading': 'Checking…',
    'reuse.failed': 'The investigation could not be loaded.',
    'term.h': 'Start a new term',
    'term.note':
      "Make this {what} for a new term: a fresh code, the term in the title so students who used it before start clean, and a new link. Last term's link and file are not touched.",
    'term.what.activity': 'activity',
    'term.what.course': 'course',
    'term.label': 'Term',
    'term.was': 'Last term, if it is in the title now (optional)',
    'term.go': 'Start the new term',
    'term.save': 'Save the new course file',
    'term.done.activity':
      'New term, {term}: the link, the code, the handout and the platform notes above are for it.',
    'term.done.course':
      'New term, {term}: the link, the handout and the platform notes above are for it.',
    'handout.open': 'To start',
    'handout.scan': 'Scan the code, or type this address:',
    'handout.do.activity': 'What to do ({steps} steps)',
    'handout.do.course': 'What is in this course',
    'handout.name':
      'In your report, type this where it asks for your name: {hint}.',
    'handout.name.free': 'In your report, type your name where it asks for it.',
    'handout.class': 'Class code: {code}.',
    'handout.finish': 'When you finish',
    'handout.finish.text':
      'Open your lab report, save it as a PDF and hand in that PDF the way your instructor asked. Your answers travel inside the PDF; nothing else needs to be sent. Your work stays in your own browser until you do.',
    'handout.minutes': 'about {n} minutes',
    'paste.activity':
      'Open the activity here: {link} Work through the steps. When you finish, open your lab report, save it as a PDF and submit that PDF. {name}',
    'paste.course':
      'Open the course here: {link} Each item has its own link. When you finish an activity, open your lab report, save it as a PDF and submit that PDF. {name}',
    'paste.name': 'In the report, type {hint} where it asks for your name.',
    'paste.name.free': 'In the report, type your name where it asks for it.',
    'item.lesson': 'Investigation: {title}',
    'item.assignment': 'Activity: {title}',
    'item.scenario': 'Simulation: {title}',
    'item.dataset': 'Data: {title}',
    'item.guide': 'Lab investigation: {title}',
    'item.reading': 'Reading: {title}',
  },
  es: {
    'page.title': 'Kit de distribución | Gravitas',
    h1: 'Kit de distribución',
    lede: 'Todo lo necesario para entregar una actividad o un curso a los estudiantes: el enlace, un código para escanear, una hoja de una página y notas para publicarlo en una plataforma de cursos. No se sube nada; todo se hace en este navegador.',
    'start.h': 'Empezar desde',
    'start.note':
      'El enlace de actividad que hizo, o el enlace del curso, pegado aquí; o el archivo de actividad o de curso que guardó. Abrir esta página desde el creador lo hace por usted.',
    'coll.h': 'Una colección de elementos guardados',
    'coll.note':
      'Guarde investigaciones, escenarios y conjuntos de datos con el botón Guardar de la página de un elemento de la Biblioteca; luego ordénelos aquí, añada una frase a cada uno y cree un enlace o un archivo. Sus estudiantes pueden conservarla y aparece en su Biblioteca y en Mi trabajo. Una versión anterior de Gravitas, como la 2.0.0, no puede abrir una colección.',
    'coll.open': 'Crear un enlace con lo que guardé',
    'cc.h': 'Un Common Cartridge para una plataforma de cursos',
    'cc.note':
      'Un curso puede ir a una plataforma de cursos como un solo archivo: un Thin Common Cartridge de enlaces web, un módulo por unidad, cada enlace abre un elemento en Gravitas. No lleva nada sobre los estudiantes y no se devuelven calificaciones.',
    'cc.open': 'Hacer un Common Cartridge',
    'cc.loading': 'Leyendo el curso…',
    'plan.h': 'Una lista de actividades para imprimir',
    'plan.note':
      'Un curso puede imprimirse como un plan: sus unidades, elementos, enlaces, profundidades, franjas de tiempo, capítulos del libro de texto, objetivos y qué entregan los estudiantes, para imprimir o para pegar en una página de su plataforma. Las franjas de tiempo son estimaciones editoriales, sin datos observados en clase.',
    'plan.open': 'Hacer la lista de actividades',
    'plan.loading': 'Leyendo el curso…',
    'start.paste': 'Pegue un enlace de actividad o de curso',
    'start.go': 'Hacer el kit',
    'start.file': 'o elija un archivo de actividad o de curso',
    'start.reason.notJson':
      'Eso no es un enlace de actividad ni de curso, ni un archivo JSON.',
    'start.reason.unknownKind': 'Eso no es una actividad ni un curso.',
    'start.reason.tooLarge':
      'Eso es mayor de lo que puede ser una actividad o un curso.',
    'start.reason.badCourse':
      'Ese archivo de curso tiene un problema: {message}',
    'start.reason.other': 'No se pudo leer ({code}).',
    'kind.activity': 'Actividad: {steps} pasos de {lesson}',
    'kind.course': 'Curso: {units} unidades, {activities} actividades',
    'link.h': 'Enlace para estudiantes',
    'link.copy': 'Copiar el enlace',
    'link.copied': 'Copiado.',
    'link.ok': '{n} caracteres: cómodo de pegar.',
    'link.long':
      '{n} caracteres: más de {limit}, que algunos programas de correo y plataformas cortan. Comparta el archivo, o haga una actividad más corta.',
    'link.open': 'Abrir como estudiante',
    'roster.label': 'Código de clase o de lista en el enlace (opcional)',
    'roster.help':
      'Un código en el enlace llega a todos los informes, así que un solo código cubre una clase entera. No es la identidad de un estudiante. Para distinguirlos, pídales que escriban su usuario o su número de estudiante donde el informe pide un nombre; la página de revisión puede identificar por eso.',
    'hint.label':
      'Lo que los estudiantes escriben donde el informe pide un nombre (opcional)',
    'qr.h': 'Código para escanear',
    'qr.download': 'Descargar el código (SVG)',
    'qr.label': 'Código que abre {title}',
    'qr.long':
      'Este enlace es demasiado largo para un código escaneable (el máximo es {max} caracteres). Use el enlace o el archivo.',
    'embed.h': 'Código para una página',
    'embed.note.activity':
      'Un enlace para pegar en una página de su plataforma de cursos. Una actividad abre la aplicación completa, así que es un enlace y no un marco; para mostrar una figura en una página, use el creador de figuras.',
    'embed.note.course':
      'Un marco para una página que lo admita y un enlace para una que no. Algunas plataformas quitan los marcos; el enlace siempre funciona.',
    'embed.copy': 'Copiar el código',
    'handout.h': 'Hoja de una página',
    'handout.lang': 'Idioma de la hoja y del texto para pegar',
    'handout.both': 'Ambos, una página cada uno',
    'handout.print': 'Imprimir la hoja',
    'lms.h': 'Notas para plataformas de cursos',
    'lms.note':
      'Gravitas no está conectado a ninguna plataforma ni es una herramienta LTI: la plataforma guarda un enlace y los estudiantes devuelven un PDF. Los menús de las plataformas cambian; estas notas nombran el ajuste, no su lugar.',
    'lms.paste': 'Texto para pegar a los estudiantes',
    'lms.copy': 'Copiar',
    'reuse.h': 'Reutilizar el próximo periodo',
    'reuse.note':
      'Compruebe esta actividad con esta versión de Gravitas. Si un paso se reescribió o se quitó desde que se hizo la actividad, se le dice, y se hace un enlace nuevo con los pasos como están ahora.',
    'reuse.check': 'Comprobar con esta versión',
    'reuse.save': 'Guardar el archivo de actividad',
    'reuse.clean':
      'Los {n} pasos están como estaban. El enlace sirve de nuevo.',
    'reuse.dirty':
      '{present} pasos sin cambios, {changed} reescritos, {missing} quitados.',
    'reuse.reissued':
      'Se hizo un enlace nuevo con los pasos como están ahora y un código nuevo, para que las respuestas guardadas con el anterior no se asocien a pasos reescritos.',
    'reuse.course':
      'Un curso guarda su propio registro de cada versión fijada. Abra el archivo del curso en el creador de cursos para ver qué cambió y actualizarlo.',
    'reuse.use': 'Usar el enlace nuevo',
    'reuse.loading': 'Comprobando…',
    'reuse.failed': 'No se pudo cargar la investigación.',
    'term.h': 'Empezar un periodo nuevo',
    'term.note':
      'Crea esta {what} para un periodo nuevo: un código nuevo, el periodo en el título para que quienes ya la usaron empiecen desde cero, y un enlace nuevo. El enlace y el archivo del periodo pasado no se tocan.',
    'term.what.activity': 'actividad',
    'term.what.course': 'curso',
    'term.label': 'Periodo',
    'term.was': 'El periodo pasado, si está ahora en el título (opcional)',
    'term.go': 'Empezar el periodo nuevo',
    'term.save': 'Guardar el archivo del curso nuevo',
    'term.done.activity':
      'Periodo nuevo, {term}: el enlace, el código, la hoja y las notas de plataforma de arriba son para él.',
    'term.done.course':
      'Periodo nuevo, {term}: el enlace, la hoja y las notas de plataforma de arriba son para él.',
    'handout.open': 'Para empezar',
    'handout.scan': 'Escanee el código, o escriba esta dirección:',
    'handout.do.activity': 'Qué hacer ({steps} pasos)',
    'handout.do.course': 'Qué hay en este curso',
    'handout.name': 'En su informe, escriba esto donde pide su nombre: {hint}.',
    'handout.name.free': 'En su informe, escriba su nombre donde lo pide.',
    'handout.class': 'Código de clase: {code}.',
    'handout.finish': 'Al terminar',
    'handout.finish.text':
      'Abra su informe de laboratorio, guárdelo como PDF y entregue ese PDF como le indicó su docente. Sus respuestas viajan dentro del PDF; no hace falta enviar nada más. Su trabajo se queda en su propio navegador hasta entonces.',
    'handout.minutes': 'unos {n} minutos',
    'paste.activity':
      'Abra la actividad aquí: {link} Complete los pasos. Al terminar, abra su informe de laboratorio, guárdelo como PDF y entregue ese PDF. {name}',
    'paste.course':
      'Abra el curso aquí: {link} Cada elemento tiene su propio enlace. Al terminar una actividad, abra su informe de laboratorio, guárdelo como PDF y entregue ese PDF. {name}',
    'paste.name': 'En el informe, escriba {hint} donde pide su nombre.',
    'paste.name.free': 'En el informe, escriba su nombre donde lo pide.',
    'item.lesson': 'Investigación: {title}',
    'item.assignment': 'Actividad: {title}',
    'item.scenario': 'Simulación: {title}',
    'item.dataset': 'Datos: {title}',
    'item.guide': 'Investigación de laboratorio: {title}',
    'item.reading': 'Lectura: {title}',
  },
};

/** Translate by id with {name} placeholders; English, then the id, as fallback. */
export function tr(locale, id, vars) {
  const entry = WORDS[locale]?.[id] ?? WORDS.en[id];
  if (entry === undefined) return id;
  return vars
    ? entry.replace(/\{(\w+)\}/g, (w, k) =>
        Object.hasOwn(vars, k) ? String(vars[k]) : w
      )
    : entry;
}
