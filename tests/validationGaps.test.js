// =============================================================================
// The suite's table of groups and its list of gaps (Prompt 137)
// -----------------------------------------------------------------------------
// js/validation/groups/ holds one file per area and physicsChecks.js lists them.
// tools/validation-gaps.json says what the suite does not validate, and
// PHYSICS_VALIDATION.md's list and the model page's known-discrepancies table
// are both printed from it. This holds those to their promises: a file
// nobody registered does not run, a gap cannot name a group or a check the
// report does not have, and the list in the manual is the generated one.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';

import {
  physicsGapsList,
  knownDiscrepancyRows,
} from '../tools/generated-blocks.mjs';
import * as tolerances from '../js/validation/engineTolerances.js';

const gaps = JSON.parse(readFileSync('tools/validation-gaps.json', 'utf8'));
const report = JSON.parse(readFileSync('validation/data.json', 'utf8'));
const registry = JSON.parse(
  readFileSync('tools/known-discrepancies.json', 'utf8')
);
const inventory = {
  groups: [...new Set(report.checks.map(c => c.group))].map(group => ({
    group,
    checks: report.checks.filter(c => c.group === group).length,
  })),
};

describe('the table of groups', () => {
  const table = readFileSync('js/validation/physicsChecks.js', 'utf8');
  const registered = [
    ...table.matchAll(/import\('\.\/groups\/([\w-]+)\.js'\)/g),
  ]
    .map(m => m[1])
    .sort();
  const files = readdirSync('js/validation/groups')
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace(/\.js$/, ''))
    .sort();

  test('every group file is registered, and every registration is a file', () => {
    expect(registered).toEqual(files);
  });

  test('no group is registered twice', () => {
    expect(new Set(registered).size).toBe(registered.length);
  });
});

describe('the tolerances committed first', () => {
  test('every value is a positive number and the objects are frozen', () => {
    for (const [name, group] of Object.entries(tolerances)) {
      expect(Object.isFrozen(group)).toBe(true);
      for (const [key, v] of Object.entries(group))
        expect([name, key, typeof v, v > 0]).toEqual([
          name,
          key,
          'number',
          true,
        ]);
    }
  });
});

describe('the list of gaps', () => {
  test('every entry is complete and names only groups and checks the report has', () => {
    const groups = new Set(inventory.groups.map(g => g.group));
    const names = new Set(report.checks.map(c => c.name));
    const ids = new Set();
    for (const e of gaps.entries) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(['unvalidated', 'partial', 'decided']).toContain(e.status);
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.text.length).toBeGreaterThan(40);
      for (const g of e.groups) expect(groups.has(g)).toBe(true);
      // An entry that says nothing is checked cannot name a group.
      if (e.status === 'unvalidated') expect(e.groups).toEqual([]);
      for (const c of e.modelPage?.checks ?? [])
        expect(names.has(c)).toBe(true);
    }
  });

  test('the inspiral is recorded as decided, with its register row', () => {
    const inspiral = gaps.entries.find(e => e.id === 'inspiral');
    expect(inspiral.status).toBe('decided');
    expect(inspiral.text).toMatch(/D-R10-13/);
    const register = readFileSync('DECISION_REGISTER.md', 'utf8');
    expect(register).toMatch(/\| D-R10-13 \|/);
  });

  test('a group the suite does not have is refused, not printed', () => {
    const bad = {
      entries: [
        {
          id: 'x',
          title: 'A gap',
          text: 'Some text.',
          groups: ['No such group'],
        },
      ],
    };
    expect(() => physicsGapsList(bad, inventory)).toThrow(/does not have/);
  });

  test("the list prints the suite's own counts", () => {
    const text = physicsGapsList(gaps, inventory);
    const count = inventory.groups.find(
      g => g.group === 'Barnes-Hut gravity'
    ).checks;
    expect(text).toContain(`Barnes-Hut gravity (${count} checks)`);
    expect(text).toContain('**Rendering.**');
  });

  test('the manual carries the generated list in place of a hand-written one', () => {
    const md = readFileSync('PHYSICS_VALIDATION.md', 'utf8');
    expect(md).toContain('<!--fact-block:physicsGaps-->');
    expect(md).not.toMatch(
      /^- \*\*Rendering\.\*\* Nothing here reads a pixel\.$/m
    );
    expect(md).toContain('Checked in part by: Barnes-Hut gravity');
  });

  test('the model page table reads it: the inspiral and the departures are rows', () => {
    const rows = knownDiscrepancyRows(registry, report, gaps);
    expect(rows).toContain('The gravitational-wave inspiral');
    expect(rows).toContain('Debris generation and particle effects');
    expect(rows).toContain('none (');
    expect(rows).not.toContain('<strong>fails</strong>');
  });
});
