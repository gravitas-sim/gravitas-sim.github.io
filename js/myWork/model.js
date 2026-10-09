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
  'sweep-analysis': 'experiments',
  'experiment-result': 'experiments',
};
export const surfaceOf = source => SURFACE[source] ?? 'sandbox';
export const SURFACE_ROUTE = {
  sandbox: '/',
  observatory: '/observatory/',
  experiments: '/experiments/',
};

const GUIDE_KEYS = [
  ['gravitas_lab3d_guide_', 'lab3d', '/3d/'],
  ['gravitas_missionlab_', 'mission', '/mission/lab/'],
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
      groups: { sandbox: [], observatory: [], experiments: [] },
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
    if (key.startsWith('gravitas_investigation_') && !key.endsWith(':v1')) {
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
    } else if (key === 'gravitas_guides' && isObj(value)) {
      for (const [id, rec] of Object.entries(value))
        guide(id, 'observatory', `/observatory/?guide=${id}`, rec, key);
    } else if ((m = GUIDE_KEYS.find(([p]) => key.startsWith(p)))) {
      const id = key.slice(m[0].length).replace(/_(intro|advanced)$/, '');
      guide(id, m[1], `${m[2]}?guide=${id}`, value, key);
    } else if (key.startsWith('gravitas_assignment_')) {
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
    } else if (key === 'gravitas_evidence_notebook') {
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
      key.startsWith('gravitas_experiment_') &&
      !key.startsWith('gravitas_experiment_checkpoint_')
    ) {
      out.experiments.push({
        key,
        title: text(value?.name) || key.slice(20),
        when: iso(value?.updated),
      });
    } else if (key.startsWith('gravitas_experiment_checkpoint_')) {
      out.drafts.push({
        key,
        kind: 'checkpoint',
        title: key.slice(31),
        when: null,
        href: '/experiments/',
      });
    } else if (key === 'gravitas_simulation_save') {
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
    } else if (key.startsWith('gravitas_evaluation_draft_')) {
      out.drafts.push({
        key,
        kind: 'evaluation',
        title: null,
        when: null,
        href: '/evaluation/',
      });
    } else if (key.startsWith('gravitas_teaching_notes_')) {
      out.drafts.push({
        key,
        kind: 'notes',
        title: null,
        when: null,
        href: '/teaching/',
      });
    } else if (key.startsWith('gravitas_made_')) {
      out.made.push({ key, title: text(value?.name) || key });
    } else if (key === 'gravitas_student_name') {
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
  d.experiments.length +
  d.saved.length +
  d.drafts.length +
  d.made.length +
  Object.values(d.evidence.groups).reduce((n, g) => n + g.length, 0);
