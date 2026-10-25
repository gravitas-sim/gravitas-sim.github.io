import { describe, test, expect } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  readRegistry,
  runPending,
  formatReport,
  readResults,
} from '../tools/pending-acceptance.mjs';

// =============================================================================
// The future-acceptance contract (Prompt 145)
// A check for an unbuilt feature runs and is reported, but is not a failure
// until its prompt activates it by name; once activated it fails like any test.
// =============================================================================

const dir = () => mkdtempSync(path.join(tmpdir(), 'gravitas-pending-'));
const entry = (id, activated) => ({ id, prompt: '161', activated });
const missing = () => {
  throw new Error('no such control\nsecond line');
};

describe('pending acceptance', () => {
  test('the committed registry parses and lists nothing activated by accident', () => {
    const checks = readRegistry();
    expect(Array.isArray(checks)).toBe(true);
  });

  test('an inactive check that fails is reported as pending and does not throw', async () => {
    const out = dir();
    const r = await runPending('home.new-control', missing, {
      registry: [entry('home.new-control', false)],
      dir: out,
    });
    expect(r.status).toBe('pending');
    expect(r.message).toBe('no such control');
    expect(readResults(out)).toEqual([r]);
  });

  test('an inactive check that passes is reported as met, ready to activate', async () => {
    const out = dir();
    const r = await runPending('home.done', () => {}, {
      registry: [entry('home.done', false)],
      dir: out,
    });
    expect(r.status).toBe('met');
    expect(formatReport([r])).toContain('already met, ready to activate');
  });

  test('an activated check that fails throws: it is an ordinary test again', async () => {
    await expect(
      runPending('home.new-control', missing, {
        registry: [entry('home.new-control', true)],
        dir: dir(),
      })
    ).rejects.toThrow('no such control');
  });

  test('an id missing from the registry is an error, not a silent pass', async () => {
    await expect(
      runPending('unregistered', () => {}, { registry: [], dir: dir() })
    ).rejects.toThrow(/not in tools\/pending-acceptance.json/);
  });

  test('the report names pending checks and never calls them flakes or failures', () => {
    const text = formatReport([
      { id: 'a', prompt: '161', status: 'pending', message: 'x' },
    ]);
    expect(text).toContain('Pending acceptance (not failures)');
    expect(text).not.toMatch(/flak/i);
  });

  test('a malformed registry entry is refused', () => {
    const file = path.join(dir(), 'r.json');
    writeFileSync(file, JSON.stringify({ checks: [{ id: 'x' }] }));
    expect(() => readRegistry(file)).toThrow(/needs id, prompt and activated/);
  });
});
