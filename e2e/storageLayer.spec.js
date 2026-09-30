// =============================================================================
// js/storage/ in a real browser (Roadmap II Prompt 65, step 2)
// -----------------------------------------------------------------------------
// tests/storageLayer.test.js covers the policies, migrations and export/import
// over the memory and localStorage backends. What only a browser has is here:
// IndexedDB, a quota estimate, and a second tab hearing a change.
//
// Sources only: no page loads the module yet (step 3 moves the writers onto
// it), so the build has nothing to bundle and dist/ has no copy to test.
// =============================================================================

import { test, expect } from './fixtures.js';

const PAGE = '/model/';

test.describe('the storage module', () => {
  test(
    'uses IndexedDB, reports the quota where the browser can, and keeps a record across a reload',
    { tag: '@cross-browser' },
    async ({ page }) => {
      await page.goto(PAGE, { waitUntil: 'load' });
      const first = await page.evaluate(async () => {
        const storage = await import('/js/storage/index.js');
        const store = await storage.openStore();
        const put = await store.collection('drafts').put('orbits', { t: 1 });
        const est = await store.estimate();
        // What the browser itself says, asked directly: WebKit on Linux has
        // navigator.storage but gives no quota, where the Mac's does.
        const quota = await window.navigator.storage
          ?.estimate?.()
          .then(e => Number.isFinite(e?.quota))
          .catch(() => false);
        store.close();
        return {
          mode: store.mode,
          fallback: store.fallback,
          ok: put.ok,
          est,
          quota: Boolean(quota),
        };
      });
      expect(first).toMatchObject({ mode: 'idb', fallback: null, ok: true });
      // Where the browser reports a quota the store knows it and keeps its
      // reserve out of reach; where it does not, the store says so and the
      // policies still hold (js/storage/index.js, estimate()).
      expect(first.est.known).toBe(first.quota);
      expect(first.est.reserve).toBeGreaterThanOrEqual(5 * 1024 * 1024);
      if (first.quota) expect(first.est.available).toBeGreaterThanOrEqual(0);

      await page.reload({ waitUntil: 'load' });
      const again = await page.evaluate(async () => {
        const storage = await import('/js/storage/index.js');
        const store = await storage.openStore();
        const v = await store.collection('drafts').get('orbits');
        await store.deleteAll();
        store.close();
        return v;
      });
      expect(again).toEqual({ t: 1 });
    }
  );

  test(
    'a write in one tab is heard in another',
    { tag: '@cross-browser' },
    async ({ page, context }) => {
      await page.goto(PAGE, { waitUntil: 'load' });
      const other = await context.newPage();
      await other.goto(PAGE, { waitUntil: 'load' });
      await other.evaluate(async () => {
        const { openStore } = await import('/js/storage/index.js');
        const store = await openStore();
        window.__heard = [];
        store.addEventListener('change', e => window.__heard.push(e.detail));
        window.__store = store;
      });
      await page.evaluate(async () => {
        const storage = await import('/js/storage/index.js');
        const store = await storage.openStore();
        await store.collection('evidence').put('entry', { v: 2 });
        await store.collection('evidence').delete('entry');
        store.close();
      });
      await expect
        .poll(() => other.evaluate(() => window.__heard))
        .toEqual([
          { collection: 'evidence', id: 'entry', op: 'put', remote: true },
          { collection: 'evidence', id: 'entry', op: 'delete', remote: true },
        ]);
      await other.close();
    }
  );

  test(
    'without IndexedDB it falls back to localStorage, and says so',
    { tag: '@cross-browser' },
    async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'indexedDB', { value: undefined });
      });
      await page.goto(PAGE, { waitUntil: 'load' });
      const got = await page.evaluate(async () => {
        const storage = await import('/js/storage/index.js');
        const store = await storage.openStore();
        const put = await store
          .collection('preferences')
          .put('units', { s: 1 });
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(storage.LOCAL_PREFIX)
        );
        await store.deleteAll();
        store.close();
        return { mode: store.mode, fallback: store.fallback, ok: put.ok, keys };
      });
      expect(got.mode).toBe('local');
      expect(got.fallback.persistent).toBe(true);
      expect(got.ok).toBe(true);
      expect(got.keys).toEqual(['gravitas_store:preferences:units']);
    }
  );
});
