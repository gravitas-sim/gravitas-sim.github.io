// A course pack /2 (the builder form), the file a teacher saves and shares.
// Reader: validateCoursePack -> a list of problems (empty when it reads it).
export default {
  id: 'course-pack',
  label: 'course pack /2',
  format: 'gravitas.course-pack/2',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'refused',
  async make(load) {
    const { INTRO_ASTRONOMY } = await load(
      'js/data/courses/intro-astronomy.js'
    );
    return JSON.parse(JSON.stringify(INTRO_ASTRONOMY));
  },
  async read(load, doc) {
    const { validateCoursePack } = await load('js/course/pack.js');
    const { courseApi } = await load('js/course/api.js');
    const problems = validateCoursePack(doc, courseApi());
    return problems.length
      ? { accepted: false, problems: problems.map(p => `${p.path} ${p.code}`) }
      : {
          accepted: true,
          value: { id: doc.id, version: doc.version, units: doc.units.length },
        };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
