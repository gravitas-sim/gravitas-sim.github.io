// =============================================================================
// The surface gate's decision function (Prompt 165)
// -----------------------------------------------------------------------------
// tools/surface-gate.mjs holds the thresholds, the support periods and decide().
// These cases pin each rule of the function on a made-up surface, so that a
// threshold or a rule cannot move without a test saying so. The recorded
// evidence is held to the function further down.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DOC,
  PERIODS,
  THRESHOLDS,
  VERDICTS,
  costClass,
  decide,
  evidenceOf,
  judge,
  mergeJustified,
  problems,
  readEvidence,
  renderDoc,
  schemaLessFormats,
  supportClass,
} from '../tools/surface-gate.mjs';

const none = { links: [], records: [], stateLinks: [] };
const used = { shippedLinks: 2, libraryEntries: 0 };
const unused = { shippedLinks: 0, libraryEntries: 0 };
const costly = { lines: 2000, testFiles: 4 };
const cheap = { lines: 200, testFiles: 1 };
const gain = {
  target: 'a destination page',
  removesRoutes: 1,
  savingKb: 6,
  keepsRequestCeiling: true,
};

const base = {
  unique: 'no',
  replacement: 'somewhere',
  menu: false,
  firstAction: false,
  use: unused,
  cost: cheap,
  exposure: none,
  merge: null,
};
const verdict = over => decide({ ...base, ...over });

describe('the thresholds and periods are the committed ones', () => {
  test('cost is material at two of six signals, and a signal is a number reached', () => {
    expect(THRESHOLDS.material).toEqual({
      atLeast: 2,
      lines: 1500,
      testFiles: 3,
      generated: 2,
      strings: 150,
      precacheKb: 20,
      axeRows: 4,
    });
    expect(costClass({ lines: 1500 }).material).toBe(false);
    expect(costClass({ lines: 1500, axeRows: 4 })).toEqual({
      material: true,
      reached: ['lines', 'axeRows'],
    });
    expect(costClass({ lines: 1499, axeRows: 3 }).material).toBe(false);
    expect(costClass({}).material).toBe(false);
  });

  test('a merge needs a target, a removed route and one measured gain', () => {
    expect(mergeJustified(gain)).toBe(true);
    expect(mergeJustified({ ...gain, target: null })).toBe(false);
    expect(mergeJustified({ ...gain, removesRoutes: 0 })).toBe(false);
    expect(mergeJustified({ ...gain, savingKb: 4.9 })).toBe(false);
    expect(mergeJustified({ ...gain, savingKb: 0, choicesRemoved: 1 })).toBe(
      true
    );
    expect(mergeJustified({ ...gain, savingKb: 0, duplicatedModules: 1 })).toBe(
      true
    );
    expect(mergeJustified({ ...gain, keepsRequestCeiling: false })).toBe(false);
    // Unmeasured is not proven: the ceiling must be shown to hold.
    expect(mergeJustified({ ...gain, keepsRequestCeiling: undefined })).toBe(
      false
    );
    expect(mergeJustified({ ...gain, keepsRequestCeiling: null })).toBe(false);
    expect(mergeJustified(null)).toBe(false);
  });

  test('the support periods are in months and releases, never "one release"', () => {
    expect(PERIODS).toEqual({
      L: {
        deprecated: { months: 6, minorReleases: 2 },
        readOnly: { months: 6, minorReleases: 1 },
      },
      R: {
        deprecated: { months: 12, minorReleases: 2 },
        readOnly: { months: 12, minorReleases: 1 },
      },
    });
    for (const cls of Object.values(PERIODS)) {
      for (const phase of Object.values(cls)) {
        expect(phase.months).toBeGreaterThanOrEqual(6);
        expect(phase.minorReleases).toBeGreaterThanOrEqual(1);
      }
    }
    expect(supportClass({ exposure: { records: ['gravitas.made'] } })).toBe(
      'R'
    );
    expect(supportClass({ exposure: { stateLinks: ['?x='] } })).toBe('R');
    expect(supportClass({ exposure: { links: ['/a/'] } })).toBe('L');
    expect(supportClass({})).toBe('L');
  });
});

describe('every rule fires on its own case', () => {
  test('R0 an unanswered unique-task test keeps the surface', () => {
    expect(verdict({ unique: 'UNKNOWN' })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R0',
    });
    expect(verdict({ unique: undefined })).toMatchObject({ rule: 'R0' });
  });

  test('R1 a destination page is kept whatever it costs and however little is linked', () => {
    expect(verdict({ firstAction: true, cost: costly })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R1',
    });
  });

  test('R2 a menu entry that is not a destination is grouped', () => {
    expect(verdict({ menu: true, unique: 'yes' })).toMatchObject({
      verdict: 'GROUP',
      rule: 'R2',
    });
  });

  test('R3 a unique task is kept, and frozen only when unused, unheld and costly', () => {
    expect(verdict({ unique: 'yes', replacement: null })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R3b',
    });
    expect(verdict({ unique: 'yes', cost: costly })).toMatchObject({
      verdict: 'FREEZE',
      rule: 'R3a',
    });
    expect(verdict({ unique: 'yes', cost: costly, use: used }).verdict).toBe(
      'KEEP'
    );
    expect(
      verdict({
        unique: 'yes',
        cost: costly,
        exposure: { ...none, records: ['r'] },
      }).verdict
    ).toBe('KEEP');
    expect(
      verdict({
        unique: 'yes',
        cost: costly,
        exposure: { ...none, links: ['/x/'] },
      }).verdict
    ).toBe('KEEP');
  });

  test('R4 no named replacement means nothing to point at', () => {
    expect(verdict({ replacement: null })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R4',
    });
    expect(verdict({ unique: 'partly', replacement: '' }).rule).toBe('R4');
  });

  test('R5 fully replaced and unused is retired, in the class its exposure sets', () => {
    expect(verdict({})).toMatchObject({
      verdict: 'RETIRE',
      rule: 'R5',
      support: 'L',
    });
    expect(verdict({ exposure: { ...none, records: ['r'] } })).toMatchObject({
      verdict: 'RETIRE',
      support: 'R',
    });
    expect(verdict({ exposure: { ...none, links: ['/old/'] } }).support).toBe(
      'L'
    );
  });

  test('R6 partly replaced and unused is frozen when it costs, kept when it does not', () => {
    expect(verdict({ unique: 'partly', cost: costly })).toMatchObject({
      verdict: 'FREEZE',
      rule: 'R6a',
    });
    expect(verdict({ unique: 'partly' })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R6b',
    });
  });

  test('R7 used and replaceable consolidates only on a measured gain', () => {
    expect(verdict({ use: used, merge: gain })).toMatchObject({
      verdict: 'CONSOLIDATE',
      rule: 'R7',
      support: 'L',
    });
    expect(verdict({ unique: 'partly', use: used, merge: gain }).verdict).toBe(
      'CONSOLIDATE'
    );
    expect(
      verdict({ use: used, merge: { ...gain, savingKb: 1 } }).verdict
    ).toBe('KEEP');
  });

  test('R8 used, replaceable and no gain is frozen when it costs and kept when it does not', () => {
    expect(verdict({ use: used, cost: costly })).toMatchObject({
      verdict: 'FREEZE',
      rule: 'R8a',
    });
    expect(verdict({ use: used })).toMatchObject({
      verdict: 'KEEP',
      rule: 'R8b',
    });
  });

  test('a surface in use is never retired by the function', () => {
    for (const unique of ['no', 'partly']) {
      for (const cost of [cheap, costly]) {
        expect(verdict({ unique, cost, use: used }).verdict).not.toBe('RETIRE');
        expect(
          verdict({ unique, cost, use: { shippedLinks: 0, libraryEntries: 1 } })
            .verdict
        ).not.toBe('RETIRE');
      }
    }
  });
});

describe('the recorded evidence is judged by the function and nothing else', () => {
  const evidence = readEvidence();
  const doc = readFileSync(DOC, 'utf8');

  test('every stored verdict is what decide() gives, and nothing is left unjudged', () => {
    expect(problems(evidence)).toEqual([]);
  });

  test('every format without a schema has a record, and no record names a format that has one', async () => {
    const names = await schemaLessFormats();
    const recorded = evidence.surfaces
      .filter(r => r.kind === 'stored-format')
      .map(r => r.name);
    expect(recorded.sort()).toEqual([...names].sort());
    expect(names).toHaveLength(24);
  });

  test('the surfaces the roadmap named are all judged', () => {
    const ids = new Set(evidence.surfaces.map(r => r.id));
    for (const id of [
      'history-original',
      'compute',
      'sky-lab',
      'lab3d',
      'mission-lab',
      'experiments',
      'analysis-lab',
      'figure-builder',
      'scenario-studio',
      'composer',
      'course-builder',
      'catalog',
      'evaluation',
      'contributed-section',
      'where-it-runs-facet',
      'activity-demonstration',
      'activity-route',
      'activity-guided',
      'activity-lab',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  test('the verdicts are the five and the unknowns stay unknown', () => {
    for (const r of evidence.surfaces) {
      expect(VERDICTS).toContain(r.verdict);
      expect(r.referrer).toBe('UNKNOWN');
      expect(r.why.length).toBeGreaterThan(20);
    }
  });

  test('GROUP matches nothing: the menu is the five destinations and nothing else', () => {
    expect(judge(evidence).filter(r => r.d.verdict === 'GROUP')).toEqual([]);
    for (const { e } of judge(evidence)) {
      if (e.menu)
        throw new Error(`${e.id} is a menu entry that is not a destination`);
    }
  });

  test('a surface in use is never retired, and a retired one is nothing a student made', () => {
    for (const { rec, e, d } of judge(evidence)) {
      if (d.verdict !== 'RETIRE') continue;
      expect(e.use.shippedLinks + e.use.libraryEntries).toBe(0);
      expect(rec.replacement).toBeTruthy();
      expect(rec.exposure.records).toEqual([]);
      expect(rec.exposure.stateLinks).toEqual([]);
    }
  });

  test('the measured numbers are plain numbers and the citations name files that exist', () => {
    for (const r of evidence.surfaces) {
      for (const v of Object.values(r.cost))
        expect(Number.isFinite(v)).toBe(true);
      expect(Number.isFinite(r.use.shippedLinks)).toBe(true);
      expect(Number.isFinite(r.use.libraryEntries)).toBe(true);
      for (const f of r.cited) readFileSync(path.resolve(f));
    }
    expect(evidenceOf(evidence.surfaces[0]).exposure.links).toBeDefined();
  });

  test('SURFACE_RETIREMENT_GATE.md carries the generated tables as they are', () => {
    expect(renderDoc(doc)).toBe(doc);
  });

  test('the document states the committed thresholds and periods', () => {
    const t = THRESHOLDS.material;
    for (const [label, n] of [
      ['source lines only this surface loads', t.lines.toLocaleString('en-US')],
      ['test files that name it', String(t.testFiles)],
      ['generated artifacts that exist for it alone', String(t.generated)],
      ['catalog keys per language that only it uses', String(t.strings)],
      ['gzip KB of its own files in the precache tiers', String(t.precacheKb)],
      ['accessibility-spec rows that open it', String(t.axeRows)],
    ]) {
      const row = doc.split('\n').find(l => l.startsWith(`| ${label}`));
      expect(row).toBeDefined();
      expect(row).toContain(n);
    }
    expect(t.atLeast).toBe(2);
    expect(doc).toContain('Material = at least two of the six');
    for (const cls of ['L', 'R']) {
      const d = PERIODS[cls].deprecated;
      const r = PERIODS[cls].readOnly;
      expect(doc).toContain(
        `at least ${d.months} months and ${d.minorReleases} minor releases`
      );
      expect(doc).toContain(
        `at least ${r.months} months and ${r.minorReleases} minor release`
      );
    }
  });

  test('the register row for the gate exists, is delegated and names Prompt 165', () => {
    const reg = readFileSync(path.resolve('DECISION_REGISTER.md'), 'utf8');
    const row = reg.split('\n').find(l => l.startsWith('| D-R10-44 |'));
    expect(row).toBeDefined();
    const cells = row
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map(c => c.trim());
    expect(cells).toHaveLength(8);
    expect(cells[4]).toBe('**DELEGATED**');
    expect(cells[7]).toBe('165');
  });
});
