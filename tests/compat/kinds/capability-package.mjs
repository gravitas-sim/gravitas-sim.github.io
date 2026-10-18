// A capability package manifest (gravitas-extension.json), as the SDK's
// example ships it and as the catalog stores it in IndexedDB.
// Reader: validateManifest -> a list of problems.
export default {
  id: 'capability-package',
  label: 'capability package manifest',
  format: 'gravitas.capability-package/1',
  newToOld: 'accepts',
  capabilities:
    'the manifest names what it provides and uses; a reader missing one refuses by id',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'refused',
  async make(load, json) {
    return json('sdk/examples/kepler-third-law/gravitas-extension.json');
  },
  async read(load, doc) {
    const { validateManifest } = await load('js/platform/manifest.js');
    const problems = validateManifest(doc);
    return problems.length
      ? {
          accepted: false,
          problems: problems.map(p => `${p.path} ${p.message ?? p.code}`),
        }
      : { accepted: true, value: { id: doc.id, version: doc.version } };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
