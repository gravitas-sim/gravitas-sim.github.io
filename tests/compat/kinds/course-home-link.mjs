// The course home link (#c2...): a whole course pack in a fragment.
// Reader: readCourseFragment -> the pack, or throws wrongKind/newerVersion/corrupt.
export default {
  id: 'course-home-link',
  label: 'course home link',
  format: 'course home link (prefix c, version 2)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'n/a',
  async make(load) {
    const { INTRO_ASTRONOMY } = await load(
      'js/data/courses/intro-astronomy.js'
    );
    const { courseLink } = await load('js/course/links.js');
    const link = await courseLink(INTRO_ASTRONOMY, {
      root: 'https://example.test/',
    });
    return { hash: link.url.split('#')[1] };
  },
  async read(load, fx) {
    const { readCourseFragment } = await load('js/course/links.js');
    try {
      const pack = await readCourseFragment(fx.hash);
      return {
        accepted: true,
        value: { id: pack.id, version: pack.version, units: pack.units.length },
      };
    } catch (e) {
      return { accepted: false, problems: [String(e.message)] };
    }
  },
  async rewrite(load, fx) {
    const { readCourseFragment, courseLink } = await load('js/course/links.js');
    const pack = await readCourseFragment(fx.hash);
    const link = await courseLink(pack, { root: 'https://example.test/' });
    return { hash: link.url.split('#')[1] };
  },
};
