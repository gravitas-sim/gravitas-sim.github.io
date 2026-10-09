import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { run } from '../sdk/cli.mjs';
import { loadExtension } from '../sdk/lib/extension.mjs';
import { reviewExtension, REVIEW_CHECKS } from '../sdk/lib/review.mjs';

// =============================================================================
// `sdk init <type> <id> --from <pack>`: a pack from the Composer or the course
// builder becomes a package that validates, tests and reviews, with no file
// copied and no manifest edited (P81 findings P-1 and P-2, repair R-A5).
// The fixtures are files the tools wrote (sdk/fixtures/from-pack): a Composer
// save with rubric criteria, a remix of a built-in, a /2 course pack, and the
// remix the way P81 found it, with no Spanish title.
// =============================================================================

const FIX = path.join('sdk', 'fixtures', 'from-pack');
const tmp = () =>
  realpathSync(mkdtempSync(path.join(tmpdir(), 'gravitas-from-pack-')));
const read = (file, build) => {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  build?.(doc);
  return doc;
};
const writeDoc = (dir, name, doc) => {
  const file = path.join(dir, name);
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  return file;
};
async function sdk(...args) {
  const lines = [];
  const code = await run(args, { log: l => lines.push(l) });
  return { code, out: lines.join('\n') };
}
/** The pack a Composer writes when the author never opened the Spanish. */
const englishOnly = v =>
  Array.isArray(v)
    ? v.map(englishOnly)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([k]) => k !== 'es' && k !== 'esOf')
            .map(([k, x]) => [k, k === 'locales' ? ['en'] : englishOnly(x)])
        )
      : v;
const failed = review =>
  review.checks.filter(c => c.status === 'fail').map(c => c.id);

const CASES = [
  {
    name: 'a Composer save, with rubric criteria',
    type: 'investigation-pack',
    file: 'composer-save.investigation.json',
    id: 'my-orbit',
    content: 'investigation.json',
    version: '1.2.0',
  },
  {
    name: 'a remix of a built-in, with derivedFrom',
    type: 'investigation-pack',
    file: 'remix.investigation.json',
    id: 'my-keplers-remix',
    content: 'investigation.json',
    version: '1.0.0',
  },
  {
    name: 'a course-pack/2 from the course builder',
    type: 'course-pack',
    file: 'course.course.json',
    id: 'my-first-week',
    content: 'course.json',
    version: '1.0.0',
  },
];

describe('init --from, the accept path', () => {
  test.each(CASES)(
    '$name round-trips through validate, test and review',
    async c => {
      const dir = path.join(tmp(), c.id);
      const src = path.join(FIX, c.file);
      const init = await sdk(
        'init',
        c.type,
        c.id,
        '--dir',
        dir,
        '--from',
        src,
        '--author',
        'A. Instructor, State University',
        '--sources',
        'Original work, with the lessons it names.'
      );
      expect(init.code).toBe(0);
      expect(init.out).not.toMatch(/placeholder/);

      const validate = JSON.parse((await sdk('validate', dir, '--json')).out);
      expect(validate[0].findings.filter(f => f.severity === 'error')).toEqual(
        []
      );
      // Both locales came from the pack: no missing-Spanish-title warning.
      expect(validate[0].findings.map(f => f.path)).not.toContain('title.es');
      expect((await sdk('test', dir)).code).toBe(0);

      const review = await reviewExtension(loadExtension(dir));
      expect(failed(review)).toEqual([]);
      expect(review.mechanical).toEqual([...REVIEW_CHECKS]);
      expect((await sdk('review', dir)).code).toBe(0);

      const ext = loadExtension(dir);
      const manifest = JSON.parse(ext.files.get('gravitas-extension.json'));
      expect(manifest.id).toBe(`community.${c.id}`);
      expect(manifest.version).toBe(c.version);
      expect(manifest.licenses).toEqual([
        { scope: c.content, license: 'CC-BY-4.0' },
      ]);
      expect(manifest.title.es).toBeTruthy();
      const pack = JSON.parse(ext.files.get(c.content));
      expect(pack.id).toBe(c.id);
      const readme = ext.files.get('README.md').toString('utf8');
      expect(readme).toMatch(
        /^## Author\n\nA\. Instructor, State University$/m
      );
      expect(readme).toMatch(/^## Sources$/m);
      expect(readme).toMatch(/Original work, with the lessons it names\./);
      expect(readme).toMatch(/English and Spanish/);
    }
  );

  test('the file is copied as the tool saved it, apart from the id', async () => {
    const dir = path.join(tmp(), 'copy');
    const src = path.join(FIX, 'composer-save.investigation.json');
    await sdk(
      'init',
      'investigation-pack',
      'my-orbit',
      '--dir',
      dir,
      '--from',
      src
    );
    const was = read(src);
    const now = JSON.parse(
      loadExtension(dir).files.get('investigation.json').toString('utf8')
    );
    expect(now).toEqual({ ...was, id: 'my-orbit' });
    expect(now.steps.some(s => Array.isArray(s.rubricCriteria))).toBe(true);
  });

  test('a remix names the investigation it came from, in the manifest and the README', async () => {
    const dir = path.join(tmp(), 'rx');
    const src = path.join(FIX, 'remix.investigation.json');
    const init = await sdk(
      'init',
      'investigation-pack',
      'my-keplers-remix',
      '--dir',
      dir,
      '--from',
      src
    );
    const from = read(src).derivedFrom;
    const ext = loadExtension(dir);
    const manifest = JSON.parse(ext.files.get('gravitas-extension.json'));
    expect(manifest.citations[0].text).toContain(`"${from.id}"`);
    expect(manifest.citations[0].text).toContain(from.digest);
    expect(ext.files.get('README.md').toString('utf8')).toContain(from.id);
    // No --author: init says the Author line is still to be written.
    expect(init.out).toMatch(/Author line is still the placeholder/);
  });

  test('an id the pack was saved under is rewritten to the package id, and init says so', async () => {
    const dir = path.join(tmp(), 'id');
    const { out } = await sdk(
      'init',
      'investigation-pack',
      'my-orbit',
      '--dir',
      dir,
      '--from',
      path.join(FIX, 'composer-save.investigation.json'),
      '--author',
      'A. Instructor'
    );
    expect(out).toMatch(/"my-orbit-reading" is written as "my-orbit"/);
  });

  test('an English-only pack becomes an English-only package that review accepts', async () => {
    const root = tmp();
    const file = writeDoc(
      root,
      'english.investigation.json',
      englishOnly(read(path.join(FIX, 'composer-save.investigation.json')))
    );
    const dir = path.join(root, 'english');
    const { code } = await sdk(
      'init',
      'investigation-pack',
      'my-orbit',
      '--dir',
      dir,
      '--from',
      file
    );
    expect(code).toBe(0);
    const ext = loadExtension(dir);
    const manifest = JSON.parse(ext.files.get('gravitas-extension.json'));
    expect(manifest.title).toEqual({ en: 'Reading an orbit' });
    expect(ext.files.get('README.md').toString('utf8')).toMatch(
      /English only; the pack declares one language/
    );
    const review = await reviewExtension(ext);
    expect(review.checks.find(c => c.id === 'locales').status).toBe('pass');
  });
});

describe('init --from, the reject path', () => {
  test('the P81 repro: a remix with no Spanish title is refused by init, with what to do', async () => {
    const dir = path.join(tmp(), 'nope');
    const { code, out } = await sdk(
      'init',
      'investigation-pack',
      'my-keplers-remix',
      '--dir',
      dir,
      '--from',
      path.join(FIX, 'remix-no-spanish-title.investigation.json')
    );
    expect(code).toBe(2);
    expect(out).toMatch(/no Spanish title \(title\.es\)/);
    expect(out).toMatch(/remove "es" from the pack.s locales/);
    // Nothing is written.
    expect(existsSync(dir)).toBe(false);
  });

  test('a pack with no English title, and a file that is not a pack', async () => {
    const root = tmp();
    const none = writeDoc(
      root,
      'none.json',
      read(path.join(FIX, 'course.course.json'), c => {
        c.title = {};
      })
    );
    const a = await sdk(
      'init',
      'course-pack',
      'x',
      '--dir',
      path.join(root, 'a'),
      '--from',
      none
    );
    expect([a.code, a.out]).toEqual([
      2,
      expect.stringMatching(/no English title/),
    ]);
    const other = writeDoc(root, 'other.json', { hello: 1 });
    const b = await sdk(
      'init',
      'course-pack',
      'x',
      '--dir',
      path.join(root, 'b'),
      '--from',
      other
    );
    expect([b.code, b.out]).toEqual([
      2,
      expect.stringMatching(/no "format" field/),
    ]);
  });

  test('a pack of one kind given to the wrong type says which type to run', async () => {
    const { code, out } = await sdk(
      'init',
      'course-pack',
      'x',
      '--dir',
      path.join(tmp(), 'w'),
      '--from',
      path.join(FIX, 'remix.investigation.json')
    );
    expect(code).toBe(2);
    expect(out).toMatch(/run init investigation-pack/);
    // --from is for the three pack types.
    const cap = await sdk(
      'init',
      'capability',
      'x',
      '--dir',
      path.join(tmp(), 'c'),
      '--from',
      path.join(FIX, 'remix.investigation.json')
    );
    expect(cap.code).toBe(2);
    expect((await sdk('init', 'course-pack', 'y', '--author', 'A')).code).toBe(
      2
    );
  });

  test('review still rejects a package with no license, however it was made', async () => {
    const dir = path.join(tmp(), 'nolicense');
    await sdk(
      'init',
      'investigation-pack',
      'my-orbit',
      '--dir',
      dir,
      '--from',
      path.join(FIX, 'composer-save.investigation.json')
    );
    const ext = loadExtension(dir);
    const manifest = JSON.parse(ext.files.get('gravitas-extension.json'));
    manifest.licenses = [];
    ext.files.set(
      'gravitas-extension.json',
      Buffer.from(JSON.stringify(manifest))
    );
    const review = await reviewExtension(ext);
    expect(review.passed).toBe(false);
    expect(
      review.checks.find(c => c.id === 'validate').problems.join('\n')
    ).toMatch(/licenses/);
  });
});
