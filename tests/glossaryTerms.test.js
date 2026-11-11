import { describe, test, expect, beforeEach } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  LABELS,
  PAGE,
  TERM_FILES,
  termsByTopic,
  withBody,
} from '../tools/glossary.mjs';
import { DEFINITIONS, TOPICS } from '../tools/glossary-science.mjs';
import { RETIRED } from '../tools/glossary.mjs';
import en from '../js/explain/terms.en.js';
import es from '../js/explain/terms.es.js';
import enExplain from '../js/explain/en.js';
import esExplain from '../js/explain/es.js';
import {
  definitions,
  hasTerms,
  markTerms,
  plain,
  termsIn,
} from '../js/glossaryTerms.js';
import { unmark, decodeEntities } from '../js/lessonMarkup.js';

// =============================================================================
// Glossary II (Roadmap III, Prompt 286)
// -----------------------------------------------------------------------------
// One table says what each term is called (LABELS, held to the catalogs by
// Prompt 156's label check) and what it means (tools/glossary-science.mjs). The
// glossary page, the two lazy modules and the `[[term]]` markup are all written
// from it, so a word is defined once and means one thing wherever it is used.
// =============================================================================

const REPO = path.resolve(import.meta.dirname, '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');

describe('every term has one definition, in both languages', () => {
  test('a definition belongs to a label, and every science label has one', () => {
    const labels = new Map(LABELS.map(l => [l.id, l]));
    for (const id of Object.keys(DEFINITIONS))
      expect(labels.has(id)).toBe(true);
    for (const l of LABELS.filter(x => x.kind === 'science'))
      expect(DEFINITIONS[l.id]).toBeDefined();
  });

  test('each is filed under a topic, written as prose in both languages', () => {
    const topics = new Set(TOPICS.map(t => t.id));
    for (const [id, d] of Object.entries(DEFINITIONS)) {
      expect(topics.has(d.topic)).toBe(true);
      for (const lang of ['en', 'es']) {
        expect(d[lang].length).toBeGreaterThan(25);
        expect(d[lang]).toMatch(/[.]$/);
        expect(d[lang]).not.toMatch(/\[\[/);
        for (const r of RETIRED) expect(r[lang].test(d[lang])).toBe(false);
      }
      expect(d.es).not.toBe(d.en);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test('the topics are all used and the terms are grouped under them', () => {
    const grouped = termsByTopic();
    expect(grouped.map(g => g.id)).toEqual(TOPICS.map(t => t.id));
    for (const g of grouped) expect(g.terms.length).toBeGreaterThan(0);
    expect(grouped.flatMap(g => g.terms)).toHaveLength(
      Object.keys(DEFINITIONS).length
    );
  });

  test('a model-page section a definition points to exists', () => {
    const model = read('model/index.html');
    for (const [id, d] of Object.entries(DEFINITIONS))
      if (d.model) {
        expect({ id, found: model.includes(`id="${d.model}"`) }).toEqual({
          id,
          found: true,
        });
      }
  });
});

describe('what is written is what the table says', () => {
  test('the glossary page holds every term, by topic, with an anchor', () => {
    const html = read(PAGE);
    expect(withBody(html)).toBe(html);
    for (const id of Object.keys(DEFINITIONS))
      expect(html).toContain(`id="t-${id}"`);
    for (const t of TOPICS) expect(html).toContain(`id="terms-${t.id}"`);
  });

  test('the two lazy modules are the table (`node tools/glossary.mjs` checks the bytes)', () => {
    for (const lang of ['en', 'es'])
      expect(read(TERM_FILES[lang])).toContain('GENERATED FILE');
    expect(Object.keys(en).sort()).toEqual(Object.keys(DEFINITIONS).sort());
    expect(Object.keys(es)).toEqual(Object.keys(en));
    const labels = new Map(LABELS.map(l => [l.id, l]));
    for (const id of Object.keys(en)) {
      expect(en[id][0]).toBe(labels.get(id).en);
      expect(es[id][0]).toBe(labels.get(id).es);
      expect(en[id][1]).toBe(DEFINITIONS[id].en);
      expect(es[id][1]).toBe(DEFINITIONS[id].es);
    }
  });
});

describe('the markup', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en';
    document.body.innerHTML = '';
  });

  test('is found, flattened and read, without touching the DOM', () => {
    const s = 'a [[roche-limit]] and [[parallax|the parallax]] here';
    expect(hasTerms(s)).toBe(true);
    expect(hasTerms('no marks [here]')).toBe(false);
    expect(termsIn(s)).toEqual(['roche-limit', 'parallax']);
    expect(unmark(s)).toBe('a roche limit and the parallax here');
    expect(plain(s, en)).toBe('a Roche limit and the parallax here');
    expect(decodeEntities('x [[parallax|p]] &amp; y')).toBe('x p & y');
  });

  test('a term becomes a button that opens its definition and closes it again', async () => {
    document.body.innerHTML =
      '<p id="p">The [[roche-limit|Roche limit]] is near; see [[no-such-term|this]].</p>';
    const p = document.getElementById('p');
    expect(await markTerms(p, 'en')).toBe(1);
    const button = p.querySelector('button.gl-term');
    expect(button.textContent).toBe('Roche limit');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(p.textContent).toContain('see this.');
    button.click();
    const region = button.nextElementSibling;
    expect(region.classList.contains('gl-def')).toBe(true);
    expect(region.textContent).toContain(
      (await definitions('en'))['roche-limit'][1]
    );
    expect(region.querySelector('a').getAttribute('href')).toBe(
      '/glossary/#t-roche-limit'
    );
    expect(region.querySelector('a[href^="/model/#"]')).not.toBeNull();
    expect(button.getAttribute('aria-controls')).toBe(region.id);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    expect(button.nextElementSibling).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  test('speaks Spanish when asked, and never nests a control in a control', async () => {
    document.body.innerHTML =
      '<p id="p">El [[roche-limit]] y <button id="b">[[parallax]]</button></p>';
    const p = document.getElementById('p');
    expect(await markTerms(p, 'es')).toBe(1);
    expect(p.querySelector('.gl-term').textContent).toBe('Límite de Roche');
    expect(document.getElementById('b').querySelector('button')).toBeNull();
    expect(document.getElementById('b').textContent).toBe('Paralaje');
  });

  test('only text is read: markup in a mark is never interpreted', async () => {
    document.body.innerHTML = '<p id="p"></p>';
    const p = document.getElementById('p');
    p.textContent = '[[parallax|<img src=x onerror=alert(1)>]]';
    await markTerms(p, 'en');
    expect(p.querySelector('img')).toBeNull();
    expect(p.textContent).toContain('<img');
  });
});

describe('every mark in what ships has a definition', () => {
  const sources = [];
  const walk = dir => {
    for (const f of readdirSync(path.join(REPO, dir), {
      withFileTypes: true,
    })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) {
        if (!['node_modules', '.git'].includes(f.name)) walk(p);
      } else if (/\.(js|html)$/.test(f.name)) sources.push(p);
    }
  };
  walk('js/explain');
  walk('js/data/investigations');
  sources.push('model/index.html');

  test('in the explainers, the lessons and the model page', () => {
    const missing = [];
    let count = 0;
    for (const f of sources) {
      if (/terms\.(en|es)\.js$/.test(f)) continue;
      for (const id of termsIn(read(f))) {
        count++;
        if (!DEFINITIONS[id]) missing.push(`${f}: ${id}`);
      }
    }
    expect(missing).toEqual([]);
    expect(count).toBeGreaterThan(40);
  });

  test('the explainers mark the same terms in both languages, where both name them', () => {
    let marked = 0;
    for (const k of Object.keys(enExplain)) {
      const a = termsIn(enExplain[k].join(' '));
      const b = termsIn(esExplain[k].join(' '));
      marked += a.length;
      for (const id of b) expect(a).toContain(id);
    }
    expect(marked).toBeGreaterThan(40);
  });
});
