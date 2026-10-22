// =============================================================================
// A course, or an activity, for the next term
// -----------------------------------------------------------------------------
// Roadmap III Prompt 168. An instructor who ran a course last term wants it
// again, with last term's work kept apart from this term's, and wants to know
// what Gravitas changed underneath in between. Everything here is pure: it
// takes a file and returns a new one, and never changes the one it was given.
//
// What "fresh keys" means here (the two keys a submission is known by)
// -----------------------------------------------------------------------------
// - The assignment id (`i`) is what a report carries and what the review page
//   groups by. It is dated and derived (js/assignments/assignment.js
//   assignmentIdFor), so a new term, on another day or with another title, has a
//   new one and last term's reports never join this term's.
// - The place a student's answers are kept in their browser is a hash of the
//   lesson, the steps and the title (js/investigations/stepView.js
//   keyForAssignment). That rule is unchanged: "a new title is a new activity
//   and re-keys on purpose". So the term is written into the title, in both
//   languages, and a student opening this term's link in the browser they used
//   last term starts clean and keeps last term's answers where they were.
//
// What is not done
// -----------------------------------------------------------------------------
// Nothing is deleted, no student's record is read or changed, and no account,
// roster or server is involved. Last term's links are untouched files: they
// still open exactly what they opened.
// =============================================================================

import { assignmentIdFor, shortHash } from '../assignments/assignment.js';
import { MAX_TERM, itemsOf } from './pack.js';
import { STATUS, reviewCoursePack, upgradeCoursePack } from './review.js';

/** An assignment's title may not be longer than this (assignment.js MAX_TITLE). */
const MAX_TITLE = 120;
const MARKUP = /[<>]|&[a-zA-Z#0-9]+;/;
const clone = v => JSON.parse(JSON.stringify(v));

/**
 * A term label from what an instructor typed: spaces trimmed and collapsed,
 * plain words only.
 * @param {*} raw - The typed text
 * @returns {{ok: true, term: string}|{ok: false, reason: 'empty'|'long'|'markup'}}
 */
export function termLabel(raw) {
  const term = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!term) return { ok: false, reason: 'empty' };
  if (term.length > MAX_TERM) return { ok: false, reason: 'long' };
  if (MARKUP.test(term)) return { ok: false, reason: 'markup' };
  return { ok: true, term };
}

/** The ` (term)` a title carries. */
const suffix = term => ` (${term})`;

/**
 * A title with its term, replacing the last term it carried. A base too long to
 * leave room is cut at a word, so the whole title stays within what an
 * assignment allows.
 * @param {string} text - The title as it is
 * @param {?string} term - The new term, or null for none
 * @param {?string} [was] - The term the title carries now, to take off first
 * @returns {string}
 */
export function titleWithTerm(text, term, was = null) {
  let base = String(text ?? '');
  if (was && base.endsWith(suffix(was)))
    base = base.slice(0, -suffix(was).length);
  if (!term) return base.trim();
  if (!base.trim()) return term;
  const room = MAX_TITLE - suffix(term).length;
  if (base.length > room) {
    const cut = base.slice(0, room);
    base = cut.slice(0, Math.max(cut.lastIndexOf(' '), room >> 1)).trimEnd();
  }
  return `${base}${suffix(term)}`;
}

/** A text pair carrying the term, its Spanish still marked fresh if it was. */
function retitle(item, term, was) {
  const old = item.title && typeof item.title === 'object' ? item.title : null;
  if (!old) {
    if (!term) return;
    item.title = { en: term };
    return;
  }
  const fresh = old.esOf && old.esOf === shortHash(old.en ?? '');
  const next = { ...old, en: titleWithTerm(old.en, term, was) };
  if (typeof old.es === 'string' && old.es)
    next.es = titleWithTerm(old.es, term, was);
  if (fresh) next.esOf = shortHash(next.en);
  item.title = next;
}

/**
 * What a standing means to say to an instructor, as a code: nothing for an
 * item whose pin still holds.
 */
const moved = standing =>
  standing.status !== STATUS.SAME ||
  standing.detail?.changedSteps?.length ||
  standing.detail?.missingSteps?.length;

/**
 * A copy of a course for a term (or, with no term, for first use as it comes).
 *
 * Every lesson and assignment is re-pinned to this build, every assignment is
 * given a fresh id and date (and, when a term is named, the term in its title,
 * so its stored answers are a place of their own), and the report says what the
 * re-pin found: which items were not what the course pinned, and which
 * assignments lost or changed a step. The file passed in is not changed.
 *
 * @param {object} pack - A valid /2 course pack
 * @param {object} facts - This build (js/course/api.js courseFacts)
 * @param {{term?: ?string, today: string, newAssignmentId?: Function}} opts
 *   today is `YYYY-MM-DD`; term a label already through termLabel
 * @returns {{pack: object, report: object}} The new pack and what changed:
 *   report.items (one row per pinned item: id, kind, standing, changed steps,
 *   missing steps, result 'same' | 'repinned' | 'refused'), report.rekeyed (each
 *   assignment's old and new id), report.version (from, to), report.bump
 */
export function startTerm(pack, facts, opts) {
  const { term = null, today } = opts;
  const newId =
    opts.newAssignmentId ??
    (item =>
      assignmentIdFor(
        {
          lesson: item.lesson,
          sids: item.steps,
          title: item.title?.en || '',
        },
        new Date(`${today}T12:00:00Z`)
      ));
  const was = pack.term ?? null;
  const before = reviewCoursePack(pack, facts);
  const pinnable = new Set(
    itemsOf(pack)
      .filter(({ item }) =>
        ['lesson', 'assignment', 'pack'].includes(item.kind)
      )
      .map(({ item }) => item.id)
  );
  const upgrade = upgradeCoursePack(pack, facts, pinnable, {
    today,
    newAssignmentId: newId,
  });
  const out = clone(upgrade.pack);
  out.gravitas = facts.platform;
  if (term) out.term = term;
  else delete out.term;

  const rekeyed = [];
  const ids = new Map(
    itemsOf(pack)
      .filter(({ item }) => item.kind === 'assignment')
      .map(({ item }) => [item.id, item.assignment.id])
  );
  for (const { item } of itemsOf(out)) {
    if (item.kind !== 'assignment') continue;
    retitle(item, term, was);
    item.assignment = { id: newId(item), created: today };
    rekeyed.push({
      item: item.id,
      from: ids.get(item.id),
      to: item.assignment.id,
    });
  }

  const upgraded = new Set(upgrade.upgraded);
  const refused = new Set(upgrade.refused);
  const items = before
    .filter(s => pinnable.has(s.id))
    .map(s => ({
      id: s.id,
      kind: s.kind,
      standing: s.status,
      changedSteps: s.detail?.changedSteps ?? [],
      missingSteps: s.detail?.missingSteps ?? [],
      stepsThen: s.detail?.stepsThen ?? null,
      stepsNow: s.detail?.stepsNow ?? null,
      result: refused.has(s.id)
        ? 'refused'
        : upgraded.has(s.id) || moved(s)
          ? 'repinned'
          : 'same',
    }));
  return {
    pack: out,
    report: {
      term,
      items,
      rekeyed,
      version: { from: pack.version, to: out.version },
      bump: upgrade.bump,
      changed: items.filter(i => i.result !== 'same').length,
      refused: [...refused],
    },
  };
}

/**
 * An activity (an assignment payload) for a term: a fresh id and date, and the
 * term in its title so the answers a student keeps are a place of their own.
 * Its steps, fingerprints and package pin are as they were: re-checking them
 * against this build is js/teach/activity.js reuseCheck, which comes first.
 *
 * @param {object} activity - A validated assignment payload
 * @param {?string} term - A label through termLabel, or null
 * @param {Date} [now]
 * @param {?string} [was] - The term the title carries now, to take off first
 * @returns {object} The new payload
 */
export function startActivityTerm(
  activity,
  term,
  now = new Date(),
  was = null
) {
  const t = titleWithTerm(activity.t, term, was);
  const next = {
    ...activity,
    t,
    i: assignmentIdFor({ lesson: activity.l, sids: activity.s, title: t }, now),
    c: now.toISOString().slice(0, 10),
  };
  return next;
}
