// =============================================================================
// What a guide and a key are made from, in one language
// -----------------------------------------------------------------------------
// Prompt 79. The instructor prose has an English original (instructorContent.js,
// instructorFlow.js, instructorExpectations.js) and, where somebody has
// translated it, a Spanish shadow beside each (*.es.js). A shadow carries only
// the words it has: a string it lacks prints in English, and the count of what
// was and was not translated is the "translation status" the Spanish documents
// print and the portal lists, so a half-translated guide says so instead of
// passing for a finished one.
//
// Shadows align the way the lesson shadows do (data/investigations/i18n.js):
// arrays by index, records by key. The flow and the expectations are keyed by
// step sid, which is not an index.
//
// Not imported by any route; the build, the tests and the portal's on-demand key
// read it.
// =============================================================================
import {
  mergeTranslation,
  translationCoverage,
} from './data/investigations/i18n.js';
import { INSTRUCTOR_CONTENT } from './data/instructorContent.js';
import { INSTRUCTOR_CONTENT_ES } from './data/instructorContent.es.js';
import flows from './data/instructorFlow.js';
import flowsEs from './data/instructorFlow.es.js';
import expectationsEs from './data/instructorExpectations.es.js';
import { flowFor } from './instructorFlow.js';
import { expectationsFor } from './instructorExpectations.js';

const tally = (strings, shadow = {}) => {
  let translated = 0;
  for (const key of Object.keys(strings))
    if (typeof shadow[key] === 'string' && shadow[key].trim()) translated++;
  return { translated, total: Object.keys(strings).length };
};

/**
 * Everything the guide and the key print that an instructor wrote, in a language.
 *
 * @param {{id: string, steps: Array<{sid: string}>}} inv - The investigation
 *   as the key reads it (its steps decide the printed ranges)
 * @param {string} [locale] - 'en' or 'es'
 * @param {{content?: object, flow?: object, expectations?: object}} [from] -
 *   a pack's own record to read instead of the shipped ones
 * @returns {{content: object|null, flow: Array<{steps: string, text: string}>,
 *   expectations: Record<string, string>, status: {guide: {translated: number,
 *   total: number}, expectations: {translated: number, total: number}}}}
 */
export function guideSource(inv, locale = 'en', from = {}) {
  const base = from.content ?? INSTRUCTOR_CONTENT[inv.id] ?? null;
  const spanish = locale === 'es';
  const shadow = spanish ? (INSTRUCTOR_CONTENT_ES[inv.id] ?? null) : null;
  const content = base && shadow ? mergeTranslation(base, shadow) : base;

  const blocks = flowFor(inv, from.flow ?? flows);
  const flowWords = spanish ? (flowsEs.lessons[inv.id] ?? {}) : {};
  const flow = blocks.map(b => ({
    from: b.from,
    steps: b.first === b.last ? String(b.first) : `${b.first}-${b.last}`,
    first: b.first,
    last: b.last,
    text: flowWords[b.from] || b.text,
  }));

  const expectationsBase = expectationsFor(inv, from.expectations);
  const expectationWords = spanish
    ? (expectationsEs.lessons[inv.id] ?? {})
    : {};
  const expectations = Object.fromEntries(
    Object.entries(expectationsBase).map(([sid, text]) => [
      sid,
      expectationWords[sid] || text,
    ])
  );

  const prose = base
    ? translationCoverage(base, shadow ?? undefined)
    : { translated: 0, total: 0 };
  const blocksTally = tally(
    Object.fromEntries(blocks.map(b => [b.from, b.text])),
    flowWords
  );
  return {
    content,
    flow,
    expectations,
    status: {
      guide: {
        translated: prose.translated + blocksTally.translated,
        total: prose.total + blocksTally.total,
      },
      expectations: tally(expectationsBase, expectationWords),
    },
  };
}
