// =============================================================================
// The default short route through any investigation
// -----------------------------------------------------------------------------
// Roadmap II, Prompt 97. An instructor with one class period wants "the shortest
// thing that is still the whole cycle", and most investigations have no
// hand-authored cut. This derives one, deterministically, from the steps
// themselves, and hands it to the assignment builder (?assign=<id>&route=short)
// as a starting selection. The builder then adds whatever the chosen steps need
// (resolveSelection), so the result is an ordinary assignment: the same runner,
// progress and printable page, and nothing to keep in step with the lesson.
//
// The rule: at the core depth, the first prediction, the first measurement or
// exploration, the first numeric question, the first choice and the first
// written explanation, each only if the lesson has one; then the setup steps
// they need. The minutes are an ESTIMATE from the step types, as the activities'
// are (js/data/activities.js), and are labelled as one wherever shown.
// =============================================================================

import { resolveSelection } from './assignment.js';

/** Minutes a step takes by what the student does there (the composer's allowances). */
const ACT = { read: 0.5, explore: 2, measure: 3, predict: 1, question: 0.25 };

/** The longest a short route may be estimated to take. */
export const SHORT_ROUTE_MAX = 25;

const words = s =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

/** A step's estimated minutes: words at 300 a minute plus its allowance. */
export const stepMinutes = s =>
  (words(s.title) + words(s.body) + words(s.prompt)) / 300 + (ACT[s.type] ?? 0);

const KINDS = [
  s => s.type === 'predict',
  s => s.type === 'measure' || s.type === 'explore',
  s => s.type === 'question' && s.kind === 'numeric',
  s => s.type === 'question' && s.kind === 'choice',
  s => s.type === 'question' && s.kind === 'short',
];

/**
 * The short route of a lesson.
 *
 * @param {object} lesson - The merged lesson
 * @returns {{chosen: string[], sids: string[], minutes: number}} The steps
 *   picked, the steps the assignment holds once it has what they need, and an
 *   estimate of how long they take
 */
export function shortRoute(lesson) {
  const core = (lesson?.steps || []).filter(
    s => !s.depth || s.depth === 'core'
  );
  const picks = KINDS.map(is => core.find(s => is(s))).filter(Boolean);
  let chosen = [...new Set(picks.map(s => s.sid))];
  const run = list => {
    const sids = resolveSelection(lesson, list, 'core').sids;
    const by = new Map(core.map(s => [s.sid, s]));
    return {
      sids,
      minutes: Math.round(
        sids.reduce((n, sid) => n + stepMinutes(by.get(sid) || {}), 0)
      ),
    };
  };
  let result = run(chosen);
  // Too long: drop the last kind first, but never the last step standing.
  while (result.minutes > SHORT_ROUTE_MAX && chosen.length > 1) {
    chosen = chosen.slice(0, -1);
    result = run(chosen);
  }
  if (!chosen.length && core.length) {
    chosen = [core[0].sid];
    result = run(chosen);
  }
  return { chosen, ...result };
}
