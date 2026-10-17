// =============================================================================
// The conformance report holds to its own rules (Prompt 127)
// -----------------------------------------------------------------------------
// ACCESSIBILITY_CONFORMANCE.md is generated from tools/conformance/*.json. These
// tests hold the data to what a report like this is worth: every WCAG 2.1 and
// 2.2 A and AA criterion is judged once; Supports means a method that can judge
// the whole scope covered it; an axe pass alone never gets there; and the
// limitations ACCESSIBILITY.md states are the limitations the report states.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';

import { load, render, OUT } from '../tools/conformance.mjs';

const data = load();
const { product, criteria } = data;

const A =
  `1.1.1 1.2.1 1.2.2 1.2.3 1.3.1 1.3.2 1.3.3 1.4.1 1.4.2 2.1.1 2.1.2 2.1.4 2.2.1 2.2.2 2.3.1 2.4.1 2.4.2 2.4.3 2.4.4 2.5.1 2.5.2 2.5.3 2.5.4 3.1.1 3.2.1 3.2.2 3.2.6 3.3.1 3.3.2 3.3.7 4.1.1 4.1.2`.split(
    ' '
  );
const AA =
  `1.2.4 1.2.5 1.3.4 1.3.5 1.4.3 1.4.4 1.4.5 1.4.10 1.4.11 1.4.12 1.4.13 2.4.5 2.4.6 2.4.7 2.4.11 2.5.7 2.5.8 3.1.2 3.2.3 3.2.4 3.3.3 3.3.4 3.3.8 4.1.3`.split(
    ' '
  );
const STATUSES = [
  'Supports',
  'Partially supports',
  'Does not support',
  'Not applicable',
  'Not evaluated',
];
const methods = new Map(product.methods.map(m => [m.id, m]));
const doc = readFileSync('ACCESSIBILITY.md', 'utf8');

describe('the criteria', () => {
  test('are every Level A and AA criterion of WCAG 2.1 and 2.2, once each, at the right level', () => {
    expect(
      criteria
        .filter(c => c.level === 'A')
        .map(c => c.id)
        .sort()
    ).toEqual([...A].sort());
    expect(
      criteria
        .filter(c => c.level === 'AA')
        .map(c => c.id)
        .sort()
    ).toEqual([...AA].sort());
    expect(new Set(criteria.map(c => c.id)).size).toBe(criteria.length);
  });

  test('each has a status, a remark, and methods that exist', () => {
    for (const c of criteria) {
      expect(STATUSES).toContain(c.status);
      expect(c.remarks.length).toBeGreaterThan(30);
      for (const m of c.methods) expect(methods.has(m)).toBe(true);
      if (c.status === 'Not evaluated') expect(c.methods).toEqual([]);
      if (c.status === 'Partially supports' || c.status === 'Supports')
        expect(c.methods.length).toBeGreaterThan(0);
      if (c.axeRules.length) expect(c.methods).toContain('axe');
    }
  });

  test('Supports needs a method that can judge the whole scope; axe alone never gets there', () => {
    for (const c of criteria.filter(x => x.status === 'Supports')) {
      expect(c.methods.some(m => methods.get(m).canJudgeWhole)).toBe(true);
      expect(c.methods).not.toEqual(['axe']);
      expect(c.gaps).toEqual([]);
    }
    for (const c of criteria.filter(x => x.methods.join() === 'axe'))
      expect(c.status).not.toBe('Supports');
  });

  test('a criterion a stated gap touches is never reported as Supports', () => {
    const byId = new Map(criteria.map(c => [c.id, c]));
    for (const g of product.gaps)
      for (const id of g.criteria) {
        expect(byId.has(id)).toBe(true);
        expect(byId.get(id).status).not.toBe('Supports');
        expect(byId.get(id).gaps).toContain(g.id);
      }
    for (const c of criteria)
      for (const id of c.gaps)
        expect(product.gaps.some(g => g.id === id)).toBe(true);
  });
});

describe('the scope', () => {
  test('names the ten student workflows and the instructor path, each with specs that exist', () => {
    expect(product.scope.student).toHaveLength(10);
    const all = [...product.scope.student, product.scope.instructor];
    for (const w of all) {
      expect(w.specs.length).toBeGreaterThan(0);
      for (const s of w.specs) expect(existsSync(`e2e/${s}`)).toBe(true);
    }
  });
});

describe('ACCESSIBILITY.md and the report agree', () => {
  test('the limitations the document lists are the gaps the report lists', () => {
    const start = doc.indexOf('## Honest limitations');
    const end = doc.indexOf('\n## ', start + 5);
    const section = doc.slice(start, end);
    const leads = [...section.matchAll(/^\*\*(.+?)\*\*/gm)].map(m => m[1]);
    expect(leads.sort()).toEqual(product.gaps.map(g => g.heading).sort());
  });

  test('both say the instructor PDFs are untagged and not PDF/UA, and the report does not claim otherwise', () => {
    expect(doc).toMatch(/\*\*not tagged\*\*/);
    expect(doc).toMatch(/not PDF\/UA conformant/);
    expect(product.documents.instructorPdfs).toMatch(/untagged/);
    expect(product.documents.instructorPdfs).toMatch(/not PDF\/UA conformant/);
    const text = readFileSync(OUT, 'utf8');
    expect(text).toMatch(/\*\*Does not support\*\*/);
    expect(text).not.toMatch(
      /PDF\/UA conformant\b(?!\.)(?<!not PDF\/UA conformant)/
    );
  });

  test("both say the evaluation is the project's own and that no assistive-technology user validated it", () => {
    const text = readFileSync(OUT, 'utf8');
    expect(text).toMatch(/not an external audit/);
    expect(text).toMatch(
      /Assistive-technology user validation has not occurred/
    );
    expect(text).toMatch(/does not claim conformance/);
  });

  test('ACCESSIBILITY_CONFORMANCE.md is generated from the data', () => {
    expect(readFileSync(OUT, 'utf8')).toBe(render(data));
  });
});
