// =============================================================================
// An Activity or a Course, read from whatever an instructor has
// -----------------------------------------------------------------------------
// The distribution kit (/teaching/kit/) and the submission review page both
// start from the same few things an instructor holds: the student link they
// made, a file they saved from the builder, or a course file. This reads any of
// them into one of two shapes and says why when it cannot. It decodes and
// checks and nothing more; it loads no investigation and writes nothing, so
// both pages can carry it.
//
//   an Activity link     #a1z...   (js/assignments/assignmentLink.js)
//   an Activity file     gravitas.assignment JSON
//   a Course link        #c2z...   (js/course/links.js)
//   a Course file        gravitas.course-pack JSON
//
// Never throws: every caller is handling something a person pasted.
// =============================================================================

import { parseDocument } from '../shareState.js';
import {
  readAssignmentFile,
  readAssignmentLink,
} from '../assignments/assignmentLink.js';
import {
  ASSIGNMENT_KIND,
  BINDING,
  assignmentIdFor,
  shortHash,
  stepBindings,
} from '../assignments/assignment.js';
import { readCourseFragment, assignmentPayload } from '../course/links.js';
import {
  FORMAT as COURSE_FORMAT,
  itemsOf,
  migrateCoursePack,
  validateCoursePack,
} from '../course/pack.js';
import { PLATFORM_API } from '../platform/catalog.generated.js';

/** The largest file or pasted text read: a course pack is well under this. */
export const MAX_SOURCE = 512 * 1024;

const text = (v, locale) => (v && (v[locale] || v.en)) || '';

/** The fragment of a pasted link, or of a bare fragment, or ''. */
export function fragmentOf(input) {
  const s = String(input ?? '').trim();
  if (s.startsWith('#')) return s;
  try {
    return new URL(s).hash;
  } catch {
    return '';
  }
}

/** The class code a pasted Activity link carries (?roster=), or null. */
export function rosterOf(input) {
  try {
    return new URL(String(input ?? '').trim()).searchParams.get('roster');
  } catch {
    return null;
  }
}

/**
 * Read what was handed in.
 *
 * @param {string} input - A link, a bare fragment, or the text of a file
 * @returns {Promise<{ok: true, kind: 'activity', activity: object}
 *   | {ok: true, kind: 'course', pack: object}
 *   | {ok: false, reason: string, detail: ?object}>} The thing, or the reason
 */
export async function readSource(input) {
  const raw = String(input ?? '');
  if (raw.length > MAX_SOURCE)
    return { ok: false, reason: 'tooLarge', detail: null };
  const hash = fragmentOf(raw);
  if (/^#a\d+[zr]/.test(hash)) {
    const r = await readAssignmentLink(hash);
    return r.ok
      ? { ok: true, kind: 'activity', activity: r.assignment }
      : { ok: false, reason: r.reason, detail: r.detail };
  }
  if (/^#c\d+[zr]/.test(hash)) {
    let pack;
    try {
      pack = await readCourseFragment(hash);
    } catch (err) {
      return {
        ok: false,
        reason: String(err?.message || 'corrupt'),
        detail: null,
      };
    }
    return checkedPack(pack);
  }
  let data;
  try {
    data = parseDocument(raw.trim(), true);
  } catch {
    return { ok: false, reason: 'notJson', detail: null };
  }
  if (data?.k === ASSIGNMENT_KIND) {
    const r = readAssignmentFile(raw.trim());
    return r.ok
      ? { ok: true, kind: 'activity', activity: r.assignment }
      : { ok: false, reason: r.reason, detail: r.detail };
  }
  if (data?.format === COURSE_FORMAT) return checkedPack(data);
  return { ok: false, reason: 'unknownKind', detail: null };
}

function checkedPack(raw) {
  const pack = migrateCoursePack(raw, { platform: PLATFORM_API });
  const errors = validateCoursePack(pack, { locales: ['en', 'es'] });
  if (errors.length)
    return {
      ok: false,
      reason: 'badCourse',
      detail: { message: `${errors[0].path}: ${errors[0].message}` },
    };
  return { ok: true, kind: 'course', pack };
}

/**
 * The Activities a source holds, as the review page names them: an Activity
 * file is one; a Course holds one per assignment item, with its unit.
 *
 * @param {object} source - From readSource()
 * @param {string} [locale] - Which language's title and words to take
 * @returns {Array<{id: string, title: string, lessonId: string, steps: number,
 *   course: ?string, unit: ?string}>}
 */
export function activitiesOf(source, locale = 'en') {
  if (source.kind === 'activity') {
    const a = source.activity;
    return [
      {
        id: a.i,
        title: a.t || a.l,
        lessonId: a.l,
        steps: a.s.length,
        course: null,
        unit: null,
      },
    ];
  }
  const course = text(source.pack.title, locale);
  return itemsOf(source.pack)
    .filter(({ item }) => item.kind === 'assignment' && item.assignment?.id)
    .map(({ item, unit }) => {
      const p = assignmentPayload(item, locale);
      return {
        id: p.i,
        title: p.t || p.l,
        lessonId: p.l,
        steps: p.s.length,
        course,
        unit: text(unit.title, locale),
      };
    });
}

/**
 * How an Activity's steps stand against an investigation as it is now, and
 * the Activity that would replace it if the instructor re-issues it.
 *
 * Re-issuing keeps the steps still there, drops the ones that are gone,
 * re-pins every one to the step as it is, and gives the Activity a new id and
 * date: its old id names a place in each student's browser holding answers to
 * the steps as they were, and those answers must not attach to the new ones.
 * (The same rule the course builder's reviewed upgrade follows, COURSE_PACKS.md.)
 *
 * @param {object} activity - A validated payload
 * @param {object} lesson - The investigation, loaded now
 * @param {Function} fingerprint - stepFingerprint
 * @param {?{id: string, version: string}} provider - lessonProvider(lesson.id)
 * @param {Date} [now] - For the new id and date
 * @returns {{present: number, changed: number, missing: number, clean: boolean,
 *   bindings: Array<object>, reissued: ?object}}
 */
export function reuseCheck(
  activity,
  lesson,
  fingerprint,
  provider,
  now = new Date()
) {
  const r = stepBindings(activity, lesson, fingerprint);
  const keep = r.bindings.filter(b => b.status !== BINDING.MISSING);
  const reissued = keep.length
    ? {
        ...activity,
        i: assignmentIdFor(
          { lesson: lesson.id, sids: keep.map(b => b.sid), title: activity.t },
          now
        ),
        s: keep.map(b => b.sid),
        f: keep.map(b => shortHash(fingerprint(b.step))),
        c: now.toISOString().slice(0, 10),
        v: provider || (activity.d && activity.d !== 'core') ? 2 : 1,
      }
    : null;
  if (reissued) {
    if (provider) reissued.p = [provider.id, provider.version];
    else delete reissued.p;
  }
  return {
    present: r.present,
    changed: r.changed,
    missing: r.missing,
    clean: r.changed === 0 && r.missing === 0,
    bindings: r.bindings,
    reissued,
  };
}
