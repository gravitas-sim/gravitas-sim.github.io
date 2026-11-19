// =============================================================================
// The lesson as a whole: its opening, its medium and its ending (the pure half)
// -----------------------------------------------------------------------------
// A lesson that states `question` opens with it: the first sentence of its
// first step is the question, and the second says what the student will do and
// with what, naming the lesson's `medium`. The medium is the one place the
// answer can be seen, `{ kind, name }`:
//   scene       the live view behind the panel, where the dynamics answer it
//   instrument  an instrument's readout, plot or table
//   image       a picture the student marks and measures
//   data        a dataset the student reads
// A scene medium needs the scene in force where the student first acts (the
// canvas mode of js/lesson/canvasKind.js, which this never sets). The ending
// returns to the question with the student's own answers and readings
// (js/investigations/ending.js draws them). docs/lesson-opening-and-ending.md
// is the rule as tried, and the lessons it was tried on.
// =============================================================================

import { canvasAt } from './canvasKind.js';

export const MEDIA = Object.freeze(['scene', 'instrument', 'image', 'data']);

/** Text without markup, entities or glossary marks, spaces collapsed. */
export const plain = html =>
  String(html ?? '')
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&rsquo;|&lsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&plusmn;/g, '±')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

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

const clip = (text, max = 240) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const source = raw => {
  try {
    const how = JSON.parse(raw);
    return how && typeof how === 'object' ? how : null;
  } catch {
    return null;
  }
};

/**
 * The student's own answers and readings, in lesson order: what the ending
 * shows. Only what the student entered (an option they chose, a number or
 * words they gave, a reading they took) and never a key, a `want` or whether
 * it was right: an answer held by a prediction stays held (D-R10-280-03),
 * and a multiple-choice check is a check, not evidence, so it is left to the
 * report.
 * @param {Array<object>} steps - The steps the student was shown, in order
 * @param {object} responses - The saved answers
 * @param {(step: object) => string} keyOf - A step's response key
 * @returns {Array<{sid: string, title: string, kind: string, text: string, unit?: string, how?: ?object}>}
 */
export function endingRows(steps, responses, keyOf) {
  const rows = [];
  const r = responses || {};
  const said = v => (v === undefined || v === null ? '' : String(v).trim());
  for (const s of steps || []) {
    const key = keyOf(s);
    const title = plain(s.title);
    const base = { sid: s.sid, title };
    if (s.type === 'predict' && s.kind === 'estimate') {
      const raw = said(r[key]);
      if (!raw) continue;
      const parts = raw.split(';').map(p => p.trim());
      rows.push({
        ...base,
        kind: 'estimate',
        text: parts.length === 2 ? parts.join('–') : parts[0],
        unit: s.unit,
      });
    } else if (s.type === 'predict') {
      const at = r[key];
      if (typeof at !== 'number' || !s.options?.[at]) continue;
      rows.push({ ...base, kind: 'prediction', text: plain(s.options[at]) });
    } else if (s.type === 'question' && s.kind === 'numeric') {
      const v = said(r[key]);
      if (v) rows.push({ ...base, kind: 'number', text: v, unit: s.unit });
    } else if (s.type === 'question' && s.kind === 'short') {
      const v = said(r[key]);
      if (v) rows.push({ ...base, kind: 'words', text: clip(v) });
    } else if (s.type === 'measure') {
      for (const f of s.fields || []) {
        const v = said(r[`${key}:${f.id}`]);
        if (!v) continue;
        rows.push({
          ...base,
          kind: 'reading',
          label: plain(f.label),
          text: v,
          unit: f.unit,
          how: source(r[`${key}:${f.id}:src`]),
        });
      }
    }
  }
  return rows;
}
