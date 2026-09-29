// =============================================================================
// gravitas.course-pack/2: a course, as data
// -----------------------------------------------------------------------------
// A course pack /1 (js/platform/course.js) is an ordering of lessons in units,
// with notes: what the catalog installs and the SDK validates. /2 is what the
// course-pack builder (/studio/course/, COURSE_PACKS.md) writes: a sequence of
// the things an instructor sets - lessons, assignments cut from them,
// scenarios, datasets and readings - with objectives, prerequisites, time,
// optional introductory and advanced paths, notes for the teacher and the
// student, and a pin on every lesson it names, so an archived pack can say
// what it was made with. Still content only: it names lessons, scenarios and
// datasets by their public ids, and nothing in it is ever run.
//
// A /1 pack still opens: migrateCoursePack() turns one into a /2 pack with
// the same units and lessons, unpinned (./review.js says so), and the catalog
// goes on reading /1.
//
// The structural guard and the texts are the investigation pack's
// (js/platform/investigation.js makeChecker): a hostile file is refused for
// one reason before any rule reads it, and every text carries the digest of
// the English its Spanish was written from. Course texts are plain: the
// course home writes them as text, so the four prose tags a lesson may use are
// refused here too.
//
// Pure, so the builder, the course home, the tests and the SDK share it.
// =============================================================================

import { makeChecker } from '../platform/investigation.js';

export const FORMAT = 'gravitas.course-pack';
export const FORMAT_VERSION = 2;

export const ITEM_KINDS = Object.freeze([
  'lesson',
  'assignment',
  'scenario',
  'dataset',
  'reading',
]);
/** The optional paths an item may be on; everything else is the core. */
export const PATHS = Object.freeze(['core', 'intro', 'advanced']);
export const PINNING = Object.freeze(['exact', 'compatible']);
export const ACCESS = Object.freeze(['open', 'library', 'print']);

export const MAX_UNITS = 20;
export const MAX_ITEMS = 120;
export const MAX_ITEMS_PER_UNIT = 30;
export const MAX_OBJECTIVES = 12;
export const MAX_PREREQUISITES = 6;
/** As js/assignments/assignment.js has them. */
export const MAX_ASSIGNMENT_STEPS = 60;
const MAX_ASSIGNMENT_TITLE = 120;
const MAX_ASSIGNMENT_INTRO = 1200;

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const HASH = /^[0-9a-f]{8}$/;
const SEED_WORD = /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ASSIGNMENT_ID = /^[A-Za-z0-9_-]{1,32}$/;
const PACKAGE_ID = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const DOI = /^10\.\d{4,9}\/[^\s<>"]{1,200}$/;
/** Markup of any kind, or an entity: course texts are written as text. */
const MARKUP = /[<>]|&[a-zA-Z#0-9]+;/;
const ANY = { has: () => true };
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

const PACK_FIELDS = new Set([
  'format',
  'formatVersion',
  'id',
  'version',
  'gravitas',
  'locales',
  'pinning',
  'title',
  'summary',
  'audience',
  'teacherGuide',
  'objectives',
  'prerequisites',
  'units',
]);
const COMMON_ITEM = [
  'id',
  'kind',
  'path',
  'minutes',
  'objectives',
  'needs',
  'studentNote',
  'teacherNote',
];
const ITEM_FIELDS = {
  lesson: ['lesson', 'pin'],
  assignment: ['lesson', 'steps', 'title', 'intro', 'assignment', 'pin'],
  scenario: ['scenario', 'seed', 'paused', 'title'],
  dataset: ['dataset', 'title'],
  reading: ['title', 'cite', 'license', 'access'],
};
/** Kinds whose time the builder derives from the lesson; the rest declare it. */
const DERIVED_TIME = new Set(['lesson', 'assignment']);

/** Every item of a pack, in order, with where it is. */
export function itemsOf(pack) {
  const out = [];
  (Array.isArray(pack?.units) ? pack.units : []).forEach((u, ui) =>
    (Array.isArray(u?.items) ? u.items : []).forEach((item, ii) =>
      out.push({ item, unit: u, path: `units[${ui}].items[${ii}]` })
    )
  );
  return out;
}

/**
 * Every problem with a /2 course pack, each on the field it is about.
 *
 * @param {unknown} c - A parsed pack
 * @param {{locales: string[], lessons?: Iterable<string>,
 *   scenarios?: Iterable<string>, datasets?: Iterable<string>}} api - What
 *   this build of Gravitas has (./api.js courseApi()); a list left out is not
 *   checked
 * @returns {Array<{path: string, code: string, vars: object, message: string}>}
 */
export function validateCoursePack(c, api) {
  const {
    out,
    need,
    text: anyText,
    guard,
    locales,
  } = makeChecker(c, {
    entities: [],
  });
  if (!guard()) return out;
  // References are checked only against lists given: a pack opened to be
  // reviewed must open even when a lesson it names has left Gravitas, and
  // ./review.js reports that as missing instead.
  const known = list => (list === undefined ? ANY : new Set(list));
  const lessons = known(api.lessons);
  const scenarios = known(api.scenarios);
  const datasets = known(api.datasets);

  /** A text, in plain words: no markup, no entity, no address. */
  const text = (v, path, required, max = 2000) => {
    anyText(v, path, required);
    if (!isObject(v)) return;
    for (const l of locales) {
      if (typeof v[l] !== 'string') continue;
      need(
        !MARKUP.test(v[l]),
        `${path}.${l}`,
        'plain',
        'is written as plain text: no markup or entities'
      );
      need(
        v[l].length <= max,
        `${path}.${l}`,
        'textLong',
        `longer than ${max} characters`,
        { max }
      );
    }
  };
  const fields = (o, path, allowed) => {
    for (const k of Object.keys(o))
      need(
        allowed.includes(k),
        path ? `${path}.${k}` : k,
        'field',
        `"${k}" is not a field here`,
        {
          field: k,
        }
      );
  };

  fields(c, '', [...PACK_FIELDS]);
  need(c.format === FORMAT, 'format', 'format', `must be "${FORMAT}"`, {
    format: FORMAT,
  });
  need(
    c.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'formatVersion',
    `must be ${FORMAT_VERSION}`,
    { version: FORMAT_VERSION }
  );
  need(
    PUBLIC_ID.test(c.id || ''),
    'id',
    'id',
    'a public id such as "intro-astronomy"'
  );
  need(
    SEMVER.test(c.version || ''),
    'version',
    'version',
    'a version such as "1.0.0"'
  );
  need(
    SEMVER.test(c.gravitas || ''),
    'gravitas',
    'gravitas',
    'the version of Gravitas\'s platform it was made with, such as "1.0.0"'
  );
  need(
    Array.isArray(c.locales) && c.locales.includes('en'),
    'locales',
    'locales',
    'must include "en"'
  );
  (Array.isArray(c.locales) ? c.locales : []).forEach((l, i) =>
    need(
      api.locales.includes(l),
      `locales[${i}]`,
      'locale',
      `Gravitas has no "${l}" interface`,
      {
        locale: l,
      }
    )
  );
  need(
    PINNING.includes(c.pinning),
    'pinning',
    'pinning',
    'exact or compatible'
  );

  text(c.title, 'title', true, 120);
  text(c.summary, 'summary', false);
  text(c.audience, 'audience', false, 300);
  text(c.teacherGuide, 'teacherGuide', false, 4000);

  // --- Objectives and prerequisites
  const objectives = new Set();
  if (c.objectives !== undefined) {
    const list = Array.isArray(c.objectives) ? c.objectives : [];
    need(
      Array.isArray(c.objectives) && list.length <= MAX_OBJECTIVES,
      'objectives',
      'count',
      `a list of up to ${MAX_OBJECTIVES}`,
      { max: MAX_OBJECTIVES }
    );
    list.forEach((o, i) => {
      const at = `objectives[${i}]`;
      if (!isObject(o)) return need(false, at, 'object', 'an object');
      fields(o, at, ['id', 'text']);
      need(PUBLIC_ID.test(o.id || ''), `${at}.id`, 'id', 'a public id');
      need(
        !objectives.has(o.id),
        `${at}.id`,
        'duplicate',
        `"${o.id}" is used above`,
        {
          id: o.id,
        }
      );
      objectives.add(o.id);
      text(o.text, `${at}.text`, true, 300);
    });
  }
  if (c.prerequisites !== undefined) {
    const list = Array.isArray(c.prerequisites) ? c.prerequisites : [];
    need(
      Array.isArray(c.prerequisites) && list.length <= MAX_PREREQUISITES,
      'prerequisites',
      'count',
      `a list of up to ${MAX_PREREQUISITES}`,
      { max: MAX_PREREQUISITES }
    );
    list.forEach((p, i) => {
      const at = `prerequisites[${i}]`;
      if (!isObject(p)) return need(false, at, 'object', 'an object');
      fields(p, at, ['lesson', 'text']);
      need(
        (p.lesson === undefined) !== (p.text === undefined),
        at,
        'prerequisite',
        'a lesson or a text'
      );
      if (p.lesson !== undefined)
        need(
          lessons.has(p.lesson),
          `${at}.lesson`,
          'lesson',
          `Gravitas has no lesson "${p.lesson}"`,
          {
            lesson: p.lesson,
          }
        );
      if (p.text !== undefined) text(p.text, `${at}.text`, true, 300);
    });
  }

  // --- Units and items
  const units = Array.isArray(c.units) ? c.units : [];
  need(
    units.length >= 1 && units.length <= MAX_UNITS,
    'units',
    'units',
    `from 1 to ${MAX_UNITS} units`,
    { max: MAX_UNITS }
  );
  const unitIds = new Set();
  units.forEach((u, i) => {
    const at = `units[${i}]`;
    if (!isObject(u)) return need(false, at, 'object', 'an object');
    fields(u, at, ['id', 'title', 'summary', 'items']);
    need(PUBLIC_ID.test(u.id || ''), `${at}.id`, 'id', 'a public id');
    need(
      !unitIds.has(u.id),
      `${at}.id`,
      'duplicate',
      `"${u.id}" is used above`,
      { id: u.id }
    );
    unitIds.add(u.id);
    text(u.title, `${at}.title`, true, 120);
    text(u.summary, `${at}.summary`, false);
    const n = Array.isArray(u.items) ? u.items.length : 0;
    need(
      n >= 1 && n <= MAX_ITEMS_PER_UNIT,
      `${at}.items`,
      'items',
      `from 1 to ${MAX_ITEMS_PER_UNIT} items`,
      { max: MAX_ITEMS_PER_UNIT }
    );
  });

  const all = itemsOf(c);
  need(
    all.length <= MAX_ITEMS,
    'units',
    'tooMany',
    `more than ${MAX_ITEMS} items`,
    {
      max: MAX_ITEMS,
    }
  );
  const before = new Map(); // id -> path of an earlier item
  const seenLessons = new Map();
  for (const { item, path: at } of all) {
    if (!isObject(item)) {
      need(false, at, 'object', 'an object');
      continue;
    }
    const kind = item.kind;
    if (!ITEM_KINDS.includes(kind)) {
      need(false, `${at}.kind`, 'kind', `one of ${ITEM_KINDS.join(', ')}`, {
        kinds: ITEM_KINDS.join(', '),
      });
      continue;
    }
    fields(item, at, [...COMMON_ITEM, ...ITEM_FIELDS[kind]]);
    need(PUBLIC_ID.test(item.id || ''), `${at}.id`, 'id', 'a public id');
    need(
      !before.has(item.id),
      `${at}.id`,
      'duplicate',
      `"${item.id}" is used above`,
      {
        id: item.id,
      }
    );
    const path = item.path ?? 'core';
    need(PATHS.includes(path), `${at}.path`, 'path', 'core, intro or advanced');
    if (item.minutes !== undefined || !DERIVED_TIME.has(kind))
      need(
        Number.isInteger(item.minutes) &&
          item.minutes >= 1 &&
          item.minutes <= 600,
        `${at}.minutes`,
        'minutes',
        'a whole number of minutes from 1 to 600'
      );
    if (item.objectives !== undefined) {
      const list = Array.isArray(item.objectives) ? item.objectives : [];
      need(
        Array.isArray(item.objectives),
        `${at}.objectives`,
        'list',
        'a list'
      );
      list.forEach((o, j) =>
        need(
          objectives.has(o),
          `${at}.objectives[${j}]`,
          'objective',
          `the course has no objective "${o}"`,
          {
            id: o,
          }
        )
      );
    }
    if (item.needs !== undefined) {
      const list = Array.isArray(item.needs) ? item.needs : [];
      need(Array.isArray(item.needs), `${at}.needs`, 'list', 'a list');
      list.forEach((id, j) => {
        const where = `${at}.needs[${j}]`;
        if (!before.has(id))
          return need(
            false,
            where,
            'needsEarlier',
            `"${id}" is not an earlier item: an item may only need what comes before it`,
            { id }
          );
        // A student on the core path never sees an optional item, so the
        // core cannot depend on one; an optional item may need the core or
        // its own path.
        const other = before.get(id).path;
        need(
          other === 'core' || other === path,
          where,
          'needsPath',
          `"${id}" is on the ${other} path, which a student on this item's path may not take`,
          { id, path: other }
        );
      });
    }
    text(item.studentNote, `${at}.studentNote`, false, 1200);
    text(item.teacherNote, `${at}.teacherNote`, false, 2000);
    checkKind(item, at, {
      need,
      text,
      fields,
      lessons,
      scenarios,
      datasets,
      pinning: c.pinning,
      seenLessons,
    });
    if (typeof item.id === 'string') before.set(item.id, { path });
  }
  return out;
}

function checkKind(item, at, ctx) {
  const { need, text, lessons, scenarios, datasets } = ctx;
  switch (item.kind) {
    case 'lesson':
    case 'assignment': {
      const known = lessons.has(item.lesson);
      need(
        known,
        `${at}.lesson`,
        'lesson',
        `Gravitas has no lesson "${item.lesson}"`,
        {
          lesson: item.lesson,
        }
      );
      // A whole lesson twice is a mistake; assignments cut from one lesson
      // several times are the point of them.
      if (item.kind === 'lesson' && known) {
        const first = ctx.seenLessons.get(item.lesson);
        need(
          !first,
          `${at}.lesson`,
          'lessonTwice',
          `"${item.lesson}" is already in the course`,
          {
            lesson: item.lesson,
          }
        );
        ctx.seenLessons.set(item.lesson, at);
      }
      if (item.kind === 'assignment') checkAssignment(item, at, ctx);
      if (item.pin !== undefined) checkPin(item, at, ctx);
      else
        need(
          ctx.pinning !== 'exact',
          `${at}.pin`,
          'pinRequired',
          'an exact pack pins every lesson it names'
        );
      return;
    }
    case 'scenario':
      need(
        scenarios.has(item.scenario),
        `${at}.scenario`,
        'scenario',
        `Gravitas has no scenario "${item.scenario}"`,
        {
          scenario: item.scenario,
        }
      );
      need(
        SEED_WORD.test(item.seed || ''),
        `${at}.seed`,
        'seed',
        'a seed word such as "orbit-1"'
      );
      if (item.paused !== undefined)
        need(
          typeof item.paused === 'boolean',
          `${at}.paused`,
          'boolean',
          'true or false'
        );
      text(item.title, `${at}.title`, false, 120);
      return;
    case 'dataset':
      need(
        datasets.has(item.dataset),
        `${at}.dataset`,
        'dataset',
        `Gravitas has no dataset "${item.dataset}"`,
        {
          dataset: item.dataset,
        }
      );
      text(item.title, `${at}.title`, false, 120);
      return;
    case 'reading':
      text(item.title, `${at}.title`, true, 200);
      checkCite(item.cite, `${at}.cite`, ctx);
      if (item.license !== undefined)
        need(
          typeof item.license === 'string' &&
            item.license.trim() !== '' &&
            item.license.length <= 200 &&
            !/[<>]/.test(item.license),
          `${at}.license`,
          'license',
          'the license or terms, in words'
        );
      need(
        ACCESS.includes(item.access),
        `${at}.access`,
        'access',
        'open, library or print'
      );
      return;
  }
}

function checkAssignment(item, at, { need, text, fields }) {
  const steps = Array.isArray(item.steps) ? item.steps : [];
  need(
    steps.length >= 1 && steps.length <= MAX_ASSIGNMENT_STEPS,
    `${at}.steps`,
    'steps',
    `from 1 to ${MAX_ASSIGNMENT_STEPS} steps`,
    { max: MAX_ASSIGNMENT_STEPS }
  );
  steps.forEach((sid, j) =>
    need(
      typeof sid === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(sid),
      `${at}.steps[${j}]`,
      'sid',
      'a step id'
    )
  );
  need(
    new Set(steps).size === steps.length,
    `${at}.steps`,
    'stepsTwice',
    'names a step twice'
  );
  text(item.title, `${at}.title`, false, MAX_ASSIGNMENT_TITLE);
  text(item.intro, `${at}.intro`, false, MAX_ASSIGNMENT_INTRO);
  const a = item.assignment;
  if (!isObject(a)) {
    need(
      false,
      `${at}.assignment`,
      'assignmentId',
      "the assignment's id and the date it was made"
    );
    return;
  }
  fields(a, `${at}.assignment`, ['id', 'created']);
  need(
    ASSIGNMENT_ID.test(a.id || ''),
    `${at}.assignment.id`,
    'assignmentId',
    'an assignment id'
  );
  need(
    DATE.test(a.created || ''),
    `${at}.assignment.created`,
    'date',
    'a date such as 2026-09-28'
  );
}

function checkPin(item, at, { need, fields }) {
  const p = item.pin;
  if (!isObject(p)) return need(false, `${at}.pin`, 'object', 'an object');
  fields(p, `${at}.pin`, ['fp', 'n', 'pkg', 'f']);
  need(
    HASH.test(p.fp || ''),
    `${at}.pin.fp`,
    'hash',
    'eight hexadecimal digits'
  );
  need(
    Number.isInteger(p.n) && p.n >= 1,
    `${at}.pin.n`,
    'stepCount',
    "the lesson's number of steps"
  );
  if (p.pkg !== undefined)
    need(
      Array.isArray(p.pkg) &&
        p.pkg.length === 2 &&
        PACKAGE_ID.test(p.pkg[0] || '') &&
        SEMVER.test(p.pkg[1] || ''),
      `${at}.pin.pkg`,
      'package',
      'the package and its version'
    );
  if (item.kind === 'assignment')
    need(
      Array.isArray(p.f) &&
        p.f.length === (item.steps || []).length &&
        p.f.every(h => HASH.test(h)),
      `${at}.pin.f`,
      'stepHashes',
      'one hash for each assigned step'
    );
  else
    need(p.f === undefined, `${at}.pin.f`, 'field', '"f" is not a field here', {
      field: 'f',
    });
}

function checkCite(cite, at, { need, fields }) {
  if (!isObject(cite))
    return need(false, at, 'cite', 'who wrote it, when and where');
  fields(cite, at, ['authors', 'year', 'source', 'doi', 'url']);
  const words = (v, path, max) =>
    need(
      typeof v === 'string' &&
        v.trim() !== '' &&
        v.length <= max &&
        !/[<>]/.test(v),
      path,
      'words',
      `a text of up to ${max} characters`,
      { max }
    );
  words(cite.authors, `${at}.authors`, 300);
  words(cite.source, `${at}.source`, 300);
  need(
    Number.isInteger(cite.year) && cite.year >= 1500 && cite.year <= 2100,
    `${at}.year`,
    'year',
    'a year'
  );
  if (cite.doi !== undefined)
    need(
      typeof cite.doi === 'string' && DOI.test(cite.doi),
      `${at}.doi`,
      'doi',
      'a DOI such as 10.1119/1.1234'
    );
  if (cite.url !== undefined)
    need(safeUrl(cite.url), `${at}.url`, 'url', 'an https address');
}

/**
 * Whether an address is one a course may link to: https, a host, no
 * credentials. The one place a course pack holds an address, so a reader can
 * find a reading; the course home writes it into an href only after this.
 */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 500) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // The canonical form only (the builder writes new URL(x).href), so what
  // the reader is shown is exactly where the link goes.
  return (
    url.protocol === 'https:' &&
    !!url.hostname &&
    !url.username &&
    !url.password &&
    url.href === value
  );
}

/**
 * A /1 pack as a /2 pack: the same units and lessons, each lesson an item,
 * unpinned and on the core path. What /1 cannot say - objectives, times,
 * pins - is left for the builder to ask for.
 *
 * @param {object} p - A /1 or /2 pack
 * @param {{platform: string}} opts - The platform version to record
 * @returns {object} A /2 pack (a /2 pack is returned as it is)
 */
export function migrateCoursePack(p, { platform }) {
  if (!isObject(p) || p.format !== FORMAT || p.formatVersion !== 1) return p;
  const locales = Array.isArray(p.locales) ? [...p.locales] : ['en'];
  const out = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id: p.id,
    version: p.version,
    gravitas: platform,
    locales,
    pinning: 'compatible',
    title: p.title,
    ...(p.summary ? { summary: p.summary } : {}),
    units: (Array.isArray(p.units) ? p.units : []).map(u => ({
      id: u?.id,
      title: u?.title,
      items: (Array.isArray(u?.lessons) ? u.lessons : []).map(l => ({
        id: l?.lesson,
        kind: 'lesson',
        lesson: l?.lesson,
        ...(l?.studentNote ? { studentNote: l.studentNote } : {}),
        ...(l?.teacherNote ? { teacherNote: l.teacherNote } : {}),
      })),
    })),
  };
  return out;
}
