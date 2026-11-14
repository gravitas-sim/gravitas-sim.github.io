// =============================================================================
// A shipped step that was revised, replaced or retired
// -----------------------------------------------------------------------------
// Saved work is keyed by a step's permanent id, and the id is a promise about
// the question: the same id is the same task. When a task changes, the step gets
// a new id and the old one is written into the owner's `retired` map (a lesson,
// or one guide of the 3-D lab, the mission lab or the Observatory):
//
//   retired: { 'old-id': { to: 'new-id' | null, release: '3.1',
//              was: { en: 'what it asked', es: 'lo que preguntaba' } } }
//
// `to` is the step that replaced it (or null: the step was removed), `release`
// is the first release without it, and `was` says what it asked in both
// languages, because the old question is gone from the lesson and an answer
// needs its question.
//
// Everything here is pure. A reader asks which saved answers belong to ids the
// owner no longer has and gets them back with where each went; none of it is
// ever marked against a new step's key. CONTRIBUTING_CONTENT.md has the rule an
// author follows; tools/revisions.mjs checks the maps and writes the record.
// =============================================================================

const HOPS = 16;

/** @param {?object} owner - A lesson or a guide @returns {object} Its retired map */
export const retiredOf = owner => {
  const r = owner?.retired;
  return r && typeof r === 'object' && !Array.isArray(r) ? r : {};
};

/**
 * Where a retired id went.
 *
 * Follows a successor that was itself retired later, and gives up (`to` null)
 * at a cycle or at an id that is not live.
 *
 * @param {?object} owner - A lesson or a guide
 * @param {string} id - The old id
 * @param {?Set<string>} [live] - The ids it can land on
 * @returns {?{to: ?string, release: string, was: *}} Null when not retired
 */
export function successorOf(owner, id, live = null) {
  const r = retiredOf(owner);
  const first = r[id];
  if (!first || typeof first !== 'object') return null;
  let to = first.to ?? null;
  for (let i = 0; to && r[to] && i < HOPS; i++) to = r[to].to ?? null;
  if (to && (r[to] || (live && !live.has(to)))) to = null;
  return { to, release: first.release || '', was: first.was ?? null };
}

/**
 * What a retired step asked, in the reader's language.
 *
 * @param {?{en: string, es: string}|string} was - A `was` field
 * @param {string} [locale] - 'en' or 'es'
 * @returns {string} The phrase, or '' when there is none
 */
export const wasIn = (was, locale = 'en') =>
  (typeof was === 'string' ? was : was?.[locale] || was?.en) || '';

/**
 * Saved answers whose id the owner no longer has, each with where it went.
 *
 * An id that is in no `retired` map is kept and reported too (`known` false):
 * saved work is never dropped, only never marked.
 *
 * @param {?object} owner - A lesson or a guide
 * @param {Set<string>} live - The ids it has now
 * @param {Iterable<[string, *]>} entries - [id, saved value]
 * @returns {Array<{id: string, value: *, to: ?string, release: string,
 *   was: *, known: boolean}>} The earlier answers, in the order given
 */
export function earlierOf(owner, live, entries) {
  const out = [];
  for (const [id, value] of entries) {
    if (live.has(id)) continue;
    const s = successorOf(owner, id, live);
    out.push({
      id,
      value,
      to: s?.to ?? null,
      release: s?.release ?? '',
      was: s?.was ?? null,
      known: Boolean(s),
    });
  }
  return out;
}

/**
 * Ids named by something saved elsewhere (an activity format, a pin), resolved
 * against the owner as it is now: a retired id becomes its successor, or is
 * left out when there is none, and each change is returned as a note.
 *
 * @param {?object} owner - A lesson or a guide
 * @param {Array<string>} ids - The ids as written
 * @param {Set<string>} live - The ids the owner has now
 * @returns {{ids: Array<string>, notes: Array<{id: string, to: ?string,
 *   release: string, was: *}>}} The ids to use, and what changed
 */
export function resolveIds(owner, ids, live) {
  const out = [];
  const notes = [];
  for (const id of ids) {
    const s = live.has(id) ? null : successorOf(owner, id, live);
    if (!s) {
      out.push(id);
      continue;
    }
    notes.push({ id, ...s });
    if (s.to && !out.includes(s.to)) out.push(s.to);
  }
  return { ids: out, notes };
}

/** The ids a lesson has now. */
export const liveSids = lesson =>
  new Set((lesson?.steps || []).map(s => s?.sid));

/**
 * A lesson's response table, by step: `<lesson>:<sid>` is the answer and
 * `<lesson>:<sid>:<sub>` hangs off it (a measure field, `locale`, `shown`).
 *
 * @param {string} lessonId - The lesson
 * @param {object} table - Stored responses
 * @returns {Map<string, {value: *, sub: object}>} By sid
 */
export function responsesBySid(lessonId, table) {
  const out = new Map();
  const prefix = `${lessonId}:`;
  for (const [key, value] of Object.entries(table || {})) {
    if (!key.startsWith(prefix)) continue;
    const [sid, ...rest] = key.slice(prefix.length).split(':');
    const entry = out.get(sid) || { value: undefined, sub: {} };
    if (rest.length) entry.sub[rest.join(':')] = value;
    else entry.value = value;
    out.set(sid, entry);
  }
  return out;
}

const NOT_AN_ANSWER = /^(shown|locale|tool:|help|hint)|:locale$/;

/**
 * What a student typed or chose under one step, as one line of text.
 *
 * @param {{value: *, sub: object}} entry - From responsesBySid
 * @returns {string} The answer, or '' when there is none
 */
export function answerText({ value, sub }) {
  const text = v =>
    v === undefined || v === null
      ? ''
      : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v).trim();
  if (text(value)) return text(value);
  return Object.entries(sub)
    .filter(([k, v]) => !NOT_AN_ANSWER.test(k) && text(v))
    .map(([k, v]) => `${k}=${text(v)}`)
    .join('; ');
}

/**
 * The saved answers of a lesson that belong to steps it no longer has.
 *
 * @param {object} lesson - The merged lesson, with its `retired` map
 * @param {object} table - Stored responses
 * @returns {Array<{id: string, text: string, to: ?string, release: string,
 *   was: *, known: boolean}>} One per step, with its answer as text
 */
export function earlierAnswers(lesson, table) {
  const entries = [...responsesBySid(lesson?.id, table)];
  return earlierOf(
    lesson,
    liveSids(lesson),
    entries.map(([sid, e]) => [sid, e])
  )
    .map(({ value, ...rest }) => ({ ...rest, text: answerText(value) }))
    .filter(e => e.text);
}
