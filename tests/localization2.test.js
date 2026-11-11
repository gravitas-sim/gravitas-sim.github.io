// =============================================================================
// Localization II (Prompt 282): what is not the number format
// -----------------------------------------------------------------------------
//   - the five pages that stored the language choice and never read it now read
//     it as they open, and the walk inventory says so;
//   - what the Spanish interface prints for a unit is read back when typed;
//   - a figure's pasted markup names the language of its words;
//   - the science terms of Roadmap III are in the glossary table, one word per
//     concept, and held to the catalogs by `npm run i18n:check`;
//   - the generated Spanish notes' sources are inputs of their graph node.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { figureMarkup } from '../js/embedMarkup.js';
import { UNITS, symbolOf, unitIdOf } from '../js/units/registry.js';
import { LABELS } from '../tools/glossary.mjs';
import { GRAPH } from '../tools/generate-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');

const FIVE = [
  'instructors/index.html',
  'evaluation/index.html',
  'model/index.html',
  'validation/index.html',
  'glossary/index.html',
];

describe('the five pages that did not follow the language choice', () => {
  test.each(FIVE)('%s reads the stored choice as it opens', page => {
    const html = read(page);
    expect(html).toContain("localStorage.getItem('gravitas_locale')");
    expect(html).toMatch(/document\.documentElement\.lang = 'es'/);
  });

  test('the walk inventory records all five as Spanish', () => {
    const contract = JSON.parse(read('tools/interaction-contract.json'));
    const rows = contract.inventory.rows;
    const byPath = new Map(rows.filter(r => r?.path).map(r => [r.path, r]));
    for (const p of ['/instructors/', '/evaluation/', '/model/']) {
      expect(byPath.get(p)?.spanish).toBe(true);
    }
    for (const p of ['/validation/', '/glossary/']) {
      expect(byPath.get(p)?.spanish).toBe(true);
    }
    // The original-version page has no Spanish and says so.
    expect(byPath.get('/history/original/')?.spanish).toBe(false);
  });
});

describe('a unit the Spanish interface prints is read back when typed', () => {
  test('every Spanish symbol names the unit it stands for', () => {
    for (const [id, u] of Object.entries(UNITS)) {
      if (!u.es) continue;
      expect(unitIdOf(u.es)).toBe(id);
      expect(symbolOf(id, 'es')).toBe(u.es);
      // The English symbol is unchanged by any locale.
      expect(symbolOf(id, 'en')).toBe(u.symbol);
    }
  });
});

describe('a figure says what language its words are in', () => {
  const base = {
    src: 'https://example.org/?embed=1',
    title: 'Fotografía',
    aspect: { w: 16, h: 10 },
    caption: 'Un pie de figura',
    fallback: { href: 'https://example.org/', text: 'Abrir la figura' },
  };

  test('with a language, the figure and the frame carry it', () => {
    const html = figureMarkup({ ...base, lang: 'es' });
    expect(html).toContain('<figure style="margin:0;" lang="es">');
    expect(html).toContain('title="Fotografía" lang="es"');
  });

  test('without one, the markup is what it always was', () => {
    const html = figureMarkup(base);
    expect(html).not.toContain('lang=');
    expect(html).toContain('<figure style="margin:0;">');
  });

  test('a language that is not two letters is ignored, never written', () => {
    expect(figureMarkup({ ...base, lang: 'es" onload="x' })).not.toContain(
      'lang='
    );
  });
});

describe('the glossary holds the science terms of the later investigations', () => {
  const science = LABELS.filter(l => l.kind === 'science');

  test('there are terms, each once, in both languages', () => {
    expect(science.length).toBeGreaterThanOrEqual(30);
    const ids = science.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const english = science.map(l => l.en);
    expect(new Set(english).size).toBe(english.length);
    for (const l of science) {
      expect(l.en).toBeTruthy();
      expect(l.es).toBeTruthy();
    }
  });
});

describe('the generated Spanish notes are written from named sources', () => {
  test('the instructors node lists the notes module and the catalogs', () => {
    const node = GRAPH.find(n => n.id === 'instructors');
    for (const input of [
      'js/instructorNotes.js',
      'js/instructorLocale.js',
      'js/i18n',
    ]) {
      expect(node.inputs).toContain(input);
    }
  });
});
