// =============================================================================
// The words of adapting an activity (Prompt 175)
// -----------------------------------------------------------------------------
// ./adapt.js is pure and imports no words. The two pages that show them - the
// builder and the page that opens an adapted or out-of-date activity - load
// both languages through this, once, so a switch of language mid-page has what
// it needs. The refusals of ./adapt.js are one message each, named by rule and
// what is wrong (adapt.problem.<rule>.<why>).
// =============================================================================

import { registerMessages, t } from '../i18n/index.js';

let loading = null;

/** @returns {Promise<void>} Resolves when both languages are registered */
export function ensureAdaptMessages() {
  loading ??= Promise.all([
    import('../i18n/en.adapt.js'),
    import('../i18n/es.adapt.js'),
  ])
    .then(([en, es]) => {
      registerMessages('en', en.EN_ADAPT);
      registerMessages('es', es.ES_ADAPT);
    })
    .catch(err => {
      loading = null;
      throw err;
    });
  return loading;
}

/**
 * One refusal of ./adapt.js, in words that name the step and the step it needs.
 * @param {{rule: string, step?: string, needsTitle?: string}} problem
 * @param {(sid: string) => string} title - A step's title from its sid
 * @returns {string} One sentence
 */
export function problemText(problem, title) {
  const step = problem.step ?? title(problem.sid);
  const needs =
    problem.needsTitle ?? (problem.needs ? title(problem.needs) : '');
  const key =
    problem.rule === 'depth'
      ? 'adapt.problem.depth'
      : `adapt.problem.${problem.rule}.${problem.why}`;
  return t(key, { step, needs });
}
