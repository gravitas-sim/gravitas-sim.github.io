/**
 * The listener helper (js/listeners.js) and the rule that mounting modules use
 * it (tools/check-architecture.mjs): Prompt 107, step 3.
 */
/* global EventTarget, Event */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { listeners } from '../js/listeners.js';
import {
  findListenerProblems,
  LISTENER_ALLOWLIST_FILE,
  buildGraph,
} from '../tools/check-architecture.mjs';

describe('listeners()', () => {
  test('registers as addEventListener does, and off() removes every one', () => {
    const a = new EventTarget();
    const b = new EventTarget();
    const listen = listeners();
    const seen = [];
    listen(a, 'ping', () => seen.push('a'));
    listen(b, 'ping', () => seen.push('b'));
    listen(b, 'pong', () => seen.push('pong'));
    expect(listen.size).toBe(3);
    a.dispatchEvent(new Event('ping'));
    b.dispatchEvent(new Event('ping'));
    b.dispatchEvent(new Event('pong'));
    expect(seen).toEqual(['a', 'b', 'pong']);
    listen.off();
    expect(listen.size).toBe(0);
    a.dispatchEvent(new Event('ping'));
    b.dispatchEvent(new Event('ping'));
    b.dispatchEvent(new Event('pong'));
    expect(seen).toEqual(['a', 'b', 'pong']);
  });

  test('keeps the options a caller gave: once, capture (a boolean too), passive', () => {
    const t = new EventTarget();
    const listen = listeners();
    let once = 0;
    listen(t, 'x', () => once++, { once: true });
    t.dispatchEvent(new Event('x'));
    t.dispatchEvent(new Event('x'));
    expect(once).toBe(1);
    // A boolean third argument means capture; the helper keeps that meaning.
    const order = [];
    const outer = new EventTarget();
    listen(outer, 'y', () => order.push('captured'), true);
    outer.dispatchEvent(new Event('y'));
    expect(order).toEqual(['captured']);
    const given = { passive: true };
    listen(t, 'z', () => {}, given);
    expect(given).toEqual({ passive: true });
  });

  test('scopes are independent, and a registration after off() attaches nothing', () => {
    const t = new EventTarget();
    const one = listeners();
    const two = listeners();
    let n = 0;
    one(t, 'x', () => n++);
    two(t, 'x', () => n++);
    one.off();
    t.dispatchEvent(new Event('x'));
    expect(n).toBe(1);
    one(t, 'x', () => n++);
    t.dispatchEvent(new Event('x'));
    expect(n).toBe(2);
    two.off();
  });
});

describe('findListenerProblems', () => {
  const mounting = `import { x } from './x.js';\nexport function mountPanel(root) { root.addEventListener('click', f); }\n`;
  const adopted = `import { listeners } from '../listeners.js';\nexport function mountPanel(root) { listeners()(root, 'click', f); }\n`;

  test('a mounting module with a direct listener and no record is reported', () => {
    const p = findListenerProblems(new Map([['js/p.js', mounting]]), []);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(
      /Mounting module without the listener helper: js\/p\.js/
    );
  });

  test('a module on the helper, a recorded one and a non-mounting one are fine', () => {
    expect(findListenerProblems(new Map([['js/p.js', adopted]]), [])).toEqual(
      []
    );
    expect(
      findListenerProblems(new Map([['js/p.js', mounting]]), ['js/p.js'])
    ).toEqual([]);
    const page = `document.addEventListener('keydown', f);\nexport function start() {}\n`;
    expect(findListenerProblems(new Map([['js/page.js', page]]), [])).toEqual(
      []
    );
  });

  test('the record may only shrink: an adopted or vanished module is stale', () => {
    const adoptedP = findListenerProblems(new Map([['js/p.js', adopted]]), [
      'js/p.js',
    ]);
    expect(adoptedP[0]).toMatch(/Stale listener exemption: js\/p\.js/);
    expect(findListenerProblems(new Map(), ['js/gone.js'])[0]).toMatch(
      /Stale listener exemption: js\/gone\.js/
    );
  });

  test('the repository is clean against its recorded file', async () => {
    const graph = await buildGraph();
    const sources = new Map();
    for (const f of graph.keys()) sources.set(f, readFileSync(f, 'utf8'));
    const { modules } = JSON.parse(
      readFileSync(LISTENER_ALLOWLIST_FILE, 'utf8')
    );
    expect(findListenerProblems(sources, modules)).toEqual([]);
  });
});
