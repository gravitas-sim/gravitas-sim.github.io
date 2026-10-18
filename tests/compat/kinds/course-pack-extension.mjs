// A course pack in its extension form (/1), as the SDK example ships it.
// Reader: validateCoursePack(c, api) in js/platform/course.js.
export default {
  id: 'course-pack-extension',
  label: 'course pack /1 (extension form)',
  format: 'gravitas.course-pack/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'refused',
  async make(load, json) {
    return json('sdk/examples/finding-exoplanets/course.json');
  },
  async read(load, doc) {
    const { validateCoursePack } = await load('js/platform/course.js');
    const { courseApi } = await load('js/course/api.js');
    const api = courseApi();
    const problems = validateCoursePack(doc, {
      locales: api.locales,
      lessons: new Set(api.lessons),
    });
    return problems.length
      ? {
          accepted: false,
          problems: problems.map(p => `${p.path} ${p.message}`),
        }
      : {
          accepted: true,
          value: { id: doc.id, version: doc.version, units: doc.units.length },
        };
  },
  async rewrite(load, doc) {
    return doc;
  },
};
