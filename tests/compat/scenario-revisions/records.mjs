// One spec for the scenario revision rule's corpus (SCENARIO_REVISIONS.md): the
// records a build writes for a world at revision 2 of a scenario, and what each
// reader makes of them. `make` runs in the current tree, which registers the
// fixture (the registry ships empty); `read` runs in any tree, the 2.0.0 and 3.0
// ones included. The fixture id is a shipped scenario whose revision 2 is a
// different preset row (more asteroids, a longer trail); revision 1, which the
// older builds hold as their only row, is the table's.
const ID = 'pulsar-system';
const FIXTURE_ROW = { num_asteroids: 20, trail_length: 123 };
const BODIES = [
  { type: 'StarObject', pos: { x: -10, y: 0 }, vel: { x: 0, y: 1 }, mass: 80 },
  { type: 'StarObject', pos: { x: 10, y: 0 }, vel: { x: 0, y: -1 }, mass: 80 },
  { type: 'Planet', pos: { x: 50, y: 0 }, vel: { x: 0, y: 2 }, mass: 0.1 },
];

/** Register the fixture in a tree that has a registry; false in one that has none. */
async function register(load) {
  const sh = await load('js/shareState.js');
  const sc = await load('js/scenarios.js');
  if (!sh.SCENARIO_REVISIONS) return false;
  sh.SCENARIO_REVISIONS[ID] = {
    revision: 2,
    rows: { 2: { ...sc.SCENARIO_PRESETS[ID], ...FIXTURE_ROW } },
    earlier: { 1: 'retained' },
  };
  return true;
}

/** The settings a reader rebuilds from a capture: its row for the revision it reads, then `d`, then `a`. */
async function restoreOf(load, payload) {
  const sh = await load('js/shareState.js');
  const app = await load('js/appState.js');
  const revision = sh.resolveRevision
    ? sh.resolveRevision(payload, 'capture').revision
    : undefined;
  const settings = {
    ...sh.pristineSettingsFor(payload.s, app.DEFAULT_SETTINGS, revision),
    ...(payload.d || {}),
    ...(payload.a || {}),
  };
  delete settings.preset_scenario;
  delete settings.quality_tier;
  return { accepted: true, value: { settings, bodies: payload.b ?? null } };
}

const refused = e => ({ accepted: false, problems: [String(e.message ?? e)] });

export default {
  async make(load) {
    await register(load);
    const sh = await load('js/shareState.js');
    const app = await load('js/appState.js');
    const seed = 77;
    // The world as revision 2 builds it, with one setting changed by hand.
    const world = {
      ...sh.pristineSettingsFor(ID, app.DEFAULT_SETTINGS, 2),
      sim_speed: 9,
    };
    const capture = (record, revision = 2) =>
      sh.buildPayload({
        scenario: ID,
        seed,
        settings: world,
        generationSettings: world,
        DEFAULT_SETTINGS: app.DEFAULT_SETTINGS,
        bodies: BODIES,
        revision,
        record,
      });
    const expected = { ...world };
    delete expected.preset_scenario;
    delete expected.quality_tier;
    const stored = capture(true);
    // What a writer without form (i) would make: a delta from revision 2's row.
    const naive = { ...stored, v: 2, d: { sim_speed: 9 } };
    delete naive.r;
    const store = {
      v: 3,
      id: 'rv-1',
      name: 'Revision 2',
      scenario: ID,
      runs: { A: { samples: [{ t: 0, d: 1 }], recordedAt: 1 } },
      units: {},
      format: 'gravitas.experiment-result',
      formatVersion: 1,
      initialState: stored,
    };
    const manifest = {
      format: 'gravitas.experiment',
      formatVersion: 1,
      kind: 'comparison',
      experiment: { name: 'Revision 2', notes: '' },
      selection: { objects: [], primary: null, metrics: [] },
      initialState: stored,
      parameterChange: { variables: [], incidental: [] },
    };
    const examples = {
      scenarioPack: {
        format: 'gravitas.scenario-pack',
        formatVersion: 1,
        id: 'rv-pack',
        version: '1.0.0',
        locales: ['en'],
        title: { en: 'Revision 2' },
        summary: { en: 'A revision.' },
        tags: [],
        seed: 7,
        scenario: ID,
        settings: {},
      },
    };
    const { EXAMPLE_INVESTIGATION } = await load('js/composer/example.js');
    const investigationPack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const { INTRO_ASTRONOMY } = await load(
      'js/data/courses/intro-astronomy.js'
    );
    const coursePack = JSON.parse(JSON.stringify(INTRO_ASTRONOMY));
    return {
      link: { fragment: await sh.encodePayload(capture(false)) },
      store,
      naiveStore: { ...store, initialState: naive },
      manifest: JSON.stringify(manifest),
      scenarioPack: examples.scenarioPack,
      investigationPack,
      coursePack,
      expected: { settings: expected, bodies: BODIES },
    };
  },

  /** {what, doc}: what the reader of this tree says of one record. */
  async read(load, { what, doc }) {
    await register(load);
    try {
      if (what === 'link') {
        const { decodePayload } = await load('js/shareState.js');
        const p = await decodePayload(doc.fragment);
        return { accepted: true, value: { s: p.s, r: p.r ?? null } };
      }
      if (what === 'store') {
        const { migrate } = await load('js/experiments/store.js');
        const r = migrate(doc);
        if (!r.ok) return { accepted: false, problems: [r.reason] };
        return restoreOf(load, r.record.initialState);
      }
      if (what === 'manifest') {
        const { importManifest } = await load('js/experiments/exports.js');
        const r = importManifest(doc);
        if (!r.ok) return { accepted: false, problems: [r.reason] };
        return restoreOf(load, r.experiment.initialState);
      }
      if (what === 'scenarioPack') {
        const { checkPack } = await load('js/scenarioPack.js');
        const problems = checkPack(doc);
        return problems.length
          ? {
              accepted: false,
              problems: problems.map(
                p => `${p.path} ${p.code} ${p.message ?? ''}`
              ),
            }
          : { accepted: true, value: { id: doc.id } };
      }
      if (what === 'investigationPack') {
        const { validateInvestigationPack, migrateInvestigationPack } =
          await load('js/platform/investigation.js');
        const { packApi } = await load('js/composer/api.js');
        const migrated = migrateInvestigationPack(doc);
        if (!migrated.ok) return { accepted: false, problems: [migrated.code] };
        const problems = validateInvestigationPack(migrated.pack, packApi());
        return problems.length
          ? {
              accepted: false,
              problems: problems.map(
                p => `${p.path} ${p.code} ${p.message ?? ''}`
              ),
            }
          : { accepted: true, value: { id: doc.id } };
      }
      if (what === 'coursePack') {
        const { validateCoursePack } = await load('js/course/pack.js');
        const { courseApi } = await load('js/course/api.js');
        const problems = validateCoursePack(doc, courseApi());
        return problems.length
          ? {
              accepted: false,
              problems: problems.map(
                p => `${p.path} ${p.code} ${p.message ?? ''}`
              ),
            }
          : { accepted: true, value: { id: doc.id } };
      }
      throw new Error(`unknown record ${what}`);
    } catch (e) {
      return refused(e);
    }
  },
};
