import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

import { run } from '../sdk/cli.mjs';
import * as api from '../sdk/lib/api.mjs';

// =============================================================================
// The Extension SDK's contract, held from the outside
// -----------------------------------------------------------------------------
// Everything here goes through the SDK's public surface: the CLI (run(), the
// same function `npm run sdk` calls) and sdk/lib/api.mjs. Nothing imports a
// private module path, and the first test holds the examples to the same
// rule - an SDK whose own examples need its internals is not one an
// independent author can use. sdk/README.md is the author's guide.
// =============================================================================

const EXAMPLES = [
  'tess-hd209458-one-transit',
  'finding-exoplanets',
  'kepler-third-law',
];
const TYPES = {
  'tess-hd209458-one-transit': 'data-pack',
  'finding-exoplanets': 'course-pack',
  'kepler-third-law': 'capability',
};
const example = name => path.join('sdk', 'examples', name);
const sha256 = b => createHash('sha256').update(b).digest('hex');
const tmp = () =>
  realpathSync(mkdtempSync(path.join(tmpdir(), 'gravitas-sdk-')));

/** Run a CLI command, collecting what it prints. */
async function sdk(...argv) {
  const lines = [];
  const code = await run(argv, { log: s => lines.push(String(s)) });
  return { code, out: lines.join('\n') };
}

const importsOf = file =>
  [
    ...readFileSync(file, 'utf8').matchAll(
      /^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gm
    ),
  ].map(m => m[1] || m[2]);

describe('the public surface', () => {
  test('examples and this suite reach Gravitas only through the SDK', () => {
    const files = [
      'tests/sdkContract.test.js',
      ...EXAMPLES.flatMap(e =>
        readdirSync(example(e))
          .filter(f => /\.m?js$/.test(f))
          .map(f => path.join(example(e), f))
      ),
    ];
    for (const file of files) {
      for (const spec of importsOf(file)) {
        const ok =
          spec.startsWith('node:') ||
          spec === '@jest/globals' ||
          /(^|\/)sdk\/examples\//.test(spec) ||
          /(^|\/)sdk\/(cli|lib\/api)\.mjs$/.test(spec) ||
          /^\.\.\/\.\.\/lib\/api\.mjs$/.test(spec);
        expect([file, spec, ok]).toEqual([file, spec, true]);
      }
    }
  });

  test('every export of the API is declared in its types, and nothing more', () => {
    const dts = readFileSync('sdk/types/index.d.ts', 'utf8');
    const declared = new Set(
      [...dts.matchAll(/^export (?:const|function) (\w+)/gm)].map(m => m[1])
    );
    expect([...declared].sort()).toEqual(Object.keys(api).sort());
  });

  test('the API names the formats, the types and the platform it speaks', async () => {
    expect(api.SDK_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(api.FORMATS).toMatchObject({
      'gravitas.capability-package': 1,
      'gravitas.observation-data-pack': 1,
      'gravitas.course-pack': 1,
    });
    expect(Object.keys(api.EXTENSION_TYPES).sort()).toEqual([
      'capability',
      'course-pack',
      'data-pack',
    ]);
    expect(api.acceptsPlatform('^1.0.0')).toBe(true);
    expect(api.acceptsPlatform('^2.0.0')).toBe(false);
    expect(api.acceptsPlatform('not a range')).toBe(false);
    const ids = await api.publicIds();
    expect(ids.lessons.has('transit-photometry')).toBe(true);
    expect(ids.widgets.has('launch')).toBe(true);
    expect(ids.dataPacks.has('tess-hd209458-s56-lc')).toBe(true);
    expect(ids.lessonTitles.get('transit-photometry')).toMatchObject({
      en: expect.any(String),
      es: expect.any(String),
    });
  });

  test('an installed pack is readable, and a dataset that predates packs says so', async () => {
    const { record, observation } = await api.installedDataPack(
      'tess-hd209458-s56-lc'
    );
    expect(record.format).toBe('gravitas.observation-data-pack');
    expect(api.checkObservation(observation)).toEqual([]);
    await expect(
      api.installedDataPack('sdss-dr18-stellar-spectra')
    ).rejects.toThrow(/predates gravitas.observation-data-pack/);
    await expect(api.installedDataPack('nothing-here')).rejects.toThrow(
      /no data pack/
    );
  });
});

describe.each(EXAMPLES)('the %s example', name => {
  test('is valid, with no warning but a capability’s wait to be vendored', async () => {
    const { code, out } = await sdk('validate', example(name), '--json');
    expect(code).toBe(0);
    const [result] = JSON.parse(out);
    expect(result.type).toBe(TYPES[name]);
    const warnings = result.findings
      .filter(f => f.severity === 'warning')
      .map(f => f.path);
    expect(warnings).toEqual(
      name === 'kepler-third-law' ? ['provides.widgetFamilies[0].entry'] : []
    );
  });

  test('passes its tests', async () => {
    const { code, out } = await sdk('test', example(name));
    expect(code).toBe(0);
    expect(out).toMatch(/\d+ passed, 0 failed/);
    expect(out).not.toMatch(/FAIL/);
  });

  test('packs to the same bytes every time, in the archive format', async () => {
    const a = tmp();
    const b = tmp();
    expect((await sdk('pack', example(name), '--out', a)).code).toBe(0);
    expect((await sdk('pack', example(name), '--out', b)).code).toBe(0);
    const [file] = readdirSync(a);
    expect(file).toMatch(/^example\.[a-z0-9.-]+-1\.0\.0\.gxp$/);
    const bytes = readFileSync(path.join(a, file));
    expect(sha256(bytes)).toBe(sha256(readFileSync(path.join(b, file))));
    // ustar, every entry a regular file with mtime, uid and gid 0, the manifest
    // first and CHECKSUMS last.
    const tar = gunzipSync(bytes);
    const names = [];
    for (let at = 0; at + 512 <= tar.length;) {
      const h = tar.subarray(at, at + 512);
      if (h.every(x => x === 0)) break;
      names.push(h.subarray(0, 100).toString().replace(/\0.*$/s, ''));
      expect(h.subarray(257, 262).toString()).toBe('ustar');
      expect(parseInt(h.subarray(136, 147).toString(), 8)).toBe(0);
      expect(parseInt(h.subarray(108, 115).toString(), 8)).toBe(0);
      expect(String.fromCharCode(h[156])).toBe('0');
      at +=
        512 +
        Math.ceil(parseInt(h.subarray(124, 135).toString(), 8) / 512) * 512;
    }
    expect(names[0]).toBe('gravitas-extension.json');
    expect(names.at(-1)).toBe('CHECKSUMS');
    expect(names.some(n => /\.m?js$/.test(n))).toBe(
      TYPES[name] === 'capability'
    );
  });

  test('its archive validates, tests and inspects as the directory does', async () => {
    const dir = tmp();
    await sdk('pack', example(name), '--out', dir);
    const archive = path.join(dir, readdirSync(dir)[0]);
    expect((await sdk('validate', archive)).code).toBe(0);
    expect((await sdk('test', archive)).out).toMatch(/0 failed/);
    const { code, out } = await sdk('inspect', archive, '--preview');
    expect(code).toBe(0);
    expect(out).toContain(`${TYPES[name]} (`);
  });
});

describe('the data-pack example is reproducible', () => {
  test('its transformation rebuilds both files byte for byte', async () => {
    const { build } =
      await import('../sdk/examples/tess-hd209458-one-transit/build.mjs');
    for (const [name, text] of Object.entries(await build())) {
      expect(
        readFileSync(
          path.join(example('tess-hd209458-one-transit'), name),
          'utf8'
        )
      ).toBe(text);
    }
  });

  test('a series changed after it was built is caught, at the field and line', async () => {
    const dir = tmp();
    cpSync(example('tess-hd209458-one-transit'), dir, { recursive: true });
    const file = path.join(dir, 'series.json');
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('"errStepPpm": 5', '"errStepPpm": 6')
    );
    const { code, out } = await sdk('validate', dir, '--json');
    expect(code).toBe(1);
    const [finding] = JSON.parse(out)[0].findings;
    expect(finding).toMatchObject({
      severity: 'error',
      file: 'pack.json',
      path: 'derived.sha256',
    });
    expect(finding.line).toBeGreaterThan(1);
  });
});

describe('what is wrong, where', () => {
  const expected = JSON.parse(
    readFileSync('sdk/fixtures/expected.json', 'utf8')
  );

  test.each(Object.keys(expected))(
    'the %s fixture reports exactly its findings',
    async name => {
      const { code, out } = await sdk(
        'validate',
        path.join('sdk', 'fixtures', name),
        '--json'
      );
      expect(code).toBe(1);
      const [result] = JSON.parse(out);
      expect({ type: result.type, findings: result.findings }).toEqual(
        expected[name]
      );
      for (const f of result.findings) expect(f.line).toBeGreaterThan(0);
    }
  );

  test('the fixtures cover what the prompt asks the SDK to check', () => {
    const messages = Object.values(expected)
      .flatMap(e => e.findings.map(f => f.message))
      .join('\n');
    expect(messages).toMatch(/names no code/); // declarative safety
    expect(messages).toMatch(/implements platform/); // API compatibility
    expect(messages).toMatch(/every declared locale/); // localization completeness
    expect(messages).toMatch(/never core/); // offline assets
    expect(messages).toMatch(/no entry in licenses covers/); // licences
    expect(messages).toMatch(/already has/); // public ids
    expect(messages).toMatch(/not valid JSON/);
  });
});

describe('init', () => {
  test('a course pack and a capability start valid; a data pack starts as a list of what to fill in', async () => {
    const root = tmp();
    for (const type of ['course-pack', 'capability']) {
      const dir = path.join(root, type);
      expect((await sdk('init', type, `my-${type}`, '--dir', dir)).code).toBe(
        0
      );
      const [result] = JSON.parse((await sdk('validate', dir, '--json')).out);
      expect(result.findings.filter(f => f.severity === 'error')).toEqual([]);
      // Localization completeness is reported even when nothing is wrong.
      expect(result.findings.map(f => f.path)).toContain('title.es');
      expect((await sdk('test', dir)).code).toBe(0);
    }
    const dir = path.join(root, 'data');
    await sdk('init', 'data-pack', 'my-light-curve', '--dir', dir);
    const [result] = JSON.parse((await sdk('validate', dir, '--json')).out);
    const where = result.findings
      .filter(f => f.severity === 'error')
      .map(f => `${f.file} ${f.path}`);
    for (const field of [
      'pack.json title',
      'pack.json credit',
      'pack.json license.status',
      'pack.json raw',
      'pack.json time.scale',
    ]) {
      expect(where).toContain(field);
    }
    expect(where).toContain(
      'gravitas-extension.json provides.dataPacks[0].file'
    );
  });

  test('refuses to write over an existing directory, and a bad id', async () => {
    expect(
      (
        await sdk(
          'init',
          'course-pack',
          'x',
          '--dir',
          example('finding-exoplanets')
        )
      ).code
    ).toBe(2);
    await expect(
      sdk('init', 'course-pack', 'Not An Id', '--dir', path.join(tmp(), 'y'))
    ).rejects.toThrow(/kebab-case/);
  });
});

describe('archives that pack would never write are refused', () => {
  /** A tar entry by hand, so the refusal is tested on real bytes. */
  const entry = (name, body, type = '0') => {
    const h = Buffer.alloc(512, 0);
    h.write(name, 0);
    h.write('0000644\0', 100);
    h.write('0000000\0', 108);
    h.write('0000000\0', 116);
    h.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124);
    h.write('00000000000\0', 136);
    h.write('        ', 148);
    h.write(type, 156);
    h.write('ustar\0', 257);
    let sum = 0;
    for (const x of h) sum += x;
    h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    return Buffer.concat([
      h,
      Buffer.from(body),
      Buffer.alloc((512 - (body.length % 512)) % 512),
    ]);
  };
  const archive = (...entries) => {
    const file = path.join(tmp(), 'bad.gxp');
    writeFileSync(
      file,
      gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]))
    );
    return file;
  };
  const manifest = readFileSync(
    path.join(example('finding-exoplanets'), 'gravitas-extension.json'),
    'utf8'
  );

  test('a path out of the extension, and a link', async () => {
    await expect(
      sdk(
        'inspect',
        archive(
          entry('gravitas-extension.json', manifest),
          entry('../escape.json', '{}')
        )
      )
    ).rejects.toThrow(/not a relative path/);
    await expect(
      sdk(
        'inspect',
        archive(
          entry('gravitas-extension.json', manifest),
          entry('link', '', '2')
        )
      )
    ).rejects.toThrow(/regular files only/);
  });

  test('a file that does not match its checksum', async () => {
    const dir = tmp();
    await sdk('pack', example('finding-exoplanets'), '--out', dir);
    const file = path.join(dir, readdirSync(dir)[0]);
    const tar = gunzipSync(readFileSync(file));
    const at = tar.indexOf('Finding exoplanets');
    tar[at] = 'f'.charCodeAt(0);
    writeFileSync(file, gzipSync(tar));
    const { code, out } = await sdk('validate', file);
    expect(code).toBe(1);
    expect(out).toMatch(/does not match its checksum/);
  });
});

describe('the JSON Schemas describe what the validators accept', () => {
  const schema = name =>
    JSON.parse(readFileSync(`sdk/schemas/${name}.schema.json`, 'utf8'));

  /** The subset of JSON Schema the SDK's schemas use. */
  function valid(s, v) {
    if (s.const !== undefined && v !== s.const) return false;
    if (s.enum && !s.enum.includes(v)) return false;
    const type = Array.isArray(v)
      ? 'array'
      : v === null
        ? 'null'
        : Number.isInteger(v)
          ? 'integer'
          : typeof v;
    if (
      s.type &&
      !(s.type === type || (s.type === 'number' && type === 'integer'))
    )
      return false;
    if (typeof v === 'string') {
      if (s.pattern && !new RegExp(s.pattern).test(v)) return false;
      if (s.minLength && v.length < s.minLength) return false;
    }
    if (Array.isArray(v)) {
      if (s.minItems && v.length < s.minItems) return false;
      if (s.items && !v.every(x => valid(s.items, x))) return false;
    }
    if (type === 'object') {
      for (const k of s.required || []) if (!(k in v)) return false;
      for (const [k, x] of Object.entries(v)) {
        const sub =
          s.properties?.[k] ??
          (s.additionalProperties === false
            ? null
            : typeof s.additionalProperties === 'object'
              ? s.additionalProperties
              : {});
        if (sub === null || !valid(sub, x)) return false;
      }
    }
    return true;
  }

  test('every example and every installed package fits its schema', () => {
    const capability = schema('capability-package-1');
    for (const name of EXAMPLES) {
      expect([
        name,
        valid(
          capability,
          JSON.parse(
            readFileSync(
              path.join(example(name), 'gravitas-extension.json'),
              'utf8'
            )
          )
        ),
      ]).toEqual([name, true]);
    }
    for (const f of readdirSync('capabilities')) {
      expect([
        f,
        valid(
          capability,
          JSON.parse(readFileSync(path.join('capabilities', f), 'utf8'))
        ),
      ]).toEqual([f, true]);
    }
    expect(
      valid(
        schema('course-pack-1'),
        JSON.parse(
          readFileSync(
            path.join(example('finding-exoplanets'), 'course.json'),
            'utf8'
          )
        )
      )
    ).toBe(true);
    const pack = schema('observation-data-pack-1');
    expect(
      valid(
        pack,
        JSON.parse(
          readFileSync(
            path.join(example('tess-hd209458-one-transit'), 'pack.json'),
            'utf8'
          )
        )
      )
    ).toBe(true);
    for (const f of readdirSync('data-packs'))
      expect(
        valid(
          pack,
          JSON.parse(readFileSync(path.join('data-packs', f), 'utf8'))
        )
      ).toBe(true);
  });

  test('and turns away what the validators turn away, where a schema can say it', () => {
    const capability = schema('capability-package-1');
    const m = JSON.parse(
      readFileSync(
        path.join(example('finding-exoplanets'), 'gravitas-extension.json'),
        'utf8'
      )
    );
    expect(valid(capability, { ...m, kind: 'plugin' })).toBe(false);
    expect(valid(capability, { ...m, extra: true })).toBe(false);
    expect(valid(capability, { ...m, licenses: [] })).toBe(false);
    const { units, ...noUnits } = JSON.parse(
      readFileSync(
        path.join(example('finding-exoplanets'), 'course.json'),
        'utf8'
      )
    );
    expect(units.length).toBeGreaterThan(0);
    expect(valid(schema('course-pack-1'), noUnits)).toBe(false);
  });

  test('each schema is a JSON Schema, named for its format', () => {
    for (const [file, format] of [
      ['capability-package-1', 'gravitas.capability-package/1'],
      ['observation-data-pack-1', 'gravitas.observation-data-pack/1'],
      ['course-pack-1', 'gravitas.course-pack/1'],
    ]) {
      const s = schema(file);
      expect(s.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(s.title).toBe(format);
      expect(statSync(`sdk/schemas/${file}.schema.json`).size).toBeGreaterThan(
        1000
      );
    }
  });
});

describe('the command line', () => {
  test('says how to use it, and exits 2 on a command it does not know', async () => {
    const { code, out } = await sdk('frobnicate');
    expect(code).toBe(2);
    expect(out).toMatch(/init <data-pack\|course-pack\|capability> <id>/);
    expect((await sdk()).code).toBe(0);
  });
});
