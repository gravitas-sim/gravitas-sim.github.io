// =============================================================================
// Capture a 2.0.0 student profile with 2.0.0's own writers
// -----------------------------------------------------------------------------
//   node tests/storageProfile/capture.mjs <tree> <out.json>
//
// <tree> is the js/ of the commit the v2.0.0 tag names, unpacked by
// tools/storage-profile.mjs. Where a 2.0.0 module writes a record (lesson
// progress, the notebook, the experiment store, the IndexedDB stores) it is
// that module that writes it here, into a fake Storage and a fake IndexedDB.
// A record no module writes without a page (a preference, a draft the pages
// build from forms, a guide's answers) is written out by hand from the format
// STORAGE.md gives, and the profile says which is which (`origins`).
//
// Timestamps and ids are whatever the writers made at capture; the profile is
// committed, so the fixture does not move after it.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fakeIndexedDB, snapshotOf } from './fakeIdb.mjs';

const [tree, outFile] = process.argv.slice(2);
const load = rel => import(pathToFileURL(path.join(tree, rel)).href);
const json = rel => JSON.parse(readFileSync(path.join(tree, rel), 'utf8'));

const entries = new Map();
const origins = {};
const storage = {
  getItem: k => (entries.has(k) ? entries.get(k) : null),
  setItem: (k, v) => void entries.set(k, String(v)),
  removeItem: k => void entries.delete(k),
};
globalThis.localStorage = storage;
const idb = fakeIndexedDB();
globalThis.indexedDB = idb;

const hand = (key, value) => {
  entries.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  origins[key] = 'written by hand from the documented format';
};
const wrote = (keys, who) => {
  for (const k of keys) origins[k] = who;
};
const before = () => new Set(entries.keys());
const added = was => [...entries.keys()].filter(k => !was.has(k));

// --- Lessons: the engine's own schema and its safety copy ---------------------
const { getInvestigation } = await load('js/data/investigations.js');
const { writeProgress } = await load('js/investigations/progressSchema.js');
const { recordAnswer } = await load('js/answerParse.js');

const answered = (lesson, upTo) => {
  const responses = {};
  const attempts = {};
  const visited = [];
  for (const s of lesson.steps.slice(0, upTo)) {
    visited.push(s.sid);
    const key = `${lesson.id}:${s.sid}`;
    if (s.kind === 'numeric' && Number.isFinite(s.answer)) {
      recordAnswer(responses, key, String(s.answer), 'en');
      attempts[key] = 1;
    } else if (
      (s.kind === 'choice' || s.type === 'predict') &&
      typeof s.answer === 'number'
    ) {
      responses[key] = s.answer;
      attempts[key] = 1;
    } else if (s.kind === 'short') {
      responses[key] = 'A short written answer.';
    }
  }
  return {
    responses,
    attempts,
    visited,
    stepSid: lesson.steps[Math.min(upTo, lesson.steps.length - 1)].sid,
  };
};

for (const [id, upTo] of [
  ['keplers-laws', 9],
  ['orbital-energy', 5],
]) {
  const lesson = await getInvestigation(id);
  const state = answered(lesson, upTo);
  const blob = writeProgress({
    lesson,
    ...state,
    startedAt: '2026-09-14T15:00:00.000Z',
    depth: 'core',
    deepest: 'core',
    spent: 1200,
  });
  entries.set(`gravitas_investigation_${id}`, JSON.stringify(blob));
  entries.set(`gravitas_investigation_${id}:v1`, JSON.stringify(blob));
  wrote([`gravitas_investigation_${id}`], '2.0.0 writeProgress');
  origins[`gravitas_investigation_${id}:v1`] =
    'the safety copy 2.0.0 keeps beside it';
}
{
  const lesson = await getInvestigation('detect-this-planet');
  hand('gravitas_investigation_detect-this-planet', {
    responses: { [`detect-this-planet:${lesson.steps.length > 1 ? 1 : 0}`]: 1 },
    attempts: {},
    visited: [0, 1],
    stepIndex: 1,
    startedAt: '2025-11-02T10:00:00.000Z',
  });
  origins['gravitas_investigation_detect-this-planet'] =
    'a schema-less (main-era) record, which 2.0.0 migrates on read';
}
{
  const lesson = await getInvestigation('keplers-laws');
  const state = answered(lesson, 4);
  entries.set(
    'gravitas_assignment_golden1',
    JSON.stringify(
      writeProgress({ lesson, ...state, startedAt: '2026-09-20T09:00:00.000Z' })
    )
  );
  wrote(['gravitas_assignment_golden1'], '2.0.0 writeProgress');
}
hand('gravitas_student_name', 'Ada Lovelace');
hand('gravitas_lesson_objects_open', '1');

// --- The evidence notebook, with the module that keeps it ---------------------
{
  const nb = await load('js/notebook/store.js');
  const ent = await load('js/notebook/entry.js');
  nb.setBackend(storage);
  const was = before();
  const list = [1, 2].map(n =>
    ent.buildEntry({
      source: ent.SOURCES[0],
      title: `Measurement ${n}`,
      capturedAt: 1_790_000_000_000 + n * 1000,
      id: `golden-entry-${n}`,
      context: {
        lesson: 'keplers-laws',
        step: 'measure-the-two-orbits',
        assignment: null,
      },
      quantities: [
        ent.quantity({
          label: 'Period',
          value: 3.5 + n,
          unit: 'd',
          uncertainty: 0.01,
        }),
      ],
    })
  );
  nb.save(list);
  wrote(added(was), '2.0.0 notebook save');
  nb.setBackend(null);
}

// --- Experiments: the store's own writer --------------------------------------
{
  const exp = await load('js/experiments/store.js');
  exp.setBackend(storage);
  const was = before();
  const spec = (
    await import(
      pathToFileURL(path.resolve('tests/compat/kinds/experiment-store.mjs'))
        .href
    )
  ).default;
  const base = await spec.make(load, json);
  for (const [id, name] of [
    ['golden-exp-1', 'First comparison'],
    ['golden-exp-2', 'Second comparison'],
  ]) {
    const r = exp.saveExperiment({ ...base, id, name });
    if (!r.ok) throw new Error(`experiment not saved: ${r.reason}`);
  }
  wrote(added(was), '2.0.0 saveExperiment');
  exp.setBackend(null);
  entries.set(
    'gravitas_experiment_checkpoint_abc123',
    JSON.stringify([{ status: 'done', n: 1 }])
  );
  origins.gravitas_experiment_checkpoint_abc123 =
    'a checkpoint text of the shape experimentsPage writes';
}

// --- Drafts the pages build from forms ----------------------------------------
{
  const pack = await (
    await import(
      pathToFileURL(path.resolve('tests/compat/kinds/investigation-pack.mjs'))
        .href
    )
  ).default.make(load, json);
  const course = await (
    await import(
      pathToFileURL(path.resolve('tests/compat/kinds/course-pack.mjs')).href
    )
  ).default.make(load, json);
  const at = '2026-10-01T12:00:00.000Z';
  hand('gravitas_composer_draft:golden-pack', { savedAt: at, doc: pack });
  hand('gravitas_composer_last', 'golden-pack');
  hand('gravitas_composer_preview', JSON.stringify(pack));
  hand('gravitas_course_draft:golden-course', { savedAt: at, doc: course });
  hand('gravitas_course_last', 'golden-course');
  hand('gravitas_course_preview', JSON.stringify(course));
  hand('gravitas_studio_draft:golden-scenario', {
    savedAt: at,
    doc: { id: 'golden-scenario', name: 'A scenario draft', bodies: [] },
  });
  hand('gravitas_studio_last', 'golden-scenario');
}
hand('gravitas_evaluation_draft_v1', { version: 1, fields: { q1: 'Yes' } });
hand('gravitas_teaching_notes_v1', {
  'orbital-speed': 'Use the demonstration first.',
});
hand('gravitas_simulation_save', {
  settings: { gravity: 1 },
  view: { zoom: 1, pan: { x: 0, y: 0 } },
  objects: [{ name: 'Kepler Star', mass: 1 }],
});

// --- Made things: 2.0.0's record builders -------------------------------------
{
  const made = await load('js/myWork/made.js');
  const rec = made.scenarioRecord({
    name: 'My Solar System',
    from: 'sandbox',
    payload: { s: 'Solar System', seed: 'golden', d: {}, a: {}, b: [] },
    fragment: 'share=golden',
  });
  const was = before();
  const saved = made.saveMade(rec, storage);
  if (saved && saved.ok === false) throw new Error('made record not saved');
  wrote(added(was), '2.0.0 saveMade');
}

// --- Guides: answers in the three guide stores --------------------------------
hand('gravitas_guides', {
  version: '1.0.0',
  suites: { demo: { guide: { intro: { value: 1, ok: true } } } },
});
hand('gravitas_lab3d_guide_basics', { answers: { s1: 'a' } });
hand('gravitas_missionlab_transfer', { answers: { s1: 42 } });

// --- Preferences and flags ----------------------------------------------------
for (const [k, v] of Object.entries({
  gravitas_locale: 'es',
  gravitas_theme: 'daylight',
  gravitas_units: 'physical',
  gravitas_course_level: 'majors',
  gravitas_rail_sections: JSON.stringify(['rail-state']),
  gravitas_lecture_sequence: JSON.stringify(['investigation=keplers-laws']),
  gravitas_welcome_seen_v1: '1',
  gravitas_orientation_seen_v1: '1',
  mobile_instructions_shown: 'true',
  gravitas_next_context: JSON.stringify({ k: 'seq', id: 'sky' }),
  gravitas_capability_versions: JSON.stringify({ 'core-physics': '1.0.0' }),
  gravitas_last_export: JSON.stringify({
    at: '2026-10-10T10:00:00.000Z',
    n: 12,
  }),
}))
  hand(k, v);

// --- IndexedDB: the installed package and the archive's cached answer ---------
const { openStore } = await load('js/catalog/store.js');
{
  const spec = (
    await import(
      pathToFileURL(path.resolve('tests/compat/kinds/archive-record.mjs')).href
    )
  ).default;
  const record = await spec.make(load, json);
  const store = await openStore({ indexedDB: idb });
  await store.put(record);
  const cache = await load('js/archive/cache.js');
  const answers = cache.idbStore('gravitas-archive');
  await answers.set('https://example.test/query?q=1', {
    bytes: new TextEncoder().encode('{"rows":[1,2,3]}'),
    url: 'https://example.test/query?q=1',
    sha256: 'a'.repeat(64),
    identity: 'golden',
    retrievedMs: 1_790_000_000_000,
  });
}
await new Promise(r => setTimeout(r, 20));

// --- Cache Storage: the build's cache name and a few of the URLs in it --------

writeFileSync(
  outFile,
  JSON.stringify(
    {
      note: 'A 2.0.0 profile. Regenerate with npm run storage:profile -- --capture; origins say who wrote each key.',
      localStorage: Object.fromEntries(
        [...entries].sort(([a], [b]) => (a < b ? -1 : 1))
      ),
      origins: Object.fromEntries(
        Object.entries(origins).sort(([a], [b]) => (a < b ? -1 : 1))
      ),
      indexedDB: snapshotOf(idb),
      cacheStorage: {
        'gravitas-a71f73f50f30': {
          urls: ['/', '/js/ui.js', '/css/styles.css', '/sw-manifest.js'],
        },
      },
    },
    null,
    1
  ) + '\n'
);
