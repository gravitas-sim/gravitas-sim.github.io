// =============================================================================
// The lazy widget manifest says what the modules say
// -----------------------------------------------------------------------------
// The manifest in js/widgets.js lists which widget ids each family owns -
// every family, since none is eager any more - so the engine can tell "not
// fetched yet" from "no such instrument" without importing the family. A list
// beside the module drifts; this holds it to the module.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync } from 'node:fs';

import {
  LAZY_FAMILIES,
  allWidgets,
  ensureWidget,
  getWidget,
  needsLoading,
  whenWidgetsReady,
} from '../js/widgets.js';

describe('the lazy widget manifest', () => {
  test('each family lists exactly the ids its module exports', async () => {
    for (const [name, family] of Object.entries(LAZY_FAMILIES)) {
      const widgets = family.pick(await family.load());
      expect({ name, ids: [...family.ids].sort() }).toEqual({
        name,
        ids: widgets.map(w => w.id).sort(),
      });
    }
  });

  test('every family module has an entry, so none can be imported eagerly instead', () => {
    // An instrument family is a js/*Widgets.js module. One without an entry
    // here is either unreachable or imported some other way - which is what
    // tests/onDemandFamilies.test.js holds start-up and the engine to not do.
    const onDisk = readdirSync('js')
      .filter(f => /^[A-Za-z]+Widgets\.js$/.test(f))
      .map(f => `./${f}`)
      .sort();
    expect(
      Object.values(LAZY_FAMILIES)
        .map(f => f.path)
        .sort()
    ).toEqual(onDisk);
  });

  test('no id is claimed by two families or by an eager one', async () => {
    const lazy = Object.values(LAZY_FAMILIES).flatMap(f => f.ids);
    expect(new Set(lazy).size).toBe(lazy.length);
    // Before anything is fetched, no eager widget shares an id with a lazy one.
    const eager = allWidgets().map(w => w.id);
    expect(lazy.filter(id => eager.includes(id))).toEqual([]);
  });

  test('ensureWidget fetches once, however many ask at the same time', async () => {
    const [a, b] = await Promise.all([
      ensureWidget('depth-size'),
      ensureWidget('geometry'),
    ]);
    expect(a?.id).toBe('depth-size');
    expect(b?.id).toBe('geometry');
    expect(needsLoading('depth-size')).toBe(false);
    const ids = allWidgets().map(w => w.id);
    expect(ids.filter(id => id === 'depth-size')).toHaveLength(1);
  });

  test('whenWidgetsReady brings in every family for readers of the whole catalog', async () => {
    await whenWidgetsReady();
    for (const family of Object.values(LAZY_FAMILIES)) {
      for (const id of family.ids) expect(getWidget(id)?.id).toBe(id);
    }
  });

  test('an unknown id is null, not a load', async () => {
    expect(needsLoading('no-such-instrument')).toBe(false);
    expect(await ensureWidget('no-such-instrument')).toBeNull();
  });
});
