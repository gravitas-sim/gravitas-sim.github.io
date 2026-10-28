// =============================================================================
// What `sdk init` writes
// -----------------------------------------------------------------------------
// A course pack, an investigation pack, a scenario pack, an instrument pack and a capability start valid: a course needs
// only lessons Gravitas already has, a scenario only settings it already
// understands, and an instrument can start as one working readout.
// A data pack cannot, because its whole point is data the author brings: it
// starts as a record with every field present and empty, and `sdk validate`
// lists what to fill in, by file and line. Nothing here invents a number.
// =============================================================================

import { EXAMPLE_INVESTIGATION } from '../../js/composer/example.js';
import { readmeFor, readPack } from './fromPack.mjs';

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
    'README.md': `# ${title(id)}\n\nA data-pack extension. \`npm run sdk -- validate .\` lists what is still to fill in.\n\n## Author\n\nWho wrote this, in the words you want printed.\n\n## Sources\n\nWhat it is based on ("original work" is a complete answer).\n`,
  }),

  // `from` is a pack the course builder saved (/studio/course/): /1 or /2.
  'course-pack': (id, { from, source, author, sources } = {}) => {
    const info = from && readPack('course-pack', id, from, source);
    return {
      'gravitas-extension.json': json({
        ...base(id, 'declarative'),
        ...(info && { version: info.version, title: info.title }),
        provides: { courses: [{ id, file: 'course.json' }] },
        assets: [{ path: 'course.json', role: 'data', offline: 'optional' }],
        citations: [],
        licenses: [{ scope: 'course.json', license: 'CC-BY-4.0' }],
        offline: { policy: 'precache' },
        validation: [],
        migrations: [],
      }),
      'course.json': info
        ? json(info.pack)
        : json({
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
                  {
                    lesson: 'keplers-laws',
                    teacherNote: { en: 'Start here.' },
                  },
                ],
              },
            ],
          }),
      'README.md': info
        ? readmeFor('course-pack', id, source, info, { author, sources })
        : `# ${title(id)}\n\nA course-pack extension: an ordering of lessons Gravitas already has.\n\n## Author\n\nWho wrote this, in the words you want printed.\n\n## Sources\n\nWhat it is based on ("original work" is a complete answer).\n`,
    };
  },

  // The composer's own example investigation, under the new id: a pack that
  // passes every check, which is the best place for an author to start from.
  // `from` is a pack the Composer saved (a remix too): wrapped as it is, under
  // the package's id (sdk/lib/fromPack.mjs).
  'investigation-pack': (id, { from, source, author, sources } = {}) => {
    const info = from && readPack('investigation-pack', id, from, source);
    return {
      'gravitas-extension.json': json({
        ...base(id, 'declarative'),
        ...(info && { version: info.version, title: info.title }),
        provides: { investigations: [{ id, file: 'investigation.json' }] },
        assets: [
          { path: 'investigation.json', role: 'data', offline: 'optional' },
        ],
        citations: info?.citations ?? [],
        licenses: [{ scope: 'investigation.json', license: 'CC-BY-4.0' }],
        offline: { policy: 'precache' },
        validation: [],
        migrations: [],
      }),
      'investigation.json': json(
        info ? info.pack : { ...EXAMPLE_INVESTIGATION, id }
      ),
      'README.md': info
        ? readmeFor('investigation-pack', id, source, info, { author, sources })
        : `# ${title(id)}\n\nAn investigation-pack extension: a guided investigation as data. The Studio's lesson composer (/studio/lesson/) writes \`investigation.json\`.\n\n## Author\n\nWho wrote this, in the words you want printed.\n\n## Sources\n\nWhat it is based on ("original work" is a complete answer).\n`,
    };
  },

  // `from` is a pack the Scenario Studio exported (/studio/), written as it is:
  // the Studio's file is the scenario, and the manifest is the wrapper.
  'scenario-pack': (id, { from, source, author, sources } = {}) => {
    const info = from && readPack('scenario-pack', id, from, source);
    return {
      'gravitas-extension.json': json({
        ...base(id, 'declarative'),
        ...(info && { version: info.version, title: info.title }),
        provides: { scenarios: [{ id, file: 'scenario.json' }] },
        assets: [{ path: 'scenario.json', role: 'data', offline: 'optional' }],
        citations: [],
        licenses: [{ scope: 'scenario.json', license: 'CC-BY-4.0' }],
        offline: { policy: 'precache' },
        validation: [{ check: 'registry:sdk-extensions' }],
        migrations: [],
      }),
      'scenario.json': info
        ? json(info.pack)
        : json({
            format: 'gravitas.scenario-pack',
            formatVersion: 1,
            id,
            version: '0.1.0',
            locales: ['en'],
            title: { en: title(id) },
            summary: { en: 'Five planets on circular orbits round a star.' },
            seed: 1,
            settings: {
              num_black_holes: 0,
              num_stars: 1,
              num_planets: 5,
              num_gas_giants: 0,
              enable_asteroids: false,
              num_asteroids: 0,
              placement: 'Circular',
            },
          }),
      'README.md': info
        ? readmeFor('scenario-pack', id, source, info, { author, sources })
        : `# ${title(id)}\n\nA scenario-pack extension: settings, a seed and bodies, as data. The Scenario Studio (/studio/) writes \`scenario.json\`; \`npm run sdk -- init scenario-pack ${id} --from <export.json>\` wraps one.\n\n## Author\n\nWho wrote this, in the words you want printed.\n\n## Sources\n\nWhat it is based on ("original work" is a complete answer).\n`,
    };
  },

  // A telescope of the course's own. It starts as a typical entry (the
  // library's label for a convention, not a measurement) with one value, the
  // aperture, so it validates; `sdk init` invents no number about a real
  // instrument. Replace it with a facility, each value cited (INSTRUMENTS.md).
  'instrument-pack': id => ({
    'gravitas-extension.json': json({
      ...base(id, 'declarative'),
      provides: { instruments: [{ id, file: 'instrument.json' }] },
      assets: [{ path: 'instrument.json', role: 'data', offline: 'optional' }],
      citations: [],
      licenses: [{ scope: 'instrument.json', license: 'CC-BY-4.0' }],
      offline: { policy: 'precache' },
      validation: [{ check: 'registry:sdk-extensions' }],
      migrations: [],
    }),
    'instrument.json': json({
      format: 'gravitas.instrument',
      formatVersion: 1,
      id,
      sources: {
        'course-convention': {
          kind: 'typical',
          title: 'A convention of this course, not a measurement',
          authors: 'The course author',
          year: new Date().getFullYear(),
          ref: 'this extension',
          retrieved: new Date().toISOString().slice(0, 10),
          method: 'Chosen by the course author for teaching.',
          rights: 'The course author own convention.',
        },
      },
      facility: {
        id,
        class: 'campus',
        typical: true,
        name: title(id),
        telescope: {
          name: 'A teaching telescope',
          aperture: { v: 0.4, u: 'm', s: 'course-convention' },
        },
        instruments: [
          { id: 'camera', kind: 'imager', name: 'A teaching camera' },
        ],
      },
    }),
    'README.md': `# ${title(id)}\n\nAn instrument-pack extension: one telescope with its instruments, every value cited (INSTRUMENTS.md). \`instrument.json\` starts as a typical entry; replace it with a real facility, each value with a registry unit and a source that has a retrieval date and a rights basis, and leave out what the sources do not state. \`npm run sdk -- validate\` lists what is wrong, by field.\n`,
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
 * @param {{from?: object, source?: string, author?: string, sources?: string}} [opts]
 *   - `from`: the parsed pack a studio saved, `source` its file name, and the
 *   author's words for the README (sdk/lib/fromPack.mjs)
 */
export function scaffold(type, id, opts = {}) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
    throw new Error(`"${id}" is not a kebab-case id`);
  return TEMPLATES[type](id, opts);
}
