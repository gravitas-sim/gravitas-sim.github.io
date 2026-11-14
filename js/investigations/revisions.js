// =============================================================================
// A shipped step that was revised, replaced or retired
// -----------------------------------------------------------------------------
// Saved work is keyed by a step's permanent id, and an id is a promise that the
// task is the same. When a task changes the step gets a new id, and the old one
// goes into the owner's `retired` map (a lesson, or one guide of the 3-D lab,
// the mission lab or the Observatory):
//
//   retired: { 'old-id': { to: 'new-id' | null, release: '3.1',
//              was: { en: 'what it asked', es: 'lo que preguntaba' } } }
//
// `to` is a step the owner has now (null: removed; the author check holds it),
// so a reader looks the id up directly. Pure, and loaded only when something
// was revised. The author rule is in CONTRIBUTING_CONTENT.md.
// =============================================================================

/** What a retired step asked, in the reader's language ('' when unknown). */
export const wasIn = (was, locale = 'en') =>
  (typeof was === 'string' ? was : was?.[locale] || was?.en) || '';

const NOT_AN_ANSWER = /^(shown|locale|tool:|help|hint)|:locale$/;
const text = v =>
  v === undefined || v === null
    ? ''
    : typeof v === 'object'
      ? JSON.stringify(v)
      : String(v).trim();

/** A lesson's response table by step: `<lesson>:<sid>[:<sub>]` -> {value, sub}. */
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

/** What was typed or chosen under one step, as a line of text. */
export function answerText({ value, sub }) {
  if (text(value)) return text(value);
  return Object.entries(sub)
    .filter(([k, v]) => !NOT_AN_ANSWER.test(k) && text(v))
    .map(([k, v]) => `${k}=${text(v)}`)
    .join('; ');
}

/**
 * The saved answers of a lesson that belong to steps it no longer has, each
 * with where it went. An id in no `retired` map is kept too (`known` false):
 * saved work is never dropped, only never marked.
 *
 * @param {object} lesson - The merged lesson, with its `retired` map
 * @param {object} table - Stored responses
 * @returns {Array<{id: string, text: string, to: ?string, release: string,
 *   was: *, known: boolean}>} One per step with an answer
 */
export function earlierAnswers(lesson, table) {
  const live = new Set((lesson?.steps || []).map(s => s?.sid));
  const out = [];
  for (const [id, entry] of responsesBySid(lesson?.id, table)) {
    if (live.has(id)) continue;
    const r = lesson?.retired?.[id];
    const t = answerText(entry);
    if (t)
      out.push({
        id,
        text: t,
        to: r?.to ?? null,
        release: r?.release ?? '',
        was: r?.was ?? null,
        known: Boolean(r),
      });
  }
  return out;
}

/** Answers saved under a retired investigation, as earlier answers. */
export const retiredAnswers = (oldId, responses, entry) =>
  [...responsesBySid(oldId, responses)]
    .map(([id, e]) => ({
      id,
      text: answerText(e),
      to: null,
      release: entry?.release ?? '',
      was: null,
      known: false,
    }))
    .filter(r => r.text);
