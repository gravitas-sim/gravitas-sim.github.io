/* global DOMParser */
import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { AREAS, groupAnchor } from '../js/explain/where.js';
import { INSTRUMENTS } from '../js/data/teaching.js';
import { DEFINITIONS } from '../tools/glossary-science.mjs';

// =============================================================================
// The model page is findable (a long reference page)
// -----------------------------------------------------------------------------
// The contents name every section, in both languages and in both of their
// forms (the open list and the disclosure); each section has a way back to the
// contents; no anchor that existed is gone, nor one that code can emit; the
// opening offers its three tasks; the fifteen core sections keep one order;
// and every link to the validation page's groups names a group that exists.
// =============================================================================

const REPO = path.resolve(import.meta.dirname, '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const html = read('model/index.html');
const doc = new DOMParser().parseFromString(html, 'text/html');

/** Every id the page had before the contents were rebuilt. Anchors are a contract. */
const FORMER_IDS = [
  'glance',
  'why',
  'gravity',
  'dimensions',
  'frames',
  'collisions',
  'inspiral',
  'gravitational-waves',
  'blackholes',
  'stars',
  'interiors',
  'spacetime',
  'lensing',
  'tides',
  'visual',
  'conservation',
  'sizes',
  'other',
  'craters',
  'completeness',
  'small-bodies',
  'exposure-planning',
  'survey-design',
  'observing-strategy',
  'telescopes',
  'spectrographs',
  'detector-effects',
  'photometric-calibration',
  'eclipsing-binaries',
  'binary-masses',
  'cluster-fitting',
  'stellar-activity',
  'remnants',
  'vetting',
  'direct-imaging',
  'variables-ii',
  'gaia-distances',
  'asteroseismology',
  'transit-fitting',
  'transit-timing',
  'joint-fit',
  'occurrence',
  'trust',
  'irreversible',
  'validation',
  'known-discrepancies',
  'data',
  'survey-archives',
  'investigations',
];

const CORE = [
  'gravity',
  'dimensions',
  'frames',
  'collisions',
  'inspiral',
  'gravitational-waves',
  'blackholes',
  'stars',
  'interiors',
  'spacetime',
  'lensing',
  'tides',
  'visual',
  'conservation',
  'sizes',
];

const sections = [...doc.querySelectorAll('main h2')].filter(
  h => !h.closest('nav')
);
const sectionIds = sections.map(h => h.id);

/** The text of an element in one language. */
const words = (el, lang) =>
  [...el.querySelectorAll(`.gs-${lang}`)].map(s => s.textContent).join(' ');

describe('anchors are a contract', () => {
  test('every id the page had still exists, once', () => {
    const ids = [...doc.querySelectorAll('[id]')].map(e => e.id);
    for (const id of FORMER_IDS)
      expect({ id, n: ids.filter(i => i === id).length }).toEqual({ id, n: 1 });
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every id the producers can emit exists', () => {
    const wanted = new Set();
    for (const a of AREAS) if (a.model) wanted.add(a.model);
    for (const d of Object.values(DEFINITIONS))
      if (d.model) wanted.add(d.model);
    for (const i of INSTRUMENTS)
      if (i.href?.startsWith('/model/#')) wanted.add(i.href.slice(8));
    // The literal links written in the scripts and the tools.
    const walk = dir => {
      for (const name of readdirSync(path.join(REPO, dir))) {
        const rel = `${dir}/${name}`;
        const full = path.join(REPO, rel);
        if (statSync(full).isDirectory()) walk(rel);
        else if (/\.(m?js|html)$/.test(name))
          for (const m of readFileSync(full, 'utf8').matchAll(
            /\/model\/#([a-z0-9-]+)/g
          ))
            // A comment in the engine names a section that never existed.
            if (rel !== 'js/engine/bodies.js') wanted.add(m[1]);
      }
    };
    walk('js');
    walk('tools');
    expect(wanted.size).toBeGreaterThan(10);
    const ids = new Set([...doc.querySelectorAll('[id]')].map(e => e.id));
    for (const id of wanted)
      expect({ id, there: ids.has(id) }).toEqual({ id, there: true });
  });

  test('every in-page link lands on an element', () => {
    const ids = new Set([...doc.querySelectorAll('[id]')].map(e => e.id));
    for (const a of doc.querySelectorAll('main a[href^="#"]'))
      expect({
        href: a.getAttribute('href'),
        there: ids.has(a.getAttribute('href').slice(1)),
      }).toEqual({ href: a.getAttribute('href'), there: true });
  });

  test('the last section has an anchor of its own', () => {
    expect(sectionIds.at(-1)).toBe('checking');
    expect(sectionIds.every(Boolean)).toBe(true);
  });
});

describe('the contents', () => {
  const nav = doc.getElementById('contents');

  test('is one labelled navigation with the open list and the disclosure', () => {
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-labelledby')).toBe('contents-h');
    expect(nav.querySelector('.doc-toc-wide')).not.toBeNull();
    const more = nav.querySelector('details.ui-disclosure.doc-toc-narrow');
    expect(more).not.toBeNull();
    expect(more.hasAttribute('open')).toBe(false);
    expect(more.querySelector('summary')).not.toBeNull();
  });

  test.each(['.doc-toc-wide', '.doc-toc-narrow'])(
    '%s names every section once, in the page order, in both languages',
    sel => {
      const links = [...nav.querySelector(sel).querySelectorAll('li')].map(li =>
        li.querySelector('a').getAttribute('href').slice(1)
      );
      expect(links).toEqual(sectionIds.filter(id => id !== 'contents-h'));
      for (const li of nav.querySelector(sel).querySelectorAll('li')) {
        const target = doc.getElementById(
          li.querySelector('a').getAttribute('href').slice(1)
        );
        for (const lang of ['en', 'es'])
          expect(words(li, lang)).toBe(words(target, lang));
      }
    }
  );

  test('groups the sections by job, in five groups that cover the page', () => {
    const groups = [...nav.querySelectorAll('.doc-toc-wide .doc-toc-group')];
    expect(
      groups.map(
        g =>
          g
            .querySelector('h3')
            .textContent.replace(/\s+/g, ' ')
            .trim()
            .split(/(?<=[a-z])(?=[A-Z])/)[0]
      )
    ).toHaveLength(5);
    expect(groups.map(g => g.querySelectorAll('li').length)).toEqual([
      17, 18, 7, 2, 4,
    ]);
  });

  test('every section has a way back to it', () => {
    for (const h of sections) {
      const prev = h.previousElementSibling;
      expect({ id: h.id, back: prev?.classList.contains('doc-back') }).toEqual({
        id: h.id,
        back: true,
      });
      expect(prev.querySelector('a').getAttribute('href')).toBe('#contents');
      expect(words(prev, 'en')).toBe('Contents');
      expect(words(prev, 'es')).toBe('Contenido');
    }
  });
});

describe('the opening', () => {
  const tasks = doc.getElementById('tasks-h').parentElement;

  test('comes after the lede and before the contents', () => {
    const lede = doc.querySelector('.doc-lede');
    const nav = doc.getElementById('contents');
    expect(lede.compareDocumentPosition(tasks) & 4).toBeTruthy();
    expect(tasks.compareDocumentPosition(nav) & 4).toBeTruthy();
  });

  test('offers three tasks, each with a link, in both languages', () => {
    const items = [...tasks.querySelectorAll(':scope > ul > li')];
    expect(items).toHaveLength(3);
    for (const li of items)
      for (const lang of ['en', 'es']) {
        const span = li.querySelector(`.gs-${lang}`);
        expect(span.querySelector('a[href]')).not.toBeNull();
      }
    const hrefs = [...tasks.querySelectorAll('.gs-en a')].map(a =>
      a.getAttribute('href')
    );
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '#glance',
        '#gravity',
        '#transit-fitting',
        '#irreversible',
        '#validation',
        '/validation/',
        '#investigations',
      ])
    );
  });

  test('keeps the five labels near the top', () => {
    const table = doc.querySelector('.doc-table');
    expect(table.querySelectorAll('.gs-en .doc-badge')).toHaveLength(5);
    expect(
      doc.getElementById('glance').compareDocumentPosition(table) & 4
    ).toBeTruthy();
    expect(
      doc.getElementById('why').compareDocumentPosition(table) & 2
    ).toBeTruthy();
  });
});

describe('the fifteen core sections keep one order', () => {
  const HEADINGS = [
    'What it computes',
    'What it assumes',
    'Its limits',
    'What has been checked',
  ];
  const HEADINGS_ES = [
    'Qué calcula',
    'Qué supone',
    'Sus límites',
    'Qué se ha comprobado',
  ];

  test.each(CORE)('%s: computes, assumes, limits, checked', id => {
    const h2 = doc.getElementById(id);
    const parts = [];
    for (
      let el = h2.nextElementSibling;
      el && el.tagName !== 'H2' && !el.classList.contains('doc-back');
      el = el.nextElementSibling
    )
      if (el.tagName === 'H3') parts.push(el);
    expect(parts.map(p => words(p, 'en'))).toEqual(HEADINGS);
    expect(parts.map(p => words(p, 'es'))).toEqual(HEADINGS_ES);
    // A part is never an empty promise: something other than a heading follows.
    for (const p of parts)
      expect({ id, next: p.nextElementSibling?.tagName }).not.toMatchObject({
        next: expect.stringMatching(/^(H2|H3)$/),
      });
  });

  test('a heading inside a core section is a part heading or sits one level below', () => {
    for (const id of CORE) {
      let el = doc.getElementById(id).nextElementSibling;
      let h3 = 0;
      for (
        ;
        el && el.tagName !== 'H2' && !el.classList.contains('doc-back');
        el = el.nextElementSibling
      )
        h3 += (el.tagName === 'H3' ? 1 : 0) + el.querySelectorAll('h3').length;
      expect({ id, h3 }).toEqual({ id, h3: 4 });
    }
  });

  test('every link to a validation group names a group the page prints', () => {
    const groups = new Set(
      JSON.parse(read('validation/data.json')).checks.map(c =>
        groupAnchor(c.group)
      )
    );
    const found = [
      ...doc.querySelectorAll('main a[href^="/validation/#"]'),
    ].map(a => a.getAttribute('href').slice('/validation/#'.length));
    expect(found.length).toBeGreaterThan(10);
    for (const g of found)
      expect({ g, there: groups.has(g) }).toEqual({ g, there: true });
  });

  test('a section whose area is mapped to validation groups links the first of them', () => {
    for (const area of AREAS)
      if (area.model && CORE.includes(area.model) && area.model === 'gravity')
        for (const g of area.groups)
          expect(
            doc.getElementById('gravity').parentElement.innerHTML
          ).toContain(`/validation/#${groupAnchor(g)}`);
  });
});

describe('the page keeps its words', () => {
  test('both languages are present for every part and task, side by side', () => {
    for (const el of doc.querySelectorAll(
      '.doc-tasks li, .doc-back, .doc-toc li'
    ))
      expect({
        text: el.textContent.slice(0, 40),
        en: !!el.querySelector('.gs-en') || el.classList.contains('doc-back'),
        es: !!el.querySelector('.gs-es'),
      }).toMatchObject({ en: true, es: true });
  });
});
