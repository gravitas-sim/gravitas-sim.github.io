// =============================================================================
// STORAGE.md names every key the code stores under
// -----------------------------------------------------------------------------
// The inventory Roadmap II Prompt 65 starts from. A key written in js/ that the
// page does not name, or an IndexedDB database it does not list, fails here:
// what a student's browser holds is written down before it is written.
// =============================================================================

import { test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const doc = readFileSync('STORAGE.md', 'utf8');
const grep = pattern =>
  execFileSync('git', ['grep', '-hoE', pattern, '--', 'js'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

test('every storage key in js/ is in STORAGE.md', () => {
  const keys = new Set(
    grep('[\'"`]gravitas_[a-zA-Z0-9_:.-]*').map(k => k.slice(1))
  );
  // A search that matched nothing would pass everything.
  expect(keys.size).toBeGreaterThan(20);
  for (const key of [...keys, 'mobile_instructions_shown', 'gravitasDebug'])
    expect({ key, listed: doc.includes(key) }).toEqual({ key, listed: true });
});

test('every IndexedDB database is in STORAGE.md', () => {
  const names = grep('indexedDB\\.open\\([^,)]+').length;
  expect(names).toBeGreaterThan(0);
  for (const db of ['gravitas-catalog', 'gravitas-archive'])
    expect({ db, listed: doc.includes(db) }).toEqual({ db, listed: true });
  const opened = new Set(
    execFileSync(
      'git',
      ['grep', '-hoE', "(DB|NAME|name)\\s*=\\s*'gravitas-[a-z-]+'", '--', 'js'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .filter(Boolean)
      .map(l => /'([^']+)'/.exec(l)[1])
  );
  for (const db of opened)
    expect({ db, listed: doc.includes(db) }).toEqual({ db, listed: true });
});
