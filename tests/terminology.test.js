// =============================================================================
// One word for one thing
// -----------------------------------------------------------------------------
// Prompt 56 gave the platform eight nouns (PLATFORM_MODEL.md) and retired the
// words that meant more than one of them: lesson, guide, pack, assignment. The
// retired words appear in exactly one place, /glossary/, which says what they
// became. This is the test that a page, a message catalog or a document the
// reader sees does not bring one back.
//
// It reads prose, not code. A string literal with a space in it is prose; a
// key, an id, a path, a class name and a format name are not, and are left
// alone, so `lesson:` stays a field name and `gravitas.ephemeris-pack` a format.
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as acorn from 'acorn';
import * as parse5 from 'parse5';
import { completeCatalogs } from '../tools/i18n-catalog.mjs';
import { RETIRED, NOUNS, PAGE, withBody } from '../tools/glossary.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const tracked = pattern =>
  execFileSync('git', ['ls-files', pattern], { cwd: REPO, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

/** Where a retired word is found in a piece of prose. */
function findings(where, text, lang) {
  const out = [];
  for (const r of RETIRED) {
    for (const re of [r[lang], r.en, r.es]) {
      const m = re.exec(text);
      if (m) {
        out.push(
          `${where}: "${r.id}" in …${text
            .slice(Math.max(0, m.index - 24), m.index + 36)
            .replace(/\s+/g, ' ')}…`
        );
        break;
      }
    }
  }
  return out;
}

/** Prose with the parts that are not words taken out. */
const words = s => s.replace(/\{[^}]*\}/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

describe('the glossary', () => {
  test('names the eight nouns of PLATFORM_MODEL.md, each in both languages', () => {
    const model = read('PLATFORM_MODEL.md');
    const table = model.slice(model.indexOf('## The nouns'));
    const rows = [...table.matchAll(/^\| \*\*([A-Za-z]+)\*\*/gm)].map(m =>
      m[1].toLowerCase()
    );
    expect(NOUNS.map(n => n.id)).toEqual(rows.slice(0, NOUNS.length));
    for (const n of NOUNS) {
      expect(n.en[0].length).toBeGreaterThan(0);
      expect(n.es[0].length).toBeGreaterThan(0);
      expect(n.en[1]).not.toBe(n.es[1]);
    }
  });

  test('every retired word has a replacement in each language', () => {
    for (const r of RETIRED) {
      expect(r.use.en).toMatch(/\w/);
      expect(r.use.es).toMatch(/\w/);
      expect(r.words.en).toMatch(/\w/);
    }
  });

  test('the page is what the table writes', () => {
    expect(withBody(read(PAGE))).toBe(read(PAGE));
  });

  test('the page is a published page', () => {
    expect(tracked('*/index.html')).toContain(PAGE);
    expect(read('build.js')).toContain("'glossary'");
  });
});

describe('the message catalogs', () => {
  test('use none of the retired words, in English or in Spanish', async () => {
    const { catalogs } = await completeCatalogs({ locales: ['en', 'es'] });
    const found = [];
    for (const lang of ['en', 'es']) {
      for (const [id, value] of Object.entries(catalogs.get(lang).merged)) {
        if (typeof value === 'string') {
          found.push(...findings(`${lang} ${id}`, words(value), lang));
        }
      }
    }
    expect(found).toEqual([]);
  });
});

describe('the pages', () => {
  const pages = [
    ...tracked('*/index.html'),
    ...tracked('*/*/index.html'),
    'index.html',
    ...tracked('js/fragments/*.html'),
  ].filter(
    p =>
      p !== PAGE &&
      !/^(history|spike|dist|e2e|node_modules)\//.test(p) &&
      !p.includes('/test')
  );

  test('are found', () => {
    expect(pages.length).toBeGreaterThan(15);
    expect(pages).toContain('model/index.html');
  });

  test('say none of the retired words in anything a reader sees', () => {
    const found = [];
    for (const page of new Set(pages)) {
      const doc = parse5.parse(read(page), { sourceCodeLocationInfo: false });
      const walk = (node, skip) => {
        if (node.nodeName === '#text' && !skip) {
          found.push(...findings(page, words(node.value), 'en'));
        }
        for (const a of node.attrs ?? []) {
          if (
            ['title', 'alt', 'aria-label', 'placeholder', 'content'].includes(
              a.name
            )
          ) {
            found.push(
              ...findings(`${page} [${a.name}]`, words(a.value), 'en')
            );
          }
        }
        const skipKids = skip || ['script', 'style'].includes(node.tagName);
        for (const kid of node.content?.childNodes ?? node.childNodes ?? []) {
          walk(kid, skipKids);
        }
      };
      walk(doc, false);
    }
    expect(found).toEqual([]);
  });
});

describe('the lesson prose and the instructor content', () => {
  const dirs = [
    'js/data/investigations',
    'js/data/courses',
    'js/observatory/guides',
    'js/lab3d/guides',
    'js/mission/lab',
  ];
  const files = [
    'js/data/instructorContent.js',
    'js/data/activities.js',
    'js/data/welcome.js',
    ...dirs.flatMap(function walk(d) {
      return readdirSync(path.join(REPO, d)).flatMap(f => {
        const p = `${d}/${f}`;
        return statSync(path.join(REPO, p)).isDirectory()
          ? walk(p)
          : p.endsWith('.js')
            ? [p]
            : [];
      });
    }),
  ];

  test('say none of the retired words in any sentence', () => {
    const found = [];
    for (const file of files) {
      const lang = /(^|\/)es\/|\.es\./.test(file) ? 'es' : 'en';
      const ast = acorn.parse(read(file), {
        ecmaVersion: 'latest',
        sourceType: 'module',
      });
      const visit = node => {
        if (!node || typeof node.type !== 'string') return;
        const text =
          node.type === 'Literal' && typeof node.value === 'string'
            ? node.value
            : node.type === 'TemplateElement'
              ? node.value.cooked
              : null;
        if (text && /\s/.test(text)) {
          found.push(...findings(file, words(text), lang));
        }
        for (const key of Object.keys(node)) {
          const child = node[key];
          if (Array.isArray(child)) child.forEach(visit);
          else if (child && typeof child.type === 'string') visit(child);
        }
      };
      visit(ast);
    }
    expect(found).toEqual([]);
  });
});

describe('the documents', () => {
  const strip = line =>
    line
      .replace(/`[^`]*`/g, ' ')
      .replace(/\]\([^)]*\)/g, ']')
      .replace(/<!--.*?-->/g, ' ')
      .replace(/\\texttt\{[^}]*\}/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ');

  test('README.md and the manual say none of the retired words', () => {
    const found = [];
    for (const file of [
      'README.md',
      'manual/gravitas-user-manual.tex',
      'manual/investigations.tex',
      'manual/scenarios.tex',
    ]) {
      let fenced = false;
      for (const [i, line] of read(file).split('\n').entries()) {
        if (line.trimStart().startsWith('```')) fenced = !fenced;
        if (fenced || line.trimStart().startsWith('%')) continue;
        found.push(...findings(`${file}:${i + 1}`, strip(line), 'en'));
      }
    }
    expect(found).toEqual([]);
  });
});
