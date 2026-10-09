import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { run } from '../sdk/cli.mjs';
import { loadExtension } from '../sdk/lib/extension.mjs';
import {
  ACCEPTED_LICENSES,
  HUMAN_ITEMS,
  isAcceptedLicense,
  REVIEW_CHECKS,
  reviewExtension,
  scanContent,
} from '../sdk/lib/review.mjs';

// =============================================================================
// `sdk review`: one fixture it accepts, and one it rejects for each criterion
// -----------------------------------------------------------------------------
// The accepted fixture is a real directory (sdk/fixtures/review/accept). Each
// rejection is that package, or a real extension, with exactly one thing made
// wrong in memory, so a failure names the one criterion that caught it and no
// other. CONTRIBUTING_CONTENT.md is the checklist these hold the tool to.
// =============================================================================

const ACCEPT = path.join('sdk', 'fixtures', 'review', 'accept');
const text = (ext, file) => ext.files.get(file).toString('utf8');
const edit = (ext, file, change) => {
  const doc = JSON.parse(text(ext, file));
  change(doc);
  ext.files.set(file, Buffer.from(`${JSON.stringify(doc, null, 2)}\n`));
  return ext;
};
const failed = review =>
  review.checks.filter(c => c.status === 'fail').map(c => c.id);

describe('a package that is accepted', () => {
  test('passes every mechanical check and prints what a person must still answer', async () => {
    const review = await reviewExtension(loadExtension(ACCEPT));
    expect(review.checks.map(c => c.id)).toEqual([...REVIEW_CHECKS]);
    expect(failed(review)).toEqual([]);
    expect(review.passed).toBe(true);
    expect(review.mechanical).toEqual([...REVIEW_CHECKS]);
    expect(review.human.map(h => h.id)).toEqual(HUMAN_ITEMS.map(h => h.id));
  });

  test.each([
    'su-dra-tess-s15',
    'kepler-13-tess-s14-sap',
    'kepler-13-tess-s14-pdcsap',
    'pulsating-stars',
  ])(
    "the maintainers' own %s passes, as the catalog reviews it",
    async name => {
      const review = await reviewExtension(
        loadExtension(path.join('extensions', name)),
        { readme: false }
      );
      expect(failed(review)).toEqual([]);
    }
  );
});

describe('a package that is rejected, one criterion at a time', () => {
  test('validates: a lesson Gravitas does not have', async () => {
    const ext = edit(loadExtension(ACCEPT), 'course.json', d => {
      d.units[0].lessons[0].lesson = 'no-such-lesson';
    });
    const review = await reviewExtension(ext);
    expect(failed(review)).toContain('validate');
    expect(
      review.checks.find(c => c.id === 'validate').problems.join('\n')
    ).toMatch(/no investigation "no-such-lesson"/);
    // The checks that need a valid package say they were not run.
    expect(failed(review)).toEqual([...REVIEW_CHECKS]);
  });

  test('tests: a pinned lesson that has changed since it was pinned', async () => {
    const ext = edit(
      loadExtension(path.join('sdk', 'examples', 'orbits-first-week')),
      'course.json',
      d => {
        const item = d.units
          .flatMap(u => u.items)
          .find(i => i.pin?.fp !== undefined);
        item.pin.fp = '00000000';
      }
    );
    const review = await reviewExtension(ext, { readme: false });
    expect(failed(review)).toEqual(['tests']);
  });

  test('licenses: one the catalog does not accept', async () => {
    const ext = edit(
      loadExtension(ACCEPT),
      'gravitas-extension.json',
      d => (d.licenses[0].license = 'CC-BY-NC-4.0')
    );
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual(['licenses']);
  });

  test('licenses: no non-commercial license is accepted, the Gaia one included', async () => {
    // The data-pack format admits `cc-by-nc-3.0-igo` for one built-in pack, by
    // the owner's exception (DECISION_REGISTER.md). That must not widen what a
    // contributed package may carry.
    for (const license of [
      'cc-by-nc-3.0-igo',
      'CC-BY-NC-3.0-IGO',
      'CC BY-NC 3.0 IGO',
      'CC-BY-NC-4.0',
      'CC-BY-NC-SA-4.0',
    ]) {
      expect({ license, accepted: isAcceptedLicense(license) }).toEqual({
        license,
        accepted: false,
      });
      const ext = edit(
        loadExtension(ACCEPT),
        'gravitas-extension.json',
        d => (d.licenses[0].license = license)
      );
      const review = await reviewExtension(ext);
      expect({ license, failed: failed(review) }).toEqual({
        license,
        failed: ['licenses'],
      });
    }
  });

  test('licenses: authored text under a license other than CC-BY-4.0', async () => {
    for (const license of ['MIT', 'CC0-1.0']) {
      const ext = edit(
        loadExtension(ACCEPT),
        'gravitas-extension.json',
        d => (d.licenses[0].license = license)
      );
      const review = await reviewExtension(ext);
      expect({ license, failed: failed(review) }).toEqual({
        license,
        failed: ['licenses'],
      });
    }
  });

  test('licenses: a file no license covers', async () => {
    const ext = edit(loadExtension(ACCEPT), 'gravitas-extension.json', d => {
      d.licenses[0].scope = 'something-else.json';
    });
    const review = await reviewExtension(ext);
    // The SDK's validation already refuses an uncovered asset.
    expect(failed(review)).toContain('validate');
  });

  test('provenance: a README that does not say who wrote it', async () => {
    const ext = loadExtension(ACCEPT);
    ext.files.set('README.md', Buffer.from('# A course\n\nSome lessons.\n'));
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual(['provenance']);
    expect(review.checks.find(c => c.id === 'provenance').problems).toEqual([
      'README.md does not say who the author is',
      'README.md does not say what the package is based on (a "Sources" line, even if it is "original work")',
    ]);
  });

  test('provenance: no README at all', async () => {
    const ext = loadExtension(ACCEPT);
    ext.files.delete('README.md');
    expect(failed(await reviewExtension(ext))).toEqual(['provenance']);
    // The catalog reviews its maintainers' own packages without that rule.
    expect(failed(await reviewExtension(ext, { readme: false }))).toEqual([]);
  });

  test('provenance: a data pack that cites nothing', async () => {
    const ext = edit(
      loadExtension(path.join('extensions', 'su-dra-tess-s15')),
      'gravitas-extension.json',
      d => (d.citations = [])
    );
    const review = await reviewExtension(ext, { readme: false });
    expect(failed(review)).toEqual(['provenance']);
  });

  test('locales: both declared and the title is missing one', async () => {
    const ext = edit(loadExtension(ACCEPT), 'gravitas-extension.json', d => {
      delete d.title.es;
    });
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual(['locales']);
  });

  test('locales: one language, declared, is accepted and said', async () => {
    const ext = loadExtension(ACCEPT);
    edit(ext, 'gravitas-extension.json', d => {
      delete d.title.es;
    });
    edit(ext, 'course.json', d => {
      d.locales = ['en'];
      const strip = v => {
        if (Array.isArray(v)) v.forEach(strip);
        else if (v && typeof v === 'object') {
          if ('es' in v && 'en' in v) delete v.es;
          Object.values(v).forEach(strip);
        }
      };
      strip(d);
    });
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual([]);
    expect(review.checks.find(c => c.id === 'locales').note).toMatch(
      /one language declared: en/
    );
  });

  test.each([
    ['an email address', 'Write to teacher@example.org for the key.'],
    ['a phone number', 'Call 936-555-0147 after class.'],
    ['a national identifier', 'Student 123-45-6789 finished first.'],
    ['a secret or key', 'password: hunter2hunter2'],
  ])('content: %s in the text', async (what, sentence) => {
    const ext = edit(loadExtension(ACCEPT), 'course.json', d => {
      d.summary.en = sentence;
    });
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual(['content']);
    expect(
      scanContent(
        new Map([['course.json', Buffer.from(JSON.stringify({ s: sentence }))]])
      ).join()
    ).toMatch(what);
  });

  test('content: personal data in the README is found as well', () => {
    const problems = scanContent(
      new Map([['README.md', Buffer.from('Author: Jo, jo@school.edu')]])
    );
    expect(problems).toEqual(['README.md: contains an email address']);
  });

  test('content: active markup in a README, which the SDK does not otherwise read', async () => {
    const ext = loadExtension(ACCEPT);
    ext.files.set(
      'README.md',
      Buffer.from(
        '## Author\nA\n## Sources\nB <script>alert(1)</script> and javascript:void(0)'
      )
    );
    const review = await reviewExtension(ext);
    expect(failed(review)).toEqual(['content']);
    expect(review.checks.find(c => c.id === 'content').problems).toEqual([
      'README.md: contains script or active markup',
    ]);
  });

  test('content: code is not a declarative package', () => {
    const problems = scanContent(
      new Map([['helper.mjs', Buffer.from('export const x = 1;')]])
    );
    expect(problems[0]).toMatch(/a mjs file is code/);
  });

  test('content: numbers and ordinary prose are not personal data', () => {
    const files = new Map([
      [
        'series.json',
        Buffer.from(
          JSON.stringify({
            t: [0.123, 456.789, 1234567890],
            s: 'binned-relative-flux/2',
          })
        ),
      ],
      ['README.md', Buffer.from('Orbit 1.0 to 29.5 years; 2017, AJ 153, 96.')],
    ]);
    expect(scanContent(files)).toEqual([]);
  });
});

describe('the license list', () => {
  test('is the one the catalog accepts, each with its reason', async () => {
    const { ACCEPTED_LICENSES: fromCatalog } =
      await import('../tools/catalog.mjs');
    expect(fromCatalog).toBe(ACCEPTED_LICENSES);
    for (const l of ACCEPTED_LICENSES) expect(l.why.length).toBeGreaterThan(10);
  });
});

describe('the command', () => {
  const sdk = async (...argv) => {
    const lines = [];
    const code = await run(argv, { log: s => lines.push(String(s)) });
    return { code, out: lines.join('\n') };
  };

  test('exits 0 for an accepted package and prints the human items', async () => {
    const { code, out } = await sdk('review', ACCEPT);
    expect(code).toBe(0);
    expect(out).toMatch(/PASS {2}validate/);
    expect(out).toMatch(/A person must answer:/);
    expect(out).toMatch(/\[ \] Conflict of interest/);
    expect(out).toMatch(/6\/6 mechanical checks passed/);
  });

  test('exits 1, naming the check, for a rejected one', async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'gravitas-rv-')));
    const ext = loadExtension(ACCEPT);
    const dir = path.join(root, 'bad');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dir);
    for (const [name, bytes] of ext.files)
      writeFileSync(
        path.join(dir, name),
        name === 'README.md' ? '# x\n' : bytes
      );
    const { code, out } = await sdk('review', dir);
    expect(code).toBe(1);
    expect(out).toMatch(/FAIL {2}provenance/);
    expect(out).toMatch(/README.md does not say who the author is/);
  });

  test('--json is data, and an unreadable path is a usage error', async () => {
    const { code, out } = await sdk('review', ACCEPT, '--json');
    expect(code).toBe(0);
    const [r] = JSON.parse(out);
    expect(r.id).toBe('fixture.review-accept');
    expect(r.checks).toHaveLength(6);
    expect((await sdk('review')).code).toBe(2);
  });
});
