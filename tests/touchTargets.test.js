// The mobile sweep's records, held to what they record (Prompt 283).
//
// e2e/mobileSweep.spec.js measures every pointer target of the walk inventory
// at a phone and a tablet; tools/touch-targets.json is what it measured and
// the rule it applied; tools/mobile-workflows.json names the workflows it
// walks. This test needs no browser: a surface added to the inventory with no
// measurement, a workflow named and not walked, or a walk with no name, fails.

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const spec = readFileSync('e2e/mobileSweep.spec.js', 'utf8');
const record = read('tools/touch-targets.json');
const workflows = read('tools/mobile-workflows.json').workflows;
const inventory = read('tools/interaction-contract.json').inventory;

/** The ids the spec's SURFACES table opens beyond the inventory. */
const surfaceIds = [...spec.matchAll(/^\s{4}id: '([a-z0-9-]+)',$/gm)].map(
  m => m[1]
);

describe('the pointer-target record', () => {
  const measured = Object.keys(record.measured);

  test('every page and state of the walk inventory is measured at a phone and a tablet', () => {
    const want = [
      ...inventory.rows.filter(r => r.surface !== 'history-original'),
      ...inventory.states.map(s => ({ surface: s.id })),
    ].map(r => r.surface);
    for (const size of ['phone', 'tablet'])
      for (const id of want) expect(measured).toContain(`${size}:${id}`);
  });

  test('every surface the spec opens beyond the inventory is measured too', () => {
    for (const id of ['lesson-panel-measure', 'observatory-image-open'])
      expect(surfaceIds).toContain(id);
    for (const size of ['phone', 'tablet'])
      for (const id of surfaceIds.filter(
        i => !i.startsWith('S') && !i.startsWith('N')
      ))
        expect(measured).toContain(`${size}:${id}`);
  });

  test('each measurement adds up, and measured something', () => {
    for (const [name, m] of Object.entries(record.measured)) {
      expect(m.targets).toBeGreaterThan(0);
      expect(m.atSize + m.spacing + m.inline + m.control).toBe(m.targets);
      expect(m.under44).toBeLessThanOrEqual(m.targets);
      expect(name).toMatch(/^(phone|tablet):/);
    }
  });

  test('the rule names the three exceptions the measurement applies', () => {
    expect(Object.keys(record.exceptions).sort()).toEqual([
      'control',
      'inline',
      'spacing',
    ]);
    expect(record.rule).toMatch(/24 x 24/);
  });
});

describe('the workflows', () => {
  test('the list holds the ten student workflows and five instrument workflows, once each', () => {
    const ids = workflows.map(w => w.id);
    expect(new Set(ids).size).toBe(15);
    for (let i = 1; i <= 10; i++) expect(ids).toContain(`S${i}`);
    for (let i = 1; i <= 5; i++) expect(ids).toContain(`N${i}`);
  });

  test('every workflow named is walked by the spec, and every walk is named', () => {
    const walked = [...spec.matchAll(/^\s{4}id: '([SN]\d+)',$/gm)].map(
      m => m[1]
    );
    expect(walked.sort()).toEqual(workflows.map(w => w.id).sort());
  });

  test('the spec walks both sizes and both languages', () => {
    expect(spec).toMatch(/const LOCALES = \['en', 'es'\]/);
    expect(spec).toMatch(/width: 375, height: 812/);
    expect(spec).toMatch(/width: 768, height: 1024/);
  });
});
