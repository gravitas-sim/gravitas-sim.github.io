// =============================================================================
// What `sdk init` writes
// -----------------------------------------------------------------------------
// A course pack and a capability start valid: a course needs only lessons
// Gravitas already has, and an instrument can start as one working readout.
// A data pack cannot, because its whole point is data the author brings: it
// starts as a record with every field present and empty, and `sdk validate`
// lists what to fill in, by file and line. Nothing here invents a number.
// =============================================================================

const json = v => `${JSON.stringify(v, null, 2)}\n`;
const camel = id => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const constant = id => id.toUpperCase().replace(/-/g, '_');
const title = id => id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

const base = (id, kind) => ({
  format: 'gravitas.capability-package',
  formatVersion: 1,
  id: `community.${id}`,
  version: '0.1.0',
  kind,
  gravitas: '^1.0.0',
  title: { en: title(id), es: '' },
});

export const TEMPLATES = {
  'data-pack': id => ({
    'gravitas-extension.json': json({
      ...base(id, 'declarative'),
      provides: {
        dataPacks: [{ id, provenance: 'pack.json', file: 'series.json' }],
      },
      assets: [
        { path: 'series.json', role: 'data', offline: 'optional' },
        { path: 'pack.json', role: 'provenance', offline: 'none' },
      ],
      citations: [],
      licenses: [{ scope: '*.json', license: '' }],
      offline: { policy: 'precache' },
      validation: [],
      migrations: [],
    }),
    'pack.json': json({
      format: 'gravitas.observation-data-pack',
      formatVersion: 1,
      id,
      version: '0.1.0',
      title: '',
      object: { name: '' },
      facility: { observatory: '' },
      dataType: 'light-curve',
      origin: 'observed',
      credit: '',
      license: { status: '', statement: '' },
      retrieved: '',
      time: { scale: '', reference: '', unit: 'd' },
      columns: [
        { name: 'time', unit: 'd' },
        { name: 'flux', unit: '' },
        { name: 'flux error', unit: '', uncertaintyOf: 'flux' },
      ],
      masks: [],
      source: { urls: [], citations: [] },
      raw: [],
      derived: { file: 'series.json', bytes: 0, sha256: '' },
      transformation: { script: 'build.mjs', version: '0.1.0', steps: [] },
      assumptions: [],
      reductions: [],
      validation: { check: '', against: [] },
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    }),
    'build.mjs': `// The transformation that writes series.json and pack.json from the raw
// product. It is code, so it belongs to the pull request and is never part of
// the archive. sdk/examples/tess-hd209458-one-transit/build.mjs is a complete
// one; sdk/README.md, "Writing a data pack", says what it must record.
throw new Error('write the transformation for ${id}');
`,
    'README.md': `# ${title(id)}\n\nA data-pack extension. \`npm run sdk -- validate .\` lists what is still to fill in.\n`,
  }),

  'course-pack': id => ({
    'gravitas-extension.json': json({
      ...base(id, 'declarative'),
      provides: { courses: [{ id, file: 'course.json' }] },
      assets: [{ path: 'course.json', role: 'data', offline: 'optional' }],
      citations: [],
      licenses: [{ scope: 'course.json', license: 'CC-BY-4.0' }],
      offline: { policy: 'precache' },
      validation: [],
      migrations: [],
    }),
    'course.json': json({
      format: 'gravitas.course-pack',
      formatVersion: 1,
      id,
      version: '0.1.0',
      locales: ['en'],
      title: { en: title(id) },
      units: [
        {
          id: 'orbits',
          title: { en: 'Orbits' },
          lessons: [
            { lesson: 'keplers-laws', teacherNote: { en: 'Start here.' } },
          ],
        },
      ],
    }),
    'README.md': `# ${title(id)}\n\nA course-pack extension: an ordering of lessons Gravitas already has.\n`,
  }),

  capability: id => ({
    'gravitas-extension.json': json({
      ...base(id, 'built-in'),
      provides: {
        widgetFamilies: [
          { id, widgets: [`${id}-readout`], entry: `builtin:widgets/${id}` },
        ],
      },
      assets: [
        { path: `${camel(id)}Widgets.js`, role: 'code', offline: 'core' },
      ],
      citations: [],
      licenses: [{ scope: '*.js', license: 'MIT' }],
      offline: { policy: 'precache' },
      validation: [],
      migrations: [],
    }),
    [`${camel(id)}Widgets.js`]: `// ${title(id)}: an instrument family for Gravitas.
//
// Executable, so it is reviewed, vendored into Gravitas and compiled with it;
// it is never installed into a running copy. It imports nothing: an import
// of a Gravitas module is outside the SDK's public API (sdk/README.md).

const READOUT = {
  id: '${id}-readout',
  title: '${title(id)}',
  note: 'Say in a sentence what this instrument shows.',
  controls: [
    { id: 'x', label: 'A value', unit: '', min: 0, max: 10, step: 0.1, value: 1, decimals: 1 },
  ],
  compute(v) {
    return { doubled: 2 * v.x };
  },
  readout(v) {
    return [{ label: 'Twice the value', value: (2 * v.x).toFixed(1) }];
  },
  draw(canvas, v) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(String(2 * v.x), 10, 20);
  },
};

export const ${constant(id)}_WIDGETS = [READOUT];
`,
    'README.md': `# ${title(id)}\n\nA capability extension: an instrument family, reviewed and vendored into Gravitas.\n`,
  }),
};

/**
 * The files for a new extension.
 * @param {keyof typeof TEMPLATES} type
 * @param {string} id - A kebab-case public id
 */
export function scaffold(type, id) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
    throw new Error(`"${id}" is not a kebab-case id`);
  return TEMPLATES[type](id);
}
