import {
  KEY_ASSIGNMENT_PREFIX,
  KEY_COLLECTIONS,
  KEY_EVALUATION_DRAFT_PREFIX,
  KEY_EVIDENCE_NOTEBOOK,
  KEY_EXPERIMENT_CHECKPOINT_PREFIX,
  KEY_EXPERIMENT_PREFIX,
  KEY_GUIDES,
  KEY_INVESTIGATION_PREFIX,
  KEY_LAB3D_GUIDE_PREFIX,
  KEY_MADE_PREFIX,
  KEY_MISSIONLAB_PREFIX,
  KEY_SIMULATION_SAVE,
  KEY_STUDENT_NAME,
  KEY_TERMS,
  KEY_TEACHING_NOTES_PREFIX,
} from '../names.js';
// =============================================================================
// What a student has made, read from the records the writers keep
// -----------------------------------------------------------------------------
// Roadmap II Prompt 69 (MY_WORK.md). /my-work/ lists everything a student owns
// from one snapshot of the student store (js/storage/index.js, openStudentStore):
// a flat list of { collection, id, value } over the keys STORAGE.md names. This
// module only reads. It has no DOM, and nothing in it writes or sends anything.
//
// Records from the legacy adapter carry no saved time, so each document's own
// stamp is used where it has one: a lesson's `startedAt`, a draft's `savedAt`, an
// experiment's `updated`, a notebook entry's `capturedAt`. A document without one
// is listed without a date rather than with an invented one.
//
// `library` is the Library's index as a Map (id -> entry): titles, step counts
// and the page that opens each thing. Without it an item still lists, under its
// own id, and links to the page that owns its key.
// =============================================================================

/** The surface that made a notebook entry, by its source (js/notebook/entry.js). */
const SURFACE = {
  observatory: 'observatory',
  'inference-fit': 'observatory',
  comparison: 'observatory',
  'image-marks': 'observatory',
  'image-calibration': 'observatory',
  'image-photometry': 'observatory',
  'image-detection': 'observatory',
  'sweep-analysis': 'experiments',
  'experiment-result': 'experiments',
  lab3d: 'lab3d',
  'mission-lab': 'mission',
  'compute-capsule': 'compute',
};
export const surfaceOf = source => SURFACE[source] ?? 'sandbox';
export const SURFACE_ROUTE = {
  sandbox: '/',
  observatory: '/observatory/',
  experiments: '/experiments/',
  lab3d: '/3d/',
  mission: '/mission/lab/',
  compute: '/compute/',
};

const GUIDE_KEYS = [
  [KEY_LAB3D_GUIDE_PREFIX, 'lab3d', '/3d/'],
  [KEY_MISSIONLAB_PREFIX, 'mission', '/mission/lab/'],
];
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const count = v => (Array.isArray(v) ? new Set(v).size : 0);
const iso = ms =>
  Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
const text = v => (typeof v === 'string' ? v : '');

/**
 * The records grouped for the page.
 *
 * @param {Array<{collection: string, id: string, value: *}>} records
 * @param {Map<string, object>} [library] - Library entries by id
 * @returns {object} lessons, assignments, courses, evidence, experiments,
 *   saved, drafts and the name, each item with the `id` of the key it lives in
 */
export function describe(records, library = new Map()) {
  const out = {
    lessons: [],
    assignments: [],
    courses: [],
    evidence: {
      notebook: null,
      groups: {
        sandbox: [],
        observatory: [],
        experiments: [],
        lab3d: [],
        mission: [],
        compute: [],
      },
    },
    experiments: [],
    saved: [],
    drafts: [],
    made: [],
    name: null,
  };
  const progress = new Map();
  const entryOf = id => library.get(`investigation:${id}`);
  const guide = (id, format, route, record, key) => {
    const e = library.get(`investigation:${id}`);
    out.lessons.push({
      kind: format,
      key,
      id,
      title: e?.title ?? id,
      href: e?.route ?? route,
      seen: null,
      total: null,
      done: false,
      since: null,
      empty: !isObj(record) || Object.keys(record).length === 0,
    });
  };
  for (const { id: key, value } of records) {
    let m;
    if (key.startsWith(KEY_INVESTIGATION_PREFIX) && !key.endsWith(':v1')) {
      const id = key.slice(23);
      const e = entryOf(id);
      const seen = count(value?.visited);
      progress.set(id, seen);
      out.lessons.push({
        kind: 'lesson',
        key,
        id,
        title: e?.title ?? id,
        href: e?.route ?? `/#investigation=${id}`,
        seen,
        total: e?.steps ?? null,
        answered: isObj(value?.responses)
          ? Object.keys(value.responses).length
          : 0,
        done: Boolean(e?.steps) && seen >= e.steps,
        since: text(value?.startedAt) || null,
      });
    } else if (key === KEY_GUIDES && isObj(value)) {
      for (const [id, rec] of Object.entries(value))
        guide(id, 'observatory', `/observatory/?guide=${id}`, rec, key);
    } else if ((m = GUIDE_KEYS.find(([p]) => key.startsWith(p)))) {
      const id = key.slice(m[0].length).replace(/_(intro|advanced)$/, '');
      guide(id, m[1], `${m[2]}?guide=${id}`, value, key);
    } else if (key.startsWith(KEY_ASSIGNMENT_PREFIX)) {
      const e = entryOf(value?.lesson);
      out.assignments.push({
        key,
        title: e?.title ?? value?.lesson ?? key,
        seen: count(value?.visited),
        answered: isObj(value?.responses)
          ? Object.keys(value.responses).length
          : 0,
        since: text(value?.startedAt) || null,
      });
    } else if (key === KEY_EVIDENCE_NOTEBOOK) {
      const entries = Array.isArray(value?.entries) ? value.entries : [];
      out.evidence.notebook = { key, count: entries.length };
      for (const x of entries) {
        out.evidence.groups[surfaceOf(x?.source)].push({
          key,
          id: text(x?.id),
          title: text(x?.title) || text(x?.source),
          source: text(x?.source),
          when: iso(x?.snapshot?.capturedAt),
        });
      }
    } else if (
      key.startsWith(KEY_EXPERIMENT_PREFIX) &&
      !key.startsWith(KEY_EXPERIMENT_CHECKPOINT_PREFIX)
    ) {
      out.experiments.push({
        key,
        title: text(value?.name) || key.slice(20),
        when: iso(value?.updated),
      });
    } else if (key.startsWith(KEY_EXPERIMENT_CHECKPOINT_PREFIX)) {
      out.drafts.push({
        key,
        kind: 'checkpoint',
        title: key.slice(31),
        when: null,
        href: '/experiments/',
      });
    } else if (key === KEY_SIMULATION_SAVE) {
      out.saved.push({
        key,
        kind: 'world',
        title: null,
        bodies: Object.keys(isObj(value) ? value : {}).length,
      });
    } else if (/^gravitas_(composer|studio|course)_draft:/.test(key)) {
      const [, kind, , id] = key.split(/[_:]/);
      out.drafts.push({
        key,
        kind,
        title: text(value?.doc?.title?.en ?? value?.doc?.title) || id,
        when: iso(value?.savedAt),
        // Opens this draft, not the one saved last (?open=<id> in each page).
        href:
          {
            composer: '/studio/lesson/',
            studio: '/studio/',
            course: '/studio/course/',
          }[kind] + `?open=${id}`,
      });
    } else if (key.startsWith(KEY_EVALUATION_DRAFT_PREFIX)) {
      out.drafts.push({
        key,
        kind: 'evaluation',
        title: null,
        when: null,
        href: '/evaluation/',
      });
    } else if (key.startsWith(KEY_TEACHING_NOTES_PREFIX)) {
      out.drafts.push({
        key,
        kind: 'notes',
        title: null,
        when: null,
        href: '/teaching/',
      });
    } else if (key.startsWith(KEY_MADE_PREFIX)) {
      out.made.push({ key, title: text(value?.name) || key });
    } else if (key === KEY_TERMS) {
      // The courses opened that name a term (js/instructorCourseTerms.js owns the
      // record; its route has no room for that module here, so this reads it).
      for (const c of value?.v === 1 && Array.isArray(value.courses)
        ? value.courses
        : []) {
        if (!isObj(c) || !text(c.id) || !text(c.term)) continue;
        (out.terms ??= []).push({
          id: text(c.id),
          term: text(c.term),
          title: { en: text(c.title?.en) || text(c.id), es: text(c.title?.es) },
          when: iso(c.at),
        });
      }
    } else if (key === KEY_COLLECTIONS) {
      // The saved items and the collections kept (js/library/collections.js
      // owns the record; this reads its few fields for display).
      const n = p =>
        Array.isArray(p?.units?.[0]?.items) ? p.units[0].items.length : 0;
      out.collections = {
        saved: n(value?.saved),
        received: (Array.isArray(value?.received) ? value.received : [])
          .filter(r => isObj(r?.pack) && text(r.pack.id) && n(r.pack))
          .map(r => ({
            id: text(r.pack.id),
            title: {
              en: text(r.pack.title?.en) || text(r.pack.id),
              ...(text(r.pack.title?.es) ? { es: text(r.pack.title.es) } : {}),
            },
            n: n(r.pack),
          })),
      };
    } else if (key === KEY_STUDENT_NAME) {
      out.name = text(value) || null;
    }
  }
  // A built-in course, once any of its investigations is begun, with each unit's count.
  for (const e of library.values()) {
    if (e.kind !== 'course' || !Array.isArray(e.units)) continue;
    const units = e.units.map(u => ({
      title: u.title,
      total: u.lessons.length,
      begun: u.lessons.filter(l => progress.has(l)).length,
      finished: u.lessons.filter(l =>
        out.lessons.some(x => x.id === l && x.done)
      ).length,
    }));
    if (units.some(u => u.begun))
      out.courses.push({ id: e.id, title: e.title, href: e.route, units });
  }
  const recent = (a, b) =>
    String(b.since ?? '').localeCompare(String(a.since ?? ''));
  out.lessons.sort(recent);
  return out;
}

/** How many things the snapshot holds, for the page's one-line summary. */
export const total = d =>
  d.lessons.length +
  d.assignments.length +
  (d.terms?.length ?? 0) +
  (d.collections
    ? (d.collections.saved ? 1 : 0) + d.collections.received.length
    : 0) +
  d.experiments.length +
  d.saved.length +
  d.drafts.length +
  d.made.length +
  Object.values(d.evidence.groups).reduce((n, g) => n + g.length, 0);
