// =============================================================================
// A local FITS image, read in a real Worker on the pool (Prompt 157)
// -----------------------------------------------------------------------------
// tests/dataKindsPool.test.js runs js/dataKinds/fitsJob.js on worker_threads
// Workers. This is the browser: the shipped module Worker (js/dataKinds/
// fitsWorker.js), the real pool (js/workers/pool.js) and a file built in the
// page. Sources only: the build has no /js/ modules to import, and nothing yet
// ships a data kind (DATA_PACKS.md, the install excludes js/dataKinds/).
//
// What it holds: the plane a Worker reads equals the plane the page reads, the
// file's buffer is gone from the caller once the job starts, a refusal is an
// answer with its code, cancelling terminates the realm and frees the ledger,
// and a file the header says is too large never starts a realm.
// =============================================================================

/* global TextEncoder, AbortController */

import { test, expect } from './fixtures.js';

/**
 * The page's side: a builder of FITS files and a pool whose realms are the
 * shipped Worker, kept on `window` for the tests' own evaluate calls.
 */
const SETUP = async page => {
  await page.goto('/observatory/');
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === 'true'
  );
  await page.evaluate(async () => {
    const BLOCK = 2880;
    const card = (k, v) =>
      `${k.padEnd(8)}= ${
        typeof v === 'string' ? `'${v.padEnd(8)}'` : String(v).padStart(20)
      }`.padEnd(80);
    const fits = (bitpix, w, h, fill, extra = []) => {
      const size = Math.abs(bitpix) / 8;
      const cards = [
        'SIMPLE  =                    T',
        card('BITPIX', bitpix),
        card('NAXIS', 2),
        card('NAXIS1', w),
        card('NAXIS2', h),
        ...extra,
        'END',
      ];
      const head = new Uint8Array(
        Math.ceil((cards.length * 80) / BLOCK) * BLOCK
      ).fill(32);
      cards.forEach((c, i) =>
        head.set(new TextEncoder().encode(c.padEnd(80)), i * 80)
      );
      const data = new Uint8Array(Math.ceil((w * h * size) / BLOCK) * BLOCK);
      const view = new DataView(data.buffer);
      for (let i = 0; i < w * h; i++) {
        const v = fill(i);
        if (bitpix === 16) view.setInt16(i * 2, v, false);
        else if (bitpix === -32) view.setFloat32(i * 4, v, false);
        else if (bitpix === -64) view.setFloat64(i * 8, v, false);
      }
      const out = new Uint8Array(head.length + data.length);
      out.set(head);
      out.set(data, head.length);
      return out.buffer;
    };
    const { createLedger, createPool } = await import('/js/workers/pool.js');
    const job = await import('/js/dataKinds/fitsJob.js');
    const { readFits } = await import('/js/dataKinds/fits.js');
    const book = createLedger({ memoryBytes: 256000000, realms: 2 });
    const spawned = [];
    const pool = createPool({
      book,
      concurrency: 2,
      spawn: () => {
        const w = new Worker('/js/dataKinds/fitsWorker.js', { type: 'module' });
        spawned.push(w);
        return w;
      },
    });
    window.__dk = { fits, job, readFits, book, spawned, pool };
  });
};

test.describe('a FITS file read in a Worker', () => {
  test('the plane a Worker reads is the plane the page reads, and the buffer moved', async ({
    page,
  }) => {
    await SETUP(page);
    const r = await page.evaluate(async () => {
      const { fits, job, readFits, pool, book } = window.__dk;
      const file = fits(16, 300, 200, i => ((i * 7919) % 30000) - 15000, [
        'BSCALE  =                  0.5',
        'BZERO   =                  100',
      ]);
      const want = readFits(new Uint8Array(file.slice(0)));
      const out = await job.readFitsOnPool(pool, file);
      let same = out.ok && out.image.values.length === want.values.length;
      for (let i = 0; same && i < want.values.length; i++)
        same = Object.is(out.image.values[i], want.values[i]);
      return {
        ok: out.ok,
        same,
        moved: file.byteLength,
        planeBytes: out.image.values.buffer.byteLength,
        decoded: out.image.decodedBytes,
        held: book.snapshot().bytes,
      };
    });
    expect(r).toEqual({
      ok: true,
      same: true,
      moved: 0,
      planeBytes: 8 * 300 * 200,
      decoded: 8 * 300 * 200,
      held: 0,
    });
  });

  test('a refusal is an answer with its code, and a header the page can refuse never starts a realm', async ({
    page,
  }) => {
    await SETUP(page);
    const r = await page.evaluate(async () => {
      const { fits, job, pool, spawned } = window.__dk;
      const infinite = fits(-32, 2, 2, i => (i === 1 ? Infinity : 1));
      const huge = fits(16, 1, 1, () => 1);
      // NAXIS1 = 8193, written over its card (the fourth).
      new Uint8Array(huge).set(
        new TextEncoder().encode('NAXIS1  =                 8193'.padEnd(80)),
        3 * 80
      );
      const a = await job.readFitsOnPool(pool, infinite);
      const b = await job.readFitsOnPool(pool, huge);
      return { a: [a.ok, a.code], b: [b.ok, b.code], spawned: spawned.length };
    });
    expect(r.a).toEqual([false, 'nonfinite-pixel']);
    expect(r.b).toEqual([false, 'too-large']);
    // Only the infinite pixel needed a realm; the header refusal never did.
    expect(r.spawned).toBe(1);
  });

  test('cancelling terminates the realm and frees what it held', async ({
    page,
  }) => {
    await SETUP(page);
    const baseline = page.workers().length;
    const r = await page.evaluate(async () => {
      const { fits, job, pool, book } = window.__dk;
      const file = fits(-64, 2048, 2048, () => 1.5);
      const controller = new AbortController();
      const pending = job.readFitsOnPool(pool, file, {
        signal: controller.signal,
      });
      const heldWhileRunning = book.snapshot().bytes;
      controller.abort();
      const out = await pending;
      return {
        code: out.code,
        heldWhileRunning,
        held: book.snapshot().bytes,
        moved: file.byteLength,
      };
    });
    expect(r.code).toBe('canceled');
    expect(r.heldWhileRunning).toBeGreaterThan(60e6);
    expect(r.held).toBe(0);
    expect(r.moved).toBe(0);
    await expect.poll(() => page.workers().length).toBe(baseline);
  });

  test('a file at the limit (2,048 x 2,048, 16 bits) reads, and decodes to 32 MiB', async ({
    page,
  }) => {
    await SETUP(page);
    const r = await page.evaluate(async () => {
      const { fits, job } = window.__dk;
      const out = await job.readFitsOnPool(
        window.__dk.pool,
        fits(16, 2048, 2048, i => i % 1000)
      );
      return {
        ok: out.ok,
        bytes: out.image.values.byteLength,
        last: out.image.values[2048 * 2048 - 1],
        nan: out.image.nanPixels,
      };
    });
    expect(r).toEqual({
      ok: true,
      bytes: 33554432,
      last: (2048 * 2048 - 1) % 1000,
      nan: 0,
    });
  });
});
