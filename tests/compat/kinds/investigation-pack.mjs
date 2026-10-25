// An investigation pack (the activity package a teacher composes).
// Reader: validateInvestigationPack(pack, api) after migrateInvestigationPack.
export default {
  id: 'investigation-pack',
  label: 'investigation pack',
  format: 'gravitas.investigation-pack/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'refused',
  async make(load) {
    const { EXAMPLE_INVESTIGATION } = await load('js/composer/example.js');
    return JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
  },
  async read(load, doc) {
    const { validateInvestigationPack, migrateInvestigationPack } = await load(
      'js/platform/investigation.js'
    );
    const { packApi } = await load('js/composer/api.js');
    const migrated = migrateInvestigationPack(doc);
    if (!migrated.ok) return { accepted: false, problems: [migrated.code] };
    const problems = validateInvestigationPack(migrated.pack, packApi());
    return problems.length
      ? { accepted: false, problems: problems.map(p => `${p.path} ${p.code}`) }
      : {
          accepted: true,
          value: { id: migrated.pack.id, steps: migrated.pack.steps.length },
        };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
