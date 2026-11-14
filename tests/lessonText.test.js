// =============================================================================
// Spanish lesson text is keyed by step id and generated into the shadows
// -----------------------------------------------------------------------------
// The text a person edits lives under lesson-text/, keyed by step id. The app
// loads the index-aligned shadows under js/data/investigations, which
// tools/lesson-text.mjs writes. These tests hold the two properties that make
// that worth having:
//
//  - moving or inserting an English step moves no other step's Spanish: the
//    generated list puts each Spanish step at its English step's index and
//    leaves `null` (the English stands) where a step has none yet;
//  - the rule: a Spanish step that names no English step, an English step with
//    no Spanish step, and a list where a map belongs are all findings.
//
// And the real tree: every generated shadow is current, with no finding.
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execFile } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import * as acorn from 'acorn';
import { convertSource, generate, stale } from '../tools/lesson-text.mjs';

const run = promisify(execFile);
const REPO = process.cwd();

/** The value a generated `export default {...}` or `export const X = {...};` holds. */
const valueOf = text => {
  const body = text.replace(/^[\s\S]*?(export default|export const \w+ =)/, '');
  return new Function(`return (${body.replace(/;\s*$/, '')});`)();
};

const SOURCE = `// header comment kept
export default {
  title: 'Titulo',
  steps: {
    a: { title: 'A', body: 'uno' },
    // a comment between steps stays
    b: { title: 'B', body: 'dos' },
    c: { title: 'C', body: 'tres' },
  },
};
`;

const lesson = sids => [{ id: 'demo', depth: false, sids }];
const convert = (sids, src = SOURCE) =>
  convertSource(src, lesson(sids), {
    file: 'lesson-text/es/demo.js',
    id: 'demo',
    depth: false,
  });
const titles = r => valueOf(r.text).steps.map(s => (s ? s.title : null));

describe('the generated list follows the English step order', () => {
  test('in order: only brackets and keys change, comments stay', () => {
    const r = convert(['a', 'b', 'c']);
    expect(r.findings).toEqual([]);
    expect(r.text).toContain('// header comment kept');
    expect(r.text).toContain('// a comment between steps stays');
    expect(titles(r)).toEqual(['A', 'B', 'C']);
    expect(r.text).not.toMatch(/\ba:\s*\{/);
  });

  test('a step inserted in the English moves no other Spanish step', () => {
    const r = convert(['a', 'new', 'b', 'c']);
    expect(titles(r)).toEqual(['A', null, 'B', 'C']);
    expect(r.findings.map(f => f.sid)).toEqual(['new']);
  });

  test('two English steps swapped swap their Spanish with them', () => {
    const r = convert(['c', 'b', 'a']);
    expect(titles(r)).toEqual(['C', 'B', 'A']);
    expect(r.findings).toEqual([]);
  });

  test('an English step removed drops only its own Spanish', () => {
    const r = convert(['a', 'c']);
    expect(titles(r)).toEqual(['A', 'C']);
    expect(r.findings.map(f => f.message).join()).toMatch(
      /steps\.b names no step/
    );
  });

  test('property: any permutation and insertion keeps each step with its words', () => {
    let seed = 7;
    const rand = n => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const words = { a: 'A', b: 'B', c: 'C' };
    for (let trial = 0; trial < 60; trial++) {
      const sids = ['a', 'b', 'c'];
      for (let i = sids.length - 1; i > 0; i--) {
        const j = rand(i + 1);
        [sids[i], sids[j]] = [sids[j], sids[i]];
      }
      const at = rand(sids.length + 1);
      sids.splice(at, 0, `x${trial}`);
      const out = titles(convert(sids));
      sids.forEach((sid, i) => expect(out[i]).toBe(words[sid] ?? null));
    }
  });
});

describe('the findings', () => {
  test('a Spanish step with no English sid is a finding', () => {
    const r = convert(['a', 'b']);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].message).toMatch(
      /steps\.c names no step of the lesson/
    );
  });

  test('an English step with no Spanish step is a finding', () => {
    const r = convert(['a', 'b', 'c', 'd']);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ sid: 'd', lesson: 'demo' });
    expect(r.findings[0].message).toMatch(/step "d" has no Spanish step/);
  });

  test('a list of steps where a map belongs is a finding', () => {
    const r = convert(
      ['a'],
      "export default {\n  steps: [{ title: 'A' }],\n};\n"
    );
    expect(r.findings[0].message).toMatch(/write it as a map keyed by step id/);
  });

  test('a source that matches no lesson says so', () => {
    const r = convert(['zzz']);
    expect(r.findings[0].message).toMatch(/matches the steps of no lesson/);
  });
});

describe('a keyed source in a scratch tree', () => {
  let root;
  beforeAll(() => {
    root = realpathSync(mkdtempSync(path.join(tmpdir(), 'lesson-text-')));
    mkdirSync(path.join(root, 'lesson-text/es'), { recursive: true });
    mkdirSync(path.join(root, 'lesson-text/sequences'), { recursive: true });
    mkdirSync(path.join(root, 'js/data/investigations'), { recursive: true });
    writeFileSync(path.join(root, 'lesson-text/es/demo.js'), SOURCE);
    writeFileSync(
      path.join(root, 'lesson-text/sequences/demo-sequence.js'),
      "export const DEMO_ES = {\n  steps: {\n    a: { title: 'A' },\n    b: { title: 'B' },\n  },\n};\n"
    );
    writeFileSync(
      path.join(root, 'js/data/investigations/demo-sequence.js'),
      "import x from './x.js';\nexport const DEMO = { steps: [{ sid: 'a' }, { sid: 'b' }] };\n// kept\nexport const DEMO_ES = {\n  steps: [],\n};\nexport const LATER = 1;\n"
    );
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  // Prettier is its browser build under Jest; formatting is the CLI test's business.
  const keep = text => text;
  const lessons = sids => [{ id: 'demo', depth: false, sids }];

  test('the sequence statement is spliced and the rest of the file is untouched', async () => {
    const made = await generate(root, lessons(['b', 'a']), keep);
    const text = made.files.get('js/data/investigations/demo-sequence.js');
    expect(text).toContain("import x from './x.js';");
    expect(text).toContain('// kept');
    expect(text).toContain('export const LATER = 1;');
    expect(
      valueOf(
        text.slice(
          text.indexOf('export const DEMO_ES'),
          text.indexOf('export const LATER')
        )
      ).steps
    ).toEqual([{ title: 'B' }, { title: 'A' }]);
  });

  test('a stale generated file is reported until it is written', async () => {
    const made = await generate(root, lessons(['a', 'b', 'c']), keep);
    expect(await stale(root, made)).toEqual(
      expect.arrayContaining(['js/data/investigations/es/demo.js'])
    );
    for (const [file, text] of made.files) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), text);
    }
    expect(await stale(root, made)).toEqual([]);
  });

  test('an English lesson with no source at all is a finding', async () => {
    const made = await generate(
      root,
      [
        ...lessons(['a', 'b', 'c']),
        { id: 'other', depth: false, sids: ['p', 'q'] },
      ],
      keep
    );
    expect(made.findings.map(f => f.message).join('\n')).toMatch(
      /other: no Spanish steps under lesson-text\/ for its 2 English steps/
    );
  });
});

describe('the real tree', () => {
  test('every generated shadow is current and no step is unmatched', async () => {
    const { stdout } = await run('node', ['tools/lesson-text.mjs', '--check'], {
      cwd: REPO,
      timeout: 120000,
    });
    expect(stdout).toMatch(/files are current/);
  }, 130000);

  test('every source is a keyed map and the app never imports one', () => {
    for (const dir of ['es', 'depth-es', 'sequences']) {
      for (const f of readdirSync(path.join(REPO, 'lesson-text', dir))) {
        const ast = acorn.parse(
          readFileSync(path.join(REPO, 'lesson-text', dir, f), 'utf8'),
          {
            ecmaVersion: 'latest',
            sourceType: 'module',
          }
        );
        expect(ast.body.length).toBeGreaterThan(0);
      }
    }
    for (const entry of readdirSync(path.join(REPO, 'js'), { recursive: true }))
      if (String(entry).endsWith('.js'))
        expect(
          readFileSync(path.join(REPO, 'js', String(entry)), 'utf8')
        ).not.toMatch(/lesson-text\//);
  });
});
