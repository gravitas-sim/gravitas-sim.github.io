// =============================================================================
// gravitas.course-pack/1: a sequence of existing lessons, as data
// -----------------------------------------------------------------------------
// A course pack is the declarative lesson extension Gravitas can support
// today. A lesson itself cannot be declarative yet - lessons carry functions
// (validate, probe), and a JSON-only lesson schema is later work
// (PLATFORM_PACKAGE_RFC.md) - but an ordering of lessons Gravitas already has,
// grouped into units, with a title, notes for the teacher and the student, and
// every string in every locale the pack declares, is content only. It names
// lessons by their public id and nothing else: no code, no URLs, no markup.
//
// What it is not: installable. Gravitas does not yet read course packs at run
// time; the course-pack builder (roadmap Prompt 31) is where it will. The SDK
// validates, tests and archives one, so that what a course author writes now
// is the format that builder reads.
// =============================================================================

export const FORMAT = 'gravitas.course-pack';
export const FORMAT_VERSION = 1;

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const MAX_TEXT = 2000;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Anything a string could smuggle: markup, a script URL, a link. */
const UNSAFE = /<[a-z!/]|javascript:|data:|https?:\/\//i;

/**
 * Every problem with a course pack, each naming the field it is about.
 * @param {unknown} c - A parsed course pack
 * @param {{lessons: Set<string>, locales: string[]}} api - What Gravitas has
 * @returns {Array<{path: string, message: string}>}
 */
export function validateCoursePack(c, api) {
  const out = [];
  const need = (ok, path, message) => ok || out.push({ path, message });
  if (!isObject(c)) return [{ path: '', message: 'is not an object' }];
  const known = new Set([
    'format',
    'formatVersion',
    'id',
    'version',
    'locales',
    'title',
    'summary',
    'units',
  ]);
  for (const k of Object.keys(c))
    need(known.has(k), k, `"${k}" is not a course-pack field`);
  need(c.format === FORMAT, 'format', `must be "${FORMAT}"`);
  need(
    c.formatVersion === FORMAT_VERSION,
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(
    PUBLIC_ID.test(c.id || ''),
    'id',
    'a public id such as "finding-exoplanets"'
  );
  need(SEMVER.test(c.version || ''), 'version', 'a version such as "1.0.0"');

  const locales = Array.isArray(c.locales) ? c.locales : [];
  need(locales.includes('en'), 'locales', 'must include "en"');
  for (const [i, l] of locales.entries()) {
    need(
      api.locales.includes(l),
      `locales[${i}]`,
      `Gravitas has no "${l}" interface; it has ${api.locales.join(', ')}`
    );
  }
  /** A string in every declared locale, and nothing a browser would run. */
  const text = (v, path, required = true) => {
    if (v === undefined && !required) return;
    if (!isObject(v))
      return need(
        false,
        path,
        `an object with a string per locale (${locales.join(', ')})`
      );
    for (const l of locales) {
      const s = v[l];
      if (typeof s !== 'string' || !s.trim())
        need(
          false,
          `${path}.${l}`,
          `is missing: every string needs every declared locale`
        );
      else {
        need(
          s.length <= MAX_TEXT,
          `${path}.${l}`,
          `is ${s.length} characters; the limit is ${MAX_TEXT}`
        );
        need(
          !UNSAFE.test(s),
          `${path}.${l}`,
          'contains markup or a URL; a course pack is plain text'
        );
      }
    }
    for (const l of Object.keys(v))
      need(
        locales.includes(l),
        `${path}.${l}`,
        `"${l}" is not one of the pack's locales`
      );
  };
  text(c.title, 'title');
  text(c.summary, 'summary', false);

  need(
    Array.isArray(c.units) && c.units.length > 0,
    'units',
    'needs at least one unit'
  );
  const unitIds = new Set();
  const seen = new Map();
  (c.units || []).forEach((u, i) => {
    const at = `units[${i}]`;
    if (!isObject(u)) return need(false, at, 'is not an object');
    need(PUBLIC_ID.test(u.id || ''), `${at}.id`, 'a public id');
    need(
      !unitIds.has(u.id),
      `${at}.id`,
      `"${u.id}" is used by an earlier unit`
    );
    unitIds.add(u.id);
    text(u.title, `${at}.title`);
    need(
      Array.isArray(u.lessons) && u.lessons.length > 0,
      `${at}.lessons`,
      'needs at least one lesson'
    );
    (u.lessons || []).forEach((entry, j) => {
      const lat = `${at}.lessons[${j}]`;
      if (!isObject(entry)) return need(false, lat, 'is not an object');
      need(
        api.lessons.has(entry.lesson),
        `${lat}.lesson`,
        `Gravitas has no lesson "${entry.lesson}"`
      );
      if (seen.has(entry.lesson))
        need(
          false,
          `${lat}.lesson`,
          `"${entry.lesson}" is already in ${seen.get(entry.lesson)}`
        );
      else seen.set(entry.lesson, lat);
      text(entry.teacherNote, `${lat}.teacherNote`, false);
      text(entry.studentNote, `${lat}.studentNote`, false);
      for (const k of Object.keys(entry)) {
        need(
          ['lesson', 'teacherNote', 'studentNote'].includes(k),
          `${lat}.${k}`,
          `"${k}" is not a lesson-entry field`
        );
      }
    });
  });
  return out;
}
