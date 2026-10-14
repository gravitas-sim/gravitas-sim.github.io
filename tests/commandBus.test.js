/**
 * The command bus in js/appState.js and the rule that keeps modules below
 * js/ui.js from importing it (Prompt 107, step 2d).
 */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  ALLOWED_UPWARD,
  buildGraph,
  findCoordinatorImports,
  findUpwardImports,
} from '../tools/check-architecture.mjs';

describe('command()', () => {
  test('runs the registered handler with its arguments and returns its value', async () => {
    const { command, registerCommands } = await import('../js/appState.js');
    const seen = [];
    registerCommands({
      probeAdd: (a, b) => {
        seen.push([a, b]);
        return a + b;
      },
    });
    expect(command('probeAdd')(2, 3)).toBe(5);
    expect(seen).toEqual([[2, 3]]);
  });

  test('looks the handler up per call, so a command made early still works', async () => {
    const { command, registerCommands } = await import('../js/appState.js');
    const early = command('probeLate');
    expect(() => early()).toThrow(/No handler for command "probeLate"/);
    registerCommands({ probeLate: () => 'now' });
    expect(early()).toBe('now');
  });

  test('is synchronous: a handler has run when the call returns', async () => {
    const { command, registerCommands } = await import('../js/appState.js');
    let ran = false;
    registerCommands({ probeSync: () => (ran = true) });
    command('probeSync')();
    expect(ran).toBe(true);
  });

  test('ui.js registers every command its callers ask for', () => {
    const asked = new Set();
    for (const file of [
      'js/investigations.js',
      'js/share.js',
      'js/welcome.js',
      'js/experimentsBridge.js',
      'js/inspectorWindow.js',
      'js/captureMeasure.js',
    ]) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/command\('(\w+)'\)/g)) asked.add(m[1]);
    }
    const ui = readFileSync('js/ui.js', 'utf8');
    const block = ui.slice(ui.indexOf('registerCommands({'));
    const registered = new Set(
      block
        .slice(0, block.indexOf('});'))
        .split('\n')
        .map(l => l.trim().replace(/,$/, ''))
        .filter(l => /^\w+$/.test(l))
    );
    expect(asked.size).toBeGreaterThan(10);
    for (const name of asked) expect(registered).toContain(name);
  });
});

describe('nothing below the coordinator imports ui.js', () => {
  test('the recorded upward imports are empty', () => {
    expect(ALLOWED_UPWARD.size).toBe(0);
  });

  test('a static import of ui.js is an upward import', () => {
    const g = new Map([
      ['js/feature.js', new Set(['js/ui.js'])],
      ['js/ui.js', new Set()],
    ]);
    expect(findUpwardImports(g).map(u => `${u.from} -> ${u.to}`)).toEqual([
      'js/feature.js -> js/ui.js',
    ]);
  });

  test('a dynamic import in the middle of a line is found', () => {
    const sources = new Map([
      ['js/a.js', "const { x } = await import('./ui.js');"],
      ['js/sub/b.js', "import('../ui.js').then(m => m.y());"],
      ['js/c.js', "import { z } from './ui.js';"],
      ['js/d.js', "import { z } from './uiOther.js';"],
      ['js/main.js', "import { z } from './ui.js';"],
      ['js/ui.js', "import { q } from './q.js';"],
    ]);
    expect(findCoordinatorImports(sources)).toEqual([
      'js/a.js',
      'js/c.js',
      'js/sub/b.js',
    ]);
  });

  test('the real tree has none', async () => {
    const graph = await buildGraph();
    const sources = new Map();
    for (const f of graph.keys()) sources.set(f, readFileSync(f, 'utf8'));
    expect(findCoordinatorImports(sources)).toEqual([]);
  });
});
