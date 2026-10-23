// A question bank (the file the Composer saves beside a pack).
// Reader: validateQuestionBankWith -> a list of problems (empty when it reads it).
export default {
  id: 'question-bank',
  label: 'question bank',
  format: 'gravitas.question-bank/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a'.
  unknownFields: 'refused',
  async make(load) {
    const { EXAMPLE_INVESTIGATION } = await load('js/composer/example.js');
    return {
      format: 'gravitas.question-bank',
      formatVersion: 1,
      id: 'compat-bank',
      version: '1.0.0',
      locales: ['en', 'es'],
      title: { en: 'Compat bank' },
      items: JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION.bank.items)),
    };
  },
  async read(load, doc) {
    const { validateQuestionBankWith } = await load(
      'js/platform/questionBank.js'
    );
    const { makeChecker } = await load('js/platform/investigation.js');
    const { packApi } = await load('js/composer/api.js');
    const problems = validateQuestionBankWith(doc, packApi(), makeChecker);
    return problems.length
      ? { accepted: false, problems: problems.map(p => `${p.path} ${p.code}`) }
      : { accepted: true, value: { id: doc.id, items: doc.items.length } };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
