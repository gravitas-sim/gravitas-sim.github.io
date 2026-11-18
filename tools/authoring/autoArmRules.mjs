// =============================================================================
// The rule interaction/auto-arm: a step arms its own event watch
// (`pauseAt.auto`, js/investigations/eventWindow.js) only where its question is
// not the moment itself
// -----------------------------------------------------------------------------
// Node-side, handed in through tools/authoring/inputs.mjs like retiredRules.mjs.
// A heuristic, so a reviewer still reads every auto step: it fails a step that
// asks "when" ("cuándo") in its title, body or prompt, in either language, or
// that has a measure field in a unit of time or labelled as a time.
// =============================================================================

import { mergeTranslation } from '../../js/data/investigations/i18n.js';

const ASKS_WHEN = /\b(when|cu[aá]ndo)\b[^.?!]*\?/i;
const TIME_UNIT =
  /^(s|sec|seconds?|min|minutes?|h|hr|hours?|d|days?|yr|years?|[kMG]yr|segundos?|minutos?|horas?|d[ií]as?|a[nñ]os?)$/i;
const TIME_LABEL =
  /\b(time|when|date|epoch|moment|tiempo|cu[aá]ndo|fecha|[eé]poca|momento|instante)\b/i;

/**
 * What is wrong with a lesson's auto-armed steps.
 *
 * @param {object} lesson - A lesson
 * @param {object} [translations] - Locale to lesson id to { data }
 * @returns {Array<{step: number, message: string}>} One per problem
 */
export function autoArmFindings(lesson, translations = {}) {
  const steps = lesson?.steps || [];
  if (!steps.some(s => s?.pauseAt?.auto)) return [];
  const versions = [lesson];
  for (const byLesson of Object.values(translations || {})) {
    const data = byLesson?.[lesson.id]?.data;
    if (data) versions.push(mergeTranslation(lesson, data));
  }
  const out = [];
  steps.forEach((step, i) => {
    if (!step?.pauseAt?.auto) return;
    const at = msg => out.push({ step: i, message: msg });
    for (const v of versions) {
      const s = v.steps?.[i] || {};
      if (
        [s.title, s.body, s.prompt].some(x => ASKS_WHEN.test(String(x ?? '')))
      )
        at('a step that arms its own watch asks when the event happens');
      for (const f of s.fields || []) {
        if (TIME_UNIT.test(String(f.unit ?? '').trim()))
          at(
            `field "${f.id}" is in a unit of time, and the watch is armed for it`
          );
        else if (TIME_LABEL.test(String(f.label ?? '')))
          at(
            `field "${f.id}" is labelled as a time, and the watch is armed for it`
          );
      }
    }
  });
  // One message per step and problem, whichever language found it.
  return out.filter(
    (f, k) =>
      out.findIndex(g => g.step === f.step && g.message === f.message) === k
  );
}
