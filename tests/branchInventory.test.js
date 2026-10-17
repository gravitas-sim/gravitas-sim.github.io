// The branch inventory classifies branches and prints commands; it deletes nothing.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classify,
  command,
  indexPrs,
  inventory,
  STALE_DAYS,
} from '../tools/branch-inventory.mjs';

const NOW = new Date('2026-10-17T00:00:00Z');
const none = { open: false, closedUnmerged: false };
const day = n => new Date(NOW - n * 86_400_000).toISOString();

describe('branch inventory', () => {
  test('main, v3 and trains are protected whatever else is true', () => {
    for (const name of ['main', 'v3', 'gh-pages', 'train/v4'])
      expect(
        classify({ name, merged: true, date: day(999) }, none, { now: NOW })
      ).toBe('protected');
  });

  test('screenshot asset branches are kept even when merged', () => {
    expect(
      classify({ name: 'pr-assets/feat/x', merged: true, date: day(1) }, none, {
        now: NOW,
      })
    ).toBe('asset');
  });

  test('the states, in the order they are decided', () => {
    const c = (b, p = none) => classify({ name: 'x', ...b }, p, { now: NOW });
    expect(c({ merged: true, date: day(1) }, { ...none, open: true })).toBe(
      'open-pr'
    );
    expect(c({ merged: true, date: day(1) })).toBe('merged');
    expect(
      c({ merged: false, date: day(1) }, { ...none, closedUnmerged: true })
    ).toBe('closed-pr');
    expect(c({ merged: false, date: day(STALE_DAYS + 1) })).toBe('stale');
    expect(c({ merged: false, date: day(STALE_DAYS - 1) })).toBe('active');
  });

  test('a command is printed only where nothing would be lost', () => {
    expect(command('a', 'merged', 'o/r')).toBe(
      'gh api -X DELETE repos/o/r/git/refs/heads/a'
    );
    for (const s of ['stale', 'closed-pr', 'open-pr', 'active', 'protected'])
      expect(command('a', s, 'o/r')).toBe('');
  });

  test('pull requests are indexed by head branch', () => {
    const by = indexPrs([
      { headRefName: 'a', state: 'OPEN' },
      { headRefName: 'a', state: 'MERGED' },
      { headRefName: 'b', state: 'CLOSED' },
    ]);
    expect(by.get('a')).toEqual({ open: true, closedUnmerged: false });
    expect(by.get('b')).toEqual({ open: false, closedUnmerged: true });
  });

  test('the inventory sorts by state and name and never edits the list it is given', () => {
    const branches = [
      { name: 'z', merged: true, date: day(5) },
      { name: 'a', merged: true, date: day(5) },
      { name: 'main', merged: true, date: day(5) },
    ];
    const copy = JSON.stringify(branches);
    const rows = inventory({ branches, repo: 'o/r', now: NOW });
    expect(rows.map(r => r.name)).toEqual(['a', 'z', 'main']);
    expect(JSON.stringify(branches)).toBe(copy);
  });

  test('run against a real clone it reports and deletes nothing', () => {
    const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'inv-')));
    const git = (...a) =>
      execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@example.invalid');
    git('config', 'user.name', 't');
    writeFileSync(path.join(dir, 'f'), '1');
    git('add', '-A');
    git('commit', '-qm', 'one');
    git('branch', 'merged-one');
    git('checkout', '-q', '-b', 'ahead');
    writeFileSync(path.join(dir, 'f'), '2');
    git('commit', '-qam', 'two');
    git('checkout', '-q', 'main');
    // Make them look like remote-tracking refs.
    for (const b of ['main', 'merged-one', 'ahead'])
      git('update-ref', `refs/remotes/origin/${b}`, b);
    git('remote', 'add', 'origin', 'https://github.com/o/r.git');
    const script = path.resolve('tools/branch-inventory.mjs');
    const out = JSON.parse(
      execFileSync('node', [script, '--json'], { cwd: dir, encoding: 'utf8' })
    );
    const by = Object.fromEntries(out.map(r => [r.name, r]));
    expect(by.main.state).toBe('protected');
    expect(by['merged-one'].state).toBe('merged');
    expect(by['merged-one'].command).toContain('refs/heads/merged-one');
    expect(by.ahead.state).toBe('active');
    expect(by.ahead.command).toBe('');
    // Nothing was deleted.
    expect(git('branch', '--list').split('\n').filter(Boolean)).toHaveLength(3);
    expect(
      git('for-each-ref', 'refs/remotes/origin').trim().split('\n')
    ).toHaveLength(3);
  });
});
