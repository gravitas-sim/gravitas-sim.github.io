// What the catalog keeps in IndexedDB for an installed pack: one record with
// its identity, its manifest and its files as text. Reader: the platform's own
// manifest validator, then the pack decoded from the stored file.
export default {
  id: 'archive-record',
  label: 'catalog IndexedDB record',
  format: 'catalog store record (db gravitas-catalog, version 1)',
  newToOld: 'accepts',
  capabilities:
    'the record type names what it holds; a reader that does not know the type ignores the record',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load, json) {
    const manifest = json(
      'sdk/examples/tess-hd209458-one-transit/gravitas-extension.json'
    );
    const series = json('sdk/examples/tess-hd209458-one-transit/series.json');
    const file = manifest.provides.dataPacks[0].file;
    return {
      id: manifest.id,
      type: 'data-pack',
      version: manifest.version,
      checksum: 'compat',
      manifest,
      files: { [file]: JSON.stringify(series) },
    };
  },
  async read(load, record) {
    const { validateManifest } = await load('js/platform/manifest.js');
    const { installedObservation } = await load('js/catalog/install.js');
    const problems = validateManifest(record.manifest);
    if (problems.length)
      return {
        accepted: false,
        problems: problems.map(p => `${p.path} ${p.message ?? p.code}`),
      };
    const o = installedObservation(record);
    return {
      accepted: true,
      value: { id: record.id, points: o.x.values.length },
    };
  },
  async rewrite(load, record) {
    return JSON.parse(JSON.stringify(record));
  },
};
