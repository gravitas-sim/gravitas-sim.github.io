// =============================================================================
// The reviewed notebooks: the catalogue is the files, and the page refuses the rest
// -----------------------------------------------------------------------------
// Each catalogue entry's hashes are the vendored notebook's and example input's;
// the answers a real run of each notebook gave (tests/fixtures/compute/, made by
// running the vendored cells under CPython and writing them as the frame's
// wrapper does) pass the page's checks; and the page refuses a notebook whose
// cells changed by one character, an input that is not the schema the notebook
// reads, and an answer that adds or drops anything the entry declares.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  NOTEBOOKS,
  badParams,
  defaultParams,
  entryOf,
  paramsText,
} from '../js/compute/catalogue.js';
import { cellsHash, cellsOf } from '../js/compute/capsule.js';
import { checkOutput } from '../js/compute/check.js';
import {
  ComputeError,
  checkInput,
  checkParams,
  loadNotebook,
} from '../js/compute/prepare.js';
import { downloadBytes } from '../js/compute/runtime.js';
import { ALLOWED_PACKAGES } from '../js/compute/runtime.js';
import { execFileSync } from 'node:child_process';

const sha = b => createHash('sha256').update(b).digest('hex');
const read = p => readFileSync(p);
const answer = id =>
  JSON.parse(readFileSync(`tests/fixtures/compute/${id}.answer.json`, 'utf8'));

describe('the catalogue', () => {
  test('lists the two vendored notebooks', () => {
    expect(NOTEBOOKS.map(e => e.id)).toEqual([
      'transit-times',
      'line-centroid',
    ]);
  });

  test.each(NOTEBOOKS.map(e => [e.id, e]))(
    '%s: its hashes are its files',
    (id, e) => {
      const file = read(e.notebook);
      const cells = cellsOf(JSON.parse(file.toString('utf8')));
      expect(e.fileSha256).toBe(sha(file));
      expect(e.cellsSha256).toBe(sha(JSON.stringify(cells)));
      expect(e.cells).toBe(cells.length);
      const example = read(e.input.example.path);
      expect(e.example).toEqual({
        sha256: sha(example),
        bytes: example.length,
      });
    }
  );

  test('the generated files are current', () => {
    // A child process: esbuild cannot load inside Jest's VM realm.
    expect(
      execFileSync('node', ['tools/compute.mjs', '--check'], {
        encoding: 'utf8',
      })
    ).toMatch(/current/);
  });

  test.each(NOTEBOOKS.map(e => [e.id, e]))(
    '%s: says what it reads, returns and costs, in both languages',
    (id, e) => {
      for (const k of ['title', 'summary', 'note']) {
        expect(e[k].en.length).toBeGreaterThan(20);
        expect(e[k].es.length).toBeGreaterThan(20);
        expect(e[k].es).not.toBe(e[k].en);
      }
      expect(e.packages.every(p => ALLOWED_PACKAGES.includes(p))).toBe(true);
      expect(e.citations.length).toBeGreaterThan(1);
      for (const q of e.outputs.envelope.quantities) {
        expect(q.label.en && q.label.es).toBeTruthy();
      }
      for (const p of e.params) {
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
      }
      for (const x of e.expected)
        expect(e.outputs.envelope.quantities.some(q => q.id === x.id)).toBe(
          true
        );
    }
  );

  test('a notebook that plots costs about twice a notebook that does not', () => {
    const t = downloadBytes(entryOf('transit-times').packages);
    const l = downloadBytes(entryOf('line-centroid').packages);
    expect(l).toBeLessThan(9_000_000);
    expect(t).toBeGreaterThan(18_000_000);
    expect(t).toBeLessThan(19_500_000);
  });
});

describe('what the real notebooks returned', () => {
  test.each(NOTEBOOKS.map(e => [e.id, e]))(
    '%s: passes the page’s checks and the expected values',
    (id, e) => {
      const r = checkOutput(JSON.stringify(answer(id)), e.outputs);
      expect(r.ok).toBe(true);
      for (const x of e.expected) {
        const q = r.parts.envelope.quantities.find(y => y.id === x.id);
        expect(Math.abs(q.value - x.value)).toBeLessThanOrEqual(x.tolerance);
      }
    }
  );

  const e = entryOf('line-centroid');
  const ok = () => answer('line-centroid');
  const bad = (text, code) => {
    const r = checkOutput(
      typeof text === 'string' ? text : JSON.stringify(text),
      e.outputs
    );
    expect({ ok: r.ok, code: r.code }).toEqual({ ok: false, code });
  };

  test('refuses a key it does not declare, and a declared one that is missing', () => {
    bad(
      { ...ok(), figure: '{"base64":"iVBORw0KGgo=","type":"image/png"}' },
      'output-keys'
    );
    bad({ envelope: ok().envelope }, 'output-keys');
    bad({ ...ok(), extra: '1' }, 'output-keys');
  });
  test('refuses an answer that is not text of texts, or is too large', () => {
    bad('not json', 'output-shape');
    bad('[1]', 'output-shape');
    bad({ ...ok(), table: { not: 'text' } }, 'output-shape');
    bad('x'.repeat(4_000_001), 'output-too-large');
  });
  test('refuses an envelope that is not one, or whose quantities are not the declared ones', () => {
    bad({ ...ok(), envelope: '{}' }, 'output-envelope');
    bad({ ...ok(), envelope: 'nope' }, 'output-envelope');
    const env = JSON.parse(ok().envelope);
    bad(
      {
        ...ok(),
        envelope: JSON.stringify({
          ...env,
          quantities: env.quantities.slice(1),
        }),
      },
      'output-quantities'
    );
    const wrongUnit = {
      ...env,
      quantities: env.quantities.map(q =>
        q.id === 'line.fwhm' ? { ...q, unit: 'nm' } : q
      ),
    };
    bad({ ...ok(), envelope: JSON.stringify(wrongUnit) }, 'output-quantities');
    const notRegistry = {
      ...env,
      quantities: env.quantities.map(q =>
        q.id === 'line.fwhm' ? { ...q, unit: 'parsec-ish' } : q
      ),
    };
    bad({ ...ok(), envelope: JSON.stringify(notRegistry) }, 'output-envelope');
  });
  test('refuses a table that is not an observation, and an answer with no table', () => {
    bad({ ...ok(), table: '{"columns":[]}' }, 'output-table');
    bad({ ...ok(), table: '"x"' }, 'output-table');
    const t = entryOf('transit-times');
    const a = answer('transit-times');
    const refuse = (doc, code) => {
      const r = checkOutput(JSON.stringify(doc), t.outputs);
      expect({ ok: r.ok, code: r.code }).toEqual({ ok: false, code });
    };
    refuse(
      { ...a, figure: '{"base64":"AAAA","type":"image/png"}' },
      'output-figure'
    );
    refuse(
      { ...a, figure: '{"base64":"iVBORw0KGgo=","type":"image/gif"}' },
      'output-figure'
    );
    refuse({ ...a, figure: 'nope' }, 'output-figure');
    const { table, ...noTable } = a;
    void table;
    refuse(noTable, 'output-keys');
  });
});

describe('what the page refuses before it sends anything', () => {
  const e = entryOf('transit-times');
  const files = path => Promise.resolve(readFileSync(path.slice(1), 'utf8'));

  test('loads the reviewed notebook', async () => {
    const nb = await loadNotebook(e, files);
    expect(nb.hash).toBe(e.cellsSha256);
    expect(nb.cells).toHaveLength(e.cells);
  });

  test('refuses a notebook whose cells differ by one character', async () => {
    const doc = JSON.parse(readFileSync(e.notebook, 'utf8'));
    const code = doc.cells.find(c => c.cell_type === 'code');
    code.source = [
      code.source.join('').replace('import json', 'import json  '),
      '',
    ].filter(Boolean);
    await expect(
      loadNotebook(e, () => Promise.resolve(JSON.stringify(doc)))
    ).rejects.toMatchObject({
      code: 'notebook-refused',
    });
  });

  test('refuses a notebook it cannot read, and a notebook with a markdown-only edit is still the same notebook', async () => {
    await expect(
      loadNotebook(e, () => Promise.reject(new Error('404')))
    ).rejects.toBeInstanceOf(ComputeError);
    const doc = JSON.parse(readFileSync(e.notebook, 'utf8'));
    doc.cells.find(c => c.cell_type === 'markdown').source = ['# Reworded'];
    expect(
      (await loadNotebook(e, () => Promise.resolve(JSON.stringify(doc)))).hash
    ).toBe(e.cellsSha256);
  });

  test('hashes cells in order, so reordering them is a different notebook', async () => {
    const doc = JSON.parse(readFileSync(e.notebook, 'utf8'));
    const codes = doc.cells.filter(c => c.cell_type === 'code');
    expect(await cellsHash(cellsOf(doc))).toBe(e.cellsSha256);
    [codes[0].source, codes[1].source] = [codes[1].source, codes[0].source];
    expect(await cellsHash(cellsOf(doc))).not.toBe(e.cellsSha256);
  });

  test('accepts the example input, and refuses another format, kind or invalid file', () => {
    const text = readFileSync(e.input.example.path, 'utf8');
    expect(checkInput(e, text).ok).toBe(true);
    const doc = JSON.parse(text);
    const code = x =>
      checkInput(e, typeof x === 'string' ? x : JSON.stringify(x)).code;
    expect(code('{')).toBe('input-not-json');
    expect(code({ ...doc, format: 'gravitas.pipeline' })).toBe('input-format');
    expect(code({ ...doc, formatVersion: 2 })).toBe('input-format');
    expect(
      code(readFileSync(entryOf('line-centroid').input.example.path, 'utf8'))
    ).toBe('input-kind');
    expect(code({ ...doc, columns: [] })).toBe('input-invalid');
    expect(checkInput(e, 'x'.repeat(2_000_001)).code).toBe('input-too-large');
  });

  test('refuses settings outside their bounds, and writes them in the entry’s order', () => {
    expect(badParams(e, { sigma: 5 })).toEqual([]);
    expect(badParams(e, { sigma: 9 })).toEqual(['sigma']);
    expect(badParams(e, {})).toEqual(['sigma']);
    expect(badParams(e, { sigma: NaN })).toEqual(['sigma']);
    expect(checkParams(e, { sigma: 2 }).code).toBe('params-refused');
    expect(checkParams(e, defaultParams(e))).toBeNull();
    const l = entryOf('line-centroid');
    expect(paramsText(l, { halfwidth: 60, rest: 6564.61 })).toBe(
      '{"rest":6564.61,"halfwidth":60}'
    );
  });
});
