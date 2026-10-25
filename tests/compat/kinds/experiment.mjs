// An experiment manifest (gravitas.experiment/1), the file the runner opens.
// Reader: migrateExperiment then validateExperiment -> a list of problems.
export default {
  id: 'experiment',
  label: 'experiment manifest',
  format: 'gravitas.experiment/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const m = await load('js/experiments/experimentManifest.js');
    return {
      format: m.FORMAT,
      formatVersion: 1,
      title: 'Where does the planet stop being bound?',
      model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
      initial: { settings: {} },
      seeds: ['a', 'b'],
      vary: [
        { parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 4 },
      ],
      observables: {
        metrics: ['distance_to_primary'],
        roles: m.SWEEPABLE['binary-planet-lab'].roles,
      },
      stop: { duration: 10000, events: [] },
      numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
      limits: m.defaultLimits('desktop', { hardwareConcurrency: 8 }),
      summaries: ['mean', 'status-counts'],
    };
  },
  async read(load, doc) {
    const m = await load('js/experiments/experimentManifest.js');
    const migrated = m.migrateExperiment(doc);
    const manifest = migrated?.manifest ?? migrated;
    const problems = m.validateExperiment(manifest);
    return problems.length
      ? {
          accepted: false,
          problems: problems.map(p => `${p.path} ${p.message ?? p.code}`),
        }
      : {
          accepted: true,
          value: {
            title: manifest.title,
            seeds: manifest.seeds,
            vary: manifest.vary,
          },
        };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
