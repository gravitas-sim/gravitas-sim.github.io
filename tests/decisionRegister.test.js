// =============================================================================
// DECISION_REGISTER.md stays complete
// -----------------------------------------------------------------------------
// The register is the list of decisions later work may rely on (Roadmap II,
// Prompt 45). It is only worth trusting if nothing can fall out of it:
//
//   - every *_GATE.md and *_RFC.md in the repository has a row naming it;
//   - every row's source commit is in git history;
//   - every id is unique, and every status one of the five;
//   - every Roadmap II prompt a row names is a number in 44-121.
//
// CI's checks job checks out the full history without file contents
// (fetch-depth 0, filter blob:none), so a commit from any time resolves.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const STATUSES = [
  'RATIFIED',
  'DELEGATED',
  'SUPERSEDED',
  'REVERSED',
  'PROPOSED',
];
const text = readFileSync('DECISION_REGISTER.md', 'utf8');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

/** Every row of every table whose first cell is a register id. */
function rows() {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('| D-')) continue;
    const cells = line
      .slice(1, -1)
      .split(' | ')
      .map(c => c.trim());
    out.push({
      id: cells[0],
      title: cells[1],
      source: cells[2],
      verdict: cells[3],
      status: cells[4],
      where: cells[5],
      reverse: cells[6],
      prompts: cells[7],
      cells: cells.length,
    });
  }
  return out;
}
const all = rows();

describe('the decision register', () => {
  test('has rows, each with its eight columns and an id of the form D-NAME-NN', () => {
    expect(all.length).toBeGreaterThan(30);
    for (const r of all) {
      expect([r.id, r.cells]).toEqual([r.id, 8]);
      expect(r.id).toMatch(/^D-[A-Z0-9]+-\d{2}$/);
      for (const k of ['title', 'source', 'verdict', 'where', 'reverse'])
        expect([r.id, k, r[k].length > 0]).toEqual([r.id, k, true]);
    }
  });

  test('every id is unique', () => {
    const ids = all.map(r => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  test('every status is one of the five', () => {
    for (const r of all) {
      const word = r.status.replace(/\*/g, '').split(/\s/)[0];
      expect([r.id, STATUSES.includes(word)]).toEqual([r.id, true]);
    }
  });

  test('a ratification says who ratified it, and how', () => {
    // Carl's own review, or delegation under his standing instruction: the
    // two are never allowed to look alike.
    for (const r of all.filter(x => x.status.includes('RATIFIED'))) {
      expect([r.id, /Carl/.test(r.where)]).toEqual([r.id, true]);
      expect([r.id, /reviewed by carl|by delegation/i.test(r.where)]).toEqual([
        r.id,
        true,
      ]);
      expect([r.id, /\d{4}-\d{2}-\d{2}/.test(r.where)]).toEqual([r.id, true]);
    }
  });

  test('every gate and RFC document has a row naming it', () => {
    const docs = git('ls-files')
      .split('\n')
      .filter(f => /^[^/]+_(GATE|RFC)\.md$/.test(f));
    expect(docs.length).toBeGreaterThan(5);
    for (const f of docs)
      expect([f, all.some(r => r.source.includes(`\`${f}\``))]).toEqual([
        f,
        true,
      ]);
  });

  test('every source is a file in the repository or the roadmap, at a commit in history', () => {
    const files = new Set(git('ls-files').split('\n'));
    for (const r of all) {
      const m = /^`([^`]+)` \((-|[0-9a-f]{7,40})\)$/.exec(r.source);
      expect([r.id, !!m]).toEqual([r.id, true]);
      const [, file, sha] = m;
      if (file === 'roadmap') {
        // A binding decision only a roadmap states: the roadmaps live outside
        // the repository, so there is no commit to name.
        expect([r.id, sha]).toEqual([r.id, '-']);
        continue;
      }
      expect([r.id, files.has(file)]).toEqual([r.id, true]);
      expect(() => git('cat-file', '-e', `${sha}^{commit}`)).not.toThrow();
    }
  });

  test('every Roadmap II prompt a row names is between 44 and 121', () => {
    for (const r of all) {
      if (r.prompts === '-') continue;
      const nums = r.prompts.split(/,\s*/).map(Number);
      for (const n of nums)
        expect([r.id, Number.isInteger(n) && n >= 44 && n <= 121]).toEqual([
          r.id,
          true,
        ]);
    }
  });

  test('says how to use it', () => {
    expect(text).toContain('## How to use this register');
    for (const s of STATUSES) expect(text).toContain(`**${s}**`);
  });
});
