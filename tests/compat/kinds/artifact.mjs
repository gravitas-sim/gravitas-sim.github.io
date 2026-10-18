// gravitas.artifact/1: the measurement envelope an instrument hands on.
// Reader: validateArtifact (a list of problems, empty when it reads it).
export default {
  id: 'artifact',
  label: 'artifact envelope',
  format: 'gravitas.artifact/1',
  // What a 2.0.0 reader says of a record the current writer makes.
  newToOld: 'accepts',
  // Required capabilities: the envelope names none.
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const { artifact } = await load('js/platform/artifact.js');
    return artifact({
      id: 'compat-1',
      source: { kind: 'pipeline', id: 'hd209458-s56' },
      quantities: [
        {
          id: 'depth',
          value: 0.0146,
          unit: '',
          uncertainty: { kind: 'sigma', sigma: 0.0003, basis: 'data' },
          origin: 'measured',
        },
      ],
    });
  },
  async read(load, doc) {
    const { validateArtifact } = await load('js/platform/artifact.js');
    const problems = validateArtifact(doc);
    return problems.length
      ? { accepted: false, problems: problems.map(p => `${p.path} ${p.code}`) }
      : { accepted: true, value: doc };
  },
  // The rewrite is what a new build would save after reading: the same record.
  async rewrite(load, doc) {
    return doc;
  },
};
