import { KEY_TERMS } from './names.js';
import { readJson, writeJson } from './storage/local.js';

// The courses a student opened that name a term (Roadmap III Prompt 168).
// An instructor's next-term copy of a course carries a term (Spring 2027); when
// a student opens its link, the course home notes the course and the term here
// so My work can say which term a course was, and two terms are two lines. One
// key, one record, a sidecar like the resume record: a 2.0.0 reader does not know
// the key, so it ignores the whole record and misreads nothing
// (tests/compat/kinds/course-terms.mjs). It holds no answers, no link and no
// name, only the course's id and title, the term and when it was opened; the
// way back to a course is the link the instructor gave. A damaged or foreign
// record reads as empty, and the next write replaces it. js/myWork/model.js
// reads the same record for display with its own few lines, because My work's
// route has no request to spare for this module.
export const TERMS_KEY = KEY_TERMS;
export const TERMS_VERSION = 1;
export const TERMS_MAX = 12;

const words = (v, max) =>
  typeof v === 'string' && v.length > 0 && v.length <= max;

/** One entry, cleaned to the shape the record allows, or null. */
function termEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { id, term, title, at } = raw;
  if (!words(id, 120) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return null;
  if (!words(term, 40)) return null;
  const out = { id, term, at: Number.isFinite(at) ? at : 0 };
  if (title && typeof title === 'object') {
    const t = {};
    for (const l of ['en', 'es']) if (words(title[l], 160)) t[l] = title[l];
    if (t.en) out.title = t;
  }
  return out;
}

/**
 * The courses, newest first, one per course and term.
 * @param {Storage} [store] - Defaults to localStorage
 * @returns {Array<{id: string, term: string, at: number, title?: {en: string, es?: string}}>}
 */
export function readTerms(store) {
  const record = readJson(TERMS_KEY, null, store);
  if (record?.v !== TERMS_VERSION || !Array.isArray(record.courses)) return [];
  const seen = new Set();
  return record.courses
    .map(termEntry)
    .filter(
      c => c && !seen.has(`${c.id}|${c.term}`) && seen.add(`${c.id}|${c.term}`)
    )
    .slice(0, TERMS_MAX);
}

/**
 * Note that a course with a term was opened: it becomes the newest line, and a
 * second term of the same course is a second line.
 * @param {{id: string, term: string, title?: object}} course
 * @param {Storage} [store]
 * @returns {boolean} Whether the browser kept it
 */
export function noteTerm(course, store) {
  const next = termEntry({ at: Date.now(), ...course });
  if (!next) return false;
  const rest = readTerms(store).filter(
    c => !(c.id === next.id && c.term === next.term)
  );
  return writeJson(
    TERMS_KEY,
    { v: TERMS_VERSION, courses: [next, ...rest].slice(0, TERMS_MAX) },
    'preferences',
    store
  );
}
