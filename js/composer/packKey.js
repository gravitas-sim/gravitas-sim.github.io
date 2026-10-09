// =============================================================================
// An answer key from a pack, in the browser
// -----------------------------------------------------------------------------
// Prompt 79 (INSTRUCTOR_MATERIALS.md). The author holds the pack, so printing
// its key needs no passphrase and nothing leaves the page: the pack is
// checked and compiled as the composer does, and the key is laid out by the
// same module the generator uses (js/answerKeyDocument.js), so the format is
// the shipped keys', in either language, with the translation status.
//
// A remix prints the original's expectations by reference: what an instructor
// should see at a step is the original's, keyed by step id, and a step the
// author added has none. Loaded only when a key is asked for.
//
// The page that asks has already checked and compiled the pack, so it hands the
// result in (with collectTexts(pack)) rather than this module importing the
// checker: a lazy module that shares one with the page's own bundle makes the
// build hoist it into a chunk every visit downloads (tools/route-budgets.json).
// =============================================================================

import { mergeTranslation } from '../data/investigations/i18n.js';

/**
 * The key for a pack, as a PDF.
 *
 * @param {object} pack - An investigation pack that checked
 * @param {{lesson: object, shadow: ?object}} compiled - What checking it made
 * @param {Array<{status: string}>} texts - collectTexts(pack)
 * @param {object} [options]
 * @param {string} [options.locale] - 'en' or 'es'
 * @param {string} [options.version] - The stamp in the footer
 * @returns {Promise<{bytes: Uint8Array, status: ?object}>} `status` is the
 *   Spanish translation status (null for English)
 */
export async function packKey(
  pack,
  { lesson, shadow },
  texts,
  { locale = 'en', version = '' } = {}
) {
  const spanish = locale === 'es';
  const inv = spanish && shadow ? mergeTranslation(lesson, shadow) : lesson;

  // The original's, by reference, for a remix.
  const from = pack.derivedFrom?.id;
  let expectations = {};
  let words = {};
  if (from) {
    const [{ default: shipped }, { default: translated }] = await Promise.all([
      import('../data/instructorExpectations.js'),
      import('../data/instructorExpectations.es.js'),
    ]);
    const mine = new Set(lesson.steps.map(s => s.sid));
    const pick = o =>
      Object.fromEntries(
        Object.entries(o ?? {}).filter(([sid]) => mine.has(sid))
      );
    expectations = pick(shipped.lessons?.[from]);
    words = spanish ? pick(translated.lessons?.[from]) : {};
  }
  const printed = Object.fromEntries(
    Object.entries(expectations).map(([sid, text]) => [sid, words[sid] || text])
  );

  let status = null;
  if (spanish) {
    const lessonTally = {
      translated: texts.filter(x => x.status === 'done').length,
      total: texts.length,
    };
    const expected = {
      translated: Object.keys(expectations).filter(s => words[s]).length,
      total: Object.keys(expectations).length,
    };
    status = {
      lesson: lessonTally,
      guide: { translated: 0, total: 0 },
      expectations: expected,
      done: lessonTally.translated + expected.translated,
      total: lessonTally.total + expected.total,
    };
  }
  const { answerKeyDocument } = await import('../answerKeyDocument.js');
  const bytes = answerKeyDocument(inv, {
    version: version || `${pack.id} ${pack.version}`,
    locale,
    source: { expectations: printed },
    status,
  });
  return { bytes, status };
}

/**
 * Make the key and hand it to the browser as a download.
 * @returns {Promise<boolean>} True
 */
export async function saveKey(pack, compiled, texts, locale) {
  const got = await packKey(pack, compiled, texts, { locale });
  const url = URL.createObjectURL(
    new Blob([got.bytes], { type: 'application/pdf' })
  );
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${pack.id}-key-${locale}.pdf`,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
