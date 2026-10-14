// =============================================================================
// A page with a canvas and no drawers says so, once
// -----------------------------------------------------------------------------
// The engine paints through a table of drawers that js/bodyDraw.js and
// js/bodyDrawSky.js fill (D-DECOMP-11, D-DECOMP-15). A body with no drawer draws
// nothing, which is right for a worker; but a page that draws and never
// imported the drawers would show an empty canvas with no explanation, so the
// first draw into an empty table warns, once. This file imports the engine only,
// so its table starts empty.
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { Planet, registerBodyDrawers } from '../js/physics.js';

describe('drawing with no drawers registered', () => {
  test('warns once, however many bodies are drawn, and draws nothing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = {};
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    expect(() => planet.draw(ctx)).not.toThrow();
    planet.draw(ctx);
    new Planet({ x: 1, y: 1 }, { x: 0, y: 0 }).draw(ctx);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('bodyDraw');
    warn.mockRestore();
  });

  test('stays silent afterwards, and a kind with no drawer draws nothing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const seen = [];
    registerBodyDrawers({ Asteroid: o => seen.push(o.kind) });
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    planet.draw({});
    expect(seen).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
