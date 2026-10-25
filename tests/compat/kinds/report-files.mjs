// The reports written and never read: gravitas.lab3d-guide-report/1,
// gravitas.mission-lab-report/1 and gravitas.course-manifest/1. A student's
// file in any of them cannot be opened again, in 2.0.0 or now. The row holds
// that: no module outside the writer names the format to read it.
const FORMATS = [
  'gravitas.lab3d-guide-report',
  'gravitas.mission-lab-report',
  'gravitas.course-manifest',
];

export default {
  id: 'report-files',
  label: 'reports written and never read',
  format:
    'gravitas.lab3d-guide-report/1, gravitas.mission-lab-report/1, gravitas.course-manifest/1',
  newToOld: 'accepts',
  capabilities: 'none: nothing reads them',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make() {
    return { formats: FORMATS };
  },
  async read(load, fx, { tree }) {
    const { readdirSync, readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const walk = dir =>
      readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : e.name.endsWith('.js')
            ? [path.join(dir, e.name)]
            : []
      );
    const files = walk(path.join(tree, 'js'));
    // A reader compares a loaded file's format with the constant; the writer
    // only assigns it. Count the files that compare.
    const readers = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const format of fx.formats)
        if (
          new RegExp(
            `(===|!==)\\\\s*['"]${format}['"]|\\\\.format\\\\s*(===|!==)\\\\s*(REPORT_FORMAT|FORMAT)`
          ).test(text) &&
          text.includes(format)
        )
          readers.push(`${path.relative(tree, f)} reads ${format}`);
    }
    return {
      accepted: readers.length === 0,
      problems: readers,
      value: { readers },
    };
  },
  async rewrite(load, fx) {
    return fx;
  },
};
