// =============================================================================
// The name of the file a student hands in
// -----------------------------------------------------------------------------
// One function, used by the finish flow (js/investigations/finish.js: the PDF,
// the web page and the token text are all saved under it), by the finish
// dialog's sentence that says the name, and by the instructor kit's handout, so
// the three cannot say different things. It depends on the typed name and the
// investigation's id and on nothing else: not the language, not the date.
//
// Letters with a mark lose the mark ("Zoë" is "zoe"), because a file name is
// ASCII on a course platform and dropping the letter ("zo") made two different
// students' files look alike. A name with no Latin letters or digits at all
// ("李雷") has no stem, so the file is named "report".
// =============================================================================

/** The part of the file name that comes from the typed name: lower-case words joined by hyphens. */
export const nameStem = name =>
  String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'report';

/** What the three files share: the typed name, then the investigation's id. */
export const handInStem = (name, lessonId) => `${nameStem(name)}-${lessonId}`;

/**
 * The file to hand in, or its two companions.
 * @param {string} name - The name typed in the finish dialog
 * @param {string} lessonId - The investigation's id
 * @param {'pdf'|'html'|'token'} [kind] - The PDF (the file to hand in), the web page or the token as text
 * @returns {string} The file name
 */
export const handInName = (name, lessonId, kind = 'pdf') =>
  `${handInStem(name, lessonId)}${kind === 'token' ? '-token.txt' : `.${kind}`}`;
