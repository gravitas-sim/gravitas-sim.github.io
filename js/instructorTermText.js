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
