// =============================================================================
// The lesson as a whole: the opening and medium rule, checked
// -----------------------------------------------------------------------------
// A lesson that states `question` opens with it: the first sentence of its
// first step is the question, and the second says what the student will do and
// with what, naming the lesson's `medium`. The medium is the one place the
// answer can be seen, `{ kind, name }`:
//   scene       the live view, where the dynamics answer it
//   instrument  an instrument's readout, plot or table
//   image       a picture the student marks and measures
//   data        a dataset the student reads
// A scene medium needs the scene in force where the student first acts (the
// canvas mode of js/lesson/canvasKind.js, which the medium never sets). The
// ending is js/lesson/opening.js. docs/lesson-opening-and-ending.md is the rule
// as tried. Tooling only: the app never loads this file.
// =============================================================================

import { canvasAt } from '../../js/lesson/canvasKind.js';
import { plain } from '../../js/lesson/opening.js';

export const MEDIA = Object.freeze(['scene', 'instrument', 'image', 'data']);

/** The first `n` sentences of a body, as plain text. */
export function sentences(html, n = 2) {
  const text = plain(html);
  return text ? text.split(/(?<=[.?!])\s+/).slice(0, n) : [];
}

/** The index of the first step that asks the student to do something. */
export const firstAction = inv =>
  (inv?.steps || []).findIndex(s => s.type !== 'read');

/**
 * What is wrong with a lesson's opening and medium, one sentence per problem.
 * A lesson that states neither `question` nor `medium` has none: the rule is
 * opt-in until the content prompts carry it to every lesson.
 * @param {object} inv - The lesson, in either language
 * @returns {Array<string>}
 */
export function openingProblems(inv) {
  const out = [];
  if (!inv?.question && !inv?.medium) return out;
  if (!inv.question) out.push('a lesson with a medium states its `question`');
  if (!inv.medium) out.push('a lesson with a question states its `medium`');
  const [first, second] = sentences(inv.steps?.[0]?.body);
  if (inv.question) {
    if (!/\?$/.test(plain(inv.question)))
      out.push('the question ends with a question mark');
    if (first !== plain(inv.question))
      out.push(
        `the first sentence of the first step is the question (it is "${first ?? ''}")`
      );
  }
  const m = inv.medium;
  if (m) {
    if (!MEDIA.includes(m.kind))
      out.push(`medium "${m.kind}" is not one of ${MEDIA.join(', ')}`);
    if (!m.name)
      out.push('the medium has a `name`, the words the student reads');
    else if (!second || !second.toLowerCase().includes(m.name.toLowerCase()))
      out.push(
        `the second sentence of the first step names the medium ("${m.name}")`
      );
    const at = firstAction(inv);
    const s = inv.steps?.[at];
    const c = at >= 0 ? canvasAt(inv, at) : null;
    const staged = (inv.steps || [])
      .slice(0, at + 1)
      .some(x => x.setup || x.stage || x.bind);
    if (m.kind === 'scene' && (c ? c.kind !== 'scene' : !staged))
      out.push(
        `a scene medium needs the scene in force where the student first acts (${s?.sid ?? 'no action step'} has ${c ? `a ${c.kind} canvas` : 'nothing staged'})`
      );
  }
  return out;
}
