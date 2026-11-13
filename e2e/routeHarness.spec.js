// =============================================================================
// The student-route harness, held to its own definitions
// -----------------------------------------------------------------------------
// tools/route-harness.mjs measures the page a student opens; tools/route-walks.mjs
// walks a lesson link to its first accepted reading. This spec does not judge
// the product's speed (e2e/deviceProfiles.spec.js does, with budgets): it holds
// the instrument to what it claims, on the throttled desktop profile so that it
// stays short. A harness that reported a number from a page that never opened,
// or counted a cached load as a download, would be a report on itself.
//
//   - a route is measured cold with the worker blocked, and the load has a
//     usable time, a first action, a drag sample, and requests, bytes and
//     modules that agree with what the server says it sent;
//   - the compressed transport really compresses (the bytes on the wire are a
//     fraction of the uncompressed bytes of the same files);
//   - a second visit with the worker installed fetches almost nothing, and the
//     lesson route still opens with the network cut;
//   - a walk from a lesson link reaches the first accepted reading, and says
//     which step that was.
//
// Measurements here are of the working tree on this machine, never the live
// site, and they are proxies (OFFLINE_AND_LOW_END.md).
// =============================================================================

import { chromium } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { serveStatic } from '../tools/static-server.mjs';
import {
  PROFILES,
  ROUTES,
  launchFor,
  measureRoute,
} from '../tools/route-harness.mjs';
import { walkOnce, planOf } from '../tools/route-walks.mjs';

const PROFILE = PROFILES['throttled-desktop'];

test.describe('the student-route harness', () => {
  test.setTimeout(420_000);
  test.skip(
    process.env.GRAVITAS_E2E_TARGET === 'dist',
    'the harness serves the source tree'
  );

  let gzip;
  let plain;
  let browser;
  test.beforeAll(async () => {
    gzip = await serveStatic({ root: '.', gzip: true, cacheHeaders: true });
    plain = await serveStatic({ root: '.' });
    browser = await launchFor(chromium, PROFILE);
  });
  test.afterAll(async () => {
    await browser?.close();
    gzip?.close();
    plain?.close();
  });

  test('a cold load of the lesson route is measured, and the counts agree with the server', async () => {
    const r = await measureRoute(browser, gzip, 'ios-fire', PROFILE, {
      coldOnly: true,
    });
    const load = r.cold;
    expect(load.error).toBeNull();
    expect(load.usableMs).toBeGreaterThan(0);
    // The first useful action comes after the route is usable.
    expect(load.firstActionMs).toBeGreaterThan(load.usableMs);
    expect(load.actionMs).toBeGreaterThan(0);
    // The drag sample saw the events it made.
    expect(load.input.events).toBeGreaterThan(20);
    expect(load.input.delayP50).toBeGreaterThanOrEqual(0);
    // A lesson opens with a great many modules; the browser's request count is
    // not smaller than the server's, which saw only what reached it.
    expect(load.atUsable.modules).toBeGreaterThan(60);
    expect(load.atUsable.requests).toBeGreaterThan(load.atUsable.modules);
    expect(load.served).toBeGreaterThan(load.atUsable.requests * 0.9);
    expect(load.swActive).toBe(false);
  });

  test('the compressed transport sends a fraction of the bytes of the plain one', async () => {
    const [z, p] = [
      (await measureRoute(browser, gzip, 'home', PROFILE, { coldOnly: true }))
        .cold,
      (await measureRoute(browser, plain, 'home', PROFILE, { coldOnly: true }))
        .cold,
    ];
    expect(z.error).toBeNull();
    expect(p.error).toBeNull();
    expect(z.atUsable.bytes).toBeLessThan(p.atUsable.bytes * 0.5);
    expect(z.atUsable.bytes).toBeGreaterThan(100_000);
  });

  test('a second visit is served by the worker, and the lesson opens offline', async () => {
    const r = await measureRoute(browser, gzip, 'ios-fire', PROFILE, {
      settleCapMs: 150_000,
    });
    expect(r.worker?.coreComplete, 'the worker finished installing').toBe(true);
    expect(r.warm.error).toBeNull();
    expect(r.warm.swActive).toBe(true);
    // Almost nothing crosses the network the second time: the worker answers.
    expect(r.warm.atUsable.bytes).toBeLessThan(r.cold.atUsable.bytes * 0.1);
    expect(r.warm.served).toBeLessThan(r.cold.served * 0.1);
    // With the network cut and the browser's own cache off, the worker alone
    // carries the lesson route.
    expect(r.offline.error, 'the lesson opens offline').toBeNull();
    expect(r.offline.usableMs).toBeGreaterThan(0);
  });

  test('a walk from a lesson link reaches its first accepted reading', async () => {
    for (const id of ['ios-fire', 'keplers-laws']) {
      const w = await walkOnce(browser, gzip, id, PROFILE, {
        plan: await planOf(id),
      });
      expect(w.error, `${id}: ${w.error} (${w.check})`).toBeNull();
      expect(w.usableMs).toBeGreaterThan(0);
      expect(w.acceptedMs).toBeGreaterThan(w.usableMs);
    }
  });

  test('every route the harness knows is a path a student can open', () => {
    for (const [id, route] of Object.entries(ROUTES)) {
      expect(route.path, id).toMatch(/^\//);
    }
    expect(Object.keys(ROUTES)).toEqual(
      expect.arrayContaining([
        'home',
        'keplers-laws',
        'ios-fire',
        'observatory-guide',
        '3d-lab',
        'author-lesson',
      ])
    );
  });
});
