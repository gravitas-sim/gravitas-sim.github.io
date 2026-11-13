import { describe, test, expect, afterAll, beforeAll } from '@jest/globals';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { request } from 'node:http';
import { Buffer } from 'node:buffer';
import { serveStatic } from '../tools/static-server.mjs';
import {
  median,
  quantile,
  spread,
  withQuality,
  summarize,
  PROFILES,
  ROUTES,
} from '../tools/route-harness.mjs';

/** One request with explicit headers; the body comes back raw. */
function get(server, path, headers = {}) {
  return new Promise((ok, fail) => {
    const req = request(
      { host: '127.0.0.1', port: server.port, path, headers },
      res => {
        const parts = [];
        res.on('data', c => parts.push(c));
        res.on('end', () =>
          ok({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(parts),
          })
        );
      }
    );
    req.on('error', fail);
    req.end();
  });
}

describe('the static server modes the route harness measures through', () => {
  let dir;
  let plain;
  let host;
  const js = 'export const x = "gravitas";\n'.repeat(200);

  beforeAll(async () => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'gravitas-static-')));
    writeFileSync(join(dir, 'a.js'), js);
    writeFileSync(join(dir, 'tiny.txt'), 'hi');
    writeFileSync(join(dir, 'pic.png'), Buffer.alloc(4000, 7));
    plain = await serveStatic({ root: dir });
    host = await serveStatic({ root: dir, gzip: true, cacheHeaders: true });
  });
  afterAll(() => {
    plain.close();
    host.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('the default server is unchanged: uncompressed and never cached', async () => {
    const r = await get(plain, '/a.js', { 'accept-encoding': 'gzip' });
    expect(r.status).toBe(200);
    expect(r.headers['content-encoding']).toBeUndefined();
    expect(r.headers['cache-control']).toMatch(/no-store/);
    expect(r.body.toString()).toBe(js);
  });

  test('gzip mode compresses text for a client that accepts it, and says so', async () => {
    const r = await get(host, '/a.js', { 'accept-encoding': 'gzip, deflate' });
    expect(r.headers['content-encoding']).toBe('gzip');
    expect(r.headers.vary).toMatch(/Accept-Encoding/i);
    expect(r.body.length).toBeLessThan(js.length / 5);
    expect(Number(r.headers['content-length'])).toBe(r.body.length);
    expect(gunzipSync(r.body).toString()).toBe(js);
  });

  test('gzip mode leaves a client that does not accept it, tiny files and images alone', async () => {
    const none = await get(host, '/a.js');
    expect(none.headers['content-encoding']).toBeUndefined();
    expect(none.body.toString()).toBe(js);
    const tiny = await get(host, '/tiny.txt', { 'accept-encoding': 'gzip' });
    expect(tiny.headers['content-encoding']).toBeUndefined();
    const png = await get(host, '/pic.png', { 'accept-encoding': 'gzip' });
    expect(png.headers['content-encoding']).toBeUndefined();
  });

  test("cache headers are the host's: max-age, an ETag, and 304 for a match", async () => {
    const first = await get(host, '/a.js', { 'accept-encoding': 'gzip' });
    expect(first.headers['cache-control']).toBe('public, max-age=600');
    const etag = first.headers.etag;
    expect(etag).toMatch(/^"[0-9a-f]{16}"$/);
    const again = await get(host, '/a.js', {
      'accept-encoding': 'gzip',
      'if-none-match': etag,
    });
    expect(again.status).toBe(304);
    expect(again.body.length).toBe(0);
  });

  test('the server counts what it answered, so a harness can cross-check the browser', async () => {
    host.stats.requests = 0;
    host.stats.bodyBytes = 0;
    const r = await get(host, '/a.js', { 'accept-encoding': 'gzip' });
    expect(host.stats.requests).toBe(1);
    expect(host.stats.bodyBytes).toBe(r.body.length);
  });

  test('a path outside the root is refused in every mode', async () => {
    const r = await get(host, '/..%2f..%2fetc/passwd');
    expect([403, 404]).toContain(r.status);
  });
});

describe('the harness arithmetic', () => {
  test('median, quantile and spread ignore a run that never opened', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, null, 2])).toBe(2);
    expect(median([])).toBeNull();
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(spread([5, 7, 6, undefined])).toEqual({
      median: 6,
      min: 5,
      max: 7,
      n: 3,
    });
  });

  test('the quality tier goes before the hash of a lesson link', () => {
    const phone = PROFILES['mid-range-phone'];
    expect(withQuality('/#investigation=ios-fire', phone)).toBe(
      '/?quality=low#investigation=ios-fire'
    );
    expect(withQuality('/?author=tides&step=1', phone)).toBe(
      '/?author=tides&step=1&quality=low'
    );
    expect(withQuality('/', PROFILES['throttled-desktop'])).toBe('/');
  });

  test('a summary is per mode and says how many loads opened', () => {
    const load = ms => ({
      usableMs: ms,
      firstActionMs: ms + 100,
      actionMs: 100,
      input: { delayP50: 1, delayP95: 2, delayMax: 3, slowestMs: 0 },
      atUsable: { requests: 10, bytes: 1000, modules: 5 },
      total: { requests: 12, bytes: 1200, modules: 6 },
      served: 12,
      swActive: false,
      error: null,
    });
    const s = summarize([
      { cold: load(1000), offline: { ...load(null), error: 'down' } },
      { cold: load(3000), offline: { ...load(null), error: 'down' } },
      { cold: load(2000), offline: { ...load(null), error: 'down' } },
    ]);
    expect(s.cold.usableMs.median).toBe(2000);
    expect(s.cold.opened).toBe(3);
    expect(s.offline.opened).toBe(0);
    expect(s.offline.errors).toEqual(['down']);
  });

  test('every route names a usable condition, a first action and a drag target', () => {
    for (const [id, route] of Object.entries(ROUTES)) {
      expect([id, !!route.usable.kind]).toEqual([id, true]);
      expect([id, typeof route.act]).toEqual([id, 'function']);
      expect([id, !!route.drag.selector]).toEqual([id, true]);
      expect([id, route.path.startsWith('/')]).toEqual([id, true]);
    }
    // The author route is kept apart from the student's.
    expect(ROUTES['author-lesson'].path).toMatch(/author=/);
    expect(ROUTES['keplers-laws'].path).toBe('/#investigation=keplers-laws');
  });
});
