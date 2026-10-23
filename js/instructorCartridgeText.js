// =============================================================================
// The words of the Common Cartridge export, in both languages, and its import
// status (an instructor module, Roadmap III Prompt 169)
// -----------------------------------------------------------------------------
// Two readers of one table: the cartridge's own text (what a platform shows for
// a module and a link) and the panel on the course builder and the kit. They
// are instructor surfaces whose output is written once, so the words live here
// as two tables read by id (as js/instructorTermText.js and js/teach/kitText.js
// do) and not in the catalogs, whose cost every visitor to the builder pays.
// `tr(locale, id, vars)` is the only reader; tests/commonCartridge.test.js holds
// the two tables to the same ids.
//
// IMPORT_STATUS is the one record of where an import was seen to work. A row
// is VERIFIED on one of two bases, and says which: an import recorded here (its
// date and what appeared), or a report by the owner (who reported it, where and
// when, and what was not supplied). Nothing is filled in that was not given: a
// report without a date of import, a platform version, the cartridge imported
// or what appeared carries none of them, and the statement says so. A unit
// test, a schema and a specification example are not an import. COURSE_PACKS.md,
// Teach, ADOPTER_GUIDE.md and tools/evidence-status.json carry the same rows,
// and tests/commonCartridge.test.js compares them.
// =============================================================================

/**
 * What the owner's report did not supply. The words are the record's own, and
 * `p.basis` in WORDS.en must equal REPORT_BASIS (the test holds them together).
 */
export const REPORT_BASIS =
  'verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied';

/**
 * One row per learning platform. `status` is 'VERIFIED' or 'NOT VERIFIED'.
 * A VERIFIED row has either `date` and `seen` (an import recorded here: the day
 * and what appeared) or `reported` (the day the owner reported it in chat) and
 * `basis`, with `date` and `seen` null because the report gave neither.
 */
const reported = lms =>
  Object.freeze({
    lms,
    status: 'VERIFIED',
    date: null,
    seen: null,
    reported: '2026-10-22',
    basis: REPORT_BASIS,
  });
export const IMPORT_STATUS = Object.freeze([
  reported('Canvas'),
  reported('Moodle'),
  reported('D2L'),
  reported('Blackboard'),
]);

/** What a row says in a language ("Canvas: NOT VERIFIED", or verified, with its date or its report). */
function row(r, locale) {
  const es = locale === 'es';
  if (r.status !== 'VERIFIED')
    return `${r.lms}: ${es ? 'SIN VERIFICAR' : 'NOT VERIFIED'}`;
  if (r.date) return `${r.lms}: ${es ? 'VERIFICADO' : 'VERIFIED'} ${r.date}`;
  return es
    ? `${r.lms}: VERIFICADO, informado el ${r.reported}`
    : `${r.lms}: VERIFIED, reported ${r.reported}`;
}

/**
 * What a reader needs beside the statement when any row rests on a report:
 * the date, and what the report did not supply. Empty when none does.
 * @param {'en'|'es'} locale
 * @param {Array} [rows] - IMPORT_STATUS
 * @returns {string}
 */
export function reportCaveat(locale = 'en', rows = IMPORT_STATUS) {
  const r = rows.find(x => x.status === 'VERIFIED' && !x.date && x.reported);
  if (!r) return '';
  return locale === 'es'
    ? `Informado por Carl en el chat el ${r.reported}; no se proporcionaron las versiones de cada plataforma, el cartucho importado ni lo que se importó.`
    : `Reported by Carl in chat on ${r.reported}; the LMS versions, the cartridge imported and what imported were not supplied.`;
}

/**
 * The sentence Teach, the adopter's guide and the panel say, and nothing more:
 * what is exported, and where an import was verified (the table, in one line).
 * @param {'en'|'es'} locale
 * @param {Array} [rows] - IMPORT_STATUS
 * @returns {string}
 */
export function statusStatement(locale = 'en', rows = IMPORT_STATUS) {
  const verified = rows.filter(r => r.status === 'VERIFIED');
  const table = rows.map(r => row(r, locale)).join('; ');
  const where = verified.length
    ? verified.map(r => r.lms).join(', ')
    : locale === 'es'
      ? 'ninguna'
      : 'none';
  return locale === 'es'
    ? `exporta un Thin Common Cartridge; importaciones verificadas en: ${where} (${table})`
    : `exports a Thin Common Cartridge; imports verified on: ${where} (${table})`;
}

export const WORDS = {
  en: {
    // --- Inside the cartridge ----------------------------------------------
    'c.home': 'Course home',
    'c.home.title': 'Course home: {title}',
    'c.home.desc':
      'The whole course as a page, with its paths, times and notes. It opens in Gravitas in a browser tab.',
    'c.guide.title': 'How to run this course (instructors)',
    'c.guide.desc':
      'The course home page, where the instructors’ notes are behind the “Notes for instructors” switch.',
    'c.notes.folder': 'Notes for instructors: {unit}',
    'c.notes.title': 'Notes for instructors: {unit}',
    'c.notes.desc':
      'The course home page, where this unit’s notes are behind the “Notes for instructors” switch.',
    'c.notes.text': 'Notes for instructors, {unit}. {notes}',
    'c.rights':
      'Each link opens Gravitas in a browser. Gravitas is MIT-licensed software and its teaching material is CC BY 4.0; readings and data keep the licences shown with them. Nothing about students is carried, and no grades come back.',
    'c.kind.lesson': 'Investigation',
    'c.kind.assignment': 'Activity',
    'c.kind.scenario': 'Simulation',
    'c.kind.dataset': 'Data',
    'c.kind.guide': '3-D lab',
    'c.kind.reading': 'Reading',
    'c.kind.pack': 'Instructor’s investigation',
    'c.path.intro': 'Optional, introductory.',
    'c.path.advanced': 'Optional, advanced.',
    'c.min': '{n} min',
    'c.minRange': '{lo}–{hi} min',
    'c.hour': '{n} h',
    'c.hourRange': '{lo}–{hi} h',

    // --- The panel -----------------------------------------------------------
    'p.h': 'Export a Common Cartridge',
    'p.lede':
      'Makes a Thin Common Cartridge (a .imscc file) of this course for a learning platform: one module for each unit and one web link for each item, each opening that item in Gravitas. It runs no service, carries nothing about students and does not send grades back.',
    'p.lang':
      'The cartridge’s own words are in {language}, the language of this page.',
    'p.lang.en': 'English',
    'p.lang.es': 'Spanish',
    'p.notes':
      'Put my notes for instructors in the cartridge (a platform that honours the instructor role hides them from students; one that does not will show them)',
    'p.count': '{links} links in {modules} modules.{left}',
    'p.left': ' Left out: {n} with no address a link could carry ({names}).',
    'p.long':
      ' The course home link is {n} characters long; some platforms cut a link that long, and the course file opens on the course home as well.',
    'p.fixFirst': 'This course has problems the builder lists. Fix them first.',
    'p.go': 'Make the cartridge',
    'p.close': 'Close',
    'p.made': 'Saved {file}: {links} links in {modules} modules.',
    'p.failed': 'The cartridge could not be made ({reason}).',
    'p.status': 'Gravitas {statement}.',
    'p.table.h': 'Where an import has been checked',
    'p.table.note':
      'These rows rest on the owner’s report, not on an import this project recorded or can show. {caveat} The file is also checked against the specification’s schema and rules, which is not an import.',
    'p.table.lms': 'Platform',
    'p.table.status': 'Import',
    'p.table.seen': 'Basis',
    'p.basis': REPORT_BASIS,
    'p.empty': '—',
  },
  es: {
    'c.home': 'Inicio del curso',
    'c.home.title': 'Inicio del curso: {title}',
    'c.home.desc':
      'El curso completo como una página, con sus trayectos, tiempos y notas. Se abre en Gravitas, en una pestaña del navegador.',
    'c.guide.title': 'Cómo dar este curso (docentes)',
    'c.guide.desc':
      'La página de inicio del curso, donde las notas para docentes están detrás del interruptor «Notas para docentes».',
    'c.notes.folder': 'Notas para docentes: {unit}',
    'c.notes.title': 'Notas para docentes: {unit}',
    'c.notes.desc':
      'La página de inicio del curso, donde las notas de esta unidad están detrás del interruptor «Notas para docentes».',
    'c.notes.text': 'Notas para docentes, {unit}. {notes}',
    'c.rights':
      'Cada enlace abre Gravitas en un navegador. Gravitas es software con licencia MIT y su material didáctico es CC BY 4.0; las lecturas y los datos conservan las licencias que se muestran con ellos. No se lleva nada sobre los estudiantes ni se devuelven calificaciones.',
    'c.kind.lesson': 'Investigación',
    'c.kind.assignment': 'Actividad',
    'c.kind.scenario': 'Simulación',
    'c.kind.dataset': 'Datos',
    'c.kind.guide': 'Laboratorio 3D',
    'c.kind.reading': 'Lectura',
    'c.kind.pack': 'Investigación del instructor',
    'c.path.intro': 'Opcional, de introducción.',
    'c.path.advanced': 'Opcional, avanzado.',
    'c.min': '{n} min',
    'c.minRange': '{lo}–{hi} min',
    'c.hour': '{n} h',
    'c.hourRange': '{lo}–{hi} h',

    'p.h': 'Exportar un Common Cartridge',
    'p.lede':
      'Hace un Thin Common Cartridge (un archivo .imscc) de este curso para una plataforma de aprendizaje: un módulo por unidad y un enlace web por elemento, cada uno abre ese elemento en Gravitas. No ejecuta ningún servicio, no lleva nada sobre los estudiantes y no devuelve calificaciones.',
    'p.lang':
      'Las palabras propias del cartucho están en {language}, el idioma de esta página.',
    'p.lang.en': 'inglés',
    'p.lang.es': 'español',
    'p.notes':
      'Poner mis notas para docentes en el cartucho (una plataforma que respeta el rol de docente se las oculta a los estudiantes; una que no, se las mostrará)',
    'p.count': '{links} enlaces en {modules} módulos.{left}',
    'p.left':
      ' Quedan fuera: {n} sin una dirección que un enlace pueda llevar ({names}).',
    'p.long':
      ' El enlace al inicio del curso tiene {n} caracteres; algunas plataformas cortan un enlace tan largo, y el archivo del curso también abre el inicio del curso.',
    'p.fixFirst':
      'Este curso tiene problemas que el constructor enumera. Corríjalos primero.',
    'p.go': 'Hacer el cartucho',
    'p.close': 'Cerrar',
    'p.made': 'Se guardó {file}: {links} enlaces en {modules} módulos.',
    'p.failed': 'No se pudo hacer el cartucho ({reason}).',
    'p.status': 'Gravitas {statement}.',
    'p.table.h': 'Dónde se ha comprobado una importación',
    'p.table.note':
      'Estas filas se apoyan en el informe del propietario, no en una importación que este proyecto registrara o pueda mostrar. {caveat} El archivo también se comprueba contra el esquema y las reglas de la especificación, lo cual no es una importación.',
    'p.table.lms': 'Plataforma',
    'p.table.status': 'Importación',
    'p.table.seen': 'Fundamento',
    'p.basis':
      'verificado por Carl, informado en el chat el 2026-10-22; no se proporcionaron las versiones de cada plataforma, el cartucho importado ni lo que se importó',
    'p.empty': '—',
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
