// =============================================================================
// A course pack against this build of Gravitas
// -----------------------------------------------------------------------------
// ./pack.js says whether a pack is well formed. This says how it stands
// against what Gravitas has today, which is a different question: a pack
// archived last year is well formed and may name a lesson that has since been
// rewritten, or a package that has moved on a major version.
//
// Pins. Every lesson, assignment and investigation-pack item may carry a pin: an eight-digit
// digest of the lesson's steps (each step's sid and the fingerprint
// js/investigations/progressBackup.js gives it - its type, instrument,
// scenario, fields and the shape of its answer, never its words, so a
// translation does not move it), the number of steps, and the package and
// version the lesson came from when it came from one. An assignment's pin
// also holds each assigned step's own hash, the one its link carries.
//
// Against the lesson as it is now, an item is:
//
//   same        the digest and the package match;
//   changed     the lesson's steps are not the ones pinned;
//   compatible  the package moved within its major version;
//   major       the package moved a major version;
//   moved       the lesson now comes from another package, or none;
//   unpinned    the item carries no pin (a /1 pack, migrated);
//   missing     Gravitas no longer has the lesson, scenario or dataset.
//
// Whether that needs an instructor to look depends on the pack's pinning. An
// exact pack is an archive: anything but "same" needs review. A compatible
// pack accepts changes within a major version, and still stops on a missing
// reference, a major or a moved package, and an assignment step that is gone
// or rewritten. upgradeCoursePack() is the reviewed way forward: it re-pins
// only the items the instructor accepted, gives a rewritten assignment a new
// id (so no stored answer attaches to a question it did not answer), and says
// how far the version has to move.
//
// Pure: ./api.js gathers the facts (it loads the lessons), and the builder,
// the course home and the tests read the verdicts.
// =============================================================================

import { shortHash } from '../assignments/assignment.js';
import { itemsOf, lessonKeyOf, PATHS } from './pack.js';

export { shortHash };

export const STATUS = Object.freeze({
  SAME: 'same',
  CHANGED: 'changed',
  COMPATIBLE: 'compatible',
  MAJOR: 'major',
  MOVED: 'moved',
  UNPINNED: 'unpinned',
  MISSING: 'missing',
});

/**
 * The digest a pin records for a lesson, from each step's sid and hash.
 * @param {Array<[string, string]>} steps - [sid, shortHash(fingerprint)]
 */
export const lessonDigest = steps =>
  shortHash(steps.map(([sid, hash]) => `${sid}=${hash}`).join('\n'));

const major = v => Number(String(v).split('.')[0]);

/** A scenario item's id: a pack made before ids names one in English. */
const scenarioOf = (facts, key) => facts.scenarioId?.(key) ?? key;

/**
 * A pin for an item, from the lesson as it is now.
 * @param {object} item - A lesson or assignment item
 * @param {object} lesson - Its facts (./api.js lessonFacts())
 */
export function pinFor(item, lesson) {
  return {
    fp: lesson.fp,
    n: lesson.n,
    ...(lesson.pkg ? { pkg: [lesson.pkg.id, lesson.pkg.version] } : {}),
    ...(item.kind === 'assignment'
      ? { f: item.steps.map(sid => lesson.hashes.get(sid) || '00000000') }
      : {}),
  };
}

/** Each assigned step against the lesson now: present, changed or missing. */
function stepStates(item, lesson) {
  return (item.steps || []).map((sid, i) => {
    const now = lesson.hashes.get(sid);
    if (!now) return { sid, state: 'missing' };
    const then = item.pin?.f?.[i];
    return { sid, state: then && then !== now ? 'changed' : 'present' };
  });
}

/**
 * How one item stands.
 * @returns {{status: string, needsReview: boolean, detail: object}}
 */
export function reviewItem(item, facts, pinning) {
  const verdict = (status, detail = {}) => ({
    status,
    needsReview: needsReview(status, pinning, detail),
    detail,
  });
  switch (item.kind) {
    case 'scenario':
      return verdict(
        facts.scenarios.has(scenarioOf(facts, item.scenario))
          ? STATUS.SAME
          : STATUS.MISSING
      );
    case 'dataset':
      return verdict(
        facts.datasets.has(item.dataset) ? STATUS.SAME : STATUS.MISSING
      );
    case 'reading':
      return verdict(STATUS.SAME);
  }
  const lesson = facts.lessons.get(lessonKeyOf(item));
  if (!lesson) return verdict(STATUS.MISSING);
  const steps = item.kind === 'assignment' ? stepStates(item, lesson) : [];
  const detail = {
    stepsThen: item.pin?.n ?? null,
    stepsNow: lesson.n,
    missingSteps: steps.filter(s => s.state === 'missing').map(s => s.sid),
    changedSteps: steps.filter(s => s.state === 'changed').map(s => s.sid),
    pinnedPackage: item.pin?.pkg ?? null,
    currentPackage: lesson.pkg ? [lesson.pkg.id, lesson.pkg.version] : null,
  };
  const pin = item.pin;
  if (!pin) return verdict(STATUS.UNPINNED, detail);
  const then = pin.pkg ? { id: pin.pkg[0], version: pin.pkg[1] } : null;
  const now = lesson.pkg;
  if ((then || now) && (!then || !now || then.id !== now.id))
    return verdict(STATUS.MOVED, detail);
  if (then && then.version !== now.version) {
    if (major(then.version) !== major(now.version))
      return verdict(STATUS.MAJOR, detail);
    if (pin.fp === lesson.fp) return verdict(STATUS.COMPATIBLE, detail);
  }
  return verdict(pin.fp === lesson.fp ? STATUS.SAME : STATUS.CHANGED, detail);
}

/** Whether an instructor has to look before students are sent to it. */
export function needsReview(status, pinning, detail = {}) {
  // A rewritten or removed assigned step changes what the link asks, which no
  // pack accepts silently, whatever the lesson's digest says.
  if (detail.missingSteps?.length || detail.changedSteps?.length) return true;
  if (status === STATUS.SAME) return false;
  if (pinning === 'exact') return true;
  return (
    status === STATUS.MISSING ||
    status === STATUS.MAJOR ||
    status === STATUS.MOVED
  );
}

/** Every item's standing, in course order. */
export function reviewCoursePack(pack, facts) {
  return itemsOf(pack).map(({ item, path }) => ({
    id: item.id,
    path,
    kind: item.kind,
    ...reviewItem(item, facts, pack.pinning),
  }));
}

/**
 * The reviewed upgrade: re-pin the accepted items to this build.
 *
 * An assignment whose steps moved keeps the ones still there, drops the ones
 * that are gone, and gets a new id and date, because its old id names a
 * progress namespace holding answers to the steps as they were.
 *
 * @param {object} pack - A valid /2 pack
 * @param {object} facts - This build
 * @param {Iterable<string>} accepted - Item ids the instructor reviewed
 * @param {{today: string, newAssignmentId: Function}} opts
 * @returns {{pack: object, bump: 'major'|'minor'|null, upgraded: string[],
 *   refused: string[]}} refused: accepted items that cannot be re-pinned (a
 *   missing lesson, or an assignment with no step left); they stay as they
 *   were, for the instructor to remove
 */
export function upgradeCoursePack(pack, facts, accepted, opts) {
  const want = new Set(accepted);
  const out = JSON.parse(JSON.stringify(pack));
  const upgraded = [];
  const refused = [];
  let breaking = false;
  for (const { item } of itemsOf(out)) {
    if (!want.has(item.id)) continue;
    if (!['lesson', 'assignment', 'pack'].includes(item.kind)) continue;
    const v = reviewItem(item, facts, out.pinning);
    const lesson = facts.lessons.get(lessonKeyOf(item));
    if (!lesson) {
      refused.push(item.id);
      continue;
    }
    if (v.status === STATUS.SAME && !v.needsReview) continue;
    if (item.kind === 'assignment') {
      const kept = item.steps.filter(sid => lesson.hashes.has(sid));
      if (!kept.length) {
        refused.push(item.id);
        continue;
      }
      const moved =
        kept.length !== item.steps.length || v.detail.changedSteps.length;
      if (moved) {
        item.steps = kept;
        item.assignment = {
          id: opts.newAssignmentId(item),
          created: opts.today,
        };
        // A new id is a new link and a new place for answers: whoever holds
        // the old one has to be sent the new one.
        breaking = true;
      }
    }
    if (
      v.status === STATUS.MAJOR ||
      v.status === STATUS.MOVED ||
      v.detail.missingSteps?.length
    )
      breaking = true;
    item.pin = pinFor(item, lesson);
    upgraded.push(item.id);
  }
  if (upgraded.length) {
    out.gravitas = facts.platform;
    out.version = bumpVersion(out.version, breaking ? 'major' : 'minor');
  }
  return {
    pack: out,
    bump: upgraded.length ? (breaking ? 'major' : 'minor') : null,
    upgraded,
    refused,
  };
}

/** A version moved by one step of a kind. */
export function bumpVersion(version, kind) {
  const [a, b, c] = String(version || '0.0.0')
    .split('.')
    .map(Number);
  if (kind === 'major') return `${a + 1}.0.0`;
  if (kind === 'minor') return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
}

/** "20-25 min" as {lo, hi}. */
export function minutesRange(duration) {
  const n =
    String(duration || '')
      .match(/\d+/g)
      ?.map(Number) || [];
  if (!n.length) return null;
  return { lo: Math.min(...n), hi: Math.max(...n) };
}

/**
 * How long each item and each path takes, as a range of minutes.
 *
 * A lesson is the range its card declares. An assignment is that range in
 * proportion to the steps it keeps, and never under five minutes. The rest
 * declare their minutes. A path's time is the core's plus its own items'.
 */
export function estimate(pack, facts) {
  const items = new Map();
  for (const { item } of itemsOf(pack)) {
    let r = null;
    if (Number.isInteger(item.minutes))
      r = { lo: item.minutes, hi: item.minutes };
    else {
      const lesson = facts.lessons.get(lessonKeyOf(item));
      if (lesson?.duration) {
        const share =
          item.kind === 'assignment' ? (item.steps?.length || 0) / lesson.n : 1;
        r = {
          lo: Math.max(5, Math.round(lesson.duration.lo * share)),
          hi: Math.max(5, Math.round(lesson.duration.hi * share)),
        };
      }
    }
    items.set(item.id, r);
  }
  const sum = path => {
    let lo = 0;
    let hi = 0;
    for (const { item } of itemsOf(pack)) {
      const p = item.path || 'core';
      if (p !== 'core' && p !== path) continue;
      const r = items.get(item.id);
      if (r) {
        lo += r.lo;
        hi += r.hi;
      }
    }
    return { lo, hi };
  };
  return {
    items,
    paths: Object.fromEntries(PATHS.map(p => [p, sum(p)])),
    all: (() => {
      let lo = 0;
      let hi = 0;
      for (const r of items.values())
        if (r) {
          lo += r.lo;
          hi += r.hi;
        }
      return { lo, hi };
    })(),
  };
}

/**
 * Where each item works without a network.
 *
 * precache: the application is precached once visited (lessons, assignments,
 * scenarios and the built-in datasets the Observatory opens); install: a
 * catalog package, offline once installed; online: a reading's address;
 * print: a reading with no address.
 */
export function offlineOf(item, facts) {
  if (item.kind === 'dataset')
    return facts.datasets.get(item.dataset)?.offline || 'online';
  if (item.kind === 'reading')
    return item.cite?.url || item.cite?.doi ? 'online' : 'print';
  return 'precache';
}

/**
 * Whether a text is translated. The Spanish records the digest of the English
 * it was written from (shortHash, as the composer's digest), so it goes out
 * of date when the English moves.
 */
export const translationState = (v, locale) => {
  if (!v || typeof v.en !== 'string') return 'done';
  const other = v[locale];
  if (typeof other !== 'string' || !other.trim()) return 'missing';
  if (locale === 'es' && v.esOf && v.esOf !== shortHash(v.en)) return 'stale';
  return 'done';
};

/** Every text a pack holds, with where it is. */
export function textsOf(pack) {
  const out = [];
  const add = (v, path) => v && out.push({ v, path });
  add(pack.title, 'title');
  add(pack.summary, 'summary');
  add(pack.audience, 'audience');
  add(pack.teacherGuide, 'teacherGuide');
  (pack.objectives || []).forEach((o, i) =>
    add(o.text, `objectives[${i}].text`)
  );
  (pack.prerequisites || []).forEach((p, i) =>
    add(p.text, `prerequisites[${i}].text`)
  );
  (pack.units || []).forEach((u, i) => {
    add(u.title, `units[${i}].title`);
    add(u.summary, `units[${i}].summary`);
  });
  for (const { item, path } of itemsOf(pack))
    for (const k of ['title', 'intro', 'studentNote', 'teacherNote'])
      add(item[k], `${path}.${k}`);
  return out;
}

/**
 * Everything an instructor should know before sending the course out, each
 * with a level: an error stops export and the links, a warning is shown, a
 * note is for the syllabus.
 *
 * @param {object} pack - A pack that passed ./pack.js
 * @param {object} facts - This build (./api.js)
 * @returns {Array<{level: string, code: string, path: string, vars: object}>}
 */
export function auditCourse(pack, facts) {
  const out = [];
  const add = (level, code, path, vars = {}) =>
    out.push({ level, code, path, vars });
  const all = itemsOf(pack);
  const reviews = reviewCoursePack(pack, facts);

  // --- What this build no longer has, and what needs review
  for (const r of reviews) {
    if (r.status === STATUS.MISSING)
      add('error', 'missing', r.path, { id: r.id });
    else if (r.needsReview)
      add('warning', 'review', r.path, { id: r.id, status: r.status });
  }

  // --- Dependencies
  const order = new Map(all.map(({ item }, i) => [item.id, i]));
  const lessonAt = new Map();
  all.forEach(({ item }, i) => {
    if (item.lesson && !lessonAt.has(item.lesson)) lessonAt.set(item.lesson, i);
  });
  for (const seq of facts.sequences || [])
    for (const entry of seq.lessons)
      for (const need of entry.needs || []) {
        const at = lessonAt.get(entry.id);
        if (at === undefined) continue;
        const before = lessonAt.get(need);
        if (before === undefined || before > at)
          add('warning', 'assumes', all[at].path, {
            lesson: entry.id,
            needs: need,
            included: before !== undefined,
          });
      }
  const prereqLessons = new Set(
    (pack.prerequisites || []).filter(p => p.lesson).map(p => p.lesson)
  );
  for (const id of prereqLessons)
    if (lessonAt.has(id))
      add('warning', 'prerequisiteIncluded', 'prerequisites', { lesson: id });
  for (const { item, path } of all) {
    if (item.kind !== 'assignment') continue;
    const lesson = facts.lessons.get(item.lesson);
    if (!lesson?.resolve) continue;
    const r = lesson.resolve(item.steps);
    const extra = r.sids.filter(sid => !item.steps.includes(sid));
    if (extra.length)
      add('error', 'assignmentNeeds', `${path}.steps`, {
        sids: extra.join(', '),
      });
  }
  for (const { item, path } of all) {
    if (item.kind !== 'dataset') continue;
    const d = facts.datasets.get(item.dataset);
    if (!d) continue;
    if (d.compatible === false)
      add('error', 'datasetIncompatible', path, {
        dataset: item.dataset,
        range: d.gravitas,
      });
    if (d.offline === 'install')
      add('note', 'install', path, { dataset: item.dataset });
  }

  // --- Licenses
  for (const { item, path } of all) {
    if (item.kind === 'dataset') {
      const d = facts.datasets.get(item.dataset);
      if (d && !d.license)
        add('error', 'noLicense', path, { dataset: item.dataset });
      else if (d?.license === 'no-license-stated')
        add('warning', 'licenseNotStated', path, { dataset: item.dataset });
    }
    if (item.kind === 'reading') {
      if (!item.license && item.access === 'open')
        add('warning', 'readingLicense', path, {});
      if (item.access === 'open' && !item.cite?.url && !item.cite?.doi)
        add('warning', 'readingAddress', path, {});
    }
  }

  // --- Translations
  for (const locale of (pack.locales || []).filter(l => l !== 'en')) {
    const texts = textsOf(pack);
    const missing = texts.filter(
      t => translationState(t.v, locale) === 'missing'
    );
    const stale = texts.filter(t => translationState(t.v, locale) === 'stale');
    if (missing.length)
      add('warning', 'untranslated', missing[0].path, {
        locale,
        n: missing.length,
      });
    if (stale.length)
      add('warning', 'stale', stale[0].path, { locale, n: stale.length });
    for (const { item, path } of all) {
      const lesson = item.lesson && facts.lessons.get(item.lesson);
      if (lesson && !lesson.locales.includes(locale))
        add('warning', 'lessonUntranslated', path, {
          lesson: item.lesson,
          locale,
        });
    }
  }
  for (const locale of facts.locales)
    if (!(pack.locales || []).includes(locale))
      add('note', 'localeNotDeclared', 'locales', { locale });

  // --- Objectives and time
  const objectives = pack.objectives || [];
  if (!objectives.length) add('warning', 'noObjectives', 'objectives', {});
  for (const [i, o] of objectives.entries()) {
    const served = all.some(
      ({ item }) =>
        (item.path || 'core') === 'core' &&
        (item.objectives || []).includes(o.id)
    );
    if (!served)
      add('warning', 'objectiveUnserved', `objectives[${i}]`, { id: o.id });
  }
  const time = estimate(pack, facts);
  for (const { item, path } of all)
    if (!time.items.get(item.id))
      add('warning', 'noTime', path, { id: item.id });
  for (const { item, path } of all)
    for (const need of item.needs || [])
      if (order.get(need) === undefined)
        add('error', 'needs', path, { id: need });

  // --- Instructor guidance still to write
  for (const { item, path } of all) {
    const lesson = item.lesson && facts.lessons.get(item.lesson);
    if (lesson && !lesson.guide)
      add('note', 'noGuide', path, { lesson: item.lesson });
  }
  return out;
}

/**
 * The dependency graph: items, what they need and what they use.
 *
 * Nodes are the course's items and every lesson, scenario, instrument and
 * data pack they reach; edges are `needs` (an item on an earlier item),
 * `opens` (an item on the lesson, scenario or dataset it names), `uses` (a
 * lesson on a scenario, instrument or data pack its steps name) and
 * `assumes` (a lesson on one Gravitas's sequences put before it).
 */
export function dependencyGraph(pack, facts) {
  const nodes = new Map();
  const edges = [];
  const node = (id, type, label = id) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, label });
    return id;
  };
  const edge = (from, to, kind) => {
    if (!edges.some(e => e.from === from && e.to === to && e.kind === kind))
      edges.push({ from, to, kind });
  };
  for (const { item } of itemsOf(pack)) {
    const me = node(`item:${item.id}`, item.kind, item.id);
    for (const need of item.needs || []) edge(me, `item:${need}`, 'needs');
    if (item.lesson || item.kind === 'pack') {
      const key = lessonKeyOf(item);
      const l = node(`lesson:${key}`, 'lesson-source', key);
      edge(me, l, 'opens');
      const lesson = facts.lessons.get(key);
      for (const s of lesson?.uses?.scenarios || [])
        edge(l, node(`scenario:${s}`, 'scenario-source', s), 'uses');
      for (const w of lesson?.uses?.widgets || [])
        edge(l, node(`widget:${w}`, 'widget', w), 'uses');
      for (const d of lesson?.uses?.dataPacks || [])
        edge(l, node(`data:${d}`, 'data', d), 'uses');
    }
    if (item.kind === 'scenario') {
      const s = scenarioOf(facts, item.scenario);
      edge(me, node(`scenario:${s}`, 'scenario-source', s), 'opens');
    }
    if (item.kind === 'dataset')
      edge(me, node(`data:${item.dataset}`, 'data', item.dataset), 'opens');
  }
  for (const seq of facts.sequences || [])
    for (const entry of seq.lessons)
      for (const need of entry.needs || [])
        if (nodes.has(`lesson:${entry.id}`) && nodes.has(`lesson:${need}`))
          edge(`lesson:${entry.id}`, `lesson:${need}`, 'assumes');
  return { nodes: [...nodes.values()], edges };
}
