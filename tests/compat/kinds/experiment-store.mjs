// The record the bench keeps in localStorage for a saved comparison
// (experiment store, v 3). Reader: migrate -> {ok, record, reason}.
export default {
  id: 'experiment-store',
  label: 'saved experiment (localStorage)',
  format: 'experiment store record (v 3)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make() {
    return {
      v: 3,
      id: 'compat-1',
      name: 'Compat comparison',
      scenario: 'binary-pair',
      runs: {
        A: { samples: [{ t: 0, d: 1 }], recordedAt: 1 },
        B: { samples: [{ t: 0, d: 2 }], recordedAt: 2 },
      },
      units: {},
      format: 'gravitas.experiment-result',
      formatVersion: 1,
    };
  },
  async read(load, doc) {
    const { migrate } = await load('js/experiments/store.js');
    const r = migrate(doc);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    const { savedAt, updatedAt, ...rest } = r.record;
    return { accepted: true, value: rest };
  },
  async rewrite(load, doc) {
    const { migrate } = await load('js/experiments/store.js');
    return migrate(doc).record;
  },
};
