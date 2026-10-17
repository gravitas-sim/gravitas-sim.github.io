// =============================================================================
// The known-discrepancies register (Prompt 125)
// -----------------------------------------------------------------------------
// tools/known-discrepancies.json lists what differs from a source or stays a
// stated limit; the model page's table is generated from it and from the
// validation report. This holds the register to its two promises: every check
// it names is in the report, so a rename cannot silently empty a row, and a
// failing check with no row is printed rather than passed over.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { knownDiscrepancyRows } from '../tools/generated-blocks.mjs';

const registry = JSON.parse(
  readFileSync('tools/known-discrepancies.json', 'utf8')
);
const report = JSON.parse(readFileSync('validation/data.json', 'utf8'));

describe('the known-discrepancies register', () => {
  test('every entry is complete and every check it names is in the report', () => {
    const names = new Set(report.checks.map(c => c.name));
    const ids = new Set();
    for (const e of registry.entries) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(['explained', 'limit', 'decided', 'closed']).toContain(e.status);
      for (const k of ['item', 'summary', 'where']) {
        expect(typeof e[k]).toBe('string');
        expect(e[k].length).toBeGreaterThan(20);
      }
      for (const c of e.checks) expect(names.has(c)).toBe(true);
    }
  });

  test('the table follows the report: a failing check shows, and a failing one with no row is named', () => {
    const named = registry.entries.find(e => e.checks.length).checks[0];
    const failing = {
      checks: [
        ...report.checks.map(c =>
          c.name === named ? { ...c, pass: false } : c
        ),
        { name: 'A future check', pass: false },
      ],
    };
    const rows = knownDiscrepancyRows(registry, failing);
    expect(rows).toContain('<strong>fails</strong>');
    expect(rows).toContain('Failing, with no row above');
    expect(rows).toContain('A future check');
    const now = knownDiscrepancyRows(registry, report);
    expect(now).toContain('none (');
    expect(now).not.toContain('<strong>fails</strong>');
  });

  test('a check renamed away from its row says so', () => {
    const rows = knownDiscrepancyRows(registry, {
      checks: report.checks.filter(
        c => c.name !== registry.entries[0].checks[0]
      ),
    });
    expect(rows).toContain('not in the report');
  });
});
