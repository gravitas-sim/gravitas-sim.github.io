// The render layer (Prompt 107, step 2b): the engine paints nothing and imports
// nothing that does. These tests pin the rule itself and the real tree.

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  layerOf,
  buildGraph,
  findUpwardImports,
  findRenderImports,
} from '../tools/check-architecture.mjs';

describe('the render layer', () => {
  test('the drawers and the black hole renderer sit in it', () => {
    expect(layerOf('js/bodyDraw.js')).toBe('render');
    expect(layerOf('js/blackHole/render.js')).toBe('render');
    expect(layerOf('js/blackHole/geometry.js')).toBe('render');
  });

  test('a black hole carries its appearance as state, below the engine', () => {
    expect(layerOf('js/blackHole/appearance.js')).toBe('foundation');
    expect(layerOf('js/physics.js')).toBe('engine');
  });

  test('an engine -> render import is an upward import', () => {
    const g = new Map([
      ['js/physics.js', new Set(['js/bodyDraw.js', 'js/blackHole/render.js'])],
      ['js/bodyDraw.js', new Set(['js/physics.js'])],
      ['js/blackHole/render.js', new Set()],
    ]);
    expect(findUpwardImports(g).map(u => `${u.from} -> ${u.to}`)).toEqual([
      'js/physics.js -> js/blackHole/render.js',
      'js/physics.js -> js/bodyDraw.js',
    ]);
  });

  test('the draw module importing the engine is the allowed direction', () => {
    const g = new Map([
      ['js/bodyDraw.js', new Set(['js/physics.js', 'js/bodyVisuals.js'])],
      ['js/physics.js', new Set()],
      ['js/bodyVisuals.js', new Set()],
    ]);
    expect(findUpwardImports(g)).toEqual([]);
  });

  test('a dynamic import in the middle of a line is found', () => {
    const sources = new Map([
      ['js/physics.js', "const m = await import('./bodyDraw.js');"],
      ['js/world/build.js', "import('../blackHole/render.js').then(f);"],
      ['js/orbital.js', "import { a } from './blackHole/appearance.js';"],
      ['js/render.js', "import { b } from './bodyDraw.js';"],
      ['js/bodyDraw.js', "import { c } from './physics.js';"],
    ]);
    expect(findRenderImports(sources)).toEqual([
      'js/physics.js -> js/bodyDraw.js',
      'js/world/build.js -> js/blackHole/render.js',
    ]);
  });

  test('the real tree has none, and the engine names no drawer module', async () => {
    const graph = await buildGraph();
    const sources = new Map();
    for (const f of graph.keys()) sources.set(f, readFileSync(f, 'utf8'));
    expect(findRenderImports(sources)).toEqual([]);
    expect(
      findUpwardImports(graph).filter(u => u.toLayer === 'render')
    ).toEqual([]);
  });
});
