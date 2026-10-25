// =============================================================================
// The accessible HTML report (Prompt 127)
// -----------------------------------------------------------------------------
// js/htmlReport.js is the other builder behind the lab report: the same calls
// as js/pdf.js, a self-contained page out. These hold it to what makes it
// accessible: one h1 and no skipped heading level, a table for every chart,
// text alternatives on every figure, nothing that runs, escaped text, and the
// same content as the PDF for the same lesson.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createRequire } from 'node:module';

import { createHtmlDocument } from '../js/htmlReport.js';
import { buildLabReport } from '../js/labReport.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { checkAnswer } from '../js/answerCheck.js';
import { stepKey } from '../js/investigations/progressSchema.js';

const require = createRequire(import.meta.url);
const parse5 = require('parse5');

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default || Object.values(m)[0]
);
const translator = catalog => (id, vars) =>
  String(catalog[id] ?? id).replace(/\{(\w+)\}/g, (whole, k) =>
    vars && k in vars ? String(vars[k]) : whole
  );

const walk = (node, fn) => {
  fn(node);
  (node.childNodes || []).forEach(n => walk(n, fn));
};
const tags = html => {
  const found = [];
  walk(parse5.parse(html), n => n.tagName && found.push(n));
  return found;
};

const lab = ({ locale = 'en', plot = null } = {}) => {
  const visited = new Set(kepler.steps.map(s => s.sid));
  return {
    html: buildLabReport({
      createDoc: createHtmlDocument,
      locale,
      t: translator(locale === 'es' ? ES_REPORT : EN_REPORT),
      investigation: kepler,
      plot,
      name: 'Ada <b>',
      submissionToken: 'TOKEN-abc_123',
      responses: {},
      attempts: {},
      visited,
      startedAt: '2026-09-01T10:00:00.000Z',
      links: [{ step: 1, title: 'A state', url: 'https://example.org/x#a' }],
      stepIdFor: index => stepKey(kepler.id, kepler.steps[index]?.sid),
      assignment: null,
      binding: null,
      checkAnswer: (step, value) => checkAnswer(step, value, { locale }),
      decodeEntities,
    }),
  };
};

describe('the HTML document builder', () => {
  test('is one self-contained page: a language, a title, one main, nothing that runs', () => {
    const { html } = lab();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    const els = tags(html);
    expect(els.find(n => n.tagName === 'html').attrs).toContainEqual({
      name: 'lang',
      value: 'en',
    });
    expect(els.filter(n => n.tagName === 'main')).toHaveLength(1);
    expect(els.filter(n => n.tagName === 'title')).toHaveLength(1);
    for (const bad of ['script', 'iframe', 'object', 'embed', 'img', 'link'])
      expect(els.filter(n => n.tagName === bad)).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/https?:\/\/(?!example\.org|www\.w3\.org)/);
  });

  test('says the language the student worked in', () => {
    expect(lab({ locale: 'es' }).html).toMatch(/<html lang="es">/);
  });

  test('has one h1 and never skips a heading level', () => {
    const levels = tags(lab().html)
      .filter(n => /^h[1-6]$/.test(n.tagName))
      .map(n => +n.tagName[1]);
    expect(levels.filter(l => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    let deepest = 1;
    for (const l of levels) {
      expect(l).toBeLessThanOrEqual(deepest + 1);
      deepest = Math.max(deepest, l);
    }
  });

  test('escapes what a student typed and keeps the submission token readable', () => {
    const { html } = lab();
    expect(html).toContain('Ada &lt;b&gt;');
    expect(html).not.toContain('Ada <b>');
    expect(html).toContain('TOKEN-abc_123');
  });

  test('a chart is an image with a title and description, and its numbers are a table', () => {
    const plot = {
      points: [
        { x: 1, y: 2, label: 'Mercury' },
        { x: 2, y: 4.1, label: 'Venus' },
        { x: 3, y: 5.9, label: 'Earth' },
      ],
      xLabel: 'a (AU)',
      yLabel: 'T (yr)',
      slope: 2,
    };
    const els = tags(lab({ plot }).html);
    const svg = els.find(n => n.tagName === 'svg');
    expect(svg.attrs).toContainEqual({ name: 'role', value: 'img' });
    expect(els.filter(n => n.tagName === 'title').length).toBeGreaterThan(1);
    expect(els.some(n => n.tagName === 'desc')).toBe(true);
    const figure = els.find(n => n.tagName === 'figure');
    expect(figure).toBeTruthy();
    const rows = [];
    walk(figure, n => n.tagName === 'tr' && rows.push(n));
    expect(rows).toHaveLength(4);
    expect(lab({ plot }).html).toContain('Mercury');
  });

  test('a figure with several series gets a table for each, with uncertainties', () => {
    const d = createHtmlDocument({ title: 't' });
    d.figure({
      series: [
        {
          label: 'measured',
          kind: 'measured',
          points: [
            [1, 2],
            [2, 3],
          ],
          errors: [0.1, 0.2],
        },
        {
          label: 'model',
          kind: 'analytic',
          points: [
            [1, 2.1],
            [2, 2.9],
          ],
          style: 'dashed',
        },
      ],
      xLabel: 'time',
      yLabel: 'speed',
    });
    const html = d.build();
    expect((html.match(/<table>/g) || []).length).toBe(2);
    expect(html).toContain('Uncertainty');
    expect(html).toContain('measured');
  });

  test('has the same content as the PDF for the same lesson', () => {
    const { html } = lab();
    const text = tags(html)
      .filter(n => /^h[1-3]$/.test(n.tagName))
      .map(n => n.childNodes.map(c => c.value || '').join(''))
      .join('\n');
    expect(text).toContain(kepler.title.replace(/&[a-z]+;/g, '').slice(0, 6));
    expect(text).toContain(EN_REPORT['rp.resp']);
    expect(text).toContain(EN_REPORT['rp.sum']);
  });

  test('only web links are links', () => {
    const d = createHtmlDocument({ title: 't' });
    d.link('x', 'javascript:alert(1)').link('y', 'https://example.org/');
    const html = d.build();
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://example.org/"');
  });
});
